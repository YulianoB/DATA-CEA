// app/api/reuniones/[id]/asistentes.xlsx/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Utilidades Bogotá
function fmtBogota(d = new Date()) {
  const tz = 'America/Bogota'
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d) // YYYY-MM-DD
  const hora  = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(d) // HH:mm:ss
  return { fecha, hora }
}
function toBogotaDateTime(isoLike) {
  if (!isoLike) return ''
  const dt = new Date(isoLike)
  const { fecha, hora } = fmtBogota(dt)
  return `${fecha} ${hora}`
}

export async function GET(_req, { params }) {
  try {
    const { id } = params || {}
    if (!id) {
      return NextResponse.json({ status: 'error', message: 'Falta id de reunión.' }, { status: 400 })
    }

    // 1) Reunión
    const { data: reunion, error: eReu } = await supabase
      .from('reuniones')
      .select('*')
      .eq('id', id)
      .single()
    if (eReu || !reunion) {
      return NextResponse.json({ status: 'error', message: 'Reunión no encontrada.' }, { status: 404 })
    }

    // 2) Asistencias
    const { data: asistencias, error: eAsis } = await supabase
      .from('asistencias')
      .select('documento_usuario,nombre_usuario,rol_usuario,timestamp_asistencia')
      .eq('id_reunion', id)
      .order('timestamp_asistencia', { ascending: true })
    if (eAsis) {
      return NextResponse.json({ status: 'error', message: 'No fue posible leer asistencias.' }, { status: 400 })
    }

    // 3) Enriquecer con teléfono y email (opcional)
    const documentos = Array.from(new Set((asistencias || []).map(a => a.documento_usuario).filter(Boolean)))
    let porDoc = {}
    if (documentos.length > 0) {
      const filtros = documentos.map(d => `documento.eq.${d}`).join(',')
      const { data: usuariosRows } = await supabase
        .from('usuarios')
        .select('documento,telefono,email')
        .or(filtros)
      porDoc = Object.fromEntries((usuariosRows || []).map(u => [String(u.documento), { telefono: u.telefono || '-', email: u.email || '-' }]))
    }

    // 4) Crear Excel con formato corporativo
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    wb.creator = 'CEA'
    wb.created = new Date()

    const ws = wb.addWorksheet('Asistentes', {
      pageSetup: {
        paperSize: 1, // Letter
        orientation: 'landscape',
        margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
      },
      properties: { defaultRowHeight: 18 },
      views: [{ state: 'frozen', ySplit: 5 }], // congela hasta la fila 4 (título+metadatos) y deja libres desde el header en fila 5
    })

    // Estilos
    const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
    const HEADER_FONT = { color: { argb: 'FFFFFFFF' }, bold: true }
    const CENTER = { vertical: 'middle', horizontal: 'center', wrapText: true }
    const THIN_BORDER = { style: 'thin', color: { argb: 'FF9CA3AF' } }

    // ===== Encabezado =====
    const { fecha: hoy, hora: ahora } = fmtBogota()
    const titulo = `REGISTRO DE ASISTENCIA — ${reunion.tipo_reunion}`
    ws.mergeCells('A1:G1')
    const r1 = ws.getCell('A1')
    r1.value = titulo
    r1.font = { bold: true, size: 16 }
    r1.alignment = CENTER
    ws.getRow(1).height = 26

    // Fila 2: Descripción (con "Descripción:" en negrilla)
    ws.mergeCells('A2:G2')
    const r2 = ws.getCell('A2')
    r2.value = {
      richText: [
        { text: 'Descripción: ', font: { bold: true } },
        { text: String(reunion.descripcion || '-').trim() },
      ]
    }
    r2.font = { size: 11, color: { argb: 'FF374151' } }
    r2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

    // Fila 3: Metadatos con etiquetas en negrilla
    ws.mergeCells('A3:G3')
    const r3 = ws.getCell('A3')
    const metaParts = [
      { label: 'Fecha', value: reunion.fecha_programada },
      { label: 'Hora', value: `${reunion.hora_inicio} - ${reunion.hora_fin}` },
      { label: 'Modalidad', value: reunion.modalidad },
      { label: 'Responsable', value: reunion.responsable || '-' },
      { label: 'Dirigido a', value: reunion.dirigido_a || 'Todo el personal' },
      { label: 'Lugar', value: reunion.lugar || '-' },
      { label: 'Estado', value: reunion.estado },
      { label: 'Generado', value: `${hoy} ${ahora} (Bogotá)` },
    ]
    const sep = '   ·   '
    const rich = []
    metaParts.forEach((p, idx) => {
      rich.push({ text: `${p.label}: `, font: { bold: true } })
      rich.push({ text: `${p.value}` })
      if (idx < metaParts.length - 1) rich.push({ text: sep })
    })
    r3.value = { richText: rich }
    r3.font = { size: 10, color: { argb: 'FF374151' } }
    r3.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    ws.getRow(2).height = 18
    ws.getRow(3).height = 18

    // Fila 4: separador vacío
    ws.mergeCells('A4:G4')
    ws.getCell('A4').value = ''

    // ===== Encabezados de tabla (fila 5) =====
    const HEAD = ['#', 'Nombre', 'Documento', 'Rol', 'Teléfono', 'Email', 'Asistió (Bogotá)']
    ws.addRow(HEAD)
    const headRow = ws.getRow(5)
    headRow.eachCell(c => {
      c.fill = HEADER_FILL
      c.font = HEADER_FONT
      c.alignment = CENTER
      c.border = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER }
    })
    headRow.height = 20

    // Datos
    const rows = (asistencias || []).map((a, i) => ([
      i + 1,
      a.nombre_usuario || '-',
      a.documento_usuario || '-',
      a.rol_usuario || '-',
      porDoc[a.documento_usuario]?.telefono || '-',
      porDoc[a.documento_usuario]?.email || '-',
      toBogotaDateTime(a.timestamp_asistencia),
    ]))
    rows.forEach(r => {
      const rr = ws.addRow(r)
      rr.alignment = { vertical: 'middle' }
      rr.eachCell(c => {
        c.border = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER }
      })
    })

    // Anchos de columna
    const widths = [5, 32, 16, 16, 16, 30, 22]
    widths.forEach((w, i) => ws.getColumn(i + 1).width = w)

    // Pie (totales)
    const total = rows.length
    const foot = ws.addRow(['', '', '', '', '', 'Total asistentes:', total])
    foot.font = { bold: true }
    foot.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' }
    foot.eachCell(c => { c.border = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER } })

    // Entregar archivo
    const buffer = await wb.xlsx.writeBuffer()
    const filenameSafe = `${(reunion.tipo_reunion || 'Reunion').replace(/[^\p{L}\p{N}\s_-]+/gu, '')}_${reunion.fecha_programada}.xlsx`

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filenameSafe}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 })
  }
}
