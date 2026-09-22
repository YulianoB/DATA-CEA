// app/instructor/practica/programacion/page.js

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

import {
  Toaster,
  toast,
} from 'sonner'

// =========================================================
// CONSTANTES
// =========================================================

const VISTAS = [
  {
    id: 'DIA',
    label: 'Día',
    dias: 1,
  },
  {
    id: 'SEMANA',
    label: 'Semana',
    dias: 7,
  },
  {
    id: 'QUINCENA',
    label: 'Quincena',
    dias: 15,
  },
  {
    id: 'MES',
    label: 'Mes',
    dias: null,
  },
]

const HORAS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
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

// =========================================================
// FECHA COLOMBIA
// =========================================================

function fechaColombia() {
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

// =========================================================
// SUMAR DÍAS
// =========================================================

function sumarDias(
  fecha,
  dias
) {
  const [
    anio,
    mes,
    dia,
  ] =
    fecha
      .split('-')
      .map(Number)

  const fechaUtc =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia
      )
    )

  fechaUtc.setUTCDate(
    fechaUtc.getUTCDate() +
    dias
  )

  return fechaUtc
    .toISOString()
    .slice(
      0,
      10
    )
}

// =========================================================
// INICIO DE SEMANA
// LUNES = PRIMER DÍA
// =========================================================

function inicioSemana(
  fecha
) {
  const [
    anio,
    mes,
    dia,
  ] =
    fecha
      .split('-')
      .map(Number)

  const fechaUtc =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia
      )
    )

  const diaSemana =
    fechaUtc.getUTCDay()

  const diferencia =
    diaSemana === 0
      ? -6
      : 1 - diaSemana

  fechaUtc.setUTCDate(
    fechaUtc.getUTCDate() +
    diferencia
  )

  return fechaUtc
    .toISOString()
    .slice(
      0,
      10
    )
}

// =========================================================
// INICIO / FIN MES
// =========================================================

function inicioMes(
  fecha
) {
  return `${fecha.slice(
    0,
    7
  )}-01`
}

function finMes(
  fecha
) {
  const [
    anio,
    mes,
  ] =
    fecha
      .split('-')
      .map(Number)

  const ultimoDia =
    new Date(
      Date.UTC(
        anio,
        mes,
        0
      )
    )

  return ultimoDia
    .toISOString()
    .slice(
      0,
      10
    )
}

// =========================================================
// RANGO SEGÚN VISTA
// =========================================================

function obtenerRango(
  vista,
  fechaReferencia
) {
  if (
    vista ===
    'DIA'
  ) {
    return {
      inicio:
        fechaReferencia,

      fin:
        fechaReferencia,
    }
  }

  if (
    vista ===
    'SEMANA'
  ) {
    const inicio =
      inicioSemana(
        fechaReferencia
      )

    return {
      inicio,

      fin:
        sumarDias(
          inicio,
          6
        ),
    }
  }

  if (
    vista ===
    'QUINCENA'
  ) {
    return {
      inicio:
        fechaReferencia,

      fin:
        sumarDias(
          fechaReferencia,
          14
        ),
    }
  }

  return {
    inicio:
      inicioMes(
        fechaReferencia
      ),

    fin:
      finMes(
        fechaReferencia
      ),
  }
}

// =========================================================
// MOVER PERIODO
// =========================================================

function moverPeriodo(
  vista,
  fechaReferencia,
  direccion
) {
  if (
    vista ===
    'DIA'
  ) {
    return sumarDias(
      fechaReferencia,
      direccion
    )
  }

  if (
    vista ===
    'SEMANA'
  ) {
    return sumarDias(
      fechaReferencia,
      direccion * 7
    )
  }

  if (
    vista ===
    'QUINCENA'
  ) {
    return sumarDias(
      fechaReferencia,
      direccion * 15
    )
  }

  const [
    anio,
    mes,
  ] =
    fechaReferencia
      .split('-')
      .map(Number)

  const nuevaFecha =
    new Date(
      Date.UTC(
        anio,
        mes - 1 +
          direccion,
        1
      )
    )

  return nuevaFecha
    .toISOString()
    .slice(
      0,
      10
    )
}

// =========================================================
// FORMATEAR FECHA COMPLETA
// =========================================================

function formatearFechaCompleta(
  fecha
) {
  if (
    !fecha
  ) {
    return ''
  }

  const [
    anio,
    mes,
    dia,
  ] =
    fecha
      .split('-')
      .map(Number)

  return new Intl.DateTimeFormat(
    'es-CO',
    {
      timeZone:
        'UTC',

      weekday:
        'long',

      day:
        'numeric',

      month:
        'long',

      year:
        'numeric',
    }
  ).format(
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia
      )
    )
  )
}

// =========================================================
// FORMATEAR FECHA CORTA
// =========================================================

function formatearFechaCorta(
  fecha
) {
  if (
    !fecha
  ) {
    return ''
  }

  const [
    anio,
    mes,
    dia,
  ] =
    fecha
      .split('-')
      .map(Number)

  return new Intl.DateTimeFormat(
    'es-CO',
    {
      timeZone:
        'UTC',

      weekday:
        'short',

      day:
        '2-digit',

      month:
        'short',
    }
  )
    .format(
      new Date(
        Date.UTC(
          anio,
          mes - 1,
          dia
        )
      )
    )
    .replace(
      /\./g,
      ''
    )
}

// =========================================================
// DÍA DE LA SEMANA
// =========================================================

function formatearDiaSemana(
  fecha
) {
  if (
    !fecha
  ) {
    return ''
  }

  const [
    anio,
    mes,
    dia,
  ] =
    fecha
      .split('-')
      .map(Number)

  return new Intl.DateTimeFormat(
    'es-CO',
    {
      timeZone:
        'UTC',

      weekday:
        'short',
    }
  )
    .format(
      new Date(
        Date.UTC(
          anio,
          mes - 1,
          dia
        )
      )
    )
    .replace(
      /\./g,
      ''
    )
    .toUpperCase()
}

// =========================================================
// NÚMERO DEL DÍA
// =========================================================

function numeroDia(
  fecha
) {
  return fecha
    ? fecha.slice(
        8,
        10
      )
    : ''
}

// =========================================================
// FORMATEAR RANGO
// =========================================================

function formatearRango(
  inicio,
  fin
) {
  if (
    inicio === fin
  ) {
    return formatearFechaCompleta(
      inicio
    )
  }

  const [
    anioInicio,
    mesInicio,
    diaInicio,
  ] =
    inicio
      .split('-')
      .map(Number)

  const [
    anioFin,
    mesFin,
    diaFin,
  ] =
    fin
      .split('-')
      .map(Number)

  const inicioTexto =
    new Intl.DateTimeFormat(
      'es-CO',
      {
        timeZone:
          'UTC',

        day:
          'numeric',

        month:
          'short',
      }
    ).format(
      new Date(
        Date.UTC(
          anioInicio,
          mesInicio - 1,
          diaInicio
        )
      )
    )

  const finTexto =
    new Intl.DateTimeFormat(
      'es-CO',
      {
        timeZone:
          'UTC',

        day:
          'numeric',

        month:
          'short',

        year:
          'numeric',
      }
    ).format(
      new Date(
        Date.UTC(
          anioFin,
          mesFin - 1,
          diaFin
        )
      )
    )

  return `${inicioTexto} - ${finTexto}`
}

// =========================================================
// ESTILOS SEGÚN ESTADO
// =========================================================

function estiloEstado(
  estado
) {
  const valor =
    mayusculas(
      estado
    )

  if (
    valor ===
    'AGENDADA'
  ) {
    return {
      tarjeta:
        'bg-blue-50 border-blue-300',

      barra:
        'bg-blue-600',

      badge:
        'bg-blue-600 text-white',

      icono:
        'text-blue-700',

      texto:
        'text-blue-900',
    }
  }

  if (
    valor ===
    'PENDIENTE_CARGUE'
  ) {
    return {
      tarjeta:
        'bg-amber-50 border-amber-300',

      barra:
        'bg-amber-500',

      badge:
        'bg-amber-500 text-white',

      icono:
        'text-amber-700',

      texto:
        'text-amber-900',
    }
  }

  if (
    valor ===
    'DICTADA'
  ) {
    return {
      tarjeta:
        'bg-emerald-50 border-emerald-300',

      barra:
        'bg-emerald-600',

      badge:
        'bg-emerald-600 text-white',

      icono:
        'text-emerald-700',

      texto:
        'text-emerald-900',
    }
  }

  if (
    valor ===
    'NO_DICTADA'
  ) {
    return {
      tarjeta:
        'bg-red-50 border-red-300',

      barra:
        'bg-red-600',

      badge:
        'bg-red-600 text-white',

      icono:
        'text-red-700',

      texto:
        'text-red-900',
    }
  }

  return {
    tarjeta:
      'bg-slate-50 border-slate-300',

    barra:
      'bg-slate-500',

    badge:
      'bg-slate-600 text-white',

    icono:
      'text-slate-600',

    texto:
      'text-slate-900',
  }
}

// =========================================================
// NOMBRE ESTADO
// =========================================================

function nombreEstado(
  estado
) {
  return mayusculas(
    estado
  ).replace(
    /_/g,
    ' '
  )
}

// =========================================================
// TIPO DE CLASE
// =========================================================

function tipoClase(
  tipo
) {
  return mayusculas(
    tipo
  ) ===
  'REFUERZO'
    ? 'REFUERZO'
    : 'CURSO'
}

// =========================================================
// COMPONENTE
// =========================================================

export default function InstructorProgramacionPage() {
  const router =
    useRouter()

  const [
    user,
    setUser,
  ] =
    useState(
      null
    )

  const [
    vista,
    setVista,
  ] =
    useState(
      'SEMANA'
    )

  const [
    fechaReferencia,
    setFechaReferencia,
  ] =
    useState(
      () =>
        fechaColombia()
    )

  const [
    clases,
    setClases,
  ] =
    useState(
      []
    )

  const [
    instructor,
    setInstructor,
  ] =
    useState(
      null
    )

  const [
    empresa,
    setEmpresa,
  ] =
    useState(
      null
    )

  const [
    cargando,
    setCargando,
  ] =
    useState(
      false
    )

  const [
    claseSeleccionada,
    setClaseSeleccionada,
  ] =
    useState(
      null
    )

  // =======================================================
  // CARGAR USUARIO
  // =======================================================

  useEffect(
    () => {
      try {
        const storedUser =
          localStorage.getItem(
            'currentUser'
          )

        if (
          !storedUser
        ) {
          router.push(
            '/login'
          )

          return
        }

        const parsed =
          JSON.parse(
            storedUser
          )

        setUser(
          parsed
        )
      } catch {
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
  // EMPRESA ACTUAL
  // =======================================================

  const nitActual =
    useMemo(
      () => {
        if (
          typeof window ===
          'undefined'
        ) {
          return ''
        }

        return (
          user?.nitEmpresa ||
          localStorage.getItem(
            'currentEmpresaNit'
          ) ||
          ''
        )
      },
      [
        user,
      ]
    )

  // =======================================================
  // RANGO
  // =======================================================

  const rango =
    useMemo(
      () =>
        obtenerRango(
          vista,
          fechaReferencia
        ),
      [
        vista,
        fechaReferencia,
      ]
    )

  // =======================================================
  // CONSULTAR PROGRAMACIÓN
  // =======================================================

  const cargarProgramacion =
    useCallback(
      async () => {
        if (
          !user ||
          !nitActual
        ) {
          return
        }

        const documento =
          texto(
            user?.documento
          )

        if (
          !documento
        ) {
          toast.error(
            'El usuario no tiene documento registrado.'
          )

          return
        }

        try {
          setCargando(
            true
          )

          const params =
            new URLSearchParams()

          params.set(
            'nit',
            nitActual
          )

          params.set(
            'documento',
            documento
          )

          params.set(
            'fecha_inicio',
            rango.inicio
          )

          params.set(
            'fecha_fin',
            rango.fin
          )

          const respuesta =
            await fetch(
              `/api/instructor/practica/programacion?${params.toString()}`,
              {
                cache:
                  'no-store',
              }
            )

          const contenido =
            await respuesta.text()

          let json =
            null

          try {
            json =
              contenido
                ? JSON.parse(
                    contenido
                  )
                : null
          } catch {
            console.error(
              'La API no devolvió JSON:',
              contenido
            )

            throw new Error(
              `La API de programación presentó un error del servidor. Código HTTP: ${respuesta.status}.`
            )
          }

          if (
            !respuesta.ok ||
            json?.status !==
              'success'
          ) {
            throw new Error(
              json?.message ||
              `No fue posible consultar la programación. Código HTTP: ${respuesta.status}.`
            )
          }

          const clasesRecibidas =
            Array.isArray(
              json?.data
            )
              ? json.data
              : []

          // =============================================
          // EL INSTRUCTOR NO DEBE VER CLASES CANCELADAS
          // =============================================

          const clasesVisibles =
            clasesRecibidas.filter(
              clase =>
                mayusculas(
                  clase?.estado
                ) !==
                'CANCELADA'
            )

          setClases(
            clasesVisibles
          )

          setInstructor(
            json?.instructor ||
            null
          )

          setEmpresa(
            json?.empresa ||
            null
          )
        } catch (
          error
        ) {
          console.error(
            error
          )

          setClases(
            []
          )

          toast.error(
            error?.message ||
            'No fue posible consultar la programación.'
          )
        } finally {
          setCargando(
            false
          )
        }
      },
      [
        user,
        nitActual,
        rango.inicio,
        rango.fin,
      ]
    )

  useEffect(
    () => {
      cargarProgramacion()
    },
    [
      cargarProgramacion,
    ]
  )

  // =======================================================
  // AGRUPAR CLASES POR FECHA
  // =======================================================

  const clasesPorFecha =
    useMemo(
      () => {
        const mapa =
          new Map()

        for (
          const clase of
            clases
        ) {
          const fecha =
            texto(
              clase?.fecha
            )

          if (
            !fecha
          ) {
            continue
          }

          if (
            !mapa.has(
              fecha
            )
          ) {
            mapa.set(
              fecha,
              []
            )
          }

          mapa
            .get(
              fecha
            )
            .push(
              clase
            )
        }

        for (
          const [
            fecha,
            items,
          ] of mapa
        ) {
          mapa.set(
            fecha,
            items.sort(
              (
                a,
                b
              ) =>
                texto(
                  a?.hora_inicio
                ).localeCompare(
                  texto(
                    b?.hora_inicio
                  )
                )
            )
          )
        }

        return mapa
      },
      [
        clases,
      ]
    )

  // =======================================================
  // FECHAS DEL RANGO
  // =======================================================

  const fechasDelRango =
    useMemo(
      () => {
        const resultado =
          []

        let actual =
          rango.inicio

        while (
          actual <=
          rango.fin
        ) {
          resultado.push(
            actual
          )

          actual =
            sumarDias(
              actual,
              1
            )
        }

        return resultado
      },
      [
        rango.inicio,
        rango.fin,
      ]
    )

  // =======================================================
  // NAVEGACIÓN
  // =======================================================

  const irAnterior =
    () => {
      setFechaReferencia(
        anterior =>
          moverPeriodo(
            vista,
            anterior,
            -1
          )
      )
    }

  const irSiguiente =
    () => {
      setFechaReferencia(
        anterior =>
          moverPeriodo(
            vista,
            anterior,
            1
          )
      )
    }

  const irHoy =
    () => {
      setFechaReferencia(
        fechaColombia()
      )
    }

  // =======================================================
  // CAMBIAR VISTA
  // =======================================================

  const cambiarVista =
    nuevaVista => {
      setVista(
        nuevaVista
      )

      setFechaReferencia(
        fechaColombia()
      )
    }

  // =======================================================
  // VOLVER
  // =======================================================

  const volver =
    () => {
      router.push(
        '/instructor/practica'
      )
    }

  // =======================================================
  // LOADING INICIAL
  // =======================================================

  if (
    !user
  ) {
    return (
      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-gray-100
          px-4
        "
      >
        <div
          className="
            text-center
            text-gray-600
          "
        >
          <i
            className="
              fas
              fa-spinner
              fa-spin
              text-2xl
              mb-3
            "
          ></i>

          <p
            className="
              text-sm
              font-semibold
            "
          >
            Cargando...
          </p>
        </div>
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
        bg-gray-100
        pb-10
      "
    >
      <Toaster
        position="top-center"
        richColors
      />

      {/* ===============================================
          ENCABEZADO
      =============================================== */}

      <div
        className="
          sticky
          top-0
          z-30
          bg-slate-800
          text-white
          shadow-md
        "
      >
        <div
          className="
            max-w-7xl
            mx-auto
            px-4
            py-3
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <button
              type="button"
              onClick={
                volver
              }
              className="
                w-9
                h-9
                flex
                items-center
                justify-center
                rounded-lg
                bg-white/10
                hover:bg-white/20
                transition
              "
              title="Volver"
            >
              <i className="fas fa-arrow-left"></i>
            </button>

            <div
              className="
                min-w-0
                flex-1
              "
            >
              <h1
                className="
                  text-base
                  font-black
                  uppercase
                  tracking-wide
                  truncate
                "
              >
                Programación de Clases
              </h1>

              <p
                className="
                  text-[10px]
                  text-slate-300
                  truncate
                "
              >
                Consulta de programación asignada
              </p>
            </div>

            <button
              type="button"
              onClick={
                cargarProgramacion
              }
              disabled={
                cargando
              }
              className="
                w-9
                h-9
                flex
                items-center
                justify-center
                rounded-lg
                bg-white/10
                hover:bg-white/20
                disabled:opacity-50
                transition
              "
              title="Actualizar"
            >
              <i
                className={`
                  fas
                  fa-sync-alt
                  ${
                    cargando
                      ? 'fa-spin'
                      : ''
                  }
                `}
              ></i>
            </button>
          </div>
        </div>
      </div>

      <main
        className="
          max-w-7xl
          mx-auto
          px-3
          sm:px-4
          py-4
        "
      >
        {/* =============================================
            INFORMACIÓN INSTRUCTOR
        ============================================= */}

        <div
          className="
            bg-white
            border
            border-gray-200
            rounded-xl
            shadow-sm
            p-4
            mb-4
          "
        >
          <div
            className="
              flex
              items-start
              gap-3
            "
          >
            <div
              className="
                w-11
                h-11
                flex
                items-center
                justify-center
                rounded-full
                bg-sky-100
                text-sky-700
                shrink-0
              "
            >
              <i className="fas fa-user-tie text-lg"></i>
            </div>

            <div
              className="
                min-w-0
                flex-1
              "
            >
              <p
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wide
                  text-gray-400
                "
              >
                Instructor
              </p>

              <p
                className="
                  text-sm
                  sm:text-base
                  font-black
                  text-gray-800
                  uppercase
                "
              >
                {instructor
                  ?.nombre_completo ||
                  user
                    ?.nombreCompleto ||
                  'INSTRUCTOR'}
              </p>

              {(empresa?.nombre ||
                user?.nombreEmpresa) && (
                <p
                  className="
                    mt-1
                    text-[10px]
                    text-gray-500
                  "
                >
                  CEA:{' '}

                  <strong>
                    {empresa
                      ?.nombre ||
                      user
                        ?.nombreEmpresa}
                  </strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* =============================================
            SELECTOR DE VISTA
        ============================================= */}

        <div
          className="
            bg-white
            border
            border-gray-200
            rounded-xl
            shadow-sm
            p-2
            mb-4
          "
        >
          <div
            className="
              grid
              grid-cols-4
              gap-1
            "
          >
            {VISTAS.map(
              item => (
                <button
                  key={
                    item.id
                  }
                  type="button"
                  onClick={() =>
                    cambiarVista(
                      item.id
                    )
                  }
                  className={`
                    rounded-lg
                    px-1
                    py-2.5
                    text-[9px]
                    sm:text-[10px]
                    font-black
                    uppercase
                    transition
                    ${
                      vista ===
                      item.id
                        ? 'bg-sky-700 text-yellow-300 shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* =============================================
            NAVEGACIÓN DE FECHAS
        ============================================= */}

        <div
          className="
            bg-white
            border
            border-gray-200
            rounded-xl
            shadow-sm
            p-3
            mb-4
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-2
            "
          >
            <button
              type="button"
              onClick={
                irAnterior
              }
              className="
                w-10
                h-10
                rounded-lg
                bg-gray-100
                text-gray-700
                hover:bg-gray-200
                flex
                items-center
                justify-center
                shrink-0
              "
              title="Periodo anterior"
            >
              <i className="fas fa-chevron-left"></i>
            </button>

            <div
              className="
                min-w-0
                flex-1
                text-center
              "
            >
              <p
                className="
                  text-[8px]
                  font-black
                  uppercase
                  text-gray-400
                "
              >
                {vista}
              </p>

              <p
                className="
                  text-xs
                  sm:text-sm
                  font-black
                  text-gray-800
                  capitalize
                "
              >
                {formatearRango(
                  rango.inicio,
                  rango.fin
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={
                irSiguiente
              }
              className="
                w-10
                h-10
                rounded-lg
                bg-gray-100
                text-gray-700
                hover:bg-gray-200
                flex
                items-center
                justify-center
                shrink-0
              "
              title="Periodo siguiente"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          <div
            className="
              flex
              justify-center
              mt-3
            "
          >
            <button
              type="button"
              onClick={
                irHoy
              }
              className="
                rounded-full
                bg-sky-50
                border
                border-sky-200
                text-sky-700
                px-4
                py-1.5
                text-[9px]
                font-black
                uppercase
                hover:bg-sky-100
                transition
              "
            >
              <i className="fas fa-calendar-day mr-1.5"></i>

              Hoy
            </button>
          </div>
        </div>

        {/* =============================================
            LEYENDA
        ============================================= */}

        <div
          className="
            flex
            flex-wrap
            gap-1.5
            mb-4
          "
        >
          <span
            className="
              rounded-full
              bg-blue-100
              text-blue-700
              border
              border-blue-200
              px-2
              py-1
              text-[7px]
              font-black
            "
          >
            AGENDADA
          </span>

          <span
            className="
              rounded-full
              bg-amber-100
              text-amber-700
              border
              border-amber-200
              px-2
              py-1
              text-[7px]
              font-black
            "
          >
            PENDIENTE CARGUE
          </span>

          <span
            className="
              rounded-full
              bg-emerald-100
              text-emerald-700
              border
              border-emerald-200
              px-2
              py-1
              text-[7px]
              font-black
            "
          >
            DICTADA
          </span>

          <span
            className="
              rounded-full
              bg-red-100
              text-red-700
              border
              border-red-200
              px-2
              py-1
              text-[7px]
              font-black
            "
          >
            NO DICTADA
          </span>
        </div>

        {/* =============================================
            CARGANDO
        ============================================= */}

        {cargando ? (
          <div
            className="
              bg-white
              border
              border-gray-200
              rounded-xl
              shadow-sm
              py-14
              px-4
              text-center
            "
          >
            <i
              className="
                fas
                fa-spinner
                fa-spin
                text-2xl
                text-sky-700
                mb-3
              "
            ></i>

            <p
              className="
                text-xs
                font-bold
                text-gray-500
              "
            >
              Consultando programación...
            </p>
          </div>
        ) : (
          <>
            {/* =========================================
                VISTA SEMANAL
                CALENDARIO COMPLETO CON SCROLL
            ========================================= */}

            {vista ===
            'SEMANA' ? (
              <div
                className="
                  bg-white
                  border
                  border-gray-200
                  rounded-xl
                  shadow-sm
                  overflow-hidden
                "
              >
                {/* INDICACIÓN */}

                <div
                  className="
                    px-3
                    py-2
                    bg-sky-50
                    border-b
                    border-sky-100
                    text-center
                  "
                >
                  <p
                    className="
                      text-[8px]
                      sm:text-[9px]
                      font-semibold
                      text-sky-700
                    "
                  >
                    <i className="fas fa-arrows-left-right mr-1"></i>

                    Deslice horizontalmente para ver todos los días de la semana.
                    Toque una clase para consultar el detalle.
                  </p>
                </div>

                {/* =====================================
                    CONTENEDOR SCROLL HORIZONTAL
                ===================================== */}

                <div
                  className="
                    overflow-x-auto
                    overscroll-x-contain
                    scroll-smooth
                  "
                >
                  <div
                    className="
                      min-w-[700px]
                      p-2
                    "
                  >
                    {/* =================================
                        CABECERA
                    ================================= */}

                    <div
                      className="
                        grid
                        grid-cols-[48px_repeat(7,92px)]
                        sm:grid-cols-[54px_repeat(7,minmax(110px,1fr))]
                        gap-1
                        mb-1
                      "
                    >
                      {/* HORA FIJA */}

                      <div
                        className="
                          sticky
                          left-0
                          z-20
                          bg-slate-800
                          text-yellow-300
                          border
                          border-slate-900
                          rounded-lg
                          flex
                          items-center
                          justify-center
                          text-[7px]
                          sm:text-[8px]
                          font-black
                          shadow-sm
                        "
                      >
                        HORA
                      </div>

                      {/* DÍAS */}

                      {fechasDelRango.map(
                        fecha => {
                          const esHoy =
                            fecha ===
                            fechaColombia()

                          const clasesDia =
                            clasesPorFecha.get(
                              fecha
                            ) ||
                            []

                          return (
                            <div
                              key={
                                fecha
                              }
                              className={`
                                rounded-lg
                                border
                                px-1
                                py-2
                                text-center
                                shadow-sm
                                ${
                                  esHoy
                                    ? 'bg-sky-700 border-sky-800 text-white'
                                    : 'bg-slate-700 border-slate-800 text-white'
                                }
                              `}
                            >
                              <div
                                className="
                                  flex
                                  items-center
                                  justify-center
                                  gap-1
                                "
                              >
                                <span
                                  className="
                                    text-[8px]
                                    sm:text-[9px]
                                    font-black
                                  "
                                >
                                  {formatearDiaSemana(
                                    fecha
                                  )}
                                </span>

                                <span
                                  className="
                                    text-[9px]
                                    sm:text-[10px]
                                    font-black
                                  "
                                >
                                  {numeroDia(
                                    fecha
                                  )}
                                </span>
                              </div>

                              <div
                                className="
                                  mt-1
                                  flex
                                  items-center
                                  justify-center
                                  gap-1
                                "
                              >
                                {esHoy && (
                                  <span
                                    className="
                                      rounded-full
                                      bg-yellow-300
                                      text-sky-900
                                      px-1
                                      py-0.5
                                      text-[5px]
                                      font-black
                                    "
                                  >
                                    HOY
                                  </span>
                                )}

                                <span
                                  className="
                                    text-[5px]
                                    sm:text-[6px]
                                    font-bold
                                    opacity-80
                                  "
                                >
                                  {clasesDia.length}{' '}
                                  {clasesDia.length ===
                                  1
                                    ? 'CLASE'
                                    : 'CLASES'}
                                </span>
                              </div>
                            </div>
                          )
                        }
                      )}
                    </div>

                    {/* =================================
                        FILAS HORARIAS
                    ================================= */}

                    <div
                      className="
                        space-y-1
                      "
                    >
                      {HORAS.map(
                        hora => (
                          <div
                            key={
                              hora
                            }
                            className="
                              grid
                              grid-cols-[48px_repeat(7,92px)]
                              sm:grid-cols-[54px_repeat(7,minmax(110px,1fr))]
                              gap-1
                            "
                          >
                            {/* =============================
                                HORA FIJA
                            ============================= */}

                            <div
                              className="
                                sticky
                                left-0
                                z-10
                                min-h-[72px]
                                bg-slate-100
                                border
                                border-slate-300
                                rounded-lg
                                flex
                                items-start
                                justify-center
                                pt-2
                                shadow-sm
                              "
                            >
                              <span
                                className="
                                  text-[7px]
                                  sm:text-[8px]
                                  font-black
                                  text-slate-700
                                "
                              >
                                {hora}
                              </span>
                            </div>

                            {/* =============================
                                COLUMNAS DE DÍAS
                            ============================= */}

                            {fechasDelRango.map(
                              fecha => {
                                const clasesDia =
                                  clasesPorFecha.get(
                                    fecha
                                  ) ||
                                  []

                                const clasesHorario =
                                  clasesDia.filter(
                                    clase =>
                                      texto(
                                        clase
                                          ?.hora_inicio
                                      ).slice(
                                        0,
                                        5
                                      ) ===
                                      hora
                                  )

                                const esHoy =
                                  fecha ===
                                  fechaColombia()

                                return (
                                  <div
                                    key={`${fecha}-${hora}`}
                                    className={`
                                      min-h-[72px]
                                      rounded-lg
                                      border
                                      p-1
                                      ${
                                        esHoy
                                          ? 'bg-sky-50 border-sky-200'
                                          : 'bg-gray-50 border-gray-200'
                                      }
                                    `}
                                  >
                                    {clasesHorario.length ===
                                    0 ? (
                                      <div
                                        className="
                                          min-h-[62px]
                                          flex
                                          items-center
                                          justify-center
                                        "
                                      >
                                        <span
                                          className="
                                            text-[7px]
                                            text-gray-300
                                            font-semibold
                                          "
                                        >
                                          —
                                        </span>
                                      </div>
                                    ) : (
                                      <div
                                        className="
                                          space-y-1
                                        "
                                      >
                                        {clasesHorario.map(
                                          clase => {
                                            const estilo =
                                              estiloEstado(
                                                clase
                                                  ?.estado
                                              )

                                            const persona =
                                              clase
                                                ?.persona ||
                                              clase
                                                ?.aprendiz ||
                                              clase
                                                ?.cliente_refuerzo ||
                                              {}

                                            return (
                                              <button
                                                key={
                                                  clase.id
                                                }
                                                type="button"
                                                onClick={() =>
                                                  setClaseSeleccionada(
                                                    clase
                                                  )
                                                }
                                                className={`
                                                  relative
                                                  w-full
                                                  min-h-[62px]
                                                  overflow-hidden
                                                  rounded-md
                                                  border
                                                  text-left
                                                  shadow-sm
                                                  hover:shadow-md
                                                  active:scale-[0.98]
                                                  transition
                                                  ${estilo.tarjeta}
                                                `}
                                                title="Ver detalle de la clase"
                                              >
                                                {/* BARRA ESTADO */}

                                                <div
                                                  className={`
                                                    absolute
                                                    left-0
                                                    top-0
                                                    bottom-0
                                                    w-1
                                                    ${estilo.barra}
                                                  `}
                                                ></div>

                                                <div
                                                  className="
                                                    pl-2
                                                    pr-1
                                                    py-1.5
                                                  "
                                                >
                                                  {/* ESTADO */}

                                                  <span
                                                    className={`
                                                      inline-block
                                                      rounded
                                                      px-1
                                                      py-0.5
                                                      text-[4px]
                                                      sm:text-[5px]
                                                      font-black
                                                      leading-tight
                                                      ${estilo.badge}
                                                    `}
                                                  >
                                                    {nombreEstado(
                                                      clase
                                                        ?.estado
                                                    )}
                                                  </span>

                                                  {/* PERSONA */}

                                                  <p
                                                    className="
                                                      mt-1
                                                      text-[6px]
                                                      sm:text-[7px]
                                                      font-black
                                                      leading-tight
                                                      text-gray-900
                                                      uppercase
                                                      line-clamp-2
                                                    "
                                                  >
                                                    {persona
                                                      ?.nombre_completo ||
                                                      'SIN NOMBRE'}
                                                  </p>

                                                  {/* CATEGORÍA + PLACA */}

                                                  <div
                                                    className="
                                                      mt-1
                                                      flex
                                                      items-center
                                                      justify-between
                                                      gap-1
                                                    "
                                                  >
                                                    <span
                                                      className="
                                                        text-[5px]
                                                        sm:text-[6px]
                                                        font-black
                                                        text-gray-700
                                                      "
                                                    >
                                                      {clase
                                                        ?.categoria ||
                                                        '-'}
                                                    </span>

                                                    <span
                                                      className="
                                                        text-[5px]
                                                        sm:text-[6px]
                                                        font-black
                                                        text-gray-700
                                                        uppercase
                                                      "
                                                    >
                                                      {clase
                                                        ?.vehiculo
                                                        ?.placa ||
                                                        '-'}
                                                    </span>
                                                  </div>

                                                  {/* TIPO */}

                                                  <div
                                                    className="
                                                      mt-1
                                                    "
                                                  >
                                                    <span
                                                      className={`
                                                        inline-block
                                                        rounded
                                                        px-1
                                                        py-0.5
                                                        text-[4px]
                                                        sm:text-[5px]
                                                        font-black
                                                        ${
                                                          tipoClase(
                                                            clase
                                                              ?.tipo_programacion
                                                          ) ===
                                                          'REFUERZO'
                                                            ? 'bg-purple-100 text-purple-700'
                                                            : 'bg-slate-200 text-slate-700'
                                                        }
                                                      `}
                                                    >
                                                      {tipoClase(
                                                        clase
                                                          ?.tipo_programacion
                                                      )}
                                                    </span>
                                                  </div>
                                                </div>
                                              </button>
                                            )
                                          }
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              }
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* =========================================
                    DÍA / QUINCENA / MES
                ========================================= */}

                {clases.length ===
                0 ? (
                  <div
                    className="
                      bg-white
                      border
                      border-gray-200
                      rounded-xl
                      shadow-sm
                      py-14
                      px-5
                      text-center
                    "
                  >
                    <div
                      className="
                        w-14
                        h-14
                        mx-auto
                        mb-3
                        rounded-full
                        bg-gray-100
                        text-gray-400
                        flex
                        items-center
                        justify-center
                      "
                    >
                      <i className="fas fa-calendar-times text-xl"></i>
                    </div>

                    <p
                      className="
                        text-sm
                        font-black
                        text-gray-700
                      "
                    >
                      Sin programación
                    </p>

                    <p
                      className="
                        text-[10px]
                        text-gray-400
                        mt-1
                      "
                    >
                      No tiene clases asignadas en este periodo.
                    </p>
                  </div>
                ) : (
                  <div
                    className="
                      space-y-4
                    "
                  >
                    {fechasDelRango.map(
                      fecha => {
                        const clasesDia =
                          clasesPorFecha.get(
                            fecha
                          ) ||
                          []

                        const esHoy =
                          fecha ===
                          fechaColombia()

                        if (
                          vista !==
                            'DIA' &&
                          clasesDia.length ===
                            0
                        ) {
                          return null
                        }

                        return (
                          <section
                            key={
                              fecha
                            }
                          >
                            {/* ENCABEZADO DÍA */}

                            <div
                              className={`
                                rounded-t-xl
                                px-3
                                py-2
                                flex
                                items-center
                                justify-between
                                gap-2
                                ${
                                  esHoy
                                    ? 'bg-sky-700 text-white'
                                    : 'bg-slate-700 text-white'
                                }
                              `}
                            >
                              <div
                                className="
                                  min-w-0
                                "
                              >
                                <p
                                  className="
                                    text-[10px]
                                    sm:text-xs
                                    font-black
                                    uppercase
                                    capitalize
                                  "
                                >
                                  {formatearFechaCorta(
                                    fecha
                                  )}
                                </p>
                              </div>

                              <div
                                className="
                                  flex
                                  items-center
                                  gap-2
                                  shrink-0
                                "
                              >
                                {esHoy && (
                                  <span
                                    className="
                                      rounded-full
                                      bg-yellow-300
                                      text-sky-900
                                      px-2
                                      py-0.5
                                      text-[7px]
                                      font-black
                                    "
                                  >
                                    HOY
                                  </span>
                                )}

                                <span
                                  className="
                                    text-[8px]
                                    font-bold
                                  "
                                >
                                  {clasesDia.length}{' '}
                                  {clasesDia.length ===
                                  1
                                    ? 'clase'
                                    : 'clases'}
                                </span>
                              </div>
                            </div>

                            {/* CLASES */}

                            <div
                              className="
                                bg-white
                                border-x
                                border-b
                                border-gray-200
                                rounded-b-xl
                                shadow-sm
                                p-2
                                space-y-2
                              "
                            >
                              {clasesDia.length ===
                              0 ? (
                                <div
                                  className="
                                    py-8
                                    text-center
                                    text-gray-400
                                  "
                                >
                                  <i className="fas fa-calendar-minus mb-2"></i>

                                  <p
                                    className="
                                      text-[10px]
                                      font-semibold
                                    "
                                  >
                                    Sin clases programadas para este día.
                                  </p>
                                </div>
                              ) : (
                                clasesDia.map(
                                  clase => {
                                    const estilo =
                                      estiloEstado(
                                        clase
                                          ?.estado
                                      )

                                    const persona =
                                      clase
                                        ?.persona ||
                                      clase
                                        ?.aprendiz ||
                                      clase
                                        ?.cliente_refuerzo ||
                                      {}

                                    return (
                                      <button
                                        key={
                                          clase.id
                                        }
                                        type="button"
                                        onClick={() =>
                                          setClaseSeleccionada(
                                            clase
                                          )
                                        }
                                        className={`
                                          relative
                                          w-full
                                          border
                                          rounded-xl
                                          overflow-hidden
                                          text-left
                                          shadow-sm
                                          active:scale-[0.99]
                                          transition
                                          ${estilo.tarjeta}
                                        `}
                                      >
                                        <div
                                          className={`
                                            absolute
                                            left-0
                                            top-0
                                            bottom-0
                                            w-1.5
                                            ${estilo.barra}
                                          `}
                                        ></div>

                                        <div
                                          className="
                                            pl-4
                                            pr-3
                                            py-3
                                          "
                                        >
                                          {/* HORA + ESTADO */}

                                          <div
                                            className="
                                              flex
                                              items-start
                                              justify-between
                                              gap-2
                                              mb-2
                                            "
                                          >
                                            <div
                                              className="
                                                flex
                                                items-center
                                                gap-2
                                              "
                                            >
                                              <i
                                                className={`
                                                  fas
                                                  fa-clock
                                                  ${estilo.icono}
                                                `}
                                              ></i>

                                              <span
                                                className={`
                                                  text-sm
                                                  font-black
                                                  ${estilo.texto}
                                                `}
                                              >
                                                {clase
                                                  ?.hora_inicio ||
                                                  '--:--'}
                                                {' - '}
                                                {clase
                                                  ?.hora_fin ||
                                                  '--:--'}
                                              </span>
                                            </div>

                                            <span
                                              className={`
                                                shrink-0
                                                rounded-full
                                                px-2
                                                py-1
                                                text-[7px]
                                                font-black
                                                ${estilo.badge}
                                              `}
                                            >
                                              {nombreEstado(
                                                clase
                                                  ?.estado
                                              )}
                                            </span>
                                          </div>

                                          {/* PERSONA */}

                                          <div
                                            className="
                                              mb-2
                                            "
                                          >
                                            <p
                                              className="
                                                text-xs
                                                sm:text-sm
                                                font-black
                                                text-gray-900
                                                uppercase
                                                leading-tight
                                              "
                                            >
                                              {persona
                                                ?.nombre_completo ||
                                                'SIN NOMBRE'}
                                            </p>

                                            <p
                                              className="
                                                mt-1
                                                text-[9px]
                                                text-gray-600
                                              "
                                            >
                                              <i className="fas fa-id-card mr-1"></i>

                                              {persona
                                                ?.tipo_doc ||
                                                'DOC'}
                                              {' '}

                                              {persona
                                                ?.documento ||
                                                'SIN DOCUMENTO'}
                                            </p>

                                            {persona
                                              ?.celular && (
                                              <p
                                                className="
                                                  mt-0.5
                                                  text-[9px]
                                                  text-gray-600
                                                "
                                              >
                                                <i className="fas fa-phone mr-1"></i>

                                                {persona.celular}
                                              </p>
                                            )}
                                          </div>

                                          {/* DATOS */}

                                          <div
                                            className="
                                              flex
                                              flex-wrap
                                              items-center
                                              gap-1.5
                                            "
                                          >
                                            <span
                                              className="
                                                rounded-md
                                                bg-white/80
                                                border
                                                border-gray-300
                                                px-2
                                                py-1
                                                text-[8px]
                                                font-black
                                                text-gray-700
                                              "
                                            >
                                              <i className="fas fa-graduation-cap mr-1"></i>

                                              {clase
                                                ?.categoria ||
                                                'SIN CATEGORÍA'}
                                            </span>

                                            <span
                                              className="
                                                rounded-md
                                                bg-white/80
                                                border
                                                border-gray-300
                                                px-2
                                                py-1
                                                text-[8px]
                                                font-black
                                                text-gray-700
                                              "
                                            >
                                              <i className="fas fa-car mr-1"></i>

                                              {clase
                                                ?.vehiculo
                                                ?.placa ||
                                                'SIN VEHÍCULO'}
                                            </span>

                                            <span
                                              className={`
                                                rounded-md
                                                border
                                                px-2
                                                py-1
                                                text-[8px]
                                                font-black
                                                ${
                                                  tipoClase(
                                                    clase
                                                      ?.tipo_programacion
                                                  ) ===
                                                  'REFUERZO'
                                                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                                }
                                              `}
                                            >
                                              {tipoClase(
                                                clase
                                                  ?.tipo_programacion
                                              )}
                                            </span>
                                          </div>

                                          <div
                                            className="
                                              mt-2
                                              pt-2
                                              border-t
                                              border-black/10
                                              flex
                                              items-center
                                              justify-end
                                              gap-1
                                              text-[8px]
                                              font-black
                                              text-gray-500
                                            "
                                          >
                                            VER DETALLE

                                            <i className="fas fa-chevron-right"></i>
                                          </div>
                                        </div>
                                      </button>
                                    )
                                  }
                                )
                              )}
                            </div>
                          </section>
                        )
                      }
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* ===============================================
          MODAL DETALLE
      =============================================== */}

      {claseSeleccionada && (
        <div
          className="
            fixed
            inset-0
            z-50
            bg-black/50
            flex
            items-end
            sm:items-center
            justify-center
            p-0
            sm:p-4
          "
          onClick={() =>
            setClaseSeleccionada(
              null
            )
          }
        >
          <div
            className="
              w-full
              sm:max-w-md
              max-h-[92vh]
              overflow-y-auto
              bg-white
              rounded-t-2xl
              sm:rounded-2xl
              shadow-2xl
            "
            onClick={
              event =>
                event.stopPropagation()
            }
          >
            {(() => {
              const clase =
                claseSeleccionada

              const estilo =
                estiloEstado(
                  clase?.estado
                )

              const persona =
                clase?.persona ||
                clase?.aprendiz ||
                clase?.cliente_refuerzo ||
                {}

              return (
                <>
                  {/* CABECERA */}

                  <div
                    className={`
                      px-4
                      py-4
                      ${estilo.barra}
                      text-white
                    `}
                  >
                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-3
                      "
                    >
                      <div>
                        <p
                          className="
                            text-[9px]
                            font-black
                            uppercase
                            opacity-80
                          "
                        >
                          Detalle de la clase
                        </p>

                        <p
                          className="
                            mt-1
                            text-lg
                            font-black
                          "
                        >
                          {clase
                            ?.hora_inicio}
                          {' - '}
                          {clase
                            ?.hora_fin}
                        </p>

                        <p
                          className="
                            mt-1
                            text-[10px]
                            font-semibold
                            capitalize
                          "
                        >
                          {formatearFechaCompleta(
                            clase?.fecha
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setClaseSeleccionada(
                            null
                          )
                        }
                        className="
                          w-9
                          h-9
                          rounded-full
                          bg-white/20
                          hover:bg-white/30
                          flex
                          items-center
                          justify-center
                          shrink-0
                        "
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>

                    <div
                      className="
                        mt-3
                      "
                    >
                      <span
                        className="
                          inline-flex
                          rounded-full
                          bg-white
                          text-gray-800
                          px-3
                          py-1
                          text-[8px]
                          font-black
                        "
                      >
                        {nombreEstado(
                          clase?.estado
                        )}
                      </span>
                    </div>
                  </div>

                  {/* CUERPO */}

                  <div
                    className="
                      p-4
                      space-y-4
                    "
                  >
                    {/* PERSONA */}

                    <div
                      className="
                        rounded-xl
                        bg-gray-50
                        border
                        border-gray-200
                        p-4
                      "
                    >
                      <p
                        className="
                          text-[8px]
                          font-black
                          uppercase
                          tracking-wide
                          text-gray-400
                          mb-2
                        "
                      >
                        Aprendiz / Cliente
                      </p>

                      <p
                        className="
                          text-sm
                          font-black
                          text-gray-900
                          uppercase
                        "
                      >
                        {persona
                          ?.nombre_completo ||
                          'SIN NOMBRE'}
                      </p>

                      <div
                        className="
                          mt-3
                          space-y-2
                        "
                      >
                        <p
                          className="
                            text-[10px]
                            text-gray-700
                          "
                        >
                          <i className="fas fa-id-card w-5 text-gray-400"></i>

                          <strong>
                            {persona
                              ?.tipo_doc ||
                              'DOC'}
                          </strong>
                          {' '}

                          {persona
                            ?.documento ||
                            'SIN DOCUMENTO'}
                        </p>

                        {persona
                          ?.celular && (
                          <p
                            className="
                              text-[10px]
                              text-gray-700
                            "
                          >
                            <i className="fas fa-phone w-5 text-gray-400"></i>

                            {persona.celular}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* INFORMACIÓN CLASE */}

                    <div
                      className="
                        rounded-xl
                        bg-gray-50
                        border
                        border-gray-200
                        p-4
                      "
                    >
                      <p
                        className="
                          text-[8px]
                          font-black
                          uppercase
                          tracking-wide
                          text-gray-400
                          mb-3
                        "
                      >
                        Información de la clase
                      </p>

                      <div
                        className="
                          grid
                          grid-cols-2
                          gap-3
                        "
                      >
                        <div>
                          <p
                            className="
                              text-[8px]
                              text-gray-400
                              font-black
                              uppercase
                            "
                          >
                            Categoría
                          </p>

                          <p
                            className="
                              mt-1
                              text-xs
                              font-black
                              text-gray-800
                            "
                          >
                            {clase
                              ?.categoria ||
                              '-'}
                          </p>
                        </div>

                        <div>
                          <p
                            className="
                              text-[8px]
                              text-gray-400
                              font-black
                              uppercase
                            "
                          >
                            Tipo
                          </p>

                          <p
                            className="
                              mt-1
                              text-xs
                              font-black
                              text-gray-800
                            "
                          >
                            {tipoClase(
                              clase
                                ?.tipo_programacion
                            )}
                          </p>
                        </div>

                        <div>
                          <p
                            className="
                              text-[8px]
                              text-gray-400
                              font-black
                              uppercase
                            "
                          >
                            Inicio
                          </p>

                          <p
                            className="
                              mt-1
                              text-xs
                              font-black
                              text-gray-800
                            "
                          >
                            {clase
                              ?.hora_inicio ||
                              '-'}
                          </p>
                        </div>

                        <div>
                          <p
                            className="
                              text-[8px]
                              text-gray-400
                              font-black
                              uppercase
                            "
                          >
                            Fin
                          </p>

                          <p
                            className="
                              mt-1
                              text-xs
                              font-black
                              text-gray-800
                            "
                          >
                            {clase
                              ?.hora_fin ||
                              '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* VEHÍCULO */}

                    <div
                      className="
                        rounded-xl
                        bg-gray-50
                        border
                        border-gray-200
                        p-4
                      "
                    >
                      <p
                        className="
                          text-[8px]
                          font-black
                          uppercase
                          tracking-wide
                          text-gray-400
                          mb-3
                        "
                      >
                        Vehículo
                      </p>

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
                            rounded-lg
                            bg-sky-100
                            text-sky-700
                            flex
                            items-center
                            justify-center
                            shrink-0
                          "
                        >
                          <i className="fas fa-car"></i>
                        </div>

                        <div>
                          <p
                            className="
                              text-base
                              font-black
                              text-gray-900
                              uppercase
                            "
                          >
                            {clase
                              ?.vehiculo
                              ?.placa ||
                              'SIN VEHÍCULO'}
                          </p>

                          <p
                            className="
                              text-[9px]
                              text-gray-500
                              uppercase
                            "
                          >
                            {[
                              clase
                                ?.vehiculo
                                ?.tipo_vehiculo,

                              clase
                                ?.vehiculo
                                ?.marca,

                              clase
                                ?.vehiculo
                                ?.linea,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                ' · '
                              ) ||
                              'Sin información adicional'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* NO DICTADA */}

                    {mayusculas(
                      clase?.estado
                    ) ===
                      'NO_DICTADA' && (
                      <div
                        className="
                          rounded-xl
                          bg-red-50
                          border
                          border-red-200
                          p-4
                        "
                      >
                        <p
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            tracking-wide
                            text-red-500
                            mb-2
                          "
                        >
                          Información No Dictada
                        </p>

                        <p
                          className="
                            text-xs
                            font-black
                            text-red-800
                          "
                        >
                          {clase
                            ?.motivo_no_dictada
                            ?.nombre ||
                            'Sin motivo registrado'}
                        </p>

                        {clase
                          ?.observacion_no_dictada && (
                          <p
                            className="
                              mt-2
                              text-[10px]
                              text-red-700
                            "
                          >
                            {clase.observacion_no_dictada}
                          </p>
                        )}
                      </div>
                    )}

                    {/* SOLO CONSULTA */}

                    <div
                      className="
                        rounded-xl
                        bg-blue-50
                        border
                        border-blue-200
                        px-3
                        py-2.5
                        text-center
                      "
                    >
                      <p
                        className="
                          text-[9px]
                          text-blue-700
                          font-semibold
                        "
                      >
                        <i className="fas fa-eye mr-1"></i>

                        Esta información es únicamente de consulta.
                      </p>
                    </div>

                    {/* CERRAR */}

                    <button
                      type="button"
                      onClick={() =>
                        setClaseSeleccionada(
                          null
                        )
                      }
                      className="
                        w-full
                        rounded-xl
                        bg-slate-800
                        hover:bg-slate-900
                        text-white
                        py-3
                        text-xs
                        font-black
                        uppercase
                        shadow-sm
                        transition
                      "
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}