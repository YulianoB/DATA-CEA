// app/api/admin/mantenimientos/plan-mantenimiento/route.js
// NUEVO MODELO:
// - No almacena proyecciones futuras.
// - P1, P2, P3... se proyectan automáticamente desde configuración + mantenimientos reales + preoperacionales.
// - programacion_mantenimiento conserva únicamente hechos materializados:
//   EJECUTADO o VENCIDO.
// - La fecha/mes proyectado NO define el incumplimiento.
// - El vencimiento se determina por km objetivo + tolerancia.
// - GET es estrictamente de lectura.
// - Sin reprogramaciones, novedades, reconstrucciones ni escrituras en GET.

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
const HORIZONTE_ANIOS = 2
const MAX_PUNTOS_PROYECCION = 120

const BUCKET_EMPRESA = 'empresa'
const DURACION_URL_LOGO = 60 * 60

async function obtenerLogo(supabase) {
  const {
    data: configuracion,
    error,
  } = await supabase
    .from('configuracion_empresa')
    .select('logo_actual_path')
    .eq('clave', 'GENERAL')
    .maybeSingle()

  if (error) throw error

  const path = texto(
    configuracion?.logo_actual_path
  )

  if (!path) {
    return {
      path: '',
      url: '',
    }
  }

  const {
    data: urlFirmada,
    error: errorUrl,
  } = await supabase
    .storage
    .from(BUCKET_EMPRESA)
    .createSignedUrl(
      path,
      DURACION_URL_LOGO
    )

  if (errorUrl) {
    console.error(
      'No fue posible generar URL del logo:',
      errorUrl
    )

    return {
      path,
      url: '',
    }
  }

  return {
    path,
    url: texto(urlFirmada?.signedUrl),
  }
}

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
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const m = Object.fromEntries(
    partes
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  )

  return `${m.year}-${m.month}-${m.day}`
}

function vigenciaActual() {
  return Number(hoyColombiaISO().slice(0, 4))
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
  return (
    valor === true ||
    valor === 1 ||
    clave(valor) === 'TRUE' ||
    clave(valor) === 'ACTIVO'
  )
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

async function consultarTodo(queryBuilder, tamano = 1000) {
  const salida = []
  let desde = 0

  while (true) {
    const { data, error } = await queryBuilder(
      desde,
      desde + tamano - 1
    )

    if (error) throw error

    const lote = data || []
    salida.push(...lote)

    if (lote.length < tamano) break
    desde += tamano
  }

  return salida
}

function depurarLecturasPreoperacionales(filas) {
  const porDia = new Map()

  for (const fila of filas || []) {
    const fecha = fechaISO(fila.fecha_registro)
    const km = numero(fila.km_registro)

    if (!fecha || km === null || km < 0) continue

    const anterior = porDia.get(fecha)

    // Si existen varias inspecciones el mismo día,
    // se conserva el mayor odómetro registrado.
    if (!anterior || km > anterior.km) {
      porDia.set(fecha, {
        id: fila.id,
        fecha,
        km,
      })
    }
  }

  return [...porDia.values()].sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      a.km - b.km
  )
}

function calcularPromedioVentana(lecturas, diasVentana) {
  if (!lecturas.length) return null

  const ultima = lecturas[lecturas.length - 1]
  const desde = restarDias(ultima.fecha, diasVentana)

  const ventana = lecturas.filter(
    (x) =>
      x.fecha >= desde &&
      x.fecha <= ultima.fecha
  )

  // Evita que una lectura menor posterior distorsione
  // el recorrido cuando existe un error de digitación.
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

function calcularKilometraje(filas, hoyISO) {
  const lecturas = depurarLecturasPreoperacionales(filas)

  if (!lecturas.length) {
    return {
      ultima_fecha: null,
      ultimo_km: null,
      promedio_km_mes: null,
      promedio_30: null,
      promedio_60: null,
      promedio_90: null,
      dias_desde_ultima_lectura: null,
      proyeccion_disponible: false,
    }
  }

  const ultima = lecturas[lecturas.length - 1]

  const p30 = calcularPromedioVentana(lecturas, 30)
  const p60 = calcularPromedioVentana(lecturas, 60)
  const p90 = calcularPromedioVentana(lecturas, 90)

  const candidatos = [
    { valor: p30, peso: 0.5 },
    { valor: p60, peso: 0.3 },
    { valor: p90, peso: 0.2 },
  ].filter(
    (x) =>
      numero(x.valor) !== null &&
      x.valor > 0
  )

  const sumaPesos = candidatos.reduce(
    (acc, x) => acc + x.peso,
    0
  )

  const promedio = sumaPesos
    ? candidatos.reduce(
        (acc, x) =>
          acc + x.valor * (x.peso / sumaPesos),
        0
      )
    : null

  return {
    ultima_fecha: ultima.fecha,
    ultimo_km: ultima.km,
    promedio_km_mes:
      promedio === null
        ? null
        : Number(promedio.toFixed(2)),
    promedio_30:
      p30 === null
        ? null
        : Number(p30.toFixed(2)),
    promedio_60:
      p60 === null
        ? null
        : Number(p60.toFixed(2)),
    promedio_90:
      p90 === null
        ? null
        : Number(p90.toFixed(2)),
    dias_desde_ultima_lectura:
      Math.max(
        0,
        diasEntre(ultima.fecha, hoyISO) || 0
      ),
    proyeccion_disponible:
      promedio !== null && promedio > 0,
  }
}

function proyectarFecha({
  fechaReferencia,
  kmActual,
  kmObjetivo,
  promedioKmMes,
}) {
  const fecha = fechaISO(fechaReferencia)
  const actual = numero(kmActual)
  const objetivo = numero(kmObjetivo)
  const promedio = numero(promedioKmMes)

  if (
    !fecha ||
    actual === null ||
    objetivo === null ||
    promedio === null ||
    promedio <= 0
  ) {
    return null
  }

  const faltantes = objetivo - actual

  if (faltantes <= 0) return fecha

  const kmDia = promedio / 30.4375
  if (kmDia <= 0) return null

  return sumarDias(
    fecha,
    Math.ceil(faltantes / kmDia)
  )
}

function toleranciaDeConfig(config) {
  const t = entero(config?.tolerancia_km)

  return t !== null && t > 0
    ? t
    : TOLERANCIA_KM_DEFAULT
}

function esActividadBase(nombre) {
  const n = clave(nombre)

  return (
    n === 'ACEITE DE MOTOR Y FILTRO DE ACEITE' ||
    n === 'ACEITE DE MOTOR' ||
    n.includes('CAMBIO DE ACEITE')
  )
}

function actividadesDelPuntoMaestro({
  configs,
  frecuenciaBase,
  puntoMaestro,
}) {
  const base = entero(frecuenciaBase)
  const punto = entero(puntoMaestro)

  if (!base || base <= 0) {
    throw Object.assign(
      new Error(
        'Frecuencia base inválida para el Plan de Mantenimiento.'
      ),
      { status: 400 }
    )
  }

  if (!punto || punto < 1) {
    throw Object.assign(
      new Error(
        `Punto maestro inválido: ${puntoMaestro}.`
      ),
      { status: 400 }
    )
  }

  const kmCiclo = base * punto

  return (configs || []).filter((config) => {
    const frecuencia = entero(config.frecuencia_km)

    return (
      frecuencia &&
      frecuencia >= base &&
      frecuencia % base === 0 &&
      kmCiclo % frecuencia === 0
    )
  })
}

function describirActividad(config, catalogoPorId) {
  const actividad =
    catalogoPorId.get(Number(config.actividad_id)) || {}

  return {
    configuracion_id: config.id,
    actividad_id: config.actividad_id,
    actividad:
      actividad.nombre ||
      'Actividad de mantenimiento',
    accion: actividad.accion || null,
    categoria: actividad.categoria || null,
    frecuencia_km: entero(config.frecuencia_km),
    tolerancia_km: toleranciaDeConfig(config),
  }
}

function obtenerFrecuenciaBase(
  configs,
  catalogoPorId
) {
  const configBase = (configs || [])
    .slice()
    .sort(
      (a, b) =>
        Number(a.id) - Number(b.id)
    )
    .find((config) =>
      esActividadBase(
        catalogoPorId.get(
          Number(config.actividad_id)
        )?.nombre
      )
    )

  const frecuenciaBase =
    entero(configBase?.frecuencia_km)

  if (
    !configBase ||
    !frecuenciaBase ||
    frecuenciaBase <= 0
  ) {
    return {
      configBase: null,
      frecuenciaBase: null,
    }
  }

  return {
    configBase,
    frecuenciaBase,
  }
}

function validarFrecuencias(
  configs,
  frecuenciaBase
) {
  return (configs || []).filter((config) => {
    const frecuencia =
      entero(config.frecuencia_km)

    return (
      !frecuencia ||
      frecuencia < frecuenciaBase ||
      frecuencia % frecuenciaBase !== 0
    )
  })
}

function obtenerToleranciaPunto(actividades) {
  const tolerancias = (actividades || [])
    .map((x) => entero(x.tolerancia_km))
    .filter(
      (x) =>
        x !== null &&
        x >= 0
    )

  if (!tolerancias.length) {
    return TOLERANCIA_KM_DEFAULT
  }

  // El punto se considera oportuno solamente si todas sus
  // actividades obligatorias permanecen dentro de rango.
  // Por ello se usa la tolerancia más restrictiva.
  return Math.min(...tolerancias)
}

function construirPuntoProyectado({
  vehiculo,
  punto,
  kmReferencia,
  frecuenciaBase,
  configs,
  catalogoPorId,
  kilometraje,
}) {
  const actividadesConfig =
    actividadesDelPuntoMaestro({
      configs,
      frecuenciaBase,
      puntoMaestro: punto,
    })

  const actividades =
    actividadesConfig.map((config) =>
      describirActividad(
        config,
        catalogoPorId
      )
    )

  const toleranciaKm =
    obtenerToleranciaPunto(actividades)

  const kmObjetivo =
    Number(kmReferencia) + Number(frecuenciaBase)

  const kmMaximo =
    kmObjetivo + toleranciaKm

  const kmActual =
    numero(kilometraje.ultimo_km)

  const excedido =
    kmActual !== null &&
    kmActual > kmMaximo

  const fechaProyectada =
    excedido
      ? null
      : proyectarFecha({
          fechaReferencia:
            kilometraje.ultima_fecha,
          kmActual,
          kmObjetivo,
          promedioKmMes:
            kilometraje.promedio_km_mes,
        })

  return {
    id: null,
    materializado: false,
    vehiculo_id: vehiculo.id,
    placa: vehiculo.placa,
    punto,
    ciclo: punto,
    estado:
      excedido
        ? 'VENCIDO'
        : 'PROGRAMADO',
    km_referencia:
      numero(kmReferencia),
    km_objetivo:
      kmObjetivo,
    tolerancia_km:
      toleranciaKm,
    km_maximo:
      kmMaximo,
    km_actual:
      kmActual,
    km_faltantes:
      kmActual === null
        ? null
        : Math.max(
            0,
            kmObjetivo - kmActual
          ),
    fecha_proyectada:
      fechaProyectada,
    vigencia_proyectada:
      fechaProyectada
        ? Number(
            fechaProyectada.slice(0, 4)
          )
        : (
            excedido
              ? Number(
                  hoyColombiaISO().slice(0, 4)
                )
              : null
          ),
    mes_proyectado:
      fechaProyectada
        ? Number(
            fechaProyectada.slice(5, 7)
          )
        : (
            excedido
              ? Number(
                  hoyColombiaISO().slice(5, 7)
                )
              : null
          ),
    mes_nombre:
      fechaProyectada
        ? MESES[
            Number(
              fechaProyectada.slice(5, 7)
            ) - 1
          ]
        : (
            excedido
              ? MESES[
                  Number(
                    hoyColombiaISO().slice(5, 7)
                  ) - 1
                ]
              : null
          ),
    actividades,
    total_actividades:
      actividades.length,
  }
}

function construirProyeccionesFuturas({
  vehiculo,
  puntoInicial,
  kmReferencia,
  frecuenciaBase,
  configs,
  catalogoPorId,
  kilometraje,
  fechaHasta,
}) {
  const salida = []

  let referencia = Number(kmReferencia)

  for (
    let punto = puntoInicial;
    punto <
      puntoInicial + MAX_PUNTOS_PROYECCION;
    punto += 1
  ) {
    const proyectado =
      construirPuntoProyectado({
        vehiculo,
        punto,
        kmReferencia: referencia,
        frecuenciaBase,
        configs,
        catalogoPorId,
        kilometraje,
      })

    // El punto vigente siempre se devuelve,
    // incluso si ya excedió su rango.
    if (punto === puntoInicial) {
      salida.push(proyectado)
    } else if (
      proyectado.fecha_proyectada &&
      proyectado.fecha_proyectada <= fechaHasta
    ) {
      salida.push(proyectado)
    } else if (
      !proyectado.fecha_proyectada
    ) {
      break
    } else {
      break
    }

    // Para la proyección visual de los puntos siguientes,
    // cada punto teórico avanza una frecuencia base.
    referencia = proyectado.km_objetivo
  }

  return salida
}

function puntoMaterializadoDesdeFila(
  fila,
  catalogoPorId,
  configsPorVehiculo
) {
  const vehiculoId = Number(fila.vehiculo_id)
  const punto = entero(fila.ciclo)

  const configs =
    configsPorVehiculo.get(vehiculoId) || []

  let actividades = []

  if (punto && punto >= 1) {
    const base = configs
      .slice()
      .sort(
        (a, b) =>
          Number(a.id) - Number(b.id)
      )
      .find((config) =>
        esActividadBase(
          catalogoPorId.get(
            Number(config.actividad_id)
          )?.nombre
        )
      )

    const frecuenciaBase =
      entero(base?.frecuencia_km)

    if (frecuenciaBase) {
      actividades =
        actividadesDelPuntoMaestro({
          configs,
          frecuenciaBase,
          puntoMaestro: punto,
        }).map((config) =>
          describirActividad(
            config,
            catalogoPorId
          )
        )
    }
  }

  return {
    id: fila.id,
    materializado: true,
    vehiculo_id: fila.vehiculo_id,
    punto,
    ciclo: punto,
    estado: clave(fila.estado),
    km_referencia:
      numero(fila.km_base),
    km_objetivo:
      numero(fila.km_limite),
    km_vencimiento:
      numero(fila.km_vencimiento),
    fecha_vencimiento:
      fechaISO(fila.fecha_vencimiento),
    justificacion_vencimiento:
      fila.justificacion_vencimiento ||
      null,
    justificado_at:
      fila.justificado_at || null,
    responsable_justificacion:
      fila.responsable_justificacion ||
      null,
    documento_responsable_justificacion:
      fila.documento_responsable_justificacion ||
      null,
    mantenimiento_id:
      fila.mantenimiento_id || null,
    fecha_ejecucion:
      fechaISO(fila.fecha_ejecucion),
    km_ejecucion:
      numero(fila.km_ejecucion),
    atendido:
      Boolean(fila.mantenimiento_id),
    actividades,
    total_actividades:
      actividades.length,
  }
}

function ordenarPuntos(a, b) {
  return (
    Number(a.punto || 0) -
    Number(b.punto || 0)
  )
}

function obtenerNivelHistorico(fila) {
  const contenido =
    clave(
      fila?.actividad_realizada
    )

  if (!contenido) {
    return null
  }

  // No exige coincidencia exacta: el texto NIVEL N puede
  // aparecer en cualquier parte de actividad_realizada.
  const coincidencia =
    contenido.match(
      /\bNIVEL\s*(?:NRO|NO|NUMERO|N)?\s*[°º#:\-]?\s*([1-9]\d*)\b/i
    )

  if (!coincidencia) {
    return null
  }

  const nivel =
    entero(
      coincidencia[1]
    )

  return nivel && nivel > 0
    ? nivel
    : null
}

function obtenerUltimoNivelHistorico(filas) {
  const validos =
    (filas || [])
      .map((fila) => ({
        id: fila.id,
        fecha:
          fechaISO(
            fila.fecha_registro
          ),
        nivel:
          obtenerNivelHistorico(
            fila
          ),
        actividad_realizada:
          fila.actividad_realizada || '',
      }))
      .filter(
        (x) =>
          x.fecha &&
          x.nivel !== null
      )
      .sort(
        (a, b) =>
          a.fecha.localeCompare(
            b.fecha
          ) ||
          Number(a.id || 0) -
            Number(b.id || 0)
      )

  return validos.length
    ? validos[
        validos.length - 1
      ]
    : null
}

async function cargarContexto(
  supabase,
  vigenciaSolicitada
) {
  const hoyISO = hoyColombiaISO()

  const [
    rv,
    rp,
    rc,
    rcat,
    rprogramaciones,
    rmantenimientos,
  ] = await Promise.all([
    supabase
      .from('vehiculos')
      .select(
        'id,placa,tipo_vehiculo,marca,estado,clasificacion,modelo,linea'
      )
      .order('placa'),

    supabase
      .from(
        'vehiculo_mantenimiento_plan_estado'
      )
      .select('*'),

    supabase
      .from(
        'vehiculo_mantenimiento_config'
      )
      .select('*'),

    supabase
      .from(
        'mantenimiento_actividades_catalogo'
      )
      .select('*')
      .eq('activo', true),

    supabase
      .from('programacion_mantenimiento')
      .select('*')
      .in('estado', [
        'EJECUTADO',
        'VENCIDO',
      ])
      .order('vehiculo_id')
      .order('ciclo'),

    supabase
      .from('mantenimientos')
      .select(
        'id,fecha_registro,placa,kilometraje,tipo_mantenimiento,actividad_realizada,programacion_mantenimiento_id,origen_registro'
      )
      .order('fecha_registro')
      .order('id'),
  ])

  for (const r of [
    rv,
    rp,
    rc,
    rcat,
    rprogramaciones,
    rmantenimientos,
  ]) {
    if (r.error) throw r.error
  }

  const planPorVehiculo =
    new Map(
      (rp.data || []).map((x) => [
        Number(x.vehiculo_id),
        x,
      ])
    )

  const vehiculos =
    (rv.data || []).filter(
      (v) =>
        esActivo(v.estado) &&
        clave(
          planPorVehiculo.get(
            Number(v.id)
          )?.estado
        ) === 'FINALIZADO'
    )

  const configs =
    (rc.data || []).filter(
      (x) =>
        configuracionActiva(x.activo)
    )

  const placas =
    vehiculos.map((x) => x.placa)

  const preoperacionales =
    placas.length
      ? await consultarTodo(
          (desde, hasta) =>
            supabase
              .from('preoperacionales')
              .select(
                'id,fecha_registro,timestamp_registro,placa,km_registro'
              )
              .in('placa', placas)
              .order('fecha_registro')
              .order('id')
              .range(desde, hasta)
        )
      : []

  return {
    hoyISO,
    vigenciaSolicitada,
    vehiculos,
    planPorVehiculo,
    configs,
    catalogo: rcat.data || [],
    programaciones:
      rprogramaciones.data || [],
    mantenimientos:
      rmantenimientos.data || [],
    preoperacionales,
  }
}


function primeraLecturaQueAlcanza(lecturas, kmObjetivo, fechaMaxima = null) {
  const objetivo = numero(kmObjetivo)
  if (objetivo === null) return null

  const ordenadas =
    depurarLecturasPreoperacionales(lecturas || [])

  return (
    ordenadas.find(
      (x) =>
        x.km >= objetivo &&
        (!fechaMaxima || x.fecha <= fechaMaxima)
    ) || null
  )
}

function construirHistorialReconstruido2026({
  vehiculo,
  mantenimientos,
  preoperacionales,
  frecuenciaBase,
  configs,
  catalogoPorId,
  hoyISO,
}) {
  if (!frecuenciaBase) return []

  const niveles =
    (mantenimientos || [])
      .map((fila) => ({
        fila,
        nivel: obtenerNivelHistorico(fila),
        fecha: fechaISO(fila.fecha_registro),
        km: numero(fila.kilometraje),
      }))
      .filter(
        (x) =>
          x.nivel !== null &&
          x.fecha &&
          x.fecha <= hoyISO
      )
      .sort(
        (a, b) =>
          a.fecha.localeCompare(b.fecha) ||
          Number(a.fila?.id || 0) -
            Number(b.fila?.id || 0)
      )

  if (!niveles.length) return []

  const ancla = niveles[niveles.length - 1]
  let kmAncla = ancla.km

  if (kmAncla === null) {
    const lecturas =
      depurarLecturasPreoperacionales(
        preoperacionales || []
      ).filter(
        (x) => x.fecha <= ancla.fecha
      )

    kmAncla =
      lecturas.length
        ? lecturas[lecturas.length - 1].km
        : null
  }

  if (kmAncla === null) return []

  const porNivel = new Map()
  for (const item of niveles) {
    porNivel.set(item.nivel, item)
  }

  const salida = []

  for (
    let punto = 1;
    punto <= ancla.nivel;
    punto += 1
  ) {
    const kmObjetivo =
      kmAncla -
      (ancla.nivel - punto) *
        Number(frecuenciaBase)

    const lecturaVencimiento =
      primeraLecturaQueAlcanza(
        preoperacionales,
        kmObjetivo,
        hoyISO
      )

    const mantenimientoNivel =
      porNivel.get(punto) || null

    const actividades =
      actividadesDelPuntoMaestro({
        configs,
        frecuenciaBase,
        puntoMaestro: punto,
      }).map((config) =>
        describirActividad(
          config,
          catalogoPorId
        )
      )

    if (mantenimientoNivel) {
      const fechaEjecucion =
        mantenimientoNivel.fecha

      if (
        fechaEjecucion.slice(0, 4) ===
        '2026'
      ) {
        salida.push({
          id:
            `HIST-M-${mantenimientoNivel.fila.id}`,
          materializado: true,
          historico_reconstruido: true,
          fuente_historica:
            'MANTENIMIENTOS',
          vehiculo_id:
            vehiculo.id,
          placa:
            vehiculo.placa,
          punto,
          ciclo: punto,
          estado: 'EJECUTADO',
          fecha_ejecucion:
            fechaEjecucion,
          km_ejecucion:
            mantenimientoNivel.km,
          km_objetivo:
            kmObjetivo,
          fecha_debio_realizarse:
            lecturaVencimiento?.fecha ||
            null,
          km_debio_realizarse:
            kmObjetivo,
          actividad_historica:
            mantenimientoNivel.fila
              ?.actividad_realizada ||
            null,
          actividades,
          total_actividades:
            actividades.length,
        })
      }

      continue
    }

    if (
      lecturaVencimiento &&
      lecturaVencimiento.fecha.slice(0, 4) ===
        '2026' &&
      lecturaVencimiento.fecha <= hoyISO
    ) {
      salida.push({
        id:
          `HIST-V-${vehiculo.id}-${punto}`,
        materializado: true,
        historico_reconstruido: true,
        fuente_historica:
          'PREOPERACIONALES',
        vehiculo_id:
          vehiculo.id,
        placa:
          vehiculo.placa,
        punto,
        ciclo: punto,
        estado: 'VENCIDO',
        fecha_vencimiento:
          lecturaVencimiento.fecha,
        km_vencimiento:
          lecturaVencimiento.km,
        km_objetivo:
          kmObjetivo,
        fecha_debio_realizarse:
          lecturaVencimiento.fecha,
        km_debio_realizarse:
          kmObjetivo,
        justificacion_vencimiento:
          null,
        actividades,
        total_actividades:
          actividades.length,
      })
    }
  }

  return salida
}

function construirVistaVehiculo({
  contexto,
  vehiculo,
  fechaHasta,
}) {
  const catalogoPorId =
    new Map(
      contexto.catalogo.map((x) => [
        Number(x.id),
        x,
      ])
    )

  const configsPorVehiculo =
    agrupar(
      contexto.configs,
      (x) => Number(x.vehiculo_id)
    )

  const preopPorPlaca =
    agrupar(
      contexto.preoperacionales,
      (x) => placaClave(x.placa)
    )

  const hechosPorVehiculo =
    agrupar(
      contexto.programaciones,
      (x) => Number(x.vehiculo_id)
    )

  const mantenimientosPorPlaca =
    agrupar(
      contexto.mantenimientos,
      (x) => placaClave(x.placa)
    )

  const configs =
    configsPorVehiculo.get(
      Number(vehiculo.id)
    ) || []

  const plan =
    contexto.planPorVehiculo.get(
      Number(vehiculo.id)
    )

  const kilometraje =
    calcularKilometraje(
      preopPorPlaca.get(
        placaClave(vehiculo.placa)
      ) || [],
      contexto.hoyISO
    )

  const {
    frecuenciaBase,
  } = obtenerFrecuenciaBase(
    configs,
    catalogoPorId
  )

  const incompatibles =
    frecuenciaBase
      ? validarFrecuencias(
          configs,
          frecuenciaBase
        )
      : []

  const hechos =
    (hechosPorVehiculo.get(
      Number(vehiculo.id)
    ) || [])
      .map((fila) =>
        puntoMaterializadoDesdeFila(
          fila,
          catalogoPorId,
          configsPorVehiculo
        )
      )
      .sort(ordenarPuntos)

  const ultimoPuntoMaterializado =
    hechos.length
      ? Math.max(
          ...hechos.map(
            (x) => Number(x.punto || 0)
          )
        )
      : 0

  // =======================================================
  // PUNTO INICIAL AUTOMÁTICO
  // =======================================================
  // Se busca el mantenimiento MÁS RECIENTE cuya
  // actividad_realizada contenga en cualquier parte NIVEL N.
  // Nivel 1 => P2, Nivel 2 => P3, etc.
  // Si no existe un nivel reconocible => P1.
  //
  // El kilometraje de proyección SIEMPRE se toma del último
  // preoperacional real del vehículo.
  // =======================================================

  const ultimoNivelHistorico =
    obtenerUltimoNivelHistorico(
      mantenimientosPorPlaca.get(
        placaClave(
          vehiculo.placa
        )
      ) || []
    )

  const puntoHistorico =
    ultimoNivelHistorico?.nivel
      ? ultimoNivelHistorico.nivel + 1
      : 1

  const puntoMaterializado =
    ultimoPuntoMaterializado > 0
      ? ultimoPuntoMaterializado + 1
      : 1

  const puntoActual =
    Math.max(
      puntoHistorico,
      puntoMaterializado
    )

  const kmReferencia =
    kilometraje.ultimo_km

  const fechaReferencia =
    kilometraje.ultima_fecha

  const origenReferencia =
    ultimoNivelHistorico
      ? `MANTENIMIENTO_HISTORICO_NIVEL_${ultimoNivelHistorico.nivel}`
      : 'SIN_NIVEL_HISTORICO_P1'

  const historialReconstruido2026 =
    construirHistorialReconstruido2026({
      vehiculo,
      mantenimientos:
        mantenimientosPorPlaca.get(
          placaClave(
            vehiculo.placa
          )
        ) || [],
      preoperacionales:
        preopPorPlaca.get(
          placaClave(
            vehiculo.placa
          )
        ) || [],
      frecuenciaBase,
      configs,
      catalogoPorId,
      hoyISO:
        contexto.hoyISO,
    }).filter(
      (historico) =>
        !hechos.some(
          (hecho) =>
            Number(
              hecho.punto ||
              hecho.ciclo
            ) ===
            Number(
              historico.punto ||
              historico.ciclo
            )
        )
    )

  const errores = []

  if (!configs.length) {
    errores.push(
      'SIN_CONFIGURACION_ACTIVA'
    )
  }

  if (!frecuenciaBase) {
    errores.push(
      'SIN_FRECUENCIA_BASE'
    )
  }

  if (incompatibles.length) {
    errores.push(
      'FRECUENCIAS_INCOMPATIBLES'
    )
  }

  if (kmReferencia === null) {
    errores.push(
      'SIN_KM_REFERENCIA'
    )
  }

  if (
    kilometraje.ultimo_km === null
  ) {
    errores.push(
      'SIN_KILOMETRAJE_PREOPERACIONAL'
    )
  }

  const proyecciones =
    !errores.length
      ? construirProyeccionesFuturas({
          vehiculo,
          puntoInicial: puntoActual,
          kmReferencia,
          frecuenciaBase,
          configs,
          catalogoPorId,
          kilometraje,
          fechaHasta,
        })
      : []

  const puntoVigente =
    proyecciones[0] || null

  const mantenimientosVehiculo =
    (
      mantenimientosPorPlaca.get(
        placaClave(
          vehiculo.placa
        )
      ) || []
    )
      .filter(
        (item) =>
          item?.fecha_registro
      )
      .sort(
        (a, b) => {
          const fechaA =
            String(
              a?.fecha_registro ||
              ''
            )

          const fechaB =
            String(
              b?.fecha_registro ||
              ''
            )

          if (
            fechaA !==
            fechaB
          ) {
            return fechaB.localeCompare(
              fechaA
            )
          }

          return (
            Number(
              b?.id || 0
            ) -
            Number(
              a?.id || 0
            )
          )
        }
      )

  const ultimoMantenimiento =
    mantenimientosVehiculo[0] ||
    null

  return {
    vehiculo: {
      id: vehiculo.id,
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      linea: vehiculo.linea,
      modelo: vehiculo.modelo,
      tipo_vehiculo:
        vehiculo.tipo_vehiculo,
    },

    estado_plan:
      plan?.estado || null,

    frecuencia_base_km:
      frecuenciaBase,

    ultimo_mantenimiento:
      ultimoMantenimiento
        ? {
            id:
              ultimoMantenimiento.id,
            fecha_registro:
              ultimoMantenimiento.fecha_registro,
            kilometraje:
              numero(
                ultimoMantenimiento.kilometraje
              ),
            tipo_mantenimiento:
              ultimoMantenimiento.tipo_mantenimiento ||
              null,
          }
        : null,

    ciclo: {
      punto_actual: puntoActual,
      frecuencia_base_km:
        frecuenciaBase,
      km_referencia:
        kmReferencia,
      fecha_referencia:
        fechaReferencia,
      origen_referencia:
        origenReferencia,
      nivel_historico:
        ultimoNivelHistorico?.nivel ||
        null,
      mantenimiento_historico_id:
        ultimoNivelHistorico?.id ||
        null,
      actividad_historica:
        ultimoNivelHistorico
          ?.actividad_realizada ||
        null,
    },

    kilometraje,

    configuraciones_activas:
      configs.length,

    errores,

    punto_vigente:
      puntoVigente,

    proyecciones,

    hechos,

    historial_reconstruido_2026:
      historialReconstruido2026,
  }
}

function construirMatrizAnual(
  vistasVehiculos,
  vigencia
) {
  return vistasVehiculos.map((vista) => {
    const meses = {}

    for (
      let mes = 1;
      mes <= 12;
      mes += 1
    ) {
      meses[MESES[mes - 1]] = {
        programados: [],
        ejecutados: [],
        vencidos: [],
      }
    }

    for (
      const punto of
        vista.proyecciones || []
    ) {
      if (
        Number(
          punto.vigencia_proyectada
        ) !== Number(vigencia)
      ) {
        continue
      }

      const nombre =
        MESES[
          Number(
            punto.mes_proyectado
          ) - 1
        ]

      if (!nombre) continue

      if (punto.estado === 'VENCIDO') {
        meses[nombre].vencidos.push(
          punto
        )
      } else {
        meses[nombre].programados.push(
          punto
        )
      }
    }

    for (
      const historico of
        vista.historial_reconstruido_2026 || []
    ) {
      const fecha =
        historico.estado === 'EJECUTADO'
          ? historico.fecha_ejecucion
          : historico.fecha_vencimiento

      if (!fecha) continue

      const anio =
        Number(
          fecha.slice(0, 4)
        )

      const mes =
        Number(
          fecha.slice(5, 7)
        )

      if (
        anio !== Number(vigencia) ||
        mes < 1 ||
        mes > 12
      ) {
        continue
      }

      const nombre =
        MESES[mes - 1]

      const yaExiste =
        [
          ...meses[nombre].ejecutados,
          ...meses[nombre].vencidos,
        ].some(
          (x) =>
            Number(
              x.punto || x.ciclo
            ) ===
              Number(
                historico.punto
              ) &&
            x.historico_reconstruido !==
              true
        )

      if (yaExiste) continue

      if (
        historico.estado ===
        'EJECUTADO'
      ) {
        meses[nombre].ejecutados.push(
          historico
        )
      } else {
        meses[nombre].vencidos.push(
          historico
        )
      }
    }

    for (
      const hecho of
        vista.hechos || []
    ) {
      let fecha = null

      if (
        hecho.estado === 'EJECUTADO'
      ) {
        fecha =
          hecho.fecha_ejecucion
      } else if (
        hecho.estado === 'VENCIDO'
      ) {
        fecha =
          hecho.fecha_vencimiento ||
          hecho.fecha_ejecucion
      }

      if (!fecha) continue

      const anio =
        Number(fecha.slice(0, 4))

      const mes =
        Number(fecha.slice(5, 7))

      if (
        anio !== Number(vigencia) ||
        mes < 1 ||
        mes > 12
      ) {
        continue
      }

      const nombre =
        MESES[mes - 1]

      if (
        hecho.estado === 'EJECUTADO'
      ) {
        meses[nombre].ejecutados.push(
          hecho
        )
      } else if (
        hecho.estado === 'VENCIDO'
      ) {
        meses[nombre].vencidos.push(
          hecho
        )
      }
    }

    return {
      ...vista,
      meses,
    }
  })
}

async function materializarVencimientosDetectados({
  supabase,
  vistas,
  hoyISO,
}) {
  let cambios = 0

  for (const vista of vistas || []) {
    const punto =
      (vista.proyecciones || []).find(
        (x) =>
          x.estado === 'VENCIDO' &&
          !x.id
      )

    if (!punto) continue

    const vehiculoId =
      Number(
        vista?.vehiculo?.id
      )

    const ciclo =
      Number(
        punto?.punto ||
        punto?.ciclo
      )

    if (
      !Number.isInteger(vehiculoId) ||
      vehiculoId <= 0 ||
      !Number.isInteger(ciclo) ||
      ciclo <= 0
    ) {
      continue
    }

    const {
      data: existente,
      error: errorExistente,
    } = await supabase
      .from('programacion_mantenimiento')
      .select('id,estado')
      .eq('vehiculo_id', vehiculoId)
      .eq('ciclo', ciclo)
      .maybeSingle()

    if (errorExistente) {
      throw errorExistente
    }

    const datos = {
      estado: 'VENCIDO',
      km_base:
        numero(
          punto.km_referencia
        ),
      km_limite:
        numero(
          punto.km_objetivo
        ),
      km_vencimiento:
        numero(
          punto.km_actual
        ),
      fecha_vencimiento:
        hoyISO,
      tipo_vencimiento:
        'KILOMETRAJE',
      observaciones:
        `Vencimiento automático P${ciclo}: el kilometraje registrado superó el objetivo más la tolerancia configurada.`,
      updated_at:
        new Date().toISOString(),
    }

    if (existente?.id) {
      if (
        clave(existente.estado) ===
        'EJECUTADO'
      ) {
        continue
      }

      const {
        error: errorUpdate,
      } = await supabase
        .from('programacion_mantenimiento')
        .update(datos)
        .eq('id', existente.id)

      if (errorUpdate) {
        throw errorUpdate
      }

      cambios += 1
      continue
    }

    const {
      error: errorInsert,
    } = await supabase
      .from('programacion_mantenimiento')
      .insert({
        vehiculo_id:
          vehiculoId,
        ciclo,
        ...datos,
        created_at:
          new Date().toISOString(),
      })

    if (errorInsert) {
      throw errorInsert
    }

    cambios += 1
  }

  return cambios
}

async function materializarYJustificarVencidoHistorico({
  supabase,
  vehiculoId,
  ciclo,
  fechaVencimiento,
  kmVencimiento,
  kmObjetivo,
  justificacion,
  responsable,
  documentoResponsable,
}) {
  const vehiculo =
    Number(vehiculoId)
  const punto =
    Number(ciclo)

  if (
    !Number.isInteger(vehiculo) ||
    vehiculo <= 0 ||
    !Number.isInteger(punto) ||
    punto <= 0
  ) {
    throw Object.assign(
      new Error(
        'El vencimiento histórico no contiene un vehículo o punto válido.'
      ),
      { status: 400 }
    )
  }

  if (!texto(justificacion)) {
    throw Object.assign(
      new Error(
        'La justificación del vencimiento es obligatoria.'
      ),
      { status: 400 }
    )
  }

  const {
    data: existente,
    error: errorExistente,
  } = await supabase
    .from('programacion_mantenimiento')
    .select('id,estado')
    .eq('vehiculo_id', vehiculo)
    .eq('ciclo', punto)
    .maybeSingle()

  if (errorExistente) {
    throw errorExistente
  }

  let id =
    existente?.id || null

  if (!id) {
    const ahora =
      new Date().toISOString()

    const {
      data: creada,
      error: errorInsert,
    } = await supabase
      .from('programacion_mantenimiento')
      .insert({
        vehiculo_id:
          vehiculo,
        ciclo:
          punto,
        estado:
          'VENCIDO',
        km_limite:
          numero(kmObjetivo),
        km_vencimiento:
          numero(kmVencimiento),
        fecha_vencimiento:
          fechaISO(fechaVencimiento),
        tipo_vencimiento:
          'HISTORICO_RECONSTRUIDO_2026',
        observaciones:
          `Vencimiento histórico reconstruido 2026 para P${punto}.`,
        created_at:
          ahora,
        updated_at:
          ahora,
      })
      .select('id')
      .single()

    if (errorInsert) {
      throw errorInsert
    }

    id =
      creada.id
  } else if (
    clave(existente.estado) !==
    'VENCIDO'
  ) {
    throw Object.assign(
      new Error(
        'El punto histórico ya existe con un estado diferente de VENCIDO.'
      ),
      { status: 400 }
    )
  }

  return registrarJustificacionVencido({
    supabase,
    programacionId:
      id,
    justificacion,
    responsable,
    documentoResponsable,
  })
}

async function registrarJustificacionVencido({
  supabase,
  programacionId,
  justificacion,
  responsable,
  documentoResponsable,
}) {
  const id =
    Number(programacionId)

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw Object.assign(
      new Error(
        'Debe indicar un vencimiento válido.'
      ),
      { status: 400 }
    )
  }

  if (!texto(justificacion)) {
    throw Object.assign(
      new Error(
        'La justificación del vencimiento es obligatoria.'
      ),
      { status: 400 }
    )
  }

  const {
    data: programacion,
    error,
  } = await supabase
    .from(
      'programacion_mantenimiento'
    )
    .select(
      'id,estado,justificacion_vencimiento'
    )
    .eq('id', id)
    .single()

  if (error) throw error

  if (
    clave(programacion.estado) !==
    'VENCIDO'
  ) {
    throw Object.assign(
      new Error(
        'La justificación solo puede registrarse en un punto VENCIDO.'
      ),
      { status: 400 }
    )
  }

  const {
    data: actualizada,
    error: errorUpdate,
  } = await supabase
    .from(
      'programacion_mantenimiento'
    )
    .update({
      justificacion_vencimiento:
        texto(justificacion),
      justificado_at:
        new Date().toISOString(),
      responsable_justificacion:
        texto(responsable) || null,
      documento_responsable_justificacion:
        texto(documentoResponsable) ||
        null,
      updated_at:
        new Date().toISOString(),
    })
    .eq('id', id)
    .eq('estado', 'VENCIDO')
    .select(
      'id,justificacion_vencimiento,justificado_at'
    )
    .single()

  if (errorUpdate) throw errorUpdate

  return actualizada
}

export async function GET(request) {
  try {
    const {
      supabaseAdmin,
      nit,
      empresa,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const logo =
      await obtenerLogo(
        supabaseAdmin
      )

    const { searchParams } =
      new URL(request.url)

    const vigencia =
      Number(
        searchParams.get('vigencia') ||
        vigenciaActual()
      )

    const vehiculoIdFiltro =
      Number(
        searchParams.get(
          'vehiculo_id'
        ) || 0
      )

    const actual =
      vigenciaActual()

    const fechaHasta =
      `${actual + HORIZONTE_ANIOS}-12-31`

    let contexto =
      await cargarContexto(
        supabaseAdmin,
        vigencia
      )

    const filtrarVehiculos = (lista) => {
      if (
        Number.isInteger(
          vehiculoIdFiltro
        ) &&
        vehiculoIdFiltro > 0
      ) {
        return lista.filter(
          (v) =>
            Number(v.id) ===
            vehiculoIdFiltro
        )
      }

      return lista
    }

    let vehiculos =
      filtrarVehiculos(
        contexto.vehiculos
      )

    let vistas =
      vehiculos.map((vehiculo) =>
        construirVistaVehiculo({
          contexto,
          vehiculo,
          fechaHasta,
        })
      )

    const vencimientosMaterializados =
      await materializarVencimientosDetectados({
        supabase:
          supabaseAdmin,
        vistas,
        hoyISO:
          contexto.hoyISO,
      })

    if (
      vencimientosMaterializados >
      0
    ) {
      contexto =
        await cargarContexto(
          supabaseAdmin,
          vigencia
        )

      vehiculos =
        filtrarVehiculos(
          contexto.vehiculos
        )

      vistas =
        vehiculos.map(
          (vehiculo) =>
            construirVistaVehiculo({
              contexto,
              vehiculo,
              fechaHasta,
            })
        )
    }

    const matriz =
      construirMatrizAnual(
        vistas,
        vigencia
      )

    const vigenciasHechos =
      contexto.programaciones
        .flatMap((p) => [
          fechaISO(
            p.fecha_ejecucion
          ),
          fechaISO(
            p.fecha_vencimiento
          ),
        ])
        .filter(Boolean)
        .map((f) =>
          Number(f.slice(0, 4))
        )

    const vigenciasDisponibles =
      [
        ...new Set([
          ...vigenciasHechos,
          actual,
          actual + 1,
          actual + 2,
        ]),
      ]
        .filter(Number.isFinite)
        .sort((a, b) => a - b)

    return NextResponse.json({
      status: 'success',
      nitEmpresa: nit,
      empresa: {
        nit: empresa?.nit || nit || '',
        nombre:
          empresa?.nombre ||
          empresa?.razon_social ||
          '',
        razon_social:
          empresa?.razon_social ||
          empresa?.nombre ||
          '',
      },
      logo,
      vigencia,
      fecha_referencia_colombia:
        contexto.hoyISO,
      meses: MESES,
      vigencias_disponibles:
        vigenciasDisponibles,
      horizonte_programacion:
        actual + HORIZONTE_ANIOS,

      reglas: {
        modelo:
          'PROYECCION_DINAMICA_POR_KILOMETRAJE',
        proyecciones_persistidas:
          false,
        reprogramacion_manual:
          false,
        promedio_dinamico:
          true,
        promedio_ventanas_dias: [
          30,
          60,
          90,
        ],
        pesos_promedio: {
          dias_30: 0.5,
          dias_60: 0.3,
          dias_90: 0.2,
        },
        vencimiento_por_fecha:
          false,
        vencimiento_por_kilometraje:
          true,
        tolerancia_km_default:
          TOLERANCIA_KM_DEFAULT,
        get_solo_lectura: false,
        vencimiento_materializado_automaticamente:
          true,
        referencia_automatica:
          'ULTIMO_PREOPERACIONAL',
        punto_inicial_automatico:
          'ULTIMO_NIVEL_EN_ACTIVIDAD_REALIZADA_MAS_UNO',
      },

      resumen: {
        vehiculos: matriz.length,
        proyectados:
          matriz.reduce(
            (acc, v) =>
              acc +
              (v.proyecciones || [])
                .filter(
                  (p) =>
                    Number(
                      p.vigencia_proyectada
                    ) === vigencia
                ).length,
            0
          ),
        ejecutados:
          matriz.reduce(
            (acc, v) =>
              acc +
              (v.hechos || [])
                .filter(
                  (p) =>
                    p.estado ===
                    'EJECUTADO'
                ).length,
            0
          ),
        vencidos:
          matriz.reduce(
            (acc, v) =>
              acc +
              (v.hechos || [])
                .filter(
                  (p) =>
                    p.estado ===
                    'VENCIDO'
                ).length +
              (v.proyecciones || [])
                .filter(
                  (p) =>
                    p.estado ===
                    'VENCIDO' &&
                    Number(
                      p.vigencia_proyectada
                    ) === vigencia
                ).length,
            0
          ),
      },

      vehiculos: matriz,
    })
  } catch (error) {
    console.error(
      'Error GET Plan de Mantenimiento:',
      error
    )

    return respuestaError(error)
  }
}

export async function POST(request) {
  try {
    const body =
      await request
        .json()
        .catch(() => ({}))

    const {
      supabaseAdmin,
      nit,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const accion =
      clave(body.accion)

    if (
      accion ===
      'GESTIONAR_VENCIDO_HISTORICO'
    ) {
      const resultado =
        await materializarYJustificarVencidoHistorico({
          supabase:
            supabaseAdmin,
          vehiculoId:
            body.vehiculo_id,
          ciclo:
            body.ciclo,
          fechaVencimiento:
            body.fecha_vencimiento,
          kmVencimiento:
            body.km_vencimiento,
          kmObjetivo:
            body.km_objetivo,
          justificacion:
            body.justificacion,
          responsable:
            body.responsable,
          documentoResponsable:
            body.documento_responsable,
        })

      return NextResponse.json({
        status: 'success',
        nitEmpresa: nit,
        message:
          'El vencimiento histórico quedó materializado y gestionado. Permanecerá visible en la matriz.',
        ...resultado,
      })
    }

    if (
      accion ===
      'JUSTIFICAR_VENCIDO'
    ) {
      const resultado =
        await registrarJustificacionVencido({
          supabase:
            supabaseAdmin,
          programacionId:
            body.programacion_id,
          justificacion:
            body.justificacion,
          responsable:
            body.responsable,
          documentoResponsable:
            body.documento_responsable,
        })

      return NextResponse.json({
        status: 'success',
        nitEmpresa: nit,
        message:
          'La justificación del vencimiento quedó registrada.',
        ...resultado,
      })
    }

    return NextResponse.json(
      {
        status: 'failed',
        code:
          'ACCION_NO_VALIDA',
        message:
          'Acción no válida para el Plan de Mantenimiento.',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error(
      'Error POST Plan de Mantenimiento:',
      error
    )

    if (
      error?.status &&
      error.status < 500
    ) {
      return NextResponse.json(
        {
          status: 'failed',
          message: error.message,
        },
        { status: error.status }
      )
    }

    return respuestaError(error)
  }
}
