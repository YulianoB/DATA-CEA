// app/admin/consultas/fallas/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import ModalResultado from '@/components/admin/ModalResultado'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import { BotonAccion, ESTILO_SECCIONES, ESTILO_ENCABEZADO_TABLA } from '@/components/admin/EstiloModulo'
import { TriangleAlert, Eraser, Eye, ClipboardList, X, ChevronLeft, ChevronRight, CheckCircle2, Save } from 'lucide-react'

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

const PAGE_SIZE = 50

const ESTADOS = [
  'PENDIENTE',
  'EN ANÁLISIS',
  'CERRADA',
]

// =========================================================
// HELPERS
// =========================================================

function normalizarTexto(valor) {
  return String(
    valor ?? ''
  ).trim()
}

function obtenerNitEmpresa(user) {
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
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Bogota',
    }
  ).format(new Date())
}

function normEstado(valor) {
  return String(
    valor || ''
  )
    .toUpperCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
}

function fmtNumero(valor) {
  return Number(
    valor || 0
  ).toLocaleString(
    'es-CO',
    {
      maximumFractionDigits: 0,
    }
  )
}

async function leerRespuestaApi(response) {
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
      texto.slice(0, 500)
    )

    throw new Error(
      `La API respondió contenido no JSON. HTTP ${response.status}`
    )
  }

  const data =
    await response.json()

  if (
    !response.ok ||
    data?.status !== 'success'
  ) {
    throw new Error(
      data?.message ||
      `Error HTTP ${response.status}`
    )
  }

  return data
}

// =========================================================
// CHIP ESTADO
// =========================================================

function EstadoChip({
  estado,
}) {
  const e =
    normEstado(
      estado
    )

  let color =
    'bg-gray-100 text-gray-700 border-gray-300'

  if (
    e === 'CERRADA'
  ) {
    color =
      'bg-green-100 text-green-700 border-green-300'
  }

  if (
    e === 'EN ANALISIS'
  ) {
    color =
      'bg-blue-100 text-blue-700 border-blue-300'
  }

  if (
    e === 'PENDIENTE'
  ) {
    color =
      'bg-amber-100 text-amber-700 border-amber-300'
  }

  return (
    <span
      className={`px-2 py-[2px] rounded-full border text-[10px] font-semibold whitespace-nowrap ${color}`}
    >
      {estado || '-'}
    </span>
  )
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

export default function FallasPage() {
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
      startDate: '',
      endDate: '',
      placa: '',
      estado: 'PENDIENTE',
      tipoVehiculo: '',
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
      total_fallas: 0,
      pendientes: 0,
      en_analisis: 0,
      cerradas: 0,
      vehiculos_afectados: 0,
      encargados_involucrados: 0,
    })

  // =======================================================
  // DRAWER
  // =======================================================

  const [
    drawerOpen,
    setDrawerOpen,
  ] =
    useState(false)

  const [
    rowSel,
    setRowSel,
  ] =
    useState(null)

  const [pasoSeguimiento, setPasoSeguimiento] = useState(1)
  const [obsAnalisis, setObsAnalisis] = useState('')
  const [modalResultado, setModalResultado] = useState({ abierto: false, tipo: 'exito', titulo: '', mensaje: '' })
  const avisar = (tipo, titulo, mensaje) => setModalResultado({ abierto: true, tipo, titulo, mensaje })

  const [
    obsCierre,
    setObsCierre,
  ] =
    useState('')

  const [
    closing,
    setClosing,
  ] =
    useState(false)

  const [
    changingState,
    setChangingState,
  ] =
    useState(false)

  // =======================================================
  // EXPORTACIÓN
  // =======================================================

  const [
    exporting,
    setExporting,
  ] =
    useState(false)

  // =======================================================
  // SESIÓN
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
                nit: nitActual,
                recurso: 'vehiculos',
              })

            const response =
              await fetch(
                `/api/admin/consultas/fallas?${params.toString()}`,
                {
                  cache: 'no-store',
                }
              )

            const result =
              await leerRespuestaApi(
                response
              )

            setVehiculos(
              Array.isArray(
                result?.vehiculos
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
  // VEHÍCULOS ORDENADOS
  // =======================================================

  const vehiculosOrdenados =
    useMemo(
      () => {
        return [
          ...vehiculos,
        ].sort(
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
  // FILTROS
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

  const tiposVehiculo = useMemo(() => [...new Set(vehiculos.map(v => String(v.tipo_vehiculo || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [vehiculos])
  const placasFiltradas = useMemo(() => vehiculosOrdenados.filter(v => !filters.tipoVehiculo || String(v.tipo_vehiculo || '').trim() === filters.tipoVehiculo), [vehiculosOrdenados, filters.tipoVehiculo])
  const handleTipoVehiculo = event => setFilters(prev => ({ ...prev, tipoVehiculo: event.target.value, placa: '' }))

  useEffect(() => {
    if (!nitActual) return
    const timeout = setTimeout(() => handleConsultar(1), 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nitActual, filters.startDate, filters.endDate, filters.tipoVehiculo, filters.placa, filters.estado])

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
        startDate && endDate && endDate <
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
        'Consultando fallas...'
      )

      try {
        const params =
          new URLSearchParams({
            nit:
              nitActual,

            recurso:
              'consulta',

            fecha_inicio:
              filters.startDate,

            fecha_fin:
              filters.endDate,

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
          filters.estado
        ) {
          params.set(
            'estado',
            filters.estado
          )
        }

        const response =
          await fetch(
            `/api/admin/consultas/fallas?${params.toString()}`,
            {
              cache: 'no-store',
            }
          )

        const result =
          await leerRespuestaApi(
            response
          )

        setData(
          Array.isArray(
            result?.registros
          )
            ? result.registros
            : []
        )

        const paginacion =
          result?.paginacion ||
          {}

        setPage(
          Number(
            paginacion?.pagina ||
            goToPage
          )
        )

        setTotal(
          Number(
            paginacion?.total ||
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
          result?.resumen || {
            total_fallas: 0,
            pendientes: 0,
            en_analisis: 0,
            cerradas: 0,
            vehiculos_afectados: 0,
            encargados_involucrados: 0,
          }
        )

        setStatus(
          `Consulta completada. ${Number(
            paginacion?.total ||
            0
          ).toLocaleString(
            'es-CO'
          )} registro(s) encontrados.`
        )
      } catch (error) {
        console.error(
          'Error consultando fallas:',
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
            'Error al consultar fallas.'
          }`
        )

        toast.error(
          error?.message ||
          'Error al consultar fallas.'
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
        startDate: '',
        endDate: '',
        placa: '',
        estado: 'PENDIENTE',
        tipoVehiculo: '',
      })

      setData(
        []
      )

      setTotal(
        0
      )

      setPage(
        1
      )

      setTotalPagesApi(
        1
      )

      setStatus(
        ''
      )

      setResumen({
        total_fallas: 0,
        pendientes: 0,
        en_analisis: 0,
        cerradas: 0,
        vehiculos_afectados: 0,
        encargados_involucrados: 0,
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
  // DRAWER
  // =======================================================

  const abrirSeguimiento =
    (
      row
    ) => {
      setRowSel(
        row
      )

      const estado = normEstado(row?.estado)
      setPasoSeguimiento(estado === 'EN ANALISIS' ? 3 : 1)
      setObsAnalisis(row?.observacion_analisis || '')
      setObsCierre(
        row
          ?.observaciones_seguimiento ||
        ''
      )

      setClosing(
        false
      )

      setChangingState(
        false
      )

      setDrawerOpen(
        true
      )
    }

  const cerrarDrawer =
    () => {
      setDrawerOpen(
        false
      )

      setRowSel(
        null
      )
      setPasoSeguimiento(1)

      setObsCierre(
        ''
      )

      setClosing(
        false
      )

      setChangingState(
        false
      )
    }

  // =======================================================
  // ACTUALIZAR FILA LOCAL
  // =======================================================

  const actualizarFilaLocal =
    (
      registro
    ) => {
      if (
        !registro?.id
      ) {
        return
      }

      setRowSel(
        registro
      )

      setData(
        (
          prev
        ) =>
          prev.map(
            (
              item
            ) =>
              item.id ===
              registro.id
                ? registro
                : item
          )
      )
    }

  // =======================================================
  // MARCAR EN ANÁLISIS
  // =======================================================

  const marcarEnAnalisis =
    async () => {
      if (
        !rowSel ||
        changingState
      ) {
        return
      }

      const estado =
        normEstado(
          rowSel.estado
        )

      if (
        estado === 'CERRADA'
      ) {
        toast.info(
          'La falla ya está cerrada.'
        )

        return
      }

      if (
        estado ===
        'EN ANALISIS'
      ) {
        toast.info(
          'La falla ya está EN ANÁLISIS.'
        )

        return
      }

      if (!obsAnalisis.trim()) {
        avisar('error', 'Análisis obligatorio', 'Describa la verificación y las acciones previstas.')
        return
      }
      setChangingState(true)

      try {
        const response =
          await fetch(
            '/api/admin/consultas/fallas',
            {
              method:
                'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  nit:
                    nitActual,

                  accion:
                    'marcar_en_analisis',

                  id:
                    rowSel.id,
                  observacion_analisis: obsAnalisis.trim(),
                  responsable: user?.nombreCompleto || user?.nombre_completo || user?.usuario || '',
                }),
            }
          )

        const result =
          await leerRespuestaApi(
            response
          )

        actualizarFilaLocal(
          result.registro
        )

        avisar('exito', 'Análisis registrado', result?.message || 'Falla en análisis.')

        // Reconsultar para mantener resumen correcto
        await handleConsultar(
          page
        )
      } catch (error) {
        console.error(
          'Error marcando EN ANÁLISIS:',
          error
        )

        avisar('error', 'Error al guardar análisis', error?.message || 'Intente nuevamente.')
      } finally {
        setChangingState(
          false
        )
      }
    }

  // =======================================================
  // CERRAR FALLA
  // =======================================================

  const cerrarFalla =
    async () => {
      if (
        !rowSel ||
        closing
      ) {
        return
      }

      const estado =
        normEstado(
          rowSel.estado
        )

      if (
        estado !==
        'EN ANALISIS'
      ) {
        toast.warning(
          'Para cerrar, primero cambie el estado a EN ANÁLISIS.'
        )

        return
      }

      if (
        !obsCierre.trim()
      ) {
        toast.warning(
          'Debe ingresar la observación de cierre.'
        )

        return
      }

      setClosing(
        true
      )

      try {
        const response =
          await fetch(
            '/api/admin/consultas/fallas',
            {
              method:
                'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  nit:
                    nitActual,

                  accion:
                    'cerrar_falla',

                  id:
                    rowSel.id,

                  responsable:
                    user
                      ?.nombreCompleto ||
                    user
                      ?.nombre_completo ||
                    user
                      ?.usuario ||
                    '',

                  observaciones_seguimiento:
                    obsCierre.trim(),
                }),
            }
          )

        const result =
          await leerRespuestaApi(
            response
          )

        actualizarFilaLocal(
          result.registro
        )

        avisar('exito', 'Falla cerrada', result?.message || 'Solución registrada.')

        await handleConsultar(
          page
        )
      } catch (error) {
        console.error(
          'Error cerrando falla:',
          error
        )

        avisar('error', 'Error al cerrar falla', error?.message || 'Intente nuevamente.')
      } finally {
        setClosing(
          false
        )
      }
    }

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
            filters.startDate,

          fecha_fin:
            filters.endDate,
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
        filters.estado
      ) {
        params.set(
          'estado',
          filters.estado
        )
      }

      const response =
        await fetch(
          `/api/admin/consultas/fallas?${params.toString()}`,
          {
            cache: 'no-store',
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
        total === 0
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
            result?.registros
          )
            ? result.registros
            : []

        if (
          allRows.length === 0
        ) {
          toast.info(
            'No hay datos para exportar.'
          )

          return
        }

        const [
          {
            default: ExcelJS,
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
            'Fallas'
          )

        const headers = [
          'Consecutivo',
          'Fecha',
          'Hora',
          'Placa',
          'Tipo',
          'Marca',
          'KM',
          'Encargado',
          'Descripción',
          'Acciones Tomadas',
          'Estado',
          'Observaciones Seguimiento',
          'Fecha Verificación',
          'Fecha Solución',
          'Usuario Soluciona',
        ]

        // =================================================
        // TÍTULO
        // =================================================

        ws.addRow([
          'REPORTE DE FALLAS',
        ])

        ws.mergeCells(
          'A1:O1'
        )

        ws.getCell(
          'A1'
        ).font = {
          bold: true,
          size: 16,
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
          'A2:O2'
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
          'A3:O3'
        )

        ws.addRow([
          `Período: ${filters.startDate} a ${filters.endDate}`,
        ])

        ws.mergeCells(
          'A4:O4'
        )

        ws.addRow([])

        // =================================================
        // ENCABEZADOS
        // =================================================

        ws.addRow(
          headers
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

              bold: true,
            }

            cell.alignment = {
              vertical:
                'middle',

              horizontal:
                'center',

              wrapText: true,
            }

            cell.border = {
              top: {
                style: 'thin',
              },

              left: {
                style: 'thin',
              },

              bottom: {
                style: 'thin',
              },

              right: {
                style: 'thin',
              },
            }
          }
        )

        // =================================================
        // DATOS
        // =================================================

        for (
          const r of
            allRows
        ) {
          const row =
            ws.addRow([
              r?.consecutivo ||
              '',

              r?.fecha ||
              '',

              r?.hora ||
              '',

              r?.placa ||
              '',

              r
                ?.tipo_vehiculo ||
              '',

              r?.marca ||
              '',

              Number(
                r?.kilometraje ||
                0
              ),

              r
                ?.nombre_encargado ||
              '',

              String(
                r
                  ?.descripcion_falla ||
                ''
              ).replace(
                /\r?\n/g,
                ' '
              ),

              String(
                r
                  ?.acciones_tomadas ||
                ''
              ).replace(
                /\r?\n/g,
                ' '
              ),

              r?.estado ||
              '',

              String(
                r
                  ?.observaciones_seguimiento ||
                ''
              ).replace(
                /\r?\n/g,
                ' '
              ),

              r
                ?.fecha_verificacion ||
              '',

              r
                ?.fecha_solucion ||
              '',

              r
                ?.usuario_soluciona ||
              '',
            ])

          row.eachCell(
            (
              cell,
              col
            ) => {
              cell.alignment = {
                vertical:
                  'middle',

                horizontal:
                  col <= 8
                    ? 'center'
                    : 'left',

                wrapText: true,
              }
            }
          )
        }

        ws.getColumn(
          7
        ).numFmt =
          '#,##0'

        const widths = [
          14,
          14,
          12,
          12,
          18,
          18,
          12,
          28,
          40,
          40,
          16,
          40,
          16,
          16,
          28,
        ]

        widths.forEach(
          (
            width,
            index
          ) => {
            ws.getColumn(
              index + 1
            ).width =
              width
          }
        )

        ws.views = [
          {
            state: 'frozen',
            ySplit: 6,
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
          `fallas_${filters.startDate}_${filters.endDate}.xlsx`
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
        total === 0
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
            result?.registros
          )
            ? result.registros
            : []

        if (
          allRows.length === 0
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

            unit: 'pt',

            format: 'a3',
          })

        const margin = 30

        const head = [[
          'Consec.',
          'Fecha',
          'Hora',
          'Placa',
          'Tipo',
          'Marca',
          'KM',
          'Encargado',
          'Descripción',
          'Acciones',
          'Estado',
          'Obs. Seguimiento',
          'F. Verificación',
          'F. Solución',
          'U. Soluciona',
        ]]

        const body =
          allRows.map(
            (
              r
            ) => [
              r?.consecutivo ||
              '',

              r?.fecha ||
              '',

              r?.hora ||
              '',

              r?.placa ||
              '',

              r
                ?.tipo_vehiculo ||
              '',

              r?.marca ||
              '',

              fmtNumero(
                r?.kilometraje
              ),

              r
                ?.nombre_encargado ||
              '',

              String(
                r
                  ?.descripcion_falla ||
                ''
              ).replace(
                /\r?\n/g,
                ' '
              ),

              String(
                r
                  ?.acciones_tomadas ||
                ''
              ).replace(
                /\r?\n/g,
                ' '
              ),

              r?.estado ||
              '',

              String(
                r
                  ?.observaciones_seguimiento ||
                ''
              ).replace(
                /\r?\n/g,
                ' '
              ),

              r
                ?.fecha_verificacion ||
              '',

              r
                ?.fecha_solucion ||
              '',

              r
                ?.usuario_soluciona ||
              '',
            ]
          )

        autoTable(
          doc,
          {
            head,
            body,

            startY: 66,

            styles: {
              fontSize: 7,
              cellPadding: 2.5,
              overflow:
                'linebreak',
            },

            headStyles: {
              fillColor: [
                31,
                41,
                55,
              ],

              textColor: 255,
            },

            margin: {
              left: margin,
              right: margin,
            },

            didDrawPage:
              () => {
                doc.setFontSize(
                  14
                )

                doc.text(
                  'REPORTE DE FALLAS',
                  margin,
                  26
                )

                doc.setFontSize(
                  8
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
                  42
                )

                doc.text(
                  `Período: ${filters.startDate} a ${filters.endDate}`,
                  margin,
                  54
                )
              },
          }
        )

        doc.save(
          `fallas_${filters.startDate}_${filters.endDate}.pdf`
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
  // FLAGS DRAWER
  // =======================================================

  const estadoUpper =
    normEstado(
      rowSel?.estado
    )

  const esPendiente =
    estadoUpper ===
    'PENDIENTE'

  const esCerrada =
    estadoUpper ===
    'CERRADA'

  const esAnalisis =
    estadoUpper ===
    'EN ANALISIS'

  const puedeEditar =
    esAnalisis &&
    !esCerrada

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

        <EncabezadoModulo titulo="Consulta de Fallas" subtitulo="Seguimiento de fallas reportadas durante la operación hasta su solución" icono={TriangleAlert} rutaRegreso="/admin/consultas" textoRegreso="Seguimiento Operativo y Consultas" />

        {/* ==================================================
            FILTROS
        ================================================== */}

        <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">

            <div>

              <label className="block mb-1 font-medium text-slate-700">
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
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 bg-white"
              />

            </div>

            <div>

              <label className="block mb-1 font-medium text-slate-700">
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
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 bg-white"
              />

            </div>

            <div>
              <label className="block mb-1 font-medium text-slate-700">Tipo Vehículo</label>
              <select value={filters.tipoVehiculo} onChange={handleTipoVehiculo} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 bg-white">
                <option value="">Todos los tipos</option>
                {tiposVehiculo.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </div>

            <div>

              <label className="block mb-1 font-medium text-slate-700">
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
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 bg-white disabled:bg-gray-100"
              >

                <option value="">
                  Toda la flota
                </option>

                {placasFiltradas.map(
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

              <label className="block mb-1 font-medium text-slate-700">
                Estado
              </label>

              <select
                name="estado"
                value={
                  filters.estado
                }
                onChange={
                  handleChange
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 bg-white"
              >

                <option value="">
                  Todos
                </option>

                {ESTADOS.map(
                  (
                    estado
                  ) => (

                    <option
                      key={
                        estado
                      }
                      value={
                        estado
                      }
                    >
                      {estado}
                    </option>

                  )
                )}

              </select>

            </div>

            <div className="flex justify-end gap-2 lg:col-span-1">
              <BotonAccion tipo="limpiar" type="button" onClick={handleLimpiar}><Eraser size={15} aria-hidden="true" /> Limpiar</BotonAccion>
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
            TABLA
        ================================================== */}

        <div className="rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 text-sm font-bold" style={{ backgroundColor: ESTILO_SECCIONES.fondo, color: ESTILO_SECCIONES.texto }}>
            <TriangleAlert size={16} aria-hidden="true" /> Registros de reportes de fallas
          </div>
          <div className="overflow-x-auto border border-slate-300 bg-white">

            <table className="w-full table-auto text-[11px] border-collapse [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-300">

              <thead style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>

                <tr>

                  <th className="p-2 border">
                    Consecutivo
                  </th>

                  <th className="p-2 border">
                    Fecha
                  </th>

                  <th className="p-2 border">
                    Hora
                  </th>

                  <th className="p-2 border">
                    Placa
                  </th>

                  <th className="p-2 border">
                    Tipo
                  </th>

                  <th className="p-2 border">
                    Marca
                  </th>

                  <th className="p-2 border">
                    KM
                  </th>

                  <th className="p-2 border">
                    Estado
                  </th>

                  <th className="p-2 border">
                    Acción
                  </th>

                </tr>

              </thead>

              <tbody>

                {data.length > 0 ? (

                  data.map(
                    (
                      row
                    ) => {
                      const estado =
                        normEstado(
                          row?.estado
                        )

                      const cerrada =
                        estado ===
                        'CERRADA'

                      const pendiente =
                        estado ===
                        'PENDIENTE'

                      return (
                        <tr
                          key={
                            row.id
                          }
                          className={`
                            transition
                            ${
                              pendiente
                                ? 'bg-amber-50 hover:bg-amber-100'
                                : 'odd:bg-white even:bg-gray-50 hover:bg-blue-50'
                            }
                          `}
                        >

                          <td className="p-2 border text-center">
                            {row
                              ?.consecutivo ||
                              '-'}
                          </td>

                          <td className="p-2 border text-center whitespace-nowrap">
                            {row?.fecha ||
                              '-'}
                          </td>

                          <td className="p-2 border text-center whitespace-nowrap">
                            {row?.hora ||
                              '-'}
                          </td>

                          <td className="p-2 border text-center font-semibold">
                            {row?.placa ||
                              '-'}
                          </td>

                          <td className="p-2 border text-center">
                            {row
                              ?.tipo_vehiculo ||
                              '-'}
                          </td>

                          <td className="p-2 border text-center">
                            {row?.marca ||
                              '-'}
                          </td>

                          <td className="p-2 border text-center">
                            {fmtNumero(
                              row
                                ?.kilometraje
                            )}
                          </td>

                          <td className="p-2 border text-center">
                            <EstadoChip
                              estado={
                                row?.estado
                              }
                            />
                          </td>

                          <td className="p-2 border text-center">

                            <BotonAccion
                              tipo="verDetalle"
                              type="button"
                              onClick={() => abrirSeguimiento(row)}
                              className="whitespace-nowrap py-1.5"
                              aria-label={cerrada ? 'Ver reporte de falla' : 'Realizar seguimiento de falla'}
                            >
                              {cerrada ? <Eye size={14} aria-hidden="true" /> : <ClipboardList size={14} aria-hidden="true" />}
                              {cerrada ? 'Ver reporte' : 'Seguimiento'}
                            </BotonAccion>

                          </td>

                        </tr>
                      )
                    }
                  )

                ) : (

                  <tr>

                    <td
                      colSpan={9}
                      className="text-center text-gray-500 p-6"
                    >
                      No hay resultados para los filtros seleccionados.
                    </td>

                  </tr>

                )}

              </tbody>

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
                    page - 1
                  )
                )
              }
              disabled={
                loading ||
                page <= 1
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
                    page + 1
                  )
                )
              }
              disabled={
                loading ||
                page >= totalPages
              }
              className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-100 disabled:opacity-40"
            >
              Siguiente

              <i className="fas fa-chevron-right ml-1"></i>
            </button>

          </div>

        )}

      </div>

      {/* DRAWER DE SEGUIMIENTO - flujo institucional de tres etapas */}
      <ModalResultado abierto={modalResultado.abierto} tipo={modalResultado.tipo} titulo={modalResultado.titulo} mensaje={modalResultado.mensaje} onCerrar={() => setModalResultado(prev => ({ ...prev, abierto: false }))} />
      {drawerOpen && rowSel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={cerrarDrawer} />
          <aside className="relative h-full w-full sm:w-[680px] lg:w-[740px] bg-slate-50 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-20 bg-white shadow-sm border-b border-slate-300">
              <div className="bg-[#194567] text-white px-4 sm:px-5 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-white/80">Expediente de falla</p>
                  <h2 className="text-lg font-black mt-1">{rowSel?.consecutivo || `#${rowSel?.id}`}</h2>
                  <p className="text-xs mt-1 text-white/80">Vehículo {rowSel?.placa || '-'}</p>
                  <div className="mt-2"><EstadoChip estado={rowSel?.estado} /></div>
                </div>
                <button type="button" aria-label="Cerrar expediente" onClick={cerrarDrawer} disabled={closing || changingState} className="w-9 h-9 rounded-full border border-white/50 flex items-center justify-center hover:bg-white/15 disabled:opacity-40"><X size={18} /></button>
              </div>
              <nav aria-label="Etapas del seguimiento" className="flex items-center gap-2 px-3 sm:px-5 py-2">
                <button type="button" aria-label="Etapa anterior" disabled={esCerrada || pasoSeguimiento === 1} onClick={() => setPasoSeguimiento(p => Math.max(1, p - 1))} className="p-2 text-[#194567] disabled:text-slate-300"><ChevronLeft size={17} /></button>
                <div className="grid grid-cols-3 gap-2 flex-1 min-w-0">
                  {[{n:1,t:'Reporte'},{n:2,t:'Análisis'},{n:3,t:'Cierre'}].map(etapa => (
                    <button key={etapa.n} type="button" disabled={esCerrada} aria-current={!esCerrada && pasoSeguimiento === etapa.n ? 'step' : undefined} onClick={() => setPasoSeguimiento(etapa.n)}
                      className={`flex flex-col items-center gap-1 rounded-md py-1 text-[11px] font-semibold ${esCerrada ? 'text-[#194567] cursor-default' : pasoSeguimiento === etapa.n ? 'text-[#194567]' : 'text-slate-600 hover:bg-slate-100'}`}>
                      <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold ${(esCerrada || pasoSeguimiento === etapa.n) ? 'bg-[#24638C] border-[#24638C] text-white' : 'bg-white border-slate-300'}`}>{etapa.n}</span>
                      <span>{etapa.t}</span>
                      <span className={`w-full h-1 rounded-full ${(etapa.n === 1 || (etapa.n === 2 && (esAnalisis || esCerrada)) || (etapa.n === 3 && esCerrada)) ? 'bg-[#24638C]' : 'bg-orange-400'}`} />
                    </button>
                  ))}
                </div>
                <button type="button" aria-label="Etapa siguiente" disabled={esCerrada || pasoSeguimiento === 3} onClick={() => setPasoSeguimiento(p => Math.min(3, p + 1))} className="p-2 text-[#194567] disabled:text-slate-300"><ChevronRight size={17} /></button>
              </nav>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <section className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-[#194567]">Información del reporte de falla</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[['Fecha',rowSel?.fecha],['Hora',rowSel?.hora],['Placa',rowSel?.placa],['Tipo',rowSel?.tipo_vehiculo]].map(([etiqueta,valor]) => (
                    <div key={etiqueta}><p className="text-slate-500">{etiqueta}</p><p className="font-semibold break-words">{valor || '-'}</p></div>
                  ))}
                </div>
                <div className="border-t border-slate-200 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {[['Marca',rowSel?.marca],['Kilometraje',fmtNumero(rowSel?.kilometraje)],['Encargado',rowSel?.nombre_encargado]].map(([etiqueta,valor]) => (
                    <div key={etiqueta}><p className="text-slate-500">{etiqueta}</p><p className="font-semibold break-words">{valor ?? '-'}</p></div>
                  ))}
                </div>
                {!esCerrada && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-xs">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="font-semibold text-amber-900">Descripción de la falla</p><p className="whitespace-pre-wrap mt-2 text-slate-700">{rowSel?.descripcion_falla || 'Sin descripción.'}</p></div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-[#194567]">Acciones tomadas inicialmente</p><p className="whitespace-pre-wrap mt-2 text-slate-700">{rowSel?.acciones_tomadas || 'Sin acciones registradas.'}</p></div>
                  </div>
                )}
              </section>
              {esCerrada && (
                <section className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
                  <h3 className="font-bold text-[#194567]">Trazabilidad del seguimiento</h3>
                  {[
                    ['1. Falla reportada',`Fecha: ${rowSel?.fecha || '-'} · Hora: ${rowSel?.hora || '-'}`,rowSel?.nombre_encargado,rowSel?.descripcion_falla, rowSel?.acciones_tomadas],
                    ['2. Verificación y análisis',`Fecha: ${rowSel?.fecha_verificacion || '-'}`,rowSel?.usuario_verificacion,rowSel?.observacion_analisis],
                    ['3. Solución y cierre',`Fecha: ${rowSel?.fecha_solucion || '-'}`,rowSel?.usuario_soluciona,rowSel?.observaciones_seguimiento]
                  ].map(([titulo,fecha,responsable,observacion,acciones]) => (
                    <div key={titulo} className="rounded-lg border-l-4 border-[#24638C] bg-slate-50 p-3 text-xs">
                      <p className="font-bold text-[#194567]">{titulo}</p><p className="mt-1">{fecha}</p><p>Responsable: {responsable || '-'}</p>
                      <p className="mt-1 whitespace-pre-wrap">{observacion || 'Sin descripción registrada.'}</p>
                      {acciones && <p className="mt-2 whitespace-pre-wrap">Acciones iniciales: {acciones}</p>}
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">Reporte cerrado. La información es de solo lectura.</p>
                </section>
              )}
              {!esCerrada && pasoSeguimiento === 1 && (
                <section className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
                  <h3 className="font-bold text-[#194567]">Paso 1 · Falla reportada</h3>
                  <p className="text-xs text-slate-600">Revise la falla y las acciones iniciales registradas por el instructor. El reporte original es de solo lectura.</p>
                  {esPendiente && <BotonAccion tipo="consultar" type="button" onClick={() => setPasoSeguimiento(2)}><ChevronRight size={15} /> Continuar al análisis</BotonAccion>}
                </section>
              )}
              {!esCerrada && pasoSeguimiento === 2 && (
                <section className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
                  <h3 className="font-bold text-[#194567]">Paso 2 · Análisis y actuación prevista</h3>
                  {esPendiente ? (
                    <>
                      <label htmlFor="analisis-falla" className="block text-xs font-semibold text-slate-700">Verificación y acciones previstas <span className="text-red-600">*</span></label>
                      <textarea autoFocus id="analisis-falla" rows={4} value={obsAnalisis} onChange={e => setObsAnalisis(e.target.value)} disabled={changingState || closing} placeholder="Describa la verificación realizada, la condición encontrada y la intervención prevista." className="w-full rounded-lg border-2 border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200 outline-none p-3 text-sm disabled:bg-slate-100" />
                      <p className="text-xs text-slate-600">Describa qué se verificó y qué intervención se realizará. No registre aquí reparaciones que todavía no se hayan ejecutado.</p>
                      <BotonAccion tipo="guardar" type="button" disabled={!obsAnalisis.trim() || changingState || closing} onClick={marcarEnAnalisis}><Save size={15} /> {changingState ? 'Guardando...' : 'Guardar análisis'}</BotonAccion>
                    </>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-[#194567]">Verificación y acciones previstas:</p>
                      <p className="whitespace-pre-wrap">{rowSel?.observacion_analisis || 'No hay análisis registrado.'}</p>
                      <p className="text-xs text-slate-600">Registrado el {rowSel?.fecha_verificacion || '-'} por {rowSel?.usuario_verificacion || '-'}</p>
                      <p className="text-xs text-slate-500">El análisis guardado es de solo lectura.</p>
                    </div>
                  )}
                </section>
              )}
              {!esCerrada && pasoSeguimiento === 3 && (
                <section className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
                  <h3 className="font-bold text-[#194567]">Paso 3 · Solución y cierre</h3>
                  <p className="text-xs text-slate-600">Describa las reparaciones o acciones correctivas efectivamente realizadas y cómo se verificó su solución.</p>
                  {rowSel?.observacion_analisis && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs"><p className="font-semibold text-[#194567]">Análisis registrado</p><p className="whitespace-pre-wrap mt-1">{rowSel.observacion_analisis}</p></div>}
                  <label htmlFor="cierre-falla" className="block text-xs font-semibold text-slate-700">Descripción de la solución <span className="text-red-600">*</span></label>
                  <textarea id="cierre-falla" rows={4} value={obsCierre} onChange={e => setObsCierre(e.target.value)} disabled={!esAnalisis || closing || changingState} placeholder="Describa la solución aplicada y las comprobaciones realizadas." className="w-full rounded-lg border border-slate-300 p-3 text-sm disabled:bg-slate-100" />
                  {esAnalisis && <BotonAccion tipo="guardar" type="button" disabled={!obsCierre.trim() || closing || changingState} onClick={cerrarFalla}><CheckCircle2 size={15} /> {closing ? 'Guardando...' : 'Guardar solución y cerrar'}</BotonAccion>}
                  {esPendiente && <p className="text-xs text-amber-700">Primero debe guardar el análisis.</p>}
                </section>
              )}
              <div className="flex justify-end"><BotonAccion tipo="cancelar" type="button" onClick={cerrarDrawer} disabled={closing || changingState}><X size={15} /> Cerrar panel</BotonAccion></div>
            </div>
          </aside>
        </div>
      )}

    </div>
  )
}