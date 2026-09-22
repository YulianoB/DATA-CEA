// app/api/personal/[id]/licencias/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// ============================================================
// CONSTANTES
// ============================================================

const ROL_INSTRUCTOR_PRACTICA =
  'INSTRUCTOR_PRACTICA'

const TIPO_CONDUCCION =
  'CONDUCCION'

const TIPO_INSTRUCTOR =
  'INSTRUCTOR'

const CATEGORIA_A2 =
  'A2'

const CATEGORIAS_BC = [
  'B1',
  'B1-C1',
  'B2-C2',
  'B3-C3',
]

const CATEGORIAS_VALIDAS = [
  CATEGORIA_A2,
  ...CATEGORIAS_BC,
]

const NIVEL_CATEGORIA = {
  B1: 1,
  'B1-C1': 2,
  'B2-C2': 3,
  'B3-C3': 4,
}

// ============================================================
// HELPERS
// ============================================================

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
}

function normalizarCategoria(valor) {
  const categoria =
    normalizarTexto(valor)
      .replace(/\s+/g, '')

  if (
    categoria === 'A2'
  ) {
    return 'A2'
  }

  if (
    categoria === 'B1'
  ) {
    return 'B1'
  }

  if (
    categoria === 'B1-C1' ||
    categoria === 'B1C1'
  ) {
    return 'B1-C1'
  }

  if (
    categoria === 'B2-C2' ||
    categoria === 'B2C2'
  ) {
    return 'B2-C2'
  }

  if (
    categoria === 'B3-C3' ||
    categoria === 'B3C3'
  ) {
    return 'B3-C3'
  }

  return categoria
}

function normalizarTipoLicencia(valor) {
  const tipo =
    String(valor || '')
      .trim()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toUpperCase()

  if (
    tipo === 'CONDUCCION' ||
    tipo ===
      'LICENCIA DE CONDUCCION'
  ) {
    return TIPO_CONDUCCION
  }

  if (
    tipo === 'INSTRUCTOR' ||
    tipo ===
      'CERTIFICADO DE INSTRUCTOR' ||
    tipo ===
      'CERTIFICADO INSTRUCTOR'
  ) {
    return TIPO_INSTRUCTOR
  }

  return tipo
}

function esCategoriaBC(
  categoria
) {
  return CATEGORIAS_BC.includes(
    normalizarCategoria(
      categoria
    )
  )
}

function hoyBogota() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone:
        'America/Bogota',
    }
  ).format(new Date())
}

function estadoVigencia(
  vigencia
) {
  if (!vigencia) {
    return 'SIN_VIGENCIA'
  }

  return String(
    vigencia
  ) < hoyBogota()
    ? 'VENCIDA'
    : 'VIGENTE'
}

function normalizarRegistro(
  registro
) {
  if (!registro) {
    return null
  }

  const categoria =
    normalizarCategoria(
      registro.categoria
    )

  const tipoLicencia =
    normalizarTipoLicencia(
      registro.tipo_licencia
    )

  return {
    ...registro,

    categoria,

    tipo_licencia:
      tipoLicencia,

    estado_vigencia:
      estadoVigencia(
        registro.vigencia
      ),
  }
}

function validarLicencia(body) {
  const tipo =
    normalizarTipoLicencia(
      body.tipo_licencia
    )

  const categoria =
    normalizarCategoria(
      body.categoria
    )

  if (
    !tipo ||
    !categoria ||
    !body.vigencia
  ) {
    return (
      'Tipo, categoría y vigencia son obligatorios.'
    )
  }

  if (
    ![
      TIPO_CONDUCCION,
      TIPO_INSTRUCTOR,
    ].includes(tipo)
  ) {
    return (
      'El tipo de licencia no es válido.'
    )
  }

  if (
    !CATEGORIAS_VALIDAS.includes(
      categoria
    )
  ) {
    return (
      'La categoría no es válida. ' +
      'Las categorías permitidas son A2, B1, B1-C1, B2-C2 y B3-C3.'
    )
  }

  if (
    tipo ===
      TIPO_INSTRUCTOR &&
    !normalizarTexto(
      body.numero_certificado
    )
  ) {
    return (
      'Para certificado de instructor debe indicar número de certificado.'
    )
  }

  return ''
}

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

// ============================================================
// VALIDAR PERSONAL
// ============================================================

async function obtenerPersonalInstructor(
  supabase,
  id
) {
  const personalId =
    Number(id)

  if (
    !Number.isInteger(
      personalId
    ) ||
    personalId <= 0
  ) {
    return {
      error:
        NextResponse.json(
          {
            status:
              'failed',

            message:
              'El ID del personal no es válido.',
          },
          {
            status: 400,
          }
        ),
    }
  }

  const {
    data: personal,
    error:
      personalError,
  } =
    await supabase
      .from('personal')
      .select(`
        id,
        documento,
        nombres,
        apellidos,
        rol_conductor_instructor
      `)
      .eq(
        'id',
        personalId
      )
      .maybeSingle()

  if (
    personalError
  ) {
    return {
      error:
        NextResponse.json(
          {
            status:
              'failed',

            message:
              personalError.message,
          },
          {
            status: 500,
          }
        ),
    }
  }

  if (!personal) {
    return {
      error:
        NextResponse.json(
          {
            status:
              'failed',

            message:
              'El registro de personal no existe.',
          },
          {
            status: 404,
          }
        ),
    }
  }

  if (
    personal
      .rol_conductor_instructor !==
    true
  ) {
    return {
      error:
        NextResponse.json(
          {
            status:
              'failed',

            message:
              'Las licencias y certificados solo pueden administrarse para personal que cumple rol de instructor.',
          },
          {
            status: 403,
          }
        ),
    }
  }

  return {
    personal,
    error: null,
  }
}

// ============================================================
// OBTENER REGISTROS DEL MISMO TIPO
// ============================================================

async function obtenerRegistrosTipo({
  supabase,
  personalId,
  tipoLicencia,
}) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'licencias_personal'
      )
      .select(`
        id,
        personal_id,
        nombre_completo,
        documento,
        rol,
        categoria,
        tipo_licencia,
        numero_certificado,
        vigencia,
        fecha_actualizacion,
        nombre_quien_actualiza,
        observaciones
      `)
      .eq(
        'personal_id',
        personalId
      )
      .order(
        'fecha_actualizacion',
        {
          ascending:
            false,

          nullsFirst:
            false,
        }
      )
      .order(
        'id',
        {
          ascending:
            false,
        }
      )

  if (error) {
    throw new Error(
      `No fue posible consultar las licencias existentes: ${error.message}`
    )
  }

  return (
    Array.isArray(data)
      ? data
      : []
  )
    .map(
      normalizarRegistro
    )
    .filter(
      (item) =>
        item.tipo_licencia ===
        tipoLicencia
    )
}

// ============================================================
// VALIDAR NUEVO REGISTRO
// ============================================================
//
// Esta función se utiliza cuando se intenta crear
// una licencia completamente nueva.
//
// Si ya existe A2:
// debe actualizarse/renovarse.
//
// Si ya existe una B/C:
// debe actualizarse o recategorizarse.
//
// ============================================================

async function validarNuevaLicencia({
  supabase,
  personalId,
  tipoLicencia,
  categoria,
}) {
  const registros =
    await obtenerRegistrosTipo({
      supabase,
      personalId,
      tipoLicencia,
    })

  if (
    categoria ===
    CATEGORIA_A2
  ) {
    const existente =
      registros.find(
        (registro) =>
          registro.categoria ===
          CATEGORIA_A2
      )

    if (existente) {
      return {
        valido: false,

        licencia:
          existente,

        mensaje:
          `Ya existe ${
            tipoLicencia ===
            TIPO_INSTRUCTOR
              ? 'un Certificado de Instructor'
              : 'una Licencia de Conducción'
          } para la categoría A2. Utilice la opción de actualizar para registrar una nueva vigencia.`,
      }
    }

    return {
      valido: true,
    }
  }

  const existenteBC =
    registros.find(
      (registro) =>
        esCategoriaBC(
          registro.categoria
        )
    )

  if (!existenteBC) {
    return {
      valido: true,
    }
  }

  const categoriaActual =
    normalizarCategoria(
      existenteBC.categoria
    )

  const nivelActual =
    NIVEL_CATEGORIA[
      categoriaActual
    ]

  const nivelNuevo =
    NIVEL_CATEGORIA[
      categoria
    ]

  if (
    nivelNuevo <
    nivelActual
  ) {
    return {
      valido: false,

      licencia:
        existenteBC,

      mensaje:
        `No puede registrar ${categoria} porque ya existe una categoría superior (${categoriaActual}).`,
    }
  }

  if (
    nivelNuevo ===
    nivelActual
  ) {
    return {
      valido: false,

      licencia:
        existenteBC,

      mensaje:
        `Ya existe la categoría ${categoriaActual}. Utilice la opción de actualizar para registrar una nueva vigencia.`,
    }
  }

  return {
    valido: false,

    licencia:
      existenteBC,

    requiere_recategorizacion:
      true,

    mensaje:
      `Actualmente existe la categoría ${categoriaActual}. Para recategorizar a ${categoria}, debe modificar el registro existente.`,
  }
}

// ============================================================
// GET
// ============================================================
//
// IMPORTANTE:
//
// Este GET devuelve TODO el historial.
//
// La Hoja de Vida administrativa debe poder mostrar:
//
// - registros anteriores
// - renovaciones
// - recategorizaciones
//
// ============================================================

export async function GET(
  request,
  { params }
) {
  try {
    const { id } =
      await params

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request
      )

    const validacion =
      await obtenerPersonalInstructor(
        supabase,
        id
      )

    if (
      validacion.error
    ) {
      return validacion.error
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'licencias_personal'
        )
        .select(`
          id,
          personal_id,
          nombre_completo,
          documento,
          rol,
          categoria,
          tipo_licencia,
          numero_certificado,
          vigencia,
          fecha_actualizacion,
          nombre_quien_actualiza,
          observaciones
        `)
        .eq(
          'personal_id',
          Number(id)
        )
        .order(
          'fecha_actualizacion',
          {
            ascending:
              false,

            nullsFirst:
              false,
          }
        )
        .order(
          'id',
          {
            ascending:
              false,
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
          status: 500,
        }
      )
    }

    const licencias =
      (
        Array.isArray(data)
          ? data
          : []
      )
        .map(
          normalizarRegistro
        )
        .filter(
          (item) =>
            [
              TIPO_CONDUCCION,
              TIPO_INSTRUCTOR,
            ].includes(
              item.tipo_licencia
            )
        )

    return NextResponse.json({
      status:
        'success',

      licencias,
    })
  } catch (error) {
    console.error(
      'Error GET /api/personal/[id]/licencias:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// ============================================================
// POST
// ============================================================
//
// Crea el PRIMER registro funcional.
//
// Si ya existe un documento del mismo grupo:
//
// - A2 existente -> bloquear
// - B/C existente -> bloquear
//
// Luego debe utilizarse PATCH para renovar
// o recategorizar.
//
// ============================================================

export async function POST(
  request,
  { params }
) {
  try {
    const { id } =
      await params

    const body =
      await request.json()

    const mensajeValidacion =
      validarLicencia(
        body
      )

    if (
      mensajeValidacion
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            mensajeValidacion,
        },
        {
          status: 400,
        }
      )
    }

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request,
        body
      )

    const validacionPersonal =
      await obtenerPersonalInstructor(
        supabase,
        id
      )

    if (
      validacionPersonal.error
    ) {
      return validacionPersonal.error
    }

    const personal =
      validacionPersonal.personal

    const categoria =
      normalizarCategoria(
        body.categoria
      )

    const tipoLicencia =
      normalizarTipoLicencia(
        body.tipo_licencia
      )

    // ========================================================
    // VALIDAR GRUPO EXISTENTE
    // ========================================================

    const validacionNueva =
      await validarNuevaLicencia({
        supabase,

        personalId:
          personal.id,

        tipoLicencia,

        categoria,
      })

    if (
      !validacionNueva.valido
    ) {
      return NextResponse.json(
        {
          status:
            'warning',

          message:
            validacionNueva.mensaje,

          requiere_recategorizacion:
            Boolean(
              validacionNueva
                .requiere_recategorizacion
            ),

          licencia:
            validacionNueva
              .licencia ||
            null,
        },
        {
          status: 409,
        }
      )
    }

    // ========================================================
    // PAYLOAD
    // ========================================================

    const nombreCompleto =
      `${personal.nombres || ''} ${
        personal.apellidos || ''
      }`
        .replace(
          /\s+/g,
          ' '
        )
        .trim()

    const payload = {
      personal_id:
        personal.id,

      nombre_completo:
        nombreCompleto,

      documento:
        personal.documento,

      rol:
        ROL_INSTRUCTOR_PRACTICA,

      categoria,

      tipo_licencia:
        tipoLicencia,

      numero_certificado:
        tipoLicencia ===
        TIPO_INSTRUCTOR
          ? normalizarTexto(
              body.numero_certificado
            )
          : null,

      vigencia:
        body.vigencia,

      fecha_actualizacion:
        hoyBogota(),

      nombre_quien_actualiza:
        body.actualizado_por ||
        'ADMINISTRATIVO',

      observaciones:
        null,
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'licencias_personal'
        )
        .insert(
          payload
        )
        .select()
        .single()

    if (error) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            error.message,
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json(
      {
        status:
          'success',

        message:
          tipoLicencia ===
          TIPO_INSTRUCTOR
            ? 'Certificado de instructor registrado correctamente.'
            : 'Licencia de conducción registrada correctamente.',

        operacion:
          'creacion',

        licencia:
          normalizarRegistro(
            data
          ),
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      'Error POST /api/personal/[id]/licencias:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// ============================================================
// PATCH
// ============================================================
//
// IMPORTANTE:
//
// PATCH YA NO HACE UPDATE.
//
// PATCH significa:
//
// "crear una nueva versión histórica
// del documento seleccionado".
//
// La fila anterior queda intacta.
//
// ============================================================

export async function PATCH(
  request,
  { params }
) {
  try {
    const { id } =
      await params

    const body =
      await request.json()

    if (!body.id) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'No se recibió el ID de la licencia.',
        },
        {
          status: 400,
        }
      )
    }

    const mensajeValidacion =
      validarLicencia(
        body
      )

    if (
      mensajeValidacion
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            mensajeValidacion,
        },
        {
          status: 400,
        }
      )
    }

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request,
        body
      )

    const validacionPersonal =
      await obtenerPersonalInstructor(
        supabase,
        id
      )

    if (
      validacionPersonal.error
    ) {
      return validacionPersonal.error
    }

    const personal =
      validacionPersonal.personal

    // ========================================================
    // OBTENER REGISTRO HISTÓRICO ANTERIOR
    // ========================================================

    const {
      data:
        licenciaAnterior,
      error:
        licenciaAnteriorError,
    } =
      await supabase
        .from(
          'licencias_personal'
        )
        .select(`
          id,
          personal_id,
          categoria,
          tipo_licencia,
          vigencia,
          numero_certificado
        `)
        .eq(
          'id',
          body.id
        )
        .eq(
          'personal_id',
          personal.id
        )
        .maybeSingle()

    if (
      licenciaAnteriorError
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            licenciaAnteriorError
              .message,
        },
        {
          status: 500,
        }
      )
    }

    if (
      !licenciaAnterior
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La licencia indicada no existe o no pertenece a este instructor.',
        },
        {
          status: 404,
        }
      )
    }

    const tipoAnterior =
      normalizarTipoLicencia(
        licenciaAnterior
          .tipo_licencia
      )

    const tipoNuevo =
      normalizarTipoLicencia(
        body.tipo_licencia
      )

    if (
      tipoAnterior !==
      tipoNuevo
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El tipo de licencia no puede cambiar durante una renovación.',
        },
        {
          status: 400,
        }
      )
    }

    const categoriaAnterior =
      normalizarCategoria(
        licenciaAnterior
          .categoria
      )

    const categoriaNueva =
      normalizarCategoria(
        body.categoria
      )

    // ========================================================
    // A2 Y B/C SON GRUPOS INDEPENDIENTES
    // ========================================================

    if (
      categoriaAnterior ===
        CATEGORIA_A2 &&
      categoriaNueva !==
        CATEGORIA_A2
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La categoría A2 es independiente y no puede convertirse en una categoría B/C.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      esCategoriaBC(
        categoriaAnterior
      ) &&
      categoriaNueva ===
        CATEGORIA_A2
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'Una categoría B/C no puede convertirse en A2.',
        },
        {
          status: 400,
        }
      )
    }

    // ========================================================
    // NO PERMITIR BAJAR DE CATEGORÍA
    // ========================================================

    if (
      esCategoriaBC(
        categoriaAnterior
      ) &&
      esCategoriaBC(
        categoriaNueva
      )
    ) {
      const nivelAnterior =
        NIVEL_CATEGORIA[
          categoriaAnterior
        ]

      const nivelNuevo =
        NIVEL_CATEGORIA[
          categoriaNueva
        ]

      if (
        nivelNuevo <
        nivelAnterior
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              `No puede cambiar de ${categoriaAnterior} a ${categoriaNueva} porque corresponde a una categoría inferior.`,
          },
          {
            status: 409,
          }
        )
      }
    }

    // ========================================================
    // CREAR NUEVO REGISTRO HISTÓRICO
    // ========================================================

    const nombreCompleto =
      `${personal.nombres || ''} ${
        personal.apellidos || ''
      }`
        .replace(
          /\s+/g,
          ' '
        )
        .trim()

    const payload = {
      personal_id:
        personal.id,

      nombre_completo:
        nombreCompleto,

      documento:
        personal.documento,

      rol:
        ROL_INSTRUCTOR_PRACTICA,

      categoria:
        categoriaNueva,

      tipo_licencia:
        tipoNuevo,

      numero_certificado:
        tipoNuevo ===
        TIPO_INSTRUCTOR
          ? normalizarTexto(
              body.numero_certificado
            )
          : null,

      vigencia:
        body.vigencia,

      fecha_actualizacion:
        hoyBogota(),

      nombre_quien_actualiza:
        body.actualizado_por ||
        'ADMINISTRATIVO',

      observaciones:
        null,
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'licencias_personal'
        )
        .insert(
          payload
        )
        .select()
        .single()

    if (error) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            error.message,
        },
        {
          status: 500,
        }
      )
    }

    const recategorizacion =
      categoriaAnterior !==
      categoriaNueva

    return NextResponse.json(
      {
        status:
          'success',

        message:
          recategorizacion
            ? `Documento recategorizado de ${categoriaAnterior} a ${categoriaNueva}. El registro anterior se conserva en el historial.`
            : 'Documento renovado correctamente. El registro anterior se conserva en el historial.',

        operacion:
          recategorizacion
            ? 'recategorizacion'
            : 'renovacion',

        licencia_anterior_id:
          licenciaAnterior.id,

        licencia:
          normalizarRegistro(
            data
          ),
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      'Error PATCH /api/personal/[id]/licencias:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// ============================================================
// DELETE
// ============================================================
//
// Se conserva por ahora para administración.
//
// Al eliminar una fila histórica, solo elimina
// ese registro puntual.
//
// ============================================================

export async function DELETE(
  request,
  { params }
) {
  try {
    const { id } =
      await params

    const {
      searchParams,
    } =
      new URL(
        request.url
      )

    const licenciaId =
      searchParams.get(
        'licencia_id'
      )

    if (!licenciaId) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'No se recibió el ID de la licencia.',
        },
        {
          status: 400,
        }
      )
    }

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request
      )

    const validacionPersonal =
      await obtenerPersonalInstructor(
        supabase,
        id
      )

    if (
      validacionPersonal.error
    ) {
      return validacionPersonal.error
    }

    const personal =
      validacionPersonal.personal

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'licencias_personal'
        )
        .delete()
        .eq(
          'id',
          licenciaId
        )
        .eq(
          'personal_id',
          personal.id
        )
        .select('id')
        .maybeSingle()

    if (error) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            error.message,
        },
        {
          status: 500,
        }
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La licencia no existe o no pertenece a este instructor.',
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json({
      status:
        'success',

      message:
        'Registro histórico eliminado correctamente.',
    })
  } catch (error) {
    console.error(
      'Error DELETE /api/personal/[id]/licencias:',
      error
    )

    return respuestaError(
      error
    )
  }
}