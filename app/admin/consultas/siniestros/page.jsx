'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Toaster, toast } from 'sonner'

// ---- Helpers Bogotá ----
const fmtBogota = (date, mode) => {
  const optFecha = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }
  const optHora  = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Bogota' }
  return new Intl.DateTimeFormat('en-CA', mode === 'fecha' ? optFecha : optHora).format(date) // YYYY-MM-DD / HH:mm:ss
}
const hoyBogota = () => fmtBogota(new Date(), 'fecha')
const SELECT_FIELDS = `
  id,
  consecutivo,
  fecha_siniestro,
  tipo_siniestro,
  num_personas_involucradas,
  heridos_leves,
  heridos_graves,
  fatalidades,
  placa,
  nombre_conductor_implicado,
  documento,
  resumen,
  estado_analisis,
  numero_ipat,
  autoridad,
  costo_dir_choque_simple,
  costo_indi_choque_simple,
  costo_dir_heridos_l,
  costo_indi_heridos_l,
  costo_dir_heridos_g,
  costo_indi_heridos_g,
  costo_dir_fatalidad,
  costo_indi_fatalidad,
  fecha_estado_en_analisis,
  nombre_usuario_en_analisis,
  fecha_estado_cerrado,
  nombre_usuario_cerrado,
  resumen_analisis
`

// Normaliza tildes y mayúsculas p/ comparar estados robustamente
const normEstado = (s) =>
  String(s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacríticos
    .trim()

// Chip visual por estado_analisis
const EstadoChip = ({ estado }) => {
  const e = String(estado || '').toUpperCase()
  const color =
    e === 'CERRADO' ? 'bg-green-100 text-green-700 border-green-300' :
    e.includes('ANÁLISIS') || e.includes('ANALISIS') ? 'bg-blue-100 text-blue-700 border-blue-300' :
    e === 'PENDIENTE' ? 'bg-amber-100 text-amber-700 border-amber-300' :
    'bg-gray-100 text-gray-700 border-gray-300'
  return <span className={`px-2 py-[2px] rounded border text-[11px] font-semibold ${color}`}>{estado || '-'}</span>
}

export default function SiniestrosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Filtros
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    placa: '',
    tipoSiniestro: '',
  })

  // Listas
  const [placas, setPlacas] = useState([])

  // Datos/paginación
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50
  const [total, setTotal] = useState(0)

  // Drawer seguimiento
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rowSel, setRowSel] = useState(null)
  const [closing, setClosing] = useState(false) // anti doble-click

  // Campos de cierre
  const [numIpat, setNumIpat] = useState('')
  const [autoridad, setAutoridad] = useState('')
  const [resumenAnalisis, setResumenAnalisis] = useState('')
  const [costo, setCosto] = useState({
    dirChoque: '', indChoque: '',
    dirLeves: '',  indLeves:  '',
    dirGraves: '', indGraves: '',
    dirFatal:  '', indFatal:  '',
  })

  // Cargar usuario + placas
  useEffect(() => {
    const stored = localStorage.getItem('currentUser')
    if (!stored) { router.push('/login'); return }
    setUser(JSON.parse(stored))

    const cargarPlacas = async () => {
      const { data: vehs } = await supabase
        .from('vehiculos')
        .select('placa')
        .order('placa', { ascending: true })
      setPlacas((vehs || []).map(v => v.placa))
    }
    cargarPlacas()
  }, [router])

  // Handlers filtros
  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const validarRango = () => {
    const { startDate, endDate } = filters
    const hoy = hoyBogota()
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
    if (startDate > hoy || endDate > hoy) {
      toast.warning('No puedes seleccionar fechas futuras.')
      setStatus('⚠️ No se permiten fechas futuras.')
      return false
    }
    return true
  }

  // Construye query base (para consulta y exportación)
  const buildQuery = () => {
    let query = supabase
      .from('siniestros')
      .select(SELECT_FIELDS, { count: 'exact' })
      .gte('fecha_siniestro', filters.startDate)
      .lte('fecha_siniestro', filters.endDate)
      .order('fecha_siniestro', { ascending: false })
      .order('consecutivo', { ascending: false })

    if (filters.placa) query = query.eq('placa', filters.placa)
    if (filters.tipoSiniestro) query = query.eq('tipo_siniestro', filters.tipoSiniestro)
    return query
  }

  // Consultar
  const handleConsultar = async (goToPage = 1) => {
    if (!validarRango()) return
    setLoading(true); setStatus('Consultando datos...'); setPage(goToPage)

    try {
      let query = buildQuery()
      const from = (goToPage - 1) * pageSize
      const to   = from + pageSize - 1
      query = query.range(from, to)

      const { data: rows, error, count } = await query
      if (error) {
        console.error('Error consultando siniestros:', error)
        toast.error('❌ Error al consultar siniestros.')
        setStatus('❌ Error al consultar siniestros.')
        return
      }
      setData(rows || [])
      setTotal(count || 0)
      setStatus(`Consulta completada. ${count || 0} registros encontrados.`)
    } catch (err) {
      console.error(err)
      toast.error('❌ Error al consultar siniestros.')
      setStatus('❌ Error al consultar siniestros.')
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFilters({ startDate: '', endDate: '', placa: '', tipoSiniestro: '' })
    setData([]); setTotal(0); setPage(1); setStatus('')
  }

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / pageSize)),
    [total, pageSize]
  )

  // ---- Totales (página actual) ----
  const totals = useMemo(() => {
    const sum = (k) => data.reduce((acc, r) => acc + (Number(r?.[k]) || 0), 0)
    const t = {
      dirChoque: sum('costo_dir_choque_simple'),
      indChoque: sum('costo_indi_choque_simple'),
      dirLeves:  sum('costo_dir_heridos_l'),
      indLeves:  sum('costo_indi_heridos_l'),
      dirGraves: sum('costo_dir_heridos_g'),
      indGraves: sum('costo_indi_heridos_g'),
      dirFatal:  sum('costo_dir_fatalidad'),
      indFatal:  sum('costo_indi_fatalidad'),
    }
    t.granTotal = Object.values(t).reduce((a,b)=>a+b,0)
    return t
  }, [data])

  // Formato miles (es-CO)
  const fmt = (n) => Number(n || 0).toLocaleString('es-CO')

  // Drawer control
  const abrirSeguimiento = (row) => {
    setRowSel(row)
    setNumIpat(row?.numero_ipat || '')
    setAutoridad(row?.autoridad || '')
    setResumenAnalisis(row?.resumen_analisis || '')
    setCosto({
      dirChoque: String(row?.costo_dir_choque_simple ?? '') || '',
      indChoque: String(row?.costo_indi_choque_simple ?? '') || '',
      dirLeves:  String(row?.costo_dir_heridos_l ?? '') || '',
      indLeves:  String(row?.costo_indi_heridos_l ?? '') || '',
      dirGraves: String(row?.costo_dir_heridos_g ?? '') || '',
      indGraves: String(row?.costo_indi_heridos_g ?? '') || '',
      dirFatal:  String(row?.costo_dir_fatalidad ?? '') || '',
      indFatal:  String(row?.costo_indi_fatalidad ?? '') || '',
    })
    setClosing(false)
    setDrawerOpen(true)
  }
  const cerrarDrawer = () => {
    setDrawerOpen(false)
    setRowSel(null)
    setClosing(false)
  }

  // Acciones de seguimiento
  const marcarEnAnalisis = async () => {
    if (!rowSel) return
    const est = normEstado(rowSel.estado_analisis)
    if (est === 'CERRADO') { toast.info('El siniestro ya está CERRADO.'); return }
    if (est === 'EN ANALISIS') { toast.info('Ya está EN ANÁLISIS.'); return }

    const hoy = hoyBogota()
    const { error } = await supabase
      .from('siniestros')
      .update({
        estado_analisis: 'EN ANÁLISIS',
        fecha_estado_en_analisis: hoy,
        nombre_usuario_en_analisis: user?.nombreCompleto || user?.usuario || ''
      })
      .eq('id', rowSel.id)

    if (error) { console.error(error); toast.error('No se pudo marcar EN ANÁLISIS.'); return }

    toast.success('Marcado EN ANÁLISIS.')
    const updated = {
      ...rowSel,
      estado_analisis: 'EN ANÁLISIS',
      fecha_estado_en_analisis: hoy,
      nombre_usuario_en_analisis: user?.nombreCompleto || user?.usuario || ''
    }
    setRowSel(updated)
    setData(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  const cerrarSiniestro = async () => {
    if (!rowSel || closing) return
    const est = normEstado(rowSel.estado_analisis)
    // ✅ Solo permite cerrar si el estado es EN ANALISIS (sin/sin tilde)
    if (est !== 'EN ANALISIS') { toast.warning('Para cerrar, primero cambia el estado a EN ANÁLISIS.'); return }
    if (!resumenAnalisis.trim()) {
      toast.warning('El resumen de análisis es obligatorio para cerrar.')
      return
    }
    setClosing(true)
    try {
      const hoy = hoyBogota()
      const payload = {
        estado_analisis: 'CERRADO',
        fecha_estado_cerrado: hoy,
        nombre_usuario_cerrado: user?.nombreCompleto || user?.usuario || '',
        resumen_analisis: resumenAnalisis.trim(),
        numero_ipat: numIpat?.trim() || null,
        autoridad: autoridad?.trim() || null,
        costo_dir_choque_simple: Number(costo.dirChoque || 0) || null,
        costo_indi_choque_simple: Number(costo.indChoque || 0) || null,
        costo_dir_heridos_l: Number(costo.dirLeves || 0) || null,
        costo_indi_heridos_l: Number(costo.indLeves || 0) || null,
        costo_dir_heridos_g: Number(costo.dirGraves || 0) || null,
        costo_indi_heridos_g: Number(costo.indGraves || 0) || null,
        costo_dir_fatalidad: Number(costo.dirFatal || 0) || null,
        costo_indi_fatalidad: Number(costo.indFatal || 0) || null,
      }

      const { error } = await supabase
        .from('siniestros')
        .update(payload)
        .eq('id', rowSel.id)

      if (error) { console.error(error); toast.error('No se pudo CERRAR el siniestro.'); return }

      toast.success('Análisis cerrado.')
      const updated = { ...rowSel, ...payload }
      setRowSel(updated)
      setData(prev => prev.map(r => r.id === updated.id ? updated : r))
    } finally {
      setClosing(false)
    }
  }

  // Obtiene TODOS los registros filtrados (para exportación)
  const fetchAllForExport = async () => {
    if (!validarRango()) return []
    if (total <= data.length) return data // ya tenemos todo

    const pageSizeExp = 1000
    let offset = 0
    let acc = []
    while (offset < total) {
      let q = buildQuery().range(offset, offset + pageSizeExp - 1)
      const { data: chunk, error } = await q
      if (error) { console.error(error); break }
      acc = acc.concat(chunk || [])
      if (!chunk || chunk.length < pageSizeExp) break
      offset += pageSizeExp
    }
    return acc
  }

  // Export XLSX
  const exportXLSX = async () => {
    const allRows = await fetchAllForExport()
    if (!allRows || allRows.length === 0) return

    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import('exceljs'),
      import('file-saver')
    ])

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Siniestros')

    const headers = [
      'Consecutivo','Fecha','Tipo','# Personas','Leves','Graves','Fatalidades','Placa',
      'Conductor','Documento','Resumen','Estado','IPAT','Autoridad',
      'C.D. Choque','C.I. Choque','C.D. Leves','C.I. Leves',
      'C.D. Graves','C.I. Graves','C.D. Fatales','C.I. Fatales',
      'F. Análisis','U. Análisis','F. Cierre','U. Cierre','Resumen Análisis'
    ]
    ws.addRow(headers)
    const headerRow = ws.getRow(1)
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
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

    const rows = allRows.map(r => [
      r.consecutivo || '',
      r.fecha_siniestro || '',
      r.tipo_siniestro || '',
      r.num_personas_involucradas ?? '',
      r.heridos_leves ?? '',
      r.heridos_graves ?? '',
      r.fatalidades ?? '',
      r.placa || '',
      r.nombre_conductor_implicado || '',
      r.documento || '',
      (r.resumen || '').replace(/\r?\n/g, ' '),
      r.estado_analisis || '',
      r.numero_ipat || '',
      r.autoridad || '',
      r.costo_dir_choque_simple ?? '',
      r.costo_indi_choque_simple ?? '',
      r.costo_dir_heridos_l ?? '',
      r.costo_indi_heridos_l ?? '',
      r.costo_dir_heridos_g ?? '',
      r.costo_indi_heridos_g ?? '',
      r.costo_dir_fatalidad ?? '',
      r.costo_indi_fatalidad ?? '',
      r.fecha_estado_en_analisis || '',
      r.nombre_usuario_en_analisis || '',
      r.fecha_estado_cerrado || '',
      r.nombre_usuario_cerrado || '',
      (r.resumen_analisis || '').replace(/\r?\n/g, ' ')
    ])
    rows.forEach(arr => {
      const row = ws.addRow(arr)
      row.eachCell((cell, col) => {
        cell.alignment = { vertical: 'middle', horizontal: col <= 10 ? 'center' : 'left', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        }
      })
    })

    // Totales (sobre todos los registros exportados)
    const sumAll = (k) => allRows.reduce((acc, r) => acc + (Number(r?.[k]) || 0), 0)
    const totalsAll = {
      dirChoque: sumAll('costo_dir_choque_simple'),
      indChoque: sumAll('costo_indi_choque_simple'),
      dirLeves:  sumAll('costo_dir_heridos_l'),
      indLeves:  sumAll('costo_indi_heridos_l'),
      dirGraves: sumAll('costo_dir_heridos_g'),
      indGraves: sumAll('costo_indi_heridos_g'),
      dirFatal:  sumAll('costo_dir_fatalidad'),
      indFatal:  sumAll('costo_indi_fatalidad'),
    }

    const totalRow = new Array(headers.length).fill('')
    totalRow[13] = 'TOTALES'
    totalRow[14] = totalsAll.dirChoque
    totalRow[15] = totalsAll.indChoque
    totalRow[16] = totalsAll.dirLeves
    totalRow[17] = totalsAll.indLeves
    totalRow[18] = totalsAll.dirGraves
    totalRow[19] = totalsAll.indGraves
    totalRow[20] = totalsAll.dirFatal
    totalRow[21] = totalsAll.indFatal
    const rTot = ws.addRow(totalRow)
    rTot.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
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
    saveAs(blob, `siniestros_${filters.startDate || 'inicio'}_${filters.endDate || 'fin'}.xlsx`)
  }

  // Export PDF (impresión)
  const exportPDF = async () => {
    const allRows = await fetchAllForExport()
    if (!allRows || allRows.length === 0) return

    const sumAll = (k) => allRows.reduce((acc, r) => acc + (Number(r?.[k]) || 0), 0)
    const totalsAll = {
      dirChoque: sumAll('costo_dir_choque_simple'),
      indChoque: sumAll('costo_indi_choque_simple'),
      dirLeves:  sumAll('costo_dir_heridos_l'),
      indLeves:  sumAll('costo_indi_heridos_l'),
      dirGraves: sumAll('costo_dir_heridos_g'),
      indGraves: sumAll('costo_indi_heridos_g'),
      dirFatal:  sumAll('costo_dir_fatalidad'),
      indFatal:  sumAll('costo_indi_fatalidad'),
    }

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
        tfoot td { background: #e5e7eb; font-weight: bold; }
      </style>
    `
    const headers = `
      <tr>
        <th>Consecutivo</th><th>Fecha</th><th>Tipo</th><th># Pers.</th><th>Leves</th><th>Graves</th><th>Fatales</th>
        <th>Placa</th><th>Conductor</th><th>Documento</th><th>Resumen</th><th>Estado</th><th>IPAT</th><th>Autoridad</th>
        <th>C.D. Choque</th><th>C.I. Choque</th><th>C.D. Leves</th><th>C.I. Leves</th>
        <th>C.D. Graves</th><th>C.I. Graves</th><th>C.D. Fatales</th><th>C.I. Fatales</th>
        <th>F. Análisis</th><th>U. Análisis</th><th>F. Cierre</th><th>U. Cierre</th><th>Resumen Análisis</th>
      </tr>
    `
    const rows = allRows.map(r => `
      <tr>
        <td>${r.consecutivo || ''}</td>
        <td>${r.fecha_siniestro || ''}</td>
        <td>${r.tipo_siniestro || ''}</td>
        <td>${r.num_personas_involucradas ?? ''}</td>
        <td>${r.heridos_leves ?? ''}</td>
        <td>${r.heridos_graves ?? ''}</td>
        <td>${r.fatalidades ?? ''}</td>
        <td>${r.placa || ''}</td>
        <td>${r.nombre_conductor_implicado || ''}</td>
        <td>${r.documento || ''}</td>
        <td>${(r.resumen || '').replace(/\r?\n/g, ' ')}</td>
        <td>${r.estado_analisis || ''}</td>
        <td>${r.numero_ipat || ''}</td>
        <td>${r.autoridad || ''}</td>
        <td>${r.costo_dir_choque_simple ?? ''}</td>
        <td>${r.costo_indi_choque_simple ?? ''}</td>
        <td>${r.costo_dir_heridos_l ?? ''}</td>
        <td>${r.costo_indi_heridos_l ?? ''}</td>
        <td>${r.costo_dir_heridos_g ?? ''}</td>
        <td>${r.costo_indi_heridos_g ?? ''}</td>
        <td>${r.costo_dir_fatalidad ?? ''}</td>
        <td>${r.costo_indi_fatalidad ?? ''}</td>
        <td>${r.fecha_estado_en_analisis || ''}</td>
        <td>${r.nombre_usuario_en_analisis || ''}</td>
        <td>${r.fecha_estado_cerrado || ''}</td>
        <td>${r.nombre_usuario_cerrado || ''}</td>
        <td>${(r.resumen_analisis || '').replace(/\r?\n/g, ' ')}</td>
      </tr>
    `).join('')

    const totalsRow = `
      <tr>
        <td colspan="14"><b>TOTALES</b></td>
        <td>${totalsAll.dirChoque}</td>
        <td>${totalsAll.indChoque}</td>
        <td>${totalsAll.dirLeves}</td>
        <td>${totalsAll.indLeves}</td>
        <td>${totalsAll.dirGraves}</td>
        <td>${totalsAll.indGraves}</td>
        <td>${totalsAll.dirFatal}</td>
        <td>${totalsAll.indFatal}</td>
        <td colspan="5"></td>
      </tr>
    `

    win.document.write(`
      <html><head><title>Siniestros</title>${style}</head>
      <body>
        <h3>Siniestros (${filters.startDate} a ${filters.endDate})</h3>
        <table>
          <thead>${headers}</thead>
          <tbody>${rows}</tbody>
          <tfoot>${totalsRow}</tfoot>
        </table>
        <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `)
    win.document.close()
  }

  // Flags y permisos edición seguimiento
  const estadoUpper = normEstado(rowSel?.estado_analisis)
  const esPendiente = estadoUpper === 'PENDIENTE'
  const esCerrado   = estadoUpper === 'CERRADO'
  const esAnalisis  = estadoUpper === 'EN ANALISIS'
  const puedeEditar = esAnalisis && !esCerrado

  return (
    <div className="p-4">
      <Toaster position="top-center" richColors />

      {!user ? (
        <p className="text-center mt-20">Cargando...</p>
      ) : (
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4">
          {/* Título */}
          <h2 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2 text-[var(--primary)] border-b pb-2">
            <i className="fas fa-car-crash text-[var(--primary)]"></i>
            Consultar Siniestros Registrados
          </h2>

          {/* Filtros */}
          <div className="bg-[var(--primary-dark)] text-white rounded-lg p-2 mb-2">
            <h3 className="text-xs font-bold mb-1">Filtros de Búsqueda</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
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
                <label className="mb-1">Placa</label>
                <select
                  name="placa"
                  value={filters.placa}
                  onChange={handleChange}
                  className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
                >
                  <option value="">Toda la Flota</option>
                  {placas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-1">Tipo de Siniestro</label>
                <select
                  name="tipoSiniestro"
                  value={filters.tipoSiniestro}
                  onChange={handleChange}
                  className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
                >
                  <option value="">Todos</option>
                  <option value="Atropello">Atropello</option>
                  <option value="Choque">Choque</option>
                  <option value="Colisión">Colisión</option>
                  <option value="Vuelco">Vuelco</option>
                  <option value="Características Especiales">Características Especiales</option>
                  <option value="Caída">Caída</option>
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
              disabled={total === 0}
              className="bg-green-600 hover:bg-green-800 text-white px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"
            >
              <i className="fas fa-file-excel"></i> Excel
            </button>
            <button
              onClick={exportPDF}
              disabled={total === 0}
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
                  <th className="p-1 border text-center">Tipo</th>
                  <th className="p-1 border text-center"># Personas</th>
                  <th className="p-1 border text-center">Leves</th>
                  <th className="p-1 border text-center">Graves</th>
                  <th className="p-1 border text-center">Fatalidades</th>
                  <th className="p-1 border text-center">Placa</th>
                  <th className="p-1 border text-center">Conductor</th>
                  <th className="p-1 border text-center">Documento</th>
                  <th className="p-1 border text-center">Resumen</th>
                  <th className="p-1 border text-center">Estado</th>
                  <th className="p-1 border text-center">IPAT</th>
                  <th className="p-1 border text-center">Autoridad</th>
                  <th className="p-1 border text-center">C.D. Choque</th>
                  <th className="p-1 border text-center">C.I. Choque</th>
                  <th className="p-1 border text-center">C.D. Leves</th>
                  <th className="p-1 border text-center">C.I. Leves</th>
                  <th className="p-1 border text-center">C.D. Graves</th>
                  <th className="p-1 border text-center">C.I. Graves</th>
                  <th className="p-1 border text-center">C.D. Fatales</th>
                  <th className="p-1 border text-center">C.I. Fatales</th>
                  <th className="p-1 border text-center">F. Análisis</th>
                  <th className="p-1 border text-center">U. Análisis</th>
                  <th className="p-1 border text-center">F. Cierre</th>
                  <th className="p-1 border text-center">U. Cierre</th>
                  <th className="p-1 border text-center">Resumen Análisis</th>
                  <th className="p-1 border text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.length > 0 ? (
                  data.map((row) => {
                    const isCerrado = normEstado(row.estado_analisis) === 'CERRADO'
                    return (
                      <tr key={row.id} className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition">
                        <td className="p-1 border text-center">{row.consecutivo || '-'}</td>
                        <td className="p-1 border text-center">{row.fecha_siniestro || '-'}</td>
                        <td className="p-1 border text-center">{row.tipo_siniestro || '-'}</td>
                        <td className="p-1 border text-center">{row.num_personas_involucradas ?? '-'}</td>
                        <td className="p-1 border text-center">{row.heridos_leves ?? '-'}</td>
                        <td className="p-1 border text-center">{row.heridos_graves ?? '-'}</td>
                        <td className="p-1 border text-center">{row.fatalidades ?? '-'}</td>
                        <td className="p-1 border text-center">{row.placa || '-'}</td>
                        <td className="p-1 border text-center">{row.nombre_conductor_implicado || '-'}</td>
                        <td className="p-1 border text-center">{row.documento || '-'}</td>
                        <td className="p-1 border text-center truncate max-w-[240px]" title={row.resumen || ''}>
                          {row.resumen || '-'}
                        </td>
                        <td className="p-1 border text-center"><EstadoChip estado={row.estado_analisis} /></td>
                        <td className="p-1 border text-center">{row.numero_ipat || '-'}</td>
                        <td className="p-1 border text-center">{row.autoridad || '-'}</td>
                        {/* costos con separador de miles */}
                        <td className="p-1 border text-center">{fmt(row.costo_dir_choque_simple)}</td>
                        <td className="p-1 border text-center">{fmt(row.costo_indi_choque_simple)}</td>
                        <td className="p-1 border text-center">{fmt(row.costo_dir_heridos_l)}</td>
                        <td className="p-1 border text-center">{fmt(row.costo_indi_heridos_l)}</td>
                        <td className="p-1 border text-center">{fmt(row.costo_dir_heridos_g)}</td>
                        <td className="p-1 border text-center">{fmt(row.costo_indi_heridos_g)}</td>
                        <td className="p-1 border text-center">{fmt(row.costo_dir_fatalidad)}</td>
                        <td className="p-1 border text-center">{fmt(row.costo_indi_fatalidad)}</td>

                        <td className="p-1 border text-center">{row.fecha_estado_en_analisis || '-'}</td>
                        <td className="p-1 border text-center">{row.nombre_usuario_en_analisis || '-'}</td>
                        <td className="p-1 border text-center">{row.fecha_estado_cerrado || '-'}</td>
                        <td className="p-1 border text-center">{row.nombre_usuario_cerrado || '-'}</td>
                        <td className="p-1 border text-center truncate max-w-[240px]" title={row.resumen_analisis || ''}>
                          {row.resumen_analisis || '-'}
                        </td>
                        <td className="p-1 border text-center">
                          <button
                            onClick={()=> abrirSeguimiento(row)}
                            disabled={isCerrado}
                            className={`px-2 py-1 rounded text-white ${isCerrado ? 'bg-gray-400 cursor-not-allowed' : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'}`}
                            title={isCerrado ? 'Siniestro cerrado' : 'Seguimiento'}
                          >
                            Seguimiento
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="28" className="text-center text-gray-500 p-2">
                      No hay resultados para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Pie de totales (página actual) */}
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="p-1 border text-right" colSpan={14}>Totales (página):</td>
                  <td className="p-1 border text-center">{fmt(totals.dirChoque)}</td>
                  <td className="p-1 border text-center">{fmt(totals.indChoque)}</td>
                  <td className="p-1 border text-center">{fmt(totals.dirLeves)}</td>
                  <td className="p-1 border text-center">{fmt(totals.indLeves)}</td>
                  <td className="p-1 border text-center">{fmt(totals.dirGraves)}</td>
                  <td className="p-1 border text-center">{fmt(totals.indGraves)}</td>
                  <td className="p-1 border text-center">{fmt(totals.dirFatal)}</td>
                  <td className="p-1 border text-center">{fmt(totals.indFatal)}</td>
                  <td className="p-1 border text-center" colSpan={5}></td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="p-1 border text-right" colSpan={14}>Gran total (página):</td>
                  <td className="p-1 border text-center" colSpan={8}>{fmt(totals.granTotal)}</td>
                  <td className="p-1 border text-center" colSpan={5}></td>
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

      {/* Drawer seguimiento */}
      {drawerOpen && rowSel && (
        <div className="fixed inset-0 z-50">
          {/* overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={cerrarDrawer}></div>

          {/* panel */}
          <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-2xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-lg font-bold text-[var(--primary)] flex items-center gap-2">
                <i className="fas fa-car-crash"></i> Seguimiento de Siniestro
              </h3>
              <button className="text-gray-600 hover:text-black" onClick={cerrarDrawer}>
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Estado actual */}
            <div className="mb-3 text-sm">
              Estado actual: <EstadoChip estado={rowSel.estado_analisis} />
            </div>

            {/* Detalle */}
            <div className="border rounded mb-4">
              <div className="bg-gray-900 text-white px-3 py-1 rounded-t text-sm font-semibold">Detalle</div>
              <div className="p-3 text-xs grid grid-cols-2 gap-2">
                <div><b>Consecutivo:</b> {rowSel.consecutivo || '-'}</div>
                <div><b>Fecha:</b> {rowSel.fecha_siniestro || '-'}</div>
                <div><b>Tipo:</b> {rowSel.tipo_siniestro || '-'}</div>
                <div><b>Placa:</b> {rowSel.placa || '-'}</div>
                <div><b># Personas:</b> {rowSel.num_personas_involucradas ?? '-'}</div>
                <div><b>Leves:</b> {rowSel.heridos_leves ?? '-'}</div>
                <div><b>Graves:</b> {rowSel.heridos_graves ?? '-'}</div>
                <div><b>Fatalidades:</b> {rowSel.fatalidades ?? '-'}</div>
                <div className="col-span-2"><b>Conductor:</b> {rowSel.nombre_conductor_implicado || '-'}</div>
                <div className="col-span-2"><b>Resumen:</b> {rowSel.resumen || '-'}</div>
              </div>
            </div>

            {/* Acciones seguimiento */}
            <div className="border rounded">
              <div className="bg-gray-900 text-white px-3 py-1 rounded-t text-sm font-semibold">Acciones de Seguimiento</div>

              <div className="p-3 space-y-3 text-sm">
                {/* EN ANÁLISIS */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={marcarEnAnalisis}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-800 text-white rounded disabled:opacity-50"
                    disabled={esCerrado || esAnalisis}
                  >
                    Marcar EN ANÁLISIS
                  </button>
                  <div className="text-xs text-gray-600">
                    Fecha análisis: {rowSel.fecha_estado_en_analisis || '-'} · {rowSel.nombre_usuario_en_analisis || '-'}
                  </div>
                </div>

                {/* Cerrar análisis (habilitado solo EN ANÁLISIS) */}
                <div className="border-t pt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      className="border rounded p-2 text-xs"
                      placeholder="Número IPAT"
                      value={numIpat}
                      onChange={(e)=> setNumIpat(e.target.value)}
                      disabled={!puedeEditar}
                    />
                    <input
                      type="text"
                      className="border rounded p-2 text-xs"
                      placeholder="Autoridad de Tránsito"
                      value={autoridad}
                      onChange={(e)=> setAutoridad(e.target.value)}
                      disabled={!puedeEditar}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input type="number" className="border rounded p-2 text-xs" placeholder="C.D. Choque"
                      value={costo.dirChoque} onChange={(e)=> setCosto(s=>({...s, dirChoque: e.target.value}))} disabled={!puedeEditar}/>
                    <input type="number" className="border rounded p-2 text-xs" placeholder="C.I. Choque"
                      value={costo.indChoque} onChange={(e)=> setCosto(s=>({...s, indChoque: e.target.value}))} disabled={!puedeEditar}/>
                    <input type="number" className="border rounded p-2 text-xs" placeholder="C.D. Leves"
                      value={costo.dirLeves} onChange={(e)=> setCosto(s=>({...s, dirLeves: e.target.value}))} disabled={!puedeEditar}/>
                    <input type="number" className="border rounded p-2 text-xs" placeholder="C.I. Leves"
                      value={costo.indLeves} onChange={(e)=> setCosto(s=>({...s, indLeves: e.target.value}))} disabled={!puedeEditar}/>
                    <input type="number" className="border rounded p-2 text-xs" placeholder="C.D. Graves"
                      value={costo.dirGraves} onChange={(e)=> setCosto(s=>({...s, dirGraves: e.target.value}))} disabled={!puedeEditar}/>
                    <input type="number" className="border rounded p-2 text-xs" placeholder="C.I. Graves"
                      value={costo.indGraves} onChange={(e)=> setCosto(s=>({...s, indGraves: e.target.value}))} disabled={!puedeEditar}/>
                    <input type="number" className="border rounded p-2 text-xs" placeholder="C.D. Fatales"
                      value={costo.dirFatal} onChange={(e)=> setCosto(s=>({...s, dirFatal: e.target.value}))} disabled={!puedeEditar}/>
                    <input type="number" className="border rounded p-2 text-xs" placeholder="C.I. Fatales"
                      value={costo.indFatal} onChange={(e)=> setCosto(s=>({...s, indFatal: e.target.value}))} disabled={!puedeEditar}/>
                  </div>

                  <label className="block font-semibold text-xs">Resumen de Análisis *</label>
                  <textarea
                    className="w-full border rounded p-2 text-xs"
                    rows={3}
                    placeholder="Describe las conclusiones del análisis (obligatorio para cerrar)"
                    value={resumenAnalisis}
                    onChange={(e)=> setResumenAnalisis(e.target.value)}
                    disabled={!puedeEditar}
                  />

                  <div className="flex items-center justify-between mt-1">
                    <button
                      onClick={cerrarSiniestro}
                      className="px-3 py-1 bg-green-600 hover:bg-green-800 text-white rounded disabled:opacity-50"
                      disabled={!puedeEditar || !resumenAnalisis.trim() || closing}
                      title={closing ? 'Guardando...' : 'Cerrar Análisis'}
                    >
                      {closing ? 'Guardando...' : 'Cerrar Análisis'}
                    </button>
                    <div className="text-xs text-gray-600">
                      F. cierre: {rowSel.fecha_estado_cerrado || '-'} · {rowSel.nombre_usuario_cerrado || '-'}
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
