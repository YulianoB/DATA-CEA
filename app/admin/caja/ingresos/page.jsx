// app/admin/caja/ingresos/page.jsx

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

import { HandCoins, RefreshCw } from 'lucide-react'

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import {
  BotonActualizar,
  BotonAgregar,
  BotonVerDetalle,
  ESTILO_CONTENEDORES,
  ESTILO_ENCABEZADO_TABLA,
  ESTILO_SECCIONES,
  ESTILO_TARJETAS,
  MarcoTabla,
} from '@/components/admin/EstiloModulo'

import OtrosIngresosDrawer
  from './components/OtrosIngresosDrawer'

import {
  imprimirReciboOtrosIngresos,
} from './components/imprimirReciboOtrosIngresos'

// =========================================================
// CONSTANTES
// =========================================================

const API_URL =
  '/api/admin/caja'

const CATEGORIAS = [
  '',
  'A2',
  'B1',
  'C1',
  'RC1',
  'C2',
  'C3',
]

const ESTADOS = [
  '',
  'PENDIENTE',
  'ABONADO',
  'PAZ_Y_SALVO',
]

const ORIGENES_PAGO = [
  'DIRECTO',
  'CONVENIO',  
  'OTRO',
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

function normalizarComparacion(
  valor
) {
  return mayusculas(
    valor
  )
    .normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
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

function nombreCompletoCuenta(
  cuenta
) {
  return (
    cuenta
      ?.aprendiz
      ?.nombre_completo ||
    [
      cuenta
        ?.aprendiz
        ?.nombres,

      cuenta
        ?.aprendiz
        ?.apellidos,
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      )
      .trim() ||
    '-'
  )
}

function obtenerCategoriasCuenta(
  cuenta
) {
  const categoriasDirectas =
    Array.isArray(
      cuenta?.categorias
    )
      ? cuenta.categorias
      : []

  const categoriasDetalles =
    Array.isArray(
      cuenta?.detalles
    )
      ? cuenta.detalles.flatMap(
          detalle =>
            Array.isArray(
              detalle?.categorias
            )
              ? detalle.categorias
              : []
        )
      : []

  return [
    ...new Set(
      [
        ...categoriasDirectas,
        ...categoriasDetalles,
      ]
        .map(
          item =>
            mayusculas(
              item
            )
        )
        .filter(
          Boolean
        )
    ),
  ]
}

function textoCategoriasCuenta(
  cuenta
) {
  const categorias =
    obtenerCategoriasCuenta(
      cuenta
    )

  return categorias.length
    ? categorias.join(' / ')
    : '-'
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

function fechaMatriculaCuenta(
  cuenta
) {
  return (
    cuenta?.aprendiz?.fecha_matricula ||
    cuenta?.matriculas?.[0]?.fecha_matricula ||
    ''
  )
}

function esCuentaConvenio(
  cuenta
) {
  return (
    mayusculas(
      cuenta?.origen_matricula ||
      cuenta?.aprendiz?.origen_matricula ||
      cuenta?.origen_pago
    ) === 'CONVENIO'
  )
}

function origenCuentaVisible(
  cuenta,
  empresaNombre
) {
  if (
    esCuentaConvenio(
      cuenta
    )
  ) {
    return (
      cuenta?.convenio?.nombre ||
      cuenta?.aprendiz?.convenio ||
      'CONVENIO'
    )
  }

  return (
    empresaNombre ||
    'DIRECTO'
  )
}

function cuentaTieneConcepto(
  cuenta,
  conceptoId
) {
  if (
    !conceptoId
  ) {
    return true
  }

  return (
    Array.isArray(
      cuenta?.detalles
    ) &&
    cuenta.detalles.some(
      detalle =>
        String(
          detalle?.concepto_id
        ) ===
        String(
          conceptoId
        )
    )
  )
}

function obtenerConceptosCuenta(
  cuenta
) {
  const nombres =
    Array.isArray(
      cuenta?.detalles
    )
      ? cuenta.detalles
          .map(
            detalle =>
              mayusculas(
                detalle?.concepto?.nombre
              )
          )
          .filter(
            Boolean
          )
      : []

  return [
    ...new Set(
      nombres
    ),
  ]
}

function conceptoPrincipalCuenta(
  cuenta
) {
  const conceptos =
    obtenerConceptosCuenta(
      cuenta
    )

  if (
    conceptos.includes(
      'CURSO'
    )
  ) {
    return 'CURSO'
  }

  if (
    conceptos.length >
    0
  ) {
    return conceptos[0]
  }

  return (
    cuenta?.descripcion ||
    '-'
  )
}

function nombreMedioPagoVisible(
  nombre
) {
  const valor =
    mayusculas(
      nombre
    )

  if (
    [
      'TARJETA CREDITO',
      'TARJETA CRÉDITO',
      'TARJETA DE CREDITO',
      'TARJETA DE CRÉDITO',
      'CREDITO',
      'CRÉDITO',
    ].includes(
      valor
    )
  ) {
    return 'CREDITO'
  }

  if (
    [
      'TARJETA DEBITO',
      'TARJETA DÉBITO',
      'TARJETA DE DEBITO',
      'TARJETA DE DÉBITO',
      'DEBITO',
      'DÉBITO',
    ].includes(
      valor
    )
  ) {
    return 'DEBITO'
  }

  if (
    [
      'EFECTIVO',
      'NEQUI',
      'DAVIPLATA',
      'PSE',
      'TRANSFERENCIA',
      'OTRO',
    ].includes(
      valor
    )
  ) {
    return valor
  }

  return ''
}

function nombreCompletoMatricula(
  matricula
) {
  return (
    matricula
      ?.nombre_completo ||
    [
      matricula?.nombres,
      matricula?.apellidos,
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      )
      .trim() ||
    '-'
  )
}

function escaparHtml(
  valor
) {
  return String(
    valor ?? ''
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
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
// BADGE ESTADO
// =========================================================

function BadgeEstado({
  estado,
}) {
  const valor =
    mayusculas(
      estado
    )

  let clases =
    'bg-gray-100 text-gray-600 border-gray-200'

  if (
    valor ===
    'PENDIENTE'
  ) {
    clases =
      'bg-amber-50 text-amber-700 border-amber-200'
  }

  if (
    valor ===
    'ABONADO'
  ) {
    clases =
      'bg-blue-50 text-blue-700 border-blue-200'
  }

  if (
    valor ===
    'PAZ_Y_SALVO'
  ) {
    clases =
      'bg-emerald-50 text-emerald-700 border-emerald-200'
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        font-bold
        ${clases}
      `}
    >
      {valor ===
      'PAZ_Y_SALVO'
        ? 'PAZ Y SALVO'
        : valor}
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
        border: `1px solid #B8C6D1`,
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
// PAGE
// =========================================================

export default function CajaIngresosPage() {
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
    sesionLista,
    setSesionLista,
  ] =
    useState(
      false
    )

  // =======================================================
  // DATOS
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
    convenios,
    setConvenios,
  ] =
    useState([])

  const [
    cuentas,
    setCuentas,
  ] =
    useState([])

  const [
  ingresosLibres,
  setIngresosLibres,
] =
  useState([])

const [
  cargandoIngresosLibres,
  setCargandoIngresosLibres,
] =
  useState(
    false
  )

  const [
    resumenDia,
    setResumenDia,
  ] =
    useState({
      total_ingresos:
        0,

      cantidad_recibos:
        0,
    })

  // =======================================================
  // FILTROS
  // =======================================================

  const [
  tipoConsulta,
  setTipoConsulta,
] =
  useState(
    'OBLIGACIONES'
  )
  const [
    busqueda,
    setBusqueda,
  ] =
    useState('')

  const [
    estado,
    setEstado,
  ] =
    useState('PENDIENTE')

  const [
    categoria,
    setCategoria,
  ] =
    useState('')

  const [
    conceptoFiltro,
    setConceptoFiltro,
  ] =
    useState('')

  // =======================================================
  // BÚSQUEDA MATRÍCULA
  // =======================================================

  const [
    buscarMatricula,
    setBuscarMatricula,
  ] =
    useState('')

  const [
    matriculasEncontradas,
    setMatriculasEncontradas,
  ] =
    useState([])

  const [
    buscandoMatricula,
    setBuscandoMatricula,
  ] =
    useState(
      false
    )

  // =======================================================
  // DRAWER NUEVA OBLIGACIÓN
  // =======================================================

  const [
    drawerConcepto,
    setDrawerConcepto,
  ] =
    useState(
      false
    )

  const [
    matriculaConcepto,
    setMatriculaConcepto,
  ] =
    useState(
      null
    )

  const [
    formConcepto,
    setFormConcepto,
  ] =
    useState({
      concepto_id:
        '',

      valor_total:
        '',

      origen_pago:
        'DIRECTO',

      convenio_id:
        '',

      descripcion:
        '',

      observaciones:
        '',
    })

  // =======================================================
  // DRAWER REGISTRAR PAGO
  // =======================================================

  const [
    drawerPago,
    setDrawerPago,
  ] =
    useState(false)

  const [
    cuentaPago,
    setCuentaPago,
  ] =
    useState(null)

  const [
    formPago,
    setFormPago,
  ] =
    useState({
      medio_pago_id: '',
      valor: '',
      pagado_por: 'APRENDIZ',
      nombre_pagador: '',
      documento_pagador: '',
      referencia_pago: '',
      observaciones: '',
    })

    const [
    drawerOtrosIngresos,
    setDrawerOtrosIngresos,
  ] = useState(false)

  // =======================================================
  // DRAWER DETALLE FINANCIERO
  // =======================================================

  const [
    drawerDetalle,
    setDrawerDetalle,
  ] =
    useState(false)

  const [
    detalleFinanciero,
    setDetalleFinanciero,
  ] =
    useState(null)

  const [
    cargandoDetalle,
    setCargandoDetalle,
  ] =
    useState(false)

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
    procesando,
    setProcesando,
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

        router.push(
          '/login'
        )
      }
    },
    [
      router,
    ]
  )

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
  // URL
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
                value
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
  // POST
  // =======================================================

  const postCaja =
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
  // CARGAR PARÁMETROS
  // =======================================================

  const cargarParametros =
    useCallback(
      async () => {
        const data =
          await fetchJsonSeguro(
            construirUrl(
              'parametros'
            )
          )

        setConceptos(
          data?.data
            ?.conceptos ||
          []
        )

        setMediosPago(
          data?.data
            ?.medios_pago ||
          []
        )

        setConvenios(
          data?.data
            ?.convenios ||
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
      },
      [
        construirUrl,
      ]
    )

  // =======================================================
  // CARGAR CUENTAS
  // =======================================================

  const cargarCuentas =
    useCallback(
      async () => {
        if (
          !nit
        ) {
          return
        }

        const data =
          await fetchJsonSeguro(
            construirUrl(
              'cuentas',
              {
                q:
                  busqueda,
              }
            )
          )

        setCuentas(
          Array.isArray(
            data?.data
          )
            ? data.data
            : []
        )
      },
      [
        nit,
        construirUrl,
        busqueda,
      ]
    )
    // =======================================================
// CARGAR INGRESOS LIBRES
// =======================================================

const cargarIngresosLibres =
  useCallback(
    async () => {
      if (
        !nit
      ) {
        return
      }

      setCargandoIngresosLibres(
        true
      )

      try {
        const data =
          await fetchJsonSeguro(
            construirUrl(
              'ingresos_libres',
              {
                buscar:
                  busqueda,
              }
            )
          )

        setIngresosLibres(
          Array.isArray(
            data?.data
          )
            ? data.data
            : []
        )
      } catch (
        errorIngresos
      ) {
        console.error(
          'Error cargando ingresos libres:',
          errorIngresos
        )

        setIngresosLibres(
          []
        )

        setError(
          errorIngresos
            ?.message ||
          'No fue posible consultar los otros ingresos.'
        )
      } finally {
        setCargandoIngresosLibres(
          false
        )
      }
    },
    [
      nit,
      construirUrl,
      busqueda,
    ]
  )
  // =======================================================
  // RESUMEN
  // =======================================================

  const cargarResumen =
    useCallback(
      async () => {
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
        construirUrl,
      ]
    )

  // =======================================================
  // CARGA INICIAL
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
            cargarParametros(),
            cargarCuentas(),
            cargarResumen(),
          ])
        } catch (
          errorCarga
        ) {
          console.error(
            errorCarga
          )

          setError(
            errorCarga.message
          )
        } finally {
          setCargando(
            false
          )
        }
      },
      [
        nit,
        cargarParametros,
        cargarCuentas,
        cargarResumen,
      ]
    )

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
      cargarTodo,
    ]
  )

  // =======================================================
  // BÚSQUEDA AUTOMÁTICA CUENTAS
  // =======================================================

  useEffect(
    () => {
      if (
        !nit
      ) {
        return
      }

      const timer =
        setTimeout(
          () => {
            cargarCuentas()
              .catch(
                errorBusqueda => {
                  setError(
                    errorBusqueda.message
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
      nit,
      cargarCuentas,
    ]
  )
  // =======================================================
// CARGA AUTOMÁTICA INGRESOS LIBRES
// =======================================================

useEffect(
  () => {
    if (
      !nit ||
      tipoConsulta ===
        'OBLIGACIONES'
    ) {
      return
    }

    const timer =
      setTimeout(
        () => {
          cargarIngresosLibres()
        },
        350
      )

    return () =>
      clearTimeout(
        timer
      )
  },
  [
    nit,
    tipoConsulta,
    busqueda,
    cargarIngresosLibres,
  ]
)
  // =======================================================
  // CONCEPTOS INGRESO
  // =======================================================

  const conceptosIngreso =
    useMemo(
      () =>
        conceptos.filter(
          item =>
            [
              'INGRESO',
              'AMBOS',
            ].includes(
              mayusculas(
                item.naturaleza
              )
            )
        ),
      [
        conceptos,
      ]
    )

  // =======================================================
  // FILTRO LOCAL
  // =======================================================

  const cuentasFiltradas =
    useMemo(
      () => {
        return cuentas.filter(
          cuenta => {
            if (
              estado &&
              mayusculas(
                cuenta.estado
              ) !==
                estado
            ) {
              return false
            }

            if (
              categoria &&
              !obtenerCategoriasCuenta(
                cuenta
              ).includes(
                categoria
              )
            ) {
              return false
            }

            if (
              conceptoFiltro &&
              !cuentaTieneConcepto(
                cuenta,
                conceptoFiltro
              )
            ) {
              return false
            }

            return true
          }
        )
      },
      [
        cuentas,
        estado,
        categoria,
        conceptoFiltro,
      ]
    )
    // =======================================================
// FILTRO LOCAL INGRESOS LIBRES
// =======================================================

const ingresosLibresFiltrados =
  useMemo(
    () => {
      return ingresosLibres.filter(
        recibo => {
          // ===============================================
          // SOLO REFUERZOS
          // ===============================================

          if (
            tipoConsulta ===
            'REFUERZOS'
          ) {
            const nombreConcepto =
              normalizarComparacion(
                recibo
                  ?.concepto
                  ?.nombre ||
                recibo
                  ?.descripcion
              )

            if (
              nombreConcepto !==
              'REFUERZO PRACTICO'
            ) {
              return false
            }
          }

          // ===============================================
          // CATEGORÍA
          // ===============================================

          if (
            categoria &&
            mayusculas(
              recibo?.categoria
            ) !==
              categoria
          ) {
            return false
          }

          // ===============================================
          // CONCEPTO
          // ===============================================

          if (
            conceptoFiltro &&
            String(
              recibo?.concepto_id
            ) !==
              String(
                conceptoFiltro
              )
          ) {
            return false
          }

          return true
        }
      )
    },
    [
      ingresosLibres,
      tipoConsulta,
      categoria,
      conceptoFiltro,
    ]
  )

  // =======================================================
  // OPCIONES PAGADO POR
  // =======================================================

  const opcionesPagadoPor =
    useMemo(
      () => {
        const opciones = [
          {
            value:
              'APRENDIZ',

            label:
              'APRENDIZ',
          },
        ]

        if (
          esCuentaConvenio(
            cuentaPago
          )
        ) {
          opciones.push({
            value:
              'CONVENIO',

            label:
              'CONVENIO',
          })
        }

        opciones.push({
          value:
            'TERCERO',

          label:
            'TERCERO',
        })

        return opciones
      },
      [
        cuentaPago,
      ]
    )

  // =======================================================
  // BÚSQUEDA MATRÍCULA PARA NUEVO CONCEPTO
  // =======================================================

  useEffect(
    () => {
      if (
        !nit ||
        texto(
          buscarMatricula
        ).length <
          2
      ) {
        setMatriculasEncontradas(
          []
        )

        return
      }

      const timer =
        setTimeout(
          async () => {
            try {
              setBuscandoMatricula(
                true
              )

              const data =
                await fetchJsonSeguro(
                  construirUrl(
                    'buscar_aprendices',
                    {
                      q:
                        buscarMatricula,
                    }
                  )
                )

              setMatriculasEncontradas(
                Array.isArray(
                  data?.data
                )
                  ? data.data
                  : []
              )
            } catch (
              errorBuscar
            ) {
              setError(
                errorBuscar.message
              )
            } finally {
              setBuscandoMatricula(
                false
              )
            }
          },
          350
        )

      return () =>
        clearTimeout(
          timer
        )
    },
    [
      buscarMatricula,
      nit,
      construirUrl,
    ]
  )

  // =======================================================
  // ABRIR NUEVO CONCEPTO
  // =======================================================

  function abrirNuevoConcepto(
    matricula
  ) {
    setMatriculaConcepto(
      matricula
    )

    setFormConcepto({
      concepto_id:
        '',

      valor_total:
        '',

      origen_pago:
        matricula
          ?.convenio
          ? 'CONVENIO'
          : 'DIRECTO',

      convenio_id:
        '',

      descripcion:
        '',

      observaciones:
        '',
    })

    setDrawerConcepto(
      true
    )

    setBuscarMatricula('')
    setMatriculasEncontradas([])
    setError('')
    setMensaje('')
  }

  // =======================================================
  // CREAR OBLIGACIÓN
  // =======================================================

  async function crearObligacion() {
    if (
      !matriculaConcepto?.id
    ) {
      return
    }

    if (
      !formConcepto
        .concepto_id
    ) {
      setError(
        'Seleccione el concepto.'
      )

      return
    }

    const valor =
      Number(
        formConcepto
          .valor_total
      )

    if (
      !Number.isFinite(
        valor
      ) ||
      valor <=
        0
    ) {
      setError(
        'Ingrese un valor válido.'
      )

      return
    }

    setProcesando(
      true
    )

    setError('')
    setMensaje('')

    try {
      const data =
        await postCaja({
          accion:
            'crear_cuenta',

          matricula_id:
            matriculaConcepto.id,

          concepto_id:
            formConcepto
              .concepto_id,

          valor_total:
            valor,

          convenio_id:
            formConcepto
              .convenio_id ||
            null,

          origen_pago:
            formConcepto
              .origen_pago,

          descripcion:
            formConcepto
              .descripcion,

          observaciones:
            formConcepto
              .observaciones,
        })

      setMensaje(
        data?.message ||
        'Obligación creada correctamente.'
      )

      setDrawerConcepto(
        false
      )

      setMatriculaConcepto(
        null
      )

      await cargarCuentas()
    } catch (
      errorCrear
    ) {
      setError(
        errorCrear.message
      )
    } finally {
      setProcesando(
        false
      )
    }
  }

  // =======================================================
  // REGISTRAR PAGO
  // =======================================================

  function abrirRegistrarPago(cuenta) {
    setCuentaPago(cuenta)

    const esConvenio =
      esCuentaConvenio(
        cuenta
      )

    setFormPago({
      medio_pago_id: '',
      valor: '',
      pagado_por:
        esConvenio
          ? 'CONVENIO'
          : 'APRENDIZ',
      nombre_pagador:
        esConvenio
          ? (
              cuenta?.convenio?.nombre ||
              cuenta?.aprendiz?.convenio ||
              ''
            )
          : nombreCompletoCuenta(
              cuenta
            ),
      documento_pagador:
        esConvenio
          ? (
              cuenta?.convenio?.documento ||
              ''
            )
          : (
              cuenta?.documento ||
              cuenta?.aprendiz?.documento ||
              ''
            ),
      referencia_pago: '',
      observaciones: '',
    })

    setError('')
    setMensaje('')
    setDrawerPago(true)
  }

  function cerrarDrawerPago() {
    if (procesando) {
      return
    }

    setDrawerPago(false)
    setCuentaPago(null)
  }

  async function consultarDetalleCuenta(
    cuentaId
  ) {
    const data =
      await fetchJsonSeguro(
        construirUrl(
          'detalle_cuenta',
          {
            cuenta_id:
              cuentaId,
          }
        )
      )

    return (
      data?.data ||
      null
    )
  }

  async function abrirDetalleCuenta(
    cuenta
  ) {
    if (
      !cuenta?.id
    ) {
      return
    }

    setCargandoDetalle(
      true
    )

    setError('')
    setMensaje('')

    try {
      const detalle =
        await consultarDetalleCuenta(
          cuenta.id
        )

      setDetalleFinanciero(
        detalle
      )

      setDrawerDetalle(
        true
      )
    } catch (
      errorDetalle
    ) {
      console.error(
        'Error consultando detalle financiero:',
        errorDetalle
      )

      setError(
        errorDetalle?.message ||
        'No fue posible consultar el detalle financiero.'
      )
    } finally {
      setCargandoDetalle(
        false
      )
    }
  }

  function cerrarDrawerDetalle() {
    setDrawerDetalle(
      false
    )

    setDetalleFinanciero(
      null
    )
  }

  function imprimirRecibo(
    recibo,
    detalle
  ) {
    if (
      !recibo ||
      !detalle?.cuenta
    ) {
      setError(
        'No fue posible preparar el recibo para impresión.'
      )

      return
    }

    const cuenta =
      detalle.cuenta

    const recibosActivos =
      (
        Array.isArray(
          detalle?.recibos
        )
          ? detalle.recibos
          : []
      )
        .filter(
          item =>
            mayusculas(
              item?.estado
            ) ===
            'ACTIVO'
        )
        .slice()
        .sort(
          (
            a,
            b
          ) => {
            const fechaA =
              new Date(
                a?.created_at ||
                `${a?.fecha || '1900-01-01'}T00:00:00`
              ).getTime()

            const fechaB =
              new Date(
                b?.created_at ||
                `${b?.fecha || '1900-01-01'}T00:00:00`
              ).getTime()

            if (
              fechaA !==
              fechaB
            ) {
              return (
                fechaA -
                fechaB
              )
            }

            return (
              Number(
                a?.id ||
                0
              ) -
              Number(
                b?.id ||
                0
              )
            )
          }
        )

    const historialHastaRecibo =
      []

    let totalAbonadoAlRecibo =
      0

    for (
      const item of
        recibosActivos
    ) {
      historialHastaRecibo.push(
        item
      )

      totalAbonadoAlRecibo +=
        Number(
          item?.valor ||
          0
        )

      if (
        String(
          item?.id
        ) ===
        String(
          recibo?.id
        )
      ) {
        break
      }
    }

    const reciboEncontrado =
      historialHastaRecibo.some(
        item =>
          String(
            item?.id
          ) ===
          String(
            recibo?.id
          )
      )

    if (
      !reciboEncontrado &&
      mayusculas(
        recibo?.estado
      ) ===
      'ACTIVO'
    ) {
      historialHastaRecibo.push(
        recibo
      )

      totalAbonadoAlRecibo +=
        Number(
          recibo?.valor ||
          0
        )
    }

    const valorTotal =
      Number(
        cuenta?.valor_total ||
        0
      )

    const saldoAlRecibo =
      Math.max(
        0,
        valorTotal -
        totalAbonadoAlRecibo
      )

    const consecutivo =
      recibo?.consecutivo ||
      (
        recibo?.id
          ? `RC-${String(
              recibo.id
            ).padStart(
              6,
              '0'
            )}`
          : '-'
      )

    const nombreAprendiz =
      nombreCompletoCuenta(
        cuenta
      )

    const documentoAprendiz =
      cuenta?.documento ||
      cuenta?.aprendiz?.documento ||
      '-'

    const matricula =
      cuenta?.consecutivo_matricula ||
      '-'

    const categorias =
      textoCategoriasCuenta(
        cuenta
      )

    const origen =
      esCuentaConvenio(
        cuenta
      )
        ? 'CONVENIO'
        : 'DIRECTO'

    const origenNombre =
      origenCuentaVisible(
        cuenta,
        empresaNombre
      )

    const medioPago =
      nombreMedioPagoVisible(
        recibo
          ?.medio_pago
          ?.nombre
      ) ||
      recibo
        ?.medio_pago
        ?.nombre ||
      '-'

    const detalles =
      Array.isArray(
        cuenta?.detalles
      )
        ? cuenta.detalles
        : []

    const filasDetalles =
      detalles.length >
      0
        ? detalles
            .map(
              detalleItem => {
                const descripcion =
                  detalleItem?.descripcion ||
                  detalleItem
                    ?.concepto
                    ?.nombre ||
                  'CONCEPTO'

                return `
                  <tr>
                    <td colspan="3">${escaparHtml(
                      descripcion
                    )}</td>
                    <td class="money">${escaparHtml(
                      formatearMoneda(
                        detalleItem?.valor
                      )
                    )}</td>
                  </tr>
                `
              }
            )
            .join('')
        : `
            <tr>
              <td colspan="3">OBLIGACIÓN</td>
              <td class="money">${escaparHtml(
                formatearMoneda(
                  valorTotal
                )
              )}</td>
            </tr>
          `

    const filasHistorial =
      historialHastaRecibo.length >
      0
        ? historialHastaRecibo
            .map(
              item => {
                const consecutivoItem =
                  item?.consecutivo ||
                  (
                    item?.id
                      ? `RC-${String(
                          item.id
                        ).padStart(
                          6,
                          '0'
                        )}`
                      : '-'
                  )

                const medioItem =
                  nombreMedioPagoVisible(
                    item
                      ?.medio_pago
                      ?.nombre
                  ) ||
                  item
                    ?.medio_pago
                    ?.nombre ||
                  '-'

                return `
                  <tr>
                    <td>${escaparHtml(
                      formatearFecha(
                        item?.fecha
                      )
                    )}</td>
                    <td>${escaparHtml(
                      consecutivoItem
                    )}</td>
                    <td>${escaparHtml(
                      medioItem
                    )}</td>
                    <td class="money">${escaparHtml(
                      formatearMoneda(
                        item?.valor
                      )
                    )}</td>
                  </tr>
                `
              }
            )
            .join('')
        : `
            <tr>
              <td colspan="4" class="center">SIN PAGOS REGISTRADOS</td>
            </tr>
          `

    const construirCopia =
      copia => `
        <section class="receipt">
          <table>
            <tbody>
              <tr>
                <td colspan="4" class="head">
                  <div class="title">RECIBO DE CAJA</div>
                  <div class="company">${escaparHtml(
                    empresaNombre ||
                    'CEA'
                  )}</div>
                  <div class="copy">${escaparHtml(
                    copia
                  )}</div>
                </td>
              </tr>
              <tr>
                <th>RECIBO</th>
                <td>${escaparHtml(
                  consecutivo
                )}</td>
                <th>FECHA</th>
                <td>${escaparHtml(
                  formatearFecha(
                    recibo?.fecha
                  )
                )}</td>
              </tr>
              <tr>
                <th>APRENDIZ</th>
                <td>${escaparHtml(
                  nombreAprendiz
                )}</td>
                <th>DOCUMENTO</th>
                <td>${escaparHtml(
                  documentoAprendiz
                )}</td>
              </tr>
              <tr>
                <th>MATRÍCULA</th>
                <td>${escaparHtml(
                  matricula
                )}</td>
                <th>CATEGORÍA</th>
                <td>${escaparHtml(
                  categorias
                )}</td>
              </tr>
              <tr>
                <th>ORIGEN</th>
                <td>${escaparHtml(
                  origen
                )}</td>
                <th>${
                  origen ===
                  'CONVENIO'
                    ? 'CONVENIO'
                    : 'CEA'
                }</th>
                <td>${escaparHtml(
                  origenNombre
                )}</td>
              </tr>
              <tr>
                <td colspan="4" class="section">DETALLE DE LA OBLIGACIÓN</td>
              </tr>
              <tr>
                <th colspan="3">CONCEPTO / DESCRIPCIÓN</th>
                <th class="money">VALOR</th>
              </tr>
              ${filasDetalles}
              <tr>
                <th colspan="2">VALOR OBLIGACIÓN</th>
                <td colspan="2" class="money strong">${escaparHtml(
                  formatearMoneda(
                    valorTotal
                  )
                )}</td>
              </tr>
              <tr>
                <td colspan="4" class="section">HISTORIAL DE PAGOS</td>
              </tr>
              <tr>
                <th>FECHA</th>
                <th>RECIBO</th>
                <th>MEDIO</th>
                <th class="money">VALOR</th>
              </tr>
              ${filasHistorial}
              <tr>
                <th colspan="2">TOTAL ABONADO</th>
                <td colspan="2" class="money">${escaparHtml(
                  formatearMoneda(
                    totalAbonadoAlRecibo
                  )
                )}</td>
              </tr>
              <tr>
                <th colspan="2">SALDO</th>
                <td colspan="2" class="money strong">${escaparHtml(
                  formatearMoneda(
                    saldoAlRecibo
                  )
                )}</td>
              </tr>
              <tr>
                <th colspan="2">ESTADO AL RECIBO</th>
                <td colspan="2" class="strong">${escaparHtml(
                  saldoAlRecibo <= 0
                    ? 'PAZ Y SALVO'
                    : 'ABONADO'
                )}</td>
              </tr>
              <tr>
                <th>MEDIO PAGO</th>
                <td>${escaparHtml(
                  medioPago
                )}</td>
                <th>ENTIDAD</th>
                <td>${escaparHtml(
                  recibo?.referencia_pago ||
                  '-'
                )}</td>
              </tr>
              <tr>
                <th>PAGADO POR</th>
                <td>${escaparHtml(
                  recibo?.pagado_por ||
                  '-'
                )}</td>
                <th>PAGADOR</th>
                <td>${escaparHtml(
                  recibo?.nombre_pagador ||
                  '-'
                )}</td>
              </tr>
              <tr>
                <th>DOC. PAGADOR</th>
                <td>${escaparHtml(
                  recibo?.documento_pagador ||
                  '-'
                )}</td>
                <th>RECIBIDO POR</th>
                <td>${escaparHtml(
                  recibo?.recibido_por ||
                  '-'
                )}</td>
              </tr>
              ${
                texto(
                  recibo?.observaciones
                )
                  ? `
                      <tr>
                        <th>OBSERVACIONES</th>
                        <td colspan="3">${escaparHtml(
                          recibo.observaciones
                        )}</td>
                      </tr>
                    `
                  : ''
              }
              <tr>
                <td colspan="2" class="signature">
                  ___________________________<br>
                  FIRMA PAGADOR
                </td>
                <td colspan="2" class="signature">
                  ___________________________<br>
                  RECIBIDO POR
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      `

    const ventana =
      window.open(
        '',
        '_blank',
        'width=1200,height=760'
      )

    if (
      !ventana
    ) {
      setError(
        'El navegador bloqueó la ventana de impresión. Permita ventanas emergentes para este sitio.'
      )

      return
    }

    ventana.document.open()

    ventana.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>${escaparHtml(
            consecutivo
          )}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              background: #fff;
            }

            body {
              padding: 4mm;
            }

            .center {
              text-align: center;
            }

            .toolbar {
              display: flex;
              justify-content: flex-end;
              gap: 8px;
              margin-bottom: 10px;
            }

            .toolbar button {
              border: 1px solid #444;
              background: #fff;
              padding: 7px 12px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 12px;
              font-weight: bold;
            }

            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 3mm;
              align-items: start;
            }

            .receipt {
              width: 100%;
              min-width: 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 7.4px;
              line-height: 1.12;
            }

            th,
            td {
              border: 1px solid #000;
              padding: 2px 3px;
              vertical-align: middle;
              overflow-wrap: anywhere;
            }

            th {
              text-align: left;
              font-weight: 700;
            }

            .head {
              text-align: center;
              padding: 8px 4px;
            }

            .title {
              font-size: 18px;
              font-weight: 900;
              line-height: 1.2;
            }

            .company {
              margin-top: 1px;
              font-size: 10px;
              font-weight: 700;
            }

            .copy {
              margin-top: 1px;
              font-size: 7px;
            }

            .section {
            text-align: center;
            font-weight: 900;
            font-size: 9px;
            padding: 5px 3px;
            line-height: 1.2;
            background: #f3f4f6;
          }

            .money {
              text-align: right;
              white-space: nowrap;
            }

            .strong {
              font-weight: 900;
            }

            .signature {
              height: 28px;
              text-align: center;
              vertical-align: bottom;
              padding-bottom: 2px;
              font-size: 6.8px;
            }

            @page {
              size: 8.5in 11in;
              margin: 5mm;
            }

            @media print {
              html,
              body {
                width: 8.5in;
                min-height: 11in;
                margin: 0;
                padding: 0;
              }

              body {
                overflow: visible;
              }

              .toolbar {
                display: none;
              }

              .grid {
                display: grid;

                grid-template-columns:
                  minmax(0, 1fr)
                  minmax(0, 1fr);

                gap: 3mm;

                align-items: stretch;

                width: 100%;

                max-width: 100%;
              }

              .receipt {
                width: 100%;
                height: 100%;
                min-width: 0;
              }
            }
          </style>
        </head>

        <body>
          <div class="toolbar">
            <button onclick="window.print()">
              IMPRIMIR
            </button>

            <button onclick="window.close()">
              CERRAR
            </button>
          </div>

          <main class="grid">
            ${construirCopia(
              'COPIA APRENDIZ'
            )}

            ${construirCopia(
              'COPIA CEA'
            )}
          </main>
        </body>
      </html>
    `)

    ventana.document.close()
    ventana.focus()
  }

  async function registrarPago() {
    if (!cuentaPago?.id) {
      return
    }

    const valor =
      Number(formPago.valor)

    if (!formPago.medio_pago_id) {
      setError('Seleccione el medio de pago.')
      return
    }

    if (!Number.isFinite(valor) || valor <= 0) {
      setError('Ingrese un valor recibido válido.')
      return
    }

    const saldoActual =
      Number(cuentaPago?.saldo || 0)

    if (valor > saldoActual) {
      setError('El valor recibido no puede superar el saldo pendiente.')
      return
    }

    setProcesando(true)
    setError('')
    setMensaje('')

    try {
      const data =
        await postCaja({
          accion: 'registrar_abono',
          cuenta_id: cuentaPago.id,
          medio_pago_id: formPago.medio_pago_id,
          valor,
          pagado_por: formPago.pagado_por,
          nombre_pagador: formPago.nombre_pagador,
          documento_pagador: formPago.documento_pagador,
          referencia_pago: formPago.referencia_pago,
          descripcion:
            cuentaPago?.descripcion ||
            cuentaPago?.concepto?.nombre ||
            'PAGO',
          observaciones: formPago.observaciones,
        })

      setMensaje(
        data?.message ||
        'Pago registrado correctamente.'
      )

      const cuentaPagadaId =
        cuentaPago.id

      setDrawerPago(false)
      setCuentaPago(null)

      await Promise.all([
        cargarCuentas(),
        cargarResumen(),
      ])

      try {
        const detalleActualizado =
          await consultarDetalleCuenta(
            cuentaPagadaId
          )

        if (
          detalleActualizado
        ) {
          setDetalleFinanciero(
            detalleActualizado
          )

          setDrawerDetalle(
            true
          )
        }
      } catch (
        errorDetalle
      ) {
        console.error(
          'Pago registrado, pero no fue posible cargar el detalle:',
          errorDetalle
        )
      }
    } catch (errorPago) {
      console.error('Error registrando pago:', errorPago)
      setError(
        errorPago?.message ||
        'No fue posible registrar el pago.'
      )
    } finally {
      setProcesando(false)
    }
  }

  // =======================================================
  // SESIÓN
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

        Cargando ingresos...
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
          titulo="Registrar Ingresos"
          subtitulo="Pagos, abonos, refuerzos, exámenes médicos y otros conceptos."
          icono={HandCoins}
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
            RESUMEN
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
                Resumen de ingresos del día
              </h2>
              <p className="mt-0.5 text-[9px] text-gray-500">
                Distribución de los ingresos registrados en la jornada.
              </p>
            </div>
            <span className="text-[9px] font-semibold text-gray-500">
              {hoyColombia()}
            </span>
          </div>

          <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            xl:grid-cols-4
            gap-3
          "
        >
          <TarjetaResumen
            titulo="Ingresos"
            valor={
              formatearMoneda(
                resumenDia
                  ?.total_ingresos
              )
            }
            subtitulo={`${Number(
              resumenDia
                ?.cantidad_recibos ||
              0
            )} recibo(s)`}
            icono="fas fa-dollar-sign"
          />

          <TarjetaResumen
            titulo="Cursos"
            valor={
              formatearMoneda(
                resumenDia
                  ?.total_cursos
              )
            }
            icono="fas fa-car"
          />

          <TarjetaResumen
            titulo="Refuerzos"
            valor={
              formatearMoneda(
                resumenDia
                  ?.total_refuerzos
              )
            }
            icono="fas fa-road"
          />

          <TarjetaResumen
            titulo="Exámenes Médicos"
            valor={
              formatearMoneda(
                resumenDia
                  ?.total_examenes_medicos
              )
            }
            icono="fas fa-stethoscope"
          />
        </div>
        </section>

       {/* ==================================================
            FILTROS
        ================================================== */}

        <div
          className="
            mb-3
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-12
            gap-2
            items-center
          "
        >
            {/* ==============================================
                TIPO DE CONSULTA
            ============================================== */}

            <select
              value={
                tipoConsulta
              }
              onChange={
                e => {
                  const nuevoTipo =
                    e.target.value

                  setTipoConsulta(
                    nuevoTipo
                  )

                  setBusqueda('')
                  setCategoria('')
                  setConceptoFiltro('')

                  if (
                    nuevoTipo ===
                    'OBLIGACIONES'
                  ) {
                    setEstado(
                      'PENDIENTE'
                    )
                  } else {
                    setEstado('')
                  }

                  if (
                    nuevoTipo !==
                    'OBLIGACIONES'
                  ) {
                    setTimeout(
                      () => {
                        cargarIngresosLibres()
                      },
                      0
                    )
                  }
                }
              }
              className="lg:col-span-3 
                border
                border-gray-300
                rounded-lg
                px-3
                py-2
                text-xs
                font-semibold
                bg-white
              "
            >
              <option value="OBLIGACIONES">
                Obligaciones de aprendices
              </option>

              <option value="REFUERZOS">
                Refuerzos prácticos
              </option>

              <option value="OTROS_INGRESOS">
                Otros ingresos
              </option>
            </select>

            {/* ==============================================
                BÚSQUEDA
            ============================================== */}

            <div className="relative lg:col-span-3">
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
                  e =>
                    setBusqueda(
                      e.target.value
                    )
                }
                placeholder={
                  tipoConsulta ===
                  'OBLIGACIONES'
                    ? 'Documento, nombre...'
                    : 'Cliente, documento...'
                }
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-lg
                  pl-9
                  pr-3
                  py-2
                  text-xs
                "
              />
            </div>

            {/* ==============================================
                ESTADO
                SOLO OBLIGACIONES
            ============================================== */}

            {tipoConsulta ===
              'OBLIGACIONES' ? (
              <select
                value={
                  estado
                }
                onChange={
                  e =>
                    setEstado(
                      e.target.value
                    )
                }
                className="lg:col-span-1 
                  border
                  border-gray-300
                  rounded-lg
                  px-3
                  py-2
                  text-xs
                "
              >
                <option value="">
                  Todos los estados
                </option>

                {ESTADOS
                  .filter(
                    Boolean
                  )
                  .map(
                    item => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {item ===
                        'PAZ_Y_SALVO'
                          ? 'PAZ Y SALVO'
                          : item}
                      </option>
                    )
                  )}
              </select>
            ) : (
              <div
                className="
                  border
                  border-gray-200
                  bg-gray-50
                  rounded-lg
                  px-3
                  py-2
                  text-[10px]
                  text-gray-500
                  flex
                  items-center
                "
              >
                <i className="lg:col-span-2 fas fa-receipt mr-2 text-blue-600"></i>

                Recibos de otros ingresos
              </div>
            )}

            {/* ==============================================
                CATEGORÍA
            ============================================== */}

            <select
              value={
                categoria
              }
              onChange={
                e =>
                  setCategoria(
                    e.target.value
                  )
              }
              className="lg:col-span-2 
                border
                border-gray-300
                rounded-lg
                px-3
                py-2
                text-xs
              "
            >
              <option value="">
                Todas las categorías
              </option>

              {CATEGORIAS
                .filter(
                  Boolean
                )
                .map(
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

            {/* ==============================================
                CONCEPTO
            ============================================== */}

            <select
              value={
                conceptoFiltro
              }
              onChange={
                e =>
                  setConceptoFiltro(
                    e.target.value
                  )
              }
              className="lg:col-span-2 
                border
                border-gray-300
                rounded-lg
                px-3
                py-2
                text-xs
              "
            >
              <option value="">
                Todos los conceptos
              </option>

              {conceptosIngreso.map(
                item => (
                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {item.nombre}
                  </option>
                )
              )}
            </select>

            <BotonActualizar
              type="button"
              onClick={async () => {
                await cargarTodo()

                if (tipoConsulta !== 'OBLIGACIONES') {
                  await cargarIngresosLibres()
                }
              }}
              disabled={cargando}
              className="w-full justify-center lg:col-span-1 !px-2"
            >
              <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
              Actualizar
            </BotonActualizar>
        </div>
        {/* ==================================================
    TABLA
================================================== */}

{tipoConsulta ===
  'OBLIGACIONES' ? (
  <MarcoTabla>
    <div
      className="
        px-4
        py-3
        flex
        justify-between
        items-center
        gap-3
      "
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

          Obligaciones de Aprendices
        </h2>

        <p
          className="
            text-[9px]
            text-gray-300
            mt-0.5
          "
        >
          Pagos pendientes, parciales y conceptos adicionales.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px]" style={{ color: ESTILO_SECCIONES.subtitulo }}>
          {cuentasFiltradas.length} registro(s)
        </span>
        <BotonAgregar
          type="button"
          onClick={() => setDrawerOtrosIngresos(true)}
        >
          <i className="fas fa-plus"></i>
          Registrar Ingreso
        </BotonAgregar>
      </div>
    </div>

    <div className="overflow-x-auto">
      <table
        className="
          w-full
          text-[11px]
          border-collapse
        "
      >
        <thead
          style={{
            backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo,
            color: ESTILO_ENCABEZADO_TABLA.texto,
          }}
        >
          <tr>
            <th className="border p-2">
              Matrícula
            </th>

            <th className="border p-2">
              Aprendiz
            </th>

            <th className="border p-2">
              Fecha matrícula
            </th>

            <th className="border p-2">
              Origen
            </th>

            <th className="border p-2">
              Categoría
            </th>

            <th className="border p-2">
              Concepto
            </th>

            <th className="border p-2">
              Valor
            </th>

            <th className="border p-2">
              Abonado
            </th>

            <th className="border p-2">
              Saldo
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
                colSpan="11"
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
          ) : cuentasFiltradas.length ===
            0 ? (
            <tr>
              <td
                colSpan="11"
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

                No hay obligaciones registradas.
              </td>
            </tr>
          ) : (
            cuentasFiltradas.map(
              cuenta => (
                <tr
                  key={
                    cuenta.id
                  }
                  className="
                    hover:bg-blue-50
                  "
                >
                  <td
                    className="
                      border
                      p-2
                      text-center
                      font-semibold
                    "
                  >
                    {cuenta
                      .consecutivo_matricula ||
                      '-'}
                  </td>

                  <td className="border p-2">
                    <div
                      className="
                        font-bold
                        text-gray-800
                      "
                    >
                      {nombreCompletoCuenta(
                        cuenta
                      )}
                    </div>

                    <div
                      className="
                        text-[9px]
                        text-gray-500
                      "
                    >
                      {cuenta.documento}
                    </div>
                  </td>

                  <td
                    className="
                      border
                      p-2
                      text-center
                      whitespace-nowrap
                    "
                  >
                    {formatearFecha(
                      fechaMatriculaCuenta(
                        cuenta
                      )
                    )}
                  </td>

                  <td className="border p-2">
                    <div
                      className="
                        text-[10px]
                        font-bold
                        text-gray-800
                      "
                    >
                      {origenCuentaVisible(
                        cuenta,
                        empresaNombre
                      )}
                    </div>

                    <div
                      className="
                        text-[9px]
                        text-gray-500
                        mt-0.5
                      "
                    >
                      {esCuentaConvenio(
                        cuenta
                      )
                        ? 'CONVENIO'
                        : 'DIRECTO'}
                    </div>
                  </td>

                  <td
                    className="
                      border
                      p-2
                      text-center
                      font-bold
                    "
                  >
                    {textoCategoriasCuenta(
                      cuenta
                    )}
                  </td>

                  <td className="border p-2">
                    <div className="font-semibold">
                      {conceptoPrincipalCuenta(
                        cuenta
                      )}
                    </div>

                    <div
                      className="
                        text-[9px]
                        text-gray-500
                      "
                    >
                      {textoCategoriasCuenta(
                        cuenta
                      )}
                    </div>
                  </td>

                  <td
                    className="
                      border
                      p-2
                      text-right
                      font-semibold
                    "
                  >
                    {formatearMoneda(
                      cuenta.valor_total
                    )}
                  </td>

                  <td
                    className="
                      border
                      p-2
                      text-right
                      font-semibold
                      text-blue-700
                    "
                  >
                    {formatearMoneda(
                      cuenta.total_abonado
                    )}
                  </td>

                  <td
                    className="
                      border
                      p-2
                      text-right
                      font-black
                    "
                  >
                    {formatearMoneda(
                      cuenta.saldo
                    )}
                  </td>

                  <td
                    className="
                      border
                      p-2
                      text-center
                    "
                  >
                    <BadgeEstado
                      estado={
                        cuenta.estado
                      }
                    />
                  </td>

                  <td
                    className="
                      border
                      p-2
                      text-center
                    "
                  >
                    {Number(
                      cuenta.saldo
                    ) >
                      0 &&
                    Array.isArray(
                      cuenta?.detalles
                    ) &&
                    cuenta.detalles.length >
                      0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          abrirRegistrarPago(
                            cuenta
                          )
                        }
                        className="
                          bg-emerald-600
                          hover:bg-emerald-700
                          text-white
                          rounded-lg
                          px-3
                          py-1.5
                          text-[10px]
                          font-bold
                        "
                      >
                        <i className="fas fa-dollar-sign mr-1"></i>

                        Registrar Pago
                      </button>
                    ) : (
                      <BotonVerDetalle
                        onClick={() =>
                          abrirDetalleCuenta(
                            cuenta
                          )
                        }
                        disabled={
                          cargandoDetalle
                        }
                        className="!px-3 !py-1.5 !text-[10px]"
                      >
                        <i className="fas fa-eye"></i>
                        Ver Detalle
                      </BotonVerDetalle>
                    )}
                  </td>
                </tr>
              )
            )
          )}
        </tbody>
      </table>
    </div>
  </MarcoTabla>
) : (
  <MarcoTabla>
    {/* ==============================================
        ENCABEZADO OTROS INGRESOS / REFUERZOS
    ============================================== */}

    <div
      className="
        px-4
        py-3
        flex
        justify-between
        items-center
        gap-3
      "
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
          <i className="fas fa-receipt mr-2"></i>

          {tipoConsulta ===
          'REFUERZOS'
            ? 'Refuerzos Prácticos'
            : 'Otros Ingresos'}
        </h2>

        <p
          className="
            text-[9px]
            text-gray-300
            mt-0.5
          "
        >
          {tipoConsulta ===
          'REFUERZOS'
            ? 'Pagos de clases prácticas de refuerzo registrados en Caja.'
            : 'Ingresos registrados sin obligación financiera de matrícula.'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px]" style={{ color: ESTILO_SECCIONES.subtitulo }}>
          {ingresosLibresFiltrados.length} registro(s)
        </span>
        <BotonAgregar
          type="button"
          onClick={() => setDrawerOtrosIngresos(true)}
        >
          <i className="fas fa-plus"></i>
          Registrar Ingreso
        </BotonAgregar>
      </div>
    </div>

    {/* ==============================================
        TABLA OTROS INGRESOS / REFUERZOS
    ============================================== */}

    <div className="overflow-x-auto">
      <table
        className="
          w-full
          text-[11px]
          border-collapse
        "
      >
        <thead
          style={{
            backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo,
            color: ESTILO_ENCABEZADO_TABLA.texto,
          }}
        >
          <tr>
            <th className="border p-2">
              Fecha
            </th>

            <th className="border p-2">
              Recibo
            </th>

            <th className="border p-2">
              Cliente
            </th>

            <th className="border p-2">
              Documento
            </th>

            <th className="border p-2">
              Celular
            </th>

            <th className="border p-2">
              Concepto
            </th>

            <th className="border p-2">
              Categoría
            </th>

            {tipoConsulta ===
              'REFUERZOS' && (
              <th className="border p-2">
                Clases
              </th>
            )}

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
          {cargandoIngresosLibres ? (
            <tr>
              <td
                colSpan={
                  tipoConsulta ===
                  'REFUERZOS'
                    ? 12
                    : 11
                }
                className="
                  p-10
                  text-center
                  text-gray-500
                "
              >
                <i className="fas fa-spinner fa-spin mr-2"></i>

                Consultando ingresos...
              </td>
            </tr>
          ) : ingresosLibresFiltrados
              .length ===
            0 ? (
            <tr>
              <td
                colSpan={
                  tipoConsulta ===
                  'REFUERZOS'
                    ? 11
                    : 10
                }
                className="
                  p-10
                  text-center
                  text-gray-500
                "
              >
                <i
                  className="
                    fas
                    fa-receipt
                    block
                    text-3xl
                    text-gray-300
                    mb-2
                  "
                ></i>

                {tipoConsulta ===
                'REFUERZOS'
                  ? 'No hay refuerzos prácticos registrados.'
                  : 'No hay otros ingresos registrados.'}
              </td>
            </tr>
          ) : (
            ingresosLibresFiltrados.map(
              recibo => {
                const consecutivo =
                  recibo
                    ?.consecutivo ||
                  `RC-${String(
                    recibo?.id ||
                    ''
                  ).padStart(
                    6,
                    '0'
                  )}`

                return (
                  <tr
                    key={
                      recibo.id
                    }
                    className="
                      hover:bg-blue-50
                    "
                  >
                    <td
                      className="
                        border
                        p-2
                        text-center
                        whitespace-nowrap
                      "
                    >
                      {formatearFecha(
                        recibo?.fecha
                      )}
                    </td>

                    <td
                      className="
                        border
                        p-2
                        text-center
                        font-black
                      "
                    >
                      {consecutivo}
                    </td>

                    <td className="border p-2">
                      <div
                        className="
                          font-bold
                          text-gray-800
                        "
                      >
                        {recibo
                          ?.nombre_cliente ||
                          recibo
                            ?.nombre_pagador ||
                          '-'}
                      </div>

                      {recibo
                        ?.correo_cliente && (
                        <div
                          className="
                            mt-0.5
                            text-[9px]
                            text-gray-500
                          "
                        >
                          {
                            recibo
                              .correo_cliente
                          }
                        </div>
                      )}
                    </td>

                    <td
                      className="
                        border
                        p-2
                        text-center
                      "
                    >
                      {recibo
                        ?.tipo_documento_cliente
                        ? `${recibo.tipo_documento_cliente} `
                        : ''}

                      {recibo
                        ?.documento_cliente ||
                        recibo
                          ?.documento ||
                        '-'}
                    </td>

                    <td
                      className="
                        border
                        p-2
                        text-center
                        whitespace-nowrap
                      "
                    >
                      {recibo
                        ?.celular_cliente ||
                        '-'}
                    </td>

                    <td className="border p-2">
                      <div
                        className="
                          font-semibold
                          text-gray-800
                        "
                      >
                        {recibo
                          ?.concepto
                          ?.nombre ||
                          recibo
                            ?.descripcion ||
                          '-'}
                      </div>
                    </td>

                    <td
                      className="
                        border
                        p-2
                        text-center
                        font-black
                        text-blue-700
                      "
                    >
                      {recibo
                        ?.categoria ||
                        '-'}
                    </td>

                    {tipoConsulta ===
                      'REFUERZOS' && (
                      <td
                        className="
                          border
                          p-2
                          text-center
                        "
                      >
                        <span
                          className="
                            inline-flex
                            min-w-8
                            justify-center
                            rounded-full
                            border
                            border-blue-200
                            bg-blue-50
                            px-2
                            py-1
                            font-black
                            text-blue-700
                          "
                        >
                          {Number(
                            recibo
                              ?.cantidad_clases_refuerzo ||
                            0
                          )}
                        </span>
                      </td>
                    )}

                    <td
                      className="
                        border
                        p-2
                        text-center
                      "
                    >
                      {nombreMedioPagoVisible(
                        recibo
                          ?.medio_pago
                          ?.nombre
                      ) ||
                        recibo
                          ?.medio_pago
                          ?.nombre ||
                        '-'}
                    </td>

                    <td
                      className="
                        border
                        p-2
                        text-right
                        font-black
                      "
                    >
                      {formatearMoneda(
                        recibo?.valor
                      )}
                    </td>

                    <td
                      className="
                        border
                        p-2
                        text-center
                      "
                    >
                      <span
                        className={`
                          inline-flex
                          rounded-full
                          border
                          px-2
                          py-1
                          text-[9px]
                          font-bold
                          ${
                            mayusculas(
                              recibo?.estado
                            ) ===
                            'ACTIVO'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }
                        `}
                      >
                        {mayusculas(
                          recibo?.estado
                        ) ||
                          '-'}
                      </span>
                    </td>
                    <td
                      className="
                        border
                        p-2
                        text-center
                      "
                    >
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            imprimirReciboOtrosIngresos(
                              {
                                tipo:
                                  'LIBRE',

                                recibo,

                                concepto:
                                  recibo?.concepto ||
                                  null,

                                medioPago:
                                  recibo?.medio_pago ||
                                  null,

                                cliente: {
                                  nombre:
                                    recibo?.nombre_cliente ||
                                    recibo?.nombre_pagador ||
                                    '',

                                  tipo_documento:
                                    recibo?.tipo_documento_cliente ||
                                    '',

                                  documento:
                                    recibo?.documento_cliente ||
                                    recibo?.documento ||
                                    '',

                                  celular:
                                    recibo?.celular_cliente ||
                                    '',
                                },

                                descripcion:
                                  recibo?.descripcion ||
                                  recibo?.concepto?.nombre ||
                                  '',

                                categoria:
                                  recibo?.categoria ||
                                  '',

                                cantidad_clases_refuerzo:
                                  Number(
                                    recibo
                                      ?.cantidad_clases_refuerzo ||
                                    0
                                  ),

                                valor:
                                  recibo?.valor ||
                                  0,

                                referencia:
                                  recibo?.referencia_pago ||
                                  '',

                                observaciones:
                                  recibo?.observaciones ||
                                  '',
                              },
                              {
                                empresaNombre,
                              }
                            )
                          } catch (
                            errorImpresion
                          ) {
                            console.error(
                              'Error imprimiendo recibo:',
                              errorImpresion
                            )

                            setError(
                              errorImpresion?.message ||
                              'No fue posible imprimir el recibo.'
                            )
                          }
                        }}
                        className="
                          bg-slate-700
                          hover:bg-slate-900
                          text-white
                          rounded-lg
                          px-3
                          py-1.5
                          text-[10px]
                          font-bold
                          whitespace-nowrap
                        "
                      >
                        <i className="fas fa-print mr-1"></i>

                        Imprimir
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
                    )}
                    </div>

        </MarcoTabla>

      {/* ====================================================
          DRAWER NUEVA OBLIGACIÓN
      ==================================================== */}

      {drawerConcepto && (
        <div
          className="
            fixed
            inset-0
            z-50
          "
        >
          <div
            className="
              absolute
              inset-0
              bg-black/40
            "
            onClick={() =>
              setDrawerConcepto(
                false
              )
            }
          ></div>

          <aside
            className="
              absolute
              right-0
              top-0
              h-full
              w-full
              sm:w-[560px]
              bg-white
              shadow-2xl
              overflow-y-auto
            "
          >
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
                items-start
                gap-3
              "
            >
              <div>
                <h2
                  className="
                    text-lg
                    font-black
                    text-[var(--primary)]
                  "
                >
                  Nueva Obligación
                </h2>

                <p
                  className="
                    text-xs
                    text-gray-500
                    mt-0.5
                  "
                >
                  {nombreCompletoMatricula(
                    matriculaConcepto
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDrawerConcepto(
                    false
                  )
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

            <div className="p-4 space-y-4">

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
                    bg-slate-800
                    text-white
                    px-3
                    py-2
                    text-xs
                    font-bold
                  "
                >
                  Datos del Aprendiz
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
                  <Dato
                    label="Documento"
                    value={
                      matriculaConcepto
                        ?.documento
                    }
                  />

                  <Dato
                    label="Matrícula"
                    value={
                      matriculaConcepto
                        ?.consecutivo
                    }
                  />

                  <Dato
                    label="Categoría"
                    value={
                      matriculaConcepto
                        ?.categoria
                    }
                  />

                  <Dato
                    label="Convenio"
                    value={
                      matriculaConcepto
                        ?.convenio
                    }
                  />
                </div>
              </div>

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
                    bg-slate-800
                    text-white
                    px-3
                    py-2
                    text-xs
                    font-bold
                  "
                >
                  Concepto
                </div>

                <div className="p-3 space-y-3">
                  <CampoSelect
                    label="Concepto"
                    value={
                      formConcepto
                        .concepto_id
                    }
                    onChange={
                      value =>
                        setFormConcepto(
                          actual => ({
                            ...actual,

                            concepto_id:
                              value,
                          })
                        )
                    }
                    options={
                      conceptosIngreso.map(
                        item => ({
                          value:
                            item.id,

                          label:
                            item.nombre,
                        })
                      )
                    }
                  />

                  <CampoInput
                    label="Valor acordado"
                    type="number"
                    value={
                      formConcepto
                        .valor_total
                    }
                    onChange={
                      value =>
                        setFormConcepto(
                          actual => ({
                            ...actual,

                            valor_total:
                              value,
                          })
                        )
                    }
                  />

                  <CampoSelect
                    label="Origen del pago"
                    value={
                      formConcepto
                        .origen_pago
                    }
                    onChange={
                      value =>
                        setFormConcepto(
                          actual => ({
                            ...actual,

                            origen_pago:
                              value,
                          })
                        )
                    }
                    options={
                      ORIGENES_PAGO.map(
                        item => ({
                          value:
                            item,

                          label:
                            item,
                        })
                      )
                    }
                  />

                  <CampoSelect
                    label="Convenio"
                    value={
                      formConcepto
                        .convenio_id
                    }
                    onChange={
                      value =>
                        setFormConcepto(
                          actual => ({
                            ...actual,

                            convenio_id:
                              value,
                          })
                        )
                    }
                    options={
                      convenios.map(
                        item => ({
                          value:
                            item.id,

                          label:
                            item.nombre,
                        })
                      )
                    }
                    permitirVacio
                  />

                  <CampoInput
                    label="Descripción"
                    value={
                      formConcepto
                        .descripcion
                    }
                    onChange={
                      value =>
                        setFormConcepto(
                          actual => ({
                            ...actual,

                            descripcion:
                              value,
                          })
                        )
                    }
                    placeholder="Ej. Bancolombia, Davivienda, Nequi..."
                  />

                  <CampoTextarea
                    label="Observaciones"
                    value={
                      formConcepto
                        .observaciones
                    }
                    onChange={
                      value =>
                        setFormConcepto(
                          actual => ({
                            ...actual,

                            observaciones:
                              value,
                          })
                        )
                    }
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={
                  crearObligacion
                }
                disabled={
                  procesando
                }
                className="
                  w-full
                  bg-[var(--primary)]
                  hover:bg-[var(--primary-dark)]
                  disabled:opacity-50
                  text-white
                  rounded-lg
                  py-3
                  text-xs
                  font-bold
                "
              >
                {procesando ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>

                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus-circle mr-2"></i>

                    Crear Obligación
                  </>
                )}
              </button>

            </div>
          </aside>
        </div>
      )}


      {/* ====================================================
          DRAWER COMPACTO REGISTRAR PAGO
      ==================================================== */}

      {drawerPago && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={cerrarDrawerPago}
          ></div>

          <aside
            className="
              absolute
              right-0
              top-0
              h-full
              w-full
              sm:w-[430px]
              bg-white
              shadow-2xl
              overflow-y-auto
            "
          >
            <div
              className="
                sticky
                top-0
                z-20
                bg-white
                border-b
                border-gray-300
                px-4
                py-3
                flex
                justify-between
                items-start
                gap-3
              "
            >
              <div>
                <p className="text-[9px] uppercase font-bold text-gray-500">
                  Caja · Ingreso
                </p>

                <h2 className="text-base font-black text-[var(--primary)] mt-0.5">
                  Registrar Pago
                </h2>

                <p className="text-[10px] text-gray-500 mt-0.5">
                  {nombreCompletoCuenta(cuentaPago)}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarDrawerPago}
                className="w-8 h-8 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="border border-gray-300 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <Dato
                    label="Matrícula"
                    value={cuentaPago?.consecutivo_matricula}
                  />

                  <Dato
                    label="Categoría"
                    value={textoCategoriasCuenta(
                      cuentaPago
                    )}
                  />

                  <Dato
                    label="Documento"
                    value={cuentaPago?.documento}
                  />

                  <Dato
                    label="Concepto"
                    value={conceptoPrincipalCuenta(
                      cuentaPago
                    )}
                  />

                  <Dato
                    label="Fecha matrícula"
                    value={formatearFecha(
                      fechaMatriculaCuenta(
                        cuentaPago
                      )
                    )}
                  />

                  <Dato
                    label={
                      esCuentaConvenio(
                        cuentaPago
                      )
                        ? 'Convenio'
                        : 'CEA'
                    }
                    value={origenCuentaVisible(
                      cuentaPago,
                      empresaNombre
                    )}
                  />

                  <Dato
                    label="Origen"
                    value={
                      esCuentaConvenio(
                        cuentaPago
                      )
                        ? 'CONVENIO'
                        : 'DIRECTO'
                    }
                  />
                </div>
              </div>

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
                    px-3
                    py-2
                    text-[10px]
                    font-bold
                    text-gray-700
                  "
                >
                  Desglose de la obligación
                </div>

                <div className="divide-y divide-gray-100">
                  {(Array.isArray(
                    cuentaPago?.detalles
                  )
                    ? cuentaPago.detalles
                    : []
                  ).map(
                    detalle => (
                      <div
                        key={detalle.id}
                        className="
                          px-3
                          py-2
                          flex
                          items-center
                          justify-between
                          gap-3
                        "
                      >
                        <div className="min-w-0">
                          <div
                            className="
                              text-[10px]
                              font-bold
                              text-gray-800
                            "
                          >
                            {detalle?.concepto?.nombre ||
                              detalle?.descripcion ||
                              'CONCEPTO'}
                          </div>

                          <div
                            className="
                              text-[9px]
                              text-gray-500
                            "
                          >
                            {(Array.isArray(
                              detalle?.categorias
                            )
                              ? detalle.categorias
                              : []
                            ).join(' / ') || '-'}
                          </div>
                        </div>

                        <div
                          className="
                            text-[10px]
                            font-black
                            text-gray-900
                            whitespace-nowrap
                          "
                        >
                          {formatearMoneda(
                            detalle?.valor
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <ResumenPago
                  label="Obligación"
                  value={formatearMoneda(cuentaPago?.valor_total)}
                />

                <ResumenPago
                  label="Abonado"
                  value={formatearMoneda(cuentaPago?.total_abonado)}
                />

                <ResumenPago
                  label="Saldo"
                  value={formatearMoneda(cuentaPago?.saldo)}
                />
              </div>

              <CampoInput
                label="Valor recibido"
                value={
                  formPago.valor
                    ? Number(
                        String(formPago.valor).replace(/\D/g, '')
                      ).toLocaleString('es-CO')
                    : ''
                }
                onChange={(value) => {
                  const valorLimpio = String(value || '').replace(/\D/g, '')

                  setFormPago((actual) => ({
                    ...actual,
                    valor: valorLimpio,
                  }))
                }}
              />

              <div className="grid grid-cols-2 gap-2">
                <CampoSelect
                  label="Medio de pago"
                  value={formPago.medio_pago_id}
                  onChange={value =>
                    setFormPago(actual => ({
                      ...actual,
                      medio_pago_id: value,
                    }))
                  }
                  options={mediosPago
                    .map(item => ({
                      value: item.id,
                      label: nombreMedioPagoVisible(
                        item.nombre
                      ),
                    }))
                    .filter(item => item.label)}
                />

                <CampoSelect
                  label="Pagado por"
                  value={formPago.pagado_por}
                  onChange={value =>
                    setFormPago(actual => ({
                      ...actual,
                      pagado_por: value,
                    }))
                  }
                  options={
                    opcionesPagadoPor
                  }
                />
              </div>

              <CampoInput
                label="Entidad financiera"
                value={formPago.referencia_pago}
                onChange={value =>
                  setFormPago(actual => ({
                    ...actual,
                    referencia_pago: value,
                  }))
                }
                placeholder="Ej. Bancolombia, Davivienda, Nequi..."
              />

              <CampoTextarea
                label="Observaciones"
                value={formPago.observaciones}
                onChange={value =>
                  setFormPago(actual => ({
                    ...actual,
                    observaciones: value,
                  }))
                }
              />

              <button
                type="button"
                onClick={registrarPago}
                disabled={procesando}
                className="
                  w-full
                  bg-emerald-600
                  hover:bg-emerald-700
                  disabled:opacity-50
                  text-white
                  rounded-lg
                  py-2.5
                  text-xs
                  font-bold
                "
              >
                {procesando ? 'Registrando...' : 'Registrar Pago'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ====================================================
          DRAWER DETALLE FINANCIERO
      ==================================================== */}

      {drawerDetalle && detalleFinanciero && (
        <div className="fixed inset-0 z-[55]">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={cerrarDrawerDetalle}
          ></div>

          <aside
            className="
              absolute
              right-0
              top-0
              h-full
              w-full
              sm:w-[500px]
              bg-white
              shadow-2xl
              overflow-y-auto
            "
          >
            <div
              className="
                sticky
                top-0
                z-20
                bg-white
                border-b
                border-gray-300
                px-4
                py-3
                flex
                justify-between
                items-start
                gap-3
              "
            >
              <div>
                <p className="text-[9px] uppercase font-bold text-gray-500">
                  Caja · Consulta
                </p>

                <h2 className="text-base font-black text-[var(--primary)] mt-0.5">
                  Detalle Financiero
                </h2>

                <p className="text-[10px] text-gray-500 mt-0.5">
                  {nombreCompletoCuenta(
                    detalleFinanciero?.cuenta
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarDrawerDetalle}
                className="w-8 h-8 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="border border-gray-300 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <Dato
                    label="Matrícula"
                    value={
                      detalleFinanciero
                        ?.cuenta
                        ?.consecutivo_matricula
                    }
                  />

                  <Dato
                    label="Categoría"
                    value={textoCategoriasCuenta(
                      detalleFinanciero?.cuenta
                    )}
                  />

                  <Dato
                    label="Documento"
                    value={
                      detalleFinanciero
                        ?.cuenta
                        ?.documento
                    }
                  />

                  <Dato
                    label="Fecha matrícula"
                    value={formatearFecha(
                      fechaMatriculaCuenta(
                        detalleFinanciero?.cuenta
                      )
                    )}
                  />

                  <Dato
                    label={
                      esCuentaConvenio(
                        detalleFinanciero?.cuenta
                      )
                        ? 'Convenio'
                        : 'CEA'
                    }
                    value={origenCuentaVisible(
                      detalleFinanciero?.cuenta,
                      empresaNombre
                    )}
                  />

                  <div>
                    <div
                      className="
                        text-[9px]
                        uppercase
                        tracking-wide
                        text-gray-500
                      "
                    >
                      Estado
                    </div>

                    <div className="mt-1">
                      <BadgeEstado
                        estado={
                          detalleFinanciero
                            ?.cuenta
                            ?.estado
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <ResumenPago
                  label="Obligación"
                  value={formatearMoneda(
                    detalleFinanciero
                      ?.cuenta
                      ?.valor_total
                  )}
                />

                <ResumenPago
                  label="Abonado"
                  value={formatearMoneda(
                    detalleFinanciero
                      ?.cuenta
                      ?.total_abonado
                  )}
                />

                <ResumenPago
                  label="Saldo"
                  value={formatearMoneda(
                    detalleFinanciero
                      ?.cuenta
                      ?.saldo
                  )}
                />
              </div>

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
                    px-3
                    py-2
                    text-[10px]
                    font-bold
                    text-gray-700
                  "
                >
                  Desglose de la obligación
                </div>

                {Array.isArray(
                  detalleFinanciero
                    ?.cuenta
                    ?.detalles
                ) &&
                detalleFinanciero
                  .cuenta
                  .detalles
                  .length >
                  0 ? (
                  <div className="divide-y divide-gray-100">
                    {detalleFinanciero
                      .cuenta
                      .detalles
                      .map(
                        detalle => (
                          <div
                            key={detalle.id}
                            className="
                              px-3
                              py-2
                              flex
                              items-center
                              justify-between
                              gap-3
                            "
                          >
                            <div>
                              <div className="text-[10px] font-bold text-gray-800">
                                {detalle?.concepto?.nombre ||
                                  detalle?.descripcion ||
                                  'CONCEPTO'}
                              </div>

                              <div className="text-[9px] text-gray-500">
                                {(Array.isArray(
                                  detalle?.categorias
                                )
                                  ? detalle.categorias
                                  : []
                                ).join(' / ') || '-'}
                              </div>
                            </div>

                            <div className="text-[10px] font-black whitespace-nowrap">
                              {formatearMoneda(
                                detalle?.valor
                              )}
                            </div>
                          </div>
                        )
                      )}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 text-amber-800 text-[10px]">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Registro histórico sin desglose financiero. Puede consultar
                    sus recibos existentes, pero no registrar nuevos abonos.
                  </div>
                )}
              </div>

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
                    gap-2
                  "
                >
                  <span className="text-[10px] font-bold">
                    Historial de Recibos
                  </span>

                  <span className="text-[9px] text-gray-300">
                    {Array.isArray(
                      detalleFinanciero?.recibos
                    )
                      ? detalleFinanciero.recibos.length
                      : 0}{' '}
                    registro(s)
                  </span>
                </div>

                {!Array.isArray(
                  detalleFinanciero?.recibos
                ) ||
                detalleFinanciero
                  .recibos
                  .length ===
                  0 ? (
                  <div className="p-4 text-center text-[10px] text-gray-500">
                    No hay recibos registrados para esta obligación.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {detalleFinanciero
                      .recibos
                      .map(
                        recibo => (
                          <div
                            key={recibo.id}
                            className="
                              p-3
                              flex
                              items-center
                              justify-between
                              gap-3
                            "
                          >
                            <div>
                              <div className="text-[10px] font-black text-gray-800">
                                {recibo.consecutivo ||
                                  `RC-${String(
                                    recibo.id
                                  ).padStart(
                                    6,
                                    '0'
                                  )}`}
                              </div>

                              <div className="text-[9px] text-gray-500 mt-0.5">
                                {formatearFecha(
                                  recibo.fecha
                                )}
                                {' · '}
                                {nombreMedioPagoVisible(
                                  recibo
                                    ?.medio_pago
                                    ?.nombre
                                ) ||
                                  recibo
                                    ?.medio_pago
                                    ?.nombre ||
                                  '-'}
                              </div>

                              <div
                                className={`text-[9px] mt-0.5 font-bold ${
                                  mayusculas(
                                    recibo.estado
                                  ) ===
                                  'ANULADO'
                                    ? 'text-red-600'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {mayusculas(
                                  recibo.estado
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-[11px] font-black text-gray-900">
                                {formatearMoneda(
                                  recibo.valor
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  imprimirRecibo(
                                    recibo,
                                    detalleFinanciero
                                  )
                                }
                                className="
                                  mt-1
                                  bg-blue-600
                                  hover:bg-blue-700
                                  text-white
                                  rounded-md
                                  px-2
                                  py-1
                                  text-[9px]
                                  font-bold
                                "
                              >
                                <i className="fas fa-print mr-1"></i>
                                Imprimir
                              </button>
                            </div>
                          </div>
                        )
                      )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

            {/* ====================================================
          DRAWER OTROS INGRESOS
      ==================================================== */}

      <OtrosIngresosDrawer
        abierto={
          drawerOtrosIngresos
        }

        onCerrar={() =>
          setDrawerOtrosIngresos(
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

        postCaja={
          postCaja
        }

        construirUrl={
          construirUrl
        }

        onActualizado={
          async () => {
            await Promise.all([
              cargarParametros(),
              cargarCuentas(),
              cargarResumen(),

              tipoConsulta !==
                'OBLIGACIONES'
                ? cargarIngresosLibres()
                : Promise.resolve(),
            ])
          }
        }
      />

    </div>
  )
}

// =========================================================
// RESUMEN PAGO
// =========================================================

function ResumenPago({ label, value }) {
  return (
    <div className="border border-gray-200 bg-gray-50 rounded-lg p-2 text-center">
      <div className="text-[8px] uppercase font-bold text-gray-500">
        {label}
      </div>

      <div className="text-[11px] font-black text-gray-900 mt-1">
        {value}
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

// =========================================================
// INPUT
// =========================================================

function CampoInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}) {
  return (
    <div>
      <label
        className="
          block
          text-[10px]
          font-semibold
          text-gray-600
          mb-1
        "
      >
        {label}
      </label>

      <input
        type={
          type
        }
        value={
          value
        }
        onChange={
          e =>
            onChange(
              e.target.value
            )
        }
        placeholder={
          placeholder
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
      />
    </div>
  )
}

// =========================================================
// SELECT
// =========================================================

function CampoSelect({
  label,
  value,
  onChange,
  options,
  permitirVacio = false,
}) {
  return (
    <div>
      <label
        className="
          block
          text-[10px]
          font-semibold
          text-gray-600
          mb-1
        "
      >
        {label}
      </label>

      <select
        value={
          value
        }
        onChange={
          e =>
            onChange(
              e.target.value
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
        <option value="">
          {permitirVacio
            ? 'Sin selección'
            : 'Seleccione...'}
        </option>

        {options.map(
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
  )
}

// =========================================================
// TEXTAREA
// =========================================================

function CampoTextarea({
  label,
  value,
  onChange,
}) {
  return (
    <div>
      <label
        className="
          block
          text-[10px]
          font-semibold
          text-gray-600
          mb-1
        "
      >
        {label}
      </label>

      <textarea
        rows={3}
        value={
          value
        }
        onChange={
          e =>
            onChange(
              e.target.value
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
          resize-none
        "
      />
    </div>
  )
}