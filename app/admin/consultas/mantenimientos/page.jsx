// app/admin/consultas/mantenimientos/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import { BotonAccion, ESTILO_SECCIONES, ESTILO_ENCABEZADO_TABLA } from '@/components/admin/EstiloModulo'
import { Wrench, Eraser, Eye, X, FileSpreadsheet, FileText } from 'lucide-react'

import {
  Toaster,
  toast,
} from 'sonner'

import {
  cerrarSesion,
} from '@/lib/auth/logout'

// =========================================================
// CONSTANTES
// =========================================================

const PAGE_SIZE =
  50

const HEADERS = [
  'Fecha',
  'Placa',
  'KM',
  'Tipo',
  'Actividad',
  'Repuestos',
  'Empresa',
  'Parada (min)',
  'Factura',
  'V. Repuestos',
  'V. Mano Obra',
  'Costo Total',
  'Responsable',
  'Observaciones',
]

// =========================================================
// HELPERS
// =========================================================

function normalizarTexto(valor) {
  return String(
    valor ?? ''
  ).trim()
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

function fmtCOP(
  valor
) {
  return `$ ${Number(
    valor || 0
  ).toLocaleString(
    'es-CO',
    {
      maximumFractionDigits:
        0,
    }
  )}`
}

function minutosALabel(
  min
) {
  const m =
    Number(
      min || 0
    )

  if (
    !m
  ) {
    return '0 min'
  }

  const h =
    Math.floor(
      m / 60
    )

  const r =
    m % 60

  if (
    h > 0 &&
    r > 0
  ) {
    return `${m} min (${h} h ${r} m)`
  }

  if (
    h > 0
  ) {
    return `${m} min (${h} h)`
  }

  return `${m} min`
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

  const data =
    await response.json()

  if (
    !response.ok ||
    data?.status !==
      'success'
  ) {
    throw new Error(
      data?.message ||
      `Error HTTP ${response.status}`
    )
  }

  return data
}

// =========================================================
// KPI
// =========================================================

function Kpi({
  titulo,
  valor,
  icono,
  tipo = 'normal',
}) {
  let contenedor =
    'bg-blue-50 border-blue-200'

  let texto =
    'text-blue-800'

  let iconoClase =
    'bg-blue-100 text-blue-700'

  if (
    tipo === 'success'
  ) {
    contenedor =
      'bg-green-50 border-green-200'

    texto =
      'text-green-800'

    iconoClase =
      'bg-green-100 text-green-700'
  }

  if (
    tipo === 'warning'
  ) {
    contenedor =
      'bg-amber-50 border-amber-200'

    texto =
      'text-amber-800'

    iconoClase =
      'bg-amber-100 text-amber-700'
  }

  if (
    tipo === 'danger'
  ) {
    contenedor =
      'bg-red-50 border-red-200'

    texto =
      'text-red-800'

    iconoClase =
      'bg-red-100 text-red-700'
  }

  return (
    <div
      className={`border rounded-xl p-3 ${contenedor}`}
    >
      <div className="flex items-center gap-3">

        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconoClase}`}
        >
          <i
            className={`fas ${icono}`}
          ></i>
        </div>

        <div>

          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
            {titulo}
          </p>

          <p
            className={`text-lg font-black ${texto}`}
          >
            {valor}
          </p>

        </div>

      </div>
    </div>
  )
}

// =========================================================
// PÁGINA
// =========================================================

export default function MantenimientosPage() {
  const router =
    useRouter()

  // =======================================================
  // SESIÓN
  // =======================================================

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

  // =======================================================
  // FILTROS
  // =======================================================

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

      tipoMantenimiento:
        '',
      tipoVehiculo: '',
    })

  const [detalle, setDetalle] = useState(null)

  // =======================================================
  // VEHÍCULOS
  // =======================================================

  const [
    vehiculos,
    setVehiculos,
  ] =
    useState([])

  const [
    cargandoVehiculos,
    setCargandoVehiculos,
  ] =
    useState(false)

  // =======================================================
  // DATOS
  // =======================================================

  const [
    data,
    setData,
  ] =
    useState([])

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

  // =======================================================
  // PAGINACIÓN
  // =======================================================

  const [
    page,
    setPage,
  ] =
    useState(1)

  const [
    total,
    setTotal,
  ] =
    useState(0)

  const [
    totalPagesApi,
    setTotalPagesApi,
  ] =
    useState(1)

  // =======================================================
  // RESUMEN
  // =======================================================

  const [
    resumen,
    setResumen,
  ] =
    useState({
      total_mantenimientos:
        0,

      preventivos:
        0,

      correctivos:
        0,

      otros:
        0,

      total_vehiculos:
        0,

      valor_repuestos:
        0,

      valor_mano_obra:
        0,

      costo_total:
        0,

      tiempo_parada_minutos:
        0,
    })

  // =======================================================
  // EXPORTANDO
  // =======================================================

  const [
    exporting,
    setExporting,
  ] =
    useState(false)

  // =======================================================
  // SESIÓN INICIAL
  // =======================================================

  useEffect(
    () => {
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
    },
    [
      router,
    ]
  )

  // =======================================================
  // CARGAR VEHÍCULOS
  // =======================================================

  useEffect(
    () => {
      if (
        !nitActual
      ) {
        return
      }

      const cargarVehiculos =
        async () => {
          setCargandoVehiculos(
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
                `/api/admin/consultas/mantenimientos?${params.toString()}`,
                {
                  cache:
                    'no-store',
                }
              )

            const result =
              await leerRespuestaApi(
                response
              )

            setVehiculos(
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

            setVehiculos(
              []
            )

            toast.error(
              error?.message ||
              'No fue posible cargar las placas.'
            )
          } finally {
            setCargandoVehiculos(
              false
            )
          }
        }

      cargarVehiculos()
    },
    [
      nitActual,
    ]
  )

  // =======================================================
  // PLACAS
  // =======================================================

  const placas =
    useMemo(
      () => {
        return [
          ...vehiculos,
        ]
          .sort(
            (
              a,
              b
            ) =>
              String(
                a?.placa ||
                ''
              ).localeCompare(
                String(
                  b?.placa ||
                  ''
                ),
                'es'
              )
          )
      },
      [
        vehiculos,
      ]
    )

  // =======================================================
  // CAMBIO FILTROS
  // =======================================================

  const handleChange =
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
    }

  // =======================================================
  // VALIDACIÓN
  // =======================================================

  const validarRango = () => {
    const { startDate, endDate } = filters
    if (startDate && endDate && endDate < startDate) {
      setStatus('⚠️ Rango de fechas inválido.')
      return false
    }
    if ((startDate && startDate > hoyBogota()) || (endDate && endDate > hoyBogota())) {
      setStatus('⚠️ No se permiten fechas futuras.')
      return false
    }
    return true
  }

  const tiposVehiculo = useMemo(() => [...new Set(vehiculos.map(v => v.tipo_vehiculo).filter(Boolean))].sort((a,b) => a.localeCompare(b,'es')), [vehiculos])
  const placasFiltradas = useMemo(() => placas.filter(v => !filters.tipoVehiculo || v.tipo_vehiculo === filters.tipoVehiculo), [placas, filters.tipoVehiculo])

  useEffect(() => {
    if (!nitActual) return
    const timer = setTimeout(() => handleConsultar(1), 300)
    return () => clearTimeout(timer)
  }, [nitActual, filters.startDate, filters.endDate, filters.placa, filters.tipoMantenimiento, filters.tipoVehiculo])

  // =======================================================
  // CONSULTAR
  // =======================================================

  const handleConsultar =
    async (
      goToPage = 1
    ) => {
      if (
        !validarRango()
      ) {
        return
      }

      if (
        !nitActual
      ) {
        toast.error(
          'No fue posible identificar la empresa.'
        )

        return
      }

      setLoading(
        true
      )

      setStatus(
        'Consultando mantenimientos...'
      )

      try {
        const params =
          new URLSearchParams({
            nit:
              nitActual,

            recurso:
              'consulta',

            fecha_inicio:
              filters
                .startDate,

            fecha_fin:
              filters
                .endDate,

            pagina:
              String(
                goToPage
              ),

            page_size:
              String(
                PAGE_SIZE
              ),
          })

        if (filters.tipoVehiculo) params.set('tipo_vehiculo', filters.tipoVehiculo)

        if (
          filters.placa
        ) {
          params.set(
            'placa',
            filters.placa
          )
        }

        if (
          filters
            .tipoMantenimiento
        ) {
          params.set(
            'tipo_mantenimiento',
            filters
              .tipoMantenimiento
          )
        }

        const response =
          await fetch(
            `/api/admin/consultas/mantenimientos?${params.toString()}`,
            {
              cache:
                'no-store',
            }
          )

        const result =
          await leerRespuestaApi(
            response
          )

        const registros =
          Array.isArray(
            result
              ?.registros
          )
            ? result.registros
            : []

        const paginacion =
          result
            ?.paginacion ||
          {}

        setData(
          registros
        )

        setPage(
          Number(
            paginacion
              ?.pagina ||
            goToPage
          )
        )

        setTotal(
          Number(
            paginacion
              ?.total ||
            0
          )
        )

        setTotalPagesApi(
          Number(
            paginacion
              ?.total_paginas ||
            1
          )
        )

        setResumen(
          result
            ?.resumen || {
            total_mantenimientos:
              0,

            preventivos:
              0,

            correctivos:
              0,

            otros:
              0,

            total_vehiculos:
              0,

            valor_repuestos:
              0,

            valor_mano_obra:
              0,

            costo_total:
              0,

            tiempo_parada_minutos:
              0,
          }
        )

        setStatus(
          `Consulta completada. ${Number(
            paginacion
              ?.total ||
            0
          ).toLocaleString(
            'es-CO'
          )} registro(s) encontrados.`
        )
      } catch (error) {
        console.error(
          'Error consultando mantenimientos:',
          error
        )

        setData(
          []
        )

        setTotal(
          0
        )

        setTotalPagesApi(
          1
        )

        setStatus(
          `❌ ${
            error?.message ||
            'Error al consultar mantenimientos.'
          }`
        )

        toast.error(
          error?.message ||
          'Error al consultar mantenimientos.'
        )
      } finally {
        setLoading(
          false
        )
      }
    }

  // =======================================================
  // LIMPIAR
  // =======================================================

  const handleLimpiar =
    () => {
      setFilters({
        startDate:
          '',

        endDate:
          '',

        placa:
          '',

        tipoMantenimiento:
          '',
        tipoVehiculo: '',
      })

      setData(
        []
      )

      setPage(
        1
      )

      setTotal(
        0
      )

      setTotalPagesApi(
        1
      )

      setStatus(
        ''
      )

      setResumen({
        total_mantenimientos:
          0,

        preventivos:
          0,

        correctivos:
          0,

        otros:
          0,

        total_vehiculos:
          0,

        valor_repuestos:
          0,

        valor_mano_obra:
          0,

        costo_total:
          0,

        tiempo_parada_minutos:
          0,
      })
    }

  // =======================================================
  // TOTAL PÁGINAS
  // =======================================================

  const totalPages =
    Math.max(
      1,
      Number(
        totalPagesApi ||
        Math.ceil(
          total /
          PAGE_SIZE
        ) ||
        1
      )
    )

  // =======================================================
  // DATOS EXPORTACIÓN
  // =======================================================

  const obtenerDatosExportacion =
    async () => {
      if (
        !validarRango()
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
            filters
              .startDate,

          fecha_fin:
            filters
              .endDate,
        })

      if (
        filters.placa
      ) {
        params.set(
          'placa',
          filters.placa
        )
      }

      if (
        filters
          .tipoMantenimiento
      ) {
        params.set(
          'tipo_mantenimiento',
          filters
            .tipoMantenimiento
        )
      }

      const response =
        await fetch(
          `/api/admin/consultas/mantenimientos?${params.toString()}`,
          {
            cache:
              'no-store',
          }
        )

      return leerRespuestaApi(
        response
      )
    }

  // =======================================================
  // EXCEL
  // =======================================================

  const exportXLSX =
    async () => {
      if (
        total ===
        0
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

        const allRows =
          Array.isArray(
            result
              ?.registros
          )
            ? result.registros
            : []

        if (
          allRows.length ===
          0
        ) {
          toast.info(
            'No hay datos para exportar.'
          )

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

        const ws =
          wb.addWorksheet(
            'Mantenimientos'
          )

        // =================================================
        // TÍTULO
        // =================================================

        ws.addRow([
          'REPORTE DE MANTENIMIENTOS',
        ])

        ws.mergeCells(
          'A1:N1'
        )

        ws.getCell(
          'A1'
        ).font = {
          bold:
            true,

          size:
            16,
        }

        ws.getCell(
          'A1'
        ).alignment = {
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
          'A2:N2'
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
          'A3:N3'
        )

        ws.addRow([
          `Período: ${filters.startDate} a ${filters.endDate}`,
        ])

        ws.mergeCells(
          'A4:N4'
        )

        ws.addRow([])

        // =================================================
        // ENCABEZADOS
        // =================================================

        ws.addRow(
          HEADERS
        )

        const headerRow =
          ws.getRow(
            6
          )

        headerRow.eachCell(
          (
            cell
          ) => {
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

            cell.font = {
              color: {
                argb:
                  'FFFFFFFF',
              },

              bold:
                true,
            }

            cell.alignment = {
              vertical:
                'middle',

              horizontal:
                'center',

              wrapText:
                true,
            }
          }
        )

        // =================================================
        // FILAS
        // =================================================

        for (
          const r of
            allRows
        ) {
          ws.addRow([
            r
              ?.fecha_registro ||
            '',

            r?.placa ||
            '',

            Number(
              r?.kilometraje ||
              0
            ),

            r
              ?.tipo_mantenimiento ||
            '',

            String(
              r
                ?.actividad_realizada ||
              ''
            ).replace(
              /\r?\n/g,
              ' '
            ),

            String(
              r
                ?.repuestos_utilizados ||
              ''
            ).replace(
              /\r?\n/g,
              ' '
            ),

            r?.empresa ||
            '',

            Number(
              r?.tiempoparada ||
              0
            ),

            r?.factura ||
            '',

            Number(
              r?.valor_repuestos ||
              0
            ),

            Number(
              r?.valor_mano_obra ||
              0
            ),

            Number(
              r?.costo_total ||
              0
            ),

            r
              ?.responsable ||
            '',

            String(
              r
                ?.observaciones ||
              ''
            ).replace(
              /\r?\n/g,
              ' '
            ),
          ])
        }

        // =================================================
        // TOTALES
        // =================================================

        const resumenExport =
          result
            ?.resumen ||
          {}

        ws.addRow([])

        const totalRow =
          ws.addRow([
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            Number(
              resumenExport
                ?.tiempo_parada_minutos ||
              0
            ),
            'TOTALES',
            Number(
              resumenExport
                ?.valor_repuestos ||
              0
            ),
            Number(
              resumenExport
                ?.valor_mano_obra ||
              0
            ),
            Number(
              resumenExport
                ?.costo_total ||
              0
            ),
            '',
            '',
          ])

        totalRow.font = {
          bold:
            true,
        }

        totalRow.fill = {
          type:
            'pattern',

          pattern:
            'solid',

          fgColor: {
            argb:
              'FFE5E7EB',
          },
        }

        // =================================================
        // FORMATOS
        // =================================================

        ;[
          3,
          8,
          10,
          11,
          12,
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

        const widths = [
          14,
          12,
          12,
          16,
          35,
          30,
          22,
          14,
          16,
          18,
          18,
          18,
          24,
          35,
        ]

        widths.forEach(
          (
            width,
            index
          ) => {
            ws.getColumn(
              index +
              1
            ).width =
              width
          }
        )

        ws.views = [
          {
            state:
              'frozen',

            ySplit:
              6,
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
          `mantenimientos_${filters.startDate}_${filters.endDate}.xlsx`
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

  // =======================================================
  // PDF
  // =======================================================

  const exportPDF =
    async () => {
      if (
        total ===
        0
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

        const allRows =
          Array.isArray(
            result
              ?.registros
          )
            ? result.registros
            : []

        if (
          allRows.length ===
          0
        ) {
          toast.info(
            'No hay datos para exportar.'
          )

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
              'a3',
          })

        const margin =
          36

        const usable =
          doc
            .internal
            .pageSize
            .getWidth() -
          margin *
            2

        const weights = [
          7,
          6,
          6,
          8,
          18,
          16,
          12,
          7,
          8,
          10,
          10,
          11,
          12,
          18,
        ]

        const sumW =
          weights.reduce(
            (
              a,
              b
            ) =>
              a +
              b,
            0
          )

        const widths =
          weights.map(
            (
              w
            ) =>
              (
                usable *
                w
              ) /
              sumW
          )

        const columnStyles =
          widths.reduce(
            (
              acc,
              w,
              i
            ) => {
              acc[i] = {
                cellWidth:
                  w,
              }

              return acc
            },
            {}
          )

        const body =
          allRows.map(
            (
              r
            ) => [
              r
                ?.fecha_registro ||
              '',

              r?.placa ||
              '',

              Number(
                r?.kilometraje ||
                0
              ).toLocaleString(
                'es-CO'
              ),

              r
                ?.tipo_mantenimiento ||
              '',

              String(
                r
                  ?.actividad_realizada ||
                ''
              ).replace(
                /\r?\n/g,
                ' '
              ),

              String(
                r
                  ?.repuestos_utilizados ||
                ''
              ).replace(
                /\r?\n/g,
                ' '
              ),

              r?.empresa ||
              '',

              Number(
                r?.tiempoparada ||
                0
              ).toLocaleString(
                'es-CO'
              ),

              r?.factura ||
              '',

              Number(
                r?.valor_repuestos ||
                0
              ).toLocaleString(
                'es-CO'
              ),

              Number(
                r?.valor_mano_obra ||
                0
              ).toLocaleString(
                'es-CO'
              ),

              Number(
                r?.costo_total ||
                0
              ).toLocaleString(
                'es-CO'
              ),

              r
                ?.responsable ||
              '',

              String(
                r
                  ?.observaciones ||
                ''
              ).replace(
                /\r?\n/g,
                ' '
              ),
            ]
          )

        const resumenExport =
          result
            ?.resumen ||
          {}

        const foot = [[
          {
            content:
              'TOTALES',

            colSpan:
              7,

            styles: {
              halign:
                'right',

              fontStyle:
                'bold',
            },
          },

          {
            content:
              Number(
                resumenExport
                  ?.tiempo_parada_minutos ||
                0
              ).toLocaleString(
                'es-CO'
              ),

            styles: {
              fontStyle:
                'bold',
            },
          },

          {
            content:
              '',
          },

          {
            content:
              Number(
                resumenExport
                  ?.valor_repuestos ||
                0
              ).toLocaleString(
                'es-CO'
              ),

            styles: {
              fontStyle:
                'bold',
            },
          },

          {
            content:
              Number(
                resumenExport
                  ?.valor_mano_obra ||
                0
              ).toLocaleString(
                'es-CO'
              ),

            styles: {
              fontStyle:
                'bold',
            },
          },

          {
            content:
              Number(
                resumenExport
                  ?.costo_total ||
                0
              ).toLocaleString(
                'es-CO'
              ),

            styles: {
              fontStyle:
                'bold',
            },
          },

          {
            content:
              '',

            colSpan:
              2,
          },
        ]]

        autoTable(
          doc,
          {
            head: [
              HEADERS,
            ],

            body,

            foot,

            startY:
              68,

            styles: {
              fontSize:
                8,

              cellPadding:
                3,

              overflow:
                'linebreak',
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

            margin: {
              left:
                margin,

              right:
                margin,
            },

            columnStyles,

            didDrawPage:
              (
                data
              ) => {
                doc.setFontSize(
                  14
                )

                doc.text(
                  'REPORTE DE MANTENIMIENTOS',
                  margin,
                  28
                )

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
                  margin,
                  43
                )

                doc.text(
                  `Período: ${filters.startDate} a ${filters.endDate}`,
                  margin,
                  56
                )
              },
          }
        )

        doc.save(
          `mantenimientos_${filters.startDate}_${filters.endDate}.pdf`
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

  // =======================================================
  // CARGANDO
  // =======================================================

  if (
    !user
  ) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">

      <Toaster
        position="top-center"
        richColors
      />

      <div className="max-w-7xl mx-auto space-y-4">

        <EncabezadoModulo titulo="Consulta de Mantenimientos" subtitulo="Historial de mantenimientos preventivos y correctivos de vehículos y flota" icono={Wrench} rutaRegreso="/admin/consultas" textoRegreso="Seguimiento Operativo y Consultas" />
        <section className="rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 text-sm font-bold" style={{backgroundColor: ESTILO_SECCIONES.fondo, color: ESTILO_SECCIONES.texto}}><Wrench size={16} /> Filtros de búsqueda</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 text-xs items-end">
            <label className="block">Fecha inicio<input type="date" name="startDate" value={filters.startDate} max={hoyBogota()} onChange={handleChange} className="mt-1 w-full px-2 py-2 rounded-lg border border-slate-300 bg-white" /></label>
            <label className="block">Fecha fin<input type="date" name="endDate" value={filters.endDate} max={hoyBogota()} onChange={handleChange} className="mt-1 w-full px-2 py-2 rounded-lg border border-slate-300 bg-white" /></label>
            <label className="block">Tipo de vehículo<select value={filters.tipoVehiculo} onChange={e => setFilters(p => ({...p,tipoVehiculo:e.target.value,placa:''}))} className="mt-1 w-full px-2 py-2 rounded-lg border border-slate-300 bg-white"><option value="">Todos</option>{tiposVehiculo.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
            <label className="block">Placa<select name="placa" value={filters.placa} onChange={handleChange} disabled={cargandoVehiculos} className="mt-1 w-full px-2 py-2 rounded-lg border border-slate-300 bg-white"><option value="">Toda la flota</option>{placasFiltradas.map(v => <option key={v.id || v.placa} value={v.placa}>{v.placa}</option>)}</select></label>
            <label className="block">Mantenimiento<select name="tipoMantenimiento" value={filters.tipoMantenimiento} onChange={handleChange} className="mt-1 w-full px-2 py-2 rounded-lg border border-slate-300 bg-white"><option value="">Todos</option><option value="PREVENTIVO">PREVENTIVO</option><option value="CORRECTIVO">CORRECTIVO</option></select></label>
            <div className="flex lg:justify-end"><BotonAccion tipo="limpiar" type="button" onClick={handleLimpiar}><Eraser size={15} /> Limpiar</BotonAccion></div>
          </div>
        </section>

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

        <section className="rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 text-sm font-bold" style={{backgroundColor: ESTILO_SECCIONES.fondo,color: ESTILO_SECCIONES.texto}}><Wrench size={16} /> Mantenimientos registrados</div>
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-[11px] border-collapse [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-300">
              <thead style={{backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo,color:ESTILO_ENCABEZADO_TABLA.texto}}><tr>{['Fecha','Placa','KM','Tipo','Actividad realizada','Costo total','Acción'].map(t => <th key={t} className="p-2">{t}</th>)}</tr></thead>
              <tbody>
                {data.length ? data.map(r => (
                  <tr key={r.id} className={String(r.tipo_mantenimiento).toUpperCase()==='CORRECTIVO'?'bg-amber-50 hover:bg-amber-100':'odd:bg-white even:bg-slate-50 hover:bg-blue-50'}>
                    <td className="p-2 text-center whitespace-nowrap">{r.fecha_registro || '-'}</td>
                    <td className="p-2 text-center font-semibold">{r.placa || '-'}</td>
                    <td className="p-2 text-center">{Number(r.kilometraje || 0).toLocaleString('es-CO')}</td>
                    <td className="p-2 text-center">{r.tipo_mantenimiento || '-'}</td>
                    <td className="p-2 text-left max-w-[340px]"><p className="line-clamp-2 break-words" title={r.actividad_realizada || ''}>{r.actividad_realizada || '-'}</p></td>
                    <td className="p-2 text-center whitespace-nowrap font-semibold">{fmtCOP(r.costo_total)}</td>
                    <td className="p-2 text-center"><BotonAccion tipo="verDetalle" type="button" onClick={() => setDetalle(r)} className="whitespace-nowrap py-1.5"><Eye size={14} /> Ver detalle</BotonAccion></td>
                  </tr>
                )) : <tr><td colSpan={7} className="p-6 text-center text-slate-500">No hay resultados para los filtros seleccionados.</td></tr>}
              </tbody>
              {total > 0 && <tfoot><tr className="bg-slate-100 font-semibold"><td colSpan={5} className="p-2 text-right">Costo total de la consulta:</td><td className="p-2 text-center whitespace-nowrap">{fmtCOP(resumen?.costo_total)}</td><td className="p-2" /></tr></tfoot>}
            </table>
          </div>
        </section>
        <section className="rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 text-sm font-bold flex items-center gap-2" style={{backgroundColor:ESTILO_SECCIONES.fondo,color:ESTILO_SECCIONES.texto}}><FileText size={16} /> Reportes de mantenimientos</div>
          <div className="p-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-600">Exportar el historial según los filtros de consulta seleccionados.</p><div className="flex gap-2"><BotonAccion tipo="excel" type="button" onClick={exportXLSX} disabled={!total || exporting}><FileSpreadsheet size={15} /> Excel</BotonAccion><BotonAccion tipo="pdf" type="button" onClick={exportPDF} disabled={!total || exporting}><FileText size={15} /> PDF</BotonAccion></div></div>
        </section>

        {/* ==================================================
            PAGINACIÓN
        ================================================== */}

        {total > 0 && (

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">

            <button
              onClick={() =>
                handleConsultar(
                  Math.max(
                    1,
                    page -
                      1
                  )
                )
              }
              disabled={
                loading ||
                page <=
                  1
              }
              className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-100 disabled:opacity-40"
            >
              <i className="fas fa-chevron-left mr-1"></i>

              Anterior
            </button>

            <span className="bg-white border rounded-lg px-4 py-2">

              Página{' '}

              <strong>
                {page}
              </strong>

              {' '}de{' '}

              <strong>
                {totalPages}
              </strong>

              <span className="ml-2 text-gray-500">
                (
                {total.toLocaleString(
                  'es-CO'
                )}
                {' '}registros)
              </span>

            </span>

            <button
              onClick={() =>
                handleConsultar(
                  Math.min(
                    totalPages,
                    page +
                      1
                  )
                )
              }
              disabled={
                loading ||
                page >=
                  totalPages
              }
              className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-100 disabled:opacity-40"
            >
              Siguiente

              <i className="fas fa-chevron-right ml-1"></i>
            </button>

          </div>

        )}

      {detalle && <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={() => setDetalle(null)} />
        <aside className="relative h-full w-full sm:w-[680px] lg:w-[740px] bg-slate-50 shadow-2xl overflow-y-auto">
          <div className="sticky top-0 z-20 bg-[#194567] text-white px-5 py-4 flex justify-between gap-3">
            <div><p className="text-[10px] uppercase font-bold text-white/80">Detalle del mantenimiento · Solo lectura</p><h2 className="text-lg font-black mt-1">{detalle.placa || '-'}</h2><p className="text-xs mt-1 text-white/80">{detalle.fecha_registro || '-'} · {detalle.tipo_mantenimiento || '-'}</p></div>
            <button type="button" aria-label="Cerrar detalle" onClick={() => setDetalle(null)} className="w-9 h-9 rounded-full border border-white/50 flex items-center justify-center hover:bg-white/15"><X size={18} /></button>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm"><h3 className="text-sm font-bold text-[#194567] mb-3">Información del mantenimiento</h3><div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              { [['Fecha',detalle.fecha_registro],['Placa',detalle.placa],['Kilometraje',Number(detalle.kilometraje || 0).toLocaleString('es-CO')],['Tipo',detalle.tipo_mantenimiento],['Empresa / taller',detalle.empresa],['Tiempo de parada',minutosALabel(detalle.tiempoparada)],['Factura',detalle.factura],['Responsable',detalle.responsable]].map(([k,v]) => <div key={k}><p className="text-slate-500">{k}</p><p className="font-semibold break-words">{v || '-'}</p></div>)}
            </div></section>
            <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm space-y-3"><h3 className="text-sm font-bold text-[#194567]">Trabajos realizados</h3>{[['Actividad realizada',detalle.actividad_realizada],['Repuestos utilizados',detalle.repuestos_utilizados],['Observaciones',detalle.observaciones]].map(([k,v]) => <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"><p className="font-semibold text-[#194567]">{k}</p><p className="mt-2 whitespace-pre-wrap break-words">{v || 'Sin información registrada.'}</p></div>)}</section>
            <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm space-y-3"><h3 className="text-sm font-bold text-[#194567]">Costos registrados</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">{[['Repuestos',detalle.valor_repuestos],['Mano de obra',detalle.valor_mano_obra],['Costo total',detalle.costo_total]].map(([k,v]) => <div key={k}><p className="text-slate-500">{k}</p><p className="font-bold">{fmtCOP(v)}</p></div>)}</div></section>
            <div className="flex justify-end"><BotonAccion tipo="cancelar" type="button" onClick={() => setDetalle(null)}><X size={15} /> Cerrar panel</BotonAccion></div>
          </div>
        </aside>
      </div>}
      </div>

    </div>
  )
}