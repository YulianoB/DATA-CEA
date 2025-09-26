'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Toaster, toast } from 'sonner'

// ====== Constantes / helpers ======
const ROLES = [
  { value: '', label: 'Todos' },
  { value: 'INSTRUCTOR TEORÍA', label: 'INSTRUCTOR TEORÍA' },
  { value: 'INSTRUCTOR PRÁCTICA', label: 'INSTRUCTOR PRÁCTICA' },
  { value: 'AUXILIAR ADMINISTRATIVO', label: 'AUXILIAR ADMINISTRATIVO' },
  { value: 'ADMINISTRATIVO', label: 'ADMINISTRATIVO' },
]

const fmtCOP = (n) => `$ ${Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
const num = (v) => Number(v ?? 0)
const todayBogota = () => {
  const opt = { year:'numeric', month:'2-digit', day:'2-digit', timeZone:'America/Bogota' }
  return new Intl.DateTimeFormat('en-CA', opt).format(new Date()) // YYYY-MM-DD
}
const isSunday = (ymd) => {
  if (!ymd) return false
  const m = String(ymd).match(/(\d{4}-\d{2}-\d{2})/)
  const s = m ? m[1] : String(ymd)
  const [y, mo, d] = s.split('-').map(x => parseInt(x, 10))
  if (![y, mo, d].every(n => Number.isFinite(n))) return false
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay() === 0 // 0=domingo
}
// Extrae YYYY-MM-DD si llega con tiempo
const onlyYMD = (s) => {
  const m = String(s || '').match(/^\d{4}-\d{2}-\d{2}/)
  return m ? m[0] : ''
}

// Numero a letras (simple, en ES, sin centavos)
function numeroALetras(num) {
  num = Math.round(Number(num) || 0)
  if (num === 0) return 'CERO PESOS'
  const UN = ["","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve"]
  const DIEZ15 = ["diez","once","doce","trece","catorce","quince"]
  const DEC = ["","","veinte","treinta","cuarenta","cincuenta","sesenta","setenta","ochenta","noventa"]
  const CEN = ["","ciento","doscientos","trescientos","cuatrocientos","quinientos","seiscientos","setecientos","ochocientos","novecientos"]
  const tres = (n)=>{
    if (n===0) return ""
    if (n===100) return "cien"
    const c=Math.floor(n/100), r=n%100, d=Math.floor(r/10), u=r%10
    const parts=[]
    if (c>0) parts.push(CEN[c])
    if (r>0){
      if (r<10) parts.push(UN[r])
      else if (r<=15) parts.push(DIEZ15[r-10])
      else if (r<20) parts.push("dieci"+UN[u])
      else if (r===20) parts.push("veinte")
      else if (r<30) parts.push("veinti"+(u===1?"uno":UN[u]))
      else {
        if (u===0) parts.push(DEC[d])
        else parts.push(DEC[d]+" y "+UN[u])
      }
    }
    return parts.join(" ").replace(/\s+/g," ").trim()
  }
  const grupos=[]
  let rest=num
  for(let i=0;i<4;i++){ grupos.unshift(rest%1000); rest=Math.floor(rest/1000) }
  const out=[]
  if (grupos[0]>0) out.push(grupos[0]===1?"mil millones":tres(grupos[0])+" mil millones")
  if (grupos[1]>0) out.push(grupos[1]===1?"un millón":tres(grupos[1])+" millones")
  if (grupos[2]>0) out.push(grupos[2]===1?"mil":tres(grupos[2])+" mil")
  if (grupos[3]>0) out.push(tres(grupos[3]))
  return (out.join(" ").replace(/\s+/g," ").trim()+" pesos").toUpperCase()
}

// Recargos (defaults por si no hay tabla en BD)
const FALLBACK_RECARGOS = {
  empresa: 1000,
  propio: 0,
  camion: 0,
}

// ====== Página ======
export default function HorariosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Filtros
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    role: '',
    userName: '', // nombre_completo
  })

  // Estado
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState([])

  // Select dependiente
  const [usuariosOptions, setUsuariosOptions] = useState([])

  // Resumen: botón habilitable solo tras consultar y con rol INSTRUCTOR PRÁCTICA
  const [resumenEnabled, setResumenEnabled] = useState(false)
  const [showResumen, setShowResumen] = useState(false)

  // Cuenta de cobro (modal)
  const [cobroOpen, setCobroOpen] = useState(false)
  const [cobro, setCobro] = useState({
    instructor: '',
    documento: '',
    basePago: 0,
    adicional: 0,
  })

  useEffect(() => {
    const s = localStorage.getItem('currentUser')
    if (!s) { router.push('/login'); return }
    setUser(JSON.parse(s))
    // cargar usuarios para "Todos" al entrar
    cargarUsuarios('')
  }, [router])

  // Cargar usuarios según rol
  const cargarUsuarios = async (rolValue) => {
    try {
      let q = supabase.from('usuarios').select('nombre_completo, rol')
      if (rolValue) q = q.eq('rol', rolValue)
      const { data, error } = await q
      if (error) throw error
      const uniques = Array.from(
        new Set((data || []).map(u => (u?.nombre_completo || '').trim()).filter(Boolean))
      )
      setUsuariosOptions(uniques)
    } catch (e) {
      console.error('Error cargando usuarios por rol:', e)
      setUsuariosOptions([])
    }
  }

  const onFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
    if (name === 'role') {
      // al cambiar rol, recargar opciones de usuario y limpiar usuario, ocultar resumen
      cargarUsuarios(value)
      setFilters(prev => ({ ...prev, userName: '' }))
      setShowResumen(false)
      // el botón resumen se controla al pulsar consultar
    }
    if (name === 'startDate' || name === 'endDate' || name === 'userName') {
      setShowResumen(false)
    }
  }

  // Validaciones fechas
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

  // Consultar
  const consultar = async () => {
    if (!validarFechas()) return
    setLoading(true)
    setStatus('Consultando datos...')
    setShowResumen(false)

    try {
      // 1) Datos base de horarios (solo cerrados)
      let q = supabase
        .from('horarios')
        .select(`
          id, fecha_entrada, hora_entrada, hora_salida,
          nombre_completo, placa, km_inicial, km_final,
          clases_programadas, clases_dictadas, num_aprendices,
          duracion_jornada, estado_registro, rol
        `)
        .gte('fecha_entrada', filters.startDate)
        .lte('fecha_entrada', filters.endDate)
        .order('fecha_entrada', { ascending: true })

      // estado cerrado (robusto)
      q = q.in('estado_registro', ['Cerrado', 'CERRADO'])

      if (filters.role) q = q.eq('rol', filters.role)
      if (filters.userName) q = q.eq('nombre_completo', filters.userName)

      const { data: baseRows, error } = await q
      if (error) throw error

      // 2) Mapas auxiliares para tarifa/pago
      const [{ data: usersMapRows }, { data: vehsMapRows }] = await Promise.all([
        supabase.from('usuarios').select('nombre_completo, valor_hora_propietario, valor_hora_empresa, valor_hora_camion'),
        supabase.from('vehiculos').select('placa, propietario, tipo_vehiculo'),
      ])

      // 2.5) Festivos del rango
      const { data: festivosRows, error: festErr } = await supabase
        .from('festivos')
        .select('fecha')
        .gte('fecha', filters.startDate)
        .lte('fecha', filters.endDate)
      if (festErr) throw festErr
      const festivosSet = new Set((festivosRows || []).map(f => String(f.fecha)))
      const esFestivoOdomingo = (ymd) => festivosSet.has(onlyYMD(ymd)) || isSunday(ymd)

      // 2.6) Recargos parametrizables
      let recargos = { ...FALLBACK_RECARGOS }
      try {
        const { data: prRows } = await supabase
          .from('parametros_recargos')
          .select('tipo, recargo')
        const map = new Map((prRows || []).map(r => [String(r?.tipo || '').toLowerCase(), Number(r?.recargo || 0)]))
        const emp = map.get('empresa')
        const pro = map.get('propio')
        const cam = map.get('camion')
        recargos = {
          empresa: Number.isFinite(emp) ? emp : recargos.empresa,
          propio: Number.isFinite(pro) ? pro : recargos.propio,
          camion: Number.isFinite(cam) ? cam : recargos.camion,
        }
      } catch (e) {
        console.warn('No fue posible leer parametros_recargos, usando valores por defecto.', e)
      }

      const usuariosMap = new Map(
        (usersMapRows || []).map(u => [String(u?.nombre_completo || '').trim(), u])
      )
      const vehiculosMap = new Map(
        (vehsMapRows || []).map(v => [String(v?.placa || '').trim(), v])
      )

      // 3) Procesar filas
      const procesadas = (baseRows || []).map(r => {
        const nombre = String(r?.nombre_completo || '').trim()
        const placa = String(r?.placa || '').trim()
        const u = usuariosMap.get(nombre) || {}
        const v = vehiculosMap.get(placa) || {}

        const kmIni = num(r?.km_inicial)
        const kmFin = num(r?.km_final)
        const kmRecorrido = Math.max(0, kmFin - kmIni)

        // Tipo/propiedad
        const tipo = String(v?.tipo_vehiculo || '').toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const esCamion = tipo === 'camion'
        const esPropio = String(v?.propietario || '').trim() === nombre

        // Tarifa base
        let tarifa = 0
        if (esCamion) tarifa = num(u?.valor_hora_camion)
        else if (esPropio) tarifa = num(u?.valor_hora_propietario)
        else tarifa = num(u?.valor_hora_empresa)

        // Recargo por domingo O festivo (tabla 'festivos' + tabla 'parametros_recargos')
        if (esFestivoOdomingo(r?.fecha_entrada)) {
          if (esCamion) tarifa += recargos.camion
          else if (esPropio) tarifa += recargos.propio
          else tarifa += recargos.empresa
        }

        const clases = parseInt(r?.clases_dictadas) || 0
        const pago = tarifa * clases

        return {
          id: r.id,
          fecha_entrada: r.fecha_entrada || '',
          nombre_completo: nombre || '',
          hora_entrada: r.hora_entrada || '',
          hora_salida: r.hora_salida || '',
          placa: placa || '',
          km_inicial: r.km_inicial ?? '',
          km_final: r.km_final ?? '',
          km_recorrido: kmRecorrido,
          clases_programadas: num(r.clases_programadas),
          clases_dictadas: clases,
          num_aprendices: num(r.num_aprendices),
          duracion_jornada: r.duracion_jornada ?? '',
          estado_registro: r.estado_registro || '',
          rol: r.rol || '',
          tarifa,
          pago,
        }
      })

      setRows(procesadas)
      setStatus(`Consulta completada. ${procesadas.length} registros encontrados.`)

      // 4) Habilitar/Deshabilitar botón "Resumen" según regla:
      //    Solo si se pulsó consultar y el rol actual es INSTRUCTOR PRÁCTICA.
      setResumenEnabled((filters.role || '').toUpperCase() === 'INSTRUCTOR PRÁCTICA')
    } catch (e) {
      console.error('Error consultando horarios:', e)
      setStatus('❌ Error al consultar horarios.')
      toast.error('❌ Error al consultar horarios.')
      setRows([])
      setResumenEnabled(false)
    } finally {
      setLoading(false)
    }
  }

  const limpiar = () => {
    setFilters({ startDate: '', endDate: '', role: '', userName: '' })
    setRows([])
    setStatus('')
    setResumenEnabled(false)
    setShowResumen(false)
    cargarUsuarios('') // volver a "Todos"
  }

  // Totales de la tabla
  const totals = useMemo(() => {
    const sum = (sel) => rows.reduce((acc, r) => acc + num(sel(r)), 0)
    return {
      km: sum(r => r.km_recorrido),
      pago: sum(r => r.pago),
      clasesDict: sum(r => r.clases_dictadas),
      clasesProg: sum(r => r.clases_programadas),
      aprendices: sum(r => r.num_aprendices),
    }
  }, [rows])

  // Resumen (simple): por instructor y por placa
  const resumenData = useMemo(() => {
    if (!showResumen) return { porInstructor: [], global: { clases: 0, km: 0, pago: 0 } }
    const map = new Map() // nombre -> {porPlaca: Map, totales}
    let gClases = 0, gKm = 0, gPago = 0

    for (const r of rows) {
      const inst = r.nombre_completo || 'SIN NOMBRE'
      const placa = r.placa || 'SIN PLACA'
      if (!map.has(inst)) map.set(inst, { porPlaca: new Map(), totales: { clases: 0, km: 0, pago: 0 } })
      const obj = map.get(inst)
      if (!obj.porPlaca.has(placa)) obj.porPlaca.set(placa, { clases: 0, km: 0, pago: 0 })

      obj.porPlaca.get(placa).clases += num(r.clases_dictadas)
      obj.porPlaca.get(placa).km += num(r.km_recorrido)
      obj.porPlaca.get(placa).pago += num(r.pago)

      obj.totales.clases += num(r.clases_dictadas)
      obj.totales.km += num(r.km_recorrido)
      obj.totales.pago += num(r.pago)

      gClases += num(r.clases_dictadas)
      gKm += num(r.km_recorrido)
      gPago += num(r.pago)
    }

    const porInstructor = Array.from(map.entries()).map(([nombre, v]) => ({
      nombre,
      porPlaca: Array.from(v.porPlaca.entries()).map(([placa, x]) => ({ placa, ...x })),
      totales: v.totales
    }))

    return { porInstructor, global: { clases: gClases, km: gKm, pago: gPago } }
  }, [rows, showResumen])

  // ===== Cuenta de Cobro (modal) =====
  const openCobro = async (instructor, basePago) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('documento')
        .eq('nombre_completo', instructor)
        .limit(1)
        .single()
      if (error) throw error
      setCobro({
        instructor,
        documento: String(data?.documento || ''),
        basePago: Number(basePago || 0),
        adicional: 0,
      })
      setCobroOpen(true)
    } catch (e) {
      toast.error('No se pudo obtener el documento del instructor.')
      console.error(e)
    }
  }
  const closeCobro = () => setCobroOpen(false)
  const onAdicionalChange = (e) => {
    const v = e.target.value.replace(/\D/g, '')
    setCobro(prev => ({ ...prev, adicional: Number(v || 0) }))
  }
  const imprimirCobro = () => {
    const el = document.getElementById('cobro-print-area')
    if (!el) return
    const html = el.innerHTML
    const win = window.open('', '_blank', 'width=800,height=900')
    win.document.write(`
      <html>
        <head>
          <title>Cuenta de Cobro</title>
          <style>
            @page { size: A4; margin: 3cm; }
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            h2, h3, h4 { text-align: center; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  // Exports
  const exportXLSX = async () => {
    if (rows.length === 0) { toast.info('No hay datos para exportar.'); return }
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([import('exceljs'), import('file-saver')])

    const wb = new ExcelJS.Workbook()
    wb.creator = 'CEA'
    wb.created = new Date()

    const ws = wb.addWorksheet('Horarios')
    const HEAD = [
      'Fecha','Nombre','Hora Entrada','Hora Salida','Placa',
      'KM Inicial','KM Final','KM Recorrido',
      'Clases Prog.','Clases Dict.','Num. Aprendices','Duración','Estado',
      'Tarifa','Pago'
    ]
    ws.addRow(HEAD)
    const hr = ws.getRow(1)
    hr.eachCell(c => {
      c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1F2937' } }
      c.font = { color:{ argb:'FFFFFFFF' }, bold:true }
      c.alignment = { vertical:'middle', horizontal:'center', wrapText:true }
    })
    hr.height = 22

    rows.forEach(r => ws.addRow([
      r.fecha_entrada, r.nombre_completo, r.hora_entrada, r.hora_salida, r.placa,
      r.km_inicial, r.km_final, r.km_recorrido,
      r.clases_programadas, r.clases_dictadas, r.num_aprendices, r.duracion_jornada, r.estado_registro,
      r.tarifa, r.pago
    ]))

    // Formato numérico
    ;[6,7,8,9,10,11,14,15].forEach(i => ws.getColumn(i).numFmt = '#,##0')

    // Ajuste de anchos (dar más a Fecha y Pago)
    ws.getColumn(1).width = Math.max(ws.getColumn(1).width || 14, 18) // Fecha
    ws.getColumn(15).width = Math.max(ws.getColumn(15).width || 14, 18) // Pago

    // Auto-ajuste básico adicional
    for (let i=1;i<=HEAD.length;i++) {
      let max = HEAD[i-1].length
      ws.eachRow({ includeEmpty:false }, row => {
        const v = row.getCell(i).value
        const s = v==null ? '' : String(v)
        max = Math.max(max, Math.min(s.length, 40))
      })
      ws.getColumn(i).width = Math.max(ws.getColumn(i).width || 10, Math.min(16 + max, 32))
    }
    ws.views = [{ state:'frozen', ySplit:1 }]

    // Totales (alineados con columnas)
    const t = ws.addRow([
      'TOTALES','','','','','', '', totals.km, totals.clasesProg, totals.clasesDict, totals.aprendices,'','', '', totals.pago
    ])
    t.font = { bold:true }
    ;[8,9,10,11,15].forEach(i => t.getCell(i).numFmt = '#,##0')

    const buf = await wb.xlsx.writeBuffer({ useStyles:true, useSharedStrings:true })
    const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `horarios_${filters.startDate}_${filters.endDate}.xlsx`)
  }

  const exportPDF = async () => {
    if (rows.length === 0) { toast.info('No hay datos para exportar.'); return }
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])

    const doc = new jsPDF({ orientation:'landscape', unit:'pt', format:'a4' })
    const head = [[
      'Fecha','Nombre','H. Ent.','H. Sal.','Placa',
      'KM Ini','KM Fin','KM Rec.',
      'Prog.','Dict.','Aprend.','Duración','Estado',
      'Tarifa','Pago'
    ]]
    const body = rows.map(r => [
      r.fecha_entrada, r.nombre_completo, r.hora_entrada, r.hora_salida, r.placa,
      r.km_inicial, r.km_final, r.km_recorrido,
      r.clases_programadas, r.clases_dictadas, r.num_aprendices, r.duracion_jornada, r.estado_registro,
      r.tarifa.toLocaleString('es-CO'), r.pago.toLocaleString('es-CO')
    ])
    const foot = [[
      { content:'TOTALES', colSpan:7, styles:{ halign:'right', fontStyle:'bold' } }, // 1..7
      { content: totals.km.toLocaleString('es-CO'), styles:{ fontStyle:'bold' } },  // 8
      { content: totals.clasesProg.toLocaleString('es-CO') },                        // 9
      { content: totals.clasesDict.toLocaleString('es-CO') },                        // 10
      { content: totals.aprendices.toLocaleString('es-CO') },                        // 11
      { content:'' }, { content:'' },                                                // 12,13
      { content:'' },                                                                // 14 Tarifa
      { content: totals.pago.toLocaleString('es-CO'), styles:{ fontStyle:'bold' } }, // 15 Pago
    ]]

    autoTable(doc, {
      head, body, foot,
      startY: 60,
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [31,41,55], textColor: 255 },
      columnStyles: {
        0:{ cellWidth:100 }, 1:{ cellWidth:140 }, 2:{ cellWidth:56 }, 3:{ cellWidth:56 }, 4:{ cellWidth:64 },
        5:{ cellWidth:60, halign:'right' }, 6:{ cellWidth:60, halign:'right' }, 7:{ cellWidth:64, halign:'right' },
        8:{ cellWidth:56, halign:'right' }, 9:{ cellWidth:56, halign:'right' }, 10:{ cellWidth:70, halign:'right' },
        11:{ cellWidth:70 }, 12:{ cellWidth:74 },
        13:{ cellWidth:72, halign:'right' }, 14:{ cellWidth:100, halign:'right' }, // Pago más ancho
      },
      didDrawPage: (data) => {
        doc.setFontSize(14)
        doc.text(`Horarios (${filters.startDate} a ${filters.endDate})`, data.settings.margin.left, 28)
      }
    })

    doc.save(`horarios_${filters.startDate}_${filters.endDate}.pdf`)
  }

  if (!user) return <p className="text-center mt-20">Cargando...</p>

  return (
    <div className="p-4">
      <Toaster position="top-center" richColors />
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4">

        {/* Título */}
        <h2 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2 text-[var(--primary)] border-b pb-2">
          <i className="fas fa-calendar-alt text-[var(--primary)]"></i>
          Consultar Horarios
        </h2>

        {/* Filtros */}
        <div className="bg-[var(--primary-dark)] text-white rounded-lg p-2 mb-2">
          <h3 className="text-xs font-bold mb-1">Filtros de Búsqueda</h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs items-end">
            {/* Fechas */}
            <div className="flex flex-col md:col-span-2">
              <label className="mb-1">Fecha Inicio</label>
              <input
                type="date" name="startDate" value={filters.startDate} onChange={onFilterChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              />
            </div>
            <div className="flex flex-col md:col-span-2">
              <label className="mb-1">Fecha Fin</label>
              <input
                type="date" name="endDate" value={filters.endDate} onChange={onFilterChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              />
            </div>

            {/* Rol */}
            <div className="flex flex-col md:col-span-3">
              <label className="mb-1">Rol</label>
              <select
                name="role" value={filters.role} onChange={onFilterChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {/* Usuario dependiente de Rol */}
            <div className="flex flex-col md:col-span-3">
              <label className="mb-1">Usuario</label>
              <select
                name="userName" value={filters.userName} onChange={onFilterChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              >
                <option value="">Todos</option>
                {usuariosOptions.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* Acciones */}
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
                disabled={rows.length === 0}
                className="bg-green-600 hover:bg-green-800 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
              >
                <i className="fas fa-file-excel"></i> Excel
              </button>
              <button
                onClick={exportPDF}
                disabled={rows.length === 0}
                className="bg-red-600 hover:bg-red-800 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
              >
                <i className="fas fa-file-pdf"></i> PDF
              </button>

              {/* Botón Resumen: SOLO se habilita al darle Consultar y si rol = INSTRUCTOR PRÁCTICA */}
              <button
                onClick={() => setShowResumen(true)}
                disabled={!resumenEnabled || rows.length === 0}
                className={`px-2 py-1 rounded text-xs ${resumenEnabled && rows.length>0 ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-amber-400/60 text-white cursor-not-allowed'}`}
                title="Solo para INSTRUCTOR PRÁCTICA después de Consultar"
              >
                <i className="fas fa-chart-pie"></i> Resumen
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje */}
        <p className={`text-center text-xs mb-2 ${
          status.includes('❌') ? 'text-red-600' : status.includes('⚠️') ? 'text-yellow-600' : 'text-blue-700'
        }`}>{status}</p>

        {/* Tabla resultados */}
        <div className="overflow-x-auto border rounded-lg shadow">
          <table className="w-full text-[11px] border-collapse">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-1 border text-center whitespace-nowrap w-[110px]">Fecha</th>
                <th className="p-1 border text-center">Nombre</th>
                <th className="p-1 border text-center">H. Entrada</th>
                <th className="p-1 border text-center">H. Salida</th>
                <th className="p-1 border text-center">Placa</th>
                <th className="p-1 border text-center">KM Inicial</th>
                <th className="p-1 border text-center">KM Final</th>
                <th className="p-1 border text-center">KM Recorrido</th>
                <th className="p-1 border text-center">Clases Prog.</th>
                <th className="p-1 border text-center">Clases Dict.</th>
                <th className="p-1 border text-center">Aprendices</th>
                <th className="p-1 border text-center">Duración</th>
                <th className="p-1 border text-center">Estado</th>
                <th className="p-1 border text-center">Tarifa</th>
                <th className="p-1 border text-center whitespace-nowrap w-[120px]">Pago</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map(r => (
                <tr key={r.id} className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition">
                  <td className="p-1 border text-center whitespace-nowrap">{r.fecha_entrada}</td>
                  <td className="p-1 border text-center">{r.nombre_completo}</td>
                  <td className="p-1 border text-center">{r.hora_entrada || '-'}</td>
                  <td className="p-1 border text-center">{r.hora_salida || '-'}</td>
                  <td className="p-1 border text-center">{r.placa}</td>
                  <td className="p-1 border text-center">{r.km_inicial ?? '-'}</td>
                  <td className="p-1 border text-center">{r.km_final ?? '-'}</td>
                  <td className="p-1 border text-center">{r.km_recorrido.toLocaleString('es-CO')}</td>
                  <td className="p-1 border text-center">{(r.clases_programadas ?? 0).toLocaleString('es-CO')}</td>
                  <td className="p-1 border text-center">{r.clases_dictadas}</td>
                  <td className="p-1 border text-center">{(r.num_aprendices ?? 0).toLocaleString('es-CO')}</td>
                  <td className="p-1 border text-center">{r.duracion_jornada ?? '-'}</td>
                  <td className="p-1 border text-center">{r.estado_registro}</td>
                  <td className="p-1 border text-center whitespace-nowrap">{fmtCOP(r.tarifa)}</td>
                  <td className="p-1 border text-center whitespace-nowrap font-semibold text-[var(--primary-dark)]">
                    {fmtCOP(r.pago)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={15} className="text-center text-gray-500 p-2">
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Totales (alineados por columna) */}
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className="p-1 border text-right" colSpan={7}>Totales:</td>
                <td className="p-1 border text-center">{totals.km.toLocaleString('es-CO')}</td>
                <td className="p-1 border text-center">{totals.clasesProg.toLocaleString('es-CO')}</td>
                <td className="p-1 border text-center">{totals.clasesDict.toLocaleString('es-CO')}</td>
                <td className="p-1 border text-center">{totals.aprendices.toLocaleString('es-CO')}</td>
                <td className="p-1 border text-center" colSpan={3}></td>
                <td className="p-1 border text-center">{fmtCOP(totals.pago)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {showResumen && resumenEnabled && (
        <div className="mt-3 border rounded">
          <div className="bg-amber-600 text-white px-3 py-1 rounded-t text-sm font-semibold flex items-center justify-between">
            <span>Resumen — INSTRUCTOR PRÁCTICA</span>
            <button
              className="text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-[2px]"
              onClick={() => setShowResumen(false)}
            >
              Ocultar
            </button>
          </div>

          <div className="p-2 text-xs">
            {resumenData.porInstructor.length === 0 ? (
              <p className="text-red-600">⚠️ No hay datos para generar el resumen.</p>
            ) : (
              <>
                <div className="mb-2 text-[11px] text-gray-700">
                  <b>Rango:</b> {filters.startDate} a {filters.endDate}
                  {filters.userName ? <> · <b>Instructor:</b> {filters.userName}</> : null}
                </div>

                <div className="space-y-3">
                  {resumenData.porInstructor.map((inst) => (
                    <div key={inst.nombre} className="border rounded">
                      <div className="bg-blue-50 border-b px-2 py-1 font-semibold text-blue-700">
                        👨‍🏫 {inst.nombre}
                      </div>

                      <div className="p-2">
                        {/* Subtotales por placa */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {inst.porPlaca.map((p) => (
                            <div key={p.placa} className="bg-emerald-50 border border-emerald-200 rounded p-2">
                              <div className="font-semibold text-emerald-700">Placa {p.placa}</div>
                              <div>Clases: {Number(p.clases || 0).toLocaleString('es-CO')}</div>
                              <div>KM: {Number(p.km || 0).toLocaleString('es-CO')}</div>
                              <div>
                                Valor: <b>{fmtCOP(p.pago)}</b>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Total por instructor */}
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2 font-semibold">
                          Total {inst.nombre}:&nbsp;
                          Clases {Number(inst.totales.clases || 0).toLocaleString('es-CO')} ·&nbsp;
                          KM {Number(inst.totales.km || 0).toLocaleString('es-CO')} ·&nbsp;
                          Valor {fmtCOP(inst.totales.pago)}
                        </div>

                        {/* Botón Cuenta de Cobro: solo cuando se eligió un instructor específico en el filtro */}
                        {filters.userName && filters.userName.trim() !== '' && (
                          <div className="mt-2">
                            <button
                              className="px-2 py-1 rounded text-xs bg-slate-700 hover:bg-slate-800 text-white"
                              onClick={() => openCobro(inst.nombre, inst.totales.pago)}
                              title="Generar cuenta de cobro para este instructor"
                            >
                              🧾 Generar Cuenta de Cobro
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

            {/* Totales globales solo cuando el filtro es 'Todos' */}
            {(!filters.userName || filters.userName.trim() === '') && (
              <div className="bg-teal-50 border-2 border-teal-400 rounded p-2 font-semibold">
                🌍 Totales generales:&nbsp;
                Clases {Number(resumenData.global.clases || 0).toLocaleString('es-CO')} ·&nbsp;
                KM {Number(resumenData.global.km || 0).toLocaleString('es-CO')} ·&nbsp;
                Valor {fmtCOP(resumenData.global.pago)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  </div>
)}


        {/* ===== Modal Cuenta de Cobro ===== */}
        {cobroOpen && (
          <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[720px]">
              <div className="px-3 py-2 border-b flex items-center justify-between">
                <div className="font-semibold text-sm">🧾 Cuenta de Cobro</div>
                <button className="text-xs px-2 py-[2px] rounded bg-gray-200 hover:bg-gray-300" onClick={closeCobro}>Cerrar</button>
              </div>

              <div className="p-3 text-[12px] space-y-3">
                {/* Valores y controles */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <div className="text-gray-600">Instructor</div>
                    <div className="font-semibold">{cobro.instructor}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Documento</div>
                    <div className="font-semibold">{cobro.documento || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Periodo</div>
                    <div className="font-semibold">{filters.startDate} a {filters.endDate}</div>
                  </div>
                  <div className="ml-auto">
                    <label className="block text-gray-600">+ Valor adicional</label>
                    <input
                      value={cobro.adicional.toLocaleString('es-CO')}
                      onChange={onAdicionalChange}
                      className="border rounded px-2 py-1 w-36 text-right"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {/* Área imprimible */}
                <div id="cobro-print-area" className="border rounded p-4">
                  <div className="text-left">Bogotá D.C., {new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}</div>
                  <h2 className="text-center text-lg font-bold mt-8">CUENTA DE COBRO</h2>
                  <h3 className="text-center font-semibold">CEA COLOMBIANA DE CONDUCCIÓN J&amp;Y S.A.S.</h3>
                  <h4 className="text-center">NIT: 901291597</h4>

                  <h3 className="text-center mt-6">DEBE A:</h3>
                  <h3 className="text-center mt-2 font-semibold">{cobro.instructor}</h3>
                  <h4 className="text-center">C.C. {cobro.documento || '—'}</h4>

                  {(() => {
                    const total = (cobro.basePago + cobro.adicional)
                    return (
                      <>
                        <h3 className="text-center mt-4">La suma de:</h3>
                        <h3 className="text-center font-semibold">{numeroALetras(total)}</h3>
                        <h4 className="text-center">({(total).toLocaleString('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 })})</h4>
                        <p className="mt-6 text-justify">
                          POR CONCEPTO DE: Clases dictadas en CEA COLOMBIANA DE CONDUCCIÓN J&amp;Y,
                          en el periodo de {filters.startDate} hasta {filters.endDate}.
                        </p>
                      </>
                    )
                  })()}
                </div>

                {/* Botonera */}
                <div className="flex justify-end gap-2">
                  <button
                    className="px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-800 text-xs"
                    onClick={imprimirCobro}
                  >
                    🖨️ Imprimir / Guardar PDF
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                    onClick={closeCobro}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
