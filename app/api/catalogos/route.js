// app/api/catalogos/route.js
import { NextResponse } from 'next/server'
import { obtenerSupabaseEmpresaDesdeRequest, respuestaErrorEmpresa } from '@/lib/supabaseEmpresaServer'

const CATALOGOS = Object.freeze({
  departamentos: { tabla: 'departamentos', columnas: 'id,nombre,codigo_dane' },
  municipios: { tabla: 'municipios', columnas: 'id,nombre,departamento_id,codigo_dane' },
  eps: { tabla: 'eps', columnas: 'id,nombre,codigo_oficial' },
  arl: { tabla: 'arl', columnas: 'id,nombre,codigo_oficial' },
  fondos_pensiones: { tabla: 'fondos_pensiones', columnas: 'id,nombre,codigo_oficial' },
})

export async function GET(request) {
  const url = new URL(request.url)
  const catalogo = url.searchParams.get('catalogo') || ''
  const configuracion = Object.prototype.hasOwnProperty.call(CATALOGOS, catalogo)
    ? CATALOGOS[catalogo]
    : null

  if (!configuracion) {
    return NextResponse.json({ status: 'failed', message: 'Catálogo no permitido.' }, { status: 400 })
  }

  const departamentoId = url.searchParams.get('departamento_id')
  if (catalogo === 'municipios' && (!departamentoId || !/^\d+$/.test(departamentoId) || Number(departamentoId) < 1)) {
    return NextResponse.json({ status: 'failed', message: 'Seleccione un departamento válido.' }, { status: 400 })
  }

  try {
    // El helper existente resuelve la base empresarial a partir del NIT del request.
    const { supabase } = await obtenerSupabaseEmpresaDesdeRequest(request)
    let consulta = supabase.from(configuracion.tabla)
      .select(configuracion.columnas)
      .eq('activo', true)
      .order('nombre', { ascending: true })
    if (catalogo === 'municipios') {
      consulta = consulta.eq('departamento_id', Number(departamentoId))
    }
    const { data, error } = await consulta
    if (error) {
      console.error('Error consultando catálogo:', catalogo, error)
      return NextResponse.json({ status: 'failed', message: 'No fue posible consultar el catálogo.' }, { status: 500 })
    }
    return NextResponse.json({ status: 'success', data: data || [] })
  } catch (error) {
    const respuesta = respuestaErrorEmpresa(error)
    return NextResponse.json(respuesta.body, { status: respuesta.status })
  }
}
