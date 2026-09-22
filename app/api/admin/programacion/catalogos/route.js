// app/api/admin/programacion/catalogos/route.js

import {
  NextResponse,
} from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const MAX_CLASES_APRENDIZ_DIA =
  8

const MAX_CLASES_INSTRUCTOR_DIA_CURSO =
  10

const MAX_HORAS_INSTRUCTOR_MES =
  240

const HORA_INICIO_JORNADA =
  '06:00'

const HORA_ULTIMA_CLASE =
  '21:00'

const TIPOS_PROGRAMACION =
  new Set([
    'CURSO_VIGENTE',
    'REFUERZO',
  ])

const ESTADOS_QUE_OCUPAN_HORARIO = [
  'AGENDADA',
  'PENDIENTE_CARGUE',
  'DICTADA',
]

const ESTADOS_QUE_CONSUMEN_HORAS = [
  'AGENDADA',
  'PENDIENTE_CARGUE',
  'DICTADA',
]

const ESTADOS_REFUERZO_COMPROMETEN = [
  'AGENDADA',
  'PENDIENTE_CARGUE',
  'DICTADA',
]

// =========================================================
// ERROR EMPRESA
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
// HELPERS GENERALES
// =========================================================

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
  const resultado =
    Number(
      valor ||
      0
    )

  return Number.isFinite(
    resultado
  )
    ? resultado
    : 0
}

function fechaValida(
  valor
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    texto(
      valor
    )
  )
}

function horaValida(
  valor
) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    texto(
      valor
    ).slice(
      0,
      5
    )
  )
}

function horaNormalizada(
  valor
) {
  return texto(
    valor
  ).slice(
    0,
    5
  )
}

function enteroPositivo(
  valor
) {
  const resultado =
    Number(
      valor
    )

  if (
    !Number.isInteger(
      resultado
    ) ||
    resultado <= 0
  ) {
    return null
  }

  return resultado
}

function normalizarDocumento(
  valor
) {
  return texto(
    valor
  ).replace(
    /\s+/g,
    ''
  )
}

function normalizarTexto(
  valor
) {
  return texto(
    valor
  )
    .toUpperCase()
    .normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
}

function nombreCompleto(
  persona
) {
  return [
    texto(
      persona?.nombres
    ),

    texto(
      persona?.apellidos
    ),
  ]
    .filter(
      Boolean
    )
    .join(
      ' '
    )
    .trim()
}

function hoyColombia() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'America/Bogota',

      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',
    }
  ).format(
    new Date()
  )
}

function construirEmpresaRespuesta(
  empresa
) {
  return {
    nit:
      empresa?.nit ||
      '',

    codigo:
      empresa?.codigo ||
      '',

    nombre:
      empresa?.nombre ||
      empresa?.razon_social ||
      '',

    razon_social:
      empresa?.razon_social ||
      '',

    direccion:
      empresa?.direccion ||
      '',

    ciudad:
      empresa?.ciudad ||
      '',

    departamento:
      empresa?.departamento ||
      '',

    telefono:
      empresa?.telefono ||
      '',

    email:
      empresa?.email_principal ||
      '',
  }
}

// =========================================================
// NORMALIZAR BÚSQUEDA POSTGREST
// =========================================================

function limpiarBusqueda(
  valor
) {
  return texto(
    valor
  )
    .replace(
      /[,()]/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
}

// =========================================================
// NORMALIZACIÓN LICENCIAS
// =========================================================

function normalizarTipoLicencia(
  valor
) {
  return normalizarTexto(
    valor
  )
    .replace(
      /\s+/g,
      '_'
    )
}

function normalizarCategoriaLicencia(
  valor
) {
  return normalizarTexto(
    valor
  )
    .replace(
      /\s*-\s*/g,
      '-'
    )
    .replace(
      /\s+/g,
      ''
    )
}

// =========================================================
// CATEGORÍAS QUE PUEDE DICTAR SEGÚN LICENCIA INSTRUCTOR
// =========================================================
//
// A2
//   → A2
//
// B1
//   → B1
//
// B1-C1
//   → B1, C1, RC1
//
// B2-C2
//   → B1, C1, RC1, B2, C2
//
// B3-C3
//   → B1, C1, RC1, B2, C2, B3, C3
//
// Actualmente el CEA puede no ofertar B2/B3,
// pero se conserva la interpretación normativa.
//
// =========================================================

function categoriasPermitidasLicenciaInstructor(
  valor
) {
  const licencia =
    normalizarCategoriaLicencia(
      valor
    )

  const mapa = {
    A2: [
      'A2',
    ],

    B1: [
      'B1',
    ],

    'B1-C1': [
      'B1',
      'C1',
      'RC1',
    ],

    'B2-C2': [
      'B1',
      'C1',
      'RC1',
      'B2',
      'C2',
    ],

    'B3-C3': [
      'B1',
      'C1',
      'RC1',
      'B2',
      'C2',
      'B3',
      'C3',
    ],
  }

  return mapa[
    licencia
  ] || []
}

// =========================================================
// VALIDAR LICENCIA INSTRUCTOR CONTRA CATEGORÍA
// =========================================================

function licenciaInstructorPermiteCategoria(
  licencia,
  categoria
) {
  const categoriaCurso =
    normalizarCategoriaLicencia(
      categoria
    )

  return categoriasPermitidasLicenciaInstructor(
    licencia?.categoria
  ).includes(
    categoriaCurso
  )
}

// =========================================================
// VIGENCIA
// =========================================================

function registroVigenteEnFecha(
  registro,
  fechaReferencia
) {
  const vigencia =
    texto(
      registro?.vigencia
    ).slice(
      0,
      10
    )

  if (
    !vigencia ||
    !fechaValida(
      vigencia
    )
  ) {
    return false
  }

  return vigencia >=
    fechaReferencia
}

// =========================================================
// NORMALIZAR TIPO VEHÍCULO
// =========================================================

function normalizarTipoVehiculo(
  valor
) {
  return normalizarTexto(
    valor
  )
    .replace(
      /[-_]/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
}

// =========================================================
// TIPOS DE VEHÍCULO PERMITIDOS POR CATEGORÍA
// =========================================================

function tiposVehiculoPermitidosCategoria(
  categoria
) {
  const cat =
    normalizarCategoriaLicencia(
      categoria
    )

  const mapa = {
    A2: [
      'MOTOCICLETA',
    ],

    B1: [
      'AUTOMOVIL',
      'CAMIONETA',
    ],

    C1: [
      'AUTOMOVIL',
      'CAMIONETA',
    ],

    RC1: [
      'AUTOMOVIL',
      'CAMIONETA',
    ],

    B2: [
      'CAMION',
    ],

    C2: [
      'CAMION',
    ],

    B3: [
      'TRACTO CAMION',
    ],

    C3: [
      'TRACTO CAMION',
    ],
  }

  return mapa[
    cat
  ] || []
}

// =========================================================
// VALIDAR VEHÍCULO CONTRA CATEGORÍA
// =========================================================

function vehiculoCompatibleCategoria(
  vehiculo,
  categoria
) {
  if (
    !categoria
  ) {
    return true
  }

  const tipo =
    normalizarTipoVehiculo(
      vehiculo?.tipo_vehiculo
    )

  const permitidos =
    tiposVehiculoPermitidosCategoria(
      categoria
    )

  return permitidos.includes(
    tipo
  )
}
// =========================================================
// RANGO DEL MES
// =========================================================

function obtenerRangoMes(
  fecha
) {
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

  const ultimoDia =
    new Date(
      anio,
      mes,
      0
    ).getDate()

  return {
    desde:
      `${anio}-${String(
        mes
      ).padStart(
        2,
        '0'
      )}-01`,

    hasta:
      `${anio}-${String(
        mes
      ).padStart(
        2,
        '0'
      )}-${String(
        ultimoDia
      ).padStart(
        2,
        '0'
      )}`,
  }
}

// =========================================================
// HORARIOS PARA VISTA DIARIA DE INSTRUCTORES
// =========================================================

function construirHorariosJornada() {
  const horarios =
    []

  const horaInicio =
    Number(
      HORA_INICIO_JORNADA.split(
        ':'
      )[0]
    )

  const horaFinal =
    Number(
      HORA_ULTIMA_CLASE.split(
        ':'
      )[0]
    )

  for (
    let hora =
      horaInicio;
    hora <=
    horaFinal;
    hora += 1
  ) {
    horarios.push(
      `${String(
        hora
      ).padStart(
        2,
        '0'
      )}:00`
    )
  }

  return horarios
}

// =========================================================
// HORARIO GENERAL
// =========================================================

function horarioPermitido(
  hora
) {
  const valor =
    horaNormalizada(
      hora
    )

  if (
    !horaValida(
      valor
    )
  ) {
    return false
  }

  return (
    valor >=
      HORA_INICIO_JORNADA &&
    valor <=
      HORA_ULTIMA_CLASE
  )
}

// =========================================================
// REQUISITOS POR CATEGORÍA
// =========================================================

async function consultarRequisitosCategorias(
  supabase,
  categorias = []
) {
  const lista =
    [
      ...new Set(
        (
          Array.isArray(
            categorias
          )
            ? categorias
            : []
        )
          .map(
            normalizarCategoriaLicencia
          )
          .filter(
            Boolean
          )
      ),
    ]

  if (
    lista.length ===
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
        'runt_requisitos_categoria'
      )
      .select(`
        id,
        categoria,
        clases_teoria,
        clases_taller,
        clases_practica,
        limite_clases_dia,
        horas_mensuales_instructor,
        activo
      `)
      .in(
        'categoria',
        lista
      )
      .eq(
        'activo',
        true
      )
      .order(
        'categoria',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los requisitos por categoría: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// ESTADO FINANCIERO APRENDICES
// =========================================================
//
// Para CURSO_VIGENTE:
//
// - aprendiz ACTIVO
// - debe tener cuenta válida
// - ninguna cuenta activa puede estar PENDIENTE o ABONADO
// - las cuentas deben estar PAZ_Y_SALVO
//
// =========================================================

async function consultarEstadoFinancieroDocumentos(
  supabase,
  documentos
) {
  const lista =
    [
      ...new Set(
        documentos
          .map(
            normalizarDocumento
          )
          .filter(
            Boolean
          )
      ),
    ]

  const resultado =
    new Map()

  if (
    lista.length ===
    0
  ) {
    return resultado
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'cuentas_aprendiz'
      )
      .select(`
        id,
        documento,
        estado,
        origen_matricula
      `)
      .in(
        'documento',
        lista
      )
      .neq(
        'estado',
        'ANULADA'
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible validar el estado financiero de los aprendices: ${error.message}`
    )
  }

  for (
    const documento of
      lista
  ) {
    resultado.set(
      documento,
      {
        tiene_cuenta:
          false,

        paz_y_salvo:
          false,

        estados:
          [],
      }
    )
  }

  for (
    const cuenta of
      Array.isArray(
        data
      )
        ? data
        : []
  ) {
    const documento =
      normalizarDocumento(
        cuenta?.documento
      )

    if (
      !resultado.has(
        documento
      )
    ) {
      resultado.set(
        documento,
        {
          tiene_cuenta:
            false,

          paz_y_salvo:
            false,

          estados:
            [],
        }
      )
    }

    const item =
      resultado.get(
        documento
      )

    item.tiene_cuenta =
      true

    item.estados.push(
      mayusculas(
        cuenta?.estado
      )
    )
  }

  for (
    const [
      documento,
      item,
    ] of resultado.entries()
  ) {
    const estados =
      item.estados.filter(
        Boolean
      )

    item.paz_y_salvo =
      estados.length >
        0 &&
      estados.every(
        estado =>
          estado ===
          'PAZ_Y_SALVO'
      )

    resultado.set(
      documento,
      item
    )
  }

  return resultado
}

// =========================================================
// BUSCAR APRENDICES
// =========================================================
//
// Búsqueda automática desde 3 caracteres.
//
// CURSO_VIGENTE:
// - estado ACTIVO
// - PAZ_Y_SALVO
//
// REFUERZO:
// - puede buscar aprendices existentes aunque el refuerzo
//   posteriormente tenga su propio control de compra.
//
// =========================================================

async function buscarAprendices(
  supabase,
  {
    busqueda,
    tipoProgramacion,
  }
) {
  const buscar =
    limpiarBusqueda(
      busqueda
    )

  if (
    buscar.length <
    3
  ) {
    return []
  }

  let consulta =
    supabase
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
        categorias,
        estado,
        origen_matricula,
        convenio,
        convenio_id
      `)
      .or(
        [
          `documento.ilike.%${buscar}%`,
          `consecutivo.ilike.%${buscar}%`,
          `nombres.ilike.%${buscar}%`,
          `apellidos.ilike.%${buscar}%`,
        ].join(
          ','
        )
      )
      .order(
        'apellidos',
        {
          ascending:
            true,
        }
      )
      .order(
        'nombres',
        {
          ascending:
            true,
        }
      )
      .limit(
        30
      )

  if (
    tipoProgramacion ===
    'CURSO_VIGENTE'
  ) {
    consulta =
      consulta.eq(
        'estado',
        'ACTIVO'
      )
  }

  const {
    data,
    error,
  } =
    await consulta

  if (
    error
  ) {
    throw new Error(
      `No fue posible buscar los aprendices: ${error.message}`
    )
  }

  let aprendices =
    Array.isArray(
      data
    )
      ? data
      : []

  // =======================================================
  // CURSO VIGENTE:
  // DEBE ESTAR PAZ Y SALVO
  // =======================================================

  if (
    tipoProgramacion ===
    'CURSO_VIGENTE'
  ) {
    const documentos =
      aprendices
        .map(
          aprendiz =>
            normalizarDocumento(
              aprendiz?.documento
            )
        )
        .filter(
          Boolean
        )

    const estadosFinancieros =
      await consultarEstadoFinancieroDocumentos(
        supabase,
        documentos
      )

    aprendices =
      aprendices.filter(
        aprendiz => {
          const documento =
            normalizarDocumento(
              aprendiz?.documento
            )

          const financiero =
            estadosFinancieros.get(
              documento
            )

          return Boolean(
            financiero
              ?.tiene_cuenta &&
            financiero
              ?.paz_y_salvo
          )
        }
      )
  }

  return aprendices.map(
    aprendiz => ({
      ...aprendiz,

      nombre_completo:
        nombreCompleto(
          aprendiz
        ),

      categorias:
        Array.isArray(
          aprendiz?.categorias
        )
          ? aprendiz.categorias
          : [],

      habilitado_programacion:
        true,

      // ===================================================
      // IDENTIFICACIÓN PARA LA PÁGINA
      // ===================================================

      origen_programacion:
        'APRENDIZ',

      matricula_id:
        aprendiz?.id ||
        null,

      recibo_refuerzo_id:
        null,
    })
  )
}
// =========================================================
// REFUERZOS EXTERNOS PAGADOS EN CAJA
// =========================================================

function esConceptoRefuerzoPractico(
  valor
) {
  return normalizarTexto(
    valor
  ) ===
    'REFUERZO PRACTICO'
}

async function consultarConceptosRefuerzo(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'conceptos_caja'
      )
      .select(`
        id,
        nombre,
        descripcion,
        activo
      `)

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el concepto de refuerzo práctico: ${error.message}`
    )
  }

  return (
    Array.isArray(
      data
    )
      ? data
      : []
  ).filter(
    item =>
      esConceptoRefuerzoPractico(
        item?.nombre
      )
  )
}

// =========================================================
// CONSULTAR CLASES ASOCIADAS A RECIBOS DE REFUERZO
// =========================================================

async function consultarProgramacionRecibosRefuerzo(
  supabase,
  recibosIds
) {
  const ids =
    [
      ...new Set(
        (
          Array.isArray(
            recibosIds
          )
            ? recibosIds
            : []
        )
          .map(
            enteroPositivo
          )
          .filter(
            Boolean
          )
      ),
    ]

  if (
    ids.length ===
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
        'programacion_clases'
      )
      .select(`
        id,
        recibo_refuerzo_id,
        matricula_id,
        instructor_id,
        vehiculo_id,
        categoria,
        fecha,
        hora_inicio,
        tipo_programacion,
        estado,
        motivo_no_dictada_id,
        observacion_no_dictada,

        motivo_no_dictada:motivos_no_dictada (
          id,
          nombre,
          responsable
        )
      `)
      .in(
        'recibo_refuerzo_id',
        ids
      )
      .eq(
        'tipo_programacion',
        'REFUERZO'
      )
      .order(
        'fecha',
        {
          ascending:
            true,
        }
      )
      .order(
        'hora_inicio',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar las clases asociadas a los refuerzos: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// DETERMINAR SI UNA CLASE DE REFUERZO CONSUME CUPO
// =========================================================
//
// AGENDADA
// PENDIENTE_CARGUE
// DICTADA
//   → consumen cupo.
//
// CANCELADA
//   → devuelve el cupo.
//
// NO_DICTADA
//   → depende del responsable.
//
// Si el responsable es INSTRUCTOR:
//   devuelve la clase.
//
// Si es responsabilidad del aprendiz/cliente:
//   consume la clase.
//
// =========================================================

function claseRefuerzoConsumeCupo(
  clase
) {
  const estado =
    mayusculas(
      clase?.estado
    )

  // =======================================================
  // ESTADOS QUE CONSUMEN
  // =======================================================

  if (
    [
      'AGENDADA',
      'PENDIENTE_CARGUE',
      'DICTADA',
    ].includes(
      estado
    )
  ) {
    return true
  }

  // =======================================================
  // CANCELADA
  //
  // Devuelve la clase al saldo.
  // =======================================================

  if (
    estado ===
    'CANCELADA'
  ) {
    return false
  }

  // =======================================================
  // OTROS ESTADOS
  // =======================================================

  if (
    estado !==
    'NO_DICTADA'
  ) {
    return false
  }

  // =======================================================
  // RESPONSABLE DE NO DICTADA
  // =======================================================

  const responsable =
    normalizarTexto(
      clase
        ?.motivo_no_dictada
        ?.responsable
    )

  // =======================================================
  // RESPONSABILIDAD INSTRUCTOR / CEA
  //
  // La clase vuelve al saldo disponible.
  // =======================================================

  if (
    [
      'INSTRUCTOR',
      'DOCENTE',
      'CEA',
      'ADMINISTRACION',
    ].includes(
      responsable
    )
  ) {
    return false
  }

  // =======================================================
  // APRENDIZ / CLIENTE / SIN DEFINIR
  //
  // Consume la clase comprada.
  // =======================================================

  return true
}
// =========================================================
// AGRUPAR CLASES POR RECIBO DE REFUERZO
// =========================================================

function agruparProgramacionPorReciboRefuerzo(
  clases
) {
  const mapa =
    new Map()

  for (
    const clase of
      Array.isArray(
        clases
      )
        ? clases
        : []
  ) {
    const reciboId =
      Number(
        clase?.recibo_refuerzo_id
      )

    if (
      !reciboId
    ) {
      continue
    }

    if (
      !mapa.has(
        reciboId
      )
    ) {
      mapa.set(
        reciboId,
        []
      )
    }

    mapa
      .get(
        reciboId
      )
      .push(
        clase
      )
  }

  return mapa
}

// =========================================================
// CONSTRUIR REFUERZO EXTERNO PROGRAMABLE
// =========================================================

function construirRefuerzoExterno(
  recibo,
  clases = []
) {
  const compradas =
    Math.max(
      0,
      Math.trunc(
        numero(
          recibo?.cantidad_clases_refuerzo
        )
      )
    )

  const comprometidas =
    clases.filter(
      claseRefuerzoConsumeCupo
    ).length

  const disponibles =
    Math.max(
      0,
      compradas -
        comprometidas
    )

  const categoria =
    normalizarCategoriaLicencia(
      recibo?.categoria
    )

  const nombre =
    texto(
      recibo?.nombre_cliente ||
      recibo?.nombre_pagador
    )

  const documento =
    normalizarDocumento(
      recibo?.documento_cliente ||
      recibo?.documento_pagador ||
      recibo?.documento
    )

  return {
    id:
      `REFUERZO-${recibo?.id}`,

    origen_programacion:
      'CLIENTE_EXTERNO',

    matricula_id:
      null,

    recibo_refuerzo_id:
      Number(
        recibo?.id
      ) ||
      null,

    consecutivo:
      recibo?.consecutivo ||
      (
        recibo?.id
          ? `RC-${String(
              recibo.id
            ).padStart(
              6,
              '0'
            )}`
          : ''
      ),

    fecha_compra:
      recibo?.fecha ||
      null,

    tipo_doc:
      recibo?.tipo_documento_cliente ||
      '',

    documento,

    nombres:
      nombre,

    apellidos:
      '',

    nombre_completo:
      nombre,

    celular:
      recibo?.celular_cliente ||
      '',

    correo:
      recibo?.correo_cliente ||
      '',

    categorias:
      categoria
        ? [
            categoria,
          ]
        : [],

    categoria,

    estado:
      'ACTIVO',

    concepto:
      recibo?.concepto ||
      null,

    medio_pago:
      recibo?.medio_pago ||
      null,

    valor_pagado:
      numero(
        recibo?.valor
      ),

    cantidad_clases_refuerzo:
      compradas,

    clases_compradas:
      compradas,

    clases_comprometidas:
      comprometidas,

    clases_disponibles:
      disponibles,

    clases_programadas:
      clases.filter(
        item =>
          mayusculas(
            item?.estado
          ) ===
          'AGENDADA'
      ).length,

    clases_dictadas:
      clases.filter(
        item =>
          mayusculas(
            item?.estado
          ) ===
          'DICTADA'
      ).length,

    clases_no_dictadas:
      clases.filter(
        item =>
          mayusculas(
            item?.estado
          ) ===
          'NO_DICTADA'
      ).length,

    clases_canceladas:
      clases.filter(
        item =>
          mayusculas(
            item?.estado
          ) ===
          'CANCELADA'
      ).length,

    habilitado_programacion:
      Boolean(
        categoria &&
        compradas >
          0 &&
        disponibles >
          0
      ),

    programacion:
      clases,
  }
}

// =========================================================
// BUSCAR CLIENTES EXTERNOS DE REFUERZO
// =========================================================
//
// Fuente:
//
// recibos_caja
//
// Requisitos:
//
// tipo_origen = LIBRE
// estado = ACTIVO
// concepto = REFUERZO PRACTICO
// cantidad_clases_refuerzo > 0
//
// =========================================================

async function buscarRefuerzosExternos(
  supabase,
  {
    busqueda,
  }
) {
  const buscar =
    limpiarBusqueda(
      busqueda
    )

  if (
    buscar.length <
    3
  ) {
    return []
  }

  // =======================================================
  // IDENTIFICAR CONCEPTO REFUERZO PRACTICO
  // =======================================================

  const conceptos =
    await consultarConceptosRefuerzo(
      supabase
    )

  const conceptosIds =
    conceptos
      .map(
        item =>
          Number(
            item?.id
          )
      )
      .filter(
        Boolean
      )

  if (
    conceptosIds.length ===
    0
  ) {
    return []
  }

  // =======================================================
  // CONSULTAR RECIBOS
  // =======================================================

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'recibos_caja'
      )
      .select(`
        id,
        cuenta_id,
        matricula_id,
        documento,
        concepto_id,
        medio_pago_id,
        fecha,
        descripcion,
        valor,
        nombre_pagador,
        documento_pagador,
        referencia_pago,
        recibido_por,
        observaciones,
        estado,
        nombre_cliente,
        tipo_documento_cliente,
        documento_cliente,
        celular_cliente,
        correo_cliente,
        tipo_origen,
        categoria,
        cantidad_clases_refuerzo,
        created_at,

        concepto:conceptos_caja (
          id,
          nombre,
          descripcion
        ),

        medio_pago:medios_pago_caja (
          id,
          nombre
        )
      `)
      .eq(
        'tipo_origen',
        'LIBRE'
      )
      .eq(
        'estado',
        'ACTIVO'
      )
      .in(
        'concepto_id',
        conceptosIds
      )
      .not(
        'cantidad_clases_refuerzo',
        'is',
        null
      )
      .gt(
        'cantidad_clases_refuerzo',
        0
      )
      .or(
        [
          `nombre_cliente.ilike.%${buscar}%`,
          `documento_cliente.ilike.%${buscar}%`,
          `celular_cliente.ilike.%${buscar}%`,
          `correo_cliente.ilike.%${buscar}%`,
          `nombre_pagador.ilike.%${buscar}%`,
          `documento_pagador.ilike.%${buscar}%`,
          `documento.ilike.%${buscar}%`,
        ].join(
          ','
        )
      )
      .order(
        'fecha',
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
      .limit(
        50
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible buscar los clientes externos de refuerzo: ${error.message}`
    )
  }

  const recibos =
    Array.isArray(
      data
    )
      ? data
      : []

  // =======================================================
  // CONSULTAR CLASES YA UTILIZADAS
  // =======================================================

  const recibosIds =
    recibos
      .map(
        item =>
          Number(
            item?.id
          )
      )
      .filter(
        Boolean
      )

  const clases =
    await consultarProgramacionRecibosRefuerzo(
      supabase,
      recibosIds
    )

  const clasesPorRecibo =
    agruparProgramacionPorReciboRefuerzo(
      clases
    )

  // =======================================================
  // CONSTRUIR RESULTADO
  // =======================================================

  return recibos
    .map(
      recibo =>
        construirRefuerzoExterno(
          recibo,
          clasesPorRecibo.get(
            Number(
              recibo?.id
            )
          ) ||
            []
        )
    )
    .filter(
      item =>
        item
          ?.cantidad_clases_refuerzo >
        0
    )
}

// =========================================================
// CONSULTAR UN REFUERZO EXTERNO
// =========================================================

async function consultarRefuerzoExterno(
  supabase,
  reciboRefuerzoId
) {
  const conceptos =
    await consultarConceptosRefuerzo(
      supabase
    )

  const conceptosIds =
    conceptos
      .map(
        item =>
          Number(
            item?.id
          )
      )
      .filter(
        Boolean
      )

  if (
    conceptosIds.length ===
    0
  ) {
    return null
  }

  const {
    data:
      recibo,
    error,
  } =
    await supabase
      .from(
        'recibos_caja'
      )
      .select(`
        id,
        cuenta_id,
        matricula_id,
        documento,
        concepto_id,
        medio_pago_id,
        fecha,
        descripcion,
        valor,
        nombre_pagador,
        documento_pagador,
        referencia_pago,
        recibido_por,
        observaciones,
        estado,
        nombre_cliente,
        tipo_documento_cliente,
        documento_cliente,
        celular_cliente,
        correo_cliente,
        tipo_origen,
        categoria,
        cantidad_clases_refuerzo,
        created_at,

        concepto:conceptos_caja (
          id,
          nombre,
          descripcion
        ),

        medio_pago:medios_pago_caja (
          id,
          nombre
        )
      `)
      .eq(
        'id',
        reciboRefuerzoId
      )
      .eq(
        'tipo_origen',
        'LIBRE'
      )
      .eq(
        'estado',
        'ACTIVO'
      )
      .in(
        'concepto_id',
        conceptosIds
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el refuerzo externo: ${error.message}`
    )
  }

  if (
    !recibo
  ) {
    return null
  }

  const clases =
    await consultarProgramacionRecibosRefuerzo(
      supabase,
      [
        reciboRefuerzoId,
      ]
    )

  return construirRefuerzoExterno(
    recibo,
    clases
  )
}

// =========================================================
// BUSCAR PERSONAS PROGRAMABLES
// =========================================================
//
// CURSO_VIGENTE:
//
// Solo aprendices.
//
// REFUERZO:
//
// - aprendices existentes;
// - clientes externos con refuerzo pagado en Caja.
//
// =========================================================

async function buscarPersonasProgramables(
  supabase,
  {
    busqueda,
    tipoProgramacion,
  }
) {
  const aprendices =
    await buscarAprendices(
      supabase,
      {
        busqueda,
        tipoProgramacion,
      }
    )

  if (
    tipoProgramacion !==
    'REFUERZO'
  ) {
    return aprendices
  }

  const externos =
    await buscarRefuerzosExternos(
      supabase,
      {
        busqueda,
      }
    )

  return [
    ...aprendices,
    ...externos,
  ]
}
// =========================================================
// PROGRAMACIÓN DEL APRENDIZ
// =========================================================

async function consultarProgramacionAprendiz(
  supabase,
  matriculaId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'programacion_clases'
      )
      .select(`
        id,
        matricula_id,
        recibo_refuerzo_id,
        instructor_id,
        vehiculo_id,
        categoria,
        fecha,
        hora_inicio,
        tipo_programacion,
        estado,
        motivo_no_dictada_id,
        observacion_no_dictada,
        usuario_cancelacion,
        fecha_cancelacion,
        created_at
      `)
      .eq(
        'matricula_id',
        matriculaId
      )
      .order(
        'fecha',
        {
          ascending:
            true,
        }
      )
      .order(
        'hora_inicio',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar la programación del aprendiz: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// PROGRESO DEL APRENDIZ
// =========================================================

function construirProgresoAprendiz(
  categorias,
  requisitos,
  clases
) {
  return categorias.map(
    categoria => {
      const cat =
        normalizarCategoriaLicencia(
          categoria
        )

      const requisito =
        requisitos.find(
          item =>
            normalizarCategoriaLicencia(
              item?.categoria
            ) ===
            cat
        )

      const clasesCategoria =
        clases.filter(
          item =>
            normalizarCategoriaLicencia(
              item?.categoria
            ) ===
            cat
        )

      // ===================================================
      // CURSO VIGENTE
      // ===================================================

      const curso =
        clasesCategoria.filter(
          item =>
            item
              ?.tipo_programacion ===
            'CURSO_VIGENTE'
        )

      // ===================================================
      // REFUERZOS
      // ===================================================

      const refuerzos =
        clasesCategoria.filter(
          item =>
            item
              ?.tipo_programacion ===
            'REFUERZO'
        )

      // ===================================================
      // ESTADOS CURSO VIGENTE
      // ===================================================

      const agendadas =
        curso.filter(
          item =>
            item?.estado ===
            'AGENDADA'
        ).length

      const pendientesCargue =
        curso.filter(
          item =>
            item?.estado ===
            'PENDIENTE_CARGUE'
        ).length

      const dictadas =
        curso.filter(
          item =>
            item?.estado ===
            'DICTADA'
        ).length

      const noDictadas =
        curso.filter(
          item =>
            item?.estado ===
            'NO_DICTADA'
        ).length

      const canceladas =
        curso.filter(
          item =>
            item?.estado ===
            'CANCELADA'
        ).length

      // ===================================================
      // CLASES COMPROMETIDAS
      //
      // CANCELADA y NO_DICTADA no comprometen cupo de
      // curso vigente.
      //
      // ===================================================

      const comprometidas =
        agendadas +
        pendientesCargue +
        dictadas

      const requeridas =
        numero(
          requisito
            ?.clases_practica
        )

      // ===================================================
      // ESTADOS REFUERZO
      // ===================================================

      const refuerzosAgendados =
        refuerzos.filter(
          item =>
            item?.estado ===
            'AGENDADA'
        ).length

      const refuerzosPendientes =
        refuerzos.filter(
          item =>
            item?.estado ===
            'PENDIENTE_CARGUE'
        ).length

      const refuerzosDictados =
        refuerzos.filter(
          item =>
            item?.estado ===
            'DICTADA'
        ).length

      const refuerzosNoDictados =
        refuerzos.filter(
          item =>
            item?.estado ===
            'NO_DICTADA'
        ).length

      const refuerzosCancelados =
        refuerzos.filter(
          item =>
            item?.estado ===
            'CANCELADA'
        ).length

      return {
        categoria:
          cat,

        clases_requeridas:
          requeridas,

        agendadas,

        pendientes_cargue:
          pendientesCargue,

        dictadas,

        no_dictadas:
          noDictadas,

        canceladas,

        clases_comprometidas:
          comprometidas,

        disponibles_programar:
          Math.max(
            0,
            requeridas -
              comprometidas
          ),

        refuerzos_agendados:
          refuerzosAgendados,

        refuerzos_pendientes_cargue:
          refuerzosPendientes,

        refuerzos_dictados:
          refuerzosDictados,

        refuerzos_no_dictados:
          refuerzosNoDictados,

        refuerzos_cancelados:
          refuerzosCancelados,
      }
    }
  )
}

// =========================================================
// DETALLE APRENDIZ
// =========================================================

async function consultarAprendiz(
  supabase,
  {
    matriculaId,
    fecha,
    tipoProgramacion,
  }
) {
  const {
    data:
      aprendiz,

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
        categorias,
        estado,
        origen_matricula,
        convenio,
        convenio_id
      `)
      .eq(
        'id',
        matriculaId
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el aprendiz: ${error.message}`
    )
  }

  if (
    !aprendiz
  ) {
    return null
  }

  // =======================================================
  // CURSO VIGENTE
  // =======================================================

  if (
    tipoProgramacion ===
    'CURSO_VIGENTE'
  ) {
    // =====================================================
    // ESTADO ACTIVO
    // =====================================================

    if (
      mayusculas(
        aprendiz?.estado
      ) !==
      'ACTIVO'
    ) {
      throw new Error(
        'El aprendiz no se encuentra en estado ACTIVO.'
      )
    }

    // =====================================================
    // PAZ Y SALVO
    // =====================================================

    const estados =
      await consultarEstadoFinancieroDocumentos(
        supabase,
        [
          aprendiz.documento,
        ]
      )

    const financiero =
      estados.get(
        normalizarDocumento(
          aprendiz.documento
        )
      )

    if (
      !financiero
        ?.tiene_cuenta ||
      !financiero
        ?.paz_y_salvo
    ) {
      throw new Error(
        'El aprendiz no se encuentra PAZ Y SALVO y no puede programar clases del curso vigente.'
      )
    }
  }

  // =======================================================
  // CATEGORÍAS
  // =======================================================

  const categorias =
    Array.isArray(
      aprendiz?.categorias
    )
      ? aprendiz.categorias
      : []

  // =======================================================
  // REQUISITOS + PROGRAMACIÓN
  // =======================================================

  const [
    requisitos,
    clases,
  ] =
    await Promise.all([
      consultarRequisitosCategorias(
        supabase,
        categorias
      ),

      consultarProgramacionAprendiz(
        supabase,
        matriculaId
      ),
    ])

  // =======================================================
  // PROGRESO
  // =======================================================

  const progreso =
    construirProgresoAprendiz(
      categorias,
      requisitos,
      clases
    )

  // =======================================================
  // CLASES DEL DÍA
  // =======================================================

  const clasesDia =
    fecha
      ? clases.filter(
          item =>
            item?.fecha ===
              fecha &&
            ESTADOS_QUE_OCUPAN_HORARIO.includes(
              item?.estado
            )
        ).length
      : 0

  // =======================================================
  // RESPUESTA
  // =======================================================

  return {
    ...aprendiz,

    origen_programacion:
      'APRENDIZ',

    matricula_id:
      aprendiz?.id ||
      null,

    recibo_refuerzo_id:
      null,

    nombre_completo:
      nombreCompleto(
        aprendiz
      ),

    categorias,

    progreso,

    fecha_consultada:
      fecha ||
      null,

    clases_dia:
      clasesDia,

    limite_clases_dia:
      MAX_CLASES_APRENDIZ_DIA,

    clases_disponibles_dia:
      fecha
        ? Math.max(
            0,
            MAX_CLASES_APRENDIZ_DIA -
              clasesDia
          )
        : null,

    puede_programar_dia:
      fecha
        ? clasesDia <
          MAX_CLASES_APRENDIZ_DIA
        : true,
  }
}
// =========================================================
// CONSULTAR PERSONAL ACTIVO
// =========================================================

async function consultarPersonalActivo(
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
      .select(`
        id,
        tipo_documento,
        documento,
        nombres,
        apellidos,
        telefono,
        email,
        cargo,
        tipo_personal,
        estado
      `)
      .order(
        'apellidos',
        {
          ascending:
            true,
        }
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
    throw new Error(
      `No fue posible consultar el personal: ${error.message}`
    )
  }

  return (
    Array.isArray(
      data
    )
      ? data
      : []
  ).filter(
    item =>
      normalizarTexto(
        item?.estado
      ) ===
      'ACTIVO'
  )
}

// =========================================================
// CONSULTAR LICENCIAS PERSONAL
// =========================================================

async function consultarLicenciasPersonal(
  supabase,
  personalIds
) {
  if (
    !Array.isArray(
      personalIds
    ) ||
    personalIds.length ===
      0
  ) {
    return []
  }

  const ids =
    [
      ...new Set(
        personalIds
          .map(
            Number
          )
          .filter(
            Boolean
          )
      ),
    ]

  if (
    ids.length ===
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
        'licencias_personal'
      )
      .select(`
        id,
        personal_id,
        documento,
        tipo_licencia,
        categoria,
        vigencia,
        numero_certificado,
        fecha_actualizacion,
        observaciones
      `)
      .in(
        'personal_id',
        ids
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar las licencias del personal: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// AGRUPAR LICENCIAS POR PERSONAL
// =========================================================

function agruparLicenciasPorPersonal(
  licencias
) {
  const mapa =
    new Map()

  for (
    const licencia of
      Array.isArray(
        licencias
      )
        ? licencias
        : []
  ) {
    const personalId =
      Number(
        licencia?.personal_id
      )

    if (
      !personalId
    ) {
      continue
    }

    if (
      !mapa.has(
        personalId
      )
    ) {
      mapa.set(
        personalId,
        []
      )
    }

    mapa
      .get(
        personalId
      )
      .push(
        licencia
      )
  }

  return mapa
}

// =========================================================
// VALIDAR DOCUMENTACIÓN DEL INSTRUCTOR
// =========================================================
//
// Para que una persona aparezca en Programación necesita:
//
// 1. Licencia tipo INSTRUCTOR vigente.
// 2. Licencia tipo CONDUCCION vigente.
//
// Se normalizan automáticamente:
//
// Instructor
// INSTRUCTOR
// instructor
//
// Conducción
// CONDUCCION
// Conduccion
//
// Si se recibe categoría:
//
// - además se valida que la licencia de INSTRUCTOR
//   permita dictar esa categoría.
//
// Si NO se recibe categoría:
//
// - basta con tener alguna licencia de INSTRUCTOR vigente.
// - esto permite precargar todos los instructores al abrir
//   la página.
//
// =========================================================

function evaluarDocumentacionInstructor({
  licencias,
  categoria,
  fechaReferencia,
}) {
  const registros =
    Array.isArray(
      licencias
    )
      ? licencias
      : []

  // =======================================================
  // LICENCIAS TIPO INSTRUCTOR
  // =======================================================

  const licenciasInstructor =
    registros.filter(
      item =>
        normalizarTipoLicencia(
          item?.tipo_licencia
        ) ===
        'INSTRUCTOR'
    )

  // =======================================================
  // LICENCIAS TIPO CONDUCCIÓN
  // =======================================================

  const licenciasConduccion =
    registros.filter(
      item =>
        normalizarTipoLicencia(
          item?.tipo_licencia
        ) ===
        'CONDUCCION'
    )

  // =======================================================
  // INSTRUCTOR VIGENTE
  // =======================================================

  const instructoresVigentes =
    licenciasInstructor.filter(
      item =>
        registroVigenteEnFecha(
          item,
          fechaReferencia
        )
    )

  // =======================================================
  // INSTRUCTOR COMPATIBLE CON CATEGORÍA
  // =======================================================

  const instructorCompatible =
    categoria
      ? instructoresVigentes.find(
          item =>
            licenciaInstructorPermiteCategoria(
              item,
              categoria
            )
        )
      : (
          instructoresVigentes[0] ||
          null
        )

  // =======================================================
  // CONDUCCIÓN VIGENTE
  // =======================================================

  const conduccionVigente =
    licenciasConduccion.find(
      item =>
        registroVigenteEnFecha(
          item,
          fechaReferencia
        )
    )

  let motivo =
    ''

  if (
    licenciasInstructor.length ===
    0
  ) {
    motivo =
      'No tiene licencia de INSTRUCTOR registrada.'
  } else if (
    instructoresVigentes.length ===
    0
  ) {
    motivo =
      'La licencia de INSTRUCTOR no está vigente para la fecha seleccionada.'
  } else if (
    categoria &&
    !instructorCompatible
  ) {
    motivo =
      `No tiene licencia de INSTRUCTOR vigente y habilitada para ${categoria}.`
  } else if (
    licenciasConduccion.length ===
    0
  ) {
    motivo =
      'No tiene licencia de CONDUCCION registrada.'
  } else if (
    !conduccionVigente
  ) {
    motivo =
      'La licencia de CONDUCCION no está vigente para la fecha seleccionada.'
  }

  return {
    valido:
      Boolean(
        instructorCompatible &&
        conduccionVigente
      ),

    motivo,

    licencia_instructor:
      instructorCompatible ||
      null,

    licencias_instructor_vigentes:
      instructoresVigentes,

    licencia_conduccion:
      conduccionVigente ||
      null,
  }
}

// =========================================================
// CATEGORÍAS HABILITADAS DEL INSTRUCTOR
// =========================================================

function obtenerCategoriasHabilitadasInstructor(
  licenciasInstructor
) {
  const categorias =
    new Set()

  for (
    const licencia of
      Array.isArray(
        licenciasInstructor
      )
        ? licenciasInstructor
        : []
  ) {
    const permitidas =
      categoriasPermitidasLicenciaInstructor(
        licencia?.categoria
      )

    for (
      const categoria of
        permitidas
    ) {
      categorias.add(
        categoria
      )
    }
  }

  return [
    ...categorias,
  ]
}

// =========================================================
// PROGRAMACIÓN INSTRUCTORES
// =========================================================

async function consultarCargaInstructores(
  supabase,
  personalIds,
  {
    desdeMes,
    hastaMes,
  }
) {
  if (
    !Array.isArray(
      personalIds
    ) ||
    personalIds.length ===
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
        'programacion_clases'
      )
      .select(`
        id,
        instructor_id,
        matricula_id,
        recibo_refuerzo_id,
        vehiculo_id,
        categoria,
        fecha,
        hora_inicio,
        tipo_programacion,
        estado
      `)
      .in(
        'instructor_id',
        personalIds
      )
      .gte(
        'fecha',
        desdeMes
      )
      .lte(
        'fecha',
        hastaMes
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar la carga de los instructores: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =======================================================
// DATOS COMPLEMENTARIOS DE CLASES PARA DISPONIBILIDAD
// =======================================================

async function consultarDatosClasesDisponibilidad(
  supabase,
  clases = []
) {
  const lista =
    Array.isArray(clases)
      ? clases
      : []

  // =====================================================
  // IDS ÚNICOS
  // =====================================================

  const matriculaIds =
    [
      ...new Set(
        lista
          .map(
            item =>
              Number(
                item?.matricula_id
              )
          )
          .filter(
            id =>
              Number.isFinite(id) &&
              id > 0
          )
      ),
    ]

  const reciboIds =
    [
      ...new Set(
        lista
          .map(
            item =>
              Number(
                item?.recibo_refuerzo_id
              )
          )
          .filter(
            id =>
              Number.isFinite(id) &&
              id > 0
          )
      ),
    ]

  const vehiculoIds =
    [
      ...new Set(
        lista
          .map(
            item =>
              Number(
                item?.vehiculo_id
              )
          )
          .filter(
            id =>
              Number.isFinite(id) &&
              id > 0
          )
      ),
    ]

  // =====================================================
  // CONSULTAS
  // =====================================================

  const [
    respuestaAprendices,
    respuestaRecibos,
    respuestaVehiculos,
  ] =
    await Promise.all([
      matriculaIds.length
        ? supabase
            .from(
              'aprendices'
            )
            .select(`
              id,
              tipo_doc,
              documento,
              nombres,
              apellidos,
              celular
            `)
            .in(
              'id',
              matriculaIds
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      reciboIds.length
        ? supabase
            .from(
              'recibos_caja'
            )
            .select(`
              id,
              nombre_cliente,
              tipo_documento_cliente,
              documento_cliente,
              celular_cliente,
              categoria
            `)
            .in(
              'id',
              reciboIds
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      vehiculoIds.length
        ? supabase
            .from(
              'vehiculos'
            )
            .select(`
              id,
              placa,
              tipo_vehiculo
            `)
            .in(
              'id',
              vehiculoIds
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ])

  if (
    respuestaAprendices
      ?.error
  ) {
    throw respuestaAprendices
      .error
  }

  if (
    respuestaRecibos
      ?.error
  ) {
    throw respuestaRecibos
      .error
  }

  if (
    respuestaVehiculos
      ?.error
  ) {
    throw respuestaVehiculos
      .error
  }

  // =====================================================
  // MAPAS
  // =====================================================

  const aprendicesPorId =
    new Map(
      (
        respuestaAprendices
          ?.data ||
        []
      ).map(
        item => [
          Number(
            item.id
          ),
          item,
        ]
      )
    )

  const recibosPorId =
    new Map(
      (
        respuestaRecibos
          ?.data ||
        []
      ).map(
        item => [
          Number(
            item.id
          ),
          item,
        ]
      )
    )

  const vehiculosPorId =
    new Map(
      (
        respuestaVehiculos
          ?.data ||
        []
      ).map(
        item => [
          Number(
            item.id
          ),
          item,
        ]
      )
    )

  return {
    aprendicesPorId,
    recibosPorId,
    vehiculosPorId,
  }
}
// =========================================================
// DISPONIBILIDAD HABITUAL
// =========================================================

async function consultarDisponibilidadHabitual(
  supabase,
  personalIds
) {
  if (
    !Array.isArray(
      personalIds
    ) ||
    personalIds.length ===
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
        'disponibilidad_instructores'
      )
      .select(`
        id,
        personal_id,
        dia_semana,
        hora_inicio,
        hora_fin,
        activo
      `)
      .in(
        'personal_id',
        personalIds
      )
      .eq(
        'activo',
        true
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar la disponibilidad habitual de los instructores: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// DÍA SEMANA
// =========================================================

function obtenerDiaSemana(
  fecha
) {
  const fechaLocal =
    new Date(
      `${fecha}T12:00:00-05:00`
    )

  const dia =
    fechaLocal.getDay()

  return dia ===
    0
    ? 7
    : dia
}

// =========================================================
// VALIDAR DISPONIBILIDAD HABITUAL
// =========================================================

function instructorDisponiblePorHorario({
  instructorId,
  fecha,
  hora,
  disponibilidades,
}) {
  // =======================================================
  // SIN HORA:
  // Estamos precargando el catálogo.
  // =======================================================

  if (
    !hora
  ) {
    return true
  }

  const registros =
    (
      Array.isArray(
        disponibilidades
      )
        ? disponibilidades
        : []
    ).filter(
      item =>
        Number(
          item?.personal_id
        ) ===
        Number(
          instructorId
        )
    )

  // =======================================================
  // SI NO TIENE DISPONIBILIDAD PARAMETRIZADA
  // SE USA LA JORNADA GENERAL
  // =======================================================

  if (
    registros.length ===
    0
  ) {
    return horarioPermitido(
      hora
    )
  }

  const diaSemana =
    obtenerDiaSemana(
      fecha
    )

  const horaClase =
    horaNormalizada(
      hora
    )

  return registros.some(
    item => {
      if (
        Number(
          item?.dia_semana
        ) !==
        diaSemana
      ) {
        return false
      }

      const inicio =
        horaNormalizada(
          item?.hora_inicio
        )

      const fin =
        horaNormalizada(
          item?.hora_fin
        )

      return (
        horaClase >=
          inicio &&
        horaClase <
          fin
      )
    }
  )
}

// =========================================================
// CONSTRUIR INSTRUCTORES
// =========================================================
//
// REGLAS:
//
// CURSO_VIGENTE
// - máximo 10 clases por día.
// - máximo 240 horas por mes.
// - cada clase válida consume 1 hora.
//
// REFUERZO
// - no tiene límite diario de 10.
// - no consume las 240 horas mensuales.
// - sí ocupa horario.
//
// =========================================================

function construirInstructores({
  personal,
  licenciasPorPersonal,
  programacion,
  disponibilidades,
  categoria,
  fecha,
  hora,
  tipoProgramacion,
}) {
  const resultado =
    []

  for (
    const instructor of
      Array.isArray(
        personal
      )
        ? personal
        : []
  ) {
    const instructorId =
      Number(
        instructor?.id
      )

    if (
      !instructorId
    ) {
      continue
    }

    // =====================================================
    // DOCUMENTACIÓN
    // =====================================================

    const evaluacionDocumental =
      evaluarDocumentacionInstructor({
        licencias:
          licenciasPorPersonal.get(
            instructorId
          ) ||
          [],

        categoria,

        fechaReferencia:
          fecha,
      })

    // =====================================================
    // NO LISTAR PERSONAL NO HABILITADO
    // =====================================================

    if (
      !evaluacionDocumental.valido
    ) {
      continue
    }

    // =====================================================
    // CATEGORÍAS QUE PUEDE DICTAR
    // =====================================================

    const categoriasHabilitadas =
      obtenerCategoriasHabilitadasInstructor(
        evaluacionDocumental
          ?.licencias_instructor_vigentes ||
        []
      )

    // =====================================================
    // PROGRAMACIÓN DEL INSTRUCTOR
    // =====================================================

    const clasesInstructor =
      (
        Array.isArray(
          programacion
        )
          ? programacion
          : []
      ).filter(
        item =>
          Number(
            item?.instructor_id
          ) ===
          instructorId
      )

    // =====================================================
    // HORAS MES DE CURSO VIGENTE
    //
    // REFUERZO NO CONSUME HORAS.
    // =====================================================

    const horasMesCurso =
      clasesInstructor.filter(
        item =>
          item
            ?.tipo_programacion ===
            'CURSO_VIGENTE' &&
          ESTADOS_QUE_CONSUMEN_HORAS.includes(
            item?.estado
          )
      ).length

    // =====================================================
    // CLASES DEL DÍA
    // =====================================================

    const clasesDia =
      clasesInstructor.filter(
        item =>
          item?.fecha ===
            fecha &&
          ESTADOS_QUE_OCUPAN_HORARIO.includes(
            item?.estado
          )
      )

    const clasesCursoDia =
      clasesDia.filter(
        item =>
          item
            ?.tipo_programacion ===
          'CURSO_VIGENTE'
      ).length

    const refuerzosDia =
      clasesDia.filter(
        item =>
          item
            ?.tipo_programacion ===
          'REFUERZO'
      ).length

    // =====================================================
    // OCUPACIÓN DEL HORARIO
    // =====================================================

    const ocupadoHorario =
      hora
        ? clasesDia.some(
            item =>
              horaNormalizada(
                item?.hora_inicio
              ) ===
              horaNormalizada(
                hora
              )
          )
        : false

    // =====================================================
    // DISPONIBILIDAD HABITUAL
    // =====================================================

    const disponibleHabitual =
      instructorDisponiblePorHorario({
        instructorId,

        fecha,

        hora,

        disponibilidades,
      })

    // =====================================================
    // HORAS DISPONIBLES DEL MES
    // =====================================================

    const horasDisponiblesMes =
      Math.max(
        0,
        MAX_HORAS_INSTRUCTOR_MES -
          horasMesCurso
      )

    let disponible =
      !ocupadoHorario &&
      disponibleHabitual

    let motivoNoDisponible =
      ''

    // =====================================================
    // CRUCE HORARIO
    // =====================================================

    if (
      ocupadoHorario
    ) {
      disponible =
        false

      motivoNoDisponible =
        'El instructor ya tiene una clase programada en este horario.'
    } else if (
      !disponibleHabitual
    ) {
      disponible =
        false

      motivoNoDisponible =
        'El instructor no está disponible en este horario.'
    }

    // =====================================================
    // REGLAS CURSO VIGENTE
    // =====================================================

    if (
      tipoProgramacion ===
      'CURSO_VIGENTE'
    ) {
      if (
        clasesCursoDia >=
        MAX_CLASES_INSTRUCTOR_DIA_CURSO
      ) {
        disponible =
          false

        motivoNoDisponible =
          'El instructor ya completó las 10 clases de curso vigente permitidas para este día.'
      } else if (
        horasMesCurso >=
        MAX_HORAS_INSTRUCTOR_MES
      ) {
        disponible =
          false

        motivoNoDisponible =
          'El instructor ya completó las 240 horas mensuales de curso vigente.'
      }
    }

    // =====================================================
    // RESPUESTA
    // =====================================================

    resultado.push({
      ...instructor,

      nombre_completo:
        nombreCompleto(
          instructor
        ),

      categorias_habilitadas:
        categoriasHabilitadas,

      licencia_instructor: {
        categoria:
          evaluacionDocumental
            ?.licencia_instructor
            ?.categoria ||
          '',

        vigencia:
          evaluacionDocumental
            ?.licencia_instructor
            ?.vigencia ||
          null,

        numero_certificado:
          evaluacionDocumental
            ?.licencia_instructor
            ?.numero_certificado ||
          '',
      },

      licencia_conduccion: {
        categoria:
          evaluacionDocumental
            ?.licencia_conduccion
            ?.categoria ||
          '',

        vigencia:
          evaluacionDocumental
            ?.licencia_conduccion
            ?.vigencia ||
          null,
      },

      documentacion_vigente:
        true,

      // ===================================================
      // CONTROL MENSUAL
      // ===================================================

      horas_mes_curso_vigente:
        horasMesCurso,

      limite_horas_mes:
        MAX_HORAS_INSTRUCTOR_MES,

      horas_disponibles_mes:
        horasDisponiblesMes,

      // ===================================================
      // CONTROL DIARIO
      // ===================================================

      clases_curso_vigente_dia:
        clasesCursoDia,

      limite_clases_curso_dia:
        MAX_CLASES_INSTRUCTOR_DIA_CURSO,

      clases_curso_disponibles_dia:
        Math.max(
          0,
          MAX_CLASES_INSTRUCTOR_DIA_CURSO -
            clasesCursoDia
        ),

      // ===================================================
      // REFUERZOS
      // ===================================================

      refuerzos_dia:
        refuerzosDia,

      refuerzo_consume_horas:
        false,

      // ===================================================
      // TOTAL DÍA
      // ===================================================

      total_clases_dia:
        clasesDia.length,

      // ===================================================
      // DISPONIBILIDAD
      // ===================================================

      ocupado_horario:
        ocupadoHorario,

      disponible_horario_habitual:
        disponibleHabitual,

      disponible,

      motivo_no_disponible:
        motivoNoDisponible,
    })
  }

  // =======================================================
  // ORDEN
  //
  // Primero disponibles.
  // Después por nombre.
  // =======================================================

  return resultado.sort(
    (
      a,
      b
    ) => {
      if (
        a.disponible !==
        b.disponible
      ) {
        return a.disponible
          ? -1
          : 1
      }

      return texto(
        a?.nombre_completo
      ).localeCompare(
        texto(
          b?.nombre_completo
        ),
        'es'
      )
    }
  )
}

async function construirDisponibilidadDiariaInstructores({
  supabase,
  personal,
  licenciasPorPersonal,
  programacion,
  disponibilidades,
  fecha,
  categoria,
  tipoProgramacion,
}) {
  const horarios =
    construirHorariosJornada()

  const resultado =
    []

  // =======================================================
  // DATOS COMPLEMENTARIOS DE LAS CLASES
  //
  // Se consultan utilizando el mismo Supabase de la empresa
  // actualmente resuelta por el request.
  // =======================================================

  const {
    aprendicesPorId,
    recibosPorId,
    vehiculosPorId,
  } =
    await consultarDatosClasesDisponibilidad(
      supabase,
      programacion
    )

  for (
  const instructor of
    Array.isArray(
      personal
    )
      ? personal
      : []
) {
  const instructorId =
    Number(
      instructor?.id
    )

  if (
    !instructorId
  ) {
    continue
  }

  // =====================================================
  // DOCUMENTACIÓN DEL INSTRUCTOR
  // =====================================================

  const evaluacionDocumental =
    evaluarDocumentacionInstructor({        licencias:
          licenciasPorPersonal.get(
            instructorId
          ) ||
          [],

        categoria:
          categoria ||
          '',

        fechaReferencia:
          fecha,
      })

    if (
      !evaluacionDocumental.valido
    ) {
      continue
    }

    // =====================================================
    // CATEGORÍAS HABILITADAS
    // =====================================================

    const categoriasHabilitadas =
      obtenerCategoriasHabilitadasInstructor(
        evaluacionDocumental
          ?.licencias_instructor_vigentes ||
        []
      )

    // =====================================================
    // TODA LA PROGRAMACIÓN DEL INSTRUCTOR EN EL MES
    // =====================================================

    const clasesInstructor =
      (
        Array.isArray(
          programacion
        )
          ? programacion
          : []
      ).filter(
        item =>
          Number(
            item?.instructor_id
          ) ===
          instructorId
      )

    // =====================================================
    // HORAS DEL MES
    //
    // Solamente CURSO_VIGENTE consume las 240 horas.
    // =====================================================

    const horasMesCurso =
      clasesInstructor.filter(
        item =>
          item
            ?.tipo_programacion ===
            'CURSO_VIGENTE' &&
          ESTADOS_QUE_CONSUMEN_HORAS.includes(
            item?.estado
          )
      ).length

    // =====================================================
    // CLASES DEL DÍA
    // =====================================================

    const clasesDia =
      clasesInstructor.filter(
        item =>
          item?.fecha ===
            fecha &&
          ESTADOS_QUE_OCUPAN_HORARIO.includes(
            item?.estado
          )
      )

    const clasesCursoDia =
      clasesDia.filter(
        item =>
          item
            ?.tipo_programacion ===
          'CURSO_VIGENTE'
      ).length

    const refuerzosDia =
      clasesDia.filter(
        item =>
          item
            ?.tipo_programacion ===
          'REFUERZO'
      ).length

    // =====================================================
    // CONSTRUIR CADA HORARIO
    // =====================================================

    const detalleHorarios =
      horarios.map(
        hora => {
          // =================================================
          // CLASE QUE OCUPA EL HORARIO
          // =================================================

          const clase =
            clasesDia.find(
              item =>
                horaNormalizada(
                  item?.hora_inicio
                ) ===
                hora
            ) ||
            null

          // =================================================
          // OCUPADO
          // =================================================

          if (
            clase
          ) {
            const aprendiz =
              clase?.matricula_id
                ? aprendicesPorId?.get(
                    Number(
                      clase.matricula_id
                    )
                  )
                : null

            const reciboRefuerzo =
              clase?.recibo_refuerzo_id
                ? recibosPorId?.get(
                    Number(
                      clase.recibo_refuerzo_id
                    )
                  )
                : null

            const vehiculo =
              clase?.vehiculo_id
                ? vehiculosPorId?.get(
                    Number(
                      clase.vehiculo_id
                    )
                  )
                : null

            const esRefuerzo =
              clase
                ?.tipo_programacion ===
              'REFUERZO'

            const nombrePersona =
              esRefuerzo
                ? mayusculas(
                    reciboRefuerzo
                      ?.nombre_cliente ||
                    'CLIENTE REFUERZO'
                  )
                : mayusculas(
                    nombreCompleto(
                      aprendiz
                    ) ||
                    'APRENDIZ'
                  )

            const tipoDocumento =
              esRefuerzo
                ? mayusculas(
                    reciboRefuerzo
                      ?.tipo_documento_cliente ||
                    ''
                  )
                : mayusculas(
                    aprendiz
                      ?.tipo_doc ||
                    ''
                  )

            const documento =
              esRefuerzo
                ? texto(
                    reciboRefuerzo
                      ?.documento_cliente
                  )
                : texto(
                    aprendiz
                      ?.documento
                  )

            const celular =
              esRefuerzo
                ? texto(
                    reciboRefuerzo
                      ?.celular_cliente
                  )
                : texto(
                    aprendiz
                      ?.celular
                  )

            return {
              hora,

              estado:
                'OCUPADO',

              disponible:
                false,

              motivo:
                'El instructor ya tiene una clase programada.',

              clase: {
                id:
                  clase?.id ||
                  null,

                matricula_id:
                  clase?.matricula_id ||
                  null,

                recibo_refuerzo_id:
                  clase?.recibo_refuerzo_id ||
                  null,

                vehiculo_id:
                  clase?.vehiculo_id ||
                  null,

                categoria:
                  clase?.categoria ||
                  '',

                tipo_programacion:
                  clase?.tipo_programacion ||
                  '',

                estado:
                  clase?.estado ||
                  '',

                persona: {
                  nombre:
                    nombrePersona,

                  tipo_documento:
                    tipoDocumento,

                  documento,

                  celular,
                },

                vehiculo: {
                  id:
                    vehiculo?.id ||
                    null,

                  placa:
                    mayusculas(
                      vehiculo
                        ?.placa ||
                      ''
                    ),

                  tipo:
                    mayusculas(
                      vehiculo
                        ?.tipo_vehiculo ||
                      ''
                    ),
                },
              },
            }
          }

          // =================================================
          // DISPONIBILIDAD HABITUAL
          // =================================================

          const disponibleHabitual =
            instructorDisponiblePorHorario({
              instructorId,

              fecha,

              hora,

              disponibilidades,
            })

          if (
            !disponibleHabitual
          ) {
            return {
              hora,

              estado:
                'NO_HABILITADO',

              disponible:
                false,

              motivo:
                'Fuera de la disponibilidad habitual del instructor.',

              clase:
                null,
            }
          }

          // =================================================
          // LÍMITE CURSO VIGENTE
          // =================================================

          if (
            tipoProgramacion ===
              'CURSO_VIGENTE' &&
            clasesCursoDia >=
              MAX_CLASES_INSTRUCTOR_DIA_CURSO
          ) {
            return {
              hora,

              estado:
                'NO_HABILITADO',

              disponible:
                false,

              motivo:
                'El instructor completó el límite diario de clases de curso vigente.',

              clase:
                null,
            }
          }

          // =================================================
          // LÍMITE MENSUAL
          // =================================================

          if (
            tipoProgramacion ===
              'CURSO_VIGENTE' &&
            horasMesCurso >=
              MAX_HORAS_INSTRUCTOR_MES
          ) {
            return {
              hora,

              estado:
                'NO_HABILITADO',

              disponible:
                false,

              motivo:
                'El instructor completó el límite mensual de horas de curso vigente.',

              clase:
                null,
            }
          }

          // =================================================
          // DISPONIBLE
          // =================================================

          return {
            hora,

            estado:
              'DISPONIBLE',

            disponible:
              true,

            motivo:
              '',

            clase:
              null,
          }
        }
      )

    // =====================================================
    // TOTALES DE DISPONIBILIDAD
    // =====================================================

    const horariosDisponibles =
      detalleHorarios.filter(
        item =>
          item?.disponible
      ).length

    const horariosOcupados =
      detalleHorarios.filter(
        item =>
          item?.estado ===
          'OCUPADO'
      ).length

    // =====================================================
    // RESPUESTA INSTRUCTOR
    // =====================================================

    resultado.push({
      id:
        instructorId,

      documento:
        instructor?.documento ||
        '',

      nombres:
        instructor?.nombres ||
        '',

      apellidos:
        instructor?.apellidos ||
        '',

      nombre_completo:
        nombreCompleto(
          instructor
        ),

      telefono:
        instructor?.telefono ||
        '',

      categorias_habilitadas:
        categoriasHabilitadas,

      documentacion_vigente:
        true,

      clases_curso_vigente_dia:
        clasesCursoDia,

      refuerzos_dia:
        refuerzosDia,

      total_clases_dia:
        clasesDia.length,

      horas_mes_curso_vigente:
        horasMesCurso,

      limite_horas_mes:
        MAX_HORAS_INSTRUCTOR_MES,

      horas_disponibles_mes:
        Math.max(
          0,
          MAX_HORAS_INSTRUCTOR_MES -
            horasMesCurso
        ),

      limite_clases_curso_dia:
        MAX_CLASES_INSTRUCTOR_DIA_CURSO,

      horarios_disponibles:
        horariosDisponibles,

      horarios_ocupados:
        horariosOcupados,

      horarios:
        detalleHorarios,
    })
  }

  // =======================================================
// ORDEN POR DISPONIBILIDAD
//
// 1. Mayor cantidad de horarios disponibles.
// 2. Menor cantidad de clases del día.
// 3. Menor carga mensual.
// 4. Nombre.
//
// =======================================================

return resultado.sort(
  (
    a,
    b
  ) => {
    // =====================================================
    // MÁS HORARIOS DISPONIBLES PRIMERO
    // =====================================================

    if (
      a.horarios_disponibles !==
      b.horarios_disponibles
    ) {
      return (
        b.horarios_disponibles -
        a.horarios_disponibles
      )
    }

    // =====================================================
    // MENOR CARGA DEL DÍA
    // =====================================================

    if (
      a.total_clases_dia !==
      b.total_clases_dia
    ) {
      return (
        a.total_clases_dia -
        b.total_clases_dia
      )
    }

    // =====================================================
    // MENOR CARGA MENSUAL
    // =====================================================

    if (
      a.horas_mes_curso_vigente !==
      b.horas_mes_curso_vigente
    ) {
      return (
        a.horas_mes_curso_vigente -
        b.horas_mes_curso_vigente
      )
    }

    // =====================================================
    // NOMBRE
    // =====================================================

    return texto(
      a?.nombre_completo
    ).localeCompare(
      texto(
        b?.nombre_completo
      ),
      'es'
    )
  }
)
}

// =========================================================
// CONSULTAR VEHÍCULOS ACTIVOS
// =========================================================

async function consultarVehiculosActivos(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'vehiculos'
      )
      .select(`
        id,
        placa,
        tipo_vehiculo,
        marca,
        linea,
        modelo,
        estado,
        numero_licencia_transito,
        numero_tarjeta_servicio,
        fecha_vigencia_tarjeta_servicio
      `)
      .order(
        'placa',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los vehículos: ${error.message}`
    )
  }

  return (
    Array.isArray(
      data
    )
      ? data
      : []
  ).filter(
    vehiculo =>
      normalizarTexto(
        vehiculo?.estado
      ) ===
      'ACTIVO'
  )
}

// =========================================================
// CONSULTAR DOCUMENTOS VEHÍCULOS
// =========================================================

async function consultarDocumentosVehiculos(
  supabase,
  vehiculoIds
) {
  if (
    !Array.isArray(
      vehiculoIds
    ) ||
    vehiculoIds.length ===
      0
  ) {
    return []
  }

  const ids =
    [
      ...new Set(
        vehiculoIds
          .map(
            Number
          )
          .filter(
            Boolean
          )
      ),
    ]

  if (
    ids.length ===
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
        'vencimientos_vehiculos'
      )
      .select(`
        id,
        vehiculo_id,
        placa,
        documento,
        numero_documento,
        fecha_expedicion,
        fecha_vigencia,
        fecha_actualizacion,
        estado,
        created_at
      `)
      .in(
        'vehiculo_id',
        ids
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
    throw new Error(
      `No fue posible consultar los documentos de los vehículos: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// FECHA COMPARACIÓN DOCUMENTO
// =========================================================

function fechaOrdenDocumento(
  registro
) {
  return (
    texto(
      registro?.fecha_actualizacion
    ) ||
    texto(
      registro?.created_at
    ) ||
    texto(
      registro?.fecha_expedicion
    ) ||
    ''
  )
}

// =========================================================
// ÚLTIMO DOCUMENTO POR TIPO
// =========================================================
//
// En vencimientos_vehiculos puede existir historial.
//
// Solo evaluamos el registro más reciente de cada tipo
// de documento.
//
// =========================================================

function obtenerUltimosDocumentosVehiculo(
  documentos
) {
  const mapa =
    new Map()

  for (
    const registro of
      Array.isArray(
        documentos
      )
        ? documentos
        : []
  ) {
    const tipo =
      normalizarTexto(
        registro?.documento
      )

    if (
      !tipo
    ) {
      continue
    }

    const existente =
      mapa.get(
        tipo
      )

    if (
      !existente
    ) {
      mapa.set(
        tipo,
        registro
      )

      continue
    }

    const fechaActual =
      fechaOrdenDocumento(
        registro
      )

    const fechaExistente =
      fechaOrdenDocumento(
        existente
      )

    if (
      fechaActual >
      fechaExistente
    ) {
      mapa.set(
        tipo,
        registro
      )

      continue
    }

    if (
      fechaActual ===
        fechaExistente &&
      Number(
        registro?.id
      ) >
        Number(
          existente?.id
        )
    ) {
      mapa.set(
        tipo,
        registro
      )
    }
  }

  return [
    ...mapa.values(),
  ]
}

// =========================================================
// EVALUAR DOCUMENTACIÓN VEHÍCULO
// =========================================================
//
// Reglas:
//
// - Debe existir documentación registrada.
// - Se toma el último registro de cada tipo.
// - Cada documento debe tener fecha_vigencia válida.
// - Debe estar vigente para la fecha de la clase.
// - Si estado = VENCIDO / INACTIVO se bloquea.
//
// =========================================================

function evaluarDocumentacionVehiculo({
  documentos,
  fechaReferencia,
}) {
  const ultimos =
    obtenerUltimosDocumentosVehiculo(
      documentos
    )

  if (
    ultimos.length ===
    0
  ) {
    return {
      valido:
        false,

      motivo:
        'El vehículo no tiene documentación de vigencias registrada.',

      documentos:
        [],
    }
  }

  const evaluados =
    ultimos.map(
      registro => {
        const vigencia =
          texto(
            registro?.fecha_vigencia
          ).slice(
            0,
            10
          )

        const estado =
          normalizarTexto(
            registro?.estado
          )

        const estadoBloqueado =
          [
            'VENCIDO',
            'VENCIDA',
            'INACTIVO',
            'INACTIVA',
          ].includes(
            estado
          )

        const vigente =
          Boolean(
            vigencia &&
            fechaValida(
              vigencia
            ) &&
            vigencia >=
              fechaReferencia &&
            !estadoBloqueado
          )

        return {
          ...registro,

          vigente,
        }
      }
    )

  const vencidos =
    evaluados.filter(
      item =>
        !item?.vigente
    )

  if (
    vencidos.length >
    0
  ) {
    const primero =
      vencidos[0]

    const documento =
      texto(
        primero?.documento
      ) ||
      'Documento'

    const vigencia =
      texto(
        primero?.fecha_vigencia
      )

    return {
      valido:
        false,

      motivo:
        vigencia
          ? `${documento} vencido o no vigente para la fecha seleccionada (${vigencia}).`
          : `${documento} no tiene fecha de vigencia registrada.`,

      documentos:
        evaluados,
    }
  }

  return {
    valido:
      true,

    motivo:
      '',

    documentos:
      evaluados,
  }
}

// =========================================================
// AGRUPAR DOCUMENTOS VEHÍCULO
// =========================================================

function agruparDocumentosVehiculo(
  documentos
) {
  const mapa =
    new Map()

  for (
    const documento of
      Array.isArray(
        documentos
      )
        ? documentos
        : []
  ) {
    const vehiculoId =
      Number(
        documento?.vehiculo_id
      )

    if (
      !vehiculoId
    ) {
      continue
    }

    if (
      !mapa.has(
        vehiculoId
      )
    ) {
      mapa.set(
        vehiculoId,
        []
      )
    }

    mapa
      .get(
        vehiculoId
      )
      .push(
        documento
      )
  }

  return mapa
}

// =========================================================
// OCUPACIÓN VEHÍCULOS
// =========================================================

async function consultarVehiculosOcupados(
  supabase,
  vehiculoIds,
  fecha
) {
  if (
    !Array.isArray(
      vehiculoIds
    ) ||
    vehiculoIds.length ===
      0 ||
    !fecha
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'programacion_clases'
      )
      .select(`
        id,
        vehiculo_id,
        fecha,
        hora_inicio,
        estado,
        matricula_id,
        recibo_refuerzo_id,
        instructor_id,
        tipo_programacion,
        categoria
      `)
      .in(
        'vehiculo_id',
        vehiculoIds
      )
      .eq(
        'fecha',
        fecha
      )
      .in(
        'estado',
        ESTADOS_QUE_OCUPAN_HORARIO
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar la ocupación de los vehículos: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// CONSTRUIR VEHÍCULOS DISPONIBLES
// =========================================================
//
// Comportamiento:
//
// SIN categoría:
// - devuelve todos los vehículos activos y documentalmente
//   vigentes.
//
// CON categoría:
// - además filtra por el tipo de vehículo compatible.
//
// CON hora:
// - informa si está ocupado en ese horario.
//
// =========================================================

function construirVehiculos({
  vehiculos,
  documentosPorVehiculo,
  ocupacion,
  categoria,
  fecha,
  hora,
}) {
  const resultado =
    []

  for (
    const vehiculo of
      Array.isArray(
        vehiculos
      )
        ? vehiculos
        : []
  ) {
    const vehiculoId =
      Number(
        vehiculo?.id
      )

    if (
      !vehiculoId
    ) {
      continue
    }

    // =====================================================
    // TIPO DE VEHÍCULO
    // =====================================================

    if (
      categoria &&
      !vehiculoCompatibleCategoria(
        vehiculo,
        categoria
      )
    ) {
      continue
    }

    // =====================================================
    // DOCUMENTACIÓN
    // =====================================================

    const evaluacion =
      evaluarDocumentacionVehiculo({
        documentos:
          documentosPorVehiculo.get(
            vehiculoId
          ) ||
          [],

        fechaReferencia:
          fecha,
      })

    // =====================================================
    // NO LISTAR VEHÍCULOS CON DOCUMENTACIÓN VENCIDA
    // =====================================================

    if (
      !evaluacion.valido
    ) {
      continue
    }

    // =====================================================
    // OCUPACIÓN EXACTA DEL HORARIO
    // =====================================================

    const ocupado =
      hora
        ? (
            Array.isArray(
              ocupacion
            )
              ? ocupacion
              : []
          ).some(
            item =>
              Number(
                item?.vehiculo_id
              ) ===
                vehiculoId &&
              horaNormalizada(
                item?.hora_inicio
              ) ===
                horaNormalizada(
                  hora
                )
          )
        : false

    // =====================================================
    // DESCRIPCIÓN AMIGABLE
    // =====================================================

    const descripcion =
      [
        mayusculas(
          vehiculo?.placa
        ),

        texto(
          vehiculo?.tipo_vehiculo
        ),

        texto(
          vehiculo?.marca
        ),

        texto(
          vehiculo?.linea
        ),

        texto(
          vehiculo?.modelo
        ),
      ]
        .filter(
          Boolean
        )
        .join(
          ' · '
        )

    resultado.push({
      ...vehiculo,

      placa:
        mayusculas(
          vehiculo?.placa
        ),

      tipo_vehiculo_normalizado:
        normalizarTipoVehiculo(
          vehiculo?.tipo_vehiculo
        ),

      descripcion,

      documentacion_vigente:
        true,

      documentos_vigentes:
        evaluacion.documentos,

      disponible:
        !ocupado,

      ocupado_horario:
        ocupado,

      motivo_no_disponible:
        ocupado
          ? 'El vehículo ya está asignado en este horario.'
          : '',
    })
  }

  return resultado.sort(
    (
      a,
      b
    ) => {
      if (
        a.disponible !==
        b.disponible
      ) {
        return a.disponible
          ? -1
          : 1
      }

      return texto(
        a?.placa
      ).localeCompare(
        texto(
          b?.placa
        ),
        'es'
      )
    }
  )
}
// =========================================================
// MOTIVOS NO DICTADA
// =========================================================
//
// Los motivos son parametrizados.
//
// Ejemplos:
//
// APRENDIZ / CLIENTE
// - Aprendiz no se presentó.
// - Aprendiz llegó tarde.
// - Aprendiz canceló sobre tiempo.
//
// INSTRUCTOR
// - Instructor no llegó.
// - Instructor llegó tarde.
//
// El campo responsable se utilizará posteriormente para
// determinar si una clase de REFUERZO consume o devuelve
// el cupo comprado.
//
// =========================================================

async function consultarMotivosNoDictada(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'motivos_no_dictada'
      )
      .select(`
        id,
        nombre,
        descripcion,
        responsable,
        activo
      `)
      .eq(
        'activo',
        true
      )
      .order(
        'responsable',
        {
          ascending:
            true,
        }
      )
      .order(
        'nombre',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los motivos de clase no dictada: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// NORMALIZAR RESPONSABLE DEL MOTIVO
// =========================================================

function normalizarResponsableMotivo(
  valor
) {
  const responsable =
    normalizarTexto(
      valor
    )
      .replace(
        /\s+/g,
        '_'
      )

  if (
    [
      'APRENDIZ',
      'CLIENTE',
      'ALUMNO',
    ].includes(
      responsable
    )
  ) {
    return 'APRENDIZ'
  }

  if (
    [
      'INSTRUCTOR',
      'DOCENTE',
    ].includes(
      responsable
    )
  ) {
    return 'INSTRUCTOR'
  }

  if (
    [
      'CEA',
      'ADMINISTRACION',
      'ADMINISTRACIÓN',
    ].includes(
      responsable
    )
  ) {
    return 'CEA'
  }

  return responsable ||
    'SIN_DEFINIR'
}

// =========================================================
// MOTIVO DEVUELVE CUPO DE REFUERZO
// =========================================================
//
// Si la clase NO DICTADA fue responsabilidad del
// instructor o del CEA, la clase no debe descontarse del
// saldo comprado por el cliente.
//
// Si fue responsabilidad del aprendiz/cliente, sí se
// considera consumida.
//
// =========================================================

function motivoDevuelveCupoRefuerzo(
  motivo
) {
  const responsable =
    normalizarResponsableMotivo(
      motivo?.responsable
    )

  return [
    'INSTRUCTOR',
    'CEA',
  ].includes(
    responsable
  )
}

// =========================================================
// DETERMINAR SI NO DICTADA CONSUME REFUERZO
// =========================================================

function noDictadaConsumeRefuerzo(
  motivo
) {
  return !motivoDevuelveCupoRefuerzo(
    motivo
  )
}

// =========================================================
// CONSTRUIR MOTIVOS PARA FRONTEND
// =========================================================
//
// Además de devolver el registro original, agregamos:
//
// responsable_normalizado
// consume_refuerzo
// devuelve_refuerzo
//
// Esto permitirá que el modal de Programación pueda
// informar al usuario qué efecto tendrá seleccionar un
// motivo.
//
// =========================================================

function construirMotivosNoDictada(
  motivos
) {
  return (
    Array.isArray(
      motivos
    )
      ? motivos
      : []
  ).map(
    motivo => {
      const responsable =
        normalizarResponsableMotivo(
          motivo?.responsable
        )

      const devuelveRefuerzo =
        motivoDevuelveCupoRefuerzo(
          motivo
        )

      return {
        ...motivo,

        responsable_normalizado:
          responsable,

        devuelve_refuerzo:
          devuelveRefuerzo,

        consume_refuerzo:
          !devuelveRefuerzo,
      }
    }
  )
}

// =========================================================
// CONSULTAR MOTIVOS PREPARADOS
// =========================================================

async function consultarMotivosProgramacion(
  supabase
) {
  const motivos =
    await consultarMotivosNoDictada(
      supabase
    )

  return construirMotivosNoDictada(
    motivos
  )
}
// =========================================================
// GET
// =========================================================

export async function GET(
  request
) {
  try {
    // =====================================================
    // MULTIEMPRESA
    // =====================================================

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
      texto(
        searchParams.get(
          'recurso'
        ) ||
        'inicial'
      ).toLowerCase()

    const tipoProgramacion =
      mayusculas(
        searchParams.get(
          'tipo_programacion'
        ) ||
        'CURSO_VIGENTE'
      )

    // =====================================================
    // VALIDAR TIPO PROGRAMACIÓN
    // =====================================================

    if (
      !TIPOS_PROGRAMACION.has(
        tipoProgramacion
      )
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El tipo de programación no es válido.',
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // INICIAL
    // =====================================================

    if (
      recurso ===
      'inicial'
    ) {
      const motivos =
        await consultarMotivosProgramacion(
          supabase
        )

      return NextResponse.json({
        status:
          'success',

        data: {
          motivos_no_dictada:
            motivos,

          tipos_programacion: [
            {
              value:
                'CURSO_VIGENTE',

              label:
                'Curso vigente',
            },

            {
              value:
                'REFUERZO',

              label:
                'Refuerzo',
            },
          ],

          estados_clase: [
            'AGENDADA',
            'PENDIENTE_CARGUE',
            'DICTADA',
            'NO_DICTADA',
            'CANCELADA',
          ],

          horario: {
            desde:
              HORA_INICIO_JORNADA,

            hasta:
              '22:00',

            ultima_clase:
              HORA_ULTIMA_CLASE,
          },

          reglas: {
            max_clases_aprendiz_dia:
              MAX_CLASES_APRENDIZ_DIA,

            max_clases_instructor_dia_curso:
              MAX_CLASES_INSTRUCTOR_DIA_CURSO,

            max_horas_instructor_mes:
              MAX_HORAS_INSTRUCTOR_MES,

            refuerzo_consume_horas:
              false,

            refuerzo_limite_diario_instructor:
              false,

            requiere_instructor_compatible:
              true,

            requiere_vehiculo_compatible:
              true,

            requiere_documentacion_vigente:
              true,
          },
        },

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // BUSCAR PERSONAS PROGRAMABLES
    // =====================================================
    //
    // Este es el recurso recomendado para page.jsx.
    //
    // CURSO_VIGENTE:
    //   devuelve solamente aprendices.
    //
    // REFUERZO:
    //   devuelve:
    //   - aprendices existentes;
    //   - clientes externos con refuerzo pagado.
    //
    // =====================================================

    if (
      recurso ===
      'personas'
    ) {
      const busqueda =
        texto(
          searchParams.get(
            'busqueda'
          )
        )

      if (
        busqueda.length <
        3
      ) {
        return NextResponse.json({
          status:
            'success',

          data:
            [],

          total:
            0,

          minimo_caracteres:
            3,

          tipo_programacion:
            tipoProgramacion,

          empresa:
            construirEmpresaRespuesta(
              empresa
            ),
        })
      }

      const personas =
        await buscarPersonasProgramables(
          supabase,
          {
            busqueda,
            tipoProgramacion,
          }
        )

      return NextResponse.json({
        status:
          'success',

        data:
          personas,

        total:
          personas.length,

        tipo_programacion:
          tipoProgramacion,

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // BUSCAR APRENDICES
    // =====================================================
    //
    // Se conserva por compatibilidad con page.jsx anterior.
    //
    // El frontend nuevo debería usar recurso=personas.
    //
    // =====================================================

    if (
      recurso ===
      'aprendices'
    ) {
      const busqueda =
        texto(
          searchParams.get(
            'busqueda'
          )
        )

      if (
        busqueda.length <
        3
      ) {
        return NextResponse.json({
          status:
            'success',

          data:
            [],

          total:
            0,

          minimo_caracteres:
            3,

          empresa:
            construirEmpresaRespuesta(
              empresa
            ),
        })
      }

      const aprendices =
        await buscarAprendices(
          supabase,
          {
            busqueda,
            tipoProgramacion,
          }
        )

      return NextResponse.json({
        status:
          'success',

        data:
          aprendices,

        total:
          aprendices.length,

        tipo_programacion:
          tipoProgramacion,

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // DETALLE APRENDIZ
    // =====================================================

    if (
      recurso ===
      'aprendiz'
    ) {
      const matriculaId =
        enteroPositivo(
          searchParams.get(
            'matricula_id'
          )
        )

      const fecha =
        texto(
          searchParams.get(
            'fecha'
          )
        ) ||
        hoyColombia()

      if (
        !matriculaId
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El identificador del aprendiz es obligatorio.',
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
              'La fecha seleccionada no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      const aprendiz =
        await consultarAprendiz(
          supabase,
          {
            matriculaId,

            fecha,

            tipoProgramacion,
          }
        )

      if (
        !aprendiz
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No se encontró el aprendiz solicitado.',
          },
          {
            status:
              404,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        data:
          aprendiz,

        tipo_programacion:
          tipoProgramacion,

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // DETALLE REFUERZO EXTERNO
    // =====================================================
    //
    // Ejemplo:
    //
    // ?recurso=refuerzo
    // &recibo_refuerzo_id=125
    //
    // =====================================================

    if (
      recurso ===
      'refuerzo'
    ) {
      const reciboRefuerzoId =
        enteroPositivo(
          searchParams.get(
            'recibo_refuerzo_id'
          ) ||
          searchParams.get(
            'id'
          )
        )

      if (
        !reciboRefuerzoId
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El recibo de refuerzo es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const refuerzo =
        await consultarRefuerzoExterno(
          supabase,
          reciboRefuerzoId
        )

      if (
        !refuerzo
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No se encontró el refuerzo solicitado o el recibo no está activo.',
          },
          {
            status:
              404,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        data:
          refuerzo,

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // INSTRUCTORES
    // =====================================================
    //
    // categoria ahora es OPCIONAL.
    //
    // Sin categoría:
    //   devuelve todos los instructores documentalmente
    //   habilitados.
    //
    // Con categoría:
    //   devuelve únicamente los compatibles.
    //
    // Esto permite cargar el selector desde que abre
    // Programación.
    //
    // =====================================================

    if (
      recurso ===
      'instructores'
    ) {
      const categoria =
        normalizarCategoriaLicencia(
          searchParams.get(
            'categoria'
          )
        )

      const fecha =
        texto(
          searchParams.get(
            'fecha'
          )
        ) ||
        hoyColombia()

      const hora =
        horaNormalizada(
          searchParams.get(
            'hora'
          )
        )

      // ===================================================
      // FECHA
      // ===================================================

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
              'La fecha seleccionada no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // HORA
      // ===================================================

      if (
        hora &&
        !horarioPermitido(
          hora
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El horario permitido para iniciar clases es de 06:00 a 21:00.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // PERSONAL ACTIVO
      // ===================================================

      const personal =
        await consultarPersonalActivo(
          supabase
        )

      const personalIds =
        personal
          .map(
            item =>
              Number(
                item?.id
              )
          )
          .filter(
            Boolean
          )

      // ===================================================
      // LICENCIAS
      // ===================================================

      const licencias =
        await consultarLicenciasPersonal(
          supabase,
          personalIds
        )

      const licenciasPorPersonal =
        agruparLicenciasPorPersonal(
          licencias
        )

      // ===================================================
      // PREFILTRADO DOCUMENTAL
      // ===================================================

      const personalHabilitado =
        personal.filter(
          instructor => {
            const evaluacion =
              evaluarDocumentacionInstructor({
                licencias:
                  licenciasPorPersonal.get(
                    Number(
                      instructor?.id
                    )
                  ) ||
                  [],

                categoria:
                  categoria ||
                  '',

                fechaReferencia:
                  fecha,
              })

            return evaluacion.valido
          }
        )

      const habilitadosIds =
        personalHabilitado
          .map(
            item =>
              Number(
                item?.id
              )
          )
          .filter(
            Boolean
          )

      // ===================================================
      // RANGO DEL MES
      // ===================================================

      const rangoMes =
        obtenerRangoMes(
          fecha
        )

      // ===================================================
      // CARGA + DISPONIBILIDAD
      // ===================================================

      const [
        programacion,
        disponibilidades,
      ] =
        await Promise.all([
          consultarCargaInstructores(
            supabase,
            habilitadosIds,
            {
              desdeMes:
                rangoMes.desde,

              hastaMes:
                rangoMes.hasta,
            }
          ),

          consultarDisponibilidadHabitual(
            supabase,
            habilitadosIds
          ),
        ])

      // ===================================================
      // CONSTRUIR RESULTADO
      // ===================================================

      const resultado =
        construirInstructores({
          personal:
            personalHabilitado,

          licenciasPorPersonal,

          programacion,

          disponibilidades,

          categoria:
            categoria ||
            '',

          fecha,

          hora,

          tipoProgramacion,
        })

      return NextResponse.json({
        status:
          'success',

        data:
          resultado,

        total:
          resultado.length,

        categoria:
          categoria ||
          null,

        fecha,

        hora:
          hora ||
          null,

        tipo_programacion:
          tipoProgramacion,

        reglas: {
          limite_mensual_curso_vigente:
            MAX_HORAS_INSTRUCTOR_MES,

          limite_diario_curso_vigente:
            MAX_CLASES_INSTRUCTOR_DIA_CURSO,

          refuerzo_consume_horas:
            false,

          refuerzo_tiene_limite_diario:
            false,

          requiere_licencia_instructor:
            true,

          requiere_licencia_conduccion:
            true,

          vigencia_validada_para:
            fecha,
        },

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

// =====================================================
// DISPONIBILIDAD DIARIA DE INSTRUCTORES
// =====================================================
//
// Ejemplo:
//
// ?recurso=disponibilidad_instructores
// &fecha=2026-08-31
// &categoria=B1
// &tipo_programacion=CURSO_VIGENTE
//
// categoria es OPCIONAL.
//
// =====================================================

if (
  recurso ===
  'disponibilidad_instructores'
) {
  const categoria =
    normalizarCategoriaLicencia(
      searchParams.get(
        'categoria'
      )
    )

  const fecha =
    texto(
      searchParams.get(
        'fecha'
      )
    ) ||
    hoyColombia()

  // ===================================================
  // VALIDAR FECHA
  // ===================================================

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
          'La fecha seleccionada no es válida.',
      },
      {
        status:
          400,
      }
    )
  }

  // ===================================================
  // PERSONAL ACTIVO
  // ===================================================

  const personal =
    await consultarPersonalActivo(
      supabase
    )

  const personalIds =
    personal
      .map(
        item =>
          Number(
            item?.id
          )
      )
      .filter(
        Boolean
      )

  // ===================================================
  // LICENCIAS
  // ===================================================

  const licencias =
    await consultarLicenciasPersonal(
      supabase,
      personalIds
    )

  const licenciasPorPersonal =
    agruparLicenciasPorPersonal(
      licencias
    )

  // ===================================================
  // PERSONAL DOCUMENTALMENTE HABILITADO
  // ===================================================

  const personalHabilitado =
    personal.filter(
      instructor => {
        const evaluacion =
          evaluarDocumentacionInstructor({
            licencias:
              licenciasPorPersonal.get(
                Number(
                  instructor?.id
                )
              ) ||
              [],

            categoria:
              categoria ||
              '',

            fechaReferencia:
              fecha,
          })

        return evaluacion.valido
      }
    )

  const habilitadosIds =
    personalHabilitado
      .map(
        item =>
          Number(
            item?.id
          )
      )
      .filter(
        Boolean
      )

  // ===================================================
  // RANGO DEL MES
  // ===================================================

  const rangoMes =
    obtenerRangoMes(
      fecha
    )

  // ===================================================
// PROGRAMACIÓN + DISPONIBILIDAD HABITUAL
// ===================================================

const [
  programacion,
  disponibilidades,
] =
  await Promise.all([
    consultarCargaInstructores(
      supabase,
      habilitadosIds,
      {
        desdeMes:
          rangoMes.desde,

        hastaMes:
          rangoMes.hasta,
      }
    ),

    consultarDisponibilidadHabitual(
      supabase,
      habilitadosIds
    ),
  ])

// ===================================================
// CONSTRUIR MATRIZ
// ===================================================

const resultado =
  await construirDisponibilidadDiariaInstructores({
    supabase,

    personal:
      personalHabilitado,

    licenciasPorPersonal,

    programacion,

    disponibilidades,

    fecha,

    categoria:
      categoria ||
      '',

    tipoProgramacion,
  })

// ===================================================
// RESUMEN GENERAL
// ===================================================

const totalClasesDia =
  resultado.reduce(
    (
      total,
      instructor
    ) =>
      total +
      numero(
        instructor
          ?.total_clases_dia
      ),
    0
  )

const totalHorariosDisponibles =
  resultado.reduce(
    (
      total,
      instructor
    ) =>
      total +
      numero(
        instructor
          ?.horarios_disponibles
      ),
    0
  )
   // ===================================================
  // RESPUESTA
  // ===================================================

  return NextResponse.json({
    status:
      'success',

    data: {
      fecha,

      categoria:
        categoria ||
        null,

      tipo_programacion:
        tipoProgramacion,

      horarios:
        construirHorariosJornada(),

      total_instructores:
        resultado.length,

      total_clases_dia:
        totalClasesDia,

      total_horarios_disponibles:
        totalHorariosDisponibles,

      instructores:
        resultado,
    },

    reglas: {
      jornada_desde:
        HORA_INICIO_JORNADA,

      ultima_clase:
        HORA_ULTIMA_CLASE,

      limite_diario_curso_vigente:
        MAX_CLASES_INSTRUCTOR_DIA_CURSO,

      limite_mensual_curso_vigente:
        MAX_HORAS_INSTRUCTOR_MES,

      refuerzo_consume_horas:
        false,

      orden_por_disponibilidad:
      true,
      },

    empresa:
      construirEmpresaRespuesta(
        empresa
      ),
  })
}

    // =====================================================
    // VEHÍCULOS
    // =====================================================
    //
    // categoria es OPCIONAL.
    //
    // Sin categoría:
    //   precarga todos los vehículos activos con
    //   documentación vigente.
    //
    // Con categoría:
    //   filtra por tipo compatible.
    //
    // Con hora:
    //   informa disponibilidad para ese horario.
    //
    // =====================================================

    if (
      recurso ===
      'vehiculos'
    ) {
      const categoria =
        normalizarCategoriaLicencia(
          searchParams.get(
            'categoria'
          )
        )

      const fecha =
        texto(
          searchParams.get(
            'fecha'
          )
        ) ||
        hoyColombia()

      const hora =
        horaNormalizada(
          searchParams.get(
            'hora'
          )
        )

      // ===================================================
      // FECHA
      // ===================================================

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
              'La fecha seleccionada no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // HORA
      // ===================================================

      if (
        hora &&
        !horarioPermitido(
          hora
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El horario permitido para iniciar clases es de 06:00 a 21:00.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // VEHÍCULOS ACTIVOS
      // ===================================================

      const vehiculos =
        await consultarVehiculosActivos(
          supabase
        )

      const vehiculoIds =
        vehiculos
          .map(
            item =>
              Number(
                item?.id
              )
          )
          .filter(
            Boolean
          )

      // ===================================================
      // DOCUMENTACIÓN
      // ===================================================

      const documentos =
        await consultarDocumentosVehiculos(
          supabase,
          vehiculoIds
        )

      const documentosPorVehiculo =
        agruparDocumentosVehiculo(
          documentos
        )

      // ===================================================
      // OCUPACIÓN DEL DÍA
      // ===================================================

      const ocupacion =
        await consultarVehiculosOcupados(
          supabase,
          vehiculoIds,
          fecha
        )

      // ===================================================
      // CONSTRUIR RESULTADO
      // ===================================================

      const resultado =
        construirVehiculos({
          vehiculos,

          documentosPorVehiculo,

          ocupacion,

          categoria:
            categoria ||
            '',

          fecha,

          hora,
        })

      return NextResponse.json({
        status:
          'success',

        data:
          resultado,

        total:
          resultado.length,

        categoria:
          categoria ||
          null,

        fecha,

        hora:
          hora ||
          null,

        reglas: {
          requiere_estado_activo:
            true,

          requiere_documentacion_vigente:
            true,

          filtra_tipo_por_categoria:
            Boolean(
              categoria
            ),

          vigencia_validada_para:
            fecha,
        },

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // MOTIVOS NO DICTADA
    // =====================================================

    if (
      recurso ===
      'motivos'
    ) {
      const motivos =
        await consultarMotivosProgramacion(
          supabase
        )

      return NextResponse.json({
        status:
          'success',

        data:
          motivos,

        total:
          motivos.length,

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // RECURSO INVÁLIDO
    // =====================================================

    return NextResponse.json(
      {
        status:
          'error',

        message:
          'El recurso solicitado no es válido.',
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
      'Error GET /api/admin/programacion/catalogos:',
      error
    )

    return respuestaError(
      error
    )
  }
}