// app/api/admin/mantenimientos/plan-mantenimiento/route.js
// PLAN DE MANTENIMIENTO - MATRIZ ANUAL POR VEHÍCULO / MES
// Multiempresa: usa obtenerSupabaseAdminEmpresaDesdeRequest(request).
//
// REGLAS CENTRALES:
// 1. El km base se CONGELA al generar el plan. El último preoperacional NO mueve
//    el punto de control en cada consulta.
// 2. El último preoperacional encontrado SIEMPRE se usa como km actual. Su antigüedad
//    no lo descarta ni deshabilita la proyección; solo puede informarse como dato.
// 3. EJECUTADO nunca se asigna manualmente: se acredita desde mantenimientos.
// 4. Cada actividad usa su frecuencia_km configurada y tolerancia_km.
// 5. Reprogramar mueve la obligación vigente en la matriz y conserva trazabilidad
//    en programacion_mantenimiento_novedades.
//  - programacion_mantenimiento usa únicamente columnas confirmadas del esquema real;
//    responsable/documento se registran en novedades, no en la programación.
// 6. Si el vehículo supera km_limite + tolerancia sin ejecución acreditada,
//    queda VENCIDO por KILOMETRAJE y no se oculta como simple reprogramación.
// 7. Una reprogramación válida antes del incumplimiento no genera incumplimiento.
// 8. Cuando una ejecución válida cierra un ciclo, el siguiente punto de control
//    parte del km REAL de esa ejecución, no del último preoperacional.

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

const MESES = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
]

const TOLERANCIA_KM_DEFAULT = 500
const MAX_DIAS_SIN_LECTURA_DEFAULT = 45

function respuestaError(error) {
  const respuesta = respuestaErrorEmpresa(error)
  return NextResponse.json(respuesta.body, { status: respuesta.status })
}

function texto(valor) {
  return String(valor ?? '').trim()
}

function clave(valor) {
  return texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function placaClave(valor) {
  return clave(valor).replace(/\s+/g, '')
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function entero(valor) {
  const n = numero(valor)
  return n === null ? null : Math.round(n)
}

function fechaISO(valor) {
  if (!valor) return null
  const s = String(valor).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

function hoyColombiaISO() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const m = Object.fromEntries(
    partes.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  )
  return `${m.year}-${m.month}-${m.day}`
}

function vigenciaActual() {
  return Number(hoyColombiaISO().slice(0, 4))
}

function fechaFinMes(vigencia, mes) {
  return new Date(Date.UTC(Number(vigencia), Number(mes), 0, 12))
    .toISOString().slice(0, 10)
}

function sumarMeses(fechaISOBase, meses) {
  const [a,m,d] = String(fechaISOBase).slice(0,10).split('-').map(Number)
  const fecha = new Date(Date.UTC(a, m - 1 + Number(meses || 0), Math.min(d || 1, 28)))
  return fecha.toISOString().slice(0,10)
}

function mesDeFecha(fecha) {
  const f = fechaISO(fecha)
  return f ? Number(f.slice(5, 7)) : null
}

function diasEntre(a, b) {
  if (!a || !b) return null
  const da = new Date(`${a}T12:00:00Z`)
  const db = new Date(`${b}T12:00:00Z`)
  return Math.round((db - da) / 86400000)
}

function sumarDias(fecha, dias) {
  if (!fecha || !Number.isFinite(Number(dias))) return null
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + Math.round(Number(dias)))
  return d.toISOString().slice(0, 10)
}

function restarDias(fecha, dias) {
  return sumarDias(fecha, -Number(dias || 0))
}

function esActivo(valor) {
  return ['ACTIVO', 'ACTIVA'].includes(clave(valor))
}

function configuracionActiva(valor) {
  return valor === true || valor === 1 || clave(valor) === 'TRUE' || clave(valor) === 'ACTIVO'
}

async function consultarTodo(queryBuilder, tamano = 1000) {
  const salida = []
  let desde = 0
  while (true) {
    const { data, error } = await queryBuilder(desde, desde + tamano - 1)
    if (error) throw error
    const lote = data || []
    salida.push(...lote)
    if (lote.length < tamano) break
    desde += tamano
  }
  return salida
}

function agrupar(filas, obtenerClave) {
  const mapa = new Map()
  for (const fila of filas || []) {
    const k = obtenerClave(fila)
    if (k === null || k === undefined || k === '') continue
    if (!mapa.has(k)) mapa.set(k, [])
    mapa.get(k).push(fila)
  }
  return mapa
}

function depurarLecturasPreoperacionales(filas) {
  const porDia = new Map()
  for (const fila of filas || []) {
    const fecha = fechaISO(fila.fecha_registro)
    const km = numero(fila.km_registro)
    if (!fecha || km === null || km < 0) continue
    const anterior = porDia.get(fecha)
    if (!anterior || km > anterior.km) {
      porDia.set(fecha, { id: fila.id, fecha, km })
    }
  }
  return [...porDia.values()].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.km - b.km
  )
}

function calcularPromedioVentana(lecturas, diasVentana) {
  if (!lecturas.length) return null
  const ultima = lecturas[lecturas.length - 1]
  const desde = restarDias(ultima.fecha, diasVentana)
  const ventana = lecturas.filter((x) => x.fecha >= desde && x.fecha <= ultima.fecha)

  const utiles = []
  let maxKm = -Infinity
  for (const x of ventana) {
    if (x.km < maxKm) continue
    utiles.push(x)
    maxKm = x.km
  }

  if (utiles.length < 2) return null
  const primera = utiles[0]
  const final = utiles[utiles.length - 1]
  const dias = diasEntre(primera.fecha, final.fecha)
  const recorrido = final.km - primera.km
  if (!dias || recorrido <= 0) return null
  return (recorrido / dias) * 30.4375
}

function calcularKilometraje(filas, hoyISO, maxDiasSinLectura) {
  const lecturas = depurarLecturasPreoperacionales(filas)
  if (!lecturas.length) {
    return {
      ultima_fecha: null,
      ultimo_km: null,
      promedio_km_mes: null,
      proyeccion_disponible: false,
      dias_desde_ultima_lectura: null,
    }
  }

  const ultima = lecturas[lecturas.length - 1]
  const p30 = calcularPromedioVentana(lecturas, 30)
  const p60 = calcularPromedioVentana(lecturas, 60)
  const p90 = calcularPromedioVentana(lecturas, 90)
  const candidatos = [
    { v: p30, p: 0.5 },
    { v: p60, p: 0.3 },
    { v: p90, p: 0.2 },
  ].filter((x) => numero(x.v) !== null && x.v > 0)
  const sumaPesos = candidatos.reduce((a, x) => a + x.p, 0)
  const promedio = sumaPesos
    ? candidatos.reduce((a, x) => a + x.v * (x.p / sumaPesos), 0)
    : null
  const diasUltima = Math.max(0, diasEntre(ultima.fecha, hoyISO) || 0)

  return {
    ultima_fecha: ultima.fecha,
    ultimo_km: ultima.km,
    promedio_km_mes: promedio === null ? null : Number(promedio.toFixed(2)),
    promedio_30: p30 === null ? null : Number(p30.toFixed(2)),
    promedio_60: p60 === null ? null : Number(p60.toFixed(2)),
    promedio_90: p90 === null ? null : Number(p90.toFixed(2)),
    // La última lectura disponible siempre es válida como km actual.
    // Su antigüedad NO deshabilita la proyección ni descarta el odómetro.
    proyeccion_disponible: promedio !== null,
    dias_desde_ultima_lectura: diasUltima,
  }
}

function proyectarFecha({ fechaReferencia, kmReferencia, kmObjetivo, promedioKmMes }) {
  const f = fechaISO(fechaReferencia)
  const base = numero(kmReferencia)
  const objetivo = numero(kmObjetivo)
  const promedio = numero(promedioKmMes)
  if (!f || base === null || objetivo === null || promedio === null || promedio <= 0) {
    return null
  }
  const restantes = objetivo - base
  if (restantes <= 0) return f
  return sumarDias(f, Math.ceil(restantes / (promedio / 30.4375)))
}

function proyectarFechaCicloMensual({
  fechaAncla,
  frecuenciaBase,
  puntosDesdeAncla,
  promedioKmMes,
}) {
  const f = fechaISO(fechaAncla)
  const frecuencia = numero(frecuenciaBase)
  const puntos = entero(puntosDesdeAncla)
  const promedio = numero(promedioKmMes)

  if (!f || frecuencia === null || !puntos || puntos < 1 || promedio === null || promedio <= 0) {
    return null
  }

  // El plan se expresa por meses. Se determina UNA SOLA VEZ la cadencia
  // mensual del punto maestro y luego se replica desde el ancla fija.
  // Ej.: 8.000 / 2.022 = 3,956 meses => cadencia de 4 meses.
  const mesesPorPunto = Math.max(1, Math.round(frecuencia / promedio))
  const inicioMesAncla = `${f.slice(0, 7)}-01`
  return sumarMeses(inicioMesAncla, mesesPorPunto * puntos)
}

function toleranciaDeConfig(config) {
  const t = entero(config?.tolerancia_km)
  return t !== null && t > 0 ? t : TOLERANCIA_KM_DEFAULT
}

function estadoVisibleProgramacion({ programacion, kmActual, hoyISO, ejecucion }) {
  if (ejecucion) return 'EJECUTADO'

  const estadoGuardado = clave(programacion.estado)
  if (estadoGuardado === 'SUSPENDIDO') return 'SUSPENDIDO'

  const objetivo = numero(programacion.km_limite)
  const tolerancia = entero(programacion.tolerancia_km_aplicada) ??
    entero(programacion._tolerancia_km) ?? TOLERANCIA_KM_DEFAULT

  if (objetivo !== null && kmActual !== null && kmActual > objetivo + tolerancia) {
    return 'VENCIDO'
  }

  const limiteFecha = fechaISO(programacion.fecha_limite) ||
    (programacion.vigencia && programacion.mes_programado
      ? fechaFinMes(programacion.vigencia, programacion.mes_programado)
      : null)

  if (limiteFecha && hoyISO > limiteFecha) return 'VENCIDO'
  return 'PROGRAMADO'
}

function obtenerEjecucionValida({ programacion, config, mantenimientosPorProgramacion, ejecutadasPorConfig }) {
  const frecuencia = numero(config?.frecuencia_km)
  const tolerancia = toleranciaDeConfig(config)
  const objetivo = numero(programacion.km_limite)
  const minimo = objetivo === null ? null : objetivo - tolerancia
  const maximo = objetivo === null ? null : objetivo + tolerancia

  const candidatos = []

  for (const m of mantenimientosPorProgramacion.get(Number(programacion.id)) || []) {
    candidatos.push({
      mantenimiento_id: m.id,
      fecha: fechaISO(m.fecha_registro),
      km: numero(m.kilometraje),
      tipo: m.tipo_mantenimiento,
      origen: 'MANTENIMIENTO_VINCULADO_PROGRAMACION',
    })
  }

  for (const e of ejecutadasPorConfig.get(Number(config.id)) || []) {
    candidatos.push({
      mantenimiento_id: e.mantenimiento_id,
      fecha: fechaISO(e.fecha_ejecucion),
      km: numero(e.km_ejecucion),
      tipo: 'PREVENTIVO',
      origen: 'ACTIVIDAD_EJECUTADA',
    })
  }

  const vistos = new Set()
  const ordenados = candidatos
    .filter((x) => {
      if (!x.mantenimiento_id || !x.fecha || x.km === null) return false
      const k = `${x.mantenimiento_id}-${x.km}`
      if (vistos.has(k)) return false
      vistos.add(k)
      return true
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.km - b.km)

  // La actividad debe corresponder al ciclo. La tolerancia evita acreditar
  // mantenimientos demasiado tempranos o demasiado tardíos como cumplimiento normal.
  const valida = ordenados.find((x) => {
    if (clave(x.tipo) && !clave(x.tipo).includes('PREVENT')) return false
    if (objetivo === null) return false
    return x.km >= minimo && x.km <= maximo
  })

  if (!valida) return null
  return {
    ...valida,
    frecuencia_km: frecuencia,
    km_objetivo: objetivo,
    tolerancia_km: tolerancia,
    ventana_desde_km: minimo,
    ventana_hasta_km: maximo,
  }
}

function resumirCelda(items) {
  if (!items.length) return null
  const total = items.length
  const ejecutadas = items.filter((x) => x.estado === 'EJECUTADO').length
  const vencidas = items.filter((x) => x.estado === 'VENCIDO').length
  const programadas = items.filter((x) => x.estado === 'PROGRAMADO').length

  let estado = 'PROGRAMADO'
  if (vencidas > 0) estado = 'VENCIDO'
  else if (ejecutadas === total) estado = 'EJECUTADO'
  else if (ejecutadas > 0) estado = 'PARCIAL'

  return { estado, total, ejecutadas, vencidas, programadas, actividades: items }
}

async function cargarContexto(supabase, vigencia, maxDiasSinLectura) {
  const hoyISO = hoyColombiaISO()

  const [rv, rp, rc, rcat, rprog, rmant, reja, rnov] = await Promise.all([
    supabase.from('vehiculos')
      .select('id,placa,tipo_vehiculo,marca,estado,clasificacion,modelo,linea')
      .order('placa'),
    supabase.from('vehiculo_mantenimiento_plan_estado')
      .select('*'),
    // Se consultan todas las configuraciones y se filtran después. Esto evita
    // perder configuraciones finalizadas por diferencias de serialización del campo activo.
    supabase.from('vehiculo_mantenimiento_config')
      .select('*'),
    supabase.from('mantenimiento_actividades_catalogo')
      .select('*').eq('activo', true),
    supabase.from('programacion_mantenimiento')
      .select('*').eq('vigencia', vigencia).order('id'),
    supabase.from('mantenimientos')
      .select('id,fecha_registro,placa,kilometraje,tipo_mantenimiento,programacion_mantenimiento_id,origen_registro'),
    supabase.from('mantenimiento_actividades_ejecutadas')
      .select('*'),
    supabase.from('programacion_mantenimiento_novedades')
      .select('*').order('created_at', { ascending: true }),
  ])

  for (const r of [rv, rp, rc, rcat, rprog, rmant, reja, rnov]) {
    if (r.error) throw r.error
  }

  const planPorVehiculo = new Map((rp.data || []).map((x) => [Number(x.vehiculo_id), x]))
  const vehiculos = (rv.data || []).filter((v) =>
    esActivo(v.estado) && clave(planPorVehiculo.get(Number(v.id))?.estado) === 'FINALIZADO'
  )
  const placas = vehiculos.map((x) => x.placa)

  const preoperacionales = placas.length
    ? await consultarTodo((desde, hasta) =>
        supabase.from('preoperacionales')
          .select('id,fecha_registro,timestamp_registro,placa,km_registro')
          .in('placa', placas)
          .order('fecha_registro')
          .order('id')
          .range(desde, hasta)
      )
    : []

  return {
    hoyISO,
    vehiculos,
    planPorVehiculo,
    configs: (rc.data || []).filter((x) => configuracionActiva(x.activo)),
    catalogo: rcat.data || [],
    programaciones: rprog.data || [],
    mantenimientos: rmant.data || [],
    ejecutadas: reja.data || [],
    novedades: rnov.data || [],
    preoperacionales,
    maxDiasSinLectura,
  }
}

async function sincronizarEjecucionesAutomaticas(supabase, contexto) {
  const configsPorId = new Map(contexto.configs.map((x) => [Number(x.id), x]))
  const mantenimientosPorProgramacion = agrupar(
    contexto.mantenimientos,
    (x) => Number(x.programacion_mantenimiento_id) || null
  )
  const ejecutadasPorConfig = agrupar(
    contexto.ejecutadas,
    (x) => Number(x.vehiculo_mantenimiento_config_id) || null
  )

  for (const p of contexto.programaciones) {
    if (clave(p.estado) === 'SUSPENDIDO') continue
    const config = configsPorId.get(Number(p.vehiculo_mantenimiento_config_id))
    if (!config) continue

    const ejecucion = obtenerEjecucionValida({
      programacion: p,
      config,
      mantenimientosPorProgramacion,
      ejecutadasPorConfig,
    })

    if (!ejecucion) continue

    if (clave(p.estado) !== 'EJECUTADO' || Number(p.mantenimiento_id) !== Number(ejecucion.mantenimiento_id)) {
      const { error } = await supabase.from('programacion_mantenimiento')
        .update({
          estado: 'EJECUTADO',
          mantenimiento_id: ejecucion.mantenimiento_id,
          fecha_ejecucion: ejecucion.fecha,
          km_ejecucion: ejecucion.km,
        })
        .eq('id', p.id)
      if (error) throw error
    }

    // El estado de la actividad queda acreditado desde la ejecución real.
    const existente = await supabase.from('vehiculo_mantenimiento_estado')
      .select('id').eq('vehiculo_mantenimiento_config_id', config.id).maybeSingle()
    if (existente.error) throw existente.error

    const datosEstado = {
      vehiculo_mantenimiento_config_id: config.id,
      fecha_ultima_ejecucion: ejecucion.fecha,
      km_ultima_ejecucion: ejecucion.km,
      mantenimiento_id: ejecucion.mantenimiento_id,
      origen: 'MANTENIMIENTO_REGISTRADO',
    }

    if (existente.data?.id) {
      const { error } = await supabase.from('vehiculo_mantenimiento_estado')
        .update(datosEstado).eq('id', existente.data.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('vehiculo_mantenimiento_estado')
        .insert(datosEstado)
      if (error) throw error
    }
  }
}

function construirMatriz(contexto) {
  const catalogoPorId = new Map(contexto.catalogo.map((x) => [Number(x.id), x]))
  const configsPorId = new Map(contexto.configs.map((x) => [Number(x.id), x]))
  const configsPorVehiculo = agrupar(contexto.configs, (x) => Number(x.vehiculo_id))
  const progPorVehiculo = agrupar(contexto.programaciones, (x) => Number(x.vehiculo_id))
  const preopPorPlaca = agrupar(contexto.preoperacionales, (x) => placaClave(x.placa))
  const mantenimientosPorProgramacion = agrupar(
    contexto.mantenimientos,
    (x) => Number(x.programacion_mantenimiento_id) || null
  )
  const ejecutadasPorConfig = agrupar(
    contexto.ejecutadas,
    (x) => Number(x.vehiculo_mantenimiento_config_id) || null
  )
  const novedadesPorProgramacion = agrupar(
    contexto.novedades,
    (x) => Number(x.programacion_mantenimiento_id) || null
  )

  return contexto.vehiculos.map((vehiculo) => {
    const km = calcularKilometraje(
      preopPorPlaca.get(placaClave(vehiculo.placa)) || [],
      contexto.hoyISO,
      contexto.maxDiasSinLectura
    )

    const programaciones = (progPorVehiculo.get(Number(vehiculo.id)) || [])
      // Las sustituidas/reprogramadas quedan en historial, no como obligación vigente.
      .filter((p) => clave(p.estado) !== 'SUSPENDIDO')
      .map((p) => {
        const config = configsPorId.get(Number(p.vehiculo_mantenimiento_config_id))
        if (!config) return null
        const actividad = catalogoPorId.get(Number(config.actividad_id))
        const ejecucion = obtenerEjecucionValida({
          programacion: p,
          config,
          mantenimientosPorProgramacion,
          ejecutadasPorConfig,
        })
        const estado = estadoVisibleProgramacion({
          programacion: { ...p, _tolerancia_km: toleranciaDeConfig(config) },
          kmActual: km.ultimo_km,
          hoyISO: contexto.hoyISO,
          ejecucion,
        })
        const mes = Number(p.mes_programado || mesDeFecha(p.fecha_programada) || mesDeFecha(p.fecha_limite))
        return {
          id: p.id,
          mes,
          mes_nombre: MESES[mes - 1] || null,
          estado,
          actividad_id: config.actividad_id,
          configuracion_id: config.id,
          actividad: actividad?.nombre || 'Actividad',
          accion: actividad?.accion || null,
          frecuencia_km: numero(config.frecuencia_km),
          tolerancia_km: toleranciaDeConfig(config),
          km_base: numero(p.km_base),
          km_objetivo: numero(p.km_limite),
          ventana_desde_km: numero(p.km_limite) === null ? null : numero(p.km_limite) - toleranciaDeConfig(config),
          ventana_hasta_km: numero(p.km_limite) === null ? null : numero(p.km_limite) + toleranciaDeConfig(config),
          fecha_programada: fechaISO(p.fecha_programada),
          fecha_limite: fechaISO(p.fecha_limite),
          tipo_vencimiento: p.tipo_vencimiento || null,
          ejecucion,
          novedades: novedadesPorProgramacion.get(Number(p.id)) || [],
        }
      })
      .filter((x) => x && x.mes >= 1 && x.mes <= 12)

    const meses = {}
    for (let m = 1; m <= 12; m += 1) {
      meses[MESES[m - 1]] = resumirCelda(programaciones.filter((x) => x.mes === m))
    }

    return {
      vehiculo: {
        id: vehiculo.id,
        placa: vehiculo.placa,
        marca: vehiculo.marca,
        linea: vehiculo.linea,
        modelo: vehiculo.modelo,
        tipo_vehiculo: vehiculo.tipo_vehiculo,
      },
      kilometraje: km,
      configuraciones_activas: (configsPorVehiculo.get(Number(vehiculo.id)) || []).length,
      meses,
      programaciones,
    }
  })
}

async function generarPlanInicial({ supabase, contexto, vigencia, responsable, documentoResponsable }) {
  const catalogoPorId = new Map(contexto.catalogo.map((x) => [Number(x.id), x]))
  const configsPorVehiculo = agrupar(contexto.configs, (x) => Number(x.vehiculo_id))
  const preopPorPlaca = agrupar(contexto.preoperacionales, (x) => placaClave(x.placa))

  // Para completar 2026/2027 sin duplicar obligaciones, se consideran todas las
  // programaciones existentes del vehículo/configuración, no solo la vigencia consultada.
  const { data: todasProgramaciones, error: errorTodas } = await supabase
    .from('programacion_mantenimiento')
    .select('*')
    .order('id')
  if (errorTodas) throw errorTodas

  const existentes = todasProgramaciones || []
  let creadas = 0
  const omitidas = []

  function esActividadBase(config) {
    const actividad = catalogoPorId.get(Number(config.actividad_id))
    const n = clave(actividad?.nombre)
    return n === 'ACEITE DE MOTOR Y FILTRO DE ACEITE' ||
      n === 'ACEITE DE MOTOR' ||
      n.includes('CAMBIO DE ACEITE')
  }

  function claveProgramacion(configId, kmObjetivo) {
    return `${Number(configId)}|${Math.round(Number(kmObjetivo))}`
  }

  // GENERAR / COMPLETAR es incremental: no reconstruye cadenas reprogramadas.
  // La reconstrucción de una reprogramación se hace inmediatamente en REPROGRAMAR
  // y únicamente para el vehículo afectado.

  const clavesExistentes = new Set(
    existentes
      .filter((p) =>
        p.vehiculo_mantenimiento_config_id &&
        numero(p.km_limite) !== null &&
        ['PROGRAMADO','EJECUTADO','VENCIDO'].includes(clave(p.estado))
      )
      .map((p) => claveProgramacion(p.vehiculo_mantenimiento_config_id, p.km_limite))
  )

  for (const vehiculo of contexto.vehiculos) {
    const configs = configsPorVehiculo.get(Number(vehiculo.id)) || []
    if (!configs.length) continue

    const configBase = configs.find(esActividadBase)
    const frecuenciaBase = entero(configBase?.frecuencia_km)
    if (!configBase || !frecuenciaBase || frecuenciaBase <= 0) {
      omitidas.push({
        vehiculo_id: vehiculo.id, placa: vehiculo.placa,
        motivo: 'SIN_FRECUENCIA_BASE_CAMBIO_ACEITE',
      })
      continue
    }

    const incompatibles = configs.filter((c) => {
      const f = entero(c.frecuencia_km)
      return !f || f < frecuenciaBase || f % frecuenciaBase !== 0
    })
    if (incompatibles.length) {
      omitidas.push({
        vehiculo_id: vehiculo.id, placa: vehiculo.placa,
        motivo: 'FRECUENCIAS_NO_MULTIPLOS_DE_LA_BASE',
        configuraciones: incompatibles.map((c) => c.id),
      })
      continue
    }

    const km = calcularKilometraje(
      preopPorPlaca.get(placaClave(vehiculo.placa)) || [],
      contexto.hoyISO,
      contexto.maxDiasSinLectura
    )
    if (km.ultimo_km === null || !km.ultima_fecha) {
      omitidas.push({ vehiculo_id: vehiculo.id, placa: vehiculo.placa, motivo: 'SIN_KILOMETRAJE_PREOPERACIONAL' })
      continue
    }
    if (!km.promedio_km_mes || km.promedio_km_mes <= 0) {
      omitidas.push({ vehiculo_id: vehiculo.id, placa: vehiculo.placa, motivo: 'SIN_PROMEDIO_KM_PARA_PROYECTAR' })
      continue
    }

    // El punto de partida se congela una sola vez. Si ya existe programación de
    // esta arquitectura, reutilizamos su km_base; de lo contrario usamos el último
    // preoperacional disponible al generar por primera vez.
    const progVehiculo = existentes
      .filter((p) => Number(p.vehiculo_id) === Number(vehiculo.id) &&
        p.vehiculo_mantenimiento_config_id &&
        numero(p.km_base) !== null)
      .sort((a, b) => Number(a.id) - Number(b.id))

    const kmBaseCongelado = progVehiculo.length
      ? numero(progVehiculo[0].km_base)
      : km.ultimo_km
    const fechaBaseCongelada = progVehiculo.length
      ? (fechaISO(progVehiculo[0].fecha_km_al_programar) || km.ultima_fecha)
      : km.ultima_fecha

    // Control anual mínimo: si no existe evidencia de mantenimiento preventivo
    // acreditado en los últimos 12 meses, se programa de inmediato el primer
    // punto del ciclo (actividades cuya frecuencia coincide con la frecuencia base).
    const mantenimientosVehiculo = (contexto.mantenimientos || [])
      .filter((m) => placaClave(m.placa) === placaClave(vehiculo.placa))
      .filter((m) => clave(m.tipo_mantenimiento).includes('PREVENT'))
      .filter((m) => fechaISO(m.fecha_registro))
      .sort((a,b) => fechaISO(b.fecha_registro).localeCompare(fechaISO(a.fecha_registro)))

    const ultimoPreventivo = mantenimientosVehiculo[0] || null
    const fechaUltimoPreventivo = fechaISO(ultimoPreventivo?.fecha_registro)
    const diasSinPreventivo = fechaUltimoPreventivo ? diasEntre(fechaUltimoPreventivo, contexto.hoyISO) : null
    const requierePreventivoInicial = !fechaUltimoPreventivo || diasSinPreventivo >= 365

    if (requierePreventivoInicial) {
      const anioInmediato = Number(contexto.hoyISO.slice(0,4))
      const mesInmediato = Number(contexto.hoyISO.slice(5,7))
      const actividadesIniciales = configs.filter((c) => entero(c.frecuencia_km) === frecuenciaBase)

      for (const config of actividadesIniciales) {
        const kmObjetivoInicial = km.ultimo_km
        const k = claveProgramacion(config.id, kmObjetivoInicial)
        const yaExisteInicial = existentes.some((p) =>
          Number(p.vehiculo_id) === Number(vehiculo.id) &&
          Number(p.vehiculo_mantenimiento_config_id) === Number(config.id) &&
          clave(p.estado) !== 'SUSPENDIDO' &&
          texto(p.observaciones).includes('Mantenimiento preventivo inicial')
        )
        if (yaExisteInicial || clavesExistentes.has(k)) continue

        const tolerancia = toleranciaDeConfig(config)
        const actividad = catalogoPorId.get(Number(config.actividad_id))
        const { error } = await supabase.from('programacion_mantenimiento').insert({
          vehiculo_id: vehiculo.id,
          vehiculo_mantenimiento_config_id: config.id,
          actividad_id: config.actividad_id,
          vigencia: anioInmediato,
          mes_programado: mesInmediato,
          fecha_programada: contexto.hoyISO,
          fecha_limite: fechaFinMes(anioInmediato, mesInmediato),
          km_base: km.ultimo_km,
          km_desde: Math.max(0, km.ultimo_km - tolerancia),
          km_limite: km.ultimo_km,
          km_objetivo_desde: Math.max(0, km.ultimo_km - tolerancia),
          km_objetivo_hasta: km.ultimo_km + tolerancia,
          km_al_programar: km.ultimo_km,
          fecha_km_al_programar: km.ultima_fecha,
          promedio_km_mes_al_programar: km.promedio_km_mes,
          fecha_estimada_al_programar: contexto.hoyISO,
          fecha_estimada_desde: contexto.hoyISO,
          fecha_estimada_hasta: fechaFinMes(anioInmediato, mesInmediato),
          estado: 'PROGRAMADO',
          tipo_vencimiento: 'CONTROL_ANUAL_PREVENTIVO',
          ciclo: 1,
          observaciones: `Mantenimiento preventivo inicial / Primer punto del ciclo. Sin evidencia preventiva acreditada en los últimos 12 meses. Actividad: ${actividad?.nombre || config.actividad_id}.`,
        })
        if (error) throw error
        clavesExistentes.add(k)
        creadas += 1
      }
    }

    // Generamos puntos maestros consecutivos de la frecuencia base hasta cubrir
    // el final del año siguiente a la vigencia solicitada. Esto permite que una
    // actividad de 12.000 reaparezca a 24.000, 36.000, etc.
    const anioHasta = vigenciaActual() + 2
    const fechaHasta = `${anioHasta}-12-31`
    const MAX_PUNTOS = 120

    // Si fue necesario crear un mantenimiento preventivo inicial inmediato,
    // éste constituye el punto maestro 1. La proyección continúa desde el 2.
    const anclasVehiculo = existentes
      .filter((p) =>
        Number(p.vehiculo_id) === Number(vehiculo.id) &&
        clave(p.estado) === 'PROGRAMADO' &&
        p.programacion_origen_id !== null &&
        p.programacion_origen_id !== undefined
      )
      .sort((a,b) => {
        const cicloDiff = Number(b.ciclo || 0) - Number(a.ciclo || 0)
        if (cicloDiff !== 0) return cicloDiff
        return Number(b.id || 0) - Number(a.id || 0)
      })

    const anclaMaestra = anclasVehiculo[0] || null
    const puntoInicialProyeccion = anclaMaestra
      ? Number(anclaMaestra.ciclo || 0) + 1
      : (requierePreventivoInicial ? 2 : 1)

    for (let punto = puntoInicialProyeccion; punto <= MAX_PUNTOS; punto += 1) {
      const desplazamientoKm = anclaMaestra
        ? frecuenciaBase * (punto - Number(anclaMaestra.ciclo || 0))
        : frecuenciaBase * punto
      const kmObjetivo = anclaMaestra && numero(anclaMaestra.km_limite) !== null
        ? numero(anclaMaestra.km_limite) + desplazamientoKm
        : kmBaseCongelado + desplazamientoKm
      const anclasReprogramadas = existentes
        .filter((p) =>
          Number(p.vehiculo_id) === Number(vehiculo.id) &&
          clave(p.estado) === 'PROGRAMADO' &&
          p.programacion_origen_id !== null &&
          p.programacion_origen_id !== undefined &&
          Number(p.ciclo || 0) < punto
        )
        .sort((a,b) => {
          const cicloDiff = Number(b.ciclo || 0) - Number(a.ciclo || 0)
          if (cicloDiff !== 0) return cicloDiff
          const fechaB = fechaISO(b.fecha_programada) || fechaISO(b.fecha_limite) || ''
          const fechaA = fechaISO(a.fecha_programada) || fechaISO(a.fecha_limite) || ''
          if (fechaB !== fechaA) return fechaB.localeCompare(fechaA)
          return Number(b.id || 0) - Number(a.id || 0)
        })

      const ancla = anclasReprogramadas[0] || null
      const fechaAnclaProgramada = ancla
        ? (fechaISO(ancla.fecha_programada) || fechaISO(ancla.fecha_limite))
        : null
      const fechaReferenciaProyeccion = fechaAnclaProgramada
        ? `${fechaAnclaProgramada.slice(0, 7)}-01`
        : fechaBaseCongelada
      const kmReferenciaProyeccion = ancla && numero(ancla.km_limite) !== null
        ? numero(ancla.km_limite)
        : kmBaseCongelado

      const kmPendientesDesdeAncla = Math.max(0, kmObjetivo - kmReferenciaProyeccion)
      const puntosDesdeAncla = ancla
        ? punto - Number(ancla.ciclo || 0)
        : null
      const fechaProyectada = ancla
        ? proyectarFechaCicloMensual({
            fechaAncla: fechaReferenciaProyeccion,
            frecuenciaBase,
            puntosDesdeAncla,
            promedioKmMes: km.promedio_km_mes,
          })
        : proyectarFecha({
            fechaReferencia: fechaReferenciaProyeccion,
            kmReferencia: kmObjetivo - kmPendientesDesdeAncla,
            kmObjetivo,
            promedioKmMes: km.promedio_km_mes,
          })
      if (!fechaProyectada) break
      if (fechaProyectada > fechaHasta) break

      const vigenciaProgramada = Number(fechaProyectada.slice(0, 4))
      const mes = Number(fechaProyectada.slice(5, 7))

      // En cada punto maestro entran TODAS las actividades cuya frecuencia divide
      // exactamente el desplazamiento acumulado desde el km base.
      const actividadesDelPunto = configs.filter((config) => {
        const frecuencia = entero(config.frecuencia_km)
        return frecuencia && desplazamientoKm % frecuencia === 0
      })

      for (const config of actividadesDelPunto) {
        const k = claveProgramacion(config.id, kmObjetivo)
        if (clavesExistentes.has(k)) continue

        const actividad = catalogoPorId.get(Number(config.actividad_id))
        const tolerancia = toleranciaDeConfig(config)

        const { error } = await supabase.from('programacion_mantenimiento').insert({
          vehiculo_id: vehiculo.id,
          vehiculo_mantenimiento_config_id: config.id,
          actividad_id: config.actividad_id,
          vigencia: vigenciaProgramada,
          mes_programado: mes,
          fecha_programada: fechaProyectada,
          fecha_limite: fechaFinMes(vigenciaProgramada, mes),
          km_base: kmBaseCongelado,
          km_desde: kmObjetivo - tolerancia,
          km_limite: kmObjetivo,
          km_objetivo_desde: kmObjetivo - tolerancia,
          km_objetivo_hasta: kmObjetivo + tolerancia,
          km_al_programar: km.ultimo_km,
          fecha_km_al_programar: km.ultima_fecha,
          promedio_km_mes_al_programar: km.promedio_km_mes,
          fecha_estimada_al_programar: fechaProyectada,
          fecha_estimada_desde: proyectarFecha({
            fechaReferencia: fechaReferenciaProyeccion,
            kmReferencia: kmReferenciaProyeccion,
            kmObjetivo: kmObjetivo - tolerancia,
            promedioKmMes: km.promedio_km_mes,
          }),
          fecha_estimada_hasta: proyectarFecha({
            fechaReferencia: fechaReferenciaProyeccion,
            kmReferencia: kmReferenciaProyeccion,
            kmObjetivo: kmObjetivo + tolerancia,
            promedioKmMes: km.promedio_km_mes,
          }),
          estado: 'PROGRAMADO',
          tipo_vencimiento: 'KILOMETRAJE',
          ciclo: punto,
          observaciones: `Punto maestro ${punto}. Base ${formatoKm(kmBaseCongelado)} km + ${formatoKm(desplazamientoKm)} km. Actividad: ${actividad?.nombre || config.actividad_id}.`,
        })
        if (error) throw error
        clavesExistentes.add(k)
        creadas += 1
      }
    }
  }

  return { creadas, omitidas }
}

function formatoKm(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? Math.round(n).toLocaleString('es-CO') : String(valor ?? '')
}

async function reprogramar({
  supabase, programacionId, nuevoMes, nuevaVigencia, motivo, justificacion,
  responsable, documentoResponsable,
}) {
  const { data: original, error: e1 } = await supabase.from('programacion_mantenimiento')
    .select('*').eq('id', programacionId).single()
  if (e1) throw e1
  if (clave(original.estado) === 'EJECUTADO') throw Object.assign(new Error('Una programación ejecutada no se puede reprogramar.'), { status: 400 })
  if (clave(original.estado) === 'SUSPENDIDO') throw Object.assign(new Error('Esta programación ya fue sustituida por una reprogramación.'), { status: 400 })

  const mes=Number(nuevoMes), anio=Number(nuevaVigencia)
  if (!Number.isInteger(mes)||mes<1||mes>12||!Number.isInteger(anio)) {
    throw Object.assign(new Error('Debe seleccionar una vigencia y un mes válidos.'), {status:400})
  }
  if (!texto(motivo)||!texto(justificacion)) throw Object.assign(new Error('Motivo y justificación son obligatorios.'), {status:400})

  const fechaOriginal=fechaISO(original.fecha_programada)||fechaISO(original.fecha_limite)||`${original.vigencia}-${String(original.mes_programado).padStart(2,'0')}-01`
  const fechaDestino=fechaFinMes(anio,mes)
  const motivoClave=clave(motivo)
  const esAnticipacion=motivoClave==='ANTICIPACION POR MAYOR RECORRIDO'
  const hoy=hoyColombiaISO()
  const inicioMesActual=`${hoy.slice(0,7)}-01`
  const limiteAnticipacion=sumarMeses(inicioMesActual,-1)

  if (esAnticipacion) {
    if (fechaDestino >= fechaOriginal) throw Object.assign(new Error('Una anticipación debe quedar antes de la programación vigente.'), {status:400})
    if (fechaDestino < limiteAnticipacion) throw Object.assign(new Error(`La anticipación no puede programarse antes de ${limiteAnticipacion.slice(0,7)}.`), {status:400})
  } else if (fechaDestino <= fechaOriginal) {
    throw Object.assign(new Error('Para este motivo la nueva programación debe ser posterior a la programación vigente.'), {status:400})
  }

  const {data:vehiculo,error:e2}=await supabase.from('vehiculos').select('id,placa').eq('id',original.vehiculo_id).single()
  if(e2) throw e2
  const {data:lecturas,error:e3}=await supabase.from('preoperacionales').select('id,fecha_registro,km_registro,placa')
    .eq('placa',vehiculo.placa).order('fecha_registro',{ascending:false}).limit(1000)
  if(e3) throw e3
  const kmInfo=calcularKilometraje(lecturas||[],hoyColombiaISO(),MAX_DIAS_SIN_LECTURA_DEFAULT)

  const {data:punto,error:e4}=await supabase.from('programacion_mantenimiento').select('*')
    .eq('vehiculo_id',original.vehiculo_id).eq('ciclo',original.ciclo).eq('km_limite',original.km_limite)
    .neq('estado','SUSPENDIDO').order('id')
  if(e4) throw e4
  const obligaciones=(punto||[]).filter(p=>!['EJECUTADO','SUSPENDIDO'].includes(clave(p.estado)))
  if(!obligaciones.length) throw Object.assign(new Error('El punto maestro ya no tiene obligaciones pendientes.'),{status:400})

  const ids=[...new Set(obligaciones.map(p=>Number(p.vehiculo_mantenimiento_config_id)).filter(Boolean))]
  const {data:configs,error:e5}=ids.length?await supabase.from('vehiculo_mantenimiento_config').select('*').in('id',ids):{data:[],error:null}
  if(e5) throw e5
  const cfg=new Map((configs||[]).map(c=>[Number(c.id),c]))
  const excedido=obligaciones.some(p=>{
    const objetivo=numero(p.km_limite),tol=toleranciaDeConfig(cfg.get(Number(p.vehiculo_mantenimiento_config_id)))
    return objetivo!==null&&kmInfo.ultimo_km!==null&&kmInfo.ultimo_km>objetivo+tol
  })

  const estadoOriginal=excedido?'VENCIDO':'SUSPENDIDO'
  const nuevas=[]
  for(const p of obligaciones){
    const c=cfg.get(Number(p.vehiculo_mantenimiento_config_id)),tol=toleranciaDeConfig(c)
    const {data:nueva,error}=await supabase.from('programacion_mantenimiento').insert({
      vehiculo_id:p.vehiculo_id,vehiculo_mantenimiento_config_id:p.vehiculo_mantenimiento_config_id,
      actividad_id:p.actividad_id,vigencia:anio,mes_programado:mes,fecha_programada:fechaDestino,
      fecha_limite:fechaDestino,km_base:p.km_base,km_desde:p.km_desde,km_limite:p.km_limite,
      km_objetivo_desde:p.km_objetivo_desde??(numero(p.km_limite)===null?null:numero(p.km_limite)-tol),
      km_objetivo_hasta:p.km_objetivo_hasta??(numero(p.km_limite)===null?null:numero(p.km_limite)+tol),
      km_al_programar:kmInfo.ultimo_km,fecha_km_al_programar:kmInfo.ultima_fecha,
      promedio_km_mes_al_programar:kmInfo.promedio_km_mes,fecha_estimada_al_programar:fechaDestino,
      fecha_estimada_desde:p.fecha_estimada_desde,fecha_estimada_hasta:p.fecha_estimada_hasta,
      programacion_origen_id:p.id,estado:'PROGRAMADO',tipo_vencimiento:p.tipo_vencimiento||'KILOMETRAJE',
      ciclo:p.ciclo||1,
      observaciones:`REPROGRAMACION_ANCLA | Reprogramación del punto maestro ${p.ciclo}. Origen ${p.id}. ${texto(justificacion)}`,
    }).select('*').single()
    if(error) throw error
    nuevas.push(nueva)
    const {error:eu}=await supabase.from('programacion_mantenimiento').update({estado:estadoOriginal}).eq('id',p.id)
    if(eu) throw eu
    const {error:en}=await supabase.from('programacion_mantenimiento_novedades').insert({
      programacion_mantenimiento_id:p.id,
      tipo_novedad:excedido?'REPROGRAMACION_CON_INCUMPLIMIENTO_KM':(esAnticipacion?'ANTICIPACION_PUNTO_MAESTRO':'REPROGRAMACION_PUNTO_MAESTRO'),
      estado_anterior:p.estado,estado_nuevo:estadoOriginal,motivo:texto(motivo),
      justificacion:`${texto(justificacion)} | Nueva programación: ${nueva.id} | Destino: ${MESES[mes-1]} ${anio}`,
      km_registrado:kmInfo.ultimo_km,fecha_km:kmInfo.ultima_fecha,responsable:responsable||null,documento_responsable:documentoResponsable||null,
    })
    if(en) throw en
  }

  // Invalidar únicamente las proyecciones FUTURAS todavía no ejecutadas.
  // Si una reprogramación cambia un punto maestro, los puntos posteriores que
  // habían sido calculados antes ya no deben bloquear la reconstrucción.
  // Se conservan en la base como trazabilidad, pero quedan SUSPENDIDO.
  const { data: futuras, error: errorFuturas } = await supabase
    .from('programacion_mantenimiento')
    .select('id,ciclo,estado')
    .eq('vehiculo_id', original.vehiculo_id)
    .gt('ciclo', Number(original.ciclo || 0))
    .eq('estado', 'PROGRAMADO')
    .order('ciclo')
    .order('id')
  if (errorFuturas) throw errorFuturas

  let proyeccionesInvalidadas = 0
  for (const futura of futuras || []) {
    const { error: errorSuspender } = await supabase
      .from('programacion_mantenimiento')
      .update({ estado: 'SUSPENDIDO' })
      .eq('id', futura.id)
    if (errorSuspender) throw errorSuspender

    const { error: errorNovedad } = await supabase
      .from('programacion_mantenimiento_novedades')
      .insert({
        programacion_mantenimiento_id: futura.id,
        tipo_novedad: 'RECALCULO_CADENA_FUTURA',
        estado_anterior: futura.estado,
        estado_nuevo: 'SUSPENDIDO',
        motivo: 'REPROGRAMACION_DE_PUNTO_MAESTRO_ANTERIOR',
        justificacion: `Proyección futura sustituida por recálculo originado en el punto maestro ${original.ciclo}.`,
        km_registrado: kmInfo.ultimo_km,
        fecha_km: kmInfo.ultima_fecha,
        responsable: responsable || null,
        documento_responsable: documentoResponsable || null,
      })
    if (errorNovedad) throw errorNovedad
    proyeccionesInvalidadas += 1
  }

  const anclaNueva = nuevas
    .slice()
    .sort((a,b) => Number(a.id || 0) - Number(b.id || 0))[0]

  const reconstruccion = await reconstruirCadenaVehiculoDesdeAncla({
    supabase,
    ancla: anclaNueva,
    responsable,
    documentoResponsable,
  })

  return {
    punto_maestro: original.ciclo,
    programaciones_reprogramadas: nuevas.length,
    nuevas_ids: nuevas.map(x=>x.id),
    incumplimiento_km: excedido,
    proyecciones_futuras_invalidadas: proyeccionesInvalidadas,
    cadena_recalculada: reconstruccion,
  }
}


async function reconstruirCadenaVehiculoDesdeAncla({
  supabase,
  ancla,
  responsable,
  documentoResponsable,
}) {
  const vehiculoId = Number(ancla.vehiculo_id)
  const cicloAncla = Number(ancla.ciclo || 0)
  const fechaAncla = fechaISO(ancla.fecha_programada) || fechaISO(ancla.fecha_limite)
  const kmAncla = numero(ancla.km_limite)
  if (!vehiculoId || !fechaAncla || kmAncla === null) {
    throw Object.assign(new Error('No fue posible determinar el ancla de la reprogramación.'), { status: 400 })
  }

  const { data: vehiculo, error: ev } = await supabase
    .from('vehiculos').select('id,placa').eq('id', vehiculoId).single()
  if (ev) throw ev

  const { data: configs, error: ec } = await supabase
    .from('vehiculo_mantenimiento_config')
    .select('*,actividad:mantenimiento_actividades_catalogo(id,nombre,tipo_vehiculo,activo)')
    .eq('vehiculo_id', vehiculoId).eq('activo', true)
  if (ec) throw ec

  const configsActivas = (configs || []).filter(c => c.actividad && c.actividad.activo !== false)
  const configAceite = configsActivas
    .filter(c => esCambioAceite(c.actividad?.nombre))
    .sort((a,b) => Number(a.id)-Number(b.id))[0]
  const frecuenciaBase = entero(configAceite?.frecuencia_km)
  if (!frecuenciaBase) throw Object.assign(new Error('El vehículo no tiene frecuencia base válida.'), { status: 400 })

  const { data: lecturas, error: el } = await supabase
    .from('preoperacionales')
    .select('id,fecha_registro,km_registro,placa')
    .eq('placa', vehiculo.placa)
    .order('fecha_registro', { ascending: false })
    .limit(1000)
  if (el) throw el
  const kmInfo = calcularKilometraje(lecturas || [], hoyColombiaISO(), MAX_DIAS_SIN_LECTURA_DEFAULT)
  const promedio = numero(kmInfo.promedio_km_mes)
  if (!promedio || promedio <= 0) {
    throw Object.assign(new Error('No hay promedio de kilometraje suficiente para recalcular la cadena futura.'), { status: 400 })
  }

  // Suspender únicamente proyecciones futuras todavía no ejecutadas.
  const { data: futuras, error: ef } = await supabase
    .from('programacion_mantenimiento')
    .select('*')
    .eq('vehiculo_id', vehiculoId)
    .gt('ciclo', cicloAncla)
    .eq('estado', 'PROGRAMADO')
    .order('ciclo')
    .order('id')
  if (ef) throw ef

  for (const futura of futuras || []) {
    const { error: es } = await supabase
      .from('programacion_mantenimiento')
      .update({ estado: 'SUSPENDIDO' })
      .eq('id', futura.id)
    if (es) throw es

    const { error: en } = await supabase.from('programacion_mantenimiento_novedades').insert({
      programacion_mantenimiento_id: futura.id,
      tipo_novedad: 'RECALCULO_CADENA_FUTURA',
      estado_anterior: 'PROGRAMADO',
      estado_nuevo: 'SUSPENDIDO',
      motivo: 'REPROGRAMACION_DE_PUNTO_MAESTRO_ANTERIOR',
      justificacion: `Proyección sustituida por recálculo desde programación ${ancla.id}, ciclo ${cicloAncla}.`,
      km_registrado: kmInfo.ultimo_km,
      fecha_km: kmInfo.ultima_fecha,
      responsable: responsable || null,
      documento_responsable: documentoResponsable || null,
    })
    if (en) throw en
  }

  const fechaHasta = `${vigenciaActual() + 2}-12-31`
  const configsPorFrecuencia = configsActivas
    .map(c => ({...c, frecuencia: entero(c.frecuencia_km)}))
    .filter(c => c.frecuencia && c.frecuencia >= frecuenciaBase && c.frecuencia % frecuenciaBase === 0)

  const creadas = []
  // Solo iteramos los puntos que razonablemente caben en el horizonte.
  const mesesHorizonte = Math.max(1, diasEntre(fechaAncla, fechaHasta) / 30.4375)
  const kmHorizonte = promedio * mesesHorizonte
  const puntosNecesarios = Math.min(120, Math.ceil(kmHorizonte / frecuenciaBase) + 2)

  for (let offset = 1; offset <= puntosNecesarios; offset += 1) {
    const ciclo = cicloAncla + offset
    const kmObjetivo = kmAncla + frecuenciaBase * offset
    const fechaReferenciaAncla = `${fechaAncla.slice(0, 7)}-01`
    const fechaProyectada = proyectarFechaCicloMensual({
      fechaAncla: fechaReferenciaAncla,
      frecuenciaBase,
      puntosDesdeAncla: offset,
      promedioKmMes: promedio,
    })
    if (!fechaProyectada || fechaProyectada > fechaHasta) break

    const vigencia = Number(fechaProyectada.slice(0,4))
    const mes = Number(fechaProyectada.slice(5,7))
    const fechaProgramada = fechaFinMes(vigencia, mes)

    const actividadesPunto = configsPorFrecuencia.filter(c =>
      ((frecuenciaBase * ciclo) % c.frecuencia) === 0
    )

    for (const config of actividadesPunto) {
      const tolerancia = toleranciaDeConfig(config)
      const { data: nueva, error: ei } = await supabase
        .from('programacion_mantenimiento')
        .insert({
          vehiculo_id: vehiculoId,
          vehiculo_mantenimiento_config_id: config.id,
          actividad_id: config.actividad_id,
          vigencia,
          mes_programado: mes,
          fecha_programada: fechaProgramada,
          fecha_limite: fechaProgramada,
          km_base: ancla.km_base,
          km_desde: kmObjetivo - tolerancia,
          km_limite: kmObjetivo,
          km_objetivo_desde: kmObjetivo - tolerancia,
          km_objetivo_hasta: kmObjetivo + tolerancia,
          km_al_programar: kmInfo.ultimo_km,
          fecha_km_al_programar: kmInfo.ultima_fecha,
          promedio_km_mes_al_programar: promedio,
          fecha_estimada_al_programar: fechaProyectada,
          fecha_estimada_desde: proyectarFecha({
            fechaReferencia: fechaReferenciaAncla,
            kmReferencia: kmAncla,
            kmObjetivo: kmObjetivo - tolerancia,
            promedioKmMes: promedio,
          }),
          fecha_estimada_hasta: proyectarFecha({
            fechaReferencia: fechaReferenciaAncla,
            kmReferencia: kmAncla,
            kmObjetivo: kmObjetivo + tolerancia,
            promedioKmMes: promedio,
          }),
          programacion_origen_id: ancla.id,
          estado: 'PROGRAMADO',
          tipo_vencimiento: 'KILOMETRAJE',
          ciclo,
          observaciones: `Cadena recalculada desde reprogramación ${ancla.id}, ciclo ${cicloAncla}.`,
        })
        .select('*').single()
      if (ei) throw ei
      creadas.push(nueva)
    }
  }

  return {
    suspendidas: (futuras || []).length,
    creadas: creadas.length,
    hasta: vigenciaActual() + 2,
  }
}

async function registrarGestionVencido({
  supabase,
  programacionId,
  motivo,
  justificacion,
  responsable,
  documentoResponsable,
}) {
  const { data: p, error } = await supabase.from('programacion_mantenimiento')
    .select('*').eq('id', programacionId).single()
  if (error) throw error
  if (clave(p.estado) === 'EJECUTADO') {
    throw Object.assign(new Error('Una programación ejecutada no requiere gestión de vencimiento.'), { status: 400 })
  }
  if (!texto(motivo) || !texto(justificacion)) {
    throw Object.assign(new Error('Motivo y justificación son obligatorios.'), { status: 400 })
  }

  const { error: e2 } = await supabase.from('programacion_mantenimiento_novedades').insert({
    programacion_mantenimiento_id: p.id,
    tipo_novedad: 'GESTION_VENCIMIENTO',
    estado_anterior: p.estado,
    estado_nuevo: 'VENCIDO',
    motivo: texto(motivo),
    justificacion: texto(justificacion),
    responsable: responsable || null,
    documento_responsable: documentoResponsable || null,
  })
  if (e2) throw e2

  const { error: e3 } = await supabase.from('programacion_mantenimiento')
    .update({ estado: 'VENCIDO' }).eq('id', p.id)
  if (e3) throw e3

  return { programacion_id: p.id }
}

export async function GET(request) {
  try {
    const { supabaseAdmin, nit } = await obtenerSupabaseAdminEmpresaDesdeRequest(request)
    const { searchParams } = new URL(request.url)
    const vigencia = Number(searchParams.get('vigencia') || vigenciaActual())
    // Compatibilidad con llamadas anteriores: ya no se bloquea una lectura por antigüedad.
    const maxDiasSinLectura = MAX_DIAS_SIN_LECTURA_DEFAULT

    let contexto = await cargarContexto(supabaseAdmin, vigencia, maxDiasSinLectura)

    // Sincronización automática: la consulta puede reconocer ejecuciones ya registradas,
    // pero el usuario nunca dispone de una acción manual "Ejecutar".
    await sincronizarEjecucionesAutomaticas(supabaseAdmin, contexto)
    contexto = await cargarContexto(supabaseAdmin, vigencia, maxDiasSinLectura)

    const matriz = construirMatriz(contexto)

    const { data: vigenciasData, error: vigenciasError } = await supabaseAdmin
      .from('programacion_mantenimiento').select('vigencia')
    if (vigenciasError) throw vigenciasError
    const actual = vigenciaActual()
    const vigenciasDisponibles = [...new Set([
      ...(vigenciasData || []).map(x => Number(x.vigencia)).filter(Number.isFinite),
      actual,
    ])].filter(x => x <= actual + 2).sort((a,b)=>a-b)

    return NextResponse.json({
      status: 'success',
      nitEmpresa: nit,
      vigencia,
      fecha_referencia_colombia: contexto.hoyISO,
      meses: MESES,
      vigencias_disponibles: vigenciasDisponibles,
      horizonte_programacion: actual + 2,
      reglas: {
        tolerancia_km_default: TOLERANCIA_KM_DEFAULT,
        ejecucion_manual_permitida: false,
        km_base_movil: false,
        reprogramacion_conserva_trazabilidad: true,
      },
      resumen: {
        vehiculos: matriz.length,
        programadas: matriz.reduce((a, v) => a + v.programaciones.filter((p) => p.estado === 'PROGRAMADO').length, 0),
        ejecutadas: matriz.reduce((a, v) => a + v.programaciones.filter((p) => p.estado === 'EJECUTADO').length, 0),
        vencidas: matriz.reduce((a, v) => a + v.programaciones.filter((p) => p.estado === 'VENCIDO').length, 0),
      },
      vehiculos: matriz,
    })
  } catch (error) {
    console.error('Error GET Plan de Mantenimiento:', error)
    return respuestaError(error)
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { supabaseAdmin, nit } = await obtenerSupabaseAdminEmpresaDesdeRequest(request, body)
    const accion = clave(body.accion)
    const vigencia = Number(body.vigencia || vigenciaActual())

    if (accion === 'GENERAR_PLAN') {
      const contexto = await cargarContexto(
        supabaseAdmin,
        vigencia,
        MAX_DIAS_SIN_LECTURA_DEFAULT
      )
      const resultado = await generarPlanInicial({
        supabase: supabaseAdmin,
        contexto,
        vigencia,
        responsable: texto(body.responsable),
        documentoResponsable: texto(body.documento_responsable),
      })
      return NextResponse.json({
        status: 'success', nitEmpresa: nit,
        message: `Plan generado. Programaciones creadas: ${resultado.creadas}.`,
        ...resultado,
      })
    }

    if (accion === 'REPROGRAMAR') {
      const resultado = await reprogramar({
        supabase: supabaseAdmin,
        programacionId: Number(body.programacion_id),
        nuevoMes: Number(body.nuevo_mes),
        nuevaVigencia: Number(body.nueva_vigencia),
        motivo: body.motivo,
        justificacion: body.justificacion,
        responsable: texto(body.responsable),
        documentoResponsable: texto(body.documento_responsable),
      })
      return NextResponse.json({
        status: 'success', nitEmpresa: nit,
        message: resultado.incumplimiento_km
          ? `Reprogramación creada. Se conserva el incumplimiento original y se recalculó únicamente la cadena futura del vehículo hasta ${vigenciaActual()+2}.`
          : `Reprogramación registrada y cadena futura del vehículo recalculada inmediatamente hasta ${vigenciaActual()+2}.`,
        ...resultado,
      })
    }

    if (accion === 'GESTIONAR_VENCIDO') {
      const resultado = await registrarGestionVencido({
        supabase: supabaseAdmin,
        programacionId: Number(body.programacion_id),
        motivo: body.motivo,
        justificacion: body.justificacion,
        responsable: texto(body.responsable),
        documentoResponsable: texto(body.documento_responsable),
      })
      return NextResponse.json({
        status: 'success', nitEmpresa: nit,
        message: 'La gestión del vencimiento quedó registrada.',
        ...resultado,
      })
    }

    return NextResponse.json(
      {
        status: 'failed',
        code: 'ACCION_NO_VALIDA',
        message: 'Acción no válida para el Plan de Mantenimiento.',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error POST Plan de Mantenimiento:', error)
    if (error?.status && error.status < 500) {
      return NextResponse.json(
        { status: 'failed', message: error.message },
        { status: error.status }
      )
    }
    return respuestaError(error)
  }
}
