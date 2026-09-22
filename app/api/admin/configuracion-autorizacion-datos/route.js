// app/api/admin/configuracion-autorizacion-datos/route.js

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
  'AUTORIZACION_DATOS_CEA'

const CLAVE_CONFIGURACION =
  'GENERAL'

const TABLA_SECCIONES =
  'configuracion_autorizacion_datos_secciones'

const TABLA_FINALIDADES =
  'configuracion_autorizacion_datos_finalidades'


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

const SELECT_CONFIGURACION = `
  id,
  clave,
  correo_proteccion_datos,
  telefono_contacto,
  direccion_contacto,
  medio_politica,
  texto_datos_biometricos,
  texto_menores_edad,
  texto_declaracion_final,
  activo,
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

const SELECT_FINALIDAD = `
  id,
  codigo,
  descripcion,
  orden,
  activo,
  requiere_respuesta,
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
// CONSULTAR DOCUMENTO
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
// CONSULTAR CONFIGURACIÓN GENERAL
// ============================================================

async function obtenerConfiguracionGeneral(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_autorizacion_datos'
      )
      .select(
        SELECT_CONFIGURACION
      )
      .eq(
        'clave',
        CLAVE_CONFIGURACION
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
        TABLA_SECCIONES
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
// CONSULTAR FINALIDADES
// ============================================================

async function obtenerFinalidades(
  supabase,
  soloActivas = false
) {
  let consulta =
    supabase
      .from(
        TABLA_FINALIDADES
      )
      .select(
        SELECT_FINALIDAD
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
  configuracion,
  secciones,
  finalidades
) {
  return {
    configuracion: {
      id:
        configuracion?.id ??
        null,

      clave:
        configuracion?.clave ??
        CLAVE_CONFIGURACION,

      correo_proteccion_datos:
        configuracion
          ?.correo_proteccion_datos ??
        null,

      telefono_contacto:
        configuracion
          ?.telefono_contacto ??
        null,

      direccion_contacto:
        configuracion
          ?.direccion_contacto ??
        null,

      medio_politica:
        configuracion
          ?.medio_politica ??
        null,

      texto_datos_biometricos:
        configuracion
          ?.texto_datos_biometricos ??
        null,

      texto_menores_edad:
        configuracion
          ?.texto_menores_edad ??
        null,

      texto_declaracion_final:
        configuracion
          ?.texto_declaracion_final ??
        null,

      activo:
        configuracion?.activo !==
        false,

      usuario_actualizacion:
        configuracion
          ?.usuario_actualizacion ??
        null,

      created_at:
        configuracion?.created_at ??
        null,

      updated_at:
        configuracion?.updated_at ??
        null,
    },

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
            seccion
              ?.usuario_actualizacion ??
            null,

          created_at:
            seccion?.created_at ??
            null,

          updated_at:
            seccion?.updated_at ??
            null,
        })
      ),

    finalidades:
      (
        Array.isArray(
          finalidades
        )
          ? finalidades
          : []
      ).map(
        finalidad => ({
          id:
            finalidad?.id ??
            null,

          codigo:
            finalidad?.codigo ??
            null,

          descripcion:
            finalidad?.descripcion ??
            null,

          orden:
            finalidad?.orden ??
            null,

          activo:
            finalidad?.activo !==
            false,

          requiere_respuesta:
            finalidad
              ?.requiere_respuesta !==
            false,

          usuario_actualizacion:
            finalidad
              ?.usuario_actualizacion ??
            null,

          created_at:
            finalidad?.created_at ??
            null,

          updated_at:
            finalidad?.updated_at ??
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
  configuracion,
  secciones,
  finalidades,
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
              configuracion,
              secciones,
              finalidades
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

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_documentos'
      )
      .update(
        {
          ...construirPayloadDocumento(
            body,
            documentoActual
          ),

          usuario_actualizacion:
            usuario,

          updated_at:
            fecha,
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
// VALIDAR LISTA DE IDS
// ============================================================

function normalizarIds(
  ids,
  mensaje
) {
  if (
    !Array.isArray(
      ids
    ) ||
    ids.length ===
      0
  ) {
    throw new Error(
      mensaje
    )
  }

  const normalizados =
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
    normalizados.length !==
    ids.length
  ) {
    throw new Error(
      'El orden contiene identificadores no válidos.'
    )
  }

  if (
    new Set(
      normalizados
    ).size !==
    normalizados.length
  ) {
    throw new Error(
      'El orden contiene identificadores repetidos.'
    )
  }

  return normalizados
}


// ============================================================
// REORDENAR REGISTROS
// ============================================================

async function reordenarRegistros(
  supabase,
  tabla,
  ids,
  usuario,
  mensajeVacio
) {
  const idsNormalizados =
    normalizarIds(
      ids,
      mensajeVacio
    )

  const {
    data: existentes,
    error: errorExistentes,
  } =
    await supabase
      .from(
        tabla
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
      'Uno o más registros no existen.'
    )
  }

  const fecha =
    new Date()
      .toISOString()

  // ==========================================================
  // PRIMER PASO
  // ÓRDENES TEMPORALES PARA EVITAR CONFLICTO UNIQUE(orden)
  // ==========================================================

  for (
    let index = 0;
    index <
      idsNormalizados.length;
    index += 1
  ) {
    const {
      error,
    } =
      await supabase
        .from(
          tabla
        )
        .update({
          orden:
            100000 +
            index +
            1,

          usuario_actualizacion:
            usuario,

          updated_at:
            fecha,
        })
        .eq(
          'id',
          idsNormalizados[
            index
          ]
        )

    if (
      error
    ) {
      throw error
    }
  }

  // ==========================================================
  // SEGUNDO PASO
  // ORDEN DEFINITIVO
  // ==========================================================

  for (
    let index = 0;
    index <
      idsNormalizados.length;
    index += 1
  ) {
    const {
      error,
    } =
      await supabase
        .from(
          tabla
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
          idsNormalizados[
            index
          ]
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

    const [
      documento,
      configuracion,
      secciones,
      finalidades,
    ] =
      await Promise.all([
        obtenerDocumento(
          supabase
        ),

        obtenerConfiguracionGeneral(
          supabase
        ),

        obtenerSecciones(
          supabase,
          false
        ),

        obtenerFinalidades(
          supabase,
          false
        ),
      ])

    if (
      !documento
    ) {
      return respuestaError(
        'No existe la configuración documental de la Autorización para el Tratamiento de Datos Personales.',
        404
      )
    }

    if (
      !configuracion
    ) {
      return respuestaError(
        'No existe la configuración GENERAL de la Autorización para el Tratamiento de Datos Personales.',
        404
      )
    }

    const versiones =
      await obtenerVersiones(
        supabase,
        documento.id
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

        razon_social:
          texto(
            empresa?.razon_social ||
            empresa?.nombre ||
            empresa?.nombre_empresa
          ),
      },

      documento,

      configuracion,

      secciones,

      finalidades,

      versiones,
    })
  } catch (
    error
  ) {
    console.error(
      'Error GET configuracion-autorizacion-datos:',
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
      'No fue posible consultar la configuración de la Autorización para el Tratamiento de Datos Personales.',
      500
    )
  }
}


// ============================================================
// PATCH
//
// ACCIONES:
// - actualizar_documento
// - actualizar_configuracion
// - actualizar_seccion
// - reordenar_secciones
// - actualizar_finalidad
// - reordenar_finalidades
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
    // ACTUALIZAR DOCUMENTO
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
          'No existe la configuración documental de la Autorización para el Tratamiento de Datos Personales.',
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
    // ACTUALIZAR CONFIGURACIÓN GENERAL
    // ========================================================

    if (
      accion ===
      'actualizar_configuracion'
    ) {
      const textoBiometricos =
        texto(
          body?.texto_datos_biometricos
        )

      const textoMenores =
        texto(
          body?.texto_menores_edad
        )

      const textoDeclaracion =
        texto(
          body?.texto_declaracion_final
        )

      if (
        !textoBiometricos
      ) {
        return respuestaError(
          'El texto sobre datos sensibles y biométricos es obligatorio.'
        )
      }

      if (
        !textoMenores
      ) {
        return respuestaError(
          'El texto sobre tratamiento de datos de menores de edad es obligatorio.'
        )
      }

      if (
        !textoDeclaracion
      ) {
        return respuestaError(
          'El texto de declaración y autorización es obligatorio.'
        )
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'configuracion_autorizacion_datos'
          )
          .update({
            correo_proteccion_datos:
              texto(
                body?.correo_proteccion_datos
              ) ||
              null,

            telefono_contacto:
              texto(
                body?.telefono_contacto
              ) ||
              null,

            direccion_contacto:
              texto(
                body?.direccion_contacto
              ) ||
              null,

            medio_politica:
              texto(
                body?.medio_politica
              ) ||
              null,

            texto_datos_biometricos:
              textoBiometricos,

            texto_menores_edad:
              textoMenores,

            texto_declaracion_final:
              textoDeclaracion,

            activo:
              normalizarBooleano(
                body?.activo,
                true
              ),

            usuario_actualizacion:
              usuario,

            updated_at:
              fecha,
          })
          .eq(
            'clave',
            CLAVE_CONFIGURACION
          )
          .select(
            SELECT_CONFIGURACION
          )
          .single()

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Configuración general actualizada correctamente.',

        configuracion:
          data,
      })
    }


    // ========================================================
    // ACTUALIZAR SECCIÓN
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

      const {
        data,
        error,
      } =
        await supabase
          .from(
            TABLA_SECCIONES
          )
          .update({
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
          })
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
      await reordenarRegistros(
        supabase,
        TABLA_SECCIONES,
        body?.ids,
        usuario,
        'Debe enviar el orden de las secciones.'
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


    // ========================================================
    // ACTUALIZAR FINALIDAD
    // ========================================================

    if (
      accion ===
      'actualizar_finalidad'
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
          'La finalidad que desea actualizar no es válida.'
        )
      }

      const codigo =
        texto(
          body?.codigo
        )
          .toUpperCase()

      const descripcion =
        texto(
          body?.descripcion
        )

      if (
        !codigo
      ) {
        return respuestaError(
          'El código de la finalidad es obligatorio.'
        )
      }

      if (
        !descripcion
      ) {
        return respuestaError(
          'La descripción de la finalidad es obligatoria.'
        )
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            TABLA_FINALIDADES
          )
          .update({
            codigo,

            descripcion,

            activo:
              normalizarBooleano(
                body?.activo,
                true
              ),

            requiere_respuesta:
              normalizarBooleano(
                body?.requiere_respuesta,
                true
              ),

            usuario_actualizacion:
              usuario,

            updated_at:
              fecha,
          })
          .eq(
            'id',
            id
          )
          .select(
            SELECT_FINALIDAD
          )
          .single()

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Finalidad actualizada correctamente.',

        finalidad:
          data,
      })
    }


    // ========================================================
    // REORDENAR FINALIDADES
    // ========================================================

    if (
      accion ===
      'reordenar_finalidades'
    ) {
      await reordenarRegistros(
        supabase,
        TABLA_FINALIDADES,
        body?.ids,
        usuario,
        'Debe enviar el orden de las finalidades.'
      )

      const finalidades =
        await obtenerFinalidades(
          supabase,
          false
        )

      return respuestaOk({
        message:
          'Finalidades reordenadas correctamente.',

        finalidades,
      })
    }


    return respuestaError(
      'La acción solicitada no es válida.'
    )
  } catch (
    error
  ) {
    console.error(
      'Error PATCH configuracion-autorizacion-datos:',
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
      'No fue posible actualizar la configuración de la Autorización para el Tratamiento de Datos Personales.',
      500
    )
  }
}


// ============================================================
// POST
//
// TIPOS EXISTENTES:
// - seccion
// - finalidad
//
// NUEVA ACCIÓN:
// - crear_nueva_version
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

    const tipo =
      texto(
        body?.tipo
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
    // CREAR NUEVA VERSIÓN
    // ========================================================

    if (
      accion ===
      'crear_nueva_version'
    ) {
      const [
        documentoActual,
        configuracionActual,
        seccionesActuales,
        finalidadesActuales,
      ] =
        await Promise.all([
          obtenerDocumento(
            supabase
          ),

          obtenerConfiguracionGeneral(
            supabase
          ),

          obtenerSecciones(
            supabase,
            false
          ),

          obtenerFinalidades(
            supabase,
            false
          ),
        ])

      if (
        !documentoActual
      ) {
        return respuestaError(
          'No existe la configuración documental de la Autorización para el Tratamiento de Datos Personales.',
          404
        )
      }

      if (
        !configuracionActual
      ) {
        return respuestaError(
          'No existe la configuración GENERAL de la Autorización para el Tratamiento de Datos Personales.',
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
          'Debe indicar la nueva versión de la Autorización para el Tratamiento de Datos Personales.'
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

      const versionArchivada =
        await archivarVersionActual(
          supabase,
          documentoActual,
          configuracionActual,
          seccionesActuales,
          finalidadesActuales,
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
              'Nueva versión de la Autorización para el Tratamiento de Datos Personales creada correctamente.',

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

              razon_social:
                texto(
                  empresa?.razon_social ||
                  empresa?.nombre ||
                  empresa?.nombre_empresa
                ),
            },

            documento,

            configuracion:
              configuracionActual,

            secciones:
              seccionesActuales,

            finalidades:
              finalidadesActuales,

            version_archivada:
              versionArchivada,

            versiones,
          },
          201
        )
      } catch (
        errorNuevaVersion
      ) {
        // Supabase JS no ejecuta estas operaciones como una
        // transacción SQL única. Se intenta restaurar el documento
        // anterior y eliminar la fotografía histórica recién creada.

        const fechaRollback =
          new Date()
            .toISOString()

        await supabase
          .from(
            'configuracion_documentos'
          )
          .update({
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
          })
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
    // CREAR SECCIÓN
    // ========================================================

    if (
      tipo ===
      'seccion'
    ) {
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

      const {
        data: ultima,
        error: errorOrden,
      } =
        await supabase
          .from(
            TABLA_SECCIONES
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

      const {
        data,
        error,
      } =
        await supabase
          .from(
            TABLA_SECCIONES
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
    }


    // ========================================================
    // CREAR FINALIDAD
    // ========================================================

    if (
      tipo ===
      'finalidad'
    ) {
      const codigo =
        texto(
          body?.codigo
        )
          .toUpperCase()

      const descripcion =
        texto(
          body?.descripcion
        )

      if (
        !codigo
      ) {
        return respuestaError(
          'El código de la finalidad es obligatorio.'
        )
      }

      if (
        !descripcion
      ) {
        return respuestaError(
          'La descripción de la finalidad es obligatoria.'
        )
      }

      const {
        data: ultima,
        error: errorOrden,
      } =
        await supabase
          .from(
            TABLA_FINALIDADES
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

      const {
        data,
        error,
      } =
        await supabase
          .from(
            TABLA_FINALIDADES
          )
          .insert({
            codigo,

            descripcion,

            orden:
              nuevoOrden,

            activo:
              normalizarBooleano(
                body?.activo,
                true
              ),

            requiere_respuesta:
              normalizarBooleano(
                body?.requiere_respuesta,
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
            SELECT_FINALIDAD
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
            'Finalidad creada correctamente.',

          finalidad:
            data,
        },
        201
      )
    }


    return respuestaError(
      'El tipo de registro solicitado no es válido.'
    )
  } catch (
    error
  ) {
    console.error(
      'Error POST configuracion-autorizacion-datos:',
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
      'No fue posible procesar la solicitud de configuración.',
      500
    )
  }
}


// ============================================================
// DELETE
//
// TIPOS:
// - seccion
// - finalidad
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

    const tipo =
      texto(
        body?.tipo
      )
        .toLowerCase()

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
        'El registro que desea eliminar no es válido.'
      )
    }


    // ========================================================
    // ELIMINAR SECCIÓN
    // ========================================================

    if (
      tipo ===
      'seccion'
    ) {
      const {
        data: existente,
        error: errorExistente,
      } =
        await supabase
          .from(
            TABLA_SECCIONES
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

      const {
        error: errorEliminar,
      } =
        await supabase
          .from(
            TABLA_SECCIONES
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

      const restantes =
        await obtenerSecciones(
          supabase,
          false
        )

      if (
        restantes.length >
        0
      ) {
        await reordenarRegistros(
          supabase,
          TABLA_SECCIONES,
          restantes.map(
            item =>
              item.id
          ),
          usuario,
          'Debe enviar el orden de las secciones.'
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
    }


    // ========================================================
    // ELIMINAR FINALIDAD
    // ========================================================

    if (
      tipo ===
      'finalidad'
    ) {
      const {
        data: existente,
        error: errorExistente,
      } =
        await supabase
          .from(
            TABLA_FINALIDADES
          )
          .select(
            'id, codigo'
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
          'La finalidad no existe.',
          404
        )
      }

      const {
        error: errorEliminar,
      } =
        await supabase
          .from(
            TABLA_FINALIDADES
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

      const restantes =
        await obtenerFinalidades(
          supabase,
          false
        )

      if (
        restantes.length >
        0
      ) {
        await reordenarRegistros(
          supabase,
          TABLA_FINALIDADES,
          restantes.map(
            item =>
              item.id
          ),
          usuario,
          'Debe enviar el orden de las finalidades.'
        )
      }

      const finalidades =
        await obtenerFinalidades(
          supabase,
          false
        )

      return respuestaOk({
        message:
          'Finalidad eliminada correctamente.',

        finalidades,
      })
    }


    return respuestaError(
      'El tipo de registro solicitado no es válido.'
    )
  } catch (
    error
  ) {
    console.error(
      'Error DELETE configuracion-autorizacion-datos:',
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
      'No fue posible eliminar el registro de configuración.',
      500
    )
  }
}