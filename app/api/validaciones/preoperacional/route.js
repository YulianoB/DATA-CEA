// app/api/validaciones/preoperacional/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

function respuestaError(error) {
  const respuesta = respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    { status: respuesta.status }
  )
}

function normalizarTexto(valor) {
  return String(valor || '').trim().toUpperCase()
}

export async function POST(request) {
  try {
    const body = await request.json()

    const tipo = String(body?.tipo || '').trim()
    const placa = normalizarTexto(body?.placa)
    const fecha = String(body?.fecha || '').trim()

    // =========================================================
    // VALIDACIONES BÁSICAS
    // =========================================================

    if (!tipo) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'No se recibió el tipo de validación.',
        },
        { status: 400 }
      )
    }

    if (!placa) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'La placa es obligatoria.',
        },
        { status: 400 }
      )
    }

    if (tipo !== 'duplicado') {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'Tipo de validación no válido.',
        },
        { status: 400 }
      )
    }

    if (!fecha) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'La fecha es obligatoria.',
        },
        { status: 400 }
      )
    }

    // =========================================================
    // OBTENER BASE DEL CEA
    // =========================================================

    const { supabaseAdmin } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const supabase = supabaseAdmin

    // =========================================================
    // VALIDAR DUPLICADO
    // =========================================================

    const { data, error } = await supabase
      .from('preoperacionales')
      .select('id')
      .eq('placa', placa)
      .eq('fecha_registro', fecha)
      .limit(1)

    if (error) {
      console.error(
        'Error validando duplicado preoperacional:',
        error
      )

      return NextResponse.json(
        {
          status: 'failed',
          message:
            'Error al validar duplicado: ' +
            error.message,
        },
        { status: 500 }
      )
    }

    if (Array.isArray(data) && data.length > 0) {
      return NextResponse.json({
        status: 'success',
        existe: true,
        mensaje:
          `Ya existe una inspección registrada hoy para la placa ${placa}.`,
      })
    }

    return NextResponse.json({
      status: 'success',
      existe: false,
      mensaje:
        'No existe inspección para esta placa en la fecha indicada, puede continuar.',
    })
  } catch (error) {
    console.error(
      'Error POST /api/validaciones/preoperacional:',
      error
    )

    return respuestaError(error)
  }
}