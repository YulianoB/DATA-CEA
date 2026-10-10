// app/admin/consultas/preoperacionales/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  Toaster,
  toast,
} from 'sonner'

import { cerrarSesion } from '@/lib/auth/logout'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import ModalResultado from '@/components/admin/ModalResultado'
import { BotonAccion, ESTILO_SECCIONES, ESTILO_ENCABEZADO_TABLA, ESTILO_CELDAS_TABLA } from '@/components/admin/EstiloModulo'
import { ClipboardCheck, Eraser, FileSpreadsheet, FileText } from 'lucide-react'

// =========================================================
// CONSTANTES
// =========================================================

const PAGE_SIZE = 50

const ESTADO_PENDIENTE =
  'PENDIENTE'

const ESTADO_ANALISIS =
  'EN ANÁLISIS'

const ESTADO_CERRADA =
  'CERRADA'

// =========================================================
// HELPERS
// =========================================================

function normalizarTexto(valor) {
  return String(
    valor || ''
  ).trim()
}

function normalizarMayusculas(valor) {
  return String(
    valor || ''
  )
    .trim()
    .toUpperCase()
}

// =========================================================
// FECHA BOGOTÁ
// =========================================================

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

// =========================================================
// NIT EMPRESA
// =========================================================

function obtenerNitEmpresa(
  user
) {
  return normalizarTexto(
    user?.nitEmpresa ||
    user?.nit_empresa ||
    user?.nit ||
    user?.empresaNit ||
    user?.empresa_nit
  )
}

// =========================================================
// LEER RESPUESTA API
// =========================================================

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
      'La API respondió contenido no JSON:',
      {
        status:
          response.status,

        texto:
          texto.slice(
            0,
            500
          ),
      }
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
// ESTADO CHIP
// =========================================================

function EstadoChip({
  estado,
}) {
  const estadoNormalizado =
    normalizarMayusculas(
      estado
    )

  let clases =
    'bg-gray-100 text-gray-700 border-gray-300'

  if (
    estadoNormalizado ===
    ESTADO_CERRADA
  ) {
    clases =
      'bg-green-100 text-green-700 border-green-300'
  } else if (
    estadoNormalizado ===
      'EN ANALISIS' ||
    estadoNormalizado ===
      'EN ANÁLISIS'
  ) {
    clases =
      'bg-blue-100 text-blue-700 border-blue-300'
  } else if (
    estadoNormalizado ===
    ESTADO_PENDIENTE
  ) {
    clases =
      'bg-amber-100 text-amber-700 border-amber-300'
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        px-2
        py-[2px]
        rounded-full
        border
        text-[10px]
        font-semibold
        whitespace-nowrap
        ${clases}
      `}
    >
      {
        estado ||
        '-'
      }
    </span>
  )
}

// =========================================================
// PÁGINA
// =========================================================

export default function PreoperacionalesPage() {
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

      tipoVehiculo:
        '',

      placa:
        '',

      conObservaciones:
        false,
    })

  const [estadoFiltro, setEstadoFiltro] = useState('PENDIENTE')
  const [pasoSeguimiento, setPasoSeguimiento] = useState(1)
  const [obsAnalisis, setObsAnalisis] = useState('')
  const campoAnalisisRef = useRef(null)
  const [modalResultado, setModalResultado] = useState({ abierto: false, tipo: 'exito', titulo: '', mensaje: '' })
  const mostrarAviso = (tipo, mensaje) => {
    setModalResultado({
      abierto: true,
      tipo: 'error',
      titulo: tipo === 'error' ? 'No fue posible completar la operación' : tipo === 'warning' ? 'Verifique la información' : 'Información',
      mensaje: String(mensaje || ''),
    })
  }

  const [reporteAnio, setReporteAnio] = useState(hoyBogota().slice(0, 4))
  const [reporteMes, setReporteMes] = useState(String(Number(hoyBogota().slice(5, 7))))
  const mesesReporte = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const aniosReporte = Array.from({ length: Number(hoyBogota().slice(0, 4)) - 2019 }, (_, i) => String(Number(hoyBogota().slice(0, 4)) - i))

  // =======================================================
  // VEHÍCULOS
  // =======================================================

  const [
    vehiculos,
    setVehiculos,
  ] =
    useState([])

  // =======================================================
  // RESULTADOS
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
      total_inspecciones:
        0,

      no_conformes:
        0,

      con_observaciones:
        0,

      pendientes:
        0,

      en_analisis:
        0,

      pendientes_o_analisis:
        0,

      cerradas:
        0,
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
    updating,
    setUpdating,
  ] =
    useState(false)

  // =======================================================
  // VEHÍCULOS DERIVADOS
  // =======================================================

  const tiposVehiculo =
    useMemo(
      () => {
        const valores =
          new Set(
            vehiculos
              .map(
                (vehiculo) =>
                  normalizarTexto(
                    vehiculo
                      ?.tipo_vehiculo
                  )
              )
              .filter(
                Boolean
              )
          )

        return Array.from(
          valores
        ).sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b,
              'es'
            )
        )
      },
      [
        vehiculos,
      ]
    )

  const placasLista =
    useMemo(
      () => {
        return vehiculos
          .filter(
            (vehiculo) => {
              if (
                !filters
                  .tipoVehiculo
              ) {
                return true
              }

              return (
                normalizarTexto(
                  vehiculo
                    ?.tipo_vehiculo
                ) ===
                filters
                  .tipoVehiculo
              )
            }
          )
          .map(
            (vehiculo) =>
              normalizarTexto(
                vehiculo
                  ?.placa
              )
          )
          .filter(
            Boolean
          )
          .sort(
            (
              a,
              b
            ) =>
              a.localeCompare(
                b,
                'es'
              )
          )
      },
      [
        vehiculos,
        filters.tipoVehiculo,
      ]
    )

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
  // CARGAR VEHÍCULOS
  // =======================================================

  const cargarVehiculos =
    async (
      usuarioSesion
    ) => {
      try {
        const nit =
          obtenerNitEmpresa(
            usuarioSesion
          )

        if (
          !nit
        ) {
          throw new Error(
            'No fue posible identificar la empresa de la sesión.'
          )
        }

        const params =
          new URLSearchParams({
            recurso:
              'vehiculos',

            nit,
          })

        const response =
          await fetch(
            `/api/admin/consultas/preoperacionales?${params.toString()}`,
            {
              method:
                'GET',

              cache:
                'no-store',
            }
          )

        const resultado =
          await leerRespuestaApi(
            response
          )

        setVehiculos(
          Array.isArray(
            resultado
              ?.vehiculos
          )
            ? resultado.vehiculos
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

        mostrarAviso('error', 
          error?.message ||
          'No se pudieron cargar los vehículos.'
        )
      }
    }

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
        const parsedUser =
          JSON.parse(
            stored
          )

        setUser(
          parsedUser
        )

        cargarVehiculos(
          parsedUser
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

  useEffect(() => {
    if (!user) return
    const timeout = setTimeout(() => handleConsultar(1), 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters.startDate, filters.endDate, filters.tipoVehiculo, filters.placa, estadoFiltro])

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
        type,
        checked,
      } =
        event.target

      setFilters(
        (
          prev
        ) => ({
          ...prev,

          [name]:
            type ===
            'checkbox'
              ? checked
              : value,
        })
      )
    }

  const handleTipoVehiculo =
    (
      event
    ) => {
      const value =
        event.target.value

      setFilters(
        (
          prev
        ) => ({
          ...prev,

          tipoVehiculo:
            value,

          placa:
            '',
        })
      )
    }

  // =======================================================
  // VALIDAR RANGO
  // =======================================================

  const validarRango =
    () => {
      const {
        startDate,
        endDate,
      } =
        filters

      if (startDate && endDate && endDate < startDate) {
        mostrarAviso('warning', 
          'La fecha final no puede ser anterior a la fecha inicial.'
        )

        setStatus(
          '⚠️ Rango de fechas inválido.'
        )

        return false
      }

      // IMPORTANTE:
      // hoy se define aquí antes de utilizarlo.
      const hoy =
        hoyBogota()

      if ((startDate && startDate > hoy) || (endDate && endDate > hoy)) {
        mostrarAviso('warning', 
          'No puede seleccionar fechas futuras.'
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
        !user
      ) {
        return
      }

      if (
        !validarRango()
      ) {
        return
      }

      setLoading(
        true
      )

      setStatus(
        'Consultando inspecciones...'
      )

      try {
        const nit =
          obtenerNitEmpresa(
            user
          )

        if (
          !nit
        ) {
          throw new Error(
            'No fue posible identificar la empresa de la sesión.'
          )
        }

        const params =
          new URLSearchParams({
            recurso:
              'consulta',

            nit,

            ...(filters.startDate ? { fecha_inicio: filters.startDate } : {}),
            ...(filters.endDate ? { fecha_fin: filters.endDate } : {}),

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
          filters
            .tipoVehiculo
        ) {
          params.set(
            'tipo_vehiculo',
            filters
              .tipoVehiculo
          )
        }

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
            .conObservaciones
        ) {
          params.set(
            'con_observaciones',
            'true'
          )
        }

        params.set('estado_observacion', estadoFiltro)

        const response =
          await fetch(
            `/api/admin/consultas/preoperacionales?${params.toString()}`,
            {
              method:
                'GET',

              cache:
                'no-store',
            }
          )

        const resultado =
          await leerRespuestaApi(
            response
          )

        const registros =
          Array.isArray(
            resultado
              ?.registros
          )
            ? resultado.registros
            : []

        const paginacion =
          resultado
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
          resultado
            ?.resumen || {
            total_inspecciones:
              0,

            no_conformes:
              0,

            con_observaciones:
              0,

            pendientes:
              0,

            en_analisis:
              0,

            pendientes_o_analisis:
              0,

            cerradas:
              0,
          }
        )

        setStatus(
          `Consulta completada. ${Number(
            paginacion?.total ||
            0
          ).toLocaleString(
            'es-CO'
          )} registros encontrados.`
        )
      } catch (error) {
        console.error(
          'Error consultando preoperacionales:',
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
            'Error al consultar inspecciones.'
          }`
        )

        mostrarAviso('error', 
          error?.message ||
          'Error al consultar inspecciones.'
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

        tipoVehiculo:
          '',

        placa:
          '',

        conObservaciones:
          false,
      })

      setEstadoFiltro('PENDIENTE')

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

      setResumen({
        total_inspecciones:
          0,

        no_conformes:
          0,

        con_observaciones:
          0,

        pendientes:
          0,

        en_analisis:
          0,

        pendientes_o_analisis:
          0,

        cerradas:
          0,
      })

      setStatus(
        ''
      )
    }

  // =======================================================
  // DRAWER
  // =======================================================

  const abrirSeguimiento =
    (
      row
    ) => {
      const estado = normalizarMayusculas(row?.estado_observacion)
      setPasoSeguimiento(estado === ESTADO_CERRADA ? 1 : (estado === ESTADO_ANALISIS || estado === 'EN ANALISIS' ? 3 : 2))
      setObsAnalisis(row?.observacion_analisis || '')
      setRowSel(
        row
      )

      setObsCierre(
        row
          ?.observacion_solucion ||
        ''
      )

      setClosing(
        false
      )

      setUpdating(
        false
      )

      setDrawerOpen(
        true
      )
    }

  const cerrarDrawer =
    () => {
      if (
        closing ||
        updating
      ) {
        return
      }

      setDrawerOpen(
        false
      )

      setRowSel(
        null
      )

      setObsCierre(
        ''
      )
      setObsAnalisis('')
    }

  // =======================================================
  // RESPONSABLE
  // =======================================================

  const obtenerResponsable =
    () => {
      return normalizarTexto(
        user
          ?.nombreCompleto ||
        user
          ?.nombre_completo ||
        user
          ?.usuario
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
        !registro
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
        !user ||
        updating
      ) {
        return
      }

      const estado =
        normalizarMayusculas(
          rowSel
            ?.estado_observacion
        )

      if (
        estado ===
        ESTADO_CERRADA
      ) {
        mostrarAviso('info', 
          'La observación ya está cerrada.'
        )

        return
      }

      if (
        estado ===
          'EN ANALISIS' ||
        estado ===
          'EN ANÁLISIS'
      ) {
        mostrarAviso('info', 
          'La observación ya está EN ANÁLISIS.'
        )

        return
      }

      if (!normalizarTexto(obsAnalisis)) {
        mostrarAviso('warning', 'Describa la verificación y la intervención prevista antes de guardar.')
        return
      }

      setUpdating(
        true
      )

      try {
        const nit =
          obtenerNitEmpresa(
            user
          )

        const responsable =
          obtenerResponsable()

        const response =
          await fetch(
            '/api/admin/consultas/preoperacionales',
            {
              method:
                'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  nit,

                  accion:
                    'marcar_en_analisis',
                  observacion_analisis: normalizarTexto(obsAnalisis),

                  id:
                    rowSel.id,

                  responsable,
                }),
            }
          )

        const resultado =
          await leerRespuestaApi(
            response
          )

        actualizarFilaLocal(
          resultado
            ?.registro
        )

        setModalResultado({
          abierto: true,
          tipo: 'exito',
          titulo: 'Operación realizada satisfactoriamente',
          mensaje: resultado?.message || 'Análisis guardado correctamente. El seguimiento pasó a EN ANÁLISIS.',
        })

        await handleConsultar(
          page
        )
      } catch (error) {
        console.error(
          'Error marcando EN ANÁLISIS:',
          error
        )

        mostrarAviso('error', 
          error?.message ||
          'No se pudo marcar EN ANÁLISIS.'
        )
      } finally {
        setUpdating(
          false
        )
      }
    }

  // =======================================================
  // CERRAR OBSERVACIÓN
  // =======================================================

  const cerrarObservacion =
    async () => {
      if (
        !rowSel ||
        !user ||
        closing
      ) {
        return
      }

      const observacion =
        normalizarTexto(
          obsCierre
        )

      if (
        !observacion
      ) {
        mostrarAviso('warning', 
          'Debe ingresar la observación de cierre.'
        )

        return
      }

      const estado =
        normalizarMayusculas(
          rowSel
            ?.estado_observacion
        )

      if (
        estado ===
        ESTADO_CERRADA
      ) {
        mostrarAviso('info', 
          'La observación ya está cerrada.'
        )

        return
      }

      if (
        estado !==
          'EN ANALISIS' &&
        estado !==
          'EN ANÁLISIS'
      ) {
        mostrarAviso('warning', 
          'Primero debe marcar la observación EN ANÁLISIS.'
        )

        return
      }

      setClosing(
        true
      )

      try {
        const nit =
          obtenerNitEmpresa(
            user
          )

        const responsable =
          obtenerResponsable()

        const response =
          await fetch(
            '/api/admin/consultas/preoperacionales',
            {
              method:
                'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  nit,

                  accion:
                    'cerrar_observacion',

                  id:
                    rowSel.id,

                  responsable,

                  observacion_solucion:
                    observacion,
                }),
            }
          )

        const resultado =
          await leerRespuestaApi(
            response
          )

        actualizarFilaLocal(
          resultado
            ?.registro
        )

        setModalResultado({
          abierto: true,
          tipo: 'exito',
          titulo: 'Operación realizada satisfactoriamente',
          mensaje: resultado?.message || 'Solución guardada y expediente cerrado correctamente.',
        })

        await handleConsultar(
          page
        )
      } catch (error) {
        console.error(
          'Error cerrando observación:',
          error
        )

        mostrarAviso('error', 
          error?.message ||
          'No se pudo cerrar la observación.'
        )
      } finally {
        setClosing(
          false
        )
      }
    }

  // =======================================================
  // OBTENER DATOS PARA EXPORTAR
  // =======================================================

  const obtenerDatosExportacion =
    async () => {
      if (Number(reporteAnio) > Number(hoyBogota().slice(0, 4)) || (Number(reporteAnio) === Number(hoyBogota().slice(0, 4)) && Number(reporteMes) > Number(hoyBogota().slice(5, 7)))) {
        throw new Error('No se pueden generar reportes de meses futuros.')
      }

      const nit =
        obtenerNitEmpresa(
          user
        )

      const params =
        new URLSearchParams({
          recurso:
            'exportar',

          nit,

          fecha_inicio: `${reporteAnio}-${String(reporteMes).padStart(2, '0')}-01`,

          fecha_fin: (() => { const anio = Number(reporteAnio); const mes = Number(reporteMes); const ultimoDia = new Date(anio, mes, 0).getDate(); const fin = `${reporteAnio}-${String(reporteMes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`; return fin > hoyBogota() ? hoyBogota() : fin })(),
        })

        const response =
        await fetch(
          `/api/admin/consultas/preoperacionales?${params.toString()}`,
          {
            method:
              'GET',

            cache:
              'no-store',
          }
        )

      const resultado =
        await leerRespuestaApi(
          response
        )

      return Array.isArray(
        resultado
          ?.registros
      )
        ? resultado.registros
        : []
    }

  // =======================================================
  // EXPORTAR EXCEL
  // =======================================================

  const exportXLSX =
    async () => {
      try {
        const registros =
          await obtenerDatosExportacion()

        if (
          registros.length ===
          0
        ) {
          mostrarAviso('info', 
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
            'Preoperacionales'
          )

        const nombreCEA = user?.nombreEmpresa || user?.nombre_empresa || 'CEA'
        ws.mergeCells('A1:M1')
        ws.getCell('A1').value = 'INSPECCIONES PREOPERACIONALES'
        ws.mergeCells('A2:M2')
        ws.getCell('A2').value = String(nombreCEA)
        ws.mergeCells('A3:M3')
        ws.getCell('A3').value = `Período del reporte: ${reporteAnio}-${String(reporteMes).padStart(2, '0')}`
        for (const fila of [1, 2, 3]) {
          const celda = ws.getCell(`A${fila}`)
          celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF194567' } }
          celda.font = { bold: fila !== 3, size: fila === 1 ? 16 : fila === 2 ? 12 : 10, color: { argb: 'FFFFFFFF' } }
          celda.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
          ws.getRow(fila).height = fila === 1 ? 32 : 24
        }
        ws.addRow([])
        const headers = ["Consecutivo","Fecha","Hora","Placa","Tipo Vehículo","Marca","KM","Encargado","Revisión exterior","Motor","Interior y funcionamiento","Equipos de prevención","Documentos"]
        ws.addRow(headers)

        const headerRow =
          ws.getRow(
            5
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
                  'FF194567',
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

        registros.forEach(
          (
            row
          ) => {
            ws.addRow([
              row?.consecutivo || '',
              row?.fecha_registro || '',
              row?.hora_registro || '',
              row?.placa || '',
              row?.tipo_vehiculo || '',
              row?.marca || '',
              row?.km_registro ?? '',
              row?.usuario_encargado || '',
              row?.revision_exterior || '',
              row?.motor || '',
              row?.interior_funcionamiento || '',
              row?.equipos_prevencion || '',
              row?.documentos || ''
            ])
          }
        )

        for (
          let i = 1;
          i <=
          headers.length;
          i++
        ) {
          let maxLength =
            headers[
              i -
              1
            ].length

          ws.eachRow(
            {
              includeEmpty:
                false,
            },
            (
              row
            ) => {
              const valor =
                row.getCell(
                  i
                ).value

              const texto =
                valor == null
                  ? ''
                  : String(
                      valor
                    )

              maxLength =
                Math.max(
                  maxLength,
                  Math.min(
                    texto.length,
                    60
                  )
                )
            }
          )

          ws.getColumn(
            i
          ).width =
            Math.min(
              Math.max(
                maxLength +
                  2,
                10
              ),
              45
            )
        }

        // Diseño institucional y configuración de impresión horizontal.
        headerRow.height = 32
        ws.autoFilter = { from: 'A5', to: 'M5' }
        ws.pageSetup = {
          paperSize: 9,
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          repeatRows: '1:5',
          margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 },
        }
        ws.headerFooter.oddFooter = 'DATA CEA · Inspecciones preoperacionales | Página &P de &N'
        ws.eachRow((fila, numero) => {
          if (numero <= 5) return
          fila.eachCell({ includeEmpty: true }, (celda, columna) => {
            celda.alignment = {
              vertical: 'middle',
              horizontal: [8].includes(columna) ? 'left' : 'center',
              wrapText: true,
            }
            celda.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } }
            celda.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: numero % 2 === 0 ? 'FFF1F6FA' : 'FFFFFFFF' },
            }
          })
          for (let columna = 9; columna <= 13; columna++) {
            const celda = fila.getCell(columna)
            const valor = String(celda.value || '').toUpperCase().trim()
            if (valor === 'NO CONFORME') celda.font = { bold: true, color: { argb: 'FFB91C1C' } }
            else if (valor === 'CONFORME') celda.font = { color: { argb: 'FF166534' } }
          }
        })

        ws.views = [
          {
            state:
              'frozen',

            ySplit:
              5,
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
          `preoperacionales_${reporteAnio}_${String(reporteMes).padStart(2, '0')}.xlsx`
        )
      } catch (error) {
        console.error(
          'Error exportando Excel:',
          error
        )

        mostrarAviso('error', 
          error?.message ||
          'No fue posible generar el archivo Excel.'
        )
      }
    }

  // =======================================================
  // ESCAPAR HTML
  // =======================================================

  const escaparHtml =
    (
      valor
    ) => {
      return String(
        valor ??
        ''
      )
        .replace(
          /&/g,
          '&amp;'
        )
        .replace(
          /</g,
          '&lt;'
        )
        .replace(
          />/g,
          '&gt;'
        )
        .replace(
          /"/g,
          '&quot;'
        )
        .replace(
          /'/g,
          '&#039;'
        )
    }

  // =======================================================
  // EXPORTAR / IMPRIMIR PDF
  // =======================================================

  const exportPDF =
    async () => {
      try {
        const registros =
          await obtenerDatosExportacion()

        if (
          registros.length ===
          0
        ) {
          mostrarAviso('info', 
            'No hay datos para exportar.'
          )

          return
        }

        const win =
          window.open(
            '',
            '_blank'
          )

        if (
          !win
        ) {
          mostrarAviso('warning', 
            'Debe permitir las ventanas emergentes para generar el reporte.'
          )

          return
        }

        const nombreEmpresa =
          escaparHtml(
            user
              ?.nombreEmpresa ||
            user
              ?.nombre_empresa ||
            'CEA'
          )

        const filas =
          registros
            .map(
              (
                row
              ) => `
                <tr>
                  <td>${escaparHtml(row?.consecutivo)}</td>
                  <td>${escaparHtml(row?.fecha_registro)}</td>
                  <td>${escaparHtml(row?.hora_registro)}</td>
                  <td>${escaparHtml(row?.placa)}</td>
                  <td>${escaparHtml(row?.tipo_vehiculo)}</td>
                  <td>${escaparHtml(row?.marca)}</td>
                  <td>${escaparHtml(row?.km_registro)}</td>
                  <td>${escaparHtml(row?.usuario_encargado)}</td>
                  <td class="${String(row?.revision_exterior || '').toUpperCase().trim() === 'NO CONFORME' ? 'no-conforme' : 'conforme'}">${escaparHtml(row?.revision_exterior)}</td>
                  <td class="${String(row?.motor || '').toUpperCase().trim() === 'NO CONFORME' ? 'no-conforme' : 'conforme'}">${escaparHtml(row?.motor)}</td>
                  <td class="${String(row?.interior_funcionamiento || '').toUpperCase().trim() === 'NO CONFORME' ? 'no-conforme' : 'conforme'}">${escaparHtml(row?.interior_funcionamiento)}</td>
                  <td class="${String(row?.equipos_prevencion || '').toUpperCase().trim() === 'NO CONFORME' ? 'no-conforme' : 'conforme'}">${escaparHtml(row?.equipos_prevencion)}</td>
                  <td class="${String(row?.documentos || '').toUpperCase().trim() === 'NO CONFORME' ? 'no-conforme' : 'conforme'}">${escaparHtml(row?.documentos)}</td>
                </tr>
              `
            )
            .join(
              ''
            )

        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8" />

              <title>
                Inspecciones Preoperacionales
              </title>

              <style>
                @page {
                  size: 13in 8.5in;
                  margin: 14mm 12mm 15mm;
                }
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

                * {
                  box-sizing: border-box;
                }

                body {
                  margin: 0;
                  font-family: Arial, sans-serif;
                  color: #111827;
                  font-size: 8px;
                }

                .header {
                  background: #194567;
                  color: #ffffff;
                  border-bottom: 4px solid #38bdf8;
                  padding: 12px 16px;
                  margin-bottom: 12px;
                  text-align: left;
                }

                .header h1 {
                  margin: 0 0 3px;
                  font-size: 18px;
                  letter-spacing: .5px;
                }

                .header h2 {
                  margin: 0 0 3px;
                  font-size: 12px;
                  font-weight: bold;
                }

                .header p {
                  margin: 0;
                  font-size: 9px;
                  color: #dce6ed;
                }

                table {
                  width: 100%;
                  border-collapse: collapse;
                  table-layout: fixed;
                  border: 1px solid #cbd5e1;
                }

                thead {
                  display: table-header-group;
                }

                tr {
                  break-inside: avoid;
                  page-break-inside: avoid;
                }

                th,
                td {
                  border: 1px solid #d8e2eb;
                  padding: 5px 4px;
                  vertical-align: middle;
                  text-align: center;
                  overflow-wrap: anywhere;
                  word-break: normal;
                }

                th {
                  background: #24638c;
                  color: white;
                  font-weight: bold;
                  font-size: 8px;
                  padding: 7px 4px;
                }

                td {
                  font-size: 7.5px;
                }

                tbody tr:nth-child(even) { background: #f1f6fa; }
                .left { text-align: left; }
                .estado { font-weight: bold; }
                .cerrada { color: #166534; }
                .pendiente { color: #b45309; }
                .analisis { color: #1d4ed8; }
                col.c-id { width: 7%; }
                col.c-fecha { width: 6%; }
                col.c-hora { width: 5%; }
                col.c-placa { width: 5%; }
                col.c-tipo { width: 6%; }
                col.c-marca { width: 8%; }
                col.c-km { width: 4%; }
                col.c-encargado { width: 10%; }
                col.c-rev { width: 10%; }
                col.c-motor { width: 7%; }
                col.c-interior { width: 11%; }
                col.c-equipos { width: 10%; }
                col.c-docs { width: 8%; }
                .no-conforme { color: #b91c1c; font-weight: bold; background: #fff1f2; }
                .conforme { color: #166534; }

                .footer {
                  margin-top: 8px;
                  text-align: right;
                  font-size: 8px;
                }
              </style>
            </head>

            <body>

              <div class="header">
                <h1>
                  INSPECCIONES PREOPERACIONALES
                </h1>

                <h2>
                  ${nombreEmpresa}
                </h2>

                <p>
                  Periodo:
                  ${escaparHtml(reporteAnio)}-${escaparHtml(String(reporteMes).padStart(2, '0'))}
                </p>
              </div>

              <table>
                <colgroup>${['id','fecha','hora','placa','tipo','marca','km','encargado','rev','motor','interior','equipos','docs'].map(k=>`<col class="c-${k}" />`).join('')}</colgroup>
                <thead>
                  <tr>
                    <th>Consecutivo</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Placa</th>
                    <th>Tipo</th>
                    <th>Marca</th>
                    <th>KM</th>
                    <th>Encargado</th>
                    <th>Revisión exterior</th>
                    <th>Motor</th>
                    <th>Interior y funcionamiento</th>
                    <th>Equipos de prevención</th>
                    <th>Documentos</th>
                  </tr>
                </thead>

                <tbody>
                  ${filas}
                </tbody>
              </table>

              <div class="footer">
                DATA CEA · Total registros: ${registros.length}
              </div>

              <script>
                window.onload = function () {
                  window.print()
                }
              </script>

            </body>
          </html>
        `)

        win.document.close()
      } catch (error) {
        console.error(
          'Error generando reporte:',
          error
        )

        mostrarAviso('error', 
          error?.message ||
          'No fue posible generar el reporte.'
        )
      }
    }

  // =======================================================
  // CARGANDO SESIÓN
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
  // ESTADOS DRAWER
  // =======================================================

  const estadoUpper =
    normalizarMayusculas(
      rowSel
        ?.estado_observacion
    )

  const esPendiente =
    estadoUpper ===
    ESTADO_PENDIENTE

  const esCerrada =
    estadoUpper ===
    ESTADO_CERRADA

  const esAnalisis =
    estadoUpper ===
      'EN ANALISIS' ||
    estadoUpper ===
      'EN ANÁLISIS'

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">

      <Toaster
        position="top-center"
        richColors
      />

      <ModalResultado
        abierto={modalResultado.abierto}
        tipo={modalResultado.tipo}
        titulo={modalResultado.titulo}
        mensaje={modalResultado.mensaje}
        onCerrar={() => setModalResultado(prev => ({ ...prev, abierto: false }))}
      />
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-4 md:p-6">

        
        {/* ==================================================
              ENCABEZADO
            ================================================== */}

      <EncabezadoModulo titulo="Consulta de Preoperacionales" subtitulo="Seguimiento de inspecciones preoperacionales y observaciones" icono={ClipboardCheck} rutaRegreso="/admin/consultas" textoRegreso="Seguimiento Operativo y Consultas" />

        {/* =================================================
            FILTROS
        ================================================= */}

        <div className="bg-white border border-slate-300 rounded-xl p-4 mb-4 shadow-sm">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">

            <div className="flex flex-col gap-1">

              <label className="font-medium text-slate-700">
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
                className="p-2 rounded-lg border border-gray-300 text-gray-800 bg-white"
              />

            </div>

            <div className="flex flex-col gap-1">

              <label className="font-medium text-slate-700">
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
                className="p-2 rounded-lg border border-gray-300 text-gray-800 bg-white"
              />

            </div>

            <div className="flex flex-col gap-1">

              <label className="font-medium text-slate-700">
                Tipo Vehículo
              </label>

              <select
                value={
                  filters
                    .tipoVehiculo
                }
                onChange={
                  handleTipoVehiculo
                }
                className="p-2 rounded-lg border border-gray-300 text-gray-800 bg-white"
              >

                <option value="">
                  Todos los tipos
                </option>

                {
                  tiposVehiculo.map(
                    (
                      tipo
                    ) => (
                      <option
                        key={
                          tipo
                        }
                        value={
                          tipo
                        }
                      >
                        {tipo}
                      </option>
                    )
                  )
                }

              </select>

            </div>

            <div className="flex flex-col gap-1">

              <label className="font-medium text-slate-700">
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
                className="p-2 rounded-lg border border-gray-300 text-gray-800 bg-white"
              >

                <option value="">
                  Toda la flota
                </option>

                {
                  placasLista.map(
                    (
                      placa
                    ) => (
                      <option
                        key={
                          placa
                        }
                        value={
                          placa
                        }
                      >
                        {placa}
                      </option>
                    )
                  )
                }

              </select>

            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="estado-preoperacional" className="font-medium text-slate-700">Filtrar por estado</label>
              <select id="estado-preoperacional" value={estadoFiltro} onChange={event => setEstadoFiltro(event.target.value)} className="p-2 rounded-lg border border-gray-300 text-gray-800 bg-white">
                <option value="PENDIENTE">Pendientes</option>
                <option value="EN ANÁLISIS">En análisis</option>
                <option value="CERRADA">Cerradas</option>
                <option value="TODOS">Todas las inspecciones</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 lg:col-span-1">
              <BotonAccion tipo="limpiar" type="button" onClick={handleLimpiar}><Eraser size={15} aria-hidden="true" /> Limpiar</BotonAccion>
            </div>

          </div>

        </div>

        {/* =================================================
            ESTADO
        ================================================= */}

        {
          status && (
            <p
              className={`
                text-center
                text-xs
                mb-3
                ${
                  status.includes(
                    '❌'
                  )
                    ? 'text-red-600'
                    : status.includes(
                        '⚠️'
                      )
                      ? 'text-amber-600'
                      : 'text-blue-700'
                }
              `}
            >
              {status}
            </p>
          )
        }

        {/* =================================================
            TABLA
        ================================================= */}

        <div className="mb-0 rounded-t-xl px-4 py-3 flex items-center gap-2 text-sm font-bold" style={{ backgroundColor: ESTILO_SECCIONES.fondo, color: ESTILO_SECCIONES.texto }}>
          <i className="fas fa-clipboard-check" aria-hidden="true"></i>
          Registros de inspecciones preoperacionales
        </div>
        <div className="overflow-x-auto border border-slate-300 rounded-b-xl shadow-sm">

          <table className="w-full min-w-[1100px] text-[10px] border-collapse [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-300">

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
                  Encargado
                </th>

                <th className="p-2 border">
                  Observaciones
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

              {
                data.length >
                0
                  ? data.map(
                      (
                        row
                      ) => {
                        const tieneSeguimiento =
                          Boolean(
                            row
                              ?.requiere_seguimiento ||
                            normalizarTexto(
                              row
                                ?.observaciones
                            ) ||
                            normalizarTexto(
                              row
                                ?.estado_observacion
                            )
                          )

                        return (
                          <tr
                            key={
                              row.id
                            }
                            className={`
                              transition
                              ${
                                row
                                  ?.tiene_no_conformidad
                                  ? 'bg-red-50 hover:bg-red-100'
                                  : 'odd:bg-white even:bg-gray-50 hover:bg-blue-50'
                              }
                            `}
                          >

                            <td className="p-2 border text-center">
                              {
                                row
                                  ?.consecutivo ||
                                '-'
                              }
                            </td>

                            <td className="p-2 border text-center whitespace-nowrap">
                              {
                                row
                                  ?.fecha_registro ||
                                '-'
                              }
                            </td>

                            <td className="p-2 border text-center">
                              {
                                row
                                  ?.hora_registro ||
                                '-'
                              }
                            </td>

                            <td className="p-2 border text-center font-semibold">
                              {
                                row
                                  ?.placa ||
                                '-'
                              }
                            </td>

                            <td className="p-2 border text-center">
                              {
                                row
                                  ?.tipo_vehiculo ||
                                '-'
                              }
                            </td>

                            <td className="p-2 border text-center">
                              {
                                row
                                  ?.marca ||
                                '-'
                              }
                            </td>

                            <td className="p-2 border text-center">
                              {
                                row
                                  ?.km_registro ??
                                '-'
                              }
                            </td>

                            <td className="p-2 border text-center">
                              {
                                row
                                  ?.usuario_encargado ||
                                '-'
                              }
                            </td>

                            <td
                              className="p-2 border max-w-[250px]"
                              title={
                                row
                                  ?.observaciones ||
                                ''
                              }
                            >
                              <div className="line-clamp-3">
                                {
                                  row
                                    ?.observaciones ||
                                  '-'
                                }
                              </div>
                            </td>

                            <td className="p-2 border text-center">
                              <EstadoChip
                                estado={
                                  row
                                    ?.estado_observacion
                                }
                              />
                            </td>

                            <td className="p-2 border text-center">

                              {
                                tieneSeguimiento
                                  ? (
                                    <button
                                      onClick={() =>
                                        abrirSeguimiento(
                                          row
                                        )
                                      }
                                      className="bg-[#24638C] hover:bg-[#194567] text-white px-2 py-1 rounded-md whitespace-nowrap"
                                    >
                                      <i className="fas fa-search-plus mr-1"></i>

                                      {normalizarMayusculas(row?.estado_observacion) === ESTADO_CERRADA ? 'Ver reporte' : 'Seguimiento'}
                                    </button>
                                  )
                                  : (
                                    <span className="text-gray-400">
                                      —
                                    </span>
                                  )
                              }

                            </td>

                          </tr>
                        )
                      }
                    )
                  : (
                    <tr>
                      <td
                        colSpan={11}
                        className="text-center text-gray-500 p-6"
                      >
                        No hay resultados para los filtros seleccionados.
                      </td>
                    </tr>
                  )
              }

            </tbody>

          </table>

        </div>

        {/* =================================================
            PAGINACIÓN
        ================================================= */}

        {
          total >
            0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs">

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

              <div className="bg-gray-100 border rounded-lg px-4 py-2">

                Página{' '}

                <strong>
                  {page}
                </strong>

                {' '}de{' '}

                <strong>
                  {
                    totalPages
                  }
                </strong>

                <span className="ml-2 text-gray-500">
                  (
                  {
                    total.toLocaleString(
                      'es-CO'
                    )
                  }
                  {' '}registros)
                </span>

              </div>

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
          )
        }

        <div className="mt-6 border border-slate-300 rounded-xl bg-white p-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="min-w-0 xl:max-w-md">
              <h3 className="text-sm font-bold text-[#194567]">Reportes de inspecciones preoperacionales</h3>
              <p className="mt-1 text-xs text-slate-600">Descargue el consolidado mensual en Excel o PDF. Incluye todos los vehículos y estados del período seleccionado, independientemente de los filtros de la tabla.</p>
            </div>
            <div className="flex flex-wrap items-end gap-2 sm:gap-3 xl:justify-end">
              <div className="flex flex-col gap-1">
                <label htmlFor="reporte-anio" className="text-xs font-semibold text-slate-700">Año del reporte</label>
                <select id="reporte-anio" value={reporteAnio} onChange={event => setReporteAnio(event.target.value)} className="h-9 border border-slate-300 rounded-md px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#24638C]">
                  {aniosReporte.map(anio => <option key={anio} value={anio}>{anio}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="reporte-mes" className="text-xs font-semibold text-slate-700">Mes del reporte</label>
                <select id="reporte-mes" value={reporteMes} onChange={event => setReporteMes(event.target.value)} className="h-9 border border-slate-300 rounded-md px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#24638C]">
                  {mesesReporte.map((mes, indice) => <option key={mes} value={String(indice + 1)}>{mes}</option>)}
                </select>
              </div>
              <BotonAccion tipo="excel" type="button" onClick={exportXLSX} className="h-9"><FileSpreadsheet size={15} aria-hidden="true" /> Excel</BotonAccion>
              <BotonAccion tipo="pdf" type="button" onClick={exportPDF} className="h-9"><FileText size={15} aria-hidden="true" /> PDF</BotonAccion>
            </div>
          </div>
        </div>

      </div>

      {/* ===================================================
          DRAWER
      =================================================== */}

      {
        drawerOpen &&
        rowSel && (
          <div className="fixed inset-0 z-50 flex justify-end">

            <div
              className="absolute inset-0 bg-black/50"
              onClick={
                cerrarDrawer
              }
            ></div>

            <aside className="relative h-full w-full sm:w-[680px] lg:w-[740px] bg-slate-50 shadow-2xl overflow-y-auto">

              <div className="sticky top-0 z-20 bg-white shadow-sm border-b border-slate-300">
                <div className="bg-[#194567] text-white px-4 sm:px-5 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-white/80">Expediente preoperacional</p>
                    <h2 className="text-lg font-black mt-1">{rowSel?.consecutivo || `#${rowSel?.id}`}</h2>
                    <p className="text-xs mt-1 text-white/80">Vehículo {rowSel?.placa || '-'}</p>
                    <div className="mt-2"><EstadoChip estado={rowSel?.estado_observacion} /></div>
                  </div>
                  <button type="button" aria-label="Cerrar expediente" onClick={cerrarDrawer} disabled={closing || updating}
                    className="w-9 h-9 rounded-full border border-white/50 flex items-center justify-center hover:bg-white/15 disabled:opacity-40">
                    <i className="fas fa-xmark" aria-hidden="true"></i>
                  </button>
                </div>
                <nav aria-label="Etapas del seguimiento" className="flex items-center gap-2 px-3 sm:px-5 py-2">
                  <button type="button" aria-label="Etapa anterior" disabled={esCerrada || pasoSeguimiento === 1} onClick={() => setPasoSeguimiento(p => Math.max(1, p - 1))} className="p-2 text-[#194567] disabled:text-slate-300"><i className="fas fa-chevron-left"></i></button>
                  <div className="grid grid-cols-3 gap-2 flex-1 min-w-0">
                    {[{n:1,t:'Inspección'},{n:2,t:'Análisis'},{n:3,t:'Cierre'}].map(etapa => (
                      <button key={etapa.n} type="button" aria-current={!esCerrada && pasoSeguimiento === etapa.n ? 'step' : undefined} disabled={esCerrada} onClick={() => setPasoSeguimiento(etapa.n)}
                        className={`flex flex-col items-center gap-1 rounded-md py-1 text-[11px] font-semibold ${esCerrada ? 'text-[#194567] cursor-default' : pasoSeguimiento === etapa.n ? 'text-[#194567]' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold ${(esCerrada || pasoSeguimiento === etapa.n) ? 'bg-[#24638C] border-[#24638C] text-white' : 'bg-white border-slate-300'}`}>{etapa.n}</span>
                        <span>{etapa.t}</span>
                        <span className={`w-full h-1 rounded-full ${(etapa.n === 1 || (etapa.n === 2 && (esAnalisis || esCerrada)) || (etapa.n === 3 && esCerrada)) ? 'bg-[#24638C]' : 'bg-orange-400'}`}></span>
                      </button>
                    ))}
                  </div>
                  <button type="button" aria-label="Etapa siguiente" disabled={esCerrada || pasoSeguimiento === 3} onClick={() => setPasoSeguimiento(p => Math.min(3, p + 1))} className="p-2 text-[#194567] disabled:text-slate-300"><i className="fas fa-chevron-right"></i></button>
                </nav>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                <section className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-[#194567]">Información de la inspección</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {[['Fecha', rowSel?.fecha_registro], ['Hora', rowSel?.hora_registro], ['Placa', rowSel?.placa], ['Tipo', rowSel?.tipo_vehiculo]].map(([etiqueta, valor]) => (
                      <div key={etiqueta}><p className="text-slate-500">{etiqueta}</p><p className="font-semibold break-words">{valor || '-'}</p></div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {[['Marca', rowSel?.marca], ['Kilometraje', rowSel?.km_registro], ['Encargado', rowSel?.usuario_encargado]].map(([etiqueta, valor]) => (
                      <div key={etiqueta}><p className="text-slate-500">{etiqueta}</p><p className="font-semibold break-words">{valor ?? '-'}</p></div>
                    ))}
                  </div>
                  {!esCerrada && (
                  <div className="border-t border-slate-200 pt-3 grid grid-cols-1 sm:grid-cols-[minmax(155px,1fr)_minmax(0,2fr)] gap-3 items-start">
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        ['Revisión exterior', rowSel?.revision_exterior],
                        ['Motor', rowSel?.motor],
                        ['Interior y funcionamiento', rowSel?.interior_funcionamiento],
                        ['Equipos de prevención', rowSel?.equipos_prevencion],
                        ['Documentos', rowSel?.documentos],
                      ].filter(([, valor]) => normalizarMayusculas(valor) === 'NO CONFORME').map(([etiqueta]) => (
                        <div key={etiqueta} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs">
                          <p className="font-semibold text-red-900">{etiqueta}</p>
                          <p className="font-bold text-red-700 mt-1">NO CONFORME</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs h-full">
                      <p className="font-semibold text-amber-900">Observaciones del instructor</p>
                      <p className="whitespace-pre-wrap mt-2 text-slate-700">{rowSel?.observaciones || 'Sin observaciones.'}</p>
                    </div>
                  </div>
                  )}
                </section>

                {esCerrada && (
                  <section className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
                    <h3 className="font-bold text-[#194567]">Trazabilidad del seguimiento</h3>
                    <div className="grid grid-cols-1 gap-3 text-xs">
                      <div className="rounded-lg border-l-4 border-[#24638C] bg-slate-50 p-3">
                        <p className="font-bold text-[#194567]">1. Inspección reportada</p>
                        <p className="mt-1">Fecha: {rowSel?.fecha_registro || '-'} · Hora: {rowSel?.hora_registro || '-'}</p>
                        <p>Responsable: {rowSel?.usuario_encargado || '-'}</p>
                        <p className="mt-1 whitespace-pre-wrap">{rowSel?.observaciones || 'Sin observaciones registradas.'}</p>
                      </div>
                      <div className="rounded-lg border-l-4 border-[#24638C] bg-slate-50 p-3">
                        <p className="font-bold text-[#194567]">2. Verificación y análisis</p>
                        <p className="mt-1">Fecha: {rowSel?.fecha_verificacion_observacion || '-'}</p>
                        <p>Responsable: {rowSel?.usuario_verificacion || '-'}</p>
                        <p className="mt-1 whitespace-pre-wrap">{rowSel?.observacion_analisis || 'No consta una observación de análisis en este registro.'}</p>
                      </div>
                      <div className="rounded-lg border-l-4 border-[#24638C] bg-slate-50 p-3">
                        <p className="font-bold text-[#194567]">3. Solución y cierre</p>
                        <p className="mt-1">Fecha: {rowSel?.fecha_solucion_observacion || '-'}</p>
                        <p>Responsable: {rowSel?.usuario_solucion || '-'}</p>
                        <p className="mt-1 whitespace-pre-wrap">{rowSel?.observacion_solucion || 'Sin descripción de solución registrada.'}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">Reporte cerrado. La información es de solo lectura.</p>
                  </section>
                )}

                {!esCerrada && pasoSeguimiento === 1 && (
                  <section className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
                    <h3 className="font-bold text-[#194567]">Paso 1 · Inspección registrada</h3>
                    <p className="text-xs text-slate-600">Revise las novedades reportadas por el instructor. La información original es de solo lectura.</p>
                    {esPendiente && <button type="button" onClick={() => setPasoSeguimiento(2)} className="rounded-lg bg-[#24638C] hover:bg-[#194567] text-white px-4 py-2 text-xs font-bold">Continuar al análisis</button>}
                  </section>
                )}

                {!esCerrada && pasoSeguimiento === 2 && (
                  <section className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
                    <h3 className="font-bold text-[#194567]">Paso 2 · Análisis y actuación prevista</h3>
                    {esPendiente ? (
                      <>
                        <label htmlFor="observacion-analisis-preoperacional" className="block text-xs font-semibold text-slate-700">Verificación y acciones previstas <span className="text-red-600">*</span></label>
                        <textarea ref={campoAnalisisRef} autoFocus id="observacion-analisis-preoperacional" rows={4}
                          value={obsAnalisis} onChange={event => setObsAnalisis(event.target.value)}
                          disabled={updating || closing}
                          placeholder="Ejemplo: Se verifica desgaste en la llanta delantera. Se programa el reemplazo y la revisión de presión antes de habilitar el vehículo."
                          className="w-full rounded-lg border-2 border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200 outline-none p-3 text-sm disabled:bg-slate-100" />
                        <p className="text-xs text-slate-600">Describa qué se verificó en el vehículo, la causa o condición encontrada y qué intervención se realizará. No registre aquí una reparación que aún no se haya ejecutado.</p>
                        <button type="button" disabled={!normalizarTexto(obsAnalisis) || updating || closing} onClick={marcarEnAnalisis}
                          className="rounded-lg bg-[#24638C] hover:bg-[#194567] text-white px-4 py-2 text-xs font-bold disabled:opacity-40">
                          {updating ? 'Guardando...' : 'Guardar análisis'}
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold text-[#194567]">Verificación y acciones previstas:</p>
                        <p className="whitespace-pre-wrap text-slate-800">{rowSel?.observacion_analisis || 'No hay observación de análisis registrada.'}</p>
                        <p className="text-xs text-slate-600">Registrado el {rowSel?.fecha_verificacion_observacion || '-'} por {rowSel?.usuario_verificacion || '-'}</p>
                        <p className="text-xs text-slate-500">El análisis guardado es de solo lectura.</p>
                      </div>
                    )}
                  </section>
                )}

                {!esCerrada && pasoSeguimiento === 3 && (
                  <section className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
                    <h3 className="font-bold text-[#194567]">Paso 3 · Solución y cierre</h3>
                    <p className="text-xs text-slate-600">Describa las reparaciones o acciones correctivas efectivamente realizadas, indicando cómo se atendió cada novedad y cómo se verificó su solución.</p>
                    {rowSel?.observacion_analisis && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs"><p className="font-semibold text-[#194567]">Análisis registrado</p><p className="whitespace-pre-wrap mt-1">{rowSel.observacion_analisis}</p></div>}
                    <label htmlFor="observacion-cierre-preoperacional" className="block text-xs font-semibold text-slate-700">Descripción de la solución <span className="text-red-600">*</span></label>
                    <textarea id="observacion-cierre-preoperacional" rows={4} value={obsCierre} onChange={event => setObsCierre(event.target.value)}
                      disabled={!esAnalisis || closing || updating}
                      placeholder="Ejemplo: Se reemplazó la llanta delantera, se ajustó la presión y se comprobó su estado antes de poner el vehículo en servicio."
                      className="w-full rounded-lg border border-slate-300 p-3 text-sm disabled:bg-slate-100" />
                    {rowSel?.fecha_solucion_observacion && <p className="text-xs text-slate-600">Cerrado el {rowSel.fecha_solucion_observacion} por {rowSel?.usuario_solucion || '-'}</p>}
                    {esAnalisis && <button type="button" disabled={!normalizarTexto(obsCierre) || closing || updating} onClick={cerrarObservacion}
                      className="rounded-lg bg-green-700 hover:bg-green-800 text-white px-4 py-2 text-xs font-bold disabled:opacity-40">
                      {closing ? 'Guardando...' : 'Guardar solución y cerrar'}
                    </button>}
                    {esPendiente && <p className="text-xs text-amber-700">Primero debe guardar la observación del análisis.</p>}
                    {esCerrada && <p className="text-xs text-green-800 font-semibold">Expediente cerrado. La solución es de solo lectura.</p>}
                  </section>
                )}
                <div className="flex justify-end"><button type="button" onClick={cerrarDrawer} disabled={closing || updating}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40">Cerrar panel</button></div>
              </div>
            </aside>

          </div>
        )
      }

    </div>
  )
}