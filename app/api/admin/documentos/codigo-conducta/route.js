// app/api/admin/documentos/codigo-conducta/route.js

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

const TIPO_DOCUMENTO =
  'CODIGO_CONDUCTA'

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
    matricula?.categoria ||
    ''
  )
}


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
  }
}


// ============================================================
// MATRÍCULA
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
          nombres,
          apellidos,
          categorias,
          estado,
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
// APRENDIZ
// ============================================================

function construirAprendiz(
  matricula
) {
  const nombres =
    texto(
      matricula?.nombres
    )

  const apellidos =
    texto(
      matricula?.apellidos
    )

  const nombreCompleto =
    [
      nombres,
      apellidos,
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      )

  return {
    nombres,

    apellidos,

    nombre_completo:
      nombreCompleto,

    tipo_doc:
      texto(
        matricula?.tipo_doc
      ),

    documento:
      texto(
        matricula?.documento
      ),
  }
}


// ============================================================
// ENCABEZADO GENERAL
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
    throw error
  }

  return data ||
    null
}


// ============================================================
// CONFIGURACIÓN DEL DOCUMENTO
// ============================================================

async function obtenerConfiguracionDocumento(
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

  return data ||
    null
}


// ============================================================
// SECCIONES DEL CÓDIGO DE CONDUCTA
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
        'configuracion_codigo_conducta_secciones'
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
// LOGO INSTITUCIONAL
// ============================================================

async function obtenerLogo(
  supabase
) {
  const {
    data: configuracion,
    error,
  } =
    await supabase
      .from(
        'configuracion_empresa'
      )
      .select(
        `
          logo_actual_path
        `
      )
      .eq(
        'clave',
        'GENERAL'
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  const path =
    texto(
      configuracion?.logo_actual_path
    )

  if (
    !path
  ) {
    return {
      path: '',
      url: '',
    }
  }

  const {
    data: urlFirmada,
    error: errorUrl,
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
    errorUrl
  ) {
    console.error(
      'No fue posible generar URL del logo:',
      errorUrl
    )

    return {
      path,
      url: '',
    }
  }

  return {
    path,

    url:
      texto(
        urlFirmada?.signedUrl
      ),
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
      searchParams,
    } =
      new URL(
        request.url
      )

    const matriculaId =
      numeroEntero(
        searchParams.get(
          'matricula_id'
        )
      )

    if (
      matriculaId <=
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'La matrícula es obligatoria.',
        },
        {
          status: 400,
        }
      )
    }


    // ========================================================
    // MATRÍCULA
    // ========================================================

    const matricula =
      await obtenerMatricula(
        supabase,
        matriculaId
      )

    if (
      !matricula
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'No se encontró la matrícula solicitada.',
        },
        {
          status: 404,
        }
      )
    }

    const categoria =
      obtenerCategoriaMatricula(
        matricula
      )

    if (
      !categoria
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'La matrícula no tiene una categoría válida.',
        },
        {
          status: 400,
        }
      )
    }


    // ========================================================
    // CONFIGURACIÓN DOCUMENTAL
    // ========================================================

    const [
      encabezado,
      documento,
      secciones,
      logo,
    ] =
      await Promise.all([
        obtenerEncabezado(
          supabase
        ),

        obtenerConfiguracionDocumento(
          supabase
        ),

        obtenerSecciones(
          supabase
        ),

        obtenerLogo(
          supabase
        ),
      ])


    if (
      !encabezado
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'No existe la configuración del encabezado documental.',
        },
        {
          status: 404,
        }
      )
    }


    if (
      !documento
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'No existe la configuración documental del Código de Conducta.',
        },
        {
          status: 404,
        }
      )
    }


    if (
      documento?.activo ===
      false
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'El Código de Conducta se encuentra inactivo en la configuración documental.',
        },
        {
          status: 400,
        }
      )
    }


    if (
      secciones.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'El Código de Conducta no tiene secciones activas configuradas.',
        },
        {
          status: 400,
        }
      )
    }


    // ========================================================
    // RESPUESTA
    // ========================================================

    return NextResponse.json(
      {
        ok: true,

        empresa:
          construirEmpresa(
            empresa
          ),

        documento,

        encabezado,

        logo,

        matricula: {
          id:
            matricula.id,

          consecutivo:
            texto(
              matricula.consecutivo
            ),

          fecha_matricula:
            matricula.fecha_matricula ||
            null,

          categoria,

          categorias:
            Array.isArray(
              matricula.categorias
            )
              ? matricula.categorias
              : [],

          estado:
            texto(
              matricula.estado
            ),
        },

        aprendiz:
          construirAprendiz(
            matricula
          ),

        secciones:
          secciones.map(
            seccion => ({
              id:
                seccion.id,

              titulo:
                texto(
                  seccion.titulo
                ),

              contenido:
                texto(
                  seccion.contenido
                ),

              orden:
                numeroEntero(
                  seccion.orden
                ),
            })
          ),
      },
      {
        status: 200,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'Error GET documentos/codigo-conducta:',
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

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          'No fue posible generar el Código de Conducta.',
      },
      {
        status: 500,
      }
    )
  }
}