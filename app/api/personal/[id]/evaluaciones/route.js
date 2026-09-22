// app/api/personal/[id]/evaluaciones/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

function normalizarTexto(valor) {
  return String(valor || '').trim().toUpperCase()
}

function validarEvaluacion(body) {
  if (!body.tipo_evaluacion || !body.fecha_evaluacion || !body.resultado) {
    return 'Tipo de evaluación, fecha y resultado son obligatorios.'
  }

  return ''
}

function prepararEvaluacion(body) {
  return {
    tipo_evaluacion: normalizarTexto(body.tipo_evaluacion),
    fecha_evaluacion: body.fecha_evaluacion || null,
    resultado: normalizarTexto(body.resultado),
    evaluador: normalizarTexto(body.evaluador),
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
      .from('evaluaciones_personal')
      .select('*')
      .eq('personal_id', id)
      .order('fecha_evaluacion', {
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
      evaluaciones: data || [],
    })
  } catch (error) {
    console.error(
      'Error GET /api/personal/[id]/evaluaciones:',
      error
    )

    return respuestaError(error)
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()

    const mensajeValidacion = validarEvaluacion(body)

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
      .from('evaluaciones_personal')
      .insert({
        personal_id: Number(id),
        ...prepararEvaluacion(body),
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
      message: 'Evaluación registrada correctamente.',
      evaluacion: data,
    })
  } catch (error) {
    console.error(
      'Error POST /api/personal/[id]/evaluaciones:',
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
          message: 'No se recibió el ID de la evaluación.',
        },
        { status: 400 }
      )
    }

    const mensajeValidacion = validarEvaluacion(body)

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
      .from('evaluaciones_personal')
      .update(prepararEvaluacion(body))
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
      message: 'Evaluación actualizada correctamente.',
      evaluacion: data,
    })
  } catch (error) {
    console.error(
      'Error PATCH /api/personal/[id]/evaluaciones:',
      error
    )

    return respuestaError(error)
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const evaluacionId =
      searchParams.get('evaluacion_id')

    if (!evaluacionId) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'No se recibió el ID de la evaluación.',
        },
        { status: 400 }
      )
    }

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request)

    const { error } = await supabase
      .from('evaluaciones_personal')
      .delete()
      .eq('id', evaluacionId)
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
      message: 'Evaluación eliminada correctamente.',
    })
  } catch (error) {
    console.error(
      'Error DELETE /api/personal/[id]/evaluaciones:',
      error
    )

    return respuestaError(error)
  }
}