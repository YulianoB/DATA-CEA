// app/api/admin/pesv/plan-formacion/route.js

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


function numeroOpcional(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    texto(
      valor
    ) === ''
  ) {
    return null
  }

  const numero =
    Number(
      valor
    )

  return Number.isFinite(
    numero
  )
    ? numero
    : null
}


function idOpcional(
  valor
) {
  const numero =
    numeroEntero(
      valor
    )

  return numero > 0
    ? numero
    : null
}


function usuarioActualizacion(
  body
) {
  return texto(
    body?.usuario_actualizacion ||
    body?.usuario ||
    body?.usuarioActual ||
    ''
  ) || null
}


function anioActual() {
  return new Date()
    .getFullYear()
}


function validarAnio(
  valor
) {
  const anio =
    numeroEntero(
      valor
    )

  if (
    anio < 2022
  ) {
    return null
  }

  return anio
}


function fechaValida(
  valor
) {
  const fecha =
    texto(
      valor
    )

  if (!fecha) {
    return null
  }

  const patron =
    /^\d{4}-\d{2}-\d{2}$/

  if (
    !patron.test(
      fecha
    )
  ) {
    return null
  }

  return fecha
}


function trimestreDesdeFecha(
  fecha
) {
  const valor =
    fechaValida(
      fecha
    )

  if (!valor) {
    return null
  }

  const mes =
    Number(
      valor.slice(
        5,
        7
      )
    )

  if (
    mes >= 1 &&
    mes <= 3
  ) {
    return 1
  }

  if (
    mes >= 4 &&
    mes <= 6
  ) {
    return 2
  }

  if (
    mes >= 7 &&
    mes <= 9
  ) {
    return 3
  }

  if (
    mes >= 10 &&
    mes <= 12
  ) {
    return 4
  }

  return null
}


function validarEstadoActividad(
  valor
) {
  const estado =
    texto(
      valor
    )
      .toUpperCase()

  const permitidos = [
    'PROGRAMADA',
    'EN_EJECUCION',
    'EJECUTADA',
    'REPROGRAMADA',
    'CANCELADA',
  ]

  if (!estado) {
    return 'PROGRAMADA'
  }

  return permitidos.includes(
    estado
  )
    ? estado
    : null
}


function validarEstadoPlan(
  valor
) {
  const estado =
    texto(
      valor
    )
      .toUpperCase()

  if (!estado) {
    return 'BORRADOR'
  }

  return estado
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
// RESPUESTAS
// ============================================================

function respuestaOk(
  body = {},
  status = 200
) {
  return NextResponse.json(
    {
      ok: true,
      ...body,
    },
    {
      status,
    }
  )
}


function respuestaError(
  mensaje,
  status = 400
) {
  return NextResponse.json(
    {
      ok: false,
      error:
        mensaje,
    },
    {
      status,
    }
  )
}


function respuestaDesdeError(
  error,
  mensajePredeterminado
) {
  console.error(
    mensajePredeterminado,
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

  return respuestaError(
    error?.message ||
    mensajePredeterminado,
    500
  )
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
      configuracion
        ?.logo_actual_path
    )

  if (!path) {
    return {
      path: null,
      url: null,
    }
  }

  const {
    data:
      signed,
    error:
      errorUrl,
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
      url: null,
    }
  }

  return {
    path,
    url:
      signed
        ?.signedUrl ||
      null,
  }
}


// ============================================================
// PLAN
// ============================================================

async function obtenerPlanPorAnio(
  supabase,
  anio
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_planes_formacion'
      )
      .select(
        `
          id,
          anio,
          nombre,
          objetivo_general,
          fecha_aprobacion,
          estado,
          responsable_personal_id,
          responsable_nombre,
          observaciones,
          usuario_creacion,
          usuario_actualizacion,
          created_at,
          updated_at
        `
      )
      .eq(
        'anio',
        anio
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  return data || null
}


async function obtenerPlanPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_planes_formacion'
      )
      .select(
        `
          id,
          anio,
          nombre,
          objetivo_general,
          fecha_aprobacion,
          estado,
          responsable_personal_id,
          responsable_nombre,
          observaciones,
          usuario_creacion,
          usuario_actualizacion,
          created_at,
          updated_at
        `
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  return data || null
}


// ============================================================
// ACTIVIDADES
// ============================================================

async function obtenerActividades(
  supabase,
  planId
) {
  if (!planId) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_plan_formacion_actividades'
      )
      .select(
        `
          id,
          plan_formacion_id,
          codigo,
          programa_pesv_relacionado,
          nombre,
          descripcion,
          tema,
          objetivo,
          dirigido_a,
          formador_perfil_requerido,
          area_participante,
          personas_programadas,
          modalidad,
          responsable_personal_id,
          responsable_nombre,
          fecha_programada,
          trimestre,
          duracion_horas,
          evidencia_esperada,
          indicador_id,
          meta,
          estado,
          observaciones,
          usuario_creacion,
          usuario_actualizacion,
          created_at,
          updated_at
        `
      )
      .eq(
        'plan_formacion_id',
        planId
      )
      .order(
        'fecha_programada',
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
    throw error
  }

  return data || []
}


async function obtenerActividadPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_plan_formacion_actividades'
      )
      .select(
        `
          id,
          plan_formacion_id,
          codigo,
          programa_pesv_relacionado,
          nombre,
          descripcion,
          tema,
          objetivo,
          dirigido_a,
          formador_perfil_requerido,
          area_participante,
          personas_programadas,
          modalidad,
          responsable_personal_id,
          responsable_nombre,
          fecha_programada,
          trimestre,
          duracion_horas,
          evidencia_esperada,
          indicador_id,
          meta,
          estado,
          observaciones,
          usuario_creacion,
          usuario_actualizacion,
          created_at,
          updated_at
        `
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  return data || null
}


// ============================================================
// EJECUCIONES
// ============================================================

async function obtenerEjecuciones(
  supabase,
  actividadIds
) {
  if (
    !Array.isArray(
      actividadIds
    ) ||
    actividadIds.length === 0
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_plan_formacion_ejecuciones'
      )
      .select(
        `
          id,
          actividad_id,
          reunion_id,
          fecha_ejecucion,
          duracion_horas,
          numero_asistentes,
          resultado,
          evidencia_path,
          observaciones,
          usuario_registro,
          usuario_actualizacion,
          created_at,
          updated_at
        `
      )
      .in(
        'actividad_id',
        actividadIds
      )
      .order(
        'fecha_ejecucion',
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
    throw error
  }

  return data || []
}


async function obtenerEjecucionPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_plan_formacion_ejecuciones'
      )
      .select(
        `
          id,
          actividad_id,
          reunion_id,
          fecha_ejecucion,
          duracion_horas,
          numero_asistentes,
          resultado,
          evidencia_path,
          observaciones,
          usuario_registro,
          usuario_actualizacion,
          created_at,
          updated_at
        `
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  return data || null
}


// ============================================================
// REUNIONES
// ============================================================

async function obtenerReunionesPesvPorAnio(
  supabase,
  anio
) {
  const fechaInicio =
    `${anio}-01-01`

  const fechaFin =
    `${anio}-12-31`

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'reuniones'
      )
      .select(
        `
          id,
          tipo_reunion,
          descripcion,
          fecha_programada,
          hora_inicio,
          hora_fin,
          modalidad,
          enlace_asistencia,
          estado,
          creado_por,
          responsable,
          dirigido_a,
          lugar,
          origen_modulo,
          timestamp_creacion
        `
      )
      .eq(
        'origen_modulo',
        'PESV'
      )
      .gte(
        'fecha_programada',
        fechaInicio
      )
      .lte(
        'fecha_programada',
        fechaFin
      )
      .order(
        'fecha_programada',
        {
          ascending:
            true,
        }
      )
      .order(
        'hora_inicio',
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

  return data || []
}


// ============================================================
// ASISTENCIAS
// ============================================================

async function obtenerAsistenciasPorReuniones(
  supabase,
  reunionIds
) {
  if (
    !Array.isArray(
      reunionIds
    ) ||
    reunionIds.length === 0
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'asistencias'
      )
      .select(
        `
          id,
          id_reunion,
          documento_usuario,
          nombre_usuario,
          rol_usuario,
          timestamp_asistencia
        `
      )
      .in(
        'id_reunion',
        reunionIds
      )

  if (
    error
  ) {
    throw error
  }

  return data || []
}


// ============================================================
// PERSONAL
// ============================================================

async function obtenerPersonal(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'personal'
      )
      .select(
        `
          id,
          documento,
          nombres,
          apellidos,
          tipo_personal,
          cargo,
          grupo_personal,
          estado,
          email,
          rol_conductor_instructor
        `
      )
      .eq(
        'estado',
        'activo'
      )
      .order(
        'nombres',
        {
          ascending:
            true,
        }
      )
      .order(
        'apellidos',
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

  return (
    data || []
  ).map(
    (
      persona
    ) => ({
      ...persona,

      nombre_completo:
        [
          texto(
            persona.nombres
          ),
          texto(
            persona.apellidos
          ),
        ]
          .filter(
            Boolean
          )
          .join(
            ' '
          ),
    })
  )
}


// ============================================================
// INDICADORES
// ============================================================

async function obtenerIndicadores(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_indicadores_catalogo'
      )
      .select(
        `
          id,
          codigo,
          numero_normativo,
          nombre,
          descripcion,
          formula,
          periodicidad,
          unidad,
          sentido_mejora,
          fuente_datos,
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

  return data || []
}


// ============================================================
// ENRIQUECER EJECUCIONES
// ============================================================

function construirEjecucionesEnriquecidas({
  ejecuciones,
  reuniones,
  asistencias,
}) {
  const mapaReuniones =
    new Map(
      reuniones.map(
        (
          reunion
        ) => [
          reunion.id,
          reunion,
        ]
      )
    )

  const asistenciasPorReunion =
    new Map()

  for (
    const asistencia
    of asistencias
  ) {
    const reunionId =
      asistencia.id_reunion

    if (
      !asistenciasPorReunion
        .has(
          reunionId
        )
    ) {
      asistenciasPorReunion
        .set(
          reunionId,
          []
        )
    }

    asistenciasPorReunion
      .get(
        reunionId
      )
      .push(
        asistencia
      )
  }

  return ejecuciones.map(
    (
      ejecucion
    ) => {
      const reunion =
        ejecucion.reunion_id
          ? mapaReuniones.get(
              ejecucion.reunion_id
            ) || null
          : null

      const listaAsistencias =
        ejecucion.reunion_id
          ? (
              asistenciasPorReunion.get(
                ejecucion.reunion_id
              ) || []
            )
          : []

      const documentosUnicos =
        new Set(
          listaAsistencias
            .map(
              (
                asistencia
              ) =>
                texto(
                  asistencia
                    .documento_usuario
                )
            )
            .filter(
              Boolean
            )
        )

      const numeroAsistentesReal =
        reunion
          ? documentosUnicos.size
          : (
              ejecucion.numero_asistentes ??
              0
            )

      return {
        ...ejecucion,

        reunion,

        asistencias:
          listaAsistencias,

        numero_asistentes_real:
          numeroAsistentesReal,

        fuente_asistentes:
          reunion
            ? 'ASISTENCIAS'
            : 'REGISTRO_HISTORICO',
      }
    }
  )
}


// ============================================================
// RESUMEN PLAN
// ============================================================

function construirResumen(
  actividades,
  ejecuciones
) {
  const total =
    actividades.length

  const programadas =
    actividades.filter(
      (
        actividad
      ) =>
        texto(
          actividad.estado
        )
          .toUpperCase() ===
        'PROGRAMADA'
    ).length

  const ejecutadas =
    actividades.filter(
      (
        actividad
      ) =>
        texto(
          actividad.estado
        )
          .toUpperCase() ===
        'EJECUTADA'
    ).length

  const enEjecucion =
    actividades.filter(
      (
        actividad
      ) =>
        texto(
          actividad.estado
        )
          .toUpperCase() ===
        'EN_EJECUCION'
    ).length

  const reprogramadas =
    actividades.filter(
      (
        actividad
      ) =>
        texto(
          actividad.estado
        )
          .toUpperCase() ===
        'REPROGRAMADA'
    ).length

  const canceladas =
    actividades.filter(
      (
        actividad
      ) =>
        texto(
          actividad.estado
        )
          .toUpperCase() ===
        'CANCELADA'
    ).length

  const actividadesConEjecucion =
    new Set(
      ejecuciones.map(
        (
          ejecucion
        ) =>
          ejecucion.actividad_id
      )
    ).size

  return {
    total_actividades:
      total,

    programadas,

    ejecutadas,

    en_ejecucion:
      enEjecucion,

    reprogramadas,

    canceladas,

    actividades_con_ejecucion:
      actividadesConEjecucion,
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

    const url =
      new URL(
        request.url
      )

    const anioParametro =
      texto(
        url.searchParams.get(
          'anio'
        )
      )

    let anio =
      anioActual()

    if (
      anioParametro
    ) {
      const anioValidado =
        validarAnio(
          anioParametro
        )

      if (
        !anioValidado
      ) {
        return respuestaError(
          'El año consultado no es válido.'
        )
      }

      anio =
        anioValidado
    }


    const [
      plan,
      personal,
      indicadores,
      reuniones,
      logo,
    ] =
      await Promise.all([
        obtenerPlanPorAnio(
          supabase,
          anio
        ),

        obtenerPersonal(
          supabase
        ),

        obtenerIndicadores(
          supabase
        ),

        obtenerReunionesPesvPorAnio(
          supabase,
          anio
        ),

        obtenerLogo(
          supabase
        ),
      ])


    const actividades =
      plan?.id
        ? await obtenerActividades(
            supabase,
            plan.id
          )
        : []


    const actividadIds =
      actividades.map(
        (
          actividad
        ) =>
          actividad.id
      )


    const ejecuciones =
      actividadIds.length
        ? await obtenerEjecuciones(
            supabase,
            actividadIds
          )
        : []


    const reunionIds =
      Array.from(
        new Set(
          ejecuciones
            .map(
              (
                ejecucion
              ) =>
                ejecucion
                  .reunion_id
            )
            .filter(
              Boolean
            )
        )
      )


    const asistencias =
      reunionIds.length
        ? await obtenerAsistenciasPorReuniones(
            supabase,
            reunionIds
          )
        : []


    const ejecucionesEnriquecidas =
      construirEjecucionesEnriquecidas({
        ejecuciones,
        reuniones,
        asistencias,
      })


    const ejecucionesPorActividad =
      {}

    for (
      const ejecucion
      of ejecucionesEnriquecidas
    ) {
      const key =
        String(
          ejecucion.actividad_id
        )

      if (
        !ejecucionesPorActividad[
          key
        ]
      ) {
        ejecucionesPorActividad[
          key
        ] = []
      }

      ejecucionesPorActividad[
        key
      ].push(
        ejecucion
      )
    }


    const actividadesEnriquecidas =
      actividades.map(
        (
          actividad
        ) => ({
          ...actividad,

          indicador:
            indicadores.find(
              (
                indicador
              ) =>
                indicador.id ===
                actividad.indicador_id
            ) || null,

          ejecuciones:
            ejecucionesPorActividad[
              String(
                actividad.id
              )
            ] || [],
        })
      )


    return respuestaOk({
      empresa:
        construirEmpresa(
          empresa
        ),

      logo,

      anio,

      plan,

      actividades:
        actividadesEnriquecidas,

      ejecuciones:
        ejecucionesEnriquecidas,

      reuniones_pesv:
        reuniones,

      personal,

      indicadores,

      resumen:
        construirResumen(
          actividades,
          ejecucionesEnriquecidas
        ),
    })
  } catch (
    error
  ) {
    return respuestaDesdeError(
      error,
      'No fue posible consultar el Plan Anual de Formación PESV.'
    )
  }
}


// ============================================================
// POST
//
// ACCIONES:
// - crear_plan
// - crear_actividad
// - crear_ejecucion
// ============================================================

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
      texto(
        body?.accion
      )
        .toLowerCase()

    const usuario =
      usuarioActualizacion(
        body
      )

    const ahora =
      new Date()
        .toISOString()


    // ========================================================
    // CREAR PLAN
    // ========================================================

    if (
      accion ===
      'crear_plan'
    ) {
      const anio =
        validarAnio(
          body?.anio
        )

      const nombre =
        texto(
          body?.nombre
        )

      if (!anio) {
        return respuestaError(
          'El año del Plan Anual de Formación no es válido.'
        )
      }

      if (!nombre) {
        return respuestaError(
          'El nombre del Plan Anual de Formación es obligatorio.'
        )
      }

      const fechaAprobacionTexto =
        texto(
          body?.fecha_aprobacion
        )

      const fechaAprobacion =
        fechaAprobacionTexto
          ? fechaValida(
              fechaAprobacionTexto
            )
          : null

      if (
        fechaAprobacionTexto &&
        !fechaAprobacion
      ) {
        return respuestaError(
          'La fecha de aprobación no es válida.'
        )
      }

      const payload = {
        anio,

        nombre,

        objetivo_general:
          texto(
            body?.objetivo_general
          ) ||
          null,

        fecha_aprobacion:
          fechaAprobacion,

        estado:
          validarEstadoPlan(
            body?.estado
          ),

        responsable_personal_id:
          idOpcional(
            body?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body?.responsable_nombre
          ) ||
          null,

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        usuario_creacion:
          usuario,

        usuario_actualizacion:
          usuario,

        created_at:
          ahora,

        updated_at:
          ahora,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_planes_formacion'
          )
          .insert(
            payload
          )
          .select(
            `
              id,
              anio,
              nombre,
              objetivo_general,
              fecha_aprobacion,
              estado,
              responsable_personal_id,
              responsable_nombre,
              observaciones,
              usuario_creacion,
              usuario_actualizacion,
              created_at,
              updated_at
            `
          )
          .single()

      if (
        error
      ) {
        if (
          error?.code ===
          '23505'
        ) {
          return respuestaError(
            'Ya existe un Plan Anual de Formación PESV para el año seleccionado.'
          )
        }

        throw error
      }

      return respuestaOk(
        {
          message:
            'Plan Anual de Formación PESV creado correctamente.',

          plan:
            data,
        },
        201
      )
    }


    // ========================================================
    // CREAR ACTIVIDAD
    // ========================================================

    if (
      accion ===
      'crear_actividad'
    ) {
      const planId =
        numeroEntero(
          body?.plan_formacion_id
        )

      const nombre =
        texto(
          body?.nombre
        )

      const fechaProgramada =
        fechaValida(
          body?.fecha_programada
        )

      if (
        planId <= 0
      ) {
        return respuestaError(
          'El Plan Anual de Formación asociado no es válido.'
        )
      }

      if (!nombre) {
        return respuestaError(
          'La actividad de formación es obligatoria.'
        )
      }

      if (
        !fechaProgramada
      ) {
        return respuestaError(
          'La fecha programada de la actividad es obligatoria y debe ser válida.'
        )
      }

      const plan =
        await obtenerPlanPorId(
          supabase,
          planId
        )

      if (!plan) {
        return respuestaError(
          'El Plan Anual de Formación no existe.',
          404
        )
      }

      const estado =
        validarEstadoActividad(
          body?.estado
        )

      if (!estado) {
        return respuestaError(
          'El estado de la actividad no es válido.'
        )
      }

      const personasProgramadas =
        numeroOpcional(
          body?.personas_programadas
        )

      if (
        personasProgramadas !==
          null &&
        personasProgramadas < 0
      ) {
        return respuestaError(
          'El número de personas programadas no puede ser negativo.'
        )
      }

      const duracion =
        numeroOpcional(
          body?.duracion_horas
        )

      if (
        duracion !== null &&
        duracion < 0
      ) {
        return respuestaError(
          'La duración de la actividad no puede ser negativa.'
        )
      }

      const payload = {
        plan_formacion_id:
          planId,

        codigo:
          texto(
            body?.codigo
          ) ||
          null,

        programa_pesv_relacionado:
          texto(
            body?.programa_pesv_relacionado
          ) ||
          null,

        nombre,

        descripcion:
          texto(
            body?.descripcion
          ) ||
          null,

        tema:
          texto(
            body?.tema
          ) ||
          null,

        objetivo:
          texto(
            body?.objetivo
          ) ||
          null,

        dirigido_a:
          texto(
            body?.dirigido_a
          ) ||
          null,

        formador_perfil_requerido:
          texto(
            body?.formador_perfil_requerido
          ) ||
          null,

        area_participante:
          texto(
            body?.area_participante
          ) ||
          null,

        personas_programadas:
          personasProgramadas,

        modalidad:
          texto(
            body?.modalidad
          ) ||
          null,

        responsable_personal_id:
          idOpcional(
            body?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body?.responsable_nombre
          ) ||
          null,

        fecha_programada:
          fechaProgramada,

        trimestre:
          trimestreDesdeFecha(
            fechaProgramada
          ),

        duracion_horas:
          duracion,

        evidencia_esperada:
          texto(
            body?.evidencia_esperada
          ) ||
          null,

        indicador_id:
          idOpcional(
            body?.indicador_id
          ),

        meta:
          texto(
            body?.meta
          ) ||
          null,

        estado,

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        usuario_creacion:
          usuario,

        usuario_actualizacion:
          usuario,

        created_at:
          ahora,

        updated_at:
          ahora,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_plan_formacion_actividades'
          )
          .insert(
            payload
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        throw error
      }

      return respuestaOk(
        {
          message:
            'Actividad de formación creada correctamente.',

          actividad:
            data,
        },
        201
      )
    }


    // ========================================================
    // CREAR EJECUCIÓN
    //
    // Puede ser:
    //
    // 1. Vinculada a reunión:
    //    reunion_id != null
    //
    // 2. Histórica:
    //    reunion_id = null
    // ========================================================

    if (
      accion ===
      'crear_ejecucion'
    ) {
      const actividadId =
        numeroEntero(
          body?.actividad_id
        )

      if (
        actividadId <= 0
      ) {
        return respuestaError(
          'La actividad de formación asociada no es válida.'
        )
      }

      const actividad =
        await obtenerActividadPorId(
          supabase,
          actividadId
        )

      if (!actividad) {
        return respuestaError(
          'La actividad de formación no existe.',
          404
        )
      }

      const reunionId =
        texto(
          body?.reunion_id
        ) ||
        null

      const fechaEjecucion =
        fechaValida(
          body?.fecha_ejecucion
        )

      if (
        !fechaEjecucion
      ) {
        return respuestaError(
          'La fecha de ejecución es obligatoria y debe ser válida.'
        )
      }

      let reunion =
        null

      let numeroAsistentes =
        numeroOpcional(
          body?.numero_asistentes
        )

      if (
        reunionId
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              'reuniones'
            )
            .select(
              `
                id,
                fecha_programada,
                estado,
                origen_modulo
              `
            )
            .eq(
              'id',
              reunionId
            )
            .maybeSingle()

        if (
          error
        ) {
          throw error
        }

        reunion =
          data || null

        if (!reunion) {
          return respuestaError(
            'La reunión seleccionada no existe.',
            404
          )
        }

        if (
          texto(
            reunion.origen_modulo
          )
            .toUpperCase() !==
          'PESV'
        ) {
          return respuestaError(
            'La reunión seleccionada no pertenece al contexto PESV.'
          )
        }

        const {
          count,
          error:
            errorAsistencias,
        } =
          await supabase
            .from(
              'asistencias'
            )
            .select(
              'id',
              {
                count:
                  'exact',

                head:
                  true,
              }
            )
            .eq(
              'id_reunion',
              reunionId
            )

        if (
          errorAsistencias
        ) {
          throw errorAsistencias
        }

        numeroAsistentes =
          Number(
            count || 0
          )
      } else {
        if (
          numeroAsistentes !==
            null &&
          numeroAsistentes < 0
        ) {
          return respuestaError(
            'El número de asistentes no puede ser negativo.'
          )
        }
      }

      const duracion =
        numeroOpcional(
          body?.duracion_horas
        )

      if (
        duracion !== null &&
        duracion < 0
      ) {
        return respuestaError(
          'La duración ejecutada no puede ser negativa.'
        )
      }

      const payload = {
        actividad_id:
          actividadId,

        reunion_id:
          reunionId,

        fecha_ejecucion:
          fechaEjecucion,

        duracion_horas:
          duracion,

        numero_asistentes:
          numeroAsistentes,

        resultado:
          texto(
            body?.resultado
          ) ||
          null,

        evidencia_path:
          texto(
            body?.evidencia_path
          ) ||
          null,

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        usuario_registro:
          usuario,

        usuario_actualizacion:
          usuario,

        created_at:
          ahora,

        updated_at:
          ahora,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_plan_formacion_ejecuciones'
          )
          .insert(
            payload
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        if (
          error?.code ===
          '23505'
        ) {
          return respuestaError(
            'Esta reunión ya está vinculada como ejecución de esta actividad.'
          )
        }

        throw error
      }


      // ======================================================
      // ACTUALIZAR ESTADO DE ACTIVIDAD
      // ======================================================

      const {
        error:
          errorActividad,
      } =
        await supabase
          .from(
            'pesv_plan_formacion_actividades'
          )
          .update({
            estado:
              'EJECUTADA',

            usuario_actualizacion:
              usuario,

            updated_at:
              ahora,
          })
          .eq(
            'id',
            actividadId
          )

      if (
        errorActividad
      ) {
        throw errorActividad
      }


      return respuestaOk(
        {
          message:
            'Ejecución de la actividad registrada correctamente.',

          ejecucion:
            data,
        },
        201
      )
    }


    return respuestaError(
      'La acción solicitada no es válida.'
    )
  } catch (
    error
  ) {
    return respuestaDesdeError(
      error,
      'No fue posible crear el registro del Plan Anual de Formación PESV.'
    )
  }
}


// ============================================================
// PATCH
//
// ACCIONES:
// - actualizar_plan
// - actualizar_actividad
// - actualizar_ejecucion
// ============================================================

export async function PATCH(
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
      texto(
        body?.accion
      )
        .toLowerCase()

    const usuario =
      usuarioActualizacion(
        body
      )

    const ahora =
      new Date()
        .toISOString()


    // ========================================================
    // ACTUALIZAR PLAN
    // ========================================================

    if (
      accion ===
      'actualizar_plan'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <= 0
      ) {
        return respuestaError(
          'El Plan Anual de Formación que desea actualizar no es válido.'
        )
      }

      const existente =
        await obtenerPlanPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'El Plan Anual de Formación no existe.',
          404
        )
      }

      const anio =
        validarAnio(
          body?.anio
        )

      const nombre =
        texto(
          body?.nombre
        )

      if (!anio) {
        return respuestaError(
          'El año del Plan Anual de Formación no es válido.'
        )
      }

      if (!nombre) {
        return respuestaError(
          'El nombre del Plan Anual de Formación es obligatorio.'
        )
      }

      const fechaAprobacionTexto =
        texto(
          body?.fecha_aprobacion
        )

      const fechaAprobacion =
        fechaAprobacionTexto
          ? fechaValida(
              fechaAprobacionTexto
            )
          : null

      if (
        fechaAprobacionTexto &&
        !fechaAprobacion
      ) {
        return respuestaError(
          'La fecha de aprobación no es válida.'
        )
      }

      const payload = {
        anio,

        nombre,

        objetivo_general:
          texto(
            body?.objetivo_general
          ) ||
          null,

        fecha_aprobacion:
          fechaAprobacion,

        estado:
          validarEstadoPlan(
            body?.estado
          ),

        responsable_personal_id:
          idOpcional(
            body?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body?.responsable_nombre
          ) ||
          null,

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        usuario_actualizacion:
          usuario,

        updated_at:
          ahora,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_planes_formacion'
          )
          .update(
            payload
          )
          .eq(
            'id',
            id
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        if (
          error?.code ===
          '23505'
        ) {
          return respuestaError(
            'Ya existe otro Plan Anual de Formación PESV para el año seleccionado.'
          )
        }

        throw error
      }

      return respuestaOk({
        message:
          'Plan Anual de Formación PESV actualizado correctamente.',

        plan:
          data,
      })
    }


    // ========================================================
    // ACTUALIZAR ACTIVIDAD
    // ========================================================

    if (
      accion ===
      'actualizar_actividad'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <= 0
      ) {
        return respuestaError(
          'La actividad que desea actualizar no es válida.'
        )
      }

      const existente =
        await obtenerActividadPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'La actividad de formación no existe.',
          404
        )
      }

      const nombre =
        texto(
          body?.nombre
        )

      const fechaProgramada =
        fechaValida(
          body?.fecha_programada
        )

      if (!nombre) {
        return respuestaError(
          'La actividad de formación es obligatoria.'
        )
      }

      if (
        !fechaProgramada
      ) {
        return respuestaError(
          'La fecha programada es obligatoria y debe ser válida.'
        )
      }

      const estado =
        validarEstadoActividad(
          body?.estado
        )

      if (!estado) {
        return respuestaError(
          'El estado de la actividad no es válido.'
        )
      }

      const personasProgramadas =
        numeroOpcional(
          body?.personas_programadas
        )

      if (
        personasProgramadas !==
          null &&
        personasProgramadas < 0
      ) {
        return respuestaError(
          'El número de personas programadas no puede ser negativo.'
        )
      }

      const duracion =
        numeroOpcional(
          body?.duracion_horas
        )

      if (
        duracion !== null &&
        duracion < 0
      ) {
        return respuestaError(
          'La duración de la actividad no puede ser negativa.'
        )
      }

      const payload = {
        codigo:
          texto(
            body?.codigo
          ) ||
          null,

        programa_pesv_relacionado:
          texto(
            body?.programa_pesv_relacionado
          ) ||
          null,

        nombre,

        descripcion:
          texto(
            body?.descripcion
          ) ||
          null,

        tema:
          texto(
            body?.tema
          ) ||
          null,

        objetivo:
          texto(
            body?.objetivo
          ) ||
          null,

        dirigido_a:
          texto(
            body?.dirigido_a
          ) ||
          null,

        formador_perfil_requerido:
          texto(
            body?.formador_perfil_requerido
          ) ||
          null,

        area_participante:
          texto(
            body?.area_participante
          ) ||
          null,

        personas_programadas:
          personasProgramadas,

        modalidad:
          texto(
            body?.modalidad
          ) ||
          null,

        responsable_personal_id:
          idOpcional(
            body?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body?.responsable_nombre
          ) ||
          null,

        fecha_programada:
          fechaProgramada,

        trimestre:
          trimestreDesdeFecha(
            fechaProgramada
          ),

        duracion_horas:
          duracion,

        evidencia_esperada:
          texto(
            body?.evidencia_esperada
          ) ||
          null,

        indicador_id:
          idOpcional(
            body?.indicador_id
          ),

        meta:
          texto(
            body?.meta
          ) ||
          null,

        estado,

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        usuario_actualizacion:
          usuario,

        updated_at:
          ahora,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_plan_formacion_actividades'
          )
          .update(
            payload
          )
          .eq(
            'id',
            id
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Actividad de formación actualizada correctamente.',

        actividad:
          data,
      })
    }


    // ========================================================
    // ACTUALIZAR EJECUCIÓN
    // ========================================================

    if (
      accion ===
      'actualizar_ejecucion'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <= 0
      ) {
        return respuestaError(
          'La ejecución que desea actualizar no es válida.'
        )
      }

      const existente =
        await obtenerEjecucionPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'La ejecución no existe.',
          404
        )
      }

      const fechaEjecucion =
        fechaValida(
          body?.fecha_ejecucion
        )

      if (
        !fechaEjecucion
      ) {
        return respuestaError(
          'La fecha de ejecución es obligatoria y debe ser válida.'
        )
      }

      const duracion =
        numeroOpcional(
          body?.duracion_horas
        )

      if (
        duracion !== null &&
        duracion < 0
      ) {
        return respuestaError(
          'La duración ejecutada no puede ser negativa.'
        )
      }

      let numeroAsistentes =
        numeroOpcional(
          body?.numero_asistentes
        )

      if (
        existente.reunion_id
      ) {
        const {
          count,
          error:
            errorConteo,
        } =
          await supabase
            .from(
              'asistencias'
            )
            .select(
              'id',
              {
                count:
                  'exact',

                head:
                  true,
              }
            )
            .eq(
              'id_reunion',
              existente.reunion_id
            )

        if (
          errorConteo
        ) {
          throw errorConteo
        }

        numeroAsistentes =
          Number(
            count || 0
          )
      } else {
        if (
          numeroAsistentes !==
            null &&
          numeroAsistentes < 0
        ) {
          return respuestaError(
            'El número de asistentes no puede ser negativo.'
          )
        }
      }

      const payload = {
        fecha_ejecucion:
          fechaEjecucion,

        duracion_horas:
          duracion,

        numero_asistentes:
          numeroAsistentes,

        resultado:
          texto(
            body?.resultado
          ) ||
          null,

        evidencia_path:
          texto(
            body?.evidencia_path
          ) ||
          null,

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        usuario_actualizacion:
          usuario,

        updated_at:
          ahora,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_plan_formacion_ejecuciones'
          )
          .update(
            payload
          )
          .eq(
            'id',
            id
          )
          .select(
            '*'
          )
          .single()

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Ejecución actualizada correctamente.',

        ejecucion:
          data,
      })
    }


    return respuestaError(
      'La acción solicitada no es válida.'
    )
  } catch (
    error
  ) {
    return respuestaDesdeError(
      error,
      'No fue posible actualizar el Plan Anual de Formación PESV.'
    )
  }
}


// ============================================================
// DELETE
//
// ACCIONES:
// - eliminar_plan
// - eliminar_actividad
// - eliminar_ejecucion
// ============================================================

export async function DELETE(
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
      texto(
        body?.accion
      )
        .toLowerCase()


    // ========================================================
    // ELIMINAR EJECUCIÓN
    // ========================================================

    if (
      accion ===
      'eliminar_ejecucion'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <= 0
      ) {
        return respuestaError(
          'La ejecución que desea eliminar no es válida.'
        )
      }

      const existente =
        await obtenerEjecucionPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'La ejecución no existe.',
          404
        )
      }

      const {
        error,
      } =
        await supabase
          .from(
            'pesv_plan_formacion_ejecuciones'
          )
          .delete()
          .eq(
            'id',
            id
          )

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Ejecución eliminada correctamente.',
      })
    }


    // ========================================================
    // ELIMINAR ACTIVIDAD
    // ========================================================

    if (
      accion ===
      'eliminar_actividad'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <= 0
      ) {
        return respuestaError(
          'La actividad que desea eliminar no es válida.'
        )
      }

      const existente =
        await obtenerActividadPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'La actividad de formación no existe.',
          404
        )
      }

      const {
        count,
        error:
          errorEjecuciones,
      } =
        await supabase
          .from(
            'pesv_plan_formacion_ejecuciones'
          )
          .select(
            'id',
            {
              count:
                'exact',

              head:
                true,
            }
          )
          .eq(
            'actividad_id',
            id
          )

      if (
        errorEjecuciones
      ) {
        throw errorEjecuciones
      }

      if (
        Number(
          count || 0
        ) > 0
      ) {
        return respuestaError(
          'No puede eliminar la actividad porque ya tiene ejecuciones registradas. Elimine primero las ejecuciones o conserve la actividad como evidencia histórica.'
        )
      }

      const {
        error,
      } =
        await supabase
          .from(
            'pesv_plan_formacion_actividades'
          )
          .delete()
          .eq(
            'id',
            id
          )

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Actividad de formación eliminada correctamente.',
      })
    }


    // ========================================================
    // ELIMINAR PLAN
    // ========================================================

    if (
      accion ===
      'eliminar_plan'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <= 0
      ) {
        return respuestaError(
          'El Plan Anual de Formación que desea eliminar no es válido.'
        )
      }

      const existente =
        await obtenerPlanPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'El Plan Anual de Formación no existe.',
          404
        )
      }

      const {
        count,
        error:
          errorActividades,
      } =
        await supabase
          .from(
            'pesv_plan_formacion_actividades'
          )
          .select(
            'id',
            {
              count:
                'exact',

              head:
                true,
            }
          )
          .eq(
            'plan_formacion_id',
            id
          )

      if (
        errorActividades
      ) {
        throw errorActividades
      }

      if (
        Number(
          count || 0
        ) > 0
      ) {
        return respuestaError(
          'No puede eliminar el Plan Anual de Formación porque tiene actividades registradas. Elimine primero las actividades o cambie el estado del plan.'
        )
      }

      const {
        error,
      } =
        await supabase
          .from(
            'pesv_planes_formacion'
          )
          .delete()
          .eq(
            'id',
            id
          )

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Plan Anual de Formación PESV eliminado correctamente.',
      })
    }


    return respuestaError(
      'La acción solicitada no es válida.'
    )
  } catch (
    error
  ) {
    return respuestaDesdeError(
      error,
      'No fue posible eliminar el registro del Plan Anual de Formación PESV.'
    )
  }
}