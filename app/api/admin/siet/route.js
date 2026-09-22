// app/api/admin/siet/route.js

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

const ESTADOS_VALIDOS = new Set([
  'PENDIENTE',
  'REGISTRADO',
  'CERTIFICADO',
])

const LIMITE_CONSULTA = 500

// =========================================================
// RESPUESTA ERROR
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

function limpiarIds(
  valor
) {
  if (
    !Array.isArray(
      valor
    )
  ) {
    return []
  }

  return [
    ...new Set(
      valor
        .map(
          toInt
        )
        .filter(
          id =>
            Number.isInteger(
              id
            ) &&
            id >
              0
        )
    ),
  ]
}

// =========================================================
// FECHA BOGOTÁ
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
// OBTENER CONTROL SIET
// =========================================================

async function obtenerControlSiet(
  supabase,
  controlSietId
) {
  const id =
    toInt(
      controlSietId
    )

  if (
    !id
  ) {
    throw new Error(
      'El control SIET es obligatorio.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'control_siet'
      )
      .select(`
        id,
        matricula_id,
        consecutivo,
        documento,
        categoria,
        estado,
        fecha_registro,
        usuario_registro,
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
      `No fue posible consultar el Control SIET: ${error.message}`
    )
  }

  if (
    !data
  ) {
    throw new Error(
      'No se encontró el Control SIET solicitado.'
    )
  }

  return data
}

// =========================================================
// OBTENER MATRÍCULA
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
      `No fue posible consultar la matrícula SIET: ${error.message}`
    )
  }

  return (
    data ||
    null
  )
}

// =========================================================
// FORMATEAR APRENDIZ
// =========================================================

function construirAprendiz(
  matricula
) {
  if (
    !matricula
  ) {
    return null
  }

  return {
    id:
      matricula.id,

    consecutivo:
      matricula.consecutivo ||
      '',

    fecha_matricula:
      matricula.fecha_matricula ||
      '',

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

    convenio:
      matricula.convenio ||
      '',

    categoria:
      obtenerCategoriaRegistro(
        matricula
      ),

    categorias:
      Array.isArray(
        matricula.categorias
      )
        ? matricula.categorias
        : [],

    estado_matricula:
      matricula.estado ||
      '',
  }
}

// =========================================================
// CONSULTA GENERAL SIET
// =========================================================

async function consultarControles({
  supabase,
  busqueda = '',
  categoria = '',
  estado = 'PENDIENTE',
}) {
  let consulta =
    supabase
      .from(
        'control_siet'
      )
      .select(`
        id,
        matricula_id,
        consecutivo,
        documento,
        categoria,
        estado,
        fecha_registro,
        usuario_registro,
        fecha_certificacion,
        usuario_certificacion,
        observaciones,
        created_at,
        updated_at
      `)

  // =======================================================
  // CATEGORÍA
  // =======================================================

  const categoriaNormalizada =
    normalizarMayusculas(
      categoria
    )

  if (
    categoriaNormalizada
  ) {
    if (
      !CATEGORIAS_VALIDAS.has(
        categoriaNormalizada
      )
    ) {
      throw new Error(
        'La categoría no es válida.'
      )
    }

    consulta =
      consulta.eq(
        'categoria',
        categoriaNormalizada
      )
  }

  // =======================================================
  // ESTADO
  // =======================================================

  const estadoNormalizado =
    normalizarMayusculas(
      estado
    )

  if (
    estadoNormalizado
  ) {
    if (
      !ESTADOS_VALIDOS.has(
        estadoNormalizado
      )
    ) {
      throw new Error(
        'El estado SIET no es válido.'
      )
    }

    consulta =
      consulta.eq(
        'estado',
        estadoNormalizado
      )
  }

  // =======================================================
  // BÚSQUEDA
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
      `No fue posible consultar Control SIET: ${error.message}`
    )
  }

  const controles =
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
        `No fue posible consultar los aprendices SIET: ${errorMatriculas.message}`
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
  // RESULTADO
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

                  estado_matricula:
                    matricula.estado ||
                    '',
                }
              : null,

          puede_registrar:
            normalizarMayusculas(
              control.estado
            ) ===
            'PENDIENTE',

          puede_certificar:
            normalizarMayusculas(
              control.estado
            ) ===
            'REGISTRADO',
        }
      }
    )

  // =======================================================
  // FILTRO POR NOMBRE / APELLIDO
  // =======================================================

  if (
    termino &&
    /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(
      termino
    ) &&
    !CATEGORIAS_VALIDAS.has(
      normalizarMayusculas(
        termino
      )
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

  return resultado
}

// =========================================================
// ACTUALIZAR INDIVIDUAL
// =========================================================

async function registrarIndividual({
  supabase,
  control,
  usuario,
  observaciones,
}) {
  if (
    normalizarMayusculas(
      control.estado
    ) !==
    'PENDIENTE'
  ) {
    throw new Error(
      'Solo los registros PENDIENTES pueden marcarse como REGISTRADOS.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'control_siet'
      )
      .update({
        estado:
          'REGISTRADO',

        fecha_registro:
          hoyBogota(),

        usuario_registro:
          usuario,

        observaciones:
          normalizarTexto(
            observaciones
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
      .eq(
        'estado',
        'PENDIENTE'
      )
      .select('*')
      .single()

  if (
    error
  ) {
    throw new Error(
      `No fue posible registrar el aprendiz en SIET: ${error.message}`
    )
  }

  return data
}

async function certificarIndividual({
  supabase,
  control,
  usuario,
  observaciones,
}) {
  if (
    normalizarMayusculas(
      control.estado
    ) !==
    'REGISTRADO'
  ) {
    throw new Error(
      'Solo los registros REGISTRADOS pueden marcarse como CERTIFICADOS.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'control_siet'
      )
      .update({
        estado:
          'CERTIFICADO',

        fecha_certificacion:
          hoyBogota(),

        usuario_certificacion:
          usuario,

        observaciones:
          normalizarTexto(
            observaciones
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
      .eq(
        'estado',
        'REGISTRADO'
      )
      .select('*')
      .single()

  if (
    error
  ) {
    throw new Error(
      `No fue posible certificar el aprendiz en SIET: ${error.message}`
    )
  }

  return data
}

// =========================================================
// ACTUALIZACIÓN MASIVA
// =========================================================

async function actualizarMasivo({
  supabase,
  ids,
  estadoOrigen,
  estadoDestino,
  usuario,
  observaciones,
}) {
  const controlesIds =
    limpiarIds(
      ids
    )

  if (
    controlesIds.length ===
    0
  ) {
    throw new Error(
      'Debe seleccionar al menos un registro SIET.'
    )
  }

  // =======================================================
  // VALIDAR REGISTROS EXISTENTES
  // =======================================================

  const {
    data:
      existentes,

    error:
      errorExistentes,
  } =
    await supabase
      .from(
        'control_siet'
      )
      .select(`
        id,
        estado
      `)
      .in(
        'id',
        controlesIds
      )

  if (
    errorExistentes
  ) {
    throw new Error(
      `No fue posible validar los registros seleccionados: ${errorExistentes.message}`
    )
  }

  const registros =
    Array.isArray(
      existentes
    )
      ? existentes
      : []

  if (
    registros.length !==
    controlesIds.length
  ) {
    throw new Error(
      'Uno o más registros SIET seleccionados no existen.'
    )
  }

  const invalidos =
    registros.filter(
      item =>
        normalizarMayusculas(
          item.estado
        ) !==
        estadoOrigen
    )

  if (
    invalidos.length >
    0
  ) {
    throw new Error(
      `Todos los registros seleccionados deben estar en estado ${estadoOrigen}.`
    )
  }

  // =======================================================
  // PAYLOAD
  // =======================================================

  const payload = {
    estado:
      estadoDestino,

    observaciones:
      normalizarTexto(
        observaciones
      ) ||
      null,

    updated_at:
      new Date()
        .toISOString(),
  }

  if (
    estadoDestino ===
    'REGISTRADO'
  ) {
    payload.fecha_registro =
      hoyBogota()

    payload.usuario_registro =
      usuario
  }

  if (
    estadoDestino ===
    'CERTIFICADO'
  ) {
    payload.fecha_certificacion =
      hoyBogota()

    payload.usuario_certificacion =
      usuario
  }

  // =======================================================
  // ACTUALIZAR
  // =======================================================

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'control_siet'
      )
      .update(
        payload
      )
      .in(
        'id',
        controlesIds
      )
      .eq(
        'estado',
        estadoOrigen
      )
      .select('*')

  if (
    error
  ) {
    throw new Error(
      `No fue posible actualizar los registros SIET de forma masiva: ${error.message}`
    )
  }

  const actualizados =
    Array.isArray(
      data
    )
      ? data
      : []

  if (
    actualizados.length !==
    controlesIds.length
  ) {
    throw new Error(
      'No fue posible actualizar todos los registros seleccionados.'
    )
  }

  return actualizados
}

// =========================================================
// GET
// =========================================================

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
      // ===================================================
      // POR DEFECTO: PENDIENTES
      // ===================================================

      const estadoParam =
        searchParams.get(
          'estado'
        )

      const estado =
        estadoParam ===
          null
          ? 'PENDIENTE'
          : normalizarTexto(
              estadoParam
            )

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

          estado,
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

        filtros: {
          q:
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

          estado,
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
    // DETALLE
    // =====================================================

    if (
      recurso ===
      'detalle'
    ) {
      const controlSietId =
        toInt(
          searchParams.get(
            'control_siet_id'
          )
        )

      if (
        !controlSietId
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El control SIET es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const control =
        await obtenerControlSiet(
          supabase,
          controlSietId
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
              'No se encontró la matrícula relacionada con el Control SIET.',
          },
          {
            status:
              404,
          }
        )
      }

      const aprendiz =
        construirAprendiz(
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
              control.estado
            ) ===
            'PENDIENTE',

          puede_certificar:
            normalizarMayusculas(
              control.estado
            ) ===
            'REGISTRADO',
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
      'Error GET /api/admin/siet:',
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
      normalizarTexto(
        body?.accion
      ).toLowerCase()

    const usuario =
      nombreUsuario(
        body
      )

    // =====================================================
    // USUARIO OBLIGATORIO
    // =====================================================

    if (
      !usuario
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El usuario es obligatorio para realizar cambios en SIET.',
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // REGISTRAR INDIVIDUAL
    // =====================================================

    if (
      accion ===
      'registrar_siet'
    ) {
      const controlSietId =
        toInt(
          body
            ?.control_siet_id
        )

      if (
        !controlSietId
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El control SIET es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const control =
        await obtenerControlSiet(
          supabase,
          controlSietId
        )

      let data

      try {
        data =
          await registrarIndividual({
            supabase,
            control,
            usuario,

            observaciones:
              body?.observaciones,
          })
      } catch (
        errorRegistro
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              errorRegistro.message,
          },
          {
            status:
              409,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          'Aprendiz marcado como REGISTRADO en SIET.',

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
    // CERTIFICAR INDIVIDUAL
    // =====================================================

    if (
      accion ===
      'certificar_siet'
    ) {
      const controlSietId =
        toInt(
          body
            ?.control_siet_id
        )

      if (
        !controlSietId
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El control SIET es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const control =
        await obtenerControlSiet(
          supabase,
          controlSietId
        )

      let data

      try {
        data =
          await certificarIndividual({
            supabase,
            control,
            usuario,

            observaciones:
              body?.observaciones,
          })
      } catch (
        errorCertificacion
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              errorCertificacion.message,
          },
          {
            status:
              409,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          'Aprendiz marcado como CERTIFICADO en SIET.',

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
    // REGISTRAR MASIVO
    // =====================================================

    if (
      accion ===
      'registrar_masivo'
    ) {
      const ids =
        limpiarIds(
          body?.ids
        )

      if (
        ids.length ===
        0
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Debe seleccionar al menos un registro SIET.',
          },
          {
            status:
              400,
          }
        )
      }

      let data

      try {
        data =
          await actualizarMasivo({
            supabase,
            ids,

            estadoOrigen:
              'PENDIENTE',

            estadoDestino:
              'REGISTRADO',

            usuario,

            observaciones:
              body?.observaciones,
          })
      } catch (
        errorMasivo
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              errorMasivo.message,
          },
          {
            status:
              409,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          `${data.length} aprendiz(es) marcado(s) como REGISTRADOS en SIET.`,

        data,

        total:
          data.length,

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
    // CERTIFICAR MASIVO
    // =====================================================

    if (
      accion ===
      'certificar_masivo'
    ) {
      const ids =
        limpiarIds(
          body?.ids
        )

      if (
        ids.length ===
        0
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Debe seleccionar al menos un registro SIET.',
          },
          {
            status:
              400,
          }
        )
      }

      let data

      try {
        data =
          await actualizarMasivo({
            supabase,
            ids,

            estadoOrigen:
              'REGISTRADO',

            estadoDestino:
              'CERTIFICADO',

            usuario,

            observaciones:
              body?.observaciones,
          })
      } catch (
        errorMasivo
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              errorMasivo.message,
          },
          {
            status:
              409,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          `${data.length} aprendiz(es) marcado(s) como CERTIFICADOS en SIET.`,

        data,

        total:
          data.length,

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
      'Error POST /api/admin/siet:',
      error
    )

    return respuestaError(
      error
    )
  }
}