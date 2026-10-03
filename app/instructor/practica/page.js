// app/instructor/practica/page.js

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster, toast } from 'sonner'
import {
  CalendarDays,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  FileUp,
  LogOut,
  TriangleAlert,
  Wrench,
} from 'lucide-react'

export default function InstructorPracticaPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const nitActual =
    user?.nitEmpresa ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('currentEmpresaNit')
      : '') ||
    ''

  const [reunionActiva, setReunionActiva] = useState(null)
  const [enviandoAsistencia, setEnviandoAsistencia] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) setUser(JSON.parse(storedUser))
    else router.push('/login')
  }, [router])

  useEffect(() => {
    if (!user || !nitActual) return
    let alive = true

    const fetchActiva = async () => {
      try {
        const res = await fetch(
          `/api/reuniones/activa?nit=${encodeURIComponent(nitActual)}`,
          { cache: 'no-store' }
        )
        const json = await res.json()
        if (!alive) return
        setReunionActiva(json?.data || null)
      } catch {
        // silencio
      }
    }

    fetchActiva()
    const id = setInterval(fetchActiva, 60_000)

    return () => {
      alive = false
      clearInterval(id)
    }
  }, [user, nitActual])

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    localStorage.removeItem('currentEmpresaNit')
    localStorage.removeItem('currentEmpresaNombre')
    localStorage.removeItem('currentPerfilRol')
    localStorage.removeItem('currentPerfilMenu')
    router.push('/login')
  }

  const registrarAsistenciaReunion = async () => {
    try {
      if (!reunionActiva?.enlace_asistencia) {
        toast.warning('No hay reunión activa.')
        return
      }

      const s = localStorage.getItem('currentUser')
      if (!s) {
        toast.error('No hay usuario en sesión.')
        return
      }

      const u = JSON.parse(s)
      if (!u?.documento) {
        toast.error('Usuario sin documento.')
        return
      }

      setEnviandoAsistencia(true)

      const res = await fetch('/api/asistencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nit: nitActual,
          enlace_asistencia: reunionActiva.enlace_asistencia,
          user: {
            documento: u.documento,
            nombreCompleto: u.nombreCompleto,
            role: u.rol || u.role,
          },
        }),
      })

      const json = await res.json()

      if (json.status === 'success') {
        toast.success('✅ Asistencia registrada.')
      } else if (json.status === 'warning') {
        toast.warning(json.message || 'Aviso.')
      } else {
        toast.error(json.message || 'Error al registrar asistencia.')
      }
    } catch {
      toast.error('Error al registrar asistencia.')
    } finally {
      setEnviandoAsistencia(false)
    }
  }

  if (!user) {
    return <p className="text-center mt-20">Cargando...</p>
  }

  const menuButtons = [
    {
      icon: CalendarDays,
      label: 'Programación de Clases',
      route: '/instructor/practica/programacion',
    },
    {
      icon: ClipboardCheck,
      label: 'Registrar Preoperacionales',
      route: '/instructor/practica/inspeccion',
    },
    {
      icon: CalendarDays,
      label: 'Registrar Horarios de Práctica',
      route: '/instructor/practica/horarios',
    },
    {
      icon: Wrench,
      label: 'Registrar Mantenimientos',
      route: '/instructor/practica/mantenimientos',
    },
    {
      icon: Wrench,
      label: 'Plan de Mantenimiento',
      route: '/instructor/practica/plan-mantenimiento',
    },
    {
      icon: CarFront,
      label: 'Registrar Siniestros Viales',
      route: '/instructor/practica/siniestros',
    },
    {
      icon: TriangleAlert,
      label: 'Registrar Fallas en Ruta',
      route: '/instructor/practica/fallas',
    },
    {
      icon: FileUp,
      label: 'Actualizar Documentos',
      route: '/instructor/practica/documentos',
    },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
      <Toaster position="top-center" richColors />

      <div className="max-w-2xl w-full bg-white rounded-xl border border-[#DCE4EB] shadow-lg p-6">

        {/* CABECERA COMPACTA: conserva el ancho móvil del contenedor */}
        <div className="relative grid grid-cols-[52px_1fr_52px] items-start gap-2 mb-3">
          <div className="flex justify-start">
            <img
              src="/logo.png"
              alt="DATA CEA"
              className="h-11 w-auto object-contain"
            />
          </div>

          <div className="min-w-0 text-center">
            <h2 className="text-lg font-semibold uppercase text-[#173A57] leading-tight">
              Menú Instructor Práctica
            </h2>

            <p className="mt-1 text-[11px] leading-tight text-[#64748B] truncate">
              {user.nombreCompleto}
            </p>

            {user.nombreEmpresa && (
              <p className="mt-0.5 text-[10px] leading-tight text-[#64748B] truncate">
                {user.nombreEmpresa}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleLogout}
              className="h-9 w-9 rounded-lg border border-[#CBD5E1] bg-white text-[#475569]
                         flex items-center justify-center shadow-sm
                         hover:bg-[#C93C3C] hover:border-[#C93C3C] hover:text-white
                         hover:-translate-y-0.5 transition-all"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="w-full h-[3px] bg-[#173A57] rounded-full mb-4" />

        {reunionActiva ? (
          <div className="mb-4 text-center">
            <button
              onClick={registrarAsistenciaReunion}
              disabled={enviandoAsistencia}
              className="text-[#173A57] hover:text-[#0968B0] hover:underline
                         flex items-center justify-center gap-2 mx-auto
                         disabled:opacity-60 text-sm transition-colors"
              title={`Reunión: ${reunionActiva.tipo_reunion} (${reunionActiva.hora_inicio}–${reunionActiva.hora_fin})`}
            >
              <CheckCircle2 size={18} />
              {enviandoAsistencia
                ? 'Enviando...'
                : 'Registrar asistencia a reunión'}
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-4">
          {menuButtons.map((btn, i) => {
            const Icono = btn.icon

            return (
              <button
                key={i}
                onClick={() => router.push(btn.route)}
                className="h-24 flex flex-col items-center justify-center gap-2 rounded-lg
                           bg-[#DCEEF9] text-[#263746] shadow-md border border-[#A9BDCC]
                           hover:bg-[#173A57] hover:text-white
                           transform hover:-translate-y-1 hover:shadow-xl
                           transition-all duration-200 ease-in-out
                           text-sm font-medium text-center px-2"
              >
                <Icono size={26} strokeWidth={2} />
                {btn.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )}
