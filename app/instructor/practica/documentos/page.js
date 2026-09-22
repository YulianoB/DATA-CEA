// app/instructor/practica/documentos/page.js

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cerrarSesion } from '@/lib/auth/logout'

export default function DocumentosPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)

  // ============================================================
  // Cargar sesión
  // ============================================================

  useEffect(() => {
    const storedUser =
      localStorage.getItem('currentUser')

    if (!storedUser) {
      router.push('/login')
      return
    }

    try {
      const parsed =
        JSON.parse(storedUser)

      setUser(parsed)
    } catch (error) {
      console.error(
        'Error leyendo sesión:',
        error
      )

      localStorage.removeItem(
        'currentUser'
      )

      router.push('/login')
    }
  }, [router])

  // ============================================================
  // Logout
  // ============================================================

  const handleLogout = () =>
    cerrarSesion(router)

  // ============================================================
  // Render
  // ============================================================

  if (!user) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  const menuButtons = [
    {
      icon:
        'fa-user-edit',

      label:
        'Instructores',

      route:
        '/instructor/practica/documentos/instructores',
    },
    {
      icon:
        'fa-car',

      label:
        'Vehículos',

      route:
        '/instructor/practica/documentos/vehiculos',
    },
  ]

  return (
    <div
      className="
        min-h-screen
        flex
        justify-center
        items-start
        sm:items-center
        bg-gradient-to-br
        from-gray-100
        to-gray-200
        p-4
        pt-14
        sm:pt-0
      "
    >
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6">

        {/* ====================================================
            ENCABEZADO
        ==================================================== */}

        <div className="flex flex-col items-center mb-6">

          <i className="fas fa-file-upload text-3xl text-[var(--primary)] mb-2"></i>

          <h2 className="text-xl font-bold uppercase text-[var(--primary)] text-center">
            Actualizar Documentos
          </h2>

        </div>

        {/* ====================================================
            INFORMACIÓN DEL USUARIO
        ==================================================== */}

        <div className="bg-blue-50 border border-blue-200 text-[var(--primary-dark)] p-2 rounded-md mb-6 text-center text-sm">

          <span>
            Usuario:{' '}
            <strong>
              {user.nombreCompleto}
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
            OPCIONES
        ==================================================== */}

        <div className="grid grid-cols-2 gap-4 mb-6">

          {menuButtons.map(
            (btn) => (
              <button
                key={btn.route}
                onClick={() =>
                  router.push(
                    btn.route
                  )
                }
                className="
                  h-28
                  flex
                  flex-col
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  bg-white
                  text-gray-700
                  shadow-lg
                  border
                  border-gray-300
                  hover:bg-[var(--primary)]
                  hover:text-white
                  transform
                  hover:-translate-y-1
                  hover:shadow-xl
                  transition-all
                  duration-200
                  ease-in-out
                  text-sm
                  font-medium
                "
              >

                <i
                  className={`fas ${btn.icon} text-2xl`}
                ></i>

                {btn.label}

              </button>
            )
          )}

        </div>

        {/* ====================================================
            NAVEGACIÓN
        ==================================================== */}

        <div className="flex justify-center gap-3 mt-6 flex-wrap">

          <button
            onClick={() =>
              router.push(
                '/instructor/practica'
              )
            }
            className="
              bg-gray-600
              hover:bg-gray-800
              text-white
              py-2
              px-4
              rounded-lg
              shadow-md
              flex
              items-center
              gap-2
              text-sm
            "
          >

            <i className="fas fa-arrow-left"></i>

            Regresar

          </button>

          <button
            onClick={
              handleLogout
            }
            className="
              bg-[var(--danger)]
              hover:bg-[var(--danger-dark)]
              text-white
              py-2
              px-4
              rounded-lg
              shadow-md
              flex
              items-center
              gap-2
              text-sm
            "
          >

            <i className="fas fa-sign-out-alt"></i>

            Cerrar Sesión

          </button>

        </div>

        {/* ====================================================
            MENSAJE
        ==================================================== */}

        <p className="text-center text-sm text-gray-600 mt-4 min-h-[1.5em]">
          Selecciona una opción para actualizar documentos
        </p>

      </div>
    </div>
  )
}