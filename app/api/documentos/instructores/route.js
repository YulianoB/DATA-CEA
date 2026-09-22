// app/api/documentos/instructores/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

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

const CATEGORIAS_PERMITIDAS = [
  CATEGORIA_A2,
  ...CATEGORIAS_BC,
]

const NIVEL_CATEGORIA = {
  B1: 1,
  'B1-C1': 2,
  'B2-C2': 3,
  'B3-C3': 4,
}

// =========================================================
// HELPERS
// =========================================================

function respuestaError(error) {
  const respuesta =
    respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    {
      status: respuesta.status,
    }
  )
}

function normalizarTexto(valor) {
  return String(valor || '').trim()
}

function normalizarMayusculas(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
}

function normalizarMinusculas(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
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

function normalizarCategoria(valor) {
  const categoria =
    normalizarMayusculas(valor)
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

  const hoy =
    hoyBogota()

  return String(
    vigencia
  ) < hoy
    ? 'VENCIDA'
    : 'VIGENTE'
}

function obtenerNombreCompleto(
  persona
) {
  return [
    normalizarTexto(
      persona?.nombres
    ),
    normalizarTexto(
      persona?.apellidos
    ),
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
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

function normalizarRegistroLicencia(
  registro
) {
  if (!registro) {
    return null
  }

  const normalizado = {
    ...registro,

    categoria:
      normalizarCategoria(
        registro.categoria
      ),

    tipo_licencia:
      normalizarTipoLicencia(
        registro.tipo_licencia
      ),
  }

  return {
    ...normalizado,

    estado_vigencia:
      estadoVigencia(
        normalizado.vigencia
      ),
  }
}

// =========================================================
// VALIDAR INSTRUCTOR PRÁCTICA
// =========================================================

async function obtenerInstructorPractica(
  supabase,
  personalId,
  perfilId = null
) {
  const {
    data: persona,
    error: personaError,
  } = await supabase
    .from('personal')
    .select(`
      id,
      documento,
      nombres,
      apellidos,
      cargo,
      estado,
      rol_conductor_instructor
    `)
    .eq(
      'id',
      personalId
    )
    .maybeSingle()

  if (personaError) {
    throw new Error(
      `No fue posible consultar el instructor: ${personaError.message}`
    )
  }

  if (!persona) {
    return {
      ok: false,
      status: 404,
      message:
        'El instructor seleccionado no existe.',
    }
  }

  const estadoPersona =
    normalizarMinusculas(
      persona.estado
    )

  if (
    estadoPersona &&
    estadoPersona !== 'activo'
  ) {
    return {
      ok: false,
      status: 400,
      message:
        'El instructor seleccionado no está activo.',
    }
  }

  let consultaPerfil =
    supabase
      .from(
        'perfiles_usuario'
      )
      .select(`
        id,
        cuenta_usuario_id,
        personal_id,
        rol,
        estado
      `)
      .eq(
        'personal_id',
        personalId
      )
      .eq(
        'rol',
        ROL_INSTRUCTOR_PRACTICA
      )
      .eq(
        'estado',
        'activo'
      )

  if (
    perfilId &&
    Number.isInteger(
      Number(perfilId)
    )
  ) {
    consultaPerfil =
      consultaPerfil.eq(
        'id',
        Number(perfilId)
      )
  }

  const {
    data: perfiles,
    error: perfilError,
  } =
    await consultaPerfil
      .limit(1)

  if (perfilError) {
    throw new Error(
      `No fue posible consultar el perfil del instructor: ${perfilError.message}`
    )
  }

  if (
    !Array.isArray(perfiles) ||
    perfiles.length === 0
  ) {
    return {
      ok: false,
      status: 400,
      message:
        'La persona seleccionada no tiene un perfil activo de Instructor Práctica.',
    }
  }

  return {
    ok: true,

    persona,

    perfil:
      perfiles[0],

    instructor: {
      personal_id:
        persona.id,

      perfil_id:
        perfiles[0].id,

      cuenta_usuario_id:
        perfiles[0]
          .cuenta_usuario_id,

      nombre_completo:
        obtenerNombreCompleto(
          persona
        ),

      documento:
        persona.documento ||
        '',

      rol:
        ROL_INSTRUCTOR_PRACTICA,

      cargo:
        persona.cargo ||
        null,
    },
  }
}

// =========================================================
// SEPARAR LICENCIAS MÁS RECIENTES
// =========================================================

function separarLicencias(
  registros
) {
  const resultado = {
    conduccion: {
      a2: null,
      bc: null,
    },

    instructor: {
      a2: null,
      bc: null,
    },
  }

  const normalizados =
    registros
      .map(
        normalizarRegistroLicencia
      )
      .filter(Boolean)

  for (
    const registro of
    normalizados
  ) {
    if (
      registro.tipo_licencia ===
      TIPO_CONDUCCION
    ) {
      if (
        registro.categoria ===
          CATEGORIA_A2 &&
        !resultado
          .conduccion
          .a2
      ) {
        resultado
          .conduccion
          .a2 =
          registro
      }

      if (
        esCategoriaBC(
          registro.categoria
        ) &&
        !resultado
          .conduccion
          .bc
      ) {
        resultado
          .conduccion
          .bc =
          registro
      }
    }

    if (
      registro.tipo_licencia ===
      TIPO_INSTRUCTOR
    ) {
      if (
        registro.categoria ===
          CATEGORIA_A2 &&
        !resultado
          .instructor
          .a2
      ) {
        resultado
          .instructor
          .a2 =
          registro
      }

      if (
        esCategoriaBC(
          registro.categoria
        ) &&
        !resultado
          .instructor
          .bc
      ) {
        resultado
          .instructor
          .bc =
          registro
      }
    }
  }

  return resultado
}

// =========================================================
// OBTENER TODOS LOS REGISTROS DEL TIPO
// =========================================================

async function obtenerRegistrosTipo({
  supabase,
  personalId,
  tipoLicencia,
}) {
  const {
    data,
    error,
  } = await supabase
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
      vigencia,
      fecha_actualizacion,
      nombre_quien_actualiza,
      numero_certificado
    `)
    .eq(
      'personal_id',
      personalId
    )
    .order(
      'fecha_actualizacion',
      {
        ascending: false,
        nullsFirst: false,
      }
    )
    .order(
      'id',
      {
        ascending: false,
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
      normalizarRegistroLicencia
    )
    .filter(
      (item) =>
        item.tipo_licencia ===
        tipoLicencia
    )
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
      )

     // =====================================================
// INSTRUCTOR ACTUAL
// =====================================================

if (
  recurso ===
  'instructor_actual'
) {
  const documento =
    normalizarTexto(
      searchParams.get(
        'documento'
      )
    )

  if (
    !documento
  ) {
    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'No fue posible identificar el documento del instructor.',
      },
      {
        status: 400,
      }
    )
  }

  // ===================================================
  // BUSCAR PERSONA
  // ===================================================

  const {
    data:
      persona,

    error:
      personaError,
  } =
    await supabase
      .from(
        'personal'
      )
      .select(`
        id,
        documento,
        nombres,
        apellidos,
        cargo,
        estado,
        rol_conductor_instructor
      `)
      .eq(
        'documento',
        documento
      )
      .maybeSingle()

  if (
    personaError
  ) {
    return NextResponse.json(
      {
        status:
          'failed',

        message:
          `No fue posible consultar el instructor: ${personaError.message}`,
      },
      {
        status: 500,
      }
    )
  }

  if (
    !persona
  ) {
    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'El usuario actual no se encuentra registrado en Personal.',
      },
      {
        status: 404,
      }
    )
  }

  const estadoPersonal =
    normalizarMinusculas(
      persona.estado
    )

  if (
    estadoPersonal &&
    estadoPersonal !==
      'activo'
  ) {
    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'El instructor no se encuentra activo.',
      },
      {
        status: 400,
      }
    )
  }

  // ===================================================
  // BUSCAR PERFIL DE INSTRUCTOR PRÁCTICA
  // ===================================================

  const {
    data:
      perfiles,

    error:
      perfilError,
  } =
    await supabase
      .from(
        'perfiles_usuario'
      )
      .select(`
        id,
        cuenta_usuario_id,
        personal_id,
        rol,
        estado
      `)
      .eq(
        'personal_id',
        persona.id
      )
      .eq(
        'rol',
        ROL_INSTRUCTOR_PRACTICA
      )
      .eq(
        'estado',
        'activo'
      )
      .limit(
        1
      )

  if (
    perfilError
  ) {
    return NextResponse.json(
      {
        status:
          'failed',

        message:
          `No fue posible consultar el perfil del instructor: ${perfilError.message}`,
      },
      {
        status: 500,
      }
    )
  }

  if (
    !Array.isArray(
      perfiles
    ) ||
    perfiles.length ===
      0
  ) {
    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'El usuario actual no tiene un perfil activo de Instructor Práctica.',
      },
      {
        status: 400,
      }
    )
  }

  const perfil =
    perfiles[0]

  return NextResponse.json({
    status:
      'success',

    instructor: {
      id:
        perfil.id,

      perfil_id:
        perfil.id,

      cuenta_usuario_id:
        perfil
          .cuenta_usuario_id,

      personal_id:
        persona.id,

      nombre_completo:
        obtenerNombreCompleto(
          persona
        ),

      documento:
        persona.documento ||
        '',

      rol:
        ROL_INSTRUCTOR_PRACTICA,

      cargo:
        persona.cargo ||
        null,
    },
  })
} 
    // =====================================================
    // INSTRUCTORES
    // =====================================================

    if (
      recurso ===
      'instructores'
    ) {
      const {
        data: perfiles,
        error:
          perfilesError,
      } =
        await supabase
          .from(
            'perfiles_usuario'
          )
          .select(`
            id,
            cuenta_usuario_id,
            personal_id,
            rol,
            estado
          `)
          .eq(
            'rol',
            ROL_INSTRUCTOR_PRACTICA
          )
          .eq(
            'estado',
            'activo'
          )

      if (
        perfilesError
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible cargar los instructores: ${perfilesError.message}`,
          },
          {
            status: 500,
          }
        )
      }

      if (
        !Array.isArray(
          perfiles
        ) ||
        perfiles.length === 0
      ) {
        return NextResponse.json({
          status:
            'success',

          instructores:
            [],
        })
      }

      const personalIds = [
        ...new Set(
          perfiles
            .map(
              (perfil) =>
                Number(
                  perfil.personal_id
                )
            )
            .filter(
              (id) =>
                Number.isInteger(
                  id
                ) &&
                id > 0
            )
        ),
      ]

      const {
        data: personas,
        error:
          personasError,
      } =
        await supabase
          .from('personal')
          .select(`
            id,
            documento,
            nombres,
            apellidos,
            cargo,
            estado,
            rol_conductor_instructor
          `)
          .in(
            'id',
            personalIds
          )

      if (
        personasError
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible cargar los datos de los instructores: ${personasError.message}`,
          },
          {
            status: 500,
          }
        )
      }

      const personasPorId =
        new Map(
          (
            personas || []
          ).map(
            (persona) => [
              Number(
                persona.id
              ),
              persona,
            ]
          )
        )

      const instructores =
        perfiles
          .map(
            (perfil) => {
              const persona =
                personasPorId.get(
                  Number(
                    perfil.personal_id
                  )
                )

              if (!persona) {
                return null
              }

              const estadoPersonal =
                normalizarMinusculas(
                  persona.estado
                )

              if (
                estadoPersonal &&
                estadoPersonal !==
                  'activo'
              ) {
                return null
              }

              return {
                id:
                  perfil.id,

                perfil_id:
                  perfil.id,

                cuenta_usuario_id:
                  perfil
                    .cuenta_usuario_id,

                personal_id:
                  persona.id,

                nombre_completo:
                  obtenerNombreCompleto(
                    persona
                  ),

                documento:
                  persona.documento ||
                  '',

                rol:
                  ROL_INSTRUCTOR_PRACTICA,

                cargo:
                  persona.cargo ||
                  null,
              }
            }
          )
          .filter(Boolean)
          .sort(
            (a, b) =>
              String(
                a.nombre_completo
              ).localeCompare(
                String(
                  b.nombre_completo
                ),
                'es'
              )
          )

      return NextResponse.json({
        status:
          'success',

        instructores,
      })
    }

    // =====================================================
    // LICENCIAS MÁS RECIENTES
    // =====================================================

    if (
      recurso ===
      'licencias'
    ) {
      const personalId =
        Number(
          searchParams.get(
            'personal_id'
          )
        )

      if (
        !Number.isInteger(
          personalId
        ) ||
        personalId <= 0
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El instructor es obligatorio.',
          },
          {
            status: 400,
          }
        )
      }

      const validacion =
        await obtenerInstructorPractica(
          supabase,
          personalId
        )

      if (
        !validacion.ok
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              validacion.message,
          },
          {
            status:
              validacion.status,
          }
        )
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
            vigencia,
            fecha_actualizacion,
            nombre_quien_actualiza,
            numero_certificado
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
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible cargar las licencias del instructor: ${error.message}`,
          },
          {
            status: 500,
          }
        )
      }

      const registros =
        (
          Array.isArray(
            data
          )
            ? data
            : []
        )
          .map(
            normalizarRegistroLicencia
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

      const licencias =
        separarLicencias(
          registros
        )

      const tieneLicencias =
        Boolean(
          licencias
            .conduccion
            .a2 ||
          licencias
            .conduccion
            .bc ||
          licencias
            .instructor
            .a2 ||
          licencias
            .instructor
            .bc
        )

      return NextResponse.json({
        status:
          'success',

        instructor:
          validacion.instructor,

        licencias,

        tiene_licencias:
          tieneLicencias,
      })
    }

    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'Recurso no válido.',
      },
      {
        status: 400,
      }
    )
  } catch (error) {
    console.error(
      'Error GET /api/documentos/instructores:',
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
      )

    if (
      accion !==
      'guardar_licencia'
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'Acción no válida.',
        },
        {
          status: 400,
        }
      )
    }

    const personalId =
      Number(
        body?.personal_id
      )

    const perfilId =
      Number(
        body?.perfil_id
      )

    const licenciaId =
      body?.licencia_id
        ? Number(
            body.licencia_id
          )
        : null

    const categoria =
      normalizarCategoria(
        body?.categoria
      )

    const tipoLicencia =
      normalizarTipoLicencia(
        body?.tipo_licencia
      )

    const vigencia =
      normalizarTexto(
        body?.vigencia
      )

    const numeroCertificado =
      normalizarMayusculas(
        body?.numero_certificado
      )

    const actualizadoPor =
      normalizarTexto(
        body
          ?.nombre_quien_actualiza
      )

    // =====================================================
    // VALIDACIONES
    // =====================================================

    if (
      !Number.isInteger(
        personalId
      ) ||
      personalId <= 0
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El instructor seleccionado no es válido.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      !Number.isInteger(
        perfilId
      ) ||
      perfilId <= 0
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El perfil del instructor no es válido.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      !CATEGORIAS_PERMITIDAS.includes(
        categoria
      )
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La categoría seleccionada no es válida.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      ![
        TIPO_CONDUCCION,
        TIPO_INSTRUCTOR,
      ].includes(
        tipoLicencia
      )
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El tipo de licencia no es válido.',
        },
        {
          status: 400,
        }
      )
    }

    if (!vigencia) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La fecha de vigencia es obligatoria.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      tipoLicencia ===
        TIPO_INSTRUCTOR &&
      !numeroCertificado
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El número de certificado de instructor es obligatorio.',
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // VALIDAR INSTRUCTOR
    // =====================================================

    const validacion =
      await obtenerInstructorPractica(
        supabase,
        personalId,
        perfilId
      )

    if (
      !validacion.ok
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            validacion.message,
        },
        {
          status:
            validacion.status,
        }
      )
    }

    const payload = {
      personal_id:
        personalId,

      nombre_completo:
        validacion
          .instructor
          .nombre_completo,

      documento:
        validacion
          .instructor
          .documento ||
        null,

      rol:
        ROL_INSTRUCTOR_PRACTICA,

      categoria,

      tipo_licencia:
        tipoLicencia,

      vigencia,

      fecha_actualizacion:
        hoyBogota(),

      nombre_quien_actualiza:
        actualizadoPor ||
        null,

      numero_certificado:
        tipoLicencia ===
        TIPO_INSTRUCTOR
          ? numeroCertificado
          : null,
    }

    // =====================================================
    // ACTUALIZACIÓN / RENOVACIÓN / RECATEGORIZACIÓN
    // =====================================================
    //
    // IMPORTANTE:
    //
    // Si viene licencia_id:
    // NO se actualiza esa fila.
    //
    // Se valida el registro histórico anterior
    // y se INSERTA una nueva fila.
    //
    // =====================================================

    if (
      licenciaId &&
      Number.isInteger(
        licenciaId
      ) &&
      licenciaId > 0
    ) {
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
            tipo_licencia,
            categoria,
            vigencia,
            numero_certificado
          `)
          .eq(
            'id',
            licenciaId
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
              `No fue posible verificar el registro anterior: ${licenciaAnteriorError.message}`,
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
              'El registro que intenta renovar no existe.',
          },
          {
            status: 404,
          }
        )
      }

      if (
        Number(
          licenciaAnterior
            .personal_id
        ) !==
        personalId
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El documento seleccionado no pertenece al instructor.',
          },
          {
            status: 400,
          }
        )
      }

      const tipoAnterior =
        normalizarTipoLicencia(
          licenciaAnterior
            .tipo_licencia
        )

      if (
        tipoAnterior !==
        tipoLicencia
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El tipo de documento no coincide con el registro seleccionado.',
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

      // ===================================================
      // A2 NO PUEDE CONVERTIRSE EN B/C
      // ===================================================

      if (
        categoriaAnterior ===
          CATEGORIA_A2 &&
        categoria !==
          CATEGORIA_A2
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Un registro A2 no puede recategorizarse como B/C. Debe administrarse independientemente.',
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
        categoria ===
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

      // ===================================================
      // NO PERMITIR BAJAR CATEGORÍA
      // ===================================================

      if (
        esCategoriaBC(
          categoriaAnterior
        ) &&
        esCategoriaBC(
          categoria
        )
      ) {
        const nivelAnterior =
          NIVEL_CATEGORIA[
            categoriaAnterior
          ]

        const nivelNuevo =
          NIVEL_CATEGORIA[
            categoria
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
                `No puede cambiar de ${categoriaAnterior} a ${categoria} porque corresponde a una categoría inferior.`,
            },
            {
              status: 409,
            }
          )
        }
      }

      // ===================================================
      // INSERTAR NUEVA VERSIÓN HISTÓRICA
      // ===================================================

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
          .select(`
            id,
            personal_id,
            nombre_completo,
            documento,
            rol,
            categoria,
            tipo_licencia,
            vigencia,
            fecha_actualizacion,
            nombre_quien_actualiza,
            numero_certificado
          `)
          .single()

      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible registrar la nueva versión del documento: ${error.message}`,
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
            categoriaAnterior !==
            categoria
              ? `Documento recategorizado de ${categoriaAnterior} a ${categoria}. Se conservó el registro anterior en el historial.`
              : 'Documento renovado correctamente. Se conservó el registro anterior en el historial.',

          operacion:
            categoriaAnterior !==
            categoria
              ? 'recategorizacion'
              : 'renovacion',

          licencia_anterior_id:
            licenciaAnterior.id,

          licencia:
            normalizarRegistroLicencia(
              data
            ),
        },
        {
          status: 201,
        }
      )
    }

    // =====================================================
    // CREACIÓN DE NUEVO DOCUMENTO FUNCIONAL
    // =====================================================

    const registrosTipo =
      await obtenerRegistrosTipo({
        supabase,

        personalId,

        tipoLicencia,
      })

    let existenteGrupo =
      null

    if (
      categoria ===
      CATEGORIA_A2
    ) {
      existenteGrupo =
        registrosTipo.find(
          (registro) =>
            registro.categoria ===
            CATEGORIA_A2
        ) ||
        null
    }

    if (
      esCategoriaBC(
        categoria
      )
    ) {
      existenteGrupo =
        registrosTipo.find(
          (registro) =>
            esCategoriaBC(
              registro.categoria
            )
        ) ||
        null
    }

    if (
      existenteGrupo
    ) {
      if (
        categoria ===
        CATEGORIA_A2
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              `Ya existe un ${
                tipoLicencia ===
                TIPO_INSTRUCTOR
                  ? 'Certificado de Instructor'
                  : 'registro de Licencia de Conducción'
              } A2. Utilice la opción de actualizar para registrar una nueva vigencia.`,

            licencia:
              existenteGrupo,
          },
          {
            status: 409,
          }
        )
      }

      const categoriaActual =
        normalizarCategoria(
          existenteGrupo
            .categoria
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
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              `No puede registrar ${categoria} porque ya existe una categoría superior (${categoriaActual}).`,

            licencia:
              existenteGrupo,
          },
          {
            status: 409,
          }
        )
      }

      if (
        nivelNuevo ===
        nivelActual
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              `Ya existe la categoría ${categoriaActual}. Utilice la opción de actualizar para registrar una nueva vigencia.`,

            licencia:
              existenteGrupo,
          },
          {
            status: 409,
          }
        )
      }

      return NextResponse.json(
        {
          status:
            'warning',

          message:
            `Actualmente existe la categoría ${categoriaActual}. Para recategorizar a ${categoria}, utilice la opción de actualizar.`,

          requiere_recategorizacion:
            true,

          licencia:
            existenteGrupo,
        },
        {
          status: 409,
        }
      )
    }

    // =====================================================
    // INSERTAR PRIMER REGISTRO DEL GRUPO
    // =====================================================

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
        .select(`
          id,
          personal_id,
          nombre_completo,
          documento,
          rol,
          categoria,
          tipo_licencia,
          vigencia,
          fecha_actualizacion,
          nombre_quien_actualiza,
          numero_certificado
        `)
        .single()

    if (error) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `No fue posible registrar el documento: ${error.message}`,
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
          'Documento registrado correctamente.',

        operacion:
          'creacion',

        licencia:
          normalizarRegistroLicencia(
            data
          ),
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      'Error POST /api/documentos/instructores:',
      error
    )

    return respuestaError(
      error
    )
  }
}