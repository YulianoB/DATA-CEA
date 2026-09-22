// app/api/reuniones/[id]/estado/route.js

import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

function respuestaError(error) {
  const respuesta = respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    { status: respuesta.status }
  )
}

function institutionalList() {
  const principal =
    (process.env.MAIL_INSTITUCIONAL || '').trim()

  const respaldo =
    (process.env.NEXT_PUBLIC_MAIL_MANTENIMIENTO || '').trim()

  const lista = (principal || respaldo || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)

  return Array.from(new Set(lista))
}

function buildTransport() {
  const port = Number(
    process.env.SMTP_PORT || '465'
  )

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

async function getParticipantes(
  supabase,
  dirigidoA
) {
  const { data, error } = await supabase
    .from('personal')
    .select(`
      id,
      documento,
      nombres,
      apellidos,
      email,
      estado,
      perfiles_usuario (
        rol,
        estado
      )
    `)
    .eq('estado', 'activo')

  if (error) throw error

  const participantes = []

  for (const persona of data || []) {
    const perfilesActivos =
      (persona.perfiles_usuario || []).filter(
        (perfil) =>
          String(perfil.estado || '')
            .trim()
            .toLowerCase() === 'activo'
      )

    const roles =
      perfilesActivos.map(
        (perfil) => perfil.rol
      )

    const incluir =
      dirigidoA === 'Todo el personal' ||
      !dirigidoA ||
      (
        dirigidoA === 'Instructores' &&
        (
          roles.includes('INSTRUCTOR_PRACTICA') ||
          roles.includes('INSTRUCTOR_TEORIA') ||
          roles.includes('INSTRUCTOR PRÁCTICA') ||
          roles.includes('INSTRUCTOR TEORÍA')
        )
      ) ||
      (
        dirigidoA === 'Administrativo' &&
        (
          roles.includes('ADMINISTRATIVO') ||
          roles.includes('AUXILIAR_ADMINISTRATIVO') ||
          roles.includes('AUXILIAR ADMINISTRATIVO')
        )
      )

    if (!incluir) continue

    participantes.push({
      nombre_completo:
        `${persona.nombres || ''} ${persona.apellidos || ''}`.trim(),
      documento: persona.documento,
      email: persona.email,
      rol: roles.join(', '),
    })
  }

  const unicoPorDocumento = new Map()

  for (const participante of participantes) {
    const documento =
      String(participante.documento || '').trim()

    if (
      documento &&
      !unicoPorDocumento.has(documento)
    ) {
      unicoPorDocumento.set(
        documento,
        participante
      )
    }
  }

  return Array.from(
    unicoPorDocumento.values()
  )
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'ID de reunión requerido.',
        },
        { status: 400 }
      )
    }

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request,
        body
      )

    // Obtener reunión
    const { data: reunion, error: reunionError } =
      await supabase
        .from('reuniones')
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (reunionError) {
      return NextResponse.json(
        {
          status: 'error',
          message: reunionError.message,
        },
        { status: 500 }
      )
    }

    if (!reunion) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Reunión no encontrada.',
        },
        { status: 404 }
      )
    }

    if (
      String(reunion.estado || '')
        .trim()
        .toLowerCase() !== 'programada'
    ) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            'Solo se pueden cancelar reuniones que estén en estado Programada.',
        },
        { status: 400 }
      )
    }

    // Actualizar estado
    const { error: updateError } =
      await supabase
        .from('reuniones')
        .update({
          estado: 'Cancelada',
        })
        .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            'No se pudo actualizar el estado de la reunión.',
          detail: updateError.message,
        },
        { status: 400 }
      )
    }

    // Participantes
    const participantes =
      await getParticipantes(
        supabase,
        reunion.dirigido_a
      )

    // Notificación
    const transporter =
      buildTransport()

    const from =
      process.env.SMTP_FROM ||
      process.env.SMTP_USER

    const asunto =
      `⚠️ Reunión cancelada: ${reunion.tipo_reunion}`

    const cuerpo =
      `Se informa que la siguiente reunión ha sido cancelada:\n\n` +
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
        .filter(
          (participante) =>
            participante.email &&
            participante.documento
        )
        .map((participante) =>
          transporter
            .sendMail({
              from,
              to: participante.email,
              subject: asunto,
              text:
                `Hola ${participante.nombre_completo},\n\n${cuerpo}`,
            })
            .catch((error) => {
              console.error(
                `No fue posible enviar cancelación a ${participante.email}:`,
                error
              )

              return null
            })
        )
    )

    const institucional =
      institutionalList()

    if (institucional.length) {
      await transporter
        .sendMail({
          from,
          to: institucional.join(','),
          subject:
            `📌 Cancelación de reunión: ${reunion.tipo_reunion}`,
          text: cuerpo,
        })
        .catch((error) => {
          console.error(
            'No fue posible enviar correo institucional de cancelación:',
            error
          )

          return null
        })
    }

    return NextResponse.json({
      status: 'success',
      message:
        'Estado actualizado a "Cancelada".',
    })
  } catch (error) {
    console.error(
      'Error PATCH /api/reuniones/[id]/estado:',
      error
    )

    return respuestaError(error)
  }
}