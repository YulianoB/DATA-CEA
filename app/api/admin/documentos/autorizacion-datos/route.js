// app/api/admin/documentos/autorizacion-datos/route.js

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

const CLAVE_ENCABEZADO =
  'GENERAL'

const CLAVE_CONFIGURACION =
  'GENERAL'

const TIPO_DOCUMENTO =
  'AUTORIZACION_DATOS_CEA'

const BUCKET_EMPRESA =
  'empresa'

const DURACION_URL_LOGO =
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


function mayusculas(
  valor
) {
  return texto(
    valor
  ).toUpperCase()
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
// FECHA ACTUAL COLOMBIA
// ============================================================

function obtenerFechaActualColombia() {
  const partes =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'America/Bogota',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      }
    )
      .formatToParts(
        new Date()
      )

  const mapa =
    Object.fromEntries(
      partes.map(
        parte => [
          parte.type,
          parte.value,
        ]
      )
    )

  return `${mapa.year}-${mapa.month}-${mapa.day}`
}


// ============================================================
// DETERMINAR SI ES MENOR DE EDAD
// ============================================================

function esMenorDeEdad(
  fechaNacimiento
) {
  const nacimiento =
    texto(
      fechaNacimiento
    ).slice(
      0,
      10
    )

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      nacimiento
    )
  ) {
    return false
  }

  const actual =
    obtenerFechaActualColombia()

  const [
    anioActual,
    mesActual,
    diaActual,
  ] =
    actual
      .split(
        '-'
      )
      .map(
        Number
      )

  const [
    anioNacimiento,
    mesNacimiento,
    diaNacimiento,
  ] =
    nacimiento
      .split(
        '-'
      )
      .map(
        Number
      )

  let edad =
    anioActual -
    anioNacimiento

  const aunNoCumple =
    mesActual <
      mesNacimiento ||
    (
      mesActual ===
        mesNacimiento &&
      diaActual <
        diaNacimiento
    )

  if (
    aunNoCumple
  ) {
    edad -=
      1
  }

  return edad <
    18
}


// ============================================================
// CATEGORÍA DE LA MATRÍCULA
// ============================================================

function obtenerCategoriaMatricula(
  matricula
) {
  const categorias =
    Array.isArray(
      matricula?.categorias
    )
      ? matricula.categorias
      : []

  return mayusculas(
    categorias[0] ||
    ''
  )
}


// ============================================================
// EMPRESA
// ============================================================

function construirEmpresa(
  empresa
) {
  return {
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

    direccion:
      texto(
        empresa?.direccion
      ),

    ciudad:
      texto(
        empresa?.ciudad
      ),

    departamento:
      texto(
        empresa?.departamento
      ),

    telefono:
      texto(
        empresa?.telefono
      ),

    correo:
      texto(
        empresa?.email_principal
      ),
  }
}


// ============================================================
// MATRÍCULA / APRENDIZ
// ============================================================

async function obtenerMatricula(
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
        `
          id,
          consecutivo,
          fecha_matricula,
          tipo_doc,
          documento,
          lugar_expedicion,
          genero,
          nombres,
          apellidos,
          fecha_nacimiento,
          celular,
          correo,
          direccion,
          barrio,
          ciudad,
          categorias,
          estado,
          acudi_nombres,
          acudi_apellidos,
          acudi_tipo_doc,
          acudi_documento,
          acudi_celular,
          acudi_direccion,
          acudi_correo,
          created_at,
          updated_at
        `
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

  return data ||
    null
}


// ============================================================
// CONSTRUIR APRENDIZ
// ============================================================

function construirAprendiz(
  matricula
) {
  const menor =
    esMenorDeEdad(
      matricula
        ?.fecha_nacimiento
    )

  const representanteNombre =
    [
      texto(
        matricula
          ?.acudi_nombres
      ),

      texto(
        matricula
          ?.acudi_apellidos
      ),
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      )
      .trim()

  return {
    id:
      matricula?.id ||
      null,

    consecutivo:
      texto(
        matricula
          ?.consecutivo
      ),

    fecha_matricula:
      texto(
        matricula
          ?.fecha_matricula
      ),

    tipo_documento:
      texto(
        matricula
          ?.tipo_doc
      ),

    documento:
      texto(
        matricula
          ?.documento
      ),

    nombres:
      mayusculas(
        matricula
          ?.nombres
      ),

    apellidos:
      mayusculas(
        matricula
          ?.apellidos
      ),

    nombre_completo:
      [
        mayusculas(
          matricula
            ?.nombres
        ),

        mayusculas(
          matricula
            ?.apellidos
        ),
      ]
        .filter(
          Boolean
        )
        .join(
          ' '
        )
        .trim(),

    fecha_nacimiento:
      texto(
        matricula
          ?.fecha_nacimiento
      ),

    categoria:
      obtenerCategoriaMatricula(
        matricula
      ),

    es_menor_edad:
      menor,

    representante_legal:
      menor
        ? {
            nombre:
              mayusculas(
                representanteNombre
              ),

            tipo_documento:
              mayusculas(
                matricula
                  ?.acudi_tipo_doc
              ),

            documento:
              texto(
                matricula
                  ?.acudi_documento
              ),
          }
        : null,
  }
}


// ============================================================
// ENCABEZADO DOCUMENTAL
// ============================================================

async function obtenerEncabezado(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_encabezado_documentos'
      )
      .select(
        `
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
      )
      .eq(
        'clave',
        CLAVE_ENCABEZADO
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      'No fue posible consultar la configuración del encabezado documental.'
    )
  }

  if (
    !data
  ) {
    const errorConfiguracion =
      new Error(
        'El CEA no tiene configurado el encabezado documental.'
      )

    errorConfiguracion.status =
      409

    throw errorConfiguracion
  }

  return data
}


// ============================================================
// CONFIGURACIÓN DOCUMENTAL
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
        `
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
    !data
  ) {
    const errorDocumento =
      new Error(
        'El CEA no tiene configurado el documento AUTORIZACION_DATOS_CEA.'
      )

    errorDocumento.status =
      409

    throw errorDocumento
  }

  if (
    data.activo !==
    true
  ) {
    const errorInactivo =
      new Error(
        'El documento Autorización para el Tratamiento de Datos Personales se encuentra inactivo.'
      )

    errorInactivo.status =
      409

    throw errorInactivo
  }

  return data
}


// ============================================================
// CONFIGURACIÓN GENERAL
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
        `
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
    !data
  ) {
    const errorConfiguracion =
      new Error(
        'El CEA no tiene configuración GENERAL para la Autorización de Datos Personales.'
      )

    errorConfiguracion.status =
      409

    throw errorConfiguracion
  }

  if (
    data.activo !==
    true
  ) {
    const errorInactivo =
      new Error(
        'La configuración de Autorización de Datos Personales se encuentra inactiva.'
      )

    errorInactivo.status =
      409

    throw errorInactivo
  }

  return data
}


// ============================================================
// SECCIONES ACTIVAS
// ============================================================

async function obtenerSecciones(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_autorizacion_datos_secciones'
      )
      .select(
        `
          id,
          titulo,
          contenido,
          orden,
          activo
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
// FINALIDADES ACTIVAS
// ============================================================

async function obtenerFinalidades(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'configuracion_autorizacion_datos_finalidades'
      )
      .select(
        `
          id,
          codigo,
          descripcion,
          orden,
          activo,
          requiere_respuesta
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
// LOGO INSTITUCIONAL
// ============================================================

async function obtenerLogo(
  supabase
) {
  const {
    data:
      configuracion,

    error,
  } =
    await supabase
      .from(
        'configuracion_empresa'
      )
      .select(
        `
          id,
          clave,
          logo_actual_path
        `
      )
      .eq(
        'clave',
        CLAVE_CONFIGURACION
      )
      .maybeSingle()

  if (
    error
  ) {
    console.error(
      'Error consultando logo institucional:',
      error
    )

    return {
      path:
        '',

      url:
        '',
    }
  }

  const path =
    texto(
      configuracion
        ?.logo_actual_path
    )

  if (
    !path
  ) {
    return {
      path:
        '',

      url:
        '',
    }
  }

  const {
    data:
      firmado,

    error:
      errorFirma,
  } =
    await supabase
      .storage
      .from(
        BUCKET_EMPRESA
      )
      .createSignedUrl(
        path,
        DURACION_URL_LOGO
      )

  if (
    errorFirma
  ) {
    console.error(
      'Error generando URL firmada del logo:',
      errorFirma
    )

    return {
      path,

      url:
        '',
    }
  }

  return {
    path,

    url:
      firmado?.signedUrl ||
      '',
  }
}


// ============================================================
// GET
// DOCUMENTO GENERADO POR MATRÍCULA
// ============================================================

export async function GET(
  request
) {
  try {
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
      matriculaId <=
      0
    ) {
      return respuestaError(
        'Debe indicar una matrícula válida.'
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
      await obtenerMatricula(
        supabase,
        matriculaId
      )

    if (
      !matricula
    ) {
      return respuestaError(
        'La matrícula solicitada no existe.',
        404
      )
    }

    const aprendiz =
      construirAprendiz(
        matricula
      )

    if (
      !aprendiz.categoria
    ) {
      return respuestaError(
        'La matrícula no tiene una categoría válida.',
        409
      )
    }

    const [
      encabezado,
      documento,
      configuracion,
      secciones,
      finalidades,
      logo,
    ] =
      await Promise.all([
        obtenerEncabezado(
          supabase
        ),

        obtenerDocumento(
          supabase
        ),

        obtenerConfiguracionGeneral(
          supabase
        ),

        obtenerSecciones(
          supabase
        ),

        obtenerFinalidades(
          supabase
        ),

        obtenerLogo(
          supabase
        ),
      ])

    if (
      secciones.length ===
      0
    ) {
      return respuestaError(
        'La Autorización de Datos Personales no tiene secciones activas configuradas.',
        409
      )
    }

    return NextResponse.json(
      {
        ok:
          true,

        empresa:
          construirEmpresa(
            empresa
          ),

        aprendiz,

        documento,

        encabezado,

        logo,

        configuracion,

        secciones,

        finalidades,

        impresion: {
          fecha_documento:
            obtenerFechaActualColombia(),

          mostrar_representante_legal:
            aprendiz.es_menor_edad ===
            true,
        },
      },
      {
        status:
          200,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'Error GET documento autorizacion-datos:',
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
      'No fue posible generar la Autorización para el Tratamiento de Datos Personales.',
      500
    )
  }
}