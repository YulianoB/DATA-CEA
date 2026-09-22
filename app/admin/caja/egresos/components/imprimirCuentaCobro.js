// app/admin/caja/egresos/components/imprimirCuentaCobro.js

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

function escaparHtml(
  valor
) {
  return texto(
    valor
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    )
}

function formatearFecha(
  valor
) {
  if (
    !valor
  ) {
    return '-'
  }

  const partes =
    String(
      valor
    )
      .slice(
        0,
        10
      )
      .split(
        '-'
      )

  if (
    partes.length !==
    3
  ) {
    return valor
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
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

// =========================================================
// NÚMEROS A LETRAS
// =========================================================

const UNIDADES = [
  '',
  'UNO',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
]

const ESPECIALES = {
  10:
    'DIEZ',
  11:
    'ONCE',
  12:
    'DOCE',
  13:
    'TRECE',
  14:
    'CATORCE',
  15:
    'QUINCE',
  16:
    'DIECISÉIS',
  17:
    'DIECISIETE',
  18:
    'DIECIOCHO',
  19:
    'DIECINUEVE',
  20:
    'VEINTE',
  21:
    'VEINTIUNO',
  22:
    'VEINTIDÓS',
  23:
    'VEINTITRÉS',
  24:
    'VEINTICUATRO',
  25:
    'VEINTICINCO',
  26:
    'VEINTISÉIS',
  27:
    'VEINTISIETE',
  28:
    'VEINTIOCHO',
  29:
    'VEINTINUEVE',
}

const DECENAS = [
  '',
  '',
  '',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
]

const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
]

function numeroMenorMilALetras(
  numero
) {
  const n =
    Math.floor(
      numero
    )

  if (
    n ===
    0
  ) {
    return ''
  }

  if (
    n ===
    100
  ) {
    return 'CIEN'
  }

  let resultado =
    ''

  const centenas =
    Math.floor(
      n / 100
    )

  const resto =
    n %
    100

  if (
    centenas >
    0
  ) {
    resultado =
      CENTENAS[
        centenas
      ]
  }

  if (
    resto ===
    0
  ) {
    return resultado
  }

  if (
    resultado
  ) {
    resultado +=
      ' '
  }

  if (
    resto <
    10
  ) {
    resultado +=
      UNIDADES[
        resto
      ]

    return resultado
  }

  if (
    resto <=
    29
  ) {
    resultado +=
      ESPECIALES[
        resto
      ]

    return resultado
  }

  const decena =
    Math.floor(
      resto /
      10
    )

  const unidad =
    resto %
    10

  resultado +=
    DECENAS[
      decena
    ]

  if (
    unidad >
    0
  ) {
    resultado +=
      ` Y ${UNIDADES[unidad]}`
  }

  return resultado
}

function numeroALetras(
  valor
) {
  const numero =
    Math.floor(
      Number(
        valor ||
        0
      )
    )

  if (
    !Number.isFinite(
      numero
    ) ||
    numero <
      0
  ) {
    return ''
  }

  if (
    numero ===
    0
  ) {
    return 'CERO PESOS M/CTE'
  }

  let restante =
    numero

  const partes = []

  const millones =
    Math.floor(
      restante /
      1000000
    )

  restante =
    restante %
    1000000

  if (
    millones >
    0
  ) {
    if (
      millones ===
      1
    ) {
      partes.push(
        'UN MILLÓN'
      )
    } else {
      partes.push(
        `${numeroMenorMilALetras(
          millones
        )} MILLONES`
      )
    }
  }

  const miles =
    Math.floor(
      restante /
      1000
    )

  restante =
    restante %
    1000

  if (
    miles >
    0
  ) {
    if (
      miles ===
      1
    ) {
      partes.push(
        'MIL'
      )
    } else {
      partes.push(
        `${numeroMenorMilALetras(
          miles
        )} MIL`
      )
    }
  }

  if (
    restante >
    0
  ) {
    partes.push(
      numeroMenorMilALetras(
        restante
      )
    )
  }

  let resultado =
    partes
      .join(
        ' '
      )
      .replace(
        /\bUNO\b/g,
        'UN'
      )
      .trim()

  return `${resultado} PESOS M/CTE`
}

// =========================================================
// CONSTRUIR DESCRIPCIÓN
// =========================================================
//
// La observación se integra debajo de la descripción,
// sin imprimir el título "Observaciones".
//
// =========================================================

function construirDescripcion(
  egreso
) {
  const descripcion =
    texto(
      egreso?.descripcion
    )

  const observaciones =
    texto(
      egreso?.observaciones
    )

  const partes = []

  if (
    descripcion
  ) {
    partes.push(
      escaparHtml(
        descripcion
      )
    )
  }

  if (
    observaciones
  ) {
    partes.push(
      escaparHtml(
        observaciones
      )
    )
  }

  if (
    partes.length ===
    0
  ) {
    return '-'
  }

  return partes.join(
    '<br><br>'
  )
}

// =========================================================
// CONSTRUIR DATOS EMPRESA
// =========================================================

function obtenerEmpresa(
  empresa = {}
) {
  return {
    nombre:
      texto(
        empresa?.nombre ||
        empresa?.razon_social ||
        empresa?.empresaNombre ||
        ''
      ),

    razon_social:
      texto(
        empresa?.razon_social
      ),

    nit:
      texto(
        empresa?.nit
      ),

    direccion:
      texto(
        empresa?.direccion
      ),

    ciudad:
      texto(
        empresa?.ciudad
      ),

    departamento:
      texto(
        empresa?.departamento
      ),

    telefono:
      texto(
        empresa?.telefono
      ),

    email:
      texto(
        empresa?.email ||
        empresa?.email_principal
      ),

    representante_legal:
      texto(
        empresa?.representante_legal
      ),
  }
}

// =========================================================
// IMPRESIÓN
// =========================================================

export function imprimirCuentaCobro(
  egreso,
  opciones = {}
) {
  if (
    !egreso
  ) {
    throw new Error(
      'No se recibió el egreso para imprimir.'
    )
  }

  const empresa =
    obtenerEmpresa(
      opciones?.empresa ||
      {}
    )

  if (
    !empresa.nombre &&
    opciones?.empresaNombre
  ) {
    empresa.nombre =
      texto(
        opciones
          .empresaNombre
      )
  }

  if (
    !empresa.nit &&
    opciones?.nit
  ) {
    empresa.nit =
      texto(
        opciones.nit
      )
  }

  const consecutivo =
    texto(
      egreso
        ?.numero_cuenta_cobro
    ) ||
    `CC-${String(
      egreso?.id ||
      ''
    ).padStart(
      6,
      '0'
    )}`

  const concepto =
    texto(
      egreso
        ?.concepto
        ?.nombre
    )

  const medioPago =
    texto(
      egreso
        ?.medio_pago
        ?.nombre
    )

  const placa =
    texto(
      egreso?.placa ||
      egreso
        ?.vehiculo
        ?.placa
    )

  const tipoVehiculo =
    texto(
      egreso
        ?.vehiculo
        ?.tipo_vehiculo
    )

  const marcaVehiculo =
    texto(
      egreso
        ?.vehiculo
        ?.marca
    )

  const lineaVehiculo =
    texto(
      egreso
        ?.vehiculo
        ?.linea
    )

  const modeloVehiculo =
    texto(
      egreso
        ?.vehiculo
        ?.modelo
    )

  const valor =
    Number(
      egreso?.valor ||
      0
    )

  const valorLetras =
    numeroALetras(
      valor
    )

  const descripcionHtml =
    construirDescripcion(
      egreso
    )

  const ventana =
    window.open(
      '',
      '_blank',
      'width=950,height=800'
    )

  if (
    !ventana
  ) {
    throw new Error(
      'El navegador bloqueó la ventana de impresión.'
    )
  }

  const datosUbicacion =
    [
      empresa.direccion,
      empresa.ciudad,
      empresa.departamento,
    ]
      .filter(
        Boolean
      )
      .join(
        ' · '
      )

  const datosContacto =
    [
      empresa.telefono
        ? `Tel. ${empresa.telefono}`
        : '',
      empresa.email,
    ]
      .filter(
        Boolean
      )
      .join(
        ' · '
      )

  const tieneVehiculo =
    Boolean(
      placa ||
      tipoVehiculo ||
      marcaVehiculo ||
      lineaVehiculo ||
      modeloVehiculo
    )

  const datosVehiculo =
    [
      placa
        ? `PLACA ${mayusculas(
            placa
          )}`
        : '',
      tipoVehiculo,
      marcaVehiculo,
      lineaVehiculo,
      modeloVehiculo,
    ]
      .filter(
        Boolean
      )
      .join(
        ' · '
      )

  const documentoBeneficiario =
    [
      texto(
        egreso
          ?.tipo_documento_beneficiario
      ),
      texto(
        egreso
          ?.documento_beneficiario
      ),
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      )

  const numeroFactura =
    texto(
      egreso
        ?.numero_factura
    )

  const referenciaPago =
    texto(
      egreso
        ?.referencia_pago
    )

  const responsable =
    texto(
      egreso
        ?.pagado_por
    )

  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">

      <head>

        <meta charset="UTF-8" />

        <title>${escaparHtml(
          consecutivo
        )}</title>

        <style>

          @page {
            size: Letter portrait;
            margin: 15mm 16mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            font-size: 11px;
            background: white;
          }

          .pagina {
            width: 100%;
            max-width: 760px;
            margin: 0 auto;
          }

          .encabezado {
            text-align: center;
            padding-bottom: 13px;
            border-bottom: 2px solid #1f2937;
          }

          .empresa {
            font-size: 17px;
            line-height: 1.2;
            font-weight: 800;
            text-transform: uppercase;
          }

          .nit {
            margin-top: 3px;
            font-size: 11px;
            font-weight: 700;
          }

          .datos-empresa {
            margin-top: 4px;
            font-size: 9.5px;
            line-height: 1.4;
            color: #4b5563;
          }

          .titulo-documento {
            margin-top: 17px;
            text-align: center;
          }

          .titulo-documento h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }

          .consecutivo {
            margin-top: 5px;
            font-size: 12px;
            font-weight: 800;
          }

          .fecha {
            margin-top: 3px;
            font-size: 10px;
            color: #4b5563;
          }

          .bloque {
            margin-top: 15px;
            border: 1px solid #9ca3af;
            border-radius: 6px;
            overflow: hidden;
          }

          .bloque-titulo {
            background: #f3f4f6;
            padding: 6px 9px;
            font-size: 10px;
            font-weight: 800;
            border-bottom: 1px solid #d1d5db;
          }

          .bloque-contenido {
            padding: 9px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          td {
            padding: 5px 6px;
            vertical-align: top;
          }

          .label {
            width: 24%;
            color: #4b5563;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .valor {
            font-size: 10.5px;
            font-weight: 600;
          }

          .descripcion {
            white-space: normal;
            line-height: 1.55;
            font-size: 10.5px;
          }

          .valor-box {
            margin-top: 15px;
            border: 2px solid #1f2937;
            border-radius: 6px;
            padding: 11px 12px;
          }

          .valor-numero {
            font-size: 20px;
            font-weight: 800;
            text-align: right;
          }

          .valor-letras {
            margin-top: 7px;
            font-size: 10px;
            font-weight: 700;
            line-height: 1.4;
            text-transform: uppercase;
          }

          .info-adicional {
            margin-top: 10px;
            font-size: 9.5px;
            color: #4b5563;
            line-height: 1.5;
          }

          .firmas {
            display: flex;
            gap: 50px;
            margin-top: 72px;
          }

          .firma {
            flex: 1;
            text-align: center;
          }

          .firma-linea {
            border-top: 1px solid #111827;
            padding-top: 6px;
            min-height: 45px;
          }

          .firma-titulo {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .firma-dato {
            margin-top: 3px;
            font-size: 9px;
            color: #4b5563;
          }

          .pie {
            margin-top: 28px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
            font-size: 8px;
            color: #6b7280;
            text-align: center;
          }

          @media print {

            body {
              background: white;
            }

            .pagina {
              max-width: none;
            }

          }

        </style>

      </head>

      <body>

        <div class="pagina">

          <!-- =============================================
               ENCABEZADO
          ============================================== -->

          <div class="encabezado">

            <div class="empresa">
              ${escaparHtml(
                empresa.nombre ||
                'CENTRO DE ENSEÑANZA AUTOMOVILÍSTICA'
              )}
            </div>

            ${
              empresa.nit
                ? `
                  <div class="nit">
                    NIT ${escaparHtml(
                      empresa.nit
                    )}
                  </div>
                `
                : ''
            }

            ${
              datosUbicacion
                ? `
                  <div class="datos-empresa">
                    ${escaparHtml(
                      datosUbicacion
                    )}
                  </div>
                `
                : ''
            }

            ${
              datosContacto
                ? `
                  <div class="datos-empresa">
                    ${escaparHtml(
                      datosContacto
                    )}
                  </div>
                `
                : ''
            }

          </div>

          <!-- =============================================
               TÍTULO
          ============================================== -->

          <div class="titulo-documento">

            <h1>
              CUENTA DE COBRO
            </h1>

            <div class="consecutivo">
              ${escaparHtml(
                consecutivo
              )}
            </div>

            <div class="fecha">
              Fecha:
              ${escaparHtml(
                formatearFecha(
                  egreso?.fecha
                )
              )}
            </div>

          </div>

          <!-- =============================================
               BENEFICIARIO
          ============================================== -->

          <div class="bloque">

            <div class="bloque-titulo">
              BENEFICIARIO
            </div>

            <div class="bloque-contenido">

              <table>

                <tr>

                  <td class="label">
                    Nombre / Razón social
                  </td>

                  <td class="valor">
                    ${escaparHtml(
                      egreso
                        ?.beneficiario ||
                      '-'
                    )}
                  </td>

                </tr>

                <tr>

                  <td class="label">
                    Documento
                  </td>

                  <td class="valor">
                    ${escaparHtml(
                      documentoBeneficiario ||
                      '-'
                    )}
                  </td>

                </tr>

              </table>

            </div>

          </div>

          <!-- =============================================
               CONCEPTO
          ============================================== -->

          <div class="bloque">

            <div class="bloque-titulo">
              CONCEPTO DEL PAGO
            </div>

            <div class="bloque-contenido">

              <table>

                <tr>

                  <td class="label">
                    Concepto
                  </td>

                  <td class="valor">
                    ${escaparHtml(
                      mayusculas(
                        concepto
                      ) ||
                      '-'
                    )}
                  </td>

                </tr>

                ${
                  tieneVehiculo
                    ? `
                      <tr>

                        <td class="label">
                          Vehículo
                        </td>

                        <td class="valor">
                          ${escaparHtml(
                            datosVehiculo
                          )}
                        </td>

                      </tr>
                    `
                    : ''
                }

                <tr>

                  <td class="label">
                    Descripción
                  </td>

                  <td class="descripcion">
                    ${descripcionHtml}
                  </td>

                </tr>

              </table>

            </div>

          </div>

          <!-- =============================================
               VALOR
          ============================================== -->

          <div class="valor-box">

            <div class="valor-numero">
              ${escaparHtml(
                formatearMoneda(
                  valor
                )
              )}
            </div>

            <div class="valor-letras">
              SON:
              ${escaparHtml(
                valorLetras
              )}
            </div>

          </div>

          <!-- =============================================
               INFORMACIÓN ADICIONAL
          ============================================== -->

          ${
            medioPago ||
            numeroFactura ||
            referenciaPago
              ? `
                <div class="info-adicional">

                  ${
                    medioPago
                      ? `
                        <div>
                          <strong>Medio de pago:</strong>
                          ${escaparHtml(
                            medioPago
                          )}
                        </div>
                      `
                      : ''
                  }

                  ${
                    numeroFactura
                      ? `
                        <div>
                          <strong>Factura:</strong>
                          ${escaparHtml(
                            numeroFactura
                          )}
                        </div>
                      `
                      : ''
                  }

                  ${
                    referenciaPago
                      ? `
                        <div>
                          <strong>Referencia:</strong>
                          ${escaparHtml(
                            referenciaPago
                          )}
                        </div>
                      `
                      : ''
                  }

                </div>
              `
              : ''
          }

          <!-- =============================================
               FIRMAS
          ============================================== -->

          <div class="firmas">

            <div class="firma">

              <div class="firma-linea">

                <div class="firma-titulo">
                  Beneficiario
                </div>

                <div class="firma-dato">
                  ${escaparHtml(
                    egreso
                      ?.beneficiario ||
                    ''
                  )}
                </div>

                <div class="firma-dato">
                  ${escaparHtml(
                    documentoBeneficiario
                  )}
                </div>

              </div>

            </div>

            <div class="firma">

              <div class="firma-linea">

                <div class="firma-titulo">
                  Responsable del pago
                </div>

                ${
                  responsable
                    ? `
                      <div class="firma-dato">
                        ${escaparHtml(
                          responsable
                        )}
                      </div>
                    `
                    : ''
                }

              </div>

            </div>

          </div>

          <!-- =============================================
               PIE
          ============================================== -->

          <div class="pie">
            Documento generado desde el módulo de Caja · Egresos.
          </div>

        </div>

        <script>

          window.onload = function () {

            setTimeout(
              function () {
                window.print()
              },
              200
            )

          }

        </script>

      </body>

    </html>
  `)

  ventana.document.close()
}

// =========================================================
// EXPORT ADICIONAL
// =========================================================

export {
  numeroALetras,
}