import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMasterSupabase } from '@/lib/supabaseMaster'
import { crearClienteEmpresa } from '@/lib/supabaseDinamico'

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

function normalizarDocumento(valor) {
  return String(valor || '').trim().replace(/\D/g, '')
}

function ocultarCorreo(email) {
  const correo = String(email || '').trim().toLowerCase()

  if (!correo.includes('@')) return ''

  const [usuario, dominio] = correo.split('@')
  const visible = usuario.slice(0, 2)
  const oculto = '*'.repeat(Math.max(3, usuario.length - 2))

  return `${visible}${oculto}@${dominio}`
}

export async function POST(request) {
  try {
    const body = await request.json()

    const nit = String(body.nit || '').trim()
    const documento = normalizarDocumento(body.documento)

    if (!nit || !documento) {
      return NextResponse.json(
        { status: 'failed', message: 'Debe seleccionar el CEA e ingresar el usuario.' },
        { status: 400 }
      )
    }

    const empresa = await obtenerEmpresa(nit)
    const supabaseEmpresa = crearClienteEmpresa(empresa)

    const { data: cuenta, error: cuentaError } = await supabaseEmpresa
      .from('cuentas_usuario')
      .select(`
        id,
        documento,
        email_autorizado,
        estado,
        auth_user_id,
        personal (
          nombres,
          apellidos
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
        {
          status: 'failed',
          message: 'No existe una cuenta registrada para este usuario.',
        },
        { status: 404 }
      )
    }

    if (String(cuenta.estado || '').toLowerCase() !== 'activo') {
      return NextResponse.json(
        {
          status: 'failed',
          message: `La cuenta no está activa. Estado actual: ${cuenta.estado}`,
        },
        { status: 403 }
      )
    }

    if (!cuenta.auth_user_id) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'El usuario aún no ha completado el registro inicial.',
        },
        { status: 403 }
      )
    }

    const email = String(cuenta.email_autorizado || '').trim().toLowerCase()

    if (!email) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'La cuenta no tiene correo autorizado. Contacte a administración.',
        },
        { status: 400 }
      )
    }

    const serviceRoleKey = empresa.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'No está configurada la llave privada para recuperación de contraseña.',
        },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(empresa.supabase_url, serviceRoleKey)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    const redirectTo = appUrl
    ? `${appUrl}/actualizar-contrasena?nit=${encodeURIComponent(nit)}`
    : undefined

    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (resetError) {
    const mensaje =
        resetError.message?.toLowerCase().includes('rate limit')
        ? 'Ya se envió un enlace de recuperación recientemente. Revise su correo o intente nuevamente en unos minutos.'
        : resetError.message

    return NextResponse.json(
        { status: 'failed', message: mensaje },
        { status: 429 }
    )
    }

    return NextResponse.json({
      status: 'success',
      message: `Se envió un enlace de recuperación al correo ${ocultarCorreo(email)}.`,
      email_oculto: ocultarCorreo(email),
    })
  } catch (error) {
    console.error('Error en /api/recuperar:', error)

    return NextResponse.json(
      {
        status: 'failed',
        message: error.message || 'Error interno en el servidor.',
      },
      { status: 500 }
    )
  }
}