// app/api/admin/pesv/indicadores/cm-pesv/route.js

import {
  NextResponse,
} from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'


// ============================================================
// CONSTANTES
// ============================================================

const CODIGO_INDICADOR =
  'CM_PESV'

const UNIDAD_RESULTADO =
  'PORCENTAJE'

const ESTADOS_MEDICION_VALIDOS = [
  'VALIDADA',
  'CERRADA',
]

const OPERADORES_META = [
  '>=',
  '<=',
  '=',
  '>',
  '<',
]


// ============================================================
// RESPUESTAS / HELPERS
// ============================================================

function respuestaError(
  error
) {
  const respuesta =
    respuestaErrorEmpresa(
      error
    )

  return NextResponse.json(
    {
      ok: false,
      ...respuesta.body,
    },
    {
      status:
        respuesta.status,
    }
  )
}


function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function mayusculas(
  valor
) {
  return texto(
    valor
  ).toUpperCase()
}


function numero(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    texto(valor) === ''
  ) {
    return null
  }

  const n =
    Number(valor)

  return Number.isFinite(n)
    ? n
    : null
}


function entero(
  valor
) {
  const n =
    numero(valor)

  return n === null
    ? null
    : Math.trunc(n)
}


function redondear(
  valor,
  decimales = 2
) {
  const n =
    numero(valor)

  if (
    n === null
  ) {
    return null
  }

  const factor =
    10 ** decimales

  return Math.round(
    (n + Number.EPSILON) * factor
  ) / factor
}


function fechaIsoValida(
  valor
) {
  const cadena =
    texto(valor)

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      cadena
    )
  ) {
    return false
  }

  const fecha =
    new Date(
      `${cadena}T00:00:00Z`
    )

  return !Number.isNaN(
    fecha.getTime()
  )
}


function nombreEmpresa(
  empresa
) {
  return texto(
    empresa?.nombre ||
    empresa?.nombre_empresa ||
    empresa?.razon_social
  )
}


function crearError(
  message,
  status = 400,
  code = 'CM_PESV_ERROR'
) {
  const error =
    new Error(message)

  error.status =
    status

  error.code =
    code

  return error
}


// ============================================================
// AÑO Y PERÍODO
// ============================================================

function validarAnio(
  valor
) {
  const anio =
    entero(valor)

  if (
    anio === null ||
    anio < 2022 ||
    anio > 2100
  ) {
    throw crearError(
      'El año consultado no es válido.'
    )
  }

  return anio
}


function ultimoDiaMes(
  anio,
  mes
) {
  return new Date(
    Date.UTC(
      anio,
      mes,
      0
    )
  )
    .toISOString()
    .slice(0, 10)
}


function trimestreActual() {
  return Math.ceil(
    (new Date().getMonth() + 1) / 3
  )
}


function construirPeriodo(
  anio,
  tipoPeriodo,
  numeroPeriodo
) {
  const tipo =
    mayusculas(tipoPeriodo) ||
    'TRIMESTRE'

  if (
    tipo === 'ANUAL'
  ) {
    return {
      anio,
      tipo_periodo:
        'ANUAL',
      numero_periodo:
        null,
      periodo_desde:
        `${anio}-01-01`,
      periodo_hasta:
        `${anio}-12-31`,
      fecha_corte:
        `${anio}-12-31`,
      acumulado_desde:
        `${anio}-01-01`,
      acumulado_hasta:
        `${anio}-12-31`,
    }
  }

  if (
    tipo !== 'TRIMESTRE'
  ) {
    throw crearError(
      'CM_PESV admite mediciones TRIMESTRALES y ANUALES.'
    )
  }

  const trimestre =
    entero(numeroPeriodo) ??
    trimestreActual()

  if (
    trimestre < 1 ||
    trimestre > 4
  ) {
    throw crearError(
      'El número de trimestre debe estar entre 1 y 4.'
    )
  }

  const mesInicio =
    (trimestre - 1) * 3 + 1

  const mesFin =
    trimestre * 3

  return {
    anio,
    tipo_periodo:
      'TRIMESTRE',
    numero_periodo:
      trimestre,
    periodo_desde:
      `${anio}-${String(mesInicio).padStart(2, '0')}-01`,
    periodo_hasta:
      ultimoDiaMes(
        anio,
        mesFin
      ),
    fecha_corte:
      ultimoDiaMes(
        anio,
        mesFin
      ),
    acumulado_desde:
      `${anio}-01-01`,
    acumulado_hasta:
      ultimoDiaMes(
        anio,
        mesFin
      ),
  }
}


// ============================================================
// EVALUACIÓN NUMÉRICA DE UNA META
// ============================================================

function valorCumpleMeta(
  valorResultado,
  operador,
  valorMeta
) {
  const resultado =
    numero(valorResultado)

  const meta =
    numero(valorMeta)

  const op =
    texto(operador)

  if (
    resultado === null ||
    meta === null ||
    !OPERADORES_META.includes(op)
  ) {
    return null
  }

  switch (op) {
    case '>=':
      return resultado >= meta

    case '<=':
      return resultado <= meta

    case '=':
      return resultado === meta

    case '>':
      return resultado > meta

    case '<':
      return resultado < meta

    default:
      return null
  }
}


// ============================================================
// CATÁLOGO Y CONFIGURACIÓN DE CM_PESV
// ============================================================

async function obtenerIndicadorCmPesv(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_indicadores_catalogo'
      )
      .select('*')
      .eq(
        'codigo',
        CODIGO_INDICADOR
      )
      .maybeSingle()

  if (
    error
  ) {
    throw crearError(
      `No fue posible consultar CM_PESV: ${error.message}`,
      500,
      'CM_PESV_CATALOG_ERROR'
    )
  }

  if (
    !data
  ) {
    throw crearError(
      'El indicador CM_PESV no está registrado en pesv_indicadores_catalogo.',
      404,
      'CM_PESV_NOT_FOUND'
    )
  }

  return data
}


async function obtenerConfiguracionCmPesv(
  supabase,
  indicadorId,
  anio
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_indicadores_configuracion'
      )
      .select('*')
      .eq(
        'indicador_id',
        indicadorId
      )
      .eq(
        'anio',
        anio
      )
      .maybeSingle()

  if (
    error
  ) {
    throw crearError(
      `No fue posible consultar la configuración CM_PESV: ${error.message}`,
      500,
      'CM_PESV_CONFIG_ERROR'
    )
  }

  return data ||
    null
}


async function obtenerMedicionCmPesv(
  supabase,
  indicadorId,
  periodo
) {
  let consulta =
    supabase
      .from(
        'pesv_indicadores_mediciones'
      )
      .select('*')
      .eq(
        'indicador_id',
        indicadorId
      )
      .eq(
        'anio',
        periodo.anio
      )
      .eq(
        'tipo_periodo',
        periodo.tipo_periodo
      )

  if (
    periodo.tipo_periodo ===
    'TRIMESTRE'
  ) {
    consulta =
      consulta.eq(
        'numero_periodo',
        periodo.numero_periodo
      )
  } else {
    consulta =
      consulta.is(
        'numero_periodo',
        null
      )
  }

  const {
    data,
    error,
  } =
    await consulta
      .maybeSingle()

  if (
    error
  ) {
    throw crearError(
      `No fue posible consultar la medición CM_PESV existente: ${error.message}`,
      500,
      'CM_PESV_MEASUREMENT_ERROR'
    )
  }

  return data ||
    null
}


// ============================================================
// OBJETIVOS Y METAS PESV
// ============================================================

async function obtenerMetasPesv(
  supabase,
  anio
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_metas'
      )
      .select(
        `
          id,
          objetivo_id,
          indicador_id,
          codigo,
          descripcion,
          linea_base,
          valor_meta,
          operador_meta,
          unidad_medida,
          fecha_limite,
          responsable_personal_id,
          responsable_nombre,
          estado,
          observaciones,
          created_at,
          updated_at,
          pesv_objetivos!inner (
            id,
            anio,
            codigo,
            nombre,
            descripcion,
            estado
          ),
          pesv_indicadores_catalogo (
            id,
            codigo,
            numero_normativo,
            nombre,
            descripcion,
            formula,
            periodicidad,
            unidad,
            sentido_mejora,
            activo
          )
        `
      )
      .eq(
        'pesv_objetivos.anio',
        anio
      )
      .order(
        'codigo',
        {
          ascending: true,
        }
      )

  if (
    error
  ) {
    throw crearError(
      `No fue posible consultar las metas PESV: ${error.message}`,
      500,
      'CM_PESV_GOALS_ERROR'
    )
  }

  const lista =
    Array.isArray(data)
      ? data
      : []

  return lista.filter(
    meta => {
      const estadoMeta =
        mayusculas(meta?.estado)

      const estadoObjetivo =
        mayusculas(
          meta?.pesv_objetivos?.estado
        )

      return (
        ['ACTIVA', 'ACTIVO'].includes(
          estadoMeta
        ) &&
        ['ACTIVA', 'ACTIVO'].includes(
          estadoObjetivo
        )
      )
    }
  )
}


// ============================================================
// MEDICIONES DE INDICADORES ASOCIADOS A LAS METAS
// ============================================================

async function obtenerMedicionesIndicadores(
  supabase,
  anio,
  indicadorIds
) {
  const ids = [
    ...new Set(
      indicadorIds
        .map(entero)
        .filter(
          id => id !== null &&
          id > 0
        )
    ),
  ]

  if (
    ids.length === 0
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_indicadores_mediciones'
      )
      .select(
        `
          id,
          indicador_id,
          anio,
          tipo_periodo,
          numero_periodo,
          periodo_desde,
          periodo_hasta,
          fecha_medicion,
          numerador,
          denominador,
          valor_resultado,
          unidad_resultado,
          linea_base,
          valor_meta,
          operador_meta,
          unidad_meta,
          cumple_meta,
          origen_calculo,
          datos_calculo,
          estado,
          responsable_personal_id,
          responsable_nombre,
          created_at,
          updated_at
        `
      )
      .eq(
        'anio',
        anio
      )
      .in(
        'indicador_id',
        ids
      )
      .in(
        'estado',
        ESTADOS_MEDICION_VALIDOS
      )
      .order(
        'periodo_hasta',
        {
          ascending: true,
        }
      )
      .order(
        'id',
        {
          ascending: true,
        }
      )

  if (
    error
  ) {
    throw crearError(
      `No fue posible consultar las mediciones de los indicadores asociados: ${error.message}`,
      500,
      'CM_PESV_ASSOCIATED_MEASUREMENTS_ERROR'
    )
  }

  return Array.isArray(data)
    ? data
    : []
}


function medicionAplicableAlCorte(
  medicion,
  fechaCorte
) {
  const hasta =
    texto(
      medicion?.periodo_hasta
    )

  if (
    !fechaIsoValida(hasta) ||
    !fechaIsoValida(fechaCorte)
  ) {
    return false
  }

  return hasta <=
    fechaCorte
}


function obtenerUltimaMedicionAplicable(
  mediciones,
  indicadorId,
  fechaCorte
) {
  const candidatas =
    mediciones
      .filter(
        item =>
          Number(item?.indicador_id) ===
            Number(indicadorId) &&
          medicionAplicableAlCorte(
            item,
            fechaCorte
          )
      )
      .sort(
        (a, b) => {
          const fechaA =
            texto(a?.periodo_hasta)

          const fechaB =
            texto(b?.periodo_hasta)

          if (
            fechaA !== fechaB
          ) {
            return fechaA.localeCompare(
              fechaB
            )
          }

          const cerradaA =
            mayusculas(a?.estado) ===
            'CERRADA'
              ? 1
              : 0

          const cerradaB =
            mayusculas(b?.estado) ===
            'CERRADA'
              ? 1
              : 0

          if (
            cerradaA !== cerradaB
          ) {
            return cerradaA -
              cerradaB
          }

          return Number(a?.id || 0) -
            Number(b?.id || 0)
        }
      )

  return candidatas.length > 0
    ? candidatas[
        candidatas.length - 1
      ]
    : null
}


// ============================================================
// CASO ESPECIAL TSV
//
// TSV contiene resultados por nivel de pérdida dentro de datos_calculo.
// Una meta institucional asociada a TSV puede referirse a uno o varios
// niveles y no necesariamente al valor_resultado global de la medición.
//
// Para evitar falsos incumplimientos, si la descripción identifica
// fatalidades / lesiones graves / leves / choques simples, se evalúan
// esos componentes. Si no puede identificarse el componente, la meta
// queda NO_EVALUABLE y se genera advertencia; no se inventa un resultado.
// ============================================================

function componentesTsvDesdeDescripcion(
  descripcion
) {
  const d =
    mayusculas(descripcion)

  const componentes = []

  if (
    d.includes('FATAL') ||
    d.includes('MUERTE') ||
    d.includes('FALLECID')
  ) {
    componentes.push(
      'fatalidades'
    )
  }

  if (
    d.includes('GRAVE') ||
    d.includes('LESIONADO GRAVE') ||
    d.includes('LESIONADOS GRAVES')
  ) {
    componentes.push(
      'heridos_graves'
    )
  }

  if (
    d.includes('LEVE')
  ) {
    componentes.push(
      'heridos_leves'
    )
  }

  if (
    d.includes('CHOQUE') ||
    d.includes('SIMPLE')
  ) {
    componentes.push(
      'choques_simples'
    )
  }

  return [
    ...new Set(componentes),
  ]
}


function evaluarMetaTsv(
  meta,
  medicion
) {
  const componentes =
    componentesTsvDesdeDescripcion(
      meta?.descripcion
    )

  if (
    componentes.length === 0
  ) {
    return {
      evaluable: false,
      estado_evaluacion:
        'NO_EVALUABLE',
      motivo:
        'La meta está asociada a TSV, pero no fue posible identificar en su descripción el nivel de pérdida que debe evaluarse.',
      valor_resultado:
        null,
      detalle_componentes:
        [],
    }
  }

  const evaluacionMetas =
    medicion
      ?.datos_calculo
      ?.evaluacion_metas ||
    {}

  const tasas =
    medicion
      ?.datos_calculo
      ?.periodo
      ?.tasas_por_nivel ||
    {}

  const detalle =
    componentes.map(
      componente => {
        const valorResultado =
          numero(
            evaluacionMetas
              ?.[componente]
              ?.valor_resultado
          ) ??
          numero(
            tasas?.[componente]
          )

        const cumple =
          valorCumpleMeta(
            valorResultado,
            meta?.operador_meta,
            meta?.valor_meta
          )

        return {
          componente,
          valor_resultado:
            valorResultado,
          cumple_meta:
            cumple,
        }
      }
    )

  if (
    detalle.some(
      item =>
        item.valor_resultado ===
          null ||
        item.cumple_meta ===
          null
    )
  ) {
    return {
      evaluable: false,
      estado_evaluacion:
        'NO_EVALUABLE',
      motivo:
        'La medición TSV no contiene todos los componentes requeridos para evaluar esta meta.',
      valor_resultado:
        null,
      detalle_componentes:
        detalle,
    }
  }

  const cumple =
    detalle.every(
      item =>
        item.cumple_meta ===
        true
    )

  return {
    evaluable: true,
    estado_evaluacion:
      cumple
        ? 'ALCANZADA'
        : 'NO_ALCANZADA',
    motivo:
      cumple
        ? 'Los componentes TSV identificados en la meta cumplen el criterio establecido.'
        : 'Uno o más componentes TSV identificados en la meta no cumplen el criterio establecido.',
    valor_resultado:
      detalle.length === 1
        ? detalle[0].valor_resultado
        : null,
    cumple_meta:
      cumple,
    detalle_componentes:
      detalle,
  }
}


// ============================================================
// EVALUAR UNA META PESV EN EL CORTE
// ============================================================

function evaluarMetaPesv(
  meta,
  mediciones,
  periodo
) {
  const indicador =
    meta?.pesv_indicadores_catalogo ||
    null

  const base = {
    meta_id:
      meta?.id,
    meta_codigo:
      texto(meta?.codigo),
    meta_descripcion:
      texto(meta?.descripcion),
    objetivo_id:
      meta?.objetivo_id,
    objetivo_codigo:
      texto(
        meta?.pesv_objetivos?.codigo
      ),
    objetivo_nombre:
      texto(
        meta?.pesv_objetivos?.nombre
      ),
    indicador_id:
      meta?.indicador_id ||
      null,
    indicador_codigo:
      texto(indicador?.codigo),
    indicador_nombre:
      texto(indicador?.nombre),
    periodicidad_indicador:
      texto(indicador?.periodicidad),
    operador_meta:
      texto(meta?.operador_meta) ||
      null,
    valor_meta:
      numero(meta?.valor_meta),
    unidad_meta:
      texto(meta?.unidad_medida) ||
      null,
    fecha_limite:
      texto(meta?.fecha_limite) ||
      null,
    responsable_nombre:
      texto(meta?.responsable_nombre) ||
      null,
  }



  if (
    !meta?.indicador_id ||
    !indicador
  ) {
    return {
      ...base,
      incluye_en_tm: true,
      evaluable: false,
      estado_evaluacion:
        'SIN_INDICADOR',
      motivo:
        'La meta pertenece a TM(t), pero no tiene un indicador asociado y su logro no puede acreditarse.',
      medicion:
        null,
      valor_resultado:
        null,
      cumple_meta:
        null,
    }
  }

  if (
    texto(meta?.operador_meta) === '' ||
    numero(meta?.valor_meta) === null
  ) {
    return {
      ...base,
      incluye_en_tm: true,
      evaluable: false,
      estado_evaluacion:
        'CONFIGURACION_INCOMPLETA',
      motivo:
        'La meta pertenece a TM(t), pero no tiene operador y valor meta completos y no puede acreditarse su logro.',
      medicion:
        null,
      valor_resultado:
        null,
      cumple_meta:
        null,
    }
  }

  const medicion =
    obtenerUltimaMedicionAplicable(
      mediciones,
      meta.indicador_id,
      periodo.fecha_corte
    )

  if (
    !medicion
  ) {
    return {
      ...base,
      incluye_en_tm: true,
      evaluable: false,
      estado_evaluacion:
        'PENDIENTE_ACREDITACION',
      motivo:
        'La meta pertenece a TM(t), pero aún no existe una medición VALIDADA o CERRADA del indicador aplicable al corte que permita acreditar su logro.',
      medicion:
        null,
      valor_resultado:
        null,
      cumple_meta:
        null,
    }
  }

  if (
    mayusculas(indicador?.codigo) ===
    'TSV'
  ) {
    const evaluacionTsv =
      evaluarMetaTsv(
        meta,
        medicion
      )

    return {
      ...base,
      ...evaluacionTsv,
      medicion: {
        id:
          medicion.id,
        tipo_periodo:
          medicion.tipo_periodo,
        numero_periodo:
          medicion.numero_periodo,
        periodo_desde:
          medicion.periodo_desde,
        periodo_hasta:
          medicion.periodo_hasta,
        fecha_medicion:
          medicion.fecha_medicion,
        estado:
          medicion.estado,
        valor_resultado:
          numero(
            medicion.valor_resultado
          ),
        unidad_resultado:
          texto(
            medicion.unidad_resultado
          ),
      },
    }
  }

  const valorResultado =
    numero(
      medicion?.valor_resultado
    )

  const cumple =
    valorCumpleMeta(
      valorResultado,
      meta?.operador_meta,
      meta?.valor_meta
    )

  if (
    cumple === null
  ) {
    return {
      ...base,
      incluye_en_tm: true,
      evaluable: false,
      estado_evaluacion:
        'NO_EVALUABLE',
      motivo:
        'La medición existe, pero no contiene un valor numérico que permita evaluar la meta.',
      medicion: {
        id:
          medicion.id,
        tipo_periodo:
          medicion.tipo_periodo,
        numero_periodo:
          medicion.numero_periodo,
        periodo_desde:
          medicion.periodo_desde,
        periodo_hasta:
          medicion.periodo_hasta,
        fecha_medicion:
          medicion.fecha_medicion,
        estado:
          medicion.estado,
      },
      valor_resultado:
        valorResultado,
      cumple_meta:
        null,
    }
  }

  return {
    ...base,
    evaluable: true,
    estado_evaluacion:
      cumple
        ? 'ALCANZADA'
        : 'NO_ALCANZADA',
    motivo:
      cumple
        ? 'El resultado del indicador cumple el criterio definido en la meta PESV.'
        : 'El resultado del indicador no cumple el criterio definido en la meta PESV.',
    medicion: {
      id:
        medicion.id,
      tipo_periodo:
        medicion.tipo_periodo,
      numero_periodo:
        medicion.numero_periodo,
      periodo_desde:
        medicion.periodo_desde,
      periodo_hasta:
        medicion.periodo_hasta,
      fecha_medicion:
        medicion.fecha_medicion,
      estado:
        medicion.estado,
      valor_resultado:
        valorResultado,
      unidad_resultado:
        texto(
          medicion.unidad_resultado
        ),
    },
    valor_resultado:
      valorResultado,
    cumple_meta:
      cumple,
  }
}


// ============================================================
// CALCULAR CM_PESV
// ============================================================

async function calcularCmPesv(
  supabase,
  anio,
  periodo
) {
  const metas =
    await obtenerMetasPesv(
      supabase,
      anio
    )

  // CM_PESV consolida todas las metas activas definidas para la vigencia.
  // No existe una meta individual asociada a CM_PESV, por lo que no se
  // requiere ninguna exclusión especial por autorreferencia.
  const mediciones =
    await obtenerMedicionesIndicadores(
      supabase,
      anio,
      metas.map(
        meta =>
          meta?.indicador_id
      )
    )

  const detalleMetas =
    metas.map(
      meta =>
        evaluarMetaPesv(
          meta,
          mediciones,
          periodo
        )
    )

  const alcanzadas =
    detalleMetas.filter(
      item =>
        item.cumple_meta ===
        true
    )

  const noAlcanzadas =
    detalleMetas.filter(
      item =>
        item.cumple_meta ===
        false
    )

  const pendientesAcreditacion =
    detalleMetas.filter(
      item =>
        item.estado_evaluacion ===
        'PENDIENTE_ACREDITACION'
    )

  const sinIndicadorDetalle =
    detalleMetas.filter(
      item =>
        item.estado_evaluacion ===
        'SIN_INDICADOR'
    )

  const configuracionIncompletaDetalle =
    detalleMetas.filter(
      item =>
        item.estado_evaluacion ===
        'CONFIGURACION_INCOMPLETA'
    )

  const noEvaluablesDetalle =
    detalleMetas.filter(
      item =>
        item.estado_evaluacion ===
        'NO_EVALUABLE'
    )

  const conEvidenciaEvaluable =
    detalleMetas.filter(
      item =>
        item.evaluable === true &&
        item?.medicion?.id
    )

  // MA(t): número de metas cuyo logro se encuentra acreditado.
  // TM(t): número total de metas activas definidas en el PESV
  // para la vigencia consultada.
  //
  // Las metas sin medición aplicable, sin indicador o con información
  // incompleta permanecen en TM(t); simplemente no incrementan MA(t).
  const ma =
    alcanzadas.length

  const tm =
    metas.length

  const resultado =
    tm > 0
      ? redondear(
          (ma / tm) * 100,
          2
        )
      : null

  const advertencias = []

  if (
    metas.length === 0
  ) {
    advertencias.push(
      'No se encontraron metas PESV activas para la vigencia consultada.'
    )
  }

  if (
    pendientesAcreditacion.length > 0
  ) {
    advertencias.push(
      `${pendientesAcreditacion.length} meta(s) aún no tienen una medición VALIDADA o CERRADA aplicable al corte. Permanecen en TM(t) como metas cuyo logro todavía no está acreditado.`
    )
  }

  if (
    sinIndicadorDetalle.length > 0
  ) {
    advertencias.push(
      `${sinIndicadorDetalle.length} meta(s) no tienen indicador asociado. Permanecen en TM(t), pero su logro no puede acreditarse hasta completar la configuración.`
    )
  }

  if (
    configuracionIncompletaDetalle.length > 0
  ) {
    advertencias.push(
      `${configuracionIncompletaDetalle.length} meta(s) no tienen completo el operador o el valor meta. Permanecen en TM(t), pero su logro no puede acreditarse.`
    )
  }

  if (
    noEvaluablesDetalle.length > 0
  ) {
    advertencias.push(
      `${noEvaluablesDetalle.length} meta(s) tienen una medición disponible, pero la información registrada no permite evaluar correctamente su criterio. Revise el detalle de la medición asociada.`
    )
  }

  return {
    origen_calculo:
      'AUTOMATICO',

    numerador:
      ma,

    denominador:
      tm,

    valor_resultado:
      resultado,

    unidad_resultado:
      UNIDAD_RESULTADO,

    formula:
      'CM_PESV = MA(t) / TM(t) * 100',

    periodo,

    resultados: {
      metas_alcanzadas:
        ma,
      total_metas_definidas:
        tm,
      total_metas_definidas_cm:
        tm,
      cumplimiento_metas_pesv:
        resultado,
      unidad:
        UNIDAD_RESULTADO,
    },

    resumen: {
      total_metas_activas:
        tm,
      metas_definidas:
        tm,
      metas_incluidas_tm:
        tm,
      metas_alcanzadas:
        alcanzadas.length,
      metas_no_alcanzadas:
        noAlcanzadas.length,
      metas_pendientes_acreditacion:
        pendientesAcreditacion.length,
      metas_sin_indicador:
        sinIndicadorDetalle.length,
      metas_configuracion_incompleta:
        configuracionIncompletaDetalle.length,
      metas_no_evaluables:
        noEvaluablesDetalle.length,
      con_evidencia_evaluable:
        conEvidenciaEvaluable.length,
      metas_sin_medicion:
        pendientesAcreditacion.length,
    },

    ids: {
      metas_activas:
        metas.map(
          item => item.id
        ),
      metas_definidas:
        detalleMetas.map(
          item => item.meta_id
        ),
      metas_incluidas_tm:
        detalleMetas.map(
          item => item.meta_id
        ),
      metas_alcanzadas:
        alcanzadas.map(
          item => item.meta_id
        ),
      metas_no_alcanzadas:
        noAlcanzadas.map(
          item => item.meta_id
        ),
      metas_pendientes_acreditacion:
        pendientesAcreditacion.map(
          item => item.meta_id
        ),
      metas_sin_indicador:
        sinIndicadorDetalle.map(
          item => item.meta_id
        ),
      metas_configuracion_incompleta:
        configuracionIncompletaDetalle.map(
          item => item.meta_id
        ),
      metas_no_evaluables:
        noEvaluablesDetalle.map(
          item => item.meta_id
        ),
      con_evidencia_evaluable:
        conEvidenciaEvaluable.map(
          item => item.meta_id
        ),
    },

    detalle_metas:
      detalleMetas,

    advertencias,
  }
}

// ============================================================
// EVALUAR CONFIGURACIÓN DEL INDICADOR CM_PESV
// ============================================================

function evaluarConfiguracion(
  calculo,
  configuracion
) {
  const lineaBase =
    numero(
      configuracion?.linea_base
    )

  const valorMeta =
    numero(
      configuracion?.valor_meta
    )

  const operadorMeta =
    texto(
      configuracion?.operador_meta
    ) ||
    null

  const unidadMeta =
    texto(
      configuracion?.unidad_meta
    ) ||
    UNIDAD_RESULTADO

  const evaluacionDisponible =
    calculo?.valor_resultado !==
      null &&
    valorMeta !== null &&
    OPERADORES_META.includes(
      operadorMeta
    )

  const cumpleMeta =
    evaluacionDisponible
      ? valorCumpleMeta(
          calculo.valor_resultado,
          operadorMeta,
          valorMeta
        )
      : null

  return {
    configurado:
      Boolean(configuracion),
    linea_base:
      lineaBase,
    operador_meta:
      operadorMeta,
    valor_meta:
      valorMeta,
    unidad_meta:
      unidadMeta,
    evaluacion_disponible:
      evaluacionDisponible,
    cumple_meta:
      cumpleMeta,
    fuente_informacion:
      texto(
        configuracion?.fuente_informacion
      ) ||
      null,
    interpretacion_indicador:
      texto(
        configuracion?.interpretacion_indicador
      ) ||
      null,
    personas_deben_conocer_resultado:
      texto(
        configuracion?.personas_deben_conocer_resultado
      ) ||
      null,
    observaciones:
      texto(
        configuracion?.observaciones
      ) ||
      null,
    configuracion_especifica:
      configuracion
        ?.configuracion_especifica ||
      null,
  }
}


// ============================================================
// GET
//
// Parámetros:
// - anio: obligatorio
// - tipo_periodo: TRIMESTRE | ANUAL (opcional; TRIMESTRE por defecto)
// - numero_periodo: 1..4 cuando tipo_periodo = TRIMESTRE
//
// La API calcula el indicador. El guardado, análisis, validación y
// cierre continúan a cargo de la API general de Indicadores PESV.
// ============================================================

export async function GET(
  request
) {
  try {
    const {
      nit,
      empresa,
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const url =
      new URL(
        request.url
      )

    const anio =
      validarAnio(
        url.searchParams.get(
          'anio'
        )
      )

    const tipoPeriodo =
      mayusculas(
        url.searchParams.get(
          'tipo_periodo'
        )
      ) ||
      'TRIMESTRE'

    const numeroPeriodo =
      url.searchParams.get(
        'numero_periodo'
      )

    const periodo =
      construirPeriodo(
        anio,
        tipoPeriodo,
        numeroPeriodo
      )

    const indicador =
      await obtenerIndicadorCmPesv(
        supabaseAdmin
      )

    const [
      configuracion,
      medicion,
      calculo,
    ] =
      await Promise.all([
        obtenerConfiguracionCmPesv(
          supabaseAdmin,
          indicador.id,
          anio
        ),

        obtenerMedicionCmPesv(
          supabaseAdmin,
          indicador.id,
          periodo
        ),

        calcularCmPesv(
          supabaseAdmin,
          anio,
          periodo
        ),
      ])

    const evaluacion =
      evaluarConfiguracion(
        calculo,
        configuracion
      )

    return NextResponse.json({
      ok: true,

      empresa: {
        nit:
          nit ||
          empresa?.nit ||
          '',
        nombre:
          nombreEmpresa(
            empresa
          ),
        nivel_cea:
          empresa?.nivel_cea ||
          '',
      },

      nivel_pesv:
        'BASICO',

      indicador: {
        ...indicador,
        configuracion:
          configuracion ||
          null,
        ultima_medicion:
          medicion ||
          null,
      },

      anio,
      periodo,

      configuracion:
        configuracion ||
        null,

      evaluacion,

      medicion_existente:
        medicion ||
        null,

      calculo: {
        ...calculo,

        linea_base:
          evaluacion.linea_base,

        operador_meta:
          evaluacion.operador_meta,

        valor_meta:
          evaluacion.valor_meta,

        unidad_meta:
          evaluacion.unidad_meta,

        fuente_informacion:
          evaluacion.fuente_informacion,

        interpretacion_indicador:
          evaluacion.interpretacion_indicador,

        personas_deben_conocer_resultado:
          evaluacion.personas_deben_conocer_resultado,

        cumple_meta:
          evaluacion.cumple_meta,
      },
    })
  } catch (
    error
  ) {
    console.error(
      'ERROR GET CM_PESV:',
      error
    )

    return respuestaError(
      error
    )
  }
}
