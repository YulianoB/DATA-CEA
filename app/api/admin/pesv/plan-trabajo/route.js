// app/api/admin/pesv/plan-trabajo/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// ============================================================
// CONSTANTES
// ============================================================

const BUCKET_EMPRESA = 'empresa'
const DURACION_URL_LOGO = 60 * 60

const ALCANCES_PLAN = [
  'DISENO_IMPLEMENTACION_SEGUIMIENTO_MEJORA',
  'IMPLEMENTACION_SEGUIMIENTO_MEJORA',
  'SEGUIMIENTO_MEJORA',
]

const ESTADOS_CORTE = [
  'PROGRAMADA',
  'EJECUTADA',
  'PARCIAL',
  'NO_EJECUTADA',
]

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

function numeroOpcional(valor) {
  if (
    valor === null ||
    valor === undefined ||
    texto(valor) === ''
  ) {
    return null
  }

  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

function idOpcional(valor) {
  const numero = numeroEntero(valor)
  return numero > 0 ? numero : null
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

function validarAnio(valor) {
  const anio = numeroEntero(valor)
  return anio >= 2022 ? anio : null
}

function fechaValida(valor) {
  const fecha = texto(valor)

  if (!fecha) {
    return null
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? fecha
    : null
}

function anioDeFecha(fecha) {
  return numeroEntero(texto(fecha).slice(0, 4))
}

function mesDeFecha(fecha) {
  return numeroEntero(texto(fecha).slice(5, 7))
}

function ultimoDiaMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0))
    .toISOString()
    .slice(0, 10)
}

function fechaMayor(fechaA, fechaB) {
  return fechaA > fechaB ? fechaA : fechaB
}

function fechaMenor(fechaA, fechaB) {
  return fechaA < fechaB ? fechaA : fechaB
}

function validarEstadoPlan(valor) {
  const estado = texto(valor).toUpperCase()

  return ['BORRADOR', 'APROBADO', 'CERRADO'].includes(estado)
    ? estado
    : null
}

function validarAlcance(valor) {
  const alcance = texto(valor).toUpperCase()

  return ALCANCES_PLAN.includes(alcance)
    ? alcance
    : null
}

function planPermitePlaneacion(plan) {
  return texto(plan?.estado).toUpperCase() === 'BORRADOR'
}

function planPermiteSeguimiento(plan) {
  return texto(plan?.estado).toUpperCase() === 'APROBADO'
}

function normalizarMeses(valor) {
  const lista = Array.isArray(valor) ? valor : []

  return [...new Set(
    lista
      .map(numeroEntero)
      .filter(mes => mes >= 1 && mes <= 12)
  )].sort((a, b) => a - b)
}

function generarCortesPorMeses({ anio, meses }) {
  const mesesValidos = normalizarMeses(meses)

  return mesesValidos.map(mes => ({
    anio,
    mes,
    trimestre: Math.ceil(mes / 3),
    fecha_corte: ultimoDiaMes(anio, mes),
    estado: 'PROGRAMADA',
  }))
}

function validarEstadoCorte(valor) {
  const estado = texto(valor).toUpperCase()

  return ESTADOS_CORTE.includes(estado)
    ? estado
    : null
}

// ============================================================
// PERIODICIDAD -> CORTES DE MATRIZ
// ============================================================

function tipoPeriodicidad(periodicidad) {
  const valor = texto(periodicidad).toUpperCase()

  if (
    valor === 'MENSUAL_Y_ACUMULADO_ANUAL' ||
    valor === 'ACUMULADO_MES_Y_ANO' ||
    valor.includes('MENSUAL') ||
    valor.includes('MES_Y_ANO')
  ) {
    return 'MENSUAL'
  }

  if (
    valor === 'TRIMESTRAL_Y_ACUMULADO_ANUAL' ||
    valor === 'ACUMULADO_TRIMESTRE_Y_ANO' ||
    valor.includes('TRIMESTRAL') ||
    valor.includes('TRIMESTRE')
  ) {
    return 'TRIMESTRAL'
  }

  if (
    valor === 'ANUAL' ||
    valor.includes('ANUAL')
  ) {
    return 'ANUAL'
  }

  return null
}

function generarCortes({
  anio,
  fechaInicio,
  fechaFin,
  periodicidad,
}) {
  const tipo = tipoPeriodicidad(periodicidad)

  if (!tipo) {
    return {
      error:
        `La periodicidad "${periodicidad || 'SIN PERIODICIDAD'}" del indicador no está soportada para generar la matriz.`,
      cortes: [],
    }
  }

  const mesInicio = mesDeFecha(fechaInicio)
  const mesFin = mesDeFecha(fechaFin)

  const meses = []

  if (tipo === 'MENSUAL') {
    for (let mes = mesInicio; mes <= mesFin; mes += 1) {
      meses.push(mes)
    }
  }

  if (tipo === 'TRIMESTRAL') {
    // El corte se muestra en el último mes de cada trimestre
    // que tenga intersección con el periodo de ejecución.
    for (let trimestre = 1; trimestre <= 4; trimestre += 1) {
      const inicioTrimestre = (trimestre - 1) * 3 + 1
      const finTrimestre = trimestre * 3

      const intersecta =
        mesInicio <= finTrimestre &&
        mesFin >= inicioTrimestre

      if (intersecta) {
        // Si la actividad termina antes del cierre natural del trimestre,
        // la celda se ubica en su último mes programado.
        meses.push(Math.min(finTrimestre, mesFin))
      }
    }
  }

  if (tipo === 'ANUAL') {
    // Una actividad anual tiene un único corte al finalizar
    // su periodo de ejecución.
    meses.push(mesFin)
  }

  const mesesUnicos = [...new Set(meses)]
    .filter(mes => mes >= mesInicio && mes <= mesFin)
    .sort((a, b) => a - b)

  const cortes = mesesUnicos.map(mes => {
    const trimestre = Math.ceil(mes / 3)

    const inicioMes =
      `${anio}-${String(mes).padStart(2, '0')}-01`

    const finMes =
      ultimoDiaMes(anio, mes)

    const fechaCorte =
      fechaMenor(
        fechaFin,
        fechaMayor(fechaInicio, finMes)
      )

    return {
      anio,
      mes,
      trimestre,
      fecha_corte:
        fechaCorte < inicioMes
          ? fechaFin
          : fechaCorte,
      estado: 'PROGRAMADA',
    }
  })

  return {
    tipo,
    cortes,
  }
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
// LOGO
// ============================================================

async function obtenerLogo(supabase) {
  const { data: configuracion, error } =
    await supabase
      .from('configuracion_empresa')
      .select('logo_actual_path')
      .eq('clave', 'GENERAL')
      .maybeSingle()

  if (error) {
    throw error
  }

  const path = texto(configuracion?.logo_actual_path)

  if (!path) {
    return {
      path: '',
      url: '',
    }
  }

  const { data: urlFirmada, error: errorUrl } =
    await supabase.storage
      .from(BUCKET_EMPRESA)
      .createSignedUrl(path, DURACION_URL_LOGO)

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

// ============================================================
// CONSULTAS
// ============================================================

const CAMPOS_PLAN = `
  id,
  anio,
  nombre,
  fecha_elaboracion,
  fecha_aprobacion,
  alcance,
  objetivo,
  estado,
  responsable_personal_id,
  responsable_nombre,
  observaciones,
  usuario_creacion,
  usuario_actualizacion,
  created_at,
  updated_at
`

async function obtenerPlanPorAnio(supabase, anio) {
  const { data, error } =
    await supabase
      .from('pesv_planes_trabajo')
      .select(CAMPOS_PLAN)
      .eq('anio', anio)
      .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function obtenerPlanPorId(supabase, id) {
  const { data, error } =
    await supabase
      .from('pesv_planes_trabajo')
      .select(CAMPOS_PLAN)
      .eq('id', id)
      .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function obtenerCortesPorPlan(supabase, planId) {
  if (!planId) {
    return []
  }

  const { data, error } =
    await supabase
      .from('pesv_plan_trabajo_cortes')
      .select(`
        id,
        actividad_id,
        anio,
        mes,
        trimestre,
        fecha_corte,
        estado,
        fecha_ejecucion,
        resultado,
        observaciones,
        evidencia_path,
        evidencia_nombre,
        usuario_registro,
        usuario_actualizacion,
        created_at,
        updated_at,
        pesv_plan_trabajo_actividades!inner (
          id,
          plan_trabajo_id
        )
      `)
      .eq(
        'pesv_plan_trabajo_actividades.plan_trabajo_id',
        planId
      )
      .order('mes', { ascending: true })

  if (error) {
    throw error
  }

  return Array.isArray(data) ? data : []
}

async function obtenerActividades(supabase, planId) {
  if (!planId) {
    return []
  }

  const { data, error } =
    await supabase
      .from('pesv_plan_trabajo_actividades')
      .select(`
        id,
        plan_trabajo_id,
        codigo,
        actividad,
        descripcion,
        objetivo_id,
        meta_id,
        indicador_id,
        responsable_personal_id,
        responsable_nombre,
        fecha_programada_inicio,
        fecha_programada_fin,
        trimestre,
        recursos_descripcion,
        presupuesto,
        estado,
        fecha_ejecucion,
        porcentaje_avance,
        resultado,
        evidencia_path,
        observaciones,
        usuario_creacion,
        usuario_actualizacion,
        created_at,
        updated_at,
        pesv_objetivos (
          id,
          anio,
          codigo,
          nombre
        ),
        pesv_metas (
          id,
          objetivo_id,
          indicador_id,
          codigo,
          descripcion,
          valor_meta,
          operador_meta,
          unidad_medida
        ),
        pesv_indicadores_catalogo (
          id,
          codigo,
          numero_normativo,
          nombre,
          periodicidad,
          unidad
        ),
        pesv_plan_trabajo_cortes (
          id,
          actividad_id,
          anio,
          mes,
          trimestre,
          fecha_corte,
          estado,
          fecha_ejecucion,
          resultado,
          observaciones,
          evidencia_path,
          evidencia_nombre,
          usuario_registro,
          usuario_actualizacion,
          created_at,
          updated_at
        )
      `)
      .eq('plan_trabajo_id', planId)
      .order('fecha_programada_inicio', { ascending: true })
      .order('codigo', { ascending: true })

  if (error) {
    throw error
  }

  const actividades = Array.isArray(data) ? data : []

  return actividades.map(actividad => ({
    ...actividad,
    pesv_plan_trabajo_cortes: Array.isArray(
      actividad?.pesv_plan_trabajo_cortes
    )
      ? [...actividad.pesv_plan_trabajo_cortes].sort(
          (a, b) => Number(a.mes) - Number(b.mes)
        )
      : [],
  }))
}

async function obtenerActividadPorId(supabase, id) {
  const { data, error } =
    await supabase
      .from('pesv_plan_trabajo_actividades')
      .select(`
        id,
        plan_trabajo_id,
        codigo,
        actividad,
        descripcion,
        objetivo_id,
        meta_id,
        indicador_id,
        responsable_personal_id,
        responsable_nombre,
        fecha_programada_inicio,
        fecha_programada_fin,
        trimestre,
        recursos_descripcion,
        presupuesto,
        estado,
        fecha_ejecucion,
        porcentaje_avance,
        resultado,
        evidencia_path,
        observaciones,
        usuario_creacion,
        usuario_actualizacion,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function obtenerCortePorId(supabase, id) {
  const { data, error } =
    await supabase
      .from('pesv_plan_trabajo_cortes')
      .select(`
        id,
        actividad_id,
        anio,
        mes,
        trimestre,
        fecha_corte,
        estado,
        fecha_ejecucion,
        resultado,
        observaciones,
        evidencia_path,
        evidencia_nombre,
        usuario_registro,
        usuario_actualizacion,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function obtenerObjetivos(supabase, anio) {
  const { data, error } =
    await supabase
      .from('pesv_objetivos')
      .select(`
        id,
        anio,
        codigo,
        nombre,
        descripcion,
        estado
      `)
      .eq('anio', anio)
      .order('codigo', { ascending: true })

  if (error) {
    throw error
  }

  return Array.isArray(data) ? data : []
}

async function obtenerMetas(supabase, anio) {
  const { data, error } =
    await supabase
      .from('pesv_metas')
      .select(`
        id,
        objetivo_id,
        indicador_id,
        codigo,
        descripcion,
        linea_base,
        valor_meta,
        operador_meta,
        unidad_medida,
        fecha_limite,
        estado,
        pesv_objetivos!inner (
          id,
          anio,
          codigo,
          nombre
        )
      `)
      .eq('pesv_objetivos.anio', anio)
      .order('codigo', { ascending: true })

  if (error) {
    throw error
  }

  return Array.isArray(data) ? data : []
}

async function obtenerIndicadores(supabase) {
  const { data, error } =
    await supabase
      .from('pesv_indicadores_catalogo')
      .select(`
        id,
        codigo,
        numero_normativo,
        nombre,
        descripcion,
        formula,
        periodicidad,
        unidad,
        sentido_mejora,
        fuente_datos,
        orden,
        activo
      `)
      .eq('activo', true)
      .order('orden', { ascending: true })

  if (error) {
    throw error
  }

  return Array.isArray(data) ? data : []
}

async function obtenerPersonal(supabase) {
  const { data, error } =
    await supabase
      .from('personal')
      .select(`
        id,
        documento,
        nombres,
        apellidos,
        cargo,
        grupo_personal,
        tipo_personal,
        estado
      `)
      .order('nombres', { ascending: true })
      .order('apellidos', { ascending: true })

  if (error) {
    throw error
  }

  return Array.isArray(data) ? data : []
}

async function obtenerIndicadorPorId(supabase, id) {
  if (!id) {
    return null
  }

  const { data, error } =
    await supabase
      .from('pesv_indicadores_catalogo')
      .select(`
        id,
        codigo,
        numero_normativo,
        nombre,
        periodicidad,
        activo
      `)
      .eq('id', id)
      .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

// ============================================================
// VALIDAR RELACIONES
// ============================================================

async function validarRelacionesActividad(
  supabase,
  {
    planId,
    objetivoId,
    metaId,
    indicadorId,
  }
) {
  const plan = await obtenerPlanPorId(supabase, planId)

  if (!plan) {
    return { error: 'El Plan Anual de Trabajo seleccionado no existe.' }
  }

  if (!objetivoId) {
    return { error: 'Debe seleccionar el objetivo relacionado con la actividad.' }
  }

  const { data: objetivo, error: errorObjetivo } = await supabase
    .from('pesv_objetivos')
    .select(`id, anio, codigo, nombre, estado`)
    .eq('id', objetivoId)
    .maybeSingle()

  if (errorObjetivo) throw errorObjetivo
  if (!objetivo) return { error: 'El objetivo seleccionado no existe.' }

  if (Number(objetivo.anio) !== Number(plan.anio)) {
    return { error: 'El objetivo seleccionado no corresponde al mismo año del Plan Anual de Trabajo.' }
  }

  // Sin meta: la actividad es operativa del Plan Anual y no lleva indicador propio.
  if (!metaId) {
    if (indicadorId) {
      return { error: 'Una actividad sin meta relacionada no debe tener indicador asociado.' }
    }

    return {
      plan,
      objetivo,
      meta: null,
      indicador: null,
      indicadorId: null,
      usaMesesManuales: true,
    }
  }

  const { data: meta, error: errorMeta } = await supabase
    .from('pesv_metas')
    .select(`id, objetivo_id, indicador_id, codigo, descripcion, estado`)
    .eq('id', metaId)
    .maybeSingle()

  if (errorMeta) throw errorMeta
  if (!meta) return { error: 'La meta seleccionada no existe.' }

  if (Number(meta.objetivo_id) !== Number(objetivoId)) {
    return { error: 'La meta seleccionada no pertenece al objetivo seleccionado.' }
  }

  const indicadorFinalId = idOpcional(meta.indicador_id)

  if (!indicadorFinalId) {
    return { error: 'La meta seleccionada no tiene un indicador asociado.' }
  }

  if (indicadorId && Number(indicadorId) !== Number(indicadorFinalId)) {
    return { error: 'El indicador seleccionado no corresponde al indicador asociado a la meta.' }
  }

  const indicador = await obtenerIndicadorPorId(supabase, indicadorFinalId)

  if (!indicador) return { error: 'El indicador relacionado con la meta no existe.' }
  if (indicador.activo === false) return { error: 'El indicador relacionado con la meta está inactivo.' }

  if (!tipoPeriodicidad(indicador.periodicidad)) {
    return {
      error: `La periodicidad "${indicador.periodicidad || 'SIN PERIODICIDAD'}" del indicador ${indicador.codigo || ''} no está soportada para programar la matriz.`,
    }
  }

  return {
    plan,
    objetivo,
    meta,
    indicador,
    indicadorId: indicadorFinalId,
    usaMesesManuales: false,
  }
}

// ============================================================
// VALIDAR PROGRAMACIÓN DE ACTIVIDAD
// ============================================================

function validarPeriodoActividad({
  plan,
  fechaInicioTexto,
  fechaFinTexto,
}) {
  const fechaInicio =
    fechaValida(fechaInicioTexto)

  const fechaFin =
    fechaValida(fechaFinTexto)

  if (!fechaInicio) {
    return {
      error:
        'La fecha Desde del periodo de ejecución es obligatoria y debe ser válida.',
    }
  }

  if (!fechaFin) {
    return {
      error:
        'La fecha Hasta del periodo de ejecución es obligatoria y debe ser válida.',
    }
  }

  if (fechaFin < fechaInicio) {
    return {
      error:
        'La fecha Hasta del periodo de ejecución no puede ser anterior a la fecha Desde.',
    }
  }

  if (
    anioDeFecha(fechaInicio) !== Number(plan.anio) ||
    anioDeFecha(fechaFin) !== Number(plan.anio)
  ) {
    return {
      error:
        `El periodo de ejecución debe estar completamente dentro de la vigencia ${plan.anio}.`,
    }
  }

  return {
    fechaInicio,
    fechaFin,
  }
}

// ============================================================
// INSERTAR CORTES
// ============================================================

async function insertarCortesActividad(
  supabase,
  {
    actividadId,
    cortes,
    usuario,
    fecha,
  }
) {
  if (!actividadId || !Array.isArray(cortes) || cortes.length === 0) {
    throw new Error(
      'No fue posible generar los cortes de seguimiento de la actividad.'
    )
  }

  const payload = cortes.map(corte => ({
    actividad_id: actividadId,
    anio: corte.anio,
    mes: corte.mes,
    trimestre: corte.trimestre,
    fecha_corte: corte.fecha_corte,
    estado: 'PROGRAMADA',
    fecha_ejecucion: null,
    resultado: null,
    observaciones: null,
    evidencia_path: null,
    evidencia_nombre: null,
    usuario_registro: usuario,
    usuario_actualizacion: usuario,
    created_at: fecha,
    updated_at: fecha,
  }))

  const { data, error } =
    await supabase
      .from('pesv_plan_trabajo_cortes')
      .insert(payload)
      .select(`
        id,
        actividad_id,
        anio,
        mes,
        trimestre,
        fecha_corte,
        estado,
        fecha_ejecucion,
        resultado,
        observaciones,
        evidencia_path,
        evidencia_nombre,
        usuario_registro,
        usuario_actualizacion,
        created_at,
        updated_at
      `)

  if (error) {
    throw error
  }

  return Array.isArray(data) ? data : []
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

    const anioParametro =
      texto(url.searchParams.get('anio'))

    let anio = anioActual()

    if (anioParametro) {
      const anioValidado =
        validarAnio(anioParametro)

      if (!anioValidado) {
        return respuestaError(
          'El año consultado no es válido.'
        )
      }

      anio = anioValidado
    }

    const [
      plan,
      objetivos,
      metas,
      indicadores,
      personal,
      logo,
    ] = await Promise.all([
      obtenerPlanPorAnio(supabase, anio),
      obtenerObjetivos(supabase, anio),
      obtenerMetas(supabase, anio),
      obtenerIndicadores(supabase),
      obtenerPersonal(supabase),
      obtenerLogo(supabase),
    ])

    const actividades =
      plan?.id
        ? await obtenerActividades(
            supabase,
            plan.id
          )
        : []

    const cortes =
      plan?.id
        ? await obtenerCortesPorPlan(
            supabase,
            plan.id
          )
        : []

    return respuestaOk({
      empresa: {
        nit: texto(empresa?.nit),
        nombre: texto(
          empresa?.nombre ||
            empresa?.nombre_empresa ||
            empresa?.razon_social
        ),
      },

      logo,
      anio,
      plan,
      actividades,
      cortes,
      objetivos,
      metas,
      indicadores,
      personal,
    })
  } catch (error) {
    return respuestaDesdeError(
      error,
      'No fue posible consultar el Plan Anual de Trabajo PESV.'
    )
  }
}

// ============================================================
// POST
//
// ACCIONES:
// - crear_plan
// - crear_actividad
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
    const accion = texto(body?.accion).toLowerCase()
    const usuario = usuarioActualizacion(body)
    const fecha = new Date().toISOString()

    // ========================================================
    // CREAR PLAN
    // ========================================================

    if (accion === 'crear_plan') {
      const anio = validarAnio(body?.anio)

      if (!anio) {
        return respuestaError(
          'El año del Plan Anual de Trabajo no es válido.'
        )
      }

      const fechaElaboracionTexto =
        texto(body?.fecha_elaboracion)

      const fechaElaboracion =
        fechaValida(fechaElaboracionTexto)

      if (!fechaElaboracion) {
        return respuestaError(
          'La fecha de elaboración es obligatoria y debe ser válida.'
        )
      }

      if (anioDeFecha(fechaElaboracion) !== anio) {
        return respuestaError(
          `La fecha de elaboración debe corresponder a la vigencia ${anio}.`
        )
      }

      const alcance =
        validarAlcance(body?.alcance)

      if (!alcance) {
        return respuestaError(
          'Debe seleccionar un alcance válido para el Plan Anual de Trabajo.'
        )
      }

      const responsableId =
        idOpcional(body?.responsable_personal_id)

      const responsableNombre =
        texto(body?.responsable_nombre)

      if (!responsableId && !responsableNombre) {
        return respuestaError(
          'Debe seleccionar el responsable del Plan Anual de Trabajo.'
        )
      }

      const objetivo =
        texto(body?.objetivo)

      if (!objetivo) {
        return respuestaError(
          'Debe registrar el objetivo general del Plan Anual de Trabajo.'
        )
      }

      const payload = {
        anio,

        // La columna nombre se conserva por compatibilidad con la
        // estructura actual, pero ya no se solicita al usuario.
        nombre:
          `PLAN ANUAL DE TRABAJO PESV ${anio}`,

        fecha_elaboracion:
          fechaElaboracion,

        fecha_aprobacion:
          null,

        alcance,

        objetivo,

        estado:
          'BORRADOR',

        responsable_personal_id:
          responsableId,

        responsable_nombre:
          responsableNombre || null,

        observaciones:
          texto(body?.observaciones) || null,

        usuario_creacion:
          usuario,

        usuario_actualizacion:
          usuario,

        created_at:
          fecha,

        updated_at:
          fecha,
      }

      const { data, error } =
        await supabase
          .from('pesv_planes_trabajo')
          .insert(payload)
          .select(CAMPOS_PLAN)
          .single()

      if (error) {
        if (error?.code === '23505') {
          return respuestaError(
            'Ya existe un Plan Anual de Trabajo PESV para el año seleccionado.'
          )
        }

        throw error
      }

      return respuestaOk(
        {
          message:
            'Plan Anual de Trabajo PESV creado correctamente.',
          plan: data,
        },
        201
      )
    }

    // ========================================================
    // CREAR ACTIVIDAD + GENERAR CELDAS DE MATRIZ
    // ========================================================

    if (accion === 'crear_actividad') {
      const planId =
        numeroEntero(body?.plan_trabajo_id)

      const actividad =
        texto(body?.actividad)

      if (planId <= 0) {
        return respuestaError(
          'Debe seleccionar un Plan Anual de Trabajo válido.'
        )
      }

      if (!actividad) {
        return respuestaError(
          'La actividad es obligatoria.'
        )
      }

      const objetivoId =
        idOpcional(body?.objetivo_id)

      const metaId =
        idOpcional(body?.meta_id)

      const indicadorRecibidoId =
        idOpcional(body?.indicador_id)

      const relaciones =
        await validarRelacionesActividad(
          supabase,
          {
            planId,
            objetivoId,
            metaId,
            indicadorId:
              indicadorRecibidoId,
          }
        )

      if (relaciones?.error) {
        return respuestaError(
          relaciones.error
        )
      }

      if (!planPermitePlaneacion(relaciones.plan)) {
        return respuestaError(
          'Solo puede agregar actividades mientras el Plan Anual esté en estado BORRADOR.'
        )
      }

      let periodo = null
      let mesesProgramados = []
      let generacion = null

      if (relaciones.usaMesesManuales) {
        mesesProgramados = normalizarMeses(body?.meses_programados)

        if (mesesProgramados.length === 0) {
          return respuestaError(
            'Para una actividad sin meta relacionada debe seleccionar al menos un mes de ejecución.'
          )
        }

        generacion = {
          tipo: 'MESES_ESPECIFICOS',
          cortes: generarCortesPorMeses({
            anio: Number(relaciones.plan.anio),
            meses: mesesProgramados,
          }),
        }

        periodo = {
          fechaInicio: `${relaciones.plan.anio}-${String(mesesProgramados[0]).padStart(2, '0')}-01`,
          fechaFin: ultimoDiaMes(
            Number(relaciones.plan.anio),
            mesesProgramados[mesesProgramados.length - 1]
          ),
        }
      } else {
        periodo = validarPeriodoActividad({
          plan: relaciones.plan,
          fechaInicioTexto: body?.fecha_programada_inicio,
          fechaFinTexto: body?.fecha_programada_fin,
        })

        if (periodo?.error) return respuestaError(periodo.error)

        generacion = generarCortes({
          anio: Number(relaciones.plan.anio),
          fechaInicio: periodo.fechaInicio,
          fechaFin: periodo.fechaFin,
          periodicidad: relaciones.indicador.periodicidad,
        })

        if (generacion?.error) return respuestaError(generacion.error)
      }

      const responsableId =
        idOpcional(
          body?.responsable_personal_id
        )

      const responsableNombre =
        texto(body?.responsable_nombre)

      if (!responsableId && !responsableNombre) {
        return respuestaError(
          'Debe seleccionar el responsable de la actividad.'
        )
      }

      if (!generacion.cortes.length) {
        return respuestaError(
          'No fue posible determinar los cortes de seguimiento de la actividad.'
        )
      }

      const payload = {
        plan_trabajo_id: planId,
        codigo:
          texto(body?.codigo).toUpperCase() ||
          null,
        actividad,
        descripcion:
          texto(body?.descripcion) || null,
        objetivo_id: objetivoId,
        meta_id: metaId,
        indicador_id:
          relaciones.indicadorId,
        responsable_personal_id:
          responsableId,
        responsable_nombre:
          responsableNombre || null,
        fecha_programada_inicio:
          periodo.fechaInicio,
        fecha_programada_fin:
          periodo.fechaFin,

        // Campo legado. Ya no lo selecciona el usuario.
        trimestre: null,

        recursos_descripcion:
          texto(body?.recursos_descripcion) ||
          null,
        presupuesto:
          numeroOpcional(body?.presupuesto),

        // Datos de ejecución permanecen neutros en la actividad maestra.
        estado: 'PROGRAMADA',
        fecha_ejecucion: null,
        porcentaje_avance: 0,
        resultado: null,
        evidencia_path: null,
        observaciones:
          texto(body?.observaciones) || null,

        usuario_creacion: usuario,
        usuario_actualizacion: usuario,
        created_at: fecha,
        updated_at: fecha,
      }

      const { data: actividadCreada, error } =
        await supabase
          .from('pesv_plan_trabajo_actividades')
          .insert(payload)
          .select(`
            id,
            plan_trabajo_id,
            codigo,
            actividad,
            descripcion,
            objetivo_id,
            meta_id,
            indicador_id,
            responsable_personal_id,
            responsable_nombre,
            fecha_programada_inicio,
            fecha_programada_fin,
            trimestre,
            recursos_descripcion,
            presupuesto,
            estado,
            fecha_ejecucion,
            porcentaje_avance,
            resultado,
            evidencia_path,
            observaciones,
            usuario_creacion,
            usuario_actualizacion,
            created_at,
            updated_at
          `)
          .single()

      if (error) {
        throw error
      }

      try {
        const cortes =
          await insertarCortesActividad(
            supabase,
            {
              actividadId:
                actividadCreada.id,
              cortes:
                generacion.cortes,
              usuario,
              fecha,
            }
          )

        return respuestaOk(
          {
            message:
              'Actividad programada y matriz de seguimiento generada correctamente.',
            actividad:
              actividadCreada,
            periodicidad:
              relaciones.indicador?.periodicidad || null,
            tipo_periodicidad:
              generacion.tipo,
            cortes,
          },
          201
        )
      } catch (errorCortes) {
        // Compensación simple: si falla la generación de cortes,
        // se elimina la actividad recién creada para no dejarla incompleta.
        try {
          await supabase
            .from(
              'pesv_plan_trabajo_actividades'
            )
            .delete()
            .eq(
              'id',
              actividadCreada.id
            )
        } catch (errorRollback) {
          console.error(
            'No fue posible revertir la actividad después de fallar la generación de cortes:',
            errorRollback
          )
        }

        throw errorCortes
      }
    }

    return respuestaError(
      'La acción solicitada no es válida.'
    )
  } catch (error) {
    return respuestaDesdeError(
      error,
      'No fue posible crear el registro del Plan Anual de Trabajo PESV.'
    )
  }
}

// ============================================================
// PATCH
//
// ACCIONES:
// - actualizar_plan
// - actualizar_actividad
// - registrar_seguimiento_corte
// ============================================================

export async function PATCH(request) {
  try {
    const body = await request.json()

    const { supabaseAdmin } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const supabase = supabaseAdmin
    const accion = texto(body?.accion).toLowerCase()
    const usuario = usuarioActualizacion(body)
    const fecha = new Date().toISOString()

    // ========================================================
    // ACTUALIZAR / APROBAR / CERRAR PLAN
    // ========================================================

    if (accion === 'actualizar_plan') {
      const id = numeroEntero(body?.id)

      if (id <= 0) {
        return respuestaError(
          'El Plan Anual de Trabajo que desea actualizar no es válido.'
        )
      }

      const existente =
        await obtenerPlanPorId(supabase, id)

      if (!existente) {
        return respuestaError(
          'El Plan Anual de Trabajo no existe.',
          404
        )
      }

      const estadoPlan =
        validarEstadoPlan(
          body?.estado || existente.estado
        )

      if (!estadoPlan) {
        return respuestaError(
          'El estado del Plan Anual no es válido.'
        )
      }

      if (
        texto(existente.estado).toUpperCase() ===
          'CERRADO' &&
        estadoPlan !== 'CERRADO'
      ) {
        return respuestaError(
          'Un Plan Anual CERRADO no puede reabrirse desde esta operación.'
        )
      }

      const fechaElaboracionTexto =
        texto(
          body?.fecha_elaboracion ??
            existente.fecha_elaboracion
        )

      const fechaElaboracion =
        fechaValida(fechaElaboracionTexto)

      if (!fechaElaboracion) {
        return respuestaError(
          'La fecha de elaboración es obligatoria y debe ser válida.'
        )
      }

      if (
        anioDeFecha(fechaElaboracion) !==
        Number(existente.anio)
      ) {
        return respuestaError(
          `La fecha de elaboración debe corresponder a la vigencia ${existente.anio}.`
        )
      }

      const alcance =
        validarAlcance(
          body?.alcance ??
            existente.alcance
        )

      if (!alcance) {
        return respuestaError(
          'Debe seleccionar un alcance válido para el Plan Anual de Trabajo.'
        )
      }

      const responsableId =
        idOpcional(
          body?.responsable_personal_id ??
            existente.responsable_personal_id
        )

      const responsableNombre =
        texto(
          body?.responsable_nombre ??
            existente.responsable_nombre
        )

      if (!responsableId && !responsableNombre) {
        return respuestaError(
          'Debe seleccionar el responsable del Plan Anual de Trabajo.'
        )
      }

      let fechaAprobacion =
        existente.fecha_aprobacion || null

      if (
        estadoPlan === 'APROBADO' &&
        texto(existente.estado).toUpperCase() !== 'APROBADO'
      ) {
        const actividadesPlan =
          await obtenerActividades(
            supabase,
            id
          )

        if (actividadesPlan.length === 0) {
          return respuestaError(
            'No puede aprobar el Plan Anual porque no tiene actividades programadas.'
          )
        }

        const incompletas =
          actividadesPlan.filter(
            actividad =>
              !actividad?.objetivo_id ||
              (actividad?.meta_id && !actividad?.indicador_id) ||
              !(
                actividad?.responsable_personal_id ||
                texto(
                  actividad?.responsable_nombre
                )
              ) ||
              !actividad?.fecha_programada_inicio ||
              !actividad?.fecha_programada_fin ||
              !Array.isArray(
                actividad?.pesv_plan_trabajo_cortes
              ) ||
              actividad
                .pesv_plan_trabajo_cortes
                .length === 0
          )

        if (incompletas.length > 0) {
          return respuestaError(
            `No puede aprobar el Plan Anual: ${incompletas.length} actividad(es) tienen incompleto su objetivo relacionado, responsable o programación de cortes.`
          )
        }

        const fechaAprobacionTexto =
          texto(body?.fecha_aprobacion)

        fechaAprobacion =
          fechaValida(
            fechaAprobacionTexto
          )

        if (!fechaAprobacion) {
          return respuestaError(
            'Para aprobar el Plan Anual debe registrar una fecha de aprobación válida.'
          )
        }
      }

      if (
        texto(existente.estado).toUpperCase() ===
          'APROBADO' &&
        estadoPlan === 'BORRADOR'
      ) {
        return respuestaError(
          'Un Plan Anual APROBADO no puede regresar a BORRADOR desde esta operación.'
        )
      }

      const objetivo =
        texto(
          body?.objetivo ??
            existente.objetivo
        )

      if (!objetivo) {
        return respuestaError(
          'Debe registrar el objetivo general del Plan Anual de Trabajo.'
        )
      }

      const payload = {
        // La vigencia y el nombre interno no se modifican aquí.
        fecha_elaboracion:
          fechaElaboracion,
        fecha_aprobacion:
          fechaAprobacion,
        alcance,
        objetivo,
        estado:
          estadoPlan,
        responsable_personal_id:
          responsableId,
        responsable_nombre:
          responsableNombre || null,
        observaciones:
          texto(
            body?.observaciones ??
              existente.observaciones
          ) || null,
        usuario_actualizacion:
          usuario,
        updated_at:
          fecha,
      }

      const { data, error } =
        await supabase
          .from('pesv_planes_trabajo')
          .update(payload)
          .eq('id', id)
          .select(CAMPOS_PLAN)
          .single()

      if (error) {
        throw error
      }

      return respuestaOk({
        message:
          estadoPlan === 'APROBADO' &&
          texto(existente.estado).toUpperCase() !==
            'APROBADO'
            ? 'Plan Anual de Trabajo PESV aprobado correctamente.'
            : 'Plan Anual de Trabajo PESV actualizado correctamente.',
        plan: data,
      })
    }

    // ========================================================
    // GENERAR CORTES FALTANTES PARA ACTIVIDADES EXISTENTES
    // Útil para planes creados antes de implementar la matriz.
    // No elimina ni modifica cortes que ya tengan seguimiento.
    // ========================================================

    if (accion === 'generar_cortes_plan') {
      const planId =
        numeroEntero(body?.plan_id || body?.id)

      if (planId <= 0) {
        return respuestaError(
          'El Plan Anual seleccionado no es válido.'
        )
      }

      const plan =
        await obtenerPlanPorId(
          supabase,
          planId
        )

      if (!plan) {
        return respuestaError(
          'El Plan Anual de Trabajo no existe.',
          404
        )
      }

      if (
        texto(plan.estado).toUpperCase() ===
        'CERRADO'
      ) {
        return respuestaError(
          'El Plan Anual está CERRADO y no admite generación de nuevos cortes.'
        )
      }

      const actividadesPlan =
        await obtenerActividades(
          supabase,
          planId
        )

      if (actividadesPlan.length === 0) {
        return respuestaError(
          'El Plan Anual no tiene actividades para generar la matriz.'
        )
      }

      let actividadesProcesadas = 0
      let cortesCreados = 0
      const omitidas = []

      for (const actividad of actividadesPlan) {
        const cortesExistentes =
          Array.isArray(
            actividad?.pesv_plan_trabajo_cortes
          )
            ? actividad.pesv_plan_trabajo_cortes
            : []

        // Nunca regeneramos una actividad que ya tenga cortes:
        // así protegemos seguimientos existentes.
        if (cortesExistentes.length > 0) {
          continue
        }

        if (
          !actividad?.objetivo_id ||
          !actividad?.meta_id ||
          !actividad?.indicador_id ||
          !actividad?.fecha_programada_inicio ||
          !actividad?.fecha_programada_fin
        ) {
          omitidas.push(
            actividad?.codigo ||
              actividad?.actividad ||
              `ID ${actividad?.id}`
          )
          continue
        }

        const indicador =
          await obtenerIndicadorPorId(
            supabase,
            actividad.indicador_id
          )

        if (!indicador?.periodicidad) {
          omitidas.push(
            actividad?.codigo ||
              actividad?.actividad ||
              `ID ${actividad?.id}`
          )
          continue
        }

        const periodo =
          validarPeriodoActividad({
            plan,
            fechaInicioTexto:
              actividad.fecha_programada_inicio,
            fechaFinTexto:
              actividad.fecha_programada_fin,
          })

        if (periodo?.error) {
          omitidas.push(
            actividad?.codigo ||
              actividad?.actividad ||
              `ID ${actividad?.id}`
          )
          continue
        }

        const generacion =
          generarCortes({
            anio: Number(plan.anio),
            fechaInicio:
              periodo.fechaInicio,
            fechaFin:
              periodo.fechaFin,
            periodicidad:
              indicador.periodicidad,
          })

        if (
          generacion?.error ||
          !Array.isArray(generacion?.cortes) ||
          generacion.cortes.length === 0
        ) {
          omitidas.push(
            actividad?.codigo ||
              actividad?.actividad ||
              `ID ${actividad?.id}`
          )
          continue
        }

        const creados =
          await insertarCortesActividad(
            supabase,
            {
              actividadId:
                actividad.id,
              cortes:
                generacion.cortes,
              usuario,
              fecha,
            }
          )

        actividadesProcesadas += 1
        cortesCreados +=
          Array.isArray(creados)
            ? creados.length
            : generacion.cortes.length
      }

      return respuestaOk({
        message:
          cortesCreados > 0
            ? `Matriz preparada correctamente: ${cortesCreados} corte(s) creados para ${actividadesProcesadas} actividad(es).`
            : 'No fue necesario crear nuevos cortes.',
        actividades_procesadas:
          actividadesProcesadas,
        cortes_creados:
          cortesCreados,
        actividades_omitidas:
          omitidas,
      })
    }

    // ========================================================
    // ACTUALIZAR DATOS DE ACTIVIDAD
    //
    // Regla de protección:
    // - Si la actividad YA tiene cortes, solo se permiten cambios
    //   administrativos: responsable, recursos y observaciones.
    // - Si la actividad NO tiene cortes, se permite completar/corregir
    //   objetivo, meta, indicador y periodo de ejecución, incluso si
    //   el Plan está APROBADO. Esto permite normalizar actividades
    //   históricas creadas antes de implementar la matriz.
    // - Esta acción NO genera cortes automáticamente. Después de
    //   completar la actividad se usa "generar_cortes_plan".
    // ========================================================

    if (accion === 'actualizar_datos_actividad') {
      const actividadId = numeroEntero(
        body?.actividad_id || body?.id
      )

      if (actividadId <= 0) {
        return respuestaError(
          'La actividad seleccionada no es válida.'
        )
      }

      const {
        data: actividadActual,
        error: errorActividad,
      } = await supabase
        .from('pesv_plan_trabajo_actividades')
        .select('*')
        .eq('id', actividadId)
        .maybeSingle()

      if (errorActividad) {
        throw errorActividad
      }

      if (!actividadActual) {
        return respuestaError(
          'La actividad no existe.',
          404
        )
      }

      const planActividad =
        await obtenerPlanPorId(
          supabase,
          actividadActual.plan_trabajo_id
        )

      if (!planActividad) {
        return respuestaError(
          'No fue posible identificar el Plan Anual de la actividad.',
          404
        )
      }

      const estadoPlanActividad =
        texto(planActividad.estado).toUpperCase()

      if (
        estadoPlanActividad !== 'APROBADO' &&
        estadoPlanActividad !== 'BORRADOR'
      ) {
        return respuestaError(
          'La actividad no puede modificarse porque el Plan Anual está cerrado.'
        )
      }

      // --------------------------------------------------------
      // Verificar si la actividad ya tiene cortes.
      // No se eliminan, modifican ni regeneran desde esta acción.
      // --------------------------------------------------------

      const {
        count: totalCortes,
        error: errorCortes,
      } = await supabase
        .from('pesv_plan_trabajo_cortes')
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq('actividad_id', actividadId)

      if (errorCortes) {
        throw errorCortes
      }

      const tieneCortes =
        Number(totalCortes || 0) > 0

      const responsableId =
        numeroEntero(
          body?.responsable_personal_id
        )

      const responsableNombre =
        texto(body?.responsable_nombre)

      if (
        responsableId <= 0 &&
        !responsableNombre
      ) {
        return respuestaError(
          'Debe seleccionar el responsable de la actividad.'
        )
      }

      // --------------------------------------------------------
      // Campos administrativos: siempre editables mientras el
      // Plan esté BORRADOR o APROBADO.
      // --------------------------------------------------------

      const payload = {
        responsable_personal_id:
          responsableId > 0
            ? responsableId
            : null,

        responsable_nombre:
          responsableNombre || null,

        recursos_descripcion:
          texto(
            body?.recursos_descripcion
          ) || null,

        observaciones:
          texto(body?.observaciones) || null,

        usuario_actualizacion:
          usuario || null,

        updated_at: fecha,
      }

      // --------------------------------------------------------
      // Actividad SIN cortes:
      // permitir completar/corregir alineación y fechas.
      // --------------------------------------------------------

      if (!tieneCortes) {
        const objetivoId =
          idOpcional(
            body?.objetivo_id ??
              actividadActual.objetivo_id
          )

        const metaId =
          idOpcional(
            body?.meta_id ??
              actividadActual.meta_id
          )

        const indicadorRecibidoId =
          idOpcional(
            body?.indicador_id ??
              actividadActual.indicador_id
          )

        const relaciones =
          await validarRelacionesActividad(
            supabase,
            {
              planId:
                actividadActual.plan_trabajo_id,
              objetivoId,
              metaId,
              indicadorId:
                indicadorRecibidoId,
            }
          )

        if (relaciones?.error) {
          return respuestaError(
            relaciones.error
          )
        }

        let periodo = null
        let cortesManuales = []

        if (relaciones.usaMesesManuales) {
          const mesesProgramados = normalizarMeses(body?.meses_programados)

          if (mesesProgramados.length === 0) {
            return respuestaError(
              'Para una actividad sin meta relacionada debe seleccionar al menos un mes de ejecución.'
            )
          }

          periodo = {
            fechaInicio: `${planActividad.anio}-${String(mesesProgramados[0]).padStart(2, '0')}-01`,
            fechaFin: ultimoDiaMes(
              Number(planActividad.anio),
              mesesProgramados[mesesProgramados.length - 1]
            ),
          }

          cortesManuales = generarCortesPorMeses({
            anio: Number(planActividad.anio),
            meses: mesesProgramados,
          })
        } else {
          periodo = validarPeriodoActividad({
            plan: planActividad,
            fechaInicioTexto: body?.fecha_programada_inicio ?? actividadActual.fecha_programada_inicio,
            fechaFinTexto: body?.fecha_programada_fin ?? actividadActual.fecha_programada_fin,
          })

          if (periodo?.error) return respuestaError(periodo.error)
        }

        payload.objetivo_id = objetivoId
        payload.meta_id = metaId
        payload.indicador_id = relaciones.indicadorId
        payload.fecha_programada_inicio = periodo.fechaInicio
        payload.fecha_programada_fin = periodo.fechaFin
        payload.trimestre = null
        payload.__cortes_manuales = cortesManuales
      }

      const cortesManualesPendientes = Array.isArray(payload.__cortes_manuales)
        ? payload.__cortes_manuales
        : []
      delete payload.__cortes_manuales

      const {
        data: actividadActualizada,
        error: errorActualizar,
      } = await supabase
        .from('pesv_plan_trabajo_actividades')
        .update(payload)
        .eq('id', actividadId)
        .select('*')
        .single()

      if (errorActualizar) {
        throw errorActualizar
      }

      if (!tieneCortes && cortesManualesPendientes.length > 0) {
        await insertarCortesActividad(supabase, {
          actividadId,
          cortes: cortesManualesPendientes,
          usuario,
          fecha,
        })
      }

      return respuestaOk({
        message:
          tieneCortes
            ? 'Datos administrativos de la actividad actualizados correctamente. La programación y los cortes de seguimiento permanecen protegidos.'
            : cortesManualesPendientes.length > 0
              ? 'Actividad actualizada y meses específicos programados correctamente.'
              : 'Actividad actualizada correctamente. Ya puede generar sus cortes de seguimiento mediante Habilitar matriz.',
        actividad:
          actividadActualizada,
        tiene_cortes:
          tieneCortes,
        programacion_editable:
          !tieneCortes,
      })
    }

    // ========================================================
    // ACTUALIZAR ACTIVIDAD + REGENERAR MATRIZ
    // Solo BORRADOR. No hay seguimiento histórico todavía.
    // ========================================================

    if (accion === 'actualizar_actividad') {
      const id = numeroEntero(body?.id)

      if (id <= 0) {
        return respuestaError(
          'La actividad que desea actualizar no es válida.'
        )
      }

      const existente =
        await obtenerActividadPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'La actividad no existe.',
          404
        )
      }

      const plan =
        await obtenerPlanPorId(
          supabase,
          existente.plan_trabajo_id
        )

      if (!plan) {
        return respuestaError(
          'El Plan Anual de Trabajo asociado no existe.',
          404
        )
      }

      if (!planPermitePlaneacion(plan)) {
        return respuestaError(
          'La programación de actividades solo puede modificarse mientras el Plan Anual esté en estado BORRADOR.'
        )
      }

      const actividad =
        texto(body?.actividad)

      if (!actividad) {
        return respuestaError(
          'La actividad es obligatoria.'
        )
      }

      const objetivoId =
        idOpcional(body?.objetivo_id)

      const metaId =
        idOpcional(body?.meta_id)

      const indicadorRecibidoId =
        idOpcional(body?.indicador_id)

      const relaciones =
        await validarRelacionesActividad(
          supabase,
          {
            planId:
              existente.plan_trabajo_id,
            objetivoId,
            metaId,
            indicadorId:
              indicadorRecibidoId,
          }
        )

      if (relaciones?.error) {
        return respuestaError(
          relaciones.error
        )
      }

      let periodo = null
      let generacion = null

      if (relaciones.usaMesesManuales) {
        const mesesProgramados = normalizarMeses(body?.meses_programados)
        if (mesesProgramados.length === 0) {
          return respuestaError('Para una actividad sin meta relacionada debe seleccionar al menos un mes de ejecución.')
        }
        periodo = {
          fechaInicio: `${plan.anio}-${String(mesesProgramados[0]).padStart(2, '0')}-01`,
          fechaFin: ultimoDiaMes(Number(plan.anio), mesesProgramados[mesesProgramados.length - 1]),
        }
        generacion = {
          tipo: 'MESES_ESPECIFICOS',
          cortes: generarCortesPorMeses({ anio: Number(plan.anio), meses: mesesProgramados }),
        }
      } else {
        periodo = validarPeriodoActividad({
          plan,
          fechaInicioTexto: body?.fecha_programada_inicio,
          fechaFinTexto: body?.fecha_programada_fin,
        })
        if (periodo?.error) return respuestaError(periodo.error)
        generacion = generarCortes({
          anio: Number(plan.anio),
          fechaInicio: periodo.fechaInicio,
          fechaFin: periodo.fechaFin,
          periodicidad: relaciones.indicador.periodicidad,
        })
        if (generacion?.error) return respuestaError(generacion.error)
      }

      const responsableId =
        idOpcional(
          body?.responsable_personal_id
        )

      const responsableNombre =
        texto(body?.responsable_nombre)

      if (!responsableId && !responsableNombre) {
        return respuestaError(
          'Debe seleccionar el responsable de la actividad.'
        )
      }

      const payload = {
        codigo:
          texto(body?.codigo).toUpperCase() ||
          null,
        actividad,
        descripcion:
          texto(body?.descripcion) || null,
        objetivo_id:
          objetivoId,
        meta_id:
          metaId,
        indicador_id:
          relaciones.indicadorId,
        responsable_personal_id:
          responsableId,
        responsable_nombre:
          responsableNombre || null,
        fecha_programada_inicio:
          periodo.fechaInicio,
        fecha_programada_fin:
          periodo.fechaFin,
        trimestre: null,
        recursos_descripcion:
          texto(body?.recursos_descripcion) ||
          null,
        presupuesto:
          numeroOpcional(body?.presupuesto),

        // La actividad maestra continúa neutra.
        estado: 'PROGRAMADA',
        fecha_ejecucion: null,
        porcentaje_avance: 0,
        resultado: null,
        evidencia_path: null,
        observaciones:
          texto(body?.observaciones) || null,

        usuario_actualizacion:
          usuario,
        updated_at:
          fecha,
      }

      const { data: actividadActualizada, error } =
        await supabase
          .from(
            'pesv_plan_trabajo_actividades'
          )
          .update(payload)
          .eq('id', id)
          .select(`
            id,
            plan_trabajo_id,
            codigo,
            actividad,
            descripcion,
            objetivo_id,
            meta_id,
            indicador_id,
            responsable_personal_id,
            responsable_nombre,
            fecha_programada_inicio,
            fecha_programada_fin,
            trimestre,
            recursos_descripcion,
            presupuesto,
            estado,
            fecha_ejecucion,
            porcentaje_avance,
            resultado,
            evidencia_path,
            observaciones,
            usuario_creacion,
            usuario_actualizacion,
            created_at,
            updated_at
          `)
          .single()

      if (error) {
        throw error
      }

      const { error: errorEliminarCortes } =
        await supabase
          .from('pesv_plan_trabajo_cortes')
          .delete()
          .eq('actividad_id', id)

      if (errorEliminarCortes) {
        throw errorEliminarCortes
      }

      const cortes =
        await insertarCortesActividad(
          supabase,
          {
            actividadId: id,
            cortes:
              generacion.cortes,
            usuario,
            fecha,
          }
        )

      return respuestaOk({
        message:
          'Actividad actualizada y matriz de seguimiento regenerada correctamente.',
        actividad:
          actividadActualizada,
        periodicidad:
          relaciones.indicador?.periodicidad || null,
        tipo_periodicidad:
          generacion.tipo,
        cortes,
      })
    }

    // ========================================================
    // REGISTRAR SEGUIMIENTO DE UNA CELDA / CORTE
    // ========================================================

    if (
      accion ===
      'registrar_seguimiento_corte'
    ) {
      const corteId =
        numeroEntero(
          body?.corte_id || body?.id
        )

      if (corteId <= 0) {
        return respuestaError(
          'El corte de seguimiento seleccionado no es válido.'
        )
      }

      const corte =
        await obtenerCortePorId(
          supabase,
          corteId
        )

      if (!corte) {
        return respuestaError(
          'El corte de seguimiento no existe.',
          404
        )
      }

      const actividad =
        await obtenerActividadPorId(
          supabase,
          corte.actividad_id
        )

      if (!actividad) {
        return respuestaError(
          'La actividad asociada al corte no existe.',
          404
        )
      }

      const plan =
        await obtenerPlanPorId(
          supabase,
          actividad.plan_trabajo_id
        )

      if (!plan) {
        return respuestaError(
          'El Plan Anual de Trabajo asociado no existe.',
          404
        )
      }

      if (!planPermiteSeguimiento(plan)) {
        return respuestaError(
          texto(plan.estado).toUpperCase() ===
            'CERRADO'
            ? 'No puede registrar seguimiento porque el Plan Anual está CERRADO.'
            : 'Para registrar seguimiento el Plan Anual debe estar APROBADO.'
        )
      }

      const estado =
        validarEstadoCorte(
          body?.estado
        )

      if (
        !estado ||
        estado === 'PROGRAMADA'
      ) {
        return respuestaError(
          'Seleccione un resultado de ejecución válido: EJECUTADA, PARCIAL o NO_EJECUTADA.'
        )
      }

      const fechaEjecucionTexto =
        texto(body?.fecha_ejecucion)

      const fechaEjecucion =
        fechaEjecucionTexto
          ? fechaValida(
              fechaEjecucionTexto
            )
          : null

      if (
        fechaEjecucionTexto &&
        !fechaEjecucion
      ) {
        return respuestaError(
          'La fecha de realización no es válida.'
        )
      }

      if (
        ['EJECUTADA', 'PARCIAL'].includes(
          estado
        ) &&
        !fechaEjecucion
      ) {
        return respuestaError(
          'Debe registrar la fecha en la que se realizó la actividad.'
        )
      }

      if (
        fechaEjecucion &&
        anioDeFecha(fechaEjecucion) !==
          Number(plan.anio)
      ) {
        return respuestaError(
          `La fecha de realización debe corresponder a la vigencia ${plan.anio}.`
        )
      }

      const resultado =
        texto(body?.resultado)

      const observaciones =
        texto(body?.observaciones)

      if (
        ['EJECUTADA', 'PARCIAL'].includes(
          estado
        ) &&
        !resultado
      ) {
        return respuestaError(
          'Describa el resultado o la actividad realizada.'
        )
      }

      if (
        ['PARCIAL', 'NO_EJECUTADA'].includes(
          estado
        ) &&
        !observaciones
      ) {
        return respuestaError(
          estado === 'PARCIAL'
            ? 'Para una ejecución parcial debe indicar en observaciones qué se realizó y qué quedó pendiente.'
            : 'Para una actividad no ejecutada debe registrar la justificación en observaciones.'
        )
      }

      const payload = {
        estado,

        fecha_ejecucion:
          estado === 'NO_EJECUTADA'
            ? null
            : fechaEjecucion,

        resultado:
          estado === 'NO_EJECUTADA'
            ? null
            : resultado || null,

        observaciones:
          observaciones || null,

        evidencia_path:
          texto(body?.evidencia_path) ||
          corte.evidencia_path ||
          null,

        evidencia_nombre:
          texto(body?.evidencia_nombre) ||
          corte.evidencia_nombre ||
          null,

        usuario_actualizacion:
          usuario,

        updated_at:
          fecha,
      }

      const { data, error } =
        await supabase
          .from('pesv_plan_trabajo_cortes')
          .update(payload)
          .eq('id', corteId)
          .select(`
            id,
            actividad_id,
            anio,
            mes,
            trimestre,
            fecha_corte,
            estado,
            fecha_ejecucion,
            resultado,
            observaciones,
            evidencia_path,
            evidencia_nombre,
            usuario_registro,
            usuario_actualizacion,
            created_at,
            updated_at
          `)
          .single()

      if (error) {
        throw error
      }

      return respuestaOk({
        message:
          estado === 'EJECUTADA'
            ? 'Ejecución registrada correctamente.'
            : estado === 'PARCIAL'
              ? 'Ejecución parcial registrada correctamente.'
              : 'Actividad no ejecutada registrada correctamente.',
        corte: data,
      })
    }

    return respuestaError(
      'La acción solicitada no es válida.'
    )
  } catch (error) {
    return respuestaDesdeError(
      error,
      'No fue posible actualizar el Plan Anual de Trabajo PESV.'
    )
  }
}

// ============================================================
// DELETE
//
// ACCIONES:
// - eliminar_plan
// - eliminar_actividad
// ============================================================

export async function DELETE(request) {
  try {
    const body = await request.json()

    const { supabaseAdmin } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const supabase = supabaseAdmin
    const accion = texto(body?.accion).toLowerCase()

    // ========================================================
    // ELIMINAR ACTIVIDAD
    // ========================================================

    if (accion === 'eliminar_actividad') {
      const id = numeroEntero(body?.id)

      if (id <= 0) {
        return respuestaError(
          'La actividad que desea eliminar no es válida.'
        )
      }

      const existente =
        await obtenerActividadPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'La actividad no existe.',
          404
        )
      }

      const plan =
        await obtenerPlanPorId(
          supabase,
          existente.plan_trabajo_id
        )

      if (!planPermitePlaneacion(plan)) {
        return respuestaError(
          'Solo puede eliminar actividades mientras el Plan Anual esté en estado BORRADOR.'
        )
      }

      // La FK de cortes tiene ON DELETE CASCADE.
      const { error } =
        await supabase
          .from(
            'pesv_plan_trabajo_actividades'
          )
          .delete()
          .eq('id', id)

      if (error) {
        throw error
      }

      return respuestaOk({
        message:
          'Actividad del Plan Anual de Trabajo eliminada correctamente.',
      })
    }

    // ========================================================
    // ELIMINAR PLAN
    // ========================================================

    if (accion === 'eliminar_plan') {
      const id = numeroEntero(body?.id)

      if (id <= 0) {
        return respuestaError(
          'El Plan Anual de Trabajo que desea eliminar no es válido.'
        )
      }

      const existente =
        await obtenerPlanPorId(
          supabase,
          id
        )

      if (!existente) {
        return respuestaError(
          'El Plan Anual de Trabajo no existe.',
          404
        )
      }

      if (!planPermitePlaneacion(existente)) {
        return respuestaError(
          'Solo puede eliminar un Plan Anual mientras esté en estado BORRADOR.'
        )
      }

      const { count, error: errorActividades } =
        await supabase
          .from(
            'pesv_plan_trabajo_actividades'
          )
          .select(
            'id',
            {
              count: 'exact',
              head: true,
            }
          )
          .eq('plan_trabajo_id', id)

      if (errorActividades) {
        throw errorActividades
      }

      if (Number(count || 0) > 0) {
        return respuestaError(
          'No puede eliminar el Plan Anual de Trabajo porque tiene actividades registradas. Elimine primero las actividades.'
        )
      }

      const { error } =
        await supabase
          .from('pesv_planes_trabajo')
          .delete()
          .eq('id', id)

      if (error) {
        throw error
      }

      return respuestaOk({
        message:
          'Plan Anual de Trabajo PESV eliminado correctamente.',
      })
    }

    return respuestaError(
      'La acción solicitada no es válida.'
    )
  } catch (error) {
    return respuestaDesdeError(
      error,
      'No fue posible eliminar el registro del Plan Anual de Trabajo PESV.'
    )
  }
}
