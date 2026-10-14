import { NextResponse } from 'next/server'
import { getMasterSupabase } from '@/lib/supabaseMaster'
import { autorizadoMaster, origenValido } from '@/lib/masterApiSecurity'
import { CAMPOS_EMPRESA } from '@/app/api/master/empresas/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const responder = (message, status) => NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } })
const idValido = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value))

export async function GET(request, context) {
  if (!await autorizadoMaster(request)) return responder('Acceso no autorizado.', 401)
  const { id } = await context.params
  if (!idValido(id)) return responder('Empresa inválida.', 400)
  const { data, error } = await getMasterSupabase().from('empresas')
    .select(CAMPOS_EMPRESA.join(',')).eq('id', Number(id)).maybeSingle()
  if (error) return responder('No fue posible consultar la empresa.', 500)
  if (!data) return responder('Empresa no encontrada.', 404)
  return NextResponse.json({ empresa: data }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(request, context) {
  if (!await autorizadoMaster(request)) return responder('Acceso no autorizado.', 401)
  if (!origenValido(request)) return responder('Origen no autorizado.', 403)
  const { id } = await context.params
  if (!idValido(id)) return responder('Empresa inválida.', 400)
  let body
  try { body = await request.json() } catch { return responder('Solicitud inválida.', 400) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return responder('Datos inválidos.', 400)
  const permitidos = CAMPOS_EMPRESA.filter(k => k !== 'nit' && k !== 'codigo')
  const cambios = {}
  for (const campo of permitidos) {
    if (!Object.prototype.hasOwnProperty.call(body, campo)) continue
    if (typeof body[campo] !== 'string' || body[campo].length > 5000) return responder('Valor inválido: ' + campo, 400)
    cambios[campo] = body[campo].trim()
  }
  if (!Object.keys(cambios).length) return responder('No hay cambios para guardar.', 400)
  if (cambios.nombre !== undefined && !cambios.nombre) return responder('El nombre es obligatorio.', 400)
  if (cambios.nivel_cea !== undefined && !['NIVEL I','NIVEL II','NIVEL III'].includes(cambios.nivel_cea)) return responder('Nivel inválido.', 400)
  if (cambios.estado !== undefined && !['activo','inactivo'].includes(cambios.estado)) return responder('Estado inválido.', 400)
  if (cambios.supabase_url !== undefined) {
    try { const u = new URL(cambios.supabase_url); if (u.protocol !== 'https:' || !u.hostname.endsWith('.supabase.co')) throw Error() }
    catch { return responder('URL Supabase inválida.', 400) }
  }
  if (cambios.supabase_anon_key !== undefined && !cambios.supabase_anon_key) return responder('La clave pública es obligatoria.', 400)
  const { data, error } = await getMasterSupabase().from('empresas').update({ ...cambios, updated_at: new Date().toISOString() }).eq('id', Number(id)).select('id').maybeSingle()
  if (error) return responder('No fue posible actualizar la empresa.', 500)
  if (!data) return responder('Empresa no encontrada.', 404)
  return NextResponse.json({ ok: true })
}
