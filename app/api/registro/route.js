// app/api/registro/route.js
import { NextResponse } from 'next/server'
import { getMasterSupabase } from '@/lib/supabaseMaster'
import { crearClienteEmpresa } from '@/lib/supabaseDinamico'
import { createClient } from '@supabase/supabase-js'

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

function normalizarEmail(valor) {
  return String(valor || '').trim().toLowerCase()
}

export async function POST(request) {
  try {
    const body = await request.json()

    const nit = String(body.nit || '').trim()
    const documento = normalizarDocumento(body.documento)
    const email = normalizarEmail(body.email)
    const password = String(body.password || '')
    const confirmarPassword = String(body.confirmarPassword || '')

    if (!nit || !documento || !email || !password || !confirmarPassword) {
      return NextResponse.json(
        { status: 'failed', message: 'Todos los campos son obligatorios.' },
        { status: 400 }
      )
    }

    if (password !== confirmarPassword) {
      return NextResponse.json(
        { status: 'failed', message: 'Las contraseñas no coinciden.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { status: 'failed', message: 'La contraseña debe tener mínimo 8 caracteres.' },
        { status: 400 }
      )
    }

    const empresa = await obtenerEmpresa(nit)

    const supabaseEmpresa = crearClienteEmpresa(empresa)

    const { data: cuenta, error: cuentaError } = await supabaseEmpresa
      .from('cuentas_usuario')
      .select(`
        id,
        personal_id,
        documento,
        email_autorizado,
        estado,
        auth_user_id,
        personal (
          id,
          nombres,
          apellidos,
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
        { status: 'failed', message: 'No existe una preautorización para este documento.' },
        { status: 404 }
      )
    }

    if (cuenta.auth_user_id) {
      return NextResponse.json(
        { status: 'failed', message: 'Este usuario ya se encuentra registrado.' },
        { status: 409 }
      )
    }

    if (String(cuenta.estado || '').toLowerCase() !== 'pre_autorizado') {
      return NextResponse.json(
        { status: 'failed', message: `La cuenta no está preautorizada. Estado actual: ${cuenta.estado}` },
        { status: 403 }
      )
    }

    if (normalizarEmail(cuenta.email_autorizado) !== email) {
      return NextResponse.json(
        { status: 'failed', message: 'El correo no coincide con el correo autorizado por administración.' },
        { status: 403 }
      )
    }

    const perfilesActivos = (cuenta.perfiles_usuario || []).filter(
      (perfil) => String(perfil.estado || '').toLowerCase() === 'activo'
    )

    if (perfilesActivos.length === 0) {
      return NextResponse.json(
        { status: 'failed', message: 'La cuenta no tiene perfiles activos asignados.' },
        { status: 403 }
      )
    }

    const serviceRoleKey = empresa.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'No está configurada la llave privada del CEA para crear usuarios Auth.',
        },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(empresa.supabase_url, serviceRoleKey)

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        documento,
        nitEmpresa: empresa.nit,
        codigoEmpresa: empresa.codigo,
        nombreEmpresa: empresa.nombre,
        personal_id: cuenta.personal_id,
        cuenta_usuario_id: cuenta.id,
      },
    })

    if (authError) {
      return NextResponse.json(
        { status: 'failed', message: authError.message },
        { status: 500 }
      )
    }

    const authUserId = authData?.user?.id

    if (!authUserId) {
      return NextResponse.json(
        { status: 'failed', message: 'No fue posible obtener el ID del usuario Auth.' },
        { status: 500 }
      )
    }

    const { error: actualizarCuentaError } = await supabaseEmpresa
      .from('cuentas_usuario')
      .update({
        auth_user_id: authUserId,
        estado: 'activo',
        fecha_registro_app: new Date().toISOString(),
        email_confirmado: true,
        fecha_confirmacion_email: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cuenta.id)

    if (actualizarCuentaError) {
      return NextResponse.json(
        { status: 'failed', message: actualizarCuentaError.message },
        { status: 500 }
      )
    }

    const { error: actualizarPersonalError } = await supabaseEmpresa
      .from('personal')
      .update({
        auth_user_id: authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cuenta.personal_id)

    if (actualizarPersonalError) {
      return NextResponse.json(
        { status: 'failed', message: actualizarPersonalError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      message: 'Usuario registrado correctamente. Ya puede iniciar sesión.',
    })
  } catch (error) {
    console.error('Error en /api/registro:', error)

    return NextResponse.json(
      { status: 'failed', message: error.message || 'Error interno en el servidor.' },
      { status: 500 }
    )
  }
}