// app/api/admin/consultas/horarios/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const ESTADO_ABIERTO = 'Abierto'
const ESTADO_CERRADO = 'Cerrado'
const ESTADO_NO_CERRADO = 'No Cerrado'

const ROL_INSTRUCTOR_PRACTICA = 'INSTRUCTOR PRÁCTICA'
const ROL_INSTRUCTOR_TEORIA = 'INSTRUCTOR TEORÍA'
const ROL_AUXILIAR_ADMINISTRATIVO = 'AUXILIAR ADMINISTRATIVO'

// =========================================================
// HELPERS
// =========================================================

function respuestaError(error) {
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

function normalizarTexto(valor) {
  return String(
    valor || ''
  ).trim()
}

function normalizarMayusculas(valor) {
  return String(
    valor || ''
  )
    .trim()
    .toUpperCase()
}

function quitarTildes(valor) {
  return String(
    valor || ''
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
}

function normalizarRol(valor) {
  const rolOriginal =
    normalizarMayusculas(
      valor
    )
      .replace(
        /_/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )

  const rolSinTildes =
    quitarTildes(
      rolOriginal
    )

  if (
    rolSinTildes ===
    'INSTRUCTOR PRACTICA'
  ) {
    return ROL_INSTRUCTOR_PRACTICA
  }

  if (
    rolSinTildes ===
    'INSTRUCTOR TEORIA'
  ) {
    return ROL_INSTRUCTOR_TEORIA
  }

  if (
    rolSinTildes ===
    'AUXILIAR ADMINISTRATIVO'
  ) {
    return ROL_AUXILIAR_ADMINISTRATIVO
  }

  return rolOriginal
}

function rolesEquivalentes(
  rolA,
  rolB
) {
  return (
    normalizarRol(
      rolA
    ) ===
    normalizarRol(
      rolB
    )
  )
}

function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(
      fecha || ''
    )
  )
}

function num(valor) {
  const numero =
    Number(
      valor
    )

  return Number.isFinite(
    numero
  )
    ? numero
    : 0
}

// =========================================================
// VALIDAR RANGO
// =========================================================

function validarRango(
  fechaInicio,
  fechaFin
) {
  if (
    !fechaInicio ||
    !fechaFin
  ) {
    return 'Debe seleccionar fecha inicial y fecha final.'
  }

  if (
    !fechaValida(
      fechaInicio
    ) ||
    !fechaValida(
      fechaFin
    )
  ) {
    return 'El rango de fechas no es válido.'
  }

  if (
    fechaFin <
    fechaInicio
  ) {
    return 'La fecha final no puede ser anterior a la fecha inicial.'
  }

  return ''
}

// =========================================================
// OBTENER FUNCIONARIOS DESDE PERSONAL + PERFILES_USUARIO
// =========================================================
//
// IMPORTANTE:
//
// Esta consulta NO usa:
//
// - usuarios
// - horarios
//
// La fuente maestra es:
//
// personal
// perfiles_usuario
//
// Tampoco filtramos por:
// - personal.estado
// - perfiles_usuario.estado
//
// porque esta pantalla permite consultas históricas.
// Una persona retirada debe continuar disponible para
// consultar sus jornadas anteriores.
//
// =========================================================

async function obtenerFuncionarios(
  supabase,
  rol = ''
) {
  const rolNormalizado =
    normalizarRol(
      rol
    )

  if (
    !rolNormalizado
  ) {
    return []
  }

  // =====================================================
  // 1. CONSULTAR PERFILES
  // =====================================================
  //
  // No usamos .eq('rol', rol) directamente porque pueden
  // existir registros históricos con:
  //
  // INSTRUCTOR PRÁCTICA
  // INSTRUCTOR_PRACTICA
  // INSTRUCTOR PRACTICA
  //
  // Los normalizamos en JS.
  // =====================================================

  const {
    data:
      perfilesData,
    error:
      perfilesError,
  } =
    await supabase
      .from(
        'perfiles_usuario'
      )
      .select(`
        id,
        personal_id,
        rol,
        estado
      `)

  if (
    perfilesError
  ) {
    throw new Error(
      `No fue posible consultar los perfiles del personal: ${perfilesError.message}`
    )
  }

  const perfilesCoincidentes =
    (
      Array.isArray(
        perfilesData
      )
        ? perfilesData
        : []
    ).filter(
      (perfil) =>
        perfil
          ?.personal_id &&
        rolesEquivalentes(
          perfil?.rol,
          rolNormalizado
        )
    )

  if (
    perfilesCoincidentes.length ===
    0
  ) {
    return []
  }

  // =====================================================
  // 2. IDS ÚNICOS DE PERSONAL
  // =====================================================

  const idsPersonal =
    Array.from(
      new Set(
        perfilesCoincidentes
          .map(
            (perfil) =>
              Number(
                perfil
                  .personal_id
              )
          )
          .filter(
            (id) =>
              Number.isInteger(
                id
              ) &&
              id > 0
          )
      )
    )

  if (
    idsPersonal.length ===
    0
  ) {
    return []
  }

  // =====================================================
  // 3. CONSULTAR PERSONAL
  // =====================================================

  const {
    data:
      personalData,
    error:
      personalError,
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
        estado
      `)
      .in(
        'id',
        idsPersonal
      )

  if (
    personalError
  ) {
    throw new Error(
      `No fue posible consultar el personal: ${personalError.message}`
    )
  }

  // =====================================================
  // 4. CONSTRUIR LISTA ÚNICA
  // =====================================================

  const mapa =
    new Map()

  for (
    const persona of
      Array.isArray(
        personalData
      )
        ? personalData
        : []
  ) {
    const nombres =
      normalizarTexto(
        persona?.nombres
      )

    const apellidos =
      normalizarTexto(
        persona?.apellidos
      )

    const nombreCompleto =
      `${nombres} ${apellidos}`
        .replace(
          /\s+/g,
          ' '
        )
        .trim()

    if (
      !nombreCompleto
    ) {
      continue
    }

    const clave =
      nombreCompleto
        .toUpperCase()

    if (
      mapa.has(
        clave
      )
    ) {
      continue
    }

    mapa.set(
      clave,
      {
        personal_id:
          persona.id,

        documento:
          persona.documento ||
          '',

        nombre_completo:
          nombreCompleto,

        rol:
          rolNormalizado,

        estado_personal:
          persona.estado ||
          '',
      }
    )
  }

  return Array.from(
    mapa.values()
  ).sort(
    (
      a,
      b
    ) =>
      a
        .nombre_completo
        .localeCompare(
          b
            .nombre_completo,
          'es'
        )
  )
}

// =========================================================
// CONSULTAR JORNADAS
// =========================================================

async function consultarJornadas({
  supabase,
  fechaInicio,
  fechaFin,
  rol = '',
  nombreCompleto = '',
  soloNoCerrados = false,
}) {
  let consulta =
    supabase
      .from(
        'horarios'
      )
      .select(`
        id,
        fecha_entrada,
        hora_entrada,
        fecha_salida,
        hora_salida,
        nombre_completo,
        usuario,
        rol,
        placa,
        clases_programadas,
        clases_dictadas,
        num_aprendices,
        estado_registro
      `)
      .gte(
        'fecha_entrada',
        fechaInicio
      )
      .lte(
        'fecha_entrada',
        fechaFin
      )

  if (
    soloNoCerrados
  ) {
    consulta =
      consulta.eq(
        'estado_registro',
        ESTADO_NO_CERRADO
      )
  }

  if (
    nombreCompleto
  ) {
    consulta =
      consulta.eq(
        'nombre_completo',
        nombreCompleto
      )
  }

  const {
    data,
    error,
  } =
    await consulta
      .order(
        'fecha_entrada',
        {
          ascending:
            false,
        }
      )
      .order(
        'hora_entrada',
        {
          ascending:
            false,
        }
      )

  if (error) {
    throw new Error(
      `No fue posible consultar las jornadas: ${error.message}`
    )
  }

  let jornadas =
    Array.isArray(
      data
    )
      ? data
      : []

  // =====================================================
  // FILTRAR ROL EN JAVASCRIPT
  // =====================================================
  //
  // Esto permite compatibilidad con registros históricos:
  //
  // INSTRUCTOR PRÁCTICA
  // INSTRUCTOR_PRACTICA
  // INSTRUCTOR PRACTICA
  //
  // =====================================================

  if (
    rol
  ) {
    jornadas =
      jornadas.filter(
        (item) =>
          rolesEquivalentes(
            item?.rol,
            rol
          )
      )
  }

  return jornadas
}

// =========================================================
// PROCESAR SEGUIMIENTO INDIVIDUAL
// =========================================================

function construirSeguimiento(
  jornadas,
  rol
) {
  let cerradas =
    0

  let abiertas =
    0

  let noCerradas =
    0

  let clasesDictadas =
    0

  let aprendices =
    0

  const vehiculos =
    new Set()

  const dias =
    new Set()

  const jornadasProcesadas =
    jornadas.map(
      (item) => {
        const estado =
          normalizarTexto(
            item
              ?.estado_registro
          )

        if (
          estado ===
          ESTADO_CERRADO
        ) {
          cerradas +=
            1
        }

        if (
          estado ===
          ESTADO_ABIERTO
        ) {
          abiertas +=
            1
        }

        if (
          estado ===
          ESTADO_NO_CERRADO
        ) {
          noCerradas +=
            1
        }

        if (
          item
            ?.fecha_entrada
        ) {
          dias.add(
            item.fecha_entrada
          )
        }

        const rolNormalizado =
          normalizarRol(
            item?.rol ||
            rol
          )

        if (
          rolNormalizado ===
          ROL_INSTRUCTOR_PRACTICA
        ) {
          clasesDictadas +=
            num(
              item
                ?.clases_dictadas
            )

          aprendices +=
            num(
              item
                ?.num_aprendices
            )

          const placa =
            normalizarTexto(
              item?.placa
            )

          if (
            placa
          ) {
            vehiculos.add(
              placa
            )
          }
        }

        return {
          id:
            item.id,

          fecha_entrada:
            item
              .fecha_entrada ||
            '',

          hora_entrada:
            item
              .hora_entrada ||
            '',

          fecha_salida:
            item
              .fecha_salida ||
            '',

          hora_salida:
            item
              .hora_salida ||
            '',

          nombre_completo:
            item
              .nombre_completo ||
            '',

          usuario:
            item.usuario ||
            '',

          rol:
            rolNormalizado,

          placa:
            item.placa ||
            '',

          clases_programadas:
            num(
              item
                .clases_programadas
            ),

          clases_dictadas:
            num(
              item
                .clases_dictadas
            ),

          num_aprendices:
            num(
              item
                .num_aprendices
            ),

          estado_registro:
            estado,
        }
      }
    )

  return {
    resumen: {
      total_jornadas:
        jornadas.length,

      total_dias_reportados:
        dias.size,

      cerradas,

      abiertas,

      no_cerradas:
        noCerradas,

      clases_dictadas:
        clasesDictadas,

      aprendices,

      vehiculos:
        Array.from(
          vehiculos
        ).sort(),
    },

    jornadas:
      jornadasProcesadas,
  }
}

// =========================================================
// AGRUPAR NO CERRADOS POR ROL
// =========================================================

function agruparNoCerrados(
  jornadas
) {
  const grupos = {
    instructor_practica: {
      rol:
        ROL_INSTRUCTOR_PRACTICA,

      total:
        0,

      funcionarios:
        [],
    },

    instructor_teoria: {
      rol:
        ROL_INSTRUCTOR_TEORIA,

      total:
        0,

      funcionarios:
        [],
    },

    auxiliar_administrativo: {
      rol:
        ROL_AUXILIAR_ADMINISTRATIVO,

      total:
        0,

      funcionarios:
        [],
    },
  }

  const mapas = {
    instructor_practica:
      new Map(),

    instructor_teoria:
      new Map(),

    auxiliar_administrativo:
      new Map(),
  }

  function obtenerClaveGrupo(
    rol
  ) {
    const rolNormalizado =
      normalizarRol(
        rol
      )

    if (
      rolNormalizado ===
      ROL_INSTRUCTOR_PRACTICA
    ) {
      return 'instructor_practica'
    }

    if (
      rolNormalizado ===
      ROL_INSTRUCTOR_TEORIA
    ) {
      return 'instructor_teoria'
    }

    if (
      rolNormalizado ===
      ROL_AUXILIAR_ADMINISTRATIVO
    ) {
      return 'auxiliar_administrativo'
    }

    return null
  }

  for (
    const item of
      jornadas
  ) {
    const claveGrupo =
      obtenerClaveGrupo(
        item?.rol
      )

    if (
      !claveGrupo
    ) {
      continue
    }

    const nombre =
      normalizarTexto(
        item
          ?.nombre_completo
      ) ||
      'SIN NOMBRE'

    const claveNombre =
      nombre.toUpperCase()

    let funcionario =
      mapas[
        claveGrupo
      ].get(
        claveNombre
      )

    if (
      !funcionario
    ) {
      funcionario = {
        nombre_completo:
          nombre,

        total:
          0,

        jornadas:
          [],
      }

      mapas[
        claveGrupo
      ].set(
        claveNombre,
        funcionario
      )
    }

    funcionario.total +=
      1

    funcionario.jornadas.push({
      id:
        item.id,

      fecha_entrada:
        item
          .fecha_entrada ||
        '',

      hora_entrada:
        item
          .hora_entrada ||
        '',

      placa:
        item.placa ||
        '',

      estado_registro:
        ESTADO_NO_CERRADO,
    })

    grupos[
      claveGrupo
    ].total +=
      1
  }

  for (
    const clave of
      Object.keys(
        grupos
      )
  ) {
    grupos[
      clave
    ].funcionarios =
      Array.from(
        mapas[
          clave
        ].values()
      )
        .map(
          (funcionario) => ({
            ...funcionario,

            jornadas:
              funcionario
                .jornadas
                .sort(
                  (
                    a,
                    b
                  ) => {
                    const fechaA =
                      `${a.fecha_entrada} ${a.hora_entrada}`

                    const fechaB =
                      `${b.fecha_entrada} ${b.hora_entrada}`

                    return fechaB.localeCompare(
                      fechaA
                    )
                  }
                ),
          })
        )
        .sort(
          (
            a,
            b
          ) =>
            a
              .nombre_completo
              .localeCompare(
                b
                  .nombre_completo,
                'es'
              )
        )
  }

  return {
    grupos,

    total_general:
      grupos
        .instructor_practica
        .total +
      grupos
        .instructor_teoria
        .total +
      grupos
        .auxiliar_administrativo
        .total,
  }
}

// =========================================================
// GET
// =========================================================
//
// RECURSOS:
//
// funcionarios
// seguimiento
// no_cerrados
//
// =========================================================

export async function GET(request) {
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
      ) ||
      'funcionarios'

    // =====================================================
    // FUNCIONARIOS
    // =====================================================

    if (
      recurso ===
      'funcionarios'
    ) {
      const rol =
        normalizarRol(
          searchParams.get(
            'rol'
          )
        )

      if (
        !rol
      ) {
        return NextResponse.json(
          {
            status:
              'success',

            funcionarios:
              [],
          }
        )
      }

      const funcionarios =
        await obtenerFuncionarios(
          supabase,
          rol
        )

      return NextResponse.json({
        status:
          'success',

        funcionarios,
      })
    }

    // =====================================================
    // VARIABLES DE RANGO
    // =====================================================

    const fechaInicio =
      normalizarTexto(
        searchParams.get(
          'fecha_inicio'
        )
      )

    const fechaFin =
      normalizarTexto(
        searchParams.get(
          'fecha_fin'
        )
      )

    const errorRango =
      validarRango(
        fechaInicio,
        fechaFin
      )

    if (
      errorRango
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            errorRango,
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // SEGUIMIENTO INDIVIDUAL
    // =====================================================

    if (
      recurso ===
      'seguimiento'
    ) {
      const rol =
        normalizarRol(
          searchParams.get(
            'rol'
          )
        )

      const nombreCompleto =
        normalizarTexto(
          searchParams.get(
            'nombre_completo'
          )
        )

      if (
        !rol
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Debe seleccionar el rol del funcionario.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        !nombreCompleto
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Debe seleccionar el funcionario que desea consultar.',
          },
          {
            status:
              400,
          }
        )
      }

      const jornadas =
        await consultarJornadas({
          supabase,

          fechaInicio,

          fechaFin,

          rol,

          nombreCompleto,
        })

      const {
        resumen,
        jornadas:
          jornadasProcesadas,
      } =
        construirSeguimiento(
          jornadas,
          rol
        )

      return NextResponse.json({
        status:
          'success',

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            empresa?.nombre ||
            empresa?.nombre_empresa ||
            empresa?.razon_social ||
            '',
        },

        funcionario: {
          nombre_completo:
            nombreCompleto,

          rol,
        },

        periodo: {
          desde:
            fechaInicio,

          hasta:
            fechaFin,
        },

        resumen,

        jornadas:
          jornadasProcesadas,
      })
    }

    // =====================================================
    // REPORTE GENERAL NO CERRADOS
    // =====================================================

    if (
      recurso ===
      'no_cerrados'
    ) {
      const jornadas =
        await consultarJornadas({
          supabase,

          fechaInicio,

          fechaFin,

          soloNoCerrados:
            true,
        })

      const {
        grupos,
        total_general,
      } =
        agruparNoCerrados(
          jornadas
        )

      // ===================================================
      // CONTAR FUNCIONARIOS ÚNICOS POR NOMBRE + ROL
      // ===================================================

      const funcionariosAfectados =
        new Set(
          jornadas
            .map(
              (item) => {
                const nombre =
                  normalizarTexto(
                    item
                      ?.nombre_completo
                  )

                const rol =
                  normalizarRol(
                    item?.rol
                  )

                if (
                  !nombre ||
                  !rol
                ) {
                  return ''
                }

                return `${rol}|${nombre.toUpperCase()}`
              }
            )
            .filter(
              Boolean
            )
        )

      return NextResponse.json({
        status:
          'success',

        empresa: {
          nit:
            empresa?.nit ||
            '',

          nombre:
            empresa?.nombre ||
            empresa?.nombre_empresa ||
            empresa?.razon_social ||
            '',
        },

        periodo: {
          desde:
            fechaInicio,

          hasta:
            fechaFin,
        },

        grupos,

        total_general,

        total_funcionarios_afectados:
          funcionariosAfectados.size,

        mensaje_resumen:
          total_general > 0
            ? `Durante el período consultado se identificaron ${total_general} jornadas en estado No Cerrado correspondientes a ${funcionariosAfectados.size} funcionarios.`
            : 'Durante el período consultado no se identificaron jornadas en estado No Cerrado.',
      })
    }

    // =====================================================
    // RECURSO NO VÁLIDO
    // =====================================================

    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'Recurso no válido.',
      },
      {
        status:
          400,
      }
    )
  } catch (error) {
    console.error(
      'Error GET /api/admin/consultas/horarios:',
      error
    )

    return respuestaError(
      error
    )
  }
}