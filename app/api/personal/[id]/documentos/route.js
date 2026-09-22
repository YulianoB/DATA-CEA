// app/api/personal/[id]/documentos/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

function normalizarTexto(valor) {
  return String(valor || '').trim().toUpperCase()
}

function validarDocumento(body) {
  if (!body.tipo_documento || !body.nombre_documento) {
    return 'Tipo de documento y nombre del documento son obligatorios.'
  }

  if (body.vence && !body.fecha_vencimiento) {
    return 'Si el documento vence, debe indicar la fecha de vencimiento.'
  }

  return ''
}

function prepararDocumento(body) {
  return {
    tipo_documento: normalizarTexto(body.tipo_documento),
    nombre_documento: body.nombre_documento?.trim() || '',
    archivo_url: body.archivo_url?.trim() || null,
    fecha_vencimiento: body.vence
      ? body.fecha_vencimiento || null
      : null,
    vence: Boolean(body.vence),
    estado: String(body.estado || 'vigente')
      .trim()
      .toLowerCase(),
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
      .from('documentos_personal')
      .select('*')
      .eq('personal_id', id)
      .order('created_at', { ascending: false })

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
      documentos: data || [],
    })
  } catch (error) {
    console.error(
      'Error GET /api/personal/[id]/documentos:',
      error
    )

    return respuestaError(error)
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()

    const mensajeValidacion = validarDocumento(body)

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
      .from('documentos_personal')
      .insert({
        personal_id: Number(id),
        ...prepararDocumento(body),
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
      message: 'Documento registrado correctamente.',
      documento: data,
    })
  } catch (error) {
    console.error(
      'Error POST /api/personal/[id]/documentos:',
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
          message: 'No se recibió el ID del documento.',
        },
        { status: 400 }
      )
    }

    const mensajeValidacion = validarDocumento(body)

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
      .from('documentos_personal')
      .update(prepararDocumento(body))
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
      message: 'Documento actualizado correctamente.',
      documento: data,
    })
  } catch (error) {
    console.error(
      'Error PATCH /api/personal/[id]/documentos:',
      error
    )

    return respuestaError(error)
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const documentoId =
      searchParams.get('documento_id')

    if (!documentoId) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'No se recibió el ID del documento.',
        },
        { status: 400 }
      )
    }

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request)

    const { error } = await supabase
      .from('documentos_personal')
      .delete()
      .eq('id', documentoId)
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
      message: 'Documento eliminado correctamente.',
    })
  } catch (error) {
    console.error(
      'Error DELETE /api/personal/[id]/documentos:',
      error
    )

    return respuestaError(error)
  }
}