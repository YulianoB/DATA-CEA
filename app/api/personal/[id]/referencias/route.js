// app/api/personal/[id]/referencias/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

function normalizarTexto(valor) {
  return String(valor || '').trim().toUpperCase()
}

function normalizarEmail(valor) {
  return String(valor || '').trim().toLowerCase()
}

function validarReferencia(body) {
  if (!body.tipo_referencia || !body.nombre || !body.telefono) {
    return 'Tipo de referencia, nombre y teléfono son obligatorios.'
  }

  if (!['personal', 'laboral'].includes(body.tipo_referencia)) {
    return 'El tipo de referencia debe ser personal o laboral.'
  }

  if (
    body.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
  ) {
    return 'El correo de la referencia no tiene un formato válido.'
  }

  return ''
}

function prepararReferencia(body) {
  return {
    tipo_referencia: body.tipo_referencia,
    nombre: normalizarTexto(body.nombre),
    ocupacion_cargo: normalizarTexto(body.ocupacion_cargo),
    empresa: normalizarTexto(body.empresa),
    telefono: String(body.telefono || '').trim(),
    email: normalizarEmail(body.email),
    relacion: normalizarTexto(body.relacion),
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
      .from('referencias_personal')
      .select('*')
      .eq('personal_id', id)
      .order('tipo_referencia', { ascending: true })
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
      referencias: data || [],
    })
  } catch (error) {
    console.error(
      'Error GET /api/personal/[id]/referencias:',
      error
    )

    return respuestaError(error)
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()

    const mensajeValidacion = validarReferencia(body)

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
      .from('referencias_personal')
      .insert({
        personal_id: Number(id),
        ...prepararReferencia(body),
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
      message: 'Referencia registrada correctamente.',
      referencia: data,
    })
  } catch (error) {
    console.error(
      'Error POST /api/personal/[id]/referencias:',
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
          message: 'No se recibió el ID de la referencia.',
        },
        { status: 400 }
      )
    }

    const mensajeValidacion = validarReferencia(body)

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
      .from('referencias_personal')
      .update(prepararReferencia(body))
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
      message: 'Referencia actualizada correctamente.',
      referencia: data,
    })
  } catch (error) {
    console.error(
      'Error PATCH /api/personal/[id]/referencias:',
      error
    )

    return respuestaError(error)
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const referenciaId =
      searchParams.get('referencia_id')

    if (!referenciaId) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'No se recibió el ID de la referencia.',
        },
        { status: 400 }
      )
    }

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request)

    const { error } = await supabase
      .from('referencias_personal')
      .delete()
      .eq('id', referenciaId)
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
      message: 'Referencia eliminada correctamente.',
    })
  } catch (error) {
    console.error(
      'Error DELETE /api/personal/[id]/referencias:',
      error
    )

    return respuestaError(error)
  }
}