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

    // ========================================================
    // FUENTES DE KILOMETRAJE
    // ========================================================

    const consultas = [
      {
        tabla: 'preoperacionales',
        campo: 'km_registro',
      },
      {
        tabla: 'horarios',
        campo: 'km_inicial',
      },
      {
        tabla: 'horarios',
        campo: 'km_final',
      },
      {
        tabla: 'mantenimientos',
        campo: 'kilometraje',
      },
      {
        tabla: 'reporte_fallas',
        campo: 'kilometraje',
      },
    ]

    let maxKm = 0
    let fuente = ''
    let campo = ''

    // ========================================================
    // BUSCAR EL MAYOR KILOMETRAJE
    // ========================================================

    for (const consulta of consultas) {
      const { data, error } = await supabase
        .from(consulta.tabla)
        .select(consulta.campo)
        .eq('placa', placa)
        .not(consulta.campo, 'is', null)
        .order(consulta.campo, {
          ascending: false,
        })
        .limit(1)

      if (error) {
        console.error(
            `Error consultando ${consulta.tabla}.${consulta.campo}:`,
            error
        )

        return NextResponse.json(
            {
            status: 'failed',
            message:
                `No fue posible validar el kilometraje contra ${consulta.tabla}.${consulta.campo}.`,
            },
            { status: 500 }
        )
        }

      if (
        Array.isArray(data) &&
        data.length > 0
      ) {
        const valor =
          Number(
            data[0]?.[
              consulta.campo
            ]
          )

        if (
          Number.isFinite(valor) &&
          valor > maxKm
        ) {
          maxKm = valor
          fuente = consulta.tabla
          campo = consulta.campo
        }
      }
    }

    // ========================================================
    // SIN REGISTROS PREVIOS
    // ========================================================

    if (maxKm === 0) {
      return NextResponse.json({
        status: 'success',

        resultado: {
          estado: 'ok',
          mensaje:
            'No existen registros previos de kilometraje.',
          maxKm: 0,
          diferencia: null,
          fuente: null,
          campo: null,
        },
      })
    }

    // ========================================================
    // KILOMETRAJE MENOR AL ÚLTIMO REGISTRADO
    // ========================================================

    if (kilometraje < maxKm) {
      return NextResponse.json({
        status: 'success',

        resultado: {
          estado: 'error',

          mensaje:
            `El kilometraje ingresado (${kilometraje}) ` +
            `es menor al último registrado (${maxKm}) ` +
            `en la tabla ${fuente}.`,

          maxKm,
          diferencia:
            kilometraje - maxKm,
          fuente,
          campo,
        },
      })
    }

    // ========================================================
    // DIFERENCIA
    // ========================================================

    const diferencia =
      kilometraje - maxKm

    // ========================================================
    // ADVERTENCIA > 300 KM
    // ========================================================

    if (diferencia > 300) {
      return NextResponse.json({
        status: 'success',

        resultado: {
          estado: 'advertencia',

          mensaje:
            `La diferencia de kilometraje (${diferencia} km) ` +
            `supera el límite de 300 km respecto al último ` +
            `registrado (${maxKm}).`,

          maxKm,
          diferencia,
          fuente,
          campo,
        },
      })
    }

    // ========================================================
    // VÁLIDO
    // ========================================================

    return NextResponse.json({
      status: 'success',

      resultado: {
        estado: 'ok',
        mensaje: 'Kilometraje válido.',
        maxKm,
        diferencia,
        fuente,
        campo,
      },
    })
  } catch (error) {
    console.error(
      'Error POST /api/validaciones/kilometraje:',
      error
    )

    return respuestaError(error)
  }
}