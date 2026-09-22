// app/admin/pesv/plan-trabajo/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useRouter } from 'next/navigation'
import { cerrarSesion } from '@/lib/auth/logout'

// ============================================================
// CONSTANTES
// ============================================================

const MESES = [
  { numero: 1, corto: 'ENE', nombre: 'ENERO' },
  { numero: 2, corto: 'FEB', nombre: 'FEBRERO' },
  { numero: 3, corto: 'MAR', nombre: 'MARZO' },
  { numero: 4, corto: 'ABR', nombre: 'ABRIL' },
  { numero: 5, corto: 'MAY', nombre: 'MAYO' },
  { numero: 6, corto: 'JUN', nombre: 'JUNIO' },
  { numero: 7, corto: 'JUL', nombre: 'JULIO' },
  { numero: 8, corto: 'AGO', nombre: 'AGOSTO' },
  { numero: 9, corto: 'SEP', nombre: 'SEPTIEMBRE' },
  { numero: 10, corto: 'OCT', nombre: 'OCTUBRE' },
  { numero: 11, corto: 'NOV', nombre: 'NOVIEMBRE' },
  { numero: 12, corto: 'DIC', nombre: 'DICIEMBRE' },
]

const ALCANCES = [
  {
    value: 'DISENO_IMPLEMENTACION_SEGUIMIENTO_MEJORA',
    label: 'Diseño, implementación, seguimiento y mejora',
  },
  {
    value: 'IMPLEMENTACION_SEGUIMIENTO_MEJORA',
    label: 'Implementación, seguimiento y mejora',
  },
  {
    value: 'SEGUIMIENTO_MEJORA',
    label: 'Seguimiento y mejora',
  },
]

// ============================================================
// HELPERS
// ============================================================

function texto(valor) {
  return String(valor ?? '').trim()
}

function obtenerNitUsuario(user) {
  return texto(
    user?.nit ||
      user?.nitEmpresa ||
      user?.nit_empresa ||
      user?.empresaNit ||
      user?.empresa_nit ||
      ''
  )
}

function obtenerNombreUsuario(user) {
  return (
    texto(
      user?.nombreCompleto ||
        user?.nombre_completo ||
        user?.usuario ||
        ''
    ) || '-'
  )
}

function obtenerNombreEmpresa(user) {
  return (
    texto(
      user?.nombreEmpresa ||
        user?.nombre_empresa ||
        user?.empresa ||
        ''
    ) || '-'
  )
}

function nombrePersonal(persona) {
  const nombre = [
    texto(persona?.nombres),
    texto(persona?.apellidos),
  ]
    .filter(Boolean)
    .join(' ')

  return (
    nombre ||
    texto(
      persona?.nombre_completo ||
        persona?.nombre ||
        persona?.documento ||
        ''
    ) ||
    '-'
  )
}

function fechaVisual(valor) {
  const fecha = texto(valor)

  if (!fecha) {
    return '-'
  }

  const partes = fecha.slice(0, 10).split('-')

  if (partes.length !== 3) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function monedaVisual(valor) {
  if (
    valor === null ||
    valor === undefined ||
    texto(valor) === ''
  ) {
    return '-'
  }

  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return '-'
  }

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numero)
}

function mesNumeroFecha(fecha) {
  const valor = texto(fecha)

  if (!/^\d{4}-\d{2}-\d{2}/.test(valor)) {
    return null
  }

  const mes = Number(valor.slice(5, 7))

  return mes >= 1 && mes <= 12
    ? mes
    : null
}

function nombreMes(numero) {
  return (
    MESES.find(item => item.numero === Number(numero))
      ?.nombre || '-'
  )
}

function periodicidadVisual(valor) {
  const periodicidad = texto(valor).toUpperCase()

  if (
    periodicidad.includes('MENSUAL') ||
    periodicidad.includes('MES_Y_ANO')
  ) {
    return 'MENSUAL'
  }

  if (
    periodicidad.includes('TRIMESTRAL') ||
    periodicidad.includes('TRIMESTRE')
  ) {
    return 'TRIMESTRAL'
  }

  if (periodicidad.includes('ANUAL')) {
    return 'ANUAL'
  }

  return periodicidad.replaceAll('_', ' ') || '-'
}

function alcanceVisual(valor) {
  return (
    ALCANCES.find(item => item.value === texto(valor))
      ?.label || texto(valor).replaceAll('_', ' ') || '-'
  )
}

function claseEstadoPlan(estado) {
  const valor = texto(estado).toUpperCase()

  if (valor === 'APROBADO') {
    return 'bg-green-100 text-green-800 border-green-200'
  }

  if (valor === 'CERRADO') {
    return 'bg-gray-200 text-gray-700 border-gray-300'
  }

  return 'bg-amber-100 text-amber-800 border-amber-200'
}

function estadoCorteVisual(corte) {
  if (!corte) {
    return null
  }

  const estado = texto(corte?.estado).toUpperCase()

  if (
    estado === 'PROGRAMADA' &&
    corte?.fecha_corte &&
    new Date(`${corte.fecha_corte}T23:59:59`) <
      new Date()
  ) {
    return 'VENCIDA'
  }

  return estado || 'PROGRAMADA'
}

function claseCeldaCorte(corte) {
  const estado = estadoCorteVisual(corte)

  if (estado === 'EJECUTADA') {
    return 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
  }

  if (estado === 'PARCIAL') {
    return 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
  }

  if (estado === 'NO_EJECUTADA') {
    return 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200'
  }

  if (estado === 'VENCIDA') {
    return 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200'
  }

  return 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
}

function simboloCorte(corte) {
  const estado = estadoCorteVisual(corte)

  if (estado === 'EJECUTADA') return '✓'
  if (estado === 'PARCIAL') return '◐'
  if (estado === 'NO_EJECUTADA') return '!'
  if (estado === 'VENCIDA') return 'V'

  return 'P'
}

function formularioPlanInicial(anio) {
  return {
    fecha_elaboracion: `${anio}-01-01`,
    alcance: '',
    objetivo: '',
    responsable_personal_id: '',
    observaciones: '',
  }
}

function formularioActividadInicial() {
  return {
    codigo: '',
    actividad: '',
    descripcion: '',
    objetivo_id: '',
    meta_id: '',
    indicador_id: '',
    responsable_personal_id: '',
    fecha_programada_inicio: '',
    fecha_programada_fin: '',
    recursos_descripcion: '',
    presupuesto: '',
    observaciones: '',
    meses_programados: [],
  }
}

function formularioCorteInicial(corte = null) {
  return {
    estado:
      texto(corte?.estado).toUpperCase() === 'PROGRAMADA'
        ? 'EJECUTADA'
        : texto(corte?.estado).toUpperCase() ||
          'EJECUTADA',
    fecha_ejecucion: texto(corte?.fecha_ejecucion),
    resultado: texto(corte?.resultado),
    observaciones: texto(corte?.observaciones),
    evidencia_path: texto(corte?.evidencia_path),
    evidencia_nombre: texto(corte?.evidencia_nombre),
  }
}

// ============================================================
// COMPONENTE
// ============================================================

export default function PlanTrabajoPesvPage() {
  const router = useRouter()
  const anioActual = new Date().getFullYear()

  const [user, setUser] = useState(null)
  const [anio, setAnio] = useState(anioActual)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [plan, setPlan] = useState(null)
  const [actividades, setActividades] = useState([])
  const [objetivos, setObjetivos] = useState([])
  const [metas, setMetas] = useState([])
  const [indicadores, setIndicadores] = useState([])
  const [personal, setPersonal] = useState([])

  const [modalPlan, setModalPlan] = useState(false)
  const [modalActividad, setModalActividad] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(null)
  const [modalCorte, setModalCorte] = useState(null)
  const [modalAprobacion, setModalAprobacion] = useState(false)

  const [formularioPlan, setFormularioPlan] =
    useState(formularioPlanInicial(anioActual))

  const [formularioActividad, setFormularioActividad] =
    useState(formularioActividadInicial())

  const [editandoActividadId, setEditandoActividadId] =
    useState(null)
  const [edicionAdministrativa, setEdicionAdministrativa] =
    useState(false)

  const [actividadEditadaTieneCortes, setActividadEditadaTieneCortes] =
    useState(false)

  const [formularioCorte, setFormularioCorte] =
    useState(formularioCorteInicial())

  const [erroresCorte, setErroresCorte] =
    useState({})

  const [fechaAprobacion, setFechaAprobacion] =
    useState('')

  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')

    if (!storedUser) {
      router.push('/login')
      return
    }

    try {
      setUser(JSON.parse(storedUser))
    } catch (sessionError) {
      console.error('Error leyendo sesión:', sessionError)
      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }, [router])

  // ==========================================================
  // MENSAJES
  // ==========================================================

  function mostrarMensaje(valor) {
    setMensaje(valor)
    setError('')

    window.setTimeout(() => {
      setMensaje('')
    }, 4500)
  }

  // ==========================================================
  // CARGA
  // ==========================================================

  async function cargarDatos(anioConsulta = anio) {
    if (!user) {
      return
    }

    const nit = obtenerNitUsuario(user)

    if (!nit) {
      setError(
        'No fue posible identificar el NIT del CEA en la sesión actual.'
      )
      setCargando(false)
      return
    }

    try {
      setCargando(true)
      setError('')

      const params = new URLSearchParams({
        nit,
        anio: String(anioConsulta),
      })

      const response = await fetch(
        `/api/admin/pesv/plan-trabajo?${params.toString()}`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      )

      const data = await response.json()

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            'No fue posible consultar el Plan Anual de Trabajo.'
        )
      }

      setPlan(data?.plan || null)

      setActividades(
        Array.isArray(data?.actividades)
          ? data.actividades
          : []
      )

      setObjetivos(
        Array.isArray(data?.objetivos)
          ? data.objetivos
          : []
      )

      setMetas(
        Array.isArray(data?.metas)
          ? data.metas
          : []
      )

      setIndicadores(
        Array.isArray(data?.indicadores)
          ? data.indicadores
          : []
      )

      setPersonal(
        Array.isArray(data?.personal)
          ? data.personal
          : []
      )

      if (data?.plan) {
        setFormularioPlan({
          fecha_elaboracion:
            texto(data.plan.fecha_elaboracion),
          alcance:
            texto(data.plan.alcance),
          objetivo:
            texto(data.plan.objetivo),
          responsable_personal_id:
            data.plan.responsable_personal_id
              ? String(
                  data.plan.responsable_personal_id
                )
              : '',
          observaciones:
            texto(data.plan.observaciones),
        })
      } else {
        setFormularioPlan(
          formularioPlanInicial(anioConsulta)
        )
      }
    } catch (consultaError) {
      console.error(
        'Error cargando Plan Anual de Trabajo:',
        consultaError
      )

      setError(
        consultaError?.message ||
          'No fue posible consultar la información.'
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (user) {
      cargarDatos(anio)
    }
  }, [user, anio])

  // ==========================================================
  // DATOS DERIVADOS
  // ==========================================================

  const personalOrdenado = useMemo(() => {
    return [...personal].sort((a, b) =>
      nombrePersonal(a).localeCompare(
        nombrePersonal(b),
        'es'
      )
    )
  }, [personal])

  const objetivosOrdenados = useMemo(() => {
    return [...objetivos].sort((a, b) =>
      texto(a?.codigo).localeCompare(
        texto(b?.codigo),
        'es',
        { numeric: true }
      )
    )
  }, [objetivos])

  const metasFiltradas = useMemo(() => {
    if (!formularioActividad.objetivo_id) {
      return []
    }

    return metas.filter(
      meta =>
        Number(meta?.objetivo_id) ===
        Number(formularioActividad.objetivo_id)
    )
  }, [
    metas,
    formularioActividad.objetivo_id,
  ])

  const indicadorActividad = useMemo(() => {
    return indicadores.find(
      indicador =>
        Number(indicador?.id) ===
        Number(formularioActividad.indicador_id)
    )
  }, [
    indicadores,
    formularioActividad.indicador_id,
  ])

  const actividadesOrdenadas = useMemo(() => {
    return [...actividades].sort((a, b) => {
      const codigoA = texto(a?.codigo)
      const codigoB = texto(b?.codigo)

      if (codigoA || codigoB) {
        const comparacion = codigoA.localeCompare(
          codigoB,
          'es',
          { numeric: true }
        )

        if (comparacion !== 0) {
          return comparacion
        }
      }

      return texto(
        a?.fecha_programada_inicio
      ).localeCompare(
        texto(b?.fecha_programada_inicio)
      )
    })
  }, [actividades])

  const resumenMensual = useMemo(() => {
    const resumen = {}

    MESES.forEach(mes => {
      resumen[mes.numero] = {
        programadas: 0,
        ejecutadas: 0,
        parciales: 0,
        noEjecutadas: 0,
        vencidas: 0,
      }
    })

    actividades.forEach(actividad => {
      const cortes = Array.isArray(
        actividad?.pesv_plan_trabajo_cortes
      )
        ? actividad.pesv_plan_trabajo_cortes
        : []

      cortes.forEach(corte => {
        const mes = Number(corte?.mes)

        if (!resumen[mes]) {
          return
        }

        resumen[mes].programadas += 1

        const estado = estadoCorteVisual(corte)

        if (estado === 'EJECUTADA') {
          resumen[mes].ejecutadas += 1
        }

        if (estado === 'PARCIAL') {
          resumen[mes].parciales += 1
        }

        if (estado === 'NO_EJECUTADA') {
          resumen[mes].noEjecutadas += 1
        }

        if (estado === 'VENCIDA') {
          resumen[mes].vencidas += 1
        }
      })
    })

    return resumen
  }, [actividades])

  const resumenTrimestral = useMemo(() => {
    const salida = {
      1: { programadas: 0, ejecutadas: 0 },
      2: { programadas: 0, ejecutadas: 0 },
      3: { programadas: 0, ejecutadas: 0 },
      4: { programadas: 0, ejecutadas: 0 },
    }

    actividades.forEach(actividad => {
      const cortes = Array.isArray(
        actividad?.pesv_plan_trabajo_cortes
      )
        ? actividad.pesv_plan_trabajo_cortes
        : []

      ;[1, 2, 3, 4].forEach(trimestre => {
        const cortesTrimestre = cortes.filter(
          corte =>
            Number(corte?.trimestre) === trimestre
        )

        if (!cortesTrimestre.length) {
          return
        }

        // Una actividad cuenta una sola vez por trimestre.
        salida[trimestre].programadas += 1

        // Resumen operativo provisional:
        // se considera ejecutada en el trimestre cuando todos
        // sus cortes requeridos del trimestre están EJECUTADOS.
        if (
          cortesTrimestre.every(
            corte =>
              texto(corte?.estado).toUpperCase() ===
              'EJECUTADA'
          )
        ) {
          salida[trimestre].ejecutadas += 1
        }
      })
    })

    return salida
  }, [actividades])

  const resumenGeneral = useMemo(() => {
    let cortes = 0
    let ejecutados = 0
    let pendientes = 0
    let vencidos = 0

    actividades.forEach(actividad => {
      const lista = Array.isArray(
        actividad?.pesv_plan_trabajo_cortes
      )
        ? actividad.pesv_plan_trabajo_cortes
        : []

      cortes += lista.length

      lista.forEach(corte => {
        const estado = estadoCorteVisual(corte)

        if (estado === 'EJECUTADA') {
          ejecutados += 1
        } else if (estado === 'VENCIDA') {
          vencidos += 1
        } else {
          pendientes += 1
        }
      })
    })

    return {
      actividades: actividades.length,
      cortes,
      ejecutados,
      pendientes,
      vencidos,
    }
  }, [actividades])

  const actividadesSinCortes = useMemo(
    () =>
      actividades.filter(actividad => {
        const cortes = Array.isArray(
          actividad?.pesv_plan_trabajo_cortes
        )
          ? actividad.pesv_plan_trabajo_cortes
          : []

        return cortes.length === 0
      }),
    [actividades]
  )

  // ==========================================================
  // PETICIONES
  // ==========================================================

  async function enviarPeticion(method, body) {
    const nit = obtenerNitUsuario(user)
    const usuario = obtenerNombreUsuario(user)

    const response = await fetch(
      '/api/admin/pesv/plan-trabajo',
      {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          nit,
          usuario_actualizacion: usuario,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok || !data?.ok) {
      throw new Error(
        data?.error ||
          'No fue posible completar la operación.'
      )
    }

    return data
  }

  // ==========================================================
  // PLAN
  // ==========================================================

  function abrirCrearPlan() {
    setFormularioPlan(
      formularioPlanInicial(anio)
    )
    setError('')
    setModalPlan(true)
  }

  function abrirEditarPlan() {
    setFormularioPlan({
      fecha_elaboracion:
        texto(plan?.fecha_elaboracion),
      alcance:
        texto(plan?.alcance),
      objetivo:
        texto(plan?.objetivo),
      responsable_personal_id:
        plan?.responsable_personal_id
          ? String(plan.responsable_personal_id)
          : '',
      observaciones:
        texto(plan?.observaciones),
    })
    setError('')
    setModalPlan(true)
  }

  function cambiarPlan(campo, valor) {
    setFormularioPlan(anterior => ({
      ...anterior,
      [campo]: valor,
    }))
  }

  async function guardarPlan(event) {
    event.preventDefault()

    if (!formularioPlan.fecha_elaboracion) {
      setError(
        'Seleccione la fecha de elaboración.'
      )
      return
    }

    if (!formularioPlan.alcance) {
      setError(
        'Seleccione el alcance del Plan Anual.'
      )
      return
    }

    if (!texto(formularioPlan.objetivo)) {
      setError(
        'Ingrese el objetivo general del Plan Anual.'
      )
      return
    }

    if (
      !formularioPlan.responsable_personal_id
    ) {
      setError(
        'Seleccione el responsable del Plan Anual.'
      )
      return
    }

    const responsable = personal.find(
      item =>
        String(item?.id) ===
        String(
          formularioPlan.responsable_personal_id
        )
    )

    try {
      setGuardando(true)
      setError('')

      const data = await enviarPeticion(
        plan?.id ? 'PATCH' : 'POST',
        {
          accion: plan?.id
            ? 'actualizar_plan'
            : 'crear_plan',
          id: plan?.id || null,
          anio,
          fecha_elaboracion:
            formularioPlan.fecha_elaboracion,
          alcance:
            formularioPlan.alcance,
          objetivo:
            formularioPlan.objetivo,
          estado:
            plan?.estado || 'BORRADOR',
          fecha_aprobacion:
            plan?.fecha_aprobacion || null,
          responsable_personal_id:
            formularioPlan.responsable_personal_id,
          responsable_nombre:
            responsable
              ? nombrePersonal(responsable)
              : null,
          observaciones:
            formularioPlan.observaciones,
        }
      )

      mostrarMensaje(
        data?.message ||
          'Plan Anual guardado correctamente.'
      )

      setModalPlan(false)
      await cargarDatos(anio)
    } catch (guardarError) {
      setError(
        guardarError?.message ||
          'No fue posible guardar el Plan Anual.'
      )
    } finally {
      setGuardando(false)
    }
  }

  async function aprobarPlan(event) {
    event.preventDefault()

    if (!fechaAprobacion) {
      setError(
        'Seleccione la fecha de aprobación.'
      )
      return
    }

    try {
      setGuardando(true)
      setError('')

      const data = await enviarPeticion(
        'PATCH',
        {
          accion: 'actualizar_plan',
          id: plan.id,
          estado: 'APROBADO',
          fecha_elaboracion:
            plan.fecha_elaboracion,
          fecha_aprobacion:
            fechaAprobacion,
          alcance:
            plan.alcance,
          objetivo:
            plan.objetivo,
          responsable_personal_id:
            plan.responsable_personal_id,
          responsable_nombre:
            plan.responsable_nombre,
          observaciones:
            plan.observaciones,
        }
      )

      mostrarMensaje(
        data?.message ||
          'Plan Anual aprobado correctamente.'
      )

      setModalAprobacion(false)
      setFechaAprobacion('')
      await cargarDatos(anio)
    } catch (aprobarError) {
      setError(
        aprobarError?.message ||
          'No fue posible aprobar el Plan Anual.'
      )
    } finally {
      setGuardando(false)
    }
  }

  async function generarCortesPlan() {
    if (!plan?.id) {
      return
    }

    const confirmar = window.confirm(
      `Se generarán los cortes de seguimiento faltantes para las actividades existentes del Plan ${anio}. No se modificarán cortes que ya tengan seguimiento. ¿Desea continuar?`
    )

    if (!confirmar) {
      return
    }

    try {
      setGuardando(true)
      setError('')

      const data = await enviarPeticion(
        'PATCH',
        {
          accion: 'generar_cortes_plan',
          plan_id: plan.id,
        }
      )

      mostrarMensaje(
        data?.message ||
          'Matriz de seguimiento preparada correctamente.'
      )

      if (
        Array.isArray(
          data?.actividades_omitidas
        ) &&
        data.actividades_omitidas.length > 0
      ) {
        setError(
          `No fue posible generar cortes para ${data.actividades_omitidas.length} actividad(es) porque su programación todavía está incompleta.`
        )
      }

      await cargarDatos(anio)
    } catch (e) {
      setError(
        e?.message ||
          'No fue posible preparar la matriz de seguimiento.'
      )
    } finally {
      setGuardando(false)
    }
  }

  // ==========================================================
  // ACTIVIDAD
  // ==========================================================

  function abrirNuevaActividad() {
    setEdicionAdministrativa(false)
    setActividadEditadaTieneCortes(false)
    setEditandoActividadId(null)
    setFormularioActividad(
      formularioActividadInicial()
    )
    setError('')
    setModalActividad(true)
  }

  function abrirEditarActividad(actividad) {
    setEdicionAdministrativa(false)
    setActividadEditadaTieneCortes(false)
    setEditandoActividadId(actividad.id)

    setFormularioActividad({
      codigo: texto(actividad?.codigo),
      actividad: texto(actividad?.actividad),
      descripcion: texto(actividad?.descripcion),
      objetivo_id: actividad?.objetivo_id
        ? String(actividad.objetivo_id)
        : '',
      meta_id: actividad?.meta_id
        ? String(actividad.meta_id)
        : '',
      indicador_id: actividad?.indicador_id
        ? String(actividad.indicador_id)
        : '',
      responsable_personal_id:
        actividad?.responsable_personal_id
          ? String(
              actividad.responsable_personal_id
            )
          : '',
      fecha_programada_inicio:
        texto(actividad?.fecha_programada_inicio),
      fecha_programada_fin:
        texto(actividad?.fecha_programada_fin),
      recursos_descripcion:
        texto(actividad?.recursos_descripcion),
      presupuesto:
        actividad?.presupuesto ?? '',
      observaciones:
        texto(actividad?.observaciones),
      meses_programados: Array.isArray(actividad?.pesv_plan_trabajo_cortes)
        ? actividad.pesv_plan_trabajo_cortes.map(c => Number(c.mes)).filter(m => m >= 1 && m <= 12)
        : [],
    })

    setError('')
    setModalActividad(true)
  }

  function abrirEditarDatosActividad(actividad) {
    const cortesActividad = Array.isArray(
      actividad?.pesv_plan_trabajo_cortes
    )
      ? actividad.pesv_plan_trabajo_cortes
      : []

    setEdicionAdministrativa(true)
    setActividadEditadaTieneCortes(
      cortesActividad.length > 0
    )
    setEditandoActividadId(actividad.id)

    setFormularioActividad({
      codigo: texto(actividad?.codigo),
      actividad: texto(actividad?.actividad),
      descripcion: texto(actividad?.descripcion),
      objetivo_id: actividad?.objetivo_id
        ? String(actividad.objetivo_id)
        : '',
      meta_id: actividad?.meta_id
        ? String(actividad.meta_id)
        : '',
      indicador_id: actividad?.indicador_id
        ? String(actividad.indicador_id)
        : '',
      responsable_personal_id:
        actividad?.responsable_personal_id
          ? String(actividad.responsable_personal_id)
          : '',
      fecha_programada_inicio:
        texto(actividad?.fecha_programada_inicio),
      fecha_programada_fin:
        texto(actividad?.fecha_programada_fin),
      recursos_descripcion:
        texto(actividad?.recursos_descripcion),
      presupuesto:
        actividad?.presupuesto ?? '',
      observaciones:
        texto(actividad?.observaciones),
      meses_programados: Array.isArray(actividad?.pesv_plan_trabajo_cortes)
        ? actividad.pesv_plan_trabajo_cortes.map(c => Number(c.mes)).filter(m => m >= 1 && m <= 12)
        : [],
    })

    setError('')
    setModalActividad(true)
  }

  function cambiarActividad(campo, valor) {
    setFormularioActividad(anterior => ({
      ...anterior,
      [campo]: valor,
    }))
  }

  function cambiarObjetivoActividad(valor) {
    setFormularioActividad(anterior => ({
      ...anterior,
      objetivo_id: valor,
      meta_id: '',
      indicador_id: '',
    }))
  }

  function cambiarMetaActividad(valor) {
    const meta = metas.find(
      item =>
        String(item?.id) === String(valor)
    )

    setFormularioActividad(anterior => ({
      ...anterior,
      meta_id: valor,
      indicador_id: meta?.indicador_id
        ? String(meta.indicador_id)
        : '',
      ...(valor
        ? { meses_programados: [] }
        : {
            fecha_programada_inicio: '',
            fecha_programada_fin: '',
          }),
    }))
  }

  function cambiarMesProgramado(numeroMes) {
    setFormularioActividad(anterior => {
      const actuales = Array.isArray(anterior.meses_programados)
        ? anterior.meses_programados
        : []

      const existe = actuales.includes(numeroMes)

      return {
        ...anterior,
        meses_programados: existe
          ? actuales.filter(mes => mes !== numeroMes)
          : [...actuales, numeroMes].sort((a, b) => a - b),
      }
    })
  }

  async function guardarDatosAdministrativosActividad(
    event
  ) {
    event.preventDefault()

    if (!editandoActividadId) {
      return
    }

    if (
      !formularioActividad.responsable_personal_id
    ) {
      setError(
        'Seleccione el responsable de la actividad.'
      )
      return
    }

    if (!actividadEditadaTieneCortes) {
      if (!formularioActividad.objetivo_id) {
        setError(
          'Seleccione el objetivo relacionado.'
        )
        return
      }

      if (formularioActividad.meta_id) {
        if (!formularioActividad.indicador_id) {
          setError(
            'La meta seleccionada debe tener un indicador relacionado.'
          )
          return
        }

        if (
          !formularioActividad.fecha_programada_inicio ||
          !formularioActividad.fecha_programada_fin
        ) {
          setError(
            'Seleccione las fechas Desde y Hasta del periodo de ejecución.'
          )
          return
        }
      } else if (
        !Array.isArray(formularioActividad.meses_programados) ||
        formularioActividad.meses_programados.length === 0
      ) {
        setError(
          'Seleccione al menos un mes de ejecución para la actividad sin meta asociada.'
        )
        return
      }
    }

    const responsable = personal.find(
      item =>
        String(item?.id) ===
        String(
          formularioActividad
            .responsable_personal_id
        )
    )

    try {
      setGuardando(true)
      setError('')

      const data = await enviarPeticion(
        'PATCH',
        {
          accion:
            'actualizar_datos_actividad',
          actividad_id:
            editandoActividadId,
          responsable_personal_id:
            formularioActividad
              .responsable_personal_id,
          responsable_nombre:
            responsable
              ? nombrePersonal(responsable)
              : null,
          objetivo_id:
            formularioActividad.objetivo_id || null,
          meta_id:
            formularioActividad.meta_id || null,
          indicador_id:
            formularioActividad.indicador_id || null,
          fecha_programada_inicio:
            formularioActividad.fecha_programada_inicio || null,
          fecha_programada_fin:
            formularioActividad.fecha_programada_fin || null,
          meses_programados:
            formularioActividad.meta_id
              ? []
              : formularioActividad.meses_programados,
          recursos_descripcion:
            formularioActividad
              .recursos_descripcion,
          observaciones:
            formularioActividad.observaciones,
        }
      )

      mostrarMensaje(
        data?.message ||
          'Datos de la actividad actualizados correctamente.'
      )

      setModalActividad(false)
      setEdicionAdministrativa(false)
      setActividadEditadaTieneCortes(false)
      setEditandoActividadId(null)

      await cargarDatos(anio)
    } catch (e) {
      setError(
        e?.message ||
          'No fue posible actualizar los datos de la actividad.'
      )
    } finally {
      setGuardando(false)
    }
  }

  async function guardarActividad(event) {
    event.preventDefault()

    if (!plan?.id) {
      setError(
        'Primero debe crear el Plan Anual de Trabajo.'
      )
      return
    }

    if (!texto(formularioActividad.actividad)) {
      setError('Ingrese la actividad.')
      return
    }

    if (!formularioActividad.objetivo_id) {
      setError(
        'Seleccione el objetivo relacionado.'
      )
      return
    }

    if (
      formularioActividad.meta_id &&
      !formularioActividad.indicador_id
    ) {
      setError(
        'La meta seleccionada debe tener un indicador relacionado.'
      )
      return
    }

    if (
      !formularioActividad
        .responsable_personal_id
    ) {
      setError(
        'Seleccione el responsable de la actividad.'
      )
      return
    }

    if (formularioActividad.meta_id) {
      if (
        !formularioActividad.fecha_programada_inicio ||
        !formularioActividad.fecha_programada_fin
      ) {
        setError(
          'Seleccione las fechas Desde y Hasta del periodo de ejecución.'
        )
        return
      }
    } else if (
      !Array.isArray(formularioActividad.meses_programados) ||
      formularioActividad.meses_programados.length === 0
    ) {
      setError(
        'Seleccione al menos un mes de ejecución para la actividad sin meta asociada.'
      )
      return
    }

    const responsable = personal.find(
      item =>
        String(item?.id) ===
        String(
          formularioActividad
            .responsable_personal_id
        )
    )

    try {
      setGuardando(true)
      setError('')

      const data = await enviarPeticion(
        editandoActividadId
          ? 'PATCH'
          : 'POST',
        {
          accion: editandoActividadId
            ? 'actualizar_actividad'
            : 'crear_actividad',
          id: editandoActividadId,
          plan_trabajo_id: plan.id,
          codigo:
            formularioActividad.codigo,
          actividad:
            formularioActividad.actividad,
          descripcion:
            formularioActividad.descripcion,
          objetivo_id:
            formularioActividad.objetivo_id,
          meta_id:
            formularioActividad.meta_id,
          indicador_id:
            formularioActividad.indicador_id,
          responsable_personal_id:
            formularioActividad
              .responsable_personal_id,
          responsable_nombre:
            responsable
              ? nombrePersonal(responsable)
              : null,
          fecha_programada_inicio:
            formularioActividad
              .fecha_programada_inicio,
          fecha_programada_fin:
            formularioActividad.meta_id
              ? formularioActividad.fecha_programada_fin
              : null,
          meses_programados:
            formularioActividad.meta_id
              ? []
              : formularioActividad.meses_programados,
          recursos_descripcion:
            formularioActividad
              .recursos_descripcion,
          presupuesto:
            formularioActividad.presupuesto,
          observaciones:
            formularioActividad.observaciones,
        }
      )

      mostrarMensaje(
        data?.message ||
          'Actividad guardada correctamente.'
      )

      setModalActividad(false)
      setEditandoActividadId(null)
      setFormularioActividad(
        formularioActividadInicial()
      )

      await cargarDatos(anio)
    } catch (guardarError) {
      setError(
        guardarError?.message ||
          'No fue posible guardar la actividad.'
      )
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarActividad(actividad) {
    const confirmar = window.confirm(
      `¿Desea eliminar la actividad ${
        texto(actividad?.codigo) ||
        texto(actividad?.actividad)
      }?`
    )

    if (!confirmar) {
      return
    }

    try {
      setGuardando(true)
      setError('')

      const data = await enviarPeticion(
        'DELETE',
        {
          accion: 'eliminar_actividad',
          id: actividad.id,
        }
      )

      mostrarMensaje(
        data?.message ||
          'Actividad eliminada correctamente.'
      )

      await cargarDatos(anio)
    } catch (eliminarError) {
      setError(
        eliminarError?.message ||
          'No fue posible eliminar la actividad.'
      )
    } finally {
      setGuardando(false)
    }
  }

  // ==========================================================
  // CORTE
  // ==========================================================

  function abrirCorte(actividad, corte) {
    setModalCorte({
      actividad,
      corte,
    })

    setFormularioCorte(
      formularioCorteInicial(corte)
    )

    setError('')
    setErroresCorte({})
  }

  function cambiarCorte(campo, valor) {
    setFormularioCorte(anterior => ({
      ...anterior,
      [campo]: valor,
    }))

    setErroresCorte(anterior => ({
      ...anterior,
      [campo]: '',
    }))
  }

  async function guardarCorte(event) {
    event.preventDefault()

    if (!modalCorte?.corte?.id) {
      return
    }

    const estado = texto(
      formularioCorte.estado
    ).toUpperCase()

    const nuevosErrores = {}

    if (!['EJECUTADA', 'PARCIAL', 'NO_EJECUTADA'].includes(estado)) {
      nuevosErrores.estado =
        'Seleccione el resultado del corte.'
    }

    // Para los tres estados dejamos una fecha obligatoria.
    // En NO EJECUTADA representa la fecha en que se realizó el seguimiento.
    if (!formularioCorte.fecha_ejecucion) {
      nuevosErrores.fecha_ejecucion =
        estado === 'NO_EJECUTADA'
          ? 'Debe registrar la fecha de seguimiento.'
          : 'Debe registrar la fecha de ejecución.'
    }

    if (
      ['EJECUTADA', 'PARCIAL'].includes(estado) &&
      !texto(formularioCorte.resultado)
    ) {
      nuevosErrores.resultado =
        estado === 'PARCIAL'
          ? 'Describa qué se realizó parcialmente.'
          : 'Describa el resultado o qué se realizó.'
    }

    if (
      ['PARCIAL', 'NO_EJECUTADA'].includes(estado) &&
      !texto(formularioCorte.observaciones)
    ) {
      nuevosErrores.observaciones =
        estado === 'PARCIAL'
          ? 'Indique qué quedó pendiente o la razón de la ejecución parcial.'
          : 'Registre la justificación de la no ejecución.'
    }

    const enlaceEvidencia =
      texto(formularioCorte.evidencia_path)

    if (
      enlaceEvidencia &&
      !/^https?:\/\//i.test(enlaceEvidencia)
    ) {
      nuevosErrores.evidencia_path =
        'Ingrese un enlace válido que inicie con http:// o https://.'
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresCorte(nuevosErrores)
      setError(
        'Revise los campos obligatorios señalados en el formulario.'
      )
      return
    }

    setErroresCorte({})

    try {
      setGuardando(true)
      setError('')

      const data = await enviarPeticion(
        'PATCH',
        {
          accion:
            'registrar_seguimiento_corte',
          corte_id:
            modalCorte.corte.id,
          estado,
          fecha_ejecucion:
            formularioCorte.fecha_ejecucion,
          resultado:
            formularioCorte.resultado,
          observaciones:
            formularioCorte.observaciones,
          evidencia_path:
            formularioCorte.evidencia_path,
          evidencia_nombre:
            formularioCorte.evidencia_nombre,
        }
      )

      mostrarMensaje(
        data?.message ||
          'Seguimiento registrado correctamente.'
      )

      setModalCorte(null)
      await cargarDatos(anio)
    } catch (guardarError) {
      setError(
        guardarError?.message ||
          'No fue posible registrar el seguimiento.'
      )
    } finally {
      setGuardando(false)
    }
  }

  // ==========================================================
  // AÑO
  // ==========================================================

  function cambiarAnio(valor) {
    const nuevoAnio = Number(valor)

    setAnio(nuevoAnio)
    setPlan(null)
    setActividades([])
    setFormularioPlan(
      formularioPlanInicial(nuevoAnio)
    )
    setModalPlan(false)
    setModalActividad(false)
    setModalDetalle(null)
    setModalCorte(null)
    setModalAprobacion(false)
    setMensaje('')
    setError('')
  }

  // ==========================================================
  // SESIÓN PENDIENTE
  // ==========================================================

  if (!user) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  const planBorrador =
    texto(plan?.estado).toUpperCase() ===
    'BORRADOR'

  const planAprobado =
    texto(plan?.estado).toUpperCase() ===
    'APROBADO'

  const planCerrado =
    texto(plan?.estado).toUpperCase() ===
    'CERRADO'

  const puedeEditarDatosPlan =
    Boolean(plan?.id) && !planCerrado

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-3 md:p-5">
      <div className="max-w-[1750px] mx-auto bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden">

        {/* ENCABEZADO */}
        <div className="bg-slate-800 text-white px-5 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <i className="fas fa-clipboard-list text-2xl mt-1"></i>

            <div>
              <h1 className="text-lg md:text-xl font-black uppercase tracking-wide">
                PESV · Plan Anual de Trabajo
              </h1>

              <p className="text-[10px] md:text-[11px] text-slate-300 mt-0.5">
                Programación y seguimiento mediante matriz mensual
              </p>

              <div className="mt-1 text-[10px] text-slate-300">
                Usuario:{' '}
                <strong className="text-white">
                  {obtenerNombreUsuario(user)}
                </strong>

                <span className="mx-1.5 text-slate-500">
                  ·
                </span>

                CEA:{' '}
                <strong className="text-white">
                  {obtenerNombreEmpresa(user)}
                </strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                router.push('/admin/pesv')
              }
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-1.5 rounded text-[10px] md:text-[11px] transition"
            >
              <i className="fas fa-arrow-left mr-1.5"></i>
              PESV
            </button>

            <button
              type="button"
              onClick={() =>
                router.push('/admin')
              }
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-1.5 rounded text-[10px] md:text-[11px] transition"
            >
              <i className="fas fa-home mr-1.5"></i>
              Menú
            </button>

            <button
              type="button"
              onClick={() =>
                cerrarSesion(router)
              }
              className="bg-[var(--danger)] hover:bg-[var(--danger-dark)] text-white px-3 py-1.5 rounded text-[10px] md:text-[11px] transition"
            >
              <i className="fas fa-sign-out-alt mr-1.5"></i>
              Salir
            </button>
          </div>
        </div>

        {/* VIGENCIA */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[11px] font-semibold text-gray-700">
              Vigencia del Plan Anual de Trabajo PESV
            </div>

            <select
              value={anio}
              onChange={event =>
                cambiarAnio(event.target.value)
              }
              className="border border-gray-300 rounded px-3 py-1.5 text-xs bg-white font-bold min-w-[95px]"
            >
              {Array.from(
                { length: 8 },
                (_, index) =>
                  anioActual - 3 + index
              ).map(item => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

            {plan?.estado && (
              <span
                className={`border rounded-full px-2.5 py-1 text-[9px] font-black ${claseEstadoPlan(
                  plan.estado
                )}`}
              >
                {plan.estado}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {plan?.id && (
              <button
                type="button"
                onClick={() => {
                  const params =
                    new URLSearchParams({
                      nit:
                        obtenerNitUsuario(user),
                      anio: String(anio),
                    })

                  router.push(
                    `/admin/pesv/plan-trabajo/documento?${params.toString()}`
                  )
                }}
                className="bg-blue-900 hover:bg-blue-950 text-white border border-blue-950 rounded px-3 py-1.5 text-[10px] font-bold transition"
              >
                <i className="fas fa-file-pdf mr-1.5"></i>
                Generar PDF
              </button>
            )}
          </div>
        </div>

        {/* MENSAJES */}
        {(error || mensaje) && (
          <div className="px-4 pt-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-[11px]">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
              </div>
            )}

            {mensaje && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-[11px]">
                <i className="fas fa-check-circle mr-2"></i>
                {mensaje}
              </div>
            )}
          </div>
        )}

        <div className="p-4">
          {cargando ? (
            <div className="py-16 text-center text-sm text-gray-500">
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Consultando Plan Anual de Trabajo PESV...
            </div>
          ) : !plan?.id ? (
            /* SIN PLAN */
            <div className="border border-dashed border-blue-300 bg-blue-50/40 rounded-xl p-8 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-xl">
                <i className="fas fa-calendar-plus"></i>
              </div>

              <h2 className="mt-4 text-sm font-black text-slate-800 uppercase">
                No existe Plan Anual para {anio}
              </h2>

              <p className="mt-2 text-[11px] text-gray-600 max-w-xl mx-auto">
                Cree los datos generales de la vigencia para comenzar a programar las actividades del PESV.
              </p>

              <button
                type="button"
                onClick={abrirCrearPlan}
                className="mt-4 bg-blue-900 hover:bg-blue-950 text-white rounded px-4 py-2 text-[10px] font-bold"
              >
                <i className="fas fa-plus mr-1.5"></i>
                Crear Plan Anual {anio}
              </button>
            </div>
          ) : (
            <div className="space-y-4">

              {/* INFORMACIÓN Y RESUMEN COMPACTOS */}
              <section className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr]">
                  <div className="bg-white px-4 py-3 border-b xl:border-b-0 xl:border-r border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-[10px] font-black uppercase text-slate-800">
                            Datos generales del Plan
                          </div>

                          <span
                            className={`border rounded-full px-2 py-0.5 text-[8px] font-black ${claseEstadoPlan(
                              plan.estado
                            )}`}
                          >
                            {plan.estado}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2">
                          <div>
                            <div className="text-[7px] font-bold uppercase text-gray-500">
                              Elaboración
                            </div>
                            <div className="text-[9px] font-bold text-gray-800">
                              {fechaVisual(plan.fecha_elaboracion)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[7px] font-bold uppercase text-gray-500">
                              Responsable
                            </div>
                            <div className="text-[9px] font-bold text-gray-800 truncate">
                              {plan.responsable_nombre || '-'}
                            </div>
                          </div>

                          <div>
                            <div className="text-[7px] font-bold uppercase text-gray-500">
                              Aprobación
                            </div>
                            <div className="text-[9px] font-bold text-gray-800">
                              {fechaVisual(plan.fecha_aprobacion)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[7px] font-bold uppercase text-gray-500">
                              Alcance
                            </div>
                            <div className="text-[8px] font-semibold text-gray-700 line-clamp-2">
                              {alcanceVisual(plan.alcance)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 border-t border-gray-100 pt-2">
                          <span className="text-[7px] font-bold uppercase text-gray-500 mr-2">
                            Objetivo general:
                          </span>
                          <span className="text-[9px] text-gray-700">
                            {plan.objetivo || '-'}
                          </span>
                        </div>
                      </div>

                      {puedeEditarDatosPlan && (
                        <div className="flex lg:flex-col gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={abrirEditarPlan}
                            className="bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-700 rounded px-2.5 py-1.5 text-[8px] font-bold"
                          >
                            <i className="fas fa-edit mr-1"></i>
                            Editar datos
                          </button>

                          {planBorrador && (
                            <button
                              type="button"
                              onClick={() => {
                                setFechaAprobacion('')
                                setError('')
                                setModalAprobacion(true)
                              }}
                              className="bg-green-700 hover:bg-green-800 text-white rounded px-2.5 py-1.5 text-[8px] font-bold"
                            >
                              <i className="fas fa-check-circle mr-1"></i>
                              Aprobar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 px-4 py-3">
                    <div className="text-[9px] font-black uppercase text-slate-700 mb-2">
                      Resumen de ejecución
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        ['Actividades', resumenGeneral.actividades, 'text-slate-800'],
                        ['Cortes', resumenGeneral.cortes, 'text-blue-900'],
                        ['Ejecutados', resumenGeneral.ejecutados, 'text-green-800'],
                        ['Pendientes', resumenGeneral.pendientes, 'text-amber-800'],
                        ['Vencidos', resumenGeneral.vencidos, 'text-orange-800'],
                      ].map(item => (
                        <div
                          key={item[0]}
                          className="bg-white border border-gray-200 rounded-lg px-1.5 py-2 text-center"
                        >
                          <div className="text-[7px] uppercase font-bold text-gray-500 truncate">
                            {item[0]}
                          </div>
                          <div className={`text-lg leading-5 font-black ${item[2]}`}>
                            {item[1]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* MATRIZ */}
              <section className="border border-blue-200 rounded-xl overflow-hidden">
                <div className="bg-blue-900 text-white px-4 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase">
                      Actividades programadas
                    </div>
                    <div className="text-[9px] text-blue-200 mt-0.5">
                      Matriz de programación y seguimiento · Actividad × ENE–DIC
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {actividadesSinCortes.length > 0 && !planCerrado && (
                      <button
                        type="button"
                        onClick={generarCortesPlan}
                        disabled={guardando}
                        className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-amber-950 border border-amber-300 rounded px-3 py-1.5 text-[9px] font-black"
                        title="Generar las tarjetas P de actividades existentes que todavía no tienen cortes"
                      >
                        <i className="fas fa-th mr-1.5"></i>
                        Habilitar matriz ({actividadesSinCortes.length})
                      </button>
                    )}

                    {planBorrador && (
                      <button
                        type="button"
                        onClick={abrirNuevaActividad}
                        className="bg-white text-blue-900 hover:bg-blue-50 border border-white rounded px-3 py-1.5 text-[10px] font-black"
                      >
                        <i className="fas fa-plus mr-1.5"></i>
                        Agregar actividad
                      </button>
                    )}
                  </div>
                </div>

                {actividadesSinCortes.length > 0 && (
                  <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-[9px] text-amber-900">
                    <i className="fas fa-info-circle mr-1.5"></i>
                    Hay <strong>{actividadesSinCortes.length}</strong> actividad(es) creadas antes de la matriz y todavía no tienen tarjetas de seguimiento. Use <strong>Habilitar matriz</strong> para generar los cortes faltantes según su indicador/periodo o su programación mensual.
                  </div>
                )}

                {/* LEYENDA */}
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex flex-wrap items-center gap-3 text-[9px]">
                  <span className="font-bold text-gray-600">
                    Estado del corte:
                  </span>
                  <span className="text-slate-700">
                    <strong>P</strong> Programada
                  </span>
                  <span className="text-green-700">
                    <strong>✓</strong> Ejecutada
                  </span>
                  <span className="text-amber-800">
                    <strong>◐</strong> Parcial
                  </span>
                  <span className="text-red-700">
                    <strong>!</strong> No ejecutada
                  </span>
                  <span className="text-orange-700">
                    <strong>V</strong> Vencida
                  </span>
                </div>

                <div className="max-h-[68vh] overflow-auto relative">
                  <table className="w-full min-w-[1500px] text-xs border-separate border-spacing-0">
                    <thead className="sticky top-0 z-30 shadow-md">
                      <tr className="bg-slate-200 border-b-2 border-slate-400 text-[9px] uppercase text-slate-800">
                        <th className="sticky left-0 z-40 bg-slate-200 px-3 py-2 text-left min-w-[340px] border-r-2 border-slate-400">
                          Actividad
                        </th>

                        <th className="px-2 py-2 text-left min-w-[180px] border-r-2 border-slate-400">
                          Responsable
                        </th>

                        {MESES.map(mes => (
                          <th
                            key={mes.numero}
                            className={`px-1 py-2 text-center min-w-[68px] ${
                              [3, 6, 9].includes(
                                mes.numero
                              )
                                ? 'border-r-2 border-slate-300'
                                : 'border-r border-gray-200'
                            }`}
                          >
                            {mes.corto}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {actividadesOrdenadas.length === 0 ? (
                        <tr>
                          <td
                            colSpan="14"
                            className="text-center py-10 text-gray-500"
                          >
                            No existen actividades programadas para {anio}.
                          </td>
                        </tr>
                      ) : (
                        actividadesOrdenadas.map(
                          actividad => {
                            const indicador =
                              actividad
                                ?.pesv_indicadores_catalogo

                            const cortes =
                              Array.isArray(
                                actividad
                                  ?.pesv_plan_trabajo_cortes
                              )
                                ? actividad
                                    .pesv_plan_trabajo_cortes
                                : []

                            const mesInicio =
                              mesNumeroFecha(
                                actividad
                                  .fecha_programada_inicio
                              )

                            const mesFin =
                              mesNumeroFecha(
                                actividad
                                  .fecha_programada_fin
                              )

                            return (
                              <tr
                                key={actividad.id}
                                className="border-b border-gray-200 hover:bg-blue-50/30"
                              >
                                <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r-2 border-slate-300 align-top">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setModalDetalle(
                                        actividad
                                      )
                                    }
                                    className="text-left group"
                                  >
                                    <div className="text-[9px] font-black text-blue-900">
                                      {actividad.codigo ||
                                        'SIN CÓDIGO'}
                                    </div>

                                    <div className="text-[10px] font-semibold text-gray-800 group-hover:text-blue-800 mt-0.5">
                                      {actividad.actividad}
                                    </div>
                                  </button>

                                  <div className="mt-1 text-[8px] text-gray-500">
                                    {fechaVisual(
                                      actividad
                                        .fecha_programada_inicio
                                    )}{' '}
                                    —{' '}
                                    {fechaVisual(
                                      actividad
                                        .fecha_programada_fin
                                    )}
                                  </div>

                                  <div className="mt-1 text-[8px] font-semibold text-indigo-700">
                                    {indicador
                                      ? `${indicador.codigo} · ${periodicidadVisual(indicador.periodicidad)}`
                                      : 'SIN META / PROGRAMACIÓN POR MESES'}
                                  </div>

                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setModalDetalle(
                                          actividad
                                        )
                                      }
                                      className="border border-gray-300 bg-gray-50 hover:bg-gray-100 rounded px-1.5 py-0.5 text-[8px] font-bold text-gray-600"
                                    >
                                      Ver
                                    </button>

                                    {planAprobado && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          abrirEditarDatosActividad(
                                            actividad
                                          )
                                        }
                                        className="border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded px-1.5 py-0.5 text-[8px] font-bold text-blue-700"
                                        title={
                                          Array.isArray(
                                            actividad?.pesv_plan_trabajo_cortes
                                          ) &&
                                          actividad.pesv_plan_trabajo_cortes.length > 0
                                            ? 'Editar responsable, recursos y observaciones'
                                            : 'Completar objetivo, meta, indicador, fechas y datos administrativos antes de habilitar la matriz'
                                        }
                                      >
                                        Editar datos
                                      </button>
                                    )}

                                    {planBorrador && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            abrirEditarActividad(
                                              actividad
                                            )
                                          }
                                          className="border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded px-1.5 py-0.5 text-[8px] font-bold text-blue-700"
                                        >
                                          Editar
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            eliminarActividad(
                                              actividad
                                            )
                                          }
                                          className="border border-red-200 bg-red-50 hover:bg-red-100 rounded px-1.5 py-0.5 text-[8px] font-bold text-red-700"
                                        >
                                          Eliminar
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>

                                <td className="px-2 py-2 border-r-2 border-slate-300 align-top text-[9px] text-gray-600">
                                  {actividad.responsable_nombre ||
                                    '-'}
                                </td>

                                {MESES.map(mes => {
                                  const corte =
                                    cortes.find(
                                      item =>
                                        Number(
                                          item?.mes
                                        ) === mes.numero
                                    )

                                  const dentroPeriodo =
                                    mesInicio &&
                                    mesFin &&
                                    mes.numero >=
                                      mesInicio &&
                                    mes.numero <= mesFin

                                  return (
                                    <td
                                      key={mes.numero}
                                      className={`px-1 py-2 text-center align-middle ${
                                        [3, 6, 9].includes(
                                          mes.numero
                                        )
                                          ? 'border-r-2 border-slate-400'
                                          : 'border-r border-slate-300'
                                      } ${
                                        dentroPeriodo &&
                                        !corte
                                          ? 'bg-blue-50/50'
                                          : ''
                                      }`}
                                    >
                                      {corte ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            abrirCorte(
                                              actividad,
                                              corte
                                            )
                                          }
                                          disabled={
                                            !planAprobado
                                          }
                                          title={`${nombreMes(
                                            mes.numero
                                          )} · ${estadoCorteVisual(
                                            corte
                                          )} · Corte ${fechaVisual(
                                            corte.fecha_corte
                                          )}`}
                                          className={`w-9 h-9 mx-auto rounded-lg border font-black text-[12px] transition ${claseCeldaCorte(
                                            corte
                                          )} ${
                                            !planAprobado
                                              ? 'cursor-default'
                                              : 'cursor-pointer'
                                          }`}
                                        >
                                          {simboloCorte(
                                            corte
                                          )}
                                        </button>
                                      ) : dentroPeriodo ? (
                                        <span
                                          className="inline-block w-5 h-1 rounded-full bg-blue-200"
                                          title="Mes comprendido dentro del periodo de ejecución; no corresponde a un corte de seguimiento."
                                        />
                                      ) : (
                                        <span className="text-gray-300">
                                          —
                                        </span>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          }
                        )
                      )}
                    </tbody>

                    {actividadesOrdenadas.length > 0 && (
                      <tfoot className="border-t-2 border-slate-300">
                        <tr className="bg-slate-50 text-[9px] font-bold">
                          <td
                            colSpan="2"
                            className="sticky left-0 bg-slate-50 px-3 py-2 text-right border-r border-gray-200 uppercase"
                          >
                            Programadas
                          </td>

                          {MESES.map(mes => (
                            <td
                              key={mes.numero}
                              className={`text-center py-2 ${
                                [3, 6, 9].includes(
                                  mes.numero
                                )
                                  ? 'border-r-2 border-slate-300'
                                  : 'border-r border-gray-200'
                              }`}
                            >
                              {
                                resumenMensual[
                                  mes.numero
                                ].programadas
                              }
                            </td>
                          ))}
                        </tr>

                        <tr className="bg-green-50 text-[9px] font-bold text-green-800">
                          <td
                            colSpan="2"
                            className="sticky left-0 bg-green-50 px-3 py-2 text-right border-r border-gray-200 uppercase"
                          >
                            Ejecutadas
                          </td>

                          {MESES.map(mes => (
                            <td
                              key={mes.numero}
                              className={`text-center py-2 ${
                                [3, 6, 9].includes(
                                  mes.numero
                                )
                                  ? 'border-r-2 border-slate-300'
                                  : 'border-r border-gray-200'
                              }`}
                            >
                              {
                                resumenMensual[
                                  mes.numero
                                ].ejecutadas
                              }
                            </td>
                          ))}
                        </tr>

                        <tr className="bg-indigo-50 text-[9px] font-black text-indigo-900">
                          <td
                            colSpan="2"
                            className="sticky left-0 bg-indigo-50 px-3 py-2 text-right border-r border-gray-200 uppercase"
                          >
                            Cumplimiento
                          </td>

                          {MESES.map(mes => {
                            const item =
                              resumenMensual[
                                mes.numero
                              ]

                            const porcentaje =
                              item.programadas > 0
                                ? (item.ejecutadas /
                                    item.programadas) *
                                  100
                                : null

                            return (
                              <td
                                key={mes.numero}
                                className={`text-center py-2 ${
                                  [3, 6, 9].includes(
                                    mes.numero
                                  )
                                    ? 'border-r-2 border-slate-300'
                                    : 'border-r border-gray-200'
                                }`}
                              >
                                {porcentaje === null
                                  ? '-'
                                  : `${porcentaje.toFixed(
                                      0
                                    )}%`}
                              </td>
                            )
                          })}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </section>

              {/* RESUMEN TRIMESTRAL */}
              <section className="border border-indigo-200 rounded-xl overflow-hidden">
                <div className="bg-indigo-900 text-white px-4 py-2.5">
                  <div className="text-[10px] font-black uppercase">
                    Resumen trimestral
                  </div>
                  <div className="text-[9px] text-indigo-200 mt-0.5">
                    Consolidación operativa del Plan Anual por actividad.
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-[10px]">
                    <thead className="bg-indigo-50 text-indigo-900">
                      <tr>
                        <th className="text-left px-4 py-2">
                          Concepto
                        </th>
                        {[1, 2, 3, 4].map(t => (
                          <th
                            key={t}
                            className="text-center px-4 py-2"
                          >
                            T{t}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-2 font-bold">
                          Programadas
                        </td>
                        {[1, 2, 3, 4].map(t => (
                          <td
                            key={t}
                            className="text-center px-4 py-2"
                          >
                            {
                              resumenTrimestral[t]
                                .programadas
                            }
                          </td>
                        ))}
                      </tr>

                      <tr className="border-t border-gray-200 bg-green-50">
                        <td className="px-4 py-2 font-bold text-green-800">
                          Ejecutadas
                        </td>
                        {[1, 2, 3, 4].map(t => (
                          <td
                            key={t}
                            className="text-center px-4 py-2 font-bold text-green-800"
                          >
                            {
                              resumenTrimestral[t]
                                .ejecutadas
                            }
                          </td>
                        ))}
                      </tr>

                      <tr className="border-t border-gray-200 bg-indigo-50">
                        <td className="px-4 py-2 font-black text-indigo-900">
                          Cumplimiento
                        </td>
                        {[1, 2, 3, 4].map(t => {
                          const item =
                            resumenTrimestral[t]

                          const porcentaje =
                            item.programadas > 0
                              ? (item.ejecutadas /
                                  item.programadas) *
                                100
                              : null

                          return (
                            <td
                              key={t}
                              className="text-center px-4 py-2 font-black text-indigo-900"
                            >
                              {porcentaje === null
                                ? '-'
                                : `${porcentaje.toFixed(
                                    2
                                  )}%`}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-200 text-[9px] text-amber-900">
                  <i className="fas fa-info-circle mr-1.5"></i>
                  Este resumen es operativo. La regla definitiva de consolidación para CPLAN_PESV se validará antes de modificar el indicador.
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================
          MODAL PLAN
      ====================================================== */}
      {modalPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-black uppercase">
                  {plan?.id
                    ? 'Editar datos generales'
                    : `Crear Plan Anual ${anio}`}
                </div>
                <div className="text-[9px] text-slate-300 mt-0.5">
                  Datos de elaboración y alcance del Plan.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalPlan(false)}
                className="w-8 h-8 rounded bg-white/10 hover:bg-white/20"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form
              onSubmit={guardarPlan}
              className="p-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Vigencia
                  </label>
                  <input
                    value={anio}
                    disabled
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs bg-gray-100"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Fecha de elaboración *
                  </label>
                  <input
                    type="date"
                    value={
                      formularioPlan.fecha_elaboracion
                    }
                    onChange={event =>
                      cambiarPlan(
                        'fecha_elaboracion',
                        event.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs bg-white"
                  />
                </div>

                <div className="md:col-span-5">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Responsable *
                  </label>
                  <select
                    value={
                      formularioPlan
                        .responsable_personal_id
                    }
                    onChange={event =>
                      cambiarPlan(
                        'responsable_personal_id',
                        event.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs bg-white"
                  >
                    <option value="">
                      Seleccione...
                    </option>

                    {personalOrdenado.map(persona => (
                      <option
                        key={persona.id}
                        value={persona.id}
                      >
                        {nombrePersonal(persona)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-12">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Alcance *
                  </label>
                  <select
                    value={formularioPlan.alcance}
                    onChange={event =>
                      cambiarPlan(
                        'alcance',
                        event.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs bg-white"
                  >
                    <option value="">
                      Seleccione...
                    </option>

                    {ALCANCES.map(item => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-12">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Objetivo general del Plan *
                  </label>
                  <textarea
                    rows="3"
                    value={formularioPlan.objetivo}
                    onChange={event =>
                      cambiarPlan(
                        'objetivo',
                        event.target.value
                      )
                    }
                    placeholder="Defina el propósito general del Plan Anual de Trabajo para esta vigencia."
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs resize-y"
                  />
                  <div className="mt-1 text-[8px] text-gray-500">
                    Este objetivo corresponde al Plan Anual y es diferente de los objetivos específicos relacionados con cada actividad.
                  </div>
                </div>

                <div className="md:col-span-12">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    rows="3"
                    value={
                      formularioPlan.observaciones
                    }
                    onChange={event =>
                      cambiarPlan(
                        'observaciones',
                        event.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs resize-y"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setModalPlan(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-4 py-2 text-[10px] font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white rounded px-4 py-2 text-[10px] font-bold"
                >
                  <i className="fas fa-save mr-1.5"></i>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL ACTIVIDAD
      ====================================================== */}
      {modalActividad && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="w-full max-w-5xl max-h-[94vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div>
                <div className="text-[11px] font-black uppercase">
                  {edicionAdministrativa
                    ? actividadEditadaTieneCortes
                      ? 'Editar datos de actividad aprobada'
                      : 'Completar programación de actividad aprobada'
                    : editandoActividadId
                      ? 'Editar actividad programada'
                      : 'Agregar actividad programada'}
                </div>
                <div className="text-[9px] text-blue-200 mt-0.5">
                  Con meta, el seguimiento se deriva del indicador. Sin meta, seleccione directamente los meses de ejecución.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalActividad(false)
                  setEdicionAdministrativa(false)
                  setActividadEditadaTieneCortes(false)
                }}
                className="w-8 h-8 rounded bg-white/10 hover:bg-white/20"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form
              onSubmit={
                edicionAdministrativa
                  ? guardarDatosAdministrativosActividad
                  : guardarActividad
              }
              className="p-4 overflow-y-auto"
            >
              {edicionAdministrativa && (
                <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[9px] text-blue-900">
                  <i
                    className={`fas ${
                      actividadEditadaTieneCortes
                        ? 'fa-lock'
                        : 'fa-edit'
                    } mr-1.5`}
                  ></i>

                  {actividadEditadaTieneCortes ? (
                    <>
                      Esta actividad ya tiene cortes de seguimiento. Puede modificar <strong>Responsable, Recursos y Observaciones</strong>; Objetivo, Meta/Indicador y programación permanecen protegidos.
                    </>
                  ) : (
                    <>
                      Esta actividad todavía <strong>no tiene cortes de seguimiento</strong>. Puede completar o corregir <strong>Objetivo, Meta/Indicador y programación</strong>, además de Responsable, Recursos y Observaciones. Después de guardar use <strong>Habilitar matriz</strong>.
                    </>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Código
                  </label>
                  <input
                    value={
                      formularioActividad.codigo
                    }
                    onChange={event =>
                      cambiarActividad(
                        'codigo',
                        event.target.value
                      )
                    }
                    disabled={edicionAdministrativa}
                    placeholder="ACT-01"
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs uppercase"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Actividad *
                  </label>
                  <input
                    value={
                      formularioActividad.actividad
                    }
                    onChange={event =>
                      cambiarActividad(
                        'actividad',
                        event.target.value
                      )
                    }
                    disabled={edicionAdministrativa}
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Responsable *
                  </label>
                  <select
                    value={
                      formularioActividad
                        .responsable_personal_id
                    }
                    onChange={event =>
                      cambiarActividad(
                        'responsable_personal_id',
                        event.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs bg-white"
                  >
                    <option value="">
                      Seleccione...
                    </option>

                    {personalOrdenado.map(persona => (
                      <option
                        key={persona.id}
                        value={persona.id}
                      >
                        {nombrePersonal(persona)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-12">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Descripción
                  </label>
                  <textarea
                    rows="2"
                    value={
                      formularioActividad.descripcion
                    }
                    onChange={event =>
                      cambiarActividad(
                        'descripcion',
                        event.target.value
                      )
                    }
                    disabled={edicionAdministrativa}
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs resize-y"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Objetivo relacionado *
                  </label>
                  <select
                    value={
                      formularioActividad.objetivo_id
                    }
                    onChange={event =>
                      cambiarObjetivoActividad(
                        event.target.value
                      )
                    }
                    disabled={
                      edicionAdministrativa &&
                      actividadEditadaTieneCortes
                    }
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs bg-white disabled:bg-gray-100"
                  >
                    <option value="">
                      Seleccione...
                    </option>

                    {objetivosOrdenados.map(objetivo => (
                      <option
                        key={objetivo.id}
                        value={objetivo.id}
                      >
                        {objetivo.codigo} -{' '}
                        {objetivo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Meta relacionada (opcional)
                  </label>
                  <select
                    value={
                      formularioActividad.meta_id
                    }
                    onChange={event =>
                      cambiarMetaActividad(
                        event.target.value
                      )
                    }
                    disabled={
                      (edicionAdministrativa &&
                        actividadEditadaTieneCortes) ||
                      !formularioActividad.objetivo_id
                    }
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs bg-white disabled:bg-gray-100"
                  >
                    <option value="">
                      Sin meta relacionada
                    </option>

                    {metasFiltradas.map(meta => (
                      <option
                        key={meta.id}
                        value={meta.id}
                      >
                        {meta.codigo} -{' '}
                        {meta.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Indicador relacionado
                  </label>

                  <select
                    value={
                      formularioActividad.indicador_id
                    }
                    disabled
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs bg-gray-100"
                  >
                    <option value="">
                      Se asigna desde la meta
                    </option>

                    {indicadores.map(indicador => (
                      <option
                        key={indicador.id}
                        value={indicador.id}
                      >
                        {indicador.codigo} -{' '}
                        {indicador.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {formularioActividad.meta_id ? (
                  <>
                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Desde *
                      </label>
                      <input
                        type="date"
                        value={formularioActividad.fecha_programada_inicio}
                        onChange={event =>
                          cambiarActividad('fecha_programada_inicio', event.target.value)
                        }
                        disabled={edicionAdministrativa && actividadEditadaTieneCortes}
                        className="w-full border border-gray-300 rounded px-2 py-2 text-xs bg-white disabled:bg-gray-100"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Hasta *
                      </label>
                      <input
                        type="date"
                        value={formularioActividad.fecha_programada_fin}
                        onChange={event =>
                          cambiarActividad('fecha_programada_fin', event.target.value)
                        }
                        disabled={edicionAdministrativa && actividadEditadaTieneCortes}
                        className="w-full border border-gray-300 rounded px-2 py-2 text-xs bg-white disabled:bg-gray-100"
                      />
                    </div>

                    <div className="md:col-span-6">
                      <div className="h-full bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                        <div className="text-[8px] uppercase font-bold text-indigo-700">
                          Seguimiento derivado del indicador
                        </div>
                        <div className="text-[11px] font-black text-indigo-900 mt-1">
                          {indicadorActividad
                            ? periodicidadVisual(indicadorActividad.periodicidad)
                            : 'Seleccione una meta'}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-12">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3">
                      <div className="text-[9px] font-black uppercase text-amber-900">
                        Mes(es) de ejecución *
                      </div>
                      <div className="text-[8px] text-amber-800 mt-1">
                        Esta actividad no tiene meta ni indicador asociado. Seleccione uno o varios meses de ejecución; no tienen que ser consecutivos.
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5 mt-3">
                        {MESES.map(mes => {
                          const seleccionado = Array.isArray(formularioActividad.meses_programados) &&
                            formularioActividad.meses_programados.includes(mes.numero)
                          return (
                            <button
                              key={mes.numero}
                              type="button"
                              disabled={edicionAdministrativa && actividadEditadaTieneCortes}
                              onClick={() => cambiarMesProgramado(mes.numero)}
                              className={`rounded border px-2 py-2 text-[9px] font-black transition disabled:opacity-60 ${
                                seleccionado
                                  ? 'bg-blue-900 border-blue-900 text-white'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50'
                              }`}
                            >
                              {mes.corto}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="md:col-span-6">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Recursos
                  </label>
                  <input
                    value={
                      formularioActividad
                        .recursos_descripcion
                    }
                    onChange={event =>
                      cambiarActividad(
                        'recursos_descripcion',
                        event.target.value
                      )
                    }
                    placeholder="Humanos, tecnológicos, físicos..."
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Presupuesto
                  </label>
                  <div className="text-[7px] text-gray-500 mb-1">
                    Se asignará desde el módulo Presupuesto PESV.
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={
                      formularioActividad.presupuesto
                    }
                    disabled
                    readOnly
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs"
                  />
                </div>

                <div className="md:col-span-12">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Observaciones de programación
                  </label>
                  <textarea
                    rows="2"
                    value={
                      formularioActividad.observaciones
                    }
                    onChange={event =>
                      cambiarActividad(
                        'observaciones',
                        event.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs resize-y"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalActividad(false)
                    setEdicionAdministrativa(false)
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-4 py-2 text-[10px] font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white rounded px-4 py-2 text-[10px] font-bold"
                >
                  <i className="fas fa-save mr-1.5"></i>
                  {edicionAdministrativa
                    ? 'Guardar datos'
                    : editandoActividadId
                      ? 'Guardar cambios'
                      : 'Agregar actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL DETALLE ACTIVIDAD
      ====================================================== */}
      {modalDetalle && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="w-full max-w-3xl max-h-[92vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black text-slate-300">
                  {modalDetalle.codigo ||
                    'SIN CÓDIGO'}
                </div>
                <div className="text-[12px] font-bold mt-0.5">
                  {modalDetalle.actividad}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModalDetalle(null)
                }
                className="w-8 h-8 rounded bg-white/10 hover:bg-white/20"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-[10px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="text-[8px] uppercase font-bold text-gray-500">
                    Periodo de ejecución
                  </div>
                  <div className="font-bold mt-1">
                    {fechaVisual(
                      modalDetalle
                        .fecha_programada_inicio
                    )}{' '}
                    —{' '}
                    {fechaVisual(
                      modalDetalle
                        .fecha_programada_fin
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-3">
                  <div className="text-[8px] uppercase font-bold text-gray-500">
                    Responsable
                  </div>
                  <div className="font-bold mt-1">
                    {modalDetalle.responsable_nombre ||
                      '-'}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-3">
                <div className="text-[8px] uppercase font-bold text-gray-500">
                  Descripción
                </div>
                <div className="mt-1 text-gray-700 whitespace-pre-wrap">
                  {modalDetalle.descripcion || '-'}
                </div>
              </div>

              <div className="border rounded-lg p-3">
                <div className="text-[8px] uppercase font-bold text-gray-500">
                  Objetivo / Meta / Indicador
                </div>
                <div className="mt-1 font-semibold text-gray-700">
                  {modalDetalle.pesv_objetivos
                    ? `${modalDetalle.pesv_objetivos.codigo} - ${modalDetalle.pesv_objetivos.nombre}`
                    : '-'}
                </div>
                <div className="mt-1 text-gray-600">
                  {modalDetalle.pesv_metas
                    ? `${modalDetalle.pesv_metas.codigo} - ${modalDetalle.pesv_metas.descripcion}`
                    : '-'}
                </div>
                <div className="mt-1 text-indigo-700 font-bold">
                  {modalDetalle
                    .pesv_indicadores_catalogo
                    ? `${modalDetalle.pesv_indicadores_catalogo.codigo} - ${modalDetalle.pesv_indicadores_catalogo.nombre} · ${periodicidadVisual(
                        modalDetalle
                          .pesv_indicadores_catalogo
                          .periodicidad
                      )}`
                    : '-'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="text-[8px] uppercase font-bold text-gray-500">
                    Recursos
                  </div>
                  <div className="mt-1">
                    {modalDetalle.recursos_descripcion ||
                      '-'}
                  </div>
                </div>

                <div className="border rounded-lg p-3">
                  <div className="text-[8px] uppercase font-bold text-gray-500">
                    Presupuesto
                  </div>
                  <div className="mt-1 font-bold">
                    {monedaVisual(
                      modalDetalle.presupuesto
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL SEGUIMIENTO CORTE
      ====================================================== */}
      {modalCorte && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="w-full max-w-3xl max-h-[94vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-green-800 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black text-green-200 uppercase">
                  Seguimiento · {nombreMes(modalCorte.corte.mes)} · T{modalCorte.corte.trimestre}
                </div>
                <div className="text-[12px] font-bold mt-0.5">
                  {modalCorte.actividad.codigo || 'SIN CÓDIGO'} · {modalCorte.actividad.actividad}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalCorte(null)
                  setErroresCorte({})
                  setError('')
                }}
                className="w-8 h-8 rounded bg-white/10 hover:bg-white/20"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form
              onSubmit={guardarCorte}
              className="p-4 overflow-y-auto"
            >
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[9px]">
                <div>
                  <div className="uppercase font-bold text-gray-500">Corte programado</div>
                  <div className="font-bold text-gray-800 mt-1">
                    {fechaVisual(modalCorte.corte.fecha_corte)}
                  </div>
                </div>
                <div>
                  <div className="uppercase font-bold text-gray-500">Estado actual</div>
                  <div className="font-bold text-gray-800 mt-1">
                    {estadoCorteVisual(modalCorte.corte)}
                  </div>
                </div>
                <div>
                  <div className="uppercase font-bold text-gray-500">Responsable</div>
                  <div className="font-bold text-gray-800 mt-1">
                    {modalCorte.actividad.responsable_nombre || '-'}
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[9px] font-semibold text-red-700">
                  <i className="fas fa-exclamation-circle mr-1.5"></i>
                  {error}
                </div>
              )}

              <div className="mb-3 text-[8px] text-gray-500">
                Los campos marcados con <strong>*</strong> son obligatorios según el resultado seleccionado.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Resultado del corte *
                  </label>
                  <select
                    value={formularioCorte.estado}
                    onChange={event =>
                      cambiarCorte('estado', event.target.value)
                    }
                    className={`w-full border rounded px-2 py-2 text-xs bg-white ${
                      erroresCorte.estado
                        ? 'border-red-500 ring-1 ring-red-200'
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="EJECUTADA">EJECUTADA</option>
                    <option value="PARCIAL">EJECUCIÓN PARCIAL</option>
                    <option value="NO_EJECUTADA">NO EJECUTADA</option>
                  </select>
                  {erroresCorte.estado && (
                    <div className="mt-1 text-[8px] font-semibold text-red-600">
                      {erroresCorte.estado}
                    </div>
                  )}
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    {formularioCorte.estado === 'NO_EJECUTADA'
                      ? 'Fecha de seguimiento *'
                      : 'Fecha de ejecución *'}
                  </label>
                  <input
                    type="date"
                    value={formularioCorte.fecha_ejecucion}
                    onChange={event =>
                      cambiarCorte('fecha_ejecucion', event.target.value)
                    }
                    className={`w-full border rounded px-2 py-2 text-xs bg-white ${
                      erroresCorte.fecha_ejecucion
                        ? 'border-red-500 ring-1 ring-red-200'
                        : 'border-gray-300'
                    }`}
                  />
                  {erroresCorte.fecha_ejecucion && (
                    <div className="mt-1 text-[8px] font-semibold text-red-600">
                      {erroresCorte.fecha_ejecucion}
                    </div>
                  )}
                </div>

                <div className="md:col-span-12">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Resultado / qué se realizó
                    {['EJECUTADA', 'PARCIAL'].includes(formularioCorte.estado)
                      ? ' *'
                      : ''}
                  </label>
                  <textarea
                    rows="3"
                    value={formularioCorte.resultado}
                    onChange={event =>
                      cambiarCorte('resultado', event.target.value)
                    }
                    disabled={formularioCorte.estado === 'NO_EJECUTADA'}
                    placeholder={
                      formularioCorte.estado === 'PARCIAL'
                        ? 'Describa qué parte de la actividad se realizó.'
                        : 'Describa el resultado obtenido o la actividad realizada.'
                    }
                    className={`w-full border rounded px-2 py-2 text-xs resize-y disabled:bg-gray-100 ${
                      erroresCorte.resultado
                        ? 'border-red-500 ring-1 ring-red-200'
                        : 'border-gray-300'
                    }`}
                  />
                  {erroresCorte.resultado && (
                    <div className="mt-1 text-[8px] font-semibold text-red-600">
                      {erroresCorte.resultado}
                    </div>
                  )}
                </div>

                <div className="md:col-span-12">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Observaciones / justificación
                    {['PARCIAL', 'NO_EJECUTADA'].includes(formularioCorte.estado)
                      ? ' *'
                      : ''}
                  </label>
                  <textarea
                    rows="3"
                    value={formularioCorte.observaciones}
                    onChange={event =>
                      cambiarCorte('observaciones', event.target.value)
                    }
                    placeholder={
                      formularioCorte.estado === 'NO_EJECUTADA'
                        ? 'Indique la razón por la cual la actividad no fue ejecutada.'
                        : formularioCorte.estado === 'PARCIAL'
                          ? 'Indique qué quedó pendiente o la razón de la ejecución parcial.'
                          : 'Observaciones adicionales (opcional).'
                    }
                    className={`w-full border rounded px-2 py-2 text-xs resize-y ${
                      erroresCorte.observaciones
                        ? 'border-red-500 ring-1 ring-red-200'
                        : 'border-gray-300'
                    }`}
                  />
                  {erroresCorte.observaciones && (
                    <div className="mt-1 text-[8px] font-semibold text-red-600">
                      {erroresCorte.observaciones}
                    </div>
                  )}
                </div>

                <div className="md:col-span-6">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Enlace de evidencia (Drive)
                  </label>
                  <input
                    type="url"
                    value={formularioCorte.evidencia_path}
                    onChange={event =>
                      cambiarCorte('evidencia_path', event.target.value)
                    }
                    placeholder="https://drive.google.com/..."
                    className={`w-full border rounded px-2 py-2 text-xs ${
                      erroresCorte.evidencia_path
                        ? 'border-red-500 ring-1 ring-red-200'
                        : 'border-gray-300'
                    }`}
                  />
                  {erroresCorte.evidencia_path ? (
                    <div className="mt-1 text-[8px] font-semibold text-red-600">
                      {erroresCorte.evidencia_path}
                    </div>
                  ) : (
                    <div className="mt-1 text-[8px] text-gray-500">
                      Opcional. Pegue el enlace del soporte almacenado en el repositorio institucional.
                    </div>
                  )}
                </div>

                <div className="md:col-span-6">
                  <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                    Nombre de evidencia
                  </label>
                  <input
                    value={formularioCorte.evidencia_nombre}
                    onChange={event =>
                      cambiarCorte('evidencia_nombre', event.target.value)
                    }
                    placeholder="Ej. Matriz de Riesgos de Seguridad Vial 2026"
                    className="w-full border border-gray-300 rounded px-2 py-2 text-xs"
                  />
                  <div className="mt-1 text-[8px] text-gray-500">
                    Opcional. Identifique claramente el documento asociado al seguimiento.
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalCorte(null)
                    setErroresCorte({})
                    setError('')
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-4 py-2 text-[10px] font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded px-4 py-2 text-[10px] font-bold"
                >
                  <i className="fas fa-save mr-1.5"></i>
                  {guardando ? 'Guardando...' : 'Guardar seguimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL APROBACIÓN
      ====================================================== */}
      {modalAprobacion && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-green-800 text-white px-4 py-3">
              <div className="text-[11px] font-black uppercase">
                Aprobar Plan Anual
              </div>
              <div className="text-[9px] text-green-100 mt-0.5">
                Después de aprobarlo, la programación de actividades quedará protegida.
              </div>
            </div>

            <form
              onSubmit={aprobarPlan}
              className="p-4"
            >
              <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                Fecha de aprobación *
              </label>

              <input
                type="date"
                value={fechaAprobacion}
                onChange={event =>
                  setFechaAprobacion(
                    event.target.value
                  )
                }
                className="w-full border border-gray-300 rounded px-2 py-2 text-xs bg-white"
              />

              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-[9px] mt-3">
                <i className="fas fa-lock mr-1.5"></i>
                Verifique las actividades, responsables, periodos e indicadores antes de aprobar.
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() =>
                    setModalAprobacion(false)
                  }
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-4 py-2 text-[10px] font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded px-4 py-2 text-[10px] font-bold"
                >
                  <i className="fas fa-check-circle mr-1.5"></i>
                  Aprobar Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
