import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { obtenerSupabaseAdminEmpresaPorNit } from '@/lib/supabaseEmpresaServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const SECCIONES = ['general', 'licencias', 'estudios', 'experiencia', 'referencias']

async function contexto(request) {
  const cookie = request.cookies.get(process.env.COOKIE_NAME || 'cea_session')?.value
  if (!cookie || !process.env.AUTH_SECRET) throw new Error('NO_AUTORIZADO')
  const { payload } = await jwtVerify(cookie, new TextEncoder().encode(process.env.AUTH_SECRET), { algorithms: ['HS256'] })
  if (!['ADMINISTRATIVO', 'AUXILIAR_ADMINISTRATIVO'].includes(payload.rolOriginal)) throw new Error('NO_AUTORIZADO')
  if (!payload.nitEmpresa) throw new Error('NO_AUTORIZADO')
  const { supabaseAdmin } = await obtenerSupabaseAdminEmpresaPorNit(payload.nitEmpresa)
  return { supabaseAdmin, usuario: payload }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { supabaseAdmin } = await contexto(request)
    const { data, error } = await supabaseAdmin.from('aprobaciones_personal')
      .select('seccion, estado, aprobado_por_nombre, fecha_aprobacion').eq('personal_id', id)
    if (error) throw error
    return NextResponse.json({ status: 'success', aprobaciones: data || [] })
  } catch (error) {
    return NextResponse.json({ status: 'failed', message: error.message === 'NO_AUTORIZADO' ? 'No autorizado.' : 'No fue posible consultar aprobaciones.' }, { status: error.message === 'NO_AUTORIZADO' ? 403 : 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const seccion = String(body.seccion || '')
    if (!SECCIONES.includes(seccion)) return NextResponse.json({ status: 'failed', message: 'Sección inválida.' }, { status: 400 })
    const { supabaseAdmin, usuario } = await contexto(request)
    const { data: persona, error: errorPersona } = await supabaseAdmin.from('personal').select('id, estado_aprobacion, origen_registro, rol_conductor_instructor').eq('id', id).single()
    if (errorPersona || !persona) return NextResponse.json({ status: 'failed', message: 'Expediente no encontrado.' }, { status: 404 })
    if (persona.origen_registro !== 'formulario_publico') return NextResponse.json({ status: 'failed', message: 'Este expediente no requiere este proceso.' }, { status: 400 })
    if (seccion === 'licencias' && !persona.rol_conductor_instructor) return NextResponse.json({ status: 'failed', message: 'Licencias no aplica.' }, { status: 400 })
    const ahora = new Date().toISOString()
    const { data: anterior, error: errorAnterior } = await supabaseAdmin.from('aprobaciones_personal').select('estado').eq('personal_id', id).eq('seccion', seccion).maybeSingle()
    if (errorAnterior) throw errorAnterior
    const { error: errorGuardar } = await supabaseAdmin.from('aprobaciones_personal').upsert({
      personal_id: Number(id), seccion, estado: 'aprobado',
      aprobado_por_nombre: String(usuario.nombreCompleto || usuario.documento || 'Administrador'),
      fecha_aprobacion: ahora, updated_at: ahora
    }, { onConflict: 'personal_id,seccion' })
    if (errorGuardar) throw errorGuardar
    const { error: errorHistorial } = await supabaseAdmin.from('historial_aprobaciones_personal').insert({
      personal_id: Number(id), seccion, estado_anterior: anterior?.estado || 'pendiente', estado_nuevo: 'aprobado',
      realizado_por_nombre: String(usuario.nombreCompleto || usuario.documento || 'Administrador')
    })
    if (errorHistorial) throw errorHistorial
    const { data: aprobadas, error: errorLista } = await supabaseAdmin.from('aprobaciones_personal').select('seccion, estado').eq('personal_id', id)
    if (errorLista) throw errorLista
    const requeridas = SECCIONES.filter(s=>s!=='licencias'||persona.rol_conductor_instructor)
    const completa = requeridas.every(s=>aprobadas.some(a=>a.seccion===s&&a.estado==='aprobado'))
    const { error: errorEstado } = await supabaseAdmin.from('personal').update({ estado_aprobacion: completa ? 'aprobado' : 'en_revision' }).eq('id', id)
    if (errorEstado) throw errorEstado
    return NextResponse.json({ status: 'success', aprobaciones: aprobadas, completo: completa })
  } catch (error) {
    return NextResponse.json({ status: 'failed', message: error.message === 'NO_AUTORIZADO' ? 'No autorizado.' : 'No fue posible aprobar la sección.' }, { status: error.message === 'NO_AUTORIZADO' ? 403 : 500 })
  }
}
