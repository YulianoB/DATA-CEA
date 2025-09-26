'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { validarKilometraje } from '@/lib/servicios/validaciones'
import { cerrarSesion } from '@/lib/auth/logout'

// ------------------ Helpers locales (Bogotá / duración) ------------------
const fmtBogota = (date, mode) => {
  const opts =
    mode === 'fecha'
      ? { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }
      : { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Bogota' }
  return new Intl.DateTimeFormat('en-CA', opts).format(date) // en-CA → YYYY-MM-DD / HH:mm:ss
}

const ahoraBogota = () => {
  const now = new Date()
  const fecha = fmtBogota(now, 'fecha') // YYYY-MM-DD
  const hora = fmtBogota(now, 'hora')   // HH:mm:ss
  const timestamp = `${fecha}T${hora}-05:00` // Bogotá UTC-05:00
  return { fecha, hora, timestamp }
}

const calcDuracionHoras = (clasesDictadas) => {
  const n = Number(clasesDictadas || 0)
  const horas = (n * 50) / 60
  return Math.round(horas * 10) / 10 // 1 decimal
}

// ⏱️ Formateo “X horas Y minutos” (si <60, solo minutos)
const fmtHM = (min) => {
  const m = Math.max(0, Math.floor(Number(min) || 0))
  if (m < 60) return `${m} ${m === 1 ? 'minuto' : 'minutos'}`
  const h = Math.floor(m / 60)
  const r = m % 60
  const parteH = `${h} ${h === 1 ? 'hora' : 'horas'}`
  const parteM = r > 0 ? ` ${r} ${r === 1 ? 'minuto' : 'minutos'}` : ''
  return `${parteH}${parteM}`
}

// ------------------ Página ------------------
export default function HorariosPracticaPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Datos maestros/UI
  const [vehiculos, setVehiculos] = useState([])
  const [placa, setPlaca] = useState('')
  const [vehiculoInfo, setVehiculoInfo] = useState({ tipo: '-', marca: '-' })

  // Estado: ¿tengo jornada abierta hoy?
  const [tengoAbierta, setTengoAbierta] = useState(false)
  // incluye timestamp_entrada (NECESARIO para tiempo mínimo)
  const [registroAbierto, setRegistroAbierto] = useState(null) // {id, placa, km_inicial, clases_programadas, fecha/hora, timestamp_entrada}

  // Entrada
  const [inspeccionOk, setInspeccionOk] = useState(false) // existe preoperacional hoy
  const [kmInicial, setKmInicial] = useState('')
  const [clasesProg, setClasesProg] = useState('')
  const [msgKmInicial, setMsgKmInicial] = useState('')
  const [forzarKmInicial, setForzarKmInicial] = useState(false)

  // Salida
  const [kmFinal, setKmFinal] = useState('')
  const [clasesDictadas, setClasesDictadas] = useState('')
  const [numAprendices, setNumAprendices] = useState('')
  const [msgKmFinal, setMsgKmFinal] = useState('')
  const [forzarKmFinal, setForzarKmFinal] = useState(false)

  // Modales
  const [modalKm, setModalKm] = useState(null) // { titulo, maxKm, diferencia, fuente, campo, onConfirm }
  const [modalPlacaEnUso, setModalPlacaEnUso] = useState(null) // { instructor, hora }

  // Estado de guardado
  const [guardando, setGuardando] = useState(false)

  // Reloj para evaluar tiempo mínimo (refresca cada 30s)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const it = setInterval(() => setTick((x) => x + 1), 30_000)
    return () => clearInterval(it)
  }, [])

  // ------------------ Cargar usuario, vehículos y estado inicial ------------------
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const parsed = JSON.parse(storedUser)
    setUser(parsed)

    const cargar = async () => {
      // Vehículos
      const { data: vehs, error: errV } = await supabase
        .from('vehiculos')
        .select('placa, tipo_vehiculo, marca')
        .order('placa', { ascending: true })
      if (!errV && vehs) setVehiculos(vehs)

      // ¿Jornada abierta hoy para este usuario?  (incluye timestamp_entrada)
      const { fecha } = ahoraBogota()
      const { data: jor, error: errJ } = await supabase
        .from('horarios')
        .select('id, placa, km_inicial, clases_programadas, fecha_entrada, hora_entrada, timestamp_entrada')
        .eq('usuario', parsed.usuario)
        .eq('fecha_entrada', fecha)
        .eq('estado_registro', 'Abierto')
        .order('timestamp_entrada', { ascending: false })
        .limit(1)

      if (!errJ && jor && jor.length > 0) {
        setTengoAbierta(true)
        setRegistroAbierto(jor[0])
        setPlaca(jor[0].placa)
      } else {
        setTengoAbierta(false)
        setRegistroAbierto(null)
      }
    }

    cargar()
  }, [router])

  // Autocompletar tipo/marca al cambiar placa
  useEffect(() => {
    if (!placa) {
      setVehiculoInfo({ tipo: '-', marca: '-' })
      return
    }
    const v = vehiculos.find(vv => vv.placa === placa)
    setVehiculoInfo({
      tipo: v?.tipo_vehiculo || '-',
      marca: v?.marca || '-'
    })
  }, [placa, vehiculos])

  // ------------------ Utilidades de correo ------------------
  const obtenerEmailUsuario = async () => {
    if (user?.email) return user.email
    if (!user?.nombreCompleto) return ''
    const { data, error } = await supabase
      .from('usuarios')
      .select('email')
      .eq('nombre_completo', user.nombreCompleto)
      .limit(1)
    if (error || !data || !data[0]?.email) return ''
    return data[0].email
  }

  const enviarCorreo = async ({ para, asunto, html }) => {
    try {
      const res = await fetch('/api/email/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ para, asunto, html })
      })
      const json = await res.json()
      if (!json.ok) {
        console.error('Error enviando correo:', json.error)
      }
    } catch (e) {
      console.error('Error enviando correo:', e?.message || e)
    }
  }

  // ------------------ Validaciones de placa al seleccionar ------------------
  const handlePlacaChange = async (e) => {
    const nueva = e.target.value
    setPlaca(nueva)

    // Reset entrada
    setInspeccionOk(false)
    setKmInicial('')
    setClasesProg('')
    setMsgKmInicial('')
    setForzarKmInicial(false)

    if (!nueva) return

    const { fecha } = ahoraBogota()

    // 1) ¿La placa ya está en uso hoy (Abierto) por alguien?
    const { data: enUso, error: errUso } = await supabase
      .from('horarios')
      .select('nombre_completo, hora_entrada')
      .eq('placa', nueva)
      .eq('fecha_entrada', fecha)
      .eq('estado_registro', 'Abierto')
      .limit(1)

    if (!errUso && enUso && enUso.length > 0) {
      const r = enUso[0]
      setModalPlacaEnUso({
        instructor: r.nombre_completo || 'Instructor no identificado',
        hora: r.hora_entrada || '--:--:--'
      })
      toast.error(`La placa ${nueva} está en uso hoy (Abierto).`)
      return
    }

    // 2) ¿Existe inspección preoperacional hoy para esta placa?
    const { data: insp, error: errI } = await supabase
      .from('preoperacionales')
      .select('id')
      .eq('placa', nueva)
      .eq('fecha_registro', fecha)
      .limit(1)

    if (!errI && insp && insp.length > 0) {
      setInspeccionOk(true)
      toast.success(`Inspección de hoy encontrada para ${nueva}.`)
    } else {
      setInspeccionOk(false)
      toast.warning(`No existe inspección preoperacional de hoy para ${nueva}.`)
    }
  }

  // ------------------ Validación km de ENTRADA ------------------
  const onKmInicialChange = async (e) => {
    const val = e.target.value
    setKmInicial(val)
    setMsgKmInicial('')
    setForzarKmInicial(false)

    if (!placa || !val) return
    const r = await validarKilometraje(placa, parseInt(val, 10))
    if (r.estado === 'error') {
      setMsgKmInicial(r.mensaje)
      toast.error(r.mensaje)
      return
    }
    if (r.estado === 'advertencia') {
      setMsgKmInicial(r.mensaje)
      setModalKm({
        titulo: 'Advertencia de Kilometraje (Entrada)',
        maxKm: r.maxKm,
        diferencia: r.diferencia,
        fuente: r.fuente,
        campo: r.campo,
        onConfirm: () => {
          setForzarKmInicial(true)
          setModalKm(null)
        }
      })
      return
    }
    setMsgKmInicial(r.mensaje) // ok
  }

  // ------------------ Validaciones de SALIDA ------------------
  const onKmFinalChange = async (e) => {
    const val = e.target.value
    setKmFinal(val)
    setMsgKmFinal('')
    setForzarKmFinal(false)

    if (!placa || !val) return
    const r = await validarKilometraje(placa, parseInt(val, 10))
    if (r.estado === 'error') {
      setMsgKmFinal(r.mensaje)
      toast.error(r.mensaje)
      return
    }
    if (r.estado === 'advertencia') {
      setMsgKmFinal(r.mensaje)
      setModalKm({
        titulo: 'Advertencia de Kilometraje (Salida)',
        maxKm: r.maxKm,
        diferencia: r.diferencia,
        fuente: r.fuente,
        campo: r.campo,
        onConfirm: () => {
          setForzarKmFinal(true)
          setModalKm(null)
        }
      })
      return
    }
    setMsgKmFinal(r.mensaje)
  }

  // ---- Tiempo mínimo salida: (clasesDictadas × 45 min) desde timestamp_entrada ----
  const clasesNum = useMemo(() => {
    const n = Number(clasesDictadas)
    return Number.isFinite(n) ? n : NaN
  }, [clasesDictadas])

  const aprendicesNum = useMemo(() => {
    const n = Number(numAprendices)
    return Number.isFinite(n) ? n : NaN
  }, [numAprendices])

  const kmFinalNum = useMemo(() => {
    const n = Number(kmFinal)
    return Number.isFinite(n) ? n : NaN
  }, [kmFinal])

  const minutosMinimos = useMemo(() => {
    if (!Number.isFinite(clasesNum) || clasesNum < 0) return 0
    return clasesNum * 45
  }, [clasesNum])

  const minutosTranscurridos = useMemo(() => {
    if (!registroAbierto?.timestamp_entrada) return 0
    const inicio = new Date(registroAbierto.timestamp_entrada).getTime()
    const ahora = Date.now()
    const diffMs = Math.max(0, ahora - inicio)
    return Math.floor(diffMs / 60000)
  }, [registroAbierto?.timestamp_entrada, tick])

  // ✅ Permite salida si transcurridos >= mínimos (si clases=0, mínimos=0 → permitido)
  const tiempoOk = minutosTranscurridos >= minutosMinimos
  const faltanMin = Math.max(0, minutosMinimos - minutosTranscurridos)
  const txtMinimos = fmtHM(minutosMinimos)
  const txtTrans = fmtHM(minutosTranscurridos)
  const txtFaltan = fmtHM(faltanMin)

  // ------------------ Habilitación de botones ------------------
  const puedeRegistrarEntrada = useMemo(() => {
    if (!placa || !inspeccionOk) return false
    const kmOk =
      (msgKmInicial && !msgKmInicial.includes('menor')) || forzarKmInicial
    const clasesOk = Number(clasesProg) >= 1
    return kmOk && clasesOk && !tengoAbierta
  }, [placa, inspeccionOk, msgKmInicial, forzarKmInicial, clasesProg, tengoAbierta])

  const puedeRegistrarSalida = useMemo(() => {
    if (!tengoAbierta || !registroAbierto) return false
    const ki = Number(registroAbierto.km_inicial || 0)
    const reglaKm = Number.isFinite(kmFinalNum) && kmFinalNum >= ki
    const reglaClases =
      clasesDictadas !== '' &&
      Number.isFinite(clasesNum) &&
      clasesNum >= 0 &&
      clasesNum <= 12
    const reglaAprend =
      numAprendices !== '' &&
      Number.isFinite(aprendicesNum) &&
      aprendicesNum >= 0 &&
      aprendicesNum <= 6
    const kmOk = (msgKmFinal && !msgKmFinal.includes('menor')) || forzarKmFinal
    return reglaKm && reglaClases && reglaAprend && kmOk && tiempoOk
  }, [
    tengoAbierta,
    registroAbierto,
    kmFinalNum,
    msgKmFinal,
    forzarKmFinal,
    clasesDictadas,
    clasesNum,
    numAprendices,
    aprendicesNum,
    tiempoOk
  ])

  // ------------------ Registrar ENTRADA ------------------
  const registrarEntrada = async () => {
    if (!puedeRegistrarEntrada || guardando || !user) return
    setGuardando(true)
    try {
      // Seguridad extra: verificar que no haya abierta al momento de guardar
      const { fecha, hora, timestamp } = ahoraBogota()
      const { data: ya, error: errYa } = await supabase
        .from('horarios')
        .select('id')
        .eq('usuario', user.usuario)
        .eq('fecha_entrada', fecha)
        .eq('estado_registro', 'Abierto')
        .limit(1)
      if (!errYa && ya && ya.length > 0) {
        toast.error('Ya tienes una jornada abierta hoy.')
        setGuardando(false)
        return
      }

      const { data: inserted, error } = await supabase
        .from('horarios')
        .insert([{
          timestamp_entrada: timestamp,
          fecha_entrada: fecha,
          hora_entrada: hora,
          usuario: user.usuario,
          nombre_completo: user.nombreCompleto,
          rol: 'INSTRUCTOR PRÁCTICA',
          placa,
          km_inicial: Number(kmInicial),
          clases_programadas: Number(clasesProg),
          estado_registro: 'Abierto'
        }])
        // ← incluimos timestamp_entrada en el select para tiempo mínimo
        .select('id, placa, km_inicial, clases_programadas, fecha_entrada, hora_entrada, timestamp_entrada')
        .single()

      if (error) {
        toast.error('No se pudo registrar la entrada.')
        setGuardando(false)
        return
      }

      // Correo al usuario
      const correo = await obtenerEmailUsuario()
      if (correo) {
        const asunto = `Entrada práctica confirmada - ${fecha}`
        const html = `
          <p>Hola ${user.nombreCompleto},</p>
          <p>Tu jornada <b>Abierto</b> se registró correctamente.</p>
          <ul>
            <li><b>Fecha:</b> ${fecha}</li>
            <li><b>Hora:</b> ${hora}</li>
            <li><b>Placa:</b> ${placa}</li>
            <li><b>Kilometraje inicial:</b> ${kmInicial}</li>
            <li><b>Clases programadas:</b> ${clasesProg}</li>
          </ul>
        `
        enviarCorreo({ para: correo, asunto, html })
      }

      toast.success('Entrada registrada.')
      // Pasa a modo SALIDA
      setTengoAbierta(true)
      setRegistroAbierto(inserted)
    } finally {
      setGuardando(false)
    }
  }

  // ------------------ Registrar SALIDA ------------------
  const registrarSalida = async () => {
    if (!puedeRegistrarSalida || guardando || !user || !registroAbierto) return
    setGuardando(true)
    try {
      const { fecha, hora, timestamp } = ahoraBogota()
      const duracion = calcDuracionHoras(clasesDictadas)

      const { error } = await supabase
        .from('horarios')
        .update({
          timestamp_salida: timestamp,
          fecha_salida: fecha,
          hora_salida: hora,
          km_final: Number(kmFinal),
          clases_dictadas: Number(clasesDictadas),
          num_aprendices: Number(numAprendices),
          duracion_jornada: duracion,
          estado_registro: 'Cerrado'
        })
        .eq('id', registroAbierto.id)

      if (error) {
        toast.error('No se pudo registrar la salida.')
        setGuardando(false)
        return
      }

      // Correo al usuario
      const correo = await obtenerEmailUsuario()
      if (correo) {
        const asunto = `Salida práctica confirmada - ${fecha}`
        const html = `
          <p>Hola ${user.nombreCompleto},</p>
          <p>Tu jornada se cerró correctamente.</p>
          <ul>
            <li><b>Fecha salida:</b> ${fecha}</li>
            <li><b>Hora salida:</b> ${hora}</li>
            <li><b>Placa:</b> ${registroAbierto.placa}</li>
            <li><b>Km inicial:</b> ${registroAbierto.km_inicial}</li>
            <li><b>Km final:</b> ${kmFinal}</li>
            <li><b>Clases dictadas:</b> ${clasesDictadas}</li>
            <li><b>Aprendices:</b> ${numAprendices}</li>
            <li><b>Duración (h):</b> ${duracion}</li>
          </ul>
        `
        enviarCorreo({ para: correo, asunto, html })
      }

      toast.success('Salida registrada.')
      // Reset total → vuelve a modo ENTRADA
      setTengoAbierta(false)
      setRegistroAbierto(null)
      setPlaca('')
      setVehiculoInfo({ tipo: '-', marca: '-' })
      setKmFinal('')
      setClasesDictadas('')
      setNumAprendices('')

      // También limpia controles de entrada
      setInspeccionOk(false)
      setKmInicial('')
      setClasesProg('')
      setMsgKmInicial('')
      setForzarKmInicial(false)

      // ⬅️ volver al menú anterior
      setTimeout(() => {
        router.push('/instructor/practica')
      }, 800)
    } finally {
      setGuardando(false)
    }
  }

  // ------------------ Logout ------------------
  const handleLogout = () => cerrarSesion(router)

  // ------------------ Render ------------------
  if (!user) return <p className="text-center mt-20">Cargando...</p>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Toaster position="top-center" richColors />

      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6">
        {/* Título */}
        <h2 className="text-2xl font-bold mb-4 text-center flex items-center justify-center gap-2 border-b pb-3 text-[var(--primary)]">
          <i className="fas fa-calendar-alt text-[var(--primary)]"></i>
          Registro de Horarios - Instructor Práctica
        </h2>

        {/* Usuario */}
        <div className="bg-gray-50 p-2 rounded mb-4 text-xs border text-center">
          Usuario: <strong>{user.nombreCompleto}</strong>
        </div>

        {/* ----------- Bloque ENTRADA ----------- */}
        {!tengoAbierta && (
          <div className="border rounded-lg shadow-sm mb-8">
            <h3 className="bg-[var(--primary-dark)] text-white font-semibold px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm">
              <i className="fas fa-sign-in-alt text-green-300"></i> Registrar Horario de Entrada
            </h3>

            <div className="p-4 space-y-4">
              {/* Placa */}
              <div>
                <label className="block mb-1 font-semibold text-sm">Placa del Vehículo</label>
                <select
                  className="w-full border p-2 rounded text-sm"
                  value={placa}
                  onChange={handlePlacaChange}
                >
                  <option value="">-- Seleccione la Placa --</option>
                  {vehiculos.map(v => (
                    <option key={v.placa} value={v.placa}>{v.placa}</option>
                  ))}
                </select>
              </div>

              {/* Datos del vehículo */}
              <div className="text-xs bg-gray-50 border rounded p-2">
                <p><strong>Tipo de Vehículo:</strong> {vehiculoInfo.tipo}</p>
                <p><strong>Marca:</strong> {vehiculoInfo.marca}</p>
              </div>

              {/* Km Inicial + Clases Programadas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-semibold text-sm">Kilometraje Inicial</label>
                  <input
                    type="number"
                    className={`w-full border p-2 rounded text-sm ${(!placa || !inspeccionOk) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    min="0"
                    value={kmInicial}
                    onChange={onKmInicialChange}
                    disabled={!placa || !inspeccionOk}
                  />
                  {msgKmInicial && (
                    <small className={`text-xs mt-1 block ${
                      msgKmInicial.includes('menor') ? 'text-red-600' :
                      msgKmInicial.includes('supera') ? 'text-orange-600' : 'text-green-600'
                    }`}>{msgKmInicial}</small>
                  )}
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-sm">Clases Programadas</label>
                  <input
                    type="number"
                    className={`w-full border p-2 rounded text-sm ${(!placa || !inspeccionOk) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    min="1"
                    value={clasesProg}
                    onChange={(e) => setClasesProg(e.target.value)}
                    disabled={!placa || !inspeccionOk}
                  />
                  <small className="text-xs text-gray-500"></small>
                </div>
              </div>

              {/* Botón entrada */}
              <div className="flex justify-center">
                <button
                  onClick={registrarEntrada}
                  disabled={!puedeRegistrarEntrada || guardando}
                  className={`py-2 px-6 rounded-lg shadow-md text-sm flex items-center gap-2 ${
                    puedeRegistrarEntrada && !guardando
                      ? 'bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white'
                      : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  }`}
                >
                  <i className="fas fa-save"></i> {guardando ? 'Guardando...' : 'Registrar Entrada'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------- Bloque SALIDA ----------- */}
        {tengoAbierta && registroAbierto && (
          <div className="border rounded-lg shadow-sm">
            <h3 className="bg-[var(--primary-dark)] text-white font-semibold px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm">
              <i className="fas fa-sign-out-alt text-red-300"></i> Registrar Horario de Salida
            </h3>

            <div className="p-4 space-y-4">
              {/* Datos de entrada */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 border rounded p-2">
                <p><strong>Fecha Entrada:</strong> {registroAbierto.fecha_entrada || '-'}</p>
                <p><strong>Hora Entrada:</strong> {registroAbierto.hora_entrada || '-'}</p>
                <p><strong>Placa:</strong> {registroAbierto.placa || '-'}</p>
                <p><strong>Km Inicial:</strong> {registroAbierto.km_inicial ?? '-'}</p>
                <p><strong>Clases Programadas:</strong> {registroAbierto.clases_programadas ?? '-'}</p>
              </div>

              {/* Inputs salida */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1 font-semibold text-sm">Kilometraje Final</label>
                  <input
                    type="number"
                    className="w-full border p-2 rounded text-sm"
                    min={registroAbierto.km_inicial ?? 0}
                    value={kmFinal}
                    onChange={onKmFinalChange}
                  />
                  {msgKmFinal && (
                    <small className={`text-xs mt-1 block ${
                      msgKmFinal.includes('menor') ? 'text-red-600' :
                      msgKmFinal.includes('supera') ? 'text-orange-600' : 'text-green-600'
                    }`}>{msgKmFinal}</small>
                  )}
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-sm">Clases Dictadas</label>
                  <input
                    type="number"
                    className="w-full border p-2 rounded text-sm"
                    min="0"
                    value={clasesDictadas}
                    onChange={(e) => setClasesDictadas(e.target.value)}
                  />
                  {clasesDictadas !== '' && (!Number.isFinite(clasesNum) || clasesNum < 0) && (
                    <small className="text-red-600 text-xs">Debe ser un número válido ≥ 0.</small>
                  )}
                  {Number.isFinite(clasesNum) && clasesNum > 12 && (
                    <small className="text-red-600 text-xs">No puede superar <b>12</b> clases al día.</small>
                  )}
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-sm">Número de Aprendices</label>
                  <input
                    type="number"
                    className="w-full border p-2 rounded text-sm"
                    min="0"
                    value={numAprendices}
                    onChange={(e) => setNumAprendices(e.target.value)}
                  />
                  {numAprendices !== '' && (!Number.isFinite(aprendicesNum) || aprendicesNum < 0) && (
                    <small className="text-red-600 text-xs">Debe ser un número válido ≥ 0.</small>
                  )}
                  {Number.isFinite(aprendicesNum) && aprendicesNum > 6 && (
                    <small className="text-red-600 text-xs">No puede superar <b>6</b> aprendices.</small>
                  )}
                </div>
              </div>

              {/* Indicador de tiempo mínimo (ahora formateado en horas/minutos) */}
              <div className="text-sm">
                {Number.isFinite(clasesNum) && clasesNum > 0 ? (
                  (minutosTranscurridos >= minutosMinimos) ? (
                    <span className="inline-block bg-green-100 text-green-700 border border-green-300 rounded px-3 py-1">
                      ✓ Tiempo mínimo cumplido (<b>{txtMinimos}</b>).
                    </span>
                  ) : (
                    <span className="inline-block bg-yellow-100 text-yellow-800 border border-yellow-300 rounded px-3 py-1">
                      Para registrar la salida deben transcurrir al menos <b>{txtMinimos}</b>.{' '}
                      Transcurridos: <b>{txtTrans}</b>. Faltan: <b>{txtFaltan}</b>.
                    </span>
                  )
                ) : (
                  <span className="text-gray-500">Indique cuántas clases dicto para calcular el tiempo mínimo .</span>
                )}
              </div>

              {/* Botón salida */}
              <div className="flex justify-center">
                <button
                  onClick={registrarSalida}
                  disabled={!puedeRegistrarSalida || guardando}
                  className={`py-2 px-6 rounded-lg shadow-md text-sm flex items-center gap-2 ${
                    puedeRegistrarSalida && !guardando
                      ? 'bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white'
                      : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  }`}
                >
                  <i className="fas fa-save"></i> {guardando ? 'Guardando...' : 'Registrar Salida'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botones finales */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => router.push('/instructor/practica')}
            className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 rounded-lg shadow-md text-sm"
          >
            <i className="fas fa-arrow-left mr-2"></i> Regresar
          </button>
          <button
            onClick={handleLogout}
            className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 px-4 rounded-lg shadow-md text-sm"
          >
            <i className="fas fa-sign-out-alt mr-2"></i> Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Modal: placa en uso */}
      {modalPlacaEnUso && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-2 text-red-600">Placa en uso hoy</h3>
            <p className="text-sm mb-1">
              Ya existe una jornada <b>Abierto</b> hoy con esta placa.
            </p>
            <p className="text-sm mb-1"><b>Instructor:</b> {modalPlacaEnUso.instructor}</p>
            <p className="text-sm mb-4"><b>Hora entrada:</b> {modalPlacaEnUso.hora}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setModalPlacaEnUso(null)}
                className="bg-gray-600 hover:bg-gray-800 text-white px-4 py-2 rounded"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: advertencia kilometraje */}
      {modalKm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-3 text-red-600">{modalKm.titulo}</h3>
            <p className="text-sm mb-2">El valor ingresado supera en más de 300 km el último registrado.</p>
            <p className="text-sm mb-1"><b>Último registro:</b> {modalKm.maxKm} km</p>
            <p className="text-sm mb-1"><b>Fuente:</b> {modalKm.fuente} ({modalKm.campo})</p>
            <p className="text-sm mb-4"><b>Diferencia:</b> {modalKm.diferencia} km</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalKm(null)}
                className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => modalKm.onConfirm && modalKm.onConfirm()}
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded"
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
