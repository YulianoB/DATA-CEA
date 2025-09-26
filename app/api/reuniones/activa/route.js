// app/api/reuniones/activa/route.js
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

// --- NUEVO: auto-finalizar vencidas con asistencia ---
function isFinished(r, now) {
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
    const { count } = await supabase
      .from('asistencias')
      .select('id', { count: 'exact', head: true })
      .eq('id_reunion', r.id)
    if ((count ?? 0) > 0) {
      await supabase.from('reuniones').update({ estado: 'Ejecutada' }).eq('id', r.id)
    }
  }
}
// --- fin NUEVO ---

export async function GET() {
  const { ymd, hm } = nowBogotaParts()

  // --- NUEVO: barrer vencidas antes de calcular activa ---
  await finalizeExpiredMeetings()
  // --- fin NUEVO ---

  const { data, error } = await supabase
    .from('reuniones')
    .select('*')
    .eq('fecha_programada', ymd)
    .eq('estado', 'Programada')
    .order('hora_inicio', { ascending: true })
  if (error) return NextResponse.json({ status:'error', message: error.message }, { status: 400 })

  const activa = (data || []).find(r => (r.hora_inicio <= hm && hm <= r.hora_fin)) || null
  return NextResponse.json({ status:'success', data: activa })
}
