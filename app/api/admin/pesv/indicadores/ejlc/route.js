// app/api/admin/pesv/indicadores/ejlc/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

const ESTADOS_CLASE_DICTADA = new Set([
  'DICTADA',
  'PENDIENTE_CARGUE',
])

const ESTADO_HORARIO_CERRADO = 'CERRADO'
const ROL_INSTRUCTOR_PRACTICA = 'INSTRUCTOR PRACTICA'
const MAX_CLASES_DIA_SIN_EXCESO = 10

// =========================================================
// HELPERS GENERALES
// =========================================================

function texto(valor) {
  return String(valor ?? '').trim()
}

function mayusculas(valor) {
  return texto(valor).toUpperCase()
}

function normalizarTexto(valor) {
  return mayusculas(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function numero(valor, fallback = 0) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : fallback
}

function entero(valor, fallback = 0) {
  const n = Number.parseInt(valor, 10)
  return Number.isFinite(n) ? n : fallback
}

function redondear(valor, decimales = 2) {
  const factor = 10 ** decimales
  return Math.round((numero(valor) + Number.EPSILON) * factor) / factor
}

function fechaISO(anio, mes, dia) {
  const y = String(anio).padStart(4, '0')
  const m = String(mes).padStart(2, '0')
  const d = String(dia).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function ultimoDiaMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate()
}

function compararFechas(a, b) {
  return String(a).localeCompare(String(b))
}

function minFecha(a, b) {
  return compararFechas(a, b) <= 0 ? a : b
}

function nombrePersonal(personal) {
  return [personal?.nombres, personal?.apellidos]
    .map(texto)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function claveNombreFecha(nombre, fecha) {
  return `${normalizarTexto(nombre)}|${fecha}`
}

function obtenerFechaHoyColombia() {
  // en-CA produce YYYY-MM-DD y permite obtener el día calendario
  // de Colombia sin depender de la zona horaria del servidor.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function restarUnDia(fecha) {
  const [anio, mes, dia] = String(fecha)
    .split('-')
    .map(Number)

  const d = new Date(Date.UTC(anio, mes - 1, dia))
  d.setUTCDate(d.getUTCDate() - 1)

  return d.toISOString().slice(0, 10)
}

function obtenerParametrosDesdeUrl(request) {
  const url = new URL(request.url)

  return {
    anio: entero(url.searchParams.get('anio')),
    mes: entero(url.searchParams.get('mes')),
  }
}

function validarPeriodo(anio, mes) {
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    throw Object.assign(
      new Error('El año de medición no es válido.'),
      { status: 400, code: 'ANIO_INVALIDO' }
    )
  }

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw Object.assign(
      new Error('El mes de medición no es válido.'),
      { status: 400, code: 'MES_INVALIDO' }
    )
  }
}

// =========================================================
// PERÍODO Y FECHA DE CORTE
// =========================================================

function construirPeriodo(anio, mes) {
  const fechaInicioMes = fechaISO(anio, mes, 1)
  const fechaFinMes = fechaISO(
    anio,
    mes,
    ultimoDiaMes(anio, mes)
  )

  const hoyColombia = obtenerFechaHoyColombia()
  const ayerColombia = restarUnDia(hoyColombia)

  const fechaCorte = minFecha(fechaFinMes, ayerColombia)

  if (compararFechas(fechaCorte, fechaInicioMes) < 0) {
    throw Object.assign(
      new Error(
        'El período seleccionado todavía no tiene días cerrados para evaluar. EJLC solo calcula hasta el día anterior.'
      ),
      {
        status: 400,
        code: 'PERIODO_SIN_DIAS_EVALUABLES',
      }
    )
  }

  return {
    anio,
    mes,
    fecha_inicio_mes: fechaInicioMes,
    fecha_fin_mes: fechaFinMes,
    fecha_inicio_acumulado: fechaISO(anio, 1, 1),
    fecha_corte: fechaCorte,
    hoy_colombia: hoyColombia,
  }
}

// =========================================================
// CONSULTAS
// =========================================================

const TAMANO_PAGINA_CONSULTA = 1000

async function consultarHorarios(supabase, fechaInicio, fechaFin) {
  const filas = []
  let desde = 0

  while (true) {
    const hasta = desde + TAMANO_PAGINA_CONSULTA - 1

    const { data, error } = await supabase
      .from('horarios')
      .select(`
        id,
        fecha_entrada,
        usuario,
        nombre_completo,
        rol,
        placa,
        clases_programadas,
        clases_dictadas,
        estado_registro
      `)
      .gte('fecha_entrada', fechaInicio)
      .lte('fecha_entrada', fechaFin)
      .order('fecha_entrada', { ascending: true })
      .order('id', { ascending: true })
      .range(desde, hasta)

    if (error) {
      throw new Error(
        `No fue posible consultar Horarios: ${error.message}`
      )
    }

    const pagina = data || []
    filas.push(...pagina)

    if (pagina.length < TAMANO_PAGINA_CONSULTA) {
      break
    }

    desde += TAMANO_PAGINA_CONSULTA
  }

  // Se filtra también en JS para tolerar tildes, espacios y
  // diferencias históricas de mayúsculas/minúsculas.
  return filas.filter(
    (fila) =>
      normalizarTexto(fila?.rol) ===
      ROL_INSTRUCTOR_PRACTICA
  )
}

async function consultarProgramacion(
  supabase,
  fechaInicio,
  fechaFin
) {
  const filas = []
  let desde = 0

  while (true) {
    const hasta = desde + TAMANO_PAGINA_CONSULTA - 1

    const { data, error } = await supabase
      .from('programacion_clases')
      .select(`
        id,
        instructor_id,
        fecha,
        hora_inicio,
        estado,
        tipo_programacion,
        personal:instructor_id (
          id,
          documento,
          nombres,
          apellidos,
          estado
        )
      `)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true })
      .order('id', { ascending: true })
      .range(desde, hasta)

    if (error) {
      throw new Error(
        `No fue posible consultar Programación de clases: ${error.message}`
      )
    }

    const pagina = data || []
    filas.push(...pagina)

    if (pagina.length < TAMANO_PAGINA_CONSULTA) {
      break
    }

    desde += TAMANO_PAGINA_CONSULTA
  }

  return filas
}

// =========================================================
// CONSOLIDACIÓN HORARIOS
// =========================================================

function consolidarHorarios(filas) {
  const mapa = new Map()

  for (const fila of filas) {
    const fecha = texto(fila?.fecha_entrada)
    const nombre = texto(fila?.nombre_completo)

    if (!fecha || !nombre) {
      continue
    }

    const key = claveNombreFecha(nombre, fecha)

    if (!mapa.has(key)) {
      mapa.set(key, {
        key,
        fecha,
        nombre_horarios: nombre,
        nombre_normalizado: normalizarTexto(nombre),
        usuarios: new Set(),
        placas: new Set(),
        registros: 0,
        registros_cerrados: 0,
        registros_no_cerrados: 0,
        registros_abiertos_vencidos: 0,
        registros_sin_estado: 0,
        registros_sin_clases: 0,
        clases_declaradas: 0,
        detalle_estados: {},
        ids_horarios: [],
      })
    }

    const item = mapa.get(key)
    const estado = normalizarTexto(fila?.estado_registro)

    item.registros += 1
    item.ids_horarios.push(fila.id)

    if (texto(fila?.usuario)) {
      item.usuarios.add(texto(fila.usuario))
    }

    if (texto(fila?.placa)) {
      item.placas.add(texto(fila.placa))
    }

    const etiquetaEstado = estado || 'SIN ESTADO'
    item.detalle_estados[etiquetaEstado] =
      (item.detalle_estados[etiquetaEstado] || 0) + 1

    if (estado === ESTADO_HORARIO_CERRADO) {
      item.registros_cerrados += 1

      const clases = Number(fila?.clases_dictadas)

      if (
        fila?.clases_dictadas === null ||
        fila?.clases_dictadas === undefined ||
        fila?.clases_dictadas === '' ||
        !Number.isFinite(clases) ||
        clases < 0
      ) {
        item.registros_sin_clases += 1
      } else {
        item.clases_declaradas += clases
      }
    } else {
      item.registros_no_cerrados += 1

      if (estado === 'ABIERTO') {
        // La consulta nunca incluye el día actual.
        // Por eso cualquier ABIERTO encontrado es vencido.
        item.registros_abiertos_vencidos += 1
      }

      if (!estado) {
        item.registros_sin_estado += 1
      }
    }
  }

  return [...mapa.values()].map((item) => {
    const informacionCompleta =
      item.registros > 0 &&
      item.registros_cerrados === item.registros &&
      item.registros_sin_clases === 0

    let estadoCalidad = 'COMPLETO'

    if (!informacionCompleta) {
      if (item.registros_abiertos_vencidos > 0) {
        estadoCalidad = 'ABIERTO VENCIDO'
      } else if (item.registros_no_cerrados > 0) {
        estadoCalidad = 'NO CERRADO'
      } else if (item.registros_sin_clases > 0) {
        estadoCalidad = 'SIN CLASES DICTADAS'
      } else {
        estadoCalidad = 'INCOMPLETO'
      }
    }

    return {
      ...item,
      usuarios: [...item.usuarios],
      placas: [...item.placas],
      informacion_completa: informacionCompleta,
      estado_calidad: estadoCalidad,
      clases_declaradas: redondear(
        item.clases_declaradas,
        2
      ),
    }
  })
}

// =========================================================
// CONSOLIDACIÓN PROGRAMACIÓN DE CLASES
// =========================================================

function consolidarProgramacion(filas) {
  const mapa = new Map()

  for (const fila of filas) {
    const fecha = texto(fila?.fecha)
    const instructorId = fila?.instructor_id
    const nombre = nombrePersonal(fila?.personal)

    if (!fecha || !instructorId || !nombre) {
      continue
    }

    const key = `${instructorId}|${fecha}`

    if (!mapa.has(key)) {
      mapa.set(key, {
        key,
        fecha,
        instructor_id: instructorId,
        documento: texto(fila?.personal?.documento),
        nombre_programacion: nombre,
        nombre_normalizado: normalizarTexto(nombre),
        registros: 0,
        dictadas: 0,
        pendientes_cargue: 0,
        agendadas: 0,
        no_dictadas: 0,
        canceladas: 0,
        otros_estados: 0,
        clases_efectivas: 0,
        ids_programacion: [],
      })
    }

    const item = mapa.get(key)
    const estado = normalizarTexto(fila?.estado)

    item.registros += 1
    item.ids_programacion.push(fila.id)

    if (estado === 'DICTADA') {
      item.dictadas += 1
    } else if (estado === 'PENDIENTE_CARGUE') {
      item.pendientes_cargue += 1
    } else if (estado === 'AGENDADA') {
      item.agendadas += 1
    } else if (estado === 'NO_DICTADA') {
      item.no_dictadas += 1
    } else if (estado === 'CANCELADA') {
      item.canceladas += 1
    } else {
      item.otros_estados += 1
    }

    if (ESTADOS_CLASE_DICTADA.has(estado)) {
      item.clases_efectivas += 1
    }
  }

  return [...mapa.values()].map((item) => ({
    ...item,

    // Para EJLC solo existe evidencia de jornada impartida
    // cuando hay al menos una clase DICTADA o PENDIENTE_CARGUE.
    informacion_utilizable:
      item.clases_efectivas > 0,
  }))
}

// =========================================================
// CONCILIACIÓN DE FUENTES
// =========================================================

function conciliarJornadas(
  horariosConsolidados,
  programacionConsolidada
) {
  const horariosPorNombreFecha = new Map()

  for (const h of horariosConsolidados) {
    horariosPorNombreFecha.set(
      claveNombreFecha(
        h.nombre_horarios,
        h.fecha
      ),
      h
    )
  }

  const programacionPorNombreFecha = new Map()

  for (const p of programacionConsolidada) {
    programacionPorNombreFecha.set(
      claveNombreFecha(
        p.nombre_programacion,
        p.fecha
      ),
      p
    )
  }

  const claves = new Set([
    ...horariosPorNombreFecha.keys(),
    ...programacionPorNombreFecha.keys(),
  ])

  const jornadas = []

  for (const key of claves) {
    const h = horariosPorNombreFecha.get(key) || null
    const p = programacionPorNombreFecha.get(key) || null

    const programacionUtilizable =
      Boolean(p?.informacion_utilizable)

    const horariosUtilizable =
      Boolean(h?.informacion_completa)

    let evaluable = false
    let clasesUtilizadas = null
    let fuenteResultado = 'INFORMACIÓN INSUFICIENTE'
    let motivoNoEvaluable = null

    // PRIORIDAD 1:
    // Programación de clases cuando existe evidencia de
    // clases efectivamente impartidas.
    if (programacionUtilizable) {
      evaluable = true
      clasesUtilizadas = p.clases_efectivas
      fuenteResultado = 'PROGRAMACIÓN DE CLASES'
    }

    // PRIORIDAD 2:
    // Horarios completo para períodos históricos o jornadas
    // sin evidencia utilizable en Programación de clases.
    else if (horariosUtilizable) {
      evaluable = true
      clasesUtilizadas = h.clases_declaradas
      fuenteResultado = 'HORARIOS'
    }

    // Sin evidencia suficiente en ninguna fuente.
    else {
      if (h && !h.informacion_completa) {
        motivoNoEvaluable =
          `Horarios ${h.estado_calidad.toLowerCase()} y sin evidencia suficiente en Programación de clases.`
      } else if (p && !p.informacion_utilizable) {
        motivoNoEvaluable =
          'Programación de clases no contiene clases DICTADA o PENDIENTE_CARGUE para esta jornada.'
      } else {
        motivoNoEvaluable =
          'No existe información suficiente para evaluar la jornada.'
      }
    }

    const ambasFuentes = Boolean(h && p)
    const ambasComparables =
      Boolean(
        h?.informacion_completa &&
        p?.informacion_utilizable
      )

    let diferenciaFuentes = null
    let conciliacion = 'SIN COMPARACIÓN'

    if (ambasComparables) {
      diferenciaFuentes = redondear(
        numero(p.clases_efectivas) -
          numero(h.clases_declaradas),
        2
      )

      conciliacion =
        diferenciaFuentes === 0
          ? 'COINCIDE'
          : 'DIFERENCIA'
    } else if (h && !p) {
      conciliacion = 'SOLO HORARIOS'
    } else if (!h && p) {
      conciliacion = 'SOLO PROGRAMACIÓN'
    } else if (ambasFuentes) {
      conciliacion = 'NO COMPARABLE'
    }

    const exceso =
      evaluable &&
      numero(clasesUtilizadas) >
        MAX_CLASES_DIA_SIN_EXCESO

    jornadas.push({
      fecha: h?.fecha || p?.fecha || null,

      instructor_id:
        p?.instructor_id || null,

      documento:
        p?.documento || null,

      instructor:
        p?.nombre_programacion ||
        h?.nombre_horarios ||
        'SIN IDENTIFICAR',

      nombre_horarios:
        h?.nombre_horarios || null,

      nombre_programacion:
        p?.nombre_programacion || null,

      horarios: h
        ? {
            registros: h.registros,
            registros_cerrados:
              h.registros_cerrados,
            registros_no_cerrados:
              h.registros_no_cerrados,
            registros_abiertos_vencidos:
              h.registros_abiertos_vencidos,
            registros_sin_clases:
              h.registros_sin_clases,
            clases_declaradas:
              h.clases_declaradas,
            informacion_completa:
              h.informacion_completa,
            estado_calidad:
              h.estado_calidad,
            usuarios: h.usuarios,
            placas: h.placas,
            ids: h.ids_horarios,
          }
        : null,

      programacion: p
        ? {
            registros: p.registros,
            dictadas: p.dictadas,
            pendientes_cargue:
              p.pendientes_cargue,
            agendadas: p.agendadas,
            no_dictadas: p.no_dictadas,
            canceladas: p.canceladas,
            clases_efectivas:
              p.clases_efectivas,
            informacion_utilizable:
              p.informacion_utilizable,
            ids: p.ids_programacion,
          }
        : null,

      evaluable,
      clases_utilizadas: evaluable
        ? numero(clasesUtilizadas)
        : null,
      fuente_resultado: fuenteResultado,
      exceso,
      conciliacion,
      diferencia_fuentes: diferenciaFuentes,
      motivo_no_evaluable: motivoNoEvaluable,
    })
  }

  return jornadas.sort((a, b) => {
    const porFecha = compararFechas(
      a.fecha,
      b.fecha
    )

    if (porFecha !== 0) {
      return porFecha
    }

    return normalizarTexto(a.instructor).localeCompare(
      normalizarTexto(b.instructor)
    )
  })
}

// =========================================================
// RESUMEN EJLC
// =========================================================

function resumirJornadas(jornadas) {
  const evaluables = jornadas.filter(
    (j) => j.evaluable
  )

  const excesos = evaluables.filter(
    (j) => j.exceso
  )

  const incompletas = jornadas.filter(
    (j) => !j.evaluable
  )

  const conHorarios = jornadas.filter(
    (j) => Boolean(j.horarios)
  )

  const conProgramacion = jornadas.filter(
    (j) => Boolean(j.programacion)
  )

  const ambas = jornadas.filter(
    (j) =>
      Boolean(j.horarios) &&
      Boolean(j.programacion)
  )

  const soloHorarios = jornadas.filter(
    (j) =>
      Boolean(j.horarios) &&
      !j.programacion
  )

  const soloProgramacion = jornadas.filter(
    (j) =>
      !j.horarios &&
      Boolean(j.programacion)
  )

  const coincidencias = jornadas.filter(
    (j) => j.conciliacion === 'COINCIDE'
  )

  const diferencias = jornadas.filter(
    (j) => j.conciliacion === 'DIFERENCIA'
  )

  const noComparables = jornadas.filter(
    (j) => j.conciliacion === 'NO COMPARABLE'
  )

  const noCerrados = jornadas.filter(
    (j) =>
      numero(
        j.horarios?.registros_no_cerrados
      ) > 0
  )

  const abiertosVencidos = jornadas.filter(
    (j) =>
      numero(
        j.horarios?.registros_abiertos_vencidos
      ) > 0
  )

  const recuperadasProgramacion =
    jornadas.filter(
      (j) =>
        j.evaluable &&
        j.fuente_resultado ===
          'PROGRAMACIÓN DE CLASES' &&
        Boolean(j.horarios) &&
        !j.horarios?.informacion_completa
    )

  const EJD = excesos.length
  const SDT = evaluables.length
  const EJLC =
    SDT > 0
      ? redondear((EJD / SDT) * 100, 2)
      : null

  const advertencias = []

  if (SDT === 0) {
    advertencias.push(
      'No existen jornadas evaluables para calcular EJLC en el período.'
    )
  }

  if (incompletas.length > 0) {
    advertencias.push(
      `${incompletas.length} jornada(s) presentan información insuficiente y no fueron incluidas en SDT.`
    )
  }

  if (noCerrados.length > 0) {
    advertencias.push(
      `${noCerrados.length} jornada(s) presentan registros de Horarios no cerrados.`
    )
  }

  if (abiertosVencidos.length > 0) {
    advertencias.push(
      `${abiertosVencidos.length} jornada(s) presentan registros de Horarios abiertos vencidos.`
    )
  }

  if (diferencias.length > 0) {
    advertencias.push(
      `${diferencias.length} jornada(s) presentan diferencias entre Horarios y Programación de clases.`
    )
  }

  return {
    EJD,
    SDT,
    EJLC,

    criterio_exceso:
      `Más de ${MAX_CLASES_DIA_SIN_EXCESO} clases prácticas dictadas por instructor/día.`,

    jornadas_identificadas:
      jornadas.length,

    jornadas_evaluables:
      evaluables.length,

    jornadas_con_exceso:
      excesos.length,

    jornadas_informacion_insuficiente:
      incompletas.length,

    fuentes: {
      con_horarios:
        conHorarios.length,

      con_programacion:
        conProgramacion.length,

      ambas_fuentes:
        ambas.length,

      solo_horarios:
        soloHorarios.length,

      solo_programacion:
        soloProgramacion.length,
    },

    calidad: {
      coincidencias:
        coincidencias.length,

      diferencias:
        diferencias.length,

      no_comparables:
        noComparables.length,

      horarios_no_cerrados:
        noCerrados.length,

      horarios_abiertos_vencidos:
        abiertosVencidos.length,

      jornadas_recuperadas_programacion:
        recuperadasProgramacion.length,
    },

    advertencias,

    jornadas_exceso:
      excesos,

    jornadas_incompletas:
      incompletas,

    jornadas_con_diferencias:
      diferencias,
  }
}

function filtrarJornadasPorPeriodo(
  jornadas,
  fechaInicio,
  fechaFin
) {
  return jornadas.filter(
    (j) =>
      compararFechas(j.fecha, fechaInicio) >= 0 &&
      compararFechas(j.fecha, fechaFin) <= 0
  )
}

// =========================================================
// CÁLCULO PRINCIPAL
// =========================================================

async function calcularEjlc(
  supabase,
  anio,
  mes
) {
  validarPeriodo(anio, mes)

  const periodo =
    construirPeriodo(anio, mes)

  // Consultamos desde enero hasta el corte una sola vez.
  // Así obtenemos tanto el resultado mensual como el
  // acumulado anual sin duplicar consultas.
  // Para 2025 y vigencias anteriores, EJLC se calcula
  // exclusivamente con la fuente histórica Horarios.
  // Programación de clases corresponde al esquema nuevo y
  // no se utiliza para construir la línea base histórica.
  const usarSoloHorariosHistorico = anio <= 2025

  let filasHorarios = []
  let filasProgramacion = []

  if (usarSoloHorariosHistorico) {
    filasHorarios = await consultarHorarios(
      supabase,
      periodo.fecha_inicio_acumulado,
      periodo.fecha_corte
    )
  } else {
    ;[
      filasHorarios,
      filasProgramacion,
    ] = await Promise.all([
      consultarHorarios(
        supabase,
        periodo.fecha_inicio_acumulado,
        periodo.fecha_corte
      ),

      consultarProgramacion(
        supabase,
        periodo.fecha_inicio_acumulado,
        periodo.fecha_corte
      ),
    ])
  }

  const horariosConsolidados =
    consolidarHorarios(filasHorarios)

  const programacionConsolidada =
    usarSoloHorariosHistorico
      ? []
      : consolidarProgramacion(
          filasProgramacion
        )

  const jornadasAcumuladas =
    conciliarJornadas(
      horariosConsolidados,
      programacionConsolidada
    )

  const jornadasMes =
    filtrarJornadasPorPeriodo(
      jornadasAcumuladas,
      periodo.fecha_inicio_mes,
      periodo.fecha_corte
    )

  const resumenMensual =
    resumirJornadas(jornadasMes)

  const resumenAcumulado =
    resumirJornadas(jornadasAcumuladas)

  return {
    indicador: 'EJLC',
    nombre:
      'Exceso de jornadas laborales de conductores',

    origen: 'AUTOMATICO',

    unidad: 'PORCENTAJE',

    periodicidad:
      'MENSUAL_Y_ACUMULADO_ANUAL',

    criterio_operacional: {
      poblacion:
        'Instructores de práctica',

      unidad_analisis:
        'Instructor/día',

      clases_sin_exceso_maximo:
        MAX_CLASES_DIA_SIN_EXCESO,

      exceso_desde_clases:
        MAX_CLASES_DIA_SIN_EXCESO + 1,

      estados_programacion_contabilizados: [
        'DICTADA',
        'PENDIENTE_CARGUE',
      ],

      fuente_preferente:
        usarSoloHorariosHistorico
          ? 'HORARIOS'
          : 'PROGRAMACIÓN DE CLASES',

      fuente_historica:
        'HORARIOS',

      modo_fuentes:
        usarSoloHorariosHistorico
          ? 'HISTÓRICO_SOLO_HORARIOS'
          : 'HÍBRIDO',

      formula:
        'EJLC = EJD / SDT * 100',

      definiciones: {
        EJD:
          'Número de jornadas instructor/día evaluables con más de 10 clases prácticas dictadas.',

        SDT:
          'Número total de jornadas instructor/día con información suficiente para ser evaluadas.',
      },
    },

    periodo,

    mensual: {
      ...resumenMensual,
      fecha_inicio:
        periodo.fecha_inicio_mes,
      fecha_fin:
        periodo.fecha_corte,
    },

    acumulado_anual: {
      ...resumenAcumulado,
      fecha_inicio:
        periodo.fecha_inicio_acumulado,
      fecha_fin:
        periodo.fecha_corte,
    },

    // Estos campos directos facilitan el consumo desde
    // EjlcMedicion.jsx y el guardado en la API común.
    EJD: resumenMensual.EJD,
    SDT: resumenMensual.SDT,
    EJLC: resumenMensual.EJLC,

    EJD_acumulado:
      resumenAcumulado.EJD,

    SDT_acumulado:
      resumenAcumulado.SDT,

    EJLC_acumulado:
      resumenAcumulado.EJLC,

    detalle_jornadas:
      jornadasMes,

    detalle_jornadas_acumulado:
      jornadasAcumuladas,

    datos_calculo: {
      indicador: 'EJLC',

      periodo: {
        anio,
        mes,
        fecha_inicio:
          periodo.fecha_inicio_mes,
        fecha_fin_programada:
          periodo.fecha_fin_mes,
        fecha_corte:
          periodo.fecha_corte,
      },

      mensual: {
        EJD:
          resumenMensual.EJD,
        SDT:
          resumenMensual.SDT,
        EJLC:
          resumenMensual.EJLC,
      },

      acumulado_anual: {
        EJD:
          resumenAcumulado.EJD,
        SDT:
          resumenAcumulado.SDT,
        EJLC:
          resumenAcumulado.EJLC,
      },

      resumen_horarios: {
        jornadas:
          resumenMensual.fuentes
            .con_horarios,

        no_cerrados:
          resumenMensual.calidad
            .horarios_no_cerrados,

        abiertos_vencidos:
          resumenMensual.calidad
            .horarios_abiertos_vencidos,
      },

      resumen_programacion: {
        jornadas:
          resumenMensual.fuentes
            .con_programacion,

        jornadas_recuperadas:
          resumenMensual.calidad
            .jornadas_recuperadas_programacion,
      },

      resumen_comparativo: {
        ambas_fuentes:
          resumenMensual.fuentes
            .ambas_fuentes,

        solo_horarios:
          resumenMensual.fuentes
            .solo_horarios,

        solo_programacion:
          resumenMensual.fuentes
            .solo_programacion,

        coincidencias:
          resumenMensual.calidad
            .coincidencias,

        diferencias:
          resumenMensual.calidad
            .diferencias,

        no_comparables:
          resumenMensual.calidad
            .no_comparables,
      },

      detalle_jornadas:
        jornadasMes,

      inconsistencias: [
        ...resumenMensual
          .jornadas_incompletas,
        ...resumenMensual
          .jornadas_con_diferencias,
      ],

      advertencias:
        resumenMensual.advertencias,
    },
  }
}

// =========================================================
// GET
// =========================================================
//
// Ejemplo:
// /api/admin/pesv/indicadores/ejlc?nit=...&anio=2026&mes=9
//
// =========================================================

export async function GET(request) {
  try {
    const { anio, mes } =
      obtenerParametrosDesdeUrl(request)

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request
      )

    const resultado =
      await calcularEjlc(
        supabase,
        anio,
        mes
      )

    return NextResponse.json({
      status: 'success',
      data: resultado,
    })
  } catch (error) {
    console.error(
      'Error GET /api/admin/pesv/indicadores/ejlc:',
      error
    )

    const respuesta =
      respuestaErrorEmpresa(error)

    return NextResponse.json(
      respuesta.body,
      { status: respuesta.status }
    )
  }
}

// =========================================================
// POST
// =========================================================
//
// También se admite POST para que el componente pueda enviar:
//
// {
//   nit: "...",
//   anio: 2026,
//   mes: 9
// }
//
// =========================================================

export async function POST(request) {
  try {
    const body =
      await request.json()

    const anio =
      entero(body?.anio)

    const mes =
      entero(body?.mes)

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request,
        body
      )

    const resultado =
      await calcularEjlc(
        supabase,
        anio,
        mes
      )

    return NextResponse.json({
      status: 'success',
      data: resultado,
    })
  } catch (error) {
    console.error(
      'Error POST /api/admin/pesv/indicadores/ejlc:',
      error
    )

    const respuesta =
      respuestaErrorEmpresa(error)

    return NextResponse.json(
      respuesta.body,
      { status: respuesta.status }
    )
  }
}
