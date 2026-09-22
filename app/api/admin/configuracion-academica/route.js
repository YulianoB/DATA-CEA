// app/api/admin/configuracion-academica/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
} from '@/lib/supabaseEmpresaServer'


// ============================================================
// UTILIDADES
// ============================================================

function texto(valor) {
  return String(
    valor ?? ''
  ).trim()
}


function mayusculas(valor) {
  return texto(
    valor
  ).toUpperCase()
}


function numeroPositivoONull(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null
  }

  const numero =
    Number(valor)

  if (
    !Number.isFinite(
      numero
    ) ||
    numero <= 0
  ) {
    return NaN
  }

  return numero
}


function obtenerCategoriasHabilitadasEmpresa(
  empresa
) {
  if (
    !Array.isArray(
      empresa?.categorias_habilitadas
    )
  ) {
    return []
  }

  return empresa
    .categorias_habilitadas
    .map(
      (categoria) =>
        mayusculas(
          categoria
        )
    )
    .filter(Boolean)
}


function categoriaHabilitadaEmpresa(
  empresa,
  categoria
) {
  return obtenerCategoriasHabilitadasEmpresa(
    empresa
  ).includes(
    mayusculas(
      categoria
    )
  )
}


function respuestaCategoriaNoHabilitada(
  empresa,
  categoria
) {
  const categoriaNormalizada =
    mayusculas(
      categoria
    )

  const nivel =
    texto(
      empresa?.nivel_cea
    ) ||
    'nivel configurado'

  return NextResponse.json(
    {
      ok: false,

      error:
        `La categoría ${categoriaNormalizada || 'indicada'} no está habilitada para ${nivel}.`,
    },
    {
      status: 403,
    }
  )
}


function respuestaError(
  error,
  mensajeDefecto =
    'Error interno del servidor.'
) {
  console.error(
    error
  )

  return NextResponse.json(
    {
      ok: false,

      error:
        error?.message ||
        mensajeDefecto,
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


// ============================================================
// NORMALIZAR IDS
// ============================================================

function normalizarIds(
  valores
) {
  if (
    !Array.isArray(
      valores
    )
  ) {
    return []
  }

  return Array.from(
    new Set(
      valores
        .map(
          (valor) =>
            Number(valor)
        )
        .filter(
          (valor) =>
            Number.isInteger(
              valor
            ) &&
            valor > 0
        )
    )
  )
}


// ============================================================
// ASEGURAR ESTRUCTURA C3
// ============================================================

async function asegurarEstructuraC3({
  supabase,
  empresa,
}) {
  if (
    !categoriaHabilitadaEmpresa(
      empresa,
      'C3'
    )
  ) {
    return {
      creado: false,
      plan: null,
    }
  }

  const {
    data: planExistente,
    error:
      errorPlanExistente,
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
        estado
      `)
      .eq(
        'categoria',
        'C3'
      )
      .eq(
        'version',
        '01'
      )
      .maybeSingle()

  if (
    errorPlanExistente
  ) {
    console.error(
      'Error consultando plan C3:',
      errorPlanExistente
    )

    throw new Error(
      'No fue posible verificar la configuración académica de C3.'
    )
  }

  let plan =
    planExistente

  if (!plan) {
    const ahora =
      new Date().toISOString()

    const {
      data: planCreado,
      error:
        errorCrearPlan,
    } =
      await supabase
        .from(
          'planes_formacion'
        )
        .insert({
          categoria:
            'C3',

          nombre:
            'PLAN DE FORMACIÓN C3',

          version:
            '01',

          fecha_vigencia_desde:
            null,

          fecha_vigencia_hasta:
            null,

          estado:
            'ACTIVO',

          observaciones:
            'Estructura base creada automáticamente para CEA NIVEL III.',

          usuario_creacion:
            'SISTEMA',

          usuario_actualizacion:
            'SISTEMA',

          created_at:
            ahora,

          updated_at:
            ahora,
        })
        .select(`
          id,
          categoria,
          nombre,
          version,
          estado
        `)
        .single()

    if (
      errorCrearPlan
    ) {
      console.error(
        'Error creando plan C3:',
        errorCrearPlan
      )

      throw new Error(
        'No fue posible crear el plan de formación C3.'
      )
    }

    plan =
      planCreado
  }


  const modulosBase = [
    {
      codigo:
        'MOD-01',

      nombre:
        'SABERES ESENCIALES OBLIGATORIOS TRANSVERSALES',

      tipo_formacion:
        'TEORIA',

      orden:
        1,
    },

    {
      codigo:
        'MOD-02',

      nombre:
        'SABERES ESENCIALES OBLIGATORIOS ESPECÍFICOS',

      tipo_formacion:
        'TEORIA',

      orden:
        2,
    },

    {
      codigo:
        'MOD-03',

      nombre:
        'FORMACIÓN BÁSICA APLICADA',

      tipo_formacion:
        'TALLER',

      orden:
        3,
    },

    {
      codigo:
        'MOD-04',

      nombre:
        'FORMACIÓN ESPECÍFICA',

      tipo_formacion:
        'PRACTICA',

      orden:
        4,
    },
  ]


  const {
    data:
      modulosExistentes,
    error:
      errorModulos,
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
        activo
      `)
      .eq(
        'plan_formacion_id',
        plan.id
      )

  if (
    errorModulos
  ) {
    console.error(
      'Error consultando módulos C3:',
      errorModulos
    )

    throw new Error(
      'No fue posible consultar los módulos de C3.'
    )
  }


  const existentes =
    Array.isArray(
      modulosExistentes
    )
      ? modulosExistentes
      : []


  const faltantes =
    modulosBase.filter(
      (
        moduloBase
      ) => {
        return !existentes.some(
          (
            moduloExistente
          ) => {
            const mismoCodigo =
              mayusculas(
                moduloExistente.codigo
              ) ===
              mayusculas(
                moduloBase.codigo
              )

            const mismoNombre =
              mayusculas(
                moduloExistente.nombre
              ) ===
              mayusculas(
                moduloBase.nombre
              )

            const mismoTipo =
              mayusculas(
                moduloExistente.tipo_formacion
              ) ===
              mayusculas(
                moduloBase.tipo_formacion
              )

            return (
              mismoCodigo ||
              (
                mismoNombre &&
                mismoTipo
              )
            )
          }
        )
      }
    )


  if (
    faltantes.length
  ) {
    const ahora =
      new Date().toISOString()

    const registros =
      faltantes.map(
        (
          modulo
        ) => ({
          plan_formacion_id:
            plan.id,

          codigo:
            modulo.codigo,

          nombre:
            modulo.nombre,

          tipo_formacion:
            modulo.tipo_formacion,

          orden:
            modulo.orden,

          activo:
            true,

          observaciones:
            null,

          created_at:
            ahora,

          updated_at:
            ahora,
        })
      )

    const {
      error:
        errorInsertarModulos,
    } =
      await supabase
        .from(
          'modulos_formacion'
        )
        .insert(
          registros
        )

    if (
      errorInsertarModulos
    ) {
      console.error(
        'Error creando módulos C3:',
        errorInsertarModulos
      )

      throw new Error(
        'No fue posible crear los módulos base de C3.'
      )
    }
  }


  return {
    creado:
      !planExistente,

    plan,
  }
}


// ============================================================
// VALIDAR CLASES DE UN GRUPO TRANSVERSAL
// ============================================================

async function validarClasesGrupo({
  supabase,
  empresa,
  claseIds,
  tipoFormacion,
  grupoIdExcluir = null,
}) {
  const ids =
    normalizarIds(
      claseIds
    )

  if (
    ids.length < 2
  ) {
    throw new Error(
      'Un grupo transversal debe contener por lo menos dos clases.'
    )
  }


  const {
    data: clasesGrupo,
    error:
      errorClasesGrupo,
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
        nombre,
        activo
      `)
      .in(
        'id',
        ids
      )

  if (
    errorClasesGrupo
  ) {
    console.error(
      'Error consultando clases del grupo transversal:',
      errorClasesGrupo
    )

    throw new Error(
      'No fue posible validar las clases seleccionadas.'
    )
  }


  if (
    !Array.isArray(
      clasesGrupo
    ) ||
    clasesGrupo.length !==
      ids.length
  ) {
    throw new Error(
      'Una o más clases seleccionadas no existen.'
    )
  }


  const tipo =
    mayusculas(
      tipoFormacion
    )

  if (
    ![
      'TEORIA',
      'TALLER',
    ].includes(
      tipo
    )
  ) {
    throw new Error(
      'Los grupos transversales solo pueden ser de TEORIA o TALLER.'
    )
  }


  for (
    const clase of
      clasesGrupo
  ) {
    if (
      mayusculas(
        clase.tipo_formacion
      ) !==
      tipo
    ) {
      throw new Error(
        'Todas las clases del grupo deben pertenecer al mismo tipo de formación.'
      )
    }

    if (
      !categoriaHabilitadaEmpresa(
        empresa,
        clase.categoria
      )
    ) {
      const error =
        new Error(
          `La categoría ${clase.categoria} no está habilitada para el nivel actual del CEA.`
        )

      error.status =
        403

      throw error
    }

    if (
      clase.activo ===
      false
    ) {
      throw new Error(
        `La clase "${clase.nombre}" está inactiva y no puede agregarse al grupo transversal.`
      )
    }
  }


  const categorias =
    clasesGrupo.map(
      (clase) =>
        mayusculas(
          clase.categoria
        )
    )

  const categoriasUnicas =
    new Set(
      categorias
    )

  if (
    categoriasUnicas.size !==
    clasesGrupo.length
  ) {
    throw new Error(
      'Un grupo transversal no puede contener más de una clase de la misma categoría.'
    )
  }


  let consultaDetalle =
    supabase
      .from(
        'grupos_clases_formacion_detalle'
      )
      .select(`
        id,
        grupo_id,
        clase_formacion_id
      `)
      .in(
        'clase_formacion_id',
        ids
      )

  if (
    grupoIdExcluir
  ) {
    consultaDetalle =
      consultaDetalle.neq(
        'grupo_id',
        Number(
          grupoIdExcluir
        )
      )
  }

  const {
    data:
      relacionesExistentes,
    error:
      errorRelaciones,
  } =
    await consultaDetalle

  if (
    errorRelaciones
  ) {
    console.error(
      'Error validando relaciones transversales:',
      errorRelaciones
    )

    throw new Error(
      'No fue posible validar si las clases ya pertenecen a otro grupo.'
    )
  }


  if (
    Array.isArray(
      relacionesExistentes
    ) &&
    relacionesExistentes.length
  ) {
    throw new Error(
      'Una de las clases seleccionadas ya pertenece a otro grupo transversal.'
    )
  }


  return {
    ids,
    clases:
      clasesGrupo,
    tipo,
  }
}


// ============================================================
// CONSULTAR GRUPOS TRANSVERSALES
// ============================================================

async function consultarGruposTransversales({
  supabase,
  empresa,
  clasesPermitidas,
}) {
  const {
    data: grupos,
    error:
      errorGrupos,
  } =
    await supabase
      .from(
        'grupos_clases_formacion'
      )
      .select(`
        id,
        nombre,
        tipo_formacion,
        activo,
        observaciones,
        color_horario,
        usuario_creacion,
        usuario_actualizacion,
        created_at,
        updated_at
      `)
      .order(
        'tipo_formacion',
        {
          ascending: true,
        }
      )
      .order(
        'nombre',
        {
          ascending: true,
        }
      )

  if (
    errorGrupos
  ) {
    console.error(
      'Error consultando grupos transversales:',
      errorGrupos
    )

    throw new Error(
      'No fue posible consultar los grupos transversales.'
    )
  }


  const gruposLista =
    Array.isArray(
      grupos
    )
      ? grupos
      : []


  if (
    !gruposLista.length
  ) {
    return {
      grupos: [],
      detalles: [],
    }
  }


  const idsGrupos =
    gruposLista.map(
      (grupo) =>
        grupo.id
    )


  const {
    data: detalles,
    error:
      errorDetalles,
  } =
    await supabase
      .from(
        'grupos_clases_formacion_detalle'
      )
      .select(`
        id,
        grupo_id,
        clase_formacion_id,
        created_at
      `)
      .in(
        'grupo_id',
        idsGrupos
      )

  if (
    errorDetalles
  ) {
    console.error(
      'Error consultando detalle de grupos transversales:',
      errorDetalles
    )

    throw new Error(
      'No fue posible consultar las clases de los grupos transversales.'
    )
  }


  const clasesMapa =
    new Map(
      clasesPermitidas.map(
        (clase) => [
          Number(
            clase.id
          ),
          clase,
        ]
      )
    )


  const detallesPermitidos =
    (
      Array.isArray(
        detalles
      )
        ? detalles
        : []
    ).filter(
      (detalle) =>
        clasesMapa.has(
          Number(
            detalle.clase_formacion_id
          )
        )
    )


  const gruposConClases =
    gruposLista
      .map(
        (grupo) => {
          const relaciones =
            detallesPermitidos.filter(
              (detalle) =>
                Number(
                  detalle.grupo_id
                ) ===
                Number(
                  grupo.id
                )
            )

          const clasesGrupo =
            relaciones
              .map(
                (detalle) => {
                  const clase =
                    clasesMapa.get(
                      Number(
                        detalle.clase_formacion_id
                      )
                    )

                  if (!clase) {
                    return null
                  }

                  return {
                    ...clase,

                    grupo_detalle_id:
                      detalle.id,
                  }
                }
              )
              .filter(Boolean)
              .sort(
                (
                  a,
                  b
                ) =>
                  String(
                    a.categoria
                  ).localeCompare(
                    String(
                      b.categoria
                    )
                  )
              )

          return {
            ...grupo,

            clases:
              clasesGrupo,

            categorias:
              clasesGrupo.map(
                (clase) =>
                  clase.categoria
              ),
          }
        }
      )
      .filter(
        (grupo) =>
          grupo.clases.length >
          0
      )


  const idsGruposPermitidos =
    new Set(
      gruposConClases.map(
        (grupo) =>
          Number(
            grupo.id
          )
      )
    )


  return {
    grupos:
      gruposConClases,

    detalles:
      detallesPermitidos.filter(
        (detalle) =>
          idsGruposPermitidos.has(
            Number(
              detalle.grupo_id
            )
          )
      ),
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


    const categoriasHabilitadas =
      obtenerCategoriasHabilitadasEmpresa(
        empresa
      )


    if (
      !categoriasHabilitadas.length
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'El CEA no tiene categorías habilitadas según su nivel.',
        },
        {
          status: 500,
        }
      )
    }


    // ========================================================
    // C3 NIVEL III
    // ========================================================

    if (
      categoriasHabilitadas.includes(
        'C3'
      )
    ) {
      await asegurarEstructuraC3({
        supabase,
        empresa,
      })
    }


    // ========================================================
    // CONSULTAS PRINCIPALES
    // ========================================================

    const [
      resultadoPlanes,
      resultadoModulos,
      resultadoClases,
      resultadoRequisitos,
    ] =
      await Promise.all([
        supabase
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
            usuario_creacion,
            usuario_actualizacion,
            created_at,
            updated_at
          `)
          .order(
            'categoria',
            {
              ascending:
                true,
            }
          )
          .order(
            'version',
            {
              ascending:
                true,
            }
          ),

        supabase
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
          .order(
            'orden',
            {
              ascending:
                true,
            }
          ),

        supabase
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
            color_horario,
            created_at,
            updated_at
          `)
          .order(
            'orden',
            {
              ascending:
                true,
            }
          ),

        supabase
          .from(
            'runt_requisitos_categoria'
          )
          .select(`
            id,
            categoria,
            clases_teoria,
            clases_taller,
            clases_practica,
            limite_clases_dia,
            horas_mensuales_instructor,
            activo,
            created_at,
            updated_at
          `)
          .eq(
            'activo',
            true
          ),
      ])


    if (
      resultadoPlanes.error
    ) {
      console.error(
        'Error consultando planes:',
        resultadoPlanes.error
      )

      throw new Error(
        'No fue posible consultar los planes de formación.'
      )
    }


    if (
      resultadoModulos.error
    ) {
      console.error(
        'Error consultando módulos:',
        resultadoModulos.error
      )

      throw new Error(
        'No fue posible consultar los módulos de formación.'
      )
    }


    if (
      resultadoClases.error
    ) {
      console.error(
        'Error consultando clases:',
        resultadoClases.error
      )

      throw new Error(
        'No fue posible consultar las clases de formación.'
      )
    }


    if (
      resultadoRequisitos.error
    ) {
      console.error(
        'Error consultando requisitos:',
        resultadoRequisitos.error
      )

      throw new Error(
        'No fue posible consultar los requisitos académicos.'
      )
    }


    const planesTodos =
      Array.isArray(
        resultadoPlanes.data
      )
        ? resultadoPlanes.data
        : []


    const planes =
      planesTodos.filter(
        (plan) =>
          categoriasHabilitadas.includes(
            mayusculas(
              plan.categoria
            )
          )
      )


    const idsPlanes =
      new Set(
        planes.map(
          (plan) =>
            Number(
              plan.id
            )
        )
      )


    const modulos =
      (
        Array.isArray(
          resultadoModulos.data
        )
          ? resultadoModulos.data
          : []
      ).filter(
        (modulo) =>
          idsPlanes.has(
            Number(
              modulo.plan_formacion_id
            )
          )
      )


    const idsModulos =
      new Set(
        modulos.map(
          (modulo) =>
            Number(
              modulo.id
            )
        )
      )


    const clases =
      (
        Array.isArray(
          resultadoClases.data
        )
          ? resultadoClases.data
          : []
      ).filter(
        (clase) =>
          idsPlanes.has(
            Number(
              clase.plan_formacion_id
            )
          ) &&
          idsModulos.has(
            Number(
              clase.modulo_id
            )
          ) &&
          categoriasHabilitadas.includes(
            mayusculas(
              clase.categoria
            )
          )
      )


    const requisitos =
      (
        Array.isArray(
          resultadoRequisitos.data
        )
          ? resultadoRequisitos.data
          : []
      ).filter(
        (requisito) =>
          categoriasHabilitadas.includes(
            mayusculas(
              requisito.categoria
            )
          )
      )


    // ========================================================
    // GRUPOS TRANSVERSALES
    // ========================================================

    const clasesTransversalesPermitidas =
      clases.filter(
        (clase) =>
          [
            'TEORIA',
            'TALLER',
          ].includes(
            mayusculas(
              clase.tipo_formacion
            )
          )
      )


    const {
      grupos,
      detalles,
    } =
      await consultarGruposTransversales({
        supabase,
        empresa,
        clasesPermitidas:
          clasesTransversalesPermitidas,
      })


    // ========================================================
    // RESUMEN POR PLAN
    // ========================================================

    const planesResumen =
      planes.map(
        (plan) => {
          const clasesPlan =
            clases.filter(
              (clase) =>
                Number(
                  clase.plan_formacion_id
                ) ===
                Number(
                  plan.id
                ) &&
                clase.activo !==
                  false
            )


          const requisito =
            requisitos.find(
              (item) =>
                mayusculas(
                  item.categoria
                ) ===
                mayusculas(
                  plan.categoria
                )
            )


          const teoria =
            clasesPlan.filter(
              (clase) =>
                mayusculas(
                  clase.tipo_formacion
                ) ===
                'TEORIA'
            )


          const taller =
            clasesPlan.filter(
              (clase) =>
                mayusculas(
                  clase.tipo_formacion
                ) ===
                'TALLER'
            )


          const practica =
            clasesPlan.filter(
              (clase) =>
                mayusculas(
                  clase.tipo_formacion
                ) ===
                'PRACTICA'
            )


          const horasTeoria =
            teoria.reduce(
              (
                total,
                clase
              ) =>
                total +
                (
                  Number(
                    clase.duracion_horas
                  ) ||
                  0
                ),
              0
            )


          const horasTaller =
            taller.reduce(
              (
                total,
                clase
              ) =>
                total +
                (
                  Number(
                    clase.duracion_horas
                  ) ||
                  0
                ),
              0
            )


          return {
            ...plan,

            resumen: {
              teoria: {
                tematicas:
                  teoria.length,

                horas_configuradas:
                  horasTeoria,

                horas_requeridas:
                  requisito
                    ? Number(
                        requisito.clases_teoria
                      )
                    : null,
              },

              taller: {
                tematicas:
                  taller.length,

                horas_configuradas:
                  horasTaller,

                horas_requeridas:
                  requisito
                    ? Number(
                        requisito.clases_taller
                      )
                    : null,
              },

              practica: {
                clases_configuradas:
                  practica.length,

                clases_requeridas:
                  requisito
                    ? Number(
                        requisito.clases_practica
                      )
                    : null,
              },
            },
          }
        }
      )


    return NextResponse.json({
      ok: true,

      empresa: {
        nit:
          empresa?.nit ??
          null,

        nombre:
          empresa?.nombre ??
          null,

        nivel_cea:
          empresa?.nivel_cea ??
          null,

        categorias_habilitadas:
          categoriasHabilitadas,
      },

      nivel_cea:
        empresa?.nivel_cea ??
        null,

      categorias_habilitadas:
        categoriasHabilitadas,

      planes:
        planesResumen,

      modulos,

      clases,

      requisitos,

      grupos_transversales:
        grupos,

      grupos_transversales_detalle:
        detalles,
    })
  } catch (
    error
  ) {
    return respuestaError(
      error,
      'No fue posible cargar la configuración académica.'
    )
  }
}


// ============================================================
// POST
// ============================================================

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


    // ========================================================
    // CREAR GRUPO TRANSVERSAL
    // ========================================================

    if (
      mayusculas(
        body?.recurso
      ) ===
      'GRUPO_TRANSVERSAL'
    ) {
      const nombre =
        texto(
          body?.nombre
        )

      const tipoFormacion =
        mayusculas(
          body?.tipo_formacion
        )

      const claseIds =
        normalizarIds(
          body?.clase_ids
        )


      if (!nombre) {
        return NextResponse.json(
          {
            ok: false,

            error:
              'El nombre del grupo transversal es obligatorio.',
          },
          {
            status: 400,
          }
        )
      }


      if (
        ![
          'TEORIA',
          'TALLER',
        ].includes(
          tipoFormacion
        )
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              'El tipo de formación del grupo debe ser TEORIA o TALLER.',
          },
          {
            status: 400,
          }
        )
      }


      const validacion =
        await validarClasesGrupo({
          supabase,
          empresa,
          claseIds,
          tipoFormacion,
        })


      const ahora =
        new Date().toISOString()


      const {
        data: grupo,
        error:
          errorCrearGrupo,
      } =
        await supabase
          .from(
            'grupos_clases_formacion'
          )
          .insert({
            nombre,

            tipo_formacion:
              validacion.tipo,

            activo:
              body?.activo !==
              false,

            observaciones:
            texto(
              body?.observaciones
            ) ||
            null,

          color_horario:
            texto(
              body?.color_horario
            ) ||
            null,

          usuario_creacion:
            texto(
              body?.usuario
            ) ||
            texto(
              body?.usuario_creacion
            ) ||
            null,

            usuario_actualizacion:
              texto(
                body?.usuario
              ) ||
              texto(
                body?.usuario_actualizacion
              ) ||
              null,

            created_at:
              ahora,

            updated_at:
              ahora,
          })
          .select(`
            id,
            nombre,
            tipo_formacion,
            activo,
            observaciones,
            color_horario,
            usuario_creacion,
            usuario_actualizacion,
            created_at,
            updated_at
          `)
          .single()


      if (
        errorCrearGrupo
      ) {
        console.error(
          'Error creando grupo transversal:',
          errorCrearGrupo
        )

        throw new Error(
          'No fue posible crear el grupo transversal.'
        )
      }


      const detalles =
        validacion.ids.map(
          (claseId) => ({
            grupo_id:
              grupo.id,

            clase_formacion_id:
              claseId,

            created_at:
              ahora,
          })
        )


      const {
        error:
          errorCrearDetalles,
      } =
        await supabase
          .from(
            'grupos_clases_formacion_detalle'
          )
          .insert(
            detalles
          )


      if (
        errorCrearDetalles
      ) {
        console.error(
          'Error creando detalle del grupo transversal:',
          errorCrearDetalles
        )

        await supabase
          .from(
            'grupos_clases_formacion'
          )
          .delete()
          .eq(
            'id',
            grupo.id
          )

        throw new Error(
          'No fue posible asociar las clases al grupo transversal.'
        )
      }


      return NextResponse.json(
        {
          ok: true,

          mensaje:
            'Grupo transversal creado correctamente.',

          grupo: {
            ...grupo,

            clases:
              validacion.clases,

            categorias:
              validacion.clases.map(
                (clase) =>
                  clase.categoria
              ),
          },
        },
        {
          status: 201,
        }
      )
    }


    // ========================================================
    // CREAR CLASE
    // ========================================================

    const moduloId =
      Number(
        body?.modulo_id
      )


    if (
      !Number.isInteger(
        moduloId
      ) ||
      moduloId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'El módulo es obligatorio.',
        },
        {
          status: 400,
        }
      )
    }


    const {
      data: modulo,
      error:
        errorModulo,
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
          activo
        `)
        .eq(
          'id',
          moduloId
        )
        .maybeSingle()


    if (
      errorModulo
    ) {
      console.error(
        'Error consultando módulo:',
        errorModulo
      )

      throw new Error(
        'No fue posible consultar el módulo.'
      )
    }


    if (!modulo) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'El módulo indicado no existe.',
        },
        {
          status: 404,
        }
      )
    }


    if (
      modulo.activo ===
      false
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'No es posible crear clases en un módulo inactivo.',
        },
        {
          status: 400,
        }
      )
    }


    const {
      data: plan,
      error:
        errorPlan,
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
          estado
        `)
        .eq(
          'id',
          modulo.plan_formacion_id
        )
        .maybeSingle()


    if (
      errorPlan
    ) {
      console.error(
        'Error consultando plan:',
        errorPlan
      )

      throw new Error(
        'No fue posible consultar el plan de formación.'
      )
    }


    if (!plan) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'El plan de formación del módulo no existe.',
        },
        {
          status: 404,
        }
      )
    }


    if (
      !categoriaHabilitadaEmpresa(
        empresa,
        plan.categoria
      )
    ) {
      return respuestaCategoriaNoHabilitada(
        empresa,
        plan.categoria
      )
    }


    const nombre =
      texto(
        body?.nombre
      )


    if (!nombre) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'El nombre de la clase es obligatorio.',
        },
        {
          status: 400,
        }
      )
    }


    const tipoFormacion =
      mayusculas(
        modulo.tipo_formacion
      )


    let duracionHoras =
      numeroPositivoONull(
        body?.duracion_horas
      )


    if (
      Number.isNaN(
        duracionHoras
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'La duración debe ser un número mayor que cero.',
        },
        {
          status: 400,
        }
      )
    }


    if (
      tipoFormacion ===
      'PRACTICA'
    ) {
      duracionHoras =
        null
    }


    const {
      data:
        clasesModulo,
      error:
        errorClasesModulo,
    } =
      await supabase
        .from(
          'clases_formacion'
        )
        .select(`
          id,
          numero_clase,
          orden
        `)
        .eq(
          'modulo_id',
          modulo.id
        )


    if (
      errorClasesModulo
    ) {
      console.error(
        'Error consultando clases del módulo:',
        errorClasesModulo
      )

      throw new Error(
        'No fue posible calcular el número de la nueva clase.'
      )
    }


    const listaClasesModulo =
      Array.isArray(
        clasesModulo
      )
        ? clasesModulo
        : []


    const numeroClase =
      listaClasesModulo.reduce(
        (
          mayor,
          clase
        ) =>
          Math.max(
            mayor,
            Number(
              clase.numero_clase
            ) ||
            0
          ),
        0
      ) +
      1


    const orden =
      listaClasesModulo.reduce(
        (
          mayor,
          clase
        ) =>
          Math.max(
            mayor,
            Number(
              clase.orden
            ) ||
            0
          ),
        0
      ) +
      1


    const ahora =
      new Date().toISOString()


    const {
      data: clase,
      error:
        errorInsertar,
    } =
      await supabase
        .from(
          'clases_formacion'
        )
        .insert({
          plan_formacion_id:
            plan.id,

          modulo_id:
            modulo.id,

          categoria:
            mayusculas(
              plan.categoria
            ),

          tipo_formacion:
            tipoFormacion,

          numero_clase:
            numeroClase,

          codigo:
            texto(
              body?.codigo
            ) ||
            null,

          nombre,

          contenido:
            texto(
              body?.contenido
            ) ||
            null,

          contenido_tarjeta:
            texto(
              body?.contenido_tarjeta
            ) ||
            null,

          orden,

          activo:
            body?.activo !==
            false,

          observaciones:
            texto(
              body?.observaciones
            ) ||
            null,

          duracion_horas:
            duracionHoras,

          color_horario:
            texto(
              body?.color_horario
            ) ||
            null,

          created_at:
            ahora,

          updated_at:
            ahora,
        })
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
          color_horario,
          created_at,
          updated_at
        `)
        .single()


    if (
      errorInsertar
    ) {
      console.error(
        'Error creando clase:',
        errorInsertar
      )

      if (
        errorInsertar.code ===
        '23505'
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              'Ya existe una clase con ese número dentro del módulo. Intente nuevamente.',
          },
          {
            status: 409,
          }
        )
      }

      throw new Error(
        'No fue posible crear la clase.'
      )
    }


    return NextResponse.json(
      {
        ok: true,

        mensaje:
          'Clase creada correctamente.',

        clase,
      },
      {
        status: 201,
      }
    )
  } catch (
    error
  ) {
    return respuestaError(
      error,
      'No fue posible guardar la configuración académica.'
    )
  }
}


// ============================================================
// PATCH
// ============================================================

export async function PATCH(
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


    // ========================================================
    // EDITAR GRUPO TRANSVERSAL
    // ========================================================

    if (
      mayusculas(
        body?.recurso
      ) ===
      'GRUPO_TRANSVERSAL'
    ) {
      const grupoId =
        Number(
          body?.id
        )


      if (
        !Number.isInteger(
          grupoId
        ) ||
        grupoId <= 0
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              'El grupo transversal es obligatorio.',
          },
          {
            status: 400,
          }
        )
      }


      const {
        data:
          grupoActual,
        error:
          errorGrupoActual,
      } =
        await supabase
          .from(
            'grupos_clases_formacion'
          )
          .select(`
            id,
            nombre,
            tipo_formacion,
            activo,
            observaciones,
            color_horario,
            usuario_creacion,
            usuario_actualizacion,
            created_at,
            updated_at
          `)
          .eq(
            'id',
            grupoId
          )
          .maybeSingle()


      if (
        errorGrupoActual
      ) {
        console.error(
          'Error consultando grupo transversal:',
          errorGrupoActual
        )

        throw new Error(
          'No fue posible consultar el grupo transversal.'
        )
      }


      if (
        !grupoActual
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              'El grupo transversal no existe.',
          },
          {
            status: 404,
          }
        )
      }


      const nombre =
        texto(
          body?.nombre
        )


      if (!nombre) {
        return NextResponse.json(
          {
            ok: false,

            error:
              'El nombre del grupo transversal es obligatorio.',
          },
          {
            status: 400,
          }
        )
      }


      const tipoFormacion =
        mayusculas(
          body?.tipo_formacion
        )


      const claseIds =
        normalizarIds(
          body?.clase_ids
        )


      const validacion =
        await validarClasesGrupo({
          supabase,
          empresa,
          claseIds,
          tipoFormacion,
          grupoIdExcluir:
            grupoId,
        })


      const ahora =
        new Date().toISOString()


      const {
        data:
          grupoActualizado,
        error:
          errorActualizarGrupo,
      } =
        await supabase
          .from(
            'grupos_clases_formacion'
          )
          .update({
            nombre,

            tipo_formacion:
              validacion.tipo,

            activo:
              body?.activo !==
              false,

            observaciones:
            texto(
              body?.observaciones
            ) ||
            null,

          color_horario:
            texto(
              body?.color_horario
            ) ||
            null,

          usuario_actualizacion:
            texto(
              body?.usuario
            ) ||
            texto(
              body?.usuario_actualizacion
            ) ||
            grupoActual.usuario_actualizacion ||
            null,

            updated_at:
              ahora,
          })
          .eq(
            'id',
            grupoId
          )
          .select(`
            id,
            nombre,
            tipo_formacion,
            activo,
            observaciones,
            color_horario,
            usuario_creacion,
            usuario_actualizacion,
            created_at,
            updated_at
          `)
          .single()


      if (
        errorActualizarGrupo
      ) {
        console.error(
          'Error actualizando grupo transversal:',
          errorActualizarGrupo
        )

        throw new Error(
          'No fue posible actualizar el grupo transversal.'
        )
      }


      const {
        error:
          errorEliminarDetalle,
      } =
        await supabase
          .from(
            'grupos_clases_formacion_detalle'
          )
          .delete()
          .eq(
            'grupo_id',
            grupoId
          )


      if (
        errorEliminarDetalle
      ) {
        console.error(
          'Error reemplazando detalle del grupo transversal:',
          errorEliminarDetalle
        )

        throw new Error(
          'No fue posible actualizar las clases del grupo transversal.'
        )
      }


      const registrosDetalle =
        validacion.ids.map(
          (claseId) => ({
            grupo_id:
              grupoId,

            clase_formacion_id:
              claseId,

            created_at:
              ahora,
          })
        )


      const {
        error:
          errorInsertarDetalle,
      } =
        await supabase
          .from(
            'grupos_clases_formacion_detalle'
          )
          .insert(
            registrosDetalle
          )


      if (
        errorInsertarDetalle
      ) {
        console.error(
          'Error insertando detalle actualizado:',
          errorInsertarDetalle
        )

        throw new Error(
          'El grupo se actualizó, pero no fue posible guardar sus clases relacionadas.'
        )
      }


      return NextResponse.json({
        ok: true,

        mensaje:
          'Grupo transversal actualizado correctamente.',

        grupo: {
          ...grupoActualizado,

          clases:
            validacion.clases,

          categorias:
            validacion.clases.map(
              (clase) =>
                clase.categoria
            ),
        },
      })
    }


    // ========================================================
    // EDITAR CLASE
    // ========================================================

    const claseId =
      Number(
        body?.id
      )


    if (
      !Number.isInteger(
        claseId
      ) ||
      claseId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'La clase es obligatoria.',
        },
        {
          status: 400,
        }
      )
    }


    const {
      data:
        claseActual,
      error:
        errorClaseActual,
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
          color_horario,
          created_at,
          updated_at
        `)
        .eq(
          'id',
          claseId
        )
        .maybeSingle()


    if (
      errorClaseActual
    ) {
      console.error(
        'Error consultando clase:',
        errorClaseActual
      )

      throw new Error(
        'No fue posible consultar la clase.'
      )
    }


    if (
      !claseActual
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'La clase indicada no existe.',
        },
        {
          status: 404,
        }
      )
    }


    if (
      !categoriaHabilitadaEmpresa(
        empresa,
        claseActual.categoria
      )
    ) {
      return respuestaCategoriaNoHabilitada(
        empresa,
        claseActual.categoria
      )
    }


    const nombre =
      texto(
        body?.nombre
      )


    if (!nombre) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'El nombre de la clase es obligatorio.',
        },
        {
          status: 400,
        }
      )
    }


    let duracionHoras =
      numeroPositivoONull(
        body?.duracion_horas
      )


    if (
      Number.isNaN(
        duracionHoras
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'La duración debe ser un número mayor que cero.',
        },
        {
          status: 400,
        }
      )
    }


    if (
      mayusculas(
        claseActual.tipo_formacion
      ) ===
      'PRACTICA'
    ) {
      duracionHoras =
        null
    }


    const ahora =
      new Date().toISOString()


    const {
      data:
        claseActualizada,
      error:
        errorActualizar,
    } =
      await supabase
        .from(
          'clases_formacion'
        )
        .update({
          nombre,

          contenido:
            texto(
              body?.contenido
            ) ||
            null,

          contenido_tarjeta:
            texto(
              body?.contenido_tarjeta
            ) ||
            null,

          observaciones:
            texto(
              body?.observaciones
            ) ||
            null,

          activo:
            body?.activo !==
            false,

          duracion_horas:
            duracionHoras,

          color_horario:
            texto(
              body?.color_horario
            ) ||
            null,

          updated_at:
            ahora,
        })
        .eq(
          'id',
          claseId
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
          color_horario,
          created_at,
          updated_at
        `)
        .single()


    if (
      errorActualizar
    ) {
      console.error(
        'Error actualizando clase:',
        errorActualizar
      )

      throw new Error(
        'No fue posible actualizar la clase.'
      )
    }


    return NextResponse.json({
      ok: true,

      mensaje:
        'Clase actualizada correctamente.',

      clase:
        claseActualizada,
    })
  } catch (
    error
  ) {
    return respuestaError(
      error,
      'No fue posible actualizar la configuración académica.'
    )
  }
}


// ============================================================
// DELETE
// ============================================================

export async function DELETE(
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


    // ========================================================
    // ELIMINAR GRUPO TRANSVERSAL
    // ========================================================

    if (
      mayusculas(
        body?.recurso
      ) ===
      'GRUPO_TRANSVERSAL'
    ) {
      const grupoId =
        Number(
          body?.id
        )


      if (
        !Number.isInteger(
          grupoId
        ) ||
        grupoId <= 0
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              'El grupo transversal es obligatorio.',
          },
          {
            status: 400,
          }
        )
      }


      const {
        data: grupo,
        error:
          errorGrupo,
      } =
        await supabase
          .from(
            'grupos_clases_formacion'
          )
          .select(`
            id,
            nombre,
            tipo_formacion,
            activo
          `)
          .eq(
            'id',
            grupoId
          )
          .maybeSingle()


      if (
        errorGrupo
      ) {
        console.error(
          'Error consultando grupo transversal:',
          errorGrupo
        )

        throw new Error(
          'No fue posible consultar el grupo transversal.'
        )
      }


      if (!grupo) {
        return NextResponse.json(
          {
            ok: false,

            error:
              'El grupo transversal no existe.',
          },
          {
            status: 404,
          }
        )
      }


      const {
        error:
          errorEliminarGrupo,
      } =
        await supabase
          .from(
            'grupos_clases_formacion'
          )
          .delete()
          .eq(
            'id',
            grupoId
          )


      if (
        errorEliminarGrupo
      ) {
        console.error(
          'Error eliminando grupo transversal:',
          errorEliminarGrupo
        )

        if (
          errorEliminarGrupo.code ===
          '23503'
        ) {
          const ahora =
            new Date().toISOString()

          const {
            data:
              grupoDesactivado,
            error:
              errorDesactivar,
          } =
            await supabase
              .from(
                'grupos_clases_formacion'
              )
              .update({
                activo:
                  false,

                updated_at:
                  ahora,
              })
              .eq(
                'id',
                grupoId
              )
              .select(`
                id,
                nombre,
                tipo_formacion,
                activo,
                observaciones,
                usuario_creacion,
                usuario_actualizacion,
                created_at,
                updated_at
              `)
              .single()


          if (
            errorDesactivar
          ) {
            console.error(
              'Error desactivando grupo transversal:',
              errorDesactivar
            )

            throw new Error(
              'El grupo tiene información relacionada y no fue posible desactivarlo.'
            )
          }


          return NextResponse.json({
            ok: true,

            eliminado:
              false,

            desactivado:
              true,

            mensaje:
              'El grupo tiene información relacionada y se conservó como inactivo.',

            grupo:
              grupoDesactivado,
          })
        }


        throw new Error(
          'No fue posible eliminar el grupo transversal.'
        )
      }


      return NextResponse.json({
        ok: true,

        eliminado:
          true,

        desactivado:
          false,

        mensaje:
          'Grupo transversal eliminado correctamente.',
      })
    }


    // ========================================================
    // ELIMINAR CLASE
    // ========================================================

    const claseId =
      Number(
        body?.id
      )


    if (
      !Number.isInteger(
        claseId
      ) ||
      claseId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'La clase es obligatoria.',
        },
        {
          status: 400,
        }
      )
    }


    const {
      data:
        claseActual,
      error:
        errorClaseActual,
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
          nombre,
          activo
        `)
        .eq(
          'id',
          claseId
        )
        .maybeSingle()


    if (
      errorClaseActual
    ) {
      console.error(
        'Error consultando clase para eliminar:',
        errorClaseActual
      )

      throw new Error(
        'No fue posible consultar la clase.'
      )
    }


    if (
      !claseActual
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'La clase indicada no existe.',
        },
        {
          status: 404,
        }
      )
    }


    if (
      !categoriaHabilitadaEmpresa(
        empresa,
        claseActual.categoria
      )
    ) {
      return respuestaCategoriaNoHabilitada(
        empresa,
        claseActual.categoria
      )
    }


    const {
      error:
        errorEliminar,
    } =
      await supabase
        .from(
          'clases_formacion'
        )
        .delete()
        .eq(
          'id',
          claseId
        )


    if (
      !errorEliminar
    ) {
      return NextResponse.json({
        ok: true,

        eliminado:
          true,

        desactivado:
          false,

        mensaje:
          'Clase eliminada correctamente.',
      })
    }


    console.error(
      'Error eliminando clase:',
      errorEliminar
    )


    if (
      errorEliminar.code ===
      '23503'
    ) {
      const ahora =
        new Date().toISOString()


      const {
        data:
          claseDesactivada,
        error:
          errorDesactivar,
      } =
        await supabase
          .from(
            'clases_formacion'
          )
          .update({
            activo:
              false,

            updated_at:
              ahora,
          })
          .eq(
            'id',
            claseId
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
          .single()


      if (
        errorDesactivar
      ) {
        console.error(
          'Error desactivando clase:',
          errorDesactivar
        )

        throw new Error(
          'La clase tiene información relacionada y no fue posible desactivarla.'
        )
      }


      return NextResponse.json({
        ok: true,

        eliminado:
          false,

        desactivado:
          true,

        mensaje:
          'La clase tiene información histórica relacionada y se conservó como inactiva.',

        clase:
          claseDesactivada,
      })
    }


    throw new Error(
      'No fue posible eliminar la clase.'
    )
  } catch (
    error
  ) {
    return respuestaError(
      error,
      'No fue posible eliminar la configuración académica.'
    )
  }
}