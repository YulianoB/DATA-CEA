// admin/caja/page.jsx

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

import { WalletCards, RefreshCw } from 'lucide-react'

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import {
  BotonSecundario,
  ContenedorModulo,
  TituloSeccion,
} from '@/components/admin/EstiloModulo'

// =========================================================
// CONSTANTES
// =========================================================

const API_URL =
  '/api/admin/caja'

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
  const numero =
    Number(
      valor ||
      0
    )

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
    numero
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
// TARJETA RESUMEN
// =========================================================

function TarjetaResumen({
  titulo,
  valor,
  subtitulo,
  icono,
  tono = 'gris',
}) {
  const estilos = {
    verde: {
      caja:
        'bg-emerald-50 border-emerald-200',

      icono:
        'bg-emerald-100 text-emerald-700',
    },

    rojo: {
      caja:
        'bg-red-50 border-red-200',

      icono:
        'bg-red-100 text-red-700',
    },

    azul: {
      caja:
        'bg-blue-50 border-blue-200',

      icono:
        'bg-blue-100 text-blue-700',
    },

    gris: {
      caja:
        'bg-white border-gray-200',

      icono:
        'bg-gray-100 text-gray-600',
    },
  }

  const estilo =
    estilos[
      tono
    ] ||
    estilos.gris

  return (
    <div
      className={`
        border
        rounded-xl
        px-4
        py-3
        shadow-sm
        ${estilo.caja}
      `}
    >
      <div
        className="
          flex
          justify-between
          items-center
          gap-3
        "
      >
        <div
          className="
            min-w-0
          "
        >
          <p
            className="
              text-[9px]
              uppercase
              font-bold
              tracking-wide
              text-gray-500
            "
          >
            {titulo}
          </p>

          <p
            className="
              mt-1
              text-xl
              md:text-2xl
              font-black
              text-gray-900
              leading-tight
            "
          >
            {valor}
          </p>

          {subtitulo && (
            <p
              className="
                mt-1
                text-[9px]
                text-gray-500
              "
            >
              {subtitulo}
            </p>
          )}
        </div>

        <div
          className={`
            shrink-0
            w-10
            h-10
            rounded-xl
            flex
            items-center
            justify-center
            text-base
            ${estilo.icono}
          `}
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
// TARJETA ACCESO
// =========================================================

function TarjetaAcceso({
  titulo,
  descripcion,
  icono,
  onClick,
  color = 'azul',
}) {
  const estilos = {
    azul: {
      borde:
        'border-blue-300',

      fondo:
        'bg-blue-50/80',

      fondoIcono:
        'bg-blue-100',

      textoIcono:
        'text-blue-700',

      flecha:
        'text-blue-500',

      hover:
        'hover:border-blue-500 hover:bg-blue-100/80 hover:shadow-md',
    },

    rojo: {
      borde:
        'border-red-300',

      fondo:
        'bg-red-50/80',

      fondoIcono:
        'bg-red-100',

      textoIcono:
        'text-red-700',

      flecha:
        'text-red-500',

      hover:
        'hover:border-red-500 hover:bg-red-100/80 hover:shadow-md',
    },

    gris: {
      borde:
        'border-slate-300',

      fondo:
        'bg-slate-50',

      fondoIcono:
        'bg-slate-200',

      textoIcono:
        'text-slate-700',

      flecha:
        'text-slate-500',

      hover:
        'hover:border-slate-500 hover:bg-slate-100 hover:shadow-md',
    },

    verde: {
      borde:
        'border-emerald-300',

      fondo:
        'bg-emerald-50/80',

      fondoIcono:
        'bg-emerald-100',

      textoIcono:
        'text-emerald-700',

      flecha:
        'text-emerald-500',

      hover:
        'hover:border-emerald-500 hover:bg-emerald-100/80 hover:shadow-md',
    },
  }

  const estilo =
    estilos[
      color
    ] ||
    estilos.azul

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        group
        w-full
        min-h-[96px]
        text-left
        border
        ${estilo.borde}
        ${estilo.fondo}
        ${estilo.hover}
        rounded-xl
        px-3
        py-3
        shadow-sm
        transition-all
        duration-200
        flex
        items-center
        gap-3
        cursor-pointer
      `}
    >
      <div
        className={`
          shrink-0
          w-12
          h-12
          rounded-xl
          flex
          items-center
          justify-center
          text-lg
          ${estilo.fondoIcono}
          ${estilo.textoIcono}
          group-hover:scale-105
          transition-transform
        `}
      >
        <i
          className={
            icono
          }
        ></i>
      </div>

      <div
        className="
          flex-1
          min-w-0
        "
      >
        <h3
          className="
            text-xs
            md:text-sm
            font-black
            text-gray-900
            leading-tight
          "
        >
          {titulo}
        </h3>

        <p
          className="
            mt-1
            text-[10px]
            leading-snug
            text-gray-600
          "
        >
          {descripcion}
        </p>

        <div
          className="
            mt-2
            text-[9px]
            font-bold
            text-gray-500
            group-hover:text-gray-800
            transition
          "
        >
          INGRESAR AL MÓDULO
        </div>
      </div>

      <div
        className={`
          shrink-0
          w-8
          h-8
          rounded-full
          bg-white/80
          border
          border-white
          flex
          items-center
          justify-center
          ${estilo.flecha}
          group-hover:translate-x-1
          transition-transform
        `}
      >
        <i className="fas fa-chevron-right text-xs"></i>
      </div>
    </button>
  )
}

// =========================================================
// PÁGINA
// =========================================================

export default function CajaPage() {
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
  // RESUMEN
  // =======================================================

  const [
    resumen,
    setResumen,
  ] =
    useState({
      total_ingresos:
        0,

      total_egresos:
        0,

      movimiento_neto:
        0,

      cantidad_recibos:
        0,

      cantidad_egresos:
        0,

      recibos_anulados:
        0,

      egresos_anulados:
        0,
    })

  const [
    cargando,
    setCargando,
  ] =
    useState(
      false
    )

  const [
    error,
    setError,
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
            'No se encontró el NIT del CEA en la sesión actual.'
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
          user
        ),
      [
        user,
      ]
    )

  // =======================================================
  // CONSULTAR RESUMEN
  // =======================================================

  const cargarResumen =
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
          const hoy =
            hoyColombia()

          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'resumen'
          )

          params.set(
            'nit',
            nit
          )

          params.set(
            'fecha_inicio',
            hoy
          )

          params.set(
            'fecha_fin',
            hoy
          )

          const data =
            await fetchJsonSeguro(
              `${API_URL}?${params.toString()}`
            )

          setResumen(
            data?.data ||
            {}
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
          errorResumen
        ) {
          console.error(
            'Error cargando resumen Caja:',
            errorResumen
          )

          setError(
            errorResumen
              ?.message ||
            'No fue posible consultar el resumen de Caja.'
          )
        } finally {
          setCargando(
            false
          )
        }
      },
      [
        nit,
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

      cargarResumen()
    },
    [
      sesionLista,
      nit,
      cargarResumen,
    ]
  )

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

        Cargando Caja...
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
      <ContenedorModulo className="max-w-7xl mx-auto overflow-hidden">

        <EncabezadoModulo
          titulo="Caja"
          subtitulo="Gestión de ingresos, egresos, cierre de caja y cartera del CEA."
          icono={WalletCards}
          rutaRegreso="/admin"
          textoRegreso="Menú Administrativo"
        />

        <div className="px-4 pt-3 md:px-6">
          <div className="flex justify-end">
            <BotonSecundario
              type="button"
              onClick={cargarResumen}
              disabled={cargando}
            >
              <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
              Actualizar
            </BotonSecundario>
          </div>
        </div>

        {/* ==================================================
            ERROR
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
              mx-4
              md:mx-6
              mt-3
              mb-3
              text-xs
            "
          >
            <i className="fas fa-exclamation-triangle mr-2"></i>

            {error}
          </div>
        )}

        <div className="px-4 pb-4 md:px-6 md:pb-6">
        {/* ==================================================
            RESUMEN HOY
        ================================================== */}

        <div
          className="
            mb-2
            flex
            items-center
            justify-between
            gap-3
          "
        >
          <div>
            <h2
              className="
                text-xs
                font-black
                text-gray-800
              "
            >
              Resumen del día
            </h2>

            <p
              className="
                text-[9px]
                text-gray-500
              "
            >
              Movimiento registrado durante el día.
            </p>
          </div>

          <span
            className="
              text-[9px]
              font-bold
              text-gray-500
            "
          >
            {hoyColombia()}
          </span>
        </div>

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-3
            mb-4
          "
        >
          <TarjetaResumen
            titulo="Ingresos Hoy"
            valor={
              formatearMoneda(
                resumen
                  ?.total_ingresos
              )
            }
            subtitulo={`${Number(
              resumen
                ?.cantidad_recibos ||
              0
            )} recibo(s) activo(s)`}
            icono="fas fa-arrow-trend-up"
            tono="verde"
          />

          <TarjetaResumen
            titulo="Egresos Hoy"
            valor={
              formatearMoneda(
                resumen
                  ?.total_egresos
              )
            }
            subtitulo={`${Number(
              resumen
                ?.cantidad_egresos ||
              0
            )} egreso(s) activo(s)`}
            icono="fas fa-arrow-trend-down"
            tono="rojo"
          />

          <TarjetaResumen
            titulo="Movimiento Neto"
            valor={
              formatearMoneda(
                resumen
                  ?.movimiento_neto
              )
            }
            subtitulo="Ingresos menos egresos"
            icono="fas fa-wallet"
            tono="azul"
          />
        </div>

        {/* ==================================================
            OPERACIONES
        ================================================== */}

        <div
          className="
            border
            border-gray-300
            rounded-xl
            overflow-hidden
          "
        >
          <TituloSeccion
            titulo="Operaciones de Caja"
            subtitulo="Seleccione el módulo que desea consultar o administrar."
            icono={<i className="fas fa-border-all" />}
            className="rounded-none border-0"
          />

          <div
            className="
              p-3
              bg-gray-50
            "
          >
            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                xl:grid-cols-4
                gap-3
              "
            >

              {/* INGRESOS */}

              <TarjetaAcceso
                titulo="Registrar Ingreso"
                descripcion="Pagos, abonos y otros ingresos de Caja."
                icono="fas fa-hand-holding-dollar"
                color="azul"
                onClick={() =>
                  router.push(
                    '/admin/caja/ingresos'
                  )
                }
              />

              {/* EGRESOS */}

              <TarjetaAcceso
                titulo="Registrar Egreso"
                descripcion="Pagos, gastos y salidas de dinero."
                icono="fas fa-money-bill-transfer"
                color="rojo"
                onClick={() =>
                  router.push(
                    '/admin/caja/egresos'
                  )
                }
              />

              {/* CIERRE DE CAJA */}

              <TarjetaAcceso
                titulo="Cierre de Caja"
                descripcion="Arqueos de turno, entrega de caja y cierre diario."
                icono="fas fa-cash-register"
                color="gris"
                onClick={() =>
                  router.push(
                    '/admin/caja/cierre'
                  )
                }
              />

              {/* CONVENIOS */}

              <TarjetaAcceso
                titulo="Convenios"
                descripcion="Cartera, pagos y estado de aprendices por convenio."
                icono="fas fa-handshake"
                color="verde"
                onClick={() =>
                  router.push(
                    '/admin/caja/convenios'
                  )
                }
              />
            </div>
          </div>
        </div>

        {/* ==================================================
            INFORMACIÓN OPERATIVA
        ================================================== */}

        <div
          className="
            mt-3
            border
            border-gray-200
            rounded-lg
            bg-gray-50
            px-3
            py-2
          "
        >
          <div
            className="
              flex
              items-start
              gap-2
              text-[10px]
              leading-relaxed
              text-gray-500
            "
          >
            <i
              className="
                fas
                fa-circle-info
                text-blue-600
                mt-0.5
              "
            ></i>

            <p>
              Los movimientos de Caja conservan su trazabilidad.
              Los recibos y egresos con errores se anulan registrando
              usuario, fecha y motivo, sin eliminar el movimiento original.
            </p>
          </div>
        </div>
        </div>
      </ContenedorModulo>
    </div>
  )
}