// app/instructor/practica/mantenimientos/page.js

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, LoaderCircle, X } from 'lucide-react'
import { validarKilometraje } from '@/lib/servicios/validaciones'
import { cerrarSesion } from '@/lib/auth/logout'
import { EncabezadoPractica, TarjetaSeccionMantenimiento, ModalSeccionMantenimiento, AccionesModuloPractica } from '@/components/instructor/practica/EstilosModuloPractica'

// ============================================================
// Helpers zona Bogotá
// ============================================================

const fmtBogota = (date, mode) => {
  const optFecha = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Bogota',
  }

  const optHora = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota',
  }

  return new Intl.DateTimeFormat(
    'en-CA',
    mode === 'fecha' ? optFecha : optHora
  ).format(date)
}

const ahoraBogota = () => {
  const now = new Date()

  const fecha = fmtBogota(now, 'fecha')
  const hora = fmtBogota(now, 'hora')
  const timestamp = `${fecha}T${hora}-05:00`

  return {
    fecha,
    hora,
    timestamp,
  }
}

// ============================================================
// Helpers dinero COP
// ============================================================

const onlyDigits = (valor) =>
  String(valor || '').replace(/\D+/g, '')

const toCOP = (valor) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor || 0))

const parseCOP = (valor) =>
  Number(onlyDigits(valor) || 0)

// ============================================================
// Opciones de tiempo de parada aproximado (horas)
// ============================================================

const OPCIONES_TIEMPO_PARADA = [
  0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 12, 24, 48, 72,
]

// ============================================================
// Página
// ============================================================

export default function MantenimientosPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [nitActual, setNitActual] = useState('')

  // Vehículos
  const [vehiculos, setVehiculos] = useState([])
  const [placa, setPlaca] = useState('')
  const [vehiculoInfo, setVehiculoInfo] = useState({
    tipo: '-',
    marca: '-',
  })

  // Kilometraje
  const [kilometraje, setKilometraje] = useState('')
  const [fechaEjecucion, setFechaEjecucion] = useState(() => ahoraBogota().fecha)
  const [fechaRegistroVisible, setFechaRegistroVisible] = useState(() => ahoraBogota().timestamp)

  useEffect(() => {
    const actualizar = () => setFechaRegistroVisible(ahoraBogota().timestamp)
    actualizar()
    const intervalo = setInterval(actualizar, 60000)
    return () => clearInterval(intervalo)
  }, [])
  const [msgKm, setMsgKm] = useState('')
  const [forzarKm, setForzarKm] = useState(false)
  const [advertenciaKmPendiente, setAdvertenciaKmPendiente] = useState(false)
  const [modalKm, setModalKm] = useState(null)
  const [kmValidado, setKmValidado] = useState(false)
  const [validandoKm, setValidandoKm] = useState(false)
  const [estadoKm, setEstadoKm] = useState('')
  const peticionKmRef = useRef(0)
  const temporizadorKmRef = useRef(null)
  const clavePeticionKmRef = useRef('')
  const focoKmRef = useRef(false)
  const envioMantenimientoRef = useRef(false)

  // Tipo mantenimiento
  const [tipoMant, setTipoMant] = useState('')
  const [actividad, setActividad] = useState('')
  const [actividadesPlan, setActividadesPlan] = useState([])
  const [nivelSeleccionadoId, setNivelSeleccionadoId] = useState('')
  const [programacionPreventiva, setProgramacionPreventiva] = useState(null)
  const [ultimoPuntoEjecutado, setUltimoPuntoEjecutado] = useState(null)
  const [usarUltimoPunto, setUsarUltimoPunto] = useState(false)
  const [cargandoProgramacion, setCargandoProgramacion] = useState(false)
  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState([])
  const [actividadesAdicionales, setActividadesAdicionales] = useState([])
  const [actividadesConfiguradas, setActividadesConfiguradas] = useState([])
  const [actividadesPendientes, setActividadesPendientes] = useState({})
  const [nuevaActividadAdicional, setNuevaActividadAdicional] = useState('')
  const [mostrarOtrasFrecuencias, setMostrarOtrasFrecuencias] = useState(false)
  const [mostrarActividadLibre, setMostrarActividadLibre] = useState(false)
  const [alertaFormulario, setAlertaFormulario] = useState(null)
  const avisar = (mensaje, tipo = 'error') => setAlertaFormulario({ mensaje, tipo })

  // Repuestos
  const [repuestos, setRepuestos] = useState('')

  // Proveedores y técnicos configurados por Administración
  const [proveedores, setProveedores] = useState([])
  const [proveedorId, setProveedorId] = useState('')
  const [proveedorInfo, setProveedorInfo] = useState(null)
  const [actividadesProveedor, setActividadesProveedor] = useState([])
  const [cargandoActividadesProveedor, setCargandoActividadesProveedor] = useState(false)
  const [modalProveedor, setModalProveedor] = useState(false)
  const [guardandoProveedor, setGuardandoProveedor] = useState(false)
  const [nuevoProveedor, setNuevoProveedor] = useState({
    tipo_persona: 'JURIDICA',
    razon_social: '',
    nombre_comercial: '',
    nit_proveedor: '',
    digito_verificacion: '',
    direccion: '',
    telefono: '',
    email: '',
  })

  const [tecnicos, setTecnicos] = useState([])
  const [tecnicoId, setTecnicoId] = useState('')
  const [tecnicoInfo, setTecnicoInfo] = useState(null)
  const [actividadCatalogoId, setActividadCatalogoId] = useState('')
  const [modalTecnico, setModalTecnico] = useState(false)
  const [guardandoTecnico, setGuardandoTecnico] = useState(false)
  const [nuevoTecnico, setNuevoTecnico] = useState({
    nombres: '',
    documento: '',
    telefono: '',
    email: '',
    observaciones: '',
  })

  // Costos
  const [valorRepuestosStr, setValorRepuestosStr] = useState('')
  const [valorManoObraStr, setValorManoObraStr] = useState('')

  // Tiempo de parada aproximado, siempre expresado en horas
  const [tpValor, setTpValor] = useState('')

  // Otros
  const [factura, setFactura] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [validacionProveedor, setValidacionProveedor] = useState(false)
  const [seccionAbierta, setSeccionAbierta] = useState(null)

  // ============================================================
  // Sesión
  // ============================================================

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')

    if (!storedUser) {
      router.push('/login')
      return
    }

    try {
      const parsed = JSON.parse(storedUser)

      setUser(parsed)

      const nit =
        parsed?.nitEmpresa ||
        localStorage.getItem('currentEmpresaNit') ||
        ''

      if (!nit) {
        avisar(
          'No se encontró el CEA asociado a la sesión.'
        )
        return
      }

      setNitActual(String(nit).trim())
    } catch (error) {
      console.error('Error leyendo sesión:', error)

      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }, [router])

  // ============================================================
  // Carga inicial
  // ============================================================

  useEffect(() => {
    if (!nitActual) return

    const cargarInicial = async () => {
      try {
        const [resVehiculos, resProveedores] =
          await Promise.all([
            fetch(
              `/api/mantenimientos?nit=${encodeURIComponent(
                nitActual
              )}&recurso=vehiculos`,
              {
                cache: 'no-store',
              }
            ),

            fetch(
              `/api/mantenimientos?nit=${encodeURIComponent(
                nitActual
              )}&recurso=proveedores`,
              {
                cache: 'no-store',
              }
            ),
          ])

        const [jsonVehiculos, jsonProveedores] =
          await Promise.all([
            resVehiculos.json(),
            resProveedores.json(),
          ])

        if (
          resVehiculos.ok &&
          jsonVehiculos?.status === 'success'
        ) {
          setVehiculos(
            Array.isArray(jsonVehiculos.vehiculos)
              ? jsonVehiculos.vehiculos
              : []
          )
        } else {
          avisar(
            jsonVehiculos?.message ||
              'No se pudieron cargar los vehículos.'
          )
        }

        if (
          resProveedores.ok &&
          jsonProveedores?.status === 'success'
        ) {
          setProveedores(
            Array.isArray(jsonProveedores.proveedores)
              ? jsonProveedores.proveedores
              : []
          )
        } else {
          avisar(
            jsonProveedores?.message ||
              'No se pudieron cargar los proveedores.'
          )
        }
      } catch (error) {
        console.error(
          'Error cargando información de mantenimientos:',
          error
        )

        avisar(
          'No fue posible cargar la información del módulo.'
        )
      }
    }

    cargarInicial()
  }, [nitActual])

  // ============================================================
  // Cambio de placa / punto preventivo del nuevo plan
  // ============================================================

  useEffect(() => {
    const vehiculo = vehiculos.find((item) => item.placa === placa)

    setProgramacionPreventiva(null)
    setUltimoPuntoEjecutado(null)
    setUsarUltimoPunto(false)
    setActividadesPlan([])
    setActividadesSeleccionadas([])
    setActividadesAdicionales([])
    setNuevaActividadAdicional('')
    setMostrarOtrasFrecuencias(false)
    setMostrarActividadLibre(false)
    setActividadesPendientes({})
    setActividadesConfiguradas([])
    setNivelSeleccionadoId('')
    setActividad('')
    peticionKmRef.current += 1

    if (!vehiculo) {
      setVehiculoInfo({ tipo: '-', marca: '-' })
      setCargandoProgramacion(false)
      return
    }

    let cancelado = false
    setVehiculoInfo({
      tipo: vehiculo.tipo_vehiculo || '-',
      marca: vehiculo.marca || '-',
    })

    // Correctivo: no depende de la programación ni de que exista un plan
    // preventivo finalizado. Tampoco debe abrir alertas de ese plan.
    if (tipoMant === 'CORRECTIVO') {
      setCargandoProgramacion(false)
      return
    }

    const cargarProgramacion = async () => {
      if (!nitActual) return
      setCargandoProgramacion(true)

      try {
        const vigenciaActual = new Date().getFullYear()
        const vigenciasConsulta = [vigenciaActual, vigenciaActual + 1]

        const respuestas = await Promise.all(
          vigenciasConsulta.map(async (vigencia) => {
            const res = await fetch(
              `/api/admin/mantenimientos/plan-mantenimiento?nit=${encodeURIComponent(nitActual)}&vigencia=${vigencia}`,
              {
                cache: 'no-store',
                headers: { 'x-cea-nit': nitActual },
              }
            )

            const json = await res.json()

            return {
              vigencia,
              ok: res.ok && json?.status === 'success',
              json,
            }
          })
        )

        if (cancelado) return
        const validas = respuestas.filter((item) => item.ok)

        if (!validas.length) {
          setProgramacionPreventiva(null)
          avisar(
            respuestas.find((item) => item?.json?.message)?.json?.message ||
            'No fue posible consultar el Plan de Mantenimiento.'
          )
          return
        }

        const vistas = validas
          .map(({ vigencia, json }) => {
            const vista = (json.vehiculos || []).find(
              (item) =>
                String(item?.vehiculo?.placa || '').toUpperCase() ===
                String(placa).toUpperCase()
            )

            return vista ? { vigencia, vista } : null
          })
          .filter(Boolean)

        if (!vistas.length) {
          setProgramacionPreventiva(null)
          return
        }

        const puntosEjecutados = vistas.flatMap(({ vista }) =>
          (vista.hechos || [])
            .filter(p => String(p?.estado || '').toUpperCase() === 'EJECUTADO' && p.mantenimiento_id && p.km_ejecucion != null)
            .map(p => ({ punto: p, vista }))
        ).sort((a, b) => Number(b.punto.ciclo || 0) - Number(a.punto.ciclo || 0))
        const ultimo = puntosEjecutados[0]
        setUltimoPuntoEjecutado(ultimo ? {
          ...ultimo.punto,
          vehiculo_id: Number(ultimo.vista.vehiculo?.id),
          frecuencia_base_km: Number(ultimo.vista.frecuencia_base_km),
          km_objetivo: Number(ultimo.punto.km_ejecucion),
          tolerancia_km: 500,
          km_minimo: Number(ultimo.punto.km_ejecucion) - 500,
          km_maximo: Number(ultimo.punto.km_ejecucion) + 500,
          dentro_tolerancia: true,
          actividades: ultimo.vista.actividades_configuradas || [],
          servicio_adicional_punto: true,
        } : null)
        setUsarUltimoPunto(false)

        const candidatos = vistas
          .flatMap(({ vigencia, vista }) => {
            const puntos = [
              ...(vista.hechos || []),
              ...(vista.proyecciones || []),
            ].filter(
              (p) =>
                String(p?.estado || '').toUpperCase() === 'PROGRAMADO'
            )

            return puntos.map((punto) => ({
              punto,
              vista,
              vigencia,
            }))
          })
          .sort((a, b) => {
            const fechaA = String(a.punto?.fecha_proyectada || '9999-12-31')
            const fechaB = String(b.punto?.fecha_proyectada || '9999-12-31')

            if (fechaA !== fechaB) {
              return fechaA.localeCompare(fechaB)
            }

            return (
              Number(a.punto?.punto || a.punto?.ciclo || 0) -
              Number(b.punto?.punto || b.punto?.ciclo || 0)
            )
          })

        const seleccionado = candidatos[0] || null
        const vistaDeVehiculo = seleccionado?.vista || ultimo?.vista || vistas[0]?.vista
        setActividadesConfiguradas(
          Array.isArray(vistaDeVehiculo?.actividades_configuradas)
            ? vistaDeVehiculo.actividades_configuradas
            : []
        )

        if (!seleccionado) {
          setProgramacionPreventiva(null)
          return
        }

        const { punto, vista } = seleccionado
        const actividadesPunto = Array.isArray(punto.actividades)
          ? punto.actividades
          : []

        // La tolerancia de la base depende del cambio de aceite,
        // no de otras actividades con frecuencias diferentes.
        const toleranciaKm = Number(punto?.tolerancia_km ?? 500)

        const kmObjetivo = Number(punto?.km_objetivo)
        const kmActual = Number(vista?.kilometraje?.ultimo_km)

        const kmMinimo =
          Number.isFinite(kmObjetivo)
            ? kmObjetivo - toleranciaKm
            : null

        const kmMaximo =
          Number.isFinite(kmObjetivo)
            ? kmObjetivo + toleranciaKm
            : null

        const dentroTolerancia =
          (punto?.normalizacion_inicial === true && Number.isFinite(kmActual)) ||
          (Number.isFinite(kmActual) &&
          Number.isFinite(kmMinimo) &&
          Number.isFinite(kmMaximo) &&
          kmActual >= kmMinimo &&
          kmActual <= kmMaximo)

        const normalizado = {
          ...punto,
          vehiculo_id: Number(vista.vehiculo?.id || punto.vehiculo_id),
          punto: Number(punto.punto || punto.ciclo),
          ciclo: Number(punto.ciclo || punto.punto),
          frecuencia_base_km: Number(
            vista.frecuencia_base_km ||
            vista.ciclo?.frecuencia_base_km ||
            0
          ),
          ultimo_km_preoperacional: vista.kilometraje?.ultimo_km ?? null,
          ultimo_mantenimiento: vista.ultimo_mantenimiento || null,
          actividades: actividadesPunto,
          tolerancia_km: toleranciaKm,
          km_minimo: kmMinimo,
          km_maximo: kmMaximo,
          dentro_tolerancia: dentroTolerancia,
        }

        setProgramacionPreventiva(normalizado)
        setActividadesConfiguradas(Array.isArray(vista.actividades_configuradas) ? vista.actividades_configuradas : [])
        setActividadesPlan(normalizado.actividades)
        setNivelSeleccionadoId(String(normalizado.ciclo))
      } catch (error) {
        if (cancelado) return
        console.error('Error consultando el Plan de Mantenimiento:', error)
        setProgramacionPreventiva(null)
        avisar('No fue posible consultar la programación del vehículo. Intente nuevamente.')
      } finally {
        if (!cancelado) setCargandoProgramacion(false)
      }
    }

    cargarProgramacion()
    return () => { cancelado = true }
  }, [placa, vehiculos, nitActual, tipoMant])

  // ============================================================
  // Cambio de proveedor: técnicos + actividades habilitadas
  // ============================================================

  useEffect(() => {
    // La selección de actividades no depende del proveedor.
    setActividadCatalogoId('')
    // Conservar la descripción del correctivo al seleccionar o registrar taller.
    // Solo el cambio explícito de tipo/vehículo limpia el servicio.
    
    if (!proveedorId) {
      setProveedorInfo(null)
      setTecnicos([])
      setTecnicoId('')
      setTecnicoInfo(null)
      setActividadesProveedor([])
      return
    }

    const proveedor = proveedores.find(
      (item) => String(item.id) === String(proveedorId)
    )

    setProveedorInfo(proveedor || null)

    let cancelado = false
    const cargarDatosProveedor = async () => {
      if (!nitActual) return

      setCargandoActividadesProveedor(true)

      try {
        const resTecnicos = await fetch(
          `/api/mantenimientos?nit=${encodeURIComponent(nitActual)}&recurso=tecnicos&proveedor_id=${encodeURIComponent(proveedorId)}`,
          { cache: 'no-store' }
        )
        const jsonTecnicos = await resTecnicos.json()
        if (cancelado) return
        if (!resTecnicos.ok || jsonTecnicos?.status !== 'success' || !Array.isArray(jsonTecnicos.tecnicos)) {
          setTecnicos([])
          avisar(jsonTecnicos?.message || 'No se pudieron consultar los técnicos de este proveedor. Intente nuevamente.')
        } else {
          setTecnicos(jsonTecnicos.tecnicos)
        }

        // La selección de actividades depende del vehículo y del servicio,
        // nunca de las relaciones de catálogo del taller.
        setActividadesProveedor([])
      } catch (error) {
        if (cancelado) return
        console.error('Error cargando información del proveedor:', error)
        setTecnicos([])
        setActividadesProveedor([])
        avisar('No fue posible consultar los técnicos del proveedor. Verifique la conexión e intente nuevamente.')
      } finally {
        if (!cancelado) setCargandoActividadesProveedor(false)
      }
    }

    setTecnicoId('')
    setTecnicoInfo(null)
    cargarDatosProveedor()
    return () => { cancelado = true }
  }, [proveedorId, nitActual])

  const actividadesProveedorIds = useMemo(
    () => new Set(actividadesProveedor.map((item) => Number(item.id))),
    [actividadesProveedor]
  )

  // Las actividades del punto son independientes del taller seleccionado.
  // Un mismo punto puede recibir intervenciones de distintos proveedores.
  const kilometrajeServicio = kilometraje === '' ? null : Number(kilometraje)
  const puedeAsociarUltimo = ultimoPuntoEjecutado &&
    kilometrajeServicio !== null && Number.isFinite(kilometrajeServicio) &&
    Math.abs(kilometrajeServicio - Number(ultimoPuntoEjecutado.km_ejecucion)) <= 500
  const puntoSeleccionado = tipoMant === 'PREVENTIVO' && usarUltimoPunto
    ? ultimoPuntoEjecutado
    : programacionPreventiva
  // Comprobar el odómetro EFECTIVO de esta intervención. El preoperacional
  // más reciente únicamente sirve para proyectar, no para bloquear una
  // intervención retrospectiva válida dentro del rango del punto.
  const dentroToleranciaRegistro = Boolean(
    puntoSeleccionado &&
    kilometrajeServicio !== null && Number.isFinite(kilometrajeServicio) &&
    (puntoSeleccionado.servicio_adicional_punto
      ? Math.abs(kilometrajeServicio - Number(puntoSeleccionado.km_ejecucion)) <= 500
      : puntoSeleccionado.normalizacion_inicial === true &&
        !puntoSeleccionado.referencia_historica_aceite
        ? kilometrajeServicio >= 0
        : puntoSeleccionado.km_objetivo != null &&
          Number.isFinite(Number(puntoSeleccionado.km_objetivo)) &&
          Math.abs(kilometrajeServicio - Number(puntoSeleccionado.km_objetivo)) <=
            Number(puntoSeleccionado.tolerancia_km ?? 500))
  )
  const programacionParaRegistro = puntoSeleccionado
    ? { ...puntoSeleccionado, dentro_tolerancia: dentroToleranciaRegistro }
    : null

  const actividadesPreventivasDisponibles = useMemo(() => {
    const sugeridas = programacionParaRegistro?.actividades || []
    const idsSugeridas = new Set(sugeridas.map(x => Number(x.configuracion_id)))
    return [
      ...sugeridas.map(x => ({ ...x, sugerida: true })),
      ...actividadesConfiguradas
        .filter(x => !idsSugeridas.has(Number(x.configuracion_id)))
        .map(x => ({ ...x, sugerida: false })),
    ]
  }, [programacionParaRegistro, actividadesConfiguradas])

  const actividadesDelPunto = actividadesPreventivasDisponibles.filter((act) => act.sugerida)
  const actividadesOtrasFrecuencias = actividadesPreventivasDisponibles.filter((act) => !act.sugerida)
  const idsOtrasFrecuencias = new Set(actividadesOtrasFrecuencias.map((act) => Number(act.configuracion_id)))
  const otrasSeleccionadas = actividadesSeleccionadas.filter((id) => idsOtrasFrecuencias.has(Number(id))).length
  const aceiteConfiguracion = actividadesConfiguradas.find(a => /^(ACEITE DE MOTOR( Y FILTRO DE ACEITE)?|CAMBIO DE ACEITE)/i.test(
    String(a.actividad || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  ))
  const aceiteSeleccionado = aceiteConfiguracion &&
    actividadesSeleccionadas.includes(Number(aceiteConfiguracion.configuracion_id))

  // ============================================================
  // Cambio de técnico
  // ============================================================

  useEffect(() => {
    if (!tecnicoId) {
      setTecnicoInfo(null)
      return
    }

    const tecnico = tecnicos.find(
      (item) =>
        String(item.id) === String(tecnicoId)
    )

    setTecnicoInfo(tecnico || null)
  }, [tecnicoId, tecnicos])

  // ============================================================
  // Kilometraje
  // ============================================================

  const onKmChange = (e) => {
    // Cualquier cambio invalida inmediatamente las respuestas anteriores.
    peticionKmRef.current += 1
    clavePeticionKmRef.current = ''
    clearTimeout(temporizadorKmRef.current)
    setKilometraje(e.target.value)
    setMsgKm('')
    setEstadoKm('')
    setKmValidado(false)
    setValidandoKm(false)
    setForzarKm(false)
    setAdvertenciaKmPendiente(false)
    setModalKm(null)
  }

  const verificarKm = async ({ reintentar = false } = {}) => {
    const actual = kilometraje
    if (!placa || !nitActual || actual === '' ||
        !Number.isFinite(Number(actual)) || Number(actual) < 0) return

    const clave = `${nitActual}|${placa}|${fechaEjecucion}|${actual}`
    // onBlur y el temporizador pueden coincidir: una sola petición por valor.
    if (!reintentar && clavePeticionKmRef.current === clave) return
    clavePeticionKmRef.current = clave
    const solicitud = ++peticionKmRef.current
    setKmValidado(false)
    setForzarKm(false)
    setAdvertenciaKmPendiente(false)
    setEstadoKm('')
    setValidandoKm(true)
    setModalKm(null)
    setMsgKm('Verificando kilometraje…')
    try {
      const resultado = await validarKilometraje(nitActual, placa, Number(actual), { fechaEjecucion })
      if (solicitud !== peticionKmRef.current) return
      if (!resultado || !['ok', 'advertencia', 'error'].includes(resultado.estado)) {
        setEstadoKm('error')
        setMsgKm('No se pudo verificar el kilometraje.')
        return
      }
      const mensaje = resultado.mensaje || 'Verificación completada.'
      setEstadoKm(resultado.estado)
      setMsgKm(mensaje)
      if (resultado.estado === 'ok') {
        setKmValidado(true)
      } else if (resultado.estado === 'advertencia') {
        setAdvertenciaKmPendiente(true)
        // No interrumpir al instructor mientras escribe en el celular.
        if (!focoKmRef.current) setModalKm({ estado: 'advertencia', mensaje })
      }
      // Errores de validación visibles bajo el campo, no en una ventana modal.
    } catch (error) {
      if (solicitud !== peticionKmRef.current) return
      console.error('Error validando kilometraje:', error)
      setEstadoKm('error')
      setMsgKm('No se pudo verificar. Revise la conexión.')
    } finally {
      if (solicitud === peticionKmRef.current) setValidandoKm(false)
    }
  }

  // Validación automática después de una pausa. No depende de un botón,
  // del teclado del celular ni de que el navegador pierda el foco.
  useEffect(() => {
    clearTimeout(temporizadorKmRef.current)
    if (placa && nitActual && fechaEjecucion && kilometraje !== '' &&
        Number.isFinite(Number(kilometraje)) && Number(kilometraje) >= 0) {
      temporizadorKmRef.current = setTimeout(() => { verificarKm() }, 600)
    }
    return () => clearTimeout(temporizadorKmRef.current)
    // Los valores de entrada invalidan la consulta, no los cambios de UI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kilometraje, placa, nitActual, fechaEjecucion])

  const alSalirDeKilometraje = () => {
    focoKmRef.current = false
    clearTimeout(temporizadorKmRef.current)
    verificarKm()
    if (estadoKm === 'advertencia' && advertenciaKmPendiente && !forzarKm) {
      setModalKm({ estado: 'advertencia', mensaje: msgKm })
    }
  }

  // ============================================================
  // Tipo mantenimiento
  // ============================================================

  const onTipoMantChange = (e) => {
    const valor = String(
      e.target.value || ''
    ).toUpperCase()

    setTipoMant(valor)
    setUsarUltimoPunto(false)
    setActividadesPendientes({})
    setNivelSeleccionadoId('')
    setActividad('')
    setActividadCatalogoId('')
    setActividadesSeleccionadas([])
    setActividadesAdicionales([])
    setNuevaActividadAdicional('')
    setMostrarOtrasFrecuencias(false)
    setMostrarActividadLibre(false)
  }

  // ============================================================
  // Costos
  // ============================================================

  const onValorRepuestosChange = (e) => {
    const num = parseCOP(e.target.value)

    setValorRepuestosStr(
      e.target.value.trim() === '' ? '' : toCOP(num)
    )
  }

  const onValorManoObraChange = (e) => {
    const num = parseCOP(e.target.value)

    setValorManoObraStr(
      e.target.value.trim() === '' ? '' : toCOP(num)
    )
  }

  const costoTotal = useMemo(() => {
    return (
      parseCOP(valorRepuestosStr) +
      parseCOP(valorManoObraStr)
    )
  }, [
    valorRepuestosStr,
    valorManoObraStr,
  ])

  // ============================================================
  // Validación del formulario
  // ============================================================

  const fechaEjecucionValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaEjecucion) && fechaEjecucion <= ahoraBogota().fecha
  const planPreventivoDisponible = Boolean(
    !cargandoProgramacion &&
    programacionParaRegistro &&
    programacionParaRegistro.vehiculo_id === Number(vehiculos.find(v => v.placa === placa)?.id)
  )
  // Correctivos no requieren configuración de plan. Para preventivos no
  // habilitar secciones hasta conocer el punto real del vehículo.
  const tarjetasHabilitadas = Boolean(
    fechaEjecucionValida && nitActual && placa && tipoMant &&
    kilometraje !== '' && Number.isFinite(Number(kilometraje)) &&
    Number(kilometraje) >= 0 && (kmValidado || forzarKm) &&
    (tipoMant !== 'PREVENTIVO' || planPreventivoDisponible)
  )

  const puedeGuardar = useMemo(() => {
    if (!nitActual || !placa || !fechaEjecucionValida) return false

    if (!kmValidado && !forzarKm) return false
    if (validandoKm || advertenciaKmPendiente) return false
    if (kilometraje === '' || !Number.isFinite(Number(kilometraje)) || Number(kilometraje) < 0) return false

    if (
      tipoMant !== 'PREVENTIVO' &&
      tipoMant !== 'CORRECTIVO'
    ) {
      return false
    }

    if (!proveedorId || !tecnicoId) return false
    if (!repuestos.trim()) return false
    if (!tpValor || !OPCIONES_TIEMPO_PARADA.includes(Number(tpValor))) return false
    if (!factura.trim() || !observaciones.trim()) return false
    if (valorRepuestosStr === '' || valorManoObraStr === '') return false
    if (tipoMant === 'PREVENTIVO' && Object.values(actividadesPendientes).some(m => !m.trim())) return false

    if (
      tipoMant === 'PREVENTIVO' &&
      (
        !planPreventivoDisponible ||
        !programacionParaRegistro ||
        !programacionParaRegistro?.dentro_tolerancia ||
        (actividadesSeleccionadas.length === 0 && actividadesAdicionales.length === 0) ||
        (!programacionParaRegistro?.servicio_adicional_punto && !aceiteSeleccionado)
      )
    ) {
      return false
    }

    if (
      tipoMant === 'CORRECTIVO' &&
      !actividad.trim()
    ) {
      return false
    }

    return true
  }, [
    nitActual,
    placa,
    fechaEjecucionValida,
    msgKm,
    kmValidado,
    validandoKm,
    forzarKm,
    advertenciaKmPendiente,
    kilometraje,
    tipoMant,
    actividad,
    nivelSeleccionadoId,
    programacionParaRegistro,
    actividadesSeleccionadas,
    actividadesAdicionales,
    proveedorId,
    tecnicoId,
    actividadCatalogoId,
    repuestos,
    tpValor,
    factura,
    observaciones,
    valorRepuestosStr,
    valorManoObraStr,
    actividadesPendientes,
    aceiteSeleccionado,
    planPreventivoDisponible,
  ])

  // ============================================================
  // Registrar mantenimiento
  // ============================================================

  const registrar = async () => {
    // Bloqueo inmediato contra dos pulsaciones en el mismo render.
    if (guardando || envioMantenimientoRef.current) return
    setAlertaFormulario(null)
    const faltantes = []
    let seccion = null
    if (!user || !nitActual) faltantes.push('Sesión de instructor o empresa no disponible.')
    if (!placa) faltantes.push('Seleccione la placa del vehículo.')
    if (!fechaEjecucionValida) faltantes.push('Seleccione una fecha de ejecución válida, no posterior a hoy.')
    if (!['PREVENTIVO', 'CORRECTIVO'].includes(tipoMant)) faltantes.push('Seleccione el tipo de mantenimiento.')
    if (kilometraje === '' || !Number.isFinite(Number(kilometraje)) || Number(kilometraje) < 0) faltantes.push('Ingrese un kilometraje válido.')
    if (advertenciaKmPendiente) faltantes.push('Confirme o corrija la advertencia de kilometraje antes de continuar.')
    if (!kmValidado && !forzarKm) faltantes.push('El kilometraje debe verificarse automáticamente antes de continuar.')
    if (!proveedorId || !tecnicoId) {
      faltantes.push('Seleccione proveedor y técnico.')
      seccion = 1
    }
    if (tipoMant === 'PREVENTIVO') {
      if (!planPreventivoDisponible) faltantes.push('El vehículo requiere un plan de mantenimiento FINALIZADO y un punto preventivo disponible antes de registrar servicios preventivos.')
      else if (!programacionParaRegistro.dentro_tolerancia) faltantes.push('El punto preventivo aún no está habilitado por kilometraje.')
      if (actividadesSeleccionadas.length === 0 && actividadesAdicionales.length === 0) {
        faltantes.push('Seleccione una actividad del plan o agregue al menos una actividad realmente realizada.')
        if (!seccion) seccion = 2
      }
      if (programacionParaRegistro && !programacionParaRegistro.servicio_adicional_punto && !aceiteSeleccionado) {
        faltantes.push('Para acreditar un nuevo punto P debe marcar el cambio de aceite. Otras intervenciones se asocian al punto de aceite ya ejecutado.')
        if (!seccion) seccion = 2
      }
    }
    if (tipoMant === 'CORRECTIVO' && !actividad.trim()) {
      faltantes.push('Describa la actividad correctiva realizada.')
      if (!seccion) seccion = 2
    }
    if (!repuestos.trim()) {
      faltantes.push('Indique los repuestos utilizados o escriba NO APLICA.')
      if (!seccion) seccion = 2
    }
    if (tipoMant === 'PREVENTIVO' && Object.values(actividadesPendientes).some(x => !x.trim())) {
      faltantes.push('Explique el motivo de cada actividad marcada como pendiente.')
      if (!seccion) seccion = 2
    }
    if (!tpValor) { faltantes.push('Seleccione el tiempo de parada en horas.'); if (!seccion) seccion = 4 }
    if (!observaciones.trim()) { faltantes.push('Registre las observaciones o escriba NINGUNA.'); if (!seccion) seccion = 4 }
    if (!factura.trim()) { faltantes.push('Indique la factura o escriba NO APLICA.'); if (!seccion) seccion = 3 }
    if (valorRepuestosStr === '' || valorManoObraStr === '') { faltantes.push('Complete los valores de repuestos y mano de obra (escriba 0 si no aplica).'); if (!seccion) seccion = 3 }
    if (faltantes.length || !puedeGuardar) {
      avisar(faltantes.length ? faltantes.join(' • ') : 'Revise los datos obligatorios del formulario.')
      if (seccion) setSeccionAbierta(seccion)
      return
    }
    envioMantenimientoRef.current = true
    setGuardando(true)

    try {
      const payload = {
        nit: nitActual,
        accion: 'registrar',

        // timestamp_registro se genera en la API al guardar.
        fecha_registro:
          fechaEjecucion,

        placa,

        kilometraje:
          Number(kilometraje),

        tipo_mantenimiento:
          tipoMant,

        actividad_realizada:
          tipoMant === 'PREVENTIVO'
            ? `MANTENIMIENTO PREVENTIVO P${programacionParaRegistro?.ciclo || 1}`
            : actividad.trim(),

        actividad_catalogo_id:
          tipoMant === 'CORRECTIVO' && actividadCatalogoId
            ? Number(actividadCatalogoId)
            : null,

        vehiculo_id:
          tipoMant === 'PREVENTIVO'
            ? Number(programacionParaRegistro?.vehiculo_id)
            : null,

        ciclo:
          tipoMant === 'PREVENTIVO'
            ? Number(programacionParaRegistro?.ciclo)
            : null,

        km_objetivo:
          tipoMant === 'PREVENTIVO'
            ? Number(programacionParaRegistro?.km_objetivo)
            : null,

        actividades_config_ids:
          tipoMant === 'PREVENTIVO'
            ? actividadesSeleccionadas.map(Number)
            : [],
        servicio_adicional_punto:
          tipoMant === 'PREVENTIVO' && Boolean(programacionParaRegistro?.servicio_adicional_punto),
        actividades_adicionales:
          tipoMant === 'PREVENTIVO' ? actividadesAdicionales : [],
        actividades_pendientes:
          tipoMant === 'PREVENTIVO'
            ? Object.entries(actividadesPendientes).map(([configuracion_id, motivo]) => ({ configuracion_id: Number(configuracion_id), motivo: motivo.trim() }))
            : [],

        repuestos_utilizados:
          repuestos.trim() ||
          null,

        proveedor_id:
          proveedorId
            ? Number(proveedorId)
            : null,

        tecnico_id:
          tecnicoId
            ? Number(tecnicoId)
            : null,

        // Desde esta versión tiempoparada se registra directamente en horas.
        tiempoparada:
          tpValor !== ''
            ? String(tpValor)
            : null,

        factura:
          factura.trim() ||
          null,

        valor_repuestos:
          valorRepuestosStr !== '' ? parseCOP(valorRepuestosStr) : null,

        valor_mano_obra:
          valorManoObraStr !== '' ? parseCOP(valorManoObraStr) : null,

        costo_total:
          costoTotal,

        responsable:
          user?.nombreCompleto ||
          null,

        documento_responsable:
          user?.documento ||
          null,

        cargo:
          user?.rol ||
          null,

        observaciones:
          observaciones.trim() ||
          null,
      }

      const res = await fetch(
        '/api/mantenimientos',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(payload),
        }
      )

      const json =
        await res.json()

      if (
        !res.ok ||
        json?.status !== 'success'
      ) {
        avisar(
          json?.message ||
            'No se pudo registrar el mantenimiento.'
        )

        return
      }

      avisar('Mantenimiento registrado correctamente.', 'success')

      setPlaca('')

      setVehiculoInfo({
        tipo: '-',
        marca: '-',
      })

      setKilometraje('')
      setMsgKm('')
      setForzarKm(false)
      setModalKm(null)
      setFechaEjecucion(ahoraBogota().fecha)
      setFechaRegistroVisible(ahoraBogota().timestamp)

      setTipoMant('')
      setNivelSeleccionadoId('')
      setActividad('')
      setActividadCatalogoId('')
      setActividadesPlan([])
      setActividadesAdicionales([])
      setNuevaActividadAdicional('')
      setActividadesPendientes({})

      setRepuestos('')

      setProveedorId('')
      setProveedorInfo(null)

      setTecnicos([])
      setTecnicoId('')
      setTecnicoInfo(null)

      setValorRepuestosStr('')
      setValorManoObraStr('')

      setTpValor('')

      setFactura('')
      setObservaciones('')

      setTimeout(() => {
        router.push(
          '/instructor/practica'
        )
      }, 1200)
    } catch (error) {
      console.error(
        'Error registrando mantenimiento:',
        error
      )

      avisar(
        'Error inesperado al registrar el mantenimiento.'
      )
    } finally {
      envioMantenimientoRef.current = false
      setGuardando(false)
    }
  }

  // ============================================================
  // Registrar técnico dentro de un proveedor ya autorizado
  // ============================================================

  const guardarNuevoProveedor = async () => {
    if (tipoMant !== 'CORRECTIVO' || !nitActual || guardandoProveedor) return

    const razonSocial = nuevoProveedor.razon_social.trim()
    const nitProveedor = onlyDigits(nuevoProveedor.nit_proveedor)
    const telefono = onlyDigits(nuevoProveedor.telefono)
    const email = nuevoProveedor.email.trim()

    if (!razonSocial) return avisar('La razón social o nombre del proveedor es obligatoria.')
    if (!nitProveedor) return avisar('El NIT o documento es obligatorio.')
    if (nuevoProveedor.digito_verificacion && !/^\d$/.test(nuevoProveedor.digito_verificacion)) {
      return avisar('El DV (dígito de verificación) debe ser un solo número.')
    }
    if (!nuevoProveedor.direccion.trim()) return avisar('La dirección es obligatoria.')
    if (!/^\d{7,10}$/.test(telefono)) return avisar('El teléfono debe contener entre 7 y 10 números.')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return avisar('Ingrese un correo electrónico válido.')

    setGuardandoProveedor(true)
    try {
      const res = await fetch('/api/mantenimientos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cea-nit': nitActual,
        },
        body: JSON.stringify({
          nit: nitActual,
          accion: 'crear_proveedor_correctivo',
          ...nuevoProveedor,
          nit_proveedor: nitProveedor,
          telefono,
        }),
      })
      const json = await res.json()
      if (!res.ok || json?.status !== 'success') {
        avisar(json?.message || 'No se pudo registrar el proveedor.')
        return
      }

      const proveedor = json.proveedor
      setProveedores((actual) =>
        [...actual.filter((p) => String(p.id) !== String(proveedor.id)), proveedor]
          .sort((a, b) => String(a.razon_social || '').localeCompare(String(b.razon_social || ''), 'es'))
      )
      setProveedorId(String(proveedor.id))
      setModalProveedor(false)
      setNuevoProveedor({
        tipo_persona: 'JURIDICA',
        razon_social: '',
        nombre_comercial: '',
        nit_proveedor: '',
        digito_verificacion: '',
        direccion: '',
        telefono: '',
        email: '',
      })
      avisar('Proveedor registrado. Quedó disponible para este mantenimiento correctivo.', 'success')
    } catch (error) {
      console.error('Error registrando proveedor:', error)
      avisar('Error inesperado al registrar el proveedor.')
    } finally {
      setGuardandoProveedor(false)
    }
  }

  const guardarNuevoTecnico = async () => {
    if (!proveedorId || guardandoTecnico) return

    const nombres = nuevoTecnico.nombres.trim().toUpperCase()
    const documento = onlyDigits(nuevoTecnico.documento)
    const telefono = onlyDigits(nuevoTecnico.telefono)
    const email = nuevoTecnico.email.trim().toLowerCase()

    if (!nombres) {
      avisar('Los nombres del técnico son obligatorios.')
      return
    }

    if (!/^\d{5,12}$/.test(documento)) {
      avisar('El documento debe contener entre 5 y 12 números.')
      return
    }

    if (/^3\d{9}$/.test(documento)) {
      avisar('El documento ingresado tiene estructura de número celular. Verifique que no haya intercambiado el documento y el celular.')
      return
    }

    if (!/^3\d{9}$/.test(telefono)) {
      avisar('El celular debe contener exactamente 10 dígitos y comenzar por 3.')
      return
    }

    if (documento === telefono) {
      avisar('El documento y el celular no pueden ser iguales. Verifique que no haya intercambiado los datos.')
      return
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      avisar('Ingrese un correo electrónico válido.')
      return
    }

    setGuardandoTecnico(true)

    try {
      const res = await fetch('/api/mantenimientos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cea-nit': nitActual,
        },
        body: JSON.stringify({
          nit: nitActual,
          accion: 'crear_tecnico',
          proveedor_id: Number(proveedorId),
          nombres,
          documento,
          telefono,
          email: email || null,
          observaciones: nuevoTecnico.observaciones.trim().toUpperCase() || null,
        }),
      })

      const json = await res.json()

      if (!res.ok || json?.status !== 'success') {
        avisar(json?.message || 'No fue posible registrar el técnico.')
        return
      }

      const tecnicoCreado = json.tecnico
      setTecnicos((actual) => [...actual.filter((x) => Number(x.id) !== Number(tecnicoCreado.id)), tecnicoCreado].sort((a, b) => String(a.nombres || '').localeCompare(String(b.nombres || ''))))
      setTecnicoId(String(tecnicoCreado.id))
      setTecnicoInfo(tecnicoCreado)
      setModalTecnico(false)
      avisar('Técnico registrado correctamente.', 'success')
    } catch (error) {
      console.error('Error registrando técnico:', error)
      avisar('No fue posible registrar el técnico.')
    } finally {
      setGuardandoTecnico(false)
    }
  }

  const cancelarSeccionProveedor = () => {
    setProveedorId('')
    setProveedorInfo(null)
    setTecnicoId('')
    setTecnicoInfo(null)
    setTecnicos([])
    setActividadesSeleccionadas([])
    setActividadesProveedor([])
    setActividadCatalogoId('')
    setValidacionProveedor(false)
    setSeccionAbierta(null)
  }

  const continuarSeccionProveedor = () => {
    setValidacionProveedor(true)
    if (!proveedorId || !tecnicoId) {
      avisar('Seleccione el proveedor o taller y el técnico que realizó el mantenimiento.')
      return
    }
    setValidacionProveedor(false)
    setSeccionAbierta(null)
  }

  // ============================================================
  // Render
  // ============================================================

  if (!user) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  return (
    <div className="instructor-form-surface mantenimiento-movil min-h-screen bg-slate-100 px-2 py-3 text-slate-900 sm:px-4 sm:py-6" style={{ colorScheme: 'light' }}>
      <style jsx global>{`
        /* Aislar el formulario del modo oscuro del sistema operativo. */
        .mantenimiento-movil { color-scheme: light; }
        .mantenimiento-movil input:not([type="checkbox"]):not([type="radio"]),
        .mantenimiento-movil select,
        .mantenimiento-movil textarea {
          color-scheme: light !important;
          background-color: #ffffff !important;
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
          caret-color: #0f172a !important;
          border-color: #94a3b8;
          opacity: 1;
        }
        .mantenimiento-movil input::placeholder,
        .mantenimiento-movil textarea::placeholder {
          color: #64748b !important;
          -webkit-text-fill-color: #64748b !important;
          opacity: 1;
        }
        .mantenimiento-movil select option { color: #0f172a; background: white; }
        .mantenimiento-movil input:disabled,
        .mantenimiento-movil select:disabled,
        .mantenimiento-movil textarea:disabled {
          background: #e2e8f0 !important;
          color: #475569 !important;
          -webkit-text-fill-color: #475569 !important;
        }
        @media (max-width: 640px) {
          .mantenimiento-movil input:not([type="checkbox"]):not([type="radio"]),
          .mantenimiento-movil select,
          .mantenimiento-movil textarea { font-size: 16px !important; line-height: 1.5 !important; }
          .mantenimiento-movil label { font-size: 14px; }
        }
      `}</style>
      
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-lg">
        <EncabezadoPractica titulo="Registro de Mantenimiento" usuario={user.nombreCompleto || user.usuario} cea={user.nombreEmpresa} onRegresar={() => router.push('/instructor/practica')} onCerrarSesion={() => cerrarSesion(router)} />
        <main className="px-3 py-4 sm:px-6 sm:py-6">
          {alertaFormulario && (
            <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
              <div role="alertdialog" aria-modal="true" aria-labelledby="alerta-mantenimiento-titulo" aria-describedby="alerta-mantenimiento-texto" className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-5 shadow-2xl">
                <h3 id="alerta-mantenimiento-titulo" className={`text-base font-extrabold ${alertaFormulario.tipo === 'success' ? 'text-emerald-800' : alertaFormulario.tipo === 'info' ? 'text-blue-900' : 'text-amber-900'}`}>
                  {alertaFormulario.tipo === 'success' ? 'Registro exitoso' : alertaFormulario.tipo === 'info' ? 'Información importante' : 'Revise el formulario'}
                </h3>
                <p id="alerta-mantenimiento-texto" className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{alertaFormulario.mensaje}</p>
                <div className="mt-5 flex justify-end">
                  <button type="button" autoFocus onClick={() => setAlertaFormulario(null)} className="min-h-10 rounded-lg bg-[#194567] px-5 py-2 text-sm font-semibold text-white">Entendido</button>
                </div>
              </div>
            </div>
          )}
          {modalKm && (
            <div className="fixed inset-0 z-[225] flex items-center justify-center bg-slate-950/65 p-3 sm:p-4">
              <div role="alertdialog" aria-modal="true" aria-labelledby="validacion-km-titulo" aria-describedby="validacion-km-mensaje"
                className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {modalKm.estado === 'ok' ? <CheckCircle2 size={23} className="shrink-0 text-emerald-700" aria-hidden="true" />
                      : <AlertTriangle size={23} className={`shrink-0 ${modalKm.estado === 'advertencia' ? 'text-amber-700' : 'text-red-700'}`} aria-hidden="true" />}
                    <h3 id="validacion-km-titulo" className="text-base font-bold">
                      {modalKm.estado === 'ok' ? 'Kilometraje verificado' : modalKm.estado === 'advertencia' ? 'Confirme el kilometraje' : 'Revise el kilometraje'}
                    </h3>
                  </div>
                  <button type="button" aria-label="Cerrar verificación" onClick={() => setModalKm(null)}
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"><X size={19} aria-hidden="true" /></button>
                </div>
                <p id="validacion-km-mensaje" className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{modalKm.mensaje}</p>
                {modalKm.estado === 'advertencia' && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
                    Si el valor corresponde al comprobante del mantenimiento, puede confirmarlo. Esta confirmación no cambia los preoperacionales ni la programación.
                  </p>
                )}
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  {modalKm.estado === 'advertencia' && (
                    <button type="button" onClick={() => {
                      setForzarKm(true)
                      setAdvertenciaKmPendiente(false)
                      setModalKm(null)
                    }} className="min-h-11 rounded-lg bg-[#194567] px-4 py-2 text-sm font-semibold text-white">
                      Confirmar diferencia
                    </button>
                  )}
                  <button type="button" autoFocus onClick={() => setModalKm(null)}
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                    {modalKm.estado === 'advertencia' ? 'Corregir kilometraje' : 'Entendido'}
                  </button>
                </div>
              </div>
            </div>
          )}
          <p className="mb-4 text-xs text-slate-600">Los campos marcados con <b>*</b> son obligatorios.</p>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="fecha-ejecucion-mantenimiento" className="mb-1 block text-sm font-semibold">Fecha de ejecución *</label>
              <input id="fecha-ejecucion-mantenimiento" type="date" required max={ahoraBogota().fecha}
                value={fechaEjecucion} onChange={(e) => {
                  setFechaEjecucion(e.target.value)
                   peticionKmRef.current += 1
                   clavePeticionKmRef.current = ''
                   clearTimeout(temporizadorKmRef.current)
                   setKmValidado(false)
                   setEstadoKm('')
                   setAdvertenciaKmPendiente(false)
                   setValidandoKm(false)
                  setMsgKm('')
                  setForzarKm(false)
                  setModalKm(null)
                  if (kilometraje && placa) {
                    setKilometraje('')
                    avisar('Ingrese nuevamente el kilometraje para validarlo según la fecha de ejecución.', 'info')
                  }
                }}
                className="min-h-11 w-full rounded-lg border border-slate-300 p-2 text-sm" />
              <p className="mt-1 text-[11px] text-slate-600">Día en que realmente se realizó el servicio.</p>
            </div>
            <div className="min-w-0">
              <label htmlFor="fecha-registro-mantenimiento" className="mb-1 block text-sm font-semibold">Fecha de registro (automática)</label>
              <input id="fecha-registro-mantenimiento" type="text" readOnly disabled
                value={fechaRegistroVisible.replace('T', ' ').replace('-05:00', '') + ' (Bogotá)'}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-100 p-2 text-sm text-slate-600" />
              <p className="mt-1 text-[11px] text-slate-600">El sistema registra la fecha y hora exactas al guardar.</p>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-semibold">Placa *</label>
              <select className="min-h-11 w-full rounded-lg border border-slate-300 p-2 text-sm" value={placa} onChange={(e) => {
                setPlaca(e.target.value); peticionKmRef.current += 1; clavePeticionKmRef.current = ''; clearTimeout(temporizadorKmRef.current); setKilometraje(''); setKmValidado(false); setEstadoKm(''); setValidandoKm(false); setAdvertenciaKmPendiente(false); setMsgKm(''); setForzarKm(false); setModalKm(null)
              }}>
                <option value="">-- Seleccione una placa --</option>
                {vehiculos.map((vehiculo) => <option key={vehiculo.id || vehiculo.placa} value={vehiculo.placa}>{vehiculo.placa}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-slate-600">Tipo: {vehiculoInfo.tipo} · Marca: {vehiculoInfo.marca}</p>
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-semibold">Kilometraje *</label>
              <div>
                <input
                  id="kilometraje-servicio"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className={`min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base ${!placa ? 'cursor-not-allowed bg-gray-100' : ''}`}
                  value={kilometraje}
                  disabled={!placa}
                  onChange={onKmChange}
                  onFocus={() => { focoKmRef.current = true }}
                  onBlur={alSalirDeKilometraje}
                  placeholder="Kilometraje del servicio"
                  aria-describedby="estado-kilometraje-servicio"
                />

              </div>
              <div id="estado-kilometraje-servicio" role="status" aria-live="polite"
                className="mt-1 flex min-h-[22px] items-center gap-1.5 text-[11px] leading-4">
                {validandoKm ? (
                  <><LoaderCircle size={13} className="shrink-0 animate-spin text-blue-700" aria-hidden="true" /><span className="text-blue-800">Verificando kilometraje…</span></>
                ) : kmValidado ? (
                  <><CheckCircle2 size={13} className="shrink-0 text-emerald-700" aria-hidden="true" /><span className="text-emerald-800">Kilometraje verificado. Puede continuar.</span></>
                ) : forzarKm ? (
                  <><CheckCircle2 size={13} className="shrink-0 text-amber-700" aria-hidden="true" /><span className="text-amber-800">Diferencia confirmada. Puede continuar.</span></>
                ) : estadoKm === 'advertencia' ? (
                  <><AlertTriangle size={13} className="shrink-0 text-amber-700" aria-hidden="true" /><button type="button" className="text-left font-semibold text-amber-800 underline" onClick={() => setModalKm({ estado: 'advertencia', mensaje: msgKm })}>Kilometraje por confirmar. Ver detalle.</button></>
                ) : estadoKm === 'error' ? (
                  <><AlertTriangle size={13} className="shrink-0 text-red-700" aria-hidden="true" /><button type="button" className="text-left font-semibold text-red-800 underline" onClick={() => verificarKm({ reintentar: true })}>{msgKm || 'No fue posible verificar.'} Reintentar</button></>
                ) : (
                  <span className="text-slate-500">{kilometraje === '' ? 'Ingrese el kilometraje del servicio.' : 'Se verificará automáticamente.'}</span>
                )}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold">Tipo de mantenimiento *</label>
            <select className="min-h-11 w-full rounded-lg border border-slate-300 p-2 text-sm" value={tipoMant} onChange={onTipoMantChange}>
              <option value="">-- Seleccione --</option>
              <option value="PREVENTIVO">Preventivo</option>
              <option value="CORRECTIVO">Correctivo</option>
            </select>
          </div>
          {tipoMant === 'PREVENTIVO' && ultimoPuntoEjecutado && (
            <div className="mb-4 rounded-xl border border-blue-300 bg-blue-50 p-3">
              <label className="flex items-start gap-2 text-sm font-semibold text-blue-950">
                <input type="checkbox" className="mt-1 h-5 w-5" checked={usarUltimoPunto}
                  disabled={!puedeAsociarUltimo && !usarUltimoPunto}
                  onChange={(e) => {
                    setUsarUltimoPunto(e.target.checked)
                    setActividadesSeleccionadas([])
                    setActividadesPendientes({})
                  }} />
                Asociar este servicio al P{ultimoPuntoEjecutado.ciclo} ya ejecutado (otro proveedor o actividad)
              </label>
              <p className="mt-1 text-xs text-blue-900">
                Cambio de aceite: {Number(ultimoPuntoEjecutado.km_ejecucion).toLocaleString('es-CO')} km.
                Rango admitido: ±500 km. El aceite y la fecha base no se modificarán.
              </p>
              {!puedeAsociarUltimo && <p className="mt-1 text-xs text-amber-800">Ingrese un kilometraje dentro del rango para habilitar esta opción.</p>}
            </div>
          )}
          {tipoMant === 'PREVENTIVO' && (
            <div className="mb-4">
              <div className="space-y-3">
                {cargandoProgramacion ? (
                  <div className="border rounded-xl p-4 bg-slate-50 text-sm text-slate-600 text-center">
                    Consultando Plan de Mantenimiento...
                  </div>
                ) : !placa ? (
                  <div className="border rounded-xl p-4 bg-slate-50 text-sm text-slate-600">
                    Seleccione primero la placa del vehículo.
                  </div>
                ) : !programacionParaRegistro ? (
                  <div className="border border-orange-200 rounded-xl p-4 bg-orange-50">
                    <p className="text-sm font-bold text-orange-800">Mantenimiento preventivo bloqueado</p>
                    <p className="text-xs text-orange-700 mt-1">
                      Este vehículo necesita un plan de mantenimiento FINALIZADO y un punto disponible. Puede registrar mantenimientos correctivos sin configurar el plan.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <div className="bg-slate-800 text-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] text-slate-300">Punto preventivo</p>
                          <p className="text-xl font-bold">P{programacionParaRegistro.ciclo}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${String(programacionParaRegistro.estado).toUpperCase() === 'VENCIDO' ? 'bg-orange-200 text-orange-900' : 'bg-blue-200 text-blue-900'}`}>
                          {programacionParaRegistro.estado}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 text-xs">
                      <div className="bg-white border rounded-lg p-2">
                        <span className="text-slate-500">Km objetivo</span>
                        <p className="font-bold">{Number(programacionParaRegistro.km_objetivo || 0).toLocaleString('es-CO')} km</p>
                      </div>
                      <div className="bg-white border rounded-lg p-2">
                        <span className="text-slate-500">Frecuencia base</span>
                        <p className="font-bold">{Number(programacionParaRegistro.frecuencia_base_km || 0).toLocaleString('es-CO')} km</p>
                      </div>
                      <div className="bg-white border rounded-lg p-2">
                        <span className="text-slate-500">Tolerancia</span>
                        <p className="font-bold">± {Number(programacionParaRegistro.tolerancia_km || 500).toLocaleString('es-CO')} km</p>
                      </div>
                      <div className="bg-white border rounded-lg p-2">
                        <span className="text-slate-500">Rango habilitado</span>
                        <p className="font-bold">
                          {Number(programacionParaRegistro.km_minimo || 0).toLocaleString('es-CO')} - {Number(programacionParaRegistro.km_maximo || 0).toLocaleString('es-CO')} km
                        </p>
                      </div>
                    </div>

                    {!programacionParaRegistro.dentro_tolerancia && (
                      <div className="mx-3 mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                        <p className="text-xs font-bold text-blue-900">
                          Mantenimiento programado aún no habilitado
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-blue-800">
                          El punto P{programacionParaRegistro.ciclo} puede registrarse cuando el kilometraje del vehículo se encuentre entre{' '}
                          <b>{Number(programacionParaRegistro.km_minimo || 0).toLocaleString('es-CO')} km</b> y{' '}
                          <b>{Number(programacionParaRegistro.km_maximo || 0).toLocaleString('es-CO')} km</b>.
                          El kilometraje ingresado para este servicio es{' '}
                          <b>{kilometraje !== '' ? Number(kilometraje).toLocaleString('es-CO') : 'pendiente de ingresar'} km</b>.
                        </p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          )}
          <div className="mb-5 grid grid-cols-2 items-stretch gap-3">
            <TarjetaSeccionMantenimiento numero={1} disabled={!tarjetasHabilitadas} titulo="Proveedor y técnico" descripcion="Datos del taller, proveedor y técnico que realizó el servicio." completada={Boolean(proveedorId && tecnicoId)} onClick={() => { if (tarjetasHabilitadas) setSeccionAbierta(1) }} />
            <TarjetaSeccionMantenimiento numero={2} disabled={!tarjetasHabilitadas} titulo="Actividades y repuestos del servicio" descripcion="Actividades realizadas y repuestos utilizados (obligatorios)." completada={Boolean(repuestos.trim()) && (tipoMant === 'PREVENTIVO' ? actividadesSeleccionadas.length > 0 : Boolean(actividad.trim()))} onClick={() => { if (tarjetasHabilitadas) setSeccionAbierta(2) }} />
            <TarjetaSeccionMantenimiento numero={3} disabled={!tarjetasHabilitadas} titulo="Costos y datos complementarios" descripcion="Valor de repuestos, mano de obra, costo total y factura." completada={Boolean(valorRepuestosStr !== '' && valorManoObraStr !== '' && factura.trim())} onClick={() => { if (tarjetasHabilitadas) setSeccionAbierta(3) }} />
            <TarjetaSeccionMantenimiento numero={4} disabled={!tarjetasHabilitadas} titulo="Tiempo de parada y observaciones" descripcion="Duración aproximada de la parada y observaciones del servicio." completada={Boolean(tpValor && observaciones.trim())} onClick={() => { if (tarjetasHabilitadas) setSeccionAbierta(4) }} />
          </div>
          <AccionesModuloPractica onGuardar={registrar} puedeGuardar={puedeGuardar && !guardando} guardando={guardando} textoGuardar="Registrar Mantenimiento" />
          <p className="mt-2 text-center text-[11px] text-slate-600">El botón se habilitará cuando estén diligenciados y validados todos los campos obligatorios. Si no utiliza factura, escriba NO APLICA; para valores sin costo, escriba 0.</p>
        {seccionAbierta === 1 && (
          <ModalSeccionMantenimiento numero={1} titulo="Proveedor y técnico" onCerrar={continuarSeccionProveedor} onCancelar={cancelarSeccionProveedor} onContinuar={continuarSeccionProveedor}>
            <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-xs text-slate-700">
              Seleccione el proveedor o taller que realizó este servicio y su técnico. En correctivos puede registrar aquí un proveedor nuevo; no necesita asociarle actividades del plan de mantenimiento.
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Proveedor o taller *
              </label>

              <select
                className="w-full border p-2 min-h-11 rounded-lg text-sm"
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
              >
                <option value="">-- Seleccione proveedor --</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.razon_social || proveedor.empresa}
                    {proveedor.nombre_comercial ? ` / ${proveedor.nombre_comercial}` : ''}
                    {proveedor.nit ? ` - NIT ${proveedor.nit}` : ''}
                  </option>
                ))}
              </select>
              {validacionProveedor && !proveedorId && <p role="alert" className="mt-1 text-xs font-semibold text-red-600">Seleccione un proveedor o taller.</p>}
              {tipoMant === 'CORRECTIVO' && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => { setValidacionProveedor(false); setModalProveedor(true) }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    + Registrar proveedor que no aparece
                  </button>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Disponible solo para mantenimiento correctivo. El proveedor se crea sin actividades y Administración podrá revisar o completar sus datos después.
                  </p>
                </div>
              )}


              {proveedorInfo && (
                <div className="bg-gray-50 border rounded-lg p-3 mt-3 text-xs text-gray-700">
                  <p><b>Razón social:</b> {proveedorInfo.razon_social || proveedorInfo.empresa || '-'}</p>
                  {proveedorInfo.nombre_comercial && <p><b>Nombre comercial:</b> {proveedorInfo.nombre_comercial}</p>}
                  <p><b>NIT:</b> {proveedorInfo.nit || '-'}</p>
                  <p><b>Dirección:</b> {proveedorInfo.direccion || '-'}</p>
                  <p><b>Teléfono:</b> {proveedorInfo.telefono || '-'}</p>
                  <p><b>Email:</b> {proveedorInfo.email || '-'}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Técnico *
              </label>

              <select
                className={`w-full border p-2 min-h-11 rounded-lg text-sm ${!proveedorId ? 'bg-gray-100' : ''}`}
                value={tecnicoId}
                disabled={!proveedorId}
                onChange={(e) => setTecnicoId(e.target.value)}
              >
                <option value="">-- Seleccione técnico --</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nombres}{tecnico.documento ? ` - ${tecnico.documento}` : ''}
                  </option>
                ))}
              </select>

              {validacionProveedor && !tecnicoId && <p role="alert" className="mt-1 text-xs font-semibold text-red-600">Seleccione o registre el técnico que realizó el servicio.</p>}
              {proveedorId && tecnicos.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Este proveedor no tiene técnicos activos registrados. Puede registrar el técnico que atendió el servicio.
                </p>
              )}

              {proveedorId && (
                <button
                  type="button"
                  onClick={() => {
                    setNuevoTecnico({ nombres: '', documento: '', telefono: '', email: '', observaciones: '' })
                    setValidacionProveedor(false)
                    setModalTecnico(true)
                  }}
                  className="mt-3 min-h-10 rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Registrar técnico que no aparece en la lista
                </button>
              )}

              {tecnicoInfo && (
                <div className="bg-gray-50 border rounded-lg p-3 mt-3 text-xs text-gray-700">
                  <p><b>Técnico:</b> {tecnicoInfo.nombres || '-'}</p>
                  <p><b>Documento:</b> {tecnicoInfo.documento || '-'}</p>
                  <p><b>Teléfono:</b> {tecnicoInfo.telefono || '-'}</p>
                  <p><b>Email:</b> {tecnicoInfo.email || '-'}</p>
                </div>
              )}
            </div>
          </ModalSeccionMantenimiento>
        )}

        {seccionAbierta === 2 && (
          <ModalSeccionMantenimiento numero={2} titulo="Actividades y repuestos del servicio" onCerrar={() => setSeccionAbierta(null)}>
            {tipoMant === 'PREVENTIVO' && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="text-sm font-bold">Actividades ejecutadas · Guía del vehículo *</label>
                  <span className="text-xs font-semibold text-slate-600">{actividadesSeleccionadas.length} ejecutada(s)</span>
                </div>

                {actividadesPreventivasDisponibles.length === 0 ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                    Este punto no tiene actividades sugeridas en el plan. Puede añadir las que realmente se realizaron.
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-slate-500 mb-3">
                      El cambio de aceite inicia y acredita el punto base. Puede incluir actividades de otras frecuencias aunque no estén sugeridas para este punto. Cada servicio identifica a su propio proveedor.
                    </p>
                    <div className="space-y-2">
                      {actividadesPreventivasDisponibles.filter((act) => act.sugerida || mostrarOtrasFrecuencias).map((act, index) => {
                        const id = Number(act.configuracion_id)
                        const checked = actividadesSeleccionadas.includes(id)
                        return (
                          <div key={`${id}-${index}`} className={`flex items-start gap-3 border rounded-xl p-3 ${checked ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'}`}>
                            <input
                              type="checkbox"
                              aria-label={`Actividad ejecutada: ${act.actividad}`}
                              className="mt-1 h-5 w-5 shrink-0"
                              checked={checked}
                              disabled={!programacionParaRegistro?.dentro_tolerancia}
                              onChange={() => {
                                setActividadesSeleccionadas((actual) => checked ? actual.filter((x) => x !== id) : [...actual, id])
                                if (!checked) setActividadesPendientes(actual => {
                                  const siguiente = { ...actual }; delete siguiente[id]; return siguiente
                                })
                              }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{act.actividad} {!act.sugerida && <span className="ml-1 text-[10px] font-bold text-blue-800">(OTRA FRECUENCIA)</span>}</p>
                              {act.accion && <p className="text-[11px] text-slate-600 mt-1">{act.accion}</p>}
                              <p className="text-[11px] text-slate-500 mt-1">Cada {Number(act.frecuencia_km || 0).toLocaleString('es-CO')} km {act.siguiente_km ? `· Próximo objetivo individual: ${Number(act.siguiente_km).toLocaleString('es-CO')} km` : '· Frecuencia guía, sin ejecución inicial acreditada'}</p>
                              {act.pendiente_abierta && <p className="mt-1 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-950">Pendiente anterior: {act.pendiente_motivo || 'Requiere atención'}. Si la realiza ahora, márquela como ejecutada.</p>}
                              {!checked && (
                                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                    <input type="checkbox" checked={Object.prototype.hasOwnProperty.call(actividadesPendientes, id)}
                                      onChange={(e) => setActividadesPendientes(actual => {
                                        const proximo = { ...actual }
                                        if (e.target.checked) proximo[id] = ''
                                        else delete proximo[id]
                                        return proximo
                                      })} />
                                    Registrar como pendiente de este servicio
                                  </label>
                                  {Object.prototype.hasOwnProperty.call(actividadesPendientes, id) && (
                                    <textarea rows={2} maxLength={500} value={actividadesPendientes[id]}
                                      onChange={(e) => setActividadesPendientes(actual => ({ ...actual, [id]: e.target.value }))}
                                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 text-base text-slate-900"
                                      placeholder="Motivo de no ejecución (obligatorio)" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {actividadesOtrasFrecuencias.length > 0 && (
                      <button type="button"
                        aria-expanded={mostrarOtrasFrecuencias}
                        onClick={() => setMostrarOtrasFrecuencias(v => !v)}
                        className="mt-3 flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-left text-sm font-semibold text-blue-900">
                        <span>{mostrarOtrasFrecuencias ? 'Ocultar' : 'Ver'} otras actividades del vehículo ({actividadesOtrasFrecuencias.length}){otrasSeleccionadas > 0 ? ` · ${otrasSeleccionadas} seleccionada(s)` : ''}</span>
                        <span aria-hidden="true">{mostrarOtrasFrecuencias ? '−' : '+'}</span>
                      </button>
                    )}
                  </>
                )}
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <button type="button" aria-expanded={mostrarActividadLibre}
                    onClick={() => setMostrarActividadLibre(v => !v)}
                    className="flex w-full items-center justify-between gap-2 text-left text-sm font-bold text-blue-900">
                    <span>{mostrarActividadLibre ? 'Ocultar' : 'Agregar'} actividad que no aparece en el catálogo{actividadesAdicionales.length ? ` · ${actividadesAdicionales.length} agregada(s)` : ''}</span>
                    <span aria-hidden="true">{mostrarActividadLibre ? '−' : '+'}</span>
                  </button>
                  {mostrarActividadLibre && (<>
                  <p className="mb-2 text-xs text-blue-800">Puede agregar actividades que no estén en el punto P{programacionParaRegistro?.ciclo || '1'}. No modificarán las frecuencias del plan maestro.</p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="min-h-10 min-w-[180px] flex-1 rounded-lg border border-blue-300 bg-white p-2 text-sm"
                      value={nuevaActividadAdicional}
                      maxLength={250}
                      onChange={(e) => setNuevaActividadAdicional(e.target.value.toUpperCase())}
                      placeholder="Ej. REVISIÓN DE BATERÍA"
                    />
                    <button type="button" className="rounded-lg bg-blue-800 px-3 py-2 text-xs font-bold text-white"
                      onClick={() => {
                        const nombre = nuevaActividadAdicional.trim()
                        if (!nombre) return avisar('Escriba el nombre de la actividad adicional.')
                        if (actividadesAdicionales.length >= 20) return avisar('Puede agregar hasta 20 actividades por mantenimiento.')
                        if (actividadesAdicionales.some((x) => x === nombre)) return avisar('Esta actividad ya fue agregada.')
                        setActividadesAdicionales((x) => [...x, nombre])
                        setNuevaActividadAdicional('')
                        setAlertaFormulario(null)
                      }}>Agregar actividad</button>
                  </div>
                  </>)}
                  {actividadesAdicionales.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {actividadesAdicionales.map((nombre) => (
                        <li key={nombre} className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 text-xs text-slate-800">
                          <span>{nombre}</span>
                          <button type="button" className="font-bold text-red-700" onClick={() => setActividadesAdicionales((x) => x.filter((y) => y !== nombre))}>Quitar</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {tipoMant === 'CORRECTIVO' && (
              <div>
                <label className="block text-sm font-semibold mb-1">Actividad realizada *</label>
                <p className="mb-2 text-xs leading-relaxed text-slate-600">Describa de forma clara el diagnóstico, la reparación o el trabajo correctivo efectivamente realizado durante el servicio.</p>
                <textarea
                  className="w-full border p-2 rounded-lg text-sm"
                  rows="3"
                  value={actividad}
                  onChange={(e) => setActividad(e.target.value.toUpperCase())}
                  placeholder="Describa la actividad realizada"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  El mantenimiento correctivo no se relaciona con las actividades del Plan de Mantenimiento.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1">Repuestos utilizados *</label>
              <p className="mb-2 text-xs leading-relaxed text-slate-600">Indique los repuestos instalados o reemplazados. Si el servicio no requirió repuestos, escriba NO APLICA.</p>
              <textarea
                className="w-full border p-2 min-h-11 rounded-lg text-sm"
                rows="3"
                value={repuestos}
                onChange={(e) => setRepuestos(e.target.value.toUpperCase())}
                placeholder="Repuestos utilizados"
              />
              <p className="mt-1 text-[11px] text-slate-500">Campo obligatorio. Si el servicio no requirió repuestos, registre NO APLICA.</p>
            </div>
          </ModalSeccionMantenimiento>
        )}

        {seccionAbierta === 3 && (
          <ModalSeccionMantenimiento numero={3} titulo="Costos y datos complementarios" onCerrar={() => setSeccionAbierta(null)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Valor repuestos
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full border p-2 min-h-11 rounded-lg text-sm"
                  value={valorRepuestosStr}
                  onChange={
                    onValorRepuestosChange
                  }
                  placeholder="$ 0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Valor mano de obra
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full border p-2 min-h-11 rounded-lg text-sm"
                  value={valorManoObraStr}
                  onChange={
                    onValorManoObraChange
                  }
                  placeholder="$ 0"
                />
              </div>
            </div>

            <div className="bg-gray-50 border rounded-lg p-3">
              <p className="text-sm">
                <b>Costo total:</b>{' '}
                <span className="text-lg font-bold text-[var(--primary)]">
                  {toCOP(costoTotal)}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Factura
              </label>

              <input
                type="text"
                className="w-full border p-2 min-h-11 rounded-lg text-sm"
                value={factura}
                onChange={(e) =>
                  setFactura(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="Número de factura"
              />
            </div>
          </ModalSeccionMantenimiento>
        )}

        {seccionAbierta === 4 && (
          <ModalSeccionMantenimiento numero={4} titulo="Tiempo de parada y observaciones" onCerrar={() => setSeccionAbierta(null)}>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Tiempo de parada aproximado (horas)
              </label>

              <select
                className="w-full border p-2 min-h-11 rounded-lg text-sm"
                value={tpValor}
                onChange={(e) => setTpValor(e.target.value)}
              >
                <option value="">-- Seleccione tiempo aproximado --</option>
                {OPCIONES_TIEMPO_PARADA.map((horas) => (
                  <option key={horas} value={horas}>
                    {horas} {horas === 1 ? 'hora' : 'horas'}
                  </option>
                ))}
              </select>

              <p className="mt-1 text-[11px] text-slate-500">
                Desde esta versión el tiempo de parada se registra únicamente en horas.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Observaciones
              </label>

              <textarea
                className="w-full border p-2 min-h-11 rounded-lg text-sm"
                rows="3"
                value={observaciones}
                onChange={(e) =>
                  setObservaciones(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="Observaciones adicionales"
              />
            </div>
          </ModalSeccionMantenimiento>
        )}

        </main>
      </div>

      {/* =====================================================
          MODAL REGISTRAR PROVEEDOR - SOLO CORRECTIVO
      ====================================================== */}

      {modalProveedor && tipoMant === 'CORRECTIVO' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-3 sm:p-4">
          <div role="dialog" aria-modal="true" aria-label="Registrar proveedor para correctivo" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-400 bg-white p-4 shadow-2xl sm:p-5">
            <h3 className="rounded-lg bg-[#194567] px-3 py-3 text-base font-bold text-white">Registrar proveedor para correctivo</h3>
            <p className="mt-1 text-xs text-slate-600">
              Use los datos de la factura o documento del taller. Este registro se crea sin actividades de mantenimiento asociadas y podrá ser revisado por Administración.
            </p>
            <p className="mt-2 text-[11px] text-slate-500">Los campos marcados con <b>*</b> son obligatorios.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Tipo de persona *</label>
                <select className="w-full border p-2 min-h-11 rounded-lg text-sm" value={nuevoProveedor.tipo_persona} onChange={(e) => setNuevoProveedor((x) => ({ ...x, tipo_persona: e.target.value }))}>
                  <option value="JURIDICA">Jurídica</option>
                  <option value="NATURAL">Natural</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Razón social / nombre *</label>
                <input className="w-full border p-2 min-h-11 rounded-lg text-sm" value={nuevoProveedor.razon_social} onChange={(e) => setNuevoProveedor((x) => ({ ...x, razon_social: e.target.value.toUpperCase() }))} />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Nombre comercial</label>
                <input className="w-full border p-2 min-h-11 rounded-lg text-sm" value={nuevoProveedor.nombre_comercial} onChange={(e) => setNuevoProveedor((x) => ({ ...x, nombre_comercial: e.target.value.toUpperCase() }))} />
              </div>

              <div className="grid grid-cols-[1fr_110px] gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">NIT / documento *</label>
                  <input inputMode="numeric" className="w-full border p-2 min-h-11 rounded-lg text-sm" value={nuevoProveedor.nit_proveedor} onChange={(e) => setNuevoProveedor((x) => ({ ...x, nit_proveedor: onlyDigits(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">DV</label>
                  <input inputMode="numeric" maxLength={1} className="w-full border p-2 min-h-11 rounded-lg text-sm" value={nuevoProveedor.digito_verificacion} onChange={(e) => setNuevoProveedor((x) => ({ ...x, digito_verificacion: onlyDigits(e.target.value).slice(0, 1) }))} />
                  <p className="mt-1 text-[10px] leading-tight text-slate-500">
                    DV = Dígito de Verificación del NIT. Es el número que aparece después del guion, por ejemplo 900123456-<b>7</b>.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Dirección *</label>
                <input className="w-full border p-2 min-h-11 rounded-lg text-sm" value={nuevoProveedor.direccion} onChange={(e) => setNuevoProveedor((x) => ({ ...x, direccion: e.target.value.toUpperCase() }))} />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Teléfono *</label>
                <input inputMode="tel" maxLength={10} className="w-full border p-2 min-h-11 rounded-lg text-sm" value={nuevoProveedor.telefono} onChange={(e) => setNuevoProveedor((x) => ({ ...x, telefono: onlyDigits(e.target.value).slice(0, 10) }))} />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Correo</label>
                <input type="email" className="w-full border p-2 min-h-11 rounded-lg text-sm" value={nuevoProveedor.email} onChange={(e) => setNuevoProveedor((x) => ({ ...x, email: e.target.value }))} />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={guardandoProveedor} onClick={() => { setModalProveedor(false); setNuevoProveedor({ tipo_persona: 'JURIDICA', razon_social: '', nombre_comercial: '', nit_proveedor: '', digito_verificacion: '', direccion: '', telefono: '', email: '' }) }} className="rounded-lg bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-700">Cancelar</button>
              <button type="button" disabled={guardandoProveedor} onClick={guardarNuevoProveedor} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900 disabled:bg-gray-400">{guardandoProveedor ? 'Guardando...' : 'Guardar proveedor'}</button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL REGISTRAR TÉCNICO
      ====================================================== */}

      {modalTecnico && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-3 sm:p-4">
          <div role="dialog" aria-modal="true" aria-label="Registrar técnico" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-400 bg-white p-4 shadow-2xl sm:p-5">
            <h3 className="rounded-lg bg-[#194567] px-3 py-3 text-base font-bold text-white">Registrar técnico</h3>
            <p className="mt-1 text-xs text-slate-600">
              El proveedor ya debe existir. Verifique especialmente documento y celular antes de guardar.
            </p>
            <p className="mt-2 text-[11px] text-slate-500">Los campos marcados con <b>*</b> son obligatorios.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Nombres *</label>
                <input className="w-full border p-2 min-h-11 rounded-lg text-sm" value={nuevoTecnico.nombres} onChange={(e) => setNuevoTecnico((x) => ({ ...x, nombres: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Documento *</label>
                <input inputMode="numeric" maxLength={12} className="w-full border p-2 min-h-11 rounded-lg text-sm" value={nuevoTecnico.documento} onChange={(e) => setNuevoTecnico((x) => ({ ...x, documento: onlyDigits(e.target.value).slice(0, 12) }))} placeholder="Número de documento" />
                {/^3\d{9}$/.test(nuevoTecnico.documento) && <p className="mt-1 text-xs font-semibold text-red-600">Este número tiene estructura de celular. Verifique que no haya intercambiado documento y celular.</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Celular *</label>
                <input inputMode="tel" maxLength={10} className="w-full border p-2 min-h-11 rounded-lg text-sm" value={nuevoTecnico.telefono} onChange={(e) => setNuevoTecnico((x) => ({ ...x, telefono: onlyDigits(e.target.value).slice(0, 10) }))} placeholder="Ej. 3001234567" />
                {nuevoTecnico.telefono && !/^3\d{9}$/.test(nuevoTecnico.telefono) && <p className="mt-1 text-xs font-semibold text-red-600">El celular debe tener exactamente 10 dígitos y comenzar por 3.</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Correo</label>
                <input type="email" className="w-full border p-2 min-h-11 rounded-lg text-sm" value={nuevoTecnico.email} onChange={(e) => setNuevoTecnico((x) => ({ ...x, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Observaciones</label>
                <textarea rows="2" className="w-full border p-2 rounded-lg text-sm" value={nuevoTecnico.observaciones} onChange={(e) => setNuevoTecnico((x) => ({ ...x, observaciones: e.target.value.toUpperCase() }))} />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={guardandoTecnico} onClick={() => { setModalTecnico(false); setNuevoTecnico({ nombres: '', documento: '', telefono: '', email: '', observaciones: '' }) }} className="rounded-lg bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-700">Cancelar</button>
              <button type="button" disabled={guardandoTecnico} onClick={guardarNuevoTecnico} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900 disabled:bg-gray-400">{guardandoTecnico ? 'Guardando...' : 'Guardar técnico'}</button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}