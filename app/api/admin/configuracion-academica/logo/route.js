// app/api/admin/configuracion-academica/logo/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'


// =========================================================
// CONSTANTES
// =========================================================

const BUCKET_EMPRESA =
  'empresa'

const CLAVE_CONFIGURACION =
  'GENERAL'

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

function respuestaError(
  error
) {
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


function normalizarTexto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


// =========================================================
// GENERAR PATH DEL LOGO
// =========================================================
//
// Utilizamos un nombre diferente para cada carga.
//
// Esto permite conservar:
//
// 1. Logo actual
// 2. Logo anterior
//
// No utilizamos extensión.
// El tipo real del archivo se conserva mediante contentType.
//
// Ejemplo:
//
// logos/logo-1756855500123
//
// =========================================================

function generarPathLogo() {
  const ahora =
    Date.now()

  const aleatorio =
    Math.random()
      .toString(36)
      .slice(
        2,
        10
      )

  return `logos/logo-${ahora}-${aleatorio}`
}


// =========================================================
// OBTENER CONFIGURACIÓN
// =========================================================

async function obtenerConfiguracion(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_empresa'
      )
      .select(`
        id,
        clave,
        logo_actual_path,
        logo_anterior_path,
        usuario_actualizacion,
        created_at,
        updated_at
      `)
      .eq(
        'clave',
        CLAVE_CONFIGURACION
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      `No fue posible consultar la configuración de la empresa: ${error.message}`
    )
  }

  return data || null
}


// =========================================================
// ASEGURAR CONFIGURACIÓN
// =========================================================
//
// El SQL ya crea el registro GENERAL.
//
// Esta función sirve como defensa adicional si en alguna
// base de datos el registro fue eliminado manualmente.
//
// =========================================================

async function asegurarConfiguracion(
  supabase
) {
  const existente =
    await obtenerConfiguracion(
      supabase
    )

  if (existente) {
    return existente
  }

  const ahora =
    new Date()
      .toISOString()

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_empresa'
      )
      .insert({
        clave:
          CLAVE_CONFIGURACION,

        logo_actual_path:
          null,

        logo_anterior_path:
          null,

        usuario_actualizacion:
          null,

        created_at:
          ahora,

        updated_at:
          ahora,
      })
      .select(`
        id,
        clave,
        logo_actual_path,
        logo_anterior_path,
        usuario_actualizacion,
        created_at,
        updated_at
      `)
      .single()

  if (error) {
    throw new Error(
      `No fue posible crear la configuración de la empresa: ${error.message}`
    )
  }

  return data
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
        BUCKET_EMPRESA
      )
      .createSignedUrl(
        path,
        URL_FIRMADA_SEGUNDOS
      )

  if (error) {
    console.warn(
      `No fue posible crear URL firmada para ${path}:`,
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
// ELIMINAR ARCHIVO
// =========================================================

async function eliminarArchivo(
  supabase,
  path
) {
  if (!path) {
    return
  }

  const {
    error,
  } =
    await supabase
      .storage
      .from(
        BUCKET_EMPRESA
      )
      .remove([
        path,
      ])

  if (error) {
    console.warn(
      `No fue posible eliminar el archivo ${path}:`,
      error
    )
  }
}


// =========================================================
// GET
// =========================================================
//
// Devuelve:
//
// - Logo actual
// - Logo anterior
// - Paths almacenados
//
// GET:
// /api/admin/configuracion-academica/logo?nit=...
//
// =========================================================

export async function GET(
  request
) {
  try {
    const {
      supabaseAdmin,
      empresa,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const supabase =
      supabaseAdmin


    const configuracion =
      await asegurarConfiguracion(
        supabase
      )


    const [
      logoActualUrl,
      logoAnteriorUrl,
    ] =
      await Promise.all([
        crearUrlFirmada(
          supabase,
          configuracion
            .logo_actual_path
        ),

        crearUrlFirmada(
          supabase,
          configuracion
            .logo_anterior_path
        ),
      ])


    return NextResponse.json({
      status:
        'success',

      empresa: {
        nit:
          empresa?.nit ??
          null,

        nombre:
          empresa?.nombre ??
          null,
      },

      logo: {
        actual:
          logoActualUrl,

        anterior:
          logoAnteriorUrl,
      },

      paths: {
        actual:
          configuracion
            .logo_actual_path ||
          null,

        anterior:
          configuracion
            .logo_anterior_path ||
          null,
      },

      configuracion: {
        id:
          configuracion.id,

        clave:
          configuracion.clave,

        usuario_actualizacion:
          configuracion
            .usuario_actualizacion,

        updated_at:
          configuracion
            .updated_at,
      },

      expires_in:
        URL_FIRMADA_SEGUNDOS,
    })
  } catch (
    error
  ) {
    console.error(
      'Error GET /api/admin/configuracion-academica/logo:',
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
// CARGAR NUEVO LOGO
//
// Espera FormData:
//
// nit
// archivo
// usuario
//
// Funcionamiento:
//
// logo anterior existente
//        ↓
// se elimina de Storage
//
// logo actual existente
//        ↓
// pasa a logo_anterior_path
//
// nuevo archivo
//        ↓
// pasa a logo_actual_path
//
// De esta manera conservamos máximo dos logos.
//
// =========================================================

export async function POST(
  request
) {
  try {
    const formData =
      await request
        .formData()


    const nit =
      normalizarTexto(
        formData.get(
          'nit'
        )
      )


    const usuario =
      normalizarTexto(
        formData.get(
          'usuario'
        )
      )


    const archivo =
      formData.get(
        'archivo'
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
          status: 400,
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
            'No se recibió el archivo del logo.',
        },
        {
          status: 400,
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
            'Solo se permiten imágenes JPG, PNG o WEBP.',
        },
        {
          status: 400,
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
            'El archivo del logo está vacío.',
        },
        {
          status: 400,
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
            'El logo no puede superar 3 MB.',
        },
        {
          status: 400,
        }
      )
    }


    // =====================================================
    // CLIENTE ADMINISTRATIVO DEL CEA
    // =====================================================

    const {
      supabaseAdmin,
      empresa,
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
    // CONFIGURACIÓN ACTUAL
    // =====================================================

    const configuracion =
      await asegurarConfiguracion(
        supabase
      )


    const logoActualAnterior =
      configuracion
        .logo_actual_path ||
      null


    const logoAnteriorAnterior =
      configuracion
        .logo_anterior_path ||
      null


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
    // GENERAR NUEVO PATH
    // =====================================================

    const nuevoPath =
      generarPathLogo()


    // =====================================================
    // SUBIR NUEVO LOGO
    // =====================================================

    const {
      error:
        uploadError,
    } =
      await supabase
        .storage
        .from(
          BUCKET_EMPRESA
        )
        .upload(
          nuevoPath,
          buffer,
          {
            contentType:
              archivo.type,

            cacheControl:
              '3600',

            upsert:
              false,
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
            `No fue posible cargar el logo: ${uploadError.message}`,
        },
        {
          status: 500,
        }
      )
    }


    // =====================================================
    // ACTUALIZAR CONFIGURACIÓN
    // =====================================================
    //
    // El logo actual pasa a ser el anterior.
    // El logo recién cargado pasa a ser el actual.
    //
    // IMPORTANTE:
    // Primero actualizamos la base de datos.
    // Después eliminamos el logo anterior más antiguo.
    //
    // =====================================================

    const ahora =
      new Date()
        .toISOString()


    const {
      data:
        configuracionActualizada,
      error:
        updateError,
    } =
      await supabase
        .from(
          'configuracion_empresa'
        )
        .update({
          logo_actual_path:
            nuevoPath,

          logo_anterior_path:
            logoActualAnterior,

          usuario_actualizacion:
            usuario ||
            null,

          updated_at:
            ahora,
        })
        .eq(
          'id',
          configuracion.id
        )
        .select(`
          id,
          clave,
          logo_actual_path,
          logo_anterior_path,
          usuario_actualizacion,
          created_at,
          updated_at
        `)
        .single()


    if (
      updateError
    ) {
      console.error(
        'Error actualizando configuración del logo:',
        updateError
      )

      // El nuevo archivo quedó huérfano.
      // Intentamos retirarlo porque la BD no logró guardarlo.

      await eliminarArchivo(
        supabase,
        nuevoPath
      )

      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `El logo fue cargado, pero no fue posible actualizar la configuración: ${updateError.message}`,
        },
        {
          status: 500,
        }
      )
    }


    // =====================================================
    // ELIMINAR LOGO MÁS ANTIGUO
    // =====================================================
    //
    // Si ya existían:
    //
    // actual = B
    // anterior = A
    //
    // después de cargar C:
    //
    // actual = C
    // anterior = B
    //
    // entonces A ya no debe conservarse.
    //
    // =====================================================

    if (
      logoAnteriorAnterior &&
      logoAnteriorAnterior !==
        logoActualAnterior &&
      logoAnteriorAnterior !==
        nuevoPath
    ) {
      await eliminarArchivo(
        supabase,
        logoAnteriorAnterior
      )
    }


    // =====================================================
    // CREAR URLS FIRMADAS
    // =====================================================

    const [
      logoActualUrl,
      logoAnteriorUrl,
    ] =
      await Promise.all([
        crearUrlFirmada(
          supabase,
          configuracionActualizada
            .logo_actual_path
        ),

        crearUrlFirmada(
          supabase,
          configuracionActualizada
            .logo_anterior_path
        ),
      ])


    return NextResponse.json({
      status:
        'success',

      message:
        'Logo institucional actualizado correctamente.',

      empresa: {
        nit:
          empresa?.nit ??
          null,

        nombre:
          empresa?.nombre ??
          null,
      },

      logo: {
        actual:
          logoActualUrl,

        anterior:
          logoAnteriorUrl,
      },

      paths: {
        actual:
          configuracionActualizada
            .logo_actual_path,

        anterior:
          configuracionActualizada
            .logo_anterior_path ||
          null,
      },

      configuracion:
        configuracionActualizada,

      expires_in:
        URL_FIRMADA_SEGUNDOS,
    })
  } catch (
    error
  ) {
    console.error(
      'Error POST /api/admin/configuracion-academica/logo:',
      error
    )

    return respuestaError(
      error
    )
  }
}


// =========================================================
// PATCH
// =========================================================
//
// RESTAURAR LOGO ANTERIOR
//
// Espera JSON:
//
// {
//   nit,
//   accion: 'RESTAURAR_ANTERIOR',
//   usuario
// }
//
// No duplicamos archivos.
// Simplemente intercambiamos:
//
// actual ↔ anterior
//
// =========================================================

export async function PATCH(
  request
) {
  try {
    const body =
      await request.json()


    const nit =
      normalizarTexto(
        body?.nit
      )


    const accion =
      normalizarTexto(
        body?.accion
      )
        .toUpperCase()


    const usuario =
      normalizarTexto(
        body?.usuario
      )


    if (!nit) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'No se recibió el NIT del CEA.',
        },
        {
          status: 400,
        }
      )
    }


    if (
      accion !==
      'RESTAURAR_ANTERIOR'
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La acción solicitada no es válida.',
        },
        {
          status: 400,
        }
      )
    }


    const {
      supabaseAdmin,
      empresa,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )


    const supabase =
      supabaseAdmin


    const configuracion =
      await asegurarConfiguracion(
        supabase
      )


    if (
      !configuracion
        .logo_anterior_path
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'No existe un logo anterior para restaurar.',
        },
        {
          status: 400,
        }
      )
    }


    const ahora =
      new Date()
        .toISOString()


    const logoActual =
      configuracion
        .logo_actual_path ||
      null


    const logoAnterior =
      configuracion
        .logo_anterior_path


    // =====================================================
    // INTERCAMBIAR LOGOS
    // =====================================================

    const {
      data:
        configuracionActualizada,
      error:
        updateError,
    } =
      await supabase
        .from(
          'configuracion_empresa'
        )
        .update({
          logo_actual_path:
            logoAnterior,

          logo_anterior_path:
            logoActual,

          usuario_actualizacion:
            usuario ||
            null,

          updated_at:
            ahora,
        })
        .eq(
          'id',
          configuracion.id
        )
        .select(`
          id,
          clave,
          logo_actual_path,
          logo_anterior_path,
          usuario_actualizacion,
          created_at,
          updated_at
        `)
        .single()


    if (
      updateError
    ) {
      console.error(
        'Error restaurando logo anterior:',
        updateError
      )

      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `No fue posible restaurar el logo anterior: ${updateError.message}`,
        },
        {
          status: 500,
        }
      )
    }


    const [
      logoActualUrl,
      logoAnteriorUrl,
    ] =
      await Promise.all([
        crearUrlFirmada(
          supabase,
          configuracionActualizada
            .logo_actual_path
        ),

        crearUrlFirmada(
          supabase,
          configuracionActualizada
            .logo_anterior_path
        ),
      ])


    return NextResponse.json({
      status:
        'success',

      message:
        'Logo anterior restaurado correctamente.',

      empresa: {
        nit:
          empresa?.nit ??
          null,

        nombre:
          empresa?.nombre ??
          null,
      },

      logo: {
        actual:
          logoActualUrl,

        anterior:
          logoAnteriorUrl,
      },

      paths: {
        actual:
          configuracionActualizada
            .logo_actual_path ||
          null,

        anterior:
          configuracionActualizada
            .logo_anterior_path ||
          null,
      },

      configuracion:
        configuracionActualizada,

      expires_in:
        URL_FIRMADA_SEGUNDOS,
    })
  } catch (
    error
  ) {
    console.error(
      'Error PATCH /api/admin/configuracion-academica/logo:',
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
// ELIMINAR LOGO ACTUAL
//
// DELETE:
// /api/admin/configuracion-academica/logo?nit=...
//
// Si existe logo anterior:
//
// anterior → actual
//
// Si no existe:
//
// actual → null
//
// =========================================================

export async function DELETE(
  request
) {
  try {
    const {
      searchParams,
    } =
      new URL(
        request.url
      )


    const nit =
      normalizarTexto(
        searchParams.get(
          'nit'
        )
      )


    const usuario =
      normalizarTexto(
        searchParams.get(
          'usuario'
        )
      )


    if (!nit) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'No se recibió el NIT del CEA.',
        },
        {
          status: 400,
        }
      )
    }


    const {
      supabaseAdmin,
      empresa,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )


    const supabase =
      supabaseAdmin


    const configuracion =
      await asegurarConfiguracion(
        supabase
      )


    const logoActual =
      configuracion
        .logo_actual_path ||
      null


    const logoAnterior =
      configuracion
        .logo_anterior_path ||
      null


    if (!logoActual) {
      return NextResponse.json({
        status:
          'success',

        message:
          'No existe un logo institucional registrado.',

        empresa: {
          nit:
            empresa?.nit ??
            null,

          nombre:
            empresa?.nombre ??
            null,
        },

        logo: {
          actual:
            null,

          anterior:
            null,
        },

        paths: {
          actual:
            null,

          anterior:
            null,
        },
      })
    }


    const ahora =
      new Date()
        .toISOString()


    // =====================================================
    // PROMOVER ANTERIOR
    // =====================================================
    //
    // Si existe anterior:
    //
    // actual = anterior
    // anterior = null
    //
    // Si no existe:
    //
    // actual = null
    //
    // =====================================================

    const {
      data:
        configuracionActualizada,
      error:
        updateError,
    } =
      await supabase
        .from(
          'configuracion_empresa'
        )
        .update({
          logo_actual_path:
            logoAnterior,

          logo_anterior_path:
            null,

          usuario_actualizacion:
            usuario ||
            null,

          updated_at:
            ahora,
        })
        .eq(
          'id',
          configuracion.id
        )
        .select(`
          id,
          clave,
          logo_actual_path,
          logo_anterior_path,
          usuario_actualizacion,
          created_at,
          updated_at
        `)
        .single()


    if (
      updateError
    ) {
      console.error(
        'Error actualizando configuración después de eliminar logo:',
        updateError
      )

      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `No fue posible actualizar la configuración del logo: ${updateError.message}`,
        },
        {
          status: 500,
        }
      )
    }


    // =====================================================
    // ELIMINAR EL LOGO QUE ERA ACTUAL
    // =====================================================

    if (
      logoActual !==
      logoAnterior
    ) {
      await eliminarArchivo(
        supabase,
        logoActual
      )
    }


    const logoActualUrl =
      await crearUrlFirmada(
        supabase,
        configuracionActualizada
          .logo_actual_path
      )


    return NextResponse.json({
      status:
        'success',

      message:
        logoAnterior
          ? 'Logo actual eliminado. El logo anterior quedó restaurado como actual.'
          : 'Logo institucional eliminado correctamente.',

      empresa: {
        nit:
          empresa?.nit ??
          null,

        nombre:
          empresa?.nombre ??
          null,
      },

      logo: {
        actual:
          logoActualUrl,

        anterior:
          null,
      },

      paths: {
        actual:
          configuracionActualizada
            .logo_actual_path ||
          null,

        anterior:
          null,
      },

      configuracion:
        configuracionActualizada,

      expires_in:
        URL_FIRMADA_SEGUNDOS,
    })
  } catch (
    error
  ) {
    console.error(
      'Error DELETE /api/admin/configuracion-academica/logo:',
      error
    )

    return respuestaError(
      error
    )
  }
}