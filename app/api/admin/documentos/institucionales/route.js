// app/api/admin/documentos/institucionales/route.js

import {
  NextResponse,
} from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'


// ============================================================
// CONSTANTES
// ============================================================

const BUCKET_DOCUMENTOS =
  'documentos'

const LIMITE_ARCHIVO =
  10 * 1024 * 1024

const DURACION_URL_FIRMADA =
  60 * 60


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

  return Number.isFinite(
    numero
  )
    ? Math.trunc(
        numero
      )
    : 0
}


function respuestaOk(
  body = {},
  status = 200
) {
  return NextResponse.json(
    {
      ok: true,
      ...body,
    },
    {
      status,
    }
  )
}


function respuestaError(
  mensaje,
  status = 400
) {
  return NextResponse.json(
    {
      ok: false,
      error:
        mensaje,
    },
    {
      status,
    }
  )
}


function generarCodigoDocumento() {
  return `DOC_${Date.now()}`
}


function construirPathDocumento(
  id
) {
  return `institucionales/${id}/actual.pdf`
}


// ============================================================
// CONSULTAR DOCUMENTO
// ============================================================

async function obtenerDocumentoPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'documentos_institucionales'
      )
      .select(
        `
          id,
          codigo,
          nombre,
          archivo_path,
          nombre_archivo,
          activo,
          orden,
          usuario_actualizacion,
          created_at,
          updated_at
        `
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  return data ||
    null
}


// ============================================================
// URL FIRMADA
// ============================================================

async function crearUrlFirmada(
  supabase,
  archivoPath
) {
  const path =
    texto(
      archivoPath
    )

  if (
    !path
  ) {
    return ''
  }

  const {
    data,
    error,
  } =
    await supabase
      .storage
      .from(
        BUCKET_DOCUMENTOS
      )
      .createSignedUrl(
        path,
        DURACION_URL_FIRMADA
      )

  if (
    error
  ) {
    console.error(
      'Error generando URL firmada del PDF:',
      error
    )

    return ''
  }

  return data?.signedUrl ||
    ''
}


// ============================================================
// CONSTRUIR RESPUESTA DOCUMENTO
// ============================================================

async function construirDocumentoRespuesta(
  supabase,
  documento
) {
  const archivoPath =
    texto(
      documento
        ?.archivo_path
    )

  const url =
    archivoPath
      ? await crearUrlFirmada(
          supabase,
          archivoPath
        )
      : ''

  return {
    id:
      documento?.id ||
      null,

    codigo:
      texto(
        documento
          ?.codigo
      ),

    nombre:
      texto(
        documento
          ?.nombre
      ),

    archivo_path:
      archivoPath,

    nombre_archivo:
      texto(
        documento
          ?.nombre_archivo
      ),

    activo:
      documento
        ?.activo ===
      true,

    orden:
      numeroEntero(
        documento
          ?.orden
      ),

    tiene_archivo:
      Boolean(
        archivoPath
      ),

    estado:
      archivoPath
        ? 'DISPONIBLE'
        : 'SIN ARCHIVO',

    url,

    created_at:
      documento
        ?.created_at ||
      null,

    updated_at:
      documento
        ?.updated_at ||
      null,
  }
}


// ============================================================
// GET
// LISTAR DOCUMENTOS INSTITUCIONALES
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

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'documentos_institucionales'
        )
        .select(
          `
            id,
            codigo,
            nombre,
            archivo_path,
            nombre_archivo,
            activo,
            orden,
            usuario_actualizacion,
            created_at,
            updated_at
          `
        )
        .eq(
          'activo',
          true
        )
        .order(
          'orden',
          {
            ascending:
              true,
          }
        )
        .order(
          'id',
          {
            ascending:
              true,
          }
        )

    if (
      error
    ) {
      throw error
    }

    const documentos =
      await Promise.all(
        (
          Array.isArray(
            data
          )
            ? data
            : []
        ).map(
          documento =>
            construirDocumentoRespuesta(
              supabase,
              documento
            )
        )
      )

    return respuestaOk({
      empresa: {
        nit:
          texto(
            empresa?.nit
          ),

        nombre:
          texto(
            empresa?.nombre ||
            empresa?.nombre_empresa ||
            empresa?.razon_social
          ),
      },

      documentos,
    })
  } catch (
    error
  ) {
    console.error(
      'Error GET documentos institucionales:',
      error
    )

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
}


// ============================================================
// POST
//
// JSON:
//   { accion: 'CREAR', nombre, usuario_actualizacion }
//
// FORM DATA:
//   accion = CARGAR_PDF
//   documento_id
//   archivo
//   usuario_actualizacion
// ============================================================

export async function POST(
  request
) {
  try {
    const contentType =
      texto(
        request.headers.get(
          'content-type'
        )
      ).toLowerCase()

    // ========================================================
    // CARGAR / REEMPLAZAR PDF
    // ========================================================

    if (
      contentType.includes(
        'multipart/form-data'
      )
    ) {
      const formData =
        await request.formData()

      const accion =
        texto(
          formData.get(
            'accion'
          )
        ).toUpperCase()

      if (
        accion !==
        'CARGAR_PDF'
      ) {
        return respuestaError(
          'La acción solicitada no es válida.'
        )
      }

      const documentoId =
        numeroEntero(
          formData.get(
            'documento_id'
          )
        )

      const archivo =
        formData.get(
          'archivo'
        )

      const usuario =
        texto(
          formData.get(
            'usuario_actualizacion'
          )
        ) ||
        null

      if (
        documentoId <=
        0
      ) {
        return respuestaError(
          'Debe indicar el documento institucional.'
        )
      }

      if (
        !archivo ||
        typeof archivo
          .arrayBuffer !==
          'function'
      ) {
        return respuestaError(
          'Debe seleccionar un archivo PDF.'
        )
      }

      if (
        archivo.type !==
        'application/pdf'
      ) {
        return respuestaError(
          'El archivo debe ser un documento PDF.'
        )
      }

      if (
        archivo.size <=
        0
      ) {
        return respuestaError(
          'El archivo PDF está vacío.'
        )
      }

      if (
        archivo.size >
        LIMITE_ARCHIVO
      ) {
        return respuestaError(
          'El archivo PDF no puede superar 10 MB.'
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

      const documento =
        await obtenerDocumentoPorId(
          supabase,
          documentoId
        )

      if (
        !documento
      ) {
        return respuestaError(
          'El documento institucional no existe.',
          404
        )
      }

      if (
        documento.activo !==
        true
      ) {
        return respuestaError(
          'El documento institucional se encuentra inactivo.',
          409
        )
      }

      const path =
        construirPathDocumento(
          documentoId
        )

      const bytes =
        new Uint8Array(
          await archivo.arrayBuffer()
        )

      const {
        error:
          errorCarga,
      } =
        await supabase
          .storage
          .from(
            BUCKET_DOCUMENTOS
          )
          .upload(
            path,
            bytes,
            {
              contentType:
                'application/pdf',

              upsert:
                true,

              cacheControl:
                '0',
            }
          )

      if (
        errorCarga
      ) {
        console.error(
          'Error cargando PDF institucional:',
          errorCarga
        )

        return respuestaError(
          `No fue posible cargar el PDF: ${errorCarga.message}`,
          500
        )
      }

      const ahora =
        new Date()
          .toISOString()

      const {
        data:
          documentoActualizado,

        error:
          errorActualizacion,
      } =
        await supabase
          .from(
            'documentos_institucionales'
          )
          .update({
            archivo_path:
              path,

            nombre_archivo:
              texto(
                archivo.name
              ) ||
              'documento.pdf',

            usuario_actualizacion:
              usuario,

            updated_at:
              ahora,
          })
          .eq(
            'id',
            documentoId
          )
          .select(
            `
              id,
              codigo,
              nombre,
              archivo_path,
              nombre_archivo,
              activo,
              orden,
              usuario_actualizacion,
              created_at,
              updated_at
            `
          )
          .single()

      if (
        errorActualizacion
      ) {
        console.error(
          'El PDF se cargó, pero no fue posible actualizar la tabla:',
          errorActualizacion
        )

        return respuestaError(
          'El PDF fue cargado, pero no fue posible actualizar la información del documento.',
          500
        )
      }

      const respuestaDocumento =
        await construirDocumentoRespuesta(
          supabase,
          documentoActualizado
        )

      return respuestaOk(
        {
          documento:
            respuestaDocumento,
        }
      )
    }


    // ========================================================
    // CREAR NUEVO DOCUMENTO
    // ========================================================

    const body =
      await request.json()

    const accion =
      texto(
        body?.accion
      ).toUpperCase()

    if (
      accion !==
      'CREAR'
    ) {
      return respuestaError(
        'La acción solicitada no es válida.'
      )
    }

    const nombre =
      texto(
        body?.nombre
      )

    const usuario =
      texto(
        body
          ?.usuario_actualizacion ||
        body
          ?.usuario
      ) ||
      null

    if (
      !nombre
    ) {
      return respuestaError(
        'El nombre del documento es obligatorio.'
      )
    }

    if (
      nombre.length >
      200
    ) {
      return respuestaError(
        'El nombre del documento no puede superar 200 caracteres.'
      )
    }

    const {
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const supabase =
      supabaseAdmin

    // ========================================================
    // EVITAR NOMBRES DUPLICADOS
    // ========================================================

    const {
      data:
        documentosExistentes,

      error:
        errorExistentes,
    } =
      await supabase
        .from(
          'documentos_institucionales'
        )
        .select(
          'id, nombre'
        )
        .eq(
          'activo',
          true
        )

    if (
      errorExistentes
    ) {
      throw errorExistentes
    }

    const nombreNormalizado =
      nombre.toUpperCase()

    const duplicado =
      (
        Array.isArray(
          documentosExistentes
        )
          ? documentosExistentes
          : []
      ).some(
        item =>
          texto(
            item?.nombre
          ).toUpperCase() ===
          nombreNormalizado
      )

    if (
      duplicado
    ) {
      return respuestaError(
        'Ya existe un documento institucional con ese nombre.',
        409
      )
    }

    // ========================================================
    // SIGUIENTE ORDEN
    // ========================================================

    const {
      data:
        ultimoDocumento,

      error:
        errorOrden,
    } =
      await supabase
        .from(
          'documentos_institucionales'
        )
        .select(
          'orden'
        )
        .order(
          'orden',
          {
            ascending:
              false,
          }
        )
        .limit(
          1
        )
        .maybeSingle()

    if (
      errorOrden
    ) {
      throw errorOrden
    }

    const siguienteOrden =
      Math.max(
        0,
        numeroEntero(
          ultimoDocumento
            ?.orden
        )
      ) +
      1

    const ahora =
      new Date()
        .toISOString()

    const {
      data:
        nuevoDocumento,

      error:
        errorInsert,
    } =
      await supabase
        .from(
          'documentos_institucionales'
        )
        .insert({
          codigo:
            generarCodigoDocumento(),

          nombre:
            nombre.toUpperCase(),

          archivo_path:
            null,

          nombre_archivo:
            null,

          activo:
            true,

          orden:
            siguienteOrden,

          usuario_actualizacion:
            usuario,

          created_at:
            ahora,

          updated_at:
            ahora,
        })
        .select(
          `
            id,
            codigo,
            nombre,
            archivo_path,
            nombre_archivo,
            activo,
            orden,
            usuario_actualizacion,
            created_at,
            updated_at
          `
        )
        .single()

    if (
      errorInsert
    ) {
      throw errorInsert
    }

    return respuestaOk(
      {
        documento:
          await construirDocumentoRespuesta(
            supabase,
            nuevoDocumento
          ),
      },
      201
    )
  } catch (
    error
  ) {
    console.error(
      'Error POST documentos institucionales:',
      error
    )

    if (
      error?.status ||
      error?.code
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

    return respuestaError(
      error?.message ||
      'No fue posible procesar el documento institucional.',
      500
    )
  }
}


// ============================================================
// DELETE
//
// JSON:
//   {
//     documento_id,
//     usuario_actualizacion
//   }
//
// Elimina el PDF y deja inactivo el registro.
// ============================================================

export async function DELETE(
  request
) {
  try {
    const body =
      await request.json()

    const documentoId =
      numeroEntero(
        body
          ?.documento_id
      )

    if (
      documentoId <=
      0
    ) {
      return respuestaError(
        'Debe indicar el documento institucional.'
      )
    }

    const {
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const supabase =
      supabaseAdmin

    const documento =
      await obtenerDocumentoPorId(
        supabase,
        documentoId
      )

    if (
      !documento
    ) {
      return respuestaError(
        'El documento institucional no existe.',
        404
      )
    }

    const archivoPath =
      texto(
        documento
          ?.archivo_path
      )

    if (
      archivoPath
    ) {
      const {
        error:
          errorStorage,
      } =
        await supabase
          .storage
          .from(
            BUCKET_DOCUMENTOS
          )
          .remove([
            archivoPath,
          ])

      if (
        errorStorage
      ) {
        console.error(
          'Error eliminando PDF institucional:',
          errorStorage
        )

        return respuestaError(
          `No fue posible eliminar el archivo PDF: ${errorStorage.message}`,
          500
        )
      }
    }

    const ahora =
      new Date()
        .toISOString()

    const usuario =
      texto(
        body
          ?.usuario_actualizacion ||
        body
          ?.usuario
      ) ||
      null

    const {
      error:
        errorUpdate,
    } =
      await supabase
        .from(
          'documentos_institucionales'
        )
        .update({
          activo:
            false,

          archivo_path:
            null,

          nombre_archivo:
            null,

          usuario_actualizacion:
            usuario,

          updated_at:
            ahora,
        })
        .eq(
          'id',
          documentoId
        )

    if (
      errorUpdate
    ) {
      throw errorUpdate
    }

    return respuestaOk({
      mensaje:
        'Documento institucional eliminado correctamente.',
    })
  } catch (
    error
  ) {
    console.error(
      'Error DELETE documentos institucionales:',
      error
    )

    if (
      error?.status ||
      error?.code
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

    return respuestaError(
      error?.message ||
      'No fue posible eliminar el documento institucional.',
      500
    )
  }
}