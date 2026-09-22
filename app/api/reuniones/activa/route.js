// app/api/reuniones/activa/route.js

import { NextResponse } from 'next/server'
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

async function finalizeExpiredMeetings(supabase) {
  const now = nowBogotaParts()

  const { data: rows, error } = await supabase
    .from('reuniones')
    .select('id, fecha_programada, hora_fin, estado')
    .lte('fecha_programada', now.ymd)
    .eq('estado', 'Programada')

  if (error) {
    console.error(
      'Error consultando reuniones vencidas:',
      error
    )
    return
  }

  if (!rows?.length) return

  for (const reunion of rows) {
    if (!isFinished(reunion, now)) continue

    const { count, error: countError } = await supabase
      .from('asistencias')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('id_reunion', reunion.id)

    if (countError) {
      console.error(
        `Error consultando asistencias de reunión ${reunion.id}:`,
        countError
      )
      continue
    }

    if ((count ?? 0) > 0) {
      const { error: updateError } = await supabase
        .from('reuniones')
        .update({
          estado: 'Ejecutada',
        })
        .eq('id', reunion.id)

      if (updateError) {
        console.error(
          `Error finalizando reunión ${reunion.id}:`,
          updateError
        )
      }
    }

    // Si no tiene asistencias conserva estado Programada.
  }
}

export async function GET(request) {
  try {
    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request)

    const { ymd, hm } = nowBogotaParts()

    // Barrer reuniones vencidas antes de buscar la activa
    await finalizeExpiredMeetings(supabase)

    const { data, error } = await supabase
      .from('reuniones')
      .select('*')
      .eq('fecha_programada', ymd)
      .eq('estado', 'Programada')
      .order('hora_inicio', { ascending: true })

    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          message: error.message,
        },
        { status: 400 }
      )
    }

    const activa =
      (data || []).find(
        (reunion) =>
          String(reunion.hora_inicio) <= hm &&
          hm <= String(reunion.hora_fin)
      ) || null

    return NextResponse.json({
      status: 'success',
      data: activa,
    })
  } catch (error) {
    console.error(
      'Error GET /api/reuniones/activa:',
      error
    )

    return respuestaError(error)
  }
}