'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { validarKilometraje } from '@/lib/servicios/validaciones'
import { cerrarSesion } from '@/lib/auth/logout'

// ------------------ Helpers zona Bogotá ------------------
const fmtBogota = (date, mode) => {
  const optFecha = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }
  const optHora  = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Bogota' }
  return new Intl.DateTimeFormat('en-CA', mode === 'fecha' ? optFecha : optHora).format(date) // YYYY-MM-DD / HH:mm:ss
}
const ahoraBogota = () => {
  const now = new Date()
  const fecha = fmtBogota(now, 'fecha')
  const hora  = fmtBogota(now, 'hora')
  const timestamp = `${fecha}T${hora}-05:00`
  return { fecha, hora, timestamp }
}

// ------------------ Helpers dinero (COP) ------------------
const onlyDigits = (s) => (s || '').replace(/\D+/g, '')
const toCOP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n || 0))
const parseCOP = (s) => Number(onlyDigits(String(s)) || 0)

// ------------------ Helpers tiempo de parada ------------------
// Guardar en minutos (string) para facilitar reportes (suma por SQL).
const minutosDesdeValorUnidad = (valor, unidad) => {
  const v = Number(valor || 0)
  if (!v) return 0
  if (unidad === 'h') return Math.round(v * 60)
  return Math.round(v)
}
const labelDesdeMinutos = (min) => {
  const m = Number(min || 0)
  if (!m) return '0 min'
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h > 0 && r > 0) return `${m} min (${h} h ${r} m)`
  if (h > 0) return `${m} min (${h} h)`
  return `${m} min`
}

// ------------------ Página ------------------
export default function MantenimientosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Vehículos
  const [vehiculos, setVehiculos] = useState([])
  const [placa, setPlaca] = useState('')
  const [vehiculoInfo, setVehiculoInfo] = useState({ tipo: '-', marca: '-' })

  // Kilometraje
  const [kilometraje, setKilometraje] = useState('')
  const [msgKm, setMsgKm] = useState('')
  const [forzarKm, setForzarKm] = useState(false)
  const [modalKm, setModalKm] = useState(null) // {maxKm, diferencia, fuente, campo, onConfirm}

  // Tipo / actividad
  const [tipoMant, setTipoMant] = useState('') // 'PREVENTIVO' | 'CORRECTIVO'
  const [actividad, setActividad] = useState('') // texto libre para CORRECTIVO o valor de select para PREVENTIVO
  const [actividadesPlan, setActividadesPlan] = useState([])

  // Repuestos
  const [repuestos, setRepuestos] = useState('')

  // Proveedores / Técnicos
  const [proveedores, setProveedores] = useState([])
  const [proveedorId, setProveedorId] = useState('')
  const [proveedorInfo, setProveedorInfo] = useState(null)

  const [tecnicos, setTecnicos] = useState([])
  const [tecnicoId, setTecnicoId] = useState('')
  const [tecnicoInfo, setTecnicoInfo] = useState(null)

  // Modales de alta rápida
  const [modalProveedor, setModalProveedor] = useState(null) // {empresa, nit, direccion, telefono, email}
  const [modalTecnico, setModalTecnico] = useState(null)     // {nombres, documento, telefono, email}

  // Validación en tiempo real (debounce)
  const [provNitDup, setProvNitDup] = useState(null) // {empresa, id} | null
  const provNitTimer = useRef(null)

  const [tecDocDup, setTecDocDup] = useState(null) // {nombres, id} | null
  const tecDocTimer = useRef(null)

  // Costos
  const [valorRepuestosStr, setValorRepuestosStr] = useState('') // COP formateado
  const [valorManoObraStr, setValorManoObraStr] = useState('')   // COP formateado

  // Tiempo de parada
  const [tpValor, setTpValor] = useState('') // número
  const [tpUnidad, setTpUnidad] = useState('min') // 'min' | 'h'

  const [guardando, setGuardando] = useState(false)

  // ------------------ Carga inicial ------------------
  useEffect(() => {
    const s = localStorage.getItem('currentUser')
    if (!s) { router.push('/login'); return }
    const u = JSON.parse(s)
    setUser(u)

    const cargar = async () => {
      // Vehículos
      const { data: vehs } = await supabase
        .from('vehiculos')
        .select('placa, tipo_vehiculo, marca')
        .order('placa', { ascending: true })
      if (vehs) setVehiculos(vehs)

      // Proveedores
      const { data: provs } = await supabase
        .from('proveedores')
        .select('id, empresa, nit, direccion, telefono')
        .eq('activo', true)
        .order('empresa', { ascending: true })
      if (provs) setProveedores(provs)
    }
    cargar()
  }, [router])

  // Al cambiar placa: autocompletar tipo/marca y plan preventivo
  useEffect(() => {
    const v = vehiculos.find(x => x.placa === placa)
    if (!v) {
      setVehiculoInfo({ tipo: '-', marca: '-' })
      setActividadesPlan([])
      return
    }
    setVehiculoInfo({ tipo: v.tipo_vehiculo || '-', marca: v.marca || '-' })

    const cargarPlan = async () => {
      if (!v?.tipo_vehiculo) { setActividadesPlan([]); return }
      const { data: plan } = await supabase
        .from('plan_mantenimiento')
        .select('actividad, tipo_vehiculo')
        .eq('tipo_vehiculo', v.tipo_vehiculo)
        .order('actividad', { ascending: true })
      setActividadesPlan(plan || [])
    }
    cargarPlan()
    setActividad('')
  }, [placa, vehiculos])

  // Al cambiar proveedor: info y técnicos
  useEffect(() => {
    if (!proveedorId) {
      setProveedorInfo(null)
      setTecnicos([])
      setTecnicoId('')
      setTecnicoInfo(null)
      return
    }
    const p = proveedores.find(p => String(p.id) === String(proveedorId))
    setProveedorInfo(p || null)

    const cargarTecnicos = async () => {
      const { data: tecs } = await supabase
        .from('tecnicos')
        .select('id, nombres, documento, telefono')
        .eq('proveedor_id', Number(proveedorId))
        .eq('activo', true)
        .order('nombres', { ascending: true })
      setTecnicos(tecs || [])
      setTecnicoId('')
      setTecnicoInfo(null)
    }
    cargarTecnicos()
  }, [proveedorId, proveedores])

  // Al cambiar técnico: info
  useEffect(() => {
    if (!tecnicoId) { setTecnicoInfo(null); return }
    const t = tecnicos.find(t => String(t.id) === String(tecnicoId))
    setTecnicoInfo(t || null)
  }, [tecnicoId, tecnicos])

  // Validación km
  const onKmChange = async (e) => {
    const val = e.target.value
    setKilometraje(val)
    setMsgKm('')
    setForzarKm(false)

    if (!placa || !val) return
    const r = await validarKilometraje(placa, parseInt(val, 10))
    if (r.estado === 'error') {
      setMsgKm(r.mensaje)
      toast.error(r.mensaje)
      return
    }
    if (r.estado === 'advertencia') {
      setMsgKm(r.mensaje)
      setModalKm({
        maxKm: r.maxKm,
        diferencia: r.diferencia,
        fuente: r.fuente,
        campo: r.campo,
        onConfirm: () => { setForzarKm(true); setModalKm(null) }
      })
      return
    }
    setMsgKm(r.mensaje) // ok
  }

  // Tipo mant en MAYÚSCULAS
  const onTipoMantChange = (e) => {
    const up = String(e.target.value || '').toUpperCase()
    setTipoMant(up)
    setActividad('')
  }

  // COP inputs
  const onValorRepuestosChange = (e) => {
    const num = parseCOP(e.target.value)
    setValorRepuestosStr(num ? toCOP(num) : '')
  }
  const onValorManoObraChange = (e) => {
    const num = parseCOP(e.target.value)
    setValorManoObraStr(num ? toCOP(num) : '')
  }
  const costoTotal = useMemo(() => {
    return parseCOP(valorRepuestosStr) + parseCOP(valorManoObraStr)
  }, [valorRepuestosStr, valorManoObraStr])

  // Habilitar guardar
  const puedeGuardar = useMemo(() => {
    if (!placa) return false
    const kmOk = ((msgKm && !msgKm.includes('menor')) || forzarKm) && Number(kilometraje) >= 0
    if (!kmOk) return false
    if (tipoMant !== 'PREVENTIVO' && tipoMant !== 'CORRECTIVO') return false
    if (tipoMant === 'PREVENTIVO' && !actividad) return false
    if (tipoMant === 'CORRECTIVO' && !actividad.trim()) return false
    return true
  }, [placa, msgKm, forzarKm, kilometraje, tipoMant, actividad])

  // Guardar
  const registrar = async () => {
    if (!puedeGuardar || guardando || !user) return
    setGuardando(true)
    try {
      const { fecha, timestamp } = ahoraBogota()

      // minutos normalizados para reportes
      const minutos = minutosDesdeValorUnidad(tpValor, tpUnidad)
      const tpTexto = String(minutos) // se guarda como "minutos" (texto)

      const payload = {
        timestamp_registro: timestamp,
        fecha_registro: fecha,
        placa,
        kilometraje: Number(kilometraje),
        tipo_mantenimiento: tipoMant, // PREVENTIVO | CORRECTIVO (uppercase)
        actividad_realizada: actividad.trim(),
        repuestos_utilizados: repuestos?.trim() || null,

        // Proveedor (si se eligió)
        empresa: proveedorInfo?.empresa || null,
        nit: proveedorInfo?.nit || null,
        direccion: proveedorInfo?.direccion || null,
        telefono_empresa: proveedorInfo?.telefono || null,

        // Técnico (si se eligió)
        nombres_tecnico: tecnicoInfo?.nombres || null,
        telefono_tecnico: tecnicoInfo?.telefono || null,
        documento_tecnico: tecnicoInfo?.documento || null,

        // Tiempo / costos
        tiempoparada: tpTexto || null, // <-- minutos en texto
        factura: (typeof window !== 'undefined' ? document.getElementById('factura_input')?.value?.trim() : '') || null,
        valor_repuestos: parseCOP(valorRepuestosStr) || null,
        valor_mano_obra: parseCOP(valorManoObraStr) || null,
        costo_total: costoTotal || null,

        // Responsable
        responsable: user?.nombreCompleto || null,
        documento_responsable: user?.documento || null,
        cargo: user?.rol || null,

        observaciones: (typeof window !== 'undefined' ? document.getElementById('obs_input')?.value?.trim() : '') || null
      }

      const { error } = await supabase.from('mantenimientos').insert([payload])
      if (error) {
        console.error('Supabase insert error:', error)
        toast.error('No se pudo registrar el mantenimiento.')
        setGuardando(false)
        return
      }

      toast.success('Mantenimiento registrado.')

      // Limpieza + regreso al menú (dejamos ver el toast ~1.2s)
      setPlaca(''); setVehiculoInfo({ tipo: '-', marca: '-' })
      setKilometraje(''); setMsgKm(''); setForzarKm(false); setModalKm(null)
      setTipoMant(''); setActividad(''); setActividadesPlan([])
      setRepuestos('')
      setProveedorId(''); setProveedorInfo(null); setTecnicos([]); setTecnicoId(''); setTecnicoInfo(null)
      setValorRepuestosStr(''); setValorManoObraStr('')
      setTpValor(''); setTpUnidad('min')
      if (typeof window !== 'undefined') {
        const f = document.getElementById('factura_input'); if (f) f.value = ''
        const o = document.getElementById('obs_input'); if (o) o.value = ''
      }

      setTimeout(() => {
        router.push('/instructor/practica')
      }, 1200)
    } finally {
      setGuardando(false)
    }
  }

  const handleLogout = () => cerrarSesion(router)

  // ------------------ Validación en tiempo real: NIT proveedor ------------------
  useEffect(() => {
    if (!modalProveedor) { setProvNitDup(null); return }
    const nit = (modalProveedor.nit || '').trim()
    if (provNitTimer.current) clearTimeout(provNitTimer.current)
    if (!nit) { setProvNitDup(null); return }

    provNitTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('proveedores')
        .select('id, empresa')
        .eq('nit', nit)
        .limit(1)
      setProvNitDup(data && data.length ? data[0] : null)
    }, 400)
  }, [modalProveedor?.nit])

  // ------------------ Validación en tiempo real: documento técnico (por proveedor) ------------------
  useEffect(() => {
    if (!modalTecnico || !proveedorId) { setTecDocDup(null); return }
    const doc = (modalTecnico.documento || '').trim()
    if (tecDocTimer.current) clearTimeout(tecDocTimer.current)
    if (!doc) { setTecDocDup(null); return }

    tecDocTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('tecnicos')
        .select('id, nombres')
        .eq('proveedor_id', Number(proveedorId))
        .eq('documento', doc)
        .limit(1)
      setTecDocDup(data && data.length ? data[0] : null)
    }, 400)
  }, [modalTecnico?.documento, proveedorId])

  if (!user) return <p className="text-center mt-20">Cargando...</p>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-3 md:p-6">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-3 md:p-6">

        {/* Título */}
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2 border-b pb-3 text-[var(--primary)]">
          <i className="fas fa-wrench text-[var(--primary)]"></i>
          Registro de Mantenimientos
        </h2>

        {/* Usuario */}
        <div className="bg-gray-50 p-2 md:p-3 rounded mb-6 text-xs md:text-sm border">
          Usuario: <strong>{user.nombreCompleto}</strong>
        </div>

        {/* Vehículo */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-sm md:text-lg font-semibold mb-3 px-3 py-2 bg-gray-900 text-white rounded">
            <i className="fas fa-car mr-2"></i> Vehículo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3">
            <div>
              <label className="block mb-1 font-semibold text-sm">Placa</label>
              <select
                className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
                value={placa}
                onChange={(e)=>setPlaca(e.target.value)}
              >
                <option value="">-- Selecciona la Placa --</option>
                {vehiculos.map(v => <option key={v.placa} value={v.placa}>{v.placa}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Kilometraje</label>
              <input
                type="number"
                min="0"
                className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
                value={kilometraje}
                onChange={onKmChange}
              />
              {msgKm && (
                <small className={`block mt-1 text-xs ${
                  msgKm.includes('menor') ? 'text-red-600' :
                  msgKm.includes('supera') ? 'text-orange-600' : 'text-green-600'
                }`}>{msgKm}</small>
              )}
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-2 md:p-3 rounded text-xs md:text-sm">
            <p><strong>Tipo de Vehículo:</strong> {vehiculoInfo.tipo}</p>
            <p><strong>Marca:</strong> {vehiculoInfo.marca}</p>
          </div>
        </div>

        {/* Tipo / Actividad */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-sm md:text-lg font-semibold mb-3 px-3 py-2 bg-gray-900 text-white rounded">
            <i className="fas fa-tools mr-2"></i> Tipo y Actividad
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block mb-1 font-semibold text-sm">Tipo de Mantenimiento</label>
              <select
                className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
                value={tipoMant}
                onChange={onTipoMantChange}
              >
                <option value="">-- Selecciona Tipo --</option>
                <option value="PREVENTIVO">PREVENTIVO</option>
                <option value="CORRECTIVO">CORRECTIVO</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm">Actividad Realizada</label>
              {tipoMant === 'PREVENTIVO' ? (
                <select
                  className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
                  value={actividad}
                  onChange={(e)=>setActividad(e.target.value)}
                  disabled={!placa || !vehiculoInfo.tipo || (actividadesPlan.length === 0)}
                >
                  <option value="">-- Selecciona actividad del plan --</option>
                  {actividadesPlan.map((a, idx)=>(
                    <option key={idx} value={a.actividad}>{a.actividad}</option>
                  ))}
                </select>
              ) : (
                <textarea
                  className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
                  rows="2"
                  value={actividad}
                  onChange={(e)=>setActividad(e.target.value)}
                  placeholder="Describe la actividad realizada"
                />
              )}
            </div>
          </div>

          <div className="mt-3">
            <label className="block mb-1 font-semibold text-sm">Repuestos Utilizados</label>
            <textarea
              className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
              rows="2"
              value={repuestos}
              onChange={(e)=>setRepuestos(e.target.value)}
            />
          </div>
        </div>

        {/* Proveedor / Técnico */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-sm md:text-lg font-semibold mb-3 px-3 py-2 bg-gray-900 text-white rounded">
            <i className="fas fa-building mr-2"></i> Proveedor y Técnico
          </h3>

          {/* Proveedor */}
          <div className="mb-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block mb-1 font-semibold text-sm">Proveedor (Empresa)</label>
                <select
                  className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
                  value={proveedorId}
                  onChange={(e)=>setProveedorId(e.target.value)}
                >
                  <option value="">-- Selecciona proveedor --</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.empresa}</option>
                  ))}
                </select>
              </div>
              <button
                className="px-3 py-2 bg-[var(--primary)] text-white rounded text-sm"
                onClick={()=> setModalProveedor({ empresa:'', nit:'', direccion:'', telefono:'', email:'' })}
              >
                + Nuevo proveedor
              </button>
            </div>

            {proveedorInfo && (
              <div className="mt-2 bg-gray-50 border rounded p-2 text-xs md:text-sm">
                <p><b>Empresa:</b> {proveedorInfo.empresa}</p>
                <p><b>NIT:</b> {proveedorInfo.nit || '-'}</p>
                <p><b>Dirección:</b> {proveedorInfo.direccion || '-'}</p>
                <p><b>Teléfono:</b> {proveedorInfo.telefono || '-'}</p>
              </div>
            )}
          </div>

          {/* Técnico */}
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block mb-1 font-semibold text-sm">Técnico</label>
                <select
                  className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
                  value={tecnicoId}
                  onChange={(e)=>setTecnicoId(e.target.value)}
                  disabled={!proveedorId}
                >
                  <option value="">{proveedorId ? '-- Selecciona técnico --' : 'Selecciona primero un proveedor'}</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombres}</option>
                  ))}
                </select>
              </div>
              <button
                className={`px-3 py-2 ${proveedorId ? 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]' : 'bg-gray-400 cursor-not-allowed'} text-white rounded text-sm`}
                disabled={!proveedorId}
                onClick={()=> setModalTecnico({ nombres:'', documento:'', telefono:'', email:'' })}
              >
                + Nuevo técnico
              </button>
            </div>

            {tecnicoInfo && (
              <div className="mt-2 bg-gray-50 border rounded p-2 text-xs md:text-sm">
                <p><b>Nombre:</b> {tecnicoInfo.nombres}</p>
                <p><b>Documento:</b> {tecnicoInfo.documento || '-'}</p>
                <p><b>Teléfono:</b> {tecnicoInfo.telefono || '-'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Costos / Tiempo */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-sm md:text-lg font-semibold mb-3 px-3 py-2 bg-gray-900 text-white rounded">
            <i className="fas fa-dollar-sign mr-2"></i> Costos y Tiempo
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {/* Tiempo de parada */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block mb-1 font-semibold text-sm">Tiempo de Parada</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
                  placeholder="Valor"
                  value={tpValor}
                  onChange={(e)=>setTpValor(e.target.value)}
                />
              </div>
              <div className="w-28">
                <label className="block mb-1 font-semibold text-sm invisible md:visible">Unidad</label>
                <select
                  className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
                  value={tpUnidad}
                  onChange={(e)=>setTpUnidad(e.target.value)}
                >
                  <option value="min">min</option>
                  <option value="h">h</option>
                </select>
              </div>
            </div>

            {/* Factura (opcional) */}
            <div>
              <label className="block mb-1 font-semibold text-sm">Número de Factura (opcional)</label>
              <input
                id="factura_input"
                type="text"
                className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
              />
            </div>

            {/* Repuestos */}
            <div>
              <label className="block mb-1 font-semibold text-sm">Valor Repuestos</label>
              <input
                inputMode="numeric"
                className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
                value={valorRepuestosStr}
                onChange={onValorRepuestosChange}
                placeholder="$0"
              />
            </div>

            {/* Mano de obra */}
            <div>
              <label className="block mb-1 font-semibold text-sm">Valor Mano de Obra</label>
              <input
                inputMode="numeric"
                className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
                value={valorManoObraStr}
                onChange={onValorManoObraChange}
                placeholder="$0"
              />
            </div>
          </div>

          <div className="font-semibold text-sm md:text-base mt-2">
            Costo Total: <span className="text-[var(--primary-dark)]">{toCOP(costoTotal)}</span>
          </div>
          {!!tpValor && (
            <div className="text-xs text-gray-600 mt-1">
              Se guardará como: <b>{labelDesdeMinutos(minutosDesdeValorUnidad(tpValor, tpUnidad))}</b>
            </div>
          )}
        </div>

        {/* Responsable */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-sm md:text-lg font-semibold mb-3 px-3 py-2 bg-gray-900 text-white rounded">
            <i className="fas fa-user-check mr-2"></i> Responsable
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <input type="text" readOnly className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" value={user.nombreCompleto || ''} />
            <input type="text" readOnly className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" value={user.documento || ''} />
            <input type="text" readOnly className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" value={user.rol || ''} />
          </div>
          <div className="mt-3">
            <label className="block mb-1 font-semibold text-sm">Observaciones</label>
            <textarea
              id="obs_input"
              className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base"
              rows="3"
            />
          </div>
        </div>

        {/* Botones finales */}
        <div className="mt-8 space-y-4">
          <div className="flex justify-center">
            <button
              onClick={registrar}
              disabled={!puedeGuardar || guardando}
              className={`bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-2 md:py-3 px-6 rounded-lg shadow-md text-sm md:text-base flex items-center gap-2 ${
                !puedeGuardar || guardando ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <i className="fas fa-save"></i> {guardando ? 'Guardando...' : 'Registrar Mantenimiento'}
            </button>
          </div>

          <div className="flex justify-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/instructor/practica')}
              className="bg-gray-600 hover:bg-gray-800 text-white py-2 md:py-3 px-4 rounded-lg shadow-md text-sm md:text-base flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i> Regresar
            </button>
            <button
              onClick={handleLogout}
              className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 md:py-3 px-4 rounded-lg shadow-md text-sm md:text-base flex items-center gap-2"
            >
              <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Modal: advertencia kilometraje */}
      {modalKm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-3 text-red-600">Advertencia de Kilometraje</h3>
            <p className="text-sm mb-2">El valor ingresado supera en más de 300 km el último registrado.</p>
            <p className="text-sm mb-1"><b>Último registro:</b> {modalKm.maxKm} km</p>
            <p className="text-sm mb-1"><b>Fuente:</b> {modalKm.fuente} ({modalKm.campo})</p>
            <p className="text-sm mb-4"><b>Diferencia:</b> {modalKm.diferencia} km</p>
            <div className="flex justify-end gap-3">
              <button className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded" onClick={()=> setModalKm(null)}>Cancelar</button>
              <button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded" onClick={()=> modalKm.onConfirm && modalKm.onConfirm()}>Confirmar y Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo proveedor (con mayúsculas y validación NIT en vivo) */}
      {modalProveedor && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-3">Nuevo proveedor</h3>

            <div className="space-y-3">
              <input
                className="w-full border p-2 rounded text-sm"
                placeholder="Empresa *"
                autoFocus
                value={modalProveedor.empresa}
                onChange={(e)=> setModalProveedor({ ...modalProveedor, empresa: e.target.value.toUpperCase() })}
              />
              <input
                className="w-full border p-2 rounded text-sm"
                placeholder="NIT"
                value={modalProveedor.nit}
                onChange={(e)=> setModalProveedor({ ...modalProveedor, nit: e.target.value })}
              />
              {!!provNitDup && (
                <p className="text-xs text-red-600 -mt-2">
                  NIT ya registrado para la empresa <b>{provNitDup.empresa}</b>. Selecciónalo o usa otro NIT.
                </p>
              )}
              <input
                className="w-full border p-2 rounded text-sm"
                placeholder="Dirección"
                value={modalProveedor.direccion}
                onChange={(e)=> setModalProveedor({ ...modalProveedor, direccion: e.target.value.toUpperCase() })}
              />
              <input
                className="w-full border p-2 rounded text-sm"
                placeholder="Teléfono"
                value={modalProveedor.telefono}
                onChange={(e)=> setModalProveedor({ ...modalProveedor, telefono: e.target.value })}
              />
              <input
                className="w-full border p-2 rounded text-sm"
                placeholder="Email (opcional)"
                value={modalProveedor.email}
                onChange={(e)=> setModalProveedor({ ...modalProveedor, email: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button className="px-3 py-2 bg-gray-500 hover:bg-gray-700 text-white rounded" onClick={()=> setModalProveedor(null)}>Cancelar</button>
              <button
                className={`px-3 py-2 text-white rounded ${provNitDup ? 'bg-gray-400 cursor-not-allowed' : 'bg-[var(--primary)]'}`}
                disabled={!!provNitDup}
                onClick={async ()=>{
                  const empresaNombre = (modalProveedor.empresa || '').trim()
                  if (!empresaNombre) { toast.error('La empresa es obligatoria'); return }

                  // Chequeo rápido de empresa
                  const { data: dupEmpresa } = await supabase
                    .from('proveedores')
                    .select('id, empresa, nit, direccion, telefono')
                    .eq('empresa', empresaNombre)
                    .limit(1)

                  if (dupEmpresa && dupEmpresa.length > 0) {
                    toast.info('La empresa ya existía. La he seleccionado.')
                    setProveedores(prev => {
                      const existe = prev.some(p => p.id === dupEmpresa[0].id)
                      return existe ? prev : [...prev, dupEmpresa[0]].sort((a,b)=> a.empresa.localeCompare(b.empresa))
                    })
                    setProveedorId(String(dupEmpresa[0].id))
                    setModalProveedor(null)
                    return
                  }

                  // Crear
                  const { data, error } = await supabase
                    .from('proveedores')
                    .insert([{
                      empresa: empresaNombre,
                      nit: modalProveedor.nit?.trim() || null,
                      direccion: modalProveedor.direccion?.trim() || null,
                      telefono: modalProveedor.telefono?.trim() || null,
                      email: modalProveedor.email?.trim() || null,
                      activo: true
                    }])
                    .select('id, empresa, nit, direccion, telefono')
                    .single()

                  if (error) {
                    toast.error('No se pudo crear el proveedor.')
                    return
                  }

                  toast.success('Proveedor creado.')
                  setProveedores(prev => {
                    const lista = [...prev, data].sort((a,b)=> a.empresa.localeCompare(b.empresa))
                    return lista
                  })
                  setProveedorId(String(data.id))
                  setModalProveedor(null)
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo técnico (mayúsculas y documento en vivo) */}
      {modalTecnico && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-3">Nuevo técnico</h3>

            <div className="space-y-3">
              <input
                className="w-full border p-2 rounded text-sm"
                placeholder="Nombres y Apellidos *"
                autoFocus
                value={modalTecnico.nombres}
                onChange={(e)=> setModalTecnico({ ...modalTecnico, nombres: e.target.value.toUpperCase() })}
              />
              <input
                className="w-full border p-2 rounded text-sm"
                placeholder="Documento *"
                value={modalTecnico.documento}
                onChange={(e)=> setModalTecnico({ ...modalTecnico, documento: e.target.value })}
              />
              {!!tecDocDup && (
                <p className="text-xs text-red-600 -mt-2">
                  Documento ya registrado para este proveedor (Técnico: <b>{tecDocDup.nombres}</b>). Cambia el documento.
                </p>
              )}
              <input
                className="w-full border p-2 rounded text-sm"
                placeholder="Teléfono"
                value={modalTecnico.telefono}
                onChange={(e)=> setModalTecnico({ ...modalTecnico, telefono: e.target.value })}
              />
              <input
                className="w-full border p-2 rounded text-sm"
                placeholder="Email (opcional)"
                value={modalTecnico.email}
                onChange={(e)=> setModalTecnico({ ...modalTecnico, email: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button className="px-3 py-2 bg-gray-500 hover:bg-gray-700 text-white rounded" onClick={()=> setModalTecnico(null)}>Cancelar</button>
              <button
                className={`px-3 py-2 text-white rounded ${(!proveedorId || tecDocDup) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[var(--primary)]'}`}
                disabled={!proveedorId || !!tecDocDup}
                onClick={async ()=>{
                  if (!proveedorId) return
                  const nombres = (modalTecnico.nombres || '').trim()
                  const documento = (modalTecnico.documento || '').trim()
                  const telefono = (modalTecnico.telefono || '').trim()
                  const email    = (modalTecnico.email || '').trim() || null

                  if (!nombres)  { toast.error('El nombre del técnico es obligatorio'); return }
                  if (!documento){ toast.error('El documento del técnico es obligatorio'); return }
                  if (tecDocDup) { toast.error('Ese documento ya existe para este proveedor'); return }

                  const { data, error } = await supabase
                    .from('tecnicos')
                    .insert([{
                      proveedor_id: Number(proveedorId),
                      nombres,
                      documento,
                      telefono,
                      email,
                      activo: true
                    }])
                    .select('id, nombres, documento, telefono')
                    .single()

                  if (error) {
                    toast.error('No se pudo crear el técnico.')
                    return
                  }

                  toast.success('Técnico creado.')
                  setTecnicos(prev => {
                    const lista = [...prev, data].sort((a,b)=> a.nombres.localeCompare(b.nombres))
                    return lista
                  })
                  setTecnicoId(String(data.id))
                  setModalTecnico(null)
                }}
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
