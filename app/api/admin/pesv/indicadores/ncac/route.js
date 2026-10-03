// app/api/admin/pesv/indicadores/ncac/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
} from '@/lib/supabaseEmpresaServer'

const CODIGO_INDICADOR = 'NCAC'

function texto(valor) {
  return String(valor ?? '').trim()
}

function mayusculas(valor) {
  return texto(valor).toUpperCase()
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function entero(valor) {
  const n = numero(valor)
  return n === null ? null : Math.trunc(n)
}

function redondear(valor, decimales = 2) {
  const n = numero(valor)
  if (n === null) return null
  const factor = 10 ** decimales
  return Math.round((n + Number.EPSILON) * factor) / factor
}

function porcentaje(numerador, denominador) {
  const n = numero(numerador)
  const d = numero(denominador)
  if (n === null || d === null || d <= 0) return null
  return redondear((n / d) * 100, 2)
}

function responderError(message, status = 400, code = 'ERROR') {
  return NextResponse.json(
    { ok: false, status: 'failed', code, message },
    { status }
  )
}

function valorCumpleMeta(valor, operador, meta) {
  const resultado = numero(valor)
  const objetivo = numero(meta)
  const op = texto(operador)
  if (resultado === null || objetivo === null) return null
  if (op === '>=') return resultado >= objetivo
  if (op === '<=') return resultado <= objetivo
  if (op === '>') return resultado > objetivo
  if (op === '<') return resultado < objetivo
  if (op === '=') return resultado === objetivo
  return null
}

async function obtenerIndicador(supabase) {
  const { data, error } = await supabase
    .from('pesv_indicadores_catalogo')
    .select('*')
    .eq('codigo', CODIGO_INDICADOR)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function obtenerConfiguracion(supabase, indicadorId, anio) {
  if (!indicadorId) return null

  const { data, error } = await supabase
    .from('pesv_indicadores_configuracion')
    .select('*')
    .eq('indicador_id', indicadorId)
    .eq('anio', anio)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function obtenerAuditorias(supabase, anio) {
  const { data, error } = await supabase
    .from('pesv_auditorias')
    .select('id, anio, codigo, nombre, tipo_auditoria, fecha_ejecucion, estado')
    .eq('anio', anio)
    .order('codigo', { ascending: true })

  if (error) throw error
  return Array.isArray(data) ? data : []
}

async function obtenerHallazgos(supabase, auditoriaIds) {
  if (!Array.isArray(auditoriaIds) || auditoriaIds.length === 0) return []

  const { data, error } = await supabase
    .from('pesv_auditoria_hallazgos')
    .select('id, auditoria_id, numero, codigo, fecha_hallazgo, tipo_hallazgo, descripcion, causa, consecuencia, estado, fecha_cierre, verificacion_cierre, responsable_nombre')
    .in('auditoria_id', auditoriaIds)
    .eq('tipo_hallazgo', 'NO_CONFORMIDAD')
    .order('fecha_hallazgo', { ascending: true })
    .order('numero', { ascending: true })

  if (error) throw error
  return Array.isArray(data) ? data : []
}

async function obtenerAcciones(supabase, hallazgoIds) {
  if (!Array.isArray(hallazgoIds) || hallazgoIds.length === 0) return []

  const { data, error } = await supabase
    .from('pesv_auditoria_acciones')
    .select('id, hallazgo_id, numero, tipo_accion, descripcion, estado, fecha_compromiso, fecha_implementacion, fecha_cierre, responsable_nombre')
    .in('hallazgo_id', hallazgoIds)
    .order('numero', { ascending: true })

  if (error) throw error
  return Array.isArray(data) ? data : []
}

export async function GET(request) {
  try {
    const { supabaseAdmin, nit, empresa } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(request)

    const supabase = supabaseAdmin
    const { searchParams } = new URL(request.url)
    const anio = entero(searchParams.get('anio'))

    if (!anio || anio < 2022 || anio > 2100) {
      return responderError('Debe indicar una vigencia válida.', 400, 'ANIO_INVALIDO')
    }

    const indicador = await obtenerIndicador(supabase)
    const configuracion = indicador
      ? await obtenerConfiguracion(supabase, indicador.id, anio)
      : null

    const auditorias = await obtenerAuditorias(supabase, anio)
    const auditoriaIds = auditorias.map(item => item?.id).filter(Boolean)
    const hallazgos = await obtenerHallazgos(supabase, auditoriaIds)
    const hallazgoIds = hallazgos.map(item => item?.id).filter(Boolean)
    const acciones = await obtenerAcciones(supabase, hallazgoIds)

    const auditoriasPorId = new Map(
      auditorias.map(item => [Number(item.id), item])
    )

    const accionesPorHallazgo = new Map()
    for (const accion of acciones) {
      const id = Number(accion?.hallazgo_id)
      if (!accionesPorHallazgo.has(id)) accionesPorHallazgo.set(id, [])
      accionesPorHallazgo.get(id).push(accion)
    }

    // Variable 40 del Manual: No conformidades identificadas y analizadas.
    // En DATA-CEA el análisis del hallazgo se registra en el campo "causa".
    const identificadasAnalizadas = hallazgos.filter(item => texto(item?.causa))

    // Variable 41 del Manual: No conformidades gestionadas y cerradas.
    // El estado CERRADO es el estado final del flujo del hallazgo en el módulo
    // de Auditorías / No Conformidades. Se exige además fecha de cierre.
    const gestionadasCerradas = identificadasAnalizadas.filter(
      item =>
        mayusculas(item?.estado) === 'CERRADO' &&
        Boolean(texto(item?.fecha_cierre))
    )

    const numerador = gestionadasCerradas.length
    const denominador = identificadasAnalizadas.length
    const valorResultado = porcentaje(numerador, denominador)

    const detalle = hallazgos.map(item => {
      const auditoria = auditoriasPorId.get(Number(item?.auditoria_id)) || null
      const accionesHallazgo = accionesPorHallazgo.get(Number(item?.id)) || []
      const analizada = Boolean(texto(item?.causa))
      const cerrada =
        analizada &&
        mayusculas(item?.estado) === 'CERRADO' &&
        Boolean(texto(item?.fecha_cierre))

      return {
        id: item?.id,
        auditoria_id: item?.auditoria_id,
        auditoria_codigo: auditoria?.codigo || null,
        auditoria_nombre: auditoria?.nombre || null,
        numero: item?.numero,
        codigo: item?.codigo || null,
        fecha_hallazgo: item?.fecha_hallazgo || null,
        descripcion: item?.descripcion || null,
        responsable_nombre: item?.responsable_nombre || null,
        estado: item?.estado || null,
        fecha_cierre: item?.fecha_cierre || null,
        analizada,
        gestionada_cerrada: cerrada,
        total_acciones: accionesHallazgo.length,
        acciones_cerradas: accionesHallazgo.filter(
          accion => mayusculas(accion?.estado) === 'CERRADA'
        ).length,
      }
    })

    const advertencias = []
    if (auditorias.length === 0) {
      advertencias.push(`No existen auditorías PESV registradas para la vigencia ${anio}.`)
    }
    if (hallazgos.length > 0 && identificadasAnalizadas.length < hallazgos.length) {
      advertencias.push(
        `${hallazgos.length - identificadasAnalizadas.length} no conformidad(es) identificada(s) aún no tienen análisis/causa registrado y no integran la Variable 40.`
      )
    }
    if (denominador === 0) {
      advertencias.push('No existen no conformidades identificadas y analizadas para calcular NCAC en la vigencia.')
    }

    const lineaBase = numero(configuracion?.linea_base)
    const operadorMeta = texto(configuracion?.operador_meta)
    const valorMeta = numero(configuracion?.valor_meta)
    const unidadMeta = texto(configuracion?.unidad_meta) || texto(indicador?.unidad) || 'PORCENTAJE'
    const cumpleMeta = valorCumpleMeta(valorResultado, operadorMeta, valorMeta)

    const periodo = {
      anio,
      tipo_periodo: 'ANUAL',
      numero_periodo: null,
      periodo_desde: `${anio}-01-01`,
      periodo_hasta: `${anio}-12-31`,
    }

    const resultados = {
      no_conformidades_identificadas_analizadas: denominador,
      no_conformidades_gestionadas_cerradas: numerador,
      ncac: valorResultado,
    }

    const evaluacion = {
      linea_base: lineaBase,
      operador_meta: operadorMeta || null,
      valor_meta: valorMeta,
      unidad_meta: unidadMeta,
      cumple_meta: cumpleMeta,
    }

    const calculo = {
      indicador_codigo: CODIGO_INDICADOR,
      indicador_nombre: indicador?.nombre || 'No conformidades de auditoría cerradas',
      anio,
      periodo,
      numerador,
      denominador,
      valor_resultado: valorResultado,
      unidad_resultado: 'PORCENTAJE',
      origen_calculo: 'AUTOMATICO',
      resultados,
      detalle_no_conformidades: detalle,
      advertencias,
      cumple_meta: cumpleMeta,
      datos_calculo: {
        codigo: CODIGO_INDICADOR,
        periodo,
        resultados,
        detalle_no_conformidades: detalle,
        advertencias,
        criterio_denominador: 'NO_CONFORMIDAD_CON_ANALISIS_CAUSA',
        criterio_numerador: 'DENOMINADOR_CON_ESTADO_CERRADO_Y_FECHA_CIERRE',
        periodicidad: 'ANUAL',
      },
    }

    return NextResponse.json({
      ok: true,
      status: 'success',
      nit,
      empresa,
      indicador,
      configuracion,
      periodo,
      evaluacion,
      calculo,
    })
  } catch (error) {
    console.error('Error calculando NCAC:', error)
    return responderError(
      error?.message || 'No fue posible calcular el indicador NCAC.',
      Number(error?.status) || 500,
      error?.code || 'NCAC_ERROR'
    )
  }
}
