'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { cerrarSesion } from '@/lib/auth/logout'

// ---------- Zona horaria Bogotá ----------
const formatearBogota = (date, fmt) => {
  const opts =
    fmt === 'fecha'
      ? { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }
      : { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Bogota' }
  return new Intl.DateTimeFormat('en-CA', opts).format(date) // en-CA => YYYY-MM-DD / HH:mm:ss
}

const obtenerFechaHoraBogota = () => {
  const now = new Date()
  const fecha = formatearBogota(now, 'fecha') // YYYY-MM-DD
  const hora = formatearBogota(now, 'hora')   // HH:mm:ss
  const timestamp = `${fecha}T${hora}-05:00`  // Bogotá (UTC-05:00)
  return { fecha, hora, timestamp }
}

// ---------- Consecutivo SN-0000001, SN-0000002, ... ----------
const obtenerSiguienteConsecutivo = async () => {
  const { data, error } = await supabase
    .from('siniestros')
    .select('consecutivo')
    .order('consecutivo', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error obteniendo consecutivo:', error.message)
    return 'SN-0000001'
  }

  if (!data || data.length === 0 || !data[0]?.consecutivo) {
    return 'SN-0000001'
  }

  const last = String(data[0].consecutivo) // ej: "SN-0000123"
  const num = parseInt(last.replace('SN-', ''), 10) + 1
  return 'SN-' + String(num).padStart(7, '0')
}

export default function SiniestrosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Listas
  const [placas, setPlacas] = useState([])

  // Form state
  const [fechaSiniestro, setFechaSiniestro] = useState('')
  const [tipoSiniestro, setTipoSiniestro] = useState('')
  const [personasInvolucradas, setPersonasInvolucradas] = useState('')
  const [heridosLeves, setHeridosLeves] = useState('')
  const [heridosGraves, setHeridosGraves] = useState('')
  const [fatalidades, setFatalidades] = useState('')
  const [placa, setPlaca] = useState('')
  const [nombreConductor, setNombreConductor] = useState('')
  const [documentoConductor, setDocumentoConductor] = useState('')
  const [resumen, setResumen] = useState('')

  // Mensajes de validación en tiempo real
  const [msgFecha, setMsgFecha] = useState('')
  const [msgTipo, setMsgTipo] = useState('')
  const [msgPers, setMsgPers] = useState('')
  const [msgLev, setMsgLev] = useState('')
  const [msgGrav, setMsgGrav] = useState('')
  const [msgFat, setMsgFat] = useState('')
  const [msgPlaca, setMsgPlaca] = useState('')
  const [msgNombre, setMsgNombre] = useState('')
  const [msgDoc, setMsgDoc] = useState('')
  const [msgResumen, setMsgResumen] = useState('')

  const [guardando, setGuardando] = useState(false)

  // ---------- Cargar usuario + placas ----------
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const parsed = JSON.parse(storedUser)
    setUser(parsed)

    // Cargar placas desde vehiculos
    ;(async () => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('placa')
        .order('placa', { ascending: true })
      if (!error && data) {
        setPlacas(data.map(v => v.placa))
      }
    })()
  }, [router])

  // --------- Validaciones en tiempo real ---------
  const validarEnteroMin0 = (val) => {
    if (val === '') return 'Requerido.'
    const n = Number(val)
    if (!Number.isInteger(n) || n < 0) return 'Ingrese un entero ≥ 0.'
    return ''
  }

  const onFechaChange = (e) => {
    const v = e.target.value
    setFechaSiniestro(v)
    setMsgFecha(v ? '' : 'Fecha requerida.')
  }
  const onTipoChange = (e) => {
    const v = e.target.value
    setTipoSiniestro(v)
    setMsgTipo(v ? '' : 'Seleccione un tipo.')
  }
  const onPersChange = (e) => {
    const clean = e.target.value.replace(/[^\d]/g, '')
    setPersonasInvolucradas(clean)
    setMsgPers(validarEnteroMin0(clean))
  }
  const onLevChange = (e) => {
    const clean = e.target.value.replace(/[^\d]/g, '')
    setHeridosLeves(clean)
    setMsgLev(validarEnteroMin0(clean))
  }
  const onGravChange = (e) => {
    const clean = e.target.value.replace(/[^\d]/g, '')
    setHeridosGraves(clean)
    setMsgGrav(validarEnteroMin0(clean))
  }
  const onFatChange = (e) => {
    const clean = e.target.value.replace(/[^\d]/g, '')
    setFatalidades(clean)
    setMsgFat(validarEnteroMin0(clean))
  }
  const onPlacaChange = (e) => {
    const v = e.target.value
    setPlaca(v)
    setMsgPlaca(v ? '' : 'Seleccione una placa.')
  }
  const onNombreChange = (e) => {
    // Solo letras/espacios, a MAYÚSCULAS
    const onlyLetters = e.target.value.replace(/[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ\s]/g, '')
    const upper = onlyLetters.toUpperCase()
    setNombreConductor(upper)
    setMsgNombre(upper.trim() ? '' : 'Nombre requerido (solo letras).')
  }
  const onDocChange = (e) => {
    const clean = e.target.value.replace(/[^\d]/g, '')
    setDocumentoConductor(clean)
    setMsgDoc(clean ? '' : 'Documento requerido (solo números).')
  }
  const onResumenChange = (e) => {
    const v = e.target.value
    setResumen(v)
    setMsgResumen(v.trim() ? '' : 'Resumen requerido.')
  }

  const puedeGuardar = useMemo(() => {
    const okFecha = !!fechaSiniestro
    const okTipo = !!tipoSiniestro
    const okPers = validarEnteroMin0(personasInvolucradas) === ''
    const okLev = validarEnteroMin0(heridosLeves) === ''
    const okGrav = validarEnteroMin0(heridosGraves) === ''
    const okFat = validarEnteroMin0(fatalidades) === ''
    const okPlaca = !!placa
    const okNombre = !!nombreConductor.trim()
    const okDoc = !!documentoConductor
    const okResumen = !!resumen.trim()

    return (
      okFecha && okTipo &&
      okPers && okLev && okGrav && okFat &&
      okPlaca && okNombre && okDoc && okResumen &&
      !guardando
    )
  }, [
    fechaSiniestro, tipoSiniestro, personasInvolucradas, heridosLeves, heridosGraves, fatalidades,
    placa, nombreConductor, documentoConductor, resumen, guardando
  ])

  // ---------- Guardar ----------
  const resetForm = () => {
    setFechaSiniestro('')
    setTipoSiniestro('')
    setPersonasInvolucradas('')
    setHeridosLeves('')
    setHeridosGraves('')
    setFatalidades('')
    setPlaca('')
    setNombreConductor('')
    setDocumentoConductor('')
    setResumen('')

    setMsgFecha('')
    setMsgTipo('')
    setMsgPers('')
    setMsgLev('')
    setMsgGrav('')
    setMsgFat('')
    setMsgPlaca('')
    setMsgNombre('')
    setMsgDoc('')
    setMsgResumen('')
  }

  const registrarSiniestro = async () => {
    if (!puedeGuardar || !user) return
    setGuardando(true)
    try {
      const consecutivo = await obtenerSiguienteConsecutivo()
      const { timestamp } = obtenerFechaHoraBogota()

      // 🔗 Mapeo EXACTO a tu tabla "siniestros"
      const payload = {
        consecutivo,
        timestamp_registro: timestamp,                         // timestamptz
        fecha_siniestro: fechaSiniestro,                       // date (YYYY-MM-DD)
        tipo_siniestro: tipoSiniestro,                         // text
        num_personas_involucradas: Number(personasInvolucradas),
        heridos_leves: Number(heridosLeves),
        heridos_graves: Number(heridosGraves),
        fatalidades: Number(fatalidades),
        placa: placa,
        nombre_conductor_implicado: nombreConductor.trim(),    // text (MAYÚSCULAS)
        documento: Number(documentoConductor),                 // integer
        resumen: resumen.trim(),                               // text
        estado_analisis: 'PENDIENTE'                           // text
        // El resto de columnas quedan NULL por defecto (no las enviamos)
      }

      const { data, error } = await supabase
        .from('siniestros')
        .insert([payload])
        .select('id')
        .single()

      if (error) {
        console.error('Error insertando siniestro:', error.message)
        toast.error('No se pudo registrar el siniestro.')
        setGuardando(false)
        return
      }

      toast.success(`Siniestro registrado (${consecutivo}).`, { duration: 1400 })
      setTimeout(() => {
        resetForm()
        router.push('/instructor/practica')
      }, 1450)
    } catch (e) {
      console.error('Error registrando siniestro:', e?.message || e)
      toast.error('Error inesperado al registrar.')
    } finally {
      setGuardando(false)
    }
  }

  // ---------- Logout ----------
  const handleLogout = () => cerrarSesion(router)

  // ---------- Render ----------
  if (!user) return <p className="text-center mt-20">Cargando...</p>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Toaster position="top-center" richColors />

      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-4 sm:p-6">
        {/* Título principal */}
        <h2 className="text-2xl font-bold mb-6 text-center text-[var(--primary)] flex items-center justify-center gap-2">
          <i className="fas fa-car-crash text-[var(--primary)]"></i>
          Registro de Siniestros Viales
        </h2>

        {/* Usuario */}
        <div className="bg-gray-50 p-2 sm:p-3 rounded mb-4 text-sm border text-center">
          Usuario: <strong>{user.nombreCompleto}</strong>
        </div>

        {/* Datos del siniestro */}
        <div className="mb-8 border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="bg-black text-white px-3 py-1 rounded-t-md mb-4 text-sm font-semibold flex items-center gap-2">
            <i className="fas fa-clipboard-list"></i>
            Datos del Siniestro
          </div>

          {/* Fecha y tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-semibold text-sm">Fecha del Siniestro</label>
              <input
                type="date"
                className="w-full border p-2 rounded-lg text-sm"
                value={fechaSiniestro}
                onChange={onFechaChange}
              />
              {msgFecha && <small className="text-red-600 text-xs">{msgFecha}</small>}
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Tipo de Siniestro</label>
              <select
                className="w-full border p-2 rounded-lg text-sm"
                value={tipoSiniestro}
                onChange={onTipoChange}
              >
                <option value="">-- Selecciona Tipo --</option>
                <option value="Atropello">Atropello (Impacto de vehículo contra un peatón)</option>
                <option value="Choque">Choque (Impacto contra objeto estático)</option>
                <option value="Colisión">Colisión (Impacto entre vehículos en movimiento)</option>
                <option value="Vuelco">Vuelco</option>
                <option value="Características Especiales">Características Especiales</option>
                <option value="Caída">Caída</option>
              </select>
              {msgTipo && <small className="text-red-600 text-xs">{msgTipo}</small>}
            </div>
          </div>

          {/* Personas involucradas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-semibold text-sm">Personas Involucradas</label>
              <input
                type="number"
                min="0"
                className="w-full border p-2 rounded-lg text-sm"
                value={personasInvolucradas}
                onChange={onPersChange}
              />
              {msgPers && <small className="text-red-600 text-xs">{msgPers}</small>}
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Heridos Leves</label>
              <input
                type="number"
                min="0"
                className="w-full border p-2 rounded-lg text-sm"
                value={heridosLeves}
                onChange={onLevChange}
              />
              {msgLev && <small className="text-red-600 text-xs">{msgLev}</small>}
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Heridos Graves</label>
              <input
                type="number"
                min="0"
                className="w-full border p-2 rounded-lg text-sm"
                value={heridosGraves}
                onChange={onGravChange}
              />
              {msgGrav && <small className="text-red-600 text-xs">{msgGrav}</small>}
            </div>
          </div>

          {/* Fatalidades y placa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-semibold text-sm">Fatalidades</label>
              <input
                type="number"
                min="0"
                className="w-full border p-2 rounded-lg text-sm"
                value={fatalidades}
                onChange={onFatChange}
              />
              {msgFat && <small className="text-red-600 text-xs">{msgFat}</small>}
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Placa del Vehículo</label>
              <select
                className="w-full border p-2 rounded-lg text-sm"
                value={placa}
                onChange={onPlacaChange}
              >
                <option value="">-- Selecciona la Placa --</option>
                {placas.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {msgPlaca && <small className="text-red-600 text-xs">{msgPlaca}</small>}
            </div>
          </div>

          {/* Conductor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-semibold text-sm">Nombre del responsable del vehículo</label>
              <input
                type="text"
                className="w-full border p-2 rounded-lg text-sm"
                value={nombreConductor}
                onChange={onNombreChange}
              />
              {msgNombre && <small className="text-red-600 text-xs">{msgNombre}</small>}
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Documento del Conductor</label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full border p-2 rounded-lg text-sm"
                value={documentoConductor}
                onChange={onDocChange}
              />
              {msgDoc && <small className="text-red-600 text-xs">{msgDoc}</small>}
            </div>
          </div>

          {/* Resumen */}
          <div>
            <label className="block mb-1 font-semibold text-sm">Resumen del Siniestro</label>
            <textarea
              className="w-full border p-2 rounded-lg text-sm"
              rows="4"
              value={resumen}
              onChange={onResumenChange}
            />
            {msgResumen && <small className="text-red-600 text-xs">{msgResumen}</small>}
          </div>
        </div>

        {/* Botones finales */}
        <div className="mt-8 space-y-4">
          {/* Registrar centrado */}
          <div className="flex justify-center">
            <button
              onClick={registrarSiniestro}
              disabled={!puedeGuardar}
              className={`bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-2 px-6 rounded-lg shadow-md text-sm flex items-center gap-2 ${
                !puedeGuardar ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <i className="fas fa-file-alt"></i> {guardando ? 'Guardando...' : 'Registrar Siniestro'}
            </button>
          </div>

          {/* Regresar y cerrar sesión */}
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/instructor/practica')}
              className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 rounded-lg shadow-md text-sm flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i> Regresar
            </button>
            <button
              onClick={() => cerrarSesion(router)}
              className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 px-4 rounded-lg shadow-md text-sm flex items-center gap-2"
            >
              <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
