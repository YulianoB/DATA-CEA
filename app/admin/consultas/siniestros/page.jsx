// app/admin/consultas/siniestros/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  Toaster,
  toast,
} from 'sonner'

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import { BotonAccion, ESTILO_SECCIONES, ESTILO_ENCABEZADO_TABLA, ESTILO_CELDAS_TABLA } from '@/components/admin/EstiloModulo'
import { CarFront, ClipboardList } from 'lucide-react'

import {
  cerrarSesion,
} from '@/lib/auth/logout'

// ============================================================
// CONSTANTES
// app/admin/consultas/siniestros/page.jsx
// ============================================================

const PAGE_SIZE = 50

const ESTADOS_BANDEJA = [
  {
    valor: 'PENDIENTE',
    titulo: 'Pendientes',
    icono: 'fa-clock',
  },
  {
    valor: 'EN ANÁLISIS',
    titulo: 'En análisis',
    icono: 'fa-magnifying-glass',
  },
  {
    valor: 'CERRADO',
    titulo: 'Cerrados',
    icono: 'fa-circle-check',
  },
  {
    valor: 'TODOS',
    titulo: 'Todos',
    icono: 'fa-list',
  },
]

const RESUMEN_VACIO = {
  total_siniestros: 0,
  pendientes: 0,
  en_analisis: 0,
  cerrados: 0,
  personas_involucradas: 0,
  heridos_leves: 0,
  heridos_graves: 0,
  fatalidades: 0,
  vehiculos_involucrados: 0,
  costos: {
    total_directo: 0,
    total_indirecto: 0,
    total_general: 0,
  },
}

// ============================================================
// HELPERS GENERALES
// app/admin/consultas/siniestros/page.jsx
// ============================================================

function normalizarTexto(valor) {
  return String(valor ?? '').trim()
}

function obtenerNitEmpresa(user) {
  return normalizarTexto(
    user?.nitEmpresa ||
    user?.nit_empresa ||
    user?.empresa?.nit ||
    user?.nit ||
    localStorage.getItem('currentEmpresaNit')
  )
}

function obtenerResponsable(user) {
  return normalizarTexto(
    user?.nombreCompleto ||
    user?.nombre_completo ||
    user?.usuario ||
    user?.documento ||
    'ADMINISTRADOR'
  )
}

function hoyBogota() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Bogota',
    }
  ).format(new Date())
}

function mesActualBogota() {
  return Number(
    new Intl.DateTimeFormat(
      'en-CA',
      {
        month: '2-digit',
        timeZone: 'America/Bogota',
      }
    ).format(new Date())
  )
}

function normEstado(valor) {
  return String(valor || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function fmt(valor) {
  return Number(valor || 0).toLocaleString(
    'es-CO',
    {
      maximumFractionDigits: 0,
    }
  )
}

function fmtCOP(valor) {
  return Number(valor || 0).toLocaleString(
    'es-CO',
    {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }
  )
}

function formatearFecha(valor) {
  const texto = normalizarTexto(valor)

  if (!texto) {
    return '-'
  }

  const partes = texto.slice(0, 10).split('-')

  if (partes.length !== 3) {
    return texto
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function formatearFechaExcel(valor) {
  const texto = normalizarTexto(valor)

  if (!texto) {
    return ''
  }

  return formatearFecha(texto)
}

function obtenerTextoAfectacion(row) {
  const fatalidades = Number(row?.fatalidades || 0)
  const graves = Number(row?.heridos_graves || 0)
  const leves = Number(row?.heridos_leves || 0)

  const partes = []

  if (fatalidades > 0) {
    partes.push(`${fatalidades} fatalidad${fatalidades === 1 ? '' : 'es'}`)
  }

  if (graves > 0) {
    partes.push(`${graves} grave${graves === 1 ? '' : 's'}`)
  }

  if (leves > 0) {
    partes.push(`${leves} leve${leves === 1 ? '' : 's'}`)
  }

  if (partes.length === 0) {
    return 'Choque simple'
  }

  return partes.join(' · ')
}

function obtenerConteoEstado(resumen, estado) {
  if (estado === 'PENDIENTE') {
    return Number(resumen?.pendientes || 0)
  }

  if (estado === 'EN ANÁLISIS') {
    return Number(resumen?.en_analisis || 0)
  }

  if (estado === 'CERRADO') {
    return Number(resumen?.cerrados || 0)
  }

  return Number(resumen?.total_siniestros || 0)
}

async function leerRespuestaApi(response) {
  const contentType =
    response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    const texto = await response.text()

    console.error(
      'Respuesta no JSON:',
      texto.slice(0, 500)
    )

    throw new Error(
      `La API respondió contenido no JSON. HTTP ${response.status}`
    )
  }

  const data = await response.json()

  if (
    !response.ok ||
    data?.status !== 'success'
  ) {
    throw new Error(
      data?.message ||
      `Error HTTP ${response.status}`
    )
  }

  return data
}

// ============================================================
// TRIMESTRES
// app/admin/consultas/siniestros/page.jsx
// ============================================================

function rangoTrimestre(anio, trimestre) {
  const year = Number(anio)
  const quarter = Number(trimestre)

  if (quarter === 1) {
    return {
      desde: `${year}-01-01`,
      hasta: `${year}-03-31`,
      nombre: 'I trimestre',
    }
  }

  if (quarter === 2) {
    return {
      desde: `${year}-04-01`,
      hasta: `${year}-06-30`,
      nombre: 'II trimestre',
    }
  }

  if (quarter === 3) {
    return {
      desde: `${year}-07-01`,
      hasta: `${year}-09-30`,
      nombre: 'III trimestre',
    }
  }

  return {
    desde: `${year}-10-01`,
    hasta: `${year}-12-31`,
    nombre: 'IV trimestre',
  }
}

function obtenerUltimoTrimestreCerrado() {
  const hoy = hoyBogota()
  const anioActual = Number(hoy.slice(0, 4))
  const mesActual = mesActualBogota()
  const trimestreActual = Math.ceil(mesActual / 3)

  if (trimestreActual === 1) {
    return {
      anio: anioActual - 1,
      trimestre: 4,
    }
  }

  return {
    anio: anioActual,
    trimestre: trimestreActual - 1,
  }
}

// ============================================================
// EVIDENCIA SUPERINTENDENCIA
// app/admin/consultas/siniestros/page.jsx
//
// Se genera una fila por nivel de pérdida presente.
// Si no existen fatalidades ni heridos, se registra
// como Choque simple.
// ============================================================

function construirFilasEvidencia(registros) {
  const filas = []

  for (const row of registros || []) {
    const comun = {
      fecha_siniestro: row?.fecha_siniestro || '',
      placa: row?.placa || '',
      conductor: row?.nombre_conductor_implicado || '',
      documento: row?.documento || '',
      ipat: row?.numero_ipat || '',
      autoridad: row?.autoridad || '',
      fecha_comite: row?.fecha_comite_analisis || '',
    }

    const fatalidades = Number(row?.fatalidades || 0)
    const graves = Number(row?.heridos_graves || 0)
    const leves = Number(row?.heridos_leves || 0)

    if (fatalidades > 0) {
      filas.push({
        ...comun,
        nivel_perdida: 'Fatalidad',
        personas_nivel: fatalidades,
      })
    }

    if (graves > 0) {
      filas.push({
        ...comun,
        nivel_perdida: 'Heridos graves',
        personas_nivel: graves,
      })
    }

    if (leves > 0) {
      filas.push({
        ...comun,
        nivel_perdida: 'Heridos leves',
        personas_nivel: leves,
      })
    }

    if (
      fatalidades === 0 &&
      graves === 0 &&
      leves === 0
    ) {
      filas.push({
        ...comun,
        nivel_perdida: 'Choque simple',
        personas_nivel: Number(row?.num_personas_involucradas || 0),
      })
    }
  }

  return filas
}

// ============================================================
// CHIP ESTADO
// app/admin/consultas/siniestros/page.jsx
// ============================================================

function EstadoChip({ estado }) {
  const normalizado = normEstado(estado)

  let color =
    'bg-gray-100 text-gray-700 border-gray-300'

  if (normalizado === 'CERRADO') {
    color =
      'bg-green-100 text-green-700 border-green-300'
  }

  if (normalizado === 'EN ANALISIS') {
    color =
      'bg-blue-100 text-blue-700 border-blue-300'
  }

  if (normalizado === 'PENDIENTE') {
    color =
      'bg-amber-100 text-amber-700 border-amber-300'
  }

  return (
    <span
      className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-semibold whitespace-nowrap ${color}`}
    >
      {estado || '-'}
    </span>
  )
}

// ============================================================
// TARJETA DE ESTADO
// app/admin/consultas/siniestros/page.jsx
// ============================================================

// ============================================================
// DATO DE EXPEDIENTE
// app/admin/consultas/siniestros/page.jsx
// ============================================================

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
        {etiqueta}
      </p>

      <p className="text-sm text-gray-800 font-medium break-words mt-1">
        {valor || '-'}
      </p>
    </div>
  )
}

// ============================================================
// PÁGINA
// app/admin/consultas/siniestros/page.jsx
// ============================================================

export default function SiniestrosPage() {
  const router = useRouter()

  // ==========================================================
  // SESIÓN
  // ==========================================================

  const [user, setUser] = useState(null)
  const [nitActual, setNitActual] = useState('')

  // ==========================================================
  // BANDEJA
  // ==========================================================

  const [estadoActual, setEstadoActual] = useState('PENDIENTE')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPagesApi, setTotalPagesApi] = useState(1)
  const [resumen, setResumen] = useState(RESUMEN_VACIO)

  // ==========================================================
  // DRAWER
  // ==========================================================

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rowSel, setRowSel] = useState(null)
  const [changingState, setChangingState] = useState(false)
  const [closing, setClosing] = useState(false)
  const [savingActa, setSavingActa] = useState(false)
  const [loadingActa, setLoadingActa] = useState(false)
  const [savingTreatment, setSavingTreatment] = useState(false)
  const [pasoAnalisisGuardado, setPasoAnalisisGuardado] = useState(false)
  const [pasoCostosGuardado, setPasoCostosGuardado] = useState(false)

  // ==========================================================
  // CAMPOS DE ANÁLISIS Y CIERRE
  // ==========================================================

  const [numIpat, setNumIpat] = useState('')
  const [autoridad, setAutoridad] = useState('')
  const [resumenAnalisis, setResumenAnalisis] = useState('')

  const [acta, setActa] = useState(null)
  const [fechaActa, setFechaActa] = useState('')
  const [tratamientoRealizado, setTratamientoRealizado] = useState('')
  const [accionesPreventivas, setAccionesPreventivas] = useState('')
  const [acuerdosCompromisos, setAcuerdosCompromisos] = useState('')
  const [responsablesCompromisos, setResponsablesCompromisos] = useState('')
  const [fechaSeguimiento, setFechaSeguimiento] = useState('')
  const [participantesTexto, setParticipantesTexto] = useState('')
  const [observacionesActa, setObservacionesActa] = useState('')

  const [costo, setCosto] = useState({
    dirChoque: '',
    indChoque: '',
    dirLeves: '',
    indLeves: '',
    dirGraves: '',
    indGraves: '',
    dirFatal: '',
    indFatal: '',
  })

  // ==========================================================
  // EVIDENCIA TRIMESTRAL
  // ==========================================================

  const trimestreInicial = useMemo(
    () => obtenerUltimoTrimestreCerrado(),
    []
  )

  const [anioExport, setAnioExport] = useState(
    trimestreInicial.anio
  )

  const [trimestreExport, setTrimestreExport] = useState(
    trimestreInicial.trimestre
  )

  const [exporting, setExporting] = useState(false)

  const periodoExport = useMemo(
    () => rangoTrimestre(
      anioExport,
      trimestreExport
    ),
    [
      anioExport,
      trimestreExport,
    ]
  )

  const aniosDisponibles = useMemo(
    () => {
      const actual = Number(
        hoyBogota().slice(0, 4)
      )

      const inicio = 2024
      const lista = []

      for (
        let anio = actual;
        anio >= inicio;
        anio -= 1
      ) {
        lista.push(anio)
      }

      return lista
    },
    []
  )

  // ==========================================================
  // SESIÓN
  // app/admin/consultas/siniestros/page.jsx
  // ==========================================================

  useEffect(
    () => {
      const stored =
        localStorage.getItem('currentUser')

      if (!stored) {
        router.push('/login')
        return
      }

      try {
        const parsed = JSON.parse(stored)
        const nit = obtenerNitEmpresa(parsed)

        if (!nit) {
          toast.error(
            'No se encontró la empresa asociada a la sesión.'
          )
          return
        }

        setUser(parsed)
        setNitActual(nit)
      } catch (error) {
        console.error(
          'Error leyendo sesión:',
          error
        )

        localStorage.removeItem('currentUser')
        router.push('/login')
      }
    },
    [router]
  )

  // ==========================================================
  // CONSULTAR BANDEJA POR ESTADO
  // app/admin/consultas/siniestros/page.jsx
  // API: /api/admin/consultas/siniestros?recurso=consulta
  // ==========================================================

  const consultarEstado = async (
    estado = estadoActual,
    goToPage = 1,
    mostrarMensaje = true
  ) => {
    if (!nitActual) {
      return
    }

    setLoading(true)

    if (mostrarMensaje) {
      setStatus('Consultando siniestros...')
    }

    try {
      const params = new URLSearchParams({
        nit: nitActual,
        recurso: 'consulta',
        estado,
        pagina: String(goToPage),
        page_size: String(PAGE_SIZE),
      })

      const response = await fetch(
        `/api/admin/consultas/siniestros?${params.toString()}`,
        {
          cache: 'no-store',
        }
      )

      const result = await leerRespuestaApi(response)

      setEstadoActual(estado)
      setData(
        Array.isArray(result?.registros)
          ? result.registros
          : []
      )

      const paginacion = result?.paginacion || {}

      setPage(
        Number(
          paginacion?.pagina || goToPage
        )
      )

      setTotal(
        Number(
          paginacion?.total || 0
        )
      )

      setTotalPagesApi(
        Number(
          paginacion?.total_paginas || 1
        )
      )

      setResumen(
        result?.resumen || RESUMEN_VACIO
      )

      if (mostrarMensaje) {
        setStatus(
          `${Number(paginacion?.total || 0).toLocaleString('es-CO')} ${Number(paginacion?.total || 0) === 1 ? 'registro' : 'registros'} ${estado === 'TODOS' ? 'en total' : `en estado ${({ PENDIENTE: 'pendientes', 'EN ANÁLISIS': 'en análisis', CERRADO: 'cerrados' })[estado] || estado.toLowerCase()}`}.`
        )
      }
    } catch (error) {
      console.error(
        'Error consultando siniestros:',
        error
      )

      setData([])
      setTotal(0)
      setTotalPagesApi(1)
      setStatus(
        `❌ ${
          error?.message ||
          'Error al consultar siniestros.'
        }`
      )

      toast.error(
        error?.message ||
        'Error al consultar siniestros.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ==========================================================
  // CARGA INICIAL: PENDIENTES
  // app/admin/consultas/siniestros/page.jsx
  // ==========================================================

  useEffect(
    () => {
      if (!nitActual) {
        return
      }

      consultarEstado(
        'PENDIENTE',
        1,
        false
      )
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [nitActual]
  )

  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const totalPages = Math.max(
    1,
    Number(
      totalPagesApi ||
      Math.ceil(total / PAGE_SIZE) ||
      1
    )
  )

  // ==========================================================
  // ABRIR EXPEDIENTE
  // app/admin/consultas/siniestros/page.jsx
  // ==========================================================

  const cargarActa = async row => {
    if (!row?.id || !nitActual) return

    setLoadingActa(true)

    try {
      const params = new URLSearchParams({
        nit: nitActual,
        recurso: 'acta',
        id: String(row.id),
      })

      const response = await fetch(
        `/api/admin/consultas/siniestros?${params.toString()}`,
        { cache: 'no-store' }
      )

      const result = await leerRespuestaApi(response)
      const existente = result?.acta || null

      setActa(existente)
      setFechaActa(existente?.fecha_acta || hoyBogota())
      setTratamientoRealizado(existente?.tratamiento_realizado || '')
      setAccionesPreventivas(existente?.acciones_preventivas || '')
      setAcuerdosCompromisos(existente?.acuerdos_compromisos || '')
      setResponsablesCompromisos(existente?.responsables_compromisos || '')
      setFechaSeguimiento(existente?.fecha_seguimiento || '')
      setObservacionesActa(existente?.observaciones || '')

      const nombres = Array.isArray(existente?.participantes)
        ? existente.participantes
            .map(item => {
              if (typeof item === 'string') return item
              const partes = [item?.nombre, item?.cargo].filter(Boolean)
              return partes.join(' - ')
            })
            .filter(Boolean)
            .join('\n')
        : ''

      setParticipantesTexto(nombres)
    } catch (error) {
      console.error('Error consultando acta:', error)
      toast.error(error?.message || 'No fue posible consultar el acta.')
    } finally {
      setLoadingActa(false)
    }
  }

  const abrirSeguimiento = row => {
    setRowSel(row)
    setNumIpat(row?.numero_ipat || '')
    setAutoridad(row?.autoridad || '')
    setResumenAnalisis(row?.resumen_analisis || '')

    setCosto({
      dirChoque: String(row?.costo_dir_choque_simple ?? ''),
      indChoque: String(row?.costo_indi_choque_simple ?? ''),
      dirLeves: String(row?.costo_dir_heridos_l ?? ''),
      indLeves: String(row?.costo_indi_heridos_l ?? ''),
      dirGraves: String(row?.costo_dir_heridos_g ?? ''),
      indGraves: String(row?.costo_indi_heridos_g ?? ''),
      dirFatal: String(row?.costo_dir_fatalidad ?? ''),
      indFatal: String(row?.costo_indi_fatalidad ?? ''),
    })

    setActa(null)
    setFechaActa(hoyBogota())
    setTratamientoRealizado('')
    setAccionesPreventivas('')
    setAcuerdosCompromisos('')
    setResponsablesCompromisos('')
    setFechaSeguimiento('')
    setParticipantesTexto('')
    setObservacionesActa('')

    setPasoAnalisisGuardado(
      Boolean(normalizarTexto(row?.resumen_analisis))
    )

    const camposCosto = [
      'costo_dir_choque_simple',
      'costo_indi_choque_simple',
      'costo_dir_heridos_l',
      'costo_indi_heridos_l',
      'costo_dir_heridos_g',
      'costo_indi_heridos_g',
      'costo_dir_fatalidad',
      'costo_indi_fatalidad',
    ]

    setPasoCostosGuardado(
      camposCosto.every(campo =>
        row?.[campo] !== null &&
        row?.[campo] !== undefined
      )
    )

    setDrawerOpen(true)
    cargarActa(row)
  }

  const cerrarDrawer = () => {
    if (
      closing ||
      changingState ||
      savingActa
    ) {
      return
    }

    setDrawerOpen(false)
    setRowSel(null)
  }

  // ==========================================================
  // ESTADO DERIVADO DEL EXPEDIENTE
  // ==========================================================

  const estadoRow = normEstado(
    rowSel?.estado_analisis
  )

  const esPendiente =
    estadoRow === 'PENDIENTE'

  const esAnalisis =
    estadoRow === 'EN ANALISIS'

  const esCerrado =
    estadoRow === 'CERRADO'

  const puedeEditar =
    esAnalisis && !esCerrado

  // ==========================================================
  // TOTALES DE COSTOS EN EL DRAWER
  // ==========================================================

  const totalesCostos = useMemo(
    () => {
      const n = valor => {
        const numero = Number(valor || 0)
        return Number.isFinite(numero)
          ? numero
          : 0
      }

      const directo =
        n(costo.dirChoque) +
        n(costo.dirLeves) +
        n(costo.dirGraves) +
        n(costo.dirFatal)

      const indirecto =
        n(costo.indChoque) +
        n(costo.indLeves) +
        n(costo.indGraves) +
        n(costo.indFatal)

      return {
        directo,
        indirecto,
        total: directo + indirecto,
      }
    },
    [costo]
  )

  // ==========================================================
  // MARCAR EN ANÁLISIS
  // app/admin/consultas/siniestros/page.jsx
  // API PATCH: accion=marcar_en_analisis
  // ==========================================================

  const marcarEnAnalisis = async () => {
    if (
      !rowSel?.id ||
      !nitActual ||
      changingState
    ) {
      return
    }

    setChangingState(true)

    try {
      const response = await fetch(
        '/api/admin/consultas/siniestros',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-cea-nit': nitActual,
          },
          body: JSON.stringify({
            nit: nitActual,
            accion: 'marcar_en_analisis',
            id: rowSel.id,
            responsable: obtenerResponsable(user),
          }),
        }
      )

      const result = await leerRespuestaApi(response)

      setRowSel(result.registro)
      setPasoAnalisisGuardado(false)
      setPasoCostosGuardado(false)

      toast.success(
        'Siniestro marcado EN ANÁLISIS.'
      )

      await consultarEstado(
        estadoActual,
        page,
        false
      )
    } catch (error) {
      console.error(
        'Error cambiando estado:',
        error
      )

      toast.error(
        error?.message ||
        'No fue posible cambiar el estado.'
      )
    } finally {
      setChangingState(false)
    }
  }

  // ==========================================================
  // VALIDAR COSTOS
  // app/admin/consultas/siniestros/page.jsx
  // ==========================================================

  const validarCostos = () => {
    const campos = [
      ['Choque simple - directo', costo.dirChoque],
      ['Choque simple - indirecto', costo.indChoque],
      ['Heridos leves - directo', costo.dirLeves],
      ['Heridos leves - indirecto', costo.indLeves],
      ['Heridos graves - directo', costo.dirGraves],
      ['Heridos graves - indirecto', costo.indGraves],
      ['Fatalidades - directo', costo.dirFatal],
      ['Fatalidades - indirecto', costo.indFatal],
    ]

    for (const [nombre, valor] of campos) {
      const numero = Number(valor || 0)

      if (
        !Number.isFinite(numero) ||
        numero < 0
      ) {
        toast.warning(
          `${nombre}: el valor debe ser mayor o igual a cero.`
        )
        return false
      }
    }

    return true
  }

  // ==========================================================
  // CERRAR SINIESTRO
  // app/admin/consultas/siniestros/page.jsx
  // API PATCH: accion=cerrar_siniestro
  // ==========================================================

  const payloadTratamiento = () => ({
    nit: nitActual,
    accion: 'guardar_tratamiento',
    id: rowSel.id,
    responsable: obtenerResponsable(user),
    numero_ipat: normalizarTexto(numIpat),
    autoridad: normalizarTexto(autoridad),
    resumen_analisis: normalizarTexto(resumenAnalisis),
    costo_dir_choque_simple: Number(costo.dirChoque || 0),
    costo_indi_choque_simple: Number(costo.indChoque || 0),
    costo_dir_heridos_l: Number(costo.dirLeves || 0),
    costo_indi_heridos_l: Number(costo.indLeves || 0),
    costo_dir_heridos_g: Number(costo.dirGraves || 0),
    costo_indi_heridos_g: Number(costo.indGraves || 0),
    costo_dir_fatalidad: Number(costo.dirFatal || 0),
    costo_indi_fatalidad: Number(costo.indFatal || 0),
  })

  const guardarAnalisisYContinuar = async () => {
    if (!rowSel?.id || !nitActual || savingTreatment) return

    if (!normalizarTexto(resumenAnalisis)) {
      toast.warning('Debe registrar el análisis o tratamiento realizado antes de continuar.')
      return
    }

    setSavingTreatment(true)
    try {
      const response = await fetch('/api/admin/consultas/siniestros', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-cea-nit': nitActual,
        },
        body: JSON.stringify(payloadTratamiento()),
      })
      const result = await leerRespuestaApi(response)
      if (result?.registro) setRowSel(result.registro)
      setPasoAnalisisGuardado(true)
      toast.success('Análisis guardado. Continúe con los costos asociados.')
    } catch (error) {
      toast.error(error?.message || 'No fue posible guardar el análisis.')
    } finally {
      setSavingTreatment(false)
    }
  }

  const guardarCostosYContinuar = async () => {
    if (!rowSel?.id || !nitActual || savingTreatment) return
    if (!validarCostos()) return

    setSavingTreatment(true)
    try {
      const response = await fetch('/api/admin/consultas/siniestros', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-cea-nit': nitActual,
        },
        body: JSON.stringify(payloadTratamiento()),
      })
      const result = await leerRespuestaApi(response)
      if (result?.registro) setRowSel(result.registro)
      setPasoCostosGuardado(true)
      toast.success('Costos guardados. Ya puede elaborar el acta de tratamiento.')
    } catch (error) {
      toast.error(error?.message || 'No fue posible guardar los costos.')
    } finally {
      setSavingTreatment(false)
    }
  }

  const abrirPdfActa = () => {
    if (!rowSel?.id || !nitActual || acta?.estado !== 'FINALIZADA') {
      toast.warning('El PDF estará disponible cuando el acta se encuentre FINALIZADA.')
      return
    }

    const params = new URLSearchParams({ nit: nitActual })
    window.open(
      `/admin/consultas/siniestros/acta/${rowSel.id}?${params.toString()}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  const participantesActa = () =>
    participantesTexto
      .split('\n')
      .map(linea => normalizarTexto(linea))
      .filter(Boolean)
      .map(linea => {
        const partes = linea.split(' - ')
        return {
          nombre: normalizarTexto(partes[0]),
          cargo: normalizarTexto(partes.slice(1).join(' - ')) || null,
        }
      })

  const construirPayloadActa = accion => ({
    nit: nitActual,
    accion,
    id: rowSel.id,
    responsable: obtenerResponsable(user),
    numero_ipat: normalizarTexto(numIpat),
    autoridad: normalizarTexto(autoridad),
    resumen_analisis: normalizarTexto(resumenAnalisis),
    costo_dir_choque_simple: Number(costo.dirChoque || 0),
    costo_indi_choque_simple: Number(costo.indChoque || 0),
    costo_dir_heridos_l: Number(costo.dirLeves || 0),
    costo_indi_heridos_l: Number(costo.indLeves || 0),
    costo_dir_heridos_g: Number(costo.dirGraves || 0),
    costo_indi_heridos_g: Number(costo.indGraves || 0),
    costo_dir_fatalidad: Number(costo.dirFatal || 0),
    costo_indi_fatalidad: Number(costo.indFatal || 0),
    fecha_acta: fechaActa,
    tratamiento_realizado: normalizarTexto(tratamientoRealizado),
    acciones_preventivas: normalizarTexto(accionesPreventivas),
    acuerdos_compromisos: normalizarTexto(acuerdosCompromisos),
    responsables_compromisos: normalizarTexto(responsablesCompromisos),
    fecha_seguimiento: fechaSeguimiento || null,
    participantes: participantesActa(),
    observaciones: normalizarTexto(observacionesActa),
  })

  const guardarBorradorActa = async () => {
    if (!rowSel?.id || !nitActual || savingActa) return

    if (!esAnalisis) {
      toast.warning('El siniestro debe estar EN ANÁLISIS para elaborar el acta.')
      return
    }

    if (!validarCostos()) return

    setSavingActa(true)

    try {
      const response = await fetch('/api/admin/consultas/siniestros', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-cea-nit': nitActual,
        },
        body: JSON.stringify(construirPayloadActa('guardar_acta')),
      })

      const result = await leerRespuestaApi(response)
      setActa(result?.acta || null)
      if (result?.registro) setRowSel(result.registro)
      toast.success('Borrador del acta guardado correctamente.')
    } catch (error) {
      console.error('Error guardando acta:', error)
      toast.error(error?.message || 'No fue posible guardar el acta.')
    } finally {
      setSavingActa(false)
    }
  }

  const finalizarActa = async () => {
    if (!rowSel?.id || !nitActual || closing) return

    if (!esAnalisis) {
      toast.warning('El siniestro debe estar EN ANÁLISIS antes de finalizar el acta.')
      return
    }

    if (!fechaActa) {
      toast.warning('Debe registrar la fecha del acta.')
      return
    }

    if (!normalizarTexto(tratamientoRealizado)) {
      toast.warning('Debe registrar el tratamiento realizado.')
      return
    }

    if (!normalizarTexto(accionesPreventivas)) {
      toast.warning('Debe registrar las acciones preventivas.')
      return
    }

    if (!normalizarTexto(acuerdosCompromisos)) {
      toast.warning('Debe registrar los acuerdos y compromisos.')
      return
    }

    if (participantesActa().length === 0) {
      toast.warning('Debe registrar al menos un participante.')
      return
    }

    if (!validarCostos()) return

    setClosing(true)

    try {
      const response = await fetch('/api/admin/consultas/siniestros', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-cea-nit': nitActual,
        },
        body: JSON.stringify(construirPayloadActa('finalizar_acta')),
      })

      const result = await leerRespuestaApi(response)
      setActa(result?.acta || acta)
      if (result?.registro) setRowSel(result.registro)

      toast.success('Acta finalizada y siniestro cerrado correctamente.')

      await consultarEstado(estadoActual, page, false)
    } catch (error) {
      console.error('Error finalizando acta:', error)
      toast.error(error?.message || 'No fue posible finalizar el acta.')
    } finally {
      setClosing(false)
    }
  }

  // ==========================================================
  // EXPORTAR EVIDENCIA TRIMESTRAL A EXCEL
  // app/admin/consultas/siniestros/page.jsx
  // API GET: recurso=exportar
  //
  // La exportación NO filtra por estado administrativo.
  // Incluye todos los siniestros cuya fecha_siniestro
  // pertenece al trimestre seleccionado.
  // ==========================================================

  const exportarEvidenciaExcel = async () => {
    if (
      !nitActual ||
      exporting
    ) {
      return
    }

    if (periodoExport.hasta > hoyBogota()) {
      toast.warning(
        'El trimestre seleccionado todavía no ha finalizado. Seleccione un trimestre cerrado.'
      )
      return
    }

    setExporting(true)

    try {
      const params = new URLSearchParams({
        nit: nitActual,
        recurso: 'exportar',
        fecha_inicio: periodoExport.desde,
        fecha_fin: periodoExport.hasta,
      })

      const response = await fetch(
        `/api/admin/consultas/siniestros?${params.toString()}`,
        {
          cache: 'no-store',
        }
      )

      const result = await leerRespuestaApi(response)

      const registros = Array.isArray(result?.registros)
        ? result.registros
        : []

      const filasEvidencia =
        registros.length > 0
          ? construirFilasEvidencia(registros)
          : []

      const ExcelJSImport = await import('exceljs')
      const ExcelJS = ExcelJSImport.default || ExcelJSImport
      const fileSaver = await import('file-saver')
      const saveAs = fileSaver.saveAs || fileSaver.default

      const workbook = new ExcelJS.Workbook()

      workbook.creator = 'CEA - PESV'
      workbook.created = new Date()

      // ======================================================
      // HOJA 1: EVIDENCIA SOLICITADA
      // ======================================================

      const evidencia = workbook.addWorksheet(
        'Registro vehículos siniestrados'
      )

      evidencia.mergeCells('A1:I1')
      evidencia.getCell('A1').value =
        'REGISTRO DE VEHÍCULOS SINIESTRADOS'
      evidencia.getCell('A1').font = {
        bold: true,
        size: 14,
      }
      evidencia.getCell('A1').alignment = {
        horizontal: 'center',
        vertical: 'middle',
      }
      evidencia.getRow(1).height = 24

      evidencia.mergeCells('A2:I2')
      evidencia.getCell('A2').value =
        `${periodoExport.nombre.toUpperCase()} ${anioExport} · ${formatearFecha(periodoExport.desde)} al ${formatearFecha(periodoExport.hasta)}`
      evidencia.getCell('A2').alignment = {
        horizontal: 'center',
      }
      evidencia.getCell('A2').font = {
        italic: true,
      }

      evidencia.mergeCells('A3:I3')
      evidencia.getCell('A3').value =
        normalizarTexto(result?.empresa?.nombre)
          ? `${result.empresa.nombre} · NIT ${result?.empresa?.nit || nitActual}`
          : `NIT ${result?.empresa?.nit || nitActual}`
      evidencia.getCell('A3').alignment = {
        horizontal: 'center',
      }

      const encabezados = [
        'Fecha del siniestro',
        'Nivel de pérdida',
        'Número de personas implicadas por cada nivel',
        'Placa del vehículo implicado de la empresa',
        'Nombre del conductor implicado de la empresa',
        'Identificación del conductor implicado de la empresa',
        'Consecutivo IPAT en el RNAT del RUNT',
        'Organismo de tránsito o autoridad que elaboró el IPAT',
        'Fecha del comité donde fue analizado',
      ]

      const headerRow = evidencia.getRow(5)
      headerRow.values = encabezados
      headerRow.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
      }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF24638C' },
      }
      headerRow.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }
      headerRow.height = 45

      if (filasEvidencia.length > 0) {
        for (const fila of filasEvidencia) {
          evidencia.addRow([
            formatearFechaExcel(fila.fecha_siniestro),
            fila.nivel_perdida,
            fila.personas_nivel,
            fila.placa,
            fila.conductor,
            fila.documento,
            fila.ipat,
            fila.autoridad,
            formatearFechaExcel(fila.fecha_comite),
          ])
        }
      } else {
        const filaSinSiniestros =
          evidencia.addRow([
            '',
            `NO SE REPORTARON SINIESTROS VIALES DURANTE EL ${periodoExport.nombre.toUpperCase()} DE ${anioExport}.`,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
          ])

        evidencia.mergeCells(
          `B${filaSinSiniestros.number}:I${filaSinSiniestros.number}`
        )

        const celdaNota =
          evidencia.getCell(
            `B${filaSinSiniestros.number}`
          )

        celdaNota.font = {
          bold: true,
        }

        celdaNota.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        }

        filaSinSiniestros.height = 45
      }

      evidencia.columns = [
        { width: 18 },
        { width: 20 },
        { width: 18 },
        { width: 20 },
        { width: 30 },
        { width: 22 },
        { width: 24 },
        { width: 34 },
        { width: 22 },
      ]

      evidencia.eachRow(
        {
          includeEmpty: false,
        },
        row => {
          row.eachCell(cell => {
            cell.alignment = {
              ...cell.alignment,
              vertical: 'middle',
              wrapText: true,
            }
          })
        }
      )

      evidencia.views = [
        {
          state: 'frozen',
          ySplit: 5,
          showGridLines: false,
        },
      ]

      // ======================================================
      // HOJA 2: CONTROL ADMINISTRATIVO COMPLEMENTARIO
      // ======================================================

      const control = workbook.addWorksheet(
        'Control administrativo'
      )

      control.columns = [
        { header: 'Consecutivo interno', key: 'consecutivo', width: 18 },
        { header: 'Fecha siniestro', key: 'fecha', width: 16 },
        { header: 'Tipo siniestro', key: 'tipo', width: 22 },
        { header: 'Placa', key: 'placa', width: 14 },
        { header: 'Estado administrativo', key: 'estado', width: 20 },
        { header: 'IPAT', key: 'ipat', width: 20 },
        { header: 'Autoridad', key: 'autoridad', width: 28 },
        { header: 'Fecha comité', key: 'fecha_comite', width: 18 },
        { header: 'Costo directo', key: 'directo', width: 18 },
        { header: 'Costo indirecto', key: 'indirecto', width: 18 },
        { header: 'Costo total', key: 'total', width: 18 },
        { header: 'Estado evidencia', key: 'estado_evidencia', width: 24 },
      ]

      control.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
      }
      control.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF24638C' },
      }
      control.getRow(1).alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }
      control.getRow(1).height = 32

      let totalCostosDirectos = 0
      let totalCostosIndirectos = 0

      if (registros.length > 0) {
        for (const row of registros) {
          const directo =
            Number(row?.costo_dir_choque_simple || 0) +
            Number(row?.costo_dir_heridos_l || 0) +
            Number(row?.costo_dir_heridos_g || 0) +
            Number(row?.costo_dir_fatalidad || 0)

          const indirecto =
            Number(row?.costo_indi_choque_simple || 0) +
            Number(row?.costo_indi_heridos_l || 0) +
            Number(row?.costo_indi_heridos_g || 0) +
            Number(row?.costo_indi_fatalidad || 0)

          totalCostosDirectos += directo
          totalCostosIndirectos += indirecto

          const completa =
            normEstado(row?.estado_analisis) === 'CERRADO' &&
            Boolean(normalizarTexto(row?.fecha_comite_analisis))

          control.addRow({
            consecutivo: row?.consecutivo || '',
            fecha: formatearFechaExcel(row?.fecha_siniestro),
            tipo: row?.tipo_siniestro || '',
            placa: row?.placa || '',
            estado: row?.estado_analisis || '',
            ipat: row?.numero_ipat || '',
            autoridad: row?.autoridad || '',
            fecha_comite: formatearFechaExcel(row?.fecha_comite_analisis),
            directo,
            indirecto,
            total: directo + indirecto,
            estado_evidencia: completa
              ? 'COMPLETA'
              : 'PENDIENTE DE COMPLETAR',
          })
        }
      } else {
        const filaControl =
          control.addRow({
            consecutivo: '',
            fecha: '',
            tipo: `SIN SINIESTROS REPORTADOS - ${periodoExport.nombre.toUpperCase()} ${anioExport}`,
            placa: '',
            estado: 'SIN NOVEDAD',
            ipat: '',
            autoridad: '',
            fecha_comite: '',
            directo: 0,
            indirecto: 0,
            total: 0,
            estado_evidencia: 'NO APLICA',
          })

        filaControl.font = {
          italic: true,
        }
      }

      // ====================================================
      // TOTALIZACIÓN DE COSTOS DEL TRIMESTRE
      // Hoja: Control administrativo
      // ====================================================

      const filaTotal =
        control.addRow({
          consecutivo: '',
          fecha: '',
          tipo: '',
          placa: '',
          estado: '',
          ipat: '',
          autoridad: '',
          fecha_comite: 'TOTALES DEL TRIMESTRE',
          directo: totalCostosDirectos,
          indirecto: totalCostosIndirectos,
          total: totalCostosDirectos + totalCostosIndirectos,
          estado_evidencia: '',
        })

      filaTotal.font = {
        bold: true,
      }

      filaTotal.alignment = {
        vertical: 'middle',
      }

      filaTotal.height = 22

      control.getCell(
        `H${filaTotal.number}`
      ).alignment = {
        horizontal: 'right',
        vertical: 'middle',
      }

      control.getColumn('directo').numFmt = '#,##0.00'
      control.getColumn('indirecto').numFmt = '#,##0.00'
      control.getColumn('total').numFmt = '#,##0.00'

      control.views = [
        {
          state: 'frozen',
          ySplit: 1,
          showGridLines: false,
        },
      ]

      // ======================================================
      // GENERAR ARCHIVO
      // ======================================================

      const buffer = await workbook.xlsx.writeBuffer()

      const blob = new Blob(
        [buffer],
        {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
      )

      const nombreArchivo =
        `Registro_Vehiculos_Siniestrados_${anioExport}_T${trimestreExport}.xlsx`

      saveAs(blob, nombreArchivo)

      if (registros.length === 0) {
        toast.success(
          `Evidencia generada correctamente. No se reportaron siniestros en el ${periodoExport.nombre} de ${anioExport}.`,
          {
            duration: 5000,
          }
        )

        return
      }

      const incompletos = registros.filter(
        row =>
          normEstado(row?.estado_analisis) !== 'CERRADO' ||
          !normalizarTexto(row?.fecha_comite_analisis)
      ).length

      if (incompletos > 0) {
        toast.warning(
          `Excel generado. ${incompletos} siniestro(s) todavía tienen información administrativa pendiente.`,
          {
            duration: 5000,
          }
        )
      } else {
        toast.success(
          'Evidencia trimestral generada correctamente.'
        )
      }
    } catch (error) {
      console.error(
        'Error exportando evidencia:',
        error
      )

      toast.error(
        error?.message ||
        'No fue posible generar la evidencia en Excel.'
      )
    } finally {
      setExporting(false)
    }
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () =>
    cerrarSesion(router)

  // ==========================================================
  // CARGANDO SESIÓN
  // ==========================================================

  if (!user) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  // ==========================================================
  // RENDER
  // app/admin/consultas/siniestros/page.jsx
  // ==========================================================

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-5">
      <Toaster
        position="top-center"
        richColors
      />

      <div className="max-w-7xl mx-auto space-y-4">

        {/* ==================================================
            ENCABEZADO
        ================================================== */}

        <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          <EncabezadoModulo
            titulo="Gestión de Siniestros Viales"
            subtitulo="Gestión de pendientes, análisis, cierres y evidencia trimestral"
            icono={CarFront}
            rutaRegreso="/admin/consultas"
            textoRegreso="Seguimiento Operativo y Consultas"
          />
        </section>

        {/* ==================================================
            BANDEJAS POR ESTADO
        ================================================== */}

        <section className="flex justify-end rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-end gap-3">
          <label htmlFor="filtro-estado-siniestros" className="whitespace-nowrap text-sm font-bold text-[#194567]">
            Filtrar por estado
          </label>
          <select
            id="filtro-estado-siniestros"
            value={estadoActual}
            disabled={loading}
            onChange={event => consultarEstado(event.target.value, 1)}
            className="w-36 sm:w-40 rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#24638C] focus:ring-2 focus:ring-[#24638C]/20 disabled:opacity-60"
          >
            {ESTADOS_BANDEJA.map(item => (
              <option key={item.valor} value={item.valor}>{item.titulo}</option>
            ))}
          </select>
          </div>
        </section>

        {/* ==================================================
            BANDEJA PRINCIPAL
        ================================================== */}

        <section className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-t-xl" style={{ backgroundColor: ESTILO_SECCIONES.fondo }}>
            <div>
              <h2 className="font-bold text-white flex items-center gap-2">
                <ClipboardList aria-hidden="true" size={20} strokeWidth={2.5} className="shrink-0 text-white" />
                Registros de siniestros viales
              </h2>

              <p className="text-xs text-white/85 mt-1">
                Filtro aplicado: <strong>{estadoActual === 'TODOS' ? 'Todos los siniestros' : ESTADOS_BANDEJA.find(item => item.valor === estadoActual)?.titulo || estadoActual}</strong>
              </p>
            </div>

            <BotonAccion tipo="actualizar"
              type="button"
              onClick={() =>
                consultarEstado(
                  estadoActual,
                  page
                )
              }
              disabled={loading}
              className="text-xs self-start sm:self-auto"
            >
              <i
                className={`fas fa-rotate-right ${
                  loading
                    ? 'fa-spin'
                    : ''
                }`}
              ></i>
              Actualizar
            </BotonAccion>
          </div>

          {status && (
            <div className="px-4 sm:px-5 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
              {status}
            </div>
          )}

          {/* ESCRITORIO */}

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-xs [&_th]:border [&_th]:border-slate-300" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>
                <tr>
                  <th className="text-center px-4 py-3 text-[10px] uppercase tracking-wide">
                    Siniestro
                  </th>
                  <th className="text-center px-4 py-3 text-[10px] uppercase tracking-wide">
                    Vehículo / Conductor
                  </th>
                  <th className="text-center px-4 py-3 text-[10px] uppercase tracking-wide">
                    Afectación
                  </th>
                  <th className="text-center px-4 py-3 text-[10px] uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-center px-4 py-3 text-[10px] uppercase tracking-wide">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-300 [&_td]:border [&_td]:border-slate-300">
                {loading && data.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Consultando...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      No existen siniestros en esta bandeja.
                    </td>
                  </tr>
                ) : (
                  data.map(row => {
                    const estado = normEstado(
                      row?.estado_analisis
                    )

                    const textoAccion =
                      estado === 'CERRADO'
                        ? 'Ver expediente'
                        : estado === 'EN ANALISIS'
                          ? 'Continuar análisis'
                          : 'Iniciar análisis'

                    return (
                      <tr
                        key={row.id}
                        className={
                          Number(row?.fatalidades || 0) > 0
                            ? 'bg-red-50/60'
                            : 'hover:bg-gray-50'
                        }
                      >
                        <td className="px-4 py-3 align-middle text-center">
                          <p className="font-bold text-gray-900">
                            {row?.consecutivo || `#${row.id}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatearFecha(row?.fecha_siniestro)}
                            {' · '}
                            {row?.tipo_siniestro || '-'}
                          </p>
                        </td>

                        <td className="px-4 py-3 align-middle text-center">
                          <p className="font-bold text-gray-800">
                            {row?.placa || '-'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {row?.nombre_conductor_implicado || '-'}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {row?.documento || '-'}
                          </p>
                        </td>

                        <td className="px-4 py-3 align-middle text-center">
                          <p className="text-xs font-semibold text-gray-700">
                            {obtenerTextoAfectacion(row)}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Personas involucradas: {fmt(row?.num_personas_involucradas)}
                          </p>
                        </td>

                        <td className="px-4 py-3 align-middle text-center">
                          <EstadoChip
                            estado={row?.estado_analisis}
                          />
                        </td>

                        <td className="px-4 py-3 align-middle text-center">
                          <BotonAccion tipo="consultar"
                            type="button"
                            onClick={() =>
                              abrirSeguimiento(row)
                            }
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg  text-xs font-semibold"
                          >
                            <i className="fas fa-folder-open"></i>
                            {textoAccion}
                          </BotonAccion>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* MÓVIL */}

          <div className="md:hidden p-3 space-y-3">
            {loading && data.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Consultando...
              </div>
            ) : data.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                No existen siniestros en esta bandeja.
              </div>
            ) : (
              data.map(row => {
                const estado = normEstado(
                  row?.estado_analisis
                )

                const textoAccion =
                  estado === 'CERRADO'
                    ? 'Ver expediente'
                    : estado === 'EN ANALISIS'
                      ? 'Continuar análisis'
                      : 'Iniciar análisis'

                return (
                  <article
                    key={row.id}
                    className="border border-gray-200 rounded-xl p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-gray-900">
                          {row?.consecutivo || `#${row.id}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatearFecha(row?.fecha_siniestro)} · {row?.tipo_siniestro || '-'}
                        </p>
                      </div>

                      <EstadoChip
                        estado={row?.estado_analisis}
                      />
                    </div>

                    <div className="mt-3 text-xs text-gray-600 space-y-1">
                      <p>
                        <strong>Placa:</strong> {row?.placa || '-'}
                      </p>
                      <p>
                        <strong>Conductor:</strong> {row?.nombre_conductor_implicado || '-'}
                      </p>
                      <p>
                        <strong>Afectación:</strong> {obtenerTextoAfectacion(row)}
                      </p>
                    </div>

                    <BotonAccion tipo="consultar"
                      type="button"
                      onClick={() =>
                        abrirSeguimiento(row)
                      }
                      className="w-full mt-3 px-3 py-2 rounded-lg  text-xs font-semibold"
                    >
                      <i className="fas fa-folder-open mr-2"></i>
                      {textoAccion}
                    </BotonAccion>
                  </article>
                )
              })
            )}
          </div>

          {/* PAGINACIÓN */}

          {total > 0 && (
            <div className="px-4 sm:px-5 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-gray-500">
                Página {page} de {totalPages} · {fmt(total)} registro(s)
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={
                    loading ||
                    page <= 1
                  }
                  onClick={() =>
                    consultarEstado(
                      estadoActual,
                      page - 1
                    )
                  }
                  className="px-3 py-2 border rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  Anterior
                </button>

                <button
                  type="button"
                  disabled={
                    loading ||
                    page >= totalPages
                  }
                  onClick={() =>
                    consultarEstado(
                      estadoActual,
                      page + 1
                    )
                  }
                  className="px-3 py-2 border rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ==================================================
            EVIDENCIA TRIMESTRAL
        ================================================== */}

        <section className="bg-white border border-slate-400 rounded-2xl shadow-sm p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="font-black text-gray-900 flex items-center gap-2">
                <i className="fas fa-file-excel text-green-700"></i>
                Evidencia trimestral · Registro de vehículos siniestrados
              </h2>

              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                El archivo se genera por fecha del siniestro e incluye los campos requeridos para el registro trimestral: nivel de pérdida, personas implicadas, vehículo, conductor, IPAT, autoridad y fecha del comité.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-[120px_170px_auto] gap-2 w-full lg:w-auto">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                  Año
                </label>

                <select
                  value={anioExport}
                  onChange={event =>
                    setAnioExport(
                      Number(event.target.value)
                    )
                  }
                  className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {aniosDisponibles.map(anio => (
                    <option
                      key={anio}
                      value={anio}
                    >
                      {anio}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                  Trimestre
                </label>

                <select
                  value={trimestreExport}
                  onChange={event =>
                    setTrimestreExport(
                      Number(event.target.value)
                    )
                  }
                  className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value={1}>I trimestre</option>
                  <option value={2}>II trimestre</option>
                  <option value={3}>III trimestre</option>
                  <option value={4}>IV trimestre</option>
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={exportarEvidenciaExcel}
                  disabled={exporting}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <i
                    className={`fas ${
                      exporting
                        ? 'fa-spinner fa-spin'
                        : 'fa-file-excel'
                    }`}
                  ></i>
                  {exporting
                    ? 'Generando...'
                    : 'Generar Excel'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
            <strong>Período:</strong>{' '}
            {formatearFecha(periodoExport.desde)} al {formatearFecha(periodoExport.hasta)}.
            {' '}La evidencia incluye todos los siniestros del trimestre, independientemente de su estado administrativo. Si alguno continúa pendiente o en análisis, el archivo lo identificará en la hoja de control administrativo.
          </div>
        </section>
      </div>

      {/* ====================================================
          DRAWER EXPEDIENTE
      ==================================================== */}

      {drawerOpen && rowSel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Cerrar expediente"
            className="absolute inset-0 bg-black/40"
            onClick={cerrarDrawer}
          ></button>

          <aside className="relative w-full sm:w-[620px] h-full bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">
                    Expediente del siniestro
                  </p>

                  <h2 className="text-lg font-black text-gray-900 mt-1">
                    {rowSel?.consecutivo || `#${rowSel?.id}`}
                  </h2>

                  <div className="mt-2">
                    <EstadoChip
                      estado={rowSel?.estado_analisis}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={cerrarDrawer}
                  disabled={closing || changingState || savingActa}
                  className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  <i className="fas fa-xmark"></i>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-5">

              {/* ============================================
                  1. REPORTE INICIAL
              ============================================ */}

              <section className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 text-xs font-bold">
                  1. Reporte inicial
                </div>

                <div className="p-4 grid grid-cols-2 gap-4">
                  <Dato
                    etiqueta="Fecha del siniestro"
                    valor={formatearFecha(rowSel?.fecha_siniestro)}
                  />

                  <Dato
                    etiqueta="Tipo"
                    valor={rowSel?.tipo_siniestro}
                  />

                  <Dato
                    etiqueta="Placa"
                    valor={rowSel?.placa}
                  />

                  <Dato
                    etiqueta="Personas involucradas"
                    valor={fmt(rowSel?.num_personas_involucradas)}
                  />

                  <Dato
                    etiqueta="Conductor"
                    valor={rowSel?.nombre_conductor_implicado}
                  />

                  <Dato
                    etiqueta="Identificación"
                    valor={rowSel?.documento}
                  />

                  <Dato
                    etiqueta="Heridos leves"
                    valor={fmt(rowSel?.heridos_leves)}
                  />

                  <Dato
                    etiqueta="Heridos graves"
                    valor={fmt(rowSel?.heridos_graves)}
                  />

                  <Dato
                    etiqueta="Fatalidades"
                    valor={fmt(rowSel?.fatalidades)}
                  />

                  <div className="col-span-2">
                    <Dato
                      etiqueta="Resumen inicial"
                      valor={rowSel?.resumen}
                    />
                  </div>
                </div>
              </section>

              {/* ============================================
                  2. TRAZABILIDAD
              ============================================ */}

              <section className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 text-xs font-bold">
                  2. Trazabilidad
                </div>

                <div className="p-4 grid grid-cols-2 gap-4">
                  <Dato
                    etiqueta="Inicio del análisis"
                    valor={formatearFecha(rowSel?.fecha_estado_en_analisis)}
                  />

                  <Dato
                    etiqueta="Responsable análisis"
                    valor={rowSel?.nombre_usuario_en_analisis}
                  />

                  <Dato
                    etiqueta="Acta de tratamiento"
                    valor={acta?.numero_acta || 'Sin acta'}
                  />

                  <Dato
                    etiqueta="Estado del acta"
                    valor={acta?.estado || '-'}
                  />

                  <Dato
                    etiqueta="Fecha de cierre"
                    valor={formatearFecha(rowSel?.fecha_estado_cerrado)}
                  />

                  <div className="col-span-2">
                    <Dato
                      etiqueta="Responsable cierre"
                      valor={rowSel?.nombre_usuario_cerrado}
                    />
                  </div>
                </div>
              </section>

              {/* ============================================
                  3. INICIO DE ANÁLISIS
              ============================================ */}

              {esPendiente && (
                <section className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                  <h3 className="font-bold text-amber-900 text-sm">
                    Iniciar seguimiento administrativo
                  </h3>

                  <p className="text-xs text-amber-800 mt-1">
                    Al iniciar el análisis se registrará la fecha y el usuario responsable. Después podrá diligenciar IPAT, autoridad, tratamiento, costos y el acta del siniestro.
                  </p>

                  <button
                    type="button"
                    onClick={marcarEnAnalisis}
                    disabled={changingState}
                    className="mt-3 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-60"
                  >
                    <i
                      className={`fas ${
                        changingState
                          ? 'fa-spinner fa-spin'
                          : 'fa-play'
                      } mr-2`}
                    ></i>
                    {changingState
                      ? 'Actualizando...'
                      : 'Marcar EN ANÁLISIS'}
                  </button>
                </section>
              )}

              {/* ============================================
                  4. ANÁLISIS ADMINISTRATIVO
              ============================================ */}

              {(esAnalisis || esCerrado) && (
              <section className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 text-xs font-bold">
                  3. Análisis administrativo
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Consecutivo IPAT
                      </label>

                      <input
                        type="text"
                        value={numIpat}
                        onChange={event =>
                          setNumIpat(event.target.value)
                        }
                        disabled={!puedeEditar}
                        className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                        placeholder="Consecutivo IPAT en RNAT del RUNT"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Organismo / Autoridad
                      </label>

                      <input
                        type="text"
                        value={autoridad}
                        onChange={event =>
                          setAutoridad(event.target.value)
                        }
                        disabled={!puedeEditar}
                        className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                        placeholder="Autoridad que elaboró el IPAT"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Análisis / Conclusiones <span className="text-red-600">*</span>
                    </label>

                    <textarea
                      rows="5"
                      value={resumenAnalisis}
                      onChange={event =>
                        setResumenAnalisis(event.target.value)
                      }
                      disabled={!puedeEditar}
                      className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                      placeholder="Registre el análisis administrativo, conclusiones y decisiones adoptadas."
                    />
                  </div>


                  {esAnalisis && (
                    <button
                      type="button"
                      onClick={guardarAnalisisYContinuar}
                      disabled={savingTreatment}
                      className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-60"
                    >
                      <i className={`fas ${savingTreatment ? 'fa-spinner fa-spin' : 'fa-floppy-disk'} mr-2`}></i>
                      {savingTreatment ? 'Guardando...' : 'Guardar análisis y continuar'}
                    </button>
                  )}
                </div>
              </section>
              )}

              {/* ============================================
                  4. COSTOS
              ============================================ */}

              {(pasoAnalisisGuardado || esCerrado) && (
              <section className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 text-xs font-bold">
                  4. Costos asociados
                </div>

                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-3">
                    Registre valores iguales o mayores a cero. Si una categoría no presenta costo, puede dejarla en cero.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border px-3 py-2 text-left text-xs">
                            Nivel
                          </th>
                          <th className="border px-3 py-2 text-center text-xs">
                            Directo
                          </th>
                          <th className="border px-3 py-2 text-center text-xs">
                            Indirecto
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {[
                          {
                            label: 'Choque simple',
                            direct: 'dirChoque',
                            indirect: 'indChoque',
                          },
                          {
                            label: 'Heridos leves',
                            direct: 'dirLeves',
                            indirect: 'indLeves',
                          },
                          {
                            label: 'Heridos graves',
                            direct: 'dirGraves',
                            indirect: 'indGraves',
                          },
                          {
                            label: 'Fatalidades',
                            direct: 'dirFatal',
                            indirect: 'indFatal',
                          },
                        ].map(item => (
                          <tr key={item.label}>
                            <td className="border px-3 py-2 text-xs font-semibold text-gray-700">
                              {item.label}
                            </td>

                            <td className="border p-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={costo[item.direct]}
                                onChange={event =>
                                  setCosto(prev => ({
                                    ...prev,
                                    [item.direct]: event.target.value,
                                  }))
                                }
                                disabled={!puedeEditar}
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-right text-xs disabled:bg-gray-100"
                              />
                            </td>

                            <td className="border p-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={costo[item.indirect]}
                                onChange={event =>
                                  setCosto(prev => ({
                                    ...prev,
                                    [item.indirect]: event.target.value,
                                  }))
                                }
                                disabled={!puedeEditar}
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-right text-xs disabled:bg-gray-100"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="bg-gray-50 border rounded-lg p-2">
                      <p className="text-[9px] uppercase text-gray-500 font-bold">
                        Directos
                      </p>
                      <p className="text-xs font-black mt-1">
                        {fmtCOP(totalesCostos.directo)}
                      </p>
                    </div>

                    <div className="bg-gray-50 border rounded-lg p-2">
                      <p className="text-[9px] uppercase text-gray-500 font-bold">
                        Indirectos
                      </p>
                      <p className="text-xs font-black mt-1">
                        {fmtCOP(totalesCostos.indirecto)}
                      </p>
                    </div>

                    <div className="bg-gray-50 border rounded-lg p-2">
                      <p className="text-[9px] uppercase text-gray-500 font-bold">
                        Total
                      </p>
                      <p className="text-xs font-black mt-1">
                        {fmtCOP(totalesCostos.total)}
                      </p>
                    </div>
                  </div>

                  {esAnalisis && (
                    <button
                      type="button"
                      onClick={guardarCostosYContinuar}
                      disabled={savingTreatment}
                      className="mt-4 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-60"
                    >
                      <i className={`fas ${savingTreatment ? 'fa-spinner fa-spin' : 'fa-floppy-disk'} mr-2`}></i>
                      {savingTreatment ? 'Guardando...' : 'Guardar costos y continuar'}
                    </button>
                  )}
                </div>
              </section>
              )}

              {/* ============================================
                  5. ACTA DE TRATAMIENTO
              ============================================ */}

              {(pasoCostosGuardado || Boolean(acta) || esCerrado) && (
              <section className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-3">
                  <span>5. Acta de tratamiento del siniestro</span>
                  {acta?.estado && (
                    <span className="text-[10px] bg-white/15 px-2 py-1 rounded-full">
                      {acta.estado}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  {loadingActa ? (
                    <p className="text-xs text-gray-500">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Consultando acta...
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Fecha del acta</label>
                          <input
                            type="date"
                            value={fechaActa}
                            min={rowSel?.fecha_siniestro || undefined}
                            max={hoyBogota()}
                            onChange={event => setFechaActa(event.target.value)}
                            disabled={!puedeEditar || acta?.estado === 'FINALIZADA'}
                            className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Número de acta</label>
                          <input
                            type="text"
                            value={acta?.numero_acta || 'Se asignará automáticamente'}
                            disabled
                            className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm bg-gray-100"
                          />
                        </div>
                      </div>

                      {[
                        ['Tratamiento realizado', tratamientoRealizado, setTratamientoRealizado, 'Describa brevemente la revisión y el tratamiento dado al siniestro.'],
                        ['Acciones preventivas para evitar que se repita', accionesPreventivas, setAccionesPreventivas, 'Registre las medidas preventivas definidas a partir del evento.'],
                        ['Acuerdos y compromisos', acuerdosCompromisos, setAcuerdosCompromisos, 'Registre los acuerdos y compromisos establecidos.'],
                      ].map(([label, value, setter, placeholder]) => (
                        <div key={label}>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            {label} <span className="text-red-600">*</span>
                          </label>
                          <textarea
                            rows="3"
                            value={value}
                            onChange={event => setter(event.target.value)}
                            disabled={!puedeEditar || acta?.estado === 'FINALIZADA'}
                            className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                            placeholder={placeholder}
                          />
                        </div>
                      ))}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Responsable(s) de los compromisos</label>
                          <input
                            type="text"
                            value={responsablesCompromisos}
                            onChange={event => setResponsablesCompromisos(event.target.value)}
                            disabled={!puedeEditar || acta?.estado === 'FINALIZADA'}
                            className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                            placeholder="Nombre o responsables"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Fecha de seguimiento</label>
                          <input
                            type="date"
                            value={fechaSeguimiento}
                            min={fechaActa || rowSel?.fecha_siniestro || undefined}
                            onChange={event => setFechaSeguimiento(event.target.value)}
                            disabled={!puedeEditar || acta?.estado === 'FINALIZADA'}
                            className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Participantes <span className="text-red-600">*</span>
                        </label>
                        <textarea
                          rows="3"
                          value={participantesTexto}
                          onChange={event => setParticipantesTexto(event.target.value)}
                          disabled={!puedeEditar || acta?.estado === 'FINALIZADA'}
                          className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                          placeholder={'Un participante por línea. Puede usar: Nombre - Cargo'}
                        />
                        <p className="text-[10px] text-gray-500 mt-1">
                          Registre únicamente las personas que participaron realmente en el tratamiento del siniestro.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Observaciones</label>
                        <textarea
                          rows="2"
                          value={observacionesActa}
                          onChange={event => setObservacionesActa(event.target.value)}
                          disabled={!puedeEditar || acta?.estado === 'FINALIZADA'}
                          className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                          placeholder="Observaciones adicionales, si aplica."
                        />
                      </div>

                      {esAnalisis && acta?.estado !== 'FINALIZADA' && (
                        <button
                          type="button"
                          onClick={guardarBorradorActa}
                          disabled={savingActa || closing}
                          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-60"
                        >
                          <i className={`fas ${savingActa ? 'fa-spinner fa-spin' : 'fa-floppy-disk'} mr-2`}></i>
                          {savingActa ? 'Guardando...' : 'Guardar borrador del acta'}
                        </button>
                      )}
                    </>
                  )}


                  {esAnalisis && acta?.estado !== 'FINALIZADA' && (
                    <button
                      type="button"
                      onClick={finalizarActa}
                      disabled={closing || savingActa}
                      className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold disabled:opacity-60"
                    >
                      <i className={`fas ${closing ? 'fa-spinner fa-spin' : 'fa-lock'} mr-2`}></i>
                      {closing ? 'Finalizando...' : 'Finalizar acta y cerrar siniestro'}
                    </button>
                  )}

                  {acta?.estado === 'FINALIZADA' && (
                    <button
                      type="button"
                      onClick={abrirPdfActa}
                      className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold"
                    >
                      <i className="fas fa-file-pdf mr-2"></i>
                      Generar PDF del acta
                    </button>
                  )}
                </div>
              </section>
              )}

              {/* ============================================
                  6. FINALIZACIÓN / EXPEDIENTE CERRADO
              ============================================ */}

              {esCerrado && (
                <section className="border border-green-200 bg-green-50 rounded-xl p-4">
                  <h3 className="text-sm font-black text-green-900">
                    Expediente cerrado
                  </h3>

                  <p className="text-xs text-green-800 mt-1">
                    Este registro se encuentra cerrado. El acta de tratamiento quedó finalizada y el expediente está disponible únicamente para consulta.
                  </p>
                </section>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
