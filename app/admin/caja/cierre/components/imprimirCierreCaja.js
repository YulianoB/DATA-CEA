// app/admin/caja/cierre/components/imprimirCierreCaja.js

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
  valor
) {
  if (
    !valor
  ) {
    return '-'
  }

  const fecha =
    String(
      valor
    ).slice(
      0,
      10
    )

  const partes =
    fecha.split(
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

function formatearFechaHora(
  valor
) {
  if (
    !valor
  ) {
    return '-'
  }

  try {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        timeZone:
          'America/Bogota',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',

        hour:
          '2-digit',

        minute:
          '2-digit',

        hour12:
          false,
      }
    ).format(
      new Date(
        valor
      )
    )
  } catch {
    return valor
  }
}

function formatearHora(
  valor
) {
  if (
    !valor
  ) {
    return '-'
  }

  try {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        timeZone:
          'America/Bogota',

        hour:
          '2-digit',

        minute:
          '2-digit',

        hour12:
          false,
      }
    ).format(
      new Date(
        valor
      )
    )
  } catch {
    return '-'
  }
}

function nombreTipoCierre(
  tipo
) {
  return mayusculas(
    tipo
  ) ===
    'TURNO'
    ? 'ARQUEO DE TURNO'
    : 'CIERRE DIARIO'
}

function nombreEstadoDiferencia(
  valor
) {
  const numero =
    Number(
      valor ||
      0
    )

  if (
    numero ===
    0
  ) {
    return 'CUADRADO'
  }

  if (
    numero >
    0
  ) {
    return 'SOBRANTE'
  }

  return 'FALTANTE'
}

// =========================================================
// DATOS EMPRESA
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
// RESUMEN MEDIOS DE PAGO
// =========================================================

function construirResumenMedios(
  cierre
) {
  const resumen =
    cierre?.resumen_medios_pago ||
    {}

  const filas =
    Object.entries(
      resumen
    )

  if (
    filas.length ===
    0
  ) {
    return `
      <tr>
        <td
          colspan="4"
          class="centrado vacio"
        >
          Sin movimientos por medios de pago.
        </td>
      </tr>
    `
  }

  return filas
    .map(
      ([
        medio,
        datos,
      ]) => `
        <tr>

          <td>
            ${escaparHtml(
              medio
            )}
          </td>

          <td class="numero">
            ${escaparHtml(
              formatearMoneda(
                datos?.ingresos
              )
            )}
          </td>

          <td class="numero">
            ${escaparHtml(
              formatearMoneda(
                datos?.egresos
              )
            )}
          </td>

          <td class="numero negrita">
            ${escaparHtml(
              formatearMoneda(
                datos?.neto
              )
            )}
          </td>

        </tr>
      `
    )
    .join('')
}

// =========================================================
// FILAS INGRESOS
// =========================================================

function construirFilasIngresos(
  ingresos = []
) {
  if (
    !Array.isArray(
      ingresos
    ) ||
    ingresos.length ===
      0
  ) {
    return `
      <tr>
        <td
          colspan="8"
          class="centrado vacio"
        >
          No hay ingresos en este período.
        </td>
      </tr>
    `
  }

  return ingresos
    .map(
      ingreso => {
        const anulado =
          mayusculas(
            ingreso?.estado
          ) ===
          'ANULADO'

        const cliente =
          texto(
            ingreso?.nombre_cliente ||
            ingreso?.nombre_pagador ||
            ingreso?.documento_cliente ||
            ingreso?.documento ||
            '-'
          )

        const documento =
          texto(
            ingreso?.documento_cliente ||
            ingreso?.documento_pagador ||
            ingreso?.documento ||
            ''
          )

        const concepto =
          texto(
            ingreso
              ?.concepto
              ?.nombre ||
            ingreso?.descripcion ||
            '-'
          )

        const medio =
          texto(
            ingreso
              ?.medio_pago
              ?.nombre ||
            '-'
          )

        return `
          <tr
            class="${
              anulado
                ? 'anulado'
                : ''
            }"
          >

            <td class="nowrap">
              ${escaparHtml(
                formatearFecha(
                  ingreso?.fecha
                )
              )}
            </td>

            <td class="nowrap">
              ${escaparHtml(
                formatearHora(
                  ingreso?.created_at
                )
              )}
            </td>

            <td>
              ${escaparHtml(
                cliente
              )}

              ${
                documento
                  ? `
                    <div class="subdato">
                      ${escaparHtml(
                        documento
                      )}
                    </div>
                  `
                  : ''
              }
            </td>

            <td>
              ${escaparHtml(
                concepto
              )}
            </td>

            <td>
              ${escaparHtml(
                medio
              )}
            </td>

            <td class="numero nowrap">
              ${escaparHtml(
                formatearMoneda(
                  ingreso?.valor
                )
              )}
            </td>

            <td class="centrado">
              ${
                anulado
                  ? 'ANULADO'
                  : 'ACTIVO'
              }
            </td>

            <td>
              ${escaparHtml(
                ingreso?.recibido_por ||
                '-'
              )}
            </td>

          </tr>
        `
      }
    )
    .join('')
}

// =========================================================
// FILAS EGRESOS
// =========================================================

function construirFilasEgresos(
  egresos = []
) {
  if (
    !Array.isArray(
      egresos
    ) ||
    egresos.length ===
      0
  ) {
    return `
      <tr>
        <td
          colspan="9"
          class="centrado vacio"
        >
          No hay egresos en este período.
        </td>
      </tr>
    `
  }

  return egresos
    .map(
      egreso => {
        const anulado =
          mayusculas(
            egreso?.estado
          ) ===
          'ANULADO'

        const concepto =
          texto(
            egreso
              ?.concepto
              ?.nombre ||
            egreso?.descripcion ||
            '-'
          )

        const medio =
          texto(
            egreso
              ?.medio_pago
              ?.nombre ||
            '-'
          )

        const beneficiario =
          texto(
            egreso?.beneficiario ||
            '-'
          )

        const documento =
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

        const referencia =
          texto(
            egreso
              ?.numero_cuenta_cobro ||
            `#${egreso?.id || ''}`
          )

        const placa =
          texto(
            egreso?.placa ||
            egreso
              ?.vehiculo
              ?.placa
          )

        return `
          <tr
            class="${
              anulado
                ? 'anulado'
                : ''
            }"
          >

            <td class="nowrap">
              ${escaparHtml(
                formatearFecha(
                  egreso?.fecha
                )
              )}
            </td>

            <td class="nowrap">
              ${escaparHtml(
                formatearHora(
                  egreso?.created_at
                )
              )}
            </td>

            <td>
              ${escaparHtml(
                referencia
              )}
            </td>

            <td>
              ${escaparHtml(
                beneficiario
              )}

              ${
                documento
                  ? `
                    <div class="subdato">
                      ${escaparHtml(
                        documento
                      )}
                    </div>
                  `
                  : ''
              }
            </td>

            <td>
              ${escaparHtml(
                concepto
              )}

              ${
                placa
                  ? `
                    <div class="subdato">
                      Placa:
                      ${escaparHtml(
                        mayusculas(
                          placa
                        )
                      )}
                    </div>
                  `
                  : ''
              }
            </td>

            <td>
              ${escaparHtml(
                medio
              )}
            </td>

            <td class="numero nowrap">
              ${escaparHtml(
                formatearMoneda(
                  egreso?.valor
                )
              )}
            </td>

            <td class="centrado">
              ${
                anulado
                  ? 'ANULADO'
                  : 'ACTIVO'
              }
            </td>

            <td>
              ${escaparHtml(
                egreso?.pagado_por ||
                '-'
              )}
            </td>

          </tr>
        `
      }
    )
    .join('')
}

// =========================================================
// IMPRESIÓN
// =========================================================

export function imprimirCierreCaja(
  cierre,
  opciones = {}
) {
  if (
    !cierre
  ) {
    throw new Error(
      'No se recibió el cierre para imprimir.'
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

  const tipo =
    mayusculas(
      cierre?.tipo_cierre
    )

  const titulo =
    nombreTipoCierre(
      tipo
    )

  const consecutivo =
    texto(
      cierre?.consecutivo
    ) ||
    `#${cierre?.id || ''}`

  const ingresos =
    Array.isArray(
      cierre?.ingresos
    )
      ? cierre.ingresos
      : []

  const egresos =
    Array.isArray(
      cierre?.egresos
    )
      ? cierre.egresos
      : []

  const diferencia =
    Number(
      cierre
        ?.diferencia_efectivo ||
      0
    )

  const estadoDiferencia =
    nombreEstadoDiferencia(
      diferencia
    )

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

  const ventana =
    window.open(
      '',
      '_blank',
      'width=1150,height=850'
    )

  if (
    !ventana
  ) {
    throw new Error(
      'El navegador bloqueó la ventana de impresión.'
    )
  }

  ventana.document.write(`
    <!DOCTYPE html>

    <html lang="es">

      <head>

        <meta charset="UTF-8" />

        <title>
          ${escaparHtml(
            consecutivo
          )}
        </title>

        <style>

          @page {
            size: Letter portrait;
            margin: 10mm 9mm 12mm 9mm;
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
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            font-size: 9px;
            color: #111827;
            background: white;
          }

          .pagina {
            width: 100%;
            margin: 0 auto;
          }

          /* ==============================================
             ENCABEZADO
          ============================================== */

          .encabezado {
            text-align: center;
            padding-bottom: 8px;
            border-bottom: 2px solid #1f2937;
          }

          .empresa {
            font-size: 15px;
            line-height: 1.2;
            font-weight: 800;
            text-transform: uppercase;
          }

          .nit {
            margin-top: 2px;
            font-size: 9.5px;
            font-weight: 700;
          }

          .datos-empresa {
            margin-top: 2px;
            font-size: 8px;
            line-height: 1.35;
            color: #4b5563;
          }

          .titulo-documento {
            text-align: center;
            margin-top: 10px;
          }

          .titulo-documento h1 {
            margin: 0;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 0.4px;
          }

          .consecutivo {
            margin-top: 3px;
            font-size: 10px;
            font-weight: 800;
          }

          .fecha-cierre {
            margin-top: 2px;
            color: #4b5563;
            font-size: 8.5px;
          }

          /* ==============================================
             BLOQUES
          ============================================== */

          .bloque {
            margin-top: 9px;
            border: 1px solid #9ca3af;
            border-radius: 4px;
            overflow: hidden;
            break-inside: avoid;
          }

          .bloque-titulo {
            background: #f3f4f6;
            padding: 4px 6px;
            border-bottom: 1px solid #d1d5db;
            font-size: 8.5px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .bloque-contenido {
            padding: 6px;
          }

          /* ==============================================
             DATOS GENERALES
          ============================================== */

          .datos-grid {
            display: grid;
            grid-template-columns:
              repeat(4, 1fr);
            gap: 6px;
          }

          .dato {
            border-right: 1px solid #e5e7eb;
            padding-right: 5px;
          }

          .dato:last-child {
            border-right: 0;
          }

          .dato-label {
            font-size: 7px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 700;
          }

          .dato-valor {
            margin-top: 2px;
            font-size: 8.5px;
            font-weight: 700;
          }

          /* ==============================================
             RESUMEN FINANCIERO
          ============================================== */

          .resumen-grid {
            display: grid;
            grid-template-columns:
              repeat(4, 1fr);
            gap: 5px;
          }

          .resumen-item {
            border: 1px solid #d1d5db;
            border-radius: 4px;
            padding: 5px;
          }

          .resumen-label {
            font-size: 6.8px;
            text-transform: uppercase;
            color: #6b7280;
            font-weight: 700;
          }

          .resumen-valor {
            margin-top: 2px;
            font-size: 10px;
            font-weight: 800;
          }

          .diferencia {
            margin-top: 6px;
            border: 2px solid #1f2937;
            border-radius: 4px;
            padding: 6px;

            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .diferencia-label {
            font-size: 7px;
            text-transform: uppercase;
            color: #6b7280;
          }

          .diferencia-valor {
            margin-top: 2px;
            font-size: 12px;
            font-weight: 800;
          }

          .diferencia-estado {
            font-size: 9px;
            font-weight: 800;
          }

          /* ==============================================
             TABLAS
          ============================================== */

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            background: #f3f4f6;
            font-size: 7px;
            text-transform: uppercase;
            text-align: left;
            font-weight: 800;
            padding: 4px;
            border: 1px solid #d1d5db;
          }

          td {
            font-size: 7.2px;
            vertical-align: top;
            padding: 3.5px 4px;
            border: 1px solid #d1d5db;
            line-height: 1.3;
          }

          tr {
            break-inside: avoid;
          }

          .numero {
            text-align: right;
          }

          .centrado {
            text-align: center;
          }

          .nowrap {
            white-space: nowrap;
          }

          .negrita {
            font-weight: 800;
          }

          .subdato {
            margin-top: 1px;
            font-size: 6.5px;
            color: #6b7280;
          }

          .anulado {
            color: #991b1b;
            background: #fef2f2;
            text-decoration: line-through;
          }

          .vacio {
            padding: 10px;
            color: #6b7280;
          }

          /* ==============================================
             OBSERVACIONES
          ============================================== */

          .observaciones {
            white-space: pre-line;
            line-height: 1.45;
            font-size: 8px;
          }

          /* ==============================================
             FIRMAS
          ============================================== */

          .firmas {
            margin-top: 40px;
            display: flex;
            gap: 35px;
            break-inside: avoid;
          }

          .firma {
            flex: 1;
            text-align: center;
          }

          .firma-linea {
            border-top: 1px solid #111827;
            padding-top: 4px;
          }

          .firma-titulo {
            font-size: 7.5px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .firma-dato {
            margin-top: 2px;
            font-size: 7px;
            color: #4b5563;
          }

          /* ==============================================
             PIE
          ============================================== */

          .pie {
            margin-top: 14px;
            padding-top: 5px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 6.5px;
          }

          @media print {

            .pagina {
              width: 100%;
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
                    NIT
                    ${escaparHtml(
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
              ${escaparHtml(
                titulo
              )}
            </h1>

            <div class="consecutivo">
              ${escaparHtml(
                consecutivo
              )}
            </div>

            <div class="fecha-cierre">
              Fecha:
              ${escaparHtml(
                formatearFecha(
                  cierre?.fecha
                )
              )}
            </div>

          </div>

          <!-- =============================================
               INFORMACIÓN GENERAL
          ============================================== -->

          <div class="bloque">

            <div class="bloque-titulo">
              Información del período
            </div>

            <div class="bloque-contenido">

              <div class="datos-grid">

                <div class="dato">

                  <div class="dato-label">
                    Desde
                  </div>

                  <div class="dato-valor">
                    ${escaparHtml(
                      formatearFechaHora(
                        cierre
                          ?.periodo_desde
                      )
                    )}
                  </div>

                </div>

                <div class="dato">

                  <div class="dato-label">
                    Hasta
                  </div>

                  <div class="dato-valor">
                    ${escaparHtml(
                      formatearFechaHora(
                        cierre
                          ?.periodo_hasta
                      )
                    )}
                  </div>

                </div>

                <div class="dato">

                  <div class="dato-label">
                    Usuario cierre
                  </div>

                  <div class="dato-valor">
                    ${escaparHtml(
                      cierre
                        ?.usuario_cierre ||
                      '-'
                    )}
                  </div>

                </div>

                <div class="dato">

                  <div class="dato-label">
                    Estado
                  </div>

                  <div class="dato-valor">
                    ${escaparHtml(
                      cierre?.estado ||
                      '-'
                    )}
                  </div>

                </div>

              </div>

              ${
                tipo ===
                'TURNO'
                  ? `
                    <div
                      class="datos-grid"
                      style="margin-top: 7px;"
                    >

                      <div class="dato">

                        <div class="dato-label">
                          Entrega
                        </div>

                        <div class="dato-valor">
                          ${escaparHtml(
                            cierre
                              ?.usuario_entrega ||
                            '-'
                          )}
                        </div>

                      </div>

                      <div class="dato">

                        <div class="dato-label">
                          Recibe
                        </div>

                        <div class="dato-valor">
                          ${escaparHtml(
                            cierre
                              ?.usuario_recibe ||
                            '-'
                          )}
                        </div>

                      </div>

                    </div>
                  `
                  : ''
              }

            </div>

          </div>

          <!-- =============================================
               RESUMEN FINANCIERO
          ============================================== -->

          <div class="bloque">

            <div class="bloque-titulo">
              Resumen financiero
            </div>

            <div class="bloque-contenido">

              <div class="resumen-grid">

                <div class="resumen-item">

                  <div class="resumen-label">
                    Saldo inicial
                  </div>

                  <div class="resumen-valor">
                    ${escaparHtml(
                      formatearMoneda(
                        cierre
                          ?.saldo_inicial_efectivo
                      )
                    )}
                  </div>

                </div>

                <div class="resumen-item">

                  <div class="resumen-label">
                    Total ingresos
                  </div>

                  <div class="resumen-valor">
                    ${escaparHtml(
                      formatearMoneda(
                        cierre
                          ?.total_ingresos_sistema
                      )
                    )}
                  </div>

                </div>

                <div class="resumen-item">

                  <div class="resumen-label">
                    Total egresos
                  </div>

                  <div class="resumen-valor">
                    ${escaparHtml(
                      formatearMoneda(
                        cierre
                          ?.total_egresos_sistema
                      )
                    )}
                  </div>

                </div>

                <div class="resumen-item">

                  <div class="resumen-label">
                    Movimiento neto
                  </div>

                  <div class="resumen-valor">
                    ${escaparHtml(
                      formatearMoneda(
                        cierre
                          ?.movimiento_neto
                      )
                    )}
                  </div>

                </div>

                <div class="resumen-item">

                  <div class="resumen-label">
                    Ingresos efectivo
                  </div>

                  <div class="resumen-valor">
                    ${escaparHtml(
                      formatearMoneda(
                        cierre
                          ?.ingresos_efectivo
                      )
                    )}
                  </div>

                </div>

                <div class="resumen-item">

                  <div class="resumen-label">
                    Egresos efectivo
                  </div>

                  <div class="resumen-valor">
                    ${escaparHtml(
                      formatearMoneda(
                        cierre
                          ?.egresos_efectivo
                      )
                    )}
                  </div>

                </div>

                <div class="resumen-item">

                  <div class="resumen-label">
                    Efectivo esperado
                  </div>

                  <div class="resumen-valor">
                    ${escaparHtml(
                      formatearMoneda(
                        cierre
                          ?.efectivo_esperado
                      )
                    )}
                  </div>

                </div>

                <div class="resumen-item">

                  <div class="resumen-label">
                    Efectivo contado
                  </div>

                  <div class="resumen-valor">
                    ${escaparHtml(
                      formatearMoneda(
                        cierre
                          ?.efectivo_contado
                      )
                    )}
                  </div>

                </div>

              </div>

              <div class="diferencia">

                <div>

                  <div class="diferencia-label">
                    Diferencia de efectivo
                  </div>

                  <div class="diferencia-valor">
                    ${escaparHtml(
                      formatearMoneda(
                        diferencia
                      )
                    )}
                  </div>

                </div>

                <div class="diferencia-estado">
                  ${escaparHtml(
                    estadoDiferencia
                  )}
                </div>

              </div>

            </div>

          </div>

          <!-- =============================================
               RESUMEN POR MEDIO
          ============================================== -->

          <div class="bloque">

            <div class="bloque-titulo">
              Resumen por medio de pago
            </div>

            <div class="bloque-contenido">

              <table>

                <thead>

                  <tr>

                    <th>
                      Medio
                    </th>

                    <th class="numero">
                      Ingresos
                    </th>

                    <th class="numero">
                      Egresos
                    </th>

                    <th class="numero">
                      Neto
                    </th>

                  </tr>

                </thead>

                <tbody>

                  ${construirResumenMedios(
                    cierre
                  )}

                </tbody>

              </table>

            </div>

          </div>

          <!-- =============================================
               INGRESOS
          ============================================== -->

          <div class="bloque">

            <div class="bloque-titulo">
              Ingresos del período
              (${ingresos.length})
            </div>

            <div class="bloque-contenido">

              <table>

                <thead>

                  <tr>

                    <th>
                      Fecha
                    </th>

                    <th>
                      Hora
                    </th>

                    <th>
                      Cliente
                    </th>

                    <th>
                      Concepto
                    </th>

                    <th>
                      Medio
                    </th>

                    <th class="numero">
                      Valor
                    </th>

                    <th>
                      Estado
                    </th>

                    <th>
                      Recibido por
                    </th>

                  </tr>

                </thead>

                <tbody>

                  ${construirFilasIngresos(
                    ingresos
                  )}

                </tbody>

              </table>

            </div>

          </div>

          <!-- =============================================
               EGRESOS
          ============================================== -->

          <div class="bloque">

            <div class="bloque-titulo">
              Egresos del período
              (${egresos.length})
            </div>

            <div class="bloque-contenido">

              <table>

                <thead>

                  <tr>

                    <th>
                      Fecha
                    </th>

                    <th>
                      Hora
                    </th>

                    <th>
                      Cuenta
                    </th>

                    <th>
                      Beneficiario
                    </th>

                    <th>
                      Concepto
                    </th>

                    <th>
                      Medio
                    </th>

                    <th class="numero">
                      Valor
                    </th>

                    <th>
                      Estado
                    </th>

                    <th>
                      Registrado por
                    </th>

                  </tr>

                </thead>

                <tbody>

                  ${construirFilasEgresos(
                    egresos
                  )}

                </tbody>

              </table>

            </div>

          </div>

          <!-- =============================================
               CONTEO DE MOVIMIENTOS
          ============================================== -->

          <div class="bloque">

            <div class="bloque-titulo">
              Control de movimientos
            </div>

            <div class="bloque-contenido">

              <div class="datos-grid">

                <div class="dato">

                  <div class="dato-label">
                    Recibos activos
                  </div>

                  <div class="dato-valor">
                    ${escaparHtml(
                      cierre
                        ?.cantidad_recibos ||
                      0
                    )}
                  </div>

                </div>

                <div class="dato">

                  <div class="dato-label">
                    Recibos anulados
                  </div>

                  <div class="dato-valor">
                    ${escaparHtml(
                      cierre
                        ?.cantidad_recibos_anulados ||
                      0
                    )}
                  </div>

                </div>

                <div class="dato">

                  <div class="dato-label">
                    Egresos activos
                  </div>

                  <div class="dato-valor">
                    ${escaparHtml(
                      cierre
                        ?.cantidad_egresos ||
                      0
                    )}
                  </div>

                </div>

                <div class="dato">

                  <div class="dato-label">
                    Egresos anulados
                  </div>

                  <div class="dato-valor">
                    ${escaparHtml(
                      cierre
                        ?.cantidad_egresos_anulados ||
                      0
                    )}
                  </div>

                </div>

              </div>

            </div>

          </div>

          <!-- =============================================
               OBSERVACIONES
          ============================================== -->

          ${
            texto(
              cierre?.observaciones
            )
              ? `
                <div class="bloque">

                  <div class="bloque-titulo">
                    Observaciones
                  </div>

                  <div class="bloque-contenido observaciones">
                    ${escaparHtml(
                      cierre.observaciones
                    )}
                  </div>

                </div>
              `
              : ''
          }

          <!-- =============================================
               FIRMAS
          ============================================== -->

          <div class="firmas">

            ${
              tipo ===
              'TURNO'
                ? `
                  <div class="firma">

                    <div class="firma-linea">

                      <div class="firma-titulo">
                        Entrega la caja
                      </div>

                      <div class="firma-dato">
                        ${escaparHtml(
                          cierre
                            ?.usuario_entrega ||
                          ''
                        )}
                      </div>

                    </div>

                  </div>

                  <div class="firma">

                    <div class="firma-linea">

                      <div class="firma-titulo">
                        Recibe la caja
                      </div>

                      <div class="firma-dato">
                        ${escaparHtml(
                          cierre
                            ?.usuario_recibe ||
                          ''
                        )}
                      </div>

                    </div>

                  </div>
                `
                : `
                  <div class="firma">

                    <div class="firma-linea">

                      <div class="firma-titulo">
                        Responsable del cierre
                      </div>

                      <div class="firma-dato">
                        ${escaparHtml(
                          cierre
                            ?.usuario_cierre ||
                          ''
                        )}
                      </div>

                    </div>

                  </div>

                  <div class="firma">

                    <div class="firma-linea">

                      <div class="firma-titulo">
                        Revisión / Administración
                      </div>

                      ${
                        cierre
                          ?.revisado_por
                          ? `
                            <div class="firma-dato">
                              ${escaparHtml(
                                cierre.revisado_por
                              )}
                            </div>
                          `
                          : ''
                      }

                    </div>

                  </div>
                `
            }

          </div>

          <!-- =============================================
               PIE
          ============================================== -->

          <div class="pie">

            Documento generado desde el módulo de Caja · Cierre de Caja.

            <br />

            ${escaparHtml(
              consecutivo
            )}
            ·
            ${escaparHtml(
              formatearFechaHora(
                cierre?.created_at
              )
            )}

          </div>

        </div>

        <script>

          window.onload = function () {

            setTimeout(
              function () {
                window.print()
              },
              250
            )

          }

        </script>

      </body>

    </html>
  `)

  ventana.document.close()
}

export function imprimirTablaCierreDiario(cierre, opciones = {}) {
  if (!cierre?.cierre_confirmado || cierre?.cierre_diario?.estado !== 'CERRADO') {
    throw new Error('El cierre diario debe estar confirmado para imprimir.')
  }
  const registro = cierre.cierre_diario
  const empresa = obtenerEmpresa(opciones.empresa || {})
  const movimientos = [...(cierre.movimientos || [])].sort(
    (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
  )
  const filas = (items, ingresoGrupo) => items.map(item => {
    const ingreso = ingresoGrupo
    const concepto = texto(item?.concepto?.nombre || item.descripcion || '-')
    const categoria = ingreso && /curso|refuerzo/i.test(concepto) && item.categoria
      ? '<small>Categoría(s): ' + escaparHtml(item.categoria) + '</small>' : ''
    const referencia = ingreso
      ? item.referencia_pago || 'REC-' + item.id
      : item.numero_cuenta_cobro || item.numero_factura || item.referencia_pago || 'EGR-' + item.id
    const tercero = ingreso
      ? item.nombre_cliente || item.nombre_pagador || item.documento_cliente || item.documento || '-'
      : item.beneficiario || '-'
    const responsable = ingreso ? item.recibido_por : item.pagado_por
    const columnas = [
      escaparHtml(formatearHora(item.created_at)),
      escaparHtml(referencia),
      escaparHtml(tercero),
      escaparHtml(concepto) + categoria,
      escaparHtml(item?.medio_pago?.nombre || '-'),
      escaparHtml(responsable || '-'),
      escaparHtml(formatearMoneda(item.valor))
    ]
    return '<tr>' + columnas.map((v, i) => '<td' + (i === 6 ? ' class="numero"' : '') + '>' + v + '</td>').join('') + '</tr>'
  }).join('')
  const ingresos = movimientos.filter(item => item.tipo_movimiento === 'INGRESO')
  const egresos = movimientos.filter(item => item.tipo_movimiento === 'EGRESO')
  const totalActivo = items => items.reduce((s, item) => s + (mayusculas(item.estado) === 'ANULADO' ? 0 : Number(item.valor || 0)), 0)
  const totalIngresosDetalle = totalActivo(ingresos)
  const totalEgresosDetalle = totalActivo(egresos)
  const medios = Object.entries(cierre.resumen_medios_pago || {})
    .map(([medio, dato]) => '<div class="total ingreso"><span>Ingresos · ' + escaparHtml(medio) +
      '</span><strong>' + escaparHtml(formatearMoneda(dato?.ingresos)) + '</strong></div>').join('')
  const fechaImpresion = formatearFechaHora(new Date().toISOString())
  const ventana = window.open('', '_blank', 'width=1200,height=850')
  if (!ventana) throw new Error('El navegador bloqueó la ventana de impresión.')
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="UTF-8">
<title>${escaparHtml(registro.consecutivo || 'Cierre diario')}</title>
<style>
@page{size:letter landscape;margin:12mm 13mm 14mm 13mm}
*{box-sizing:border-box}body{font:9px Arial,sans-serif;color:#1e293b;margin:0}
header{display:flex;justify-content:space-between;gap:18px;border-bottom:2px solid #24638c;padding-bottom:9px;margin-bottom:12px}
h1{font-size:15px;margin:0 0 5px;color:#24638c}h2{font-size:11px;margin:14px 0 7px;color:#24638c;border-left:3px solid #24638c;padding-left:7px}
.empresa{font-size:14px;font-weight:bold}.sub{font-size:8px;color:#475569;margin-top:4px}
.meta{text-align:right;line-height:1.6}table{border-collapse:collapse;width:100%;table-layout:fixed}
thead{display:table-header-group}th{background:#d9f1f6;color:#17354b;text-align:left}
td,th{border:1px solid #cbd5e1;padding:6px 5px;vertical-align:top;overflow-wrap:anywhere}
tr{break-inside:avoid;page-break-inside:avoid}small{display:block;font-size:8px;color:#64748b;margin-top:3px}
.numero{text-align:right;white-space:nowrap;font-weight:bold}
.totales{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:14px}
.total{min-width:145px;text-align:right;padding:9px 12px;border:1px solid #cbd5e1;border-radius:5px}
.total span{display:block;font-weight:bold;margin-bottom:6px}.total strong{font-size:13px}
.ingreso{background:#ecfdf5;color:#065f46}.egreso{background:#fef2f2;color:#991b1b}.neto{background:#eff6ff;color:#1e40af}
.seccion{margin-top:13px}.finanzas{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:16px;break-inside:avoid}.firmas{display:grid;grid-template-columns:1fr 1fr;gap:38px;margin-top:35px;break-inside:avoid}.firma{border-top:1px solid #94a3b8;padding-top:7px;font-weight:bold}.firma small{font-weight:normal}.resumen td,.resumen th{padding:6px}.totales{margin-top:0}.total{min-width:135px}footer{display:flex;justify-content:space-between;margin-top:18px;padding-top:7px;border-top:1px solid #cbd5e1;color:#64748b;font-size:8px}

@page{size:letter landscape;margin:13mm 15mm 15mm 15mm}
.pagina-cierre{width:100%;max-width:249mm;margin:0 auto;padding:2mm 1mm}
.cabecera-cierre{text-align:center;border-bottom:2px solid #24638c;padding:5px 0 12px;margin-bottom:16px}
.cabecera-cierre h1{font-size:16px;margin:0}.cabecera-cierre .empresa{font-size:14px;margin-top:5px}
.cabecera-cierre .nit{font-weight:bold;margin-top:5px}
.bloque{margin:14px 0;break-inside:avoid}
.datos-cierre{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:12px}
.datos-cierre span{display:block;font-size:8px;color:#64748b;text-transform:uppercase}
.datos-cierre strong{display:block;margin-top:4px;font-size:10px}
.totales{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px}
.total{min-width:0}.neto{grid-column:auto}
.seccion{margin-top:17px}.seccion tfoot td{background:#eaf3f9;font-weight:bold;border-top:2px solid #24638c}
.observaciones{border:1px solid #cbd5e1;border-radius:5px;padding:11px;min-height:42px;white-space:pre-wrap}
.firmas{display:flex;justify-content:space-around;gap:35px;margin-top:35px}
.firma{border:0;text-align:center;width:43%}.firma .linea{display:inline-block;border-top:1px solid #64748b;padding:7px 10px 0}
.firma small{display:block;margin-top:5px}footer{justify-content:center;text-align:center}

/* Presentación compacta de una página para cierres con volumen habitual. */
/* Margen interno fijo: evita que la configuración del navegador pegue tablas al borde. */
@page{size:letter landscape;margin:0}
html,body{width:100%;margin:0;padding:0}
.pagina-cierre{width:100%;max-width:none;margin:0;padding:12mm 14mm 11mm 14mm;box-sizing:border-box}
.pagina-cierre table{max-width:100%}

body{font-size:7.5px;line-height:1.18}
/* Se conserva el espacio interior del contenedor principal. */
.cabecera-cierre{padding:1px 0 5px;margin-bottom:7px}
.cabecera-cierre h1{font-size:13px}
.cabecera-cierre .empresa{font-size:11px;margin-top:2px}
.cabecera-cierre .nit{font-size:8px;margin-top:2px}
.bloque{margin:6px 0}
.datos-cierre{padding:6px 9px;gap:7px}
.datos-cierre strong{font-size:8px;margin-top:1px}
h2{font-size:9px;margin:6px 0 4px}
.totales{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:3px}
.total{padding:5px 8px}
.total strong{font-size:10px;margin-top:2px}
.seccion{margin-top:7px}
td,th{padding:3px 4px;font-size:7.2px;line-height:1.13}
small{font-size:7px;margin-top:1px}
footer{margin-top:8px;padding-top:4px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="pagina-cierre">
<div class="cabecera-cierre"><h1>CIERRE DE CAJA</h1><div class="empresa">${escaparHtml(empresa.nombre || empresa.razon_social)}</div><div class="nit">NIT ${escaparHtml(empresa.nit)}</div></div>
<div class="bloque datos-cierre"><div><span>Fecha de cierre</span><strong>${escaparHtml(formatearFecha(registro.fecha || cierre.fecha))}</strong></div><div><span>Consecutivo</span><strong>${escaparHtml(registro.consecutivo || '-')}</strong></div><div><span>Usuario que generó el cierre</span><strong>${escaparHtml(registro.usuario_cierre || '-')}</strong></div></div>
<section class="bloque"><h2>RESUMEN FINANCIERO</h2><div class="totales">
<div class="total ingreso"><span>TOTAL INGRESOS</span><strong>${escaparHtml(formatearMoneda(cierre.total_ingresos_sistema))}</strong></div>
<div class="total egreso"><span>TOTAL EGRESOS</span><strong>${escaparHtml(formatearMoneda(cierre.total_egresos_sistema))}</strong></div>
<div class="total neto"><span>RESULTADO DEL DÍA (INGRESOS − EGRESOS)</span><strong>${escaparHtml(formatearMoneda(cierre.movimiento_neto))}</strong></div></div></section>
<section class="bloque"><h2>RESUMEN POR MEDIO DE PAGO</h2><table class="resumen"><thead><tr><th>Medio</th><th>Ingresos</th><th>Egresos</th><th>Resultado</th></tr></thead><tbody>${Object.entries(cierre.resumen_medios_pago || {}).map(([medio,dato]) => '<tr><td>'+escaparHtml(medio)+'</td><td class="numero">'+escaparHtml(formatearMoneda(dato?.ingresos))+'</td><td class="numero">'+escaparHtml(formatearMoneda(dato?.egresos))+'</td><td class="numero">'+escaparHtml(formatearMoneda(dato?.neto))+'</td></tr>').join('')}</tbody></table></section>
<section class="seccion"><h2>Ingresos del día (${ingresos.length})</h2><table><colgroup><col style="width:7%"><col style="width:13%"><col style="width:23%"><col style="width:22%"><col style="width:9%"><col style="width:17%"><col style="width:9%"></colgroup><thead><tr><th>Hora</th><th>Referencia</th><th>Cliente / Pagador</th><th>Concepto / Detalle</th><th>Medio</th><th>Responsable</th><th class="numero">Valor</th></tr></thead><tbody>${filas(ingresos, true)}</tbody><tfoot><tr><td colspan="6" style="text-align:right">TOTAL INGRESOS</td><td class="numero">${escaparHtml(formatearMoneda(totalIngresosDetalle))}</td></tr></tfoot></table></section>
<section class="seccion"><h2>Egresos del día (${egresos.length})</h2><table><colgroup><col style="width:7%"><col style="width:13%"><col style="width:23%"><col style="width:22%"><col style="width:9%"><col style="width:17%"><col style="width:9%"></colgroup><thead><tr><th>Hora</th><th>Referencia</th><th>Beneficiario</th><th>Concepto / Detalle</th><th>Medio</th><th>Responsable</th><th class="numero">Valor</th></tr></thead><tbody>${filas(egresos, false)}</tbody><tfoot><tr><td colspan="6" style="text-align:right">TOTAL EGRESOS</td><td class="numero">${escaparHtml(formatearMoneda(totalEgresosDetalle))}</td></tr></tfoot></table></section>
<footer>Documento generado desde el módulo de Caja · Cierre de Caja. · Fecha de impresión: ${escaparHtml(fechaImpresion)}</footer></div>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`)
  ventana.document.close()
}
