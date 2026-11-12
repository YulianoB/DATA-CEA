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

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import ModalResultado from '@/components/admin/ModalResultado'
import { BotonAccion, ESTILO_SECCIONES, ESTILO_SECCIONES_SECUNDARIAS, ESTILO_ENCABEZADO_TABLA, ESTILO_CELDAS_TABLA } from '@/components/admin/EstiloModulo'
import { Route } from 'lucide-react'
import { createPortal } from 'react-dom'

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
  'B2',
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

function formatearDocumento(valor) {
  const documento = String(valor ?? '').replace(/\D/g, '')
  return documento || '-'
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

  const [pestana, setPestana] = useState('pendientes')
  const [porPagina, setPorPagina] = useState(25)
  const [confirmarRegistroOpen, setConfirmarRegistroOpen] = useState(false)
  const [confirmarCargueOpen, setConfirmarCargueOpen] = useState(false)
  const [confirmarCertificacionOpen, setConfirmarCertificacionOpen] = useState(false)
  const [fechaRegistroCola, setFechaRegistroCola] = useState(hoyBogota())
  const [accionCola, setAccionCola] = useState(null)
  const [filtros, setFiltros] = useState({q:'',categoria:'',estado_gestion:'',fecha_inicio:'',fecha_fin:''})
  const categoriasCea = useMemo(() => {
    const nivel=String(user?.nivel_cea||user?.nivelCea||user?.empresa?.nivel_cea||'').toUpperCase()
    const porNivel={'NIVEL I':['A2','B1','C1','RC1'],'NIVEL II':['A2','B1','C1','RC1','B2','C2'],'NIVEL III':CATEGORIAS}
    const lista=user?.categorias_habilitadas||user?.empresa?.categorias_habilitadas
    return Array.isArray(lista)&&lista.length
      ? CATEGORIAS.filter(cat=>lista.map(c=>String(c).toUpperCase()).includes(cat))
      : porNivel[nivel]||CATEGORIAS
  },[user])

  // ==========================================================
  // LISTADO
  // ==========================================================
  const [paginaRunt, setPaginaRunt] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [hayMasRunt, setHayMasRunt] = useState(false)

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
  const [fechaInscripcionRunt, setFechaInscripcionRunt] = useState(hoyBogota())
  const [soporteInscripcionRunt, setSoporteInscripcionRunt] = useState('')

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
          params.set('pagina', String(paginaRunt))
          params.set('pestana', pestana)
          params.set('por_pagina', String(porPagina))

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

          setHayMasRunt(Boolean(json?.hay_mas))
          setTotalRegistros(Number(json?.total || 0))
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

          setControles([])
          setHayMasRunt(false)
          setTotalRegistros(0)
          setError(errorConsulta.message || 'Error al consultar Control RUNT.')
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
        paginaRunt,
        pestana,
        porPagina,
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
  // FILTROS
  // ==========================================================

  function cambiarFiltro(
    event
  ) {
    setPaginaRunt(1)
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
    setPaginaRunt(1)
    setFiltros({q:'',categoria:'',estado_gestion:'',fecha_inicio:'',fecha_fin:''})
  }
  function cambiarPestana(nueva) {
    setPestana(nueva)
    setPaginaRunt(1)
    setFiltros({q:'',categoria:'',estado_gestion:'',fecha_inicio:'',fecha_fin:''})
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

    setFechaInscripcionRunt(hoyBogota())
    setSoporteInscripcionRunt('')
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

  const sicovCertificado = detalle?.sicov_certificado === true

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
    'REGISTRADO'

  const noInscrito =
    mayusculas(
      controlActual
        ?.resultado_verificacion
    ) ===
    'NO REGISTRADO'

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

  // Vigencia operativa de 90 días: cálculo desde el saldo que entrega
  // la API, sin volver a interpretar fechas ni cambiar sus reglas.
  const diasRestantesRunt = Number(vigenciaActual?.dias_restantes)
  const vigenciaConPlazo = vigenciaActual?.dias_restantes != null &&
    Number.isFinite(diasRestantesRunt)
  const diasTranscurridosRunt = vigenciaConPlazo
    ? Math.max(0, Math.min(90, 90 - diasRestantesRunt))
    : null
  const porcentajeVigenciaRunt = diasTranscurridosRunt == null
    ? 0
    : Math.round(diasTranscurridosRunt * 100 / 90)

  // Alertas preventivas únicamente visuales. Las reglas de cargue,
  // requisitos por categoría y controles diarios siguen en la API.
  const limitePracticaDiaria = 8
  const clasesPracticaPendientes = Math.max(0, practicaRequeridas - practicaCargadas)
  const diasMinimosPractica = clasesPracticaPendientes > 0
    ? Math.ceil(clasesPracticaPendientes / limitePracticaDiaria)
    : 0
  const alertaTeoriaTardia = registrado && !certificado && !vencido &&
    vigenciaConPlazo && diasTranscurridosRunt >= 60 &&
    teoriaRequeridas > 0 && teoriaCargadas === 0
  const alertaPracticaLimite = registrado && !certificado && !vencido &&
    vigenciaConPlazo && diasMinimosPractica > 0 &&
    diasRestantesRunt <= diasMinimosPractica
  const practicaSinMargen = alertaPracticaLimite &&
    diasRestantesRunt < diasMinimosPractica
  const riesgoVigenciaRunt = vencido || practicaSinMargen
  const advertenciaVigenciaRunt = alertaTeoriaTardia || alertaPracticaLimite ||
    (vigenciaConPlazo && diasRestantesRunt <= 15)
  const colorProgresoRunt = riesgoVigenciaRunt
    ? 'bg-red-600'
    : advertenciaVigenciaRunt ? 'bg-amber-500' : 'bg-emerald-600'


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

  // Pendientes: únicamente confirmar el registro formal del aprendiz del CEA.
  // No modificar resultado_verificacion ni marcar consultas ciudadanas aquí.
  function abrirAccionCola(row) {
    if (procesando) return
    if (row.vigencia?.vencido) {
      abrirDetalle(row) // Conserva el flujo de reprocesos y su historial.
      return
    }
    if (mayusculas(row.estado_certificacion) === 'CERTIFICADO') return
    if (mayusculas(row.resultado_verificacion) === 'NO REGISTRADO') {
      setError('El resultado de la matrícula indica NO REGISTRADO en RUNT. No se puede confirmar el registro formal del CEA con ese resultado.')
      return
    }
    setError('')
    setMensaje('')
    setFechaRegistroCola(hoyBogota())
    setAccionCola({
      controlId: row.id,
      consecutivo: row.consecutivo,
      aprendiz: row.aprendiz?.nombre_completo || row.documento,
    })
  }

  async function confirmarAccionCola() {
    if (!accionCola || procesando) return
    if (!fechaRegistroCola || fechaRegistroCola > hoyBogota()) {
      setAccionCola(null)
      setError('Indique una fecha de registro RUNT válida y no futura.')
      return
    }
    const accion = accionCola
    setProcesando(true)
    setError('')
    setMensaje('')
    try {
      const json = await ejecutarAccion({
        accion: 'registrar_runt',
        control_runt_id: accion.controlId,
        fecha_registro: fechaRegistroCola,
      })
      setAccionCola(null)
      setMensaje(json?.message || 'Registro formal del aprendiz del CEA en RUNT confirmado.')
      await consultar({ silencioso: true })
    } catch (err) {
      setAccionCola(null)
      setError(err.message || 'No fue posible confirmar el registro.')
    } finally {
      setProcesando(false)
    }
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
  // REGISTRAR RUNT
  // ==========================================================

  async function registrarRunt() {
    if (
      !controlActual?.id
    ) {
      return
    }

    if (!fechaInscripcionRunt) {
      setError('Debe indicar la fecha real de inscripción en RUNT.')
      return
    }
    if (fechaInscripcionRunt !== hoyBogota() && soporteInscripcionRunt.trim().length < 8) {
      setError('Indique el soporte de la fecha histórica de inscripción RUNT.')
      return
    }
    if (!confirmarRegistroOpen) { setConfirmarRegistroOpen(true); return }
    setConfirmarRegistroOpen(false)
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
          fecha_registro: fechaInscripcionRunt,
          observaciones: soporteInscripcionRunt,
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

  async function registrarCargue(event, confirmado = false) {
    event?.preventDefault?.()

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

    if (!confirmado) {
      setConfirmarCargueOpen(true)
      return
    }
    setConfirmarCargueOpen(false)

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

  async function certificar(confirmado = false) {
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

    if (!sicovCertificado) {
      setError('Debe constar SICOV certificado para esta matrícula y categoría.')
      return
    }
    if (!confirmado) {
      setConfirmarCertificacionOpen(true)
      return
    }
    setConfirmarCertificacionOpen(false)

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

    const soporteVerificacion = window.prompt(
      'Antes de reiniciar, verifique en RUNT que este proceso NO fue certificado. Indique el soporte o la observación de la consulta:'
    )
    if (soporteVerificacion === null) return
    if (soporteVerificacion.trim().length < 8) {
      setError('Debe documentar la comprobación en RUNT con al menos ocho caracteres.')
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
          confirma_no_certificado: true,
          soporte_verificacion: soporteVerificacion.trim(),

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

        <EncabezadoModulo
          titulo="Control RUNT"
          subtitulo="Controle inscripción, registro, vigencia, cargue de clases y certificación de aprendices en RUNT."
          icono={Route}
          rutaRegreso="/admin"
          textoRegreso="Menú Administrativo"
        />

        <ModalResultado
          abierto={!drawerOpen && Boolean(error || mensaje)}
          tipo={error ? 'error' : 'exito'}
          mensaje={error || mensaje}
          textoBoton="ACEPTAR"
          onCerrar={() => {
            setError('')
            setMensaje('')
          }}
        />
        {typeof document !== 'undefined' && createPortal(
          <>
            <ModalResultado
              abierto={confirmarRegistroOpen} tipo="confirmacion"
              titulo="Confirmar registro formal RUNT"
              mensaje={`¿Confirma que el ciudadano fue registrado como aprendiz del CEA ${user?.nombreEmpresa || user?.nombre_empresa || 'correspondiente'} en RUNT con fecha ${formatearFecha(fechaInscripcionRunt)}? Esta fecha inicia los 90 días de vigencia.`}
              textoBoton="CONFIRMAR REGISTRO" textoCancelar="CANCELAR"
              onCerrar={()=>setConfirmarRegistroOpen(false)}
              onConfirmar={()=>registrarRunt()}
            />
            <ModalResultado
              abierto={confirmarCargueOpen}
              tipo="confirmacion"
              titulo="Confirmar cargue de clases en RUNT"
              mensaje={`¿Confirma el cargue de ${cargue.cantidad_clases} clase(s) de ${cargue.tipo_clase} del ${formatearFecha(cargue.fecha_clase)} con el instructor ${instructorSeleccionado?.nombre_completo || 'seleccionado'} para la matrícula ${controlActual?.consecutivo || ''}?`}
              textoBoton="CONFIRMAR CARGUE" textoCancelar="CANCELAR"
              onCerrar={() => { if (!procesando) setConfirmarCargueOpen(false) }}
              onConfirmar={() => registrarCargue({ preventDefault: () => {} }, true)}
            />
            <ModalResultado
              abierto={confirmarCertificacionOpen}
              tipo="confirmacion"
              titulo="Confirmar certificación RUNT"
              mensaje="¿Confirma que esta matrícula tiene todos los cargues requeridos y que SICOV ya está certificado? Esta acción marcará el proceso como CERTIFICADO en RUNT."
              textoBoton="CONFIRMAR CERTIFICACIÓN" textoCancelar="CANCELAR"
              onCerrar={() => { if (!procesando) setConfirmarCertificacionOpen(false) }}
              onConfirmar={() => certificar(true)}
            />
            <ModalResultado
              abierto={Boolean(accionCola)}
              tipo="confirmacion"
              titulo="Confirmar registro en RUNT"
              mensaje={
                <div className="space-y-3 text-left">
                  <p className="text-center text-xs">
                    ¿Confirma que el ciudadano fue registrado como aprendiz del
                    {' '}<strong>CEA {user?.nombreEmpresa || user?.nombre_empresa || 'correspondiente'}</strong>{' '}
                    en la plataforma RUNT?
                  </p>
                  <p className="text-center text-xs">
                    Esta operación iniciará la vigencia de 90 días desde la fecha indicada.
                  </p>
                  <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                    <p className="text-[11px] font-semibold">
                      {accionCola?.aprendiz} · Matrícula {accionCola?.consecutivo}
                    </p>
                    <label className="block text-[11px] font-semibold">
                      Fecha del registro en RUNT
                      <input type="date" max={hoyBogota()} value={fechaRegistroCola}
                        onChange={e => setFechaRegistroCola(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-xs" />
                    </label>
                  </div>
                </div>
              }
              textoBoton={procesando ? 'GUARDANDO...' : 'CONFIRMAR REGISTRO'}
              textoCancelar="CANCELAR"
              onCerrar={()=>{ if (!procesando) setAccionCola(null) }}
              onConfirmar={confirmarAccionCola}
            />
          </>,
          document.body
        )}


        <div className="mt-4 mb-3 grid grid-cols-1 gap-2 md:grid-cols-[minmax(180px,2fr)_minmax(95px,1fr)_minmax(170px,1.5fr)_minmax(120px,1fr)_minmax(120px,1fr)_auto] md:items-center">
          <input type="text" name="q" aria-label="Buscar matrícula o documento" value={filtros.q}
            onChange={cambiarFiltro} placeholder="Matrícula o documento..."
            className="h-10 min-w-0 w-full rounded-lg border border-slate-300 px-3 text-xs" />
          <select name="categoria" aria-label="Categoría" value={filtros.categoria} onChange={cambiarFiltro}
            className="h-10 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs">
            <option value="">Categorías</option>
            {categoriasCea.map(cat=><option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select name="estado_gestion" aria-label="Estado de gestión" value={filtros.estado_gestion} onChange={cambiarFiltro}
            className="h-10 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs">
            <option value="">{pestana==='pendientes'?'Todos pendientes y vencidos':'Todos registrados'}</option>
            {pestana==='pendientes'?<>
              <option value="no_registrado">No registrado</option>
              <option value="vencido">Vencido</option>
            </>:<>
              <option value="en_proceso">En proceso</option>
              <option value="por_vencer">Por vencer</option>
              <option value="certificado">Certificado</option>
            </>}
          </select>
          <input type="date" name="fecha_inicio" title="Fecha inicial de matrícula" aria-label="Fecha inicial"
            value={filtros.fecha_inicio} onChange={cambiarFiltro}
            className="h-10 min-w-0 w-full rounded-lg border border-slate-300 px-2 text-xs" />
          <input type="date" name="fecha_fin" title="Fecha final de matrícula" aria-label="Fecha final"
            min={filtros.fecha_inicio||undefined} value={filtros.fecha_fin} onChange={cambiarFiltro}
            className="h-10 min-w-0 w-full rounded-lg border border-slate-300 px-2 text-xs" />
          <BotonAccion tipo="limpiar" type="button" onClick={limpiarFiltros}
            className="h-10 whitespace-nowrap rounded-lg px-3 text-xs">
            <i className="fas fa-eraser mr-2" aria-hidden="true"></i>Limpiar
          </BotonAccion>
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

          <div className="flex flex-wrap items-end justify-between gap-2 px-3 pt-2"
            style={{backgroundColor:ESTILO_SECCIONES.fondo,color:ESTILO_SECCIONES.texto}}>
            <div role="tablist" aria-label="Fases de Control RUNT" className="flex flex-wrap items-end gap-1">
              {[{id:'pendientes',label:'Pendientes y vencidos'},{id:'registrados',label:'Registrados RUNT'}].map(tab=>(
                <button key={tab.id} type="button" role="tab" aria-selected={pestana===tab.id}
                  onClick={()=>cambiarPestana(tab.id)}
                  className={`rounded-t-lg border-t-2 px-4 py-2 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${pestana===tab.id?'border-emerald-300 bg-white text-[#194567]':'border-transparent bg-[#194567] text-white hover:bg-[#326F98]'}`}>{tab.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 pb-2 text-xs">
              <span>{totalRegistros.toLocaleString('es-CO')} registros · Página {paginaRunt} de {Math.max(1, Math.ceil(totalRegistros / porPagina))}</span>
              <select aria-label="Registros por página" value={porPagina} onChange={e=>{setPaginaRunt(1);setPorPagina(Number(e.target.value))}}
                className="rounded border border-white/30 bg-[#194567] px-1 py-1 text-white">
                <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
              </select>
              <button type="button" disabled={paginaRunt===1} onClick={()=>setPaginaRunt(n=>Math.max(1,n-1))}
                className="rounded border border-white/40 px-2 py-1 disabled:opacity-40 hover:bg-white/20">Anterior</button>
              <button type="button" disabled={!hayMasRunt} onClick={()=>setPaginaRunt(n=>n+1)}
                className="rounded border border-white/40 px-2 py-1 disabled:opacity-40 hover:bg-white/20">Siguiente</button>
            </div>
          </div>

          <div className="max-h-[65vh] overflow-auto">

            <table className="w-full text-[11px] border-collapse">

              <thead style={{backgroundColor:ESTILO_ENCABEZADO_TABLA.fondo,color:ESTILO_ENCABEZADO_TABLA.texto}} className="sticky top-0 z-10 text-[10px] font-extrabold uppercase">

                <tr>
                  {(pestana === 'pendientes'
                    ? ['MATRÍCULA','FECHA MATRÍCULA','APRENDIZ','DOCUMENTO','CATEGORÍA','RESULTADO RUNT','ORIGEN','ACCIÓN']
                    : ['MATRÍCULA','FECHA MATRÍCULA','APRENDIZ','DOCUMENTO','CATEGORÍA','ORIGEN','VIGENCIA','TEORÍA','TALLER','PRÁCTICA','CERTIFICACIÓN','ACCIÓN']
                  ).map(titulo => (
                    <th key={titulo} className="border p-2 bg-[#CEFAFE] text-[#263746]"
                      style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                      {titulo}
                    </th>
                  ))}
                </tr>

              </thead>

              <tbody>

                {loading ? (
                  <tr>

                    <td
                      colSpan={pestana === "pendientes" ? 8 : 12}
                      className="p-8 text-center text-gray-500"
                     style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                      Consultando...
                    </td>

                  </tr>
                ) : controles.length ===
                  0 ? (
                  <tr>

                    <td
                      colSpan={pestana === "pendientes" ? 8 : 12}
                      className="p-8 text-center text-gray-500"
                     style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                      {consultado
                        ? 'No se encontraron procesos RUNT con los filtros seleccionados.'
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

                          <td className="p-2 border text-center font-semibold" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                            {row.consecutivo ||
                              '-'}
                          </td>

                          <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde}}>
                            {formatearFecha(row.aprendiz?.fecha_matricula)}
                          </td>

                          <td className="p-2 border" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>

                            <div className="font-semibold">
                              {row.aprendiz
                                ?.nombre_completo ||
                                '-'}
                            </div>
                            {pestana === 'registrados' && Number(row.numero_proceso || 1) > 1 && (
                              <div className="mt-1 text-[10px] font-semibold text-blue-700">
                                Proceso #{row.numero_proceso}
                              </div>
                            )}



                          </td>

                          <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde}}>
                            <span className="font-semibold">{row.aprendiz?.tipo_doc || '-'}</span>
                            {' '}{formatearDocumento(row.documento)}
                          </td>

                          <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>

                            <Badge tipo="blue">
                              {row.categoria ||
                                '-'}
                            </Badge>

                          </td>



                          {pestana === 'pendientes' && (
                            <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde}}>
                              {mayusculas(row.resultado_verificacion) === 'REGISTRADO' ? (
                                <Badge tipo="green">REGISTRADO</Badge>
                              ) : mayusculas(row.resultado_verificacion) === 'NO REGISTRADO' ? (
                                <Badge tipo="red">NO REGISTRADO</Badge>
                              ) : (
                                <Badge tipo="yellow">SIN VERIFICAR</Badge>
                              )}
                              {row.vigencia?.vencido && (
                                <div className="mt-1"><Badge tipo="red">VENCIDO</Badge></div>
                              )}
                            </td>
                          )}

                          <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde}}>
                            <div className="font-semibold">{row.aprendiz?.nombre_origen || '-'}</div>
                            <div className="text-[10px] text-slate-500">{row.aprendiz?.tipo_origen || '-'}</div>
                          </td>

                          {pestana === 'registrados' && (
                          <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>

                            {row.historico_certificado ? <Badge tipo="purple">Certificado histórico</Badge> : <BadgeVigencia
                              vigencia={
                                row.vigencia
                              }
                            />}

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
                          )}

                          {pestana === 'registrados' && (
                          <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                            {numero(
                              av.teoria_cargadas
                            )}
                            {' / '}
                            {numero(
                              av.teoria_requeridas
                            )}
                          </td>
                          )}

                          {pestana === 'registrados' && (
                          <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                            {numero(
                              av.taller_cargadas
                            )}
                            {' / '}
                            {numero(
                              av.taller_requeridas
                            )}
                          </td>
                          )}

                          {pestana === 'registrados' && (
                          <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                            {numero(
                              av.practica_cargadas
                            )}
                            {' / '}
                            {numero(
                              av.practica_requeridas
                            )}
                          </td>
                          )}

                          {pestana === 'registrados' && (
                          <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>

                            {mayusculas(
                              row.estado_certificacion
                            ) ===
                            'CERTIFICADO' ? (
                              <div className="flex flex-col items-center gap-1">
                                <Badge tipo="purple">
                                  Certificado
                                </Badge>
                                {row.fecha_certificacion && (
                                  <span className="text-[10px] text-slate-600">
                                    {formatearFecha(row.fecha_certificacion)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Badge tipo="gray">
                                {texto(row.observaciones).includes('CONTROL ADMINISTRATIVO CREADO EN CONCILIACION HISTORICA')
                                  ? 'Por verificar' : 'Pendiente'}
                              </Badge>
                            )}

                          </td>
                          )}

                          <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>

                            <BotonAccion tipo="verDetalle"
                              type="button"
                              disabled={procesando || (pestana === 'pendientes' && !row.vigencia?.vencido && mayusculas(row.resultado_verificacion) === 'NO REGISTRADO')}
                              title={pestana === 'pendientes' && mayusculas(row.resultado_verificacion) === 'NO REGISTRADO' ? 'Resultado ciudadano NO REGISTRADO: no procede el registro formal del CEA' : undefined}
                              onClick={() => pestana === 'pendientes' ? abrirAccionCola(row) : abrirDetalle(row)}
                              className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-3 py-1.5 rounded text-[11px] disabled:opacity-50"
                            >
                              <i className={`fas ${pestana === 'pendientes' ? (row.vigencia?.vencido ? 'fa-rotate' : 'fa-user-check') : 'fa-eye'} mr-1`}></i>
                              {pestana === 'pendientes'
                                ? (row.vigencia?.vencido ? 'Reproceso' : 'Confirmar registro')
                                : 'Gestionar'}
                            </BotonAccion>

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

              <BotonAccion tipo="cancelar"
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
              </BotonAccion>

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
                        
                        
                        px-3
                        py-2
                        text-xs
                        font-semibold
                      " style={{backgroundColor:ESTILO_SECCIONES_SECUNDARIAS.fondo,color:ESTILO_SECCIONES_SECUNDARIAS.texto,borderRadius:ESTILO_SECCIONES_SECUNDARIAS.radioSuperior}}>
                      Vigencia del Proceso RUNT Actual
                    </div>

                    <div className="p-3">

                      <div className="grid grid-cols-1 items-center gap-4 text-xs md:grid-cols-[minmax(105px,0.8fr)_minmax(105px,0.8fr)_minmax(0,3fr)]">
                        <div>
                          <span className="text-gray-500">Registro</span>
                          <div className="font-semibold">
                            {formatearFecha(vigenciaActual?.fecha_registro)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Fecha límite</span>
                          <div className="font-semibold">
                            {formatearFecha(vigenciaActual?.fecha_limite)}
                          </div>
                        </div>
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                            <span className="font-semibold text-slate-700">Tiempo transcurrido</span>
                            {vigenciaConPlazo ? (
                              <span className={`font-bold ${riesgoVigenciaRunt ? 'text-red-700' : advertenciaVigenciaRunt ? 'text-amber-800' : 'text-emerald-700'}`}>
                                {diasTranscurridosRunt} de 90 días
                                <span className="ml-1 font-normal text-slate-600">
                                  {vencido ? '· Plazo vencido' : `· ${Math.max(0, diasRestantesRunt)} restantes`}
                                </span>
                              </span>
                            ) : (
                              <BadgeVigencia vigencia={vigenciaActual} />
                            )}
                          </div>
                          {vigenciaConPlazo ? (
                            <div role="progressbar" aria-label="Tiempo transcurrido de la vigencia RUNT"
                              aria-valuemin={0} aria-valuemax={90}
                              aria-valuenow={diasTranscurridosRunt}
                              className="h-5 w-full overflow-hidden rounded-full bg-slate-200">
                              <div className={`h-full rounded-full transition-all duration-300 ${colorProgresoRunt}`}
                                style={{ width: `${porcentajeVigenciaRunt}%` }} />
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500">
                              {certificado ? 'Proceso certificado. Seguimiento de vigencia finalizado.' : 'Sin plazo de vigencia disponible.'}
                            </p>
                          )}
                        </div>
                      </div>

                      {alertaTeoriaTardia && (
                        <div className="mt-3 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
                          <i className="fas fa-exclamation-triangle mr-2" aria-hidden="true"></i>
                          <strong>Riesgo de cumplimiento:</strong> han transcurrido {diasTranscurridosRunt} días
                          y aún no hay clases de teoría cargadas en RUNT.
                          Quedan {Math.max(0, diasRestantesRunt)} días de vigencia.
                        </div>
                      )}
                      {alertaPracticaLimite && (
                        <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${practicaSinMargen ? 'border-red-400 bg-red-50 text-red-900' : 'border-amber-400 bg-amber-50 text-amber-900'}`} role="status">
                          <i className="fas fa-exclamation-triangle mr-2" aria-hidden="true"></i>
                          <strong>{practicaSinMargen ? 'Tiempo insuficiente para práctica:' : 'Último margen para práctica:'}</strong>
                          {' '}faltan {clasesPracticaPendientes} clases de práctica;
                          se necesitan al menos {diasMinimosPractica} día(s) de cargue,
                          considerando máximo {limitePracticaDiaria} por día.
                          {' '}Restan {Math.max(0, diasRestantesRunt)} día(s) de vigencia.
                          {!practicaHabilitadaUI && ' Además debe completar teoría y taller antes de habilitar práctica.'}
                        </div>
                      )}

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
                            El registro superó los 90 días según la fecha anotada y no tiene certificación registrada en DATA-CEA. Antes de reiniciar, verifique el estado real en RUNT; podría estar certificado y pendiente de actualizar aquí.
                          </p>

                          <BotonAccion tipo="secundario"
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
                          </BotonAccion>

                        </div>
                      )}

                    </div>

                  </div>
                )}

                                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                  <div className="mb-2 text-xs font-bold text-slate-700">Avance de clases en RUNT</div>
                  <div
                    className="
                      grid
                      grid-cols-2 sm:grid-cols-4
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
                  {certificado && cargues.length === 0 && (
                    <p className="mt-2 text-[11px] text-slate-600">
                      Certificado histórico sin cargues detallados en DATA-CEA.
                      Esto no indica que no se hayan cursado las clases.
                    </p>
                  )}
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
                          
                          
                          px-3
                          py-2
                          text-xs
                          font-semibold
                        " style={{backgroundColor:ESTILO_SECCIONES_SECUNDARIAS.fondo,color:ESTILO_SECCIONES_SECUNDARIAS.texto,borderRadius:ESTILO_SECCIONES_SECUNDARIAS.radioSuperior}}>
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

                            <div role="group" aria-label="Tipo de clase" className="flex flex-wrap gap-1">
                              {TIPOS_CLASE.map(item => {
                                const noAplica = item.value === 'TALLER' && tallerRequeridas === 0
                                const bloqueada = item.value === 'PRACTICA' && !practicaHabilitadaUI
                                const activo = cargue.tipo_clase === item.value
                                return (
                                  <button key={item.value} type="button"
                                    disabled={noAplica || bloqueada}
                                    aria-pressed={activo}
                                    onClick={() => cambiarCargue({ target: { name: 'tipo_clase', value: item.value } })}
                                    className={`rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${activo ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-blue-50'}`}>
                                    {item.label}
                                    {noAplica ? ' · No aplica' : bloqueada ? ' · Bloqueada' : ''}
                                  </button>
                                )
                              })}
                            </div>

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

                        <BotonAccion tipo="guardar"
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
                        </BotonAccion>

                      </form>

                    </div>
                  )}

                                <details className="group overflow-hidden rounded-lg border border-slate-300 bg-white">
                  <summary className="cursor-pointer list-none bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200">
                    <i className="fas fa-chevron-right mr-2 transition-transform group-open:rotate-90"></i>Historial de cargues
                  </summary>
                  <div className="space-y-4 p-3">
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
                      
                      
                      px-3
                      py-2
                      text-xs
                      font-semibold
                    " style={{backgroundColor:ESTILO_SECCIONES_SECUNDARIAS.fondo,color:ESTILO_SECCIONES_SECUNDARIAS.texto,borderRadius:ESTILO_SECCIONES_SECUNDARIAS.radioSuperior}}>
                    Historial de Cargues — Proceso Actual
                  </div>



                  <div className="overflow-x-auto">

                    <table className="w-full text-[11px] border-collapse">

                      <thead style={{backgroundColor:ESTILO_ENCABEZADO_TABLA.fondo,color:ESTILO_ENCABEZADO_TABLA.texto}} className="text-[10px] font-extrabold uppercase">

                        <tr>

                          <th className="p-2 border" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                            Fecha
                          </th>

                          <th className="p-2 border" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                            Tipo
                          </th>

                          <th className="p-2 border" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                            Cant.
                          </th>

                          <th className="p-2 border" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                            Instructor
                          </th>

                          <th className="p-2 border" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                            Horas
                          </th>

                          <th className="p-2 border" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
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

                                <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                                  {formatearFecha(
                                    item.fecha_clase
                                  )}
                                </td>

                                <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>

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

                                <td className="p-2 border text-center font-semibold" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                                  {numero(
                                    item.cantidad_clases
                                  )}
                                </td>

                                <td className="p-2 border" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                                  {item.instructor_nombre ||
                                    '-'}
                                </td>

                                <td className="p-2 border text-center" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                                  {numero(
                                    item.horas_consumidas
                                  )}
                                </td>

                                <td className="p-2 border" style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
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
                             style={{borderColor:ESTILO_CELDAS_TABLA.borde,borderWidth:ESTILO_CELDAS_TABLA.grosorBorde}}>
                              No hay cargues registrados en este proceso.
                            </td>

                          </tr>
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>

                                  </div>
                </details>
                <details className="group overflow-hidden rounded-lg border border-slate-300 bg-white">
                  <summary className="cursor-pointer list-none bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200">
                    <i className="fas fa-chevron-right mr-2 transition-transform group-open:rotate-90"></i>Historial y expediente
                  </summary>
                  <div className="space-y-4 p-3">
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
                      
                      
                      px-3
                      py-2
                      text-xs
                      font-semibold
                      flex
                      items-center
                      justify-between
                      gap-2
                    " style={{backgroundColor:ESTILO_SECCIONES_SECUNDARIAS.fondo,color:ESTILO_SECCIONES_SECUNDARIAS.texto,borderRadius:ESTILO_SECCIONES_SECUNDARIAS.radioSuperior}}>

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

                                <BotonAccion tipo="verDetalle"
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

                                </BotonAccion>

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
                      
                      
                      px-3
                      py-2
                      text-xs
                      font-semibold
                    " style={{backgroundColor:ESTILO_SECCIONES_SECUNDARIAS.fondo,color:ESTILO_SECCIONES_SECUNDARIAS.texto,borderRadius:ESTILO_SECCIONES_SECUNDARIAS.radioSuperior}}>
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
                      
                      
                      px-3
                      py-2
                      text-xs
                      font-semibold
                    " style={{backgroundColor:ESTILO_SECCIONES_SECUNDARIAS.fondo,color:ESTILO_SECCIONES_SECUNDARIAS.texto,borderRadius:ESTILO_SECCIONES_SECUNDARIAS.radioSuperior}}>
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
                              REGISTRADO
                            </Badge>
                          ) : noInscrito ? (
                            <Badge tipo="red">
                              NO REGISTRADO
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
                      
                      
                      px-3
                      py-2
                      text-xs
                      font-semibold
                    " style={{backgroundColor:ESTILO_SECCIONES_SECUNDARIAS.fondo,color:ESTILO_SECCIONES_SECUNDARIAS.texto,borderRadius:ESTILO_SECCIONES_SECUNDARIAS.radioSuperior}}>
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
                    ) : noInscrito ? (
                      <div className="text-xs text-amber-700">
                        La matrícula tiene resultado ciudadano NO REGISTRADO. No se puede confirmar el registro formal del CEA mientras exista ese resultado.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold block">
                          Fecha real de inscripción del aprendiz en RUNT
                          <input type="date" max={hoyBogota()}
                            className="block w-full border border-slate-300 rounded p-2 mt-1"
                            value={fechaInscripcionRunt}
                            onChange={e => setFechaInscripcionRunt(e.target.value)}/>
                        </label>
                        <label className="text-[11px] font-semibold block">
                          Observaciones del registro formal RUNT
                          <textarea rows={2}
                            className="block w-full border border-slate-300 rounded p-2 mt-1"
                            placeholder="Obligatorio cuando la fecha de RUNT es anterior a hoy"
                            value={soporteInscripcionRunt}
                            onChange={e => setSoporteInscripcionRunt(e.target.value)}/>
                        </label>
                        <p className="text-[10px] text-amber-800">
                          Los 90 días se calculan desde esta fecha, no desde la matrícula del CEA.
                          No confirme una fecha que no esté verificada en RUNT.
                        </p>
                      <BotonAccion tipo="guardar"
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
                      </BotonAccion>
                      </div>
                    )}

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
                        
                        
                        px-3
                        py-2
                        text-xs
                        font-semibold
                      " style={{backgroundColor:ESTILO_SECCIONES_SECUNDARIAS.fondo,color:ESTILO_SECCIONES_SECUNDARIAS.texto,borderRadius:ESTILO_SECCIONES_SECUNDARIAS.radioSuperior}}>
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

                                  </div>
                </details>
                <details className="group overflow-hidden rounded-lg border border-slate-300 bg-white">
                  <summary className="cursor-pointer list-none bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200">
                    <i className="fas fa-chevron-right mr-2 transition-transform group-open:rotate-90"></i>Certificación RUNT
                  </summary>
                  <div className="space-y-4 p-3">
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
                      
                      
                      px-3
                      py-2
                      text-xs
                      font-semibold
                    " style={{backgroundColor:ESTILO_SECCIONES_SECUNDARIAS.fondo,color:ESTILO_SECCIONES_SECUNDARIAS.texto,borderRadius:ESTILO_SECCIONES_SECUNDARIAS.radioSuperior}}>
                    Certificación RUNT
                  </div>

                  <div className="p-3">

                    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-[11px]">
                      <div className={`rounded-lg border p-2 ${procesoCompleto ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                        <i className={`fas ${procesoCompleto ? 'fa-check-circle' : 'fa-clock'} mr-1`}></i>
                        Cargues: {procesoCompleto ? 'Completos' : 'Pendientes'}
                      </div>
                      <div className={`rounded-lg border p-2 ${sicovCertificado ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                        <i className={`fas ${sicovCertificado ? 'fa-check-circle' : 'fa-clock'} mr-1`}></i>
                        SICOV: {sicovCertificado ? 'Certificado' : 'Pendiente de certificación'}
                      </div>
                    </div>
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
                    ) : !sicovCertificado ? (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                        Primero debe figurar CERTIFICADO en SICOV para esta matrícula y categoría.
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
                      <BotonAccion tipo="guardar"
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
                      </BotonAccion>
                    )}

                  </div>

                </div>

                  </div>
                </details>
                <div className="flex justify-end">

                  <BotonAccion tipo="cancelar"
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
                  </BotonAccion>

                </div>

              </div>
            ) : null}

          </div>

        </div>
      )}

    </div>
  )
}