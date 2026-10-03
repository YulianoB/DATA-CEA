// app/admin/page.js

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cerrarSesion } from '@/lib/auth/logout'

export default function AdminPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)

  // ============================================================
  // SESIÓN
  // ============================================================

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')

    if (!storedUser) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(storedUser)
      setUser(parsedUser)
    } catch (error) {
      console.error('Error leyendo sesión:', error)

      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }, [router])

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => cerrarSesion(router)

  // ============================================================
  // NAVEGACIÓN
  // ============================================================

  const handleNavigation = (route) => {
    router.push(route)
  }

  // ============================================================
  // MENÚ ADMINISTRATIVO
  // ============================================================

  const menuButtons = [
    {
      icon: 'fa-user-graduate',
      label: 'Matrículas y Consultas',
      route: '/admin/inscripciones',
    },
    {
      icon: 'fa-cash-register',
      label: 'Caja',
      route: '/admin/caja',
    },
    {
      icon: 'fa-calendar-alt',
      label: 'Programación',
      route: '/admin/programacion',
    },
    {
      icon: 'fa-desktop',
      label: 'Control SICOV',
      route: '/admin/sicov',
    },
    {
      icon: 'fa-id-card',
      label: 'Control RUNT',
      route: '/admin/runt',
    },
    {
      icon: 'fa-file-excel',
      label: 'Control SIET',
      route: '/admin/siet',
    },
    {
      icon: 'fa-users',
      label: 'Personal CEA',
      route: '/admin/personal',
    },
    {
      icon: 'fa-car',
      label: 'Vehículos CEA',
      route: '/admin/vehiculos',
    },
    {
      icon: 'fa-chart-line',
      label: 'Consultas y Seguimiento Operativo',
      route: '/admin/consultas',
    },
    {
      icon: 'fa-book-open',
      label: 'Configuración Académica',
      route: '/admin/configuracion-academica',
    },
    {
      icon: 'fa-users-cog',
      label: 'Reuniones CEA',
      route: '/admin/reuniones',
    },
    {
      icon: 'fa-file-invoice',
      label: 'Configuración de Documentos',
      route: '/admin/configuracion-documentos',
    },
    {
      icon: 'fa-road',
      label: 'PESV',
      route: '/admin/pesv',
    },
    {
      icon: 'fa-file-alt',
      label: 'Reporte SINST - VIGIA 2',
      route: '/admin/sinst-vigia',
    },
    {
      icon: 'fa-tools',
      label: 'Plan de Mantenimiento Vehicular',
      route: '/admin/mantenimientos',
    },
  ]

  // ============================================================
  // CARGANDO
  // ============================================================

  if (!user) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-6">

      <div className="max-w-6xl w-full bg-white border border-gray-200 shadow-lg rounded-lg p-8">

        {/* ====================================================
            TÍTULO
        ==================================================== */}

        <div className="flex items-center justify-center gap-3 mb-6 border-b pb-3 border-[var(--primary)]">

          <i className="fas fa-cogs text-3xl text-[var(--primary)]"></i>

          <h2 className="text-2xl font-bold uppercase text-[var(--primary)]">
            Menú Administrativo
          </h2>

        </div>

        {/* ====================================================
            USUARIO
        ==================================================== */}

        <div className="bg-blue-50 border border-blue-200 text-[var(--primary-dark)] p-2 rounded-md mb-6 text-center text-sm">

          <span>
            Usuario:{' '}

            <strong>
              {user.nombreCompleto ||
                user.nombre_completo ||
                user.usuario ||
                '-'}
            </strong>
          </span>

          {user.rol && (
            <span>
              {' '}
              ({user.rol})
            </span>
          )}

          {user.nombreEmpresa && (
            <span className="block mt-1">
              CEA:{' '}

              <strong>
                {user.nombreEmpresa}
              </strong>
            </span>
          )}

        </div>

        {/* ====================================================
            ACCESOS
        ==================================================== */}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">

          {menuButtons.map((btn) => (

            <button
              key={btn.route}
              onClick={() => handleNavigation(btn.route)}
              className="
                bg-blue-50
                border
                border-blue-200
                hover:bg-[var(--primary)]
                hover:text-white
                text-gray-700
                rounded-lg
                h-28
                flex
                flex-col
                items-center
                justify-center
                gap-2
                shadow
                hover:shadow-lg
                transform
                hover:-translate-y-1
                transition-all
                duration-200
                px-2
              "
            >

              <i
                className={`fas ${btn.icon} text-3xl`}
              ></i>

              <span className="text-sm font-semibold text-center leading-tight">
                {btn.label}
              </span>

            </button>

          ))}

        </div>

        {/* ====================================================
            LOGOUT
        ==================================================== */}

        <div className="flex justify-center mt-10">

          <button
            onClick={handleLogout}
            className="
              bg-[var(--danger)]
              hover:bg-[var(--danger-dark)]
              text-white
              font-medium
              py-2
              px-6
              rounded-lg
              flex
              items-center
              justify-center
              gap-2
              shadow-md
              transition
              text-sm
            "
          >

            <i className="fas fa-sign-out-alt"></i>

            Cerrar Sesión

          </button>

        </div>

      </div>

    </div>
  )
}
