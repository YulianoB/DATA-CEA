// app/api/admin/pesv/indicadores/rsvi/route.js

import {
  NextResponse,
} from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'


// ============================================================
// CONSTANTES
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

const CODIGO_INDICADOR =
  'RSVI'

const NIVEL_VALORACION_ALTA =
  'CRITICO'

const UNIDAD_RESULTADO =
  'RIESGOS'

const OPERADORES_META = [
  '>=',
  '<=',
  '=',
  '>',
  '<',
]


// ============================================================
// RESPUESTA DE ERROR
// app/api/admin/pesv/indicadores/rsvi/route.js
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
      ok:
        false,

      ...respuesta.body,
    },
    {
      status:
        respuesta.status,
    }
  )
}


// ============================================================
// HELPERS GENERALES
// app/api/admin/pesv/indicadores/rsvi/route.js
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
  ).toUpperCase()
}


function entero(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null
  }

  const numero =
    Number(
      valor
    )

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return null
  }

  return Math.trunc(
    numero
  )
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

  const resultado =
    Number(
      valor
    )

  return Number.isFinite(
    resultado
  )
    ? resultado
    : null
}


function fechaIso(
  valor
) {
  const resultado =
    texto(
      valor
    )

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      resultado
    )
  ) {
    return null
  }

  return resultado
}


function fechaDesdeValor(
  valor
) {
  if (
    !valor
  ) {
    return null
  }

  const resultado =
    String(
      valor
    )
      .slice(
        0,
        10
      )

  return fechaIso(
    resultado
  )
}


function nombreEmpresa(
  empresa
) {
  return (
    texto(
      empresa?.nombre
    ) ||
    texto(
      empresa?.nombre_empresa
    ) ||
    texto(
      empresa?.razon_social
    ) ||
    '-'
  )
}


// ============================================================
// VALIDAR VIGENCIA
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

function validarAnio(
  valor
) {
  const anio =
    entero(
      valor
    ) ||
    new Date()
      .getFullYear()

  if (
    anio <
    2022
  ) {
    const error =
      new Error(
        'La vigencia del indicador RSVI debe ser igual o posterior a 2022.'
      )

    error.status =
      400

    error.code =
      'RSVI_YEAR_INVALID'

    throw error
  }

  return anio
}


// ============================================================
// FECHAS DE CORTE
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

function construirPeriodoAnual(
  anio
) {
  return {
    tipo_periodo:
      'ANUAL',

    numero_periodo:
      null,

    periodo_desde:
      `${anio}-01-01`,

    periodo_hasta:
      `${anio}-12-31`,

    fecha_inicio:
      `${anio}-01-01`,

    fecha_cierre:
      `${anio}-12-31`,
  }
}


// ============================================================
// CUMPLIMIENTO DE META
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

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

  const operadorNormalizado =
    texto(
      operador
    )

  if (
    valorResultado ===
      null ||
    valorMeta ===
      null ||
    !OPERADORES_META.includes(
      operadorNormalizado
    )
  ) {
    return null
  }

  switch (
    operadorNormalizado
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
// OBTENER INDICADOR RSVI DEL CATÁLOGO
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

async function obtenerIndicadorRsvi(
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
    throw new Error(
      `No fue posible consultar el indicador RSVI: ${error.message}`
    )
  }

  if (
    !data
  ) {
    const errorIndicador =
      new Error(
        'El indicador RSVI no está registrado en pesv_indicadores_catalogo.'
      )

    errorIndicador.status =
      404

    errorIndicador.code =
      'RSVI_NOT_FOUND'

    throw errorIndicador
  }

  return data
}


// ============================================================
// OBTENER CONFIGURACIÓN RSVI
// app/api/admin/pesv/indicadores/rsvi/route.js
//
// La configuración continúa siendo administrada por el módulo
// general de Indicadores PESV.
//
// Campos generales:
// - linea_base
// - valor_meta
// - operador_meta
// - unidad_meta
// - fuente_informacion
// - interpretacion_indicador
// - personas_deben_conocer_resultado
// - observaciones
// - activo
//
// configuracion_especifica puede utilizarse posteriormente para
// complementar la configuración del segundo resultado normativo.
// ============================================================

async function obtenerConfiguracionRsvi(
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
    throw new Error(
      `No fue posible consultar la configuración RSVI: ${error.message}`
    )
  }

  return data ||
    null
}


// ============================================================
// OBTENER MEDICIÓN RSVI EXISTENTE
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

async function obtenerMedicionRsvi(
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
        'pesv_indicadores_mediciones'
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
      .eq(
        'tipo_periodo',
        'ANUAL'
      )
      .order(
        'id',
        {
          ascending:
            false,
        }
      )
      .limit(
        1
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar la medición RSVI: ${error.message}`
    )
  }

  return Array.isArray(
    data
  ) &&
  data.length >
    0
    ? data[0]
    : null
}


// ============================================================
// CONSULTAR RIESGOS DE LA VIGENCIA
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

async function obtenerRiesgosVigencia(
  supabase,
  anio
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_riesgos'
      )
      .select(`
        id,
        anio,
        codigo,
        fecha_identificacion,
        fecha_valoracion,
        proceso,
        actividad,
        factor_riesgo,
        situacion_riesgo,
        descripcion_riesgo,
        exposicion,
        probabilidad,
        valor_nivel_riesgo,
        nivel_riesgo,
        severidad,
        prioridad_intervencion,
        estado,
        activo,
        created_at
      `)
      .eq(
        'anio',
        anio
      )
      .order(
        'fecha_identificacion',
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
    error
  ) {
    throw new Error(
      `No fue posible consultar los riesgos de la vigencia ${anio}: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


// ============================================================
// CONSULTAR SEGUIMIENTOS DE LOS RIESGOS
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

async function obtenerSeguimientosRiesgos(
  supabase,
  riesgoIds
) {
  if (
    !Array.isArray(
      riesgoIds
    ) ||
    riesgoIds.length ===
      0
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_riesgos_seguimientos'
      )
      .select(`
        id,
        riesgo_id,
        fecha_seguimiento,
        tipo_seguimiento,
        numero_valoracion,
        exposicion,
        probabilidad,
        valor_nivel_riesgo,
        nivel_riesgo,
        severidad,
        prioridad_intervencion,
        estado_riesgo,
        resultado,
        created_at
      `)
      .in(
        'riesgo_id',
        riesgoIds
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
    error
  ) {
    throw new Error(
      `No fue posible consultar los seguimientos de los riesgos: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


// ============================================================
// AGRUPAR SEGUIMIENTOS POR RIESGO
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

function agruparSeguimientos(
  seguimientos
) {
  const mapa =
    new Map()

  for (
    const seguimiento of seguimientos
  ) {
    const clave =
      String(
        seguimiento?.riesgo_id
      )

    if (
      !mapa.has(
        clave
      )
    ) {
      mapa.set(
        clave,
        []
      )
    }

    mapa
      .get(
        clave
      )
      .push(
        seguimiento
      )
  }

  return mapa
}


// ============================================================
// DETERMINAR FECHA DE IDENTIFICACIÓN
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

function obtenerFechaIdentificacion(
  riesgo
) {
  return (
    fechaDesdeValor(
      riesgo?.fecha_identificacion
    ) ||
    fechaDesdeValor(
      riesgo?.fecha_valoracion
    ) ||
    fechaDesdeValor(
      riesgo?.created_at
    )
  )
}


// ============================================================
// DETERMINAR SI EL RIESGO EXISTÍA EN UNA FECHA DE CORTE
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

function riesgoExistiaEnFecha(
  riesgo,
  fechaCorte
) {
  const fechaIdentificacion =
    obtenerFechaIdentificacion(
      riesgo
    )

  if (
    !fechaIdentificacion
  ) {
    return false
  }

  return (
    fechaIdentificacion <=
    fechaCorte
  )
}


// ============================================================
// VALORACIÓN INICIAL
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

function obtenerValoracionInicial(
  riesgo
) {
  return {
    origen:
      'VALORACION_INICIAL',

    valoracion_id:
      riesgo?.id ||
      null,

    numero_valoracion:
      1,

    fecha:
      fechaDesdeValor(
        riesgo?.fecha_valoracion
      ) ||
      obtenerFechaIdentificacion(
        riesgo
      ),

    exposicion:
      entero(
        riesgo?.exposicion
      ),

    probabilidad:
      entero(
        riesgo?.probabilidad
      ),

    valor_nivel_riesgo:
      entero(
        riesgo?.valor_nivel_riesgo
      ),

    nivel_riesgo:
      mayusculas(
        riesgo?.nivel_riesgo
      ),

    severidad:
      entero(
        riesgo?.severidad
      ),

    prioridad_intervencion:
      texto(
        riesgo
          ?.prioridad_intervencion
      ),
  }
}


// ============================================================
// ÚLTIMA VALORACIÓN DISPONIBLE HASTA UNA FECHA
// app/api/admin/pesv/indicadores/rsvi/route.js
//
// La valoración inicial permanece en pesv_riesgos.
// Las valoraciones posteriores permanecen en
// pesv_riesgos_seguimientos.
//
// Si no existe seguimiento hasta la fecha de corte,
// se conserva la valoración inicial.
// ============================================================

function obtenerValoracionHastaFecha(
  riesgo,
  seguimientos,
  fechaCorte
) {
  const inicial =
    obtenerValoracionInicial(
      riesgo
    )

  const posteriores =
    (
      Array.isArray(
        seguimientos
      )
        ? seguimientos
        : []
    )
      .filter(
        seguimiento => {
          const fecha =
            fechaDesdeValor(
              seguimiento
                ?.fecha_seguimiento
            )

          return (
            fecha &&
            fecha <=
              fechaCorte
          )
        }
      )
      .sort(
        (
          a,
          b
        ) => {
          const fechaA =
            fechaDesdeValor(
              a?.fecha_seguimiento
            ) ||
            ''

          const fechaB =
            fechaDesdeValor(
              b?.fecha_seguimiento
            ) ||
            ''

          if (
            fechaA !==
            fechaB
          ) {
            return fechaA.localeCompare(
              fechaB
            )
          }

          const numeroA =
            entero(
              a?.numero_valoracion
            ) ||
            0

          const numeroB =
            entero(
              b?.numero_valoracion
            ) ||
            0

          if (
            numeroA !==
            numeroB
          ) {
            return (
              numeroA -
              numeroB
            )
          }

          return (
            (
              entero(
                a?.id
              ) ||
              0
            ) -
            (
              entero(
                b?.id
              ) ||
              0
            )
          )
        }
      )

  if (
    posteriores.length ===
    0
  ) {
    return inicial
  }

  const ultimo =
    posteriores[
      posteriores.length -
      1
    ]

  return {
    origen:
      'SEGUIMIENTO',

    valoracion_id:
      ultimo?.id ||
      null,

    numero_valoracion:
      entero(
        ultimo
          ?.numero_valoracion
      ),

    fecha:
      fechaDesdeValor(
        ultimo
          ?.fecha_seguimiento
      ),

    tipo_seguimiento:
      mayusculas(
        ultimo
          ?.tipo_seguimiento
      ),

    exposicion:
      entero(
        ultimo?.exposicion
      ),

    probabilidad:
      entero(
        ultimo?.probabilidad
      ),

    valor_nivel_riesgo:
      entero(
        ultimo
          ?.valor_nivel_riesgo
      ),

    nivel_riesgo:
      mayusculas(
        ultimo?.nivel_riesgo
      ),

    severidad:
      entero(
        ultimo?.severidad
      ),

    prioridad_intervencion:
      texto(
        ultimo
          ?.prioridad_intervencion
      ),
  }
}


// ============================================================
// IDENTIFICAR VALORACIÓN ALTA
// app/api/admin/pesv/indicadores/rsvi/route.js
//
// La metodología propia del módulo clasifica:
// BAJO      = NR 1–2
// MODERADO  = NR 3–4
// CRITICO   = NR 6–9
//
// Para RSVI se utiliza CRITICO como categoría superior
// de valoración.
// ============================================================

function esValoracionAlta(
  valoracion
) {
  return (
    mayusculas(
      valoracion
        ?.nivel_riesgo
    ) ===
    NIVEL_VALORACION_ALTA
  )
}


// ============================================================
// DETALLE DE UN RIESGO PARA RSVI
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

function construirDetalleRiesgo({
  riesgo,
  seguimientos,
  fechaInicio,
  fechaCierre,
}) {
  const fechaIdentificacion =
    obtenerFechaIdentificacion(
      riesgo
    )

  const existiaInicio =
    riesgoExistiaEnFecha(
      riesgo,
      fechaInicio
    )

  const existiaCierre =
    riesgoExistiaEnFecha(
      riesgo,
      fechaCierre
    )

  const valoracionInicial =
    obtenerValoracionInicial(
      riesgo
    )

  const valoracionInicio =
    existiaInicio
      ? obtenerValoracionHastaFecha(
          riesgo,
          seguimientos,
          fechaInicio
        )
      : null

  const valoracionCierre =
    existiaCierre
      ? obtenerValoracionHastaFecha(
          riesgo,
          seguimientos,
          fechaCierre
        )
      : null

  return {
    riesgo_id:
      riesgo?.id ||
      null,

    codigo:
      texto(
        riesgo?.codigo
      ),

    fecha_identificacion:
      fechaIdentificacion,

    proceso:
      texto(
        riesgo?.proceso
      ),

    actividad:
      texto(
        riesgo?.actividad
      ),

    factor_riesgo:
      texto(
        riesgo?.factor_riesgo
      ),

    situacion_riesgo:
      texto(
        riesgo?.situacion_riesgo ||
        riesgo?.descripcion_riesgo
      ),

    estado:
      texto(
        riesgo?.estado
      ),

    activo:
      riesgo?.activo !==
      false,

    existia_inicio:
      existiaInicio,

    existia_cierre:
      existiaCierre,

    valoracion_inicial_registrada:
      valoracionInicial,

    valoracion_inicio:
      valoracionInicio,

    valoracion_cierre:
      valoracionCierre,

    valoracion_alta_inicio:
      existiaInicio &&
      esValoracionAlta(
        valoracionInicio
      ),

    valoracion_alta_cierre:
      existiaCierre &&
      esValoracionAlta(
        valoracionCierre
      ),

    total_seguimientos:
      Array.isArray(
        seguimientos
      )
        ? seguimientos.length
        : 0,
  }
}


// ============================================================
// CALCULAR RSVI
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

async function calcularRsvi(
  supabase,
  anio
) {
  const periodo =
    construirPeriodoAnual(
      anio
    )

  const riesgos =
    await obtenerRiesgosVigencia(
      supabase,
      anio
    )

  const riesgoIds =
    riesgos
      .map(
        riesgo =>
          riesgo?.id
      )
      .filter(
        valor =>
          valor !==
            null &&
          valor !==
            undefined
      )

  const seguimientos =
    await obtenerSeguimientosRiesgos(
      supabase,
      riesgoIds
    )

  const seguimientosPorRiesgo =
    agruparSeguimientos(
      seguimientos
    )

  const detalle =
    riesgos.map(
      riesgo =>
        construirDetalleRiesgo({
          riesgo,

          seguimientos:
            seguimientosPorRiesgo.get(
              String(
                riesgo.id
              )
            ) ||
            [],

          fechaInicio:
            periodo.fecha_inicio,

          fechaCierre:
            periodo.fecha_cierre,
        })
    )

  // ==========================================================
  // RI(ia)
  // Riesgos identificados al inicio del año
  // ==========================================================

  const riesgosInicio =
    detalle.filter(
      item =>
        item.existia_inicio
    )

  const riIa =
    riesgosInicio.length


  // ==========================================================
  // RI(fa)
  // Riesgos identificados al final del año
  // ==========================================================

  const riesgosFinal =
    detalle.filter(
      item =>
        item.existia_cierre
    )

  const riFa =
    riesgosFinal.length


  // ==========================================================
  // RSVI = RI(fa) - RI(ia)
  // ==========================================================

  const resultadoRsvi =
    riFa -
    riIa


  // ==========================================================
  // RVA(ia)
  // Riesgos con valoración alta al inicio
  // ==========================================================

  const riesgosAltaInicio =
    detalle.filter(
      item =>
        item.existia_inicio &&
        item.valoracion_alta_inicio
    )

  const rvaIa =
    riesgosAltaInicio.length


  // ==========================================================
  // RVA(fa)
  // Riesgos con valoración alta al final
  // ==========================================================

  const riesgosAltaFinal =
    detalle.filter(
      item =>
        item.existia_cierre &&
        item.valoracion_alta_cierre
    )

  const rvaFa =
    riesgosAltaFinal.length


  // ==========================================================
  // VARIACIÓN DE RIESGOS CON VALORACIÓN ALTA
  // RVA(fa) - RVA(ia)
  // ==========================================================

  const variacionRva =
    rvaFa -
    rvaIa


  // ==========================================================
  // CAMBIOS DURANTE LA VIGENCIA
  // Información de apoyo para análisis
  // ==========================================================

  const nuevosDuranteAnio =
    detalle.filter(
      item =>
        !item.existia_inicio &&
        item.existia_cierre
    )

  const pasanACritico =
    detalle.filter(
      item =>
        item.existia_inicio &&
        item.existia_cierre &&
        item.valoracion_alta_inicio ===
          false &&
        item.valoracion_alta_cierre ===
          true
    )

  const salenDeCritico =
    detalle.filter(
      item =>
        item.existia_inicio &&
        item.existia_cierre &&
        item.valoracion_alta_inicio ===
          true &&
        item.valoracion_alta_cierre ===
          false
    )

  const sinSeguimiento =
    detalle.filter(
      item =>
        item.existia_cierre &&
        item.total_seguimientos ===
          0
    )


  // ==========================================================
  // ADVERTENCIAS
  // ==========================================================

  const advertencias = []

  if (
    riesgos.length ===
    0
  ) {
    advertencias.push(
      `No se encontraron riesgos registrados en la Matriz de Riesgos PESV para la vigencia ${anio}.`
    )
  }

  if (
    riIa ===
      0 &&
    riFa >
      0
  ) {
    advertencias.push(
      'No se encontraron riesgos con fecha de identificación igual o anterior al inicio de la vigencia. Los riesgos registrados durante el año se contabilizan en RI(fa), pero no en RI(ia).'
    )
  }

  if (
    sinSeguimiento.length >
    0
  ) {
    advertencias.push(
      `${sinSeguimiento.length} riesgo(s) no tienen valoraciones posteriores registradas. Para ellos, la valoración al cierre permanece igual a la valoración inicial.`
    )
  }


  return {
    codigo:
      CODIGO_INDICADOR,

    nombre:
      'Riesgos de Seguridad Vial identificados',

    periodicidad:
      'ANUAL',

    origen_calculo:
      'AUTOMATICO',

    unidad_resultado:
      UNIDAD_RESULTADO,

    nivel_valoracion_alta:
      NIVEL_VALORACION_ALTA,

    periodo,

    // ========================================================
    // RESULTADO PRINCIPAL
    // ========================================================

    numerador:
      riFa,

    denominador:
      riIa,

    valor_resultado:
      resultadoRsvi,

    // ========================================================
    // RESULTADOS NORMATIVOS
    // ========================================================

    resultados: {
      riesgos_identificados: {
        ri_inicio_anio:
          riIa,

        ri_final_anio:
          riFa,

        resultado:
          resultadoRsvi,

        formula:
          'RI(fa) - RI(ia)',

        unidad:
          UNIDAD_RESULTADO,
      },

      riesgos_valoracion_alta: {
        rva_inicio_anio:
          rvaIa,

        rva_final_anio:
          rvaFa,

        resultado:
          variacionRva,

        formula:
          'RVA(fa) - RVA(ia)',

        unidad:
          UNIDAD_RESULTADO,

        criterio_valoracion_alta:
          NIVEL_VALORACION_ALTA,
      },
    },

    // ========================================================
    // INFORMACIÓN PARA ANÁLISIS
    // ========================================================

    resumen: {
      total_riesgos_vigencia:
        riesgos.length,

      riesgos_inicio:
        riIa,

      riesgos_final:
        riFa,

      riesgos_nuevos_durante_anio:
        nuevosDuranteAnio.length,

      riesgos_valoracion_alta_inicio:
        rvaIa,

      riesgos_valoracion_alta_final:
        rvaFa,

      riesgos_que_pasan_a_critico:
        pasanACritico.length,

      riesgos_que_salen_de_critico:
        salenDeCritico.length,

      riesgos_sin_seguimiento:
        sinSeguimiento.length,

      total_seguimientos:
        seguimientos.length,
    },

    ids: {
      riesgos_inicio:
        riesgosInicio.map(
          item =>
            item.riesgo_id
        ),

      riesgos_final:
        riesgosFinal.map(
          item =>
            item.riesgo_id
        ),

      riesgos_nuevos:
        nuevosDuranteAnio.map(
          item =>
            item.riesgo_id
        ),

      valoracion_alta_inicio:
        riesgosAltaInicio.map(
          item =>
            item.riesgo_id
        ),

      valoracion_alta_final:
        riesgosAltaFinal.map(
          item =>
            item.riesgo_id
        ),

      pasan_a_critico:
        pasanACritico.map(
          item =>
            item.riesgo_id
        ),

      salen_de_critico:
        salenDeCritico.map(
          item =>
            item.riesgo_id
        ),
    },

    detalle_riesgos:
      detalle,

    advertencias,
  }
}


// ============================================================
// EVALUAR CONFIGURACIÓN / META
// app/api/admin/pesv/indicadores/rsvi/route.js
// ============================================================

function evaluarConfiguracion(
  calculo,
  configuracion
) {
  if (
    !configuracion
  ) {
    return {
      configurado:
        false,

      linea_base:
        null,

      operador_meta:
        null,

      valor_meta:
        null,

      unidad_meta:
        null,

      fuente_informacion:
        null,

      interpretacion_indicador:
        null,

      personas_deben_conocer_resultado:
        null,

      observaciones:
        null,

      cumple_meta:
        null,

      evaluacion_disponible:
        false,
    }
  }

  const lineaBase =
    numero(
      configuracion
        ?.linea_base
    )

  const operadorMeta =
    texto(
      configuracion
        ?.operador_meta
    )

  const valorMeta =
    numero(
      configuracion
        ?.valor_meta
    )

  const cumpleMeta =
    valorCumpleMeta(
      calculo
        ?.valor_resultado,
      operadorMeta,
      valorMeta
    )

  return {
    configurado:
      configuracion
        ?.activo !==
      false,

    linea_base:
      lineaBase,

    operador_meta:
      operadorMeta ||
      null,

    valor_meta:
      valorMeta,

    unidad_meta:
      texto(
        configuracion
          ?.unidad_meta
      ) ||
      UNIDAD_RESULTADO,

    fuente_informacion:
      texto(
        configuracion
          ?.fuente_informacion
      ) ||
      null,

    interpretacion_indicador:
      texto(
        configuracion
          ?.interpretacion_indicador
      ) ||
      null,

    personas_deben_conocer_resultado:
      texto(
        configuracion
          ?.personas_deben_conocer_resultado
      ) ||
      null,

    observaciones:
      texto(
        configuracion
          ?.observaciones
      ) ||
      null,

    configuracion_especifica:
      configuracion
        ?.configuracion_especifica ||
      null,

    cumple_meta:
      cumpleMeta,

    evaluacion_disponible:
      cumpleMeta !==
      null,
  }
}


// ============================================================
// GET RSVI
// app/api/admin/pesv/indicadores/rsvi/route.js
//
// Ejemplo:
// GET /api/admin/pesv/indicadores/rsvi?nit=900000000&anio=2026
//
// Esta API:
// 1. Resuelve el CEA dinámicamente.
// 2. Obtiene el indicador RSVI.
// 3. Obtiene su configuración.
// 4. Calcula RI(ia), RI(fa) y RSVI.
// 5. Calcula RVA(ia), RVA(fa) y su variación.
// 6. Evalúa la meta general configurada.
// 7. Devuelve trazabilidad de los riesgos considerados.
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

    const indicador =
      await obtenerIndicadorRsvi(
        supabaseAdmin
      )

    const [
      configuracion,
      medicion,
      calculo,
    ] =
      await Promise.all([
        obtenerConfiguracionRsvi(
          supabaseAdmin,
          indicador.id,
          anio
        ),

        obtenerMedicionRsvi(
          supabaseAdmin,
          indicador.id,
          anio
        ),

        calcularRsvi(
          supabaseAdmin,
          anio
        ),
      ])

    const evaluacion =
      evaluarConfiguracion(
        calculo,
        configuracion
      )

    return NextResponse.json({
      ok:
        true,

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

      periodo:
        calculo.periodo,

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
      'ERROR GET RSVI:',
      error
    )

    return respuestaError(
      error
    )
  }
}