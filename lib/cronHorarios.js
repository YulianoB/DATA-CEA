import { getMasterSupabase } from '@/lib/supabaseMaster'
import { obtenerSupabaseAdminEmpresaPorNit } from '@/lib/supabaseEmpresaServer'
import { enviarAvisoCorporativo } from '@/lib/notificacionesCorporativasServer'

export const runtime = 'nodejs'
export function fechaBogota(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const val = (t) => parts.find(p => p.type === t)?.value
  return `${val('year')}-${val('month')}-${val('day')}`
}
export function horaBogota(date = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', {timeZone:'America/Bogota', hour:'2-digit',hourCycle:'h23'}).format(date))
}
export function autorizadoCron(request) {
  const secret = process.env.CRON_SECRET
  return !!secret && request.headers.get('authorization') === `Bearer ${secret}`
}
export async function empresasActivas() {
  const master = getMasterSupabase()
  const empresas = []
  for (let desde = 0; ; desde += 500) {
    const { data, error } = await master.from('empresas').select('nit').eq('estado', 'activo').range(desde, desde + 499)
    if (error) throw error
    empresas.push(...(data || []))
    if (!data || data.length < 500) break
  }
  return empresas
}
export async function jornadas(supabase, fechaMaxima, estado, campos) {
  const resultados = []
  for (let desde = 0; ; desde += 500) {
    const { data, error } = await supabase.from('horarios').select(campos)
      .eq('estado_registro', estado).lte('fecha_entrada', fechaMaxima)
      .order('id', { ascending: true }).range(desde, desde + 499)
    if (error) throw error
    resultados.push(...(data || []))
    if (!data || data.length < 500) break
  }
  return resultados
}
export async function cerrarPendientes(nit, fecha) {
  const { supabaseAdmin } = await obtenerSupabaseAdminEmpresaPorNit(nit)
  // El proceso nocturno también recupera jornadas antiguas que quedaron Abierto por fallos previos.
  const pendientes = await jornadas(supabaseAdmin, fecha, 'Abierto', 'id,fecha_entrada')
  let actualizados = 0
  for (const j of pendientes) {
    const { data, error } = await supabaseAdmin.from('horarios')
      .update({ estado_registro: 'No Cerrado' }).eq('id', j.id)
      .eq('estado_registro', 'Abierto').is('timestamp_salida', null)
      .select('id')
    if (error) throw error
    actualizados += data?.length || 0
  }
  return actualizados
}
export async function notificarPendientes(nit, fechaHoy) {
  const { supabaseAdmin } = await obtenerSupabaseAdminEmpresaPorNit(nit)
  const { data: registros, error } = await supabaseAdmin.from('horarios')
    .select('id,fecha_entrada,hora_entrada,nombre_completo,usuario,rol,placa')
    .eq('estado_registro', 'No Cerrado').lt('fecha_entrada', fechaHoy)
    .order('fecha_entrada', {ascending:true}).order('id', {ascending:true}).limit(501)
  if (error) throw error
  if (!registros?.length) return { pendientes: 0, enviado: false }
  if (registros.length > 500) throw new Error('Más de 500 jornadas pendientes: requiere envío paginado antes de notificar')
  const master = getMasterSupabase()
  // Clave única (nit, fecha) impide reenvíos por reintentos concurrentes.
  const { error: bloqueoError } = await master.from('notificaciones_horarios_diarias')
    .insert({ nit, fecha, estado: 'procesando' })
  if (bloqueoError) {
    if (bloqueoError.code === '23505') return { pendientes: registros.length, enviado: false, duplicado: true }
    throw bloqueoError
  }
  try {
    const detalles = [
      ['Fecha de revisión', fechaHoy],
      ['Total de jornadas No Cerrado', registros.length],
      ...registros.map(j => [`Jornada #${j.id}`, `${j.fecha_entrada} ${j.hora_entrada || ''} | ${j.nombre_completo || j.usuario || 'Sin nombre'} | ${j.rol || 'Sin rol'} | ${j.placa || 'Sin placa'}`]),
    ]
    const enviado = await enviarAvisoCorporativo({
      nit, asunto: `DATA CEA: ${registros.length} jornada(s) No Cerrado - ${fechaHoy}`, detalles,
    })
    if (!enviado) {
      await master.from('notificaciones_horarios_diarias').delete().eq('nit', nit).eq('fecha', fecha)
      return { pendientes: registros.length, enviado: false, sinDestinatarios: true }
    }
    const { error: finError } = await master.from('notificaciones_horarios_diarias')
      .update({ estado: 'enviado', enviado_en: new Date().toISOString() })
      .eq('nit', nit).eq('fecha', fecha)
    if (finError) throw finError
    return { pendientes: registros.length, enviado: true }
  } catch (error) {
    // En caso de fallo tras el envío, no se elimina el bloqueo para evitar duplicar correos.
    await master.from('notificaciones_horarios_diarias').update({ estado: 'error' })
      .eq('nit', nit).eq('fecha', fecha)
    throw error
  }
}
