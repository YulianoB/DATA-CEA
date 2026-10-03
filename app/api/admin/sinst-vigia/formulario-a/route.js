// app/api/admin/sinst-vigia/formulario-a/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

export const dynamic = 'force-dynamic'

function numero(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function redondear(valor, decimales = 1) {
  const factor = 10 ** decimales
  return Math.round((numero(valor) + Number.EPSILON) * factor) / factor
}

function rangoTrimestre(anio, trimestre) {
  const rangos = {
    1: [`${anio}-01-01`, `${anio}-03-31`],
    2: [`${anio}-04-01`, `${anio}-06-30`],
    3: [`${anio}-07-01`, `${anio}-09-30`],
    4: [`${anio}-10-01`, `${anio}-12-31`],
  }

  return rangos[trimestre]
}

function resumirTrimestre(siniestros, horarios) {
  let fatalidades = 0
  let heridosGraves = 0
  let heridosLeves = 0
  let choquesSimples = 0

  let costoDirectoFatalidades = 0
  let costoIndirectoFatalidades = 0
  let costoDirectoHeridosGraves = 0
  let costoIndirectoHeridosGraves = 0
  let costoDirectoHeridosLeves = 0
  let costoIndirectoHeridosLeves = 0
  let costoDirectoChoquesSimples = 0
  let costoIndirectoChoquesSimples = 0

  for (const item of siniestros || []) {
    const fatales = Math.max(numero(item?.fatalidades), 0)
    const graves = Math.max(numero(item?.heridos_graves), 0)
    const leves = Math.max(numero(item?.heridos_leves), 0)

    fatalidades += fatales
    heridosGraves += graves
    heridosLeves += leves

    if (fatales === 0 && graves === 0 && leves === 0) {
      choquesSimples += 1
    }

    costoDirectoFatalidades += numero(item?.costo_dir_fatalidad)
    costoIndirectoFatalidades += numero(item?.costo_indi_fatalidad)
    costoDirectoHeridosGraves += numero(item?.costo_dir_heridos_g)
    costoIndirectoHeridosGraves += numero(item?.costo_indi_heridos_g)
    costoDirectoHeridosLeves += numero(item?.costo_dir_heridos_l)
    costoIndirectoHeridosLeves += numero(item?.costo_indi_heridos_l)
    costoDirectoChoquesSimples += numero(item?.costo_dir_choque_simple)
    costoIndirectoChoquesSimples += numero(item?.costo_indi_choque_simple)
  }

  const kilometrosRecorridos = (horarios || []).reduce((total, item) => {
    const inicial = Number(item?.km_inicial)
    const final = Number(item?.km_final)

    if (
      !Number.isFinite(inicial) ||
      !Number.isFinite(final) ||
      final < inicial
    ) {
      return total
    }

    return total + (final - inicial)
  }, 0)

  return {
    '1.1': fatalidades,
    '1.2': heridosGraves,
    '1.3': heridosLeves,
    '1.4': choquesSimples,
    '1.5': redondear(kilometrosRecorridos, 1),
    '2.1': redondear(costoDirectoFatalidades, 2),
    '2.2': redondear(costoIndirectoFatalidades, 2),
    '2.3': redondear(costoDirectoHeridosGraves, 2),
    '2.4': redondear(costoIndirectoHeridosGraves, 2),
    '2.5': redondear(costoDirectoHeridosLeves, 2),
    '2.6': redondear(costoIndirectoHeridosLeves, 2),
    '2.7': redondear(costoDirectoChoquesSimples, 2),
    '2.8': redondear(costoIndirectoChoquesSimples, 2),
  }
}

async function consultarTrimestre(supabase, anio, trimestre) {
  const [desde, hasta] = rangoTrimestre(anio, trimestre)

  const [resultadoSiniestros, resultadoHorarios] = await Promise.all([
    supabase
      .from('siniestros')
      .select(`
        id,
        fecha_siniestro,
        fatalidades,
        heridos_graves,
        heridos_leves,
        costo_dir_choque_simple,
        costo_indi_choque_simple,
        costo_dir_heridos_l,
        costo_indi_heridos_l,
        costo_dir_heridos_g,
        costo_indi_heridos_g,
        costo_dir_fatalidad,
        costo_indi_fatalidad
      `)
      .gte('fecha_siniestro', desde)
      .lte('fecha_siniestro', hasta),

    supabase
      .from('horarios')
      .select('id,fecha_entrada,placa,km_inicial,km_final')
      .gte('fecha_entrada', desde)
      .lte('fecha_entrada', hasta),
  ])

  if (resultadoSiniestros.error) {
    throw resultadoSiniestros.error
  }

  if (resultadoHorarios.error) {
    throw resultadoHorarios.error
  }

  return resumirTrimestre(
    resultadoSiniestros.data || [],
    resultadoHorarios.data || []
  )
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    const anio = Number(searchParams.get('anio'))

    if (!Number.isInteger(anio) || anio < 2022 || anio > 2100) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'La vigencia consultada no es válida.',
        },
        { status: 400 }
      )
    }

    const resultadoEmpresa =
      await obtenerSupabaseAdminEmpresaDesdeRequest(request)

    const supabase = resultadoEmpresa.supabaseAdmin
    const empresa = resultadoEmpresa.empresa

    const resultados = await Promise.all(
      [1, 2, 3, 4].map((trimestre) =>
        consultarTrimestre(supabase, anio, trimestre)
      )
    )

    return NextResponse.json({
      status: 'success',
      anio,
      formulario: 'A',
      periodicidad: 'TRIMESTRAL',
      trimestres: {
        1: resultados[0],
        2: resultados[1],
        3: resultados[2],
        4: resultados[3],
      },
      empresa: {
        nit: empresa?.nit || null,
        nombre:
          empresa?.nombre ||
          empresa?.razon_social ||
          empresa?.nombre_empresa ||
          null,
      },
    })
  } catch (error) {
    console.error(
      'Error GET /api/admin/sinst-vigia/formulario-a:',
      error
    )

    const respuesta = respuestaErrorEmpresa(error)

    return NextResponse.json(
      respuesta.body,
      {
        status: respuesta.status,
      }
    )
  }
}
