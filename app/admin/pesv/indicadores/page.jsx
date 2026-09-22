// app/admin/pesv/indicadores/page.jsx

'use client'

// ============================================================
// app/admin/pesv/indicadores/page.jsx
// MÓDULO PESV - INDICADORES
// ============================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  History,
  Home,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

import {
  cerrarSesion,
} from '@/lib/auth/logout'

import ResumenIndicadores
  from './componentes/ResumenIndicadores'

import MedicionIndicadores
  from './componentes/MedicionIndicadores'

import HistorialIndicadores
  from './componentes/HistorialIndicadores'

import MetodologiaIndicadores
  from './componentes/MetodologiaIndicadores'


// ============================================================
// CONSTANTES
// app/admin/pesv/indicadores/page.jsx
// ============================================================

const API_INDICADORES =
  '/api/admin/pesv/indicadores'


const PESTANAS = [
  {
    id: 'RESUMEN',
    nombre: 'Resumen',
    icono: BarChart3,
  },
  {
    id: 'MEDICION',
    nombre: 'Medición',
    icono: Activity,
  },
  {
    id: 'HISTORIAL',
    nombre: 'Historial',
    icono: History,
  },
  {
    id: 'METODOLOGIA',
    nombre: 'Metodología',
    icono: BookOpen,
  },
]


// ============================================================
// HELPERS DE SESIÓN
// app/admin/pesv/indicadores/page.jsx
// ============================================================

function obtenerNitUsuario(
  user
) {
  return (
    user?.nit ||
    user?.nitEmpresa ||
    user?.nit_empresa ||
    user?.empresaNit ||
    user?.empresa_nit ||
    ''
  )
}


function obtenerUsuarioTexto(
  user
) {
  return (
    user?.email ||
    user?.correo ||
    user?.username ||
    user?.usuario ||
    user?.nombre ||
    ''
  )
}


function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function obtenerNombreUsuario(
  user
) {
  return texto(
    user?.nombreCompleto ||
    user?.nombre_completo ||
    user?.nombre ||
    user?.usuario ||
    user?.username ||
    user?.email ||
    user?.correo ||
    ''
  ) || '-'
}


function obtenerNombreEmpresa(
  user,
  empresa
) {
  return texto(
    empresa?.nombre ||
    empresa?.razon_social ||
    user?.nombreEmpresa ||
    user?.nombre_empresa ||
    user?.empresa ||
    ''
  ) || '-'
}


// ============================================================
// COMPONENTE PRINCIPAL
// app/admin/pesv/indicadores/page.jsx
// ============================================================

export default function IndicadoresPesvPage() {
  const router =
    useRouter()

  const anioActual =
    new Date()
      .getFullYear()


  // ----------------------------------------------------------
  // SESIÓN / EMPRESA
  // app/admin/pesv/indicadores/page.jsx
  // ----------------------------------------------------------

  const [
    user,
    setUser,
  ] =
    useState(
      null
    )

  const [
    nit,
    setNit,
  ] =
    useState(
      ''
    )

  const [
    usuario,
    setUsuario,
  ] =
    useState(
      ''
    )

  const [
    empresa,
    setEmpresa,
  ] =
    useState(
      null
    )


  // ----------------------------------------------------------
  // VIGENCIA
  // app/admin/pesv/indicadores/page.jsx
  // ----------------------------------------------------------

  const [
    anio,
    setAnio,
  ] =
    useState(
      anioActual
    )


  // ----------------------------------------------------------
  // INTERFAZ
  // app/admin/pesv/indicadores/page.jsx
  // ----------------------------------------------------------

  const [
    pestana,
    setPestana,
  ] =
    useState(
      'RESUMEN'
    )

  const [
    cargando,
    setCargando,
  ] =
    useState(
      true
    )

  const [
    actualizando,
    setActualizando,
  ] =
    useState(
      false
    )

  const [
    error,
    setError,
  ] =
    useState(
      ''
    )

  const [
    mensaje,
    setMensaje,
  ] =
    useState(
      ''
    )

  const [
    indicadorSeleccionadoId,
    setIndicadorSeleccionadoId,
  ] =
    useState(
      null
    )


  // ----------------------------------------------------------
  // DATOS DE INDICADORES
  // app/admin/pesv/indicadores/page.jsx
  // ----------------------------------------------------------

  const [
    indicadores,
    setIndicadores,
  ] =
    useState(
      []
    )

  const [
    configuraciones,
    setConfiguraciones,
  ] =
    useState(
      []
    )

  const [
    mediciones,
    setMediciones,
  ] =
    useState(
      []
    )

  const [
    personal,
    setPersonal,
  ] =
    useState(
      []
    )

  const [
    resumen,
    setResumen,
  ] =
    useState({
      total_indicadores: 0,
      configurados: 0,
      sin_configurar: 0,
      medidos: 0,
      pendientes: 0,
      cumplen: 0,
      no_cumplen: 0,
      borradores: 0,
      validadas: 0,
      cerradas: 0,
    })


  // ==========================================================
  // INDICADORES ACTIVOS
  // app/admin/pesv/indicadores/page.jsx
  // ==========================================================

  const indicadoresActivos =
    useMemo(
      () =>
        (
          indicadores ||
          []
        )
          .filter(
            item =>
              item?.activo !==
              false
          )
          .sort(
            (
              a,
              b
            ) =>
              Number(
                a?.orden ||
                0
              ) -
              Number(
                b?.orden ||
                0
              )
          ),
      [
        indicadores,
      ]
    )


  // ==========================================================
  // LEER SESIÓN
  // app/admin/pesv/indicadores/page.jsx
  // ==========================================================

  useEffect(
    () => {
      try {
        const guardado =
          localStorage.getItem(
            'currentUser'
          )

        if (
          !guardado
        ) {
          router.push(
            '/login'
          )

          return
        }

        const user =
          JSON.parse(
            guardado
          )

        const nitEncontrado =
          obtenerNitUsuario(
            user
          )

        if (
          !nitEncontrado
        ) {
          router.push(
            '/login'
          )

          return
        }

        setUser(
          user
        )

        setNit(
          String(
            nitEncontrado
          )
        )

        setUsuario(
          obtenerUsuarioTexto(
            user
          )
        )
      } catch (
        err
      ) {
        console.error(
          'Error leyendo sesión:',
          err
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
  // CARGAR DATOS
  // app/admin/pesv/indicadores/page.jsx
  // API: GET /api/admin/pesv/indicadores
  // ==========================================================

  const cargarDatos =
  useCallback(
    async (
      mostrarCarga = true
    ) => {
      if (
        !nit
      ) {
        return
      }

      if (
        mostrarCarga
      ) {
        setCargando(
          true
        )
      } else {
        setActualizando(
          true
        )
      }

      setError(
        ''
      )

      try {
        let respuesta

        try {
          respuesta =
            await fetch(
              `${API_INDICADORES}?nit=${encodeURIComponent(
                nit
              )}&anio=${encodeURIComponent(
                anio
              )}`,
              {
                headers: {
                  'x-cea-nit':
                    nit,
                },

                cache:
                  'no-store',
              }
            )
        } catch (
          errorFetch
        ) {
          console.error(
            'Error de conexión cargando indicadores PESV:',
            errorFetch
          )

          throw new Error(
            'No fue posible conectarse con el servidor para cargar los indicadores PESV. Intente actualizar nuevamente.'
          )
        }


        // ----------------------------------------------------
        // LEER RESPUESTA DE FORMA SEGURA
        // ----------------------------------------------------

        let resultado =
          null

        try {
          resultado =
            await respuesta.json()
        } catch (
          errorJson
        ) {
          console.error(
            'Respuesta no válida de indicadores PESV:',
            errorJson
          )

          throw new Error(
            'El servidor no devolvió una respuesta válida al cargar los indicadores PESV.'
          )
        }


        // ----------------------------------------------------
        // VALIDAR RESPUESTA DE LA API
        // ----------------------------------------------------

        if (
          !respuesta.ok ||
          resultado?.status ===
            'failed' ||
          resultado?.ok ===
            false
        ) {
          throw new Error(
            resultado?.message ||
              'No fue posible cargar los indicadores PESV.'
          )
        }


        // ----------------------------------------------------
        // ACTUALIZAR INFORMACIÓN
        // ----------------------------------------------------

        setEmpresa(
          resultado?.empresa ||
            null
        )

        setIndicadores(
          resultado?.catalogo ||
          resultado?.indicadores ||
          []
        )

        setConfiguraciones(
          resultado?.configuraciones ||
            []
        )

        setMediciones(
          resultado?.mediciones ||
            []
        )

        setPersonal(
          resultado?.personal ||
            []
        )

        setResumen(
          resultado?.resumen ||
            {
              total_indicadores:
                0,

              configurados:
                0,

              sin_configurar:
                0,

              medidos:
                0,

              pendientes:
                0,

              cumplen:
                0,

              no_cumplen:
                0,

              borradores:
                0,

              validadas:
                0,

              cerradas:
                0,
            }
        )
      } catch (
        err
      ) {
        console.error(
          'Error cargando indicadores PESV:',
          err
        )

        setError(
          err?.message ||
            'No fue posible cargar los indicadores PESV. Intente nuevamente.'
        )
      } finally {
        setCargando(
          false
        )

        setActualizando(
          false
        )
      }
    },
    [
      nit,
      anio,
    ]
  )

  // ==========================================================
  // CARGAR AL CAMBIAR CEA / VIGENCIA
  // app/admin/pesv/indicadores/page.jsx
  // ==========================================================

  useEffect(
    () => {
      cargarDatos()
    },
    [
      cargarDatos,
    ]
  )


  // ==========================================================
  // MENSAJES
  // app/admin/pesv/indicadores/page.jsx
  // ==========================================================

  function limpiarMensajes() {
    setMensaje(
      ''
    )

    setError(
      ''
    )
  }


  function mostrarExito(
    textoMensaje
  ) {
    setMensaje(
      textoMensaje
    )

    setError(
      ''
    )

    window.setTimeout(
      () => {
        setMensaje(
          ''
        )
      },
      3500
    )
  }


  function mostrarError(
    textoError
  ) {
    setError(
      textoError
    )

    setMensaje(
      ''
    )
  }


  // ==========================================================
  // IR A MEDICIÓN
  // app/admin/pesv/indicadores/page.jsx
  // ==========================================================

  function irAMedicion(
    indicadorId = null
  ) {
    limpiarMensajes()

    if (
      indicadorId
    ) {
      setIndicadorSeleccionadoId(
        Number(
          indicadorId
        )
      )
    }

    setPestana(
      'MEDICION'
    )
  }


  // ==========================================================
  // CAMBIAR PESTAÑA
  // app/admin/pesv/indicadores/page.jsx
  // ==========================================================

  function cambiarPestana(
    nuevaPestana
  ) {
    limpiarMensajes()

    setPestana(
      nuevaPestana
    )
  }


  // ==========================================================
  // CAMBIAR VIGENCIA
  // app/admin/pesv/indicadores/page.jsx
  // ==========================================================

  function cambiarAnio(
    event
  ) {
    const nuevoAnio =
      Number(
        event.target.value
      )

    setAnio(
      nuevoAnio
    )

    setIndicadorSeleccionadoId(
      null
    )

    setMensaje(
      ''
    )

    setError(
      ''
    )
  }


  // ==========================================================
  // ACTUALIZAR INFORMACIÓN
  // app/admin/pesv/indicadores/page.jsx
  // ==========================================================

  async function actualizarDatos() {
    await cargarDatos(
      false
    )
  }


  // ==========================================================
  // RENDER
  // app/admin/pesv/indicadores/page.jsx
  // ==========================================================

  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-br
        from-gray-100
        to-gray-200
        p-3
        md:p-5
      "
    >
      <div
        className="
          max-w-[1600px]
          mx-auto
          bg-white
          border
          border-gray-200
          shadow-lg
          rounded-xl
          overflow-hidden
        "
      >

        {/* ====================================================
            ENCABEZADO
            app/admin/pesv/indicadores/page.jsx
        ==================================================== */}

        <div
          className="
            bg-slate-800
            text-white
            px-5
            py-3
            flex
            flex-col
            md:flex-row
            md:items-center
            md:justify-between
            gap-3
          "
        >
          <div
            className="
              flex
              items-start
              gap-3
            "
          >
            <div
              className="
                mt-0.5
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-white/20
                bg-white/10
              "
            >
              <BarChart3
                size={
                  21
                }
              />
            </div>

            <div>
              <h1
                className="
                  text-lg
                  md:text-xl
                  font-black
                  uppercase
                  tracking-wide
                "
              >
                PESV · Indicadores
              </h1>

              <p
                className="
                  text-[10px]
                  md:text-[11px]
                  text-slate-300
                  mt-0.5
                "
              >
                Medición, seguimiento y evaluación de los indicadores
                del Plan Estratégico de Seguridad Vial
              </p>

              <div
                className="
                  mt-1
                  text-[10px]
                  text-slate-300
                "
              >
                Usuario:{' '}

                <strong
                  className="
                    text-white
                  "
                >
                  {obtenerNombreUsuario(
                    user
                  )}
                </strong>

                <span
                  className="
                    mx-1.5
                    text-slate-500
                  "
                >
                  ·
                </span>

                CEA:{' '}

                <strong
                  className="
                    text-white
                  "
                >
                  {obtenerNombreEmpresa(
                    user,
                    empresa
                  )}
                </strong>
              </div>
            </div>
          </div>


          {/* ================================================
              BOTONES ENCABEZADO
              app/admin/pesv/indicadores/page.jsx
          ================================================ */}

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            <button
              type="button"
              onClick={
                () =>
                  router.push(
                    '/admin/pesv'
                  )
              }
              className="
                inline-flex
                items-center
                gap-1.5
                bg-white/10
                hover:bg-white/20
                border
                border-white/20
                text-white
                px-3
                py-1.5
                rounded
                text-[10px]
                md:text-[11px]
                transition
              "
            >
              <ShieldCheck
                size={
                  14
                }
              />

              PESV
            </button>

            <button
              type="button"
              onClick={
                () =>
                  router.push(
                    '/admin'
                  )
              }
              className="
                inline-flex
                items-center
                gap-1.5
                bg-white/10
                hover:bg-white/20
                border
                border-white/20
                text-white
                px-3
                py-1.5
                rounded
                text-[10px]
                md:text-[11px]
                transition
              "
            >
              <Home
                size={
                  14
                }
              />

              Menú
            </button>

            <button
              type="button"
              onClick={
                () =>
                  cerrarSesion(
                    router
                  )
              }
              className="
                inline-flex
                items-center
                gap-1.5
                bg-[var(--danger)]
                hover:bg-[var(--danger-dark)]
                text-white
                px-3
                py-1.5
                rounded
                text-[10px]
                md:text-[11px]
                transition
              "
            >
              <LogOut
                size={
                  14
                }
              />

              Salir
            </button>
          </div>
        </div>


        {/* ====================================================
            BARRA DE VIGENCIA
            app/admin/pesv/indicadores/page.jsx
        ==================================================== */}

        <div
          className="
            bg-gray-50
            border-b
            border-gray-200
            px-4
            py-2
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-2
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
              text-[11px]
              text-gray-600
            "
          >
            <CalendarDays
              size={
                15
              }
              className="
                text-slate-500
              "
            />

            Vigencia de medición y seguimiento de indicadores PESV
          </div>

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            <label
              className="
                text-[10px]
                font-bold
                uppercase
                text-gray-600
              "
            >
              Año
            </label>

            <select
              value={
                anio
              }
              onChange={
                cambiarAnio
              }
              className="
                border
                border-gray-300
                rounded
                px-2
                py-1
                text-xs
                bg-white
                min-w-[90px]
              "
            >
              {Array.from(
                {
                  length:
                    8,
                },
                (
                  _,
                  index
                ) =>
                  anioActual -
                  3 +
                  index
              ).map(
                item => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={
                actualizarDatos
              }
              disabled={
                cargando ||
                actualizando ||
                !nit
              }
              className="
                ml-0
                sm:ml-2
                inline-flex
                items-center
                gap-1.5
                bg-[var(--primary)]
                hover:bg-[var(--primary-dark)]
                text-white
                border
                border-blue-800
                rounded
                px-3
                py-1.5
                text-[10px]
                font-bold
                transition
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <RefreshCw
                size={
                  13
                }
                className={
                  actualizando
                    ? 'animate-spin'
                    : ''
                }
              />

              {actualizando
                ? 'Actualizando...'
                : 'Actualizar'}
            </button>
          </div>
        </div>


        {/* ====================================================
            PESTAÑAS
            app/admin/pesv/indicadores/page.jsx
        ==================================================== */}

        <div
          className="
            border-b
            border-slate-300
            bg-white
            px-3
            pt-3
          "
        >
          <div
            className="
              flex
              flex-wrap
              gap-1
            "
          >
            {PESTANAS.map(
              item => {
                const Icono =
                  item.icono

                const activa =
                  pestana ===
                  item.id

                return (
                  <button
                    key={
                      item.id
                    }
                    type="button"
                    onClick={
                      () =>
                        cambiarPestana(
                          item.id
                        )
                    }
                    className={`
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-t-lg
                      border
                      border-b-0
                      px-3
                      py-2
                      text-[10px]
                      font-bold
                      uppercase
                      transition
                      ${
                        activa
                          ? `
                            border-slate-400
                            bg-slate-800
                            text-white
                          `
                          : `
                            border-slate-300
                            bg-slate-50
                            text-slate-600
                            hover:bg-slate-100
                          `
                      }
                    `}
                  >
                    <Icono
                      size={
                        14
                      }
                    />

                    {item.nombre}
                  </button>
                )
              }
            )}
          </div>
        </div>


        {/* ====================================================
            CONTENIDO
            app/admin/pesv/indicadores/page.jsx
        ==================================================== */}

        <div
          className="
            p-4
            space-y-4
          "
        >

          {/* ================================================
              MENSAJES
              app/admin/pesv/indicadores/page.jsx
          ================================================ */}

          {mensaje && (
            <div
              className="
                rounded-xl
                border
                border-emerald-200
                bg-emerald-50
                px-4
                py-3
                text-xs
                font-semibold
                text-emerald-800
              "
            >
              {mensaje}
            </div>
          )}

          {error && (
            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-xs
                font-semibold
                text-red-800
              "
            >
              {error}
            </div>
          )}


          {/* ================================================
              CARGANDO
              app/admin/pesv/indicadores/page.jsx
          ================================================ */}

          {cargando ? (
            <div
              className="
                flex
                min-h-[260px]
                flex-col
                items-center
                justify-center
                gap-3
                rounded-xl
                border
                border-slate-300
                bg-white
              "
            >
              <RefreshCw
                size={
                  28
                }
                className="
                  animate-spin
                  text-slate-500
                "
              />

              <p
                className="
                  text-xs
                  font-semibold
                  text-slate-600
                "
              >
                Cargando indicadores PESV...
              </p>
            </div>
          ) : indicadoresActivos.length ===
            0 &&
            !error ? (
            <div
              className="
                rounded-xl
                border
                border-dashed
                border-slate-400
                bg-slate-50
                px-4
                py-12
                text-center
              "
            >
              <ClipboardList
                size={
                  30
                }
                className="
                  mx-auto
                  mb-3
                  text-slate-400
                "
              />

              <p
                className="
                  text-sm
                  font-bold
                  text-slate-700
                "
              >
                No hay indicadores PESV activos.
              </p>

              <p
                className="
                  mt-1
                  text-[10px]
                  text-slate-500
                "
              >
                Verifique el catálogo de indicadores configurado
                para el nivel Básico.
              </p>
            </div>
          ) : (
            <>

              {/* ==============================================
                  PESTAÑA RESUMEN
                  app/admin/pesv/indicadores/page.jsx
              ============================================== */}

              {pestana ===
                'RESUMEN' && (
                <ResumenIndicadores
                  anio={
                    anio
                  }
                  empresa={
                    empresa
                  }
                  indicadores={
                    indicadoresActivos
                  }
                  configuraciones={
                    configuraciones
                  }
                  mediciones={
                    mediciones
                  }
                  resumen={
                    resumen
                  }
                  onIrMedicion={
                    irAMedicion
                  }
                />
              )}


              {/* ==============================================
                  PESTAÑA MEDICIÓN
                  app/admin/pesv/indicadores/page.jsx
              ============================================== */}

              {pestana ===
                'MEDICION' && (
                <MedicionIndicadores
                  nit={
                    nit
                  }
                  usuario={
                    usuario
                  }
                  anio={
                    anio
                  }
                  empresa={
                    empresa
                  }
                  indicadores={
                    indicadoresActivos
                  }
                  configuraciones={
                    configuraciones
                  }
                  mediciones={
                    mediciones
                  }
                  personal={
                    personal
                  }
                  indicadorSeleccionadoId={
                    indicadorSeleccionadoId
                  }
                  setIndicadorSeleccionadoId={
                    setIndicadorSeleccionadoId
                  }
                  onActualizar={
                    actualizarDatos
                  }
                  onExito={
                    mostrarExito
                  }
                  onError={
                    mostrarError
                  }
                />
              )}


              {/* ==============================================
                  PESTAÑA HISTORIAL
                  app/admin/pesv/indicadores/page.jsx
              ============================================== */}

              {pestana ===
                'HISTORIAL' && (
                <HistorialIndicadores
                  anio={
                    anio
                  }
                  empresa={
                    empresa
                  }
                  indicadores={
                    indicadoresActivos
                  }
                  configuraciones={
                    configuraciones
                  }
                  mediciones={
                    mediciones
                  }
                  onIrMedicion={
                    irAMedicion
                  }
                />
              )}


              {/* ==============================================
                  PESTAÑA METODOLOGÍA
                  app/admin/pesv/indicadores/page.jsx
              ============================================== */}

              {pestana ===
                'METODOLOGIA' && (
                <MetodologiaIndicadores
                  anio={
                    anio
                  }
                  indicadores={
                    indicadoresActivos
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}