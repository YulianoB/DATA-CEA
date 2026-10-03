// app/instructor/practica/mantenimientos/page.js

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { validarKilometraje } from '@/lib/servicios/validaciones'
import { cerrarSesion } from '@/lib/auth/logout'

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
  const [msgKm, setMsgKm] = useState('')
  const [forzarKm, setForzarKm] = useState(false)
  const [modalKm, setModalKm] = useState(null)

  // Tipo mantenimiento
  const [tipoMant, setTipoMant] = useState('')
  const [actividad, setActividad] = useState('')
  const [actividadesPlan, setActividadesPlan] = useState([])
  const [nivelSeleccionadoId, setNivelSeleccionadoId] = useState('')
  const [programacionPreventiva, setProgramacionPreventiva] = useState(null)
  const [cargandoProgramacion, setCargandoProgramacion] = useState(false)
  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState([])

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
        toast.error(
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
          toast.error(
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
          toast.error(
            jsonProveedores?.message ||
              'No se pudieron cargar los proveedores.'
          )
        }
      } catch (error) {
        console.error(
          'Error cargando información de mantenimientos:',
          error
        )

        toast.error(
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
    setActividadesPlan([])
    setActividadesSeleccionadas([])
    setNivelSeleccionadoId('')
    setActividad('')

    if (!vehiculo) {
      setVehiculoInfo({ tipo: '-', marca: '-' })
      return
    }

    setVehiculoInfo({
      tipo: vehiculo.tipo_vehiculo || '-',
      marca: vehiculo.marca || '-',
    })

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

        const validas = respuestas.filter((item) => item.ok)

        if (!validas.length) {
          setProgramacionPreventiva(null)
          toast.error(
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

        if (!seleccionado) {
          setProgramacionPreventiva(null)
          return
        }

        const { punto, vista } = seleccionado
        const actividadesPunto = Array.isArray(punto.actividades)
          ? punto.actividades
          : []

        const tolerancias = actividadesPunto
          .map((act) => Number(act?.tolerancia_km))
          .filter((valor) => Number.isFinite(valor) && valor >= 0)

        const toleranciaKm = tolerancias.length
          ? Math.min(...tolerancias)
          : Number(punto?.tolerancia_km ?? 500)

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
          Number.isFinite(kmActual) &&
          Number.isFinite(kmMinimo) &&
          Number.isFinite(kmMaximo) &&
          kmActual >= kmMinimo &&
          kmActual <= kmMaximo

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
        setActividadesPlan(normalizado.actividades)
        setNivelSeleccionadoId(String(normalizado.ciclo))
        setActividad(`MANTENIMIENTO PREVENTIVO P${normalizado.ciclo}`)
      } catch (error) {
        console.error('Error consultando el Plan de Mantenimiento:', error)
        setProgramacionPreventiva(null)
      } finally {
        setCargandoProgramacion(false)
      }
    }

    cargarProgramacion()
  }, [placa, vehiculos, nitActual])

  // ============================================================
  // Cambio de proveedor: técnicos + actividades habilitadas
  // ============================================================

  useEffect(() => {
    setActividadesSeleccionadas([])
    setActividadCatalogoId('')
    if (tipoMant === 'CORRECTIVO') setActividad('')

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

    const cargarDatosProveedor = async () => {
      if (!nitActual) return

      setCargandoActividadesProveedor(true)

      try {
        const tipoVehiculo =
          vehiculoInfo?.tipo && vehiculoInfo.tipo !== '-'
            ? `&tipo_vehiculo=${encodeURIComponent(vehiculoInfo.tipo)}`
            : ''

        const [resTecnicos, resActividades] = await Promise.all([
          fetch(
            `/api/mantenimientos?nit=${encodeURIComponent(nitActual)}&recurso=tecnicos&proveedor_id=${encodeURIComponent(proveedorId)}`,
            { cache: 'no-store' }
          ),
          fetch(
            `/api/mantenimientos?nit=${encodeURIComponent(nitActual)}&recurso=actividades_proveedor&proveedor_id=${encodeURIComponent(proveedorId)}${tipoVehiculo}`,
            { cache: 'no-store' }
          ),
        ])

        const [jsonTecnicos, jsonActividades] = await Promise.all([
          resTecnicos.json(),
          resActividades.json(),
        ])

        setTecnicos(
          resTecnicos.ok && jsonTecnicos?.status === 'success' && Array.isArray(jsonTecnicos.tecnicos)
            ? jsonTecnicos.tecnicos
            : []
        )

        if (resActividades.ok && jsonActividades?.status === 'success') {
          setActividadesProveedor(
            Array.isArray(jsonActividades.actividades)
              ? jsonActividades.actividades
              : []
          )
        } else {
          setActividadesProveedor([])
          toast.error(
            jsonActividades?.message ||
            'No se pudieron cargar las actividades del proveedor.'
          )
        }
      } catch (error) {
        console.error('Error cargando información del proveedor:', error)
        setTecnicos([])
        setActividadesProveedor([])
      } finally {
        setCargandoActividadesProveedor(false)
      }
    }

    setTecnicoId('')
    setTecnicoInfo(null)
    cargarDatosProveedor()
  }, [proveedorId, proveedores, nitActual, vehiculoInfo.tipo, tipoMant])

  const actividadesProveedorIds = useMemo(
    () => new Set(actividadesProveedor.map((item) => Number(item.id))),
    [actividadesProveedor]
  )

  const actividadesPreventivasDisponibles = useMemo(() => {
    if (!programacionPreventiva || !proveedorId) return []
    return (programacionPreventiva.actividades || []).filter((act) =>
      actividadesProveedorIds.has(Number(act.actividad_id))
    )
  }, [programacionPreventiva, proveedorId, actividadesProveedorIds])

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

  const onKmChange = async (e) => {
    const valor = e.target.value

    setKilometraje(valor)
    setMsgKm('')
    setForzarKm(false)
    setModalKm(null)

    if (!placa || valor === '' || !nitActual) {
      return
    }

    const kmNumero = Number(valor)

    if (
      !Number.isFinite(kmNumero) ||
      kmNumero < 0
    ) {
      setMsgKm(
        'El kilometraje no es válido.'
      )
      return
    }

    try {
      const resultado =
        await validarKilometraje(
          nitActual,
          placa,
          kmNumero
        )

      if (!resultado) {
        setMsgKm(
          'No fue posible validar el kilometraje.'
        )
        return
      }

      if (resultado.estado === 'error') {
        setMsgKm(resultado.mensaje)

        toast.error(
          resultado.mensaje
        )

        return
      }

      if (
        resultado.estado ===
        'advertencia'
      ) {
        setMsgKm(
          resultado.mensaje
        )

        setModalKm({
          maxKm:
            resultado.maxKm,

          diferencia:
            resultado.diferencia,

          fuente:
            resultado.fuente,

          campo:
            resultado.campo,

          onConfirm: () => {
            setForzarKm(true)
            setModalKm(null)
          },
        })

        return
      }

      setMsgKm(
        resultado.mensaje ||
          'Kilometraje válido.'
      )
    } catch (error) {
      console.error(
        'Error validando kilometraje:',
        error
      )

      setMsgKm(
        'No fue posible validar el kilometraje.'
      )
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
    setNivelSeleccionadoId('')
    setActividad('')
    setActividadCatalogoId('')
    setActividadesSeleccionadas([])
  }

  // ============================================================
  // Costos
  // ============================================================

  const onValorRepuestosChange = (e) => {
    const num = parseCOP(e.target.value)

    setValorRepuestosStr(
      num ? toCOP(num) : ''
    )
  }

  const onValorManoObraChange = (e) => {
    const num = parseCOP(e.target.value)

    setValorManoObraStr(
      num ? toCOP(num) : ''
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

  const puedeGuardar = useMemo(() => {
    if (!nitActual || !placa) return false

    const mensajeKm =
      String(msgKm || '').toLowerCase()

    const kmOk =
      (
        msgKm &&
        !mensajeKm.includes('menor') &&
        !mensajeKm.includes('no fue posible') &&
        !mensajeKm.includes('no se identificó') &&
        !mensajeKm.includes('error')
      ) ||
      forzarKm

    if (
      !kmOk ||
      !Number.isFinite(Number(kilometraje)) ||
      Number(kilometraje) < 0
    ) {
      return false
    }

    if (
      tipoMant !== 'PREVENTIVO' &&
      tipoMant !== 'CORRECTIVO'
    ) {
      return false
    }

    if (!proveedorId) return false
    if (!repuestos.trim()) return false

    if (
      tipoMant === 'PREVENTIVO' &&
      (
        !programacionPreventiva ||
        !programacionPreventiva?.dentro_tolerancia ||
        !actividad ||
        actividadesSeleccionadas.length === 0
      )
    ) {
      return false
    }

    if (
      tipoMant === 'CORRECTIVO' &&
      (!actividad.trim() || !actividadCatalogoId)
    ) {
      return false
    }

    return true
  }, [
    nitActual,
    placa,
    msgKm,
    forzarKm,
    kilometraje,
    tipoMant,
    actividad,
    nivelSeleccionadoId,
    programacionPreventiva,
    actividadesSeleccionadas,
    proveedorId,
    actividadCatalogoId,
    repuestos,
  ])

  // ============================================================
  // Registrar mantenimiento
  // ============================================================

  const registrar = async () => {
    if (
      !puedeGuardar ||
      guardando ||
      !user ||
      !nitActual
    ) {
      return
    }

    setGuardando(true)

    try {
      const {
        fecha,
        timestamp,
      } = ahoraBogota()

      const payload = {
        nit: nitActual,
        accion: 'registrar',

        timestamp_registro:
          timestamp,

        fecha_registro:
          fecha,

        placa,

        kilometraje:
          Number(kilometraje),

        tipo_mantenimiento:
          tipoMant,

        actividad_realizada:
          actividad.trim(),

        actividad_catalogo_id:
          tipoMant === 'CORRECTIVO' && actividadCatalogoId
            ? Number(actividadCatalogoId)
            : null,

        vehiculo_id:
          tipoMant === 'PREVENTIVO'
            ? Number(programacionPreventiva?.vehiculo_id)
            : null,

        ciclo:
          tipoMant === 'PREVENTIVO'
            ? Number(programacionPreventiva?.ciclo)
            : null,

        km_objetivo:
          tipoMant === 'PREVENTIVO'
            ? Number(programacionPreventiva?.km_objetivo)
            : null,

        actividades_config_ids:
          tipoMant === 'PREVENTIVO'
            ? actividadesSeleccionadas.map(Number)
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
          parseCOP(
            valorRepuestosStr
          ) ||
          null,

        valor_mano_obra:
          parseCOP(
            valorManoObraStr
          ) ||
          null,

        costo_total:
          costoTotal ||
          null,

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
        toast.error(
          json?.message ||
            'No se pudo registrar el mantenimiento.'
        )

        return
      }

      toast.success(
        'Mantenimiento registrado correctamente.'
      )

      setPlaca('')

      setVehiculoInfo({
        tipo: '-',
        marca: '-',
      })

      setKilometraje('')
      setMsgKm('')
      setForzarKm(false)
      setModalKm(null)

      setTipoMant('')
      setNivelSeleccionadoId('')
      setActividad('')
      setActividadCatalogoId('')
      setActividadesPlan([])

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

      toast.error(
        'Error inesperado al registrar el mantenimiento.'
      )
    } finally {
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

    if (!razonSocial) return toast.error('La razón social o nombre del proveedor es obligatoria.')
    if (!nitProveedor) return toast.error('El NIT o documento es obligatorio.')
    if (nuevoProveedor.digito_verificacion && !/^\d$/.test(nuevoProveedor.digito_verificacion)) {
      return toast.error('El DV (dígito de verificación) debe ser un solo número.')
    }
    if (!nuevoProveedor.direccion.trim()) return toast.error('La dirección es obligatoria.')
    if (!/^\d{7,10}$/.test(telefono)) return toast.error('El teléfono debe contener entre 7 y 10 números.')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Ingrese un correo electrónico válido.')

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
        toast.error(json?.message || 'No se pudo registrar el proveedor.')
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
      toast.success('Proveedor registrado. Quedó disponible para este mantenimiento correctivo.')
    } catch (error) {
      console.error('Error registrando proveedor:', error)
      toast.error('Error inesperado al registrar el proveedor.')
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
      toast.error('Los nombres del técnico son obligatorios.')
      return
    }

    if (!/^\d{5,12}$/.test(documento)) {
      toast.error('El documento debe contener entre 5 y 12 números.')
      return
    }

    if (/^3\d{9}$/.test(documento)) {
      toast.error('El documento ingresado tiene estructura de número celular. Verifique que no haya intercambiado el documento y el celular.')
      return
    }

    if (!/^3\d{9}$/.test(telefono)) {
      toast.error('El celular debe contener exactamente 10 dígitos y comenzar por 3.')
      return
    }

    if (documento === telefono) {
      toast.error('El documento y el celular no pueden ser iguales. Verifique que no haya intercambiado los datos.')
      return
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Ingrese un correo electrónico válido.')
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
        toast.error(json?.message || 'No fue posible registrar el técnico.')
        return
      }

      const tecnicoCreado = json.tecnico
      setTecnicos((actual) => [...actual.filter((x) => Number(x.id) !== Number(tecnicoCreado.id)), tecnicoCreado].sort((a, b) => String(a.nombres || '').localeCompare(String(b.nombres || ''))))
      setTecnicoId(String(tecnicoCreado.id))
      setTecnicoInfo(tecnicoCreado)
      setModalTecnico(false)
      toast.success('Técnico registrado correctamente.')
    } catch (error) {
      console.error('Error registrando técnico:', error)
      toast.error('No fue posible registrar el técnico.')
    } finally {
      setGuardandoTecnico(false)
    }
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
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4">

      <Toaster
        position="top-center"
        richColors
      />

      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-3 sm:p-5">

        {/* Título */}

        <h2 className="text-xl sm:text-2xl font-bold text-center text-[var(--primary)] mb-4">
          <i className="fas fa-tools mr-2"></i>
          Registro de Mantenimiento
        </h2>

        <div className="mb-4 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          Los campos marcados con <b>*</b> son obligatorios.
        </div>

        {/* Usuario */}

        <div className="bg-gray-50 border rounded-lg p-3 text-sm text-center mb-6">
          Usuario:{' '}
          <strong>
            {user.nombreCompleto ||
              user.usuario}
          </strong>
        </div>

        {/* =====================================================
            VEHÍCULO
        ====================================================== */}

        <div className="border rounded-lg overflow-hidden mb-6">

          <div className="bg-gray-900 text-white px-4 py-2 font-semibold">
            <i className="fas fa-car mr-2"></i>
            Vehículo
          </div>

          <div className="p-4 space-y-4">

            <div>
              <label className="block text-sm font-semibold mb-1">
                Placa *
              </label>

              <select
                className="w-full border p-2 min-h-11 rounded-lg text-sm"
                value={placa}
                onChange={(e) => {
                  setPlaca(e.target.value)
                  setKilometraje('')
                  setMsgKm('')
                  setForzarKm(false)
                  setModalKm(null)
                }}
              >
                <option value="">
                  -- Seleccione una placa --
                </option>

                {vehiculos.map((vehiculo) => (
                  <option
                    key={vehiculo.id || vehiculo.placa}
                    value={vehiculo.placa}
                  >
                    {vehiculo.placa}
                  </option>
                ))}
              </select>

              <div className="mt-2 text-xs text-gray-600">
                <p>
                  <b>Tipo:</b>{' '}
                  {vehiculoInfo.tipo}
                </p>

                <p>
                  <b>Marca:</b>{' '}
                  {vehiculoInfo.marca}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Kilometraje *
              </label>

              <input
                type="number"
                min="0"
                className={`w-full border p-2 min-h-11 rounded-lg text-sm ${
                  !placa
                    ? 'bg-gray-100 cursor-not-allowed'
                    : ''
                }`}
                value={kilometraje}
                disabled={!placa}
                onChange={onKmChange}
                placeholder="Kilometraje actual"
              />

              {msgKm && (
                <p
                  className={`text-xs mt-1 ${
                    String(msgKm)
                      .toLowerCase()
                      .includes('menor')
                      ? 'text-red-600'
                      : String(msgKm)
                          .toLowerCase()
                          .includes('supera')
                        ? 'text-orange-600'
                        : 'text-green-600'
                  }`}
                >
                  {msgKm}
                </p>
              )}

              {forzarKm && (
                <p className="text-xs mt-1 text-orange-600 font-semibold">
                  Kilometraje confirmado manualmente.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================
            MANTENIMIENTO
        ====================================================== */}

        <div className="border rounded-lg overflow-hidden mb-6">

          <div className="bg-gray-900 text-white px-4 py-2 font-semibold">
            <i className="fas fa-wrench mr-2"></i>
            Información del mantenimiento
          </div>

          <div className="p-4 space-y-4">

            <div>
              <label className="block text-sm font-semibold mb-1">
                Tipo de mantenimiento *
              </label>

              <select
                className="w-full border p-2 min-h-11 rounded-lg text-sm"
                value={tipoMant}
                onChange={onTipoMantChange}
              >
                <option value="">
                  -- Seleccione --
                </option>

                <option value="PREVENTIVO">
                  Preventivo
                </option>

                <option value="CORRECTIVO">
                  Correctivo
                </option>
              </select>
            </div>

            {tipoMant === 'PREVENTIVO' && (
              <div className="space-y-3">
                {cargandoProgramacion ? (
                  <div className="border rounded-xl p-4 bg-slate-50 text-sm text-slate-600 text-center">
                    Consultando Plan de Mantenimiento...
                  </div>
                ) : !placa ? (
                  <div className="border rounded-xl p-4 bg-slate-50 text-sm text-slate-600">
                    Seleccione primero la placa del vehículo.
                  </div>
                ) : !programacionPreventiva ? (
                  <div className="border border-orange-200 rounded-xl p-4 bg-orange-50">
                    <p className="text-sm font-bold text-orange-800">Sin punto preventivo disponible</p>
                    <p className="text-xs text-orange-700 mt-1">
                      Revise que el vehículo tenga su configuración finalizada y un punto PROGRAMADO en el Plan de Mantenimiento.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <div className="bg-slate-800 text-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] text-slate-300">Punto preventivo</p>
                          <p className="text-xl font-bold">P{programacionPreventiva.ciclo}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${String(programacionPreventiva.estado).toUpperCase() === 'VENCIDO' ? 'bg-orange-200 text-orange-900' : 'bg-blue-200 text-blue-900'}`}>
                          {programacionPreventiva.estado}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 text-xs">
                      <div className="bg-white border rounded-lg p-2">
                        <span className="text-slate-500">Km objetivo</span>
                        <p className="font-bold">{Number(programacionPreventiva.km_objetivo || 0).toLocaleString('es-CO')} km</p>
                      </div>
                      <div className="bg-white border rounded-lg p-2">
                        <span className="text-slate-500">Frecuencia base</span>
                        <p className="font-bold">{Number(programacionPreventiva.frecuencia_base_km || 0).toLocaleString('es-CO')} km</p>
                      </div>
                      <div className="bg-white border rounded-lg p-2">
                        <span className="text-slate-500">Tolerancia</span>
                        <p className="font-bold">± {Number(programacionPreventiva.tolerancia_km || 500).toLocaleString('es-CO')} km</p>
                      </div>
                      <div className="bg-white border rounded-lg p-2">
                        <span className="text-slate-500">Rango habilitado</span>
                        <p className="font-bold">
                          {Number(programacionPreventiva.km_minimo || 0).toLocaleString('es-CO')} - {Number(programacionPreventiva.km_maximo || 0).toLocaleString('es-CO')} km
                        </p>
                      </div>
                    </div>

                    {!programacionPreventiva.dentro_tolerancia && (
                      <div className="mx-3 mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                        <p className="text-xs font-bold text-blue-900">
                          Mantenimiento programado aún no habilitado
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-blue-800">
                          El punto P{programacionPreventiva.ciclo} puede registrarse cuando el kilometraje del vehículo se encuentre entre{' '}
                          <b>{Number(programacionPreventiva.km_minimo || 0).toLocaleString('es-CO')} km</b> y{' '}
                          <b>{Number(programacionPreventiva.km_maximo || 0).toLocaleString('es-CO')} km</b>.
                          El último kilometraje preoperacional es{' '}
                          <b>{Number(programacionPreventiva.ultimo_km_preoperacional || 0).toLocaleString('es-CO')} km</b>.
                        </p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
            PROVEEDOR
        ====================================================== */}

        <div className="border rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-900 text-white px-4 py-2 font-semibold">
            <i className="fas fa-building mr-2"></i>
            Proveedor y técnico
          </div>

          <div className="p-4 space-y-5">
            <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-xs text-slate-700">
              Los proveedores, talleres, técnicos y actividades que atienden son configurados por Administración. Si el proveedor de la factura aún no aparece, solicite su registro antes de guardar el mantenimiento.
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
              {tipoMant === 'CORRECTIVO' && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setModalProveedor(true)}
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
                Técnico
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
          </div>
        </div>

        {/* =====================================================
            ACTIVIDADES Y REPUESTOS
        ====================================================== */}

        <div className="border rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-900 text-white px-4 py-2 font-semibold">
            <i className="fas fa-clipboard-check mr-2"></i>
            Actividades y repuestos del servicio
          </div>

          <div className="p-4 space-y-5">
            {tipoMant === 'PREVENTIVO' && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="text-sm font-bold">Actividades realizadas en este servicio *</label>
                  <span className="text-xs font-semibold text-slate-600">{actividadesSeleccionadas.length}/{actividadesPreventivasDisponibles.length}</span>
                </div>

                {!proveedorId ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Seleccione primero el proveedor o taller. Solo se mostrarán las actividades que ese proveedor tiene configuradas por Administración.
                  </div>
                ) : cargandoActividadesProveedor ? (
                  <div className="rounded-xl border bg-slate-50 p-3 text-xs text-slate-600">
                    Consultando actividades habilitadas para el proveedor...
                  </div>
                ) : actividadesPreventivasDisponibles.length === 0 ? (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
                    Este proveedor no tiene configuradas actividades compatibles con el punto preventivo y el tipo de vehículo seleccionado. Solicite a Administración revisar su configuración.
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Marque únicamente las actividades realmente ejecutadas durante este servicio.
                    </p>
                    <div className="space-y-2">
                      {actividadesPreventivasDisponibles.map((act, index) => {
                        const id = Number(act.configuracion_id)
                        const checked = actividadesSeleccionadas.includes(id)
                        return (
                          <label key={`${id}-${index}`} className={`flex items-start gap-3 border rounded-xl p-3 cursor-pointer ${checked ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'}`}>
                            <input
                              type="checkbox"
                              className="mt-1 h-5 w-5 shrink-0"
                              checked={checked}
                              disabled={!programacionPreventiva?.dentro_tolerancia}
                              onChange={() => setActividadesSeleccionadas((actual) => checked ? actual.filter((x) => x !== id) : [...actual, id])}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{act.actividad}</p>
                              {act.accion && <p className="text-[11px] text-slate-600 mt-1">{act.accion}</p>}
                              <p className="text-[11px] text-slate-500 mt-1">Cada {Number(act.frecuencia_km || 0).toLocaleString('es-CO')} km</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {tipoMant === 'CORRECTIVO' && (
              <div>
                <label className="block text-sm font-semibold mb-1">Actividad realizada *</label>
                <textarea
                  className="w-full border p-2 rounded-lg text-sm"
                  rows="3"
                  value={actividad}
                  onChange={(e) => setActividad(e.target.value.toUpperCase())}
                  placeholder="Describa el diagnóstico, reparación o trabajo correctivo realizado."
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  El mantenimiento correctivo no se relaciona con las actividades del Plan de Mantenimiento.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1">Repuestos utilizados *</label>
              <textarea
                className="w-full border p-2 min-h-11 rounded-lg text-sm"
                rows="3"
                value={repuestos}
                onChange={(e) => setRepuestos(e.target.value.toUpperCase())}
                placeholder="Describa los repuestos utilizados. Si no se utilizaron, escriba NO APLICA."
              />
              <p className="mt-1 text-[11px] text-slate-500">Campo obligatorio. Si el servicio no requirió repuestos, registre NO APLICA.</p>
            </div>
          </div>
        </div>

        {/* =====================================================
            COSTOS Y DATOS COMPLEMENTARIOS
        ====================================================== */}

        <div className="border rounded-lg overflow-hidden mb-6">

          <div className="bg-gray-900 text-white px-4 py-2 font-semibold">
            <i className="fas fa-file-invoice-dollar mr-2"></i>
            Costos y datos complementarios
          </div>

          <div className="p-4 space-y-4">

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
          </div>
        </div>

        {/* =====================================================
            BOTONES
        ====================================================== */}

        <div className="flex justify-center gap-3 flex-wrap">

          <button
            type="button"
            disabled={
              !puedeGuardar ||
              guardando
            }
            onClick={registrar}
            className={`min-h-11 py-2 px-5 rounded-lg shadow-md text-sm text-white ${
              puedeGuardar &&
              !guardando
                ? 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            <i className="fas fa-save mr-2"></i>

            {guardando
              ? 'Guardando...'
              : 'Registrar Mantenimiento'}
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                '/instructor/practica'
              )
            }
            className="bg-gray-600 hover:bg-gray-800 text-white min-h-11 py-2 px-4 rounded-lg shadow-md text-sm"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Regresar
          </button>

          <button
            type="button"
            onClick={() =>
              cerrarSesion(router)
            }
            className="bg-[var(--danger)] hover:bg-red-800 text-white min-h-11 py-2 px-4 rounded-lg shadow-md text-sm"
          >
            <i className="fas fa-sign-out-alt mr-2"></i>
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* =====================================================
          MODAL REGISTRAR PROVEEDOR - SOLO CORRECTIVO
      ====================================================== */}

      {modalProveedor && tipoMant === 'CORRECTIVO' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">Registrar proveedor para correctivo</h3>
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
              <button type="button" disabled={guardandoProveedor} onClick={() => setModalProveedor(false)} className="rounded-lg bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-700">Cancelar</button>
              <button type="button" disabled={guardandoProveedor} onClick={guardarNuevoProveedor} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900 disabled:bg-gray-400">{guardandoProveedor ? 'Guardando...' : 'Guardar proveedor'}</button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL REGISTRAR TÉCNICO
      ====================================================== */}

      {modalTecnico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">Registrar técnico</h3>
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
              <button type="button" disabled={guardandoTecnico} onClick={() => setModalTecnico(false)} className="rounded-lg bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-700">Cancelar</button>
              <button type="button" disabled={guardandoTecnico} onClick={guardarNuevoTecnico} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900 disabled:bg-gray-400">{guardandoTecnico ? 'Guardando...' : 'Guardar técnico'}</button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL KILOMETRAJE
      ====================================================== */}

      {modalKm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">

          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">

            <h3 className="text-lg font-bold mb-3 text-orange-600">
              Advertencia de Kilometraje
            </h3>

            <p className="text-sm mb-2">
              El kilometraje ingresado presenta una diferencia superior al límite configurado.
            </p>

            <p className="text-sm mb-1">
              <b>Último registro:</b>{' '}
              {modalKm.maxKm} km
            </p>

            <p className="text-sm mb-1">
              <b>Fuente:</b>{' '}
              {modalKm.fuente}{' '}
              ({modalKm.campo})
            </p>

            <p className="text-sm mb-4">
              <b>Diferencia:</b>{' '}
              {modalKm.diferencia} km
            </p>

            <div className="flex justify-end gap-3">

              <button
                className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
                onClick={() =>
                  setModalKm(null)
                }
              >
                Cancelar
              </button>

              <button
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded"
                onClick={() =>
                  modalKm.onConfirm &&
                  modalKm.onConfirm()
                }
              >
                Confirmar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}