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
// El cierre nocturno corresponde exclusivamente al día en curso en Colombia.
export function fechaAnteriorBogota(fechaHoy) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaHoy)) throw new Error('Fecha de reporte inválida')
  const d = new Date(`${fechaHoy}T12:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== fechaHoy) {
    throw new Error('Fecha de reporte inválida')
  }
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function cerrarPendientes(nit, fecha) {
  const { supabaseAdmin } = await obtenerSupabaseAdminEmpresaPorNit(nit)
  // Solo las jornadas de la fecha solicitada; jamás modificar históricos.
  // Se exige ausencia de timestamp_salida y estado Abierto.
  const { data, error } = await supabaseAdmin.from('horarios')
    .update({ estado_registro: 'No Cerrado' })
    .eq('fecha_entrada', fecha)
    .eq('estado_registro', 'Abierto')
    .is('timestamp_salida', null)
    .select('id')
  if (error) throw error
  return data?.length || 0
}

export async function notificarPendientes(nit, fechaHoy) {
  const fechaReporte = fechaAnteriorBogota(fechaHoy)
  const { supabaseAdmin } = await obtenerSupabaseAdminEmpresaPorNit(nit)
  const { data: registros, error } = await supabaseAdmin.from('horarios')
    .select('id,fecha_entrada,hora_entrada,nombre_completo,usuario,rol,placa')
    .eq('estado_registro', 'No Cerrado')
    .eq('fecha_entrada', fechaReporte)
    .order('id', { ascending: true })
    .limit(501)
  if (error) throw error
  if (!registros?.length) return { fechaReporte, pendientes: 0, enviado: false }
  if (registros.length > 500) throw new Error('Más de 500 jornadas en la fecha: requiere envío paginado')

  const master = getMasterSupabase()
  const control = master.from('notificaciones_horarios_diarias')
  // La clave única (nit, fecha de las jornadas) impide enviar dos veces el mismo reporte.
  const { error: bloqueoError } = await control.insert({
    nit, fecha: fechaReporte, estado: 'procesando',
  })
  if (bloqueoError) {
    if (bloqueoError.code === '23505') {
      return { fechaReporte, pendientes: registros.length, enviado: false, duplicado: true }
    }
    throw bloqueoError
  }

  let envioConfirmado = false
  try {
    const detalles = [
      ['Fecha de las jornadas', fechaReporte],
      ['Fecha del reporte', fechaHoy],
      ['Total de jornadas No Cerrado del día anterior', registros.length],
      ...registros.map(j => [
        `Jornada #${j.id}`,
        `${j.fecha_entrada} ${j.hora_entrada || ''} | ${j.nombre_completo || j.usuario || 'Sin nombre'} | ${j.rol || 'Sin rol'} | ${j.placa || 'Sin placa'}`,
      ]),
    ]
    const enviado = await enviarAvisoCorporativo({
      nit,
      asunto: `DATA CEA: ${registros.length} jornada(s) No Cerrado - ${fechaReporte}`,
      detalles,
    })
    if (!enviado) {
      // No hubo envío: se permite un nuevo intento cuando configuren destinatarios.
      const { error: liberacionError } = await master.from('notificaciones_horarios_diarias')
        .delete().eq('nit', nit).eq('fecha', fechaReporte).eq('estado', 'procesando')
      if (liberacionError) throw liberacionError
      return { fechaReporte, pendientes: registros.length, enviado: false, sinDestinatarios: true }
    }
    envioConfirmado = true
    const { error: finError } = await master.from('notificaciones_horarios_diarias')
      .update({ estado: 'enviado', enviado_en: new Date().toISOString() })
      .eq('nit', nit).eq('fecha', fechaReporte)
    if (finError) throw finError
    return { fechaReporte, pendientes: registros.length, enviado: true }
  } catch (error) {
    // Una respuesta SMTP fallida puede ser ambigua. Conservar el control evita
    // reenvíos automáticos duplicados; revisar antes de reintentar manualmente.
    const { error: estadoError } = await master.from('notificaciones_horarios_diarias')
      .update({ estado: 'error' })
      .eq('nit', nit).eq('fecha', fechaReporte)
    if (estadoError) console.error('No fue posible marcar error de notificación', nit, fechaReporte, estadoError)
    console.error('Error enviando reporte de horarios', { nit, fechaReporte, envioConfirmado, mensaje: error.message })
    throw error
  }
}
