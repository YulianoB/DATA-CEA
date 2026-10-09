// app/api/admin/consultas/preoperacionales/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const ESTADO_PENDIENTE =
  'PENDIENTE'

const ESTADO_ANALISIS =
  'EN ANÁLISIS'

const ESTADO_CERRADA =
  'CERRADA'

const VALOR_NO_CONFORME =
  'NO CONFORME'

const PAGE_SIZE_DEFAULT =
  50

const PAGE_SIZE_MAX =
  100

// =========================================================
// SELECTS
// =========================================================

const SELECT_PREOPERACIONAL = `
  id,
  consecutivo,
  fecha_registro,
  hora_registro,
  placa,
  tipo_vehiculo,
  marca,
  km_registro,
  usuario_encargado,
  observaciones,
  estado_observacion,
  fecha_verificacion_observacion,
  usuario_verificacion,
  fecha_solucion_observacion,
  usuario_solucion,
  observacion_solucion,
  revision_exterior,
  motor,
  interior_funcionamiento,
  equipos_prevencion,
  documentos
`

// =========================================================
// HELPERS
// =========================================================

function respuestaError(error) {
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

function normalizarTexto(valor) {
  return String(
    valor || ''
  ).trim()
}

function normalizarMayusculas(valor) {
  return String(
    valor || ''
  )
    .trim()
    .toUpperCase()
}

function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(
      fecha || ''
    )
  )
}

function enteroPositivo(
  valor,
  fallback
) {
  const numero =
    Number(
      valor
    )

  if (
    !Number.isInteger(
      numero
    ) ||
    numero <= 0
  ) {
    return fallback
  }

  return numero
}

// =========================================================
// FECHA BOGOTÁ
// =========================================================

function hoyBogota() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',

      timeZone:
        'America/Bogota',
    }
  ).format(
    new Date()
  )
}

// =========================================================
// VALIDAR RANGO
// =========================================================

function validarRango(
  fechaInicio,
  fechaFin
) {
  if (
    !fechaInicio ||
    !fechaFin
  ) {
    return (
      'Debe seleccionar fecha inicial y fecha final.'
    )
  }

  if (
    !fechaValida(
      fechaInicio
    ) ||
    !fechaValida(
      fechaFin
    )
  ) {
    return (
      'El rango de fechas no es válido.'
    )
  }

  if (
    fechaFin <
    fechaInicio
  ) {
    return (
      'La fecha final no puede ser anterior a la fecha inicial.'
    )
  }

  const hoy =
    hoyBogota()

  if (
    fechaInicio >
      hoy ||
    fechaFin >
      hoy
  ) {
    return (
      'No se permiten fechas futuras.'
    )
  }

  return ''
}

// =========================================================
// NORMALIZAR ESTADO OBSERVACIÓN
// =========================================================

function normalizarEstadoObservacion(
  valor
) {
  const estado =
    normalizarMayusculas(
      valor
    )

  if (
    estado ===
    'PENDIENTE'
  ) {
    return ESTADO_PENDIENTE
  }

  if (
    estado ===
      'EN ANALISIS' ||
    estado ===
      'EN ANÁLISIS'
  ) {
    return ESTADO_ANALISIS
  }

  if (
    estado ===
    'CERRADA'
  ) {
    return ESTADO_CERRADA
  }

  return normalizarTexto(
    valor
  )
}

// =========================================================
// DETECTAR NO CONFORMIDAD
// =========================================================

function tieneNoConformidad(
  registro
) {
  const campos = [
    registro
      ?.revision_exterior,

    registro
      ?.motor,

    registro
      ?.interior_funcionamiento,

    registro
      ?.equipos_prevencion,

    registro
      ?.documentos,
  ]

  return campos.some(
    (valor) =>
      normalizarMayusculas(
        valor
      ) ===
      VALOR_NO_CONFORME
  )
}

// =========================================================
// PREPARAR FILA
// =========================================================

function prepararFila(
  registro
) {
  const estado =
    normalizarEstadoObservacion(
      registro
        ?.estado_observacion
    )

  const noConforme =
    tieneNoConformidad(
      registro
    )

  const tieneObservacion =
    Boolean(
      normalizarTexto(
        registro
          ?.observaciones
      )
    )

  return {
    ...registro,

    estado_observacion:
      estado,

    tiene_no_conformidad:
      noConforme,

    tiene_observacion:
      tieneObservacion,

    requiere_seguimiento:
      Boolean(
        noConforme ||
        tieneObservacion ||
        estado ===
          ESTADO_PENDIENTE ||
        estado ===
          ESTADO_ANALISIS
      ),
  }
}

// =========================================================
// CATÁLOGO DE VEHÍCULOS PARA FILTROS
// =========================================================
//
// La fuente es la tabla maestra vehiculos.
//
// NO filtramos por estado, porque esta consulta es histórica.
// Un vehículo INACTIVO todavía puede tener registros antiguos
// en preoperacionales.
//
// =========================================================

async function obtenerVehiculos(
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
        estado
      `)
      .order(
        'tipo_vehiculo',
        {
          ascending:
            true,
        }
      )
      .order(
        'placa',
        {
          ascending:
            true,
        }
      )

  if (error) {
    throw new Error(
      `No fue posible cargar los vehículos: ${error.message}`
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
      (vehiculo) => ({
        id:
          vehiculo.id,

        placa:
          normalizarMayusculas(
            vehiculo.placa
          ),

        tipo_vehiculo:
          normalizarTexto(
            vehiculo.tipo_vehiculo
          ),

        marca:
          normalizarTexto(
            vehiculo.marca
          ),

        estado:
          normalizarMayusculas(
            vehiculo.estado
          ),
      })
    )
    .filter(
      (vehiculo) =>
        Boolean(
          vehiculo.placa
        )
    )
}

// =========================================================
// CONSTRUIR CONSULTA BASE
// =========================================================

function construirConsultaBase({
  supabase,
  fechaInicio,
  fechaFin,
  tipoVehiculo = '',
  placa = '',
  conObservaciones = false,
  estadoObservacion = '',
  conConteo = true,
}) {
  let consulta =
    supabase
      .from(
        'preoperacionales'
      )
      .select(
        SELECT_PREOPERACIONAL,
        conConteo
          ? {
              count:
                'exact',
            }
          : undefined
      )
      .gte(
        'fecha_registro',
        fechaInicio
      )
      .lte(
        'fecha_registro',
        fechaFin
      )

  // =====================================================
  // TIPO VEHÍCULO
  // =====================================================
  //
  // Usamos ilike sin comodines para permitir:
  //
  // AUTOMOVIL
  // Automovil
  // automovil
  //
  // sin modificar los datos históricos.
  //
  // =====================================================

  if (
    tipoVehiculo
  ) {
    consulta =
      consulta.ilike(
        'tipo_vehiculo',
        tipoVehiculo
      )
  }

  // =====================================================
  // PLACA
  // =====================================================

  if (
    placa
  ) {
    consulta =
      consulta.eq(
        'placa',
        placa
      )
  }

  // =====================================================
  // SOLO SEGUIMIENTOS ABIERTOS
  // =====================================================

  if (estadoObservacion) {
    consulta = consulta.ilike('estado_observacion', estadoObservacion)
  } else if (
    conObservaciones
  ) {
    consulta =
      consulta.in(
        'estado_observacion',
        [
          ESTADO_PENDIENTE,
          ESTADO_ANALISIS,
        ]
      )
  }

  return consulta
}

// =========================================================
// CONSULTA PAGINADA
// =========================================================

async function consultarRegistros({
  supabase,
  fechaInicio,
  fechaFin,
  tipoVehiculo = '',
  placa = '',
  conObservaciones = false,
  estadoObservacion = '',
  pagina = 1,
  pageSize = PAGE_SIZE_DEFAULT,
}) {
  let consulta =
    construirConsultaBase({
      supabase,
      fechaInicio,
      fechaFin,
      tipoVehiculo,
      placa,
      conObservaciones,
      estadoObservacion,
      conConteo:
        true,
    })

  const desde =
    (
      pagina -
      1
    ) *
    pageSize

  const hasta =
    desde +
    pageSize -
    1

  consulta =
    consulta
      .order(
        'fecha_registro',
        {
          ascending:
            false,
        }
      )
      .order(
        'hora_registro',
        {
          ascending:
            false,
        }
      )
      .range(
        desde,
        hasta
      )

  const {
    data,
    error,
    count,
  } =
    await consulta

  if (error) {
    throw new Error(
      `No fue posible consultar las inspecciones: ${error.message}`
    )
  }

  return {
    registros:
      (
        Array.isArray(
          data
        )
          ? data
          : []
      ).map(
        prepararFila
      ),

    total:
      Number(
        count ||
        0
      ),
  }
}

// =========================================================
// CONSULTA COMPLETA PARA EXPORTAR
// =========================================================

async function consultarRegistrosExportacion({
  supabase,
  fechaInicio,
  fechaFin,
  tipoVehiculo = '',
  placa = '',
  conObservaciones = false,
  estadoObservacion = '',
}) {
  let consulta =
    construirConsultaBase({
      supabase,
      fechaInicio,
      fechaFin,
      tipoVehiculo,
      placa,
      conObservaciones,
      estadoObservacion,
      conConteo:
        false,
    })

  consulta =
    consulta
      .order(
        'fecha_registro',
        {
          ascending:
            false,
        }
      )
      .order(
        'hora_registro',
        {
          ascending:
            false,
        }
      )

  const {
    data,
    error,
  } =
    await consulta

  if (error) {
    throw new Error(
      `No fue posible consultar las inspecciones para exportar: ${error.message}`
    )
  }

  return (
    Array.isArray(
      data
    )
      ? data
      : []
  ).map(
    prepararFila
  )
}

// =========================================================
// OBTENER REGISTRO POR ID
// =========================================================

async function obtenerRegistroPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'preoperacionales'
      )
      .select(
        SELECT_PREOPERACIONAL
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      `No fue posible consultar la inspección: ${error.message}`
    )
  }

  return data
    ? prepararFila(
        data
      )
    : null
}

// =========================================================
// RESUMEN
// =========================================================

async function obtenerResumen({
  supabase,
  fechaInicio,
  fechaFin,
  tipoVehiculo = '',
  placa = '',
  estadoObservacion = '',
}) {
  let consulta =
    supabase
      .from(
        'preoperacionales'
      )
      .select(`
        id,
        observaciones,
        estado_observacion,
        revision_exterior,
        motor,
        interior_funcionamiento,
        equipos_prevencion,
        documentos
      `)
      .gte(
        'fecha_registro',
        fechaInicio
      )
      .lte(
        'fecha_registro',
        fechaFin
      )

  if (
    tipoVehiculo
  ) {
    consulta =
      consulta.ilike(
        'tipo_vehiculo',
        tipoVehiculo
      )
  }

  if (
    placa
  ) {
    consulta =
      consulta.eq(
        'placa',
        placa
      )
  }

  if (estadoObservacion) {
    consulta = consulta.ilike('estado_observacion', estadoObservacion)
  }

  const {
    data,
    error,
  } =
    await consulta

  if (error) {
    throw new Error(
      `No fue posible generar el resumen: ${error.message}`
    )
  }

  const registros =
    Array.isArray(
      data
    )
      ? data
      : []

  let noConformes =
    0

  let pendientes =
    0

  let analisis =
    0

  let cerradas =
    0

  let conObservaciones =
    0

  for (
    const registro of
      registros
  ) {
    const estado =
      normalizarEstadoObservacion(
        registro
          ?.estado_observacion
      )

    if (
      tieneNoConformidad(
        registro
      )
    ) {
      noConformes +=
        1
    }

    if (
      normalizarTexto(
        registro
          ?.observaciones
      )
    ) {
      conObservaciones +=
        1
    }

    if (
      estado ===
      ESTADO_PENDIENTE
    ) {
      pendientes +=
        1
    }

    if (
      estado ===
      ESTADO_ANALISIS
    ) {
      analisis +=
        1
    }

    if (
      estado ===
      ESTADO_CERRADA
    ) {
      cerradas +=
        1
    }
  }

  return {
    total_inspecciones:
      registros.length,

    no_conformes:
      noConformes,

    con_observaciones:
      conObservaciones,

    pendientes,

    en_analisis:
      analisis,

    pendientes_o_analisis:
      pendientes +
      analisis,

    cerradas,
  }
}

// =========================================================
// GET
// =========================================================
//
// recurso=vehiculos
// recurso=consulta
// recurso=exportar
//
// =========================================================

export async function GET(request) {
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
      ) ||
      'vehiculos'

    // =====================================================
    // CATÁLOGO DE VEHÍCULOS
    // =====================================================

    if (
      recurso ===
      'vehiculos'
    ) {
      const vehiculos =
        await obtenerVehiculos(
          supabase
        )

      return NextResponse.json({
        status:
          'success',

        vehiculos,
      })
    }

    // =====================================================
    // PARÁMETROS DE CONSULTA
    // =====================================================

    const fechaInicio =
      normalizarTexto(
        searchParams.get(
          'fecha_inicio'
        )
      )

    const fechaFin =
      normalizarTexto(
        searchParams.get(
          'fecha_fin'
        )
      )

    const tipoVehiculo =
      normalizarTexto(
        searchParams.get(
          'tipo_vehiculo'
        )
      )

    const placa =
      normalizarMayusculas(
        searchParams.get(
          'placa'
        )
      )

    const conObservaciones =
      [
        '1',
        'true',
        'si',
        'sí',
      ].includes(
        normalizarTexto(
          searchParams.get(
            'con_observaciones'
          )
        ).toLowerCase()
      )

    // La bandeja de seguimiento inicia en PENDIENTE incluso si el cliente
    // omite el parámetro. TODOS es la única opción sin filtro de estado.
    const estadoSolicitado = normalizarMayusculas(searchParams.get('estado_observacion'))
    const estadoObservacion = ['TODOS', 'TODAS_INSPECCIONES'].includes(estadoSolicitado)
      ? ''
      : (estadoSolicitado || (recurso === 'consulta' ? ESTADO_PENDIENTE : ''))

    const errorRango =
      validarRango(
        fechaInicio,
        fechaFin
      )

    if (
      errorRango
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            errorRango,
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // CONSULTA PAGINADA
    // =====================================================

    if (
      recurso ===
      'consulta'
    ) {
      const pagina =
        enteroPositivo(
          searchParams.get(
            'pagina'
          ),
          1
        )

      const pageSizeSolicitado =
        enteroPositivo(
          searchParams.get(
            'page_size'
          ),
          PAGE_SIZE_DEFAULT
        )

      const pageSize =
        Math.min(
          pageSizeSolicitado,
          PAGE_SIZE_MAX
        )

      const [
        consulta,
        resumen,
      ] =
        await Promise.all([
          consultarRegistros({
            supabase,
            fechaInicio,
            fechaFin,
            tipoVehiculo,
            placa,
            conObservaciones,
            estadoObservacion,
            pagina,
            pageSize,
          }),

          obtenerResumen({
            supabase,
            fechaInicio,
            fechaFin,
            tipoVehiculo,
            placa,
            estadoObservacion,
          }),
        ])

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            consulta.total /
            pageSize
          )
        )

      return NextResponse.json({
        status:
          'success',

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            empresa?.nombre ||
            empresa?.nombre_empresa ||
            empresa?.razon_social ||
            '',
        },

        periodo: {
          desde:
            fechaInicio,

          hasta:
            fechaFin,
        },

        filtros: {
          tipo_vehiculo:
            tipoVehiculo,

          placa,

          con_observaciones:
            conObservaciones,
        },

        registros:
          consulta.registros,

        paginacion: {
          pagina,

          page_size:
            pageSize,

          total:
            consulta.total,

          total_paginas:
            totalPages,
        },

        resumen,
      })
    }

    // =====================================================
    // EXPORTACIÓN COMPLETA
    // =====================================================

    if (
      recurso ===
      'exportar'
    ) {
      const registros =
        await consultarRegistrosExportacion({
          supabase,
          fechaInicio,
          fechaFin,
          tipoVehiculo,
          placa,
          conObservaciones,
          estadoObservacion,
        })

      return NextResponse.json({
        status:
          'success',

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            empresa?.nombre ||
            empresa?.nombre_empresa ||
            empresa?.razon_social ||
            '',
        },

        periodo: {
          desde:
            fechaInicio,

          hasta:
            fechaFin,
        },

        registros,

        total:
          registros.length,
      })
    }

    // =====================================================
    // RECURSO INVÁLIDO
    // =====================================================

    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'Recurso no válido.',
      },
      {
        status:
          400,
      }
    )
  } catch (error) {
    console.error(
      'Error GET /api/admin/consultas/preoperacionales:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// =========================================================
// PATCH
// =========================================================
//
// accion=marcar_en_analisis
// accion=cerrar_observacion
//
// =========================================================

export async function PATCH(request) {
  try {
    const body =
      await request.json()

    const {
      supabaseAdmin,
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
      )

    const id =
      Number(
        body?.id
      )

    const responsable =
      normalizarTexto(
        body?.responsable ||
        body?.nombre_responsable ||
        body?.usuario ||
        ''
      )

    // =====================================================
    // VALIDACIONES GENERALES
    // =====================================================

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El ID de la inspección no es válido.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      !responsable
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'No fue posible identificar al responsable de la actualización.',
        },
        {
          status:
            400,
        }
      )
    }

    const registroActual =
      await obtenerRegistroPorId(
        supabase,
        id
      )

    if (
      !registroActual
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La inspección preoperacional no existe.',
        },
        {
          status:
            404,
        }
      )
    }

    const estadoActual =
      normalizarEstadoObservacion(
        registroActual
          .estado_observacion
      )

    // =====================================================
    // MARCAR EN ANÁLISIS
    // =====================================================

    if (
      accion ===
      'marcar_en_analisis'
    ) {
      if (
        estadoActual ===
        ESTADO_CERRADA
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              'La observación ya está cerrada y no puede regresar a análisis.',
          },
          {
            status:
              409,
          }
        )
      }

      if (
        estadoActual ===
        ESTADO_ANALISIS
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              'La observación ya se encuentra EN ANÁLISIS.',

            registro:
              registroActual,
          },
          {
            status:
              409,
          }
        )
      }

      if (
        estadoActual &&
        estadoActual !==
          ESTADO_PENDIENTE
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              `No es posible cambiar el estado ${estadoActual} a EN ANÁLISIS.`,
          },
          {
            status:
              409,
          }
        )
      }

      const fecha =
        hoyBogota()

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'preoperacionales'
          )
          .update({
            estado_observacion:
              ESTADO_ANALISIS,

            fecha_verificacion_observacion:
              fecha,

            usuario_verificacion:
              responsable,
          })
          .eq(
            'id',
            id
          )
          .neq(
            'estado_observacion',
            ESTADO_CERRADA
          )
          .select(
            SELECT_PREOPERACIONAL
          )
          .single()

      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible marcar EN ANÁLISIS: ${error.message}`,
          },
          {
            status:
              500,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          'Observación marcada EN ANÁLISIS correctamente.',

        registro:
          prepararFila(
            data
          ),
      })
    }

    // =====================================================
    // CERRAR OBSERVACIÓN
    // =====================================================

    if (
      accion ===
      'cerrar_observacion'
    ) {
      const observacionSolucion =
        normalizarTexto(
          body
            ?.observacion_solucion
        )

      if (
        !observacionSolucion
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Debe registrar la observación de cierre.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        estadoActual ===
        ESTADO_CERRADA
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              'La observación ya se encuentra cerrada.',

            registro:
              registroActual,
          },
          {
            status:
              409,
          }
        )
      }

      if (
        estadoActual !==
        ESTADO_ANALISIS
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              'La observación debe estar EN ANÁLISIS antes de cerrarse.',
          },
          {
            status:
              409,
          }
        )
      }

      const fecha =
        hoyBogota()

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'preoperacionales'
          )
          .update({
            estado_observacion:
              ESTADO_CERRADA,

            fecha_solucion_observacion:
              fecha,

            usuario_solucion:
              responsable,

            observacion_solucion:
              observacionSolucion,
          })
          .eq(
            'id',
            id
          )
          .eq(
            'estado_observacion',
            ESTADO_ANALISIS
          )
          .select(
            SELECT_PREOPERACIONAL
          )
          .single()

      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible cerrar la observación: ${error.message}`,
          },
          {
            status:
              500,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          'Observación cerrada correctamente.',

        registro:
          prepararFila(
            data
          ),
      })
    }

    // =====================================================
    // ACCIÓN INVÁLIDA
    // =====================================================

    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'Acción no válida.',
      },
      {
        status:
          400,
      }
    )
  } catch (error) {
    console.error(
      'Error PATCH /api/admin/consultas/preoperacionales:',
      error
    )

    return respuestaError(
      error
    )
  }
}