// app/api/admin/configuracion-documentos/route.js

import {
  NextResponse,
} from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'


// =======================================================
// CONSTANTES
// =======================================================

const CLAVE_ENCABEZADO =
  'GENERAL'

const TIPOS_DOCUMENTO_ESPECIALES = [
  'CONTRATO',
  'CODIGO_CONDUCTA',
  'AUTORIZACION_DATOS_CEA',
]

const TIPOS_ELEMENTO = [
  'LOGO',
  'NOMBRE_DOCUMENTO',
  'CODIGO',
  'FECHA_EDICION',
  'VERSION',
  'VIGENCIA',
  'PAGINACION',
  'TEXTO',
  'VACIO',
]

const ALINEACIONES_HORIZONTALES = [
  'left',
  'center',
  'right',
]

const ALINEACIONES_VERTICALES = [
  'top',
  'center',
  'bottom',
]


// =======================================================
// SELECTS
// =======================================================

const SELECT_ENCABEZADO = `
  id,
  clave,
  nombre,
  filas,
  columnas,
  estructura,
  usuario_actualizacion,
  created_at,
  updated_at
`

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


// =======================================================
// HELPERS GENERALES
// =======================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function entero(
  valor,
  predeterminado = 0
) {
  const numero =
    Number.parseInt(
      valor,
      10
    )

  if (
    Number.isNaN(
      numero
    )
  ) {
    return predeterminado
  }

  return numero
}


function numero(
  valor,
  predeterminado = 0
) {
  const resultado =
    Number(
      valor
    )

  if (
    !Number.isFinite(
      resultado
    )
  ) {
    return predeterminado
  }

  return resultado
}


function booleano(
  valor,
  predeterminado = false
) {
  if (
    typeof valor ===
    'boolean'
  ) {
    return valor
  }

  return predeterminado
}


function normalizarTipoDocumento(
  valor
) {
  return texto(
    valor
  ).toUpperCase()
}


function normalizarTipoElemento(
  valor
) {
  return texto(
    valor
  ).toUpperCase()
}


function fechaValida(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null
  }

  const valorTexto =
    texto(
      valor
    )

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      valorTexto
    )
  ) {
    return null
  }

  const [
    anio,
    mes,
    dia,
  ] =
    valorTexto
      .split('-')
      .map(
        Number
      )

  const fecha =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia
      )
    )

  if (
    fecha.getUTCFullYear() !==
      anio ||
    fecha.getUTCMonth() !==
      mes - 1 ||
    fecha.getUTCDate() !==
      dia
  ) {
    return null
  }

  return valorTexto
}


function esTipoDocumentoEspecial(
  tipoDocumento
) {
  return TIPOS_DOCUMENTO_ESPECIALES.includes(
    normalizarTipoDocumento(
      tipoDocumento
    )
  )
}


function normalizarClaveTecnicaDocumento(
  valor
) {
  const original =
    texto(
      valor
    )

  if (
    !original
  ) {
    return ''
  }

  return original
    .normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toUpperCase()
    .replace(
      /[^A-Z0-9]+/g,
      '_'
    )
    .replace(
      /^_+|_+$/g,
      ''
    )
    .replace(
      /_+/g,
      '_'
    )
}


function obtenerIdValido(
  valor
) {
  const id =
    Number.parseInt(
      valor,
      10
    )

  if (
    Number.isNaN(
      id
    ) ||
    id <= 0
  ) {
    return null
  }

  return id
}


// =======================================================
// ERRORES DE VALIDACIÓN
// =======================================================

function crearError(
  mensaje,
  status = 400,
  codigo = 'ERROR_VALIDACION'
) {
  const error =
    new Error(
      mensaje
    )

  error.status =
    status

  error.codigo =
    codigo

  return error
}


// =======================================================
// RESPUESTAS
// =======================================================

function respuestaOk(
  body,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
    }
  )
}


function respuestaError(
  mensaje,
  status = 400,
  codigo = 'ERROR'
) {
  return NextResponse.json(
    {
      ok: false,
      error: mensaje,
      codigo,
    },
    {
      status,
    }
  )
}


function manejarErrorEmpresa(
  error
) {
  const respuestaEmpresa =
    respuestaErrorEmpresa(
      error
    )

  if (
    !respuestaEmpresa
  ) {
    return null
  }

  return NextResponse.json(
    respuestaEmpresa.body,
    {
      status:
        respuestaEmpresa.status,
    }
  )
}


// =======================================================
// NORMALIZACIÓN DE ELEMENTOS
// =======================================================

function normalizarElemento(
  elemento
) {
  const tipo =
    normalizarTipoElemento(
      elemento?.tipo
    )

  if (
    !TIPOS_ELEMENTO.includes(
      tipo
    )
  ) {
    throw crearError(
      `Tipo de elemento no válido: ${tipo || 'VACÍO'}`,
      400,
      'TIPO_ELEMENTO_INVALIDO'
    )
  }

  return {
    tipo,

    prefijo:
      texto(
        elemento?.prefijo
      ),

    valor:
      texto(
        elemento?.valor
      ),

    negrita:
      booleano(
        elemento?.negrita,
        false
      ),

    tamano_fuente:
      Math.max(
        6,
        Math.min(
          30,
          numero(
            elemento?.tamano_fuente,
            9
          )
        )
      ),
  }
}


// =======================================================
// NORMALIZACIÓN DE CELDAS
// =======================================================

function normalizarCelda(
  celda,
  filas,
  columnas
) {
  const fila =
    entero(
      celda?.fila
    )

  const columna =
    entero(
      celda?.columna
    )

  const rowSpan =
    Math.max(
      1,
      entero(
        celda?.rowSpan,
        1
      )
    )

  const colSpan =
    Math.max(
      1,
      entero(
        celda?.colSpan,
        1
      )
    )

  if (
    fila < 1 ||
    fila > filas
  ) {
    throw crearError(
      'La fila de una celda está fuera de la cuadrícula.',
      400,
      'CELDA_FILA_INVALIDA'
    )
  }

  if (
    columna < 1 ||
    columna > columnas
  ) {
    throw crearError(
      'La columna de una celda está fuera de la cuadrícula.',
      400,
      'CELDA_COLUMNA_INVALIDA'
    )
  }

  if (
    fila +
      rowSpan -
      1 >
    filas
  ) {
    throw crearError(
      'Una celda excede el número de filas disponibles.',
      400,
      'CELDA_ROWSPAN_INVALIDO'
    )
  }

  if (
    columna +
      colSpan -
      1 >
    columnas
  ) {
    throw crearError(
      'Una celda excede el número de columnas disponibles.',
      400,
      'CELDA_COLSPAN_INVALIDO'
    )
  }

  const alineacionHorizontal =
    texto(
      celda
        ?.alineacion_horizontal
    ).toLowerCase()

  const alineacionVertical =
    texto(
      celda
        ?.alineacion_vertical
    ).toLowerCase()

  const elementos =
    Array.isArray(
      celda?.elementos
    )
      ? celda.elementos.map(
          normalizarElemento
        )
      : []

  return {
    id:
      texto(
        celda?.id
      ) ||
      `celda-${fila}-${columna}`,

    fila,

    columna,

    rowSpan,

    colSpan,

    borde_superior:
      booleano(
        celda?.borde_superior,
        true
      ),

    borde_inferior:
      booleano(
        celda?.borde_inferior,
        true
      ),

    borde_izquierdo:
      booleano(
        celda?.borde_izquierdo,
        true
      ),

    borde_derecho:
      booleano(
        celda?.borde_derecho,
        true
      ),

    alineacion_horizontal:
      ALINEACIONES_HORIZONTALES.includes(
        alineacionHorizontal
      )
        ? alineacionHorizontal
        : 'center',

    alineacion_vertical:
      ALINEACIONES_VERTICALES.includes(
        alineacionVertical
      )
        ? alineacionVertical
        : 'center',

    elementos,
  }
}


// =======================================================
// VALIDAR SUPERPOSICIONES DE CELDAS
// =======================================================

function validarSuperposiciones(
  celdas,
  filas,
  columnas
) {
  const ocupacion = {}

  for (
    let fila = 1;
    fila <= filas;
    fila += 1
  ) {
    ocupacion[
      fila
    ] = {}

    for (
      let columna = 1;
      columna <= columnas;
      columna += 1
    ) {
      ocupacion[
        fila
      ][
        columna
      ] = null
    }
  }

  for (
    const celda of celdas
  ) {
    for (
      let fila =
        celda.fila;
      fila <
      celda.fila +
        celda.rowSpan;
      fila += 1
    ) {
      for (
        let columna =
          celda.columna;
        columna <
        celda.columna +
          celda.colSpan;
        columna += 1
      ) {
        if (
          ocupacion[
            fila
          ][
            columna
          ]
        ) {
          throw crearError(
            `Las celdas "${ocupacion[fila][columna]}" y "${celda.id}" se superponen.`,
            400,
            'CELDAS_SUPERPUESTAS'
          )
        }

        ocupacion[
          fila
        ][
          columna
        ] =
          celda.id
      }
    }
  }
}


// =======================================================
// NORMALIZAR ESTRUCTURA DEL ENCABEZADO
// =======================================================

function normalizarEstructura(
  estructura,
  filas,
  columnas
) {
  const estructuraEntrada =
    estructura &&
    typeof estructura ===
      'object' &&
    !Array.isArray(
      estructura
    )
      ? estructura
      : {}

  const filasEntrada =
    Array.isArray(
      estructuraEntrada?.filas
    )
      ? estructuraEntrada.filas
      : []

  const columnasEntrada =
    Array.isArray(
      estructuraEntrada?.columnas
    )
      ? estructuraEntrada.columnas
      : []

  const celdasEntrada =
    Array.isArray(
      estructuraEntrada?.celdas
    )
      ? estructuraEntrada.celdas
      : []

  const filasNormalizadas = []

  for (
    let index = 0;
    index < filas;
    index += 1
  ) {
    const existente =
      filasEntrada[
        index
      ] || {}

    filasNormalizadas.push(
      {
        id:
          texto(
            existente?.id
          ) ||
          `fila-${index + 1}`,

        orden:
          index + 1,

        altura:
          Math.max(
            4,
            Math.min(
              80,
              numero(
                existente?.altura,
                10
              )
            )
          ),
      }
    )
  }

  const columnasNormalizadas = []

  for (
    let index = 0;
    index <
    columnas;
    index += 1
  ) {
    const existente =
      columnasEntrada[
        index
      ] || {}

    columnasNormalizadas.push(
      {
        id:
          texto(
            existente?.id
          ) ||
          `columna-${index + 1}`,

        orden:
          index + 1,

        ancho:
          Math.max(
            5,
            Math.min(
              100,
              numero(
                existente?.ancho,
                100 /
                  columnas
              )
            )
          ),
      }
    )
  }

  const celdasNormalizadas =
    celdasEntrada.map(
      (
        celda
      ) =>
        normalizarCelda(
          celda,
          filas,
          columnas
        )
    )

  validarSuperposiciones(
    celdasNormalizadas,
    filas,
    columnas
  )

  const configuracionEntrada =
    estructuraEntrada
      ?.configuracion &&
    typeof estructuraEntrada
      .configuracion ===
      'object' &&
    !Array.isArray(
      estructuraEntrada
        .configuracion
    )
      ? estructuraEntrada
          .configuracion
      : {}

  return {
    version_esquema:
      1,

    configuracion: {
      borde_exterior:
        booleano(
          configuracionEntrada
            ?.borde_exterior,
          true
        ),

      grosor_borde:
        Math.max(
          0.25,
          Math.min(
            5,
            numero(
              configuracionEntrada
                ?.grosor_borde,
              1
            )
          )
        ),

      padding:
        Math.max(
          0,
          Math.min(
            20,
            numero(
              configuracionEntrada
                ?.padding,
              4
            )
          )
        ),

      altura_total_mm:
        Math.max(
          10,
          Math.min(
            100,
            numero(
              configuracionEntrada
                ?.altura_total_mm,
              24
            )
          )
        ),
    },

    filas:
      filasNormalizadas,

    columnas:
      columnasNormalizadas,

    celdas:
      celdasNormalizadas,
  }
}


// =======================================================
// OBTENER CONFIGURACIÓN
// =======================================================

async function obtenerConfiguracion(
  supabase
) {
  const {
    data:
      encabezado,
    error:
      errorEncabezado,
  } =
    await supabase
      .from(
        'configuracion_encabezado_documentos'
      )
      .select(
        SELECT_ENCABEZADO
      )
      .eq(
        'clave',
        CLAVE_ENCABEZADO
      )
      .maybeSingle()

  if (
    errorEncabezado
  ) {
    throw new Error(
      errorEncabezado.message
    )
  }

  const {
    data:
      documentosTodos,
    error:
      errorDocumentos,
  } =
    await supabase
      .from(
        'configuracion_documentos'
      )
      .select(
        SELECT_DOCUMENTO
      )
      .order(
        'nombre_documento',
        {
          ascending:
            true,
        }
      )

  if (
    errorDocumentos
  ) {
    throw new Error(
      errorDocumentos.message
    )
  }

  const documentos =
    (
      documentosTodos ||
      []
    ).filter(
      (
        documento
      ) =>
        !esTipoDocumentoEspecial(
          documento
            ?.tipo_documento
        )
    )

  return {
    encabezado:
      encabezado ||
      null,

    documentos,
  }
}


// =======================================================
// GET
// =======================================================

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
      await obtenerConfiguracion(
        supabase
      )

    return respuestaOk(
      {
        ok: true,

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            empresa?.nombre ||
            '',
        },

        ...configuracion,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'GET configuracion-documentos:',
      error
    )

    const respuestaEmpresa =
      manejarErrorEmpresa(
        error
      )

    if (
      respuestaEmpresa
    ) {
      return respuestaEmpresa
    }

    return respuestaError(
      'No fue posible cargar la configuración de documentos.',
      500,
      'CONFIG_DOCUMENTOS_GET_ERROR'
    )
  }
}


// =======================================================
// ACTUALIZAR ENCABEZADO
// =======================================================

async function actualizarEncabezado(
  supabase,
  body
) {
  const filas =
    entero(
      body?.filas
    )

  const columnas =
    entero(
      body?.columnas
    )

  if (
    filas < 1 ||
    filas > 6
  ) {
    throw crearError(
      'El encabezado debe tener entre 1 y 6 filas.',
      400,
      'FILAS_ENCABEZADO_INVALIDAS'
    )
  }

  if (
    columnas < 1 ||
    columnas > 6
  ) {
    throw crearError(
      'El encabezado debe tener entre 1 y 6 columnas.',
      400,
      'COLUMNAS_ENCABEZADO_INVALIDAS'
    )
  }

  const estructura =
    normalizarEstructura(
      body?.estructura,
      filas,
      columnas
    )

  const ahora =
    new Date()
      .toISOString()

  const datos = {
    nombre:
      texto(
        body?.nombre
      ) ||
      'Encabezado documental',

    filas,

    columnas,

    estructura,

    usuario_actualizacion:
      texto(
        body
          ?.usuario_actualizacion
      ) ||
      null,

    updated_at:
      ahora,
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_encabezado_documentos'
      )
      .update(
        datos
      )
      .eq(
        'clave',
        CLAVE_ENCABEZADO
      )
      .select(
        SELECT_ENCABEZADO
      )
      .single()

  if (
    error
  ) {
    throw new Error(
      error.message
    )
  }

  return data
}


// =======================================================
// VALIDAR DATOS DE DOCUMENTO
// =======================================================

function obtenerDatosDocumento(
  body
) {
  const nombreDocumento =
    texto(
      body?.nombre_documento
    )

  if (
    !nombreDocumento
  ) {
    throw crearError(
      'El nombre del documento es obligatorio.',
      400,
      'NOMBRE_DOCUMENTO_OBLIGATORIO'
    )
  }

  let fechaEdicion =
    null

  if (
    body?.fecha_edicion
  ) {
    fechaEdicion =
      fechaValida(
        body.fecha_edicion
      )

    if (
      !fechaEdicion
    ) {
      throw crearError(
        'La fecha de elaboración no tiene un formato válido.',
        400,
        'FECHA_EDICION_INVALIDA'
      )
    }
  }

  return {
    nombre_documento:
      nombreDocumento,

    codigo:
      texto(
        body?.codigo
      ) ||
      null,

    fecha_edicion:
      fechaEdicion,

    version:
      texto(
        body?.version
      ) ||
      null,

    vigencia:
      texto(
        body?.vigencia
      ) ||
      null,

    activo:
      body?.activo !==
      false,

    observaciones:
      texto(
        body
          ?.observaciones
      ) ||
      null,

    usuario_actualizacion:
      texto(
        body
          ?.usuario_actualizacion
      ) ||
      null,
  }
}


// =======================================================
// OBTENER CLAVE TÉCNICA DISPONIBLE
// =======================================================

async function obtenerTipoDocumentoDisponible(
  supabase,
  body
) {
  const tipoSolicitado =
    normalizarClaveTecnicaDocumento(
      body?.tipo_documento
    )

  let base =
    tipoSolicitado ||
    normalizarClaveTecnicaDocumento(
      body?.nombre_documento
    )

  if (
    !base
  ) {
    throw crearError(
      'No fue posible generar el identificador técnico del documento.',
      400,
      'TIPO_DOCUMENTO_INVALIDO'
    )
  }

  if (
    esTipoDocumentoEspecial(
      base
    )
  ) {
    throw crearError(
      'Este tipo de documento tiene una configuración independiente y no puede crearse desde Otros Documentos.',
      400,
      'DOCUMENTO_CONFIGURACION_ESPECIAL'
    )
  }

  if (
    base.length >
    120
  ) {
    base =
      base.substring(
        0,
        120
      )
  }

  let candidato =
    base

  let consecutivo =
    2

  while (
    true
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
          'id'
        )
        .eq(
          'tipo_documento',
          candidato
        )
        .maybeSingle()

    if (
      error
    ) {
      throw new Error(
        error.message
      )
    }

    if (
      !data
    ) {
      return candidato
    }

    if (
      tipoSolicitado
    ) {
      throw crearError(
        'Ya existe un documento con ese identificador técnico.',
        409,
        'TIPO_DOCUMENTO_DUPLICADO'
      )
    }

    candidato =
      `${base}_${consecutivo}`

    consecutivo +=
      1
  }
}


// =======================================================
// CREAR DOCUMENTO
// =======================================================

async function crearDocumento(
  supabase,
  body
) {
  const datosDocumento =
    obtenerDatosDocumento(
      body
    )

  const tipoDocumento =
    await obtenerTipoDocumentoDisponible(
      supabase,
      body
    )

  const ahora =
    new Date()
      .toISOString()

  const datos = {
    tipo_documento:
      tipoDocumento,

    ...datosDocumento,

    created_at:
      ahora,

    updated_at:
      ahora,
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_documentos'
      )
      .insert(
        datos
      )
      .select(
        SELECT_DOCUMENTO
      )
      .single()

  if (
    error
  ) {
    if (
      error.code ===
      '23505'
    ) {
      throw crearError(
        'Ya existe un documento con el mismo identificador técnico.',
        409,
        'DOCUMENTO_DUPLICADO'
      )
    }

    throw new Error(
      error.message
    )
  }

  return data
}


// =======================================================
// ACTUALIZAR DOCUMENTO
// =======================================================

async function actualizarDocumento(
  supabase,
  body
) {
  const id =
    obtenerIdValido(
      body?.id
    )

  if (
    !id
  ) {
    throw crearError(
      'El identificador del documento es obligatorio.',
      400,
      'ID_DOCUMENTO_INVALIDO'
    )
  }

  const {
    data:
      documentoExistente,
    error:
      errorDocumentoExistente,
  } =
    await supabase
      .from(
        'configuracion_documentos'
      )
      .select(
        'id, tipo_documento'
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    errorDocumentoExistente
  ) {
    throw new Error(
      errorDocumentoExistente.message
    )
  }

  if (
    !documentoExistente
  ) {
    throw crearError(
      'El documento no existe.',
      404,
      'DOCUMENTO_NO_ENCONTRADO'
    )
  }

  if (
    esTipoDocumentoEspecial(
      documentoExistente
        .tipo_documento
    )
  ) {
    throw crearError(
      'Este documento tiene una configuración independiente y no puede editarse desde Otros Documentos.',
      400,
      'DOCUMENTO_CONFIGURACION_ESPECIAL'
    )
  }

  const datosDocumento =
    obtenerDatosDocumento(
      body
    )

  const ahora =
    new Date()
      .toISOString()

  const datos = {
    ...datosDocumento,

    updated_at:
      ahora,
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
        datos
      )
      .eq(
        'id',
        id
      )
      .select(
        SELECT_DOCUMENTO
      )
      .single()

  if (
    error
  ) {
    throw new Error(
      error.message
    )
  }

  return data
}


// =======================================================
// ELIMINAR DOCUMENTO
// =======================================================

async function eliminarDocumento(
  supabase,
  body
) {
  const id =
    obtenerIdValido(
      body?.id
    )

  if (
    !id
  ) {
    throw crearError(
      'El identificador del documento es obligatorio.',
      400,
      'ID_DOCUMENTO_INVALIDO'
    )
  }

  const {
    data:
      documentoExistente,
    error:
      errorDocumentoExistente,
  } =
    await supabase
      .from(
        'configuracion_documentos'
      )
      .select(
        SELECT_DOCUMENTO
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    errorDocumentoExistente
  ) {
    throw new Error(
      errorDocumentoExistente.message
    )
  }

  if (
    !documentoExistente
  ) {
    throw crearError(
      'El documento no existe.',
      404,
      'DOCUMENTO_NO_ENCONTRADO'
    )
  }

  if (
    esTipoDocumentoEspecial(
      documentoExistente
        .tipo_documento
    )
  ) {
    throw crearError(
      'Este documento tiene una configuración independiente y no puede eliminarse desde Otros Documentos.',
      400,
      'DOCUMENTO_CONFIGURACION_ESPECIAL'
    )
  }

  const {
    error,
  } =
    await supabase
      .from(
        'configuracion_documentos'
      )
      .delete()
      .eq(
        'id',
        id
      )

  if (
    error
  ) {
    throw new Error(
      error.message
    )
  }

  return documentoExistente
}


// =======================================================
// POST
// CREAR OTRO DOCUMENTO
// =======================================================

export async function POST(
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
      ).toUpperCase()

    if (
      accion &&
      accion !==
        'CREAR_DOCUMENTO'
    ) {
      return respuestaError(
        'Acción no válida.',
        400,
        'ACCION_INVALIDA'
      )
    }

    const documento =
      await crearDocumento(
        supabase,
        body
      )

    return respuestaOk(
      {
        ok: true,

        mensaje:
          'Documento creado correctamente.',

        documento,
      },
      201
    )
  } catch (
    error
  ) {
    console.error(
      'POST configuracion-documentos:',
      error
    )

    const respuestaEmpresa =
      manejarErrorEmpresa(
        error
      )

    if (
      respuestaEmpresa
    ) {
      return respuestaEmpresa
    }

    return respuestaError(
      error?.message ||
        'No fue posible crear el documento.',
      error?.status ||
        500,
      error?.codigo ||
        'CONFIG_DOCUMENTOS_POST_ERROR'
    )
  }
}


// =======================================================
// PATCH
// ACTUALIZAR ENCABEZADO O DOCUMENTO
// =======================================================

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
      ).toUpperCase()

    if (
      accion ===
      'ACTUALIZAR_ENCABEZADO'
    ) {
      const encabezado =
        await actualizarEncabezado(
          supabase,
          body
        )

      return respuestaOk(
        {
          ok: true,

          mensaje:
            'Encabezado actualizado correctamente.',

          encabezado,
        }
      )
    }

    if (
      accion ===
      'ACTUALIZAR_DOCUMENTO'
    ) {
      const documento =
        await actualizarDocumento(
          supabase,
          body
        )

      return respuestaOk(
        {
          ok: true,

          mensaje:
            'Documento actualizado correctamente.',

          documento,
        }
      )
    }

    return respuestaError(
      'Acción no válida.',
      400,
      'ACCION_INVALIDA'
    )
  } catch (
    error
  ) {
    console.error(
      'PATCH configuracion-documentos:',
      error
    )

    const respuestaEmpresa =
      manejarErrorEmpresa(
        error
      )

    if (
      respuestaEmpresa
    ) {
      return respuestaEmpresa
    }

    return respuestaError(
      error?.message ||
        'No fue posible actualizar la configuración de documentos.',
      error?.status ||
        500,
      error?.codigo ||
        'CONFIG_DOCUMENTOS_PATCH_ERROR'
    )
  }
}


// =======================================================
// DELETE
// ELIMINAR OTRO DOCUMENTO
// =======================================================

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

    const accion =
      texto(
        body?.accion
      ).toUpperCase()

    if (
      accion &&
      accion !==
        'ELIMINAR_DOCUMENTO'
    ) {
      return respuestaError(
        'Acción no válida.',
        400,
        'ACCION_INVALIDA'
      )
    }

    const documento =
      await eliminarDocumento(
        supabase,
        body
      )

    return respuestaOk(
      {
        ok: true,

        mensaje:
          'Documento eliminado correctamente.',

        documento,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'DELETE configuracion-documentos:',
      error
    )

    const respuestaEmpresa =
      manejarErrorEmpresa(
        error
      )

    if (
      respuestaEmpresa
    ) {
      return respuestaEmpresa
    }

    return respuestaError(
      error?.message ||
        'No fue posible eliminar el documento.',
      error?.status ||
        500,
      error?.codigo ||
        'CONFIG_DOCUMENTOS_DELETE_ERROR'
    )
  }
}