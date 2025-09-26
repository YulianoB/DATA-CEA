'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Toaster, toast } from 'sonner'

// ===== Helpers =====
const fmtCOP = (n) => `$ ${Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
const minutosALabel = (min) => {
  const m = Number(min || 0)
  if (!m) return '0 min'
  const h = Math.floor(m / 60), r = m % 60
  if (h > 0 && r > 0) return `${m} min (${h} h ${r} m)`
  if (h > 0) return `${m} min (${h} h)`
  return `${m} min`
}
const PAGE_SIZE = 50
const todayBogota = () => {
  const opt = { year:'numeric', month:'2-digit', day:'2-digit', timeZone:'America/Bogota' }
  return new Intl.DateTimeFormat('en-CA', opt).format(new Date()) // YYYY-MM-DD
}

// Solo columnas visibles
const HEADERS = [
  'Fecha','Placa','KM','Tipo','Actividad','Repuestos','Empresa',
  'Parada (min)','Factura','V. Repuestos','V. Mano Obra','Costo Total',
  'Responsable','Observaciones'
]

// ===== Página =====
export default function MantenimientosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Filtros
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    placa: '',
    tipoMantenimiento: '',
  })

  // Listas
  const [placas, setPlacas] = useState([])

  // Datos/paginación/estado
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (!storedUser) { router.push('/login'); return }
    setUser(JSON.parse(storedUser))

    const cargarPlacas = async () => {
      const { data: vehs, error } = await supabase
        .from('vehiculos')
        .select('placa, estado')
        .eq('estado', 'Activo')
        .order('placa', { ascending: true })
      if (!error) setPlacas((vehs || []).map(v => v.placa))
    }
    cargarPlacas()
  }, [router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const validarRango = () => {
    const { startDate, endDate } = filters
    const today = todayBogota()

    if (!startDate || !endDate) {
      toast.warning('Debes seleccionar ambas fechas.')
      setStatus('⚠️ Debe seleccionar ambas fechas.')
      return false
    }
    if (endDate < startDate) {
      toast.warning('La fecha fin no puede ser menor que la fecha inicio.')
      setStatus('⚠️ Rango de fechas inválido.')
      return false
    }
    if (startDate > today || endDate > today) {
      toast.warning('No se permiten fechas futuras en los filtros.')
      setStatus('⚠️ No se permiten fechas futuras.')
      return false
    }
    return true
  }

  // Query base (solo columnas visibles)
  const buildQuery = () => {
    let q = supabase
      .from('mantenimientos')
      .select(`
        id,
        fecha_registro,
        placa,
        kilometraje,
        tipo_mantenimiento,
        actividad_realizada,
        repuestos_utilizados,
        empresa,
        tiempoparada,
        factura,
        valor_repuestos,
        valor_mano_obra,
        costo_total,
        responsable,
        observaciones
      `, { count: 'exact' })
      .gte('fecha_registro', filters.startDate)
      .lte('fecha_registro', filters.endDate)
      .order('fecha_registro', { ascending: false })

    if (filters.placa) q = q.eq('placa', filters.placa)
    if (filters.tipoMantenimiento) q = q.eq('tipo_mantenimiento', filters.tipoMantenimiento)
    return q
  }

  // Consultar (paginado)
  const handleConsultar = async (goToPage = 1) => {
    if (!validarRango()) return
    setLoading(true); setStatus('Consultando datos...'); setPage(goToPage)
    try {
      let query = buildQuery()
      const from = (goToPage - 1) * PAGE_SIZE
      const to   = from + PAGE_SIZE - 1
      query = query.range(from, to)

      const { data: rows, error, count } = await query
      if (error) {
        console.error('Error consultando mantenimientos:', error)
        toast.error('❌ Error al consultar mantenimientos.')
        setStatus('❌ Error al consultar mantenimientos.')
        return
      }
      setData(rows || [])
      setTotal(count || 0)
      setStatus(`Consulta completada. ${count || 0} registros encontrados.`)
    } catch (err) {
      console.error(err)
      toast.error('❌ Error al consultar mantenimientos.')
      setStatus('❌ Error al consultar mantenimientos.')
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFilters({ startDate: '', endDate: '', placa: '', tipoMantenimiento: '' })
    setData([]); setTotal(0); setPage(1); setStatus('')
  }

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / PAGE_SIZE)),
    [total]
  )

  // Totales de la página
  const totals = useMemo(() => {
    const sum = (k) => data.reduce((acc, r) => acc + (Number(r?.[k]) || 0), 0)
    return {
      repuestos: sum('valor_repuestos'),
      manoObra:  sum('valor_mano_obra'),
      total:     sum('costo_total'),
    }
  }, [data])

  // ====== Export helpers: traer TODO para exportar (independiente de la paginación) ======
  const fetchAllForExport = async () => {
    if (!validarRango()) return []
    const { data: all, error } = await buildQuery().range(0, 9999)
    if (error) { console.error('Error exportando (fetchAll):', error); return [] }
    return all || []
  }

  // ====== Export XLSX (solo columnas visibles + fix corrupción) ======
  const exportXLSX = async () => {
    const allRows = await fetchAllForExport()
    if (!allRows || allRows.length === 0) {
      toast.info('No hay datos para exportar.')
      return
    }

    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import('exceljs'),
      import('file-saver'),
    ])

    const wb = new ExcelJS.Workbook()
    wb.creator = 'CEA'
    wb.created = new Date()

    const ws = wb.addWorksheet('Mantenimientos')

    // Encabezado (solo visibles)
    ws.addRow(HEADERS)
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
    headerRow.height = 24

    const S = (v) => (v === null || v === undefined ? '' : v)

    const rows = allRows.map(r => ([
      S(r.fecha_registro),
      S(r.placa),
      Number(r.kilometraje ?? 0),
      S(r.tipo_mantenimiento),
      S(String(r.actividad_realizada || '').replace(/\r?\n/g, ' ')),
      S(String(r.repuestos_utilizados || '').replace(/\r?\n/g, ' ')),
      S(r.empresa),
      Number(r.tiempoparada || 0),
      S(r.factura),
      Number(r.valor_repuestos || 0),
      Number(r.valor_mano_obra || 0),
      Number(r.costo_total || 0),
      S(r.responsable),
      S(String(r.observaciones || '').replace(/\r?\n/g, ' ')),
    ]))

    rows.forEach(arr => {
      const row = ws.addRow(arr)
      row.eachCell((cell, col) => {
        const centerCols = [1,2,3,4,8,9]            // centradas
        const moneyCols  = [10,11,12]               // derechas
        const horiz = moneyCols.includes(col)
          ? 'right'
          : (centerCols.includes(col) ? 'center' : 'left')
        cell.alignment = { vertical: 'middle', horizontal: horiz, wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        }
      })
    })

    // Formatos numéricos por columna
    const colKm    = HEADERS.indexOf('KM') + 1
    const colPar   = HEADERS.indexOf('Parada (min)') + 1
    const colRep   = HEADERS.indexOf('V. Repuestos') + 1
    const colMO    = HEADERS.indexOf('V. Mano Obra') + 1
    const colTot   = HEADERS.indexOf('Costo Total') + 1
    ws.getColumn(colKm).numFmt  = '#,##0'
    ws.getColumn(colPar).numFmt = '#,##0'
    ws.getColumn(colRep).numFmt = '#,##0'
    ws.getColumn(colMO).numFmt  = '#,##0'
    ws.getColumn(colTot).numFmt = '#,##0'

    // Totales globales
    const sumAll = (k) => allRows.reduce((acc, r) => acc + (Number(r?.[k]) || 0), 0)
    const totalsAll = { rep: sumAll('valor_repuestos'), mo: sumAll('valor_mano_obra'), tot: sumAll('costo_total') }
    const totalRow = new Array(HEADERS.length).fill('')
    totalRow[colRep - 1] = totalsAll.rep
    totalRow[colMO  - 1] = totalsAll.mo
    totalRow[colTot - 1] = totalsAll.tot
    const rTot = ws.addRow(totalRow)
    rTot.eachCell((cell, col) => {
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
      if ([colRep, colMO, colTot].includes(col)) cell.alignment = { horizontal: 'right' }
    })

    // Auto-anchos + extra para monetarias
    for (let i = 1; i <= HEADERS.length; i++) {
      let maxChars = HEADERS[i - 1].length
      ws.eachRow({ includeEmpty: false }, row => {
        const v = row.getCell(i).value
        const s = v == null ? '' : String(v)
        maxChars = Math.max(maxChars, Math.min(s.length, 160))
      })
      let width = Math.min(Math.max(Math.ceil(maxChars * 0.9) + 6, 12), 90)
      if ([colRep, colMO, colTot].includes(i)) width = Math.max(width, 20) // más ancho para $ #######
      ws.getColumn(i).width = width
    }
    ws.views = [{ state: 'frozen', ySplit: 1 }]

    // Escribir buffer con fallback para evitar "contenido dañado"
    let buf
    try {
      buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true })
    } catch (e1) {
      console.warn('writeBuffer intento 1 falló, reintentando...', e1)
      buf = await wb.xlsx.writeBuffer({ useStyles: false, useSharedStrings: true })
    }
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `mantenimientos_${filters.startDate || 'inicio'}_${filters.endDate || 'fin'}.xlsx`)
  }

  // ====== Export PDF con jsPDF + autoTable (solo columnas visibles, ancho proporcional) ======
  const exportPDF = async () => {
    const allRows = await fetchAllForExport()
    if (!allRows || allRows.length === 0) {
      toast.info('No hay datos para exportar.')
      return
    }

    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])

    // A3 para caber columnas
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' })
    const margin = 36
    const usable = doc.internal.pageSize.getWidth() - margin * 2

    // pesos relativos por columna (suma aprox equilibrada)
    const weights = [7,6,6,7,18,16,12,7,8,10,10,11,12,18]
    const sumW = weights.reduce((a,b)=>a+b,0)
    const widths = weights.map(w => (usable * w) / sumW)

    const head = [HEADERS]
    const body = allRows.map(r => ([
      r.fecha_registro || '',
      r.placa || '',
      Number(r.kilometraje ?? 0).toLocaleString('es-CO'),
      r.tipo_mantenimiento || '',
      String(r.actividad_realizada || '').replace(/\r?\n/g, ' '),
      String(r.repuestos_utilizados || '').replace(/\r?\n/g, ' '),
      r.empresa || '',
      Number(r.tiempoparada || 0).toLocaleString('es-CO'),
      r.factura || '',
      Number(r.valor_repuestos || 0).toLocaleString('es-CO'),
      Number(r.valor_mano_obra || 0).toLocaleString('es-CO'),
      Number(r.costo_total || 0).toLocaleString('es-CO'),
      r.responsable || '',
      String(r.observaciones || '').replace(/\r?\n/g, ' '),
    ]))

    // Totales
    const sumAll = (k) => allRows.reduce((acc, r) => acc + (Number(r?.[k]) || 0), 0)
    const totalsAll = {
      rep: sumAll('valor_repuestos'),
      mo:  sumAll('valor_mano_obra'),
      tot: sumAll('costo_total'),
    }

    // Pie con colSpans correctos (14 columnas: 9 + 3 + 2)
    const foot = [[
      { content: 'TOTALES', colSpan: 9, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: totalsAll.rep.toLocaleString('es-CO'), styles: { fontStyle: 'bold' } }, // V. Repuestos
      { content: totalsAll.mo.toLocaleString('es-CO'),  styles: { fontStyle: 'bold' } }, // V. Mano Obra
      { content: totalsAll.tot.toLocaleString('es-CO'), styles: { fontStyle: 'bold' } }, // Costo Total
      { content: '', colSpan: 2 }
    ]]

    const columnStyles = widths.reduce((acc, w, i) => { acc[i] = { cellWidth: w }; return acc }, {})

    autoTable(doc, {
      head,
      body,
      foot,
      startY: 56,
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [31, 41, 55], textColor: 255 },
      margin: { left: margin, right: margin },
      columnStyles,
      didDrawPage: (data) => {
        doc.setFontSize(14)
        doc.text(`Mantenimientos (${filters.startDate} a ${filters.endDate})`, margin, 32)
      }
    })

    doc.save(`mantenimientos_${filters.startDate}_${filters.endDate}.pdf`)
  }

  return (
    <div className="p-4">
      <Toaster position="top-center" richColors />

      {!user ? (
        <p className="text-center mt-20">Cargando...</p>
      ) : (
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4">
          {/* Título */}
          <h2 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2 text-[var(--primary)] border-b pb-2">
            <i className="fas fa-tools text-[var(--primary)]"></i>
            Consultar Mantenimientos Registrados
          </h2>

          {/* Filtros */}
          <div className="bg-[var(--primary-dark)] text-white rounded-lg p-2 mb-2">
            <h3 className="text-xs font-bold mb-1">Filtros de Búsqueda</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
              <div className="flex flex-col">
                <label className="mb-1">Fecha Inicio</label>
                <input
                  type="date" name="startDate" value={filters.startDate}
                  onChange={handleChange}
                  className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1">Fecha Fin</label>
                <input
                  type="date" name="endDate" value={filters.endDate}
                  onChange={handleChange}
                  className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1">Placa</label>
                <select
                  name="placa" value={filters.placa} onChange={handleChange}
                  className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
                >
                  <option value="">Toda la flota</option>
                  {placas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-1">Tipo de Mantenimiento</label>
                <select
                  name="tipoMantenimiento" value={filters.tipoMantenimiento} onChange={handleChange}
                  className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
                >
                  <option value="">Todos</option>
                  <option value="PREVENTIVO">PREVENTIVO</option>
                  <option value="CORRECTIVO">CORRECTIVO</option>
                </select>
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
          <p className={`text-center text-xs mb-2 ${
            status.includes('❌') ? 'text-red-600' : status.includes('⚠️') ? 'text-yellow-600' : 'text-blue-700'
          }`}>{status}</p>

          {/* Tabla (solo columnas visibles) */}
          <div className="overflow-x-auto border rounded-lg shadow">
            <table className="w-full text-[11px] border-collapse rounded-lg overflow-hidden">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="p-1 border text-center">Fecha</th>
                  <th className="p-1 border text-center">Placa</th>
                  <th className="p-1 border text-center">KM</th>
                  <th className="p-1 border text-center">Tipo</th>
                  <th className="p-1 border text-center">Actividad</th>
                  <th className="p-1 border text-center">Repuestos</th>
                  <th className="p-1 border text-center">Empresa</th>
                  <th className="p-1 border text-center">Parada (min)</th>
                  <th className="p-1 border text-center">Factura</th>
                  <th className="p-1 border text-center">V. Repuestos</th>
                  <th className="p-1 border text-center">V. Mano Obra</th>
                  <th className="p-1 border text-center">Costo Total</th>
                  <th className="p-1 border text-center">Responsable</th>
                  <th className="p-1 border text-center">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {data.length > 0 ? (
                  data.map((r) => (
                    <tr key={r.id} className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition">
                      <td className="p-1 border text-center">{r.fecha_registro || '-'}</td>
                      <td className="p-1 border text-center">{r.placa || '-'}</td>
                      <td className="p-1 border text-center">{r.kilometraje ?? '-'}</td>
                      <td className="p-1 border text-center">{r.tipo_mantenimiento || '-'}</td>

                      {/* Contenido con ajuste de línea */}
                      <td className="p-1 border text-left whitespace-normal break-words max-w-[480px]">
                        {r.actividad_realizada || '-'}
                      </td>
                      <td className="p-1 border text-left whitespace-normal break-words max-w-[480px]">
                        {r.repuestos_utilizados || '-'}
                      </td>

                      <td className="p-1 border text-center">{r.empresa || '-'}</td>
                      <td className="p-1 border text-center">{minutosALabel(r.tiempoparada)}</td>
                      <td className="p-1 border text-center">{r.factura || '-'}</td>

                      {/* 💡 Más ancho y sin salto del $ */}
                      <td className="p-1 border text-center whitespace-nowrap min-w-[110px]">{fmtCOP(r.valor_repuestos)}</td>
                      <td className="p-1 border text-center whitespace-nowrap min-w-[110px]">{fmtCOP(r.valor_mano_obra)}</td>
                      <td className="p-1 border text-center whitespace-nowrap min-w-[120px] font-semibold text-[var(--primary-dark)]">
                        {fmtCOP(r.costo_total)}
                      </td>

                      <td className="p-1 border text-center">{r.responsable || '-'}</td>
                      <td className="p-1 border text-left whitespace-normal break-words max-w-[520px]">
                        {r.observaciones || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="14" className="text-center text-gray-500 p-2">
                      No hay resultados para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Pie de totales (página actual) */}
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="p-1 border text-right" colSpan={9}>Totales (página):</td>
                  <td className="p-1 border text-center whitespace-nowrap min-w-[110px]">{fmtCOP(totals.repuestos)}</td>
                  <td className="p-1 border text-center whitespace-nowrap min-w-[110px]">{fmtCOP(totals.manoObra)}</td>
                  <td className="p-1 border text-center whitespace-nowrap min-w-[120px]">{fmtCOP(totals.total)}</td>
                  <td className="p-1 border text-center" colSpan={2}></td>
                </tr>
              </tfoot>
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
    </div>
  )
}
