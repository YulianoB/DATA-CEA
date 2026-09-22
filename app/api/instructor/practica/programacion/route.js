// app/api/instructor/practica/programacion/route.js

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

const ESTADOS_CLASE_VALIDOS =
  new Set([
    'AGENDADA',
    'PENDIENTE_CARGUE',
    'DICTADA',
    'NO_DICTADA',
    'CANCELADA',
  ])

const MAX_DIAS_CONSULTA =
  62

// =========================================================
// ERROR MULTIEMPRESA
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

function fechaValida(
  valor
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    texto(
      valor
    )
  )
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

// =========================================================
// HOY COLOMBIA
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

// =========================================================
// SUMAR DÍAS
// =========================================================

function sumarDias(
  fecha,
  dias
) {
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

  const fechaUtc =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia
      )
    )

  fechaUtc.setUTCDate(
    fechaUtc.getUTCDate() +
    dias
  )

  return fechaUtc
    .toISOString()
    .slice(
      0,
      10
    )
}

// =========================================================
// DIFERENCIA DE DÍAS
// =========================================================

function diferenciaDias(
  fechaInicio,
  fechaFin
) {
  const inicio =
    new Date(
      `${fechaInicio}T00:00:00Z`
    )

  const fin =
    new Date(
      `${fechaFin}T00:00:00Z`
    )

  return Math.floor(
    (
      fin.getTime() -
      inicio.getTime()
    ) /
    86400000
  )
}

// =========================================================
// HORA FIN
// =========================================================

function calcularHoraFin(
  horaInicio,
  duracionHoras = 1
) {
  const hora =
    texto(
      horaInicio
    ).slice(
      0,
      5
    )

  if (
    !/^\d{2}:\d{2}$/.test(
      hora
    )
  ) {
    return ''
  }

  const [
    horas,
    minutos,
  ] =
    hora
      .split(
        ':'
      )
      .map(
        Number
      )

  const totalMinutos =
    (
      horas * 60
    ) +
    minutos +
    (
      Number(
        duracionHoras ||
        1
      ) * 60
    )

  const horaFin =
    Math.floor(
      totalMinutos /
      60
    )

  const minutoFin =
    totalMinutos %
    60

  return `${String(
    horaFin
  ).padStart(
    2,
    '0'
  )}:${String(
    minutoFin
  ).padStart(
    2,
    '0'
  )}`
}

// =========================================================
// EMPRESA RESPUESTA
// =========================================================

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
  }
}

// =========================================================
// BUSCAR INSTRUCTOR POR DOCUMENTO
// =========================================================

async function buscarInstructorPorDocumento(
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
    return null
  }

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
        estado
      `)
      .eq(
        'documento',
        documentoNormalizado
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible identificar el instructor: ${error.message}`
    )
  }

  if (
    !data
  ) {
    return null
  }

  return {
    ...data,

    nombre_completo:
      nombreCompleto(
        data
      ),
  }
}

// =========================================================
// CONSULTAR RECIBOS DE REFUERZO
// =========================================================

async function consultarRecibosRefuerzo(
  supabase,
  ids
) {
  const reciboIds =
    [
      ...new Set(
        (
          Array.isArray(
            ids
          )
            ? ids
            : []
        )
          .map(
            item =>
              Number(
                item
              )
          )
          .filter(
            item =>
              Number.isInteger(
                item
              ) &&
              item >
                0
          )
      ),
    ]

  if (
    reciboIds.length ===
    0
  ) {
    return new Map()
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
        nombre_cliente,
        tipo_documento_cliente,
        documento_cliente,
        celular_cliente,
        correo_cliente,
        nombre_pagador,
        documento_pagador,
        documento,
        categoria,
        cantidad_clases_refuerzo,
        estado
      `)
      .in(
        'id',
        reciboIds
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los clientes de refuerzo: ${error.message}`
    )
  }

  return new Map(
    (
      data ||
      []
    ).map(
      recibo => [
        Number(
          recibo.id
        ),
        recibo,
      ]
    )
  )
}

// =========================================================
// CONSTRUIR CLIENTE REFUERZO
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

  return {
    origen_programacion:
      'CLIENTE_EXTERNO',

    nombre_completo:
      nombre,

    nombres:
      nombre,

    apellidos:
      '',

    tipo_doc:
      texto(
        recibo?.tipo_documento_cliente
      ),

    documento:
      normalizarDocumento(
        recibo?.documento_cliente ||
        recibo?.documento_pagador ||
        recibo?.documento
      ),

    celular:
      texto(
        recibo?.celular_cliente
      ),

    correo:
      texto(
        recibo?.correo_cliente
      ),
  }
}

// =========================================================
// CONSULTAR PROGRAMACIÓN DEL INSTRUCTOR
// =========================================================

async function consultarProgramacionInstructor(
  supabase,
  {
    instructorId,
    fechaInicio,
    fechaFin,
  }
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
        fecha_programacion,
        fecha_actualizacion_estado,
        fecha_dictada,
        fecha_cargue,
        fecha_cancelacion,
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
        'instructor_id',
        instructorId
        )
        .neq(
        'estado',
        'CANCELADA'
        )
        .gte(
        'fecha',
        fechaInicio
        )
      .lte(
        'fecha',
        fechaFin
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
      `No fue posible consultar la programación del instructor: ${error.message}`
    )
  }

  const clases =
    data ||
    []

  // =======================================================
  // RECIBOS REFUERZO
  // =======================================================

  const recibosRefuerzo =
    await consultarRecibosRefuerzo(
      supabase,
      clases.map(
        clase =>
          clase
            ?.recibo_refuerzo_id
      )
    )

  // =======================================================
  // NORMALIZAR RESPUESTA
  // =======================================================

  return clases.map(
    clase => {
      const aprendiz =
        clase?.aprendiz
          ? {
              ...clase.aprendiz,

              origen_programacion:
                'APRENDIZ',

              nombre_completo:
                nombreCompleto(
                  clase.aprendiz
                ),
            }
          : null

      const recibo =
        clase
          ?.recibo_refuerzo_id
          ? recibosRefuerzo.get(
              Number(
                clase.recibo_refuerzo_id
              )
            )
          : null

      const clienteRefuerzo =
        construirClienteRefuerzo(
          recibo
        )

      const persona =
        aprendiz ||
        clienteRefuerzo ||
        null

      const horaInicio =
        texto(
          clase?.hora_inicio
        ).slice(
          0,
          5
        )

      const duracionHoras =
        Number(
          clase?.duracion_horas ||
          1
        )

      return {
        id:
          clase.id,

        fecha:
          clase.fecha,

        hora_inicio:
          horaInicio,

        hora_fin:
          calcularHoraFin(
            horaInicio,
            duracionHoras
          ),

        duracion_horas:
          duracionHoras,

        categoria:
          clase.categoria,

        tipo_programacion:
          clase.tipo_programacion,

        estado:
          clase.estado,

        matricula_id:
          clase.matricula_id,

        recibo_refuerzo_id:
          clase.recibo_refuerzo_id,

        vehiculo_id:
          clase.vehiculo_id,

        persona,

        aprendiz,

        cliente_refuerzo:
          clienteRefuerzo,

        vehiculo:
          clase?.vehiculo
            ? {
                id:
                  clase.vehiculo.id,

                placa:
                  texto(
                    clase
                      .vehiculo
                      .placa
                  ),

                tipo_vehiculo:
                  texto(
                    clase
                      .vehiculo
                      .tipo_vehiculo
                  ),

                marca:
                  texto(
                    clase
                      .vehiculo
                      .marca
                  ),

                linea:
                  texto(
                    clase
                      .vehiculo
                      .linea
                  ),

                modelo:
                  clase
                    .vehiculo
                    .modelo ||
                  '',

                estado:
                  clase
                    .vehiculo
                    .estado ||
                  '',
              }
            : null,

        motivo_no_dictada:
          clase
            ?.motivo_no_dictada ||
          null,

        observacion_no_dictada:
          texto(
            clase
              ?.observacion_no_dictada
          ),

        observaciones:
          texto(
            clase?.observaciones
          ),

        fecha_programacion:
          clase
            ?.fecha_programacion ||
          null,

        fecha_actualizacion_estado:
          clase
            ?.fecha_actualizacion_estado ||
          null,

        fecha_dictada:
          clase
            ?.fecha_dictada ||
          null,

        fecha_cargue:
          clase
            ?.fecha_cargue ||
          null,

        fecha_cancelacion:
          clase
            ?.fecha_cancelacion ||
          null,

        created_at:
          clase
            ?.created_at ||
          null,

        updated_at:
          clase
            ?.updated_at ||
          null,
      }
    }
  )
}

// =========================================================
// RESUMEN DEL RANGO
// =========================================================

function construirResumen(
  clases
) {
  const resumen = {
    total:
      0,

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
  }

  for (
    const clase of
      clases
  ) {
    resumen.total +=
      1

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
    }

    if (
      tipo ===
      'REFUERZO'
    ) {
      resumen.refuerzo +=
        1
    }
  }

  return resumen
}

// =========================================================
// GET
// =========================================================
//
// SOLO CONSULTA.
//
// No se recibe instructor_id.
//
// El instructor se identifica mediante el documento del
// usuario que tiene la sesión iniciada.
//
// Parámetros:
//
// nit
// documento
// fecha_inicio
// fecha_fin
//
// Si no llegan fechas:
// hoy -> hoy + 6 días.
//
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

    // =====================================================
    // DOCUMENTO DEL USUARIO EN SESIÓN
    // =====================================================

    const documento =
      normalizarDocumento(
        searchParams.get(
          'documento'
        )
      )

    if (
      !documento
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'No fue posible identificar el documento del instructor.',
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // IDENTIFICAR INSTRUCTOR
    // =====================================================

    const instructor =
      await buscarInstructorPorDocumento(
        supabase,
        documento
      )

    if (
      !instructor
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'No se encontró un instructor asociado al usuario actual.',
        },
        {
          status:
            404,
        }
      )
    }

    // =====================================================
    // RANGO DE FECHAS
    // =====================================================

    const hoy =
      hoyColombia()

    const fechaInicio =
      texto(
        searchParams.get(
          'fecha_inicio'
        )
      ) ||
      hoy

    const fechaFin =
      texto(
        searchParams.get(
          'fecha_fin'
        )
      ) ||
      sumarDias(
        fechaInicio,
        6
      )

    if (
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

    const diasConsulta =
      diferenciaDias(
        fechaInicio,
        fechaFin
      )

    if (
      diasConsulta >
      MAX_DIAS_CONSULTA
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            `El rango máximo permitido es de ${MAX_DIAS_CONSULTA} días.`,
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // CONSULTAR PROGRAMACIÓN
    // =====================================================

    const clases =
      await consultarProgramacionInstructor(
        supabase,
        {
          instructorId:
            instructor.id,

          fechaInicio,

          fechaFin,
        }
      )

    // =====================================================
    // RESPUESTA
    // =====================================================

    return NextResponse.json({
      status:
        'success',

      data:
        clases,

      total:
        clases.length,

      rango: {
        fecha_inicio:
          fechaInicio,

        fecha_fin:
          fechaFin,
      },

      instructor: {
        id:
          instructor.id,

        tipo_documento:
          instructor
            .tipo_documento ||
          '',

        documento:
          instructor.documento,

        nombre_completo:
          instructor
            .nombre_completo,

        telefono:
          instructor.telefono ||
          '',

        email:
          instructor.email ||
          '',

        cargo:
          instructor.cargo ||
          '',

        estado:
          instructor.estado ||
          '',
      },

      resumen:
        construirResumen(
          clases
        ),

      empresa:
        construirEmpresaRespuesta(
          empresa
        ),
    })
  } catch (
    error
  ) {
    console.error(
      'Error GET /api/instructor/practica/programacion:',
      error
    )

    return respuestaError(
      error
    )
  }
}