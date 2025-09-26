// app/api/asistencias/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Timestamp en zona Bogotá (compatible con TIMESTAMP WITHOUT TIME ZONE)
function nowBogotaIso() {
  const tz = 'America/Bogota'
  const d = new Date()
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(d)
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(d)
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(d)
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(d)
  const min = new Intl.DateTimeFormat('en-GB', { timeZone: tz, minute: '2-digit' }).format(d)
  const s = new Intl.DateTimeFormat('en-GB', { timeZone: tz, second: '2-digit' }).format(d)
  return `${y}-${m}-${day}T${h}:${min}:${s}`
}

// Partes actuales (fecha y hora) en Bogotá para reglas de finalización
function nowBogotaParts() {
  const tz = 'America/Bogota'
  const d = new Date()
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d) // YYYY-MM-DD
  const hm  = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)  // HH:mm
  return { ymd, hm }
}

// ¿La reunión ya terminó respecto a ahora (zona Bogotá)?
function isFinished(reunion, now) {
  return (String(reunion.fecha_programada) < now.ymd) ||
         (String(reunion.fecha_programada) === now.ymd && String(reunion.hora_fin) <= now.hm)
}

export async function POST(req) {
  try {
    const { enlace_asistencia, user } = await req.json()

    // Validación básica de payload
    if (!enlace_asistencia || !user?.documento) {
      return NextResponse.json({ status: 'error', message: 'Datos insuficientes.' }, { status: 400 })
    }
    const nombre = String(user?.nombreCompleto || '').trim()
    const rol = String(user?.role || user?.rol || '').trim()
    if (!nombre || !rol) {
      return NextResponse.json({ status: 'error', message: 'Datos de usuario incompletos.' }, { status: 400 })
    }

    // 1) Buscar reunión por enlace
    const { data: rows, error: e1 } = await supabase
      .from('reuniones').select('*').eq('enlace_asistencia', enlace_asistencia).limit(1)

    if (e1) {
      return NextResponse.json({ status: 'error', message: 'Error al consultar la reunión.' }, { status: 400 })
    }
    if (!rows?.length) {
      return NextResponse.json({ status: 'error', message: 'Reunión no encontrada.' }, { status: 404 })
    }

    const reunion = rows[0]

    // 2) Validar estado
    if (reunion.estado === 'Cancelada') {
      return NextResponse.json({ status: 'warning', message: 'Esta reunión fue cancelada. No se puede registrar asistencia.' }, { status: 200 })
    }
    // Nota: Permitimos registro en Programada o Ejecutada; el UI controla visibilidad por tiempo.

    // 3) Evitar duplicado
    const { count: existe, error: eDup } = await supabase
      .from('asistencias')
      .select('id', { count: 'exact', head: true })
      .eq('id_reunion', reunion.id)
      .eq('documento_usuario', user.documento)

    if (eDup) {
      return NextResponse.json({ status: 'error', message: 'Error validando asistencia previa.' }, { status: 400 })
    }
    if ((existe ?? 0) > 0) {
      return NextResponse.json({ status: 'warning', message: 'Ya registraste tu asistencia.' }, { status: 200 })
    }

    // 4) Insertar asistencia (timestamp Bogotá)
    const payload = {
      id_reunion: reunion.id,
      tipo_reunion: reunion.tipo_reunion,
      descripcion: reunion.descripcion,
      documento_usuario: user.documento,
      nombre_usuario: nombre,
      rol_usuario: rol,
      timestamp_asistencia: nowBogotaIso(),
    }
    const { error: e2 } = await supabase.from('asistencias').insert(payload)
    if (e2) {
      return NextResponse.json({ status: 'error', message: 'No se pudo registrar la asistencia.' }, { status: 400 })
    }

    // 5) Mini-finalización inmediata:
    //    Si la reunión ya terminó y hay (al menos) 1 asistencia => pasar a "Ejecutada" (si aún está "Programada")
    const now = nowBogotaParts()
    if (isFinished(reunion, now) && reunion.estado === 'Programada') {
      const { count: cAsis, error: eCnt } = await supabase
        .from('asistencias')
        .select('id', { count: 'exact', head: true })
        .eq('id_reunion', reunion.id)

      if (!eCnt && (cAsis ?? 0) > 0) {
        await supabase.from('reuniones').update({ estado: 'Ejecutada' }).eq('id', reunion.id)
      }
    }

    return NextResponse.json({ status: 'success', message: 'Asistencia registrada.' }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ status: 'error', message: 'Error interno al registrar asistencia.' }, { status: 500 })
  }
}
