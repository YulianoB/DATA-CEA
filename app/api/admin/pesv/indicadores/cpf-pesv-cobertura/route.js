// app/api/admin/pesv/indicadores/cpf-pesv-cobertura/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
} from '@/lib/supabaseEmpresaServer'

const CODIGO_INDICADOR = 'CPF_PESV_COBERTURA'

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

function ultimoDiaMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate()
}

function fechaIso(anio, mes, dia) {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function resolverPeriodo(anio, tipoPeriodo, numeroPeriodo) {
  const tipo = mayusculas(tipoPeriodo || 'TRIMESTRE')

  if (tipo === 'ANUAL') {
    return {
      anio,
      tipo_periodo: 'ANUAL',
      numero_periodo: null,
      periodo_desde: `${anio}-01-01`,
      periodo_hasta: `${anio}-12-31`,
      acumulativo_desde: `${anio}-01-01`,
      acumulativo_hasta: `${anio}-12-31`,
    }
  }

  if (tipo !== 'TRIMESTRE') {
    throw new Error('CPF_PESV_COBERTURA solamente admite período TRIMESTRE o ANUAL.')
  }

  const trimestre = entero(numeroPeriodo)
  if (![1, 2, 3, 4].includes(trimestre)) {
    throw new Error('Debe indicar un trimestre válido entre 1 y 4.')
  }

  const mesInicio = (trimestre - 1) * 3 + 1
  const mesFin = trimestre * 3

  return {
    anio,
    tipo_periodo: 'TRIMESTRE',
    numero_periodo: trimestre,
    periodo_desde: fechaIso(anio, mesInicio, 1),
    periodo_hasta: fechaIso(anio, mesFin, ultimoDiaMes(anio, mesFin)),
    // El Manual define el porcentaje como medido en forma acumulativa.
    acumulativo_desde: `${anio}-01-01`,
    acumulativo_hasta: fechaIso(anio, mesFin, ultimoDiaMes(anio, mesFin)),
  }
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

function documentoNormalizado(valor) {
  return texto(valor).replace(/\s+/g, '').toUpperCase()
}

function fechaEnRango(fecha, desde, hasta) {
  const f = texto(fecha).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(f) && f >= desde && f <= hasta
}

function colaboradorPerteneceAlPeriodo(persona, desde, hasta) {
  const vinculacion = texto(persona?.fecha_vinculacion).slice(0, 10)
  const retiro = texto(persona?.fecha_retiro).slice(0, 10)

  if (vinculacion && vinculacion > hasta) return false
  if (retiro && retiro < desde) return false

  // Si existen fechas laborales, estas permiten reconstruir el período histórico.
  if (vinculacion || retiro) return true

  // Para registros antiguos sin fechas, se conserva la fuente vigente de personal activo.
  return mayusculas(persona?.estado) === 'ACTIVO'
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

async function obtenerPlan(supabase, anio) {
  const { data, error } = await supabase
    .from('pesv_planes_formacion')
    .select('*')
    .eq('anio', anio)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function obtenerActividades(supabase, planId) {
  if (!planId) return []

  const { data, error } = await supabase
    .from('pesv_plan_formacion_actividades')
    .select('*')
    .eq('plan_formacion_id', planId)

  if (error) throw error
  return Array.isArray(data) ? data : []
}

async function obtenerEjecuciones(supabase, actividadIds) {
  if (!Array.isArray(actividadIds) || actividadIds.length === 0) return []

  const { data, error } = await supabase
    .from('pesv_plan_formacion_ejecuciones')
    .select('*')
    .in('actividad_id', actividadIds)

  if (error) throw error
  return Array.isArray(data) ? data : []
}

async function obtenerReuniones(supabase, reunionIds) {
  if (!Array.isArray(reunionIds) || reunionIds.length === 0) return []

  const { data, error } = await supabase
    .from('reuniones')
    .select('*')
    .in('id', reunionIds)

  if (error) throw error
  return Array.isArray(data) ? data : []
}

async function obtenerAsistencias(supabase, reunionIds) {
  if (!Array.isArray(reunionIds) || reunionIds.length === 0) return []

  const { data, error } = await supabase
    .from('asistencias')
    .select('*')
    .in('id_reunion', reunionIds)

  if (error) throw error
  return Array.isArray(data) ? data : []
}

async function obtenerPersonal(supabase) {
  const { data, error } = await supabase
    .from('personal')
    .select('id, documento, nombres, apellidos, cargo, tipo_personal, fecha_vinculacion, fecha_retiro, estado')

  if (error) throw error
  return Array.isArray(data) ? data : []
}

function construirDetalleCapacitados(asistencias, reunionesPorId, ejecucionesPorReunion, desde, hasta) {
  const mapa = new Map()

  for (const asistencia of asistencias) {
    const reunionId = texto(asistencia?.id_reunion)
    const reunion = reunionesPorId.get(reunionId)
    const ejecucion = ejecucionesPorReunion.get(reunionId)
    const fecha =
      texto(ejecucion?.fecha_ejecucion).slice(0, 10) ||
      texto(reunion?.fecha_programada).slice(0, 10) ||
      texto(asistencia?.timestamp_asistencia).slice(0, 10)

    if (!fechaEnRango(fecha, desde, hasta)) continue

    const documento = documentoNormalizado(asistencia?.documento_usuario)
    if (!documento) continue

    const actual = mapa.get(documento)
    const registro = {
      documento,
      nombre: texto(asistencia?.nombre_usuario),
      rol: texto(asistencia?.rol_usuario),
      ultima_fecha_capacitacion: fecha,
      capacitaciones_asistidas: (actual?.capacitaciones_asistidas || 0) + 1,
    }

    if (!actual || fecha >= actual.ultima_fecha_capacitacion) {
      mapa.set(documento, registro)
    } else {
      mapa.set(documento, {
        ...actual,
        capacitaciones_asistidas: registro.capacitaciones_asistidas,
      })
    }
  }

  return Array.from(mapa.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  )
}

function construirDetalleColaboradores(personal, desde, hasta, documentosCapacitados) {
  return personal
    .filter(persona => colaboradorPerteneceAlPeriodo(persona, desde, hasta))
    .map(persona => {
      const documento = documentoNormalizado(persona?.documento)
      return {
        personal_id: persona?.id ?? null,
        documento,
        nombre: `${texto(persona?.nombres)} ${texto(persona?.apellidos)}`.trim(),
        cargo: texto(persona?.cargo),
        tipo_personal: texto(persona?.tipo_personal),
        fecha_vinculacion: persona?.fecha_vinculacion || null,
        fecha_retiro: persona?.fecha_retiro || null,
        capacitado: documentosCapacitados.has(documento),
      }
    })
    .filter(item => item.documento)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

function calcularCobertura({ personal, asistencias, reuniones, ejecuciones, desde, hasta }) {
  const reunionesPorId = new Map(
    reuniones.map(item => [texto(item?.id), item])
  )

  const ejecucionesPorReunion = new Map(
    ejecuciones
      .filter(item => item?.reunion_id)
      .map(item => [texto(item?.reunion_id), item])
  )

  const detalleCapacitados = construirDetalleCapacitados(
    asistencias,
    reunionesPorId,
    ejecucionesPorReunion,
    desde,
    hasta
  )

  const documentosCapacitados = new Set(
    detalleCapacitados.map(item => item.documento)
  )

  const detalleColaboradores = construirDetalleColaboradores(
    personal,
    desde,
    hasta,
    documentosCapacitados
  )

  const documentosColaboradores = new Set(
    detalleColaboradores.map(item => item.documento)
  )

  // El numerador corresponde a personas únicas capacitadas que hacen parte
  // de la población de colaboradores del período. Una persona que asiste a
  // varias capacitaciones se contabiliza una sola vez para cobertura.
  const capacitadosValidos = detalleCapacitados.filter(item =>
    documentosColaboradores.has(item.documento)
  )

  const numerador = capacitadosValidos.length
  const denominador = documentosColaboradores.size

  return {
    colaboradores_capacitados: numerador,
    total_colaboradores: denominador,
    cobertura: porcentaje(numerador, denominador),
    detalle_capacitados: capacitadosValidos,
    detalle_colaboradores: detalleColaboradores,
  }
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

    let periodo
    try {
      periodo = resolverPeriodo(
        anio,
        searchParams.get('tipo_periodo') || 'TRIMESTRE',
        searchParams.get('numero_periodo')
      )
    } catch (errorPeriodo) {
      return responderError(errorPeriodo?.message || 'El período no es válido.', 400, 'PERIODO_INVALIDO')
    }

    const indicador = await obtenerIndicador(supabase)
    const configuracion = indicador
      ? await obtenerConfiguracion(supabase, indicador.id, anio)
      : null

    const plan = await obtenerPlan(supabase, anio)
    const actividades = plan ? await obtenerActividades(supabase, plan.id) : []
    const actividadIds = actividades.map(item => item?.id).filter(Boolean)
    const ejecuciones = await obtenerEjecuciones(supabase, actividadIds)
    const reunionIds = Array.from(
      new Set(ejecuciones.map(item => texto(item?.reunion_id)).filter(Boolean))
    )
    const [reuniones, asistencias, personal] = await Promise.all([
      obtenerReuniones(supabase, reunionIds),
      obtenerAsistencias(supabase, reunionIds),
      obtenerPersonal(supabase),
    ])

    const advertencias = []
    if (!plan) {
      advertencias.push(`No existe un Plan Anual de Formación en Seguridad Vial para la vigencia ${anio}.`)
    }
    if (personal.length === 0) {
      advertencias.push('No existen colaboradores registrados para determinar la población del indicador.')
    }

    const trimestres = [1, 2, 3, 4].map(trimestre => {
      const p = resolverPeriodo(anio, 'TRIMESTRE', trimestre)
      const resultado = calcularCobertura({
        personal,
        asistencias,
        reuniones,
        ejecuciones,
        desde: p.acumulativo_desde,
        hasta: p.acumulativo_hasta,
      })

      return {
        trimestre,
        nombre: `Trimestre ${trimestre}`,
        periodo_desde: p.periodo_desde,
        periodo_hasta: p.periodo_hasta,
        acumulativo_desde: p.acumulativo_desde,
        acumulativo_hasta: p.acumulativo_hasta,
        colaboradores_capacitados: resultado.colaboradores_capacitados,
        total_colaboradores: resultado.total_colaboradores,
        cobertura: resultado.cobertura,
        valor_resultado: resultado.cobertura,
      }
    })

    const acumuladoAnual = calcularCobertura({
      personal,
      asistencias,
      reuniones,
      ejecuciones,
      desde: `${anio}-01-01`,
      hasta: `${anio}-12-31`,
    })

    const resultadoPeriodo = calcularCobertura({
      personal,
      asistencias,
      reuniones,
      ejecuciones,
      desde: periodo.acumulativo_desde,
      hasta: periodo.acumulativo_hasta,
    })

    if (resultadoPeriodo.total_colaboradores === 0) {
      advertencias.push('El total de colaboradores del período es cero; no es posible calcular el porcentaje de cobertura.')
    }

    const lineaBase = numero(configuracion?.linea_base)
    const operadorMeta = texto(configuracion?.operador_meta)
    const valorMeta = numero(configuracion?.valor_meta)
    const unidadMeta = texto(configuracion?.unidad_meta) || texto(indicador?.unidad) || 'PORCENTAJE'
    const cumpleMeta = valorCumpleMeta(resultadoPeriodo.cobertura, operadorMeta, valorMeta)

    const evaluacion = {
      linea_base: lineaBase,
      operador_meta: operadorMeta || null,
      valor_meta: valorMeta,
      unidad_meta: unidadMeta,
      cumple_meta: cumpleMeta,
    }

    const acumulado = {
      colaboradores_capacitados: acumuladoAnual.colaboradores_capacitados,
      total_colaboradores: acumuladoAnual.total_colaboradores,
      cobertura: acumuladoAnual.cobertura,
      valor_resultado: acumuladoAnual.cobertura,
    }

    const resultados = {
      colaboradores_capacitados: resultadoPeriodo.colaboradores_capacitados,
      total_colaboradores: resultadoPeriodo.total_colaboradores,
      cobertura_plan_formacion: resultadoPeriodo.cobertura,
      cobertura: resultadoPeriodo.cobertura,
    }

    const calculo = {
      indicador_codigo: CODIGO_INDICADOR,
      indicador_nombre: indicador?.nombre || 'Cobertura Plan de Formación en Seguridad Vial',
      anio,
      periodo,
      numerador: resultadoPeriodo.colaboradores_capacitados,
      denominador: resultadoPeriodo.total_colaboradores,
      valor_resultado: resultadoPeriodo.cobertura,
      unidad_resultado: 'PORCENTAJE',
      origen_calculo: 'AUTOMATICO',
      resultados,
      resumen_trimestral: trimestres,
      trimestres,
      acumulado_anual: acumulado,
      resumen_anual: acumulado,
      detalle_capacitados: resultadoPeriodo.detalle_capacitados,
      detalle_colaboradores: resultadoPeriodo.detalle_colaboradores,
      advertencias,
      cumple_meta: cumpleMeta,
      datos_calculo: {
        codigo: CODIGO_INDICADOR,
        periodo,
        resultados,
        resumen_trimestral: trimestres,
        acumulado_anual: acumulado,
        detalle_capacitados: resultadoPeriodo.detalle_capacitados,
        detalle_colaboradores: resultadoPeriodo.detalle_colaboradores,
        advertencias,
        criterio_conteo: 'PERSONAS_UNICAS_POR_DOCUMENTO',
        medicion_acumulativa: true,
      },
    }

    return NextResponse.json({
      ok: true,
      status: 'success',
      nit,
      empresa,
      indicador,
      configuracion,
      plan_formacion: plan,
      periodo,
      evaluacion,
      calculo,
    })
  } catch (error) {
    console.error('Error calculando CPF_PESV_COBERTURA:', error)
    return responderError(
      error?.message || 'No fue posible calcular el indicador CPF_PESV_COBERTURA.',
      Number(error?.status) || 500,
      error?.code || 'CPF_PESV_COBERTURA_ERROR'
    )
  }
}
