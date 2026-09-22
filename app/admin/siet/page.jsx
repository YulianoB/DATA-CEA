// app/admin/siet/page.jsx
'use client'


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
  cerrarSesion,
} from '@/lib/auth/logout'

// =========================================================
// CONSTANTES
// =========================================================

const API_URL =
  '/api/admin/siet'

const ESTADOS = [
  {
    value:
      'PENDIENTE',

    label:
      'Pendientes',
  },
  {
    value:
      'REGISTRADO',

    label:
      'Registrados',
  },
  {
    value:
      'CERTIFICADO',

    label:
      'Certificados',
  },
]

const ESTADO_INICIAL =
  'PENDIENTE'

// =========================================================
// HELPERS
// =========================================================

function normalizarTexto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}

function normalizarMayusculas(
  valor
) {
  return normalizarTexto(
    valor
  ).toUpperCase()
}

function obtenerNitUsuario(
  user
) {
  return normalizarTexto(
    user?.nit ||
    user?.nitEmpresa ||
    user?.nit_empresa ||
    user?.empresaNit ||
    user?.empresa_nit ||
    ''
  )
}

function obtenerNombreUsuario(
  user
) {
  return (
    user?.nombreCompleto ||
    user?.nombre_completo ||
    user?.usuario ||
    user?.nombre ||
    user?.correo ||
    user?.email ||
    ''
  )
}

function obtenerNombreEmpresa(
  user
) {
  return (
    user?.nombreEmpresa ||
    user?.nombre_empresa ||
    user?.empresa ||
    ''
  )
}

function formatearFecha(
  valor
) {
  if (
    !valor
  ) {
    return '-'
  }

  try {
    const fecha =
      new Date(
        `${String(
          valor
        ).slice(
          0,
          10
        )}T12:00:00`
      )

    if (
      Number.isNaN(
        fecha.getTime()
      )
    ) {
      return valor
    }

    return new Intl.DateTimeFormat(
      'es-CO',
      {
        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',
      }
    ).format(
      fecha
    )
  } catch {
    return valor
  }
}

function formatearDocumento(
  valor
) {
  const limpio =
    String(
      valor ||
      ''
    ).replace(
      /\D/g,
      ''
    )

  if (
    !limpio
  ) {
    return '-'
  }

  try {
    return new Intl.NumberFormat(
      'es-CO'
    ).format(
      Number(
        limpio
      )
    )
  } catch {
    return valor
  }
}

function obtenerNombreCompleto(
  registro
) {
  if (
    registro
      ?.aprendiz
      ?.nombre_completo
  ) {
    return normalizarTexto(
      registro
        .aprendiz
        .nombre_completo
    )
  }

  if (
    registro
      ?.nombre_completo
  ) {
    return normalizarTexto(
      registro
        .nombre_completo
    )
  }

  return [
    registro
      ?.aprendiz
      ?.nombres ||
      registro?.nombres,

    registro
      ?.aprendiz
      ?.apellidos ||
      registro?.apellidos,
  ]
    .filter(
      Boolean
    )
    .join(
      ' '
    )
    .trim()
}

function obtenerCategoria(
  registro
) {
  if (
    registro
      ?.categoria
  ) {
    return normalizarMayusculas(
      registro.categoria
    )
  }

  if (
    registro
      ?.aprendiz
      ?.categoria
  ) {
    return normalizarMayusculas(
      registro
        .aprendiz
        .categoria
    )
  }

  return '-'
}

// =========================================================
// FETCH JSON SEGURO
// =========================================================

async function fetchJsonSeguro(
  url,
  opciones = {}
) {
  const response =
    await fetch(
      url,
      {
        cache:
          'no-store',

        ...opciones,
      }
    )

  const textoRespuesta =
    await response.text()

  let data

  try {
    data =
      textoRespuesta
        ? JSON.parse(
            textoRespuesta
          )
        : {}
  } catch {
    console.error(
      `API NO JSON | URL: ${url} | HTTP: ${response.status} | RESPUESTA: ${textoRespuesta.slice(
        0,
        1000
      )}`
    )

    throw new Error(
      'El servidor devolvió una respuesta no válida.'
    )
  }

  if (
    !response.ok ||
    data?.status ===
      'error'
  ) {
    throw new Error(
      data?.message ||
      data?.error ||
      `Error HTTP ${response.status}`
    )
  }

  return data
}

// =========================================================
// BADGE ESTADO
// =========================================================

function BadgeEstado({
  estado,
}) {
  const valor =
    normalizarMayusculas(
      estado
    )

  let clases =
    'bg-slate-100 text-slate-700 border-slate-200'

  let icono =
    'fas fa-circle'

  if (
    valor ===
    'PENDIENTE'
  ) {
    clases =
      'bg-amber-50 text-amber-700 border-amber-200'

    icono =
      'fas fa-clock'
  }

  if (
    valor ===
    'REGISTRADO'
  ) {
    clases =
      'bg-blue-50 text-blue-700 border-blue-200'

    icono =
      'fas fa-upload'
  }

  if (
    valor ===
    'CERTIFICADO'
  ) {
    clases =
      'bg-emerald-50 text-emerald-700 border-emerald-200'

    icono =
      'fas fa-check-circle'
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-2
        rounded-full
        border
        px-3
        py-1
        text-xs
        font-bold
        ${clases}
      `}
    >
      <i
        className={
          icono
        }
      ></i>

      {valor ||
        'SIN ESTADO'}
    </span>
  )
}

// =========================================================
// TARJETA RESUMEN
// =========================================================

function TarjetaResumen({
  titulo,
  valor,
  icono,
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-4
        "
      >
        <div>

          <p
            className="
              text-xs
              font-bold
              uppercase
              tracking-wide
              text-slate-500
            "
          >
            {titulo}
          </p>

          <p
            className="
              mt-2
              text-3xl
              font-black
              text-slate-900
            "
          >
            {valor}
          </p>

        </div>

        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-2xl
            bg-slate-100
            text-xl
            text-slate-600
          "
        >
          <i
            className={
              icono
            }
          ></i>
        </div>

      </div>
    </div>
  )
}

// =========================================================
// PÁGINA
// =========================================================

export default function SietPage() {
  const router =
    useRouter()

  // =======================================================
  // SESIÓN / MULTIEMPRESA
  // =======================================================

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState(
      null
    )

  const [
    nit,
    setNit,
  ] =
    useState('')

  const [
    empresaNombre,
    setEmpresaNombre,
  ] =
    useState('')

  const [
    sesionLista,
    setSesionLista,
  ] =
    useState(
      false
    )

  // =======================================================
  // FILTROS
  // =======================================================

  const [
    estado,
    setEstado,
  ] =
    useState(
      ESTADO_INICIAL
    )

  const [
    busqueda,
    setBusqueda,
  ] =
    useState('')

  // =======================================================
  // DATOS
  // =======================================================

  const [
    registros,
    setRegistros,
  ] =
    useState([])

  const [
    cargando,
    setCargando,
  ] =
    useState(
      false
    )

  const [
    actualizando,
    setActualizando,
  ] =
    useState(
      false
    )

  // =======================================================
  // SELECCIÓN
  // =======================================================

  const [
    seleccionados,
    setSeleccionados,
  ] =
    useState([])

  // =======================================================
  // DRAWER
  // =======================================================

  const [
    drawerOpen,
    setDrawerOpen,
  ] =
    useState(
      false
    )

  const [
    detalle,
    setDetalle,
  ] =
    useState(
      null
    )

  const [
    cargandoDetalle,
    setCargandoDetalle,
  ] =
    useState(
      false
    )

  const [
    observaciones,
    setObservaciones,
  ] =
    useState('')

  // =======================================================
  // MENSAJES
  // =======================================================

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    mensaje,
    setMensaje,
  ] =
    useState('')

  // =======================================================
  // LEER SESIÓN
  // =======================================================

  useEffect(
    () => {
      try {
        const stored =
          localStorage.getItem(
            'currentUser'
          )

        if (
          !stored
        ) {
          router.push(
            '/login'
          )

          return
        }

        const usuario =
          JSON.parse(
            stored
          )

        const nitUsuario =
          obtenerNitUsuario(
            usuario
          )

        if (
          !nitUsuario
        ) {
          setError(
            'No se encontró el NIT del CEA en la sesión actual.'
          )

          setSesionLista(
            true
          )

          return
        }

        setCurrentUser(
          usuario
        )

        setNit(
          nitUsuario
        )

        setEmpresaNombre(
          obtenerNombreEmpresa(
            usuario
          )
        )

        setSesionLista(
          true
        )
      } catch (
        errorSesion
      ) {
        console.error(
          'Error leyendo currentUser:',
          errorSesion
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

  // =======================================================
  // USUARIO
  // =======================================================

  const usuarioOperacion =
    useMemo(
      () =>
        obtenerNombreUsuario(
          currentUser
        ),
      [
        currentUser,
      ]
    )

  // =======================================================
  // CONSULTAR
  // =======================================================

  const consultar =
    useCallback(
      async (
        opciones = {}
      ) => {
        if (
          !nit
        ) {
          return
        }

        const {
          silencioso =
            false,

          estadoOverride =
            undefined,

          busquedaOverride =
            undefined,
        } =
          opciones

        if (
          !silencioso
        ) {
          setCargando(
            true
          )
        }

        setError('')
        setMensaje('')

        try {
          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'consultar'
          )

          params.set(
            'nit',
            nit
          )

          const estadoConsulta =
            estadoOverride !==
              undefined
              ? estadoOverride
              : estado

          const busquedaConsulta =
            busquedaOverride !==
              undefined
              ? busquedaOverride
              : busqueda

          if (
            estadoConsulta
          ) {
            params.set(
              'estado',
              estadoConsulta
            )
          }

          if (
            normalizarTexto(
              busquedaConsulta
            )
          ) {
            params.set(
              'q',
              normalizarTexto(
                busquedaConsulta
              )
            )
          }

          const data =
            await fetchJsonSeguro(
              `${API_URL}?${params.toString()}`
            )

          setRegistros(
            Array.isArray(
              data?.data
            )
              ? data.data
              : []
          )

          setSeleccionados(
            []
          )

          if (
            data
              ?.empresa
              ?.nombre
          ) {
            setEmpresaNombre(
              data
                .empresa
                .nombre
            )
          }
        } catch (
          errorConsulta
        ) {
          console.error(
            'Error consultando SIET:',
            errorConsulta
          )

          setRegistros(
            []
          )

          setSeleccionados(
            []
          )

          setError(
            errorConsulta
              ?.message ||
            'No fue posible consultar SIET.'
          )
        } finally {
          if (
            !silencioso
          ) {
            setCargando(
              false
            )
          }
        }
      },
      [
        nit,
        estado,
        busqueda,
      ]
    )

  // =======================================================
  // CARGA AUTOMÁTICA
  // =======================================================

  useEffect(
    () => {
      if (
        !sesionLista ||
        !currentUser ||
        !nit
      ) {
        return
      }

      consultar()
    },
    [
      sesionLista,
      currentUser,
      nit,
      estado,
      consultar,
    ]
  )

  // =======================================================
  // BUSCAR
  // =======================================================

  function ejecutarBusqueda(
    event
  ) {
    event
      ?.preventDefault?.()

    consultar()
  }

  // =======================================================
  // LIMPIAR BÚSQUEDA
  // =======================================================

  function limpiarBusqueda() {
    setBusqueda('')

    consultar({
      busquedaOverride:
        '',
    })
  }

  // =======================================================
  // IDS VISIBLES
  // =======================================================

  const idsVisibles =
    useMemo(
      () =>
        registros
          .map(
            registro =>
              Number(
                registro?.id
              )
          )
          .filter(
            id =>
              Number.isInteger(
                id
              ) &&
              id >
                0
          ),
      [
        registros,
      ]
    )

  const todosSeleccionados =
    idsVisibles.length >
      0 &&
    idsVisibles.every(
      id =>
        seleccionados.includes(
          id
        )
    )

  // =======================================================
  // SELECCIONAR UNO
  // =======================================================

  function alternarSeleccion(
    id
  ) {
    const numero =
      Number(
        id
      )

    setSeleccionados(
      actuales => {
        if (
          actuales.includes(
            numero
          )
        ) {
          return actuales.filter(
            item =>
              item !==
              numero
          )
        }

        return [
          ...actuales,
          numero,
        ]
      }
    )
  }

  // =======================================================
  // TODOS
  // =======================================================

  function alternarTodos() {
    if (
      todosSeleccionados
    ) {
      setSeleccionados(
        []
      )

      return
    }

    setSeleccionados(
      idsVisibles
    )
  }

  // =======================================================
  // ABRIR DETALLE
  // =======================================================

  async function abrirDetalle(
    registro
  ) {
    if (
      !registro?.id ||
      !nit
    ) {
      return
    }

    setDrawerOpen(
      true
    )

    setDetalle(
      null
    )

    setObservaciones(
      ''
    )

    setCargandoDetalle(
      true
    )

    setError('')

    try {
      const params =
        new URLSearchParams()

      params.set(
        'recurso',
        'detalle'
      )

      params.set(
        'control_siet_id',
        String(
          registro.id
        )
      )

      params.set(
        'nit',
        nit
      )

      const data =
        await fetchJsonSeguro(
          `${API_URL}?${params.toString()}`
        )

      setDetalle(
        data?.data ||
        null
      )

      setObservaciones(
        data
          ?.data
          ?.control
          ?.observaciones ||
        ''
      )
    } catch (
      errorDetalle
    ) {
      console.error(
        'Error consultando detalle SIET:',
        errorDetalle
      )

      setError(
        errorDetalle
          ?.message ||
        'No fue posible consultar el detalle SIET.'
      )

      setDrawerOpen(
        false
      )
    } finally {
      setCargandoDetalle(
        false
      )
    }
  }

  // =======================================================
  // CERRAR DRAWER
  // =======================================================

  function cerrarDrawer() {
    if (
      actualizando
    ) {
      return
    }

    setDrawerOpen(
      false
    )

    setDetalle(
      null
    )

    setObservaciones(
      ''
    )
  }

  // =======================================================
  // POST
  // =======================================================

  async function ejecutarAccion(
    payload
  ) {
    if (
      !nit
    ) {
      throw new Error(
        'No se encontró el NIT del CEA.'
      )
    }

    return fetchJsonSeguro(
      API_URL,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            ...payload,

            nit,

            usuario:
              usuarioOperacion,
          }),
      }
    )
  }

  // =======================================================
  // ACTUALIZAR INDIVIDUAL
  // =======================================================

  async function actualizarIndividual(
    registro,
    nuevoEstado,
    observacionesAccion = ''
  ) {
    if (
      !registro?.id
    ) {
      return
    }

    const destino =
      normalizarMayusculas(
        nuevoEstado
      )

    const accion =
      destino ===
      'REGISTRADO'
        ? 'registrar_siet'
        : 'certificar_siet'

    const mensajeConfirmacion =
      destino ===
      'REGISTRADO'
        ? `¿Confirma que ${obtenerNombreCompleto(
            registro
          )} ya fue cargado/registrado en SIET?`
        : `¿Confirma que ${obtenerNombreCompleto(
            registro
          )} ya fue certificado en SIET?`

    if (
      !window.confirm(
        mensajeConfirmacion
      )
    ) {
      return
    }

    setActualizando(
      true
    )

    setError('')
    setMensaje('')

    try {
      const data =
        await ejecutarAccion({
          accion,

          control_siet_id:
            registro.id,

          observaciones:
            observacionesAccion,
        })

      setMensaje(
        data?.message ||
        'Estado SIET actualizado correctamente.'
      )

      cerrarDrawer()

      await consultar({
        silencioso:
          true,
      })
    } catch (
      errorActualizacion
    ) {
      console.error(
        'Error actualizando SIET:',
        errorActualizacion
      )

      setError(
        errorActualizacion
          ?.message ||
        'No fue posible actualizar el registro SIET.'
      )
    } finally {
      setActualizando(
        false
      )
    }
  }

  // =======================================================
  // ACTUALIZACIÓN MASIVA
  // =======================================================

  async function actualizarMasivo(
    nuevoEstado
  ) {
    if (
      seleccionados.length ===
      0
    ) {
      setError(
        'Seleccione al menos un registro.'
      )

      return
    }

    const destino =
      normalizarMayusculas(
        nuevoEstado
      )

    const accion =
      destino ===
      'REGISTRADO'
        ? 'registrar_masivo'
        : 'certificar_masivo'

    const confirmacion =
      destino ===
      'REGISTRADO'
        ? `¿Confirma que los ${seleccionados.length} aprendices seleccionados ya fueron cargados correctamente en SIET?`
        : `¿Confirma que los ${seleccionados.length} aprendices seleccionados ya fueron certificados en SIET?`

    if (
      !window.confirm(
        confirmacion
      )
    ) {
      return
    }

    setActualizando(
      true
    )

    setError('')
    setMensaje('')

    try {
      const data =
        await ejecutarAccion({
          accion,

          ids:
            seleccionados,
        })

      setMensaje(
        data?.message ||
        `${seleccionados.length} registro(s) actualizados correctamente.`
      )

      setSeleccionados(
        []
      )

      await consultar({
        silencioso:
          true,
      })
    } catch (
      errorMasivo
    ) {
      console.error(
        'Error actualización masiva SIET:',
        errorMasivo
      )

      setError(
        errorMasivo
          ?.message ||
        'No fue posible realizar la actualización masiva.'
      )
    } finally {
      setActualizando(
        false
      )
    }
  }

  // =======================================================
  // RESUMEN
  // =======================================================

  const resumen =
    useMemo(
      () => {
        let pendientes =
          0

        let registrados =
          0

        let certificados =
          0

        for (
          const registro of
            registros
        ) {
          const valor =
            normalizarMayusculas(
              registro?.estado
            )

          if (
            valor ===
            'PENDIENTE'
          ) {
            pendientes +=
              1
          }

          if (
            valor ===
            'REGISTRADO'
          ) {
            registrados +=
              1
          }

          if (
            valor ===
            'CERTIFICADO'
          ) {
            certificados +=
              1
          }
        }

        return {
          pendientes,
          registrados,
          certificados,
        }
      },
      [
        registros,
      ]
    )

  // =======================================================
  // DATOS DRAWER
  // =======================================================

  const controlActual =
    detalle?.control ||
    null

  const aprendizActual =
    detalle?.aprendiz ||
    null

  const estadoDetalle =
    normalizarMayusculas(
      controlActual?.estado
    )

  // =======================================================
  // SESIÓN
  // =======================================================

  if (
    !sesionLista
  ) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  // =======================================================
  // RENDER
  // =======================================================

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
          max-w-7xl
          mx-auto
          bg-white
          border
          border-gray-200
          shadow-lg
          rounded-lg
          p-4
          md:p-6
        "
      >

        {/* ==================================================
            ENCABEZADO
        ================================================== */}

        <div
          className="
            bg-white
            border
            border-gray-500
            rounded-lg
            shadow-sm
            p-4
            mb-4
          "
        >

          <div
            className="
              flex
              flex-col
              lg:flex-row
              lg:items-center
              lg:justify-between
              gap-4
            "
          >

            <div>

              <p
                className="
                  text-xs
                  uppercase
                  tracking-wide
                  font-semibold
                  text-gray-500
                  mb-1
                "
              >
                Administración
              </p>

              <h1
                className="
                  text-2xl
                  font-bold
                  text-[var(--primary)]
                  flex
                  items-center
                  gap-2
                "
              >
                <i className="fas fa-graduation-cap"></i>

                Control SIET
              </h1>

              <p
                className="
                  text-sm
                  text-gray-600
                  mt-1
                "
              >
                Controle el registro y certificación de los aprendices en SIET.
              </p>

            </div>

            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >

              <button
                type="button"
                disabled
                title="Disponible cuando integremos la plantilla oficial SIET"
                className="
                  bg-gray-200
                  text-gray-500
                  px-3
                  py-2
                  rounded-lg
                  text-xs
                  cursor-not-allowed
                  flex
                  items-center
                  gap-2
                "
              >
                <i className="fas fa-file-excel"></i>

                Exportar Plantilla SIET
              </button>

              <button
                type="button"
                onClick={() =>
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
                  gap-2
                "
              >
                <i className="fas fa-arrow-left"></i>

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
                  py-2
                  rounded-lg
                  text-xs
                  flex
                  items-center
                  gap-2
                "
              >
                <i className="fas fa-sign-out-alt"></i>

                Cerrar Sesión
              </button>

            </div>

          </div>

        </div>

        {/* ==================================================
            USUARIO / MULTIEMPRESA
        ================================================== */}

        <div
          className="
            bg-white
            border
            border-gray-500
            rounded-lg
            p-3
            mb-4
            text-sm
          "
        >

          <div
            className="
              flex
              flex-wrap
              justify-between
              gap-2
            "
          >

            <span>
              Usuario:{' '}

              <strong>
                {usuarioOperacion ||
                  '-'}
              </strong>

              {currentUser?.rol && (
                <>
                  {' '}
                  ({currentUser.rol})
                </>
              )}
            </span>

            <span>
              CEA:{' '}

              <strong>
                {empresaNombre ||
                  '-'}
              </strong>

              {nit && (
                <>
                  {' '}
                  · NIT {nit}
                </>
              )}
            </span>

          </div>

        </div>

        {/* ==================================================
            MENSAJES
        ================================================== */}

        {error && (
          <div
            className="
              bg-red-50
              border
              border-red-300
              text-red-700
              rounded-lg
              p-3
              mb-4
              text-sm
            "
          >
            <i className="fas fa-exclamation-triangle mr-2"></i>

            {error}
          </div>
        )}

        {mensaje && (
          <div
            className="
              bg-emerald-50
              border
              border-emerald-300
              text-emerald-700
              rounded-lg
              p-3
              mb-4
              text-sm
            "
          >
            <i className="fas fa-check-circle mr-2"></i>

            {mensaje}
          </div>
        )}

        {/* ==================================================
            RESUMEN
        ================================================== */}

        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-3
            mb-4
          "
        >

          <TarjetaResumen
            titulo="Resultados"
            valor={
              registros.length
            }
            icono="fas fa-list"
          />

          <TarjetaResumen
            titulo="Pendientes"
            valor={
              resumen.pendientes
            }
            icono="fas fa-clock"
          />

          <TarjetaResumen
            titulo="Registrados"
            valor={
              resumen.registrados
            }
            icono="fas fa-upload"
          />

          <TarjetaResumen
            titulo="Certificados"
            valor={
              resumen.certificados
            }
            icono="fas fa-certificate"
          />

        </div>

        {/* ==================================================
            FILTROS
        ================================================== */}

        <div
          className="
            border
            border-gray-300
            rounded-lg
            overflow-hidden
            mb-4
          "
        >

          <div
            className="
              bg-slate-800
              text-white
              px-4
              py-3
              flex
              justify-between
              items-center
            "
          >
            <span
              className="
                text-sm
                font-semibold
              "
            >
              <i className="fas fa-filter mr-2"></i>

              Filtros SIET
            </span>

            <span
              className="
                text-[10px]
                text-gray-300
              "
            >
              Vista inicial: pendientes
            </span>
          </div>

          <form
            onSubmit={
              ejecutarBusqueda
            }
            className="
              p-4
              grid
              grid-cols-1
              md:grid-cols-[220px_1fr_auto]
              gap-3
            "
          >

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-semibold
                  mb-1
                "
              >
                Estado SIET
              </label>

              <select
                value={
                  estado
                }
                onChange={
                  event =>
                    setEstado(
                      event.target.value
                    )
                }
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-lg
                  px-3
                  py-2
                  text-xs
                "
              >

                {ESTADOS.map(
                  item => (
                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      {item.label}
                    </option>
                  )
                )}

              </select>

            </div>

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-semibold
                  mb-1
                "
              >
                Buscar
              </label>

              <div className="relative">

                <i
                  className="
                    fas
                    fa-search
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-gray-400
                  "
                ></i>

                <input
                  type="text"
                  value={
                    busqueda
                  }
                  onChange={
                    event =>
                      setBusqueda(
                        event.target.value
                      )
                  }
                  placeholder="Documento, matrícula o nombre..."
                  className="
                    w-full
                    border
                    border-gray-300
                    rounded-lg
                    pl-9
                    pr-10
                    py-2
                    text-xs
                  "
                />

                {busqueda && (
                  <button
                    type="button"
                    onClick={
                      limpiarBusqueda
                    }
                    className="
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-gray-400
                      hover:text-gray-700
                    "
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}

              </div>

            </div>

            <div
              className="
                flex
                items-end
                gap-2
              "
            >

              <button
                type="submit"
                disabled={
                  cargando
                }
                className="
                  bg-[var(--primary)]
                  hover:bg-[var(--primary-dark)]
                  text-white
                  px-4
                  py-2
                  rounded-lg
                  text-xs
                  disabled:opacity-50
                "
              >
                <i className="fas fa-search mr-2"></i>

                Buscar
              </button>

              <button
                type="button"
                onClick={() =>
                  consultar()
                }
                disabled={
                  cargando
                }
                className="
                  bg-gray-500
                  hover:bg-gray-700
                  text-white
                  px-4
                  py-2
                  rounded-lg
                  text-xs
                  disabled:opacity-50
                "
              >
                <i
                  className={`
                    fas
                    fa-sync-alt
                    ${
                      cargando
                        ? 'fa-spin'
                        : ''
                    }
                  `}
                ></i>
              </button>

            </div>

          </form>

        </div>

        {/* ==================================================
            ACCIONES MASIVAS
        ================================================== */}

        {seleccionados.length >
          0 && (
          <div
            className="
              bg-blue-50
              border
              border-blue-300
              rounded-lg
              p-3
              mb-4
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
                text-sm
                text-blue-800
              "
            >
              <strong>
                {seleccionados.length}
              </strong>{' '}
              registro(s) seleccionado(s)
            </div>

            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >

              {estado ===
                'PENDIENTE' && (
                <button
                  type="button"
                  onClick={() =>
                    actualizarMasivo(
                      'REGISTRADO'
                    )
                  }
                  disabled={
                    actualizando
                  }
                  className="
                    bg-blue-700
                    hover:bg-blue-800
                    text-white
                    px-4
                    py-2
                    rounded-lg
                    text-xs
                    font-semibold
                    disabled:opacity-50
                  "
                >
                  <i className="fas fa-upload mr-2"></i>

                  Marcar Registrados
                </button>
              )}

              {estado ===
                'REGISTRADO' && (
                <button
                  type="button"
                  onClick={() =>
                    actualizarMasivo(
                      'CERTIFICADO'
                    )
                  }
                  disabled={
                    actualizando
                  }
                  className="
                    bg-emerald-700
                    hover:bg-emerald-800
                    text-white
                    px-4
                    py-2
                    rounded-lg
                    text-xs
                    font-semibold
                    disabled:opacity-50
                  "
                >
                  <i className="fas fa-certificate mr-2"></i>

                  Marcar Certificados
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setSeleccionados(
                    []
                  )
                }
                className="
                  bg-white
                  border
                  border-gray-300
                  text-gray-700
                  px-4
                  py-2
                  rounded-lg
                  text-xs
                "
              >
                Limpiar selección
              </button>

            </div>

          </div>
        )}

        {/* ==================================================
            COLA DE TRABAJO
        ================================================== */}

        <div
          className="
            border
            border-gray-300
            rounded-lg
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
              justify-between
              items-center
              gap-3
            "
          >

            <span
              className="
                text-sm
                font-semibold
              "
            >
              <i className="fas fa-list-check mr-2"></i>

              Cola de Trabajo SIET
            </span>

            <span
              className="
                text-xs
                text-gray-300
              "
            >
              {registros.length} registro(s)
            </span>

          </div>

          <div className="overflow-x-auto">

            <table
              className="
                w-full
                text-[11px]
                border-collapse
              "
            >

              <thead className="bg-gray-100">

                <tr>

                  <th
                    className="
                      p-2
                      border
                      w-10
                    "
                  >
                    <button
                      type="button"
                      onClick={
                        alternarTodos
                      }
                      disabled={
                        registros.length ===
                        0
                      }
                      className="
                        text-base
                        text-gray-500
                      "
                    >
                      <i
                        className={
                          todosSeleccionados
                            ? 'fas fa-check-square text-blue-600'
                            : 'far fa-square'
                        }
                      ></i>
                    </button>
                  </th>

                  <th className="p-2 border">
                    Matrícula
                  </th>

                  <th className="p-2 border">
                    Aprendiz
                  </th>

                  <th className="p-2 border">
                    Documento
                  </th>

                  <th className="p-2 border">
                    Categoría
                  </th>

                  <th className="p-2 border">
                    Fecha Matrícula
                  </th>

                  <th className="p-2 border">
                    Estado SIET
                  </th>

                  <th className="p-2 border">
                    Acción
                  </th>

                </tr>

              </thead>

              <tbody>

                {cargando ? (
                  <tr>

                    <td
                      colSpan="8"
                      className="
                        p-8
                        text-center
                        text-gray-500
                      "
                    >
                      <i className="fas fa-spinner fa-spin mr-2"></i>

                      Consultando...
                    </td>

                  </tr>
                ) : registros.length ===
                  0 ? (
                  <tr>

                    <td
                      colSpan="8"
                      className="
                        p-8
                        text-center
                        text-gray-500
                      "
                    >
                      <i
                        className="
                          fas
                          fa-inbox
                          text-3xl
                          text-gray-300
                          block
                          mb-2
                        "
                      ></i>

                      No hay registros que coincidan con los filtros seleccionados.
                    </td>

                  </tr>
                ) : (
                  registros.map(
                    registro => {
                      const id =
                        Number(
                          registro.id
                        )

                      const seleccionado =
                        seleccionados.includes(
                          id
                        )

                      const estadoRegistro =
                        normalizarMayusculas(
                          registro.estado
                        )

                      return (
                        <tr
                          key={
                            registro.id
                          }
                          className={`
                            hover:bg-blue-50
                            ${
                              seleccionado
                                ? 'bg-blue-50'
                                : ''
                            }
                          `}
                        >

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                alternarSeleccion(
                                  id
                                )
                              }
                              className="
                                text-base
                              "
                            >
                              <i
                                className={
                                  seleccionado
                                    ? 'fas fa-check-square text-blue-600'
                                    : 'far fa-square text-gray-400'
                                }
                              ></i>
                            </button>
                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                              font-semibold
                            "
                          >
                            {registro.consecutivo ||
                              '-'}
                          </td>

                          <td className="p-2 border">

                            <div className="font-semibold">
                              {obtenerNombreCompleto(
                                registro
                              ) ||
                                '-'}
                            </div>

                            {registro
                              ?.aprendiz
                              ?.correo && (
                              <div
                                className="
                                  text-[10px]
                                  text-gray-500
                                "
                              >
                                {
                                  registro
                                    .aprendiz
                                    .correo
                                }
                              </div>
                            )}

                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            {formatearDocumento(
                              registro.documento ||
                              registro
                                ?.aprendiz
                                ?.documento
                            )}
                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            <span
                              className="
                                bg-blue-50
                                border
                                border-blue-200
                                text-blue-700
                                rounded
                                px-2
                                py-1
                                font-semibold
                              "
                            >
                              {obtenerCategoria(
                                registro
                              )}
                            </span>
                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            {formatearFecha(
                              registro
                                ?.aprendiz
                                ?.fecha_matricula
                            )}
                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            <BadgeEstado
                              estado={
                                registro.estado
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

                            <button
                              type="button"
                              onClick={() =>
                                abrirDetalle(
                                  registro
                                )
                              }
                              className="
                                bg-[var(--primary)]
                                hover:bg-[var(--primary-dark)]
                                text-white
                                px-3
                                py-1.5
                                rounded
                                text-[11px]
                              "
                            >
                              <i className="fas fa-eye mr-1"></i>

                              Gestionar
                            </button>

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
          DRAWER
      ==================================================== */}

      {drawerOpen && (
        <div className="fixed inset-0 z-50">

          <div
            className="
              absolute
              inset-0
              bg-black/40
            "
            onClick={
              cerrarDrawer
            }
          ></div>

          <div
            className="
              absolute
              right-0
              top-0
              h-full
              w-full
              sm:w-[650px]
              bg-white
              shadow-2xl
              overflow-y-auto
            "
          >

            {/* ==============================================
                HEADER
            ============================================== */}

            <div
              className="
                sticky
                top-0
                z-20
                bg-white
                border-b
                border-gray-300
                p-4
                flex
                justify-between
                items-center
                gap-3
              "
            >

              <div>

                <p
                  className="
                    text-[11px]
                    uppercase
                    font-semibold
                    text-gray-500
                  "
                >
                  Gestión SIET
                </p>

                <h2
                  className="
                    text-lg
                    font-bold
                    text-[var(--primary)]
                  "
                >
                  {aprendizActual
                    ?.nombre_completo ||
                    'Aprendiz'}
                </h2>

                {controlActual && (
                  <p
                    className="
                      text-xs
                      text-gray-500
                      mt-1
                    "
                  >
                    Matrícula{' '}
                    {controlActual.consecutivo ||
                      '-'}
                    {' · '}
                    Categoría{' '}
                    {controlActual.categoria ||
                      '-'}
                  </p>
                )}

              </div>

              <button
                type="button"
                onClick={
                  cerrarDrawer
                }
                disabled={
                  actualizando
                }
                className="
                  w-9
                  h-9
                  border
                  border-gray-300
                  rounded-lg
                  hover:bg-gray-100
                "
              >
                <i className="fas fa-times"></i>
              </button>

            </div>

            {/* ==============================================
                BODY
            ============================================== */}

            {cargandoDetalle ? (
              <div
                className="
                  p-12
                  text-center
                  text-gray-500
                "
              >
                <i className="fas fa-spinner fa-spin mr-2"></i>

                Cargando información...
              </div>
            ) : detalle &&
              controlActual &&
              aprendizActual ? (
              <div
                className="
                  p-4
                  space-y-4
                "
              >

                {/* ESTADO */}

                <div
                  className="
                    border
                    border-gray-300
                    rounded-lg
                    overflow-hidden
                  "
                >

                  <div
                    className="
                      bg-slate-800
                      text-white
                      px-3
                      py-2
                      text-xs
                      font-semibold
                    "
                  >
                    Estado SIET
                  </div>

                  <div className="p-4">

                    <BadgeEstado
                      estado={
                        controlActual.estado
                      }
                    />

                    <div
                      className="
                        mt-4
                        flex
                        items-center
                        gap-2
                        text-[10px]
                        font-semibold
                      "
                    >

                      <span
                        className="
                          bg-amber-100
                          text-amber-700
                          px-2
                          py-1
                          rounded
                        "
                      >
                        PENDIENTE
                      </span>

                      <i className="fas fa-chevron-right text-gray-300"></i>

                      <span
                        className={
                          estadoDetalle ===
                            'REGISTRADO' ||
                          estadoDetalle ===
                            'CERTIFICADO'
                            ? 'bg-blue-100 text-blue-700 px-2 py-1 rounded'
                            : 'bg-gray-100 text-gray-400 px-2 py-1 rounded'
                        }
                      >
                        REGISTRADO
                      </span>

                      <i className="fas fa-chevron-right text-gray-300"></i>

                      <span
                        className={
                          estadoDetalle ===
                          'CERTIFICADO'
                            ? 'bg-emerald-100 text-emerald-700 px-2 py-1 rounded'
                            : 'bg-gray-100 text-gray-400 px-2 py-1 rounded'
                        }
                      >
                        CERTIFICADO
                      </span>

                    </div>

                  </div>

                </div>

                {/* DATOS */}

                <div
                  className="
                    border
                    border-gray-300
                    rounded-lg
                    overflow-hidden
                  "
                >

                  <div
                    className="
                      bg-slate-800
                      text-white
                      px-3
                      py-2
                      text-xs
                      font-semibold
                    "
                  >
                    Datos del Aprendiz
                  </div>

                  <div
                    className="
                      p-3
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-3
                      text-xs
                    "
                  >

                    <div>
                      <span className="text-gray-500">
                        Documento
                      </span>

                      <div className="font-semibold mt-1">
                        {aprendizActual.tipo_doc}{' '}
                        {aprendizActual.documento}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Matrícula
                      </span>

                      <div className="font-semibold mt-1">
                        {controlActual.consecutivo ||
                          '-'}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Categoría
                      </span>

                      <div className="font-semibold mt-1">
                        {controlActual.categoria ||
                          '-'}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Fecha Matrícula
                      </span>

                      <div className="font-semibold mt-1">
                        {formatearFecha(
                          aprendizActual.fecha_matricula
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Celular
                      </span>

                      <div className="font-semibold mt-1">
                        {aprendizActual.celular ||
                          '-'}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Correo
                      </span>

                      <div className="font-semibold mt-1 break-all">
                        {aprendizActual.correo ||
                          '-'}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Convenio
                      </span>

                      <div className="font-semibold mt-1">
                        {aprendizActual.convenio ||
                          '-'}
                      </div>
                    </div>

                  </div>

                </div>

                {/* TRAZABILIDAD */}

                <div
                  className="
                    border
                    border-gray-300
                    rounded-lg
                    overflow-hidden
                  "
                >

                  <div
                    className="
                      bg-slate-800
                      text-white
                      px-3
                      py-2
                      text-xs
                      font-semibold
                    "
                  >
                    Trazabilidad SIET
                  </div>

                  <div
                    className="
                      p-3
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-3
                      text-xs
                    "
                  >

                    <div>
                      <span className="text-gray-500">
                        Fecha registro
                      </span>

                      <div className="font-semibold mt-1">
                        {formatearFecha(
                          controlActual.fecha_registro
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Usuario registro
                      </span>

                      <div className="font-semibold mt-1">
                        {controlActual.usuario_registro ||
                          '-'}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Fecha certificación
                      </span>

                      <div className="font-semibold mt-1">
                        {formatearFecha(
                          controlActual.fecha_certificacion
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Usuario certificación
                      </span>

                      <div className="font-semibold mt-1">
                        {controlActual.usuario_certificacion ||
                          '-'}
                      </div>
                    </div>

                  </div>

                </div>

                {/* OBSERVACIONES */}

                <div
                  className="
                    border
                    border-gray-300
                    rounded-lg
                    overflow-hidden
                  "
                >

                  <div
                    className="
                      bg-slate-800
                      text-white
                      px-3
                      py-2
                      text-xs
                      font-semibold
                    "
                  >
                    Observaciones
                  </div>

                  <div className="p-3">

                    <textarea
                      rows={3}
                      value={
                        observaciones
                      }
                      onChange={
                        event =>
                          setObservaciones(
                            event.target.value
                          )
                      }
                      disabled={
                        estadoDetalle ===
                        'CERTIFICADO'
                      }
                      placeholder="Observaciones opcionales..."
                      className="
                        w-full
                        border
                        border-gray-300
                        rounded-lg
                        p-2
                        text-xs
                        disabled:bg-gray-100
                      "
                    />

                  </div>

                </div>

                {/* ACCIONES */}

                <div
                  className="
                    border
                    border-gray-300
                    rounded-lg
                    overflow-hidden
                  "
                >

                  <div
                    className="
                      bg-slate-800
                      text-white
                      px-3
                      py-2
                      text-xs
                      font-semibold
                    "
                  >
                    Gestión del Proceso
                  </div>

                  <div className="p-3">

                    {estadoDetalle ===
                      'PENDIENTE' && (
                      <button
                        type="button"
                        onClick={() =>
                          actualizarIndividual(
                            controlActual,
                            'REGISTRADO',
                            observaciones
                          )
                        }
                        disabled={
                          actualizando
                        }
                        className="
                          bg-blue-700
                          hover:bg-blue-800
                          text-white
                          px-4
                          py-2
                          rounded-lg
                          text-xs
                          font-semibold
                          disabled:opacity-50
                        "
                      >
                        <i className="fas fa-upload mr-2"></i>

                        Marcar REGISTRADO en SIET
                      </button>
                    )}

                    {estadoDetalle ===
                      'REGISTRADO' && (
                      <button
                        type="button"
                        onClick={() =>
                          actualizarIndividual(
                            controlActual,
                            'CERTIFICADO',
                            observaciones
                          )
                        }
                        disabled={
                          actualizando
                        }
                        className="
                          bg-emerald-700
                          hover:bg-emerald-800
                          text-white
                          px-4
                          py-2
                          rounded-lg
                          text-xs
                          font-semibold
                          disabled:opacity-50
                        "
                      >
                        <i className="fas fa-certificate mr-2"></i>

                        Marcar CERTIFICADO en SIET
                      </button>
                    )}

                    {estadoDetalle ===
                      'CERTIFICADO' && (
                      <div
                        className="
                          bg-emerald-50
                          border
                          border-emerald-300
                          rounded-lg
                          p-3
                          text-xs
                          text-emerald-700
                          font-semibold
                        "
                      >
                        <i className="fas fa-check-circle mr-2"></i>

                        PROCESO SIET COMPLETADO
                      </div>
                    )}

                  </div>

                </div>

              </div>
            ) : null}

          </div>

        </div>
      )}

      {/* ====================================================
          PROCESANDO
      ==================================================== */}

      {actualizando && (
        <div
          className="
            fixed
            bottom-5
            left-1/2
            z-[70]
            -translate-x-1/2
            bg-slate-900
            text-white
            rounded-full
            px-5
            py-3
            text-sm
            font-semibold
            shadow-xl
          "
        >
          <i className="fas fa-spinner fa-spin mr-2"></i>

          Actualizando SIET...
        </div>
      )}

    </div>
  )
}