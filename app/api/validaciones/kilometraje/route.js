import { referenciaKilometraje, evaluarKilometraje } from '@/lib/servicios/referenciaKilometrajeServer'
// app/api/validaciones/kilometraje/route.js

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

// ============================================================
// POST
// ============================================================
//
// Recibe:
//
// {
//   nit: "900....",
//   placa: "ABC123",
//   kilometraje: 12500
// }
//
// Consulta el kilometraje máximo registrado en:
//
// - preoperacionales.km_registro
// - horarios.km_inicial
// - horarios.km_final
// - mantenimientos.kilometraje
// - reporte_fallas.kilometraje
//
// ============================================================

export async function POST(request) {
  try {
    const body = await request.json()

    const placa =
      normalizarTexto(body.placa)

    const kilometraje =
      Number(body.kilometraje)

    // ========================================================
    // VALIDACIONES DE ENTRADA
    // ========================================================

    if (!placa) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'La placa es obligatoria.',
        },
        { status: 400 }
      )
    }

    if (
      !Number.isFinite(kilometraje) ||
      kilometraje < 0
    ) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'El kilometraje ingresado no es válido.',
        },
        { status: 400 }
      )
    }

    // ========================================================
    // OBTENER BASE DEL CEA
    // ========================================================

    const { supabaseAdmin } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const supabase = supabaseAdmin

    // La referencia es cronológica y se obtiene de lecturas recientes.
    const fechaEjecucion = body.fecha_ejecucion || null
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    if (fechaEjecucion && (!/^\d{4}-\d{2}-\d{2}$/.test(fechaEjecucion) || fechaEjecucion > hoy)) {
      return NextResponse.json({ status: 'failed', message: 'La fecha de ejecución no es válida.' }, { status: 400 })
    }
    const referencia = await referenciaKilometraje(supabase, placa, fechaEjecucion)
    const resultado = evaluarKilometraje(kilometraje, referencia, {
      retrospectivo: Boolean(fechaEjecucion && fechaEjecucion < hoy),
    })
    return NextResponse.json({ status: 'success', resultado })
  } catch (error) {
    console.error(
      'Error POST /api/validaciones/kilometraje:',
      error
    )

    return respuestaError(error)
  }
}