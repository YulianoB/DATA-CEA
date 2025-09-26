// app/api/reuniones/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function nowBogotaParts() {
  const tz = 'America/Bogota'
  const d = new Date()
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit' }).format(d) // YYYY-MM-DD
  const hm  = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour:'2-digit', minute:'2-digit', hour12:false }).format(d) // HH:mm
  return { ymd, hm }
}

// --- NUEVO: helpers para auto-finalizar ---
function isFinished(r, now) {
  // r.fecha_programada: 'YYYY-MM-DD', r.hora_fin: 'HH:mm'
  return (String(r.fecha_programada) < now.ymd) ||
         (String(r.fecha_programada) === now.ymd && String(r.hora_fin) <= now.hm)
}

async function finalizeExpiredMeetings() {
  const now = nowBogotaParts()
  const { data: rows, error } = await supabase
    .from('reuniones')
    .select('id, fecha_programada, hora_fin, estado')
    .lte('fecha_programada', now.ymd)
    .eq('estado', 'Programada')

  if (error || !rows?.length) return

  for (const r of rows) {
    if (!isFinished(r, now)) continue
    // ¿Tiene asistencias?
    const { count, error: errCount } = await supabase
      .from('asistencias')
      .select('id', { count: 'exact', head: true })
      .eq('id_reunion', r.id)

    if (errCount) continue
    if ((count ?? 0) > 0) {
      await supabase.from('reuniones').update({ estado: 'Ejecutada' }).eq('id', r.id)
    }
    // Si no hay asistentes, se deja en "Programada" (regla solicitada)
  }
}
// --- fin NUEVO ---

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
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

async function getParticipantes(dirigidoA) {
  // Filtros por rol (igual que App Script)
  let q = supabase.from('usuarios').select('nombre_completo,documento,email,rol')
  if (dirigidoA === 'Instructores') {
    q = q.in('rol', ['INSTRUCTOR PRÁCTICA','INSTRUCTOR TEORÍA'])
  } else if (dirigidoA === 'Administrativo') {
    q = q.eq('rol', 'ADMINISTRATIVO')
  }
  const { data, error } = await q
  if (error) throw error
  const unicoPorDoc = new Map()
  for (const u of data || []) {
    const doc = (u?.documento || '').trim()
    if (doc && !unicoPorDoc.has(doc)) unicoPorDoc.set(doc, u)
  }
  return Array.from(unicoPorDoc.values())
}

function reunionDetailsHtml(r) {
  return `
    <p><strong>Detalles de la reunión programada:</strong></p>
    <pre style="font-size:13px">
Tipo: ${r.tipo_reunion}
Descripción: ${r.descripcion}
Fecha: ${r.fecha_programada}
Hora: ${r.hora_inicio} a ${r.hora_fin}
Lugar: ${r.lugar || '-'}
Modalidad: ${r.modalidad}
Responsable: ${r.responsable || '-'}
Dirigido a: ${r.dirigido_a || 'Todo el personal'}
    </pre>`
}

function participantesTableHtml(list) {
  const rows = list.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.nombre_completo || '-'}</td>
      <td>${p.documento || '-'}</td>
      <td>${p.email || '-'}</td>
      <td>${p.rol || '-'}</td>
    </tr>`).join('')
  return `
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f0f0f0">
          <th>#</th><th>Nombre</th><th>Documento</th><th>Email</th><th>Rol</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

// POST: crear reunión + notificar
export async function POST(req) {
  try {
    const body = await req.json()
    const enlace_asistencia = crypto.randomUUID()
    const payload = {
      tipo_reunion: body.tipo_reunion,
      descripcion: body.descripcion,
      fecha_programada: body.fecha_programada, // YYYY-MM-DD
      hora_inicio: body.hora_inicio,           // HH:mm
      hora_fin: body.hora_fin,                 // HH:mm
      modalidad: body.modalidad || 'Presencial',
      creado_por: body.creado_por,
      enlace_asistencia,
      responsable: body.responsable || '',
      dirigido_a: body.dirigido_a || 'Todo el personal',
      lugar: body.lugar || '',
      // estado default "Programada" en DB
      // timestamp_creacion default now() en DB
    }

    // Insertar
    const { data: inserted, error } = await supabase.from('reuniones').insert(payload).select().single()
    if (error) {
      return NextResponse.json({ status:'error', message: 'Error al crear reunión', detail: error.message }, { status: 400 })
    }

    // Participantes
    const participantes = await getParticipantes(payload.dirigido_a)

    // Envío de correos
    const transporter = buildTransport()
    const from = process.env.SMTP_FROM || process.env.SMTP_USER
    const asunto = `📢 Citación a reunión: ${payload.tipo_reunion}`
    const cuerpo = `Has sido citado(a) a la siguiente reunión de carácter obligatorio:\n\n` +
      `Tipo: ${payload.tipo_reunion}\n` +
      `Descripción: ${payload.descripcion}\n` +
      `Fecha: ${payload.fecha_programada}\n` +
      `Hora: ${payload.hora_inicio} a ${payload.hora_fin}\n` +
      `Lugar: ${payload.lugar || '-'}\n` +
      `Modalidad: ${payload.modalidad}\n` +
      `Responsable: ${payload.responsable || '-'}\n\n` +
      `Por favor registrar tu asistencia en el horario indicado.`

    // envíos individuales (best-effort)
    await Promise.all(
      participantes
        .filter(p => p.email && p.documento)
        .map(p => transporter.sendMail({
          from, to: p.email, subject: asunto,
          text: `Hola ${p.nombre_completo},\n\n${cuerpo}`,
        }).catch(() => null))
    )

    // correo institucional con tabla
    const institucional = institutionalList()
    if (institucional.length) {
      await transporter.sendMail({
        from,
        to: institucional.join(','),
        subject: `📌 Soporte de citación: ${payload.tipo_reunion}`,
        text: 'Tu cliente no admite HTML',
        html: `${reunionDetailsHtml(payload)}<p><strong>Participantes notificados:</strong></p>${participantesTableHtml(participantes)}`,
      }).catch(() => null)
    }

    return NextResponse.json({ status:'success', data: inserted, enlace_asistencia }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ status:'error', message: e.message }, { status: 500 })
  }
}

// GET: listar últimas 20 (con auto-finalización previa)
export async function GET(req) {
  // --- NUEVO: barrido para finalizar reuniones vencidas con asistencia ---
  await finalizeExpiredMeetings()
  // --- fin NUEVO ---

  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') || '20')
  const { data, error } = await supabase
    .from('reuniones')
    .select('*')
    .order('fecha_programada', { ascending: false })
    .order('hora_inicio', { ascending: true })
    .limit(limit)
  if (error) return NextResponse.json({ status:'error', message: error.message }, { status: 400 })
  return NextResponse.json({ status:'success', data })
}
