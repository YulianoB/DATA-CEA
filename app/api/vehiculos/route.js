// app/api/vehiculos/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const ESTADO_ACTIVO =
  'ACTIVO'

const ESTADO_INACTIVO =
  'INACTIVO'

const VINCULACION_ACTIVA =
  'ACTIVA'

const VINCULACION_FINALIZADA =
  'FINALIZADA'

const TIPOS_VEHICULO = [
  'Automovil',
  'Camioneta',
  'Motocicleta',
  'Camión',
]

const CLASIFICACIONES = [
  'AUTOMOTOR',
  'NO AUTOMOTOR',
]

const ORIGENES = [
  'PROPIO',
  'ASOCIADO',
]

const OPCIONES_GPS = [
  'SI',
  'NO',
]

// =========================================================
// SELECTS
// =========================================================

const SELECT_VEHICULO = `
  id,
  placa,
  tipo_vehiculo,
  marca,
  estado,
  gps,
  propietario,

  clasificacion,
  origen,
  fecha_adquisicion,

  modelo,
  linea,
  tipo_carroceria,

  numero_chasis,
  numero_motor,
  vin,

  numero_licencia_transito,
  fecha_matricula,
  organismo_transito,

  numero_tarjeta_servicio,
  fecha_expedicion_tarjeta_servicio,
  fecha_vigencia_tarjeta_servicio,

  foto_frontal_path,
  foto_lateral_path,

  created_at,
  updated_at
`

const SELECT_VINCULACION = `
  id,
  vehiculo_id,
  fecha_vinculacion,
  fecha_desvinculacion,
  motivo_vinculacion,
  motivo_desvinculacion,
  numero_tarjeta_servicio,
  fecha_expedicion_tarjeta_servicio,
  estado,
  observaciones,
  creado_por,
  created_at,
  cerrado_por,
  closed_at,
  updated_at
`

// =========================================================
// HELPERS GENERALES
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

function normalizarTexto(
  valor
) {
  return String(
    valor || ''
  ).trim()
}

function normalizarMayusculas(
  valor
) {
  return String(
    valor || ''
  )
    .trim()
    .toUpperCase()
}

function normalizarMinusculas(
  valor
) {
  return String(
    valor || ''
  )
    .trim()
    .toLowerCase()
}

function normalizarEstado(
  valor
) {
  const estado =
    normalizarMayusculas(
      valor
    )

  if (
    estado ===
      ESTADO_ACTIVO ||
    estado ===
      ESTADO_INACTIVO
  ) {
    return estado
  }

  return estado
}

function normalizarTipoVehiculo(
  valor
) {
  const texto =
    normalizarMinusculas(
      valor
    )

  if (
    texto ===
      'automovil' ||
    texto ===
      'automóvil'
  ) {
    return 'Automovil'
  }

  if (
    texto ===
    'camioneta'
  ) {
    return 'Camioneta'
  }

  if (
    texto ===
    'motocicleta'
  ) {
    return 'Motocicleta'
  }

  if (
    texto ===
      'camion' ||
    texto ===
      'camión'
  ) {
    return 'Camión'
  }

  return normalizarTexto(
    valor
  )
}

function fechaValida(
  fecha
) {
  if (!fecha) {
    return true
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(
      fecha
    )
  )
}

function ahoraISO() {
  return new Date()
    .toISOString()
}

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

function obtenerNombreResponsable(
  body
) {
  return (
    normalizarTexto(
      body
        ?.nombre_responsable
    ) ||
    normalizarTexto(
      body
        ?.actualizado_por
    ) ||
    normalizarTexto(
      body
        ?.nombre_quien_actualiza
    ) ||
    'ADMINISTRATIVO'
  )
}

function numeroSeguro(
  valor
) {
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
// FECHAS PARA RESUMEN OPERATIVO
// =========================================================

function sumarDias(
  fechaISO,
  dias
) {
  const fecha =
    new Date(
      `${fechaISO}T12:00:00Z`
    )

  fecha.setUTCDate(
    fecha.getUTCDate() +
      dias
  )

  return fecha
    .toISOString()
    .slice(
      0,
      10
    )
}

function inicioMes(
  fechaISO
) {
  return `${String(
    fechaISO
  ).slice(
    0,
    7
  )}-01`
}

function desplazarMeses(
  fechaISO,
  meses
) {
  const fecha =
    new Date(
      `${inicioMes(
        fechaISO
      )}T12:00:00Z`
    )

  fecha.setUTCMonth(
    fecha.getUTCMonth() +
      meses
  )

  return fecha
    .toISOString()
    .slice(
      0,
      10
    )
}
function restarDias(
  fechaISO,
  dias
) {
  const fecha =
    new Date(
      `${fechaISO}T12:00:00Z`
    )

  fecha.setUTCDate(
    fecha.getUTCDate() -
      dias
  )

  return fecha
    .toISOString()
    .slice(
      0,
      10
    )
}
// =========================================================
// VALIDAR VEHÍCULO
// =========================================================

function validarVehiculo({
  placa,
  tipoVehiculo,
  marca,
  estado,
  clasificacion,
  origen,
  gps,
  fechaAdquisicion,
  fechaMatricula,
}) {
  if (!placa) {
    return (
      'La placa es obligatoria.'
    )
  }

  if (!tipoVehiculo) {
    return (
      'El tipo de vehículo es obligatorio.'
    )
  }

  if (
    !TIPOS_VEHICULO.includes(
      tipoVehiculo
    )
  ) {
    return (
      'El tipo de vehículo no es válido.'
    )
  }

  if (!marca) {
    return (
      'La marca es obligatoria.'
    )
  }

  if (!estado) {
    return (
      'El estado del vehículo es obligatorio.'
    )
  }

  if (
    ![
      ESTADO_ACTIVO,
      ESTADO_INACTIVO,
    ].includes(
      estado
    )
  ) {
    return (
      'El estado del vehículo no es válido.'
    )
  }

  if (
    clasificacion &&
    !CLASIFICACIONES.includes(
      clasificacion
    )
  ) {
    return (
      'La clasificación del vehículo no es válida.'
    )
  }

  if (
    origen &&
    !ORIGENES.includes(
      origen
    )
  ) {
    return (
      'El origen del vehículo no es válido.'
    )
  }

  if (
    gps &&
    !OPCIONES_GPS.includes(
      gps
    )
  ) {
    return (
      'La opción de GPS no es válida.'
    )
  }

  if (
    fechaAdquisicion &&
    !fechaValida(
      fechaAdquisicion
    )
  ) {
    return (
      'La fecha de adquisición no es válida.'
    )
  }

  if (
    fechaMatricula &&
    !fechaValida(
      fechaMatricula
    )
  ) {
    return (
      'La fecha de matrícula no es válida.'
    )
  }

  return ''
}

// =========================================================
// CONSTRUIR PAYLOAD VEHÍCULO
// =========================================================

function construirPayloadVehiculo(
  body,
  {
    incluirEstado = true,
  } = {}
) {
  const payload = {
    placa:
      normalizarMayusculas(
        body.placa
      ),

    // Se conserva la nomenclatura histórica de la BD:
    // Automovil, Camioneta, Motocicleta, Camión.
    tipo_vehiculo:
      normalizarTipoVehiculo(
        body.tipo_vehiculo
      ),

    marca:
      normalizarMayusculas(
        body.marca
      ),

    gps:
      normalizarMayusculas(
        body.gps
      ) ||
      null,

    propietario:
      normalizarMayusculas(
        body.propietario
      ) ||
      null,

    clasificacion:
      normalizarMayusculas(
        body.clasificacion
      ) ||
      null,

    origen:
      normalizarMayusculas(
        body.origen
      ) ||
      null,

    fecha_adquisicion:
      normalizarTexto(
        body.fecha_adquisicion
      ) ||
      null,

    modelo:
      normalizarMayusculas(
        body.modelo
      ) ||
      null,

    linea:
      normalizarMayusculas(
        body.linea
      ) ||
      null,

    tipo_carroceria:
      normalizarMayusculas(
        body.tipo_carroceria
      ) ||
      null,

    numero_chasis:
      normalizarMayusculas(
        body.numero_chasis
      ) ||
      null,

    numero_motor:
      normalizarMayusculas(
        body.numero_motor
      ) ||
      null,

    vin:
      normalizarMayusculas(
        body.vin
      ) ||
      null,

    numero_licencia_transito:
      normalizarMayusculas(
        body
          .numero_licencia_transito
      ) ||
      null,

    fecha_matricula:
      normalizarTexto(
        body.fecha_matricula
      ) ||
      null,

    organismo_transito:
      normalizarMayusculas(
        body
          .organismo_transito
      ) ||
      null,

    updated_at:
      ahoraISO(),
  }

  if (
    incluirEstado
  ) {
    payload.estado =
      normalizarEstado(
        body.estado ||
          ESTADO_ACTIVO
      )
  }

  return payload
}

// =========================================================
// OBTENER VEHÍCULO
// =========================================================

async function obtenerVehiculoPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'vehiculos'
      )
      .select(
        SELECT_VEHICULO
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      `No fue posible consultar el vehículo: ${error.message}`
    )
  }

  return (
    data ||
    null
  )
}

// =========================================================
// OBTENER VINCULACIÓN ACTIVA
// =========================================================

async function obtenerVinculacionActiva(
  supabase,
  vehiculoId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'vehiculos_vinculaciones'
      )
      .select(
        SELECT_VINCULACION
      )
      .eq(
        'vehiculo_id',
        vehiculoId
      )
      .eq(
        'estado',
        VINCULACION_ACTIVA
      )
      .order(
        'id',
        {
          ascending:
            false,
        }
      )
      .limit(
        1
      )

  if (error) {
    throw new Error(
      `No fue posible consultar la vinculación activa: ${error.message}`
    )
  }

  return (
    Array.isArray(
      data
    ) &&
    data.length >
      0
      ? data[0]
      : null
  )
}

// =========================================================
// CREAR VINCULACIÓN
// =========================================================

async function crearVinculacion({
  supabase,
  vehiculoId,
  fechaVinculacion,
  motivoVinculacion,
  observaciones,
  responsable,
}) {
  const vinculacionActiva =
    await obtenerVinculacionActiva(
      supabase,
      vehiculoId
    )

  if (
    vinculacionActiva
  ) {
    const error =
      new Error(
        'El vehículo ya tiene una vinculación activa.'
      )

    error.status =
      409

    error.code =
      'VINCULACION_ACTIVA_EXISTENTE'

    throw error
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'vehiculos_vinculaciones'
      )
      .insert({
        vehiculo_id:
          vehiculoId,

        fecha_vinculacion:
          fechaVinculacion,

        fecha_desvinculacion:
          null,

        estado:
          VINCULACION_ACTIVA,

        motivo_vinculacion:
          normalizarTexto(
            motivoVinculacion
          ) ||
          null,

        motivo_desvinculacion:
          null,

        observaciones:
          normalizarTexto(
            observaciones
          ) ||
          null,

        creado_por:
          responsable ||
          null,

        cerrado_por:
          null,

        closed_at:
          null,

        updated_at:
          ahoraISO(),
      })
      .select(
        SELECT_VINCULACION
      )
      .single()

  if (error) {
    throw new Error(
      `No fue posible crear la vinculación del vehículo: ${error.message}`
    )
  }

  return data
}

// =========================================================
// CERRAR VINCULACIÓN
// =========================================================

async function cerrarVinculacion({
  supabase,
  vinculacion,
  fechaDesvinculacion,
  motivoDesvinculacion,
  observaciones,
  responsable,
}) {
  if (
    !vinculacion?.id
  ) {
    return null
  }

  if (
    fechaDesvinculacion <
    vinculacion
      .fecha_vinculacion
  ) {
    const error =
      new Error(
        'La fecha de desvinculación no puede ser anterior a la fecha de vinculación.'
      )

    error.status =
      400

    error.code =
      'FECHA_DESVINCULACION_INVALIDA'

    throw error
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'vehiculos_vinculaciones'
      )
      .update({
        fecha_desvinculacion:
          fechaDesvinculacion,

        estado:
          VINCULACION_FINALIZADA,

        motivo_desvinculacion:
          normalizarTexto(
            motivoDesvinculacion
          ) ||
          null,

        observaciones:
          normalizarTexto(
            observaciones
          ) ||
          vinculacion
            .observaciones ||
          null,

        cerrado_por:
          responsable ||
          null,

        closed_at:
          ahoraISO(),

        updated_at:
          ahoraISO(),
      })
      .eq(
        'id',
        vinculacion.id
      )
      .eq(
        'estado',
        VINCULACION_ACTIVA
      )
      .select(
        SELECT_VINCULACION
      )
      .single()

  if (error) {
    throw new Error(
      `No fue posible cerrar la vinculación: ${error.message}`
    )
  }

  return data
}

// =========================================================
// RECORRIDO DE UNA JORNADA
// =========================================================

function recorridoHorario(
  horario
) {
  const inicial =
    Number(
      horario
        ?.km_inicial
    )

  const final =
    Number(
      horario
        ?.km_final
    )

  if (
    !Number.isFinite(
      inicial
    ) ||
    !Number.isFinite(
      final
    )
  ) {
    return 0
  }

  if (
    final <
    inicial
  ) {
    return 0
  }

  return (
    final -
    inicial
  )
}

// =========================================================
// RESUMEN KILOMETRAJE
// =========================================================

function crearResumenKilometraje(
  horarios,
  ultimoHorario = null
) {
  const hoy =
    hoyBogota()

  const inicio7Dias =
    sumarDias(
      hoy,
      -6
    )

  const inicio28Dias =
    sumarDias(
      hoy,
      -27
    )

  const inicioMesActual =
    inicioMes(
      hoy
    )

  const inicio6Meses =
    desplazarMeses(
      hoy,
      -5
    )

  let kmUltimos7Dias =
    0

  let kmUltimos28Dias =
    0

  let kmMesActual =
    0

  let kmUltimos6Meses =
    0

  let jornadasValidas =
    0

  for (
    const horario of
    horarios
  ) {
    const fecha =
      horario
        ?.fecha_entrada

    if (!fecha) {
      continue
    }

    const recorrido =
      recorridoHorario(
        horario
      )

    if (
      recorrido <
      0
    ) {
      continue
    }

    // Jornadas con 0 km pueden existir,
    // pero no aportan recorrido.
    if (
      Number.isFinite(
        Number(
          horario
            ?.km_inicial
        )
      ) &&
      Number.isFinite(
        Number(
          horario
            ?.km_final
        )
      ) &&
      Number(
        horario
          ?.km_final
      ) >=
        Number(
          horario
            ?.km_inicial
        )
    ) {
      jornadasValidas +=
        1
    }

    if (
      fecha >=
      inicio7Dias
    ) {
      kmUltimos7Dias +=
        recorrido
    }

    if (
      fecha >=
      inicio28Dias
    ) {
      kmUltimos28Dias +=
        recorrido
    }

    if (
      fecha >=
      inicioMesActual
    ) {
      kmMesActual +=
        recorrido
    }

    if (
      fecha >=
      inicio6Meses
    ) {
      kmUltimos6Meses +=
        recorrido
    }
  }

  return {
    km_ultimos_7_dias:
      Number(
        kmUltimos7Dias
          .toFixed(1)
      ),

    promedio_semanal_4_semanas:
      Number(
        (
          kmUltimos28Dias /
          4
        ).toFixed(1)
      ),

    km_mes_actual:
      Number(
        kmMesActual
          .toFixed(1)
      ),

    promedio_mensual_6_meses:
      Number(
        (
          kmUltimos6Meses /
          6
        ).toFixed(1)
      ),

    ultimo_kilometraje:
      ultimoHorario
        ?.km_final ??
      null,

    ultima_fecha_km:
      ultimoHorario
        ?.fecha_entrada ||
      null,

    jornadas_validas:
      jornadasValidas,

    periodo_semanal_desde:
      inicio28Dias,

    periodo_mensual_desde:
      inicio6Meses,

    calculado_hasta:
      hoy,
  }
}

// =========================================================
// AGRUPAR INSTRUCTORES
// =========================================================

function agruparInstructores(
  horarios,
  limite = 10
) {
  const mapa =
    new Map()

  for (
    const horario of
    horarios
  ) {
    const nombre =
      normalizarTexto(
        horario
          ?.nombre_completo
      )

    if (!nombre) {
      continue
    }

    const clave =
      nombre
        .toUpperCase()

    const fecha =
      horario
        ?.fecha_entrada ||
      null

    const actual =
      mapa.get(
        clave
      )

    if (!actual) {
      mapa.set(
        clave,
        {
          nombre_completo:
            nombre,

          rol:
            horario
              ?.rol ||
            'INSTRUCTOR PRÁCTICA',

          ultima_fecha:
            fecha,

          jornadas:
            1,

          clases_dictadas:
            numeroSeguro(
              horario
                ?.clases_dictadas
            ),

          num_aprendices:
            numeroSeguro(
              horario
                ?.num_aprendices
            ),

          ultimo_km:
            horario
              ?.km_final ??
            null,
        }
      )

      continue
    }

    actual.jornadas +=
      1

    actual
      .clases_dictadas +=
      numeroSeguro(
        horario
          ?.clases_dictadas
      )

    actual
      .num_aprendices +=
      numeroSeguro(
        horario
          ?.num_aprendices
      )

    if (
      fecha &&
      (
        !actual
          .ultima_fecha ||
        fecha >
          actual
            .ultima_fecha
      )
    ) {
      actual.ultima_fecha =
        fecha

      actual.rol =
        horario
          ?.rol ||
        actual.rol

      actual.ultimo_km =
        horario
          ?.km_final ??
        actual
          .ultimo_km
    }
  }

  return Array.from(
    mapa.values()
  )
    .sort(
      (
        a,
        b
      ) =>
        String(
          b.ultima_fecha ||
          ''
        ).localeCompare(
          String(
            a.ultima_fecha ||
            ''
          )
        )
    )
    .slice(
      0,
      limite
    )
}

// =========================================================
// PREOPERACIONALES NO CONFORMES
// =========================================================

function obtenerBloquesNoConformes(
  registro
) {
  const campos = [
    [
      'revision_exterior',
      'Revisión exterior',
    ],

    [
      'motor',
      'Motor',
    ],

    [
      'interior_funcionamiento',
      'Interior y funcionamiento',
    ],

    [
      'equipos_prevencion',
      'Equipos de prevención',
    ],

    [
      'documentos',
      'Documentos',
    ],
  ]

  return campos
    .filter(
      ([
        campo,
      ]) =>
        normalizarMayusculas(
          registro
            ?.[campo]
        ) ===
        'NO CONFORME'
    )
    .map(
      ([
        campo,
        label,
      ]) => ({
        campo,
        label,
      })
    )
}

function procesarPreoperacionales(
  registros
) {
  let conformes =
    0

  let noConformes =
    0

  let pendientes =
    0

  const detalleNoConformes =
    []

  for (
    const registro of
    registros
  ) {
    const bloques =
      obtenerBloquesNoConformes(
        registro
      )

    if (
      bloques.length ===
      0
    ) {
      conformes +=
        1

      continue
    }

    noConformes +=
      1

    const estado =
      normalizarMayusculas(
        registro
          ?.estado_observacion
      )

    if (
      ![
        'SOLUCIONADA',
        'SOLUCIONADO',
        'CERRADA',
        'CERRADO',
      ].includes(
        estado
      )
    ) {
      pendientes +=
        1
    }

    detalleNoConformes.push({
      id:
        registro.id,

      consecutivo:
        registro
          .consecutivo,

      fecha:
        registro
          .fecha_registro,

      hora:
        registro
          .hora_registro,

      kilometraje:
        registro
          .km_registro,

      usuario_encargado:
        registro
          .usuario_encargado,

      bloques_no_conformes:
        bloques,

      observaciones:
        registro
          .observaciones,

      estado_observacion:
        registro
          .estado_observacion,

      fecha_verificacion:
        registro
          .fecha_verificacion_observacion,

      usuario_verificacion:
        registro
          .usuario_verificacion,

      fecha_solucion:
        registro
          .fecha_solucion_observacion,

      usuario_solucion:
        registro
          .usuario_solucion,

      observacion_solucion:
        registro
          .observacion_solucion,
    })
  }

  return {
    total:
      registros.length,

    conformes,

    no_conformes:
      noConformes,

    pendientes,

    ultimas_no_conformidades:
      detalleNoConformes
        .slice(
          0,
          10
        ),
  }
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
    // LISTADO
    // =====================================================

    if (
      !recurso ||
      recurso ===
        'lista'
    ) {
      const estadoFiltro =
        normalizarTexto(
          searchParams.get(
            'estado'
          )
        )

      const busqueda =
        normalizarTexto(
          searchParams.get(
            'busqueda'
          )
        )

      let consulta =
        supabase
          .from(
            'vehiculos'
          )
          .select(
            SELECT_VEHICULO
          )

      if (
        estadoFiltro
      ) {
        consulta =
          consulta.eq(
            'estado',
            normalizarEstado(
              estadoFiltro
            )
          )
      }

      if (
        busqueda
      ) {
        consulta =
          consulta.or(
            [
              `placa.ilike.%${busqueda}%`,
              `marca.ilike.%${busqueda}%`,
              `linea.ilike.%${busqueda}%`,
              `propietario.ilike.%${busqueda}%`,
              `vin.ilike.%${busqueda}%`,
            ].join(
              ','
            )
          )
      }

      const {
        data,
        error,
      } =
        await consulta
          .order(
            'placa',
            {
              ascending:
                true,
            }
          )

      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible cargar los vehículos: ${error.message}`,
          },
          {
            status:
              500,
          }
        )
      }

      const vehiculos =
        Array.isArray(data)
          ? data
          : []

      // ===================================================
      // VIGENCIAS ACTUALES SOAT / RTM PARA EL LISTADO
      // ===================================================

      const placas =
        vehiculos
          .map((vehiculo) =>
            normalizarMayusculas(
              vehiculo.placa
            )
          )
          .filter(Boolean)

      let vigenciasPorPlaca =
        new Map()

      if (placas.length > 0) {
        const {
          data: documentos,
          error: documentosError,
        } =
          await supabase
            .from(
              'vencimientos_vehiculos'
            )
            .select(`
              id,
              placa,
              documento,
              fecha_vigencia,
              fecha_actualizacion
            `)
            .in(
              'placa',
              placas
            )
            .in(
              'documento',
              [
                'SOAT',
                'RTM',
              ]
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

        if (documentosError) {
          throw new Error(
            `No fue posible consultar las vigencias SOAT/RTM: ${documentosError.message}`
          )
        }

        for (
          const documento of
          Array.isArray(documentos)
            ? documentos
            : []
        ) {
          const placa =
            normalizarMayusculas(
              documento.placa
            )

          const tipo =
            normalizarMayusculas(
              documento.documento
            )

          const clave =
            `${placa}:${tipo}`

          // La consulta viene ordenada del registro más reciente
          // al más antiguo. Conservamos únicamente el actual.
          if (
            !vigenciasPorPlaca.has(
              clave
            )
          ) {
            vigenciasPorPlaca.set(
              clave,
              {
                fecha_vigencia:
                  documento.fecha_vigencia ||
                  null,

                estado:
                  documento.fecha_vigencia
                    ? (
                        String(
                          documento.fecha_vigencia
                        ) < hoyBogota()
                          ? 'VENCIDO'
                          : 'VIGENTE'
                      )
                    : 'SIN REGISTRO',
              }
            )
          }
        }
      }

      const vehiculosConVigencias =
        vehiculos.map(
          (vehiculo) => {
            const placa =
              normalizarMayusculas(
                vehiculo.placa
              )

            const soat =
              vigenciasPorPlaca.get(
                `${placa}:SOAT`
              ) ||
              {
                fecha_vigencia: null,
                estado: 'SIN REGISTRO',
              }

            const rtm =
              vigenciasPorPlaca.get(
                `${placa}:RTM`
              ) ||
              {
                fecha_vigencia: null,
                estado: 'SIN REGISTRO',
              }

            return {
              ...vehiculo,
              soat,
              rtm,
            }
          }
        )

      return NextResponse.json({
        status:
          'success',

        vehiculos:
          vehiculosConVigencias,
      })
    }

    // =====================================================
    // DETALLE
    // =====================================================

    if (
      recurso ===
      'detalle'
    ) {
      const id =
        Number(
          searchParams.get(
            'id'
          )
        )

      if (
        !Number.isInteger(
          id
        ) ||
        id <=
          0
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El ID del vehículo no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      const vehiculo =
        await obtenerVehiculoPorId(
          supabase,
          id
        )

      if (!vehiculo) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El vehículo no existe.',
          },
          {
            status:
              404,
          }
        )
      }

      const vinculacionActiva =
        await obtenerVinculacionActiva(
          supabase,
          id
        )

      return NextResponse.json({
        status:
          'success',

        vehiculo,

        vinculacion_activa:
          vinculacionActiva,
      })
    }

    // =====================================================
    // HISTORIAL VINCULACIONES
    // =====================================================

    if (
      recurso ===
      'vinculaciones'
    ) {
      const id =
        Number(
          searchParams.get(
            'id'
          ) ||
          searchParams.get(
            'vehiculo_id'
          )
        )

      if (
        !Number.isInteger(
          id
        ) ||
        id <=
          0
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El vehículo no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      const vehiculo =
        await obtenerVehiculoPorId(
          supabase,
          id
        )

      if (!vehiculo) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El vehículo no existe.',
          },
          {
            status:
              404,
          }
        )
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'vehiculos_vinculaciones'
          )
          .select(
            SELECT_VINCULACION
          )
          .eq(
            'vehiculo_id',
            id
          )
          .order(
            'fecha_vinculacion',
            {
              ascending:
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
              `No fue posible cargar las vinculaciones: ${error.message}`,
          },
          {
            status:
              500,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        vehiculo,

        vinculaciones:
          Array.isArray(
            data
          )
            ? data
            : [],
      })
    }

    // =====================================================
    // RESUMEN OPERATIVO
    // =====================================================

    if (
      recurso ===
      'resumen_operativo'
    ) {
      const id =
        Number(
          searchParams.get(
            'id'
          ) ||
          searchParams.get(
            'vehiculo_id'
          )
        )

      if (
        !Number.isInteger(
          id
        ) ||
        id <=
          0
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El vehículo no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      const vehiculo =
        await obtenerVehiculoPorId(
          supabase,
          id
        )

      if (!vehiculo) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El vehículo no existe.',
          },
          {
            status:
              404,
          }
        )
      }

      const placa =
        normalizarTexto(
          vehiculo.placa
        )

      if (!placa) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El vehículo no tiene placa registrada.',
          },
          {
            status:
              400,
          }
        )
      }

      const hoy =
        hoyBogota()

      const desde6Meses =
        desplazarMeses(
          hoy,
          -5
        )

        const desdeInstructores =
          restarDias(
            hoy,
            89
          )
      // ===================================================
      // CONSULTAS PARALELAS
      // ===================================================

      const [
        horariosResult,
        ultimoKmResult,
        mantenimientosResult,
        fallasResult,
        preoperacionalesResult,
        siniestrosResult,
      ] =
        await Promise.all([
          // -----------------------------------------------
          // HORARIOS ÚLTIMOS 6 MESES
          // -----------------------------------------------

          supabase
            .from(
              'horarios'
            )
            .select(`
              id,
              timestamp_entrada,
              fecha_entrada,
              hora_entrada,
              timestamp_salida,
              fecha_salida,
              hora_salida,
              usuario,
              nombre_completo,
              rol,
              placa,
              km_inicial,
              km_final,
              clases_programadas,
              clases_dictadas,
              num_aprendices,
              duracion_jornada,
              estado_registro
            `)
            .eq(
              'placa',
              placa
            )
            .gte(
              'fecha_entrada',
              desde6Meses
            )
            .not(
              'km_final',
              'is',
              null
            )
            .order(
              'fecha_entrada',
              {
                ascending:
                  false,
              }
            )
            .order(
              'timestamp_entrada',
              {
                ascending:
                  false,
              }
            ),

          // -----------------------------------------------
          // ÚLTIMO KILOMETRAJE
          // -----------------------------------------------

          supabase
            .from(
              'horarios'
            )
            .select(`
              id,
              fecha_entrada,
              timestamp_entrada,
              km_final
            `)
            .eq(
              'placa',
              placa
            )
            .not(
              'km_final',
              'is',
              null
            )
            .order(
              'fecha_entrada',
              {
                ascending:
                  false,
              }
            )
            .order(
              'timestamp_entrada',
              {
                ascending:
                  false,
              }
            )
            .limit(
              1
            ),

          // -----------------------------------------------
          // MANTENIMIENTOS
          // -----------------------------------------------

          supabase
            .from(
              'mantenimientos'
            )
            .select(`
              id,
              timestamp_registro,
              fecha_registro,
              placa,
              kilometraje,
              tipo_mantenimiento,
              actividad_realizada,
              repuestos_utilizados,
              empresa,
              nombres_tecnico,
              tiempoparada,
              factura,
              costo_total,
              responsable,
              observaciones
            `)
            .eq(
              'placa',
              placa
            )
            .order(
              'fecha_registro',
              {
                ascending:
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
            .limit(
              10
            ),

          // -----------------------------------------------
          // REPORTE DE FALLAS
          // -----------------------------------------------

          supabase
            .from(
              'reporte_fallas'
            )
            .select(`
              id,
              consecutivo,
              fecha,
              hora,
              placa,
              tipo_vehiculo,
              marca,
              kilometraje,
              nombre_encargado,
              descripcion_falla,
              acciones_tomadas,
              estado,
              observaciones_seguimiento,
              fecha_verificacion,
              fecha_solucion,
              usuario_soluciona
            `)
            .eq(
              'placa',
              placa
            )
            .order(
              'fecha',
              {
                ascending:
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
            .limit(
              10
            ),

          // -----------------------------------------------
          // PREOPERACIONALES
          // -----------------------------------------------

          supabase
            .from(
              'preoperacionales'
            )
            .select(`
              id,
              consecutivo,
              timestamp_registro,
              fecha_registro,
              hora_registro,
              placa,
              tipo_vehiculo,
              marca,
              km_registro,
              usuario_encargado,
              revision_exterior,
              motor,
              interior_funcionamiento,
              equipos_prevencion,
              documentos,
              observaciones,
              estado_observacion,
              fecha_verificacion_observacion,
              usuario_verificacion,
              fecha_solucion_observacion,
              usuario_solucion,
              observacion_solucion
            `)
            .eq(
              'placa',
              placa
            )
            .order(
              'fecha_registro',
              {
                ascending:
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
            .limit(
              500
            ),

          // -----------------------------------------------
          // SINIESTROS
          // -----------------------------------------------

          supabase
            .from(
              'siniestros'
            )
            .select(`
              id,
              consecutivo,
              timestamp_registro,
              fecha_siniestro,
              tipo_siniestro,
              num_personas_involucradas,
              heridos_leves,
              heridos_graves,
              fatalidades,
              placa,
              nombre_conductor_implicado,
              documento,
              resumen,
              estado_analisis,
              numero_ipat,
              autoridad,
              fecha_estado_en_analisis,
              fecha_estado_cerrado,
              nombre_usuario_cerrado,
              resumen_analisis
            `)
            .eq(
              'placa',
              placa
            )
            .order(
              'fecha_siniestro',
              {
                ascending:
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
            .limit(
              10
            ),
        ])

      // ===================================================
      // VALIDAR ERRORES
      // ===================================================

      const errores = [
        [
          'horarios',
          horariosResult
            .error,
        ],
        [
          'último kilometraje',
          ultimoKmResult
            .error,
        ],
        [
          'mantenimientos',
          mantenimientosResult
            .error,
        ],
        [
          'reporte de fallas',
          fallasResult
            .error,
        ],
        [
          'preoperacionales',
          preoperacionalesResult
            .error,
        ],
        [
          'siniestros',
          siniestrosResult
            .error,
        ],
      ]

      const errorConsulta =
        errores.find(
          ([
            ,
            error,
          ]) =>
            Boolean(
              error
            )
        )

      if (
        errorConsulta
      ) {
        const [
          modulo,
          error,
        ] =
          errorConsulta

        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible cargar ${modulo}: ${error.message}`,
          },
          {
            status:
              500,
          }
        )
      }

      const horarios =
        Array.isArray(
          horariosResult
            .data
        )
          ? horariosResult
              .data
          : []

      const ultimoHorario =
        Array.isArray(
          ultimoKmResult
            .data
        ) &&
        ultimoKmResult
          .data
          .length >
          0
          ? ultimoKmResult
              .data[0]
          : null

      const kilometraje =
        crearResumenKilometraje(
          horarios,
          ultimoHorario
        )

      const horariosInstructores =
      horarios.filter(
        (horario) =>
          horario?.fecha_entrada &&
          horario.fecha_entrada >= desdeInstructores &&
          horario.fecha_entrada <= hoy
      )

      const instructores =
        agruparInstructores(
          horariosInstructores,
          10
        )

      const mantenimientos =
        Array.isArray(
          mantenimientosResult
            .data
        )
          ? mantenimientosResult
              .data
          : []

      const fallas =
        Array.isArray(
          fallasResult
            .data
        )
          ? fallasResult
              .data
          : []

      const preoperacionales =
        procesarPreoperacionales(
          Array.isArray(
            preoperacionalesResult
              .data
          )
            ? preoperacionalesResult
                .data
            : []
        )

      const siniestros =
        Array.isArray(
          siniestrosResult
            .data
        )
          ? siniestrosResult
              .data
          : []

      const fallasAbiertas =
        fallas.filter(
          (
            falla
          ) => {
            const estado =
              normalizarMayusculas(
                falla.estado
              )

            return ![
              'CERRADA',
              'CERRADO',
              'SOLUCIONADA',
              'SOLUCIONADO',
            ].includes(
              estado
            )
          }
        ).length

      const siniestrosAbiertos =
        siniestros.filter(
          (
            siniestro
          ) => {
            const estado =
              normalizarMayusculas(
                siniestro
                  .estado_analisis
              )

            return ![
              'CERRADO',
              'CERRADA',
            ].includes(
              estado
            )
          }
        ).length

      return NextResponse.json({
        status:
          'success',

        vehiculo: {
          id:
            vehiculo.id,

          placa:
            vehiculo.placa,

          tipo_vehiculo:
            vehiculo
              .tipo_vehiculo,

          marca:
            vehiculo.marca,
        },

        kilometraje,

        instructores_recientes:
          instructores,

        periodo_instructores: {
          dias:
            90,

          desde:
            desdeInstructores,

          hasta:
            hoy,
        },

        mantenimientos: {
          total_mostrados:
            mantenimientos
              .length,

          ultimos:
            mantenimientos,
        },

        fallas: {
          total_mostradas:
            fallas.length,

          abiertas:
            fallasAbiertas,

          ultimas:
            fallas,
        },

        preoperacionales,

        siniestros: {
          total_mostrados:
            siniestros
              .length,

          abiertos:
            siniestrosAbiertos,

          ultimos:
            siniestros,
        },
      })
    }

    // =====================================================
    // INSTRUCTORES RECIENTES
    // Compatibilidad con la versión anterior de la página
    // =====================================================

    if (
      recurso ===
      'instructores_recientes'
    ) {
      const id =
        Number(
          searchParams.get(
            'id'
          ) ||
          searchParams.get(
            'vehiculo_id'
          )
        )

      const limiteSolicitado =
        Number(
          searchParams.get(
            'limite'
          ) ||
          10
        )

      const limite =
        Number.isInteger(
          limiteSolicitado
        ) &&
        limiteSolicitado >
          0
          ? Math.min(
              limiteSolicitado,
              50
            )
          : 10

      if (
        !Number.isInteger(
          id
        ) ||
        id <=
          0
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El vehículo no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      const vehiculo =
        await obtenerVehiculoPorId(
          supabase,
          id
        )

      if (!vehiculo) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El vehículo no existe.',
          },
          {
            status:
              404,
          }
        )
      }

      const hoy =
      hoyBogota()

      const desde =
        restarDias(
          hoy,
          89
        )

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'horarios'
          )
          .select(`
            id,
            fecha_entrada,
            nombre_completo,
            rol,
            placa,
            km_inicial,
            km_final,
            clases_dictadas,
            num_aprendices,
            estado_registro
          `)
          .eq(
            'placa',
            vehiculo.placa
          )
          .gte(
            'fecha_entrada',
            desde
          )
          .lte(
            'fecha_entrada',
            hoy
          )
          .order(
            'fecha_entrada',
            {
              ascending:
                false,
            }
          )
          .limit(
            500
          )

      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible cargar los instructores recientes: ${error.message}`,
          },
          {
            status:
              500,
          }
        )
      }

      return NextResponse.json({
      status:
        'success',

      periodo: {
        dias:
          90,

        desde,

        hasta:
          hoy,
      },

      instructores:
        agruparInstructores(
          Array.isArray(
            data
          )
            ? data
            : [],
          limite
        ),
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
      'Error GET /api/vehiculos:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// =========================================================
// POST
// CREAR VEHÍCULO
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
        body.accion
      )

    if (
      accion !==
      'crear'
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'Acción no válida.',
        },
        {
          status:
            400,
        }
      )
    }

    const responsable =
      obtenerNombreResponsable(
        body
      )

    const payload =
      construirPayloadVehiculo(
        body
      )

    const mensajeValidacion =
      validarVehiculo({
        placa:
          payload.placa,

        tipoVehiculo:
          payload
            .tipo_vehiculo,

        marca:
          payload.marca,

        estado:
          payload.estado,

        clasificacion:
          payload
            .clasificacion,

        origen:
          payload.origen,

        gps:
          payload.gps,

        fechaAdquisicion:
          payload
            .fecha_adquisicion,

        fechaMatricula:
          payload
            .fecha_matricula,
      })

    if (
      mensajeValidacion
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            mensajeValidacion,
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // PLACA ÚNICA
    // =====================================================

    const {
      data:
        existente,
      error:
        existenteError,
    } =
      await supabase
        .from(
          'vehiculos'
        )
        .select(`
          id,
          placa,
          estado
        `)
        .eq(
          'placa',
          payload.placa
        )
        .maybeSingle()

    if (
      existenteError
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `No fue posible validar la placa: ${existenteError.message}`,
        },
        {
          status:
            500,
        }
      )
    }

    if (
      existente
    ) {
      return NextResponse.json(
        {
          status:
            'warning',

          message:
            `El vehículo ${payload.placa} ya se encuentra registrado.`,

          vehiculo:
            existente,
        },
        {
          status:
            409,
        }
      )
    }

    // =====================================================
    // INSERT VEHÍCULO
    // =====================================================

    const {
      data:
        nuevoVehiculo,
      error:
        vehiculoError,
    } =
      await supabase
        .from(
          'vehiculos'
        )
        .insert({
          ...payload,

          created_at:
            ahoraISO(),
        })
        .select(
          SELECT_VEHICULO
        )
        .single()

    if (
      vehiculoError
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `No fue posible registrar el vehículo: ${vehiculoError.message}`,
        },
        {
          status:
            500,
        }
      )
    }

    // =====================================================
    // PRIMERA VINCULACIÓN
    // =====================================================

    let vinculacion =
      null

    if (
      payload.estado ===
      ESTADO_ACTIVO
    ) {
      try {
        vinculacion =
          await crearVinculacion({
            supabase,

            vehiculoId:
              nuevoVehiculo.id,

            fechaVinculacion:
              normalizarTexto(
                body
                  .fecha_vinculacion
              ) ||
              payload
                .fecha_adquisicion ||
              hoyBogota(),

            motivoVinculacion:
              body
                .motivo_vinculacion ||
              'REGISTRO INICIAL DEL VEHÍCULO',

            observaciones:
              body
                .observaciones_vinculacion,

            responsable,
          })
      } catch (error) {
        await supabase
          .from(
            'vehiculos'
          )
          .delete()
          .eq(
            'id',
            nuevoVehiculo.id
          )

        throw error
      }
    }

    return NextResponse.json(
      {
        status:
          'success',

        message:
          payload.estado ===
          ESTADO_ACTIVO
            ? 'Vehículo registrado y vinculado correctamente.'
            : 'Vehículo registrado correctamente como inactivo.',

        vehiculo:
          nuevoVehiculo,

        vinculacion,
      },
      {
        status:
          201,
      }
    )
  } catch (error) {
    console.error(
      'Error POST /api/vehiculos:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// =========================================================
// PATCH
//
// editar
// inactivar
// activar
// =========================================================

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
      normalizarTexto(
        body.accion
      )

    const id =
      Number(
        body.id
      )

    const responsable =
      obtenerNombreResponsable(
        body
      )

    if (
      !Number.isInteger(
        id
      ) ||
      id <=
        0
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El ID del vehículo no es válido.',
        },
        {
          status:
            400,
        }
      )
    }

    const vehiculoActual =
      await obtenerVehiculoPorId(
        supabase,
        id
      )

    if (
      !vehiculoActual
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El vehículo no existe.',
        },
        {
          status:
            404,
        }
      )
    }

    // =====================================================
    // EDITAR DATOS MAESTROS
    // =====================================================

    if (
      accion ===
      'editar'
    ) {
      const payload =
        construirPayloadVehiculo(
          body,
          {
            incluirEstado:
              false,
          }
        )

      const mensajeValidacion =
        validarVehiculo({
          placa:
            payload.placa,

          tipoVehiculo:
            payload
              .tipo_vehiculo,

          marca:
            payload.marca,

          estado:
            normalizarEstado(
              vehiculoActual
                .estado
            ),

          clasificacion:
            payload
              .clasificacion,

          origen:
            payload.origen,

          gps:
            payload.gps,

          fechaAdquisicion:
            payload
              .fecha_adquisicion,

          fechaMatricula:
            payload
              .fecha_matricula,
        })

      if (
        mensajeValidacion
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              mensajeValidacion,
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // PROTEGER PLACA DUPLICADA
      // ===================================================

      if (
        payload.placa !==
        normalizarMayusculas(
          vehiculoActual
            .placa
        )
      ) {
        const {
          data:
            placaExistente,
          error:
            placaError,
        } =
          await supabase
            .from(
              'vehiculos'
            )
            .select(
              'id'
            )
            .eq(
              'placa',
              payload.placa
            )
            .neq(
              'id',
              id
            )
            .maybeSingle()

        if (
          placaError
        ) {
          return NextResponse.json(
            {
              status:
                'failed',

              message:
                `No fue posible validar la placa: ${placaError.message}`,
            },
            {
              status:
                500,
            }
          )
        }

        if (
          placaExistente
        ) {
          return NextResponse.json(
            {
              status:
                'warning',

              message:
                `Ya existe otro vehículo registrado con la placa ${payload.placa}.`,
            },
            {
              status:
                409,
            }
          )
        }
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'vehiculos'
          )
          .update(
            payload
          )
          .eq(
            'id',
            id
          )
          .select(
            SELECT_VEHICULO
          )
          .single()

      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible actualizar el vehículo: ${error.message}`,
          },
          {
            status:
              500,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          'Datos maestros del vehículo actualizados correctamente.',

        vehiculo:
          data,
      })
    }

    // =====================================================
    // INACTIVAR
    // =====================================================

    if (
      accion ===
      'inactivar'
    ) {
      const estadoActual =
        normalizarMinusculas(
          vehiculoActual
            .estado
        )

      if (
        estadoActual ===
        'inactivo'
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              'El vehículo ya se encuentra inactivo.',
          },
          {
            status:
              409,
          }
        )
      }

      const fechaDesvinculacion =
        normalizarTexto(
          body
            .fecha_desvinculacion
        ) ||
        hoyBogota()

      if (
        !fechaValida(
          fechaDesvinculacion
        )
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'La fecha de desvinculación no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      const vinculacionActiva =
        await obtenerVinculacionActiva(
          supabase,
          id
        )

      let vinculacionCerrada =
        null

      if (
        vinculacionActiva
      ) {
        vinculacionCerrada =
          await cerrarVinculacion({
            supabase,

            vinculacion:
              vinculacionActiva,

            fechaDesvinculacion,

            motivoDesvinculacion:
              body
                .motivo_desvinculacion ||
              'INACTIVACIÓN DEL VEHÍCULO',

            observaciones:
              body
                .observaciones_vinculacion,

            responsable,
          })
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'vehiculos'
          )
          .update({
            estado:
              ESTADO_INACTIVO,

            updated_at:
              ahoraISO(),
          })
          .eq(
            'id',
            id
          )
          .select(
            SELECT_VEHICULO
          )
          .single()

      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `La vinculación fue procesada, pero no fue posible actualizar el estado del vehículo: ${error.message}`,
          },
          {
            status:
              500,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          vinculacionCerrada
            ? `El vehículo ${data.placa} fue inactivado y su vinculación fue finalizada correctamente.`
            : `El vehículo ${data.placa} fue inactivado. No existía una vinculación activa previa para cerrar.`,

        vehiculo:
          data,

        vinculacion:
          vinculacionCerrada,
      })
    }

    // =====================================================
    // ACTIVAR / REACTIVAR
    // =====================================================

    if (
      accion ===
      'activar'
    ) {
      const estadoActual =
        normalizarMinusculas(
          vehiculoActual
            .estado
        )

      if (
        estadoActual ===
        'activo'
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              'El vehículo ya se encuentra activo.',
          },
          {
            status:
              409,
          }
        )
      }

      const fechaVinculacion =
        normalizarTexto(
          body
            .fecha_vinculacion
        ) ||
        hoyBogota()

      if (
        !fechaValida(
          fechaVinculacion
        )
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'La fecha de vinculación no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      const vinculacionExistente =
        await obtenerVinculacionActiva(
          supabase,
          id
        )

      if (
        vinculacionExistente
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              'El vehículo ya tiene una vinculación activa. Revise el historial antes de continuar.',

            vinculacion:
              vinculacionExistente,
          },
          {
            status:
              409,
          }
        )
      }

      const nuevaVinculacion =
        await crearVinculacion({
          supabase,

          vehiculoId:
            id,

          fechaVinculacion,

          motivoVinculacion:
            body
              .motivo_vinculacion ||
            'REACTIVACIÓN / NUEVA VINCULACIÓN AL CEA',

          observaciones:
            body
              .observaciones_vinculacion,

          responsable,
        })

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'vehiculos'
          )
          .update({
            estado:
              ESTADO_ACTIVO,

            updated_at:
              ahoraISO(),
          })
          .eq(
            'id',
            id
          )
          .select(
            SELECT_VEHICULO
          )
          .single()

      if (error) {
        await supabase
          .from(
            'vehiculos_vinculaciones'
          )
          .delete()
          .eq(
            'id',
            nuevaVinculacion
              .id
          )

        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible activar el vehículo: ${error.message}`,
          },
          {
            status:
              500,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        message:
          `El vehículo ${data.placa} fue reactivado y se creó una nueva vinculación correctamente.`,

        requiere_revision_documental:
          true,

        requiere_tarjeta_servicio:
          true,

        mensaje_documental:
          'Registre la Tarjeta de Servicio correspondiente a esta nueva vinculación y verifique la vigencia actual de SOAT y RTM.',

        vehiculo:
          data,

        vinculacion:
          nuevaVinculacion,
      })
    }

    // =====================================================
    // ACCIÓN NO VÁLIDA
    // =====================================================

    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'Acción no válida.',
      },
      {
        status:
          400,
      }
    )
  } catch (error) {
    console.error(
      'Error PATCH /api/vehiculos:',
      error
    )

    return respuestaError(
      error
    )
  }
}