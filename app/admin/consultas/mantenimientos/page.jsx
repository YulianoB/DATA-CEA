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
    })

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
          'Debe seleccionar ambas fechas.'
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
          'La fecha fin no puede ser menor que la fecha inicio.'
        )

        setStatus(
          '⚠️ Rango de fechas inválido.'
        )

        return false
      }

      const today =
        hoyBogota()

      if (
        startDate >
          today ||
        endDate >
          today
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

        {/* ==================================================
            ENCABEZADO
        ================================================== */}

        <div className="bg-white border rounded-xl shadow-lg p-5">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <div>

              <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
                Consultas Administrativas
              </p>

              <h1 className="text-2xl font-bold text-[var(--primary)] flex items-center gap-2 mt-1">

                <i className="fas fa-tools"></i>

                Mantenimientos Registrados

              </h1>

              <p className="text-sm text-gray-600 mt-2">
                Consulte los mantenimientos preventivos y correctivos realizados a los vehículos y sus costos asociados.
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

        <div className="bg-[var(--primary-dark)] text-white rounded-xl p-4 shadow-sm">

          <div className="flex items-center gap-2 mb-3">

            <i className="fas fa-filter"></i>

            <h2 className="text-sm font-semibold">
              Filtros de búsqueda
            </h2>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">

            <div>

              <label className="block mb-1">
                Fecha Inicio
              </label>

              <input
                type="date"
                name="startDate"
                value={
                  filters.startDate
                }
                max={
                  hoyBogota()
                }
                onChange={
                  handleChange
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-800 bg-white"
              />

            </div>

            <div>

              <label className="block mb-1">
                Fecha Fin
              </label>

              <input
                type="date"
                name="endDate"
                value={
                  filters.endDate
                }
                max={
                  hoyBogota()
                }
                onChange={
                  handleChange
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-800 bg-white"
              />

            </div>

            <div>

              <label className="block mb-1">
                Placa
              </label>

              <select
                name="placa"
                value={
                  filters.placa
                }
                onChange={
                  handleChange
                }
                disabled={
                  cargandoVehiculos
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-800 bg-white disabled:bg-gray-100"
              >

                <option value="">
                  Toda la flota
                </option>

                {placas.map(
                  (
                    vehiculo
                  ) => (

                    <option
                      key={
                        vehiculo.id ||
                        vehiculo.placa
                      }
                      value={
                        vehiculo.placa
                      }
                    >
                      {vehiculo.placa}

                      {vehiculo.marca
                        ? ` · ${vehiculo.marca}`
                        : ''}
                    </option>

                  )
                )}

              </select>

            </div>

            <div>

              <label className="block mb-1">
                Tipo de Mantenimiento
              </label>

              <select
                name="tipoMantenimiento"
                value={
                  filters
                    .tipoMantenimiento
                }
                onChange={
                  handleChange
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-800 bg-white"
              >

                <option value="">
                  Todos
                </option>

                <option value="PREVENTIVO">
                  PREVENTIVO
                </option>

                <option value="CORRECTIVO">
                  CORRECTIVO
                </option>

              </select>

            </div>

          </div>

          {/* =================================================
              BOTONES CENTRADOS
          ================================================= */}

          <div className="flex flex-wrap justify-center gap-2 mt-4">

            <button
              onClick={() =>
                handleConsultar(
                  1
                )
              }
              disabled={
                loading
              }
              className="bg-[var(--primary)] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs disabled:opacity-50"
            >
              <i className="fas fa-search mr-2"></i>

              {loading
                ? 'Consultando...'
                : 'Consultar'}
            </button>

            <button
              onClick={
                handleLimpiar
              }
              className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-xs"
            >
              <i className="fas fa-eraser mr-2"></i>

              Limpiar
            </button>

            <button
              onClick={
                exportXLSX
              }
              disabled={
                total ===
                  0 ||
                exporting
              }
              className="bg-green-600 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-xs disabled:opacity-40"
            >
              <i className="fas fa-file-excel mr-2"></i>

              Excel
            </button>

            <button
              onClick={
                exportPDF
              }
              disabled={
                total ===
                  0 ||
                exporting
              }
              className="bg-red-600 hover:bg-red-800 text-white px-4 py-2 rounded-lg text-xs disabled:opacity-40"
            >
              <i className="fas fa-file-pdf mr-2"></i>

              PDF
            </button>

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
            RESUMEN
        ================================================== */}

        {total > 0 && (

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">

            <Kpi
              titulo="Mantenimientos"
              valor={
                resumen
                  ?.total_mantenimientos ||
                0
              }
              icono="fa-tools"
            />

            <Kpi
              titulo="Preventivos"
              valor={
                resumen
                  ?.preventivos ||
                0
              }
              icono="fa-shield-halved"
              tipo="success"
            />

            <Kpi
              titulo="Correctivos"
              valor={
                resumen
                  ?.correctivos ||
                0
              }
              icono="fa-screwdriver-wrench"
              tipo={
                Number(
                  resumen
                    ?.correctivos ||
                  0
                ) >
                0
                  ? 'warning'
                  : 'success'
              }
            />

            <Kpi
              titulo="Costo Total"
              valor={
                fmtCOP(
                  resumen
                    ?.costo_total
                )
              }
              icono="fa-dollar-sign"
              tipo="warning"
            />

            <Kpi
              titulo="Tiempo Parada"
              valor={
                minutosALabel(
                  resumen
                    ?.tiempo_parada_minutos
                )
              }
              icono="fa-clock"
            />

          </div>

        )}

        {/* ==================================================
            COSTOS
        ================================================== */}

        {total > 0 && (

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            <Kpi
              titulo="Valor Repuestos"
              valor={
                fmtCOP(
                  resumen
                    ?.valor_repuestos
                )
              }
              icono="fa-gears"
            />

            <Kpi
              titulo="Valor Mano de Obra"
              valor={
                fmtCOP(
                  resumen
                    ?.valor_mano_obra
                )
              }
              icono="fa-user-gear"
            />

            <Kpi
              titulo="Vehículos Intervenidos"
              valor={
                resumen
                  ?.total_vehiculos ||
                0
              }
              icono="fa-car"
            />

          </div>

        )}

        {/* ==================================================
            TABLA
        ================================================== */}

        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1700px] text-[10px] border-collapse">

              <thead className="bg-slate-800 text-white">

                <tr>

                  <th className="p-2 border">
                    Fecha
                  </th>

                  <th className="p-2 border">
                    Placa
                  </th>

                  <th className="p-2 border">
                    KM
                  </th>

                  <th className="p-2 border">
                    Tipo
                  </th>

                  <th className="p-2 border">
                    Actividad
                  </th>

                  <th className="p-2 border">
                    Repuestos
                  </th>

                  <th className="p-2 border">
                    Empresa
                  </th>

                  <th className="p-2 border">
                    Parada
                  </th>

                  <th className="p-2 border">
                    Factura
                  </th>

                  <th className="p-2 border">
                    V. Repuestos
                  </th>

                  <th className="p-2 border">
                    V. Mano Obra
                  </th>

                  <th className="p-2 border">
                    Costo Total
                  </th>

                  <th className="p-2 border">
                    Responsable
                  </th>

                  <th className="p-2 border">
                    Observaciones
                  </th>

                </tr>

              </thead>

              <tbody>

                {data.length >
                0 ? (

                  data.map(
                    (
                      r
                    ) => {
                      const tipo =
                        String(
                          r
                            ?.tipo_mantenimiento ||
                          ''
                        )
                          .trim()
                          .toUpperCase()

                      const filaClase =
                        tipo ===
                        'CORRECTIVO'
                          ? 'bg-amber-50 hover:bg-amber-100'
                          : 'odd:bg-white even:bg-gray-50 hover:bg-blue-50'

                      return (
                        <tr
                          key={
                            r.id
                          }
                          className={`transition ${filaClase}`}
                        >

                          <td className="p-2 border text-center whitespace-nowrap">
                            {r
                              ?.fecha_registro ||
                              '-'}
                          </td>

                          <td className="p-2 border text-center font-semibold">
                            {r?.placa ||
                              '-'}
                          </td>

                          <td className="p-2 border text-center">
                            {Number(
                              r
                                ?.kilometraje ||
                              0
                            ).toLocaleString(
                              'es-CO'
                            )}
                          </td>

                          <td className="p-2 border text-center">

                            {tipo ===
                            'CORRECTIVO' ? (

                              <span className="inline-flex px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-semibold">
                                CORRECTIVO
                              </span>

                            ) : tipo ===
                              'PREVENTIVO' ? (

                              <span className="inline-flex px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-300 font-semibold">
                                PREVENTIVO
                              </span>

                            ) : (
                              r
                                ?.tipo_mantenimiento ||
                              '-'
                            )}

                          </td>

                          <td className="p-2 border text-left whitespace-normal break-words max-w-[420px]">
                            {r
                              ?.actividad_realizada ||
                              '-'}
                          </td>

                          <td className="p-2 border text-left whitespace-normal break-words max-w-[380px]">
                            {r
                              ?.repuestos_utilizados ||
                              '-'}
                          </td>

                          <td className="p-2 border text-center">
                            {r
                              ?.empresa ||
                              '-'}
                          </td>

                          <td className="p-2 border text-center whitespace-nowrap">
                            {minutosALabel(
                              r
                                ?.tiempoparada
                            )}
                          </td>

                          <td className="p-2 border text-center">
                            {r
                              ?.factura ||
                              '-'}
                          </td>

                          <td className="p-2 border text-center whitespace-nowrap min-w-[110px]">
                            {fmtCOP(
                              r
                                ?.valor_repuestos
                            )}
                          </td>

                          <td className="p-2 border text-center whitespace-nowrap min-w-[110px]">
                            {fmtCOP(
                              r
                                ?.valor_mano_obra
                            )}
                          </td>

                          <td className="p-2 border text-center whitespace-nowrap min-w-[120px] font-bold text-[var(--primary-dark)]">
                            {fmtCOP(
                              r
                                ?.costo_total
                            )}
                          </td>

                          <td className="p-2 border text-center">
                            {r
                              ?.responsable ||
                              '-'}
                          </td>

                          <td className="p-2 border text-left whitespace-normal break-words max-w-[420px]">
                            {r
                              ?.observaciones ||
                              '-'}
                          </td>

                        </tr>
                      )
                    }
                  )

                ) : (

                  <tr>

                    <td
                      colSpan={
                        14
                      }
                      className="text-center text-gray-500 p-6"
                    >
                      No hay resultados para los filtros seleccionados.
                    </td>

                  </tr>

                )}

              </tbody>

              {/* =================================================
                  TOTALES DE TODA LA CONSULTA
              ================================================= */}

              {total > 0 && (

                <tfoot>

                  <tr className="bg-gray-100 font-semibold">

                    <td
                      className="p-2 border text-right"
                      colSpan={
                        7
                      }
                    >
                      Totales de la consulta:
                    </td>

                    <td className="p-2 border text-center whitespace-nowrap">
                      {minutosALabel(
                        resumen
                          ?.tiempo_parada_minutos
                      )}
                    </td>

                    <td className="p-2 border"></td>

                    <td className="p-2 border text-center whitespace-nowrap">
                      {fmtCOP(
                        resumen
                          ?.valor_repuestos
                      )}
                    </td>

                    <td className="p-2 border text-center whitespace-nowrap">
                      {fmtCOP(
                        resumen
                          ?.valor_mano_obra
                      )}
                    </td>

                    <td className="p-2 border text-center whitespace-nowrap font-bold text-[var(--primary-dark)]">
                      {fmtCOP(
                        resumen
                          ?.costo_total
                      )}
                    </td>

                    <td
                      className="p-2 border"
                      colSpan={
                        2
                      }
                    ></td>

                  </tr>

                </tfoot>

              )}

            </table>

          </div>

        </div>

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

      </div>

    </div>
  )
}