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
  if (!documento) {
    throw new Error('Configure el documento HOJA DE VIDA DEL PERSONAL antes de generar el PDF.')
  }
  const pdf = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' })
  const W = 215.9, H = 279.4, margen = 11
  const xIzq = 14, anchoIzq = 75, xDer = 99, anchoDer = 104
  const nombre = [personal.nombres, personal.apellidos].filter(Boolean).join(' ')
  const nombreArchivo = `HV ${nombre || valor(personal.documento) || personal.id}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|\\x00-\\x1F]/g, '')
    .replace(/\\s+/g, ' ').trim() + '.pdf'
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
      pdf.text(`Versión: ${limpiar(documento.version)} · Fecha de edición: ${fecha(documento.fecha_edicion) || '—'}`, margen, H - 8)
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
  // Encabezado limpio: nombre completo en una sola fila, sin metadatos de vista previa.
  pdf.setFont('helvetica', 'bold')
  const nombreEncabezado = nombre.toUpperCase()
  const anchoNombre = 116
  let tamNombre = 17
  pdf.setFontSize(tamNombre)
  while (tamNombre > 9 && pdf.getTextWidth(nombreEncabezado) > anchoNombre) {
    tamNombre -= 0.25
    pdf.setFontSize(tamNombre)
  }
  pdf.setTextColor(255, 255, 255)
  pdf.text(nombreEncabezado, W - margen, 26, { align: 'right' })
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
  // Contacto conserva el diseño aprobado: icono, etiqueta y valor debajo.
  seccionLateral('Contacto')
  const contacto = (etiqueta, contenido, tipo) => {
    if (!valor(contenido)) return
    icono(tipo, tipo === 'T' ? yIzq + 1 : yIzq)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); tinta()
    pdf.text(etiqueta, xIzq + 7, yIzq)
    yIzq += 4.3
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); tinta()
    const lineas = pdf.splitTextToSize(valor(contenido), 66)
    pdf.text(lineas, xIzq + 7, yIzq)
    yIzq += lineas.length * 3.8 + 3
  }
  contacto('Celular', personal.telefono, 'T')
  contacto('Correo electrónico', personal.email, '@')
  contacto('Dirección', [personal.direccion, personal.ciudad_residencia].filter(valor).join(', '), 'D')
  seccionLateral('Información')
  lineaLateral('Documento', personal.documento)
  lineaLateral('Profesión', personal.profesion)
  lineaLateral('Escolaridad', personal.escolaridad)
  // Solo para el PDF: los cuatro grados más recientes. El expediente conserva todos los estudios.
  const estudiosPdf = [...estudios].sort((a, b) =>
    fecha(b.fecha_grado).localeCompare(fecha(a.fecha_grado)) ||
    Number(b.id || 0) - Number(a.id || 0)
  ).slice(0, 4)
  seccionLateral('Estudios')
  if (!estudiosPdf.length) lineaLateral('Estado', 'Sin estudios registrados')
  for (const e of estudiosPdf) {
    lineaLateral('Título', e.titulo || e.nivel_estudio)
    lineaLateral('Institución', e.institucion)
    lineaLateral('Grado', fecha(e.fecha_grado))
    yIzq += 1.5
  }
  if (yIzq > H - 17) throw new Error('Los estudios exceden el espacio disponible para una página.')

  // Columna derecha compacta, sin saltos de página automáticos.
  titulo('Mi perfil', xDer, yDer, anchoDer); yDer += 6
  const perfil = valor(personal.perfil_profesional)
  if (perfil) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.3)
    const lineas = pdf.splitTextToSize(perfil, anchoDer)
    const disponible = 119
    const inter = Math.min(3.4, disponible / Math.max(1, lineas.length))
    tinta()
    pdf.text(lineas, xDer, yDer)
    yDer += lineas.length * inter + 4
  }
  const roles = (perfiles || []).filter((p) => String(p.estado || '').toLowerCase() === 'activo').map((p) => p.rol)
  const esInstructor = roles.includes('INSTRUCTOR_TEORIA') || roles.includes('INSTRUCTOR_PRACTICA') || personal.rol_conductor_instructor === true
  if (esInstructor) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
    // La API entrega las versiones por fecha de actualización descendente.
    // Seleccionar primero la versión actual de cada grupo; después evaluar su vigencia.
    // Así un histórico con fecha futura no aparece junto a su renovación.
    const normalizarTipo = (v) => valor(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    const claveLicencia = (l) => {
      const categoria = normalizarTipo(l.categoria)
      const grupo = categoria === 'A2' ? 'A2' : 'BC'
      const tipo = normalizarTipo(l.tipo_licencia).includes('INSTRUCTOR') ? 'INSTRUCTOR' : 'CONDUCCION'
      return tipo + ':' + grupo
    }
    const ultimasPorGrupo = new Map()
    const ordenadas = [...licencias].sort((a, b) =>
      String(b.fecha_actualizacion || '').localeCompare(String(a.fecha_actualizacion || '')) ||
      Number(b.id || 0) - Number(a.id || 0)
    )
    for (const l of ordenadas) {
      const clave = claveLicencia(l)
      if (!ultimasPorGrupo.has(clave)) ultimasPorGrupo.set(clave, l)
    }
    const vigentes = [...ultimasPorGrupo.values()].filter((l) =>
      fecha(l.vigencia) >= hoy && String(l.estado_vigencia || '').toUpperCase() !== 'VENCIDA'
    )
    if (vigentes.length) {
      titulo('Licencias y certificados vigentes', xDer, yDer, anchoDer)
      yDer += 7
      const mitad = (anchoDer - 5) / 2
      const normalizar = (v) => valor(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
      const columnas = [
        { titulo: 'Licencia de conducción', items: vigentes.filter((l) => normalizar(l.tipo_licencia).includes('CONDUC')) },
        { titulo: 'Certificado de instructor', items: vigentes.filter((l) => normalizar(l.tipo_licencia).includes('INSTRUCTOR')) },
      ]
      const identificados = new Set([...columnas[0].items, ...columnas[1].items])
      columnas[0].items.push(...vigentes.filter((l) => !identificados.has(l)))
      let fin = yDer
      for (let i = 0; i < 2; i++) {
        const x = xDer + i * (mitad + 5)
        const col = columnas[i]
        pdf.setFillColor(235, 238, 241)
        pdf.roundedRect(x, yDer - 4.5, mitad, 7, 1, 1, 'F')
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); tinta()
        pdf.text(col.titulo, x + 1.5, yDer)
        let y = yDer + 6
        for (const l of col.items) {
          // Formato compacto: una ficha por licencia/certificado vigente.
          // No se omiten categorías ni números; se ajustan en líneas cuando hace falta.
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); tinta()
          const encabezadoLicencia = [valor(l.categoria), valor(l.numero_certificado)].filter(Boolean).join(' · ')
          const lineasLicencia = pdf.splitTextToSize(encabezadoLicencia || 'Sin categoría', mitad - 3)
          pdf.text(lineasLicencia, x + 1, y)
          y += lineasLicencia.length * 3.1
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.8)
          pdf.text('Vigencia: ' + fecha(l.vigencia), x + 1, y)
          y += 4.8
        }
        fin = Math.max(fin, y)
      }
      yDer = fin + 3
    }
  }
  if (experiencia.length) {
    titulo('Experiencia laboral', xDer, yDer, anchoDer)
    yDer += 7
    // Primero la experiencia vigente; luego las finalizadas por fecha de retiro/inicio.
    const ordenExperiencia = [...experiencia].sort((a, b) =>
      Number(Boolean(b.actualmente)) - Number(Boolean(a.actualmente)) ||
      fecha(b.actualmente ? b.fecha_inicio : (b.fecha_fin || b.fecha_inicio)).localeCompare(
        fecha(a.actualmente ? a.fecha_inicio : (a.fecha_fin || a.fecha_inicio))
      ) ||
      fecha(b.fecha_inicio).localeCompare(fecha(a.fecha_inicio)) ||
      Number(b.id || 0) - Number(a.id || 0)
    ).slice(0, 3)
    for (const e of ordenExperiencia) {
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.6); tinta()
      const cargo = pdf.splitTextToSize(limpiar(e.cargo).toUpperCase(), anchoDer - 3)
      pdf.text(cargo, xDer + 1, yDer)
      yDer += cargo.length * 3.5 + 0.5
      yDer = parrafo(`${limpiar(e.empresa)} (${fecha(e.fecha_inicio)} - ${e.actualmente ? 'Actualidad' : fecha(e.fecha_fin)})`, xDer + 1, anchoDer - 3, yDer, 7.2, 3.2) + 1
      // Una fecha de retiro registrada identifica una experiencia finalizada.
      // Las funciones solo pertenecen al empleo vigente, no a trabajos anteriores.
      if (!fecha(e.fecha_fin) && Boolean(e.actualmente)) {
        if (valor(e.funciones)) {
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.3); tinta()
          pdf.text('Funciones realizadas', xDer + 1, yDer)
          yDer += 4
          yDer = parrafo(e.funciones, xDer + 1, anchoDer - 3, yDer, 7.1, 3.2) + 1
        }
      } else {
        if (valor(e.jefe_inmediato)) yDer = parrafo('Jefe inmediato: ' + valor(e.jefe_inmediato), xDer + 1, anchoDer - 3, yDer, 7.1, 3.2) + 1
        if (valor(e.telefono_contacto)) yDer = parrafo('Teléfono de contacto: ' + valor(e.telefono_contacto), xDer + 1, anchoDer - 3, yDer, 7.1, 3.2) + 1
      }
      yDer += 3
    }
  }
  if (yDer > H - 18) throw new Error('El contenido de perfil, licencias y experiencia excede una página. Reduzca la extensión del perfil o revise los registros.')
  paginacion()
  if (vistaPrevia) return pdf.output('blob')
  pdf.save(nombreArchivo)
}
