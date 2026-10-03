// app/admin/reuniones/page.jsx
'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  Toaster,
  toast,
} from 'sonner'


// ============================================================
// OPCIONES
// ============================================================

const TIPOS = [
  'Reunión General',
  'Capacitación',
  'Socialización',
  'Sensibilización',
  'Comité',
  'Otra',
]


const ORIGENES_MODULO = [
  {
    value: 'GENERAL',
    label: 'General',
  },
  {
    value: 'PESV',
    label: 'PESV',
  },
]


const MODALIDADES = [
  'Presencial',
  'Virtual',
]


const DIRIGIDO_A = [
  'Todo el personal',
  'Instructores',
  'Administrativo',
]


const ESTADOS = [
  'Programada',
  'Ejecutada',
  'Cancelada',
]


// ============================================================
// FORMULARIO INICIAL
// ============================================================

const FORM_INICIAL = {
  tipo_reunion: '',
  origen_modulo: 'GENERAL',
  descripcion: '',
  fecha_programada: '',
  hora_inicio: '',
  hora_fin: '',
  modalidad: 'Presencial',
  responsable: '',
  dirigido_a: 'Todo el personal',
  lugar: '',
}


// ============================================================
// FILTROS INICIALES
// ============================================================

const FILTROS_INICIALES = {
  busqueda: '',
  origen_modulo: '',
  tipo_reunion: '',
  estado: '',
  dirigido_a: '',
  fecha_desde: '',
  fecha_hasta: '',
}


// ============================================================
// UTILIDADES
// ============================================================

function fechaBogotaActual() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(
    new Date()
  )
}


function horaBogotaActual() {
  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone:
        'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }
  ).format(
    new Date()
  )
}


function normalizarTexto(valor) {
  return String(
    valor || ''
  )
    .trim()
    .toLowerCase()
}


function formatearFecha(fecha) {
  if (!fecha) {
    return '-'
  }

  const partes =
    String(fecha)
      .split('-')

  if (
    partes.length !== 3
  ) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}


function obtenerEtiquetaOrigen(
  origen
) {
  const valor =
    String(
      origen ||
      'GENERAL'
    )
      .trim()
      .toUpperCase()

  if (
    valor === 'PESV'
  ) {
    return 'PESV'
  }

  return 'GENERAL'
}


// ============================================================
// ESTADO VISUAL
// ============================================================

function EstadoPill({
  estado,
}) {
  const valor =
    normalizarTexto(
      estado
    )

  const estilos = {
    programada:
      'bg-amber-100 text-amber-800 border-amber-200',

    ejecutada:
      'bg-emerald-100 text-emerald-800 border-emerald-200',

    cancelada:
      'bg-rose-100 text-rose-800 border-rose-200',
  }

  const clase =
    estilos[valor] ||
    'bg-slate-100 text-slate-700 border-slate-200'

  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        px-2
        py-[2px]
        rounded-full
        border
        text-[10px]
        font-semibold
        whitespace-nowrap
        ${clase}
      `}
    >
      {estado || '-'}
    </span>
  )
}


// ============================================================
// ORIGEN VISUAL
// ============================================================

function OrigenPill({
  origen,
}) {
  const valor =
    obtenerEtiquetaOrigen(
      origen
    )

  const esPesv =
    valor === 'PESV'

  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        px-2
        py-[2px]
        rounded-full
        border
        text-[10px]
        font-semibold
        whitespace-nowrap
        ${
          esPesv
            ? 'bg-blue-100 text-blue-800 border-blue-200'
            : 'bg-slate-100 text-slate-700 border-slate-200'
        }
      `}
    >
      {valor}
    </span>
  )
}


// ============================================================
// TARJETA RESUMEN
// ============================================================

function ResumenCard({
  icono,
  titulo,
  valor,
  detalle,
}) {
  return (
    <div
      className="
        bg-white
        border
        border-slate-200
        rounded-xl
        shadow-sm
        p-3
        min-h-[92px]
        flex
        items-center
        gap-3
      "
    >
      <div
        className="
          w-10
          h-10
          rounded-lg
          bg-slate-100
          flex
          items-center
          justify-center
          text-[var(--primary)]
          shrink-0
        "
      >
        <i
          className={`
            fas
            ${icono}
          `}
        ></i>
      </div>

      <div
        className="
          min-w-0
        "
      >
        <p
          className="
            text-[10px]
            uppercase
            tracking-wide
            text-slate-500
            font-semibold
          "
        >
          {titulo}
        </p>

        <p
          className="
            text-xl
            font-bold
            text-slate-800
            leading-tight
          "
        >
          {valor}
        </p>

        {detalle && (
          <p
            className="
              text-[10px]
              text-slate-500
              mt-1
            "
          >
            {detalle}
          </p>
        )}
      </div>
    </div>
  )
}


// ============================================================
// PÁGINA
// ============================================================

export default function AdminReunionesPage() {
  const router =
    useRouter()


  // ==========================================================
  // SESIÓN
  // ==========================================================

  const [
    user,
    setUser,
  ] =
    useState(null)

  const [
    nitActual,
    setNitActual,
  ] =
    useState('')


  // ==========================================================
  // FORMULARIO
  // ==========================================================

  const [
    form,
    setForm,
  ] =
    useState(
      FORM_INICIAL
    )


  // ==========================================================
  // FILTROS
  // ==========================================================

  const [
    filtros,
    setFiltros,
  ] =
    useState(
      FILTROS_INICIALES
    )


  // ==========================================================
  // ESTADO UI
  // ==========================================================

  const [
    guardando,
    setGuardando,
  ] =
    useState(false)

  const [
    cargandoLista,
    setCargandoLista,
  ] =
    useState(false)

  const [
    reuniones,
    setReuniones,
  ] =
    useState([])

  const [
    reunionDetalle,
    setReunionDetalle,
  ] =
    useState(null)


  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(
    () => {
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
        const usuarioSesion =
          JSON.parse(
            storedUser
          )

        setUser(
          usuarioSesion
        )

        const nit =
          usuarioSesion
            ?.nitEmpresa ||
          localStorage.getItem(
            'currentEmpresaNit'
          ) ||
          ''

        if (!nit) {
          toast.error(
            'No se encontró el CEA asociado a la sesión.'
          )

          return
        }

        setNitActual(
          nit
        )
      } catch (error) {
        console.error(
          'Error leyendo sesión:',
          error
        )

        localStorage.removeItem(
          'currentUser'
        )

        localStorage.removeItem(
          'currentEmpresaNit'
        )

        localStorage.removeItem(
          'currentEmpresaNombre'
        )

        localStorage.removeItem(
          'currentPerfilRol'
        )

        localStorage.removeItem(
          'currentPerfilMenu'
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
  // CARGAR REUNIONES
  // ==========================================================

  useEffect(
    () => {
      if (
        !user ||
        !nitActual
      ) {
        return
      }

      cargarReuniones()
    },
    [
      user,
      nitActual,
    ]
  )


  const cargarReuniones =
    async () => {
      if (!nitActual) {
        return
      }

      setCargandoLista(
        true
      )

      try {
        const res =
          await fetch(
            `/api/reuniones?nit=${encodeURIComponent(
              nitActual
            )}&limit=100`,
            {
              cache:
                'no-store',
            }
          )

        const json =
          await res.json()

        if (
          json?.status ===
          'success'
        ) {
          const arr =
            Array.isArray(
              json.data
            )
              ? [
                  ...json.data,
                ]
              : []

          arr.sort(
            (
              a,
              b
            ) => {
              const fechaComparacion =
                String(
                  b.fecha_programada
                ).localeCompare(
                  String(
                    a.fecha_programada
                  )
                )

              if (
                fechaComparacion !==
                0
              ) {
                return fechaComparacion
              }

              return String(
                a.hora_inicio
              ).localeCompare(
                String(
                  b.hora_inicio
                )
              )
            }
          )

          setReuniones(
            arr
          )
        } else {
          console.error(
            'Error API reuniones:',
            json
          )

          toast.error(
            json?.message ||
              'No se pudo cargar la lista de reuniones.'
          )
        }
      } catch (error) {
        console.error(
          'Error cargando reuniones:',
          error
        )

        toast.error(
          'Error al cargar reuniones.'
        )
      } finally {
        setCargandoLista(
          false
        )
      }
    }


  // ==========================================================
  // FORMULARIO - CAMBIOS
  // ==========================================================

  const onChange =
    (e) => {
      const {
        name,
        value,
      } =
        e.target

      setForm(
        (
          prev
        ) => ({
          ...prev,
          [name]:
            value,
        })
      )
    }


  // ==========================================================
  // FILTROS - CAMBIOS
  // ==========================================================

  const onChangeFiltro =
    (e) => {
      const {
        name,
        value,
      } =
        e.target

      setFiltros(
        (
          prev
        ) => ({
          ...prev,
          [name]:
            value,
        })
      )
    }


  // ==========================================================
  // LIMPIAR FORM
  // ==========================================================

  const limpiarForm =
    () => {
      setForm(
        FORM_INICIAL
      )
    }


  // ==========================================================
  // LIMPIAR FILTROS
  // ==========================================================

  const limpiarFiltros =
    () => {
      setFiltros(
        FILTROS_INICIALES
      )
    }


  // ==========================================================
  // VALIDAR FORM
  // ==========================================================

  const validarForm =
    () => {
      if (
        !form.tipo_reunion ||
        !form.origen_modulo ||
        !form.descripcion ||
        !form.fecha_programada ||
        !form.hora_inicio ||
        !form.hora_fin
      ) {
        toast.warning(
          'Completa los campos obligatorios: Tipo, Contexto, Descripción, Fecha, Hora Inicio y Hora Fin.'
        )

        return false
      }

      if (
        form.hora_fin <=
        form.hora_inicio
      ) {
        toast.warning(
          'Hora Fin debe ser mayor a Hora Inicio.'
        )

        return false
      }

      return true
    }


  // ==========================================================
  // CREAR REUNIÓN
  // ==========================================================

  const crearReunion =
    async () => {
      if (!user) {
        toast.error(
          'Sesión no válida.'
        )

        return
      }

      if (!nitActual) {
        toast.error(
          'No se encontró el CEA de la sesión.'
        )

        return
      }

      if (
        !validarForm()
      ) {
        return
      }

      setGuardando(
        true
      )

      try {
        const payload = {
          nit:
            nitActual,

          ...form,

          origen_modulo:
            form.origen_modulo,

          creado_por:
            user
              ?.nombreCompleto ||
            'Desconocido',
        }

        const res =
          await fetch(
            '/api/reuniones',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          )

        const json =
          await res.json()

        if (
          json?.status ===
          'success'
        ) {
          toast.success(
            'Reunión creada y notificaciones enviadas.'
          )

          limpiarForm()

          await cargarReuniones()
        } else {
          console.error(
            'Error creando reunión:',
            json
          )

          toast.error(
            json?.message ||
              json?.detail ||
              'No se pudo crear la reunión.'
          )
        }
      } catch (error) {
        console.error(
          'Error creando reunión:',
          error
        )

        toast.error(
          'Error al crear reunión.'
        )
      } finally {
        setGuardando(
          false
        )
      }
    }


  // ==========================================================
  // CANCELAR
  // ==========================================================

  const cancelarReunion =
    async (
      id,
      estadoActual
    ) => {
      if (
        estadoActual !==
        'Programada'
      ) {
        return
      }

      if (!nitActual) {
        toast.error(
          'No se encontró el CEA de la sesión.'
        )

        return
      }

      const confirmar =
        window.confirm(
          '¿Confirmas cancelar esta reunión?'
        )

      if (!confirmar) {
        return
      }

      try {
        const res =
          await fetch(
            `/api/reuniones/${id}/estado`,
            {
              method:
                'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  nit:
                    nitActual,
                }),
            }
          )

        const json =
          await res.json()

        if (
          json?.status ===
          'success'
        ) {
          toast.success(
            'Reunión cancelada.'
          )

          setReunionDetalle(
            null
          )

          await cargarReuniones()
        } else {
          toast.error(
            json?.message ||
              'No se pudo cancelar.'
          )
        }
      } catch (error) {
        console.error(
          'Error cancelando reunión:',
          error
        )

        toast.error(
          'Error al cancelar reunión.'
        )
      }
    }


  // ==========================================================
  // DESCARGAR EXCEL
  // ==========================================================

  const descargarExcel =
    (id) => {
      if (!nitActual) {
        toast.error(
          'No se encontró el CEA de la sesión.'
        )

        return
      }

      window.open(
        `/api/reuniones/${id}/asistentes.xlsx?nit=${encodeURIComponent(
          nitActual
        )}`,
        '_blank'
      )
    }


  // ==========================================================
  // RESÚMENES
  // ==========================================================

  const resumen =
    useMemo(
      () => {
        const total =
          reuniones.length

        const programadas =
          reuniones.filter(
            (reunion) =>
              normalizarTexto(
                reunion.estado
              ) ===
              'programada'
          ).length

        const ejecutadas =
          reuniones.filter(
            (reunion) =>
              normalizarTexto(
                reunion.estado
              ) ===
              'ejecutada'
          ).length

        const canceladas =
          reuniones.filter(
            (reunion) =>
              normalizarTexto(
                reunion.estado
              ) ===
              'cancelada'
          ).length

        const pesv =
          reuniones.filter(
            (reunion) =>
              String(
                reunion.origen_modulo ||
                'GENERAL'
              )
                .trim()
                .toUpperCase() ===
              'PESV'
          ).length

        return {
          total,
          programadas,
          ejecutadas,
          canceladas,
          pesv,
        }
      },
      [
        reuniones,
      ]
    )


  // ==========================================================
  // FILTRADO LOCAL
  // ==========================================================

  const reunionesFiltradas =
    useMemo(
      () => {
        const busqueda =
          normalizarTexto(
            filtros.busqueda
          )

        return reuniones.filter(
          (
            reunion
          ) => {
            if (
              filtros.origen_modulo &&
              String(
                reunion.origen_modulo ||
                'GENERAL'
              )
                .trim()
                .toUpperCase() !==
              filtros.origen_modulo
            ) {
              return false
            }

            if (
              filtros.tipo_reunion &&
              reunion.tipo_reunion !==
              filtros.tipo_reunion
            ) {
              return false
            }

            if (
              filtros.estado &&
              reunion.estado !==
              filtros.estado
            ) {
              return false
            }

            if (
              filtros.dirigido_a &&
              reunion.dirigido_a !==
              filtros.dirigido_a
            ) {
              return false
            }

            if (
              filtros.fecha_desde &&
              String(
                reunion.fecha_programada
              ) <
              filtros.fecha_desde
            ) {
              return false
            }

            if (
              filtros.fecha_hasta &&
              String(
                reunion.fecha_programada
              ) >
              filtros.fecha_hasta
            ) {
              return false
            }

            if (busqueda) {
              const contenido =
                [
                  reunion.tipo_reunion,
                  reunion.descripcion,
                  reunion.responsable,
                  reunion.lugar,
                  reunion.dirigido_a,
                  reunion.modalidad,
                  reunion.estado,
                  reunion.origen_modulo,
                ]
                  .map(
                    normalizarTexto
                  )
                  .join(' ')

              if (
                !contenido.includes(
                  busqueda
                )
              ) {
                return false
              }
            }

            return true
          }
        )
      },
      [
        reuniones,
        filtros,
      ]
    )


  // ==========================================================
  // CARGANDO
  // ==========================================================

  if (!user) {
    return (
      <p
        className="
          text-center
          mt-20
        "
      >
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
        p-3
        md:p-5
      "
    >
      <Toaster
        position="top-center"
        richColors
      />


      <div
        className="
          w-full
          max-w-[1500px]
          mx-auto
          space-y-4
        "
      >

        {/* ==================================================
            ENCABEZADO PRINCIPAL
        ================================================== */}

        <div
          className="
            bg-white
            rounded-2xl
            shadow-sm
            border
            border-slate-200
            px-4
            py-4
          "
        >
          <div
            className="
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
                  gap-2
                "
              >
                <div
                  className="
                    w-10
                    h-10
                    rounded-xl
                    bg-slate-100
                    flex
                    items-center
                    justify-center
                    text-[var(--primary)]
                  "
                >
                  <i
                    className="
                      fas
                      fa-calendar-check
                    "
                  ></i>
                </div>

                <div>
                  <h1
                    className="
                      text-lg
                      md:text-xl
                      font-bold
                      uppercase
                      text-[var(--primary)]
                    "
                  >
                    Gestión de Reuniones y Capacitaciones
                  </h1>

                  <p
                    className="
                      text-xs
                      text-slate-500
                      mt-1
                    "
                  >
                    Programación, seguimiento y control de asistencia
                  </p>
                </div>
              </div>
            </div>


            <button
              onClick={
                () =>
                  router.push(
                    '/admin'
                  )
              }
              className="
                bg-gray-600
                hover:bg-gray-800
                text-white
                px-3
                py-2
                rounded-lg
                text-xs
                flex
                items-center
                justify-center
                gap-2
              "
            >
              <i
                className="
                  fas
                  fa-arrow-left
                "
              ></i>

              Regresar
            </button>
          </div>


          <div
            className="
              mt-3
              bg-blue-50
              border
              border-blue-200
              rounded-lg
              px-3
              py-2
              text-xs
              text-[var(--primary-dark)]
            "
          >
            <span>
              Usuario:{' '}

              <strong>
                {user.nombreCompleto}
              </strong>
            </span>

            {user.rol && (
              <span>
                {' '}· Rol:{' '}

                <strong>
                  {user.rol}
                </strong>
              </span>
            )}

            {user.nombreEmpresa && (
              <span>
                {' '}· CEA:{' '}

                <strong>
                  {user.nombreEmpresa}
                </strong>
              </span>
            )}
          </div>
        </div>


        {/* ==================================================
            RESUMEN
        ================================================== */}

        <div
          className="
            grid
            grid-cols-2
            md:grid-cols-3
            xl:grid-cols-5
            gap-3
          "
        >
          <ResumenCard
            icono="fa-calendar-days"
            titulo="Registradas"
            valor={
              resumen.total
            }
            detalle="Últimas 100 consultadas"
          />

          <ResumenCard
            icono="fa-clock"
            titulo="Programadas"
            valor={
              resumen.programadas
            }
          />

          <ResumenCard
            icono="fa-circle-check"
            titulo="Ejecutadas"
            valor={
              resumen.ejecutadas
            }
          />

          <ResumenCard
            icono="fa-ban"
            titulo="Canceladas"
            valor={
              resumen.canceladas
            }
          />

          <ResumenCard
            icono="fa-shield-halved"
            titulo="Contexto PESV"
            valor={
              resumen.pesv
            }
          />
        </div>


        {/* ==================================================
            PROGRAMAR NUEVA REUNIÓN
        ================================================== */}

        <div
          className="
            bg-white
            rounded-2xl
            border
            border-slate-200
            shadow-sm
            overflow-hidden
          "
        >
          <div
            className="
              bg-[var(--primary-dark)]
              text-white
              px-4
              py-3
              flex
              items-center
              gap-2
            "
          >
            <i
              className="
                fas
                fa-calendar-plus
              "
            ></i>

            <div>
              <h2
                className="
                  text-sm
                  font-semibold
                "
              >
                Programar nueva reunión
              </h2>

              <p
                className="
                  text-[10px]
                  opacity-80
                "
              >
                Registre la clasificación, programación y responsable
              </p>
            </div>
          </div>


          <div
            className="
              p-4
              space-y-4
            "
          >

            {/* ==============================================
                CLASIFICACIÓN
            ============================================== */}

            <div>
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-slate-500
                  mb-2
                "
              >
                Clasificación
              </p>

              <div
                className="
                  grid
                  grid-cols-1
                  md:grid-cols-12
                  gap-3
                "
              >
                <div
                  className="
                    md:col-span-4
                  "
                >
                  <label
                    className="
                      block
                      text-xs
                      font-semibold
                      mb-1
                    "
                  >
                    Tipo de reunión *
                  </label>

                  <select
                    name="tipo_reunion"
                    value={
                      form.tipo_reunion
                    }
                    onChange={
                      onChange
                    }
                    className="
                      w-full
                      border
                      border-slate-300
                      rounded-lg
                      px-2
                      py-2
                      text-sm
                      bg-white
                    "
                  >
                    <option value="">
                      -- Selecciona --
                    </option>

                    {TIPOS.map(
                      (
                        tipo
                      ) => (
                        <option
                          key={
                            tipo
                          }
                          value={
                            tipo
                          }
                        >
                          {tipo}
                        </option>
                      )
                    )}
                  </select>
                </div>


                <div
                  className="
                    md:col-span-4
                  "
                >
                  <label
                    className="
                      block
                      text-xs
                      font-semibold
                      mb-1
                    "
                  >
                    Área / Contexto *
                  </label>

                  <select
                    name="origen_modulo"
                    value={
                      form.origen_modulo
                    }
                    onChange={
                      onChange
                    }
                    className="
                      w-full
                      border
                      border-slate-300
                      rounded-lg
                      px-2
                      py-2
                      text-sm
                      bg-white
                    "
                  >
                    {ORIGENES_MODULO.map(
                      (
                        origen
                      ) => (
                        <option
                          key={
                            origen.value
                          }
                          value={
                            origen.value
                          }
                        >
                          {origen.label}
                        </option>
                      )
                    )}
                  </select>
                </div>


                <div
                  className="
                    md:col-span-4
                  "
                >
                  <label
                    className="
                      block
                      text-xs
                      font-semibold
                      mb-1
                    "
                  >
                    Dirigido a
                  </label>

                  <select
                    name="dirigido_a"
                    value={
                      form.dirigido_a
                    }
                    onChange={
                      onChange
                    }
                    className="
                      w-full
                      border
                      border-slate-300
                      rounded-lg
                      px-2
                      py-2
                      text-sm
                      bg-white
                    "
                  >
                    {DIRIGIDO_A.map(
                      (
                        dirigido
                      ) => (
                        <option
                          key={
                            dirigido
                          }
                          value={
                            dirigido
                          }
                        >
                          {dirigido}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>


              {form.origen_modulo ===
                'PESV' && (
                <div
                  className="
                    mt-3
                    rounded-lg
                    bg-blue-50
                    border
                    border-blue-200
                    px-3
                    py-2
                    text-xs
                    text-blue-800
                    flex
                    items-start
                    gap-2
                  "
                >
                  <i
                    className="
                      fas
                      fa-circle-info
                      mt-[2px]
                    "
                  ></i>

                  <span>
                    Esta reunión quedará identificada como actividad relacionada con el PESV y podrá utilizarse posteriormente en consultas e indicadores.
                  </span>
                </div>
              )}
            </div>


            {/* ==============================================
                PROGRAMACIÓN
            ============================================== */}

            <div
              className="
                border-t
                border-slate-200
                pt-4
              "
            >
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-slate-500
                  mb-2
                "
              >
                Programación
              </p>

              <div
                className="
                  grid
                  grid-cols-1
                  md:grid-cols-12
                  gap-3
                "
              >
                <div
                  className="
                    md:col-span-3
                  "
                >
                  <label
                    className="
                      block
                      text-xs
                      font-semibold
                      mb-1
                    "
                  >
                    Fecha programada *
                  </label>

                  <input
                    type="date"
                    name="fecha_programada"
                    value={
                      form.fecha_programada
                    }
                    onChange={
                      onChange
                    }
                    className="
                      w-full
                      border
                      border-slate-300
                      rounded-lg
                      px-2
                      py-2
                      text-sm
                    "
                  />
                </div>


                <div
                  className="
                    md:col-span-2
                  "
                >
                  <label
                    className="
                      block
                      text-xs
                      font-semibold
                      mb-1
                    "
                  >
                    Hora inicio *
                  </label>

                  <input
                    type="time"
                    name="hora_inicio"
                    value={
                      form.hora_inicio
                    }
                    onChange={
                      onChange
                    }
                    className="
                      w-full
                      border
                      border-slate-300
                      rounded-lg
                      px-2
                      py-2
                      text-sm
                    "
                  />
                </div>


                <div
                  className="
                    md:col-span-2
                  "
                >
                  <label
                    className="
                      block
                      text-xs
                      font-semibold
                      mb-1
                    "
                  >
                    Hora fin *
                  </label>

                  <input
                    type="time"
                    name="hora_fin"
                    value={
                      form.hora_fin
                    }
                    onChange={
                      onChange
                    }
                    className="
                      w-full
                      border
                      border-slate-300
                      rounded-lg
                      px-2
                      py-2
                      text-sm
                    "
                  />
                </div>


                <div
                  className="
                    md:col-span-2
                  "
                >
                  <label
                    className="
                      block
                      text-xs
                      font-semibold
                      mb-1
                    "
                  >
                    Modalidad
                  </label>

                  <select
                    name="modalidad"
                    value={
                      form.modalidad
                    }
                    onChange={
                      onChange
                    }
                    className="
                      w-full
                      border
                      border-slate-300
                      rounded-lg
                      px-2
                      py-2
                      text-sm
                      bg-white
                    "
                  >
                    {MODALIDADES.map(
                      (
                        modalidad
                      ) => (
                        <option
                          key={
                            modalidad
                          }
                          value={
                            modalidad
                          }
                        >
                          {modalidad}
                        </option>
                      )
                    )}
                  </select>
                </div>


                <div
                  className="
                    md:col-span-3
                  "
                >
                  <label
                    className="
                      block
                      text-xs
                      font-semibold
                      mb-1
                    "
                  >
                    Lugar
                  </label>

                  <input
                    type="text"
                    name="lugar"
                    value={
                      form.lugar
                    }
                    onChange={
                      onChange
                    }
                    placeholder="Ej: Auditorio, Sala 2..."
                    className="
                      w-full
                      border
                      border-slate-300
                      rounded-lg
                      px-2
                      py-2
                      text-sm
                    "
                  />
                </div>
              </div>
            </div>


            {/* ==============================================
                RESPONSABLE Y DESCRIPCIÓN
            ============================================== */}

            <div
              className="
                border-t
                border-slate-200
                pt-4
              "
            >
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-slate-500
                  mb-2
                "
              >
                Responsable y descripción
              </p>

              <div
                className="
                  grid
                  grid-cols-1
                  md:grid-cols-12
                  gap-3
                "
              >
                <div
                  className="
                    md:col-span-4
                  "
                >
                  <label
                    className="
                      block
                      text-xs
                      font-semibold
                      mb-1
                    "
                  >
                    Responsable / Líder
                  </label>

                  <input
                    type="text"
                    name="responsable"
                    value={
                      form.responsable
                    }
                    onChange={
                      onChange
                    }
                    placeholder="Nombre del encargado"
                    className="
                      w-full
                      border
                      border-slate-300
                      rounded-lg
                      px-2
                      py-2
                      text-sm
                    "
                  />
                </div>


                <div
                  className="
                    md:col-span-8
                  "
                >
                  <label
                    className="
                      block
                      text-xs
                      font-semibold
                      mb-1
                    "
                  >
                    Descripción *
                  </label>

                  <textarea
                    name="descripcion"
                    rows={3}
                    value={
                      form.descripcion
                    }
                    onChange={
                      onChange
                    }
                    placeholder="Descripción de la reunión, capacitación o actividad..."
                    className="
                      w-full
                      border
                      border-slate-300
                      rounded-lg
                      px-2
                      py-2
                      text-sm
                      resize-y
                    "
                  />
                </div>
              </div>
            </div>


            {/* ==============================================
                BOTONES FORM
            ============================================== */}

            <div
              className="
                flex
                flex-wrap
                justify-end
                gap-2
                border-t
                border-slate-200
                pt-4
              "
            >
              <button
                type="button"
                onClick={
                  limpiarForm
                }
                className="
                  bg-gray-500
                  hover:bg-gray-700
                  text-white
                  px-3
                  py-2
                  rounded-lg
                  text-xs
                  flex
                  items-center
                  gap-2
                "
              >
                <i
                  className="
                    fas
                    fa-eraser
                  "
                ></i>

                Limpiar
              </button>


              <button
                type="button"
                onClick={
                  crearReunion
                }
                disabled={
                  guardando
                }
                className="
                  bg-[var(--primary)]
                  hover:bg-[var(--primary-dark)]
                  text-white
                  px-4
                  py-2
                  rounded-lg
                  text-xs
                  font-semibold
                  flex
                  items-center
                  gap-2
                  disabled:opacity-60
                "
              >
                <i
                  className="
                    fas
                    fa-save
                  "
                ></i>

                {
                  guardando
                    ? 'Guardando...'
                    : 'Guardar reunión'
                }
              </button>
            </div>
          </div>
        </div>


        {/* ==================================================
            CONSULTA
        ================================================== */}

        <div
          className="
            bg-white
            rounded-2xl
            border
            border-slate-200
            shadow-sm
            overflow-hidden
          "
        >
          <div
            className="
              bg-slate-800
              text-white
              px-4
              py-3
              flex
              flex-col
              md:flex-row
              md:items-center
              md:justify-between
              gap-2
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <i
                className="
                  fas
                  fa-magnifying-glass
                "
              ></i>

              <div>
                <h2
                  className="
                    text-sm
                    font-semibold
                  "
                >
                  Consultar reuniones
                </h2>

                <p
                  className="
                    text-[10px]
                    opacity-80
                  "
                >
                  Filtre y consulte las reuniones registradas
                </p>
              </div>
            </div>


            <button
              type="button"
              onClick={
                cargarReuniones
              }
              disabled={
                cargandoLista
              }
              className="
                bg-white/10
                hover:bg-white/20
                border
                border-white/20
                px-3
                py-1.5
                rounded-lg
                text-xs
                flex
                items-center
                justify-center
                gap-2
                disabled:opacity-60
              "
            >
              <i
                className="
                  fas
                  fa-rotate
                "
              ></i>

              {
                cargandoLista
                  ? 'Actualizando...'
                  : 'Actualizar'
              }
            </button>
          </div>


          {/* ==============================================
              FILTROS
          ============================================== */}

          <div
            className="
              p-4
              border-b
              border-slate-200
              bg-slate-50
            "
          >
            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                xl:grid-cols-12
                gap-3
              "
            >
              <div
                className="
                  xl:col-span-3
                "
              >
                <label
                  className="
                    block
                    text-[10px]
                    font-semibold
                    mb-1
                    text-slate-600
                  "
                >
                  Buscar
                </label>

                <div
                  className="
                    relative
                  "
                >
                  <i
                    className="
                      fas
                      fa-magnifying-glass
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                      text-xs
                    "
                  ></i>

                  <input
                    type="text"
                    name="busqueda"
                    value={
                      filtros.busqueda
                    }
                    onChange={
                      onChangeFiltro
                    }
                    placeholder="Descripción, responsable..."
                    className="
                      w-full
                      border
                      border-slate-300
                      rounded-lg
                      pl-8
                      pr-2
                      py-2
                      text-xs
                      bg-white
                    "
                  />
                </div>
              </div>


              <div
                className="
                  xl:col-span-2
                "
              >
                <label
                  className="
                    block
                    text-[10px]
                    font-semibold
                    mb-1
                    text-slate-600
                  "
                >
                  Contexto
                </label>

                <select
                  name="origen_modulo"
                  value={
                    filtros.origen_modulo
                  }
                  onChange={
                    onChangeFiltro
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-2
                    py-2
                    text-xs
                    bg-white
                  "
                >
                  <option value="">
                    Todos
                  </option>

                  {ORIGENES_MODULO.map(
                    (
                      origen
                    ) => (
                      <option
                        key={
                          origen.value
                        }
                        value={
                          origen.value
                        }
                      >
                        {origen.label}
                      </option>
                    )
                  )}
                </select>
              </div>


              <div
                className="
                  xl:col-span-2
                "
              >
                <label
                  className="
                    block
                    text-[10px]
                    font-semibold
                    mb-1
                    text-slate-600
                  "
                >
                  Tipo
                </label>

                <select
                  name="tipo_reunion"
                  value={
                    filtros.tipo_reunion
                  }
                  onChange={
                    onChangeFiltro
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-2
                    py-2
                    text-xs
                    bg-white
                  "
                >
                  <option value="">
                    Todos
                  </option>

                  {TIPOS.map(
                    (
                      tipo
                    ) => (
                      <option
                        key={
                          tipo
                        }
                        value={
                          tipo
                        }
                      >
                        {tipo}
                      </option>
                    )
                  )}
                </select>
              </div>


              <div
                className="
                  xl:col-span-2
                "
              >
                <label
                  className="
                    block
                    text-[10px]
                    font-semibold
                    mb-1
                    text-slate-600
                  "
                >
                  Estado
                </label>

                <select
                  name="estado"
                  value={
                    filtros.estado
                  }
                  onChange={
                    onChangeFiltro
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-2
                    py-2
                    text-xs
                    bg-white
                  "
                >
                  <option value="">
                    Todos
                  </option>

                  {ESTADOS.map(
                    (
                      estado
                    ) => (
                      <option
                        key={
                          estado
                        }
                        value={
                          estado
                        }
                      >
                        {estado}
                      </option>
                    )
                  )}
                </select>
              </div>


              <div
                className="
                  xl:col-span-3
                "
              >
                <label
                  className="
                    block
                    text-[10px]
                    font-semibold
                    mb-1
                    text-slate-600
                  "
                >
                  Dirigido a
                </label>

                <select
                  name="dirigido_a"
                  value={
                    filtros.dirigido_a
                  }
                  onChange={
                    onChangeFiltro
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-2
                    py-2
                    text-xs
                    bg-white
                  "
                >
                  <option value="">
                    Todos
                  </option>

                  {DIRIGIDO_A.map(
                    (
                      dirigido
                    ) => (
                      <option
                        key={
                          dirigido
                        }
                        value={
                          dirigido
                        }
                      >
                        {dirigido}
                      </option>
                    )
                  )}
                </select>
              </div>


              <div
                className="
                  xl:col-span-3
                "
              >
                <label
                  className="
                    block
                    text-[10px]
                    font-semibold
                    mb-1
                    text-slate-600
                  "
                >
                  Desde
                </label>

                <input
                  type="date"
                  name="fecha_desde"
                  value={
                    filtros.fecha_desde
                  }
                  onChange={
                    onChangeFiltro
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-2
                    py-2
                    text-xs
                    bg-white
                  "
                />
              </div>


              <div
                className="
                  xl:col-span-3
                "
              >
                <label
                  className="
                    block
                    text-[10px]
                    font-semibold
                    mb-1
                    text-slate-600
                  "
                >
                  Hasta
                </label>

                <input
                  type="date"
                  name="fecha_hasta"
                  value={
                    filtros.fecha_hasta
                  }
                  onChange={
                    onChangeFiltro
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-2
                    py-2
                    text-xs
                    bg-white
                  "
                />
              </div>


              <div
                className="
                  xl:col-span-6
                  flex
                  items-end
                  justify-end
                "
              >
                <button
                  type="button"
                  onClick={
                    limpiarFiltros
                  }
                  className="
                    bg-gray-500
                    hover:bg-gray-700
                    text-white
                    px-3
                    py-2
                    rounded-lg
                    text-xs
                    flex
                    items-center
                    gap-2
                  "
                >
                  <i
                    className="
                      fas
                      fa-filter-circle-xmark
                    "
                  ></i>

                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>


          {/* ==============================================
              RESULTADOS
          ============================================== */}

          <div
            className="
              px-4
              py-2
              bg-white
              border-b
              border-slate-200
              flex
              flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-1
              text-[11px]
              text-slate-600
            "
          >
            <span>
              Registros consultados:{' '}

              <strong>
                {reuniones.length}
              </strong>
            </span>

            <span>
              Resultados mostrados:{' '}

              <strong>
                {
                  reunionesFiltradas.length
                }
              </strong>
            </span>
          </div>


          {/* ==============================================
              TABLA
          ============================================== */}

          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                min-w-[1050px]
                text-[11px]
                border-collapse
              "
            >
              <thead
                className="
                  bg-slate-800
                  text-white
                "
              >
                <tr>
                  <th
                    className="
                      p-2
                      border
                      text-center
                      whitespace-nowrap
                    "
                  >
                    Fecha / Hora
                  </th>

                  <th
                    className="
                      p-2
                      border
                      text-center
                    "
                  >
                    Tipo
                  </th>

                  <th
                    className="
                      p-2
                      border
                      text-center
                    "
                  >
                    Contexto
                  </th>

                  <th
                    className="
                      p-2
                      border
                      text-center
                    "
                  >
                    Descripción
                  </th>

                  <th
                    className="
                      p-2
                      border
                      text-center
                    "
                  >
                    Dirigido a
                  </th>

                  <th
                    className="
                      p-2
                      border
                      text-center
                    "
                  >
                    Responsable
                  </th>

                  <th
                    className="
                      p-2
                      border
                      text-center
                    "
                  >
                    Estado
                  </th>

                  <th
                    className="
                      p-2
                      border
                      text-center
                      whitespace-nowrap
                    "
                  >
                    Acciones
                  </th>
                </tr>
              </thead>


              <tbody>
                {cargandoLista ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="
                        p-5
                        text-center
                        text-slate-500
                      "
                    >
                      <i
                        className="
                          fas
                          fa-spinner
                          fa-spin
                          mr-2
                        "
                      ></i>

                      Cargando reuniones...
                    </td>
                  </tr>
                ) : reunionesFiltradas.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="
                        p-6
                        text-center
                        text-slate-500
                      "
                    >
                      <i
                        className="
                          fas
                          fa-calendar-xmark
                          text-xl
                          mb-2
                          block
                        "
                      ></i>

                      No hay reuniones que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  reunionesFiltradas.map(
                    (
                      reunion
                    ) => {
                      const hoy =
                        fechaBogotaActual()

                      const hm =
                        horaBogotaActual()

                      const yaTermino =
                        String(
                          reunion.fecha_programada
                        ) < hoy ||
                        (
                          String(
                            reunion.fecha_programada
                          ) === hoy &&
                          String(
                            reunion.hora_fin
                          ) <= hm
                        )

                      const puedeCancelar =
                        reunion.estado ===
                          'Programada' &&
                        !yaTermino

                      const puedeExcel =
                        reunion.estado ===
                        'Ejecutada'

                      return (
                        <tr
                          key={
                            reunion.id
                          }
                          className="
                            odd:bg-white
                            even:bg-slate-50
                            hover:bg-blue-50
                            transition
                          "
                        >
                          <td
                            className="
                              p-2
                              border
                              text-center
                              whitespace-nowrap
                            "
                          >
                            <div
                              className="
                                font-semibold
                                text-slate-700
                              "
                            >
                              {
                                formatearFecha(
                                  reunion.fecha_programada
                                )
                              }
                            </div>

                            <div
                              className="
                                text-[10px]
                                text-slate-500
                              "
                            >
                              {
                                reunion.hora_inicio
                              }
                              {' - '}
                              {
                                reunion.hora_fin
                              }
                            </div>
                          </td>


                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            {
                              reunion.tipo_reunion
                            }
                          </td>


                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            <OrigenPill
                              origen={
                                reunion.origen_modulo
                              }
                            />
                          </td>


                          <td
                            className="
                              p-2
                              border
                              text-left
                              max-w-[320px]
                            "
                          >
                            <div
                              className="
                                line-clamp-2
                              "
                              title={
                                reunion.descripcion
                              }
                            >
                              {
                                reunion.descripcion
                              }
                            </div>
                          </td>


                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            {
                              reunion.dirigido_a ||
                              '-'
                            }
                          </td>


                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            {
                              reunion.responsable ||
                              '-'
                            }
                          </td>


                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            <EstadoPill
                              estado={
                                reunion.estado
                              }
                            />
                          </td>


                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            <div
                              className="
                                flex
                                items-center
                                justify-center
                                gap-1.5
                              "
                            >

                              {/* VER */}

                              <button
                                type="button"
                                onClick={
                                  () =>
                                    setReunionDetalle(
                                      reunion
                                    )
                                }
                                className="
                                  bg-blue-600
                                  hover:bg-blue-800
                                  text-white
                                  w-8
                                  h-8
                                  rounded-lg
                                  flex
                                  items-center
                                  justify-center
                                "
                                title="Ver detalle"
                              >
                                <i
                                  className="
                                    fas
                                    fa-eye
                                  "
                                ></i>
                              </button>


                              {/* EXCEL */}

                              <button
                                type="button"
                                onClick={
                                  () =>
                                    descargarExcel(
                                      reunion.id
                                    )
                                }
                                disabled={
                                  !puedeExcel
                                }
                                className={`
                                  w-8
                                  h-8
                                  rounded-lg
                                  flex
                                  items-center
                                  justify-center
                                  ${
                                    puedeExcel
                                      ? 'bg-green-600 hover:bg-green-800 text-white'
                                      : 'bg-green-300 text-white cursor-not-allowed'
                                  }
                                `}
                                title={
                                  puedeExcel
                                    ? 'Descargar asistentes'
                                    : 'Disponible cuando esté Ejecutada'
                                }
                              >
                                <i
                                  className="
                                    fas
                                    fa-file-excel
                                  "
                                ></i>
                              </button>


                              {/* CANCELAR */}

                              <button
                                type="button"
                                onClick={
                                  () =>
                                    cancelarReunion(
                                      reunion.id,
                                      reunion.estado
                                    )
                                }
                                disabled={
                                  !puedeCancelar
                                }
                                className={`
                                  w-8
                                  h-8
                                  rounded-lg
                                  flex
                                  items-center
                                  justify-center
                                  ${
                                    puedeCancelar
                                      ? 'bg-red-600 hover:bg-red-800 text-white'
                                      : 'bg-red-300 text-white cursor-not-allowed'
                                  }
                                `}
                                title={
                                  puedeCancelar
                                    ? 'Cancelar reunión'
                                    : 'No disponible'
                                }
                              >
                                <i
                                  className="
                                    fas
                                    fa-ban
                                  "
                                ></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* ====================================================
          MODAL DETALLE
      ==================================================== */}

      {reunionDetalle && (
        <div
          className="
            fixed
            inset-0
            z-50
            bg-black/40
            flex
            items-center
            justify-center
            p-4
          "
          onClick={
            () =>
              setReunionDetalle(
                null
              )
          }
        >
          <div
            className="
              bg-white
              w-full
              max-w-2xl
              max-h-[90vh]
              overflow-y-auto
              rounded-2xl
              shadow-2xl
              border
              border-slate-200
            "
            onClick={
              (
                e
              ) =>
                e.stopPropagation()
            }
          >

            {/* CABECERA MODAL */}

            <div
              className="
                bg-slate-800
                text-white
                px-4
                py-3
                flex
                items-center
                justify-between
                gap-3
                rounded-t-2xl
              "
            >
              <div>
                <p
                  className="
                    text-[10px]
                    uppercase
                    opacity-70
                    mb-1
                  "
                >
                  Detalle de la reunión
                </p>

                <h3
                  className="
                    text-base
                    font-bold
                  "
                >
                  {
                    reunionDetalle.tipo_reunion
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={
                  () =>
                    setReunionDetalle(
                      null
                    )
                }
                className="
                  w-8
                  h-8
                  rounded-lg
                  hover:bg-white/10
                  flex
                  items-center
                  justify-center
                "
              >
                <i
                  className="
                    fas
                    fa-xmark
                  "
                ></i>
              </button>
            </div>


            {/* CONTENIDO MODAL */}

            <div
              className="
                p-4
                space-y-4
              "
            >
              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
                <OrigenPill
                  origen={
                    reunionDetalle.origen_modulo
                  }
                />

                <EstadoPill
                  estado={
                    reunionDetalle.estado
                  }
                />
              </div>


              <div
                className="
                  bg-slate-50
                  border
                  border-slate-200
                  rounded-xl
                  p-3
                "
              >
                <p
                  className="
                    text-[10px]
                    uppercase
                    font-bold
                    text-slate-500
                    mb-1
                  "
                >
                  Descripción
                </p>

                <p
                  className="
                    text-sm
                    text-slate-700
                    whitespace-pre-wrap
                  "
                >
                  {
                    reunionDetalle.descripcion ||
                    '-'
                  }
                </p>
              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  gap-3
                "
              >
                <DetalleCampo
                  titulo="Fecha"
                  valor={
                    formatearFecha(
                      reunionDetalle.fecha_programada
                    )
                  }
                  icono="fa-calendar-day"
                />

                <DetalleCampo
                  titulo="Hora"
                  valor={`${reunionDetalle.hora_inicio} - ${reunionDetalle.hora_fin}`}
                  icono="fa-clock"
                />

                <DetalleCampo
                  titulo="Modalidad"
                  valor={
                    reunionDetalle.modalidad ||
                    '-'
                  }
                  icono="fa-location-dot"
                />

                <DetalleCampo
                  titulo="Lugar"
                  valor={
                    reunionDetalle.lugar ||
                    '-'
                  }
                  icono="fa-building"
                />

                <DetalleCampo
                  titulo="Responsable"
                  valor={
                    reunionDetalle.responsable ||
                    '-'
                  }
                  icono="fa-user-tie"
                />

                <DetalleCampo
                  titulo="Dirigido a"
                  valor={
                    reunionDetalle.dirigido_a ||
                    '-'
                  }
                  icono="fa-users"
                />

                <DetalleCampo
                  titulo="Creado por"
                  valor={
                    reunionDetalle.creado_por ||
                    '-'
                  }
                  icono="fa-user-pen"
                />

                <DetalleCampo
                  titulo="Contexto"
                  valor={
                    obtenerEtiquetaOrigen(
                      reunionDetalle.origen_modulo
                    )
                  }
                  icono="fa-layer-group"
                />
              </div>


              {/* BOTONES MODAL */}

              <div
                className="
                  flex
                  flex-wrap
                  justify-end
                  gap-2
                  border-t
                  border-slate-200
                  pt-4
                "
              >
                {reunionDetalle.estado ===
                  'Ejecutada' && (
                  <button
                    type="button"
                    onClick={
                      () =>
                        descargarExcel(
                          reunionDetalle.id
                        )
                    }
                    className="
                      bg-green-600
                      hover:bg-green-800
                      text-white
                      px-3
                      py-2
                      rounded-lg
                      text-xs
                      flex
                      items-center
                      gap-2
                    "
                  >
                    <i
                      className="
                        fas
                        fa-file-excel
                      "
                    ></i>

                    Descargar asistentes
                  </button>
                )}


                <button
                  type="button"
                  onClick={
                    () =>
                      setReunionDetalle(
                        null
                      )
                  }
                  className="
                    bg-gray-600
                    hover:bg-gray-800
                    text-white
                    px-3
                    py-2
                    rounded-lg
                    text-xs
                  "
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ============================================================
// CAMPO DETALLE
// ============================================================

function DetalleCampo({
  titulo,
  valor,
  icono,
}) {
  return (
    <div
      className="
        border
        border-slate-200
        rounded-xl
        p-3
        bg-white
      "
    >
      <div
        className="
          flex
          items-start
          gap-2
        "
      >
        <div
          className="
            w-7
            h-7
            rounded-lg
            bg-slate-100
            text-slate-600
            flex
            items-center
            justify-center
            shrink-0
          "
        >
          <i
            className={`
              fas
              ${icono}
              text-[11px]
            `}
          ></i>
        </div>

        <div
          className="
            min-w-0
          "
        >
          <p
            className="
              text-[9px]
              uppercase
              tracking-wide
              font-bold
              text-slate-500
            "
          >
            {titulo}
          </p>

          <p
            className="
              text-xs
              text-slate-800
              font-medium
              mt-1
              break-words
            "
          >
            {valor}
          </p>
        </div>
      </div>
    </div>
  )
}