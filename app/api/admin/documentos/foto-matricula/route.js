// app/api/admin/documentos/foto-matricula/route.js

import {
  NextResponse,
} from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
} from '@/lib/supabaseEmpresaServer'


// ============================================================
// CONSTANTES
// ============================================================

const BUCKET_EMPRESA =
  'empresa'

const CARPETA_MATRICULAS =
  'matriculas'

const DURACION_URL_FOTO =
  60 * 60

const MAX_FOTO_BYTES =
  2 * 1024 * 1024

const TIPOS_PERMITIDOS =
  new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ])

// ============================================================
// HELPERS
// ============================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function numeroEntero(
  valor
) {
  const numero =
    Number(
      valor
    )

  if (
    !Number.isInteger(
      numero
    ) ||
    numero <=
      0
  ) {
    return null
  }

  return numero
}


function rutaFotoMatricula(
  matriculaId
) {
  return `${CARPETA_MATRICULAS}/foto-aprendiz-${matriculaId}.jpg`
}


// ============================================================
// VALIDAR MATRÍCULA
// ============================================================

async function validarMatricula(
  supabase,
  matriculaId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'aprendices'
      )
      .select(
        'id, consecutivo, documento, nombres, apellidos'
      )
      .eq(
        'id',
        matriculaId
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  if (
    !data
  ) {
    const errorMatricula =
      new Error(
        'La matrícula indicada no existe en este CEA.'
      )

    errorMatricula.status =
      404

    throw errorMatricula
  }

  return data
}


// ============================================================
// LISTAR FOTOS ALMACENADAS
// ============================================================
//
// Busca:
//
// 1. Nueva estructura:
//    matriculas/foto-aprendiz-23.jpg
//
// 2. Estructura anterior:
//    matriculas/23/foto-aprendiz.jpg
//
// Esto permite limpiar también archivos que hayan quedado
// almacenados con la estructura anterior.
//
// ============================================================

async function listarFotosAlmacenadas(
  supabase
) {
  const rutas =
    []

  const {
    data: elementosRaiz,
    error: errorRaiz,
  } =
    await supabase.storage
      .from(
        BUCKET_EMPRESA
      )
      .list(
        CARPETA_MATRICULAS,
        {
          limit:
            1000,
        }
      )

  if (
    errorRaiz
  ) {
    throw errorRaiz
  }

  const elementos =
    Array.isArray(
      elementosRaiz
    )
      ? elementosRaiz
      : []

  for (
    const elemento
    of elementos
  ) {
    const nombre =
      texto(
        elemento?.name
      )

    if (
      !nombre
    ) {
      continue
    }

    // ========================================================
    // NUEVA ESTRUCTURA
    // ========================================================

    if (
      /^foto-aprendiz-\d+\.jpg$/i.test(
        nombre
      )
    ) {
      rutas.push(
        `${CARPETA_MATRICULAS}/${nombre}`
      )

      continue
    }

    // ========================================================
    // POSIBLE CARPETA DE LA ESTRUCTURA ANTERIOR
    // ========================================================

    if (
      !/^\d+$/.test(
        nombre
      )
    ) {
      continue
    }

    const carpetaAnterior =
      `${CARPETA_MATRICULAS}/${nombre}`

    const {
      data: archivosCarpeta,
      error: errorCarpeta,
    } =
      await supabase.storage
        .from(
          BUCKET_EMPRESA
        )
        .list(
          carpetaAnterior,
          {
            limit:
              100,
          }
        )

    if (
      errorCarpeta
    ) {
      console.error(
        `No fue posible revisar ${carpetaAnterior}:`,
        errorCarpeta
      )

      continue
    }

    const archivos =
      Array.isArray(
        archivosCarpeta
      )
        ? archivosCarpeta
        : []

    const fotoAnterior =
      archivos.find(
        archivo =>
          texto(
            archivo?.name
          ) ===
          'foto-aprendiz.jpg'
      )

    if (
      fotoAnterior
    ) {
      rutas.push(
        `${carpetaAnterior}/foto-aprendiz.jpg`
      )
    }
  }

  return [
    ...new Set(
      rutas
    ),
  ]
}


// ============================================================
// ELIMINAR FOTOS ANTERIORES
// ============================================================
//
// La fotografía que acaba de guardarse se conserva.
// Todas las demás fotografías oficiales se eliminan.
//
// ============================================================

async function eliminarFotosAnteriores(
  supabase,
  pathConservar
) {
  const rutas =
    await listarFotosAlmacenadas(
      supabase
    )

  const rutasEliminar =
    rutas.filter(
      ruta =>
        ruta !==
        pathConservar
    )

  if (
    rutasEliminar.length ===
    0
  ) {
    return
  }

  const {
    error,
  } =
    await supabase.storage
      .from(
        BUCKET_EMPRESA
      )
      .remove(
        rutasEliminar
      )

  if (
    error
  ) {
    throw new Error(
      `La fotografía nueva fue guardada, pero no fue posible eliminar las fotografías anteriores: ${error.message}`
    )
  }
}


// ============================================================
// OBTENER FOTO EXACTA DE UNA MATRÍCULA
// ============================================================

async function obtenerFotoExistente(
  supabase,
  matriculaId
) {
  const nombreArchivo =
    `foto-aprendiz-${matriculaId}.jpg`

  const path =
    rutaFotoMatricula(
      matriculaId
    )

  const {
    data: archivos,
    error: errorLista,
  } =
    await supabase.storage
      .from(
        BUCKET_EMPRESA
      )
      .list(
        CARPETA_MATRICULAS,
        {
          limit:
            1000,

          search:
            nombreArchivo,
        }
      )

  if (
    errorLista
  ) {
    throw errorLista
  }

  const existe =
    Array.isArray(
      archivos
    ) &&
    archivos.some(
      archivo =>
        texto(
          archivo?.name
        ) ===
        nombreArchivo
    )

  if (
    !existe
  ) {
    return null
  }

  const {
    data: firma,
    error: errorFirma,
  } =
    await supabase.storage
      .from(
        BUCKET_EMPRESA
      )
      .createSignedUrl(
        path,
        DURACION_URL_FOTO
      )

  if (
    errorFirma
  ) {
    throw errorFirma
  }

  return {
    path,

    url:
      firma?.signedUrl ||
      '',
  }
}


// ============================================================
// GET
// ============================================================

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

    const url =
      new URL(
        request.url
      )

    const matriculaId =
      numeroEntero(
        url.searchParams.get(
          'matricula_id'
        )
      )

    if (
      !matriculaId
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'No se recibió una matrícula válida.',
        },
        {
          status:
            400,
        }
      )
    }

    const matricula =
      await validarMatricula(
        supabase,
        matriculaId
      )

    /*
     * IMPORTANTE:
     *
     * Solamente se busca la fotografía cuyo nombre
     * corresponde exactamente a esta matrícula.
     *
     * Nunca se devuelve la fotografía de otra matrícula.
     */

    const foto =
      await obtenerFotoExistente(
        supabase,
        matriculaId
      )

    return NextResponse.json(
      {
        ok:
          true,

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            empresa?.nombre ||
            '',
        },

        matricula: {
          id:
            matricula.id,

          consecutivo:
            matricula.consecutivo,

          documento:
            matricula.documento,
        },

        foto,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'GET /api/admin/documentos/foto-matricula:',
      error
    )

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error?.message ||
          'No fue posible consultar la fotografía de la matrícula.',
      },
      {
        status:
          Number(
            error?.status
          ) ||
          500,
      }
    )
  }
}


// ============================================================
// POST
// ============================================================

export async function POST(
  request
) {
  try {
    const formData =
      await request.formData()

    const matriculaId =
      numeroEntero(
        formData.get(
          'matricula_id'
        )
      )

    const foto =
      formData.get(
        'foto'
      )

    if (
      !matriculaId
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'No se recibió una matrícula válida.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      !foto ||
      typeof foto.arrayBuffer !==
        'function'
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'No se recibió la fotografía del aprendiz.',
        },
        {
          status:
            400,
        }
      )
    }

    const tipoFoto =
      texto(
        foto.type
      ).toLowerCase()

    if (
      !TIPOS_PERMITIDOS.has(
        tipoFoto
      )
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'La fotografía debe estar en formato JPG, PNG o WEBP.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      Number(
        foto.size
      ) >
      MAX_FOTO_BYTES
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'La fotografía supera el tamaño máximo permitido de 2 MB.',
        },
        {
          status:
            400,
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

    const matricula =
      await validarMatricula(
        supabase,
        matriculaId
      )

    const buffer =
      Buffer.from(
        await foto.arrayBuffer()
      )

    const path =
      rutaFotoMatricula(
        matriculaId
      )

    // ========================================================
    // GUARDAR / REEMPLAZAR FOTO ACTUAL
    // ========================================================

    const {
      error: errorUpload,
    } =
      await supabase.storage
        .from(
          BUCKET_EMPRESA
        )
        .upload(
          path,
          buffer,
          {
            contentType:
              tipoFoto,

            cacheControl:
              '0',

            upsert:
              true,
          }
        )

    if (
      errorUpload
    ) {
      throw errorUpload
    }

    // ========================================================
    // ELIMINAR TODAS LAS DEMÁS FOTOGRAFÍAS
    // ========================================================

    await eliminarFotosAnteriores(
      supabase,
      path
    )

    // ========================================================
    // URL FIRMADA DE LA FOTO QUE QUEDÓ VIGENTE
    // ========================================================

    const {
      data: firma,
      error: errorFirma,
    } =
      await supabase.storage
        .from(
          BUCKET_EMPRESA
        )
        .createSignedUrl(
          path,
          DURACION_URL_FOTO
        )

    if (
      errorFirma
    ) {
      throw errorFirma
    }

    return NextResponse.json(
      {
        ok:
          true,

        message:
          'Fotografía guardada correctamente. Las fotografías anteriores fueron eliminadas.',

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            empresa?.nombre ||
            '',
        },

        matricula: {
          id:
            matricula.id,

          consecutivo:
            matricula.consecutivo,

          documento:
            matricula.documento,
        },

        foto: {
          path,

          url:
            firma?.signedUrl ||
            '',
        },
      }
    )
  } catch (
    error
  ) {
    console.error(
      'POST /api/admin/documentos/foto-matricula:',
      error
    )

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error?.message ||
          'No fue posible guardar la fotografía del aprendiz.',
      },
      {
        status:
          Number(
            error?.status
          ) ||
          500,
      }
    )
  }
}