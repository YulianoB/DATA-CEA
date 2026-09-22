// app/api/personal/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// ============================================================
// CONSTANTES
// ============================================================

const CATEGORIA_A2 = 'A2'

const CATEGORIAS_BC = [
  'B1',
  'B1 - C1',
  'B2 - C2',
  'B3 - C3',
]

const CATEGORIAS_PERMITIDAS = [
  CATEGORIA_A2,
  ...CATEGORIAS_BC,
]

// ============================================================
// HELPERS
// ============================================================

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
}

function normalizarEmail(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
}

function menuPorRol(rol) {
  if (rol === 'ADMINISTRATIVO') {
    return 'menu_administrativo'
  }

  if (rol === 'INSTRUCTOR_PRACTICA') {
    return 'menu_instructor_practica'
  }

  return 'menu_basico'
}

// ============================================================
// ROL QUE SE GUARDARÁ EN licencias_personal
// ============================================================
//
// La persona solamente puede generar registros de licencia
// cuando tiene marcado:
// personal.rol_conductor_instructor = true
//
// Si además tiene perfil INSTRUCTOR_PRACTICA, se prioriza.
// Luego INSTRUCTOR_TEORIA.
// Si todavía no tiene uno de esos perfiles, se usa INSTRUCTOR.
//
// ============================================================

function obtenerRolLicencia(
  perfiles,
  cumpleRolInstructor
) {
  if (!cumpleRolInstructor) {
    return null
  }

  const roles =
    Array.isArray(perfiles)
      ? perfiles.map((rol) =>
          normalizarTexto(rol)
        )
      : []

  if (
    roles.includes(
      'INSTRUCTOR_PRACTICA'
    )
  ) {
    return 'INSTRUCTOR_PRACTICA'
  }

  if (
    roles.includes(
      'INSTRUCTOR_TEORIA'
    )
  ) {
    return 'INSTRUCTOR_TEORIA'
  }

  return 'INSTRUCTOR'
}

// ============================================================
// VALIDAR CATEGORÍAS
// ============================================================
//
// Reglas:
//
// A2 es independiente.
//
// Línea B/C:
// B1
// B1 - C1
// B2 - C2
// B3 - C3
//
// Puede existir:
//
// A2
//
// o:
//
// una categoría B/C
//
// o:
//
// A2 + una categoría B/C
//
// ============================================================

function validarCategoriasInstructor(
  categorias
) {
  if (
    !Array.isArray(categorias) ||
    categorias.length === 0
  ) {
    return true
  }

  const normalizadas =
    categorias
      .map((categoria) =>
        normalizarTexto(categoria)
      )
      .filter(Boolean)

  if (
    normalizadas.length === 0
  ) {
    return true
  }

  const categoriasUnicas = [
    ...new Set(normalizadas),
  ]

  // No repetir categorías.
  if (
    categoriasUnicas.length !==
    normalizadas.length
  ) {
    return false
  }

  // Todas deben ser válidas.
  if (
    !normalizadas.every(
      (categoria) =>
        CATEGORIAS_PERMITIDAS.includes(
          categoria
        )
    )
  ) {
    return false
  }

  // Máximo A2 + una B/C.
  if (
    normalizadas.length > 2
  ) {
    return false
  }

  if (
    normalizadas.length === 1
  ) {
    return true
  }

  // Si hay dos registros,
  // obligatoriamente uno debe ser A2.
  if (
    !normalizadas.includes(
      CATEGORIA_A2
    )
  ) {
    return false
  }

  const categoriasBc =
    normalizadas.filter(
      (categoria) =>
        CATEGORIAS_BC.includes(
          categoria
        )
    )

  return (
    categoriasBc.length === 1
  )
}

// ============================================================
// VALIDAR PAQUETE DE LICENCIAS
// ============================================================

function validarDatosLicencias(
  licencias
) {
  const certificadosInstructor =
    Array.isArray(
      licencias
        ?.certificados_instructor
    )
      ? licencias
          .certificados_instructor
      : []

  const licenciasConduccion =
    Array.isArray(
      licencias
        ?.licencias_conduccion
    )
      ? licencias
          .licencias_conduccion
      : []

  // ========================================================
  // CATEGORÍAS CERTIFICADO INSTRUCTOR
  // ========================================================

  const categoriasInstructor =
    certificadosInstructor
      .map((item) =>
        item?.categoria
      )
      .filter(Boolean)

  if (
    !validarCategoriasInstructor(
      categoriasInstructor
    )
  ) {
    return (
      'Categorías de certificado de instructor no válidas. ' +
      'Puede registrar A2 de forma independiente y una sola ' +
      'categoría adicional entre B1, B1 - C1, B2 - C2 o B3 - C3.'
    )
  }

  // ========================================================
  // CATEGORÍAS LICENCIA CONDUCCIÓN
  // ========================================================

  const categoriasConduccion =
    licenciasConduccion
      .map((item) =>
        item?.categoria
      )
      .filter(Boolean)

  if (
    !validarCategoriasInstructor(
      categoriasConduccion
    )
  ) {
    return (
      'Categorías de licencia de conducción no válidas. ' +
      'Puede registrar A2 de forma independiente y una sola ' +
      'categoría adicional entre B1, B1 - C1, B2 - C2 o B3 - C3.'
    )
  }

  // ========================================================
  // CAMPOS CERTIFICADOS
  // ========================================================

  for (
    const item of
    certificadosInstructor
  ) {
    const categoria =
      normalizarTexto(
        item?.categoria
      )

    if (!categoria) {
      continue
    }

    if (
      !CATEGORIAS_PERMITIDAS.includes(
        categoria
      )
    ) {
      return (
        `La categoría ${categoria} no es válida para certificado de instructor.`
      )
    }

    if (
      !normalizarTexto(
        item?.numero_certificado
      ) ||
      !item?.vigencia
    ) {
      return (
        'Debe diligenciar categoría, número de certificado ' +
        'y vigencia del certificado de instructor.'
      )
    }
  }

  // ========================================================
  // CAMPOS LICENCIAS CONDUCCIÓN
  // ========================================================

  for (
    const item of
    licenciasConduccion
  ) {
    const categoria =
      normalizarTexto(
        item?.categoria
      )

    if (!categoria) {
      continue
    }

    if (
      !CATEGORIAS_PERMITIDAS.includes(
        categoria
      )
    ) {
      return (
        `La categoría ${categoria} no es válida para licencia de conducción.`
      )
    }

    if (!item?.vigencia) {
      return (
        'Debe diligenciar categoría y vigencia ' +
        'de la licencia de conducción.'
      )
    }
  }

  return ''
}

// ============================================================
// PREPARAR LICENCIAS PARA INSERT
// ============================================================

function prepararLicencias({
  personalId,
  documento,
  nombres,
  apellidos,
  licencias,
  actualizadoPor,
  rolLicencia,
}) {
  // La persona no cumple funciones de instructor.
  // No se permite generar registros desde este flujo.
  if (!rolLicencia) {
    return []
  }

  const registros = []

  const nombreCompleto =
    `${nombres} ${apellidos}`
      .replace(/\s+/g, ' ')
      .trim()

  const certificadosInstructor =
    Array.isArray(
      licencias
        ?.certificados_instructor
    )
      ? licencias
          .certificados_instructor
      : []

  const licenciasConduccion =
    Array.isArray(
      licencias
        ?.licencias_conduccion
    )
      ? licencias
          .licencias_conduccion
      : []

  const fechaActualizacion =
    new Date()
      .toISOString()
      .slice(0, 10)

  // ========================================================
  // CERTIFICADOS DE INSTRUCTOR
  // ========================================================

  for (
    const item of
    certificadosInstructor
  ) {
    const categoria =
      normalizarTexto(
        item?.categoria
      )

    if (!categoria) {
      continue
    }

    registros.push({
      personal_id:
        personalId,

      nombre_completo:
        nombreCompleto,

      documento,

      rol:
        rolLicencia,

      categoria,

      tipo_licencia:
        'INSTRUCTOR',

      numero_certificado:
        normalizarTexto(
          item?.numero_certificado
        ),

      vigencia:
        item?.vigencia ||
        null,

      fecha_actualizacion:
        fechaActualizacion,

      nombre_quien_actualiza:
        actualizadoPor,

      observaciones:
        null,
    })
  }

  // ========================================================
  // LICENCIAS DE CONDUCCIÓN
  // ========================================================

  for (
    const item of
    licenciasConduccion
  ) {
    const categoria =
      normalizarTexto(
        item?.categoria
      )

    if (!categoria) {
      continue
    }

    registros.push({
      personal_id:
        personalId,

      nombre_completo:
        nombreCompleto,

      documento,

      rol:
        rolLicencia,

      categoria,

      tipo_licencia:
        'CONDUCCION',

      numero_certificado:
        null,

      vigencia:
        item?.vigencia ||
        null,

      fecha_actualizacion:
        fechaActualizacion,

      nombre_quien_actualiza:
        actualizadoPor,

      observaciones:
        null,
    })
  }

  return registros
}

// ============================================================
// RESPUESTA ERROR MULTIEMPRESA
// ============================================================

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
// GET
// ============================================================

export async function GET(request) {
  try {
    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request
      )

    const {
      data,
      error,
    } = await supabase
      .from('personal')
      .select(`
        id,
        documento,
        nombres,
        apellidos,
        email,
        telefono,
        cargo,
        grupo_personal,
        tipo_personal,
        estado,
        rol_conductor_instructor,
        tipo_vehiculo_rol,
        created_at,
        cuentas_usuario (
          id,
          estado
        ),
        perfiles_usuario (
          id,
          rol,
          menu_tipo,
          estado
        )
      `)
      .order(
        'created_at',
        {
          ascending: false,
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

    const personal =
      (data || []).map(
        (item) => ({
          ...item,

          cuenta:
            Array.isArray(
              item.cuentas_usuario
            )
              ? (
                  item
                    .cuentas_usuario[0] ||
                  null
                )
              : (
                  item
                    .cuentas_usuario ||
                  null
                ),

          perfiles:
            item
              .perfiles_usuario ||
            [],
        })
      )

    return NextResponse.json({
      status:
        'success',

      personal,
    })
  } catch (error) {
    console.error(
      'Error GET /api/personal:',
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

export async function POST(request) {
  try {
    const body =
      await request.json()

    const {
      personal,
      perfiles,
      licencias,
    } = body

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request,
        body
      )

    // ========================================================
    // VALIDACIONES BÁSICAS PERSONAL
    // ========================================================

    if (
      !personal?.documento ||
      !personal?.nombres ||
      !personal?.apellidos ||
      !personal?.email
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'Faltan datos obligatorios del personal.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      !Array.isArray(
        perfiles
      )
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'Los perfiles enviados no son válidos.',
        },
        {
          status: 400,
        }
      )
    }

    // ========================================================
    // NORMALIZAR PERFILES
    // ========================================================

    const perfilesNormalizados =
      perfiles
        .map((rol) =>
          normalizarTexto(rol)
        )
        .filter(Boolean)

    const crearAcceso =
      perfilesNormalizados.length >
      0

    // ========================================================
    // CHECK "CUMPLE ROL DE INSTRUCTOR"
    // ========================================================

    const cumpleRolInstructor =
      Boolean(
        personal
          ?.rol_conductor_instructor
      )

    const rolLicencia =
      obtenerRolLicencia(
        perfilesNormalizados,
        cumpleRolInstructor
      )

    // ========================================================
    // VALIDAR LICENCIAS SOLO SI CUMPLE ROL INSTRUCTOR
    // ========================================================

    if (
      cumpleRolInstructor
    ) {
      const mensajeLicencias =
        validarDatosLicencias(
          licencias
        )

      if (
        mensajeLicencias
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              mensajeLicencias,
          },
          {
            status: 400,
          }
        )
      }
    }

    // ========================================================
    // SI NO CUMPLE ROL INSTRUCTOR, NO DEBE ENVIAR LICENCIAS
    // ========================================================

    if (
      !cumpleRolInstructor
    ) {
      const certificados =
        Array.isArray(
          licencias
            ?.certificados_instructor
        )
          ? licencias
              .certificados_instructor
          : []

      const conduccion =
        Array.isArray(
          licencias
            ?.licencias_conduccion
        )
          ? licencias
              .licencias_conduccion
          : []

      const tieneDatosLicencia =
        certificados.length > 0 ||
        conduccion.length > 0

      if (
        tieneDatosLicencia
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'No se pueden registrar licencias o certificados porque la persona no está marcada como instructor en el trabajo.',
          },
          {
            status: 400,
          }
        )
      }
    }

    // ========================================================
    // NORMALIZAR DATOS
    // ========================================================

    const documento =
      normalizarTexto(
        personal.documento
      )

    const nombres =
      normalizarTexto(
        personal.nombres
      )

    const apellidos =
      normalizarTexto(
        personal.apellidos
      )

    const email =
      normalizarEmail(
        personal.email
      )

    const actualizadoPor =
      body.creado_por_nombre ||
      'ADMINISTRATIVO'

    // ========================================================
    // VALIDAR DOCUMENTO DUPLICADO
    // ========================================================

    const {
      data:
        existeDocumento,
      error:
        buscarError,
    } = await supabase
      .from('personal')
      .select('id')
      .eq(
        'documento',
        documento
      )
      .maybeSingle()

    if (buscarError) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            buscarError.message,
        },
        {
          status: 500,
        }
      )
    }

    if (
      existeDocumento
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'Ya existe personal registrado con ese documento.',
        },
        {
          status: 409,
        }
      )
    }

    // ========================================================
    // TIPO VEHÍCULO ROL
    // ========================================================

    const tipoVehiculoRol =
      Array.isArray(
        personal.tipo_vehiculo_rol
      )
        ? personal
            .tipo_vehiculo_rol
            .map((item) =>
              normalizarTexto(item)
            )
            .filter(Boolean)
            .join(', ')
        : normalizarTexto(
            personal.tipo_vehiculo_rol
          )

    // ========================================================
    // CREAR PERSONAL
    // ========================================================

    const {
      data:
        nuevoPersonal,
      error:
        personalError,
    } =
      await supabase
        .from('personal')
        .insert({
          tipo_personal:
            personal.tipo_personal,

          tipo_documento:
            personal.tipo_documento ||
            'CC',

          documento,

          nombres,

          apellidos,

          fecha_nacimiento:
            personal.fecha_nacimiento ||
            null,

          genero:
            personal.genero ||
            null,

          tipo_sangre:
            personal.tipo_sangre ||
            null,

          estado_civil:
            personal.estado_civil ||
            null,

          escolaridad:
            personal.escolaridad ||
            null,

          profesion:
            normalizarTexto(
              personal.profesion
            ),

          nacionalidad:
            normalizarTexto(
              personal.nacionalidad
            ),

          departamento_residencia:
            normalizarTexto(
              personal
                .departamento_residencia
            ),

          ciudad_residencia:
            normalizarTexto(
              personal
                .ciudad_residencia
            ),

          direccion:
            normalizarTexto(
              personal.direccion
            ),

          telefono:
            personal.telefono ||
            null,

          email,

          cargo:
            normalizarTexto(
              personal.cargo
            ),

          grupo_personal:
            personal.grupo_personal,

          tipo_contrato:
            personal.tipo_contrato,

          tipo_permanencia:
            personal.tipo_permanencia,

          fecha_vinculacion:
            personal.fecha_vinculacion ||
            null,

          fecha_retiro:
            personal.fecha_retiro ||
            null,

          estado:
            personal.estado ||
            'activo',

          eps:
            normalizarTexto(
              personal.eps
            ),

          arl:
            normalizarTexto(
              personal.arl
            ),

          fondo_pension:
            normalizarTexto(
              personal
                .fondo_pension
            ),

          numero_hijos:
            personal.numero_hijos ===
              '' ||
            personal.numero_hijos ===
              null ||
            personal.numero_hijos ===
              undefined
              ? null
              : Number(
                  personal.numero_hijos
                ),

          contacto_emergencia_nombre:
            normalizarTexto(
              personal
                .contacto_emergencia_nombre
            ),

          contacto_emergencia_parentesco:
            normalizarTexto(
              personal
                .contacto_emergencia_parentesco
            ),

          contacto_emergencia_telefono:
            personal
              .contacto_emergencia_telefono ||
            null,

          medio_transporte_trabajo:
            normalizarTexto(
              personal
                .medio_transporte_trabajo
            ),

          rol_conductor_instructor:
            cumpleRolInstructor,

          tipo_vehiculo_rol:
            cumpleRolInstructor
              ? (
                  tipoVehiculoRol ||
                  null
                )
              : null,

          perfil_profesional:
            personal.perfil_profesional ||
            null,

          observaciones:
            personal.observaciones ||
            null,
        })
        .select()
        .single()

    if (
      personalError
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            personalError.message,
        },
        {
          status: 500,
        }
      )
    }

    // ========================================================
    // CREAR CUENTA Y PERFILES
    // ========================================================

    if (
      crearAcceso
    ) {
      const {
        data: cuenta,
        error:
          cuentaError,
      } =
        await supabase
          .from(
            'cuentas_usuario'
          )
          .insert({
            personal_id:
              nuevoPersonal.id,

            documento,

            usuario_login:
              documento,

            email,

            email_autorizado:
              email,

            estado:
              'pre_autorizado',

            creado_por_nombre:
              actualizadoPor,

            observaciones:
              'Cuenta preautorizada desde módulo de personal',
          })
          .select()
          .single()

      if (
        cuentaError
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              cuentaError.message,
          },
          {
            status: 500,
          }
        )
      }

      const perfilesInsert =
        perfilesNormalizados.map(
          (rol) => ({
            cuenta_usuario_id:
              cuenta.id,

            personal_id:
              nuevoPersonal.id,

            rol,

            menu_tipo:
              menuPorRol(rol),

            estado:
              'activo',

            asignado_por_nombre:
              actualizadoPor,
          })
        )

      const {
        error:
          perfilesError,
      } =
        await supabase
          .from(
            'perfiles_usuario'
          )
          .insert(
            perfilesInsert
          )

      if (
        perfilesError
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              perfilesError.message,
          },
          {
            status: 500,
          }
        )
      }
    }

    // ========================================================
    // CREAR LICENCIAS SOLO PARA PERSONA MARCADA COMO INSTRUCTOR
    // ========================================================

    const registrosLicencias =
      cumpleRolInstructor
        ? prepararLicencias({
            personalId:
              nuevoPersonal.id,

            documento,

            nombres,

            apellidos,

            licencias,

            actualizadoPor,

            rolLicencia,
          })
        : []

    if (
      registrosLicencias.length >
      0
    ) {
      const {
        error:
          licenciasError,
      } =
        await supabase
          .from(
            'licencias_personal'
          )
          .insert(
            registrosLicencias
          )

      if (
        licenciasError
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              licenciasError.message,
          },
          {
            status: 500,
          }
        )
      }
    }

    // ========================================================
    // RESPUESTA
    // ========================================================

    return NextResponse.json(
      {
        status:
          'success',

        message:
          'Personal registrado correctamente.',

        personal:
          nuevoPersonal,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      'Error POST /api/personal:',
      error
    )

    return respuestaError(
      error
    )
  }
}