// app/admin/caja/egresos/page.jsx

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

import RegistrarEgresoDrawer
  from './components/RegistrarEgresoDrawer'

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'

import { ReceiptText, RefreshCw } from 'lucide-react'

import {
  BotonActualizar,
  BotonAgregar,
  BotonLimpiar,
  BotonVerDetalle,
  BotonImprimir,
  ESTILO_CONTENEDORES,
  ESTILO_ENCABEZADO_TABLA,
  ESTILO_SECCIONES,
  ESTILO_SECCIONES_SECUNDARIAS,
  ESTILO_TARJETAS,
  MarcoTabla,
} from '@/components/admin/EstiloModulo'

import {
  imprimirCuentaCobro,
} from './components/imprimirCuentaCobro'

// =========================================================
// CONSTANTES
// =========================================================

const API_URL =
  '/api/admin/caja/egresos'

const API_CATALOGOS =
  '/api/admin/caja/egresos/catalogos'

const ESTADOS = [
  '',
  'ACTIVO',
  'ANULADO',
]

// =========================================================
// HELPERS
// =========================================================

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

function hoyColombia() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'America/Bogota',

      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',
    }
  ).format(
    new Date()
  )
}

function formatearMoneda(
  valor
) {
  return new Intl.NumberFormat(
    'es-CO',
    {
      style:
        'currency',

      currency:
        'COP',

      minimumFractionDigits:
        0,

      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      valor ||
      0
    )
  )
}

function formatearFecha(
  fecha
) {
  if (
    !fecha
  ) {
    return '-'
  }

  try {
    return new Intl.DateTimeFormat(
      'es-CO',
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
      new Date(
        `${fecha}T12:00:00`
      )
    )
  } catch {
    return fecha
  }
}

function descripcionVehiculo(
  egreso
) {
  const placa =
    egreso?.placa ||
    egreso?.vehiculo?.placa ||
    ''

  if (
    !placa
  ) {
    return '-'
  }

  return mayusculas(
    placa
  )
}

// =========================================================
// FETCH SEGURO
// =========================================================

async function fetchJsonSeguro(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      {
        cache:
          'no-store',

        ...options,
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
// BADGE
// =========================================================

function BadgeEstado({
  estado,
}) {
  const valor =
    mayusculas(
      estado
    )

  const clases =
    valor ===
    'ANULADO'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2.5
        py-1
        text-[9px]
        font-bold
        ${clases}
      `}
    >
      {valor ||
        '-'}
    </span>
  )
}

// =========================================================
// TARJETA RESUMEN
// =========================================================

function TarjetaResumen({
  titulo,
  valor,
  subtitulo,
  icono,
}) {
  return (
    <div
      className="flex min-h-[82px] items-center justify-between gap-3 px-3 py-2.5"
      style={{
        backgroundColor: ESTILO_TARJETAS.fondo,
        border: '1px solid #B8C6D1',
        borderRadius: `${ESTILO_TARJETAS.radio}px`,
        boxShadow: '0 2px 7px rgba(15, 23, 42, 0.09)',
      }}
    >
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">
          {titulo}
        </p>
        <p className="mt-0.5 text-lg font-black text-gray-900">
          {valor}
        </p>
        {subtitulo && (
          <p className="mt-0.5 text-[9px] text-gray-500">
            {subtitulo}
          </p>
        )}
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        <i className={icono}></i>
      </div>
    </div>
  )
}

// =========================================================
// PÁGINA
// =========================================================

export default function CajaEgresosPage() {
  const router =
    useRouter()

  // =======================================================
  // SESIÓN
  // =======================================================

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
        useState('')

        const [
        empresaNombre,
        setEmpresaNombre,
        ] =
        useState('')

        const [
        empresaDatos,
        setEmpresaDatos,
        ] =
        useState({
            nombre: '',
            razon_social: '',
            nit: '',
            direccion: '',
            ciudad: '',
            departamento: '',
            telefono: '',
            email: '',
            representante_legal: '',
            documento_representante: '',
        })

        const [
        sesionLista,
        setSesionLista,
        ] =
        useState(
            false
        )
  // =======================================================
  // CATÁLOGOS
  // =======================================================

  const [
    conceptos,
    setConceptos,
  ] =
    useState([])

  const [
    mediosPago,
    setMediosPago,
  ] =
    useState([])

  const [
    personal,
    setPersonal,
  ] =
    useState([])

  const [
    vehiculos,
    setVehiculos,
  ] =
    useState([])

  // =======================================================
  // EGRESOS
  // =======================================================

  const [
    egresos,
    setEgresos,
  ] =
    useState([])

  const [
    resumenDia,
    setResumenDia,
  ] =
    useState({
      total_egresos:
        0,

      total_efectivo:
        0,

      total_otros_medios:
        0,

      cantidad_egresos:
        0,

      cantidad_anulados:
        0,
    })

  // =======================================================
  // FILTROS
  // =======================================================

  const [
    busqueda,
    setBusqueda,
  ] =
    useState('')

  const [
    fechaInicio,
    setFechaInicio,
  ] =
    useState(
      hoyColombia()
    )

  const [
    fechaFin,
    setFechaFin,
  ] =
    useState(
      hoyColombia()
    )

  const [
    conceptoFiltro,
    setConceptoFiltro,
  ] =
    useState('')

  const [
    estadoFiltro,
    setEstadoFiltro,
  ] =
    useState('')

  // =======================================================
  // DRAWERS
  // =======================================================

  const [
    drawerEgreso,
    setDrawerEgreso,
  ] =
    useState(
      false
    )

  const [
    drawerDetalle,
    setDrawerDetalle,
  ] =
    useState(
      false
    )

  const [
    detalleEgreso,
    setDetalleEgreso,
  ] =
    useState(
      null
    )

  // =======================================================
  // UI
  // =======================================================

  const [
    cargando,
    setCargando,
  ] =
    useState(
      false
    )

  const [
    cargandoDetalle,
    setCargandoDetalle,
  ] =
    useState(
      false
    )

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
  // SESIÓN
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
            'No se encontró el NIT del CEA.'
          )

          setSesionLista(
            true
          )

          return
        }

        setUser(
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

  // =======================================================
  // USUARIO
  // =======================================================

  const usuarioOperacion =
    useMemo(
      () =>
        obtenerNombreUsuario(
          user
        ),
      [
        user,
      ]
    )

  // =======================================================
  // URL PRINCIPAL
  // =======================================================

  const construirUrl =
    useCallback(
      (
        recurso,
        extras = {}
      ) => {
        const params =
          new URLSearchParams()

        params.set(
          'recurso',
          recurso
        )

        params.set(
          'nit',
          nit
        )

        Object.entries(
          extras
        ).forEach(
          ([
            key,
            value,
          ]) => {
            if (
              value !==
                null &&
              value !==
                undefined &&
              texto(
                value
              )
            ) {
              params.set(
                key,
                String(
                  value
                )
              )
            }
          }
        )

        return `${API_URL}?${params.toString()}`
      },
      [
        nit,
      ]
    )

  // =======================================================
  // POST EGRESO
  // =======================================================

  const postEgreso =
    useCallback(
      async (
        payload
      ) => {
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

                pagado_por:
                  usuarioOperacion,
              }),
          }
        )
      },
      [
        nit,
        usuarioOperacion,
      ]
    )

  // =======================================================
  // POST CATÁLOGOS
  // =======================================================

  const postCatalogos =
    useCallback(
      async (
        payload
      ) => {
        return fetchJsonSeguro(
          API_CATALOGOS,
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
      },
      [
        nit,
        usuarioOperacion,
      ]
    )

  // =======================================================
  // CARGAR CATÁLOGOS
  // =======================================================

  const cargarCatalogos =
    useCallback(
      async () => {
        if (
          !nit
        ) {
          return
        }

        const params =
          new URLSearchParams()

        params.set(
          'nit',
          nit
        )

        const data =
          await fetchJsonSeguro(
            `${API_CATALOGOS}?${params.toString()}`
          )

        const nuevosConceptos =
          Array.isArray(
            data?.data?.conceptos
          )
            ? data.data.conceptos
            : []

        const nuevosMedios =
          Array.isArray(
            data?.data?.mediosPago
          )
            ? data.data.mediosPago
            : (
                Array.isArray(
                  data?.data?.medios_pago
                )
                  ? data.data.medios_pago
                  : []
              )

        const nuevoPersonal =
          Array.isArray(
            data?.data?.personal
          )
            ? data.data.personal
            : []

        const nuevosVehiculos =
          Array.isArray(
            data?.data?.vehiculos
          )
            ? data.data.vehiculos
            : []

        setConceptos(
          nuevosConceptos
        )

        setMediosPago(
          nuevosMedios
        )

        setPersonal(
          nuevoPersonal
        )

        setVehiculos(
          nuevosVehiculos
        )

        if (
        data?.empresa
        ) {
        setEmpresaDatos(
            actual => ({
            ...actual,
            ...data.empresa,
            })
        )

        if (
            data
            .empresa
            .nombre
        ) {
            setEmpresaNombre(
            data
                .empresa
                .nombre
            )
        }
        }  
        },
      [
        nit,
      ]
    )

  // =======================================================
  // CARGAR EGRESOS
  // =======================================================

  const cargarEgresos =
    useCallback(
      async () => {
        if (
          !nit
        ) {
          return
        }

        const termino =
          texto(
            busqueda
          )

        const data =
          await fetchJsonSeguro(
            construirUrl(
              'listar',
              {
                q:
                  termino.length >=
                  3
                    ? termino
                    : '',

                fecha_inicio:
                  termino.length >= 3
                    ? ''
                    : fechaInicio,

                fecha_fin:
                  termino.length >= 3
                    ? ''
                    : fechaFin,

                concepto_id:
                  conceptoFiltro,

                estado:
                  estadoFiltro,
              }
            )
          )

        setEgresos(
          Array.isArray(
            data?.data
          )
            ? data.data
            : []
        )

        if (
        data?.empresa
        ) {
        setEmpresaDatos(
            actual => ({
            ...actual,
            ...data.empresa,
            })
        )

        if (
            data
            .empresa
            .nombre
        ) {
            setEmpresaNombre(
            data
                .empresa
                .nombre
            )
        }
        }
      },
      [
        nit,
        construirUrl,
        busqueda,
        fechaInicio,
        fechaFin,
        conceptoFiltro,
        estadoFiltro,
      ]
    )

  // =======================================================
  // RESUMEN HOY
  // =======================================================

  const cargarResumen =
    useCallback(
      async () => {
        if (
          !nit
        ) {
          return
        }

        const hoy =
          hoyColombia()

        const data =
          await fetchJsonSeguro(
            construirUrl(
              'resumen',
              {
                fecha_inicio:
                  hoy,

                fecha_fin:
                  hoy,
              }
            )
          )

        setResumenDia(
          data?.data ||
          {}
        )
      },
      [
        nit,
        construirUrl,
      ]
    )

  // =======================================================
  // CARGAR TODO
  // =======================================================

  const cargarTodo =
    useCallback(
      async () => {
        if (
          !nit
        ) {
          return
        }

        setCargando(
          true
        )

        setError('')

        try {
          await Promise.all([
            cargarCatalogos(),
            cargarEgresos(),
            cargarResumen(),
          ])
        } catch (
          errorCarga
        ) {
          console.error(
            'Error cargando egresos:',
            errorCarga
          )

          setError(
            errorCarga?.message ||
            'No fue posible cargar el módulo de egresos.'
          )
        } finally {
          setCargando(
            false
          )
        }
      },
      [
        nit,
        cargarCatalogos,
        cargarEgresos,
        cargarResumen,
      ]
    )

  // =======================================================
  // CARGA INICIAL
  // =======================================================

  useEffect(
    () => {
      if (
        !sesionLista ||
        !nit
      ) {
        return
      }

      cargarTodo()
    },
    [
      sesionLista,
      nit,
    ]
  )

  // =======================================================
  // BÚSQUEDA AUTOMÁTICA
  // =======================================================

  useEffect(
    () => {
      if (
        !nit
      ) {
        return
      }

      const termino =
        texto(
          busqueda
        )

      if (
        termino.length >
          0 &&
        termino.length <
          3
      ) {
        return
      }

      const timer =
        setTimeout(
          () => {
            cargarEgresos()
              .catch(
                errorBusqueda => {
                  setError(
                    errorBusqueda?.message ||
                    'No fue posible realizar la búsqueda.'
                  )
                }
              )
          },
          350
        )

      return () =>
        clearTimeout(
          timer
        )
    },
    [
      busqueda,
    ]
  )

  // =======================================================
  // FILTROS AUTOMÁTICOS
  // =======================================================

  useEffect(
    () => {
      if (
        !nit
      ) {
        return
      }

      cargarEgresos()
        .catch(
          errorFiltro => {
            setError(
              errorFiltro?.message ||
              'No fue posible aplicar los filtros.'
            )
          }
        )
    },
    [
      fechaInicio,
      fechaFin,
      conceptoFiltro,
      estadoFiltro,
    ]
  )

  // =======================================================
  // LIMPIAR FILTROS
  // =======================================================

  function limpiarFiltros() {
    const hoy =
      hoyColombia()

    setBusqueda('')
    setFechaInicio(
      hoy
    )
    setFechaFin(
      hoy
    )
    setConceptoFiltro('')
    setEstadoFiltro('')
  }

  // =======================================================
  // VER DETALLE
  // =======================================================

  async function abrirDetalle(
    egreso
  ) {
    if (
      !egreso?.id
    ) {
      return
    }

    setCargandoDetalle(
      true
    )

    setError('')

    try {
      const data =
        await fetchJsonSeguro(
          construirUrl(
            'detalle',
            {
              id:
                egreso.id,
            }
          )
        )

      setDetalleEgreso(
        data?.data ||
        null
      )

      setDrawerDetalle(
        true
      )
    } catch (
      errorDetalle
    ) {
      console.error(
        'Error cargando detalle:',
        errorDetalle
      )

      setError(
        errorDetalle?.message ||
        'No fue posible consultar el detalle del egreso.'
      )
    } finally {
      setCargandoDetalle(
        false
      )
    }
  }

  // =======================================================
  // DESPUÉS DE REGISTRAR
  // =======================================================

  async function despuesDeRegistrar() {
    await Promise.all([
      cargarEgresos(),
      cargarResumen(),
    ])
  }

  // =======================================================
  // DESPUÉS DE MODIFICAR CONCEPTOS
  // =======================================================

  async function despuesDeActualizarCatalogos() {
    await cargarCatalogos()
  }

  // =======================================================
  // IMPRIMIR CUENTA
  // =======================================================
  //
  // Temporal.
  //
  // No importamos todavía imprimirCuentaCobro.js porque
  // el archivo aún no existe y provocaría un Build Error.
  //
  // En el siguiente paso reemplazaremos esta función por
  // el módulo independiente de impresión.
  //
  // =======================================================

 function imprimirCuentaCobroDesdePagina(
        egreso,
        extras = {}
        ) {
        if (
            !egreso
        ) {
            return
        }

        try {
            imprimirCuentaCobro(
            egreso,
            {
                empresa: {
                nombre:
                    empresaDatos?.nombre ||
                    empresaNombre,

                razon_social:
                    empresaDatos?.razon_social ||
                    '',

                nit:
                    empresaDatos?.nit ||
                    nit,

                direccion:
                    empresaDatos?.direccion ||
                    '',

                ciudad:
                    empresaDatos?.ciudad ||
                    '',
                
                telefono:
                    empresaDatos?.telefono ||
                    '',

                email:
                    empresaDatos?.email ||
                    '',

                representante_legal:
                    empresaDatos?.representante_legal ||
                    '',
                },

                empresaNombre:
                empresaDatos?.nombre ||
                empresaNombre,

                nit:
                empresaDatos?.nit ||
                nit,

                ...extras,
            }
            )
        } catch (
            errorImpresion
        ) {
            console.error(
            'Error imprimiendo cuenta de cobro:',
            errorImpresion
            )

            setError(
            errorImpresion?.message ||
            'No fue posible abrir la cuenta de cobro.'
            )
        }
        }

        // =======================================================
        // CARGANDO SESIÓN
        // =======================================================

        if (
            !sesionLista
        ) {
            return (
            <div
                className="
                min-h-screen
                flex
                items-center
                justify-center
                bg-gray-100
                text-gray-500
                "
            >
                <i className="fas fa-spinner fa-spin mr-2"></i>

                Cargando egresos...
            </div>
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
        className="max-w-7xl mx-auto overflow-hidden"
        style={{
          backgroundColor: ESTILO_CONTENEDORES.fondo,
          border: `${ESTILO_CONTENEDORES.grosorBorde}px solid ${ESTILO_CONTENEDORES.borde}`,
          borderRadius: `${ESTILO_CONTENEDORES.radio}px`,
          boxShadow: ESTILO_CONTENEDORES.sombra,
        }}
      >
        <EncabezadoModulo
          titulo="Registrar Egresos"
          subtitulo="Gastos, pagos a terceros, funcionarios, vehículos y otros desembolsos."
          icono={ReceiptText}
          rutaRegreso="/admin/caja"
          textoRegreso="Volver a Caja"
        />

        <div className="px-4 pb-4 pt-3 md:px-6 md:pb-6">

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
              rounded-xl
              p-3
              mb-4
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
              rounded-xl
              p-3
              mb-4
              text-xs
            "
          >
            <i className="fas fa-check-circle mr-2"></i>

            {mensaje}
          </div>
        )}

        {/* ==================================================
            RESUMEN HOY + ACCIÓN
        ================================================== */}

        <section
          className="mb-4 rounded-xl border bg-white px-4 pb-4 pt-3"
          style={{
            borderColor: '#B8C6D1',
            boxShadow: '0 6px 18px rgba(15, 23, 42, 0.10)',
          }}
        >
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.06em]" style={{ color: '#3B617D' }}>
                Resumen de egresos del día
              </h2>
              <p className="mt-0.5 text-[9px] text-gray-500">
                Distribución de los egresos registrados en la jornada.
              </p>
            </div>
            <span className="text-[9px] font-semibold text-gray-500">{hoyColombia()}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <TarjetaResumen
              titulo="Egresos"
              valor={formatearMoneda(resumenDia?.total_egresos)}
              subtitulo={`${Number(resumenDia?.cantidad_egresos || 0)} egreso(s) activo(s)`}
              icono="fas fa-money-bill-wave"
            />
            <TarjetaResumen
              titulo="Efectivo"
              valor={formatearMoneda(resumenDia?.total_efectivo)}
              subtitulo="Salidas registradas en efectivo"
              icono="fas fa-wallet"
            />
            <TarjetaResumen
              titulo="Otros Medios"
              valor={formatearMoneda(resumenDia?.total_otros_medios)}
              subtitulo="Transferencias y otros medios"
              icono="fas fa-building-columns"
            />
            <TarjetaResumen
              titulo="Anulados"
              valor={Number(resumenDia?.cantidad_anulados || 0)}
              subtitulo="Movimientos anulados"
              icono="fas fa-ban"
            />
          </div>
        </section>

        {/* ==================================================
            FILTROS
        ================================================== */}

        <div
          className="
            mb-3
            flex
            flex-col
            xl:flex-row
            xl:items-center
            xl:justify-end
            gap-2
          "
        >
          <div
            className="
              flex
              flex-wrap
              items-center
              justify-end
              gap-2
            "
          >
            <div className="relative w-full sm:w-[250px]">
              <i
                className="
                  fas fa-search absolute left-3 top-1/2
                  -translate-y-1/2 text-gray-400
                "
              ></i>
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Beneficiario, documento, placa..."
                className="
                  w-full border border-gray-300 rounded-lg
                  pl-9 pr-3 py-2 text-[10px] bg-white
                "
              />
            </div>

            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="
                w-full sm:w-[135px] border border-gray-300 rounded-lg
                px-2.5 py-2 text-[10px] bg-white
              "
              title="Fecha inicial"
            />

            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="
                w-full sm:w-[135px] border border-gray-300 rounded-lg
                px-2.5 py-2 text-[10px] bg-white
              "
              title="Fecha final"
            />

            <select
              value={conceptoFiltro}
              onChange={e => setConceptoFiltro(e.target.value)}
              className="
                w-full sm:w-[180px] border border-gray-300 rounded-lg
                px-2.5 py-2 text-[10px] bg-white
              "
            >
              <option value="">Todos los conceptos</option>
              {conceptos
                .filter(item => ['EGRESO', 'AMBOS'].includes(mayusculas(item?.naturaleza)))
                .map(item => (
                  <option key={item.id} value={item.id}>
                    {mayusculas(item.nombre)}
                    {!item.activo ? ' · INACTIVO' : ''}
                  </option>
                ))}
            </select>

            <select
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
              className="
                w-full sm:w-[145px] border border-gray-300 rounded-lg
                px-2.5 py-2 text-[10px] bg-white
              "
            >
              <option value="">Todos los estados</option>
              {ESTADOS.filter(Boolean).map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <BotonLimpiar
              type="button"
              onClick={limpiarFiltros}
              className="shrink-0 !px-3 !py-2 !text-[10px]"
            >
              <i className="fas fa-eraser"></i>
              Limpiar
            </BotonLimpiar>

            <BotonActualizar
              type="button"
              onClick={cargarTodo}
              disabled={cargando}
              className="shrink-0 !px-3 !py-2 !text-[10px]"
            >
              <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
              Actualizar
            </BotonActualizar>
          </div>
        </div>

        {texto(busqueda).length > 0 && texto(busqueda).length < 3 && (
          <div className="mb-2 text-right text-[9px] text-gray-500">
            Digite mínimo 3 caracteres para buscar.
          </div>
        )}

        {/* ==================================================
            HISTORIAL
        ================================================== */}

        <MarcoTabla>
          <div
            className="px-4 py-3 flex justify-between items-center gap-3"
            style={{
              backgroundColor: ESTILO_SECCIONES.fondo,
              color: ESTILO_SECCIONES.texto,
            }}
          >
            <div>
              <h2
                className="
                  text-xs
                  font-bold
                "
              >
                <i className="fas fa-list mr-2"></i>

                Historial de Egresos
              </h2>

              <p
                className="text-[9px] mt-0.5" style={{ color: ESTILO_SECCIONES.subtitulo }}
              >
                Movimientos registrados según los filtros seleccionados.
              </p>
            </div>

            <span
              className="text-[10px] whitespace-nowrap" style={{ color: ESTILO_SECCIONES.subtitulo }}
            >
              {egresos.length}{' '}
              registro(s)
            </span>
            <BotonAgregar
              type="button"
              onClick={() => {
                setError('')
                setMensaje('')
                setDrawerEgreso(true)
              }}
            >
              <i className="fas fa-plus"></i>
              Registrar Egreso
            </BotonAgregar>
          </div>

          <div className="overflow-x-auto">
            <table
              className="
                w-full
                text-[11px]
                border-collapse
              "
            >
              <thead style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>
                <tr>
                  <th className="border p-2">
                    Cuenta
                  </th>

                  <th className="border p-2">
                    Fecha
                  </th>

                  <th className="border p-2">
                    Beneficiario
                  </th>

                  <th className="border p-2">
                    Concepto
                  </th>

                  <th className="border p-2">
                    Vehículo
                  </th>

                  <th className="border p-2">
                    Medio
                  </th>

                  <th className="border p-2">
                    Valor
                  </th>

                  <th className="border p-2">
                    Estado
                  </th>

                  <th className="border p-2">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>

                {cargando ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="
                        p-10
                        text-center
                        text-gray-500
                      "
                    >
                      <i className="fas fa-spinner fa-spin mr-2"></i>

                      Consultando...
                    </td>
                  </tr>
                ) : egresos.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="
                        p-10
                        text-center
                        text-gray-500
                      "
                    >
                      <i
                        className="
                          fas
                          fa-inbox
                          block
                          text-3xl
                          text-gray-300
                          mb-2
                        "
                      ></i>

                      No hay egresos registrados para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  egresos.map(
                    egreso => (
                      <tr
                        key={
                          egreso.id
                        }
                        className="hover:bg-blue-50"
                      >

                        {/* CUENTA */}

                        <td
                          className="
                            border
                            p-2
                            text-center
                            font-black
                            whitespace-nowrap
                          "
                        >
                          {egreso
                            .numero_cuenta_cobro ||
                            `#${egreso.id}`}
                        </td>

                        {/* FECHA */}

                        <td
                          className="
                            border
                            p-2
                            text-center
                            whitespace-nowrap
                          "
                        >
                          {formatearFecha(
                            egreso.fecha
                          )}
                        </td>

                        {/* BENEFICIARIO */}

                        <td className="border p-2">
                          <div
                            className="
                              font-bold
                              text-gray-800
                            "
                          >
                            {egreso.beneficiario ||
                              '-'}
                          </div>

                          <div
                            className="
                              text-[9px]
                              text-gray-500
                              mt-0.5
                            "
                          >
                            {egreso
                              .tipo_documento_beneficiario ||
                              ''}

                            {' '}

                            {egreso
                              .documento_beneficiario ||
                              ''}
                          </div>
                        </td>

                        {/* CONCEPTO */}

                        <td className="border p-2">
                          <div
                            className="
                              font-bold
                              text-gray-800
                            "
                          >
                            {mayusculas(
                              egreso
                                ?.concepto
                                ?.nombre
                            ) ||
                              '-'}
                          </div>

                          {egreso.descripcion && (
                            <div
                              className="
                                text-[9px]
                                text-gray-500
                                mt-0.5
                                max-w-[260px]
                                truncate
                              "
                              title={
                                egreso.descripcion
                              }
                            >
                              {egreso.descripcion}
                            </div>
                          )}
                        </td>

                        {/* VEHÍCULO */}

                        <td
                          className="
                            border
                            p-2
                            text-center
                            font-bold
                            whitespace-nowrap
                          "
                        >
                          {descripcionVehiculo(
                            egreso
                          )}
                        </td>

                        {/* MEDIO */}

                        <td
                          className="
                            border
                            p-2
                            text-center
                          "
                        >
                          {mayusculas(
                            egreso
                              ?.medio_pago
                              ?.nombre
                          ) ||
                            '-'}
                        </td>

                        {/* VALOR */}

                        <td
                          className="
                            border
                            p-2
                            text-right
                            font-black
                            whitespace-nowrap
                          "
                        >
                          {formatearMoneda(
                            egreso.valor
                          )}
                        </td>

                        {/* ESTADO */}

                        <td
                          className="
                            border
                            p-2
                            text-center
                          "
                        >
                          <BadgeEstado
                            estado={
                              egreso.estado
                            }
                          />
                        </td>

                        {/* ACCIÓN */}

                        <td
                          className="
                            border
                            p-2
                            text-center
                          "
                        >
                          <BotonVerDetalle
                            type="button"
                            onClick={() => abrirDetalle(egreso)}
                            disabled={cargandoDetalle}
                            className="!px-3 !py-1.5 !text-[10px]"
                          >
                            <i className="fas fa-eye"></i>
                            Ver Detalle
                          </BotonVerDetalle>
                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>
            </table>
          </div>
        </MarcoTabla>

        </div>
      </div>

      {/* ====================================================
          DRAWER REGISTRAR EGRESO
      ==================================================== */}

      <RegistrarEgresoDrawer
        abierto={
          drawerEgreso
        }

        onCerrar={() =>
          setDrawerEgreso(
            false
          )
        }

        empresaNombre={
          empresaNombre
        }

        conceptos={
          conceptos
        }

        mediosPago={
          mediosPago
        }

        personal={
          personal
        }

        vehiculos={
          vehiculos
        }

        postEgreso={
          postEgreso
        }

        postCatalogos={
          postCatalogos
        }

        onActualizado={
          despuesDeRegistrar
        }

        onCatalogosActualizados={
          despuesDeActualizarCatalogos
        }

        onImprimirCuentaCobro={
        imprimirCuentaCobroDesdePagina
        }
      />

      {/* ====================================================
          DRAWER DETALLE
      ==================================================== */}

      {drawerDetalle &&
        detalleEgreso && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={() => setDrawerDetalle(false)}
          ></div>

          <div className="relative z-10 w-full max-w-[760px] max-h-[88vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-300">
            <div
              className="sticky top-0 z-20 px-4 py-3 flex justify-between items-start gap-3 border-b border-gray-300"
              style={{
                backgroundColor: ESTILO_SECCIONES.fondo,
                color: ESTILO_SECCIONES.texto,
                borderRadius: ESTILO_SECCIONES.radioSuperior,
              }}
            >
              <div>
                <p
                  className="text-[9px] uppercase font-bold tracking-wide"
                  style={{ color: ESTILO_SECCIONES.subtitulo }}
                >
                  <i className="fas fa-cash-register mr-1"></i>
                  Caja · Egresos
                </p>
                <h2 className="text-lg font-black mt-0.5">
                  Detalle del egreso
                </h2>
                <p
                  className="text-[10px] mt-0.5"
                  style={{ color: ESTILO_SECCIONES.subtitulo }}
                >
                  {detalleEgreso.numero_cuenta_cobro || `#${detalleEgreso.id}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDrawerDetalle(false)}
                className="shrink-0 w-9 h-9 border border-white/60 rounded-lg hover:bg-white/15 transition-all hover:scale-105"
                aria-label="Cerrar detalle"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <SeccionDetalle
                    titulo="Beneficiario"
                    icono="fas fa-user"
                  >
                    <Dato
                      label="Nombre / Razón social"
                      value={detalleEgreso.beneficiario}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Dato
                        label="Tipo documento"
                        value={detalleEgreso.tipo_documento_beneficiario}
                      />
                      <Dato
                        label="Documento"
                        value={detalleEgreso.documento_beneficiario}
                      />
                    </div>
                  </SeccionDetalle>

                  <SeccionDetalle
                    titulo="Datos del egreso"
                    icono="fas fa-file-invoice-dollar"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <Dato
                        label="Cuenta"
                        value={detalleEgreso.numero_cuenta_cobro}
                      />
                      <Dato
                        label="Fecha"
                        value={formatearFecha(detalleEgreso.fecha)}
                      />
                      <Dato
                        label="Concepto"
                        value={detalleEgreso?.concepto?.nombre}
                      />
                      <Dato
                        label="Valor"
                        value={formatearMoneda(detalleEgreso.valor)}
                      />
                      <Dato
                        label="Medio de pago"
                        value={detalleEgreso?.medio_pago?.nombre}
                      />
                      <div>
                        <div className="text-[9px] uppercase tracking-wide text-gray-500">
                          Estado
                        </div>
                        <div className="mt-1">
                          <BadgeEstado estado={detalleEgreso.estado} />
                        </div>
                      </div>
                    </div>
                  </SeccionDetalle>
                </div>

                <div className="space-y-4">
                  <SeccionDetalle
                    titulo="Información adicional"
                    icono="fas fa-circle-info"
                  >
                    <Dato
                      label="Descripción"
                      value={detalleEgreso.descripcion}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Dato
                        label="Factura"
                        value={detalleEgreso.numero_factura}
                      />
                      <Dato
                        label="Referencia"
                        value={detalleEgreso.referencia_pago}
                      />
                    </div>
                    <Dato
                      label="Registrado por"
                      value={detalleEgreso.pagado_por}
                    />
                    <Dato
                      label="Observaciones"
                      value={detalleEgreso.observaciones}
                    />

                    {detalleEgreso.vehiculo_id && (
                      <div className="pt-3 mt-1 border-t border-gray-300">
                        <div className="mb-2 text-[9px] font-black uppercase tracking-wide text-slate-600">
                          <i className="fas fa-car mr-1"></i>
                          Vehículo asociado
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Dato label="Placa" value={detalleEgreso.placa} />
                          <Dato label="Tipo" value={detalleEgreso?.vehiculo?.tipo_vehiculo} />
                          <Dato label="Marca" value={detalleEgreso?.vehiculo?.marca} />
                          <Dato label="Línea" value={detalleEgreso?.vehiculo?.linea} />
                        </div>
                      </div>
                    )}
                  </SeccionDetalle>

                  {mayusculas(detalleEgreso.estado) === 'ANULADO' && (
                    <div className="border border-red-400 bg-red-50 rounded-xl p-3">
                      <div className="text-[10px] font-black text-red-700">
                        <i className="fas fa-ban mr-2"></i>
                        EGRESO ANULADO
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <Dato label="Motivo" value={detalleEgreso.motivo_anulacion} />
                        <Dato label="Usuario" value={detalleEgreso.usuario_anulacion} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <BotonImprimir
                      type="button"
                      onClick={() => imprimirCuentaCobroDesdePagina(detalleEgreso)}
                    >
                      <i className="fas fa-print"></i>
                      Imprimir cuenta de cobro
                    </BotonImprimir>
                  </div>

                  {mayusculas(detalleEgreso.estado) === 'ANULADO' && (
                    <p className="text-[9px] text-right text-red-600">
                      Este movimiento se encuentra anulado.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// =========================================================
// SECCIÓN DETALLE
// =========================================================

function SeccionDetalle({
  titulo,
  icono,
  children,
}) {
  return (
    <div
      className="
        border
        border-gray-300
        rounded-xl
        overflow-hidden
      "
    >
      <div
        className="
          px-3
          py-2
          text-[10px]
          font-bold
        "
        style={{
          backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo,
          color: ESTILO_SECCIONES_SECUNDARIAS.texto,
          borderRadius: ESTILO_SECCIONES_SECUNDARIAS.radioSuperior,
        }}
      >
        <i
          className={`
            ${icono}
            mr-2
          `}
        ></i>

        {titulo}
      </div>

      <div
        className="
          p-3
          space-y-3
        "
      >
        {children}
      </div>
    </div>
  )
}

// =========================================================
// DATO
// =========================================================

function Dato({
  label,
  value,
}) {
  return (
    <div>
      <div
        className="
          text-[9px]
          uppercase
          tracking-wide
          text-gray-500
        "
      >
        {label}
      </div>

      <div
        className="
          text-xs
          font-semibold
          text-gray-800
          mt-0.5
          break-words
        "
      >
        {texto(
          value
        ) ||
          '-'}
      </div>
    </div>
  )
}
