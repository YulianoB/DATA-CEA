// app/api/reuniones/finalizar/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function nowBogotaParts() {
  const tz = 'America/Bogota'
  const d = new Date()
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit' }).format(d)
  const hm  = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour:'2-digit', minute:'2-digit', hour12:false }).format(d)
  return { ymd, hm }
}

export async function POST() {
  try {
    const { ymd, hm } = nowBogotaParts()
    const { data, error } = await supabase
      .from('reuniones')
      .select('id, hora_fin')
      .eq('fecha_programada', ymd)
      .eq('estado', 'Programada')
    if (error) return NextResponse.json({ status:'error', message: error.message }, { status: 400 })

    const candidatas = (data || []).filter(r => r.hora_fin < hm)
    let ejecutadas = 0

    for (const r of candidatas) {
      const { count } = await supabase
        .from('asistencias')
        .select('id', { count: 'exact', head: true })
        .eq('id_reunion', r.id)
      if (!count) continue
      const { error: e2 } = await supabase.from('reuniones').update({ estado: 'Ejecutada' }).eq('id', r.id)
      if (!e2) ejecutadas++
    }

    return NextResponse.json({ status:'success', ejecutadas })
  } catch (e) {
    return NextResponse.json({ status:'error', message: e.message }, { status: 500 })
  }
}
