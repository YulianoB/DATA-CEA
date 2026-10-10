// app/api/admin/consultas/fallas/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const PAGE_SIZE_DEFAULT = 50
const PAGE_SIZE_MAX = 100
const TAMANO_PAGINA_INTERNA = 1000

const ESTADO_PENDIENTE = 'PENDIENTE'
const ESTADO_ANALISIS = 'EN ANÁLISIS'
const ESTADO_CERRADA = 'CERRADA'

// =========================================================
// SELECTS
// =========================================================

const SELECT_FALLA = `
  id,
  consecutivo,
  fecha,
  hora,
  placa,
  tipo_vehiculo,
  marca,
  kilometraje,
  nombre_encargado,
  descripcion_falla,
  acciones_tomadas,
  estado,
  observaciones_seguimiento,
  observacion_analisis,
  usuario_verificacion,
  fecha_verificacion,
  fecha_solucion,
  usuario_soluciona
`

const SELECT_VEHICULO = `
  id,
  placa,
  tipo_vehiculo,
  marca,
  linea,
  modelo,
  estado
`

// =========================================================
// ERROR MULTIEMPRESA
// =========================================================

function respuestaError(error) {
  const respuesta =
    respuestaErrorEmpresa(error)

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

function normalizarTexto(valor) {
  return String(
    valor ?? ''
  ).trim()
}

function normalizarMayusculas(valor) {
  return normalizarTexto(
    valor
  ).toUpperCase()
}

function normalizarSinAcentos(valor) {
  return normalizarMayusculas(
    valor
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
}

function numeroSeguro(valor) {
  const numero =
    Number(valor)

  return Number.isFinite(
    numero
  )
    ? numero
    : 0
}

function enteroPositivo(
  valor,
  fallback
) {
  const numero =
    Number(valor)

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

function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(
      fecha || ''
    )
  )
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
    (fechaInicio && !fechaValida(fechaInicio)) ||
    (fechaFin && !fechaValida(fechaFin))
  ) {
    return (
      'El rango de fechas no es válido.'
    )
  }

  if (
    fechaInicio && fechaFin &&
    fechaFin < fechaInicio
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
// NORMALIZAR ESTADO
// =========================================================

function normalizarEstado(
  valor
) {
  const estado =
    normalizarSinAcentos(
      valor
    )
      .replace(
        /\s+/g,
        ' '
      )
      .trim()

  if (
    estado ===
    'PENDIENTE'
  ) {
    return ESTADO_PENDIENTE
  }

  if (
    estado ===
    'EN ANALISIS'
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
// CONSULTAR TODO CON PAGINACIÓN INTERNA
// =========================================================

async function consultarTodo(
  crearConsulta
) {
  const resultados = []

  let desde = 0

  while (true) {
    const hasta =
      desde +
      TAMANO_PAGINA_INTERNA -
      1

    const consulta =
      crearConsulta()
        .range(
          desde,
          hasta
        )

    const {
      data,
      error,
    } =
      await consulta

    if (error) {
      throw error
    }

    const filas =
      Array.isArray(
        data
      )
        ? data
        : []

    resultados.push(
      ...filas
    )

    if (
      filas.length <
      TAMANO_PAGINA_INTERNA
    ) {
      break
    }

    desde +=
      TAMANO_PAGINA_INTERNA
  }

  return resultados
}

// =========================================================
// VEHÍCULOS
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
      .select(
        SELECT_VEHICULO
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
      (
        vehiculo
      ) => ({
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

        linea:
          normalizarTexto(
            vehiculo.linea
          ),

        modelo:
          normalizarTexto(
            vehiculo.modelo
          ),

        estado:
          normalizarMayusculas(
            vehiculo.estado
          ),
      })
    )
    .filter(
      (
        vehiculo
      ) =>
        Boolean(
          vehiculo.placa
        )
    )
}

// =========================================================
// CONSULTA BASE
// =========================================================

function construirConsultaBase({
  supabase,
  fechaInicio,
  fechaFin,
  placa = '',
  estado = '',
  conConteo = true,
}) {
  let consulta =
    supabase
      .from(
        'reporte_fallas'
      )
      .select(
        SELECT_FALLA,
        conConteo
          ? {
              count:
                'exact',
            }
          : undefined
      )


  if (fechaInicio) consulta = consulta.gte('fecha', fechaInicio)
  if (fechaFin) consulta = consulta.lte('fecha', fechaFin)

  if (
    placa
  ) {
    consulta =
      consulta.eq(
        'placa',
        placa
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

  return consulta
}

// =========================================================
// CONSULTA PAGINADA
// =========================================================

async function consultarFallas({
  supabase,
  fechaInicio,
  fechaFin,
  placa = '',
  estado = '',
  pagina = 1,
  pageSize = PAGE_SIZE_DEFAULT,
}) {
  let consulta =
    construirConsultaBase({
      supabase,
      fechaInicio,
      fechaFin,
      placa,
      estado,
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
        'fecha',
        {
          ascending:
            false,
        }
      )
      .order(
        'hora',
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
      `No fue posible consultar las fallas: ${error.message}`
    )
  }

  return {
    registros:
      Array.isArray(
        data
      )
        ? data
        : [],

    total:
      Number(
        count || 0
      ),
  }
}

// =========================================================
// CONSULTA COMPLETA
// =========================================================

async function consultarFallasCompletas({
  supabase,
  fechaInicio,
  fechaFin,
  placa = '',
  estado = '',
}) {
  try {
    return await consultarTodo(
      () => {
        let consulta =
          construirConsultaBase({
            supabase,
            fechaInicio,
            fechaFin,
            placa,
            estado,
            conConteo:
              false,
          })

        consulta =
          consulta
            .order(
              'fecha',
              {
                ascending:
                  false,
              }
            )
            .order(
              'hora',
              {
                ascending:
                  false,
              }
            )

        return consulta
      }
    )
  } catch (error) {
    throw new Error(
      `No fue posible consultar las fallas completas: ${error.message}`
    )
  }
}

// =========================================================
// RESUMEN
// =========================================================

function construirResumen(
  registros
) {
  let pendientes = 0
  let enAnalisis = 0
  let cerradas = 0

  const vehiculos =
    new Set()

  const encargados =
    new Set()

  for (
    const registro of
      registros || []
  ) {
    const estado =
      normalizarEstado(
        registro
          ?.estado
      )

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
      enAnalisis +=
        1
    }

    if (
      estado ===
      ESTADO_CERRADA
    ) {
      cerradas +=
        1
    }

    const placa =
      normalizarMayusculas(
        registro
          ?.placa
      )

    if (
      placa
    ) {
      vehiculos.add(
        placa
      )
    }

    const encargado =
      normalizarTexto(
        registro
          ?.nombre_encargado
      )

    if (
      encargado
    ) {
      encargados.add(
        encargado
      )
    }
  }

  return {
    total_fallas:
      (
        registros ||
        []
      ).length,

    pendientes,

    en_analisis:
      enAnalisis,

    cerradas,

    vehiculos_afectados:
      vehiculos.size,

    encargados_involucrados:
      encargados.size,
  }
}

// =========================================================
// OBTENER FALLA POR ID
// =========================================================

async function obtenerFallaPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'reporte_fallas'
      )
      .select(
        SELECT_FALLA
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      `No fue posible consultar la falla: ${error.message}`
    )
  }

  return data || null
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
      ) ||
      'vehiculos'

    // =====================================================
    // VEHÍCULOS
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
    // PARÁMETROS
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

    const placa =
      normalizarMayusculas(
        searchParams.get(
          'placa'
        )
      )

    const estado =
      normalizarEstado(
        searchParams.get(
          'estado'
        )
      )

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
    // CONSULTA
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
        registrosCompletos,
      ] =
        await Promise.all([
          consultarFallas({
            supabase,
            fechaInicio,
            fechaFin,
            placa,
            estado,
            pagina,
            pageSize,
          }),

          consultarFallasCompletas({
            supabase,
            fechaInicio,
            fechaFin,
            placa,
            estado,
          }),
        ])

      const resumen =
        construirResumen(
          registrosCompletos
        )

      const totalPaginas =
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
          placa,

          estado,
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
            totalPaginas,
        },

        resumen,
      })
    }

    // =====================================================
    // EXPORTAR
    // =====================================================

    if (
      recurso ===
      'exportar'
    ) {
      const registros =
        await consultarFallasCompletas({
          supabase,
          fechaInicio,
          fechaFin,
          placa,
          estado,
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

        filtros: {
          placa,

          estado,
        },

        total:
          registros.length,

        registros,

        resumen:
          construirResumen(
            registros
          ),
      })
    }

    // =====================================================
    // RECURSO NO VÁLIDO
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
      'Error GET /api/admin/consultas/fallas:',
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
//
// accion=cerrar_falla
//
// =========================================================

export async function PATCH(
  request
) {
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
            'El ID de la falla no es válido.',
        },
        {
          status:
            400,
        }
      )
    }

    const actual =
      await obtenerFallaPorId(
        supabase,
        id
      )

    if (
      !actual
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La falla no existe.',
        },
        {
          status:
            404,
        }
      )
    }

    const estadoActual =
      normalizarEstado(
        actual.estado
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
              'La falla ya está cerrada y no puede regresar a análisis.',
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
              'La falla ya se encuentra EN ANÁLISIS.',

            registro:
              actual,
          },
          {
            status:
              409,
          }
        )
      }

      if (
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

      const observacionAnalisis = normalizarTexto(body?.observacion_analisis)
      if (!observacionAnalisis) {
        return NextResponse.json({ status: 'failed', message: 'Describa la verificación y las acciones previstas antes de guardar el análisis.' }, { status: 400 })
      }
      if (!responsable) {
        return NextResponse.json({ status: 'failed', message: 'No fue posible identificar al responsable del análisis.' }, { status: 400 })
      }
      const fecha = hoyBogota()

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'reporte_fallas'
          )
          .update({
            estado: ESTADO_ANALISIS,
            fecha_verificacion: fecha,
            usuario_verificacion: responsable,
            observacion_analisis: observacionAnalisis,
          })
          .eq(
            'id',
            id
          )
          .eq(
            'estado',
            ESTADO_PENDIENTE
          )
          .select(
            SELECT_FALLA
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
          'Análisis registrado correctamente.',

        registro:
          data,
      })
    }

    // =====================================================
    // CERRAR FALLA
    // =====================================================

    if (
      accion ===
      'cerrar_falla'
    ) {
      if (
        !responsable
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'No fue posible identificar al responsable del cierre.',
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
              'La falla ya se encuentra cerrada.',

            registro:
              actual,
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
              'La falla debe estar EN ANÁLISIS antes de cerrarse.',
          },
          {
            status:
              409,
          }
        )
      }

      const observacion =
        normalizarTexto(
          body
            ?.observaciones_seguimiento ||
          body
            ?.observacion_cierre
        )

      if (
        !observacion
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'La observación de cierre es obligatoria.',
          },
          {
            status:
              400,
          }
        )
      }

      const fecha =
        hoyBogota()

      const payload = {
        estado:
          ESTADO_CERRADA,

        fecha_solucion:
          fecha,

        usuario_soluciona:
          responsable,

        observaciones_seguimiento:
          observacion,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'reporte_fallas'
          )
          .update(
            payload
          )
          .eq(
            'id',
            id
          )
          .eq(
            'estado',
            ESTADO_ANALISIS
          )
          .select(
            SELECT_FALLA
          )
          .single()

      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible cerrar la falla: ${error.message}`,
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
          'Falla cerrada correctamente.',

        registro:
          data,
      })
    }

    // =====================================================
    // ACCIÓN NO VÁLIDA
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
      'Error PATCH /api/admin/consultas/fallas:',
      error
    )

    return respuestaError(
      error
    )
  }
}