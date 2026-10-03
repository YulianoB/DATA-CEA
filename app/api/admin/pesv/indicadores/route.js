// app/api/admin/pesv/indicadores/route.js

import {
  NextResponse,
} from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'


// ============================================================
// CONSTANTES
// app/api/admin/pesv/indicadores/route.js
// ============================================================

const ESTADOS_MEDICION = [
  'BORRADOR',
  'VALIDADA',
  'CERRADA',
]

const TIPOS_PERIODO = [
  'MES',
  'TRIMESTRE',
  'ANUAL',
]

const ORIGENES_CALCULO = [
  'AUTOMATICO',
  'ASISTIDO',
  'MANUAL',
]

const OPERADORES_META = [
  '>=',
  '<=',
  '=',
  '>',
  '<',
]

const CODIGOS_BASICOS = [
  'TSV',
  'RSVI',
  'GRV',
  'CM_PESV',
  'CPLAN_PESV',
  'EJLC',
  'IDP',
  'CPMVH',
  'CPF_PESV_CUMPLIMIENTO',
  'CPF_PESV_COBERTURA',
  'NCAC',
]

const ESTADOS_EJECUTADOS = [
  'EJECUTADA',
  'EJECUTADO',
  'COMPLETADA',
  'COMPLETADO',
  'FINALIZADA',
  'FINALIZADO',
  'CERRADA',
  'CERRADO',
  'CUMPLIDA',
  'CUMPLIDO',
]


// ============================================================
// RESPUESTAS
// app/api/admin/pesv/indicadores/route.js
// ============================================================

function responderOk(
  data = {},
  status = 200
) {
  return NextResponse.json(
    {
      ok: true,
      ...data,
    },
    {
      status,
    }
  )
}


function responderError(
  message,
  status = 400,
  code = 'VALIDATION_ERROR'
) {
  return NextResponse.json(
    {
      ok: false,
      status: 'failed',
      code,
      message,
    },
    {
      status,
    }
  )
}


// ============================================================
// HELPERS GENERALES
// app/api/admin/pesv/indicadores/route.js
// ============================================================

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
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toUpperCase()
}


function numero(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null
  }

  const convertido =
    Number(
      valor
    )

  return Number.isFinite(
    convertido
  )
    ? convertido
    : null
}


function entero(
  valor
) {
  const convertido =
    numero(
      valor
    )

  if (
    convertido === null
  ) {
    return null
  }

  return Math.trunc(
    convertido
  )
}


function booleano(
  valor
) {
  if (
    valor === true ||
    valor === 'true' ||
    valor === 1 ||
    valor === '1'
  ) {
    return true
  }

  if (
    valor === false ||
    valor === 'false' ||
    valor === 0 ||
    valor === '0'
  ) {
    return false
  }

  return null
}


function hoyIso() {
  return new Date()
    .toISOString()
}


function hoyFecha() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    )
}


function redondear(
  valor,
  decimales = 2
) {
  if (
    valor === null ||
    valor === undefined ||
    !Number.isFinite(
      Number(
        valor
      )
    )
  ) {
    return null
  }

  const factor =
    10 ** decimales

  return Math.round(
    (
      Number(
        valor
      ) +
      Number.EPSILON
    ) *
      factor
  ) /
    factor
}


function porcentaje(
  numerador,
  denominador
) {
  const n =
    Number(
      numerador
    )

  const d =
    Number(
      denominador
    )

  if (
    !Number.isFinite(
      n
    ) ||
    !Number.isFinite(
      d
    ) ||
    d <= 0
  ) {
    return null
  }

  return redondear(
    (
      n /
      d
    ) *
      100,
    2
  )
}


function incluyeEstadoEjecutado(
  estado
) {
  return ESTADOS_EJECUTADOS.includes(
    mayusculas(
      estado
    )
  )
}


function valorCumpleMeta(
  resultado,
  operador,
  meta
) {
  const valorResultado =
    numero(
      resultado
    )

  const valorMeta =
    numero(
      meta
    )

  const op =
    texto(
      operador
    )

  if (
    valorResultado === null ||
    valorMeta === null ||
    !OPERADORES_META.includes(
      op
    )
  ) {
    return null
  }

  switch (
    op
  ) {
    case '>=':
      return (
        valorResultado >=
        valorMeta
      )

    case '<=':
      return (
        valorResultado <=
        valorMeta
      )

    case '=':
      return (
        valorResultado ===
        valorMeta
      )

    case '>':
      return (
        valorResultado >
        valorMeta
      )

    case '<':
      return (
        valorResultado <
        valorMeta
      )

    default:
      return null
  }
}

// ============================================================
// EVALUAR METAS TSV POR NIVEL DE PÉRDIDA
// app/api/admin/pesv/indicadores/route.js
//
// Evalúa independientemente:
// - Fatalidades
// - Heridos graves
// - Heridos leves
// - Choques simples
//
// La configuración proviene de:
// pesv_indicadores_configuracion.configuracion_especifica
//
// El resultado evaluado corresponde a las tasas del período
// seleccionado, no a la tasa global referencial.
// ============================================================

function evaluarMetasTsv(
  calculo,
  configuracion
) {
  const tasas =
    calculo
      ?.datos_calculo
      ?.periodo
      ?.tasas_por_nivel ||
    {}

  const especifica =
    configuracion
      ?.configuracion_especifica ||
    {}

  const lineaBase =
    especifica
      ?.linea_base ||
    {}

  const metas =
    especifica
      ?.metas ||
    {}

  const niveles = [
    'fatalidades',
    'heridos_graves',
    'heridos_leves',
    'choques_simples',
  ]

  const evaluacion = {}

  for (
    const nivel of niveles
  ) {
    const valorResultado =
      numero(
        tasas?.[
          nivel
        ]
      )

    const valorLineaBase =
      numero(
        lineaBase?.[
          nivel
        ]
      )

    const operadorMeta =
      texto(
        metas?.[
          nivel
        ]?.operador
      )

    const valorMeta =
      numero(
        metas?.[
          nivel
        ]?.valor
      )

    const cumpleMeta =
      valorCumpleMeta(
        valorResultado,
        operadorMeta,
        valorMeta
      )

    evaluacion[
      nivel
    ] = {
      valor_resultado:
        valorResultado,

      linea_base:
        valorLineaBase,

      operador_meta:
        operadorMeta ||
        null,

      valor_meta:
        valorMeta,

      unidad:
        'TASA_POR_MILLON_KM',

      cumple_meta:
        cumpleMeta,
    }
  }

  const valoresCumplimiento =
    niveles.map(
      nivel =>
        evaluacion[
          nivel
        ]?.cumple_meta
    )

  const todosEvaluados =
    valoresCumplimiento.every(
      valor =>
        typeof valor ===
        'boolean'
    )

  const cumpleMetaGlobal =
    todosEvaluados
      ? valoresCumplimiento.every(
          valor =>
            valor === true
        )
      : null

  return {
    evaluacion_metas:
      evaluacion,

    cumple_meta_global:
      cumpleMetaGlobal,

    metas_completamente_evaluadas:
      todosEvaluados,
  }
}

function datosUsuario(
  body
) {
  return texto(
    body?.usuario ||
    body?.usuario_actualizacion ||
    body?.usuario_registro ||
    ''
  )
}

// ============================================================
// CONFIGURACIÓN ESPECÍFICA TSV
// app/api/admin/pesv/indicadores/route.js
// API: POST /api/admin/pesv/indicadores
// ACCIÓN: guardar_configuracion
//
// TSV es un indicador compuesto:
// - Fatalidades
// - Heridos graves
// - Heridos leves
// - Choques simples
//
// Cada nivel puede tener su propia línea base y meta.
// ============================================================

function normalizarConfiguracionEspecificaTsv(
  valor
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null
  }

  if (
    typeof valor !==
      'object' ||
    Array.isArray(
      valor
    )
  ) {
    throw new Error(
      'La configuración específica TSV no es válida.'
    )
  }

  const lineaBase =
    valor?.linea_base &&
    typeof valor
      .linea_base ===
      'object' &&
    !Array.isArray(
      valor.linea_base
    )
      ? valor.linea_base
      : {}

  const metas =
    valor?.metas &&
    typeof valor
      .metas ===
      'object' &&
    !Array.isArray(
      valor.metas
    )
      ? valor.metas
      : {}

  const origen =
    mayusculas(
      lineaBase?.origen
    )

  if (
    origen &&
    ![
      'AUTOMATICA',
      'MANUAL',
    ].includes(
      origen
    )
  ) {
    throw new Error(
      'El origen de la línea base TSV debe ser AUTOMATICA o MANUAL.'
    )
  }

  const anioReferencia =
    entero(
      lineaBase
        ?.anio_referencia
    )

  const niveles = [
    'fatalidades',
    'heridos_graves',
    'heridos_leves',
    'choques_simples',
  ]

  const lineaBaseNormalizada = {
    origen:
      origen ||
      null,

    anio_referencia:
      anioReferencia,

    fatalidades:
      numero(
        lineaBase
          ?.fatalidades
      ),

    heridos_graves:
      numero(
        lineaBase
          ?.heridos_graves
      ),

    heridos_leves:
      numero(
        lineaBase
          ?.heridos_leves
      ),

    choques_simples:
      numero(
        lineaBase
          ?.choques_simples
      ),
  }

  const metasNormalizadas = {}

  for (
    const nivel of niveles
  ) {
    const configuracionMeta =
      metas?.[nivel] &&
      typeof metas[nivel] ===
        'object' &&
      !Array.isArray(
        metas[nivel]
      )
        ? metas[nivel]
        : {}

    const operador =
      texto(
        configuracionMeta
          ?.operador
      )

    if (
      operador &&
      !OPERADORES_META.includes(
        operador
      )
    ) {
      throw new Error(
        `El operador de meta TSV para ${nivel} no es válido.`
      )
    }

    metasNormalizadas[nivel] = {
      operador:
        operador ||
        null,

      valor:
        numero(
          configuracionMeta
            ?.valor
        ),
    }
  }

  return {
    linea_base:
      lineaBaseNormalizada,

    metas:
      metasNormalizadas,
  }
}

// ============================================================
// PERÍODOS
// app/api/admin/pesv/indicadores/route.js
// ============================================================

function ultimoDiaMes(
  anio,
  mes
) {
  const fecha =
    new Date(
      Date.UTC(
        anio,
        mes,
        0
      )
    )

  return fecha
    .toISOString()
    .slice(
      0,
      10
    )
}


function resolverPeriodo(
  anio,
  tipoPeriodo,
  numeroPeriodo = null
) {
  const year =
    entero(
      anio
    )

  const tipo =
    mayusculas(
      tipoPeriodo
    )

  const n =
    entero(
      numeroPeriodo
    )

  if (
    !year ||
    year < 2000 ||
    year > 2100
  ) {
    throw new Error(
      'La vigencia no es válida.'
    )
  }

  if (
    !TIPOS_PERIODO.includes(
      tipo
    )
  ) {
    throw new Error(
      'El tipo de período no es válido.'
    )
  }

  if (
    tipo === 'ANUAL'
  ) {
    return {
      tipo_periodo:
        'ANUAL',

      numero_periodo:
        null,

      periodo_desde:
        `${year}-01-01`,

      periodo_hasta:
        `${year}-12-31`,
    }
  }

  if (
    tipo === 'TRIMESTRE'
  ) {
    if (
      !n ||
      n < 1 ||
      n > 4
    ) {
      throw new Error(
        'El número de trimestre debe estar entre 1 y 4.'
      )
    }

    const mesInicio =
      (
        n -
        1
      ) *
        3 +
      1

    const mesFin =
      mesInicio +
      2

    return {
      tipo_periodo:
        'TRIMESTRE',

      numero_periodo:
        n,

      periodo_desde:
        `${year}-${String(
          mesInicio
        ).padStart(
          2,
          '0'
        )}-01`,

      periodo_hasta:
        ultimoDiaMes(
          year,
          mesFin
        ),
    }
  }

  if (
    tipo === 'MES'
  ) {
    if (
      !n ||
      n < 1 ||
      n > 12
    ) {
      throw new Error(
        'El número de mes debe estar entre 1 y 12.'
      )
    }

    return {
      tipo_periodo:
        'MES',

      numero_periodo:
        n,

      periodo_desde:
        `${year}-${String(
          n
        ).padStart(
          2,
          '0'
        )}-01`,

      periodo_hasta:
        ultimoDiaMes(
          year,
          n
        ),
    }
  }

  throw new Error(
    'No fue posible resolver el período.'
  )
}


function periodoPermitidoParaIndicador(
  indicador,
  tipoPeriodo
) {
  const periodicidad =
    mayusculas(
      indicador?.periodicidad
    )

  const tipo =
    mayusculas(
      tipoPeriodo
    )

  if (
    periodicidad ===
    'ANUAL'
  ) {
    return (
      tipo ===
      'ANUAL'
    )
  }

  if (
    periodicidad ===
    'MENSUAL_Y_ACUMULADO_ANUAL'
  ) {
    return [
      'MES',
      'ANUAL',
    ].includes(
      tipo
    )
  }

  if (
    periodicidad ===
    'ACUMULADO_MES_Y_ANO'
  ) {
    return [
      'MES',
      'ANUAL',
    ].includes(
      tipo
    )
  }

  if (
    periodicidad ===
    'ACUMULADO_TRIMESTRE_Y_ANO'
  ) {
    return [
      'TRIMESTRE',
      'ANUAL',
    ].includes(
      tipo
    )
  }

  if (
    periodicidad ===
    'TRIMESTRAL_Y_ACUMULADO_ANUAL'
  ) {
    return [
      'TRIMESTRE',
      'ANUAL',
    ].includes(
      tipo
    )
  }

  return true
}


// ============================================================
// CONSULTAS BASE
// app/api/admin/pesv/indicadores/route.js
// ============================================================

async function obtenerCatalogo(
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
        'activo',
        true
      )
      .in(
        'codigo',
        CODIGOS_BASICOS
      )
      .order(
        'orden',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw error
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


async function obtenerConfiguraciones(
  supabase,
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
        'anio',
        anio
      )
      .order(
        'id',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw error
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


async function obtenerMediciones(
  supabase,
  anio,
  indicadorId = null
) {
  let consulta =
    supabase
      .from(
        'pesv_indicadores_mediciones'
      )
      .select('*')
      .eq(
        'anio',
        anio
      )

  if (
    indicadorId
  ) {
    consulta =
      consulta.eq(
        'indicador_id',
        indicadorId
      )
  }

  const {
    data,
    error,
  } =
    await consulta
      .order(
        'periodo_desde',
        {
          ascending:
            false,
        }
      )
      .order(
        'id',
        {
          ascending:
            false,
        }
      )

  if (
    error
  ) {
    throw error
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


async function obtenerPersonal(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'personal'
      )
      .select(
        'id,nombres,apellidos,documento,email'
      )
      .order(
        'nombres',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw error
  }

  return (
    Array.isArray(
      data
    )
      ? data
      : []
  ).map(
    item => ({
      ...item,

      nombre_completo:
        [
          texto(
            item?.nombres
          ),
          texto(
            item?.apellidos
          ),
        ]
          .filter(
            Boolean
          )
          .join(
            ' '
          ) ||
        texto(
          item?.documento
        ),
    })
  )
}


async function obtenerIndicadorPorIdOCodigo(
  supabase,
  {
    indicador_id,
    codigo,
  }
) {
  let consulta =
    supabase
      .from(
        'pesv_indicadores_catalogo'
      )
      .select('*')
      .eq(
        'activo',
        true
      )

  if (
    indicador_id
  ) {
    consulta =
      consulta.eq(
        'id',
        indicador_id
      )
  } else if (
    codigo
  ) {
    consulta =
      consulta.eq(
        'codigo',
        mayusculas(
          codigo
        )
      )
  } else {
    throw new Error(
      'Debe indicar el indicador.'
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
    throw error
  }

  if (
    !data
  ) {
    throw new Error(
      'El indicador solicitado no existe o se encuentra inactivo.'
    )
  }

  if (
    !CODIGOS_BASICOS.includes(
      mayusculas(
        data.codigo
      )
    )
  ) {
    throw new Error(
      'El indicador no corresponde al conjunto aplicable al nivel Básico.'
    )
  }

  return data
}


async function obtenerConfiguracionIndicador(
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
    throw error
  }

  return data ||
    null
}

// ============================================================
// CÁLCULO 1 - TSV
// app/api/admin/pesv/indicadores/route.js
// API: /api/admin/pesv/indicadores
//
// INDICADOR 1 - TASA DE SINIESTROS VIALES POR NIVEL DE PÉRDIDA
//
// Fórmula normativa por cada nivel:
// TSV(n) = SV(tn) * 1.000.000 / Km(t)
//
// Niveles reportables:
// - Fatalidades: número de personas fallecidas.
// - Heridos graves: número de personas con lesión grave.
// - Heridos leves: número de personas con lesión leve.
// - Choques simples: número de siniestros sin víctimas personales.
// - Km(t): kilómetros recorridos por toda la flota.
//
// La API devuelve:
// 1. Resultado del período seleccionado.
// 2. Acumulado desde el 1 de enero hasta el corte del período.
// 3. Línea base histórica sugerida, usando el año anterior cuando
//    existen kilómetros suficientes para calcularla.
// 4. Comparación con el mismo período del año anterior cuando aplica.
//
// IMPORTANTE:
// La línea base histórica calculada es una SUGERENCIA. No reemplaza
// automáticamente la línea base configurada por el CEA. De esta forma
// los CEA sin histórico pueden registrar la línea base manualmente.
// ============================================================

function sumarKilometrosHorarios(
  horarios
) {
  return redondear(
    (horarios || []).reduce(
      (
        acumulado,
        item
      ) => {
        const inicial =
          numero(
            item?.km_inicial
          )

        const final =
          numero(
            item?.km_final
          )

        if (
          inicial === null ||
          final === null ||
          final < inicial
        ) {
          return acumulado
        }

        return acumulado +
          (
            final -
            inicial
          )
      },
      0
    ),
    1
  ) || 0
}


function resumirSiniestrosTsv(
  siniestros
) {
  const lista =
    Array.isArray(
      siniestros
    )
      ? siniestros
      : []

  let fatalidades = 0
  let heridosGraves = 0
  let heridosLeves = 0
  let choquesSimples = 0

  for (
    const item of lista
  ) {
    const fatales =
      Math.max(
        entero(
          item?.fatalidades
        ) || 0,
        0
      )

    const graves =
      Math.max(
        entero(
          item?.heridos_graves
        ) || 0,
        0
      )

    const leves =
      Math.max(
        entero(
          item?.heridos_leves
        ) || 0,
        0
      )

    fatalidades +=
      fatales

    heridosGraves +=
      graves

    heridosLeves +=
      leves

    // Un choque simple es un siniestro con solo daños materiales,
    // es decir, sin fatalidades ni personas lesionadas.
    if (
      fatales === 0 &&
      graves === 0 &&
      leves === 0
    ) {
      choquesSimples +=
        1
    }
  }

  return {
    total_registros_siniestros:
      lista.length,

    fatalidades,

    heridos_graves:
      heridosGraves,

    heridos_leves:
      heridosLeves,

    choques_simples:
      choquesSimples,

    siniestro_ids:
      lista
        .map(
          item =>
            item?.id
        )
        .filter(
          item =>
            item !== null &&
            item !== undefined
        ),
  }
}


function tasaPorMillon(
  cantidad,
  kilometros
) {
  const eventos =
    numero(
      cantidad
    )

  const km =
    numero(
      kilometros
    )

  if (
    eventos === null ||
    km === null ||
    km <= 0
  ) {
    return null
  }

  return redondear(
    (
      eventos *
      1000000
    ) /
      km,
    1
  )
}


function construirResultadoTsv(
  siniestros,
  horarios
) {
  const resumen =
    resumirSiniestrosTsv(
      siniestros
    )

  const kilometros =
    sumarKilometrosHorarios(
      horarios
    )

  const tasas = {
    fatalidades:
      tasaPorMillon(
        resumen.fatalidades,
        kilometros
      ),

    heridos_graves:
      tasaPorMillon(
        resumen.heridos_graves,
        kilometros
      ),

    heridos_leves:
      tasaPorMillon(
        resumen.heridos_leves,
        kilometros
      ),

    choques_simples:
      tasaPorMillon(
        resumen.choques_simples,
        kilometros
      ),
  }

  const totalNiveles =
    resumen.fatalidades +
    resumen.heridos_graves +
    resumen.heridos_leves +
    resumen.choques_simples

  return {
    ...resumen,

    kilometros_recorridos:
      kilometros,

    tasas_por_nivel:
      tasas,

    // Este valor global se conserva únicamente por compatibilidad
    // con la estructura actual de pesv_indicadores_mediciones.
    // El resultado normativo que debe mostrarse y analizarse es el
    // desglose de tasas_por_nivel.
    tasa_global_referencial:
      tasaPorMillon(
        totalNiveles,
        kilometros
      ),
  }
}


async function consultarDatosTsv(
  supabase,
  desde,
  hasta
) {
  const [
    resultadoSiniestros,
    resultadoHorarios,
  ] =
    await Promise.all([
      supabase
        .from(
          'siniestros'
        )
        .select(
          'id,fecha_siniestro,tipo_siniestro,heridos_leves,heridos_graves,fatalidades'
        )
        .gte(
          'fecha_siniestro',
          desde
        )
        .lte(
          'fecha_siniestro',
          hasta
        ),

      supabase
        .from(
          'horarios'
        )
        .select(
          'id,fecha_entrada,placa,km_inicial,km_final'
        )
        .gte(
          'fecha_entrada',
          desde
        )
        .lte(
          'fecha_entrada',
          hasta
        ),
    ])

  if (
    resultadoSiniestros.error
  ) {
    throw resultadoSiniestros.error
  }

  if (
    resultadoHorarios.error
  ) {
    throw resultadoHorarios.error
  }

  return construirResultadoTsv(
    resultadoSiniestros.data || [],
    resultadoHorarios.data || []
  )
}


function desplazarFechaUnAnio(
  fecha,
  diferencia = -1
) {
  const partes =
    texto(
      fecha
    ).split('-')

  if (
    partes.length !== 3
  ) {
    return null
  }

  const anio =
    Number(
      partes[0]
    ) +
    diferencia

  return `${anio}-${partes[1]}-${partes[2]}`
}


async function calcularTsv(
  supabase,
  periodo
) {
  const anio =
    Number(
      periodo.periodo_desde.slice(
        0,
        4
      )
    )

  // ----------------------------------------------------------
  // 1. PERÍODO SELECCIONADO
  // ----------------------------------------------------------

  const resultadoPeriodo =
    await consultarDatosTsv(
      supabase,
      periodo.periodo_desde,
      periodo.periodo_hasta
    )

  // ----------------------------------------------------------
  // 2. ACUMULADO DE LA VIGENCIA HASTA EL CORTE
  // ----------------------------------------------------------

  const acumuladoDesde =
    `${anio}-01-01`

  const acumuladoHasta =
    periodo.periodo_hasta

  const resultadoAcumulado =
    periodo.periodo_desde ===
      acumuladoDesde
      ? resultadoPeriodo
      : await consultarDatosTsv(
          supabase,
          acumuladoDesde,
          acumuladoHasta
        )

  // ----------------------------------------------------------
  // 3. LÍNEA BASE HISTÓRICA SUGERIDA
  // Año inmediatamente anterior completo.
  // Solo se considera disponible si existen kilómetros.
  // ----------------------------------------------------------

  const anioBase =
    anio - 1

  const resultadoLineaBase =
    await consultarDatosTsv(
      supabase,
      `${anioBase}-01-01`,
      `${anioBase}-12-31`
    )

  const lineaBaseDisponible =
    resultadoLineaBase
      .kilometros_recorridos >
    0

  // ----------------------------------------------------------
  // 4. MISMO PERÍODO DEL AÑO ANTERIOR
  // Permite comparar T1 vs T1, T2 vs T2, etc.
  // ----------------------------------------------------------

  const periodoAnteriorDesde =
    desplazarFechaUnAnio(
      periodo.periodo_desde,
      -1
    )

  const periodoAnteriorHasta =
    desplazarFechaUnAnio(
      periodo.periodo_hasta,
      -1
    )

  const resultadoPeriodoAnterior =
    periodoAnteriorDesde &&
    periodoAnteriorHasta
      ? await consultarDatosTsv(
          supabase,
          periodoAnteriorDesde,
          periodoAnteriorHasta
        )
      : null

  const comparacionDisponible =
    Boolean(
      resultadoPeriodoAnterior &&
      resultadoPeriodoAnterior
        .kilometros_recorridos >
        0
    )

  const advertencias = []

  if (
    resultadoPeriodo
      .kilometros_recorridos <=
    0
  ) {
    advertencias.push(
      'No existen kilómetros válidos registrados en horarios para el período seleccionado. No es posible calcular las tasas TSV.'
    )
  }

  if (
    !lineaBaseDisponible
  ) {
    advertencias.push(
      `No existen kilómetros suficientes del año ${anioBase} para calcular automáticamente una línea base TSV. El CEA puede registrar la línea base manualmente con soporte de sus reportes históricos.`
    )
  }

  // ----------------------------------------------------------
  // COMPATIBILIDAD CON LA TABLA ACTUAL
  // ----------------------------------------------------------
  // pesv_indicadores_mediciones conserva un solo numerador,
  // denominador y valor_resultado. Para no cambiar la estructura
  // de la base en esta etapa:
  //
  // numerador:
  // cantidad de registros de siniestros del período.
  //
  // denominador:
  // kilómetros recorridos por la flota.
  //
  // valor_resultado:
  // tasa global referencial.
  //
  // IMPORTANTE:
  // Las cuatro tasas normativas quedan conservadas íntegramente
  // en datos_calculo.tasas_por_nivel.
  // ----------------------------------------------------------

  return {
    origen_calculo:
      'AUTOMATICO',

    numerador:
      resultadoPeriodo
        .total_registros_siniestros,

    denominador:
      resultadoPeriodo
        .kilometros_recorridos,

    valor_resultado:
      resultadoPeriodo
        .tasa_global_referencial,

    unidad_resultado:
      'TASA_POR_MILLON_KM',

    datos_calculo: {
      metodologia:
        'TSV_POR_NIVEL_PERDIDA',

      constante_k:
        1000000,

      // ======================================================
      // RESULTADO DEL PERÍODO
      // ======================================================

      periodo: {
        desde:
          periodo.periodo_desde,

        hasta:
          periodo.periodo_hasta,

        ...resultadoPeriodo,
      },

      // ======================================================
      // ACUMULADO ANUAL HASTA EL CORTE
      // ======================================================

      acumulado_anual: {
        desde:
          acumuladoDesde,

        hasta:
          acumuladoHasta,

        ...resultadoAcumulado,
      },

      // ======================================================
      // LÍNEA BASE HISTÓRICA SUGERIDA
      // ======================================================

      linea_base_historica: {
        origen:
          lineaBaseDisponible
            ? 'AUTOMATICA'
            : 'NO_DISPONIBLE',

        anio:
          anioBase,

        disponible:
          lineaBaseDisponible,

        desde:
          `${anioBase}-01-01`,

        hasta:
          `${anioBase}-12-31`,

        ...resultadoLineaBase,
      },

      // ======================================================
      // MISMO PERÍODO DEL AÑO ANTERIOR
      // ======================================================

      comparacion_mismo_periodo_anterior: {
        disponible:
          comparacionDisponible,

        desde:
          periodoAnteriorDesde,

        hasta:
          periodoAnteriorHasta,

        ...(resultadoPeriodoAnterior || {}),
      },

      // ======================================================
      // ALIAS TEMPORALES
      // Compatibilidad con MedicionIndicadores.jsx actual.
      // ======================================================

      total_siniestros:
        resultadoPeriodo
          .total_registros_siniestros,

      kilometros_recorridos:
        resultadoPeriodo
          .kilometros_recorridos,

      siniestros_sin_lesionados:
        resultadoPeriodo
          .choques_simples,

      siniestros_con_heridos_leves:
        resultadoPeriodo
          .heridos_leves,

      siniestros_con_heridos_graves:
        resultadoPeriodo
          .heridos_graves,

      siniestros_con_fatalidades:
        resultadoPeriodo
          .fatalidades,

      siniestro_ids:
        resultadoPeriodo
          .siniestro_ids,
    },

    advertencias,
  }
}


// ============================================================
// CÁLCULO 3.1 - RSVI
// app/admin/pesv/indicadores/page.jsx
// API: /api/admin/pesv/indicadores
//
// La Resolución exige comparar inicio y final del año.
// La base actual no conserva una fotografía explícita de los
// riesgos existentes al 1 de enero. Por eso queda ASISTIDO.
// ============================================================

async function calcularRsvi(
  supabase,
  periodo
) {
  const anio =
    Number(
      periodo.periodo_desde.slice(
        0,
        4
      )
    )

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_riesgos'
      )
      .select(
        'id,codigo,fecha_identificacion,activo,estado'
      )
      .eq(
        'anio',
        anio
      )

  if (
    error
  ) {
    throw error
  }

  const riesgos =
    data ||
    []

  return {
    origen_calculo:
      'ASISTIDO',

    numerador:
      null,

    denominador:
      null,

    valor_resultado:
      null,

    unidad_resultado:
      'CANTIDAD',

    datos_calculo: {
      riesgos_registrados_vigencia:
        riesgos.length,

      riesgo_ids:
        riesgos.map(
          item =>
            item.id
        ),
    },

    advertencias: [
      'RSVI requiere comparar los riesgos identificados al inicio y al final del año. La base actual no conserva una fotografía explícita al 1 de enero, por lo que las variables deben ser validadas por el responsable PESV.',
    ],
  }
}


// ============================================================
// CÁLCULO 3.2 - GRV
// app/admin/pesv/indicadores/page.jsx
// API: /api/admin/pesv/indicadores
//
// Compara riesgos CRÍTICOS de valoración inicial contra la
// valoración más reciente de cada riesgo durante la vigencia.
// ============================================================

async function calcularGrv(
  supabase,
  periodo
) {
  const anio =
    Number(
      periodo.periodo_desde.slice(
        0,
        4
      )
    )

  const {
    data:
      riesgos,
    error:
      errorRiesgos,
  } =
    await supabase
      .from(
        'pesv_riesgos'
      )
      .select(
        'id,codigo,nivel_riesgo,valor_nivel_riesgo'
      )
      .eq(
        'anio',
        anio
      )

  if (
    errorRiesgos
  ) {
    throw errorRiesgos
  }

  const listaRiesgos =
    riesgos ||
    []

  if (
    listaRiesgos.length ===
    0
  ) {
    return {
      origen_calculo:
        'AUTOMATICO',

      numerador:
        0,

      denominador:
        0,

      valor_resultado:
        0,

      unidad_resultado:
        'CANTIDAD',

      datos_calculo: {
        riesgos_valorados:
          0,

        riesgos_criticos_inicial:
          0,

        riesgos_criticos_final:
          0,
      },

      advertencias:
        [],
    }
  }

  const ids =
    listaRiesgos.map(
      item =>
        item.id
    )

  const {
    data:
      seguimientos,
    error:
      errorSeguimientos,
  } =
    await supabase
      .from(
        'pesv_riesgos_seguimientos'
      )
      .select(
        'id,riesgo_id,fecha_seguimiento,numero_valoracion,nivel_riesgo,valor_nivel_riesgo'
      )
      .in(
        'riesgo_id',
        ids
      )
      .lte(
        'fecha_seguimiento',
        periodo.periodo_hasta
      )
      .order(
        'fecha_seguimiento',
        {
          ascending:
            true,
        }
      )
      .order(
        'numero_valoracion',
        {
          ascending:
            true,
        }
      )
      .order(
        'id',
        {
          ascending:
            true,
        }
      )

  if (
    errorSeguimientos
  ) {
    throw errorSeguimientos
  }

  const ultimoPorRiesgo =
    new Map()

  ;(
    seguimientos ||
    []
  ).forEach(
    item => {
      ultimoPorRiesgo.set(
        String(
          item.riesgo_id
        ),
        item
      )
    }
  )

  const esCritico =
    item => {
      const nivel =
        mayusculas(
          item?.nivel_riesgo
        )

      if (
        nivel ===
        'CRITICO'
      ) {
        return true
      }

      const nr =
        numero(
          item?.valor_nivel_riesgo
        )

      return (
        nr !== null &&
        nr >= 6
      )
    }

  const inicial =
    listaRiesgos.filter(
      esCritico
    ).length

  const final =
    listaRiesgos.filter(
      riesgo => {
        const ultimo =
          ultimoPorRiesgo.get(
            String(
              riesgo.id
            )
          )

        return esCritico(
          ultimo ||
          riesgo
        )
      }
    ).length

  const diferencia =
    final -
    inicial

  return {
    origen_calculo:
      'AUTOMATICO',

    numerador:
      final,

    denominador:
      inicial,

    valor_resultado:
      diferencia,

    unidad_resultado:
      'CANTIDAD',

    datos_calculo: {
      riesgos_valorados:
        listaRiesgos.length,

      riesgos_criticos_inicial:
        inicial,

      riesgos_criticos_final:
        final,

      diferencia,

      riesgo_ids:
        ids,
    },

    advertencias:
      [],
  }
}


// ============================================================
// CÁLCULO 4 - CM PESV
// app/admin/pesv/indicadores/page.jsx
// API: /api/admin/pesv/indicadores
//
// pesv_metas actualmente conserva definición y estado
// administrativo, pero no un resultado histórico de logro.
// Por eso el cálculo queda ASISTIDO.
// ============================================================

async function calcularCmPesv(
  supabase,
  periodo
) {
  const anio =
    Number(
      periodo.periodo_desde.slice(
        0,
        4
      )
    )

  const {
    data:
      objetivos,
    error:
      errorObjetivos,
  } =
    await supabase
      .from(
        'pesv_objetivos'
      )
      .select(
        'id'
      )
      .eq(
        'anio',
        anio
      )

  if (
    errorObjetivos
  ) {
    throw errorObjetivos
  }

  const idsObjetivos =
    (
      objetivos ||
      []
    ).map(
      item =>
        item.id
    )

  let metas = []

  if (
    idsObjetivos.length >
    0
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
          'id,codigo,descripcion,fecha_limite,estado,valor_meta,operador_meta,unidad_medida'
        )
        .in(
          'objetivo_id',
          idsObjetivos
        )
        .lte(
          'fecha_limite',
          periodo.periodo_hasta
        )

    if (
      error
    ) {
      throw error
    }

    metas =
      data ||
      []
  }

  return {
    origen_calculo:
      'ASISTIDO',

    numerador:
      null,

    denominador:
      metas.length,

    valor_resultado:
      null,

    unidad_resultado:
      'PORCENTAJE',

    datos_calculo: {
      metas_definidas_periodo:
        metas.length,

      meta_ids:
        metas.map(
          item =>
            item.id
        ),
    },

    advertencias: [
      'La tabla pesv_metas define la meta pero no almacena todavía un resultado histórico de logro por período. El número de metas alcanzadas debe ser validado al registrar la medición.',
    ],
  }
}

// ============================================================
// CÁLCULO 5 - CPLAN PESV
// app/admin/pesv/indicadores/page.jsx
// API: /api/admin/pesv/indicadores
// ============================================================

async function calcularCplanPesv(
  supabase,
  periodo
) {
  const anio =
    Number(
      periodo.periodo_desde.slice(
        0,
        4
      )
    )

  const {
    data:
      planes,
    error:
      errorPlanes,
  } =
    await supabase
      .from(
        'pesv_planes_trabajo'
      )
      .select(
        'id,anio'
      )
      .eq(
        'anio',
        anio
      )

  if (
    errorPlanes
  ) {
    throw errorPlanes
  }

  const planIds =
    (
      planes ||
      []
    ).map(
      item =>
        item.id
    )

  if (
    planIds.length ===
    0
  ) {
    return {
      origen_calculo:
        'AUTOMATICO',

      numerador:
        0,

      denominador:
        0,

      valor_resultado:
        null,

      unidad_resultado:
        'PORCENTAJE',

      datos_calculo: {
        metodologia:
          'CPLAN_POR_ACTIVIDAD_Y_CORTES_TRIMESTRALES',

        actividades_programadas:
          0,

        actividades_ejecutadas:
          0,

        detalle_trimestres:
          [],
      },

      advertencias: [
        'No existe Plan Anual de Trabajo PESV para la vigencia seleccionada.',
      ],
    }
  }

  const {
    data:
      actividadesData,
    error:
      errorActividades,
  } =
    await supabase
      .from(
        'pesv_plan_trabajo_actividades'
      )
      .select(
        'id,plan_trabajo_id,codigo,actividad'
      )
      .in(
        'plan_trabajo_id',
        planIds
      )

  if (
    errorActividades
  ) {
    throw errorActividades
  }

  const actividades =
    actividadesData ||
    []

  if (
    actividades.length ===
    0
  ) {
    return {
      origen_calculo:
        'AUTOMATICO',

      numerador:
        0,

      denominador:
        0,

      valor_resultado:
        null,

      unidad_resultado:
        'PORCENTAJE',

      datos_calculo: {
        metodologia:
          'CPLAN_POR_ACTIVIDAD_Y_CORTES_TRIMESTRALES',

        actividades_programadas:
          0,

        actividades_ejecutadas:
          0,

        detalle_trimestres:
          [],
      },

      advertencias: [
        'El Plan Anual de Trabajo PESV no tiene actividades registradas.',
      ],
    }
  }

  const actividadIds =
    actividades.map(
      item =>
        item.id
    )

  const {
    data:
      cortesData,
    error:
      errorCortes,
  } =
    await supabase
      .from(
        'pesv_plan_trabajo_cortes'
      )
      .select(
        'id,actividad_id,anio,mes,trimestre,fecha_corte,estado,fecha_ejecucion'
      )
      .in(
        'actividad_id',
        actividadIds
      )
      .eq(
        'anio',
        anio
      )
      .order(
        'trimestre',
        {
          ascending:
            true,
        }
      )
      .order(
        'mes',
        {
          ascending:
            true,
        }
      )

  if (
    errorCortes
  ) {
    throw errorCortes
  }

  const cortes =
    cortesData ||
    []

  const cortesPorActividad =
    new Map()

  cortes.forEach(
    corte => {
      const clave =
        String(
          corte.actividad_id
        )

      if (
        !cortesPorActividad.has(
          clave
        )
      ) {
        cortesPorActividad.set(
          clave,
          []
        )
      }

      cortesPorActividad
        .get(
          clave
        )
        .push(
          corte
        )
    }
  )

  const calcularTrimestreCplan =
    trimestre => {
      const evaluaciones =
        actividades
          .map(
            actividad => {
              const cortesTrimestre =
                (
                  cortesPorActividad.get(
                    String(
                      actividad.id
                    )
                  ) ||
                  []
                ).filter(
                  corte =>
                    entero(
                      corte?.trimestre
                    ) ===
                    Number(
                      trimestre
                    )
                )

              if (
                cortesTrimestre.length ===
                0
              ) {
                return null
              }

              const ejecutada =
                cortesTrimestre.every(
                  corte =>
                    mayusculas(
                      corte?.estado
                    ) ===
                    'EJECUTADA'
                )

              return {
                id:
                  actividad.id,

                codigo:
                  texto(
                    actividad.codigo
                  ) ||
                  null,

                actividad:
                  texto(
                    actividad.actividad
                  ),

                trimestre:
                  Number(
                    trimestre
                  ),

                incluida_applan:
                  true,

                incluida_aeplan:
                  ejecutada,

                total_cortes:
                  cortesTrimestre.length,

                cortes_ejecutados:
                  cortesTrimestre.filter(
                    corte =>
                      mayusculas(
                        corte?.estado
                      ) ===
                      'EJECUTADA'
                  ).length,

                cortes:
                  cortesTrimestre.map(
                    corte => ({
                      id:
                        corte.id,

                      mes:
                        entero(
                          corte.mes
                        ),

                      trimestre:
                        entero(
                          corte.trimestre
                        ),

                      fecha_corte:
                        corte.fecha_corte ||
                        null,

                      estado:
                        mayusculas(
                          corte.estado
                        ) ||
                        'PROGRAMADA',

                      fecha_ejecucion:
                        corte.fecha_ejecucion ||
                        null,
                    })
                  ),
              }
            }
          )
          .filter(
            Boolean
          )

      const programadas =
        evaluaciones.length

      const ejecutadas =
        evaluaciones.filter(
          item =>
            item.incluida_aeplan
        ).length

      return {
        trimestre:
          Number(
            trimestre
          ),

        actividades_programadas:
          programadas,

        actividades_ejecutadas:
          ejecutadas,

        actividades_no_ejecutadas:
          Math.max(
            programadas -
            ejecutadas,
            0
          ),

        valor_resultado:
          porcentaje(
            ejecutadas,
            programadas
          ),

        actividades:
          evaluaciones,
      }
    }

  let trimestresIncluidos =
    []

  if (
    periodo.tipo_periodo ===
    'TRIMESTRE'
  ) {
    trimestresIncluidos =
      Array.from(
        {
          length:
            periodo.numero_periodo,
        },
        (
          _,
          index
        ) =>
          index + 1
      )
  } else if (
    periodo.tipo_periodo ===
    'ANUAL'
  ) {
    trimestresIncluidos =
      [
        1,
        2,
        3,
        4,
      ]
  } else {
    throw new Error(
      'CPLAN_PESV admite mediciones TRIMESTRALES y ANUALES.'
    )
  }

  const detalleTrimestres =
    trimestresIncluidos.map(
      trimestre =>
        calcularTrimestreCplan(
          trimestre
        )
    )

  const trimestreSeleccionado =
    periodo.tipo_periodo ===
    'TRIMESTRE'
      ? detalleTrimestres.find(
          item =>
            item.trimestre ===
            periodo.numero_periodo
        ) ||
        null
      : null

  const acumuladoProgramadas =
    detalleTrimestres.reduce(
      (
        total,
        item
      ) =>
        total +
        item.actividades_programadas,
      0
    )

  const acumuladoEjecutadas =
    detalleTrimestres.reduce(
      (
        total,
        item
      ) =>
        total +
        item.actividades_ejecutadas,
      0
    )

  const principal =
    periodo.tipo_periodo ===
    'TRIMESTRE'
      ? trimestreSeleccionado
      : {
          actividades_programadas:
            acumuladoProgramadas,

          actividades_ejecutadas:
            acumuladoEjecutadas,

          valor_resultado:
            porcentaje(
              acumuladoEjecutadas,
              acumuladoProgramadas
            ),
        }

  const actividadesSinCortes =
    actividades.filter(
      actividad =>
        (
          cortesPorActividad.get(
            String(
              actividad.id
            )
          ) ||
          []
        ).length ===
        0
    )

  const advertencias =
    []

  if (
    actividadesSinCortes.length >
    0
  ) {
    advertencias.push(
      `${actividadesSinCortes.length} actividad(es) no tienen cortes de seguimiento generados y no participan en APPlan(t) ni AEPlan(t).`
    )
  }

  if (
    principal.actividades_programadas ===
    0
  ) {
    advertencias.push(
      periodo.tipo_periodo ===
        'TRIMESTRE'
        ? `No existen actividades con cortes programados para el trimestre ${periodo.numero_periodo}.`
        : 'No existen actividades con cortes programados en la vigencia.'
    )
  }

  return {
    origen_calculo:
      'AUTOMATICO',

    numerador:
      principal.actividades_ejecutadas,

    denominador:
      principal.actividades_programadas,

    valor_resultado:
      principal.valor_resultado,

    unidad_resultado:
      'PORCENTAJE',

    datos_calculo: {
      codigo_indicador:
        'CPLAN_PESV',

      formula:
        'CPlan PESV = AEPlan(t) / APPlan(t) * 100',

      metodologia:
        'CPLAN_POR_ACTIVIDAD_Y_CORTES_TRIMESTRALES',

      criterio_applan:
        'Una actividad cuenta una sola vez en APPlan(t) cuando tiene al menos un corte programado en el trimestre evaluado.',

      criterio_aeplan:
        'Una actividad incluida en APPlan(t) cuenta una sola vez en AEPlan(t) cuando todos sus cortes del trimestre evaluado están en estado EJECUTADA.',

      criterio_acumulado:
        'El acumulado suma las participaciones trimestrales programadas y ejecutadas desde T1 hasta el período de corte.',

      actividades_programadas:
        principal.actividades_programadas,

      actividades_ejecutadas:
        principal.actividades_ejecutadas,

      actividad_ids_programadas:
        periodo.tipo_periodo ===
        'TRIMESTRE'
          ? (
              trimestreSeleccionado
                ?.actividades ||
              []
            ).map(
              item =>
                item.id
            )
          : [],

      actividad_ids_ejecutadas:
        periodo.tipo_periodo ===
        'TRIMESTRE'
          ? (
              trimestreSeleccionado
                ?.actividades ||
              []
            )
              .filter(
                item =>
                  item.incluida_aeplan
              )
              .map(
                item =>
                  item.id
              )
          : [],

      detalle_actividades:
        periodo.tipo_periodo ===
        'TRIMESTRE'
          ? trimestreSeleccionado
              ?.actividades ||
            []
          : [],

      acumulado: {
        trimestres:
          trimestresIncluidos,

        actividades_programadas:
          acumuladoProgramadas,

        actividades_ejecutadas:
          acumuladoEjecutadas,

        valor_resultado:
          porcentaje(
            acumuladoEjecutadas,
            acumuladoProgramadas
          ),
      },

      detalle_trimestres:
        detalleTrimestres.map(
          item => ({
            trimestre:
              item.trimestre,

            actividades_programadas:
              item.actividades_programadas,

            actividades_ejecutadas:
              item.actividades_ejecutadas,

            actividades_no_ejecutadas:
              item.actividades_no_ejecutadas,

            valor_resultado:
              item.valor_resultado,
          })
        ),

      actividades_sin_cortes:
        actividadesSinCortes.map(
          item => ({
            id:
              item.id,

            codigo:
              texto(
                item.codigo
              ) ||
              null,

            actividad:
              texto(
                item.actividad
              ),
          })
        ),
    },

    advertencias,
  }
}


// ============================================================
// CÁLCULO 6 - EJLC
// app/admin/pesv/indicadores/page.jsx
// API: /api/admin/pesv/indicadores
//
// No se fija un límite de jornada dentro de esta API.
// La duración máxima debe provenir de una regla configurable
// o de la norma laboral vigente aplicable.
// ============================================================

async function calcularEjlc(
  supabase,
  periodo
) {
  const {
    data:
      personal,
    error:
      errorPersonal,
  } =
    await supabase
      .from(
        'personal'
      )
      .select(
        'id,documento,nombres,apellidos,rol_conductor_instructor,estado'
      )
      .eq(
        'rol_conductor_instructor',
        true
      )

  if (
    errorPersonal
  ) {
    throw errorPersonal
  }

  const documentos =
    (
      personal ||
      []
    )
      .map(
        item =>
          texto(
            item.documento
          )
      )
      .filter(
        Boolean
      )

  const {
    data:
      jornadas,
    error:
      errorJornadas,
  } =
    await supabase
      .from(
        'horarios'
      )
      .select(
        'id,fecha_entrada,usuario,nombre_completo,rol,duracion_jornada'
      )
      .gte(
        'fecha_entrada',
        periodo.periodo_desde
      )
      .lte(
        'fecha_entrada',
        periodo.periodo_hasta
      )

  if (
    errorJornadas
  ) {
    throw errorJornadas
  }

  return {
    origen_calculo:
      'ASISTIDO',

    numerador:
      null,

    denominador:
      (
        jornadas ||
        []
      ).length,

    valor_resultado:
      null,

    unidad_resultado:
      'PORCENTAJE',

    datos_calculo: {
      conductores_instructores_identificados:
        (
          personal ||
          []
        ).length,

      documentos_personal:
        documentos,

      jornadas_registradas_periodo:
        (
          jornadas ||
          []
        ).length,

      jornada_ids:
        (
          jornadas ||
          []
        ).map(
          item =>
            item.id
        ),
    },

    advertencias: [
      'El sistema dispone de la duración de jornada, pero no se debe fijar en esta API un límite máximo sin una configuración explícita. El número de jornadas excedidas debe ser validado hasta definir ese parámetro.',
    ],
  }
}


// ============================================================
// CÁLCULO 9 - IDP
// app/admin/pesv/indicadores/page.jsx
// API: /api/admin/pesv/indicadores
//
// Se compara cada vehículo/día trabajado contra la existencia
// de una inspección preoperacional para esa misma placa/fecha.
// ============================================================

async function calcularIdp(
  supabase,
  periodo
) {
  const [
    resultadoHorarios,
    resultadoPreoperacionales,
  ] =
    await Promise.all([
      supabase
        .from(
          'horarios'
        )
        .select(
          'id,fecha_entrada,placa'
        )
        .gte(
          'fecha_entrada',
          periodo.periodo_desde
        )
        .lte(
          'fecha_entrada',
          periodo.periodo_hasta
        ),

      supabase
        .from(
          'preoperacionales'
        )
        .select(
          'id,fecha_registro,placa'
        )
        .gte(
          'fecha_registro',
          periodo.periodo_desde
        )
        .lte(
          'fecha_registro',
          periodo.periodo_hasta
        ),
    ])

  if (
    resultadoHorarios.error
  ) {
    throw resultadoHorarios.error
  }

  if (
    resultadoPreoperacionales.error
  ) {
    throw resultadoPreoperacionales.error
  }

  const trabajados =
    new Map()

  ;(
    resultadoHorarios.data ||
    []
  ).forEach(
    item => {
      const fecha =
        texto(
          item?.fecha_entrada
        )

      const placa =
        mayusculas(
          item?.placa
        )

      if (
        fecha &&
        placa
      ) {
        trabajados.set(
          `${fecha}|${placa}`,
          {
            fecha,
            placa,
          }
        )
      }
    }
  )

  const inspeccionados =
    new Set()

  ;(
    resultadoPreoperacionales.data ||
    []
  ).forEach(
    item => {
      const fecha =
        texto(
          item?.fecha_registro
        )

      const placa =
        mayusculas(
          item?.placa
        )

      if (
        fecha &&
        placa
      ) {
        inspeccionados.add(
          `${fecha}|${placa}`
        )
      }
    }
  )

  let vehiculoDiasInspeccionados =
    0

  trabajados.forEach(
    (
      _,
      clave
    ) => {
      if (
        inspeccionados.has(
          clave
        )
      ) {
        vehiculoDiasInspeccionados +=
          1
      }
    }
  )

  const totalVehiculoDias =
    trabajados.size

  return {
    origen_calculo:
      'AUTOMATICO',

    numerador:
      vehiculoDiasInspeccionados,

    denominador:
      totalVehiculoDias,

    valor_resultado:
      porcentaje(
        vehiculoDiasInspeccionados,
        totalVehiculoDias
      ),

    unidad_resultado:
      'PORCENTAJE',

    datos_calculo: {
      vehiculo_dias_trabajados:
        totalVehiculoDias,

      vehiculo_dias_inspeccionados:
        vehiculoDiasInspeccionados,

      vehiculo_dias_sin_inspeccion:
        Math.max(
          totalVehiculoDias -
          vehiculoDiasInspeccionados,
          0
        ),

      claves_trabajo:
        [
          ...trabajados.keys(),
        ],

      claves_inspeccion:
        [
          ...inspeccionados,
        ],
    },

    advertencias:
      [],
  }
}


// ============================================================
// CÁLCULO 10 - CPMVH
// app/admin/pesv/indicadores/page.jsx
// API: /api/admin/pesv/indicadores
//
// Fuente de verdad:
// /api/admin/mantenimientos/plan-mantenimiento
//
// PROGRAMADOS = PROGRAMADO + EJECUTADO + VENCIDO
// EJECUTADOS  = EJECUTADO
//
// Los mantenimientos correctivos no forman parte del cálculo.
// ============================================================

async function calcularCpmvh(
  supabase,
  periodo,
  contexto = {}
) {
  const anio =
    Number(
      periodo.periodo_desde.slice(
        0,
        4
      )
    )

  const anioHasta =
    Number(
      periodo.periodo_hasta.slice(
        0,
        4
      )
    )

  if (
    !anio ||
    anio !== anioHasta
  ) {
    throw new Error(
      'El período del indicador CPMVH debe pertenecer a una sola vigencia.'
    )
  }

  const request =
    contexto?.request ||
    null

  const body =
    contexto?.body ||
    {}

  const nit =
    texto(
      contexto?.nit ||
      body?.nit ||
      request?.headers?.get(
        'x-cea-nit'
      ) ||
      ''
    )

  if (
    !request ||
    !nit
  ) {
    throw new Error(
      'No fue posible identificar la empresa para calcular el indicador CPMVH.'
    )
  }

  const urlActual =
    new URL(
      request.url
    )

  const urlPlan =
    new URL(
      '/api/admin/mantenimientos/plan-mantenimiento',
      urlActual.origin
    )

  urlPlan.searchParams.set(
    'vigencia',
    String(
      anio
    )
  )

  const respuestaPlan =
    await fetch(
      urlPlan.toString(),
      {
        method:
          'GET',

        headers: {
          'x-cea-nit':
            nit,
        },

        cache:
          'no-store',
      }
    )

  const plan =
    await respuestaPlan
      .json()
      .catch(
        () => ({})
      )

  if (
    !respuestaPlan.ok ||
    plan?.status !==
      'success'
  ) {
    throw new Error(
      plan?.message ||
      plan?.error ||
      'No fue posible consultar el Plan de Mantenimiento para calcular CPMVH.'
    )
  }

  const vehiculos =
    Array.isArray(
      plan?.vehiculos
    )
      ? plan.vehiculos
      : []

  const meses = [
    'ENE',
    'FEB',
    'MAR',
    'ABR',
    'MAY',
    'JUN',
    'JUL',
    'AGO',
    'SEP',
    'OCT',
    'NOV',
    'DIC',
  ]

  const mesDesde =
    Number(
      periodo.periodo_desde.slice(
        5,
        7
      )
    )

  const mesHasta =
    Number(
      periodo.periodo_hasta.slice(
        5,
        7
      )
    )

  const detalleMeses = []

  let totalProgramados =
    0

  let totalEjecutados =
    0

  let totalVencidos =
    0

  let totalPendientes =
    0

  const puntosProgramados =
    []

  const puntosEjecutados =
    []

  const puntosVencidos =
    []

  for (
    let numeroMes = mesDesde;
    numeroMes <= mesHasta;
    numeroMes += 1
  ) {
    const nombreMes =
      meses[
        numeroMes - 1
      ]

    let programadosMes =
      0

    let ejecutadosMes =
      0

    let vencidosMes =
      0

    let pendientesMes =
      0

    for (
      const vehiculo of
        vehiculos
    ) {
      const mes =
        vehiculo
          ?.meses
          ?.[
            nombreMes
          ] ||
        {}

      const pendientes =
        Array.isArray(
          mes?.programados
        )
          ? mes.programados
          : []

      const ejecutados =
        Array.isArray(
          mes?.ejecutados
        )
          ? mes.ejecutados
          : []

      const vencidos =
        Array.isArray(
          mes?.vencidos
        )
          ? mes.vencidos
          : []

      const programados =
        pendientes.length +
        ejecutados.length +
        vencidos.length

      programadosMes +=
        programados

      ejecutadosMes +=
        ejecutados.length

      vencidosMes +=
        vencidos.length

      pendientesMes +=
        pendientes.length

      const placa =
        texto(
          vehiculo
            ?.vehiculo
            ?.placa
        )

      for (
        const punto of
          pendientes
      ) {
        puntosProgramados.push({
          vehiculo_id:
            vehiculo
              ?.vehiculo
              ?.id ||
            punto
              ?.vehiculo_id ||
            null,

          placa:
            placa ||
            texto(
              punto?.placa
            ) ||
            null,

          punto:
            entero(
              punto?.punto ||
              punto?.ciclo
            ),

          estado:
            'PROGRAMADO',

          mes:
            numeroMes,

          mes_nombre:
            nombreMes,

          fecha:
            texto(
              punto
                ?.fecha_proyectada
            ) ||
            null,

          km_objetivo:
            numero(
              punto
                ?.km_objetivo
            ),
        })
      }

      for (
        const punto of
          ejecutados
      ) {
        puntosEjecutados.push({
          vehiculo_id:
            vehiculo
              ?.vehiculo
              ?.id ||
            punto
              ?.vehiculo_id ||
            null,

          placa:
            placa ||
            texto(
              punto?.placa
            ) ||
            null,

          punto:
            entero(
              punto?.punto ||
              punto?.ciclo
            ),

          estado:
            'EJECUTADO',

          mes:
            numeroMes,

          mes_nombre:
            nombreMes,

          fecha:
            texto(
              punto
                ?.fecha_ejecucion
            ) ||
            null,

          km_ejecucion:
            numero(
              punto
                ?.km_ejecucion
            ),

          mantenimiento_id:
            punto
              ?.mantenimiento_id ||
            null,
        })
      }

      for (
        const punto of
          vencidos
      ) {
        puntosVencidos.push({
          vehiculo_id:
            vehiculo
              ?.vehiculo
              ?.id ||
            punto
              ?.vehiculo_id ||
            null,

          placa:
            placa ||
            texto(
              punto?.placa
            ) ||
            null,

          punto:
            entero(
              punto?.punto ||
              punto?.ciclo
            ),

          estado:
            'VENCIDO',

          mes:
            numeroMes,

          mes_nombre:
            nombreMes,

          fecha:
            texto(
              punto
                ?.fecha_vencimiento ||
              punto
                ?.fecha_debio_realizarse
            ) ||
            null,

          km_objetivo:
            numero(
              punto
                ?.km_objetivo ||
              punto
                ?.km_debio_realizarse
            ),

          justificacion:
            texto(
              punto
                ?.justificacion_vencimiento
            ) ||
            null,
        })
      }
    }

    totalProgramados +=
      programadosMes

    totalEjecutados +=
      ejecutadosMes

    totalVencidos +=
      vencidosMes

    totalPendientes +=
      pendientesMes

    detalleMeses.push({
      mes:
        numeroMes,

      mes_nombre:
        nombreMes,

      programados:
        programadosMes,

      ejecutados:
        ejecutadosMes,

      vencidos:
        vencidosMes,

      pendientes:
        pendientesMes,

      resultado:
        porcentaje(
          ejecutadosMes,
          programadosMes
        ),
    })
  }

  const advertencias =
    []

  if (
    vehiculos.length ===
    0
  ) {
    advertencias.push(
      'No se encontraron vehículos con un Plan de Mantenimiento finalizado para la vigencia consultada.'
    )
  }

  if (
    totalProgramados ===
    0
  ) {
    advertencias.push(
      'No existen mantenimientos preventivos programados en el período seleccionado; el porcentaje CPMVH no puede calcularse.'
    )
  }

  return {
    origen_calculo:
      'AUTOMATICO',

    numerador:
      totalEjecutados,

    denominador:
      totalProgramados,

    valor_resultado:
      porcentaje(
        totalEjecutados,
        totalProgramados
      ),

    unidad_resultado:
      'PORCENTAJE',

    datos_calculo: {
      vigencia:
        anio,

      periodo_desde:
        periodo.periodo_desde,

      periodo_hasta:
        periodo.periodo_hasta,

      vehiculos_incluidos:
        vehiculos.length,

      mantenimientos_preventivos_programados:
        totalProgramados,

      mantenimientos_preventivos_ejecutados:
        totalEjecutados,

      mantenimientos_preventivos_vencidos:
        totalVencidos,

      mantenimientos_preventivos_pendientes:
        totalPendientes,

      formula:
        '(MANTENIMIENTOS PREVENTIVOS EJECUTADOS / MANTENIMIENTOS PREVENTIVOS PROGRAMADOS) × 100',

      criterio_denominador:
        'PROGRAMADOS = PENDIENTES + EJECUTADOS + VENCIDOS',

      fuente:
        'PLAN_DE_MANTENIMIENTO',

      detalle_mensual:
        detalleMeses,

      puntos_programados:
        puntosProgramados,

      puntos_ejecutados:
        puntosEjecutados,

      puntos_vencidos:
        puntosVencidos,
    },

    advertencias,
  }
}

// ============================================================
// CÁLCULO 11 - CUMPLIMIENTO PLAN DE FORMACIÓN
// app/admin/pesv/indicadores/page.jsx
// API: /api/admin/pesv/indicadores
// ============================================================

async function calcularCumplimientoFormacion(
  supabase,
  periodo
) {
  const anio =
    Number(
      periodo.periodo_desde.slice(
        0,
        4
      )
    )

  const {
    data:
      planes,
    error:
      errorPlanes,
  } =
    await supabase
      .from(
        'pesv_planes_formacion'
      )
      .select(
        'id'
      )
      .eq(
        'anio',
        anio
      )

  if (
    errorPlanes
  ) {
    throw errorPlanes
  }

  const planIds =
    (
      planes ||
      []
    ).map(
      item =>
        item.id
    )

  if (
    planIds.length ===
    0
  ) {
    return {
      origen_calculo:
        'AUTOMATICO',

      numerador:
        0,

      denominador:
        0,

      valor_resultado:
        null,

      unidad_resultado:
        'PORCENTAJE',

      datos_calculo: {
        capacitaciones_programadas:
          0,

        capacitaciones_ejecutadas:
          0,
      },

      advertencias: [
        'No existe Plan de Formación PESV para la vigencia seleccionada.',
      ],
    }
  }

  const {
    data:
      actividades,
    error:
      errorActividades,
  } =
    await supabase
      .from(
        'pesv_plan_formacion_actividades'
      )
      .select(
        'id,fecha_programada,estado'
      )
      .in(
        'plan_formacion_id',
        planIds
      )
      .gte(
        'fecha_programada',
        periodo.periodo_desde
      )
      .lte(
        'fecha_programada',
        periodo.periodo_hasta
      )

  if (
    errorActividades
  ) {
    throw errorActividades
  }

  const lista =
    actividades ||
    []

  if (
    lista.length ===
    0
  ) {
    return {
      origen_calculo:
        'AUTOMATICO',

      numerador:
        0,

      denominador:
        0,

      valor_resultado:
        null,

      unidad_resultado:
        'PORCENTAJE',

      datos_calculo: {
        capacitaciones_programadas:
          0,

        capacitaciones_ejecutadas:
          0,
      },

      advertencias:
        [],
    }
  }

  const actividadIds =
    lista.map(
      item =>
        item.id
    )

  const {
    data:
      ejecuciones,
    error:
      errorEjecuciones,
  } =
    await supabase
      .from(
        'pesv_plan_formacion_ejecuciones'
      )
      .select(
        'id,actividad_id,fecha_ejecucion'
      )
      .in(
        'actividad_id',
        actividadIds
      )
      .gte(
        'fecha_ejecucion',
        periodo.periodo_desde
      )
      .lte(
        'fecha_ejecucion',
        periodo.periodo_hasta
      )

  if (
    errorEjecuciones
  ) {
    throw errorEjecuciones
  }

  const actividadesEjecutadas =
    new Set(
      (
        ejecuciones ||
        []
      ).map(
        item =>
          String(
            item.actividad_id
          )
      )
    )

  lista.forEach(
    item => {
      if (
        incluyeEstadoEjecutado(
          item?.estado
        )
      ) {
        actividadesEjecutadas.add(
          String(
            item.id
          )
        )
      }
    }
  )

  return {
    origen_calculo:
      'AUTOMATICO',

    numerador:
      actividadesEjecutadas.size,

    denominador:
      lista.length,

    valor_resultado:
      porcentaje(
        actividadesEjecutadas.size,
        lista.length
      ),

    unidad_resultado:
      'PORCENTAJE',

    datos_calculo: {
      capacitaciones_programadas:
        lista.length,

      capacitaciones_ejecutadas:
        actividadesEjecutadas.size,

      actividad_ids_programadas:
        actividadIds,

      actividad_ids_ejecutadas:
        [
          ...actividadesEjecutadas,
        ].map(
          item =>
            Number(
              item
            )
        ),

      ejecucion_ids:
        (
          ejecuciones ||
          []
        ).map(
          item =>
            item.id
        ),
    },

    advertencias:
      [],
  }
}


// ============================================================
// CÁLCULO 12 - COBERTURA PLAN DE FORMACIÓN
// app/admin/pesv/indicadores/page.jsx
// API: /api/admin/pesv/indicadores
// ============================================================

async function calcularCoberturaFormacion(
  supabase,
  periodo
) {
  const {
    data:
      ejecuciones,
    error:
      errorEjecuciones,
  } =
    await supabase
      .from(
        'pesv_plan_formacion_ejecuciones'
      )
      .select(
        'id,reunion_id,fecha_ejecucion'
      )
      .gte(
        'fecha_ejecucion',
        periodo.periodo_desde
      )
      .lte(
        'fecha_ejecucion',
        periodo.periodo_hasta
      )
      .not(
        'reunion_id',
        'is',
        null
      )

  if (
    errorEjecuciones
  ) {
    throw errorEjecuciones
  }

  const reunionIds =
    [
      ...new Set(
        (
          ejecuciones ||
          []
        )
          .map(
            item =>
              texto(
                item.reunion_id
              )
          )
          .filter(
            Boolean
          )
      ),
    ]

  let asistencias = []

  if (
    reunionIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'asistencias'
        )
        .select(
          'id,id_reunion,documento_usuario,nombre_usuario'
        )
        .in(
          'id_reunion',
          reunionIds
        )

    if (
      error
    ) {
      throw error
    }

    asistencias =
      data ||
      []
  }

  const documentosCapacitados =
    new Set(
      asistencias
        .map(
          item =>
            texto(
              item?.documento_usuario
            )
        )
        .filter(
          Boolean
        )
    )

  const {
    data:
      personal,
    error:
      errorPersonal,
  } =
    await supabase
      .from(
        'personal'
      )
      .select(
        'id,documento,estado,fecha_vinculacion,fecha_retiro'
      )
      .lte(
        'fecha_vinculacion',
        periodo.periodo_hasta
      )

  if (
    errorPersonal
  ) {
    throw errorPersonal
  }

  const colaboradoresPeriodo =
    (
      personal ||
      []
    ).filter(
      item => {
        const estado =
          mayusculas(
            item?.estado
          )

        const retiro =
          texto(
            item?.fecha_retiro
          )

        if (
          retiro &&
          retiro <
            periodo.periodo_desde
        ) {
          return false
        }

        return ![
          'INACTIVO',
          'RETIRADO',
          'RETIRADA',
        ].includes(
          estado
        )
      }
    )

  return {
    origen_calculo:
      'AUTOMATICO',

    numerador:
      documentosCapacitados.size,

    denominador:
      colaboradoresPeriodo.length,

    valor_resultado:
      porcentaje(
        documentosCapacitados.size,
        colaboradoresPeriodo.length
      ),

    unidad_resultado:
      'PORCENTAJE',

    datos_calculo: {
      colaboradores_capacitados_unicos:
        documentosCapacitados.size,

      total_colaboradores_periodo:
        colaboradoresPeriodo.length,

      documentos_capacitados:
        [
          ...documentosCapacitados,
        ],

      reunion_ids:
        reunionIds,

      ejecucion_ids:
        (
          ejecuciones ||
          []
        ).map(
          item =>
            item.id
        ),
    },

    advertencias:
      reunionIds.length >
      0
        ? []
        : [
            'Las ejecuciones de formación del período no tienen reuniones asociadas; no fue posible obtener asistentes nominales.',
          ],
  }
}


// ============================================================
// CÁLCULO 13 - NCAC
// app/admin/pesv/indicadores/page.jsx
// API: /api/admin/pesv/indicadores
// ============================================================

async function calcularNcac(
  supabase,
  periodo
) {
  const anio =
    Number(
      periodo.periodo_desde.slice(
        0,
        4
      )
    )

  const {
    data:
      auditorias,
    error:
      errorAuditorias,
  } =
    await supabase
      .from(
        'pesv_auditorias'
      )
      .select(
        'id'
      )
      .eq(
        'anio',
        anio
      )

  if (
    errorAuditorias
  ) {
    throw errorAuditorias
  }

  const auditoriaIds =
    (
      auditorias ||
      []
    ).map(
      item =>
        item.id
    )

  if (
    auditoriaIds.length ===
    0
  ) {
    return {
      origen_calculo:
        'AUTOMATICO',

      numerador:
        0,

      denominador:
        0,

      valor_resultado:
        null,

      unidad_resultado:
        'PORCENTAJE',

      datos_calculo: {
        no_conformidades_identificadas:
          0,

        no_conformidades_cerradas:
          0,
      },

      advertencias:
        [],
    }
  }

  const {
    data:
      hallazgos,
    error:
      errorHallazgos,
  } =
    await supabase
      .from(
        'pesv_auditoria_hallazgos'
      )
      .select(
        'id,auditoria_id,tipo_hallazgo,estado,fecha_cierre,causa'
      )
      .in(
        'auditoria_id',
        auditoriaIds
      )
      .eq(
        'tipo_hallazgo',
        'NO_CONFORMIDAD'
      )

  if (
    errorHallazgos
  ) {
    throw errorHallazgos
  }

  const noConformidades =
    hallazgos ||
    []

  const identificadasAnalizadas =
    noConformidades.filter(
      item =>
        texto(
          item?.causa
        ) !==
        ''
    )

  const base =
    identificadasAnalizadas.length >
    0
      ? identificadasAnalizadas
      : noConformidades

  const cerradas =
    base.filter(
      item =>
        mayusculas(
          item?.estado
        ) ===
          'CERRADO' &&
        Boolean(
          item?.fecha_cierre
        )
    )

  return {
    origen_calculo:
      'AUTOMATICO',

    numerador:
      cerradas.length,

    denominador:
      base.length,

    valor_resultado:
      porcentaje(
        cerradas.length,
        base.length
      ),

    unidad_resultado:
      'PORCENTAJE',

    datos_calculo: {
      no_conformidades_identificadas:
        noConformidades.length,

      no_conformidades_identificadas_analizadas:
        base.length,

      no_conformidades_cerradas:
        cerradas.length,

      hallazgo_ids_base:
        base.map(
          item =>
            item.id
        ),

      hallazgo_ids_cerrados:
        cerradas.map(
          item =>
            item.id
        ),
    },

    advertencias:
      identificadasAnalizadas.length ===
        0 &&
      noConformidades.length >
        0
        ? [
            'No se encontraron causas registradas en las no conformidades. Para no dejar el indicador sin base, se tomaron todas las no conformidades identificadas; revise el análisis antes de cerrar la medición.',
          ]
        : [],
  }
}


// ============================================================
// DESPACHADOR DE CÁLCULOS
// app/admin/pesv/indicadores/page.jsx
// API: /api/admin/pesv/indicadores
// ============================================================

async function calcularIndicador(
  supabase,
  indicador,
  periodo,
  contexto = {}
) {
  const codigo =
    mayusculas(
      indicador?.codigo
    )

  switch (
    codigo
  ) {
    case 'TSV':
      return calcularTsv(
        supabase,
        periodo
      )

    case 'RSVI':
      return calcularRsvi(
        supabase,
        periodo
      )

    case 'GRV':
      return calcularGrv(
        supabase,
        periodo
      )

    case 'CM_PESV':
      return calcularCmPesv(
        supabase,
        periodo
      )

    case 'CPLAN_PESV':
      return calcularCplanPesv(
        supabase,
        periodo
      )

    case 'EJLC':
      return calcularEjlc(
        supabase,
        periodo
      )

    case 'IDP':
      return calcularIdp(
        supabase,
        periodo
      )

    case 'CPMVH':
      return calcularCpmvh(
        supabase,
        periodo,
        contexto
      )

    case 'CPF_PESV_CUMPLIMIENTO':
      return calcularCumplimientoFormacion(
        supabase,
        periodo
      )

    case 'CPF_PESV_COBERTURA':
      return calcularCoberturaFormacion(
        supabase,
        periodo
      )

    case 'NCAC':
      return calcularNcac(
        supabase,
        periodo
      )

    default:
      throw new Error(
        `No existe una estrategia de cálculo para el indicador ${codigo}.`
      )
  }
}


// ============================================================
// ENRIQUECER CATÁLOGO
// app/api/admin/pesv/indicadores/route.js
// ============================================================

function enriquecerCatalogo(
  catalogo,
  configuraciones,
  mediciones
) {
  const configuracionPorIndicador =
    new Map(
      configuraciones.map(
        item => [
          String(
            item.indicador_id
          ),
          item,
        ]
      )
    )

  const medicionesPorIndicador =
    new Map()

  mediciones.forEach(
    item => {
      const clave =
        String(
          item.indicador_id
        )

      if (
        !medicionesPorIndicador.has(
          clave
        )
      ) {
        medicionesPorIndicador.set(
          clave,
          []
        )
      }

      medicionesPorIndicador
        .get(
          clave
        )
        .push(
          item
        )
    }
  )

  return catalogo.map(
    indicador => {
      const clave =
        String(
          indicador.id
        )

      const configuracion =
        configuracionPorIndicador.get(
          clave
        ) ||
        null

      const listaMediciones =
        medicionesPorIndicador.get(
          clave
        ) ||
        []

      return {
        ...indicador,

        configuracion,

        mediciones:
          listaMediciones,

        ultima_medicion:
          listaMediciones[0] ||
          null,
      }
    }
  )
}


// ============================================================
// RESUMEN
// app/api/admin/pesv/indicadores/route.js
// ============================================================

function construirResumen(
  indicadores
) {
  const ultimaPorIndicador =
    indicadores
      .map(
        item =>
          item?.ultima_medicion
      )
      .filter(
        Boolean
      )

  return {
    total_indicadores:
      indicadores.length,

    configurados:
      indicadores.filter(
        item =>
          Boolean(
            item?.configuracion
          ) &&
          item
            ?.configuracion
            ?.activo !==
            false
      ).length,

    medidos:
      ultimaPorIndicador.length,

    pendientes:
      Math.max(
        indicadores.length -
        ultimaPorIndicador.length,
        0
      ),

    cumplen_meta:
      ultimaPorIndicador.filter(
        item =>
          item?.cumple_meta ===
          true
      ).length,

    no_cumplen_meta:
      ultimaPorIndicador.filter(
        item =>
          item?.cumple_meta ===
          false
      ).length,

    borradores:
      ultimaPorIndicador.filter(
        item =>
          mayusculas(
            item?.estado
          ) ===
          'BORRADOR'
      ).length,

    validadas:
      ultimaPorIndicador.filter(
        item =>
          mayusculas(
            item?.estado
          ) ===
          'VALIDADA'
      ).length,

    cerradas:
      ultimaPorIndicador.filter(
        item =>
          mayusculas(
            item?.estado
          ) ===
          'CERRADA'
      ).length,
  }
}

// ============================================================
// GET INDICADORES
// app/admin/pesv/indicadores/page.jsx
// API: GET /api/admin/pesv/indicadores
//
// Query:
// ?nit=...
// ?anio=2026
// ?indicador_id=5   opcional
// ============================================================

export async function GET(
  request
) {
  try {
    const {
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
      entero(
        url.searchParams.get(
          'anio'
        )
      ) ||
      new Date()
        .getFullYear()

    const indicadorId =
      entero(
        url.searchParams.get(
          'indicador_id'
        )
      )

    const [
      catalogo,
      configuraciones,
      mediciones,
      personal,
    ] =
      await Promise.all([
        obtenerCatalogo(
          supabaseAdmin
        ),

        obtenerConfiguraciones(
          supabaseAdmin,
          anio
        ),

        obtenerMediciones(
          supabaseAdmin,
          anio,
          indicadorId
        ),

        obtenerPersonal(
          supabaseAdmin
        ),
      ])

    const indicadores =
      enriquecerCatalogo(
        indicadorId
          ? catalogo.filter(
              item =>
                Number(
                  item.id
                ) ===
                Number(
                  indicadorId
                )
            )
          : catalogo,
        configuraciones,
        mediciones
      )

    return responderOk({
      empresa,

      nivel_pesv:
        'BASICO',

      anio,

      indicadores,

      catalogo:
        indicadores,

      configuraciones,

      mediciones,

      personal,

      resumen:
        construirResumen(
          indicadores
        ),
    })
  } catch (
    error
  ) {
    console.error(
      'GET /api/admin/pesv/indicadores:',
      error
    )

    const respuesta =
      respuestaErrorEmpresa(
        error
      )

    return NextResponse.json(
      respuesta.body,
      {
        status:
          respuesta.status,
      }
    )
  }
}


// ============================================================
// POST INDICADORES
// app/admin/pesv/indicadores/page.jsx
// API: POST /api/admin/pesv/indicadores
//
// Acciones:
// - calcular_indicador
// - guardar_medicion
// - calcular_y_guardar
// - guardar_configuracion
// ============================================================

export async function POST(
  request
) {
  let body = null

  try {
    body =
      await request.json()

    const {
      empresa,
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const accion =
      mayusculas(
        body?.accion
      ).toLowerCase()

    const usuario =
      datosUsuario(
        body
      )


    // ========================================================
    // CALCULAR INDICADOR
    // app/admin/pesv/indicadores/page.jsx
    // API: POST /api/admin/pesv/indicadores
    // ACCIÓN: calcular_indicador
    //
    // Realiza el cálculo pero NO guarda la medición.
    // ========================================================

    if (
      accion ===
      'calcular_indicador'
    ) {
      const indicador =
        await obtenerIndicadorPorIdOCodigo(
          supabaseAdmin,
          body
        )

      const periodo =
        resolverPeriodo(
          body?.anio,
          body?.tipo_periodo,
          body?.numero_periodo
        )

      if (
        !periodoPermitidoParaIndicador(
          indicador,
          periodo.tipo_periodo
        )
      ) {
        return responderError(
          `El período ${periodo.tipo_periodo} no corresponde a la periodicidad del indicador ${indicador.codigo}.`,
          400,
          'PERIODO_NO_PERMITIDO'
        )
      }

      const calculo =
        await calcularIndicador(
          supabaseAdmin,
          indicador,
          periodo,
          {
            request,
            body,
          }
        )

      const configuracion =
        await obtenerConfiguracionIndicador(
          supabaseAdmin,
          indicador.id,
          Number(
            body.anio
          )
        )

            // ======================================================
            // EVALUACIÓN DE META
            // TSV usa cuatro metas independientes.
            // Los demás indicadores conservan la evaluación general.
            // ======================================================

            const esTsv =
              mayusculas(
                indicador?.codigo
              ) ===
              'TSV'

            let valorMeta =
              null

            let operadorMeta =
              null

            let cumpleMeta =
              null

            let evaluacionTsv =
              null


            if (
              esTsv
            ) {
              evaluacionTsv =
                evaluarMetasTsv(
                  calculo,
                  configuracion
                )

              cumpleMeta =
                evaluacionTsv
                  ?.cumple_meta_global ??
                null
            } else {
              valorMeta =
                numero(
                  body?.valor_meta
                ) ??
                numero(
                  configuracion
                    ?.valor_meta
                )

              operadorMeta =
                texto(
                  body?.operador_meta
                ) ||
                texto(
                  configuracion
                    ?.operador_meta
                )

              cumpleMeta =
                valorCumpleMeta(
                  calculo
                    ?.valor_resultado,
                  operadorMeta,
                  valorMeta
                )
            }

      return responderOk({
        empresa,

        indicador,

        configuracion,

        periodo,

        calculo: {
          ...calculo,

          linea_base:
            numero(
              configuracion
                ?.linea_base
            ),

          valor_meta:
            valorMeta,

          operador_meta:
            operadorMeta ||
            null,

          unidad_meta:
            texto(
              configuracion
                ?.unidad_meta
            ) ||
            texto(
              indicador
                ?.unidad
            ) ||
            null,

           datos_calculo:
            esTsv
              ? {
                  ...(
                    calculo
                      ?.datos_calculo ||
                    {}
                  ),

                  evaluacion_metas:
                    evaluacionTsv
                      ?.evaluacion_metas ||
                    {},

                  cumple_meta_global:
                    evaluacionTsv
                      ?.cumple_meta_global ??
                    null,

                  metas_completamente_evaluadas:
                    evaluacionTsv
                      ?.metas_completamente_evaluadas ??
                    false,
                }
              : (
                  calculo
                    ?.datos_calculo ||
                  {}
                ),

          cumple_meta:
            cumpleMeta,
        },
      })
    }


    // ========================================================
    // GUARDAR CONFIGURACIÓN ANUAL
    // app/admin/pesv/indicadores/page.jsx
    // API: POST /api/admin/pesv/indicadores
    // ACCIÓN: guardar_configuracion
    //
    // Si ya existe configuración para indicador + año,
    // la actualiza. Si no existe, la crea.
    // ========================================================

    if (
      accion ===
      'guardar_configuracion'
    ) {
      const indicador =
        await obtenerIndicadorPorIdOCodigo(
          supabaseAdmin,
          body
        )

      const anio =
        entero(
          body?.anio
        )

      if (
        !anio
      ) {
        return responderError(
          'Debe indicar la vigencia.',
          400,
          'ANIO_REQUIRED'
        )
      }

      const operadorMeta =
        texto(
          body?.operador_meta
        )

      if (
        operadorMeta &&
        !OPERADORES_META.includes(
          operadorMeta
        )
      ) {
        return responderError(
          'El operador de meta no es válido.',
          400,
          'OPERADOR_META_INVALIDO'
        )
      }

      const existente =
        await obtenerConfiguracionIndicador(
          supabaseAdmin,
          indicador.id,
          anio
        )

      // ======================================================
      // CONFIGURACIÓN ESPECÍFICA
      // app/api/admin/pesv/indicadores/route.js
      // INDICADOR: TSV
      // ======================================================

      let configuracionEspecifica =
        existente
          ?.configuracion_especifica ??
        null

      if (
        mayusculas(
          indicador?.codigo
        ) ===
        'TSV'
      ) {
        if (
          body?.configuracion_especifica !==
          undefined
        ) {
          try {
            configuracionEspecifica =
              normalizarConfiguracionEspecificaTsv(
                body
                  .configuracion_especifica
              )
          } catch (
            error
          ) {
            return responderError(
              error?.message ||
              'La configuración específica TSV no es válida.',
              400,
              'CONFIGURACION_TSV_INVALIDA'
            )
          }
        }
      }

      const payload = {
        indicador_id:
          indicador.id,

        anio,

        configuracion_especifica:
          configuracionEspecifica,

        linea_base:
          numero(
            body?.linea_base
          ),

        valor_meta:
          numero(
            body?.valor_meta
          ),

        operador_meta:
          operadorMeta ||
          null,

        unidad_meta:
          texto(
            body?.unidad_meta
          ) ||
          texto(
            indicador?.unidad
          ) ||
          null,

        fuente_informacion:
          texto(
            body?.fuente_informacion
          ) ||
          texto(
            indicador?.fuente_datos
          ) ||
          null,

        interpretacion_indicador:
          texto(
            body?.interpretacion_indicador
          ) ||
          null,

        personas_deben_conocer_resultado:
          texto(
            body?.personas_deben_conocer_resultado
          ) ||
          null,

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        activo:
          booleano(
            body?.activo
          ) ??
          true,

        usuario_actualizacion:
          usuario ||
          null,

        updated_at:
          hoyIso(),
      }

      let data = null
      let error = null

      if (
        existente
      ) {
        const resultado =
          await supabaseAdmin
            .from(
              'pesv_indicadores_configuracion'
            )
            .update(
              payload
            )
            .eq(
              'id',
              existente.id
            )
            .select('*')
            .single()

        data =
          resultado.data

        error =
          resultado.error
      } else {
        const resultado =
          await supabaseAdmin
            .from(
              'pesv_indicadores_configuracion'
            )
            .insert({
              ...payload,

              created_at:
                hoyIso(),
            })
            .select('*')
            .single()

        data =
          resultado.data

        error =
          resultado.error
      }

      if (
        error
      ) {
        throw error
      }

      return responderOk(
        {
          empresa,

          configuracion:
            data,

          message:
            'Configuración del indicador guardada correctamente.',
        },
        existente
          ? 200
          : 201
      )
    }


    // ========================================================
    // GUARDAR MEDICIÓN
    // app/admin/pesv/indicadores/page.jsx
    // API: POST /api/admin/pesv/indicadores
    // ACCIÓN: guardar_medicion
    //
    // Permite registrar una medición manual o asistida.
    // También puede recibir un cálculo preparado previamente
    // mediante calcular_indicador.
    // ========================================================

    if (
      accion ===
      'guardar_medicion'
    ) {
      const indicador =
        await obtenerIndicadorPorIdOCodigo(
          supabaseAdmin,
          body
        )

      const anio =
        entero(
          body?.anio
        )

      const periodo =
        resolverPeriodo(
          anio,
          body?.tipo_periodo,
          body?.numero_periodo
        )

      if (
        !periodoPermitidoParaIndicador(
          indicador,
          periodo.tipo_periodo
        )
      ) {
        return responderError(
          `El período ${periodo.tipo_periodo} no corresponde a la periodicidad del indicador ${indicador.codigo}.`,
          400,
          'PERIODO_NO_PERMITIDO'
        )
      }

      const origen =
        mayusculas(
          body?.origen_calculo ||
          'ASISTIDO'
        )

      if (
        !ORIGENES_CALCULO.includes(
          origen
        )
      ) {
        return responderError(
          'El origen del cálculo no es válido.',
          400,
          'ORIGEN_INVALIDO'
        )
      }

      const estado =
        mayusculas(
          body?.estado ||
          'BORRADOR'
        )

      if (
        !ESTADOS_MEDICION.includes(
          estado
        )
      ) {
        return responderError(
          'El estado de la medición no es válido.',
          400,
          'ESTADO_INVALIDO'
        )
      }

      const configuracion =
        await obtenerConfiguracionIndicador(
          supabaseAdmin,
          indicador.id,
          anio
        )

      const valorResultado =
        numero(
          body?.valor_resultado
        )

      const valorMeta =
        numero(
          body?.valor_meta
        ) ??
        numero(
          configuracion
            ?.valor_meta
        )

      const operadorMeta =
        texto(
          body?.operador_meta
        ) ||
        texto(
          configuracion
            ?.operador_meta
        )

      if (
        operadorMeta &&
        !OPERADORES_META.includes(
          operadorMeta
        )
      ) {
        return responderError(
          'El operador de meta no es válido.',
          400,
          'OPERADOR_META_INVALIDO'
        )
      }

      // ======================================================
      // DATOS DE CÁLCULO Y CUMPLIMIENTO DE META
      // app/api/admin/pesv/indicadores/route.js
      // ACCIÓN: guardar_medicion
      //
      // TSV conserva la evaluación independiente de sus cuatro
      // niveles de pérdida y usa cumple_meta_global como valor
      // general de la medición.
      //
      // Los demás indicadores conservan la evaluación genérica.
      // ======================================================

      const datosCalculo =
        body?.datos_calculo &&
        typeof body
          .datos_calculo ===
          'object' &&
        !Array.isArray(
          body.datos_calculo
        )
          ? body.datos_calculo
          : {}

      const esTsv =
        mayusculas(
          indicador?.codigo
        ) ===
        'TSV'

      let cumpleMetaMedicion =
        null

      if (
        esTsv
      ) {
        const cumpleGlobal =
          datosCalculo
            ?.cumple_meta_global

        cumpleMetaMedicion =
          typeof cumpleGlobal ===
            'boolean'
            ? cumpleGlobal
            : null
      } else {
        cumpleMetaMedicion =
          valorCumpleMeta(
            valorResultado,
            operadorMeta,
            valorMeta
          )
      }

      const responsableId =
        entero(
          body?.responsable_personal_id
        )

      let responsableNombre =
        texto(
          body?.responsable_nombre
        )

      if (
        responsableId &&
        !responsableNombre
      ) {
        const {
          data:
            persona,
          error:
            errorPersona,
        } =
          await supabaseAdmin
            .from(
              'personal'
            )
            .select(
              'id,nombres,apellidos,documento'
            )
            .eq(
              'id',
              responsableId
            )
            .maybeSingle()

        if (
          errorPersona
        ) {
          throw errorPersona
        }

        if (
          persona
        ) {
          responsableNombre =
            [
              texto(
                persona.nombres
              ),
              texto(
                persona.apellidos
              ),
            ]
              .filter(
                Boolean
              )
              .join(
                ' '
              ) ||
            texto(
              persona.documento
            )
        }
      }

      const payload = {
        indicador_id:
          indicador.id,

        anio,

        tipo_periodo:
          periodo.tipo_periodo,

        numero_periodo:
          periodo.numero_periodo,

        periodo_desde:
          periodo.periodo_desde,

        periodo_hasta:
          periodo.periodo_hasta,

        fecha_medicion:
          texto(
            body?.fecha_medicion
          ) ||
          hoyFecha(),

        numerador:
          numero(
            body?.numerador
          ),

        denominador:
          numero(
            body?.denominador
          ),

        valor_resultado:
          valorResultado,

        unidad_resultado:
          texto(
            body?.unidad_resultado
          ) ||
          texto(
            indicador?.unidad
          ) ||
          null,

        // ====================================================
        // META Y LÍNEA BASE SUPERIOR
        // app/api/admin/pesv/indicadores/route.js
        // ACCIÓN: guardar_medicion
        //
        // TSV es compuesto y conserva sus cuatro líneas base,
        // metas y operadores dentro de datos_calculo.
        // Por eso los campos generales permanecen en NULL.
        // ====================================================

        linea_base:
          esTsv
            ? null
            : (
                numero(
                  body?.linea_base
                ) ??
                numero(
                  configuracion
                    ?.linea_base
                )
              ),

        valor_meta:
          esTsv
            ? null
            : valorMeta,

        operador_meta:
          esTsv
            ? null
            : (
                operadorMeta ||
                null
              ),

        unidad_meta:
          texto(
            body?.unidad_meta
          ) ||
          texto(
            configuracion
              ?.unidad_meta
          ) ||
          texto(
            indicador?.unidad
          ) ||
          null,
        cumple_meta:
          cumpleMetaMedicion,

        origen_calculo:
          origen,

        datos_calculo:
          datosCalculo,

        analisis_resultado:
          texto(
            body?.analisis_resultado
          ) ||
          null,

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        estado,

        responsable_personal_id:
          responsableId,

        responsable_nombre:
          responsableNombre ||
          null,

        usuario_registro:
          usuario ||
          null,

        usuario_actualizacion:
          usuario ||
          null,

        created_at:
          hoyIso(),

        updated_at:
          hoyIso(),
      }

      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            'pesv_indicadores_mediciones'
          )
          .insert(
            payload
          )
          .select('*')
          .single()

      if (
        error
      ) {
        if (
          error.code ===
          '23505'
        ) {
          return responderError(
            'Ya existe una medición para este indicador, vigencia y período. Edite la medición existente.',
            409,
            'MEDICION_DUPLICADA'
          )
        }

        throw error
      }

      return responderOk(
        {
          empresa,

          medicion:
            data,

          message:
            'Medición registrada correctamente.',
        },
        201
      )
    }

    // ========================================================
    // CALCULAR Y GUARDAR
    // app/admin/pesv/indicadores/page.jsx
    // API: POST /api/admin/pesv/indicadores
    // ACCIÓN: calcular_y_guardar
    //
    // Genera o actualiza una medición en BORRADOR.
    // Nunca sobrescribe una medición VALIDADA o CERRADA.
    // ========================================================

    if (
      accion ===
      'calcular_y_guardar'
    ) {
      const indicador =
        await obtenerIndicadorPorIdOCodigo(
          supabaseAdmin,
          body
        )

      const anio =
        entero(
          body?.anio
        )

      const periodo =
        resolverPeriodo(
          anio,
          body?.tipo_periodo,
          body?.numero_periodo
        )

      if (
        !periodoPermitidoParaIndicador(
          indicador,
          periodo.tipo_periodo
        )
      ) {
        return responderError(
          `El período ${periodo.tipo_periodo} no corresponde a la periodicidad del indicador ${indicador.codigo}.`,
          400,
          'PERIODO_NO_PERMITIDO'
        )
      }

      const calculo =
        await calcularIndicador(
          supabaseAdmin,
          indicador,
          periodo,
          {
            request,
            body,
          }
        )

      const configuracion =
        await obtenerConfiguracionIndicador(
          supabaseAdmin,
          indicador.id,
          anio
        )

      // ======================================================
      // EVALUACIÓN DE META
      // app/api/admin/pesv/indicadores/route.js
      // ACCIÓN: calcular_y_guardar
      //
      // TSV utiliza cuatro metas independientes.
      // Los demás indicadores utilizan la meta general.
      // ======================================================

      const esTsv =
        mayusculas(
          indicador?.codigo
        ) ===
        'TSV'

      let valorMeta =
        null

      let operadorMeta =
        null

      let cumpleMetaMedicion =
        null

      let evaluacionTsv =
        null

      if (
        esTsv
      ) {
        evaluacionTsv =
          evaluarMetasTsv(
            calculo,
            configuracion
          )

        cumpleMetaMedicion =
          evaluacionTsv
            ?.cumple_meta_global ??
          null
      } else {
        valorMeta =
          numero(
            configuracion
              ?.valor_meta
          )

        operadorMeta =
          texto(
            configuracion
              ?.operador_meta
          )

        cumpleMetaMedicion =
          valorCumpleMeta(
            calculo
              ?.valor_resultado,
            operadorMeta,
            valorMeta
          )
      }

      const datosCalculoMedicion = {
        ...(
          calculo
            ?.datos_calculo ||
          {}
        ),

        ...(esTsv
          ? {
              evaluacion_metas:
                evaluacionTsv
                  ?.evaluacion_metas ||
                {},

              cumple_meta_global:
                evaluacionTsv
                  ?.cumple_meta_global ??
                null,

              metas_completamente_evaluadas:
                evaluacionTsv
                  ?.metas_completamente_evaluadas ??
                false,
            }
          : {}),

        advertencias:
          calculo
            ?.advertencias ||
          [],
      }

      let consultaExistente =
        supabaseAdmin
          .from(
            'pesv_indicadores_mediciones'
          )
          .select('*')
          .eq(
            'indicador_id',
            indicador.id
          )
          .eq(
            'anio',
            anio
          )
          .eq(
            'tipo_periodo',
            periodo.tipo_periodo
          )

      if (
        periodo.numero_periodo ===
        null
      ) {
        consultaExistente =
          consultaExistente.is(
            'numero_periodo',
            null
          )
      } else {
        consultaExistente =
          consultaExistente.eq(
            'numero_periodo',
            periodo.numero_periodo
          )
      }

      const {
        data:
          medicionExistente,
        error:
          errorExistente,
      } =
        await consultaExistente
          .maybeSingle()

      if (
        errorExistente
      ) {
        throw errorExistente
      }

      if (
        medicionExistente &&
        mayusculas(
          medicionExistente.estado
        ) !==
          'BORRADOR'
      ) {
        return responderError(
          'La medición existente ya fue validada o cerrada y no puede recalcularse automáticamente.',
          409,
          'MEDICION_PROTEGIDA'
        )
      }

      const payload = {
        indicador_id:
          indicador.id,

        anio,

        tipo_periodo:
          periodo.tipo_periodo,

        numero_periodo:
          periodo.numero_periodo,

        periodo_desde:
          periodo.periodo_desde,

        periodo_hasta:
          periodo.periodo_hasta,

        fecha_medicion:
          hoyFecha(),

        numerador:
          calculo
            ?.numerador ??
          null,

        denominador:
          calculo
            ?.denominador ??
          null,

        valor_resultado:
          calculo
            ?.valor_resultado ??
          null,

        unidad_resultado:
          texto(
            calculo
              ?.unidad_resultado
          ) ||
          texto(
            indicador
              ?.unidad
          ) ||
          null,

        // ====================================================
        // META Y LÍNEA BASE SUPERIOR
        // app/api/admin/pesv/indicadores/route.js
        // ACCIÓN: calcular_y_guardar
        //
        // TSV conserva sus cuatro líneas base y metas
        // dentro de datos_calculo.
        // ====================================================

        linea_base:
          esTsv
            ? null
            : numero(
                configuracion
                  ?.linea_base
              ),

        valor_meta:
          esTsv
            ? null
            : valorMeta,

        operador_meta:
          esTsv
            ? null
            : (
                operadorMeta ||
                null
              ),

        unidad_meta:
          texto(
            configuracion
              ?.unidad_meta
          ) ||
          texto(
            indicador
              ?.unidad
          ) ||
          null,

        cumple_meta:
          cumpleMetaMedicion,

        origen_calculo:
          calculo
            ?.origen_calculo ||
          'ASISTIDO',

        datos_calculo:
          datosCalculoMedicion,

        estado:
          'BORRADOR',

        usuario_actualizacion:
          usuario ||
          null,

        updated_at:
          hoyIso(),
      }

      let data = null
      let error = null

      if (
        medicionExistente
      ) {
        const resultado =
          await supabaseAdmin
            .from(
              'pesv_indicadores_mediciones'
            )
            .update(
              payload
            )
            .eq(
              'id',
              medicionExistente.id
            )
            .select('*')
            .single()

        data =
          resultado.data

        error =
          resultado.error
      } else {
        const resultado =
          await supabaseAdmin
            .from(
              'pesv_indicadores_mediciones'
            )
            .insert({
              ...payload,

              usuario_registro:
                usuario ||
                null,

              created_at:
                hoyIso(),
            })
            .select('*')
            .single()

        data =
          resultado.data

        error =
          resultado.error
      }

      if (
        error
      ) {
        throw error
      }

      return responderOk(
        {
          empresa,

          indicador,

          periodo,

          medicion:
            data,

          calculo,

          message:
            medicionExistente
              ? 'Medición borrador recalculada correctamente.'
              : 'Medición borrador calculada y registrada correctamente.',
        },
        medicionExistente
          ? 200
          : 201
      )
    }


    // ========================================================
    // ACCIÓN POST NO RECONOCIDA
    // app/admin/pesv/indicadores/page.jsx
    // API: POST /api/admin/pesv/indicadores
    // ========================================================

    return responderError(
      'Acción POST no reconocida.',
      400,
      'ACCION_INVALIDA'
    )
  } catch (
    error
  ) {
    console.error(
      'POST /api/admin/pesv/indicadores:',
      error
    )

    const respuesta =
      respuestaErrorEmpresa(
        error
      )

    return NextResponse.json(
      respuesta.body,
      {
        status:
          respuesta.status,
      }
    )
  }
}


// ============================================================
// PATCH INDICADORES
// app/admin/pesv/indicadores/page.jsx
// API: PATCH /api/admin/pesv/indicadores
//
// Acciones:
// - actualizar_medicion
// - validar_medicion
// - cerrar_medicion
// ============================================================

export async function PATCH(
  request
) {
  let body = null

  try {
    body =
      await request.json()

    const {
      empresa,
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const accion =
      mayusculas(
        body?.accion
      ).toLowerCase()

    const usuario =
      datosUsuario(
        body
      )

    const id =
      entero(
        body?.id
      )

    if (
      !id
    ) {
      return responderError(
        'Debe indicar la medición.',
        400,
        'ID_REQUIRED'
      )
    }

    const {
      data:
        medicionActual,
      error:
        errorActual,
    } =
      await supabaseAdmin
        .from(
          'pesv_indicadores_mediciones'
        )
        .select('*')
        .eq(
          'id',
          id
        )
        .maybeSingle()

    if (
      errorActual
    ) {
      throw errorActual
    }

    if (
      !medicionActual
    ) {
      return responderError(
        'La medición no existe.',
        404,
        'MEDICION_NOT_FOUND'
      )
    }


    // ========================================================
    // ACTUALIZAR MEDICIÓN
    // app/admin/pesv/indicadores/page.jsx
    // API: PATCH /api/admin/pesv/indicadores
    // ACCIÓN: actualizar_medicion
    //
    // Solo permite modificar mediciones en BORRADOR.
    // ========================================================

        if (
          accion ===
          'actualizar_medicion'
        ) {

      // ======================================================
      // PROTEGER MEDICIONES VALIDADA Y CERRADA
      // app/api/admin/pesv/indicadores/route.js
      // ACCIÓN: actualizar_medicion
      //
      // Solo las mediciones en BORRADOR pueden modificarse.
      // ======================================================

      if (
        mayusculas(
          medicionActual.estado
        ) !==
        'BORRADOR'
      ) {
        return responderError(
          'Solo las mediciones en borrador pueden modificarse.',
          409,
          'MEDICION_PROTEGIDA'
        )
      }


      // ======================================================
      // INDICADOR DE LA MEDICIÓN
      // app/api/admin/pesv/indicadores/route.js
      // ACCIÓN: actualizar_medicion
      //
      // Permite determinar si corresponde a TSV para conservar
      // correctamente su estructura compuesta de cuatro metas.
      // ======================================================

      const indicador =
        await obtenerIndicadorPorIdOCodigo(
          supabaseAdmin,
          {
            indicador_id:
              medicionActual
                .indicador_id,
          }
        )

      const esTsv =
        mayusculas(
          indicador?.codigo
        ) ===
        'TSV'


      // ======================================================
      // RESULTADO ACTUAL DE LA MEDICIÓN
      // app/api/admin/pesv/indicadores/route.js
      // ACCIÓN: actualizar_medicion
      // ======================================================

      const valorResultado =
        body?.valor_resultado !==
        undefined
          ? numero(
              body
                .valor_resultado
            )
          : numero(
              medicionActual
                .valor_resultado
            )


      // ======================================================
      // META GENERAL
      // app/api/admin/pesv/indicadores/route.js
      // ACCIÓN: actualizar_medicion
      //
      // Para TSV estos valores generales permanecen en NULL.
      // Sus metas reales están dentro de datos_calculo.
      // ======================================================

      const valorMeta =
        body?.valor_meta !==
        undefined
          ? numero(
              body
                .valor_meta
            )
          : numero(
              medicionActual
                .valor_meta
            )

      const operadorMeta =
        body?.operador_meta !==
        undefined
          ? texto(
              body
                .operador_meta
            )
          : texto(
              medicionActual
                .operador_meta
            )

      if (
        operadorMeta &&
        !OPERADORES_META.includes(
          operadorMeta
        )
      ) {
        return responderError(
          'El operador de meta no es válido.',
          400,
          'OPERADOR_META_INVALIDO'
        )
      }

      const origenCalculo =
        body?.origen_calculo !==
        undefined
          ? mayusculas(
              body
                .origen_calculo
            )
          : mayusculas(
              medicionActual
                .origen_calculo
            )

      if (
        !ORIGENES_CALCULO.includes(
          origenCalculo
        )
      ) {
        return responderError(
          'El origen del cálculo no es válido.',
          400,
          'ORIGEN_INVALIDO'
        )
      }

      // ======================================================
      // DATOS DE CÁLCULO Y CUMPLIMIENTO
      // app/api/admin/pesv/indicadores/route.js
      // ACCIÓN: actualizar_medicion
      //
      // Si el PATCH no envía datos_calculo, se conserva
      // íntegramente el JSON almacenado en la medición.
      //
      // Para TSV, cumple_meta se toma exclusivamente del
      // cumplimiento global de sus cuatro niveles de pérdida.
      // ======================================================

      const datosCalculoActualizados =
        body?.datos_calculo &&
        typeof body
          .datos_calculo ===
          'object' &&
        !Array.isArray(
          body.datos_calculo
        )
          ? body.datos_calculo
          : (
              medicionActual
                .datos_calculo &&
              typeof medicionActual
                .datos_calculo ===
                'object' &&
              !Array.isArray(
                medicionActual
                  .datos_calculo
              )
                ? medicionActual
                    .datos_calculo
                : {}
            )

      let cumpleMetaActualizado =
        null

      if (
        esTsv
      ) {
        const cumpleGlobal =
          datosCalculoActualizados
            ?.cumple_meta_global

        cumpleMetaActualizado =
          typeof cumpleGlobal ===
            'boolean'
            ? cumpleGlobal
            : null
      } else {
        cumpleMetaActualizado =
          valorCumpleMeta(
            valorResultado,
            operadorMeta,
            valorMeta
          )
      }
      let responsableId =
        medicionActual
          .responsable_personal_id

      let responsableNombre =
        medicionActual
          .responsable_nombre

      if (
        body?.responsable_personal_id !==
        undefined
      ) {
        responsableId =
          entero(
            body
              .responsable_personal_id
          )

        if (
          responsableId
        ) {
          const {
            data:
              persona,
            error:
              errorPersona,
          } =
            await supabaseAdmin
              .from(
                'personal'
              )
              .select(
                'id,nombres,apellidos,documento'
              )
              .eq(
                'id',
                responsableId
              )
              .maybeSingle()

          if (
            errorPersona
          ) {
            throw errorPersona
          }

          if (
            persona
          ) {
            responsableNombre =
              [
                texto(
                  persona.nombres
                ),
                texto(
                  persona.apellidos
                ),
              ]
                .filter(
                  Boolean
                )
                .join(
                  ' '
                ) ||
              texto(
                persona.documento
              )
          }
        } else {
          responsableNombre =
            null
        }
      }

      if (
        body?.responsable_nombre !==
        undefined
      ) {
        responsableNombre =
          texto(
            body
              .responsable_nombre
          ) ||
          null
      }

      const payload = {
        numerador:
          body?.numerador !==
          undefined
            ? numero(
                body
                  .numerador
              )
            : medicionActual
                .numerador,

        denominador:
          body?.denominador !==
          undefined
            ? numero(
                body
                  .denominador
              )
            : medicionActual
                .denominador,

        valor_resultado:
          valorResultado,

        unidad_resultado:
          body?.unidad_resultado !==
          undefined
            ? texto(
                body
                  .unidad_resultado
              ) ||
              null
            : medicionActual
                .unidad_resultado,

        // ====================================================
        // META Y LÍNEA BASE SUPERIOR
        // app/api/admin/pesv/indicadores/route.js
        // ACCIÓN: actualizar_medicion
        //
        // TSV conserva estos campos generales en NULL porque
        // su configuración real está dividida por nivel.
        // ====================================================

        linea_base:
          esTsv
            ? null
            : (
                body?.linea_base !==
                undefined
                  ? numero(
                      body
                        .linea_base
                    )
                  : medicionActual
                      .linea_base
              ),

        valor_meta:
          esTsv
            ? null
            : valorMeta,

        operador_meta:
          esTsv
            ? null
            : (
                operadorMeta ||
                null
              ),
        unidad_meta:
          body?.unidad_meta !==
          undefined
            ? texto(
                body
                  .unidad_meta
              ) ||
              null
            : medicionActual
                .unidad_meta,

        cumple_meta:
          cumpleMetaActualizado,

        origen_calculo:
          origenCalculo,

        datos_calculo:
          datosCalculoActualizados,

        analisis_resultado:
          body?.analisis_resultado !==
          undefined
            ? texto(
                body
                  .analisis_resultado
              ) ||
              null
            : medicionActual
                .analisis_resultado,

        observaciones:
          body?.observaciones !==
          undefined
            ? texto(
                body
                  .observaciones
              ) ||
              null
            : medicionActual
                .observaciones,

        responsable_personal_id:
          responsableId,

        responsable_nombre:
          responsableNombre,

        usuario_actualizacion:
          usuario ||
          medicionActual
            .usuario_actualizacion,

        updated_at:
          hoyIso(),
      }

      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            'pesv_indicadores_mediciones'
          )
          .update(
            payload
          )
          .eq(
            'id',
            id
          )
          .select('*')
          .single()

      if (
        error
      ) {
        throw error
      }

      return responderOk({
        empresa,

        medicion:
          data,

        message:
          'Medición actualizada correctamente.',
      })
    }


    // ========================================================
    // VALIDAR MEDICIÓN
    // app/admin/pesv/indicadores/page.jsx
    // API: PATCH /api/admin/pesv/indicadores
    // ACCIÓN: validar_medicion
    //
    // Transición permitida:
    // BORRADOR -> VALIDADA
    // ========================================================

    if (
      accion ===
      'validar_medicion'
    ) {
      if (
        mayusculas(
          medicionActual.estado
        ) !==
        'BORRADOR'
      ) {
        return responderError(
          'Solo una medición en borrador puede validarse.',
          409,
          'TRANSICION_INVALIDA'
        )
      }

      if (
        medicionActual
          .valor_resultado ===
        null
      ) {
        return responderError(
          'La medición debe tener un resultado antes de validarse.',
          400,
          'RESULTADO_REQUIRED'
        )
      }

      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            'pesv_indicadores_mediciones'
          )
          .update({
            estado:
              'VALIDADA',

            usuario_actualizacion:
              usuario ||
              null,

            updated_at:
              hoyIso(),
          })
          .eq(
            'id',
            id
          )
          .select('*')
          .single()

      if (
        error
      ) {
        throw error
      }

      return responderOk({
        empresa,

        medicion:
          data,

        message:
          'Medición validada correctamente.',
      })
    }


    // ========================================================
    // CERRAR MEDICIÓN
    // app/admin/pesv/indicadores/page.jsx
    // API: PATCH /api/admin/pesv/indicadores
    // ACCIÓN: cerrar_medicion
    //
    // Transición permitida:
    // VALIDADA -> CERRADA
    // ========================================================

    if (
      accion ===
      'cerrar_medicion'
    ) {
      if (
        mayusculas(
          medicionActual.estado
        ) !==
        'VALIDADA'
      ) {
        return responderError(
          'La medición debe estar validada antes de cerrarse.',
          409,
          'TRANSICION_INVALIDA'
        )
      }

      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            'pesv_indicadores_mediciones'
          )
          .update({
            estado:
              'CERRADA',

            usuario_actualizacion:
              usuario ||
              null,

            updated_at:
              hoyIso(),
          })
          .eq(
            'id',
            id
          )
          .select('*')
          .single()

      if (
        error
      ) {
        throw error
      }

      return responderOk({
        empresa,

        medicion:
          data,

        message:
          'Medición cerrada correctamente.',
      })
    }


    // ========================================================
    // ACCIÓN PATCH NO RECONOCIDA
    // app/admin/pesv/indicadores/page.jsx
    // API: PATCH /api/admin/pesv/indicadores
    // ========================================================

    return responderError(
      'Acción PATCH no reconocida.',
      400,
      'ACCION_INVALIDA'
    )
  } catch (
    error
  ) {
    console.error(
      'PATCH /api/admin/pesv/indicadores:',
      error
    )

    const respuesta =
      respuestaErrorEmpresa(
        error
      )

    return NextResponse.json(
      respuesta.body,
      {
        status:
          respuesta.status,
      }
    )
  }
}


// ============================================================
// DELETE INDICADORES
// app/admin/pesv/indicadores/page.jsx
// API: DELETE /api/admin/pesv/indicadores
//
// Acción:
// - eliminar_medicion
//
// Solo permite eliminar mediciones en BORRADOR.
// ============================================================

export async function DELETE(
  request
) {
  let body = null

  try {
    body =
      await request.json()

    const {
      empresa,
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const accion =
      mayusculas(
        body?.accion
      ).toLowerCase()

    if (
      accion !==
      'eliminar_medicion'
    ) {
      return responderError(
        'Acción DELETE no reconocida.',
        400,
        'ACCION_INVALIDA'
      )
    }

    const id =
      entero(
        body?.id
      )

    if (
      !id
    ) {
      return responderError(
        'Debe indicar la medición.',
        400,
        'ID_REQUIRED'
      )
    }

    const {
      data:
        medicion,
      error:
        errorConsulta,
    } =
      await supabaseAdmin
        .from(
          'pesv_indicadores_mediciones'
        )
        .select(
          'id,estado'
        )
        .eq(
          'id',
          id
        )
        .maybeSingle()

    if (
      errorConsulta
    ) {
      throw errorConsulta
    }

    if (
      !medicion
    ) {
      return responderError(
        'La medición no existe.',
        404,
        'MEDICION_NOT_FOUND'
      )
    }

    if (
      mayusculas(
        medicion.estado
      ) !==
      'BORRADOR'
    ) {
      return responderError(
        'Solo las mediciones en borrador pueden eliminarse.',
        409,
        'MEDICION_PROTEGIDA'
      )
    }

    const {
      error,
    } =
      await supabaseAdmin
        .from(
          'pesv_indicadores_mediciones'
        )
        .delete()
        .eq(
          'id',
          id
        )

    if (
      error
    ) {
      throw error
    }

    return responderOk({
      empresa,

      id,

      message:
        'Medición eliminada correctamente.',
    })
  } catch (
    error
  ) {
    console.error(
      'DELETE /api/admin/pesv/indicadores:',
      error
    )

    const respuesta =
      respuestaErrorEmpresa(
        error
      )

    return NextResponse.json(
      respuesta.body,
      {
        status:
          respuesta.status,
      }
    )
  }
}
    
