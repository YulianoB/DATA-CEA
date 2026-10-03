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


const ESTADO_ACTA_BORRADOR = 'BORRADOR'
const ESTADO_ACTA_FINALIZADA = 'FINALIZADA'

const SELECT_ACTA = `
  id,
  siniestro_id,
  numero_acta,
  fecha_acta,
  tratamiento_realizado,
  acciones_preventivas,
  acuerdos_compromisos,
  responsables_compromisos,
  fecha_seguimiento,
  participantes,
  observaciones,
  estado,
  elaborado_por,
  finalizado_por,
  fecha_finalizacion,
  created_at,
  updated_at
`


// ============================================================
// SELECT VEHÍCULOS
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
// ACTA DE TRATAMIENTO DEL SINIESTRO
// ============================================================

async function obtenerActaPorSiniestro(
  supabase,
  siniestroId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from('siniestros_actas')
      .select(
        SELECT_ACTA
      )
      .eq(
        'siniestro_id',
        siniestroId
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      `No fue posible consultar el acta del siniestro: ${error.message}`
    )
  }

  return data || null
}


function normalizarParticipantes(valor) {
  if (!Array.isArray(valor)) {
    return []
  }

  return valor
    .map(
      participante => {
        if (
          typeof participante ===
          'string'
        ) {
          const nombre =
            normalizarTexto(
              participante
            )

          return nombre
            ? { nombre }
            : null
        }

        if (
          participante &&
          typeof participante ===
            'object'
        ) {
          const nombre =
            normalizarTexto(
              participante.nombre ||
              participante.nombre_completo ||
              ''
            )

          const cargo =
            normalizarTexto(
              participante.cargo ||
              participante.rol ||
              ''
            )

          const documento =
            normalizarTexto(
              participante.documento ||
              participante.identificacion ||
              ''
            )

          if (!nombre) {
            return null
          }

          return {
            nombre,
            cargo:
              cargo || null,
            documento:
              documento || null,
          }
        }

        return null
      }
    )
    .filter(Boolean)
}


function construirNumeroActa(
  siniestro
) {
  const consecutivo =
    normalizarMayusculas(
      siniestro?.consecutivo
    )
      .replace(
        /[^A-Z0-9_-]+/g,
        '-'
      )

  return consecutivo
    ? `ACT-${consecutivo}`
    : `ACT-SIN-${siniestro.id}`
}


function validarDatosActa({
  siniestro,
  fechaActa,
  tratamientoRealizado,
  accionesPreventivas,
  acuerdosCompromisos,
  participantes,
  finalizar = false,
}) {
  if (
    !fechaActa ||
    !fechaValida(
      fechaActa
    )
  ) {
    return 'La fecha del acta es obligatoria y debe ser válida.'
  }

  const hoy =
    hoyBogota()

  if (
    fechaActa >
    hoy
  ) {
    return 'La fecha del acta no puede ser futura.'
  }

  if (
    siniestro?.fecha_siniestro &&
    fechaActa <
      siniestro.fecha_siniestro
  ) {
    return 'La fecha del acta no puede ser anterior a la fecha del siniestro.'
  }

  if (!finalizar) {
    return ''
  }

  if (
    !tratamientoRealizado
  ) {
    return 'Debe registrar el tratamiento realizado antes de finalizar el acta.'
  }

  if (
    !accionesPreventivas
  ) {
    return 'Debe registrar las acciones preventivas antes de finalizar el acta.'
  }

  if (
    !acuerdosCompromisos
  ) {
    return 'Debe registrar los acuerdos y compromisos antes de finalizar el acta.'
  }

  if (
    !Array.isArray(
      participantes
    ) ||
    participantes.length === 0
  ) {
    return 'Debe registrar al menos un participante en el tratamiento del siniestro.'
  }

  return ''
}


function obtenerCostosDesdeBody(
  body,
  actual
) {
  return {
    costo_dir_choque_simple:
      Number(
        body?.costo_dir_choque_simple ??
        actual?.costo_dir_choque_simple ??
        0
      ),

    costo_indi_choque_simple:
      Number(
        body?.costo_indi_choque_simple ??
        actual?.costo_indi_choque_simple ??
        0
      ),

    costo_dir_heridos_l:
      Number(
        body?.costo_dir_heridos_l ??
        actual?.costo_dir_heridos_l ??
        0
      ),

    costo_indi_heridos_l:
      Number(
        body?.costo_indi_heridos_l ??
        actual?.costo_indi_heridos_l ??
        0
      ),

    costo_dir_heridos_g:
      Number(
        body?.costo_dir_heridos_g ??
        actual?.costo_dir_heridos_g ??
        0
      ),

    costo_indi_heridos_g:
      Number(
        body?.costo_indi_heridos_g ??
        actual?.costo_indi_heridos_g ??
        0
      ),

    costo_dir_fatalidad:
      Number(
        body?.costo_dir_fatalidad ??
        actual?.costo_dir_fatalidad ??
        0
      ),

    costo_indi_fatalidad:
      Number(
        body?.costo_indi_fatalidad ??
        actual?.costo_indi_fatalidad ??
        0
      ),
  }
}


function validarCostos(
  costos
) {
  const etiquetas = {
    costo_dir_choque_simple:
      'costo directo de choques simples',

    costo_indi_choque_simple:
      'costo indirecto de choques simples',

    costo_dir_heridos_l:
      'costo directo de heridos leves',

    costo_indi_heridos_l:
      'costo indirecto de heridos leves',

    costo_dir_heridos_g:
      'costo directo de heridos graves',

    costo_indi_heridos_g:
      'costo indirecto de heridos graves',

    costo_dir_fatalidad:
      'costo directo de fatalidades',

    costo_indi_fatalidad:
      'costo indirecto de fatalidades',
  }

  for (
    const [
      campo,
      valor,
    ] of
      Object.entries(
        costos
      )
  ) {
    if (
      !validarNumeroMin0(
        valor
      )
    ) {
      return `El ${etiquetas[campo]} debe ser un número válido mayor o igual a cero.`
    }
  }

  return ''
}


async function actualizarDatosTratamientoSiniestro({
  supabase,
  id,
  actual,
  body,
}) {
  const costos =
    obtenerCostosDesdeBody(
      body,
      actual
    )

  const errorCostos =
    validarCostos(
      costos
    )

  if (errorCostos) {
    return {
      error:
        errorCostos,
    }
  }

  const payload = {
    resumen_analisis:
      normalizarTexto(
        body?.resumen_analisis ??
        actual?.resumen_analisis
      ) ||
      null,

    numero_ipat:
      normalizarTexto(
        body?.numero_ipat ??
        actual?.numero_ipat
      ) ||
      null,

    autoridad:
      normalizarTexto(
        body?.autoridad ??
        actual?.autoridad
      ) ||
      null,

    ...costos,
  }

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
      .select(
        SELECT_SINIESTRO
      )
      .maybeSingle()

  if (error) {
    return {
      error:
        `No fue posible actualizar los datos del tratamiento: ${error.message}`,
    }
  }

  return {
    registro:
      data,
  }
}


async function guardarActa({
  supabase,
  siniestro,
  body,
  responsable,
  finalizar = false,
}) {
  const existente =
    await obtenerActaPorSiniestro(
      supabase,
      siniestro.id
    )

  if (
    existente?.estado ===
      ESTADO_ACTA_FINALIZADA &&
    !finalizar
  ) {
    return {
      status:
        409,

      error:
        'El acta ya está FINALIZADA y no puede ser modificada.',
    }
  }

  const fechaActa =
    normalizarTexto(
      body?.fecha_acta ||
      existente?.fecha_acta ||
      hoyBogota()
    )

  const tratamientoRealizado =
    normalizarTexto(
      body?.tratamiento_realizado ??
      existente?.tratamiento_realizado
    )

  const accionesPreventivas =
    normalizarTexto(
      body?.acciones_preventivas ??
      existente?.acciones_preventivas
    )

  const acuerdosCompromisos =
    normalizarTexto(
      body?.acuerdos_compromisos ??
      existente?.acuerdos_compromisos
    )

  const responsablesCompromisos =
    normalizarTexto(
      body?.responsables_compromisos ??
      existente?.responsables_compromisos
    )

  const fechaSeguimiento =
    normalizarTexto(
      body?.fecha_seguimiento ??
      existente?.fecha_seguimiento
    )

  const participantes =
    normalizarParticipantes(
      body?.participantes ??
      existente?.participantes
    )

  const observaciones =
    normalizarTexto(
      body?.observaciones ??
      existente?.observaciones
    )

  const errorActa =
    validarDatosActa({
      siniestro,
      fechaActa,
      tratamientoRealizado,
      accionesPreventivas,
      acuerdosCompromisos,
      participantes,
      finalizar,
    })

  if (errorActa) {
    return {
      status:
        400,

      error:
        errorActa,
    }
  }

  if (
    fechaSeguimiento &&
    !fechaValida(
      fechaSeguimiento
    )
  ) {
    return {
      status:
        400,

      error:
        'La fecha de seguimiento no tiene un formato válido.',
    }
  }

  if (
    fechaSeguimiento &&
    fechaSeguimiento <
      fechaActa
  ) {
    return {
      status:
        400,

      error:
        'La fecha de seguimiento no puede ser anterior a la fecha del acta.',
    }
  }

  const ahora =
    new Date()
      .toISOString()

  const payload = {
    siniestro_id:
      siniestro.id,

    numero_acta:
      existente?.numero_acta ||
      construirNumeroActa(
        siniestro
      ),

    fecha_acta:
      fechaActa,

    tratamiento_realizado:
      tratamientoRealizado,

    acciones_preventivas:
      accionesPreventivas,

    acuerdos_compromisos:
      acuerdosCompromisos,

    responsables_compromisos:
      responsablesCompromisos ||
      null,

    fecha_seguimiento:
      fechaSeguimiento ||
      null,

    participantes,

    observaciones:
      observaciones ||
      null,

    estado:
      finalizar
        ? ESTADO_ACTA_FINALIZADA
        : ESTADO_ACTA_BORRADOR,

    elaborado_por:
      existente?.elaborado_por ||
      responsable,

    finalizado_por:
      finalizar
        ? responsable
        : existente?.finalizado_por ||
          null,

    fecha_finalizacion:
      finalizar
        ? ahora
        : existente?.fecha_finalizacion ||
          null,

    updated_at:
      ahora,
  }

  let consulta

  if (existente) {
    consulta =
      supabase
        .from('siniestros_actas')
        .update(
          payload
        )
        .eq(
          'id',
          existente.id
        )
  } else {
    consulta =
      supabase
        .from('siniestros_actas')
        .insert(
          payload
        )
  }

  const {
    data,
    error,
  } =
    await consulta
      .select(
        SELECT_ACTA
      )
      .maybeSingle()

  if (error) {
    return {
      status:
        500,

      error:
        `No fue posible guardar el acta: ${error.message}`,
    }
  }

  return {
    acta:
      data,
  }
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
    // GET ACTA DE UN SINIESTRO
    // recurso=acta&id=<siniestro_id>
    // ========================================================

    if (
      recurso ===
      'acta'
    ) {
      const id =
        Number(
          searchParams.get(
            'id'
          )
        )

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

      const siniestro =
        await obtenerSiniestroPorId(
          supabase,
          id
        )

      if (!siniestro) {
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

      const acta =
        await obtenerActaPorSiniestro(
          supabase,
          id
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

        siniestro,

        acta,
      })
    }


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
    // ACCIÓN: GUARDAR TRATAMIENTO SIN CERRAR
    //
    // Permite guardar por etapas el análisis administrativo
    // y los costos antes de elaborar el acta.
    // ========================================================

    if (
      accion ===
      'guardar_tratamiento'
    ) {
      if (
        estadoActual !==
        ESTADO_ANALISIS
      ) {
        return NextResponse.json(
          {
            status: 'failed',
            message: 'El siniestro debe estar EN ANÁLISIS para guardar el tratamiento.',
          },
          { status: 409 }
        )
      }

      const actualizacion =
        await actualizarDatosTratamientoSiniestro({
          supabase,
          id,
          actual,
          body,
        })

      if (actualizacion.error) {
        return NextResponse.json(
          {
            status: 'failed',
            message: actualizacion.error,
          },
          { status: 400 }
        )
      }

      return NextResponse.json({
        status: 'success',
        message: 'Información del tratamiento guardada correctamente.',
        registro: actualizacion.registro,
      })
    }


    // ========================================================
    // ACCIÓN: GUARDAR ACTA EN BORRADOR
    // ========================================================

    if (
      accion ===
      'guardar_acta'
    ) {
      if (
        estadoActual !==
        ESTADO_ANALISIS
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El siniestro debe estar EN ANÁLISIS para elaborar o modificar el acta.',
          },
          {
            status:
              409,
          }
        )
      }

      const actualizacion =
        await actualizarDatosTratamientoSiniestro({
          supabase,
          id,
          actual,
          body,
        })

      if (
        actualizacion.error
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              actualizacion.error,
          },
          {
            status:
              400,
          }
        )
      }

      const resultado =
        await guardarActa({
          supabase,
          siniestro:
            actualizacion.registro ||
            actual,
          body,
          responsable,
          finalizar:
            false,
        })

      if (
        resultado.error
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              resultado.error,
          },
          {
            status:
              resultado.status ||
              400,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          'Borrador del acta guardado correctamente.',

        registro:
          actualizacion.registro,

        acta:
          resultado.acta,
      })
    }


    // ========================================================
    // ACCIÓN: FINALIZAR ACTA Y CERRAR SINIESTRO
    //
    // Regla:
    // - el siniestro debe estar EN ANÁLISIS
    // - el acta debe quedar FINALIZADA
    // - solamente entonces el siniestro pasa a CERRADO
    // ========================================================

    if (
      accion ===
      'finalizar_acta'
    ) {
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

      if (
        estadoActual !==
        ESTADO_ANALISIS
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El siniestro debe estar EN ANÁLISIS antes de finalizar el acta.',
          },
          {
            status:
              409,
          }
        )
      }

      const actualizacion =
        await actualizarDatosTratamientoSiniestro({
          supabase,
          id,
          actual,
          body,
        })

      if (
        actualizacion.error
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              actualizacion.error,
          },
          {
            status:
              400,
          }
        )
      }

      const siniestroActualizado =
        actualizacion.registro ||
        actual

      const resultadoActa =
        await guardarActa({
          supabase,
          siniestro:
            siniestroActualizado,
          body,
          responsable,
          finalizar:
            true,
        })

      if (
        resultadoActa.error
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              resultadoActa.error,
          },
          {
            status:
              resultadoActa.status ||
              400,
          }
        )
      }

      const fechaCierre =
        hoyBogota()

      const resumenAnalisis =
        normalizarTexto(
          body?.resumen_analisis ??
          siniestroActualizado
            ?.resumen_analisis
        ) ||
        normalizarTexto(
          body?.tratamiento_realizado ??
          resultadoActa.acta
            ?.tratamiento_realizado
        )

      const {
        data,
        error,
      } =
        await supabase
          .from('siniestros')
          .update({
            estado_analisis:
              ESTADO_CERRADO,

            fecha_estado_cerrado:
              fechaCierre,

            nombre_usuario_cerrado:
              responsable,

            resumen_analisis:
              resumenAnalisis ||
              null,

            // Campo histórico. Ya no representa un comité.
            // Se conserva sin modificar hasta retirar la
            // columna en una migración posterior.
            fecha_comite_analisis:
              siniestroActualizado
                ?.fecha_comite_analisis ||
              null,
          })
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
              `El acta quedó finalizada, pero no fue posible cerrar el siniestro: ${error.message}. Intente finalizar nuevamente.`,
          },
          {
            status:
              500,
          }
        )
      }

      if (!data) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El acta quedó finalizada, pero el estado del siniestro cambió antes de completar el cierre. Actualice la consulta.',
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
          'Acta finalizada y siniestro cerrado correctamente.',

        registro:
          data,

        acta:
          resultadoActa.acta,
      })
    }


    // ========================================================
    // ACCIÓN HISTÓRICA: CERRAR SINIESTRO
    //
    // Se bloquea el cierre directo. El cierre ahora depende
    // de la finalización del acta de tratamiento.
    // ========================================================

    if (
      accion ===
      'cerrar_siniestro'
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El cierre directo fue reemplazado por el acta de tratamiento. Finalice el acta para cerrar el siniestro.',
        },
        {
          status:
            409,
        }
      )
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