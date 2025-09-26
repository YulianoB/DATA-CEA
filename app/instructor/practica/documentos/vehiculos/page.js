'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster, toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { cerrarSesion } from '@/lib/auth/logout'

// ---------- Helpers zona Bogotá ----------
const fmtBogota = (date, mode) => {
  const optFecha = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }
  const optHora  = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Bogota' }
  return new Intl.DateTimeFormat('en-CA', mode === 'fecha' ? optFecha : optHora).format(date) // YYYY-MM-DD / HH:mm:ss
}
const hoyBogota = () => fmtBogota(new Date(), 'fecha')
const ahoraBogotaISO = () => {
  const f = fmtBogota(new Date(), 'fecha')
  const h = fmtBogota(new Date(), 'hora')
  return `${f}T${h}-05:00`
}

export default function DocumentosVehiculosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Catálogos
  const [vehiculos, setVehiculos] = useState([])

  // Form
  const [placa, setPlaca] = useState('')
  const [vehiculoInfo, setVehiculoInfo] = useState({ tipo_vehiculo: '-', marca: '-', estado: '-' })
  const [documento, setDocumento] = useState('') // SOAT | RTM
  const [fechaVigencia, setFechaVigencia] = useState('') // YYYY-MM-DD

  // Validaciones UI
  const [touched, setTouched] = useState({ placa: false, documento: false, fecha: false })

  // Conflicto de futuro / confirmación de overwrite
  const [modalConfirma, setModalConfirma] = useState(null)   // { registro, nuevaFecha }
  const [needsOverwrite, setNeedsOverwrite] = useState(false) // hay registro futuro encontrado
  const [overwriteTarget, setOverwriteTarget] = useState(null) // { id, ... }
  const [overwriteConfirmed, setOverwriteConfirmed] = useState(false) // el usuario confirmó en el modal

  // ---------------- Carga usuario + vehículos activos ----------------
  useEffect(() => {
    const stored = localStorage.getItem('currentUser')
    if (!stored) { router.push('/login'); return }
    const u = JSON.parse(stored)
    setUser(u)

    const cargarVehiculos = async () => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('placa, tipo_vehiculo, marca, estado')
        .eq('estado', 'Activo')
        .order('placa', { ascending: true })
      if (error) {
        toast.error('No se pudieron cargar los vehículos.')
        return
      }
      setVehiculos(data || [])
    }
    cargarVehiculos()
  }, [router])

  // Autocompletar info vehículo
  useEffect(() => {
    if (!placa) {
      setVehiculoInfo({ tipo_vehiculo: '-', marca: '-', estado: '-' })
      return
    }
    const v = vehiculos.find(x => x.placa === placa)
    setVehiculoInfo({
      tipo_vehiculo: v?.tipo_vehiculo || '-',
      marca: v?.marca || '-',
      estado: v?.estado || '-'
    })
  }, [placa, vehiculos])

  // Reset de confirmación/overwrite si cambian placa o documento
  useEffect(() => {
    setNeedsOverwrite(false)
    setOverwriteTarget(null)
    setOverwriteConfirmed(false)
    setModalConfirma(null)
  }, [placa, documento])

  // Errores básicos
  const errores = useMemo(() => {
    const e = {}
    if (!placa) e.placa = 'Seleccione una placa.'
    if (!documento) e.documento = 'Seleccione el tipo de documento.'
    if (!fechaVigencia) e.fecha = 'Seleccione la fecha de vigencia.'
    return e
  }, [placa, documento, fechaVigencia])

  // Guardar habilitado solo si:
  // - No hay errores, y
  // - (no se requiere overwrite) o (sí se requiere y está confirmado)
  const puedeGuardar = useMemo(() => {
    if (Object.keys(errores).length > 0) return false
    if (needsOverwrite && !overwriteConfirmed) return false
    return true
  }, [errores, needsOverwrite, overwriteConfirmed])

  // Al seleccionar fecha: validar conflicto de futuro
  const onFechaChange = async (val) => {
    setFechaVigencia(val)
    setTouched(t => ({ ...t, fecha: true }))

    // reset overwrite state
    setNeedsOverwrite(false)
    setOverwriteTarget(null)
    setOverwriteConfirmed(false)
    setModalConfirma(null)

    // Se valida solo si hay placa y documento
    if (!placa || !documento || !val) return

    const hoy = hoyBogota()
    const esFutura = val > hoy
    if (!esFutura) return // si es hoy/pasada se permite insert sin modal

    // ¿Ya existe registro futuro de esta placa+doc?
    const { data, error } = await supabase
      .from('vencimientos_vehiculos')
      .select('id, placa, tipo_vehiculo, documento, fecha_vigencia, fecha_actualizacion, estado, nombre_quien_actualiza')
      .eq('placa', placa)
      .eq('documento', documento)
      .gt('fecha_vigencia', hoy) // futuro
      .order('fecha_vigencia', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error verificando registro futuro:', error)
      return
    }

    if (data && data.length > 0) {
      setNeedsOverwrite(true)
      setOverwriteTarget(data[0])
      setModalConfirma({ registro: data[0], nuevaFecha: val })
    }
  }

  // Guardar (insert/update)
  const onGuardar = async () => {
    setTouched({ placa: true, documento: true, fecha: true })
    if (!puedeGuardar) {
      toast.error('Hay campos obligatorios sin diligenciar o debes confirmar la sobrescritura.')
      return
    }

    const payload = {
      placa,
      tipo_vehiculo: vehiculoInfo.tipo_vehiculo || null,
      documento, // 'SOAT' | 'RTM'
      fecha_vigencia: fechaVigencia,
      fecha_actualizacion: hoyBogota(),
      estado: vehiculoInfo.estado || null,
      nombre_quien_actualiza: user?.nombreCompleto || null
    }

    try {
      if (needsOverwrite && overwriteConfirmed && overwriteTarget?.id) {
        // UPDATE al registro futuro detectado
        const { error } = await supabase
          .from('vencimientos_vehiculos')
          .update(payload)
          .eq('id', overwriteTarget.id)
        if (error) throw error
      } else {
        // INSERT normal
        const { error } = await supabase
          .from('vencimientos_vehiculos')
          .insert([payload])
        if (error) throw error
      }

      toast.success('Documento actualizado correctamente.')

      // Limpieza + regreso
      setPlaca('')
      setVehiculoInfo({ tipo_vehiculo: '-', marca: '-', estado: '-' })
      setDocumento('')
      setFechaVigencia('')
      setTouched({ placa: false, documento: false, fecha: false })
      setNeedsOverwrite(false)
      setOverwriteTarget(null)
      setOverwriteConfirmed(false)
      setModalConfirma(null)

      setTimeout(() => router.push('/instructor/practica'), 800)
    } catch (e) {
      console.error('Error guardando vencimiento:', e)
      toast.error('No se pudo guardar la actualización.')
    }
  }

  const handleLogout = () => cerrarSesion(router)

  if (!user) return <p className="text-center mt-20">Cargando...</p>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
        {/* Título */}
        <h2 className="text-2xl font-bold mb-6 text-center text-[var(--primary)] flex items-center justify-center gap-2">
          <i className="fas fa-car"></i>
          Actualizar Documentos <br className="sm:hidden" /> Vehículos
        </h2>

        {/* Usuario */}
        <p className="bg-blue-50 border border-blue-200 text-[var(--primary-dark)] p-2 rounded-md mb-6 text-center text-sm">
          Usuario: <strong>{user.nombreCompleto}</strong> ({user.rol})
        </p>

        {/* Formulario */}
        <div className="space-y-5">

          {/* Placa */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-black text-white px-3 py-1 text-sm font-semibold flex items-center gap-2">
              <i className="fas fa-id-card-alt"></i> Placa del Vehículo
            </div>
            <div className="p-3">
              <select
                className="w-full border p-2 rounded text-sm"
                value={placa}
                onChange={(e)=>{ setPlaca(e.target.value); setTouched(t=>({...t, placa:true})) }}
              >
                <option value="">-- Selecciona una placa --</option>
                {vehiculos.map(v=>(
                  <option key={v.placa} value={v.placa}>{v.placa}</option>
                ))}
              </select>
              {touched.placa && !placa && <small className="text-red-600 text-xs">Seleccione una placa.</small>}
            </div>
          </div>

          {/* Info vehículo */}
          <div className="bg-gray-50 border rounded p-3 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
            <p><strong>Tipo:</strong> {vehiculoInfo.tipo_vehiculo}</p>
            <p><strong>Marca:</strong> {vehiculoInfo.marca}</p>
            <p><strong>Estado:</strong> {vehiculoInfo.estado}</p>
          </div>

          {/* Documento */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-black text-white px-3 py-1 text-sm font-semibold flex items-center gap-2">
              <i className="fas fa-file-alt"></i> Tipo de Documento
            </div>
            <div className="p-3">
              <select
                className="w-full border p-2 rounded text-sm"
                value={documento}
                onChange={(e)=>{ setDocumento(e.target.value.toUpperCase()); setTouched(t=>({...t, documento:true})) }}
              >
                <option value="">-- Selecciona el documento --</option>
                <option value="SOAT">SOAT</option>
                <option value="RTM">RTM</option>
              </select>
              {touched.documento && !documento && <small className="text-red-600 text-xs">Seleccione el tipo de documento.</small>}
            </div>
          </div>

          {/* Fecha de Vigencia */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-black text-white px-3 py-1 text-sm font-semibold flex items-center gap-2">
              <i className="fas fa-calendar-day"></i> Fecha de Vigencia
            </div>
            <div className="p-3">
              <input
                type="date"
                className="w-full border p-2 rounded text-sm"
                value={fechaVigencia}
                onChange={(e)=> onFechaChange(e.target.value)}
              />
              {touched.fecha && !fechaVigencia && <small className="text-red-600 text-xs">Seleccione la fecha de vigencia.</small>}
            </div>
          </div>

          {/* Actualizado por */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-black text-white px-3 py-1 text-sm font-semibold flex items-center gap-2">
              <i className="fas fa-user-check"></i> Actualizado por
            </div>
            <div className="p-3">
              <input
                type="text"
                className="w-full border p-2 rounded text-sm bg-gray-100"
                readOnly
                value={user?.nombreCompleto || ''}
              />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="mt-8 space-y-4">
          <div className="flex justify-center">
            <button
              onClick={onGuardar}
              className={`bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-2 px-6 rounded-lg shadow-md flex items-center gap-2 text-sm ${!puedeGuardar ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={!puedeGuardar}
            >
              <i className="fas fa-save"></i> Guardar Actualización
            </button>
          </div>

          <div className="flex justify-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/instructor/practica/documentos')}
              className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 rounded-lg shadow-md flex items-center gap-2 text-sm"
            >
              <i className="fas fa-arrow-left"></i> Regresar
            </button>
            <button
              onClick={()=> cerrarSesion(router)}
              className="bg-[var(--danger)] hover:bg-[var(--danger-dark)] text-white py-2 px-4 rounded-lg shadow-md flex items-center gap-2 text-sm"
            >
              <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Modal: existe un registro futuro → requiere confirmación para habilitar guardar (overwrite) */}
      {modalConfirma && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-3">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-3 text-red-600">Registro futuro detectado</h3>
            <p className="text-sm mb-2">
              Ya existe un registro <b>futuro</b> para esta placa y documento. Si continúas, se <b>sobrescribirá</b> con la nueva fecha.
            </p>
            <div className="text-xs bg-gray-50 border rounded p-3 mb-3">
              <p><b>Placa:</b> {modalConfirma.registro.placa}</p>
              <p><b>Documento:</b> {modalConfirma.registro.documento}</p>
              <p><b>Fecha de vigencia (actual):</b> {modalConfirma.registro.fecha_vigencia || '-'}</p>
              <p><b>Fecha actualización:</b> {modalConfirma.registro.fecha_actualizacion || '-'}</p>
              <p><b>Tipo vehículo:</b> {modalConfirma.registro.tipo_vehiculo || '-'}</p>
              <p><b>Estado:</b> {modalConfirma.registro.estado || '-'}</p>
              <p><b>Actualizado por:</b> {modalConfirma.registro.nombre_quien_actualiza || '-'}</p>
            </div>
            <p className="text-sm mb-4">
              Nueva fecha propuesta: <b>{modalConfirma.nuevaFecha}</b>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setModalConfirma(null); /* no confirmamos: guardar seguirá deshabilitado */ }}
                className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setOverwriteConfirmed(true)
                  setModalConfirma(null)
                  toast.info('Presione Guardar para registrar actualización (se sobrescribirá el registro existente).')
                }}
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
