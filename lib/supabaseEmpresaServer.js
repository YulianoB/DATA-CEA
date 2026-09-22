// lib/supabaseEmpresaServer.js

import { createClient } from '@supabase/supabase-js'
import { getMasterSupabase } from '@/lib/supabaseMaster'
import { crearClienteEmpresa } from '@/lib/supabaseDinamico'

const EMPRESA_CACHE_TTL_MS = 5 * 60 * 1000

const cacheEmpresas = new Map()
const cacheClientesAnon = new Map()
const cacheClientesAdmin = new Map()

// =========================================================
// CATEGORÍAS POR NIVEL
// =========================================================

const CATEGORIAS_POR_NIVEL = {
  'NIVEL I': [
    'A2',
    'B1',
    'C1',
    'RC1',
  ],

  'NIVEL II': [
    'A2',
    'B1',
    'C1',
    'RC1',
    'C2',
  ],

  'NIVEL III': [
    'A2',
    'B1',
    'C1',
    'RC1',
    'C2',
    'C3',
  ],
}

// =========================================================
// HELPERS
// =========================================================

function normalizarNit(valor) {
  return String(
    valor ||
    ''
  ).trim()
}

function normalizarTexto(
  valor
) {
  return String(
    valor ??
    ''
  ).trim()
}

function normalizarMayusculas(
  valor
) {
  return normalizarTexto(
    valor
  ).toUpperCase()
}

function crearErrorConexion(
  message,
  status = 500,
  code = 'CONNECTION_ERROR'
) {
  const error =
    new Error(
      message
    )

  error.status =
    status

  error.code =
    code

  return error
}

// =========================================================
// NIVEL CEA
// =========================================================

export function obtenerCategoriasPorNivel(
  nivel
) {
  const nivelNormalizado =
    normalizarMayusculas(
      nivel
    )

  const categorias =
    CATEGORIAS_POR_NIVEL[
      nivelNormalizado
    ]

  return Array.isArray(
    categorias
  )
    ? [
        ...categorias,
      ]
    : []
}

// =========================================================
// NORMALIZAR EMPRESA
// =========================================================
//
// La base MASTER continúa siendo la fuente de verdad.
//
// Además de devolver los campos originales, agregamos:
//
// nivel_cea
// categorias_habilitadas
//
// =========================================================

function normalizarEmpresa(
  empresa
) {
  if (
    !empresa
  ) {
    return empresa
  }

  const nivelCea =
    normalizarMayusculas(
      empresa.nivel_cea
    )

  const categoriasHabilitadas =
    obtenerCategoriasPorNivel(
      nivelCea
    )

  if (
    categoriasHabilitadas.length ===
    0
  ) {
    throw crearErrorConexion(
      `El CEA no tiene un nivel válido configurado en la base MASTER: ${nivelCea || 'SIN NIVEL'}.`,
      500,
      'CEA_LEVEL_INVALID'
    )
  }

  return {
    ...empresa,

    nivel_cea:
      nivelCea,

    categorias_habilitadas:
      categoriasHabilitadas,
  }
}

/**
 * Obtiene el NIT enviado por body, query string o encabezado.
 *
 * Orden de prioridad:
 * 1. body.nit
 * 2. query ?nit=
 * 3. header x-cea-nit
 */
export function obtenerNitDesdeRequest(
  request,
  body = null
) {
  const url =
    new URL(
      request.url
    )

  return normalizarNit(
    body?.nit ||
      url.searchParams.get(
        'nit'
      ) ||
      request.headers.get(
        'x-cea-nit'
      ) ||
      ''
  )
}

/**
 * Busca la empresa activa en la base MASTER.
 * Conserva el resultado en memoria durante cinco minutos.
 */
export async function obtenerEmpresaPorNit(
  nit
) {
  const nitNormalizado =
    normalizarNit(
      nit
    )

  if (
    !nitNormalizado
  ) {
    throw crearErrorConexion(
      'No se recibió el NIT del CEA.',
      400,
      'NIT_REQUIRED'
    )
  }

  const ahora =
    Date.now()

  const cache =
    cacheEmpresas.get(
      nitNormalizado
    )

  if (
    cache?.empresa &&
    ahora -
      cache.timestamp <
      EMPRESA_CACHE_TTL_MS
  ) {
    return cache.empresa
  }

  const master =
    getMasterSupabase()

  const {
    data:
      empresaEncontrada,

    error,
  } =
    await master
      .from(
        'empresas'
      )
      .select('*')
      .eq(
        'nit',
        nitNormalizado
      )
      .eq(
        'estado',
        'activo'
      )
      .maybeSingle()

  if (
    error
  ) {
    console.error(
      'Error consultando empresa MASTER:',
      error
    )

    throw crearErrorConexion(
      'No fue posible consultar la configuración del CEA.',
      500,
      'MASTER_QUERY_ERROR'
    )
  }

  if (
    !empresaEncontrada
  ) {
    throw crearErrorConexion(
      'Empresa no encontrada o inactiva.',
      404,
      'EMPRESA_NOT_FOUND'
    )
  }

  if (
    !empresaEncontrada.supabase_url ||
    !empresaEncontrada.supabase_anon_key
  ) {
    throw crearErrorConexion(
      'El CEA no tiene completa la configuración de Supabase.',
      500,
      'EMPRESA_CONFIG_INCOMPLETE'
    )
  }

  // =======================================================
  // NORMALIZAR NIVEL Y CATEGORÍAS
  // =======================================================

  const empresa =
    normalizarEmpresa(
      empresaEncontrada
    )

  cacheEmpresas.set(
    nitNormalizado,
    {
      empresa,

      timestamp:
        ahora,
    }
  )

  return empresa
}

/**
 * Obtiene el cliente normal del CEA.
 *
 * Este cliente utiliza supabase_anon_key y se reutiliza por NIT.
 */
export async function obtenerSupabaseEmpresaPorNit(
  nit
) {
  const empresa =
    await obtenerEmpresaPorNit(
      nit
    )

  const cacheKey =
    normalizarNit(
      empresa.nit
    )

  let supabase =
    cacheClientesAnon.get(
      cacheKey
    )

  if (
    !supabase
  ) {
    supabase =
      crearClienteEmpresa(
        empresa
      )

    cacheClientesAnon.set(
      cacheKey,
      supabase
    )
  }

  return {
    nit:
      cacheKey,

    empresa,

    supabase,
  }
}

/**
 * Obtiene el cliente normal del CEA directamente desde un request.
 */
export async function obtenerSupabaseEmpresaDesdeRequest(
  request,
  body = null
) {
  const nit =
    obtenerNitDesdeRequest(
      request,
      body
    )

  return obtenerSupabaseEmpresaPorNit(
    nit
  )
}

/**
 * Obtiene un cliente administrativo del CEA.
 *
 * Solo se debe usar en APIs del servidor que realmente necesiten:
 * - administrar usuarios de Auth;
 * - cambiar correos;
 * - operaciones que requieren Service Role.
 *
 * Nunca debe enviarse al navegador.
 */
export async function obtenerSupabaseAdminEmpresaPorNit(
  nit
) {
  const empresa =
    await obtenerEmpresaPorNit(
      nit
    )

  const cacheKey =
    normalizarNit(
      empresa.nit
    )

  let supabaseAdmin =
    cacheClientesAdmin.get(
      cacheKey
    )

  if (
    !supabaseAdmin
  ) {
    const serviceRoleKey =
      empresa.supabase_service_role_key ||
      process.env.SUPABASE_SERVICE_ROLE_KEY

    if (
      !serviceRoleKey
    ) {
      throw crearErrorConexion(
        'No está configurada la llave privada del CEA.',
        500,
        'SERVICE_ROLE_REQUIRED'
      )
    }

    supabaseAdmin =
      createClient(
        empresa.supabase_url,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken:
              false,

            persistSession:
              false,

            detectSessionInUrl:
              false,
          },
        }
      )

    cacheClientesAdmin.set(
      cacheKey,
      supabaseAdmin
    )
  }

  return {
    nit:
      cacheKey,

    empresa,

    supabaseAdmin,
  }
}

/**
 * Cliente administrativo obtenido directamente desde un request.
 */
export async function obtenerSupabaseAdminEmpresaDesdeRequest(
  request,
  body = null
) {
  const nit =
    obtenerNitDesdeRequest(
      request,
      body
    )

  return obtenerSupabaseAdminEmpresaPorNit(
    nit
  )
}

/**
 * Convierte errores del helper en respuestas JSON uniformes.
 */
export function respuestaErrorEmpresa(
  error
) {
  const status =
    Number(
      error?.status ||
      500
    )

  return {
    status,

    body: {
      status:
        'failed',

      code:
        error?.code ||
        'INTERNAL_ERROR',

      message:
        error?.message ||
        'Error interno del servidor.',
    },
  }
}

/**
 * Limpia manualmente la caché.
 *
 * Será útil cuando el módulo MASTER modifique:
 * - URL de Supabase;
 * - anon key;
 * - service role;
 * - estado de la empresa;
 * - nivel del CEA.
 */
export function limpiarCacheEmpresa(
  nit = null
) {
  if (
    !nit
  ) {
    cacheEmpresas.clear()
    cacheClientesAnon.clear()
    cacheClientesAdmin.clear()

    return
  }

  const nitNormalizado =
    normalizarNit(
      nit
    )

  cacheEmpresas.delete(
    nitNormalizado
  )

  cacheClientesAnon.delete(
    nitNormalizado
  )

  cacheClientesAdmin.delete(
    nitNormalizado
  )
}