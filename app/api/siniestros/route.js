// app/api/siniestros/route.js
import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'


// =========================================================
// ERROR MULTIEMPRESA
// app/api/siniestros/route.js
// =========================================================

function respuestaError(error) {
  const respuesta =
    respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    {
      status:
        respuesta.status,
    }
  )
}


// =========================================================
// HELPERS
// app/api/siniestros/route.js
// =========================================================

function normalizarTexto(valor) {
  return String(
    valor ?? ''
  ).trim()
}


function normalizarMayusculas(valor) {
  return normalizarTexto(
    valor
  ).toUpperCase()
}


function validarEnteroMin0(valor) {
  const numero =
    Number(valor)

  return (
    Number.isInteger(
      numero
    ) &&
    numero >= 0
  )
}


function hoyBogota() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',

      timeZone:
        'America/Bogota',
    }
  ).format(
    new Date()
  )
}


// =========================================================
// GET
// app/api/siniestros/route.js
//
// Recursos:
// - vehiculos
// =========================================================

export async function GET(request) {
  try {
    const {
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const supabase =
      supabaseAdmin

    const {
      searchParams,
    } =
      new URL(
        request.url
      )

    const recurso =
      normalizarTexto(
        searchParams.get(
          'recurso'
        )
      )


    // =====================================================
    // VEHÍCULOS
    // app/api/siniestros/route.js
    // =====================================================

    if (
      recurso ===
      'vehiculos'
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'vehiculos'
          )
          .select(`
            id,
            placa,
            tipo_vehiculo,
            marca,
            estado
          `)
          .order(
            'placa',
            {
              ascending:
                true,
            }
          )


      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              error.message,
          },
          {
            status:
              500,
          }
        )
      }


      return NextResponse.json({
        status:
          'success',

        vehiculos:
          data || [],
      })
    }


    // =====================================================
    // RECURSO NO VÁLIDO
    // =====================================================

    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'Recurso no válido.',
      },
      {
        status:
          400,
      }
    )
  } catch (error) {
    console.error(
      'Error GET /api/siniestros:',
      error
    )

    return respuestaError(
      error
    )
  }
}


// =========================================================
// POST
// app/api/siniestros/route.js
//
// Acción:
// - registrar
// =========================================================

export async function POST(request) {
  try {
    const body =
      await request.json()


    const {
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )


    const supabase =
      supabaseAdmin


    const accion =
      normalizarTexto(
        body?.accion
      )


    if (
      accion !==
      'registrar'
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'Acción no válida.',
        },
        {
          status:
            400,
        }
      )
    }


    // =====================================================
    // NORMALIZAR DATOS
    // app/api/siniestros/route.js
    // =====================================================

    const fechaSiniestro =
      normalizarTexto(
        body?.fecha_siniestro
      )


    const tipoSiniestro =
      normalizarTexto(
        body?.tipo_siniestro
      )


    const placa =
      normalizarMayusculas(
        body?.placa
      )


    const nombreConductor =
      normalizarMayusculas(
        body
          ?.nombre_conductor_implicado
      )


    const documento =
      normalizarTexto(
        body?.documento
      )


    const resumen =
      normalizarTexto(
        body?.resumen
      )


    const personasInvolucradas =
      Number(
        body
          ?.num_personas_involucradas
      )


    const heridosLeves =
      Number(
        body?.heridos_leves
      )


    const heridosGraves =
      Number(
        body?.heridos_graves
      )


    const fatalidades =
      Number(
        body?.fatalidades
      )


    // =====================================================
    // VALIDACIONES BÁSICAS
    // app/api/siniestros/route.js
    // =====================================================

    if (
      !fechaSiniestro
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La fecha del siniestro es obligatoria.',
        },
        {
          status:
            400,
        }
      )
    }


    if (
      !tipoSiniestro
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El tipo de siniestro es obligatorio.',
        },
        {
          status:
            400,
        }
      )
    }


    if (!placa) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La placa es obligatoria.',
        },
        {
          status:
            400,
        }
      )
    }


    if (
      !nombreConductor
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El nombre del conductor es obligatorio.',
        },
        {
          status:
            400,
        }
      )
    }


    if (!documento) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El documento del conductor es obligatorio.',
        },
        {
          status:
            400,
        }
      )
    }


    if (!resumen) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El resumen del siniestro es obligatorio.',
        },
        {
          status:
            400,
        }
      )
    }


    // =====================================================
    // VALIDAR FECHA FUTURA
    // app/api/siniestros/route.js
    // =====================================================

    const fechaHoy =
      hoyBogota()


    if (
      fechaSiniestro >
      fechaHoy
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La fecha del siniestro no puede ser futura.',
        },
        {
          status:
            400,
        }
      )
    }


    // =====================================================
    // VALIDAR CANTIDADES
    // app/api/siniestros/route.js
    // =====================================================

    if (
      !validarEnteroMin0(
        personasInvolucradas
      )
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El número de personas involucradas no es válido.',
        },
        {
          status:
            400,
        }
      )
    }


    if (
      !validarEnteroMin0(
        heridosLeves
      )
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El número de heridos leves no es válido.',
        },
        {
          status:
            400,
        }
      )
    }


    if (
      !validarEnteroMin0(
        heridosGraves
      )
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El número de heridos graves no es válido.',
        },
        {
          status:
            400,
        }
      )
    }


    if (
      !validarEnteroMin0(
        fatalidades
      )
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El número de fatalidades no es válido.',
        },
        {
          status:
            400,
        }
      )
    }


    // =====================================================
    // VALIDAR COHERENCIA ENTRE PERSONAS Y AFECTADOS
    // app/api/siniestros/route.js
    //
    // heridos leves
    // + heridos graves
    // + fatalidades
    // <= personas involucradas
    // =====================================================

    const totalAfectados =
      heridosLeves +
      heridosGraves +
      fatalidades


    if (
      totalAfectados >
      personasInvolucradas
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La suma de heridos leves, heridos graves y fatalidades no puede ser mayor que el número de personas involucradas.',
        },
        {
          status:
            400,
        }
      )
    }


    // =====================================================
    // VALIDAR VEHÍCULO
    // app/api/siniestros/route.js
    // =====================================================

    const {
      data:
        vehiculo,

      error:
        vehiculoError,
    } =
      await supabase
        .from(
          'vehiculos'
        )
        .select(`
          id,
          placa,
          estado
        `)
        .eq(
          'placa',
          placa
        )
        .maybeSingle()


    if (
      vehiculoError
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            vehiculoError.message,
        },
        {
          status:
            500,
        }
      )
    }


    if (!vehiculo) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El vehículo seleccionado no existe.',
        },
        {
          status:
            404,
        }
      )
    }


    // =====================================================
    // INSERTAR SINIESTRO
    // app/api/siniestros/route.js
    //
    // IMPORTANTE:
    // - timestamp_registro lo genera el servidor
    // - estado_analisis siempre inicia PENDIENTE
    //
    // No se aceptan estos valores desde el frontend.
    // =====================================================

    const payload = {
      timestamp_registro:
        new Date()
          .toISOString(),

      fecha_siniestro:
        fechaSiniestro,

      tipo_siniestro:
        tipoSiniestro,

      num_personas_involucradas:
        personasInvolucradas,

      heridos_leves:
        heridosLeves,

      heridos_graves:
        heridosGraves,

      fatalidades,

      placa,

      nombre_conductor_implicado:
        nombreConductor,

      documento,

      resumen,

      estado_analisis:
        'PENDIENTE',
    }


    // =====================================================
    // 1. INSERTAR SIN CONSECUTIVO
    // app/api/siniestros/route.js
    //
    // PostgreSQL asigna el ID serial.
    //
    // Ejemplo:
    //
    // id = 35
    // consecutivo = SN-00035
    // =====================================================

    const {
      data:
        nuevoSiniestro,

      error:
        insertError,
    } =
      await supabase
        .from(
          'siniestros'
        )
        .insert(
          payload
        )
        .select(`
          id
        `)
        .single()


    if (
      insertError
    ) {
      console.error(
        'Error insertando siniestro:',
        insertError
      )

      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `No se pudo registrar el siniestro: ${insertError.message}`,
        },
        {
          status:
            500,
        }
      )
    }


    if (
      !nuevoSiniestro?.id
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El siniestro fue creado, pero no se obtuvo su identificador.',
        },
        {
          status:
            500,
        }
      )
    }


    // =====================================================
    // 2. GENERAR CONSECUTIVO DESDE EL ID
    // app/api/siniestros/route.js
    // =====================================================

    const consecutivo =
      `SN-${String(
        nuevoSiniestro.id
      ).padStart(
        5,
        '0'
      )}`


    // =====================================================
    // 3. ACTUALIZAR EL MISMO REGISTRO
    // app/api/siniestros/route.js
    // =====================================================

    const {
      data:
        siniestro,

      error:
        updateError,
    } =
      await supabase
        .from(
          'siniestros'
        )
        .update({
          consecutivo,
        })
        .eq(
          'id',
          nuevoSiniestro.id
        )
        .select(`
          id,
          consecutivo,
          timestamp_registro,
          fecha_siniestro,
          tipo_siniestro,
          num_personas_involucradas,
          heridos_leves,
          heridos_graves,
          fatalidades,
          placa,
          nombre_conductor_implicado,
          documento,
          resumen,
          estado_analisis
        `)
        .single()


    // =====================================================
    // 4. SI FALLA EL CONSECUTIVO, REVERTIR EL REGISTRO
    // app/api/siniestros/route.js
    // =====================================================

    if (
      updateError
    ) {
      console.error(
        'Error asignando consecutivo:',
        updateError
      )


      const {
        error:
          rollbackError,
      } =
        await supabase
          .from(
            'siniestros'
          )
          .delete()
          .eq(
            'id',
            nuevoSiniestro.id
          )


      if (
        rollbackError
      ) {
        console.error(
          'Error eliminando siniestro incompleto:',
          rollbackError
        )

        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'No fue posible asignar el consecutivo y tampoco fue posible eliminar automáticamente el registro incompleto.',

            registro_incompleto_id:
              nuevoSiniestro.id,
          },
          {
            status:
              500,
          }
        )
      }


      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'No fue posible asignar el consecutivo. El registro incompleto fue eliminado automáticamente.',
        },
        {
          status:
            500,
        }
      )
    }


    // =====================================================
    // RESPUESTA
    // app/api/siniestros/route.js
    // =====================================================

    return NextResponse.json(
      {
        status:
          'success',

        message:
          'Siniestro registrado correctamente.',

        consecutivo,

        siniestro,
      },
      {
        status:
          201,
      }
    )
  } catch (error) {
    console.error(
      'Error POST /api/siniestros:',
      error
    )

    return respuestaError(
      error
    )
  }
}