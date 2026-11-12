// app/api/catalogos/route.js
import { NextResponse } from 'next/server'
import { obtenerContextoCEA, respuestaErrorAutorizacionCEA } from '@/lib/autorizacionCEA'

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
  // La búsqueda de lugar de expedición puede abarcar todo Colombia.
  // No implica que se haya confirmado la existencia de sede de Registraduría.
  const buscarMunicipio = catalogo === 'municipios' ? (url.searchParams.get('buscar') || '').trim() : ''
  if (catalogo === 'municipios' && !buscarMunicipio && (!departamentoId || !/^\d+$/.test(departamentoId) || Number(departamentoId) < 1)) {
    return NextResponse.json({ status: 'failed', message: 'Seleccione un departamento válido.' }, { status: 400 })
  }

  try {
    // El CEA se determina por la sesión; el NIT del navegador solo se contrasta.
    const { supabaseAdmin } = await obtenerContextoCEA(request, {
      rolesPermitidos: [
        'ADMINISTRATIVO',
        'AUXILIAR_ADMINISTRATIVO',
        'INSTRUCTOR_TEORIA',
        'INSTRUCTOR_PRACTICA',
      ],
    })
    let consulta = supabaseAdmin.from(configuracion.tabla)
      .select(configuracion.columnas)
      .eq('activo', true)
      .order('nombre', { ascending: true })
    if (catalogo === 'municipios') {
      if (buscarMunicipio) {
        if (buscarMunicipio.length < 2 || buscarMunicipio.length > 80) {
          return NextResponse.json({ status: 'failed', message: 'Escriba al menos dos caracteres.' }, { status: 400 })
        }
        // Permite buscar sin tildes (BOGOTA -> BOGOTÁ) sin modificar
        // los nombres oficiales almacenados en public.municipios.
        const termino = buscarMunicipio.replace(/[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ\s-]/g, '').trim()
        const acentos = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' }
        const variantes = new Set([termino])
        for (let i = 0; i < termino.length; i++) {
          const acento = acentos[termino[i].toLowerCase()]
          if (acento) {
            variantes.add(termino.slice(0, i) + (termino[i] === termino[i].toUpperCase() ? acento.toUpperCase() : acento) + termino.slice(i + 1))
          }
        }
        consulta = consulta.or([...variantes].map(nombre => `nombre.ilike.%${nombre}%`).join(',')).limit(60)
      } else {
        consulta = consulta.eq('departamento_id', Number(departamentoId))
      }
    }
    const { data, error } = await consulta
    if (error) {
      console.error('Error consultando catálogo:', catalogo, error)
      return NextResponse.json({ status: 'failed', message: 'No fue posible consultar el catálogo.' }, { status: 500 })
    }
    return NextResponse.json({ status: 'success', data: data || [] })
  } catch (error) {
    return respuestaErrorAutorizacionCEA(error)
  }
}
