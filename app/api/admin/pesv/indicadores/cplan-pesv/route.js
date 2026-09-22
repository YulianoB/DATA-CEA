// app/api/admin/pesv/indicadores/cplan-pesv/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

const CODIGO_INDICADOR = 'CPLAN_PESV'
const UNIDAD_RESULTADO = 'PORCENTAJE'
const OPERADORES_META = ['>=', '<=', '=', '>', '<']

function texto(valor) {
  return String(valor ?? '').trim()
}

function mayusculas(valor) {
  return texto(valor).toUpperCase()
}

function numero(valor) {
  if (valor === null || valor === undefined || texto(valor) === '') return null
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

function crearError(message, status = 400, code = 'CPLAN_PESV_ERROR') {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function respuestaError(error) {
  const respuesta = respuestaErrorEmpresa(error)
  return NextResponse.json(
    { ok: false, ...respuesta.body },
    { status: respuesta.status }
  )
}

function nombreEmpresa(empresa) {
  return texto(
    empresa?.nombre ||
    empresa?.nombre_empresa ||
    empresa?.razon_social
  )
}

function validarAnio(valor) {
  const anio = entero(valor)
  if (anio === null || anio < 2022 || anio > 2100) {
    throw crearError('El año consultado no es válido.')
  }
  return anio
}

function ultimoDiaMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10)
}

function trimestreActual() {
  return Math.ceil((new Date().getMonth() + 1) / 3)
}

function construirPeriodo(anio, tipoPeriodo, numeroPeriodo) {
  const tipo = mayusculas(tipoPeriodo) || 'TRIMESTRE'

  if (tipo === 'ANUAL') {
    return {
      anio,
      tipo_periodo: 'ANUAL',
      numero_periodo: null,
      periodo_desde: `${anio}-01-01`,
      periodo_hasta: `${anio}-12-31`,
      fecha_corte: `${anio}-12-31`,
      trimestres_incluidos: [1, 2, 3, 4],
    }
  }

  if (tipo !== 'TRIMESTRE') {
    throw crearError('CPLAN_PESV admite mediciones TRIMESTRALES y ANUALES.')
  }

  const trimestre = entero(numeroPeriodo) ?? trimestreActual()
  if (trimestre < 1 || trimestre > 4) {
    throw crearError('El número de trimestre debe estar entre 1 y 4.')
  }

  const mesInicio = (trimestre - 1) * 3 + 1
  const mesFin = trimestre * 3

  return {
    anio,
    tipo_periodo: 'TRIMESTRE',
    numero_periodo: trimestre,
    periodo_desde: `${anio}-${String(mesInicio).padStart(2, '0')}-01`,
    periodo_hasta: ultimoDiaMes(anio, mesFin),
    fecha_corte: ultimoDiaMes(anio, mesFin),
    trimestres_incluidos: [trimestre],
  }
}

function valorCumpleMeta(valorResultado, operador, valorMeta) {
  const resultado = numero(valorResultado)
  const meta = numero(valorMeta)
  const op = texto(operador)

  if (resultado === null || meta === null || !OPERADORES_META.includes(op)) {
    return null
  }

  if (op === '>=') return resultado >= meta
  if (op === '<=') return resultado <= meta
  if (op === '=') return resultado === meta
  if (op === '>') return resultado > meta
  if (op === '<') return resultado < meta
  return null
}

async function obtenerIndicador(supabase) {
  const { data, error } = await supabase
    .from('pesv_indicadores_catalogo')
    .select('*')
    .eq('codigo', CODIGO_INDICADOR)
    .maybeSingle()

  if (error) {
    throw crearError(
      `No fue posible consultar CPLAN_PESV: ${error.message}`,
      500,
      'CPLAN_PESV_CATALOG_ERROR'
    )
  }

  if (!data) {
    throw crearError(
      'El indicador CPLAN_PESV no está registrado en pesv_indicadores_catalogo.',
      404,
      'CPLAN_PESV_NOT_FOUND'
    )
  }

  return data
}

async function obtenerConfiguracion(supabase, indicadorId, anio) {
  const { data, error } = await supabase
    .from('pesv_indicadores_configuracion')
    .select('*')
    .eq('indicador_id', indicadorId)
    .eq('anio', anio)
    .maybeSingle()

  if (error) {
    throw crearError(
      `No fue posible consultar la configuración CPLAN_PESV: ${error.message}`,
      500,
      'CPLAN_PESV_CONFIG_ERROR'
    )
  }

  return data || null
}

async function obtenerMedicionExistente(supabase, indicadorId, periodo) {
  let consulta = supabase
    .from('pesv_indicadores_mediciones')
    .select('*')
    .eq('indicador_id', indicadorId)
    .eq('anio', periodo.anio)
    .eq('tipo_periodo', periodo.tipo_periodo)

  consulta =
    periodo.tipo_periodo === 'TRIMESTRE'
      ? consulta.eq('numero_periodo', periodo.numero_periodo)
      : consulta.is('numero_periodo', null)

  const { data, error } = await consulta.maybeSingle()

  if (error) {
    throw crearError(
      `No fue posible consultar la medición existente CPLAN_PESV: ${error.message}`,
      500,
      'CPLAN_PESV_MEASUREMENT_ERROR'
    )
  }

  return data || null
}

async function obtenerPlan(supabase, anio) {
  const { data, error } = await supabase
    .from('pesv_planes_trabajo')
    .select(`
      id, anio, nombre, fecha_aprobacion, estado,
      responsable_personal_id, responsable_nombre,
      observaciones, created_at, updated_at
    `)
    .eq('anio', anio)
    .maybeSingle()

  if (error) {
    throw crearError(
      `No fue posible consultar el Plan Anual de Trabajo PESV: ${error.message}`,
      500,
      'CPLAN_PESV_PLAN_ERROR'
    )
  }

  return data || null
}

async function obtenerActividades(supabase, planId) {
  if (!planId) return []

  const { data, error } = await supabase
    .from('pesv_plan_trabajo_actividades')
    .select(`
      id, plan_trabajo_id, codigo, actividad, descripcion,
      objetivo_id, meta_id, indicador_id,
      responsable_personal_id, responsable_nombre,
      fecha_programada_inicio, fecha_programada_fin,
      trimestre, estado, fecha_ejecucion, porcentaje_avance,
      resultado, observaciones, created_at, updated_at
    `)
    .eq('plan_trabajo_id', planId)
    .order('fecha_programada_inicio', { ascending: true })
    .order('codigo', { ascending: true })

  if (error) {
    throw crearError(
      `No fue posible consultar las actividades del Plan Anual de Trabajo PESV: ${error.message}`,
      500,
      'CPLAN_PESV_ACTIVITIES_ERROR'
    )
  }

  return Array.isArray(data) ? data : []
}

async function obtenerCortes(supabase, actividades, anio) {
  const ids = actividades.map(item => item?.id).filter(Boolean)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('pesv_plan_trabajo_cortes')
    .select(`
      id, actividad_id, anio, mes, trimestre, fecha_corte,
      estado, fecha_ejecucion, resultado, observaciones,
      evidencia_path, evidencia_nombre, created_at, updated_at
    `)
    .in('actividad_id', ids)
    .eq('anio', anio)
    .order('trimestre', { ascending: true })
    .order('mes', { ascending: true })
    .order('id', { ascending: true })

  if (error) {
    throw crearError(
      `No fue posible consultar los cortes del Plan Anual de Trabajo PESV: ${error.message}`,
      500,
      'CPLAN_PESV_CUTS_ERROR'
    )
  }

  return Array.isArray(data) ? data : []
}

function agruparCortesPorActividad(cortes) {
  const mapa = new Map()
  cortes.forEach(corte => {
    const clave = String(corte.actividad_id)
    if (!mapa.has(clave)) mapa.set(clave, [])
    mapa.get(clave).push(corte)
  })
  return mapa
}

function corteEjecutado(corte) {
  return mayusculas(corte?.estado) === 'EJECUTADA'
}

function detalleCorte(corte) {
  return {
    id: corte?.id ?? null,
    mes: entero(corte?.mes),
    trimestre: entero(corte?.trimestre),
    fecha_corte: corte?.fecha_corte || null,
    estado: mayusculas(corte?.estado) || 'PROGRAMADA',
    fecha_ejecucion: corte?.fecha_ejecucion || null,
    resultado: texto(corte?.resultado) || null,
    observaciones: texto(corte?.observaciones) || null,
    evidencia_path: texto(corte?.evidencia_path) || null,
    evidencia_nombre: texto(corte?.evidencia_nombre) || null,
  }
}

function evaluarActividadTrimestre(actividad, cortesActividad, trimestre) {
  const cortes = cortesActividad.filter(
    corte => entero(corte?.trimestre) === Number(trimestre)
  )

  const programada = cortes.length > 0
  const ejecutada = programada && cortes.every(corteEjecutado)

  return {
    actividad,
    trimestre: Number(trimestre),
    programada,
    ejecutada,
    total_cortes: cortes.length,
    cortes_ejecutados: cortes.filter(corteEjecutado).length,
    cortes: cortes.map(detalleCorte),
  }
}

function detalleActividadEvaluada(evaluacion) {
  const actividad = evaluacion.actividad

  return {
    id: actividad.id,
    codigo: texto(actividad.codigo) || null,
    actividad: texto(actividad.actividad),
    descripcion: texto(actividad.descripcion) || null,
    responsable_nombre: texto(actividad.responsable_nombre) || null,
    objetivo_id: actividad.objetivo_id || null,
    meta_id: actividad.meta_id || null,
    indicador_id: actividad.indicador_id || null,
    fecha_programada_inicio: actividad.fecha_programada_inicio || null,
    fecha_programada_fin: actividad.fecha_programada_fin || null,

    // Campo legado, solo informativo. Ya no gobierna el cálculo.
    trimestre_legacy: entero(actividad.trimestre),

    trimestre: evaluacion.trimestre,
    incluida_applan: evaluacion.programada,
    incluida_aeplan: evaluacion.ejecutada,
    total_cortes: evaluacion.total_cortes,
    cortes_ejecutados: evaluacion.cortes_ejecutados,
    cortes_pendientes:
      evaluacion.total_cortes - evaluacion.cortes_ejecutados,
    cortes: evaluacion.cortes,
  }
}

function calcularTrimestre(actividades, cortesPorActividad, trimestre) {
  const evaluaciones = actividades
    .map(actividad =>
      evaluarActividadTrimestre(
        actividad,
        cortesPorActividad.get(String(actividad.id)) || [],
        trimestre
      )
    )
    .filter(item => item.programada)

  const applan = evaluaciones.length
  const aeplan = evaluaciones.filter(item => item.ejecutada).length

  return {
    trimestre: Number(trimestre),
    actividades_programadas: applan,
    actividades_ejecutadas: aeplan,
    actividades_no_ejecutadas: Math.max(0, applan - aeplan),
    valor_resultado:
      applan > 0 ? redondear((aeplan / applan) * 100, 2) : null,
    unidad_resultado: UNIDAD_RESULTADO,
    actividades: evaluaciones.map(detalleActividadEvaluada),
  }
}

function calcularAcumulado(actividades, cortesPorActividad, trimestres) {
  const detalleTrimestres = trimestres.map(trimestre =>
    calcularTrimestre(actividades, cortesPorActividad, trimestre)
  )

  const applan = detalleTrimestres.reduce(
    (total, item) => total + item.actividades_programadas,
    0
  )

  const aeplan = detalleTrimestres.reduce(
    (total, item) => total + item.actividades_ejecutadas,
    0
  )

  return {
    trimestres,
    actividades_programadas: applan,
    actividades_ejecutadas: aeplan,
    actividades_no_ejecutadas: Math.max(0, applan - aeplan),
    valor_resultado:
      applan > 0 ? redondear((aeplan / applan) * 100, 2) : null,
    unidad_resultado: UNIDAD_RESULTADO,
    detalle_trimestres: detalleTrimestres.map(item => ({
      trimestre: item.trimestre,
      actividades_programadas: item.actividades_programadas,
      actividades_ejecutadas: item.actividades_ejecutadas,
      actividades_no_ejecutadas: item.actividades_no_ejecutadas,
      valor_resultado: item.valor_resultado,
    })),
  }
}

function calcularCplan(plan, actividades, cortes, periodo) {
  const cortesPorActividad = agruparCortesPorActividad(cortes)

  const actividadesSinCortes = actividades.filter(
    actividad =>
      (cortesPorActividad.get(String(actividad.id)) || []).length === 0
  )

  const trimestre =
    periodo.tipo_periodo === 'TRIMESTRE'
      ? calcularTrimestre(
          actividades,
          cortesPorActividad,
          periodo.numero_periodo
        )
      : null

  const trimestresAcumulados =
    periodo.tipo_periodo === 'TRIMESTRE'
      ? Array.from(
          { length: periodo.numero_periodo },
          (_, index) => index + 1
        )
      : [1, 2, 3, 4]

  const acumulado = calcularAcumulado(
    actividades,
    cortesPorActividad,
    trimestresAcumulados
  )

  const principal =
    periodo.tipo_periodo === 'TRIMESTRE'
      ? trimestre
      : acumulado

  const advertencias = []

  if (!plan) {
    advertencias.push(
      `No existe Plan Anual de Trabajo PESV para la vigencia ${periodo.anio}.`
    )
  }

  if (plan && actividades.length === 0) {
    advertencias.push(
      'El Plan Anual de Trabajo PESV no tiene actividades registradas.'
    )
  }

  if (actividadesSinCortes.length > 0) {
    advertencias.push(
      `${actividadesSinCortes.length} actividad(es) no tienen cortes de seguimiento generados y no participan en APPlan(t) ni AEPlan(t).`
    )
  }

  if (plan && principal.actividades_programadas === 0) {
    advertencias.push(
      periodo.tipo_periodo === 'TRIMESTRE'
        ? `No existen actividades con cortes programados para el trimestre ${periodo.numero_periodo}.`
        : 'No existen actividades con cortes programados en la vigencia.'
    )
  }

  return {
    plan,
    total_actividades_plan: actividades.length,
    total_cortes_plan: cortes.length,

    numerador: principal.actividades_ejecutadas,
    denominador: principal.actividades_programadas,
    valor_resultado: principal.valor_resultado,
    unidad_resultado: UNIDAD_RESULTADO,

    resultados: {
      actividades_ejecutadas: principal.actividades_ejecutadas,
      actividades_programadas: principal.actividades_programadas,
      cumplimiento_plan_pesv: principal.valor_resultado,
    },

    resumen: {
      total_actividades_plan: actividades.length,
      total_cortes_plan: cortes.length,
      actividades_programadas_periodo: principal.actividades_programadas,
      actividades_ejecutadas_periodo: principal.actividades_ejecutadas,
      actividades_no_ejecutadas_periodo: principal.actividades_no_ejecutadas,
      actividades_sin_cortes: actividadesSinCortes.length,
    },

    trimestre,
    acumulado,

    detalle_actividades:
      periodo.tipo_periodo === 'TRIMESTRE'
        ? trimestre.actividades
        : [],

    actividades_sin_cortes: actividadesSinCortes.map(item => ({
      id: item.id,
      codigo: texto(item.codigo) || null,
      actividad: texto(item.actividad),
    })),

    advertencias,

    datos_calculo: {
      codigo_indicador: CODIGO_INDICADOR,
      formula: 'CPlan PESV = AEPlan(t) / APPlan(t) * 100',
      metodologia: 'CPLAN_POR_ACTIVIDAD_Y_CORTES_TRIMESTRALES',
      criterio_applan:
        'Una actividad cuenta una sola vez en APPlan(t) cuando tiene al menos un corte programado en el trimestre evaluado.',
      criterio_aeplan:
        'Una actividad incluida en APPlan(t) cuenta una sola vez en AEPlan(t) cuando todos sus cortes del trimestre evaluado están en estado EJECUTADA.',
      criterio_acumulado:
        'El acumulado suma las participaciones trimestrales programadas y ejecutadas desde T1 hasta el período de corte.',
      aeplan: principal.actividades_ejecutadas,
      applan: principal.actividades_programadas,
      valor_resultado: principal.valor_resultado,
      periodo,
      actividades:
        periodo.tipo_periodo === 'TRIMESTRE'
          ? trimestre.actividades
          : [],
      acumulado,
    },
  }
}

function evaluarConfiguracion(calculo, configuracion) {
  const lineaBase = numero(configuracion?.linea_base)
  const operadorMeta = texto(configuracion?.operador_meta)
  const valorMeta = numero(configuracion?.valor_meta)
  const unidadMeta =
    mayusculas(configuracion?.unidad_meta) || UNIDAD_RESULTADO

  const evaluacionDisponible =
    calculo.valor_resultado !== null &&
    valorMeta !== null &&
    OPERADORES_META.includes(operadorMeta)

  return {
    configurado: Boolean(configuracion),
    linea_base: lineaBase,
    operador_meta: operadorMeta || null,
    valor_meta: valorMeta,
    unidad_meta: unidadMeta,
    evaluacion_disponible: evaluacionDisponible,
    cumple_meta: evaluacionDisponible
      ? valorCumpleMeta(
          calculo.valor_resultado,
          operadorMeta,
          valorMeta
        )
      : null,
    fuente_informacion:
      texto(configuracion?.fuente_informacion) || null,
    interpretacion_indicador:
      texto(configuracion?.interpretacion_indicador) || null,
    personas_deben_conocer_resultado:
      texto(configuracion?.personas_deben_conocer_resultado) || null,
    observaciones:
      texto(configuracion?.observaciones) || null,
    configuracion_especifica:
      configuracion?.configuracion_especifica || null,
  }
}

export async function GET(request) {
  try {
    const {
      nit,
      empresa,
      supabaseAdmin,
    } = await obtenerSupabaseAdminEmpresaDesdeRequest(request)

    const url = new URL(request.url)

    const anio = validarAnio(url.searchParams.get('anio'))
    const tipoPeriodo =
      mayusculas(url.searchParams.get('tipo_periodo')) || 'TRIMESTRE'
    const numeroPeriodo = url.searchParams.get('numero_periodo')

    const periodo = construirPeriodo(
      anio,
      tipoPeriodo,
      numeroPeriodo
    )

    const indicador = await obtenerIndicador(supabaseAdmin)

    const [
      configuracion,
      medicion,
      plan,
    ] = await Promise.all([
      obtenerConfiguracion(supabaseAdmin, indicador.id, anio),
      obtenerMedicionExistente(supabaseAdmin, indicador.id, periodo),
      obtenerPlan(supabaseAdmin, anio),
    ])

    const actividades = plan?.id
      ? await obtenerActividades(supabaseAdmin, plan.id)
      : []

    const cortes =
      actividades.length > 0
        ? await obtenerCortes(supabaseAdmin, actividades, anio)
        : []

    const calculoBase = calcularCplan(
      plan,
      actividades,
      cortes,
      periodo
    )

    const evaluacion = evaluarConfiguracion(
      calculoBase,
      configuracion
    )

    const calculo = {
      ...calculoBase,
      linea_base: evaluacion.linea_base,
      operador_meta: evaluacion.operador_meta,
      valor_meta: evaluacion.valor_meta,
      unidad_meta: evaluacion.unidad_meta,
      fuente_informacion: evaluacion.fuente_informacion,
      interpretacion_indicador: evaluacion.interpretacion_indicador,
      personas_deben_conocer_resultado:
        evaluacion.personas_deben_conocer_resultado,
      cumple_meta: evaluacion.cumple_meta,
    }

    return NextResponse.json({
      ok: true,

      empresa: {
        nit: nit || empresa?.nit || '',
        nombre: nombreEmpresa(empresa),
        nivel_cea: empresa?.nivel_cea || '',
      },

      nivel_pesv: 'BASICO',

      indicador: {
        ...indicador,
        configuracion: configuracion || null,
        ultima_medicion: medicion || null,
      },

      anio,
      periodo,
      plan,
      configuracion: configuracion || null,
      evaluacion,
      medicion_existente: medicion || null,
      calculo,
    })
  } catch (error) {
    console.error('ERROR GET CPLAN_PESV:', error)
    return respuestaError(error)
  }
}
