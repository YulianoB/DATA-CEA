'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Toaster, toast } from 'sonner'

// Helpers zona Bogotá
const fmtBogota = (date, mode) => {
  const optFecha = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }
  const optHora  = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Bogota' }
  return new Intl.DateTimeFormat('en-CA', mode === 'fecha' ? optFecha : optHora).format(date) // YYYY-MM-DD / HH:mm:ss
}
const hoyBogota = () => fmtBogota(new Date(), 'fecha')

// Chip por estado
const EstadoChip = ({ estado }) => {
  const e = String(estado || '').toUpperCase()
  const color =
    e === 'CERRADA' ? 'bg-green-100 text-green-700 border-green-300' :
    e.includes('ANÁLISIS') ? 'bg-blue-100 text-blue-700 border-blue-300' :
    e === 'PENDIENTE' ? 'bg-amber-100 text-amber-700 border-amber-300' :
    'bg-gray-100 text-gray-700 border-gray-300'
  return <span className={`px-2 py-[2px] rounded border text-[11px] font-semibold ${color}`}>{estado || '-'}</span>
}

export default function PreoperacionalesPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // filtros
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    tipoVehiculo: '',
    placa: '',
    conObservaciones: false,
  })

  // catálogo de vehículos activos
  const [vehiculos, setVehiculos] = useState([]) // {placa, tipo_vehiculo, marca}
  const tiposVehiculo = useMemo(() => {
    const set = new Set(vehiculos.map(v => v.tipo_vehiculo).filter(Boolean))
    return Array.from(set).sort((a,b)=> String(a).localeCompare(String(b)))
  }, [vehiculos])
  const placasLista = useMemo(() => {
    return vehiculos
      .filter(v => filters.tipoVehiculo ? v.tipo_vehiculo === filters.tipoVehiculo : true)
      .map(v => v.placa)
      .sort((a,b)=> String(a).localeCompare(String(b)))
  }, [vehiculos, filters.tipoVehiculo])

  // tabla + paginación
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50
  const [total, setTotal] = useState(0)

  // drawer seguimiento
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rowSel, setRowSel] = useState(null)
  const [obsCierre, setObsCierre] = useState('')
  const [closing, setClosing] = useState(false) // ← anti doble-click

  // cargar usuario + catálogo de vehículos activos
  useEffect(() => {
    const stored = localStorage.getItem('currentUser')
    if (!stored) { router.push('/login'); return }
    const u = JSON.parse(stored)
    setUser(u)

    const cargarVehiculos = async () => {
      const { data: vs, error } = await supabase
        .from('vehiculos')
        .select('placa, tipo_vehiculo, marca, estado')
        .eq('estado', 'Activo')
        .order('placa', { ascending: true })
      if (error) {
        console.error('Error cargando vehículos:', error)
        toast.error('No se pudieron cargar las placas activas.')
        return
      }
      setVehiculos(vs || [])
    }
    cargarVehiculos()
  }, [router])

  // handlers filtros
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const validarRango = () => {
    const { startDate, endDate } = filters
    if (!startDate || !endDate) {
      toast.warning('Debes seleccionar Fecha Inicio y Fecha Fin.')
      setStatus('⚠️ Debe seleccionar ambas fechas.')
      return false
    }
    if (startDate > hoy || endDate > hoy) {
      toast.warning('No puede seleccionar fechas futuras')
      setStatus('⚠️ No se permiten fechas futuras.')
      return false
    }
     return true
  }

  const handleConsultar = async (goToPage = 1) => {
    if (!validarRango()) return

    setLoading(true)
    setStatus('Consultando datos...')
    setPage(goToPage)

    try {
      let query = supabase
        .from('preoperacionales')
        .select(`
          id,
          consecutivo,
          fecha_registro,
          hora_registro,
          placa,
          tipo_vehiculo,
          marca,
          km_registro,
          usuario_encargado,
          observaciones,
          estado_observacion,
          fecha_verificacion_observacion,
          usuario_verificacion,
          fecha_solucion_observacion,
          usuario_solucion,
          observacion_solucion,
          revision_exterior,
          motor,
          interior_funcionamiento,
          equipos_prevencion,
          documentos
        `, { count: 'exact' })
        .gte('fecha_registro', filters.startDate)
        .lte('fecha_registro', filters.endDate)

      if (filters.tipoVehiculo) query = query.eq('tipo_vehiculo', filters.tipoVehiculo)
      if (filters.placa)        query = query.eq('placa', filters.placa)
      if (filters.conObservaciones) query = query.in('estado_observacion', ['PENDIENTE', 'EN ANÁLISIS'])

      query = query
        .order('fecha_registro', { ascending: false })
        .order('hora_registro', { ascending: false })

      const from = (goToPage - 1) * pageSize
      const to   = from + pageSize - 1
      query = query.range(from, to)

      const { data: rows, error, count } = await query
      if (error) {
        console.error('Error consultando preoperacionales:', error)
        toast.error('❌ Error al consultar inspecciones.')
        setStatus('❌ Error al consultar inspecciones.')
        return
      }

      setData(rows || [])
      setTotal(count || 0)
      setStatus(`Consulta completada. ${count || 0} registros encontrados.`)
    } catch (err) {
      console.error(err)
      toast.error('❌ Error al consultar inspecciones.')
      setStatus('❌ Error al consultar inspecciones.')
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFilters({
      startDate: '',
      endDate: '',
      tipoVehiculo: '',
      placa: '',
      conObservaciones: false,
    })
    setData([])
    setTotal(0)
    setPage(1)
    setStatus('')
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / pageSize)), [total])

  // abrir/cerrar drawer
  const abrirSeguimiento = (row) => {
    setRowSel(row)
    setObsCierre(row?.observacion_solucion || '')
    setClosing(false)
    setDrawerOpen(true)
  }
  const cerrarDrawer = () => {
    setDrawerOpen(false)
    setRowSel(null)
    setObsCierre('')
    setClosing(false)
  }

  // acciones de seguimiento
  const marcarEnAnalisis = async () => {
    if (!rowSel || !user) return
    const estadoUpper = String(rowSel.estado_observacion || '').toUpperCase()
    if (estadoUpper === 'CERRADA') { toast.info('El registro ya está CERRADO.'); return }
    if (estadoUpper.includes('ANÁLISIS')) { toast.info('Ya está EN ANÁLISIS.'); return }
    const hoy = hoyBogota()
    const { error } = await supabase
      .from('preoperacionales')
      .update({
        estado_observacion: 'EN ANÁLISIS',
        fecha_verificacion_observacion: hoy,
        usuario_verificacion: user?.nombreCompleto || user?.usuario || '',
      })
      .eq('id', rowSel.id)
    if (error) { console.error(error); toast.error('No se pudo marcar EN ANÁLISIS.'); return }
    toast.success('Marcado EN ANÁLISIS.')
    const updated = { ...rowSel,
      estado_observacion: 'EN ANÁLISIS',
      fecha_verificacion_observacion: hoy,
      usuario_verificacion: user?.nombreCompleto || user?.usuario || '',
    }
    setRowSel(updated)
    setData(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  const cerrarObservacion = async () => {
    if (!rowSel || !user || closing) return
    if (!obsCierre.trim()) { toast.warning('Debes ingresar la observación de cierre.'); return }

    setClosing(true) // ← anti doble-click
    try {
      const estadoUpper = String(rowSel.estado_observacion || '').toUpperCase()
      if (estadoUpper === 'CERRADA') { toast.info('El registro ya está CERRADO.'); return }

      const hoy = hoyBogota()
      const { error } = await supabase
        .from('preoperacionales')
        .update({
          estado_observacion: 'CERRADA',
          fecha_solucion_observacion: hoy,
          usuario_solucion: user?.nombreCompleto || user?.usuario || '',
          observacion_solucion: obsCierre.trim(),
        })
        .eq('id', rowSel.id)
      if (error) { console.error(error); toast.error('No se pudo CERRAR la observación.'); return }

      toast.success('Observación CERRADA.')
      const updated = { ...rowSel,
        estado_observacion: 'CERRADA',
        fecha_solucion_observacion: hoy,
        usuario_solucion: user?.nombreCompleto || user?.usuario || '',
        observacion_solucion: obsCierre.trim(),
      }
      setRowSel(updated)
      setData(prev => prev.map(r => r.id === updated.id ? updated : r))
    } finally {
      setClosing(false)
    }
  }

  // ------- Export XLSX con formato -------
  const exportXLSX = async () => {
    if (!data || data.length === 0) return
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import('exceljs'),
      import('file-saver')
    ])

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Preoperacionales')

    // Encabezados
    const headers = [
      'Consecutivo','Fecha','Hora','Placa','Marca','KM','Encargado',
      'Observaciones','Estado','F_Verificación','U_Verifica','F_Solución','U_Soluciona','Obs_Solución'
    ]
    ws.addRow(headers)

    // Estilo encabezado
    const headerRow = ws.getRow(1)
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } } // #1f2937
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      }
    })
    headerRow.height = 22

    // Filas de datos
    const rows = data.map(r => [
      r.consecutivo || '',
      r.fecha_registro || '',
      r.hora_registro || '',
      r.placa || '',
      r.marca || '',
      r.km_registro ?? '',
      r.usuario_encargado || '',
      (r.observaciones || '').replace(/\r?\n/g, ' '),
      r.estado_observacion || '',
      r.fecha_verificacion_observacion || '',
      r.usuario_verificacion || '',
      r.fecha_solucion_observacion || '',
      r.usuario_solucion || '',
      (r.observacion_solucion || '').replace(/\r?\n/g, ' '),
    ])
    rows.forEach((arr) => {
      const row = ws.addRow(arr)
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: colNumber >= 8 ? 'left' : 'center', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        }
      })
    })

    // Ajuste de ancho de columnas (auto-fit aproximado)
    const colMax = headers.length
    for (let i = 1; i <= colMax; i++) {
      let maxLen = headers[i - 1].length
      ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const val = row.getCell(i).value
        const str = val == null ? '' : String(val)
        maxLen = Math.max(maxLen, Math.min(str.length, 120))
      })
      // margen + limite
      ws.getColumn(i).width = Math.min(Math.max(maxLen + 2, 10), 60)
    }

    // Congelar fila de encabezado
    ws.views = [{ state: 'frozen', ySplit: 1 }]

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `preoperacionales_${filters.startDate || 'inicio'}_${filters.endDate || 'fin'}.xlsx`)
  }

  // ------- Export PDF (impresión) -------
  const exportPDF = () => {
    if (!data || data.length === 0) return
    const win = window.open('', '_blank')
    if (!win) { toast.warning('Permite las ventanas emergentes para exportar a PDF.'); return }

    const style = `
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; }
        h3 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #444; padding: 4px; text-align: center; }
        th { background: #1f2937; color: #fff; }
        tr:nth-child(even) { background: #f3f4f6; }
      </style>
    `
    const headers = `
      <tr>
        <th>Consecutivo</th><th>Fecha</th><th>Hora</th><th>Placa</th><th>Marca</th><th>KM</th>
        <th>Encargado</th><th>Observaciones</th><th>Estado</th><th>F. Verif.</th><th>U. Verifica</th>
        <th>F. Solución</th><th>U. Soluciona</th><th>Obs. Solución</th>
      </tr>
    `
    const rows = data.map(r => `
      <tr>
        <td>${r.consecutivo || ''}</td>
        <td>${r.fecha_registro || ''}</td>
        <td>${r.hora_registro || ''}</td>
        <td>${r.placa || ''}</td>
        <td>${r.marca || ''}</td>
        <td>${r.km_registro ?? ''}</td>
        <td>${r.usuario_encargado || ''}</td>
        <td>${(r.observaciones || '').replace(/\r?\n/g, ' ')}</td>
        <td>${r.estado_observacion || ''}</td>
        <td>${r.fecha_verificacion_observacion || ''}</td>
        <td>${r.usuario_verificacion || ''}</td>
        <td>${r.fecha_solucion_observacion || ''}</td>
        <td>${r.usuario_solucion || ''}</td>
        <td>${(r.observacion_solucion || '').replace(/\r?\n/g, ' ')}</td>
      </tr>
    `).join('')

    win.document.write(`
      <html><head><title>Preoperacionales</title>${style}</head>
      <body>
        <h3>Inspecciones Preoperacionales (${filters.startDate} a ${filters.endDate})</h3>
        <table>${headers}${rows}</table>
        <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `)
    win.document.close()
  }

  if (!user) return <p className="text-center mt-20">Cargando...</p>

  // Booleans derivados para el drawer
  const estadoUpper = String(rowSel?.estado_observacion || '').toUpperCase()
  const esPendiente = estadoUpper === 'PENDIENTE'
  const esCerrada = estadoUpper === 'CERRADA'
  const esAnalisis = estadoUpper.includes('ANÁLISIS')

  return (
    <div className="p-4">
      <Toaster position="top-center" richColors />
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4">
        {/* Título */}
        <h2 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2 text-[var(--primary)] border-b pb-2">
          <i className="fas fa-clipboard-check text-[var(--primary)]"></i>
          Consultar Inspecciones Preoperacionales
        </h2>

        {/* Filtros */}
        <div className="bg-[var(--primary-dark)] text-white rounded-lg p-2 mb-2">
          <h3 className="text-xs font-bold mb-1">Filtros de Búsqueda</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
            <div className="flex flex-col">
              <label className="mb-1">Fecha Inicio</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1">Fecha Fin</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1">Tipo Vehículo</label>
              <select
                name="tipoVehiculo"
                value={filters.tipoVehiculo}
                onChange={(e)=>{ handleChange(e); setFilters(prev=>({...prev, placa:''})) }}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              >
                <option value="">Todos los Tipos</option>
                {tiposVehiculo.map(tv => (
                  <option key={tv} value={tv}>{tv}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1">Placa</label>
              <select
                name="placa"
                value={filters.placa}
                onChange={handleChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              >
                <option value="">Toda la Flota</option>
                {placasLista.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="conObservaciones"
                checked={filters.conObservaciones}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <label>Con Observaciones</label>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-wrap justify-center gap-2 mb-2 text-xs">
          <button
            onClick={()=>handleConsultar(1)}
            disabled={loading}
            className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-2 py-1 rounded flex items-center gap-1 disabled:opacity-60"
          >
            <i className="fas fa-search"></i> {loading ? 'Consultando...' : 'Consultar'}
          </button>
          <button
            onClick={handleLimpiar}
            className="bg-gray-500 hover:bg-gray-700 text-white px-2 py-1 rounded flex items-center gap-1"
          >
            <i className="fas fa-eraser"></i> Limpiar
          </button>
          <button
            onClick={exportXLSX}
            disabled={data.length === 0}
            className="bg-green-600 hover:bg-green-800 text-white px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"
            title={data.length ? 'Exportar a Excel (.xlsx)' : 'Sin datos'}
          >
            <i className="fas fa-file-excel"></i> Excel
          </button>
          <button
            onClick={exportPDF}
            disabled={data.length === 0}
            className="bg-red-600 hover:bg-red-800 text-white px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"
            title={data.length ? 'Exportar a PDF' : 'Sin datos'}
          >
            <i className="fas fa-file-pdf"></i> PDF
          </button>
        </div>

        {/* Área de mensajes */}
        <p
          className={`text-center text-xs mb-2 ${
            status.includes('❌') ? 'text-red-600' : status.includes('⚠️') ? 'text-yellow-600' : 'text-blue-700'
          }`}
        >
          {status}
        </p>

        {/* Tabla */}
        <div className="overflow-x-auto border rounded-lg shadow">
          <table className="w-full text-[11px] border-collapse rounded-lg overflow-hidden">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-1 border text-center">Consecutivo</th>
                <th className="p-1 border text-center">Fecha</th>
                <th className="p-1 border text-center">Hora</th>
                <th className="p-1 border text-center">Placa</th>
                <th className="p-1 border text-center">Marca</th>
                <th className="p-1 border text-center">KM</th>
                <th className="p-1 border text-center">Encargado</th>
                <th className="p-1 border text-center">Observaciones</th>
                <th className="p-1 border text-center">Estado</th>
                <th className="p-1 border text-center">F. Verificación</th>
                <th className="p-1 border text-center">U. Verifica</th>
                <th className="p-1 border text-center">F. Solución</th>
                <th className="p-1 border text-center">U. Soluciona</th>
                <th className="p-1 border text-center">Obs. Solución</th>
                <th className="p-1 border text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((row) => {
                  const tieneObs = !!(row.observaciones && String(row.observaciones).trim().length > 0)
                  return (
                    <tr key={row.id} className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition">
                      <td className="p-1 border text-center">{row.consecutivo || '-'}</td>
                      <td className="p-1 border text-center">{row.fecha_registro || '-'}</td>
                      <td className="p-1 border text-center">{row.hora_registro || '-'}</td>
                      <td className="p-1 border text-center">{row.placa || '-'}</td>
                      <td className="p-1 border text-center">{row.marca || '-'}</td>
                      <td className="p-1 border text-center">{row.km_registro ?? '-'}</td>
                      <td className="p-1 border text-center">{row.usuario_encargado || '-'}</td>
                      <td className="p-1 border text-center truncate max-w-[220px]" title={row.observaciones || ''}>
                        {row.observaciones || '-'}
                      </td>
                      <td className="p-1 border text-center"><EstadoChip estado={row.estado_observacion} /></td>
                      <td className="p-1 border text-center">{row.fecha_verificacion_observacion || '-'}</td>
                      <td className="p-1 border text-center">{row.usuario_verificacion || '-'}</td>
                      <td className="p-1 border text-center">{row.fecha_solucion_observacion || '-'}</td>
                      <td className="p-1 border text-center">{row.usuario_solucion || '-'}</td>
                      <td className="p-1 border text-center truncate max-w-[220px]" title={row.observacion_solucion || ''}>
                        {row.observacion_solucion || '-'}
                      </td>
                      <td className="p-1 border text-center">
                        {tieneObs ? (
                          <button
                            onClick={()=> abrirSeguimiento(row)}
                            className="px-2 py-1 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded"
                          >
                            Seguimiento
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="15" className="text-center text-gray-500 p-2">
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {total > 0 && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs">
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={()=> handleConsultar(Math.max(1, page - 1))}
              disabled={loading || page <= 1}
            >
              ‹ Anterior
            </button>
            <span>Página {page} de {totalPages}</span>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={()=> handleConsultar(Math.min(totalPages, page + 1))}
              disabled={loading || page >= totalPages}
            >
              Siguiente ›
            </button>
          </div>
        )}
      </div>

      {/* Drawer seguimiento */}
      {drawerOpen && rowSel && (
        <div className="fixed inset-0 z-50">
          {/* overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={cerrarDrawer}></div>

          {/* panel */}
          <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-lg font-bold text-[var(--primary)] flex items-center gap-2">
                <i className="fas fa-tools"></i> Seguimiento de Inspección
              </h3>
              <button className="text-gray-600 hover:text-black" onClick={cerrarDrawer}>
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Estado actual */}
            <div className="mb-3 text-sm">
              Estado actual: <EstadoChip estado={rowSel.estado_observacion} />
            </div>

            {/* Detalle */}
            <div className="border rounded mb-4">
              <div className="bg-gray-900 text-white px-3 py-1 rounded-t text-sm font-semibold">
                Detalle
              </div>
              <div className="p-3 text-xs grid grid-cols-2 gap-2">
                <div><b>Consecutivo:</b> {rowSel.consecutivo || '-'}</div>
                <div><b>Fecha:</b> {rowSel.fecha_registro || '-'}</div>
                <div><b>Hora:</b> {rowSel.hora_registro || '-'}</div>
                <div><b>Placa:</b> {rowSel.placa || '-'}</div>
                <div><b>Tipo:</b> {rowSel.tipo_vehiculo || '-'}</div>
                <div><b>Marca:</b> {rowSel.marca || '-'}</div>
                <div><b>KM:</b> {rowSel.km_registro ?? '-'}</div>
                <div className="col-span-2"><b>Encargado:</b> {rowSel.usuario_encargado || '-'}</div>
                <div className="col-span-2"><b>Observaciones:</b> {rowSel.observaciones || '-'}</div>
                <div className="col-span-2 grid grid-cols-2 gap-2 mt-2">
                  <div><b>Exterior:</b> {rowSel.revision_exterior || '-'}</div>
                  <div><b>Motor:</b> {rowSel.motor || '-'}</div>
                  <div><b>Interior:</b> {rowSel.interior_funcionamiento || '-'}</div>
                  <div><b>Prevención:</b> {rowSel.equipos_prevencion || '-'}</div>
                  <div><b>Documentos:</b> {rowSel.documentos || '-'}</div>
                </div>
              </div>
            </div>

            {/* Seguimiento (acciones) */}
            <div className="border rounded">
              <div className="bg-gray-900 text-white px-3 py-1 rounded-t text-sm font-semibold">
                Acciones de Seguimiento
              </div>
              <div className="p-3 space-y-3 text-sm">
                {/* EN ANÁLISIS */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={marcarEnAnalisis}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-800 text-white rounded disabled:opacity-50"
                    disabled={esCerrada || esAnalisis}
                  >
                    Marcar EN ANÁLISIS
                  </button>
                  <div className="text-xs text-gray-600">
                    Fecha verificación: {rowSel.fecha_verificacion_observacion || '-'} · {rowSel.usuario_verificacion || '-'}
                  </div>
                </div>

                {/* CERRAR */}
                <div className="border-t pt-3">
                  <label className="block mb-1 font-semibold text-xs">Observación de Cierre</label>
                  <textarea
                    className="w-full border rounded p-2 text-xs"
                    rows={3}
                    value={obsCierre}
                    onChange={(e)=> setObsCierre(e.target.value)}
                    placeholder={esPendiente ? 'Habilítalo marcando EN ANÁLISIS' : 'Describe la solución aplicada (obligatorio para cerrar)'}
                    disabled={esPendiente || esCerrada}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={cerrarObservacion}
                      className="px-3 py-1 bg-green-600 hover:bg-green-800 text-white rounded disabled:opacity-50"
                      disabled={esPendiente || esCerrada || !obsCierre.trim() || closing}
                      title={closing ? 'Guardando...' : 'Cerrar Observación'}
                    >
                      {closing ? 'Guardando...' : 'Cerrar Observación'}
                    </button>
                    <div className="text-xs text-gray-600">
                      Fecha solución: {rowSel.fecha_solucion_observacion || '-'} · {rowSel.usuario_solucion || '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cerrar */}
            <div className="flex justify-end mt-4">
              <button className="px-3 py-2 bg-gray-600 hover:bg-gray-800 text-white rounded" onClick={cerrarDrawer}>
                Cerrar panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

