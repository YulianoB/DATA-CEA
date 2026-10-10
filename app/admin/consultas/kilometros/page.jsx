// app/admin/consultas/kilometros/page.jsx

'use client'

import {
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

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import { BotonAccion, TituloSeccion, MarcoTabla, ContenedorModulo, TarjetaModulo, ESTILO_CELDAS_TABLA } from '@/components/admin/EstiloModulo'
import { Route, Eraser, FileSpreadsheet, FileText, ShieldCheck, CarFront, AlertTriangle } from 'lucide-react'

// ============================================================
// CONSTANTES
// ============================================================

const ORDEN_TIPOS = [
  'AUTOMOVIL',
  'CAMIONETA',
  'MOTOCICLETA',
  'CAMION',
]

// ============================================================
// HELPERS
// ============================================================

function normalizarTexto(valor) {
  return String(
    valor ?? ''
  ).trim()
}

function normalizarMayusculas(valor) {
  return normalizarTexto(
    valor
  ).toUpperCase()
}

function normalizarSinAcentos(valor) {
  return normalizarMayusculas(
    valor
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
}

function normalizarTipoVehiculo(
  valor
) {
  const tipo =
    normalizarSinAcentos(
      valor
    )
      .replace(
        /_/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )

  if (
    tipo === 'AUTOMOVIL' ||
    tipo === 'AUTO'
  ) {
    return 'AUTOMOVIL'
  }

  if (
    tipo === 'CAMIONETA'
  ) {
    return 'CAMIONETA'
  }

  if (
    tipo === 'MOTOCICLETA' ||
    tipo === 'MOTO'
  ) {
    return 'MOTOCICLETA'
  }

  if (
    tipo === 'CAMION'
  ) {
    return 'CAMION'
  }

  return tipo || 'OTROS'
}

function nombreTipoVehiculo(
  valor
) {
  const tipo =
    normalizarTipoVehiculo(
      valor
    )

  if (
    tipo === 'AUTOMOVIL'
  ) {
    return 'Automóvil'
  }

  if (
    tipo === 'CAMIONETA'
  ) {
    return 'Camioneta'
  }

  if (
    tipo === 'MOTOCICLETA'
  ) {
    return 'Motocicleta'
  }

  if (
    tipo === 'CAMION'
  ) {
    return 'Camión'
  }

  return 'Otros'
}

function indiceTipoVehiculo(
  valor
) {
  const tipo =
    normalizarTipoVehiculo(
      valor
    )

  const indice =
    ORDEN_TIPOS.indexOf(
      tipo
    )

  return indice >= 0
    ? indice
    : ORDEN_TIPOS.length
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

function fmt(
  valor
) {
  return Number(
    valor || 0
  ).toLocaleString(
    'es-CO',
    {
      maximumFractionDigits:
        0,
    }
  )
}

function fmtKm(
  valor
) {
  return `${fmt(
    valor
  )} km`
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

function obtenerNitEmpresa(
  user
) {
  return normalizarTexto(
    user?.nitEmpresa ||
    user?.nit_empresa ||
    user?.empresa?.nit ||
    user?.nit ||
    localStorage.getItem(
      'currentEmpresaNit'
    )
  )
}

async function leerRespuestaApi(
  response
) {
  const contentType =
    response.headers.get(
      'content-type'
    ) || ''

  if (
    !contentType.includes(
      'application/json'
    )
  ) {
    const texto =
      await response.text()

    console.error(
      'Respuesta no JSON:',
      texto.slice(
        0,
        500
      )
    )

    throw new Error(
      `La API respondió contenido no JSON. HTTP ${response.status}`
    )
  }

  const resultado =
    await response.json()

  if (
    !response.ok ||
    resultado?.status !==
      'success'
  ) {
    throw new Error(
      resultado?.message ||
      `Error HTTP ${response.status}`
    )
  }

  return resultado
}

// ============================================================
// COMPONENTE KPI
// ============================================================

function Kpi({
  titulo,
  valor,
  icono,
  tipo = 'normal',
  descripcion = '',
}) {
  let texto =
    'text-[var(--primary-dark)]'

  let iconoClase =
    'bg-blue-100 text-[var(--primary)]'

  if (
    tipo === 'success'
  ) {
    texto =
      'text-green-800'

    iconoClase =
      'bg-green-100 text-green-700'
  }

  if (
    tipo === 'warning'
  ) {
    texto =
      'text-amber-800'

    iconoClase =
      'bg-amber-100 text-amber-700'
  }

  if (
    tipo === 'danger'
  ) {
    texto =
      'text-red-800'

    iconoClase =
      'bg-red-100 text-red-700'
  }

  return (
    <TarjetaModulo className="p-4 !border-slate-400" interactiva={false}>
      <div className="flex items-center gap-3">

        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconoClase}`}
        >
          <i
            className={`fas ${icono}`}
          ></i>
        </div>

        <div className="min-w-0">

          <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">
            {titulo}
          </p>

          <p
            className={`text-xl sm:text-2xl font-black leading-tight ${texto}`}
          >
            {valor}
          </p>

          {descripcion && (
            <p className="text-[10px] text-gray-500 mt-1">
              {descripcion}
            </p>
          )}

        </div>

      </div>
    </TarjetaModulo>
  )
}

// ============================================================
// TARJETA VEHÍCULO
// ============================================================

function TarjetaVehiculo({
  item,
}) {
  const kmPreop =
    Number(
      item
        ?.kilometros
        ?.preoperacionales ||
      0
    )

  const kmHorarios =
    Number(
      item
        ?.kilometros
        ?.horarios ||
      0
    )

  const diferencia =
    Number(
      item
        ?.kilometros
        ?.diferencia ||
      0
    )

  const noCerradas =
    Number(
      item
        ?.horarios
        ?.no_cerradas ||
      0
    )

  const abiertas =
    Number(
      item
        ?.horarios
        ?.abiertas ||
      0
    )

  const kmInvalidos =
    Number(
      item
        ?.horarios
        ?.kilometraje_invalido ||
      0
    )

  const regresivas =
    Number(
      item
        ?.preoperacionales
        ?.regresivas ||
      0
    )

  const tieneAlertas =
    Boolean(
      item?.tiene_alertas
    )

  return (
    <div
      className={`
        border
        rounded-xl
        overflow-hidden
        shadow-sm
        ${
          tieneAlertas
            ? 'border-amber-300'
            : 'border-gray-200'
        }
      `}
    >

      {/* HEADER */}

      <div
        className={`
          px-4
          py-3
          border-b
          ${
            tieneAlertas
              ? 'bg-amber-50'
              : 'bg-blue-50'
          }
        `}
      >

        <div className="flex items-start justify-between gap-3">

          <div>

            <div className="flex items-center gap-2">

              <i
                className={`fas ${
                  normalizarTipoVehiculo(
                    item
                      ?.vehiculo
                      ?.tipo_vehiculo
                  ) ===
                  'MOTOCICLETA'
                    ? 'fa-motorcycle'
                    : 'fa-car'
                } text-[var(--primary)]`}
              ></i>

              <h3 className="text-lg font-black text-[var(--primary)]">
                {item?.placa ||
                  '-'}
              </h3>

            </div>

            <p className="text-xs text-gray-600 mt-1">

              {item
                ?.vehiculo
                ?.marca ||
                '-'}

              {item
                ?.vehiculo
                ?.linea
                ? ` ${item.vehiculo.linea}`
                : ''}

              {item
                ?.vehiculo
                ?.modelo
                ? ` · ${item.vehiculo.modelo}`
                : ''}

            </p>

          </div>

          {tieneAlertas && (
            <span className="bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-1 text-[10px] font-bold whitespace-nowrap">
              <i className="fas fa-triangle-exclamation mr-1"></i>
              Revisar
            </span>
          )}

        </div>

      </div>

      {/* KILÓMETROS */}

      <div className="p-4">

        <div className="grid grid-cols-3 gap-2">

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">

            <p className="text-[10px] uppercase text-emerald-700 font-semibold">
              Preoperacionales
            </p>

            <p className="text-lg font-black text-emerald-800 mt-1">
              {fmtKm(
                kmPreop
              )}
            </p>

          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">

            <p className="text-[10px] uppercase text-blue-700 font-semibold">
              Horarios
            </p>

            <p className="text-lg font-black text-blue-800 mt-1">
              {fmtKm(
                kmHorarios
              )}
            </p>

          </div>

          <div
            className={`
              border
              rounded-lg
              p-3
              text-center
              ${
                diferencia >= 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
              }
            `}
          >

            <p className="text-[10px] uppercase text-gray-600 font-semibold">
              Diferencia
            </p>

            <p
              className={`text-lg font-black mt-1 ${
                diferencia >= 0
                  ? 'text-amber-800'
                  : 'text-red-700'
              }`}
            >
              {fmtKm(
                diferencia
              )}
            </p>

          </div>

        </div>

        {/* CALIDAD */}

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">

          <div className="bg-gray-50 border rounded-lg p-2 text-center">
            <div className="text-gray-500">
              Cerradas
            </div>
            <div className="font-bold">
              {item
                ?.horarios
                ?.cerradas ||
                0}
            </div>
          </div>

          <div
            className={`
              border
              rounded-lg
              p-2
              text-center
              ${
                noCerradas >
                0
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-gray-50'
              }
            `}
          >
            <div>
              No Cerradas
            </div>
            <div className="font-bold">
              {noCerradas}
            </div>
          </div>

          <div
            className={`
              border
              rounded-lg
              p-2
              text-center
              ${
                abiertas >
                0
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-gray-50'
              }
            `}
          >
            <div>
              Abiertas
            </div>
            <div className="font-bold">
              {abiertas}
            </div>
          </div>

          <div
            className={`
              border
              rounded-lg
              p-2
              text-center
              ${
                kmInvalidos +
                  regresivas >
                0
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-gray-50'
              }
            `}
          >
            <div>
              Inconsistencias
            </div>
            <div className="font-bold">
              {kmInvalidos +
                regresivas}
            </div>
          </div>

        </div>

        {/* ALERTAS */}

        {Array.isArray(
          item?.alertas
        ) &&
          item.alertas.length >
            0 && (

            <div className="mt-3 border-t pt-3 space-y-1">

              {item.alertas.map(
                (
                  alerta,
                  index
                ) => (

                  <p
                    key={`${alerta.tipo}-${index}`}
                    className="text-[11px] text-amber-800"
                  >
                    <i className="fas fa-circle-exclamation mr-1"></i>

                    {alerta.mensaje}
                  </p>

                )
              )}

            </div>

          )}

      </div>

    </div>
  )
}

// ============================================================
// PÁGINA
// ============================================================

function porcentajeCierre(cerradas, noCerradas, abiertas) {
  const total = Number(cerradas || 0) + Number(noCerradas || 0)
  if (total === 0) return null
  return Math.round((Number(cerradas || 0) / total) * 100)
}

function BarraCierre({ cerradas, noCerradas, abiertas }) {
  const porcentaje = porcentajeCierre(cerradas, noCerradas, abiertas)
  if (porcentaje === null) return <span className="text-slate-500">Sin registros</span>
  return (
    <div className="min-w-[120px]" title={`${cerradas || 0} jornadas cerradas de ${Number(cerradas || 0) + Number(noCerradas || 0)} jornadas evaluables`}>
      <div className="mb-1 text-xs font-semibold text-slate-800">{porcentaje}% cerradas</div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  )
}

export default function KilometrosPage() {
  const router =
    useRouter()

  // =========================================================
  // SESIÓN
  // =========================================================

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

  // =========================================================
  // FILTROS
  // =========================================================

  const [
    filters,
    setFilters,
  ] =
    useState({
      startDate:
        '',

      endDate:
        '',

      placa:
        '',
    })

  // =========================================================
  // CATÁLOGO
  // =========================================================

  const [
    vehiculosCatalogo,
    setVehiculosCatalogo,
  ] =
    useState([])

  const [
    cargandoCatalogo,
    setCargandoCatalogo,
  ] =
    useState(false)

  // =========================================================
  // CONSULTA
  // =========================================================

  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    status,
    setStatus,
  ] =
    useState('')

  const [
    resultado,
    setResultado,
  ] =
    useState(null)

  // =========================================================
  // EXPORTACIÓN
  // =========================================================

  const [
    exporting,
    setExporting,
  ] =
    useState(false)

  // =========================================================
  // SESIÓN
  // =========================================================

  useEffect(() => {
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
      const parsed =
        JSON.parse(
          stored
        )

      const nit =
        obtenerNitEmpresa(
          parsed
        )

      if (
        !nit
      ) {
        toast.error(
          'No se encontró la empresa asociada a la sesión.'
        )

        return
      }

      setUser(
        parsed
      )

      setNitActual(
        nit
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

  // =========================================================
  // CARGAR CATÁLOGO
  // =========================================================

  useEffect(() => {
    if (
      !nitActual
    ) {
      return
    }

    const cargarCatalogo =
      async () => {
        setCargandoCatalogo(
          true
        )

        try {
          const params =
            new URLSearchParams({
              nit:
                nitActual,

              recurso:
                'vehiculos',
            })

          const response =
            await fetch(
              `/api/admin/consultas/kilometros?${params.toString()}`,
              {
                cache:
                  'no-store',
              }
            )

          const result =
            await leerRespuestaApi(
              response
            )

          setVehiculosCatalogo(
            Array.isArray(
              result
                ?.vehiculos
            )
              ? result.vehiculos
              : []
          )
        } catch (error) {
          console.error(
            'Error cargando vehículos:',
            error
          )

          setVehiculosCatalogo(
            []
          )

          toast.error(
            error?.message ||
            'No fue posible cargar las placas.'
          )
        } finally {
          setCargandoCatalogo(
            false
          )
        }
      }

    cargarCatalogo()
  }, [
    nitActual,
  ])

  // =========================================================
  // VEHÍCULOS ORDENADOS
  // =========================================================

  const vehiculosOrdenados =
    useMemo(
      () => {
        return [
          ...vehiculosCatalogo,
        ].sort(
          (
            a,
            b
          ) => {
            const diferenciaTipo =
              indiceTipoVehiculo(
                a
                  ?.tipo_vehiculo
              ) -
              indiceTipoVehiculo(
                b
                  ?.tipo_vehiculo
              )

            if (
              diferenciaTipo !==
              0
            ) {
              return diferenciaTipo
            }

            return normalizarTexto(
              a?.placa
            ).localeCompare(
              normalizarTexto(
                b?.placa
              ),
              'es'
            )
          }
        )
      },
      [
        vehiculosCatalogo,
      ]
    )

  // =========================================================
  // FILTROS
  // =========================================================

  const onFilterChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target

      setFilters(
        (
          prev
        ) => ({
          ...prev,

          [name]:
            value,
        })
      )

      setResultado(
        null
      )

      setStatus(
        ''
      )
    }

  // =========================================================
  // VALIDACIÓN
  // =========================================================

  const validarFechas =
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
          'Debe seleccionar Fecha Inicio y Fecha Fin.'
        )

        setStatus(
          '⚠️ Debe seleccionar ambas fechas.'
        )

        return false
      }

      if (
        endDate <
        startDate
      ) {
        toast.warning(
          'La fecha final no puede ser anterior a la fecha inicial.'
        )

        setStatus(
          '⚠️ Rango de fechas inválido.'
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

        setStatus(
          '⚠️ No se permiten fechas futuras.'
        )

        return false
      }

      return true
    }

  // =========================================================
  // CONSULTAR
  // =========================================================

  // Consulta automática: cancelar solicitudes anteriores para evitar resultados obsoletos.
  useEffect(() => {
    const { startDate, endDate, placa } = filters
    if (!nitActual || !startDate || !endDate) {
      setLoading(false)
      setResultado(null)
      setStatus('')
      return
    }
    if (endDate < startDate || startDate > hoyBogota() || endDate > hoyBogota()) {
      setLoading(false)
      setResultado(null)
      setStatus('⚠️ Verifique el rango de fechas seleccionado.')
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setResultado(null)
      setStatus('Consultando kilómetros...')
      try {
        const params = new URLSearchParams({
          nit: nitActual,
          recurso: 'consulta',
          fecha_inicio: startDate,
          fecha_fin: endDate,
        })
        if (placa) params.set('placa', placa)
        const response = await fetch(
          `/api/admin/consultas/kilometros?${params.toString()}`,
          { cache: 'no-store', signal: controller.signal }
        )
        const result = await leerRespuestaApi(response)
        if (controller.signal.aborted) return
        setResultado(result)
        setStatus(placa
          ? `Consulta completada para la placa ${placa}.`
          : `Consulta completada. ${Number(result?.resumen?.total_vehiculos || 0)} vehículo(s) analizados.`)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Error consultando kilómetros:', error)
        setResultado(null)
        setStatus(`❌ ${error?.message || 'Error al consultar kilómetros.'}`)
        toast.error(error?.message || 'Error al consultar kilómetros.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [nitActual, filters.startDate, filters.endDate, filters.placa])

  // =========================================================
  // LIMPIAR
  // =========================================================

  const limpiar =
    () => {
      setFilters({
        startDate:
          '',

        endDate:
          '',

        placa:
          '',
      })

      setResultado(
        null
      )

      setStatus(
        ''
      )
    }

  // =========================================================
  // DATOS DERIVADOS
  // =========================================================

  const esTodaFlota =
    !filters.placa

  const resumen =
    resultado?.resumen ||
    null

  const resultadoIndividual =
    resultado?.resultado ||
    null

  const grupos =
    Array.isArray(
      resultado?.grupos
    )
      ? resultado.grupos
      : []

  const vehiculosResultado =
    Array.isArray(
      resultado?.vehiculos
    )
      ? resultado.vehiculos
      : []

  // =========================================================
  // EXPORTACIÓN
  // =========================================================

  const obtenerDatosExportacion =
    async () => {
      if (
        !esTodaFlota
      ) {
        toast.info(
          'Excel y PDF están disponibles únicamente para Toda la flota.'
        )

        return null
      }

      if (
        !validarFechas()
      ) {
        return null
      }

      const params =
        new URLSearchParams({
          nit:
            nitActual,

          recurso:
            'exportar',

          fecha_inicio:
            filters.startDate,

          fecha_fin:
            filters.endDate,
        })

      const response =
        await fetch(
          `/api/admin/consultas/kilometros?${params.toString()}`,
          {
            cache:
              'no-store',
          }
        )

      return leerRespuestaApi(
        response
      )
    }

  // =========================================================
  // EXCEL
  // =========================================================

  const exportXLSX =
    async () => {
      if (
        !resultado ||
        !esTodaFlota
      ) {
        return
      }

      setExporting(
        true
      )

      try {
        const result =
          await obtenerDatosExportacion()

        if (
          !result
        ) {
          return
        }

        const [
          {
            default:
              ExcelJS,
          },
          {
            saveAs,
          },
        ] =
          await Promise.all([
            import(
              'exceljs'
            ),

            import(
              'file-saver'
            ),
          ])

        const wb =
          new ExcelJS.Workbook()

        wb.creator =
          'CEA'

        wb.created =
          new Date()

        // ===================================================
        // HOJA PRINCIPAL
        // ===================================================

        const ws =
          wb.addWorksheet(
            'Kilometraje Flota'
          )

        ws.addRow([
          'REPORTE DE KILOMETRAJE DE FLOTA',
        ])

        ws.mergeCells(
          'A1:H1'
        )

        const titulo =
          ws.getCell(
            'A1'
          )

        titulo.font = {
          bold:
            true,

          size:
            16,
        }

        titulo.alignment = {
          horizontal:
            'center',
        }

        ws.addRow([
          `Empresa: ${
            result
              ?.empresa
              ?.nombre ||
            user
              ?.nombreEmpresa ||
            'CEA'
          }`,
        ])

        ws.mergeCells(
          'A2:H2'
        )

        ws.addRow([
          `NIT: ${
            result
              ?.empresa
              ?.nit ||
            nitActual
          }`,
        ])

        ws.mergeCells(
          'A3:H3'
        )

        ws.addRow([
          `Período: ${filters.startDate} a ${filters.endDate}`,
        ])

        ws.mergeCells(
          'A4:H4'
        )

        ws.addRow([])

        const encabezado = [
          'Placa',
          'Marca / Línea',
          'KM Preoperacionales',
          'KM Horarios',
          'Diferencia',
          'Jornadas Cerradas',
          'No Cerradas',
          'Abiertas',
        ]

        for (
          const grupo of
            result.grupos ||
            []
        ) {
          ws.addRow([
            grupo.nombre,
          ])

          const filaTipo =
            ws.lastRow

          ws.mergeCells(
            filaTipo.number,
            1,
            filaTipo.number,
            encabezado.length
          )

          filaTipo.font = {
            bold:
              true,

            color: {
              argb:
                'FFFFFFFF',
            },
          }

          filaTipo.fill = {
            type:
              'pattern',

            pattern:
              'solid',

            fgColor: {
              argb:
                'FF1F2937',
            },
          }

          ws.addRow(
            encabezado
          )

          const filaHeader =
            ws.lastRow

          filaHeader.eachCell(
            (
              cell
            ) => {
              cell.font = {
                bold:
                  true,
              }

              cell.alignment = {
                horizontal:
                  'center',

                vertical:
                  'middle',

                wrapText:
                  true,
              }

              cell.fill = {
                type:
                  'pattern',

                pattern:
                  'solid',

                fgColor: {
                  argb:
                    'FFE5E7EB',
                },
              }
            }
          )

          for (
            const item of
              grupo.vehiculos ||
              []
          ) {
            ws.addRow([
              item.placa,

              [
                item
                  ?.vehiculo
                  ?.marca,
                item
                  ?.vehiculo
                  ?.linea,
              ]
                .filter(
                  Boolean
                )
                .join(
                  ' '
                ),

              item
                ?.kilometros
                ?.preoperacionales ||
                0,

              item
                ?.kilometros
                ?.horarios ||
                0,

              item
                ?.kilometros
                ?.diferencia ||
                0,

              item
                ?.horarios
                ?.cerradas ||
                0,

              item
                ?.horarios
                ?.no_cerradas ||
                0,

              item
                ?.horarios
                ?.abiertas ||
                0,
            ])
          }

          const subtotal =
            ws.addRow([
              `SUBTOTAL ${grupo.nombre.toUpperCase()}`,
              '',
              grupo
                ?.resumen
                ?.km_preoperacionales ||
                0,
              grupo
                ?.resumen
                ?.km_horarios ||
                0,
              grupo
                ?.resumen
                ?.diferencia ||
                0,
              '',
              grupo
                ?.resumen
                ?.jornadas_no_cerradas ||
                0,
              grupo
                ?.resumen
                ?.jornadas_abiertas ||
                0,
            ])

          subtotal.font = {
            bold:
              true,
          }

          ws.addRow([])
        }

        // ===================================================
        // RESUMEN GENERAL
        // ===================================================

        ws.addRow([
          'RESUMEN GENERAL',
        ])

        const filaResumen =
          ws.lastRow

        ws.mergeCells(
          filaResumen.number,
          1,
          filaResumen.number,
          8
        )

        filaResumen.font = {
          bold:
            true,

          color: {
            argb:
              'FFFFFFFF',
          },
        }

        filaResumen.fill = {
          type:
            'pattern',

          pattern:
            'solid',

          fgColor: {
            argb:
              'FF7F1D1D',
          },
        }

        ws.addRow([
          'Toda la flota',
          '',
          result
            ?.resumen
            ?.km_preoperacionales ||
            0,
          result
            ?.resumen
            ?.km_horarios ||
            0,
          result
            ?.resumen
            ?.diferencia ||
            0,
          result
            ?.resumen
            ?.jornadas_cerradas ||
            0,
          result
            ?.resumen
            ?.jornadas_no_cerradas ||
            0,
          result
            ?.resumen
            ?.jornadas_abiertas ||
            0,
        ])

        ;[
          3,
          4,
          5,
        ].forEach(
          (
            columna
          ) => {
            ws.getColumn(
              columna
            ).numFmt =
              '#,##0'
          }
        )

        ws.getColumn(
          1
        ).width =
          16

        ws.getColumn(
          2
        ).width =
          30

        ws.getColumn(
          3
        ).width =
          20

        ws.getColumn(
          4
        ).width =
          18

        ws.getColumn(
          5
        ).width =
          18

        ws.getColumn(
          6
        ).width =
          18

        ws.getColumn(
          7
        ).width =
          15

        ws.getColumn(
          8
        ).width =
          12

        // Trazabilidad de estimaciones sin alterar las hojas existentes.
        const estimaciones = wb.addWorksheet('KM estimados')
        estimaciones.addRow(['Placa', 'ID jornada', 'Fecha jornada', 'Estado', 'KM inicial', 'KM estimados', 'Fuente posterior', 'ID referencia', 'Horas transcurridas'])
        for (const vehiculo of result.vehiculos || []) {
          for (const detalle of vehiculo?.horarios?.detalle_calidad || []) {
            if (detalle.tipo !== 'HORARIO_KM_ESTIMADO') continue
            estimaciones.addRow([vehiculo.placa, detalle.id, detalle.fecha, detalle.estado, detalle.km_inicial, detalle.km_estimados, detalle.fuente_referencia, detalle.id_referencia, detalle.horas_transcurridas])
          }
        }
        estimaciones.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        estimaciones.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF245E80' } }
        estimaciones.columns.forEach((col) => { col.width = 21 })
        estimaciones.getColumn(5).numFmt = '#,##0'
        estimaciones.getColumn(6).numFmt = '#,##0'

        // ===================================================
        // HOJA CALIDAD
        // ===================================================

        const wc =
          wb.addWorksheet(
            'Calidad de datos'
          )

        wc.addRow([
          'Placa',
          'Tipo',
          'No Cerradas',
          'Abiertas',
          'Horarios sin KM',
          'KM Horarios inválidos',
          'Preop sin KM',
          'Lecturas regresivas',
          'Sin incremento',
        ])

        wc.getRow(
          1
        ).eachCell(
          (
            cell
          ) => {
            cell.font = {
              bold:
                true,

              color: {
                argb:
                  'FFFFFFFF',
              },
            }

            cell.fill = {
              type:
                'pattern',

              pattern:
                'solid',

              fgColor: {
                argb:
                  'FF1F2937',
              },
            }

            cell.alignment = {
              horizontal:
                'center',

              wrapText:
                true,
            }
          }
        )

        for (
          const item of
            result.vehiculos ||
            []
        ) {
          wc.addRow([
            item.placa,

            item
              ?.vehiculo
              ?.tipo_vehiculo_nombre ||
              nombreTipoVehiculo(
                item
                  ?.vehiculo
                  ?.tipo_vehiculo
              ),

            item
              ?.horarios
              ?.no_cerradas ||
              0,

            item
              ?.horarios
              ?.abiertas ||
              0,

            item
              ?.horarios
              ?.sin_kilometraje ||
              0,

            item
              ?.horarios
              ?.kilometraje_invalido ||
              0,

            item
              ?.preoperacionales
              ?.sin_kilometraje ||
              0,

            item
              ?.preoperacionales
              ?.regresivas ||
              0,

            item
              ?.preoperacionales
              ?.sin_incremento ||
              0,
          ])
        }

        for (
          let i = 1;
          i <= 9;
          i++
        ) {
          wc.getColumn(
            i
          ).width =
            i <= 2
              ? 18
              : 20
        }

        wc.views = [
          {
            state:
              'frozen',

            ySplit:
              1,
          },
        ]

        const buffer =
          await wb.xlsx.writeBuffer()

        const blob =
          new Blob(
            [
              buffer,
            ],
            {
              type:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }
          )

        saveAs(
          blob,
          `kilometraje_flota_${filters.startDate}_${filters.endDate}.xlsx`
        )
      } catch (error) {
        console.error(
          'Error exportando Excel:',
          error
        )

        toast.error(
          error?.message ||
          'No fue posible generar el Excel.'
        )
      } finally {
        setExporting(
          false
        )
      }
    }

  // =========================================================
  // PDF
  // =========================================================

  const exportPDF =
    async () => {
      if (
        !resultado ||
        !esTodaFlota
      ) {
        return
      }

      setExporting(
        true
      )

      try {
        const result =
          await obtenerDatosExportacion()

        if (
          !result
        ) {
          return
        }

        const [
          {
            jsPDF,
          },
          {
            default:
              autoTable,
          },
        ] =
          await Promise.all([
            import(
              'jspdf'
            ),

            import(
              'jspdf-autotable'
            ),
          ])

        const doc =
          new jsPDF({
            orientation:
              'landscape',

            unit:
              'pt',

            format:
              'a4',
          })

        let currentY =
          30

        doc.setFontSize(
          15
        )

        doc.text(
          'REPORTE DE KILOMETRAJE DE FLOTA',
          40,
          currentY
        )

        currentY +=
          18

        doc.setFontSize(
          9
        )

        doc.text(
          `${
            result
              ?.empresa
              ?.nombre ||
            user
              ?.nombreEmpresa ||
            'CEA'
          } · NIT ${
            result
              ?.empresa
              ?.nit ||
            nitActual
          }`,
          40,
          currentY
        )

        currentY +=
          14

        doc.text(
          `Período: ${filters.startDate} a ${filters.endDate}`,
          40,
          currentY
        )

        currentY +=
          20

        for (
          const grupo of
            result.grupos ||
            []
        ) {
          if (
            currentY >
            500
          ) {
            doc.addPage()

            currentY =
              30
          }

          doc.setFontSize(
            11
          )

          doc.setFont(
            undefined,
            'bold'
          )

          doc.text(
            grupo.nombre.toUpperCase(),
            40,
            currentY
          )

          currentY +=
            8

          autoTable(
            doc,
            {
              startY:
                currentY,

              head: [[
                'Placa',
                'Marca / Línea',
                'KM Preop',
                'KM Horarios',
                'Diferencia',
                'Cerradas',
                'No Cerradas',
                'Abiertas',
              ]],

              body: (
                grupo.vehiculos ||
                []
              ).map(
                (
                  item
                ) => [
                  item.placa,

                  [
                    item
                      ?.vehiculo
                      ?.marca,
                    item
                      ?.vehiculo
                      ?.linea,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      ' '
                    ),

                  fmt(
                    item
                      ?.kilometros
                      ?.preoperacionales
                  ),

                  fmt(
                    item
                      ?.kilometros
                      ?.horarios
                  ),

                  fmt(
                    item
                      ?.kilometros
                      ?.diferencia
                  ),

                  item
                    ?.horarios
                    ?.cerradas ||
                    0,

                  item
                    ?.horarios
                    ?.no_cerradas ||
                    0,

                  item
                    ?.horarios
                    ?.abiertas ||
                    0,
                ]
              ),

              foot: [[
                {
                  content:
                    `Subtotal ${grupo.nombre}`,

                  colSpan:
                    2,

                  styles: {
                    fontStyle:
                      'bold',

                    halign:
                      'right',
                  },
                },

                {
                  content:
                    fmt(
                      grupo
                        ?.resumen
                        ?.km_preoperacionales
                    ),

                  styles: {
                    fontStyle:
                      'bold',
                  },
                },

                {
                  content:
                    fmt(
                      grupo
                        ?.resumen
                        ?.km_horarios
                    ),

                  styles: {
                    fontStyle:
                      'bold',
                  },
                },

                {
                  content:
                    fmt(
                      grupo
                        ?.resumen
                        ?.diferencia
                    ),

                  styles: {
                    fontStyle:
                      'bold',
                  },
                },

                '',
                grupo
                  ?.resumen
                  ?.jornadas_no_cerradas ||
                  0,
                grupo
                  ?.resumen
                  ?.jornadas_abiertas ||
                  0,
              ]],

              styles: {
                fontSize:
                  8,

                cellPadding:
                  3,
              },

              headStyles: {
                fillColor: [
                  31,
                  41,
                  55,
                ],

                textColor:
                  255,
              },

              theme:
                'grid',

              margin: {
                left:
                  40,

                right:
                  40,
              },
            }
          )

          currentY =
            (
              doc
                .lastAutoTable
                ?.finalY ||
              currentY
            ) +
            22
        }

        // =================================================
        // RESUMEN FINAL
        // =================================================

        if (
          currentY >
          485
        ) {
          doc.addPage()

          currentY =
            30
        }

        doc.setFontSize(
          11
        )

        doc.setFont(
          undefined,
          'bold'
        )

        doc.text(
          'RESUMEN GENERAL DE FLOTA',
          40,
          currentY
        )

        currentY +=
          8

        autoTable(
          doc,
          {
            startY:
              currentY,

            head: [[
              'Vehículos',
              'KM Preoperacionales',
              'KM Horarios',
              'Diferencia',
              'Cerradas',
              'No Cerradas',
              'Abiertas',
              'Vehículos con alertas',
            ]],

            body: [[
              result
                ?.resumen
                ?.total_vehiculos ||
                0,

              fmt(
                result
                  ?.resumen
                  ?.km_preoperacionales
              ),

              fmt(
                result
                  ?.resumen
                  ?.km_horarios
              ),

              fmt(
                result
                  ?.resumen
                  ?.diferencia
              ),

              result
                ?.resumen
                ?.jornadas_cerradas ||
                0,

              result
                ?.resumen
                ?.jornadas_no_cerradas ||
                0,

              result
                ?.resumen
                ?.jornadas_abiertas ||
                0,

              result
                ?.resumen
                ?.vehiculos_con_alertas ||
                0,
            ]],

            styles: {
              fontSize:
                8,

              cellPadding:
                4,

              halign:
                'center',
            },

            headStyles: {
              fillColor: [
                127,
                29,
                29,
              ],

              textColor:
                255,
            },

            theme:
              'grid',

            margin: {
              left:
                40,

              right:
                40,
            },
          }
        )

        // Anexo de trazabilidad de kilómetros estimados.
        const filasEstimadas = (result.vehiculos || []).flatMap(vehiculo =>
          (vehiculo?.horarios?.detalle_calidad || [])
            .filter(item => item.tipo === 'HORARIO_KM_ESTIMADO')
            .map(item => [
              vehiculo.placa, String(item.id), String(item.fecha || ''),
              fmt(item.km_inicial), fmt(item.km_estimados),
              item.fuente_referencia || '', String(item.id_referencia || ''),
              String(item.horas_transcurridas ?? '—'),
            ])
        )
        if (filasEstimadas.length > 0) {
          doc.addPage()
          doc.setFontSize(11)
          doc.setFont(undefined, 'bold')
          doc.text('ANEXO - KILOMETROS ESTIMADOS (48 HORAS)', 40, 42)
          doc.setFont(undefined, 'normal')
          doc.setFontSize(9)
          doc.text(`Confirmados: ${fmt(result?.resumen?.km_horarios_confirmados)} km  |  Estimados: ${fmt(result?.resumen?.km_horarios_estimados)} km`, 40, 59)
          autoTable(doc, {
            startY: 73,
            head: [['Placa', 'ID', 'Fecha', 'KM inicial', 'KM estimados', 'Fuente', 'ID ref.', 'Horas']],
            body: filasEstimadas,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 3 },
            headStyles: { fillColor: [36, 94, 128], textColor: 255 },
            margin: { top: 40, bottom: 40, left: 40, right: 40 },
          })
        }

        doc.save(
          `kilometraje_flota_${filters.startDate}_${filters.endDate}.pdf`
        )
      } catch (error) {
        console.error(
          'Error exportando PDF:',
          error
        )

        toast.error(
          error?.message ||
          'No fue posible generar el PDF.'
        )
      } finally {
        setExporting(
          false
        )
      }
    }

  // =========================================================
  // CARGANDO
  // =========================================================

  if (
    !user
  ) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">

      <Toaster
        position="top-center"
        richColors
      />

      <div className="max-w-7xl mx-auto space-y-4">

        {/* ==================================================
            ENCABEZADO
        ================================================== */}

        <EncabezadoModulo
          titulo="Kilómetros Recorridos"
          subtitulo="Comparación del kilometraje registrado en Preoperacionales y Jornadas de práctica"
          icono={Route}
          rutaRegreso="/admin/consultas"
          textoRegreso="Seguimiento Operativo y Consultas"
        />

        {resultado && esTodaFlota && <>
              {/* RESUMEN GENERAL */}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

                <Kpi
                  titulo="KM Preoperacionales"
                  valor={
                    fmtKm(
                      resumen
                        ?.km_preoperacionales
                    )
                  }
                  icono="fa-clipboard-check"
                  tipo="success"
                />

                <Kpi
                  titulo="KM Horarios"
                  valor={
                    fmtKm(
                      resumen
                        ?.km_horarios
                    )
                  }
                  icono="fa-clock"
                />

                <Kpi
                  titulo="Diferencia"
                  valor={
                    fmtKm(
                      resumen
                        ?.diferencia
                    )
                  }
                  icono="fa-code-compare"
                  tipo="warning"
                />

                <Kpi
                  titulo="Vehículos Analizados"
                  valor={
                    resumen
                      ?.total_vehiculos ||
                    0
                  }
                  icono="fa-car-side"
                />

              </div>

              {/* CALIDAD GENERAL */}

              <ContenedorModulo className="overflow-hidden !border-slate-400">
                <TituloSeccion titulo="Calidad de los registros de jornadas y preoperacionales" icono={<ShieldCheck size={17} />} className="!rounded-b-none" />
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">

                  <Kpi
                    titulo="Cerradas"
                    valor={
                      resumen
                        ?.jornadas_cerradas ||
                      0
                    }
                    icono="fa-circle-check"
                    tipo="success"
                  />

                  <Kpi
                    titulo="No Cerradas"
                    valor={
                      resumen
                        ?.jornadas_no_cerradas ||
                      0
                    }
                    icono="fa-triangle-exclamation"
                    tipo={
                      Number(
                        resumen
                          ?.jornadas_no_cerradas ||
                        0
                      ) >
                      0
                        ? 'danger'
                        : 'success'
                    }
                  />


                  <Kpi
                    titulo="KM inválidos"
                    valor={
                      resumen
                        ?.horarios_km_invalidos ||
                      0
                    }
                    icono="fa-exclamation"
                    tipo={
                      Number(
                        resumen
                          ?.horarios_km_invalidos ||
                        0
                      ) >
                      0
                        ? 'danger'
                        : 'success'
                    }
                  />

                  <div className="rounded-xl border border-slate-400 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-600">Jornadas cerradas del período</div>
                    <div className="mt-2 text-xl font-bold text-slate-800">
                      {porcentajeCierre(resumen?.jornadas_cerradas, resumen?.jornadas_no_cerradas, resumen?.jornadas_abiertas) === null ? 'Sin registros' : `${porcentajeCierre(resumen?.jornadas_cerradas, resumen?.jornadas_no_cerradas, resumen?.jornadas_abiertas)}%`}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Cerradas / (cerradas + no cerradas)</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${porcentajeCierre(resumen?.jornadas_cerradas, resumen?.jornadas_no_cerradas) ?? 0}%` }} />
                    </div>
                  </div>
                </div>
                  
                </div>
              </ContenedorModulo>

        </>}

        {/* ==================================================
            FILTROS
        ================================================== */}

        <div className="flex justify-end">
          <div className="flex flex-wrap items-end justify-end gap-2">
            <label className="w-[150px] text-xs font-semibold text-slate-700">Fecha inicial
              <input type="date" name="startDate" value={filters.startDate} max={hoyBogota()}
                onChange={onFilterChange} className="mt-1 block h-10 w-full rounded-lg border border-slate-400 bg-white px-3 text-sm text-slate-800" />
            </label>
            <label className="w-[150px] text-xs font-semibold text-slate-700">Fecha final
              <input type="date" name="endDate" value={filters.endDate} max={hoyBogota()}
                onChange={onFilterChange} className="mt-1 block h-10 w-full rounded-lg border border-slate-400 bg-white px-3 text-sm text-slate-800" />
            </label>
            <label className="w-[215px] text-xs font-semibold text-slate-700">Vehículo
              <select name="placa" value={filters.placa} onChange={onFilterChange} disabled={cargandoCatalogo}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-400 bg-white px-3 text-sm text-slate-800 disabled:bg-slate-100">
                <option value="">Toda la flota</option>
                {vehiculosOrdenados.map(vehiculo => <option key={vehiculo.id || vehiculo.placa} value={vehiculo.placa}>
                  {nombreTipoVehiculo(vehiculo.tipo_vehiculo)} · {vehiculo.placa}{vehiculo.marca ? ` · ${vehiculo.marca}` : ''}
                </option>)}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <BotonAccion tipo="limpiar" onClick={limpiar} className="h-10"><Eraser size={15} /> Limpiar</BotonAccion>
              {resultado && esTodaFlota && <>
                <BotonAccion tipo="excel" onClick={exportXLSX} disabled={exporting} className="h-10"><FileSpreadsheet size={15} /> Excel</BotonAccion>
                <BotonAccion tipo="pdf" onClick={exportPDF} disabled={exporting} className="h-10"><FileText size={15} /> PDF</BotonAccion>
              </>}
            </div>
          </div>
        </div>

        {/* ==================================================
            MENSAJE
        ================================================== */}

        {status && (

          <p
            className={`text-center text-xs ${
              status.includes(
                '❌'
              )
                ? 'text-red-600'
                : status.includes(
                    '⚠️'
                  )
                  ? 'text-amber-600'
                  : 'text-blue-700'
            }`}
          >
            {status}
          </p>

        )}

        {/* ==================================================
            RESULTADO INDIVIDUAL
        ================================================== */}

        {resultado &&
          !esTodaFlota &&
          resultadoIndividual && (

            <div className="overflow-hidden rounded-xl border border-slate-400 bg-white shadow-sm">

              {/* IDENTIFICACIÓN */}
              <TituloSeccion titulo="Kilometraje del vehículo" subtitulo="Detalle y calidad de los registros del período" icono={<CarFront size={17} />} className="!rounded-b-none" />
              <div className="border-b px-4 py-3" style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                  <div>

                    <h2 className="text-xl font-black text-[var(--primary)]">
                      {resultadoIndividual.placa}
                    </h2>

                    <p className="text-xs font-semibold text-gray-700 mt-0.5">

                      {resultadoIndividual
                        ?.vehiculo
                        ?.marca ||
                        '-'}

                      {resultadoIndividual
                        ?.vehiculo
                        ?.linea
                        ? ` ${resultadoIndividual.vehiculo.linea}`
                        : ''}

                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      Período: {formatearFecha(
                        resultado
                          ?.periodo
                          ?.desde
                      )} al {formatearFecha(
                        resultado
                          ?.periodo
                          ?.hasta
                      )}
                    </p>

                  </div>

                  <div className="text-sm text-gray-600">

                    <i
                      className={`fas ${
                        normalizarTipoVehiculo(
                          resultadoIndividual
                            ?.vehiculo
                            ?.tipo_vehiculo
                        ) ===
                        'MOTOCICLETA'
                          ? 'fa-motorcycle'
                          : 'fa-car'
                      } text-xl text-[var(--primary)]`}
                    ></i>

                  </div>

                </div>

              </div>

              {/* KPIS */}

              <div className="p-3">

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  <Kpi
                    titulo="KM Preoperacionales"
                    valor={
                      fmtKm(
                        resultadoIndividual
                          ?.kilometros
                          ?.preoperacionales
                      )
                    }
                    icono="fa-clipboard-check"
                    tipo="success"
                    descripcion="Movimiento registrado mediante lecturas del odómetro."
                  />

                  <Kpi
                    titulo="KM Horarios"
                    valor={
                      fmtKm(
                        resultadoIndividual
                          ?.kilometros
                          ?.horarios
                      )
                    }
                    icono="fa-clock"
                    descripcion="Incluye kilómetros confirmados y estimados mediante lecturas posteriores."
                  />

                  <Kpi
                    titulo="Diferencia"
                    valor={
                      fmtKm(
                        resultadoIndividual
                          ?.kilometros
                          ?.diferencia
                      )
                    }
                    icono="fa-code-compare"
                    tipo={
                      Number(
                        resultadoIndividual
                          ?.kilometros
                          ?.diferencia ||
                        0
                      ) >= 0
                        ? 'warning'
                        : 'danger'
                    }
                    descripcion="Diferencia entre ambas fuentes; requiere interpretación operativa."
                  />

                </div>

                <div className="mt-3 rounded-lg border border-slate-400 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="font-semibold">KM Horarios:</span>{' '}
                  Confirmados: <strong>{fmtKm(resultadoIndividual?.kilometros?.horarios_confirmados)}</strong>
                  {' · '}Estimados (48 h): <strong>{fmtKm(resultadoIndividual?.kilometros?.horarios_estimados)}</strong>
                  <p className="mt-1 text-xs text-slate-500">Los kilómetros estimados se calculan con la lectura posterior más cercana del mismo vehículo y no equivalen a una medición de cierre.</p>
                </div>
                {(resultadoIndividual?.horarios?.detalle_calidad || []).filter(item => item.tipo === 'HORARIO_KM_ESTIMADO').length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-400">
                    <table className="w-full min-w-[680px] border-collapse text-xs">
                      <thead><tr className="bg-cyan-100 text-slate-900">{['Fecha jornada', 'ID jornada', 'KM inicial', 'KM estimados', 'Fuente posterior', 'ID referencia', 'Horas'].map(t => <th key={t} className="border border-slate-300 p-2 text-left">{t}</th>)}</tr></thead>
                      <tbody>{(resultadoIndividual?.horarios?.detalle_calidad || []).filter(item => item.tipo === 'HORARIO_KM_ESTIMADO').map(item => (
                        <tr key={item.id}><td className="border border-slate-300 p-2">{item.fecha}</td><td className="border border-slate-300 p-2">{item.id}</td><td className="border border-slate-300 p-2">{item.km_inicial}</td><td className="border border-slate-300 p-2">{fmtKm(item.km_estimados)}</td><td className="border border-slate-300 p-2">{item.fuente_referencia}</td><td className="border border-slate-300 p-2">{item.id_referencia}</td><td className="border border-slate-300 p-2">{item.horas_transcurridas ?? '—'}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
                {/* CALIDAD */}

                <div className="mt-4 border border-slate-400 rounded-xl overflow-hidden>

                  <div className="bg-slate-800 text-white px-4 py-2 font-semibold text-sm">
                    <i className="fas fa-shield-halved mr-2"></i>
                    Calidad de los registros
                  </div>

                  <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-3">

                    <Kpi
                      titulo="Jornadas Cerradas"
                      valor={
                        resultadoIndividual
                          ?.horarios
                          ?.cerradas ||
                        0
                      }
                      icono="fa-circle-check"
                      tipo="success"
                    />

                    <Kpi
                      titulo="No Cerradas"
                      valor={
                        resultadoIndividual
                          ?.horarios
                          ?.no_cerradas ||
                        0
                      }
                      icono="fa-triangle-exclamation"
                      tipo={
                        Number(
                          resultadoIndividual
                            ?.horarios
                            ?.no_cerradas ||
                          0
                        ) >
                        0
                          ? 'danger'
                          : 'success'
                      }
                    />



                    <Kpi
                      titulo="Inconsistencias KM"
                      valor={
                        Number(
                          resultadoIndividual
                            ?.horarios
                            ?.kilometraje_invalido ||
                          0
                        ) +
                        Number(
                          resultadoIndividual
                            ?.preoperacionales
                            ?.regresivas ||
                          0
                        )
                      }
                      icono="fa-exclamation"
                      tipo={
                        Number(
                          resultadoIndividual
                            ?.horarios
                            ?.kilometraje_invalido ||
                          0
                        ) +
                          Number(
                            resultadoIndividual
                              ?.preoperacionales
                              ?.regresivas ||
                            0
                          ) >
                        0
                          ? 'danger'
                          : 'success'
                      }
                    />

                  </div>

                </div>

                {/* ALERTAS */}

                {Array.isArray(
                  resultadoIndividual
                    ?.alertas
                ) &&
                  resultadoIndividual
                    .alertas
                    .length >
                    0 && (

                    <div className="mt-4 bg-amber-50 border border-amber-300 rounded-xl p-4">

                      <h3 className="font-bold text-amber-800 text-sm mb-2">
                        <i className="fas fa-triangle-exclamation mr-2"></i>
                        Observaciones para interpretar el resultado
                      </h3>

                      <div className="space-y-1">

                        {resultadoIndividual.alertas.map(
                          (
                            alerta,
                            index
                          ) => (

                            <p
                              key={`${alerta.tipo}-${index}`}
                              className="text-xs text-amber-800"
                            >
                              • {alerta.mensaje}
                            </p>

                          )
                        )}

                      </div>

                    </div>

                  )}

              </div>

            </div>

          )}

        {/* ==================================================
            RESULTADO FLOTA
        ================================================== */}

        {resultado &&
          esTodaFlota && (

            <>

              {/* VEHÍCULOS POR TIPO */}

              <div className="space-y-5">

                {grupos.map(
                  (
                    grupo
                  ) => (

                    <div
                      key={
                        grupo.tipo_vehiculo
                      }
                      className="overflow-hidden rounded-xl border border-slate-400 bg-white shadow-sm"
                    >

                      {/* TIPO */}

                      <TituloSeccion
                        titulo={grupo.nombre}
                        icono={grupo.tipo_vehiculo === 'MOTOCICLETA' ? <Route size={17} /> : <CarFront size={17} />}
                        subtitulo={`${grupo?.resumen?.total_vehiculos || 0} vehículos · Preop: ${fmtKm(grupo?.resumen?.km_preoperacionales)} · Horarios: ${fmtKm(grupo?.resumen?.km_horarios)} · Diferencia: ${fmtKm(grupo?.resumen?.diferencia)}`}
                        className="!rounded-b-none"
                      />

                      <MarcoTabla className="overflow-x-auto !rounded-none !border-0">
                        <table className="w-full min-w-[920px] border-collapse text-center text-xs">
                          <thead>
                            <tr>{['Placa', 'Marca / Línea', 'KM Preoperacionales', 'KM Horarios', 'Diferencia', 'Cerradas', 'No Cerradas', 'Abiertas', '% de jornadas cerradas'].map(titulo =>
                              <th key={titulo} className="border px-3 py-3 text-center font-semibold" style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}>{titulo}</th>
                            )}</tr>
                          </thead>
                          <tbody>
                            {(grupo.vehiculos || []).map(item => <tr key={item.placa} className="hover:bg-slate-50">
                              <td className="border px-3 py-2 font-bold" style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}>{item.placa}</td>
                              <td className="border px-3 py-2" style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}>{[item.vehiculo?.marca, item.vehiculo?.linea].filter(Boolean).join(' ') || '—'}</td>
                              <td className="border px-3 py-2" style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}>{fmtKm(item.kilometros?.preoperacionales)}</td>
                              <td className="border px-3 py-2" style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}>{fmtKm(item.kilometros?.horarios)}</td>
                              <td className="border px-3 py-2" style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}>{fmtKm(item.kilometros?.diferencia)}</td>
                              <td className="border px-3 py-2" style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}>{item.horarios?.cerradas || 0}</td>
                              <td className="border px-3 py-2" style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}>{item.horarios?.no_cerradas || 0}</td>
                              <td className="border px-3 py-2" style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}>{item.horarios?.abiertas || 0}</td>
                              <td className="border px-3 py-2 text-left" style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}>
                                <BarraCierre cerradas={item.horarios?.cerradas} noCerradas={item.horarios?.no_cerradas} abiertas={item.horarios?.abiertas} />
                              </td>
                            </tr>)}
                          </tbody>
                        </table>
                      </MarcoTabla>

                    </div>

                  )
                )}

                {grupos.length ===
                  0 && (

                  <div className="bg-white border rounded-xl p-6 text-center text-sm text-gray-500">
                    No se encontraron registros para el período seleccionado.
                  </div>

                )}

              </div>

            </>

          )}

        {/* ==================================================
            SIN CONSULTA
        ================================================== */}

        {!resultado &&
          !loading && (

            <div className="bg-white border rounded-xl shadow-sm p-8 text-center">

              <i className="fas fa-road text-4xl text-gray-300 mb-3"></i>

              <h2 className="font-semibold text-gray-700">
                Consulte el kilometraje de un vehículo o de toda la flota
              </h2>

              <p className="text-sm text-gray-500 mt-2 max-w-2xl mx-auto">
                Los kilómetros de Horarios se calculan únicamente con jornadas cerradas y kilometraje válido. Los Preoperacionales se utilizan como referencia del movimiento general del vehículo.
              </p>

            </div>

          )}

      </div>

    </div>
  )
}