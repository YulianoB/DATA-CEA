// app/api/admin/configuracion-codigo-conducta/route.js

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

const TIPO_DOCUMENTO =
  'CODIGO_CONDUCTA'


// ============================================================
// SELECTS
// ============================================================

const SELECT_DOCUMENTO = `
  id,
  tipo_documento,
  nombre_documento,
  codigo,
  fecha_edicion,
  version,
  vigencia,
  activo,
  observaciones,
  usuario_actualizacion,
  created_at,
  updated_at
`

const SELECT_SECCION = `
  id,
  titulo,
  contenido,
  orden,
  activo,
  usuario_actualizacion,
  created_at,
  updated_at
`

const SELECT_VERSION = `
  id,
  documento_id,
  tipo_documento,
  nombre_documento,
  codigo,
  fecha_edicion,
  version,
  vigencia,
  activo,
  observaciones,
  contenido,
  usuario_creacion,
  created_at
`


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


function normalizarBooleano(
  valor,
  predeterminado = true
) {
  if (
    typeof valor ===
    'boolean'
  ) {
    return valor
  }

  if (
    valor ===
    'true' ||
    valor ===
    1 ||
    valor ===
    '1'
  ) {
    return true
  }

  if (
    valor ===
    'false' ||
    valor ===
    0 ||
    valor ===
    '0'
  ) {
    return false
  }

  return predeterminado
}


function usuarioActualizacion(
  body
) {
  return texto(
    body
      ?.usuario_actualizacion ||
    body?.usuario ||
    body?.usuarioActual ||
    ''
  ) || null
}


function fechaValida(
  valor
) {
  const fecha =
    texto(
      valor
    )

  if (
    !fecha
  ) {
    return null
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      fecha
    )
  ) {
    return null
  }

  const [
    anio,
    mes,
    dia,
  ] =
    fecha
      .split(
        '-'
      )
      .map(
        Number
      )

  const prueba =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia
      )
    )

  if (
    prueba.getUTCFullYear() !==
      anio ||
    prueba.getUTCMonth() !==
      mes - 1 ||
    prueba.getUTCDate() !==
      dia
  ) {
    return null
  }

  return fecha
}


// ============================================================
// RESPUESTAS
// ============================================================

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


// ============================================================
// CONSULTAR CONFIGURACIÓN DOCUMENTAL
// ============================================================

async function obtenerDocumento(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_documentos'
      )
      .select(
        SELECT_DOCUMENTO
      )
      .eq(
        'tipo_documento',
        TIPO_DOCUMENTO
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
// CONSULTAR SECCIONES
// ============================================================

async function obtenerSecciones(
  supabase,
  soloActivas = false
) {
  let consulta =
    supabase
      .from(
        'configuracion_codigo_conducta_secciones'
      )
      .select(
        SELECT_SECCION
      )

  if (
    soloActivas
  ) {
    consulta =
      consulta.eq(
        'activo',
        true
      )
  }

  const {
    data,
    error,
  } =
    await consulta
      .order(
        'orden',
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

  return Array.isArray(
    data
  )
    ? data
    : []
}


// ============================================================
// CONSULTAR VERSIONES HISTÓRICAS
// ============================================================

async function obtenerVersiones(
  supabase,
  documentoId
) {
  let consulta =
    supabase
      .from(
        'configuracion_documentos_versiones'
      )
      .select(
        SELECT_VERSION
      )
      .eq(
        'tipo_documento',
        TIPO_DOCUMENTO
      )

  if (
    documentoId
  ) {
    consulta =
      consulta.eq(
        'documento_id',
        documentoId
      )
  }

  const {
    data,
    error,
  } =
    await consulta
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )

  if (
    error
  ) {
    throw error
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


// ============================================================
// CONSTRUIR CONTENIDO HISTÓRICO
// ============================================================

function construirContenidoHistorico(
  secciones
) {
  return {
    secciones:
      (
        Array.isArray(
          secciones
        )
          ? secciones
          : []
      ).map(
        seccion => ({
          id:
            seccion?.id ??
            null,

          titulo:
            seccion?.titulo ??
            null,

          contenido:
            seccion?.contenido ??
            null,

          orden:
            seccion?.orden ??
            null,

          activo:
            seccion?.activo !==
            false,

          usuario_actualizacion:
            seccion?.usuario_actualizacion ??
            null,

          created_at:
            seccion?.created_at ??
            null,

          updated_at:
            seccion?.updated_at ??
            null,
        })
      ),
  }
}


// ============================================================
// ARCHIVAR VERSIÓN ACTUAL
// ============================================================

async function archivarVersionActual(
  supabase,
  documento,
  secciones,
  usuario
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_documentos_versiones'
      )
      .insert(
        {
          documento_id:
            documento.id,

          tipo_documento:
            TIPO_DOCUMENTO,

          nombre_documento:
            documento.nombre_documento,

          codigo:
            documento.codigo ??
            null,

          fecha_edicion:
            documento.fecha_edicion ??
            null,

          version:
            documento.version ??
            null,

          vigencia:
            documento.vigencia ??
            null,

          activo:
            documento.activo !==
            false,

          observaciones:
            documento.observaciones ??
            null,

          contenido:
            construirContenidoHistorico(
              secciones
            ),

          usuario_creacion:
            usuario,
        }
      )
      .select(
        SELECT_VERSION
      )
      .single()

  if (
    error
  ) {
    throw error
  }

  return data
}


// ============================================================
// PREPARAR DATOS DEL DOCUMENTO
// ============================================================

function construirPayloadDocumento(
  body,
  documentoActual
) {
  const nombreDocumento =
    texto(
      body?.nombre_documento
    ) ||
    texto(
      documentoActual?.nombre_documento
    )

  if (
    !nombreDocumento
  ) {
    throw new Error(
      'El nombre del documento es obligatorio.'
    )
  }

  let fechaEdicion =
    documentoActual?.fecha_edicion ??
    null

  if (
    Object.prototype.hasOwnProperty.call(
      body || {},
      'fecha_edicion'
    )
  ) {
    if (
      texto(
        body?.fecha_edicion
      )
    ) {
      fechaEdicion =
        fechaValida(
          body?.fecha_edicion
        )

      if (
        !fechaEdicion
      ) {
        throw new Error(
          'La fecha de elaboración no tiene un formato válido.'
        )
      }
    } else {
      fechaEdicion =
        null
    }
  }

  return {
    nombre_documento:
      nombreDocumento,

    codigo:
      Object.prototype.hasOwnProperty.call(
        body || {},
        'codigo'
      )
        ? (
            texto(
              body?.codigo
            ) ||
            null
          )
        : (
            documentoActual?.codigo ??
            null
          ),

    fecha_edicion:
      fechaEdicion,

    version:
      Object.prototype.hasOwnProperty.call(
        body || {},
        'version'
      )
        ? (
            texto(
              body?.version
            ) ||
            null
          )
        : (
            documentoActual?.version ??
            null
          ),

    vigencia:
      Object.prototype.hasOwnProperty.call(
        body || {},
        'vigencia'
      )
        ? (
            texto(
              body?.vigencia
            ) ||
            null
          )
        : (
            documentoActual?.vigencia ??
            null
          ),

    activo:
      Object.prototype.hasOwnProperty.call(
        body || {},
        'activo'
      )
        ? normalizarBooleano(
            body?.activo,
            documentoActual?.activo !==
            false
          )
        : (
            documentoActual?.activo !==
            false
          ),

    observaciones:
      Object.prototype.hasOwnProperty.call(
        body || {},
        'observaciones'
      )
        ? (
            texto(
              body?.observaciones
            ) ||
            null
          )
        : (
            documentoActual?.observaciones ??
            null
          ),
  }
}


// ============================================================
// ACTUALIZAR DOCUMENTO
// ============================================================

async function actualizarDocumento(
  supabase,
  documentoActual,
  body,
  usuario
) {
  const fecha =
    new Date()
      .toISOString()

  const payload = {
    ...construirPayloadDocumento(
      body,
      documentoActual
    ),

    usuario_actualizacion:
      usuario,

    updated_at:
      fecha,
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_documentos'
      )
      .update(
        payload
      )
      .eq(
        'id',
        documentoActual.id
      )
      .eq(
        'tipo_documento',
        TIPO_DOCUMENTO
      )
      .select(
        SELECT_DOCUMENTO
      )
      .single()

  if (
    error
  ) {
    throw error
  }

  return data
}


// ============================================================
// REORDENAR SECCIONES
// ============================================================

async function reordenarSecciones(
  supabase,
  ids,
  usuario
) {
  if (
    !Array.isArray(
      ids
    ) ||
    ids.length ===
      0
  ) {
    throw new Error(
      'Debe enviar el orden de las secciones.'
    )
  }

  const idsNormalizados =
    ids
      .map(
        id =>
          numeroEntero(
            id
          )
      )
      .filter(
        id =>
          id >
          0
      )

  if (
    idsNormalizados.length !==
    ids.length
  ) {
    throw new Error(
      'El orden contiene identificadores de sección no válidos.'
    )
  }

  const {
    data: existentes,
    error: errorExistentes,
  } =
    await supabase
      .from(
        'configuracion_codigo_conducta_secciones'
      )
      .select(
        'id'
      )
      .in(
        'id',
        idsNormalizados
      )

  if (
    errorExistentes
  ) {
    throw errorExistentes
  }

  if (
    (
      existentes ||
      []
    ).length !==
    idsNormalizados.length
  ) {
    throw new Error(
      'Una o más secciones no existen.'
    )
  }

  const fecha =
    new Date()
      .toISOString()

  // ==========================================================
  // PRIMER PASO:
  // mover temporalmente los órdenes para evitar conflicto
  // con la restricción UNIQUE(orden)
  // ==========================================================

  for (
    let index = 0;
    index <
      idsNormalizados.length;
    index += 1
  ) {
    const id =
      idsNormalizados[
        index
      ]

    const ordenTemporal =
      100000 +
      index +
      1

    const {
      error,
    } =
      await supabase
        .from(
          'configuracion_codigo_conducta_secciones'
        )
        .update({
          orden:
            ordenTemporal,

          usuario_actualizacion:
            usuario,

          updated_at:
            fecha,
        })
        .eq(
          'id',
          id
        )

    if (
      error
    ) {
      throw error
    }
  }

  // ==========================================================
  // SEGUNDO PASO:
  // asignar orden definitivo
  // ==========================================================

  for (
    let index = 0;
    index <
      idsNormalizados.length;
    index += 1
  ) {
    const id =
      idsNormalizados[
        index
      ]

    const {
      error,
    } =
      await supabase
        .from(
          'configuracion_codigo_conducta_secciones'
        )
        .update({
          orden:
            index +
            1,

          usuario_actualizacion:
            usuario,

          updated_at:
            fecha,
        })
        .eq(
          'id',
          id
        )

    if (
      error
    ) {
      throw error
    }
  }
}


// ============================================================
// GET
// CONSULTAR CONFIGURACIÓN COMPLETA
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

    const documento =
      await obtenerDocumento(
        supabase
      )

    if (
      !documento
    ) {
      return respuestaError(
        'No existe la configuración documental del Código de Conducta.',
        404
      )
    }

    const [
      secciones,
      versiones,
    ] =
      await Promise.all([
        obtenerSecciones(
          supabase,
          false
        ),

        obtenerVersiones(
          supabase,
          documento.id
        ),
      ])

    return respuestaOk({
      empresa: {
        nit:
          texto(
            empresa?.nit
          ),

        nombre:
          texto(
            empresa
              ?.nombre ||
            empresa
              ?.nombre_empresa ||
            empresa
              ?.razon_social
          ),
      },

      documento,

      secciones,

      versiones,
    })
  } catch (
    error
  ) {
    console.error(
      'Error GET configuracion-codigo-conducta:',
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
      'No fue posible consultar la configuración del Código de Conducta.',
      500
    )
  }
}


// ============================================================
// PATCH
//
// ACCIONES:
// - actualizar_documento
// - actualizar_seccion
// - reordenar_secciones
// ============================================================

export async function PATCH(
  request
) {
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
      texto(
        body?.accion
      )
        .toLowerCase()

    const usuario =
      usuarioActualizacion(
        body
      )

    const fecha =
      new Date()
        .toISOString()


    // ========================================================
    // ACTUALIZAR DATOS DEL DOCUMENTO
    // ========================================================

    if (
      accion ===
      'actualizar_documento'
    ) {
      const documentoActual =
        await obtenerDocumento(
          supabase
        )

      if (
        !documentoActual
      ) {
        return respuestaError(
          'No existe la configuración documental del Código de Conducta.',
          404
        )
      }

      const documento =
        await actualizarDocumento(
          supabase,
          documentoActual,
          body,
          usuario
        )

      return respuestaOk({
        message:
          'Configuración documental actualizada correctamente.',

        documento,
      })
    }


    // ========================================================
    // ACTUALIZAR UNA SECCIÓN
    // ========================================================

    if (
      accion ===
      'actualizar_seccion'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <=
        0
      ) {
        return respuestaError(
          'La sección que desea actualizar no es válida.'
        )
      }

      const titulo =
        texto(
          body?.titulo
        )

      const contenido =
        texto(
          body?.contenido
        )

      if (
        !titulo
      ) {
        return respuestaError(
          'El título de la sección es obligatorio.'
        )
      }

      if (
        !contenido
      ) {
        return respuestaError(
          'El contenido de la sección es obligatorio.'
        )
      }

      const payload = {
        titulo,

        contenido,

        activo:
          normalizarBooleano(
            body?.activo,
            true
          ),

        usuario_actualizacion:
          usuario,

        updated_at:
          fecha,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'configuracion_codigo_conducta_secciones'
          )
          .update(
            payload
          )
          .eq(
            'id',
            id
          )
          .select(
            SELECT_SECCION
          )
          .single()

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Sección actualizada correctamente.',

        seccion:
          data,
      })
    }


    // ========================================================
    // REORDENAR SECCIONES
    // ========================================================

    if (
      accion ===
      'reordenar_secciones'
    ) {
      const ids =
        body?.ids

      await reordenarSecciones(
        supabase,
        ids,
        usuario
      )

      const secciones =
        await obtenerSecciones(
          supabase,
          false
        )

      return respuestaOk({
        message:
          'Secciones reordenadas correctamente.',

        secciones,
      })
    }


    return respuestaError(
      'La acción solicitada no es válida.'
    )
  } catch (
    error
  ) {
    console.error(
      'Error PATCH configuracion-codigo-conducta:',
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
      'No fue posible actualizar la configuración del Código de Conducta.',
      500
    )
  }
}


// ============================================================
// POST
//
// ACCIONES:
// - crear_seccion
// - crear_nueva_version
//
// Si no se envía acción, conserva el comportamiento anterior
// y crea una nueva sección.
// ============================================================

export async function POST(
  request
) {
  try {
    const body =
      await request.json()

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

    const accion =
      texto(
        body?.accion
      )
        .toLowerCase()

    const usuario =
      usuarioActualizacion(
        body
      )


    // ========================================================
    // CREAR NUEVA VERSIÓN
    // ========================================================

    if (
      accion ===
      'crear_nueva_version'
    ) {
      const documentoActual =
        await obtenerDocumento(
          supabase
        )

      if (
        !documentoActual
      ) {
        return respuestaError(
          'No existe la configuración documental del Código de Conducta.',
          404
        )
      }

      const nuevaVersion =
        texto(
          body?.version
        )

      if (
        !nuevaVersion
      ) {
        return respuestaError(
          'Debe indicar la nueva versión del Código de Conducta.'
        )
      }

      if (
        nuevaVersion ===
        texto(
          documentoActual
            .version
        )
      ) {
        return respuestaError(
          'La nueva versión debe ser diferente de la versión vigente.'
        )
      }

      const seccionesActuales =
        await obtenerSecciones(
          supabase,
          false
        )

      const versionArchivada =
        await archivarVersionActual(
          supabase,
          documentoActual,
          seccionesActuales,
          usuario
        )

      try {
        const documento =
          await actualizarDocumento(
            supabase,
            documentoActual,
            body,
            usuario
          )

        const versiones =
          await obtenerVersiones(
            supabase,
            documentoActual.id
          )

        return respuestaOk(
          {
            message:
              'Nueva versión del Código de Conducta creada correctamente.',

            empresa: {
              nit:
                texto(
                  empresa?.nit
                ),

              nombre:
                texto(
                  empresa
                    ?.nombre ||
                  empresa
                    ?.nombre_empresa ||
                  empresa
                    ?.razon_social
                ),
            },

            documento,

            secciones:
              seccionesActuales,

            version_archivada:
              versionArchivada,

            versiones,
          },
          201
        )
      } catch (
        errorNuevaVersion
      ) {
        // Supabase JS no está ejecutando estas operaciones
        // como una transacción SQL única. Si falla la actualización
        // del documento, se restaura el control documental anterior
        // y se elimina el registro histórico recién creado.

        const fechaRollback =
          new Date()
            .toISOString()

        await supabase
          .from(
            'configuracion_documentos'
          )
          .update(
            {
              nombre_documento:
                documentoActual
                  .nombre_documento,

              codigo:
                documentoActual
                  .codigo ??
                null,

              fecha_edicion:
                documentoActual
                  .fecha_edicion ??
                null,

              version:
                documentoActual
                  .version ??
                null,

              vigencia:
                documentoActual
                  .vigencia ??
                null,

              activo:
                documentoActual
                  .activo !==
                false,

              observaciones:
                documentoActual
                  .observaciones ??
                null,

              usuario_actualizacion:
                documentoActual
                  .usuario_actualizacion ??
                null,

              updated_at:
                fechaRollback,
            }
          )
          .eq(
            'id',
            documentoActual.id
          )
          .eq(
            'tipo_documento',
            TIPO_DOCUMENTO
          )

        await supabase
          .from(
            'configuracion_documentos_versiones'
          )
          .delete()
          .eq(
            'id',
            versionArchivada.id
          )

        throw errorNuevaVersion
      }
    }


    // ========================================================
    // CREAR NUEVA SECCIÓN
    // ========================================================

    if (
      accion &&
      accion !==
        'crear_seccion'
    ) {
      return respuestaError(
        'La acción solicitada no es válida.'
      )
    }

    const titulo =
      texto(
        body?.titulo
      )

    const contenido =
      texto(
        body?.contenido
      )

    if (
      !titulo
    ) {
      return respuestaError(
        'El título de la sección es obligatorio.'
      )
    }

    if (
      !contenido
    ) {
      return respuestaError(
        'El contenido de la sección es obligatorio.'
      )
    }

    // ========================================================
    // OBTENER ÚLTIMO ORDEN
    // ========================================================

    const {
      data: ultima,
      error: errorOrden,
    } =
      await supabase
        .from(
          'configuracion_codigo_conducta_secciones'
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

    const nuevoOrden =
      numeroEntero(
        ultima?.orden
      ) +
      1

    const fecha =
      new Date()
        .toISOString()

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'configuracion_codigo_conducta_secciones'
        )
        .insert({
          titulo,

          contenido,

          orden:
            nuevoOrden,

          activo:
            normalizarBooleano(
              body?.activo,
              true
            ),

          usuario_actualizacion:
            usuario,

          created_at:
            fecha,

          updated_at:
            fecha,
        })
        .select(
          SELECT_SECCION
        )
        .single()

    if (
      error
    ) {
      throw error
    }

    return respuestaOk(
      {
        message:
          'Sección creada correctamente.',

        seccion:
          data,
      },
      201
    )
  } catch (
    error
  ) {
    console.error(
      'Error POST configuracion-codigo-conducta:',
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
      'No fue posible procesar la solicitud del Código de Conducta.',
      500
    )
  }
}


// ============================================================
// DELETE
// ELIMINAR SECCIÓN Y REORDENAR
// ============================================================

export async function DELETE(
  request
) {
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

    const id =
      numeroEntero(
        body?.id
      )

    const usuario =
      usuarioActualizacion(
        body
      )

    if (
      id <=
      0
    ) {
      return respuestaError(
        'La sección que desea eliminar no es válida.'
      )
    }

    // ========================================================
    // VERIFICAR QUE EXISTA
    // ========================================================

    const {
      data: existente,
      error: errorExistente,
    } =
      await supabase
        .from(
          'configuracion_codigo_conducta_secciones'
        )
        .select(
          'id, titulo'
        )
        .eq(
          'id',
          id
        )
        .maybeSingle()

    if (
      errorExistente
    ) {
      throw errorExistente
    }

    if (
      !existente
    ) {
      return respuestaError(
        'La sección no existe.',
        404
      )
    }

    // ========================================================
    // ELIMINAR
    // ========================================================

    const {
      error: errorEliminar,
    } =
      await supabase
        .from(
          'configuracion_codigo_conducta_secciones'
        )
        .delete()
        .eq(
          'id',
          id
        )

    if (
      errorEliminar
    ) {
      throw errorEliminar
    }

    // ========================================================
    // CONSULTAR RESTANTES
    // ========================================================

    const restantes =
      await obtenerSecciones(
        supabase,
        false
      )

    // ========================================================
    // REORDENAR RESTANTES
    // ========================================================

    if (
      restantes.length >
      0
    ) {
      await reordenarSecciones(
        supabase,
        restantes.map(
          item =>
            item.id
        ),
        usuario
      )
    }

    const secciones =
      await obtenerSecciones(
        supabase,
        false
      )

    return respuestaOk({
      message:
        'Sección eliminada correctamente.',

      secciones,
    })
  } catch (
    error
  ) {
    console.error(
      'Error DELETE configuracion-codigo-conducta:',
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
      'No fue posible eliminar la sección del Código de Conducta.',
      500
    )
  }
}