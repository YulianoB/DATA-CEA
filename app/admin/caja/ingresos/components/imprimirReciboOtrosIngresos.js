// app/admin/caja/ingresos/components/imprimirReciboOtrosIngresos.js

// =========================================================
// HELPERS
// =========================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}

function mayusculas(
  valor
) {
  return texto(
    valor
  ).toUpperCase()
}

function hoyColombia() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'America/Bogota',

      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',
    }
  ).format(
    new Date()
  )
}

function formatearMoneda(
  valor
) {
  return new Intl.NumberFormat(
    'es-CO',
    {
      style:
        'currency',

      currency:
        'COP',

      minimumFractionDigits:
        0,

      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      valor ||
      0
    )
  )
}

function formatearFecha(
  fecha
) {
  if (
    !fecha
  ) {
    return '-'
  }

  try {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',

        timeZone:
          'America/Bogota',
      }
    ).format(
      new Date(
        `${String(
          fecha
        ).slice(
          0,
          10
        )}T12:00:00`
      )
    )
  } catch {
    return fecha
  }
}

function escaparHtml(
  valor
) {
  return String(
    valor ?? ''
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    )
}

function nombreMedioPagoVisible(
  nombre
) {
  const valor =
    mayusculas(
      nombre
    )

  if (
    [
      'TARJETA CREDITO',
      'TARJETA CRÉDITO',
      'TARJETA DE CREDITO',
      'TARJETA DE CRÉDITO',
      'CREDITO',
      'CRÉDITO',
    ].includes(
      valor
    )
  ) {
    return 'CREDITO'
  }

  if (
    [
      'TARJETA DEBITO',
      'TARJETA DÉBITO',
      'TARJETA DE DEBITO',
      'TARJETA DE DÉBITO',
      'DEBITO',
      'DÉBITO',
    ].includes(
      valor
    )
  ) {
    return 'DEBITO'
  }

  return valor
}

function normalizarComparacion(
  valor
) {
  return mayusculas(
    valor
  )
    .normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
}

// =========================================================
// IMPRESIÓN
// =========================================================

export function imprimirReciboOtrosIngresos(
  datos,
  {
    empresaNombre =
      '',
  } = {}
) {
  const recibo =
    datos?.recibo ||
    {}

  const consecutivo =
    recibo?.consecutivo ||
    (
      recibo?.id
        ? `RC-${String(
            recibo.id
          ).padStart(
            6,
            '0'
          )}`
        : '-'
    )

  const fecha =
    recibo?.fecha ||
    hoyColombia()

  const medio =
    nombreMedioPagoVisible(
      recibo
        ?.medio_pago
        ?.nombre ||
      datos
        ?.medioPago
        ?.nombre
    ) ||
    '-'

  const nombre =
    datos
      ?.cliente
      ?.nombre ||
    recibo
      ?.nombre_cliente ||
    recibo
      ?.nombre_pagador ||
    '-'

  const documento =
    datos
      ?.cliente
      ?.documento ||
    recibo
      ?.documento_cliente ||
    recibo
      ?.documento_pagador ||
    recibo
      ?.documento ||
    '-'

  const tipoDocumento =
    datos
      ?.cliente
      ?.tipo_documento ||
    recibo
      ?.tipo_documento_cliente ||
    ''

  const concepto =
    datos
      ?.concepto
      ?.nombre ||
    recibo
      ?.concepto
      ?.nombre ||
    recibo
      ?.descripcion ||
    '-'

  const valor =
    Number(
      recibo?.valor ||
      datos?.valor ||
      0
    )

  const descripcion =
    datos?.descripcion ||
    recibo?.descripcion ||
    concepto

  const referencia =
    recibo?.referencia_pago ||
    datos?.referencia ||
    '-'

  const observaciones =
    recibo?.observaciones ||
    datos?.observaciones ||
    ''

  const recibidoPor =
    recibo?.recibido_por ||
    '-'

  const categoriaRefuerzo =
    texto(
      datos?.categoria ||
      recibo?.categoria
    )

  const cantidadClasesRefuerzo =
    Number(
      datos
        ?.cantidad_clases_refuerzo ||
      recibo
        ?.cantidad_clases_refuerzo ||
      0
    )

  const esRefuerzo =
    normalizarComparacion(
      concepto
    ) ===
    'REFUERZO PRACTICO'

  const construirCopia =
    copia => `
      <section class="receipt">

        <table>

          <tbody>

            <tr>

              <td
                colspan="4"
                class="head"
              >

                <div class="title">
                  RECIBO DE CAJA
                </div>

                <div class="company">
                  ${escaparHtml(
                    empresaNombre ||
                    'CEA'
                  )}
                </div>

                <div class="copy">
                  ${escaparHtml(
                    copia
                  )}
                </div>

              </td>

            </tr>

            <tr>

              <th>
                RECIBO
              </th>

              <td>
                ${escaparHtml(
                  consecutivo
                )}
              </td>

              <th>
                FECHA
              </th>

              <td>
                ${escaparHtml(
                  formatearFecha(
                    fecha
                  )
                )}
              </td>

            </tr>

            <tr>

              <th>
                CLIENTE
              </th>

              <td colspan="3">
                ${escaparHtml(
                  nombre
                )}
              </td>

            </tr>

            <tr>

              <th>
                DOCUMENTO
              </th>

              <td>
                ${escaparHtml(
                  `${
                    tipoDocumento
                      ? `${tipoDocumento} `
                      : ''
                  }${documento}`
                )}
              </td>

              <th>
                TIPO
              </th>

              <td>
                ${escaparHtml(
                  datos?.tipo ===
                  'APRENDIZ'
                    ? 'APRENDIZ'
                    : 'CLIENTE'
                )}
              </td>

            </tr>

            ${
              datos?.tipo ===
              'APRENDIZ'
                ? `
                  <tr>

                    <th>
                      MATRÍCULA
                    </th>

                    <td>
                      ${escaparHtml(
                        datos?.matricula ||
                        '-'
                      )}
                    </td>

                    <th>
                      CATEGORÍA
                    </th>

                    <td>
                      ${escaparHtml(
                        datos?.categorias ||
                        '-'
                      )}
                    </td>

                  </tr>
                `
                : ''
            }

            <tr>

              <td
                colspan="4"
                class="section"
              >
                DETALLE DEL INGRESO
              </td>

            </tr>

            <tr>

              <th>
                CONCEPTO
              </th>

              <td colspan="3">
                ${escaparHtml(
                  concepto
                )}
              </td>

            </tr>

            <tr>

              <th>
                DESCRIPCIÓN
              </th>

              <td colspan="3">
                ${escaparHtml(
                  descripcion
                )}
              </td>

            </tr>

            ${
              esRefuerzo
                ? `
                  <tr>

                    <th>
                      CATEGORÍA
                    </th>

                    <td>
                      ${escaparHtml(
                        categoriaRefuerzo ||
                        '-'
                      )}
                    </td>

                    <th>
                      CLASES
                    </th>

                    <td>
                      ${escaparHtml(
                        cantidadClasesRefuerzo ||
                        '-'
                      )}
                    </td>

                  </tr>
                `
                : ''
            }

            <tr>

              <th colspan="2">
                VALOR RECIBIDO
              </th>

              <td
                colspan="2"
                class="money strong"
              >
                ${escaparHtml(
                  formatearMoneda(
                    valor
                  )
                )}
              </td>

            </tr>

            <tr>

              <th>
                MEDIO PAGO
              </th>

              <td>
                ${escaparHtml(
                  medio
                )}
              </td>

              <th>
                ENTIDAD
              </th>

              <td>
                ${escaparHtml(
                  referencia ||
                  '-'
                )}
              </td>

            </tr>

            <tr>

              <th>
                RECIBIDO POR
              </th>

              <td colspan="3">
                ${escaparHtml(
                  recibidoPor
                )}
              </td>

            </tr>

            ${
              observaciones
                ? `
                  <tr>

                    <th>
                      OBSERVACIONES
                    </th>

                    <td colspan="3">
                      ${escaparHtml(
                        observaciones
                      )}
                    </td>

                  </tr>
                `
                : ''
            }

            <tr>

              <td
                colspan="2"
                class="signature"
              >
                ___________________________
                <br>
                FIRMA CLIENTE
              </td>

              <td
                colspan="2"
                class="signature"
              >
                ___________________________
                <br>
                RECIBIDO POR
              </td>

            </tr>

          </tbody>

        </table>

      </section>
    `

  const ventana =
    window.open(
      '',
      '_blank',
      'width=1200,height=760'
    )

  if (
    !ventana
  ) {
    throw new Error(
      'El navegador bloqueó la ventana de impresión.'
    )
  }

  ventana.document.open()

  ventana.document.write(`
    <!doctype html>

    <html lang="es">

      <head>

        <meta charset="utf-8">

        <title>
          ${escaparHtml(
            consecutivo
          )}
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            background: #E5E7EB;
          }

          body {
            padding: 18px 0 32px;
          }

          .toolbar {
            width: min(216mm, calc(100vw - 32px));
            margin: 0 auto 12px;
            display: flex;
            justify-content: flex-end;
            gap: 8px;
          }

          .toolbar button {
            min-height: 34px;
            padding: 7px 13px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 700;
            transition:
              background-color 0.15s ease,
              border-color 0.15s ease;
          }

          .btn-print {
            background: #2F6F89;
            border: 1px solid #2F6F89;
            color: #FFFFFF;
          }

          .btn-print:hover {
            background: #24586D;
            border-color: #24586D;
          }

          .btn-close {
            background: #FFFFFF;
            border: 1px solid #CBD5E1;
            color: #475569;
          }

          .btn-close:hover {
            background: #F1F5F9;
          }

          .grid {
            display: flex;
            flex-direction: column;
            width: 216mm;
            height: 279mm;
            margin: 0 auto;
            gap: 0;
            background: #FFFFFF;
            box-shadow: 0 4px 18px rgba(15, 23, 42, 0.18);
          }

          .receipt {
            width: 100%;
            min-width: 0;
            height: 132mm;
            padding: 10mm 8mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .receipt + .receipt {
            border-top: 1px dashed #777;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 9.5px;
            line-height: 1.3;
          }

          th,
          td {
            border: 1px solid #000;
            padding: 6px 7px;
            vertical-align: middle;
            overflow-wrap: anywhere;
          }

          th {
            text-align: left;
            font-weight: 700;
          }

          .head {
            text-align: center;
            padding: 9px 6px;
          }

          .title {
            font-size: 15px;
            font-weight: 900;
          }

          .company {
            margin-top: 2px;
            font-size: 10.5px;
            font-weight: 700;
          }

          .copy {
            margin-top: 2px;
            font-size: 8px;
          }

          .section {
            text-align: center;
            font-weight: 900;
            padding: 5px;
          }

          .money {
            text-align: right;
            white-space: nowrap;
          }

          .strong {
            font-weight: 900;
          }

          .signature {
            height: 52px;
            text-align: center;
            vertical-align: bottom;
            padding-bottom: 3px;
            font-size: 8px;
          }

          @page {
            size: letter portrait;
            margin: 8mm;
          }

          @media print {

            html,
            body {
              background: #FFFFFF;
            }

            body {
              padding: 0;
            }

            .toolbar {
              display: none;
            }

            .grid {
              display: flex;
              flex-direction: column;
              width: 100%;
              height: auto;
              margin: 0;
              gap: 0;
              box-shadow: none;
            }

            .receipt {
              height: 132mm;
              padding: 8mm 7mm;
              display: flex;
              align-items: center;
              justify-content: center;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .receipt + .receipt {
              padding-top: 8mm;
            }

          }

        </style>

      </head>

      <body>

        <div class="toolbar">

          <button
            class="btn-print"
            onclick="window.print()"
          >
            IMPRIMIR
          </button>

          <button
            class="btn-close"
            onclick="window.close()"
          >
            CERRAR
          </button>

        </div>

        <main class="grid">

          ${construirCopia(
            'COPIA CLIENTE'
          )}

          ${construirCopia(
            'COPIA CEA'
          )}

        </main>

      </body>

    </html>
  `)

  ventana.document.close()
  ventana.focus()
}