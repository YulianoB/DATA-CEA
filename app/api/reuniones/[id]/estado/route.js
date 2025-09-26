// app/api/reuniones/[id]/estado/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function institutionalList() {
  const a = (process.env.MAIL_INSTITUCIONAL || '').trim()
  const b = (process.env.NEXT_PUBLIC_MAIL_MANTENIMIENTO || '').trim()
  const list = (a || b || '').split(',').map(s => s.trim()).filter(Boolean)
  return Array.from(new Set(list))
}

function buildTransport() {
  const port = Number(process.env.SMTP_PORT || '465')
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

async function getParticipantes(dirigidoA) {
  let q = supabase.from('usuarios').select('nombre_completo,documento,email,rol')
  if (dirigidoA === 'Instructores') q = q.in('rol', ['INSTRUCTOR PRÁCTICA','INSTRUCTOR TEORÍA'])
  else if (dirigidoA === 'Administrativo') q = q.eq('rol', 'ADMINISTRATIVO')
  const { data, error } = await q
  if (error) throw error
  const unico = new Map()
  for (const u of data || []) {
    const doc = (u?.documento || '').trim()
    if (doc && !unico.has(doc)) unico.set(doc, u)
  }
  return Array.from(unico.values())
}

export async function PATCH(_req, { params }) {
  try {
    const id = params?.id
    if (!id) return NextResponse.json({ status:'error', message:'ID requerido' }, { status: 400 })

    // Obtener reunión
    const { data: rows, error: e1 } = await supabase.from('reuniones').select('*').eq('id', id).limit(1)
    if (e1 || !rows?.length) return NextResponse.json({ status:'error', message:'Reunión no encontrada' }, { status: 404 })
    const reunion = rows[0]

    // Actualizar estado
    const { error: e2 } = await supabase.from('reuniones').update({ estado: 'Cancelada' }).eq('id', id)
    if (e2) return NextResponse.json({ status:'error', message:'No se pudo actualizar el estado' }, { status: 400 })

    // Notificar cancelación
    const participantes = await getParticipantes(reunion.dirigido_a)
    const transporter = buildTransport()
    const from = process.env.SMTP_FROM || process.env.SMTP_USER

    const asunto = `⚠️ Reunión cancelada: ${reunion.tipo_reunion}`
    const cuerpo = `Se informa que la siguiente reunión ha sido cancelada:\n\n` +
      `Tipo: ${reunion.tipo_reunion}\n` +
      `Descripción: ${reunion.descripcion}\n` +
      `Fecha: ${reunion.fecha_programada}\n` +
      `Hora: ${reunion.hora_inicio} a ${reunion.hora_fin}\n` +
      `Lugar: ${reunion.lugar || '-'}\n` +
      `Modalidad: ${reunion.modalidad}\n` +
      `Responsable: ${reunion.responsable || '-'}\n\n` +
      `Por favor ignora cualquier enlace anterior de asistencia.`

    await Promise.all(
      participantes
        .filter(p => p.email && p.documento)
        .map(p => transporter.sendMail({
          from, to: p.email, subject: asunto,
          text: `Hola ${p.nombre_completo},\n\n${cuerpo}`,
        }).catch(() => null))
    )

    const institucional = institutionalList()
    if (institucional.length) {
      await transporter.sendMail({
        from,
        to: institucional.join(','),
        subject: `📌 Cancelación de reunión: ${reunion.tipo_reunion}`,
        text: cuerpo,
      }).catch(() => null)
    }

    return NextResponse.json({ status:'success', message:'Estado actualizado a "Cancelada".' })
  } catch (e) {
    return NextResponse.json({ status:'error', message: e.message }, { status: 500 })
  }
}
