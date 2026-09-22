// app/api/admin/documentos/contrato/route.js

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

const CLAVE_CONTRATO =
  'GENERAL'

const TIPO_DOCUMENTO =
  'CONTRATO'

const BUCKET_EMPRESA =
  'empresa'

const DURACION_URL_LOGO =
  60 * 60

const DURACION_URL_FOTO =
  60 * 60


// ============================================================
// HELPERS GENERALES
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

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return 0
  }

  return Math.trunc(
    numero
  )
}


function numeroDecimal(
  valor
) {
  const numero =
    Number(
      valor
    )

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return 0
  }

  return numero
}


function normalizarFecha(
  valor
) {
  if (
    !valor
  ) {
    return ''
  }

  return String(
    valor
  ).slice(
    0,
    10
  )
}


function formatearFechaDocumento(
  valor
) {
  const fecha =
    normalizarFecha(
      valor
    )

  if (
    !fecha
  ) {
    return ''
  }

  const [
    year,
    month,
    day,
  ] =
    fecha.split(
      '-'
    )

  if (
    !year ||
    !month ||
    !day
  ) {
    return fecha
  }

  return `${day}/${month}/${year}`
}


function construirNombreCompleto(
  nombres,
  apellidos
) {
  return [
    texto(
      nombres
    ),
    texto(
      apellidos
    ),
  ]
    .filter(
      Boolean
    )
    .join(
      ' '
    )
    .trim()
}


function obtenerCategoriaMatricula(
  matricula
) {
  if (
    !Array.isArray(
      matricula?.categorias
    )
  ) {
    return ''
  }

  return mayusculas(
    matricula.categorias[0]
  )
}


// ============================================================
// EDAD A LA FECHA DE MATRÍCULA
// ============================================================

function calcularEdadEnFecha(
  fechaNacimiento,
  fechaReferencia
) {
  const nacimiento =
    normalizarFecha(
      fechaNacimiento
    )

  const referencia =
    normalizarFecha(
      fechaReferencia
    )

  if (
    !nacimiento ||
    !referencia
  ) {
    return null
  }

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

  const [
    anioReferencia,
    mesReferencia,
    diaReferencia,
  ] =
    referencia
      .split(
        '-'
      )
      .map(
        Number
      )

  if (
    !anioNacimiento ||
    !mesNacimiento ||
    !diaNacimiento ||
    !anioReferencia ||
    !mesReferencia ||
    !diaReferencia
  ) {
    return null
  }

  let edad =
    anioReferencia -
    anioNacimiento

  const aunNoCumplio =
    mesReferencia <
      mesNacimiento ||
    (
      mesReferencia ===
        mesNacimiento &&
      diaReferencia <
        diaNacimiento
    )

  if (
    aunNoCumplio
  ) {
    edad -=
      1
  }

  return edad
}


// ============================================================
// REEMPLAZAR VARIABLES
// ============================================================

function reemplazarVariables(
  contenido,
  variables
) {
  let resultado =
    texto(
      contenido
    )

  for (
    const [
      clave,
      valor,
    ] of Object.entries(
      variables
    )
  ) {
    resultado =
      resultado
        .split(
          `{{${clave}}}`
        )
        .join(
          texto(
            valor
          )
        )
  }

  return resultado
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
      .select(`
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
        estado_civil,
        ocupacion,
        eps,
        estrato,
        nivel_educativo,
        convenio,
        convenio_id,
        categorias,
        estado,
        acudi_nombres,
        acudi_apellidos,
        acudi_tipo_doc,
        acudi_documento,
        acudi_celular,
        acudi_direccion,
        acudi_correo,
        emergencia_nombre,
        emergencia_celular,
        origen_matricula,
        created_at,
        updated_at
      `)
      .eq(
        'id',
        matriculaId
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar la matrícula: ${error.message}`
    )
  }

  if (
    !data
  ) {
    throw new Error(
      'La matrícula indicada no existe.'
    )
  }

  return data
}


// ============================================================
// APRENDIZ
// ============================================================

function construirAprendiz(
  matricula
) {
  return {
    id:
      matricula.id,

    tipo_documento:
      texto(
        matricula.tipo_doc
      ),

    documento:
      texto(
        matricula.documento
      ),

    lugar_expedicion:
      texto(
        matricula.lugar_expedicion
      ),

    nombres:
      texto(
        matricula.nombres
      ),

    apellidos:
      texto(
        matricula.apellidos
      ),

    nombre_completo:
      construirNombreCompleto(
        matricula.nombres,
        matricula.apellidos
      ),

    fecha_nacimiento:
      normalizarFecha(
        matricula.fecha_nacimiento
      ),

    genero:
      texto(
        matricula.genero
      ),

    celular:
      texto(
        matricula.celular
      ),

    correo:
      texto(
        matricula.correo
      ),

    direccion:
      texto(
        matricula.direccion
      ),

    barrio:
      texto(
        matricula.barrio
      ),

    ciudad:
      texto(
        matricula.ciudad
      ),

    estado_civil:
      texto(
        matricula.estado_civil
      ),

    ocupacion:
      texto(
        matricula.ocupacion
      ),

    eps:
      texto(
        matricula.eps
      ),

    estrato:
      matricula.estrato ?? '',

    nivel_educativo:
      texto(
        matricula.nivel_educativo
      ),
  }
}


// ============================================================
// ACUDIENTE
// ============================================================

function construirAcudiente(
  matricula
) {
  return {
    nombres:
      texto(
        matricula.acudi_nombres
      ),

    apellidos:
      texto(
        matricula.acudi_apellidos
      ),

    nombre_completo:
      construirNombreCompleto(
        matricula.acudi_nombres,
        matricula.acudi_apellidos
      ),

    tipo_documento:
      texto(
        matricula.acudi_tipo_doc
      ),

    documento:
      texto(
        matricula.acudi_documento
      ),

    celular:
      texto(
        matricula.acudi_celular
      ),

    direccion:
      texto(
        matricula.acudi_direccion
      ),

    correo:
      texto(
        matricula.acudi_correo
      ),

    /*
     * La tabla aprendices todavía no tiene un campo que indique
     * PADRE, MADRE o REPRESENTANTE LEGAL.
     *
     * Mientras ese dato no exista, el contrato utilizará
     * la denominación general ACUDIENTE.
     */
    calidad:
      'ACUDIENTE',
  }
}


// ============================================================
// PLAN ACTIVO
// ============================================================

async function obtenerPlanActivo(
  supabase,
  categoria
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'planes_formacion'
      )
      .select(
        '*'
      )
      .eq(
        'categoria',
        categoria
      )
      .eq(
        'estado',
        'ACTIVO'
      )
      .order(
        'id',
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
    error
  ) {
    throw new Error(
      `No fue posible consultar el plan de formación: ${error.message}`
    )
  }

  return data ||
    null
}


// ============================================================
// REQUISITOS DE LA CATEGORÍA
// ============================================================

async function obtenerRequisitosCategoria(
  supabase,
  categoria
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'runt_requisitos_categoria'
      )
      .select(
        '*'
      )
      .eq(
        'categoria',
        categoria
      )
      .eq(
        'activo',
        true
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los requisitos de la categoría: ${error.message}`
    )
  }

  if (
    !data
  ) {
    throw new Error(
      `No existe configuración activa de requisitos para la categoría ${categoria}.`
    )
  }

    return {
    ...data,

    horas_teoria:
      numeroDecimal(
        data.clases_teoria
      ),

    horas_taller:
      numeroDecimal(
        data.clases_taller
      ),

    clases_practica:
      numeroEntero(
        data.clases_practica
      ),
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
        '*'
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
      `No fue posible consultar el encabezado documental: ${error.message}`
    )
  }

  return data ||
    null
}


// ============================================================
// CONFIGURACIÓN DOCUMENTAL
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
        '*'
      )
      .eq(
        'tipo_documento',
        TIPO_DOCUMENTO
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar la configuración documental del contrato: ${error.message}`
    )
  }

  return data ||
    null
}


// ============================================================
// CONFIGURACIÓN DEL CONTRATO
// ============================================================

async function obtenerConfiguracionContrato(
  supabase
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
        '*'
      )
      .eq(
        'clave',
        CLAVE_CONTRATO
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar la configuración del contrato: ${error.message}`
    )
  }

  if (
    !data
  ) {
    throw new Error(
      'El CEA no tiene configurado el contrato.'
    )
  }

  return data
}


// ============================================================
// CLÁUSULAS
// ============================================================

async function obtenerClausulasContrato(
  supabase
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
        '*'
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
    throw new Error(
      `No fue posible consultar las cláusulas del contrato: ${error.message}`
    )
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
        'logo_actual_path'
      )
      .eq(
        'clave',
        'GENERAL'
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el logo institucional: ${error.message}`
    )
  }

  const path =
    texto(
      configuracion?.logo_actual_path
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
    data,
    error: signedError,
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
    signedError
  ) {
    console.error(
      'Error creando URL firmada del logo:',
      signedError
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
      data?.signedUrl ||
      '',
  }
}


// ============================================================
// FOTO DE LA MATRÍCULA
// ============================================================

function rutaFotoMatricula(
  matriculaId
) {
  return `matriculas/foto-aprendiz-${matriculaId}.jpg`
}


async function obtenerFotoMatricula(
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
    error,
  } =
    await supabase.storage
      .from(
        BUCKET_EMPRESA
      )
      .list(
        'matriculas',
        {
          limit:
            1000,

          search:
            nombreArchivo,
        }
      )

  if (
    error
  ) {
    console.error(
      'Error consultando fotografía del contrato:',
      error
    )

    return {
      path:
        '',
      url:
        '',
    }
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
    return {
      path:
        '',
      url:
        '',
    }
  }

  const {
    data,
    error: signedError,
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
    signedError
  ) {
    console.error(
      'Error creando URL firmada de la fotografía del contrato:',
      signedError
    )

    return {
      path:
        '',
      url:
        '',
    }
  }

  return {
    path,

    url:
      data?.signedUrl ||
      '',
  }
}

// ============================================================
// EMPRESA
// ============================================================

function construirEmpresa(
  empresaOrigen
) {
  return {
    nit:
      texto(
        empresaOrigen?.nit
      ),

    nombre:
      texto(
        empresaOrigen?.nombre
      ) ||
      texto(
        empresaOrigen?.nombre_empresa
      ) ||
      texto(
        empresaOrigen?.razon_social
      ),

    representante_legal:
      texto(
        empresaOrigen?.representante_legal
      ),

    documento_representante:
      texto(
        empresaOrigen?.documento_representante
      ),

    nivel_cea:
      texto(
        empresaOrigen?.nivel_cea
      ),
  }
}


// ============================================================
// COMPARECIENTE
// ============================================================

function construirComparecienteAspirante({
  aprendiz,
  acudiente,
  esMenorEdad,
}) {
  if (
    !esMenorEdad
  ) {
    return `${aprendiz.nombre_completo}, identificado(a) con documento de identidad No. ${aprendiz.documento}, quien actúa en nombre propio y para efectos del presente contrato se denominará EL ASPIRANTE, cuyos datos se encuentran registrados en el presente documento`
  }

  return `${acudiente.nombre_completo}, identificado(a) con documento de identidad No. ${acudiente.documento}, quien actúa en calidad de ${acudiente.calidad} del menor ${aprendiz.nombre_completo}, identificado(a) con documento de identidad No. ${aprendiz.documento}, quien para efectos del presente contrato se denominará EL ASPIRANTE, cuyos datos se encuentran registrados en el presente documento`
}


// ============================================================
// VARIABLES
// ============================================================

function construirVariables({
  empresa,
  matricula,
  aprendiz,
  acudiente,
  categoria,
  requisitos,
  comparecienteAspirante,
}) {
  return {
    CEA_NOMBRE:
      empresa.nombre,

    CEA_NIT:
      empresa.nit,

    REPRESENTANTE_LEGAL:
      empresa.representante_legal,

    DOCUMENTO_REPRESENTANTE:
      empresa.documento_representante,

    APRENDIZ_NOMBRE:
      aprendiz.nombre_completo,

    APRENDIZ_DOCUMENTO:
      aprendiz.documento,

    LUGAR_EXPEDICION:
      aprendiz.lugar_expedicion,

    FECHA_NACIMIENTO:
      formatearFechaDocumento(
        aprendiz.fecha_nacimiento
      ),

    CATEGORIA:
      categoria,

    CONSECUTIVO:
      texto(
        matricula.consecutivo
      ),

    FECHA_MATRICULA:
      formatearFechaDocumento(
        matricula.fecha_matricula
      ),

    HORAS_TEORIA:
      requisitos.horas_teoria,

    HORAS_TALLER:
      requisitos.horas_taller,

    CLASES_PRACTICA:
      requisitos.clases_practica,

    ACUDIENTE_NOMBRE:
      acudiente.nombre_completo,

    ACUDIENTE_DOCUMENTO:
      acudiente.documento,

    ACUDIENTE_CALIDAD:
      acudiente.calidad,

    ACUDIENTE_CELULAR:
      acudiente.celular,

    COMPARECIENTE_ASPIRANTE:
      comparecienteAspirante,
  }
}


// ============================================================
// GET
// ============================================================

export async function GET(
  request
) {
  try {
    // ========================================================
    // MULTIEMPRESA
    // ========================================================

    const {
      supabaseAdmin,
      empresa: empresaOrigen,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const supabase =
      supabaseAdmin

    // ========================================================
    // MATRÍCULA SOLICITADA
    // ========================================================

    const {
      searchParams,
    } =
      new URL(
        request.url
      )

    const matriculaId =
      texto(
        searchParams.get(
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
            'Debe indicar la matrícula que se desea consultar.',
        },
        {
          status:
            400,
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

    const categoria =
      obtenerCategoriaMatricula(
        matricula
      )

    if (
      !categoria
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'La matrícula no tiene una categoría válida.',
        },
        {
          status:
            400,
        }
      )
    }

    // ========================================================
    // APRENDIZ / ACUDIENTE
    // ========================================================

    const aprendiz =
      construirAprendiz(
        matricula
      )

    const acudiente =
      construirAcudiente(
        matricula
      )

    const edad =
      calcularEdadEnFecha(
        aprendiz.fecha_nacimiento,
        matricula.fecha_matricula
      )

    const esMenorEdad =
      edad !==
        null &&
      edad <
        18

    if (
      edad ===
        null
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'La matrícula no tiene una fecha de nacimiento válida para determinar la edad del aspirante.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      esMenorEdad &&
      (
        !acudiente.nombre_completo ||
        !acudiente.documento
      )
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'La matrícula corresponde a un menor de edad y no tiene completos los nombres o documento del acudiente.',
        },
        {
          status:
            400,
        }
      )
    }

    // ========================================================
    // INFORMACIÓN DOCUMENTAL
    // ========================================================

    const [
      plan,
      requisitos,
      encabezado,
      documento,
      configuracionContrato,
      clausulas,
      logo,
      foto,
    ] =
      await Promise.all([
        obtenerPlanActivo(
          supabase,
          categoria
        ),

        obtenerRequisitosCategoria(
          supabase,
          categoria
        ),

        obtenerEncabezado(
          supabase
        ),

        obtenerConfiguracionDocumento(
          supabase
        ),

        obtenerConfiguracionContrato(
          supabase
        ),

        obtenerClausulasContrato(
          supabase
        ),

        obtenerLogo(
          supabase
        ),

        obtenerFotoMatricula(
          supabase,
          matriculaId
        ),
      ])

    // ========================================================
    // EMPRESA MASTER
    // ========================================================

    const empresa =
      construirEmpresa(
        empresaOrigen
      )

    if (
      !empresa.nombre ||
      !empresa.nit
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'No fue posible obtener los datos completos del CEA.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      !empresa.representante_legal ||
      !empresa.documento_representante
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'El CEA no tiene completos en la base MASTER los datos del representante legal.',
        },
        {
          status:
            400,
        }
      )
    }

    // ========================================================
    // COMPARECIENTE DINÁMICO
    // ========================================================

    const comparecienteAspirante =
      construirComparecienteAspirante({
        aprendiz,
        acudiente,
        esMenorEdad,
      })

    // ========================================================
    // VARIABLES
    // ========================================================

    const variables =
      construirVariables({
        empresa,
        matricula,
        aprendiz,
        acudiente,
        categoria,
        requisitos,
        comparecienteAspirante,
      })

    // ========================================================
    // TEXTO INICIAL
    // ========================================================

    const textoIntroductorio =
      reemplazarVariables(
        configuracionContrato
          .texto_introductorio,
        variables
      )

    // ========================================================
    // CLÁUSULAS
    // ========================================================

    const clausulasResueltas =
      clausulas.map(
        clausula => ({
          ...clausula,

          titulo:
            reemplazarVariables(
              clausula.titulo,
              variables
            ),

          contenido:
            reemplazarVariables(
              clausula.contenido,
              variables
            ),
        })
      )

    // ========================================================
    // TEXTO FINAL
    // ========================================================

    const textoFinal =
      reemplazarVariables(
        configuracionContrato
          .texto_final,
        variables
      )

    // ========================================================
    // RESPUESTA
    // ========================================================

    return NextResponse.json(
      {
        ok:
          true,

        empresa,

        documento,

        encabezado,

        logo,

        foto,

        matricula: {
          id:
            matricula.id,

          consecutivo:
            matricula.consecutivo,

          fecha_matricula:
            matricula.fecha_matricula,

          categoria,

          categorias:
            matricula.categorias,

          estado:
            matricula.estado,

          origen_matricula:
            matricula.origen_matricula,

          convenio:
            matricula.convenio,

          convenio_id:
            matricula.convenio_id,
        },

        aprendiz,

        acudiente,

        edad,

        es_menor_edad:
          esMenorEdad,

        plan,

        requisitos,

        contrato: {
          configuracion:
            configuracionContrato,

          texto_introductorio:
            textoIntroductorio,

          clausulas:
            clausulasResueltas,

          texto_final:
            textoFinal,
        },

        variables,
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
      'Error GET contrato:',
      error
    )

    if (
      error?.status ||
      error?.code
    ) {
      const respuestaEmpresa =
        respuestaErrorEmpresa(
          error
        )

      return NextResponse.json(
        respuestaEmpresa.body,
        {
          status:
            respuestaEmpresa.status,
        }
      )
    }

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error?.message ||
          'No fue posible generar la información del contrato.',
      },
      {
        status:
          500,
      }
    )
  }
}