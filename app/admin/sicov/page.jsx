// app/admin/sicov/page.jsx

'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  cerrarSesion,
} from '@/lib/auth/logout'

// ============================================================
// CONSTANTES
// ============================================================

const API_URL =
  '/api/admin/sicov'

const CATEGORIAS = [
  'A2',
  'B1',
  'C1',
  'RC1',
  'C2',
  'C3',
]

// ============================================================
// HELPERS
// ============================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}

function mayusculas(
  valor
) {
  return texto(
    valor
  ).toUpperCase()
}

function obtenerNitUsuario(
  user
) {
  return texto(
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

  const fecha =
    String(
      valor
    ).slice(
      0,
      10
    )

  const [
    year,
    month,
    day,
  ] =
    fecha.split(
      '-'
    )

  if (
    !year ||
    !month ||
    !day
  ) {
    return valor
  }

  return `${day}/${month}/${year}`
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

// ============================================================
// FETCH SEGURO
// ============================================================

async function fetchJsonSeguro(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      {
        ...options,

        cache:
          'no-store',
      }
    )

  const textoRespuesta =
    await response.text()

  let json

  try {
    json =
      textoRespuesta
        ? JSON.parse(
            textoRespuesta
          )
        : {}
  } catch {
    console.error(
      `API NO JSON | URL: ${url} | HTTP: ${response.status} | RESPUESTA: ${textoRespuesta.slice(0, 1000)}`
    )

    throw new Error(
      `La API respondió contenido no válido. HTTP ${response.status}.`
    )
  }

  if (
    !response.ok ||
    json?.status ===
      'error'
  ) {
    throw new Error(
      json?.message ||
      `Error HTTP ${response.status}.`
    )
  }

  return json
}

// ============================================================
// COPIAR
// ============================================================

async function copiarTexto(
  valor
) {
  const contenido =
    texto(
      valor
    )

  if (
    !contenido
  ) {
    return false
  }

  try {
    await navigator
      .clipboard
      .writeText(
        contenido
      )

    return true
  } catch (
    error
  ) {
    console.error(
      'Error copiando texto:',
      error
    )

    return false
  }
}

// ============================================================
// BADGE
// ============================================================

function Badge({
  children,
  tipo = 'gray',
}) {
  const clases = {
    gray:
      'bg-gray-100 text-gray-700 border-gray-300',

    green:
      'bg-emerald-50 text-emerald-700 border-emerald-300',

    red:
      'bg-red-50 text-red-700 border-red-300',

    yellow:
      'bg-amber-50 text-amber-700 border-amber-300',

    blue:
      'bg-blue-50 text-blue-700 border-blue-300',

    purple:
      'bg-purple-50 text-purple-700 border-purple-300',
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        px-2
        py-1
        rounded-md
        border
        text-[11px]
        font-semibold
        ${clases[tipo] || clases.gray}
      `}
    >
      {children}
    </span>
  )
}

// ============================================================
// CAMPO COPIABLE
// ============================================================

function CampoCopiable({
  label,
  valor,
  onCopiado,
}) {
  const contenido =
    texto(
      valor
    )

  async function copiar() {
    if (
      !contenido
    ) {
      return
    }

    const ok =
      await copiarTexto(
        contenido
      )

    if (
      ok &&
      onCopiado
    ) {
      onCopiado(
        label
      )
    }
  }

  return (
    <div
      className="
        border
        border-gray-200
        rounded-lg
        p-2.5
        bg-white
      "
    >

      <div
        className="
          flex
          items-start
          justify-between
          gap-2
        "
      >

        <div className="min-w-0">

          <p
            className="
              text-[10px]
              uppercase
              tracking-wide
              font-semibold
              text-gray-500
            "
          >
            {label}
          </p>

          <p
            className="
              text-xs
              text-gray-800
              font-semibold
              mt-1
              break-words
            "
          >
            {contenido ||
              '-'}
          </p>

        </div>

        {contenido && (
          <button
            type="button"
            onClick={
              copiar
            }
            title={`Copiar ${label}`}
            className="
              w-8
              h-8
              shrink-0
              rounded-lg
              border
              border-gray-300
              text-gray-500
              hover:bg-blue-50
              hover:text-blue-700
              hover:border-blue-300
              transition
            "
          >
            <i className="fas fa-copy"></i>
          </button>
        )}

      </div>

    </div>
  )
}

// ============================================================
// PÁGINA
// ============================================================

export default function SicovPage() {
  const router =
    useRouter()

  const debounceRef =
    useRef(
      null
    )

  // ==========================================================
  // SESIÓN
  // ==========================================================

  const [
    user,
    setUser,
  ] =
    useState(
      null
    )

  // ==========================================================
  // FILTROS
  // ==========================================================
  //
  // IMPORTANTE:
  //
  // Al abrir SICOV mostramos por defecto los pendientes
  // de registro.
  //
  // ==========================================================

  const [
    filtros,
    setFiltros,
  ] =
    useState({
      q:
        '',

      categoria:
        '',

      estado_registro:
        'PENDIENTE',

      estado_certificacion:
        '',
    })

  // ==========================================================
  // LISTADO
  // ==========================================================

  const [
    controles,
    setControles,
  ] =
    useState(
      []
    )

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    )

  // ==========================================================
  // DRAWER
  // ==========================================================

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
    loadingDetalle,
    setLoadingDetalle,
  ] =
    useState(
      false
    )

  const [
    procesando,
    setProcesando,
  ] =
    useState(
      false
    )

  // ==========================================================
  // MENSAJES
  // ==========================================================

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
    mensajeCopiado,
    setMensajeCopiado,
  ] =
    useState(
      ''
    )

  // ==========================================================
  // OBSERVACIONES
  // ==========================================================

  const [
    observaciones,
    setObservaciones,
  ] =
    useState(
      ''
    )

  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(
    () => {
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

      try {
        setUser(
          JSON.parse(
            stored
          )
        )
      } catch (
        errorSesion
      ) {
        console.error(
          'Error leyendo sesión:',
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

  // ==========================================================
  // USUARIO
  // ==========================================================

  const nit =
    useMemo(
      () =>
        obtenerNitUsuario(
          user
        ),
      [
        user,
      ]
    )

  const usuarioActual =
    useMemo(
      () =>
        obtenerNombreUsuario(
          user
        ),
      [
        user,
      ]
    )

  // ==========================================================
  // CONSULTAR
  // ==========================================================

  const consultar =
    useCallback(
      async ({
        silencioso = false,
      } = {}) => {
        if (
          !user
        ) {
          return
        }

        setLoading(
          true
        )

        if (
          !silencioso
        ) {
          setError(
            ''
          )
        }

        try {
          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'consultar'
          )

          if (
            nit
          ) {
            params.set(
              'nit',
              nit
            )
          }

          if (
            texto(
              filtros.q
            )
          ) {
            params.set(
              'q',
              texto(
                filtros.q
              )
            )
          }

          if (
            texto(
              filtros.categoria
            )
          ) {
            params.set(
              'categoria',
              filtros.categoria
            )
          }

          if (
            texto(
              filtros.estado_registro
            )
          ) {
            params.set(
              'estado_registro',
              filtros.estado_registro
            )
          }

          if (
            texto(
              filtros.estado_certificacion
            )
          ) {
            params.set(
              'estado_certificacion',
              filtros.estado_certificacion
            )
          }

          const json =
            await fetchJsonSeguro(
              `${API_URL}?${params.toString()}`
            )

          setControles(
            Array.isArray(
              json?.data
            )
              ? json.data
              : []
          )
        } catch (
          errorConsulta
        ) {
          console.error(
            errorConsulta
          )

          setControles(
            []
          )

          if (
            !silencioso
          ) {
            setError(
              errorConsulta.message
            )
          }
        } finally {
          setLoading(
            false
          )
        }
      },
      [
        user,
        nit,
        filtros,
      ]
    )

  // ==========================================================
  // CARGA AUTOMÁTICA
  // ==========================================================
  //
  // Apenas entra a la página:
  //
  // estado_registro = PENDIENTE
  //
  // ==========================================================

  useEffect(
    () => {
      if (
        user
      ) {
        consultar({
          silencioso:
            true,
        })
      }
    },
    [
      user,
      consultar,
    ]
  )

  // ==========================================================
  // BÚSQUEDA / FILTROS AUTOMÁTICOS
  // ==========================================================

  useEffect(
    () => {
      if (
        !user
      ) {
        return
      }

      if (
        debounceRef.current
      ) {
        clearTimeout(
          debounceRef.current
        )
      }

      const termino =
        texto(
          filtros.q
        )

      if (
        termino &&
        termino.length <
          3
      ) {
        return
      }

      debounceRef.current =
        setTimeout(
          () => {
            consultar({
              silencioso:
                true,
            })
          },
          400
        )

      return () => {
        if (
          debounceRef.current
        ) {
          clearTimeout(
            debounceRef.current
          )
        }
      }
    },
    [
      filtros,
      user,
      consultar,
    ]
  )

  // ==========================================================
  // CAMBIAR FILTROS
  // ==========================================================

  function cambiarFiltro(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target

    setFiltros(
      prev => ({
        ...prev,

        [name]:
          value,
      })
    )
  }

  // ==========================================================
  // LIMPIAR FILTROS
  // ==========================================================
  //
  // Volvemos al estado inicial:
  //
  // PENDIENTES
  //
  // ==========================================================

  function limpiarFiltros() {
    setFiltros({
      q:
        '',

      categoria:
        '',

      estado_registro:
        'PENDIENTE',

      estado_certificacion:
        '',
    })
  }

  // ==========================================================
  // CARGAR DETALLE
  // ==========================================================

  async function cargarDetalle(
    controlId
  ) {
    const params =
      new URLSearchParams()

    params.set(
      'recurso',
      'detalle'
    )

    params.set(
      'control_sicov_id',
      controlId
    )

    if (
      nit
    ) {
      params.set(
        'nit',
        nit
      )
    }

    const json =
      await fetchJsonSeguro(
        `${API_URL}?${params.toString()}`
      )

    const data =
      json?.data ||
      null

    setDetalle(
      data
    )

    setObservaciones(
      texto(
        data
          ?.control
          ?.observaciones
      )
    )

    return data
  }

  // ==========================================================
  // ABRIR DRAWER
  // ==========================================================

  async function abrirDetalle(
    row
  ) {
    setDrawerOpen(
      true
    )

    setDetalle(
      null
    )

    setLoadingDetalle(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    setMensajeCopiado(
      ''
    )

    setObservaciones(
      ''
    )

    try {
      await cargarDetalle(
        row.id
      )
    } catch (
      errorDetalle
    ) {
      setError(
        errorDetalle.message
      )
    } finally {
      setLoadingDetalle(
        false
      )
    }
  }

  // ==========================================================
  // CERRAR DRAWER
  // ==========================================================

  function cerrarDetalle() {
    if (
      procesando
    ) {
      return
    }

    setDrawerOpen(
      false
    )

    setDetalle(
      null
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    setMensajeCopiado(
      ''
    )

    setObservaciones(
      ''
    )
  }

  // ==========================================================
  // DATOS DETALLE
  // ==========================================================

  const controlActual =
    detalle?.control ||
    null

  const aprendizActual =
    detalle?.aprendiz ||
    null

  const registrado =
    mayusculas(
      controlActual
        ?.estado_registro
    ) ===
    'REGISTRADO'

  const certificado =
    mayusculas(
      controlActual
        ?.estado_certificacion
    ) ===
    'CERTIFICADO'

  // ==========================================================
  // POST
  // ==========================================================

  async function ejecutarAccion(
    payload
  ) {
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
              usuarioActual,
          }),
      }
    )
  }

  // ==========================================================
  // REGISTRAR SICOV
  // ==========================================================

  async function registrarSicov() {
    if (
      !controlActual?.id
    ) {
      return
    }

    const confirmar =
      window.confirm(
        '¿Confirma que este aprendiz ya fue REGISTRADO en la plataforma SICOV?'
      )

    if (
      !confirmar
    ) {
      return
    }

    setProcesando(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const json =
        await ejecutarAccion({
          accion:
            'registrar_sicov',

          control_sicov_id:
            controlActual.id,

          observaciones,
        })

      setMensaje(
        json?.message ||
        'Aprendiz registrado en SICOV.'
      )

      await cargarDetalle(
        controlActual.id
      )

      await consultar({
        silencioso:
          true,
      })
    } catch (
      errorAccion
    ) {
      setError(
        errorAccion.message
      )
    } finally {
      setProcesando(
        false
      )
    }
  }

  // ==========================================================
  // CERTIFICAR SICOV
  // ==========================================================

  async function certificarSicov() {
    if (
      !controlActual?.id
    ) {
      return
    }

    if (
      !registrado
    ) {
      setError(
        'Primero debe registrar al aprendiz en SICOV.'
      )

      return
    }

    const confirmar =
      window.confirm(
        '¿Confirma que este aprendiz ya fue CERTIFICADO en la plataforma SICOV?'
      )

    if (
      !confirmar
    ) {
      return
    }

    setProcesando(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const json =
        await ejecutarAccion({
          accion:
            'certificar_sicov',

          control_sicov_id:
            controlActual.id,

          observaciones,
        })

      setMensaje(
        json?.message ||
        'Aprendiz certificado en SICOV.'
      )

      await cargarDetalle(
        controlActual.id
      )

      await consultar({
        silencioso:
          true,
      })
    } catch (
      errorAccion
    ) {
      setError(
        errorAccion.message
      )
    } finally {
      setProcesando(
        false
      )
    }
  }

  // ==========================================================
  // MENSAJE COPIADO
  // ==========================================================

  function mostrarCopiado(
    campo
  ) {
    setMensajeCopiado(
      `${campo} copiado.`
    )

    window.setTimeout(
      () => {
        setMensajeCopiado(
          ''
        )
      },
      1500
    )
  }

  // ==========================================================
  // COPIAR NOMBRE COMPLETO
  // ==========================================================

  async function copiarNombreCompleto() {
    if (
      !aprendizActual
    ) {
      return
    }

    const nombre =
      [
        aprendizActual.nombres,
        aprendizActual.apellidos,
      ]
        .filter(
          Boolean
        )
        .join(
          ' '
        )
        .trim()

    const ok =
      await copiarTexto(
        nombre
      )

    if (
      ok
    ) {
      mostrarCopiado(
        'Nombre completo'
      )
    }
  }

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
            border
            border-gray-500
            rounded-xl
            px-4
            py-3
            mb-3
            bg-white
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
                  text-[9px]
                  uppercase
                  tracking-wider
                  font-bold
                  text-gray-500
                "
              >
                Administración
              </p>

              <h1
                className="
                  mt-0.5
                  text-xl
                  md:text-2xl
                  font-black
                  text-[var(--primary)]
                  flex
                  items-center
                  gap-2

                "
              >
                <i className="fas fa-fingerprint"></i>

                Control SICOV
              </h1>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  text-gray-500
                "
              >
                Consulte la información del aprendiz y controle su registro y certificación en SICOV.
              </p>

            </div>

            <div className="flex flex-wrap gap-2">

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
                  transition
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
                  transition
                "
              >
                <i className="fas fa-sign-out-alt"></i>

                Cerrar Sesión
              </button>

            </div>

          </div>

        </div>

        {/* ==================================================
            USUARIO
        ================================================== */}

        <div
          className="
            border
            border-gray-500
            rounded-lg
            bg-gray-50
            px-3
            py-2
            mb-3

          "
        >

          <div
            className="
              flex
              flex-col
              sm:flex-row
              sm:justify-between
              gap-1
              text-[10px]
              text-gray-600
            "
          >

            <span>
              Usuario:{' '}

              <strong>
                {usuarioActual ||
                  '-'}
              </strong>

              {user?.rol && (
                <>
                  {' '}
                  ({user.rol})
                </>
              )}
            </span>

            {(user?.nombreEmpresa ||
              user?.nombre_empresa) && (
              <span>
                CEA:{' '}

                <strong>
                  {user.nombreEmpresa ||
                    user.nombre_empresa}
                </strong>
              </span>
            )}

          </div>

        </div>

        {/* ==================================================
            ERROR GENERAL
        ================================================== */}

        {!drawerOpen &&
          error && (
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
              flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-2
            "
          >

            <span className="text-sm font-semibold">
              <i className="fas fa-filter mr-2"></i>

              Filtros SICOV
            </span>

            <span className="text-[10px] text-gray-300">
              Vista inicial: pendientes de registro
            </span>

          </div>

          <div className="p-4">

            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                xl:grid-cols-5
                gap-3
              "
            >

              {/* BUSCAR */}

              <div className="xl:col-span-2">

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

                <input
                  type="text"
                  name="q"
                  value={
                    filtros.q
                  }
                  onChange={
                    cambiarFiltro
                  }
                  placeholder="Documento, matrícula, nombre..."
                  className="
                    w-full
                    border
                    border-gray-300
                    rounded-lg
                    px-3
                    py-2
                    text-xs
                  "
                />

              </div>

              {/* CATEGORÍA */}

              <div>

                <label
                  className="
                    block
                    text-[11px]
                    font-semibold
                    mb-1
                  "
                >
                  Categoría
                </label>

                <select
                  name="categoria"
                  value={
                    filtros.categoria
                  }
                  onChange={
                    cambiarFiltro
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

                  <option value="">
                    Todas
                  </option>

                  {CATEGORIAS.map(
                    categoria => (
                      <option
                        key={
                          categoria
                        }
                        value={
                          categoria
                        }
                      >
                        {categoria}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* ESTADO REGISTRO */}

              <div>

                <label
                  className="
                    block
                    text-[11px]
                    font-semibold
                    mb-1
                  "
                >
                  Estado Registro
                </label>

                <select
                  name="estado_registro"
                  value={
                    filtros.estado_registro
                  }
                  onChange={
                    cambiarFiltro
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

                  <option value="">
                    Todos
                  </option>

                  <option value="PENDIENTE">
                    Pendiente
                  </option>

                  <option value="REGISTRADO">
                    Registrado
                  </option>

                </select>

              </div>

              {/* CERTIFICACIÓN */}

              <div>

                <label
                  className="
                    block
                    text-[11px]
                    font-semibold
                    mb-1
                  "
                >
                  Certificación
                </label>

                <select
                  name="estado_certificacion"
                  value={
                    filtros.estado_certificacion
                  }
                  onChange={
                    cambiarFiltro
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

                  <option value="">
                    Todas
                  </option>

                  <option value="PENDIENTE">
                    Pendiente
                  </option>

                  <option value="CERTIFICADO">
                    Certificado
                  </option>

                </select>

              </div>

            </div>

            <div
              className="
                mt-3
                flex
                flex-wrap
                gap-2
              "
            >

              <button
                type="button"
                onClick={() =>
                  consultar()
                }
                disabled={
                  loading
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

                {loading
                  ? 'Consultando...'
                  : 'Consultar'}
              </button>

              <button
                type="button"
                onClick={
                  limpiarFiltros
                }
                className="
                  bg-gray-500
                  hover:bg-gray-700
                  text-white
                  px-4
                  py-2
                  rounded-lg
                  text-xs
                "
              >
                <i className="fas fa-rotate-left mr-2"></i>

                Volver a Pendientes
              </button>

            </div>

          </div>

        </div>

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

              Cola de Trabajo SICOV
            </span>

            <span
              className="
                text-xs
                text-gray-300
              "
            >
              {controles.length} registro(s)
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
                    Registro
                  </th>

                  <th className="p-2 border">
                    Certificación
                  </th>

                  <th className="p-2 border">
                    Acción
                  </th>

                </tr>

              </thead>

              <tbody>

                {loading ? (
                  <tr>

                    <td
                      colSpan="7"
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
                ) : controles.length ===
                  0 ? (
                  <tr>

                    <td
                      colSpan="7"
                      className="
                        p-8
                        text-center
                        text-gray-500
                      "
                    >
                      <i
                        className="
                          fas
                          fa-check-circle
                          text-3xl
                          text-gray-300
                          mb-2
                          block
                        "
                      ></i>

                      No hay registros que coincidan con los filtros seleccionados.
                    </td>

                  </tr>
                ) : (
                  controles.map(
                    row => {
                      const estadoRegistro =
                        mayusculas(
                          row.estado_registro
                        )

                      const estadoCertificacion =
                        mayusculas(
                          row.estado_certificacion
                        )

                      return (
                        <tr
                          key={
                            row.id
                          }
                          className="
                            odd:bg-white
                            even:bg-gray-50
                            hover:bg-blue-50
                          "
                        >

                          <td
                            className="
                              p-2
                              border
                              text-center
                              font-semibold
                            "
                          >
                            {row.consecutivo ||
                              '-'}
                          </td>

                          <td className="p-2 border">

                            <div className="font-semibold">
                              {row
                                ?.aprendiz
                                ?.nombre_completo ||
                                '-'}
                            </div>

                            <div
                              className="
                                text-[10px]
                                text-gray-500
                              "
                            >
                              {row
                                ?.aprendiz
                                ?.celular ||
                                ''}
                            </div>

                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            {formatearDocumento(
                              row.documento
                            )}
                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            <Badge tipo="blue">
                              {row.categoria ||
                                '-'}
                            </Badge>
                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >

                            {estadoRegistro ===
                            'REGISTRADO' ? (
                              <Badge tipo="green">
                                Registrado
                              </Badge>
                            ) : (
                              <Badge tipo="yellow">
                                Pendiente
                              </Badge>
                            )}

                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >

                            {estadoCertificacion ===
                            'CERTIFICADO' ? (
                              <Badge tipo="purple">
                                Certificado
                              </Badge>
                            ) : (
                              <Badge tipo="gray">
                                Pendiente
                              </Badge>
                            )}

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
                                  row
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
          DRAWER LATERAL DERECHO
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
              cerrarDetalle
            }
          ></div>

          <div
            className="
              absolute
              right-0
              top-0
              h-full
              w-full
              sm:w-[760px]
              bg-white
              shadow-2xl
              overflow-y-auto
            "
          >

            {/* ==============================================
                CABECERA DRAWER
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
                  Gestión SICOV
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
                  cerrarDetalle
                }
                disabled={
                  procesando
                }
                className="
                  w-9
                  h-9
                  border
                  border-gray-300
                  rounded-lg
                  hover:bg-gray-100
                  disabled:opacity-50
                "
              >
                <i className="fas fa-times"></i>
              </button>

            </div>

            {/* ==============================================
                CONTENIDO
            ============================================== */}

            {loadingDetalle ? (
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

                {/* MENSAJES */}

                {error && (
                  <div
                    className="
                      bg-red-50
                      border
                      border-red-300
                      text-red-700
                      rounded-lg
                      p-3
                      text-xs
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
                      text-xs
                    "
                  >
                    <i className="fas fa-check-circle mr-2"></i>

                    {mensaje}
                  </div>
                )}

                {mensajeCopiado && (
                  <div
                    className="
                      bg-blue-50
                      border
                      border-blue-200
                      text-blue-700
                      rounded-lg
                      px-3
                      py-2
                      text-xs
                    "
                  >
                    <i className="fas fa-copy mr-2"></i>

                    {mensajeCopiado}
                  </div>
                )}

                {/* ==========================================
                    ESTADO SICOV
                ========================================== */}

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
                    Estado SICOV
                  </div>

                  <div
                    className="
                      p-3
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-3
                    "
                  >

                    {/* REGISTRO */}

                    <div
                      className="
                        border
                        border-gray-200
                        rounded-lg
                        p-3
                      "
                    >

                      <p
                        className="
                          text-[10px]
                          uppercase
                          font-semibold
                          text-gray-500
                        "
                      >
                        Registro
                      </p>

                      <div className="mt-2">

                        {registrado ? (
                          <Badge tipo="green">
                            REGISTRADO
                          </Badge>
                        ) : (
                          <Badge tipo="yellow">
                            PENDIENTE
                          </Badge>
                        )}

                      </div>

                      {registrado && (
                        <div
                          className="
                            mt-2
                            text-[10px]
                            text-gray-500
                          "
                        >
                          <div>
                            {formatearFecha(
                              controlActual.fecha_registro
                            )}
                          </div>

                          <div>
                            {controlActual.usuario_registro ||
                              '-'}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* CERTIFICACIÓN */}

                    <div
                      className="
                        border
                        border-gray-200
                        rounded-lg
                        p-3
                      "
                    >

                      <p
                        className="
                          text-[10px]
                          uppercase
                          font-semibold
                          text-gray-500
                        "
                      >
                        Certificación
                      </p>

                      <div className="mt-2">

                        {certificado ? (
                          <Badge tipo="purple">
                            CERTIFICADO
                          </Badge>
                        ) : (
                          <Badge tipo="gray">
                            PENDIENTE
                          </Badge>
                        )}

                      </div>

                      {certificado && (
                        <div
                          className="
                            mt-2
                            text-[10px]
                            text-gray-500
                          "
                        >
                          <div>
                            {formatearFecha(
                              controlActual.fecha_certificacion
                            )}
                          </div>

                          <div>
                            {controlActual.usuario_certificacion ||
                              '-'}
                          </div>
                        </div>
                      )}

                    </div>

                  </div>

                </div>

                {/* ==========================================
                    IDENTIFICACIÓN
                ========================================== */}

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
                      flex
                      justify-between
                      items-center
                      gap-2
                    "
                  >

                    <span
                      className="
                        text-xs
                        font-semibold
                      "
                    >
                      Datos para Registro en SICOV
                    </span>

                    <button
                      type="button"
                      onClick={
                        copiarNombreCompleto
                      }
                      className="
                        text-[10px]
                        bg-white/10
                        hover:bg-white/20
                        px-2
                        py-1
                        rounded
                      "
                    >
                      <i className="fas fa-copy mr-1"></i>

                      Copiar nombre
                    </button>

                  </div>

                  <div className="p-3">

                    <p
                      className="
                        text-[10px]
                        uppercase
                        font-bold
                        tracking-wide
                        text-gray-500
                        mb-2
                      "
                    >
                      Identificación
                    </p>

                    <div
                      className="
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        gap-2
                      "
                    >

                      <CampoCopiable
                        label="Tipo de documento"
                        valor={
                          aprendizActual.tipo_doc
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Documento"
                        valor={
                          aprendizActual.documento
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Lugar de expedición"
                        valor={
                          aprendizActual.lugar_expedicion
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Fecha de nacimiento"
                        valor={
                          aprendizActual.fecha_nacimiento
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Nombres"
                        valor={
                          aprendizActual.nombres
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Apellidos"
                        valor={
                          aprendizActual.apellidos
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Género"
                        valor={
                          aprendizActual.genero
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Categoría"
                        valor={
                          aprendizActual.categoria ||
                          controlActual.categoria
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                    </div>

                    {/* CONTACTO */}

                    <p
                      className="
                        text-[10px]
                        uppercase
                        font-bold
                        tracking-wide
                        text-gray-500
                        mt-4
                        mb-2
                      "
                    >
                      Contacto
                    </p>

                    <div
                      className="
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        gap-2
                      "
                    >

                      <CampoCopiable
                        label="Celular"
                        valor={
                          aprendizActual.celular
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Correo"
                        valor={
                          aprendizActual.correo
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Dirección"
                        valor={
                          aprendizActual.direccion
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Barrio"
                        valor={
                          aprendizActual.barrio
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Ciudad"
                        valor={
                          aprendizActual.ciudad
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                    </div>

                    {/* INFORMACIÓN COMPLEMENTARIA */}

                    <p
                      className="
                        text-[10px]
                        uppercase
                        font-bold
                        tracking-wide
                        text-gray-500
                        mt-4
                        mb-2
                      "
                    >
                      Información Complementaria
                    </p>

                    <div
                      className="
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        gap-2
                      "
                    >

                      <CampoCopiable
                        label="Estado civil"
                        valor={
                          aprendizActual.estado_civil
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Ocupación"
                        valor={
                          aprendizActual.ocupacion
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="EPS"
                        valor={
                          aprendizActual.eps
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Estrato"
                        valor={
                          aprendizActual.estrato
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Nivel educativo"
                        valor={
                          aprendizActual.nivel_educativo
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Convenio"
                        valor={
                          aprendizActual.convenio
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                    </div>

                  </div>

                </div>

                {/* ==========================================
                    ACUDIENTE
                ========================================== */}

                {(
                  texto(
                    aprendizActual
                      ?.acudiente
                      ?.nombre_completo
                  ) ||
                  texto(
                    aprendizActual
                      ?.acudiente
                      ?.documento
                  )
                ) && (
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
                      Datos del Acudiente
                    </div>

                    <div
                      className="
                        p-3
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        gap-2
                      "
                    >

                      <CampoCopiable
                        label="Nombre acudiente"
                        valor={
                          aprendizActual
                            ?.acudiente
                            ?.nombre_completo
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Tipo documento acudiente"
                        valor={
                          aprendizActual
                            ?.acudiente
                            ?.tipo_doc
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Documento acudiente"
                        valor={
                          aprendizActual
                            ?.acudiente
                            ?.documento
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                      <CampoCopiable
                        label="Celular acudiente"
                        valor={
                          aprendizActual
                            ?.acudiente
                            ?.celular
                        }
                        onCopiado={
                          mostrarCopiado
                        }
                      />

                    </div>

                  </div>
                )}

                {/* ==========================================
                    OBSERVACIONES
                ========================================== */}

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
                    Observaciones SICOV
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
                      placeholder="Observaciones opcionales..."
                      disabled={
                        certificado
                      }
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

                {/* ==========================================
                    ACCIONES
                ========================================== */}

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

                    {!registrado ? (
                      <div>

                        <p
                          className="
                            text-xs
                            text-gray-600
                            mb-3
                          "
                        >
                          Una vez termine el registro del aprendiz en la plataforma SICOV, confirme el proceso aquí.
                        </p>

                        <button
                          type="button"
                          onClick={
                            registrarSicov
                          }
                          disabled={
                            procesando
                          }
                          className="
                            bg-blue-600
                            hover:bg-blue-700
                            text-white
                            px-4
                            py-2
                            rounded-lg
                            text-xs
                            font-semibold
                            disabled:opacity-50
                          "
                        >
                          <i className="fas fa-user-check mr-2"></i>

                          {procesando
                            ? 'Procesando...'
                            : 'Marcar REGISTRADO en SICOV'}
                        </button>

                      </div>
                    ) : !certificado ? (
                      <div>

                        <div
                          className="
                            bg-emerald-50
                            border
                            border-emerald-200
                            rounded-lg
                            p-3
                            text-xs
                            text-emerald-700
                            mb-3
                          "
                        >
                          <i className="fas fa-check-circle mr-2"></i>

                          El aprendiz ya está registrado en SICOV.
                        </div>

                        <p
                          className="
                            text-xs
                            text-gray-600
                            mb-3
                          "
                        >
                          Cuando finalice el proceso en SICOV y quede certificado, confirme la certificación.
                        </p>

                        <button
                          type="button"
                          onClick={
                            certificarSicov
                          }
                          disabled={
                            procesando
                          }
                          className="
                            bg-purple-600
                            hover:bg-purple-700
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

                          {procesando
                            ? 'Procesando...'
                            : 'Marcar CERTIFICADO en SICOV'}
                        </button>

                      </div>
                    ) : (
                      <div
                        className="
                          bg-emerald-50
                          border
                          border-emerald-300
                          rounded-lg
                          p-4
                          text-xs
                          text-emerald-700
                        "
                      >

                        <div className="font-bold">
                          <i className="fas fa-circle-check mr-2"></i>

                          PROCESO SICOV COMPLETADO
                        </div>

                        <p className="mt-1">
                          El aprendiz se encuentra registrado y certificado en SICOV.
                        </p>

                      </div>
                    )}

                  </div>

                </div>

                {/* CERRAR */}

                <div className="flex justify-end">

                  <button
                    type="button"
                    onClick={
                      cerrarDetalle
                    }
                    disabled={
                      procesando
                    }
                    className="
                      bg-gray-600
                      hover:bg-gray-800
                      text-white
                      px-4
                      py-2
                      rounded-lg
                      text-xs
                      disabled:opacity-50
                    "
                  >
                    Cerrar
                  </button>

                </div>

              </div>
            ) : null}

          </div>

        </div>
      )}

    </div>
  )
}