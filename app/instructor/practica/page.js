'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster, toast } from 'sonner'

export default function InstructorPracticaPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // === Reuniones: estado y polling de reunión activa ===
  const [reunionActiva, setReunionActiva] = useState(null)
  const [enviandoAsistencia, setEnviandoAsistencia] = useState(false)

  // Cargar usuario
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) setUser(JSON.parse(storedUser))
    else router.push('/login')
  }, [router])

  // Polling solo cuando hay usuario cargado
  useEffect(() => {
    if (!user) return
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
  }, [user])

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    router.push('/login')
  }

  // === Reuniones: registrar asistencia ===
  const registrarAsistenciaReunion = async () => {
    try {
      if (!reunionActiva?.enlace_asistencia) { toast.warning('No hay reunión activa.'); return }
      const s = localStorage.getItem('currentUser')
      if (!s) { toast.error('No hay usuario en sesión.'); return }
      const u = JSON.parse(s)
      if (!u?.documento) { toast.error('Usuario sin documento.'); return }

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

  if (!user) return <p className="text-center mt-20">Cargando...</p>

  const menuButtons = [
    { icon: 'fa-clipboard-check', label: 'Registrar Preoperacionales', route: '/instructor/practica/inspeccion' },
    { icon: 'fa-calendar-alt', label: 'Registrar Horarios de Práctica', route: '/instructor/practica/horarios' },
    { icon: 'fa-tools', label: 'Registrar Mantenimientos', route: '/instructor/practica/mantenimientos' },
    { icon: 'fa-car-crash', label: 'Registrar Siniestros Viales', route: '/instructor/practica/siniestros' },
    { icon: 'fa-exclamation-circle', label: 'Registrar Fallas en Ruta', route: '/instructor/practica/fallas' },
    { icon: 'fa-upload', label: 'Actualizar Documentos', route: '/instructor/practica/documentos' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <Toaster position="top-center" richColors />
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6">
        
        {/* Encabezado */}
        <div className="flex flex-col items-center mb-6">
          <i className="fas fa-user-cog text-3xl text-[var(--primary)] mb-2"></i>
          <h2 className="text-xl font-bold uppercase text-[var(--primary)] text-center">
            Menú Instructor Práctica
          </h2>
        </div>

        {/* Info usuario */}
        <p className="bg-blue-50 border border-blue-200 text-[var(--primary-dark)] p-2 rounded-md mb-6 text-center text-sm">
          Usuario: <strong>{user.nombreCompleto}</strong> ({user.rol})
        </p>

        {/* Enlace de asistencia (visible solo si hay reunión activa) */}
        {reunionActiva ? (
          <div className="mb-4 text-center">
            <button
              onClick={registrarAsistenciaReunion}
              disabled={enviandoAsistencia}
              className="text-[var(--primary)] hover:underline flex items-center justify-center gap-2 mx-auto disabled:opacity-60 text-sm"
              title={`Reunión: ${reunionActiva.tipo_reunion} (${reunionActiva.hora_inicio}–${reunionActiva.hora_fin})`}
            >
              <i className="fas fa-check-circle"></i>
              {enviandoAsistencia ? 'Enviando...' : 'Registrar asistencia a reunión'}
            </button>
          </div>
        ) : null}

        {/* Botones de navegación en grid responsivo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-4">
          {menuButtons.map((btn, i) => (
            <button
              key={i}
              onClick={() => router.push(btn.route)}
              className="h-24 flex flex-col items-center justify-center gap-2 rounded-lg 
                         bg-white text-gray-700 shadow-lg border border-gray-300
                         hover:bg-[var(--primary)] hover:text-white 
                         transform hover:-translate-y-1 hover:shadow-xl
                         transition-all duration-200 ease-in-out 
                         text-sm font-medium"
            >
              <i className={`fas ${btn.icon} text-2xl`}></i>
              {btn.label}
            </button>
          ))}
        </div>

        {/* Botón logout */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLogout}
            className="bg-[var(--danger)] hover:bg-[var(--danger-dark)] text-white font-medium 
                       py-2 px-6 rounded-lg flex items-center justify-center gap-2 
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
