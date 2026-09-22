// app/api/admin/mantenimientos/plan/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

const TIPOS_VEHICULO = ['AUTOMOVIL', 'CAMIONETA', 'MOTOCICLETA', 'CAMION']

const ACTIVIDADES_ESENCIALES = {
  AUTOMOVIL: [
    'Aceite de motor y filtro de aceite', 'Sistema de frenos',
    'Suspensión y dirección', 'Batería y sistema de carga', 'Filtro de aire del motor',
    'Radiador y electroventilador', 'Sistema de doble comando del instructor',
  ],
  CAMIONETA: [
    'Aceite de motor y filtro de aceite', 'Sistema de frenos',
    'Suspensión y dirección', 'Batería y sistema de carga', 'Filtro de aire del motor',
    'Radiador y electroventilador', 'Sistema de doble comando del instructor',
  ],
  MOTOCICLETA: [
    'Aceite de motor', 'Cadena de transmisión', 'Sistema de frenos',
    'Embrague y accionamiento', 'Dirección', 'Suspensión delantera y trasera',
    'Batería y conexiones', 'Sistema de doble comando del instructor',
  ],
  CAMION: [
    'Aceite de motor y filtro de aceite', 'Sistema de frenos',
    'Sistema de dirección', 'Suspensión y puntos de engrase', 'Transmisión y tren motriz',
    'Baterías y sistema de carga', 'Sistema de doble comando del instructor',
  ],
}

const texto = (valor) => String(valor ?? '').trim().replace(/\s+/g, ' ')
const mayusculas = (valor) =>
  texto(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

const LIMITES_CICLO_KM = { AUTOMOVIL: 60000, CAMIONETA: 60000, MOTOCICLETA: 40000, CAMION: 80000 }

function esCambioAceite(nombre) {
  const n = mayusculas(nombre)
  return n === 'ACEITE DE MOTOR Y FILTRO DE ACEITE' || n === 'ACEITE DE MOTOR' || n.includes('CAMBIO DE ACEITE')
}
function multiploValido(valor, base) {
  const v = Number(valor), b = Number(base)
  return Number.isFinite(v) && Number.isFinite(b) && b > 0 && v >= b && v % b === 0
}
function frecuenciaNormalizada(referencia, base) {
  const r = Number(referencia), b = Number(base)
  if (!Number.isFinite(r) || !Number.isFinite(b) || r <= 0 || b <= 0) return null
  if (r <= b) return b
  const inf = Math.floor(r / b) * b, sup = Math.ceil(r / b) * b
  if (inf < b) return sup
  return (sup - r) <= (r - inf) ? sup : inf
}

function errorJson(mensaje, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, error: mensaje, ...extra }, { status })
}

function tipoValido(valor) {
  const tipo = mayusculas(valor)
  return TIPOS_VEHICULO.includes(tipo) ? tipo : null
}

function vehiculoActivo(valor) {
  return ['ACTIVO', 'ACTIVA'].includes(mayusculas(valor))
}

function numeroPositivoONull(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  const numero = Number(valor)
  if (!Number.isFinite(numero) || numero <= 0) return NaN
  return numero
}

function fechaISO(valor) {
  if (!valor) return null
  return String(valor).slice(0, 10)
}

function diasEntre(a, b) {
  const inicio = new Date(`${a}T00:00:00Z`)
  const fin = new Date(`${b}T00:00:00Z`)
  return Math.max(0, Math.round((fin - inicio) / 86400000))
}

function calcularPromediosRecorrido(lecturas) {
  const utiles = []
  let ultimaKm = null

  const ordenadas = [...lecturas].sort((a, b) =>
    String(a.fecha_registro).localeCompare(String(b.fecha_registro))
  )

  for (const fila of ordenadas) {
    const km = Number(fila.km_registro)
    const fecha = fechaISO(fila.fecha_registro)
    if (!fecha || !Number.isFinite(km)) continue

    if (ultimaKm === null || km >= ultimaKm) {
      utiles.push({ fecha, km })
      ultimaKm = km
    }
  }

  if (utiles.length < 2) {
    return {
      promedio_semanal_km: null,
      promedio_mensual_km: null,
      dias_base: null,
      km_base: null,
      fecha_desde: null,
      fecha_hasta: utiles.at(-1)?.fecha ?? null,
    }
  }

  const ultima = utiles[utiles.length - 1]
  const limite = new Date(`${ultima.fecha}T00:00:00Z`)
  limite.setUTCDate(limite.getUTCDate() - 90)

  const ventana = utiles.filter(
    (x) => new Date(`${x.fecha}T00:00:00Z`) >= limite
  )

  const base = ventana.length >= 2 ? ventana : utiles
  const primera = base[0]
  const final = base[base.length - 1]
  const dias = diasEntre(primera.fecha, final.fecha)
  const km = final.km - primera.km

  if (dias <= 0 || km < 0) {
    return {
      promedio_semanal_km: null,
      promedio_mensual_km: null,
      dias_base: null,
      km_base: null,
      fecha_desde: primera.fecha,
      fecha_hasta: final.fecha,
    }
  }

  const diario = km / dias

  return {
    promedio_semanal_km: Math.round(diario * 7),
    promedio_mensual_km: Math.round(diario * 30.4375),
    dias_base: dias,
    km_base: Math.round(km),
    fecha_desde: primera.fecha,
    fecha_hasta: final.fecha,
  }
}

async function obtenerLecturasPreoperacionales(supabaseAdmin, placas) {
  if (!placas.length) return []

  const { data, error } = await supabaseAdmin
    .from('preoperacionales')
    .select('placa,fecha_registro,km_registro')
    .in('placa', placas)
    .not('km_registro', 'is', null)
    .order('fecha_registro', { ascending: true })

  if (error) throw error
  return data ?? []
}

async function obtenerUltimoPreoperacionalPorVehiculo(supabaseAdmin, vehiculos) {
  const pares = await Promise.all(
    vehiculos.map(async (vehiculo) => {
      const { data, error } = await supabaseAdmin
        .from('preoperacionales')
        .select('placa,fecha_registro,km_registro')
        .eq('placa', vehiculo.placa)
        .not('km_registro', 'is', null)
        .order('fecha_registro', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      return [
        Number(vehiculo.id),
        data
          ? {
              km: Number(data.km_registro),
              fecha: data.fecha_registro ?? null,
              origen: 'PREOPERACIONALES',
            }
          : null,
      ]
    })
  )

  return new Map(pares)
}

async function obtenerUltimoPreventivoPorVehiculo(supabaseAdmin, vehiculos) {
  const pares = await Promise.all(
    vehiculos.map(async (vehiculo) => {
      const { data, error } = await supabaseAdmin
        .from('mantenimientos')
        .select('id,fecha_registro,kilometraje')
        .eq('placa', vehiculo.placa)
        .ilike('tipo_mantenimiento', 'PREVENTIVO')
        .order('fecha_registro', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      return [
        Number(vehiculo.id),
        data
          ? {
              km: data.kilometraje == null ? null : Number(data.kilometraje),
              fecha: data.fecha_registro ?? null,
            }
          : null,
      ]
    })
  )

  return new Map(pares)
}

async function guardarEstadoPlan(supabaseAdmin, vehiculoId, payload) {
  const ahora = new Date().toISOString()

  const { data: existente, error: errorConsulta } = await supabaseAdmin
    .from('vehiculo_mantenimiento_plan_estado')
    .select('id')
    .eq('vehiculo_id', vehiculoId)
    .maybeSingle()

  if (errorConsulta) throw errorConsulta

  if (existente?.id) {
    const { data, error } = await supabaseAdmin
      .from('vehiculo_mantenimiento_plan_estado')
      .update({ ...payload, updated_at: ahora })
      .eq('id', existente.id)
      .select('id,vehiculo_id,estado,finalizado_at,reabierto_at,updated_at')
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabaseAdmin
    .from('vehiculo_mantenimiento_plan_estado')
    .insert({ vehiculo_id: vehiculoId, ...payload, updated_at: ahora })
    .select('id,vehiculo_id,estado,finalizado_at,reabierto_at,updated_at')
    .single()

  if (error) throw error
  return data
}

export async function GET(request) {
  try {
    const { supabaseAdmin, nit } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(request)

    const { searchParams } = new URL(request.url)
    const vehiculoId = Number(searchParams.get('vehiculo_id') || 0)

    if (vehiculoId > 0) {
      const { data: vehiculo, error: errorVehiculo } = await supabaseAdmin
        .from('vehiculos')
        .select(`
          id,placa,tipo_vehiculo,marca,estado,clasificacion,modelo,linea,
          tipo_carroceria,numero_chasis,numero_motor,vin,numero_licencia_transito,
          fecha_matricula,organismo_transito,numero_tarjeta_servicio,
          fecha_expedicion_tarjeta_servicio,fecha_vigencia_tarjeta_servicio
        `)
        .eq('id', vehiculoId)
        .single()

      if (errorVehiculo || !vehiculo) {
        return errorJson('No fue posible encontrar el vehículo solicitado.', 404)
      }

      if (!vehiculoActivo(vehiculo.estado)) {
        return errorJson('El vehículo seleccionado no se encuentra activo.', 409)
      }

      const tipo = tipoValido(vehiculo.tipo_vehiculo)
      if (!tipo) {
        return errorJson(
          `El tipo de vehículo "${vehiculo.tipo_vehiculo || 'SIN TIPO'}" no tiene catálogo configurado.`,
          409
        )
      }

      const [
        resultadoCatalogo,
        resultadoConfiguracion,
        resultadoEstado,
        resultadoMantenimientos,
        lecturas,
        resultadoEstadoPlan,
      ] = await Promise.all([
        supabaseAdmin
          .from('mantenimiento_actividades_catalogo')
          .select(`
            id,nombre,descripcion,tipo_vehiculo,activo,accion,
            frecuencia_recomendada_km,motivo_criterio
          `)
          .eq('tipo_vehiculo', tipo)
          .eq('activo', true)
          .order('frecuencia_recomendada_km', { ascending: true, nullsFirst: false })
          .order('nombre', { ascending: true }),

        supabaseAdmin
          .from('vehiculo_mantenimiento_config')
          .select(`
            id,vehiculo_id,actividad_id,frecuencia_km,frecuencia_meses,
            tolerancia_km,tolerancia_dias,activo,observaciones,
            origen_configuracion,fecha_configuracion,created_at,updated_at
          `)
          .eq('vehiculo_id', vehiculoId),

        supabaseAdmin
          .from('vehiculo_mantenimiento_estado')
          .select(`
            id,vehiculo_mantenimiento_config_id,fecha_ultima_ejecucion,
            km_ultima_ejecucion,mantenimiento_id,origen,numero_soporte,
            proveedor_taller,observaciones
          `),

        supabaseAdmin
          .from('mantenimientos')
          .select(`
            id,fecha_registro,placa,kilometraje,tipo_mantenimiento,
            actividad_realizada,repuestos_utilizados,empresa,responsable,observaciones
          `)
          .eq('placa', vehiculo.placa)
          .ilike('tipo_mantenimiento', 'PREVENTIVO')
          .order('fecha_registro', { ascending: false })
          .limit(2),

        obtenerLecturasPreoperacionales(supabaseAdmin, [vehiculo.placa]),

        supabaseAdmin
          .from('vehiculo_mantenimiento_plan_estado')
          .select('estado,finalizado_at,reabierto_at')
          .eq('vehiculo_id', vehiculoId)
          .maybeSingle(),
      ])

      if (resultadoCatalogo.error) throw resultadoCatalogo.error
      if (resultadoConfiguracion.error) throw resultadoConfiguracion.error
      if (resultadoEstado.error) throw resultadoEstado.error
      if (resultadoMantenimientos.error) throw resultadoMantenimientos.error
      if (resultadoEstadoPlan.error) throw resultadoEstadoPlan.error

      const configuraciones = resultadoConfiguracion.data ?? []
      const idsConfiguracion = new Set(configuraciones.map((x) => x.id))
      const estados = (resultadoEstado.data ?? []).filter((x) =>
        idsConfiguracion.has(x.vehiculo_mantenimiento_config_id)
      )

      const configPorActividad = new Map(
        configuraciones.map((x) => [Number(x.actividad_id), x])
      )
      const estadoPorConfig = new Map(
        estados.map((x) => [Number(x.vehiculo_mantenimiento_config_id), x])
      )

      const catalogoOrdenado = [...(resultadoCatalogo.data ?? [])].sort((a, b) => {
        const aa = esCambioAceite(a.nombre) ? 0 : 1
        const bb = esCambioAceite(b.nombre) ? 0 : 1
        if (aa !== bb) return aa - bb
        return (Number(a.frecuencia_recomendada_km) || 999999999) -
          (Number(b.frecuencia_recomendada_km) || 999999999) ||
          texto(a.nombre).localeCompare(texto(b.nombre), 'es')
      })
      const actividadBase = catalogoOrdenado.find((a) => esCambioAceite(a.nombre)) ?? null
      const configBase = actividadBase ? configPorActividad.get(Number(actividadBase.id)) ?? null : null
      const frecuenciaBase = configBase?.activo ? numeroPositivoONull(configBase.frecuencia_km) : null
      const limiteCicloKm = LIMITES_CICLO_KM[tipo] ?? null
      const limiteOperativoKm = frecuenciaBase && limiteCicloKm
        ? frecuenciaNormalizada(limiteCicloKm, frecuenciaBase) : limiteCicloKm

      const actividades = catalogoOrdenado.map((actividad) => {
        const configuracion = configPorActividad.get(Number(actividad.id)) ?? null
        const estado = configuracion ? estadoPorConfig.get(Number(configuracion.id)) ?? null : null
        return {
          ...actividad,
          es_frecuencia_base: esCambioAceite(actividad.nombre),
          frecuencia_sugerida_operativa_km: frecuenciaBase
            ? frecuenciaNormalizada(actividad.frecuencia_recomendada_km, frecuenciaBase)
            : actividad.frecuencia_recomendada_km,
          frecuencia_base_km: frecuenciaBase,
          limite_ciclo_referencia_km: limiteCicloKm,
          limite_ciclo_operativo_km: limiteOperativoKm,
          seleccionada: Boolean(configuracion?.activo),
          configuracion,
          ultima_ejecucion: estado,
        }
      })

      const lecturasPlaca = lecturas.filter(
        (x) => mayusculas(x.placa) === mayusculas(vehiculo.placa)
      )

      const ultimaLectura = [...lecturasPlaca]
        .sort((a, b) =>
          String(b.fecha_registro).localeCompare(String(a.fecha_registro))
        )
        .find((x) => Number.isFinite(Number(x.km_registro)))

      return NextResponse.json({
        ok: true,
        nitEmpresa: nit,
        vehiculo: {
          ...vehiculo,
          tipo_vehiculo_normalizado: tipo,
          ultimo_km: ultimaLectura ? Number(ultimaLectura.km_registro) : null,
          fecha_ultimo_km: ultimaLectura?.fecha_registro ?? null,
          origen_ultimo_km: ultimaLectura ? 'PREOPERACIONALES' : null,
        },
        promedios_recorrido: calcularPromediosRecorrido(lecturasPlaca),
        regla_frecuencias: {
          actividad_base_id: actividadBase?.id ?? null,
          actividad_base_nombre: actividadBase?.nombre ?? null,
          frecuencia_base_km: frecuenciaBase,
          limite_ciclo_referencia_km: limiteCicloKm,
          limite_ciclo_operativo_km: limiteOperativoKm,
          solo_multiplos_frecuencia_base: true,
        },
        ultimos_mantenimientos_preventivos: resultadoMantenimientos.data ?? [],
        actividades,
        estado_configuracion: resultadoEstadoPlan.data?.estado ||
          (configuraciones.some((x) => x.activo) ? 'BORRADOR' : 'SIN_CONFIGURAR'),
        resumen: {
          total_catalogo: actividades.length,
          configuradas: actividades.filter((x) => x.seleccionada).length,
        },
      })
    }

    const [resultadoVehiculos, resultadoConfiguraciones, resultadoEstadosPlan] = await Promise.all([
      supabaseAdmin
        .from('vehiculos')
        .select('id,placa,tipo_vehiculo,marca,estado,clasificacion,modelo,linea')
        .order('tipo_vehiculo', { ascending: true })
        .order('placa', { ascending: true }),
      supabaseAdmin
        .from('vehiculo_mantenimiento_config')
        .select('id,vehiculo_id,actividad_id,activo'),
      supabaseAdmin
        .from('vehiculo_mantenimiento_plan_estado')
        .select('vehiculo_id,estado,finalizado_at,reabierto_at'),
    ])

    if (resultadoVehiculos.error) throw resultadoVehiculos.error
    if (resultadoConfiguraciones.error) throw resultadoConfiguraciones.error
    if (resultadoEstadosPlan.error) throw resultadoEstadosPlan.error

    const vehiculos = (resultadoVehiculos.data ?? []).filter(
      (v) => vehiculoActivo(v.estado) && Boolean(tipoValido(v.tipo_vehiculo))
    )

    const [ultimosPreoperacionales, ultimosPreventivos, resultadoCatalogo] =
      await Promise.all([
        obtenerUltimoPreoperacionalPorVehiculo(supabaseAdmin, vehiculos),
        obtenerUltimoPreventivoPorVehiculo(supabaseAdmin, vehiculos),
        supabaseAdmin
          .from('mantenimiento_actividades_catalogo')
          .select('id,tipo_vehiculo,activo')
          .eq('activo', true),
      ])

    if (resultadoCatalogo.error) throw resultadoCatalogo.error

    const totalCatalogoPorTipo = {}
    for (const tipo of TIPOS_VEHICULO) {
      totalCatalogoPorTipo[tipo] = (resultadoCatalogo.data ?? []).filter(
        (x) => tipoValido(x.tipo_vehiculo) === tipo && x.activo
      ).length
    }

    const configActivas = (resultadoConfiguraciones.data ?? []).filter((x) => x.activo)
    const estadoPlanPorVehiculo = new Map(
      (resultadoEstadosPlan.data ?? []).map((x) => [Number(x.vehiculo_id), x])
    )

    const salida = vehiculos.map((vehiculo) => {
      const tipo = tipoValido(vehiculo.tipo_vehiculo)
      const configuradas = configActivas.filter(
        (x) => Number(x.vehiculo_id) === Number(vehiculo.id)
      ).length

      const ultimoPreop = ultimosPreoperacionales.get(Number(vehiculo.id)) ?? null
      const ultimoPreventivo = ultimosPreventivos.get(Number(vehiculo.id)) ?? null
      const estadoGuardado = estadoPlanPorVehiculo.get(Number(vehiculo.id)) ?? null
      const estadoPlan = estadoGuardado?.estado ||
        (configuradas > 0 ? 'BORRADOR' : 'SIN_CONFIGURAR')

      return {
        ...vehiculo,
        tipo_vehiculo_normalizado: tipo,
        ultimo_km: ultimoPreop?.km ?? null,
        fecha_ultimo_km: ultimoPreop?.fecha ?? null,
        origen_ultimo_km: ultimoPreop?.origen ?? null,
        ultimo_mantenimiento_preventivo_km: ultimoPreventivo?.km ?? null,
        fecha_ultimo_mantenimiento_preventivo: ultimoPreventivo?.fecha ?? null,
        actividades_configuradas: configuradas,
        actividades_catalogo: totalCatalogoPorTipo[tipo] ?? 0,
        estado_plan: estadoPlan,
        plan_finalizado_at: estadoGuardado?.finalizado_at ?? null,
      }
    })

    return NextResponse.json({
      ok: true,
      nitEmpresa: nit,
      tipos_vehiculo: TIPOS_VEHICULO,
      vehiculos: salida,
    })
  } catch (error) {
    console.error('Error en configuración plan de mantenimiento:', error)
    const respuesta = respuestaErrorEmpresa(error)
    return NextResponse.json(
      {
        ok: false,
        error: respuesta.body.message,
        code: respuesta.body.code,
      },
      { status: respuesta.status }
    )
  }
}

export async function POST(request) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return errorJson('La información enviada no es válida.')
    }

    const { supabaseAdmin, nit } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(request, body)

    const accion = mayusculas(body?.accion)

    if (accion === 'AGREGAR_ACTIVIDAD') {
      const tipoVehiculo = tipoValido(body?.tipo_vehiculo)
      const nombre = texto(body?.nombre)
      const accionActividad = texto(body?.accion_actividad)
      const descripcion = texto(body?.descripcion)
      const motivoCriterio = texto(body?.motivo_criterio)
      const frecuenciaRecomendada = numeroPositivoONull(
        body?.frecuencia_recomendada_km
      )

      if (!tipoVehiculo) return errorJson('Seleccione un tipo de vehículo válido.')
      if (!nombre) return errorJson('Ingrese el nombre de la actividad.')
      if (!accionActividad) return errorJson('Ingrese la acción preventiva de la actividad.')
      if (Number.isNaN(frecuenciaRecomendada)) {
        return errorJson('La frecuencia sugerida debe ser mayor que cero.')
      }
      if (frecuenciaRecomendada === null) {
        return errorJson('Ingrese la frecuencia sugerida en kilómetros.')
      }

      const { data: existentes, error: errorExistentes } = await supabaseAdmin
        .from('mantenimiento_actividades_catalogo')
        .select('id,nombre,accion,tipo_vehiculo')
        .eq('tipo_vehiculo', tipoVehiculo)

      if (errorExistentes) throw errorExistentes

      const duplicada = (existentes ?? []).find(
        (x) =>
          mayusculas(x.nombre) === mayusculas(nombre) &&
          mayusculas(x.accion) === mayusculas(accionActividad)
      )
      if (duplicada) {
        return errorJson(
          `La actividad "${duplicada.nombre}" con la acción "${duplicada.accion}" ya existe para ${tipoVehiculo}.`,
          409,
          { codigo: 'ACTIVIDAD_DUPLICADA' }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('mantenimiento_actividades_catalogo')
        .insert({
          nombre,
          accion: accionActividad,
          descripcion: descripcion || null,
          motivo_criterio: motivoCriterio || null,
          tipo_vehiculo: tipoVehiculo,
          categoria: 'PREVENTIVO',
          activo: true,
          frecuencia_recomendada_km: frecuenciaRecomendada,
          updated_at: new Date().toISOString(),
        })
        .select(`
          id,nombre,accion,descripcion,tipo_vehiculo,activo,
          frecuencia_recomendada_km,motivo_criterio
        `)
        .single()

      if (error) {
        if (error.code === '23505') {
          return errorJson(
            `La actividad con esa acción ya existe para ${tipoVehiculo}.`,
            409
          )
        }
        throw error
      }

      return NextResponse.json(
        { ok: true, mensaje: 'Actividad agregada correctamente.', actividad: data },
        { status: 201 }
      )
    }

    if (accion === 'FINALIZAR_CONFIGURACION' || accion === 'REABRIR_CONFIGURACION') {
      const vehiculoId = Number(body?.vehiculo_id)
      if (!Number.isInteger(vehiculoId) || vehiculoId <= 0) {
        return errorJson('El vehículo seleccionado no es válido.')
      }

      const { data: vehiculo, error: errorVehiculo } = await supabaseAdmin
        .from('vehiculos')
        .select('id,placa,tipo_vehiculo,estado')
        .eq('id', vehiculoId)
        .single()

      if (errorVehiculo || !vehiculo) return errorJson('No fue posible encontrar el vehículo.', 404)
      if (!vehiculoActivo(vehiculo.estado)) return errorJson('El vehículo no se encuentra activo.', 409)

      const tipo = tipoValido(vehiculo.tipo_vehiculo)
      if (!tipo) return errorJson('El tipo de vehículo no tiene catálogo.', 409)

      if (accion === 'REABRIR_CONFIGURACION') {
        const estadoGuardado = await guardarEstadoPlan(supabaseAdmin, vehiculoId, {
          estado: 'BORRADOR',
          finalizado_at: null,
          reabierto_at: new Date().toISOString(),
        })
        return NextResponse.json({
          ok: true,
          mensaje: `Configuración de ${vehiculo.placa} reabierta correctamente.`,
          estado_configuracion: estadoGuardado.estado,
        })
      }

      const { data: configuraciones, error: errorConfig } = await supabaseAdmin
        .from('vehiculo_mantenimiento_config')
        .select('actividad_id,activo,frecuencia_km')
        .eq('vehiculo_id', vehiculoId)
        .eq('activo', true)
      if (errorConfig) throw errorConfig

      const ids = (configuraciones ?? []).map((x) => Number(x.actividad_id))
      if (!ids.length) return errorJson('Debe configurar actividades antes de finalizar el plan.', 409)

      const { data: seleccionadas, error: errorSeleccionadas } = await supabaseAdmin
        .from('mantenimiento_actividades_catalogo')
        .select('id,nombre,frecuencia_recomendada_km')
        .in('id', ids)
      if (errorSeleccionadas) throw errorSeleccionadas

      const actividadBaseFinal = (seleccionadas ?? []).find((x) => esCambioAceite(x.nombre))
      const configBaseFinal = actividadBaseFinal
        ? (configuraciones ?? []).find((x) => Number(x.actividad_id) === Number(actividadBaseFinal.id))
        : null
      const frecuenciaBaseFinal = numeroPositivoONull(configBaseFinal?.frecuencia_km)
      if (!actividadBaseFinal || Number.isNaN(frecuenciaBaseFinal) || frecuenciaBaseFinal === null) {
        return errorJson('Debe configurar una frecuencia base válida para el cambio de aceite antes de finalizar.', 409, { codigo: 'FRECUENCIA_BASE_REQUERIDA' })
      }
      if ((configuraciones ?? []).some((x) => !multiploValido(x.frecuencia_km, frecuenciaBaseFinal))) {
        return errorJson(
          `No se puede finalizar: todas las frecuencias deben ser múltiplos de ${frecuenciaBaseFinal.toLocaleString('es-CO')} km.`,
          409,
          { codigo: 'FRECUENCIA_NO_MULTIPLO_BASE', frecuencia_base_km: frecuenciaBaseFinal }
        )
      }

      const nombres = new Set((seleccionadas ?? []).map((x) => mayusculas(x.nombre)))
      const faltantes = (ACTIVIDADES_ESENCIALES[tipo] ?? []).filter((nombre) => !nombres.has(mayusculas(nombre)))
      if (faltantes.length) {
        return errorJson(
          'La configuración aún no cubre todas las actividades esenciales del tipo de vehículo.',
          409,
          { codigo: 'CONFIGURACION_INCOMPLETA', actividades_faltantes: faltantes }
        )
      }

      const estadoGuardado = await guardarEstadoPlan(supabaseAdmin, vehiculoId, {
        estado: 'FINALIZADO',
        finalizado_at: new Date().toISOString(),
        reabierto_at: null,
      })

      return NextResponse.json({
        ok: true,
        mensaje: `Plan de mantenimiento de ${vehiculo.placa} finalizado correctamente.`,
        actividades_configuradas: ids.length,
        estado_configuracion: estadoGuardado.estado,
        finalizado_at: estadoGuardado.finalizado_at,
      })
    }

    if (accion === 'GUARDAR_CONFIGURACION') {
      const vehiculoId = Number(body?.vehiculo_id)
      const actividades = Array.isArray(body?.actividades) ? body.actividades : []

      if (!Number.isInteger(vehiculoId) || vehiculoId <= 0) {
        return errorJson('El vehículo seleccionado no es válido.')
      }

      const { data: vehiculo, error: errorVehiculo } = await supabaseAdmin
        .from('vehiculos')
        .select('id,placa,tipo_vehiculo,estado')
        .eq('id', vehiculoId)
        .single()

      if (errorVehiculo || !vehiculo) {
        return errorJson('No fue posible encontrar el vehículo.', 404)
      }
      if (!vehiculoActivo(vehiculo.estado)) {
        return errorJson('No se puede configurar un vehículo inactivo.', 409)
      }

      const tipo = tipoValido(vehiculo.tipo_vehiculo)
      if (!tipo) return errorJson('El tipo de vehículo no tiene catálogo.', 409)

      const seleccionadas = actividades.filter((x) => x?.seleccionada === true)

      for (const item of seleccionadas) {
        const actividadId = Number(item?.actividad_id)
        const frecuenciaKm = numeroPositivoONull(item?.frecuencia_km)

        if (!Number.isInteger(actividadId) || actividadId <= 0) {
          return errorJson('Existe una actividad seleccionada no válida.')
        }
        if (Number.isNaN(frecuenciaKm) || frecuenciaKm === null) {
          return errorJson(
            'Cada actividad seleccionada debe tener una frecuencia válida en kilómetros.'
          )
        }
      }

      const { data: catalogo, error: errorCatalogo } = await supabaseAdmin
        .from('mantenimiento_actividades_catalogo')
        .select('id,nombre,tipo_vehiculo,activo,frecuencia_recomendada_km')
        .eq('tipo_vehiculo', tipo)
        .eq('activo', true)

      if (errorCatalogo) throw errorCatalogo

      const idsValidos = new Set((catalogo ?? []).map((x) => Number(x.id)))
      if (seleccionadas.some((x) => !idsValidos.has(Number(x.actividad_id)))) {
        return errorJson(
          'Existe una actividad que no corresponde al tipo de vehículo.'
        )
      }

      const actividadBase = (catalogo ?? []).find((x) => esCambioAceite(x.nombre))
      const itemBase = actividadBase
        ? seleccionadas.find((x) => Number(x.actividad_id) === Number(actividadBase.id))
        : null
      if (!actividadBase || !itemBase) {
        return errorJson('Debe seleccionar la actividad de cambio de aceite para definir la frecuencia base.', 409, { codigo: 'FRECUENCIA_BASE_REQUERIDA' })
      }
      const frecuenciaBase = numeroPositivoONull(itemBase.frecuencia_km)
      if (Number.isNaN(frecuenciaBase) || frecuenciaBase === null) {
        return errorJson('La frecuencia base de cambio de aceite debe ser mayor que cero.')
      }
      const incompatibles = seleccionadas.filter((x) => !multiploValido(x.frecuencia_km, frecuenciaBase))
      if (incompatibles.length) {
        return errorJson(
          `Todas las frecuencias deben ser múltiplos exactos de la frecuencia base (${frecuenciaBase.toLocaleString('es-CO')} km).`,
          409,
          {
            codigo: 'FRECUENCIA_NO_MULTIPLO_BASE',
            frecuencia_base_km: frecuenciaBase,
            actividades_incompatibles: incompatibles.map((x) => {
              const a = (catalogo ?? []).find((c) => Number(c.id) === Number(x.actividad_id))
              return {
                actividad_id: Number(x.actividad_id),
                actividad: a?.nombre || 'Actividad',
                frecuencia_km: Number(x.frecuencia_km) || null,
                frecuencia_sugerida_km: frecuenciaNormalizada(a?.frecuencia_recomendada_km, frecuenciaBase),
              }
            }),
          }
        )
      }

      const { data: actuales, error: errorActuales } = await supabaseAdmin
        .from('vehiculo_mantenimiento_config')
        .select('id,actividad_id,activo,frecuencia_km,frecuencia_meses')
        .eq('vehiculo_id', vehiculoId)

      if (errorActuales) throw errorActuales

      const seleccionadasPorId = new Map(
        seleccionadas.map((x) => [Number(x.actividad_id), x])
      )

      for (const actual of actuales ?? []) {
        if (!seleccionadasPorId.has(Number(actual.actividad_id))) {
          const { error } = await supabaseAdmin
            .from('vehiculo_mantenimiento_config')
            .update({
              activo: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', actual.id)

          if (error) throw error
        }
      }

      for (const item of seleccionadas) {
        const actividadId = Number(item.actividad_id)
        const frecuenciaKm = numeroPositivoONull(item.frecuencia_km)
        const observaciones = texto(item.observaciones)
        const actual = (actuales ?? []).find(
          (x) => Number(x.actividad_id) === actividadId
        )

        const payload = {
          vehiculo_id: vehiculoId,
          actividad_id: actividadId,
          frecuencia_km: frecuenciaKm,
          frecuencia_meses: null,
          tolerancia_km: 0,
          tolerancia_dias: 0,
          activo: true,
          observaciones: observaciones || null,
          origen_configuracion: 'MANUAL',
          fecha_configuracion: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        }

        const operacion = actual
          ? supabaseAdmin
              .from('vehiculo_mantenimiento_config')
              .update(payload)
              .eq('id', actual.id)
          : supabaseAdmin
              .from('vehiculo_mantenimiento_config')
              .insert(payload)

        const { error } = await operacion
        if (error) throw error
      }

      await guardarEstadoPlan(supabaseAdmin, vehiculoId, {
        estado: seleccionadas.length > 0 ? 'BORRADOR' : 'SIN_CONFIGURAR',
        finalizado_at: null,
      })

      return NextResponse.json({
        ok: true,
        nitEmpresa: nit,
        mensaje: seleccionadas.length > 0
          ? `Configuración de ${vehiculo.placa} guardada como borrador.`
          : `El vehículo ${vehiculo.placa} quedó sin actividades configuradas.`,
        vehiculo_id: vehiculoId,
        actividades_configuradas: seleccionadas.length,
      })
    }

    return errorJson('La acción solicitada no es válida.')
  } catch (error) {
    console.error('Error guardando configuración de mantenimiento:', error)
    const respuesta = respuestaErrorEmpresa(error)
    return NextResponse.json(
      {
        ok: false,
        error: respuesta.body.message,
        code: respuesta.body.code,
      },
      { status: respuesta.status }
    )
  }
}

// No se implementa DELETE.
