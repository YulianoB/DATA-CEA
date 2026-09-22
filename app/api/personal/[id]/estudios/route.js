// app/api/personal/[id]/estudios/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

function normalizarTexto(valor) {
  return String(valor || '').trim().toUpperCase()
}

function validarEstudio(body) {
  if (!body.nivel_estudio || !body.titulo || !body.institucion) {
    return 'Nivel de estudio, título e institución son obligatorios.'
  }

  return ''
}

function prepararEstudio(body) {
  return {
    nivel_estudio: body.nivel_estudio,
    titulo: normalizarTexto(body.titulo),
    institucion: normalizarTexto(body.institucion),
    fecha_grado: body.fecha_grado || null,
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
      .from('estudios_personal')
      .select('*')
      .eq('personal_id', id)
      .order('fecha_grado', {
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
      estudios: data || [],
    })
  } catch (error) {
    console.error(
      'Error GET /api/personal/[id]/estudios:',
      error
    )

    return respuestaError(error)
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()

    const mensajeValidacion = validarEstudio(body)

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
      .from('estudios_personal')
      .insert({
        personal_id: Number(id),
        ...prepararEstudio(body),
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
      message: 'Estudio registrado correctamente.',
      estudio: data,
    })
  } catch (error) {
    console.error(
      'Error POST /api/personal/[id]/estudios:',
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
          message: 'No se recibió el ID del estudio.',
        },
        { status: 400 }
      )
    }

    const mensajeValidacion = validarEstudio(body)

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
      .from('estudios_personal')
      .update(prepararEstudio(body))
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
      message: 'Estudio actualizado correctamente.',
      estudio: data,
    })
  } catch (error) {
    console.error(
      'Error PATCH /api/personal/[id]/estudios:',
      error
    )

    return respuestaError(error)
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const estudioId = searchParams.get('estudio_id')

    if (!estudioId) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'No se recibió el ID del estudio.',
        },
        { status: 400 }
      )
    }

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request)

    const { error } = await supabase
      .from('estudios_personal')
      .delete()
      .eq('id', estudioId)
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
      message: 'Estudio eliminado correctamente.',
    })
  } catch (error) {
    console.error(
      'Error DELETE /api/personal/[id]/estudios:',
      error
    )

    return respuestaError(error)
  }
}