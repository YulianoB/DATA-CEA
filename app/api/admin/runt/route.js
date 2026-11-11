// app/api/admin/runt/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const CATEGORIAS_VALIDAS = new Set([
  'A2',
  'B1',
  'B2',
  'C1',
  'RC1',
  'C2',
  'C3',
])

const TIPOS_CLASE_VALIDOS = new Set([
  'TEORIA',
  'TALLER',
  'PRACTICA',
])

const LIMITE_CLASES_DIA = 8
const HORAS_MENSUALES_INSTRUCTOR = 240
const LIMITE_CONSULTA = 200
const DIAS_VIGENCIA_RUNT = 90

const TIPOS_NOTIFICACION = [
  {
    tipo: 'VENCE_60_DIAS',
    diasAntes: 60,
  },
  {
    tipo: 'VENCE_30_DIAS',
    diasAntes: 30,
  },
  {
    tipo: 'VENCE_15_DIAS',
    diasAntes: 15,
  },
  {
    tipo: 'VENCE_7_DIAS',
    diasAntes: 7,
  },
  {
    tipo: 'VENCIDO',
    diasAntes: 0,
  },
]

// =========================================================
// LICENCIAS HABILITANTES
// =========================================================

const LICENCIAS_INSTRUCTOR_POR_CATEGORIA = {
  A2: [
    'A2',
  ],

  B1: [
    'B1',
    'B1-C1',
    'B2-C2',
    'B3-C3',
  ],

  C1: [
    'B1-C1',
    'B2-C2',
    'B3-C3',
  ],

  RC1: [
    'B1-C1',
    'B2-C2',
    'B3-C3',
  ],

  C2: [
    'B2-C2',
    'B3-C3',
  ],

  C3: [
    'B3-C3',
  ],
}

// =========================================================
// RESPUESTA ERROR
// =========================================================

function respuestaError(
  error
) {
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

// =========================================================
// HELPERS
// =========================================================

function normalizarTexto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}

function normalizarMayusculas(
  valor
) {
  return normalizarTexto(
    valor
  ).toUpperCase()
}

function limpiarBusqueda(
  valor
) {
  return normalizarTexto(
    valor
  ).replace(
    /[%_]/g,
    ''
  )
}

function fechaValida(
  valor
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    normalizarTexto(
      valor
    )
  )
}

function nombreEmpresa(
  empresa
) {
  return (
    empresa?.nombre ||
    empresa?.nombre_empresa ||
    empresa?.razon_social ||
    ''
  )
}

function nombreUsuario(
  body
) {
  return (
    normalizarTexto(
      body?.usuario
    ) ||
    normalizarTexto(
      body?.nombre_usuario
    ) ||
    ''
  )
}

function toInt(
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

// =========================================================
// FECHA BOGOTÁ
// =========================================================

function hoyBogota() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Bogota',
    }
  ).format(
    new Date()
  )
}

// =========================================================
// FECHAS YYYY-MM-DD
// =========================================================

function fechaUtcDesdeTexto(
  valor
) {
  const fecha =
    normalizarTexto(
      valor
    ).slice(
      0,
      10
    )

  if (
    !fechaValida(
      fecha
    )
  ) {
    return null
  }

  const [
    anio,
    mes,
    dia,
  ] =
    fecha
      .split(
        '-'
      )
      .map(
        Number
      )

  return new Date(
    Date.UTC(
      anio,
      mes - 1,
      dia
    )
  )
}

function fechaTextoDesdeUtc(
  fecha
) {
  if (
    !(fecha instanceof Date) ||
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return null
  }

  return fecha
    .toISOString()
    .slice(
      0,
      10
    )
}

function sumarDiasFecha(
  fecha,
  dias
) {
  const base =
    fechaUtcDesdeTexto(
      fecha
    )

  if (
    !base
  ) {
    return null
  }

  base.setUTCDate(
    base.getUTCDate() +
    Number(
      dias ||
      0
    )
  )

  return fechaTextoDesdeUtc(
    base
  )
}

function diferenciaDias(
  fechaDesde,
  fechaHasta
) {
  const desde =
    fechaUtcDesdeTexto(
      fechaDesde
    )

  const hasta =
    fechaUtcDesdeTexto(
      fechaHasta
    )

  if (
    !desde ||
    !hasta
  ) {
    return null
  }

  return Math.floor(
    (
      hasta.getTime() -
      desde.getTime()
    ) /
    86400000
  )
}

// =========================================================
// NORMALIZAR CATEGORÍA LICENCIA
// =========================================================

function normalizarCategoriaLicencia(
  valor
) {
  return normalizarMayusculas(
    valor
  )
    .replace(
      /[–—]/g,
      '-'
    )
    .replace(
      /\s*-\s*/g,
      '-'
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
}

// =========================================================
// INSTRUCTOR
// =========================================================

function esRegistroInstructor(
  licencia
) {
  const rol =
    normalizarMayusculas(
      licencia?.rol
    )

  const tipo =
    normalizarMayusculas(
      licencia?.tipo_licencia
    )

  return (
    rol.includes(
      'INSTRUCTOR'
    ) ||
    tipo.includes(
      'INSTRUCTOR'
    )
  )
}

function licenciaEstaVigente(
  licencia,
  fechaReferencia
) {
  const vigencia =
    normalizarTexto(
      licencia?.vigencia
    )

  if (
    !fechaValida(
      vigencia
    )
  ) {
    return false
  }

  return (
    vigencia >=
    fechaReferencia
  )
}

function obtenerAnioMes(
  fecha
) {
  if (
    !fechaValida(
      fecha
    )
  ) {
    return {
      anio: null,
      mes: null,
    }
  }

  const [
    anio,
    mes,
  ] =
    fecha
      .split(
        '-'
      )
      .map(
        Number
      )

  return {
    anio,
    mes,
  }
}

// =========================================================
// VIGENCIA RUNT
// =========================================================

function calcularVigenciaRunt(
  control
) {
  const certificado =
    normalizarMayusculas(
      control
        ?.estado_certificacion
    ) ===
    'CERTIFICADO'

  const fechaRegistro =
    normalizarTexto(
      control
        ?.fecha_registro
    ).slice(
      0,
      10
    )

  const fechaLimite =
    fechaRegistro
      ? sumarDiasFecha(
          fechaRegistro,
          DIAS_VIGENCIA_RUNT
        )
      : null

  if (
    certificado
  ) {
    return {
      estado:
        'CERTIFICADO',

      fecha_registro:
        fechaRegistro ||
        null,

      fecha_limite:
        fechaLimite,

      dias_restantes:
        null,

      vencido:
        false,

      vigente:
        false,

      proximo_a_vencer:
        false,
    }
  }

  const registrado =
    normalizarMayusculas(
      control
        ?.estado_registro
    ) ===
    'REGISTRADO'

  if (
    !registrado ||
    !fechaRegistro ||
    !fechaLimite
  ) {
    return {
      estado:
        'SIN_REGISTRO',

      fecha_registro:
        fechaRegistro ||
        null,

      fecha_limite:
        null,

      dias_restantes:
        null,

      vencido:
        false,

      vigente:
        false,

      proximo_a_vencer:
        false,
    }
  }

  const diasRestantes =
    diferenciaDias(
      hoyBogota(),
      fechaLimite
    )

  if (
    diasRestantes ===
    null
  ) {
    return {
      estado:
        'SIN_REGISTRO',

      fecha_registro:
        fechaRegistro,

      fecha_limite:
        fechaLimite,

      dias_restantes:
        null,

      vencido:
        false,

      vigente:
        false,

      proximo_a_vencer:
        false,
    }
  }

  if (
    diasRestantes <
    0
  ) {
    return {
      estado:
        'VENCIDO',

      fecha_registro:
        fechaRegistro,

      fecha_limite:
        fechaLimite,

      dias_restantes:
        diasRestantes,

      vencido:
        true,

      vigente:
        false,

      proximo_a_vencer:
        false,
    }
  }

  let estado =
    'VIGENTE'

  if (
    diasRestantes <=
    7
  ) {
    estado =
      'CRITICO'
  } else if (
    diasRestantes <=
    15
  ) {
    estado =
      'URGENTE'
  } else if (
    diasRestantes <=
    30
  ) {
    estado =
      'ALERTA'
  } else if (
    diasRestantes <=
    60
  ) {
    estado =
      'PREVENTIVO'
  }

  return {
    estado,

    fecha_registro:
      fechaRegistro,

    fecha_limite:
      fechaLimite,

    dias_restantes:
      diasRestantes,

    vencido:
      false,

    vigente:
      true,

    proximo_a_vencer:
      diasRestantes <=
      15,
  }
}

// =========================================================
// REQUISITOS CATEGORÍA
// =========================================================

async function obtenerRequisitosCategoria(
  supabase,
  categoria
) {
  const categoriaNormalizada =
    normalizarMayusculas(
      categoria
    )

  if (
    !CATEGORIAS_VALIDAS.has(
      categoriaNormalizada
    )
  ) {
    throw new Error(
      'La categoría no es válida.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'runt_requisitos_categoria'
      )
      .select(`
        categoria,
        clases_teoria,
        clases_taller,
        clases_practica,
        limite_clases_dia,
        horas_mensuales_instructor,
        activo
      `)
      .eq(
        'categoria',
        categoriaNormalizada
      )
      .eq(
        'activo',
        true
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los requisitos RUNT: ${error.message}`
    )
  }

  if (
    !data
  ) {
    throw new Error(
      `No existen requisitos activos para la categoría ${categoriaNormalizada}.`
    )
  }

  return data
}

// =========================================================
// CONTROL RUNT
// =========================================================

async function obtenerControlRunt(
  supabase,
  controlRuntId
) {
  const id =
    toInt(
      controlRuntId
    )

  if (
    !id
  ) {
    throw new Error(
      'El control RUNT es obligatorio.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'control_runt'
      )
      .select(`
        id,
        matricula_id,
        consecutivo,
        documento,
        categoria,
        numero_proceso,
        control_runt_anterior_id,
        motivo_reproceso,
        fecha_reinicio,
        estado_verificacion,
        resultado_verificacion,
        fecha_verificacion,
        usuario_verificacion,
        estado_registro,
        fecha_registro,
        usuario_registro,
        estado_certificacion,
        fecha_certificacion,
        usuario_certificacion,
        observaciones,
        created_at,
        updated_at
      `)
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el Control RUNT: ${error.message}`
    )
  }

  if (
    !data
  ) {
    throw new Error(
      'No se encontró el Control RUNT solicitado.'
    )
  }

  return data
}

// =========================================================
// MATRÍCULA
// =========================================================

async function obtenerMatricula(
  supabase,
  matriculaId
) {
  const id =
    toInt(
      matriculaId
    )

  if (
    !id
  ) {
    return null
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'aprendices'
      )
      .select(`
        id,
        consecutivo,
        fecha_matricula,
        tipo_doc,
        documento,
        nombres,
        apellidos,
        celular,
        correo,
        convenio,
        categorias,
        estado
      `)
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar la matrícula: ${error.message}`
    )
  }

  return (
    data ||
    null
  )
}

// =========================================================
// CARGUES
// =========================================================

async function obtenerCarguesControl(
  supabase,
  controlRuntId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'runt_cargues_clases'
      )
      .select(`
        id,
        control_runt_id,
        matricula_id,
        documento,
        consecutivo,
        categoria,
        fecha_clase,
        fecha_registro,
        tipo_clase,
        cantidad_clases,
        instructor_documento,
        instructor_nombre,
        horas_consumidas,
        usuario_cargue,
        observaciones,
        created_at,
        updated_at
      `)
      .eq(
        'control_runt_id',
        controlRuntId
      )
      .order(
        'fecha_clase',
        {
          ascending:
            false,
        }
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los cargues RUNT: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// AVANCE
// =========================================================

function construirAvanceDesdeCargues(
  cargues,
  requisitos
) {
  let teoriaCargadas =
    0

  let tallerCargadas =
    0

  let practicaCargadas =
    0

  for (
    const registro of
      (
        Array.isArray(
          cargues
        )
          ? cargues
          : []
      )
  ) {
    const tipo =
      normalizarMayusculas(
        registro
          ?.tipo_clase
      )

    const cantidad =
      Number(
        registro
          ?.cantidad_clases ||
        0
      )

    if (
      tipo ===
      'TEORIA'
    ) {
      teoriaCargadas +=
        cantidad
    }

    if (
      tipo ===
      'TALLER'
    ) {
      tallerCargadas +=
        cantidad
    }

    if (
      tipo ===
      'PRACTICA'
    ) {
      practicaCargadas +=
        cantidad
    }
  }

  const teoriaRequeridas =
    Number(
      requisitos
        ?.clases_teoria ||
      0
    )

  const tallerRequeridas =
    Number(
      requisitos
        ?.clases_taller ||
      0
    )

  const practicaRequeridas =
    Number(
      requisitos
        ?.clases_practica ||
      0
    )

  const teoriaCompleta =
    teoriaRequeridas ===
      0 ||
    teoriaCargadas >=
      teoriaRequeridas

  const tallerCompleto =
    tallerRequeridas ===
      0 ||
    tallerCargadas >=
      tallerRequeridas

  const practicaCompleta =
    practicaRequeridas ===
      0 ||
    practicaCargadas >=
      practicaRequeridas

  return {
    teoria_cargadas:
      teoriaCargadas,

    teoria_requeridas:
      teoriaRequeridas,

    teoria_completa:
      teoriaCompleta,

    taller_cargadas:
      tallerCargadas,

    taller_requeridas:
      tallerRequeridas,

    taller_completo:
      tallerCompleto,

    practica_cargadas:
      practicaCargadas,

    practica_requeridas:
      practicaRequeridas,

    practica_completa:
      practicaCompleta,

    total_cargadas:
      teoriaCargadas +
      tallerCargadas +
      practicaCargadas,

    total_requeridas:
      teoriaRequeridas +
      tallerRequeridas +
      practicaRequeridas,

    completo:
      teoriaCompleta &&
      tallerCompleto &&
      practicaCompleta,
  }
}

// =========================================================
// NOTIFICACIONES
// =========================================================

async function programarNotificacionesRunt({
  supabase,
  control,
  matricula,
}) {
  if (
    !control?.id ||
    !control?.fecha_registro
  ) {
    return []
  }

  const fechaRegistro =
    normalizarTexto(
      control.fecha_registro
    ).slice(
      0,
      10
    )

  const fechaLimite =
    sumarDiasFecha(
      fechaRegistro,
      DIAS_VIGENCIA_RUNT
    )

  if (
    !fechaLimite
  ) {
    return []
  }

  const registros =
    TIPOS_NOTIFICACION.map(
      configuracion => ({
        control_runt_id:
          control.id,

        matricula_id:
          control.matricula_id ||
          null,

        documento:
          normalizarTexto(
            control.documento
          ),

        categoria:
          normalizarMayusculas(
            control.categoria
          ),

        tipo_notificacion:
          configuracion.tipo,

        dias_restantes:
          configuracion.diasAntes,

        correo_destino:
          normalizarTexto(
            matricula?.correo
          ) ||
          null,

        estado_envio:
          'PENDIENTE',

        fecha_programada:
          sumarDiasFecha(
            fechaLimite,
            -configuracion.diasAntes
          ),

        fecha_envio:
          null,

        error_envio:
          null,

        updated_at:
          new Date()
            .toISOString(),
      })
    )

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'runt_notificaciones'
      )
      .upsert(
        registros,
        {
          onConflict:
            'control_runt_id,tipo_notificacion',

          ignoreDuplicates:
            true,
        }
      )
      .select('*')

  if (
    error
  ) {
    throw new Error(
      `No fue posible programar las notificaciones RUNT: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

async function obtenerNotificacionesRunt(
  supabase,
  controlRuntId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'runt_notificaciones'
      )
      .select(`
        id,
        tipo_notificacion,
        dias_restantes,
        correo_destino,
        estado_envio,
        fecha_programada,
        fecha_envio,
        error_envio
      `)
      .eq(
        'control_runt_id',
        controlRuntId
      )
      .order(
        'fecha_programada',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar las notificaciones RUNT: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// TOTAL CLASES DÍA
// =========================================================

async function obtenerTotalClasesDia(
  supabase,
  controlRuntId,
  fechaClase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'runt_cargues_clases'
      )
      .select(
        'cantidad_clases'
      )
      .eq(
        'control_runt_id',
        controlRuntId
      )
      .eq(
        'fecha_clase',
        fechaClase
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible validar el límite diario: ${error.message}`
    )
  }

  return (
    Array.isArray(
      data
    )
      ? data
      : []
  ).reduce(
    (
      total,
      registro
    ) =>
      total +
      (
        Number(
          registro
            ?.cantidad_clases
        ) ||
        0
      ),
    0
  )
}

// =========================================================
// TOTAL POR TIPO
// =========================================================

async function obtenerTotalTipoClase(
  supabase,
  controlRuntId,
  tipoClase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'runt_cargues_clases'
      )
      .select(
        'cantidad_clases'
      )
      .eq(
        'control_runt_id',
        controlRuntId
      )
      .eq(
        'tipo_clase',
        tipoClase
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible validar el avance de ${tipoClase}: ${error.message}`
    )
  }

  return (
    Array.isArray(
      data
    )
      ? data
      : []
  ).reduce(
    (
      total,
      registro
    ) =>
      total +
      (
        Number(
          registro
            ?.cantidad_clases
        ) ||
        0
      ),
    0
  )
}

// =========================================================
// ÚLTIMA TEORÍA / TALLER
// =========================================================

async function obtenerUltimaFechaTeoriaTaller(
  supabase,
  controlRuntId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'runt_cargues_clases'
      )
      .select(`
        fecha_clase,
        tipo_clase
      `)
      .eq(
        'control_runt_id',
        controlRuntId
      )
      .in(
        'tipo_clase',
        [
          'TEORIA',
          'TALLER',
        ]
      )
      .order(
        'fecha_clase',
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
      `No fue posible consultar la última fecha de teoría/taller: ${error.message}`
    )
  }

  if (
    !Array.isArray(
      data
    ) ||
    data.length ===
      0
  ) {
    return null
  }

  return (
    data[0]
      ?.fecha_clase ||
    null
  )
}

// =========================================================
// HORAS INSTRUCTOR
// =========================================================

async function obtenerHorasInstructorMes(
  supabase,
  instructorDocumento,
  fecha
) {
  const documento =
    normalizarTexto(
      instructorDocumento
    )

  const {
    anio,
    mes,
  } =
    obtenerAnioMes(
      fecha
    )

  if (
    !documento
  ) {
    throw new Error(
      'El instructor es obligatorio.'
    )
  }

  if (
    !anio ||
    !mes
  ) {
    throw new Error(
      'La fecha no es válida.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'v_runt_horas_instructor_mes'
      )
      .select(`
        instructor_documento,
        instructor_nombre,
        anio,
        mes,
        clases_practicas_cargadas,
        horas_consumidas,
        horas_asignadas,
        horas_disponibles
      `)
      .eq(
        'instructor_documento',
        documento
      )
      .eq(
        'anio',
        anio
      )
      .eq(
        'mes',
        mes
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar las horas del instructor: ${error.message}`
    )
  }

  if (
    !data
  ) {
    return {
      instructor_documento:
        documento,

      instructor_nombre:
        '',

      anio,

      mes,

      clases_practicas_cargadas:
        0,

      horas_consumidas:
        0,

      horas_asignadas:
        HORAS_MENSUALES_INSTRUCTOR,

      horas_disponibles:
        HORAS_MENSUALES_INSTRUCTOR,
    }
  }

  const consumidas =
    Number(
      data.horas_consumidas ||
      0
    )

  const asignadas =
    Number(
      data.horas_asignadas ||
      HORAS_MENSUALES_INSTRUCTOR
    )

  return {
    ...data,

    horas_consumidas:
      consumidas,

    horas_asignadas:
      asignadas,

    horas_disponibles:
      Math.max(
        0,
        Number(
          data.horas_disponibles ??
          (
            asignadas -
            consumidas
          )
        )
      ),
  }
}

// =========================================================
// LICENCIAS INSTRUCTORES
// =========================================================

async function obtenerLicenciasInstructor(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'licencias_personal'
      )
      .select(`
        id,
        nombre_completo,
        documento,
        rol,
        categoria,
        tipo_licencia,
        vigencia,
        fecha_actualizacion,
        nombre_quien_actualiza
      `)

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar licencias de instructores: ${error.message}`
    )
  }

  return (
    Array.isArray(
      data
    )
      ? data
      : []
  ).filter(
    esRegistroInstructor
  )
}

// =========================================================
// INSTRUCTORES HABILITADOS
// =========================================================

async function obtenerInstructoresHabilitados({
  supabase,
  categoria,
  fecha,
}) {
  const categoriaMatricula =
    normalizarMayusculas(
      categoria
    )

  if (
    !CATEGORIAS_VALIDAS.has(
      categoriaMatricula
    )
  ) {
    throw new Error(
      'La categoría de matrícula no es válida.'
    )
  }

  const permitidas =
    LICENCIAS_INSTRUCTOR_POR_CATEGORIA[
      categoriaMatricula
    ] ||
    []

  const permitidasSet =
    new Set(
      permitidas.map(
        normalizarCategoriaLicencia
      )
    )

  const fechaReferencia =
    fechaValida(
      fecha
    )
      ? fecha
      : hoyBogota()

  const licencias =
    await obtenerLicenciasInstructor(
      supabase
    )

  const habilitadas =
    licencias.filter(
      licencia => {
        const categoriaLicencia =
          normalizarCategoriaLicencia(
            licencia?.categoria
          )

        if (
          !permitidasSet.has(
            categoriaLicencia
          )
        ) {
          return false
        }

        return licenciaEstaVigente(
          licencia,
          fechaReferencia
        )
      }
    )

  const mapa =
    new Map()

  for (
    const licencia of
      habilitadas
  ) {
    const documento =
      normalizarTexto(
        licencia.documento
      )

    if (
      !documento
    ) {
      continue
    }

    if (
      !mapa.has(
        documento
      )
    ) {
      mapa.set(
        documento,
        {
          documento,

          nombre_completo:
            normalizarMayusculas(
              licencia.nombre_completo
            ),

          certificados:
            [],

          certificados_bd:
            [],
        }
      )
    }

    const instructor =
      mapa.get(
        documento
      )

    const categoriaNormalizada =
      normalizarCategoriaLicencia(
        licencia.categoria
      )

    const categoriaOriginal =
      normalizarMayusculas(
        licencia.categoria
      )

    if (
      categoriaNormalizada &&
      !instructor
        .certificados
        .includes(
          categoriaNormalizada
        )
    ) {
      instructor
        .certificados
        .push(
          categoriaNormalizada
        )
    }

    if (
      categoriaOriginal &&
      !instructor
        .certificados_bd
        .includes(
          categoriaOriginal
        )
    ) {
      instructor
        .certificados_bd
        .push(
          categoriaOriginal
        )
    }
  }

  const salida =
    []

  for (
    const instructor of
      mapa.values()
  ) {
    const horas =
      await obtenerHorasInstructorMes(
        supabase,
        instructor.documento,
        fechaReferencia
      )

    salida.push({
      ...instructor,

      horas_asignadas:
        Number(
          horas
            ?.horas_asignadas ||
          HORAS_MENSUALES_INSTRUCTOR
        ),

      horas_consumidas:
        Number(
          horas
            ?.horas_consumidas ||
          0
        ),

      horas_disponibles:
        Number(
          horas
            ?.horas_disponibles ??
          HORAS_MENSUALES_INSTRUCTOR
        ),
    })
  }

  salida.sort(
    (
      a,
      b
    ) =>
      String(
        a.nombre_completo
      ).localeCompare(
        String(
          b.nombre_completo
        ),
        'es'
      )
  )

  return salida
}

// =========================================================
// VALIDAR INSTRUCTOR
// =========================================================

async function validarInstructorHabilitado({
  supabase,
  categoria,
  fecha,
  documento,
}) {
  const instructores =
    await obtenerInstructoresHabilitados({
      supabase,
      categoria,
      fecha,
    })

  const seleccionado =
    instructores.find(
      instructor =>
        normalizarTexto(
          instructor.documento
        ) ===
        normalizarTexto(
          documento
        )
    )

  if (
    !seleccionado
  ) {
    throw new Error(
      `El instructor seleccionado no está habilitado para la categoría ${categoria}.`
    )
  }

  return seleccionado
}

// =========================================================
// CONSULTA GENERAL
// =========================================================

async function consultarControles({
  supabase,
  busqueda = '',
  categoria = '',
  estadoRegistro = '',
  estadoCertificacion = '',
  resultadoVerificacion = '',
  vigencia = '',
  pagina = 1,
  porPagina = 25,
  pestana = 'pendientes',
  estadoGestion = '',
  fechaInicio = '',
  fechaFin = '',
  nombreCea = '',
}) {
  // Leer el catálogo de la empresa por lotes, sin el límite implícito de
  // 1000 filas de PostgREST, para contar y seleccionar correctamente.
  async function leerTablaCompleta(tabla, columnas) {
    const { count, error: errorConteo } = await supabase
      .from(tabla).select('id', { count: 'exact', head: true })
    if (errorConteo) throw new Error(`No fue posible contar ${tabla}: ${errorConteo.message}`)
    const total = Number(count || 0)
    if (!total) return []
    const lotes = []
    for (let desde = 0; desde < total; desde += 1000) {
      lotes.push([desde, Math.min(total - 1, desde + 999)])
    }
    const todos = []
    for (let i = 0; i < lotes.length; i += 5) {
      const respuestas = await Promise.all(
        lotes.slice(i, i + 5).map(([desde, hasta]) =>
          supabase.from(tabla).select(columnas)
            .order('id', { ascending: true }).range(desde, hasta)
        )
      )
      for (const respuesta of respuestas) {
        if (respuesta.error) throw new Error(
          `No fue posible consultar ${tabla}: ${respuesta.error.message}`
        )
        todos.push(...(respuesta.data || []))
      }
    }
    return todos
  }

  const [procesos, matriculas] = await Promise.all([
    leerTablaCompleta('control_runt', `
      id,matricula_id,consecutivo,documento,categoria,numero_proceso,
      control_runt_anterior_id,motivo_reproceso,fecha_reinicio,
      estado_verificacion,resultado_verificacion,fecha_verificacion,
      usuario_verificacion,estado_registro,fecha_registro,usuario_registro,
      estado_certificacion,fecha_certificacion,usuario_certificacion,
      observaciones,created_at,updated_at
    `),
    leerTablaCompleta('aprendices', `
      id,nombres,apellidos,tipo_doc,documento,fecha_matricula,
      celular,correo,convenio,convenio_id,origen_matricula,estado
    `)
  ])

  const idsConvenios = [...new Set(matriculas.map(m => m.convenio_id).filter(Boolean))]
  let catalogoConvenios = []
  if (idsConvenios.length) {
    const { data: convenios, error: errorConvenios } = await supabase
      .from('convenios')
      .select('id,nombre')
      .in('id', idsConvenios)
    if (errorConvenios) throw new Error('No fue posible consultar los convenios: ' + errorConvenios.message)
    catalogoConvenios = convenios || []
  }
  const mapaConvenios = new Map(catalogoConvenios.map(c => [String(c.id), c.nombre]))

  const mapaMatriculas = new Map(matriculas.map(m => [String(m.id), m]))
  const mapaUltimoProceso = new Map()
  // No filtrar estados antes de elegir el último proceso: un reproceso
  // posterior debe prevalecer sobre cualquier estado del proceso antiguo.
  for (const control of procesos) {
    const clave = String(control.matricula_id) + '|' +
      normalizarMayusculas(control.categoria)
    const previo = mapaUltimoProceso.get(clave)
    const proceso = Number(control.numero_proceso || 1)
    if (!previo || proceso > Number(previo.numero_proceso || 1) ||
        (proceso === Number(previo.numero_proceso || 1) &&
          Number(control.id) > Number(previo.id))) {
      mapaUltimoProceso.set(clave, control)
    }
  }

  if (fechaInicio && !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
    throw new Error('La fecha inicial no es válida.')
  }
  if (fechaFin && !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
    throw new Error('La fecha final no es válida.')
  }
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    throw new Error('La fecha inicial no puede superar la fecha final.')
  }

  const categoriaFiltro = normalizarMayusculas(categoria)
  const termino = limpiarBusqueda(busqueda).toUpperCase()
  let seleccionados = Array.from(mapaUltimoProceso.values()).filter(control => {
    const matricula = mapaMatriculas.get(String(control.matricula_id))
    if (categoriaFiltro && normalizarMayusculas(control.categoria) !== categoriaFiltro) return false
    const fechaMatricula = String(matricula?.fecha_matricula || '').slice(0, 10)
    if (fechaInicio && (!fechaMatricula || fechaMatricula < fechaInicio)) return false
    if (fechaFin && (!fechaMatricula || fechaMatricula > fechaFin)) return false
    if (termino) {
      const campos = [
        control.consecutivo, control.documento, control.categoria,
        matricula?.nombres, matricula?.apellidos,
        [matricula?.nombres, matricula?.apellidos].filter(Boolean).join(' ')
      ].map(x => String(x || '').toUpperCase())
      if (!campos.some(x => x.includes(termino))) return false
    }

    const registro = normalizarMayusculas(control.estado_registro)
    const certificacion = normalizarMayusculas(control.estado_certificacion)
    const resultado = normalizarMayusculas(control.resultado_verificacion)
    if (estadoRegistro && registro !== normalizarMayusculas(estadoRegistro)) return false
    if (estadoCertificacion && certificacion !== normalizarMayusculas(estadoCertificacion)) return false
    if (resultadoVerificacion && resultado !== normalizarMayusculas(resultadoVerificacion)) return false

    const registrado = registro === 'REGISTRADO'
    const certificado = certificacion === 'CERTIFICADO'
    const vigenciaActual = calcularVigenciaRunt(control)
    const vencido = registrado && !certificado && vigenciaActual.vencido
    const dias = vigenciaActual.dias_restantes
    if (vigencia && normalizarMayusculas(vigencia) !== normalizarMayusculas(vigenciaActual.estado)) return false

    if (pestana === 'pendientes') {
      if (certificado || (registrado && !vencido)) return false
      if (estadoGestion === 'no_registrado') return !registrado && resultado === 'NO REGISTRADO'
      if (estadoGestion === 'vencido') return vencido
      return true
    }

    if (!certificado && (!registrado || vencido)) return false
    if (estadoGestion === 'certificado') return certificado
    if (estadoGestion === 'por_vencer') {
      return !certificado && Number.isFinite(dias) && dias >= 0 && dias <= 15
    }
    if (estadoGestion === 'en_proceso') {
      return !certificado && registrado && !vencido &&
        (!Number.isFinite(dias) || dias > 15)
    }
    return true
  })

  // Orden cronológico por fecha de matrícula, desempate por ID.
  seleccionados.sort((a, b) => {
    const ma = mapaMatriculas.get(String(a.matricula_id))
    const mb = mapaMatriculas.get(String(b.matricula_id))
    return String(mb?.fecha_matricula || '').localeCompare(String(ma?.fecha_matricula || '')) ||
      Number(b.matricula_id || 0) - Number(a.matricula_id || 0) ||
      Number(b.id || 0) - Number(a.id || 0)
  })

  const total = seleccionados.length
  const paginaSegura = Math.max(1, Number(pagina) || 1)
  const cantidad = Math.min(100, Math.max(25, Number(porPagina) || 25))
  const offset = (paginaSegura - 1) * cantidad
  const controles = seleccionados.slice(offset, offset + cantidad)
  if (!controles.length) {
    return { data: [], total, hay_mas: false }
  }

  // =======================================================
  // CARGUES DEL PROCESO ACTUAL
  // =======================================================

  const controlIds =
    controles
      .map(
        control =>
          control.id
      )
      .filter(
        Boolean
      )

  let cargues =
    []

  if (
    controlIds.length >
    0
  ) {
    const {
      data:
        dataCargues,

      error:
        errorCargues,
    } =
      await supabase
        .from(
          'runt_cargues_clases'
        )
        .select(`
          control_runt_id,
          tipo_clase,
          cantidad_clases
        `)
        .in(
          'control_runt_id',
          controlIds
        )

    if (
      errorCargues
    ) {
      throw new Error(
        `No fue posible consultar los cargues RUNT: ${errorCargues.message}`
      )
    }

    cargues =
      Array.isArray(
        dataCargues
      )
        ? dataCargues
        : []
  }

  // =======================================================
  // REQUISITOS
  // =======================================================

  const {
    data:
      dataRequisitos,

    error:
      errorRequisitos,
  } =
    await supabase
      .from(
        'runt_requisitos_categoria'
      )
      .select(`
        categoria,
        clases_teoria,
        clases_taller,
        clases_practica,
        activo
      `)
      .eq(
        'activo',
        true
      )

  if (
    errorRequisitos
  ) {
    throw new Error(
      `No fue posible consultar los requisitos RUNT: ${errorRequisitos.message}`
    )
  }

  const mapaRequisitos =
    new Map(
      (
        Array.isArray(
          dataRequisitos
        )
          ? dataRequisitos
          : []
      ).map(
        requisito => [
          normalizarMayusculas(
            requisito.categoria
          ),
          requisito,
        ]
      )
    )

  // =======================================================
  // AGRUPAR CARGUES
  // =======================================================

  const mapaCargues =
    new Map()

  for (
    const cargue of
      cargues
  ) {
    const key =
      String(
        cargue.control_runt_id
      )

    if (
      !mapaCargues.has(
        key
      )
    ) {
      mapaCargues.set(
        key,
        []
      )
    }

    mapaCargues
      .get(
        key
      )
      .push(
        cargue
      )
  }

  // =======================================================
  // CONSTRUIR RESULTADO
  // =======================================================

  let resultado =
    controles.map(
      control => {
        const matricula =
          mapaMatriculas.get(
            String(
              control.matricula_id
            )
          ) ||
          null

        const requisito =
          mapaRequisitos.get(
            normalizarMayusculas(
              control.categoria
            )
          ) ||
          {}

        const carguesControl =
          mapaCargues.get(
            String(
              control.id
            )
          ) ||
          []

        const avance =
          construirAvanceDesdeCargues(
            carguesControl,
            requisito
          )

        const vigenciaRunt =
          calcularVigenciaRunt(
            control
          )

        return {
          ...control,

          es_proceso_actual:
            true,

          historico_certificado:
            normalizarMayusculas(control.estado_certificacion) === 'CERTIFICADO' &&
            normalizarMayusculas(control.estado_registro) !== 'REGISTRADO',

          puede_gestionar:
            normalizarMayusculas(
              control.resultado_verificacion
            ) ===
              'REGISTRADO' &&
            !vigenciaRunt.vencido,

          requiere_reproceso:
            vigenciaRunt.vencido,

          vigencia:
            vigenciaRunt,

          aprendiz:
            matricula
              ? {
                  ...matricula,

                  nombre_completo:
                    [
                      matricula.nombres,
                      matricula.apellidos,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' '
                      )
                      .trim(),
                  nombre_origen: normalizarMayusculas(matricula.origen_matricula) === 'CONVENIO' || matricula.convenio_id
                    ? (mapaConvenios.get(String(matricula.convenio_id)) || matricula.convenio || 'CONVENIO')
                    : (nombreCea || 'CEA'),
                  tipo_origen: normalizarMayusculas(matricula.origen_matricula) === 'CONVENIO' || matricula.convenio_id
                    ? 'CONVENIO' : 'DIRECTO',
                }
              : null,

          avance,
        }
      }
    )

  return { data: resultado, total, hay_mas: offset + cantidad < total }
}

// =========================================================
// VALIDAR CARGUE
// =========================================================

async function validarCargue({
  supabase,
  control,
  tipoClase,
  cantidadClases,
  fechaClase,
  instructorDocumento,
}) {
  // =======================================================
  // VIGENCIA
  // =======================================================

  const vigencia =
    calcularVigenciaRunt(
      control
    )

  if (
    vigencia.vencido
  ) {
    throw new Error(
      `El proceso RUNT venció el ${vigencia.fecha_limite}. Debe iniciar un nuevo proceso RUNT antes de realizar cargues.`
    )
  }

  // =======================================================
  // REGISTRADO
  // =======================================================

  if (
    normalizarMayusculas(
      control.resultado_verificacion
    ) !==
    'REGISTRADO'
  ) {
    throw new Error(
      'El aprendiz debe aparecer REGISTRADO en RUNT antes de realizar cargues.'
    )
  }

  // =======================================================
  // REGISTRADO
  // =======================================================

  if (
    normalizarMayusculas(
      control.estado_registro
    ) !==
    'REGISTRADO'
  ) {
    throw new Error(
      'Primero debe marcar la matrícula como REGISTRADA en RUNT.'
    )
  }

  const requisitos =
    await obtenerRequisitosCategoria(
      supabase,
      control.categoria
    )

  // =======================================================
  // INSTRUCTOR
  // =======================================================

  if (
    !normalizarTexto(
      instructorDocumento
    )
  ) {
    throw new Error(
      'Debe seleccionar un instructor.'
    )
  }

  const instructor =
    await validarInstructorHabilitado({
      supabase,

      categoria:
        control.categoria,

      fecha:
        fechaClase,

      documento:
        instructorDocumento,
    })

  // =======================================================
  // LÍMITE DIARIO
  // =======================================================

  const cargadasDia =
    await obtenerTotalClasesDia(
      supabase,
      control.id,
      fechaClase
    )

  const limiteDia =
    Number(
      requisitos
        ?.limite_clases_dia
    ) ||
    LIMITE_CLASES_DIA

  if (
    cargadasDia +
      cantidadClases >
    limiteDia
  ) {
    throw new Error(
      `El aprendiz ya tiene ${cargadasDia} clase(s) cargada(s) para ${fechaClase}. El máximo permitido es ${limiteDia} por día.`
    )
  }

  // =======================================================
  // REQUERIDAS
  // =======================================================

  let requerido =
    0

  if (
    tipoClase ===
    'TEORIA'
  ) {
    requerido =
      Number(
        requisitos
          .clases_teoria
      ) ||
      0
  }

  if (
    tipoClase ===
    'TALLER'
  ) {
    requerido =
      Number(
        requisitos
          .clases_taller
      ) ||
      0
  }

  if (
    tipoClase ===
    'PRACTICA'
  ) {
    requerido =
      Number(
        requisitos
          .clases_practica
      ) ||
      0
  }

  if (
    tipoClase ===
      'TALLER' &&
    requerido ===
      0
  ) {
    throw new Error(
      `La categoría ${control.categoria} no tiene clases de taller.`
    )
  }

  // =======================================================
  // PRÁCTICA
  // =======================================================

  let teoriaActual =
    null

  let tallerActual =
    null

  let ultimaFechaTeoriaTaller =
    null

  if (
    tipoClase ===
    'PRACTICA'
  ) {
    teoriaActual =
      await obtenerTotalTipoClase(
        supabase,
        control.id,
        'TEORIA'
      )

    tallerActual =
      await obtenerTotalTipoClase(
        supabase,
        control.id,
        'TALLER'
      )

    const teoriaRequerida =
      Number(
        requisitos
          .clases_teoria ||
        0
      )

    const tallerRequerido =
      Number(
        requisitos
          .clases_taller ||
        0
      )

    const teoriaCompleta =
      teoriaRequerida ===
        0 ||
      teoriaActual >=
        teoriaRequerida

    const tallerCompleto =
      tallerRequerido ===
        0 ||
      tallerActual >=
        tallerRequerido

    if (
      !teoriaCompleta ||
      !tallerCompleto
    ) {
      const pendientes =
        []

      if (
        !teoriaCompleta
      ) {
        pendientes.push(
          `teoría ${teoriaActual}/${teoriaRequerida}`
        )
      }

      if (
        !tallerCompleto
      ) {
        pendientes.push(
          `taller ${tallerActual}/${tallerRequerido}`
        )
      }

      throw new Error(
        `No se puede cargar práctica todavía. Primero debe completar ${pendientes.join(' y ')}.`
      )
    }

    ultimaFechaTeoriaTaller =
      await obtenerUltimaFechaTeoriaTaller(
        supabase,
        control.id
      )

    if (
      ultimaFechaTeoriaTaller &&
      fechaClase <
        ultimaFechaTeoriaTaller
    ) {
      throw new Error(
        `La práctica no puede registrarse con fecha anterior a la última clase de teoría o taller (${ultimaFechaTeoriaTaller}).`
      )
    }
  }

  // =======================================================
  // TOTAL DEL TIPO
  // =======================================================

  const yaCargadas =
    await obtenerTotalTipoClase(
      supabase,
      control.id,
      tipoClase
    )

  if (
    yaCargadas +
      cantidadClases >
    requerido
  ) {
    throw new Error(
      `El cargue supera el total requerido de ${tipoClase}. Requeridas: ${requerido}. Ya cargadas: ${yaCargadas}.`
    )
  }

  // =======================================================
  // HORAS INSTRUCTOR
  // =======================================================

  let horasInstructor =
    null

  if (
    tipoClase ===
    'PRACTICA'
  ) {
    horasInstructor =
      await obtenerHorasInstructorMes(
        supabase,
        instructorDocumento,
        fechaClase
      )

    const disponibles =
      Number(
        horasInstructor
          ?.horas_disponibles
      )

    if (
      cantidadClases >
      disponibles
    ) {
      throw new Error(
        `El instructor no tiene horas suficientes. Disponibles: ${disponibles}. Este cargue requiere ${cantidadClases} hora(s).`
      )
    }
  }

  return {
    requisitos,
    cargadasDia,
    yaCargadas,
    requerido,
    instructor,
    horasInstructor,
    teoriaActual,
    tallerActual,
    ultimaFechaTeoriaTaller,
    vigencia,
  }
}

// =========================================================
// GET
// =========================================================

export async function GET(
  request
) {
  try {
    const {
      supabaseAdmin,
      empresa,
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

    const recurso =
      normalizarTexto(
        searchParams.get(
          'recurso'
        )
      ).toLowerCase()

    // =====================================================
    // CONSULTAR
    // =====================================================

    if (
      recurso ===
      'consultar'
    ) {
      const resultadoConsulta =
        await consultarControles({
          supabase,
          nombreCea: nombreEmpresa(empresa),

          busqueda:
            normalizarTexto(
              searchParams.get(
                'q'
              )
            ),

          categoria:
            normalizarTexto(
              searchParams.get(
                'categoria'
              )
            ),

          estadoRegistro:
            normalizarTexto(
              searchParams.get(
                'estado_registro'
              )
            ),

          estadoCertificacion:
            normalizarTexto(
              searchParams.get(
                'estado_certificacion'
              )
            ),

          resultadoVerificacion:
            normalizarTexto(
              searchParams.get(
                'resultado_verificacion'
              )
            ),

          vigencia:
            normalizarTexto(
              searchParams.get(
                'vigencia'
              )
            ),
          pestana: normalizarTexto(searchParams.get('pestana')) || 'pendientes',
          estadoGestion: normalizarTexto(searchParams.get('estado_gestion')),
          fechaInicio: normalizarTexto(searchParams.get('fecha_inicio')),
          fechaFin: normalizarTexto(searchParams.get('fecha_fin')),
          porPagina: Math.min(100, Math.max(25, toInt(searchParams.get('por_pagina')) || 25)),
          pagina: Math.max(1, Math.min(10000, toInt(searchParams.get('pagina')) || 1)),
        })

      return NextResponse.json({
        status:
          'success',

        data:
          resultadoConsulta.data,

        total:
          resultadoConsulta.total,

        pagina: Math.max(1, Math.min(10000, toInt(searchParams.get('pagina')) || 1)),
        hay_mas: resultadoConsulta.hay_mas,

        limite:
          Math.min(100, Math.max(25, toInt(searchParams.get('por_pagina')) || 25)),

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            nombreEmpresa(
              empresa
            ),
        },
      })
    }

    // =====================================================
    // DETALLE
    // =====================================================

    if (
      recurso ===
      'detalle'
    ) {
      const controlRuntId =
        toInt(
          searchParams.get(
            'control_runt_id'
          )
        )

      if (
        !controlRuntId
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El control RUNT es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const control =
        await obtenerControlRunt(
          supabase,
          controlRuntId
        )

      const matricula =
        await obtenerMatricula(
          supabase,
          control.matricula_id
        )

      const requisitos =
        await obtenerRequisitosCategoria(
          supabase,
          control.categoria
        )

      const cargues =
        await obtenerCarguesControl(
          supabase,
          control.id
        )

      const avance =
        construirAvanceDesdeCargues(
          cargues,
          requisitos
        )

      const vigencia =
        calcularVigenciaRunt(
          control
        )

      const ultimaFechaTeoriaTaller =
        await obtenerUltimaFechaTeoriaTaller(
          supabase,
          control.id
        )

      const notificaciones =
        await obtenerNotificacionesRunt(
          supabase,
          control.id
        )

      return NextResponse.json({
        status:
          'success',

        data: {
          control,

          matricula:
            matricula
              ? {
                  ...matricula,

                  nombre_completo:
                    [
                      matricula.nombres,
                      matricula.apellidos,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' '
                      )
                      .trim(),
                }
              : null,

          requisitos,

          avance,

          cargues,

          vigencia,

          requiere_reproceso:
            vigencia.vencido,

          puede_gestionar:
            normalizarMayusculas(
              control.resultado_verificacion
            ) ===
              'REGISTRADO' &&
            !vigencia.vencido,

          practica_habilitada:
            avance.teoria_completa &&
            avance.taller_completo &&
            !vigencia.vencido,

          ultima_fecha_teoria_taller:
            ultimaFechaTeoriaTaller,

          notificaciones,
        },

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            nombreEmpresa(
              empresa
            ),
        },
      })
    }

    // =====================================================
    // INSTRUCTORES
    // =====================================================

    if (
      recurso ===
      'instructores'
    ) {
      const categoria =
        normalizarMayusculas(
          searchParams.get(
            'categoria'
          )
        )

      const fecha =
        normalizarTexto(
          searchParams.get(
            'fecha'
          )
        ) ||
        hoyBogota()

      if (
        !CATEGORIAS_VALIDAS.has(
          categoria
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La categoría es obligatoria.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        !fechaValida(
          fecha
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La fecha no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      const instructores =
        await obtenerInstructoresHabilitados({
          supabase,
          categoria,
          fecha,
        })

      return NextResponse.json({
        status:
          'success',

        data:
          instructores,

        categoria,

        licencias_permitidas:
          LICENCIAS_INSTRUCTOR_POR_CATEGORIA[
            categoria
          ] ||
          [],

        total:
          instructores.length,

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            nombreEmpresa(
              empresa
            ),
        },
      })
    }

    return NextResponse.json(
      {
        status:
          'error',

        message:
          'Recurso no válido.',
      },
      {
        status:
          400,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'Error GET /api/admin/runt:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// =========================================================
// POST
// =========================================================

export async function POST(
  request
) {
  try {
    const body =
      await request.json()

    const {
      supabaseAdmin,
      empresa,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const supabase =
      supabaseAdmin

    const accion =
      normalizarTexto(
        body?.accion
      ).toLowerCase()

    const usuario =
      nombreUsuario(
        body
      )

    // =====================================================
    // MARCAR REGISTRADO
    // =====================================================

    if (
      accion ===
      'marcar_inscrito'
    ) {
      const controlRuntId =
        toInt(
          body?.control_runt_id
        )

      if (
        !controlRuntId ||
        !usuario
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El control RUNT y el usuario son obligatorios.',
          },
          {
            status:
              400,
          }
        )
      }

      const control =
        await obtenerControlRunt(
          supabase,
          controlRuntId
        )
      // Los certificados históricos son solo de consulta. No se debe
      // inventar retroactivamente un registro o verificación oficial.
      if (normalizarMayusculas(control.estado_certificacion) === 'CERTIFICADO') {
        return NextResponse.json({
          status: 'error',
          message: 'El proceso ya está certificado. Su historial se conserva sin modificar.'
        }, { status: 409 })
      }


      const {
        data,
        error,
      } =
        await supabase
          .from(
            'control_runt'
          )
          .update({
            estado_verificacion:
              'VERIFICADO',

            resultado_verificacion:
              'REGISTRADO',

            fecha_verificacion:
              hoyBogota(),

            usuario_verificacion:
              usuario,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            control.id
          )
          .select('*')
          .single()

      if (
        error
      ) {
        throw new Error(
          `No fue posible actualizar la verificación RUNT: ${error.message}`
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          'Aprendiz marcado como REGISTRADO en RUNT.',

        data,
      })
    }

    // =====================================================
    // REGISTRAR RUNT
    // =====================================================

    if (
      accion ===
      'registrar_runt'
    ) {
      const controlRuntId =
        toInt(
          body?.control_runt_id
        )

      if (
        !controlRuntId ||
        !usuario
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El control RUNT y el usuario son obligatorios.',
          },
          {
            status:
              400,
          }
        )
      }

      const control =
        await obtenerControlRunt(
          supabase,
          controlRuntId
        )
      // Los certificados históricos son solo de consulta. No se debe
      // inventar retroactivamente un registro o verificación oficial.
      if (normalizarMayusculas(control.estado_certificacion) === 'CERTIFICADO') {
        return NextResponse.json({
          status: 'error',
          message: 'El proceso ya está certificado. Su historial se conserva sin modificar.'
        }, { status: 409 })
      }


      if (
        normalizarMayusculas(
          control.resultado_verificacion
        ) !==
        'REGISTRADO'
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El aprendiz debe aparecer REGISTRADO en RUNT antes de realizar el registro.',
          },
          {
            status:
              409,
          }
        )
      }

      if (
        normalizarMayusculas(
          control.estado_registro
        ) ===
        'REGISTRADO'
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Esta matrícula ya está registrada en RUNT.',
          },
          {
            status:
              409,
          }
        )
      }

      const fechaRegistro = normalizarTexto(body?.fecha_registro) || hoyBogota()
      const fechaValidaReal = /^\d{4}-\d{2}-\d{2}$/.test(fechaRegistro) &&
        !Number.isNaN(Date.parse(fechaRegistro)) &&
        new Date(fechaRegistro + 'T12:00:00Z').toISOString().slice(0, 10) === fechaRegistro
      if (!fechaValidaReal || fechaRegistro > hoyBogota()) {
        return NextResponse.json({
          status: 'error',
          message: 'La fecha de inscripción RUNT debe ser una fecha real válida, no futura.'
        }, { status: 400 })
      }
      if (fechaRegistro !== hoyBogota() && normalizarTexto(body?.observaciones).length < 8) {
        return NextResponse.json({
          status: 'error',
          message: 'Para registrar una fecha histórica se requiere indicar el soporte en observaciones (mínimo 8 caracteres).'
        }, { status: 400 })
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'control_runt'
          )
          .update({
            estado_registro:
              'REGISTRADO',

            fecha_registro:
              fechaRegistro,

            usuario_registro:
              usuario,

            observaciones:
              normalizarTexto(
                body?.observaciones
              ) ||
              control.observaciones ||
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            control.id
          )
          .select('*')
          .single()

      if (
        error
      ) {
        throw new Error(
          `No fue posible marcar la matrícula como registrada en RUNT: ${error.message}`
        )
      }

      const matricula =
        await obtenerMatricula(
          supabase,
          control.matricula_id
        )

      const notificaciones =
        await programarNotificacionesRunt({
          supabase,
          control:
            data,
          matricula,
        })

      return NextResponse.json({
        status:
          'success',

        message:
          'Matrícula marcada como REGISTRADA en RUNT.',

        data: {
          control:
            data,

          vigencia:
            calcularVigenciaRunt(
              data
            ),

          notificaciones,
        },

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            nombreEmpresa(
              empresa
            ),
        },
      })
    }

    // =====================================================
    // REGISTRAR CARGUE
    // =====================================================

    if (
      accion ===
      'registrar_cargue'
    ) {
      const controlRuntId =
        toInt(
          body?.control_runt_id
        )

      const tipoClase =
        normalizarMayusculas(
          body?.tipo_clase
        )

      const cantidadClases =
        toInt(
          body?.cantidad_clases
        )

      const fechaClase =
        normalizarTexto(
          body?.fecha_clase
        )

      const instructorDocumento =
        normalizarTexto(
          body?.instructor_documento
        )

      if (
        !controlRuntId
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El control RUNT es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        !TIPOS_CLASE_VALIDOS.has(
          tipoClase
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El tipo de clase no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        !cantidadClases ||
        cantidadClases <
          1 ||
        cantidadClases >
          LIMITE_CLASES_DIA
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              `La cantidad debe estar entre 1 y ${LIMITE_CLASES_DIA}.`,
          },
          {
            status:
              400,
          }
        )
      }

      if (
        !fechaValida(
          fechaClase
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La fecha de clase no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        !instructorDocumento ||
        !usuario
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Debe seleccionar instructor e identificar el usuario.',
          },
          {
            status:
              400,
          }
        )
      }

      const control =
        await obtenerControlRunt(
          supabase,
          controlRuntId
        )

      if (
        normalizarMayusculas(
          control.estado_certificacion
        ) ===
        'CERTIFICADO'
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No se pueden registrar clases porque esta matrícula ya está certificada.',
          },
          {
            status:
              409,
          }
        )
      }

      let validacion

      try {
        validacion =
          await validarCargue({
            supabase,
            control,
            tipoClase,
            cantidadClases,
            fechaClase,
            instructorDocumento,
          })
      } catch (
        errorValidacion
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              errorValidacion.message,
          },
          {
            status:
              409,
          }
        )
      }

      const horasConsumidas =
        tipoClase ===
        'PRACTICA'
          ? cantidadClases
          : 0

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'runt_cargues_clases'
          )
          .insert({
            control_runt_id:
              control.id,

            matricula_id:
              control.matricula_id,

            documento:
              control.documento,

            consecutivo:
              control.consecutivo,

            categoria:
              control.categoria,

            fecha_clase:
              fechaClase,

            fecha_registro:
              hoyBogota(),

            tipo_clase:
              tipoClase,

            cantidad_clases:
              cantidadClases,

            instructor_documento:
              instructorDocumento,

            instructor_nombre:
              validacion
                ?.instructor
                ?.nombre_completo ||
              '',

            horas_consumidas:
              horasConsumidas,

            usuario_cargue:
              usuario,

            observaciones:
              normalizarTexto(
                body?.observaciones
              ) ||
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .select('*')
          .single()

      if (
        error
      ) {
        throw new Error(
          `No fue posible registrar el cargue RUNT: ${error.message}`
        )
      }

      const cargues =
        await obtenerCarguesControl(
          supabase,
          control.id
        )

      const avance =
        construirAvanceDesdeCargues(
          cargues,
          validacion.requisitos
        )

      return NextResponse.json(
        {
          status:
            'success',

          message:
            `${cantidadClases} clase(s) de ${tipoClase} registrada(s) correctamente.`,

          data: {
            cargue:
              data,

            avance,

            vigencia:
              validacion.vigencia,

            instructor:
              validacion.instructor,

            horas_instructor:
              validacion.horasInstructor,
          },
        },
        {
          status:
            201,
        }
      )
    }

    // =====================================================
    // CERTIFICAR
    // =====================================================

    if (
      accion ===
      'certificar'
    ) {
      const controlRuntId =
        toInt(
          body?.control_runt_id
        )

      if (
        !controlRuntId ||
        !usuario
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El control RUNT y el usuario son obligatorios.',
          },
          {
            status:
              400,
          }
        )
      }

      const control =
        await obtenerControlRunt(
          supabase,
          controlRuntId
        )

      if (normalizarMayusculas(control.estado_certificacion) === 'CERTIFICADO') {
        return NextResponse.json({
          status: 'error',
          message: 'Este proceso ya está marcado como CERTIFICADO en RUNT.'
        }, { status: 409 })
      }

      const vigencia =
        calcularVigenciaRunt(
          control
        )

      if (
        vigencia.vencido
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              `El proceso RUNT venció el ${vigencia.fecha_limite}. Debe iniciar un reproceso RUNT.`,
          },
          {
            status:
              409,
          }
        )
      }

      if (
        normalizarMayusculas(
          control.estado_registro
        ) !==
        'REGISTRADO'
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La matrícula debe estar REGISTRADA en RUNT antes de certificarse.',
          },
          {
            status:
              409,
          }
        )
      }

      // Exigir SICOV certificado para la misma matrícula y categoría.
      const { data: controlesSicov, error: errorSicov } = await supabase
        .from('control_sicov')
        .select('id,estado_certificacion,categoria')
        .eq('matricula_id', control.matricula_id)
        .eq('categoria', control.categoria)

      if (errorSicov) {
        throw new Error(
          `No fue posible verificar la certificación SICOV: ${errorSicov.message}`
        )
      }

      if (!Array.isArray(controlesSicov) ||
          !controlesSicov.some(item =>
            normalizarMayusculas(item.estado_certificacion) === 'CERTIFICADO'
          )) {
        return NextResponse.json({
          status: 'error',
          message: 'Debe certificar primero al aprendiz en SICOV para esta matrícula y categoría antes de certificarlo en RUNT.'
        }, { status: 409 })
      }

      const requisitos =
        await obtenerRequisitosCategoria(
          supabase,
          control.categoria
        )

      const cargues =
        await obtenerCarguesControl(
          supabase,
          control.id
        )

      const avance =
        construirAvanceDesdeCargues(
          cargues,
          requisitos
        )

      if (
        !avance.completo
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La matrícula todavía no tiene completos todos los cargues requeridos en RUNT.',

            avance,
          },
          {
            status:
              409,
          }
        )
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'control_runt'
          )
          .update({
            estado_certificacion:
              'CERTIFICADO',

            fecha_certificacion:
              hoyBogota(),

            usuario_certificacion:
              usuario,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            control.id
          )
          .select('*')
          .single()

      if (
        error
      ) {
        throw new Error(
          `No fue posible certificar la matrícula en RUNT: ${error.message}`
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          'Matrícula marcada como CERTIFICADA en RUNT.',

        data: {
          control:
            data,

          avance,

          vigencia:
            calcularVigenciaRunt(
              data
            ),
        },
      })
    }

    // =====================================================
    // REINICIAR PROCESO RUNT
    // =====================================================

    if (
      accion ===
      'reiniciar_proceso'
    ) {
      const controlRuntId =
        toInt(
          body?.control_runt_id
        )

      if (
        !controlRuntId ||
        !usuario
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El control RUNT y el usuario son obligatorios.',
          },
          {
            status:
              400,
          }
        )
      }

      // El cálculo de 90 días no prueba por sí solo ausencia de certificación.
      const soporteVerificacion = normalizarTexto(body?.soporte_verificacion)
      if (body?.confirma_no_certificado !== true || soporteVerificacion.length < 8) {
        return NextResponse.json({
          status: 'error',
          message: 'Verifique en RUNT que el proceso continúa sin certificar e indique el soporte o motivo de la comprobación (mínimo 8 caracteres).'
        }, { status: 400 })
      }

      const controlAnterior =
        await obtenerControlRunt(
          supabase,
          controlRuntId
        )

      const vigenciaAnterior =
        calcularVigenciaRunt(
          controlAnterior
        )

      if (
        !vigenciaAnterior.vencido
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El proceso RUNT todavía no está vencido y no requiere reproceso.',
          },
          {
            status:
              409,
          }
        )
      }

      // ===================================================
      // EVITAR REPROCESO DUPLICADO
      // ===================================================

      const {
        data:
          procesosSiguientes,

        error:
          errorProcesosSiguientes,
      } =
        await supabase
          .from(
            'control_runt'
          )
          .select(`
            id,
            numero_proceso
          `)
          .eq(
            'control_runt_anterior_id',
            controlAnterior.id
          )
          .limit(
            1
          )

      if (
        errorProcesosSiguientes
      ) {
        throw new Error(
          `No fue posible validar reprocesos RUNT existentes: ${errorProcesosSiguientes.message}`
        )
      }

      if (
        Array.isArray(
          procesosSiguientes
        ) &&
        procesosSiguientes.length >
          0
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Este proceso RUNT ya tiene un reproceso creado.',

            data:
              procesosSiguientes[0],
          },
          {
            status:
              409,
          }
        )
      }

      // ===================================================
      // OBTENER NÚMERO DE PROCESO MÁS ALTO
      // ===================================================

      const {
        data:
          procesosMatricula,

        error:
          errorProcesosMatricula,
      } =
        await supabase
          .from(
            'control_runt'
          )
          .select(`
            id,
            numero_proceso
          `)
          .eq(
            'matricula_id',
            controlAnterior.matricula_id
          )
          .order(
            'numero_proceso',
            {
              ascending:
                false,
            }
          )
          .limit(
            1
          )

      if (
        errorProcesosMatricula
      ) {
        throw new Error(
          `No fue posible determinar el número del nuevo proceso RUNT: ${errorProcesosMatricula.message}`
        )
      }

      const numeroMaximo =
        Array.isArray(
          procesosMatricula
        ) &&
        procesosMatricula.length >
          0
          ? Number(
              procesosMatricula[0]
                ?.numero_proceso ||
              1
            )
          : Number(
              controlAnterior
                .numero_proceso ||
              1
            )

      const nuevoNumeroProceso =
        numeroMaximo +
        1

      // ===================================================
      // CREAR NUEVO CONTROL
      // ===================================================

      const {
        data:
          nuevoControl,

        error:
          errorNuevoControl,
      } =
        await supabase
          .from(
            'control_runt'
          )
          .insert({
            matricula_id:
              controlAnterior.matricula_id,

            consecutivo:
              controlAnterior.consecutivo,

            documento:
              controlAnterior.documento,

            categoria:
              controlAnterior.categoria,

            numero_proceso:
              nuevoNumeroProceso,

            control_runt_anterior_id:
              controlAnterior.id,

            motivo_reproceso:
              'VENCIMIENTO_90_DIAS',

            fecha_reinicio:
              hoyBogota(),

            estado_verificacion:
              'PENDIENTE',

            resultado_verificacion:
              null,

            fecha_verificacion:
              null,

            usuario_verificacion:
              null,

            estado_registro:
              'PENDIENTE',

            fecha_registro:
              null,

            usuario_registro:
              null,

            estado_certificacion:
              'PENDIENTE',

            fecha_certificacion:
              null,

            usuario_certificacion:
              null,

            observaciones:
              `Reproceso RUNT creado tras verificar ausencia de certificación del proceso #${controlAnterior.numero_proceso || 1}. Usuario: ${usuario}. Soporte: ${soporteVerificacion}.`,

            updated_at:
              new Date()
                .toISOString(),
          })
          .select('*')
          .single()

      if (
        errorNuevoControl
      ) {
        throw new Error(
          `No fue posible crear el nuevo proceso RUNT: ${errorNuevoControl.message}`
        )
      }

      return NextResponse.json(
        {
          status:
            'success',

          message:
            `Proceso RUNT #${nuevoNumeroProceso} creado correctamente. El cargue inicia nuevamente desde cero.`,

          data: {
            proceso_anterior: {
              id:
                controlAnterior.id,

              numero_proceso:
                controlAnterior.numero_proceso ||
                1,

              vigencia:
                vigenciaAnterior,
            },

            nuevo_proceso:
              nuevoControl,

            avance: {
              teoria_cargadas:
                0,

              taller_cargadas:
                0,

              practica_cargadas:
                0,
            },
          },

          empresa: {
            nit:
              empresa?.nit ||
              '',

            nombre:
              nombreEmpresa(
                empresa
              ),
          },
        },
        {
          status:
            201,
        }
      )
    }

    // =====================================================
    // ACCIÓN INVÁLIDA
    // =====================================================

    return NextResponse.json(
      {
        status:
          'error',

        message:
          'Acción no válida.',
      },
      {
        status:
          400,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'Error POST /api/admin/runt:',
      error
    )

    return respuestaError(
      error
    )
  }
}