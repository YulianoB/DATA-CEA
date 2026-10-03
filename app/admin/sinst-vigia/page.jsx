// app/admin/sinst-vigia/page.jsx
'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Loader2,
  Route,
  Save,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
const PALETA = {
  tituloSeccion: '#36566F',
  textoTituloSeccion: '#FFFFFF',
  textoSubtituloSeccion: '#DCE6ED',
  encabezadoTabla: '#C9D9E6',
  encabezadoTablaHover: '#B8CCDC',
  encabezadoFormulario: '#CBD0D6',
  textoEncabezadoTabla: '#263746',
  bordeTabla: '#94A3B8',
  fondoContenido: '#FFFFFF',
  botonPrincipal: '#36566F',
  botonPrincipalHover: '#29465D',
  botonPdf: '#E67E22',
  botonPdfHover: '#C96816',
}
const FORMULARIOS = [
  {
    id: 'A',
    titulo: 'Formulario A',
    subtitulo: 'Siniestralidad vial y costos asociados',
    periodicidad: 'Trimestral',
    icono: FileText,
  },
  {
    id: 'B',
    titulo: 'Formulario B',
    subtitulo: 'Gestión del PESV, formación y auditoría',
    periodicidad: 'Trimestral / anual',
    icono: ClipboardList,
  },
  {
    id: 'C',
    titulo: 'Formulario C',
    subtitulo: 'Jornada laboral y desplazamientos',
    periodicidad: 'Mensual',
    icono: FileSpreadsheet,
  },
  {
    id: 'D',
    titulo: 'Formulario D',
    subtitulo: 'Vehículos, inspecciones y mantenimiento',
    periodicidad: 'Mensual / trimestral',
    icono: ShieldCheck,
  },
  {
    id: 'EVIDENCIAS',
    titulo: 'Evidencias',
    subtitulo: 'Expediente documental SINST - VIGIA 2',
    periodicidad: 'Mensual / trimestral / anual',
    icono: FolderOpen,
  },
]
const VARIABLES_A = [
  { codigo: '1.1', nombre: 'Fatalidades', tipo: 'numero' },
  { codigo: '1.2', nombre: 'Heridos graves', tipo: 'numero' },
  { codigo: '1.3', nombre: 'Heridos leves', tipo: 'numero' },
  { codigo: '1.4', nombre: 'Choques simples', tipo: 'numero' },
  { codigo: '1.5', nombre: 'Kilómetros recorridos', tipo: 'km' },
  {
    codigo: '2.1',
    nombre: 'Costos directos de fatalidades',
    tipo: 'moneda',
  },
  {
    codigo: '2.2',
    nombre: 'Costos indirectos de fatalidades',
    tipo: 'moneda',
  },
  {
    codigo: '2.3',
    nombre: 'Costos directos de heridos graves',
    tipo: 'moneda',
  },
  {
    codigo: '2.4',
    nombre: 'Costos indirectos de heridos graves',
    tipo: 'moneda',
  },
  {
    codigo: '2.5',
    nombre: 'Costos directos de heridos leves',
    tipo: 'moneda',
  },
  {
    codigo: '2.6',
    nombre: 'Costos indirectos de heridos leves',
    tipo: 'moneda',
  },
  {
    codigo: '2.7',
    nombre: 'Costos directos de choques simples',
    tipo: 'moneda',
  },
  {
    codigo: '2.8',
    nombre: 'Costos indirectos de choques simples',
    tipo: 'moneda',
  },
]
const EVIDENCIAS_A = [
  {
    numero: 1,
    descripcion:
      'Registro   de vehículos siniestrados, con mínimo los siguientes campos: Fecha del   siniestro, nivel de pérdida (fatalidad, heridos graves, heridos leves o   choque simple), número de personas implicadas por cada nivel, placa del   vehículo implicado de la empresa, nombre del conductor implicado de la   empresa, identificación del conductor implicado de la empresa, consecutivo   del Informe Policial de Accidentes de Tránsito (IPAT) en el RNAT del RUNT,   nombre del organismo de tránsito o autoridad que elaboró el IPAT, fecha del   comité donde fue analizado',
    formato: 'Archivo Excel',
    accion: 'GENERAR',
  },
  {
    numero: 2,
    descripcion:
      'Copia   de las actas de reunión del comité PESV, donde conste la investigación   interna de los siniestros viales',
    formato: 'PDF',
    accion: 'GESTIONAR',
  },
  {
    numero: 3,
    descripcion:
      'Evidencia   de la divulgación de las lecciones aprendidas diferentes a capacitaciones y   certificación del área de RRHH, donde conste la retroalimentación de los   implicados',
    formato: 'PDF',
    accion: 'GESTIONAR',
  },
  {
    numero: 4,
    descripcion:
      'Certificación   suscrita por el Representante Legal de la señalización, puestos de control,   gastos de GPS, etc, implementados para reducir la accidentalidad',
    formato: 'PDF',
    accion: 'GESTIONAR',
  },
  {
    numero: 5,
    descripcion:
      'Detalle   de cuentas a nivel de terceros de los costos directos e indirectos   ocasionados por los accidentes (reparaciones, demandas pagas, etc.) con   mínimo los siguientes campos: Fecha movimiento contable, código cuenta,   número de comprobante, nombre e identificación del tercero, detalle o   concepto, saldo inicial, movimiento débito, movimiento crédito, saldo final',
    formato: 'Archivo Excel',
    accion: 'GESTIONAR',
  },
  {
    numero: 6,
    descripcion:
      'Copia   del informe jurídico de los procesos en contra de la empresa por todo tipo de   siniestros viales, incluyendo accidentes derivados de desplazamientos   laborales y monto del fondo para accidentes (si existe)',
    formato: 'PDF',
    accion: 'GESTIONAR',
  },
  {
    numero: 7,
    descripcion:
      'Detalle   de las provisiones derivadas de las demandas por accidentes, con mínimo los   siguientes datos: Código cuenta, código interno o numeración del proceso,   fecha de demanda, descripción de la demanda, probabilidad de pérdida',
    formato: 'Archivo Excel',
    accion: 'GESTIONAR',
  },
]
const VARIABLES_B = [
  { codigo: '3.1', nombre: 'Cantidad de riesgos identificados al inicio del año', periodo: 'ANUAL' },
  { codigo: '3.2', nombre: 'Cantidad de riesgos identificados al final del año', periodo: 'ANUAL' },
  { codigo: '3.3', nombre: 'Cantidad de riesgos con valoración alta identificados al inicio del año', periodo: 'ANUAL' },
  { codigo: '3.4', nombre: 'Cantidad de riesgos con valoración alta identificados al final del año', periodo: 'ANUAL' },
  { codigo: '4.1', nombre: 'Número total de metas definidas PESV por trimestre', periodo: 'TRIMESTRAL' },
  { codigo: '4.2', nombre: 'Número de metas alcanzadas o logradas en el PESV por trimestre', periodo: 'TRIMESTRAL' },
  { codigo: '5.1', nombre: 'Actividades programadas a partir del plan anual de trabajo PESV', periodo: 'TRIMESTRAL' },
  { codigo: '5.2', nombre: 'Actividades ejecutadas a partir del plan anual de trabajo PESV', periodo: 'TRIMESTRAL' },
  { codigo: '11.1', nombre: 'Capacitaciones en seguridad vial programadas', periodo: 'TRIMESTRAL' },
  { codigo: '11.2', nombre: 'Capacitaciones en seguridad vial ejecutadas', periodo: 'TRIMESTRAL' },
  { codigo: '12.1', nombre: 'Colaboradores capacitados en seguridad vial', periodo: 'TRIMESTRAL' },
  { codigo: '12.2', nombre: 'Colaboradores de la organización', periodo: 'TRIMESTRAL' },
  { codigo: '13.1', nombre: 'No conformidades identificadas y analizadas', periodo: 'ANUAL' },
  { codigo: '13.2', nombre: 'No conformidades gestionadas y cerradas', periodo: 'ANUAL' },
]
const EVIDENCIAS_B = [
  { numero: '1', descripcion: 'Certificación del Representante Legal donde se describa el mecanismo empleado para la medición de los riesgos', formato: 'Archivo PDF' },
  { numero: '2', descripcion: 'Evidencia de los controles implementados para minimizar los riesgos identificados al incio y final del año', formato: 'Archivo PDF' },
  { numero: '3', descripcion: 'Copia del informe presentado trimestralmente por el lider PESV al comité sobre la ejecución de los planes y los avances respecto a las metas', formato: 'Archivo PDF' },
  { numero: '4', descripcion: 'Certificación suscrita por el Contador y Revisor Fiscal (si aplica) de los recursos empleados trimestralmente para el desarrollo del plan anual de trabajo PESV, con el detalle de la destinación de los mismos', formato: 'Archivo PDF' },
  { numero: '5', descripcion: 'Listado unificado de asistentes a capacitaciones, con mínimo los siguientes campos: nombre de los asistentes, identificación, fecha capacitación y tematica dictada', formato: 'Archivo Excel' },
  { numero: '6', descripcion: 'Evidencias (listados de asistencia, imágenes, videos, etc.) de las actividades de capacitación adelantadas a los conductores', formato: 'Archivo Comprimido' },
  { numero: '7', descripcion: 'Listado unificado de colaboradores de la organización, con mínimo los siguientes campos: nombre, identificación, teléfono, correo electrónico y cargo', formato: 'Archivo Excel' },
  { numero: '7A', descripcion: 'Copia del informe del lider del PESV sobre las acciones correctivas y oportunidades de mejora implementadas conforme a la auditoría realizada en la vigencia anterior', formato: 'Archivo PDF' },
]
const VARIABLES_C = [
  { codigo: '6.1', nombre: 'Número de excesos en la jornada diaria de trabajo de los conductores (eventos en los que los conductores han superado el tiempo máximo permitido en la legislación) por mes' },
  { codigo: '6.2', nombre: 'Total de días trabajados por todos los conductores' },
  { codigo: '8.1', nombre: 'Número diario de desplazamientos laborales con exceso de velocidad (casos en los que se superó el límite definido por la organización) por mes' },
  { codigo: '8.2', nombre: 'Número total de desplazamientos laborales' },
]
const EVIDENCIAS_C = [
  { numero: '1', descripcion: 'Certificación del Representante Legal donde consten los límites de velocidad definidos para desplazamientos laborales en las diferentes sedes que posee la organización, desagregados por departamento, ciudad y recorrido (origen-destino)', formato: 'PDF' },
  { numero: '2', descripcion: 'Copia del informe mensual presentado por el lider del PESV al comité sobre el total de desplazamientos laborales realizados, las multas impuestas por exceso de velocidad, llamados de atención dentro de las instalaciones y las mediciones realizadas', formato: 'PDF' },
  { numero: '3', descripcion: 'Listado de rutas de desplazamientos laborales con mínimo los siguientes campos: origen y destino según Divipol a nivel de municipios, solicitando registrar el punto, vereda o barrio de referencia; así como los kilómetros de cada ruta registrada y la frecuencia de uso trimestral por cada ruta', formato: 'Archivo Excel' },
  { numero: '4', descripcion: 'Control horario aplicado a todo el personal con la siguiente información: nombre completo, identificación, cargo, tipo de vinculación (contrato directo, prestación de servicios u honorarios, outsourcing, proveedor, practicante), rol (administrativo / operativo), fecha de medición, hora entrada, hora salida', formato: 'Archivo Excel' },
]
const VARIABLES_D = [
  { codigo: '7.1', nombre: 'Vehículos propios incluidos en el programa de gestión de la velocidad', periodo: 'MENSUAL' },
  { codigo: '7.2', nombre: 'Número de vehículos propios utilizados para desplazamientos laborales en el mes', periodo: 'MENSUAL' },
  { codigo: '7.3', nombre: 'Vehículos de contratistas incluidos en el programa de gestión de la velocidad', periodo: 'MENSUAL' },
  { codigo: '7.4', nombre: 'Número de vehículos de contratistas utilizados para desplazamientos laborales en el mes', periodo: 'MENSUAL' },
  { codigo: '7.5', nombre: 'Vehículos de terceros incluidos en el programa de gestión de la velocidad', periodo: 'MENSUAL' },
  { codigo: '7.6', nombre: 'Número de vehículos de terceros utilizados para desplazamientos laborales en el mes', periodo: 'MENSUAL' },
  { codigo: '9.1', nombre: 'Número de vehículos inspeccionados diariamente', periodo: 'MENSUAL' },
  { codigo: '9.2', nombre: 'Número de vehículos que operan diariamente', periodo: 'MENSUAL' },
  { codigo: '10.1', nombre: 'Numero total de actividades de mantenimiento preventivo programadas por trimestre', periodo: 'TRIMESTRAL' },
  { codigo: '10.2', nombre: 'Numero de actividades de mantenimiento preventivo ejecutadas por trimestre', periodo: 'TRIMESTRAL' },
]
const EVIDENCIAS_D = [
  { numero: '1', descripcion: 'Copia del informe mensual presentado por el lider del PESV al comité sobre el programa de gestión de velocidad y las mediciones realizadas', formato: 'PDF' },
  { numero: '2', descripcion: 'Cantidad de desplazamientos laborales realizados en vehículos', formato: 'Soporte' },
  { numero: '3', descripcion: 'Cantidad de desplazamientos laborales realizados en vehículos que fueron medidos', formato: 'Soporte' },
  { numero: '4', descripcion: 'Relación de infracciones por tipo o código de infracción a las normas de tránsito de los conductores de la organización, que contenga como mínimo: fecha, nombre del conductor, identificación del conductor, placa del vehículo, código por el cual se impuso la multa, departamento y ciudad de la infracción, organismo o autoridad que impuso la multa, estado del proceso contravencional o pago de la multa', formato: 'Relación' },
  { numero: '5', descripcion: 'Llamados de atención dentro de las instalaciones', formato: 'Soporte' },
  { numero: '6', descripcion: 'Relación Excel de los vehículos a los cuales fue realizada la inspección preoperativa, con mínimo los siguientes datos: fecha, placa, conductor, identificación, persona que realizó la verificación por parte de la empresa, identificación y cargo, aprobó o no aprobó', formato: 'Archivo Excel' },
  { numero: '7', descripcion: 'Copia de los formatos empleados para las inspecciones diarias de vehículos, seleccionados en forma aleatoria para el 10% del parque automotor, siempre y cuando sea mayor a 10 vehículos', formato: 'PDF' },
  { numero: '8', descripcion: 'Cantidad de vehículos que reportaron fallas durante el mes', formato: 'Soporte' },
  { numero: '9', descripcion: 'Relación de mantenimientos preventivos ejecutados para el 10% del parque automotor, seleccionado en forma aleatoria, siempre y cuando sea mayor a 10 vehículos, con mínimo los siguientes datos: fecha, placa, tipo de mantenimiento (preventivo / correctivo), establecimiento o centro especializado donde se realizó la intervención, NIT, nombre de la persona que realizó el mantenimiento, identificación y rol (conductor / mecánico / Ing. Mecánico)', formato: 'Archivo Excel' },
]
const MESES_SINST = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
function obtenerNitUsuario(user) {
  return (
    user?.nit ||
    user?.nitEmpresa ||
    user?.nit_empresa ||
    user?.empresaNit ||
    user?.empresa_nit ||
    ''
  )
}
function formatearValor(valor, tipo) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) {
    return '-'
  }
  if (tipo === 'moneda') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(numero)
  }
  if (tipo === 'km') {
    return `${new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 1,
    }).format(numero)} km`
  }
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(numero)
}
export default function SinstVigiaPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [formularioActivo, setFormularioActivo] = useState('A')
  const [vigencia, setVigencia] = useState(new Date().getFullYear())
  const [datosA, setDatosA] = useState(null)
  const [cargandoA, setCargandoA] = useState(false)
  const [errorA, setErrorA] = useState('')
  const [evidencias, setEvidencias] = useState([])
  const [cargandoEvidencias, setCargandoEvidencias] = useState(false)
  const [errorEvidencias, setErrorEvidencias] = useState('')
  const [tipoArchivoEvidencia, setTipoArchivoEvidencia] = useState('TODOS')
  const [periodicidadEvidencia, setPeriodicidadEvidencia] = useState('TODAS')
  const [mesEvidencia, setMesEvidencia] = useState(new Date().getMonth() + 1)
  const [trimestreEvidencia, setTrimestreEvidencia] = useState(
    Math.floor(new Date().getMonth() / 3) + 1
  )
  const [modalRutas, setModalRutas] = useState(false)
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (!storedUser) {
      router.push('/login')
      return
    }
    try {
      setUser(JSON.parse(storedUser))
    } catch (error) {
      console.error('Error leyendo sesión:', error)
      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }, [router])
  const formulario = useMemo(
    () => FORMULARIOS.find((item) => item.id === formularioActivo),
    [formularioActivo]
  )
  const vigencias = useMemo(() => {
    const actual = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, index) => actual - index)
  }, [])
  const cargarFormularioA = useCallback(async () => {
    if (!user) return
    const nit = obtenerNitUsuario(user)
    if (!nit) {
      setErrorA(
        'No fue posible identificar el NIT del CEA desde la sesión actual.'
      )
      setDatosA(null)
      return
    }
    setCargandoA(true)
    setErrorA('')
    try {
      const respuesta = await fetch(
        `/api/admin/sinst-vigia/formulario-a?anio=${vigencia}&nit=${encodeURIComponent(
          nit
        )}`,
        {
          method: 'GET',
          headers: {
            'x-cea-nit': nit,
          },
          cache: 'no-store',
        }
      )
      const tipoContenido =
        respuesta.headers.get('content-type') || ''
      let resultado = null
      if (tipoContenido.includes('application/json')) {
        resultado = await respuesta.json()
      } else {
        const contenido = await respuesta.text()
        console.error(
          'La API del Formulario A no devolvió JSON:',
          contenido
        )
        throw new Error(
          respuesta.status === 404
            ? 'No se encontró la API del Formulario A. Verifique que exista app/api/admin/sinst-vigia/formulario-a/route.js y reinicie el servidor de desarrollo.'
            : `La API del Formulario A respondió con un formato no válido (HTTP ${respuesta.status}). Revise la terminal de Next.js.`
        )
      }
      if (!respuesta.ok || resultado?.status !== 'success') {
        throw new Error(
          resultado?.message ||
            'No fue posible consultar la información del Formulario A.'
        )
      }
      setDatosA(resultado)
    } catch (error) {
      console.error('Error cargando Formulario A:', error)
      setDatosA(null)
      setErrorA(
        error?.message ||
          'No fue posible consultar la información del Formulario A.'
      )
    } finally {
      setCargandoA(false)
    }
  }, [user, vigencia])
  useEffect(() => {
    if (user && formularioActivo === 'A') {
      cargarFormularioA()
    }
  }, [user, formularioActivo, cargarFormularioA])
  const cargarEvidencias = useCallback(async () => {
    if (!user) return
    const nit = obtenerNitUsuario(user)
    if (!nit) {
      setErrorEvidencias('No fue posible identificar el NIT del CEA.')
      return
    }
    setCargandoEvidencias(true)
    setErrorEvidencias('')
    try {
      const params = new URLSearchParams({
        nit,
        anio: String(vigencia),
      })
      if (tipoArchivoEvidencia !== 'TODOS') {
        params.set('tipo_archivo', tipoArchivoEvidencia)
      }
      if (periodicidadEvidencia !== 'TODAS') {
        params.set('periodicidad', periodicidadEvidencia)
        if (periodicidadEvidencia === 'MENSUAL') {
          params.set('mes', String(mesEvidencia))
        }
        if (periodicidadEvidencia === 'TRIMESTRAL') {
          params.set('trimestre', String(trimestreEvidencia))
        }
      }
      const respuesta = await fetch(
        `/api/admin/sinst-vigia/evidencias?${params.toString()}`,
        {
          headers: { 'x-cea-nit': nit },
          cache: 'no-store',
        }
      )
      const resultado = await respuesta.json()
      if (!respuesta.ok || resultado?.ok !== true) {
        throw new Error(
          resultado?.error || 'No fue posible consultar las evidencias.'
        )
      }
      setEvidencias(Array.isArray(resultado.evidencias) ? resultado.evidencias : [])
    } catch (error) {
      console.error('Error cargando evidencias:', error)
      setEvidencias([])
      setErrorEvidencias(
        error?.message || 'No fue posible consultar las evidencias.'
      )
    } finally {
      setCargandoEvidencias(false)
    }
  }, [
    user,
    vigencia,
    tipoArchivoEvidencia,
    periodicidadEvidencia,
    mesEvidencia,
    trimestreEvidencia,
  ])
  useEffect(() => {
    if (user && formularioActivo === 'EVIDENCIAS') {
      cargarEvidencias()
    }
  }, [user, formularioActivo, cargarEvidencias])
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-sm text-gray-600">Cargando...</p>
      </div>
    )
  }
  const nit = obtenerNitUsuario(user)
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-xl shadow-sm">
          <EncabezadoModulo
            titulo="Sistema Inteligente Nacional de Supervisión al Transporte"
            subtitulo="SINST - VIGIA 2 · Preparación de información y evidencias PESV"
            icono={ShieldCheck}
            rutaRegreso="/admin"
            textoRegreso="Menú Administrativo"
            permitirPersonalizacion={false}
          />
        </div>
        <section className="mt-5">
          <nav className="flex flex-wrap items-end gap-1.5" aria-label="Formularios SINST - VIGIA 2">
            {FORMULARIOS.map((item) => {
              const Icono = item.icono
              const activo = formularioActivo === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFormularioActivo(item.id)}
                  title={`${item.subtitulo} · ${item.periodicidad}`}
                  className={`group inline-flex items-center gap-2 rounded-t-lg border px-3.5 py-2 text-[11px] font-bold uppercase transition-all duration-200 ${
                    activo
                      ? 'border-slate-700 bg-slate-700 text-white shadow-md'
                      : 'border-slate-300 bg-slate-200 text-slate-700 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-400 hover:text-slate-900 hover:shadow-sm'
                  }`}
                >
                  <Icono className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.titulo}</span>
                  <span
                    className={`hidden text-[9px] font-semibold normal-case lg:inline ${
                      activo ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-700'
                    }`}
                  >
                    · {item.periodicidad}
                  </span>
                </button>
              )
            })}
          </nav>
        </section>
        <section
          className="overflow-hidden rounded-b-xl rounded-tr-xl border bg-white shadow-sm"
          style={{ borderColor: PALETA.bordeTabla }}
        >
          <div className="flex flex-col gap-3 bg-slate-600 px-5 py-3 text-white md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <h2 className="text-sm font-bold uppercase">
                {formularioActivo === 'EVIDENCIAS'
                  ? 'Expediente de evidencias'
                  : 'Datos del formulario'}
              </h2>
              <p className="mt-1 text-xs text-slate-200">
                {formularioActivo === 'A'
                  ? 'Valores calculados por DATA-CEA a partir de Siniestros y Horarios.'
                  : formularioActivo === 'EVIDENCIAS'
                    ? 'Documentos PDF y Excel generados, cargados o aprobados para los formularios SINST - VIGIA 2.'
                    : `Estructura oficial del ${formulario?.titulo}: ${formulario?.subtitulo}.`}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-400 bg-slate-700/70 px-3 py-2">
              <CalendarDays className="h-4 w-4 text-slate-200" />
              <label
                htmlFor="vigencia-sinst"
                className="text-[10px] font-bold uppercase text-slate-200"
              >
                Vigencia
              </label>
              <select
                id="vigencia-sinst"
                value={vigencia}
                onChange={(event) => setVigencia(Number(event.target.value))}
                className="rounded-md border border-slate-400 bg-white px-2 py-1 text-sm font-bold text-slate-800 outline-none transition focus:border-slate-300"
              >
                {vigencias.map((anio) => (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="p-5 md:p-6">
            {formularioActivo === 'A' && (
              <FormularioA
                datos={datosA}
                cargando={cargandoA}
                error={errorA}
                recargar={cargarFormularioA}
                user={user}
                vigencia={vigencia}
              />
            )}
            {formularioActivo === 'B' && <FormularioB user={user} vigencia={vigencia} />}
            {formularioActivo === 'C' && <FormularioC />}
            {formularioActivo === 'D' && <FormularioD />}
            {formularioActivo === 'EVIDENCIAS' && (
              <PanelEvidencias
                evidencias={evidencias}
                cargando={cargandoEvidencias}
                error={errorEvidencias}
                tipoArchivo={tipoArchivoEvidencia}
                setTipoArchivo={setTipoArchivoEvidencia}
                periodicidad={periodicidadEvidencia}
                setPeriodicidad={setPeriodicidadEvidencia}
                mes={mesEvidencia}
                setMes={setMesEvidencia}
                trimestre={trimestreEvidencia}
                setTrimestre={setTrimestreEvidencia}
                onRecargar={cargarEvidencias}
                onAdministrarRutas={() => setModalRutas(true)}
              />
            )}
          </div>
        </section>
        {modalRutas && (
          <ModalRutas
            user={user}
            onClose={() => setModalRutas(false)}
          />
        )}
      </div>
    </div>
  )
}
function FormularioA({ datos, cargando, error, recargar, user, vigencia }) {
  const [trimestreEvidencias, setTrimestreEvidencias] = useState(1)
  const [generandoA1, setGenerandoA1] = useState(false)
  const [errorGeneracionA1, setErrorGeneracionA1] = useState('')
  const [generandoA2, setGenerandoA2] = useState(false)
  const [errorGeneracionA2, setErrorGeneracionA2] = useState('')
  const [generandoA3, setGenerandoA3] = useState(false)
  const [errorGeneracionA3, setErrorGeneracionA3] = useState('')
  const [modalA3, setModalA3] = useState(false)
  const [borradorA3, setBorradorA3] = useState(null)
  const [confirmacionA3, setConfirmacionA3] = useState(false)
  const [generandoA4, setGenerandoA4] = useState(false)
  const [errorGeneracionA4, setErrorGeneracionA4] = useState('')
  const [generandoA5, setGenerandoA5] = useState(false)
  const [errorGeneracionA5, setErrorGeneracionA5] = useState('')
  const [generandoA6, setGenerandoA6] = useState(false)
  const [errorGeneracionA6, setErrorGeneracionA6] = useState('')
  const [generandoA7, setGenerandoA7] = useState(false)
  const [errorGeneracionA7, setErrorGeneracionA7] = useState('')
  const [modalA4, setModalA4] = useState(false)
  const [borradorA4, setBorradorA4] = useState(null)
  const [confirmacionA4, setConfirmacionA4] = useState(false)
  const [recursosDeclaradosA4, setRecursosDeclaradosA4] = useState({})
  const [medidasSeleccionadasA4, setMedidasSeleccionadasA4] = useState([])
  const [actividadesPersonalizadasA4, setActividadesPersonalizadasA4] = useState([])
  const [nuevaActividadA4, setNuevaActividadA4] = useState('')
  const generarEvidenciaA1 = async () => {
    if (generandoA1) return
    const nit = obtenerNitUsuario(user)
    if (!nit) {
      setErrorGeneracionA1(
        'No fue posible identificar el NIT del CEA desde la sesión actual.'
      )
      return
    }
    setGenerandoA1(true)
    setErrorGeneracionA1('')
    try {
      const respuesta = await fetch('/api/admin/sinst-vigia/evidencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cea-nit': nit,
        },
        body: JSON.stringify({
          accion: 'GENERAR_A1',
          nit,
          anio: vigencia,
          trimestre: trimestreEvidencias,
        }),
      })
      const contentType = respuesta.headers.get('content-type') || ''
      if (!respuesta.ok) {
        let mensaje = 'No fue posible generar la evidencia A-1.'
        if (contentType.includes('application/json')) {
          const detalle = await respuesta.json()
          mensaje = detalle?.error || detalle?.message || mensaje
        } else {
          const detalle = await respuesta.text()
          if (detalle) mensaje = detalle
        }
        throw new Error(mensaje)
      }
      if (!contentType.includes('spreadsheetml')) {
        throw new Error(
          'La respuesta recibida no corresponde a un archivo Excel válido.'
        )
      }
      const archivo = await respuesta.blob()
      const disposition = respuesta.headers.get('content-disposition') || ''
      const coincidencia = disposition.match(/filename="?([^";]+)"?/i)
      const nombreArchivo =
        coincidencia?.[1] ||
        `A1_registro_vehiculos_siniestrados_${vigencia}_T${trimestreEvidencias}.xlsx`
      const url = URL.createObjectURL(archivo)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = nombreArchivo
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      URL.revokeObjectURL(url)
    } catch (errorGeneracion) {
      console.error('Error generando evidencia A-1:', errorGeneracion)
      setErrorGeneracionA1(
        errorGeneracion?.message || 'No fue posible generar la evidencia A-1.'
      )
    } finally {
      setGenerandoA1(false)
    }
  }
  const generarEvidenciaA2 = async () => {
    if (generandoA2) return
    const nit = obtenerNitUsuario(user)
    if (!nit) {
      setErrorGeneracionA2(
        'No fue posible identificar el NIT del CEA desde la sesión actual.'
      )
      return
    }
    setGenerandoA2(true)
    setErrorGeneracionA2('')
    try {
      const respuesta = await fetch('/api/admin/sinst-vigia/evidencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cea-nit': nit,
        },
        body: JSON.stringify({
          accion: 'PREPARAR_A2',
          nit,
          anio: vigencia,
          trimestre: trimestreEvidencias,
        }),
      })
      const resultado = await respuesta.json()
      if (!respuesta.ok || resultado?.ok !== true) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            'No fue posible preparar la evidencia A-2.'
        )
      }
      const parametros = new URLSearchParams({
        nit,
        anio: String(vigencia),
        trimestre: String(trimestreEvidencias),
      })
      window.open(
        `/admin/sinst-vigia/evidencias/a2?${parametros.toString()}`,
        '_blank',
        'noopener,noreferrer'
      )
    } catch (errorGeneracion) {
      setErrorGeneracionA2(
        errorGeneracion?.message ||
          'No fue posible generar la evidencia A-2.'
      )
    } finally {
      setGenerandoA2(false)
    }
  }
  const abrirEvidenciaA3 = async () => {
    if (generandoA3) return
    const nit = obtenerNitUsuario(user)
    if (!nit) {
      setErrorGeneracionA3(
        'No fue posible identificar el NIT del CEA desde la sesión actual.'
      )
      return
    }
    setGenerandoA3(true)
    setErrorGeneracionA3('')
    setConfirmacionA3(false)
    try {
      const respuesta = await fetch('/api/admin/sinst-vigia/evidencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cea-nit': nit,
        },
        body: JSON.stringify({
          accion: 'PREPARAR_A3',
          nit,
          anio: vigencia,
          trimestre: trimestreEvidencias,
        }),
      })
      const resultado = await respuesta.json()
      if (!respuesta.ok || resultado?.ok !== true) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            'No fue posible preparar la evidencia A-3.'
        )
      }
      setBorradorA3(resultado)
      setModalA3(true)
    } catch (errorGeneracion) {
      setErrorGeneracionA3(
        errorGeneracion?.message ||
          'No fue posible preparar la evidencia A-3.'
      )
    } finally {
      setGenerandoA3(false)
    }
  }
  const generarPdfA3 = () => {
    const nit = obtenerNitUsuario(user)
    if (!nit || !confirmacionA3) return
    const parametros = new URLSearchParams({
      nit,
      anio: String(vigencia),
      trimestre: String(trimestreEvidencias),
    })
    setModalA3(false)
    window.open(
      `/admin/sinst-vigia/evidencias/a3?${parametros.toString()}`,
      '_blank',
      'noopener,noreferrer'
    )
  }
  const generarEvidenciaA5 = async () => {
    if (generandoA5) return
    const nit = obtenerNitUsuario(user)
    if (!nit) {
      setErrorGeneracionA5('No fue posible identificar el NIT del CEA desde la sesión actual.')
      return
    }
    setGenerandoA5(true)
    setErrorGeneracionA5('')
    try {
      const respuesta = await fetch('/api/admin/sinst-vigia/evidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cea-nit': nit },
        body: JSON.stringify({
          accion: 'GENERAR_A5',
          nit,
          anio: vigencia,
          trimestre: trimestreEvidencias,
        }),
      })
      const contentType = respuesta.headers.get('content-type') || ''
      if (!respuesta.ok) {
        let mensaje = 'No fue posible generar la evidencia A-5.'
        if (contentType.includes('application/json')) {
          const detalle = await respuesta.json()
          mensaje = detalle?.error || detalle?.message || mensaje
        } else {
          const detalle = await respuesta.text()
          if (detalle) mensaje = detalle
        }
        throw new Error(mensaje)
      }
      if (!contentType.includes('spreadsheetml')) {
        throw new Error('La respuesta recibida no corresponde a un archivo Excel válido.')
      }
      const archivo = await respuesta.blob()
      const disposition = respuesta.headers.get('content-disposition') || ''
      const coincidencia = disposition.match(/filename="?([^";]+)"?/i)
      const nombreArchivo =
        coincidencia?.[1] ||
        `A5_detalle_cuentas_terceros_${vigencia}_T${trimestreEvidencias}.xlsx`
      const url = URL.createObjectURL(archivo)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = nombreArchivo
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      URL.revokeObjectURL(url)
    } catch (errorGeneracion) {
      console.error('Error generando evidencia A-5:', errorGeneracion)
      setErrorGeneracionA5(
        errorGeneracion?.message || 'No fue posible generar la evidencia A-5.'
      )
    } finally {
      setGenerandoA5(false)
    }
  }
  const generarEvidenciaA6 = async () => {
    if (generandoA6) return
    const nit = obtenerNitUsuario(user)
    if (!nit) {
      setErrorGeneracionA6('No fue posible identificar el NIT del CEA desde la sesión actual.')
      return
    }
    setGenerandoA6(true)
    setErrorGeneracionA6('')
    try {
      const respuesta = await fetch('/api/admin/sinst-vigia/evidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cea-nit': nit },
        body: JSON.stringify({ accion: 'PREPARAR_A6', nit, anio: vigencia, trimestre: trimestreEvidencias }),
      })
      const resultado = await respuesta.json()
      if (!respuesta.ok || resultado?.ok !== true) {
        throw new Error(resultado?.error || resultado?.message || 'No fue posible preparar la evidencia A-6.')
      }
      const token = `a6_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(`sinst_vigia_${token}`, JSON.stringify(resultado))
      const parametros = new URLSearchParams({ nit, anio: String(vigencia), trimestre: String(trimestreEvidencias), token })
      window.open(`/admin/sinst-vigia/evidencias/a6?${parametros.toString()}`, '_blank', 'noopener,noreferrer')
    } catch (errorGeneracion) {
      console.error('Error preparando evidencia A-6:', errorGeneracion)
      setErrorGeneracionA6(errorGeneracion?.message || 'No fue posible preparar la evidencia A-6.')
    } finally {
      setGenerandoA6(false)
    }
  }
  const generarEvidenciaA7 = async () => {
    if (generandoA7) return
    const nit = obtenerNitUsuario(user)
    if (!nit) {
      setErrorGeneracionA7('No fue posible identificar el NIT del CEA desde la sesión actual.')
      return
    }
    setGenerandoA7(true)
    setErrorGeneracionA7('')
    try {
      const respuesta = await fetch('/api/admin/sinst-vigia/evidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cea-nit': nit },
        body: JSON.stringify({
          accion: 'GENERAR_A7',
          nit,
          anio: vigencia,
          trimestre: trimestreEvidencias,
        }),
      })
      const contentType = respuesta.headers.get('content-type') || ''
      if (!respuesta.ok) {
        let mensaje = 'No fue posible generar la evidencia A-7.'
        if (contentType.includes('application/json')) {
          const detalle = await respuesta.json()
          mensaje = detalle?.error || detalle?.message || mensaje
        } else {
          const detalle = await respuesta.text()
          if (detalle) mensaje = detalle
        }
        throw new Error(mensaje)
      }
      if (!contentType.includes('spreadsheetml')) {
        throw new Error('La respuesta recibida no corresponde a un archivo Excel válido.')
      }
      const archivo = await respuesta.blob()
      const disposition = respuesta.headers.get('content-disposition') || ''
      const coincidencia = disposition.match(/filename="?([^";]+)"?/i)
      const nombreArchivo =
        coincidencia?.[1] ||
        `A7_detalle_provisiones_demandas_${vigencia}_T${trimestreEvidencias}.xlsx`
      const url = URL.createObjectURL(archivo)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = nombreArchivo
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      URL.revokeObjectURL(url)
    } catch (errorGeneracion) {
      console.error('Error generando evidencia A-7:', errorGeneracion)
      setErrorGeneracionA7(
        errorGeneracion?.message || 'No fue posible generar la evidencia A-7.'
      )
    } finally {
      setGenerandoA7(false)
    }
  }
  const abrirEvidenciaA4 = async () => {
    if (generandoA4) return
    const nit = obtenerNitUsuario(user)
    if (!nit) {
      setErrorGeneracionA4('No fue posible identificar el NIT del CEA desde la sesión actual.')
      return
    }
    setGenerandoA4(true)
    setErrorGeneracionA4('')
    setConfirmacionA4(false)
    try {
      const respuesta = await fetch('/api/admin/sinst-vigia/evidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cea-nit': nit },
        body: JSON.stringify({
          accion: 'PREPARAR_A4',
          nit,
          anio: vigencia,
          trimestre: trimestreEvidencias,
        }),
      })
      const resultado = await respuesta.json()
      if (!respuesta.ok || resultado?.ok !== true) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            'No fue posible preparar la evidencia A-4.'
        )
      }
      setBorradorA4(resultado)
      setRecursosDeclaradosA4(
        Object.fromEntries(
          (resultado?.evidencia?.categorias_disponibles || []).map((item) => [
            item.categoria_pesv,
            '',
          ])
        )
      )
      setMedidasSeleccionadasA4([])
      setActividadesPersonalizadasA4([])
      setNuevaActividadA4('')
      setModalA4(true)
    } catch (errorGeneracion) {
      setErrorGeneracionA4(
        errorGeneracion?.message || 'No fue posible preparar la evidencia A-4.'
      )
    } finally {
      setGenerandoA4(false)
    }
  }
  const cambiarRecursoDeclaradoA4 = (categoria, valor) => {
    const limpio = String(valor || '').replace(/[^\d]/g, '')
    setRecursosDeclaradosA4((actual) => ({ ...actual, [categoria]: limpio }))
    setConfirmacionA4(false)
  }
  const alternarMedidaA4 = (id) => {
    setMedidasSeleccionadasA4((actual) =>
      actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id]
    )
    setConfirmacionA4(false)
  }
  const agregarActividadA4 = () => {
    const actividad = nuevaActividadA4.trim()
    if (!actividad) return
    if (actividadesPersonalizadasA4.some((item) => item.toLowerCase() === actividad.toLowerCase())) {
      setNuevaActividadA4('')
      return
    }
    setActividadesPersonalizadasA4((actual) => [...actual, actividad])
    setNuevaActividadA4('')
    setConfirmacionA4(false)
  }
  const eliminarActividadA4 = (indice) => {
    setActividadesPersonalizadasA4((actual) => actual.filter((_, i) => i !== indice))
    setConfirmacionA4(false)
  }
  const totalDeclaradoA4 = Object.values(recursosDeclaradosA4).reduce(
    (total, valor) => total + Number(valor || 0),
    0
  )
  const generarPdfA4 = () => {
    const nit = obtenerNitUsuario(user)
    if (!nit || !confirmacionA4) return
    const recursosDeclarados = (borradorA4?.evidencia?.categorias_disponibles || []).map((item) => ({
      categoria_pesv: item.categoria_pesv,
      valor: Number(recursosDeclaradosA4[item.categoria_pesv] || 0),
    }))
    const payload = {
      recursos_declarados: borradorA4?.evidencia?.permite_valores_declarados ? recursosDeclarados : [],
      medidas_seleccionadas: medidasSeleccionadasA4,
      actividades_personalizadas: actividadesPersonalizadasA4,
      confirmada: true,
    }
    const token = `a4_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    try {
      localStorage.setItem(`sinst_vigia_${token}`, JSON.stringify(payload))
    } catch {
      setErrorGeneracionA4('No fue posible conservar temporalmente los datos confirmados para generar el PDF.')
      return
    }
    const parametros = new URLSearchParams({
      nit,
      anio: String(vigencia),
      trimestre: String(trimestreEvidencias),
      token,
    })
    setModalA4(false)
    window.open(
      `/admin/sinst-vigia/evidencias/a4?${parametros.toString()}`,
      '_blank',
      'noopener,noreferrer'
    )
  }
  if (cargando) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Consultando información del Formulario A...
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
          <div>
            <p className="text-sm font-bold text-red-800">
              No fue posible cargar el Formulario A
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={recargar}
              className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-red-700 shadow-sm ring-1 ring-red-200"
            >
              Intentar nuevamente
            </button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-400">
        <table className="min-w-[900px] w-full border-collapse border border-slate-400 text-sm">
          <thead>
            <tr style={{ backgroundColor: PALETA.encabezadoTabla }}>
              <th className="border border-slate-400 px-3 py-3 text-left">
                Código
              </th>
              <th className="border border-slate-400 px-3 py-3 text-left">
                Variable
              </th>
              <th className="border border-slate-400 px-3 py-3 text-center">
                Trimestre I
              </th>
              <th className="border border-slate-400 px-3 py-3 text-center">
                Trimestre II
              </th>
              <th className="border border-slate-400 px-3 py-3 text-center">
                Trimestre III
              </th>
              <th className="border border-slate-400 px-3 py-3 text-center">
                Trimestre IV
              </th>
              <th className="border border-slate-400 px-3 py-3 text-center">
                Acumulado
              </th>
            </tr>
          </thead>
          <tbody>
            {VARIABLES_A.map((variable) => (
              <tr key={variable.codigo} className="hover:bg-slate-50">
                <td className="border border-slate-300 px-3 py-3 font-bold text-slate-700">
                  {variable.codigo}
                </td>
                <td className="border border-slate-300 px-3 py-3 text-slate-700">
                  {variable.nombre}
                </td>
                {[1, 2, 3, 4].map((trimestre) => (
                  <td
                    key={trimestre}
                    className="border border-slate-300 px-3 py-3 text-center font-semibold text-slate-800"
                  >
                    {formatearValor(
                      datos?.trimestres?.[trimestre]?.[variable.codigo],
                      variable.tipo
                    )}
                  </td>
                ))}
                <td className="border border-slate-300 px-3 py-3 text-center font-bold text-slate-900">
                  {formatearValor(
                    [1, 2, 3, 4].reduce(
                      (total, trimestre) =>
                        total +
                        (Number(
                          datos?.trimestres?.[trimestre]?.[variable.codigo]
                        ) || 0),
                      0
                    ),
                    variable.tipo
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="text-sm font-bold uppercase text-slate-700">
          Descripción de las evidencias
        </h3>
        <div className="w-full sm:w-56">
          <label
            htmlFor="trimestre-evidencias-a"
            className="mb-1 block text-xs font-extrabold uppercase text-[#29465D]"
          >
            Trimestre
          </label>
          <select
            id="trimestre-evidencias-a"
            value={trimestreEvidencias}
            onChange={(event) =>
              setTrimestreEvidencias(Number(event.target.value))
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value={1}>Trimestre I</option>
            <option value={2}>Trimestre II</option>
            <option value={3}>Trimestre III</option>
            <option value={4}>Trimestre IV</option>
          </select>
        </div>
      </div>
      {errorGeneracionA1 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorGeneracionA1}</span>
        </div>
      )}
      {errorGeneracionA2 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorGeneracionA2}</span>
        </div>
      )}
      {errorGeneracionA3 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorGeneracionA3}</span>
        </div>
      )}
      {errorGeneracionA4 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorGeneracionA4}</span>
        </div>
      )}
      {errorGeneracionA5 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorGeneracionA5}</span>
        </div>
      )}
      {errorGeneracionA6 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorGeneracionA6}</span>
        </div>
      )}
      {errorGeneracionA7 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorGeneracionA7}</span>
        </div>
      )}
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-300">
        <table className="min-w-[900px] w-full border-collapse border border-slate-400 text-sm">
          <thead>
            <tr style={{ backgroundColor: PALETA.encabezadoTabla }}>
              <th className="w-16 border border-slate-400 px-3 py-3 text-center">
                N.º
              </th>
              <th className="border border-slate-400 px-3 py-3 text-left">
                Descripción de la evidencia
              </th>
              <th className="w-28 border border-slate-400 px-3 py-3 text-center">
                Formato
              </th>
              <th className="w-52 border border-slate-400 px-3 py-3 text-center">
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {EVIDENCIAS_A.map((evidencia) => (
              <tr key={evidencia.numero} className="hover:bg-slate-50">
                <td className="border border-slate-300 px-3 py-3 text-center font-bold text-slate-700">
                  {evidencia.numero}
                </td>
                <td className="border border-slate-300 px-3 py-3 leading-6 text-slate-700">
                  {evidencia.descripcion}
                </td>
                <td className="border border-slate-300 px-3 py-3 text-center">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                    {evidencia.formato}
                  </span>
                </td>
                <td className="border border-slate-300 px-3 py-3 text-center">
                  {evidencia.numero === 1 ? (
                    <button
                      type="button"
                      onClick={generarEvidenciaA1}
                      disabled={generandoA1}
                      title={`Generar Excel de la evidencia A-1 para el Trimestre ${trimestreEvidencias}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generandoA1 ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {generandoA1 ? 'Generando...' : 'Generar evidencia'}
                    </button>
                  ) : evidencia.numero === 2 ? (
                    <button
                      type="button"
                      onClick={generarEvidenciaA2}
                      disabled={generandoA2}
                      title={`Generar PDF consolidado de la evidencia A-2 para el Trimestre ${trimestreEvidencias}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generandoA2 ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      {generandoA2 ? 'Preparando...' : 'Generar PDF'}
                    </button>
                  ) : evidencia.numero === 3 ? (
                    <button
                      type="button"
                      onClick={abrirEvidenciaA3}
                      disabled={generandoA3}
                      title={`Preparar certificación y justificación A-3 para el Trimestre ${trimestreEvidencias}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generandoA3 ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      {generandoA3 ? 'Preparando...' : 'Generar PDF'}
                    </button>
                  ) : evidencia.numero === 4 ? (
                    <button
                      type="button"
                      onClick={abrirEvidenciaA4}
                      disabled={generandoA4}
                      title={`Preparar certificación A-4 para el Trimestre ${trimestreEvidencias}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generandoA4 ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      {generandoA4 ? 'Preparando...' : 'Generar PDF'}
                    </button>
                  ) : evidencia.numero === 5 ? (
                    <button
                      type="button"
                      onClick={generarEvidenciaA5}
                      disabled={generandoA5}
                      title={`Generar Excel de la evidencia A-5 para el Trimestre ${trimestreEvidencias}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generandoA5 ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {generandoA5 ? 'Generando...' : 'Generar Excel'}
                    </button>
                  ) : evidencia.numero === 6 ? (
                    <button
                      type="button"
                      onClick={generarEvidenciaA6}
                      disabled={generandoA6}
                      title={`Generar PDF de la evidencia A-6 para el Trimestre ${trimestreEvidencias}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generandoA6 ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      {generandoA6 ? 'Preparando...' : 'Generar PDF'}
                    </button>
                  ) : evidencia.numero === 7 ? (
                    <button
                      type="button"
                      onClick={generarEvidenciaA7}
                      disabled={generandoA7}
                      title={`Generar Excel de la evidencia A-7 para el Trimestre ${trimestreEvidencias}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generandoA7 ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {generandoA7 ? 'Generando...' : 'Generar Excel'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Se conectará en una etapa posterior"
                      className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500"
                    >
                      <Download className="h-4 w-4" />
                      Gestionar evidencia
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalA3 && borradorA3 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div
              className="flex items-start justify-between gap-4 px-5 py-4 text-white"
              style={{ backgroundColor: PALETA.tituloSeccion }}
            >
              <div>
                <p className="text-sm font-black">Preparar evidencia A-3</p>
                <p className="mt-1 text-xs text-slate-200">
                  Certificación y justificación · Trimestre {trimestreEvidencias} · {vigencia}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalA3(false)}
                className="rounded-lg p-1.5 hover:bg-white/10"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Evidencia oficial
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {borradorA3?.evidencia?.descripcion_oficial}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">CEA</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {borradorA3?.empresa?.razon_social || '-'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">NIT</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {borradorA3?.empresa?.nit || '-'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    Representante legal
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {borradorA3?.evidencia?.representante_legal || '-'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Nivel PESV</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">Básico</p>
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-900">
                  Documento que se generará
                </p>
                <p className="mt-2 text-xs leading-5 text-amber-800">
                  DATA-CEA preparará una certificación y justificación en PDF.
                  No se crearán registros de divulgación, retroalimentación ni
                  investigación que no existan. El documento quedará listo para
                  revisión y firma del representante legal.
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 p-4">
                <input
                  type="checkbox"
                  checked={confirmacionA3}
                  onChange={(e) => setConfirmacionA3(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span className="text-xs leading-5 text-slate-700">
                  Confirmo que revisé los datos institucionales y autorizo
                  preparar el documento para revisión y firma del representante legal.
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setModalA3(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={generarPdfA3}
                disabled={!confirmacionA3}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                Preparar PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {modalA4 && borradorA4 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 px-5 py-4 text-white" style={{ backgroundColor: PALETA.tituloSeccion }}>
              <div>
                <p className="text-sm font-black">Preparar evidencia A-4</p>
                <p className="mt-1 text-xs text-slate-200">Recursos y medidas implementadas · Trimestre {trimestreEvidencias} · {vigencia}</p>
              </div>
              <button type="button" onClick={() => setModalA4(false)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Evidencia oficial</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{borradorA4?.evidencia?.descripcion_oficial}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">CEA</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{borradorA4?.empresa?.razon_social || '-'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">NIT</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{borradorA4?.empresa?.nit || '-'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Representante legal</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{borradorA4?.evidencia?.representante_legal || '-'}</p>
                </div>
              </div>
              <section className="space-y-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-700">1. Recursos económicos ejecutados</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {borradorA4?.evidencia?.permite_valores_declarados
                      ? 'No se encontraron egresos PESV históricos en DATA-CEA para este trimestre. Registre únicamente los valores realmente ejecutados durante el periodo; esta información se utilizará para la certificación y no creará movimientos en Caja.'
                      : 'Los valores fueron obtenidos automáticamente de los egresos PESV registrados en Caja para el periodo. No pueden sustituirse manualmente desde SINST.'}
                  </p>
                </div>
                {borradorA4?.evidencia?.permite_valores_declarados ? (
                  <div className="overflow-hidden rounded-xl border border-slate-300">
                    <table className="w-full border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="border-b border-slate-300 px-3 py-2 text-left">Destinación PESV</th>
                          <th className="w-48 border-b border-slate-300 px-3 py-2 text-right">Valor ejecutado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(borradorA4?.evidencia?.categorias_disponibles || []).map((item) => (
                          <tr key={item.categoria_pesv}>
                            <td className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">{item.categoria}</td>
                            <td className="border-b border-slate-200 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-500">$</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={recursosDeclaradosA4[item.categoria_pesv] || ''}
                                  onChange={(e) => cambiarRecursoDeclaradoA4(item.categoria_pesv, e.target.value)}
                                  placeholder="0"
                                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-right font-semibold outline-none focus:border-orange-500"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50">
                        <tr>
                          <td className="px-3 py-3 text-right font-black text-slate-800">TOTAL RECURSOS EJECUTADOS</td>
                          <td className="px-3 py-3 text-right font-black text-slate-900">
                            {Number(totalDeclaradoA4).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-300">
                    <table className="w-full border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="border-b border-slate-300 px-3 py-2 text-left">Destinación PESV</th>
                          <th className="border-b border-slate-300 px-3 py-2 text-center">Movimientos</th>
                          <th className="border-b border-slate-300 px-3 py-2 text-right">Valor ejecutado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(borradorA4?.evidencia?.resumen || []).map((item) => (
                          <tr key={item.categoria_pesv}>
                            <td className="border-b border-slate-200 px-3 py-2">
                              <p className="font-semibold text-slate-800">{item.categoria}</p>
                              {item.conceptos?.length > 0 && <p className="mt-1 text-[10px] text-slate-500">{item.conceptos.join(' · ')}</p>}
                            </td>
                            <td className="border-b border-slate-200 px-3 py-2 text-center">{item.cantidad_movimientos}</td>
                            <td className="border-b border-slate-200 px-3 py-2 text-right font-semibold">
                              {Number(item.valor || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50">
                        <tr>
                          <td colSpan={2} className="px-3 py-3 text-right font-black text-slate-800">TOTAL RECURSOS EJECUTADOS</td>
                          <td className="px-3 py-3 text-right font-black text-slate-900">
                            {Number(borradorA4?.evidencia?.total_recursos_ejecutados || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                {Number(borradorA4?.evidencia?.cantidad_pendientes_legalizacion || 0) > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                    Hay {borradorA4.evidencia.cantidad_pendientes_legalizacion} entrega(s) PESV pendiente(s) o parcial(es) de legalización. No se incluyen en el valor certificado hasta que queden legalizadas.
                  </div>
                )}
              </section>
              <section className="space-y-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-700">2. Medidas y acciones implementadas para reducir la siniestralidad vial</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Seleccione solamente las medidas que realmente fueron implementadas durante el trimestre. Estas acciones pueden existir aunque no hayan generado un costo específico.</p>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {(borradorA4?.evidencia?.medidas_sugeridas || []).map((item) => (
                    <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={medidasSeleccionadasA4.includes(item.id)}
                        onChange={() => alternarMedidaA4(item.id)}
                        className="mt-0.5 h-4 w-4"
                      />
                      <span className="text-xs leading-5 text-slate-700">{item.texto}</span>
                    </label>
                  ))}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-700">Otras actividades o acciones implementadas</p>
                  <p className="mt-1 text-[11px] text-slate-500">Agregue actividades propias del CEA que no estén incluidas en la lista anterior.</p>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={nuevaActividadA4}
                      onChange={(e) => setNuevaActividadA4(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          agregarActividadA4()
                        }
                      }}
                      maxLength={500}
                      placeholder="Ej.: Jornada interna de sensibilización sobre conducción preventiva"
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-orange-500"
                    />
                    <button type="button" onClick={agregarActividadA4} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
                      Agregar
                    </button>
                  </div>
                  {actividadesPersonalizadasA4.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {actividadesPersonalizadasA4.map((actividad, indice) => (
                        <div key={`${actividad}-${indice}`} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <span className="text-xs leading-5 text-slate-700">{actividad}</span>
                          <button type="button" onClick={() => eliminarActividadA4(indice)} className="shrink-0 text-[11px] font-bold text-red-600 hover:text-red-700">Eliminar</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 p-4">
                <input type="checkbox" checked={confirmacionA4} onChange={(e) => setConfirmacionA4(e.target.checked)} className="mt-0.5 h-4 w-4" />
                <span className="text-xs leading-5 text-slate-700">
                  Confirmo que revisé los datos institucionales y que los recursos, medidas y actividades seleccionados o declarados corresponden a lo efectivamente ejecutado o implementado por el CEA durante el trimestre indicado.
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => setModalA4(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={generarPdfA4} disabled={!confirmacionA4} className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                Generar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
function SelectorPeriodoEvidencias({ tipo = 'TRIMESTRAL', valor, onChange }) {
  if (tipo === 'MENSUAL') {
    return (
      <div className="w-full sm:w-56">
        <label className="mb-1 block text-xs font-extrabold uppercase text-[#29465D]">
          Mes
        </label>
        <select
          value={valor}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-500"
        >
          {MESES_SINST.map((mes, index) => (
            <option key={mes} value={index + 1}>{mes}</option>
          ))}
        </select>
      </div>
    )
  }
  return (
    <div className="w-full sm:w-56">
      <label className="mb-1 block text-xs font-extrabold uppercase text-[#29465D]">
        Trimestre
      </label>
      <select
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-500"
      >
        <option value={1}>Trimestre I</option>
        <option value={2}>Trimestre II</option>
        <option value={3}>Trimestre III</option>
        <option value={4}>Trimestre IV</option>
      </select>
    </div>
  )
}
function TablaEvidenciasFormulario({ evidencias, tipoPeriodo = 'TRIMESTRAL', periodoControlado, onPeriodoChange, renderAccion }) {
  const [periodoInterno, setPeriodoInterno] = useState(1)
  const periodo = periodoControlado ?? periodoInterno
  const cambiarPeriodo = onPeriodoChange || setPeriodoInterno
  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="text-sm font-bold uppercase text-slate-700">Descripción de las evidencias</h3>
        <SelectorPeriodoEvidencias tipo={tipoPeriodo} valor={periodo} onChange={cambiarPeriodo} />
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-400">
        <table className="min-w-[900px] w-full border-collapse border border-slate-400 text-sm">
          <thead>
            <tr style={{ backgroundColor: PALETA.encabezadoTabla }}>
              <th className="w-16 border border-slate-400 px-3 py-3 text-center">N.º</th>
              <th className="border border-slate-400 px-3 py-3 text-left">Descripción de la evidencia</th>
              <th className="w-32 border border-slate-400 px-3 py-3 text-center">Formato</th>
              <th className="w-48 border border-slate-400 px-3 py-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {evidencias.map((item, index) => (
              <tr key={`${item.numero}-${index}`} className="transition hover:bg-slate-50">
                <td className="border border-slate-300 px-3 py-3 text-center font-bold text-slate-700">{item.numero}</td>
                <td className="border border-slate-300 px-3 py-3 leading-6 text-slate-700">{item.descripcion}</td>
                <td className="border border-slate-300 px-3 py-3 text-center"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{item.formato}</span></td>
                <td className="border border-slate-300 px-3 py-3 text-center">
                  {renderAccion ? renderAccion(item, periodo) : (
                    <button type="button" disabled title="Se conectará con el expediente central de evidencias" className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                      <Download className="h-4 w-4" />Gestionar evidencia
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
const TEXTO_VERIFICACION_B4 = 'LA INFORMACIÓN FUE VERIFICADA CON BASE EN LOS REGISTROS CONTABLES Y SOPORTES CORRESPONDIENTES A LOS RECURSOS EMPLEADOS PARA EL DESARROLLO DEL PLAN ANUAL DE TRABAJO PESV DURANTE EL PERÍODO CERTIFICADO.'
function FormularioB({ user, vigencia }) {
  const [trimestre, setTrimestre] = useState(1)
  const [modalB4, setModalB4] = useState(false)
  const [generandoB4, setGenerandoB4] = useState(false)
  const [errorB4, setErrorB4] = useState('')
  const [contadorB4, setContadorB4] = useState({ nombre: '', documento: '', tarjeta: '', verificacion: TEXTO_VERIFICACION_B4 })
  const nit = obtenerNitUsuario(user)
  const abrirModalB4 = () => {
    setErrorB4('')
    let guardado = null
    try { guardado = JSON.parse(localStorage.getItem(`sinst_b4_contador_${nit}`) || 'null') } catch {}
    setContadorB4({
      nombre: String(guardado?.nombre || '').toUpperCase(),
      documento: String(guardado?.documento || '').replace(/[^\d]/g, ''),
      tarjeta: String(guardado?.tarjeta || '').toUpperCase().replace(/[^A-Z0-9-]/g, ''),
      verificacion: String(guardado?.verificacion || TEXTO_VERIFICACION_B4).toUpperCase(),
    })
    setModalB4(true)
  }
  const cambiarB4 = (campo, valor) => {
    let limpio = String(valor || '')
    if (campo === 'documento') limpio = limpio.replace(/[^\d]/g, '')
    else if (campo === 'tarjeta') limpio = limpio.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    else limpio = limpio.toUpperCase()
    setContadorB4((actual) => ({ ...actual, [campo]: limpio }))
    setErrorB4('')
  }
  const prepararB4 = async () => {
    if (generandoB4) return
    if (!nit) return setErrorB4('No fue posible identificar el NIT del CEA desde la sesión actual.')
    if (!contadorB4.nombre.trim()) return setErrorB4('Debe indicar el nombre completo del Contador Público.')
    if (!/^\d+$/.test(contadorB4.documento)) return setErrorB4('La identificación debe contener únicamente números enteros.')
    if (!/^[A-Z0-9-]+$/.test(contadorB4.tarjeta)) return setErrorB4('La tarjeta profesional debe ser alfanumérica y solo puede incluir guiones, por ejemplo 123456-T.')
    if (!contadorB4.verificacion.trim()) return setErrorB4('Debe indicar el texto de verificación de la información.')
    if (contadorB4.verificacion.trim().length > 1500) return setErrorB4('El texto de verificación debe tener máximo 1500 caracteres.')
    setGenerandoB4(true)
    setErrorB4('')
    try {
      const respuesta = await fetch('/api/admin/sinst-vigia/evidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cea-nit': nit },
        body: JSON.stringify({
          accion: 'PREPARAR_B4', nit, anio: vigencia, trimestre,
          contador_nombre: contadorB4.nombre.trim(),
          contador_documento: contadorB4.documento,
          contador_tarjeta: contadorB4.tarjeta.trim(),
          texto_verificacion: contadorB4.verificacion.trim(),
        }),
      })
      const resultado = await respuesta.json()
      if (!respuesta.ok || resultado?.ok !== true) throw new Error(resultado?.error || resultado?.message || 'No fue posible preparar la evidencia B-4.')
      try {
        localStorage.setItem(`sinst_b4_contador_${nit}`, JSON.stringify(contadorB4))
        const token = `b4_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        localStorage.setItem(`sinst_vigia_${token}`, JSON.stringify(resultado))
        const parametros = new URLSearchParams({ nit, anio: String(vigencia), trimestre: String(trimestre), token })
        setModalB4(false)
        window.open(`/admin/sinst-vigia/evidencias/b4?${parametros.toString()}`, '_blank', 'noopener,noreferrer')
      } catch {
        throw new Error('No fue posible conservar temporalmente la información para generar el PDF B-4.')
      }
    } catch (error) {
      setErrorB4(error?.message || 'No fue posible preparar la evidencia B-4.')
    } finally {
      setGenerandoB4(false)
    }
  }
  const renderAccion = (item) => item.numero === '4' ? (
    <button type="button" onClick={abrirModalB4} disabled={generandoB4} title={`Preparar certificación B-4 para el Trimestre ${trimestre}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60">
      {generandoB4 ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}{generandoB4 ? 'Preparando...' : 'Generar PDF'}
    </button>
  ) : (
    <button type="button" disabled title="Se conectará con el expediente central de evidencias" className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500"><Download className="h-4 w-4" />Gestionar evidencia</button>
  )
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-400">
        <table className="min-w-[1050px] w-full border-collapse border border-slate-400 text-sm">
          <thead><tr style={{ backgroundColor: PALETA.encabezadoTabla }}><th className="border border-slate-400 px-3 py-3 text-left">Código</th><th className="border border-slate-400 px-3 py-3 text-left">Indicador</th><th className="border border-slate-400 px-3 py-3 text-center">Inicio / T. I</th><th className="border border-slate-400 px-3 py-3 text-center">T. II</th><th className="border border-slate-400 px-3 py-3 text-center">T. III</th><th className="border border-slate-400 px-3 py-3 text-center">Final / T. IV</th></tr></thead>
          <tbody>{VARIABLES_B.map((item) => <tr key={item.codigo} className="hover:bg-slate-50"><td className="border border-slate-300 px-3 py-3 font-bold text-slate-700">{item.codigo}</td><td className="border border-slate-300 px-3 py-3 text-slate-700">{item.nombre}</td>{[1,2,3,4].map((n) => <td key={n} className="border border-slate-300 px-3 py-3 text-center text-slate-400">{item.periodo === 'ANUAL' && (n === 2 || n === 3) ? '—' : 'Pendiente'}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">La estructura ya refleja las variables del Formulario B. Los valores se conectarán progresivamente con los módulos PESV existentes.</p>
      {errorB4 && <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorB4}</span></div>}
      <TablaEvidenciasFormulario evidencias={EVIDENCIAS_B} tipoPeriodo="TRIMESTRAL" periodoControlado={trimestre} onPeriodoChange={setTrimestre} renderAccion={renderAccion} />
      {modalB4 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 px-5 py-4 text-white" style={{ backgroundColor: PALETA.tituloSeccion }}>
              <div><p className="text-sm font-black">Preparar evidencia B-4</p><p className="mt-1 text-xs text-slate-200">Certificación de recursos empleados · Trimestre {trimestre} · {vigencia}</p></div>
              <button type="button" onClick={() => setModalB4(false)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Cerrar"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Evidencia oficial</p><p className="mt-2 text-sm leading-5 text-slate-700">Certificación suscrita por el Contador de los recursos empleados trimestralmente para el desarrollo del plan anual de trabajo PESV, con el detalle de la destinación de los mismos.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Nombre completo del Contador</label><input type="text" value={contadorB4.nombre} onChange={(e) => cambiarB4('nombre', e.target.value)} maxLength={150} placeholder="NOMBRE COMPLETO" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-orange-500" /></div>
                <div><label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Identificación</label><input type="text" inputMode="numeric" value={contadorB4.documento} onChange={(e) => cambiarB4('documento', e.target.value)} maxLength={20} placeholder="123456789" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500" /></div>
                <div><label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Tarjeta profesional</label><input type="text" value={contadorB4.tarjeta} onChange={(e) => cambiarB4('tarjeta', e.target.value)} maxLength={40} placeholder="123456-T" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-orange-500" /></div>
                <div><label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Título</label><input type="text" value="CONTADOR PÚBLICO" readOnly className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700" /></div>
              </div>
              <div><label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Verificación realizada</label><textarea value={contadorB4.verificacion} onChange={(e) => cambiarB4('verificacion', e.target.value)} maxLength={1500} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase leading-5 outline-none focus:border-orange-500" /><p className="mt-1 text-[10px] text-slate-500">Texto sugerido editable. El cuerpo principal de la certificación y los valores financieros se generan automáticamente.</p></div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-900">Los recursos certificados se obtendrán directamente de los egresos PESV registrados en Caja para el trimestre seleccionado. Los datos del contador se conservarán en este navegador únicamente para facilitar futuras certificaciones.</div>
              {errorB4 && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorB4}</span></div>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={() => setModalB4(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancelar</button><button type="button" onClick={prepararB4} disabled={generandoB4} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">{generandoB4 ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}{generandoB4 ? 'Preparando...' : 'Preparar PDF'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
function FormularioC() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="w-full sm:w-56">
          <label className="mb-1 block text-xs font-extrabold uppercase text-[#29465D]">Mes de consulta</label>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {MESES_SINST.map((nombre, index) => <option key={nombre} value={index + 1}>{nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-400">
        <table className="min-w-[820px] w-full border-collapse border border-slate-400 text-sm">
          <thead>
            <tr style={{ backgroundColor: PALETA.encabezadoTabla }}>
              <th className="border border-slate-400 px-3 py-3 text-left">Código</th>
              <th className="border border-slate-400 px-3 py-3 text-left">Indicador</th>
              <th className="w-40 border border-slate-400 px-3 py-3 text-center">{MESES_SINST[mes - 1]}</th>
            </tr>
          </thead>
          <tbody>
            {VARIABLES_C.map((item) => (
              <tr key={item.codigo} className="hover:bg-slate-50">
                <td className="border border-slate-300 px-3 py-3 font-bold text-slate-700">{item.codigo}</td>
                <td className="border border-slate-300 px-3 py-3 text-slate-700">{item.nombre}</td>
                <td className="border border-slate-300 px-3 py-3 text-center text-slate-400">Pendiente</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        La tabla mensual queda preparada para integrar jornadas, desplazamientos y gestión de velocidad sin fabricar datos no registrados.
      </p>
      <TablaEvidenciasFormulario evidencias={EVIDENCIAS_C} tipoPeriodo="MENSUAL" />
    </div>
  )
}
function FormularioD() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="w-full sm:w-56">
          <label className="mb-1 block text-xs font-extrabold uppercase text-[#29465D]">Mes de consulta</label>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {MESES_SINST.map((nombre, index) => <option key={nombre} value={index + 1}>{nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-400">
        <table className="min-w-[900px] w-full border-collapse border border-slate-400 text-sm">
          <thead>
            <tr style={{ backgroundColor: PALETA.encabezadoTabla }}>
              <th className="border border-slate-400 px-3 py-3 text-left">Código</th>
              <th className="border border-slate-400 px-3 py-3 text-left">Indicador</th>
              <th className="w-40 border border-slate-400 px-3 py-3 text-center">Periodicidad</th>
              <th className="w-40 border border-slate-400 px-3 py-3 text-center">Valor</th>
            </tr>
          </thead>
          <tbody>
            {VARIABLES_D.map((item) => (
              <tr key={item.codigo} className="hover:bg-slate-50">
                <td className="border border-slate-300 px-3 py-3 font-bold text-slate-700">{item.codigo}</td>
                <td className="border border-slate-300 px-3 py-3 text-slate-700">{item.nombre}</td>
                <td className="border border-slate-300 px-3 py-3 text-center text-xs font-bold text-slate-600">{item.periodo}</td>
                <td className="border border-slate-300 px-3 py-3 text-center text-slate-400">Pendiente</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        La estructura incluye las variables mensuales y trimestrales; mantenimiento se conectará con el módulo ya cerrado de DATA-CEA.
      </p>
      <TablaEvidenciasFormulario evidencias={EVIDENCIAS_D} tipoPeriodo="MENSUAL" />
    </div>
  )
}
function PanelEvidencias({
  evidencias,
  cargando,
  error,
  tipoArchivo,
  setTipoArchivo,
  periodicidad,
  setPeriodicidad,
  mes,
  setMes,
  trimestre,
  setTrimestre,
  onRecargar,
  onAdministrarRutas,
}) {
  const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-3xl text-xs leading-5 text-slate-500">
          Consulte los PDF y Excel definitivos del período. Un mismo documento puede
          utilizarse en varios requisitos de los formularios A, B, C y D.
        </p>
        <button
          type="button"
          onClick={onAdministrarRutas}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-xs font-bold uppercase text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
        >
          <Route className="h-4 w-4" />
          Administrar rutas
        </button>
      </div>
      <div className="mt-5 grid gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
            Tipo de archivo
          </label>
          <select
            value={tipoArchivo}
            onChange={(e) => setTipoArchivo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-500"
          >
            <option value="TODOS">Todos</option>
            <option value="PDF">PDF</option>
            <option value="EXCEL">Excel</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
            Periodicidad
          </label>
          <select
            value={periodicidad}
            onChange={(e) => setPeriodicidad(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-500"
          >
            <option value="TODAS">Todas</option>
            <option value="MENSUAL">Mensual</option>
            <option value="TRIMESTRAL">Trimestral</option>
            <option value="ANUAL">Anual</option>
          </select>
        </div>
        {periodicidad === 'MENSUAL' && (
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
              Mes
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-500"
            >
              {MESES.map((nombre, index) => (
                <option key={nombre} value={index + 1}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
        )}
        {periodicidad === 'TRIMESTRAL' && (
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
              Trimestre
            </label>
            <select
              value={trimestre}
              onChange={(e) => setTrimestre(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-500"
            >
              <option value={1}>Trimestre I</option>
              <option value={2}>Trimestre II</option>
              <option value={3}>Trimestre III</option>
              <option value={4}>Trimestre IV</option>
            </select>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="mt-5 overflow-x-auto rounded-lg border border-slate-400">
        <table className="min-w-[980px] w-full border-collapse border border-slate-400 text-sm">
          <thead>
            <tr style={{ backgroundColor: PALETA.encabezadoTabla }}>
              <th className="border border-slate-400 px-3 py-3 text-left">Documento</th>
              <th className="border border-slate-400 px-3 py-3 text-center">Tipo</th>
              <th className="border border-slate-400 px-3 py-3 text-center">Periodicidad</th>
              <th className="border border-slate-400 px-3 py-3 text-center">Período</th>
              <th className="border border-slate-400 px-3 py-3 text-center">Estado</th>
              <th className="border border-slate-400 px-3 py-3 text-left">Utilizado en</th>
              <th className="border border-slate-400 px-3 py-3 text-center">Archivo</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={7} className="border border-slate-300 px-4 py-10 text-center text-slate-500">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Consultando evidencias...
                </td>
              </tr>
            ) : evidencias.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-slate-300 px-4 py-10 text-center text-slate-500">
                  No hay evidencias registradas para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              evidencias.map((item) => {
                const periodo =
                  item.periodicidad === 'MENSUAL'
                    ? MESES[(item.mes || 1) - 1]
                    : item.periodicidad === 'TRIMESTRAL'
                      ? `Trimestre ${['I', 'II', 'III', 'IV'][(item.trimestre || 1) - 1]}`
                      : `Vigencia ${item.anio}`
                const usos = (item.vinculos || [])
                  .map((v) => `${v.formulario}-${v.numero_evidencia}`)
                  .join(' · ')
                return (
                  <tr key={item.id} className="transition hover:bg-slate-100">
                    <td className="border border-slate-300 px-3 py-3">
                      <p className="font-bold text-slate-800">{item.titulo}</p>
                      {item.nombre_archivo && (
                        <p className="mt-1 text-xs text-slate-500">{item.nombre_archivo}</p>
                      )}
                    </td>
                    <td className="border border-slate-300 px-3 py-3 text-center font-semibold">
                      {item.tipo_archivo}
                    </td>
                    <td className="border border-slate-300 px-3 py-3 text-center">
                      {item.periodicidad}
                    </td>
                    <td className="border border-slate-300 px-3 py-3 text-center">
                      {periodo}
                    </td>
                    <td className="border border-slate-300 px-3 py-3 text-center">
                      <span className="rounded-md bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700">
                        {item.estado}
                      </span>
                    </td>
                    <td className="border border-slate-300 px-3 py-3 text-slate-700">
                      {usos || 'Sin vínculos'}
                    </td>
                    <td className="border border-slate-300 px-3 py-3 text-center">
                      {item.archivo_path ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                          <Eye className="h-4 w-4" />
                          Disponible
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Pendiente</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onRecargar}
          disabled={cargando}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Actualizar expediente
        </button>
      </div>
    </div>
  )
}
function ModalRutas({ user, onClose }) {
  const nit = obtenerNitUsuario(user)
  const VACIO = {
    id: null,
    categoria: '',
    numero_ruta: '',
    descripcion: '',
    kilometros: '',
    frecuencia_uso_semanal: '',
    observaciones: '',
  }
  const [rutas, setRutas] = useState([])
  const [form, setForm] = useState(VACIO)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const categorias = useMemo(() => {
    const posibles =
      user?.categorias_habilitadas ||
      user?.categoriasHabilitadas ||
      []
    return Array.isArray(posibles) ? posibles : []
  }, [user])
  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const respuesta = await fetch(
        `/api/admin/sinst-vigia/rutas?nit=${encodeURIComponent(nit)}&estado=TODAS`,
        {
          headers: { 'x-cea-nit': nit },
          cache: 'no-store',
        }
      )
      const resultado = await respuesta.json()
      if (!respuesta.ok || resultado?.ok !== true) {
        throw new Error(resultado?.error || 'No fue posible consultar las rutas.')
      }
      setRutas(Array.isArray(resultado.rutas) ? resultado.rutas : [])
    } catch (e) {
      setError(e?.message || 'No fue posible consultar las rutas.')
    } finally {
      setCargando(false)
    }
  }, [nit])
  useEffect(() => {
    cargar()
  }, [cargar])
  function editar(ruta) {
    setMensaje('')
    setError('')
    setForm({
      id: ruta.id,
      categoria: ruta.categoria || '',
      numero_ruta: ruta.numero_ruta || '',
      descripcion: ruta.descripcion || '',
      kilometros: ruta.kilometros ?? '',
      frecuencia_uso_semanal: ruta.frecuencia_uso_semanal ?? '',
      observaciones: ruta.observaciones || '',
    })
  }
  function limpiar() {
    setForm(VACIO)
    setError('')
    setMensaje('')
  }
  async function guardar(event) {
    event.preventDefault()
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const respuesta = await fetch('/api/admin/sinst-vigia/rutas', {
        method: form.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cea-nit': nit,
        },
        body: JSON.stringify({
          nit,
          ...form,
          usuario:
            user?.nombre_completo ||
            user?.nombre ||
            user?.usuario ||
            null,
        }),
      })
      const resultado = await respuesta.json()
      if (!respuesta.ok || resultado?.ok !== true) {
        throw new Error(resultado?.error || 'No fue posible guardar la ruta.')
      }
      setMensaje(resultado.mensaje || 'Ruta guardada correctamente.')
      setForm(VACIO)
      await cargar()
    } catch (e) {
      setError(e?.message || 'No fue posible guardar la ruta.')
    } finally {
      setGuardando(false)
    }
  }
  async function cambiarEstado(ruta) {
    setError('')
    setMensaje('')
    try {
      const respuesta = await fetch('/api/admin/sinst-vigia/rutas', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-cea-nit': nit,
        },
        body: JSON.stringify({
          nit,
          id: ruta.id,
          activo: !ruta.activo,
        }),
      })
      const resultado = await respuesta.json()
      if (!respuesta.ok || resultado?.ok !== true) {
        throw new Error(resultado?.error || 'No fue posible cambiar el estado.')
      }
      setMensaje(resultado.mensaje || 'Estado actualizado.')
      await cargar()
    } catch (e) {
      setError(e?.message || 'No fue posible cambiar el estado.')
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-xl border border-slate-400 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-slate-700 px-5 py-3 text-white">
          <div>
            <h3 className="text-sm font-bold uppercase">Administrar rutas</h3>
            <p className="mt-0.5 text-xs text-slate-200">
              Catálogo permanente de recorridos utilizados por el CEA
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-slate-600"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(92vh-64px)] overflow-y-auto p-5">
          <form onSubmit={guardar} className="rounded-xl border border-slate-300 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
                  Categoría
                </label>
                {categorias.length > 0 ? (
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm((v) => ({ ...v, categoria: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
                    required
                  >
                    <option value="">Seleccione</option>
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.categoria}
                    onChange={(e) => setForm((v) => ({ ...v, categoria: e.target.value.toUpperCase() }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
                    placeholder="A2"
                    required
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
                  N.º de ruta
                </label>
                <input
                  value={form.numero_ruta}
                  onChange={(e) => setForm((v) => ({ ...v, numero_ruta: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="001"
                  required
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
                  Descripción
                </label>
                <input
                  value={form.descripcion}
                  onChange={(e) => setForm((v) => ({ ...v, descripcion: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
                  Kilómetros
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.kilometros}
                  onChange={(e) => setForm((v) => ({ ...v, kilometros: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
                  Frecuencia semanal
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.frecuencia_uso_semanal}
                  onChange={(e) => setForm((v) => ({ ...v, frecuencia_uso_semanal: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="md:col-span-2 lg:col-span-6">
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
                  Observaciones
                </label>
                <input
                  value={form.observaciones}
                  onChange={(e) => setForm((v) => ({ ...v, observaciones: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {form.id && (
                <button
                  type="button"
                  onClick={limpiar}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar edición
                </button>
              )}
              <button
                type="submit"
                disabled={guardando}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {form.id ? 'Guardar cambios' : 'Crear ruta'}
              </button>
            </div>
          </form>
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {mensaje && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {mensaje}
            </div>
          )}
          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-400">
            <table className="min-w-[900px] w-full border-collapse border border-slate-400 text-sm">
              <thead>
                <tr style={{ backgroundColor: PALETA.encabezadoTabla }}>
                  <th className="border border-slate-400 px-3 py-3 text-left">Código</th>
                  <th className="border border-slate-400 px-3 py-3 text-left">Categoría</th>
                  <th className="border border-slate-400 px-3 py-3 text-left">Descripción</th>
                  <th className="border border-slate-400 px-3 py-3 text-center">Km</th>
                  <th className="border border-slate-400 px-3 py-3 text-center">Frecuencia semanal</th>
                  <th className="border border-slate-400 px-3 py-3 text-center">Estado</th>
                  <th className="border border-slate-400 px-3 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={7} className="border border-slate-300 px-4 py-8 text-center text-slate-500">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : rutas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-slate-300 px-4 py-8 text-center text-slate-500">
                      No hay rutas registradas.
                    </td>
                  </tr>
                ) : (
                  rutas.map((ruta) => (
                    <tr key={ruta.id} className="transition hover:bg-slate-100">
                      <td className="border border-slate-300 px-3 py-3 font-bold">{ruta.codigo}</td>
                      <td className="border border-slate-300 px-3 py-3">{ruta.categoria}</td>
                      <td className="border border-slate-300 px-3 py-3">{ruta.descripcion}</td>
                      <td className="border border-slate-300 px-3 py-3 text-center">{ruta.kilometros}</td>
                      <td className="border border-slate-300 px-3 py-3 text-center">{ruta.frecuencia_uso_semanal}</td>
                      <td className="border border-slate-300 px-3 py-3 text-center">
                        <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${ruta.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {ruta.activo ? 'ACTIVA' : 'INACTIVA'}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-3 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => editar(ruta)}
                            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
                            title="Editar"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => cambiarEstado(ruta)}
                            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
                            title={ruta.activo ? 'Inactivar' : 'Activar'}
                          >
                            {ruta.activo ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
