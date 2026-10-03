// app/api/admin/pesv/presupuesto/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// ============================================================
// CONSTANTES
// ============================================================

const CATEGORIAS_PESV = [
  'MANTENIMIENTO_SEGURIDAD',
  'CAPACITACION',
  'SENALIZACION',
  'TECNOLOGIA_MONITOREO',
  'EMERGENCIAS',
  'GESTION_PESV',
  'OTROS',
]

const ESTADOS_PRESUPUESTO = [
  'BORRADOR',
  'APROBADO',
  'CERRADO',
]

const CAMPOS_PRESUPUESTO = `
  id,
  vigencia,
  estado,
  fecha_elaboracion,
  fecha_aprobacion,
  fecha_cierre,
  observaciones,
  usuario_creacion,
  usuario_aprobacion,
  usuario_cierre,
  created_at,
  updated_at
`

const CAMPOS_PARTIDA = `
  id,
  presupuesto_id,
  concepto_id,
  concepto_nombre,
  categoria_pesv,
  observaciones,
  activo,
  usuario_creacion,
  usuario_actualizacion,
  created_at,
  updated_at
`

const CAMPOS_PROGRAMACION = `
  id,
  partida_id,
  mes,
  valor_programado,
  observaciones,
  usuario_creacion,
  usuario_actualizacion,
  created_at,
  updated_at
`

// ============================================================
// HELPERS GENERALES
// ============================================================

function texto(valor) {
  return String(valor ?? '').trim()
}

function numeroEntero(valor) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? Math.trunc(numero) : 0
}

function numero(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function idValido(valor) {
  const id = numeroEntero(valor)
  return id > 0 ? id : null
}

function usuarioActualizacion(body) {
  return (
    texto(
      body?.usuario_actualizacion ||
        body?.usuario ||
        body?.usuarioActual ||
        ''
    ) || null
  )
}

function anioActual() {
  return new Date().getFullYear()
}

function validarVigencia(valor) {
  const anio = numeroEntero(valor)
  return anio >= 2020 && anio <= 2100 ? anio : null
}

function fechaValida(valor) {
  const fecha = texto(valor)
  if (!fecha) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null
}

function fechaHoy() {
  return new Date().toISOString().slice(0, 10)
}

function validarCategoria(valor) {
  const categoria = texto(valor).toUpperCase()
  return CATEGORIAS_PESV.includes(categoria)
    ? categoria
    : null
}

function validarEstadoPresupuesto(valor) {
  const estado = texto(valor).toUpperCase()
  return ESTADOS_PRESUPUESTO.includes(estado)
    ? estado
    : null
}

function redondear(valor) {
  return Math.round((numero(valor) + Number.EPSILON) * 100) / 100
}

function porcentaje(ejecutado, presupuesto) {
  const base = numero(presupuesto)
  if (base <= 0) return numero(ejecutado) > 0 ? 100 : 0
  return redondear((numero(ejecutado) / base) * 100)
}

function trimestreMes(mes) {
  const m = numeroEntero(mes)
  return m >= 1 && m <= 12 ? Math.ceil(m / 3) : null
}

// ============================================================
// RESPUESTAS
// ============================================================

function respuestaOk(body = {}, status = 200) {
  return NextResponse.json(
    {
      ok: true,
      ...body,
    },
    { status }
  )
}

function respuestaError(mensaje, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: mensaje,
    },
    { status }
  )
}

function respuestaDesdeError(error, mensajePredeterminado) {
  console.error(mensajePredeterminado, error)

  if (error?.status || error?.code) {
    const respuesta = respuestaErrorEmpresa(error)

    return NextResponse.json(
      respuesta.body,
      {
        status: respuesta.status,
      }
    )
  }

  return respuestaError(
    error?.message || mensajePredeterminado,
    500
  )
}

// ============================================================
// CONSULTAS BASE
// ============================================================

async function obtenerPresupuestoPorVigencia(
  supabase,
  vigencia
) {
  const { data, error } =
    await supabase
      .from('pesv_presupuestos')
      .select(CAMPOS_PRESUPUESTO)
      .eq('vigencia', vigencia)
      .maybeSingle()

  if (error) throw error
  return data || null
}

async function obtenerPresupuestoPorId(
  supabase,
  presupuestoId
) {
  const { data, error } =
    await supabase
      .from('pesv_presupuestos')
      .select(CAMPOS_PRESUPUESTO)
      .eq('id', presupuestoId)
      .maybeSingle()

  if (error) throw error
  return data || null
}

async function obtenerConceptosPesv(supabase) {
  const { data, error } =
    await supabase
      .from('conceptos_caja')
      .select(`
        id,
        nombre,
        descripcion,
        naturaleza,
        activo,
        es_gasto_pesv,
        categoria_pesv
      `)
      .eq('es_gasto_pesv', true)
      .eq('activo', true)
      .order('categoria_pesv', { ascending: true })
      .order('nombre', { ascending: true })

  if (error) throw error

  return (data || []).filter(item => {
    const naturaleza =
      texto(item?.naturaleza).toUpperCase()

    return (
      ['EGRESO', 'AMBOS'].includes(naturaleza) &&
      validarCategoria(item?.categoria_pesv)
    )
  })
}

async function obtenerPartidas(
  supabase,
  presupuestoId
) {
  const { data, error } =
    await supabase
      .from('pesv_presupuesto_partidas')
      .select(CAMPOS_PARTIDA)
      .eq('presupuesto_id', presupuestoId)
      .order('categoria_pesv', { ascending: true })
      .order('concepto_nombre', { ascending: true })

  if (error) throw error
  return data || []
}

async function obtenerProgramacion(
  supabase,
  partidas
) {
  const ids = (partidas || [])
    .map(item => idValido(item?.id))
    .filter(Boolean)

  if (!ids.length) return []

  const { data, error } =
    await supabase
      .from('pesv_presupuesto_programacion')
      .select(CAMPOS_PROGRAMACION)
      .in('partida_id', ids)
      .order('partida_id', { ascending: true })
      .order('mes', { ascending: true })

  if (error) throw error
  return data || []
}

async function obtenerModificaciones(
  supabase,
  partidas
) {
  const ids = (partidas || [])
    .map(item => idValido(item?.id))
    .filter(Boolean)

  if (!ids.length) return []

  const { data, error } =
    await supabase
      .from('pesv_presupuesto_modificaciones')
      .select(`
        id,
        partida_id,
        fecha,
        tipo,
        valor,
        mes,
        motivo,
        usuario_registro,
        created_at
      `)
      .in('partida_id', ids)
      .order('fecha', { ascending: true })
      .order('id', { ascending: true })

  if (error) throw error
  return data || []
}

// ============================================================
// EGRESOS PESV
// Paginación para no depender del límite de filas de Supabase.
// ============================================================

async function obtenerEgresosPesvVigencia(
  supabase,
  vigencia
) {
  const desde = `${vigencia}-01-01`
  const hasta = `${vigencia}-12-31`
  const pagina = 1000
  const resultado = []
  let inicio = 0

  while (true) {
    const { data, error } =
      await supabase
        .from('egresos_caja')
        .select(`
          id,
          concepto_id,
          fecha,
          valor,
          estado,
          es_gasto_pesv,
          categoria_pesv,
          modalidad,
          estado_legalizacion,
          valor_legalizado
        `)
        .eq('estado', 'ACTIVO')
        .eq('es_gasto_pesv', true)
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('id', { ascending: true })
        .range(inicio, inicio + pagina - 1)

    if (error) throw error

    const filas = data || []
    resultado.push(...filas)

    if (filas.length < pagina) break
    inicio += pagina
  }

  return resultado
}

// ============================================================
// REGLA ÚNICA DE EJECUCIÓN PESV
//
// PAGO_DIRECTO:
//   ejecuta el valor del egreso.
//
// ENTREGA_PARA_LEGALIZAR:
//   solamente ejecuta cuando la legalización está LEGALIZADO,
//   tomando valor_legalizado.
//
// ANULADOS ya fueron excluidos en la consulta.
// ============================================================

function valorEjecutadoEgreso(egreso) {
  const modalidad =
    texto(egreso?.modalidad).toUpperCase()

  if (modalidad === 'ENTREGA_PARA_LEGALIZAR') {
    const estadoLegalizacion =
      texto(egreso?.estado_legalizacion).toUpperCase()

    if (estadoLegalizacion !== 'LEGALIZADO') {
      return 0
    }

    return redondear(
      Math.max(0, numero(egreso?.valor_legalizado))
    )
  }

  return redondear(
    Math.max(0, numero(egreso?.valor))
  )
}

// ============================================================
// SINCRONIZAR CONCEPTOS PESV -> PARTIDAS
//
// Solamente agrega conceptos faltantes.
// Nunca elimina partidas históricas.
// ============================================================

async function sincronizarConceptosPresupuesto({
  supabase,
  presupuesto,
  usuario,
}) {
  if (!presupuesto?.id) {
    throw new Error(
      'No existe un presupuesto válido para sincronizar.'
    )
  }

  if (
    texto(presupuesto?.estado).toUpperCase() !==
    'BORRADOR'
  ) {
    return {
      agregados: 0,
      conceptos: await obtenerConceptosPesv(supabase),
    }
  }

  const [conceptos, partidas] =
    await Promise.all([
      obtenerConceptosPesv(supabase),
      obtenerPartidas(supabase, presupuesto.id),
    ])

  const existentes = new Set(
    partidas.map(item => Number(item.concepto_id))
  )

  const faltantes = conceptos.filter(
    item => !existentes.has(Number(item.id))
  )

  if (!faltantes.length) {
    return {
      agregados: 0,
      conceptos,
    }
  }

  const fecha = new Date().toISOString()

  const payload = faltantes.map(concepto => ({
    presupuesto_id: presupuesto.id,
    concepto_id: concepto.id,
    concepto_nombre:
      texto(concepto.nombre).toUpperCase(),
    categoria_pesv:
      validarCategoria(concepto.categoria_pesv),
    observaciones: null,
    activo: true,
    usuario_creacion: usuario,
    usuario_actualizacion: usuario,
    created_at: fecha,
    updated_at: fecha,
  }))

  const { data, error } =
    await supabase
      .from('pesv_presupuesto_partidas')
      .insert(payload)
      .select(CAMPOS_PARTIDA)

  if (error) throw error

  return {
    agregados: (data || []).length,
    conceptos,
  }
}

// ============================================================
// ARMAR MATRIZ
// ============================================================

function construirMatriz({
  partidas,
  programacion,
  modificaciones,
  egresos,
  conceptosPesv,
}) {
  const programacionPorPartida = new Map()
  const modificacionesPorPartida = new Map()
  const ejecucionPorConcepto = new Map()

  for (const item of programacion || []) {
    const partidaId = Number(item.partida_id)
    const mes = numeroEntero(item.mes)

    if (!programacionPorPartida.has(partidaId)) {
      programacionPorPartida.set(partidaId, {})
    }

    programacionPorPartida.get(partidaId)[mes] =
      redondear(item.valor_programado)
  }

  for (const item of modificaciones || []) {
    const partidaId = Number(item.partida_id)

    if (!modificacionesPorPartida.has(partidaId)) {
      modificacionesPorPartida.set(
        partidaId,
        {
          total: 0,
          meses: {},
        }
      )
    }

    const grupo =
      modificacionesPorPartida.get(partidaId)

    const signo =
      texto(item.tipo).toUpperCase() === 'REDUCCION'
        ? -1
        : 1

    const valorMovimiento =
      redondear(numero(item.valor) * signo)

    grupo.total =
      redondear(grupo.total + valorMovimiento)

    const mes = numeroEntero(item.mes)

    if (mes >= 1 && mes <= 12) {
      grupo.meses[mes] =
        redondear(
          numero(grupo.meses[mes]) +
            valorMovimiento
        )
    }
  }

  for (const egreso of egresos || []) {
    const conceptoId = Number(egreso.concepto_id)
    const mes =
      numeroEntero(
        texto(egreso.fecha).slice(5, 7)
      )

    if (
      !conceptoId ||
      mes < 1 ||
      mes > 12
    ) {
      continue
    }

    if (!ejecucionPorConcepto.has(conceptoId)) {
      ejecucionPorConcepto.set(
        conceptoId,
        {
          total: 0,
          meses: {},
        }
      )
    }

    const grupo =
      ejecucionPorConcepto.get(conceptoId)

    const valor =
      valorEjecutadoEgreso(egreso)

    grupo.total =
      redondear(grupo.total + valor)

    grupo.meses[mes] =
      redondear(
        numero(grupo.meses[mes]) + valor
      )
  }

  const conceptosPorId = new Map(
    (conceptosPesv || []).map(item => [
      Number(item.id),
      item,
    ])
  )

  const conceptosPresupuestados = new Set(
    (partidas || []).map(
      item => Number(item.concepto_id)
    )
  )

  const filas = (partidas || []).map(partida => {
    const partidaId = Number(partida.id)
    const conceptoId = Number(partida.concepto_id)

    const planeacion =
      programacionPorPartida.get(partidaId) || {}

    const movimientos =
      modificacionesPorPartida.get(partidaId) || {
        total: 0,
        meses: {},
      }

    const ejecucion =
      ejecucionPorConcepto.get(conceptoId) || {
        total: 0,
        meses: {},
      }

    const meses = []
    let presupuestoInicial = 0
    let presupuestoVigente = 0
    let ejecutado = 0

    for (let mes = 1; mes <= 12; mes += 1) {
      const programado =
        redondear(planeacion[mes])

      const modificacion =
        redondear(movimientos.meses?.[mes])

      const vigente =
        redondear(programado + modificacion)

      const ejecutadoMes =
        redondear(ejecucion.meses?.[mes])

      presupuestoInicial =
        redondear(presupuestoInicial + programado)

      presupuestoVigente =
        redondear(presupuestoVigente + vigente)

      ejecutado =
        redondear(ejecutado + ejecutadoMes)

      meses.push({
        mes,
        trimestre: trimestreMes(mes),
        programado,
        modificacion,
        presupuesto_vigente: vigente,
        ejecutado: ejecutadoMes,
        diferencia:
          redondear(vigente - ejecutadoMes),
      })
    }

    // Las modificaciones sin mes también afectan el total anual.
    const modificacionesConMes =
      Object.values(movimientos.meses || {})
        .reduce(
          (suma, valor) =>
            redondear(suma + numero(valor)),
          0
        )

    const modificacionesSinMes =
      redondear(
        movimientos.total - modificacionesConMes
      )

    presupuestoVigente =
      redondear(
        presupuestoVigente +
          modificacionesSinMes
      )

    const saldo =
      redondear(presupuestoVigente - ejecutado)

    return {
      id: partida.id,
      partida_id: partida.id,
      presupuesto_id: partida.presupuesto_id,
      concepto_id: partida.concepto_id,
      concepto_nombre: partida.concepto_nombre,
      categoria_pesv: partida.categoria_pesv,
      activo: partida.activo,
      observaciones: partida.observaciones,
      presupuesto_inicial: presupuestoInicial,
      modificaciones:
        redondear(movimientos.total),
      presupuesto_vigente: presupuestoVigente,
      ejecutado,
      saldo,
      porcentaje_ejecucion:
        porcentaje(ejecutado, presupuestoVigente),
      sobre_ejecutado:
        ejecutado > presupuestoVigente,
      sin_presupuesto: false,
      meses,
    }
  })

  // ==========================================================
  // EGRESOS PESV DE CONCEPTOS NO INCLUIDOS EN EL PRESUPUESTO
  // Nunca se ocultan.
  // ==========================================================

  for (
    const [conceptoId, ejecucion]
    of ejecucionPorConcepto.entries()
  ) {
    if (conceptosPresupuestados.has(conceptoId)) {
      continue
    }

    if (numero(ejecucion.total) <= 0) {
      continue
    }

    const concepto =
      conceptosPorId.get(conceptoId)

    const egresoReferencia =
      (egresos || []).find(
        item =>
          Number(item.concepto_id) === conceptoId
      )

    const meses = []

    for (let mes = 1; mes <= 12; mes += 1) {
      const ejecutadoMes =
        redondear(ejecucion.meses?.[mes])

      meses.push({
        mes,
        trimestre: trimestreMes(mes),
        programado: 0,
        modificacion: 0,
        presupuesto_vigente: 0,
        ejecutado: ejecutadoMes,
        diferencia: redondear(-ejecutadoMes),
      })
    }

    filas.push({
      id: `SIN_PRESUPUESTO_${conceptoId}`,
      partida_id: null,
      presupuesto_id: null,
      concepto_id: conceptoId,
      concepto_nombre:
        texto(concepto?.nombre).toUpperCase() ||
        `CONCEPTO ${conceptoId}`,
      categoria_pesv:
        validarCategoria(
          concepto?.categoria_pesv ||
            egresoReferencia?.categoria_pesv
        ) || 'OTROS',
      activo: true,
      observaciones:
        'Ejecución PESV registrada en Caja sin partida presupuestal.',
      presupuesto_inicial: 0,
      modificaciones: 0,
      presupuesto_vigente: 0,
      ejecutado:
        redondear(ejecucion.total),
      saldo:
        redondear(-numero(ejecucion.total)),
      porcentaje_ejecucion: 100,
      sobre_ejecutado: true,
      sin_presupuesto: true,
      meses,
    })
  }

  filas.sort((a, b) => {
    const categoria =
      texto(a.categoria_pesv).localeCompare(
        texto(b.categoria_pesv),
        'es'
      )

    if (categoria !== 0) return categoria

    return texto(a.concepto_nombre).localeCompare(
      texto(b.concepto_nombre),
      'es'
    )
  })

  const totales = filas.reduce(
    (acumulado, fila) => {
      acumulado.presupuesto_inicial =
        redondear(
          acumulado.presupuesto_inicial +
            numero(fila.presupuesto_inicial)
        )

      acumulado.modificaciones =
        redondear(
          acumulado.modificaciones +
            numero(fila.modificaciones)
        )

      acumulado.presupuesto_vigente =
        redondear(
          acumulado.presupuesto_vigente +
            numero(fila.presupuesto_vigente)
        )

      acumulado.ejecutado =
        redondear(
          acumulado.ejecutado +
            numero(fila.ejecutado)
        )

      return acumulado
    },
    {
      presupuesto_inicial: 0,
      modificaciones: 0,
      presupuesto_vigente: 0,
      ejecutado: 0,
    }
  )

  totales.saldo =
    redondear(
      totales.presupuesto_vigente -
        totales.ejecutado
    )

  totales.porcentaje_ejecucion =
    porcentaje(
      totales.ejecutado,
      totales.presupuesto_vigente
    )

  return {
    filas,
    totales,
  }
}

// ============================================================
// CARGAR INFORMACIÓN COMPLETA DE UNA VIGENCIA
// ============================================================

async function cargarPresupuestoCompleto(
  supabase,
  vigencia
) {
  const presupuesto =
    await obtenerPresupuestoPorVigencia(
      supabase,
      vigencia
    )

  const conceptosPesv =
    await obtenerConceptosPesv(supabase)

  const egresos =
    await obtenerEgresosPesvVigencia(
      supabase,
      vigencia
    )

  if (!presupuesto?.id) {
    const matriz =
      construirMatriz({
        partidas: [],
        programacion: [],
        modificaciones: [],
        egresos,
        conceptosPesv,
      })

    return {
      presupuesto: null,
      conceptos_pesv: conceptosPesv,
      partidas: [],
      programacion: [],
      modificaciones: [],
      matriz: matriz.filas,
      totales: matriz.totales,
    }
  }

  const partidas =
    await obtenerPartidas(
      supabase,
      presupuesto.id
    )

  const [programacion, modificaciones] =
    await Promise.all([
      obtenerProgramacion(
        supabase,
        partidas
      ),
      obtenerModificaciones(
        supabase,
        partidas
      ),
    ])

  const matriz =
    construirMatriz({
      partidas,
      programacion,
      modificaciones,
      egresos,
      conceptosPesv,
    })

  return {
    presupuesto,
    conceptos_pesv: conceptosPesv,
    partidas,
    programacion,
    modificaciones,
    matriz: matriz.filas,
    totales: matriz.totales,
  }
}

// ============================================================
// NORMALIZAR PROGRAMACIÓN RECIBIDA
//
// Formato principal:
// programacion: [
//   { partida_id: 1, mes: 1, valor_programado: 100000 },
//   ...
// ]
//
// También admite:
// partidas: [
//   {
//     partida_id: 1,
//     meses: { "1": 100000, "2": 200000 }
//   }
// ]
// ============================================================

function normalizarProgramacion(body) {
  const resultado = []

  if (Array.isArray(body?.programacion)) {
    for (const item of body.programacion) {
      resultado.push({
        partida_id:
          idValido(item?.partida_id),
        mes:
          numeroEntero(item?.mes),
        valor_programado:
          numero(item?.valor_programado),
        observaciones:
          texto(item?.observaciones) || null,
      })
    }
  }

  if (Array.isArray(body?.partidas)) {
    for (const partida of body.partidas) {
      const partidaId =
        idValido(
          partida?.partida_id ||
            partida?.id
        )

      const meses =
        partida?.meses &&
        typeof partida.meses === 'object'
          ? partida.meses
          : {}

      for (let mes = 1; mes <= 12; mes += 1) {
        if (
          Object.prototype.hasOwnProperty.call(
            meses,
            String(mes)
          ) ||
          Object.prototype.hasOwnProperty.call(
            meses,
            mes
          )
        ) {
          resultado.push({
            partida_id: partidaId,
            mes,
            valor_programado:
              numero(
                meses[String(mes)] ??
                  meses[mes]
              ),
            observaciones: null,
          })
        }
      }
    }
  }

  const unicos = new Map()

  for (const item of resultado) {
    if (
      !item.partida_id ||
      item.mes < 1 ||
      item.mes > 12 ||
      !Number.isFinite(
        Number(item.valor_programado)
      ) ||
      Number(item.valor_programado) < 0
    ) {
      continue
    }

    unicos.set(
      `${item.partida_id}-${item.mes}`,
      {
        ...item,
        valor_programado:
          redondear(item.valor_programado),
      }
    )
  }

  return [...unicos.values()]
}


function normalizarPartidasCreacion(body) {
  const origen = Array.isArray(body?.partidas)
    ? body.partidas
    : Array.isArray(body?.conceptos)
      ? body.conceptos
      : []

  const resultado = []
  const conceptosVistos = new Set()

  for (const item of origen) {
    const conceptoId =
      idValido(item?.concepto_id ?? item?.id)

    if (!conceptoId || conceptosVistos.has(conceptoId)) {
      continue
    }

    const meses = item?.meses || {}
    const programacion = []

    for (let mes = 1; mes <= 12; mes += 1) {
      const valor =
        numero(
          meses[String(mes)] ??
            meses[mes] ??
            item?.programacion?.find?.(
              registro =>
                Number(registro?.mes) === mes
            )?.valor_programado ??
            0
        )

      if (!Number.isFinite(valor) || valor < 0) {
        return {
          error:
            `El valor proyectado del mes ${mes} para el concepto ${conceptoId} no es válido.`,
          partidas: [],
        }
      }

      programacion.push({
        mes,
        valor_programado: redondear(valor),
      })
    }

    const total =
      redondear(
        programacion.reduce(
          (suma, registro) =>
            suma + registro.valor_programado,
          0
        )
      )

    if (total <= 0) {
      continue
    }

    conceptosVistos.add(conceptoId)
    resultado.push({
      concepto_id: conceptoId,
      observaciones:
        texto(item?.observaciones) || null,
      programacion,
      total,
    })
  }

  return {
    error: null,
    partidas: resultado,
  }
}

// ============================================================
// GET
// ============================================================

export async function GET(request) {
  try {
    const { supabaseAdmin, empresa } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const supabase = supabaseAdmin
    const url = new URL(request.url)

    const vigenciaParametro =
      texto(url.searchParams.get('vigencia'))

    let vigencia = anioActual()

    if (vigenciaParametro) {
      const vigenciaValidada =
        validarVigencia(vigenciaParametro)

      if (!vigenciaValidada) {
        return respuestaError(
          'La vigencia consultada no es válida.'
        )
      }

      vigencia = vigenciaValidada
    }

    const datos =
      await cargarPresupuestoCompleto(
        supabase,
        vigencia
      )

    return respuestaOk({
      empresa: {
        nit: texto(empresa?.nit),
        nombre: texto(
          empresa?.nombre ||
            empresa?.nombre_empresa ||
            empresa?.razon_social
        ),
        razon_social: texto(
          empresa?.razon_social ||
            empresa?.nombre_empresa ||
            empresa?.nombre
        ),
      },
      vigencia,
      categorias_pesv: CATEGORIAS_PESV,
      ...datos,
    })
  } catch (error) {
    return respuestaDesdeError(
      error,
      'No fue posible consultar el Presupuesto PESV.'
    )
  }
}

// ============================================================
// POST
//
// ACCIONES:
// - crear_presupuesto
// - sincronizar_conceptos
// - guardar_programacion
// - aprobar_presupuesto
//
// crear_presupuesto recibe únicamente los conceptos seleccionados
// por el usuario y su programación mensual. No crea partidas vacías.
// ============================================================

export async function POST(request) {
  try {
    const body = await request.json()

    const { supabaseAdmin } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const supabase = supabaseAdmin
    const accion =
      texto(body?.accion).toLowerCase()
    const usuario =
      usuarioActualizacion(body)
    const fecha =
      new Date().toISOString()

    // ========================================================
    // CREAR PRESUPUESTO
    // ========================================================

    if (accion === 'crear_presupuesto') {
      const vigencia =
        validarVigencia(body?.vigencia)

      if (!vigencia) {
        return respuestaError(
          'La vigencia del Presupuesto PESV no es válida.'
        )
      }

      const existente =
        await obtenerPresupuestoPorVigencia(
          supabase,
          vigencia
        )

      if (existente) {
        return respuestaError(
          `Ya existe un Presupuesto PESV para la vigencia ${vigencia}.`
        )
      }

      const seleccion =
        normalizarPartidasCreacion(body)

      if (seleccion.error) {
        return respuestaError(seleccion.error)
      }

      if (!seleccion.partidas.length) {
        return respuestaError(
          'Seleccione al menos un concepto PESV y asigne un valor proyectado antes de crear el presupuesto.'
        )
      }

      const conceptosPesv =
        await obtenerConceptosPesv(supabase)

      const conceptosPorId =
        new Map(
          conceptosPesv.map(concepto => [
            Number(concepto.id),
            concepto,
          ])
        )

      const conceptoNoValido =
        seleccion.partidas.find(
          item =>
            !conceptosPorId.has(
              Number(item.concepto_id)
            )
        )

      if (conceptoNoValido) {
        return respuestaError(
          'La selección contiene un concepto que no está activo o no está clasificado como gasto PESV.'
        )
      }

      const fechaElaboracion =
        fechaValida(body?.fecha_elaboracion) ||
        fechaHoy()

      if (
        Number(fechaElaboracion.slice(0, 4)) !==
        vigencia
      ) {
        return respuestaError(
          `La fecha de elaboración debe corresponder a la vigencia ${vigencia}.`
        )
      }

      const payloadPresupuesto = {
        vigencia,
        estado: 'BORRADOR',
        fecha_elaboracion: fechaElaboracion,
        fecha_aprobacion: null,
        fecha_cierre: null,
        observaciones:
          texto(body?.observaciones) || null,
        usuario_creacion: usuario,
        usuario_aprobacion: null,
        usuario_cierre: null,
        created_at: fecha,
        updated_at: fecha,
      }

      const { data: presupuestoCreado, error: errorPresupuesto } =
        await supabase
          .from('pesv_presupuestos')
          .insert(payloadPresupuesto)
          .select(CAMPOS_PRESUPUESTO)
          .single()

      if (errorPresupuesto) {
        if (errorPresupuesto?.code === '23505') {
          return respuestaError(
            `Ya existe un Presupuesto PESV para la vigencia ${vigencia}.`
          )
        }

        throw errorPresupuesto
      }

      try {
        const payloadPartidas =
          seleccion.partidas.map(item => {
            const concepto =
              conceptosPorId.get(
                Number(item.concepto_id)
              )

            return {
              presupuesto_id:
                presupuestoCreado.id,
              concepto_id: concepto.id,
              concepto_nombre:
                texto(concepto.nombre).toUpperCase(),
              categoria_pesv:
                validarCategoria(
                  concepto.categoria_pesv
                ),
              observaciones:
                item.observaciones,
              activo: true,
              usuario_creacion: usuario,
              usuario_actualizacion: usuario,
              created_at: fecha,
              updated_at: fecha,
            }
          })

        const { data: partidasCreadas, error: errorPartidas } =
          await supabase
            .from('pesv_presupuesto_partidas')
            .insert(payloadPartidas)
            .select(CAMPOS_PARTIDA)

        if (errorPartidas) throw errorPartidas

        const partidasPorConcepto =
          new Map(
            (partidasCreadas || []).map(
              partida => [
                Number(partida.concepto_id),
                partida,
              ]
            )
          )

        const payloadProgramacion = []

        for (const item of seleccion.partidas) {
          const partida =
            partidasPorConcepto.get(
              Number(item.concepto_id)
            )

          if (!partida?.id) {
            throw new Error(
              'No fue posible relacionar una partida del presupuesto con su concepto PESV.'
            )
          }

          for (const registro of item.programacion) {
            payloadProgramacion.push({
              partida_id: partida.id,
              mes: registro.mes,
              valor_programado:
                registro.valor_programado,
              observaciones: null,
              usuario_creacion: usuario,
              usuario_actualizacion: usuario,
              created_at: fecha,
              updated_at: fecha,
            })
          }
        }

        const { error: errorProgramacion } =
          await supabase
            .from('pesv_presupuesto_programacion')
            .insert(payloadProgramacion)

        if (errorProgramacion) {
          throw errorProgramacion
        }
      } catch (errorCreacion) {
        await supabase
          .from('pesv_presupuestos')
          .delete()
          .eq('id', presupuestoCreado.id)

        throw errorCreacion
      }

      const datos =
        await cargarPresupuestoCompleto(
          supabase,
          vigencia
        )

      return respuestaOk(
        {
          message:
            'Presupuesto PESV creado correctamente.',
          ...datos,
        },
        201
      )
    }

    // ========================================================
    // SINCRONIZAR CONCEPTOS PESV
    // ========================================================

    if (accion === 'sincronizar_conceptos') {
      const presupuestoId =
        idValido(body?.presupuesto_id)

      if (!presupuestoId) {
        return respuestaError(
          'Debe indicar un Presupuesto PESV válido.'
        )
      }

      const presupuesto =
        await obtenerPresupuestoPorId(
          supabase,
          presupuestoId
        )

      if (!presupuesto) {
        return respuestaError(
          'El Presupuesto PESV no existe.',
          404
        )
      }

      if (
        texto(presupuesto.estado).toUpperCase() !==
        'BORRADOR'
      ) {
        return respuestaError(
          'Solo puede sincronizar conceptos mientras el presupuesto esté en estado BORRADOR.'
        )
      }

      const sincronizacion =
        await sincronizarConceptosPresupuesto({
          supabase,
          presupuesto,
          usuario,
        })

      const datos =
        await cargarPresupuestoCompleto(
          supabase,
          Number(presupuesto.vigencia)
        )

      return respuestaOk({
        message:
          sincronizacion.agregados > 0
            ? `Se agregaron ${sincronizacion.agregados} concepto(s) PESV al presupuesto.`
            : 'El presupuesto ya contiene todos los conceptos PESV activos.',
        conceptos_agregados:
          sincronizacion.agregados,
        ...datos,
      })
    }

    // ========================================================
    // GUARDAR PROGRAMACIÓN MENSUAL
    // ========================================================

    if (accion === 'guardar_programacion') {
      const presupuestoId =
        idValido(body?.presupuesto_id)

      if (!presupuestoId) {
        return respuestaError(
          'Debe indicar un Presupuesto PESV válido.'
        )
      }

      const presupuesto =
        await obtenerPresupuestoPorId(
          supabase,
          presupuestoId
        )

      if (!presupuesto) {
        return respuestaError(
          'El Presupuesto PESV no existe.',
          404
        )
      }

      if (
        texto(presupuesto.estado).toUpperCase() !==
        'BORRADOR'
      ) {
        return respuestaError(
          'La programación mensual solo puede modificarse mientras el presupuesto esté en estado BORRADOR.'
        )
      }

      const programacion =
        normalizarProgramacion(body)

      if (!programacion.length) {
        return respuestaError(
          'No se recibió una programación mensual válida.'
        )
      }

      const partidas =
        await obtenerPartidas(
          supabase,
          presupuestoId
        )

      const idsValidos =
        new Set(
          partidas.map(item => Number(item.id))
        )

      const fueraDelPresupuesto =
        programacion.some(
          item =>
            !idsValidos.has(
              Number(item.partida_id)
            )
        )

      if (fueraDelPresupuesto) {
        return respuestaError(
          'La programación contiene una partida que no pertenece al presupuesto seleccionado.'
        )
      }

      const payload =
        programacion.map(item => ({
          partida_id: item.partida_id,
          mes: item.mes,
          valor_programado:
            item.valor_programado,
          observaciones:
            item.observaciones,
          usuario_creacion: usuario,
          usuario_actualizacion: usuario,
          updated_at: fecha,
        }))

      const { error } =
        await supabase
          .from('pesv_presupuesto_programacion')
          .upsert(
            payload,
            {
              onConflict:
                'partida_id,mes',
            }
          )

      if (error) throw error

      const datos =
        await cargarPresupuestoCompleto(
          supabase,
          Number(presupuesto.vigencia)
        )

      return respuestaOk({
        message:
          'Programación mensual del Presupuesto PESV guardada correctamente.',
        ...datos,
      })
    }

    // ========================================================
    // APROBAR PRESUPUESTO
    // ========================================================

    if (accion === 'aprobar_presupuesto') {
      const presupuestoId =
        idValido(body?.presupuesto_id)

      if (!presupuestoId) {
        return respuestaError(
          'Debe indicar un Presupuesto PESV válido.'
        )
      }

      const presupuesto =
        await obtenerPresupuestoPorId(
          supabase,
          presupuestoId
        )

      if (!presupuesto) {
        return respuestaError(
          'El Presupuesto PESV no existe.',
          404
        )
      }

      const estadoActual =
        validarEstadoPresupuesto(
          presupuesto.estado
        )

      if (estadoActual !== 'BORRADOR') {
        return respuestaError(
          'Solo puede aprobar un presupuesto que se encuentre en estado BORRADOR.'
        )
      }

      const partidas =
        await obtenerPartidas(
          supabase,
          presupuestoId
        )

      if (!partidas.length) {
        return respuestaError(
          'El presupuesto no tiene conceptos PESV para aprobar.'
        )
      }

      const programacion =
        await obtenerProgramacion(
          supabase,
          partidas
        )

      const totalProgramado =
        redondear(
          programacion.reduce(
            (suma, item) =>
              suma +
              numero(item.valor_programado),
            0
          )
        )

      if (totalProgramado <= 0) {
        return respuestaError(
          'Debe registrar valores programados antes de aprobar el Presupuesto PESV.'
        )
      }

      const fechaAprobacion =
        fechaValida(body?.fecha_aprobacion) ||
        fechaHoy()

      const { data, error } =
        await supabase
          .from('pesv_presupuestos')
          .update({
            estado: 'APROBADO',
            fecha_aprobacion:
              fechaAprobacion,
            usuario_aprobacion:
              usuario,
            updated_at: fecha,
          })
          .eq('id', presupuestoId)
          .eq('estado', 'BORRADOR')
          .select(CAMPOS_PRESUPUESTO)
          .maybeSingle()

      if (error) throw error

      if (!data) {
        return respuestaError(
          'El presupuesto cambió de estado y no pudo ser aprobado. Actualice la información e intente nuevamente.',
          409
        )
      }

      const datos =
        await cargarPresupuestoCompleto(
          supabase,
          Number(data.vigencia)
        )

      return respuestaOk({
        message:
          'Presupuesto PESV aprobado correctamente.',
        ...datos,
      })
    }

    return respuestaError(
      'La acción solicitada no es válida.'
    )
  } catch (error) {
    return respuestaDesdeError(
      error,
      'No fue posible procesar el Presupuesto PESV.'
    )
  }
}
