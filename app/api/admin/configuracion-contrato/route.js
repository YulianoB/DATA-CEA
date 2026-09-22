// app/api/admin/configuracion-contrato/route.js

import {
  NextResponse,
} from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
} from '@/lib/supabaseEmpresaServer'


// ============================================================
// CONSTANTES
// ============================================================

const CLAVE_CONFIGURACION =
  'GENERAL'

const TIPO_DOCUMENTO =
  'CONTRATO'

const NOMBRE_DOCUMENTO_PREDETERMINADO =
  'CONTRATO DE PRESTACIÓN DE SERVICIOS DE FORMACIÓN EN CONDUCCIÓN'


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
  nombre_documento,
  texto_introductorio,
  texto_final,
  mostrar_foto,
  mostrar_huella,
  activo,
  observaciones,
  usuario_actualizacion,
  created_at,
  updated_at
`

const SELECT_CLAUSULA = `
  id,
  configuracion_contrato_id,
  orden,
  titulo,
  contenido,
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


function booleano(
  valor,
  respaldo = false
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

  return respaldo
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


function construirEmpresa(
  empresa
) {
  return {
    nit:
      empresa?.nit ||
      '',

    nombre:
      empresa?.nombre ||
      '',

    nivel_cea:
      empresa?.nivel_cea ||
      '',

    categorias_habilitadas:
      Array.isArray(
        empresa
          ?.categorias_habilitadas
      )
        ? empresa.categorias_habilitadas
        : [],
  }
}


function errorHttp(
  mensaje,
  status = 400
) {
  const error =
    new Error(
      mensaje
    )

  error.status =
    status

  return error
}


// ============================================================
// OBTENER O CREAR DOCUMENTO DE CONTROL
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

  if (
    data
  ) {
    return data
  }

  const ahora =
    new Date()
      .toISOString()

  const {
    data: creado,
    error: errorCreacion,
  } =
    await supabase
      .from(
        'configuracion_documentos'
      )
      .insert(
        {
          tipo_documento:
            TIPO_DOCUMENTO,

          nombre_documento:
            NOMBRE_DOCUMENTO_PREDETERMINADO,

          activo:
            true,

          created_at:
            ahora,

          updated_at:
            ahora,
        }
      )
      .select(
        SELECT_DOCUMENTO
      )
      .single()

  if (
    errorCreacion
  ) {
    throw errorCreacion
  }

  return creado
}


// ============================================================
// OBTENER O CREAR CONFIGURACIÓN GENERAL
// ============================================================

async function obtenerConfiguracion(
  supabase,
  nombreDocumento =
    NOMBRE_DOCUMENTO_PREDETERMINADO
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_contrato'
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

  if (
    data
  ) {
    return data
  }

  const ahora =
    new Date()
      .toISOString()

  const {
    data: creada,
    error: errorCreacion,
  } =
    await supabase
      .from(
        'configuracion_contrato'
      )
      .insert(
        {
          clave:
            CLAVE_CONFIGURACION,

          nombre_documento:
            texto(
              nombreDocumento
            ) ||
            NOMBRE_DOCUMENTO_PREDETERMINADO,

          mostrar_foto:
            true,

          mostrar_huella:
            true,

          activo:
            true,

          created_at:
            ahora,

          updated_at:
            ahora,
        }
      )
      .select(
        SELECT_CONFIGURACION
      )
      .single()

  if (
    errorCreacion
  ) {
    throw errorCreacion
  }

  return creada
}


// ============================================================
// OBTENER CLÁUSULAS
// ============================================================

async function obtenerClausulas(
  supabase,
  configuracionId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_contrato_clausulas'
      )
      .select(
        SELECT_CLAUSULA
      )
      .eq(
        'configuracion_contrato_id',
        configuracionId
      )
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
// OBTENER VERSIONES HISTÓRICAS
// ============================================================

async function obtenerVersiones(
  supabase,
  documentoId
) {
  const consulta =
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
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )

  if (
    documentoId
  ) {
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
// CONSTRUIR FOTOGRAFÍA HISTÓRICA
// ============================================================

function construirContenidoHistorico(
  configuracion,
  clausulas
) {
  return {
    configuracion: {
      id:
        configuracion?.id ??
        null,

      clave:
        configuracion?.clave ??
        CLAVE_CONFIGURACION,

      nombre_documento:
        configuracion?.nombre_documento ??
        null,

      texto_introductorio:
        configuracion?.texto_introductorio ??
        null,

      texto_final:
        configuracion?.texto_final ??
        null,

      mostrar_foto:
        configuracion?.mostrar_foto !==
        false,

      mostrar_huella:
        configuracion?.mostrar_huella !==
        false,

      activo:
        configuracion?.activo !==
        false,

      observaciones:
        configuracion?.observaciones ??
        null,

      usuario_actualizacion:
        configuracion?.usuario_actualizacion ??
        null,

      created_at:
        configuracion?.created_at ??
        null,

      updated_at:
        configuracion?.updated_at ??
        null,
    },

    clausulas:
      (
        Array.isArray(
          clausulas
        )
          ? clausulas
          : []
      ).map(
        clausula => ({
          id:
            clausula?.id ??
            null,

          orden:
            clausula?.orden ??
            null,

          titulo:
            clausula?.titulo ??
            null,

          contenido:
            clausula?.contenido ??
            null,

          activo:
            clausula?.activo !==
            false,

          usuario_actualizacion:
            clausula?.usuario_actualizacion ??
            null,

          created_at:
            clausula?.created_at ??
            null,

          updated_at:
            clausula?.updated_at ??
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
  clausulas,
  usuarioCreacion
) {
  const contenido =
    construirContenidoHistorico(
      configuracion,
      clausulas
    )

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

          contenido,

          usuario_creacion:
            texto(
              usuarioCreacion
            ) ||
            null,
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
// VALIDAR DATOS DEL DOCUMENTO
// ============================================================

function obtenerDatosDocumentoDesdeBody(
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
    throw errorHttp(
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
          body.fecha_edicion
        )

      if (
        !fechaEdicion
      ) {
        throw errorHttp(
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
        ? booleano(
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
// ACTUALIZAR CONTROL DOCUMENTAL
// ============================================================

async function actualizarDocumento(
  supabase,
  documentoActual,
  body,
  usuarioActualizacion
) {
  const datos =
    obtenerDatosDocumentoDesdeBody(
      body,
      documentoActual
    )

  const ahora =
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
          ...datos,

          usuario_actualizacion:
            texto(
              usuarioActualizacion
            ) ||
            null,

          updated_at:
            ahora,
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
// ACTUALIZAR CONFIGURACIÓN ESPECÍFICA DEL CONTRATO
// ============================================================

async function actualizarConfiguracion(
  supabase,
  configuracionActual,
  body,
  nombreDocumento,
  usuarioActualizacion
) {
  const ahora =
    new Date()
      .toISOString()

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_contrato'
      )
      .update(
        {
          nombre_documento:
            nombreDocumento,

          texto_introductorio:
            Object.prototype.hasOwnProperty.call(
              body || {},
              'texto_introductorio'
            )
              ? (
                  texto(
                    body?.texto_introductorio
                  ) ||
                  null
                )
              : (
                  configuracionActual
                    ?.texto_introductorio ??
                  null
                ),

          texto_final:
            Object.prototype.hasOwnProperty.call(
              body || {},
              'texto_final'
            )
              ? (
                  texto(
                    body?.texto_final
                  ) ||
                  null
                )
              : (
                  configuracionActual
                    ?.texto_final ??
                  null
                ),

          mostrar_foto:
            Object.prototype.hasOwnProperty.call(
              body || {},
              'mostrar_foto'
            )
              ? booleano(
                  body?.mostrar_foto,
                  true
                )
              : (
                  configuracionActual
                    ?.mostrar_foto !==
                  false
                ),

          mostrar_huella:
            Object.prototype.hasOwnProperty.call(
              body || {},
              'mostrar_huella'
            )
              ? booleano(
                  body?.mostrar_huella,
                  true
                )
              : (
                  configuracionActual
                    ?.mostrar_huella !==
                  false
                ),

          activo:
            Object.prototype.hasOwnProperty.call(
              body || {},
              'activo'
            )
              ? booleano(
                  body?.activo,
                  true
                )
              : (
                  configuracionActual
                    ?.activo !==
                  false
                ),

          observaciones:
            Object.prototype.hasOwnProperty.call(
              body || {},
              'observaciones_configuracion'
            )
              ? (
                  texto(
                    body?.observaciones_configuracion
                  ) ||
                  null
                )
              : (
                  configuracionActual
                    ?.observaciones ??
                  null
                ),

          usuario_actualizacion:
            texto(
              usuarioActualizacion
            ) ||
            null,

          updated_at:
            ahora,
        }
      )
      .eq(
        'id',
        configuracionActual.id
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

  return data
}


// ============================================================
// REORDENAR CLÁUSULAS
// ============================================================

async function reordenarClausulas(
  supabase,
  configuracionId,
  clausulas
) {
  const lista =
    Array.isArray(
      clausulas
    )
      ? clausulas
      : []

  const ids =
    lista
      .map(
        item =>
          numeroEntero(
            item?.id
          )
      )
      .filter(
        Boolean
      )

  if (
    ids.length ===
    0
  ) {
    return
  }

  const ahora =
    new Date()
      .toISOString()

  const {
    data: actuales,
    error: errorActuales,
  } =
    await supabase
      .from(
        'configuracion_contrato_clausulas'
      )
      .select(
        'id, orden'
      )
      .eq(
        'configuracion_contrato_id',
        configuracionId
      )
      .in(
        'id',
        ids
      )

  if (
    errorActuales
  ) {
    throw errorActuales
  }

  const mapaActual =
    new Map(
      (
        actuales ||
        []
      ).map(
        item => [
          Number(
            item.id
          ),
          Number(
            item.orden
          ),
        ]
      )
    )

  // ==========================================================
  // PASO TEMPORAL
  // Evita choques con la restricción UNIQUE del orden
  // ==========================================================

  for (
    let indice =
      0;
    indice <
      lista.length;
    indice +=
      1
  ) {
    const id =
      numeroEntero(
        lista[
          indice
        ]?.id
      )

    if (
      !id ||
      !mapaActual.has(
        id
      )
    ) {
      continue
    }

    const {
      error,
    } =
      await supabase
        .from(
          'configuracion_contrato_clausulas'
        )
        .update(
          {
            orden:
              10000 +
              indice,

            updated_at:
              ahora,
          }
        )
        .eq(
          'id',
          id
        )
        .eq(
          'configuracion_contrato_id',
          configuracionId
        )

    if (
      error
    ) {
      throw error
    }
  }

  // ==========================================================
  // ORDEN DEFINITIVO
  // ==========================================================

  for (
    let indice =
      0;
    indice <
      lista.length;
    indice +=
      1
  ) {
    const id =
      numeroEntero(
        lista[
          indice
        ]?.id
      )

    if (
      !id ||
      !mapaActual.has(
        id
      )
    ) {
      continue
    }

    const {
      error,
    } =
      await supabase
        .from(
          'configuracion_contrato_clausulas'
        )
        .update(
          {
            orden:
              indice +
              1,

            updated_at:
              ahora,
          }
        )
        .eq(
          'id',
          id
        )
        .eq(
          'configuracion_contrato_id',
          configuracionId
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

    const configuracion =
      await obtenerConfiguracion(
        supabase,
        documento.nombre_documento
      )

    const [
      clausulas,
      versiones,
    ] =
      await Promise.all(
        [
          obtenerClausulas(
            supabase,
            configuracion.id
          ),

          obtenerVersiones(
            supabase,
            documento.id
          ),
        ]
      )

    return NextResponse.json(
      {
        ok:
          true,

        empresa:
          construirEmpresa(
            empresa
          ),

        documento,

        configuracion,

        clausulas,

        versiones,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'GET /api/admin/configuracion-contrato:',
      error
    )

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error?.message ||
          'No fue posible consultar la configuración del contrato.',
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
// PATCH
// Actualiza versión vigente, configuración o cláusulas
// ============================================================

export async function PATCH(
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

    const documento =
      await obtenerDocumento(
        supabase
      )

    const configuracion =
      await obtenerConfiguracion(
        supabase,
        documento.nombre_documento
      )

    const accion =
      texto(
        body?.accion
      ).toUpperCase()

    const usuarioActualizacion =
      texto(
        body
          ?.usuario_actualizacion
      )

    const ahora =
      new Date()
        .toISOString()


    // ========================================================
    // ACTUALIZAR CONFIGURACIÓN GENERAL
    // Mantiene compatibilidad con la página existente
    // y sincroniza el nombre con configuracion_documentos.
    // ========================================================

    if (
      accion ===
      'ACTUALIZAR_CONFIGURACION'
    ) {
      const documentoActualizado =
        await actualizarDocumento(
          supabase,
          documento,
          body,
          usuarioActualizacion
        )

      const configuracionActualizada =
        await actualizarConfiguracion(
          supabase,
          configuracion,
          body,
          documentoActualizado
            .nombre_documento,
          usuarioActualizacion
        )

      return NextResponse.json(
        {
          ok:
            true,

          message:
            'Configuración del contrato actualizada correctamente.',

          empresa:
            construirEmpresa(
              empresa
            ),

          documento:
            documentoActualizado,

          configuracion:
            configuracionActualizada,
        }
      )
    }


    // ========================================================
    // ACTUALIZAR DATOS DEL DOCUMENTO
    // Acción específica para el bloque de encabezado/control.
    // ========================================================

    if (
      accion ===
      'ACTUALIZAR_DOCUMENTO'
    ) {
      const documentoActualizado =
        await actualizarDocumento(
          supabase,
          documento,
          body,
          usuarioActualizacion
        )

      let configuracionActualizada =
        configuracion

      if (
        documentoActualizado
          .nombre_documento !==
        configuracion
          .nombre_documento
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              'configuracion_contrato'
            )
            .update(
              {
                nombre_documento:
                  documentoActualizado
                    .nombre_documento,

                usuario_actualizacion:
                  usuarioActualizacion ||
                  null,

                updated_at:
                  ahora,
              }
            )
            .eq(
              'id',
              configuracion.id
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

        configuracionActualizada =
          data
      }

      return NextResponse.json(
        {
          ok:
            true,

          message:
            'Datos del documento actualizados correctamente.',

          empresa:
            construirEmpresa(
              empresa
            ),

          documento:
            documentoActualizado,

          configuracion:
            configuracionActualizada,
        }
      )
    }


    // ========================================================
    // ACTUALIZAR CLÁUSULA
    // ========================================================

    if (
      accion ===
      'ACTUALIZAR_CLAUSULA'
    ) {
      const clausulaId =
        numeroEntero(
          body
            ?.clausula_id
        )

      const titulo =
        texto(
          body?.titulo
        )

      const contenido =
        texto(
          body?.contenido
        )

      if (
        !clausulaId
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            error:
              'No se recibió una cláusula válida.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        !contenido
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            error:
              'El contenido de la cláusula es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'configuracion_contrato_clausulas'
          )
          .update(
            {
              titulo:
                titulo ||
                null,

              contenido,

              activo:
                booleano(
                  body?.activo,
                  true
                ),

              usuario_actualizacion:
                usuarioActualizacion ||
                null,

              updated_at:
                ahora,
            }
          )
          .eq(
            'id',
            clausulaId
          )
          .eq(
            'configuracion_contrato_id',
            configuracion.id
          )
          .select(
            SELECT_CLAUSULA
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
        return NextResponse.json(
          {
            ok:
              false,

            error:
              'La cláusula indicada no existe.',
          },
          {
            status:
              404,
          }
        )
      }

      return NextResponse.json(
        {
          ok:
            true,

          message:
            'Cláusula actualizada correctamente.',

          clausula:
            data,
        }
      )
    }


    // ========================================================
    // REORDENAR CLÁUSULAS
    // ========================================================

    if (
      accion ===
      'REORDENAR_CLAUSULAS'
    ) {
      const clausulas =
        Array.isArray(
          body?.clausulas
        )
          ? body.clausulas
          : []

      if (
        clausulas.length ===
        0
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            error:
              'No se recibieron cláusulas para reordenar.',
          },
          {
            status:
              400,
          }
        )
      }

      await reordenarClausulas(
        supabase,
        configuracion.id,
        clausulas
      )

      const clausulasActualizadas =
        await obtenerClausulas(
          supabase,
          configuracion.id
        )

      return NextResponse.json(
        {
          ok:
            true,

          message:
            'Orden de las cláusulas actualizado correctamente.',

          clausulas:
            clausulasActualizadas,
        }
      )
    }


    return NextResponse.json(
      {
        ok:
          false,

        error:
          'La acción solicitada no es válida.',
      },
      {
        status:
          400,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'PATCH /api/admin/configuracion-contrato:',
      error
    )

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error?.message ||
          'No fue posible actualizar la configuración del contrato.',
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
// Crear cláusula o crear nueva versión del contrato
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

    const documento =
      await obtenerDocumento(
        supabase
      )

    const configuracion =
      await obtenerConfiguracion(
        supabase,
        documento.nombre_documento
      )

    const accion =
      texto(
        body?.accion
      ).toUpperCase()

    const usuarioActualizacion =
      texto(
        body
          ?.usuario_actualizacion
      )


    // ========================================================
    // CREAR NUEVA VERSIÓN
    // 1. Archiva la versión vigente completa.
    // 2. Actualiza los datos del nuevo documento vigente.
    // 3. Mantiene el contenido actual como base editable.
    // ========================================================

    if (
      accion ===
      'CREAR_NUEVA_VERSION'
    ) {
      const nuevaVersion =
        texto(
          body?.version
        )

      if (
        !nuevaVersion
      ) {
        throw errorHttp(
          'Debe indicar la nueva versión del contrato.'
        )
      }

      if (
        nuevaVersion ===
        texto(
          documento.version
        )
      ) {
        throw errorHttp(
          'La nueva versión debe ser diferente de la versión vigente.'
        )
      }

      const clausulasActuales =
        await obtenerClausulas(
          supabase,
          configuracion.id
        )

      const versionArchivada =
        await archivarVersionActual(
          supabase,
          documento,
          configuracion,
          clausulasActuales,
          usuarioActualizacion
        )

      try {
        const documentoActualizado =
          await actualizarDocumento(
            supabase,
            documento,
            body,
            usuarioActualizacion
          )

        let configuracionActualizada =
          configuracion

        if (
          documentoActualizado
            .nombre_documento !==
          configuracion
            .nombre_documento
        ) {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                'configuracion_contrato'
              )
              .update(
                {
                  nombre_documento:
                    documentoActualizado
                      .nombre_documento,

                  usuario_actualizacion:
                    usuarioActualizacion ||
                    null,

                  updated_at:
                    new Date()
                      .toISOString(),
                }
              )
              .eq(
                'id',
                configuracion.id
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

          configuracionActualizada =
            data
        }

        const versiones =
          await obtenerVersiones(
            supabase,
            documento.id
          )

        return NextResponse.json(
          {
            ok:
              true,

            message:
              'Nueva versión del contrato creada correctamente.',

            empresa:
              construirEmpresa(
                empresa
              ),

            documento:
              documentoActualizado,

            configuracion:
              configuracionActualizada,

            clausulas:
              clausulasActuales,

            version_archivada:
              versionArchivada,

            versiones,
          },
          {
            status:
              201,
          }
        )
      } catch (
        errorNuevaVersion
      ) {
        // Supabase JS no ejecuta estas operaciones como una transacción
        // SQL única. Se intenta restaurar el control documental original
        // y eliminar la fotografía recién creada si falla el proceso.

        const ahoraRollback =
          new Date()
            .toISOString()

        await supabase
          .from(
            'configuracion_documentos'
          )
          .update(
            {
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

              usuario_actualizacion:
                documento.usuario_actualizacion ??
                null,

              updated_at:
                ahoraRollback,
            }
          )
          .eq(
            'id',
            documento.id
          )
          .eq(
            'tipo_documento',
            TIPO_DOCUMENTO
          )

        await supabase
          .from(
            'configuracion_contrato'
          )
          .update(
            {
              nombre_documento:
                configuracion.nombre_documento,

              usuario_actualizacion:
                configuracion.usuario_actualizacion ??
                null,

              updated_at:
                ahoraRollback,
            }
          )
          .eq(
            'id',
            configuracion.id
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
    // CREAR CLÁUSULA
    // Se mantiene compatibilidad con el comportamiento actual.
    // Si no se envía acción, también se interpreta como cláusula.
    // ========================================================

    if (
      accion &&
      accion !==
        'CREAR_CLAUSULA'
    ) {
      throw errorHttp(
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
      !contenido
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'El contenido de la cláusula es obligatorio.',
        },
        {
          status:
            400,
        }
      )
    }

    const {
      data: ultima,
      error: errorUltima,
    } =
      await supabase
        .from(
          'configuracion_contrato_clausulas'
        )
        .select(
          'orden'
        )
        .eq(
          'configuracion_contrato_id',
          configuracion.id
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
      errorUltima
    ) {
      throw errorUltima
    }

    const nuevoOrden =
      Number(
        ultima?.orden ||
        0
      ) +
      1

    const ahora =
      new Date()
        .toISOString()

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'configuracion_contrato_clausulas'
        )
        .insert(
          {
            configuracion_contrato_id:
              configuracion.id,

            orden:
              nuevoOrden,

            titulo:
              titulo ||
              null,

            contenido,

            activo:
              true,

            usuario_actualizacion:
              usuarioActualizacion ||
              null,

            created_at:
              ahora,

            updated_at:
              ahora,
          }
        )
        .select(
          SELECT_CLAUSULA
        )
        .single()

    if (
      error
    ) {
      throw error
    }

    return NextResponse.json(
      {
        ok:
          true,

        message:
          'Cláusula agregada correctamente.',

        empresa:
          construirEmpresa(
            empresa
          ),

        clausula:
          data,
      },
      {
        status:
          201,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'POST /api/admin/configuracion-contrato:',
      error
    )

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error?.message ||
          'No fue posible procesar la solicitud del contrato.',
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
// DELETE
// Eliminar cláusula y reorganizar las restantes
// ============================================================

export async function DELETE(
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

    const documento =
      await obtenerDocumento(
        supabase
      )

    const configuracion =
      await obtenerConfiguracion(
        supabase,
        documento.nombre_documento
      )

    const clausulaId =
      numeroEntero(
        body?.clausula_id
      )

    if (
      !clausulaId
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'No se recibió una cláusula válida.',
        },
        {
          status:
            400,
        }
      )
    }

    const {
      data: existente,
      error: errorExistente,
    } =
      await supabase
        .from(
          'configuracion_contrato_clausulas'
        )
        .select(
          'id'
        )
        .eq(
          'id',
          clausulaId
        )
        .eq(
          'configuracion_contrato_id',
          configuracion.id
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
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'La cláusula indicada no existe.',
        },
        {
          status:
            404,
        }
      )
    }

    const {
      error: errorEliminar,
    } =
      await supabase
        .from(
          'configuracion_contrato_clausulas'
        )
        .delete()
        .eq(
          'id',
          clausulaId
        )
        .eq(
          'configuracion_contrato_id',
          configuracion.id
        )

    if (
      errorEliminar
    ) {
      throw errorEliminar
    }

    const clausulasRestantes =
      await obtenerClausulas(
        supabase,
        configuracion.id
      )

    if (
      clausulasRestantes.length >
      0
    ) {
      await reordenarClausulas(
        supabase,
        configuracion.id,
        clausulasRestantes
      )
    }

    const clausulasActualizadas =
      await obtenerClausulas(
        supabase,
        configuracion.id
      )

    return NextResponse.json(
      {
        ok:
          true,

        message:
          'Cláusula eliminada correctamente.',

        empresa:
          construirEmpresa(
            empresa
          ),

        clausulas:
          clausulasActualizadas,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'DELETE /api/admin/configuracion-contrato:',
      error
    )

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error?.message ||
          'No fue posible eliminar la cláusula.',
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