// app/api/login/route.js

import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { getMasterSupabase } from '@/lib/supabaseMaster'
import { crearClienteEmpresa } from '@/lib/supabaseDinamico'

const COOKIE_NAME = process.env.COOKIE_NAME || 'cea_session'
const secureCookies = process.env.NODE_ENV === 'production'
const SESSION_DURATION_SECONDS = 60 * 60 * 8

const ENC = new TextEncoder()

function getSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('Falta AUTH_SECRET en .env.local')
  return ENC.encode(secret)
}

async function firmarSesion(payload, expSeconds = SESSION_DURATION_SECONDS) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${expSeconds}s`)
    .sign(getSecret())
}

function normalizarDocumento(valor) {
  return String(valor || '').trim().replace(/\D/g, '')
}

async function obtenerEmpresa(nit) {
  const master = getMasterSupabase()

  const { data, error } = await master
    .from('empresas')
    .select('*')
    .eq('nit', nit)
    .eq('estado', 'activo')
    .single()

  if (error || !data) {
    throw new Error('Empresa no encontrada o inactiva.')
  }

  return data
}

export async function POST(req) {
  try {
    const body = await req.json()

    const nit = String(body.nit || '').trim()
    const documento = normalizarDocumento(body.usuario || body.documento)
    const password = String(body.password || '')
    const rolSeleccionado = String(body.rol || '').trim()

    if (!nit || !documento || !password || !rolSeleccionado) {
      return NextResponse.json(
        { status: 'failed', message: 'CEA, documento, contraseña y perfil son requeridos.' },
        { status: 400 }
      )
    }

    const empresa = await obtenerEmpresa(nit)
    const supabase = crearClienteEmpresa(empresa)

    const { data: cuenta, error: cuentaError } = await supabase
      .from('cuentas_usuario')
      .select(`
        id,
        personal_id,
        documento,
        usuario_login,
        email,
        email_autorizado,
        estado,
        auth_user_id,
        personal (
          id,
          nombres,
          apellidos,
          documento,
          email
        ),
        perfiles_usuario (
          id,
          rol,
          menu_tipo,
          estado
        )
      `)
      .eq('documento', documento)
      .maybeSingle()

    if (cuentaError) {
      return NextResponse.json(
        { status: 'failed', message: cuentaError.message },
        { status: 500 }
      )
    }

    if (!cuenta) {
      return NextResponse.json(
        { status: 'failed', message: 'No existe una cuenta autorizada para este documento.' },
        { status: 401 }
      )
    }

    if (String(cuenta.estado || '').toLowerCase() !== 'activo') {
      return NextResponse.json(
        { status: 'failed', message: `La cuenta no está activa. Estado: ${cuenta.estado}` },
        { status: 403 }
      )
    }

    if (!cuenta.auth_user_id) {
      return NextResponse.json(
        { status: 'failed', message: 'El usuario aún no ha completado el registro.' },
        { status: 403 }
      )
    }

    const perfil = (cuenta.perfiles_usuario || []).find(
      (item) =>
        String(item.rol || '').trim() === rolSeleccionado &&
        String(item.estado || '').toLowerCase() === 'activo'
    )

    if (!perfil) {
      return NextResponse.json(
        { status: 'failed', message: 'El perfil seleccionado no está autorizado.' },
        { status: 403 }
      )
    }

    const email = String(cuenta.email_autorizado || '').trim().toLowerCase()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData?.user) {
      return NextResponse.json(
        { status: 'failed', message: 'Documento, contraseña o perfil incorrecto.' },
        { status: 401 }
      )
    }

    if (String(authData.user.id) !== String(cuenta.auth_user_id)) {
      return NextResponse.json(
        { status: 'failed', message: 'La cuenta Auth no corresponde al usuario autorizado.' },
        { status: 403 }
      )
    }

    const nombreCompleto = `${cuenta.personal?.nombres || ''} ${cuenta.personal?.apellidos || ''}`.trim()

    await supabase
      .from('cuentas_usuario')
      .update({ fecha_ultimo_acceso: new Date().toISOString() })
      .eq('id', cuenta.id)

    const rolCompatible =
    perfil.rol === 'INSTRUCTOR_TEORIA'
      ? 'INSTRUCTOR TEORÍA'
      : perfil.rol === 'AUXILIAR_ADMINISTRATIVO'
        ? 'AUXILIAR ADMINISTRATIVO'
        : perfil.rol === 'INSTRUCTOR_PRACTICA'
          ? 'INSTRUCTOR PRÁCTICA'
          : perfil.rol  

    const token = await firmarSesion({
      sub: String(cuenta.id),
      authUserId: authData.user.id,
      personalId: cuenta.personal_id,
      cuentaUsuarioId: cuenta.id,
      usuario: documento,
      documento,
      nombreCompleto,
      rol: rolCompatible,
      rolOriginal: perfil.rol,
      menuTipo: perfil.menu_tipo,
      email,
      nitEmpresa: empresa.nit,
      codigoEmpresa: empresa.codigo,
      nombreEmpresa: empresa.nombre,
    })

    const res = NextResponse.json({
      status: 'success',
      usuario: documento,
      nombreCompleto,
      documento,
      rol: rolCompatible,
      rolOriginal: perfil.rol,
      menuTipo: perfil.menu_tipo,
      email,
      personalId: cuenta.personal_id,
      cuentaUsuarioId: cuenta.id,
      nitEmpresa: empresa.nit,
      codigoEmpresa: empresa.codigo,
      nombreEmpresa: empresa.nombre,
    })

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    })

    return res
  } catch (err) {
    console.error('Error en API /login:', err)

    return NextResponse.json(
      {
        status: 'failed',
        message: err.message || 'Error interno en el servidor.',
      },
      { status: 500 }
    )
  }
}