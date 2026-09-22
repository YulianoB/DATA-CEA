// app/api/reuniones/route.js

import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'


function respuestaError(error) {
  const respuesta =
    respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    {
      status:
        respuesta.status,
    }
  )
}


function nowBogotaParts() {
  const tz =
    'America/Bogota'

  const d =
    new Date()

  const ymd =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    ).format(d)

  const hm =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }
    ).format(d)

  return {
    ymd,
    hm,
  }
}


function isFinished(
  reunion,
  now
) {
  return (
    String(
      reunion.fecha_programada
    ) < now.ymd ||
    (
      String(
        reunion.fecha_programada
      ) === now.ymd &&
      String(
        reunion.hora_fin
      ) <= now.hm
    )
  )
}


async function finalizeExpiredMeetings(
  supabase
) {
  const now =
    nowBogotaParts()

  const {
    data: rows,
    error,
  } =
    await supabase
      .from('reuniones')
      .select(`
        id,
        fecha_programada,
        hora_fin,
        estado
      `)
      .lte(
        'fecha_programada',
        now.ymd
      )
      .eq(
        'estado',
        'Programada'
      )

  if (error) {
    console.error(
      'Error consultando reuniones vencidas:',
      error
    )

    return
  }

  if (!rows?.length) {
    return
  }

  for (
    const reunion
    of rows
  ) {
    if (
      !isFinished(
        reunion,
        now
      )
    ) {
      continue
    }

    const {
      count,
      error:
        countError,
    } =
      await supabase
        .from('asistencias')
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'id_reunion',
          reunion.id
        )

    if (countError) {
      console.error(
        `Error consultando asistencias reunión ${reunion.id}:`,
        countError
      )

      continue
    }

    if (
      (count ?? 0) > 0
    ) {
      const {
        error:
          updateError,
      } =
        await supabase
          .from('reuniones')
          .update({
            estado:
              'Ejecutada',
          })
          .eq(
            'id',
            reunion.id
          )

      if (updateError) {
        console.error(
          `Error finalizando reunión ${reunion.id}:`,
          updateError
        )
      }
    }

    // Si no hay asistentes,
    // conserva estado Programada.
  }
}


function institutionalList() {
  const principal =
    (
      process.env
        .MAIL_INSTITUCIONAL ||
      ''
    ).trim()

  const respaldo =
    (
      process.env
        .NEXT_PUBLIC_MAIL_MANTENIMIENTO ||
      ''
    ).trim()

  const lista =
    (
      principal ||
      respaldo ||
      ''
    )
      .split(',')
      .map(
        (email) =>
          email.trim()
      )
      .filter(Boolean)

  return Array.from(
    new Set(lista)
  )
}


function buildTransport() {
  const port =
    Number(
      process.env.SMTP_PORT ||
      '465'
    )

  return nodemailer
    .createTransport({
      host:
        process.env.SMTP_HOST,

      port,

      secure:
        port === 465,

      auth: {
        user:
          process.env.SMTP_USER,

        pass:
          process.env.SMTP_PASS,
      },
    })
}


async function getParticipantes(
  supabase,
  dirigidoA
) {
  const {
    data,
    error,
  } =
    await supabase
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
      .eq(
        'estado',
        'activo'
      )

  if (error) {
    throw error
  }

  const participantes = []

  for (
    const persona
    of data || []
  ) {
    const perfilesActivos =
      (
        persona
          .perfiles_usuario ||
        []
      ).filter(
        (perfil) =>
          String(
            perfil.estado ||
            ''
          )
            .trim()
            .toLowerCase() ===
          'activo'
      )

    const roles =
      perfilesActivos.map(
        (perfil) =>
          perfil.rol
      )

    const incluir =
      dirigidoA ===
        'Todo el personal' ||
      !dirigidoA ||
      (
        dirigidoA ===
          'Instructores' &&
        (
          roles.includes(
            'INSTRUCTOR_PRACTICA'
          ) ||
          roles.includes(
            'INSTRUCTOR_TEORIA'
          ) ||
          roles.includes(
            'INSTRUCTOR PRÁCTICA'
          ) ||
          roles.includes(
            'INSTRUCTOR TEORÍA'
          )
        )
      ) ||
      (
        dirigidoA ===
          'Administrativo' &&
        (
          roles.includes(
            'ADMINISTRATIVO'
          ) ||
          roles.includes(
            'AUXILIAR_ADMINISTRATIVO'
          ) ||
          roles.includes(
            'AUXILIAR ADMINISTRATIVO'
          )
        )
      )

    if (!incluir) {
      continue
    }

    participantes.push({
      nombre_completo:
        `${persona.nombres || ''} ${persona.apellidos || ''}`
          .trim(),

      documento:
        persona.documento,

      email:
        persona.email,

      rol:
        roles.join(', '),
    })
  }

  const unicoPorDocumento =
    new Map()

  for (
    const participante
    of participantes
  ) {
    const documento =
      String(
        participante.documento ||
        ''
      ).trim()

    if (
      documento &&
      !unicoPorDocumento
        .has(documento)
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


function reunionDetailsHtml(
  reunion
) {
  return `
    <p><strong>Detalles de la reunión programada:</strong></p>

    <pre style="font-size:13px">
Tipo: ${reunion.tipo_reunion}
Descripción: ${reunion.descripcion}
Fecha: ${reunion.fecha_programada}
Hora: ${reunion.hora_inicio} a ${reunion.hora_fin}
Lugar: ${reunion.lugar || '-'}
Modalidad: ${reunion.modalidad}
Responsable: ${reunion.responsable || '-'}
Dirigido a: ${reunion.dirigido_a || 'Todo el personal'}
    </pre>
  `
}


function participantesTableHtml(
  lista
) {
  const rows =
    lista
      .map(
        (
          participante,
          index
        ) => `
          <tr>
            <td>
              ${index + 1}
            </td>

            <td>
              ${
                participante
                  .nombre_completo ||
                '-'
              }
            </td>

            <td>
              ${
                participante
                  .documento ||
                '-'
              }
            </td>

            <td>
              ${
                participante
                  .email ||
                '-'
              }
            </td>

            <td>
              ${
                participante
                  .rol ||
                '-'
              }
            </td>
          </tr>
        `
      )
      .join('')

  return `
    <table
      border="1"
      cellpadding="5"
      cellspacing="0"
      style="border-collapse:collapse;font-size:13px;"
    >
      <thead>
        <tr style="background:#f0f0f0">
          <th>#</th>
          <th>Nombre</th>
          <th>Documento</th>
          <th>Email</th>
          <th>Rol</th>
        </tr>
      </thead>

      <tbody>
        ${rows}
      </tbody>
    </table>
  `
}


export async function POST(
  request
) {
  try {
    const body =
      await request.json()

    const {
      supabase,
    } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request,
        body
      )


    if (
      !body.tipo_reunion ||
      !body.descripcion ||
      !body.fecha_programada ||
      !body.hora_inicio ||
      !body.hora_fin
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'Tipo, descripción, fecha, hora de inicio y hora de fin son obligatorios.',
        },
        {
          status: 400,
        }
      )
    }


    if (
      body.hora_fin <=
      body.hora_inicio
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'La hora de fin debe ser posterior a la hora de inicio.',
        },
        {
          status: 400,
        }
      )
    }


    const enlaceAsistencia =
      crypto.randomUUID()


    /*
      El módulo general de reuniones
      utiliza GENERAL por defecto.

      Cuando una reunión sea creada
      desde PESV, la aplicación enviará:

      origen_modulo: 'PESV'
    */
    const origenModulo =
      String(
        body.origen_modulo ||
        'GENERAL'
      )
        .trim()
        .toUpperCase() ||
      'GENERAL'


    const payload = {
      tipo_reunion:
        body.tipo_reunion,

      descripcion:
        body.descripcion,

      fecha_programada:
        body.fecha_programada,

      hora_inicio:
        body.hora_inicio,

      hora_fin:
        body.hora_fin,

      modalidad:
        body.modalidad ||
        'Presencial',

      creado_por:
        body.creado_por ||
        '',

      enlace_asistencia:
        enlaceAsistencia,

      responsable:
        body.responsable ||
        '',

      dirigido_a:
        body.dirigido_a ||
        'Todo el personal',

      lugar:
        body.lugar ||
        '',

      origen_modulo:
        origenModulo,
    }


    const {
      data: inserted,
      error,
    } =
      await supabase
        .from('reuniones')
        .insert(payload)
        .select()
        .single()


    if (error) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'Error al crear reunión.',

          detail:
            error.message,
        },
        {
          status: 400,
        }
      )
    }


    const participantes =
      await getParticipantes(
        supabase,
        payload.dirigido_a
      )


    const transporter =
      buildTransport()


    const from =
      process.env.SMTP_FROM ||
      process.env.SMTP_USER


    const asunto =
      `📢 Citación a reunión: ${payload.tipo_reunion}`


    const cuerpo =
      `Has sido citado(a) a la siguiente reunión de carácter obligatorio:\n\n` +
      `Tipo: ${payload.tipo_reunion}\n` +
      `Descripción: ${payload.descripcion}\n` +
      `Fecha: ${payload.fecha_programada}\n` +
      `Hora: ${payload.hora_inicio} a ${payload.hora_fin}\n` +
      `Lugar: ${payload.lugar || '-'}\n` +
      `Modalidad: ${payload.modalidad}\n` +
      `Responsable: ${payload.responsable || '-'}\n\n` +
      `Por favor registrar tu asistencia en el horario indicado.`


    await Promise.all(
      participantes
        .filter(
          (participante) =>
            participante.email &&
            participante.documento
        )
        .map(
          (participante) =>
            transporter
              .sendMail({
                from,

                to:
                  participante.email,

                subject:
                  asunto,

                text:
                  `Hola ${participante.nombre_completo},\n\n${cuerpo}`,
              })
              .catch(
                (error) => {
                  console.error(
                    `No fue posible enviar correo a ${participante.email}:`,
                    error
                  )

                  return null
                }
              )
        )
    )


    const institucional =
      institutionalList()


    if (
      institucional.length
    ) {
      await transporter
        .sendMail({
          from,

          to:
            institucional
              .join(','),

          subject:
            `📌 Soporte de citación: ${payload.tipo_reunion}`,

          text:
            'Tu cliente de correo no admite HTML.',

          html:
            `${reunionDetailsHtml(payload)}` +
            `<p><strong>Participantes notificados:</strong></p>` +
            `${participantesTableHtml(participantes)}`,
        })
        .catch(
          (error) => {
            console.error(
              'No fue posible enviar el correo institucional:',
              error
            )

            return null
          }
        )
    }


    return NextResponse.json(
      {
        status:
          'success',

        data:
          inserted,

        enlace_asistencia:
          enlaceAsistencia,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      'Error POST /api/reuniones:',
      error
    )

    return respuestaError(
      error
    )
  }
}


export async function GET(
  request
) {
  try {
    const {
      supabase,
    } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request
      )

    const {
      searchParams,
    } =
      new URL(
        request.url
      )


    const limitSolicitado =
      Number(
        searchParams.get(
          'limit'
        ) ||
        '20'
      )


    const limit =
      Number.isFinite(
        limitSolicitado
      ) &&
      limitSolicitado > 0
        ? Math.min(
            Math.floor(
              limitSolicitado
            ),
            100
          )
        : 20


    await finalizeExpiredMeetings(
      supabase
    )


    const {
      data,
      error,
    } =
      await supabase
        .from('reuniones')
        .select('*')
        .order(
          'fecha_programada',
          {
            ascending:
              false,
          }
        )
        .order(
          'hora_inicio',
          {
            ascending:
              true,
          }
        )
        .limit(limit)


    if (error) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            error.message,
        },
        {
          status: 400,
        }
      )
    }


    return NextResponse.json({
      status:
        'success',

      data:
        data || [],
    })
  } catch (error) {
    console.error(
      'Error GET /api/reuniones:',
      error
    )

    return respuestaError(
      error
    )
  }
}