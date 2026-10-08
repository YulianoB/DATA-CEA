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

    const camposEditables = [
      'nombres', 'apellidos', 'fecha_nacimiento', 'genero', 'tipo_sangre',
      'estado_civil', 'escolaridad', 'profesion', 'nacionalidad', 'numero_hijos',
      'telefono', 'departamento_residencia', 'ciudad_residencia', 'direccion',
      'tipo_personal', 'cargo', 'grupo_personal', 'tipo_contrato',
      'tipo_permanencia', 'fecha_vinculacion', 'fecha_retiro', 'estado',
      'eps', 'arl', 'fondo_pension', 'medio_transporte_trabajo',
      'contacto_emergencia_nombre', 'contacto_emergencia_parentesco',
      'contacto_emergencia_telefono', 'observaciones',
    ]
    const actualizacion = {}
    if (Object.prototype.hasOwnProperty.call(body, 'perfil_profesional')) {
      actualizacion.perfil_profesional = String(body.perfil_profesional || '').trim() || null
    }
    for (const campo of camposEditables) {
      if (!Object.prototype.hasOwnProperty.call(body, campo)) continue
      const valor = body[campo]
      if (typeof valor !== 'string' && typeof valor !== 'number' && valor !== null) {
        return NextResponse.json({ status: 'failed', message: `Valor inválido para ${campo}.` }, { status: 400 })
      }
      actualizacion[campo] = valor === null || String(valor).trim() === '' ? null : String(valor).trim()
    }
    if (!Object.keys(actualizacion).length) {
      return NextResponse.json({ status: 'failed', message: 'No se recibieron campos para actualizar.' }, { status: 400 })
    }
    if (actualizacion.fecha_retiro && actualizacion.fecha_vinculacion && actualizacion.fecha_retiro < actualizacion.fecha_vinculacion) {
      return NextResponse.json({ status: 'failed', message: 'La fecha de retiro no puede ser anterior a la vinculación.' }, { status: 400 })
    }
    actualizacion.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('personal')
      .update(actualizacion)
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
      message: 'Información actualizada correctamente.',
      personal: data,
    })
  } catch (error) {
    console.error('Error PATCH /api/personal/[id]:', error)
    return respuestaError(error)
  }
}