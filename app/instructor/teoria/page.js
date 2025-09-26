'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster, toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { cerrarSesion } from '@/lib/auth/logout'

// -------- Helpers zona Bogotá --------
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
const humanHM = (totalMin) => {
  const m = Math.max(0, Math.round(Number(totalMin || 0)))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h > 0 && r > 0) return `${h} h ${r} m`
  if (h > 0) return `${h} h`
  return `${m} m`
}

// -------- Página --------
export default function RegistroHorariosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // estado de la jornada
  const [tengoAbierta, setTengoAbierta] = useState(false)
  const [registroAbierto, setRegistroAbierto] = useState(null) // { id, timestamp_entrada, fecha_entrada, hora_entrada }
  const [cargandoEstado, setCargandoEstado] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // === Reuniones: estado y polling de reunión activa ===
  const [reunionActiva, setReunionActiva] = useState(null)
  const [enviandoAsistencia, setEnviandoAsistencia] = useState(false)

  useEffect(() => {
    let alive = true
    const fetchActiva = async () => {
      try {
        const res = await fetch('/api/reuniones/activa', { cache: 'no-store' })
        const json = await res.json()
        if (!alive) return
        setReunionActiva(json?.data || null)
      } catch {
        // silencio
      }
    }
    fetchActiva()
    const id = setInterval(fetchActiva, 60_000) // cada 60s
    return () => { alive = false; clearInterval(id) }
  }, [])

  // Cargar user y estado inicial
  useEffect(() => {
    const s = localStorage.getItem('currentUser')
    if (!s) { router.push('/login'); return }
    const u = JSON.parse(s)
    setUser(u)

    const cargarEstado = async () => {
      setCargandoEstado(true)
      const { fecha } = ahoraBogota()
      const { data, error } = await supabase
        .from('horarios')
        .select('id, timestamp_entrada, fecha_entrada, hora_entrada')
        .eq('usuario', u.usuario)
        .eq('fecha_entrada', fecha)
        .eq('estado_registro', 'Abierto')
        .limit(1)

      if (!error && data && data.length > 0) {
        setTengoAbierta(true)
        setRegistroAbierto(data[0])
      } else {
        setTengoAbierta(false)
        setRegistroAbierto(null)
      }
      setCargandoEstado(false)
    }

    cargarEstado()
  }, [router])

  // Email del usuario
  const obtenerEmailUsuario = async () => {
    // si login ya trajera email podrías usar user.email
    const { data, error } = await supabase
      .from('usuarios')
      .select('email')
      .eq('usuario', user.usuario)
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

  // === Reuniones: registrar asistencia (TOP-LEVEL, no anidada) ===
  const registrarAsistenciaReunion = async () => {
    try {
      const s = localStorage.getItem('currentUser')
      if (!s) { toast.error('No hay usuario en sesión.'); return }
      const u = JSON.parse(s)
      if (!u?.documento) { toast.error('Usuario sin documento.'); return }
      if (!reunionActiva?.enlace_asistencia) { toast.warning('No hay reunión activa.'); return }

      setEnviandoAsistencia(true)
      const res = await fetch('/api/asistencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enlace_asistencia: reunionActiva.enlace_asistencia,
          user: { documento: u.documento, nombreCompleto: u.nombreCompleto, role: u.rol || u.role }
        })
      })
      const json = await res.json()
      if (json.status === 'success') toast.success('✅ Asistencia registrada.')
      else if (json.status === 'warning') toast.warning(json.message || 'Aviso.')
      else toast.error(json.message || 'Error al registrar asistencia.')
    } catch {
      toast.error('Error al registrar asistencia.')
    } finally {
      setEnviandoAsistencia(false)
    }
  }

  // Mensaje de estado arriba de los botones
  const statusMessage = useMemo(() => {
    if (cargandoEstado) return ''
    if (tengoAbierta && registroAbierto) {
      return `Tiene una jornada abierta desde ${registroAbierto.fecha_entrada} ${registroAbierto.hora_entrada}.`
    }
    return 'No tiene jornada abierta hoy. Puede registrar entrada.'
  }, [cargandoEstado, tengoAbierta, registroAbierto])

  // Habilitación de botones
  const entradaHabilitada = useMemo(() => {
    if (!user) return false
    // sólo INSTRUCTOR TEORÍA o AUXILIAR ADMINISTRATIVO
    const rol = String(user.rol || '').toUpperCase()
    const rolPermitido = rol === 'INSTRUCTOR TEORÍA' || rol === 'AUXILIAR ADMINISTRATIVO'
    return rolPermitido && !tengoAbierta && !guardando && !cargandoEstado
  }, [user, tengoAbierta, guardando, cargandoEstado])

  const salidaHabilitada = useMemo(() => {
    if (!user) return false
    const rol = String(user.rol || '').toUpperCase()
    const rolPermitido = rol === 'INSTRUCTOR TEORÍA' || rol === 'AUXILIAR ADMINISTRATIVO'
    return rolPermitido && tengoAbierta && !!registroAbierto && !guardando && !cargandoEstado
  }, [user, tengoAbierta, registroAbierto, guardando, cargandoEstado])

  // Entrada
  const registrarEntrada = async () => {
    if (!entradaHabilitada || !user) return
    setGuardando(true)
    try {
      const { fecha, hora, timestamp } = ahoraBogota()

      // Seguridad: evitar duplicado si dos clicks
      const { data: yaAbierta } = await supabase
        .from('horarios')
        .select('id')
        .eq('usuario', user.usuario)
        .eq('fecha_entrada', fecha)
        .eq('estado_registro', 'Abierto')
        .limit(1)
      if (yaAbierta && yaAbierta.length > 0) {
        toast.error('Ya tiene una jornada abierta hoy.')
        setGuardando(false)
        return
      }

      const rol = String(user.rol || '').toUpperCase()
      const { error } = await supabase
        .from('horarios')
        .insert([{
          timestamp_entrada: timestamp,
          fecha_entrada: fecha,
          hora_entrada: hora,
          usuario: user.usuario,
          nombre_completo: user.nombreCompleto,
          rol: rol, // INSTRUCTOR TEORÍA o AUXILIAR ADMINISTRATIVO
          estado_registro: 'Abierto'
          // demás campos propios de práctica quedan nulos
        }])

      if (error) {
        console.error('Supabase insert error (entrada):', error)
        toast.error('No se pudo registrar la entrada.')
        setGuardando(false)
        return
      }

      // Correo
      const correo = await obtenerEmailUsuario()
      if (correo) {
        const asunto = `Entrada registrada - ${fecha}`
        const html = `
          <p>Hola ${user.nombreCompleto},</p>
          <p>Se registró tu <b>entrada</b> correctamente.</p>
          <ul>
            <li><b>Fecha:</b> ${fecha}</li>
            <li><b>Hora:</b> ${hora}</li>
            <li><b>Usuario:</b> ${user.usuario}</li>
            <li><b>Rol:</b> ${rol}</li>
          </ul>
        `
        enviarCorreo({ para: correo, asunto, html })
      }

      toast.success('Entrada registrada.')
      // Cerrar sesión como solicitaste
      await new Promise(r => setTimeout(r, 600))
      cerrarSesion(router)
    } finally {
      setGuardando(false)
    }
  }

  // Salida
  const registrarSalida = async () => {
    if (!salidaHabilitada || !user || !registroAbierto) return
    setGuardando(true)
    try {
      const { fecha, hora, timestamp } = ahoraBogota()

      // Calcular duración (minutos) entre timestamp_entrada y ahora
      const tsIn = registroAbierto.timestamp_entrada
      const tsOut = timestamp
      let minutos = 0
      try {
        const start = new Date(tsIn).getTime()
        const end   = new Date(tsOut).getTime()
        minutos = Math.max(0, Math.round((end - start) / (1000 * 60)))
      } catch {
        minutos = 0
      }

      const { error } = await supabase
        .from('horarios')
        .update({
          timestamp_salida: timestamp,
          fecha_salida: fecha,
          hora_salida: hora,
          duracion_jornada: minutos, // guardado en minutos (entero, sin decimales)
          estado_registro: 'Cerrado'
        })
        .eq('id', registroAbierto.id)

      if (error) {
        console.error('Supabase update error (salida):', error)
        toast.error('No se pudo registrar la salida.')
        setGuardando(false)
        return
      }

      // Correo
      const correo = await obtenerEmailUsuario()
      if (correo) {
        const asunto = `Salida registrada - ${fecha}`
        const html = `
          <p>Hola ${user.nombreCompleto},</p>
          <p>Se registró tu <b>salida</b> correctamente.</p>
          <ul>
            <li><b>Fecha:</b> ${fecha}</li>
            <li><b>Hora:</b> ${hora}</li>
            <li><b>Duración:</b> ${humanHM(minutos)}</li>
            <li><b>Usuario:</b> ${user.usuario}</li>
            <li><b>Rol:</b> ${user.rol}</li>
          </ul>
        `
        enviarCorreo({ para: correo, asunto, html })
      }

      toast.success(`Salida registrada. Duración: ${humanHM(minutos)}`)

      // Cerrar sesión como solicitaste
      await new Promise(r => setTimeout(r, 800))
      cerrarSesion(router)
    } finally {
      setGuardando(false)
    }
  }

  // ---- Render ----
  if (!user) return <p className="text-center mt-20">Cargando...</p>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <Toaster position="top-center" richColors />
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">

        

        {/* Encabezado */}
        <div className="flex flex-col items-center mb-6">
          <i className="fas fa-clock text-3xl text-[var(--primary)] mb-2"></i>
          <h2 className="text-xl font-bold uppercase text-[var(--primary)] text-center">
            Registro de Horarios
          </h2>
        </div>

        {/* Info usuario */}
        <p className="bg-blue-50 border border-blue-200 text-[var(--primary-dark)] p-2 rounded-md mb-6 text-center text-sm">
          Usuario: <strong>{user.nombreCompleto}</strong> ({user.rol})
        </p>

        {/* Mensaje estado */}
        <div
          id="status-message"
          className="text-center text-sm font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-4 min-h-[1.5em]"
        >
          {statusMessage}
        </div>

        {/* Asistencia reunión (visible solo si hay reunión activa) */}
        <div
          id="asistenciaReunionContainer"
          className={`${reunionActiva ? '' : 'hidden'} text-center mb-6`}
        >
          <button
            onClick={registrarAsistenciaReunion}
            disabled={enviandoAsistencia}
            className="text-[var(--primary)] hover:underline flex items-center justify-center gap-2 mx-auto disabled:opacity-60"
            title={reunionActiva ? `Reunión: ${reunionActiva.tipo_reunion} (${reunionActiva.hora_inicio}–${reunionActiva.hora_fin})` : ''}
          >
            <i className="fas fa-check-circle"></i>
            {enviandoAsistencia ? 'Enviando...' : 'Registrar asistencia a reunión'}
          </button>
        </div>

        {/* Botones principales en cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={registrarEntrada}
            disabled={!entradaHabilitada}
            className={`h-24 flex flex-col items-center justify-center gap-2 rounded-lg 
                       bg-white text-gray-700 shadow-lg border border-gray-300
                       hover:bg-[var(--primary)] hover:text-white 
                       transform hover:-translate-y-1 hover:shadow-xl
                       transition-all duration-200 ease-in-out text-sm font-medium
                       ${!entradaHabilitada ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
          >
            <i className="fas fa-sign-in-alt text-2xl"></i>
            Entrada
          </button>
          <button
            onClick={registrarSalida}
            disabled={!salidaHabilitada}
            className={`h-24 flex flex-col items-center justify-center gap-2 rounded-lg 
                       bg-white text-gray-700 shadow-lg border border-gray-300
                       hover:bg-[var(--primary)] hover:text-white 
                       transform hover:-translate-y-1 hover:shadow-xl
                       transition-all duration-200 ease-in-out text-sm font-medium
                       ${!salidaHabilitada ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
          >
            <i className="fas fa-sign-out-alt text-2xl"></i>
            Salida
          </button>
        </div>

        {/* Botón cerrar sesión */}
        <div className="flex justify-center">
          <button
            onClick={() => cerrarSesion(router)}
            className="bg-[var(--danger)] hover:bg-[var(--danger-dark)] 
                       text-white font-medium py-2 px-6 rounded-lg 
                       flex items-center justify-center gap-2 
                       shadow-md hover:shadow-lg transition text-sm"
          >
            <i className="fas fa-sign-out-alt"></i>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
