import { NextResponse } from 'next/server'
import { getMasterSupabase } from '@/lib/supabaseMaster'
import { autorizadoMaster, origenValido } from '@/lib/masterApiSecurity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const CAMPOS_EMPRESA = [
  'nit', 'codigo', 'nombre', 'razon_social', 'nivel_cea', 'direccion',
  'ciudad', 'departamento', 'telefono', 'email_principal',
  'representante_legal', 'documento_representante', 'supabase_url',
  'supabase_anon_key', 'correos_notificacion', 'correos_mantenimiento',
  'correos_preoperacional', 'correos_siniestros', 'correos_vencimientos',
  'logo_url', 'observaciones', 'estado',
]

function respuesta(message, status) {
  return NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

function validar(body, nuevo = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Datos inválidos.'
  const required = ['nit', 'codigo', 'nombre', 'nivel_cea', 'supabase_url', 'supabase_anon_key']
  if (nuevo && required.some(k => !String(body[k] ?? '').trim())) return 'Completa los campos obligatorios.'
  if (body.nivel_cea !== undefined && !['NIVEL I', 'NIVEL II', 'NIVEL III'].includes(body.nivel_cea)) return 'Nivel de CEA inválido.'
  if (body.estado !== undefined && !['activo', 'inactivo'].includes(body.estado)) return 'Estado inválido.'
  if (body.supabase_url !== undefined) {
    try {
      const u = new URL(body.supabase_url)
      if (u.protocol !== 'https:' || !u.hostname.endsWith('.supabase.co')) return 'La URL debe corresponder a un proyecto Supabase HTTPS.'
    } catch { return 'URL de Supabase inválida.' }
  }
  for (const campo of CAMPOS_EMPRESA) {
    if (body[campo] !== undefined && body[campo] !== null && typeof body[campo] !== 'string') return 'Formato inválido: ' + campo
    if (typeof body[campo] === 'string' && body[campo].length > 5000) return 'Texto demasiado largo: ' + campo
  }
  return null
}

export async function GET(request) {
  if (!await autorizadoMaster(request)) return respuesta('Acceso no autorizado.', 401)
  try {
    const { data, error } = await getMasterSupabase().from('empresas')
      .select('id,nit,codigo,nombre,razon_social,nivel_cea,estado,supabase_url,supabase_service_role_secret_id,ciudad,departamento,email_principal')
      .order('nombre')
    if (error) throw error
    return NextResponse.json({
      empresas: (data || []).map(({ supabase_service_role_secret_id, ...empresa }) => ({
        ...empresa, clave_configurada: Boolean(supabase_service_role_secret_id),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return respuesta('No fue posible consultar las empresas.', 500) }
}

export async function POST(request) {
  if (!await autorizadoMaster(request)) return respuesta('Acceso no autorizado.', 401)
  if (!origenValido(request)) return respuesta('Origen no autorizado.', 403)
  try {
    const body = await request.json()
    const errorValidacion = validar(body, true)
    if (errorValidacion) return respuesta(errorValidacion, 400)
    const valores = Object.fromEntries(CAMPOS_EMPRESA.filter(k => body[k] !== undefined).map(k => [k, typeof body[k] === 'string' ? body[k].trim() : body[k]]))
    valores.estado ||= 'activo'
    const { data, error } = await getMasterSupabase().from('empresas').insert(valores).select('id').single()
    if (error) {
      if (error.code === '23505') return respuesta('Ya existe una empresa con ese NIT o código.', 409)
      return respuesta('No fue posible registrar la empresa. Revisa los datos ingresados.', 500)
    }
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
  } catch { return respuesta('Solicitud inválida.', 400) }
}
