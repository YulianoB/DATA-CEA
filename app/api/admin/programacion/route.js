// app/api/admin/programacion/route.js

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

const TIPOS_PROGRAMACION_VALIDOS =
  new Set([
    'CURSO_VIGENTE',
    'REFUERZO',
  ])

const ESTADOS_CLASE_VALIDOS =
  new Set([
    'AGENDADA',
    'PENDIENTE_CARGUE',
    'DICTADA',
    'NO_DICTADA',
    'CANCELADA',
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
// HELPERS
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

function normalizarHora(
  valor
) {
  return texto(
    valor
  ).slice(
    0,
    5
  )
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

function normalizarTipoLicencia(
  valor
) {
  return normalizarTexto(
    valor
  ).replace(
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

function ahoraIso() {
  return new Date()
    .toISOString()
}

// =========================================================
// FECHA Y HORA COLOMBIA
// =========================================================

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

function horaActualColombia() {
  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone:
        'America/Bogota',

      hour:
        '2-digit',

      minute:
        '2-digit',

      hour12:
        false,
    }
  ).format(
    new Date()
  )
}

// =========================================================
// CLASE FUTURA PARA CAMBIO DE ESTADO
// =========================================================
//
// Una clase AGENDADA que todavía no ha iniciado:
//
// - NO puede marcarse DICTADA.
// - NO puede marcarse PENDIENTE_CARGUE.
// - NO puede marcarse NO_DICTADA.
//
// Únicamente puede CANCELARSE.
//
// La hora actual sí puede administrarse.
//
// =========================================================

function claseFuturaParaCambioEstado(
  fecha,
  horaInicio
) {
  const fechaClase =
    texto(
      fecha
    ).slice(
      0,
      10
    )

  const horaClase =
    normalizarHora(
      horaInicio
    )

  const hoy =
    hoyColombia()

  if (
    fechaClase >
    hoy
  ) {
    return true
  }

  if (
    fechaClase <
    hoy
  ) {
    return false
  }

  const ahora =
    horaActualColombia()

  return horaClase >
    ahora
}

// =========================================================
// HORA FIN DE UNA CLASE
// =========================================================
//
// Cada clase práctica dura una hora.
//
// Ejemplo:
//
// 07:00 -> finaliza 08:00
// 21:00 -> finaliza 22:00
//
// =========================================================

function calcularHoraFinClase(
  horaInicio
) {
  const hora =
    normalizarHora(
      horaInicio
    )

  if (
    !horaValida(
      hora
    )
  ) {
    return ''
  }

  const horaNumero =
    Number(
      hora.slice(
        0,
        2
      )
    )

  const minutos =
    hora.slice(
      3,
      5
    )

  return `${String(
    horaNumero + 1
  ).padStart(
    2,
    '0'
  )}:${minutos}`
}

// =========================================================
// VALIDAR SI HORARIO YA VENCIÓ
// =========================================================
//
// REGLA OPERATIVA:
//
// La franja puede programarse mientras la hora de clase
// todavía se encuentre en curso.
//
// Ejemplo:
//
// Hora actual: 07:30
//
// 06:00 -> vencida
// 07:00 -> todavía programable
// 08:00 -> programable
//
// Hora actual: 08:00
//
// 07:00 -> ya vencida
//
// =========================================================

function horarioProgramacionVencido(
  fecha,
  horaInicio
) {
  const hoy =
    hoyColombia()

  if (
    fecha <
    hoy
  ) {
    return true
  }

  if (
    fecha >
    hoy
  ) {
    return false
  }

  const horaFin =
    calcularHoraFinClase(
      horaInicio
    )

  if (
    !horaFin
  ) {
    return true
  }

  const ahora =
    horaActualColombia()

  return horaFin <=
    ahora
}

// =========================================================
// VALIDAR FECHA/HORA PARA NUEVA PROGRAMACIÓN
// =========================================================

function validarFechaHoraNuevaProgramacion(
  fecha,
  horaInicio
) {
  if (
    !fechaValida(
      fecha
    )
  ) {
    throw new Error(
      'Seleccione una fecha válida.'
    )
  }

  if (
    !horaProgramable(
      horaInicio
    )
  ) {
    throw new Error(
      'El horario permitido para iniciar clases es de 06:00 a 21:00.'
    )
  }

  if (
    horarioProgramacionVencido(
      fecha,
      horaInicio
    )
  ) {
    throw new Error(
      'No es posible programar una clase cuya franja horaria ya terminó.'
    )
  }
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
// HORARIO
// =========================================================

function horaProgramable(
  hora
) {
  const valor =
    normalizarHora(
      hora
    )

  return (
    horaValida(
      valor
    ) &&
    valor >=
      HORA_INICIO_JORNADA &&
    valor <=
      HORA_ULTIMA_CLASE
  )
}

// =========================================================
// MATRIZ LICENCIAS INSTRUCTOR
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

function licenciaInstructorPermiteCategoria(
  licencia,
  categoria
) {
  return categoriasPermitidasLicenciaInstructor(
    licencia?.categoria
  ).includes(
    normalizarCategoriaLicencia(
      categoria
    )
  )
}

// =========================================================
// MATRIZ VEHÍCULOS
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

function vehiculoCompatibleCategoria(
  vehiculo,
  categoria
) {
  const permitidos =
    tiposVehiculoPermitidosCategoria(
      categoria
    )

  const tipo =
    normalizarTipoVehiculo(
      vehiculo?.tipo_vehiculo
    )

  return permitidos.includes(
    tipo
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

  return Boolean(
    vigencia &&
    fechaValida(
      vigencia
    ) &&
    vigencia >=
      fechaReferencia
  )
}

// =========================================================
// CONSULTAR APRENDIZ
// =========================================================

async function consultarAprendiz(
  supabase,
  matriculaId
) {
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

  return data
}

// =========================================================
// VALIDAR PAZ Y SALVO
// =========================================================

async function aprendizEstaPazYSalvo(
  supabase,
  documento
) {
  const documentoNormalizado =
    normalizarDocumento(
      documento
    )

  if (
    !documentoNormalizado
  ) {
    return false
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
        estado
      `)
      .eq(
        'documento',
        documentoNormalizado
      )
      .neq(
        'estado',
        'ANULADA'
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible validar el estado financiero del aprendiz: ${error.message}`
    )
  }

  const cuentas =
    Array.isArray(
      data
    )
      ? data
      : []

  if (
    cuentas.length ===
    0
  ) {
    return false
  }

  return cuentas.every(
    cuenta =>
      mayusculas(
        cuenta?.estado
      ) ===
      'PAZ_Y_SALVO'
  )
}

// =========================================================
// IDENTIFICAR CONCEPTO REFUERZO PRÁCTICO
// =========================================================

function esConceptoRefuerzoPractico(
  valor
) {
  return normalizarTexto(
    valor
  ) ===
    'REFUERZO PRACTICO'
}

// =========================================================
// CONSULTAR RECIBO DE REFUERZO
// =========================================================
//
// Para clientes externos el origen de la programación es
// el recibo generado en Caja.
//
// Requisitos:
//
// - recibo existente
// - estado ACTIVO
// - tipo_origen LIBRE
// - concepto REFUERZO PRACTICO
// - categoría válida
// - cantidad_clases_refuerzo > 0
//
// =========================================================

async function consultarReciboRefuerzo(
  supabase,
  reciboRefuerzoId
) {
  if (
    !reciboRefuerzoId
  ) {
    return null
  }

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
        'id',
        reciboRefuerzoId
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el pago de refuerzo: ${error.message}`
    )
  }

  return data
}

// =========================================================
// CONSTRUIR CLIENTE EXTERNO DESDE RECIBO
// =========================================================

function construirClienteRefuerzo(
  recibo
) {
  if (
    !recibo
  ) {
    return null
  }

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
      null,

    matricula_id:
      null,

    recibo_refuerzo_id:
      Number(
        recibo?.id
      ) ||
      null,

    origen_programacion:
      'CLIENTE_EXTERNO',

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
      recibo?.categoria
        ? [
            normalizarCategoriaLicencia(
              recibo.categoria
            ),
          ]
        : [],

    categoria:
      normalizarCategoriaLicencia(
        recibo?.categoria
      ),

    estado:
      'ACTIVO',
  }
}

// =========================================================
// VALIDAR RECIBO REFUERZO
// =========================================================

async function validarReciboRefuerzo(
  supabase,
  {
    reciboRefuerzoId,
    categoria,
  }
) {
  if (
    !reciboRefuerzoId
  ) {
    throw new Error(
      'Seleccione un cliente con pago de refuerzo.'
    )
  }

  const recibo =
    await consultarReciboRefuerzo(
      supabase,
      reciboRefuerzoId
    )

  if (
    !recibo
  ) {
    throw new Error(
      'No se encontró el pago de refuerzo seleccionado.'
    )
  }

  // =======================================================
  // ESTADO DEL RECIBO
  // =======================================================

  if (
    mayusculas(
      recibo?.estado
    ) !==
    'ACTIVO'
  ) {
    throw new Error(
      'El recibo de refuerzo no se encuentra activo.'
    )
  }

  // =======================================================
  // ORIGEN
  // =======================================================

  if (
    normalizarTexto(
      recibo?.tipo_origen
    ) !==
    'LIBRE'
  ) {
    throw new Error(
      'El recibo seleccionado no corresponde a un ingreso libre de refuerzo.'
    )
  }

  // =======================================================
  // CONCEPTO
  // =======================================================

  if (
    !esConceptoRefuerzoPractico(
      recibo
        ?.concepto
        ?.nombre
    )
  ) {
    throw new Error(
      'El recibo seleccionado no corresponde al concepto REFUERZO PRACTICO.'
    )
  }

  // =======================================================
  // CANTIDAD DE CLASES
  // =======================================================

  const cantidadClases =
    Math.trunc(
      numero(
        recibo
          ?.cantidad_clases_refuerzo
      )
    )

  if (
    cantidadClases <=
    0
  ) {
    throw new Error(
      'El recibo de refuerzo no tiene clases disponibles registradas.'
    )
  }

  // =======================================================
  // CATEGORÍA DEL RECIBO
  // =======================================================

  const categoriaRecibo =
    normalizarCategoriaLicencia(
      recibo?.categoria
    )

  if (
    !categoriaRecibo
  ) {
    throw new Error(
      'El recibo de refuerzo no tiene una categoría registrada.'
    )
  }

  if (
    categoria &&
    categoriaRecibo !==
      normalizarCategoriaLicencia(
        categoria
      )
  ) {
    throw new Error(
      `El refuerzo fue adquirido para la categoría ${categoriaRecibo} y no puede programarse como ${categoria}.`
    )
  }

  // =======================================================
  // CLIENTE
  // =======================================================

  const cliente =
    construirClienteRefuerzo(
      recibo
    )

  if (
    !texto(
      cliente
        ?.nombre_completo
    )
  ) {
    throw new Error(
      'El recibo de refuerzo no tiene identificado el nombre del cliente.'
    )
  }

  if (
    !texto(
      cliente?.documento
    )
  ) {
    throw new Error(
      'El recibo de refuerzo no tiene identificado el documento del cliente.'
    )
  }

  return {
    recibo,

    cliente,

    categoria:
      categoriaRecibo,

    clases_compradas:
      cantidadClases,
  }
}

// =========================================================
// PROGRAMACIÓN ASOCIADA A RECIBO DE REFUERZO
// =========================================================

async function consultarClasesReciboRefuerzo(
  supabase,
  reciboRefuerzoId,
  excluirId = null
) {
  if (
    !reciboRefuerzoId
  ) {
    return []
  }

  let consulta =
    supabase
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

        motivo_no_dictada:motivos_no_dictada (
          id,
          nombre,
          responsable
        )
      `)
      .eq(
        'recibo_refuerzo_id',
        reciboRefuerzoId
      )
      .eq(
        'tipo_programacion',
        'REFUERZO'
      )

  if (
    excluirId
  ) {
    consulta =
      consulta.neq(
        'id',
        excluirId
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
      `No fue posible consultar las clases asociadas al refuerzo: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// RESPONSABLE NORMALIZADO
// =========================================================

function normalizarResponsableNoDictada(
  valor
) {
  const responsable =
    normalizarTexto(
      valor
    )

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
    ].includes(
      responsable
    )
  ) {
    return 'CEA'
  }

  if (
    [
      'APRENDIZ',
      'ALUMNO',
      'CLIENTE',
    ].includes(
      responsable
    )
  ) {
    return 'APRENDIZ'
  }

  return responsable ||
    'SIN_DEFINIR'
}

// =========================================================
// CLASE DE REFUERZO CONSUME CUPO
// =========================================================
//
// REGLAS:
//
// AGENDADA
//   consume.
//
// PENDIENTE_CARGUE
//   consume.
//
// DICTADA
//   consume.
//
// CANCELADA
//   NO consume.
//   La clase vuelve a estar disponible.
//
// NO_DICTADA
//   depende del responsable:
//
//   APRENDIZ / CLIENTE
//     consume.
//
//   INSTRUCTOR / CEA
//     NO consume.
//
// =========================================================

function claseRefuerzoConsumeCupo(
  clase
) {
  const estado =
    mayusculas(
      clase?.estado
    )

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

  if (
    estado ===
    'CANCELADA'
  ) {
    return false
  }

  if (
    estado !==
    'NO_DICTADA'
  ) {
    return false
  }

  const responsable =
    normalizarResponsableNoDictada(
      clase
        ?.motivo_no_dictada
        ?.responsable
    )

  if (
    [
      'INSTRUCTOR',
      'CEA',
    ].includes(
      responsable
    )
  ) {
    return false
  }

  // =======================================================
  // APRENDIZ / CLIENTE / RESPONSABLE SIN DEFINIR
  //
  // En caso de no existir una clasificación clara,
  // conservamos el consumo para no aumentar
  // artificialmente el saldo comprado.
  // =======================================================

  return true
}

// =========================================================
// CALCULAR SALDO DE REFUERZO
// =========================================================

async function calcularSaldoRefuerzo(
  supabase,
  {
    reciboRefuerzoId,
    clasesCompradas,
    excluirId = null,
  }
) {
  const clases =
    await consultarClasesReciboRefuerzo(
      supabase,
      reciboRefuerzoId,
      excluirId
    )

  let comprometidas =
    0

  let agendadas =
    0

  let pendientesCargue =
    0

  let dictadas =
    0

  let noDictadas =
    0

  let canceladas =
    0

  let noDictadasConsumen =
    0

  let noDictadasDevueltas =
    0

  for (
    const clase of
      clases
  ) {
    const estado =
      mayusculas(
        clase?.estado
      )

    if (
      estado ===
      'AGENDADA'
    ) {
      agendadas +=
        1
    }

    if (
      estado ===
      'PENDIENTE_CARGUE'
    ) {
      pendientesCargue +=
        1
    }

    if (
      estado ===
      'DICTADA'
    ) {
      dictadas +=
        1
    }

    if (
      estado ===
      'CANCELADA'
    ) {
      canceladas +=
        1
    }

    if (
      estado ===
      'NO_DICTADA'
    ) {
      noDictadas +=
        1

      if (
        claseRefuerzoConsumeCupo(
          clase
        )
      ) {
        noDictadasConsumen +=
          1
      } else {
        noDictadasDevueltas +=
          1
      }
    }

    if (
      claseRefuerzoConsumeCupo(
        clase
      )
    ) {
      comprometidas +=
        1
    }
  }

  const compradas =
    Math.max(
      0,
      Math.trunc(
        numero(
          clasesCompradas
        )
      )
    )

  const disponibles =
    Math.max(
      0,
      compradas -
        comprometidas
    )

  return {
    clases_compradas:
      compradas,

    clases_comprometidas:
      comprometidas,

    clases_disponibles:
      disponibles,

    agendadas,

    pendientes_cargue:
      pendientesCargue,

    dictadas,

    no_dictadas:
      noDictadas,

    canceladas,

    no_dictadas_consumen:
      noDictadasConsumen,

    no_dictadas_devueltas:
      noDictadasDevueltas,

    clases,
  }
}

// =========================================================
// VALIDAR DISPONIBILIDAD DE REFUERZO
// =========================================================

async function validarDisponibilidadRefuerzo(
  supabase,
  {
    reciboRefuerzoId,
    categoria,
    excluirId = null,
  }
) {
  // =======================================================
  // VALIDAR RECIBO
  // =======================================================

  const validacion =
    await validarReciboRefuerzo(
      supabase,
      {
        reciboRefuerzoId,
        categoria,
      }
    )

  // =======================================================
  // CALCULAR SALDO
  // =======================================================

  const saldo =
    await calcularSaldoRefuerzo(
      supabase,
      {
        reciboRefuerzoId,

        clasesCompradas:
          validacion
            ?.clases_compradas,

        excluirId,
      }
    )

  // =======================================================
  // SIN CLASES DISPONIBLES
  // =======================================================

  if (
    saldo
      ?.clases_disponibles <=
    0
  ) {
    throw new Error(
      `El cliente ya utilizó o tiene programadas las ${saldo.clases_compradas} clase(s) de refuerzo adquiridas.`
    )
  }

  return {
    ...validacion,

    saldo,
  }
}
// =========================================================
// VALIDAR CATEGORÍA DEL APRENDIZ
// =========================================================

function aprendizTieneCategoria(
  aprendiz,
  categoria
) {
  const categorias =
    Array.isArray(
      aprendiz?.categorias
    )
      ? aprendiz.categorias
      : []

  return categorias
    .map(
      normalizarCategoriaLicencia
    )
    .includes(
      normalizarCategoriaLicencia(
        categoria
      )
    )
}

// =========================================================
// REQUISITO CATEGORÍA
// =========================================================

async function consultarRequisitoCategoria(
  supabase,
  categoria
) {
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
        clases_practica,
        limite_clases_dia,
        horas_mensuales_instructor,
        activo
      `)
      .eq(
        'categoria',
        categoria
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
      `No fue posible consultar los requisitos de la categoría: ${error.message}`
    )
  }

  return data
}

// =========================================================
// CONSULTAR INSTRUCTOR
// =========================================================

async function consultarInstructor(
  supabase,
  instructorId
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
      .eq(
        'id',
        instructorId
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el instructor: ${error.message}`
    )
  }

  return data
}

// =========================================================
// LICENCIAS DEL INSTRUCTOR
// =========================================================

async function consultarLicenciasInstructor(
  supabase,
  instructorId
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
        personal_id,
        documento,
        tipo_licencia,
        categoria,
        vigencia,
        numero_certificado,
        fecha_actualizacion,
        observaciones
      `)
      .eq(
        'personal_id',
        instructorId
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar las licencias del instructor: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// VALIDAR DOCUMENTACIÓN INSTRUCTOR
// =========================================================

function evaluarDocumentacionInstructor({
  licencias,
  categoria,
  fechaReferencia,
}) {
  const instructor =
    licencias.filter(
      item =>
        normalizarTipoLicencia(
          item?.tipo_licencia
        ) ===
        'INSTRUCTOR'
    )

  const conduccion =
    licencias.filter(
      item =>
        normalizarTipoLicencia(
          item?.tipo_licencia
        ) ===
        'CONDUCCION'
    )

  const licenciaInstructor =
    instructor.find(
      item =>
        registroVigenteEnFecha(
          item,
          fechaReferencia
        ) &&
        licenciaInstructorPermiteCategoria(
          item,
          categoria
        )
    )

  const licenciaConduccion =
    conduccion.find(
      item =>
        registroVigenteEnFecha(
          item,
          fechaReferencia
        )
    )

  if (
    !licenciaInstructor
  ) {
    return {
      valido:
        false,

      motivo:
        `El instructor no tiene licencia de INSTRUCTOR vigente y habilitada para ${categoria}.`,
    }
  }

  if (
    !licenciaConduccion
  ) {
    return {
      valido:
        false,

      motivo:
        'El instructor no tiene licencia de CONDUCCION vigente para la fecha seleccionada.',
    }
  }

  return {
    valido:
      true,

    licencia_instructor:
      licenciaInstructor,

    licencia_conduccion:
      licenciaConduccion,
  }
}

// =========================================================
// DISPONIBILIDAD HABITUAL
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

async function instructorDisponibleHorarioHabitual(
  supabase,
  instructorId,
  fecha,
  hora
) {
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
      .eq(
        'personal_id',
        instructorId
      )
      .eq(
        'activo',
        true
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar la disponibilidad del instructor: ${error.message}`
    )
  }

  const registros =
    Array.isArray(
      data
    )
      ? data
      : []

  if (
    registros.length ===
    0
  ) {
    return true
  }

  const dia =
    obtenerDiaSemana(
      fecha
    )

  const horaClase =
    normalizarHora(
      hora
    )

  return registros.some(
    item => {
      if (
        Number(
          item?.dia_semana
        ) !==
        dia
      ) {
        return false
      }

      const inicio =
        normalizarHora(
          item?.hora_inicio
        )

      const fin =
        normalizarHora(
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
// VEHÍCULO
// =========================================================

async function consultarVehiculo(
  supabase,
  vehiculoId
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
        estado
      `)
      .eq(
        'id',
        vehiculoId
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el vehículo: ${error.message}`
    )
  }

  return data
}

// =========================================================
// DOCUMENTOS VEHÍCULO
// =========================================================

async function consultarDocumentosVehiculo(
  supabase,
  vehiculoId
) {
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
      .eq(
        'vehiculo_id',
        vehiculoId
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
      `No fue posible consultar la documentación del vehículo: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// ÚLTIMO DOCUMENTO POR TIPO
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

function obtenerUltimosDocumentosVehiculo(
  documentos
) {
  const mapa =
    new Map()

  for (
    const registro of
      documentos
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

    const anterior =
      mapa.get(
        tipo
      )

    if (
      !anterior
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

    const fechaAnterior =
      fechaOrdenDocumento(
        anterior
      )

    if (
      fechaActual >
      fechaAnterior
    ) {
      mapa.set(
        tipo,
        registro
      )

      continue
    }

    if (
      fechaActual ===
        fechaAnterior &&
      Number(
        registro?.id
      ) >
        Number(
          anterior?.id
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
// VALIDAR DOCUMENTACIÓN VEHÍCULO
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
    }
  }

  for (
    const registro of
      ultimos
  ) {
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

    if (
      !vigencia ||
      !fechaValida(
        vigencia
      )
    ) {
      return {
        valido:
          false,

        motivo:
          `${texto(
            registro?.documento
          ) || 'Un documento'} no tiene fecha de vigencia registrada.`,
      }
    }

    if (
      vigencia <
        fechaReferencia ||
      estadoBloqueado
    ) {
      return {
        valido:
          false,

        motivo:
          `${texto(
            registro?.documento
          ) || 'Un documento'} no está vigente para la fecha seleccionada.`,
      }
    }
  }

  return {
    valido:
      true,

    documentos:
      ultimos,
  }
}

// =========================================================
// CONTAR CLASES APRENDIZ DÍA
// =========================================================

async function contarClasesAprendizDia(
  supabase,
  matriculaId,
  fecha,
  excluirId = null
) {
  let consulta =
    supabase
      .from(
        'programacion_clases'
      )
      .select(
        'id',
        {
          count:
            'exact',

          head:
            true,
        }
      )
      .eq(
        'matricula_id',
        matriculaId
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
    excluirId
  ) {
    consulta =
      consulta.neq(
        'id',
        excluirId
      )
  }

  const {
    count,
    error,
  } =
    await consulta

  if (
    error
  ) {
    throw new Error(
      `No fue posible validar el límite diario del aprendiz: ${error.message}`
    )
  }

  return Number(
    count ||
    0
  )
}

// =========================================================
// CURSO VIGENTE INSTRUCTOR DÍA
// =========================================================

async function contarCursoVigenteInstructorDia(
  supabase,
  instructorId,
  fecha,
  excluirId = null
) {
  let consulta =
    supabase
      .from(
        'programacion_clases'
      )
      .select(
        'id',
        {
          count:
            'exact',

          head:
            true,
        }
      )
      .eq(
        'instructor_id',
        instructorId
      )
      .eq(
        'fecha',
        fecha
      )
      .eq(
        'tipo_programacion',
        'CURSO_VIGENTE'
      )
      .in(
        'estado',
        ESTADOS_QUE_CONSUMEN_HORAS
      )

  if (
    excluirId
  ) {
    consulta =
      consulta.neq(
        'id',
        excluirId
      )
  }

  const {
    count,
    error,
  } =
    await consulta

  if (
    error
  ) {
    throw new Error(
      `No fue posible validar el límite diario del instructor: ${error.message}`
    )
  }

  return Number(
    count ||
    0
  )
}

// =========================================================
// HORAS INSTRUCTOR MES
// =========================================================

async function contarHorasInstructorMes(
  supabase,
  instructorId,
  fecha,
  excluirId = null
) {
  const rango =
    obtenerRangoMes(
      fecha
    )

  let consulta =
    supabase
      .from(
        'programacion_clases'
      )
      .select(
        'id',
        {
          count:
            'exact',

          head:
            true,
        }
      )
      .eq(
        'instructor_id',
        instructorId
      )
      .eq(
        'tipo_programacion',
        'CURSO_VIGENTE'
      )
      .gte(
        'fecha',
        rango.desde
      )
      .lte(
        'fecha',
        rango.hasta
      )
      .in(
        'estado',
        ESTADOS_QUE_CONSUMEN_HORAS
      )

  if (
    excluirId
  ) {
    consulta =
      consulta.neq(
        'id',
        excluirId
      )
  }

  const {
    count,
    error,
  } =
    await consulta

  if (
    error
  ) {
    throw new Error(
      `No fue posible validar las horas mensuales del instructor: ${error.message}`
    )
  }

  return Number(
    count ||
    0
  )
}

// =========================================================
// PROGRESO CURSO VIGENTE
// =========================================================

async function contarClasesComprometidasCategoria(
  supabase,
  matriculaId,
  categoria,
  excluirId = null
) {
  let consulta =
    supabase
      .from(
        'programacion_clases'
      )
      .select(
        'id',
        {
          count:
            'exact',

          head:
            true,
        }
      )
      .eq(
        'matricula_id',
        matriculaId
      )
      .eq(
        'categoria',
        categoria
      )
      .eq(
        'tipo_programacion',
        'CURSO_VIGENTE'
      )
      .in(
        'estado',
        ESTADOS_QUE_CONSUMEN_HORAS
      )

  if (
    excluirId
  ) {
    consulta =
      consulta.neq(
        'id',
        excluirId
      )
  }

  const {
    count,
    error,
  } =
    await consulta

  if (
    error
  ) {
    throw new Error(
      `No fue posible validar el progreso del aprendiz: ${error.message}`
    )
  }

  return Number(
    count ||
    0
  )
}

// =========================================================
// CRUCES DE HORARIO
// =========================================================
//
// Valida que en la misma fecha y hora no exista:
//
// - otra clase del mismo aprendiz;
// - otra clase del mismo cliente externo de refuerzo;
// - otra clase del mismo instructor;
// - otra clase del mismo vehículo.
//
// Para CLIENTE_EXTERNO:
//
// matricula_id = null
// recibo_refuerzo_id = ID DEL RECIBO
//
// Por eso las condiciones se construyen dinámicamente
// y nunca enviamos matricula_id.eq.null.
//
// =========================================================

async function consultarCrucesHorario(
  supabase,
  {
    matriculaId,
    reciboRefuerzoId,
    instructorId,
    vehiculoId,
    fecha,
    horaInicio,
    excluirId = null,
  }
) {
  // =======================================================
  // CONDICIONES DINÁMICAS
  // =======================================================

  const condiciones =
    []

  // =======================================================
  // APRENDIZ
  // =======================================================

  if (
    matriculaId
  ) {
    condiciones.push(
      `matricula_id.eq.${matriculaId}`
    )
  }

  // =======================================================
  // CLIENTE EXTERNO DE REFUERZO
  // =======================================================

  if (
    reciboRefuerzoId
  ) {
    condiciones.push(
      `recibo_refuerzo_id.eq.${reciboRefuerzoId}`
    )
  }

  // =======================================================
  // INSTRUCTOR
  // =======================================================

  if (
    instructorId
  ) {
    condiciones.push(
      `instructor_id.eq.${instructorId}`
    )
  }

  // =======================================================
  // VEHÍCULO
  // =======================================================

  if (
    vehiculoId
  ) {
    condiciones.push(
      `vehiculo_id.eq.${vehiculoId}`
    )
  }

  // =======================================================
  // SIN ENTIDADES PARA VALIDAR
  // =======================================================

  if (
    condiciones.length ===
    0
  ) {
    return []
  }

  // =======================================================
  // CONSULTA BASE
  // =======================================================

  let consulta =
    supabase
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
        estado
      `)
      .eq(
        'fecha',
        fecha
      )
      .eq(
        'hora_inicio',
        horaInicio
      )
      .in(
        'estado',
        ESTADOS_QUE_OCUPAN_HORARIO
      )
      .or(
        condiciones.join(
          ','
        )
      )

  // =======================================================
  // EXCLUIR CLASE ACTUAL EN REPROGRAMACIÓN
  // =======================================================

  if (
    excluirId
  ) {
    consulta =
      consulta.neq(
        'id',
        excluirId
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
      `No fue posible validar los cruces de programación: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}
// =========================================================
// VALIDACIÓN GENERAL
// =========================================================
//
// CURSO_VIGENTE:
//
//   matricula_id       OBLIGATORIO
//   recibo_refuerzo_id null
//
// REFUERZO APRENDIZ:
//
//   matricula_id       permitido
//   recibo_refuerzo_id opcional
//
// REFUERZO EXTERNO:
//
//   matricula_id       null
//   recibo_refuerzo_id OBLIGATORIO
//
// =========================================================

async function validarProgramacion(
  supabase,
  {
    matriculaId,
    reciboRefuerzoId,
    instructorId,
    vehiculoId,
    categoria,
    fecha,
    horaInicio,
    tipoProgramacion,
    excluirId = null,
  }
) {
  // =======================================================
  // DATOS GENERALES
  // =======================================================

  if (
    !instructorId
  ) {
    throw new Error(
      'Seleccione un instructor.'
    )
  }

  if (
    !vehiculoId
  ) {
    throw new Error(
      'Seleccione un vehículo.'
    )
  }

  if (
    !categoria
  ) {
    throw new Error(
      'Seleccione una categoría.'
    )
  }

  if (
    !TIPOS_PROGRAMACION_VALIDOS.has(
      tipoProgramacion
    )
  ) {
    throw new Error(
      'El tipo de programación no es válido.'
    )
  }

  // =======================================================
  // FECHA Y HORA
  //
  // Permite, por ejemplo:
  //
  // 07:30 -> programar franja 07:00
  //
  // pero:
  //
  // 08:00 -> franja 07:00 ya venció
  //
  // =======================================================

  validarFechaHoraNuevaProgramacion(
    fecha,
    horaInicio
  )

  // =======================================================
  // IDENTIFICAR TIPO DE PERSONA
  // =======================================================

  const tieneAprendiz =
    Boolean(
      matriculaId
    )

  const tieneReciboRefuerzo =
    Boolean(
      reciboRefuerzoId
    )

  const esCursoVigente =
    tipoProgramacion ===
    'CURSO_VIGENTE'

  const esRefuerzo =
    tipoProgramacion ===
    'REFUERZO'

  // =======================================================
  // CURSO VIGENTE SIEMPRE REQUIERE APRENDIZ
  // =======================================================

  if (
    esCursoVigente &&
    !tieneAprendiz
  ) {
    throw new Error(
      'Seleccione un aprendiz para programar una clase de curso vigente.'
    )
  }

  // =======================================================
  // REFUERZO NECESITA AL MENOS UNA PERSONA IDENTIFICABLE
  // =======================================================

  if (
    esRefuerzo &&
    !tieneAprendiz &&
    !tieneReciboRefuerzo
  ) {
    throw new Error(
      'Seleccione un aprendiz o cliente con pago de refuerzo.'
    )
  }

  // =======================================================
  // ENTIDADES RESULTADO
  // =======================================================

  let aprendiz =
    null

  let clienteRefuerzo =
    null

  let reciboRefuerzo =
    null

  let saldoRefuerzo =
    null

  // =======================================================
  // CONSULTAR APRENDIZ SI EXISTE
  // =======================================================

  if (
    tieneAprendiz
  ) {
    aprendiz =
      await consultarAprendiz(
        supabase,
        matriculaId
      )

    if (
      !aprendiz
    ) {
      throw new Error(
        'El aprendiz seleccionado no existe.'
      )
    }

    // =====================================================
    // CATEGORÍA DEL APRENDIZ
    // =====================================================

    if (
      !aprendizTieneCategoria(
        aprendiz,
        categoria
      )
    ) {
      throw new Error(
        `El aprendiz no tiene asignada la categoría ${categoria}.`
      )
    }
  }

  // =======================================================
  // CURSO VIGENTE
  // =======================================================

  if (
    esCursoVigente
  ) {
    // =====================================================
    // ACTIVO
    // =====================================================

    if (
      mayusculas(
        aprendiz?.estado
      ) !==
      'ACTIVO'
    ) {
      throw new Error(
        'Para programar curso vigente el aprendiz debe estar en estado ACTIVO.'
      )
    }

    // =====================================================
    // PAZ Y SALVO
    // =====================================================

    const pazYSalvo =
      await aprendizEstaPazYSalvo(
        supabase,
        aprendiz.documento
      )

    if (
      !pazYSalvo
    ) {
      throw new Error(
        'El aprendiz no se encuentra PAZ Y SALVO.'
      )
    }

    // =====================================================
    // REQUISITOS DE LA CATEGORÍA
    // =====================================================

    const requisito =
      await consultarRequisitoCategoria(
        supabase,
        categoria
      )

    if (
      !requisito
    ) {
      throw new Error(
        `No existe configuración activa para la categoría ${categoria}.`
      )
    }

    const comprometidas =
      await contarClasesComprometidasCategoria(
        supabase,
        matriculaId,
        categoria,
        excluirId
      )

    const requeridas =
      numero(
        requisito
          ?.clases_practica
      )

    if (
      requeridas >
        0 &&
      comprometidas >=
        requeridas
    ) {
      throw new Error(
        `El aprendiz ya completó o tiene programadas todas las clases prácticas de ${categoria}.`
      )
    }
  }

  // =======================================================
  // REFUERZO CON RECIBO PAGADO
  // =======================================================
  //
  // Esto aplica especialmente al CLIENTE_EXTERNO.
  //
  // También queda preparado para que posteriormente un
  // aprendiz pueda tener asociado un recibo de refuerzo.
  //
  // =======================================================

  if (
    esRefuerzo &&
    tieneReciboRefuerzo
  ) {
    const validacionRefuerzo =
      await validarDisponibilidadRefuerzo(
        supabase,
        {
          reciboRefuerzoId,

          categoria,

          excluirId,
        }
      )

    reciboRefuerzo =
      validacionRefuerzo
        ?.recibo ||
      null

    clienteRefuerzo =
      validacionRefuerzo
        ?.cliente ||
      null

    saldoRefuerzo =
      validacionRefuerzo
        ?.saldo ||
      null

    // =====================================================
    // CATEGORÍA
    // =====================================================

    const categoriaCompra =
      normalizarCategoriaLicencia(
        validacionRefuerzo
          ?.categoria
      )

    if (
      categoriaCompra !==
      normalizarCategoriaLicencia(
        categoria
      )
    ) {
      throw new Error(
        `El refuerzo fue adquirido para la categoría ${categoriaCompra}.`
      )
    }
  }

  // =======================================================
  // MÁXIMO 8 CLASES POR APRENDIZ AL DÍA
  // =======================================================
  //
  // Independiente de las categorías.
  //
  // Para cliente externo esta regla no se aplica mediante
  // matricula_id porque no existe matrícula.
  //
  // El saldo comprado del refuerzo sí continúa limitando
  // cuántas clases puede utilizar.
  //
  // =======================================================

  if (
    tieneAprendiz
  ) {
    const clasesAprendizDia =
      await contarClasesAprendizDia(
        supabase,
        matriculaId,
        fecha,
        excluirId
      )

    if (
      clasesAprendizDia >=
      MAX_CLASES_APRENDIZ_DIA
    ) {
      throw new Error(
        `El aprendiz ya tiene ${MAX_CLASES_APRENDIZ_DIA} clases asignadas para esta fecha.`
      )
    }
  }

  // =======================================================
  // INSTRUCTOR
  // =======================================================

  const instructor =
    await consultarInstructor(
      supabase,
      instructorId
    )

  if (
    !instructor
  ) {
    throw new Error(
      'El instructor seleccionado no existe.'
    )
  }

  if (
    normalizarTexto(
      instructor?.estado
    ) !==
    'ACTIVO'
  ) {
    throw new Error(
      'El instructor seleccionado no se encuentra activo.'
    )
  }

  // =======================================================
  // LICENCIAS DEL INSTRUCTOR
  // =======================================================

  const licencias =
    await consultarLicenciasInstructor(
      supabase,
      instructorId
    )

  const documentacionInstructor =
    evaluarDocumentacionInstructor({
      licencias,

      categoria,

      fechaReferencia:
        fecha,
    })

  if (
    !documentacionInstructor.valido
  ) {
    throw new Error(
      documentacionInstructor
        ?.motivo ||
      'El instructor no cumple los requisitos documentales.'
    )
  }

  // =======================================================
  // DISPONIBILIDAD HABITUAL
  // =======================================================

  const horarioInstructor =
    await instructorDisponibleHorarioHabitual(
      supabase,
      instructorId,
      fecha,
      horaInicio
    )

  if (
    !horarioInstructor
  ) {
    throw new Error(
      'El instructor no tiene disponibilidad configurada para este horario.'
    )
  }

  // =======================================================
  // LÍMITES INSTRUCTOR — SOLO CURSO VIGENTE
  // =======================================================
  //
  // REFUERZO:
  //
  // - NO consume las 240 horas.
  // - NO utiliza el límite de 10 clases de curso vigente.
  // - Sí ocupa horario.
  //
  // =======================================================

  if (
    esCursoVigente
  ) {
    const [
      clasesDia,
      horasMes,
    ] =
      await Promise.all([
        contarCursoVigenteInstructorDia(
          supabase,
          instructorId,
          fecha,
          excluirId
        ),

        contarHorasInstructorMes(
          supabase,
          instructorId,
          fecha,
          excluirId
        ),
      ])

    if (
      clasesDia >=
      MAX_CLASES_INSTRUCTOR_DIA_CURSO
    ) {
      throw new Error(
        `El instructor ya tiene ${MAX_CLASES_INSTRUCTOR_DIA_CURSO} clases de curso vigente asignadas para esta fecha.`
      )
    }

    if (
      horasMes >=
      MAX_HORAS_INSTRUCTOR_MES
    ) {
      throw new Error(
        `El instructor ya completó las ${MAX_HORAS_INSTRUCTOR_MES} horas mensuales de curso vigente.`
      )
    }
  }

  // =======================================================
  // VEHÍCULO
  // =======================================================

  const vehiculo =
    await consultarVehiculo(
      supabase,
      vehiculoId
    )

  if (
    !vehiculo
  ) {
    throw new Error(
      'El vehículo seleccionado no existe.'
    )
  }

  if (
    normalizarTexto(
      vehiculo?.estado
    ) !==
    'ACTIVO'
  ) {
    throw new Error(
      'El vehículo seleccionado no se encuentra activo.'
    )
  }

  // =======================================================
  // TIPO DE VEHÍCULO VS CATEGORÍA
  // =======================================================

  if (
    !vehiculoCompatibleCategoria(
      vehiculo,
      categoria
    )
  ) {
    throw new Error(
      `El tipo de vehículo ${texto(
        vehiculo?.tipo_vehiculo
      ) || '-'} no corresponde a la categoría ${categoria}.`
    )
  }

  // =======================================================
  // DOCUMENTACIÓN VEHÍCULO
  // =======================================================

  const documentosVehiculo =
    await consultarDocumentosVehiculo(
      supabase,
      vehiculoId
    )

  const documentacionVehiculo =
    evaluarDocumentacionVehiculo({
      documentos:
        documentosVehiculo,

      fechaReferencia:
        fecha,
    })

  if (
    !documentacionVehiculo.valido
  ) {
    throw new Error(
      documentacionVehiculo
        ?.motivo ||
      'El vehículo no cumple los requisitos documentales.'
    )
  }

  // =======================================================
  // CRUCES DE HORARIO
  // =======================================================

  const cruces =
    await consultarCrucesHorario(
      supabase,
      {
        matriculaId,

        reciboRefuerzoId,

        instructorId,

        vehiculoId,

        fecha,

        horaInicio,

        excluirId,
      }
    )

  for (
    const cruce of
      cruces
  ) {
    // =====================================================
    // MISMO APRENDIZ
    // =====================================================

    if (
      matriculaId &&
      Number(
        cruce?.matricula_id
      ) ===
      Number(
        matriculaId
      )
    ) {
      throw new Error(
        'El aprendiz ya tiene una clase programada en este horario.'
      )
    }

    // =====================================================
    // MISMO CLIENTE / RECIBO DE REFUERZO
    // =====================================================

    if (
      reciboRefuerzoId &&
      Number(
        cruce?.recibo_refuerzo_id
      ) ===
      Number(
        reciboRefuerzoId
      )
    ) {
      throw new Error(
        'El cliente ya tiene una clase de refuerzo programada en este horario.'
      )
    }

    // =====================================================
    // MISMO INSTRUCTOR
    // =====================================================

    if (
      Number(
        cruce?.instructor_id
      ) ===
      Number(
        instructorId
      )
    ) {
      throw new Error(
        'El instructor ya tiene una clase programada en este horario.'
      )
    }

    // =====================================================
    // MISMO VEHÍCULO
    // =====================================================

    if (
      Number(
        cruce?.vehiculo_id
      ) ===
      Number(
        vehiculoId
      )
    ) {
      throw new Error(
        'El vehículo ya está programado en este horario.'
      )
    }
  }

  // =======================================================
  // PERSONA PROGRAMADA
  // =======================================================

  const persona =
    aprendiz ||
    clienteRefuerzo ||
    null

  // =======================================================
  // RESPUESTA INTERNA
  // =======================================================

  return {
    aprendiz,

    cliente_refuerzo:
      clienteRefuerzo,

    persona,

    recibo_refuerzo:
      reciboRefuerzo,

    saldo_refuerzo:
      saldoRefuerzo,

    instructor,

    vehiculo,

    documentacion_instructor:
      documentacionInstructor,

    documentacion_vehiculo:
      documentacionVehiculo,
  }
}
// =========================================================
// CONSULTAR CLASE POR ID
// =========================================================

async function consultarClasePorId(
  supabase,
  id
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
        duracion_horas,
        tipo_programacion,
        estado,
        motivo_no_dictada_id,
        observacion_no_dictada,
        observaciones,
        usuario_programa,
        fecha_programacion,
        usuario_actualiza_estado,
        fecha_actualizacion_estado,
        fecha_dictada,
        fecha_cargue,
        usuario_cargue,
        created_at,
        updated_at,

        aprendiz:aprendices (
          id,
          consecutivo,
          tipo_doc,
          documento,
          nombres,
          apellidos,
          celular,
          correo,
          categorias,
          estado
        ),

        instructor:personal (
          id,
          tipo_documento,
          documento,
          nombres,
          apellidos,
          telefono,
          email,
          cargo,
          estado
        ),

        vehiculo:vehiculos (
          id,
          placa,
          tipo_vehiculo,
          marca,
          linea,
          modelo,
          estado
        ),

        motivo_no_dictada:motivos_no_dictada (
          id,
          nombre,
          responsable
        )
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
      `No fue posible consultar la clase: ${error.message}`
    )
  }

  if (
    !data
  ) {
    return null
  }

  // =======================================================
  // CLIENTE EXTERNO DE REFUERZO
  // =======================================================

  let clienteRefuerzo =
    null

  if (
    !data?.matricula_id &&
    data?.recibo_refuerzo_id
  ) {
    const recibo =
      await consultarReciboRefuerzo(
        supabase,
        Number(
          data.recibo_refuerzo_id
        )
      )

    if (
      recibo
    ) {
      clienteRefuerzo =
        construirClienteRefuerzo(
          recibo
        )
    }
  }

  const aprendizNormalizado =
    data?.aprendiz
      ? {
          ...data.aprendiz,

          nombre_completo:
            nombreCompleto(
              data.aprendiz
            ),

          origen_programacion:
            'APRENDIZ',
        }
      : null

  const instructorNormalizado =
    data?.instructor
      ? {
          ...data.instructor,

          nombre_completo:
            nombreCompleto(
              data.instructor
            ),
        }
      : null

  const persona =
    aprendizNormalizado ||
    clienteRefuerzo ||
    null

  return {
    ...data,

    aprendiz:
      aprendizNormalizado,

    cliente_refuerzo:
      clienteRefuerzo,

    persona,

    instructor:
      instructorNormalizado,
  }
}

// =========================================================
// IDENTIFICAR TODAS LAS MATRÍCULAS DE UNA PERSONA
// =========================================================
//
// La agenda visual se consulta por DOCUMENTO.
//
// Esto permite que un mismo aprendiz tenga:
//
// - matrícula B1;
// - matrícula C1;
// - otras categorías;
//
// y que todas aparezcan juntas en la agenda.
//
// Para programar se continúa utilizando la matrícula y
// categoría seleccionadas normalmente.
//
// =========================================================

async function consultarMatriculasPorDocumento(
  supabase,
  documento
) {
  const documentoNormalizado =
    normalizarDocumento(
      documento
    )

  if (
    !documentoNormalizado
  ) {
    return []
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
        documento,
        categorias,
        estado
      `)
      .eq(
        'documento',
        documentoNormalizado
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar las matrículas del aprendiz: ${error.message}`
    )
  }

  return (
    Array.isArray(
      data
    )
      ? data
      : []
  )
    .map(
      item =>
        Number(
          item?.id
        )
    )
    .filter(
      id =>
        Number.isFinite(
          id
        ) &&
        id >
          0
    )
}

// =========================================================
// IDENTIFICAR TODOS LOS REFUERZOS DE UN CLIENTE
// =========================================================
//
// Un cliente externo puede haber comprado:
//
// B1
// C1
// A2
//
// en recibos diferentes.
//
// Para visualizar su agenda buscamos todos los recibos
// asociados a su documento.
//
// =========================================================

async function consultarRefuerzosPorDocumento(
  supabase,
  documento
) {
  const documentoNormalizado =
    normalizarDocumento(
      documento
    )

  if (
    !documentoNormalizado
  ) {
    return []
  }

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
        documento_cliente,
        categoria,
        tipo_origen
      `)
      .eq(
        'tipo_origen',
        'LIBRE'
      )
      .eq(
        'documento_cliente',
        documentoNormalizado
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los refuerzos del cliente: ${error.message}`
    )
  }

  return (
    Array.isArray(
      data
    )
      ? data
      : []
  )
    .map(
      item =>
        Number(
          item?.id
        )
    )
    .filter(
      id =>
        Number.isFinite(
          id
        ) &&
        id >
          0
    )
}
// =========================================================
// CONSULTAR AGENDA
// =========================================================
//
// Puede consultar por:
//
// - instructor_id
// - matricula_id
// - recibo_refuerzo_id
// - vehículo
// - estado
// - categoría
// - tipo de programación
//
// =========================================================

async function consultarAgenda(
  supabase,
  {
    fechaInicio,
    fechaFin,
    instructorId,
    matriculaId,
    matriculaIds = [],
    reciboRefuerzoId,
    reciboRefuerzoIds = [],
    vehiculoId,
    estado,
    categoria,
    tipoProgramacion,
  }
) {
  let consulta =
    supabase
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
        duracion_horas,
        tipo_programacion,
        estado,
        motivo_no_dictada_id,
        observacion_no_dictada,
        observaciones,
        usuario_programa,
        fecha_programacion,
        usuario_actualiza_estado,
        fecha_actualizacion_estado,
        fecha_dictada,
        fecha_cargue,
        usuario_cargue,
        created_at,
        updated_at,

        aprendiz:aprendices (
          id,
          consecutivo,
          tipo_doc,
          documento,
          nombres,
          apellidos,
          celular,
          correo,
          categorias,
          estado
        ),

        instructor:personal (
          id,
          documento,
          nombres,
          apellidos,
          telefono,
          email,
          cargo,
          estado
        ),

        vehiculo:vehiculos (
          id,
          placa,
          tipo_vehiculo,
          marca,
          linea,
          modelo
        ),

        motivo_no_dictada:motivos_no_dictada (
          id,
          nombre,
          responsable
        )
      `)

  if (
    fechaInicio
  ) {
    consulta =
      consulta.gte(
        'fecha',
        fechaInicio
      )
  }

  if (
    fechaFin
  ) {
    consulta =
      consulta.lte(
        'fecha',
        fechaFin
      )
  }

  if (
    instructorId
  ) {
    consulta =
      consulta.eq(
        'instructor_id',
        instructorId
      )
  }

  // =======================================================
// PERSONA POR VARIAS MATRÍCULAS
// =======================================================

if (
  Array.isArray(
    matriculaIds
  ) &&
  matriculaIds.length >
    0
) {
  consulta =
    consulta.in(
      'matricula_id',
      matriculaIds
    )
} else if (
  matriculaId
) {
  consulta =
    consulta.eq(
      'matricula_id',
      matriculaId
    )
}

// =======================================================
// CLIENTE EXTERNO POR VARIOS RECIBOS
// =======================================================

if (
  Array.isArray(
    reciboRefuerzoIds
  ) &&
  reciboRefuerzoIds.length >
    0
) {
  consulta =
    consulta.in(
      'recibo_refuerzo_id',
      reciboRefuerzoIds
    )
} else if (
  reciboRefuerzoId
) {
  consulta =
    consulta.eq(
      'recibo_refuerzo_id',
      reciboRefuerzoId
    )
}

  if (
    vehiculoId
  ) {
    consulta =
      consulta.eq(
        'vehiculo_id',
        vehiculoId
      )
  }

  if (
    estado
  ) {
    consulta =
      consulta.eq(
        'estado',
        estado
      )
  }

  if (
    categoria
  ) {
    consulta =
      consulta.eq(
        'categoria',
        categoria
      )
  }

  if (
    tipoProgramacion
  ) {
    consulta =
      consulta.eq(
        'tipo_programacion',
        tipoProgramacion
      )
  }

  const {
    data,
    error,
  } =
    await consulta
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
      `No fue posible consultar la agenda: ${error.message}`
    )
  }

  const clases =
    Array.isArray(
      data
    )
      ? data
      : []

  // =======================================================
  // IDENTIFICAR RECIBOS EXTERNOS
  // =======================================================

  const recibosIds =
    [
      ...new Set(
        clases
          .filter(
            item =>
              !item?.matricula_id &&
              item?.recibo_refuerzo_id
          )
          .map(
            item =>
              Number(
                item?.recibo_refuerzo_id
              )
          )
          .filter(
            Boolean
          )
      ),
    ]

  const clientesPorRecibo =
    new Map()

  // =======================================================
  // CONSULTAR CLIENTES EXTERNOS
  // =======================================================

  for (
    const reciboId of
      recibosIds
  ) {
    const recibo =
      await consultarReciboRefuerzo(
        supabase,
        reciboId
      )

    if (
      !recibo
    ) {
      continue
    }

    const cliente =
      construirClienteRefuerzo(
        recibo
      )

    clientesPorRecibo.set(
      reciboId,
      cliente
    )
  }

  // =======================================================
  // NORMALIZAR RESPUESTA
  // =======================================================

  return clases.map(
    item => {
      const aprendizNormalizado =
        item?.aprendiz
          ? {
              ...item.aprendiz,

              nombre_completo:
                nombreCompleto(
                  item.aprendiz
                ),

              origen_programacion:
                'APRENDIZ',
            }
          : null

      const clienteRefuerzo =
        !item?.matricula_id &&
        item?.recibo_refuerzo_id
          ? (
              clientesPorRecibo.get(
                Number(
                  item
                    ?.recibo_refuerzo_id
                )
              ) ||
              null
            )
          : null

      const instructorNormalizado =
        item?.instructor
          ? {
              ...item.instructor,

              nombre_completo:
                nombreCompleto(
                  item.instructor
                ),
            }
          : null

      return {
        ...item,

        aprendiz:
          aprendizNormalizado,

        cliente_refuerzo:
          clienteRefuerzo,

        persona:
          aprendizNormalizado ||
          clienteRefuerzo ||
          null,

        instructor:
          instructorNormalizado,
      }
    }
  )
}

// =========================================================
// RESUMEN AGENDA
// =========================================================

function calcularResumenAgenda(
  clases
) {
  const resumen = {
    total:
      clases.length,

    agendadas:
      0,

    pendientes_cargue:
      0,

    dictadas:
      0,

    no_dictadas:
      0,

    canceladas:
      0,

    curso_vigente:
      0,

    refuerzo:
      0,

    horas_curso_vigente:
      0,

    horas_refuerzo:
      0,
  }

  for (
    const clase of
      clases
  ) {
    const estado =
      mayusculas(
        clase?.estado
      )

    const tipo =
      mayusculas(
        clase?.tipo_programacion
      )

    if (
      estado ===
      'AGENDADA'
    ) {
      resumen.agendadas +=
        1
    }

    if (
      estado ===
      'PENDIENTE_CARGUE'
    ) {
      resumen.pendientes_cargue +=
        1
    }

    if (
      estado ===
      'DICTADA'
    ) {
      resumen.dictadas +=
        1
    }

    if (
      estado ===
      'NO_DICTADA'
    ) {
      resumen.no_dictadas +=
        1
    }

    if (
      estado ===
      'CANCELADA'
    ) {
      resumen.canceladas +=
        1
    }

    if (
      tipo ===
      'CURSO_VIGENTE'
    ) {
      resumen.curso_vigente +=
        1

      if (
        [
          'AGENDADA',
          'PENDIENTE_CARGUE',
          'DICTADA',
        ].includes(
          estado
        )
      ) {
        resumen.horas_curso_vigente +=
          1
      }
    }

    if (
      tipo ===
      'REFUERZO'
    ) {
      resumen.refuerzo +=
        1

      if (
        [
          'AGENDADA',
          'PENDIENTE_CARGUE',
          'DICTADA',
        ].includes(
          estado
        )
      ) {
        resumen.horas_refuerzo +=
          1
      }
    }
  }

  return resumen
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
      texto(
        searchParams.get(
          'recurso'
        ) ||
        'agenda'
      ).toLowerCase()

    // =====================================================
    // DETALLE
    // =====================================================

    if (
      recurso ===
      'detalle'
    ) {
      const id =
        enteroPositivo(
          searchParams.get(
            'id'
          )
        )

      if (
        !id
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El identificador de la clase es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const clase =
        await consultarClasePorId(
          supabase,
          id
        )

      if (
        !clase
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La clase solicitada no existe.',
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
          clase,

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // AGENDA / HISTORIAL
    // =====================================================

    if (
      recurso ===
        'agenda' ||
      recurso ===
        'historial'
    ) {
      const fechaInicio =
        texto(
          searchParams.get(
            'fecha_inicio'
          )
        )

      const fechaFin =
        texto(
          searchParams.get(
            'fecha_fin'
          )
        )

      const instructorId =
        enteroPositivo(
          searchParams.get(
            'instructor_id'
          )
        )

      const matriculaId =
        enteroPositivo(
          searchParams.get(
            'matricula_id'
          )
        )

      const reciboRefuerzoId =
      enteroPositivo(
        searchParams.get(
          'recibo_refuerzo_id'
        )
      )

      const documentoPersona =
        normalizarDocumento(
          searchParams.get(
            'documento_persona'
          )
        )

      const origenPersona =
        mayusculas(
          searchParams.get(
            'origen_persona'
          )
        )

    const vehiculoId =
      enteroPositivo(
        searchParams.get(
          'vehiculo_id'
        )
      )  

      const estado =
        mayusculas(
          searchParams.get(
            'estado'
          )
        )

      const categoria =
        normalizarCategoriaLicencia(
          searchParams.get(
            'categoria'
          )
        )

      const tipoProgramacion =
        mayusculas(
          searchParams.get(
            'tipo_programacion'
          )
        )

      if (
        fechaInicio &&
        !fechaValida(
          fechaInicio
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La fecha inicial no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        fechaFin &&
        !fechaValida(
          fechaFin
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La fecha final no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        fechaInicio &&
        fechaFin &&
        fechaFin <
          fechaInicio
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La fecha final no puede ser anterior a la fecha inicial.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        estado &&
        !ESTADOS_CLASE_VALIDOS.has(
          estado
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El estado solicitado no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        tipoProgramacion &&
        !TIPOS_PROGRAMACION_VALIDOS.has(
          tipoProgramacion
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El tipo de programación solicitado no es válido.',
          },
          {
            status:
              400,
          }
        )
      }
      // =======================================================
      // AGENDA COMPLETA DE LA PERSONA
      // =======================================================
      //
      // La visualización se realiza por documento.
      //
      // APRENDIZ:
      // busca todas sus matrículas.
      //
      // CLIENTE_EXTERNO:
      // busca todos sus recibos de refuerzo.
      //
      // Esto NO cambia la matrícula utilizada para programar.
      //
      // =======================================================

      let matriculaIds =
        []

      let reciboRefuerzoIds =
        []

      if (
        documentoPersona
      ) {
        if (
          origenPersona ===
          'CLIENTE_EXTERNO'
        ) {
          reciboRefuerzoIds =
            await consultarRefuerzosPorDocumento(
              supabase,
              documentoPersona
            )
        } else {
          matriculaIds =
            await consultarMatriculasPorDocumento(
              supabase,
              documentoPersona
            )
        }
      }

      const clases =
      await consultarAgenda(
        supabase,
        {
          fechaInicio,

          fechaFin,

          instructorId,

          matriculaId,

          matriculaIds,

          reciboRefuerzoId,

          reciboRefuerzoIds,

          vehiculoId,

          estado,

          categoria,

          tipoProgramacion,
        }
      )

      return NextResponse.json({
        status:
          'success',

        data:
          clases,

        total:
          clases.length,

        resumen:
          calcularResumenAgenda(
            clases
          ),

        filtros: {
          fecha_inicio:
            fechaInicio ||
            null,

          fecha_fin:
            fechaFin ||
            null,

          instructor_id:
            instructorId ||
            null,

          matricula_id:
            matriculaId ||
            null,

          recibo_refuerzo_id:
            reciboRefuerzoId ||
            null,

          vehiculo_id:
            vehiculoId ||
            null,

          estado:
            estado ||
            null,

          categoria:
            categoria ||
            null,

          tipo_programacion:
            tipoProgramacion ||
            null,
        },

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

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
      'Error GET /api/admin/programacion:',
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
      texto(
        body?.accion ||
        'programar'
      ).toLowerCase()

    // =====================================================
// PROGRAMAR
// =====================================================

if (
  accion ===
  'programar'
) {
  const matriculaId =
    enteroPositivo(
      body?.matricula_id
    )

  const reciboRefuerzoId =
    enteroPositivo(
      body?.recibo_refuerzo_id
    )

  const instructorId =
    enteroPositivo(
      body?.instructor_id
    )

  const vehiculoId =
    enteroPositivo(
      body?.vehiculo_id
    )

  const categoria =
    normalizarCategoriaLicencia(
      body?.categoria
    )

  const fecha =
    texto(
      body?.fecha
    )

  const horaInicio =
    normalizarHora(
      body?.hora_inicio
    )

  const tipoProgramacion =
    mayusculas(
      body?.tipo_programacion ||
      'CURSO_VIGENTE'
    )

  const usuario =
    texto(
      body?.usuario ||
      body?.usuario_programa
    )

  const observaciones =
    texto(
      body?.observaciones
    )

  // =====================================================
  // USUARIO
  // =====================================================

  if (
    !usuario
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'No fue posible identificar el usuario que realiza la programación.',
      },
      {
        status:
          400,
      }
    )
  }

  // =====================================================
  // VALIDAR PROGRAMACIÓN
  // =====================================================

  const entidades =
    await validarProgramacion(
      supabase,
      {
        matriculaId,

        reciboRefuerzoId,

        instructorId,

        vehiculoId,

        categoria,

        fecha,

        horaInicio,

        tipoProgramacion,
      }
    )

  // =====================================================
  // INSERTAR CLASE
  // =====================================================

  const {
    data:
      claseCreada,

    error:
      errorInsert,
  } =
    await supabase
      .from(
        'programacion_clases'
      )
      .insert({
        matricula_id:
          matriculaId ||
          null,

        recibo_refuerzo_id:
          reciboRefuerzoId ||
          null,

        instructor_id:
          instructorId,

        vehiculo_id:
          vehiculoId,

        categoria,

        fecha,

        hora_inicio:
          horaInicio,

        duracion_horas:
          1,

        tipo_programacion:
          tipoProgramacion,

        estado:
          'AGENDADA',

        observaciones:
          observaciones ||
          null,

        usuario_programa:
          usuario,

        fecha_programacion:
          ahoraIso(),
      })
      .select(`
        id,
        matricula_id,
        recibo_refuerzo_id,
        instructor_id,
        vehiculo_id,
        categoria,
        fecha,
        hora_inicio,
        duracion_horas,
        tipo_programacion,
        estado,
        observaciones,
        usuario_programa,
        fecha_programacion,
        created_at
      `)
      .single()

  if (
    errorInsert
  ) {
    const mensaje =
      texto(
        errorInsert?.message
      )

    if (
      mensaje.includes(
        'programacion_clases_instructor_horario_uidx'
      )
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El instructor ya tiene una clase asignada en este horario.',
        },
        {
          status:
            409,
        }
      )
    }

    if (
      mensaje.includes(
        'programacion_clases_vehiculo_horario_uidx'
      )
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El vehículo ya tiene una clase asignada en este horario.',
        },
        {
          status:
            409,
        }
      )
    }

    if (
      mensaje.includes(
        'programacion_clases_aprendiz_horario_uidx'
      )
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El aprendiz ya tiene una clase asignada en este horario.',
        },
        {
          status:
            409,
        }
      )
    }

    if (
      mensaje.includes(
        'programacion_clases_refuerzo_horario_uidx'
      )
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El cliente ya tiene una clase de refuerzo asignada en este horario.',
        },
        {
          status:
            409,
        }
      )
    }

    return NextResponse.json(
      {
        status:
          'error',

        message:
          `No fue posible registrar la clase: ${errorInsert.message}`,
      },
      {
        status:
          400,
      }
    )
  }

  // =====================================================
  // PERSONA PROGRAMADA
  // =====================================================

  const persona =
    entidades
      ?.persona ||
    entidades
      ?.aprendiz ||
    entidades
      ?.cliente_refuerzo ||
    null

  // =====================================================
  // NOTIFICACIÓN PENDIENTE
  // =====================================================

  const correoDestino =
    texto(
      persona?.correo
    )

  if (
    correoDestino
  ) {
    const {
      error:
        errorNotificacion,
    } =
      await supabase
        .from(
          'programacion_notificaciones'
        )
        .insert({
          programacion_clase_id:
            claseCreada.id,

          tipo:
            'PROGRAMACION',

          destinatario:
            correoDestino,

          asunto:
            `Programación de clase práctica ${categoria}`,

          estado:
            'PENDIENTE',

          fecha_programada:
            ahoraIso(),
        })

    if (
      errorNotificacion
    ) {
      console.error(
        'No fue posible registrar la notificación pendiente:',
        errorNotificacion
      )
    }
  }

  // =====================================================
  // RESPUESTA
  // =====================================================

  return NextResponse.json(
    {
      status:
        'success',

      message:
        'Clase programada correctamente.',

      data: {
        ...claseCreada,

        aprendiz:
          entidades
            ?.aprendiz
            ? {
                id:
                  entidades
                    .aprendiz
                    ?.id,

                documento:
                  entidades
                    .aprendiz
                    ?.documento,

                nombre_completo:
                  nombreCompleto(
                    entidades
                      .aprendiz
                  ),

                celular:
                  entidades
                    .aprendiz
                    ?.celular,

                correo:
                  entidades
                    .aprendiz
                    ?.correo,
              }
            : null,

        cliente_refuerzo:
          entidades
            ?.cliente_refuerzo ||
          null,

        persona: {
          matricula_id:
            matriculaId ||
            null,

          recibo_refuerzo_id:
            reciboRefuerzoId ||
            null,

          origen_programacion:
            entidades
              ?.cliente_refuerzo
              ? 'CLIENTE_EXTERNO'
              : 'APRENDIZ',

          documento:
            persona
              ?.documento ||
            '',

          nombre_completo:
            persona
              ?.nombre_completo ||
            nombreCompleto(
              persona
            ),

          celular:
            persona
              ?.celular ||
            '',

          correo:
            persona
              ?.correo ||
            '',
        },

        saldo_refuerzo:
          entidades
            ?.saldo_refuerzo ||
          null,

        instructor: {
          id:
            entidades
              ?.instructor
              ?.id,

          documento:
            entidades
              ?.instructor
              ?.documento,

          nombre_completo:
            nombreCompleto(
              entidades
                ?.instructor
            ),
        },

        vehiculo:
          entidades
            ?.vehiculo ||
          null,
      },

      empresa:
        construirEmpresaRespuesta(
          empresa
        ),
    },
    {
      status:
        201,
    }
  )
}
    // =====================================================
// CAMBIAR ESTADO
// =====================================================

if (
  accion ===
  'cambiar_estado'
) {
  const id =
    enteroPositivo(
      body?.id
    )

  const nuevoEstado =
    mayusculas(
      body?.estado
    )

  const usuario =
    texto(
      body?.usuario ||
      body?.usuario_actualiza_estado
    )

  const motivoId =
    enteroPositivo(
      body?.motivo_no_dictada_id
    )

  const observacionNoDictada =
    texto(
      body?.observacion_no_dictada
    )

  // =====================================================
  // ID
  // =====================================================

  if (
    !id
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'El identificador de la clase es obligatorio.',
      },
      {
        status:
          400,
      }
    )
  }

  // =====================================================
  // ESTADO
  // =====================================================

  if (
    !ESTADOS_CLASE_VALIDOS.has(
      nuevoEstado
    )
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'El nuevo estado de la clase no es válido.',
      },
      {
        status:
          400,
      }
    )
  }

  // =====================================================
  // USUARIO
  // =====================================================

  if (
    !usuario
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'No fue posible identificar el usuario que actualiza la clase.',
      },
      {
        status:
          400,
      }
    )
  }

  // =====================================================
  // CLASE ACTUAL
  // =====================================================

  const claseActual =
    await consultarClasePorId(
      supabase,
      id
    )

  if (
    !claseActual
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'La clase solicitada no existe.',
      },
      {
        status:
          404,
      }
    )
  }

// =====================================================
// CLASE AGENDADA QUE TODAVÍA NO HA INICIADO
// =====================================================
//
// Mientras la fecha/hora esté en el futuro,
// únicamente se permite CANCELADA.
//
// Esto evita registrar anticipadamente:
//
// - DICTADA
// - PENDIENTE_CARGUE
// - NO_DICTADA
//
// =====================================================

const claseAgendadaFutura =
  mayusculas(
    claseActual?.estado
  ) ===
    'AGENDADA' &&
  claseFuturaParaCambioEstado(
    claseActual?.fecha,
    claseActual?.hora_inicio
  )

if (
  claseAgendadaFutura &&
  nuevoEstado !==
    'CANCELADA'
) {
  return NextResponse.json(
    {
      status:
        'error',

      message:
        'La clase aún no ha iniciado. Mientras la fecha u hora estén en el futuro, únicamente puede cancelarse.',
    },
    {
      status:
        400,
    }
  )
}

  const estadoActual =
    mayusculas(
      claseActual?.estado
    )

  // =====================================================
  // MISMO ESTADO
  // =====================================================

  if (
    estadoActual ===
    nuevoEstado
  ) {
    return NextResponse.json({
      status:
        'success',

      message:
        `La clase ya se encuentra en estado ${nuevoEstado.replace(
          /_/g,
          ' '
        )}.`,

      data:
        claseActual,

      empresa:
        construirEmpresaRespuesta(
          empresa
        ),
    })
  }

  // =====================================================
  // CLASE CANCELADA
  //
  // Una cancelación conserva trazabilidad.
  // No se permite restaurarla cambiando simplemente
  // el estado.
  // =====================================================

  if (
    estadoActual ===
    'CANCELADA'
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'La clase se encuentra CANCELADA y no puede cambiarse nuevamente de estado.',
      },
      {
        status:
          400,
      }
    )
  }

  // =====================================================
  // CANCELAR
  //
  // Solo una clase AGENDADA puede cancelarse.
  //
  // No exige motivo ni observación.
  //
  // Para REFUERZO:
  // CANCELADA deja de consumir una clase comprada.
  // =====================================================

  if (
    nuevoEstado ===
    'CANCELADA'
  ) {
    if (
      estadoActual !==
      'AGENDADA'
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'Solo una clase en estado AGENDADA puede ser cancelada.',
        },
        {
          status:
            400,
        }
      )
    }

    const ahora =
      ahoraIso()

    const {
      data:
        claseCancelada,

      error:
        errorCancelacion,
    } =
      await supabase
        .from(
          'programacion_clases'
        )
        .update({
          estado:
            'CANCELADA',

          motivo_no_dictada_id:
            null,

          observacion_no_dictada:
            null,

          fecha_dictada:
            null,

          fecha_cargue:
            null,

          usuario_cargue:
            null,

          usuario_cancelacion:
            usuario,

          fecha_cancelacion:
            ahora,

          usuario_actualiza_estado:
            usuario,

          fecha_actualizacion_estado:
            ahora,

          updated_at:
            ahora,
        })
        .eq(
          'id',
          id
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
          duracion_horas,
          tipo_programacion,
          estado,
          motivo_no_dictada_id,
          observacion_no_dictada,
          observaciones,
          usuario_programa,
          fecha_programacion,
          usuario_actualiza_estado,
          fecha_actualizacion_estado,
          fecha_dictada,
          fecha_cargue,
          usuario_cargue,
          usuario_cancelacion,
          fecha_cancelacion,
          created_at,
          updated_at
        `)
        .single()

    if (
      errorCancelacion
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            `No fue posible cancelar la clase: ${errorCancelacion.message}`,
        },
        {
          status:
            400,
        }
      )
    }

    return NextResponse.json({
      status:
        'success',

      message:
        'La clase fue cancelada correctamente.',

      data:
        claseCancelada,

      empresa:
        construirEmpresaRespuesta(
          empresa
        ),
    })
  }

  // =====================================================
  // NO DICTADA
  // =====================================================

  let motivoNoDictada =
    null

  if (
    nuevoEstado ===
    'NO_DICTADA'
  ) {
    if (
      !motivoId
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'Seleccione el motivo por el cual la clase no fue dictada.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      !observacionNoDictada
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'Ingrese una observación para la clase no dictada.',
        },
        {
          status:
            400,
        }
      )
    }

    const {
      data:
        motivo,

      error:
        errorMotivo,
    } =
      await supabase
        .from(
          'motivos_no_dictada'
        )
        .select(`
          id,
          nombre,
          responsable,
          activo
        `)
        .eq(
          'id',
          motivoId
        )
        .eq(
          'activo',
          true
        )
        .maybeSingle()

    if (
      errorMotivo
    ) {
      throw new Error(
        `No fue posible validar el motivo: ${errorMotivo.message}`
      )
    }

    if (
      !motivo
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El motivo seleccionado no existe o se encuentra inactivo.',
        },
        {
          status:
            400,
        }
      )
    }

    motivoNoDictada =
      motivo
  }

  // =====================================================
  // CAMBIOS GENERALES
  // =====================================================

  const ahora =
    ahoraIso()

  const cambios = {
    estado:
      nuevoEstado,

    usuario_actualiza_estado:
      usuario,

    fecha_actualizacion_estado:
      ahora,

    updated_at:
      ahora,
  }

  // =====================================================
  // NO DICTADA
  // =====================================================

  if (
    nuevoEstado ===
    'NO_DICTADA'
  ) {
    cambios.motivo_no_dictada_id =
      motivoId

    cambios.observacion_no_dictada =
      observacionNoDictada

    cambios.fecha_dictada =
      null

    cambios.fecha_cargue =
      null

    cambios.usuario_cargue =
      null
  } else {
    cambios.motivo_no_dictada_id =
      null

    cambios.observacion_no_dictada =
      null
  }

  // =====================================================
  // PENDIENTE CARGUE
  // =====================================================

  if (
    nuevoEstado ===
    'PENDIENTE_CARGUE'
  ) {
    cambios.fecha_dictada =
      claseActual?.fecha_dictada ||
      ahora

    cambios.fecha_cargue =
      null

    cambios.usuario_cargue =
      null
  }

  // =====================================================
  // DICTADA
  // =====================================================

  if (
    nuevoEstado ===
    'DICTADA'
  ) {
    cambios.fecha_dictada =
      claseActual?.fecha_dictada ||
      ahora

    cambios.fecha_cargue =
      ahora

    cambios.usuario_cargue =
      usuario
  }

  // =====================================================
  // VOLVER A AGENDADA
  //
  // Permitido mientras la clase no haya sido CANCELADA.
  // =====================================================

  if (
    nuevoEstado ===
    'AGENDADA'
  ) {
    cambios.fecha_dictada =
      null

    cambios.fecha_cargue =
      null

    cambios.usuario_cargue =
      null
  }

  // =====================================================
  // ACTUALIZAR
  // =====================================================

  const {
    data:
      claseActualizada,

    error:
      errorUpdate,
  } =
    await supabase
      .from(
        'programacion_clases'
      )
      .update(
        cambios
      )
      .eq(
        'id',
        id
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
        observaciones,
        usuario_programa,
        usuario_actualiza_estado,
        fecha_actualizacion_estado,
        fecha_dictada,
        fecha_cargue,
        usuario_cargue,
        usuario_cancelacion,
        fecha_cancelacion,
        updated_at
      `)
      .single()

  if (
    errorUpdate
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          `No fue posible actualizar el estado de la clase: ${errorUpdate.message}`,
      },
      {
        status:
          400,
      }
    )
  }

  // =====================================================
  // EFECTO SOBRE REFUERZO
  // =====================================================
  //
  // No tenemos que actualizar manualmente ningún saldo.
  //
  // calcularSaldoRefuerzo() determina el saldo utilizando
  // los estados actuales.
  //
  // Por ejemplo:
  //
  // CANCELADA
  //   -> no consume.
  //
  // NO_DICTADA + INSTRUCTOR/CEA
  //   -> no consume.
  //
  // NO_DICTADA + APRENDIZ/CLIENTE
  //   -> consume.
  //
  // =====================================================

  let saldoRefuerzo =
    null

  if (
    claseActualizada
      ?.tipo_programacion ===
      'REFUERZO' &&
    claseActualizada
      ?.recibo_refuerzo_id
  ) {
    try {
      const recibo =
        await consultarReciboRefuerzo(
          supabase,
          Number(
            claseActualizada
              .recibo_refuerzo_id
          )
        )

      if (
        recibo
      ) {
        saldoRefuerzo =
          await calcularSaldoRefuerzo(
            supabase,
            {
              reciboRefuerzoId:
                Number(
                  claseActualizada
                    .recibo_refuerzo_id
                ),

              clasesCompradas:
                numero(
                  recibo
                    ?.cantidad_clases_refuerzo
                ),
            }
          )
      }
    } catch (
      errorSaldo
    ) {
      console.error(
        'No fue posible recalcular el saldo del refuerzo:',
        errorSaldo
      )
    }
  }

  // =====================================================
  // RESPUESTA
  // =====================================================

  return NextResponse.json({
    status:
      'success',

    message:
      `La clase fue actualizada a ${nuevoEstado.replace(
        /_/g,
        ' '
      )}.`,

    data: {
      ...claseActualizada,

      motivo_no_dictada:
        motivoNoDictada,

      saldo_refuerzo:
        saldoRefuerzo,
    },

    empresa:
      construirEmpresaRespuesta(
        empresa
      ),
  })
}
    // =====================================================
// REPROGRAMAR
// =====================================================

if (
  accion ===
  'reprogramar'
) {
  const id =
    enteroPositivo(
      body?.id
    )

  // =====================================================
  // ID
  // =====================================================

  if (
    !id
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'El identificador de la clase es obligatorio.',
      },
      {
        status:
          400,
      }
    )
  }

  // =====================================================
  // CLASE ACTUAL
  // =====================================================

  const claseActual =
    await consultarClasePorId(
      supabase,
      id
    )

  if (
    !claseActual
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'La clase solicitada no existe.',
      },
      {
        status:
          404,
      }
    )
  }

  const estadoActual =
    mayusculas(
      claseActual?.estado
    )

  // =====================================================
  // NO REPROGRAMAR DICTADA
  // =====================================================

  if (
    estadoActual ===
    'DICTADA'
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'Una clase ya dictada no puede ser reprogramada.',
      },
      {
        status:
          400,
      }
    )
  }

  // =====================================================
  // NO REPROGRAMAR CANCELADA
  // =====================================================

  if (
    estadoActual ===
    'CANCELADA'
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'Una clase cancelada no puede ser reprogramada. Debe crear una nueva programación.',
      },
      {
        status:
          400,
      }
    )
  }

  // =====================================================
  // DATOS DE LA PERSONA
  // =====================================================

  const matriculaId =
    enteroPositivo(
      body?.matricula_id ||
      claseActual?.matricula_id
    )

  const reciboRefuerzoId =
    enteroPositivo(
      body?.recibo_refuerzo_id ||
      claseActual?.recibo_refuerzo_id
    )

  // =====================================================
  // DATOS DE PROGRAMACIÓN
  // =====================================================

  const instructorId =
    enteroPositivo(
      body?.instructor_id ||
      claseActual?.instructor_id
    )

  const vehiculoId =
    enteroPositivo(
      body?.vehiculo_id ||
      claseActual?.vehiculo_id
    )

  const categoria =
    normalizarCategoriaLicencia(
      body?.categoria ||
      claseActual?.categoria
    )

  const fecha =
    texto(
      body?.fecha ||
      claseActual?.fecha
    )

  const horaInicio =
    normalizarHora(
      body?.hora_inicio ||
      claseActual?.hora_inicio
    )

  const tipoProgramacion =
    mayusculas(
      body?.tipo_programacion ||
      claseActual?.tipo_programacion
    )

  const usuario =
    texto(
      body?.usuario ||
      body?.usuario_actualiza_estado
    )

  const observaciones =
    body?.observaciones !==
      undefined
      ? texto(
          body?.observaciones
        )
      : texto(
          claseActual?.observaciones
        )

  // =====================================================
  // USUARIO
  // =====================================================

  if (
    !usuario
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'No fue posible identificar el usuario que realiza la reprogramación.',
      },
      {
        status:
          400,
      }
    )
  }

  // =====================================================
  // VALIDAR NUEVA PROGRAMACIÓN
  // =====================================================
  //
  // La misma función valida:
  //
  // - fecha y hora no vencidas;
  // - curso vigente vs refuerzo;
  // - aprendiz o cliente externo;
  // - saldo del refuerzo;
  // - instructor;
  // - vehículo;
  // - documentación;
  // - cruces;
  // - límites diarios y mensuales.
  //
  // excluirId evita que la clase se cruce consigo misma.
  //
  // =====================================================

  const entidades =
    await validarProgramacion(
      supabase,
      {
        matriculaId,

        reciboRefuerzoId,

        instructorId,

        vehiculoId,

        categoria,

        fecha,

        horaInicio,

        tipoProgramacion,

        excluirId:
          id,
      }
    )

  const ahora =
    ahoraIso()

  // =====================================================
  // ACTUALIZAR
  // =====================================================

  const {
    data:
      claseReprogramada,

    error:
      errorUpdate,
  } =
    await supabase
      .from(
        'programacion_clases'
      )
      .update({
        matricula_id:
          matriculaId ||
          null,

        recibo_refuerzo_id:
          reciboRefuerzoId ||
          null,

        instructor_id:
          instructorId,

        vehiculo_id:
          vehiculoId,

        categoria,

        fecha,

        hora_inicio:
          horaInicio,

        duracion_horas:
          1,

        tipo_programacion:
          tipoProgramacion,

        estado:
          'AGENDADA',

        motivo_no_dictada_id:
          null,

        observacion_no_dictada:
          null,

        observaciones:
          observaciones ||
          null,

        fecha_dictada:
          null,

        fecha_cargue:
          null,

        usuario_cargue:
          null,

        usuario_cancelacion:
          null,

        fecha_cancelacion:
          null,

        usuario_actualiza_estado:
          usuario,

        fecha_actualizacion_estado:
          ahora,

        updated_at:
          ahora,
      })
      .eq(
        'id',
        id
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
        duracion_horas,
        tipo_programacion,
        estado,
        observaciones,
        usuario_programa,
        fecha_programacion,
        usuario_actualiza_estado,
        fecha_actualizacion_estado,
        usuario_cancelacion,
        fecha_cancelacion,
        created_at,
        updated_at
      `)
      .single()

  if (
    errorUpdate
  ) {
    const mensaje =
      texto(
        errorUpdate?.message
      )

    // ===================================================
    // CRUCE INSTRUCTOR
    // ===================================================

    if (
      mensaje.includes(
        'programacion_clases_instructor_horario_uidx'
      )
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El instructor ya tiene una clase asignada en este horario.',
        },
        {
          status:
            409,
        }
      )
    }

    // ===================================================
    // CRUCE VEHÍCULO
    // ===================================================

    if (
      mensaje.includes(
        'programacion_clases_vehiculo_horario_uidx'
      )
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El vehículo ya tiene una clase asignada en este horario.',
        },
        {
          status:
            409,
        }
      )
    }

    // ===================================================
    // CRUCE APRENDIZ
    // ===================================================

    if (
      mensaje.includes(
        'programacion_clases_aprendiz_horario_uidx'
      )
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El aprendiz ya tiene una clase asignada en este horario.',
        },
        {
          status:
            409,
        }
      )
    }

    // ===================================================
    // CRUCE REFUERZO EXTERNO
    // ===================================================

    if (
      mensaje.includes(
        'programacion_clases_refuerzo_horario_uidx'
      )
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El cliente ya tiene una clase de refuerzo asignada en este horario.',
        },
        {
          status:
            409,
        }
      )
    }

    return NextResponse.json(
      {
        status:
          'error',

        message:
          `No fue posible reprogramar la clase: ${errorUpdate.message}`,
      },
      {
        status:
          400,
      }
    )
  }

  // =====================================================
  // PERSONA
  // =====================================================

  const persona =
    entidades
      ?.persona ||
    entidades
      ?.aprendiz ||
    entidades
      ?.cliente_refuerzo ||
    null

  // =====================================================
  // NOTIFICACIÓN REPROGRAMACIÓN
  // =====================================================

  const correoDestino =
    texto(
      persona?.correo
    )

  if (
    correoDestino
  ) {
    const {
      error:
        errorNotificacion,
    } =
      await supabase
        .from(
          'programacion_notificaciones'
        )
        .insert({
          programacion_clase_id:
            id,

          tipo:
            'REPROGRAMACION',

          destinatario:
            correoDestino,

          asunto:
            `Reprogramación de clase práctica ${categoria}`,

          estado:
            'PENDIENTE',

          fecha_programada:
            ahoraIso(),
        })

    if (
      errorNotificacion
    ) {
      console.error(
        'Error registrando notificación de reprogramación:',
        errorNotificacion
      )
    }
  }

  // =====================================================
  // SALDO REFUERZO
  // =====================================================

  let saldoRefuerzo =
    entidades
      ?.saldo_refuerzo ||
    null

  if (
    tipoProgramacion ===
      'REFUERZO' &&
    reciboRefuerzoId
  ) {
    try {
      const recibo =
        await consultarReciboRefuerzo(
          supabase,
          reciboRefuerzoId
        )

      if (
        recibo
      ) {
        saldoRefuerzo =
          await calcularSaldoRefuerzo(
            supabase,
            {
              reciboRefuerzoId,

              clasesCompradas:
                numero(
                  recibo
                    ?.cantidad_clases_refuerzo
                ),
            }
          )
      }
    } catch (
      errorSaldo
    ) {
      console.error(
        'No fue posible recalcular el saldo del refuerzo reprogramado:',
        errorSaldo
      )
    }
  }

  // =====================================================
  // RESPUESTA
  // =====================================================

  return NextResponse.json({
    status:
      'success',

    message:
      'Clase reprogramada correctamente.',

    data: {
      ...claseReprogramada,

      aprendiz:
        entidades
          ?.aprendiz
          ? {
              id:
                entidades
                  ?.aprendiz
                  ?.id,

              documento:
                entidades
                  ?.aprendiz
                  ?.documento,

              nombre_completo:
                nombreCompleto(
                  entidades
                    ?.aprendiz
                ),

              celular:
                entidades
                  ?.aprendiz
                  ?.celular,

              correo:
                entidades
                  ?.aprendiz
                  ?.correo,
            }
          : null,

      cliente_refuerzo:
        entidades
          ?.cliente_refuerzo ||
        null,

      persona: {
        matricula_id:
          matriculaId ||
          null,

        recibo_refuerzo_id:
          reciboRefuerzoId ||
          null,

        origen_programacion:
          entidades
            ?.cliente_refuerzo
            ? 'CLIENTE_EXTERNO'
            : 'APRENDIZ',

        documento:
          persona
            ?.documento ||
          '',

        nombre_completo:
          persona
            ?.nombre_completo ||
          nombreCompleto(
            persona
          ),

        celular:
          persona
            ?.celular ||
          '',

        correo:
          persona
            ?.correo ||
          '',
      },

      instructor:
        entidades
          ?.instructor
          ? {
              id:
                entidades
                  .instructor
                  ?.id,

              documento:
                entidades
                  .instructor
                  ?.documento,

              nombre_completo:
                nombreCompleto(
                  entidades
                    ?.instructor
                ),
            }
          : null,

      vehiculo:
        entidades
          ?.vehiculo ||
        null,

      saldo_refuerzo:
        saldoRefuerzo,
    },

    empresa:
      construirEmpresaRespuesta(
        empresa
      ),
  })
}
    // =====================================================
    // ACCIÓN INVÁLIDA
    // =====================================================

    return NextResponse.json(
      {
        status:
          'error',

        message:
          'La acción solicitada no es válida.',
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
      'Error POST /api/admin/programacion:',
      error
    )

    return respuestaError(
      error
    )
  }
}