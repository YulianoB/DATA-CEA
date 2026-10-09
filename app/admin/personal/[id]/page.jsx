//app/admin/personal/%5Bid%5D/page.jsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ModalResultado from '@/components/admin/ModalResultado'
import CampoCatalogo from '@/components/admin/CampoCatalogo'
import { generarHojaVidaPdf } from '@/lib/hojaVidaPdf'
import VistaPreviaPdfLimpia from '@/components/admin/VistaPreviaPdfLimpia'


const EXPERIENCIA_INICIAL = {
  id: null,
  empresa: '',
  cargo: '',
  fecha_inicio: '',
  fecha_fin: '',
  actualmente: false,
  funciones: '',
  jefe_inmediato: '',
  telefono_contacto: '',
  observaciones: '',
}

const ESTUDIO_INICIAL = {
  id: null,
  nivel_estudio: '',
  titulo: '',
  institucion: '',
  fecha_grado: '',
  observaciones: '',
}

const LICENCIA_INICIAL = {
  id: null,
  tipo_licencia: 'CONDUCCION',
  categoria: '',
  numero_certificado: '',
  vigencia: '',
}

const REFERENCIA_INICIAL = {
  id: null,
  tipo_referencia: 'personal',
  nombre: '',
  ocupacion_cargo: '',
  empresa: '',
  telefono: '',
  email: '',
  relacion: '',
  observaciones: '',
}

const EVALUACION_INICIAL = {
  id: null,
  tipo_evaluacion: '',
  fecha_evaluacion: '',
  resultado: '',
  evaluador: '',
  observaciones: '',
}

const DOCUMENTO_INICIAL = {
  id: null,
  tipo_documento: '',
  nombre_documento: '',
  archivo_url: '',
  vence: false,
  fecha_vencimiento: '',
  estado: 'vigente',
  observaciones: '',
}

const PERFILES_DISPONIBLES = [
  ['ADMINISTRATIVO', 'Administrativo'],
  ['AUXILIAR_ADMINISTRATIVO', 'Auxiliar administrativo'],
  ['INSTRUCTOR_TEORIA', 'Instructor teoría'],
  ['INSTRUCTOR_PRACTICA', 'Instructor práctica'],
]

const CUENTA_INICIAL = {
  email_autorizado: '',
  estado: 'activo',
  observaciones: '',
}

const CATEGORIAS_LICENCIA = [
  'A2',
  'B1',
  'B1-C1',
  'B2-C2',
  'B3-C3',
]

const TABS_BASE = [
  { key: 'general', label: 'Información general' },
  { key: 'estudios', label: 'Estudios' },
  { key: 'experiencia', label: 'Experiencia' },
  { key: 'referencias', label: 'Referencias' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'evaluaciones', label: 'Evaluaciones' },
  { key: 'cuenta', label: 'Cuenta de usuario' },
]

function texto(value) {
  return value === null || value === undefined || value === '' ? '-' : value
}

function fecha(value) {
  if (!value) return '-'
  return String(value).slice(0, 10)
}

function normalizarTipoLicenciaUI(value) {
  const tipo = String(value || '').trim().toUpperCase()

  if (tipo === 'CONDUCCIÓN') return 'CONDUCCION'
  if (tipo === 'CONDUCCION') return 'CONDUCCION'
  if (tipo === 'INSTRUCTOR') return 'INSTRUCTOR'

  return tipo
}

function normalizarCategoriaLicenciaUI(value) {
  const categoria = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')

  if (categoria === 'A2') return 'A2'
  if (categoria === 'B1') return 'B1'
  if (categoria === 'B1-C1' || categoria === 'B1C1') return 'B1-C1'
  if (categoria === 'B2-C2' || categoria === 'B2C2') return 'B2-C2'
  if (categoria === 'B3-C3' || categoria === 'B3C3') return 'B3-C3'

  return categoria
}

function estadoVigenciaLicencia(licencia) {
  if (licencia?.estado_vigencia) {
    return String(licencia.estado_vigencia).toUpperCase()
  }

  if (!licencia?.vigencia) return 'SIN_VIGENCIA'

  const hoy = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Bogota',
  }).format(new Date())

  return String(licencia.vigencia).slice(0, 10) < hoy
    ? 'VENCIDA'
    : 'VIGENTE'
}

function claveGrupoLicencia(licencia) {
  const tipo = normalizarTipoLicenciaUI(licencia?.tipo_licencia)
  const categoria = normalizarCategoriaLicenciaUI(licencia?.categoria)
  const grupo = categoria === 'A2' ? 'A2' : 'BC'

  return `${tipo}:${grupo}`
}

const CAMPOS_EDICION_GENERAL = [
  ['Datos personales', [
    ['nombres','Nombres'],['apellidos','Apellidos'],['fecha_nacimiento','Fecha de nacimiento','date'],
    ['genero','Género','select:femenino|masculino|otro'],['tipo_sangre','Tipo de sangre'],
    ['estado_civil','Estado civil'],['escolaridad','Nivel académico principal'],
    ['profesion','Profesión u oficio'],['nacionalidad','Nacionalidad'],['numero_hijos','Número de hijos','number'],
  ]],
  ['Contacto', [
    ['telefono','Teléfono'],['departamento_residencia','Departamento','catalogo:departamentos'],
    ['ciudad_residencia','Ciudad'],['direccion','Dirección'],
  ]],
  ['Vinculación', [
    ['tipo_personal','Relación con el CEA','select:contratista|colaborador'],
    ['cargo','Cargo'],['grupo_personal','Grupo de trabajo','select:directivo|administrativo|operativo|servicios_generales'],
    ['tipo_contrato','Modalidad de contrato','select:prestacion_servicios|termino_indefinido|termino_fijo|obra_labor|aprendiz|otro'],
    ['tipo_permanencia','Permanencia en el CEA','select:permanente|ocasional|por_dias|por_horas|temporal'],
    ['fecha_vinculacion','Fecha vinculación','date'],['fecha_retiro','Fecha retiro','date'],
    ['estado','Estado laboral','select:activo|inactivo'],
  ]],
  ['Seguridad social y PESV', [
    ['eps','EPS','catalogo:eps'],['arl','ARL','catalogo:arl'],
    ['fondo_pension','Fondo pensión','catalogo:fondos_pensiones'],
    ['medio_transporte_trabajo','Medio de transporte'],
  ]],
  ['Contacto de emergencia', [
    ['contacto_emergencia_nombre','Nombre'],['contacto_emergencia_parentesco','Parentesco'],
    ['contacto_emergencia_telefono','Teléfono'],
  ]],
]
const CAMPOS_GENERALES = CAMPOS_EDICION_GENERAL.flatMap(([, campos]) => campos.map(([campo]) => campo))

export default function HojaVidaPersonalPage() {
  const params = useParams()
  const [resultadoModal, setResultadoModal] = useState(null)
  const mostrarResultado = (tipo, mensaje) => setResultadoModal({ tipo, mensaje: String(mensaje || '') })
  const [confirmacion, setConfirmacion] = useState(null)
  const confirmarAccion = (mensaje) => new Promise((resolver) => {
    setConfirmacion({ mensaje, resolver })
  })
  const cerrarConfirmacion = (aceptada) => {
    if (confirmacion) confirmacion.resolver(aceptada)
    setConfirmacion(null)
  }

  const router = useRouter()
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  const [perfilProfesional, setPerfilProfesional] = useState('')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [editarGeneralAbierto, setEditarGeneralAbierto] = useState(false)
  const [formGeneral, setFormGeneral] = useState({})
  const [guardandoGeneral, setGuardandoGeneral] = useState(false)
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [vistaPreviaPdf, setVistaPreviaPdf] = useState(null)
  const [datosVistaPrevia, setDatosVistaPrevia] = useState(null)
  const [nombreArchivoHojaVida, setNombreArchivoHojaVida] = useState('Hoja de vida.pdf')
  const [fotoTemporal, setFotoTemporal] = useState(null)
  const [procesandoFoto, setProcesandoFoto] = useState(false)
  const [eliminandoFoto, setEliminandoFoto] = useState(false)

  const [experiencia, setExperiencia] = useState([])
  const [formExperiencia, setFormExperiencia] = useState(EXPERIENCIA_INICIAL)
  const [guardandoExperiencia, setGuardandoExperiencia] = useState(false)
  const [cargandoExperiencia, setCargandoExperiencia] = useState(false)

  const [estudios, setEstudios] = useState([])
  const [formEstudio, setFormEstudio] = useState(ESTUDIO_INICIAL)
  const [guardandoEstudio, setGuardandoEstudio] = useState(false)
  const [cargandoEstudios, setCargandoEstudios] = useState(false)

  const [licencias, setLicencias] = useState([])
  const [formLicencia, setFormLicencia] = useState(LICENCIA_INICIAL)
  const [guardandoLicencia, setGuardandoLicencia] = useState(false)
  const [cargandoLicencias, setCargandoLicencias] = useState(false)

  const [referencias, setReferencias] = useState([])
  const [formReferencia, setFormReferencia] = useState(REFERENCIA_INICIAL)
  const [guardandoReferencia, setGuardandoReferencia] = useState(false)
  const [cargandoReferencias, setCargandoReferencias] = useState(false)

  const [evaluaciones, setEvaluaciones] = useState([])
  const [formEvaluacion, setFormEvaluacion] = useState(EVALUACION_INICIAL)
  const [guardandoEvaluacion, setGuardandoEvaluacion] = useState(false)
  const [cargandoEvaluaciones, setCargandoEvaluaciones] = useState(false)

  const [documentos, setDocumentos] = useState([])
  const [formDocumento, setFormDocumento] = useState(DOCUMENTO_INICIAL)
  const [guardandoDocumento, setGuardandoDocumento] = useState(false)
  const [cargandoDocumentos, setCargandoDocumentos] = useState(false)

  const [cuentaUsuario, setCuentaUsuario] = useState(null)
  const [perfilesCuenta, setPerfilesCuenta] = useState([])
  const [formCuenta, setFormCuenta] = useState(CUENTA_INICIAL)
  const [guardandoCuenta, setGuardandoCuenta] = useState(false)
  const [cargandoCuenta, setCargandoCuenta] = useState(false)

  const id = params?.id
  const nitActual = user?.nitEmpresa || ''

  const puedeGestionarLicencias =
    Boolean(data?.personal?.rol_conductor_instructor)

  const tabsVisibles = useMemo(() => {
    const tabs = [...TABS_BASE]

    if (puedeGestionarLicencias) {
      tabs.splice(1, 0, {
        key: 'licencias',
        label: 'Licencias',
      })
    }

    return tabs
  }, [puedeGestionarLicencias])

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (!storedUser) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(storedUser))
  }, [router])

  useEffect(() => {
    if (user && id && nitActual) cargarHojaVida()
  }, [user, id, nitActual])

  useEffect(() => {
    if (!user || !id || !nitActual) return

    if (tab === 'experiencia') cargarExperiencia()
    if (tab === 'estudios') cargarEstudios()

    if (
      tab === 'licencias' &&
      puedeGestionarLicencias
    ) {
      cargarLicencias()
    }

    if (tab === 'referencias') cargarReferencias()
    if (tab === 'documentos') cargarDocumentos()
    if (tab === 'evaluaciones') cargarEvaluaciones()
    if (tab === 'cuenta') cargarCuenta()
  }, [
    user,
    id,
    tab,
    nitActual,
    puedeGestionarLicencias,
  ])

  useEffect(() => {
    if (
      tab === 'licencias' &&
      data?.personal &&
      !puedeGestionarLicencias
    ) {
      setTab('general')
      setFormLicencia(LICENCIA_INICIAL)
      setLicencias([])
    }
  }, [
    tab,
    data?.personal,
    puedeGestionarLicencias,
  ])

  const nombreCompleto = useMemo(() => {
    if (!data?.personal) return ''
    return `${data.personal.nombres || ''} ${data.personal.apellidos || ''}`.trim()
  }, [data])

  async function cargarHojaVida() {
    setLoading(true)
    try {
      const response = await fetch(`/api/personal/${id}?nit=${nitActual}`)
      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible cargar la hoja de vida.')
      }

      setData(result)
      setPerfilProfesional(result.personal?.perfil_profesional || '')
      setLicencias(result.personal?.licencias_personal || result.licencias || [])
      await cargarFotografia()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible cargar la hoja de vida.')
    } finally {
      setLoading(false)
    }
  }

  async function cargarFotografia() {
    setFotoTemporal(null)
    const respuesta = await fetch(`/api/personal/${id}/fotografia?nit=${encodeURIComponent(nitActual)}`, { cache: 'no-store' })
    const resultado = await respuesta.json()
    if (!respuesta.ok || resultado.status !== 'success') {
      throw new Error(resultado.message || 'No fue posible recuperar la fotografía.')
    }
    if (resultado.foto_signed_url) {
      const imagen = await fetch(resultado.foto_signed_url, { cache: 'no-store' })
      if (!imagen.ok) throw new Error('No fue posible descargar la fotografía guardada.')
      const blob = await imagen.blob()
      const dataUrl = await new Promise((resolve, reject) => {
        const lector = new FileReader()
        lector.onload = () => resolve(lector.result)
        lector.onerror = () => reject(new Error('No fue posible procesar la fotografía guardada.'))
        lector.readAsDataURL(blob)
      })
      setFotoTemporal(dataUrl)
    }
  }

  async function eliminarFotografia() {
    if (!fotoTemporal || eliminandoFoto || procesandoFoto) return
    if (!await confirmarAccion('¿Eliminar la fotografía permanente de este trabajador?')) return
    setEliminandoFoto(true)
    try {
      const respuesta = await fetch(`/api/personal/${id}/fotografia?nit=${encodeURIComponent(nitActual)}`, { method: 'DELETE' })
      const resultado = await respuesta.json()
      if (!respuesta.ok || resultado.status !== 'success') throw new Error(resultado.message || 'No fue posible eliminar la fotografía.')
      setFotoTemporal(null)
      setData(prev => prev ? { ...prev, personal: { ...prev.personal, foto_url: null } } : prev)
      mostrarResultado('exito', 'Fotografía eliminada correctamente.')
    } catch (error) {
      mostrarResultado('error', error.message || 'No fue posible eliminar la fotografía.')
    } finally {
      setEliminandoFoto(false)
    }
  }

  async function seleccionarFotografia(event) {
    const archivo = event.target.files?.[0]
    event.target.value = ''
    if (!archivo) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
      mostrarResultado('error', 'Seleccione una imagen JPG, PNG o WebP de máximo 5 MB.')
      return
    }
    setProcesandoFoto(true)
    try {
      const url = URL.createObjectURL(archivo)
      try {
        const imagen = new Image()
        imagen.src = url
        await imagen.decode()
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 480
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('No se pudo procesar la imagen.')
        ctx.clearRect(0, 0, 480, 480)
        ctx.beginPath()
        ctx.arc(240, 240, 230, 0, Math.PI * 2)
        ctx.clip()
        const lado = Math.min(imagen.naturalWidth, imagen.naturalHeight)
        ctx.drawImage(imagen, (imagen.naturalWidth - lado) / 2, (imagen.naturalHeight - lado) / 2, lado, lado, 10, 10, 460, 460)
        const fotoProcesada = canvas.toDataURL('image/png')
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        if (!blob) throw new Error('No fue posible preparar la fotografía.')
        const formulario = new FormData()
        formulario.append('foto', blob, 'fotografia.png')
        const respuesta = await fetch(`/api/personal/${id}/fotografia?nit=${encodeURIComponent(nitActual)}`, {
          method: 'POST',
          body: formulario,
        })
        const resultado = await respuesta.json()
        if (!respuesta.ok || resultado.status !== 'success') {
          throw new Error(resultado.message || 'No fue posible guardar la fotografía.')
        }
        setFotoTemporal(fotoProcesada)
        setData(prev => prev ? { ...prev, personal: { ...prev.personal, foto_url: resultado.foto_url } } : prev)
        mostrarResultado('exito', 'Fotografía guardada permanentemente.')
      } finally {
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      mostrarResultado('error', error.message || 'No fue posible procesar la fotografía.')
    } finally {
      setProcesandoFoto(false)
    }
  }

  async function obtenerDatosPdf() {
    const base = `/api/personal/${id}`
    const nit = encodeURIComponent(nitActual)
    const consultar = async (recurso) => {
      const respuesta = await fetch(`${base}/${recurso}?nit=${nit}`, { cache: 'no-store' })
      const resultado = await respuesta.json()
      if (!respuesta.ok || resultado.status !== 'success') {
        throw new Error(resultado.message || `No fue posible cargar ${recurso} para el PDF.`)
      }
      return resultado
    }
    const [resEstudios, resExperiencia, resLicencias] = await Promise.all([
      consultar('estudios'),
      consultar('experiencia'),
      puedeGestionarLicencias ? consultar('licencias') : Promise.resolve({ licencias: [] }),
    ])
    setEstudios(resEstudios.estudios || [])
    setExperiencia(resExperiencia.experiencia || [])
    setLicencias(resLicencias.licencias || [])
    return {
      estudios: resEstudios.estudios || [],
      experiencia: resExperiencia.experiencia || [],
      licencias: resLicencias.licencias || [],
    }
  }

  async function obtenerConfiguracionHojaVida() {
    const response = await fetch('/api/admin/configuracion-documentos', {
      headers: { 'x-cea-nit': nitActual },
      cache: 'no-store',
    })
    const config = await response.json()
    if (!response.ok || !config.ok) throw new Error(config.error || 'No fue posible consultar la configuración documental.')
    const documento = (config.documentos || []).find((d) => d.activo !== false && (
      String(d.tipo_documento || '').toUpperCase() === 'HOJA_VIDA_PERSONAL' ||
      String(d.nombre_documento || '').trim().toUpperCase() === 'HOJA DE VIDA DEL PERSONAL'
    ))
    if (!documento) throw new Error('Primero configure el documento HOJA DE VIDA DEL PERSONAL en Configuración de documentos.')
    return { documento, encabezado: config.encabezado }
  }

  async function visualizarHojaVida() {
    if (generandoPdf) return
    setGenerandoPdf(true)
    try {
      const [datosPdf, configuracion] = await Promise.all([obtenerDatosPdf(), obtenerConfiguracionHojaVida()])
      const blob = generarHojaVidaPdf({
        personal: data.personal,
        ...datosPdf,
        perfiles: data.perfiles || data.personal?.perfiles_usuario || [],
        vistaPrevia: true,
        ...configuracion,
        fotoDataUrl: fotoTemporal,
      })
      const nombreCompleto = [data.personal?.nombres, data.personal?.apellidos].filter(Boolean).join(' ')
      const nombreSeguro = nombreCompleto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\\/:*?"<>|\x00-\x1F]/g, '').replace(/\s+/g, ' ').trim()
      setNombreArchivoHojaVida(`HV ${nombreSeguro || data.personal?.documento || data.personal?.id}.pdf`)
      setDatosVistaPrevia({
        datos: {
          personal: data.personal,
          ...datosPdf,
          perfiles: data.perfiles || data.personal?.perfiles_usuario || [],
        },
        documento: configuracion.documento,
        fotoDataUrl: fotoTemporal,
      })
      const url = URL.createObjectURL(blob)
      setVistaPreviaPdf((anterior) => {
        if (anterior) URL.revokeObjectURL(anterior)
        return url
      })
    } catch (error) {
      mostrarResultado('error', error.message || 'No fue posible visualizar la hoja de vida.')
    } finally {
      setGenerandoPdf(false)
    }
  }

  async function imprimirHojaVida() {
    if (generandoPdf) return
    setGenerandoPdf(true)
    try {
      const [datosPdf, configuracion] = await Promise.all([obtenerDatosPdf(), obtenerConfiguracionHojaVida()])
      generarHojaVidaPdf({
        personal: data.personal,
        ...datosPdf,
        perfiles: data.perfiles || data.personal?.perfiles_usuario || [],
        ...configuracion,
        fotoDataUrl: fotoTemporal,
      })
    } catch (error) {
      mostrarResultado('error', error.message || 'No fue posible generar la hoja de vida.')
    } finally {
      setGenerandoPdf(false)
    }
  }

  function abrirEdicionGeneral() {
    const personal = data?.personal || {}
    setFormGeneral(Object.fromEntries(CAMPOS_GENERALES.map((campo) => [campo, personal[campo] ?? ''])))
    setEditarGeneralAbierto(true)
  }

  async function guardarInformacionGeneral(event) {
    event.preventDefault()
    if (!formGeneral.nombres?.trim() || !formGeneral.apellidos?.trim()) {
      mostrarResultado('error', 'Los nombres y apellidos son obligatorios.')
      return
    }
    setGuardandoGeneral(true)
    try {
      const response = await fetch(`/api/personal/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nit: nitActual, ...formGeneral }),
      })
      const result = await response.json()
      if (!response.ok || result.status !== 'success') throw new Error(result.message || 'No fue posible actualizar la información.')
      setData((prev) => ({ ...prev, personal: { ...prev.personal, ...result.personal } }))
      setEditarGeneralAbierto(false)
      mostrarResultado('exito', 'Información general actualizada correctamente.')
    } catch (error) {
      mostrarResultado('error', error.message || 'No fue posible guardar los cambios.')
    } finally {
      setGuardandoGeneral(false)
    }
  }

  async function guardarPerfilProfesional() {
    setGuardandoPerfil(true)
    try {
      const response = await fetch(`/api/personal/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nit: nitActual,
          perfil_profesional: perfilProfesional,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible guardar el perfil profesional.')
      }

      setData((prev) => ({
        ...prev,
        personal: result.personal,
      }))

      mostrarResultado('exito', 'Perfil profesional actualizado correctamente.')
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible guardar el perfil profesional.')
    } finally {
      setGuardandoPerfil(false)
    }
  }

  async function cargarExperiencia() {
    setCargandoExperiencia(true)
    try {
      const response = await fetch(`/api/personal/${id}/experiencia?nit=${nitActual}`)
      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible cargar la experiencia laboral.')
      }

      setExperiencia(result.experiencia || [])
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible cargar la experiencia laboral.')
    } finally {
      setCargandoExperiencia(false)
    }
  }

  function cambiarExperiencia(event) {
    const { name, value, type, checked } = event.target
    let nuevoValor = type === 'checkbox' ? checked : value

    if (['empresa', 'cargo', 'jefe_inmediato'].includes(name)) {
      nuevoValor = value.toUpperCase()
    }

    if (name === 'telefono_contacto') {
      nuevoValor = value.replace(/\D/g, '')
    }

    setFormExperiencia((prev) => ({
      ...prev,
      [name]: nuevoValor,
      ...(name === 'actualmente' && checked ? { fecha_fin: '' } : {}),
    }))
  }

  async function guardarExperiencia(event) {
    event.preventDefault()

    if (!formExperiencia.empresa || !formExperiencia.cargo || !formExperiencia.fecha_inicio) {
      mostrarResultado('error', 'Empresa, cargo y fecha de inicio son obligatorios.')
      return
    }

    if (!formExperiencia.actualmente && !formExperiencia.fecha_fin) {
      mostrarResultado('error', 'Indica fecha de fin o marca que labora actualmente.')
      return
    }

    setGuardandoExperiencia(true)
    try {
      const response = await fetch(`/api/personal/${id}/experiencia`, {
        method: formExperiencia.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nit: nitActual,
          ...formExperiencia,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible guardar la experiencia laboral.')
      }

      mostrarResultado('exito', formExperiencia.id ? 'Experiencia laboral actualizada correctamente.' : 'Experiencia laboral registrada correctamente.')
      setFormExperiencia(EXPERIENCIA_INICIAL)
      await cargarExperiencia()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible guardar la experiencia laboral.')
    } finally {
      setGuardandoExperiencia(false)
    }
  }


  function editarExperiencia(item) {
    setFormExperiencia({
      id: item.id,
      empresa: item.empresa || '',
      cargo: item.cargo || '',
      fecha_inicio: item.fecha_inicio || '',
      fecha_fin: item.fecha_fin || '',
      actualmente: Boolean(item.actualmente),
      funciones: item.funciones || '',
      jefe_inmediato: item.jefe_inmediato || '',
      telefono_contacto: item.telefono_contacto || '',
      observaciones: item.observaciones || '',
    })
    mostrarResultado('error', 'Editando experiencia laboral seleccionada.')
  }

  function cancelarEdicionExperiencia() {
    setFormExperiencia(EXPERIENCIA_INICIAL)
  }

  async function eliminarExperiencia(experienciaId) {
    const confirmar = await confirmarAccion('¿Deseas eliminar esta experiencia laboral? Esta acción no se puede deshacer.')
    if (!confirmar) return

    try {
      const response = await fetch(`/api/personal/${id}/experiencia?nit=${nitActual}&experiencia_id=${experienciaId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible eliminar la experiencia laboral.')
      }

      mostrarResultado('exito', 'Experiencia laboral eliminada correctamente.')
      if (formExperiencia.id === experienciaId) {
        setFormExperiencia(EXPERIENCIA_INICIAL)
      }
      await cargarExperiencia()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible eliminar la experiencia laboral.')
    }
  }

  async function cargarEstudios() {
    setCargandoEstudios(true)
    try {
      const response = await fetch(`/api/personal/${id}/estudios?nit=${nitActual}`)
      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible cargar los estudios.')
      }

      setEstudios(result.estudios || [])
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible cargar los estudios.')
    } finally {
      setCargandoEstudios(false)
    }
  }

  function cambiarEstudio(event) {
    const { name, value } = event.target
    let nuevoValor = value

    if (['titulo', 'institucion'].includes(name)) {
      nuevoValor = value.toUpperCase()
    }

    setFormEstudio((prev) => ({
      ...prev,
      [name]: nuevoValor,
    }))
  }

  async function guardarEstudio(event) {
    event.preventDefault()

    if (!formEstudio.nivel_estudio || !formEstudio.titulo || !formEstudio.institucion) {
      mostrarResultado('error', 'Nivel de estudio, título e institución son obligatorios.')
      return
    }

    setGuardandoEstudio(true)
    try {
      const editando = Boolean(formEstudio.id)
      const response = await fetch(`/api/personal/${id}/estudios`, {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nit: nitActual,
          ...formEstudio,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible guardar el estudio.')
      }

      mostrarResultado('exito', editando ? 'Estudio actualizado correctamente.' : 'Estudio registrado correctamente.')
      setFormEstudio(ESTUDIO_INICIAL)
      await cargarEstudios()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible guardar el estudio.')
    } finally {
      setGuardandoEstudio(false)
    }
  }

  function editarEstudio(item) {
    setFormEstudio({
      id: item.id,
      nivel_estudio: item.nivel_estudio || '',
      titulo: item.titulo || '',
      institucion: item.institucion || '',
      fecha_grado: item.fecha_grado || '',
      observaciones: item.observaciones || '',
    })
    mostrarResultado('error', 'Editando estudio seleccionado.')
  }

  function cancelarEdicionEstudio() {
    setFormEstudio(ESTUDIO_INICIAL)
  }

  async function eliminarEstudio(estudioId) {
    const confirmar = await confirmarAccion('¿Deseas eliminar este estudio? Esta acción no se puede deshacer.')
    if (!confirmar) return

    try {
      const response = await fetch(`/api/personal/${id}/estudios?nit=${nitActual}&estudio_id=${estudioId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible eliminar el estudio.')
      }

      mostrarResultado('exito', 'Estudio eliminado correctamente.')
      if (formEstudio.id === estudioId) {
        setFormEstudio(ESTUDIO_INICIAL)
      }
      await cargarEstudios()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible eliminar el estudio.')
    }
  }

  async function cargarLicencias() {
    if (!puedeGestionarLicencias) {
      setLicencias([])
      return
    }

    setCargandoLicencias(true)
    try {
      const response = await fetch(`/api/personal/${id}/licencias?nit=${nitActual}`)
      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible cargar las licencias.')
      }

      setLicencias(result.licencias || [])
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible cargar las licencias.')
    } finally {
      setCargandoLicencias(false)
    }
  }

  function cambiarLicencia(event) {
    const { name, value } = event.target
    let nuevoValor = value

    if (name === 'numero_certificado') {
      nuevoValor = value.toUpperCase()
    }

    setFormLicencia((prev) => ({
      ...prev,
      [name]: nuevoValor,
      ...(name === 'tipo_licencia' && value === 'CONDUCCION' ? { numero_certificado: '' } : {}),
    }))
  }

  function editarLicencia(licencia) {
    setFormLicencia({
      id: licencia.id,
      tipo_licencia:
        normalizarTipoLicenciaUI(
          licencia.tipo_licencia
        ) || 'CONDUCCION',
      categoria:
        normalizarCategoriaLicenciaUI(licencia.categoria) || '',
      numero_certificado: licencia.numero_certificado || '',
      vigencia: licencia.vigencia
        ? String(licencia.vigencia).slice(0, 10)
        : '',
    })
    mostrarResultado('error', 'Editando licencia seleccionada.')
  }

  function cancelarEdicionLicencia() {
    setFormLicencia(LICENCIA_INICIAL)
  }

  async function guardarLicencia(event) {
    event.preventDefault()

    if (!puedeGestionarLicencias) {
      mostrarResultado('error', 
        'Las licencias solo pueden administrarse para personal marcado como instructor en el trabajo.'
      )
      return
    }

    if (
      !formLicencia.tipo_licencia ||
      !formLicencia.categoria ||
      !formLicencia.vigencia
    ) {
      mostrarResultado('error', 'Tipo, categoría y vigencia son obligatorios.')
      return
    }

    if (
      formLicencia.tipo_licencia === 'INSTRUCTOR' &&
      !formLicencia.numero_certificado
    ) {
      mostrarResultado('error', 
        'Para certificado de instructor debe indicar número de certificado.'
      )
      return
    }

    setGuardandoLicencia(true)

    try {
      const metodo = formLicencia.id ? 'PATCH' : 'POST'

      const response = await fetch(
        `/api/personal/${id}/licencias`,
        {
          method: metodo,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nit: nitActual,
            ...formLicencia,
            tipo_licencia: normalizarTipoLicenciaUI(
              formLicencia.tipo_licencia
            ),
            categoria: normalizarCategoriaLicenciaUI(
              formLicencia.categoria
            ),
            actualizado_por:
              user?.nombre_completo ||
              user?.nombreCompleto ||
              user?.usuario ||
              'ADMINISTRATIVO',
          }),
        }
      )

      let result = null

      try {
        result = await response.json()
      } catch {
        mostrarResultado('error', 'La respuesta del servidor no es válida.')
        return
      }

      // Las respuestas 409 corresponden a reglas de negocio.
      // No deben producir un error de Next.js en pantalla.
      if (
        response.status === 409 ||
        result?.status === 'warning'
      ) {
        mostrarResultado('error', 
          result?.message ||
            'No es posible registrar esta licencia o certificado.'
        )

        if (result?.licencia?.id) {
          const licencia = result.licencia

          setFormLicencia({
            id: licencia.id,
            tipo_licencia:
              normalizarTipoLicenciaUI(
                licencia.tipo_licencia ||
                  formLicencia.tipo_licencia
              ) || 'CONDUCCION',
            categoria: result?.requiere_recategorizacion
              ? normalizarCategoriaLicenciaUI(formLicencia.categoria)
              : normalizarCategoriaLicenciaUI(licencia.categoria),
            numero_certificado:
              normalizarTipoLicenciaUI(
                licencia.tipo_licencia ||
                  formLicencia.tipo_licencia
              ) === 'INSTRUCTOR'
                ? licencia.numero_certificado ||
                  formLicencia.numero_certificado ||
                  ''
                : '',
            vigencia: licencia.vigencia
              ? String(licencia.vigencia).slice(0, 10)
              : formLicencia.vigencia,
          })

          if (result?.requiere_recategorizacion) {
            mostrarResultado('error', 
              'Se cargó el registro vigente. Revise los datos y presione Actualizar.'
            )
          }
        }

        return
      }

      if (
        !response.ok ||
        result?.status !== 'success'
      ) {
        mostrarResultado('error', 
          result?.message ||
            'No fue posible guardar la licencia.'
        )
        return
      }

      mostrarResultado('exito', 
        formLicencia.id
          ? result?.operacion === 'recategorizacion'
            ? 'Recategorización registrada. El historial anterior se conserva.'
            : 'Renovación registrada. El historial anterior se conserva.'
          : 'Licencia registrada correctamente.'
      )

      setFormLicencia(LICENCIA_INICIAL)
      await cargarLicencias()
    } catch (error) {
      console.error(
        'Error de conexión guardando licencia:',
        error
      )

      mostrarResultado('error', 
        'No fue posible comunicarse con el servidor. Verifique la conexión e intente nuevamente.'
      )
    } finally {
      setGuardandoLicencia(false)
    }
  }


  async function eliminarLicencia(licenciaId) {
    if (!puedeGestionarLicencias) {
      mostrarResultado('error', 
        'Las licencias solo pueden administrarse para personal marcado como instructor en el trabajo.'
      )
      return
    }

    const confirmar = await confirmarAccion('¿Deseas eliminar esta licencia o certificado? Esta acción no se puede deshacer.')
    if (!confirmar) return

    try {
      const response = await fetch(`/api/personal/${id}/licencias?nit=${nitActual}&licencia_id=${licenciaId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible eliminar la licencia.')
      }

      mostrarResultado('exito', 'Licencia eliminada correctamente.')
      if (formLicencia.id === licenciaId) {
        setFormLicencia(LICENCIA_INICIAL)
      }
      await cargarLicencias()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible eliminar la licencia.')
    }
  }

  async function cargarReferencias() {
    setCargandoReferencias(true)
    try {
      const response = await fetch(`/api/personal/${id}/referencias?nit=${nitActual}`)
      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible cargar las referencias.')
      }

      setReferencias(result.referencias || [])
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible cargar las referencias.')
    } finally {
      setCargandoReferencias(false)
    }
  }

  function cambiarReferencia(event) {
    const { name, value } = event.target
    let nuevoValor = value

    if (['nombre', 'ocupacion_cargo', 'empresa', 'relacion'].includes(name)) {
      nuevoValor = value.toUpperCase()
    }

    if (name === 'telefono') {
      nuevoValor = value.replace(/\D/g, '')
    }

    if (name === 'email') {
      nuevoValor = value.trim().toLowerCase()
    }

    setFormReferencia((prev) => ({
      ...prev,
      [name]: nuevoValor,
    }))
  }

  function editarReferencia(referencia) {
    setFormReferencia({
      id: referencia.id,
      tipo_referencia: referencia.tipo_referencia || 'personal',
      nombre: referencia.nombre || '',
      ocupacion_cargo: referencia.ocupacion_cargo || '',
      empresa: referencia.empresa || '',
      telefono: referencia.telefono || '',
      email: referencia.email || '',
      relacion: referencia.relacion || '',
      observaciones: referencia.observaciones || '',
    })
    mostrarResultado('error', 'Editando referencia seleccionada.')
  }

  function cancelarEdicionReferencia() {
    setFormReferencia(REFERENCIA_INICIAL)
  }

  async function eliminarReferencia(referenciaId) {
    const confirmar = await confirmarAccion('¿Deseas eliminar esta referencia? Esta acción no se puede deshacer.')
    if (!confirmar) return

    try {
      const response = await fetch(`/api/personal/${id}/referencias?nit=${nitActual}&referencia_id=${referenciaId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible eliminar la referencia.')
      }

      mostrarResultado('exito', 'Referencia eliminada correctamente.')
      if (formReferencia.id === referenciaId) {
        setFormReferencia(REFERENCIA_INICIAL)
      }
      await cargarReferencias()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible eliminar la referencia.')
    }
  }

  async function guardarReferencia(event) {
    event.preventDefault()

    if (!formReferencia.tipo_referencia || !formReferencia.nombre || !formReferencia.telefono) {
      mostrarResultado('error', 'Tipo de referencia, nombre y teléfono son obligatorios.')
      return
    }

    if (formReferencia.telefono.length < 7) {
      mostrarResultado('error', 'El teléfono de la referencia debe tener mínimo 7 dígitos.')
      return
    }

    if (formReferencia.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formReferencia.email)) {
      mostrarResultado('error', 'El correo de la referencia no tiene un formato válido.')
      return
    }

    setGuardandoReferencia(true)
    try {
      const metodo = formReferencia.id ? 'PATCH' : 'POST'
      const response = await fetch(`/api/personal/${id}/referencias`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nit: nitActual,
          ...formReferencia,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible guardar la referencia.')
      }

      mostrarResultado('exito', formReferencia.id ? 'Referencia actualizada correctamente.' : 'Referencia registrada correctamente.')
      setFormReferencia(REFERENCIA_INICIAL)
      await cargarReferencias()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible guardar la referencia.')
    } finally {
      setGuardandoReferencia(false)
    }
  }


  async function cargarEvaluaciones() {
    setCargandoEvaluaciones(true)
    try {
      const response = await fetch(`/api/personal/${id}/evaluaciones?nit=${nitActual}`)
      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible cargar las evaluaciones.')
      }

      setEvaluaciones(result.evaluaciones || [])
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible cargar las evaluaciones.')
    } finally {
      setCargandoEvaluaciones(false)
    }
  }

  function cambiarEvaluacion(event) {
    const { name, value } = event.target
    let nuevoValor = value

    if (['tipo_evaluacion', 'resultado', 'evaluador'].includes(name)) {
      nuevoValor = value.toUpperCase()
    }

    setFormEvaluacion((prev) => ({
      ...prev,
      [name]: nuevoValor,
    }))
  }

  async function guardarEvaluacion(event) {
    event.preventDefault()

    if (!formEvaluacion.tipo_evaluacion || !formEvaluacion.fecha_evaluacion || !formEvaluacion.resultado) {
      mostrarResultado('error', 'Tipo de evaluación, fecha y resultado son obligatorios.')
      return
    }

    setGuardandoEvaluacion(true)
    try {
      const metodo = formEvaluacion.id ? 'PATCH' : 'POST'
      const response = await fetch(`/api/personal/${id}/evaluaciones`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nit: nitActual,
          ...formEvaluacion,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible guardar la evaluación.')
      }

      mostrarResultado('exito', formEvaluacion.id ? 'Evaluación actualizada correctamente.' : 'Evaluación registrada correctamente.')
      setFormEvaluacion(EVALUACION_INICIAL)
      await cargarEvaluaciones()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible guardar la evaluación.')
    } finally {
      setGuardandoEvaluacion(false)
    }
  }

  function editarEvaluacion(evaluacion) {
    setFormEvaluacion({
      id: evaluacion.id,
      tipo_evaluacion: evaluacion.tipo_evaluacion || '',
      fecha_evaluacion: evaluacion.fecha_evaluacion || '',
      resultado: evaluacion.resultado || '',
      evaluador: evaluacion.evaluador || '',
      observaciones: evaluacion.observaciones || '',
    })
    mostrarResultado('error', 'Editando evaluación seleccionada.')
  }

  function cancelarEdicionEvaluacion() {
    setFormEvaluacion(EVALUACION_INICIAL)
  }

  async function eliminarEvaluacion(evaluacionId) {
    const confirmar = await confirmarAccion('¿Deseas eliminar esta evaluación? Esta acción no se puede deshacer.')
    if (!confirmar) return

    try {
      const response = await fetch(`/api/personal/${id}/evaluaciones?nit=${nitActual}&evaluacion_id=${evaluacionId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible eliminar la evaluación.')
      }

      mostrarResultado('exito', 'Evaluación eliminada correctamente.')
      if (formEvaluacion.id === evaluacionId) {
        setFormEvaluacion(EVALUACION_INICIAL)
      }
      await cargarEvaluaciones()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible eliminar la evaluación.')
    }
  }


  async function cargarDocumentos() {
    setCargandoDocumentos(true)
    try {
      const response = await fetch(`/api/personal/${id}/documentos?nit=${nitActual}`)
      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible cargar los documentos.')
      }

      setDocumentos(result.documentos || [])
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible cargar los documentos.')
    } finally {
      setCargandoDocumentos(false)
    }
  }

  function cambiarDocumento(event) {
    const { name, value, type, checked } = event.target
    let nuevoValor = type === 'checkbox' ? checked : value

    if (['tipo_documento'].includes(name)) {
      nuevoValor = value.toUpperCase()
    }

    setFormDocumento((prev) => ({
      ...prev,
      [name]: nuevoValor,
    }))
  }

  async function guardarDocumento(event) {
    event.preventDefault()

    if (!formDocumento.tipo_documento || !formDocumento.nombre_documento) {
      mostrarResultado('error', 'Tipo de documento y nombre del documento son obligatorios.')
      return
    }

    if (formDocumento.vence && !formDocumento.fecha_vencimiento) {
      mostrarResultado('error', 'Si el documento vence, debe indicar la fecha de vencimiento.')
      return
    }

    setGuardandoDocumento(true)
    try {
      const metodo = formDocumento.id ? 'PATCH' : 'POST'
      const response = await fetch(`/api/personal/${id}/documentos`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nit: nitActual,
          ...formDocumento,
          fecha_vencimiento: formDocumento.vence ? formDocumento.fecha_vencimiento : '',
        }),
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible guardar el documento.')
      }

      mostrarResultado('exito', formDocumento.id ? 'Documento actualizado correctamente.' : 'Documento registrado correctamente.')
      setFormDocumento(DOCUMENTO_INICIAL)
      await cargarDocumentos()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible guardar el documento.')
    } finally {
      setGuardandoDocumento(false)
    }
  }

  function editarDocumento(documento) {
    setFormDocumento({
      id: documento.id,
      tipo_documento: documento.tipo_documento || '',
      nombre_documento: documento.nombre_documento || '',
      archivo_url: documento.archivo_url || '',
      vence: Boolean(documento.vence),
      fecha_vencimiento: documento.fecha_vencimiento || '',
      estado: documento.estado || 'vigente',
      observaciones: documento.observaciones || '',
    })
    mostrarResultado('error', 'Editando documento seleccionado.')
  }

  function cancelarEdicionDocumento() {
    setFormDocumento(DOCUMENTO_INICIAL)
  }

  async function eliminarDocumento(documentoId) {
    const confirmar = await confirmarAccion('¿Deseas eliminar este documento? Esta acción no se puede deshacer.')
    if (!confirmar) return

    try {
      const response = await fetch(`/api/personal/${id}/documentos?nit=${nitActual}&documento_id=${documentoId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible eliminar el documento.')
      }

      mostrarResultado('exito', 'Documento eliminado correctamente.')
      if (formDocumento.id === documentoId) {
        setFormDocumento(DOCUMENTO_INICIAL)
      }
      await cargarDocumentos()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible eliminar el documento.')
    }
  }

  async function cargarCuenta() {
    setCargandoCuenta(true)
    try {
      const response = await fetch(`/api/personal/${id}/cuenta?nit=${encodeURIComponent(nitActual)}`)
      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible cargar la cuenta de usuario.')
      }

      const cuenta = result.cuenta || null
      setCuentaUsuario(cuenta)
      setPerfilesCuenta((cuenta?.perfiles_usuario || []).filter((perfil) => perfil.estado === 'activo').map((perfil) => perfil.rol))
      setFormCuenta({
        email_autorizado: cuenta?.email_autorizado || data?.personal?.email || '',
        estado: cuenta?.estado || 'activo',
        observaciones: cuenta?.observaciones || '',
      })
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible cargar la cuenta de usuario.')
    } finally {
      setCargandoCuenta(false)
    }
  }

  function cambiarCuenta(event) {
    const { name, value } = event.target

    setFormCuenta((prev) => ({
      ...prev,
      [name]: name === 'email_autorizado' ? value.trim().toLowerCase() : value,
    }))
  }

  async function guardarCuenta(event) {
    event.preventDefault()

    if (!formCuenta.email_autorizado) {
      mostrarResultado('error', 'El correo autorizado es obligatorio.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formCuenta.email_autorizado)) {
      mostrarResultado('error', 'El correo autorizado no tiene un formato válido.')
      return
    }

    if (!formCuenta.estado) {
      mostrarResultado('error', 'Selecciona el estado de la cuenta.')
      return
    }

    setGuardandoCuenta(true)
    try {
      const response = await fetch(`/api/personal/${id}/cuenta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nit: nitActual,
          email_autorizado: formCuenta.email_autorizado,
          estado: formCuenta.estado,
          observaciones: formCuenta.observaciones,
          perfiles: perfilesCuenta,
          actualizado_por: user?.nombreCompleto || user?.usuario || 'ADMINISTRATIVO',
        }),
      })

      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'No fue posible actualizar la cuenta de usuario.')
      }

      mostrarResultado('exito', 'Cuenta de usuario actualizada correctamente.')
      setCuentaUsuario(result.cuenta || null)
      setData((prev) => ({
        ...prev,
        cuenta: result.cuenta || prev?.cuenta,
        personal: prev?.personal
          ? { ...prev.personal, email: formCuenta.email_autorizado }
          : prev?.personal,
      }))
      await cargarCuenta()
    } catch (error) {
      console.error(error)
      mostrarResultado('error', error.message || 'No fue posible actualizar la cuenta de usuario.')
    } finally {
      setGuardandoCuenta(false)
    }
  }

  if (!user) return <p className="text-center mt-20">Cargando...</p>

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-3 md:p-5">
      {editarGeneralAbierto && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3">
          <div role="dialog" aria-modal="true" aria-label="Editar información general" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#194567] px-4 py-3 text-white">
              <h2 className="flex items-center gap-2 text-sm font-bold"><i className="fas fa-user-edit" aria-hidden="true"></i> Editar información general</h2>
              <button type="button" onClick={() => setEditarGeneralAbierto(false)} disabled={guardandoGeneral} aria-label="Cerrar" className="rounded p-1 hover:bg-white/20"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={guardarInformacionGeneral} className="flex min-h-0 flex-col">
              <div className="space-y-4 overflow-y-auto p-4">
                <p className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-[#194567]">Documento y correo de acceso se gestionan por separado para evitar inconsistencias con la cuenta de usuario.</p>
                {CAMPOS_EDICION_GENERAL.map(([seccion, campos]) => (
                  <section key={seccion} className="overflow-hidden rounded-md border border-slate-300">
                    <h3 className="flex items-center gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-[#194567]"><i className="fas fa-edit" aria-hidden="true"></i>{seccion}</h3>
                    <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
                      {campos.map(([campo, etiqueta, tipo = 'text']) => (
                        <div key={campo} className="min-w-0">
                          {tipo.startsWith('catalogo:') ? (
                            <CampoCatalogo catalogo={tipo.slice(9)} label={etiqueta} name={campo} value={formGeneral[campo] ?? ''} nit={nitActual} onChange={(event) => setFormGeneral((prev) => ({ ...prev, [campo]: event.target.value }))} />
                          ) : (
                            <>
                              <label htmlFor={`general-${campo}`} className="mb-1 block text-xs font-semibold text-slate-600">{etiqueta}</label>
                              {tipo.startsWith('select:') ? (
                                <select id={`general-${campo}`} value={formGeneral[campo] ?? ''} onChange={(event) => setFormGeneral((prev) => ({ ...prev, [campo]: event.target.value }))} className="w-full rounded-md border border-slate-400 bg-white p-2 text-xs">
                                  <option value="">Seleccione</option>
                                  {tipo.slice(7).split('|').map((opcion) => <option key={opcion} value={opcion}>{opcion.replaceAll('_',' ')}</option>)}
                                  {formGeneral[campo] && !tipo.slice(7).split('|').includes(formGeneral[campo]) && <option value={formGeneral[campo]}>{formGeneral[campo]}</option>}
                                </select>
                              ) : (
                                <input id={`general-${campo}`} type={tipo} value={formGeneral[campo] ?? ''} onChange={(event) => setFormGeneral((prev) => ({ ...prev, [campo]: event.target.value }))} className="w-full rounded-md border border-slate-400 bg-white p-2 text-xs" />
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-300 bg-slate-50 p-3">
                <button type="button" onClick={() => setEditarGeneralAbierto(false)} disabled={guardandoGeneral} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold"><i className="fas fa-times"></i> Cancelar</button>
                <button type="submit" disabled={guardandoGeneral} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><i className="fas fa-save"></i>{guardandoGeneral ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ModalResultado abierto={Boolean(resultadoModal)} tipo={resultadoModal?.tipo} mensaje={resultadoModal?.mensaje} onCerrar={() => setResultadoModal(null)} />
      <ModalResultado abierto={Boolean(confirmacion)} tipo="confirmacion" mensaje={confirmacion?.mensaje} onCerrar={() => cerrarConfirmacion(false)} onConfirmar={() => cerrarConfirmacion(true)} />
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Cargando hoja de vida...</p>
        </div>
      </div>
    )
  }

  if (!data?.personal) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
      {editarGeneralAbierto && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3">
          <div role="dialog" aria-modal="true" aria-label="Editar información general" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#194567] px-4 py-3 text-white">
              <h2 className="flex items-center gap-2 text-sm font-bold"><i className="fas fa-user-edit" aria-hidden="true"></i> Editar información general</h2>
              <button type="button" onClick={() => setEditarGeneralAbierto(false)} disabled={guardandoGeneral} aria-label="Cerrar" className="rounded p-1 hover:bg-white/20"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={guardarInformacionGeneral} className="flex min-h-0 flex-col">
              <div className="space-y-4 overflow-y-auto p-4">
                <p className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-[#194567]">Documento y correo de acceso se gestionan por separado para evitar inconsistencias con la cuenta de usuario.</p>
                {CAMPOS_EDICION_GENERAL.map(([seccion, campos]) => (
                  <section key={seccion} className="overflow-hidden rounded-md border border-slate-300">
                    <h3 className="flex items-center gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-[#194567]"><i className="fas fa-edit" aria-hidden="true"></i>{seccion}</h3>
                    <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
                      {campos.map(([campo, etiqueta, tipo = 'text']) => (
                        <div key={campo} className="min-w-0">
                          {tipo.startsWith('catalogo:') ? (
                            <CampoCatalogo catalogo={tipo.slice(9)} label={etiqueta} name={campo} value={formGeneral[campo] ?? ''} nit={nitActual} onChange={(event) => setFormGeneral((prev) => ({ ...prev, [campo]: event.target.value }))} />
                          ) : (
                            <>
                              <label htmlFor={`general-${campo}`} className="mb-1 block text-xs font-semibold text-slate-600">{etiqueta}</label>
                              {tipo.startsWith('select:') ? (
                                <select id={`general-${campo}`} value={formGeneral[campo] ?? ''} onChange={(event) => setFormGeneral((prev) => ({ ...prev, [campo]: event.target.value }))} className="w-full rounded-md border border-slate-400 bg-white p-2 text-xs">
                                  <option value="">Seleccione</option>
                                  {tipo.slice(7).split('|').map((opcion) => <option key={opcion} value={opcion}>{opcion.replaceAll('_',' ')}</option>)}
                                  {formGeneral[campo] && !tipo.slice(7).split('|').includes(formGeneral[campo]) && <option value={formGeneral[campo]}>{formGeneral[campo]}</option>}
                                </select>
                              ) : (
                                <input id={`general-${campo}`} type={tipo} value={formGeneral[campo] ?? ''} onChange={(event) => setFormGeneral((prev) => ({ ...prev, [campo]: event.target.value }))} className="w-full rounded-md border border-slate-400 bg-white p-2 text-xs" />
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-300 bg-slate-50 p-3">
                <button type="button" onClick={() => setEditarGeneralAbierto(false)} disabled={guardandoGeneral} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold"><i className="fas fa-times"></i> Cancelar</button>
                <button type="submit" disabled={guardandoGeneral} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><i className="fas fa-save"></i>{guardandoGeneral ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ModalResultado abierto={Boolean(resultadoModal)} tipo={resultadoModal?.tipo} mensaje={resultadoModal?.mensaje} onCerrar={() => setResultadoModal(null)} />
      <ModalResultado abierto={Boolean(confirmacion)} tipo="confirmacion" mensaje={confirmacion?.mensaje} onCerrar={() => cerrarConfirmacion(false)} onConfirmar={() => cerrarConfirmacion(true)} />
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow p-6">
          <p className="text-red-700">No se encontró el registro de personal.</p>
          <Link href="/admin/personal" className="mt-4 inline-block text-[var(--primary)] underline">
            Volver a personal
          </Link>
        </div>
      </div>
    )
  }

  const personal = data.personal

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {vistaPreviaPdf && (
        <div className="fixed inset-0 z-[120] bg-white">
          <div role="dialog" aria-modal="true" aria-label="Vista previa de hoja de vida PDF" className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-white">
            <div className="flex items-center justify-between gap-3 bg-[#194567] px-4 py-3 text-white">
              <h2 className="flex items-center gap-2 text-sm font-bold"><i className="fas fa-file-pdf" aria-hidden="true"></i> Vista previa · Hoja de vida</h2>
              <div className="flex items-center gap-2">
                <a href={vistaPreviaPdf} download={nombreArchivoHojaVida} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-[#194567] hover:bg-slate-100"><i className="fas fa-download" aria-hidden="true"></i> Descargar PDF</a>
                <button type="button" onClick={() => { URL.revokeObjectURL(vistaPreviaPdf); setVistaPreviaPdf(null) }} className="inline-flex items-center gap-2 rounded-md border border-white/50 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"><i className="fas fa-times" aria-hidden="true"></i> Cerrar</button>
              </div>
            </div>
            <VistaPreviaPdfLimpia {...datosVistaPrevia} />
          </div>
        </div>
      )}

      {editarGeneralAbierto && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3">
          <div role="dialog" aria-modal="true" aria-label="Editar información general" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#194567] px-4 py-3 text-white">
              <h2 className="flex items-center gap-2 text-sm font-bold"><i className="fas fa-user-edit" aria-hidden="true"></i> Editar información general</h2>
              <button type="button" onClick={() => setEditarGeneralAbierto(false)} disabled={guardandoGeneral} aria-label="Cerrar" className="rounded p-1 hover:bg-white/20"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={guardarInformacionGeneral} className="flex min-h-0 flex-col">
              <div className="space-y-4 overflow-y-auto p-4">
                <p className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-[#194567]">Documento y correo de acceso se gestionan por separado para evitar inconsistencias con la cuenta de usuario.</p>
                {CAMPOS_EDICION_GENERAL.map(([seccion, campos]) => (
                  <section key={seccion} className="overflow-hidden rounded-md border border-slate-300">
                    <h3 className="flex items-center gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-[#194567]"><i className="fas fa-edit" aria-hidden="true"></i>{seccion}</h3>
                    <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
                      {campos.map(([campo, etiqueta, tipo = 'text']) => (
                        <div key={campo} className="min-w-0">
                          {tipo.startsWith('catalogo:') ? (
                            <CampoCatalogo catalogo={tipo.slice(9)} label={etiqueta} name={campo} value={formGeneral[campo] ?? ''} nit={nitActual} onChange={(event) => setFormGeneral((prev) => ({ ...prev, [campo]: event.target.value }))} />
                          ) : (
                            <>
                              <label htmlFor={`general-${campo}`} className="mb-1 block text-xs font-semibold text-slate-600">{etiqueta}</label>
                              {tipo.startsWith('select:') ? (
                                <select id={`general-${campo}`} value={formGeneral[campo] ?? ''} onChange={(event) => setFormGeneral((prev) => ({ ...prev, [campo]: event.target.value }))} className="w-full rounded-md border border-slate-400 bg-white p-2 text-xs">
                                  <option value="">Seleccione</option>
                                  {tipo.slice(7).split('|').map((opcion) => <option key={opcion} value={opcion}>{opcion.replaceAll('_',' ')}</option>)}
                                  {formGeneral[campo] && !tipo.slice(7).split('|').includes(formGeneral[campo]) && <option value={formGeneral[campo]}>{formGeneral[campo]}</option>}
                                </select>
                              ) : (
                                <input id={`general-${campo}`} type={tipo} value={formGeneral[campo] ?? ''} onChange={(event) => setFormGeneral((prev) => ({ ...prev, [campo]: event.target.value }))} className="w-full rounded-md border border-slate-400 bg-white p-2 text-xs" />
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-300 bg-slate-50 p-3">
                <button type="button" onClick={() => setEditarGeneralAbierto(false)} disabled={guardandoGeneral} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold"><i className="fas fa-times"></i> Cancelar</button>
                <button type="submit" disabled={guardandoGeneral} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><i className="fas fa-save"></i>{guardandoGeneral ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ModalResultado abierto={Boolean(resultadoModal)} tipo={resultadoModal?.tipo} mensaje={resultadoModal?.mensaje} onCerrar={() => setResultadoModal(null)} />
      <ModalResultado abierto={Boolean(confirmacion)} tipo="confirmacion" mensaje={confirmacion?.mensaje} onCerrar={() => cerrarConfirmacion(false)} onConfirmar={() => cerrarConfirmacion(true)} />

      <div className="mx-auto max-w-7xl space-y-4">
        <section className="overflow-hidden rounded-lg border border-slate-400 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#194567] px-5 py-3 text-white">
            <div className="flex items-center gap-2">
              <i className="fas fa-file-alt" aria-hidden="true"></i>
              <h1 className="text-base font-bold">Hoja de vida del personal</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/personal" className="inline-flex items-center gap-2 rounded-md border border-white/60 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10">
              <i className="fas fa-arrow-left" aria-hidden="true"></i>
              Volver a personal
            </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 bg-slate-100 px-4 py-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.6fr)_repeat(4,minmax(0,1fr))] xl:items-stretch">
            <div className="flex min-w-0 flex-col justify-center border-b border-slate-300 pb-2 md:col-span-2 xl:col-span-1 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-3">
              <p className="break-words text-base font-bold text-[#194567]">{nombreCompleto}</p>
              <p className="mt-1 text-xs text-slate-600">Documento: {texto(personal.documento)}</p>
            </div>
            <Resumen label="Cargo" value={personal.cargo} />
            <Resumen label="Grupo de trabajo" value={personal.grupo_personal} />
            <Resumen label="Relación con el CEA" value={personal.tipo_personal} />
            <Resumen label="Estado" value={personal.estado} />
          </div>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Secciones de la hoja de vida" className="overflow-hidden rounded-lg border border-[#194567] bg-[#194567] p-2 text-white shadow-sm lg:sticky lg:top-4">
            <p className="hidden border-b border-white/25 px-3 py-3 text-xs font-bold uppercase tracking-wide text-white lg:mb-2 lg:block">Contenido del expediente</p>
            <div role="tablist" aria-label="Secciones de la hoja de vida" className="flex gap-2 overflow-x-auto lg:flex-col">
            {tabsVisibles.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                onClick={() => setTab(item.key)}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-left text-xs font-semibold transition ${tab === item.key ? 'bg-white text-[#194567] shadow-sm' : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'}`}
              >
                {item.label}
              </button>
            ))}
            </div>
          </nav>
          <section className="min-w-0 rounded-lg border border-slate-300 bg-white p-3 md:p-5" aria-label="Contenido de la sección seleccionada">
            {tab === 'general' && (
              <InformacionGeneral
                personal={personal}
                cuenta={data.cuenta}
                perfiles={data.perfiles}
                perfilProfesional={perfilProfesional}
                setPerfilProfesional={setPerfilProfesional}
                guardarPerfilProfesional={guardarPerfilProfesional}
                guardandoPerfil={guardandoPerfil}
                onEditarGeneral={abrirEdicionGeneral}
                onVisualizarPdf={visualizarHojaVida}
                fotoTemporal={fotoTemporal}
                onSeleccionarFoto={seleccionarFotografia}
                onEliminarFoto={eliminarFotografia}
                eliminandoFoto={eliminandoFoto}
                procesandoFoto={procesandoFoto}
              />
            )}
            {tab === 'licencias' &&
              puedeGestionarLicencias && (
              <Licencias
                licencias={licencias}
                formLicencia={formLicencia}
                cambiarLicencia={cambiarLicencia}
                guardarLicencia={guardarLicencia}
                guardandoLicencia={guardandoLicencia}
                cargandoLicencias={cargandoLicencias}
                editarLicencia={editarLicencia}
                eliminarLicencia={eliminarLicencia}
                cancelarEdicionLicencia={cancelarEdicionLicencia}
              />
            )}
            {tab === 'estudios' && (
              <Estudios
                estudios={estudios}
                formEstudio={formEstudio}
                cambiarEstudio={cambiarEstudio}
                guardarEstudio={guardarEstudio}
                guardandoEstudio={guardandoEstudio}
                cargandoEstudios={cargandoEstudios}
                editarEstudio={editarEstudio}
                eliminarEstudio={eliminarEstudio}
                cancelarEdicionEstudio={cancelarEdicionEstudio}
              />
            )}
            {tab === 'experiencia' && (
              <ExperienciaLaboral
                experiencia={experiencia}
                formExperiencia={formExperiencia}
                cambiarExperiencia={cambiarExperiencia}
                guardarExperiencia={guardarExperiencia}
                guardandoExperiencia={guardandoExperiencia}
                cargandoExperiencia={cargandoExperiencia}
                editarExperiencia={editarExperiencia}
                eliminarExperiencia={eliminarExperiencia}
                cancelarEdicionExperiencia={cancelarEdicionExperiencia}
              />
            )}
            {tab === 'referencias' && (
              <Referencias
                referencias={referencias}
                formReferencia={formReferencia}
                cambiarReferencia={cambiarReferencia}
                guardarReferencia={guardarReferencia}
                guardandoReferencia={guardandoReferencia}
                cargandoReferencias={cargandoReferencias}
                editarReferencia={editarReferencia}
                eliminarReferencia={eliminarReferencia}
                cancelarEdicionReferencia={cancelarEdicionReferencia}
              />
            )}
            {tab === 'documentos' && (
              <Documentos
                documentos={documentos}
                formDocumento={formDocumento}
                cambiarDocumento={cambiarDocumento}
                guardarDocumento={guardarDocumento}
                guardandoDocumento={guardandoDocumento}
                cargandoDocumentos={cargandoDocumentos}
                editarDocumento={editarDocumento}
                eliminarDocumento={eliminarDocumento}
                cancelarEdicionDocumento={cancelarEdicionDocumento}
              />
            )}
            {tab === 'evaluaciones' && (
              <Evaluaciones
                evaluaciones={evaluaciones}
                formEvaluacion={formEvaluacion}
                cambiarEvaluacion={cambiarEvaluacion}
                guardarEvaluacion={guardarEvaluacion}
                guardandoEvaluacion={guardandoEvaluacion}
                cargandoEvaluaciones={cargandoEvaluaciones}
                editarEvaluacion={editarEvaluacion}
                eliminarEvaluacion={eliminarEvaluacion}
                cancelarEdicionEvaluacion={cancelarEdicionEvaluacion}
              />
            )}
            {tab === 'cuenta' && (
              <CuentaUsuario
                cuenta={cuentaUsuario}
                perfiles={cuentaUsuario?.perfiles_usuario || data?.perfiles || []}
                formCuenta={formCuenta}
                cambiarCuenta={cambiarCuenta}
                guardarCuenta={guardarCuenta}
                guardandoCuenta={guardandoCuenta}
                cargandoCuenta={cargandoCuenta}
                perfilesCuenta={perfilesCuenta}
                setPerfilesCuenta={setPerfilesCuenta}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function CuentaUsuario({
  cuenta,
  perfiles,
  formCuenta,
  cambiarCuenta,
  guardarCuenta,
  guardandoCuenta,
  cargandoCuenta,
  perfilesCuenta,
  setPerfilesCuenta,
}) {
  if (cargandoCuenta) {
    return <p className="rounded-lg border p-4 text-sm text-gray-500">Cargando cuenta de usuario...</p>
  }

  if (!cuenta) {
    return (
      <div className="rounded-lg border bg-yellow-50 p-4 text-sm text-yellow-800">
        Esta persona no tiene cuenta de usuario creada. Si necesita acceso, debe preautorizarse desde el registro de personal o desde el módulo administrativo correspondiente.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white p-3 md:p-4">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#194567]">Cuenta de usuario</h3>
          <p className="text-sm text-gray-500">
            Administra el correo autorizado para recuperación de contraseña y el estado de acceso a la aplicación.
          </p>
        </div>

        <form onSubmit={guardarCuenta} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <CampoInput
              label="Documento"
              value={cuenta.documento || ''}
              disabled
            />
            <CampoInput
              label="Usuario login"
              value={cuenta.usuario_login || cuenta.documento || ''}
              disabled
            />
            <CampoInput
              label="Correo autorizado *"
              type="email"
              name="email_autorizado"
              value={formCuenta.email_autorizado}
              onChange={cambiarCuenta}
              wrapperClass="md:col-span-2"
            />
            <CampoSelect
              label="Estado cuenta *"
              name="estado"
              value={formCuenta.estado}
              onChange={cambiarCuenta}
              options={[
                ...(formCuenta.estado === 'pre_autorizado' ? [['pre_autorizado', 'Preautorizado (pendiente de registro)']] : []),
                ['activo', 'Activo'],
                ['inactivo', 'Inactivo'],
                ...(formCuenta.estado === 'suspendido' ? [['suspendido', 'Suspendido (estado anterior)']] : []),
              ]}
            />
            <CampoInput
              label="Fecha preautorización"
              value={fecha(cuenta.fecha_preautorizacion)}
              disabled
            />
            <CampoInput
              label="Fecha registro app"
              value={fecha(cuenta.fecha_registro_app)}
              disabled
            />
            <CampoInput
              label="Último acceso"
              value={cuenta.fecha_ultimo_acceso ? String(cuenta.fecha_ultimo_acceso).slice(0, 19).replace('T', ' ') : '-'}
              disabled
            />
          </div>

          <CampoTextarea
            label="Observaciones"
            name="observaciones"
            value={formCuenta.observaciones}
            onChange={cambiarCuenta}
            required={false}
          />

          <div className="rounded-md border border-slate-300 bg-white p-3 text-sm text-gray-700">
            <h4 className="flex items-center gap-2 font-bold text-[#194567]"><i className="fas fa-user-shield" aria-hidden="true"></i> Perfiles autorizados</h4>
            <p className="mt-1 text-xs text-slate-500">Seleccione los perfiles que podrá utilizar esta persona. Los perfiles desmarcados se inactivarán, sin borrar su historial.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PERFILES_DISPONIBLES.map(([rol, etiqueta]) => (
                <label key={rol} className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold">
                  <input type="checkbox" checked={perfilesCuenta.includes(rol)} onChange={(event) => setPerfilesCuenta((prev) => event.target.checked ? [...prev, rol] : prev.filter((actual) => actual !== rol))} className="h-4 w-4 accent-[#194567]" />
                  {etiqueta}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            Si el usuario perdió acceso a su correo o el buzón está lleno, cambia aquí el correo autorizado.
            Después el usuario podrá solicitar nuevamente la recuperación de contraseña desde el login.
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={guardandoCuenta}
              className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:bg-gray-400"
            >
              <i className="fas fa-save mr-2" aria-hidden="true"></i>{guardandoCuenta ? 'Guardando...' : 'Guardar cambios de cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Resumen({ label, value }) {
  return (
    <div className="rounded-lg border bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-800">{texto(value)}</p>
    </div>
  )
}

function InformacionGeneral({ personal, cuenta, perfiles, perfilProfesional, setPerfilProfesional, guardarPerfilProfesional, guardandoPerfil, onEditarGeneral, onVisualizarPdf, fotoTemporal, onSeleccionarFoto, onEliminarFoto, procesandoFoto, eliminandoFoto }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onVisualizarPdf} className="inline-flex items-center gap-2 rounded-md border border-[#194567] bg-white px-3 py-2 text-xs font-semibold text-[#194567] hover:bg-slate-100"><i className="fas fa-eye" aria-hidden="true"></i> Vista previa hoja de vida PDF</button>
        <button type="button" onClick={onEditarGeneral} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-3 py-2 text-xs font-semibold text-white hover:bg-[#12344e]"><i className="fas fa-pen" aria-hidden="true"></i> Editar información general</button>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-300 bg-slate-100 p-3">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-sm">
          {fotoTemporal ? <img src={fotoTemporal} alt="Fotografía del trabajador" className="h-full w-full object-cover" /> : <i className="fas fa-user text-3xl text-slate-500" aria-hidden="true"></i>}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#194567]"><i className="fas fa-camera" aria-hidden="true"></i> Fotografía para la hoja de vida</h3>
          <p className="text-xs text-slate-600">La fotografía se guarda permanentemente en el expediente del trabajador y se utiliza en la hoja de vida.</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#194567] px-3 py-2 text-xs font-semibold text-white hover:bg-[#12344e]">
              <i className="fas fa-upload" aria-hidden="true"></i>{procesandoFoto ? 'Procesando...' : 'Seleccionar fotografía'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onSeleccionarFoto} disabled={procesandoFoto} className="sr-only" />
            </label>
            {fotoTemporal && <button type="button" onClick={onEliminarFoto} disabled={procesandoFoto || eliminandoFoto} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{eliminandoFoto ? 'Eliminando...' : 'Eliminar fotografía'}</button>}
          </div>
        </div>
      </div>
      <Seccion titulo="Datos personales">
        <Dato label="Tipo documento" value={personal.tipo_documento} />
        <Dato label="Documento" value={personal.documento} />
        <Dato label="Nombres" value={personal.nombres} />
        <Dato label="Apellidos" value={personal.apellidos} />
        <Dato label="Fecha nacimiento" value={fecha(personal.fecha_nacimiento)} />
        <Dato label="Género" value={personal.genero} />
        <Dato label="Tipo sangre" value={personal.tipo_sangre} />
        <Dato label="Estado civil" value={personal.estado_civil} />
        <Dato label="Nivel académico principal" value={personal.escolaridad} />
        <Dato label="Profesión u oficio" value={personal.profesion} />
        <Dato label="Nacionalidad" value={personal.nacionalidad} />
        <Dato label="Número de hijos" value={personal.numero_hijos} />
      </Seccion>

      <Seccion titulo="Contacto">
        <Dato label="Teléfono" value={personal.telefono} />
        <Dato label="Correo" value={personal.email} />
        <Dato label="Departamento" value={personal.departamento_residencia} />
        <Dato label="Ciudad" value={personal.ciudad_residencia} />
        <Dato label="Dirección" value={personal.direccion} ancho="col-span-2" />
      </Seccion>

      <Seccion titulo="Vinculación">
        <Dato label="Relación con el CEA" value={personal.tipo_personal} />
        <Dato label="Cargo" value={personal.cargo} />
        <Dato label="Grupo de trabajo" value={personal.grupo_personal} />
        <Dato label="Modalidad de contrato" value={personal.tipo_contrato} />
        <Dato label="Permanencia en el CEA" value={personal.tipo_permanencia} />
        <Dato label="Fecha vinculación" value={fecha(personal.fecha_vinculacion)} />
        <Dato label="Fecha retiro" value={fecha(personal.fecha_retiro)} />
        <Dato label="Estado" value={personal.estado} />
      </Seccion>

      <Seccion titulo="Seguridad social y PESV">
        <Dato label="EPS" value={personal.eps} />
        <Dato label="ARL" value={personal.arl} />
        <Dato label="Fondo pensión" value={personal.fondo_pension} />
        <Dato label="Medio transporte" value={personal.medio_transporte_trabajo} />
        <Dato label="Rol instructor" value={personal.rol_conductor_instructor ? 'Sí' : 'No'} />
        <Dato label="Tipo vehículo rol" value={personal.tipo_vehiculo_rol} />
      </Seccion>

      <Seccion titulo="Contacto de emergencia">
        <Dato label="Nombre" value={personal.contacto_emergencia_nombre} />
        <Dato label="Parentesco" value={personal.contacto_emergencia_parentesco} />
        <Dato label="Teléfono" value={personal.contacto_emergencia_telefono} />
      </Seccion>

      <Seccion titulo="Acceso a la aplicación">
        <Dato label="Estado cuenta" value={cuenta?.estado || 'Sin cuenta'} />
        <div className="md:col-span-3">
          <p className="text-xs font-semibold text-gray-500">Perfiles autorizados</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(perfiles || []).length === 0 ? '-' : perfiles.map((perfil) => (
              <span key={perfil.id} className="rounded-md border bg-gray-100 px-2 py-1 text-xs">
                {perfil.rol}
              </span>
            ))}
          </div>
        </div>
      </Seccion>

      <section className="rounded-md border border-slate-300 p-3">
        <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#194567]">Perfil profesional</h3>
            <p className="text-sm text-gray-500">Completa aquí el resumen de hoja de vida. Este texto no se convierte a mayúsculas.</p>
          </div>
          <button
            type="button"
            onClick={guardarPerfilProfesional}
            disabled={guardandoPerfil}
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:bg-gray-400"
          >
            {guardandoPerfil ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </div>
        <textarea
          value={perfilProfesional}
          onChange={(event) => setPerfilProfesional(event.target.value)}
          rows={4}
          placeholder="Ejemplo: Instructor de conducción con experiencia en formación teórica y práctica, orientación al servicio y conocimiento en seguridad vial..."
          className="w-full rounded-lg border bg-white p-4 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </section>
    </div>
  )
}

function ModalExpediente({ abierto, titulo, cerrar, children }) {
  useEffect(() => {
    if (!abierto) return
    const onKeyDown = (event) => { if (event.key === 'Escape') cerrar() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [abierto, cerrar])
  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3" role="presentation">
      <div role="dialog" aria-modal="true" aria-label={titulo} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-400 bg-white shadow-xl">
        <div className="flex items-center justify-between bg-[#194567] px-4 py-3 text-white">
          <h2 className="flex items-center gap-2 text-sm font-bold"><i className="fas fa-file-alt" aria-hidden="true"></i>{titulo}</h2>
          <button type="button" onClick={cerrar} aria-label="Cerrar formulario" className="rounded p-1 hover:bg-white/20"><i className="fas fa-times" aria-hidden="true"></i></button>
        </div>
        <div className="overflow-y-auto p-3 sm:p-4">{children}</div>
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-right">
          <button type="button" onClick={cerrar} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"><i className="fas fa-times" aria-hidden="true"></i> Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function Estudios({ estudios, formEstudio, cambiarEstudio, guardarEstudio, guardandoEstudio, cargandoEstudios, editarEstudio, eliminarEstudio, cancelarEdicionEstudio }) {
  const [modalAbierto, setModalAbierto] = useState(false)
  useEffect(() => {
    if (formEstudio.id) setModalAbierto(true)
  }, [formEstudio.id])
  const cerrarModal = () => {
    setModalAbierto(false)
    cancelarEdicionEstudio()
  }

  return (
    <div className="space-y-6">
      <ModalExpediente abierto={modalAbierto} titulo={formEstudio.id ? 'Editar registro' : 'Nuevo registro'} cerrar={cerrarModal}>
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white p-3 md:p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#194567]">
              {formEstudio.id ? 'Editar estudio' : 'Agregar estudio'}
            </h3>
            <p className="text-sm text-gray-500">Registra o actualiza la formación académica de la persona.</p>
          </div>
          {formEstudio.id && (
            <button type="button" onClick={cerrarModal} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100">
              Cancelar edición
            </button>
          )}
        </div>

        <form onSubmit={guardarEstudio} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoSelect label="Nivel de estudio *" name="nivel_estudio" value={formEstudio.nivel_estudio} onChange={cambiarEstudio} options={[
              ['', 'Seleccione'],
              ['BACHILLER', 'Bachiller'],
              ['TÉCNICO', 'Técnico'],
              ['TECNÓLOGO', 'Tecnólogo'],
              ['PREGRADO', 'Pregrado'],
              ['POSGRADO', 'Posgrado'],
            ]} />
            <CampoInput label="Título obtenido *" name="titulo" value={formEstudio.titulo} onChange={cambiarEstudio} className="uppercase" />
            <CampoInput label="Institución *" name="institucion" value={formEstudio.institucion} onChange={cambiarEstudio} className="uppercase" />
            <CampoInput label="Fecha grado" type="date" name="fecha_grado" value={formEstudio.fecha_grado} onChange={cambiarEstudio} />
          </div>

          <CampoInput label="Observaciones" name="observaciones" value={formEstudio.observaciones} onChange={cambiarEstudio} />

          <div className="flex justify-end gap-2">
            {formEstudio.id && (
              <button type="button" onClick={cerrarModal} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100">
                Cancelar
              </button>
            )}
            <button type="submit" disabled={guardandoEstudio} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-4 py-2 text-xs font-semibold text-white hover:bg-[#12344e] disabled:bg-gray-400">
              <i className="fas fa-save" aria-hidden="true"></i> {guardandoEstudio ? 'Guardando...' : formEstudio.id ? 'Actualizar estudio' : 'Guardar estudio'}
            </button>
          </div>
        </form>
      </div>

      </ModalExpediente>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#194567]"><i className="fas fa-list" aria-hidden="true"></i> Estudios registrados</h3>
          <button type="button" onClick={() => setModalAbierto(true)} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-3 py-2 text-xs font-semibold text-white hover:bg-[#12344e]"><i className="fas fa-plus" aria-hidden="true"></i> Agregar estudio</button>
        </div>
        {cargandoEstudios ? (
          <p className="rounded-lg border p-4 text-sm text-gray-500">Cargando estudios...</p>
        ) : (
          <TablaEstudios
            estudios={estudios || []}
            editarEstudio={editarEstudio}
            eliminarEstudio={eliminarEstudio}
          />
        )}
      </div>
    </div>
  )
}

function TablaEstudios({ estudios, editarEstudio, eliminarEstudio }) {
  if (!estudios.length) {
    return <p className="rounded-lg border p-4 text-sm text-gray-500">No hay estudios registrados.</p>
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-300">
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-[#194567] text-white">
          <tr>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Nivel</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Título obtenido</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Institución</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Fecha grado</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Observaciones</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {estudios.map((item) => (
            <tr key={item.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50">
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(item.nivel_estudio)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs font-semibold text-slate-800">{texto(item.titulo)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(item.institucion)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{fecha(item.fecha_grado)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(item.observaciones)}</td>
              <td className="whitespace-nowrap border border-slate-300 px-2 py-2 align-middle text-xs text-slate-700">
                <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                  <button type="button" onClick={() => editarEstudio(item)} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#194567] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#12344e]">
                    <i className="fas fa-pen" aria-hidden="true"></i> Editar
                  </button>
                  <button type="button" onClick={() => eliminarEstudio(item.id)} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-800">
                    <i className="fas fa-trash-alt" aria-hidden="true"></i> Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExperienciaLaboral({ experiencia, formExperiencia, cambiarExperiencia, guardarExperiencia, guardandoExperiencia, cargandoExperiencia, editarExperiencia, eliminarExperiencia, cancelarEdicionExperiencia }) {
  const [modalAbierto, setModalAbierto] = useState(false)
  useEffect(() => {
    if (formExperiencia.id) setModalAbierto(true)
  }, [formExperiencia.id])
  const cerrarModal = () => {
    setModalAbierto(false)
    cancelarEdicionExperiencia()
  }

  return (
    <div className="space-y-6">
      <ModalExpediente abierto={modalAbierto} titulo={formExperiencia.id ? 'Editar registro' : 'Nuevo registro'} cerrar={cerrarModal}>
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white p-3 md:p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#194567]">
              {formExperiencia.id ? 'Editar experiencia laboral' : 'Agregar experiencia laboral'}
            </h3>
            <p className="text-sm text-gray-500">Registra o actualiza la experiencia laboral de la persona.</p>
          </div>
          {formExperiencia.id && (
            <button type="button" onClick={cerrarModal} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100">
              Cancelar edición
            </button>
          )}
        </div>
        <form onSubmit={guardarExperiencia} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoInput label="Empresa *" name="empresa" value={formExperiencia.empresa} onChange={cambiarExperiencia} className="uppercase" />
            <CampoInput label="Cargo *" name="cargo" value={formExperiencia.cargo} onChange={cambiarExperiencia} className="uppercase" />
            <CampoInput label="Fecha inicio *" type="date" name="fecha_inicio" value={formExperiencia.fecha_inicio} onChange={cambiarExperiencia} />
            <CampoInput label="Fecha fin" type="date" name="fecha_fin" value={formExperiencia.fecha_fin} onChange={cambiarExperiencia} disabled={formExperiencia.actualmente} />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="actualmente" checked={formExperiencia.actualmente} onChange={cambiarExperiencia} className="h-4 w-4" />
            Labora actualmente en esta empresa
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <CampoInput label="Jefe inmediato" name="jefe_inmediato" value={formExperiencia.jefe_inmediato} onChange={cambiarExperiencia} className="uppercase" />
            <CampoInput label="Teléfono contacto" name="telefono_contacto" value={formExperiencia.telefono_contacto} onChange={cambiarExperiencia} inputMode="numeric" />
            <CampoInput label="Observaciones" name="observaciones" value={formExperiencia.observaciones} onChange={cambiarExperiencia} />
          </div>

          <CampoTextarea label="Funciones realizadas" name="funciones" value={formExperiencia.funciones} onChange={cambiarExperiencia} required={false} />

          <div className="flex justify-end gap-2">
            {formExperiencia.id && (
              <button type="button" onClick={cerrarModal} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100">
                Cancelar
              </button>
            )}
            <button type="submit" disabled={guardandoExperiencia} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-4 py-2 text-xs font-semibold text-white hover:bg-[#12344e] disabled:bg-gray-400">
              <i className="fas fa-save" aria-hidden="true"></i> {guardandoExperiencia ? 'Guardando...' : formExperiencia.id ? 'Actualizar experiencia' : 'Guardar experiencia'}
            </button>
          </div>
        </form>
      </div>

      </ModalExpediente>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#194567]"><i className="fas fa-list" aria-hidden="true"></i> Experiencia registrada</h3>
          <button type="button" onClick={() => setModalAbierto(true)} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-3 py-2 text-xs font-semibold text-white hover:bg-[#12344e]"><i className="fas fa-plus" aria-hidden="true"></i> Agregar experiencia</button>
        </div>
        {cargandoExperiencia ? (
          <p className="rounded-lg border p-4 text-sm text-gray-500">Cargando experiencia laboral...</p>
        ) : (
          <TablaExperiencia
            experiencia={experiencia || []}
            editarExperiencia={editarExperiencia}
            eliminarExperiencia={eliminarExperiencia}
          />
        )}
      </div>
    </div>
  )
}


function TablaExperiencia({ experiencia, editarExperiencia, eliminarExperiencia }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-300">
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-[#194567] text-white">
          <tr>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Empresa</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Cargo</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Fecha inicio</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Fecha fin</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Actualmente</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Jefe inmediato</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Teléfono</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {experiencia.length === 0 ? (
            <tr>
              <td colSpan={8} className="border border-slate-300 p-4 text-center text-gray-500">No hay experiencia laboral registrada.</td>
            </tr>
          ) : experiencia.map((item) => (
            <tr key={item.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50">
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(item.empresa)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(item.cargo)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{fecha(item.fecha_inicio)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{item.actualmente ? 'Actualmente' : fecha(item.fecha_fin)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{item.actualmente ? 'Sí' : 'No'}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(item.jefe_inmediato)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(item.telefono_contacto)}</td>
              <td className="whitespace-nowrap border border-slate-300 px-2 py-2 align-middle text-xs text-slate-700">
                <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                  <button type="button" onClick={() => editarExperiencia(item)} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#194567] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#12344e]">
                    <i className="fas fa-pen" aria-hidden="true"></i> Editar
                  </button>
                  <button type="button" onClick={() => eliminarExperiencia(item.id)} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-800">
                    <i className="fas fa-trash-alt" aria-hidden="true"></i> Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Licencias({
  licencias,
  formLicencia,
  cambiarLicencia,
  guardarLicencia,
  guardandoLicencia,
  cargandoLicencias,
  editarLicencia,
  eliminarLicencia,
  cancelarEdicionLicencia,
}) {
  const [modalAbierto, setModalAbierto] = useState(false)
  useEffect(() => {
    if (formLicencia.id) setModalAbierto(true)
  }, [formLicencia.id])
  const cerrarModal = () => {
    setModalAbierto(false)
    cancelarEdicionLicencia()
  }

  return (
    <div className="space-y-6">
      <ModalExpediente abierto={modalAbierto} titulo={formLicencia.id ? 'Editar registro' : 'Nuevo registro'} cerrar={cerrarModal}>
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white p-3 md:p-4">
        <h3 className="mb-1 text-sm font-bold text-[#194567]">
          {formLicencia.id
            ? 'Actualizar licencia o certificado'
            : 'Agregar licencia o certificado'}
        </h3>

        {formLicencia.id && (
          <p className="mb-4 text-xs text-gray-600">
            La actualización creará un nuevo registro y conservará la versión anterior en el historial.
          </p>
        )}

        <form onSubmit={guardarLicencia} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoSelect
              label="Tipo *"
              name="tipo_licencia"
              value={formLicencia.tipo_licencia}
              onChange={cambiarLicencia}
              options={[
                ['CONDUCCION', 'Licencia de conducción'],
                ['INSTRUCTOR', 'Certificado instructor'],
              ]}
            />

            <CampoSelect
              label="Categoría *"
              name="categoria"
              value={formLicencia.categoria}
              onChange={cambiarLicencia}
              options={[
                ['', 'Seleccione'],
                ...CATEGORIAS_LICENCIA.map((categoria) => [
                  categoria,
                  categoria,
                ]),
              ]}
            />

            {formLicencia.tipo_licencia === 'INSTRUCTOR' && (
              <CampoInput
                label="Número certificado *"
                name="numero_certificado"
                value={formLicencia.numero_certificado}
                onChange={cambiarLicencia}
                className="uppercase"
              />
            )}

            <CampoInput
              label="Vigencia *"
              type="date"
              name="vigencia"
              value={formLicencia.vigencia}
              onChange={cambiarLicencia}
            />
          </div>

          <div className="flex justify-end gap-2">
            {formLicencia.id && (
              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={guardandoLicencia}
              className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-4 py-2 text-xs font-semibold text-white hover:bg-[#12344e] disabled:bg-gray-400"
            >
              {guardandoLicencia
                ? 'Guardando...'
                : formLicencia.id
                ? 'Actualizar'
                : 'Guardar'}
            </button>
          </div>
        </form>
      </div>

      </ModalExpediente>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#194567]">
          Historial de licencias y certificados
        </h3>
          <button type="button" onClick={() => setModalAbierto(true)} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-3 py-2 text-xs font-semibold text-white hover:bg-[#12344e]"><i className="fas fa-plus" aria-hidden="true"></i> Agregar licencia o certificado</button>
        </div>

        <p className="mb-4 text-xs text-gray-600">
          Se conservan las renovaciones y recategorizaciones realizadas. Solo el registro más reciente de cada grupo puede generar una nueva renovación.
        </p>

        {cargandoLicencias ? (
          <p className="rounded-lg border p-4 text-sm text-gray-500">
            Cargando licencias...
          </p>
        ) : (
          <TablaLicencias
            licencias={licencias || []}
            editarLicencia={editarLicencia}
            eliminarLicencia={eliminarLicencia}
          />
        )}
      </div>
    </div>
  )
}

function TablaLicencias({
  licencias,
  editarLicencia,
  eliminarLicencia,
}) {
  const idsActuales = new Set()
  const gruposVistos = new Set()

  // La API entrega fecha_actualizacion DESC e id DESC.
  // El primer registro encontrado en cada grupo es el actual.
  for (const licencia of licencias) {
    const clave = claveGrupoLicencia(licencia)

    if (!gruposVistos.has(clave)) {
      gruposVistos.add(clave)
      idsActuales.add(licencia.id)
    }
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-300">
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-[#194567] text-white">
          <tr>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Tipo</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Categoría</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">No. certificado</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Vigencia</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Estado</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Fecha actualización</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Actualizado por</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Versión</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Acción</th>
          </tr>
        </thead>

        <tbody>
          {licencias.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="border border-slate-300 p-4 text-center text-gray-500"
              >
                No hay licencias o certificados registrados.
              </td>
            </tr>
          ) : (
            licencias.map((licencia) => {
              const tipo = normalizarTipoLicenciaUI(
                licencia.tipo_licencia
              )

              const estado = estadoVigenciaLicencia(licencia)
              const esActual = idsActuales.has(licencia.id)

              return (
                <tr
                  key={licencia.id}
                  className={
                    esActual
                      ? 'bg-white hover:bg-gray-50'
                      : 'bg-gray-50/70 text-gray-600'
                  }
                >
                  <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">
                    {tipo === 'INSTRUCTOR'
                      ? 'Certificado instructor'
                      : tipo === 'CONDUCCION'
                      ? 'Licencia de conducción'
                      : texto(licencia.tipo_licencia)}
                  </td>

                  <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">
                    {texto(
                      normalizarCategoriaLicenciaUI(
                        licencia.categoria
                      )
                    )}
                  </td>

                  <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">
                    {texto(licencia.numero_certificado)}
                  </td>

                  <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">
                    {fecha(licencia.vigencia)}
                  </td>

                  <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
                        estado === 'VIGENTE'
                          ? 'border-green-300 bg-green-100 text-green-700'
                          : estado === 'VENCIDA'
                          ? 'border-red-300 bg-red-100 text-red-700'
                          : 'border-gray-300 bg-gray-100 text-gray-600'
                      }`}
                    >
                      {estado === 'SIN_VIGENCIA'
                        ? 'SIN VIGENCIA'
                        : estado}
                    </span>
                  </td>

                  <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">
                    {fecha(licencia.fecha_actualizacion)}
                  </td>

                  <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">
                    {texto(licencia.nombre_quien_actualiza)}
                  </td>

                  <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        esActual
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {esActual ? 'ACTUAL' : 'HISTÓRICO'}
                    </span>
                  </td>

                  <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">
                    {esActual ? (
                      <button
                        type="button"
                        onClick={() => editarLicencia(licencia)}
                        className={`rounded-md px-3 py-1 text-xs font-semibold text-white ${
                          estado === 'VENCIDA'
                            ? 'bg-red-600 hover:bg-red-800'
                            : 'bg-gray-700 hover:bg-gray-900'
                        }`}
                      >
                        <i className="fas fa-sync-alt mr-1" aria-hidden="true"></i>
                        Actualizar
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500">
                        Solo consulta
                      </span>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}


function Referencias({
  referencias,
  formReferencia,
  cambiarReferencia,
  guardarReferencia,
  guardandoReferencia,
  cargandoReferencias,
  editarReferencia,
  eliminarReferencia,
  cancelarEdicionReferencia,
}) {
  const [modalAbierto, setModalAbierto] = useState(false)
  useEffect(() => {
    if (formReferencia.id) setModalAbierto(true)
  }, [formReferencia.id])
  const cerrarModal = () => {
    setModalAbierto(false)
    cancelarEdicionReferencia()
  }

  return (
    <div className="space-y-6">
      <ModalExpediente abierto={modalAbierto} titulo={formReferencia.id ? 'Editar registro' : 'Nuevo registro'} cerrar={cerrarModal}>
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white p-3 md:p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#194567]">
              {formReferencia.id ? 'Editar referencia' : 'Agregar referencia'}
            </h3>
            <p className="text-sm text-gray-500">
              Registra referencias personales o laborales para completar la hoja de vida.
            </p>
          </div>
          {formReferencia.id && (
            <button
              type="button"
              onClick={cerrarModal}
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <form onSubmit={guardarReferencia} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoSelect label="Tipo referencia *" name="tipo_referencia" value={formReferencia.tipo_referencia} onChange={cambiarReferencia} options={[
              ['personal', 'Personal'],
              ['laboral', 'Laboral'],
            ]} />
            <CampoInput label="Nombre *" name="nombre" value={formReferencia.nombre} onChange={cambiarReferencia} className="uppercase" />
            <CampoInput label="Teléfono *" name="telefono" value={formReferencia.telefono} onChange={cambiarReferencia} inputMode="numeric" />
            <CampoInput label="Correo" type="email" name="email" value={formReferencia.email} onChange={cambiarReferencia} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoInput label="Ocupación / cargo" name="ocupacion_cargo" value={formReferencia.ocupacion_cargo} onChange={cambiarReferencia} className="uppercase" />
            <CampoInput label="Empresa" name="empresa" value={formReferencia.empresa} onChange={cambiarReferencia} className="uppercase" />
            <CampoInput label="Relación / parentesco" name="relacion" value={formReferencia.relacion} onChange={cambiarReferencia} className="uppercase" />
            <CampoInput label="Observaciones" name="observaciones" value={formReferencia.observaciones} onChange={cambiarReferencia} />
          </div>

          <div className="flex justify-end gap-2">
            {formReferencia.id && (
              <button type="button" onClick={cerrarModal} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100">
                Cancelar
              </button>
            )}
            <button type="submit" disabled={guardandoReferencia} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-4 py-2 text-xs font-semibold text-white hover:bg-[#12344e] disabled:bg-gray-400">
              <i className="fas fa-save" aria-hidden="true"></i> {guardandoReferencia ? 'Guardando...' : formReferencia.id ? 'Actualizar referencia' : 'Guardar referencia'}
            </button>
          </div>
        </form>
      </div>

      </ModalExpediente>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#194567]"><i className="fas fa-list" aria-hidden="true"></i> Referencias registradas</h3>
          <button type="button" onClick={() => setModalAbierto(true)} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-3 py-2 text-xs font-semibold text-white hover:bg-[#12344e]"><i className="fas fa-plus" aria-hidden="true"></i> Agregar referencia</button>
        </div>
        {cargandoReferencias ? (
          <p className="rounded-lg border p-4 text-sm text-gray-500">Cargando referencias...</p>
        ) : (
          <TablaReferencias
            referencias={referencias || []}
            editarReferencia={editarReferencia}
            eliminarReferencia={eliminarReferencia}
          />
        )}
      </div>
    </div>
  )
}

function TablaReferencias({ referencias, editarReferencia, eliminarReferencia }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-300">
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-[#194567] text-white">
          <tr>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Tipo</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Nombre</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Ocupación / cargo</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Empresa</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Teléfono</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Correo</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Relación</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {referencias.length === 0 ? (
            <tr>
              <td colSpan={8} className="border border-slate-300 p-4 text-center text-gray-500">No hay referencias registradas.</td>
            </tr>
          ) : referencias.map((referencia) => (
            <tr key={referencia.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50">
              <td className="border border-slate-300 px-3 py-2 align-top text-xs capitalize text-slate-700">{texto(referencia.tipo_referencia)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(referencia.nombre)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(referencia.ocupacion_cargo)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(referencia.empresa)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(referencia.telefono)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(referencia.email)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(referencia.relacion)}</td>
              <td className="whitespace-nowrap border border-slate-300 px-2 py-2 align-middle text-xs text-slate-700">
                <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => editarReferencia(referencia)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#194567] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#12344e]"
                  >
                    <i className="fas fa-pen" aria-hidden="true"></i> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarReferencia(referencia.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                  >
                    <i className="fas fa-trash-alt" aria-hidden="true"></i> Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


function Evaluaciones({
  evaluaciones,
  formEvaluacion,
  cambiarEvaluacion,
  guardarEvaluacion,
  guardandoEvaluacion,
  cargandoEvaluaciones,
  editarEvaluacion,
  eliminarEvaluacion,
  cancelarEdicionEvaluacion,
}) {
  const [modalAbierto, setModalAbierto] = useState(false)
  useEffect(() => {
    if (formEvaluacion.id) setModalAbierto(true)
  }, [formEvaluacion.id])
  const cerrarModal = () => {
    setModalAbierto(false)
    cancelarEdicionEvaluacion()
  }

  return (
    <div className="space-y-6">
      <ModalExpediente abierto={modalAbierto} titulo={formEvaluacion.id ? 'Editar registro' : 'Nuevo registro'} cerrar={cerrarModal}>
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white p-3 md:p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#194567]">
              {formEvaluacion.id ? 'Editar evaluación' : 'Agregar evaluación'}
            </h3>
            <p className="text-sm text-gray-500">
              Registra evaluaciones de competencia, desempeño o seguimiento del personal.
            </p>
          </div>
          {formEvaluacion.id && (
            <button
              type="button"
              onClick={cerrarModal}
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <form onSubmit={guardarEvaluacion} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoSelect label="Tipo evaluación *" name="tipo_evaluacion" value={formEvaluacion.tipo_evaluacion} onChange={cambiarEvaluacion} options={[
              ['', 'Seleccione'],
              ['EVALUACIÓN DE COMPETENCIA', 'Evaluación de competencia'],
              ['EVALUACIÓN DE DESEMPEÑO', 'Evaluación de desempeño'],
              ['SEGUIMIENTO', 'Seguimiento'],
              ['OTRA', 'Otra'],
            ]} />
            <CampoInput label="Fecha evaluación *" type="date" name="fecha_evaluacion" value={formEvaluacion.fecha_evaluacion} onChange={cambiarEvaluacion} />
            <CampoSelect label="Resultado *" name="resultado" value={formEvaluacion.resultado} onChange={cambiarEvaluacion} options={[
              ['', 'Seleccione'],
              ['APROBADO', 'Aprobado'],
              ['NO APROBADO', 'No aprobado'],
              ['SATISFACTORIO', 'Satisfactorio'],
              ['REQUIERE MEJORA', 'Requiere mejora'],
              ['PENDIENTE', 'Pendiente'],
            ]} />
            <CampoInput label="Evaluador" name="evaluador" value={formEvaluacion.evaluador} onChange={cambiarEvaluacion} className="uppercase" />
          </div>

          <CampoTextarea label="Observaciones" name="observaciones" value={formEvaluacion.observaciones} onChange={cambiarEvaluacion} required={false} />

          <div className="flex justify-end gap-2">
            {formEvaluacion.id && (
              <button type="button" onClick={cerrarModal} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100">
                Cancelar
              </button>
            )}
            <button type="submit" disabled={guardandoEvaluacion} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-4 py-2 text-xs font-semibold text-white hover:bg-[#12344e] disabled:bg-gray-400">
              <i className="fas fa-save" aria-hidden="true"></i> {guardandoEvaluacion ? 'Guardando...' : formEvaluacion.id ? 'Actualizar evaluación' : 'Guardar evaluación'}
            </button>
          </div>
        </form>
      </div>

      </ModalExpediente>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#194567]"><i className="fas fa-list" aria-hidden="true"></i> Evaluaciones registradas</h3>
          <button type="button" onClick={() => setModalAbierto(true)} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-3 py-2 text-xs font-semibold text-white hover:bg-[#12344e]"><i className="fas fa-plus" aria-hidden="true"></i> Agregar evaluación</button>
        </div>
        {cargandoEvaluaciones ? (
          <p className="rounded-lg border p-4 text-sm text-gray-500">Cargando evaluaciones...</p>
        ) : (
          <TablaEvaluaciones
            evaluaciones={evaluaciones || []}
            editarEvaluacion={editarEvaluacion}
            eliminarEvaluacion={eliminarEvaluacion}
          />
        )}
      </div>
    </div>
  )
}

function TablaEvaluaciones({ evaluaciones, editarEvaluacion, eliminarEvaluacion }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-300">
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-[#194567] text-white">
          <tr>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Tipo</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Fecha</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Resultado</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Evaluador</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Observaciones</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {evaluaciones.length === 0 ? (
            <tr>
              <td colSpan={6} className="border border-slate-300 p-4 text-center text-gray-500">No hay evaluaciones registradas.</td>
            </tr>
          ) : evaluaciones.map((evaluacion) => (
            <tr key={evaluacion.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50">
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(evaluacion.tipo_evaluacion)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{fecha(evaluacion.fecha_evaluacion)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(evaluacion.resultado)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(evaluacion.evaluador)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(evaluacion.observaciones)}</td>
              <td className="whitespace-nowrap border border-slate-300 px-2 py-2 align-middle text-xs text-slate-700">
                <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => editarEvaluacion(evaluacion)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#194567] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#12344e]"
                  >
                    <i className="fas fa-pen" aria-hidden="true"></i> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarEvaluacion(evaluacion.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                  >
                    <i className="fas fa-trash-alt" aria-hidden="true"></i> Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


function Documentos({
  documentos,
  formDocumento,
  cambiarDocumento,
  guardarDocumento,
  guardandoDocumento,
  cargandoDocumentos,
  editarDocumento,
  eliminarDocumento,
  cancelarEdicionDocumento,
}) {
  const [modalAbierto, setModalAbierto] = useState(false)
  useEffect(() => {
    if (formDocumento.id) setModalAbierto(true)
  }, [formDocumento.id])
  const cerrarModal = () => {
    setModalAbierto(false)
    cancelarEdicionDocumento()
  }

  return (
    <div className="space-y-6">
      <ModalExpediente abierto={modalAbierto} titulo={formDocumento.id ? 'Editar registro' : 'Nuevo registro'} cerrar={cerrarModal}>
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white p-3 md:p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#194567]">
              {formDocumento.id ? 'Editar documento' : 'Agregar documento'}
            </h3>
            <p className="text-sm text-gray-500">
              Registra el control documental y pega el enlace donde el CEA almacena el soporte.
            </p>
          </div>
          {formDocumento.id && (
            <button
              type="button"
              onClick={cerrarModal}
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <form onSubmit={guardarDocumento} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoSelect label="Tipo documento *" name="tipo_documento" value={formDocumento.tipo_documento} onChange={cambiarDocumento} options={[
              ['', 'Seleccione'],
              ['CEDULA', 'Cédula'],
              ['LICENCIA_CONDUCCION', 'SoporteLicencia de conducción'],
              ['CERTIFICADO_INSTRUCTOR', 'Soporte Certificado de instructor'],
              ['RUT', 'RUT'],
              ['CONTRATO', 'Contrato'],
              ['HOJA_VIDA', 'Hoja de vida'],
              ['EVALUACION_COMPETENCIA', 'Evaluación de competencia'],
              ['EXAMEN_MEDICO', 'Examen médico'],
              ['CERTIFICADO_CAPACITACION', 'Certificado capacitación'],
              ['OTRO', 'Otro'],
            ]} />
            <CampoInput label="Nombre documento *" name="nombre_documento" value={formDocumento.nombre_documento} onChange={cambiarDocumento} wrapperClass="md:col-span-2" />
            <CampoSelect label="Estado *" name="estado" value={formDocumento.estado} onChange={cambiarDocumento} options={[
              ['vigente', 'Vigente'],
              ['vencido', 'Vencido'],
              ['pendiente', 'Pendiente'],
              ['no_aplica', 'No aplica'],
            ]} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoInput label="Enlace del documento" name="archivo_url" value={formDocumento.archivo_url} onChange={cambiarDocumento} placeholder="https://drive.google.com/..." wrapperClass="md:col-span-2" required={false} />
            <label className="mt-6 inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="vence" checked={formDocumento.vence} onChange={cambiarDocumento} className="h-4 w-4" />
              El documento vence
            </label>
            {formDocumento.vence && (
              <CampoInput label="Fecha vencimiento *" type="date" name="fecha_vencimiento" value={formDocumento.fecha_vencimiento} onChange={cambiarDocumento} />
            )}
          </div>

          <CampoTextarea label="Observaciones" name="observaciones" value={formDocumento.observaciones} onChange={cambiarDocumento} required={false} />

          <div className="flex justify-end gap-2">
            {formDocumento.id && (
              <button type="button" onClick={cerrarModal} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100">
                Cancelar
              </button>
            )}
            <button type="submit" disabled={guardandoDocumento} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-4 py-2 text-xs font-semibold text-white hover:bg-[#12344e] disabled:bg-gray-400">
              <i className="fas fa-save" aria-hidden="true"></i> {guardandoDocumento ? 'Guardando...' : formDocumento.id ? 'Actualizar documento' : 'Guardar documento'}
            </button>
          </div>
        </form>
      </div>

      </ModalExpediente>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#194567]"><i className="fas fa-list" aria-hidden="true"></i> Documentos registrados</h3>
          <button type="button" onClick={() => setModalAbierto(true)} className="inline-flex items-center gap-2 rounded-md bg-[#194567] px-3 py-2 text-xs font-semibold text-white hover:bg-[#12344e]"><i className="fas fa-plus" aria-hidden="true"></i> Agregar documento</button>
        </div>
        {cargandoDocumentos ? (
          <p className="rounded-lg border p-4 text-sm text-gray-500">Cargando documentos...</p>
        ) : (
          <TablaDocumentos
            documentos={documentos || []}
            editarDocumento={editarDocumento}
            eliminarDocumento={eliminarDocumento}
          />
        )}
      </div>
    </div>
  )
}

function TablaDocumentos({ documentos, editarDocumento, eliminarDocumento }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-300">
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-[#194567] text-white">
          <tr>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Tipo</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Nombre</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Enlace al soporte</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Vence</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Vencimiento</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Estado</th>
            <th className="whitespace-nowrap border border-[#44647c] px-3 py-2 text-left text-[11px] font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {documentos.length === 0 ? (
            <tr>
              <td colSpan={7} className="border border-slate-300 p-4 text-center text-gray-500">No hay documentos registrados.</td>
            </tr>
          ) : documentos.map((documento) => (
            <tr key={documento.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50">
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(documento.tipo_documento)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs font-semibold text-slate-800">{texto(documento.nombre_documento)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">
                {documento.archivo_url ? (
                  <a href={documento.archivo_url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                    Abrir enlace
                  </a>
                ) : '-'}
              </td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{documento.vence ? 'Sí' : 'No'}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{fecha(documento.fecha_vencimiento)}</td>
              <td className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{texto(documento.estado)}</td>
              <td className="whitespace-nowrap border border-slate-300 px-2 py-2 align-middle text-xs text-slate-700">
                <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => editarDocumento(documento)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#194567] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#12344e]"
                  >
                    <i className="fas fa-pen" aria-hidden="true"></i> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarDocumento(documento.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                  >
                    <i className="fas fa-trash-alt" aria-hidden="true"></i> Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TablaPendiente({ titulo, datos, columnas }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[#194567]">{titulo}</h3>
        <button type="button" className="rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]">
          Agregar próximamente
        </button>
      </div>
      <TablaBase
        datos={datos || []}
        vacio={`No hay registros en ${titulo.toLowerCase()}.`}
        columnas={columnas.map((col) => [col, col.replaceAll('_', ' ')])}
      />
    </div>
  )
}

function TablaBase({ datos, columnas, vacio }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-300">
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-[#194567] text-white">
          <tr>
            {columnas.map(([key, label]) => (
              <th key={key} className="text-left p-2 border capitalize">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} className="border border-slate-300 p-4 text-center text-gray-500">{vacio}</td>
            </tr>
          ) : datos.map((item) => (
            <tr key={item.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50">
              {columnas.map(([key]) => (
                <td key={key} className="border border-slate-300 px-3 py-2 align-top text-xs text-slate-700">{key.includes('fecha') || key === 'vigencia' ? fecha(item[key]) : typeof item[key] === 'boolean' ? (item[key] ? 'Sí' : 'No') : texto(item[key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CampoInput({ label, className = '', wrapperClass = '', ...props }) {
  return (
    <div className={wrapperClass}>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <input
        {...props}
        className={`w-full rounded-md border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${className}`}
      />
    </div>
  )
}

function CampoSelect({ label, options, ...props }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <select {...props} className="w-full rounded-md border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
        {options.map(([value, labelOption]) => (
          <option key={value} value={value}>{labelOption}</option>
        ))}
      </select>
    </div>
  )
}

function CampoTextarea({ label, ...props }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <textarea rows={4} {...props} className="w-full rounded-md border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-300">
      <h3 className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#194567]">{titulo}</h3>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 p-3 sm:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </section>
  )
}

function Dato({ label, value, ancho = '' }) {
  return (
    <div className={`min-w-0 border-b border-slate-200 px-1 py-2 ${ancho}`}>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-xs font-semibold leading-5 text-slate-800">{texto(value)}</p>
    </div>
  )
}
