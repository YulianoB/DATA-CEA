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
  let yDer = 84
  let yIzq = 92
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

  const dato = (etiqueta, contenido, simbolo = '•') => {
    if (!valor(contenido) || yIzq > H - 29) return
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); tinta()
    pdf.text(simbolo === '•' ? '-' : simbolo, xIzq, yIzq)
    pdf.text(etiqueta, xIzq + 6, yIzq)
    yIzq += 4.5
    yIzq = parrafo(contenido, xIzq + 6, 64, yIzq, 8, 3.8) + 3
  }
  titulo('Contacto', xIzq, yIzq, anchoIzq, true); yIzq += 10
  dato('Teléfono', personal.telefono, '☎')
  dato('Correo electrónico', personal.email, '@')
  dato('Dirección', [personal.direccion, personal.ciudad_residencia].filter(valor).join(', '), '⌖')
  yIzq += 5
  titulo('Información', xIzq, yIzq, anchoIzq, true); yIzq += 10
  dato('Documento', personal.documento)
  dato('Profesión', personal.profesion)
  dato('Escolaridad', personal.escolaridad)
  yIzq += 5
  titulo('Vinculación', xIzq, yIzq, anchoIzq, true); yIzq += 10
  dato('Relación', personal.tipo_personal)
  dato('Grupo', personal.grupo_personal)
  dato('Fecha', fecha(personal.fecha_vinculacion))
  yIzq += 5
  if (estudios.length && yIzq < H - 40) {
    titulo('Estudios', xIzq, yIzq, anchoIzq, true); yIzq += 10
    for (const e of estudios) {
      if (yIzq > H - 39) break
      dato('Título', e.titulo || e.nivel_estudio)
      dato('Institución', e.institucion)
      dato('Fecha de grado', fecha(e.fecha_grado))
      yIzq += 2
    }
  }

  titulo('Mi perfil', xDer, yDer, anchoDer); yDer += 8
  yDer = parrafo(personal.perfil_profesional, xDer, anchoDer, yDer, 8, 3.8) + 12
  bloque('Experiencia', experiencia, (e) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.6); tinta()
    pdf.text(limpiar(e.cargo).toUpperCase(), xDer + 2, yDer)
    let y = parrafo(`${limpiar(e.empresa)} (${fecha(e.fecha_inicio)} - ${e.actualmente ? 'Actualidad' : fecha(e.fecha_fin)})`, xDer + 2, anchoDer - 3, yDer + 5, 7.8, 3.8)
    if (valor(e.funciones)) y = parrafo(e.funciones, xDer + 2, anchoDer - 3, y + 2, 7.6, 3.8)
    return y
  })
  bloque('Formación', estudios, (e) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); tinta()
    pdf.text(limpiar(e.institucion).toUpperCase(), xDer + 2, yDer)
    return parrafo(`${limpiar(e.titulo)} · ${fecha(e.fecha_grado)}`, xDer + 2, anchoDer - 3, yDer + 5, 7.8, 3.8)
  })

  const roles = (perfiles || []).filter((p) => p.estado === 'activo').map((p) => p.rol)
  const esInstructor = roles.includes('INSTRUCTOR_TEORIA') || roles.includes('INSTRUCTOR_PRACTICA') || personal.rol_conductor_instructor === true
  if (esInstructor) {
    const hoy = new Date().toISOString().slice(0, 10)
    const vigentes = licencias.filter((l) => fecha(l.vigencia) >= hoy && String(l.estado_vigencia || '').toUpperCase() !== 'VENCIDA')
    bloque('Licencias y certificados vigentes', vigentes, (l) => {
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.4); tinta()
      pdf.text(`${limpiar(l.tipo_licencia)} · ${limpiar(l.categoria)}`, xDer + 2, yDer)
      return parrafo(`Certificado: ${limpiar(l.numero_certificado)} · Vigencia: ${fecha(l.vigencia)}`, xDer + 2, anchoDer - 3, yDer + 5, 7.8, 3.8)
    })
  }
  paginacion()
  if (vistaPrevia) return pdf.output('blob')
  pdf.save(`Hoja_de_vida_${valor(personal.documento) || personal.id}.pdf`)
}
