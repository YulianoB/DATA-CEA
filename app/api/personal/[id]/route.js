// app/api/personal/[id]/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

function respuestaError(error) {
  const respuesta = respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    { status: respuesta.status }
  )
}

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request)

    const { data, error } = await supabase
      .from('personal')
      .select(`
        *,
        cuentas_usuario (
          id,
          estado,
          usuario_login,
          email,
          email_autorizado,
          fecha_preautorizacion,
          fecha_registro_app,
          fecha_ultimo_acceso,
          email_confirmado,
          observaciones
        ),
        perfiles_usuario (
          id,
          rol,
          menu_tipo,
          estado,
          fecha_asignacion,
          asignado_por_nombre
        ),
        licencias_personal (
          id,
          rol,
          categoria,
          tipo_licencia,
          numero_certificado,
          vigencia,
          fecha_actualizacion,
          nombre_quien_actualiza
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json(
        {
          status: 'failed',
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      personal: data,

      cuenta: Array.isArray(data.cuentas_usuario)
        ? data.cuentas_usuario[0] || null
        : data.cuentas_usuario || null,

      perfiles: data.perfiles_usuario || [],
      licencias: data.licencias_personal || [],
    })
  } catch (error) {
    console.error('Error GET /api/personal/[id]:', error)
    return respuestaError(error)
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request, body)

    const perfilProfesional = String(
      body.perfil_profesional || ''
    ).trim()

    const { data, error } = await supabase
      .from('personal')
      .update({
        perfil_profesional: perfilProfesional || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          status: 'failed',
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      message: 'Perfil profesional actualizado correctamente.',
      personal: data,
    })
  } catch (error) {
    console.error('Error PATCH /api/personal/[id]:', error)
    return respuestaError(error)
  }
}