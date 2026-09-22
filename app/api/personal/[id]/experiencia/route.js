// app/api/personal/[id]/experiencia/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

function normalizarTexto(valor) {
  return String(valor || '').trim().toUpperCase()
}

function validarExperiencia(body) {
  if (!body.empresa || !body.cargo || !body.fecha_inicio) {
    return 'Empresa, cargo y fecha de inicio son obligatorios.'
  }

  if (!body.actualmente && !body.fecha_fin) {
    return 'Debe indicar fecha de fin o marcar que labora actualmente.'
  }

  if (
    body.fecha_fin &&
    body.fecha_inicio &&
    body.fecha_fin < body.fecha_inicio
  ) {
    return 'La fecha de fin no puede ser anterior a la fecha de inicio.'
  }

  return ''
}

function prepararExperiencia(body) {
  return {
    empresa: normalizarTexto(body.empresa),
    cargo: normalizarTexto(body.cargo),
    fecha_inicio: body.fecha_inicio || null,
    fecha_fin: body.actualmente ? null : body.fecha_fin || null,
    actualmente: Boolean(body.actualmente),
    funciones: body.funciones || null,
    jefe_inmediato: normalizarTexto(body.jefe_inmediato),
    telefono_contacto: String(body.telefono_contacto || '').trim(),
    soporte_url: body.soporte_url || null,
    observaciones: body.observaciones || null,
  }
}

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
      .from('experiencia_laboral_personal')
      .select('*')
      .eq('personal_id', id)
      .order('fecha_inicio', {
        ascending: false,
        nullsFirst: false,
      })

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
      experiencia: data || [],
    })
  } catch (error) {
    console.error(
      'Error GET /api/personal/[id]/experiencia:',
      error
    )

    return respuestaError(error)
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()

    const mensajeValidacion = validarExperiencia(body)

    if (mensajeValidacion) {
      return NextResponse.json(
        {
          status: 'failed',
          message: mensajeValidacion,
        },
        { status: 400 }
      )
    }

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request, body)

    const { data, error } = await supabase
      .from('experiencia_laboral_personal')
      .insert({
        personal_id: Number(id),
        ...prepararExperiencia(body),
      })
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
      message:
        'Experiencia laboral registrada correctamente.',
      experiencia: data,
    })
  } catch (error) {
    console.error(
      'Error POST /api/personal/[id]/experiencia:',
      error
    )

    return respuestaError(error)
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'No se recibió el ID de la experiencia laboral.',
        },
        { status: 400 }
      )
    }

    const mensajeValidacion = validarExperiencia(body)

    if (mensajeValidacion) {
      return NextResponse.json(
        {
          status: 'failed',
          message: mensajeValidacion,
        },
        { status: 400 }
      )
    }

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request, body)

    const { data, error } = await supabase
      .from('experiencia_laboral_personal')
      .update(prepararExperiencia(body))
      .eq('id', body.id)
      .eq('personal_id', id)
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
      message:
        'Experiencia laboral actualizada correctamente.',
      experiencia: data,
    })
  } catch (error) {
    console.error(
      'Error PATCH /api/personal/[id]/experiencia:',
      error
    )

    return respuestaError(error)
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const experienciaId = searchParams.get('experiencia_id')

    if (!experienciaId) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'No se recibió el ID de la experiencia laboral.',
        },
        { status: 400 }
      )
    }

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request)

    const { error } = await supabase
      .from('experiencia_laboral_personal')
      .delete()
      .eq('id', experienciaId)
      .eq('personal_id', id)

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
      message:
        'Experiencia laboral eliminada correctamente.',
    })
  } catch (error) {
    console.error(
      'Error DELETE /api/personal/[id]/experiencia:',
      error
    )

    return respuestaError(error)
  }
}