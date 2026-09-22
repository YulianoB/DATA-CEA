// app/admin/consultas/horarios/page.jsx// app/admin/consultas/horarios/page.jsx

'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  Toaster,
  toast,
} from 'sonner'

import {
  cerrarSesion,
} from '@/lib/auth/logout'

// ============================================================
// CONSTANTES
// ============================================================

const ROLES = [
  {
    value: 'INSTRUCTOR PRÁCTICA',
    label: 'INSTRUCTOR PRÁCTICA',
  },
  {
    value: 'INSTRUCTOR TEORÍA',
    label: 'INSTRUCTOR TEORÍA',
  },
  {
    value: 'AUXILIAR ADMINISTRATIVO',
    label: 'AUXILIAR ADMINISTRATIVO',
  },
]

const ESTADO_ABIERTO =
  'Abierto'

const ESTADO_CERRADO =
  'Cerrado'

const ESTADO_NO_CERRADO =
  'No Cerrado'

// ============================================================
// HELPERS
// ============================================================

function normalizarTexto(valor) {
  return String(
    valor || ''
  ).trim()
}

function normalizarMayusculas(valor) {
  return normalizarTexto(
    valor
  ).toUpperCase()
}

function esInstructorPractica(rol) {
  return (
    normalizarMayusculas(
      rol
    ) ===
    'INSTRUCTOR PRÁCTICA'
  )
}

function formatearFecha(fecha) {
  if (!fecha) {
    return '-'
  }

  try {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Bogota',
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

function formatearHora(hora) {
  if (!hora) {
    return '-'
  }

  return String(
    hora
  ).slice(
    0,
    5
  )
}

function hoyBogota() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Bogota',
    }
  ).format(
    new Date()
  )
}

function claseEstado(estado) {
  if (
    estado ===
    ESTADO_NO_CERRADO
  ) {
    return {
      contenedor:
        'border-red-300 bg-red-50',

      badge:
        'bg-red-100 text-red-700 border-red-300',

      icono:
        'fa-triangle-exclamation',

      iconoColor:
        'text-red-600',
    }
  }

  if (
    estado ===
    ESTADO_CERRADO
  ) {
    return {
      contenedor:
        'border-green-200 bg-green-50',

      badge:
        'bg-green-100 text-green-700 border-green-300',

      icono:
        'fa-circle-check',

      iconoColor:
        'text-green-600',
    }
  }

  return {
    contenedor:
      'border-amber-300 bg-amber-50',

    badge:
      'bg-amber-100 text-amber-700 border-amber-300',

    icono:
      'fa-clock',

    iconoColor:
      'text-amber-600',
  }
}

// ============================================================
// COMPONENTE RESUMEN
// ============================================================

function Resumen({
  titulo,
  valor,
  icono,
  tipo = 'normal',
}) {
  let clases =
    'bg-blue-50 border-blue-200 text-[var(--primary-dark)]'

  let iconoClases =
    'bg-blue-100 text-[var(--primary)]'

  if (
    tipo ===
    'success'
  ) {
    clases =
      'bg-green-50 border-green-200 text-green-800'

    iconoClases =
      'bg-green-100 text-green-700'
  }

  if (
    tipo ===
    'danger'
  ) {
    clases =
      'bg-red-50 border-red-300 text-red-800'

    iconoClases =
      'bg-red-100 text-red-700'
  }

  if (
    tipo ===
    'warning'
  ) {
    clases =
      'bg-amber-50 border-amber-300 text-amber-800'

    iconoClases =
      'bg-amber-100 text-amber-700'
  }

  return (
    <div
      className={`border rounded-xl p-3 ${clases}`}
    >

      <div className="flex items-center gap-3">

        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconoClases}`}
        >

          <i
            className={`fas ${icono}`}
          ></i>

        </div>

        <div>

          <p className="text-xs font-semibold opacity-80">
            {titulo}
          </p>

          <p className="text-xl font-bold leading-tight">
            {valor}
          </p>

        </div>

      </div>

    </div>
  )
}

// ============================================================
// COMPONENTE DATO
// ============================================================

function Dato({
  label,
  valor,
}) {
  return (
    <div className="bg-white/70 border rounded-lg px-3 py-2">

      <p className="text-[11px] text-gray-500">
        {label}
      </p>

      <p className="font-semibold text-gray-800 text-sm">
        {valor ?? '-'}
      </p>

    </div>
  )
}

// ============================================================
// PÁGINA
// ============================================================

export default function ConsultaHorariosPage() {
  const router =
    useRouter()

  const [
    user,
    setUser,
  ] =
    useState(null)

  const [
    nitActual,
    setNitActual,
  ] =
    useState('')

  // ==========================================================
  // FILTROS
  // ==========================================================

  const [
    filters,
    setFilters,
  ] =
    useState({
      startDate: '',
      endDate: '',
      role: '',
      userName: '',
    })

  const [
    funcionarios,
    setFuncionarios,
  ] =
    useState([])

  const [
    cargandoFuncionarios,
    setCargandoFuncionarios,
  ] =
    useState(false)

  // ==========================================================
  // SEGUIMIENTO INDIVIDUAL
  // ==========================================================

  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    seguimiento,
    setSeguimiento,
  ] =
    useState(null)

  // ==========================================================
  // REPORTE NO CERRADOS
  // ==========================================================

  const [
    cargandoReporte,
    setCargandoReporte,
  ] =
    useState(false)

  const [
    reporteNoCerrados,
    setReporteNoCerrados,
  ] =
    useState(null)

  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(() => {
    const stored =
      localStorage.getItem(
        'currentUser'
      )

    if (!stored) {
      router.push(
        '/login'
      )

      return
    }

    try {
      const parsed =
        JSON.parse(
          stored
        )

      const nit =
        parsed?.nitEmpresa ||
        localStorage.getItem(
          'currentEmpresaNit'
        ) ||
        parsed?.empresa?.nit ||
        ''

      if (!nit) {
        toast.error(
          'No se encontró el CEA asociado a la sesión.'
        )

        return
      }

      setUser(
        parsed
      )

      setNitActual(
        String(
          nit
        ).trim()
      )
    } catch (error) {
      console.error(
        'Error leyendo sesión:',
        error
      )

      localStorage.removeItem(
        'currentUser'
      )

      router.push(
        '/login'
      )
    }
  }, [
    router,
  ])

  // ==========================================================
  // CARGAR FUNCIONARIOS POR ROL
  // ==========================================================

  const cargarFuncionarios =
    async (rol) => {
      if (
        !nitActual ||
        !rol
      ) {
        setFuncionarios(
          []
        )

        return
      }

      setCargandoFuncionarios(
        true
      )

      try {
        const params =
          new URLSearchParams({
            nit:
              nitActual,

            recurso:
              'funcionarios',

            rol,
          })

        const response =
          await fetch(
            `/api/admin/consultas/horarios?${params.toString()}`,
            {
              cache:
                'no-store',
            }
          )

        const result =
          await response.json()

        if (
          !response.ok ||
          result?.status !==
            'success'
        ) {
          toast.error(
            result?.message ||
            'No fue posible cargar los funcionarios.'
          )

          setFuncionarios(
            []
          )

          return
        }

        setFuncionarios(
          Array.isArray(
            result?.funcionarios
          )
            ? result.funcionarios
            : []
        )
      } catch (error) {
        console.error(
          'Error cargando funcionarios:',
          error
        )

        toast.error(
          'No fue posible cargar los funcionarios.'
        )

        setFuncionarios(
          []
        )
      } finally {
        setCargandoFuncionarios(
          false
        )
      }
    }

  // ==========================================================
  // CAMBIOS DE FILTRO
  // ==========================================================

  const onFilterChange =
    (event) => {
      const {
        name,
        value,
      } =
        event.target

      setSeguimiento(
        null
      )

      if (
        name ===
        'role'
      ) {
        setFilters(
          (prev) => ({
            ...prev,
            role: value,
            userName: '',
          })
        )

        setFuncionarios(
          []
        )

        if (
          value
        ) {
          cargarFuncionarios(
            value
          )
        }

        return
      }

      setFilters(
        (prev) => ({
          ...prev,
          [name]: value,
        })
      )
    }

  // ==========================================================
  // VALIDAR RANGO
  // ==========================================================

  const validarRango =
    () => {
      const {
        startDate,
        endDate,
      } =
        filters

      if (
        !startDate ||
        !endDate
      ) {
        toast.warning(
          'Seleccione la fecha inicial y la fecha final.'
        )

        return false
      }

      if (
        endDate <
        startDate
      ) {
        toast.warning(
          'La fecha final no puede ser anterior a la inicial.'
        )

        return false
      }

      const hoy =
        hoyBogota()

      if (
        startDate >
          hoy ||
        endDate >
          hoy
      ) {
        toast.warning(
          'No se permiten fechas futuras.'
        )

        return false
      }

      return true
    }

  // ==========================================================
  // CONSULTAR SEGUIMIENTO INDIVIDUAL
  // ==========================================================

  const consultar =
    async () => {
      if (
        !validarRango()
      ) {
        return
      }

      if (
        !filters.role
      ) {
        toast.warning(
          'Seleccione un rol.'
        )

        return
      }

      if (
        !filters.userName
      ) {
        toast.warning(
          'Seleccione el funcionario que desea consultar.'
        )

        return
      }

      setLoading(
        true
      )

      setSeguimiento(
        null
      )

      try {
        const params =
          new URLSearchParams({
            nit:
              nitActual,

            recurso:
              'seguimiento',

            fecha_inicio:
              filters.startDate,

            fecha_fin:
              filters.endDate,

            rol:
              filters.role,

            nombre_completo:
              filters.userName,
          })

        const response =
          await fetch(
            `/api/admin/consultas/horarios?${params.toString()}`,
            {
              cache:
                'no-store',
            }
          )

        const result =
          await response.json()

        if (
          !response.ok ||
          result?.status !==
            'success'
        ) {
          toast.error(
            result?.message ||
            'No fue posible consultar las jornadas.'
          )

          return
        }

        setSeguimiento(
          result
        )
      } catch (error) {
        console.error(
          'Error consultando seguimiento:',
          error
        )

        toast.error(
          'No fue posible consultar las jornadas.'
        )
      } finally {
        setLoading(
          false
        )
      }
    }

  // ==========================================================
  // REPORTE GENERAL NO CERRADOS
  // ==========================================================

  const consultarNoCerrados =
    async () => {
      if (
        !validarRango()
      ) {
        return
      }

      setCargandoReporte(
        true
      )

      setReporteNoCerrados(
        null
      )

      try {
        const params =
          new URLSearchParams({
            nit:
              nitActual,

            recurso:
              'no_cerrados',

            fecha_inicio:
              filters.startDate,

            fecha_fin:
              filters.endDate,
          })

        const response =
          await fetch(
            `/api/admin/consultas/horarios?${params.toString()}`,
            {
              cache:
                'no-store',
            }
          )

        const result =
          await response.json()

        if (
          !response.ok ||
          result?.status !==
            'success'
        ) {
          toast.error(
            result?.message ||
            'No fue posible generar el reporte.'
          )

          return
        }

        setReporteNoCerrados(
          result
        )

        if (
          Number(
            result?.total_general ||
            0
          ) === 0
        ) {
          toast.success(
            'No se encontraron jornadas No Cerrado en el período.'
          )
        }
      } catch (error) {
        console.error(
          'Error generando reporte:',
          error
        )

        toast.error(
          'No fue posible generar el reporte.'
        )
      } finally {
        setCargandoReporte(
          false
        )
      }
    }

  // ==========================================================
  // LIMPIAR
  // ==========================================================

  const limpiar =
    () => {
      setFilters({
        startDate: '',
        endDate: '',
        role: '',
        userName: '',
      })

      setFuncionarios(
        []
      )

      setSeguimiento(
        null
      )

      setReporteNoCerrados(
        null
      )
    }

  // ==========================================================
  // IMPRIMIR REPORTE
  // ==========================================================

  const imprimirReporte =
    () => {
      if (
        !reporteNoCerrados
      ) {
        return
      }

      window.print()
    }

  // ==========================================================
  // DATOS DERIVADOS
  // ==========================================================

  const resumen =
    seguimiento?.resumen ||
    null

  const jornadas =
    seguimiento?.jornadas ||
    []

  const esPractica =
    esInstructorPractica(
      seguimiento
        ?.funcionario
        ?.rol
    )

  const tieneNoCerrados =
    Number(
      resumen?.no_cerradas ||
      0
    ) > 0

  // ==========================================================
  // CARGANDO
  // ==========================================================

  if (!user) {
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
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 print:bg-white print:p-0">

      <Toaster
        position="top-center"
        richColors
      />

      <div className="max-w-6xl mx-auto space-y-5 print:max-w-none print:space-y-0">

        {/* ==================================================
            ENCABEZADO
        ================================================== */}

        <div className="no-imprimir bg-white border rounded-xl shadow-lg p-5">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>

              <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
                Consultas Administrativas
              </p>

              <h1 className="text-2xl font-bold text-[var(--primary)] flex items-center gap-2 mt-1">

                <i className="fas fa-calendar-check"></i>

                Seguimiento de Jornadas

              </h1>

              <p className="text-sm text-gray-600 mt-2">
                Consulte el cumplimiento de apertura y cierre de jornada de un funcionario.
              </p>

            </div>

            <div className="flex gap-2 flex-wrap">

              <button
                onClick={() =>
                  router.push(
                    '/admin/consultas'
                  )
                }
                className="bg-gray-600 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm"
              >
                <i className="fas fa-arrow-left mr-2"></i>

                Regresar a Consultas
              </button>

              <button
                onClick={() =>
                  cerrarSesion(
                    router
                  )
                }
                className="bg-[var(--danger)] hover:bg-[var(--danger-dark)] text-white px-4 py-2 rounded-lg text-sm"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>

                Cerrar Sesión
              </button>

            </div>

          </div>

        </div>

        {/* ==================================================
            FILTROS
        ================================================== */}

        <div className="no-imprimir bg-white border rounded-xl shadow-sm p-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

            <div>

              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Fecha Inicio
              </label>

              <input
                type="date"
                name="startDate"
                value={
                  filters.startDate
                }
                onChange={
                  onFilterChange
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />

            </div>

            <div>

              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Fecha Fin
              </label>

              <input
                type="date"
                name="endDate"
                value={
                  filters.endDate
                }
                onChange={
                  onFilterChange
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />

            </div>

            <div>

              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Rol
              </label>

              <select
                name="role"
                value={
                  filters.role
                }
                onChange={
                  onFilterChange
                }
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >

                <option value="">
                  -- Seleccione rol --
                </option>

                {ROLES.map(
                  (rol) => (

                    <option
                      key={
                        rol.value
                      }
                      value={
                        rol.value
                      }
                    >
                      {rol.label}
                    </option>

                  )
                )}

              </select>

            </div>

            <div>

              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Funcionario
              </label>

              <select
                name="userName"
                value={
                  filters.userName
                }
                onChange={
                  onFilterChange
                }
                disabled={
                  !filters.role ||
                  cargandoFuncionarios
                }
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100"
              >

                <option value="">
                  {cargandoFuncionarios
                    ? 'Cargando...'
                    : '-- Seleccione funcionario --'}
                </option>

                {funcionarios.map(
                  (funcionario) => (

                    <option
                      key={
                        funcionario.personal_id ||
                        `${funcionario.nombre_completo}-${funcionario.rol}`
                      }
                      value={
                        funcionario.nombre_completo
                      }
                    >
                      {
                        funcionario.nombre_completo
                      }
                    </option>

                  )
                )}

              </select>

            </div>

          </div>

          <div className="flex justify-center gap-2 mt-4 flex-wrap">

            <button
              onClick={
                consultar
              }
              disabled={
                loading
              }
              className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
            >
              <i className="fas fa-search mr-2"></i>

              {loading
                ? 'Consultando...'
                : 'Consultar funcionario'}
            </button>

            <button
              onClick={
                consultarNoCerrados
              }
              disabled={
                cargandoReporte
              }
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
            >
              <i className="fas fa-triangle-exclamation mr-2"></i>

              {cargandoReporte
                ? 'Generando...'
                : 'Reporte No Cerrado'}
            </button>

            <button
              onClick={
                limpiar
              }
              className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              <i className="fas fa-eraser mr-2"></i>

              Limpiar
            </button>

          </div>

        </div>

        {/* ==================================================
            SEGUIMIENTO INDIVIDUAL
        ================================================== */}

        {seguimiento && (

          <div className="no-imprimir bg-white border rounded-xl shadow-lg overflow-hidden">

            {/* ==============================================
                IDENTIFICACIÓN
            ============================================== */}

            <div className="p-5 border-b bg-gradient-to-r from-blue-50 to-white">

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                <div>

                  <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
                    Control de Jornadas
                  </p>

                  <h2 className="text-2xl sm:text-3xl font-black text-[var(--primary)] mt-1">
                    {
                      seguimiento
                        .funcionario
                        .nombre_completo
                    }
                  </h2>

                  <p className="text-sm font-semibold text-gray-700 mt-1">
                    {
                      seguimiento
                        .funcionario
                        .rol
                    }
                  </p>

                  <p className="text-xs text-gray-500 mt-2">

                    Período analizado:{' '}

                    <strong>
                      {formatearFecha(
                        seguimiento
                          .periodo
                          .desde
                      )}
                    </strong>

                    {' al '}

                    <strong>
                      {formatearFecha(
                        seguimiento
                          .periodo
                          .hasta
                      )}
                    </strong>

                  </p>

                </div>

                {tieneNoCerrados && (

                  <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-red-800">

                    <div className="flex items-center gap-3">

                      <i className="fas fa-triangle-exclamation text-2xl text-red-600"></i>

                      <div>

                        <p className="text-xs font-semibold">
                          Atención
                        </p>

                        <p className="font-bold">

                          {resumen.no_cerradas}{' '}

                          jornada

                          {resumen.no_cerradas === 1
                            ? ''
                            : 's'}

                          {' '}No Cerrado

                        </p>

                      </div>

                    </div>

                  </div>

                )}

              </div>

            </div>

            {/* ==============================================
                RESUMEN
            ============================================== */}

            <div className="p-5">

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                <Resumen
                  titulo={
                    esPractica
                      ? 'Jornadas reportadas'
                      : 'Días reportados'
                  }
                  valor={
                    esPractica
                      ? resumen.total_jornadas
                      : resumen.total_dias_reportados
                  }
                  icono="fa-calendar-days"
                />

                <Resumen
                  titulo="Cerradas"
                  valor={
                    resumen.cerradas
                  }
                  icono="fa-circle-check"
                  tipo="success"
                />

                <Resumen
                  titulo="No Cerrado"
                  valor={
                    resumen.no_cerradas
                  }
                  icono="fa-triangle-exclamation"
                  tipo={
                    resumen.no_cerradas > 0
                      ? 'danger'
                      : 'success'
                  }
                />

                <Resumen
                  titulo="Abiertas"
                  valor={
                    resumen.abiertas
                  }
                  icono="fa-clock"
                  tipo={
                    resumen.abiertas > 0
                      ? 'warning'
                      : 'normal'
                  }
                />

              </div>

              {esPractica && (

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">

                  <Resumen
                    titulo="Clases dictadas"
                    valor={
                      resumen.clases_dictadas
                    }
                    icono="fa-chalkboard-user"
                  />

                  <Resumen
                    titulo="Aprendices"
                    valor={
                      resumen.aprendices
                    }
                    icono="fa-users"
                  />

                  <Resumen
                    titulo="Vehículos utilizados"
                    valor={
                      resumen.vehiculos.length
                    }
                    icono="fa-car"
                  />

                </div>

              )}

              {esPractica &&
                resumen.vehiculos.length > 0 && (

                  <div className="mt-3 bg-gray-50 border rounded-lg px-3 py-2">

                    <p className="text-xs text-gray-500 font-semibold">
                      Vehículos utilizados en el período
                    </p>

                    <div className="flex flex-wrap gap-2 mt-2">

                      {resumen
                        .vehiculos
                        .map(
                          (placa) => (

                            <span
                              key={
                                placa
                              }
                              className="bg-white border px-2 py-1 rounded-md text-xs font-bold text-gray-700"
                            >

                              <i className="fas fa-car mr-1 text-[var(--primary)]"></i>

                              {placa}

                            </span>

                          )
                        )}

                    </div>

                  </div>

                )}

            </div>

            {/* ==============================================
                DETALLE
            ============================================== */}

            <div className="border-t bg-gray-50 p-5">

              <h3 className="font-bold text-gray-800 mb-3">

                <i className="fas fa-list-check mr-2 text-[var(--primary)]"></i>

                Detalle del período

              </h3>

              {jornadas.length === 0 ? (

                <div className="bg-white border rounded-lg p-4 text-center text-sm text-gray-500">

                  No existen jornadas reportadas en el período seleccionado.

                </div>

              ) : (

                <div className="space-y-3">

                  {jornadas.map(
                    (jornada) => {
                      const estadoUI =
                        claseEstado(
                          jornada.estado_registro
                        )

                      return (
                        <div
                          key={
                            jornada.id
                          }
                          className={`border rounded-xl p-4 ${estadoUI.contenedor}`}
                        >

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

                            <div className="flex items-center gap-2">

                              <i
                                className={`fas ${estadoUI.icono} ${estadoUI.iconoColor}`}
                              ></i>

                              <strong>
                                {formatearFecha(
                                  jornada.fecha_entrada
                                )}
                              </strong>

                            </div>

                            <span
                              className={`inline-flex border rounded-full px-3 py-1 text-xs font-bold w-fit ${estadoUI.badge}`}
                            >
                              {
                                jornada.estado_registro
                              }
                            </span>

                          </div>

                          <div
                            className={`grid grid-cols-2 ${
                              esPractica
                                ? 'sm:grid-cols-5'
                                : 'sm:grid-cols-2'
                            } gap-2 mt-3`}
                          >

                            <Dato
                              label="Entrada"
                              valor={
                                formatearHora(
                                  jornada.hora_entrada
                                )
                              }
                            />

                            <Dato
                              label="Salida"
                              valor={
                                formatearHora(
                                  jornada.hora_salida
                                )
                              }
                            />

                            {esPractica && (
                              <>
                                <Dato
                                  label="Vehículo"
                                  valor={
                                    jornada.placa ||
                                    '-'
                                  }
                                />

                                <Dato
                                  label="Clases"
                                  valor={
                                    jornada.clases_dictadas
                                  }
                                />

                                <Dato
                                  label="Aprendices"
                                  valor={
                                    jornada.num_aprendices
                                  }
                                />
                              </>
                            )}

                          </div>

                        </div>
                      )
                    }
                  )}

                </div>

              )}

            </div>

            {/* ==============================================
                RESUMEN FINAL
            ============================================== */}

            <div className="border-t p-4 bg-white">

              <div className="text-sm text-gray-700">

                <strong>
                  Resumen del período:
                </strong>{' '}

                {resumen.total_dias_reportados}{' '}

                día

                {resumen.total_dias_reportados === 1
                  ? ''
                  : 's'}

                {' '}reportado

                {resumen.total_dias_reportados === 1
                  ? ''
                  : 's'},

                {' '}

                {resumen.cerradas}{' '}

                cerrada

                {resumen.cerradas === 1
                  ? ''
                  : 's'},

                {' '}

                <span
                  className={
                    resumen.no_cerradas > 0
                      ? 'font-bold text-red-700'
                      : 'font-semibold text-green-700'
                  }
                >
                  {resumen.no_cerradas}{' '}
                  No Cerrado
                </span>

                {' y '}

                {resumen.abiertas}{' '}

                abierta

                {resumen.abiertas === 1
                  ? ''
                  : 's'}.

              </div>

            </div>

          </div>

        )}

        {/* ==================================================
            REPORTE NO CERRADOS
        ================================================== */}

        {reporteNoCerrados && (

          <div className="reporte-no-cerrados bg-white border rounded-xl shadow-lg overflow-hidden">

            {/* ==============================================
                CABECERA REPORTE
            ============================================== */}

            <div className="reporte-cabecera p-5 border-b print:p-3">

              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

                <div>

                  <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
                    Reporte Administrativo
                  </p>

                  <h2 className="text-2xl font-black text-red-700 mt-1">
                    Jornadas No Cerradas
                  </h2>

                  <p className="text-sm text-gray-600 mt-2">

                    {reporteNoCerrados
                      ?.empresa
                      ?.nombre ||
                      user?.nombreEmpresa ||
                      'CEA'}

                  </p>

                  <p className="text-xs text-gray-500 mt-1">

                    NIT:{' '}

                    {reporteNoCerrados
                      ?.empresa
                      ?.nit ||
                      nitActual}

                  </p>

                  <p className="text-xs text-gray-500 mt-2">

                    Período:{' '}

                    <strong>
                      {formatearFecha(
                        reporteNoCerrados
                          .periodo
                          .desde
                      )}
                    </strong>

                    {' al '}

                    <strong>
                      {formatearFecha(
                        reporteNoCerrados
                          .periodo
                          .hasta
                      )}
                    </strong>

                  </p>

                </div>

                <div className="no-imprimir">

                  <button
                    onClick={
                      imprimirReporte
                    }
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                  >

                    <i className="fas fa-print mr-2"></i>

                    Imprimir reporte

                  </button>

                </div>

              </div>

            </div>

            {/* ==============================================
                GRUPOS
            ============================================== */}

            <div className="reporte-contenido p-5 space-y-5 print:p-3 print:space-y-3">

              {[
                {
                  key:
                    'instructor_practica',

                  titulo:
                    'Instructor Práctica',

                  icono:
                    'fa-car',

                  encabezado:
                    'bg-blue-800',
                },

                {
                  key:
                    'instructor_teoria',

                  titulo:
                    'Instructor Teoría',

                  icono:
                    'fa-chalkboard-teacher',

                  encabezado:
                    'bg-amber-600',
                },

                {
                  key:
                    'auxiliar_administrativo',

                  titulo:
                    'Auxiliar Administrativo',

                  icono:
                    'fa-user-tie',

                  encabezado:
                    'bg-slate-700',
                },
              ].map(
                (config) => {
                  const grupo =
                    reporteNoCerrados
                      ?.grupos
                      ?.[config.key]

                  return (
                    <div
                      key={
                        config.key
                      }
                      className="reporte-grupo-rol border rounded-xl overflow-hidden"
                    >

                      {/* =====================================
                          ENCABEZADO ROL
                      ===================================== */}

                      <div
                        className={`reporte-encabezado-rol ${config.encabezado} text-white px-4 py-2 flex items-center justify-between gap-3`}
                      >

                        <div className="flex items-center gap-2">

                          <i
                            className={`fas ${config.icono}`}
                          ></i>

                          <span className="font-bold uppercase text-sm">
                            {config.titulo}
                          </span>

                        </div>

                        <span className="text-xs font-semibold">

                          {grupo?.total || 0}{' '}

                          registro

                          {(grupo?.total || 0) === 1
                            ? ''
                            : 's'}

                        </span>

                      </div>

                      {/* =====================================
                          FUNCIONARIOS
                      ===================================== */}

                      <div className="p-4 print:p-2">

                        {!grupo ||
                        grupo.funcionarios.length === 0 ? (

                          <p className="text-sm text-gray-500 text-center py-2">

                            Sin jornadas No Cerrado en este rol.

                          </p>

                        ) : (

                          <div className="space-y-4 print:space-y-2">

                            {grupo
                              .funcionarios
                              .map(
                                (funcionario) => (

                                  <div
                                    key={
                                      funcionario.nombre_completo
                                    }
                                    className="reporte-funcionario border-l-4 border-red-500 pl-3"
                                  >

                                    {/* =========================
                                        ENCABEZADO FUNCIONARIO
                                    ========================= */}

                                    <div className="reporte-funcionario-header flex items-center justify-between gap-3">

                                      <p className="font-bold text-gray-800">
                                        {
                                          funcionario.nombre_completo
                                        }
                                      </p>

                                      <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-1">

                                        {
                                          funcionario.total
                                        }{' '}

                                        jornada

                                        {funcionario.total === 1
                                          ? ''
                                          : 's'}

                                      </span>

                                    </div>

                                    {/* =========================
                                        JORNADAS
                                    ========================= */}

                                    <div className="mt-2 space-y-1">

                                      {funcionario
                                        .jornadas
                                        .map(
                                          (jornada) => (

                                            <div
                                              key={
                                                jornada.id
                                              }
                                              className="print-jornada grid grid-cols-1 sm:grid-cols-[130px_1fr_1fr] gap-1 sm:gap-3 text-xs bg-red-50 border border-red-100 rounded px-3 py-2"
                                            >

                                              <div className="font-semibold text-red-800">

                                                {formatearFecha(
                                                  jornada.fecha_entrada
                                                )}

                                              </div>

                                              <div>

                                                Entrada:{' '}

                                                <strong>
                                                  {formatearHora(
                                                    jornada.hora_entrada
                                                  )}
                                                </strong>

                                              </div>

                                              <div>

                                                {config.key ===
                                                'instructor_practica' ? (

                                                  <>
                                                    Vehículo:{' '}

                                                    <strong>
                                                      {jornada.placa || '-'}
                                                    </strong>
                                                  </>

                                                ) : (

                                                  <strong className="text-red-700">
                                                    No Cerrado
                                                  </strong>

                                                )}

                                              </div>

                                            </div>

                                          )
                                        )}

                                    </div>

                                  </div>

                                )
                              )}

                          </div>

                        )}

                      </div>

                    </div>
                  )
                }
              )}

              {/* ============================================
                  RESUMEN GENERAL
              ============================================ */}

              <div className="print-avoid-break border-2 border-red-300 bg-red-50 rounded-xl p-4">

                <h3 className="font-bold text-red-800">
                  Resumen General
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">

                  <Dato
                    label="Instructor Práctica"
                    valor={
                      reporteNoCerrados
                        ?.grupos
                        ?.instructor_practica
                        ?.total ||
                      0
                    }
                  />

                  <Dato
                    label="Instructor Teoría"
                    valor={
                      reporteNoCerrados
                        ?.grupos
                        ?.instructor_teoria
                        ?.total ||
                      0
                    }
                  />

                  <Dato
                    label="Auxiliar Administrativo"
                    valor={
                      reporteNoCerrados
                        ?.grupos
                        ?.auxiliar_administrativo
                        ?.total ||
                      0
                    }
                  />

                  <Dato
                    label="Total"
                    valor={
                      reporteNoCerrados
                        .total_general
                    }
                  />

                </div>

                <p className="text-sm text-red-800 mt-4">

                  {
                    reporteNoCerrados
                      .mensaje_resumen
                  }

                </p>

              </div>

            </div>

          </div>

        )}

      </div>

      {/* ======================================================
          ESTILOS DE IMPRESIÓN
      ====================================================== */}

      <style jsx global>{`
        @media print {

          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ==========================================
             ELEMENTOS EXCLUSIVOS DE PANTALLA
          ========================================== */

          .no-imprimir {
            display: none !important;
          }

          /* ==========================================
             CONTENEDOR DEL REPORTE
          ========================================== */

          .reporte-no-cerrados {
            display: block !important;
            position: static !important;

            width: 100% !important;
            max-width: none !important;

            margin: 0 !important;
            padding: 0 !important;

            border: 0 !important;
            border-radius: 0 !important;

            box-shadow: none !important;

            overflow: visible !important;
          }

          /* ==========================================
             CABECERA
          ========================================== */

          .reporte-cabecera {
            padding: 8px 10px 10px 10px !important;

            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          /* ==========================================
             CONTENIDO
          ========================================== */

          .reporte-contenido {
            padding: 8px 10px !important;
          }

          /* ==========================================
             GRUPO POR ROL

             Puede dividirse entre páginas.
          ========================================== */

          .reporte-grupo-rol {
            break-inside: auto !important;
            page-break-inside: auto !important;

            overflow: visible !important;

            border-radius: 0 !important;
          }

          /* ==========================================
             ENCABEZADO DEL ROL

             Intenta permanecer junto a la primera
             fila del grupo.
          ========================================== */

          .reporte-encabezado-rol {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          /* ==========================================
             FUNCIONARIO

             Puede continuar en otra página.
          ========================================== */

          .reporte-funcionario {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          /* ==========================================
             NOMBRE DEL FUNCIONARIO

             Intenta permanecer junto a su primera
             jornada.
          ========================================== */

          .reporte-funcionario-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          /* ==========================================
             JORNADA INDIVIDUAL

             No se debe cortar.
          ========================================== */

          .print-jornada {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* ==========================================
             BLOQUES PEQUEÑOS

             Por ejemplo Resumen General.
          ========================================== */

          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* ==========================================
             TIPOGRAFÍA
          ========================================== */

          .reporte-no-cerrados {
            font-size: 10px !important;
          }

          .reporte-no-cerrados h2 {
            font-size: 20px !important;
            line-height: 1.1 !important;
          }

          .reporte-no-cerrados h3 {
            font-size: 12px !important;
          }

          .reporte-no-cerrados p {
            orphans: 3;
            widows: 3;
          }
        }
      `}</style>

    </div>
  )
}