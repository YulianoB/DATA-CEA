'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Toaster, toast } from 'sonner'

// Helpers fecha/hora Bogotá
const fmtBogota = (date, mode) => {
  const optFecha = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }
  const optHora  = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Bogota' }
  return new Intl.DateTimeFormat('en-CA', mode === 'fecha' ? optFecha : optHora).format(date) // YYYY-MM-DD / HH:mm:ss
}
const hoyBogota = () => fmtBogota(new Date(), 'fecha')

// Chip visual por estado
const EstadoChip = ({ estado }) => {
  const e = String(estado || '').toUpperCase()
  const color =
    e === 'CERRADA' ? 'bg-green-100 text-green-700 border-green-300' :
    e.includes('ANÁLISIS') ? 'bg-blue-100 text-blue-700 border-blue-300' :
    e === 'PENDIENTE' ? 'bg-amber-100 text-amber-700 border-amber-300' :
    'bg-gray-100 text-gray-700 border-gray-300'
  return <span className={`px-2 py-[2px] rounded border text-[11px] font-semibold ${color}`}>{estado || '-'}</span>
}

export default function FallasPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Filtros
  const [filters, setFilters] = useState({ startDate: '', endDate: '' })

  // Datos/Paginación
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50
  const [total, setTotal] = useState(0)

  // Drawer seguimiento
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rowSel, setRowSel] = useState(null)
  const [obsCierre, setObsCierre] = useState('')
  const [closing, setClosing] = useState(false) // anti doble-click

  // Cargar usuario
  useEffect(() => {
    const stored = localStorage.getItem('currentUser')
    if (!stored) { router.push('/login'); return }
    setUser(JSON.parse(stored))
  }, [router])

  // Filtros handlers
  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }
  const validarRango = () => {
    const { startDate, endDate } = filters
    if (!startDate || !endDate) { toast.warning('Debes seleccionar ambas fechas.'); setStatus('⚠️ Debe seleccionar ambas fechas.'); return false }
    if (endDate < startDate) { toast.warning('La fecha fin no puede ser menor que la fecha inicio.'); setStatus('⚠️ Rango de fechas inválido.'); return false }
    return true
  }

  // Consultar
  const handleConsultar = async (goToPage = 1) => {
    if (!validarRango()) return
    setLoading(true); setStatus('Consultando datos...'); setPage(goToPage)

    try {
      let query = supabase
        .from('reporte_fallas')
        .select(`
          id,
          consecutivo,
          fecha,
          hora,
          placa,
          tipo_vehiculo,
          marca,
          kilometraje,
          nombre_encargado,
          descripcion_falla,
          acciones_tomadas,
          estado,
          observaciones_seguimiento,
          fecha_verificacion,
          fecha_solucion,
          usuario_soluciona
        `, { count: 'exact' })
        .gte('fecha', filters.startDate)
        .lte('fecha', filters.endDate)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      const from = (goToPage - 1) * pageSize
      const to   = from + pageSize - 1
      query = query.range(from, to)

      const { data: rows, error, count } = await query
      if (error) {
        console.error('Error consultando fallas:', error)
        toast.error('❌ Error al consultar fallas.')
        setStatus('❌ Error al consultar fallas.')
        return
      }
      setData(rows || [])
      setTotal(count || 0)
      setStatus(`Consulta completada. ${count || 0} registros encontrados.`)
    } catch (err) {
      console.error(err)
      toast.error('❌ Error al consultar fallas.')
      setStatus('❌ Error al consultar fallas.')
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFilters({ startDate: '', endDate: '' })
    setData([]); setTotal(0); setPage(1); setStatus('')
  }

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / pageSize)),
    [total, pageSize]
  )

  // Drawer control
  const abrirSeguimiento = (row) => {
    setRowSel(row)
    setObsCierre(row?.observaciones_seguimiento || '')
    setClosing(false)
    setDrawerOpen(true)
  }
  const cerrarDrawer = () => {
    setDrawerOpen(false)
    setRowSel(null)
    setObsCierre('')
    setClosing(false)
  }

  // Acciones
  const marcarEnAnalisis = async () => {
    if (!rowSel) return
    const estadoUpper = String(rowSel.estado || '').toUpperCase()
    if (estadoUpper === 'CERRADA') { toast.info('La falla ya está CERRADA.'); return }
    if (estadoUpper.includes('ANÁLISIS')) { toast.info('Ya está EN ANÁLISIS.'); return }

    const hoy = hoyBogota()
    const { error } = await supabase
      .from('reporte_fallas')
      .update({ estado: 'EN ANÁLISIS', fecha_verificacion: hoy })
      .eq('id', rowSel.id)
    if (error) { console.error(error); toast.error('No se pudo marcar EN ANÁLISIS.'); return }

    toast.success('Marcado EN ANÁLISIS.')
    const updated = { ...rowSel, estado: 'EN ANÁLISIS', fecha_verificacion: hoy }
    setRowSel(updated)
    setData(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  const cerrarFalla = async () => {
    if (!rowSel || closing) return
    if (!obsCierre.trim()) { toast.warning('Debes ingresar la observación de cierre.'); return }
    setClosing(true)
    try {
      const estadoUpper = String(rowSel.estado || '').toUpperCase()
      if (estadoUpper === 'CERRADA') { toast.info('La falla ya está CERRADA.'); return }

      const hoy = hoyBogota()
      const { error } = await supabase
        .from('reporte_fallas')
        .update({
          estado: 'CERRADA',
          fecha_solucion: hoy,
          usuario_soluciona: user?.nombreCompleto || user?.usuario || '',
          observaciones_seguimiento: obsCierre.trim()
        })
        .eq('id', rowSel.id)

      if (error) { console.error(error); toast.error('No se pudo CERRAR la falla.'); return }

      toast.success('Falla CERRADA.')
      const updated = {
        ...rowSel,
        estado: 'CERRADA',
        fecha_solucion: hoy,
        usuario_soluciona: user?.nombreCompleto || user?.usuario || '',
        observaciones_seguimiento: obsCierre.trim()
      }
      setRowSel(updated)
      setData(prev => prev.map(r => r.id === updated.id ? updated : r))
    } finally {
      setClosing(false)
    }
  }

  // Export XLSX con formato
  const exportXLSX = async () => {
    if (!data || data.length === 0) return
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import('exceljs'),
      import('file-saver')
    ])

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Fallas')

    const headers = [
      'Consecutivo','Fecha','Hora','Placa','Tipo','Marca','KM','Encargado',
      'Descripción','Acciones','Estado','Obs. Seguimiento','F. Verificación','F. Solución','U. Soluciona'
    ]
    ws.addRow(headers)
    const headerRow = ws.getRow(1)
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } } // azul oscuro
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

    const rows = data.map(r => [
      r.consecutivo || '',
      r.fecha || '',
      r.hora || '',
      r.placa || '',
      r.tipo_vehiculo || '',
      r.marca || '',
      r.kilometraje ?? '',
      r.nombre_encargado || '',
      (r.descripcion_falla || '').replace(/\r?\n/g, ' '),
      (r.acciones_tomadas || '').replace(/\r?\n/g, ' '),
      r.estado || '',
      (r.observaciones_seguimiento || '').replace(/\r?\n/g, ' '),
      r.fecha_verificacion || '',
      r.fecha_solucion || '',
      r.usuario_soluciona || '',
    ])
    rows.forEach(arr => {
      const row = ws.addRow(arr)
      row.eachCell((cell, col) => {
        cell.alignment = { vertical: 'middle', horizontal: col <= 8 ? 'center' : 'left', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        }
      })
    })

    // auto ancho
    for (let i = 1; i <= headers.length; i++) {
      let max = headers[i - 1].length
      ws.eachRow({ includeEmpty: false }, row => {
        const v = row.getCell(i).value
        const s = v == null ? '' : String(v)
        max = Math.max(max, Math.min(s.length, 120))
      })
      ws.getColumn(i).width = Math.min(Math.max(max + 2, 10), 60)
    }
    ws.views = [{ state: 'frozen', ySplit: 1 }]

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `fallas_${filters.startDate || 'inicio'}_${filters.endDate || 'fin'}.xlsx`)
  }

  // Export PDF (impresión)
  const exportPDF = () => {
    if (!data || data.length === 0) return
    const win = window.open('', '_blank')
    if (!win) { toast.warning('Permite ventanas emergentes para exportar a PDF.'); return }

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
        <th>Consecutivo</th><th>Fecha</th><th>Hora</th><th>Placa</th><th>Tipo</th><th>Marca</th><th>KM</th>
        <th>Encargado</th><th>Descripción</th><th>Acciones</th><th>Estado</th><th>Obs. Seg.</th>
        <th>F. Verificación</th><th>F. Solución</th><th>U. Soluciona</th>
      </tr>
    `
    const rows = data.map(r => `
      <tr>
        <td>${r.consecutivo || ''}</td>
        <td>${r.fecha || ''}</td>
        <td>${r.hora || ''}</td>
        <td>${r.placa || ''}</td>
        <td>${r.tipo_vehiculo || ''}</td>
        <td>${r.marca || ''}</td>
        <td>${r.kilometraje ?? ''}</td>
        <td>${r.nombre_encargado || ''}</td>
        <td>${(r.descripcion_falla || '').replace(/\r?\n/g, ' ')}</td>
        <td>${(r.acciones_tomadas || '').replace(/\r?\n/g, ' ')}</td>
        <td>${r.estado || ''}</td>
        <td>${(r.observaciones_seguimiento || '').replace(/\r?\n/g, ' ')}</td>
        <td>${r.fecha_verificacion || ''}</td>
        <td>${r.fecha_solucion || ''}</td>
        <td>${r.usuario_soluciona || ''}</td>
      </tr>
    `).join('')

    win.document.write(`
      <html><head><title>Fallas</title>${style}</head>
      <body>
        <h3>Reportes de Fallas (${filters.startDate} a ${filters.endDate})</h3>
        <table>${headers}${rows}</table>
        <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `)
    win.document.close()
  }

  // Flags para el drawer
  const estadoUpper = String(rowSel?.estado || '').toUpperCase()
  const esPendiente = estadoUpper === 'PENDIENTE'
  const esCerrada   = estadoUpper === 'CERRADA'
  const esAnalisis  = estadoUpper.includes('ANÁLISIS')

  return (
    <div className="p-4">
      <Toaster position="top-center" richColors />
      {!user ? (
        <p className="text-center mt-20">Cargando...</p>
      ) : (
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4">
          {/* Título */}
          <h2 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2 text-[var(--primary)] border-b pb-2">
            <i className="fas fa-triangle-exclamation text-[var(--primary)]"></i>
            Consultar Reportes de Fallas
          </h2>

          {/* Filtros */}
          <div className="bg-[var(--primary-dark)] text-white rounded-lg p-2 mb-2">
            <h3 className="text-xs font-bold mb-1">Filtros de Búsqueda</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
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
            >
              <i className="fas fa-file-excel"></i> Excel
            </button>
            <button
              onClick={exportPDF}
              disabled={data.length === 0}
              className="bg-red-600 hover:bg-red-800 text-white px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"
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
                  <th className="p-1 border text-center">Tipo</th>
                  <th className="p-1 border text-center">Marca</th>
                  <th className="p-1 border text-center">KM</th>
                  <th className="p-1 border text-center">Encargado</th>
                  <th className="p-1 border text-center">Descripción</th>
                  <th className="p-1 border text-center">Acciones</th>
                  <th className="p-1 border text-center">Estado</th>
                  <th className="p-1 border text-center">Obs. Seg.</th>
                  <th className="p-1 border text-center">F. Verificación</th>
                  <th className="p-1 border text-center">F. Solución</th>
                  <th className="p-1 border text-center">U. Soluciona</th>
                  <th className="p-1 border text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.length > 0 ? (
                  data.map((row) => {
                    const estadoUpper = String(row.estado || '').toUpperCase()
                    const isCerrada = estadoUpper === 'CERRADA'
                    return (
                      <tr key={row.id} className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition">
                        <td className="p-1 border text-center">{row.consecutivo || '-'}</td>
                        <td className="p-1 border text-center">{row.fecha || '-'}</td>
                        <td className="p-1 border text-center">{row.hora || '-'}</td>
                        <td className="p-1 border text-center">{row.placa || '-'}</td>
                        <td className="p-1 border text-center">{row.tipo_vehiculo || '-'}</td>
                        <td className="p-1 border text-center">{row.marca || '-'}</td>
                        <td className="p-1 border text-center">{row.kilometraje ?? '-'}</td>
                        <td className="p-1 border text-center">{row.nombre_encargado || '-'}</td>
                        <td className="p-1 border text-center truncate max-w-[220px]" title={row.descripcion_falla || ''}>
                          {row.descripcion_falla || '-'}
                        </td>
                        <td className="p-1 border text-center truncate max-w-[220px]" title={row.acciones_tomadas || ''}>
                          {row.acciones_tomadas || '-'}
                        </td>
                        <td className="p-1 border text-center"><EstadoChip estado={row.estado} /></td>
                        <td className="p-1 border text-center truncate max-w-[220px]" title={row.observaciones_seguimiento || ''}>
                          {row.observaciones_seguimiento || '-'}
                        </td>
                        <td className="p-1 border text-center">{row.fecha_verificacion || '-'}</td>
                        <td className="p-1 border text-center">{row.fecha_solucion || '-'}</td>
                        <td className="p-1 border text-center">{row.usuario_soluciona || '-'}</td>
                        <td className="p-1 border text-center">
                          <button
                            onClick={()=> abrirSeguimiento(row)}
                            disabled={isCerrada}
                            className={`px-2 py-1 rounded text-white ${isCerrada ? 'bg-gray-400 cursor-not-allowed' : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'}`}
                            title={isCerrada ? 'Falla cerrada' : 'Seguimiento'}
                          >
                            Seguimiento
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="16" className="text-center text-gray-500 p-2">
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
      )}

      {/* Drawer seguimiento */}
      {drawerOpen && rowSel && (
        <div className="fixed inset-0 z-50">
          {/* overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={cerrarDrawer}></div>

          {/* panel */}
          <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-lg font-bold text-[var(--primary)] flex items-center gap-2">
                <i className="fas fa-tools"></i> Seguimiento de Falla
              </h3>
              <button className="text-gray-600 hover:text-black" onClick={cerrarDrawer}>
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Estado actual */}
            <div className="mb-3 text-sm">
              Estado actual: <EstadoChip estado={rowSel.estado} />
            </div>

            {/* Detalle */}
            <div className="border rounded mb-4">
              <div className="bg-gray-900 text-white px-3 py-1 rounded-t text-sm font-semibold">Detalle</div>
              <div className="p-3 text-xs grid grid-cols-2 gap-2">
                <div><b>Consecutivo:</b> {rowSel.consecutivo || '-'}</div>
                <div><b>Fecha:</b> {rowSel.fecha || '-'}</div>
                <div><b>Hora:</b> {rowSel.hora || '-'}</div>
                <div><b>Placa:</b> {rowSel.placa || '-'}</div>
                <div><b>Tipo:</b> {rowSel.tipo_vehiculo || '-'}</div>
                <div><b>Marca:</b> {rowSel.marca || '-'}</div>
                <div><b>KM:</b> {rowSel.kilometraje ?? '-'}</div>
                <div className="col-span-2"><b>Encargado:</b> {rowSel.nombre_encargado || '-'}</div>
                <div className="col-span-2"><b>Descripción:</b> {rowSel.descripcion_falla || '-'}</div>
                <div className="col-span-2"><b>Acciones tomadas:</b> {rowSel.acciones_tomadas || '-'}</div>
              </div>
            </div>

            {/* Acciones de seguimiento */}
            <div className="border rounded">
              <div className="bg-gray-900 text-white px-3 py-1 rounded-t text-sm font-semibold">Acciones de Seguimiento</div>
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
                    Fecha verificación: {rowSel.fecha_verificacion || '-'}
                  </div>
                </div>

                {/* Cerrar falla */}
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
                      onClick={cerrarFalla}
                      className="px-3 py-1 bg-green-600 hover:bg-green-800 text-white rounded disabled:opacity-50"
                      disabled={esPendiente || esCerrada || !obsCierre.trim() || closing}
                      title={closing ? 'Guardando...' : 'Cerrar Falla'}
                    >
                      {closing ? 'Guardando...' : 'Cerrar Falla'}
                    </button>
                    <div className="text-xs text-gray-600">
                      Fecha solución: {rowSel.fecha_solucion || '-'} · {rowSel.usuario_soluciona || '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cerrar panel */}
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
