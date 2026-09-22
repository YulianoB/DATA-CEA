// app/api/login/perfiles/route.js

import { NextResponse } from 'next/server'
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

export async function POST(request) {
  try {
    const body = await request.json()
    const nit = String(body.nit || '').trim()
    const documento = normalizarDocumento(body.documento || body.usuario)

    if (!nit || !documento) {
      return NextResponse.json(
        { status: 'failed', message: 'CEA y documento son obligatorios.' },
        { status: 400 }
      )
    }

    const empresa = await obtenerEmpresa(nit)
    const supabase = crearClienteEmpresa(empresa)

    const { data: cuenta, error } = await supabase
      .from('cuentas_usuario')
      .select(`
        id,
        personal_id,
        documento,
        usuario_login,
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

    if (error) {
      return NextResponse.json(
        { status: 'failed', message: error.message },
        { status: 500 }
      )
    }

    if (!cuenta) {
      return NextResponse.json(
        { status: 'failed', message: 'No existe una cuenta autorizada para este documento.' },
        { status: 404 }
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

    const perfiles = (cuenta.perfiles_usuario || [])
      .filter((perfil) => String(perfil.estado || '').toLowerCase() === 'activo')
      .map((perfil) => ({
        id: perfil.id,
        rol: perfil.rol,
        menu_tipo: perfil.menu_tipo,
      }))

    if (perfiles.length === 0) {
      return NextResponse.json(
        { status: 'failed', message: 'No tiene perfiles activos asignados.' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      status: 'success',
      cuenta: {
        id: cuenta.id,
        personal_id: cuenta.personal_id,
        documento: cuenta.documento,
        email_autorizado: cuenta.email_autorizado,
        nombreCompleto: `${cuenta.personal?.nombres || ''} ${cuenta.personal?.apellidos || ''}`.trim(),
      },
      empresa: {
        nit: empresa.nit,
        codigo: empresa.codigo,
        nombre: empresa.nombre,
      },
      perfiles,
    })
  } catch (error) {
    console.error('Error en /api/login/perfiles:', error)
    return NextResponse.json(
      { status: 'failed', message: error.message || 'Error interno.' },
      { status: 500 }
    )
  }
}