// app/api/fallas/route.js

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
  return String(valor || '').trim()
}

function normalizarMayusculas(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
}

// =========================================================
// GET
// =========================================================

export async function GET(request) {
  try {
    const { supabaseAdmin } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const supabase = supabaseAdmin

    const { searchParams } =
      new URL(request.url)

    const recurso =
      normalizarTexto(
        searchParams.get('recurso')
      )

    // =====================================================
    // VEHÍCULOS
    // =====================================================

    if (recurso === 'vehiculos') {
      const { data, error } = await supabase
        .from('vehiculos')
        .select(`
          id,
          placa,
          tipo_vehiculo,
          marca,
          estado
        `)
        .order('placa', {
          ascending: true,
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
        vehiculos: data || [],
      })
    }

    return NextResponse.json(
      {
        status: 'failed',
        message: 'Recurso no válido.',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error(
      'Error GET /api/fallas:',
      error
    )

    return respuestaError(error)
  }
}

// =========================================================
// POST
// =========================================================

export async function POST(request) {
  try {
    const body = await request.json()

    const { supabaseAdmin } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const supabase = supabaseAdmin

    const accion =
      normalizarTexto(body.accion)

    if (accion !== 'registrar') {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'Acción no válida.',
        },
        { status: 400 }
      )
    }

    // =====================================================
    // NORMALIZAR DATOS
    // =====================================================

    const fecha =
      normalizarTexto(body.fecha)

    const hora =
      normalizarTexto(body.hora)

    const placa =
      normalizarMayusculas(body.placa)

    const tipoVehiculo =
      normalizarTexto(
        body.tipo_vehiculo
      )

    const marca =
      normalizarTexto(body.marca)

    const nombreEncargado =
      normalizarTexto(
        body.nombre_encargado
      )

    const descripcionFalla =
      normalizarMayusculas(
        body.descripcion_falla
      )

    const accionesTomadas =
      normalizarMayusculas(
        body.acciones_tomadas
      )

    const estado =
      normalizarMayusculas(
        body.estado
      ) || 'PENDIENTE'

    const kilometraje =
      Number(body.kilometraje)

    // =====================================================
    // VALIDACIONES
    // =====================================================

    if (!fecha) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'La fecha del reporte es obligatoria.',
        },
        { status: 400 }
      )
    }

    if (!hora) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'La hora del reporte es obligatoria.',
        },
        { status: 400 }
      )
    }

    if (!placa) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'La placa es obligatoria.',
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
            'El kilometraje no es válido.',
        },
        { status: 400 }
      )
    }

    if (!descripcionFalla) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'La descripción de la falla es obligatoria.',
        },
        { status: 400 }
      )
    }

    if (!accionesTomadas) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'Las acciones tomadas son obligatorias.',
        },
        { status: 400 }
      )
    }

    // =====================================================
    // VALIDAR VEHÍCULO
    // =====================================================

    const {
      data: vehiculo,
      error: vehiculoError,
    } = await supabase
      .from('vehiculos')
      .select(`
        id,
        placa,
        tipo_vehiculo,
        marca,
        estado
      `)
      .eq('placa', placa)
      .maybeSingle()

    if (vehiculoError) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            vehiculoError.message,
        },
        { status: 500 }
      )
    }

    if (!vehiculo) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'El vehículo seleccionado no existe.',
        },
        { status: 404 }
      )
    }

    // =====================================================
    // 1. INSERTAR SIN CONSECUTIVO
    // =====================================================
    //
    // PostgreSQL asigna automáticamente el id serial.
    //
    // Ejemplo:
    // id = 25
    // RF-000025
    //
    // =====================================================

    const payload = {
      fecha,
      hora,

      placa,

      tipo_vehiculo:
        tipoVehiculo ||
        vehiculo.tipo_vehiculo ||
        null,

      marca:
        marca ||
        vehiculo.marca ||
        null,

      kilometraje,

      nombre_encargado:
        nombreEncargado ||
        null,

      descripcion_falla:
        descripcionFalla,

      acciones_tomadas:
        accionesTomadas,

      estado,
    }

    const {
      data: nuevaFalla,
      error: insertError,
    } = await supabase
      .from('reporte_fallas')
      .insert(payload)
      .select('id')
      .single()

    if (insertError) {
      console.error(
        'Error insertando reporte de falla:',
        insertError
      )

      return NextResponse.json(
        {
          status: 'failed',
          message:
            `No se pudo registrar la falla: ${insertError.message}`,
        },
        { status: 500 }
      )
    }

    if (!nuevaFalla?.id) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'La falla fue creada, pero no se obtuvo su identificador.',
        },
        { status: 500 }
      )
    }

    // =====================================================
    // 2. GENERAR CONSECUTIVO DESDE EL ID
    // =====================================================
    //
    // Formato:
    //
    // id 1    -> RF-000001
    // id 25   -> RF-000025
    // id 350  -> RF-000350
    //
    // =====================================================

    const consecutivo =
      `RF-${String(
        nuevaFalla.id
      ).padStart(6, '0')}`

    // =====================================================
    // 3. ACTUALIZAR EL MISMO REGISTRO
    // =====================================================

    const {
      data: falla,
      error: updateError,
    } = await supabase
      .from('reporte_fallas')
      .update({
        consecutivo,
      })
      .eq(
        'id',
        nuevaFalla.id
      )
      .select(`
        id,
        consecutivo,
        fecha,
        hora,
        placa,
        tipo_vehiculo,
        marca,
        kilometraje,
        nombre_encargado,
        descripcion_falla,
        acciones_tomadas,
        estado
      `)
      .single()

    // =====================================================
    // 4. SI FALLA EL CONSECUTIVO, ELIMINAR REGISTRO INCOMPLETO
    // =====================================================

    if (updateError) {
      console.error(
        'Error asignando consecutivo a falla:',
        updateError
      )

      const {
        error: rollbackError,
      } = await supabase
        .from('reporte_fallas')
        .delete()
        .eq(
          'id',
          nuevaFalla.id
        )

      if (rollbackError) {
        console.error(
          'Error eliminando falla incompleta:',
          rollbackError
        )

        return NextResponse.json(
          {
            status: 'failed',
            message:
              'No fue posible asignar el consecutivo y tampoco eliminar automáticamente el registro incompleto.',
            registro_incompleto_id:
              nuevaFalla.id,
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          status: 'failed',
          message:
            'No fue posible asignar el consecutivo. El registro incompleto fue eliminado automáticamente.',
        },
        { status: 500 }
      )
    }

    // =====================================================
    // RESPUESTA
    // =====================================================

    return NextResponse.json(
      {
        status: 'success',

        message:
          'Falla registrada correctamente.',

        consecutivo,

        falla,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      'Error POST /api/fallas:',
      error
    )

    return respuestaError(error)
  }
}