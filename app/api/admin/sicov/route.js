// app/api/admin/sicov/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const CATEGORIAS_VALIDAS = new Set([
  'A2',
  'B1',
  'C1',
  'RC1',
  'C2',
  'C3',
])

const LIMITE_CONSULTA =
  200

// =========================================================
// RESPUESTA ERROR MULTIEMPRESA
// =========================================================

function respuestaError(
  error
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

// =========================================================
// HELPERS
// =========================================================

function normalizarTexto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}

function normalizarMayusculas(
  valor
) {
  return normalizarTexto(
    valor
  ).toUpperCase()
}

function limpiarBusqueda(
  valor
) {
  return normalizarTexto(
    valor
  ).replace(
    /[%_]/g,
    ''
  )
}

function nombreEmpresa(
  empresa
) {
  return (
    empresa?.nombre ||
    empresa?.nombre_empresa ||
    empresa?.razon_social ||
    ''
  )
}

function nombreUsuario(
  body
) {
  return (
    normalizarTexto(
      body?.usuario
    ) ||
    normalizarTexto(
      body?.nombre_usuario
    ) ||
    ''
  )
}

function toInt(
  valor
) {
  if (
    valor === '' ||
    valor === null ||
    valor === undefined
  ) {
    return null
  }

  const numero =
    Number(
      valor
    )

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return null
  }

  return Math.trunc(
    numero
  )
}

// =========================================================
// FECHA ACTUAL BOGOTÁ
// =========================================================

function hoyBogota() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',

      timeZone:
        'America/Bogota',
    }
  ).format(
    new Date()
  )
}

// =========================================================
// CATEGORÍA MATRÍCULA
// =========================================================

function obtenerCategoriaRegistro(
  registro
) {
  if (
    Array.isArray(
      registro?.categorias
    ) &&
    registro.categorias.length >
      0
  ) {
    return normalizarMayusculas(
      registro.categorias[0]
    )
  }

  if (
    registro?.categoria
  ) {
    return normalizarMayusculas(
      registro.categoria
    )
  }

  return ''
}

// =========================================================
// OBTENER CONTROL SICOV
// =========================================================

async function obtenerControlSicov(
  supabase,
  controlSicovId
) {
  const id =
    toInt(
      controlSicovId
    )

  if (
    !id
  ) {
    throw new Error(
      'El control SICOV es obligatorio.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'control_sicov'
      )
      .select(`
        id,
        matricula_id,
        consecutivo,
        documento,
        categoria,
        estado_registro,
        fecha_registro,
        usuario_registro,
        estado_certificacion,
        fecha_certificacion,
        usuario_certificacion,
        observaciones,
        created_at,
        updated_at
      `)
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el Control SICOV: ${error.message}`
    )
  }

  if (
    !data
  ) {
    throw new Error(
      'No se encontró el Control SICOV solicitado.'
    )
  }

  return data
}

// =========================================================
// OBTENER MATRÍCULA / DATOS APRENDIZ
// =========================================================
//
// IMPORTANTE:
//
// No consultamos:
//
// - pagos
// - saldos
// - caja
// - valores matrícula
//
// SICOV solo necesita información personal y académica.
//
// =========================================================

async function obtenerMatricula(
  supabase,
  matriculaId
) {
  const id =
    toInt(
      matriculaId
    )

  if (
    !id
  ) {
    return null
  }

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
        categorias,

        acudi_nombres,
        acudi_apellidos,
        acudi_tipo_doc,
        acudi_documento,
        acudi_celular,
        acudi_direccion,
        acudi_correo,

        emergencia_nombre,
        emergencia_celular,

        estado,
        created_at
      `)
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los datos del aprendiz: ${error.message}`
    )
  }

  return (
    data ||
    null
  )
}

// =========================================================
// FORMATEAR APRENDIZ PARA SICOV
// =========================================================

function construirDatosAprendizSicov(
  matricula
) {
  if (
    !matricula
  ) {
    return null
  }

  const categoria =
    obtenerCategoriaRegistro(
      matricula
    )

  return {
    id:
      matricula.id,

    consecutivo:
      matricula.consecutivo ||
      '',

    fecha_matricula:
      matricula.fecha_matricula ||
      '',

    // =====================================================
    // IDENTIFICACIÓN
    // =====================================================

    tipo_doc:
      matricula.tipo_doc ||
      '',

    documento:
      matricula.documento ||
      '',

    lugar_expedicion:
      matricula.lugar_expedicion ||
      '',

    nombres:
      matricula.nombres ||
      '',

    apellidos:
      matricula.apellidos ||
      '',

    nombre_completo:
      [
        matricula.nombres,
        matricula.apellidos,
      ]
        .filter(
          Boolean
        )
        .join(
          ' '
        )
        .trim(),

    fecha_nacimiento:
      matricula.fecha_nacimiento ||
      '',

    genero:
      matricula.genero ||
      '',

    // =====================================================
    // CONTACTO
    // =====================================================

    celular:
      matricula.celular ||
      '',

    correo:
      matricula.correo ||
      '',

    direccion:
      matricula.direccion ||
      '',

    barrio:
      matricula.barrio ||
      '',

    ciudad:
      matricula.ciudad ||
      '',

    // =====================================================
    // INFORMACIÓN COMPLEMENTARIA
    // =====================================================

    estado_civil:
      matricula.estado_civil ||
      '',

    ocupacion:
      matricula.ocupacion ||
      '',

    eps:
      matricula.eps ||
      '',

    estrato:
      matricula.estrato ??
      '',

    nivel_educativo:
      matricula.nivel_educativo ||
      '',

    // =====================================================
    // MATRÍCULA
    // =====================================================

    categoria,

    categorias:
      Array.isArray(
        matricula.categorias
      )
        ? matricula.categorias
        : [],

    convenio:
      matricula.convenio ||
      '',

    estado_matricula:
      matricula.estado ||
      '',

    // =====================================================
    // ACUDIENTE
    // =====================================================

    acudiente: {
      nombres:
        matricula.acudi_nombres ||
        '',

      apellidos:
        matricula.acudi_apellidos ||
        '',

      nombre_completo:
        [
          matricula.acudi_nombres,
          matricula.acudi_apellidos,
        ]
          .filter(
            Boolean
          )
          .join(
            ' '
          )
          .trim(),

      tipo_doc:
        matricula.acudi_tipo_doc ||
        '',

      documento:
        matricula.acudi_documento ||
        '',

      celular:
        matricula.acudi_celular ||
        '',

      direccion:
        matricula.acudi_direccion ||
        '',

      correo:
        matricula.acudi_correo ||
        '',
    },

    // =====================================================
    // EMERGENCIA
    // =====================================================

    emergencia: {
      nombre:
        matricula.emergencia_nombre ||
        '',

      celular:
        matricula.emergencia_celular ||
        '',
    },
  }
}

// =========================================================
// CONSULTA GENERAL SICOV
// =========================================================

async function consultarControles({
  supabase,
  busqueda = '',
  categoria = '',
  estadoRegistro = '',
  estadoCertificacion = '',
}) {
  // =======================================================
  // CONSULTAR CONTROL SICOV
  // =======================================================

  let consulta =
    supabase
      .from(
        'control_sicov'
      )
      .select(`
        id,
        matricula_id,
        consecutivo,
        documento,
        categoria,
        estado_registro,
        fecha_registro,
        usuario_registro,
        estado_certificacion,
        fecha_certificacion,
        usuario_certificacion,
        observaciones,
        created_at,
        updated_at
      `)

  // =======================================================
  // CATEGORÍA
  // =======================================================

  if (
    categoria
  ) {
    consulta =
      consulta.eq(
        'categoria',
        normalizarMayusculas(
          categoria
        )
      )
  }

  // =======================================================
  // REGISTRO
  // =======================================================

  if (
    estadoRegistro
  ) {
    consulta =
      consulta.eq(
        'estado_registro',
        normalizarMayusculas(
          estadoRegistro
        )
      )
  }

  // =======================================================
  // CERTIFICACIÓN
  // =======================================================

  if (
    estadoCertificacion
  ) {
    consulta =
      consulta.eq(
        'estado_certificacion',
        normalizarMayusculas(
          estadoCertificacion
        )
      )
  }

  // =======================================================
  // BÚSQUEDA SOBRE CONTROL
  // =======================================================

  const termino =
    limpiarBusqueda(
      busqueda
    )

  if (
    termino
  ) {
    const posibleCategoria =
      normalizarMayusculas(
        termino
      )

    if (
      CATEGORIAS_VALIDAS.has(
        posibleCategoria
      )
    ) {
      consulta =
        consulta.eq(
          'categoria',
          posibleCategoria
        )
    } else {
      consulta =
        consulta.or(
          [
            `documento.ilike.%${termino}%`,
            `consecutivo.ilike.%${termino}%`,
          ].join(
            ','
          )
        )
    }
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
      .limit(
        LIMITE_CONSULTA
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar Control SICOV: ${error.message}`
    )
  }

  let controles =
    Array.isArray(
      data
    )
      ? data
      : []

  if (
    controles.length ===
    0
  ) {
    return []
  }

  // =======================================================
  // MATRÍCULAS
  // =======================================================

  const matriculaIds =
    [
      ...new Set(
        controles
          .map(
            control =>
              control.matricula_id
          )
          .filter(
            Boolean
          )
      ),
    ]

  let matriculas =
    []

  if (
    matriculaIds.length >
    0
  ) {
    const {
      data:
        dataMatriculas,

      error:
        errorMatriculas,
    } =
      await supabase
        .from(
          'aprendices'
        )
        .select(`
          id,
          tipo_doc,
          documento,
          nombres,
          apellidos,
          celular,
          correo,
          fecha_matricula,
          convenio,
          categorias,
          estado
        `)
        .in(
          'id',
          matriculaIds
        )

    if (
      errorMatriculas
    ) {
      throw new Error(
        `No fue posible consultar los aprendices SICOV: ${errorMatriculas.message}`
      )
    }

    matriculas =
      Array.isArray(
        dataMatriculas
      )
        ? dataMatriculas
        : []
  }

  // =======================================================
  // MAPA MATRÍCULAS
  // =======================================================

  const mapaMatriculas =
    new Map(
      matriculas.map(
        matricula => [
          String(
            matricula.id
          ),

          matricula,
        ]
      )
    )

  // =======================================================
  // CONSTRUIR RESULTADO
  // =======================================================

  let resultado =
    controles.map(
      control => {
        const matricula =
          mapaMatriculas.get(
            String(
              control.matricula_id
            )
          ) ||
          null

        return {
          ...control,

          aprendiz:
            matricula
              ? {
                  id:
                    matricula.id,

                  tipo_doc:
                    matricula.tipo_doc ||
                    '',

                  documento:
                    matricula.documento ||
                    '',

                  nombres:
                    matricula.nombres ||
                    '',

                  apellidos:
                    matricula.apellidos ||
                    '',

                  nombre_completo:
                    [
                      matricula.nombres,
                      matricula.apellidos,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' '
                      )
                      .trim(),

                  celular:
                    matricula.celular ||
                    '',

                  correo:
                    matricula.correo ||
                    '',

                  fecha_matricula:
                    matricula.fecha_matricula ||
                    '',

                  convenio:
                    matricula.convenio ||
                    '',

                  estado:
                    matricula.estado ||
                    '',
                }
              : null,

          puede_registrar:
            normalizarMayusculas(
              control.estado_registro
            ) !==
            'REGISTRADO',

          puede_certificar:
            normalizarMayusculas(
              control.estado_registro
            ) ===
              'REGISTRADO' &&
            normalizarMayusculas(
              control.estado_certificacion
            ) !==
              'CERTIFICADO',
        }
      }
    )

  // =======================================================
  // BÚSQUEDA POR NOMBRE
  // =======================================================
  //
  // La búsqueda inicial sobre control_sicov cubre:
  //
  // documento
  // consecutivo
  // categoría
  //
  // Para permitir también nombre/apellido hacemos un segundo
  // filtrado en memoria cuando el término contiene letras.
  //
  // =======================================================

  if (
    termino
  ) {
    const posibleCategoria =
      normalizarMayusculas(
        termino
      )

    if (
      !CATEGORIAS_VALIDAS.has(
        posibleCategoria
      ) &&
      /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(
        termino
      )
    ) {
      const terminoNormalizado =
        normalizarMayusculas(
          termino
        )

      resultado =
        resultado.filter(
          item => {
            const nombre =
              normalizarMayusculas(
                item
                  ?.aprendiz
                  ?.nombre_completo
              )

            const documento =
              normalizarMayusculas(
                item.documento
              )

            const consecutivo =
              normalizarMayusculas(
                item.consecutivo
              )

            return (
              nombre.includes(
                terminoNormalizado
              ) ||
              documento.includes(
                terminoNormalizado
              ) ||
              consecutivo.includes(
                terminoNormalizado
              )
            )
          }
        )
    }
  }

  return resultado
}

// =========================================================
// GET
// =========================================================
//
// recurso=consultar
//
// recurso=detalle
//
// =========================================================

export async function GET(
  request
) {
  try {
    // =====================================================
    // EMPRESA
    // =====================================================

    const {
      supabaseAdmin,
      empresa,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const supabase =
      supabaseAdmin

    // =====================================================
    // PARÁMETROS
    // =====================================================

    const {
      searchParams,
    } =
      new URL(
        request.url
      )

    const recurso =
      normalizarTexto(
        searchParams.get(
          'recurso'
        )
      ).toLowerCase()

    // =====================================================
    // CONSULTAR
    // =====================================================

    if (
      recurso ===
      'consultar'
    ) {
      const controles =
        await consultarControles({
          supabase,

          busqueda:
            normalizarTexto(
              searchParams.get(
                'q'
              )
            ),

          categoria:
            normalizarTexto(
              searchParams.get(
                'categoria'
              )
            ),

          estadoRegistro:
            normalizarTexto(
              searchParams.get(
                'estado_registro'
              )
            ),

          estadoCertificacion:
            normalizarTexto(
              searchParams.get(
                'estado_certificacion'
              )
            ),
        })

      return NextResponse.json({
        status:
          'success',

        data:
          controles,

        total:
          controles.length,

        limite:
          LIMITE_CONSULTA,

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            nombreEmpresa(
              empresa
            ),
        },
      })
    }

    // =====================================================
    // DETALLE
    // =====================================================

    if (
      recurso ===
      'detalle'
    ) {
      const controlSicovId =
        toInt(
          searchParams.get(
            'control_sicov_id'
          )
        )

      if (
        !controlSicovId
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El control SICOV es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const control =
        await obtenerControlSicov(
          supabase,
          controlSicovId
        )

      const matricula =
        await obtenerMatricula(
          supabase,
          control.matricula_id
        )

      if (
        !matricula
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No fue posible encontrar la matrícula relacionada con este Control SICOV.',
          },
          {
            status:
              404,
          }
        )
      }

      const aprendiz =
        construirDatosAprendizSicov(
          matricula
        )

      return NextResponse.json({
        status:
          'success',

        data: {
          control,

          aprendiz,

          puede_registrar:
            normalizarMayusculas(
              control.estado_registro
            ) !==
            'REGISTRADO',

          puede_certificar:
            normalizarMayusculas(
              control.estado_registro
            ) ===
              'REGISTRADO' &&
            normalizarMayusculas(
              control.estado_certificacion
            ) !==
              'CERTIFICADO',
        },

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            nombreEmpresa(
              empresa
            ),
        },
      })
    }

    // =====================================================
    // RECURSO INVÁLIDO
    // =====================================================

    return NextResponse.json(
      {
        status:
          'error',

        message:
          'Recurso no válido.',
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
      'Error GET /api/admin/sicov:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// =========================================================
// POST
// =========================================================
//
// acciones:
//
// registrar_sicov
//
// certificar_sicov
//
// =========================================================

export async function POST(
  request
) {
  try {
    const body =
      await request.json()

    // =====================================================
    // EMPRESA
    // =====================================================

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
      normalizarTexto(
        body?.accion
      ).toLowerCase()

    const usuario =
      nombreUsuario(
        body
      )

    // =====================================================
    // REGISTRAR EN SICOV
    // =====================================================

    if (
      accion ===
      'registrar_sicov'
    ) {
      const controlSicovId =
        toInt(
          body
            ?.control_sicov_id
        )

      if (
        !controlSicovId ||
        !usuario
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El control SICOV y el usuario son obligatorios.',
          },
          {
            status:
              400,
          }
        )
      }

      const control =
        await obtenerControlSicov(
          supabase,
          controlSicovId
        )

      // ===================================================
      // YA REGISTRADO
      // ===================================================

      if (
        normalizarMayusculas(
          control.estado_registro
        ) ===
        'REGISTRADO'
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Esta matrícula ya está marcada como REGISTRADA en SICOV.',
          },
          {
            status:
              409,
          }
        )
      }

      // ===================================================
      // ACTUALIZAR
      // ===================================================

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'control_sicov'
          )
          .update({
            estado_registro:
              'REGISTRADO',

            fecha_registro:
              hoyBogota(),

            usuario_registro:
              usuario,

            observaciones:
              normalizarTexto(
                body?.observaciones
              ) ||
              control.observaciones ||
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            control.id
          )
          .select(`
            id,
            matricula_id,
            consecutivo,
            documento,
            categoria,
            estado_registro,
            fecha_registro,
            usuario_registro,
            estado_certificacion,
            fecha_certificacion,
            usuario_certificacion,
            observaciones,
            created_at,
            updated_at
          `)
          .single()

      if (
        error
      ) {
        throw new Error(
          `No fue posible marcar la matrícula como REGISTRADA en SICOV: ${error.message}`
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          'Matrícula marcada como REGISTRADA en SICOV.',

        data,

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            nombreEmpresa(
              empresa
            ),
        },
      })
    }

    // =====================================================
    // CERTIFICAR EN SICOV
    // =====================================================

    if (
      accion ===
      'certificar_sicov'
    ) {
      const controlSicovId =
        toInt(
          body
            ?.control_sicov_id
        )

      if (
        !controlSicovId ||
        !usuario
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El control SICOV y el usuario son obligatorios.',
          },
          {
            status:
              400,
          }
        )
      }

      const control =
        await obtenerControlSicov(
          supabase,
          controlSicovId
        )

      // ===================================================
      // DEBE ESTAR REGISTRADO
      // ===================================================

      if (
        normalizarMayusculas(
          control.estado_registro
        ) !==
        'REGISTRADO'
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Primero debe marcar al aprendiz como REGISTRADO en SICOV.',
          },
          {
            status:
              409,
          }
        )
      }

      // ===================================================
      // YA CERTIFICADO
      // ===================================================

      if (
        normalizarMayusculas(
          control.estado_certificacion
        ) ===
        'CERTIFICADO'
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Esta matrícula ya está marcada como CERTIFICADA en SICOV.',
          },
          {
            status:
              409,
          }
        )
      }

      // ===================================================
      // ACTUALIZAR
      // ===================================================

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'control_sicov'
          )
          .update({
            estado_certificacion:
              'CERTIFICADO',

            fecha_certificacion:
              hoyBogota(),

            usuario_certificacion:
              usuario,

            observaciones:
              normalizarTexto(
                body?.observaciones
              ) ||
              control.observaciones ||
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            control.id
          )
          .select(`
            id,
            matricula_id,
            consecutivo,
            documento,
            categoria,
            estado_registro,
            fecha_registro,
            usuario_registro,
            estado_certificacion,
            fecha_certificacion,
            usuario_certificacion,
            observaciones,
            created_at,
            updated_at
          `)
          .single()

      if (
        error
      ) {
        throw new Error(
          `No fue posible marcar la matrícula como CERTIFICADA en SICOV: ${error.message}`
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          'Matrícula marcada como CERTIFICADA en SICOV.',

        data,

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            nombreEmpresa(
              empresa
            ),
        },
      })
    }

    // =====================================================
    // ACCIÓN INVÁLIDA
    // =====================================================

    return NextResponse.json(
      {
        status:
          'error',

        message:
          'Acción no válida.',
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
      'Error POST /api/admin/sicov:',
      error
    )

    return respuestaError(
      error
    )
  }
}