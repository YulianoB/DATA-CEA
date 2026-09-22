// app/admin/configuracion-academica/page.jsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'


export default function ConfiguracionAcademicaPage() {
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
      console.error(
        'Error leyendo sesión:',
        error
      )

      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }, [router])

  // ============================================================
  // NAVEGACIÓN
  // ============================================================

  const handleNavigation = (route) => {
    router.push(route)
  }

  const handleBack = () => {
  router.push('/admin')
    }

    const handleLogout = () => {
    localStorage.removeItem('currentUser')
    router.replace('/login')
    }

  // ============================================================
  // OPCIONES DEL MÓDULO
  // ============================================================

  const opciones = [
    {
      icon: 'fa-calendar-week',

      titulo: 'Horario Teórico',

      descripcion:
        'Crear, organizar y publicar horarios de clases teóricas y talleres.',

      detalle:
        'Permite preparar la programación académica por semana, quincena o mes, según la operación de cada CEA.',

      route:
        '/admin/configuracion-academica/horarios',
    },

    {
        icon: 'fa-book-open',

        titulo: 'Configuración de Clases y Contenidos',

        descripcion:
            'Configurar contenidos, duración y categorías.',

        detalle:
            'Permite definir las clases teóricas, talleres y contenidos de las clases prácticas que utiliza el CEA.',

        route:
            '/admin/configuracion-academica/clases',
        },
  ]

  // ============================================================
  // CARGANDO
  // ============================================================

  if (!user) {
    return (
      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-gradient-to-br
          from-gray-100
          to-gray-200
        "
      >
        <p className="text-gray-600">
          Cargando...
        </p>
      </div>
    )
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-br
        from-gray-100
        to-gray-200
        p-4
        md:p-6
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-6xl
          rounded-xl
          border
          border-gray-200
          bg-white
          p-5
          shadow-lg
          md:p-8
        "
      >
        {/* ====================================================
            ENCABEZADO
        ==================================================== */}

        <div
          className="
            mb-6
            border-b
            border-[var(--primary)]
            pb-4
          "
        >
          <div
            className="
              flex
              flex-col
              gap-4
              md:flex-row
              md:items-center
              md:justify-between
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-50
                  text-[var(--primary)]
                "
              >
                <i
                  className="
                    fas
                    fa-graduation-cap
                    text-2xl
                  "
                ></i>
              </div>

              <div>
                <h1
                  className="
                    text-xl
                    font-bold
                    uppercase
                    text-[var(--primary)]
                    md:text-2xl
                  "
                >
                  Configuración Académica
                </h1>

                <p
                  className="
                    mt-1
                    text-sm
                    text-gray-500
                  "
                >
                  Organización de planes de
                  formación y horarios
                  académicos del CEA.
                </p>
              </div>
            </div>

            <div
  className="
    flex
    flex-col
    gap-2
    sm:flex-row
  "
>
  <button
    type="button"
    onClick={handleBack}
    className="
      flex
      items-center
      justify-center
      gap-2
      rounded-lg
      bg-slate-700
      px-4
      py-2
      text-sm
      font-semibold
      text-white
      shadow-sm
      transition
      hover:bg-slate-800
    "
  >
    <i className="fas fa-arrow-left"></i>

            Menú Administrativo
        </button>

        <button
            type="button"
            onClick={handleLogout}
            className="
            flex
            items-center
            justify-center
            gap-2
            rounded-lg
            bg-red-600
            px-4
            py-2
            text-sm
            font-semibold
            text-white
            shadow-sm
            transition
            hover:bg-red-700
            "
        >
            <i className="fas fa-sign-out-alt"></i>

            Cerrar sesión
        </button>
        </div>
          </div>
        </div>

        {/* ====================================================
            INFORMACIÓN DEL CEA
        ==================================================== */}

        <div
          className="
            mb-7
            rounded-lg
            border
            border-blue-300
            bg-blue-50
            px-4
            py-3
            text-center
            text-sm
            text-[var(--primary-dark)]
          "
        >
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
            INTRODUCCIÓN
        ==================================================== */}

        <div className="mb-6">
          <h2
            className="
              text-base
              font-bold
              text-slate-800
            "
          >
            Gestión académica
          </h2>

          <p
            className="
              mt-1
              max-w-3xl
              text-sm
              leading-relaxed
              text-slate-600
            "
          >
            Desde este módulo se configura la
            estructura académica que utilizará
            cada CEA y se prepara la
            programación de sus clases
            teóricas y talleres.
          </p>
        </div>

        {/* ====================================================
            OPCIONES
        ==================================================== */}

        <div
          className="
            grid
            grid-cols-1
            gap-5
            md:grid-cols-2
          "
        >
          {opciones.map(
            (opcion, index) => (
              <button
                key={opcion.route}
                type="button"
                onClick={() =>
                  handleNavigation(
                    opcion.route
                  )
                }
                className="
                  group
                  flex
                  min-h-[220px]
                  w-full
                  flex-col
                  rounded-xl
                  border
                  border-gray-400
                  bg-white
                  p-6
                  text-left
                  shadow-sm
                  transition-all
                  duration-200
                  hover:-translate-y-1
                  hover:border--300
                  hover:shadow-lg
                "
              >
                <div
                  className="
                    mb-4
                    flex
                    items-start
                    justify-between
                    gap-4
                  "
                >
                  <div
                    className="
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-xl
                      bg-blue-50
                      text-[var(--primary)]
                      transition
                      group-hover:bg-[var(--primary)]
                      group-hover:text-white
                    "
                  >
                    <i
                      className={`
                        fas
                        ${opcion.icon}
                        text-2xl
                      `}
                    ></i>
                  </div>

                  <div
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-full
                      bg-gray-100
                      text-sm
                      font-bold
                      text-gray-500
                    "
                  >
                    {index + 1}
                  </div>
                </div>

                <h3
                  className="
                    text-lg
                    font-bold
                    text-slate-900
                  "
                >
                  {opcion.titulo}
                </h3>

                <p
                  className="
                    mt-2
                    text-sm
                    font-semibold
                    text-[var(--primary)]
                  "
                >
                  {opcion.descripcion}
                </p>

                <p
                  className="
                    mt-3
                    flex-1
                    text-sm
                    leading-relaxed
                    text-slate-500
                  "
                >
                  {opcion.detalle}
                </p>

                <div
                  className="
                    mt-5
                    flex
                    items-center
                    gap-2
                    text-sm
                    font-bold
                    text-[var(--primary)]
                  "
                >
                  Ingresar

                  <i
                    className="
                      fas
                      fa-arrow-right
                      text-xs
                      transition-transform
                      group-hover:translate-x-1
                    "
                  ></i>
                </div>
              </button>
            )
          )}
        </div>

        {/* ====================================================
            NOTA FUNCIONAL
        ==================================================== */}

        <div
          className="
            mt-7
            rounded-lg
            border
            border-gray-200
            bg-gray-50
            p-4
          "
        >
          <div
            className="
              flex
              items-start
              gap-3
            "
          >
            <i
              className="
                fas
                fa-info-circle
                mt-0.5
                text-[var(--primary)]
              "
            ></i>

            <div>
              <div
                className="
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Configuración por CEA
              </div>

              <div
                className="
                  mt-1
                  text-xs
                  leading-relaxed
                  text-slate-500
                "
              >
                Los planes, contenidos y
                horarios académicos
                corresponden al CEA de la
                sesión actual. La información
                académica de una empresa no
                debe mezclarse con la de otro
                CEA.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}