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

import { CashRegister } from 'lucide-react'

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'

import {
  BotonActualizar,
} from '@/components/admin/EstiloModulo'

import {
  imprimirCierreCaja,
} from './components/imprimirCierreCaja'

// =========================================================
// CONSTANTES
// =========================================================

const API_URL =
  '/api/admin/caja/cierre'

const ROL_RECIBE_CAJA =
  'AUXILIAR_ADMINISTRATIVO'

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

function nombreCompletoPersonal(
  persona
) {
  return (
    persona?.nombre_completo ||
    persona?.nombre ||
    [
      persona?.nombres,
      persona?.apellidos,
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

  const [
    saldoInicial,
    setSaldoInicial,
  ] =
    useState('')

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
  // PERSONAL AUTORIZADO
  // =======================================================

  const [
    personalRecibe,
    setPersonalRecibe,
  ] =
    useState([])

  const [
    cargandoPersonal,
    setCargandoPersonal,
  ] =
    useState(
      false
    )

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

  const [
    tipoFiltro,
    setTipoFiltro,
  ] =
    useState('')

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
  // CARGAR PERSONAL AUTORIZADO
  // =======================================================

  const cargarPersonalRecibe =
    useCallback(
      async () => {
        if (
          !nit
        ) {
          return
        }

        setCargandoPersonal(
          true
        )

        try {
          const data =
            await fetchJsonSeguro(
              construirUrl(
                'personal'
              )
            )

          const lista =
            Array.isArray(
              data?.data
            )
              ? data.data
              : (
                  Array.isArray(
                    data?.data?.personal
                  )
                    ? data.data.personal
                    : []
                )

          // Seguridad adicional del cliente.
          // La API también debería devolver únicamente
          // perfiles AUXILIAR_ADMINISTRATIVO activos.
          const autorizados =
            lista.filter(
              item =>
                mayusculas(
                  item?.rol
                ) ===
                ROL_RECIBE_CAJA
            )

          setPersonalRecibe(
            autorizados
          )

          actualizarEmpresa(
            data?.empresa
          )
        } catch (
          errorPersonal
        ) {
          console.error(
            'Error cargando personal autorizado:',
            errorPersonal
          )

          setPersonalRecibe(
            []
          )

          setError(
            errorPersonal?.message ||
            'No fue posible cargar los funcionarios autorizados para recibir caja.'
          )
        } finally {
          setCargandoPersonal(
            false
          )
        }
      },
      [
        nit,
        construirUrl,
        actualizarEmpresa,
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
                  tipoFiltro,
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
        tipoFiltro,
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
              cargarPersonalRecibe(),
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

    if (
      tipoCierre ===
        'TURNO' &&
      !texto(
        usuarioRecibe
      )
    ) {
      setError(
        'Seleccione quién recibe la caja.'
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
        const recibeActual =
          usuarioRecibe

        setUsuarioEntrega(
          mayusculas(
            recibeActual
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
        cargarPersonalRecibe(),
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
          icono={CashRegister}
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
                      transition
                      ${
                        activo
                          ? 'border-[#24638C] bg-white text-[#24638C] shadow-sm'
                          : 'border-transparent bg-transparent text-slate-600 hover:bg-white hover:text-slate-800'
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
            DATOS OPERACIÓN
        ================================================== */}

        {!(
          tipoCierre ===
            'DIARIO' &&
          cierreDiarioRealizado
        ) && (
          <div
            className="
              border
              border-gray-300
              rounded-xl
              overflow-hidden
              mb-4
            "
          >
            <div
              className="
                bg-slate-800
                text-white
                px-4
                py-2.5
              "
            >
              <span
                className="
                  text-xs
                  font-bold
                "
              >
                <i className="fas fa-sliders mr-2"></i>

                {tipoCierre ===
                'TURNO'
                  ? 'Datos del Arqueo de Turno'
                  : 'Datos del Cierre Diario'}
              </span>
            </div>

            <div
              className="
                p-4
                grid
                grid-cols-1
                md:grid-cols-2
                xl:grid-cols-4
                gap-3
              "
            >
              <CampoInput
                label="Fecha"
                type="date"
                value={
                  fecha
                }
                onChange={
                  setFecha
                }
              />

              <CampoInput
                label="Saldo inicial en efectivo"
                value={
                  formatearValorInput(
                    saldoInicial
                  )
                }
                onChange={
                  value =>
                    setSaldoInicial(
                      limpiarValorInput(
                        value
                      )
                    )
                }
                inputMode="numeric"
                placeholder="0"
              />

              {tipoCierre ===
                'TURNO' && (
                <>
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
                      Entrega la caja
                    </label>

                    <div
                      className="
                        border
                        border-gray-300
                        bg-gray-50
                        rounded-lg
                        px-3
                        py-2
                        text-xs
                        font-semibold
                        text-gray-800
                        min-h-[34px]
                      "
                    >
                      {usuarioEntrega ||
                        '-'}
                    </div>
                  </div>

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
                      Recibe la caja
                    </label>

                    <select
                      value={
                        usuarioRecibe
                      }
                      onChange={
                        e =>
                          setUsuarioRecibe(
                            e.target.value
                          )
                      }
                      disabled={
                        cargandoPersonal
                      }
                      className="
                        w-full
                        border
                        border-gray-300
                        bg-white
                        rounded-lg
                        px-3
                        py-2
                        text-xs
                        disabled:opacity-60
                      "
                    >
                      <option value="">
                        {cargandoPersonal
                          ? 'Cargando funcionarios...'
                          : 'Seleccione funcionario...'}
                      </option>

                      {personalRecibe.map(
                        persona => {
                          const nombre =
                            mayusculas(
                              nombreCompletoPersonal(
                                persona
                              )
                            )

                          return (
                            <option
                              key={
                                persona?.perfil_id ||
                                persona?.id ||
                                `${persona?.documento}-${nombre}`
                              }
                              value={
                                nombre
                              }
                            >
                              {nombre}
                              {persona?.documento
                                ? ` · ${persona.documento}`
                                : ''}
                            </option>
                          )
                        }
                      )}
                    </select>

                    <div
                      className="
                        mt-1
                        text-[8px]
                        text-gray-500
                      "
                    >
                      Personal con rol{' '}
                      <strong>
                        AUXILIAR_ADMINISTRATIVO
                      </strong>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* CÁLCULO AUTOMÁTICO */}

            <div
              className="
                px-4
                pb-4
              "
            >
              <div
                className="
                  border
                  border-blue-200
                  bg-blue-50
                  rounded-lg
                  px-3
                  py-2
                  text-[9px]
                  text-blue-700
                  flex
                  items-center
                  gap-2
                "
              >
                {calculando ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>

                    Actualizando movimientos de caja...
                  </>
                ) : (
                  <>
                    <i className="fas fa-circle-check"></i>

                    Los movimientos y valores se calculan automáticamente.
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            RESUMEN
        ================================================== */}

        {arqueo &&
          !cierreDiarioRealizado && (
          <>
            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                xl:grid-cols-4
                gap-3
                mb-4
              "
            >
              <TarjetaResumen
                titulo="Ingresos"
                valor={
                  formatearMoneda(
                    arqueo
                      ?.total_ingresos_sistema
                  )
                }
                subtitulo={`${Number(
                  arqueo
                    ?.cantidad_recibos ||
                  0
                )} recibo(s) activo(s)`}
                icono="fas fa-arrow-trend-up"
              />

              <TarjetaResumen
                titulo="Egresos"
                valor={
                  formatearMoneda(
                    arqueo
                      ?.total_egresos_sistema
                  )
                }
                subtitulo={`${Number(
                  arqueo
                    ?.cantidad_egresos ||
                  0
                )} egreso(s) activo(s)`}
                icono="fas fa-arrow-trend-down"
              />

              <TarjetaResumen
                titulo="Movimiento Neto"
                valor={
                  formatearMoneda(
                    arqueo
                      ?.movimiento_neto
                  )
                }
                subtitulo="Ingresos menos egresos"
                icono="fas fa-scale-balanced"
              />

              <TarjetaResumen
                titulo="Efectivo Esperado"
                valor={
                  formatearMoneda(
                    arqueo
                      ?.efectivo_esperado
                  )
                }
                subtitulo="Saldo inicial + ingresos - egresos"
                icono="fas fa-money-bill-wave"
              />
            </div>

            {/* PERÍODO */}

            <div
              className="
                border
                border-gray-300
                bg-gray-50
                rounded-xl
                p-3
                mb-4
                grid
                grid-cols-1
                md:grid-cols-3
                gap-3
              "
            >
              <Dato
                label="Tipo"
                value={
                  nombreTipoCierre(
                    arqueo
                      ?.tipo_cierre
                  )
                }
              />

              <Dato
                label="Desde"
                value={
                  formatearFechaHora(
                    arqueo
                      ?.periodo_desde
                  )
                }
              />

              <Dato
                label="Hasta"
                value={
                  formatearFechaHora(
                    arqueo
                      ?.periodo_hasta
                  )
                }
              />
            </div>

            {/* MEDIOS */}

            <div
              className="
                border
                border-gray-300
                rounded-xl
                overflow-hidden
                mb-4
              "
            >
              <div
                className="
                  bg-slate-800
                  text-white
                  px-4
                  py-2.5
                  text-xs
                  font-bold
                "
              >
                <i className="fas fa-wallet mr-2"></i>

                Resumen por Medio de Pago
              </div>

              <div className="overflow-x-auto">
                <table
                  className="
                    w-full
                    text-[10px]
                    border-collapse
                  "
                >
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2">
                        Medio
                      </th>

                      <th className="border p-2">
                        Ingresos
                      </th>

                      <th className="border p-2">
                        Egresos
                      </th>

                      <th className="border p-2">
                        Neto
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {Object.entries(
                      arqueo
                        ?.resumen_medios_pago ||
                      {}
                    ).length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="
                            border
                            p-6
                            text-center
                            text-gray-500
                          "
                        >
                          No hay movimientos en el período.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(
                        arqueo
                          ?.resumen_medios_pago ||
                        {}
                      ).map(
                        ([
                          medio,
                          resumen,
                        ]) => (
                          <tr
                            key={
                              medio
                            }
                          >
                            <td
                              className="
                                border
                                p-2
                                font-bold
                              "
                            >
                              {medio}
                            </td>

                            <td
                              className="
                                border
                                p-2
                                text-right
                              "
                            >
                              {formatearMoneda(
                                resumen?.ingresos
                              )}
                            </td>

                            <td
                              className="
                                border
                                p-2
                                text-right
                              "
                            >
                              {formatearMoneda(
                                resumen?.egresos
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
                                resumen?.neto
                              )}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CONTEO */}

            <div
              className="
                border
                border-gray-300
                rounded-xl
                overflow-hidden
                mb-4
              "
            >
              <div
                className="
                  bg-slate-800
                  text-white
                  px-4
                  py-2.5
                  text-xs
                  font-bold
                "
              >
                <i className="fas fa-coins mr-2"></i>

                Conteo y Diferencia de Efectivo
              </div>

              <div
                className="
                  p-4
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  gap-4
                "
              >
                <div>
                  <CampoInput
                    label="Efectivo contado"
                    value={
                      formatearValorInput(
                        efectivoContado
                      )
                    }
                    onChange={
                      value =>
                        setEfectivoContado(
                          limpiarValorInput(
                            value
                          )
                        )
                    }
                    inputMode="numeric"
                    placeholder="0"
                  />

                  <p
                    className="
                      text-[9px]
                      text-gray-500
                      mt-1.5
                    "
                  >
                    Registre el efectivo físico realmente contado en caja.
                  </p>
                </div>

                <div
                  className="
                    border
                    border-gray-200
                    bg-gray-50
                    rounded-xl
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      justify-between
                      gap-3
                      mb-2
                    "
                  >
                    <span
                      className="
                        text-[10px]
                        text-gray-500
                      "
                    >
                      Efectivo esperado
                    </span>

                    <strong className="text-xs">
                      {formatearMoneda(
                        arqueo
                          ?.efectivo_esperado
                      )}
                    </strong>
                  </div>

                  <div
                    className="
                      flex
                      justify-between
                      gap-3
                      mb-3
                    "
                  >
                    <span
                      className="
                        text-[10px]
                        text-gray-500
                      "
                    >
                      Efectivo contado
                    </span>

                    <strong className="text-xs">
                      {texto(
                        efectivoContado
                      )
                        ? formatearMoneda(
                            efectivoContado
                          )
                        : '-'}
                    </strong>
                  </div>

                  <div
                    className="
                      border-t
                      border-gray-300
                      pt-3
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
                          font-bold
                          text-gray-500
                        "
                      >
                        Diferencia
                      </div>

                      <div
                        className={`
                          text-lg
                          font-black
                          mt-0.5
                          ${
                            diferenciaActual ===
                              null ||
                            diferenciaActual ===
                              0
                              ? 'text-emerald-700'
                              : diferenciaActual >
                                0
                                ? 'text-blue-700'
                                : 'text-red-700'
                          }
                        `}
                      >
                        {diferenciaActual ===
                        null
                          ? '-'
                          : formatearMoneda(
                              diferenciaActual
                            )}
                      </div>
                    </div>

                    {diferenciaActual !==
                      null && (
                      <BadgeDiferencia
                        valor={
                          diferenciaActual
                        }
                      />
                    )}
                  </div>
                </div>
              </div>

              <div
                className="
                  px-4
                  pb-4
                "
              >
                <label
                  className="
                    block
                    text-[10px]
                    font-semibold
                    text-gray-600
                    mb-1
                  "
                >
                  Observaciones
                </label>

                <textarea
                  rows={3}
                  value={
                    observaciones
                  }
                  onChange={
                    e =>
                      setObservaciones(
                        e.target.value
                      )
                  }
                  placeholder="Novedades del arqueo o cierre..."
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

              {/* ACCIÓN */}

              <div
                className="
                  border-t
                  border-gray-200
                  bg-gray-50
                  p-4
                  flex
                  justify-end
                "
              >
                <button
                  type="button"
                  onClick={
                    registrarCierre
                  }
                  disabled={
                    guardando ||
                    calculando ||
                    !texto(
                      efectivoContado
                    ) ||
                    (
                      tipoCierre ===
                        'TURNO' &&
                      !texto(
                        usuarioRecibe
                      )
                    )
                  }
                  className={`
                    w-full
                    md:w-auto
                    min-w-[250px]
                    text-white
                    rounded-lg
                    px-5
                    py-2.5
                    text-[10px]
                    font-black
                    disabled:opacity-50
                    ${
                      tipoCierre ===
                      'TURNO'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }
                  `}
                >
                  {guardando ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>

                      REGISTRANDO...
                    </>
                  ) : tipoCierre ===
                    'TURNO' ? (
                    <>
                      <i className="fas fa-right-left mr-2"></i>

                      REGISTRAR ARQUEO DE TURNO
                    </>
                  ) : (
                    <>
                      <i className="fas fa-lock mr-2"></i>

                      REALIZAR CIERRE DIARIO
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ==================================================
            HISTORIAL
        ================================================== */}

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
              px-4
              py-3
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
                <h2
                  className="
                    text-xs
                    font-bold
                  "
                >
                  <i className="fas fa-clock-rotate-left mr-2"></i>

                  Historial de Cierres
                </h2>

                <p
                  className="
                    text-[9px]
                    text-gray-300
                    mt-0.5
                  "
                >
                  Arqueos de turno y cierres diarios registrados.
                </p>
              </div>

              <span
                className="
                  text-[10px]
                  text-gray-300
                "
              >
                {cierres.length}
                {' '}
                registro(s)
              </span>
            </div>
          </div>

          <div
            className="
              p-3
              bg-gray-50
              border-b
              border-gray-300
              grid
              grid-cols-1
              sm:grid-cols-3
              gap-2
            "
          >
            <CampoInput
              label="Desde"
              type="date"
              value={
                fechaInicio
              }
              onChange={
                setFechaInicio
              }
            />

            <CampoInput
              label="Hasta"
              type="date"
              value={
                fechaFin
              }
              onChange={
                setFechaFin
              }
            />

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
                Tipo
              </label>

              <select
                value={
                  tipoFiltro
                }
                onChange={
                  e =>
                    setTipoFiltro(
                      e.target.value
                    )
                }
                className="
                  w-full
                  border
                  border-gray-300
                  bg-white
                  rounded-lg
                  px-3
                  py-2
                  text-xs
                "
              >
                <option value="">
                  Todos
                </option>

                <option value="TURNO">
                  Arqueo de Turno
                </option>

                <option value="DIARIO">
                  Cierre Diario
                </option>
              </select>
            </div>
          </div>

          <div
            className="
              px-3
              pb-3
              bg-gray-50
              flex
              justify-end
            "
          >
            <button
              type="button"
              onClick={
                cargarHistorial
              }
              className="
                bg-blue-600
                hover:bg-blue-700
                text-white
                rounded-lg
                px-3
                py-2
                text-[10px]
                font-bold
              "
            >
              <i className="fas fa-search mr-2"></i>

              Consultar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table
              className="
                w-full
                text-[10px]
                border-collapse
              "
            >
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">
                    Consecutivo
                  </th>

                  <th className="border p-2">
                    Fecha
                  </th>

                  <th className="border p-2">
                    Tipo
                  </th>

                  <th className="border p-2">
                    Ingresos
                  </th>

                  <th className="border p-2">
                    Egresos
                  </th>

                  <th className="border p-2">
                    Efectivo
                  </th>

                  <th className="border p-2">
                    Diferencia
                  </th>

                  <th className="border p-2">
                    Usuario
                  </th>

                  <th className="border p-2">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {cierres.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="
                        border
                        p-8
                        text-center
                        text-gray-500
                      "
                    >
                      No hay cierres registrados para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  cierres.map(
                    item => (
                      <tr
                        key={
                          item.id
                        }
                        className="
                          hover:bg-gray-50
                        "
                      >
                        <td
                          className="
                            border
                            p-2
                            text-center
                            font-black
                            whitespace-nowrap
                          "
                        >
                          {item.consecutivo ||
                            `#${item.id}`}
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
                            item.fecha
                          )}
                        </td>

                        <td
                          className="
                            border
                            p-2
                            text-center
                          "
                        >
                          <BadgeTipo
                            tipo={
                              item.tipo_cierre
                            }
                          />
                        </td>

                        <td
                          className="
                            border
                            p-2
                            text-right
                          "
                        >
                          {formatearMoneda(
                            item
                              .total_ingresos_sistema
                          )}
                        </td>

                        <td
                          className="
                            border
                            p-2
                            text-right
                          "
                        >
                          {formatearMoneda(
                            item
                              .total_egresos_sistema
                          )}
                        </td>

                        <td
                          className="
                            border
                            p-2
                            text-right
                          "
                        >
                          {formatearMoneda(
                            item
                              .efectivo_contado
                          )}
                        </td>

                        <td
                          className="
                            border
                            p-2
                            text-center
                          "
                        >
                          <div
                            className="
                              font-black
                              mb-1
                            "
                          >
                            {formatearMoneda(
                              item
                                .diferencia_efectivo
                            )}
                          </div>

                          <BadgeDiferencia
                            valor={
                              item
                                .diferencia_efectivo
                            }
                          />
                        </td>

                        <td
                          className="
                            border
                            p-2
                          "
                        >
                          <div
                            className="
                              font-bold
                            "
                          >
                            {item.usuario_cierre ||
                              '-'}
                          </div>

                          {item.tipo_cierre ===
                            'TURNO' && (
                            <div
                              className="
                                text-[8px]
                                text-gray-500
                                mt-1
                              "
                            >
                              Entrega:{' '}
                              {item.usuario_entrega ||
                                '-'}

                              <br />

                              Recibe:{' '}
                              {item.usuario_recibe ||
                                '-'}
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
                          <button
                            type="button"
                            onClick={() =>
                              abrirDetalle(
                                item
                              )
                            }
                            disabled={
                              cargandoDetalle
                            }
                            className="
                              bg-blue-600
                              hover:bg-blue-700
                              disabled:opacity-50
                              text-white
                              rounded-lg
                              px-3
                              py-1.5
                              text-[9px]
                              font-bold
                            "
                          >
                            <i className="fas fa-eye mr-1"></i>

                            Ver
                          </button>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
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
        inputMode={
          inputMode
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