'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Toaster, toast } from 'sonner'

// Recharts
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  LineChart, Line
} from 'recharts'

// ========= Helpers =========
const todayBogota = () => {
  const opt = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }
  return new Intl.DateTimeFormat('en-CA', opt).format(new Date()) // YYYY-MM-DD
}
const num = (v) => Number(v ?? 0)
const fmt = (n) => Number(n || 0).toLocaleString('es-CO')
const pct = (n) => `${(Number(n || 0)).toFixed(1)}%`
const clamp = (x, a, b) => Math.min(Math.max(x, a), b)

// Agrupar simple
const groupBy = (arr, keyFn) => {
  const m = new Map()
  for (const it of arr || []) {
    const k = keyFn(it)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(it)
  }
  return m
}
// Sumar simple
const sumBy = (arr, sel) => (arr || []).reduce((acc, r) => acc + num(sel(r)), 0)

// Ordenador fecha YYYY-MM-DD
const byFechaAsc = (a, b) => String(a).localeCompare(String(b))

// Días del rango (inclusive)
const daysInRange = (start, end) => {
  if (!start || !end) return 0
  const d1 = new Date(`${start}T00:00:00`)
  const d2 = new Date(`${end}T00:00:00`)
  const ms = d2.getTime() - d1.getTime()
  return ms < 0 ? 0 : Math.floor(ms / 86400000) + 1
}

// ========= Página =========
export default function KilometrosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Filtros
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    placa: '',
  })

  // Método y umbral
  const [metodo, setMetodo] = useState('tramos') // 'tramos' | 'minmax'
  const [umbral, setUmbral] = useState(10) // %

  // Pestañas
  const [tab, setTab] = useState('resumen') // 'resumen' | 'detalle' | 'calidad'

  // Listas
  const [placas, setPlacas] = useState([])

  // Datos RAW
  const [horariosRaw, setHorariosRaw] = useState([])
  const [preopRaw, setPreopRaw] = useState([])

  // Estado UI
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  // Mostrar columna opcional en "Detalle"
  const [showPromVeh, setShowPromVeh] = useState(false)

  useEffect(() => {
    const s = localStorage.getItem('currentUser')
    if (!s) { router.push('/login'); return }
    setUser(JSON.parse(s))

    const cargarPlacas = async () => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('placa, estado')
        .eq('estado', 'Activo')
        .order('placa', { ascending: true })
      if (!error && data) setPlacas(data.map(v => v.placa))
    }
    cargarPlacas()
  }, [router])

  const onFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const validarFechas = () => {
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

  const limpiar = () => {
    setFilters({ startDate: '', endDate: '', placa: '' })
    setHorariosRaw([]); setPreopRaw([])
    setStatus(''); setTab('resumen')
    setShowPromVeh(false)
  }

  // --------- Consulta a Supabase ---------
  const consultar = async () => {
    if (!validarFechas()) return
    setLoading(true)
    setStatus('Consultando datos...')

    try {
      // Horarios
      let qH = supabase
        .from('horarios')
        .select('placa, fecha_entrada, fecha_salida, km_inicial, km_final, estado_registro')
        .gte('fecha_entrada', filters.startDate)
        .lte('fecha_entrada', filters.endDate)
      if (filters.placa) qH = qH.eq('placa', filters.placa)

      // Preoperacionales
      let qP = supabase
        .from('preoperacionales')
        .select('placa, fecha_registro, km_registro')
        .gte('fecha_registro', filters.startDate)
        .lte('fecha_registro', filters.endDate)
      if (filters.placa) qP = qP.eq('placa', filters.placa)

      const [{ data: hRows, error: hErr }, { data: pRows, error: pErr }] = await Promise.all([qH, qP])
      if (hErr) { console.error(hErr); throw new Error('Error consultando horarios') }
      if (pErr) { console.error(pErr); throw new Error('Error consultando preoperacionales') }

      setHorariosRaw(hRows || [])
      setPreopRaw(pRows || [])
      setStatus(`Consulta completada. Horarios: ${(hRows || []).length}, Preoperacionales: ${(pRows || []).length}.`)
      setTab('resumen')
    } catch (e) {
      console.error(e)
      setStatus('❌ Error en la consulta.')
      toast.error('❌ Error al consultar kilómetros.')
    } finally {
      setLoading(false)
    }
  }

  // --------- Procesamiento: Horarios ---------
  const horariosProc = useMemo(() => {
    // Solo cerrados y con km válidos
    const cerrados = (horariosRaw || []).filter(r =>
      String(r.estado_registro || '').toUpperCase() === 'CERRADO' &&
      Number.isFinite(num(r.km_inicial)) &&
      Number.isFinite(num(r.km_final))
    )

    // Anomalías
    const anomalies = {
      abiertos: (horariosRaw || []).filter(r => String(r.estado_registro || '').toUpperCase() !== 'CERRADO'),
      kmInvalidos: cerrados.filter(r => num(r.km_final) < num(r.km_inicial)),
      sinKM: (horariosRaw || []).filter(r => r.km_inicial == null || r.km_final == null),
    }

    // Tramo por registro
    const tramos = cerrados.map(r => ({
      placa: r.placa,
      fecha: r.fecha_entrada,
      tramo: Math.max(0, num(r.km_final) - num(r.km_inicial)), // negativo = 0 (y queda en kmInvalidos)
    }))

    // Suma por placa (tramos) y por día
    const porPlaca = Array.from(groupBy(tramos, r => r.placa).entries()).map(([placa, arr]) => ({
      placa,
      kmTramos: sumBy(arr, x => x.tramo)
    }))

    // Por día (flota)
    const porDiaFlota = Array.from(groupBy(tramos, r => r.fecha).entries())
      .map(([fecha, arr]) => ({ fecha, km: sumBy(arr, x => x.tramo) }))
      .sort((a, b) => byFechaAsc(a.fecha, b.fecha))

    // Por placa y día (para detalle expandible)
    const detallePlacaDiaMap = new Map()
    const byPlacaMap = groupBy(tramos, r => r.placa)
    for (const [placa, arr] of byPlacaMap.entries()) {
      const porDia = Array.from(groupBy(arr, r => r.fecha).entries())
        .map(([fecha, items]) => ({ fecha, kmHorariosDia: sumBy(items, x => x.tramo) }))
        .sort((a, b) => byFechaAsc(a.fecha, b.fecha))
      detallePlacaDiaMap.set(placa, porDia)
    }

    // Min–Max por placa (alternativa)
    const minmaxPlaca = Array.from(groupBy(cerrados, r => r.placa).entries()).map(([placa, arr]) => {
      const kmsIni = arr.map(a => num(a.km_inicial))
      const kmsFin = arr.map(a => num(a.km_final))
      const minIni = Math.min(...kmsIni)
      const maxFin = Math.max(...kmsFin)
      return { placa, kmMinMax: Math.max(0, maxFin - minIni) }
    })

    return { anomalies, porPlaca, porDiaFlota, detallePlacaDiaMap, minmaxPlaca }
  }, [horariosRaw])

  // --------- Procesamiento: Preoperacionales ---------
  const preopProc = useMemo(() => {
    const rows = (preopRaw || []).filter(r => Number.isFinite(num(r.km_registro)))
    // Agrupar por placa y ordenar por fecha
    const byPlaca = groupBy(rows, r => r.placa)

    const anomalies = {
      noIncrementos: [], // pares con delta <= 0
    }

    // Cálculo de incrementos positivos consecutivos; se atribuye al día "actual"
    const incs = [] // { placa, fecha, inc }
    for (const [placa, arr] of byPlaca.entries()) {
      const orden = [...arr].sort((a, b) => byFechaAsc(a.fecha_registro, b.fecha_registro))
      for (let i = 1; i < orden.length; i++) {
        const prev = orden[i - 1]
        const curr = orden[i]
        const delta = num(curr.km_registro) - num(prev.km_registro)
        if (delta > 0) {
          incs.push({ placa, fecha: curr.fecha_registro, inc: delta })
        } else {
          anomalies.noIncrementos.push({
            placa,
            fecha_prev: prev.fecha_registro,
            km_prev: prev.km_registro,
            fecha_curr: curr.fecha_registro,
            km_curr: curr.km_registro,
            delta
          })
        }
      }
    }

    // Por placa (suma inc)
    const porPlaca = Array.from(groupBy(incs, r => r.placa).entries()).map(([placa, arr]) => ({
      placa,
      kmInc: sumBy(arr, x => x.inc)
    }))

    // Por día (flota)
    const porDiaFlota = Array.from(groupBy(incs, r => r.fecha).entries())
      .map(([fecha, arr]) => ({ fecha, km: sumBy(arr, x => x.inc) }))
      .sort((a, b) => byFechaAsc(a.fecha, b.fecha))

    // Por placa y día (para detalle)
    const detallePlacaDiaMap = new Map()
    const byPlacaIncs = groupBy(incs, r => r.placa)
    for (const [placa, arr] of byPlacaIncs.entries()) {
      const porDia = Array.from(groupBy(arr, r => r.fecha).entries())
        .map(([fecha, items]) => ({ fecha, kmPreopDia: sumBy(items, x => x.inc) }))
        .sort((a, b) => byFechaAsc(a.fecha, b.fecha))
      detallePlacaDiaMap.set(placa, porDia)
    }

    // Min–Max por placa (alternativa)
    const minmaxPlaca = Array.from(byPlaca.entries()).map(([placa, arr]) => {
      const orden = [...arr].sort((a, b) => byFechaAsc(a.fecha_registro, b.fecha_registro))
      const kms = orden.map(o => num(o.km_registro))
      const minKm = Math.min(...kms)
      const maxKm = Math.max(...kms)
      return { placa, kmMinMax: Math.max(0, maxKm - minKm) }
    })

    return { anomalies, porPlaca, porDiaFlota, detallePlacaDiaMap, minmaxPlaca }
  }, [preopRaw])

  // --------- Comparativo por placa según método ---------
  const detallePlacas = useMemo(() => {
    // Elegir fuente: tramos vs minmax
    const H = metodo === 'tramos'
      ? horariosProc.porPlaca.map(x => ({ placa: x.placa, valor: x.kmTramos }))
      : horariosProc.minmaxPlaca.map(x => ({ placa: x.placa, valor: x.kmMinMax }))
    const P = metodo === 'tramos'
      ? preopProc.porPlaca.map(x => ({ placa: x.placa, valor: x.kmInc }))
      : preopProc.minmaxPlaca.map(x => ({ placa: x.placa, valor: x.kmMinMax }))

    const mapH = new Map(H.map(x => [x.placa, x.valor]))
    const mapP = new Map(P.map(x => [x.placa, x.valor]))
    const placasSet = new Set([...mapH.keys(), ...mapP.keys()])

    const rows = []
    placasSet.forEach(placa => {
      const vH = num(mapH.get(placa))
      const vP = num(mapP.get(placa))
      const diff = vH - vP
      const base = vP === 0 ? (vH === 0 ? 1 : vH) : vP // evitar 0
      const diffPct = (diff / base) * 100
      rows.push({
        placa,
        kmHorarios: vH,
        kmPreop: vP,
        diff,
        diffPct,
      })
    })

    // Para detalle por día (mezcla)
    const detalleDiaPorPlaca = new Map()
    const dH = horariosProc.detallePlacaDiaMap
    const dP = preopProc.detallePlacaDiaMap
    for (const placa of placasSet) {
      const arrH = dH.get(placa) || []
      const arrP = dP.get(placa) || []
      const fechasSet = new Set([...arrH.map(a => a.fecha), ...arrP.map(a => a.fecha)])
      const filas = Array.from(fechasSet.values()).sort(byFechaAsc).map(fecha => {
        const h = arrH.find(x => x.fecha === fecha)?.kmHorariosDia || 0
        const p = arrP.find(x => x.fecha === fecha)?.kmPreopDia || 0
        return { fecha, kmHorariosDia: h, kmPreopDia: p, diffDia: h - p }
      })
      detalleDiaPorPlaca.set(placa, filas)
    }

    return { rows, detalleDiaPorPlaca }
  }, [metodo, horariosProc, preopProc])

  // --------- Series por día (flota) ---------
  const serieFlotaPorDia = useMemo(() => {
    const mapH = new Map((horariosProc.porDiaFlota || []).map(x => [x.fecha, x.km]))
    const mapP = new Map((preopProc.porDiaFlota || []).map(x => [x.fecha, x.km]))
    const fechas = new Set([...mapH.keys(), ...mapP.keys()])
    const rows = Array.from(fechas.values()).sort(byFechaAsc).map(fecha => ({
      fecha,
      horarios: num(mapH.get(fecha)),
      preop: num(mapP.get(fecha)),
    }))
    return rows
  }, [horariosProc.porDiaFlota, preopProc.porDiaFlota])

  // --------- KPIs ---------
  const kpis = useMemo(() => {
    const totalH = sumBy(detallePlacas.rows, r => r.kmHorarios)
    const totalP = sumBy(detallePlacas.rows, r => r.kmPreop)
    const diff = totalH - totalP
    const base = totalP === 0 ? (totalH === 0 ? 1 : totalH) : totalP
    const diffPct = (diff / base) * 100
    const nVeh = detallePlacas.rows.length
       const nDiscrepantes = detallePlacas.rows.filter(r => Math.abs(r.diffPct) > umbral).length
    const percDiscrepantes = nVeh ? (nDiscrepantes / nVeh) * 100 : 0
    return { totalH, totalP, diff, diffPct, nVeh, nDiscrepantes, percDiscrepantes }
  }, [detallePlacas.rows, umbral])

  // ➕ Promedios diarios de flota
  const kpisPromFlota = useMemo(() => {
    const d = daysInRange(filters.startDate, filters.endDate)
    return {
      promH: d > 0 ? kpis.totalH / d : 0,
      promP: d > 0 ? kpis.totalP / d : 0,
    }
  }, [filters.startDate, filters.endDate, kpis.totalH, kpis.totalP])

  // --------- Exportables ---------
  const exportDetalleRows = useMemo(() => {
    // Orden por mayor discrepancia absoluta
    return [...detallePlacas.rows].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
  }, [detallePlacas.rows])

  const exportXLSX = async () => {
    if (exportDetalleRows.length === 0) { toast.info('No hay datos para exportar.'); return }
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import('exceljs'), import('file-saver')
    ])

    const wb = new ExcelJS.Workbook()
    wb.creator = 'CEA'
    wb.created = new Date()

    // Hoja "Detalle"
    const ws = wb.addWorksheet('Detalle')
    const HEAD = ['Placa', 'KM Horarios', 'KM Preop', 'Diferencia', '% Dif.']
    ws.addRow(HEAD)
    const header = ws.getRow(1)
    header.eachCell((c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
      c.font = { color: { argb: 'FFFFFFFF' }, bold: true }
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    })
    header.height = 22

    exportDetalleRows.forEach(r => {
      ws.addRow([r.placa, r.kmHorarios, r.kmPreop, r.diff, Number(r.diffPct.toFixed(1))])
    })

    // Totales
    const totRow = ws.addRow(['TOTALES', kpis.totalH, kpis.totalP, kpis.diff, Number(kpis.diffPct.toFixed(1))])
    totRow.font = { bold: true }
    totRow.alignment = { horizontal: 'center' }

    // Formatos / anchos
    const numCols = [2, 3, 4]
    numCols.forEach(i => ws.getColumn(i).numFmt = '#,##0')
    ws.getColumn(5).numFmt = '0.0"%"'

    for (let i = 1; i <= HEAD.length; i++) {
      let max = HEAD[i - 1].length
      ws.eachRow({ includeEmpty: false }, row => {
        const v = row.getCell(i).value
        const s = v == null ? '' : String(v)
        max = Math.max(max, Math.min(s.length, 40))
      })
      ws.getColumn(i).width = Math.max(12, Math.min(16 + max, 28))
    }
    ws.views = [{ state: 'frozen', ySplit: 1 }]

    // Hoja "Flota por día"
    const wd = wb.addWorksheet('Flota por día')
    wd.addRow(['Fecha', 'Horarios', 'Preoperacionales', 'Diferencia'])
    wd.getRow(1).eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
      c.font = { color: { argb: 'FFFFFFFF' }, bold: true }
      c.alignment = { vertical: 'middle', horizontal: 'center' }
    })
    serieFlotaPorDia.forEach(r => wd.addRow([r.fecha, r.horarios, r.preop, r.horarios - r.preop]))
    ;[2,3,4].forEach(i => wd.getColumn(i).numFmt = '#,##0')
    wd.getColumn(1).width = 14; wd.getColumn(2).width = 14; wd.getColumn(3).width = 18; wd.getColumn(4).width = 14
    wd.views = [{ state: 'frozen', ySplit: 1 }]

    const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `km_${filters.startDate}_${filters.endDate}${filters.placa ? `_${filters.placa}` : ''}.xlsx`)
  }

  const exportPDF = async () => {
    if (exportDetalleRows.length === 0) { toast.info('No hay datos para exportar.'); return }
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'), import('jspdf-autotable')
    ])

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const head = [['Placa', 'KM Horarios', 'KM Preop', 'Diferencia', '% Dif.']]
    const body = exportDetalleRows.map(r => [
      r.placa,
      fmt(r.kmHorarios),
      fmt(r.kmPreop),
      fmt(r.diff),
      `${r.diffPct.toFixed(1)}%`
    ])
    const foot = [[
      { content: 'TOTALES', styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt(kpis.totalH), styles: { fontStyle: 'bold' } },
      { content: fmt(kpis.totalP), styles: { fontStyle: 'bold' } },
      { content: fmt(kpis.diff), styles: { fontStyle: 'bold' } },
      { content: `${kpis.diffPct.toFixed(1)}%`, styles: { fontStyle: 'bold' } },
    ]]

    autoTable(doc, {
      head, body, foot,
      startY: 60,
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [31, 41, 55], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 120, halign: 'right' },
        2: { cellWidth: 120, halign: 'right' },
        3: { cellWidth: 120, halign: 'right' },
        4: { cellWidth: 90,  halign: 'right' },
      },
      didDrawPage: (data) => {
        doc.setFontSize(14)
        const subt = `Rango: ${filters.startDate} a ${filters.endDate}${filters.placa ? ` · Placa: ${filters.placa}` : ''} · Método: ${metodo === 'tramos' ? 'Suma de tramos' : 'Min–Max'}`
        doc.text('Kilómetros — Detalle por vehículo', data.settings.margin.left, 28)
        doc.setFontSize(10)
        doc.text(subt, data.settings.margin.left, 44)
      }
    })

    doc.save(`km_${filters.startDate}_${filters.endDate}${filters.placa ? `_${filters.placa}` : ''}.pdf`)
  }

  // --------- UI auxiliares ---------
  const top10 = useMemo(() =>
    [...detallePlacas.rows].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 10),
    [detallePlacas.rows]
  )

  const [expanded, setExpanded] = useState(new Set())
  const toggleExpand = (placa) => {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(placa)) n.delete(placa); else n.add(placa)
      return n
    })
  }

  if (!user) return <p className="text-center mt-20">Cargando...</p>

  return (
    <div className="p-4">
      <Toaster position="top-center" richColors />
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4">

        {/* Título */}
        <h2 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2 text-[var(--primary)] border-b pb-2">
          <i className="fas fa-road text-[var(--primary)]"></i>
          Consultar Kilómetros Recorridos
        </h2>

        {/* Filtros */}
        <div className="bg-[var(--primary-dark)] text-white rounded-lg p-2 mb-2">
          <h3 className="text-xs font-bold mb-1">Filtros de Búsqueda</h3>

          {/* grid en 12 columnas para controlar anchos y evitar solapes */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs items-end">
            {/* Fecha inicio */}
            <div className="flex flex-col md:col-span-2 min-w-[140px]">
              <label className="mb-1">Fecha Inicio</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={onFilterChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              />
            </div>

            {/* Fecha fin */}
            <div className="flex flex-col md:col-span-2 min-w-[140px]">
              <label className="mb-1">Fecha Fin</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={onFilterChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              />
            </div>

            {/* Placa */}
            <div className="flex flex-col md:col-span-2 min-w-[140px]">
              <label className="mb-1">Placa</label>
              <select
                name="placa"
                value={filters.placa}
                onChange={onFilterChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              >
                <option value="">Toda la flota</option>
                {placas.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Método */}
            <div className="flex flex-col md:col-span-3">
              <label className="mb-1">Método de Cálculo</label>
              <div className="flex flex-wrap gap-3 items-center bg-white text-gray-800 rounded px-2 py-1">
                <label className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                  <input
                    type="radio"
                    name="metodo"
                    checked={metodo === 'tramos'}
                    onChange={() => setMetodo('tramos')}
                  />
                  Suma de tramos
                </label>
                <label className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                  <input
                    type="radio"
                    name="metodo"
                    checked={metodo === 'minmax'}
                    onChange={() => setMetodo('minmax')}
                  />
                  Min–Max
                </label>
              </div>
            </div>

            {/* Umbral */}
            <div className="flex flex-col md:col-span-3">
              <label className="mb-1 whitespace-normal">Umbral discrepancia (%)</label>
              <div className="flex items-center gap-3 bg-white text-gray-800 rounded px-2 py-1">
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={umbral}
                  onChange={(e) => setUmbral(clamp(Number(e.target.value), 0, 30))}
                  className="w-full"
                />
                <span className="text-xs font-semibold w-10 text-right">{umbral}%</span>
              </div>
            </div>

            {/* Botones */}
            <div className="md:col-span-12 flex flex-wrap justify-center md:justify-end gap-2 pt-1">
              <button
                onClick={consultar}
                disabled={loading}
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-2 py-1 rounded text-xs disabled:opacity-60"
              >
                <i className="fas fa-search"></i> {loading ? 'Consultando...' : 'Consultar'}
              </button>
              <button
                onClick={limpiar}
                className="bg-gray-500 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
              >
                <i className="fas fa-eraser"></i> Limpiar
              </button>
              <button
                onClick={exportXLSX}
                disabled={detallePlacas.rows.length === 0}
                className="bg-green-600 hover:bg-green-800 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
              >
                <i className="fas fa-file-excel"></i> Excel
              </button>
              <button
                onClick={exportPDF}
                disabled={detallePlacas.rows.length === 0}
                className="bg-red-600 hover:bg-red-800 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
              >
                <i className="fas fa-file-pdf"></i> PDF
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje */}
        <p className={`text-center text-xs mb-2 ${
          status.includes('❌') ? 'text-red-600' : status.includes('⚠️') ? 'text-yellow-600' : 'text-blue-700'
        }`}>{status}</p>

        {/* Pestañas */}
        <div className="flex gap-2 mb-3 text-xs">
          <button
            className={`px-3 py-1 rounded ${tab==='resumen' ? 'bg-[var(--primary)] text-white' : 'bg-gray-200'}`}
            onClick={()=> setTab('resumen')}
          >
            Resumen
          </button>
          <button
            className={`px-3 py-1 rounded ${tab==='detalle' ? 'bg-[var(--primary)] text-white' : 'bg-gray-200'}`}
            onClick={()=> setTab('detalle')}
          >
            Detalle por vehículo
          </button>
          <button
            className={`px-3 py-1 rounded ${tab==='calidad' ? 'bg-[var(--primary)] text-white' : 'bg-gray-200'}`}
            onClick={()=> setTab('calidad')}
          >
            Calidad de datos
          </button>
        </div>

        {/* Contenido de pestañas */}
        {tab === 'resumen' && (
          <div className="space-y-4">
            {/* KPIs: + 2 tarjetas de promedio diario flota */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-center">
                <div className="text-[10px] uppercase text-blue-700">KM Horarios</div>
                <div className="text-lg font-bold">{fmt(kpis.totalH)}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-center">
                <div className="text-[10px] uppercase text-emerald-700">KM Preoperacionales</div>
                <div className="text-lg font-bold">{fmt(kpis.totalP)}</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-center">
                <div className="text-[10px] uppercase text-amber-700">Diferencia</div>
                <div className="text-lg font-bold">{fmt(kpis.diff)} <span className="text-xs">({pct(kpis.diffPct)})</span></div>
              </div>
              <div className="bg-fuchsia-50 border border-fuchsia-200 rounded p-2 text-center">
                <div className="text-[10px] uppercase text-fuchsia-700">Discrepancias &gt; {umbral}%</div>
                <div className="text-lg font-bold">{kpis.nDiscrepantes}/{kpis.nVeh} <span className="text-xs">({pct(kpis.percDiscrepantes)})</span></div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-center">
                <div className="text-[10px] uppercase text-blue-700">Prom. diario flota (Horarios)</div>
                <div className="text-lg font-bold">{fmt(Math.round(kpisPromFlota.promH))}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-center">
                <div className="text-[10px] uppercase text-emerald-700">Prom. diario flota (Preop)</div>
                <div className="text-lg font-bold">{fmt(Math.round(kpisPromFlota.promP))}</div>
              </div>
            </div>

            {/* Top 10 Diferencia absoluta */}
            <div className="border rounded p-2">
              <div className="text-xs font-semibold mb-2">Top 10 diferencias absolutas (Horarios vs Preop)</div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top10}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="placa" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="kmHorarios" name="Horarios" fill="#2563eb"/>
                    <Bar dataKey="kmPreop" name="Preop" fill="#10b981"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evolución diaria */}
            <div className="border rounded p-2">
              <div className="text-xs font-semibold mb-2">Evolución por día (flota)</div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serieFlotaPorDia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="horarios" name="Horarios" stroke="#2563eb" dot={false} />
                    <Line type="monotone" dataKey="preop" name="Preop" stroke="#10b981" dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab === 'detalle' && (
          <div className="border rounded-lg overflow-hidden">
            {/* Toggle columna opcional */}
            <div className="flex items-center justify-end gap-2 px-2 pt-2 text-[11px]">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={showPromVeh}
                  onChange={(e)=> setShowPromVeh(e.target.checked)}
                />
                Mostrar columna “Prom. diario (Horarios)”
              </label>
            </div>

            <table className="w-full text-[11px] border-collapse">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="p-1 border text-center">Placa</th>
                  <th className="p-1 border text-center">KM Horarios</th>
                  <th className="p-1 border text-center">KM Preop</th>
                  {showPromVeh && <th className="p-1 border text-center">Prom. diario (Horarios)</th>}
                  <th className="p-1 border text-center">Diferencia</th>
                  <th className="p-1 border text-center">% Dif.</th>
                  <th className="p-1 border text-center">Flags</th>
                  <th className="p-1 border text-center">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {exportDetalleRows.length > 0 ? exportDetalleRows.map(r => {
                  const alerta = Math.abs(r.diffPct) > umbral
                  const rowsDia = detallePlacas.detalleDiaPorPlaca.get(r.placa) || []
                  const isOpen = expanded.has(r.placa)
                  return (
                    <FragmentRow
                      key={r.placa}
                      r={r}
                      alerta={alerta}
                      rowsDia={rowsDia}
                      isOpen={isOpen}
                      onToggle={() => toggleExpand(r.placa)}
                      showPromVeh={showPromVeh}
                    />
                  )
                }) : (
                  <tr>
                    <td colSpan={showPromVeh ? 8 : 7} className="text-center text-gray-500 p-2">
                      No hay resultados para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
              {exportDetalleRows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td className="p-1 border text-right">Totales:</td>
                    <td className="p-1 border text-center">{fmt(kpis.totalH)}</td>
                    <td className="p-1 border text-center">{fmt(kpis.totalP)}</td>
                    {showPromVeh && <td className="p-1 border text-center">—</td>}
                    <td className="p-1 border text-center">{fmt(kpis.diff)}</td>
                    <td className="p-1 border text-center">{kpis.diffPct.toFixed(1)}%</td>
                    <td className="p-1 border text-center" colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {tab === 'calidad' && (
          <div className="space-y-4">
            {/* Horarios */}
            <div className="border rounded">
              <div className="bg-gray-900 text-white px-3 py-1 rounded-t text-sm font-semibold">
                Horarios — Anomalías
              </div>
              <div className="p-2 text-xs">
                <div className="font-semibold mb-1 text-amber-700">Registros abiertos</div>
                <div className="overflow-x-auto border rounded mb-3">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="p-1 border">Placa</th>
                        <th className="p-1 border">Fecha Entrada</th>
                        <th className="p-1 border">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {horariosProc.anomalies.abiertos.length > 0 ? horariosProc.anomalies.abiertos.map((r, i)=>(
                        <tr key={i} className="odd:bg-white even:bg-gray-100">
                          <td className="p-1 border text-center">{r.placa}</td>
                          <td className="p-1 border text-center">{r.fecha_entrada || '-'}</td>
                          <td className="p-1 border text-center">{r.estado_registro || '-'}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={3} className="text-center text-gray-500 p-2">Sin registros.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="font-semibold mb-1 text-red-700">KM final menor que KM inicial</div>
                <div className="overflow-x-auto border rounded">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="p-1 border">Placa</th>
                        <th className="p-1 border">Fecha Entrada</th>
                        <th className="p-1 border">KM Inicial</th>
                        <th className="p-1 border">KM Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {horariosProc.anomalies.kmInvalidos.length > 0 ? horariosProc.anomalies.kmInvalidos.map((r, i)=>(
                        <tr key={i} className="odd:bg-white even:bg-gray-100">
                          <td className="p-1 border text-center">{r.placa}</td>
                          <td className="p-1 border text-center">{r.fecha_entrada || '-'}</td>
                          <td className="p-1 border text-center">{r.km_inicial ?? '-'}</td>
                          <td className="p-1 border text-center">{r.km_final ?? '-'}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} className="text-center text-gray-500 p-2">Sin registros.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Preoperacionales */}
            <div className="border rounded">
              <div className="bg-gray-900 text-white px-3 py-1 rounded-t text-sm font-semibold">
                Preoperacionales — Anomalías
              </div>
              <div className="p-2 text-xs">
                <div className="overflow-x-auto border rounded">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="p-1 border">Placa</th>
                        <th className="p-1 border">Fecha (prev)</th>
                        <th className="p-1 border">KM (prev)</th>
                        <th className="p-1 border">Fecha (curr)</th>
                        <th className="p-1 border">KM (curr)</th>
                        <th className="p-1 border">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preopProc.anomalies.noIncrementos.length > 0 ? preopProc.anomalies.noIncrementos.map((a, i)=>(
                        <tr key={i} className="odd:bg-white even:bg-gray-100">
                          <td className="p-1 border text-center">{a.placa}</td>
                          <td className="p-1 border text-center">{a.fecha_prev}</td>
                          <td className="p-1 border text-center">{a.km_prev}</td>
                          <td className="p-1 border text-center">{a.fecha_curr}</td>
                          <td className="p-1 border text-center">{a.km_curr}</td>
                          <td className="p-1 border text-center">{a.delta}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="text-center text-gray-500 p-2">Sin registros.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

// ========= Subcomponente: fila con expandible =========
function FragmentRow({ r, alerta, rowsDia, isOpen, onToggle, showPromVeh }) {
  // promedio diario del vehículo (según Horarios y días con datos)
  const daysVeh = Math.max(1, rowsDia.length) // días presentes en el detalle del vehículo
  const promVeh = r.kmHorarios > 0 ? Math.round(r.kmHorarios / daysVeh) : 0

  return (
    <>
      <tr className={`odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition ${alerta ? 'outline outline-1 outline-red-300' : ''}`}>
        <td className="p-1 border text-center">{r.placa}</td>
        <td className="p-1 border text-center">{fmt(r.kmHorarios)}</td>
        <td className="p-1 border text-center">{fmt(r.kmPreop)}</td>
        {showPromVeh && (
          <td className="p-1 border text-center">{fmt(promVeh)}</td>
        )}
        <td className="p-1 border text-center">{fmt(r.diff)}</td>
        <td className={`p-1 border text-center ${Math.abs(r.diffPct) > 10 ? 'text-red-700 font-semibold' : 'text-gray-700'}`}>
          {r.diffPct.toFixed(1)}%
        </td>
        <td className="p-1 border text-center">
          {Math.abs(r.diffPct) > 10 ? (
            <span className="px-2 py-[2px] rounded bg-red-100 text-red-700 text-[10px] border border-red-300">
              &gt;10%
            </span>
          ) : (
            '-'
          )}
        </td>
        <td className="p-1 border text-center">
          <button
            onClick={onToggle}
            className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-2 py-0.5 rounded text-xs"
          >
            {isOpen ? 'Ocultar' : 'Ver días'}
          </button>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-white">
          <td colSpan={showPromVeh ? 8 : 7} className="p-2 border-t">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="p-1 border text-center">Fecha</th>
                    <th className="p-1 border text-center">KM Horarios</th>
                    <th className="p-1 border text-center">KM Preop</th>
                    <th className="p-1 border text-center">Diferencia Día</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsDia.length > 0 ? rowsDia.map((d, i)=>(
                    <tr key={i} className="odd:bg-white even:bg-gray-100">
                      <td className="p-1 border text-center">{d.fecha}</td>
                      <td className="p-1 border text-center">{fmt(d.kmHorariosDia)}</td>
                      <td className="p-1 border text-center">{fmt(d.kmPreopDia)}</td>
                      <td className="p-1 border text-center">{fmt(d.diffDia)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-500 p-2">Sin datos por día.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
