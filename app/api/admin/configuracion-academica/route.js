// app/api/admin/configuracion-academica/route.js

import { NextResponse } from 'next/server'

import { obtenerContextoCEA } from '@/lib/autorizacionCEA'


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
      await obtenerContextoCEA(request, { rolesPermitidos: ['ADMINISTRATIVO'] })

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
      await obtenerContextoCEA(request, { rolesPermitidos: ['ADMINISTRATIVO'], body })

    const supabase =
      supabaseAdmin



    // CREAR CLASE COMPARTIDA: conserva clases existentes y relaciones de horarios.
    // Prevalida todos los módulos antes de escribir; compensa altas nuevas si falla.
    if (mayusculas(body?.recurso) === 'CLASE_COMPARTIDA') {
      const categorias = Array.from(new Set(
        (Array.isArray(body?.categorias) ? body.categorias : []).map(mayusculas).filter(Boolean)
      ))
      const moduloOrigenId = Number(body?.modulo_id)
      const nombre = texto(body?.nombre)
      const duracion = numeroPositivoONull(body?.duracion_horas)
      if (categorias.length < 2 || !nombre || !Number.isInteger(moduloOrigenId) || moduloOrigenId <= 0) {
        return NextResponse.json({ok:false,error:'Seleccione al menos dos categorías y un nombre de clase válido.'},{status:400})
      }
      if (categorias.some(c => !categoriaHabilitadaEmpresa(empresa,c))) {
        return NextResponse.json({ok:false,error:'Una categoría seleccionada no está habilitada para este CEA.'},{status:403})
      }
      const {data:moduloOrigen,error:errorOrigen}=await supabase.from('modulos_formacion')
        .select('id, plan_formacion_id, codigo, nombre, tipo_formacion, activo')
        .eq('id',moduloOrigenId).maybeSingle()
      if(errorOrigen || !moduloOrigen || moduloOrigen.activo===false) {
        return NextResponse.json({ok:false,error:'No se pudo verificar el módulo seleccionado.'},{status:400})
      }
      if(body?.activo===false) {
        return NextResponse.json({ok:false,error:'Para crear un grupo compartido, las clases deben estar activas. Puede desactivar registros individuales posteriormente.'},{status:400})
      }
      const tipo=mayusculas(moduloOrigen.tipo_formacion)
      if(!['TEORIA','TALLER'].includes(tipo)) {
        return NextResponse.json({ok:false,error:'Las prácticas se configuran individualmente por categoría.'},{status:400})
      }
      if (!Number.isFinite(duracion) || duracion <= 0) {
        return NextResponse.json({ok:false,error:'Indique una duración válida para las clases compartidas.'},{status:400})
      }
      const {data:planes,error:errorPlanes}=await supabase.from('planes_formacion')
        .select('id,categoria,version,estado').in('categoria',categorias)
      if(errorPlanes) throw new Error('No fue posible consultar planes de formación.')
      const planOrigen=(planes||[]).find(p=>Number(p.id)===Number(moduloOrigen.plan_formacion_id))
      if(!planOrigen || !categorias.includes(mayusculas(planOrigen.categoria))) {
        return NextResponse.json({ok:false,error:'Incluya la categoría del módulo de origen.'},{status:400})
      }
      const planesDestino=categorias.map(cat=>{
        const lista=(planes||[]).filter(p=>mayusculas(p.categoria)===cat &&
          texto(p.version)===texto(planOrigen.version))
        return lista.length===1?lista[0]:null
      })
      if(planesDestino.some(p=>!p)) {
        return NextResponse.json({ok:false,error:'No se encontró un plan de la misma versión para todas las categorías. Revise los planes antes de crear.'},{status:400})
      }
      const planIds=planesDestino.map(p=>Number(p.id))
      const {data:modulos,error:errorModulos}=await supabase.from('modulos_formacion')
        .select('id,plan_formacion_id,codigo,nombre,tipo_formacion,activo').in('plan_formacion_id',planIds)
      if(errorModulos) throw new Error('No fue posible verificar módulos de las categorías.')
      const codigoOrigen=mayusculas(moduloOrigen.codigo)
      const modulosDestino=planesDestino.map(plan=>{
        const candidatos=(modulos||[]).filter(m=>Number(m.plan_formacion_id)===Number(plan.id) &&
          mayusculas(m.tipo_formacion)===tipo && m.activo!==false &&
          (codigoOrigen ? mayusculas(m.codigo)===codigoOrigen : mayusculas(m.nombre)===mayusculas(moduloOrigen.nombre)))
        return candidatos.length===1?candidatos[0]:null
      })
      if(modulosDestino.some(m=>!m)) {
        return NextResponse.json({ok:false,error:'No existe un módulo equivalente y único en todas las categorías seleccionadas.'},{status:400})
      }
      const {data:clasesExistentes,error:errorClases}=await supabase.from('clases_formacion')
        .select('id,plan_formacion_id,modulo_id,categoria,tipo_formacion,nombre,duracion_horas,activo,numero_clase,orden')
        .in('modulo_id',modulosDestino.map(m=>m.id))
      if(errorClases) throw new Error('No fue posible verificar clases existentes.')
      const coincidentes=modulosDestino.map((modulo,index)=>{
        const lista=(clasesExistentes||[]).filter(c=>Number(c.modulo_id)===Number(modulo.id) &&
          mayusculas(c.nombre)===mayusculas(nombre))
        return lista.length>1 ? {conflicto:true} : lista[0] || null
      })
      if(coincidentes.some(c=>c?.conflicto)) {
        return NextResponse.json({ok:false,error:'Existen clases duplicadas con ese nombre. Resuelva la duplicidad antes de continuar.'},{status:409})
      }
      if(coincidentes.some(c=>c && (c.activo===false || Math.abs(Number(c.duracion_horas)-duracion)>0.001))) {
        return NextResponse.json({ok:false,error:'Una clase existente está inactiva o tiene duración diferente. No se modificó ningún dato.'},{status:409})
      }
      const existentesIds=coincidentes.filter(Boolean).map(c=>Number(c.id))
      if(existentesIds.length){
        const {data:ocupaciones,error:errorOcupaciones}=await supabase.from('grupos_clases_formacion_detalle')
          .select('clase_formacion_id,grupo_id').in('clase_formacion_id',existentesIds)
        if(errorOcupaciones) throw new Error('No fue posible verificar grupos existentes.')
        if((ocupaciones||[]).length) {
          return NextResponse.json({ok:false,error:'Una clase equivalente ya pertenece a un grupo transversal. Edite ese grupo en vez de duplicarlo.'},{status:409})
        }
      }
      const ahora=new Date().toISOString()
      const nuevosIds=[]
      let grupoNuevoId=null
      try {
        const claseIds=[]
        for(let i=0;i<categorias.length;i++){
          if(coincidentes[i]) { claseIds.push(Number(coincidentes[i].id)); continue }
          const modulo=modulosDestino[i]
          const listado=(clasesExistentes||[]).filter(c=>Number(c.modulo_id)===Number(modulo.id))
          const n=1+Math.max(0,...listado.map(c=>Number(c.numero_clase)||0))
          const orden=1+Math.max(0,...listado.map(c=>Number(c.orden)||0))
          const {data:nueva,error:errorNueva}=await supabase.from('clases_formacion').insert({
            plan_formacion_id:planesDestino[i].id,modulo_id:modulo.id,
            categoria:categorias[i],tipo_formacion:tipo,numero_clase:n,codigo:null,nombre,
            contenido:texto(body?.contenido)||null,contenido_tarjeta:texto(body?.contenido_tarjeta)||null,
            orden,activo:body?.activo!==false,observaciones:texto(body?.observaciones)||null,
            duracion_horas:duracion,color_horario:null,created_at:ahora,updated_at:ahora,
          }).select('id').single()
          if(errorNueva || !nueva) throw new Error('No fue posible crear la clase en '+categorias[i]+'.')
          nuevosIds.push(Number(nueva.id));claseIds.push(Number(nueva.id))
        }
        const validacion=await validarClasesGrupo({supabase,empresa,claseIds,tipoFormacion:tipo})
        const {data:grupo,error:errorGrupo}=await supabase.from('grupos_clases_formacion').insert({
          nombre:texto(body?.nombre_grupo)||nombre,tipo_formacion:tipo,activo:body?.activo!==false,
          observaciones:texto(body?.observaciones)||null,color_horario:texto(body?.color_horario)||null,
          usuario_creacion:texto(body?.usuario)||null,usuario_actualizacion:texto(body?.usuario)||null,
          created_at:ahora,updated_at:ahora,
        }).select('id').single()
        if(errorGrupo || !grupo) throw new Error('No fue posible crear el grupo compartido.')
        grupoNuevoId=Number(grupo.id)
        const {error:errorDetalle}=await supabase.from('grupos_clases_formacion_detalle')
          .insert(validacion.ids.map(id=>({grupo_id:grupoNuevoId,clase_formacion_id:id,created_at:ahora})))
        if(errorDetalle) throw new Error('No fue posible asociar las clases al grupo.')
        return NextResponse.json({ok:true,mensaje:'Clases compartidas creadas y asociadas correctamente.',
          grupo_id:grupoNuevoId,categorias,reutilizadas:existentesIds.length,creadas:nuevosIds.length},{status:201})
      } catch(errorOperacion) {
        let restauracionCorrecta=true
        if(grupoNuevoId){
          const {error:errorDesvincular}=await supabase.from('grupos_clases_formacion_detalle').delete().eq('grupo_id',grupoNuevoId)
          const {error:errorBorrarGrupo}=await supabase.from('grupos_clases_formacion').delete().eq('id',grupoNuevoId)
          if(errorDesvincular || errorBorrarGrupo) restauracionCorrecta=false
        }
        if(nuevosIds.length){
          const {error:errorBorrarClases}=await supabase.from('clases_formacion').delete().in('id',nuevosIds)
          if(errorBorrarClases) restauracionCorrecta=false
        }
        console.error('Error creando clases compartidas:',errorOperacion)
        return NextResponse.json({ok:false,
          error:restauracionCorrecta ? (errorOperacion.message||'Error creando el grupo.') :
            'No se pudo completar ni revertir totalmente la operación. Revise los registros antes de reintentar.',
          requiere_revision:!restauracionCorrecta},{status:restauracionCorrecta?409:500})
      }
    }

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
      await obtenerContextoCEA(request, { rolesPermitidos: ['ADMINISTRATIVO'], body })

    const supabase =
      supabaseAdmin



    // Reasignación de categorías desde el único formulario Editar clase.
    // La exclusión es lógica: preserva ID, asistencias y demás referencias.
    if (mayusculas(body?.recurso) === 'REASIGNAR_CLASE_CATEGORIAS') {
      const idOrigen = Number(body?.clase_id)
      const categorias = Array.isArray(body?.categorias)
        ? [...new Set(body.categorias.map(mayusculas).filter(Boolean))] : []
      if (!Number.isInteger(idOrigen) || idOrigen <= 0 || categorias.length > 8) {
        return NextResponse.json({ok:false,error:'Verifique la clase y las categorías seleccionadas.'},{status:400})
      }
      if (categorias.some(c => !categoriaHabilitadaEmpresa(empresa,c))) {
        return NextResponse.json({ok:false,error:'Una categoría seleccionada no está habilitada para este CEA.'},{status:403})
      }
      const {data:origen,error:errOrigen} = await supabase.from('clases_formacion')
        .select('id,plan_formacion_id,modulo_id,categoria,tipo_formacion,nombre,activo')
        .eq('id',idOrigen).maybeSingle()
      if(errOrigen || !origen || !categoriaHabilitadaEmpresa(empresa,origen.categoria))
        return NextResponse.json({ok:false,error:'No fue posible comprobar la clase de origen.'},{status:400})
      const tipo = mayusculas(origen.tipo_formacion)
      if(tipo==='PRACTICA' && categorias.length>1)
        return NextResponse.json({ok:false,error:'La formación práctica debe configurarse por una sola categoría.'},{status:400})
      const nombre=texto(body?.nombre)
      if(!nombre && categorias.length)
        return NextResponse.json({ok:false,error:'Indique el nombre de la clase.'},{status:400})
      const duracion=tipo==='PRACTICA' ? null : numeroPositivoONull(body?.duracion_horas)
      if(categorias.length && tipo!=='PRACTICA' && (!Number.isFinite(duracion) || duracion<=0))
        return NextResponse.json({ok:false,error:'Indique una duración mayor que cero.'},{status:400})
      const {data:planOrigen,error:errPlan}=await supabase.from('planes_formacion')
        .select('id,categoria,version').eq('id',origen.plan_formacion_id).maybeSingle()
      const {data:moduloOrigen,error:errModulo}=await supabase.from('modulos_formacion')
        .select('id,codigo,nombre,tipo_formacion').eq('id',origen.modulo_id).maybeSingle()
      if(errPlan || errModulo || !planOrigen || !moduloOrigen)
        return NextResponse.json({ok:false,error:'No se pudo determinar la versión o el módulo de la clase.'},{status:400})
      const {data:relacion,error:errRelacion}=await supabase.from('grupos_clases_formacion_detalle')
        .select('grupo_id').eq('clase_formacion_id',idOrigen).maybeSingle()
      if(errRelacion) throw new Error('No fue posible consultar la asociación actual.')
      const grupoId=relacion?.grupo_id ? Number(relacion.grupo_id) : null
      let miembros=[origen]
      let grupo=null
      if(grupoId){
        const {data:g,error:eg}=await supabase.from('grupos_clases_formacion')
          .select('id,nombre,tipo_formacion,activo').eq('id',grupoId).maybeSingle()
        if(eg || !g || mayusculas(g.tipo_formacion)!==tipo)
          return NextResponse.json({ok:false,error:'Grupo compartido inexistente o incompatible.'},{status:400})
        grupo=g
        const {data:detalles,error:ed}=await supabase.from('grupos_clases_formacion_detalle')
          .select('clase_formacion_id').eq('grupo_id',grupoId)
        if(ed)throw new Error('No fue posible consultar las clases del grupo.')
        const ids=(detalles||[]).map(d=>Number(d.clase_formacion_id))
        const {data:clases,error:ec}=await supabase.from('clases_formacion')
          .select('id,plan_formacion_id,modulo_id,categoria,tipo_formacion,nombre,activo').in('id',ids)
        if(ec || !clases || clases.length!==ids.length)throw new Error('No fue posible verificar las clases compartidas.')
        miembros=clases
      }
      // No incluir clases ajenas al CEA ni cambiar módulos/versiones del plan.
      if(miembros.some(c=>!categoriaHabilitadaEmpresa(empresa,c.categoria) || mayusculas(c.tipo_formacion)!==tipo))
        return NextResponse.json({ok:false,error:'Las clases relacionadas no son compatibles con el CEA.'},{status:400})
      const mapaActual=new Map(miembros.map(c=>[mayusculas(c.categoria),c]))
      if(mapaActual.size!==miembros.length)
        return NextResponse.json({ok:false,error:'El grupo contiene más de una clase de una misma categoría.'},{status:409})
      const faltantes=categorias.filter(c=>!mapaActual.has(c))
      const {data:planes,error:ep}=faltantes.length
        ? await supabase.from('planes_formacion').select('id,categoria,version,estado').in('categoria',faltantes)
        : {data:[],error:null}
      if(ep)throw new Error('No fue posible consultar los planes de las nuevas categorías.')
      const seleccionPlanes=faltantes.map(cat=>{
        const opciones=(planes||[]).filter(p=>mayusculas(p.categoria)===cat &&
          texto(p.version)===texto(planOrigen.version) && mayusculas(p.estado)==='ACTIVO')
        return opciones.length===1?opciones[0]:null
      })
      if(seleccionPlanes.some(p=>!p))
        return NextResponse.json({ok:false,error:'No existe un plan activo, único y de la misma versión para una categoría seleccionada.'},{status:400})
      const {data:modulos,error:em}=faltantes.length
        ? await supabase.from('modulos_formacion').select('id,plan_formacion_id,codigo,nombre,tipo_formacion,activo')
            .in('plan_formacion_id',seleccionPlanes.map(p=>p.id))
        : {data:[],error:null}
      if(em)throw new Error('No fue posible consultar los módulos equivalentes.')
      const mods=faltantes.map((cat,i)=>{
        const opciones=(modulos||[]).filter(m=>Number(m.plan_formacion_id)===Number(seleccionPlanes[i].id) &&
          m.activo!==false && mayusculas(m.tipo_formacion)===tipo &&
          mayusculas(m.codigo)===mayusculas(moduloOrigen.codigo) &&
          mayusculas(m.nombre)===mayusculas(moduloOrigen.nombre))
        return opciones.length===1?opciones[0]:null
      })
      if(mods.some(m=>!m))
        return NextResponse.json({ok:false,error:'No existe un módulo equivalente único para una categoría seleccionada.'},{status:400})
      const {data:otras,error:eo}=mods.length
        ? await supabase.from('clases_formacion')
            .select('id,modulo_id,categoria,nombre,activo,numero_clase,orden')
            .in('modulo_id',mods.map(m=>m.id))
        : {data:[],error:null}
      if(eo)throw new Error('No fue posible comprobar clases existentes.')
      const reutilizadas=[]
      const crear=[]
      for(let i=0;i<faltantes.length;i++){
        const modulo=mods[i]
        const coincidencias=(otras||[]).filter(c=>Number(c.modulo_id)===Number(modulo.id) &&
          mayusculas(c.nombre)===mayusculas(origen.nombre))
        if(coincidencias.length>1)
          return NextResponse.json({ok:false,error:'Hay clases duplicadas en '+faltantes[i]+'; resuelva la duplicidad antes de asignar.'},{status:409})
        if(coincidencias.length)reutilizadas.push(coincidencias[0])
        else crear.push({categoria:faltantes[i],modulo,plan:seleccionPlanes[i],
          existentes:(otras||[]).filter(c=>Number(c.modulo_id)===Number(modulo.id))})
      }
      if(reutilizadas.length){
        const {data:ocupaciones,error:ec}=await supabase.from('grupos_clases_formacion_detalle')
          .select('clase_formacion_id').in('clase_formacion_id',reutilizadas.map(c=>c.id))
        if(ec)throw new Error('No fue posible comprobar las asociaciones de las clases destino.')
        if((ocupaciones||[]).length)
          return NextResponse.json({ok:false,error:'Una clase destino ya pertenece a otro grupo. No se modificó ninguna asociación.'},{status:409})
      }
      const ahora=new Date().toISOString()
      const cambios={nombre,contenido:texto(body?.contenido)||null,
        contenido_tarjeta:texto(body?.contenido_tarjeta)||null,
        observaciones:texto(body?.observaciones)||null,
        duracion_horas:duracion,activo:body?.activo!==false,
        // El color de las clases individuales se almacena en clases_formacion;
        // en las compartidas, el horario utiliza el color del grupo.
        color_horario:texto(body?.color_horario)||null,
        updated_at:ahora}
      const idsSeleccionados=miembros.filter(c=>categorias.includes(mayusculas(c.categoria))).map(c=>Number(c.id))
      const idsRetirados=miembros.filter(c=>!categorias.includes(mayusculas(c.categoria))).map(c=>Number(c.id))
      const idsNuevos=[]
      let nuevoGrupoId=null
      // Las altas se compensan ante errores antes de actualizar clases antiguas.
      try {
        for(const c of crear){
          const siguiente=1+Math.max(0,...c.existentes.map(x=>Number(x.numero_clase)||0))
          const orden=1+Math.max(0,...c.existentes.map(x=>Number(x.orden)||0))
          const {data:nueva,error:en}=await supabase.from('clases_formacion')
            .insert({plan_formacion_id:c.plan.id,modulo_id:c.modulo.id,
              categoria:c.categoria,tipo_formacion:tipo,numero_clase:siguiente,orden,
              codigo:null,color_horario:null,created_at:ahora,...cambios})
            .select('id').single()
          if(en || !nueva)throw new Error('No fue posible crear la clase en '+c.categoria)
          idsNuevos.push(Number(nueva.id))
        }
        const idsDestinos=[...idsSeleccionados,...reutilizadas.map(c=>Number(c.id)),...idsNuevos]
        const detallesNuevos=[...reutilizadas.map(c=>Number(c.id)),...idsNuevos]
        if(idsDestinos.length>1 && !grupoId){
          const {data:g,error:eg}=await supabase.from('grupos_clases_formacion')
            .insert({nombre, tipo_formacion:tipo,activo:true,
              observaciones:texto(body?.observaciones)||null,
              color_horario:texto(body?.color_horario)||null,
              created_at:ahora,updated_at:ahora}).select('id').single()
          if(eg || !g)throw new Error('No fue posible crear el grupo transversal.')
          nuevoGrupoId=Number(g.id)
        }
        const grupoDestino=grupoId || nuevoGrupoId
        // Primero vinculamos nuevas categorías para no dejar un grupo inválido
        // antes de confirmar su guardado.
        if(grupoDestino && idsDestinos.length>1){
          const anexar=grupoId?detallesNuevos:idsDestinos
          if(anexar.length){
            const {error:ed}=await supabase.from('grupos_clases_formacion_detalle')
              .insert(anexar.map(id=>({grupo_id:grupoDestino,clase_formacion_id:id,created_at:ahora})))
            if(ed)throw new Error('No fue posible asociar las nuevas categorías.')
          }
        }
        if(idsDestinos.length){
          const idsActualizar=[...idsSeleccionados,...reutilizadas.map(c=>Number(c.id))]
          if(idsActualizar.length){
            const {data:actualizadas,error:ea}=await supabase.from('clases_formacion')
              .update(cambios).in('id',idsActualizar).select('id')
            if(ea || (actualizadas||[]).length!==idsActualizar.length)
              throw new Error('No fue posible actualizar todas las clases seleccionadas.')
          }
        }
        if(idsRetirados.length){
          const {data:desactivadas,error:er}=await supabase.from('clases_formacion')
            .update({activo:false,updated_at:ahora}).in('id',idsRetirados).select('id')
          if(er || (desactivadas||[]).length!==idsRetirados.length)
            throw new Error('No fue posible retirar las categorías de la clase.')
        }
        if(grupoId){
          const quitar=idsRetirados.length
            ? await supabase.from('grupos_clases_formacion_detalle').delete()
                .eq('grupo_id',grupoId).in('clase_formacion_id',idsRetirados)
            : {error:null}
          if(quitar.error)throw new Error('No fue posible desvincular las categorías retiradas.')
          if(idsDestinos.length<2){
            const {error:eg}=await supabase.from('grupos_clases_formacion')
              .update({activo:false,updated_at:ahora}).eq('id',grupoId)
            if(eg)throw new Error('No fue posible desactivar el grupo sin categorías compartidas.')
            if(idsDestinos.length){
              const {error:es}=await supabase.from('grupos_clases_formacion_detalle')
                .delete().eq('grupo_id',grupoId)
              if(es)throw new Error('No fue posible independizar la categoría restante.')
            }
          } else {
            const {error:eg}=await supabase.from('grupos_clases_formacion')
              .update({nombre,observaciones:texto(body?.observaciones)||null,
                color_horario:texto(body?.color_horario)||null,updated_at:ahora}).eq('id',grupoId)
            if(eg)throw new Error('No fue posible actualizar el grupo transversal.')
          }
        }
        return NextResponse.json({ok:true,
          mensaje: 'Clase actualizada correctamente.',
          categorias,retiradas:idsRetirados.length,creadas:idsNuevos.length,
          reutilizadas:reutilizadas.length})
      }catch(errorOperacion){
        // No borrar registros previos; confirmar explícitamente si hubo cambios parciales.
        if(nuevoGrupoId){
          await supabase.from('grupos_clases_formacion_detalle').delete().eq('grupo_id',nuevoGrupoId)
          await supabase.from('grupos_clases_formacion').delete().eq('id',nuevoGrupoId)
        }
        if(idsNuevos.length)await supabase.from('clases_formacion').delete().in('id',idsNuevos)
        return NextResponse.json({ok:false,error:errorOperacion.message+
          ' Si hubo escrituras parciales, recargue y verifique las asociaciones antes de reintentar.',
          requiere_revision:true},{status:500})
      }
    }

    // Edición de una clase compartida desde el Plan de Formación.
    // El grupo sigue existiendo para horarios, pero no se reconstruyen sus asociaciones.
    if (mayusculas(body?.recurso) === 'EDITAR_CLASE_COMPARTIDA') {
      const grupoId = Number(body?.grupo_id)
      const claseId = Number(body?.clase_id)
      if (!Number.isInteger(grupoId) || grupoId <= 0 || !Number.isInteger(claseId) || claseId <= 0) {
        return NextResponse.json({ok:false,error:'Identifique la clase y su grupo transversal.'},{status:400})
      }
      const nombre = texto(body?.nombre)
      if (!nombre) return NextResponse.json({ok:false,error:'El nombre de la clase es obligatorio.'},{status:400})
      const {data:grupo,error:errorGrupo}=await supabase.from('grupos_clases_formacion')
        .select('id,tipo_formacion,color_horario').eq('id',grupoId).maybeSingle()
      if(errorGrupo || !grupo) return NextResponse.json({ok:false,error:'No fue posible verificar el grupo.'},{status:400})
      const {data:detalles,error:errorDetalles}=await supabase.from('grupos_clases_formacion_detalle')
        .select('clase_formacion_id').eq('grupo_id',grupoId)
      if(errorDetalles) throw new Error('No fue posible verificar las asociaciones.')
      const ids=(detalles||[]).map(item=>Number(item.clase_formacion_id))
      if(ids.length<2 || !ids.includes(claseId) || new Set(ids).size!==ids.length) {
        return NextResponse.json({ok:false,error:'La clase no pertenece a un grupo compartido válido.'},{status:409})
      }
      const {data:clasesGrupo,error:errorClases}=await supabase.from('clases_formacion')
        .select('id,categoria,tipo_formacion,duracion_horas,nombre,contenido,contenido_tarjeta,observaciones,activo')
        .in('id',ids)
      if(errorClases || !Array.isArray(clasesGrupo) || clasesGrupo.length!==ids.length ||
        clasesGrupo.some(c=>mayusculas(c.tipo_formacion)!==mayusculas(grupo.tipo_formacion) ||
          !categoriaHabilitadaEmpresa(empresa,c.categoria))) {
        return NextResponse.json({ok:false,error:'Las clases del grupo no pertenecen todas al CEA o son incompatibles.'},{status:400})
      }
      // La categoría retirada conserva su clase (y sus referencias históricas);
      // únicamente se elimina su pertenencia al grupo transversal.
      const actuales = clasesGrupo.map(c => mayusculas(c.categoria))
      const solicitadas = body?.categorias_asociadas === undefined
        ? actuales
        : Array.isArray(body.categorias_asociadas)
          ? [...new Set(body.categorias_asociadas.map(mayusculas).filter(Boolean))]
          : []
      if (solicitadas.length < 2 || solicitadas.some(cat => !actuales.includes(cat))) {
        return NextResponse.json({ok:false,error:'Seleccione al menos dos categorías existentes del grupo. No se permite agregar una categoría sin su clase equivalente.'},{status:400})
      }
      const idsRetirados = clasesGrupo.filter(c => !solicitadas.includes(mayusculas(c.categoria))).map(c => Number(c.id))
      const idsSeleccionados = clasesGrupo.filter(c => solicitadas.includes(mayusculas(c.categoria))).map(c => Number(c.id))
      const duracion=numeroPositivoONull(body?.duracion_horas)
      if(!Number.isFinite(duracion) || duracion<=0) {
        return NextResponse.json({ok:false,error:'La duración de una clase compartida debe ser válida.'},{status:400})
      }
      const grupoColorAnterior=grupo.color_horario || null
      const nuevoColor=texto(body?.color_horario)||null
      const ahora=new Date().toISOString()
      const cambios={
        nombre, duracion_horas:duracion,
        contenido:texto(body?.contenido)||null,
        contenido_tarjeta:texto(body?.contenido_tarjeta)||null,
        observaciones:texto(body?.observaciones)||null,
        activo:body?.activo!==false,
        updated_at:ahora,
      }
      // Primero se guarda el color del grupo; si fallan las clases, se revierte.
      if(nuevoColor!==grupoColorAnterior){
        const {error:errorColor}=await supabase.from('grupos_clases_formacion')
          .update({color_horario:nuevoColor,updated_at:ahora}).eq('id',grupoId)
        if(errorColor) throw new Error('No fue posible actualizar el color del grupo.')
      }
      const {data:actualizadas,error:errorGuardar}=await supabase.from('clases_formacion')
        .update(cambios).in('id',idsSeleccionados).select('id')
      if(errorGuardar || (actualizadas||[]).length!==idsSeleccionados.length){
        if(nuevoColor!==grupoColorAnterior){
          const {error:errorRestaurar}=await supabase.from('grupos_clases_formacion')
            .update({color_horario:grupoColorAnterior,updated_at:new Date().toISOString()}).eq('id',grupoId)
          if(errorRestaurar) return NextResponse.json({ok:false,error:'Actualización incompleta: revise los datos antes de reintentar.',requiere_revision:true},{status:500})
        }
        throw new Error('No se pudo confirmar la actualización de todas las categorías.')
      }
      if (idsRetirados.length > 0) {
        const {data:retiradas,error:errorRetirar}=await supabase
          .from('grupos_clases_formacion_detalle')
          .delete().eq('grupo_id',grupoId).in('clase_formacion_id',idsRetirados)
          .select('clase_formacion_id')
        if (errorRetirar || (retiradas||[]).length !== idsRetirados.length) {
          return NextResponse.json({ok:false,error:'Se actualizaron las clases seleccionadas, pero no fue posible confirmar todas las desvinculaciones. Recargue los datos antes de reintentar.',requiere_revision:true},{status:500})
        }
      }
      return NextResponse.json({ok:true,
        mensaje:idsRetirados.length ? 'Cambios guardados. Las categorías retiradas conservaron sus clases independientes.' : 'Clase compartida actualizada en todas las categorías asociadas.',
        cantidad:idsSeleccionados.length,desvinculadas:idsRetirados.length})
    }

    // Edición compartida de textos sobre clases existentes.
    // No altera grupos, colores, horas, identificadores ni horarios.
    if (mayusculas(body?.recurso) === 'CONTENIDOS_GRUPO') {
      const grupoId = Number(body?.grupo_id)
      const ids = normalizarIds(body?.clase_ids)
      const actualizarContenido = body?.actualizar_contenido === true
      const actualizarTarjeta = body?.actualizar_tarjeta === true

      if (!Number.isInteger(grupoId) || grupoId <= 0 || !ids.length ||
          (!actualizarContenido && !actualizarTarjeta)) {
        return NextResponse.json({ ok: false, error: 'Seleccione un grupo, al menos una clase y los campos que desea actualizar.' }, { status: 400 })
      }

      const contenido = texto(body?.contenido)
      const contenidoTarjeta = texto(body?.contenido_tarjeta)
      if ((actualizarContenido && !contenido) || (actualizarTarjeta && !contenidoTarjeta)) {
        return NextResponse.json({ ok: false, error: 'Los textos seleccionados para actualizar no pueden estar vacíos.' }, { status: 400 })
      }

      const { data: grupo, error: errorGrupo } = await supabase
        .from('grupos_clases_formacion')
        .select('id, tipo_formacion, activo')
        .eq('id', grupoId)
        .maybeSingle()
      if (errorGrupo) throw new Error('No fue posible verificar el grupo transversal.')
      if (!grupo || grupo.activo === false) {
        return NextResponse.json({ ok: false, error: 'El grupo no existe o está inactivo.' }, { status: 400 })
      }

      const { data: relaciones, error: errorRelaciones } = await supabase
        .from('grupos_clases_formacion_detalle')
        .select('clase_formacion_id')
        .eq('grupo_id', grupoId)
      if (errorRelaciones) throw new Error('No fue posible verificar las clases del grupo.')
      const permitidas = new Set((relaciones || []).map(item => Number(item.clase_formacion_id)))
      if (ids.some(id => !permitidas.has(Number(id)))) {
        return NextResponse.json({ ok: false, error: 'La selección incluye clases que no pertenecen al grupo.' }, { status: 400 })
      }

      const { data: clasesSeleccionadas, error: errorClases } = await supabase
        .from('clases_formacion')
        .select('id, categoria, tipo_formacion, activo')
        .in('id', ids)
      if (errorClases) throw new Error('No fue posible comprobar las categorías seleccionadas.')
      if (!Array.isArray(clasesSeleccionadas) || clasesSeleccionadas.length !== ids.length ||
          clasesSeleccionadas.some(clase =>
            clase.activo === false ||
            mayusculas(clase.tipo_formacion) !== mayusculas(grupo.tipo_formacion) ||
            !categoriaHabilitadaEmpresa(empresa, clase.categoria))) {
        return NextResponse.json({ ok: false, error: 'Existen clases inactivas, no autorizadas o incompatibles con el grupo.' }, { status: 400 })
      }

      const cambios = { updated_at: new Date().toISOString() }
      if (actualizarContenido) cambios.contenido = contenido
      if (actualizarTarjeta) cambios.contenido_tarjeta = contenidoTarjeta

      const { data: actualizadas, error: errorActualizar } = await supabase
        .from('clases_formacion')
        .update(cambios)
        .in('id', ids)
        .select('id')
      if (errorActualizar) throw new Error('No fue posible actualizar los textos del grupo.')
      if ((actualizadas || []).length !== ids.length) {
        throw new Error('No se pudo confirmar la actualización de todas las clases seleccionadas.')
      }

      return NextResponse.json({
        ok: true,
        message: 'Contenido y competencias actualizados en las clases seleccionadas.',
        cantidad: actualizadas.length,
      })
    }

    // Cambio aislado del estado: no reescribe asociaciones ni otros atributos.
    if (mayusculas(body?.recurso) === 'ESTADO_GRUPO_TRANSVERSAL') {
      const grupoId = Number(body?.id)
      if (!Number.isInteger(grupoId) || grupoId <= 0 || typeof body?.activo !== 'boolean') {
        return NextResponse.json({ok:false,error:'Indique un grupo y el estado válido.'},{status:400})
      }
      const {data:grupo,error:errorGrupo}=await supabase
        .from('grupos_clases_formacion')
        .select('id').eq('id',grupoId).maybeSingle()
      if(errorGrupo) throw new Error('No fue posible comprobar el grupo transversal.')
      if(!grupo) return NextResponse.json({ok:false,error:'El grupo no existe en este CEA.'},{status:404})
      const {data:actualizado,error:errorActualizar}=await supabase
        .from('grupos_clases_formacion')
        .update({activo:body.activo,updated_at:new Date().toISOString()})
        .eq('id',grupoId).select('id,activo').single()
      if(errorActualizar || !actualizado) throw new Error('No fue posible cambiar el estado del grupo.')
      return NextResponse.json({ok:true,grupo:actualizado,mensaje:body.activo?'Grupo activado.':'Grupo inactivado.'})
    }

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
      await obtenerContextoCEA(request, { rolesPermitidos: ['ADMINISTRATIVO'], body })

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