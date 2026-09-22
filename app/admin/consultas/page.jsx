// app/admin/consultas/page.jsx

'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  cerrarSesion,
} from '@/lib/auth/logout'

export default function ConsultasHomePage() {
  const router =
    useRouter()

  const [
    user,
    setUser,
  ] =
    useState(null)

  // ============================================================
  // SESIÓN
  // ============================================================

  useEffect(() => {
    const storedUser =
      localStorage.getItem(
        'currentUser'
      )

    if (!storedUser) {
      router.push(
        '/login'
      )

      return
    }

    try {
      const parsedUser =
        JSON.parse(
          storedUser
        )

      setUser(
        parsedUser
      )
    } catch (error) {
      console.error(
        'Error leyendo sesión:',
        error
      )

      localStorage.removeItem(
        'currentUser'
      )

      router.push(
        '/login'
      )
    }
  }, [
    router,
  ])

  // ============================================================
  // NAVEGACIÓN
  // ============================================================

  const handleNavigation =
    (ruta) => {
      router.push(
        ruta
      )
    }

  // ============================================================
  // CONSULTAS
  // ============================================================

  const consultas = [
    {
      icon:
        'fa-calendar-alt',

      label:
        'Horarios',

      descripcion:
        'Jornadas laborales',

      ruta:
        '/admin/consultas/horarios',
    },

    {
      icon:
        'fa-clipboard-check',

      label:
        'Preoperacionales',

      descripcion:
        'Inspecciones y seguimiento',

      ruta:
        '/admin/consultas/preoperacionales',
    },

    {
      icon:
        'fa-road',

      label:
        'Kilómetros',

      descripcion:
        'Kilometraje de la flota',

      ruta:
        '/admin/consultas/kilometros',
    },

    {
      icon:
        'fa-tools',

      label:
        'Mantenimientos',

      descripcion:
        'Preventivos y correctivos',

      ruta:
        '/admin/consultas/mantenimientos',
    },

    {
      icon:
        'fa-car-crash',

      label:
        'Siniestros',

      descripcion:
        'Siniestros viales',

      ruta:
        '/admin/consultas/siniestros',
    },

    {
      icon:
        'fa-triangle-exclamation',

      label:
        'Fallas',

      descripcion:
        'Reportes y seguimiento',

      ruta:
        '/admin/consultas/fallas',
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

      <div className="max-w-5xl w-full bg-white border border-gray-200 shadow-lg rounded-lg p-8">

        {/* ==================================================
            TÍTULO
        ================================================== */}

        <div className="flex items-center justify-center gap-3 mb-6 border-b pb-3 border-[var(--primary)]">

          <i className="fas fa-database text-3xl text-[var(--primary)]"></i>

          <h2 className="text-2xl font-bold uppercase text-[var(--primary)]">
            Consultas Administrativas
          </h2>

        </div>

        {/* ==================================================
            USUARIO
        ================================================== */}

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

        {/* ==================================================
            TEXTO INTRODUCTORIO
        ================================================== */}

        <p className="text-center text-sm text-gray-600 mb-7">

          Seleccione la información que desea consultar.

        </p>

        {/* ==================================================
            TARJETAS
        ================================================== */}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">

          {consultas.map(
            (consulta) => (

              <button
                key={
                  consulta.label
                }
                onClick={() =>
                  handleNavigation(
                    consulta.ruta
                  )
                }
                className="
                  bg-blue-50
                  border
                  border-blue-200
                  hover:bg-[var(--primary)]
                  hover:text-white
                  text-gray-700
                  rounded-lg
                  min-h-32
                  p-4
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
                  group
                "
              >

                <i
                  className={`fas ${consulta.icon} text-3xl`}
                ></i>

                <span className="text-sm font-bold">
                  {consulta.label}
                </span>

                <span className="text-xs text-gray-500 group-hover:text-blue-100 text-center">
                  {consulta.descripcion}
                </span>

              </button>

            )
          )}

        </div>

        {/* ==================================================
            BOTONES
        ================================================== */}

        <div className="flex justify-center gap-3 mt-10 flex-wrap">

          <button
            onClick={() =>
              router.push(
                '/admin'
              )
            }
            className="
              bg-gray-600
              hover:bg-gray-800
              text-white
              font-medium
              py-2
              px-5
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

            <i className="fas fa-arrow-left"></i>

            Menú Administrativo

          </button>

          <button
            onClick={() =>
              cerrarSesion(
                router
              )
            }
            className="
              bg-[var(--danger)]
              hover:bg-[var(--danger-dark)]
              text-white
              font-medium
              py-2
              px-5
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