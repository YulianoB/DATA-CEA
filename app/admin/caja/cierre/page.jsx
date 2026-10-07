// app/admin/caja/cierre/page.jsx

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

import { WalletCards } from 'lucide-react'

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'

import {
  BotonActualizar,
  BotonVerDetalle,
  MarcoTabla,
  TituloSeccion,
} from '@/components/admin/EstiloModulo'

import {
  imprimirCierreCaja,
} from './components/imprimirCierreCaja'

// =========================================================
// CONSTANTES
// =========================================================

const API_URL =
  '/api/admin/caja/cierre'

const TIPOS_CIERRE = [
  {
    value:
      'TURNO',

    label:
      'Arqueo de Turno',

    descripcion:
      'Entrega y recepción de caja entre funcionarios.',

    icono:
      'fas fa-right-left',
  },

  {
    value:
      'DIARIO',

    label:
      'Cierre Diario',

    descripcion:
      'Cierre definitivo y consolidado de la jornada.',

    icono:
      'fas fa-calendar-check',
  },
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

  const valor =
    String(
      fecha
    ).slice(
      0,
      10
    )

  const partes =
    valor.split(
      '-'
    )

  if (
    partes.length !==
    3
  ) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function formatearFechaHora(
  valor
) {
  if (
    !valor
  ) {
    return '-'
  }

  try {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        timeZone:
          'America/Bogota',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',

        hour:
          '2-digit',

        minute:
          '2-digit',
      }
    ).format(
      new Date(
        valor
      )
    )
  } catch {
    return valor
  }
}

function formatearValorInput(
  valor
) {
  const limpio =
    String(
      valor ??
      ''
    ).replace(
      /\D/g,
      ''
    )

  if (
    !limpio
  ) {
    return ''
  }

  return Number(
    limpio
  ).toLocaleString(
    'es-CO'
  )
}

function limpiarValorInput(
  valor
) {
  return String(
    valor ??
    ''
  ).replace(
    /\D/g,
    ''
  )
}

function nombreTipoCierre(
  tipo
) {
  return (
    tipo ===
    'TURNO'
      ? 'ARQUEO DE TURNO'
      : 'CIERRE DIARIO'
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
    const error =
      new Error(
        data?.message ||
        data?.error ||
        `Error HTTP ${response.status}`
      )

    error.status =
      response.status

    error.data =
      data

    throw error
  }

  return data
}

// =========================================================
// BADGES
// =========================================================

function BadgeTipo({
  tipo,
}) {
  const esTurno =
    tipo ===
    'TURNO'

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
        font-black
        ${
          esTurno
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }
      `}
    >
      {esTurno
        ? 'ARQUEO DE TURNO'
        : 'CIERRE DIARIO'}
    </span>
  )
}

function BadgeDiferencia({
  valor,
}) {
  const numero =
    Number(
      valor ||
      0
    )

  if (
    numero ===
    0
  ) {
    return (
      <span
        className="
          inline-flex
          rounded-full
          border
          border-emerald-200
          bg-emerald-50
          text-emerald-700
          px-2.5
          py-1
          text-[9px]
          font-black
        "
      >
        CUADRADO
      </span>
    )
  }

  if (
    numero >
    0
  ) {
    return (
      <span
        className="
          inline-flex
          rounded-full
          border
          border-blue-200
          bg-blue-50
          text-blue-700
          px-2.5
          py-1
          text-[9px]
          font-black
        "
      >
        SOBRANTE
      </span>
    )
  }

  return (
    <span
      className="
        inline-flex
        rounded-full
        border
        border-red-200
        bg-red-50
        text-red-700
        px-2.5
        py-1
        text-[9px]
        font-black
      "
    >
      FALTANTE
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
      className="
        border
        border-gray-200
        bg-white
        rounded-xl
        p-4
        shadow-sm
      "
    >
      <div
        className="
          flex
          justify-between
          items-start
          gap-3
        "
      >
        <div>
          <div
            className="
              text-[9px]
              uppercase
              tracking-wide
              font-black
              text-gray-500
            "
          >
            {titulo}
          </div>

          <div
            className="
              text-xl
              font-black
              text-gray-900
              mt-1
            "
          >
            {valor}
          </div>

          {subtitulo && (
            <div
              className="
                text-[9px]
                text-gray-500
                mt-1
              "
            >
              {subtitulo}
            </div>
          )}
        </div>

        <div
          className="
            w-10
            h-10
            rounded-xl
            bg-slate-100
            text-slate-700
            flex
            items-center
            justify-center
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

export default function CierreCajaPage() {
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
    })

  const [
    sesionLista,
    setSesionLista,
  ] =
    useState(
      false
    )

  // =======================================================
  // OPERACIÓN
  // =======================================================

  const [
    tipoCierre,
    setTipoCierre,
  ] =
    useState(
      'TURNO'
    )

  const [
    fecha,
    setFecha,
  ] =
    useState(
      hoyColombia()
    )

  // El CEA no maneja base inicial de caja.
  // Cada período de arqueo inicia en $0.
  const saldoInicial =
    '0'

  const [
    efectivoContado,
    setEfectivoContado,
  ] =
    useState('')

  const [
    usuarioEntrega,
    setUsuarioEntrega,
  ] =
    useState('')

  const [
    usuarioRecibe,
    setUsuarioRecibe,
  ] =
    useState('')

  const [
    observaciones,
    setObservaciones,
  ] =
    useState('')

  // =======================================================
  // ARQUEO
  // =======================================================

  const [
    arqueo,
    setArqueo,
  ] =
    useState(
      null
    )

  const [
    cierreDiarioRealizado,
    setCierreDiarioRealizado,
  ] =
    useState(
      null
    )

  // =======================================================
  // HISTORIAL
  // =======================================================

  const [
    cierres,
    setCierres,
  ] =
    useState([])

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

  // =======================================================
  // DETALLE
  // =======================================================

  const [
    drawerDetalle,
    setDrawerDetalle,
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
    calculando,
    setCalculando,
  ] =
    useState(
      false
    )

  const [
    guardando,
    setGuardando,
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
  // IMPRIMIR
  // =======================================================

  function imprimirCierreDesdePagina(
    cierre
  ) {
    if (
      !cierre
    ) {
      return
    }

    try {
      imprimirCierreCaja(
        cierre,
        {
          empresa: {
            nombre:
              empresaDatos?.nombre ||
              empresaNombre,

            razon_social:
              empresaDatos?.razon_social ||
              empresaDatos?.nombre ||
              empresaNombre,

            nit:
              empresaDatos?.nit ||
              nit,

            direccion:
              empresaDatos?.direccion ||
              '',

            ciudad:
              empresaDatos?.ciudad ||
              '',

            departamento:
              empresaDatos?.departamento ||
              '',

            telefono:
              empresaDatos?.telefono ||
              '',

            email:
              empresaDatos?.email ||
              '',
          },

          empresaNombre:
            empresaDatos?.nombre ||
            empresaNombre,

          nit:
            empresaDatos?.nit ||
            nit,
        }
      )
    } catch (
      errorImpresion
    ) {
      console.error(
        'Error imprimiendo cierre:',
        errorImpresion
      )

      setError(
        errorImpresion?.message ||
        'No fue posible abrir la impresión.'
      )
    }
  }

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

        const nombreUsuario =
          mayusculas(
            obtenerNombreUsuario(
              usuario
            )
          )

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

        setUsuarioEntrega(
          nombreUsuario
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
  // EMPRESA
  // =======================================================

  const actualizarEmpresa =
    useCallback(
      (
        empresa
      ) => {
        if (
          !empresa
        ) {
          return
        }

        setEmpresaDatos(
          actual => ({
            ...actual,
            ...empresa,
          })
        )

        if (
          empresa?.nombre
        ) {
          setEmpresaNombre(
            empresa.nombre
          )
        }
      },
      []
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
  // CALCULAR AUTOMÁTICAMENTE
  // =======================================================

  const calcularArqueo =
    useCallback(
      async () => {
        if (
          !nit
        ) {
          return
        }

        setCalculando(
          true
        )

        setError('')

        try {
          const extras = {
            fecha,

            tipo_cierre:
              tipoCierre,
          }

          if (
            texto(
              saldoInicial
            )
          ) {
            extras.saldo_inicial_efectivo =
              Number(
                saldoInicial
              )
          }

          const data =
            await fetchJsonSeguro(
              construirUrl(
                'arqueo',
                extras
              )
            )

          setArqueo(
            data?.data ||
            null
          )

          setCierreDiarioRealizado(
            null
          )

          actualizarEmpresa(
            data?.empresa
          )

          if (
            !texto(
              saldoInicial
            ) &&
            data
              ?.data
              ?.saldo_inicial_efectivo !==
              undefined
          ) {
            setSaldoInicial(
              String(
                data
                  .data
                  .saldo_inicial_efectivo ||
                0
              )
            )
          }
        } catch (
          errorArqueo
        ) {
          // =================================================
          // CIERRE DIARIO YA EXISTENTE
          // =================================================

          if (
            errorArqueo?.status ===
              409 &&
            errorArqueo
              ?.data
              ?.data
              ?.cierre_existente
          ) {
            const cierreExistente =
              errorArqueo
                .data
                .data
                .cierre_existente

            setArqueo(
              null
            )

            setCierreDiarioRealizado(
              cierreExistente
            )

            setError('')

            setMensaje(
              `La caja del ${fecha} ya fue cerrada con el consecutivo ${
                cierreExistente?.consecutivo ||
                `#${cierreExistente?.id || ''}`
              }.`
            )

            return
          }

          console.error(
            'Error calculando cierre:',
            errorArqueo
          )

          setArqueo(
            null
          )

          setError(
            errorArqueo?.message ||
            'No fue posible actualizar los movimientos de caja.'
          )
        } finally {
          setCalculando(
            false
          )
        }
      },
      [
        nit,
        fecha,
        tipoCierre,
        saldoInicial,
        construirUrl,
        actualizarEmpresa,
      ]
    )

  // =======================================================
  // HISTORIAL
  // =======================================================

  const cargarHistorial =
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
              'historial',
              {
                fecha_inicio:
                  fechaInicio,

                fecha_fin:
                  fechaFin,

                tipo_cierre:
                  'TURNO',
              }
            )
          )

        setCierres(
          Array.isArray(
            data?.data
          )
            ? data.data
            : []
        )

        actualizarEmpresa(
          data?.empresa
        )
      },
      [
        nit,
        construirUrl,
        fechaInicio,
        fechaFin,
        actualizarEmpresa,
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

      const cargar =
        async () => {
          setCargando(
            true
          )

          try {
            await Promise.all([
              cargarHistorial(),
            ])
          } catch (
            errorCarga
          ) {
            setError(
              errorCarga?.message ||
              'No fue posible cargar el módulo.'
            )
          } finally {
            setCargando(
              false
            )
          }
        }

      cargar()
    },
    [
      sesionLista,
      nit,
    ]
  )

  // =======================================================
  // HISTORIAL AUTOMÁTICO POR FECHA
  // =======================================================

  useEffect(
    () => {
      if (
        !sesionLista ||
        !nit
      ) {
        return
      }

      const timer =
        setTimeout(
          () => {
            cargarHistorial()
              .catch(
                errorHistorial => {
                  setError(
                    errorHistorial?.message ||
                    'No fue posible actualizar el historial de arqueos.'
                  )
                }
              )
          },
          250
        )

      return () =>
        clearTimeout(
          timer
        )
    },
    [
      sesionLista,
      nit,
      fechaInicio,
      fechaFin,
      cargarHistorial,
    ]
  )

  // =======================================================
  // CÁLCULO AUTOMÁTICO
  // =======================================================

  useEffect(
    () => {
      if (
        !sesionLista ||
        !nit
      ) {
        return
      }

      const timer =
        setTimeout(
          () => {
            calcularArqueo()
              .catch(
                () => {}
              )
          },
          300
        )

      return () =>
        clearTimeout(
          timer
        )
    },
    [
      sesionLista,
      nit,
      fecha,
      tipoCierre,
      saldoInicial,
    ]
  )

  // =======================================================
  // CAMBIO TIPO
  // =======================================================

  useEffect(
    () => {
      setArqueo(
        null
      )

      setCierreDiarioRealizado(
        null
      )

      setEfectivoContado('')
      setObservaciones('')
      setMensaje('')

      if (
        tipoCierre ===
        'DIARIO'
      ) {
        setUsuarioRecibe('')
      } else {
        setUsuarioEntrega(
          mayusculas(
            usuarioOperacion
          )
        )
      }
    },
    [
      tipoCierre,
    ]
  )

  // =======================================================
  // DIFERENCIA
  // =======================================================

  const diferenciaActual =
    useMemo(
      () => {
        if (
          !arqueo ||
          !texto(
            efectivoContado
          )
        ) {
          return null
        }

        return (
          Number(
            efectivoContado ||
            0
          ) -
          Number(
            arqueo
              ?.efectivo_esperado ||
            0
          )
        )
      },
      [
        arqueo,
        efectivoContado,
      ]
    )

  // =======================================================
  // REGISTRAR
  // =======================================================

  async function registrarCierre() {
    setError('')
    setMensaje('')

    if (
      tipoCierre ===
        'DIARIO' &&
      cierreDiarioRealizado
    ) {
      setMensaje(
        `Esta fecha ya tiene cierre diario ${
          cierreDiarioRealizado?.consecutivo ||
          ''
        }.`
      )

      return
    }

    if (
      !arqueo
    ) {
      setError(
        'Los movimientos todavía no están disponibles.'
      )

      return
    }

    if (
      !texto(
        efectivoContado
      )
    ) {
      setError(
        'Ingrese el efectivo contado.'
      )

      return
    }

    if (
      tipoCierre ===
        'TURNO' &&
      !texto(
        usuarioEntrega
      )
    ) {
      setError(
        'No fue posible identificar quién entrega la caja.'
      )

      return
    }

    const confirmar =
      window.confirm(
        tipoCierre ===
          'TURNO'
          ? '¿Está seguro de registrar este arqueo de turno?'
          : '¿Está seguro de realizar el cierre diario?'
      )

    if (
      !confirmar
    ) {
      return
    }

    setGuardando(
      true
    )

    try {
      const data =
        await fetchJsonSeguro(
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
                accion:
                  'cerrar',

                nit,

                fecha,

                tipo_cierre:
                  tipoCierre,

                periodo_desde:
                  arqueo
                    ?.periodo_desde,

                periodo_hasta:
                  arqueo
                    ?.periodo_hasta,

                saldo_inicial_efectivo:
                  Number(
                    saldoInicial ||
                    0
                  ),

                efectivo_contado:
                  Number(
                    efectivoContado ||
                    0
                  ),

                usuario:
                  usuarioOperacion,

                usuario_cierre:
                  usuarioOperacion,

                usuario_entrega:
                  tipoCierre ===
                  'TURNO'
                    ? usuarioEntrega
                    : usuarioOperacion,

                usuario_recibe:
                  tipoCierre ===
                  'TURNO'
                    ? usuarioRecibe
                    : null,

                observaciones:
                  texto(
                    observaciones
                  ) ||
                  null,
              }),
          }
        )

      actualizarEmpresa(
        data?.empresa
      )

      setMensaje(
        data?.message ||
        'Operación registrada correctamente.'
      )

      setEfectivoContado('')
      setObservaciones('')

      // ===================================================
      // TURNO
      // ===================================================

      if (
        tipoCierre ===
        'TURNO'
      ) {
        // El siguiente usuario que inicie sesión continuará
        // operando la caja. El destino físico no define
        // quién entrega el siguiente turno.
        setUsuarioEntrega(
          mayusculas(
            usuarioOperacion
          )
        )

        setUsuarioRecibe('')

        await cargarHistorial()

        // Espera mínima para que la API tome el cierre
        // recién creado como inicio del siguiente turno.
        setTimeout(
          () => {
            calcularArqueo()
              .catch(
                () => {}
              )
          },
          200
        )
      }

      // ===================================================
      // DIARIO
      // ===================================================

      if (
        tipoCierre ===
        'DIARIO'
      ) {
        setCierreDiarioRealizado(
          data?.data ||
          null
        )

        setArqueo(
          null
        )

        await cargarHistorial()
      }
    } catch (
      errorCierre
    ) {
      console.error(
        'Error registrando cierre:',
        errorCierre
      )

      setError(
        errorCierre?.message ||
        'No fue posible registrar la operación.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }

  // =======================================================
  // DETALLE
  // =======================================================

  async function abrirDetalle(
    cierre
  ) {
    if (
      !cierre?.id
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
                cierre.id,
            }
          )
        )

      setDetalle(
        data?.data ||
        null
      )

      actualizarEmpresa(
        data?.empresa
      )

      setDrawerDetalle(
        true
      )
    } catch (
      errorDetalle
    ) {
      setError(
        errorDetalle?.message ||
        'No fue posible consultar el detalle.'
      )
    } finally {
      setCargandoDetalle(
        false
      )
    }
  }

  // =======================================================
  // ACTUALIZAR TODO
  // =======================================================

  async function actualizarTodo() {
    setCargando(
      true
    )

    setError('')

    try {
      await Promise.all([
        cargarHistorial(),
        calcularArqueo(),
      ])
    } catch (
      errorActualizar
    ) {
      setError(
        errorActualizar?.message ||
        'No fue posible actualizar la información.'
      )
    } finally {
      setCargando(
        false
      )
    }
  }

  // =======================================================
  // SESIÓN CARGANDO
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

        Cargando cierre de caja...
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
        className="
          max-w-7xl
          mx-auto
          bg-white
          border
          border-gray-200
          rounded-xl
          shadow-lg
          p-4
          md:p-6
        "
      >

        <EncabezadoModulo
          titulo="Cierre de Caja"
          subtitulo="Arqueos de turno, entrega de caja y cierre diario de la jornada."
          icono={WalletCards}
          rutaRegreso="/admin/caja"
          textoRegreso="Volver a Caja"
        />

        <div className="flex justify-end px-4 pt-4 md:px-6">
          <BotonActualizar
            onClick={actualizarTodo}
            disabled={cargando}
          >
            <i
              className={`fas fa-sync-alt mr-2 ${cargando ? 'fa-spin' : ''}`}
            ></i>
            Actualizar
          </BotonActualizar>
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
            TIPO DE CIERRE
        ================================================== */}

        <div className="px-4 pt-1 md:px-6">
          <div
            className="
              inline-flex
              max-w-full
              items-center
              gap-1
              rounded-lg
              border
              border-slate-200
              bg-slate-100
              p-1
            "
            role="tablist"
            aria-label="Tipo de cierre"
          >
            {TIPOS_CIERRE.map(
              item => {
                const activo =
                  tipoCierre ===
                  item.value

                return (
                  <button
                    key={item.value}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    onClick={() => {
                      setError('')
                      setMensaje('')
                      setTipoCierre(
                        item.value
                      )
                    }}
                    className={`
                      inline-flex
                      items-center
                      gap-2
                      whitespace-nowrap
                      rounded-md
                      border
                      px-3
                      py-2
                      text-xs
                      font-bold
                      transition-all
                      duration-200
                      ${
                        activo
                          ? 'border-[#24638C] bg-[#24638C] text-white shadow-md -translate-y-0.5'
                          : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-[#24638C] hover:bg-[#E8F3FA] hover:text-[#24638C] hover:-translate-y-0.5'
                      }
                    `}
                  >
                    <i
                      className={item.icono}
                    ></i>

                    {item.label}
                  </button>
                )
              }
            )}
          </div>
        </div>

        {/* ==================================================
            CAJA CERRADA
        ================================================== */}

        {tipoCierre ===
          'DIARIO' &&
          cierreDiarioRealizado && (
          <div
            className="
              mb-4
              border
              border-emerald-300
              bg-emerald-50
              rounded-xl
              p-4
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <div
                className="
                  w-11
                  h-11
                  rounded-xl
                  bg-emerald-100
                  text-emerald-700
                  flex
                  items-center
                  justify-center
                "
              >
                <i className="fas fa-lock"></i>
              </div>

              <div>
                <div
                  className="
                    text-xs
                    font-black
                    text-emerald-800
                  "
                >
                  CAJA CERRADA
                </div>

                <div
                  className="
                    text-[10px]
                    text-emerald-700
                    mt-1
                  "
                >
                  El cierre diario para esta fecha ya fue realizado.
                </div>

                <div
                  className="
                    text-sm
                    font-black
                    text-emerald-900
                    mt-1
                  "
                >
                  {cierreDiarioRealizado
                    ?.consecutivo ||
                    `#${cierreDiarioRealizado?.id || ''}`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            FLUJO PRINCIPAL
        ================================================== */}

        {tipoCierre === 'TURNO' && arqueo && (
          <div className="px-4 pb-2 pt-4 md:px-6">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">Arqueo de Turno</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Verifique el efectivo esperado, cuente el dinero físico y registre cómo deja la caja.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <i className="fas fa-user-check text-[#24638C]"></i>
                <div>
                  <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Responsable del arqueo</div>
                  <div className="text-[10px] font-black text-slate-700">{usuarioOperacion || '-'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
              <section className="flex min-h-[310px] flex-col overflow-hidden rounded-xl border-2 border-slate-400 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#24638C] text-xs font-black text-white">1</span>
                  <div>
                    <h3 className="text-xs font-black text-slate-800">Período del arqueo</h3>
                    <p className="text-[9px] text-slate-500">Confirme qué movimientos se revisarán.</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-4">
                  <CampoInput label="Fecha del arqueo" type="date" value={fecha} onChange={setFecha} destacado />
                  <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                    <div className="text-[8px] font-bold uppercase text-slate-500">Período calculado</div>
                    <div className="mt-2 space-y-2">
                      <Dato label="Desde" value={formatearFechaHora(arqueo?.periodo_desde)} />
                      <Dato label="Hasta" value={formatearFechaHora(arqueo?.periodo_hasta)} />
                    </div>
                  </div>
                  <div className="mt-auto rounded-lg border border-blue-200 bg-blue-50 p-3 text-[9px] leading-relaxed text-blue-700">
                    <i className="fas fa-circle-info mr-1"></i>
                    El arqueo inicia en $0. El sistema calcula únicamente los movimientos en efectivo registrados durante este período.
                  </div>
                </div>
              </section>

              <section className="flex min-h-[310px] flex-col overflow-hidden rounded-xl border-2 border-slate-400 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#24638C] text-xs font-black text-white">2</span>
                  <div>
                    <h3 className="text-xs font-black text-slate-800">Efectivo esperado</h3>
                    <p className="text-[9px] text-slate-500">Valor calculado por el sistema.</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                    <div className="text-[8px] font-bold uppercase text-slate-500">Ingresos en efectivo</div>
                    <div className="mt-1 text-sm font-black text-slate-800">{formatearMoneda(arqueo?.ingresos_efectivo)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                    <div className="text-[8px] font-bold uppercase text-slate-500">Egresos en efectivo</div>
                    <div className="mt-1 text-sm font-black text-slate-800">{formatearMoneda(arqueo?.egresos_efectivo)}</div>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <div className="text-[8px] font-bold uppercase text-blue-700">Debe haber en caja</div>
                    <div className="mt-1 text-lg font-black text-blue-900">{formatearMoneda(arqueo?.efectivo_esperado)}</div>
                  </div>
                  <details className="mt-auto rounded-lg border border-slate-200">
                    <summary className="cursor-pointer px-3 py-2 text-[9px] font-bold text-[#24638C] hover:bg-slate-50">Ver cómo se calculó</summary>
                    <div className="space-y-2 border-t border-slate-200 p-3">
                      <DatoMoneda label="Ingresos" value={arqueo?.total_ingresos_sistema} />
                      <DatoMoneda label="Egresos" value={arqueo?.total_egresos_sistema} />
                      <Dato label="Desde" value={formatearFechaHora(arqueo?.periodo_desde)} />
                      <Dato label="Hasta" value={formatearFechaHora(arqueo?.periodo_hasta)} />
                    </div>
                  </details>
                </div>
              </section>

              <section className="flex min-h-[310px] flex-col overflow-hidden rounded-xl border-2 border-slate-400 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#24638C] text-xs font-black text-white">3</span>
                  <div>
                    <h3 className="text-xs font-black text-slate-800">Conteo físico</h3>
                    <p className="text-[9px] text-slate-500">Cuente el dinero real.</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-4">
                  <CampoInput
                    label="Efectivo contado"
                    value={formatearValorInput(efectivoContado)}
                    onChange={value => setEfectivoContado(limpiarValorInput(value))}
                    inputMode="numeric"
                    placeholder="0"
                    moneda
                    destacado
                  />
                  <div className={`rounded-xl border-2 p-4 ${
                    diferenciaActual === null ? 'border-slate-200 bg-slate-50' :
                    diferenciaActual === 0 ? 'border-emerald-200 bg-emerald-50' :
                    diferenciaActual > 0 ? 'border-amber-200 bg-amber-50' :
                    'border-red-200 bg-red-50'
                  }`}>
                    <div className="text-[8px] font-bold uppercase text-slate-500">Resultado</div>
                    <div className="mt-1 text-base font-black text-slate-800">
                      {diferenciaActual === null ? 'Pendiente de conteo' :
                       diferenciaActual === 0 ? 'Caja cuadrada' :
                       diferenciaActual > 0 ? 'Sobrante' : 'Faltante'}
                    </div>
                    <div className="mt-2 text-xs font-bold text-slate-600">
                      {diferenciaActual === null ? '-' : formatearMoneda(diferenciaActual)}
                    </div>
                    <div className="mt-2">{diferenciaActual !== null && <BadgeDiferencia valor={diferenciaActual} />}</div>
                  </div>
                </div>
              </section>

              <section className="flex min-h-[310px] flex-col overflow-hidden rounded-xl border-2 border-slate-400 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#24638C] text-xs font-black text-white">4</span>
                  <div>
                    <h3 className="text-xs font-black text-slate-800">Finalizar</h3>
                    <p className="text-[9px] text-slate-500">Registre cómo deja la caja.</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-gray-600">Entrega o destino <span className="font-normal text-slate-400">(opcional)</span></label>
                    <input type="text" value={usuarioRecibe} onChange={e => setUsuarioRecibe(e.target.value)} placeholder="Directora, propietario, caja fuerte..." className="w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#24638C] focus:ring-2 focus:ring-[#24638C]/15" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-gray-600">Observaciones <span className="font-normal text-slate-400">(opcional)</span></label>
                    <textarea rows={3} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Novedades del arqueo..." className="w-full resize-none rounded-lg border-2 border-slate-400 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#24638C] focus:ring-2 focus:ring-[#24638C]/15" />
                  </div>
                  <button
                    type="button"
                    onClick={registrarCierre}
                    disabled={guardando || calculando || !texto(efectivoContado)}
                    className="mt-auto w-full rounded-lg bg-[#0968B0] px-4 py-2.5 text-[9px] font-black text-white transition hover:bg-[#07548E] disabled:opacity-50"
                  >
                    {guardando ? <><i className="fas fa-spinner fa-spin mr-2"></i>REGISTRANDO...</> : <><i className="fas fa-check mr-2"></i>FINALIZAR ARQUEO</>}
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {tipoCierre === 'DIARIO' && !cierreDiarioRealizado && arqueo && (
          <div className="px-4 pb-2 pt-4 md:px-6">
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <h2 className="text-sm font-black text-emerald-900">Cierre Diario</h2>
              <p className="mt-1 text-xs text-emerald-700">Finaliza definitivamente la jornada. Revise los valores antes de confirmar el cierre.</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-4">
                <CampoInput label="Fecha" type="date" value={fecha} onChange={setFecha} />
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><DatoMoneda label="Base inicial" value={0} /></div>
                <DatoMoneda label="Ingresos" value={arqueo?.total_ingresos_sistema} />
                <DatoMoneda label="Egresos" value={arqueo?.total_egresos_sistema} />
              </div>
              <div className="grid grid-cols-1 gap-4 border-t border-slate-200 p-4 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-[9px] font-bold uppercase text-emerald-700">Efectivo esperado</div>
                  <div className="mt-1 text-xl font-black text-emerald-900">{formatearMoneda(arqueo?.efectivo_esperado)}</div>
                </div>
                <CampoInput label="Efectivo contado" value={formatearValorInput(efectivoContado)} onChange={value => setEfectivoContado(limpiarValorInput(value))} inputMode="numeric" placeholder="0" />
              </div>
              <div className="p-4 pt-0">
                <label className="mb-1 block text-[10px] font-semibold text-gray-600">Observaciones</label>
                <textarea rows={3} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Novedades del cierre diario..." className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-xs" />
              </div>
              <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-4">
                <button type="button" onClick={registrarCierre} disabled={guardando || calculando || !texto(efectivoContado)} className="w-full rounded-lg bg-emerald-600 px-5 py-2.5 text-[10px] font-black text-white transition hover:bg-emerald-700 disabled:opacity-50 md:w-auto md:min-w-[250px]">
                  {guardando ? <><i className="fas fa-spinner fa-spin mr-2"></i>REGISTRANDO...</> : <><i className="fas fa-lock mr-2"></i>REALIZAR CIERRE DIARIO</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            HISTORIAL DE ARQUEOS
        ================================================== */}

        {tipoCierre === 'TURNO' && (
          <div className="px-4 pb-6 pt-4 md:px-6">
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:max-w-xl">
              <CampoInput label="Desde" type="date" value={fechaInicio} onChange={setFechaInicio} />
              <CampoInput label="Hasta" type="date" value={fechaFin} onChange={setFechaFin} />
            </div>

            <div>
              <TituloSeccion
                titulo="Historial de Arqueos"
                subtitulo={`${cierres.length} arqueo(s) encontrado(s) · La búsqueda se actualiza automáticamente por fecha.`}
                icono={<i className="fas fa-clock-rotate-left"></i>}
                className="!rounded-b-none"
              />

              <MarcoTabla className="!rounded-t-none !border-t-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr>
                        <th className="p-2">Consecutivo</th>
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Ingresos</th>
                        <th className="p-2">Egresos</th>
                        <th className="p-2">Efectivo</th>
                        <th className="p-2">Diferencia</th>
                        <th className="p-2">Responsable</th>
                        <th className="p-2">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cierres.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="p-8 text-center text-gray-500">
                            No hay arqueos registrados para las fechas seleccionadas.
                          </td>
                        </tr>
                      ) : (
                        cierres.map(item => (
                          <tr key={item.id}>
                            <td className="p-2 text-center font-black whitespace-nowrap">{item.consecutivo || `#${item.id}`}</td>
                            <td className="p-2 text-center whitespace-nowrap">{formatearFecha(item.fecha)}</td>
                            <td className="p-2 text-right">{formatearMoneda(item.total_ingresos_sistema)}</td>
                            <td className="p-2 text-right">{formatearMoneda(item.total_egresos_sistema)}</td>
                            <td className="p-2 text-right">{formatearMoneda(item.efectivo_contado)}</td>
                            <td className="p-2 text-center">
                              <div className="mb-1 font-black">{formatearMoneda(item.diferencia_efectivo)}</div>
                              <BadgeDiferencia valor={item.diferencia_efectivo} />
                            </td>
                            <td className="p-2">
                              <div className="font-bold">{item.usuario_cierre || '-'}</div>
                              {item.usuario_recibe && <div className="mt-1 text-[8px] text-gray-500">Destino: {item.usuario_recibe}</div>}
                            </td>
                            <td className="p-2 text-center">
                              <BotonVerDetalle onClick={() => abrirDetalle(item)} disabled={cargandoDetalle}>
                                <i className="fas fa-eye"></i>
                                Ver
                              </BotonVerDetalle>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </MarcoTabla>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================
          DRAWER DETALLE
      ==================================================== */}

      {drawerDetalle &&
        detalle && (
        <div
          className="
            fixed
            inset-0
            z-[80]
          "
        >
          <div
            className="
              absolute
              inset-0
              bg-black/40
            "
            onClick={() =>
              setDrawerDetalle(
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
              sm:w-[680px]
              bg-white
              shadow-2xl
              overflow-y-auto
            "
          >
            <div
              className="
                sticky
                top-0
                z-30
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
                <p
                  className="
                    text-[9px]
                    uppercase
                    font-bold
                    text-gray-500
                  "
                >
                  Caja · Cierre
                </p>

                <h2
                  className="
                    text-lg
                    font-black
                    text-[var(--primary)]
                    mt-0.5
                  "
                >
                  {nombreTipoCierre(
                    detalle
                      ?.tipo_cierre
                  )}
                </h2>

                <p
                  className="
                    text-[10px]
                    text-gray-500
                    mt-0.5
                  "
                >
                  {detalle.consecutivo ||
                    `#${detalle.id}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDrawerDetalle(
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

            <div
              className="
                p-4
                space-y-4
              "
            >
              <SeccionDetalle
                titulo="Información del cierre"
                icono="fas fa-file-lines"
              >
                <div
                  className="
                    grid
                    grid-cols-2
                    gap-3
                  "
                >
                  <Dato
                    label="Consecutivo"
                    value={
                      detalle.consecutivo
                    }
                  />

                  <Dato
                    label="Fecha"
                    value={
                      formatearFecha(
                        detalle.fecha
                      )
                    }
                  />

                  <Dato
                    label="Desde"
                    value={
                      formatearFechaHora(
                        detalle.periodo_desde
                      )
                    }
                  />

                  <Dato
                    label="Hasta"
                    value={
                      formatearFechaHora(
                        detalle.periodo_hasta
                      )
                    }
                  />

                  <Dato
                    label="Usuario cierre"
                    value={
                      detalle.usuario_cierre
                    }
                  />

                  <Dato
                    label="Estado"
                    value={
                      detalle.estado
                    }
                  />

                  {detalle.tipo_cierre ===
                    'TURNO' && (
                    <>
                      <Dato
                        label="Entrega"
                        value={
                          detalle.usuario_entrega
                        }
                      />

                      <Dato
                        label="Recibe"
                        value={
                          detalle.usuario_recibe
                        }
                      />
                    </>
                  )}
                </div>
              </SeccionDetalle>

              <SeccionDetalle
                titulo="Resumen financiero"
                icono="fas fa-calculator"
              >
                <div
                  className="
                    grid
                    grid-cols-2
                    gap-3
                  "
                >
                  <DatoMoneda
                    label="Saldo inicial"
                    value={
                      detalle
                        .saldo_inicial_efectivo
                    }
                  />

                  <DatoMoneda
                    label="Ingresos"
                    value={
                      detalle
                        .total_ingresos_sistema
                    }
                  />

                  <DatoMoneda
                    label="Egresos"
                    value={
                      detalle
                        .total_egresos_sistema
                    }
                  />

                  <DatoMoneda
                    label="Movimiento neto"
                    value={
                      detalle
                        .movimiento_neto
                    }
                  />

                  <DatoMoneda
                    label="Efectivo esperado"
                    value={
                      detalle
                        .efectivo_esperado
                    }
                  />

                  <DatoMoneda
                    label="Efectivo contado"
                    value={
                      detalle
                        .efectivo_contado
                    }
                  />
                </div>

                <div
                  className="
                    mt-3
                    border
                    border-gray-200
                    bg-gray-50
                    rounded-lg
                    p-3
                    flex
                    justify-between
                    items-center
                    gap-3
                  "
                >
                  <div>
                    <div
                      className="
                        text-[9px]
                        uppercase
                        text-gray-500
                      "
                    >
                      Diferencia
                    </div>

                    <div
                      className="
                        text-lg
                        font-black
                        mt-0.5
                      "
                    >
                      {formatearMoneda(
                        detalle
                          .diferencia_efectivo
                      )}
                    </div>
                  </div>

                  <BadgeDiferencia
                    valor={
                      detalle
                        .diferencia_efectivo
                    }
                  />
                </div>
              </SeccionDetalle>

              <SeccionDetalle
                titulo={`Ingresos del período (${detalle?.ingresos?.length || 0})`}
                icono="fas fa-arrow-trend-up"
              >
                <TablaIngresos
                  ingresos={
                    detalle?.ingresos ||
                    []
                  }
                />
              </SeccionDetalle>

              <SeccionDetalle
                titulo={`Egresos del período (${detalle?.egresos?.length || 0})`}
                icono="fas fa-arrow-trend-down"
              >
                <TablaEgresos
                  egresos={
                    detalle?.egresos ||
                    []
                  }
                />
              </SeccionDetalle>

              {detalle?.observaciones && (
                <SeccionDetalle
                  titulo="Observaciones"
                  icono="fas fa-note-sticky"
                >
                  <p
                    className="
                      text-xs
                      text-gray-700
                      whitespace-pre-line
                    "
                  >
                    {detalle.observaciones}
                  </p>
                </SeccionDetalle>
              )}

              <div
                className="
                  border
                  border-blue-200
                  bg-blue-50
                  rounded-xl
                  p-3
                "
              >
                <div
                  className="
                    flex
                    flex-col
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                    gap-3
                  "
                >
                  <div>
                    <div
                      className="
                        text-[10px]
                        font-black
                        text-blue-900
                      "
                    >
                      <i className="fas fa-print mr-2"></i>

                      Movimiento detallado
                    </div>

                    <p
                      className="
                        text-[9px]
                        text-blue-700
                        mt-1
                      "
                    >
                      Imprima el resumen financiero y los movimientos incluidos.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      imprimirCierreDesdePagina(
                        detalle
                      )
                    }
                    className="
                      shrink-0
                      bg-blue-600
                      hover:bg-blue-700
                      text-white
                      rounded-lg
                      px-4
                      py-2.5
                      text-[10px]
                      font-black
                    "
                  >
                    <i className="fas fa-print mr-2"></i>

                    {detalle?.tipo_cierre ===
                    'TURNO'
                      ? 'IMPRIMIR ARQUEO'
                      : 'IMPRIMIR CIERRE DIARIO'}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

// =========================================================
// TABLA INGRESOS
// =========================================================

function TablaIngresos({
  ingresos,
}) {
  if (
    ingresos.length ===
    0
  ) {
    return (
      <div
        className="
          text-xs
          text-gray-500
          text-center
          py-5
        "
      >
        No hay ingresos en este período.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="
          w-full
          text-[9px]
          border-collapse
        "
      >
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-1.5">
              Fecha
            </th>

            <th className="border p-1.5">
              Cliente
            </th>

            <th className="border p-1.5">
              Concepto
            </th>

            <th className="border p-1.5">
              Medio
            </th>

            <th className="border p-1.5">
              Valor
            </th>

            <th className="border p-1.5">
              Estado
            </th>
          </tr>
        </thead>

        <tbody>
          {ingresos.map(
            item => (
              <tr
                key={
                  item.id
                }
                className={
                  item.estado ===
                  'ANULADO'
                    ? 'bg-red-50 text-red-600'
                    : ''
                }
              >
                <td
                  className="
                    border
                    p-1.5
                    whitespace-nowrap
                  "
                >
                  {formatearFecha(
                    item.fecha
                  )}
                </td>

                <td className="border p-1.5">
                  {item.nombre_cliente ||
                    item.nombre_pagador ||
                    item.documento ||
                    '-'}
                </td>

                <td className="border p-1.5">
                  {item
                    ?.concepto
                    ?.nombre ||
                    item.descripcion ||
                    '-'}
                </td>

                <td className="border p-1.5">
                  {item
                    ?.medio_pago
                    ?.nombre ||
                    '-'}
                </td>

                <td
                  className="
                    border
                    p-1.5
                    text-right
                    font-bold
                    whitespace-nowrap
                  "
                >
                  {formatearMoneda(
                    item.valor
                  )}
                </td>

                <td
                  className="
                    border
                    p-1.5
                    text-center
                  "
                >
                  {item.estado}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}

// =========================================================
// TABLA EGRESOS
// =========================================================

function TablaEgresos({
  egresos,
}) {
  if (
    egresos.length ===
    0
  ) {
    return (
      <div
        className="
          text-xs
          text-gray-500
          text-center
          py-5
        "
      >
        No hay egresos en este período.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="
          w-full
          text-[9px]
          border-collapse
        "
      >
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-1.5">
              Fecha
            </th>

            <th className="border p-1.5">
              Beneficiario
            </th>

            <th className="border p-1.5">
              Concepto
            </th>

            <th className="border p-1.5">
              Medio
            </th>

            <th className="border p-1.5">
              Valor
            </th>

            <th className="border p-1.5">
              Estado
            </th>
          </tr>
        </thead>

        <tbody>
          {egresos.map(
            item => (
              <tr
                key={
                  item.id
                }
                className={
                  item.estado ===
                  'ANULADO'
                    ? 'bg-red-50 text-red-600'
                    : ''
                }
              >
                <td
                  className="
                    border
                    p-1.5
                    whitespace-nowrap
                  "
                >
                  {formatearFecha(
                    item.fecha
                  )}
                </td>

                <td className="border p-1.5">
                  {item.beneficiario ||
                    '-'}
                </td>

                <td className="border p-1.5">
                  {item
                    ?.concepto
                    ?.nombre ||
                    item.descripcion ||
                    '-'}
                </td>

                <td className="border p-1.5">
                  {item
                    ?.medio_pago
                    ?.nombre ||
                    '-'}
                </td>

                <td
                  className="
                    border
                    p-1.5
                    text-right
                    font-bold
                    whitespace-nowrap
                  "
                >
                  {formatearMoneda(
                    item.valor
                  )}
                </td>

                <td
                  className="
                    border
                    p-1.5
                    text-center
                  "
                >
                  {item.estado}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}

// =========================================================
// SECCIÓN
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
          bg-slate-800
          text-white
          px-3
          py-2
          text-[10px]
          font-bold
        "
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

// =========================================================
// DATO MONEDA
// =========================================================

function DatoMoneda({
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
          text-sm
          font-black
          text-gray-800
          mt-0.5
        "
      >
        {formatearMoneda(
          value
        )}
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
  inputMode,
  moneda = false,
  destacado = false,
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

      <div className="relative">
        {moneda && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-700">
            $
          </span>
        )}

        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`
            w-full
            rounded-lg
            bg-white
            py-2
            text-xs
            outline-none
            transition
            focus:border-[#24638C]
            focus:ring-2
            focus:ring-[#24638C]/15
            ${moneda ? 'pl-7 pr-3' : 'px-3'}
            ${destacado ? 'border-2 border-slate-400' : 'border border-gray-300'}
          `}
        />
      </div>
    </div>
  )
}