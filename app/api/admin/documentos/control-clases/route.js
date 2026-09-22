// app/api/admin/documentos/control-clases/route.js

import {
  NextResponse,
} from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
} from '@/lib/supabaseEmpresaServer'


// ============================================================
// CONSTANTES
// ============================================================

const CLAVE_ENCABEZADO =
  'GENERAL'

const TIPO_DOCUMENTO =
  'CONTROL_CLASES'

const BUCKET_EMPRESA =
  'empresa'

const DURACION_URL_LOGO =
  60 * 60


// ============================================================
// UTILIDADES
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
    !Number.isInteger(
      numero
    ) ||
    numero <= 0
  ) {
    return null
  }

  return numero
}


function obtenerCategoriaMatricula(
  matricula
) {
  if (
    Array.isArray(
      matricula?.categorias
    ) &&
    matricula.categorias.length >
      0
  ) {
    return mayusculas(
      matricula
        .categorias[0]
    )
  }

  return mayusculas(
    matricula?.categoria
  )
}


function consecutivoRecibo(
  id
) {
  const numero =
    Number(
      id
    )

  if (
    !Number.isInteger(
      numero
    ) ||
    numero <= 0
  ) {
    return ''
  }

  return `RC-${String(
    numero
  ).padStart(
    6,
    '0'
  )}`
}

// ============================================================
// EMPRESA
// ============================================================

function construirEmpresa(
  empresa
) {
  return {
    nit:
      empresa?.nit ||
      '',

    nombre:
      empresa?.nombre ||
      empresa?.nombre_empresa ||
      empresa?.razon_social ||
      '',

    nivel_cea:
      empresa?.nivel_cea ||
      '',
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
      .select('*')
      .eq(
        'id',
        matriculaId
      )
      .maybeSingle()

  if (
    error
  ) {
    console.error(
      'Error consultando matrícula para Control de Clases:',
      error
    )

    throw new Error(
      'No fue posible consultar la matrícula.'
    )
  }

  if (
    !data
  ) {
    const errorMatricula =
      new Error(
        'La matrícula indicada no existe.'
      )

    errorMatricula.status =
      404

    throw errorMatricula
  }

  return data
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
      .select(`
        id,
        categoria,
        nombre,
        version,
        fecha_vigencia_desde,
        fecha_vigencia_hasta,
        estado,
        observaciones,
        created_at,
        updated_at
      `)
      .eq(
        'categoria',
        categoria
      )
      .eq(
        'estado',
        'ACTIVO'
      )
      .order(
        'version',
        {
          ascending:
            false,
        }
      )
      .limit(
        1
      )

  if (
    error
  ) {
    console.error(
      'Error consultando plan activo:',
      error
    )

    throw new Error(
      `No fue posible consultar el plan de formación de la categoría ${categoria}.`
    )
  }

  const plan =
    Array.isArray(
      data
    ) &&
    data.length >
      0
      ? data[0]
      : null

  if (
    !plan
  ) {
    const errorPlan =
      new Error(
        `No existe un plan de formación ACTIVO para la categoría ${categoria}.`
      )

    errorPlan.status =
      409

    throw errorPlan
  }

  return plan
}


// ============================================================
// MÓDULOS
// ============================================================

async function obtenerModulos(
  supabase,
  planId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'modulos_formacion'
      )
      .select(`
        id,
        plan_formacion_id,
        codigo,
        nombre,
        tipo_formacion,
        orden,
        activo,
        observaciones,
        created_at,
        updated_at
      `)
      .eq(
        'plan_formacion_id',
        planId
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
    console.error(
      'Error consultando módulos:',
      error
    )

    throw new Error(
      'No fue posible consultar los módulos del plan de formación.'
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


// ============================================================
// CLASES
// ============================================================

async function obtenerClases(
  supabase,
  planId,
  categoria
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'clases_formacion'
      )
      .select(`
        id,
        plan_formacion_id,
        modulo_id,
        categoria,
        tipo_formacion,
        numero_clase,
        codigo,
        nombre,
        contenido,
        contenido_tarjeta,
        orden,
        activo,
        observaciones,
        duracion_horas,
        created_at,
        updated_at
      `)
      .eq(
        'plan_formacion_id',
        planId
      )
      .eq(
        'categoria',
        categoria
      )
      .eq(
        'activo',
        true
      )
      .order(
        'modulo_id',
        {
          ascending:
            true,
        }
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
    console.error(
      'Error consultando clases:',
      error
    )

    throw new Error(
      'No fue posible consultar las clases del plan de formación.'
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


// ============================================================
// ORGANIZAR MÓDULOS PARA IMPRESIÓN
// ============================================================

function construirModulosImpresion(
  modulos,
  clases
) {
  return (
    Array.isArray(
      modulos
    )
      ? modulos
      : []
  )
    .map(
      modulo => {
        const clasesModulo =
          (
            Array.isArray(
              clases
            )
              ? clases
              : []
          )
            .filter(
              clase =>
                Number(
                  clase.modulo_id
                ) ===
                Number(
                  modulo.id
                )
            )
            .sort(
              (
                a,
                b
              ) =>
                (
                  Number(
                    a.orden
                  ) ||
                  Number(
                    a.numero_clase
                  ) ||
                  0
                ) -
                (
                  Number(
                    b.orden
                  ) ||
                  Number(
                    b.numero_clase
                  ) ||
                  0
                )
            )
            .map(
              clase => ({
                id:
                  clase.id,

                numero_clase:
                  clase.numero_clase,

                codigo:
                  clase.codigo ||
                  '',

                nombre:
                  clase.nombre ||
                  '',

                contenido:
                  clase.contenido ||
                  '',

                contenido_tarjeta:
                  clase.contenido_tarjeta ||
                  '',

                // =================================================
                // TEXTO PARA EL DOCUMENTO
                // =================================================
                //
                // Primero se usa contenido_tarjeta.
                //
                // Si aún no fue configurado, se usa nombre como
                // respaldo para no dejar la tarjeta vacía.
                //
                // =================================================

                texto_impresion:
                  texto(
                    clase
                      .contenido_tarjeta
                  ) ||
                  texto(
                    clase.nombre
                  ),

                duracion_horas:
                  clase.duracion_horas ??
                  null,

                orden:
                  clase.orden,

                tipo_formacion:
                  mayusculas(
                    clase.tipo_formacion
                  ),
              })
            )

        return {
          id:
            modulo.id,

          codigo:
            modulo.codigo ||
            '',

          nombre:
            modulo.nombre ||
            '',

          tipo_formacion:
            mayusculas(
              modulo.tipo_formacion
            ),

          orden:
            modulo.orden,

          clases:
            clasesModulo,
        }
      }
    )
    .filter(
      modulo =>
        modulo.clases.length >
        0
    )
}


// ============================================================
// SEPARAR TEORÍA / TALLER / PRÁCTICA
// ============================================================

function separarFormacion(
  modulos
) {
  const teoria = []
  const taller = []
  const practica = []

  for (
    const modulo of
      (
        Array.isArray(
          modulos
        )
          ? modulos
          : []
      )
  ) {
    const tipo =
      mayusculas(
        modulo
          .tipo_formacion
      )

    if (
      tipo ===
      'TEORIA'
    ) {
      teoria.push(
        modulo
      )

      continue
    }

    if (
      tipo ===
      'TALLER'
    ) {
      taller.push(
        modulo
      )

      continue
    }

    if (
      tipo ===
      'PRACTICA'
    ) {
      practica.push(
        modulo
      )
    }
  }

  return {
    teoria,
    taller,
    practica,
  }
}


// ============================================================
// CONFIGURACIÓN DEL ENCABEZADO
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
      .select(`
        id,
        clave,
        nombre,
        filas,
        columnas,
        estructura,
        usuario_actualizacion,
        created_at,
        updated_at
      `)
      .eq(
        'clave',
        CLAVE_ENCABEZADO
      )
      .maybeSingle()

  if (
    error
  ) {
    console.error(
      'Error consultando encabezado documental:',
      error
    )

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
// CONFIGURACIÓN DEL CONTROL DE CLASES
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
      .select(`
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
      `)
      .eq(
        'tipo_documento',
        TIPO_DOCUMENTO
      )
      .maybeSingle()

  if (
    error
  ) {
    console.error(
      'Error consultando configuración del Control de Clases:',
      error
    )

    throw new Error(
      'No fue posible consultar la configuración del Control de Clases.'
    )
  }

  if (
    !data
  ) {
    const errorDocumento =
      new Error(
        'El CEA no tiene configurado el documento CONTROL_CLASES.'
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
        'El documento Control de Clases se encuentra inactivo.'
      )

    errorInactivo.status =
      409

    throw errorInactivo
  }

  return data
}


// ============================================================
// LOGO
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
      .select(`
        id,
        clave,
        logo_actual_path
      `)
      .eq(
        'clave',
        'GENERAL'
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
// REF P / PRIMER RECIBO DE LA OBLIGACIÓN
// ============================================================

async function obtenerReferenciaPago(
  supabase,
  matriculaId
) {
  // ========================================================
  // IMPORTANTE
  // ========================================================
  //
  // No buscamos directamente recibos_caja.matricula_id.
  //
  // Una obligación puede contener dos matrículas/categorías
  // y el recibo conserva solo una matrícula como referencia
  // técnica.
  //
  // Por eso:
  //
  // matrícula
  //   -> cuentas_aprendiz_detalle
  //   -> cuenta_id
  //   -> primer recibo activo de esa cuenta
  //
  // ========================================================

  const {
    data:
      detalles,

    error:
      errorDetalle,
  } =
    await supabase
      .from(
        'cuentas_aprendiz_detalle'
      )
      .select(`
        id,
        cuenta_id,
        matricula_id,
        categorias,
        descripcion,
        estado,
        created_at
      `)
      .eq(
        'matricula_id',
        matriculaId
      )
      .eq(
        'estado',
        'ACTIVO'
      )
      .order(
        'id',
        {
          ascending:
            true,
        }
      )
      .limit(
        1
      )

  if (
    errorDetalle
  ) {
    console.error(
      'Error consultando cuenta para Ref P:',
      errorDetalle
    )

    return {
      recibo_id:
        null,

      consecutivo:
        '',

      fecha:
        null,
    }
  }

  const cuentaId =
    Array.isArray(
      detalles
    ) &&
    detalles.length >
      0
      ? detalles[0]
          ?.cuenta_id
      : null

  if (
    !cuentaId
  ) {
    return {
      recibo_id:
        null,

      consecutivo:
        '',

      fecha:
        null,
    }
  }

  const {
    data:
      recibos,

    error:
      errorRecibo,
  } =
    await supabase
      .from(
        'recibos_caja'
      )
      .select(`
        id,
        cuenta_id,
        fecha,
        estado,
        tipo_origen,
        created_at
      `)
      .eq(
        'cuenta_id',
        cuentaId
      )
      .eq(
        'estado',
        'ACTIVO'
      )
      .eq(
        'tipo_origen',
        'MATRICULA'
      )
      .order(
        'id',
        {
          ascending:
            true,
        }
      )
      .limit(
        1
      )

  if (
    errorRecibo
  ) {
    console.error(
      'Error consultando primer recibo para Ref P:',
      errorRecibo
    )

    return {
      recibo_id:
        null,

      consecutivo:
        '',

      fecha:
        null,
    }
  }

  const recibo =
    Array.isArray(
      recibos
    ) &&
    recibos.length >
      0
      ? recibos[0]
      : null

  if (
    !recibo
  ) {
    return {
      recibo_id:
        null,

      consecutivo:
        '',

      fecha:
        null,
    }
  }

  return {
    recibo_id:
      recibo.id,

    consecutivo:
      consecutivoRecibo(
        recibo.id
      ),

    fecha:
      recibo.fecha ||
      null,
  }
}


// ============================================================
// APRENDIZ PARA IMPRESIÓN
// ============================================================

function construirAprendiz(
  matricula
) {
  return {
    tipo_doc:
      matricula
        ?.tipo_doc ||
      '',

    documento:
      matricula
        ?.documento ||
      '',

    lugar_expedicion:
      matricula
        ?.lugar_expedicion ||
      '',

    nombres:
      matricula
        ?.nombres ||
      '',

    apellidos:
      matricula
        ?.apellidos ||
      '',

    nombre_completo:
      [
        matricula
          ?.nombres,

        matricula
          ?.apellidos,
      ]
        .filter(
          Boolean
        )
        .join(
          ' '
        )
        .trim(),

    fecha_nacimiento:
      matricula
        ?.fecha_nacimiento ||
      '',

    genero:
      matricula
        ?.genero ||
      '',

    direccion:
      matricula
        ?.direccion ||
      '',

    barrio:
      matricula
        ?.barrio ||
      '',

    ciudad:
      matricula
        ?.ciudad ||
      '',

    celular:
      matricula
        ?.celular ||
      '',

    correo:
      matricula
        ?.correo ||
      '',

    convenio:
      matricula
        ?.convenio ||
      '',

    convenio_id:
      matricula
        ?.convenio_id ??
      null,

    origen_matricula:
      matricula
        ?.origen_matricula ||
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
      !matriculaId
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'La matrícula es obligatoria.',
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
            409,
        }
      )
    }

    const categoriasHabilitadas =
      Array.isArray(
        empresa
          ?.categorias_habilitadas
      )
        ? empresa
            .categorias_habilitadas
            .map(
              item =>
                mayusculas(
                  item
                )
            )
        : []

    if (
      categoriasHabilitadas
        .length >
        0 &&
      !categoriasHabilitadas
        .includes(
          categoria
        )
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            `La categoría ${categoria} no está habilitada para este CEA.`,
        },
        {
          status:
            409,
        }
      )
    }

    // ========================================================
    // CONSULTAS PARALELAS
    // ========================================================

    const plan =
      await obtenerPlanActivo(
        supabase,
        categoria
      )

    const [
      modulos,
      clases,
      encabezado,
      documento,
      logo,
      referenciaPago,
    ] =
      await Promise.all([
        obtenerModulos(
          supabase,
          plan.id
        ),

        obtenerClases(
          supabase,
          plan.id,
          categoria
        ),

        obtenerEncabezado(
          supabase
        ),

        obtenerConfiguracionDocumento(
          supabase
        ),

        obtenerLogo(
          supabase
        ),

        obtenerReferenciaPago(
          supabase,
          matriculaId
        ),
      ])

    // ========================================================
    // ORGANIZAR FORMACIÓN
    // ========================================================

    const modulosImpresion =
      construirModulosImpresion(
        modulos,
        clases
      )

    const formacion =
      separarFormacion(
        modulosImpresion
      )

    // ========================================================
    // RESPUESTA
    // ========================================================

    return NextResponse.json(
      {
        ok:
          true,

        empresa:
          construirEmpresa(
            empresa
          ),

        documento: {
          ...documento,

          encabezado,

          logo,
        },

        matricula: {
          id:
            matricula.id,

          consecutivo:
            matricula
              .consecutivo ||
            '',

          fecha_matricula:
            matricula
              .fecha_matricula ||
            '',

          categoria,

          categorias:
            Array.isArray(
              matricula
                .categorias
            )
              ? matricula
                  .categorias
              : [
                  categoria,
                ],

          estado:
            matricula
              .estado ||
            '',

          referencia_pago:
            referenciaPago,
        },

        aprendiz:
          construirAprendiz(
            matricula
          ),

        plan: {
          id:
            plan.id,

          categoria:
            categoria,

          nombre:
            plan.nombre ||
            '',

          version:
            plan.version ||
            '',

          fecha_vigencia_desde:
            plan
              .fecha_vigencia_desde ||
            null,

          fecha_vigencia_hasta:
            plan
              .fecha_vigencia_hasta ||
            null,
        },

        formacion: {
          teoria:
            formacion.teoria,

          taller:
            formacion.taller,

          practica:
            formacion.practica,
        },

        // =====================================================
        // TEXTOS FIJOS DEL FORMATO
        // =====================================================
        //
        // No se almacenan en la base de datos porque forman
        // parte del diseño funcional de la Tarjeta.
        //
        // =====================================================

        textos: {
          autoevaluacion: {
            titulo:
              'AUTOEVALUACIÓN DEL APRENDIZ',

            parrafo_1:
              'Las autoevaluaciones forman parte del proceso pedagógico y se desarrollan con base en los contenidos y actividades propuestos en el Manual de referencia para la conducción de vehículos y demás recursos educativos aplicables de la Agencia Nacional de Seguridad Vial – ANSV.',

            parrafo_2:
              'Con mi firma declaro haber participado en las actividades de autoevaluación desarrolladas durante mi formación teórica y haber recibido orientación sobre los contenidos en los que debo fortalecer mis conocimientos.',
          },

          practica: {
            titulo:
              'MÓDULO III – FORMACIÓN PRÁCTICA',

            introduccion:
              'Seguimiento del desempeño: En cada clase práctica, el instructor valorará junto con el aprendiz el desempeño en el tema o competencia desarrollada, identificando avances y aspectos por reforzar.',

            criterios:
              {
                S:
                  'Desarrolla satisfactoriamente el contenido.',

                EP:
                  'Continúa consolidando la habilidad.',

                RR:
                  'Requiere reforzar el contenido.',
              },

            resultado_final:
              {
                titulo:
                  'RESULTADO FINAL DE LA FORMACIÓN PRÁCTICA',

                opciones: [
                  'SATISFACTORIO',
                  'REQUIERE REFUERZO',
                ],
              },
          },
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
      'GET /api/admin/documentos/control-clases:',
      error
    )

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error?.message ||
          'No fue posible preparar el Control de Clases.',
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