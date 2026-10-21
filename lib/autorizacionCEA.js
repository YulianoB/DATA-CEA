// lib/autorizacionCEA.js
// Autorización central para APIs empresariales de DATA-CEA.
// Uso exclusivo en el servidor. No sustituye la autorización específica de cada operación.
// Las rutas públicas de registro/recuperación requieren controles separados.

import { jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import { obtenerSupabaseAdminEmpresaPorNit } from '@/lib/supabaseEmpresaServer'

const COOKIE_NAME = process.env.COOKIE_NAME || 'cea_session'
const ROLES_COMPATIBLES = Object.freeze({
  ADMINISTRATIVO: 'ADMINISTRATIVO',
  AUXILIAR_ADMINISTRATIVO: 'AUXILIAR_ADMINISTRATIVO',
  'AUXILIAR ADMINISTRATIVO': 'AUXILIAR_ADMINISTRATIVO',
  INSTRUCTOR_TEORIA: 'INSTRUCTOR_TEORIA',
  'INSTRUCTOR TEORÍA': 'INSTRUCTOR_TEORIA',
  INSTRUCTOR_PRACTICA: 'INSTRUCTOR_PRACTICA',
  'INSTRUCTOR PRÁCTICA': 'INSTRUCTOR_PRACTICA',
})

function normalizarRol(rol) {
  return ROLES_COMPATIBLES[String(rol || '').trim().toUpperCase()] || null
}

function errorAutorizacion(message, status) {
  const error = new Error(message)
  error.status = status
  error.code = status === 401 ? 'SESION_REQUERIDA' : 'ACCESO_DENEGADO'
  return error
}

/**
 * Valida el JWT del login existente y su perfil.
 * rolesPermitidos: nombres originales o compatibles del login.
 * Nunca acepta el NIT del navegador como fuente de identidad.
 */
export async function validarSesionCEA(request, rolesPermitidos = []) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const secret = process.env.AUTH_SECRET
  if (!token || !secret) {
    throw errorAutorizacion('Inicie sesión para continuar.', 401)
  }

  let payload
  try {
    ;({ payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ['HS256'] }
    ))
  } catch {
    throw errorAutorizacion('La sesión ha vencido o no es válida.', 401)
  }

  const nitEmpresa = String(payload.nitEmpresa || '').trim()
  const rol = normalizarRol(payload.rolOriginal || payload.rol)
  if (!nitEmpresa || !rol || !payload.cuentaUsuarioId || !payload.authUserId) {
    throw errorAutorizacion('La sesión no contiene una identidad empresarial válida.', 401)
  }

  const autorizados = rolesPermitidos.map(normalizarRol)
  if (autorizados.length && !autorizados.includes(rol)) {
    throw errorAutorizacion('El perfil no tiene permiso para esta operación.', 403)
  }

  return {
    ...payload,
    nitEmpresa,
    rolNormalizado: rol,
  }
}

/**
 * Verifica que el NIT recibido, cuando existe, coincida con el de la sesión.
 * Sirve durante la migración mientras las pantallas sigan enviando el NIT.
 */
export function verificarNitCEA(sesion, nitSolicitado) {
  if (
    nitSolicitado !== undefined &&
    nitSolicitado !== null &&
    String(nitSolicitado).trim() !== '' &&
    String(nitSolicitado).trim() !== sesion.nitEmpresa
  ) {
    throw errorAutorizacion('La empresa solicitada no corresponde a la sesión.', 403)
  }
}

/**
 * Devuelve el cliente del CEA asociado a la sesión.
 * Si la ruta recibe un NIT por query/body/header, comprueba coincidencia.
 * La ruta aún debe verificar la autorización funcional de la operación.
 */
export async function obtenerContextoCEA(request, {
  rolesPermitidos = [],
  body = null,
} = {}) {
  const sesion = await validarSesionCEA(request, rolesPermitidos)
  const url = new URL(request.url)
  verificarNitCEA(sesion, url.searchParams.get('nit'))
  verificarNitCEA(sesion, request.headers.get('x-cea-nit'))
  verificarNitCEA(sesion, body?.nit)

  const { empresa, supabaseAdmin } =
    await obtenerSupabaseAdminEmpresaPorNit(sesion.nitEmpresa)

  return { sesion, empresa, supabaseAdmin, nit: sesion.nitEmpresa }
}

export function respuestaErrorAutorizacionCEA(error) {
  const status = [401, 403].includes(error?.status) ? error.status : 500
  return NextResponse.json({
    status: 'failed',
    code: status === 500 ? 'INTERNAL_ERROR' : error.code,
    message: status === 500
      ? 'No fue posible autorizar la solicitud.'
      : error.message,
  }, { status })
}
