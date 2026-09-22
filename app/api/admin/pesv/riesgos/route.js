// app/api/admin/pesv/riesgos/route.js

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
// HELPERS GENERALES
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


function fechaHoy() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    )
}


// ============================================================
// VALIDACIONES DE ESCALAS
// ============================================================

function validarEscala(
  valor
) {
  const numero =
    numeroEntero(
      valor
    )

  if (
    numero < 1 ||
    numero > 3
  ) {
    return null
  }

  return numero
}


// ============================================================
// CÁLCULO DEL NIVEL DE RIESGO
// ============================================================

function calcularNivelRiesgo(
  exposicion,
  probabilidad
) {
  const e =
    validarEscala(
      exposicion
    )

  const p =
    validarEscala(
      probabilidad
    )

  if (
    !e ||
    !p
  ) {
    return {
      valor:
        null,

      clasificacion:
        null,
    }
  }

  const valor =
    e * p

  let clasificacion =
    'BAJO'

  if (
    valor >= 6
  ) {
    clasificacion =
      'CRITICO'
  } else if (
    valor >= 3
  ) {
    clasificacion =
      'MODERADO'
  }

  return {
    valor,
    clasificacion,
  }
}


// ============================================================
// PRIORIDAD DE INTERVENCIÓN
//
// Regla de gestión adoptada en el procedimiento del CEA.
//
// La severidad NO modifica NR.
// Se utiliza únicamente para priorización.
// ============================================================

function calcularPrioridad({
  clasificacion,
  severidad,
}) {
  const nivel =
    texto(
      clasificacion
    )
      .toUpperCase()

  const s =
    validarEscala(
      severidad
    )

  if (
    !nivel ||
    !s
  ) {
    return null
  }

  if (
    nivel ===
    'CRITICO'
  ) {
    return 'PRIORITARIA'
  }

  if (
    nivel ===
    'MODERADO'
  ) {
    if (
      s === 3
    ) {
      return 'PRIORITARIA'
    }

    return 'PROGRAMADA'
  }

  if (
    nivel ===
    'BAJO'
  ) {
    if (
      s === 3
    ) {
      return 'PRIORITARIA_PREVENTIVA'
    }

    if (
      s === 2
    ) {
      return 'SEGUIMIENTO'
    }

    return 'MANTENER_CONTROLES'
  }

  return null
}


// ============================================================
// ESTADOS / TIPOS
// ============================================================

function validarEstadoRiesgo(
  valor
) {
  const estado =
    texto(
      valor
    )
      .toUpperCase()

  if (!estado) {
    return 'ACTIVO'
  }

  const permitidos = [
    'ACTIVO',
    'EN_TRATAMIENTO',
    'CONTROLADO',
    'CERRADO',
  ]

  return permitidos.includes(
    estado
  )
    ? estado
    : null
}


function validarTipoSeguimiento(
  valor
) {
  const tipo =
    texto(
      valor
    )
      .toUpperCase()

  const permitidos = [
    'RESIDUAL',
    'REVALORACION',
    'SEGUIMIENTO',
  ]

  return permitidos.includes(
    tipo
  )
    ? tipo
    : null
}


function validarOrigenMedida(
  valor
) {
  const origen =
    texto(
      valor
    )
      .toUpperCase()

  if (
    origen ===
      'EXISTENTE' ||
    origen ===
      'PROPUESTA'
  ) {
    return origen
  }

  return null
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
// EMPRESA
// ============================================================

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
      signed?.signedUrl ||
      null,
  }
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
// PROGRAMAS PESV
// ============================================================

async function obtenerProgramas(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_programas_gestion'
      )
      .select(
        `
          id,
          codigo,
          nombre,
          descripcion,
          es_minimo_normativo,
          orden,
          activo,
          usuario_creacion,
          usuario_actualizacion,
          created_at,
          updated_at
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
      .order(
        'nombre',
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
// CONSULTAR RIESGOS
// ============================================================

async function obtenerRiesgos(
  supabase,
  anio
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_riesgos'
      )
      .select(
        `
          id,
          anio,
          codigo,
          fecha_identificacion,

          proceso_actividad,
          proceso,
          contexto_exposicion,
          actividad,
          actores_expuestos,

          factor_riesgo,
          descripcion_riesgo,
          situacion_riesgo,

          causa,
          consecuencia,
          evento_peligroso,

          fuente_identificacion,

          control_existente,
          tratamiento,
          accion_propuesta,

          exposicion,
          justificacion_exposicion,

          probabilidad,
          justificacion_probabilidad,

          valor_nivel_riesgo,
          nivel_riesgo,

          severidad,
          justificacion_severidad,

          prioridad_intervencion,

          antecedentes_considerados,
          eficacia_controles,

          fecha_valoracion,

          responsable_personal_id,
          responsable_nombre,
          fecha_compromiso,

          estado,
          activo,
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
      .order(
        'codigo',
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


// ============================================================
// CONSULTAR RIESGO POR ID
// ============================================================

async function obtenerRiesgoPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_riesgos'
      )
      .select(
        '*'
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
// PROGRAMAS RELACIONADOS A RIESGOS
// ============================================================

async function obtenerRelacionesProgramas(
  supabase,
  riesgoIds
) {
  if (
    !Array.isArray(
      riesgoIds
    ) ||
    riesgoIds.length === 0
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_riesgos_programas'
      )
      .select(
        `
          id,
          riesgo_id,
          programa_id,
          usuario_creacion,
          created_at,

          pesv_programas_gestion (
            id,
            codigo,
            nombre,
            descripcion,
            es_minimo_normativo,
            orden,
            activo
          )
        `
      )
      .in(
        'riesgo_id',
        riesgoIds
      )

  if (
    error
  ) {
    throw error
  }

  return data || []
}


// ============================================================
// MEDIDAS
// ============================================================

async function obtenerMedidas(
  supabase,
  riesgoIds
) {
  if (
    !Array.isArray(
      riesgoIds
    ) ||
    riesgoIds.length === 0
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_riesgos_medidas'
      )
      .select(
        `
          id,
          riesgo_id,
          origen,
          tipo_control,
          descripcion,

          responsable_personal_id,
          responsable_nombre,

          fecha_prevista,
          fecha_implementacion,

          estado,

          evidencia_esperada,
          evidencia_path,

          verificacion_eficacia,
          fecha_verificacion,
          verificado_por,

          observaciones,
          orden,

          usuario_creacion,
          usuario_actualizacion,
          created_at,
          updated_at
        `
      )
      .in(
        'riesgo_id',
        riesgoIds
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
    throw error
  }

  return data || []
}


// ============================================================
// MEDIDA POR ID
// ============================================================

async function obtenerMedidaPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_riesgos_medidas'
      )
      .select(
        '*'
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
// SEGUIMIENTOS
// ============================================================

async function obtenerSeguimientos(
  supabase,
  riesgoIds
) {
  if (
    !Array.isArray(
      riesgoIds
    ) ||
    riesgoIds.length === 0
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_riesgos_seguimientos'
      )
      .select(
        `
          id,
          riesgo_id,

          fecha_seguimiento,
          tipo_seguimiento,
          numero_valoracion,

          probabilidad,
          exposicion,

          justificacion_exposicion,
          justificacion_probabilidad,

          valor_nivel_riesgo,
          nivel_riesgo,

          severidad,
          justificacion_severidad,

          prioridad_intervencion,

          antecedentes_considerados,
          eficacia_controles,

          control_aplicado,
          accion_realizada,
          resultado,
          estado_riesgo,

          verificacion_eficacia,
          fecha_verificacion_eficacia,

          responsable_valoracion_personal_id,
          responsable_valoracion_nombre,

          proximo_seguimiento,
          evidencia_path,
          observaciones,

          usuario_registro,
          created_at
        `
      )
      .in(
        'riesgo_id',
        riesgoIds
      )
      .order(
        'fecha_seguimiento',
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


// ============================================================
// SEGUIMIENTO POR ID
// ============================================================

async function obtenerSeguimientoPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_riesgos_seguimientos'
      )
      .select(
        '*'
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
// MEDIDAS CONSIDERADAS EN SEGUIMIENTOS
// ============================================================

async function obtenerSeguimientosMedidas(
  supabase,
  seguimientoIds
) {
  if (
    !Array.isArray(
      seguimientoIds
    ) ||
    seguimientoIds.length === 0
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_riesgos_seguimientos_medidas'
      )
      .select(
        `
          id,
          seguimiento_id,
          medida_id,
          usuario_creacion,
          created_at,

          pesv_riesgos_medidas (
            id,
            riesgo_id,
            origen,
            tipo_control,
            descripcion,
            estado,
            fecha_implementacion,
            verificacion_eficacia
          )
        `
      )
      .in(
        'seguimiento_id',
        seguimientoIds
      )

  if (
    error
  ) {
    throw error
  }

  return data || []
}


// ============================================================
// NÚMERO DE LA SIGUIENTE VALORACIÓN
//
// La valoración inicial vive en pesv_riesgos.
//
// Por lo tanto:
//
// inicial = 1
// primer seguimiento/residual = 2
// segundo = 3
// etc.
// ============================================================

async function siguienteNumeroValoracion(
  supabase,
  riesgoId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_riesgos_seguimientos'
      )
      .select(
        `
          numero_valoracion
        `
      )
      .eq(
        'riesgo_id',
        riesgoId
      )
      .order(
        'numero_valoracion',
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
    throw error
  }

  const ultimo =
    Array.isArray(
      data
    ) &&
    data.length
      ? Number(
          data[0]
            ?.numero_valoracion ||
          1
        )
      : 1

  return Math.max(
    ultimo + 1,
    2
  )
}


// ============================================================
// ENRIQUECER RIESGOS
// ============================================================

function enriquecerRiesgos({
  riesgos,
  relacionesProgramas,
  medidas,
  seguimientos,
  seguimientosMedidas,
}) {
  const programasPorRiesgo =
    {}

  for (
    const relacion
    of relacionesProgramas
  ) {
    const key =
      String(
        relacion.riesgo_id
      )

    if (
      !programasPorRiesgo[
        key
      ]
    ) {
      programasPorRiesgo[
        key
      ] = []
    }

    if (
      relacion
        .pesv_programas_gestion
    ) {
      programasPorRiesgo[
        key
      ].push(
        relacion
          .pesv_programas_gestion
      )
    }
  }


  const medidasPorRiesgo =
    {}

  for (
    const medida
    of medidas
  ) {
    const key =
      String(
        medida.riesgo_id
      )

    if (
      !medidasPorRiesgo[
        key
      ]
    ) {
      medidasPorRiesgo[
        key
      ] = []
    }

    medidasPorRiesgo[
      key
    ].push(
      medida
    )
  }


  const medidasPorSeguimiento =
    {}

  for (
    const relacion
    of seguimientosMedidas
  ) {
    const key =
      String(
        relacion.seguimiento_id
      )

    if (
      !medidasPorSeguimiento[
        key
      ]
    ) {
      medidasPorSeguimiento[
        key
      ] = []
    }

    if (
      relacion
        .pesv_riesgos_medidas
    ) {
      medidasPorSeguimiento[
        key
      ].push(
        relacion
          .pesv_riesgos_medidas
      )
    }
  }


  const seguimientosPorRiesgo =
    {}

  for (
    const seguimiento
    of seguimientos
  ) {
    const key =
      String(
        seguimiento.riesgo_id
      )

    if (
      !seguimientosPorRiesgo[
        key
      ]
    ) {
      seguimientosPorRiesgo[
        key
      ] = []
    }

    seguimientosPorRiesgo[
      key
    ].push({
      ...seguimiento,

      medidas_consideradas:
        medidasPorSeguimiento[
          String(
            seguimiento.id
          )
        ] || [],
    })
  }


  return riesgos.map(
    (
      riesgo
    ) => ({
      ...riesgo,

      programas:
        programasPorRiesgo[
          String(
            riesgo.id
          )
        ] || [],

      medidas:
        medidasPorRiesgo[
          String(
            riesgo.id
          )
        ] || [],

      seguimientos:
        seguimientosPorRiesgo[
          String(
            riesgo.id
          )
        ] || [],
    })
  )
}


// ============================================================
// RESUMEN DE MATRIZ
// ============================================================

function construirResumen(
  riesgos
) {
  const activos =
    riesgos.filter(
      (
        riesgo
      ) =>
        riesgo.activo !==
        false
    )

  return {
    total:
      activos.length,

    criticos:
      activos.filter(
        (
          riesgo
        ) =>
          texto(
            riesgo.nivel_riesgo
          )
            .toUpperCase() ===
          'CRITICO'
      ).length,

    moderados:
      activos.filter(
        (
          riesgo
        ) =>
          texto(
            riesgo.nivel_riesgo
          )
            .toUpperCase() ===
          'MODERADO'
      ).length,

    bajos:
      activos.filter(
        (
          riesgo
        ) =>
          texto(
            riesgo.nivel_riesgo
          )
            .toUpperCase() ===
          'BAJO'
      ).length,

    prioritarios:
      activos.filter(
        (
          riesgo
        ) =>
          [
            'PRIORITARIA',
            'PRIORITARIA_PREVENTIVA',
          ].includes(
            texto(
              riesgo
                .prioridad_intervencion
            )
              .toUpperCase()
          )
      ).length,
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
      const validado =
        validarAnio(
          anioParametro
        )

      if (
        !validado
      ) {
        return respuestaError(
          'El año consultado no es válido.'
        )
      }

      anio =
        validado
    }


    const [
      riesgos,
      programas,
      personal,
      logo,
    ] =
      await Promise.all([
        obtenerRiesgos(
          supabase,
          anio
        ),

        obtenerProgramas(
          supabase
        ),

        obtenerPersonal(
          supabase
        ),

        obtenerLogo(
          supabase
        ),
      ])


    const riesgoIds =
      riesgos.map(
        (
          riesgo
        ) =>
          riesgo.id
      )


    const [
      relacionesProgramas,
      medidas,
      seguimientos,
    ] =
      riesgoIds.length
        ? await Promise.all([
            obtenerRelacionesProgramas(
              supabase,
              riesgoIds
            ),

            obtenerMedidas(
              supabase,
              riesgoIds
            ),

            obtenerSeguimientos(
              supabase,
              riesgoIds
            ),
          ])
        : [
            [],
            [],
            [],
          ]


    const seguimientoIds =
      seguimientos.map(
        (
          seguimiento
        ) =>
          seguimiento.id
      )


    const seguimientosMedidas =
      seguimientoIds.length
        ? await obtenerSeguimientosMedidas(
            supabase,
            seguimientoIds
          )
        : []


    const riesgosEnriquecidos =
      enriquecerRiesgos({
        riesgos,
        relacionesProgramas,
        medidas,
        seguimientos,
        seguimientosMedidas,
      })


    return respuestaOk({
      empresa:
        construirEmpresa(
          empresa
        ),

      logo,

      anio,

      riesgos:
        riesgosEnriquecidos,

      programas,

      personal,

      resumen:
        construirResumen(
          riesgosEnriquecidos
        ),

      metodologia: {
        exposicion: [
          {
            valor: 1,
            codigo:
              'ESPORADICA',
            nombre:
              'Esporádica',
          },
          {
            valor: 2,
            codigo:
              'OCASIONAL',
            nombre:
              'Ocasional',
          },
          {
            valor: 3,
            codigo:
              'FRECUENTE',
            nombre:
              'Frecuente',
          },
        ],

        probabilidad: [
          {
            valor: 1,
            codigo:
              'NO_ES_PROBABLE',
            nombre:
              'No es probable',
          },
          {
            valor: 2,
            codigo:
              'POCO_PROBABLE',
            nombre:
              'Poco probable',
          },
          {
            valor: 3,
            codigo:
              'MUY_PROBABLE',
            nombre:
              'Muy probable',
          },
        ],

        severidad: [
          {
            valor: 1,
            codigo:
              'LEVE',
            nombre:
              'Leve',
          },
          {
            valor: 2,
            codigo:
              'GRAVE',
            nombre:
              'Grave',
          },
          {
            valor: 3,
            codigo:
              'MUY_GRAVE',
            nombre:
              'Muy grave',
          },
        ],

        tipos_control: [
          'ELIMINACION',
          'SUSTITUCION',
          'INGENIERIA',
          'ADMINISTRATIVO',
          'FORMACION_COMPETENCIAS',
          'EPP',
          'OTRO',
        ],

        contextos_sugeridos: [
          'FORMACION_PRACTICA',
          'DESPLAZAMIENTO_EN_MISION',
          'IN_ITINERE',
          'ENTORNO_SEDE',
        ],
      },
    })
  } catch (
    error
  ) {
    return respuestaDesdeError(
      error,
      'No fue posible consultar la Matriz de Riesgos PESV.'
    )
  }
}


// ============================================================
// POST
//
// ACCIONES:
//
// - crear_riesgo
// - crear_medida
// - crear_seguimiento
// - guardar_programas_riesgo
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
    // CREAR RIESGO
    // ========================================================

    if (
      accion ===
      'crear_riesgo'
    ) {
      const anio =
        validarAnio(
          body?.anio
        )

      const codigo =
        texto(
          body?.codigo
        )
          .toUpperCase()

      const fechaIdentificacion =
        fechaValida(
          body
            ?.fecha_identificacion
        )

      const proceso =
        texto(
          body?.proceso
        )

      const contexto =
        texto(
          body?.contexto_exposicion
        )
          .toUpperCase()

      const actividad =
        texto(
          body?.actividad
        )

      const factorRiesgo =
        texto(
          body?.factor_riesgo
        )

      const situacionRiesgo =
        texto(
            body?.situacion_riesgo ||
            body?.descripcion_riesgo
        )

        const eventoPeligroso =
        texto(
            body?.evento_peligroso
        )

        const causas =
        texto(
            body?.causas ||
            body?.causa
        )

      const consecuencias =
        texto(
          body?.consecuencias ||
          body?.consecuencia
        )

      const exposicion =
        validarEscala(
          body?.exposicion
        )

      const probabilidad =
        validarEscala(
          body?.probabilidad
        )

      const severidad =
        validarEscala(
          body?.severidad
        )


      if (!anio) {
        return respuestaError(
          'El año de la matriz no es válido.'
        )
      }

      if (!codigo) {
        return respuestaError(
          'El código del riesgo es obligatorio.'
        )
      }

      if (
        !fechaIdentificacion
      ) {
        return respuestaError(
          'La fecha de identificación es obligatoria y debe ser válida.'
        )
      }

      if (!proceso) {
        return respuestaError(
          'El proceso es obligatorio.'
        )
      }

      if (!contexto) {
        return respuestaError(
          'El contexto de exposición es obligatorio.'
        )
      }

      if (!actividad) {
        return respuestaError(
          'La actividad es obligatoria.'
        )
      }

      if (!factorRiesgo) {
        return respuestaError(
          'El factor de riesgo es obligatorio.'
        )
      }

      if (!situacionRiesgo) {
        return respuestaError(
            'La situación de riesgo es obligatoria.'
        )
        }

        if (!eventoPeligroso) {
        return respuestaError(
            'Debe describir el evento peligroso o materialización del riesgo.'
        )
        }

        if (!causas) {
        return respuestaError(
            'Debe registrar las causas del riesgo.'
        )
        }

      if (!consecuencias) {
        return respuestaError(
          'Debe registrar las consecuencias del riesgo.'
        )
      }

      if (!exposicion) {
        return respuestaError(
          'Debe seleccionar un nivel de exposición válido.'
        )
      }

      if (
        !texto(
          body
            ?.justificacion_exposicion
        )
      ) {
        return respuestaError(
          'Debe justificar el nivel de exposición seleccionado.'
        )
      }

      if (!probabilidad) {
        return respuestaError(
          'Debe seleccionar una probabilidad válida.'
        )
      }

      if (
        !texto(
          body
            ?.justificacion_probabilidad
        )
      ) {
        return respuestaError(
          'Debe justificar la probabilidad seleccionada.'
        )
      }

      if (!severidad) {
        return respuestaError(
          'Debe seleccionar una severidad válida.'
        )
      }

      if (
        !texto(
          body
            ?.justificacion_severidad
        )
      ) {
        return respuestaError(
          'Debe justificar la severidad seleccionada.'
        )
      }


      const nivel =
        calcularNivelRiesgo(
          exposicion,
          probabilidad
        )

      const prioridad =
        calcularPrioridad({
          clasificacion:
            nivel.clasificacion,

          severidad,
        })


      const procesoActividad =
        texto(
          body
            ?.proceso_actividad
        ) ||
        [
          proceso,
          actividad,
        ]
          .filter(
            Boolean
          )
          .join(
            ' - '
          )


      const estado =
        validarEstadoRiesgo(
          body?.estado
        )

      if (!estado) {
        return respuestaError(
          'El estado del riesgo no es válido.'
        )
      }


      const payload = {
        anio,

        codigo,

        fecha_identificacion:
          fechaIdentificacion,

        proceso_actividad:
          procesoActividad,

        proceso,

        contexto_exposicion:
          contexto,

        actividad,

        actores_expuestos:
          texto(
            body?.actores_expuestos
          ) ||
          null,

        factor_riesgo:
          factorRiesgo,

        descripcion_riesgo:
          situacionRiesgo,

        situacion_riesgo:
          situacionRiesgo,

        causa:
        causas,

        consecuencia:
        consecuencias,

        evento_peligroso:
        eventoPeligroso,

        fuente_identificacion:
        texto(
            body?.fuente_identificacion
        ) ||
        null,

        control_existente:
          texto(
            body?.control_existente
          ) ||
          null,

        tratamiento:
          texto(
            body?.tratamiento
          ) ||
          null,

        accion_propuesta:
          texto(
            body?.accion_propuesta
          ) ||
          null,

        exposicion,

        justificacion_exposicion:
          texto(
            body
              ?.justificacion_exposicion
          ),

        probabilidad,

        justificacion_probabilidad:
          texto(
            body
              ?.justificacion_probabilidad
          ),

        valor_nivel_riesgo:
          nivel.valor,

        nivel_riesgo:
          nivel.clasificacion,

        severidad,

        justificacion_severidad:
          texto(
            body
              ?.justificacion_severidad
          ),

        prioridad_intervencion:
          prioridad,

        antecedentes_considerados:
          texto(
            body
              ?.antecedentes_considerados
          ) ||
          null,

        eficacia_controles:
          texto(
            body?.eficacia_controles
          ) ||
          null,

        fecha_valoracion:
          fechaValida(
            body?.fecha_valoracion
          ) ||
          fechaIdentificacion,

        responsable_personal_id:
          idOpcional(
            body
              ?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body
              ?.responsable_nombre
          ) ||
          null,

        fecha_compromiso:
          fechaValida(
            body?.fecha_compromiso
          ),

        estado,

        activo:
          body?.activo ===
            false
            ? false
            : true,

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
            'pesv_riesgos'
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
            'Ya existe un riesgo con ese código para el año seleccionado.'
          )
        }

        throw error
      }


      return respuestaOk(
        {
          message:
            'Riesgo PESV creado correctamente.',

          riesgo:
            data,
        },
        201
      )
    }


    // ========================================================
    // CREAR MEDIDA
    // ========================================================

    if (
      accion ===
      'crear_medida'
    ) {
      const riesgoId =
        numeroEntero(
          body?.riesgo_id
        )

      if (
        riesgoId <= 0
      ) {
        return respuestaError(
          'El riesgo asociado a la medida no es válido.'
        )
      }

      const riesgo =
        await obtenerRiesgoPorId(
          supabase,
          riesgoId
        )

      if (!riesgo) {
        return respuestaError(
          'El riesgo asociado no existe.',
          404
        )
      }


      const origen =
        validarOrigenMedida(
          body?.origen
        )

      if (!origen) {
        return respuestaError(
          'El origen de la medida debe ser EXISTENTE o PROPUESTA.'
        )
      }


      const tipoControl =
        texto(
          body?.tipo_control
        )
          .toUpperCase()

      const descripcion =
        texto(
          body?.descripcion
        )

      if (!tipoControl) {
        return respuestaError(
          'Debe seleccionar el tipo de control o medida.'
        )
      }

      if (!descripcion) {
        return respuestaError(
          'La descripción de la medida es obligatoria.'
        )
      }


      const fechaPrevistaTexto =
        texto(
          body?.fecha_prevista
        )

      const fechaPrevista =
        fechaPrevistaTexto
          ? fechaValida(
              fechaPrevistaTexto
            )
          : null

      if (
        fechaPrevistaTexto &&
        !fechaPrevista
      ) {
        return respuestaError(
          'La fecha prevista no es válida.'
        )
      }


      const fechaImplementacionTexto =
        texto(
          body
            ?.fecha_implementacion
        )

      const fechaImplementacion =
        fechaImplementacionTexto
          ? fechaValida(
              fechaImplementacionTexto
            )
          : null

      if (
        fechaImplementacionTexto &&
        !fechaImplementacion
      ) {
        return respuestaError(
          'La fecha de implementación no es válida.'
        )
      }


      const payload = {
        riesgo_id:
          riesgoId,

        origen,

        tipo_control:
          tipoControl,

        descripcion,

        responsable_personal_id:
          idOpcional(
            body
              ?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body
              ?.responsable_nombre
          ) ||
          null,

        fecha_prevista:
          fechaPrevista,

        fecha_implementacion:
          fechaImplementacion,

        estado:
          texto(
            body?.estado
          )
            .toUpperCase() ||
          (
            origen ===
            'EXISTENTE'
              ? 'ACTIVO'
              : 'PENDIENTE'
          ),

        evidencia_esperada:
          texto(
            body?.evidencia_esperada
          ) ||
          null,

        evidencia_path:
          texto(
            body?.evidencia_path
          ) ||
          null,

        verificacion_eficacia:
          texto(
            body
              ?.verificacion_eficacia
          ) ||
          null,

        fecha_verificacion:
          fechaValida(
            body
              ?.fecha_verificacion
          ),

        verificado_por:
          texto(
            body?.verificado_por
          ) ||
          null,

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        orden:
          Math.max(
            numeroEntero(
              body?.orden
            ),
            0
          ),

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
            'pesv_riesgos_medidas'
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
            'Control o medida de intervención creado correctamente.',

          medida:
            data,
        },
        201
      )
    }


    // ========================================================
    // CREAR SEGUIMIENTO / VALORACIÓN RESIDUAL
    // ========================================================

    if (
      accion ===
      'crear_seguimiento'
    ) {
      const riesgoId =
        numeroEntero(
          body?.riesgo_id
        )

      if (
        riesgoId <= 0
      ) {
        return respuestaError(
          'El riesgo asociado al seguimiento no es válido.'
        )
      }


      const riesgo =
        await obtenerRiesgoPorId(
          supabase,
          riesgoId
        )

      if (!riesgo) {
        return respuestaError(
          'El riesgo asociado no existe.',
          404
        )
      }


      const tipo =
        validarTipoSeguimiento(
          body
            ?.tipo_seguimiento
        )

      if (!tipo) {
        return respuestaError(
          'El tipo de seguimiento no es válido.'
        )
      }


      const fechaSeguimiento =
        fechaValida(
          body
            ?.fecha_seguimiento
        )

      if (
        !fechaSeguimiento
      ) {
        return respuestaError(
          'La fecha de seguimiento es obligatoria y debe ser válida.'
        )
      }


      const exposicion =
        validarEscala(
          body?.exposicion
        )

      const probabilidad =
        validarEscala(
          body?.probabilidad
        )

      const severidad =
        validarEscala(
          body?.severidad
        )


      if (!exposicion) {
        return respuestaError(
          'Debe seleccionar un nivel de exposición válido.'
        )
      }

      if (
        !texto(
          body
            ?.justificacion_exposicion
        )
      ) {
        return respuestaError(
          'Debe justificar la exposición de la nueva valoración.'
        )
      }

      if (!probabilidad) {
        return respuestaError(
          'Debe seleccionar una probabilidad válida.'
        )
      }

      if (
        !texto(
          body
            ?.justificacion_probabilidad
        )
      ) {
        return respuestaError(
          'Debe justificar la probabilidad de la nueva valoración.'
        )
      }

      if (!severidad) {
        return respuestaError(
          'Debe seleccionar una severidad válida.'
        )
      }

      if (
        !texto(
          body
            ?.justificacion_severidad
        )
      ) {
        return respuestaError(
          'Debe justificar la severidad de la nueva valoración.'
        )
      }


      const nivel =
        calcularNivelRiesgo(
          exposicion,
          probabilidad
        )

      const prioridad =
        calcularPrioridad({
          clasificacion:
            nivel.clasificacion,

          severidad,
        })


      const numeroValoracion =
        await siguienteNumeroValoracion(
          supabase,
          riesgoId
        )


      const payload = {
        riesgo_id:
          riesgoId,

        fecha_seguimiento:
          fechaSeguimiento,

        tipo_seguimiento:
          tipo,

        numero_valoracion:
          numeroValoracion,

        probabilidad,

        exposicion,

        justificacion_exposicion:
          texto(
            body
              ?.justificacion_exposicion
          ),

        justificacion_probabilidad:
          texto(
            body
              ?.justificacion_probabilidad
          ),

        valor_nivel_riesgo:
          nivel.valor,

        nivel_riesgo:
          nivel.clasificacion,

        severidad,

        justificacion_severidad:
          texto(
            body
              ?.justificacion_severidad
          ),

        prioridad_intervencion:
          prioridad,

        antecedentes_considerados:
          texto(
            body
              ?.antecedentes_considerados
          ) ||
          null,

        eficacia_controles:
          texto(
            body?.eficacia_controles
          ) ||
          null,

        control_aplicado:
          texto(
            body?.control_aplicado
          ) ||
          null,

        accion_realizada:
          texto(
            body?.accion_realizada
          ) ||
          null,

        resultado:
          texto(
            body?.resultado
          ) ||
          null,

        estado_riesgo:
          texto(
            body?.estado_riesgo
          )
            .toUpperCase() ||
          null,

        verificacion_eficacia:
          texto(
            body
              ?.verificacion_eficacia
          ) ||
          null,

        fecha_verificacion_eficacia:
          fechaValida(
            body
              ?.fecha_verificacion_eficacia
          ),

        responsable_valoracion_personal_id:
          idOpcional(
            body
              ?.responsable_valoracion_personal_id
          ),

        responsable_valoracion_nombre:
          texto(
            body
              ?.responsable_valoracion_nombre
          ) ||
          null,

        proximo_seguimiento:
          fechaValida(
            body
              ?.proximo_seguimiento
          ),

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

        created_at:
          ahora,
      }


      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_riesgos_seguimientos'
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


      // ======================================================
      // MEDIDAS CONSIDERADAS EN ESTA VALORACIÓN
      // ======================================================

      const medidasIds =
        Array.isArray(
          body?.medidas_ids
        )
          ? Array.from(
              new Set(
                body.medidas_ids
                  .map(
                    (
                      valor
                    ) =>
                      numeroEntero(
                        valor
                      )
                  )
                  .filter(
                    (
                      valor
                    ) =>
                      valor > 0
                  )
              )
            )
          : []


      if (
        medidasIds.length
      ) {
        const {
          data:
            medidasValidas,
          error:
            errorMedidas,
        } =
          await supabase
            .from(
              'pesv_riesgos_medidas'
            )
            .select(
              `
                id,
                riesgo_id
              `
            )
            .in(
              'id',
              medidasIds
            )
            .eq(
              'riesgo_id',
              riesgoId
            )

        if (
          errorMedidas
        ) {
          throw errorMedidas
        }


        const idsValidos =
          (
            medidasValidas ||
            []
          ).map(
            (
              medida
            ) =>
              medida.id
          )


        if (
          idsValidos.length !==
          medidasIds.length
        ) {
          await supabase
            .from(
              'pesv_riesgos_seguimientos'
            )
            .delete()
            .eq(
              'id',
              data.id
            )

          return respuestaError(
            'Una o más medidas seleccionadas no pertenecen al riesgo valorado.'
          )
        }


        const relaciones =
          idsValidos.map(
            (
              medidaId
            ) => ({
              seguimiento_id:
                data.id,

              medida_id:
                medidaId,

              usuario_creacion:
                usuario,

              created_at:
                ahora,
            })
          )


        const {
          error:
            errorRelaciones,
        } =
          await supabase
            .from(
              'pesv_riesgos_seguimientos_medidas'
            )
            .insert(
              relaciones
            )


        if (
          errorRelaciones
        ) {
          await supabase
            .from(
              'pesv_riesgos_seguimientos'
            )
            .delete()
            .eq(
              'id',
              data.id
            )

          throw errorRelaciones
        }
      }


      return respuestaOk(
        {
          message:
            'Valoración de seguimiento registrada correctamente.',

          seguimiento:
            data,
        },
        201
      )
    }


    // ========================================================
    // GUARDAR PROGRAMAS RELACIONADOS AL RIESGO
    // ========================================================

    if (
      accion ===
      'guardar_programas_riesgo'
    ) {
      const riesgoId =
        numeroEntero(
          body?.riesgo_id
        )

      if (
        riesgoId <= 0
      ) {
        return respuestaError(
          'El riesgo no es válido.'
        )
      }


      const riesgo =
        await obtenerRiesgoPorId(
          supabase,
          riesgoId
        )

      if (!riesgo) {
        return respuestaError(
          'El riesgo no existe.',
          404
        )
      }


      const programaIds =
        Array.isArray(
          body?.programa_ids
        )
          ? Array.from(
              new Set(
                body
                  .programa_ids
                  .map(
                    (
                      valor
                    ) =>
                      numeroEntero(
                        valor
                      )
                  )
                  .filter(
                    (
                      valor
                    ) =>
                      valor > 0
                  )
              )
            )
          : []


      if (
        programaIds.length
      ) {
        const {
          data:
            programasValidos,
          error:
            errorProgramas,
        } =
          await supabase
            .from(
              'pesv_programas_gestion'
            )
            .select(
              `
                id,
                activo
              `
            )
            .in(
              'id',
              programaIds
            )
            .eq(
              'activo',
              true
            )

        if (
          errorProgramas
        ) {
          throw errorProgramas
        }


        if (
          (
            programasValidos ||
            []
          ).length !==
          programaIds.length
        ) {
          return respuestaError(
            'Uno o más programas PESV seleccionados no existen o no están activos.'
          )
        }
      }


      const {
        data:
          actuales,
        error:
          errorActuales,
      } =
        await supabase
          .from(
            'pesv_riesgos_programas'
          )
          .select(
            `
              id,
              programa_id
            `
          )
          .eq(
            'riesgo_id',
            riesgoId
          )


      if (
        errorActuales
      ) {
        throw errorActuales
      }


      const actualesIds =
        (
          actuales ||
          []
        ).map(
          (
            item
          ) =>
            Number(
              item.programa_id
            )
        )


      const agregar =
        programaIds.filter(
          (
            id
          ) =>
            !actualesIds.includes(
              id
            )
        )


      const quitar =
        actualesIds.filter(
          (
            id
          ) =>
            !programaIds.includes(
              id
            )
        )


      // Primero agregamos las nuevas relaciones.
      // Así evitamos perder las existentes si ocurre un error.
      if (
        agregar.length
      ) {
        const payloadAgregar =
          agregar.map(
            (
              programaId
            ) => ({
              riesgo_id:
                riesgoId,

              programa_id:
                programaId,

              usuario_creacion:
                usuario,

              created_at:
                ahora,
            })
          )


        const {
          error:
            errorAgregar,
        } =
          await supabase
            .from(
              'pesv_riesgos_programas'
            )
            .insert(
              payloadAgregar
            )

        if (
          errorAgregar
        ) {
          throw errorAgregar
        }
      }


      if (
        quitar.length
      ) {
        const {
          error:
            errorQuitar,
        } =
          await supabase
            .from(
              'pesv_riesgos_programas'
            )
            .delete()
            .eq(
              'riesgo_id',
              riesgoId
            )
            .in(
              'programa_id',
              quitar
            )

        if (
          errorQuitar
        ) {
          throw errorQuitar
        }
      }


      return respuestaOk({
        message:
          'Programas PESV relacionados correctamente.',
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
      'No fue posible crear el registro de la Matriz de Riesgos PESV.'
    )
  }
}


// ============================================================
// PATCH
//
// ACCIONES:
//
// - actualizar_riesgo
// - actualizar_medida
// - actualizar_seguimiento
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
    // ACTUALIZAR RIESGO
    // ========================================================

    if (
      accion ===
      'actualizar_riesgo'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <= 0
      ) {
        return respuestaError(
          'El riesgo que desea actualizar no es válido.'
        )
      }


      const existente =
        await obtenerRiesgoPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'El riesgo no existe.',
          404
        )
      }


      const anio =
        validarAnio(
          body?.anio
        )

      const codigo =
        texto(
          body?.codigo
        )
          .toUpperCase()

      const fechaIdentificacion =
        fechaValida(
          body
            ?.fecha_identificacion
        )

      const proceso =
        texto(
          body?.proceso
        )

      const contexto =
        texto(
          body?.contexto_exposicion
        )
          .toUpperCase()

      const actividad =
        texto(
          body?.actividad
        )

      const factorRiesgo =
        texto(
          body?.factor_riesgo
        )

      const situacionRiesgo =
        texto(
          body?.situacion_riesgo ||
          body?.descripcion_riesgo
        )

      const eventoPeligroso =
        texto(
            body?.evento_peligroso
        )   

      const causas =
        texto(
          body?.causas ||
          body?.causa
        )

      const consecuencias =
        texto(
          body?.consecuencias ||
          body?.consecuencia
        )


      if (
        !anio ||
        !codigo ||
        !fechaIdentificacion ||
        !proceso ||
        !contexto ||
        !actividad ||
        !factorRiesgo ||
        !situacionRiesgo ||
        !eventoPeligroso ||
        !causas ||
        !consecuencias
        ) {
        return respuestaError(
            'Debe completar los datos obligatorios de identificación del riesgo.'
        )
        }


      const exposicion =
        validarEscala(
          body?.exposicion
        )

      const probabilidad =
        validarEscala(
          body?.probabilidad
        )

      const severidad =
        validarEscala(
          body?.severidad
        )


      if (
        !exposicion ||
        !probabilidad ||
        !severidad
      ) {
        return respuestaError(
          'Exposición, probabilidad y severidad deben tener valores entre 1 y 3.'
        )
      }


      if (
        !texto(
          body
            ?.justificacion_exposicion
        ) ||
        !texto(
          body
            ?.justificacion_probabilidad
        ) ||
        !texto(
          body
            ?.justificacion_severidad
        )
      ) {
        return respuestaError(
          'Debe conservar las justificaciones de exposición, probabilidad y severidad.'
        )
      }


      // ======================================================
      // PROTEGER LA VALORACIÓN INICIAL
      //
      // Si ya existen valoraciones posteriores, la valoración
      // inicial no puede ser modificada.
      // ======================================================

      const {
        count:
          cantidadSeguimientos,
        error:
          errorSeguimientos,
      } =
        await supabase
          .from(
            'pesv_riesgos_seguimientos'
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
            'riesgo_id',
            id
          )


      if (
        errorSeguimientos
      ) {
        throw errorSeguimientos
      }


      const cambiaValoracionInicial =
        Number(
          existente.exposicion
        ) !==
          Number(
            exposicion
          ) ||
        Number(
          existente.probabilidad
        ) !==
          Number(
            probabilidad
          ) ||
        Number(
          existente.severidad
        ) !==
          Number(
            severidad
          ) ||
        texto(
          existente
            .justificacion_exposicion
        ) !==
          texto(
            body
              ?.justificacion_exposicion
          ) ||
        texto(
          existente
            .justificacion_probabilidad
        ) !==
          texto(
            body
              ?.justificacion_probabilidad
          ) ||
        texto(
          existente
            .justificacion_severidad
        ) !==
          texto(
            body
              ?.justificacion_severidad
          )


      if (
        Number(
          cantidadSeguimientos ||
          0
        ) > 0 &&
        cambiaValoracionInicial
      ) {
        return respuestaError(
          'La valoración inicial no puede modificarse porque el riesgo ya tiene valoraciones posteriores. Registre una nueva revaloración o valoración residual.'
        )
      }


      const nivel =
        calcularNivelRiesgo(
          exposicion,
          probabilidad
        )

      const prioridad =
        calcularPrioridad({
          clasificacion:
            nivel.clasificacion,

          severidad,
        })


      const estado =
        validarEstadoRiesgo(
          body?.estado
        )

      if (!estado) {
        return respuestaError(
          'El estado del riesgo no es válido.'
        )
      }


      const procesoActividad =
        texto(
          body
            ?.proceso_actividad
        ) ||
        [
          proceso,
          actividad,
        ]
          .filter(
            Boolean
          )
          .join(
            ' - '
          )


      const payload = {
        anio,

        codigo,

        fecha_identificacion:
          fechaIdentificacion,

        proceso_actividad:
          procesoActividad,

        proceso,

        contexto_exposicion:
          contexto,

        actividad,

        actores_expuestos:
          texto(
            body?.actores_expuestos
          ) ||
          null,

        factor_riesgo:
          factorRiesgo,

        descripcion_riesgo:
          situacionRiesgo,

        situacion_riesgo:
          situacionRiesgo,

        causa:
        causas,

        consecuencia:
        consecuencias,

        evento_peligroso:
        eventoPeligroso,

        fuente_identificacion:
        texto(
            body?.fuente_identificacion
        ) ||
        null,

        control_existente:
          texto(
            body?.control_existente
          ) ||
          null,

        tratamiento:
          texto(
            body?.tratamiento
          ) ||
          null,

        accion_propuesta:
          texto(
            body?.accion_propuesta
          ) ||
          null,

        exposicion,

        justificacion_exposicion:
          texto(
            body
              ?.justificacion_exposicion
          ),

        probabilidad,

        justificacion_probabilidad:
          texto(
            body
              ?.justificacion_probabilidad
          ),

        valor_nivel_riesgo:
          nivel.valor,

        nivel_riesgo:
          nivel.clasificacion,

        severidad,

        justificacion_severidad:
          texto(
            body
              ?.justificacion_severidad
          ),

        prioridad_intervencion:
          prioridad,

        antecedentes_considerados:
          texto(
            body
              ?.antecedentes_considerados
          ) ||
          null,

        eficacia_controles:
          texto(
            body?.eficacia_controles
          ) ||
          null,

        fecha_valoracion:
          fechaValida(
            body?.fecha_valoracion
          ) ||
          existente.fecha_valoracion ||
          fechaIdentificacion,

        responsable_personal_id:
          idOpcional(
            body
              ?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body
              ?.responsable_nombre
          ) ||
          null,

        fecha_compromiso:
          fechaValida(
            body?.fecha_compromiso
          ),

        estado,

        activo:
          body?.activo ===
            false
            ? false
            : true,

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
            'pesv_riesgos'
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
            'Ya existe otro riesgo con ese código para el año seleccionado.'
          )
        }

        throw error
      }


      return respuestaOk({
        message:
          'Riesgo PESV actualizado correctamente.',

        riesgo:
          data,
      })
    }


    // ========================================================
    // ACTUALIZAR MEDIDA
    // ========================================================

    if (
      accion ===
      'actualizar_medida'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <= 0
      ) {
        return respuestaError(
          'La medida que desea actualizar no es válida.'
        )
      }


      const existente =
        await obtenerMedidaPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'La medida no existe.',
          404
        )
      }


      const origen =
        validarOrigenMedida(
          body?.origen ||
          existente.origen
        )

      const tipoControl =
        texto(
          body?.tipo_control
        )
          .toUpperCase()

      const descripcion =
        texto(
          body?.descripcion
        )


      if (!origen) {
        return respuestaError(
          'El origen de la medida no es válido.'
        )
      }

      if (!tipoControl) {
        return respuestaError(
          'El tipo de control es obligatorio.'
        )
      }

      if (!descripcion) {
        return respuestaError(
          'La descripción de la medida es obligatoria.'
        )
      }


      const payload = {
        origen,

        tipo_control:
          tipoControl,

        descripcion,

        responsable_personal_id:
          idOpcional(
            body
              ?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body
              ?.responsable_nombre
          ) ||
          null,

        fecha_prevista:
          fechaValida(
            body?.fecha_prevista
          ),

        fecha_implementacion:
          fechaValida(
            body
              ?.fecha_implementacion
          ),

        estado:
          texto(
            body?.estado
          )
            .toUpperCase() ||
          existente.estado,

        evidencia_esperada:
          texto(
            body?.evidencia_esperada
          ) ||
          null,

        evidencia_path:
          texto(
            body?.evidencia_path
          ) ||
          null,

        verificacion_eficacia:
          texto(
            body
              ?.verificacion_eficacia
          ) ||
          null,

        fecha_verificacion:
          fechaValida(
            body
              ?.fecha_verificacion
          ),

        verificado_por:
          texto(
            body?.verificado_por
          ) ||
          null,

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        orden:
          Math.max(
            numeroEntero(
              body?.orden
            ),
            0
          ),

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
            'pesv_riesgos_medidas'
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
          'Control o medida actualizado correctamente.',

        medida:
          data,
      })
    }


    // ========================================================
    // ACTUALIZAR SEGUIMIENTO
    //
    // Se permite corregir el registro.
    // No se modifica numero_valoracion.
    // ========================================================

    if (
      accion ===
      'actualizar_seguimiento'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <= 0
      ) {
        return respuestaError(
          'El seguimiento que desea actualizar no es válido.'
        )
      }


      const existente =
        await obtenerSeguimientoPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'El seguimiento no existe.',
          404
        )
      }


      const tipo =
        validarTipoSeguimiento(
          body
            ?.tipo_seguimiento
        )

      const fechaSeguimiento =
        fechaValida(
          body
            ?.fecha_seguimiento
        )

      const exposicion =
        validarEscala(
          body?.exposicion
        )

      const probabilidad =
        validarEscala(
          body?.probabilidad
        )

      const severidad =
        validarEscala(
          body?.severidad
        )


      if (
        !tipo ||
        !fechaSeguimiento ||
        !exposicion ||
        !probabilidad ||
        !severidad
      ) {
        return respuestaError(
          'Los datos principales de la valoración no son válidos.'
        )
      }


      if (
        !texto(
          body
            ?.justificacion_exposicion
        ) ||
        !texto(
          body
            ?.justificacion_probabilidad
        ) ||
        !texto(
          body
            ?.justificacion_severidad
        )
      ) {
        return respuestaError(
          'Las justificaciones de exposición, probabilidad y severidad son obligatorias.'
        )
      }


      const nivel =
        calcularNivelRiesgo(
          exposicion,
          probabilidad
        )

      const prioridad =
        calcularPrioridad({
          clasificacion:
            nivel.clasificacion,

          severidad,
        })


      const payload = {
        fecha_seguimiento:
          fechaSeguimiento,

        tipo_seguimiento:
          tipo,

        probabilidad,

        exposicion,

        justificacion_exposicion:
          texto(
            body
              ?.justificacion_exposicion
          ),

        justificacion_probabilidad:
          texto(
            body
              ?.justificacion_probabilidad
          ),

        valor_nivel_riesgo:
          nivel.valor,

        nivel_riesgo:
          nivel.clasificacion,

        severidad,

        justificacion_severidad:
          texto(
            body
              ?.justificacion_severidad
          ),

        prioridad_intervencion:
          prioridad,

        antecedentes_considerados:
          texto(
            body
              ?.antecedentes_considerados
          ) ||
          null,

        eficacia_controles:
          texto(
            body?.eficacia_controles
          ) ||
          null,

        control_aplicado:
          texto(
            body?.control_aplicado
          ) ||
          null,

        accion_realizada:
          texto(
            body?.accion_realizada
          ) ||
          null,

        resultado:
          texto(
            body?.resultado
          ) ||
          null,

        estado_riesgo:
          texto(
            body?.estado_riesgo
          )
            .toUpperCase() ||
          null,

        verificacion_eficacia:
          texto(
            body
              ?.verificacion_eficacia
          ) ||
          null,

        fecha_verificacion_eficacia:
          fechaValida(
            body
              ?.fecha_verificacion_eficacia
          ),

        responsable_valoracion_personal_id:
          idOpcional(
            body
              ?.responsable_valoracion_personal_id
          ),

        responsable_valoracion_nombre:
          texto(
            body
              ?.responsable_valoracion_nombre
          ) ||
          null,

        proximo_seguimiento:
          fechaValida(
            body
              ?.proximo_seguimiento
          ),

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
          usuario ||
          existente.usuario_registro,
      }


      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_riesgos_seguimientos'
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
          'Valoración de seguimiento actualizada correctamente.',

        seguimiento:
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
      'No fue posible actualizar la Matriz de Riesgos PESV.'
    )
  }
}


// ============================================================
// DELETE
//
// ACCIONES:
//
// - eliminar_riesgo
// - eliminar_medida
// - eliminar_seguimiento
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
    // ELIMINAR SEGUIMIENTO
    // ========================================================

    if (
      accion ===
      'eliminar_seguimiento'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <= 0
      ) {
        return respuestaError(
          'El seguimiento que desea eliminar no es válido.'
        )
      }


      const existente =
        await obtenerSeguimientoPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'El seguimiento no existe.',
          404
        )
      }


      const {
        error,
      } =
        await supabase
          .from(
            'pesv_riesgos_seguimientos'
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
          'Seguimiento eliminado correctamente.',
      })
    }


    // ========================================================
    // ELIMINAR MEDIDA
    // ========================================================

    if (
      accion ===
      'eliminar_medida'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <= 0
      ) {
        return respuestaError(
          'La medida que desea eliminar no es válida.'
        )
      }


      const existente =
        await obtenerMedidaPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'La medida no existe.',
          404
        )
      }


      // ======================================================
      // PROTECCIÓN:
      // una medida usada en una valoración histórica no debe
      // eliminarse.
      // ======================================================

      const {
        count,
        error:
          errorUso,
      } =
        await supabase
          .from(
            'pesv_riesgos_seguimientos_medidas'
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
            'medida_id',
            id
          )


      if (
        errorUso
      ) {
        throw errorUso
      }


      if (
        Number(
          count ||
          0
        ) > 0
      ) {
        return respuestaError(
          'No puede eliminar esta medida porque ya fue considerada en una valoración del riesgo. Puede cambiar su estado para conservar la trazabilidad.'
        )
      }


      const {
        error,
      } =
        await supabase
          .from(
            'pesv_riesgos_medidas'
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
          'Control o medida eliminado correctamente.',
      })
    }


    // ========================================================
    // ELIMINAR RIESGO
    // ========================================================

    if (
      accion ===
      'eliminar_riesgo'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <= 0
      ) {
        return respuestaError(
          'El riesgo que desea eliminar no es válido.'
        )
      }


      const existente =
        await obtenerRiesgoPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'El riesgo no existe.',
          404
        )
      }


      const [
        conteoSeguimientos,
        conteoMedidas,
      ] =
        await Promise.all([
          supabase
            .from(
              'pesv_riesgos_seguimientos'
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
              'riesgo_id',
              id
            ),

          supabase
            .from(
              'pesv_riesgos_medidas'
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
              'riesgo_id',
              id
            ),
        ])


      if (
        conteoSeguimientos.error
      ) {
        throw conteoSeguimientos.error
      }

      if (
        conteoMedidas.error
      ) {
        throw conteoMedidas.error
      }


      if (
        Number(
          conteoSeguimientos
            .count ||
          0
        ) > 0
      ) {
        return respuestaError(
          'No puede eliminar el riesgo porque tiene seguimientos o valoraciones posteriores. Cambie su estado o desactívelo para conservar el historial.'
        )
      }


      if (
        Number(
          conteoMedidas
            .count ||
          0
        ) > 0
      ) {
        return respuestaError(
          'No puede eliminar el riesgo porque tiene controles o medidas de intervención asociados. Elimine primero las medidas o desactive el riesgo.'
        )
      }


      // Las relaciones con programas pueden eliminarse,
      // porque todavía no representan ejecución ni evidencia.
      const {
        error:
          errorProgramas,
      } =
        await supabase
          .from(
            'pesv_riesgos_programas'
          )
          .delete()
          .eq(
            'riesgo_id',
            id
          )


      if (
        errorProgramas
      ) {
        throw errorProgramas
      }


      const {
        error,
      } =
        await supabase
          .from(
            'pesv_riesgos'
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
          'Riesgo PESV eliminado correctamente.',
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
      'No fue posible eliminar el registro de la Matriz de Riesgos PESV.'
    )
  }
}