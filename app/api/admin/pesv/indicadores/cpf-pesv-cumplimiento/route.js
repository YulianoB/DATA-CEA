// app/api/admin/pesv/indicadores/cpf-pesv-cumplimiento/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
} from '@/lib/supabaseEmpresaServer'


// ============================================================
// PESV - CPF_PESV_CUMPLIMIENTO
//
// Cumplimiento Plan de Formación en Seguridad Vial
//
// Fórmula:
//   Capacitaciones ejecutadas
//   ------------------------- x 100
//   Capacitaciones programadas
//
// Fuente:
// - pesv_planes_formacion
// - pesv_plan_formacion_actividades
//
// IMPORTANTE:
// - La API solamente calcula y devuelve trazabilidad.
// - El guardado de la medición continúa en la API general de
//   indicadores.
// - Cada solicitud se resuelve contra la base del CEA indicada
//   por su NIT.
// ============================================================

const CODIGO_INDICADOR =
  'CPF_PESV_CUMPLIMIENTO'

const OPERADORES_META =
  new Set([
    '>=',
    '<=',
    '=',
    '>',
    '<',
  ])


// ============================================================
// HELPERS
// ============================================================

function texto(valor) {
  return String(
    valor ?? ''
  ).trim()
}


function mayusculas(valor) {
  return texto(
    valor
  ).toUpperCase()
}


function numero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null
  }

  const resultado =
    Number(valor)

  return Number.isFinite(
    resultado
  )
    ? resultado
    : null
}


function entero(valor) {
  const resultado =
    numero(valor)

  if (
    resultado === null
  ) {
    return null
  }

  return Math.trunc(
    resultado
  )
}


function redondear(
  valor,
  decimales = 2
) {
  const resultado =
    numero(valor)

  if (
    resultado === null
  ) {
    return null
  }

  const factor =
    10 ** decimales

  return Math.round(
    (
      resultado +
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
    numero(numerador)

  const d =
    numero(denominador)

  if (
    n === null ||
    d === null ||
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


function responderError(
  message,
  status = 400,
  code = 'ERROR'
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


function obtenerTrimestreFecha(
  fecha
) {
  const valor =
    texto(fecha).slice(
      0,
      10
    )

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      valor
    )
  ) {
    return null
  }

  const mes =
    Number(
      valor.slice(
        5,
        7
      )
    )

  if (
    !Number.isInteger(mes) ||
    mes < 1 ||
    mes > 12
  ) {
    return null
  }

  return Math.ceil(
    mes /
      3
  )
}


function obtenerAnioFecha(
  fecha
) {
  const valor =
    texto(fecha).slice(
      0,
      10
    )

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      valor
    )
  ) {
    return null
  }

  return Number(
    valor.slice(
      0,
      4
    )
  )
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
    .slice(
      0,
      10
    )
}


function resolverPeriodo(
  anio,
  tipoPeriodo,
  numeroPeriodo
) {
  const tipo =
    mayusculas(
      tipoPeriodo ||
      'TRIMESTRE'
    )

  if (
    tipo === 'ANUAL'
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
    }
  }

  if (
    tipo !== 'TRIMESTRE'
  ) {
    throw new Error(
      'CPF_PESV_CUMPLIMIENTO solo admite TRIMESTRE o ANUAL.'
    )
  }

  const trimestre =
    entero(
      numeroPeriodo
    )

  if (
    !trimestre ||
    trimestre < 1 ||
    trimestre > 4
  ) {
    throw new Error(
      'El número de trimestre debe estar entre 1 y 4.'
    )
  }

  const mesInicio =
    (
      trimestre -
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
      trimestre,

    periodo_desde:
      `${anio}-${String(
        mesInicio
      ).padStart(
        2,
        '0'
      )}-01`,

    periodo_hasta:
      ultimoDiaMes(
        anio,
        mesFin
      ),
  }
}


function valorCumpleMeta(
  resultado,
  operador,
  meta
) {
  const valorResultado =
    numero(resultado)

  const valorMeta =
    numero(meta)

  const op =
    texto(operador)

  if (
    valorResultado === null ||
    valorMeta === null ||
    !OPERADORES_META.has(op)
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
// CONSULTAR INDICADOR
// ============================================================

async function obtenerIndicador(
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
    throw error
  }

  return data ||
    null
}


// ============================================================
// CONSULTAR CONFIGURACIÓN
// ============================================================

async function obtenerConfiguracion(
  supabase,
  indicadorId,
  anio
) {
  if (
    !indicadorId
  ) {
    return null
  }

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
// CONSULTAR PLAN DE FORMACIÓN
// ============================================================

async function obtenerPlanFormacion(
  supabase,
  anio
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_planes_formacion'
      )
      .select(`
        id,
        anio,
        nombre,
        objetivo_general,
        fecha_aprobacion,
        estado,
        responsable_personal_id,
        responsable_nombre,
        observaciones
      `)
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
// CONSULTAR ACTIVIDADES DEL PLAN
// ============================================================

async function obtenerActividades(
  supabase,
  planId
) {
  if (
    !planId
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_plan_formacion_actividades'
      )
      .select(`
        id,
        plan_formacion_id,
        codigo,
        nombre,
        descripcion,
        tema,
        objetivo,
        dirigido_a,
        personas_programadas,
        modalidad,
        responsable_personal_id,
        responsable_nombre,
        fecha_programada,
        trimestre,
        duracion_horas,
        estado,
        observaciones,
        programa_pesv_relacionado,
        formador_perfil_requerido,
        evidencia_esperada,
        meta
      `)
      .eq(
        'plan_formacion_id',
        planId
      )
      .order(
        'fecha_programada',
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
    throw error
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


// ============================================================
// NORMALIZAR ACTIVIDAD PARA TRAZABILIDAD
// ============================================================

function normalizarActividad(
  actividad,
  anio
) {
  const trimestreFecha =
    obtenerTrimestreFecha(
      actividad
        ?.fecha_programada
    )

  const anioFecha =
    obtenerAnioFecha(
      actividad
        ?.fecha_programada
    )

  const trimestreGuardado =
    entero(
      actividad
        ?.trimestre
    )

  const trimestre =
    trimestreFecha ||
    (
      trimestreGuardado >= 1 &&
      trimestreGuardado <= 4
        ? trimestreGuardado
        : null
    )

  const estado =
    mayusculas(
      actividad?.estado
    )

  const fechaValidaVigencia =
    anioFecha ===
    Number(anio)

  return {
    actividad_id:
      actividad?.id,

    id:
      actividad?.id,

    codigo:
      texto(
        actividad?.codigo
      ),

    nombre:
      texto(
        actividad?.nombre
      ),

    descripcion:
      texto(
        actividad?.descripcion
      ),

    tema:
      texto(
        actividad?.tema
      ),

    objetivo:
      texto(
        actividad?.objetivo
      ),

    dirigido_a:
      texto(
        actividad?.dirigido_a
      ),

    personas_programadas:
      numero(
        actividad
          ?.personas_programadas
      ),

    modalidad:
      texto(
        actividad?.modalidad
      ),

    responsable_personal_id:
      actividad
        ?.responsable_personal_id ??
      null,

    responsable_nombre:
      texto(
        actividad
          ?.responsable_nombre
      ),

    fecha_programada:
      actividad
        ?.fecha_programada ||
      null,

    trimestre,

    duracion_horas:
      numero(
        actividad
          ?.duracion_horas
      ),

    estado:
      estado ||
      'PROGRAMADA',

    programa_pesv_relacionado:
      texto(
        actividad
          ?.programa_pesv_relacionado
      ),

    formador_perfil_requerido:
      texto(
        actividad
          ?.formador_perfil_requerido
      ),

    evidencia_esperada:
      texto(
        actividad
          ?.evidencia_esperada
      ),

    meta:
      texto(
        actividad?.meta
      ),

    observaciones:
      texto(
        actividad
          ?.observaciones
      ),

    fecha_valida_vigencia:
      fechaValidaVigencia,

    cuenta_programada:
      fechaValidaVigencia,

    cuenta_ejecutada:
      (
        fechaValidaVigencia &&
        estado ===
          'EJECUTADA'
      ),
  }
}


// ============================================================
// RESUMEN DE UN CONJUNTO DE ACTIVIDADES
// ============================================================

function resumirActividades(
  actividades
) {
  const programadas =
    actividades.filter(
      actividad =>
        actividad
          ?.cuenta_programada ===
        true
    ).length

  const ejecutadas =
    actividades.filter(
      actividad =>
        actividad
          ?.cuenta_ejecutada ===
        true
    ).length

  return {
    programadas,
    ejecutadas,
    cumplimiento:
      porcentaje(
        ejecutadas,
        programadas
      ),
  }
}


// ============================================================
// CONSTRUIR RESUMEN TRIMESTRAL
// ============================================================

function construirResumenTrimestral(
  actividades
) {
  return [
    1,
    2,
    3,
    4,
  ].map(
    trimestre => {
      const actividadesTrimestre =
        actividades.filter(
          actividad =>
            actividad
              ?.trimestre ===
            trimestre
        )

      const resumen =
        resumirActividades(
          actividadesTrimestre
        )

      return {
        trimestre,
        numero_periodo:
          trimestre,

        capacitaciones_programadas:
          resumen.programadas,

        capacitaciones_ejecutadas:
          resumen.ejecutadas,

        programadas:
          resumen.programadas,

        ejecutadas:
          resumen.ejecutadas,

        cumplimiento:
          resumen.cumplimiento,

        valor_resultado:
          resumen.cumplimiento,
      }
    }
  )
}


// ============================================================
// GET
// ============================================================

export async function GET(
  request
) {
  try {
    const {
      supabaseAdmin,
      empresa,
      nit,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const supabase =
      supabaseAdmin

    const {
      searchParams,
    } =
      new URL(
        request.url
      )

    const anio =
      entero(
        searchParams.get(
          'anio'
        )
      )

    if (
      !anio ||
      anio < 2022 ||
      anio > 2100
    ) {
      return responderError(
        'Debe indicar una vigencia válida.',
        400,
        'ANIO_INVALIDO'
      )
    }

    const tipoPeriodo =
      mayusculas(
        searchParams.get(
          'tipo_periodo'
        ) ||
        'TRIMESTRE'
      )

    const numeroPeriodo =
      entero(
        searchParams.get(
          'numero_periodo'
        )
      )

    let periodo

    try {
      periodo =
        resolverPeriodo(
          anio,
          tipoPeriodo,
          numeroPeriodo
        )
    } catch (
      errorPeriodo
    ) {
      return responderError(
        errorPeriodo
          ?.message ||
        'El período no es válido.',
        400,
        'PERIODO_INVALIDO'
      )
    }

    // ========================================================
    // INDICADOR Y CONFIGURACIÓN
    // ========================================================

    const indicador =
      await obtenerIndicador(
        supabase
      )

    const configuracion =
      indicador
        ? await obtenerConfiguracion(
            supabase,
            indicador.id,
            anio
          )
        : null

    // ========================================================
    // PLAN ANUAL DE FORMACIÓN
    // ========================================================

    const plan =
      await obtenerPlanFormacion(
        supabase,
        anio
      )

    const actividadesDb =
      plan
        ? await obtenerActividades(
            supabase,
            plan.id
          )
        : []

    const actividades =
      actividadesDb.map(
        actividad =>
          normalizarActividad(
            actividad,
            anio
          )
      )

    // ========================================================
    // ADVERTENCIAS DE TRAZABILIDAD
    // ========================================================

    const advertencias = []

    if (
      !plan
    ) {
      advertencias.push(
        `No existe un Plan Anual de Formación en Seguridad Vial para la vigencia ${anio}.`
      )
    }

    const actividadesFechaInvalida =
      actividades.filter(
        actividad =>
          actividad
            ?.fecha_valida_vigencia !==
          true
      )

    if (
      actividadesFechaInvalida.length >
      0
    ) {
      advertencias.push(
        `${actividadesFechaInvalida.length} actividad(es) del plan no tienen una fecha programada válida dentro de la vigencia ${anio} y no fueron incluidas en el cálculo.`
      )
    }

    // ========================================================
    // RESUMEN TRIMESTRAL Y ANUAL
    // ========================================================

    const actividadesVigencia =
      actividades.filter(
        actividad =>
          actividad
            ?.fecha_valida_vigencia ===
          true
      )

    const resumenTrimestral =
      construirResumenTrimestral(
        actividadesVigencia
      )

    const resumenAnual =
      resumirActividades(
        actividadesVigencia
      )

    const acumuladoAnual = {
      capacitaciones_programadas:
        resumenAnual.programadas,

      capacitaciones_ejecutadas:
        resumenAnual.ejecutadas,

      programadas:
        resumenAnual.programadas,

      ejecutadas:
        resumenAnual.ejecutadas,

      cumplimiento:
        resumenAnual.cumplimiento,

      valor_resultado:
        resumenAnual.cumplimiento,
    }

    // ========================================================
    // PERÍODO SOLICITADO
    // ========================================================

    const actividadesPeriodo =
      periodo.tipo_periodo ===
      'ANUAL'
        ? actividadesVigencia
        : actividadesVigencia.filter(
            actividad =>
              actividad
                ?.trimestre ===
              periodo.numero_periodo
          )

    const resumenPeriodo =
      resumirActividades(
        actividadesPeriodo
      )

    const valorResultado =
      resumenPeriodo
        .cumplimiento

    if (
      resumenPeriodo.programadas ===
      0
    ) {
      advertencias.push(
        periodo.tipo_periodo ===
          'ANUAL'
          ? `No existen capacitaciones programadas en el Plan Anual de Formación para la vigencia ${anio}.`
          : `No existen capacitaciones programadas para el trimestre ${periodo.numero_periodo} de ${anio}.`
      )
    }

    // ========================================================
    // EVALUACIÓN DE LA META CONFIGURADA
    // ========================================================

    const lineaBase =
      numero(
        configuracion
          ?.linea_base
      )

    const valorMeta =
      numero(
        configuracion
          ?.valor_meta
      )

    const operadorMeta =
      texto(
        configuracion
          ?.operador_meta
      )

    const unidadMeta =
      texto(
        configuracion
          ?.unidad_meta
      ) ||
      texto(
        indicador
          ?.unidad
      ) ||
      'PORCENTAJE'

    const cumpleMeta =
      valorCumpleMeta(
        valorResultado,
        operadorMeta,
        valorMeta
      )

    const evaluacion = {
      linea_base:
        lineaBase,

      operador_meta:
        operadorMeta ||
        null,

      valor_meta:
        valorMeta,

      unidad_meta:
        unidadMeta,

      cumple_meta:
        cumpleMeta,
    }

    // ========================================================
    // RESPUESTA
    // ========================================================

    const calculo = {
      indicador_codigo:
        CODIGO_INDICADOR,

      indicador_nombre:
        indicador?.nombre ||
        'Cumplimiento Plan de Formación en Seguridad Vial',

      anio,

      periodo,

      numerador:
        resumenPeriodo
          .ejecutadas,

      denominador:
        resumenPeriodo
          .programadas,

      valor_resultado:
        valorResultado,

      unidad_resultado:
        'PORCENTAJE',

      origen_calculo:
        'AUTOMATICO',

      resultados: {
        capacitaciones_programadas:
          resumenPeriodo
            .programadas,

        capacitaciones_ejecutadas:
          resumenPeriodo
            .ejecutadas,

        cumplimiento_plan_formacion:
          valorResultado,
      },

      linea_base:
        lineaBase,

      operador_meta:
        operadorMeta ||
        null,

      valor_meta:
        valorMeta,

      unidad_meta:
        unidadMeta,

      cumple_meta:
        cumpleMeta,

      resumen_trimestral:
        resumenTrimestral,

      trimestres:
        resumenTrimestral,

      acumulado_anual:
        acumuladoAnual,

      resumen_anual:
        acumuladoAnual,

      resumen: {
        total_actividades_plan:
          actividadesVigencia
            .length,

        capacitaciones_programadas_periodo:
          resumenPeriodo
            .programadas,

        capacitaciones_ejecutadas_periodo:
          resumenPeriodo
            .ejecutadas,

        capacitaciones_programadas_anual:
          resumenAnual
            .programadas,

        capacitaciones_ejecutadas_anual:
          resumenAnual
            .ejecutadas,
      },

      detalle_actividades:
        actividadesPeriodo,

      advertencias,

      datos_calculo: {
        fuente:
          'Plan Anual de Formación en Seguridad Vial',

        formula:
          'Capacitaciones ejecutadas / Capacitaciones programadas × 100',

        periodo,

        resultados: {
          capacitaciones_programadas:
            resumenPeriodo
              .programadas,

          capacitaciones_ejecutadas:
            resumenPeriodo
              .ejecutadas,

          cumplimiento_plan_formacion:
            valorResultado,
        },

        resumen_trimestral:
          resumenTrimestral,

        acumulado_anual:
          acumuladoAnual,

        detalle_actividades:
          actividadesPeriodo,

        advertencias,
      },
    }

    return NextResponse.json(
      {
        ok: true,
        status: 'success',

        nit:
          nit ||
          empresa?.nit ||
          null,

        empresa:
          empresa ||
          null,

        indicador:
          indicador ||
          {
            codigo:
              CODIGO_INDICADOR,
          },

        configuracion,

        plan_formacion:
          plan,

        periodo,

        evaluacion,

        calculo,
      },
      {
        status: 200,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'ERROR CPF_PESV_CUMPLIMIENTO:',
      error
    )

    return responderError(
      error?.message ||
      'No fue posible calcular el indicador CPF_PESV_CUMPLIMIENTO.',
      Number(
        error?.status
      ) ||
        500,
      error?.code ||
        'CPF_PESV_CUMPLIMIENTO_ERROR'
    )
  }
}
