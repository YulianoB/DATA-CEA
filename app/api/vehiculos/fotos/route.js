// app/api/vehiculos/fotos/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const BUCKET_VEHICULOS =
  'vehiculos'

const TIPO_FRONTAL =
  'frontal'

const TIPO_LATERAL =
  'lateral'

const TIPOS_PERMITIDOS = [
  TIPO_FRONTAL,
  TIPO_LATERAL,
]

const MIME_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

const TAMANO_MAXIMO =
  3 * 1024 * 1024

const URL_FIRMADA_SEGUNDOS =
  60 * 60

// =========================================================
// HELPERS
// =========================================================

function respuestaError(error) {
  const respuesta =
    respuestaErrorEmpresa(
      error
    )

  return NextResponse.json(
    respuesta.body,
    {
      status:
        respuesta.status,
    }
  )
}

function normalizarTexto(valor) {
  return String(
    valor || ''
  ).trim()
}

function normalizarMinusculas(valor) {
  return String(
    valor || ''
  )
    .trim()
    .toLowerCase()
}

// =========================================================
// PATH FIJO
// =========================================================
//
// No usamos extensión deliberadamente.
//
// De esta forma siempre existen como máximo:
//
// vehiculos/123/frontal
// vehiculos/123/lateral
//
// Aunque una fotografía pase de JPG a WEBP, el mismo objeto
// será reemplazado.
//
// =========================================================

function obtenerPathFoto(
  vehiculoId,
  tipo
) {
  return `vehiculos/${vehiculoId}/${tipo}`
}

// =========================================================
// COLUMNA SEGÚN TIPO
// =========================================================

function obtenerColumnaFoto(
  tipo
) {
  if (
    tipo ===
    TIPO_FRONTAL
  ) {
    return 'foto_frontal_path'
  }

  if (
    tipo ===
    TIPO_LATERAL
  ) {
    return 'foto_lateral_path'
  }

  return null
}

// =========================================================
// OBTENER VEHÍCULO
// =========================================================

async function obtenerVehiculo(
  supabase,
  vehiculoId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from('vehiculos')
      .select(`
        id,
        placa,
        foto_frontal_path,
        foto_lateral_path
      `)
      .eq(
        'id',
        vehiculoId
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      `No fue posible consultar el vehículo: ${error.message}`
    )
  }

  return data || null
}

// =========================================================
// CREAR URL FIRMADA
// =========================================================

async function crearUrlFirmada(
  supabase,
  path
) {
  if (!path) {
    return null
  }

  const {
    data,
    error,
  } =
    await supabase
      .storage
      .from(
        BUCKET_VEHICULOS
      )
      .createSignedUrl(
        path,
        URL_FIRMADA_SEGUNDOS
      )

  if (error) {
    console.warn(
      `No fue posible firmar ${path}:`,
      error
    )

    return null
  }

  return (
    data?.signedUrl ||
    null
  )
}

// =========================================================
// GET
// =========================================================
//
// Devuelve URLs temporales para mostrar las fotos.
//
// GET:
// /api/vehiculos/fotos
//   ?nit=...
//   &vehiculo_id=123
//
// =========================================================

export async function GET(request) {
  try {
    const {
      searchParams,
    } =
      new URL(
        request.url
      )

    const vehiculoId =
      Number(
        searchParams.get(
          'vehiculo_id'
        )
      )

    if (
      !Number.isInteger(
        vehiculoId
      ) ||
      vehiculoId <= 0
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El vehículo no es válido.',
        },
        {
          status:
            400,
        }
      )
    }

    const {
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const supabase =
      supabaseAdmin

    const vehiculo =
      await obtenerVehiculo(
        supabase,
        vehiculoId
      )

    if (!vehiculo) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El vehículo no existe.',
        },
        {
          status:
            404,
        }
      )
    }

    const [
      fotoFrontal,
      fotoLateral,
    ] =
      await Promise.all([
        crearUrlFirmada(
          supabase,
          vehiculo
            .foto_frontal_path
        ),

        crearUrlFirmada(
          supabase,
          vehiculo
            .foto_lateral_path
        ),
      ])

    return NextResponse.json({
      status:
        'success',

      vehiculo: {
        id:
          vehiculo.id,

        placa:
          vehiculo.placa,
      },

      fotos: {
        frontal:
          fotoFrontal,

        lateral:
          fotoLateral,
      },

      paths: {
        frontal:
          vehiculo
            .foto_frontal_path ||
          null,

        lateral:
          vehiculo
            .foto_lateral_path ||
          null,
      },

      expires_in:
        URL_FIRMADA_SEGUNDOS,
    })
  } catch (error) {
    console.error(
      'Error GET /api/vehiculos/fotos:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// =========================================================
// POST
// =========================================================
//
// Espera FormData:
//
// nit
// vehiculo_id
// tipo = frontal | lateral
// archivo
//
// =========================================================

export async function POST(request) {
  try {
    const formData =
      await request.formData()

    const vehiculoId =
      Number(
        formData.get(
          'vehiculo_id'
        )
      )

    const tipo =
      normalizarMinusculas(
        formData.get(
          'tipo'
        )
      )

    const archivo =
      formData.get(
        'archivo'
      )

    const nit =
      normalizarTexto(
        formData.get(
          'nit'
        )
      )

    // =====================================================
    // VALIDACIONES
    // =====================================================

    if (!nit) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'No se recibió el NIT del CEA.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      !Number.isInteger(
        vehiculoId
      ) ||
      vehiculoId <= 0
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El vehículo no es válido.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      !TIPOS_PERMITIDOS.includes(
        tipo
      )
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El tipo de fotografía no es válido.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      !archivo ||
      typeof archivo
        .arrayBuffer !==
        'function'
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'No se recibió una fotografía.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      !MIME_PERMITIDOS.includes(
        archivo.type
      )
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'Solo se permiten fotografías JPG, PNG o WEBP.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      archivo.size <= 0
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La fotografía está vacía.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      archivo.size >
      TAMANO_MAXIMO
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La fotografía no puede superar 3 MB.',
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // CLIENTE ADMINISTRATIVO DEL CEA
    // =====================================================

    const {
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        {
          nit,
        }
      )

    const supabase =
      supabaseAdmin

    // =====================================================
    // VEHÍCULO
    // =====================================================

    const vehiculo =
      await obtenerVehiculo(
        supabase,
        vehiculoId
      )

    if (!vehiculo) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El vehículo no existe.',
        },
        {
          status:
            404,
        }
      )
    }

    const columna =
      obtenerColumnaFoto(
        tipo
      )

    const path =
      obtenerPathFoto(
        vehiculoId,
        tipo
      )

    const pathAnterior =
      tipo ===
      TIPO_FRONTAL
        ? vehiculo
            .foto_frontal_path
        : vehiculo
            .foto_lateral_path

    // =====================================================
    // CONVERTIR ARCHIVO
    // =====================================================

    const arrayBuffer =
      await archivo
        .arrayBuffer()

    const buffer =
      Buffer.from(
        arrayBuffer
      )

    // =====================================================
    // SUBIR / REEMPLAZAR
    // =====================================================
    //
    // upsert: true reemplaza el objeto con el mismo path.
    //
    // =====================================================

    const {
      error:
        uploadError,
    } =
      await supabase
        .storage
        .from(
          BUCKET_VEHICULOS
        )
        .upload(
          path,
          buffer,
          {
            contentType:
              archivo.type,

            cacheControl:
              '3600',

            upsert:
              true,
          }
        )

    if (
      uploadError
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `No fue posible cargar la fotografía: ${uploadError.message}`,
        },
        {
          status:
            500,
        }
      )
    }

    // =====================================================
    // BORRAR POSIBLE PATH ANTIGUO
    // =====================================================
    //
    // Esto solo será necesario si anteriormente guardamos
    // archivos con otra estructura o con extensión.
    //
    // Si es el mismo path no hacemos nada.
    //
    // =====================================================

    if (
      pathAnterior &&
      pathAnterior !==
      path
    ) {
      const {
        error:
          removeError,
      } =
        await supabase
          .storage
          .from(
            BUCKET_VEHICULOS
          )
          .remove([
            pathAnterior,
          ])

      if (
        removeError
      ) {
        console.warn(
          'No fue posible eliminar la fotografía anterior:',
          removeError
        )
      }
    }

    // =====================================================
    // ACTUALIZAR VEHÍCULO
    // =====================================================

    const {
      data:
        vehiculoActualizado,
      error:
        updateError,
    } =
      await supabase
        .from(
          'vehiculos'
        )
        .update({
          [columna]:
            path,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          vehiculoId
        )
        .select(`
          id,
          placa,
          foto_frontal_path,
          foto_lateral_path
        `)
        .single()

    if (
      updateError
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `La fotografía fue cargada, pero no fue posible actualizar el vehículo: ${updateError.message}`,
        },
        {
          status:
            500,
        }
      )
    }

    // =====================================================
    // NUEVA URL FIRMADA
    // =====================================================

    const url =
      await crearUrlFirmada(
        supabase,
        path
      )

    return NextResponse.json({
      status:
        'success',

      message:
        tipo ===
        TIPO_FRONTAL
          ? 'Fotografía frontal actualizada correctamente.'
          : 'Fotografía lateral actualizada correctamente.',

      tipo,

      path,

      url,

      vehiculo:
        vehiculoActualizado,
    })
  } catch (error) {
    console.error(
      'Error POST /api/vehiculos/fotos:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// =========================================================
// DELETE
// =========================================================
//
// Opcional.
//
// Permite borrar una foto si algún día lo necesitamos.
//
// /api/vehiculos/fotos
//   ?nit=...
//   &vehiculo_id=123
//   &tipo=frontal
//
// =========================================================

export async function DELETE(request) {
  try {
    const {
      searchParams,
    } =
      new URL(
        request.url
      )

    const vehiculoId =
      Number(
        searchParams.get(
          'vehiculo_id'
        )
      )

    const tipo =
      normalizarMinusculas(
        searchParams.get(
          'tipo'
        )
      )

    if (
      !Number.isInteger(
        vehiculoId
      ) ||
      vehiculoId <= 0
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El vehículo no es válido.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      !TIPOS_PERMITIDOS.includes(
        tipo
      )
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El tipo de fotografía no es válido.',
        },
        {
          status:
            400,
        }
      )
    }

    const {
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const supabase =
      supabaseAdmin

    const vehiculo =
      await obtenerVehiculo(
        supabase,
        vehiculoId
      )

    if (!vehiculo) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El vehículo no existe.',
        },
        {
          status:
            404,
        }
      )
    }

    const columna =
      obtenerColumnaFoto(
        tipo
      )

    const path =
      tipo ===
      TIPO_FRONTAL
        ? vehiculo
            .foto_frontal_path
        : vehiculo
            .foto_lateral_path

    if (!path) {
      return NextResponse.json({
        status:
          'success',

        message:
          'El vehículo no tiene esa fotografía registrada.',
      })
    }

    const {
      error:
        removeError,
    } =
      await supabase
        .storage
        .from(
          BUCKET_VEHICULOS
        )
        .remove([
          path,
        ])

    if (
      removeError
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `No fue posible eliminar la fotografía: ${removeError.message}`,
        },
        {
          status:
            500,
        }
      )
    }

    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          'vehiculos'
        )
        .update({
          [columna]:
            null,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          vehiculoId
        )

    if (
      updateError
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `La fotografía fue eliminada, pero no fue posible actualizar el vehículo: ${updateError.message}`,
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

      message:
        'Fotografía eliminada correctamente.',
    })
  } catch (error) {
    console.error(
      'Error DELETE /api/vehiculos/fotos:',
      error
    )

    return respuestaError(
      error
    )
  }
}