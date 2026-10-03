// app/admin/inscripciones/page.jsx

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
  '/api/admin/inscripciones/aprendices'

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
// ESTADO MATRÍCULA
// ============================================================
//
// Desde ahora:
//
// ACTIVO
// FINALIZADO
//
// Para registros de prueba anteriores que todavía tengan
// PENDIENTE, se muestran visualmente como ACTIVO.
//
// ============================================================

function normalizarEstadoMatricula(
  estado
) {
  const valor =
    mayusculas(
      estado
    )

  if (
    valor ===
    'FINALIZADO'
  ) {
    return 'FINALIZADO'
  }

  return 'ACTIVO'
}

// ============================================================
// ESTADO RUNT
// ============================================================

function obtenerEstadoRunt(
  control
) {
  if (
    !control
  ) {
    return {
      estado:
        'SIN CONTROL',

      tipo:
        'gray',

      detalle:
        '',
    }
  }

  const certificacion =
    mayusculas(
      control.estado_certificacion
    )

  const registro =
    mayusculas(
      control.estado_registro
    )

  const verificacion =
    mayusculas(
      control.resultado_verificacion
    )

  if (
    certificacion ===
    'CERTIFICADO'
  ) {
    return {
      estado:
        'CERTIFICADO',

      tipo:
        'green',

      detalle:
        control.fecha_certificacion
          ? `Certificado ${formatearFecha(
              control.fecha_certificacion
            )}`
          : '',
    }
  }

  if (
    registro ===
    'REGISTRADO'
  ) {
    return {
      estado:
        'REGISTRADO',

      tipo:
        'blue',

      detalle:
        control.fecha_registro
          ? `Registrado ${formatearFecha(
              control.fecha_registro
            )}`
          : '',
    }
  }

  if (
    verificacion ===
    'NO INSCRITO'
  ) {
    return {
      estado:
        'NO INSCRITO',

      tipo:
        'red',

      detalle:
        'Debe inscribirse en RUNT',
    }
  }

  if (
    verificacion ===
    'INSCRITO'
  ) {
    return {
      estado:
        'INSCRITO',

      tipo:
        'yellow',

      detalle:
        'Pendiente de registro',
    }
  }

  return {
    estado:
      'PENDIENTE',

    tipo:
      'yellow',

    detalle:
      'Pendiente de verificación',
  }
}

// ============================================================
// ESTADO SICOV
// ============================================================

function obtenerEstadoSicov(
  control
) {
  if (
    !control
  ) {
    return {
      estado:
        'SIN CONTROL',

      tipo:
        'gray',

      detalle:
        '',
    }
  }

  const certificacion =
    mayusculas(
      control.estado_certificacion
    )

  const registro =
    mayusculas(
      control.estado_registro
    )

  if (
    certificacion ===
    'CERTIFICADO'
  ) {
    return {
      estado:
        'CERTIFICADO',

      tipo:
        'green',

      detalle:
        control.fecha_certificacion
          ? `Certificado ${formatearFecha(
              control.fecha_certificacion
            )}`
          : '',
    }
  }

  if (
    registro ===
    'REGISTRADO'
  ) {
    return {
      estado:
        'REGISTRADO',

      tipo:
        'blue',

      detalle:
        control.fecha_registro
          ? `Registrado ${formatearFecha(
              control.fecha_registro
            )}`
          : 'Pendiente de certificación',
    }
  }

  return {
    estado:
      'PENDIENTE',

    tipo:
      'yellow',

    detalle:
      'Pendiente de registro',
  }
}

// ============================================================
// ESTADO SIET
// ============================================================

function obtenerEstadoSiet(
  control
) {
  if (
    !control
  ) {
    return {
      estado:
        'SIN CONTROL',

      tipo:
        'gray',

      detalle:
        '',
    }
  }

  const estado =
    mayusculas(
      control.estado
    )

  if (
    estado ===
    'CERTIFICADO'
  ) {
    return {
      estado:
        'CERTIFICADO',

      tipo:
        'green',

      detalle:
        control.fecha_certificacion
          ? `Certificado ${formatearFecha(
              control.fecha_certificacion
            )}`
          : '',
    }
  }

  if (
    estado ===
    'REGISTRADO'
  ) {
    return {
      estado:
        'REGISTRADO',

      tipo:
        'blue',

      detalle:
        control.fecha_registro
          ? `Registrado ${formatearFecha(
              control.fecha_registro
            )}`
          : 'Pendiente de certificación',
    }
  }

  return {
    estado:
      'PENDIENTE',

    tipo:
      'yellow',

    detalle:
      'Pendiente de registro',
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
        text-[10px]
        font-semibold
        ${clases[tipo] || clases.gray}
      `}
    >
      {children}
    </span>
  )
}

// ============================================================
// CAMPO
// ============================================================

function Campo({
  label,
  valor,
}) {
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
          font-semibold
          text-gray-800
          mt-1
          break-words
        "
      >
        {texto(
          valor
        ) ||
          '-'}
      </p>

    </div>
  )
}

// ============================================================
// TARJETA PROCESO EXTERNO
// ============================================================

function TarjetaProcesoExterno({
  titulo,
  icono,
  estado,
}) {
  return (
    <div
      className="
        border
        border-gray-300
        rounded-lg
        p-3
        bg-white
      "
    >

      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
          "
        >

          <div
            className="
              w-9
              h-9
              rounded-lg
              bg-gray-100
              text-gray-600
              flex
              items-center
              justify-center
            "
          >
            <i
              className={`fas ${icono}`}
            ></i>
          </div>

          <div>

            <p
              className="
                text-[10px]
                uppercase
                font-bold
                tracking-wide
                text-gray-500
              "
            >
              {titulo}
            </p>

            {estado.detalle && (
              <p
                className="
                  text-[10px]
                  text-gray-500
                  mt-1
                "
              >
                {estado.detalle}
              </p>
            )}

          </div>

        </div>

        <Badge
          tipo={
            estado.tipo
          }
        >
          {estado.estado}
        </Badge>

      </div>

    </div>
  )
}

// ============================================================
// PÁGINA
// ============================================================

export default function InscripcionesPage() {
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

  const [
    filtros,
    setFiltros,
  ] =
    useState({
      q:
        '',

      fecha_inicio:
        '',

      fecha_fin:
        '',
    })

  // ==========================================================
  // RESULTADOS
  // ==========================================================

  const [
    resultados,
    setResultados,
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

  const [
    consultado,
    setConsultado,
  ] =
    useState(
      false
    )

  // ==========================================================
  // DRAWER EXPEDIENTE
  // ==========================================================

  const [
    drawerOpen,
    setDrawerOpen,
  ] =
    useState(
      false
    )

  const [
    expediente,
    setExpediente,
  ] =
    useState(
      null
    )

  const [
    loadingExpediente,
    setLoadingExpediente,
  ] =
    useState(
      false
    )

  const [
    matriculaSeleccionada,
    setMatriculaSeleccionada,
  ] =
    useState(
      null
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
  // DATOS USUARIO
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

        const q =
          texto(
            filtros.q
          )

        const fechaInicio =
          texto(
            filtros.fecha_inicio
          )

        const fechaFin =
          texto(
            filtros.fecha_fin
          )

        // ====================================================
        // SI NO HAY FILTRO
        // ====================================================

        if (
          !q &&
          !fechaInicio &&
          !fechaFin
        ) {
          setResultados(
            []
          )

          setConsultado(
            false
          )

          setLoading(
            false
          )

          return
        }

        // ====================================================
        // EVITAR CONSULTAR CON 1 O 2 CARACTERES
        // ====================================================

        if (
          q &&
          q.length <
            3 &&
          !fechaInicio &&
          !fechaFin
        ) {
          setResultados(
            []
          )

          setConsultado(
            false
          )

          return
        }

        setLoading(
          true
        )

        setConsultado(
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
            q
          ) {
            params.set(
              'q',
              q
            )
          }

          if (
            fechaInicio
          ) {
            params.set(
              'fecha_inicio',
              fechaInicio
            )
          }

          if (
            fechaFin
          ) {
            params.set(
              'fecha_fin',
              fechaFin
            )
          }

          const json =
            await fetchJsonSeguro(
              `${API_URL}?${params.toString()}`
            )

          setResultados(
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

          setResultados(
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
  // BÚSQUEDA AUTOMÁTICA
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

      const q =
        texto(
          filtros.q
        )

      const hayFechas =
        Boolean(
          filtros.fecha_inicio ||
          filtros.fecha_fin
        )

      if (
        !q &&
        !hayFechas
      ) {
        setResultados(
          []
        )

        setConsultado(
          false
        )

        return
      }

      if (
        q &&
        q.length <
          3 &&
        !hayFechas
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
          450
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
  // LIMPIAR
  // ==========================================================

  function limpiarFiltros() {
    setFiltros({
      q:
        '',

      fecha_inicio:
        '',

      fecha_fin:
        '',
    })

    setResultados(
      []
    )

    setConsultado(
      false
    )

    setError(
      ''
    )
  }

  // ==========================================================
  // CONSULTAR EXPEDIENTE
  // ==========================================================

  async function consultarExpediente(
    documento,
    matriculaId = null
  ) {
    const documentoNormalizado =
      texto(
        documento
      )

    if (
      !documentoNormalizado
    ) {
      return
    }

    setDrawerOpen(
      true
    )

    setExpediente(
      null
    )

    setMatriculaSeleccionada(
      null
    )

    setLoadingExpediente(
      true
    )

    setError(
      ''
    )

    try {
      const params =
        new URLSearchParams()

      params.set(
        'recurso',
        'expediente'
      )

      params.set(
        'documento',
        documentoNormalizado
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

      setExpediente(
        json
      )

      const matriculas =
        Array.isArray(
          json?.matriculas
        )
          ? json.matriculas
          : []

      let seleccionada =
        null

      if (
        matriculaId
      ) {
        seleccionada =
          matriculas.find(
            item =>
              String(
                item.id
              ) ===
              String(
                matriculaId
              )
          ) ||
          null
      }

      if (
        !seleccionada &&
        matriculas.length >
          0
      ) {
        seleccionada =
          matriculas[0]
      }

      setMatriculaSeleccionada(
        seleccionada
      )
    } catch (
      errorExpediente
    ) {
      setError(
        errorExpediente.message
      )
    } finally {
      setLoadingExpediente(
        false
      )
    }
  }

  // ==========================================================
  // CERRAR EXPEDIENTE
  // ==========================================================

  function cerrarExpediente() {
    setDrawerOpen(
      false
    )

    setExpediente(
      null
    )

    setMatriculaSeleccionada(
      null
    )

    setError(
      ''
    )
  }

  // ==========================================================
  // DATOS EXPEDIENTE
  // ==========================================================

  const aprendiz =
    expediente?.aprendiz ||
    null

  const matriculasExpediente =
    Array.isArray(
      expediente?.matriculas
    )
      ? expediente.matriculas
      : []

  // ==========================================================
  // PROCESOS EXTERNOS MATRÍCULA ACTUAL
  // ==========================================================

  const estadoRunt =
    useMemo(
      () =>
        obtenerEstadoRunt(
          matriculaSeleccionada
            ?.control_runt
        ),
      [
        matriculaSeleccionada,
      ]
    )

  const estadoSicov =
    useMemo(
      () =>
        obtenerEstadoSicov(
          matriculaSeleccionada
            ?.control_sicov
        ),
      [
        matriculaSeleccionada,
      ]
    )

  const estadoSiet =
    useMemo(
      () =>
        obtenerEstadoSiet(
          matriculaSeleccionada
            ?.control_siet
        ),
      [
        matriculaSeleccionada,
      ]
    )

  // ==========================================================
  // CARGANDO SESIÓN
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
              gap-3
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
                <i className="fas fa-file-signature"></i>

                Inscripciones
              </h1>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  text-gray-500
                "
              >
                Consulte matrículas, historial del aprendiz y estado de los procesos externos.
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
              flex-wrap
              justify-between
              gap-2
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
            ERROR
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
            FILTROS Y ACCIONES
        ================================================== */}

        <div
          className="
            mb-3
            flex
            flex-col
            xl:flex-row
            xl:items-end
            gap-2
          "
        >

          {/* BUSCAR */}

          <div className="relative flex-1 min-w-[260px]">

            <i
              className="
                fas
                fa-search
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-gray-400
                text-xs
                pointer-events-none
              "
            ></i>

            <input
              type="text"
              name="q"
              value={filtros.q}
              onChange={cambiarFiltro}
              placeholder="Documento, nombre, apellido, matrícula o categoría..."
              aria-label="Criterio de búsqueda"
              className="
                w-full
                h-9
                border
                border-gray-300
                rounded-lg
                pl-9
                pr-3
                text-xs
                bg-white
                focus:outline-none
                focus:ring-2
                focus:ring-blue-200
                focus:border-[var(--primary)]
              "
            />

          </div>

          {/* FECHA INICIO */}

          <div className="w-full xl:w-[145px]">

            <input
              type="date"
              name="fecha_inicio"
              value={filtros.fecha_inicio}
              onChange={cambiarFiltro}
              aria-label="Desde"
              title="Desde"
              className="
                w-full
                h-9
                border
                border-gray-300
                rounded-lg
                px-2
                text-xs
                bg-white
              "
            />

          </div>

          {/* FECHA FIN */}

          <div className="w-full xl:w-[145px]">

            <input
              type="date"
              name="fecha_fin"
              value={filtros.fecha_fin}
              onChange={cambiarFiltro}
              aria-label="Hasta"
              title="Hasta"
              className="
                w-full
                h-9
                border
                border-gray-300
                rounded-lg
                px-2
                text-xs
                bg-white
              "
            />

          </div>

          <button
            type="button"
            onClick={() => consultar()}
            disabled={loading}
            className="
              h-9
              bg-[var(--primary)]
              hover:bg-[var(--primary-dark)]
              hover:-translate-y-0.5
              text-white
              px-3
              rounded-lg
              text-xs
              flex
              items-center
              justify-center
              gap-1.5
              disabled:opacity-50
              transition-all
              whitespace-nowrap
            "
          >
            <i className="fas fa-search"></i>

            {loading
              ? 'Consultando...'
              : 'Consultar'}
          </button>

          <button
            type="button"
            onClick={limpiarFiltros}
            className="
              h-9
              bg-gray-500
              hover:bg-gray-700
              hover:-translate-y-0.5
              text-white
              px-3
              rounded-lg
              text-xs
              flex
              items-center
              justify-center
              gap-1.5
              transition-all
              whitespace-nowrap
            "
          >
            <i className="fas fa-eraser"></i>

            Limpiar
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                '/admin/inscripciones/nueva'
              )
            }
            className="
              h-9
              bg-emerald-600
              hover:bg-emerald-700
              hover:-translate-y-0.5
              text-white
              px-3
              rounded-lg
              text-xs
              flex
              items-center
              justify-center
              gap-1.5
              transition-all
              whitespace-nowrap
            "
          >
            <i className="fas fa-user-plus"></i>

            Nueva Matrícula
          </button>

        </div>

        {/* ==================================================
            RESULTADOS
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
              Resultados
            </span>

            <span
              className="
                text-xs
                text-gray-300
              "
            >
              {resultados.length} registro(s)
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
                    Fecha
                  </th>

                  <th className="p-2 border">
                    Documento
                  </th>

                  <th className="p-2 border">
                    Aprendiz
                  </th>

                  <th className="p-2 border">
                    Categoría
                  </th>

                  <th className="p-2 border">
                    Convenio
                  </th>

                  <th className="p-2 border">
                    Estado Matrícula
                  </th>

                  <th className="p-2 border">
                    Documentos
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
                      colSpan="9"
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
                ) : resultados.length ===
                  0 ? (
                  <tr>

                    <td
                      colSpan="9"
                      className="
                        p-8
                        text-center
                        text-gray-500
                      "
                    >

                      {!consultado ? (
                        <>
                          <i
                            className="
                              fas
                              fa-magnifying-glass
                              text-3xl
                              text-gray-300
                              block
                              mb-2
                            "
                          ></i>

                          Ingrese un criterio de búsqueda o seleccione un rango de fechas.
                        </>
                      ) : (
                        <>
                          <i
                            className="
                              fas
                              fa-circle-info
                              text-3xl
                              text-gray-300
                              block
                              mb-2
                            "
                          ></i>

                          No se encontraron matrículas.
                        </>
                      )}

                    </td>

                  </tr>
                ) : (
                  resultados.map(
                    row => {
                      const estadoMatricula =
                        normalizarEstadoMatricula(
                          row.estado
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

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            {formatearFecha(
                              row.fecha_matricula
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
                              row.documento
                            )}
                          </td>

                          <td className="p-2 border">

                            <div className="font-semibold">
                              {row.nombre_completo ||
                                [
                                  row.nombres,
                                  row.apellidos,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    ' '
                                  )}
                            </div>

                            {row.celular && (
                              <div
                                className="
                                  text-[10px]
                                  text-gray-500
                                "
                              >
                                {row.celular}
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
                            <Badge tipo="blue">
                              {row.categoria ||
                                (
                                  Array.isArray(
                                    row.categorias
                                  )
                                    ? row.categorias.join(
                                        ' · '
                                      )
                                    : '-'
                                )}
                            </Badge>
                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            {row.convenio ||
                              '-'}
                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >

                            {estadoMatricula ===
                            'FINALIZADO' ? (
                              <Badge tipo="green">
                                FINALIZADO
                              </Badge>
                            ) : (
                              <Badge tipo="blue">
                                ACTIVO
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
                                router.push(
                                  `/admin/inscripciones/documentos?matricula_id=${encodeURIComponent(
                                    row.id
                                  )}`
                                )
                              }
                              
                              className="
                                bg-emerald-600
                                hover:bg-[var(--primary-dark)]
                                text-white
                                px-3
                                py-1.5
                                rounded
                                text-[11px]
                                whitespace-nowrap
                              "
                            >
                              <i className="fas fa-file-alt mr-1"></i>

                              Documentos de Matrícula
                            </button>

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
                                consultarExpediente(
                                  row.documento,
                                  row.id
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
                                whitespace-nowrap
                              "
                            >
                              <i className="fas fa-folder-open mr-1"></i>

                              Ver Expediente
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
          DRAWER EXPEDIENTE
      ==================================================== */}

      {drawerOpen && (
        <div className="fixed inset-0 z-50">

          {/* FONDO */}

          <div
            className="
              absolute
              inset-0
              bg-black/40
            "
            onClick={
              cerrarExpediente
            }
          ></div>

          {/* PANEL */}

          <div
            className="
              absolute
              right-0
              top-0
              h-full
              w-full
              sm:w-[780px]
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
                  Expediente del Aprendiz
                </p>

                <h2
                  className="
                    text-lg
                    font-bold
                    text-[var(--primary)]
                  "
                >
                  {aprendiz
                    ?.nombre_completo ||
                    'Consulta de Expediente'}
                </h2>

                {aprendiz?.documento && (
                  <p
                    className="
                      text-xs
                      text-gray-500
                      mt-1
                    "
                  >
                    {aprendiz.tipo_doc ||
                      ''}
                    {' '}
                    {formatearDocumento(
                      aprendiz.documento
                    )}
                  </p>
                )}

              </div>

              <button
                type="button"
                onClick={
                  cerrarExpediente
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
                CONTENIDO
            ============================================== */}

            {loadingExpediente ? (
              <div
                className="
                  p-12
                  text-center
                  text-gray-500
                "
              >
                <i className="fas fa-spinner fa-spin mr-2"></i>

                Consultando expediente...
              </div>
            ) : expediente &&
              aprendiz ? (
              <div
                className="
                  p-4
                  space-y-4
                "
              >

                {/* ERROR */}

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

                {/* ==========================================
                    DATOS PERSONALES
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
                    Datos Personales
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

                    <Campo
                      label="Tipo documento"
                      valor={
                        aprendiz.tipo_doc
                      }
                    />

                    <Campo
                      label="Documento"
                      valor={
                        aprendiz.documento
                      }
                    />

                    <Campo
                      label="Lugar expedición"
                      valor={
                        aprendiz.lugar_expedicion
                      }
                    />

                    <Campo
                      label="Fecha nacimiento"
                      valor={
                        formatearFecha(
                          aprendiz.fecha_nacimiento
                        )
                      }
                    />

                    <Campo
                      label="Nombres"
                      valor={
                        aprendiz.nombres
                      }
                    />

                    <Campo
                      label="Apellidos"
                      valor={
                        aprendiz.apellidos
                      }
                    />

                    <Campo
                      label="Género"
                      valor={
                        aprendiz.genero
                      }
                    />

                    <Campo
                      label="Celular"
                      valor={
                        aprendiz.celular
                      }
                    />

                    <Campo
                      label="Correo"
                      valor={
                        aprendiz.correo
                      }
                    />

                    <Campo
                      label="Dirección"
                      valor={
                        aprendiz.direccion
                      }
                    />

                    <Campo
                      label="Barrio"
                      valor={
                        aprendiz.barrio
                      }
                    />

                    <Campo
                      label="Ciudad"
                      valor={
                        aprendiz.ciudad
                      }
                    />

                    <Campo
                      label="Estado civil"
                      valor={
                        aprendiz.estado_civil
                      }
                    />

                    <Campo
                      label="Ocupación"
                      valor={
                        aprendiz.ocupacion
                      }
                    />

                    <Campo
                      label="EPS"
                      valor={
                        aprendiz.eps
                      }
                    />

                    <Campo
                      label="Estrato"
                      valor={
                        aprendiz.estrato
                      }
                    />

                    <Campo
                      label="Nivel educativo"
                      valor={
                        aprendiz.nivel_educativo
                      }
                    />

                  </div>

                </div>

                {/* ==========================================
                    MATRÍCULAS / PROCESOS
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
                      items-center
                      justify-between
                      gap-2
                    "
                  >

                    <span
                      className="
                        text-xs
                        font-semibold
                      "
                    >
                      Matrículas del Aprendiz
                    </span>

                    <span
                      className="
                        text-[10px]
                        text-gray-300
                      "
                    >
                      {matriculasExpediente.length} proceso(s)
                    </span>

                  </div>

                  <div className="p-3 space-y-2">

                    {matriculasExpediente.map(
                      matricula => {
                        const seleccionada =
                          String(
                            matriculaSeleccionada
                              ?.id
                          ) ===
                          String(
                            matricula.id
                          )

                        const estadoMatricula =
                          normalizarEstadoMatricula(
                            matricula.estado
                          )

                        return (
                          <button
                            type="button"
                            key={
                              matricula.id
                            }
                            onClick={() =>
                              setMatriculaSeleccionada(
                                matricula
                              )
                            }
                            className={`
                              w-full
                              border
                              rounded-lg
                              p-3
                              text-left
                              transition
                              ${
                                seleccionada
                                  ? 'border-blue-400 bg-blue-50'
                                  : 'border-gray-300 bg-white hover:bg-gray-50'
                              }
                            `}
                          >

                            <div
                              className="
                                flex
                                flex-wrap
                                items-center
                                justify-between
                                gap-2
                              "
                            >

                              <div>

                                <div
                                  className="
                                    flex
                                    flex-wrap
                                    items-center
                                    gap-2
                                  "
                                >

                                  <span
                                    className="
                                      text-xs
                                      font-bold
                                      text-gray-800
                                    "
                                  >
                                    Matrícula{' '}
                                    {matricula.consecutivo ||
                                      '-'}
                                  </span>

                                  <Badge tipo="blue">
                                    {matricula.categoria ||
                                      '-'}
                                  </Badge>

                                </div>

                                <p
                                  className="
                                    text-[10px]
                                    text-gray-500
                                    mt-1
                                  "
                                >
                                  {formatearFecha(
                                    matricula.fecha_matricula
                                  )}

                                  {matricula.convenio
                                    ? ` · ${matricula.convenio}`
                                    : ''}
                                </p>

                              </div>

                              {estadoMatricula ===
                              'FINALIZADO' ? (
                                <Badge tipo="green">
                                  FINALIZADO
                                </Badge>
                              ) : (
                                <Badge tipo="blue">
                                  ACTIVO
                                </Badge>
                              )}

                            </div>

                          </button>
                        )
                      }
                    )}

                  </div>

                </div>

                {/* ==========================================
                    MATRÍCULA SELECCIONADA
                ========================================== */}

                {matriculaSeleccionada && (
                  <>

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
                        Proceso Seleccionado
                      </div>

                      <div
                        className="
                          p-3
                          grid
                          grid-cols-2
                          sm:grid-cols-4
                          gap-2
                        "
                      >

                        <Campo
                          label="Matrícula"
                          valor={
                            matriculaSeleccionada.consecutivo
                          }
                        />

                        <Campo
                          label="Categoría"
                          valor={
                            matriculaSeleccionada.categoria
                          }
                        />

                        <Campo
                          label="Fecha matrícula"
                          valor={
                            formatearFecha(
                              matriculaSeleccionada.fecha_matricula
                            )
                          }
                        />

                        <div
                          className="
                            border
                            border-gray-200
                            rounded-lg
                            p-2.5
                            bg-white
                          "
                        >

                          <p
                            className="
                              text-[10px]
                              uppercase
                              tracking-wide
                              font-semibold
                              text-gray-500
                            "
                          >
                            Estado Matrícula
                          </p>

                          <div className="mt-1">

                            {normalizarEstadoMatricula(
                              matriculaSeleccionada.estado
                            ) ===
                            'FINALIZADO' ? (
                              <Badge tipo="green">
                                FINALIZADO
                              </Badge>
                            ) : (
                              <Badge tipo="blue">
                                ACTIVO
                              </Badge>
                            )}

                          </div>

                        </div>

                      </div>

                    </div>

                    {/* ======================================
                        DOCUMENTOS DE MATRÍCULA
                    ====================================== */}

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
                        Documentos de Matrícula
                      </div>

                      <div
                        className="
                          p-3
                          flex
                          flex-wrap
                          items-center
                          justify-between
                          gap-3
                        "
                      >

                        <div>

                          <p
                            className="
                              text-xs
                              font-semibold
                              text-gray-800
                            "
                          >
                            Matrícula{' '}
                            {matriculaSeleccionada.consecutivo ||
                              '-'}
                            {' · '}
                            Categoría{' '}
                            {matriculaSeleccionada.categoria ||
                              '-'}
                          </p>

                          <p
                            className="
                              mt-1
                              text-[10px]
                              text-gray-500
                            "
                          >
                            Control de Clases y Contrato correspondientes a esta matrícula.
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/admin/inscripciones/documentos?matricula_id=${encodeURIComponent(
                                matriculaSeleccionada.id
                              )}`
                            )
                          }
                                                      className="
                            bg-[var(--primary)]
                            hover:bg-[var(--primary-dark)]
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
                          <i className="fas fa-file-alt"></i>

                          Documentos de Matrícula
                        </button>

                      </div>

                    </div>
                    
                    {/* ======================================
                        PROCESOS EXTERNOS
                    ====================================== */}

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
                        Estado de Procesos Externos
                      </div>

                      <div
                        className="
                          p-3
                          grid
                          grid-cols-1
                          sm:grid-cols-3
                          gap-3
                        "
                      >

                        <TarjetaProcesoExterno
                          titulo="RUNT"
                          icono="fa-road"
                          estado={
                            estadoRunt
                          }
                        />

                        <TarjetaProcesoExterno
                          titulo="SICOV"
                          icono="fa-fingerprint"
                          estado={
                            estadoSicov
                          }
                        />

                        <TarjetaProcesoExterno
                          titulo="SIET"
                          icono="fa-graduation-cap"
                          estado={
                            estadoSiet
                          }
                        />

                      </div>

                    </div>

                    {/* ======================================
                        DETALLE RUNT
                    ====================================== */}

                    {matriculaSeleccionada
                      ?.control_runt && (
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
                            bg-gray-100
                            border-b
                            border-gray-300
                            px-3
                            py-2
                            text-xs
                            font-semibold
                            text-gray-700
                          "
                        >
                          Detalle RUNT
                        </div>

                        <div
                          className="
                            p-3
                            grid
                            grid-cols-2
                            sm:grid-cols-4
                            gap-2
                          "
                        >

                          <Campo
                            label="Proceso"
                            valor={`#${
                              matriculaSeleccionada
                                .control_runt
                                .numero_proceso ||
                              1
                            }`}
                          />

                          <Campo
                            label="Verificación"
                            valor={
                              matriculaSeleccionada
                                .control_runt
                                .resultado_verificacion ||
                              'PENDIENTE'
                            }
                          />

                          <Campo
                            label="Registro"
                            valor={
                              matriculaSeleccionada
                                .control_runt
                                .estado_registro ||
                              'PENDIENTE'
                            }
                          />

                          <Campo
                            label="Certificación"
                            valor={
                              matriculaSeleccionada
                                .control_runt
                                .estado_certificacion ||
                              'PENDIENTE'
                            }
                          />

                        </div>

                      </div>
                    )}

                    {/* ======================================
                        DETALLE SICOV
                    ====================================== */}

                    {matriculaSeleccionada
                      ?.control_sicov && (
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
                            bg-gray-100
                            border-b
                            border-gray-300
                            px-3
                            py-2
                            text-xs
                            font-semibold
                            text-gray-700
                          "
                        >
                          Detalle SICOV
                        </div>

                        <div
                          className="
                            p-3
                            grid
                            grid-cols-2
                            sm:grid-cols-4
                            gap-2
                          "
                        >

                          <Campo
                            label="Registro"
                            valor={
                              matriculaSeleccionada
                                .control_sicov
                                .estado_registro ||
                              'PENDIENTE'
                            }
                          />

                          <Campo
                            label="Fecha registro"
                            valor={
                              formatearFecha(
                                matriculaSeleccionada
                                  .control_sicov
                                  .fecha_registro
                              )
                            }
                          />

                          <Campo
                            label="Certificación"
                            valor={
                              matriculaSeleccionada
                                .control_sicov
                                .estado_certificacion ||
                              'PENDIENTE'
                            }
                          />

                          <Campo
                            label="Fecha certificación"
                            valor={
                              formatearFecha(
                                matriculaSeleccionada
                                  .control_sicov
                                  .fecha_certificacion
                              )
                            }
                          />

                        </div>

                      </div>
                    )}

                    {/* ======================================
                        DETALLE SIET
                    ====================================== */}

                    {matriculaSeleccionada
                      ?.control_siet && (
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
                            bg-gray-100
                            border-b
                            border-gray-300
                            px-3
                            py-2
                            text-xs
                            font-semibold
                            text-gray-700
                          "
                        >
                          Detalle SIET
                        </div>

                        <div
                          className="
                            p-3
                            grid
                            grid-cols-2
                            sm:grid-cols-4
                            gap-2
                          "
                        >

                          <Campo
                            label="Estado"
                            valor={
                              matriculaSeleccionada
                                .control_siet
                                .estado ||
                              'PENDIENTE'
                            }
                          />

                          <Campo
                            label="Fecha registro"
                            valor={
                              formatearFecha(
                                matriculaSeleccionada
                                  .control_siet
                                  .fecha_registro
                              )
                            }
                          />

                          <Campo
                            label="Usuario registro"
                            valor={
                              matriculaSeleccionada
                                .control_siet
                                .usuario_registro
                            }
                          />

                          <Campo
                            label="Fecha certificación"
                            valor={
                              formatearFecha(
                                matriculaSeleccionada
                                  .control_siet
                                  .fecha_certificacion
                              )
                            }
                          />

                        </div>

                      </div>
                    )}

                  </>
                )}

                {/* ==========================================
                    CONTACTO EMERGENCIA
                ========================================== */}

                {(
                  aprendiz.emergencia_nombre ||
                  aprendiz.emergencia_celular
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
                      Contacto de Emergencia
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

                      <Campo
                        label="Nombre"
                        valor={
                          aprendiz.emergencia_nombre
                        }
                      />

                      <Campo
                        label="Celular"
                        valor={
                          aprendiz.emergencia_celular
                        }
                      />

                    </div>

                  </div>
                )}

                {/* ==========================================
                    CERRAR
                ========================================== */}

                <div className="flex justify-end">

                  <button
                    type="button"
                    onClick={
                      cerrarExpediente
                    }
                    className="
                      bg-gray-600
                      hover:bg-gray-800
                      text-white
                      px-4
                      py-2
                      rounded-lg
                      text-xs
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