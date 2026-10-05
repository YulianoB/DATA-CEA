// app/admin/caja/ingresos/components/imprimirReciboOtrosIngresos.js

function texto(valor) {
  return String(valor ?? '').trim()
}

function mayusculas(valor) {
  return texto(valor).toUpperCase()
}

function hoyColombia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function formatearMoneda(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(valor || 0))
}

function formatearFecha(fecha) {
  if (!fecha) return '-'

  try {
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Bogota',
    }).format(new Date(`${String(fecha).slice(0, 10)}T12:00:00`))
  } catch {
    return fecha
  }
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function nombreMedioPagoVisible(nombre) {
  const valor = mayusculas(nombre)

  if ([
    'TARJETA CREDITO',
    'TARJETA CRÉDITO',
    'TARJETA DE CREDITO',
    'TARJETA DE CRÉDITO',
    'CREDITO',
    'CRÉDITO',
  ].includes(valor)) {
    return 'CREDITO'
  }

  if ([
    'TARJETA DEBITO',
    'TARJETA DÉBITO',
    'TARJETA DE DEBITO',
    'TARJETA DE DÉBITO',
    'DEBITO',
    'DÉBITO',
  ].includes(valor)) {
    return 'DEBITO'
  }

  return valor
}

function normalizarComparacion(valor) {
  return mayusculas(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function imprimirReciboOtrosIngresos(
  datos,
  {
    empresaNombre = '',
    empresaDatos = {},
    usuarioOperacion = '',
  } = {}
) {
  const recibo = datos?.recibo || {}

  const consecutivo =
    recibo?.consecutivo ||
    (recibo?.id
      ? `RC-${String(recibo.id).padStart(6, '0')}`
      : '-')

  const fecha = recibo?.fecha || hoyColombia()

  const medio =
    nombreMedioPagoVisible(
      recibo?.medio_pago?.nombre ||
      datos?.medioPago?.nombre
    ) || '-'

  const nombre =
    datos?.cliente?.nombre ||
    recibo?.nombre_cliente ||
    recibo?.nombre_pagador ||
    '-'

  const documento =
    datos?.cliente?.documento ||
    recibo?.documento_cliente ||
    recibo?.documento_pagador ||
    recibo?.documento ||
    '-'

  const tipoDocumento =
    datos?.cliente?.tipo_documento ||
    recibo?.tipo_documento_cliente ||
    ''

  const telefono =
    datos?.cliente?.celular ||
    recibo?.celular_cliente ||
    '-'

  const concepto =
    datos?.concepto?.nombre ||
    recibo?.concepto?.nombre ||
    recibo?.descripcion ||
    '-'

  const valor = Number(recibo?.valor || datos?.valor || 0)
  const descripcion = datos?.descripcion || recibo?.descripcion || concepto
  const referencia = recibo?.referencia_pago || datos?.referencia || '-'
  const observaciones = recibo?.observaciones || datos?.observaciones || ''
  const recibidoPor =
    recibo?.recibido_por ||
    usuarioOperacion ||
    '-'

  const categoriaRefuerzo = texto(datos?.categoria || recibo?.categoria)
  const cantidadClasesRefuerzo = Number(
    datos?.cantidad_clases_refuerzo ||
    recibo?.cantidad_clases_refuerzo ||
    0
  )

  const esRefuerzo =
    normalizarComparacion(concepto) === 'REFUERZO PRACTICO'

  const matricula =
    datos?.tipo === 'APRENDIZ'
      ? (datos?.matricula || '-')
      : 'NO APLICA'

  const tipoCliente =
    datos?.tipo === 'APRENDIZ'
      ? 'APRENDIZ'
      : 'CLIENTE'

  const construirCopia = copia => `
    <section class="receipt">
      <div class="receipt-card">
        <header class="receipt-header">
          <div class="brand">
            <div class="title">RECIBO DE CAJA</div>
            <div class="company">${escaparHtml(empresaNombre || 'CEA')}</div>
            <div class="copy">${escaparHtml(copia)}</div>
          </div>
          <div class="receipt-number">
            <div class="receipt-number-label">RECIBO N.º</div>
            <div class="receipt-number-value">${escaparHtml(consecutivo)}</div>
          </div>
        </header>

        <div class="identity-wrap">
          <div class="identity-grid">
            <div><span class="label">Fecha:</span>${escaparHtml(formatearFecha(fecha))}</div>
            <div class="identity-right"><span class="label">Matrícula:</span>${escaparHtml(matricula)}</div>
            <div><span class="label">Nombre:</span>${escaparHtml(nombre)}</div>
            <div class="identity-right"><span class="label">Documento:</span>${escaparHtml(`${tipoDocumento ? `${tipoDocumento} ` : ''}${documento}`)}</div>
            <div><span class="label">Tipo:</span>${escaparHtml(tipoCliente)}</div>
            <div class="identity-right"><span class="label">Teléfono:</span>${escaparHtml(telefono)}</div>
          </div>
        </div>

        <div class="section-block">
          <div class="section-title">DETALLE DEL INGRESO</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Descripción</th>
                <th class="money">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${escaparHtml(concepto)}</td>
                <td>${escaparHtml(descripcion)}</td>
                <td class="money strong">${escaparHtml(formatearMoneda(valor))}</td>
              </tr>
              ${esRefuerzo ? `
                <tr>
                  <td><span class="label">Categoría:</span>${escaparHtml(categoriaRefuerzo || '-')}</td>
                  <td><span class="label">Clases:</span>${escaparHtml(cantidadClasesRefuerzo || '-')}</td>
                  <td></td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <div class="section-block payment-block">
          <div class="section-title">INFORMACIÓN DEL PAGO</div>
          <table class="payment-table">
            <thead>
              <tr>
                <th>Medio de pago</th>
                <th>Entidad financiera</th>
                <th class="money">Valor recibido</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${escaparHtml(medio)}</td>
                <td>${escaparHtml(referencia || '-')}</td>
                <td class="money strong">${escaparHtml(formatearMoneda(valor))}</td>
              </tr>
              ${observaciones ? `
                <tr>
                  <td colspan="3"><span class="label">Observaciones:</span>${escaparHtml(observaciones)}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <div class="origin-block">
          <div class="origin"><span class="label">Origen:</span>OTROS INGRESOS <span class="origin-name">${escaparHtml(empresaNombre || 'CEA')}</span></div>
        </div>

        <div class="signatures-block">
          <div class="signatures">
            <div><div class="signature-line"></div>FIRMA PAGADOR</div>
            <div><div class="signature-line"></div>RECIBIDO POR<div class="signature-name">${escaparHtml(recibidoPor)}</div></div>
          </div>
        </div>

        <footer class="cea-footer">
          ${[
            empresaDatos?.direccion,
            empresaDatos?.telefono,
            empresaDatos?.email_principal,
          ].filter(Boolean).map(escaparHtml).join(' · ')}
        </footer>
      </div>
    </section>
  `

  const ventana = window.open('', '_blank', 'width=1200,height=760')

  if (!ventana) {
    throw new Error('El navegador bloqueó la ventana de impresión.')
  }

  ventana.document.open()
  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${escaparHtml(consecutivo)}</title>
        <style>
          * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
          html,body { margin:0; padding:0; font-family:Arial,Helvetica,sans-serif; color:#17202A; background:#E5E7EB; }
          body { padding:18px 0 32px; }
          .toolbar { width:min(216mm,calc(100vw - 32px)); margin:0 auto 12px; display:flex; justify-content:flex-end; gap:8px; }
          .toolbar button { min-height:34px; padding:7px 13px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700; }
          .btn-print { background:#2F6F89; border:1px solid #2F6F89; color:#FFF; }
          .btn-print:hover { background:#24586D; border-color:#24586D; }
          .btn-close { background:#FFF; border:1px solid #CBD5E1; color:#475569; }
          .btn-close:hover { background:#F1F5F9; }
          .grid { display:flex; flex-direction:column; width:216mm; height:279mm; margin:0 auto; background:#FFF; box-shadow:0 4px 18px rgba(15,23,42,.18); }
          .receipt { width:100%; height:132mm; padding:5mm 7mm; display:flex; align-items:center; justify-content:center; }
          .receipt + .receipt { border-top:1px dashed #94A3B8; }
          .receipt-card { width:100%; max-height:122mm; border:1px solid #64748B; border-radius:10px; overflow:hidden; background:#FFF; }
          .receipt-header { position:relative; border-bottom:1px solid #94A3B8; }
          .brand { width:100%; text-align:center; padding:6px 8px 8px; }
          .title { font-size:13px; font-weight:900; }
          .company { margin-top:1px; font-size:8.5px; font-weight:800; }
          .copy { margin-top:1px; font-size:6.8px; color:#475569; }
          .receipt-number { position:absolute; top:50%; right:7px; transform:translateY(-50%); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2px 0; background:transparent; }
          .receipt-number-label { font-size:7px; font-weight:800; color:#475569; }
          .receipt-number-value { margin-top:3px; padding:3px 8px; min-width:32mm; text-align:center; border:1px solid #94A3B8; border-radius:8px; font-size:12px; font-weight:900; background:#FFF; }
          .identity-wrap { margin:5px 6px 0; border:1px solid #CBD5E1; border-radius:7px; overflow:hidden; }
          .identity-grid { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(0,.75fr); gap:4px 8px; padding:5px 7px; font-size:7.5px; }
          .identity-right { padding-left:18px; }
          .label { font-weight:800; margin-right:4px; }
          .section-block { margin:6px 6px 0; border:1px solid #CBD5E1; border-radius:7px; overflow:hidden; background:#FFF; }
          .section-title { padding:4px 6px; text-align:center; font-size:9px; font-weight:900; background:#FFF; color:#263746; border-bottom:1px solid #CBD5E1; }
          table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:7px; line-height:1.1; }
          th,td { border-right:1px solid #CBD5E1; border-bottom:1px solid #CBD5E1; padding:3px 4px; min-height:16px; vertical-align:middle; overflow-wrap:anywhere; }
          th { text-align:left; font-weight:800; background:#E5E7EB; color:#263746; }
          th:last-child,td:last-child { border-right:0; }
          tbody tr:last-child td,tbody tr:last-child th { border-bottom:0; }
          .detail-table th:nth-child(3),.detail-table td:nth-child(3) { width:25%; }
          .payment-table th:nth-child(1) { width:31%; }
          .payment-table th:nth-child(3) { width:28%; }
          .money { text-align:right; white-space:nowrap; }
          .strong { font-weight:900; }
          .origin-block { margin:6px 6px 0; padding:4px 7px; border:1px solid #CBD5E1; border-radius:7px; background:#FFF; }
          .origin { font-size:7px; }
          .origin-name { margin-left:8px; color:#475569; }
          .signatures-block { margin-top:auto; padding:5px 7px 4px; }
          .signatures { display:grid; grid-template-columns:1fr 1fr; gap:20mm; text-align:center; font-size:6.5px; color:#334155; }
          .signature-line { width:70%; margin:8px auto 2px; border-top:1px solid #475569; }
          .signature-name { margin-top:1px; font-size:5.8px; font-weight:700; color:#475569; }
          .cea-footer { min-height:12px; border-top:1px solid #CBD5E1; padding:2px 6px; text-align:center; font-size:6.2px; font-weight:700; color:#475569; }
          @page { size:216mm 140mm; margin:0; }

          @media print {
            html,body { width:216mm; height:140mm; margin:0; padding:0; background:#FFF; overflow:hidden; }
            .toolbar { display:none; }
            .grid { width:216mm; height:140mm; margin:0; padding:0; display:flex; flex-direction:row; box-shadow:none; overflow:hidden; }
            .receipt { width:108mm; height:140mm; min-width:108mm; max-width:108mm; min-height:140mm; max-height:140mm; margin:0; padding:7mm 4mm; display:flex; align-items:stretch; justify-content:center; break-inside:avoid; page-break-inside:avoid; overflow:hidden; }
            .receipt + .receipt { border-top:0; border-left:.25mm dashed #94A3B8; }
            .receipt-card { width:100%; height:126mm; min-height:126mm; max-height:126mm; display:flex; flex-direction:column; border-radius:2mm; }
            .brand { padding:1.8mm 2mm 2.2mm; }
            .receipt-number { padding:1mm 2mm; }
            .identity-wrap { margin:1.8mm 1.5mm 0; border-radius:1.8mm; }
            .identity-grid { padding:1.4mm 2mm; gap:1mm 3mm; }
            .identity-right { padding-left:3mm; }
            .section-block { margin:2mm 1.5mm 0; }
            .section-title { padding:.9mm 1.5mm; }
            th,td { padding:.8mm 1mm; height:4.6mm; }
            .origin-block { margin:1.6mm 1.5mm 0; padding:1mm 2mm; }
            .signatures-block { margin-top:auto; padding:1.5mm 2mm 1mm; }
            .cea-footer { padding:1mm 2mm; }
            .signature-line { margin-top:1.5mm; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button class="btn-print" onclick="window.print()">IMPRIMIR</button>
          <button class="btn-close" onclick="window.close()">CERRAR</button>
        </div>
        <main class="grid">
          ${construirCopia('COPIA CLIENTE')}
          ${construirCopia('COPIA CEA')}
        </main>
      </body>
    </html>
  `)

  ventana.document.close()
  ventana.focus()
}
