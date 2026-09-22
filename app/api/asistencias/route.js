// app/api/asistencias/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// Timestamp en zona Bogotá
// Compatible con TIMESTAMP WITHOUT TIME ZONE
function nowBogotaIso() {
  const tz = 'America/Bogota'
  const d = new Date()

  const y = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
  }).format(d)

  const m = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    month: '2-digit',
  }).format(d)

  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    day: '2-digit',
  }).format(d)

  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    hour12: false,
  }).format(d)

  const min = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    minute: '2-digit',
  }).format(d)

  const s = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    second: '2-digit',
  }).format(d)

  return `${y}-${m}-${day}T${h}:${min}:${s}`
}

function nowBogotaParts() {
  const tz = 'America/Bogota'
  const d = new Date()

  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)

  const hm = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)

  return { ymd, hm }
}

function isFinished(reunion, now) {
  return (
    String(reunion.fecha_programada) < now.ymd ||
    (
      String(reunion.fecha_programada) === now.ymd &&
      String(reunion.hora_fin) <= now.hm
    )
  )
}

function respuestaError(error) {
  const respuesta = respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    { status: respuesta.status }
  )
}

export async function POST(request) {
  try {
    const body = await request.json()

    const { enlace_asistencia, user } = body

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request,
        body
      )

    // Validación básica
    if (!enlace_asistencia || !user?.documento) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Datos insuficientes.',
        },
        { status: 400 }
      )
    }

    const documento =
      String(user.documento || '').trim()

    const nombre =
      String(
        user?.nombreCompleto || ''
      ).trim()

    const rol =
      String(
        user?.role ||
        user?.rol ||
        ''
      ).trim()

    if (!nombre || !rol) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            'Datos de usuario incompletos.',
        },
        { status: 400 }
      )
    }

    // 1. Buscar reunión por enlace
    const {
      data: reunion,
      error: reunionError,
    } = await supabase
      .from('reuniones')
      .select('*')
      .eq(
        'enlace_asistencia',
        enlace_asistencia
      )
      .maybeSingle()

    if (reunionError) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            'Error al consultar la reunión.',
          detail: reunionError.message,
        },
        { status: 400 }
      )
    }

    if (!reunion) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            'Reunión no encontrada.',
        },
        { status: 404 }
      )
    }

    // 2. Validar estado
    if (
      String(reunion.estado || '')
        .trim()
        .toLowerCase() === 'cancelada'
    ) {
      return NextResponse.json(
        {
          status: 'warning',
          message:
            'Esta reunión fue cancelada. No se puede registrar asistencia.',
        },
        { status: 200 }
      )
    }

    // 3. Evitar duplicado
    const {
      count: existe,
      error: duplicadoError,
    } = await supabase
      .from('asistencias')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq(
        'id_reunion',
        reunion.id
      )
      .eq(
        'documento_usuario',
        documento
      )

    if (duplicadoError) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            'Error validando asistencia previa.',
          detail: duplicadoError.message,
        },
        { status: 400 }
      )
    }

    if ((existe ?? 0) > 0) {
      return NextResponse.json(
        {
          status: 'warning',
          message:
            'Ya registraste tu asistencia.',
        },
        { status: 200 }
      )
    }

    // 4. Insertar asistencia
    const payload = {
      id_reunion: reunion.id,
      tipo_reunion:
        reunion.tipo_reunion,
      descripcion:
        reunion.descripcion,
      documento_usuario:
        documento,
      nombre_usuario:
        nombre,
      rol_usuario:
        rol,
      timestamp_asistencia:
        nowBogotaIso(),
    }

    const {
      error: asistenciaError,
    } = await supabase
      .from('asistencias')
      .insert(payload)

    if (asistenciaError) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            'No se pudo registrar la asistencia.',
          detail:
            asistenciaError.message,
        },
        { status: 400 }
      )
    }

    // 5. Finalización inmediata
    const now =
      nowBogotaParts()

    if (
      isFinished(
        reunion,
        now
      ) &&
      String(reunion.estado || '')
        .trim()
        .toLowerCase() === 'programada'
    ) {
      const {
        count: totalAsistencias,
        error: countError,
      } = await supabase
        .from('asistencias')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq(
          'id_reunion',
          reunion.id
        )

      if (
        !countError &&
        (totalAsistencias ?? 0) > 0
      ) {
        const {
          error: updateError,
        } = await supabase
          .from('reuniones')
          .update({
            estado: 'Ejecutada',
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
    }

    return NextResponse.json(
      {
        status: 'success',
        message:
          'Asistencia registrada.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      'Error POST /api/asistencias:',
      error
    )

    return respuestaError(error)
  }
}