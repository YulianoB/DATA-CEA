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

import Image from 'next/image'
import {
  ArrowLeft,
  HandCoins,
  Handshake,
  LogOut,
  RefreshCw,
  WalletCards,
} from 'lucide-react'

import { cerrarSesion } from '@/lib/auth/logout'
import {
  ESTILO_BOTONES_MENU,
  ESTILO_MENU,
  TarjetaNavegacion,
} from '@/components/admin/MenuNavegacion'
import {
  BotonSecundario,
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

  const estiloBotonMenu = (tipo) => {
    const estilo = ESTILO_BOTONES_MENU[tipo]
    return {
      backgroundColor: estilo.fondo,
      color: estilo.texto,
      borderColor: estilo.borde,
      transition: ESTILO_BOTONES_MENU.transicion,
    }
  }

  const hoverBotonMenu = (event, tipo, activo) => {
    const estilo = ESTILO_BOTONES_MENU[tipo]
    event.currentTarget.style.backgroundColor = activo ? estilo.hover : estilo.fondo
    event.currentTarget.style.transform = activo
      ? ESTILO_BOTONES_MENU.movimientoHover
      : 'translateY(0)'
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: ESTILO_MENU.fondoPagina }}>
      <header
        className="border-b"
        style={{
          backgroundColor: ESTILO_MENU.fondoCabecera,
          borderColor: ESTILO_MENU.bordeCabecera,
        }}
      >
        <div
          className="mx-auto px-4 py-4 md:px-6"
          style={{ maxWidth: ESTILO_MENU.anchoMaximo }}
        >
          <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4">
            <Image
              src="/logo.png"
              alt="DATA CEA"
              width={145}
              height={68}
              priority
              className="h-[50px] w-auto shrink-0 object-contain"
            />

            <div className="min-w-0 text-center">
              <div className="flex items-center justify-center gap-2">
                <WalletCards size={24} strokeWidth={2} style={{ color: ESTILO_MENU.textoTitulo }} />
                <h1
                  className="text-lg font-bold tracking-normal md:text-2xl"
                  style={{ color: ESTILO_MENU.textoTitulo }}
                >
                  Caja
                </h1>
              </div>
              <p className="mt-0.5 text-xs" style={{ color: ESTILO_MENU.textoSubtitulo }}>
                Gestión de ingresos, egresos, cierre de caja y cartera del CEA.
              </p>
              <p className="mt-1 text-[10px]" style={{ color: ESTILO_MENU.textoUsuario }}>
                {usuarioOperacion || '-'}
                {empresaNombre && <> · {empresaNombre}</>}
              </p>
            </div>

            <div className="flex min-w-[145px] flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold shadow-sm"
                style={estiloBotonMenu('regresar')}
                onMouseEnter={(event) => hoverBotonMenu(event, 'regresar', true)}
                onMouseLeave={(event) => hoverBotonMenu(event, 'regresar', false)}
              >
                <ArrowLeft size={14} />
                Regresar
              </button>

              <button
                type="button"
                onClick={() => cerrarSesion(router)}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold shadow-sm"
                style={estiloBotonMenu('cerrarSesion')}
                onMouseEnter={(event) => hoverBotonMenu(event, 'cerrarSesion', true)}
                onMouseLeave={(event) => hoverBotonMenu(event, 'cerrarSesion', false)}
              >
                <LogOut size={14} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        <div
          className="mx-auto px-4 md:px-6"
          style={{ maxWidth: ESTILO_MENU.anchoMaximo }}
        >
          <div
            className="w-full"
            style={{
              height: `${ESTILO_MENU.grosorLineaTitulo}px`,
              backgroundColor: ESTILO_MENU.lineaTitulo,
            }}
          />
        </div>
      </header>

      <div className="mx-auto px-4 pb-5 pt-4 md:px-6" style={{ maxWidth: '1050px' }}>
        {error && (
          <div className="mb-3 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        )}

        <section className="mb-4">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xs font-black text-gray-800">Resumen del día</h2>
              <p className="text-[9px] text-gray-500">
                Movimiento registrado durante el día · {hoyColombia()}
              </p>
            </div>

            <BotonSecundario
              type="button"
              onClick={cargarResumen}
              disabled={cargando}
              className="!py-1.5"
            >
              <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />
              Actualizar
            </BotonSecundario>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <TarjetaResumen
              titulo="Ingresos Hoy"
              valor={formatearMoneda(resumen?.total_ingresos)}
              subtitulo={`${Number(resumen?.cantidad_recibos || 0)} recibo(s) activo(s)`}
              icono="fas fa-arrow-trend-up"
              tono="verde"
            />
            <TarjetaResumen
              titulo="Egresos Hoy"
              valor={formatearMoneda(resumen?.total_egresos)}
              subtitulo={`${Number(resumen?.cantidad_egresos || 0)} egreso(s) activo(s)`}
              icono="fas fa-arrow-trend-down"
              tono="rojo"
            />
            <TarjetaResumen
              titulo="Movimiento Neto"
              valor={formatearMoneda(resumen?.movimiento_neto)}
              subtitulo="Ingresos menos egresos"
              icono="fas fa-wallet"
              tono="azul"
            />
          </div>
        </section>

        <section
          className="rounded-xl border bg-white px-5 pb-5 pt-4 md:px-6"
          style={{
            borderColor: '#B8C6D1',
            borderWidth: '1px',
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.14)',
          }}
        >
          <div className="mb-3 text-center">
            <h2 className="text-xs font-black uppercase tracking-[0.08em]" style={{ color: '#3B617D' }}>
              Operaciones de Caja
            </h2>
            <p className="mt-0.5 text-[9px]" style={{ color: ESTILO_MENU.textoSubtitulo }}>
              Seleccione el módulo que desea consultar o administrar.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TarjetaNavegacion
              titulo="Registrar Ingreso"
              descripcion="Pagos, abonos y otros ingresos de Caja."
              icono={HandCoins}
              compacta
              onClick={() => router.push('/admin/caja/ingresos')}
            />
            <TarjetaNavegacion
              titulo="Registrar Egreso"
              descripcion="Pagos, gastos y salidas de dinero."
              icono={WalletCards}
              compacta
              onClick={() => router.push('/admin/caja/egresos')}
            />
            <TarjetaNavegacion
              titulo="Cierre de Caja"
              descripcion="Arqueos de turno, entrega de caja y cierre diario."
              icono={WalletCards}
              compacta
              onClick={() => router.push('/admin/caja/cierre')}
            />
            <TarjetaNavegacion
              titulo="Convenios"
              descripcion="Cartera, pagos y estado de aprendices por convenio."
              icono={Handshake}
              compacta
              onClick={() => router.push('/admin/caja/convenios')}
            />
          </div>
        </section>
      </div>

      <footer className="mx-auto px-4 pb-5 pt-1 text-center md:px-6" style={{ maxWidth: '1050px' }}>
        <div className="border-t pt-3" style={{ borderColor: ESTILO_MENU.bordeCabecera }}>
          <p className="text-[10px] font-medium tracking-wide" style={{ color: '#7A8895' }}>
            DATA CEA · Sistema de Registro y Control de Datos para Centros de Enseñanza Automovilística · © 2026 Yuliano Armando Buitrago López. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </main>
  )
}
