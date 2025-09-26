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

export default function DocumentosInstructorPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Catálogo instructores activos de práctica/teoría
  const [instructores, setInstructores] = useState([])
  const [instId, setInstId] = useState('')
  const [instInfo, setInstInfo] = useState({ nombre_completo: '-', documento: '-', rol: '-' })

  // Form
  const [categoria, setCategoria] = useState('')
  const [tipoLicencia, setTipoLicencia] = useState('') // "Conducción" | "Instructor"
  const [vigencia, setVigencia] = useState('') // YYYY-MM-DD

  // Validación UI
  const [touched, setTouched] = useState({ inst: false, cat: false, tipo: false, vig: false })

  // Overwrite (conflicto futuro)
  const [needsOverwrite, setNeedsOverwrite] = useState(false)
  const [overwriteTarget, setOverwriteTarget] = useState(null) // { id, ... }
  const [overwriteConfirmed, setOverwriteConfirmed] = useState(false)
  const [modalConfirma, setModalConfirma] = useState(null) // { registro, nuevaFecha }

  // --------- Cargar sesión + instructores activos ----------
  useEffect(() => {
    const s = localStorage.getItem('currentUser')
    if (!s) { router.push('/login'); return }
    const u = JSON.parse(s)
    setUser(u)

    const cargar = async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, documento, rol, estado')
        .in('rol', ['INSTRUCTOR PRÁCTICA', 'INSTRUCTOR TEORÍA'])
        .eq('estado', 'ACTIVO')
        .order('nombre_completo',{ ascending: true })
      if (error) {
        toast.error('No se pudieron cargar los instructores.')
        return
      }
      setInstructores(data || [])
    }
    cargar()
  }, [router])

  // Al cambiar instructor, autocompletar info
  useEffect(() => {
    if (!instId) {
      setInstInfo({ nombre_completo: '-', documento: '-', rol: '-' })
      return
    }
    const i = instructores.find(x => String(x.id) === String(instId))
    setInstInfo({
      nombre_completo: i?.nombre_completo || '-',
      documento: i?.documento || '-',
      rol: i?.rol || '-'
    })
  }, [instId, instructores])

  // Reset overwrite si cambia instructor/categoría/tipo
  useEffect(() => {
    setNeedsOverwrite(false)
    setOverwriteTarget(null)
    setOverwriteConfirmed(false)
    setModalConfirma(null)
  }, [instId, categoria, tipoLicencia])

  // Errores
  const errores = useMemo(() => {
    const e = {}
    if (!instId) e.inst = 'Seleccione un instructor.'
    if (!categoria) e.cat = 'Seleccione una categoría.'
    if (!tipoLicencia) e.tipo = 'Seleccione el tipo de licencia.'
    if (!vigencia) e.vig = 'Seleccione la fecha de vigencia.'
    return e
  }, [instId, categoria, tipoLicencia, vigencia])

  // Habilitar Guardar
  const puedeGuardar = useMemo(() => {
    if (Object.keys(errores).length > 0) return false
    if (needsOverwrite && !overwriteConfirmed) return false
    return true
  }, [errores, needsOverwrite, overwriteConfirmed])

  // Al cambiar vigencia: validar conflicto futuro para documento+categoria+tipo
  const onVigenciaChange = async (val) => {
    setVigencia(val)
    setTouched(t => ({ ...t, vig: true }))

    // reset overwrite
    setNeedsOverwrite(false)
    setOverwriteTarget(null)
    setOverwriteConfirmed(false)
    setModalConfirma(null)

    if (!instId || !categoria || !tipoLicencia || !val) return

    const hoy = hoyBogota()
    const esFutura = val > hoy
    if (!esFutura) return // no requiere modal (insert ok)

    // obtener documento del instructor
    const doc = instructores.find(x => String(x.id) === String(instId))?.documento
    if (!doc) return

    // buscar registro futuro ya existente
    const { data, error } = await supabase
      .from('licencias_personal')
      .select('id, nombre_completo, documento, rol, categoria, tipo_licencia, vigencia, fecha_actualizacion, nombre_quien_actualiza')
      .eq('documento', doc)
      .eq('categoria', categoria)
      .eq('tipo_licencia', tipoLicencia)
      .gt('vigencia', hoy) // futuro
      .order('vigencia', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error verificando licencia futura:', error)
      return
    }

    if (data && data.length > 0) {
      setNeedsOverwrite(true)
      setOverwriteTarget(data[0])
      setModalConfirma({ registro: data[0], nuevaFecha: val })
    }
  }

  // Guardar
  const onGuardar = async () => {
    setTouched({ inst: true, cat: true, tipo: true, vig: true })
    if (!puedeGuardar) {
      toast.error('Complete los campos obligatorios o confirme la sobrescritura.')
      return
    }

    const inst = instructores.find(x => String(x.id) === String(instId))
    if (!inst) {
      toast.error('Instructor inválido.')
      return
    }

    const payload = {
      nombre_completo: inst.nombre_completo,
      documento: inst.documento,
      rol: inst.rol,
      categoria,
      tipo_licencia: tipoLicencia,
      vigencia,
      fecha_actualizacion: hoyBogota(),
      nombre_quien_actualiza: user?.nombreCompleto || null
    }

    try {
      if (needsOverwrite && overwriteConfirmed && overwriteTarget?.id) {
        const { error } = await supabase
          .from('licencias_personal')
          .update(payload)
          .eq('id', overwriteTarget.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('licencias_personal')
          .insert([payload])
        if (error) throw error
      }

      toast.success('Licencia actualizada correctamente.')

      // limpiar + regresar
      setInstId('')
      setInstInfo({ nombre_completo: '-', documento: '-', rol: '-' })
      setCategoria('')
      setTipoLicencia('')
      setVigencia('')
      setTouched({ inst: false, cat: false, tipo: false, vig: false })
      setNeedsOverwrite(false)
      setOverwriteTarget(null)
      setOverwriteConfirmed(false)
      setModalConfirma(null)

      setTimeout(() => router.push('/instructor/practica'), 800)
    } catch (e) {
      console.error('Error guardando licencia:', e)
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
          <i className="fas fa-id-card-alt"></i>
          Actualizar Documentos <br className="sm:hidden" /> Instructores
        </h2>

        {/* Usuario */}
        <p className="bg-blue-50 border border-blue-200 text-[var(--primary-dark)] p-2 rounded-md mb-6 text-center text-sm">
          Usuario: <strong>{user.nombreCompleto}</strong> ({user.rol})
        </p>

        {/* Formulario */}
        <div className="space-y-5">

          {/* Instructor */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-black text-white px-3 py-1 text-sm font-semibold flex items-center gap-2">
              <i className="fas fa-user"></i> Nombre del Instructor
            </div>
            <div className="p-3">
              <select
                className="w-full border p-2 rounded text-sm"
                value={instId}
                onChange={(e)=>{ setInstId(e.target.value); setTouched(t=>({...t, inst:true})) }}
              >
                <option value="">-- Selecciona un instructor --</option>
                {instructores.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.nombre_completo} ({String(i.rol || '').toUpperCase()})
                  </option>
                ))}
              </select>
              {touched.inst && !instId && <small className="text-red-600 text-xs">Seleccione un instructor.</small>}
            </div>
          </div>

          {/* Info Instructor */}
          <div className="bg-gray-50 border rounded p-3 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
            <p><strong>Documento:</strong> {instInfo.documento}</p>
            <p><strong>Rol:</strong> {instInfo.rol}</p>
          </div>

          {/* Categoría */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-black text-white px-3 py-1 text-sm font-semibold flex items-center gap-2">
              <i className="fas fa-layer-group"></i> Categoría
            </div>
            <div className="p-3">
              <select
                className="w-full border p-2 rounded text-sm"
                value={categoria}
                onChange={(e)=>{ setCategoria(e.target.value); setTouched(t=>({...t, cat:true})) }}
              >
                <option value="">Seleccionar categoría</option>
                <option value="A2">A2</option>
                <option value="B1 - C1">B1 - C1</option>
                <option value="B2 - C2">B2 - C2</option>
                <option value="B3 - C3">B3 - C3</option>
              </select>
              {touched.cat && !categoria && <small className="text-red-600 text-xs">Seleccione la categoría.</small>}
            </div>
          </div>

          {/* Tipo de licencia */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-black text-white px-3 py-1 text-sm font-semibold flex items-center gap-2">
              <i className="fas fa-id-badge"></i> Tipo de Licencia
            </div>
            <div className="p-3">
              <select
                className="w-full border p-2 rounded text-sm"
                value={tipoLicencia}
                onChange={(e)=>{ setTipoLicencia(e.target.value); setTouched(t=>({...t, tipo:true})) }}
              >
                <option value="">Seleccionar tipo</option>
                <option value="Conducción">Conducción</option>
                <option value="Instructor">Instructor</option>
              </select>
              {touched.tipo && !tipoLicencia && <small className="text-red-600 text-xs">Seleccione el tipo de licencia.</small>}
            </div>
          </div>

          {/* Vigencia */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-black text-white px-3 py-1 text-sm font-semibold flex items-center gap-2">
              <i className="fas fa-calendar-day"></i> Fecha de Vigencia
            </div>
            <div className="p-3">
              <input
                type="date"
                className="w-full border p-2 rounded text-sm"
                value={vigencia}
                onChange={(e)=> onVigenciaChange(e.target.value)}
              />
              {touched.vig && !vigencia && <small className="text-red-600 text-xs">Seleccione la fecha de vigencia.</small>}
            </div>
          </div>

          {/* Actualizado por */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-black text-white px-3 py-1 text-sm font-semibold flex items-center gap-2">
              <i className="fas fa-user-check"></i> Actualizado por
            </div>
            <div className="p-3">
              <input type="text" className="w-full border p-2 rounded text-sm bg-gray-100" readOnly value={user?.nombreCompleto || ''} />
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

      {/* Modal: registro futuro detectado → confirmar para habilitar Guardar (overwrite) */}
      {modalConfirma && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-3">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-3 text-red-600">Registro futuro detectado</h3>
            <p className="text-sm mb-2">
              Ya existe un registro <b>futuro</b> para este instructor, categoría y tipo de licencia.
              Si continúas, se <b>sobrescribirá</b> con la nueva fecha.
            </p>
            <div className="text-xs bg-gray-50 border rounded p-3 mb-3">
              <p><b>Nombre:</b> {modalConfirma.registro.nombre_completo}</p>
              <p><b>Documento:</b> {modalConfirma.registro.documento}</p>
              <p><b>Rol:</b> {modalConfirma.registro.rol}</p>
              <p><b>Categoría:</b> {modalConfirma.registro.categoria}</p>
              <p><b>Tipo de licencia:</b> {modalConfirma.registro.tipo_licencia}</p>
              <p><b>Vigencia actual:</b> {modalConfirma.registro.vigencia || '-'}</p>
              <p><b>Fecha actualización:</b> {modalConfirma.registro.fecha_actualizacion || '-'}</p>
              <p><b>Actualizado por:</b> {modalConfirma.registro.nombre_quien_actualiza || '-'}</p>
            </div>
            <p className="text-sm mb-4">Nueva vigencia propuesta: <b>{modalConfirma.nuevaFecha}</b></p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setModalConfirma(null) /* Guardar sigue deshabilitado */ }}
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
