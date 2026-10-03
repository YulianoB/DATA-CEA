// app/admin/pesv/page.jsx

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


// ============================================================
// PÁGINA PRINCIPAL PESV
// ============================================================

export default function PesvPage() {
  const router =
    useRouter()

  const [
    user,
    setUser,
  ] =
    useState(
      null
    )

  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(
    () => {
      const storedUser =
        localStorage.getItem(
          'currentUser'
        )

      if (
        !storedUser
      ) {
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
      } catch (
        error
      ) {
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
    },
    [
      router,
    ]
  )

  // ==========================================================
  // NAVEGACIÓN
  // ==========================================================

  const opciones =
    [
      {
        icon:
          'fa-chart-pie',

        titulo:
          'Tablero',

        descripcion:
          'Resumen general del estado y comportamiento de los indicadores PESV.',

        route:
          '/admin/pesv',
      },

      {
        icon:
          'fa-bullseye',

        titulo:
          'Objetivos y Metas',

        descripcion:
          'Definición y seguimiento de objetivos, metas e indicadores asociados.',

        route:
          '/admin/pesv/objetivos-metas',
      },

      {
        icon:
          'fa-clipboard-list',

        titulo:
          'Plan Anual de Trabajo',

        descripcion:
          'Planeación y seguimiento de las actividades anuales del PESV.',

        route:
          '/admin/pesv/plan-trabajo',
      },

      {
        icon:
          'fa-chalkboard-teacher',

        titulo:
          'Plan Anual de Formación',

        descripcion:
          'Programación y control de capacitaciones de seguridad vial.',

        route:
          '/admin/pesv/plan-formacion',
      },

            {
        icon:
          'fa-wallet',

        titulo:
          'Presupuesto PESV',

        descripcion:
          'Planeación, ejecución y seguimiento de los recursos financieros destinados al PESV.',

        route:
          '/admin/pesv/presupuesto',

      },

      {
        icon:
          'fa-exclamation-triangle',

        titulo:
          'Matriz de Riesgos',

        descripcion:
          'Identificación, valoración, tratamiento y seguimiento de riesgos viales.',

        route:
          '/admin/pesv/riesgos',
      },

      {
        icon:
          'fa-clipboard-check',

        titulo:
          'Auditoría / No Conformidades',

        descripcion:
          'Registro de auditorías, hallazgos, no conformidades y acciones correctivas.',

        route:
          '/admin/pesv/auditorias',
      },

      {
        icon:
          'fa-chart-line',

        titulo:
          'Indicadores',

        descripcion:
          'Consulta de indicadores mensuales, trimestrales y acumulados anuales.',

        route:
          '/admin/pesv/indicadores',
      },

      {
        icon:
          'fa-file-alt',

        titulo:
          'Informes de Gestión',

        descripcion:
          'Generación de informes de gestión y seguimiento del PESV.',

        route:
          '/admin/pesv/informes',
      },
    ]

  // ==========================================================
  // CARGANDO
  // ==========================================================

  if (
    !user
  ) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  // ==========================================================
  // RENDER
  // ==========================================================

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
          max-w-6xl
          mx-auto
          bg-white
          border
          border-gray-200
          shadow-lg
          rounded-xl
          overflow-hidden
        "
      >

        {/* ==================================================
            ENCABEZADO
        ================================================== */}

        <div
          className="
            bg-slate-800
            text-white
            px-5
            py-4
            flex
            flex-col
            md:flex-row
            md:items-center
            md:justify-between
            gap-3
          "
        >

          <div>

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <i
                className="
                  fas
                  fa-road
                  text-2xl
                "
              ></i>

              <div>

                <h1
                  className="
                    text-xl
                    font-black
                    uppercase
                    tracking-wide
                  "
                >
                  PESV
                </h1>

                <p
                className="
                    text-[11px]
                    text-slate-300
                    mt-0.5
                "
                >
                Plan Estratégico de Seguridad Vial
                </p>

                <div
                className="
                    mt-1.5
                    text-[10px]
                    text-slate-300
                "
                >
                Usuario:{' '}

                <strong className="text-white">
                    {user.nombreCompleto ||
                    user.nombre_completo ||
                    user.usuario ||
                    '-'}
                </strong>

                {(user?.nombreEmpresa ||
                    user?.nombre_empresa) && (
                    <>
                    <span className="mx-1.5 text-slate-500">
                        ·
                    </span>

                    CEA:{' '}

                    <strong className="text-white">
                        {user.nombreEmpresa ||
                        user.nombre_empresa}
                    </strong>
                    </>
                )}
                </div>

              </div>

            </div>

          </div>

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <button
              type="button"
              onClick={() =>
                router.push(
                  '/admin'
                )
              }
              className="
                bg-white/10
                hover:bg-white/20
                border
                border-white/20
                text-white
                px-3
                py-1.5
                rounded
                text-[11px]
              "
            >
              <i className="fas fa-arrow-left mr-1.5"></i>

              Menú Administrativo
            </button>

            <button
              type="button"
              onClick={() =>
                cerrarSesion(
                  router
                )
              }
              className="
                bg-[var(--danger)]
                hover:bg-[var(--danger-dark)]
                text-white
                px-3
                py-1.5
                rounded
                text-[11px]
              "
            >
              <i className="fas fa-sign-out-alt mr-1.5"></i>

              Cerrar Sesión
            </button>

          </div>

        </div>

        

        {/* ==================================================
            CONTENIDO
        ================================================== */}

        <div className="p-4 md:p-6">

          <div
            className="
              mb-5
            "
          >

            <h2
              className="
                text-sm
                font-black
                uppercase
                text-gray-800
              "
            >
              Gestión del PESV
            </h2>

            <p
              className="
                mt-1
                text-[11px]
                text-gray-500
              "
            >
              Planeación, seguimiento, indicadores e informes de gestión del Plan Estratégico de Seguridad Vial.
            </p>

          </div>

          {/* ================================================
              ACCESOS DEL MÓDULO
          ================================================ */}

          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              lg:grid-cols-4
              gap-4
            "
          >

            {opciones.map(
              opcion => (
                <button
                  key={
                    opcion.route +
                    opcion.titulo
                  }
                  type="button"
                  onClick={() =>
                    router.push(
                      opcion.route
                    )
                  }
                  className="
                    group
                    min-h-[145px]
                    bg-white
                    border
                    border-gray-300
                    hover:border-blue-400
                    hover:bg-blue-50
                    rounded-xl
                    p-4
                    text-left
                    shadow-sm
                    hover:shadow-md
                    transition-all
                    duration-200
                  "
                >

                  <div
                    className="
                      w-10
                      h-10
                      rounded-lg
                      bg-slate-100
                      group-hover:bg-blue-100
                      text-slate-700
                      group-hover:text-blue-700
                      flex
                      items-center
                      justify-center
                      mb-3
                    "
                  >

                    <i
                      className={`fas ${opcion.icon} text-lg`}
                    ></i>

                  </div>

                  <div
                    className="
                      text-[11px]
                      font-black
                      uppercase
                      text-gray-800
                      leading-tight
                    "
                  >
                    {opcion.titulo}
                  </div>

                  <div
                    className="
                      mt-2
                      text-[10px]
                      leading-relaxed
                      text-gray-500
                    "
                  >
                    {opcion.descripcion}
                  </div>

                </button>
              )
            )}

          </div>

        </div>

      </div>

    </div>
  )
}