// app/admin/mantenimientos/plan/page.jsx

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle,
  Car, Check, ChevronDown, ChevronRight, ClipboardList, Plus,
  Pencil, RefreshCw, Search, Settings2, X
} from 'lucide-react'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import ModalResultado from '@/components/admin/ModalResultado'
import { BotonAccion, ESTILO_SECCIONES, ESTILO_SECCIONES_SECUNDARIAS, ESTILO_FRANJA_SUPERIOR_MODAL, ESTILO_ENCABEZADO_TABLA, ESTILO_CELDAS_TABLA } from '@/components/admin/EstiloModulo'

const TIPOS = ['AUTOMOVIL', 'CAMIONETA', 'MOTOCICLETA', 'CAMION']
const NOMBRES_TIPO = {
  AUTOMOVIL: 'Automóviles', CAMIONETA: 'Camionetas',
  MOTOCICLETA: 'Motocicletas', CAMION: 'Camiones',
}
const SINGULAR_TIPO = {
  AUTOMOVIL: 'Automóvil', CAMIONETA: 'Camioneta',
  MOTOCICLETA: 'Motocicleta', CAMION: 'Camión',
}

function obtenerNitUsuario() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw) return ''
    const user = JSON.parse(raw)
    return String(user?.nitEmpresa || user?.nit_empresa || user?.nit ||
      user?.empresaNit || user?.empresa_nit || '').trim()
  } catch { return '' }
}

function mensajeError(data, fallback) {
  return data?.error || data?.message || data?.mensaje || fallback
}

function formatoNumero(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
}

function formatoFecha(valor) {
  if (!valor) return '—'
  const [y, m, d] = String(valor).slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : valor
}

function diasTranscurridos(fechaMantenimiento, fechaPreoperacional) {
  if (!fechaMantenimiento || !fechaPreoperacional) return null

  const inicio = new Date(`${String(fechaMantenimiento).slice(0, 10)}T00:00:00Z`)
  const fin = new Date(`${String(fechaPreoperacional).slice(0, 10)}T00:00:00Z`)

  const diferencia = Math.floor((fin - inicio) / 86400000)
  return Number.isFinite(diferencia) && diferencia >= 0 ? diferencia : null
}

function kmDesdeUltimoMantenimiento(kmMantenimiento, kmActual) {
  if (kmMantenimiento === null || kmMantenimiento === undefined || kmMantenimiento === '' ||
      kmActual === null || kmActual === undefined || kmActual === '') return null

  const anterior = Number(kmMantenimiento)
  const actual = Number(kmActual)

  if (!Number.isFinite(anterior) || !Number.isFinite(actual)) return null

  const diferencia = actual - anterior
  return diferencia >= 0 ? diferencia : null
}


function soloDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '')
}

function valorMiles(valor) {
  const limpio = soloDigitos(valor)
  if (!limpio) return ''
  return new Intl.NumberFormat('es-CO').format(Number(limpio))
}

export default function ConfiguracionPlanMantenimientoPage() {
  const [vehiculos, setVehiculos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [abiertos, setAbiertos] = useState(
    Object.fromEntries(TIPOS.map((x) => [x, true]))
  )

  const [modalAbierto, setModalAbierto] = useState(false)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [vehiculoDetalle, setVehiculoDetalle] = useState(null)
  const [promedios, setPromedios] = useState(null)
  const [mantenimientos, setMantenimientos] = useState([])
  const [actividades, setActividades] = useState([])
  const [busquedaActividad, setBusquedaActividad] = useState('')
  const [frecuenciasEditables, setFrecuenciasEditables] = useState({})
  const [estadoConfiguracion, setEstadoConfiguracion] = useState('SIN_CONFIGURAR')
  const [reglaFrecuencias, setReglaFrecuencias] = useState(null)

  const [modalNuevaActividad, setModalNuevaActividad] = useState(false)
  const [guardandoNueva, setGuardandoNueva] = useState(false)
  const [nuevaActividad, setNuevaActividad] = useState({
    nombre: '', accion: '', descripcion: '', motivo_criterio: '',
    frecuencia_recomendada_km: '',
  })

  const cargarVehiculos = useCallback(async () => {
    setCargando(true); setError('')
    try {
      const nit = obtenerNitUsuario()
      if (!nit) throw new Error('No fue posible identificar el NIT del CEA en la sesión actual.')

      const r = await fetch('/api/admin/mantenimientos/plan', {
        headers: { 'x-cea-nit': nit }, cache: 'no-store',
      })
      const data = await r.json().catch(() => null)
      if (!r.ok || !data?.ok) throw new Error(mensajeError(data, 'No fue posible consultar los vehículos.'))
      setVehiculos(Array.isArray(data.vehiculos) ? data.vehiculos : [])
    } catch (e) {
      setVehiculos([]); setError(e?.message || 'No fue posible consultar los vehículos.')
    } finally { setCargando(false) }
  }, [])

  useEffect(() => { cargarVehiculos() }, [cargarVehiculos])

  const vehiculosPorTipo = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es')
    return Object.fromEntries(TIPOS.map((tipo) => [tipo,
      vehiculos.filter((v) => v.tipo_vehiculo_normalizado === tipo).filter((v) =>
        !termino || [v.placa, v.marca, v.modelo, v.linea, v.clasificacion]
          .some((x) => String(x ?? '').toLocaleLowerCase('es').includes(termino))
      )
    ]))
  }, [vehiculos, busqueda])

  async function cargarDetalle(vehiculoId) {
    const nit = obtenerNitUsuario()
    const r = await fetch(`/api/admin/mantenimientos/plan?vehiculo_id=${vehiculoId}`, {
      headers: { 'x-cea-nit': nit }, cache: 'no-store',
    })
    const data = await r.json().catch(() => null)
    if (!r.ok || !data?.ok) throw new Error(mensajeError(data, 'No fue posible consultar la configuración.'))

    setVehiculoDetalle(data.vehiculo)
    setPromedios(data.promedios_recorrido ?? null)
    setReglaFrecuencias(data.regla_frecuencias ?? null)
    setMantenimientos(data.ultimos_mantenimientos_preventivos ?? [])
    setActividades((data.actividades ?? []).map((a) => ({
      ...a,
      seleccionada: Boolean(a.seleccionada),
      esConfiguradaOriginal: Boolean(a.configuracion?.activo),
      frecuencia_km: a.seleccionada && a.configuracion?.frecuencia_km
        ? String(Math.round(Number(a.configuracion.frecuencia_km))) : '',
      observaciones: a.configuracion?.observaciones ?? '',
    })))
    setFrecuenciasEditables({})
    setEstadoConfiguracion(data.estado_configuracion || 'SIN_CONFIGURAR')
  }

  async function abrirConfiguracion(id) {
    setModalAbierto(true); setCargandoDetalle(true); setError(''); setMensaje('')
    setVehiculoDetalle(null); setPromedios(null); setReglaFrecuencias(null); setMantenimientos([]); setActividades([])
    try { await cargarDetalle(id) }
    catch (e) { setError(e?.message || 'No fue posible consultar la configuración.'); setModalAbierto(false) }
    finally { setCargandoDetalle(false) }
  }

  function cerrarModal() {
    if (guardando) return
    setModalAbierto(false); setVehiculoDetalle(null); setActividades([]); setReglaFrecuencias(null); setFrecuenciasEditables({}); setEstadoConfiguracion('SIN_CONFIGURAR')
  }

  const actividadBase = useMemo(
    () => actividades.find((a) => a.es_frecuencia_base) ?? null,
    [actividades]
  )

  const frecuenciaBaseKm = useMemo(() => {
    if (!actividadBase?.seleccionada) return null
    const n = Number(soloDigitos(actividadBase.frecuencia_km))
    return Number.isFinite(n) && n > 0 ? n : null
  }, [actividadBase])

  function sugerenciaOperativa(a, base = frecuenciaBaseKm) {
    const desdeApi = Number(a?.frecuencia_sugerida_operativa_km)
    if (!base && Number.isFinite(desdeApi) && desdeApi > 0) return desdeApi

    const referencia = Number(a?.frecuencia_recomendada_km)
    if (!Number.isFinite(referencia) || referencia <= 0) return base || null
    if (!base || base <= 0) return referencia
    if (referencia <= base) return base

    const inferior = Math.floor(referencia / base) * base
    const superior = Math.ceil(referencia / base) * base
    if (inferior < base) return superior
    return (superior - referencia) <= (referencia - inferior) ? superior : inferior
  }

  function validarFrecuenciasSeleccionadas() {
    if (!actividadBase?.seleccionada) {
      return 'Debe seleccionar Cambio de aceite para definir la frecuencia base.'
    }
    const base = Number(soloDigitos(actividadBase.frecuencia_km))
    if (!Number.isFinite(base) || base <= 0) {
      return 'Defina primero una frecuencia base válida para Cambio de aceite.'
    }

    for (const a of actividades.filter((x) => x.seleccionada)) {
      const km = Number(soloDigitos(a.frecuencia_km))
      if (!Number.isFinite(km) || km <= 0) return `Defina una frecuencia válida para "${a.nombre}".`
      if (km < base || km % base !== 0) {
        return `"${a.nombre}" debe tener una frecuencia múltiplo de ${formatoNumero(base)} km.`
      }
    }
    return ''
  }

  function alternarActividad(a) {
    if (estadoConfiguracion === 'FINALIZADO') return
    const seleccionada = !a.seleccionada

    if (!a.es_frecuencia_base && seleccionada && !frecuenciaBaseKm) {
      setError('Defina primero la frecuencia base de Cambio de aceite.')
      return
    }

    if (a.es_frecuencia_base && !seleccionada &&
        actividades.some((x) => x.seleccionada && !x.es_frecuencia_base)) {
      setError('No puede retirar Cambio de aceite mientras existan otras actividades seleccionadas.')
      return
    }

    setError('')
    setActividades((actuales) => actuales.map((item) => {
      if (item.id !== a.id) return item
      if (!seleccionada) return { ...item, seleccionada: false, frecuencia_km: '' }

      let frecuencia = item.frecuencia_km
      if (!frecuencia) {
        const sugerida = a.es_frecuencia_base
          ? Number(a.frecuencia_recomendada_km)
          : sugerenciaOperativa(a)
        frecuencia = Number.isFinite(sugerida) && sugerida > 0 ? String(Math.round(sugerida)) : ''
      }
      return { ...item, seleccionada: true, frecuencia_km: frecuencia }
    }))

    setFrecuenciasEditables((actuales) => ({
      ...actuales,
      [a.id]: seleccionada ? !a.esConfiguradaOriginal : false,
    }))
  }

  function habilitarEdicionFrecuencia(id) {
    if (estadoConfiguracion === 'FINALIZADO') return
    setFrecuenciasEditables((actuales) => ({ ...actuales, [id]: true }))
  }

  function actualizarActividad(id, campo, valor) {
    setActividades((actuales) => actuales.map((a) =>
      a.id === id ? { ...a, [campo]: valor } : a
    ))
    setError('')
  }

  const actividadesVisibles = useMemo(() => {
    const t = busquedaActividad.trim().toLocaleLowerCase('es')
    return actividades
      .filter((a) => !t || [a.nombre, a.accion, a.descripcion, a.motivo_criterio].some((x) =>
        String(x ?? '').toLocaleLowerCase('es').includes(t)))
      .sort((a, b) => {
        if (Boolean(a.es_frecuencia_base) !== Boolean(b.es_frecuencia_base)) {
          return a.es_frecuencia_base ? -1 : 1
        }
        const fa = Number(a.frecuencia_recomendada_km)
        const fb = Number(b.frecuencia_recomendada_km)
        const va = Number.isFinite(fa) && fa > 0 ? fa : Number.MAX_SAFE_INTEGER
        const vb = Number.isFinite(fb) && fb > 0 ? fb : Number.MAX_SAFE_INTEGER
        if (va !== vb) return va - vb
        return String(a.nombre ?? '').localeCompare(String(b.nombre ?? ''), 'es', { sensitivity: 'base' })
      })
  }, [actividades, busquedaActividad])

  const filasActividades = useMemo(() => {
    const filas = []

    // Antes de definir la frecuencia base no mostramos agrupaciones/frecuencias
    // sugeridas. Cambio de aceite permanece primero para que el usuario defina la base.
    if (!frecuenciaBaseKm) {
      return actividadesVisibles.map((actividad) => ({
        tipo: 'ACTIVIDAD',
        actividad,
      }))
    }

    const ordenadas = [...actividadesVisibles].sort((a, b) => {
      if (Boolean(a.es_frecuencia_base) !== Boolean(b.es_frecuencia_base)) {
        return a.es_frecuencia_base ? -1 : 1
      }
      const sa = Number(sugerenciaOperativa(a)) || Number.MAX_SAFE_INTEGER
      const sb = Number(sugerenciaOperativa(b)) || Number.MAX_SAFE_INTEGER
      if (sa !== sb) return sa - sb
      return String(a.nombre ?? '').localeCompare(
        String(b.nombre ?? ''),
        'es',
        { sensitivity: 'base' }
      )
    })

    let frecuenciaAnterior = null
    for (const actividad of ordenadas) {
      const frecuencia = Number(sugerenciaOperativa(actividad))
      const clave = Number.isFinite(frecuencia) && frecuencia > 0
        ? frecuencia
        : 'SIN_FRECUENCIA'

      if (clave !== frecuenciaAnterior) {
        filas.push({ tipo: 'GRUPO', clave, frecuencia: clave })
        frecuenciaAnterior = clave
      }
      filas.push({ tipo: 'ACTIVIDAD', actividad })
    }

    return filas
  }, [actividadesVisibles, frecuenciaBaseKm])

  async function guardarConfiguracion() {
    if (!vehiculoDetalle) return
    const errorFrecuencias = validarFrecuenciasSeleccionadas()
    if (errorFrecuencias) { setError(errorFrecuencias); return }

    setGuardando(true); setError(''); setMensaje('')
    try {
      const nit = obtenerNitUsuario()
      const r = await fetch('/api/admin/mantenimientos/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cea-nit': nit },
        body: JSON.stringify({
          nit, accion: 'GUARDAR_CONFIGURACION', vehiculo_id: vehiculoDetalle.id,
          actividades: actividades.map((a) => ({
            actividad_id: a.id, seleccionada: a.seleccionada,
            frecuencia_km: a.seleccionada ? Number(soloDigitos(a.frecuencia_km)) : null,
            observaciones: a.observaciones || null,
          })),
        }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok || !data?.ok) throw new Error(mensajeError(data, 'No fue posible guardar la configuración.'))
      setMensaje(data.mensaje || 'Configuración guardada correctamente.')
      setModalAbierto(false); await cargarVehiculos()
    } catch (e) { setError(e?.message || 'No fue posible guardar la configuración.') }
    finally { setGuardando(false) }
  }

  async function finalizarConfiguracion() {
    if (!vehiculoDetalle || estadoConfiguracion === 'FINALIZADO') return
    const errorFrecuencias = validarFrecuenciasSeleccionadas()
    if (errorFrecuencias) { setError(errorFrecuencias); return }

    setGuardando(true); setError(''); setMensaje('')
    try {
      const nit = obtenerNitUsuario()
      const guardar = await fetch('/api/admin/mantenimientos/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cea-nit': nit },
        body: JSON.stringify({
          nit, accion: 'GUARDAR_CONFIGURACION', vehiculo_id: vehiculoDetalle.id,
          actividades: actividades.map((a) => ({
            actividad_id: a.id, seleccionada: a.seleccionada,
            frecuencia_km: a.seleccionada ? Number(soloDigitos(a.frecuencia_km)) : null,
            observaciones: a.observaciones || null,
          })),
        }),
      })
      const dataGuardar = await guardar.json().catch(() => null)
      if (!guardar.ok || !dataGuardar?.ok) throw new Error(mensajeError(dataGuardar, 'No fue posible guardar la configuración.'))

      const finalizar = await fetch('/api/admin/mantenimientos/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cea-nit': nit },
        body: JSON.stringify({ nit, accion: 'FINALIZAR_CONFIGURACION', vehiculo_id: vehiculoDetalle.id }),
      })
      const data = await finalizar.json().catch(() => null)
      if (!finalizar.ok || !data?.ok) {
        const faltantes = Array.isArray(data?.actividades_faltantes) ? data.actividades_faltantes : []
        const detalle = faltantes.length ? ` Faltan: ${faltantes.join(', ')}.` : ''
        throw new Error(`${mensajeError(data, 'No fue posible finalizar el plan.')}${detalle}`)
      }

      setEstadoConfiguracion('FINALIZADO')
      setMensaje(data.mensaje || 'Plan finalizado correctamente.')
      setModalAbierto(false)
      await cargarVehiculos()
    } catch (e) {
      setError(e?.message || 'No fue posible finalizar el plan.')
      await cargarDetalle(vehiculoDetalle.id).catch(() => {})
    } finally { setGuardando(false) }
  }

  async function reabrirConfiguracion() {
    if (!vehiculoDetalle || estadoConfiguracion !== 'FINALIZADO') return
    setGuardando(true); setError(''); setMensaje('')
    try {
      const nit = obtenerNitUsuario()
      const r = await fetch('/api/admin/mantenimientos/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cea-nit': nit },
        body: JSON.stringify({ nit, accion: 'REABRIR_CONFIGURACION', vehiculo_id: vehiculoDetalle.id }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok || !data?.ok) throw new Error(mensajeError(data, 'No fue posible reabrir la configuración.'))
      setMensaje(data.mensaje || 'Configuración reabierta correctamente.')
      await cargarDetalle(vehiculoDetalle.id)
      await cargarVehiculos()
    } catch (e) { setError(e?.message || 'No fue posible reabrir la configuración.') }
    finally { setGuardando(false) }
  }

  async function guardarNuevaActividad(e) {
    e.preventDefault()
    if (!vehiculoDetalle || !nuevaActividad.nombre.trim()) return
    setGuardandoNueva(true); setError('')
    try {
      const nit = obtenerNitUsuario()
      const r = await fetch('/api/admin/mantenimientos/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cea-nit': nit },
        body: JSON.stringify({
          nit, accion: 'AGREGAR_ACTIVIDAD',
          tipo_vehiculo: vehiculoDetalle.tipo_vehiculo_normalizado,
          nombre: nuevaActividad.nombre.trim(),
          accion_actividad: nuevaActividad.accion.trim(),
          descripcion: nuevaActividad.descripcion.trim(),
          motivo_criterio: nuevaActividad.motivo_criterio.trim(),
          frecuencia_recomendada_km: nuevaActividad.frecuencia_recomendada_km || null,
        }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok || !data?.ok) throw new Error(mensajeError(data, 'No fue posible agregar la actividad.'))
      setModalNuevaActividad(false); await cargarDetalle(vehiculoDetalle.id)
    } catch (e) { setError(e?.message || 'No fue posible agregar la actividad.') }
    finally { setGuardandoNueva(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-3 md:p-5">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        <EncabezadoModulo
          titulo="Configuración Plan de Mantenimiento"
          subtitulo="Actividades y frecuencias preventivas por vehículo"
          icono={ClipboardList}
          rutaRegreso="/admin/mantenimientos"
          textoRegreso="Mantenimiento Vehicular"
          permitirPersonalizacion={false}
        />

        <main className="p-4 md:p-5">

          <div className="mb-4 flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar placa, marca, modelo, línea..."
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm" />
            </div>
            <BotonAccion tipo="actualizar" onClick={cargarVehiculos} disabled={cargando}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm">
              <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} /> Actualizar
            </BotonAccion>
          </div>

          {cargando ? <div className="py-14 text-center text-sm text-gray-500">Consultando vehículos activos...</div> :
            <div className="space-y-3">
              {TIPOS.map((tipo) => {
                const lista = vehiculosPorTipo[tipo] ?? []
                return <section key={tipo} className="overflow-hidden rounded-lg border border-slate-300">
                  <button type="button" onClick={() => setAbiertos((x) => ({...x, [tipo]: !x[tipo]}))}
                    className="flex w-full items-center justify-between px-3 py-2 text-white" style={{ backgroundColor: ESTILO_SECCIONES.fondo }}>
                    <span className="flex items-center gap-2 text-xs font-bold uppercase">
                      {abiertos[tipo] ? <ChevronDown size={17}/> : <ChevronRight size={17}/>}
                      <Car size={15}/>{NOMBRES_TIPO[tipo]}
                    </span>
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{lista.length}</span>
                  </button>
                  {abiertos[tipo] && <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="text-[10px] font-bold uppercase [&_th]:border [&_th]:border-slate-300" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>
                        <tr>
                          <th className="px-2 py-1.5 text-left">Placa</th>
                          <th className="px-2 py-1.5 text-left">Vehículo</th>
                          <th className="px-2 py-1.5 text-center">Modelo / Línea</th>
                          <th className="px-2 py-1.5 text-center"><span className="block">Último km</span><span className="block">preoperacionales</span></th>
                          <th className="px-2 py-1.5 text-center"><span className="block">Km último</span><span className="block">mantenimiento</span></th>
                          <th className="px-2 py-1.5 text-center"><span className="block">Km desde último</span><span className="block">mantenimiento</span></th>
                          <th className="px-2 py-1.5 text-center"><span className="block">Días desde último</span><span className="block">mantenimiento</span></th>
                          <th className="px-2 py-1.5 text-center">Estado</th>
                          <th className="px-2 py-1.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 [&_td]:border [&_td]:border-slate-300">
                        {lista.length === 0 ? <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">No hay vehículos activos de este tipo.</td></tr> :
                        lista.map((v) => <tr key={v.id} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5 font-bold">{v.placa}</td>
                          <td className="px-2 py-1.5"><div className="font-medium">{v.marca || '—'}</div><div className="text-[9px] text-gray-500">{v.clasificacion || SINGULAR_TIPO[tipo]}</div></td>
                          <td className="px-2 py-1.5 text-center text-gray-600">{[v.modelo,v.linea].filter(Boolean).join(' / ') || '—'}</td>
                          <td className="px-2 py-1.5 text-center"><div className="font-medium">{v.ultimo_km != null ? `${formatoNumero(v.ultimo_km)} km` : '—'}</div><div className="text-[9px] text-gray-400">{formatoFecha(v.fecha_ultimo_km)}</div></td>
                          <td className="px-2 py-1.5 text-center"><div className="font-medium">{v.ultimo_mantenimiento_preventivo_km != null ? `${formatoNumero(v.ultimo_mantenimiento_preventivo_km)} km` : '—'}</div><div className="text-[9px] text-gray-400">{formatoFecha(v.fecha_ultimo_mantenimiento_preventivo)}</div></td>
                          <td className="px-2 py-1.5 text-center font-semibold text-gray-700">
                            {kmDesdeUltimoMantenimiento(v.ultimo_mantenimiento_preventivo_km, v.ultimo_km) != null
                              ? `${formatoNumero(kmDesdeUltimoMantenimiento(v.ultimo_mantenimiento_preventivo_km, v.ultimo_km))} km`
                              : '—'}
                          </td>
                          <td className="px-2 py-1.5 text-center font-semibold text-gray-700">
                            {diasTranscurridos(v.fecha_ultimo_mantenimiento_preventivo, v.fecha_ultimo_km) != null
                              ? `${diasTranscurridos(v.fecha_ultimo_mantenimiento_preventivo, v.fecha_ultimo_km)} días`
                              : '—'}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {v.estado_plan === 'FINALIZADO' ?
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700"><Check size={12}/>FINALIZADO</span> :
                            v.estado_plan === 'BORRADOR' ?
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">EN CONFIGURACIÓN · {v.actividades_configuradas}</span> :
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">SIN CONFIGURAR</span>}
                          </td>
                          <td className="px-2 py-1.5 text-center"><BotonAccion tipo="consultar" onClick={() => abrirConfiguracion(v.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white">
                            <Settings2 size={14}/>Configurar</BotonAccion></td>
                        </tr>)}
                      </tbody>
                    </table>
                  </div>}
                </section>
              })}
            </div>}
        </main>
      </div>

      {modalAbierto && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-2 md:p-4">
        <div className="flex h-[94vh] max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2 text-white" style={{ backgroundColor: ESTILO_FRANJA_SUPERIOR_MODAL.fondo }}>
            <div><div className="text-xs font-bold uppercase">Configuración Plan de Mantenimiento</div>
              <div className="text-[11px] text-slate-300">{vehiculoDetalle ? `${vehiculoDetalle.placa} · ${vehiculoDetalle.marca || ''} ${vehiculoDetalle.modelo || ''}` : 'Consultando...'}</div></div>
            <button type="button" onClick={cerrarModal} disabled={guardando} className="p-1"><X size={20}/></button>
          </div>

          {cargandoDetalle || !vehiculoDetalle ? (
            <div className="flex-1 overflow-auto p-8 text-center text-xs text-gray-500">
              Consultando información...
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="mb-2 rounded-md border bg-gray-50 px-3 py-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] md:grid-cols-5">
                    <div><span className="block text-gray-400">Placa</span><strong className="text-xs">{vehiculoDetalle.placa}</strong></div>
                    <div><span className="block text-gray-400">Tipo</span><strong>{SINGULAR_TIPO[vehiculoDetalle.tipo_vehiculo_normalizado]}</strong></div>
                    <div><span className="block text-gray-400">Marca / Modelo</span><strong>{vehiculoDetalle.marca || '—'} {vehiculoDetalle.modelo || ''}</strong></div>
                    <div>
                      <span className="block text-gray-400">Último km en preoperacionales</span>
                      <strong>{vehiculoDetalle.ultimo_km != null ? `${formatoNumero(vehiculoDetalle.ultimo_km)} km` : '—'}</strong>
                      <div className="text-[9px] text-gray-400">{formatoFecha(vehiculoDetalle.fecha_ultimo_km)} · {vehiculoDetalle.origen_ultimo_km || '—'}</div>
                    </div>
                    <div>
                      <span className="block text-gray-400">Promedio de recorrido</span>
                      <strong className="text-red-600">
                        {promedios?.promedio_semanal_km != null ? `${formatoNumero(promedios.promedio_semanal_km)} km/sem` : '—'}
                        {' · '}
                        {promedios?.promedio_mensual_km != null ? `${formatoNumero(promedios.promedio_mensual_km)} km/mes` : '—'}
                      </strong>
                      {promedios?.fecha_desde && <div className="text-[9px] text-gray-400">Base: {formatoFecha(promedios.fecha_desde)} a {formatoFecha(promedios.fecha_hasta)}</div>}
                    </div>
                  </div>
                </div>

                <div className="mb-2 rounded-md border px-3 py-2">
                  <div className="mb-1.5 text-[10px] font-bold uppercase text-gray-500">Últimos mantenimientos preventivos registrados</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {[0, 1].map((i) => {
                      const m = mantenimientos[i]
                      return (
                        <div key={i} className="rounded-md border border-gray-200 bg-gray-50 p-2 text-[10px] leading-snug">
                          {!m ? <span className="text-gray-400">Sin registro preventivo.</span> : <>
                            <div className="mb-1 flex justify-between gap-2"><strong>{formatoFecha(m.fecha_registro)}</strong><strong>{m.kilometraje != null ? `${formatoNumero(m.kilometraje)} km` : '—'}</strong></div>
                            <div><span className="font-semibold text-gray-500">Actividades: </span>{m.actividad_realizada || '—'}</div>
                            <div className="mt-0.5"><span className="font-semibold text-gray-500">Repuestos: </span>{m.repuestos_utilizados || '—'}</div>
                            <div className="mt-0.5"><span className="font-semibold text-gray-500">Empresa: </span>{m.empresa || '—'}</div>
                            <div className="mt-0.5"><span className="font-semibold text-gray-500">Responsable: </span>{m.responsable || '—'}</div>
                          </>}
                        </div>
                      )
                    })}
                  </div>
                </div>


                <div className="mb-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-600">Frecuencia base del vehículo</div>
                      <div className="text-[11px] text-slate-700">
                        Cambio de aceite define los múltiplos válidos para todas las actividades.
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="rounded-md border bg-white px-2 py-1 font-bold text-slate-700">
                        Base: {frecuenciaBaseKm ? `${formatoNumero(frecuenciaBaseKm)} km` : 'Por definir'}
                      </span>
                      <span className="rounded-md border bg-white px-2 py-1 text-slate-600">
                        Ciclo referencia: {reglaFrecuencias?.limite_ciclo_referencia_km
                          ? `${formatoNumero(reglaFrecuencias.limite_ciclo_referencia_km)} km`
                          : '—'}
                      </span>
                      {frecuenciaBaseKm && reglaFrecuencias?.limite_ciclo_operativo_km && (
                        <span className="rounded-md border bg-white px-2 py-1 text-slate-600">
                          Múltiplo límite: {formatoNumero(reglaFrecuencias.limite_ciclo_operativo_km)} km
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between gap-2 rounded-md border bg-white px-3 py-2">
                  <div className="relative max-w-sm flex-1">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input value={busquedaActividad} onChange={(e) => setBusquedaActividad(e.target.value)}
                      placeholder="Buscar actividad..." className="w-full rounded-md border py-1.5 pl-8 pr-2 text-xs"/>
                  </div>
                  <BotonAccion tipo="agregar" disabled={estadoConfiguracion === 'FINALIZADO'} onClick={() => {setNuevaActividad({nombre:'',accion:'',descripcion:'',motivo_criterio:'',frecuencia_recomendada_km:''});setModalNuevaActividad(true)}}
                    className="flex items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"><Plus size={12}/>Agregar actividad</BotonAccion>
                </div>

                <div className="overflow-x-auto rounded-md border border-slate-300">
                  <table className="w-full table-fixed text-[11px]">
                    <thead className="font-bold [&_th]:border [&_th]:border-slate-300" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>
                      <tr>
                        <th className="w-[9%] px-1.5 py-1.5 text-center">Aplicar</th>
                        <th className="w-[43%] px-2 py-1.5 text-left">Actividad</th>
                        <th className="w-[25%] px-2 py-1.5 text-center">Frecuencia sugerida</th>
                        <th className="w-[23%] px-2 py-1.5 text-center">Frecuencia configurada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 [&_td]:border [&_td]:border-slate-300">
                      {filasActividades.map((fila) => {
                        if (fila.tipo === 'GRUPO') {
                          return (
                            <tr key={`grupo-${fila.clave}`}>
                              <td colSpan={4} className="border-x border-slate-300 bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                                {fila.frecuencia === 'SIN_FRECUENCIA'
                                  ? 'ACTIVIDADES SIN FRECUENCIA SUGERIDA'
                                  : `ACTIVIDADES CON FRECUENCIA DE ${formatoNumero(fila.frecuencia)} KM`}
                              </td>
                            </tr>
                          )
                        }

                        const a = fila.actividad
                        return (
                          <tr key={a.id} className={a.seleccionada ? 'bg-green-50/50' : 'hover:bg-gray-50'}>
                            <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={a.seleccionada} disabled={estadoConfiguracion === 'FINALIZADO'} onChange={() => alternarActividad(a)} className="h-3.5 w-3.5"/></td>
                            <td className="px-2 py-1.5">
                              <div className="font-semibold text-gray-800">{a.nombre}</div>
                              {a.accion && <div className="mt-0.5 text-[10px] font-medium text-slate-600">{a.accion}</div>}
                              {a.motivo_criterio && <div className="mt-0.5 text-[9px] leading-snug text-gray-500">{a.motivo_criterio}</div>}
                              {a.descripcion && <div className="mt-0.5 text-[9px] leading-tight text-gray-400">{a.descripcion}</div>}
                            </td>
                            <td className="px-2 py-1.5 text-center text-[10px] text-gray-600">
                              {!frecuenciaBaseKm ? (
                                <span className="text-gray-400">
                                  {a.es_frecuencia_base ? 'Defina la frecuencia base' : 'Disponible después de definir la base'}
                                </span>
                              ) : a.es_frecuencia_base ? (
                                <div className="font-bold text-amber-700">
                                  {formatoNumero(frecuenciaBaseKm)} km · FRECUENCIA BASE
                                </div>
                              ) : (
                                <div className="font-bold text-blue-700">
                                  {formatoNumero(sugerenciaOperativa(a))} km
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                <input type="text" inputMode="numeric"
                                  disabled={estadoConfiguracion === 'FINALIZADO' || !a.seleccionada || (a.esConfiguradaOriginal && !frecuenciasEditables[a.id])}
                                  value={valorMiles(a.frecuencia_km)}
                                  onChange={(e) => actualizarActividad(a.id,'frecuencia_km',soloDigitos(e.target.value))}
                                  className="min-w-0 flex-1 rounded-md border px-2 py-1 text-right text-[11px] font-semibold disabled:bg-gray-100 disabled:text-gray-500"
                                  placeholder="km"/>
                                {estadoConfiguracion !== 'FINALIZADO' && a.seleccionada && a.esConfiguradaOriginal && (
                                  <button type="button" onClick={() => habilitarEdicionFrecuencia(a.id)}
                                    disabled={Boolean(frecuenciasEditables[a.id])}
                                    title={frecuenciasEditables[a.id] ? 'Frecuencia habilitada para edición' : 'Editar frecuencia'}
                                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-default disabled:bg-blue-50 disabled:text-blue-600">
                                    <Pencil size={12}/>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-white px-3 py-2">
                <div className="text-[10px] text-gray-500">
                  Seleccionadas: <strong>{actividades.filter((a)=>a.seleccionada).length}</strong>
                  <span className="ml-2">Estado: <strong>{estadoConfiguracion === 'FINALIZADO' ? 'FINALIZADO' : estadoConfiguracion === 'BORRADOR' ? 'EN CONFIGURACIÓN' : 'SIN CONFIGURAR'}</strong></span>
                </div>
                <div className="flex gap-2">
                  <BotonAccion tipo="cancelar" type="button" onClick={cerrarModal} disabled={guardando} className="rounded-md border px-3 py-1.5 text-xs">Cerrar</BotonAccion>
                  {estadoConfiguracion === 'FINALIZADO' ? (
                    <BotonAccion tipo="editar" type="button" onClick={reabrirConfiguracion} disabled={guardando} className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                      {guardando ? 'Procesando...' : 'Reabrir configuración'}
                    </BotonAccion>
                  ) : (<>
                    <BotonAccion tipo="guardar" type="button" onClick={guardarConfiguracion} disabled={guardando} className="rounded-md border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60">
                      {guardando ? 'Guardando...' : 'Guardar borrador'}
                    </BotonAccion>
                    <BotonAccion tipo="guardar" type="button" onClick={finalizarConfiguracion} disabled={guardando} className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                      {guardando ? 'Procesando...' : 'Finalizar plan'}
                    </BotonAccion>
                  </>)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>}

      {modalNuevaActividad && vehiculoDetalle && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: ESTILO_FRANJA_SUPERIOR_MODAL.fondo }}>
            <div><div className="text-sm font-bold uppercase">Agregar actividad</div><div className="text-[11px] text-slate-300">{SINGULAR_TIPO[vehiculoDetalle.tipo_vehiculo_normalizado]}</div></div>
            <button onClick={()=>setModalNuevaActividad(false)}><X size={19}/></button>
          </div>
          <form onSubmit={guardarNuevaActividad} className="space-y-4 p-4">
            <div><label className="mb-1 block text-xs font-bold uppercase text-gray-600">Actividad</label>
              <input autoFocus value={nuevaActividad.nombre} onChange={(e)=>setNuevaActividad(x=>({...x,nombre:e.target.value}))} className="w-full rounded-md border px-3 py-2 text-sm"/></div>
            <div><label className="mb-1 block text-xs font-bold uppercase text-gray-600">Acción</label>
              <input value={nuevaActividad.accion} onChange={(e)=>setNuevaActividad(x=>({...x,accion:e.target.value}))} placeholder="Ej. Inspeccionar, reemplazar, diagnosticar..." className="w-full rounded-md border px-3 py-2 text-sm"/></div>
            <div><label className="mb-1 block text-xs font-bold uppercase text-gray-600">Motivo / criterio</label>
              <textarea rows={3} value={nuevaActividad.motivo_criterio} onChange={(e)=>setNuevaActividad(x=>({...x,motivo_criterio:e.target.value}))} className="w-full resize-none rounded-md border px-3 py-2 text-sm"/></div>
            <div><label className="mb-1 block text-xs font-bold uppercase text-gray-600">Descripción <span className="font-normal normal-case text-gray-400">(opcional)</span></label>
              <textarea rows={2} value={nuevaActividad.descripcion} onChange={(e)=>setNuevaActividad(x=>({...x,descripcion:e.target.value}))} className="w-full resize-none rounded-md border px-3 py-2 text-sm"/></div>
            <div><label className="mb-1 block text-xs font-bold uppercase text-gray-600">Frecuencia sugerida (km)</label>
              <input type="number" min="1" step={frecuenciaBaseKm || 1} value={nuevaActividad.frecuencia_recomendada_km} onChange={(e)=>setNuevaActividad(x=>({...x,frecuencia_recomendada_km:e.target.value}))} className="w-full rounded-md border px-3 py-2 text-sm"/></div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <BotonAccion tipo="cancelar" type="button" onClick={()=>setModalNuevaActividad(false)} className="rounded-md border px-4 py-2 text-sm">Cancelar</BotonAccion>
              <BotonAccion tipo="guardar" type="submit" disabled={guardandoNueva} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{guardandoNueva?'Guardando...':'Guardar actividad'}</BotonAccion>
            </div>
          </form>
        </div>
      </div>}
      <ModalResultado
        abierto={Boolean(error || mensaje)}
        tipo={error ? 'error' : 'exito'}
        titulo={error ? 'No fue posible completar la operación' : 'Operación realizada satisfactoriamente'}
        mensaje={error || mensaje}
        onCerrar={() => { setError(''); setMensaje(''); }}
      />

    </div>
  )
}
