import { NextResponse } from 'next/server'
import { resolverFormularioPersonal, ErrorFormularioPersonal } from '@/lib/formularioPersonalPublicoServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CATALOGOS = Object.freeze({
  departamentos: 'id,nombre,codigo_dane',
  municipios: 'id,nombre,departamento_id,codigo_dane',
  eps: 'id,nombre,codigo_oficial',
  arl: 'id,nombre,codigo_oficial',
  fondos_pensiones: 'id,nombre,codigo_oficial',
})

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams
    const catalogo = params.get('catalogo') || ''
    if (!Object.prototype.hasOwnProperty.call(CATALOGOS, catalogo)) {
      return NextResponse.json({ status: 'failed', message: 'Catálogo no permitido.' }, { status: 400 })
    }
    const departamentoId = params.get('departamento_id')
    if (catalogo === 'municipios' && (!departamentoId || !/^\d+$/.test(departamentoId) || Number(departamentoId) < 1)) {
      return NextResponse.json({ status: 'failed', message: 'Seleccione un departamento válido.' }, { status: 400 })
    }
    const { supabaseAdmin } = await resolverFormularioPersonal(params.get('cea'), params.get('formulario'))
    let query = supabaseAdmin.from(catalogo).select(CATALOGOS[catalogo]).eq('activo', true).order('nombre')
    if (catalogo === 'municipios') query = query.eq('departamento_id', Number(departamentoId))
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ status: 'success', data: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const status = error instanceof ErrorFormularioPersonal ? error.status : 500
    return NextResponse.json({ status: 'failed', message: 'No fue posible consultar el catálogo.' }, { status })
  }
}
