// app/api/admin/consultas/mantenimientos/route.js

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

const TIPO_PREVENTIVO = 'PREVENTIVO'
const TIPO_CORRECTIVO = 'CORRECTIVO'

const TAMANO_PAGINA_INTERNA = 1000

// =========================================================
// SELECTS
// =========================================================

const SELECT_MANTENIMIENTO = `
  id,
  fecha_registro,
  placa,
  kilometraje,
  tipo_mantenimiento,
  actividad_realizada,
  repuestos_utilizados,
  empresa,
  tiempoparada,
  factura,
  valor_repuestos,
  valor_mano_obra,
  costo_total,
  responsable,
  observaciones
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

function numeroSeguro(valor) {
  const numero =
    Number(
      valor
    )

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

function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(
      fecha ||
      ''
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
  if ((fechaInicio && !fechaValida(fechaInicio)) || (fechaFin && !fechaValida(fechaFin))) {
    return (
      'El rango de fechas no es válido.'
    )
  }

  if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
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
// NORMALIZAR TIPO DE MANTENIMIENTO
// =========================================================

function normalizarTipoMantenimiento(
  valor
) {
  const tipo =
    normalizarMayusculas(
      valor
    )

  if (
    tipo ===
    TIPO_PREVENTIVO
  ) {
    return TIPO_PREVENTIVO
  }

  if (
    tipo ===
    TIPO_CORRECTIVO
  ) {
    return TIPO_CORRECTIVO
  }

  return tipo
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
// CATÁLOGO DE VEHÍCULOS
// =========================================================
//
// Se cargan activos e inactivos porque esta consulta
// es histórica.
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
  placa = '',
  tipoMantenimiento = '',
  placasTipo = null,
  conConteo = true,
}) {
  let consulta =
    supabase
      .from(
        'mantenimientos'
      )
      .select(
        SELECT_MANTENIMIENTO,
        conConteo
          ? {
              count:
                'exact',
            }
          : undefined
      )


  if (placasTipo !== null) consulta = consulta.in('placa', placasTipo.length ? placasTipo : ['__SIN_PLACAS__'])
  if (fechaInicio) consulta = consulta.gte('fecha_registro', fechaInicio)
  if (fechaFin) consulta = consulta.lte('fecha_registro', fechaFin)

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
    tipoMantenimiento
  ) {
    consulta =
      consulta.ilike(
        'tipo_mantenimiento',
        tipoMantenimiento
      )
  }

  return consulta
}

// =========================================================
// CONSULTA PAGINADA
// =========================================================

async function consultarMantenimientos({
  supabase,
  fechaInicio,
  fechaFin,
  placa = '',
  tipoMantenimiento = '',
  placasTipo = null,
  pagina = 1,
  pageSize = PAGE_SIZE_DEFAULT,
}) {
  let consulta =
    construirConsultaBase({
      supabase,
      fechaInicio,
      fechaFin,
      placa,
      tipoMantenimiento,
      placasTipo,
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
        'id',
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
      `No fue posible consultar los mantenimientos: ${error.message}`
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
        count ||
        0
      ),
  }
}

// =========================================================
// CONSULTAR TODOS LOS REGISTROS DEL FILTRO
// =========================================================

async function consultarMantenimientosCompletos({
  supabase,
  fechaInicio,
  fechaFin,
  placa = '',
  tipoMantenimiento = '',
  placasTipo = null,
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
            tipoMantenimiento,
            placasTipo,
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
              'id',
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
      `No fue posible consultar los mantenimientos completos: ${error.message}`
    )
  }
}

// =========================================================
// RESUMEN
// =========================================================

function construirResumen(
  registros
) {
  let preventivos = 0
  let correctivos = 0

  let valorRepuestos = 0
  let valorManoObra = 0
  let costoTotal = 0

  let tiempoParada = 0

  const vehiculos =
    new Set()

  for (
    const registro of
      registros ||
      []
  ) {
    const tipo =
      normalizarTipoMantenimiento(
        registro
          ?.tipo_mantenimiento
      )

    if (
      tipo ===
      TIPO_PREVENTIVO
    ) {
      preventivos +=
        1
    }

    if (
      tipo ===
      TIPO_CORRECTIVO
    ) {
      correctivos +=
        1
    }

    valorRepuestos +=
      numeroSeguro(
        registro
          ?.valor_repuestos
      )

    valorManoObra +=
      numeroSeguro(
        registro
          ?.valor_mano_obra
      )

    costoTotal +=
      numeroSeguro(
        registro
          ?.costo_total
      )

    tiempoParada +=
      numeroSeguro(
        registro
          ?.tiempoparada
      )

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
  }

  return {
    total_mantenimientos:
      (
        registros ||
        []
      ).length,

    preventivos,

    correctivos,

    otros:
      Math.max(
        0,
        (
          registros ||
          []
        ).length -
        preventivos -
        correctivos
      ),

    total_vehiculos:
      vehiculos.size,

    valor_repuestos:
      valorRepuestos,

    valor_mano_obra:
      valorManoObra,

    costo_total:
      costoTotal,

    tiempo_parada_minutos:
      tiempoParada,
  }
}

// =========================================================
// RESUMEN POR VEHÍCULO
// =========================================================

function construirResumenPorVehiculo(
  registros
) {
  const mapa =
    new Map()

  for (
    const registro of
      registros ||
      []
  ) {
    const placa =
      normalizarMayusculas(
        registro
          ?.placa
      )

    if (
      !placa
    ) {
      continue
    }

    if (
      !mapa.has(
        placa
      )
    ) {
      mapa.set(
        placa,
        {
          placa,

          total_mantenimientos:
            0,

          preventivos:
            0,

          correctivos:
            0,

          valor_repuestos:
            0,

          valor_mano_obra:
            0,

          costo_total:
            0,

          tiempo_parada_minutos:
            0,
        }
      )
    }

    const item =
      mapa.get(
        placa
      )

    item.total_mantenimientos +=
      1

    const tipo =
      normalizarTipoMantenimiento(
        registro
          ?.tipo_mantenimiento
      )

    if (
      tipo ===
      TIPO_PREVENTIVO
    ) {
      item.preventivos +=
        1
    }

    if (
      tipo ===
      TIPO_CORRECTIVO
    ) {
      item.correctivos +=
        1
    }

    item.valor_repuestos +=
      numeroSeguro(
        registro
          ?.valor_repuestos
      )

    item.valor_mano_obra +=
      numeroSeguro(
        registro
          ?.valor_mano_obra
      )

    item.costo_total +=
      numeroSeguro(
        registro
          ?.costo_total
      )

    item.tiempo_parada_minutos +=
      numeroSeguro(
        registro
          ?.tiempoparada
      )
  }

  return Array.from(
    mapa.values()
  ).sort(
    (
      a,
      b
    ) =>
      a.placa.localeCompare(
        b.placa,
        'es'
      )
  )
}

// =========================================================
// GET
// =========================================================
//
// recurso=vehiculos
//
// recurso=consulta
//
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

    const tipoMantenimiento =
      normalizarTipoMantenimiento(
        searchParams.get(
          'tipo_mantenimiento'
        )
      )

    const tipoVehiculo = normalizarTexto(searchParams.get('tipo_vehiculo'))
    const placasTipo = tipoVehiculo
      ? (await obtenerVehiculos(supabase)).filter(v => v.tipo_vehiculo === tipoVehiculo).map(v => v.placa)
      : null

    const vistaUltimoPreventivo = searchParams.get('vista') === 'ultimo_preventivo_activos'
    const obtenerUltimosPreventivosActivos = async () => {
      const activos = (await obtenerVehiculos(supabase))
        .filter(v => normalizarMayusculas(v.estado) === 'ACTIVO')
      const placasActivas = new Set(activos.map(v => v.placa))
      if (!placasActivas.size) return []
      const preventivos = await consultarMantenimientosCompletos({
        supabase,
        fechaInicio: '',
        fechaFin: '',
        tipoMantenimiento: TIPO_PREVENTIVO,
      })
      const ultimos = new Map()
      for (const registro of preventivos) {
        const placaRegistro = normalizarMayusculas(registro.placa)
        if (!placasActivas.has(placaRegistro)) continue
        const anterior = ultimos.get(placaRegistro)
        if (!anterior || String(registro.fecha_registro || '') > String(anterior.fecha_registro || '') ||
            (String(registro.fecha_registro || '') === String(anterior.fecha_registro || '') && Number(registro.id || 0) > Number(anterior.id || 0))) {
          ultimos.set(placaRegistro, registro)
        }
      }
      return [...ultimos.values()].sort((a,b) =>
        String(b.fecha_registro || '').localeCompare(String(a.fecha_registro || '')) ||
        String(a.placa || '').localeCompare(String(b.placa || ''), 'es'))
    }

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

      if (vistaUltimoPreventivo) {
        const registros = await obtenerUltimosPreventivosActivos()
        const total = registros.length
        const resumen = construirResumen(registros)
        return NextResponse.json({
          status: 'success',
          registros: registros.slice((pagina - 1) * pageSize, pagina * pageSize),
          paginacion: { pagina, page_size: pageSize, total, total_paginas: Math.max(1, Math.ceil(total / pageSize)) },
          resumen,
          resumen_por_vehiculo: construirResumenPorVehiculo(registros),
        })
      }

      const [
        consulta,
        registrosCompletos,
      ] =
        await Promise.all([
          consultarMantenimientos({
            supabase,
            fechaInicio,
            fechaFin,
            placa,
            tipoMantenimiento,
            placasTipo,
            pagina,
            pageSize,
          }),

          consultarMantenimientosCompletos({
            supabase,
            fechaInicio,
            fechaFin,
            placa,
            tipoMantenimiento,
            placasTipo,
          }),
        ])

      const resumen =
        construirResumen(
          registrosCompletos
        )

      const resumenPorVehiculo =
        construirResumenPorVehiculo(
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

          tipo_mantenimiento:
            tipoMantenimiento,
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

        resumen_por_vehiculo:
          resumenPorVehiculo,
      })
    }

    // =====================================================
    // EXPORTAR
    // =====================================================

    if (
      recurso ===
      'exportar'
    ) {
      if (vistaUltimoPreventivo) {
        const registros = await obtenerUltimosPreventivosActivos()
        return NextResponse.json({
          status: 'success',
          registros,
          total: registros.length,
          resumen: construirResumen(registros),
          resumen_por_vehiculo: construirResumenPorVehiculo(registros),
          periodo: { desde: '', hasta: '' },
          filtros: { placa: '', tipo_mantenimiento: TIPO_PREVENTIVO },
          empresa: { nit: empresa?.nit || '', nombre: empresa?.nombre || empresa?.nombre_empresa || empresa?.razon_social || '' },
        })
      }

      const registros =
        await consultarMantenimientosCompletos({
          supabase,
          fechaInicio,
          fechaFin,
          placa,
          tipoMantenimiento,
          placasTipo,
        })

      const resumen =
        construirResumen(
          registros
        )

      const resumenPorVehiculo =
        construirResumenPorVehiculo(
          registros
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

          tipo_mantenimiento:
            tipoMantenimiento,
        },

        registros,

        total:
          registros.length,

        resumen,

        resumen_por_vehiculo:
          resumenPorVehiculo,
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
      'Error GET /api/admin/consultas/mantenimientos:',
      error
    )

    return respuestaError(
      error
    )
  }
}