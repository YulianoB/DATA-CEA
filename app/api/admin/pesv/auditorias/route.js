// app/api/admin/pesv/auditorias/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'


// ============================================================
// CONSTANTES
// app/api/admin/pesv/auditorias/route.js
// ============================================================

const TIPOS_AUDITORIA = new Set([
  'INTERNA',
  'EXTERNA',
  'SEGUIMIENTO',
  'ESPECIAL',
])

const ESTADOS_AUDITORIA = new Set([
  'PROGRAMADA',
  'EN_PROCESO',
  'FINALIZADA',
  'CERRADA',
  'CANCELADA',
])

const TIPOS_HALLAZGO = new Set([
  'NO_CONFORMIDAD',
  'OBSERVACION',
  'OPORTUNIDAD_MEJORA',
  'FORTALEZA',
])

const CLASIFICACIONES_HALLAZGO = new Set([
  'MAYOR',
  'MENOR',
  'NO_APLICA',
])

const PRIORIDADES_HALLAZGO = new Set([
  'ALTA',
  'MEDIA',
  'BAJA',
])

const ESTADOS_HALLAZGO = new Set([
  'ABIERTO',
  'EN_TRATAMIENTO',
  'PENDIENTE_VERIFICACION',
  'CERRADO',
])

const TIPOS_ACCION = new Set([
  'CORRECCION',
  'CORRECTIVA',
  'MEJORA',
  'PREVENTIVA',
  'OTRA',
])

const ESTADOS_ACCION = new Set([
  'PENDIENTE',
  'EN_PROCESO',
  'IMPLEMENTADA',
  'VERIFICADA',
  'CERRADA',
  'CANCELADA',
])


// ============================================================
// RESPUESTAS
// app/api/admin/pesv/auditorias/route.js
// ============================================================

function respuestaOk(
  data = {},
  status = 200
) {
  return NextResponse.json(
    {
      status: 'success',
      ...data,
    },
    {
      status,
    }
  )
}


function respuestaFallida(
  message,
  status = 400,
  extra = {}
) {
  return NextResponse.json(
    {
      status: 'failed',
      message,
      ...extra,
    },
    {
      status,
    }
  )
}


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


// ============================================================
// HELPERS GENERALES
// app/api/admin/pesv/auditorias/route.js
// ============================================================

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


function enteroPositivo(
  valor
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
    return null
  }

  return numero
}


function numeroNoNegativo(
  valor
) {
  if (
    valor === '' ||
    valor === null ||
    valor === undefined
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
    ) ||
    numero < 0
  ) {
    return null
  }

  return numero
}


function booleano(
  valor
) {
  if (
    valor === true ||
    valor === false
  ) {
    return valor
  }

  if (
    valor === 'true' ||
    valor === '1' ||
    valor === 1
  ) {
    return true
  }

  if (
    valor === 'false' ||
    valor === '0' ||
    valor === 0
  ) {
    return false
  }

  return false
}


function fechaOTextoVacio(
  valor
) {
  const fecha =
    texto(
      valor
    )

  return fecha || null
}


function ahoraIso() {
  return new Date()
    .toISOString()
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


function construirEmpresa(
  empresa
) {
  return {
    nit:
      empresa?.nit ||
      '',

    nombre:
      nombreEmpresa(
        empresa
      ),

    razon_social:
      empresa?.razon_social ||
      empresa?.nombre ||
      '',
  }
}


function normalizarUsuario(
  body
) {
  return (
    texto(
      body?.usuario_actualizacion
    ) ||
    texto(
      body?.usuario_creacion
    ) ||
    texto(
      body?.usuario
    ) ||
    null
  )
}


// ============================================================
// VALIDADORES
// app/api/admin/pesv/auditorias/route.js
// ============================================================

function validarAnio(
  valor
) {
  const anio =
    Number(
      valor
    )

  if (
    !Number.isInteger(
      anio
    ) ||
    anio < 2020 ||
    anio > 2100
  ) {
    return null
  }

  return anio
}


function validarValorSet(
  valor,
  valoresPermitidos,
  {
    permitirVacio = false,
  } = {}
) {
  const valorNormalizado =
    mayusculas(
      valor
    )

  if (
    permitirVacio &&
    !valorNormalizado
  ) {
    return null
  }

  return valoresPermitidos.has(
    valorNormalizado
  )
    ? valorNormalizado
    : undefined
}


// ============================================================
// CÓDIGOS Y CONSECUTIVOS
// app/api/admin/pesv/auditorias/route.js
// ============================================================

function prefijoHallazgo(
  tipo
) {
  switch (
    mayusculas(
      tipo
    )
  ) {
    case 'NO_CONFORMIDAD':
      return 'NC'

    case 'OBSERVACION':
      return 'OBS'

    case 'OPORTUNIDAD_MEJORA':
      return 'OM'

    case 'FORTALEZA':
      return 'F'

    default:
      return 'H'
  }
}


async function siguienteCodigoAuditoria(
  supabase,
  anio
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_auditorias'
      )
      .select(
        'codigo'
      )
      .eq(
        'anio',
        anio
      )

  if (
    error
  ) {
    throw error
  }

  let maximo = 0

  for (
    const item of
      data || []
  ) {
    const codigo =
      texto(
        item?.codigo
      )

    const coincidencia =
      codigo.match(
        /(\d+)\s*$/
      )

    if (
      coincidencia
    ) {
      const numero =
        Number(
          coincidencia[1]
        )

      if (
        Number.isFinite(
          numero
        ) &&
        numero > maximo
      ) {
        maximo =
          numero
      }
    }
  }

  return `AUD-${anio}-${String(
    maximo + 1
  ).padStart(
    3,
    '0'
  )}`
}


async function siguienteNumeroHallazgo(
  supabase,
  auditoriaId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_auditoria_hallazgos'
      )
      .select(
        'numero'
      )
      .eq(
        'auditoria_id',
        auditoriaId
      )
      .order(
        'numero',
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
    throw error
  }

  return (
    Number(
      data?.[0]?.numero ||
      0
    ) + 1
  )
}


async function siguienteNumeroAccion(
  supabase,
  hallazgoId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_auditoria_acciones'
      )
      .select(
        'numero'
      )
      .eq(
        'hallazgo_id',
        hallazgoId
      )
      .order(
        'numero',
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
    throw error
  }

  return (
    Number(
      data?.[0]?.numero ||
      0
    ) + 1
  )
}


async function siguienteNumeroSeguimiento(
  supabase,
  accionId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_auditoria_seguimientos'
      )
      .select(
        'numero'
      )
      .eq(
        'accion_id',
        accionId
      )
      .order(
        'numero',
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
    throw error
  }

  return (
    Number(
      data?.[0]?.numero ||
      0
    ) + 1
  )
}


// ============================================================
// VERIFICAR REGISTROS PADRE
// app/api/admin/pesv/auditorias/route.js
// ============================================================

async function obtenerAuditoriaPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_auditorias'
      )
      .select(
        '*'
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  return data
}


async function obtenerHallazgoPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_auditoria_hallazgos'
      )
      .select(
        '*'
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  return data
}


async function obtenerAccionPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_auditoria_acciones'
      )
      .select(
        '*'
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  return data
}


async function obtenerSeguimientoPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_auditoria_seguimientos'
      )
      .select(
        '*'
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  return data
}


// ============================================================
// PERSONAL
// app/api/admin/pesv/auditorias/route.js
//
// Solo usamos campos conocidos de la tabla personal.
// El cargo podrá escribirse de forma histórica en la auditoría.
// ============================================================

async function obtenerPersonal(
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
      .select(
        `
          id,
          nombres,
          apellidos,
          documento,
          email
        `
      )
      .order(
        'nombres',
        {
          ascending:
            true,
        }
      )
      .limit(
        500
      )

  if (
    error
  ) {
    console.error(
      'Error consultando personal para Auditorías PESV:',
      error
    )

    return []
  }

  return (
    data || []
  ).map(
    item => ({
      ...item,

      nombre_completo:
        `${texto(
          item?.nombres
        )} ${texto(
          item?.apellidos
        )}`.trim(),
    })
  )
}


// ============================================================
// ENRIQUECER AUDITORÍAS
// app/api/admin/pesv/auditorias/route.js
// ============================================================

async function enriquecerAuditorias(
  supabase,
  auditorias
) {
  const listaAuditorias =
    Array.isArray(
      auditorias
    )
      ? auditorias
      : []

  if (
    listaAuditorias.length ===
    0
  ) {
    return []
  }

  const auditoriaIds =
    listaAuditorias
      .map(
        item =>
          Number(
            item.id
          )
      )
      .filter(
        Number.isFinite
      )

  // ----------------------------------------------------------
  // HALLAZGOS
  // ----------------------------------------------------------

  const {
    data:
      hallazgosData,
    error:
      hallazgosError,
  } =
    await supabase
      .from(
        'pesv_auditoria_hallazgos'
      )
      .select(
        '*'
      )
      .in(
        'auditoria_id',
        auditoriaIds
      )
      .order(
        'numero',
        {
          ascending:
            true,
        }
      )

  if (
    hallazgosError
  ) {
    throw hallazgosError
  }

  const hallazgos =
    hallazgosData ||
    []

  const hallazgoIds =
    hallazgos
      .map(
        item =>
          Number(
            item.id
          )
      )
      .filter(
        Number.isFinite
      )

  // ----------------------------------------------------------
  // ACCIONES
  // ----------------------------------------------------------

  let acciones = []

  if (
    hallazgoIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'pesv_auditoria_acciones'
        )
        .select(
          '*'
        )
        .in(
          'hallazgo_id',
          hallazgoIds
        )
        .order(
          'numero',
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

    acciones =
      data ||
      []
  }

  const accionIds =
    acciones
      .map(
        item =>
          Number(
            item.id
          )
      )
      .filter(
        Number.isFinite
      )

  // ----------------------------------------------------------
  // SEGUIMIENTOS
  // ----------------------------------------------------------

  let seguimientos = []

  if (
    accionIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'pesv_auditoria_seguimientos'
        )
        .select(
          '*'
        )
        .in(
          'accion_id',
          accionIds
        )
        .order(
          'numero',
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

    seguimientos =
      data ||
      []
  }

  // ----------------------------------------------------------
  // MAPAS
  // ----------------------------------------------------------

  const seguimientosPorAccion =
    new Map()

  for (
    const seguimiento of
      seguimientos
  ) {
    const key =
      Number(
        seguimiento.accion_id
      )

    if (
      !seguimientosPorAccion.has(
        key
      )
    ) {
      seguimientosPorAccion.set(
        key,
        []
      )
    }

    seguimientosPorAccion
      .get(
        key
      )
      .push(
        seguimiento
      )
  }


  const accionesPorHallazgo =
    new Map()

  for (
    const accion of
      acciones
  ) {
    const key =
      Number(
        accion.hallazgo_id
      )

    if (
      !accionesPorHallazgo.has(
        key
      )
    ) {
      accionesPorHallazgo.set(
        key,
        []
      )
    }

    accionesPorHallazgo
      .get(
        key
      )
      .push({
        ...accion,

        seguimientos:
          seguimientosPorAccion.get(
            Number(
              accion.id
            )
          ) ||
          [],
      })
  }


  const hallazgosPorAuditoria =
    new Map()

  for (
    const hallazgo of
      hallazgos
  ) {
    const key =
      Number(
        hallazgo.auditoria_id
      )

    if (
      !hallazgosPorAuditoria.has(
        key
      )
    ) {
      hallazgosPorAuditoria.set(
        key,
        []
      )
    }

    hallazgosPorAuditoria
      .get(
        key
      )
      .push({
        ...hallazgo,

        acciones:
          accionesPorHallazgo.get(
            Number(
              hallazgo.id
            )
          ) ||
          [],
      })
  }

  // ----------------------------------------------------------
  // RESPUESTA FINAL
  // ----------------------------------------------------------

  return listaAuditorias.map(
    auditoria => {
      const hallazgosAuditoria =
        hallazgosPorAuditoria.get(
          Number(
            auditoria.id
          )
        ) ||
        []

      const noConformidades =
        hallazgosAuditoria.filter(
          item =>
            item.tipo_hallazgo ===
            'NO_CONFORMIDAD'
        )

      const observaciones =
        hallazgosAuditoria.filter(
          item =>
            item.tipo_hallazgo ===
            'OBSERVACION'
        )

      const oportunidades =
        hallazgosAuditoria.filter(
          item =>
            item.tipo_hallazgo ===
            'OPORTUNIDAD_MEJORA'
        )

      const fortalezas =
        hallazgosAuditoria.filter(
          item =>
            item.tipo_hallazgo ===
            'FORTALEZA'
        )

      const accionesAuditoria =
        hallazgosAuditoria.flatMap(
          item =>
            item.acciones ||
            []
        )

      const accionesPendientes =
        accionesAuditoria.filter(
          item =>
            ![
              'CERRADA',
              'CANCELADA',
            ].includes(
              item.estado
            )
        )

      return {
        ...auditoria,

        hallazgos:
          hallazgosAuditoria,

        resumen: {
          total_hallazgos:
            hallazgosAuditoria.length,

          no_conformidades:
            noConformidades.length,

          observaciones:
            observaciones.length,

          oportunidades_mejora:
            oportunidades.length,

          fortalezas:
            fortalezas.length,

          total_acciones:
            accionesAuditoria.length,

          acciones_pendientes:
            accionesPendientes.length,
        },
      }
    }
  )
}


// ============================================================
// RESUMEN GENERAL
// app/api/admin/pesv/auditorias/route.js
// ============================================================

function construirResumenGeneral(
  auditorias
) {
  const lista =
    Array.isArray(
      auditorias
    )
      ? auditorias
      : []

  const resumen = {
    total:
      lista.length,

    programadas:
      0,

    en_proceso:
      0,

    finalizadas:
      0,

    cerradas:
      0,

    canceladas:
      0,

    total_hallazgos:
      0,

    no_conformidades:
      0,

    observaciones:
      0,

    oportunidades_mejora:
      0,

    fortalezas:
      0,

    acciones_pendientes:
      0,
  }

  for (
    const auditoria of
      lista
  ) {
    switch (
      auditoria.estado
    ) {
      case 'PROGRAMADA':
        resumen.programadas +=
          1
        break

      case 'EN_PROCESO':
        resumen.en_proceso +=
          1
        break

      case 'FINALIZADA':
        resumen.finalizadas +=
          1
        break

      case 'CERRADA':
        resumen.cerradas +=
          1
        break

      case 'CANCELADA':
        resumen.canceladas +=
          1
        break

      default:
        break
    }

    resumen.total_hallazgos +=
      Number(
        auditoria
          ?.resumen
          ?.total_hallazgos ||
        0
      )

    resumen.no_conformidades +=
      Number(
        auditoria
          ?.resumen
          ?.no_conformidades ||
        0
      )

    resumen.observaciones +=
      Number(
        auditoria
          ?.resumen
          ?.observaciones ||
        0
      )

    resumen.oportunidades_mejora +=
      Number(
        auditoria
          ?.resumen
          ?.oportunidades_mejora ||
        0
      )

    resumen.fortalezas +=
      Number(
        auditoria
          ?.resumen
          ?.fortalezas ||
        0
      )

    resumen.acciones_pendientes +=
      Number(
        auditoria
          ?.resumen
          ?.acciones_pendientes ||
        0
      )
  }

  return resumen
}


// ============================================================
// GET AUDITORÍAS / NO CONFORMIDADES
// app/api/admin/pesv/auditorias/route.js
//
// Parámetros:
// ?anio=2026
// ?id=1
//
// Si se envía id devuelve además "auditoria".
// ============================================================

export async function GET(
  request
) {
  try {
    const {
      empresa,
      supabaseAdmin:
        supabase,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const url =
      new URL(
        request.url
      )

    const id =
      enteroPositivo(
        url.searchParams.get(
          'id'
        )
      )

    const anioParametro =
      url.searchParams.get(
        'anio'
      )

    const anio =
      anioParametro
        ? validarAnio(
            anioParametro
          )
        : new Date()
            .getFullYear()

    if (
      anioParametro &&
      !anio
    ) {
      return respuestaFallida(
        'La vigencia enviada no es válida.',
        400
      )
    }

    let consulta =
      supabase
        .from(
          'pesv_auditorias'
        )
        .select(
          '*'
        )

    if (
      id
    ) {
      consulta =
        consulta.eq(
          'id',
          id
        )
    } else {
      consulta =
        consulta.eq(
          'anio',
          anio
        )
    }

    const {
      data:
        auditoriasData,
      error:
        auditoriasError,
    } =
      await consulta
        .order(
          'fecha_programada',
          {
            ascending:
              false,
            nullsFirst:
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

    if (
      auditoriasError
    ) {
      throw auditoriasError
    }

    const auditorias =
      await enriquecerAuditorias(
        supabase,
        auditoriasData ||
        []
      )

    const personal =
      await obtenerPersonal(
        supabase
      )

    const resumen =
      construirResumenGeneral(
        auditorias
      )

    const auditoria =
      id
        ? auditorias[0] ||
          null
        : null

    if (
      id &&
      !auditoria
    ) {
      return respuestaFallida(
        'La auditoría solicitada no existe.',
        404
      )
    }

    return respuestaOk({
      empresa:
        construirEmpresa(
          empresa
        ),

      anio:
        auditoria?.anio ||
        anio,

      auditorias,

      auditoria,

      personal,

      resumen,
    })
  } catch (
    error
  ) {
    console.error(
      'GET /api/admin/pesv/auditorias:',
      error
    )

    return respuestaError(
      error
    )
  }
}


// ============================================================
// POST AUDITORÍAS / NO CONFORMIDADES
// app/api/admin/pesv/auditorias/route.js
//
// Acciones:
// - crear_auditoria
// - crear_hallazgo
// - crear_accion
// - crear_seguimiento
// ============================================================

export async function POST(
  request
) {
  try {
    const body =
      await request.json()

   const accion =
  mayusculas(
    body?.accion ||
    body?.action
  ).toLowerCase()
  
    const {
      empresa,
      supabaseAdmin:
        supabase,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const usuario =
      normalizarUsuario(
        body
      )

    // ========================================================
    // CREAR AUDITORÍA
    // ========================================================

    if (
      accion ===
      'crear_auditoria'
    ) {
      const anio =
        validarAnio(
          body?.anio
        )

      if (
        !anio
      ) {
        return respuestaFallida(
          'La vigencia de la auditoría no es válida.'
        )
      }

      const tipoAuditoria =
        validarValorSet(
          body?.tipo_auditoria ||
          'INTERNA',
          TIPOS_AUDITORIA
        )

      if (
        !tipoAuditoria
      ) {
        return respuestaFallida(
          'El tipo de auditoría no es válido.'
        )
      }

      const estado =
        validarValorSet(
          body?.estado ||
          'PROGRAMADA',
          ESTADOS_AUDITORIA
        )

      if (
        !estado
      ) {
        return respuestaFallida(
          'El estado de la auditoría no es válido.'
        )
      }

      const nombre =
        texto(
          body?.nombre
        )

      const objetivo =
        texto(
          body?.objetivo
        )

      const alcance =
        texto(
          body?.alcance
        )

      if (
        !nombre
      ) {
        return respuestaFallida(
          'El nombre de la auditoría es obligatorio.'
        )
      }

      if (
        !objetivo
      ) {
        return respuestaFallida(
          'El objetivo de la auditoría es obligatorio.'
        )
      }

      if (
        !alcance
      ) {
        return respuestaFallida(
          'El alcance de la auditoría es obligatorio.'
        )
      }

      let codigo =
        mayusculas(
          body?.codigo
        )

      if (
        !codigo
      ) {
        codigo =
          await siguienteCodigoAuditoria(
            supabase,
            anio
          )
      }

      const fechaProgramada =
        fechaOTextoVacio(
          body?.fecha_programada
        )

      const fechaEjecucion =
        fechaOTextoVacio(
          body?.fecha_ejecucion
        )

      const fechaCierre =
        fechaOTextoVacio(
          body?.fecha_cierre
        )

      const ahora =
        ahoraIso()

      const registro = {
        anio,

        codigo,

        nombre,

        tipo_auditoria:
          tipoAuditoria,

        fecha_programada:
          fechaProgramada,

        fecha_ejecucion:
          fechaEjecucion,

        alcance,

        objetivo,

        criterios:
          texto(
            body?.criterios
          ) ||
          null,

        metodologia:
          texto(
            body?.metodologia
          ) ||
          null,

        lugar:
          texto(
            body?.lugar
          ) ||
          null,

        auditor_personal_id:
          enteroPositivo(
            body
              ?.auditor_personal_id
          ),

        auditor_nombre:
          texto(
            body?.auditor_nombre
          ) ||
          null,

        auditor_cargo:
          texto(
            body?.auditor_cargo
          ) ||
          null,

        auditor_correo:
          texto(
            body?.auditor_correo
          ) ||
          null,

        responsable_area_personal_id:
          enteroPositivo(
            body
              ?.responsable_area_personal_id
          ),

        responsable_area_nombre:
          texto(
            body
              ?.responsable_area_nombre
          ) ||
          null,

        area_proceso_auditado:
          texto(
            body
              ?.area_proceso_auditado
          ) ||
          null,

        estado,

        resultado_general:
          texto(
            body
              ?.resultado_general
          ) ||
          null,

        fortalezas_generales:
          texto(
            body
              ?.fortalezas_generales
          ) ||
          null,

        oportunidades_mejora_generales:
          texto(
            body
              ?.oportunidades_mejora_generales
          ) ||
          null,

        conclusion:
          texto(
            body?.conclusion
          ) ||
          null,

        observaciones_finales:
          texto(
            body
              ?.observaciones_finales
          ) ||
          null,

        fecha_cierre:
          fechaCierre,

        evidencia_path:
          texto(
            body?.evidencia_path
          ) ||
          null,

        informe_path:
          texto(
            body?.informe_path
          ) ||
          null,

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        usuario_creacion:
          usuario,

        usuario_actualizacion:
          usuario,

        created_at:
          ahora,

        updated_at:
          ahora,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_auditorias'
          )
          .insert(
            registro
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        if (
          error.code ===
          '23505'
        ) {
          return respuestaFallida(
            `Ya existe una auditoría con el código ${codigo} para la vigencia ${anio}.`,
            409
          )
        }

        throw error
      }

      return respuestaOk(
        {
          empresa:
            construirEmpresa(
              empresa
            ),

          auditoria:
            data,

          message:
            'Auditoría creada correctamente.',
        },
        201
      )
    }


    // ========================================================
    // CREAR HALLAZGO / NO CONFORMIDAD
    // ========================================================

    if (
      accion ===
      'crear_hallazgo'
    ) {
      const auditoriaId =
        enteroPositivo(
          body?.auditoria_id
        )

      if (
        !auditoriaId
      ) {
        return respuestaFallida(
          'Debe indicar la auditoría del hallazgo.'
        )
      }

      const auditoria =
        await obtenerAuditoriaPorId(
          supabase,
          auditoriaId
        )

      if (
        !auditoria
      ) {
        return respuestaFallida(
          'La auditoría indicada no existe.',
          404
        )
      }

      const tipoHallazgo =
        validarValorSet(
          body?.tipo_hallazgo,
          TIPOS_HALLAZGO
        )

      if (
        !tipoHallazgo
      ) {
        return respuestaFallida(
          'El tipo de hallazgo no es válido.'
        )
      }

      const descripcion =
        texto(
          body?.descripcion
        )

      if (
        !descripcion
      ) {
        return respuestaFallida(
          'La descripción del hallazgo es obligatoria.'
        )
      }

      const clasificacion =
        validarValorSet(
          body?.clasificacion,
          CLASIFICACIONES_HALLAZGO,
          {
            permitirVacio:
              true,
          }
        )

      if (
        clasificacion ===
        undefined
      ) {
        return respuestaFallida(
          'La clasificación del hallazgo no es válida.'
        )
      }

      const prioridad =
        validarValorSet(
          body?.prioridad,
          PRIORIDADES_HALLAZGO,
          {
            permitirVacio:
              true,
          }
        )

      if (
        prioridad ===
        undefined
      ) {
        return respuestaFallida(
          'La prioridad del hallazgo no es válida.'
        )
      }

      const numero =
        await siguienteNumeroHallazgo(
          supabase,
          auditoriaId
        )

      const codigo =
        mayusculas(
          body?.codigo
        ) ||
        `${prefijoHallazgo(
          tipoHallazgo
        )}-${String(
          numero
        ).padStart(
          2,
          '0'
        )}`

      const ahora =
        ahoraIso()

      const registro = {
        auditoria_id:
          auditoriaId,

        numero,

        codigo,

        fecha_hallazgo:
          fechaOTextoVacio(
            body?.fecha_hallazgo
          ) ||
          new Date()
            .toISOString()
            .slice(
              0,
              10
            ),

        tipo_hallazgo:
          tipoHallazgo,

        requisito:
          texto(
            body?.requisito
          ) ||
          null,

        criterio:
          texto(
            body?.criterio
          ) ||
          null,

        proceso_area:
          texto(
            body?.proceso_area
          ) ||
          null,

        descripcion,

        evidencia:
          texto(
            body?.evidencia
          ) ||
          null,

        causa:
          texto(
            body?.causa
          ) ||
          null,

        consecuencia:
          texto(
            body?.consecuencia
          ) ||
          null,

        clasificacion,

        prioridad,

        responsable_personal_id:
          enteroPositivo(
            body
              ?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body
              ?.responsable_nombre
          ) ||
          null,

        estado:
          validarValorSet(
            body?.estado ||
            'ABIERTO',
            ESTADOS_HALLAZGO
          ) ||
          'ABIERTO',

        fecha_cierre:
          fechaOTextoVacio(
            body?.fecha_cierre
          ),

        verificacion_cierre:
          texto(
            body
              ?.verificacion_cierre
          ) ||
          null,

        evidencia_path:
          texto(
            body?.evidencia_path
          ) ||
          null,

        created_at:
          ahora,

        updated_at:
          ahora,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_auditoria_hallazgos'
          )
          .insert(
            registro
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        throw error
      }

      return respuestaOk(
        {
          hallazgo:
            data,

          message:
            'Hallazgo registrado correctamente.',
        },
        201
      )
    }


    // ========================================================
    // CREAR ACCIÓN
    // ========================================================

    if (
      accion ===
      'crear_accion'
    ) {
      const hallazgoId =
        enteroPositivo(
          body?.hallazgo_id
        )

      if (
        !hallazgoId
      ) {
        return respuestaFallida(
          'Debe indicar el hallazgo asociado a la acción.'
        )
      }

      const hallazgo =
        await obtenerHallazgoPorId(
          supabase,
          hallazgoId
        )

      if (
        !hallazgo
      ) {
        return respuestaFallida(
          'El hallazgo indicado no existe.',
          404
        )
      }

      const tipoAccion =
        validarValorSet(
          body?.tipo_accion,
          TIPOS_ACCION
        )

      if (
        !tipoAccion
      ) {
        return respuestaFallida(
          'El tipo de acción no es válido.'
        )
      }

      const descripcion =
        texto(
          body?.descripcion
        )

      if (
        !descripcion
      ) {
        return respuestaFallida(
          'La descripción de la acción es obligatoria.'
        )
      }

      const estado =
        validarValorSet(
          body?.estado ||
          'PENDIENTE',
          ESTADOS_ACCION
        )

      if (
        !estado
      ) {
        return respuestaFallida(
          'El estado de la acción no es válido.'
        )
      }

      const numero =
        await siguienteNumeroAccion(
          supabase,
          hallazgoId
        )

      const ahora =
        ahoraIso()

      const registro = {
        hallazgo_id:
          hallazgoId,

        numero,

        fecha_accion:
          fechaOTextoVacio(
            body?.fecha_accion
          ) ||
          new Date()
            .toISOString()
            .slice(
              0,
              10
            ),

        tipo_accion:
          tipoAccion,

        descripcion,

        evidencia_esperada:
          texto(
            body
              ?.evidencia_esperada
          ) ||
          null,

        responsable_personal_id:
          enteroPositivo(
            body
              ?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body
              ?.responsable_nombre
          ) ||
          null,

        responsable_cargo:
          texto(
            body
              ?.responsable_cargo
          ) ||
          null,

        fecha_compromiso:
          fechaOTextoVacio(
            body
              ?.fecha_compromiso
          ),

        fecha_implementacion:
          fechaOTextoVacio(
            body
              ?.fecha_implementacion
          ),

        estado,

        resultado:
          texto(
            body?.resultado
          ) ||
          null,

        evidencia_path:
          texto(
            body
              ?.evidencia_path
          ) ||
          null,

        fecha_cierre:
          fechaOTextoVacio(
            body?.fecha_cierre
          ),

        observaciones:
          texto(
            body
              ?.observaciones
          ) ||
          null,

        created_at:
          ahora,

        updated_at:
          ahora,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_auditoria_acciones'
          )
          .insert(
            registro
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        throw error
      }

      return respuestaOk(
        {
          accion:
            data,

          message:
            'Acción registrada correctamente.',
        },
        201
      )
    }


    // ========================================================
    // CREAR SEGUIMIENTO
    // ========================================================

    if (
      accion ===
      'crear_seguimiento'
    ) {
      const accionId =
        enteroPositivo(
          body?.accion_id
        )

      if (
        !accionId
      ) {
        return respuestaFallida(
          'Debe indicar la acción asociada al seguimiento.'
        )
      }

      const accionEncontrada =
        await obtenerAccionPorId(
          supabase,
          accionId
        )

      if (
        !accionEncontrada
      ) {
        return respuestaFallida(
          'La acción indicada no existe.',
          404
        )
      }

      const descripcion =
        texto(
          body?.descripcion
        )

      if (
        !descripcion
      ) {
        return respuestaFallida(
          'La descripción del seguimiento es obligatoria.'
        )
      }

      const avance =
        numeroNoNegativo(
          body
            ?.avance_porcentaje
        )

      if (
        avance !== null &&
        avance > 100
      ) {
        return respuestaFallida(
          'El porcentaje de avance debe estar entre 0 y 100.'
        )
      }

      const numero =
        await siguienteNumeroSeguimiento(
          supabase,
          accionId
        )

      const ahora =
        ahoraIso()

      const registro = {
        accion_id:
          accionId,

        numero,

        fecha_seguimiento:
          fechaOTextoVacio(
            body
              ?.fecha_seguimiento
          ) ||
          new Date()
            .toISOString()
            .slice(
              0,
              10
            ),

        descripcion,

        resultado:
          texto(
            body?.resultado
          ) ||
          null,

        avance_porcentaje:
          avance,

        implementacion_verificada:
          booleano(
            body
              ?.implementacion_verificada
          ),

        eficacia_verificada:
          booleano(
            body
              ?.eficacia_verificada
          ),

        resultado_eficacia:
          texto(
            body
              ?.resultado_eficacia
          ) ||
          null,

        responsable_personal_id:
          enteroPositivo(
            body
              ?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body
              ?.responsable_nombre
          ) ||
          null,

        requiere_nuevo_seguimiento:
          booleano(
            body
              ?.requiere_nuevo_seguimiento
          ),

        fecha_proximo_seguimiento:
          fechaOTextoVacio(
            body
              ?.fecha_proximo_seguimiento
          ),

        evidencia:
          texto(
            body?.evidencia
          ) ||
          null,

        evidencia_path:
          texto(
            body
              ?.evidencia_path
          ) ||
          null,

        observaciones:
          texto(
            body
              ?.observaciones
          ) ||
          null,

        created_at:
          ahora,

        updated_at:
          ahora,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_auditoria_seguimientos'
          )
          .insert(
            registro
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        throw error
      }

      return respuestaOk(
        {
          seguimiento:
            data,

          message:
            'Seguimiento registrado correctamente.',
        },
        201
      )
    }


    return respuestaFallida(
      'La acción solicitada no es válida.'
    )
  } catch (
    error
  ) {
    console.error(
      'POST /api/admin/pesv/auditorias:',
      error
    )

    return respuestaError(
      error
    )
  }
}


// ============================================================
// PATCH AUDITORÍAS / NO CONFORMIDADES
// app/api/admin/pesv/auditorias/route.js
//
// Acciones:
// - actualizar_auditoria
// - actualizar_hallazgo
// - actualizar_accion
// - actualizar_seguimiento
// ============================================================

export async function PATCH(
  request
) {
  try {
    const body =
      await request.json()

    const accion =
      mayusculas(
        body?.accion
      ).toLowerCase()

    const {
      supabaseAdmin:
        supabase,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const usuario =
      normalizarUsuario(
        body
      )

    // ========================================================
    // ACTUALIZAR AUDITORÍA
    // ========================================================

    if (
      accion ===
      'actualizar_auditoria'
    ) {
      const id =
        enteroPositivo(
          body?.id ||
          body?.auditoria_id
        )

      if (
        !id
      ) {
        return respuestaFallida(
          'Debe indicar la auditoría que desea actualizar.'
        )
      }

      const existente =
        await obtenerAuditoriaPorId(
          supabase,
          id
        )

      if (
        !existente
      ) {
        return respuestaFallida(
          'La auditoría no existe.',
          404
        )
      }

      const cambios = {
        updated_at:
          ahoraIso(),

        usuario_actualizacion:
          usuario,
      }

      if (
        body.anio !==
        undefined
      ) {
        const anio =
          validarAnio(
            body.anio
          )

        if (
          !anio
        ) {
          return respuestaFallida(
            'La vigencia no es válida.'
          )
        }

        cambios.anio =
          anio
      }

      if (
        body.codigo !==
        undefined
      ) {
        const codigo =
          mayusculas(
            body.codigo
          )

        if (
          !codigo
        ) {
          return respuestaFallida(
            'El código de la auditoría no puede quedar vacío.'
          )
        }

        cambios.codigo =
          codigo
      }

      if (
        body.nombre !==
        undefined
      ) {
        const nombre =
          texto(
            body.nombre
          )

        if (
          !nombre
        ) {
          return respuestaFallida(
            'El nombre de la auditoría no puede quedar vacío.'
          )
        }

        cambios.nombre =
          nombre
      }

      if (
        body.tipo_auditoria !==
        undefined
      ) {
        const valor =
          validarValorSet(
            body.tipo_auditoria,
            TIPOS_AUDITORIA
          )

        if (
          !valor
        ) {
          return respuestaFallida(
            'El tipo de auditoría no es válido.'
          )
        }

        cambios.tipo_auditoria =
          valor
      }

      if (
        body.estado !==
        undefined
      ) {
        const valor =
          validarValorSet(
            body.estado,
            ESTADOS_AUDITORIA
          )

        if (
          !valor
        ) {
          return respuestaFallida(
            'El estado de la auditoría no es válido.'
          )
        }

        cambios.estado =
          valor
      }

      const camposTexto = [
        'objetivo',
        'alcance',
        'criterios',
        'metodologia',
        'lugar',
        'auditor_nombre',
        'auditor_cargo',
        'auditor_correo',
        'responsable_area_nombre',
        'area_proceso_auditado',
        'resultado_general',
        'fortalezas_generales',
        'oportunidades_mejora_generales',
        'conclusion',
        'observaciones_finales',
        'evidencia_path',
        'informe_path',
        'observaciones',
      ]

      for (
        const campo of
          camposTexto
      ) {
        if (
          body[campo] !==
          undefined
        ) {
          cambios[campo] =
            texto(
              body[campo]
            ) ||
            null
        }
      }

      const camposFecha = [
        'fecha_programada',
        'fecha_ejecucion',
        'fecha_cierre',
      ]

      for (
        const campo of
          camposFecha
      ) {
        if (
          body[campo] !==
          undefined
        ) {
          cambios[campo] =
            fechaOTextoVacio(
              body[campo]
            )
        }
      }

      const camposId = [
        'auditor_personal_id',
        'responsable_area_personal_id',
      ]

      for (
        const campo of
          camposId
      ) {
        if (
          body[campo] !==
          undefined
        ) {
          cambios[campo] =
            enteroPositivo(
              body[campo]
            )
        }
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_auditorias'
          )
          .update(
            cambios
          )
          .eq(
            'id',
            id
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        if (
          error.code ===
          '23505'
        ) {
          return respuestaFallida(
            'Ya existe otra auditoría con ese código para la misma vigencia.',
            409
          )
        }

        throw error
      }

      return respuestaOk({
        auditoria:
          data,

        message:
          'Auditoría actualizada correctamente.',
      })
    }


    // ========================================================
    // ACTUALIZAR HALLAZGO
    // ========================================================

    if (
      accion ===
      'actualizar_hallazgo'
    ) {
      const id =
        enteroPositivo(
          body?.id ||
          body?.hallazgo_id
        )

      if (
        !id
      ) {
        return respuestaFallida(
          'Debe indicar el hallazgo que desea actualizar.'
        )
      }

      const existente =
        await obtenerHallazgoPorId(
          supabase,
          id
        )

      if (
        !existente
      ) {
        return respuestaFallida(
          'El hallazgo no existe.',
          404
        )
      }

      const cambios = {
        updated_at:
          ahoraIso(),
      }

      if (
        body.tipo_hallazgo !==
        undefined
      ) {
        const valor =
          validarValorSet(
            body.tipo_hallazgo,
            TIPOS_HALLAZGO
          )

        if (
          !valor
        ) {
          return respuestaFallida(
            'El tipo de hallazgo no es válido.'
          )
        }

        cambios.tipo_hallazgo =
          valor
      }

      if (
        body.clasificacion !==
        undefined
      ) {
        const valor =
          validarValorSet(
            body.clasificacion,
            CLASIFICACIONES_HALLAZGO,
            {
              permitirVacio:
                true,
            }
          )

        if (
          valor ===
          undefined
        ) {
          return respuestaFallida(
            'La clasificación del hallazgo no es válida.'
          )
        }

        cambios.clasificacion =
          valor
      }

      if (
        body.prioridad !==
        undefined
      ) {
        const valor =
          validarValorSet(
            body.prioridad,
            PRIORIDADES_HALLAZGO,
            {
              permitirVacio:
                true,
            }
          )

        if (
          valor ===
          undefined
        ) {
          return respuestaFallida(
            'La prioridad del hallazgo no es válida.'
          )
        }

        cambios.prioridad =
          valor
      }

      if (
        body.estado !==
        undefined
      ) {
        const valor =
          validarValorSet(
            body.estado,
            ESTADOS_HALLAZGO
          )

        if (
          !valor
        ) {
          return respuestaFallida(
            'El estado del hallazgo no es válido.'
          )
        }

        cambios.estado =
          valor
      }

      const camposTexto = [
        'codigo',
        'requisito',
        'criterio',
        'proceso_area',
        'descripcion',
        'evidencia',
        'causa',
        'consecuencia',
        'responsable_nombre',
        'verificacion_cierre',
        'evidencia_path',
      ]

      for (
        const campo of
          camposTexto
      ) {
        if (
          body[campo] !==
          undefined
        ) {
          const valor =
            texto(
              body[campo]
            )

          if (
            campo ===
              'descripcion' &&
            !valor
          ) {
            return respuestaFallida(
              'La descripción del hallazgo no puede quedar vacía.'
            )
          }

          cambios[campo] =
            valor ||
            null
        }
      }

      if (
        body.fecha_hallazgo !==
        undefined
      ) {
        cambios.fecha_hallazgo =
          fechaOTextoVacio(
            body.fecha_hallazgo
          )
      }

      if (
        body.fecha_cierre !==
        undefined
      ) {
        cambios.fecha_cierre =
          fechaOTextoVacio(
            body.fecha_cierre
          )
      }

      if (
        body.responsable_personal_id !==
        undefined
      ) {
        cambios.responsable_personal_id =
          enteroPositivo(
            body
              .responsable_personal_id
          )
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_auditoria_hallazgos'
          )
          .update(
            cambios
          )
          .eq(
            'id',
            id
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        hallazgo:
          data,

        message:
          'Hallazgo actualizado correctamente.',
      })
    }


    // ========================================================
    // ACTUALIZAR ACCIÓN
    // ========================================================

    if (
      accion ===
      'actualizar_accion'
    ) {
      const id =
        enteroPositivo(
          body?.id ||
          body?.accion_id
        )

      if (
        !id
      ) {
        return respuestaFallida(
          'Debe indicar la acción que desea actualizar.'
        )
      }

      const existente =
        await obtenerAccionPorId(
          supabase,
          id
        )

      if (
        !existente
      ) {
        return respuestaFallida(
          'La acción no existe.',
          404
        )
      }

      const cambios = {
        updated_at:
          ahoraIso(),
      }

      if (
        body.tipo_accion !==
        undefined
      ) {
        const valor =
          validarValorSet(
            body.tipo_accion,
            TIPOS_ACCION
          )

        if (
          !valor
        ) {
          return respuestaFallida(
            'El tipo de acción no es válido.'
          )
        }

        cambios.tipo_accion =
          valor
      }

      if (
        body.estado !==
        undefined
      ) {
        const valor =
          validarValorSet(
            body.estado,
            ESTADOS_ACCION
          )

        if (
          !valor
        ) {
          return respuestaFallida(
            'El estado de la acción no es válido.'
          )
        }

        cambios.estado =
          valor
      }

      const camposTexto = [
        'descripcion',
        'evidencia_esperada',
        'responsable_nombre',
        'responsable_cargo',
        'resultado',
        'evidencia_path',
        'observaciones',
      ]

      for (
        const campo of
          camposTexto
      ) {
        if (
          body[campo] !==
          undefined
        ) {
          const valor =
            texto(
              body[campo]
            )

          if (
            campo ===
              'descripcion' &&
            !valor
          ) {
            return respuestaFallida(
              'La descripción de la acción no puede quedar vacía.'
            )
          }

          cambios[campo] =
            valor ||
            null
        }
      }

      const camposFecha = [
        'fecha_accion',
        'fecha_compromiso',
        'fecha_implementacion',
        'fecha_cierre',
      ]

      for (
        const campo of
          camposFecha
      ) {
        if (
          body[campo] !==
          undefined
        ) {
          cambios[campo] =
            fechaOTextoVacio(
              body[campo]
            )
        }
      }

      if (
        body.responsable_personal_id !==
        undefined
      ) {
        cambios.responsable_personal_id =
          enteroPositivo(
            body
              .responsable_personal_id
          )
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_auditoria_acciones'
          )
          .update(
            cambios
          )
          .eq(
            'id',
            id
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        accion:
          data,

        message:
          'Acción actualizada correctamente.',
      })
    }


    // ========================================================
    // ACTUALIZAR SEGUIMIENTO
    // ========================================================

    if (
      accion ===
      'actualizar_seguimiento'
    ) {
      const id =
        enteroPositivo(
          body?.id ||
          body?.seguimiento_id
        )

      if (
        !id
      ) {
        return respuestaFallida(
          'Debe indicar el seguimiento que desea actualizar.'
        )
      }

      const existente =
        await obtenerSeguimientoPorId(
          supabase,
          id
        )

      if (
        !existente
      ) {
        return respuestaFallida(
          'El seguimiento no existe.',
          404
        )
      }

      const cambios = {
        updated_at:
          ahoraIso(),
      }

      const camposTexto = [
        'descripcion',
        'resultado',
        'resultado_eficacia',
        'responsable_nombre',
        'evidencia',
        'evidencia_path',
        'observaciones',
      ]

      for (
        const campo of
          camposTexto
      ) {
        if (
          body[campo] !==
          undefined
        ) {
          const valor =
            texto(
              body[campo]
            )

          if (
            campo ===
              'descripcion' &&
            !valor
          ) {
            return respuestaFallida(
              'La descripción del seguimiento no puede quedar vacía.'
            )
          }

          cambios[campo] =
            valor ||
            null
        }
      }

      if (
        body.avance_porcentaje !==
        undefined
      ) {
        const avance =
          numeroNoNegativo(
            body
              .avance_porcentaje
          )

        if (
          avance !== null &&
          avance > 100
        ) {
          return respuestaFallida(
            'El porcentaje de avance debe estar entre 0 y 100.'
          )
        }

        cambios.avance_porcentaje =
          avance
      }

      if (
        body.fecha_seguimiento !==
        undefined
      ) {
        cambios.fecha_seguimiento =
          fechaOTextoVacio(
            body
              .fecha_seguimiento
          )
      }

      if (
        body.fecha_proximo_seguimiento !==
        undefined
      ) {
        cambios.fecha_proximo_seguimiento =
          fechaOTextoVacio(
            body
              .fecha_proximo_seguimiento
          )
      }

      if (
        body.responsable_personal_id !==
        undefined
      ) {
        cambios.responsable_personal_id =
          enteroPositivo(
            body
              .responsable_personal_id
          )
      }

      if (
        body.implementacion_verificada !==
        undefined
      ) {
        cambios.implementacion_verificada =
          booleano(
            body
              .implementacion_verificada
          )
      }

      if (
        body.eficacia_verificada !==
        undefined
      ) {
        cambios.eficacia_verificada =
          booleano(
            body
              .eficacia_verificada
          )
      }

      if (
        body.requiere_nuevo_seguimiento !==
        undefined
      ) {
        cambios.requiere_nuevo_seguimiento =
          booleano(
            body
              .requiere_nuevo_seguimiento
          )
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_auditoria_seguimientos'
          )
          .update(
            cambios
          )
          .eq(
            'id',
            id
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        seguimiento:
          data,

        message:
          'Seguimiento actualizado correctamente.',
      })
    }


    return respuestaFallida(
      'La acción solicitada no es válida.'
    )
  } catch (
    error
  ) {
    console.error(
      'PATCH /api/admin/pesv/auditorias:',
      error
    )

    return respuestaError(
      error
    )
  }
}


// ============================================================
// DELETE AUDITORÍAS / NO CONFORMIDADES
// app/api/admin/pesv/auditorias/route.js
//
// Acciones:
// - eliminar_auditoria
// - eliminar_hallazgo
// - eliminar_accion
// - eliminar_seguimiento
//
// Regla:
// No se permite eliminar un registro padre si ya tiene
// información histórica asociada.
// ============================================================

export async function DELETE(
  request
) {
  try {
    const body =
      await request.json()

    const accion =
      mayusculas(
        body?.accion
      ).toLowerCase()

    const {
      supabaseAdmin:
        supabase,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    // ========================================================
    // ELIMINAR AUDITORÍA
    // ========================================================

    if (
      accion ===
      'eliminar_auditoria'
    ) {
      const id =
        enteroPositivo(
          body?.id ||
          body?.auditoria_id
        )

      if (
        !id
      ) {
        return respuestaFallida(
          'Debe indicar la auditoría que desea eliminar.'
        )
      }

      const auditoria =
        await obtenerAuditoriaPorId(
          supabase,
          id
        )

      if (
        !auditoria
      ) {
        return respuestaFallida(
          'La auditoría no existe.',
          404
        )
      }

      const {
        count,
        error:
          countError,
      } =
        await supabase
          .from(
            'pesv_auditoria_hallazgos'
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
            'auditoria_id',
            id
          )

      if (
        countError
      ) {
        throw countError
      }

      if (
        Number(
          count ||
          0
        ) >
        0
      ) {
        return respuestaFallida(
          'No se puede eliminar la auditoría porque ya tiene hallazgos registrados. Elimine primero los registros relacionados o cambie el estado de la auditoría.',
          409
        )
      }

      const {
        error,
      } =
        await supabase
          .from(
            'pesv_auditorias'
          )
          .delete()
          .eq(
            'id',
            id
          )

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Auditoría eliminada correctamente.',
      })
    }


    // ========================================================
    // ELIMINAR HALLAZGO
    // ========================================================

    if (
      accion ===
      'eliminar_hallazgo'
    ) {
      const id =
        enteroPositivo(
          body?.id ||
          body?.hallazgo_id
        )

      if (
        !id
      ) {
        return respuestaFallida(
          'Debe indicar el hallazgo que desea eliminar.'
        )
      }

      const hallazgo =
        await obtenerHallazgoPorId(
          supabase,
          id
        )

      if (
        !hallazgo
      ) {
        return respuestaFallida(
          'El hallazgo no existe.',
          404
        )
      }

      const {
        count,
        error:
          countError,
      } =
        await supabase
          .from(
            'pesv_auditoria_acciones'
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
            'hallazgo_id',
            id
          )

      if (
        countError
      ) {
        throw countError
      }

      if (
        Number(
          count ||
          0
        ) >
        0
      ) {
        return respuestaFallida(
          'No se puede eliminar el hallazgo porque ya tiene acciones asociadas.',
          409
        )
      }

      const {
        error,
      } =
        await supabase
          .from(
            'pesv_auditoria_hallazgos'
          )
          .delete()
          .eq(
            'id',
            id
          )

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Hallazgo eliminado correctamente.',
      })
    }


    // ========================================================
    // ELIMINAR ACCIÓN
    // ========================================================

    if (
      accion ===
      'eliminar_accion'
    ) {
      const id =
        enteroPositivo(
          body?.id ||
          body?.accion_id
        )

      if (
        !id
      ) {
        return respuestaFallida(
          'Debe indicar la acción que desea eliminar.'
        )
      }

      const accionEncontrada =
        await obtenerAccionPorId(
          supabase,
          id
        )

      if (
        !accionEncontrada
      ) {
        return respuestaFallida(
          'La acción no existe.',
          404
        )
      }

      const {
        count,
        error:
          countError,
      } =
        await supabase
          .from(
            'pesv_auditoria_seguimientos'
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
            'accion_id',
            id
          )

      if (
        countError
      ) {
        throw countError
      }

      if (
        Number(
          count ||
          0
        ) >
        0
      ) {
        return respuestaFallida(
          'No se puede eliminar la acción porque ya tiene seguimientos registrados.',
          409
        )
      }

      const {
        error,
      } =
        await supabase
          .from(
            'pesv_auditoria_acciones'
          )
          .delete()
          .eq(
            'id',
            id
          )

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Acción eliminada correctamente.',
      })
    }


    // ========================================================
    // ELIMINAR SEGUIMIENTO
    // ========================================================

    if (
      accion ===
      'eliminar_seguimiento'
    ) {
      const id =
        enteroPositivo(
          body?.id ||
          body?.seguimiento_id
        )

      if (
        !id
      ) {
        return respuestaFallida(
          'Debe indicar el seguimiento que desea eliminar.'
        )
      }

      const seguimiento =
        await obtenerSeguimientoPorId(
          supabase,
          id
        )

      if (
        !seguimiento
      ) {
        return respuestaFallida(
          'El seguimiento no existe.',
          404
        )
      }

      const {
        error,
      } =
        await supabase
          .from(
            'pesv_auditoria_seguimientos'
          )
          .delete()
          .eq(
            'id',
            id
          )

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Seguimiento eliminado correctamente.',
      })
    }


    return respuestaFallida(
      'La acción solicitada no es válida.'
    )
  } catch (
    error
  ) {
    console.error(
      'DELETE /api/admin/pesv/auditorias:',
      error
    )

    return respuestaError(
      error
    )
  }
}