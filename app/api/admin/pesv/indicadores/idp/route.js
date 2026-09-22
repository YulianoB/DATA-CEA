// app/api/admin/pesv/indicadores/idp/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

const ESTADOS_OPERACION = new Set(['DICTADA', 'PENDIENTE_CARGUE'])
const TAMANO_PAGINA = 1000

function texto(v) {
  return String(v ?? '').trim()
}

function normalizar(v) {
  return texto(v)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function placaNormalizada(v) {
  return normalizar(v).replace(/[^A-Z0-9]/g, '')
}

function entero(v, fallback = 0) {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

function redondear(v, decimales = 2) {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  const f = 10 ** decimales
  return Math.round((n + Number.EPSILON) * f) / f
}

function fechaISO(anio, mes, dia) {
  return `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
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

function hoyColombia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function restarUnDia(fecha) {
  const [a, m, d] = String(fecha).split('-').map(Number)
  const x = new Date(Date.UTC(a, m - 1, d))
  x.setUTCDate(x.getUTCDate() - 1)
  return x.toISOString().slice(0, 10)
}

function clave(placa, fecha) {
  return `${placaNormalizada(placa)}|${fecha}`
}

function validarPeriodo(anio, mes) {
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    throw Object.assign(new Error('El año de medición no es válido.'), {
      status: 400,
      code: 'ANIO_INVALIDO',
    })
  }

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw Object.assign(new Error('El mes de medición no es válido.'), {
      status: 400,
      code: 'MES_INVALIDO',
    })
  }
}

function construirPeriodo(anio, mes) {
  const inicioMes = fechaISO(anio, mes, 1)
  const finMes = fechaISO(anio, mes, ultimoDiaMes(anio, mes))
  const hoy = hoyColombia()
  const ayer = restarUnDia(hoy)
  const corte = minFecha(finMes, ayer)

  if (compararFechas(corte, inicioMes) < 0) {
    throw Object.assign(
      new Error(
        'El período seleccionado todavía no tiene días cerrados para evaluar. IDP solo calcula hasta el día anterior.'
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
    fecha_inicio_mes: inicioMes,
    fecha_fin_mes: finMes,
    fecha_inicio_acumulado: fechaISO(anio, 1, 1),
    fecha_corte: corte,
    hoy_colombia: hoy,
  }
}

async function consultarPaginado(crearConsulta) {
  const filas = []
  let desde = 0

  while (true) {
    const hasta = desde + TAMANO_PAGINA - 1
    const { data, error } = await crearConsulta(desde, hasta)

    if (error) throw error

    const pagina = data || []
    filas.push(...pagina)

    if (pagina.length < TAMANO_PAGINA) break
    desde += TAMANO_PAGINA
  }

  return filas
}

async function consultarPreoperacionales(supabase, inicio, fin) {
  try {
    return await consultarPaginado((desde, hasta) =>
      supabase
        .from('preoperacionales')
        .select(`
          id,
          consecutivo,
          fecha_registro,
          hora_registro,
          placa,
          tipo_vehiculo,
          marca,
          km_registro,
          usuario_encargado,
          observaciones,
          estado_observacion
        `)
        .gte('fecha_registro', inicio)
        .lte('fecha_registro', fin)
        .order('fecha_registro', { ascending: true })
        .order('id', { ascending: true })
        .range(desde, hasta)
    )
  } catch (error) {
    throw new Error(`No fue posible consultar Preoperacionales: ${error.message}`)
  }
}

async function consultarHorarios(supabase, inicio, fin) {
  try {
    return await consultarPaginado((desde, hasta) =>
      supabase
        .from('horarios')
        .select(`
          id,
          fecha_entrada,
          usuario,
          nombre_completo,
          rol,
          placa,
          estado_registro
        `)
        .gte('fecha_entrada', inicio)
        .lte('fecha_entrada', fin)
        .order('fecha_entrada', { ascending: true })
        .order('id', { ascending: true })
        .range(desde, hasta)
    )
  } catch (error) {
    throw new Error(`No fue posible consultar Horarios: ${error.message}`)
  }
}

async function consultarProgramacion(supabase, inicio, fin) {
  try {
    return await consultarPaginado((desde, hasta) =>
      supabase
        .from('programacion_clases')
        .select(`
          id,
          vehiculo_id,
          fecha,
          hora_inicio,
          estado,
          tipo_programacion,
          vehiculo:vehiculo_id (
            id,
            placa,
            tipo_vehiculo,
            marca,
            estado
          )
        `)
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .in('estado', ['DICTADA', 'PENDIENTE_CARGUE'])
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true })
        .order('id', { ascending: true })
        .range(desde, hasta)
    )
  } catch (error) {
    throw new Error(`No fue posible consultar Programación de clases: ${error.message}`)
  }
}

function consolidarPreoperacionales(filas) {
  const mapa = new Map()

  for (const f of filas) {
    const fecha = texto(f?.fecha_registro)
    const placa = placaNormalizada(f?.placa)
    if (!fecha || !placa) continue

    const k = clave(placa, fecha)

    if (!mapa.has(k)) {
      mapa.set(k, {
        key: k,
        fecha,
        placa,
        registros: 0,
        ids: [],
        consecutivos: [],
        usuarios: new Set(),
        tipo_vehiculo: texto(f?.tipo_vehiculo) || null,
        marca: texto(f?.marca) || null,
      })
    }

    const x = mapa.get(k)
    x.registros += 1
    x.ids.push(f.id)

    if (texto(f?.consecutivo)) x.consecutivos.push(texto(f.consecutivo))
    if (texto(f?.usuario_encargado)) x.usuarios.add(texto(f.usuario_encargado))
  }

  return [...mapa.values()].map((x) => ({
    ...x,
    usuarios: [...x.usuarios],
    duplicado: x.registros > 1,
  }))
}

function consolidarHorarios(filas) {
  const mapa = new Map()

  for (const f of filas) {
    const fecha = texto(f?.fecha_entrada)
    const placa = placaNormalizada(f?.placa)
    if (!fecha || !placa) continue

    const k = clave(placa, fecha)

    if (!mapa.has(k)) {
      mapa.set(k, {
        key: k,
        fecha,
        placa,
        registros: 0,
        ids: [],
        usuarios: new Set(),
        instructores: new Set(),
        estados: new Set(),
      })
    }

    const x = mapa.get(k)
    x.registros += 1
    x.ids.push(f.id)

    if (texto(f?.usuario)) x.usuarios.add(texto(f.usuario))
    if (texto(f?.nombre_completo)) x.instructores.add(texto(f.nombre_completo))
    if (texto(f?.estado_registro)) x.estados.add(texto(f.estado_registro))
  }

  return [...mapa.values()].map((x) => ({
    ...x,
    usuarios: [...x.usuarios],
    instructores: [...x.instructores],
    estados: [...x.estados],
  }))
}

function consolidarProgramacion(filas) {
  const mapa = new Map()

  for (const f of filas) {
    const fecha = texto(f?.fecha)
    const estado = normalizar(f?.estado)

    if (!ESTADOS_OPERACION.has(estado)) continue

    const placa = placaNormalizada(f?.vehiculo?.placa)
    if (!fecha || !placa) continue

    const k = clave(placa, fecha)

    if (!mapa.has(k)) {
      mapa.set(k, {
        key: k,
        fecha,
        placa,
        vehiculo_id: f?.vehiculo_id || f?.vehiculo?.id || null,
        tipo_vehiculo: texto(f?.vehiculo?.tipo_vehiculo) || null,
        marca: texto(f?.vehiculo?.marca) || null,
        estado_vehiculo: texto(f?.vehiculo?.estado) || null,
        registros: 0,
        dictadas: 0,
        pendientes_cargue: 0,
        ids: [],
      })
    }

    const x = mapa.get(k)
    x.registros += 1
    x.ids.push(f.id)

    if (estado === 'DICTADA') x.dictadas += 1
    if (estado === 'PENDIENTE_CARGUE') x.pendientes_cargue += 1
  }

  return [...mapa.values()]
}

function conciliar(pre, horarios, programacion) {
  const mp = new Map(pre.map((x) => [x.key, x]))
  const mh = new Map(horarios.map((x) => [x.key, x]))
  const mc = new Map(programacion.map((x) => [x.key, x]))

  const claves = new Set([...mp.keys(), ...mh.keys(), ...mc.keys()])
  const detalle = []

  for (const k of claves) {
    const p = mp.get(k) || null
    const h = mh.get(k) || null
    const c = mc.get(k) || null

    const fecha = p?.fecha || h?.fecha || c?.fecha || null
    const placa = p?.placa || h?.placa || c?.placa || null

    const tienePre = Boolean(p)
    const tieneHorarios = Boolean(h)
    const tieneProgramacion = Boolean(c)

    // El universo TV se confirma con evidencia efectiva de operación.
    // El preoperacional acredita que la inspección fue realizada, pero por sí solo
    // no demuestra que el vehículo efectivamente operó durante ese día.
    const opero = tieneHorarios || tieneProgramacion
    const inspeccionado = opero && tienePre

    const fuentes = []
    if (tienePre) fuentes.push('PREOPERACIONALES')
    if (tieneHorarios) fuentes.push('HORARIOS')
    if (tieneProgramacion) fuentes.push('PROGRAMACIÓN DE CLASES')

    let clasificacion = 'SIN CLASIFICAR'

    if (inspeccionado) {
      if (tieneHorarios && tieneProgramacion) {
        clasificacion = 'INSPECCIONADO_CON_TRES_FUENTES'
      } else if (tieneHorarios) {
        clasificacion = 'INSPECCIONADO_CON_HORARIOS'
      } else if (tieneProgramacion) {
        clasificacion = 'INSPECCIONADO_CON_PROGRAMACION'
      }
    } else if (tienePre && !tieneHorarios && !tieneProgramacion) {
      clasificacion = 'PREOPERACIONAL_SIN_EVIDENCIA_DIGITAL_DE_OPERACION'
    } else if (tieneHorarios && tieneProgramacion) {
      clasificacion = 'OPERADO_SIN_PREOPERACIONAL_HORARIOS_Y_PROGRAMACION'
    } else if (tieneHorarios) {
      clasificacion = 'OPERADO_SIN_PREOPERACIONAL_HORARIOS'
    } else if (tieneProgramacion) {
      clasificacion = 'OPERADO_SIN_PREOPERACIONAL_PROGRAMACION'
    }

    detalle.push({
      fecha,
      placa,
      opero,
      inspeccionado,
      fuentes_operacion: fuentes,
      clasificacion,

      preoperacional: p
        ? {
            registros: p.registros,
            ids: p.ids,
            consecutivos: p.consecutivos,
            usuarios: p.usuarios,
            tipo_vehiculo: p.tipo_vehiculo,
            marca: p.marca,
            duplicado: p.duplicado,
          }
        : null,

      horarios: h
        ? {
            registros: h.registros,
            ids: h.ids,
            usuarios: h.usuarios,
            instructores: h.instructores,
            estados: h.estados,
          }
        : null,

      programacion: c
        ? {
            vehiculo_id: c.vehiculo_id,
            registros: c.registros,
            dictadas: c.dictadas,
            pendientes_cargue: c.pendientes_cargue,
            ids: c.ids,
            tipo_vehiculo: c.tipo_vehiculo,
            marca: c.marca,
            estado_vehiculo: c.estado_vehiculo,
          }
        : null,
    })
  }

  return detalle.sort((a, b) => {
    const f = compararFechas(a.fecha, b.fecha)
    return f !== 0 ? f : String(a.placa).localeCompare(String(b.placa))
  })
}

function resumir(detalle) {
  const operados = detalle.filter((x) => x.opero)
  const inspeccionados = operados.filter((x) => x.inspeccionado)
  const sinPre = operados.filter((x) => !x.inspeccionado)

  const conPre = detalle.filter((x) => Boolean(x.preoperacional))
  const conHorarios = detalle.filter((x) => Boolean(x.horarios))
  const conProgramacion = detalle.filter((x) => Boolean(x.programacion))

  const soloPre = detalle.filter(
    (x) => x.preoperacional && !x.horarios && !x.programacion
  )

  const soloHorarios = detalle.filter(
    (x) => !x.preoperacional && x.horarios && !x.programacion
  )

  const soloProgramacion = detalle.filter(
    (x) => !x.preoperacional && !x.horarios && x.programacion
  )

  const tresFuentes = detalle.filter(
    (x) => x.preoperacional && x.horarios && x.programacion
  )

  const preSinEvidenciaOperacion = detalle.filter(
    (x) => x.preoperacional && !x.opero
  )

  const duplicados = detalle.filter((x) => x.preoperacional?.duplicado)

  // Cada fila consolidada equivale a una placa/día.
  const VID = inspeccionados.length
  const TV = operados.length
  const IDP = TV > 0 ? redondear((VID / TV) * 100, 2) : null

  const advertencias = []

  if (TV === 0) {
    advertencias.push(
      'No existen vehículos/día con evidencia digital de operación para calcular IDP en el período.'
    )
  }

  if (sinPre.length > 0) {
    advertencias.push(
      `${sinPre.length} vehículo(s)/día presentan evidencia de operación sin inspección preoperacional registrada.`
    )
  }

  if (duplicados.length > 0) {
    advertencias.push(
      `${duplicados.length} placa(s)/día presentan más de un preoperacional. Para IDP cada placa fue contabilizada una sola vez por día.`
    )
  }

  return {
    VID,
    TV,
    IDP,
    unidad_analisis: 'Vehículo/día',
    vehiculos_dia_operados: TV,
    vehiculos_dia_inspeccionados: VID,
    vehiculos_dia_sin_preoperacional: sinPre.length,
    preoperacionales_sin_evidencia_operacion: preSinEvidenciaOperacion.length,

    fuentes: {
      // Se conservan estas claves por compatibilidad interna. En la interfaz no
      // deben mostrarse como nombres técnicos; usar los textos de interpretacion_usuario.
      con_preoperacional: conPre.length,
      con_horarios: conHorarios.length,
      con_programacion: conProgramacion.length,
      solo_preoperacional: soloPre.length,
      solo_horarios: soloHorarios.length,
      solo_programacion: soloProgramacion.length,
      tres_fuentes: tresFuentes.length,
    },

    calidad: {
      preoperacionales_duplicados: duplicados.length,
    },

    advertencias,
    vehiculos_sin_preoperacional: sinPre,
    preoperacionales_sin_evidencia_operacion_detalle: preSinEvidenciaOperacion,
    preoperacionales_duplicados: duplicados,
  }
}

function filtrarPeriodo(detalle, inicio, fin) {
  return detalle.filter(
    (x) =>
      compararFechas(x.fecha, inicio) >= 0 &&
      compararFechas(x.fecha, fin) <= 0
  )
}

async function calcularIdp(supabase, anio, mes) {
  validarPeriodo(anio, mes)
  const periodo = construirPeriodo(anio, mes)

  const [fp, fh, fc] = await Promise.all([
    consultarPreoperacionales(
      supabase,
      periodo.fecha_inicio_acumulado,
      periodo.fecha_corte
    ),
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

  const pre = consolidarPreoperacionales(fp)
  const horarios = consolidarHorarios(fh)
  const programacion = consolidarProgramacion(fc)

  const detalleAcumulado = conciliar(pre, horarios, programacion)

  const detalleMes = filtrarPeriodo(
    detalleAcumulado,
    periodo.fecha_inicio_mes,
    periodo.fecha_corte
  )

  const mensual = resumir(detalleMes)
  const acumulado = resumir(detalleAcumulado)

  return {
    indicador: 'IDP',
    nombre: 'Inspecciones diarias preoperacionales',
    origen: 'AUTOMATICO',
    unidad: 'PORCENTAJE',
    periodicidad: 'ACUMULADO_MES_Y_ANO',

    criterio_operacional: {
      unidad_analisis: 'Vehículo/día',
      regla_conteo:
        'Cada vehículo se contabiliza máximo una vez por día, aunque tenga varios servicios, clases o movimientos registrados.',
      formula: 'IDP = (VID / TV) × 100',

      definiciones: {
        IDP:
          'Inspecciones Diarias Preoperacionales. Expresa el porcentaje de vehículos/día puestos en operación que cuentan con inspección preoperacional registrada.',
        VID:
          'Vehículos Inspeccionados Diariamente. Corresponde a los vehículos/día cuya operación fue confirmada y que cuentan con inspección preoperacional registrada.',
        TV:
          'Total de Vehículos que operan diariamente. Corresponde a los vehículos/día cuya operación fue confirmada mediante los registros disponibles de actividad del vehículo.',
      },

      fuentes_operacion: {
        horarios:
          'Registros de actividad diaria del vehículo que permiten confirmar que estuvo en operación.',
        programacion_clases:
          'Clases efectivamente dictadas o pendientes de cargue que permiten confirmar que el vehículo estuvo en operación.',
      },

      fuente_inspeccion: {
        preoperacionales:
          'El registro preoperacional acredita que la inspección fue realizada. Si existe un preoperacional pero no aparece otra evidencia digital de operación, el registro se conserva y se muestra como trazabilidad; no se considera omitido ni se trata como incumplimiento.',
      },

      aclaracion_preoperacionales_adicionales:
        'Es normal que existan más inspecciones preoperacionales que vehículos/día confirmados en operación mediante clases o registros de actividad. En la organización, todo vehículo que sale a rodar debe contar con su preoperacional, incluso cuando la salida no corresponde a una operación programada. Estos registros se conservan y se presentan como evidencia de control preventivo; no se eliminan ni se interpretan como registros omitidos.',

      estados_programacion_contabilizados: [
        'DICTADA',
        'PENDIENTE_CARGUE',
      ],

      estados_programacion_no_contabilizados: [
        'AGENDADA',
        'NO_DICTADA',
        'CANCELADA',
      ],

      limitacion:
        'El cálculo confirma la operación con los registros digitales de actividad disponibles. Una salida que no deje evidencia en esos registros no puede incorporarse automáticamente al total de vehículos/día operados. Los preoperacionales adicionales permanecen visibles como trazabilidad del control realizado.',
    },

    interpretacion_usuario: {
      titulo: '¿Cómo interpretar este indicador?',
      indicador:
        'IDP significa Inspecciones Diarias Preoperacionales. Mide qué porcentaje de los vehículos que se confirma que estuvieron en operación contó con su inspección preoperacional.',
      numerador:
        'VID significa Vehículos Inspeccionados Diariamente: vehículos/día con operación confirmada y con preoperacional registrado.',
      denominador:
        'TV significa Total de Vehículos que operan diariamente: vehículos/día cuya operación pudo confirmarse con los registros de actividad disponibles.',
      preoperacionales_adicionales:
        'Un preoperacional sin otra evidencia digital de operación no significa que el registro se esté omitiendo. Puede corresponder a un vehículo que salió a rodar sin una clase u operación programada. El preoperacional se conserva como evidencia de que el control preventivo fue realizado, pero no aumenta por sí solo el total de vehículos/día con operación confirmada utilizado en la fórmula.',
      lectura_resultado:
        'Un resultado más alto indica una mayor cobertura de inspecciones preoperacionales sobre los vehículos/día cuya operación fue confirmada.',
      nombres_para_interfaz: {
        preoperacionales_totales: 'Inspecciones preoperacionales registradas',
        preoperacionales_con_operacion_confirmada: 'Vehículos/día operados con inspección registrada',
        preoperacionales_sin_evidencia_operacion: 'Corresponde a inspecciones preoperacionales realizadas a vehículos que salieron a rodar, pero cuya salida no estuvo asociada a una clase u otra actividad registrada en los controles de operación utilizados para calcular el indicador. Estos preoperacionales son registros válidos y se conservan como evidencia del control preventivo realizado.',
        vehiculos_dia_operados: 'Vehículos/día con operación confirmada',
        vehiculos_dia_sin_preoperacional: 'Vehículos/día operados sin preoperacional registrado',
      },
    },

    periodo,

    mensual: {
      ...mensual,
      fecha_inicio: periodo.fecha_inicio_mes,
      fecha_fin: periodo.fecha_corte,
    },

    acumulado_anual: {
      ...acumulado,
      fecha_inicio: periodo.fecha_inicio_acumulado,
      fecha_fin: periodo.fecha_corte,
    },

    VID: mensual.VID,
    TV: mensual.TV,
    IDP: mensual.IDP,

    VID_acumulado: acumulado.VID,
    TV_acumulado: acumulado.TV,
    IDP_acumulado: acumulado.IDP,

    detalle_vehiculos_dia: detalleMes,
    detalle_vehiculos_dia_acumulado: detalleAcumulado,

    datos_calculo: {
      indicador: 'IDP',

      periodo: {
        anio,
        mes,
        fecha_inicio: periodo.fecha_inicio_mes,
        fecha_fin_programada: periodo.fecha_fin_mes,
        fecha_corte: periodo.fecha_corte,
      },

      mensual: {
        VID: mensual.VID,
        TV: mensual.TV,
        IDP: mensual.IDP,
      },

      acumulado_anual: {
        VID: acumulado.VID,
        TV: acumulado.TV,
        IDP: acumulado.IDP,
      },

      resumen_preoperacionales: {
        preoperacionales_totales: mensual.fuentes.con_preoperacional,
        preoperacionales_con_operacion_confirmada: mensual.VID,
        preoperacionales_sin_evidencia_operacion:
          mensual.preoperacionales_sin_evidencia_operacion,
        duplicados: mensual.calidad.preoperacionales_duplicados,
        aclaracion:
          'Los preoperacionales sin otra evidencia digital de operación se conservan como trazabilidad del control realizado y no representan registros omitidos.',
      },

      resumen_horarios: {
        vehiculos_dia: mensual.fuentes.con_horarios,
      },

      resumen_programacion: {
        vehiculos_dia: mensual.fuentes.con_programacion,
      },

      resumen_comparativo: {
        solo_preoperacional: mensual.fuentes.solo_preoperacional,
        solo_horarios: mensual.fuentes.solo_horarios,
        solo_programacion: mensual.fuentes.solo_programacion,
        tres_fuentes: mensual.fuentes.tres_fuentes,
        operados_sin_preoperacional:
          mensual.vehiculos_dia_sin_preoperacional,
        preoperacionales_sin_evidencia_operacion:
          mensual.preoperacionales_sin_evidencia_operacion,
      },

      detalle_vehiculos_dia: detalleMes,

      inconsistencias: [
        ...mensual.vehiculos_sin_preoperacional,
        ...mensual.preoperacionales_duplicados,
      ],

      advertencias: mensual.advertencias,

      nota_interpretacion:
        'La existencia de preoperacionales adicionales no significa que esos registros se omitan. Todo vehículo que sale a rodar debe contar con preoperacional, incluso cuando no existe una clase u operación programada. Estos registros se mantienen como trazabilidad del control preventivo.',

      limitacion_cobertura:
        'No es posible identificar automáticamente una operación que no haya dejado evidencia en los registros digitales de actividad consultados. Los preoperacionales adicionales se conservan por separado como evidencia de inspección realizada.',
    },
  }
}

function parametrosGet(request) {
  const url = new URL(request.url)

  return {
    anio: entero(url.searchParams.get('anio')),
    mes: entero(url.searchParams.get('mes')),
  }
}

// =========================================================
// GET
// =========================================================
//
// /api/admin/pesv/indicadores/idp?nit=...&anio=2026&mes=5
//
// =========================================================

export async function GET(request) {
  try {
    const { anio, mes } = parametrosGet(request)

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request)

    const resultado = await calcularIdp(supabase, anio, mes)

    return NextResponse.json({
      status: 'success',
      data: resultado,
    })
  } catch (error) {
    console.error(
      'Error GET /api/admin/pesv/indicadores/idp:',
      error
    )

    const respuesta = respuestaErrorEmpresa(error)

    return NextResponse.json(respuesta.body, {
      status: respuesta.status,
    })
  }
}

// =========================================================
// POST
// =========================================================
//
// {
//   nit: "...",
//   anio: 2026,
//   mes: 5
// }
//
// =========================================================

export async function POST(request) {
  try {
    const body = await request.json()

    const anio = entero(body?.anio)
    const mes = entero(body?.mes)

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request, body)

    const resultado = await calcularIdp(supabase, anio, mes)

    return NextResponse.json({
      status: 'success',
      data: resultado,
    })
  } catch (error) {
    console.error(
      'Error POST /api/admin/pesv/indicadores/idp:',
      error
    )

    const respuesta = respuestaErrorEmpresa(error)

    return NextResponse.json(respuesta.body, {
      status: respuesta.status,
    })
  }
}
