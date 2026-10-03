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


async function sincronizarEjecucionPesv(
  supabase,
  reunion,
  numeroAsistentes
) {
  const actividadId =
    Number(
      reunion
        ?.pesv_plan_formacion_actividad_id
    )

  if (
    !Number.isInteger(
      actividadId
    ) ||
    actividadId <= 0
  ) {
    return
  }

  const {
    data:
      ejecucionExistente,
    error:
      errorEjecucionExistente,
  } =
    await supabase
      .from(
        'pesv_plan_formacion_ejecuciones'
      )
      .select(
        'id'
      )
      .eq(
        'actividad_id',
        actividadId
      )
      .eq(
        'reunion_id',
        reunion.id
      )
      .maybeSingle()

  if (
    errorEjecucionExistente
  ) {
    console.error(
      `Error validando ejecución PESV para reunión ${reunion.id}:`,
      errorEjecucionExistente
    )

    return
  }

  if (
    !ejecucionExistente
  ) {
    const {
      error:
        errorInsertEjecucion,
    } =
      await supabase
        .from(
          'pesv_plan_formacion_ejecuciones'
        )
        .insert({
          actividad_id:
            actividadId,

          reunion_id:
            reunion.id,

          fecha_ejecucion:
            reunion.fecha_programada,

          numero_asistentes:
            Number(
              numeroAsistentes ||
              0
            ),

          resultado:
            'EJECUTADA',

          observaciones:
            'Ejecución registrada automáticamente desde la reunión PESV.',
        })

    if (
      errorInsertEjecucion
    ) {
      console.error(
        `Error creando ejecución PESV para reunión ${reunion.id}:`,
        errorInsertEjecucion
      )

      return
    }
  } else {
    const {
      error:
        errorActualizarEjecucion,
    } =
      await supabase
        .from(
          'pesv_plan_formacion_ejecuciones'
        )
        .update({
          fecha_ejecucion:
            reunion.fecha_programada,

          numero_asistentes:
            Number(
              numeroAsistentes ||
              0
            ),
        })
        .eq(
          'id',
          ejecucionExistente.id
        )

    if (
      errorActualizarEjecucion
    ) {
      console.error(
        `Error actualizando ejecución PESV para reunión ${reunion.id}:`,
        errorActualizarEjecucion
      )

      return
    }
  }

  const {
    error:
      errorActividad,
  } =
    await supabase
      .from(
        'pesv_plan_formacion_actividades'
      )
      .update({
        estado:
          'EJECUTADA',

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        actividadId
      )

  if (
    errorActividad
  ) {
    console.error(
      `Error actualizando actividad PESV ${actividadId}:`,
      errorActividad
    )
  }
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
        estado,
        origen_modulo,
        pesv_plan_formacion_actividad_id
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

        continue
      }

      if (
        String(
          reunion
            .origen_modulo ||
          ''
        )
          .trim()
          .toUpperCase() ===
        'PESV' &&
        reunion
          .pesv_plan_formacion_actividad_id
      ) {
        await sincronizarEjecucionPesv(
          supabase,
          reunion,
          count
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



function normalizarPoblacionCitacion(
  valor
) {
  const poblacion =
    String(
      valor ||
      ''
    )
      .trim()
      .toUpperCase()

  if (
    poblacion ===
    'TODO EL PERSONAL'
  ) {
    return 'Todo el personal'
  }

  if (
    poblacion ===
    'INSTRUCTORES'
  ) {
    return 'Instructores'
  }

  if (
    poblacion ===
      'ADMINISTRATIVO' ||
    poblacion ===
      'PERSONAL ADMINISTRATIVO'
  ) {
    return 'Administrativo'
  }

  return null
}


async function getParticipantes(
  supabase,
  dirigidoA
) {
  const poblacion =
    normalizarPoblacionCitacion(
      dirigidoA
    )

  if (!poblacion) {
    throw new Error(
      'La población de la citación no es válida.'
    )
  }

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
        perfil =>
          String(
            perfil?.estado ||
            ''
          )
            .trim()
            .toLowerCase() ===
          'activo'
      )

    const roles =
      perfilesActivos
        .map(
          perfil =>
            String(
              perfil?.rol ||
              ''
            )
              .trim()
              .toUpperCase()
        )
        .filter(Boolean)

    let incluir =
      false

    if (
      poblacion ===
      'Todo el personal'
    ) {
      incluir =
        true
    }

    if (
      poblacion ===
      'Instructores'
    ) {
      incluir =
        roles.includes(
          'INSTRUCTOR_TEORIA'
        ) ||
        roles.includes(
          'INSTRUCTOR_PRACTICA'
        )
    }

    if (
      poblacion ===
      'Administrativo'
    ) {
      incluir =
        roles.includes(
          'ADMINISTRATIVO'
        ) ||
        roles.includes(
          'AUXILIAR_ADMINISTRATIVO'
        )
    }

    if (!incluir) {
      continue
    }

    participantes.push({
      personal_id:
        persona.id,

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


async function guardarCitados(
  supabase,
  reunionId,
  participantes
) {
  const citados =
    (
      Array.isArray(
        participantes
      )
        ? participantes
        : []
    )
      .filter(
        (participante) =>
          String(
            participante
              ?.documento ||
            ''
          ).trim()
      )
      .map(
        (participante) => ({
          reunion_id:
            reunionId,

          personal_id:
            participante
              .personal_id ||
            null,

          documento:
            String(
              participante
                .documento ||
              ''
            ).trim(),

          nombre:
            String(
              participante
                .nombre_completo ||
              ''
            ).trim(),

          email:
            String(
              participante
                .email ||
              ''
            ).trim() ||
            null,

          rol:
            String(
              participante
                .rol ||
              ''
            ).trim() ||
            null,

          correo_enviado:
            false,
        })
      )

  if (
    citados.length ===
    0
  ) {
    return
  }

  const {
    error,
  } =
    await supabase
      .from(
        'reuniones_citados'
      )
      .upsert(
        citados,
        {
          onConflict:
            'reunion_id,documento',

          ignoreDuplicates:
            true,
        }
      )

  if (error) {
    throw error
  }
}


async function marcarCorreoCitado(
  supabase,
  reunionId,
  documento
) {
  const {
    error,
  } =
    await supabase
      .from(
        'reuniones_citados'
      )
      .update({
        correo_enviado:
          true,
      })
      .eq(
        'reunion_id',
        reunionId
      )
      .eq(
        'documento',
        documento
      )

  if (error) {
    console.error(
      `No fue posible marcar correo enviado para ${documento}:`,
      error
    )
  }
}


async function validarActividadPesv(
  supabase,
  actividadId
) {
  if (
    actividadId ===
      null ||
    actividadId ===
      undefined ||
    actividadId ===
      ''
  ) {
    return null
  }

  const id =
    Number(
      actividadId
    )

  if (
    !Number.isInteger(
      id
    ) ||
    id <= 0
  ) {
    const error =
      new Error(
        'La actividad del Plan de Formación PESV no es válida.'
      )

    error.status =
      400

    throw error
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_plan_formacion_actividades'
      )
      .select(`
        id,
        plan_formacion_id,
        codigo,
        nombre,
        fecha_programada,
        estado
      `)
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    const errorNoExiste =
      new Error(
        'La actividad del Plan de Formación PESV seleccionada no existe.'
      )

    errorNoExiste.status =
      404

    throw errorNoExiste
  }

  return data
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
  let supabase =
    null

  let reunionCreada =
    null

  try {
    const body =
      await request.json()

    const resultadoEmpresa =
      await obtenerSupabaseEmpresaDesdeRequest(
        request,
        body
      )

    supabase =
      resultadoEmpresa
        .supabase


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


    const origenModulo =
      String(
        body.origen_modulo ||
        'GENERAL'
      )
        .trim()
        .toUpperCase() ||
      'GENERAL'


    const actividadPesv =
      await validarActividadPesv(
        supabase,
        body
          .pesv_plan_formacion_actividad_id
      )


    if (
      actividadPesv &&
      origenModulo !==
        'PESV'
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'Una citación asociada al Plan de Formación debe pertenecer al módulo PESV.',
        },
        {
          status: 400,
        }
      )
    }


    const enlaceAsistencia =
      crypto.randomUUID()


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
        normalizarPoblacionCitacion(
          body.dirigido_a ||
          'Todo el personal'
        ) ||
        'Todo el personal',

      lugar:
        body.lugar ||
        '',

      origen_modulo:
        origenModulo,

      pesv_plan_formacion_actividad_id:
        actividadPesv
          ?.id ||
        null,
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


    reunionCreada =
      inserted


    const participantes =
      await getParticipantes(
        supabase,
        payload.dirigido_a
      )


    try {
      await guardarCitados(
        supabase,
        inserted.id,
        participantes
      )

      // Sincroniza la fotografía de personas programadas
      // con la población realmente seleccionada para la citación.
      if (
        actividadPesv?.id
      ) {
        const {
          error:
            errorPersonasProgramadas,
        } =
          await supabase
            .from(
              'pesv_plan_formacion_actividades'
            )
            .update({
              personas_programadas:
                participantes.length,
            })
            .eq(
              'id',
              actividadPesv.id
            )

        if (
          errorPersonasProgramadas
        ) {
          throw errorPersonasProgramadas
        }
      }
    } catch (
      errorCitados
    ) {
      console.error(
        'Error guardando personas citadas:',
        errorCitados
      )

      const {
        error:
          errorRollback,
      } =
        await supabase
          .from('reuniones')
          .delete()
          .eq(
            'id',
            inserted.id
          )

      if (
        errorRollback
      ) {
        console.error(
          'No fue posible revertir la reunión después del error de citados:',
          errorRollback
        )
      }

      throw errorCitados
    }


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
          async (
            participante
          ) => {
            try {
              await transporter
                .sendMail({
                  from,

                  to:
                    participante.email,

                  subject:
                    asunto,

                  text:
                    `Hola ${participante.nombre_completo},\n\n${cuerpo}`,
                })

              await marcarCorreoCitado(
                supabase,
                inserted.id,
                participante
                  .documento
              )

              return true
            } catch (
              errorCorreo
            ) {
              console.error(
                `No fue posible enviar correo a ${participante.email}:`,
                errorCorreo
              )

              return false
            }
          }
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
            `<p><strong>Participantes citados:</strong></p>` +
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

        total_citados:
          participantes.length,

        actividad_pesv:
          actividadPesv,
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

    /*
      Si el error ocurrió después de crear la reunión y
      todavía existe, no se elimina automáticamente aquí.
      El rollback específico de citados ya se ejecuta en
      el punto correspondiente. Esto evita eliminar una
      reunión válida por un fallo posterior de correo.
    */
    void reunionCreada

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
