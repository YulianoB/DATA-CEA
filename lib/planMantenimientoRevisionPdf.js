// Informe de configuración del plan de mantenimiento.
// Solo lectura: todos los datos vienen de GET /api/admin/mantenimientos/plan.
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const COLOR = {
  navy: [18, 59, 89],
  blue: [35, 98, 136],
  cyan: [206, 241, 247],
  white: [255, 255, 255],
  ink: [28, 45, 60],
  gray: [95, 111, 126],
  line: [203, 216, 226],
  light: [245, 249, 252],
  green: [37, 116, 77],
}

function numero(value) {
  const n = Number(value)
  return value === null || value === undefined || value === '' || !Number.isFinite(n)
    ? '—' : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
}

function fecha(value) {
  if (!value) return '—'
  const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value)
}

function frecuenciaSugerida(item, base) {
  const directa = Number(item?.frecuencia_sugerida_operativa_km)
  if (Number.isFinite(directa) && directa > 0) return directa
  const referencia = Number(item?.frecuencia_recomendada_km)
  if (!Number.isFinite(referencia) || referencia <= 0) return null
  if (!Number.isFinite(base) || base <= 0) return referencia
  if (referencia <= base) return base
  const inferior = Math.floor(referencia / base) * base
  const superior = Math.ceil(referencia / base) * base
  if (inferior < base) return superior
  return superior - referencia <= referencia - inferior ? superior : inferior
}

function ordenar(actividades, base) {
  return [...actividades].sort((a, b) => {
    const fa = a.seleccionada
      ? Number(a.configuracion?.frecuencia_km)
      : frecuenciaSugerida(a, base)
    const fb = b.seleccionada
      ? Number(b.configuracion?.frecuencia_km)
      : frecuenciaSugerida(b, base)
    const na = Number.isFinite(fa) && fa > 0 ? fa : Number.MAX_SAFE_INTEGER
    const nb = Number.isFinite(fb) && fb > 0 ? fb : Number.MAX_SAFE_INTEGER
    return na - nb || String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')
  })
}

export function generarRevisionPlanMantenimientoPdf(data, vistaDinamica = null) {
  if (!data?.ok || !data?.vehiculo || !Array.isArray(data.actividades)) {
    throw new Error('No hay datos válidos del plan guardado para generar el documento.')
  }
  const estado = String(data.estado_configuracion || 'SIN_CONFIGURAR').toUpperCase()
  if (!['BORRADOR', 'FINALIZADO'].includes(estado) ||
      !data.actividades.some(a => a.seleccionada)) {
    throw new Error('Guarde primero un borrador o finalice el plan antes de imprimir.')
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 13
  const contentWidth = width - margin * 2
  let y = 43
  const vehiculo = data.vehiculo
  const base = Number(data.regla_frecuencias?.frecuencia_base_km) || null
  const todas = ordenar(data.actividades, base)
  const configuradas = todas.filter(a => a.seleccionada)
  const noConfiguradas = todas.filter(a => !a.seleccionada)
  const fechaGeneracion = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })

  // La matriz dinámica es la fuente de verdad para P1 y el promedio. La
  // configuración puede conservar km_referencia vacío aunque P1 esté ejecutado.
  if (estado === 'FINALIZADO' && !vistaDinamica) {
    throw new Error('No se recibió la consulta del plan dinámico. Verifique la conexión e intente nuevamente.')
  }
  const p1Ejecutado = (vistaDinamica?.hechos || []).find(p =>
    Number(p?.punto ?? p?.ciclo) === 1 &&
    String(p?.estado || '').toUpperCase() === 'EJECUTADO' &&
    p.km_ejecucion != null && p.fecha_ejecucion
  )
  const kmP1 = p1Ejecutado
    ? Number(p1Ejecutado.km_ejecucion)
    : data.inicio_normalizacion?.km_referencia != null
      ? Number(data.inicio_normalizacion.km_referencia)
      : null
  const fechaP1 = p1Ejecutado?.fecha_ejecucion || data.inicio_normalizacion?.fecha_referencia || null
  const promedioMatriz = vistaDinamica?.kilometraje?.promedio_km_mes
  const promedioDinamico = promedioMatriz != null && Number.isFinite(Number(promedioMatriz))
    ? Number(promedioMatriz) : null
  const tituloEstado = estado === 'FINALIZADO' ? 'PLAN FINALIZADO' : 'BORRADOR — PENDIENTE DE APROBACIÓN'

  function saltoSiNecesario(alto = 14) {
    if (y + alto > height - 17) {
      doc.addPage()
      y = 42
    }
  }
  function titulo(texto, al = 10) {
    saltoSiNecesario(al + 9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR.navy)
    doc.setFontSize(11)
    doc.text(texto, margin, y)
    y += 3.5
    doc.setDrawColor(...COLOR.line)
    doc.line(margin, y, width - margin, y)
    y += 6
  }
  function parrafo(texto, fontsize = 9, espacio = 3) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLOR.ink)
    doc.setFontSize(fontsize)
    const lineas = doc.splitTextToSize(texto, contentWidth)
    const altura = lineas.length * (fontsize * 0.45) + espacio
    saltoSiNecesario(altura)
    doc.text(lineas, margin, y)
    y += altura
  }
  function tabla(rows, headers, widths) {
    if (!rows.length) {
      parrafo('No hay actividades en esta categoría.', 9)
      return
    }
    autoTable(doc, {
      startY: y,
      head: [headers],
      body: rows,
      theme: 'grid',
      margin: { left: margin, right: margin, top: 42, bottom: 17 },
      tableWidth: contentWidth,
      columnStyles: widths,
      styles: { font: 'helvetica', fontSize: 7.6, cellPadding: 2, valign: 'middle', overflow: 'linebreak', textColor: COLOR.ink, lineColor: COLOR.line, lineWidth: 0.15 },
      headStyles: { fillColor: COLOR.navy, textColor: COLOR.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLOR.light },
      showHead: 'everyPage',
      didDrawPage: () => {},
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 7
  }

  titulo('1. IDENTIFICACIÓN DEL VEHÍCULO Y CONFIGURACIÓN')
  const info = [
    ['Placa', String(vehiculo.placa || '—'), 'Estado', tituloEstado],
    ['Tipo de vehículo', String(vehiculo.tipo_vehiculo_normalizado || vehiculo.tipo_vehiculo || '—'), 'Marca y modelo', [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') || '—'],
    ['Frecuencia base de aceite', base ? `${numero(base)} km` : 'Por definir', 'Último km preoperacional', vehiculo.ultimo_km == null ? '—' : `${numero(vehiculo.ultimo_km)} km`],
    ['Fecha de lectura', fecha(vistaDinamica?.kilometraje?.ultima_fecha || vehiculo.fecha_ultimo_km), 'Promedio dinámico', promedioDinamico == null ? 'No disponible' : `${numero(promedioDinamico)} km/mes`],
    ['Referencia real P1', kmP1 == null || !Number.isFinite(kmP1) ? 'Pendiente de primer cambio de aceite' : `${numero(kmP1)} km`, 'Fecha inicial P1', fecha(fechaP1)],
  ]
  tabla(info, ['Dato', 'Valor', 'Dato', 'Valor'], { 0:{cellWidth:36,fontStyle:'bold'},1:{cellWidth:52},2:{cellWidth:38,fontStyle:'bold'},3:{cellWidth:contentWidth-126} })
  parrafo(`Documento generado: ${fechaGeneracion}. Esta impresión refleja exclusivamente la última configuración guardada. No acredita la ejecución de trabajos.`, 8)

  titulo(`2. ACTIVIDADES CONFIGURADAS (${configuradas.length})`)
  parrafo('Estas actividades están incluidas en la configuración del vehículo. Sus frecuencias son las guardadas y están ordenadas de menor a mayor kilometraje.', 8)
  tabla(configuradas.map((a,i) => [
    String(i+1),
    String(a.nombre || 'Actividad sin nombre'),
    String(a.accion || '—'),
    `${numero(a.configuracion?.frecuencia_km)} km`,
    a.es_frecuencia_base ? 'LÍNEA BASE' : 'CONFIGURADA',
  ]), ['N.º','Actividad','Acción','Frecuencia guardada','Clasificación'],
  { 0:{cellWidth:10,halign:'center'},1:{cellWidth:73},2:{cellWidth:45},3:{cellWidth:29,halign:'center'},4:{cellWidth:contentWidth-157} })

  titulo(`3. ACTIVIDADES NO CONFIGURADAS (${noConfiguradas.length})`)
  parrafo('Las siguientes actividades pertenecen al catálogo técnico del tipo de vehículo, pero NO están incluidas en el plan guardado. Se presentan para que el instructor indique si conviene incorporarlas.', 8)
  tabla(noConfiguradas.map((a,i)=>[
    String(i+1),
    String(a.nombre || 'Actividad sin nombre'),
    String(a.accion || '—'),
    frecuenciaSugerida(a,base) ? `${numero(frecuenciaSugerida(a,base))} km` : 'No definida',
    'NO CONFIGURADA',
  ]), ['N.º','Actividad','Acción','Frecuencia sugerida','Estado'],
  {0:{cellWidth:10,halign:'center'},1:{cellWidth:73},2:{cellWidth:45},3:{cellWidth:29,halign:'center'},4:{cellWidth:contentWidth-157}})

  titulo('4. ¿CÓMO SE CALCULA EL PLAN DINÁMICO?')
  parrafo('Primero se configura el plan de cada vehículo: se seleccionan las actividades de mantenimiento y se indica cada cuántos kilómetros corresponde revisarlas o realizarlas. Al guardar y finalizar la configuración, el sistema muestra un primer punto de control, llamado P1, para iniciar el seguimiento.')
  parrafo('IMPORTANTE: que aparezca P1 no significa que deba hacerse inmediatamente un mantenimiento, ni que esté vencido o ejecutado. Es una referencia inicial de programación. El sistema utiliza las lecturas preoperacionales para mostrar el recorrido del vehículo y ajustar sus fechas estimadas a medida que pasa el tiempo.')
  parrafo('El cambio de aceite de motor y su filtro es la actividad base del plan. Cuando realmente corresponda hacerlo, el instructor registrará el servicio con la fecha y el kilometraje verdaderos. Ese primer cambio de aceite ejecutado establece P1 como línea base; finalizar el plan en Administración no equivale a realizarlo.')
  const ejemploBase = kmP1 != null && Number.isFinite(kmP1) && base && p1Ejecutado
    ? `Ejemplo de este vehículo: el cambio de aceite P1 se registró a los ${numero(kmP1)} km. Con una frecuencia base de ${numero(base)} km, P2 corresponde a ${numero(kmP1 + base)} km y P3 a ${numero(kmP1 + 2 * base)} km.`
    : 'Si todavía no se ha registrado el primer cambio de aceite, los siguientes puntos no tienen un kilometraje de referencia real definitivo.'
  parrafo(`Después de acreditar P1, el sistema calcula automáticamente P2, P3 y los siguientes puntos sumando la frecuencia de aceite configurada al kilometraje base. ${ejemploBase}`)
  parrafo('Las fechas de esos puntos son estimaciones, no órdenes para asistir al taller ese día. Se calculan con el promedio de kilómetros recorridos, obtenido de preoperacionales válidos en ventanas de 30, 60 y 90 días. Si el vehículo se usa más o menos, las fechas se ajustan; el kilometraje de control sigue siendo la referencia principal.')
  parrafo('Al realizar el cambio de aceite de un punto, se recomienda hacer también las otras actividades que correspondan según sus propias frecuencias y el estado del vehículo. Así se aprovecha la visita al taller. Si una actividad necesita otro momento o proveedor, se puede registrar por separado sin marcar como realizadas las demás.')
  parrafo('Cada actividad conserva su frecuencia individual y su historial de ejecución. Las actividades mostradas en el plan son una guía: solo deben acreditarse cuando realmente se hayan realizado. Los trabajos no ejecutados pueden quedar pendientes con su motivo.')
  parrafo('El punto de cambio de aceite admite el rango de kilometraje configurado (habitualmente ±500 km). Este rango para asociar servicios al mismo punto es distinto de la validación del odómetro contra los preoperacionales próximos a la fecha de ejecución.')

  titulo('5. ¿CÓMO DEBE REGISTRAR EL INSTRUCTOR CADA SERVICIO?')
  const pasos = [
    '1. Registrar la fecha efectiva del mantenimiento y el kilometraje real, y verificarlo contra los preoperacionales próximos a esa fecha.',
    '2. Seleccionar el proveedor/taller y el técnico responsables de esa intervención. Un mismo punto puede tener trabajos de distintos proveedores en registros separados.',
    '3. Marcar exclusivamente las actividades realmente ejecutadas. Las del punto se muestran primero; otras frecuencias y actividades libres se abren solo cuando sean necesarias.',
    '4. Registrar repuestos, factura (o NO APLICA), costos, tiempo de parada y observaciones. Indicar motivos para cualquier actividad marcada como pendiente.',
    '5. Si otros trabajos se efectúan dentro de ±500 km del aceite ya registrado, asociarlos como servicio adicional del mismo punto, sin alterar la referencia del cambio de aceite.',
  ]
  for (const paso of pasos) parrafo(paso, 9, 1.1)
  saltoSiNecesario(16)
  doc.setFont('helvetica','bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.navy)
  const aviso = 'IMPORTANTE: no marque como realizada una actividad que no se ejecutó.'
  doc.text(aviso, margin, y)
  y += 9

  titulo('6. REVISIÓN DEL INSTRUCTOR Y AJUSTES PROPUESTOS')
  parrafo('Indique actividades por agregar o retirar, ajustes de frecuencia y observaciones.', 8, 1)
  // Bloque compacto: comentarios y firmas juntos para evitar una hoja de
  // firmas aislada. Se mantiene el espacio de revisión sin desperdiciar páginas.
  saltoSiNecesario(29)
  doc.setDrawColor(...COLOR.line)
  for (let i = 0; i < 2; i++) {
    doc.line(margin, y + 3.5, width - margin, y + 3.5)
    y += 6.5
  }
  doc.setFontSize(8)
  doc.setTextColor(...COLOR.ink)
  doc.text('Instructor: ______________________________________', margin, y + 4)
  doc.text('Firma: ______________________', margin + 99, y + 4)
  y += 8
  doc.text('Revisión del administrador: ________________________', margin, y + 4)
  doc.text('Fecha: ______________________', margin + 99, y + 4)

  // Encabezado y folio en todas las páginas, incluidas las creadas por autotable.
  const total = doc.getNumberOfPages()
  for (let pagina=1;pagina<=total;pagina++){
    doc.setPage(pagina)
    doc.setFillColor(...COLOR.navy)
    doc.rect(0,0,width,32,'F')
    doc.setTextColor(...COLOR.white)
    doc.setFont('helvetica','bold')
    doc.setFontSize(15)
    doc.text('DATA-CEA',margin,12)
    doc.setFontSize(9.6)
    doc.text('INFORME CONFIGURACIÓN DEL PLAN DE MANTENIMIENTO',margin,20)
    doc.setFont('helvetica','normal')
    doc.setFontSize(8)
    doc.text(`${vehiculo.placa || '—'}  |  ${tituloEstado}`,margin,27)
    doc.setDrawColor(...COLOR.line)
    doc.line(margin,height-13,width-margin,height-13)
    doc.setTextColor(...COLOR.gray)
    doc.setFontSize(7.5)
    doc.text('Guía de revisión; no es orden de trabajo ni constancia de ejecución.',margin,height-8)
    doc.text(`Página ${pagina} de ${total}`,width-margin,height-8,{align:'right'})
  }
  const placa = String(vehiculo.placa || 'VEHICULO').replace(/[^A-Z0-9_-]/gi,'_')
  doc.save(`Revision_Plan_Mantenimiento_${placa}.pdf`)
}
