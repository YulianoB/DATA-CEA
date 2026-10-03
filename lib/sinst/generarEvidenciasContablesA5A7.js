// lib/sinst/generarEvidenciasContablesA5A7.js
import ExcelJS from 'exceljs'

const CONFIGURACION = {
  A5: {
    titulo: 'EVIDENCIA A-5 - DETALLE DE CUENTAS A NIVEL DE TERCEROS',
    descripcion:
      'Detalle de cuentas a nivel de terceros de los costos directos e indirectos ocasionados por los accidentes (reparaciones, demandas pagas, etc.)',
    encabezados: [
      'Fecha movimiento contable',
      'Código cuenta',
      'Número de comprobante',
      'Nombre del tercero',
      'Identificación del tercero',
      'Detalle o concepto',
      'Saldo inicial',
      'Movimiento débito',
      'Movimiento crédito',
      'Saldo final',
    ],
    justificacion:
      'Para la vigencia indicada, el CEA se gestiona en DATA-CEA bajo el nivel Básico del Plan Estratégico de Seguridad Vial y desarrolla una actividad diferente a la prestación del servicio de transporte, correspondiente a Otros tipos de educación.\n\nEl modelo de diseño e implementación del PESV adoptado por el CEA para el nivel Básico identifica el Paso 13 – Investigación Interna de Accidentes de Tránsito como no aplicable. En consecuencia, para el período reportado no se generan ni se fabrican registros contables de costos directos o indirectos derivados de investigaciones internas de accidentes que no correspondan al esquema adoptado para el CEA.\n\nPor lo anterior, la presente evidencia conserva la estructura de campos requerida para el reporte A-5, sin incorporar movimientos contables inexistentes. Su finalidad es dejar constancia de la razón por la cual no se relacionan registros de costos directos e indirectos ocasionados por accidentes para el período reportado.\n\nEl archivo se genera como soporte documental del período reportado en SINST - VIGIA 2, sin sustituir, alterar ni crear información contable inexistente.',
  },
  A7: {
    titulo: 'EVIDENCIA A-7 - DETALLE DE PROVISIONES DERIVADAS DE DEMANDAS',
    descripcion:
      'Detalle de las provisiones derivadas de las demandas por accidentes',
    encabezados: [
      'Código cuenta',
      'Código interno o numeración del proceso',
      'Fecha de demanda',
      'Descripción de la demanda',
      'Probabilidad de pérdida',
    ],
    justificacion:
      'Para la vigencia indicada, el CEA se gestiona en DATA-CEA bajo el nivel Básico del Plan Estratégico de Seguridad Vial y desarrolla una actividad diferente a la prestación del servicio de transporte, correspondiente a Otros tipos de educación.\n\nEl modelo de diseño e implementación del PESV adoptado por el CEA para el nivel Básico identifica el Paso 13 – Investigación Interna de Accidentes de Tránsito como no aplicable. En consecuencia, para el período reportado no se generan ni se fabrican registros de provisiones derivadas de demandas por accidentes que no correspondan al esquema adoptado para el CEA.\n\nPor lo anterior, la presente evidencia conserva la estructura de campos requerida para el reporte A-7, sin incorporar procesos, demandas, provisiones o probabilidades de pérdida inexistentes. Su finalidad es dejar constancia de la razón por la cual no se relacionan registros de provisiones derivadas de demandas por accidentes para el período reportado.\n\nEl archivo se genera como soporte documental del período reportado en SINST - VIGIA 2, sin sustituir, alterar ni crear información jurídica o contable inexistente.',
  },
}

function texto(valor) {
  return String(valor ?? '').trim()
}

function nombreEmpresa(empresa) {
  return texto(
    empresa?.nombre ||
      empresa?.nombre_empresa ||
      empresa?.razon_social
  )
}

function aplicarBorde(celda) {
  celda.border = {
    top: { style: 'thin', color: { argb: 'FFB8C2CC' } },
    left: { style: 'thin', color: { argb: 'FFB8C2CC' } },
    bottom: { style: 'thin', color: { argb: 'FFB8C2CC' } },
    right: { style: 'thin', color: { argb: 'FFB8C2CC' } },
  }
}

export async function generarEvidenciaContableExcel({
  empresa,
  nit,
  anio,
  trimestre,
  evidencia,
}) {
  const codigo = texto(evidencia).toUpperCase()
  const config = CONFIGURACION[codigo]

  if (!config) {
    throw new Error('La evidencia contable solicitada no es válida.')
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'DATA-CEA'
  workbook.company = nombreEmpresa(empresa)
  workbook.created = new Date()

  const hoja = workbook.addWorksheet(codigo, {
    views: [{ state: 'frozen', ySplit: 7 }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    },
  })

  const totalColumnas = config.encabezados.length
  const ultimaColumna = hoja.getColumn(totalColumnas).letter

  hoja.mergeCells(`A1:${ultimaColumna}1`)
  hoja.getCell('A1').value = config.titulo
  hoja.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  hoja.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4B5563' },
  }
  hoja.getCell('A1').alignment = {
    horizontal: 'center',
    vertical: 'middle',
  }
  hoja.getRow(1).height = 26

  hoja.mergeCells(`A2:${ultimaColumna}2`)
  hoja.getCell('A2').value = config.descripcion
  hoja.getCell('A2').font = {
    italic: true,
    color: { argb: 'FF374151' },
  }
  hoja.getCell('A2').alignment = {
    wrapText: true,
    vertical: 'middle',
  }
  hoja.getRow(2).height = 32

  hoja.getCell('A3').value = 'CEA'
  hoja.getCell('B3').value = nombreEmpresa(empresa) || '-'
  hoja.getCell('A4').value = 'NIT'
  hoja.getCell('B4').value = texto(nit) || texto(empresa?.nit) || '-'
  hoja.getCell('A5').value = 'Vigencia / Trimestre'
  hoja.getCell('B5').value = `${anio} / T${trimestre}`

  ;['A3', 'A4', 'A5'].forEach((ref) => {
    hoja.getCell(ref).font = { bold: true }
  })

  const filaEncabezado = 7
  const fila = hoja.getRow(filaEncabezado)

  config.encabezados.forEach((encabezado, indice) => {
    const celda = fila.getCell(indice + 1)
    celda.value = encabezado
    celda.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    }
    celda.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4B5563' },
    }
    celda.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    }
    aplicarBorde(celda)
  })

  fila.height = 42

  const filaTituloJustificacion = filaEncabezado + 2
  hoja.mergeCells(
    `A${filaTituloJustificacion}:${ultimaColumna}${filaTituloJustificacion}`
  )
  const celdaTituloJustificacion =
    hoja.getCell(`A${filaTituloJustificacion}`)
  celdaTituloJustificacion.value = `JUSTIFICACIÓN DE LA EVIDENCIA ${codigo}`
  celdaTituloJustificacion.font = {
    bold: true,
    color: { argb: 'FF1F2937' },
  }
  celdaTituloJustificacion.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  }
  celdaTituloJustificacion.alignment = {
    vertical: 'middle',
  }
  aplicarBorde(celdaTituloJustificacion)
  hoja.getRow(filaTituloJustificacion).height = 24

  const filaJustificacion = filaTituloJustificacion + 1
  hoja.mergeCells(
    `A${filaJustificacion}:${ultimaColumna}${filaJustificacion}`
  )
  const celdaJustificacion =
    hoja.getCell(`A${filaJustificacion}`)
  celdaJustificacion.value = config.justificacion
  celdaJustificacion.font = {
    color: { argb: 'FF374151' },
  }
  celdaJustificacion.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF9FAFB' },
  }
  celdaJustificacion.alignment = {
    wrapText: true,
    vertical: 'top',
  }
  aplicarBorde(celdaJustificacion)
  hoja.getRow(filaJustificacion).height =
    codigo === 'A5' ? 190 : 105

  config.encabezados.forEach((_, indice) => {
    const columna = hoja.getColumn(indice + 1)
    columna.width = codigo === 'A5' ? 22 : 28
  })

  hoja.autoFilter = {
    from: {
      row: filaEncabezado,
      column: 1,
    },
    to: {
      row: filaEncabezado,
      column: totalColumnas,
    },
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return {
    buffer: Buffer.from(buffer),
    justificacion: config.justificacion,
  }
}
