// admin/caja/convenios/page.jsx
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

import { Handshake } from 'lucide-react'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import { BotonActualizar, BotonVerDetalle, MarcoTabla, TituloSeccion } from '@/components/admin/EstiloModulo'

// =========================================================
// CONSTANTES
// =========================================================

const API_URL =
  '/api/admin/caja/convenios'

const ESTADOS_CARTERA = [
  {
    value:
      'PENDIENTE',

    label:
      'Pendiente',

    descripcion:
      'Sin abonos',
  },
  {
    value:
      'ABONADO',

    label:
      'Abonado',

    descripcion:
      'Con pagos parciales',
  },
  {
    value:
      'PAZ_Y_SALVO',

    label:
      'Paz y salvo',

    descripcion:
      'Obligación pagada',
  },
  {
    value:
      'TODOS',

    label:
      'Todos',

    descripcion:
      'Todos los estados',
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

function numero(
  valor
) {
  const resultado =
    Number(
      valor ||
      0
    )

  return Number.isFinite(
    resultado
  )
    ? resultado
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
    numero(
      valor
    )
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

  const partes =
    String(
      valor
    )
      .slice(
        0,
        10
      )
      .split(
        '-'
      )

  if (
    partes.length !==
    3
  ) {
    return valor
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function categoriasTexto(
  categorias
) {
  if (
    !Array.isArray(
      categorias
    ) ||
    categorias.length ===
      0
  ) {
    return '-'
  }

  return categorias.join(
    ', '
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
    azul: {
      caja:
        'bg-blue-50 border-blue-200',

      icono:
        'bg-blue-100 text-blue-700',
    },

    verde: {
      caja:
        'bg-emerald-50 border-emerald-200',

      icono:
        'bg-emerald-100 text-emerald-700',
    },

    amarillo: {
      caja:
        'bg-amber-50 border-amber-200',

      icono:
        'bg-amber-100 text-amber-700',
    },

    rojo: {
      caja:
        'bg-red-50 border-red-200',

      icono:
        'bg-red-100 text-red-700',
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
          items-center
          justify-between
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
              tracking-wide
              font-bold
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
              leading-tight
              text-gray-900
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
// BADGE ESTADO
// =========================================================

function BadgeEstado({
  estado,
}) {
  const estadoNormalizado =
    texto(
      estado
    ).toUpperCase()

  const estilos = {
    PENDIENTE:
      'bg-red-100 text-red-700 border-red-200',

    ABONADO:
      'bg-amber-100 text-amber-700 border-amber-200',

    PAZ_Y_SALVO:
      'bg-emerald-100 text-emerald-700 border-emerald-200',
  }

  const etiquetas = {
    PENDIENTE:
      'Pendiente',

    ABONADO:
      'Abonado',

    PAZ_Y_SALVO:
      'Paz y salvo',
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2
        py-1
        text-[9px]
        font-bold
        whitespace-nowrap
        ${
          estilos[
            estadoNormalizado
          ] ||
          'bg-gray-100 text-gray-600 border-gray-200'
        }
      `}
    >
      {
        etiquetas[
          estadoNormalizado
        ] ||
        estadoNormalizado ||
        '-'
      }
    </span>
  )
}

// =========================================================
// MODAL DETALLE
// =========================================================

function DetalleCarteraModal({
  abierto,
  detalle,
  cargando,
  error,
  onClose,
}) {
  if (
    !abierto
  ) {
    return null
  }

  const pagosActivos =
    Array.isArray(
      detalle?.pagos_activos
    )
      ? detalle.pagos_activos
      : []

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        overflow-y-auto
        px-2
      "
    >
      <div
        className="
          absolute
          inset-0
          bg-black/40
        "
        onClick={
          onClose
        }
      ></div>

      <div
        className="
          relative
          mx-auto
          my-5
          w-[calc(100%-2rem)]
          max-w-5xl
          max-h-[calc(100vh-2.5rem)]
          rounded-xl
          overflow-hidden
          bg-white
          shadow-2xl
          flex
          flex-col
        "
      >
        {/* ===============================================
            HEADER
        =============================================== */}

        <div
          className="
            shrink-0
            bg-slate-800
            text-white
            px-4
            py-3
            flex
            items-center
            justify-between
            gap-3
          "
        >
          <div>
            <p
              className="
                text-[9px]
                uppercase
                tracking-wider
                text-slate-300
                font-bold
              "
            >
              Control de cartera
            </p>

            <h2
              className="
                text-sm
                font-black
              "
            >
              Detalle del aprendiz
            </h2>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="
              w-9
              h-9
              rounded-lg
              bg-white/10
              hover:bg-white/20
              flex
              items-center
              justify-center
            "
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* ===============================================
            CONTENIDO
        =============================================== */}

        <div
          className="
            flex-1
            overflow-y-auto
            p-4
          "
        >
          {cargando && (
            <div
              className="
                py-16
                text-center
                text-gray-500
                text-xs
              "
            >
              <i className="fas fa-spinner fa-spin mr-2"></i>

              Consultando detalle...
            </div>
          )}

          {!cargando &&
            error && (
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

          {!cargando &&
            !error &&
            detalle && (
              <>
                {/* =========================================
                    APRENDIZ
                ========================================= */}

                <div
                  className="
                    border
                    border-gray-200
                    rounded-xl
                    overflow-hidden
                  "
                >
                  <div
                    className="
                      bg-gray-50
                      border-b
                      border-gray-200
                      px-3
                      py-2
                    "
                  >
                    <h3
                      className="
                        text-[10px]
                        font-black
                        text-gray-800
                      "
                    >
                      <i className="fas fa-user-graduate mr-2 text-blue-600"></i>

                      Aprendiz
                    </h3>
                  </div>

                  <div
                    className="
                      p-3
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-3
                      text-[10px]
                    "
                  >
                    <div>
                      <span className="text-gray-500">
                        Nombre
                      </span>

                      <p className="font-bold text-gray-900">
                        {detalle?.nombre_completo ||
                          '-'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Documento
                      </span>

                      <p className="font-bold text-gray-900">
                        {detalle?.documento ||
                          '-'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Matrícula
                      </span>

                      <p className="font-bold text-gray-900">
                        {detalle?.consecutivo ||
                          '-'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Fecha inscripción
                      </span>

                      <p className="font-bold text-gray-900">
                        {formatearFecha(
                          detalle?.fecha_matricula
                        )}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Categoría(s)
                      </span>

                      <p className="font-bold text-gray-900">
                        {categoriasTexto(
                          detalle?.categorias
                        )}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Estado cartera
                      </span>

                      <div className="mt-1">
                        <BadgeEstado
                          estado={
                            detalle?.estado_cartera
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* =========================================
                    CONVENIO
                ========================================= */}

                <div
                  className="
                    mt-3
                    border
                    border-emerald-200
                    rounded-xl
                    overflow-hidden
                  "
                >
                  <div
                    className="
                      bg-emerald-50
                      border-b
                      border-emerald-200
                      px-3
                      py-2
                    "
                  >
                    <h3
                      className="
                        text-[10px]
                        font-black
                        text-emerald-800
                      "
                    >
                      <i className="fas fa-handshake mr-2"></i>

                      Convenio
                    </h3>
                  </div>

                  <div
                    className="
                      p-3
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-3
                      text-[10px]
                    "
                  >
                    <div>
                      <span className="text-gray-500">
                        Nombre
                      </span>

                      <p className="font-bold text-gray-900">
                        {detalle?.convenio_nombre ||
                          '-'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Documento / NIT
                      </span>

                      <p className="font-bold text-gray-900">
                        {detalle
                          ?.convenio
                          ?.documento ||
                          '-'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Celular
                      </span>

                      <p className="font-bold text-gray-900">
                        {detalle
                          ?.convenio
                          ?.celular ||
                          '-'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500">
                        Correo
                      </span>

                      <p
                        className="
                          font-bold
                          text-gray-900
                          break-all
                        "
                      >
                        {detalle
                          ?.convenio
                          ?.correo ||
                          '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* =========================================
                    RESUMEN FINANCIERO
                ========================================= */}

                <div
                  className="
                    mt-3
                    grid
                    grid-cols-1
                    sm:grid-cols-3
                    gap-2
                  "
                >
                  <div
                    className="
                      border
                      border-blue-200
                      bg-blue-50
                      rounded-lg
                      p-3
                    "
                  >
                    <p className="text-[9px] text-blue-700 font-bold uppercase">
                      Obligación
                    </p>

                    <p className="mt-1 text-base font-black text-gray-900">
                      {formatearMoneda(
                        detalle?.valor_total
                      )}
                    </p>
                  </div>

                  <div
                    className="
                      border
                      border-emerald-200
                      bg-emerald-50
                      rounded-lg
                      p-3
                    "
                  >
                    <p className="text-[9px] text-emerald-700 font-bold uppercase">
                      Pagado
                    </p>

                    <p className="mt-1 text-base font-black text-gray-900">
                      {formatearMoneda(
                        detalle?.total_pagado
                      )}
                    </p>
                  </div>

                  <div
                    className="
                      border
                      border-red-200
                      bg-red-50
                      rounded-lg
                      p-3
                    "
                  >
                    <p className="text-[9px] text-red-700 font-bold uppercase">
                      Saldo
                    </p>

                    <p className="mt-1 text-base font-black text-gray-900">
                      {formatearMoneda(
                        detalle?.saldo
                      )}
                    </p>
                  </div>
                </div>

                {/* =========================================
                    OBLIGACIONES
                ========================================= */}

                <div
                  className="
                    mt-3
                    border
                    border-gray-200
                    rounded-xl
                    overflow-hidden
                  "
                >
                  <div
                    className="
                      bg-gray-50
                      border-b
                      border-gray-200
                      px-3
                      py-2
                    "
                  >
                    <h3
                      className="
                        text-[10px]
                        font-black
                        text-gray-800
                      "
                    >
                      <i className="fas fa-file-invoice-dollar mr-2 text-blue-600"></i>

                      Obligaciones
                    </h3>
                  </div>

                  <div
                    className="
                      overflow-x-auto
                    "
                  >
                    <table
                      className="
                        w-full
                        text-[10px]
                      "
                    >
                      <thead
                        className="
                          bg-white
                          text-gray-500
                        "
                      >
                        <tr>
                          <th className="px-3 py-2 text-left">
                            Descripción
                          </th>

                          <th className="px-3 py-2 text-right">
                            Valor
                          </th>

                          <th className="px-3 py-2 text-right">
                            Pagado
                          </th>

                          <th className="px-3 py-2 text-right">
                            Saldo
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {Array.isArray(
                          detalle?.cuentas
                        ) &&
                        detalle.cuentas.length >
                          0 ? (
                          detalle.cuentas.map(
                            cuenta => (
                              <tr
                                key={
                                  cuenta.id
                                }
                                className="
                                  border-t
                                  border-gray-100
                                "
                              >
                                <td className="px-3 py-2">
                                  <p className="font-bold text-gray-900">
                                    {cuenta?.descripcion ||
                                      'Obligación de matrícula'}
                                  </p>

                                  <p className="text-[9px] text-gray-500">
                                    {formatearFecha(
                                      cuenta?.fecha_creacion
                                    )}
                                  </p>
                                </td>

                                <td className="px-3 py-2 text-right font-bold">
                                  {formatearMoneda(
                                    cuenta?.valor_total
                                  )}
                                </td>

                                <td className="px-3 py-2 text-right text-emerald-700 font-bold">
                                  {formatearMoneda(
                                    cuenta?.total_pagado
                                  )}
                                </td>

                                <td className="px-3 py-2 text-right text-red-700 font-black">
                                  {formatearMoneda(
                                    cuenta?.saldo
                                  )}
                                </td>
                              </tr>
                            )
                          )
                        ) : (
                          <tr>
                            <td
                              colSpan="4"
                              className="
                                px-3
                                py-6
                                text-center
                                text-gray-400
                              "
                            >
                              No se encontraron obligaciones.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* =========================================
                    HISTORIAL PAGOS
                ========================================= */}

                <div
                  className="
                    mt-3
                    border
                    border-gray-200
                    rounded-xl
                    overflow-hidden
                  "
                >
                  <div
                    className="
                      bg-gray-50
                      border-b
                      border-gray-200
                      px-3
                      py-2
                      flex
                      items-center
                      justify-between
                      gap-2
                    "
                  >
                    <h3
                      className="
                        text-[10px]
                        font-black
                        text-gray-800
                      "
                    >
                      <i className="fas fa-clock-rotate-left mr-2 text-emerald-600"></i>

                      Historial de pagos
                    </h3>

                    <span
                      className="
                        text-[9px]
                        font-bold
                        text-gray-500
                      "
                    >
                      {pagosActivos.length}{' '}
                      pago(s)
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table
                      className="
                        w-full
                        text-[10px]
                      "
                    >
                      <thead>
                        <tr className="text-gray-500">
                          <th className="px-3 py-2 text-left">
                            Fecha
                          </th>

                          <th className="px-3 py-2 text-left">
                            Descripción
                          </th>

                          <th className="px-3 py-2 text-left">
                            Medio
                          </th>

                          <th className="px-3 py-2 text-right">
                            Valor
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {pagosActivos.length >
                        0 ? (
                          pagosActivos.map(
                            pago => (
                              <tr
                                key={
                                  pago.id
                                }
                                className="
                                  border-t
                                  border-gray-100
                                "
                              >
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {formatearFecha(
                                    pago?.fecha
                                  )}
                                </td>

                                <td className="px-3 py-2">
                                  <p className="font-bold text-gray-900">
                                    {pago?.descripcion ||
                                      '-'}
                                  </p>

                                  {pago
                                    ?.referencia_pago && (
                                    <p className="text-[9px] text-gray-500">
                                      Ref.{' '}
                                      {
                                        pago.referencia_pago
                                      }
                                    </p>
                                  )}
                                </td>

                                <td className="px-3 py-2">
                                  {pago
                                    ?.medio_pago
                                    ?.nombre ||
                                    '-'}
                                </td>

                                <td className="px-3 py-2 text-right font-black text-emerald-700">
                                  {formatearMoneda(
                                    pago?.valor
                                  )}
                                </td>
                              </tr>
                            )
                          )
                        ) : (
                          <tr>
                            <td
                              colSpan="4"
                              className="
                                px-3
                                py-8
                                text-center
                                text-gray-400
                              "
                            >
                              <i className="fas fa-receipt mr-2"></i>

                              El aprendiz todavía no registra abonos.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
        </div>

        {/* ===============================================
            FOOTER
        =============================================== */}

        <div
          className="
            shrink-0
            border-t
            border-gray-200
            bg-gray-50
            px-4
            py-3
            flex
            justify-end
          "
        >
          <button
            type="button"
            onClick={
              onClose
            }
            className="
              bg-slate-700
              hover:bg-slate-900
              text-white
              px-4
              py-2
              rounded-lg
              text-xs
              font-bold
            "
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// =========================================================
// PÁGINA
// =========================================================

export default function ConveniosCajaPage() {
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
    cartera,
    setCartera,
  ] =
    useState([])

  const [
    convenios,
    setConvenios,
  ] =
    useState([])

  const [
    resumen,
    setResumen,
  ] =
    useState({
      cantidad_aprendices:
        0,

      valor_total:
        0,

      total_pagado:
        0,

      saldo_pendiente:
        0,

      sin_abonos:
        0,

      con_abonos:
        0,

      paz_y_salvo:
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
    busquedaAplicada,
    setBusquedaAplicada,
  ] =
    useState('')

  const [
    convenioId,
    setConvenioId,
  ] =
    useState('')

  const [
    estadoCartera,
    setEstadoCartera,
  ] =
    useState(
      'PENDIENTE'
    )

  const [
    fechaInicio,
    setFechaInicio,
  ] =
    useState('')

  const [
    fechaFin,
    setFechaFin,
  ] =
    useState('')

  // =======================================================
  // ESTADOS
  // =======================================================

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
  // DRAWER
  // =======================================================

  const [
    drawerAbierto,
    setDrawerAbierto,
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
    cargandoDetalle,
    setCargandoDetalle,
  ] =
    useState(
      false
    )

  const [
    errorDetalle,
    setErrorDetalle,
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
  // USUARIO OPERACIÓN
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
  // BÚSQUEDA AUTOMÁTICA
  // =======================================================

  useEffect(
    () => {
      const valor =
        texto(
          busqueda
        )

      if (
        valor.length ===
          0
      ) {
        setBusquedaAplicada(
          ''
        )

        return
      }

      if (
        valor.length <
        3
      ) {
        return
      }

      const timer =
        setTimeout(
          () => {
            setBusquedaAplicada(
              valor
            )
          },
          450
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
  // CARGAR CONVENIOS
  // =======================================================

  const cargarConvenios =
    useCallback(
      async () => {
        if (
          !nit
        ) {
          return
        }

        try {
          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'convenios'
          )

          params.set(
            'nit',
            nit
          )

          const data =
            await fetchJsonSeguro(
              `${API_URL}?${params.toString()}`
            )

          setConvenios(
            Array.isArray(
              data?.data
            )
              ? data.data
              : []
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
          errorConvenios
        ) {
          console.error(
            'Error cargando convenios:',
            errorConvenios
          )
        }
      },
      [
        nit,
      ]
    )

  // =======================================================
  // CARGAR CARTERA
  // =======================================================

  const cargarCartera =
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
          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'cartera'
          )

          params.set(
            'nit',
            nit
          )

          params.set(
            'estado_cartera',
            estadoCartera
          )

          if (
            convenioId
          ) {
            params.set(
              'convenio_id',
              convenioId
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

          if (
            busquedaAplicada
          ) {
            params.set(
              'busqueda',
              busquedaAplicada
            )
          }

          const data =
            await fetchJsonSeguro(
              `${API_URL}?${params.toString()}`
            )

          setCartera(
            Array.isArray(
              data?.data
            )
              ? data.data
              : []
          )

          setResumen(
            data?.resumen ||
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
          errorCartera
        ) {
          console.error(
            'Error cargando cartera de convenios:',
            errorCartera
          )

          setCartera([])

          setError(
            errorCartera
              ?.message ||
            'No fue posible consultar la cartera de convenios.'
          )
        } finally {
          setCargando(
            false
          )
        }
      },
      [
        nit,
        estadoCartera,
        convenioId,
        fechaInicio,
        fechaFin,
        busquedaAplicada,
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

      cargarConvenios()
    },
    [
      sesionLista,
      nit,
      cargarConvenios,
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

      cargarCartera()
    },
    [
      sesionLista,
      nit,
      cargarCartera,
    ]
  )

  // =======================================================
  // VER DETALLE
  // =======================================================

  const verDetalle =
    useCallback(
      async (
        item
      ) => {
        const matriculaId =
          item?.matricula_id

        if (
          !matriculaId
        ) {
          return
        }

        setDrawerAbierto(
          true
        )

        setDetalle(
          null
        )

        setErrorDetalle(
          ''
        )

        setCargandoDetalle(
          true
        )

        try {
          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'detalle'
          )

          params.set(
            'nit',
            nit
          )

          params.set(
            'matricula_id',
            String(
              matriculaId
            )
          )

          const data =
            await fetchJsonSeguro(
              `${API_URL}?${params.toString()}`
            )

          setDetalle(
            data?.data ||
            null
          )
        } catch (
          errorConsulta
        ) {
          console.error(
            'Error consultando detalle:',
            errorConsulta
          )

          setErrorDetalle(
            errorConsulta
              ?.message ||
            'No fue posible consultar el detalle.'
          )
        } finally {
          setCargandoDetalle(
            false
          )
        }
      },
      [
        nit,
      ]
    )

  // =======================================================
  // CERRAR DRAWER
  // =======================================================

  function cerrarDrawer() {
    setDrawerAbierto(
      false
    )

    setDetalle(
      null
    )

    setErrorDetalle(
      ''
    )
  }

  // =======================================================
  // LIMPIAR FILTROS
  // =======================================================

  function limpiarFiltros() {
    setBusqueda(
      ''
    )

    setBusquedaAplicada(
      ''
    )

    setConvenioId(
      ''
    )

    setEstadoCartera(
      'PENDIENTE'
    )

    setFechaInicio(
      ''
    )

    setFechaFin(
      ''
    )
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

        Cargando cartera de convenios...
      </div>
    )
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <>
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
            rounded-xl
            p-4
            md:p-6
          "
        >
          <EncabezadoModulo titulo="Convenios y Asesores" subtitulo="Consulta del estado de los aprendices vinculados a convenios, tramitadores y asesores." icono={Handshake} rutaRegreso="/admin/caja" textoRegreso="Volver a Caja" />
          <div className="flex justify-end px-4 py-3">
            <BotonActualizar onClick={cargarCartera} disabled={cargando}>
              <i className={`fas fa-sync-alt mr-2 ${cargando ? 'fa-spin' : ''}`}></i>Actualizar
            </BotonActualizar>
          </div>

          {/* =============================================
              ERROR
          ============================================== */}

          {error && (
            <div
              className="
                bg-red-50
                border
                border-red-300
                text-red-700
                rounded-lg
                p-3
                mb-3
                text-xs
              "
            >
              <i className="fas fa-exclamation-triangle mr-2"></i>

              {error}
            </div>
          )}

          {/* =============================================
              RESUMEN
          ============================================== */}

          <div
            className="
              mb-2
            "
          >
            <h2
              className="
                text-xs
                font-black
                text-gray-800
              "
            >
              Resumen de cartera
            </h2>

            <p
              className="
                text-[9px]
                text-gray-500
              "
            >
              Estado financiero de los aprendices matriculados mediante convenios.
            </p>
          </div>

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
              titulo="Cartera Generada"
              valor={
                formatearMoneda(
                  resumen
                    ?.valor_total
                )
              }
              subtitulo={`${numero(
                resumen
                  ?.cantidad_aprendices
              )} aprendiz(es)`}
              icono="fas fa-file-invoice-dollar"
              tono="azul"
            />

            <TarjetaResumen
              titulo="Total Pagado"
              valor={
                formatearMoneda(
                  resumen
                    ?.total_pagado
                )
              }
              subtitulo="Abonos registrados"
              icono="fas fa-circle-check"
              tono="verde"
            />

            <TarjetaResumen
              titulo="Saldo Pendiente"
              valor={
                formatearMoneda(
                  resumen
                    ?.saldo_pendiente
                )
              }
              subtitulo="Cartera por recaudar"
              icono="fas fa-wallet"
              tono="rojo"
            />

            <TarjetaResumen
              titulo="Pendientes sin Abono"
              valor={
                numero(
                  resumen
                    ?.sin_abonos
                )
              }
              subtitulo="Requieren seguimiento"
              icono="fas fa-user-clock"
              tono="amarillo"
            />
          </div>

          {/* =============================================
              FILTROS
          ============================================== */}

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
                bg-gray-50
                p-3
              "
            >
              <div
                className="
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  xl:grid-cols-6
                  gap-3
                "
              >
                {/* BÚSQUEDA */}

                <div
                  className="
                    xl:col-span-1
                  "
                >
                  <label
                    className="
                      block
                      text-[9px]
                      font-bold
                      text-gray-600
                      mb-1
                    "
                  >
                    Buscar aprendiz
                  </label>

                  <div className="relative">
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
                      "
                    ></i>

                    <input
                      type="text"
                      value={
                        busqueda
                      }
                      onChange={
                        event =>
                          setBusqueda(
                            event
                              .target
                              .value
                          )
                      }
                      placeholder="Documento, nombre, matrícula..."
                      className="
                        w-full
                        border
                        border-gray-300
                        rounded-lg
                        pl-8
                        pr-3
                        py-2
                        text-xs
                        outline-none
                        focus:border-blue-500
                      "
                    />
                  </div>

                  {busqueda.length >
                    0 &&
                    busqueda.length <
                      3 && (
                      <p
                        className="
                          mt-1
                          text-[8px]
                          text-gray-400
                        "
                      >
                        Digite mínimo 3 caracteres.
                      </p>
                    )}
                </div>

                {/* CONVENIO */}

                <div>
                  <label
                    className="
                      block
                      text-[9px]
                      font-bold
                      text-gray-600
                      mb-1
                    "
                  >
                    Convenio
                  </label>

                  <select
                    value={
                      convenioId
                    }
                    onChange={
                      event =>
                        setConvenioId(
                          event
                            .target
                            .value
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
                      bg-white
                      outline-none
                      focus:border-blue-500
                    "
                  >
                    <option value="">
                      Todos los convenios
                    </option>

                    {convenios.map(
                      convenio => (
                        <option
                          key={
                            convenio.id
                          }
                          value={
                            convenio.id
                          }
                        >
                          {
                            convenio.nombre
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* ESTADO */}

                <div>
                  <label
                    className="
                      block
                      text-[9px]
                      font-bold
                      text-gray-600
                      mb-1
                    "
                  >
                    Estado de cartera
                  </label>

                  <select
                    value={
                      estadoCartera
                    }
                    onChange={
                      event =>
                        setEstadoCartera(
                          event
                            .target
                            .value
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
                      bg-white
                      outline-none
                      focus:border-blue-500
                    "
                  >
                    {ESTADOS_CARTERA.map(
                      estado => (
                        <option
                          key={
                            estado.value
                          }
                          value={
                            estado.value
                          }
                        >
                          {estado.label} ·{' '}
                          {
                            estado.descripcion
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* FECHA INICIAL */}

                <div>
                  <label
                    className="
                      block
                      text-[9px]
                      font-bold
                      text-gray-600
                      mb-1
                    "
                  >
                    Inscrito desde
                  </label>

                  <input
                    type="date"
                    value={
                      fechaInicio
                    }
                    onChange={
                      event =>
                        setFechaInicio(
                          event
                            .target
                            .value
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
                      bg-white
                      outline-none
                      focus:border-blue-500
                    "
                  />
                </div>

                {/* FECHA FINAL */}

                <div>
                  <label
                    className="
                      block
                      text-[9px]
                      font-bold
                      text-gray-600
                      mb-1
                    "
                  >
                    Inscrito hasta
                  </label>

                  <input
                    type="date"
                    value={
                      fechaFin
                    }
                    onChange={
                      event =>
                        setFechaFin(
                          event
                            .target
                            .value
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
                      bg-white
                      outline-none
                      focus:border-blue-500
                    "
                  />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={limpiarFiltros} className="h-[34px] w-full rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-100">
                    <i className="fas fa-eraser mr-1"></i>Limpiar filtros
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* =============================================
              TABLA
          ============================================== */}

          <div className="overflow-hidden rounded-xl border border-slate-300">
            <div
              className="
                bg-slate-800
                text-white
                px-4
                py-2.5
                flex
                flex-col
                sm:flex-row
                sm:items-center
                sm:justify-between
                gap-2
              "
            >
              <div className="min-w-0"><h2 className="text-xs font-bold"><i className="fas fa-users mr-2"></i>Aprendices por convenio</h2><p className="mt-0.5 text-[9px] text-slate-300">Consulte la obligación, pagos realizados y saldo pendiente.</p></div>
              <div
                className="
                  text-[9px]
                  text-slate-300
                "
              >
                {cartera.length}{' '}
                registro(s) mostrado(s)
              </div>
            </div>

            <div
              className="
                overflow-x-auto
              "
            >
              <table
                className="
                  w-full
                  text-[10px]
                "
              >
                <thead
                  className="
                    bg-gray-100
                    text-gray-600
                  "
                >
                  <tr>
                    <th className="px-3 py-2.5 text-left">
                      Matrícula
                    </th>

                    <th className="px-3 py-2.5 text-left">
                      Aprendiz
                    </th>

                    <th className="px-3 py-2.5 text-left">
                      Convenio
                    </th>

                    <th className="px-3 py-2.5 text-left">
                      Categoría
                    </th>

                    <th className="px-3 py-2.5 text-right">
                      Obligación
                    </th>

                    <th className="px-3 py-2.5 text-right">
                      Pagado
                    </th>

                    <th className="px-3 py-2.5 text-right">
                      Saldo
                    </th>

                    <th className="px-3 py-2.5 text-center">
                      Estado
                    </th>

                    <th className="px-3 py-2.5 text-center">
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
                          px-3
                          py-12
                          text-center
                          text-gray-500
                        "
                      >
                        <i className="fas fa-spinner fa-spin mr-2"></i>

                        Consultando cartera...
                      </td>
                    </tr>
                  ) : cartera.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="
                          px-3
                          py-12
                          text-center
                          text-gray-400
                        "
                      >
                        <div
                          className="
                            flex
                            flex-col
                            items-center
                            gap-2
                          "
                        >
                          <i
                            className="
                              fas
                              fa-folder-open
                              text-2xl
                              text-gray-300
                            "
                          ></i>

                          <span>
                            No se encontraron aprendices con los filtros seleccionados.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cartera.map(
                      item => (
                        <tr
                          key={
                            item
                              .matricula_id
                          }
                          className="
                            border-t
                            border-gray-100
                            hover:bg-blue-50/40
                            transition
                          "
                        >
                          {/* MATRÍCULA */}

                          <td
                            className="
                              px-3
                              py-2.5
                              whitespace-nowrap
                            "
                          >
                            <p className="font-black text-gray-900">
                              {item?.consecutivo ||
                                '-'}
                            </p>

                            <p className="text-[9px] text-gray-500">
                              {formatearFecha(
                                item?.fecha_matricula
                              )}
                            </p>
                          </td>

                          {/* APRENDIZ */}

                          <td
                            className="
                              px-3
                              py-2.5
                              min-w-[190px]
                            "
                          >
                            <p className="font-bold text-gray-900">
                              {item?.nombre_completo ||
                                '-'}
                            </p>

                            <p className="text-[9px] text-gray-500">
                              {item?.tipo_documento ||
                                ''}{' '}
                              {item?.documento ||
                                ''}
                            </p>
                          </td>

                          {/* CONVENIO */}

                          <td
                            className="
                              px-3
                              py-2.5
                              min-w-[150px]
                            "
                          >
                            <p className="font-bold text-emerald-700">
                              {item?.convenio_nombre ||
                                '-'}
                            </p>
                          </td>

                          {/* CATEGORÍAS */}

                          <td
                            className="
                              px-3
                              py-2.5
                              whitespace-nowrap
                            "
                          >
                            {categoriasTexto(
                              item?.categorias
                            )}
                          </td>

                          {/* OBLIGACIÓN */}

                          <td
                            className="
                              px-3
                              py-2.5
                              text-right
                              whitespace-nowrap
                              font-bold
                              text-gray-900
                            "
                          >
                            {formatearMoneda(
                              item?.valor_total
                            )}
                          </td>

                          {/* PAGADO */}

                          <td
                            className="
                              px-3
                              py-2.5
                              text-right
                              whitespace-nowrap
                              font-bold
                              text-emerald-700
                            "
                          >
                            {formatearMoneda(
                              item?.total_pagado
                            )}
                          </td>

                          {/* SALDO */}

                          <td
                            className="
                              px-3
                              py-2.5
                              text-right
                              whitespace-nowrap
                              font-black
                              text-red-700
                            "
                          >
                            {formatearMoneda(
                              item?.saldo
                            )}
                          </td>

                          {/* ESTADO */}

                          <td
                            className="
                              px-3
                              py-2.5
                              text-center
                            "
                          >
                            <BadgeEstado
                              estado={
                                item?.estado_cartera
                              }
                            />
                          </td>

                          {/* ACCIÓN */}

                          <td
                            className="
                              px-3
                              py-2.5
                              text-center
                            "
                          >
                            <BotonVerDetalle onClick={() => verDetalle(item)}>Detalle</BotonVerDetalle>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* ===========================================
                PIE TABLA
            ============================================ */}

            {!cargando &&
              cartera.length >
                0 && (
                <div
                  className="
                    border-t
                    border-gray-200
                    bg-gray-50
                    px-3
                    py-2
                    flex
                    flex-col
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                    gap-2
                    text-[9px]
                    text-gray-500
                  "
                >
                  <span>
                    Mostrando{' '}
                    <strong className="text-gray-800">
                      {cartera.length}
                    </strong>{' '}
                    aprendiz(es).
                  </span>

                  <span>
                    Saldo total de cartera:{' '}

                    <strong className="text-red-700">
                      {formatearMoneda(
                        resumen
                          ?.saldo_pendiente
                      )}
                    </strong>
                  </span>
                </div>
              )}
          </div>

          {/* =============================================
              INFORMACIÓN
          ============================================== */}

          <div
            className="
              mt-3
              border
              border-blue-200
              rounded-lg
              bg-blue-50
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
                text-blue-800
              "
            >
              <i
                className="
                  fas
                  fa-circle-info
                  mt-0.5
                "
              ></i>

              <p>
                Esta sección es de consulta y control de cartera.
                Los pagos se registran desde el módulo de Ingresos,
                conservando la trazabilidad de cada recibo y su
                aplicación a la obligación correspondiente.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          DRAWER DETALLE
      ================================================== */}

      <DetalleCarteraModal
        abierto={
          drawerAbierto
        }
        detalle={
          detalle
        }
        cargando={
          cargandoDetalle
        }
        error={
          errorDetalle
        }
        onClose={
          cerrarDrawer
        }
      />
    </>
  )
}