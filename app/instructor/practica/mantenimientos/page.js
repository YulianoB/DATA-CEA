// app/instructor/practica/mantenimientos/page.js

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
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
// Helpers tiempo de parada
// ============================================================

const minutosDesdeValorUnidad = (valor, unidad) => {
  const numero = Number(valor || 0)

  if (!numero) return 0

  if (unidad === 'h') {
    return Math.round(numero * 60)
  }

  return Math.round(numero)
}

const labelDesdeMinutos = (minutos) => {
  const total = Number(minutos || 0)

  if (!total) return '0 min'

  const horas = Math.floor(total / 60)
  const resto = total % 60

  if (horas > 0 && resto > 0) {
    return `${total} min (${horas} h ${resto} m)`
  }

  if (horas > 0) {
    return `${total} min (${horas} h)`
  }

  return `${total} min`
}

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

  // Repuestos
  const [repuestos, setRepuestos] = useState('')

  // Proveedores
  const [proveedores, setProveedores] = useState([])
  const [proveedorId, setProveedorId] = useState('')
  const [proveedorInfo, setProveedorInfo] = useState(null)

  // Técnicos
  const [tecnicos, setTecnicos] = useState([])
  const [tecnicoId, setTecnicoId] = useState('')
  const [tecnicoInfo, setTecnicoInfo] = useState(null)

  // Modales
  const [modalProveedor, setModalProveedor] = useState(null)
  const [modalTecnico, setModalTecnico] = useState(null)

  // Validaciones en vivo
  const [provNitDup, setProvNitDup] = useState(null)
  const provNitTimer = useRef(null)

  const [tecDocDup, setTecDocDup] = useState(null)
  const tecDocTimer = useRef(null)

  // Costos
  const [valorRepuestosStr, setValorRepuestosStr] = useState('')
  const [valorManoObraStr, setValorManoObraStr] = useState('')

  // Tiempo de parada
  const [tpValor, setTpValor] = useState('')
  const [tpUnidad, setTpUnidad] = useState('min')

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
  // Cambio de placa / programación preventiva
  // ============================================================

  useEffect(() => {
    const vehiculo = vehiculos.find(
      (item) => item.placa === placa
    )

    setProgramacionPreventiva(null)
    setActividadesPlan([])
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
        const res = await fetch(
          `/api/mantenimientos?nit=${encodeURIComponent(
            nitActual
          )}&recurso=programacion_pendiente&placa=${encodeURIComponent(placa)}`,
          { cache: 'no-store' }
        )

        const json = await res.json()

        if (!res.ok || json?.status !== 'success') {
          console.error('Error cargando programación preventiva:', json)
          setProgramacionPreventiva(null)
          return
        }

        const programacion = json?.programacion || null
        setProgramacionPreventiva(programacion)

        if (programacion) {
          const nivelUnico = {
            id: programacion.plan_mantenimiento_id,
            nivel: programacion.nivel,
            familia: programacion.familia,
            desde_km: programacion.desde_km,
            hasta_km: programacion.hasta_km,
            actividad: programacion.actividad,
            actividades_acumuladas: Array.isArray(programacion.actividades)
              ? programacion.actividades
              : [],
          }

          setActividadesPlan([nivelUnico])
          setNivelSeleccionadoId(String(nivelUnico.id))
          setActividad(
            String(
              nivelUnico.actividad ||
                `MANTENIMIENTO PREVENTIVO NIVEL ${nivelUnico.nivel}`
            ).trim()
          )
        }
      } catch (error) {
        console.error('Error cargando programación preventiva:', error)
        setProgramacionPreventiva(null)
      } finally {
        setCargandoProgramacion(false)
      }
    }

    cargarProgramacion()
  }, [placa, vehiculos, nitActual])

  // ============================================================
  // Cambio de proveedor
  // ============================================================

  useEffect(() => {
    if (!proveedorId) {
      setProveedorInfo(null)
      setTecnicos([])
      setTecnicoId('')
      setTecnicoInfo(null)
      return
    }

    const proveedor = proveedores.find(
      (item) =>
        String(item.id) === String(proveedorId)
    )

    setProveedorInfo(proveedor || null)

    const cargarTecnicos = async () => {
      if (!nitActual) return

      try {
        const res = await fetch(
          `/api/mantenimientos?nit=${encodeURIComponent(
            nitActual
          )}&recurso=tecnicos&proveedor_id=${encodeURIComponent(
            proveedorId
          )}`,
          {
            cache: 'no-store',
          }
        )

        const json = await res.json()

        if (
          res.ok &&
          json?.status === 'success'
        ) {
          setTecnicos(
            Array.isArray(json.tecnicos)
              ? json.tecnicos
              : []
          )
        } else {
          setTecnicos([])

          toast.error(
            json?.message ||
              'No se pudieron cargar los técnicos.'
          )
        }
      } catch (error) {
        console.error(
          'Error cargando técnicos:',
          error
        )

        setTecnicos([])
      }
    }

    setTecnicoId('')
    setTecnicoInfo(null)

    cargarTecnicos()
  }, [proveedorId, proveedores, nitActual])

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

    if (
      tipoMant === 'PREVENTIVO' &&
      (!programacionPreventiva || !nivelSeleccionadoId || !actividad)
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
    msgKm,
    forzarKm,
    kilometraje,
    tipoMant,
    actividad,
    nivelSeleccionadoId,
    programacionPreventiva,
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

      const minutos =
        minutosDesdeValorUnidad(
          tpValor,
          tpUnidad
        )

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

        plan_mantenimiento_id:
          tipoMant === 'PREVENTIVO'
            ? Number(programacionPreventiva?.plan_mantenimiento_id)
            : null,

        programacion_mantenimiento_id:
          tipoMant === 'PREVENTIVO'
            ? Number(programacionPreventiva?.id)
            : null,

        nivel_mantenimiento:
          tipoMant === 'PREVENTIVO'
            ? Number(programacionPreventiva?.nivel)
            : null,

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

        tiempoparada:
          minutos
            ? String(minutos)
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
      setTpUnidad('min')

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
  // Validación NIT proveedor
  // ============================================================

  useEffect(() => {
    if (!modalProveedor) {
      setProvNitDup(null)
      return
    }

    const nitProveedor = String(
      modalProveedor.nit || ''
    ).trim()

    if (provNitTimer.current) {
      clearTimeout(
        provNitTimer.current
      )
    }

    if (
      !nitProveedor ||
      !nitActual
    ) {
      setProvNitDup(null)
      return
    }

    provNitTimer.current =
      setTimeout(
        async () => {
          try {
            const res = await fetch(
              `/api/mantenimientos?nit=${encodeURIComponent(
                nitActual
              )}&recurso=validar_nit&nit_proveedor=${encodeURIComponent(
                nitProveedor
              )}`,
              {
                cache: 'no-store',
              }
            )

            const json =
              await res.json()

            if (
              res.ok &&
              json?.status === 'success'
            ) {
              setProvNitDup(
                json.existe
                  ? json.proveedor
                  : null
              )
            }
          } catch (error) {
            console.error(
              'Error validando NIT del proveedor:',
              error
            )
          }
        },
        400
      )

    return () => {
      if (provNitTimer.current) {
        clearTimeout(
          provNitTimer.current
        )
      }
    }
  }, [
    modalProveedor?.nit,
    nitActual,
  ])

  // ============================================================
  // Validación documento técnico
  // ============================================================

  useEffect(() => {
    if (
      !modalTecnico ||
      !proveedorId
    ) {
      setTecDocDup(null)
      return
    }

    const documento = String(
      modalTecnico.documento ||
      ''
    ).trim()

    if (tecDocTimer.current) {
      clearTimeout(
        tecDocTimer.current
      )
    }

    if (
      !documento ||
      !nitActual
    ) {
      setTecDocDup(null)
      return
    }

    tecDocTimer.current =
      setTimeout(
        async () => {
          try {
            const res = await fetch(
              `/api/mantenimientos?nit=${encodeURIComponent(
                nitActual
              )}&recurso=validar_tecnico&proveedor_id=${encodeURIComponent(
                proveedorId
              )}&documento=${encodeURIComponent(
                documento
              )}`,
              {
                cache: 'no-store',
              }
            )

            const json =
              await res.json()

            if (
              res.ok &&
              json?.status === 'success'
            ) {
              setTecDocDup(
                json.existe
                  ? json.tecnico
                  : null
              )
            }
          } catch (error) {
            console.error(
              'Error validando documento del técnico:',
              error
            )
          }
        },
        400
      )

    return () => {
      if (tecDocTimer.current) {
        clearTimeout(
          tecDocTimer.current
        )
      }
    }
  }, [
    modalTecnico?.documento,
    proveedorId,
    nitActual,
  ])

  // ============================================================
  // Crear proveedor
  // ============================================================

  const guardarProveedor = async () => {
    if (
      !modalProveedor ||
      !nitActual
    ) {
      return
    }

    const empresa = String(
      modalProveedor.empresa ||
      ''
    )
      .trim()
      .toUpperCase()

    if (!empresa) {
      toast.error(
        'La empresa es obligatoria.'
      )
      return
    }

    if (provNitDup) {
      toast.error(
        `El NIT ya está registrado para ${provNitDup.empresa}.`
      )
      return
    }

    try {
      const res = await fetch(
        '/api/mantenimientos',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              nit: nitActual,

              accion:
                'crear_proveedor',

              empresa,

              nit_proveedor:
                modalProveedor.nit,

              direccion:
                modalProveedor.direccion,

              telefono:
                modalProveedor.telefono,

              email:
                modalProveedor.email,
            }),
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
            'No se pudo crear el proveedor.'
        )
        return
      }

      const nuevoProveedor =
        json.proveedor

      if (!nuevoProveedor) {
        toast.error(
          'La API no devolvió la información del proveedor.'
        )
        return
      }

      setProveedores((actuales) => {
        const existe =
          actuales.some(
            (item) =>
              String(item.id) ===
              String(nuevoProveedor.id)
          )

        if (existe) {
          return actuales
        }

        return [
          ...actuales,
          nuevoProveedor,
        ].sort((a, b) =>
          String(a.empresa || '').localeCompare(
            String(b.empresa || ''),
            'es'
          )
        )
      })

      setProveedorId(
        String(nuevoProveedor.id)
      )

      setProveedorInfo(
        nuevoProveedor
      )

      setModalProveedor(null)
      setProvNitDup(null)

      toast.success(
        json?.existente
          ? 'Proveedor seleccionado.'
          : 'Proveedor creado correctamente.'
      )
    } catch (error) {
      console.error(
        'Error creando proveedor:',
        error
      )

      toast.error(
        'Error inesperado al crear el proveedor.'
      )
    }
  }

  // ============================================================
  // Crear técnico
  // ============================================================

  const guardarTecnico = async () => {
    if (
      !modalTecnico ||
      !proveedorId ||
      !nitActual
    ) {
      return
    }

    const nombres = String(
      modalTecnico.nombres || ''
    )
      .trim()
      .toUpperCase()

    const documento = String(
      modalTecnico.documento || ''
    ).trim()

    if (!nombres) {
      toast.error(
        'El nombre del técnico es obligatorio.'
      )
      return
    }

    if (!documento) {
      toast.error(
        'El documento del técnico es obligatorio.'
      )
      return
    }

    if (tecDocDup) {
      toast.error(
        'Ese documento ya está registrado para este proveedor.'
      )
      return
    }

    try {
      const res = await fetch(
        '/api/mantenimientos',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              nit: nitActual,

              accion:
                'crear_tecnico',

              proveedor_id:
                Number(proveedorId),

              nombres,

              documento,

              telefono:
                modalTecnico.telefono,

              email:
                modalTecnico.email,
            }),
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
            'No se pudo crear el técnico.'
        )
        return
      }

      const nuevoTecnico =
        json.tecnico

      if (!nuevoTecnico) {
        toast.error(
          'La API no devolvió la información del técnico.'
        )
        return
      }

      setTecnicos((actuales) => {
        const existe =
          actuales.some(
            (item) =>
              String(item.id) ===
              String(nuevoTecnico.id)
          )

        if (existe) {
          return actuales
        }

        return [
          ...actuales,
          nuevoTecnico,
        ].sort((a, b) =>
          String(a.nombres || '').localeCompare(
            String(b.nombres || ''),
            'es'
          )
        )
      })

      setTecnicoId(
        String(nuevoTecnico.id)
      )

      setTecnicoInfo(
        nuevoTecnico
      )

      setModalTecnico(null)
      setTecDocDup(null)

      toast.success(
        'Técnico creado correctamente.'
      )
    } catch (error) {
      console.error(
        'Error creando técnico:',
        error
      )

      toast.error(
        'Error inesperado al crear el técnico.'
      )
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

  const minutosParada =
    minutosDesdeValorUnidad(
      tpValor,
      tpUnidad
    )

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4">

      <Toaster
        position="top-center"
        richColors
      />

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-3 sm:p-6">

        {/* Título */}

        <h2 className="text-2xl font-bold text-center text-[var(--primary)] mb-6">
          <i className="fas fa-tools mr-2"></i>
          Registro de Mantenimiento
        </h2>

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
                  <div className="border rounded-xl p-4 bg-gray-50 text-sm text-gray-600 text-center">
                    Consultando mantenimiento preventivo programado...
                  </div>
                ) : !placa ? (
                  <div className="border rounded-xl p-4 bg-gray-50 text-sm text-gray-600">
                    Seleccione primero la placa del vehículo.
                  </div>
                ) : !programacionPreventiva ? (
                  <div className="border border-orange-200 rounded-xl p-4 bg-orange-50">
                    <p className="text-sm font-bold text-orange-800">
                      Sin mantenimiento preventivo programado
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      Este vehículo aún no tiene un mantenimiento preventivo pendiente en el Plan de Mantenimiento.
                      No es posible registrar un preventivo ordinario hasta que exista una programación formal.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="border border-[var(--primary)] rounded-xl overflow-hidden">
                      <div className="bg-blue-50 px-4 py-3 border-b">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-gray-600">Mantenimiento correspondiente</p>
                            <p className="text-lg font-bold text-[var(--primary)]">
                              Nivel {programacionPreventiva.nivel}
                            </p>
                            <p className="text-xs text-gray-700 mt-1">
                              {programacionPreventiva.desde_km != null && programacionPreventiva.hasta_km != null
                                ? `${Number(programacionPreventiva.desde_km).toLocaleString('es-CO')} - ${Number(programacionPreventiva.hasta_km).toLocaleString('es-CO')} km`
                                : 'Rango de kilometraje no configurado'}
                            </p>
                          </div>
                          <span className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--primary)] text-white text-[11px] font-bold">
                            {programacionPreventiva.estado}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                          <div className="bg-white rounded-lg p-2 border">
                            <span className="text-gray-500">Vigencia</span>
                            <p className="font-bold">{programacionPreventiva.vigencia}</p>
                          </div>
                          <div className="bg-white rounded-lg p-2 border">
                            <span className="text-gray-500">Mes programado</span>
                            <p className="font-bold">{programacionPreventiva.mes_programado}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3">
                        <p className="text-sm font-bold mb-2">Actividades a realizar</p>
                        {Array.isArray(programacionPreventiva.actividades) &&
                        programacionPreventiva.actividades.length > 0 ? (
                          <div className="space-y-2">
                            {programacionPreventiva.actividades.map((act, index) => (
                              <div
                                key={`${act.id}-${act.nivel_origen}-${index}`}
                                className="flex items-start gap-2 text-xs"
                              >
                                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                                  ✓
                                </span>
                                <div className="min-w-0">
                                  <span className="font-semibold text-gray-500">
                                    N{act.nivel_origen} ·{' '}
                                  </span>
                                  <span className="text-gray-800">{act.actividad}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-orange-600">
                            Este nivel no tiene actividades configuradas.
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500">
                      El nivel es determinado por la programación del vehículo y no puede modificarse desde este formulario.
                    </p>
                  </>
                )}
              </div>
            )}

            {tipoMant === 'CORRECTIVO' && (
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Actividad realizada *
                </label>

                <textarea
                  className="w-full border p-2 min-h-11 rounded-lg text-sm"
                  rows="3"
                  value={actividad}
                  onChange={(e) =>
                    setActividad(
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="Describa la actividad realizada"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1">
                Repuestos utilizados
              </label>

              <textarea
                className="w-full border p-2 min-h-11 rounded-lg text-sm"
                rows="3"
                value={repuestos}
                onChange={(e) =>
                  setRepuestos(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="Describa los repuestos utilizados"
              />
            </div>
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

            <div>
              <label className="block text-sm font-semibold mb-1">
                Proveedor
              </label>

              <div className="flex gap-2">

                <select
                  className="flex-1 border p-2 min-h-11 rounded-lg text-sm"
                  value={proveedorId}
                  onChange={(e) =>
                    setProveedorId(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    -- Seleccione proveedor --
                  </option>

                  {proveedores.map(
                    (proveedor) => (
                      <option
                        key={proveedor.id}
                        value={proveedor.id}
                      >
                        {proveedor.empresa}
                        {proveedor.nit
                          ? ` - NIT ${proveedor.nit}`
                          : ''}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-3 rounded-lg"
                  onClick={() => {
                    setProvNitDup(null)

                    setModalProveedor({
                      empresa: '',
                      nit: '',
                      direccion: '',
                      telefono: '',
                      email: '',
                    })
                  }}
                  title="Crear proveedor"
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>

              {proveedorInfo && (
                <div className="bg-gray-50 border rounded-lg p-3 mt-3 text-xs text-gray-700">
                  <p>
                    <b>Empresa:</b>{' '}
                    {proveedorInfo.empresa ||
                      '-'}
                  </p>

                  <p>
                    <b>NIT:</b>{' '}
                    {proveedorInfo.nit ||
                      '-'}
                  </p>

                  <p>
                    <b>Dirección:</b>{' '}
                    {proveedorInfo.direccion ||
                      '-'}
                  </p>

                  <p>
                    <b>Teléfono:</b>{' '}
                    {proveedorInfo.telefono ||
                      '-'}
                  </p>

                  <p>
                    <b>Email:</b>{' '}
                    {proveedorInfo.email ||
                      '-'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Técnico
              </label>

              <div className="flex gap-2">

                <select
                  className={`flex-1 border p-2 min-h-11 rounded-lg text-sm ${
                    !proveedorId
                      ? 'bg-gray-100'
                      : ''
                  }`}
                  value={tecnicoId}
                  disabled={!proveedorId}
                  onChange={(e) =>
                    setTecnicoId(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    -- Seleccione técnico --
                  </option>

                  {tecnicos.map(
                    (tecnico) => (
                      <option
                        key={tecnico.id}
                        value={tecnico.id}
                      >
                        {tecnico.nombres}
                        {tecnico.documento
                          ? ` - ${tecnico.documento}`
                          : ''}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  disabled={!proveedorId}
                  className={`px-3 rounded-lg text-white ${
                    proveedorId
                      ? 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (!proveedorId) {
                      return
                    }

                    setTecDocDup(null)

                    setModalTecnico({
                      nombres: '',
                      documento: '',
                      telefono: '',
                      email: '',
                    })
                  }}
                  title="Crear técnico"
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>

              {tecnicoInfo && (
                <div className="bg-gray-50 border rounded-lg p-3 mt-3 text-xs text-gray-700">
                  <p>
                    <b>Técnico:</b>{' '}
                    {tecnicoInfo.nombres ||
                      '-'}
                  </p>

                  <p>
                    <b>Documento:</b>{' '}
                    {tecnicoInfo.documento ||
                      '-'}
                  </p>

                  <p>
                    <b>Teléfono:</b>{' '}
                    {tecnicoInfo.telefono ||
                      '-'}
                  </p>

                  <p>
                    <b>Email:</b>{' '}
                    {tecnicoInfo.email ||
                      '-'}
                  </p>
                </div>
              )}
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
                Tiempo de parada
              </label>

              <div className="grid grid-cols-2 gap-2">

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full border p-2 min-h-11 rounded-lg text-sm"
                  value={tpValor}
                  onChange={(e) =>
                    setTpValor(
                      e.target.value
                    )
                  }
                  placeholder="Valor"
                />

                <select
                  className="w-full border p-2 min-h-11 rounded-lg text-sm"
                  value={tpUnidad}
                  onChange={(e) =>
                    setTpUnidad(
                      e.target.value
                    )
                  }
                >
                  <option value="min">
                    Minutos
                  </option>

                  <option value="h">
                    Horas
                  </option>
                </select>
              </div>

              {!!minutosParada && (
                <p className="text-xs text-gray-600 mt-1">
                  Se registrará:{' '}
                  <b>
                    {labelDesdeMinutos(
                      minutosParada
                    )}
                  </b>
                </p>
              )}
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
            RESPONSABLE
        ====================================================== */}

        <div className="bg-gray-50 border rounded-lg p-4 mb-6 text-sm">

          <p className="font-semibold mb-2">
            Responsable del registro
          </p>

          <p>
            <b>Nombre:</b>{' '}
            {user.nombreCompleto ||
              user.usuario ||
              '-'}
          </p>

          <p>
            <b>Documento:</b>{' '}
            {user.documento ||
              '-'}
          </p>

          <p>
            <b>Cargo / Rol:</b>{' '}
            {user.rol ||
              '-'}
          </p>
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

      {/* =====================================================
          MODAL NUEVO PROVEEDOR
      ====================================================== */}

      {modalProveedor && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">

          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">

            <h3 className="text-lg font-bold mb-4">
              Nuevo proveedor
            </h3>

            <div className="space-y-3">

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Empresa *
                </label>

                <input
                  className="w-full border p-2 rounded text-sm"
                  autoFocus
                  value={
                    modalProveedor.empresa
                  }
                  onChange={(e) =>
                    setModalProveedor({
                      ...modalProveedor,
                      empresa:
                        e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  NIT
                </label>

                <input
                  className="w-full border p-2 rounded text-sm"
                  value={
                    modalProveedor.nit
                  }
                  onChange={(e) =>
                    setModalProveedor({
                      ...modalProveedor,
                      nit:
                        e.target.value,
                    })
                  }
                />

                {!!provNitDup && (
                  <p className="text-xs text-red-600 mt-1">
                    Este NIT ya está registrado para{' '}
                    <b>
                      {provNitDup.empresa}
                    </b>
                    .
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Dirección
                </label>

                <input
                  className="w-full border p-2 rounded text-sm"
                  value={
                    modalProveedor.direccion
                  }
                  onChange={(e) =>
                    setModalProveedor({
                      ...modalProveedor,
                      direccion:
                        e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Teléfono
                </label>

                <input
                  className="w-full border p-2 rounded text-sm"
                  value={
                    modalProveedor.telefono
                  }
                  onChange={(e) =>
                    setModalProveedor({
                      ...modalProveedor,
                      telefono:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Email
                </label>

                <input
                  type="email"
                  className="w-full border p-2 rounded text-sm"
                  value={
                    modalProveedor.email
                  }
                  onChange={(e) =>
                    setModalProveedor({
                      ...modalProveedor,
                      email:
                        e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">

              <button
                className="px-3 py-2 bg-gray-500 hover:bg-gray-700 text-white rounded"
                onClick={() =>
                  setModalProveedor(null)
                }
              >
                Cancelar
              </button>

              <button
                className={`px-3 py-2 text-white rounded ${
                  provNitDup
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'
                }`}
                disabled={!!provNitDup}
                onClick={guardarProveedor}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL NUEVO TÉCNICO
      ====================================================== */}

      {modalTecnico && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">

          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">

            <h3 className="text-lg font-bold mb-2">
              Nuevo técnico
            </h3>

            {proveedorInfo && (
              <p className="text-xs text-gray-600 mb-4">
                Proveedor:{' '}
                <b>
                  {proveedorInfo.empresa}
                </b>
              </p>
            )}

            <div className="space-y-3">

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Nombres y Apellidos *
                </label>

                <input
                  className="w-full border p-2 rounded text-sm"
                  autoFocus
                  value={
                    modalTecnico.nombres
                  }
                  onChange={(e) =>
                    setModalTecnico({
                      ...modalTecnico,
                      nombres:
                        e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Documento *
                </label>

                <input
                  className="w-full border p-2 rounded text-sm"
                  value={
                    modalTecnico.documento
                  }
                  onChange={(e) =>
                    setModalTecnico({
                      ...modalTecnico,
                      documento:
                        e.target.value,
                    })
                  }
                />

                {!!tecDocDup && (
                  <p className="text-xs text-red-600 mt-1">
                    Documento ya registrado para este proveedor. Técnico:{' '}
                    <b>
                      {tecDocDup.nombres}
                    </b>
                    .
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Teléfono
                </label>

                <input
                  className="w-full border p-2 rounded text-sm"
                  value={
                    modalTecnico.telefono
                  }
                  onChange={(e) =>
                    setModalTecnico({
                      ...modalTecnico,
                      telefono:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Email
                </label>

                <input
                  type="email"
                  className="w-full border p-2 rounded text-sm"
                  value={
                    modalTecnico.email
                  }
                  onChange={(e) =>
                    setModalTecnico({
                      ...modalTecnico,
                      email:
                        e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">

              <button
                className="px-3 py-2 bg-gray-500 hover:bg-gray-700 text-white rounded"
                onClick={() =>
                  setModalTecnico(null)
                }
              >
                Cancelar
              </button>

              <button
                className={`px-3 py-2 text-white rounded ${
                  !proveedorId ||
                  tecDocDup
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'
                }`}
                disabled={
                  !proveedorId ||
                  !!tecDocDup
                }
                onClick={guardarTecnico}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}