// app/admin/runt/page.jsx

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
  '/api/admin/runt'

const CATEGORIAS = [
  'A2',
  'B1',
  'C1',
  'RC1',
  'C2',
  'C3',
]

const TIPOS_CLASE = [
  {
    value:
      'TEORIA',

    label:
      'Teoría',
  },

  {
    value:
      'TALLER',

    label:
      'Taller',
  },

  {
    value:
      'PRACTICA',

    label:
      'Práctica',
  },
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

function numero(
  valor
) {
  const n =
    Number(
      valor
    )

  return Number.isFinite(
    n
  )
    ? n
    : 0
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

function hoyBogota() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',

      timeZone:
        'America/Bogota',
    }
  ).format(
    new Date()
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

function porcentaje(
  actual,
  total
) {
  const a =
    numero(
      actual
    )

  const t =
    numero(
      total
    )

  if (
    t <=
    0
  ) {
    return 100
  }

  return Math.min(
    100,
    Math.round(
      (
        a /
        t
      ) *
      100
    )
  )
}

// ============================================================
// FETCH
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

    orange:
      'bg-orange-50 text-orange-700 border-orange-300',
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
// BADGE VIGENCIA
// ============================================================

function BadgeVigencia({
  vigencia,
}) {
  const estado =
    mayusculas(
      vigencia?.estado
    )

  const dias =
    vigencia
      ?.dias_restantes

  if (
    estado ===
    'CERTIFICADO'
  ) {
    return (
      <Badge tipo="green">
        Certificado
      </Badge>
    )
  }

  if (
    estado ===
    'VENCIDO'
  ) {
    return (
      <Badge tipo="red">
        Vencido
      </Badge>
    )
  }

  if (
    estado ===
    'CRITICO'
  ) {
    return (
      <Badge tipo="red">
        {dias} día(s)
      </Badge>
    )
  }

  if (
    estado ===
    'URGENTE'
  ) {
    return (
      <Badge tipo="orange">
        {dias} día(s)
      </Badge>
    )
  }

  if (
    estado ===
    'ALERTA'
  ) {
    return (
      <Badge tipo="yellow">
        {dias} día(s)
      </Badge>
    )
  }

  if (
    estado ===
    'PREVENTIVO'
  ) {
    return (
      <Badge tipo="blue">
        {dias} día(s)
      </Badge>
    )
  }

  if (
    estado ===
    'VIGENTE'
  ) {
    return (
      <Badge tipo="green">
        {dias} día(s)
      </Badge>
    )
  }

  return (
    <Badge tipo="gray">
      Sin registro
    </Badge>
  )
}

// ============================================================
// TARJETA RESUMEN
// ============================================================

function TarjetaResumen({
  titulo,
  icono,
  cargadas,
  requeridas,
}) {
  const actual =
    numero(
      cargadas
    )

  const total =
    numero(
      requeridas
    )

  const completa =
    total ===
      0 ||
    actual >=
      total

  return (
    <div
      className="
        bg-white
        border
        border-gray-300
        rounded-lg
        p-3
        shadow-sm
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
        <div>

          <p
            className="
              text-[11px]
              uppercase
              font-semibold
              tracking-wide
              text-gray-500
            "
          >
            {titulo}
          </p>

          <div
            className="
              mt-1
              text-xl
              font-bold
              text-gray-800
            "
          >
            {actual}

            <span
              className="
                text-xs
                font-normal
                text-gray-400
              "
            >
              {' '}
              / {total}
            </span>

          </div>

        </div>

        <div
          className={`
            w-9
            h-9
            rounded-lg
            flex
            items-center
            justify-center
            ${
              completa
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
            }
          `}
        >
          <i
            className={`fas ${icono}`}
          ></i>
        </div>

      </div>

      <div
        className="
          mt-3
          h-2
          bg-gray-200
          rounded-full
          overflow-hidden
        "
      >

        <div
          className={`
            h-full
            rounded-full
            ${
              completa
                ? 'bg-emerald-500'
                : 'bg-blue-500'
            }
          `}
          style={{
            width:
              `${porcentaje(
                actual,
                total
              )}%`,
          }}
        ></div>

      </div>

      <div
        className="
          mt-2
          text-[10px]
          text-gray-500
          flex
          justify-between
        "
      >
        <span>
          {porcentaje(
            actual,
            total
          )}%
        </span>

        <span
          className={
            completa
              ? 'text-emerald-700 font-semibold'
              : ''
          }
        >
          {completa
            ? 'Completo'
            : 'Pendiente'}
        </span>

      </div>

    </div>
  )
}

// ============================================================
// PÁGINA
// ============================================================

export default function RuntPage() {
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

      categoria:
        '',

      resultado_verificacion:
        '',

      estado_registro:
        '',

      estado_certificacion:
        '',

      vigencia:
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

  const [
    consultado,
    setConsultado,
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
  // HISTORIAL PROCESOS RUNT
  // ==========================================================

  const [
    historialProcesos,
    setHistorialProcesos,
  ] =
    useState(
      []
    )

  const [
    loadingHistorial,
    setLoadingHistorial,
  ] =
    useState(
      false
    )

  const [
    procesoHistorialExpandido,
    setProcesoHistorialExpandido,
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

  const [
    mensaje,
    setMensaje,
  ] =
    useState(
      ''
    )

  // ==========================================================
  // CARGUE
  // ==========================================================

  const [
    cargue,
    setCargue,
  ] =
    useState({
      tipo_clase:
        'TEORIA',

      cantidad_clases:
        '1',

      fecha_clase:
        hoyBogota(),

      instructor_documento:
        '',

      observaciones:
        '',
    })

  // ==========================================================
  // INSTRUCTORES
  // ==========================================================

  const [
    instructores,
    setInstructores,
  ] =
    useState(
      []
    )

  const [
    loadingInstructores,
    setLoadingInstructores,
  ] =
    useState(
      false
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
  // DATOS SESIÓN
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

          Object.entries(
            filtros
          ).forEach(
            ([
              key,
              value,
            ]) => {
              const limpio =
                texto(
                  value
                )

              if (
                limpio
              ) {
                params.set(
                  key,
                  limpio
                )
              }
            }
          )

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
  // CONSULTA INICIAL
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

      if (
        q &&
        q.length <
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
  // FILTROS
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

  function limpiarFiltros() {
    setFiltros({
      q:
        '',

      categoria:
        '',

      resultado_verificacion:
        '',

      estado_registro:
        '',

      estado_certificacion:
        '',

      vigencia:
        '',
    })
  }

  // ==========================================================
  // OBTENER DETALLE SIN MODIFICAR ESTADO
  // ==========================================================

  const obtenerDetalleControl =
    useCallback(
      async (
        controlId
      ) => {
        const params =
          new URLSearchParams()

        params.set(
          'recurso',
          'detalle'
        )

        params.set(
          'control_runt_id',
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

        return (
          json?.data ||
          null
        )
      },
      [
        nit,
      ]
    )

  // ==========================================================
  // CARGAR DETALLE ACTUAL
  // ==========================================================

  async function cargarDetalle(
    controlId
  ) {
    const data =
      await obtenerDetalleControl(
        controlId
      )

    setDetalle(
      data
    )

    return data
  }

  // ==========================================================
  // HISTORIAL DE PROCESOS
  // ==========================================================
  //
  // Recorre:
  //
  // proceso actual
  //    ↓
  // control_runt_anterior_id
  //    ↓
  // proceso anterior
  //
  // hasta llegar al proceso #1.
  //
  // ==========================================================

  const cargarHistorialProcesos =
    useCallback(
      async (
        detalleActual
      ) => {
        if (
          !detalleActual
            ?.control
            ?.id
        ) {
          setHistorialProcesos(
            []
          )

          return
        }

        setLoadingHistorial(
          true
        )

        try {
          const procesos =
            []

          // ==================================================
          // PROCESO ACTUAL
          // ==================================================

          procesos.push({
            ...detalleActual,

            es_actual:
              true,
          })

          let anteriorId =
            detalleActual
              ?.control
              ?.control_runt_anterior_id

          const idsVisitados =
            new Set()

          idsVisitados.add(
            String(
              detalleActual
                .control
                .id
            )
          )

          // ==================================================
          // SEGURIDAD
          // Máximo 20 reprocesos
          // ==================================================

          let contador =
            0

          while (
            anteriorId &&
            contador <
              20
          ) {
            const key =
              String(
                anteriorId
              )

            if (
              idsVisitados.has(
                key
              )
            ) {
              break
            }

            idsVisitados.add(
              key
            )

            const anterior =
              await obtenerDetalleControl(
                anteriorId
              )

            if (
              !anterior
                ?.control
                ?.id
            ) {
              break
            }

            procesos.push({
              ...anterior,

              es_actual:
                false,
            })

            anteriorId =
              anterior
                ?.control
                ?.control_runt_anterior_id

            contador +=
              1
          }

          // ==================================================
          // ORDENAR DE MÁS ANTIGUO A MÁS NUEVO
          // ==================================================

          procesos.sort(
            (
              a,
              b
            ) =>
              numero(
                a
                  ?.control
                  ?.numero_proceso ||
                1
              ) -
              numero(
                b
                  ?.control
                  ?.numero_proceso ||
                1
              )
          )

          setHistorialProcesos(
            procesos
          )
        } catch (
          errorHistorial
        ) {
          console.error(
            'Error cargando historial RUNT:',
            errorHistorial
          )

          setHistorialProcesos(
            []
          )
        } finally {
          setLoadingHistorial(
            false
          )
        }
      },
      [
        obtenerDetalleControl,
      ]
    )

  // ==========================================================
  // ABRIR DETALLE
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

    setHistorialProcesos(
      []
    )

    setProcesoHistorialExpandido(
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

    setInstructores(
      []
    )

    setCargue({
      tipo_clase:
        'TEORIA',

      cantidad_clases:
        '1',

      fecha_clase:
        hoyBogota(),

      instructor_documento:
        '',

      observaciones:
        '',
    })

    try {
      const data =
        await cargarDetalle(
          row.id
        )

      await cargarHistorialProcesos(
        data
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

    setHistorialProcesos(
      []
    )

    setProcesoHistorialExpandido(
      null
    )

    setInstructores(
      []
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )
  }

  // ==========================================================
  // DATOS DETALLE
  // ==========================================================

  const controlActual =
    detalle?.control ||
    null

  const matriculaActual =
    detalle?.matricula ||
    null

  const requisitos =
    detalle?.requisitos ||
    {}

  const cargues =
    Array.isArray(
      detalle?.cargues
    )
      ? detalle.cargues
      : []

  const vigenciaActual =
    detalle?.vigencia ||
    {}

  const notificaciones =
    Array.isArray(
      detalle?.notificaciones
    )
      ? detalle.notificaciones
      : []

  const ultimaFechaTeoriaTaller =
    texto(
      detalle
        ?.ultima_fecha_teoria_taller
    )

  // ==========================================================
  // RESUMEN CARGUES
  // ==========================================================

  const resumenCargues =
    useMemo(
      () => {
        const resumen = {
          TEORIA:
            0,

          TALLER:
            0,

          PRACTICA:
            0,
        }

        for (
          const item of
            cargues
        ) {
          const tipo =
            mayusculas(
              item?.tipo_clase
            )

          const cantidad =
            numero(
              item?.cantidad_clases
            )

          if (
            Object.prototype.hasOwnProperty.call(
              resumen,
              tipo
            )
          ) {
            resumen[tipo] +=
              cantidad
          }
        }

        return resumen
      },
      [
        cargues,
      ]
    )

  const teoriaCargadas =
    resumenCargues.TEORIA

  const tallerCargadas =
    resumenCargues.TALLER

  const practicaCargadas =
    resumenCargues.PRACTICA

  const teoriaRequeridas =
    numero(
      requisitos
        ?.clases_teoria
    )

  const tallerRequeridas =
    numero(
      requisitos
        ?.clases_taller
    )

  const practicaRequeridas =
    numero(
      requisitos
        ?.clases_practica
    )

  const totalCargadas =
    teoriaCargadas +
    tallerCargadas +
    practicaCargadas

  const totalRequeridas =
    teoriaRequeridas +
    tallerRequeridas +
    practicaRequeridas

  const teoriaCompleta =
    teoriaRequeridas ===
      0 ||
    teoriaCargadas >=
      teoriaRequeridas

  const tallerCompleto =
    tallerRequeridas ===
      0 ||
    tallerCargadas >=
      tallerRequeridas

  const practicaCompleta =
    practicaRequeridas ===
      0 ||
    practicaCargadas >=
      practicaRequeridas

  const practicaHabilitadaUI =
    teoriaCompleta &&
    tallerCompleto &&
    !vigenciaActual
      ?.vencido

  const procesoCompleto =
    teoriaCompleta &&
    tallerCompleto &&
    practicaCompleta

  // ==========================================================
  // ESTADOS
  // ==========================================================

  const inscrito =
    mayusculas(
      controlActual
        ?.resultado_verificacion
    ) ===
    'INSCRITO'

  const noInscrito =
    mayusculas(
      controlActual
        ?.resultado_verificacion
    ) ===
    'NO INSCRITO'

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

  const vencido =
    vigenciaActual
      ?.vencido ===
    true

  // ==========================================================
  // INSTRUCTORES
  // ==========================================================

  const cargarInstructores =
    useCallback(
      async () => {
        if (
          !controlActual?.categoria ||
          !cargue.fecha_clase ||
          !user ||
          vencido
        ) {
          return
        }

        setLoadingInstructores(
          true
        )

        try {
          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'instructores'
          )

          params.set(
            'categoria',
            controlActual
              .categoria
          )

          params.set(
            'fecha',
            cargue.fecha_clase
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

          const lista =
            Array.isArray(
              json?.data
            )
              ? json.data
              : []

          setInstructores(
            lista
          )

          setCargue(
            prev => {
              const existe =
                lista.some(
                  instructor =>
                    texto(
                      instructor.documento
                    ) ===
                    texto(
                      prev.instructor_documento
                    )
                )

              return {
                ...prev,

                instructor_documento:
                  existe
                    ? prev.instructor_documento
                    : '',
              }
            }
          )
        } catch (
          errorInstructores
        ) {
          console.error(
            errorInstructores
          )

          setInstructores(
            []
          )
        } finally {
          setLoadingInstructores(
            false
          )
        }
      },
      [
        controlActual?.categoria,
        cargue.fecha_clase,
        user,
        nit,
        vencido,
      ]
    )

  useEffect(
    () => {
      if (
        drawerOpen &&
        registrado &&
        !certificado &&
        !vencido &&
        controlActual?.categoria
      ) {
        cargarInstructores()
      }
    },
    [
      drawerOpen,
      registrado,
      certificado,
      vencido,
      controlActual?.categoria,
      cargarInstructores,
    ]
  )

  // ==========================================================
  // FECHA PRÁCTICA
  // ==========================================================

  useEffect(
    () => {
      if (
        cargue.tipo_clase !==
        'PRACTICA'
      ) {
        return
      }

      if (
        !ultimaFechaTeoriaTaller
      ) {
        return
      }

      if (
        !cargue.fecha_clase ||
        cargue.fecha_clase <
          ultimaFechaTeoriaTaller
      ) {
        setCargue(
          prev => ({
            ...prev,

            fecha_clase:
              ultimaFechaTeoriaTaller,

            instructor_documento:
              '',
          })
        )
      }
    },
    [
      cargue.tipo_clase,
      cargue.fecha_clase,
      ultimaFechaTeoriaTaller,
    ]
  )

  // ==========================================================
  // INSTRUCTOR SELECCIONADO
  // ==========================================================

  const instructorSeleccionado =
    useMemo(
      () =>
        instructores.find(
          instructor =>
            texto(
              instructor.documento
            ) ===
            texto(
              cargue.instructor_documento
            )
        ) ||
        null,
      [
        instructores,
        cargue.instructor_documento,
      ]
    )

  // ==========================================================
  // CAMBIAR CARGUE
  // ==========================================================

  function cambiarCargue(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target

    if (
      name ===
        'tipo_clase' &&
      value ===
        'PRACTICA' &&
      !practicaHabilitadaUI
    ) {
      return
    }

    if (
      name ===
        'fecha_clase' &&
      cargue.tipo_clase ===
        'PRACTICA' &&
      ultimaFechaTeoriaTaller &&
      value <
        ultimaFechaTeoriaTaller
    ) {
      setError(
        `La práctica no puede tener una fecha anterior al ${formatearFecha(
          ultimaFechaTeoriaTaller
        )}.`
      )

      return
    }

    setError(
      ''
    )

    setCargue(
      prev => ({
        ...prev,

        [name]:
          value,

        ...(
          name ===
          'tipo_clase'
            ? {
                instructor_documento:
                  '',
              }
            : {}
        ),
      })
    )
  }

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
  // REFRESCAR DETALLE + HISTORIAL
  // ==========================================================

  async function refrescarDetalle(
    controlId
  ) {
    const nuevoDetalle =
      await cargarDetalle(
        controlId
      )

    await cargarHistorialProcesos(
      nuevoDetalle
    )

    return nuevoDetalle
  }

  // ==========================================================
  // MARCAR INSCRITO
  // ==========================================================

  async function marcarInscrito() {
    if (
      !controlActual?.id
    ) {
      return
    }

    if (
      !window.confirm(
        '¿Confirma que el aprendiz ya aparece INSCRITO en RUNT?'
      )
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
            'marcar_inscrito',

          control_runt_id:
            controlActual.id,
        })

      setMensaje(
        json?.message ||
        'Estado actualizado.'
      )

      await refrescarDetalle(
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
  // REGISTRAR RUNT
  // ==========================================================

  async function registrarRunt() {
    if (
      !controlActual?.id
    ) {
      return
    }

    if (
      !window.confirm(
        '¿Confirma que el aprendiz ya fue REGISTRADO en la plataforma RUNT?'
      )
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
            'registrar_runt',

          control_runt_id:
            controlActual.id,

          observaciones:
            '',
        })

      setMensaje(
        json?.message ||
        'Registro actualizado.'
      )

      await refrescarDetalle(
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
  // REGISTRAR CARGUE
  // ==========================================================

  async function registrarCargue(
    event
  ) {
    event.preventDefault()

    if (
      !controlActual?.id
    ) {
      return
    }

    if (
      vencido
    ) {
      setError(
        'El proceso RUNT está vencido. Debe iniciar un nuevo proceso.'
      )

      return
    }

    if (
      cargue.tipo_clase ===
        'PRACTICA' &&
      !practicaHabilitadaUI
    ) {
      setError(
        'La práctica está bloqueada hasta completar teoría y taller.'
      )

      return
    }

    if (
      cargue.tipo_clase ===
        'PRACTICA' &&
      ultimaFechaTeoriaTaller &&
      cargue.fecha_clase <
        ultimaFechaTeoriaTaller
    ) {
      setError(
        `La práctica no puede tener una fecha anterior al ${formatearFecha(
          ultimaFechaTeoriaTaller
        )}.`
      )

      return
    }

    if (
      !cargue.instructor_documento
    ) {
      setError(
        'Debe seleccionar un instructor.'
      )

      return
    }

    const cantidad =
      numero(
        cargue.cantidad_clases
      )

    if (
      !Number.isInteger(
        cantidad
      ) ||
      cantidad <
        1 ||
      cantidad >
        8
    ) {
      setError(
        'La cantidad debe estar entre 1 y 8 clases.'
      )

      return
    }

    if (
      !window.confirm(
        `¿Confirma registrar ${cantidad} clase(s) de ${cargue.tipo_clase}?`
      )
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
            'registrar_cargue',

          control_runt_id:
            controlActual.id,

          tipo_clase:
            cargue.tipo_clase,

          cantidad_clases:
            cantidad,

          fecha_clase:
            cargue.fecha_clase,

          instructor_documento:
            cargue.instructor_documento,

          observaciones:
            cargue.observaciones,
        })

      setMensaje(
        json?.message ||
        'Cargue registrado correctamente.'
      )

      setCargue(
        prev => ({
          ...prev,

          cantidad_clases:
            '1',

          observaciones:
            '',
        })
      )

      await refrescarDetalle(
        controlActual.id
      )

      await cargarInstructores()

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
  // CERTIFICAR
  // ==========================================================

  async function certificar() {
    if (
      !controlActual?.id
    ) {
      return
    }

    if (
      vencido
    ) {
      setError(
        'El proceso RUNT está vencido y no puede certificarse.'
      )

      return
    }

    if (
      !procesoCompleto
    ) {
      setError(
        'No se puede certificar porque todavía existen clases pendientes.'
      )

      return
    }

    if (
      !window.confirm(
        '¿Confirma que esta matrícula ya puede marcarse como CERTIFICADA en RUNT?'
      )
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
            'certificar',

          control_runt_id:
            controlActual.id,
        })

      setMensaje(
        json?.message ||
        'Certificación registrada.'
      )

      await refrescarDetalle(
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
  // REINICIAR PROCESO
  // ==========================================================

  async function reiniciarProceso() {
    if (
      !controlActual?.id ||
      !vencido
    ) {
      return
    }

    const confirmar =
      window.confirm(
        `Este proceso RUNT venció el ${formatearFecha(
          vigenciaActual.fecha_limite
        )}.\n\n¿Desea crear un nuevo proceso RUNT desde cero?\n\nEl historial anterior NO será eliminado.`
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
            'reiniciar_proceso',

          control_runt_id:
            controlActual.id,
        })

      const nuevoControl =
        json
          ?.data
          ?.nuevo_proceso

      setMensaje(
        json?.message ||
        'Nuevo proceso RUNT creado correctamente.'
      )

      await consultar({
        silencioso:
          true,
      })

      if (
        nuevoControl?.id
      ) {
        await refrescarDetalle(
          nuevoControl.id
        )
      }
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
  // EXPANDIR HISTORIAL
  // ==========================================================

  function alternarProcesoHistorial(
    controlId
  ) {
    setProcesoHistorialExpandido(
      prev =>
        prev ===
        controlId
          ? null
          : controlId
    )
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
                <i className="fas fa-road"></i>

                Control RUNT
              </h1>

              <p
                className="
                  text-sm
                  text-gray-600
                  mt-1
                "
              >
                Controle inscripción, registro, vigencia, cargue de clases y certificación de aprendices en RUNT.
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
              text-sm
              font-semibold
            "
          >
            <i className="fas fa-filter mr-2"></i>

            Filtros de Control RUNT
          </div>

          <div className="p-4">

            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                xl:grid-cols-7
                gap-3
              "
            >

              <div className="xl:col-span-2">

                <label className="block text-[11px] font-semibold mb-1">
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
                  placeholder="Documento, matrícula o categoría..."
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

              <div>

                <label className="block text-[11px] font-semibold mb-1">
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

              <div>

                <label className="block text-[11px] font-semibold mb-1">
                  Verificación
                </label>

                <select
                  name="resultado_verificacion"
                  value={
                    filtros.resultado_verificacion
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

                  <option value="INSCRITO">
                    Inscrito
                  </option>

                  <option value="NO INSCRITO">
                    No inscrito
                  </option>

                  <option value="PENDIENTE">
                    Pendiente
                  </option>

                </select>

              </div>

              <div>

                <label className="block text-[11px] font-semibold mb-1">
                  Registro
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

              <div>

                <label className="block text-[11px] font-semibold mb-1">
                  Vigencia
                </label>

                <select
                  name="vigencia"
                  value={
                    filtros.vigencia
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

                  <option value="VIGENTE">
                    Vigentes
                  </option>

                  <option value="PROXIMO">
                    Próximos a vencer
                  </option>

                  <option value="VENCIDO">
                    Vencidos
                  </option>

                  <option value="CERTIFICADO">
                    Certificados
                  </option>

                </select>

              </div>

              <div>

                <label className="block text-[11px] font-semibold mb-1">
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

            <div className="mt-3 flex gap-2">

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
                <i className="fas fa-eraser mr-2"></i>

                Limpiar
              </button>

            </div>

          </div>

        </div>

        {/* ==================================================
            COLA
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
            "
          >

            <span className="text-sm font-semibold">
              Cola de Trabajo RUNT
            </span>

            <span className="text-xs text-gray-300">
              {controles.length} registro(s)
            </span>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-[11px] border-collapse">

              <thead className="bg-gray-100">

                <tr>

                  <th className="p-2 border">
                    Matrícula
                  </th>

                  <th className="p-2 border">
                    Aprendiz
                  </th>

                  <th className="p-2 border">
                    Categoría
                  </th>

                  <th className="p-2 border">
                    Proceso
                  </th>

                  <th className="p-2 border">
                    Registro
                  </th>

                  <th className="p-2 border">
                    Vigencia
                  </th>

                  <th className="p-2 border">
                    Teoría
                  </th>

                  <th className="p-2 border">
                    Taller
                  </th>

                  <th className="p-2 border">
                    Práctica
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
                      colSpan="11"
                      className="p-8 text-center text-gray-500"
                    >
                      Consultando...
                    </td>

                  </tr>
                ) : controles.length ===
                  0 ? (
                  <tr>

                    <td
                      colSpan="11"
                      className="p-8 text-center text-gray-500"
                    >
                      {consultado
                        ? 'No se encontraron registros.'
                        : 'No hay datos.'}
                    </td>

                  </tr>
                ) : (
                  controles.map(
                    row => {
                      const av =
                        row?.avance ||
                        {}

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

                          <td className="p-2 border text-center font-semibold">
                            {row.consecutivo ||
                              '-'}
                          </td>

                          <td className="p-2 border">

                            <div className="font-semibold">
                              {row.aprendiz
                                ?.nombre_completo ||
                                '-'}
                            </div>

                            <div className="text-[10px] text-gray-500">
                              {formatearDocumento(
                                row.documento
                              )}
                            </div>

                          </td>

                          <td className="p-2 border text-center">

                            <Badge tipo="blue">
                              {row.categoria ||
                                '-'}
                            </Badge>

                          </td>

                          <td className="p-2 border text-center font-semibold">
                            #{row.numero_proceso ||
                              1}
                          </td>

                          <td className="p-2 border text-center">

                            {mayusculas(
                              row.estado_registro
                            ) ===
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

                          <td className="p-2 border text-center">

                            <BadgeVigencia
                              vigencia={
                                row.vigencia
                              }
                            />

                            {row
                              ?.vigencia
                              ?.fecha_limite && (
                              <div className="text-[9px] text-gray-500 mt-1">
                                {formatearFecha(
                                  row.vigencia.fecha_limite
                                )}
                              </div>
                            )}

                          </td>

                          <td className="p-2 border text-center">
                            {numero(
                              av.teoria_cargadas
                            )}
                            {' / '}
                            {numero(
                              av.teoria_requeridas
                            )}
                          </td>

                          <td className="p-2 border text-center">
                            {numero(
                              av.taller_cargadas
                            )}
                            {' / '}
                            {numero(
                              av.taller_requeridas
                            )}
                          </td>

                          <td className="p-2 border text-center">
                            {numero(
                              av.practica_cargadas
                            )}
                            {' / '}
                            {numero(
                              av.practica_requeridas
                            )}
                          </td>

                          <td className="p-2 border text-center">

                            {mayusculas(
                              row.estado_certificacion
                            ) ===
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

                          <td className="p-2 border text-center">

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
              sm:w-[720px]
              bg-white
              shadow-2xl
              overflow-y-auto
            "
          >

            {/* CABECERA */}

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
                  Control RUNT
                </p>

                <h2
                  className="
                    text-lg
                    font-bold
                    text-[var(--primary)]
                  "
                >
                  {matriculaActual
                    ?.nombre_completo ||
                    'Gestión RUNT'}
                </h2>

                {controlActual && (
                  <p className="text-xs text-gray-500 mt-1">
                    Matrícula{' '}
                    {controlActual.consecutivo ||
                      '-'}
                    {' · '}
                    Categoría{' '}
                    {controlActual.categoria ||
                      '-'}
                    {' · '}
                    Proceso #{controlActual.numero_proceso ||
                      1}
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

            {loadingDetalle ? (
              <div className="p-12 text-center text-gray-500">

                <i className="fas fa-spinner fa-spin mr-2"></i>

                Cargando...

              </div>
            ) : detalle &&
              controlActual ? (
              <div className="p-4 space-y-4">

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

                {/* ==========================================
                    HISTORIAL DE PROCESOS RUNT
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
                      flex
                      items-center
                      justify-between
                      gap-2
                    "
                  >

                    <span>
                      <i className="fas fa-history mr-2"></i>

                      Historial de Procesos RUNT
                    </span>

                    {!loadingHistorial && (
                      <span className="text-[10px] text-gray-300">
                        {historialProcesos.length} proceso(s)
                      </span>
                    )}

                  </div>

                  <div className="p-3">

                    {loadingHistorial ? (
                      <div className="text-center py-4 text-xs text-gray-500">

                        <i className="fas fa-spinner fa-spin mr-2"></i>

                        Consultando historial...

                      </div>
                    ) : historialProcesos.length ===
                      0 ? (
                      <div className="text-xs text-gray-500 text-center py-3">
                        No hay historial disponible.
                      </div>
                    ) : (
                      <div className="space-y-2">

                        {historialProcesos.map(
                          proceso => {
                            const control =
                              proceso
                                ?.control ||
                              {}

                            const vigencia =
                              proceso
                                ?.vigencia ||
                              {}

                            const avance =
                              proceso
                                ?.avance ||
                              {}

                            const actual =
                              proceso
                                ?.es_actual ===
                              true

                            const expandido =
                              procesoHistorialExpandido ===
                              control.id

                            return (
                              <div
                                key={
                                  control.id
                                }
                                className={`
                                  border
                                  rounded-lg
                                  overflow-hidden
                                  ${
                                    actual
                                      ? 'border-blue-300 bg-blue-50/40'
                                      : 'border-gray-300 bg-white'
                                  }
                                `}
                              >

                                <button
                                  type="button"
                                  onClick={() =>
                                    alternarProcesoHistorial(
                                      control.id
                                    )
                                  }
                                  className="
                                    w-full
                                    p-3
                                    text-left
                                    hover:bg-gray-50
                                    transition
                                  "
                                >

                                  <div
                                    className="
                                      flex
                                      items-center
                                      justify-between
                                      gap-3
                                    "
                                  >

                                    <div
                                      className="
                                        flex
                                        items-center
                                        gap-3
                                        min-w-0
                                      "
                                    >

                                      <div
                                        className={`
                                          w-9
                                          h-9
                                          rounded-lg
                                          flex
                                          items-center
                                          justify-center
                                          shrink-0
                                          ${
                                            actual
                                              ? 'bg-blue-100 text-blue-700'
                                              : vigencia?.vencido
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-gray-100 text-gray-600'
                                          }
                                        `}
                                      >
                                        <i
                                          className={
                                            actual
                                              ? 'fas fa-play'
                                              : vigencia?.vencido
                                                ? 'fas fa-clock-rotate-left'
                                                : 'fas fa-folder'
                                          }
                                        ></i>
                                      </div>

                                      <div className="min-w-0">

                                        <div
                                          className="
                                            flex
                                            flex-wrap
                                            items-center
                                            gap-2
                                          "
                                        >

                                          <span className="text-xs font-bold text-gray-800">
                                            Proceso #{control.numero_proceso ||
                                              1}
                                          </span>

                                          {actual && (
                                            <Badge tipo="blue">
                                              ACTUAL
                                            </Badge>
                                          )}

                                          {!actual &&
                                            vigencia?.vencido && (
                                            <Badge tipo="red">
                                              VENCIDO
                                            </Badge>
                                          )}

                                          {!actual &&
                                            mayusculas(
                                              vigencia?.estado
                                            ) ===
                                              'CERTIFICADO' && (
                                            <Badge tipo="green">
                                              CERTIFICADO
                                            </Badge>
                                          )}

                                        </div>

                                        <div
                                          className="
                                            mt-1
                                            text-[10px]
                                            text-gray-500
                                          "
                                        >

                                          Registro:{' '}

                                          <strong>
                                            {formatearFecha(
                                              control.fecha_registro
                                            )}
                                          </strong>

                                          {vigencia
                                            ?.fecha_limite && (
                                            <>
                                              {' · '}
                                              Límite:{' '}

                                              <strong>
                                                {formatearFecha(
                                                  vigencia.fecha_limite
                                                )}
                                              </strong>
                                            </>
                                          )}

                                        </div>

                                      </div>

                                    </div>

                                    <i
                                      className={`
                                        fas
                                        ${
                                          expandido
                                            ? 'fa-chevron-up'
                                            : 'fa-chevron-down'
                                        }
                                        text-gray-400
                                      `}
                                    ></i>

                                  </div>

                                </button>

                                {expandido && (
                                  <div
                                    className="
                                      border-t
                                      border-gray-200
                                      p-3
                                      bg-white
                                    "
                                  >

                                    <div
                                      className="
                                        grid
                                        grid-cols-2
                                        sm:grid-cols-4
                                        gap-3
                                        text-[11px]
                                      "
                                    >

                                      <div>

                                        <span className="text-gray-500">
                                          Verificación
                                        </span>

                                        <div className="font-semibold mt-1">
                                          {control.resultado_verificacion ||
                                            '-'}
                                        </div>

                                      </div>

                                      <div>

                                        <span className="text-gray-500">
                                          Registro
                                        </span>

                                        <div className="font-semibold mt-1">
                                          {control.estado_registro ||
                                            '-'}
                                        </div>

                                      </div>

                                      <div>

                                        <span className="text-gray-500">
                                          Certificación
                                        </span>

                                        <div className="font-semibold mt-1">
                                          {control.estado_certificacion ||
                                            '-'}
                                        </div>

                                      </div>

                                      <div>

                                        <span className="text-gray-500">
                                          Estado
                                        </span>

                                        <div className="mt-1">
                                          <BadgeVigencia
                                            vigencia={
                                              vigencia
                                            }
                                          />
                                        </div>

                                      </div>

                                    </div>

                                    <div
                                      className="
                                        grid
                                        grid-cols-3
                                        gap-2
                                        mt-3
                                      "
                                    >

                                      <div
                                        className="
                                          bg-blue-50
                                          border
                                          border-blue-200
                                          rounded-lg
                                          p-2
                                          text-center
                                        "
                                      >
                                        <div className="text-[9px] uppercase text-gray-500">
                                          Teoría
                                        </div>

                                        <div className="text-xs font-bold mt-1">
                                          {numero(
                                            avance.teoria_cargadas
                                          )}
                                          {' / '}
                                          {numero(
                                            avance.teoria_requeridas
                                          )}
                                        </div>
                                      </div>

                                      <div
                                        className="
                                          bg-amber-50
                                          border
                                          border-amber-200
                                          rounded-lg
                                          p-2
                                          text-center
                                        "
                                      >
                                        <div className="text-[9px] uppercase text-gray-500">
                                          Taller
                                        </div>

                                        <div className="text-xs font-bold mt-1">
                                          {numero(
                                            avance.taller_cargadas
                                          )}
                                          {' / '}
                                          {numero(
                                            avance.taller_requeridas
                                          )}
                                        </div>
                                      </div>

                                      <div
                                        className="
                                          bg-emerald-50
                                          border
                                          border-emerald-200
                                          rounded-lg
                                          p-2
                                          text-center
                                        "
                                      >
                                        <div className="text-[9px] uppercase text-gray-500">
                                          Práctica
                                        </div>

                                        <div className="text-xs font-bold mt-1">
                                          {numero(
                                            avance.practica_cargadas
                                          )}
                                          {' / '}
                                          {numero(
                                            avance.practica_requeridas
                                          )}
                                        </div>
                                      </div>

                                    </div>

                                    {control.motivo_reproceso && (
                                      <div
                                        className="
                                          mt-3
                                          bg-gray-50
                                          border
                                          border-gray-200
                                          rounded-lg
                                          p-2
                                          text-[10px]
                                          text-gray-600
                                        "
                                      >
                                        <strong>
                                          Motivo:
                                        </strong>{' '}

                                        {control.motivo_reproceso}
                                      </div>
                                    )}

                                  </div>
                                )}

                              </div>
                            )
                          }
                        )}

                      </div>
                    )}

                  </div>

                </div>

                {/* ==========================================
                    VIGENCIA
                ========================================== */}

                {registrado && (
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
                      Vigencia del Proceso RUNT Actual
                    </div>

                    <div className="p-3">

                      <div
                        className="
                          grid
                          grid-cols-2
                          sm:grid-cols-4
                          gap-3
                          text-xs
                        "
                      >

                        <div>
                          <span className="text-gray-500">
                            Registro
                          </span>

                          <div className="font-semibold">
                            {formatearFecha(
                              vigenciaActual
                                ?.fecha_registro
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-500">
                            Fecha límite
                          </span>

                          <div className="font-semibold">
                            {formatearFecha(
                              vigenciaActual
                                ?.fecha_limite
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-500">
                            Días restantes
                          </span>

                          <div className="font-bold">
                            {vigenciaActual
                              ?.dias_restantes ??
                              '-'}
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-500">
                            Estado
                          </span>

                          <div className="mt-1">
                            <BadgeVigencia
                              vigencia={
                                vigenciaActual
                              }
                            />
                          </div>
                        </div>

                      </div>

                      {vencido && (
                        <div
                          className="
                            mt-3
                            bg-red-50
                            border
                            border-red-300
                            rounded-lg
                            p-3
                            text-xs
                            text-red-700
                          "
                        >

                          <div className="font-bold">
                            <i className="fas fa-exclamation-triangle mr-2"></i>

                            PROCESO RUNT VENCIDO
                          </div>

                          <p className="mt-1">
                            El registro superó los 90 días calendario sin certificarse. No se permiten nuevos cargues ni certificación sobre este proceso.
                          </p>

                          <button
                            type="button"
                            onClick={
                              reiniciarProceso
                            }
                            disabled={
                              procesando
                            }
                            className="
                              mt-3
                              bg-red-600
                              hover:bg-red-700
                              text-white
                              px-4
                              py-2
                              rounded-lg
                              text-xs
                              font-semibold
                              disabled:opacity-50
                            "
                          >
                            <i className="fas fa-rotate-right mr-2"></i>

                            Reiniciar Proceso RUNT
                          </button>

                        </div>
                      )}

                    </div>

                  </div>
                )}

                {/* ==========================================
                    DATOS MATRÍCULA
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
                    Datos de Matrícula
                  </div>

                  <div
                    className="
                      p-3
                      grid
                      grid-cols-2
                      gap-3
                      text-xs
                    "
                  >

                    <div>

                      <span className="text-gray-500">
                        Aprendiz
                      </span>

                      <div className="font-semibold">
                        {matriculaActual
                          ?.nombre_completo ||
                          '-'}
                      </div>

                    </div>

                    <div>

                      <span className="text-gray-500">
                        Documento
                      </span>

                      <div className="font-semibold">
                        {formatearDocumento(
                          controlActual.documento
                        )}
                      </div>

                    </div>

                    <div>

                      <span className="text-gray-500">
                        Matrícula
                      </span>

                      <div className="font-semibold">
                        {controlActual.consecutivo ||
                          '-'}
                      </div>

                    </div>

                    <div>

                      <span className="text-gray-500">
                        Categoría
                      </span>

                      <div className="font-bold text-[var(--primary)]">
                        {controlActual.categoria ||
                          '-'}
                      </div>

                    </div>

                    <div>

                      <span className="text-gray-500">
                        Proceso RUNT
                      </span>

                      <div className="font-semibold">
                        #{controlActual.numero_proceso ||
                          1}
                      </div>

                    </div>

                    <div>

                      <span className="text-gray-500">
                        Motivo reproceso
                      </span>

                      <div className="font-semibold">
                        {controlActual.motivo_reproceso ||
                          '-'}
                      </div>

                    </div>

                  </div>

                </div>

                {/* ==========================================
                    VERIFICACIÓN
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
                    Verificación RUNT
                  </div>

                  <div className="p-3 space-y-3">

                    <div
                      className="
                        grid
                        grid-cols-2
                        gap-3
                        text-xs
                      "
                    >

                      <div>

                        <span className="text-gray-500">
                          Resultado
                        </span>

                        <div className="mt-1">

                          {inscrito ? (
                            <Badge tipo="green">
                              INSCRITO
                            </Badge>
                          ) : noInscrito ? (
                            <Badge tipo="red">
                              NO INSCRITO
                            </Badge>
                          ) : (
                            <Badge tipo="yellow">
                              PENDIENTE
                            </Badge>
                          )}

                        </div>

                      </div>

                      <div>

                        <span className="text-gray-500">
                          Usuario
                        </span>

                        <div className="font-semibold mt-1">
                          {controlActual
                            .usuario_verificacion ||
                            '-'}
                        </div>

                      </div>

                    </div>

                    {!inscrito &&
                      !vencido && (
                      <button
                        type="button"
                        onClick={
                          marcarInscrito
                        }
                        disabled={
                          procesando
                        }
                        className="
                          bg-emerald-600
                          hover:bg-emerald-700
                          text-white
                          px-3
                          py-2
                          rounded-lg
                          text-xs
                          disabled:opacity-50
                        "
                      >
                        <i className="fas fa-check mr-2"></i>

                        Marcar como INSCRITO
                      </button>
                    )}

                  </div>

                </div>

                {/* ==========================================
                    REGISTRO
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
                    Registro en RUNT
                  </div>

                  <div className="p-3">

                    {registrado ? (
                      <div
                        className="
                          flex
                          items-center
                          justify-between
                          gap-3
                        "
                      >

                        <Badge tipo="green">
                          REGISTRADO
                        </Badge>

                        <div className="text-xs text-gray-500 text-right">

                          <div>
                            {formatearFecha(
                              controlActual
                                .fecha_registro
                            )}
                          </div>

                          <div>
                            {controlActual
                              .usuario_registro ||
                              '-'}
                          </div>

                        </div>

                      </div>
                    ) : !inscrito ? (
                      <div className="text-xs text-amber-700">
                        Primero debe confirmar que el aprendiz aparece INSCRITO.
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          registrarRunt
                        }
                        disabled={
                          procesando
                        }
                        className="
                          bg-blue-600
                          hover:bg-blue-700
                          text-white
                          px-3
                          py-2
                          rounded-lg
                          text-xs
                          disabled:opacity-50
                        "
                      >
                        <i className="fas fa-user-check mr-2"></i>

                        Marcar REGISTRADO en RUNT
                      </button>
                    )}

                  </div>

                </div>

                {/* ==========================================
                    CARGUE
                ========================================== */}

                {registrado &&
                  !certificado &&
                  !vencido && (
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
                        Registrar Cargue de Clases
                      </div>

                      <form
                        onSubmit={
                          registrarCargue
                        }
                        className="
                          p-3
                          space-y-3
                        "
                      >

                        {!practicaHabilitadaUI && (
                          <div
                            className="
                              bg-amber-50
                              border
                              border-amber-300
                              rounded-lg
                              p-3
                              text-[11px]
                              text-amber-800
                            "
                          >
                            <i className="fas fa-lock mr-2"></i>

                            Práctica bloqueada hasta completar teoría
                            {tallerRequeridas >
                              0
                              ? ' y taller'
                              : ''}
                            .
                          </div>
                        )}

                        <div
                          className="
                            grid
                            grid-cols-1
                            sm:grid-cols-3
                            gap-3
                          "
                        >

                          <div>

                            <label className="block text-[11px] font-semibold mb-1">
                              Tipo
                            </label>

                            <select
                              name="tipo_clase"
                              value={
                                cargue.tipo_clase
                              }
                              onChange={
                                cambiarCargue
                              }
                              className="
                                w-full
                                border
                                border-gray-300
                                rounded-lg
                                px-2
                                py-2
                                text-xs
                              "
                            >

                              {TIPOS_CLASE.map(
                                item => {
                                  const tallerNoAplica =
                                    item.value ===
                                      'TALLER' &&
                                    tallerRequeridas ===
                                      0

                                  const practicaBloqueada =
                                    item.value ===
                                      'PRACTICA' &&
                                    !practicaHabilitadaUI

                                  return (
                                    <option
                                      key={
                                        item.value
                                      }
                                      value={
                                        item.value
                                      }
                                      disabled={
                                        tallerNoAplica ||
                                        practicaBloqueada
                                      }
                                    >
                                      {item.label}

                                      {tallerNoAplica
                                        ? ' — No aplica'
                                        : ''}

                                      {practicaBloqueada
                                        ? ' — Bloqueada'
                                        : ''}
                                    </option>
                                  )
                                }
                              )}

                            </select>

                          </div>

                          <div>

                            <label className="block text-[11px] font-semibold mb-1">
                              Cantidad
                            </label>

                            <input
                              type="number"
                              min="1"
                              max="8"
                              name="cantidad_clases"
                              value={
                                cargue.cantidad_clases
                              }
                              onChange={
                                cambiarCargue
                              }
                              className="
                                w-full
                                border
                                border-gray-300
                                rounded-lg
                                px-2
                                py-2
                                text-xs
                              "
                            />

                          </div>

                          <div>

                            <label className="block text-[11px] font-semibold mb-1">
                              Fecha
                            </label>

                            <input
                              type="date"
                              name="fecha_clase"
                              value={
                                cargue.fecha_clase
                              }
                              min={
                                cargue.tipo_clase ===
                                  'PRACTICA' &&
                                ultimaFechaTeoriaTaller
                                  ? ultimaFechaTeoriaTaller
                                  : undefined
                              }
                              onChange={
                                cambiarCargue
                              }
                              className="
                                w-full
                                border
                                border-gray-300
                                rounded-lg
                                px-2
                                py-2
                                text-xs
                              "
                            />

                          </div>

                        </div>

                        <div>

                          <label className="block text-[11px] font-semibold mb-1">
                            Nombre Instructor
                          </label>

                          <select
                            name="instructor_documento"
                            value={
                              cargue.instructor_documento
                            }
                            onChange={
                              cambiarCargue
                            }
                            disabled={
                              loadingInstructores
                            }
                            className="
                              w-full
                              border
                              border-gray-300
                              rounded-lg
                              px-3
                              py-2
                              text-xs
                              disabled:bg-gray-100
                            "
                          >

                            <option value="">
                              {loadingInstructores
                                ? 'Consultando instructores...'
                                : 'Seleccione instructor'}
                            </option>

                            {instructores.map(
                              instructor => (
                                <option
                                  key={
                                    instructor.documento
                                  }
                                  value={
                                    instructor.documento
                                  }
                                >
                                  {instructor.nombre_completo}

                                  {cargue.tipo_clase ===
                                    'PRACTICA'
                                    ? ` · ${numero(
                                        instructor.horas_disponibles
                                      )} h disponibles`
                                    : ''}
                                </option>
                              )
                            )}

                          </select>

                        </div>

                        {instructorSeleccionado && (
                          <div
                            className="
                              bg-blue-50
                              border
                              border-blue-200
                              rounded-lg
                              p-3
                              text-xs
                            "
                          >

                            <div
                              className="
                                grid
                                grid-cols-1
                                sm:grid-cols-3
                                gap-3
                              "
                            >

                              <div>

                                <span className="text-gray-500">
                                  Instructor
                                </span>

                                <div className="font-semibold">
                                  {instructorSeleccionado.nombre_completo}
                                </div>

                              </div>

                              <div>

                                <span className="text-gray-500">
                                  Certificados
                                </span>

                                <div className="font-semibold">

                                  {Array.isArray(
                                    instructorSeleccionado.certificados_bd
                                  ) &&
                                  instructorSeleccionado.certificados_bd.length >
                                    0
                                    ? instructorSeleccionado.certificados_bd.join(
                                        ' · '
                                      )
                                    : Array.isArray(
                                          instructorSeleccionado.certificados
                                        )
                                      ? instructorSeleccionado.certificados.join(
                                          ' · '
                                        )
                                      : '-'}

                                </div>

                              </div>

                              <div>

                                <span className="text-gray-500">
                                  Horas disponibles
                                </span>

                                <div className="font-bold">
                                  {numero(
                                    instructorSeleccionado.horas_disponibles
                                  )}
                                  {' / '}
                                  {numero(
                                    instructorSeleccionado.horas_asignadas
                                  ) ||
                                    240}
                                </div>

                                <div className="text-[10px] text-gray-500 mt-1">
                                  Solo práctica consume horas.
                                </div>

                              </div>

                            </div>

                          </div>
                        )}

                        <textarea
                          rows={2}
                          name="observaciones"
                          value={
                            cargue.observaciones
                          }
                          onChange={
                            cambiarCargue
                          }
                          placeholder="Observaciones opcionales"
                          className="
                            w-full
                            border
                            border-gray-300
                            rounded-lg
                            p-2
                            text-xs
                          "
                        />

                        <button
                          type="submit"
                          disabled={
                            procesando ||
                            loadingInstructores ||
                            !cargue.instructor_documento
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
                          <i className="fas fa-save mr-2"></i>

                          {procesando
                            ? 'Guardando...'
                            : 'Registrar Cargue'}
                        </button>

                      </form>

                    </div>
                  )}

                {/* ==========================================
                    HISTORIAL CARGUES ACTUALES
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
                    Historial de Cargues — Proceso Actual
                  </div>

                  <div
                    className="
                      grid
                      grid-cols-2
                      gap-3
                      p-3
                      bg-gray-50
                      border-b
                      border-gray-300
                    "
                  >

                    <TarjetaResumen
                      titulo="Teoría"
                      icono="fa-book-open"
                      cargadas={
                        teoriaCargadas
                      }
                      requeridas={
                        teoriaRequeridas
                      }
                    />

                    <TarjetaResumen
                      titulo="Taller"
                      icono="fa-tools"
                      cargadas={
                        tallerCargadas
                      }
                      requeridas={
                        tallerRequeridas
                      }
                    />

                    <TarjetaResumen
                      titulo="Práctica"
                      icono="fa-car"
                      cargadas={
                        practicaCargadas
                      }
                      requeridas={
                        practicaRequeridas
                      }
                    />

                    <TarjetaResumen
                      titulo="Total General"
                      icono="fa-chart-line"
                      cargadas={
                        totalCargadas
                      }
                      requeridas={
                        totalRequeridas
                      }
                    />

                  </div>

                  <div className="overflow-x-auto">

                    <table className="w-full text-[11px] border-collapse">

                      <thead className="bg-gray-100">

                        <tr>

                          <th className="p-2 border">
                            Fecha
                          </th>

                          <th className="p-2 border">
                            Tipo
                          </th>

                          <th className="p-2 border">
                            Cant.
                          </th>

                          <th className="p-2 border">
                            Instructor
                          </th>

                          <th className="p-2 border">
                            Horas
                          </th>

                          <th className="p-2 border">
                            Usuario
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {cargues.length >
                        0 ? (
                          cargues.map(
                            item => (
                              <tr
                                key={
                                  item.id
                                }
                              >

                                <td className="p-2 border text-center">
                                  {formatearFecha(
                                    item.fecha_clase
                                  )}
                                </td>

                                <td className="p-2 border text-center">

                                  {mayusculas(
                                    item.tipo_clase
                                  ) ===
                                  'PRACTICA' ? (
                                    <Badge tipo="green">
                                      PRÁCTICA
                                    </Badge>
                                  ) : mayusculas(
                                      item.tipo_clase
                                    ) ===
                                    'TALLER' ? (
                                    <Badge tipo="yellow">
                                      TALLER
                                    </Badge>
                                  ) : (
                                    <Badge tipo="blue">
                                      TEORÍA
                                    </Badge>
                                  )}

                                </td>

                                <td className="p-2 border text-center font-semibold">
                                  {numero(
                                    item.cantidad_clases
                                  )}
                                </td>

                                <td className="p-2 border">
                                  {item.instructor_nombre ||
                                    '-'}
                                </td>

                                <td className="p-2 border text-center">
                                  {numero(
                                    item.horas_consumidas
                                  )}
                                </td>

                                <td className="p-2 border">
                                  {item.usuario_cargue ||
                                    '-'}
                                </td>

                              </tr>
                            )
                          )
                        ) : (
                          <tr>

                            <td
                              colSpan="6"
                              className="p-5 text-center text-gray-500"
                            >
                              No hay cargues registrados en este proceso.
                            </td>

                          </tr>
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>

                {/* ==========================================
                    NOTIFICACIONES
                ========================================== */}

                {notificaciones.length >
                  0 && (
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
                      Notificaciones de Vencimiento
                    </div>

                    <div className="p-3 space-y-2">

                      {notificaciones.map(
                        item => (
                          <div
                            key={
                              item.id
                            }
                            className="
                              flex
                              justify-between
                              items-center
                              gap-3
                              border
                              border-gray-200
                              rounded-lg
                              p-2
                              text-xs
                            "
                          >

                            <div>

                              <div className="font-semibold">
                                {item.tipo_notificacion}
                              </div>

                              <div className="text-gray-500">
                                Programada:{' '}

                                {formatearFecha(
                                  item.fecha_programada
                                )}
                              </div>

                            </div>

                            {mayusculas(
                              item.estado_envio
                            ) ===
                            'ENVIADO' ? (
                              <Badge tipo="green">
                                Enviado
                              </Badge>
                            ) : mayusculas(
                                item.estado_envio
                              ) ===
                              'ERROR' ? (
                              <Badge tipo="red">
                                Error
                              </Badge>
                            ) : (
                              <Badge tipo="yellow">
                                Pendiente
                              </Badge>
                            )}

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

                {/* ==========================================
                    CERTIFICACIÓN
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
                    Certificación RUNT
                  </div>

                  <div className="p-3">

                    {certificado ? (
                      <div
                        className="
                          bg-emerald-50
                          border
                          border-emerald-300
                          rounded-lg
                          p-3
                          text-xs
                        "
                      >

                        <div className="font-bold text-emerald-700">
                          CERTIFICADO
                        </div>

                        <div className="text-gray-600 mt-1">
                          {formatearFecha(
                            controlActual
                              .fecha_certificacion
                          )}
                          {' · '}
                          {controlActual
                            .usuario_certificacion ||
                            '-'}
                        </div>

                      </div>
                    ) : vencido ? (
                      <div
                        className="
                          bg-red-50
                          border
                          border-red-300
                          rounded-lg
                          p-3
                          text-xs
                          text-red-700
                        "
                      >
                        Este proceso está vencido y no puede certificarse.
                      </div>
                    ) : !registrado ? (
                      <div
                        className="
                          bg-amber-50
                          border
                          border-amber-300
                          rounded-lg
                          p-3
                          text-xs
                          text-amber-700
                        "
                      >
                        Primero debe registrar al aprendiz en RUNT.
                      </div>
                    ) : !procesoCompleto ? (
                      <div
                        className="
                          bg-amber-50
                          border
                          border-amber-300
                          rounded-lg
                          p-3
                          text-xs
                          text-amber-700
                        "
                      >
                        Todavía existen clases pendientes de cargar.
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          certificar
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
                          disabled:opacity-50
                        "
                      >
                        <i className="fas fa-certificate mr-2"></i>

                        Marcar CERTIFICADO en RUNT
                      </button>
                    )}

                  </div>

                </div>

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