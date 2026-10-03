// lib/sinst/generarSiniestrosExcel.js

import ExcelJS from 'exceljs'

const DESCRIPCION_OFICIAL_A1 =
  'Registro   de vehículos siniestrados, con mínimo los siguientes campos: Fecha del   siniestro, nivel de pérdida (fatalidad, heridos graves, heridos leves o   choque simple), número de personas implicadas por cada nivel, placa del   vehículo implicado de la empresa, nombre del conductor implicado de la   empresa, identificación del conductor implicado de la empresa, consecutivo   del Informe Policial de Accidentes de Tránsito (IPAT) en el RNAT del RUNT,   nombre del organismo de tránsito o autoridad que elaboró el IPAT, fecha del   comité donde fue analizado'

function texto(valor) {
  return String(valor ?? '').trim()
}

function numero(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function fechaExcel(valor) {
  if (!valor) return ''
  const partes = String(valor).slice(0, 10).split('-')
  if (partes.length !== 3) return texto(valor)
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function nivelPerdida(item) {
  const niveles = []

  if (numero(item?.fatalidades) > 0) niveles.push('FATALIDAD')
  if (numero(item?.heridos_graves) > 0) niveles.push('HERIDOS GRAVES')
  if (numero(item?.heridos_leves) > 0) niveles.push('HERIDOS LEVES')

  if (niveles.length === 0) {
    const tipo = texto(item?.tipo_siniestro).toUpperCase()
    return tipo || 'CHOQUE SIMPLE'
  }

  return niveles.join(' / ')
}

function personasPorNivel(item) {
  const partes = []
  const fatalidades = numero(item?.fatalidades)
  const graves = numero(item?.heridos_graves)
  const leves = numero(item?.heridos_leves)

  if (fatalidades > 0) partes.push(`Fatalidad: ${fatalidades}`)
  if (graves > 0) partes.push(`Heridos graves: ${graves}`)
  if (leves > 0) partes.push(`Heridos leves: ${leves}`)

  if (partes.length === 0) {
    partes.push(`Choque simple: ${numero(item?.num_personas_involucradas)}`)
  }

  return partes.join(' | ')
}

export async function generarSiniestrosExcel({
  supabaseAdmin,
  empresa,
  nit,
  anio,
  trimestre,
}) {
  const inicioMes = (trimestre - 1) * 3 + 1
  const fechaInicio = `${anio}-${String(inicioMes).padStart(2, '0')}-01`
  const fechaFin = trimestre === 4
    ? `${anio + 1}-01-01`
    : `${anio}-${String(inicioMes + 3).padStart(2, '0')}-01`

  const { data, error } = await supabaseAdmin
    .from('siniestros')
    .select(`
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
      numero_ipat,
      autoridad,
      fecha_comite_analisis
    `)
    .gte('fecha_siniestro', fechaInicio)
    .lt('fecha_siniestro', fechaFin)
    .order('fecha_siniestro', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'DATA-CEA'
  workbook.created = new Date()

  const hoja = workbook.addWorksheet('Registro siniestros', {
    views: [{ state: 'frozen', ySplit: 7 }],
  })

  const nombreEmpresa =
    empresa?.nombre || empresa?.nombre_empresa || empresa?.razon_social || ''

  hoja.mergeCells('A1:J1')
  hoja.getCell('A1').value = 'SINST - VIGIA 2 · FORMULARIO A · EVIDENCIA 1'
  hoja.getCell('A1').font = { bold: true, size: 14 }
  hoja.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
  hoja.getRow(1).height = 24

  hoja.mergeCells('A2:J2')
  hoja.getCell('A2').value = 'Registro de vehículos siniestrados'
  hoja.getCell('A2').font = { bold: true, size: 12 }
  hoja.getCell('A2').alignment = { horizontal: 'center' }

  hoja.getCell('A3').value = 'CEA'
  hoja.getCell('B3').value = nombreEmpresa
  hoja.getCell('F3').value = 'NIT'
  hoja.getCell('G3').value = nit
  hoja.getCell('A4').value = 'Vigencia'
  hoja.getCell('B4').value = anio
  hoja.getCell('F4').value = 'Trimestre'
  hoja.getCell('G4').value = trimestre

  hoja.mergeCells('A5:J5')
  hoja.getCell('A5').value = DESCRIPCION_OFICIAL_A1.replace(/\s+/g, ' ').trim()
  hoja.getCell('A5').alignment = { wrapText: true, vertical: 'top' }
  hoja.getRow(5).height = 46

  const encabezados = [
    'Fecha del siniestro',
    'Nivel de pérdida',
    'Número de personas implicadas por cada nivel',
    'Placa del vehículo implicado de la empresa',
    'Nombre del conductor implicado de la empresa',
    'Identificación del conductor implicado de la empresa',
    'Consecutivo del IPAT en el RNAT del RUNT',
    'Organismo de tránsito o autoridad que elaboró el IPAT',
    'Fecha del comité donde fue analizado',
    'Consecutivo interno',
  ]

  const filaEncabezado = hoja.getRow(7)
  encabezados.forEach((valor, index) => {
    const celda = filaEncabezado.getCell(index + 1)
    celda.value = valor
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    celda.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF475569' },
    }
    celda.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' }
    celda.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    }
  })
  filaEncabezado.height = 58

  for (const item of data || []) {
    const fila = hoja.addRow([
      fechaExcel(item.fecha_siniestro),
      nivelPerdida(item),
      personasPorNivel(item),
      texto(item.placa),
      texto(item.nombre_conductor_implicado),
      texto(item.documento),
      texto(item.numero_ipat),
      texto(item.autoridad),
      fechaExcel(item.fecha_comite_analisis),
      texto(item.consecutivo),
    ])

    fila.alignment = { vertical: 'top', wrapText: true }
    fila.eachCell((celda) => {
      celda.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      }
    })
  }

  if (!data?.length) {
    hoja.mergeCells('A8:J8')
    hoja.getCell('A8').value =
      'Durante el período consultado no se presentaron siniestros viales.'
    hoja.getCell('A8').alignment = { horizontal: 'center', vertical: 'middle' }
    hoja.getCell('A8').font = { italic: true }
    hoja.getRow(8).height = 30
  }

  const anchos = [16, 24, 34, 22, 32, 24, 25, 38, 24, 20]
  anchos.forEach((width, index) => {
    hoja.getColumn(index + 1).width = width
  })

  hoja.autoFilter = { from: 'A7', to: 'J7' }
  hoja.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return {
    buffer: Buffer.from(buffer),
    totalRegistros: data?.length || 0,
    descripcionOficial: DESCRIPCION_OFICIAL_A1,
  }
}
