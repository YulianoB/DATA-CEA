// app/api/admin/consultas/kilometros/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const ESTADO_ABIERTO =
  'ABIERTO'

const ESTADO_CERRADO =
  'CERRADO'

const ESTADO_NO_CERRADO =
  'NO CERRADO'

const TAMANO_PAGINA_INTERNA =
  1000

const ORDEN_TIPOS = [
  'AUTOMOVIL',
  'CAMIONETA',
  'MOTOCICLETA',
  'CAMION',
]

// =========================================================
// SELECTS
// =========================================================

const SELECT_VEHICULO = `
  id,
  placa,
  tipo_vehiculo,
  marca,
  linea,
  modelo,
  estado
`

const SELECT_HORARIO = `
  id,
  placa,
  fecha_entrada,
  hora_entrada,
  fecha_salida,
  km_inicial,
  km_final,
  estado_registro
`

const SELECT_PREOPERACIONAL = `
  id,
  placa,
  fecha_registro,
  hora_registro,
  km_registro
`

// =========================================================
// ERROR MULTIEMPRESA
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

// =========================================================
// HELPERS BÁSICOS
// =========================================================

function normalizarTexto(valor) {
  return String(
    valor ?? ''
  ).trim()
}

function normalizarMayusculas(valor) {
  return normalizarTexto(
    valor
  )
    .toUpperCase()
}

function normalizarSinAcentos(valor) {
  return normalizarMayusculas(
    valor
  )
    .normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
}

function numeroSeguro(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
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

function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(
      fecha ||
      ''
    )
  )
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
    return (
      'Debe seleccionar fecha inicial y fecha final.'
    )
  }

  if (
    !fechaValida(
      fechaInicio
    ) ||
    !fechaValida(
      fechaFin
    )
  ) {
    return (
      'El rango de fechas no es válido.'
    )
  }

  if (
    fechaFin <
    fechaInicio
  ) {
    return (
      'La fecha final no puede ser anterior a la fecha inicial.'
    )
  }

  const hoy =
    hoyBogota()

  if (
    fechaInicio >
      hoy ||
    fechaFin >
      hoy
  ) {
    return (
      'No se permiten fechas futuras.'
    )
  }

  return ''
}

// =========================================================
// NORMALIZAR ESTADO HORARIO
// =========================================================

function normalizarEstadoHorario(
  valor
) {
  const estado =
    normalizarSinAcentos(
      valor
    )

  if (
    estado ===
    'ABIERTO'
  ) {
    return ESTADO_ABIERTO
  }

  if (
    estado ===
    'CERRADO'
  ) {
    return ESTADO_CERRADO
  }

  if (
    estado ===
      'NO CERRADO' ||
    estado ===
      'NOCERRADO'
  ) {
    return ESTADO_NO_CERRADO
  }

  return normalizarMayusculas(
    valor
  )
}

// =========================================================
// NORMALIZAR TIPO DE VEHÍCULO
// =========================================================

function normalizarTipoVehiculo(
  valor
) {
  const tipo =
    normalizarSinAcentos(
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

  if (
    tipo ===
      'AUTOMOVIL' ||
    tipo ===
      'AUTO'
  ) {
    return 'AUTOMOVIL'
  }

  if (
    tipo ===
    'CAMIONETA'
  ) {
    return 'CAMIONETA'
  }

  if (
    tipo ===
      'MOTOCICLETA' ||
    tipo ===
      'MOTO'
  ) {
    return 'MOTOCICLETA'
  }

  if (
    tipo ===
    'CAMION'
  ) {
    return 'CAMION'
  }

  return tipo ||
    'OTROS'
}

// =========================================================
// NOMBRE VISUAL DEL TIPO
// =========================================================

function nombreTipoVehiculo(
  tipo
) {
  switch (
    normalizarTipoVehiculo(
      tipo
    )
  ) {
    case 'AUTOMOVIL':
      return 'Automóvil'

    case 'CAMIONETA':
      return 'Camioneta'

    case 'MOTOCICLETA':
      return 'Motocicleta'

    case 'CAMION':
      return 'Camión'

    default:
      return 'Otros'
  }
}

// =========================================================
// ORDEN DEL TIPO
// =========================================================

function indiceTipoVehiculo(
  tipo
) {
  const normalizado =
    normalizarTipoVehiculo(
      tipo
    )

  const indice =
    ORDEN_TIPOS.indexOf(
      normalizado
    )

  return indice >= 0
    ? indice
    : ORDEN_TIPOS.length
}

// =========================================================
// CONSULTAR TODAS LAS FILAS PAGINANDO INTERNAMENTE
// =========================================================
//
// Supabase/PostgREST suele devolver un máximo limitado
// por consulta.
//
// Este helper permite recuperar históricos grandes sin
// depender de una sola respuesta.
//
// =========================================================

async function consultarTodo(
  crearConsulta
) {
  const resultados =
    []

  let desde =
    0

  while (true) {
    const hasta =
      desde +
      TAMANO_PAGINA_INTERNA -
      1

    const consulta =
      crearConsulta()
        .range(
          desde,
          hasta
        )

    const {
      data,
      error,
    } =
      await consulta

    if (error) {
      throw error
    }

    const filas =
      Array.isArray(
        data
      )
        ? data
        : []

    resultados.push(
      ...filas
    )

    if (
      filas.length <
      TAMANO_PAGINA_INTERNA
    ) {
      break
    }

    desde +=
      TAMANO_PAGINA_INTERNA
  }

  return resultados
}

// =========================================================
// CATÁLOGO MAESTRO DE VEHÍCULOS
// =========================================================
//
// Se cargan ACTIVOS e INACTIVOS.
//
// La consulta de kilómetros es histórica y debe permitir
// consultar un vehículo que hoy se encuentre inactivo.
//
// =========================================================

async function obtenerVehiculos(
  supabase
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
      .order(
        'tipo_vehiculo',
        {
          ascending:
            true,
        }
      )
      .order(
        'placa',
        {
          ascending:
            true,
        }
      )

  if (error) {
    throw new Error(
      `No fue posible cargar los vehículos: ${error.message}`
    )
  }

  return (
    Array.isArray(
      data
    )
      ? data
      : []
  )
    .map(
      (vehiculo) => ({
        id:
          vehiculo.id,

        placa:
          normalizarMayusculas(
            vehiculo.placa
          ),

        tipo_vehiculo:
          normalizarTipoVehiculo(
            vehiculo.tipo_vehiculo
          ),

        tipo_vehiculo_nombre:
          nombreTipoVehiculo(
            vehiculo.tipo_vehiculo
          ),

        marca:
          normalizarTexto(
            vehiculo.marca
          ),

        linea:
          normalizarTexto(
            vehiculo.linea
          ),

        modelo:
          normalizarTexto(
            vehiculo.modelo
          ),

        estado:
          normalizarMayusculas(
            vehiculo.estado
          ),
      })
    )
    .filter(
      (vehiculo) =>
        Boolean(
          vehiculo.placa
        )
    )
    .sort(
      (
        a,
        b
      ) => {
        const ordenTipo =
          indiceTipoVehiculo(
            a.tipo_vehiculo
          ) -
          indiceTipoVehiculo(
            b.tipo_vehiculo
          )

        if (
          ordenTipo !==
          0
        ) {
          return ordenTipo
        }

        return a.placa.localeCompare(
          b.placa,
          'es'
        )
      }
    )
}

// =========================================================
// CONSULTAR HORARIOS DEL PERÍODO
// =========================================================

async function consultarHorarios({
  supabase,
  fechaInicio,
  fechaFin,
  placa = '',
}) {
  try {
    return await consultarTodo(
      () => {
        let consulta =
          supabase
            .from(
              'horarios'
            )
            .select(
              SELECT_HORARIO
            )
            .gte(
              'fecha_entrada',
              fechaInicio
            )
            .lte(
              'fecha_entrada',
              fechaFin
            )
            .order(
              'fecha_entrada',
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
          placa
        ) {
          consulta =
            consulta.eq(
              'placa',
              placa
            )
        }

        return consulta
      }
    )
  } catch (error) {
    throw new Error(
      `No fue posible consultar los horarios: ${error.message}`
    )
  }
}

// =========================================================
// CONSULTAR PREOPERACIONALES DEL PERÍODO
// =========================================================

async function consultarPreoperacionales({
  supabase,
  fechaInicio,
  fechaFin,
  placa = '',
}) {
  try {
    return await consultarTodo(
      () => {
        let consulta =
          supabase
            .from(
              'preoperacionales'
            )
            .select(
              SELECT_PREOPERACIONAL
            )
            .gte(
              'fecha_registro',
              fechaInicio
            )
            .lte(
              'fecha_registro',
              fechaFin
            )
            .order(
              'fecha_registro',
              {
                ascending:
                  true,
              }
            )
            .order(
              'hora_registro',
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
          placa
        ) {
          consulta =
            consulta.eq(
              'placa',
              placa
            )
        }

        return consulta
      }
    )
  } catch (error) {
    throw new Error(
      `No fue posible consultar los preoperacionales: ${error.message}`
    )
  }
}

// =========================================================
// ÚLTIMA LECTURA PREOPERACIONAL ANTERIOR
// =========================================================
//
// Para calcular correctamente el primer incremento dentro
// del rango:
//
// 31/07 -> 50.000 km
// 02/08 -> 50.150 km
//
// consulta desde 01/08:
//
// primer incremento = 150 km
//
// =========================================================

async function obtenerLecturaAnterior({
  supabase,
  placa,
  fechaInicio,
}) {
  if (
    !placa
  ) {
    return null
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'preoperacionales'
      )
      .select(
        SELECT_PREOPERACIONAL
      )
      .eq(
        'placa',
        placa
      )
      .lt(
        'fecha_registro',
        fechaInicio
      )
      .not(
        'km_registro',
        'is',
        null
      )
      .order(
        'fecha_registro',
        {
          ascending:
            false,
        }
      )
      .order(
        'hora_registro',
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
        1
      )

  if (error) {
    throw new Error(
      `No fue posible consultar la lectura anterior de ${placa}: ${error.message}`
    )
  }

  return (
    Array.isArray(
      data
    ) &&
    data.length > 0
      ? data[0]
      : null
  )
}

// =========================================================
// AGRUPAR POR PLACA
// =========================================================

function agruparPorPlaca(
  registros
) {
  const mapa =
    new Map()

  for (
    const registro of
      registros || []
  ) {
    const placa =
      normalizarMayusculas(
        registro?.placa
      )

    if (
      !placa
    ) {
      continue
    }

    if (
      !mapa.has(
        placa
      )
    ) {
      mapa.set(
        placa,
        []
      )
    }

    mapa.get(
      placa
    ).push(
      registro
    )
  }

  return mapa
}

// Estimación de jornadas sin lectura final. Se utiliza exclusivamente
// la primera lectura posterior (no se salta una lectura regresiva).
// Las horas se interpretan como hora local de Colombia (UTC-5).
const VENTANA_ESTIMACION_MS = 48 * 60 * 60 * 1000
function instanteLectura(fecha, hora = '00:00:00') {
  if (!fecha) return NaN
  const horaNormalizada = String(hora || '00:00:00').slice(0, 8)
  const instante = Date.parse(`${fecha}T${horaNormalizada.padEnd(8, '0')}-05:00`)
  return Number.isFinite(instante) ? instante : NaN
}
function lecturasPosteriores(horarios, preoperacionales) {
  const lecturas = []
  for (const registro of horarios || []) {
    const km = numeroSeguro(registro?.km_inicial)
    const instante = instanteLectura(registro?.fecha_entrada, registro?.hora_entrada)
    if (km !== null && Number.isFinite(instante)) {
      lecturas.push({ fuente: 'HORARIOS', id: registro.id, instante, km })
    }
  }
  for (const registro of preoperacionales || []) {
    const km = numeroSeguro(registro?.km_registro)
    const instante = instanteLectura(registro?.fecha_registro, registro?.hora_registro)
    if (km !== null && Number.isFinite(instante)) {
      lecturas.push({ fuente: 'PREOPERACIONALES', id: registro.id, instante, km })
    }
  }
  return lecturas.sort((a, b) => a.instante - b.instante || (a.fuente === 'HORARIOS' ? -1 : 1))
}

// =========================================================
// PROCESAR HORARIOS
// =========================================================

function procesarHorarios(
  registros,
  referencias = []
) {
  let kilometros =
    0

  let kilometrosEstimados = 0
  let jornadasEstimadas = 0
  let jornadasPendientes = 0
  const intervalosEstimados = new Set()

  let cerradas =
    0

  let abiertas =
    0

  let noCerradas =
    0

  let sinKilometraje =
    0

  let kilometrajeInvalido =
    0

  const detalleCalidad =
    []

  for (
    const registro of
      registros || []
  ) {
    const estado =
      normalizarEstadoHorario(
        registro?.estado_registro
      )

    const kmInicial =
      numeroSeguro(
        registro?.km_inicial
      )

    const kmFinal =
      numeroSeguro(
        registro?.km_final
      )

    // =====================================================
    // ESTADO
    // =====================================================

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

    // Para jornadas sin km_final, la lectura posterior más próxima
    // permite una estimación; no se modifica la jornada original.
    if (kmInicial !== null && kmFinal === null) {
      const inicio = instanteLectura(registro.fecha_entrada, registro.hora_entrada)
      const siguiente = referencias.find((lectura) =>
        Number.isFinite(inicio) &&
        lectura.instante > inicio &&
        lectura.instante - inicio <= VENTANA_ESTIMACION_MS &&
        !(lectura.fuente === 'HORARIOS' && lectura.id === registro.id)
      )
      const claveIntervalo = siguiente
        ? `${inicio}|${kmInicial}|${siguiente.instante}|${siguiente.km}`
        : null
      if (siguiente && siguiente.km >= kmInicial && !intervalosEstimados.has(claveIntervalo)) {
        intervalosEstimados.add(claveIntervalo)
        const estimado = siguiente.km - kmInicial
        kilometros += estimado
        kilometrosEstimados += estimado
        jornadasEstimadas += 1
        detalleCalidad.push({
          tipo: 'HORARIO_KM_ESTIMADO',
          id: registro.id,
          fecha: registro.fecha_entrada || '',
          estado,
          km_inicial: kmInicial,
          km_final: null,
          km_estimados: estimado,
          fuente_referencia: siguiente.fuente,
          id_referencia: siguiente.id,
          fecha_hora_referencia: new Date(siguiente.instante).toISOString(),
          horas_transcurridas: Math.round((siguiente.instante - inicio) / 36000) / 100,
        })
        continue
      }
    }
    if (kmFinal === null) jornadasPendientes += 1

    // =====================================================
    // NO CERRADAS / ABIERTAS
    // =====================================================

    if (
      estado !==
      ESTADO_CERRADO
    ) {
      detalleCalidad.push({
        tipo:
          estado ===
          ESTADO_NO_CERRADO
            ? 'JORNADA_NO_CERRADA'
            : 'JORNADA_ABIERTA',

        id:
          registro.id,

        fecha:
          registro.fecha_entrada ||
          '',

        estado,

        km_inicial:
          kmInicial,

        km_final:
          kmFinal,
      })

      continue
    }

    // =====================================================
    // SIN KM
    // =====================================================

    if (
      kmInicial === null ||
      kmFinal === null
    ) {
      sinKilometraje +=
        1

      detalleCalidad.push({
        tipo:
          'HORARIO_SIN_KILOMETRAJE',

        id:
          registro.id,

        fecha:
          registro.fecha_entrada ||
          '',

        estado,

        km_inicial:
          kmInicial,

        km_final:
          kmFinal,
      })

      continue
    }

    // =====================================================
    // KM INVÁLIDO
    // =====================================================

    if (
      kmFinal <
      kmInicial
    ) {
      kilometrajeInvalido +=
        1

      detalleCalidad.push({
        tipo:
          'KM_FINAL_MENOR_INICIAL',

        id:
          registro.id,

        fecha:
          registro.fecha_entrada ||
          '',

        estado,

        km_inicial:
          kmInicial,

        km_final:
          kmFinal,

        diferencia:
          kmFinal -
          kmInicial,
      })

      continue
    }

    // =====================================================
    // KM VÁLIDO
    // =====================================================

    kilometros +=
      kmFinal -
      kmInicial
  }

  return {
    kilometros,
    kilometros_estimados: kilometrosEstimados,
    kilometros_confirmados: kilometros - kilometrosEstimados,

    jornadas: {
      estimadas: jornadasEstimadas,
      pendientes_estimacion: jornadasPendientes,
      total:
        (
          registros ||
          []
        ).length,

      cerradas,

      abiertas,

      no_cerradas:
        noCerradas,

      sin_kilometraje:
        sinKilometraje,

      kilometraje_invalido:
        kilometrajeInvalido,
    },

    detalle_calidad:
      detalleCalidad,
  }
}

// =========================================================
// ORDENAR LECTURAS PREOPERACIONALES
// =========================================================

function ordenarLecturas(
  registros
) {
  return [
    ...(
      registros ||
      []
    ),
  ].sort(
    (
      a,
      b
    ) => {
      const claveA =
        `${a?.fecha_registro || ''} ${a?.hora_registro || ''} ${String(a?.id || '').padStart(12, '0')}`

      const claveB =
        `${b?.fecha_registro || ''} ${b?.hora_registro || ''} ${String(b?.id || '').padStart(12, '0')}`

      return claveA.localeCompare(
        claveB
      )
    }
  )
}

// =========================================================
// PROCESAR PREOPERACIONALES
// =========================================================

function procesarPreoperacionales({
  registros,
  lecturaAnterior = null,
}) {
  const lecturasPeriodo =
    ordenarLecturas(
      registros
    )

  let kilometros =
    0

  let sinKilometraje =
    0

  let lecturasIguales =
    0

  let lecturasRegresivas =
    0

  let incrementosValidos =
    0

  const detalleCalidad =
    []

  const lecturasValidas =
    []

  // =====================================================
  // LECTURA ANTERIOR
  // =====================================================

  if (
    lecturaAnterior
  ) {
    const kmAnterior =
      numeroSeguro(
        lecturaAnterior
          ?.km_registro
      )

    if (
      kmAnterior !==
      null
    ) {
      lecturasValidas.push({
        ...lecturaAnterior,

        km_numero:
          kmAnterior,

        anterior_periodo:
          true,
      })
    }
  }

  // =====================================================
  // LECTURAS DEL PERÍODO
  // =====================================================

  for (
    const registro of
      lecturasPeriodo
  ) {
    const km =
      numeroSeguro(
        registro
          ?.km_registro
      )

    if (
      km === null
    ) {
      sinKilometraje +=
        1

      detalleCalidad.push({
        tipo:
          'PREOPERACIONAL_SIN_KILOMETRAJE',

        id:
          registro.id,

        fecha:
          registro.fecha_registro ||
          '',

        hora:
          registro.hora_registro ||
          '',

        km:
          null,
      })

      continue
    }

    lecturasValidas.push({
      ...registro,

      km_numero:
        km,

      anterior_periodo:
        false,
    })
  }

  // =====================================================
  // DIFERENCIAS ENTRE LECTURAS
  // =====================================================

  for (
    let i = 1;
    i <
    lecturasValidas.length;
    i++
  ) {
    const anterior =
      lecturasValidas[
        i -
        1
      ]

    const actual =
      lecturasValidas[
        i
      ]

    // Solo contabilizamos un incremento cuando la lectura
    // ACTUAL pertenece al período consultado.
    if (
      actual
        .anterior_periodo
    ) {
      continue
    }

    const diferencia =
      actual.km_numero -
      anterior.km_numero

    if (
      diferencia >
      0
    ) {
      kilometros +=
        diferencia

      incrementosValidos +=
        1

      continue
    }

    if (
      diferencia ===
      0
    ) {
      lecturasIguales +=
        1

      detalleCalidad.push({
        tipo:
          'LECTURA_SIN_INCREMENTO',

        id:
          actual.id,

        fecha_anterior:
          anterior
            .fecha_registro ||
          '',

        km_anterior:
          anterior
            .km_numero,

        fecha_actual:
          actual
            .fecha_registro ||
          '',

        km_actual:
          actual
            .km_numero,

        diferencia:
          0,
      })

      continue
    }

    lecturasRegresivas +=
      1

    detalleCalidad.push({
      tipo:
        'LECTURA_REGRESIVA',

      id:
        actual.id,

      fecha_anterior:
        anterior
          .fecha_registro ||
        '',

      km_anterior:
        anterior
          .km_numero,

      fecha_actual:
        actual
          .fecha_registro ||
        '',

      km_actual:
        actual
          .km_numero,

      diferencia,
    })
  }

  // =====================================================
  // SI SOLO EXISTE UNA LECTURA Y NO TENEMOS ANTERIOR
  // =====================================================

  const sinBaseAnterior =
    (
      lecturasPeriodo.length >
        0 &&
      !lecturaAnterior
    )

  return {
    kilometros,

    lecturas: {
      total_periodo:
        lecturasPeriodo.length,

      validas:
        lecturasPeriodo.length -
        sinKilometraje,

      sin_kilometraje:
        sinKilometraje,

      incrementos_validos:
        incrementosValidos,

      sin_incremento:
        lecturasIguales,

      regresivas:
        lecturasRegresivas,

      tiene_lectura_anterior:
        Boolean(
          lecturaAnterior
        ),

      sin_base_anterior:
        sinBaseAnterior,
    },

    lectura_anterior:
      lecturaAnterior
        ? {
            fecha:
              lecturaAnterior
                .fecha_registro ||
              '',

            hora:
              lecturaAnterior
                .hora_registro ||
              '',

            km:
              numeroSeguro(
                lecturaAnterior
                  .km_registro
              ),
          }
        : null,

    detalle_calidad:
      detalleCalidad,
  }
}

// =========================================================
// CREAR RESULTADO POR VEHÍCULO
// =========================================================

function construirResultadoVehiculo({
  vehiculo,
  placa,
  horarios,
  preoperacionales,
  lecturaAnterior,
  referenciasEstimacion = [],
}) {
  const resultadoHorarios =
    procesarHorarios(
      horarios,
      referenciasEstimacion
    )

  const resultadoPreop =
    procesarPreoperacionales({
      registros:
        preoperacionales,

      lecturaAnterior,
    })

  const kmHorarios =
    resultadoHorarios
      .kilometros

  const kmPreoperacionales =
    resultadoPreop
      .kilometros

  const diferencia =
    kmPreoperacionales -
    kmHorarios

  const alertas =
    []

  // =====================================================
  // ALERTAS
  // =====================================================

  if (
    resultadoHorarios
      .jornadas
      .no_cerradas >
    0
  ) {
    alertas.push({
      tipo:
        'JORNADAS_NO_CERRADAS',

      cantidad:
        resultadoHorarios
          .jornadas
          .no_cerradas,

      mensaje:
        `${resultadoHorarios.jornadas.no_cerradas} jornada(s) en estado No Cerrado.`,
    })
  }

  if (
    resultadoHorarios
      .jornadas
      .abiertas >
    0
  ) {
    alertas.push({
      tipo:
        'JORNADAS_ABIERTAS',

      cantidad:
        resultadoHorarios
          .jornadas
          .abiertas,

      mensaje:
        `${resultadoHorarios.jornadas.abiertas} jornada(s) permanecen abiertas.`,
    })
  }

  if (
    resultadoHorarios
      .jornadas
      .sin_kilometraje >
    0
  ) {
    alertas.push({
      tipo:
        'HORARIOS_SIN_KILOMETRAJE',

      cantidad:
        resultadoHorarios
          .jornadas
          .sin_kilometraje,

      mensaje:
        `${resultadoHorarios.jornadas.sin_kilometraje} jornada(s) cerradas no tienen kilometraje completo.`,
    })
  }

  if (
    resultadoHorarios
      .jornadas
      .kilometraje_invalido >
    0
  ) {
    alertas.push({
      tipo:
        'HORARIOS_KM_INVALIDO',

      cantidad:
        resultadoHorarios
          .jornadas
          .kilometraje_invalido,

      mensaje:
        `${resultadoHorarios.jornadas.kilometraje_invalido} jornada(s) tienen KM final menor al inicial.`,
    })
  }

  if (
    resultadoPreop
      .lecturas
      .regresivas >
    0
  ) {
    alertas.push({
      tipo:
        'PREOPERACIONALES_REGRESIVOS',

      cantidad:
        resultadoPreop
          .lecturas
          .regresivas,

      mensaje:
        `${resultadoPreop.lecturas.regresivas} lectura(s) preoperacionales disminuyeron respecto de la anterior.`,
    })
  }

  if (
    resultadoPreop
      .lecturas
      .sin_kilometraje >
    0
  ) {
    alertas.push({
      tipo:
        'PREOPERACIONALES_SIN_KM',

      cantidad:
        resultadoPreop
          .lecturas
          .sin_kilometraje,

      mensaje:
        `${resultadoPreop.lecturas.sin_kilometraje} preoperacional(es) no tienen kilometraje.`,
    })
  }

  if (
    resultadoPreop
      .lecturas
      .sin_base_anterior
  ) {
    alertas.push({
      tipo:
        'SIN_LECTURA_ANTERIOR',

      cantidad:
        1,

      mensaje:
        'No existe una lectura preoperacional anterior al inicio del período; el primer desplazamiento del rango puede no estar incluido.',
    })
  }

  const tipoVehiculo =
    normalizarTipoVehiculo(
      vehiculo
        ?.tipo_vehiculo
    )

  return {
    placa,

    vehiculo: {
      id:
        vehiculo?.id ||
        null,

      placa,

      tipo_vehiculo:
        tipoVehiculo,

      tipo_vehiculo_nombre:
        nombreTipoVehiculo(
          tipoVehiculo
        ),

      marca:
        vehiculo?.marca ||
        '',

      linea:
        vehiculo?.linea ||
        '',

      modelo:
        vehiculo?.modelo ||
        '',

      estado:
        vehiculo?.estado ||
        '',
    },

    kilometros: {
      preoperacionales:
        kmPreoperacionales,

      horarios:
        kmHorarios,
      horarios_confirmados: resultadoHorarios.kilometros_confirmados,
      horarios_estimados: resultadoHorarios.kilometros_estimados,

      diferencia,
    },

    horarios: {
      ...resultadoHorarios
        .jornadas,

      detalle_calidad:
        resultadoHorarios
          .detalle_calidad,
    },

    preoperacionales: {
      ...resultadoPreop
        .lecturas,

      lectura_anterior:
        resultadoPreop
          .lectura_anterior,

      detalle_calidad:
        resultadoPreop
          .detalle_calidad,
    },

    alertas,

    tiene_alertas:
      alertas.length >
      0,
  }
}

// =========================================================
// AGRUPAR RESULTADOS POR TIPO
// =========================================================

function agruparResultadosPorTipo(
  resultados
) {
  const gruposMap =
    new Map()

  for (
    const resultado of
      resultados
  ) {
    const tipo =
      normalizarTipoVehiculo(
        resultado
          ?.vehiculo
          ?.tipo_vehiculo
      )

    if (
      !gruposMap.has(
        tipo
      )
    ) {
      gruposMap.set(
        tipo,
        []
      )
    }

    gruposMap
      .get(
        tipo
      )
      .push(
        resultado
      )
  }

  const tiposOrdenados = [
    ...ORDEN_TIPOS,

    ...Array.from(
      gruposMap.keys()
    ).filter(
      (tipo) =>
        !ORDEN_TIPOS.includes(
          tipo
        )
    ),
  ]

  return tiposOrdenados
    .filter(
      (tipo) =>
        gruposMap.has(
          tipo
        )
    )
    .map(
      (tipo) => {
        const vehiculos =
          gruposMap
            .get(
              tipo
            )
            .sort(
              (
                a,
                b
              ) =>
                a.placa.localeCompare(
                  b.placa,
                  'es'
                )
            )

        const totalPreop =
          vehiculos.reduce(
            (
              suma,
              item
            ) =>
              suma +
              Number(
                item
                  ?.kilometros
                  ?.preoperacionales ||
                0
              ),
            0
          )

        const totalHorarios =
          vehiculos.reduce(
            (
              suma,
              item
            ) =>
              suma +
              Number(
                item
                  ?.kilometros
                  ?.horarios ||
                0
              ),
            0
          )

        return {
          tipo_vehiculo:
            tipo,

          nombre:
            nombreTipoVehiculo(
              tipo
            ),

          vehiculos,

          resumen: {
            total_vehiculos:
              vehiculos.length,

            km_preoperacionales:
              totalPreop,

            km_horarios:
              totalHorarios,
            km_horarios_confirmados: vehiculos.reduce((sum, item) => sum + Number(item?.kilometros?.horarios_confirmados || 0), 0),
            km_horarios_estimados: vehiculos.reduce((sum, item) => sum + Number(item?.kilometros?.horarios_estimados || 0), 0),

            diferencia:
              totalPreop -
              totalHorarios,

            jornadas_no_cerradas:
              vehiculos.reduce(
                (
                  suma,
                  item
                ) =>
                  suma +
                  Number(
                    item
                      ?.horarios
                      ?.no_cerradas ||
                    0
                  ),
                0
              ),

            jornadas_abiertas:
              vehiculos.reduce(
                (
                  suma,
                  item
                ) =>
                  suma +
                  Number(
                    item
                      ?.horarios
                      ?.abiertas ||
                    0
                  ),
                0
              ),

            vehiculos_con_alertas:
              vehiculos.filter(
                (item) =>
                  item
                    ?.tiene_alertas
              ).length,
          },
        }
      }
    )
}

// =========================================================
// RESUMEN GENERAL DE FLOTA
// =========================================================

function construirResumenGeneral(
  resultados
) {
  const kmPreoperacionales =
    resultados.reduce(
      (
        suma,
        item
      ) =>
        suma +
        Number(
          item
            ?.kilometros
            ?.preoperacionales ||
          0
        ),
      0
    )

  const kmHorarios =
    resultados.reduce(
      (
        suma,
        item
      ) =>
        suma +
        Number(
          item
            ?.kilometros
            ?.horarios ||
          0
        ),
      0
    )

  const jornadasCerradas =
    resultados.reduce(
      (
        suma,
        item
      ) =>
        suma +
        Number(
          item
            ?.horarios
            ?.cerradas ||
          0
        ),
      0
    )

  const jornadasNoCerradas =
    resultados.reduce(
      (
        suma,
        item
      ) =>
        suma +
        Number(
          item
            ?.horarios
            ?.no_cerradas ||
          0
        ),
      0
    )

  const jornadasAbiertas =
    resultados.reduce(
      (
        suma,
        item
      ) =>
        suma +
        Number(
          item
            ?.horarios
            ?.abiertas ||
          0
        ),
      0
    )

  const horariosKmInvalidos =
    resultados.reduce(
      (
        suma,
        item
      ) =>
        suma +
        Number(
          item
            ?.horarios
            ?.kilometraje_invalido ||
          0
        ),
      0
    )

  const preopRegresivos =
    resultados.reduce(
      (
        suma,
        item
      ) =>
        suma +
        Number(
          item
            ?.preoperacionales
            ?.regresivas ||
          0
        ),
      0
    )

  return {
    total_vehiculos:
      resultados.length,

    km_preoperacionales:
      kmPreoperacionales,

    km_horarios:
      kmHorarios,
    km_horarios_confirmados: resultados.reduce((sum, item) => sum + Number(item?.kilometros?.horarios_confirmados || 0), 0),
    km_horarios_estimados: resultados.reduce((sum, item) => sum + Number(item?.kilometros?.horarios_estimados || 0), 0),
    jornadas_estimadas: resultados.reduce((sum, item) => sum + Number(item?.horarios?.estimadas || 0), 0),

    diferencia:
      kmPreoperacionales -
      kmHorarios,

    jornadas_cerradas:
      jornadasCerradas,

    jornadas_no_cerradas:
      jornadasNoCerradas,

    jornadas_abiertas:
      jornadasAbiertas,

    horarios_km_invalidos:
      horariosKmInvalidos,

    preoperacionales_regresivos:
      preopRegresivos,

    vehiculos_con_alertas:
      resultados.filter(
        (item) =>
          item
            ?.tiene_alertas
      ).length,
  }
}

// =========================================================
// GENERAR CONSULTA COMPLETA
// =========================================================

async function generarConsulta({
  supabase,
  fechaInicio,
  fechaFin,
  placaFiltro = '',
}) {
  const [
    vehiculos,
    horarios,
    preoperacionales,
  ] =
    await Promise.all([
      obtenerVehiculos(
        supabase
      ),

      consultarHorarios({
        supabase,
        fechaInicio,
        fechaFin,
        placa:
          placaFiltro,
      }),

      consultarPreoperacionales({
        supabase,
        fechaInicio,
        fechaFin,
        placa:
          placaFiltro,
      }),
    ])

  // Se buscan referencias hasta 48 h después del final del período.
  // No se incorporan esas jornadas adicionales a los totales del reporte.
  const fechaLimite = new Date(`${fechaFin}T00:00:00Z`)
  fechaLimite.setUTCDate(fechaLimite.getUTCDate() + 3)
  const finReferencias = fechaLimite.toISOString().slice(0, 10)
  const [horariosReferencia, preopReferencia] = await Promise.all([
    consultarHorarios({ supabase, fechaInicio, fechaFin: finReferencias, placa: placaFiltro }),
    consultarPreoperacionales({ supabase, fechaInicio, fechaFin: finReferencias, placa: placaFiltro }),
  ])
  const horariosReferenciaPorPlaca = agruparPorPlaca(horariosReferencia)
  const preopReferenciaPorPlaca = agruparPorPlaca(preopReferencia)

  const mapaVehiculos =
    new Map(
      vehiculos.map(
        (vehiculo) => [
          vehiculo.placa,
          vehiculo,
        ]
      )
    )

  const horariosPorPlaca =
    agruparPorPlaca(
      horarios
    )

  const preopPorPlaca =
    agruparPorPlaca(
      preoperacionales
    )

  // =====================================================
  // PLACAS A ANALIZAR
  // =====================================================

  const placas =
    new Set()

  if (
    placaFiltro
  ) {
    placas.add(
      placaFiltro
    )
  } else {
    // Reporte de toda la flota:
    // utilizamos el catálogo maestro como referencia.

    for (
      const vehiculo of
        vehiculos
    ) {
      placas.add(
        vehiculo.placa
      )
    }

    // Además incluimos placas históricas que eventualmente
    // ya no existan en la tabla maestra.

    for (
      const placa of
        horariosPorPlaca.keys()
    ) {
      placas.add(
        placa
      )
    }

    for (
      const placa of
        preopPorPlaca.keys()
    ) {
      placas.add(
        placa
      )
    }
  }

  // =====================================================
  // LECTURA ANTERIOR POR VEHÍCULO
  // =====================================================

  const lecturasAnteriores =
    new Map()

  await Promise.all(
    Array.from(
      placas
    ).map(
      async (
        placa
      ) => {
        const lectura =
          await obtenerLecturaAnterior({
            supabase,
            placa,
            fechaInicio,
          })

        lecturasAnteriores.set(
          placa,
          lectura
        )
      }
    )
  )

  // =====================================================
  // RESULTADOS
  // =====================================================

  const resultados =
    []

  for (
    const placa of
      placas
  ) {
    const vehiculo =
      mapaVehiculos.get(
        placa
      ) || {
        id:
          null,

        placa,

        tipo_vehiculo:
          'OTROS',

        tipo_vehiculo_nombre:
          'Otros',

        marca:
          '',

        linea:
          '',

        modelo:
          '',

        estado:
          '',
      }

    const resultado =
      construirResultadoVehiculo({
        vehiculo,
        placa,

        horarios:
          horariosPorPlaca.get(
            placa
          ) || [],

        preoperacionales:
          preopPorPlaca.get(
            placa
          ) || [],

        lecturaAnterior:
          lecturasAnteriores.get(
            placa
          ) || null,
        referenciasEstimacion: lecturasPosteriores(
          horariosReferenciaPorPlaca.get(placa) || [],
          preopReferenciaPorPlaca.get(placa) || []
        ),
      })

    resultados.push(
      resultado
    )
  }

  resultados.sort(
    (
      a,
      b
    ) => {
      const ordenTipo =
        indiceTipoVehiculo(
          a
            ?.vehiculo
            ?.tipo_vehiculo
        ) -
        indiceTipoVehiculo(
          b
            ?.vehiculo
            ?.tipo_vehiculo
        )

      if (
        ordenTipo !==
        0
      ) {
        return ordenTipo
      }

      return a.placa.localeCompare(
        b.placa,
        'es'
      )
    }
  )

  return {
    resultados,

    grupos:
      agruparResultadosPorTipo(
        resultados
      ),

    resumen:
      construirResumenGeneral(
        resultados
      ),
  }
}

// =========================================================
// GET
// =========================================================
//
// RECURSOS:
//
// vehiculos
//
// consulta
//   - placa vacía  = toda la flota
//   - placa        = vehículo individual
//
// exportar
//   - únicamente permitido para toda la flota
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
      'vehiculos'

    // =====================================================
    // CATÁLOGO VEHÍCULOS
    // =====================================================

    if (
      recurso ===
      'vehiculos'
    ) {
      const vehiculos =
        await obtenerVehiculos(
          supabase
        )

      return NextResponse.json({
        status:
          'success',

        vehiculos,
      })
    }

    // =====================================================
    // RANGO
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

    const placa =
      normalizarMayusculas(
        searchParams.get(
          'placa'
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
    // CONSULTA
    // =====================================================

    if (
      recurso ===
      'consulta'
    ) {
      const resultado =
        await generarConsulta({
          supabase,
          fechaInicio,
          fechaFin,

          placaFiltro:
            placa,
        })

      const resultadoIndividual =
        placa
          ? (
              resultado
                .resultados[
                  0
                ] ||
              null
            )
          : null

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

        modo:
          placa
            ? 'vehiculo'
            : 'flota',

        placa:
          placa ||
          '',

        resultado:
          resultadoIndividual,

        vehiculos:
          resultado.resultados,

        grupos:
          resultado.grupos,

        resumen:
          resultado.resumen,

        exportacion_habilitada:
          !placa,
      })
    }

    // =====================================================
    // EXPORTACIÓN DE TODA LA FLOTA
    // =====================================================

    if (
      recurso ===
      'exportar'
    ) {
      if (
        placa
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              'Los reportes Excel y PDF están disponibles únicamente para la consulta de toda la flota.',
          },
          {
            status:
              400,
          }
        )
      }

      const resultado =
        await generarConsulta({
          supabase,
          fechaInicio,
          fechaFin,
          placaFiltro:
            '',
        })

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

        modo:
          'flota',

        resumen:
          resultado.resumen,

        // =================================================
        // ORDEN:
        //
        // Automóvil
        // Camioneta
        // Motocicleta
        // Camión
        // Otros
        //
        // =================================================

        grupos:
          resultado.grupos,

        vehiculos:
          resultado.resultados,

        total:
          resultado
            .resultados
            .length,
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
      'Error GET /api/admin/consultas/kilometros:',
      error
    )

    return respuestaError(
      error
    )
  }
}