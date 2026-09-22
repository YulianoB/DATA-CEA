// app/api/admin/configuracion-academica/horarios/route.js

import {
  NextResponse,
} from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const INTERVALO_FRANJAS_MINUTOS =
  120

const DURACIONES_VISUALES_VALIDAS =
  new Set([
    30,
    60,
    90,
    120,
  ])

const TIPOS_ELEMENTO_VALIDOS =
  new Set([
    'CLASE',
    'GRUPO',
    'RECESO',
    'FESTIVO',
  ])

const ESTADO_GUARDADO =
  'GUARDADO'

const ESTADO_CANCELADA =
  'CANCELADA'

const DIAS_SEMANA = [
  {
    dia_semana: 1,
    nombre: 'LUNES',
  },
  {
    dia_semana: 2,
    nombre: 'MARTES',
  },
  {
    dia_semana: 3,
    nombre: 'MIÉRCOLES',
  },
  {
    dia_semana: 4,
    nombre: 'JUEVES',
  },
  {
    dia_semana: 5,
    nombre: 'VIERNES',
  },
  {
    dia_semana: 6,
    nombre: 'SÁBADO',
  },
  {
    dia_semana: 7,
    nombre: 'DOMINGO',
  },
]

// =========================================================
// RESPUESTA ERROR EMPRESA
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
// HELPERS GENERALES
// =========================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}

function colorHexValido(
  valor
) {
  return /^#[0-9A-Fa-f]{6}$/.test(
    texto(
      valor
    )
  )
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
  const resultado =
    Number(
      valor
    )

  if (
    !Number.isFinite(
      resultado
    )
  ) {
    return null
  }

  return Math.trunc(
    resultado
  )
}

function idValido(
  valor
) {
  const resultado =
    numeroEntero(
      valor
    )

  if (
    resultado === null ||
    resultado <= 0
  ) {
    return null
  }

  return resultado
}

function fechaValida(
  valor
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    texto(
      valor
    )
  )
}

function horaValida(
  valor
) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(
    texto(
      valor
    )
  )
}

function normalizarHora(
  valor
) {
  const hora =
    texto(
      valor
    )

  if (
    !horaValida(
      hora
    )
  ) {
    return ''
  }

  return hora.slice(
    0,
    5
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

function categoriasEmpresa(
  empresa
) {
  if (
    !Array.isArray(
      empresa
        ?.categorias_habilitadas
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
    .filter(
      Boolean
    )
}

function respuestaFallida(
  message,
  status = 400,
  extra = {}
) {
  return NextResponse.json(
    {
      status:
        'failed',

      message,

      ...extra,
    },
    {
      status,
    }
  )
}

// =========================================================
// FECHAS
// =========================================================

function fechaUtcDesdeISO(
  valor
) {
  if (
    !fechaValida(
      valor
    )
  ) {
    return null
  }

  const [
    anio,
    mes,
    dia,
  ] =
    valor
      .split('-')
      .map(
        Number
      )

  const fecha =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia
      )
    )

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return null
  }

  return fecha
}

function fechaISODesdeUtc(
  fecha
) {
  return fecha
    .toISOString()
    .slice(
      0,
      10
    )
}

function sumarDiasISO(
  fechaISO,
  dias
) {
  const fecha =
    fechaUtcDesdeISO(
      fechaISO
    )

  if (!fecha) {
    return ''
  }

  fecha.setUTCDate(
    fecha.getUTCDate() +
    dias
  )

  return fechaISODesdeUtc(
    fecha
  )
}

function esLunes(
  fechaISO
) {
  const fecha =
    fechaUtcDesdeISO(
      fechaISO
    )

  return (
    fecha &&
    fecha.getUTCDay() === 1
  )
}

// =========================================================
// HORAS / MINUTOS
// =========================================================

function horaAMinutos(
  valor
) {
  const hora =
    normalizarHora(
      valor
    )

  if (!hora) {
    return null
  }

  const [
    horas,
    minutos,
  ] =
    hora
      .split(':')
      .map(
        Number
      )

  if (
    horas < 0 ||
    horas > 23 ||
    minutos < 0 ||
    minutos > 59
  ) {
    return null
  }

  return (
    horas * 60 +
    minutos
  )
}

function minutosAHora(
  minutosTotales
) {
  const valor =
    Number(
      minutosTotales
    )

  if (
    !Number.isFinite(
      valor
    ) ||
    valor < 0 ||
    valor >= 24 * 60
  ) {
    return ''
  }

  const horas =
    Math.floor(
      valor / 60
    )

  const minutos =
    valor % 60

  return (
    `${String(
      horas
    ).padStart(
      2,
      '0'
    )}:${String(
      minutos
    ).padStart(
      2,
      '0'
    )}`
  )
}

// =========================================================
// CONFIGURACIÓN
// =========================================================

async function obtenerConfiguracion(
  supabase
) {
  const [
    configuracionResultado,
    diasResultado,
  ] =
    await Promise.all([
      supabase
        .from(
          'configuracion_horario_teorico'
        )
        .select(`
          id,
          clave,
          intervalo_franjas_minutos,
          duracion_visual_minutos,
          color_encabezado_hora,
          color_columna_hora,
          color_encabezado_dia,
          usuario_actualizacion,
          created_at,
          updated_at
        `)
        .eq(
          'clave',
          'GENERAL'
        )
        .maybeSingle(),

      supabase
        .from(
          'configuracion_horario_teorico_dias'
        )
        .select(`
          id,
          dia_semana,
          activo,
          hora_inicio,
          hora_fin,
          usuario_actualizacion,
          created_at,
          updated_at
        `)
        .order(
          'dia_semana',
          {
            ascending: true,
          }
        ),
    ])

  if (
    configuracionResultado.error
  ) {
    throw new Error(
      `No fue posible cargar la configuración general del horario teórico: ${configuracionResultado.error.message}`
    )
  }

  if (
    diasResultado.error
  ) {
    throw new Error(
      `No fue posible cargar la configuración de los días: ${diasResultado.error.message}`
    )
  }

  const configuracion =
  configuracionResultado.data ||
  {
    clave:
      'GENERAL',

    intervalo_franjas_minutos:
      INTERVALO_FRANJAS_MINUTOS,

    duracion_visual_minutos:
      120,

    color_encabezado_hora:
      '#0B2D4D',

    color_columna_hora:
      '#1F5A85',

    color_encabezado_dia:
      '#DCEAF5',
  }

  const diasBase =
    Array.isArray(
      diasResultado.data
    )
      ? diasResultado.data
      : []

  const dias =
    DIAS_SEMANA.map(
      (diaBase) => {
        const encontrado =
          diasBase.find(
            (item) =>
              Number(
                item?.dia_semana
              ) ===
              diaBase.dia_semana
          )

        return {
          ...diaBase,

          id:
            encontrado?.id ||
            null,

          activo:
            Boolean(
              encontrado
                ?.activo
            ),

          hora_inicio:
            normalizarHora(
              encontrado
                ?.hora_inicio
            ),

          hora_fin:
            normalizarHora(
              encontrado
                ?.hora_fin
            ),

          usuario_actualizacion:
            encontrado
              ?.usuario_actualizacion ||
            '',

          created_at:
            encontrado
              ?.created_at ||
            null,

          updated_at:
            encontrado
              ?.updated_at ||
            null,
        }
      }
    )

  return {
    general: {
  ...configuracion,

  intervalo_franjas_minutos:
    Number(
      configuracion
        ?.intervalo_franjas_minutos ||
      INTERVALO_FRANJAS_MINUTOS
    ),

  duracion_visual_minutos:
    Number(
      configuracion
        ?.duracion_visual_minutos ||
      120
    ),

  color_encabezado_hora:
    texto(
      configuracion
        ?.color_encabezado_hora
    ) ||
    '#0B2D4D',

  color_columna_hora:
    texto(
      configuracion
        ?.color_columna_hora
    ) ||
    '#1F5A85',

  color_encabezado_dia:
    texto(
      configuracion
        ?.color_encabezado_dia
    ) ||
    '#DCEAF5',
},

    dias,
  }
}

// =========================================================
// GENERAR FRANJAS
// =========================================================

function construirFranjas(
  configuracion
) {
  const duracionVisual =
    Number(
      configuracion
        ?.general
        ?.duracion_visual_minutos ||
      120
    )

  const dias =
    Array.isArray(
      configuracion?.dias
    )
      ? configuracion.dias
      : []

  const inicios =
    new Set()

  const franjasPorDia =
    {}

  for (
    const dia
    of dias
  ) {
    const numeroDia =
      Number(
        dia?.dia_semana
      )

    franjasPorDia[
      numeroDia
    ] = []

    if (
      !dia?.activo
    ) {
      continue
    }

    const inicio =
      horaAMinutos(
        dia?.hora_inicio
      )

    const fin =
      horaAMinutos(
        dia?.hora_fin
      )

    if (
      inicio === null ||
      fin === null ||
      fin <= inicio
    ) {
      continue
    }

    for (
      let actual =
        inicio;

      actual <
        fin;

      actual +=
        INTERVALO_FRANJAS_MINUTOS
    ) {
      const horaInicio =
        minutosAHora(
          actual
        )

      const finVisual =
        Math.min(
          actual +
            duracionVisual,
          fin
        )

      const horaFin =
        minutosAHora(
          finVisual
        )

      if (
        !horaInicio ||
        !horaFin
      ) {
        continue
      }

      inicios.add(
        actual
      )

      franjasPorDia[
        numeroDia
      ].push({
        dia_semana:
          numeroDia,

        hora_inicio:
          horaInicio,

        hora_fin:
          horaFin,

        etiqueta:
          `${horaInicio} - ${horaFin}`,
      })
    }
  }

  const filas =
    Array.from(
      inicios
    )
      .sort(
        (a, b) =>
          a - b
      )
      .map(
        (inicio) => {
          const horaInicio =
            minutosAHora(
              inicio
            )

          return {
            minutos_inicio:
              inicio,

            hora_inicio:
              horaInicio,

            dias:
              DIAS_SEMANA.reduce(
                (
                  acumulado,
                  dia
                ) => {
                  const franja =
                    (
                      franjasPorDia[
                        dia.dia_semana
                      ] ||
                      []
                    ).find(
                      (item) =>
                        item.hora_inicio ===
                        horaInicio
                    )

                  acumulado[
                    dia.dia_semana
                  ] =
                    franja ||
                    null

                  return acumulado
                },
                {}
              ),
          }
        }
      )

  return {
    filas,
    por_dia:
      franjasPorDia,
  }
}

// =========================================================
// VALIDAR FRANJA
// =========================================================

function buscarFranjaValida({
  configuracion,
  diaSemana,
  horaInicio,
}) {
  const franjas =
    construirFranjas(
      configuracion
    )

  const listaDia =
    franjas
      ?.por_dia
      ?.[diaSemana] ||
    []

  return (
    listaDia.find(
      (franja) =>
        franja.hora_inicio ===
        normalizarHora(
          horaInicio
        )
    ) ||
    null
  )
}

// =========================================================
// CATÁLOGOS DE CLASES / GRUPOS
// =========================================================

async function obtenerCatalogos(
  supabase,
  empresa
) {
  const categoriasHabilitadas =
    categoriasEmpresa(
      empresa
    )

  const [
    clasesResultado,
    gruposResultado,
    detalleGruposResultado,
  ] =
    await Promise.all([
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
          color_horario
        `)
        .eq(
          'activo',
          true
        )
        .in(
          'tipo_formacion',
          [
            'TEORIA',
            'TALLER',
          ]
        )
        .order(
          'categoria',
          {
            ascending: true,
          }
        )
        .order(
          'orden',
          {
            ascending: true,
          }
        ),

      supabase
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
          created_at,
          updated_at
        `)
        .eq(
          'activo',
          true
        )
        .order(
          'nombre',
          {
            ascending: true,
          }
        ),

      supabase
        .from(
          'grupos_clases_formacion_detalle'
        )
        .select(`
          grupo_id,
          clase_formacion_id
        `),
    ])

  if (
    clasesResultado.error
  ) {
    throw new Error(
      `No fue posible cargar las clases académicas: ${clasesResultado.error.message}`
    )
  }

  if (
    gruposResultado.error
  ) {
    throw new Error(
      `No fue posible cargar los grupos transversales: ${gruposResultado.error.message}`
    )
  }

  if (
    detalleGruposResultado.error
  ) {
    throw new Error(
      `No fue posible cargar el detalle de los grupos transversales: ${detalleGruposResultado.error.message}`
    )
  }

  const clasesTodas =
    (
      clasesResultado.data ||
      []
    )
      .map(
        (clase) => ({
          ...clase,

          categoria:
            mayusculas(
              clase?.categoria
            ),

          tipo_formacion:
            mayusculas(
              clase
                ?.tipo_formacion
            ),

          nombre_mostrar:
            texto(
              clase
                ?.contenido_tarjeta
            ) ||
            texto(
              clase?.nombre
            ) ||
            texto(
              clase?.codigo
            ),

          categorias_aplica: [
            mayusculas(
              clase?.categoria
            ),
          ],
        })
      )
      .filter(
        (clase) =>
          categoriasHabilitadas.includes(
            clase.categoria
          )
      )

  const clasePorId =
    new Map(
      clasesTodas.map(
        (clase) => [
          Number(
            clase.id
          ),
          clase,
        ]
      )
    )

  const detalles =
    Array.isArray(
      detalleGruposResultado.data
    )
      ? detalleGruposResultado.data
      : []

  const idsClasesEnGrupo =
    new Set()

  const grupos =
    (
      gruposResultado.data ||
      []
    )
      .map(
        (grupo) => {
          const miembros =
            detalles
              .filter(
                (detalle) =>
                  Number(
                    detalle
                      ?.grupo_id
                  ) ===
                  Number(
                    grupo?.id
                  )
              )
              .map(
                (detalle) =>
                  clasePorId.get(
                    Number(
                      detalle
                        ?.clase_formacion_id
                    )
                  )
              )
              .filter(
                Boolean
              )

          for (
            const miembro
            of miembros
          ) {
            idsClasesEnGrupo.add(
              Number(
                miembro.id
              )
            )
          }

          const categorias =
            Array.from(
              new Set(
                miembros
                  .map(
                    (miembro) =>
                      mayusculas(
                        miembro
                          ?.categoria
                      )
                  )
                  .filter(
                    Boolean
                  )
              )
            )
              .filter(
                (categoria) =>
                  categoriasHabilitadas.includes(
                    categoria
                  )
              )
              .sort(
                (
                  categoriaA,
                  categoriaB
                ) =>
                  categoriasHabilitadas.indexOf(
                    categoriaA
                  ) -
                  categoriasHabilitadas.indexOf(
                    categoriaB
                  )
              )

          return {
            ...grupo,

            tipo_formacion:
              mayusculas(
                grupo
                  ?.tipo_formacion
              ),

            nombre_mostrar:
              texto(
                grupo?.nombre
              ),

            categorias_aplica:
              categorias,

            clases:
              miembros,
          }
        }
      )
      .filter(
        (grupo) =>
          grupo
            .categorias_aplica
            .length >
          0
      )

  const clasesIndividuales =
    clasesTodas.filter(
      (clase) =>
        !idsClasesEnGrupo.has(
          Number(
            clase.id
          )
        )
    )

  return {
    categorias_habilitadas:
      categoriasHabilitadas,

    clases:
      clasesIndividuales,

    grupos,

    elementos: [
      ...grupos.map(
        (grupo) => ({
          tipo_elemento:
            'GRUPO',

          id:
            grupo.id,

          nombre:
            grupo.nombre_mostrar,

          color_horario:
            grupo.color_horario ||
            null,

          categorias_aplica:
            grupo
              .categorias_aplica,

          grupo,
        })
      ),

      ...clasesIndividuales.map(
        (clase) => ({
          tipo_elemento:
            'CLASE',

          id:
            clase.id,

          nombre:
            clase.nombre_mostrar,

          color_horario:
            clase.color_horario ||
            null,

          categorias_aplica:
            clase
              .categorias_aplica,

          clase,
        })
      ),
    ],
  }
}

// =========================================================
// ENRIQUECER DETALLE
// =========================================================

function enriquecerDetalles(
  detalles,
  catalogos
) {
  const clases =
    new Map(
      (
        catalogos?.clases ||
        []
      ).map(
        (clase) => [
          Number(
            clase.id
          ),
          clase,
        ]
      )
    )

  const grupos =
    new Map(
      (
        catalogos?.grupos ||
        []
      ).map(
        (grupo) => [
          Number(
            grupo.id
          ),
          grupo,
        ]
      )
    )

  return (
    Array.isArray(
      detalles
    )
      ? detalles
      : []
  ).map(
    (detalle) => {
      const tipo =
        mayusculas(
          detalle
            ?.tipo_elemento
        )

      if (
        tipo ===
        'CLASE'
      ) {
        const clase =
          clases.get(
            Number(
              detalle
                ?.clase_formacion_id
            )
          ) ||
          null

        return {
          ...detalle,

          hora_inicio:
            normalizarHora(
              detalle
                ?.hora_inicio
            ),

          hora_fin:
            normalizarHora(
              detalle
                ?.hora_fin
            ),

          nombre:
            clase
              ?.nombre_mostrar ||
            'CLASE',

          color_horario:
            clase
              ?.color_horario ||
            null,

          categorias_aplica:
            clase
              ?.categorias_aplica ||
            [],

          elemento:
            clase,
        }
      }

      if (
        tipo ===
        'GRUPO'
      ) {
        const grupo =
          grupos.get(
            Number(
              detalle
                ?.grupo_clases_formacion_id
            )
          ) ||
          null

        return {
          ...detalle,

          hora_inicio:
            normalizarHora(
              detalle
                ?.hora_inicio
            ),

          hora_fin:
            normalizarHora(
              detalle
                ?.hora_fin
            ),

          nombre:
            grupo
              ?.nombre_mostrar ||
            'GRUPO',

          color_horario:
            grupo
              ?.color_horario ||
            null,

          categorias_aplica:
            grupo
              ?.categorias_aplica ||
            [],

          elemento:
            grupo,
        }
      }

      if (
        tipo ===
        'RECESO'
      ) {
        return {
          ...detalle,

          hora_inicio:
            normalizarHora(
              detalle
                ?.hora_inicio
            ),

          hora_fin:
            normalizarHora(
              detalle
                ?.hora_fin
            ),

          nombre:
            'RECESO',

          color_horario:
            '#F59E0B',

          categorias_aplica:
            [],

          elemento:
            null,
        }
      }

      if (
        tipo ===
        'FESTIVO'
      ) {
        return {
          ...detalle,

          hora_inicio:
            normalizarHora(
              detalle
                ?.hora_inicio
            ),

          hora_fin:
            normalizarHora(
              detalle
                ?.hora_fin
            ),

          nombre:
            'FESTIVO',

          color_horario:
            '#DC2626',

          categorias_aplica:
            [],

          elemento:
            null,
        }
      }

      return {
        ...detalle,

        hora_inicio:
          normalizarHora(
            detalle
              ?.hora_inicio
          ),

        hora_fin:
          normalizarHora(
            detalle
              ?.hora_fin
          ),

        nombre:
          tipo ||
          'ELEMENTO',

        color_horario:
          null,

        categorias_aplica:
          [],

        elemento:
          null,
      }
    }
  )
}

// =========================================================
// OBTENER HORARIO DE UNA SEMANA
// =========================================================

async function obtenerHorarioSemana(
  supabase,
  semanaInicio,
  catalogos
) {
  if (
    !semanaInicio
  ) {
    return null
  }

  const {
    data: horario,
    error: horarioError,
  } =
    await supabase
      .from(
        'horarios_teoricos'
      )
      .select(`
        id,
        semana_inicio,
        semana_fin,
        estado,
        titulo,
        observaciones,
        fecha_publicacion,
        fecha_cancelacion,
        usuario_creacion,
        usuario_actualizacion,
        usuario_publicacion,
        usuario_cancelacion,
        created_at,
        updated_at
      `)
      .eq(
        'semana_inicio',
        semanaInicio
      )
      .maybeSingle()

  if (
    horarioError
  ) {
    throw new Error(
      `No fue posible cargar el horario teórico: ${horarioError.message}`
    )
  }

  if (!horario) {
    return null
  }

  const {
    data: detalles,
    error: detallesError,
  } =
    await supabase
      .from(
        'horarios_teoricos_detalle'
      )
      .select(`
        id,
        horario_teorico_id,
        dia_semana,
        hora_inicio,
        hora_fin,
        tipo_elemento,
        clase_formacion_id,
        grupo_clases_formacion_id,
        observaciones,
        usuario_creacion,
        usuario_actualizacion,
        created_at,
        updated_at
      `)
      .eq(
        'horario_teorico_id',
        horario.id
      )
      .order(
        'dia_semana',
        {
          ascending: true,
        }
      )
      .order(
        'hora_inicio',
        {
          ascending: true,
        }
      )

  if (
    detallesError
  ) {
    throw new Error(
      `No fue posible cargar el detalle del horario teórico: ${detallesError.message}`
    )
  }

  return {
    ...horario,

    detalles:
      enriquecerDetalles(
        detalles,
        catalogos
      ),
  }
}

// =========================================================
// HISTORIAL
// =========================================================

async function obtenerHistorial(
  supabase,
  limite = 20
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'horarios_teoricos'
      )
      .select(`
        id,
        semana_inicio,
        semana_fin,
        estado,
        titulo,
        observaciones,
        usuario_creacion,
        usuario_actualizacion,
        usuario_cancelacion,
        created_at,
        updated_at,
        fecha_cancelacion
      `)
      .order(
        'semana_inicio',
        {
          ascending: false,
        }
      )
      .limit(
        limite
      )

  if (error) {
    throw new Error(
      `No fue posible cargar el historial de horarios: ${error.message}`
    )
  }

  return (
    data ||
    []
  )
}

// =========================================================
// NORMALIZAR DETALLE RECIBIDO
// =========================================================

function normalizarDetallesRecibidos(
  valor
) {
  if (
    !Array.isArray(
      valor
    )
  ) {
    return []
  }

  return valor
    .map(
      (item) => ({
        dia_semana:
          numeroEntero(
            item
              ?.dia_semana
          ),

        hora_inicio:
          normalizarHora(
            item
              ?.hora_inicio
          ),

        tipo_elemento:
          mayusculas(
            item
              ?.tipo_elemento
          ),

        clase_formacion_id:
          idValido(
            item
              ?.clase_formacion_id
          ),

        grupo_clases_formacion_id:
          idValido(
            item
              ?.grupo_clases_formacion_id
          ),

        observaciones:
          texto(
            item
              ?.observaciones
          ) ||
          null,
      })
    )
    .filter(
      (item) =>
        item.dia_semana !==
          null &&
        item.hora_inicio &&
        item.tipo_elemento
    )
}

// =========================================================
// VALIDAR DETALLES
// =========================================================

function validarDetalles({
  detalles,
  configuracion,
  catalogos,
}) {
  const errores =
    []

  const llaves =
    new Set()

  const clasesValidas =
    new Set(
      (
        catalogos?.clases ||
        []
      ).map(
        (clase) =>
          Number(
            clase.id
          )
      )
    )

  const gruposValidos =
    new Set(
      (
        catalogos?.grupos ||
        []
      ).map(
        (grupo) =>
          Number(
            grupo.id
          )
      )
    )

  const detallesValidados =
    []

  for (
    let indice = 0;
    indice <
      detalles.length;
    indice += 1
  ) {
    const detalle =
      detalles[
        indice
      ]

    const posicion =
      indice + 1

    if (
      !Number.isInteger(
        detalle
          ?.dia_semana
      ) ||
      detalle.dia_semana <
        1 ||
      detalle.dia_semana >
        7
    ) {
      errores.push(
        `El bloque ${posicion} tiene un día no válido.`
      )

      continue
    }

    const tipo =
      mayusculas(
        detalle
          ?.tipo_elemento
      )

    if (
      !TIPOS_ELEMENTO_VALIDOS.has(
        tipo
      )
    ) {
      errores.push(
        `El bloque ${posicion} tiene un tipo de elemento no válido.`
      )

      continue
    }

    const franja =
      buscarFranjaValida({
        configuracion,

        diaSemana:
          detalle
            .dia_semana,

        horaInicio:
          detalle
            .hora_inicio,
      })

    if (!franja) {
      errores.push(
        `El bloque ${posicion} no corresponde a una franja habilitada para ese día.`
      )

      continue
    }

    const llave =
      `${detalle.dia_semana}-${franja.hora_inicio}`

    if (
      llaves.has(
        llave
      )
    ) {
      errores.push(
        `Existe más de una programación para el día ${detalle.dia_semana} a las ${franja.hora_inicio}.`
      )

      continue
    }

    llaves.add(
      llave
    )

    let claseId =
      null

    let grupoId =
      null

    if (
      tipo ===
      'CLASE'
    ) {
      claseId =
        idValido(
          detalle
            ?.clase_formacion_id
        )

      if (
        !claseId ||
        !clasesValidas.has(
          claseId
        )
      ) {
        errores.push(
          `El bloque ${posicion} contiene una clase no válida para este CEA.`
        )

        continue
      }
    }

    if (
      tipo ===
      'GRUPO'
    ) {
      grupoId =
        idValido(
          detalle
            ?.grupo_clases_formacion_id
        )

      if (
        !grupoId ||
        !gruposValidos.has(
          grupoId
        )
      ) {
        errores.push(
          `El bloque ${posicion} contiene un grupo no válido para este CEA.`
        )

        continue
      }
    }

    detallesValidados.push({
      dia_semana:
        detalle
          .dia_semana,

      hora_inicio:
        franja
          .hora_inicio,

      hora_fin:
        franja
          .hora_fin,

      tipo_elemento:
        tipo,

      clase_formacion_id:
        claseId,

      grupo_clases_formacion_id:
        grupoId,

      observaciones:
        texto(
          detalle
            ?.observaciones
        ) ||
        null,
    })
  }

  return {
    errores,
    detalles:
      detallesValidados,
  }
}

// =========================================================
// GUARDAR CONFIGURACIÓN
// =========================================================

async function guardarConfiguracion({
  supabase,
  body,
  usuario,
}) {
  const duracionVisual =
    numeroEntero(
      body
        ?.duracion_visual_minutos
    )

  const colorEncabezadoHora =
  texto(
    body
      ?.color_encabezado_hora
  ) ||
  '#0B2D4D'

const colorColumnaHora =
  texto(
    body
      ?.color_columna_hora
  ) ||
  '#1F5A85'

const colorEncabezadoDia =
  texto(
    body
      ?.color_encabezado_dia
  ) ||
  '#DCEAF5'  

  if (
    !DURACIONES_VISUALES_VALIDAS.has(
      duracionVisual
    )
  ) {
    return {
      error:
        'La duración visual debe ser de 30, 60, 90 o 120 minutos.',
    }
  }

  if (
  !colorHexValido(
    colorEncabezadoHora
  )
) {
  return {
    error:
      'El color del encabezado HORA no es válido.',
  }
}

if (
  !colorHexValido(
    colorColumnaHora
  )
) {
  return {
    error:
      'El color de la columna HORA no es válido.',
  }
}

if (
  !colorHexValido(
    colorEncabezadoDia
  )
) {
  return {
    error:
      'El color del encabezado de los días no es válido.',
  }
}

  if (
    !Array.isArray(
      body?.dias
    )
  ) {
    return {
      error:
        'Debe enviar la configuración de los días.',
    }
  }

  const diasRecibidos =
    new Map(
      body.dias.map(
        (dia) => [
          numeroEntero(
            dia
              ?.dia_semana
          ),
          dia,
        ]
      )
    )

  const filasDias =
    []

  for (
    const diaBase
    of DIAS_SEMANA
  ) {
    const recibido =
      diasRecibidos.get(
        diaBase.dia_semana
      )

    const activo =
      Boolean(
        recibido?.activo
      )

    let horaInicio =
      null

    let horaFin =
      null

    if (activo) {
      horaInicio =
        normalizarHora(
          recibido
            ?.hora_inicio
        )

      horaFin =
        normalizarHora(
          recibido
            ?.hora_fin
        )

      const inicioMinutos =
        horaAMinutos(
          horaInicio
        )

      const finMinutos =
        horaAMinutos(
          horaFin
        )

      if (
        inicioMinutos ===
          null ||
        finMinutos ===
          null ||
        finMinutos <=
          inicioMinutos
      ) {
        return {
          error:
            `${diaBase.nombre}: la hora inicial y la hora final no son válidas.`,
        }
      }

      const diferencia =
        finMinutos -
        inicioMinutos

      if (
        diferencia %
          INTERVALO_FRANJAS_MINUTOS !==
        0
      ) {
        return {
          error:
            `${diaBase.nombre}: el tiempo entre la hora inicial y la hora final debe dividirse exactamente en franjas de 2 horas.`,
        }
      }
    }

    filasDias.push({
      dia_semana:
        diaBase
          .dia_semana,

      activo,

      hora_inicio:
        activo
          ? horaInicio
          : null,

      hora_fin:
        activo
          ? horaFin
          : null,

      usuario_actualizacion:
        usuario,

      updated_at:
        new Date()
          .toISOString(),
    })
  }

  const {
    error:
      generalError,
  } =
    await supabase
      .from(
        'configuracion_horario_teorico'
      )
      .upsert(
        {
          clave:
            'GENERAL',

          intervalo_franjas_minutos:
            INTERVALO_FRANJAS_MINUTOS,

          duracion_visual_minutos:
            duracionVisual,

          color_encabezado_hora:
            colorEncabezadoHora,

          color_columna_hora:
            colorColumnaHora,

          color_encabezado_dia:
            colorEncabezadoDia,

          usuario_actualizacion:
            usuario,

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            'clave',
        }
      )

  if (
    generalError
  ) {
    return {
      error:
        `No fue posible guardar la configuración general: ${generalError.message}`,
    }
  }

  const {
    error:
      diasError,
  } =
    await supabase
      .from(
        'configuracion_horario_teorico_dias'
      )
      .upsert(
        filasDias,
        {
          onConflict:
            'dia_semana',
        }
      )

  if (
    diasError
  ) {
    return {
      error:
        `No fue posible guardar la configuración de los días: ${diasError.message}`,
    }
  }

  const configuracion =
    await obtenerConfiguracion(
      supabase
    )

  return {
    configuracion,

    franjas:
      construirFranjas(
        configuracion
      ),
  }
}

// =========================================================
// GUARDAR HORARIO
// =========================================================

async function guardarHorario({
  supabase,
  empresa,
  body,
}) {
  const semanaInicio =
    texto(
      body
        ?.semana_inicio
    )

  const usuario =
    texto(
      body?.usuario
    )

  if (
    !fechaValida(
      semanaInicio
    )
  ) {
    return {
      statusCode:
        400,

      error:
        'La fecha inicial de la semana no es válida.',
    }
  }

  if (
    !esLunes(
      semanaInicio
    )
  ) {
    return {
      statusCode:
        400,

      error:
        'La semana debe iniciar un lunes.',
    }
  }

  if (!usuario) {
    return {
      statusCode:
        400,

      error:
        'El usuario que realiza la operación es obligatorio.',
    }
  }

  const [
    configuracion,
    catalogos,
  ] =
    await Promise.all([
      obtenerConfiguracion(
        supabase
      ),

      obtenerCatalogos(
        supabase,
        empresa
      ),
    ])

  const detallesNormalizados =
    normalizarDetallesRecibidos(
      body?.detalles
    )

  const validacion =
    validarDetalles({
      detalles:
        detallesNormalizados,

      configuracion,

      catalogos,
    })

  if (
    validacion
      .errores
      .length >
    0
  ) {
    return {
      statusCode:
        400,

      error:
        validacion
          .errores[0],

      errores:
        validacion
          .errores,
    }
  }

  const semanaFin =
    sumarDiasISO(
      semanaInicio,
      6
    )

  const titulo =
    texto(
      body?.titulo
    ) ||
    null

  const observaciones =
    texto(
      body
        ?.observaciones
    ) ||
    null

  const {
    data:
      existente,

    error:
      existenteError,
  } =
    await supabase
      .from(
        'horarios_teoricos'
      )
      .select(`
        id,
        estado,
        usuario_creacion
      `)
      .eq(
        'semana_inicio',
        semanaInicio
      )
      .maybeSingle()

  if (
    existenteError
  ) {
    return {
      statusCode:
        500,

      error:
        `No fue posible verificar el horario existente: ${existenteError.message}`,
    }
  }

  let horarioId =
    existente?.id ||
    null

  const ahora =
    new Date()
      .toISOString()

  if (horarioId) {
    const {
      error:
        actualizarError,
    } =
      await supabase
        .from(
          'horarios_teoricos'
        )
        .update({
          semana_fin:
            semanaFin,

          estado:
            ESTADO_GUARDADO,

          titulo,

          observaciones,

          fecha_cancelacion:
            null,

          usuario_cancelacion:
            null,

          usuario_actualizacion:
            usuario,

          updated_at:
            ahora,
        })
        .eq(
          'id',
          horarioId
        )

    if (
      actualizarError
    ) {
      return {
        statusCode:
          500,

        error:
          `No fue posible actualizar el horario: ${actualizarError.message}`,
      }
    }
  } else {
    const {
      data:
        nuevoHorario,

      error:
        crearError,
    } =
      await supabase
        .from(
          'horarios_teoricos'
        )
        .insert({
          semana_inicio:
            semanaInicio,

          semana_fin:
            semanaFin,

          estado:
            ESTADO_GUARDADO,

          titulo,

          observaciones,

          usuario_creacion:
            usuario,

          usuario_actualizacion:
            usuario,

          created_at:
            ahora,

          updated_at:
            ahora,
        })
        .select(`
          id
        `)
        .single()

    if (
      crearError
    ) {
      return {
        statusCode:
          500,

        error:
          `No fue posible crear el horario: ${crearError.message}`,
      }
    }

    horarioId =
      nuevoHorario.id
  }

  // =======================================================
  // GUARDAR COPIA ANTERIOR PARA RECUPERACIÓN
  // =======================================================

  const {
    data:
      detallesAnteriores,

    error:
      detallesAnterioresError,
  } =
    await supabase
      .from(
        'horarios_teoricos_detalle'
      )
      .select(`
        dia_semana,
        hora_inicio,
        hora_fin,
        tipo_elemento,
        clase_formacion_id,
        grupo_clases_formacion_id,
        observaciones,
        usuario_creacion,
        usuario_actualizacion
      `)
      .eq(
        'horario_teorico_id',
        horarioId
      )

  if (
    detallesAnterioresError
  ) {
    return {
      statusCode:
        500,

      error:
        `No fue posible preparar la actualización del horario: ${detallesAnterioresError.message}`,
    }
  }

  const {
    error:
      eliminarError,
  } =
    await supabase
      .from(
        'horarios_teoricos_detalle'
      )
      .delete()
      .eq(
        'horario_teorico_id',
        horarioId
      )

  if (
    eliminarError
  ) {
    return {
      statusCode:
        500,

      error:
        `No fue posible actualizar las franjas del horario: ${eliminarError.message}`,
    }
  }

  if (
    validacion
      .detalles
      .length >
    0
  ) {
    const filas =
      validacion
        .detalles
        .map(
          (detalle) => ({
            horario_teorico_id:
              horarioId,

            dia_semana:
              detalle
                .dia_semana,

            hora_inicio:
              detalle
                .hora_inicio,

            hora_fin:
              detalle
                .hora_fin,

            tipo_elemento:
              detalle
                .tipo_elemento,

            clase_formacion_id:
              detalle
                .clase_formacion_id,

            grupo_clases_formacion_id:
              detalle
                .grupo_clases_formacion_id,

            observaciones:
              detalle
                .observaciones,

            usuario_creacion:
              usuario,

            usuario_actualizacion:
              usuario,

            created_at:
              ahora,

            updated_at:
              ahora,
          })
        )

    const {
      error:
        insertarError,
    } =
      await supabase
        .from(
          'horarios_teoricos_detalle'
        )
        .insert(
          filas
        )

    if (
      insertarError
    ) {
      // ===================================================
      // INTENTO DE RESTAURACIÓN
      // ===================================================

      if (
        Array.isArray(
          detallesAnteriores
        ) &&
        detallesAnteriores.length >
          0
      ) {
        const restaurar =
          detallesAnteriores.map(
            (detalle) => ({
              horario_teorico_id:
                horarioId,

              dia_semana:
                detalle
                  .dia_semana,

              hora_inicio:
                detalle
                  .hora_inicio,

              hora_fin:
                detalle
                  .hora_fin,

              tipo_elemento:
                detalle
                  .tipo_elemento,

              clase_formacion_id:
                detalle
                  .clase_formacion_id,

              grupo_clases_formacion_id:
                detalle
                  .grupo_clases_formacion_id,

              observaciones:
                detalle
                  .observaciones,

              usuario_creacion:
                detalle
                  .usuario_creacion ||
                usuario,

              usuario_actualizacion:
                detalle
                  .usuario_actualizacion ||
                usuario,
            })
          )

        const {
          error:
            restaurarError,
        } =
          await supabase
            .from(
              'horarios_teoricos_detalle'
            )
            .insert(
              restaurar
            )

        if (
          restaurarError
        ) {
          console.error(
            'Error restaurando detalle anterior del horario teórico:',
            restaurarError
          )
        }
      }

      return {
        statusCode:
          500,

        error:
          `No fue posible guardar las franjas del horario: ${insertarError.message}`,
      }
    }
  }

  const horario =
    await obtenerHorarioSemana(
      supabase,
      semanaInicio,
      catalogos
    )

  return {
    horario,

    configuracion,

    franjas:
      construirFranjas(
        configuracion
      ),

    catalogos,
  }
}

// =========================================================
// GET
// =========================================================
//
// EJEMPLOS:
//
// /api/admin/configuracion-academica/horarios?nit=...&semana_inicio=2026-08-31
//
// También puede enviarse el NIT mediante:
//
// x-cea-nit
//
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

    const semanaInicio =
      texto(
        searchParams.get(
          'semana_inicio'
        )
      )

    if (
      semanaInicio &&
      !fechaValida(
        semanaInicio
      )
    ) {
      return respuestaFallida(
        'La fecha inicial de la semana no es válida.'
      )
    }

    if (
      semanaInicio &&
      !esLunes(
        semanaInicio
      )
    ) {
      return respuestaFallida(
        'La semana consultada debe iniciar un lunes.'
      )
    }

    const [
      configuracion,
      catalogos,
      historial,
    ] =
      await Promise.all([
        obtenerConfiguracion(
          supabase
        ),

        obtenerCatalogos(
          supabase,
          empresa
        ),

        obtenerHistorial(
          supabase
        ),
      ])

    const horario =
      semanaInicio
        ? await obtenerHorarioSemana(
            supabase,
            semanaInicio,
            catalogos
          )
        : null

    const franjas =
      construirFranjas(
        configuracion
      )

    return NextResponse.json({
      status:
        'success',

      empresa: {
        nit:
          empresa?.nit ||
          '',

        nombre:
          nombreEmpresa(
            empresa
          ),

        nivel_cea:
          empresa
            ?.nivel_cea ||
          '',

        categorias_habilitadas:
          categoriasEmpresa(
            empresa
          ),
      },

      configuracion,

      franjas,

      catalogos,

      horario,

      historial,
    })
  } catch (
    error
  ) {
    console.error(
      'Error GET /api/admin/configuracion-academica/horarios:',
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
// GUARDAR HORARIO
//
// BODY:
//
// {
//   nit,
//   accion: 'GUARDAR_HORARIO',
//   semana_inicio: '2026-08-31',
//   usuario: '...',
//   titulo: '',
//   observaciones: '',
//   detalles: [
//     {
//       dia_semana: 1,
//       hora_inicio: '08:00',
//       tipo_elemento: 'CLASE',
//       clase_formacion_id: 1
//     },
//     {
//       dia_semana: 1,
//       hora_inicio: '10:00',
//       tipo_elemento: 'RECESO'
//     }
//   ]
// }
//
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
      mayusculas(
        body?.accion ||
        'GUARDAR_HORARIO'
      )

    if (
      accion !==
      'GUARDAR_HORARIO'
    ) {
      return respuestaFallida(
        'Acción no válida.'
      )
    }

    const resultado =
      await guardarHorario({
        supabase,
        empresa,
        body,
      })

    if (
      resultado.error
    ) {
      return respuestaFallida(
        resultado.error,
        resultado
          .statusCode ||
        400,
        resultado.errores
          ? {
              errores:
                resultado.errores,
            }
          : {}
      )
    }

    return NextResponse.json({
      status:
        'success',

      message:
        'Horario teórico guardado correctamente.',

      ...resultado,
    })
  } catch (
    error
  ) {
    console.error(
      'Error POST /api/admin/configuracion-academica/horarios:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// =========================================================
// PATCH
// =========================================================
//
// ACCIONES:
//
// GUARDAR_CONFIGURACION
// GUARDAR_HORARIO
// CANCELAR
// REACTIVAR
//
// =========================================================

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

    const accion =
      mayusculas(
        body?.accion
      )

    const usuario =
      texto(
        body?.usuario
      )

    // =====================================================
    // GUARDAR CONFIGURACIÓN
    // =====================================================

    if (
      accion ===
      'GUARDAR_CONFIGURACION'
    ) {
      if (!usuario) {
        return respuestaFallida(
          'El usuario que realiza la operación es obligatorio.'
        )
      }

      const resultado =
        await guardarConfiguracion({
          supabase,
          body,
          usuario,
        })

      if (
        resultado.error
      ) {
        return respuestaFallida(
          resultado.error
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          'Configuración del horario teórico guardada correctamente.',

        configuracion:
          resultado
            .configuracion,

        franjas:
          resultado
            .franjas,
      })
    }

    // =====================================================
    // GUARDAR HORARIO EXISTENTE
    // =====================================================

    if (
      accion ===
      'GUARDAR_HORARIO'
    ) {
      const resultado =
        await guardarHorario({
          supabase,
          empresa,
          body,
        })

      if (
        resultado.error
      ) {
        return respuestaFallida(
          resultado.error,
          resultado
            .statusCode ||
          400,
          resultado.errores
            ? {
                errores:
                  resultado.errores,
              }
            : {}
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          'Horario teórico actualizado correctamente.',

        ...resultado,
      })
    }

    // =====================================================
    // CANCELAR / REACTIVAR
    // =====================================================

    if (
      accion ===
        'CANCELAR' ||
      accion ===
        'REACTIVAR'
    ) {
      const horarioId =
        idValido(
          body
            ?.horario_id ||
          body?.id
        )

      if (!horarioId) {
        return respuestaFallida(
          'El horario es obligatorio.'
        )
      }

      if (!usuario) {
        return respuestaFallida(
          'El usuario que realiza la operación es obligatorio.'
        )
      }

      const ahora =
        new Date()
          .toISOString()

      const cambios =
        accion ===
        'CANCELAR'
          ? {
              estado:
                ESTADO_CANCELADA,

              fecha_cancelacion:
                ahora,

              usuario_cancelacion:
                usuario,

              usuario_actualizacion:
                usuario,

              updated_at:
                ahora,
            }
          : {
              estado:
                ESTADO_GUARDADO,

              fecha_cancelacion:
                null,

              usuario_cancelacion:
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
            'horarios_teoricos'
          )
          .update(
            cambios
          )
          .eq(
            'id',
            horarioId
          )
          .select(`
            id,
            semana_inicio,
            semana_fin,
            estado,
            titulo,
            observaciones,
            fecha_cancelacion,
            usuario_creacion,
            usuario_actualizacion,
            usuario_cancelacion,
            created_at,
            updated_at
          `)
          .maybeSingle()

      if (error) {
        return respuestaFallida(
          `No fue posible actualizar el estado del horario: ${error.message}`,
          500
        )
      }

      if (!data) {
        return respuestaFallida(
          'No se encontró el horario indicado.',
          404
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          accion ===
          'CANCELAR'
            ? 'Horario cancelado correctamente.'
            : 'Horario habilitado nuevamente.',

        horario:
          data,
      })
    }

    return respuestaFallida(
      'Acción no válida.'
    )
  } catch (
    error
  ) {
    console.error(
      'Error PATCH /api/admin/configuracion-academica/horarios:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// =========================================================
// DELETE
// =========================================================
//
// BODY:
//
// {
//   nit,
//   horario_id,
//   usuario
// }
//
// También acepta:
//
// ?nit=...
// &horario_id=...
//
// =========================================================

export async function DELETE(
  request
) {
  try {
    let body =
      {}

    try {
      body =
        await request.json()
    } catch {
      body =
        {}
    }

    const {
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const supabase =
      supabaseAdmin

    const {
      searchParams,
    } =
      new URL(
        request.url
      )

    const horarioId =
      idValido(
        body
          ?.horario_id ||
        body?.id ||
        searchParams.get(
          'horario_id'
        ) ||
        searchParams.get(
          'id'
        )
      )

    if (!horarioId) {
      return respuestaFallida(
        'El horario es obligatorio.'
      )
    }

    const {
      data:
        horarioExistente,

      error:
        horarioError,
    } =
      await supabase
        .from(
          'horarios_teoricos'
        )
        .select(`
          id,
          semana_inicio,
          semana_fin,
          estado
        `)
        .eq(
          'id',
          horarioId
        )
        .maybeSingle()

    if (
      horarioError
    ) {
      return respuestaFallida(
        `No fue posible verificar el horario: ${horarioError.message}`,
        500
      )
    }

    if (
      !horarioExistente
    ) {
      return respuestaFallida(
        'No se encontró el horario indicado.',
        404
      )
    }

    const {
      error:
        eliminarError,
    } =
      await supabase
        .from(
          'horarios_teoricos'
        )
        .delete()
        .eq(
          'id',
          horarioId
        )

    if (
      eliminarError
    ) {
      return respuestaFallida(
        `No fue posible eliminar el horario: ${eliminarError.message}`,
        500
      )
    }

    return NextResponse.json({
      status:
        'success',

      message:
        'Horario teórico eliminado correctamente.',

      horario:
        horarioExistente,
    })
  } catch (
    error
  ) {
    console.error(
      'Error DELETE /api/admin/configuracion-academica/horarios:',
      error
    )

    return respuestaError(
      error
    )
  }
}