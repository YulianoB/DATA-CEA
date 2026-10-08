'use client'

import { jsPDF } from 'jspdf'

const AZUL = [35, 59, 85]
const GRIS = [211, 215, 220]
const TEXTO = [35, 59, 85]
const valor = (v) => String(v ?? '').trim()
const fecha = (v) => valor(v).slice(0, 10)
const limpiar = (v) => valor(v) || '—'

/**
 * Plantilla de hoja de vida aprobada. No incluye datos de acceso,
 * evaluaciones, contactos de emergencia ni documentos adjuntos.
 * La foto se recibe opcionalmente; su almacenamiento se integra por separado.
 */
export function generarHojaVidaPdf({ personal, estudios = [], experiencia = [], licencias = [], perfiles = [], encabezado, documento, fotoDataUrl = null, vistaPrevia = false }) {
  if (!personal?.id) throw new Error('No hay información del trabajador.')
  if (!vistaPrevia && (!encabezado?.estructura || !documento?.codigo)) {
    throw new Error('Configure el encabezado y el documento Hoja de Vida del Personal antes de generar el PDF.')
  }

  if (vistaPrevia) documento = documento || { codigo: 'VISTA PREVIA', version: '—', vigencia: '—' }
  const pdf = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' })
  const W = 215.9, H = 279.4, margen = 11
  const xIzq = 14, anchoIzq = 75, xDer = 99, anchoDer = 104
  const nombre = [personal.nombres, personal.apellidos].filter(Boolean).join(' ')
  let yDer = 76
  let yIzq = 85
  const tinta = () => pdf.setTextColor(...TEXTO)
  const titulo = (s, x, y, ancho, banda = false) => {
    if (banda) {
      pdf.setFillColor(255, 255, 255)
      pdf.roundedRect(x - 2, y - 5, ancho, 8, 1.1, 1.1, 'F')
    }
    tinta()
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(banda ? 9 : 11)
    pdf.text(s.toUpperCase(), x, y)
  }
  const paginacion = () => {
    const n = pdf.getNumberOfPages()
    for (let i = 1; i <= n; i++) {
      pdf.setPage(i)
      pdf.setDrawColor(215, 220, 225)
      pdf.line(margen, H - 12, W - margen, H - 12)
      tinta(); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7)
      pdf.text(`${documento.codigo} · Versión ${limpiar(documento.version)} · ${limpiar(documento.vigencia)}`, margen, H - 8)
      pdf.text(`Página ${i} de ${n}`, W - margen, H - 8, { align: 'right' })
    }
  }
  const nuevaPagina = () => {
    pdf.addPage()
    pdf.setFillColor(...GRIS)
    pdf.rect(0, 0, 87, H - 15, 'F')
    pdf.setFillColor(...AZUL)
    pdf.rect(0, 0, W, 17, 'F')
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255)
    pdf.text('HOJA DE VIDA DEL PERSONAL', margen, 11)
    pdf.setFont('helvetica', 'normal')
    pdf.text(nombre, W - margen, 11, { align: 'right' })
    yDer = 29
  }
  const asegurar = (alto) => { if (yDer + alto > H - 21) nuevaPagina() }
  const parrafo = (texto, x, ancho, y, tam = 8.2, inter = 4) => {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(tam); tinta()
    const lineas = pdf.splitTextToSize(limpiar(texto), ancho)
    pdf.text(lineas, x, y)
    return y + lineas.length * inter
  }
  const bloque = (nombreSeccion, registros, render) => {
    if (!registros.length) return
    asegurar(15)
    titulo(nombreSeccion, xDer, yDer, anchoDer)
    yDer += 10
    for (const r of registros) {
      asegurar(19)
      yDer = render(r)
      yDer += 7
    }
    yDer += 4
  }

  // El encabezado documental configurado se representa en una banda compacta;
  // la reproducción exacta de sus celdas se realizará en la siguiente fase.
  pdf.setFillColor(...GRIS); pdf.rect(0, 0, 87, H - 15, 'F')
  pdf.setFillColor(...AZUL); pdf.rect(0, 0, W, 49, 'F')
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(255, 255, 255)
  pdf.text(`HOJA DE VIDA DEL PERSONAL · ${documento.codigo} · V. ${limpiar(documento.version)}`, W - margen, 8, { align: 'right' })
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17)
  const lineasNombre = pdf.splitTextToSize(nombre.toUpperCase(), 105)
  pdf.text(lineasNombre, W - margen, 24, { align: 'right' })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
  pdf.text(valor(personal.cargo).toUpperCase(), W - margen, 42, { align: 'right' })

  // Círculo superpuesto, con borde blanco grueso, igual que la referencia.
  pdf.setFillColor(255, 255, 255); pdf.circle(45, 48, 29, 'F')
  if (fotoDataUrl) {
    try {
      // jsPDF no admite recorte circular nativo; la fotografía debe recibirse ya
      // recortada en círculo por el componente de carga.
      pdf.addImage(fotoDataUrl, 'PNG', 18, 21, 54, 54)
    } catch { /* Mantener marcador si la foto no es válida. */ }
  } else {
    pdf.setFillColor(225, 228, 231); pdf.circle(45, 48, 24, 'F')
    pdf.setFontSize(8); tinta(); pdf.text('FOTOGRAFÍA', 45, 49, { align: 'center' })
  }

  const icono = (tipo, y) => {
    pdf.setDrawColor(...AZUL); pdf.setLineWidth(0.4)
    if (tipo === 'T') {
      pdf.roundedRect(xIzq + 1, y - 3.7, 3.5, 4.8, 0.5, 0.5, 'S')
      pdf.circle(xIzq + 2.75, y + 0.35, 0.15, 'S')
    } else if (tipo === '@') {
      pdf.rect(xIzq, y - 3, 5, 3)
      pdf.line(xIzq, y - 3, xIzq + 2.5, y - 1)
      pdf.line(xIzq + 5, y - 3, xIzq + 2.5, y - 1)
    } else if (tipo === 'D') {
      pdf.circle(xIzq + 2.5, y - 2, 1.1, 'S')
      pdf.line(xIzq + 1, y - 1.4, xIzq + 2.5, y + 1)
      pdf.line(xIzq + 4, y - 1.4, xIzq + 2.5, y + 1)
    }
  }
  const lineaLateral = (et, v, tipo = null) => {
    if (!valor(v)) return
    const x = xIzq + (tipo ? 7 : 3)
    if (tipo) icono(tipo, yIzq)
    else { pdf.setFillColor(...AZUL); pdf.circle(xIzq + 1, yIzq - 1, 0.6, 'F') }
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); tinta()
    const etiqueta = et + ': '
    pdf.text(etiqueta, x, yIzq)
    const offset = pdf.getTextWidth(etiqueta)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
    const texto = valor(v)
    const espacio = 71 - (x - xIzq)
    const primera = Math.max(12, espacio - offset)
    const palabras = texto.split(/\\s+/)
    let linea = '', resto = []
    for (const palabra of palabras) {
      const prueba = linea ? linea + ' ' + palabra : palabra
      if (pdf.getTextWidth(prueba) <= primera && !resto.length) linea = prueba
      else resto.push(palabra)
    }
    pdf.text(linea, x + offset, yIzq)
    yIzq += 4.2
    if (resto.length) {
      const lineas = pdf.splitTextToSize(resto.join(' '), espacio)
      pdf.text(lineas, x, yIzq)
      yIzq += lineas.length * 3.6
    }
  }
  const seccionLateral = (nombreSeccion) => {
    yIzq += 4
    titulo(nombreSeccion, xIzq, yIzq, anchoIzq, true)
    yIzq += 7.2
  }
  seccionLateral('Contacto')
  lineaLateral('Celular', personal.telefono, 'T')
  lineaLateral('Correo', personal.email, '@')
  lineaLateral('Dirección', [personal.direccion, personal.ciudad_residencia].filter(valor).join(', '), 'D')
  seccionLateral('Información')
  lineaLateral('Documento', personal.documento)
  lineaLateral('Profesión', personal.profesion)
  lineaLateral('Escolaridad', personal.escolaridad)
  seccionLateral('Vinculación')
  lineaLateral('Relación', personal.tipo_personal)
  lineaLateral('Grupo', personal.grupo_personal)
  lineaLateral('Fecha', fecha(personal.fecha_vinculacion))
  seccionLateral('Estudios')
  if (!estudios.length) lineaLateral('Estado', 'Sin estudios registrados')
  for (const e of estudios) {
    lineaLateral('Título', e.titulo || e.nivel_estudio)
    lineaLateral('Institución', e.institucion)
    lineaLateral('Grado', fecha(e.fecha_grado))
    yIzq += 1.5
  }
  if (yIzq > H - 17) throw new Error('Los estudios exceden el espacio disponible para una página.')

  // El contenido derecho comienza en la primera página, aun si Estudios continuó en otra.
  pdf.setPage(1)
  titulo('Mi perfil', xDer, yDer, anchoDer); yDer += 8
  yDer = parrafo(personal.perfil_profesional, xDer, anchoDer, yDer, 8, 3.8) + 12
  const roles = (perfiles || []).filter((p) => String(p.estado || '').toLowerCase() === 'activo').map((p) => p.rol)
  const esInstructor = roles.includes('INSTRUCTOR_TEORIA') || roles.includes('INSTRUCTOR_PRACTICA') || personal.rol_conductor_instructor === true
  if (esInstructor) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
    const vigentes = licencias.filter((l) => fecha(l.vigencia) >= hoy && String(l.estado_vigencia || '').toUpperCase() !== 'VENCIDA')
    if (vigentes.length) {
      asegurar(35)
      titulo('Licencias y certificados vigentes', xDer, yDer, anchoDer)
      yDer += 11
      const mitad = (anchoDer - 6) / 2
      const normalizar = (v) => valor(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
      const columnas = [
        { titulo: 'Licencia de conducción', items: vigentes.filter((l) => normalizar(l.tipo_licencia).includes('CONDUC') || normalizar(l.rol).includes('CONDUC')) },
        { titulo: 'Certificado de instructor', items: vigentes.filter((l) => normalizar(l.tipo_licencia).includes('INSTRUCTOR') || normalizar(l.rol).includes('INSTRUCTOR')) },
      ]
      // Conservar visibles los registros cuya clasificación no coincide con los nombres esperados.
      const identificados = new Set([...columnas[0].items, ...columnas[1].items])
      const sinClasificar = vigentes.filter((l) => !identificados.has(l))
      columnas[0].items.push(...sinClasificar)
      let fin = yDer
      for (let i = 0; i < columnas.length; i++) {
        const x = xDer + i * (mitad + 6)
        const columna = columnas[i]
        pdf.setFillColor(235, 238, 241)
        pdf.roundedRect(x, yDer - 5, mitad, 10, 1, 1, 'F')
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); tinta()
        pdf.text(pdf.splitTextToSize(columna.titulo, mitad - 4), x + 2, yDer)
        let y = yDer + 11
        for (const l of columna.items) {
          const datos = [['Categoría', l.categoria], ['Número', l.numero_certificado], ['Vigencia', fecha(l.vigencia)]]
          for (const [et, v] of datos) {
            if (!valor(v)) continue
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.4); tinta()
            pdf.text('-', x + 1, y)
            pdf.text(et + ':', x + 4, y)
            y += 4
            y = parrafo(v, x + 4, mitad - 6, y, 7.4, 3.7) + 2
          }
          y += 2
        }
        fin = Math.max(fin, y)
      }
      yDer = fin + 6
    }
  }
  bloque('Experiencia laboral', experiencia, (e) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.6); tinta()
    pdf.text(limpiar(e.cargo).toUpperCase(), xDer + 2, yDer)
    let y = parrafo(`${limpiar(e.empresa)} (${fecha(e.fecha_inicio)} - ${e.actualmente ? 'Actualidad' : fecha(e.fecha_fin)})`, xDer + 2, anchoDer - 3, yDer + 5, 7.8, 3.8)
    if (valor(e.funciones)) y = parrafo(e.funciones, xDer + 2, anchoDer - 3, y + 2, 7.6, 3.8)
    return y
  })

  paginacion()
  if (vistaPrevia) return pdf.output('blob')
  pdf.save(`Hoja_de_vida_${valor(personal.documento) || personal.id}.pdf`)
}
