// app/api/reuniones/[id]/asistentes.xlsx/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// Utilidades Bogotá
function fmtBogota(d = new Date()) {
  const tz = 'America/Bogota'

  const fecha = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)

  const hora = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d)

  return { fecha, hora }
}

function toBogotaDateTime(isoLike) {
  if (!isoLike) return ''

  const dt = new Date(isoLike)
  const { fecha, hora } = fmtBogota(dt)

  return `${fecha} ${hora}`
}

function respuestaError(error) {
  const respuesta = respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    { status: respuesta.status }
  )
}

export async function GET(request, { params }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Falta id de reunión.',
        },
        { status: 400 }
      )
    }

    const { supabase } =
      await obtenerSupabaseEmpresaDesdeRequest(request)

    // 1. Obtener reunión
    const { data: reunion, error: reunionError } = await supabase
      .from('reuniones')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (reunionError) {
      return NextResponse.json(
        {
          status: 'error',
          message: reunionError.message,
        },
        { status: 500 }
      )
    }

    if (!reunion) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Reunión no encontrada.',
        },
        { status: 404 }
      )
    }

    // 2. Obtener asistencias
    const { data: asistencias, error: asistenciasError } =
      await supabase
        .from('asistencias')
        .select(`
          documento_usuario,
          nombre_usuario,
          rol_usuario,
          timestamp_asistencia
        `)
        .eq('id_reunion', id)
        .order('timestamp_asistencia', {
          ascending: true,
        })

    if (asistenciasError) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'No fue posible leer asistencias.',
          detail: asistenciasError.message,
        },
        { status: 400 }
      )
    }

    // 3. Obtener teléfono y correo desde personal
    const documentos = Array.from(
      new Set(
        (asistencias || [])
          .map((asistencia) =>
            String(asistencia.documento_usuario || '').trim()
          )
          .filter(Boolean)
      )
    )

    let porDocumento = {}

    if (documentos.length > 0) {
      const { data: personalRows, error: personalError } =
        await supabase
          .from('personal')
          .select('documento, telefono, email')
          .in('documento', documentos)

      if (personalError) {
        console.error(
          'No fue posible enriquecer asistentes con datos de personal:',
          personalError
        )
      } else {
        porDocumento = Object.fromEntries(
          (personalRows || []).map((persona) => [
            String(persona.documento),
            {
              telefono: persona.telefono || '-',
              email: persona.email || '-',
            },
          ])
        )
      }
    }

    // 4. Crear Excel
    const ExcelJS = (await import('exceljs')).default

    const wb = new ExcelJS.Workbook()

    wb.creator = 'DATA CEA'
    wb.created = new Date()

    const ws = wb.addWorksheet('Asistentes', {
      pageSetup: {
        paperSize: 1,
        orientation: 'landscape',
        margins: {
          left: 0.5,
          right: 0.5,
          top: 0.5,
          bottom: 0.5,
          header: 0.3,
          footer: 0.3,
        },
      },
      properties: {
        defaultRowHeight: 18,
      },
      views: [
        {
          state: 'frozen',
          ySplit: 5,
        },
      ],
    })

    // Estilos
    const HEADER_FILL = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: 'FF1F2937',
      },
    }

    const HEADER_FONT = {
      color: {
        argb: 'FFFFFFFF',
      },
      bold: true,
    }

    const CENTER = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    }

    const THIN_BORDER = {
      style: 'thin',
      color: {
        argb: 'FF9CA3AF',
      },
    }

    // Encabezado
    const { fecha: hoy, hora: ahora } =
      fmtBogota()

    const titulo =
      `REGISTRO DE ASISTENCIA — ${reunion.tipo_reunion}`

    ws.mergeCells('A1:G1')

    const r1 = ws.getCell('A1')

    r1.value = titulo
    r1.font = {
      bold: true,
      size: 16,
    }
    r1.alignment = CENTER

    ws.getRow(1).height = 26

    // Descripción
    ws.mergeCells('A2:G2')

    const r2 = ws.getCell('A2')

    r2.value = {
      richText: [
        {
          text: 'Descripción: ',
          font: {
            bold: true,
          },
        },
        {
          text: String(
            reunion.descripcion || '-'
          ).trim(),
        },
      ],
    }

    r2.font = {
      size: 11,
      color: {
        argb: 'FF374151',
      },
    }

    r2.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    }

    // Metadatos
    ws.mergeCells('A3:G3')

    const r3 = ws.getCell('A3')

    const metaParts = [
      {
        label: 'Fecha',
        value: reunion.fecha_programada,
      },
      {
        label: 'Hora',
        value:
          `${reunion.hora_inicio} - ${reunion.hora_fin}`,
      },
      {
        label: 'Modalidad',
        value: reunion.modalidad,
      },
      {
        label: 'Responsable',
        value: reunion.responsable || '-',
      },
      {
        label: 'Dirigido a',
        value:
          reunion.dirigido_a ||
          'Todo el personal',
      },
      {
        label: 'Lugar',
        value: reunion.lugar || '-',
      },
      {
        label: 'Estado',
        value: reunion.estado,
      },
      {
        label: 'Generado',
        value:
          `${hoy} ${ahora} (Bogotá)`,
      },
    ]

    const sep = '   ·   '
    const rich = []

    metaParts.forEach((item, index) => {
      rich.push({
        text: `${item.label}: `,
        font: {
          bold: true,
        },
      })

      rich.push({
        text: `${item.value}`,
      })

      if (
        index <
        metaParts.length - 1
      ) {
        rich.push({
          text: sep,
        })
      }
    })

    r3.value = {
      richText: rich,
    }

    r3.font = {
      size: 10,
      color: {
        argb: 'FF374151',
      },
    }

    r3.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    }

    ws.getRow(2).height = 18
    ws.getRow(3).height = 18

    // Separador
    ws.mergeCells('A4:G4')
    ws.getCell('A4').value = ''

    // Encabezados tabla
    const HEAD = [
      '#',
      'Nombre',
      'Documento',
      'Rol',
      'Teléfono',
      'Email',
      'Asistió (Bogotá)',
    ]

    ws.addRow(HEAD)

    const headRow =
      ws.getRow(5)

    headRow.eachCell((cell) => {
      cell.fill = HEADER_FILL
      cell.font = HEADER_FONT
      cell.alignment = CENTER

      cell.border = {
        top: THIN_BORDER,
        left: THIN_BORDER,
        bottom: THIN_BORDER,
        right: THIN_BORDER,
      }
    })

    headRow.height = 20

    // Datos
    const rows =
      (asistencias || []).map(
        (asistencia, index) => {
          const documento =
            String(
              asistencia.documento_usuario || ''
            )

          return [
            index + 1,
            asistencia.nombre_usuario || '-',
            documento || '-',
            asistencia.rol_usuario || '-',
            porDocumento[documento]?.telefono || '-',
            porDocumento[documento]?.email || '-',
            toBogotaDateTime(
              asistencia.timestamp_asistencia
            ),
          ]
        }
      )

    rows.forEach((row) => {
      const excelRow =
        ws.addRow(row)

      excelRow.alignment = {
        vertical: 'middle',
      }

      excelRow.eachCell(
        (cell) => {
          cell.border = {
            top: THIN_BORDER,
            left: THIN_BORDER,
            bottom: THIN_BORDER,
            right: THIN_BORDER,
          }
        }
      )
    })

    // Anchos
    const widths = [
      5,
      32,
      16,
      16,
      16,
      30,
      22,
    ]

    widths.forEach(
      (width, index) => {
        ws.getColumn(
          index + 1
        ).width = width
      }
    )

    // Pie
    const total =
      rows.length

    const foot =
      ws.addRow([
        '',
        '',
        '',
        '',
        '',
        'Total asistentes:',
        total,
      ])

    foot.font = {
      bold: true,
    }

    foot.getCell(6).alignment = {
      vertical: 'middle',
      horizontal: 'right',
    }

    foot.eachCell((cell) => {
      cell.border = {
        top: THIN_BORDER,
        left: THIN_BORDER,
        bottom: THIN_BORDER,
        right: THIN_BORDER,
      }
    })

    // Generar archivo
    const buffer =
      await wb.xlsx.writeBuffer()

    const nombreBase =
      reunion.tipo_reunion ||
      'Reunion'

    const filenameSafe =
      `${nombreBase
        .replace(
          /[^\p{L}\p{N}\s_-]+/gu,
          ''
        )
        .trim()
        .replace(/\s+/g, '_')}` +
      `_${reunion.fecha_programada}.xlsx`

    return new Response(
      buffer,
      {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

          'Content-Disposition':
            `attachment; filename="${filenameSafe}"`,

          'Cache-Control':
            'no-store',
        },
      }
    )
  } catch (error) {
    console.error(
      'Error GET /api/reuniones/[id]/asistentes.xlsx:',
      error
    )

    return respuestaError(error)
  }
}