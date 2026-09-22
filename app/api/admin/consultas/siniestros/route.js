// app/api/admin/consultas/siniestros/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'


// ============================================================
// CONSTANTES
// app/api/admin/consultas/siniestros/route.js
// ============================================================

const PAGE_SIZE_DEFAULT = 50
const PAGE_SIZE_MAX = 100
const TAMANO_PAGINA_INTERNA = 1000

const ESTADO_PENDIENTE = 'PENDIENTE'
const ESTADO_ANALISIS = 'EN ANÁLISIS'
const ESTADO_CERRADO = 'CERRADO'


// ============================================================
// SELECT SINIESTRO
// app/api/admin/consultas/siniestros/route.js
//
// IMPORTANTE:
// fecha_comite_analisis se incluye para:
// - visualización administrativa
// - expediente cerrado
// - evidencia trimestral Superintendencia
// ============================================================

const SELECT_SINIESTRO = `
  id,
  consecutivo,
  timestamp_registro,
  fecha_siniestro,
  tipo_siniestro,
  num_personas_involucradas,
  heridos_leves,
  heridos_graves,
  fatalidades,
  placa,
  nombre_conductor_implicado,
  documento,
  resumen,
  estado_analisis,
  numero_ipat,
  autoridad,
  costo_dir_choque_simple,
  costo_indi_choque_simple,
  costo_dir_heridos_l,
  costo_indi_heridos_l,
  costo_dir_heridos_g,
  costo_indi_heridos_g,
  costo_dir_fatalidad,
  costo_indi_fatalidad,
  fecha_estado_en_analisis,
  nombre_usuario_en_analisis,
  fecha_estado_cerrado,
  nombre_usuario_cerrado,
  resumen_analisis,
  fecha_comite_analisis
`


// ============================================================
// SELECT VEHÍCULOS
// app/api/admin/consultas/siniestros/route.js
// ============================================================

const SELECT_VEHICULO = `
  id,
  placa,
  tipo_vehiculo,
  marca,
  estado
`


// ============================================================
// RESPUESTA ERROR MULTIEMPRESA
// app/api/admin/consultas/siniestros/route.js
// ============================================================

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


// ============================================================
// HELPERS DE TEXTO
// app/api/admin/consultas/siniestros/route.js
// ============================================================

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


// ============================================================
// HELPERS NUMÉRICOS
// app/api/admin/consultas/siniestros/route.js
// ============================================================

function numeroSeguro(valor) {
  const numero =
    Number(valor)

  return Number.isFinite(numero)
    ? numero
    : 0
}


function validarNumeroMin0(valor) {
  const numero =
    Number(valor)

  return (
    Number.isFinite(numero) &&
    numero >= 0
  )
}


function enteroPositivo(
  valor,
  fallback
) {
  const numero =
    Number(valor)

  if (
    !Number.isInteger(numero) ||
    numero <= 0
  ) {
    return fallback
  }

  return numero
}


// ============================================================
// HELPERS DE FECHA
// app/api/admin/consultas/siniestros/route.js
// ============================================================

function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(
      fecha || ''
    )
  )
}


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


// ============================================================
// NORMALIZAR ESTADO
// app/api/admin/consultas/siniestros/route.js
// ============================================================

function normalizarEstado(valor) {
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
    'CERRADO'
  ) {
    return ESTADO_CERRADO
  }

  if (
    estado ===
    'TODOS'
  ) {
    return 'TODOS'
  }

  return ''
}


// ============================================================
// VALIDAR FECHAS OPCIONALES DE CONSULTA
// app/api/admin/consultas/siniestros/route.js
//
// CONSULTA NORMAL:
// - ambas vacías: permitido
// - ambas llenas: permitido
// - solamente una: no permitido
// ============================================================

function validarFechasOpcionales(
  fechaInicio,
  fechaFin
) {
  if (
    !fechaInicio &&
    !fechaFin
  ) {
    return ''
  }

  if (
    !fechaInicio ||
    !fechaFin
  ) {
    return 'Para filtrar por período debe seleccionar fecha inicial y fecha final.'
  }

  if (
    !fechaValida(
      fechaInicio
    ) ||
    !fechaValida(
      fechaFin
    )
  ) {
    return 'El rango de fechas no es válido.'
  }

  if (
    fechaFin <
    fechaInicio
  ) {
    return 'La fecha final no puede ser anterior a la fecha inicial.'
  }

  const hoy =
    hoyBogota()

  if (
    fechaInicio > hoy ||
    fechaFin > hoy
  ) {
    return 'No se permiten fechas futuras.'
  }

  return ''
}


// ============================================================
// VALIDAR FECHAS DE EXPORTACIÓN
// app/api/admin/consultas/siniestros/route.js
//
// EXPORTACIÓN:
// siempre exige período.
// ============================================================

function validarFechasExportacion(
  fechaInicio,
  fechaFin
) {
  if (
    !fechaInicio ||
    !fechaFin
  ) {
    return 'Para exportar debe seleccionar fecha inicial y fecha final.'
  }

  return validarFechasOpcionales(
    fechaInicio,
    fechaFin
  )
}


// ============================================================
// VALIDAR ESTADO FILTRO
// app/api/admin/consultas/siniestros/route.js
// ============================================================

function validarEstadoFiltro(estado) {
  if (
    !estado ||
    estado === 'TODOS'
  ) {
    return ''
  }

  if (
    estado ===
      ESTADO_PENDIENTE ||
    estado ===
      ESTADO_ANALISIS ||
    estado ===
      ESTADO_CERRADO
  ) {
    return ''
  }

  return 'El estado seleccionado no es válido.'
}


// ============================================================
// CONSULTAR TODOS LOS REGISTROS EN BLOQUES
// app/api/admin/consultas/siniestros/route.js
//
// Se utiliza para:
// - resumen global
// - exportación
//
// Evita depender del límite por defecto de Supabase.
// ============================================================

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
      Array.isArray(data)
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


// ============================================================
// OBTENER VEHÍCULOS
// app/api/admin/consultas/siniestros/route.js
// ============================================================

async function obtenerVehiculos(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from('vehiculos')
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
    Array.isArray(data)
      ? data
      : []
  )
    .map(
      vehiculo => ({
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
      vehiculo =>
        Boolean(
          vehiculo.placa
        )
    )
}


// ============================================================
// CONSTRUIR CONSULTA BASE
// app/api/admin/consultas/siniestros/route.js
//
// Permite:
// - fechas opcionales
// - placa opcional
// - tipo opcional
// - estado opcional
//
// aplicarEstado=false se usa para obtener los contadores
// globales de Pendientes / En análisis / Cerrados / Todos.
// ============================================================

function construirConsultaBase({
  supabase,
  fechaInicio = '',
  fechaFin = '',
  placa = '',
  tipoSiniestro = '',
  estado = '',
  aplicarEstado = true,
  conConteo = true,
}) {
  let consulta =
    supabase
      .from('siniestros')
      .select(
        SELECT_SINIESTRO,
        conConteo
          ? {
              count:
                'exact',
            }
          : undefined
      )


  // ========================================================
  // FECHA DEL SINIESTRO
  // ========================================================

  if (
    fechaInicio &&
    fechaFin
  ) {
    consulta =
      consulta
        .gte(
          'fecha_siniestro',
          fechaInicio
        )
        .lte(
          'fecha_siniestro',
          fechaFin
        )
  }


  // ========================================================
  // PLACA
  // ========================================================

  if (placa) {
    consulta =
      consulta.eq(
        'placa',
        placa
      )
  }


  // ========================================================
  // TIPO DE SINIESTRO
  // ========================================================

  if (tipoSiniestro) {
    consulta =
      consulta.ilike(
        'tipo_siniestro',
        tipoSiniestro
      )
  }


  // ========================================================
  // ESTADO
  // ========================================================

  if (
    aplicarEstado &&
    estado &&
    estado !== 'TODOS'
  ) {
    consulta =
      consulta.eq(
        'estado_analisis',
        estado
      )
  }


  return consulta
}


// ============================================================
// CONSULTAR SINIESTROS PAGINADOS
// app/api/admin/consultas/siniestros/route.js
//
// Utilizado por la bandeja principal.
// ============================================================

async function consultarSiniestros({
  supabase,
  fechaInicio = '',
  fechaFin = '',
  placa = '',
  tipoSiniestro = '',
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
      tipoSiniestro,
      estado,
      aplicarEstado:
        true,
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
        'fecha_siniestro',
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
      `No fue posible consultar los siniestros: ${error.message}`
    )
  }


  return {
    registros:
      Array.isArray(data)
        ? data
        : [],

    total:
      Number(
        count || 0
      ),
  }
}


// ============================================================
// CONSULTA COMPLETA PARA RESUMEN
// app/api/admin/consultas/siniestros/route.js
//
// IGNORA el estado seleccionado.
//
// Permite que las tarjetas indiquen simultáneamente:
//
// Pendientes
// En análisis
// Cerrados
// Todos
// ============================================================

async function consultarSiniestrosResumen({
  supabase,
  fechaInicio = '',
  fechaFin = '',
  placa = '',
  tipoSiniestro = '',
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
            tipoSiniestro,

            estado:
              '',

            aplicarEstado:
              false,

            conConteo:
              false,
          })


        consulta =
          consulta
            .order(
              'fecha_siniestro',
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
      `No fue posible consultar el resumen de siniestros: ${error.message}`
    )
  }
}


// ============================================================
// CONSULTA COMPLETA PARA EXPORTACIÓN
// app/api/admin/consultas/siniestros/route.js
//
// El período se determina por fecha_siniestro.
// Esto será utilizado para la evidencia trimestral.
// ============================================================

async function consultarSiniestrosExportacion({
  supabase,
  fechaInicio,
  fechaFin,
  placa = '',
  tipoSiniestro = '',
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
            tipoSiniestro,
            estado,

            aplicarEstado:
              true,

            conConteo:
              false,
          })


        consulta =
          consulta
            .order(
              'fecha_siniestro',
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


        return consulta
      }
    )
  } catch (error) {
    throw new Error(
      `No fue posible consultar los siniestros para exportación: ${error.message}`
    )
  }
}


// ============================================================
// CONSTRUIR RESUMEN
// app/api/admin/consultas/siniestros/route.js
// ============================================================

function construirResumen(registros) {
  let pendientes = 0
  let enAnalisis = 0
  let cerrados = 0

  let personas = 0
  let leves = 0
  let graves = 0
  let fatalidades = 0

  let dirChoque = 0
  let indChoque = 0

  let dirLeves = 0
  let indLeves = 0

  let dirGraves = 0
  let indGraves = 0

  let dirFatal = 0
  let indFatal = 0

  const vehiculos =
    new Set()


  for (
    const registro of
      registros || []
  ) {
    const estado =
      normalizarEstado(
        registro
          ?.estado_analisis
      )


    if (
      estado ===
      ESTADO_PENDIENTE
    ) {
      pendientes += 1
    }


    if (
      estado ===
      ESTADO_ANALISIS
    ) {
      enAnalisis += 1
    }


    if (
      estado ===
      ESTADO_CERRADO
    ) {
      cerrados += 1
    }


    personas +=
      numeroSeguro(
        registro
          ?.num_personas_involucradas
      )


    leves +=
      numeroSeguro(
        registro
          ?.heridos_leves
      )


    graves +=
      numeroSeguro(
        registro
          ?.heridos_graves
      )


    fatalidades +=
      numeroSeguro(
        registro
          ?.fatalidades
      )


    dirChoque +=
      numeroSeguro(
        registro
          ?.costo_dir_choque_simple
      )


    indChoque +=
      numeroSeguro(
        registro
          ?.costo_indi_choque_simple
      )


    dirLeves +=
      numeroSeguro(
        registro
          ?.costo_dir_heridos_l
      )


    indLeves +=
      numeroSeguro(
        registro
          ?.costo_indi_heridos_l
      )


    dirGraves +=
      numeroSeguro(
        registro
          ?.costo_dir_heridos_g
      )


    indGraves +=
      numeroSeguro(
        registro
          ?.costo_indi_heridos_g
      )


    dirFatal +=
      numeroSeguro(
        registro
          ?.costo_dir_fatalidad
      )


    indFatal +=
      numeroSeguro(
        registro
          ?.costo_indi_fatalidad
      )


    const placa =
      normalizarMayusculas(
        registro?.placa
      )


    if (placa) {
      vehiculos.add(
        placa
      )
    }
  }


  const costoDirecto =
    dirChoque +
    dirLeves +
    dirGraves +
    dirFatal


  const costoIndirecto =
    indChoque +
    indLeves +
    indGraves +
    indFatal


  return {
    total_siniestros:
      (
        registros ||
        []
      ).length,

    pendientes,

    en_analisis:
      enAnalisis,

    cerrados,

    personas_involucradas:
      personas,

    heridos_leves:
      leves,

    heridos_graves:
      graves,

    fatalidades,

    vehiculos_involucrados:
      vehiculos.size,

    costos: {
      directo_choque:
        dirChoque,

      indirecto_choque:
        indChoque,

      directo_leves:
        dirLeves,

      indirecto_leves:
        indLeves,

      directo_graves:
        dirGraves,

      indirecto_graves:
        indGraves,

      directo_fatalidades:
        dirFatal,

      indirecto_fatalidades:
        indFatal,

      total_directo:
        costoDirecto,

      total_indirecto:
        costoIndirecto,

      total_general:
        costoDirecto +
        costoIndirecto,
    },
  }
}


// ============================================================
// OBTENER SINIESTRO POR ID
// app/api/admin/consultas/siniestros/route.js
// ============================================================

async function obtenerSiniestroPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from('siniestros')
      .select(
        SELECT_SINIESTRO
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()


  if (error) {
    throw new Error(
      `No fue posible consultar el siniestro: ${error.message}`
    )
  }


  return data || null
}


// ============================================================
// GET
// app/api/admin/consultas/siniestros/route.js
//
// RECURSOS:
//
// recurso=vehiculos
//
// recurso=consulta
// - estado opcional
// - fechas opcionales
// - placa opcional
// - tipo opcional
//
// recurso=exportar
// - fechas obligatorias
// - estado opcional
// ============================================================

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


    // ========================================================
    // GET VEHÍCULOS
    // app/api/admin/consultas/siniestros/route.js
    // ========================================================

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


    // ========================================================
    // PARÁMETROS GENERALES
    // ========================================================

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


    const tipoSiniestro =
      normalizarTexto(
        searchParams.get(
          'tipo_siniestro'
        )
      )


    const estadoSolicitado =
      normalizarTexto(
        searchParams.get(
          'estado'
        )
      )


    const estado =
      estadoSolicitado
        ? normalizarEstado(
            estadoSolicitado
          )
        : ''


    // ========================================================
    // VALIDAR ESTADO
    // ========================================================

    if (
      estadoSolicitado &&
      !estado
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El estado seleccionado no es válido.',
        },
        {
          status:
            400,
        }
      )
    }


    const errorEstado =
      validarEstadoFiltro(
        estado
      )


    if (
      errorEstado
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            errorEstado,
        },
        {
          status:
            400,
        }
      )
    }


    // ========================================================
    // RECURSO CONSULTA
    // app/api/admin/consultas/siniestros/route.js
    //
    // Permite consultar solamente:
    //
    // estado=PENDIENTE
    //
    // sin necesidad de enviar fechas.
    // ========================================================

    if (
      recurso ===
      'consulta'
    ) {
      const errorFechas =
        validarFechasOpcionales(
          fechaInicio,
          fechaFin
        )


      if (
        errorFechas
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              errorFechas,
          },
          {
            status:
              400,
          }
        )
      }


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


      // ======================================================
      // 1. Tabla:
      //    respeta estado seleccionado.
      //
      // 2. Resumen:
      //    ignora estado seleccionado.
      //
      // Así las tarjetas superiores permanecen globales.
      // ======================================================

      const [
        consulta,
        registrosResumen,
      ] =
        await Promise.all([
          consultarSiniestros({
            supabase,
            fechaInicio,
            fechaFin,
            placa,
            tipoSiniestro,
            estado,
            pagina,
            pageSize,
          }),

          consultarSiniestrosResumen({
            supabase,
            fechaInicio,
            fechaFin,
            placa,
            tipoSiniestro,
          }),
        ])


      const resumen =
        construirResumen(
          registrosResumen
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
            empresa?.razon_social ||
            '',
        },

        periodo: {
          desde:
            fechaInicio ||
            null,

          hasta:
            fechaFin ||
            null,
        },

        filtros: {
          estado:
            estado ||
            'TODOS',

          placa,

          tipo_siniestro:
            tipoSiniestro,
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


    // ========================================================
    // RECURSO EXPORTAR
    // app/api/admin/consultas/siniestros/route.js
    //
    // Para evidencia trimestral:
    // - fecha_inicio obligatoria
    // - fecha_fin obligatoria
    //
    // El frontend posteriormente calculará estos rangos
    // automáticamente a partir de Año + Trimestre.
    // ========================================================

    if (
      recurso ===
      'exportar'
    ) {
      const errorFechas =
        validarFechasExportacion(
          fechaInicio,
          fechaFin
        )


      if (
        errorFechas
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              errorFechas,
          },
          {
            status:
              400,
          }
        )
      }


      const registros =
        await consultarSiniestrosExportacion({
          supabase,
          fechaInicio,
          fechaFin,
          placa,
          tipoSiniestro,
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
          estado:
            estado ||
            'TODOS',

          placa,

          tipo_siniestro:
            tipoSiniestro,
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


    // ========================================================
    // RECURSO NO VÁLIDO
    // ========================================================

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
      'Error GET /api/admin/consultas/siniestros:',
      error
    )


    return respuestaError(
      error
    )
  }
}


// ============================================================
// PATCH
// app/api/admin/consultas/siniestros/route.js
//
// ACCIONES:
//
// accion=marcar_en_analisis
//
// accion=cerrar_siniestro
// ============================================================

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


    // ========================================================
    // VALIDACIÓN ID
    // ========================================================

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El ID del siniestro no es válido.',
        },
        {
          status:
            400,
        }
      )
    }


    // ========================================================
    // VALIDACIÓN RESPONSABLE
    // ========================================================

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


    // ========================================================
    // CONSULTAR REGISTRO ACTUAL
    // ========================================================

    const actual =
      await obtenerSiniestroPorId(
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
            'El siniestro no existe.',
        },
        {
          status:
            404,
        }
      )
    }


    const estadoActual =
      normalizarEstado(
        actual
          .estado_analisis
      )


    // ========================================================
    // ACCIÓN: MARCAR EN ANÁLISIS
    // app/api/admin/consultas/siniestros/route.js
    // ========================================================

    if (
      accion ===
      'marcar_en_analisis'
    ) {
      // ======================================================
      // CERRADO NO PUEDE REGRESAR
      // ======================================================

      if (
        estadoActual ===
        ESTADO_CERRADO
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El siniestro ya está cerrado y no puede regresar a análisis.',
          },
          {
            status:
              409,
          }
        )
      }


      // ======================================================
      // YA ESTÁ EN ANÁLISIS
      // ======================================================

      if (
        estadoActual ===
        ESTADO_ANALISIS
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El siniestro ya se encuentra EN ANÁLISIS.',

            registro:
              actual,
          },
          {
            status:
              409,
          }
        )
      }


      // ======================================================
      // SOLO PENDIENTE PUEDE AVANZAR
      // ======================================================

      if (
        estadoActual !==
        ESTADO_PENDIENTE
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No es posible cambiar el estado ${estadoActual || 'SIN ESTADO'} a EN ANÁLISIS.`,
          },
          {
            status:
              409,
          }
        )
      }


      const fecha =
        hoyBogota()


      // ======================================================
      // ACTUALIZAR ESTADO
      //
      // Se condiciona también por estado actual para proteger
      // frente a cambios simultáneos.
      // ======================================================

      const {
        data,
        error,
      } =
        await supabase
          .from('siniestros')
          .update({
            estado_analisis:
              ESTADO_ANALISIS,

            fecha_estado_en_analisis:
              fecha,

            nombre_usuario_en_analisis:
              responsable,
          })
          .eq(
            'id',
            id
          )
          .eq(
            'estado_analisis',
            ESTADO_PENDIENTE
          )
          .select(
            SELECT_SINIESTRO
          )
          .maybeSingle()


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


      if (
        !data
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El estado del siniestro cambió antes de completar la operación. Actualice la consulta e inténtelo nuevamente.',
          },
          {
            status:
              409,
          }
        )
      }


      return NextResponse.json({
        status:
          'success',

        message:
          'Siniestro marcado EN ANÁLISIS correctamente.',

        registro:
          data,
      })
    }


    // ========================================================
    // ACCIÓN: CERRAR SINIESTRO
    // app/api/admin/consultas/siniestros/route.js
    // ========================================================

    if (
      accion ===
      'cerrar_siniestro'
    ) {
      // ======================================================
      // YA ESTÁ CERRADO
      // ======================================================

      if (
        estadoActual ===
        ESTADO_CERRADO
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El siniestro ya se encuentra cerrado.',

            registro:
              actual,
          },
          {
            status:
              409,
          }
        )
      }


      // ======================================================
      // SOLO EN ANÁLISIS PUEDE CERRARSE
      // ======================================================

      if (
        estadoActual !==
        ESTADO_ANALISIS
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El siniestro debe estar EN ANÁLISIS antes de cerrarse.',
          },
          {
            status:
              409,
          }
        )
      }


      // ======================================================
      // RESUMEN DE ANÁLISIS
      // ======================================================

      const resumenAnalisis =
        normalizarTexto(
          body
            ?.resumen_analisis
        )


      if (
        !resumenAnalisis
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El resumen de análisis es obligatorio para cerrar el siniestro.',
          },
          {
            status:
              400,
          }
        )
      }


      // ======================================================
      // FECHA COMITÉ
      // app/api/admin/consultas/siniestros/route.js
      //
      // Campo requerido por la evidencia de la
      // Superintendencia.
      // ======================================================

      const fechaComiteAnalisis =
        normalizarTexto(
          body
            ?.fecha_comite_analisis
        )


      if (
        !fechaComiteAnalisis
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'La fecha del comité donde fue analizado el siniestro es obligatoria para cerrar.',
          },
          {
            status:
              400,
          }
        )
      }


      if (
        !fechaValida(
          fechaComiteAnalisis
        )
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'La fecha del comité no tiene un formato válido.',
          },
          {
            status:
              400,
          }
        )
      }


      const hoy =
        hoyBogota()


      if (
        fechaComiteAnalisis >
        hoy
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'La fecha del comité no puede ser una fecha futura.',
          },
          {
            status:
              400,
          }
        )
      }


      if (
        actual
          ?.fecha_siniestro &&
        fechaComiteAnalisis <
          actual.fecha_siniestro
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'La fecha del comité no puede ser anterior a la fecha del siniestro.',
          },
          {
            status:
              400,
          }
        )
      }


      // ======================================================
      // COSTOS
      // ======================================================

      const costoDirChoque =
        Number(
          body
            ?.costo_dir_choque_simple ??
          0
        )


      const costoIndChoque =
        Number(
          body
            ?.costo_indi_choque_simple ??
          0
        )


      const costoDirLeves =
        Number(
          body
            ?.costo_dir_heridos_l ??
          0
        )


      const costoIndLeves =
        Number(
          body
            ?.costo_indi_heridos_l ??
          0
        )


      const costoDirGraves =
        Number(
          body
            ?.costo_dir_heridos_g ??
          0
        )


      const costoIndGraves =
        Number(
          body
            ?.costo_indi_heridos_g ??
          0
        )


      const costoDirFatalidad =
        Number(
          body
            ?.costo_dir_fatalidad ??
          0
        )


      const costoIndFatalidad =
        Number(
          body
            ?.costo_indi_fatalidad ??
          0
        )


      // ======================================================
      // VALIDACIÓN DE LOS 8 COSTOS
      // ======================================================

      const costosValidar = [
        {
          nombre:
            'costo directo de choques simples',

          valor:
            costoDirChoque,
        },
        {
          nombre:
            'costo indirecto de choques simples',

          valor:
            costoIndChoque,
        },
        {
          nombre:
            'costo directo de heridos leves',

          valor:
            costoDirLeves,
        },
        {
          nombre:
            'costo indirecto de heridos leves',

          valor:
            costoIndLeves,
        },
        {
          nombre:
            'costo directo de heridos graves',

          valor:
            costoDirGraves,
        },
        {
          nombre:
            'costo indirecto de heridos graves',

          valor:
            costoIndGraves,
        },
        {
          nombre:
            'costo directo de fatalidades',

          valor:
            costoDirFatalidad,
        },
        {
          nombre:
            'costo indirecto de fatalidades',

          valor:
            costoIndFatalidad,
        },
      ]


      for (
        const costoItem of
          costosValidar
      ) {
        if (
          !validarNumeroMin0(
            costoItem.valor
          )
        ) {
          return NextResponse.json(
            {
              status:
                'failed',

              message:
                `El ${costoItem.nombre} debe ser un número válido mayor o igual a cero.`,
            },
            {
              status:
                400,
            }
          )
        }
      }


      // ======================================================
      // FECHA DE CIERRE
      // ======================================================

      const fechaCierre =
        hoyBogota()


      // ======================================================
      // PAYLOAD DEFINITIVO DE CIERRE
      // app/api/admin/consultas/siniestros/route.js
      // ======================================================

      const payload = {
        estado_analisis:
          ESTADO_CERRADO,

        fecha_estado_cerrado:
          fechaCierre,

        nombre_usuario_cerrado:
          responsable,

        resumen_analisis:
          resumenAnalisis,

        numero_ipat:
          normalizarTexto(
            body
              ?.numero_ipat
          ) ||
          null,

        autoridad:
          normalizarTexto(
            body
              ?.autoridad
          ) ||
          null,

        fecha_comite_analisis:
          fechaComiteAnalisis,

        costo_dir_choque_simple:
          costoDirChoque,

        costo_indi_choque_simple:
          costoIndChoque,

        costo_dir_heridos_l:
          costoDirLeves,

        costo_indi_heridos_l:
          costoIndLeves,

        costo_dir_heridos_g:
          costoDirGraves,

        costo_indi_heridos_g:
          costoIndGraves,

        costo_dir_fatalidad:
          costoDirFatalidad,

        costo_indi_fatalidad:
          costoIndFatalidad,
      }


      // ======================================================
      // ACTUALIZAR CIERRE
      //
      // La condición estado_analisis = EN ANÁLISIS evita
      // cerrar un registro cuyo estado haya cambiado
      // simultáneamente.
      // ======================================================

      const {
        data,
        error,
      } =
        await supabase
          .from('siniestros')
          .update(
            payload
          )
          .eq(
            'id',
            id
          )
          .eq(
            'estado_analisis',
            ESTADO_ANALISIS
          )
          .select(
            SELECT_SINIESTRO
          )
          .maybeSingle()


      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible cerrar el siniestro: ${error.message}`,
          },
          {
            status:
              500,
          }
        )
      }


      if (
        !data
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El estado del siniestro cambió antes de completar el cierre. Actualice la consulta e inténtelo nuevamente.',
          },
          {
            status:
              409,
          }
        )
      }


      return NextResponse.json({
        status:
          'success',

        message:
          'Análisis del siniestro cerrado correctamente.',

        registro:
          data,
      })
    }


    // ========================================================
    // ACCIÓN NO VÁLIDA
    // ========================================================

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
      'Error PATCH /api/admin/consultas/siniestros:',
      error
    )


    return respuestaError(
      error
    )
  }
}