// app/admin/pesv/plan-formacion/documento/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'


// ============================================================
// HELPERS
// ============================================================

function texto(valor) {
  return String(valor ?? '').trim()
}

function obtenerNitUsuario(user) {
  return texto(
    user?.nit ||
    user?.nitEmpresa ||
    user?.nit_empresa ||
    user?.empresaNit ||
    user?.empresa_nit ||
    ''
  )
}

function formatearFecha(valor) {
  if (!valor) return ''

  const fecha = String(valor).slice(0, 10)

  const [
    anio,
    mes,
    dia,
  ] = fecha.split('-')

  if (
    !anio ||
    !mes ||
    !dia
  ) {
    return texto(valor)
  }

  return `${dia}/${mes}/${anio}`
}

function normalizarClave(valor) {
  return texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function nombreEstado(valor) {
  return (
    texto(valor)
      .replaceAll('_', ' ') ||
    '-'
  )
}

function duracionVisual(valor) {
  if (
    valor === null ||
    valor === undefined ||
    texto(valor) === ''
  ) {
    return '-'
  }

  const numero =
    Number(valor)

  if (!Number.isFinite(numero)) {
    return '-'
  }

  return `${numero} h`
}


// ============================================================
// VALOR DE ELEMENTOS DEL ENCABEZADO
// ============================================================

function valorDocumento(
  tipo,
  documento,
  pagina,
  totalPaginas
) {
  switch (tipo) {
    case 'NOMBRE_DOCUMENTO':
      return texto(
        documento?.nombre_documento
      )

    case 'CODIGO':
      return texto(
        documento?.codigo
      )

    case 'FECHA_EDICION':
      return formatearFecha(
        documento?.fecha_edicion
      )

    case 'VERSION':
      return texto(
        documento?.version
      )

    case 'VIGENCIA':
      return formatearFecha(
        documento?.vigencia
      )

    case 'PAGINACION':
      if (
        pagina &&
        totalPaginas
      ) {
        return `${pagina} de ${totalPaginas}`
      }

      return ''

    default:
      return ''
  }
}


// ============================================================
// ENCABEZADO DOCUMENTAL
// ============================================================

function EncabezadoDocumento({
  encabezado,
  documento,
  logo,
  pagina,
  totalPaginas,
}) {
  const estructura =
    encabezado?.estructura &&
    typeof encabezado.estructura ===
      'object'
      ? encabezado.estructura
      : {}

  const celdas =
    Array.isArray(
      estructura?.celdas
    )
      ? estructura.celdas
      : []

  const filas =
    Array.isArray(
      estructura?.filas
    )
      ? estructura.filas
      : []

  const columnas =
    Array.isArray(
      estructura?.columnas
    )
      ? estructura.columnas
      : []

  const configuracion =
    estructura?.configuracion &&
    typeof estructura.configuracion ===
      'object'
      ? estructura.configuracion
      : {}

  const cantidadFilas =
    Number(
      encabezado?.filas
    ) ||
    filas.length ||
    2

  const cantidadColumnas =
    Number(
      encabezado?.columnas
    ) ||
    columnas.length ||
    3

  const anchos =
    Array.from(
      {
        length:
          cantidadColumnas,
      },
      (
        _,
        indice
      ) => {
        const item =
          columnas[indice]

        const ancho =
          Number(
            item?.ancho ??
            item?.width ??
            item
          )

        return (
          Number.isFinite(ancho) &&
          ancho > 0
        )
          ? ancho
          : 1
      }
    )

  const alturas =
    Array.from(
      {
        length:
          cantidadFilas,
      },
      (
        _,
        indice
      ) => {
        const item =
          filas[indice]

        const alto =
          Number(
            item?.alto ??
            item?.altura ??
            item?.height ??
            item
          )

        return (
          Number.isFinite(alto) &&
          alto > 0
        )
          ? `${alto}mm`
          : 'auto'
      }
    )

  const grosorBorde =
    Number(
      configuracion?.grosor_borde
    ) || 1

  const padding =
    Number(
      configuracion?.padding
    )

  const paddingCelda =
    Number.isFinite(padding)
      ? padding
      : 4

  if (
    celdas.length === 0
  ) {
    return (
      <div
        className="
          border
          border-black
          p-3
          text-center
        "
      >
        <div
          className="
            text-[12px]
            font-black
            uppercase
          "
        >
          {documento
            ?.nombre_documento ||
            'PLAN ANUAL DE FORMACIÓN PESV'}
        </div>

        {pagina &&
        totalPaginas && (
          <div
            className="
              mt-1
              text-[8px]
            "
          >
            Página {pagina} de {totalPaginas}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="
        grid
        w-full
        bg-white
      "
      style={{
        gridTemplateColumns:
          anchos
            .map(
              ancho =>
                `${ancho}fr`
            )
            .join(' '),

        gridTemplateRows:
          alturas.join(' '),
      }}
    >
      {celdas.map(
        celda => {
          const elementos =
            Array.isArray(
              celda?.elementos
            )
              ? celda.elementos
              : []

          const fila =
            Number(
              celda?.fila
            ) || 1

          const columna =
            Number(
              celda?.columna
            ) || 1

          const rowSpan =
            Number(
              celda?.rowSpan ??
              celda?.row_span
            ) || 1

          const colSpan =
            Number(
              celda?.colSpan ??
              celda?.col_span
            ) || 1

          const horizontal =
            celda
              ?.alineacion_horizontal ||
            'center'

          const vertical =
            celda
              ?.alineacion_vertical ||
            'center'

          const justifyContent =
            horizontal === 'left'
              ? 'flex-start'
              : horizontal ===
                  'right'
                ? 'flex-end'
                : 'center'

          const alignItems =
            vertical === 'top'
              ? 'flex-start'
              : vertical ===
                  'bottom'
                ? 'flex-end'
                : 'center'

          return (
            <div
              key={
                celda?.id ||
                `${fila}-${columna}`
              }
              className="
                flex
                overflow-hidden
              "
              style={{
                gridRow:
                  `${fila} / span ${rowSpan}`,

                gridColumn:
                  `${columna} / span ${colSpan}`,

                justifyContent,

                alignItems,

                textAlign:
                  horizontal,

                padding:
                  `${paddingCelda}px`,

                borderTop:
                  celda
                    ?.borde_superior ===
                  false
                    ? 'none'
                    : `${grosorBorde}px solid #000`,

                borderBottom:
                  celda
                    ?.borde_inferior ===
                  false
                    ? 'none'
                    : `${grosorBorde}px solid #000`,

                borderLeft:
                  celda
                    ?.borde_izquierdo ===
                  false
                    ? 'none'
                    : `${grosorBorde}px solid #000`,

                borderRight:
                  celda
                    ?.borde_derecho ===
                  false
                    ? 'none'
                    : `${grosorBorde}px solid #000`,
              }}
            >
              <div className="w-full">
                {elementos.map(
                  (
                    elemento,
                    indice
                  ) => {
                    const tipo =
                      texto(
                        elemento?.tipo
                      ).toUpperCase()

                    if (
                      tipo ===
                      'VACIO'
                    ) {
                      return null
                    }

                    if (
                      tipo ===
                      'LOGO'
                    ) {
                      return (
                        <div
                          key={`${tipo}-${indice}`}
                          className="
                            flex
                            h-full
                            w-full
                            items-center
                            justify-center
                          "
                        >
                          {logo?.url ? (
                            <img
                              src={
                                logo.url
                              }
                              alt="Logo institucional"
                              className="
                                max-h-[15mm]
                                max-w-full
                                object-contain
                              "
                            />
                          ) : (
                            <span
                              className="
                                text-[7px]
                                text-gray-400
                              "
                            >
                              LOGO
                            </span>
                          )}
                        </div>
                      )
                    }

                    const valor =
                      tipo === 'TEXTO'
                        ? texto(
                            elemento
                              ?.valor
                          )
                        : valorDocumento(
                            tipo,
                            documento,
                            pagina,
                            totalPaginas
                          )

                    const prefijo =
                      texto(
                        elemento?.prefijo
                      )

                    const tamano =
                      Number(
                        elemento
                          ?.tamano_fuente
                      ) || 8

                    const negrita =
                      elemento
                        ?.negrita ===
                      true

                    return (
                      <div
                        key={`${tipo}-${indice}`}
                        style={{
                          fontSize:
                            `${tamano}px`,

                          fontWeight:
                            negrita
                              ? 700
                              : 400,

                          lineHeight:
                            1.15,
                        }}
                      >
                        {prefijo}
                        {valor}
                      </div>
                    )
                  }
                )}
              </div>
            </div>
          )
        }
      )}
    </div>
  )
}


// ============================================================
// MESES
// ============================================================

const MESES = [
  {
    numero: 1,
    corto: 'ENE',
  },
  {
    numero: 2,
    corto: 'FEB',
  },
  {
    numero: 3,
    corto: 'MAR',
  },
  {
    numero: 4,
    corto: 'ABR',
  },
  {
    numero: 5,
    corto: 'MAY',
  },
  {
    numero: 6,
    corto: 'JUN',
  },
  {
    numero: 7,
    corto: 'JUL',
  },
  {
    numero: 8,
    corto: 'AGO',
  },
  {
    numero: 9,
    corto: 'SEP',
  },
  {
    numero: 10,
    corto: 'OCT',
  },
  {
    numero: 11,
    corto: 'NOV',
  },
  {
    numero: 12,
    corto: 'DIC',
  },
]


// ============================================================
// ACTIVIDAD PROGRAMADA EN MES
// ============================================================

function actividadProgramadaEnMes(
  actividad,
  anio,
  mes
) {
  const fecha =
    texto(
      actividad
        ?.fecha_programada
    ).slice(
      0,
      10
    )

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      fecha
    )
  ) {
    return false
  }

  const [
    anioActividad,
    mesActividad,
  ] =
    fecha
      .split('-')
      .map(Number)

  return (
    Number(
      anioActividad
    ) ===
      Number(anio) &&
    Number(
      mesActividad
    ) ===
      Number(mes)
  )
}


// ============================================================
// CELDA DE RESUMEN
// ============================================================

function DatoResumen({
  titulo,
  children,
}) {
  return (
    <div
      className="
        border-r
        border-black
        last:border-r-0
        px-2
        py-1.5
      "
    >
      <div
        className="
          text-[6px]
          font-black
          uppercase
          text-gray-500
        "
      >
        {titulo}
      </div>

      <div
        className="
          mt-0.5
          text-[7.5px]
          font-semibold
          leading-tight
          text-gray-900
        "
      >
        {children ||
          '-'}
      </div>
    </div>
  )
}


// ============================================================
// TABLA PLAN ANUAL DE FORMACIÓN
// ============================================================

function TablaPlanFormacion({
  actividades,
  anio,
}) {
  return (
    <div
      className="
        mt-2
        w-full
        overflow-visible
      "
    >
      <table
        className="
          tabla-plan-formacion-pesv
          w-full
          border-collapse
          table-fixed
          text-[5.5px]
          leading-[1.15]
        "
      >
        <colgroup>
          <col
            style={{
              width:
                '6mm',
            }}
          />

          <col
            style={{
              width:
                '10mm',
            }}
          />

          <col
            style={{
              width:
                '25mm',
            }}
          />

          <col
            style={{
              width:
                '39mm',
            }}
          />

          <col
            style={{
              width:
                '23mm',
            }}
          />

          <col
            style={{
              width:
                '19mm',
            }}
          />

          <col
            style={{
              width:
                '10mm',
            }}
          />

          {MESES.map(
            mes => (
              <col
                key={
                  mes.numero
                }
                style={{
                  width:
                    '6mm',
                }}
              />
            )
          )}

          <col
            style={{
              width:
                '15mm',
            }}
          />
        </colgroup>

        <thead>
          <tr
            className="
              bg-slate-800
              text-white
            "
          >
            <th
              className="
                border
                border-black
                px-1
                py-1.5
                text-center
                font-black
              "
            >
              N°
            </th>

            <th
              className="
                border
                border-black
                px-1
                py-1.5
                text-center
                font-black
              "
            >
              CÓDIGO
            </th>

            <th
              className="
                border
                border-black
                px-1
                py-1.5
                text-left
                font-black
              "
            >
              PROGRAMA PESV
            </th>

            <th
              className="
                border
                border-black
                px-1.5
                py-1.5
                text-left
                font-black
              "
            >
              ACTIVIDAD DE FORMACIÓN
            </th>

            <th
              className="
                border
                border-black
                px-1
                py-1.5
                text-left
                font-black
              "
            >
              POBLACIÓN OBJETIVO
            </th>

            <th
              className="
                border
                border-black
                px-1
                py-1.5
                text-left
                font-black
              "
            >
              RESPONSABLE
            </th>

            <th
              className="
                border
                border-black
                px-0.5
                py-1.5
                text-center
                font-black
              "
            >
              DURACIÓN
            </th>

            {MESES.map(
              mes => (
                <th
                  key={
                    mes.numero
                  }
                  className="
                    border
                    border-black
                    px-0
                    py-1.5
                    text-center
                    font-black
                  "
                >
                  {mes.corto}
                </th>
              )
            )}

            <th
              className="
                border
                border-black
                px-1
                py-1.5
                text-center
                font-black
              "
            >
              ESTADO
            </th>
          </tr>
        </thead>

        <tbody>
          {actividades.length ===
          0 ? (
            <tr>
              <td
                colSpan={
                  20
                }
                className="
                  border
                  border-black
                  px-3
                  py-8
                  text-center
                  text-[8px]
                  text-gray-500
                "
              >
                No existen actividades de formación registradas para la vigencia {anio}.
              </td>
            </tr>
          ) : (
            actividades.map(
              (
                actividad,
                index
              ) => (
                <tr
                  key={
                    actividad.id
                  }
                  className="
                    align-top
                  "
                >
                  <td
                    className="
                      border
                      border-black
                      px-1
                      py-1.5
                      text-center
                      font-bold
                    "
                  >
                    {index + 1}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      px-1
                      py-1.5
                      text-center
                      font-bold
                      break-words
                    "
                  >
                    {actividad
                      ?.codigo ||
                      '-'}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      px-1
                      py-1.5
                      text-left
                      break-words
                    "
                  >
                    {actividad
                      ?.programa_pesv_relacionado ||
                      '-'}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      px-1.5
                      py-1.5
                      text-left
                      break-words
                    "
                  >
                    <div
                      className="
                        font-bold
                      "
                    >
                      {actividad
                        ?.nombre ||
                        '-'}
                    </div>

                    {texto(
                      actividad
                        ?.tema
                    ) && (
                      <div
                        className="
                          mt-0.5
                          text-[5px]
                          text-gray-600
                        "
                      >
                        <span
                          className="
                            font-bold
                          "
                        >
                          Tema:{' '}
                        </span>

                        {actividad
                          .tema}
                      </div>
                    )}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      px-1
                      py-1.5
                      text-left
                      break-words
                    "
                  >
                    {actividad
                      ?.dirigido_a ||
                      '-'}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      px-1
                      py-1.5
                      text-left
                      break-words
                    "
                  >
                    {actividad
                      ?.responsable_nombre ||
                      '-'}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      px-0.5
                      py-1.5
                      text-center
                      whitespace-nowrap
                    "
                  >
                    {duracionVisual(
                      actividad
                        ?.duracion_horas
                    )}
                  </td>

                  {MESES.map(
                    mes => {
                      const programada =
                        actividadProgramadaEnMes(
                          actividad,
                          anio,
                          mes.numero
                        )

                      return (
                        <td
                          key={
                            mes.numero
                          }
                          className={`
                            border
                            border-black
                            px-0
                            py-1.5
                            text-center
                            align-middle
                            ${
                              programada
                                ? 'mes-programado-formacion bg-blue-200 font-black text-blue-950'
                                : 'bg-white'
                            }
                          `}
                        >
                          {programada
                            ? 'X'
                            : ''}
                        </td>
                      )
                    }
                  )}

                  <td
                    className="
                      border
                      border-black
                      px-1
                      py-1.5
                      text-center
                      font-bold
                      break-words
                    "
                  >
                    {nombreEstado(
                      actividad
                        ?.estado
                    )}
                  </td>
                </tr>
              )
            )
          )}
        </tbody>
      </table>
    </div>
  )
}


// ============================================================
// RESUMEN TRIMESTRAL Y ACUMULADO ANUAL
// ============================================================

function ResumenTrimestralFormacion({
  actividades,
  anio,
}) {
  const filas = [1, 2, 3, 4].map(
    trimestre => {
      const actividadesTrimestre =
        actividades.filter(
          actividad => {
            const fecha = texto(
              actividad?.fecha_programada
            ).slice(0, 10)

            if (
              !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
            ) {
              return false
            }

            const [
              anioActividad,
              mesActividad,
            ] = fecha
              .split('-')
              .map(Number)

            const trimestreActividad =
              Math.ceil(mesActividad / 3)

            return (
              anioActividad === Number(anio) &&
              trimestreActividad === trimestre
            )
          }
        )

      const programadas =
        actividadesTrimestre.length

      const ejecutadas =
        actividadesTrimestre.filter(
          actividad =>
            texto(
              actividad?.estado
            ).toUpperCase() === 'EJECUTADA'
        ).length

      const cumplimiento =
        programadas > 0
          ? (ejecutadas / programadas) * 100
          : 0

      return {
        trimestre,
        programadas,
        ejecutadas,
        cumplimiento,
      }
    }
  )

  const totalProgramadas =
    filas.reduce(
      (total, fila) =>
        total + fila.programadas,
      0
    )

  const totalEjecutadas =
    filas.reduce(
      (total, fila) =>
        total + fila.ejecutadas,
      0
    )

  const cumplimientoAnual =
    totalProgramadas > 0
      ? (totalEjecutadas / totalProgramadas) * 100
      : 0

  const nombres = {
    1: 'I Trimestre',
    2: 'II Trimestre',
    3: 'III Trimestre',
    4: 'IV Trimestre',
  }

  return (
    <div className="resumen-trimestral-formacion mt-2">
      <div
        className="
          border
          border-black
          bg-slate-800
          px-2
          py-1
          text-center
          text-[7px]
          font-black
          uppercase
          text-white
        "
      >
        Resumen trimestral y acumulado anual
      </div>

      <table
        className="
          w-full
          table-fixed
          border-collapse
          text-[6px]
        "
      >
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black px-1.5 py-1 font-black text-left">
              PERIODO
            </th>
            <th className="border border-black px-1.5 py-1 font-black text-center">
              ACTIVIDADES PROGRAMADAS
            </th>
            <th className="border border-black px-1.5 py-1 font-black text-center">
              ACTIVIDADES EJECUTADAS
            </th>
            <th className="border border-black px-1.5 py-1 font-black text-center">
              CUMPLIMIENTO
            </th>
          </tr>
        </thead>

        <tbody>
          {filas.map(
            fila => (
              <tr key={fila.trimestre}>
                <td className="border border-black px-1.5 py-1 font-semibold">
                  {nombres[fila.trimestre]}
                </td>
                <td className="border border-black px-1.5 py-1 text-center">
                  {fila.programadas}
                </td>
                <td className="border border-black px-1.5 py-1 text-center">
                  {fila.ejecutadas}
                </td>
                <td className="border border-black px-1.5 py-1 text-center font-bold">
                  {fila.cumplimiento.toFixed(2)}%
                </td>
              </tr>
            )
          )}

          <tr className="bg-gray-100 font-black">
            <td className="border border-black px-1.5 py-1">
              ACUMULADO ANUAL
            </td>
            <td className="border border-black px-1.5 py-1 text-center">
              {totalProgramadas}
            </td>
            <td className="border border-black px-1.5 py-1 text-center">
              {totalEjecutadas}
            </td>
            <td className="border border-black px-1.5 py-1 text-center">
              {cumplimientoAnual.toFixed(2)}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}


// ============================================================
// PIE
// ============================================================

function PieDocumento({
  plan,
}) {
  return (
    <div
      className="
        pie-documento
        pt-3
      "
    >
      <div
        className="
          border-t
          border-gray-500
          pt-1.5
          text-[6.5px]
          leading-tight
          text-gray-600
        "
      >
        <span
          className="
            font-black
          "
        >
          Responsable del documento:{' '}
        </span>

        {plan
          ?.responsable_nombre ||
          'No registrado'}
      </div>
    </div>
  )
}


// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function DocumentoPlanFormacionPesvPage() {
  const router =
    useRouter()


  // ==========================================================
  // IMPRESIÓN HORIZONTAL
  // ==========================================================

  useEffect(
    () => {
      document
        .documentElement
        .classList
        .add(
          'html-plan-formacion-pesv'
        )

      document.body.classList.add(
        'body-plan-formacion-pesv'
      )

      const estiloImpresion =
        document.createElement(
          'style'
        )

      estiloImpresion.id =
        'estilo-impresion-plan-formacion-pesv'

      estiloImpresion.textContent = `
        @page {
          size: Letter landscape;
          margin: 0;
        }

        @media print {
          html.html-plan-formacion-pesv,
          html.html-plan-formacion-pesv body,
          body.body-plan-formacion-pesv {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;

            min-height: 0 !important;
            height: auto !important;

            margin: 0 !important;
            padding: 0 !important;

            background: white !important;

            overflow: visible !important;
          }

          body.body-plan-formacion-pesv > div,
          body.body-plan-formacion-pesv > div > div {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;

            min-height: 0 !important;
            height: auto !important;

            margin: 0 !important;
            padding: 0 !important;

            overflow: visible !important;
          }

          .documento-plan-formacion-pesv {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;

            min-height: 0 !important;
            height: auto !important;

            margin: 0 !important;
            padding: 0 !important;

            background: white !important;

            overflow: visible !important;

            page-break-before: auto !important;
            break-before: auto !important;

            page-break-after: auto !important;
            break-after: auto !important;
          }

          .hoja-plan-formacion-pesv {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;

            min-height: 0 !important;
            height: auto !important;

            margin: 0 !important;

            padding: 5mm !important;

            box-sizing: border-box !important;

            box-shadow: none !important;

            overflow: visible !important;

            page-break-before: auto !important;
            break-before: auto !important;

            page-break-after: auto !important;
            break-after: auto !important;
          }

          .tabla-plan-formacion-pesv {
            width: 100% !important;
            max-width: none !important;

            margin: 0 !important;

            table-layout: fixed !important;
            border-collapse: collapse !important;
          }

          .tabla-plan-formacion-pesv thead {
            display: table-header-group !important;
          }

          .tabla-plan-formacion-pesv tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .tabla-plan-formacion-pesv th,
          .tabla-plan-formacion-pesv td {
            overflow-wrap: anywhere !important;
            word-break: normal !important;
            white-space: normal !important;
          }

          .mes-programado-formacion {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .resumen-trimestral-formacion {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `

      document.head.appendChild(
        estiloImpresion
      )

      return () => {
        document
          .documentElement
          .classList
          .remove(
            'html-plan-formacion-pesv'
          )

        document.body.classList.remove(
          'body-plan-formacion-pesv'
        )

        document
          .getElementById(
            'estilo-impresion-plan-formacion-pesv'
          )
          ?.remove()
      }
    },
    []
  )


  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [
    user,
    setUser,
  ] =
    useState(null)

  const [
    anio,
    setAnio,
  ] =
    useState(null)

  const [
    cargando,
    setCargando,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    empresa,
    setEmpresa,
  ] =
    useState(null)

  const [
    encabezado,
    setEncabezado,
  ] =
    useState(null)

  const [
    documento,
    setDocumento,
  ] =
    useState(null)

  const [
    plan,
    setPlan,
  ] =
    useState(null)

  const [
    actividades,
    setActividades,
  ] =
    useState([])

  const [
    logo,
    setLogo,
  ] =
    useState({})


  // ==========================================================
  // SESIÓN + AÑO
  // ==========================================================

  useEffect(
    () => {
      let currentUser

      try {
        currentUser =
          JSON.parse(
            localStorage.getItem(
              'currentUser'
            ) || 'null'
          )
      } catch {
        currentUser =
          null
      }

      if (!currentUser) {
        router.replace(
          '/login'
        )

        return
      }

      const parametros =
        new URLSearchParams(
          window.location.search
        )

      const anioParametro =
        Number(
          parametros.get(
            'anio'
          )
        )

      const anioActual =
        new Date()
          .getFullYear()

      setUser(
        currentUser
      )

      setAnio(
        Number.isFinite(
          anioParametro
        ) &&
        anioParametro > 0
          ? anioParametro
          : anioActual
      )
    },
    [
      router,
    ]
  )


  // ==========================================================
  // CARGAR DOCUMENTO
  // ==========================================================

  useEffect(
    () => {
      if (
        !user ||
        !anio
      ) {
        return
      }

      const nit =
        obtenerNitUsuario(
          user
        )

      if (!nit) {
        setError(
          'No fue posible identificar el NIT del CEA.'
        )

        setCargando(
          false
        )

        return
      }

      let activo =
        true

      async function cargar() {
        try {
          setCargando(
            true
          )

          setError(
            ''
          )

          const params =
            new URLSearchParams({
              nit,
              anio:
                String(
                  anio
                ),
            })

          const [
            respuestaPlan,
            respuestaConfiguracion,
          ] =
            await Promise.all([
              fetch(
                `/api/admin/pesv/plan-formacion?${params.toString()}`,
                {
                  method:
                    'GET',

                  headers: {
                    'x-cea-nit':
                      nit,
                  },

                  cache:
                    'no-store',
                }
              ),

              fetch(
                '/api/admin/configuracion-documentos',
                {
                  method:
                    'GET',

                  headers: {
                    'x-cea-nit':
                      nit,
                  },

                  cache:
                    'no-store',
                }
              ),
            ])

          const dataPlan =
            await respuestaPlan.json()

          if (
            !respuestaPlan.ok ||
            dataPlan?.ok !==
              true
          ) {
            throw new Error(
              dataPlan?.error ||
              'No fue posible consultar el Plan Anual de Formación PESV.'
            )
          }

          const dataConfiguracion =
            await respuestaConfiguracion.json()

          if (
            !respuestaConfiguracion.ok ||
            dataConfiguracion?.ok !==
              true
          ) {
            throw new Error(
              dataConfiguracion?.error ||
              'No fue posible consultar la configuración documental.'
            )
          }

          if (
            !dataPlan?.plan
          ) {
            throw new Error(
              `No existe un Plan Anual de Formación PESV registrado para ${anio}.`
            )
          }

          const documentos =
            Array.isArray(
              dataConfiguracion
                ?.documentos
            )
              ? dataConfiguracion.documentos
              : []

          const documentoEncontrado =
            documentos.find(
                item => {
                const tipo =
                    normalizarClave(
                    item?.tipo_documento
                    )

                return [
                    'PLAN_ANUAL_DE_FORMACION_PESV',
                    'PLAN_ANUAL_FORMACION_PESV',
                    'PLAN_DE_FORMACION_PESV',
                    'PLAN_FORMACION_PESV',

                    'PLAN_ANUAL_DE_FORMACION_EN_SEGURIDAD_VIAL',
                    'PLAN_ANUAL_FORMACION_EN_SEGURIDAD_VIAL',
                    'PLAN_DE_FORMACION_EN_SEGURIDAD_VIAL',
                    'PLAN_FORMACION_EN_SEGURIDAD_VIAL',
                ].includes(tipo)
                }
            ) ||
            documentos.find(
                item => {
                const nombre =
                    normalizarClave(
                    item?.nombre_documento
                    )

                const esPlanFormacion =
                    nombre.includes('PLAN') &&
                    nombre.includes('FORMACION')

                const esDocumentoPesv =
                    nombre.includes('PESV') ||
                    (
                    nombre.includes('SEGURIDAD') &&
                    nombre.includes('VIAL')
                    )

                return (
                    esPlanFormacion &&
                    esDocumentoPesv
                )
                }
            )

          if (
            !documentoEncontrado
            ) {
            throw new Error(
                'No se encontró el Plan Anual de Formación en Seguridad Vial en Configuración de Documentos > Otros Documentos.'
            )
            }

          if (
            documentoEncontrado?.activo === false
            ) {
            throw new Error(
                'El documento Plan Anual de Formación en Seguridad Vial se encuentra inactivo en Configuración de Documentos.'
            )
            }

          const logoDocumento =
            dataPlan?.logo &&
            typeof dataPlan.logo ===
              'object'
              ? dataPlan.logo
              : {
                  path:
                    '',
                  url:
                    '',
                }

          if (
            activo
          ) {
            setEmpresa(
              dataPlan
                ?.empresa ||
              dataConfiguracion
                ?.empresa ||
              null
            )

            setPlan(
              dataPlan.plan
            )

            setActividades(
              Array.isArray(
                dataPlan
                  ?.actividades
              )
                ? dataPlan.actividades
                : []
            )

            setEncabezado(
              dataConfiguracion
                ?.encabezado ||
              null
            )

            setDocumento(
              documentoEncontrado
            )

            setLogo(
              logoDocumento
            )
          }
        } catch (err) {
          console.error(
            'Error cargando documento Plan Anual de Formación PESV:',
            err
          )

          if (
            activo
          ) {
            setError(
              err?.message ||
              'No fue posible preparar el documento.'
            )
          }
        } finally {
          if (
            activo
          ) {
            setCargando(
              false
            )
          }
        }
      }

      cargar()

      return () => {
        activo =
          false
      }
    },
    [
      user,
      anio,
    ]
  )


  // ==========================================================
  // ACTIVIDADES ORDENADAS
  // ==========================================================

  const actividadesOrdenadas =
    useMemo(
      () => {
        return [
          ...actividades,
        ].sort(
          (
            a,
            b
          ) => {
            const fechaA =
              texto(
                a
                  ?.fecha_programada
              )

            const fechaB =
              texto(
                b
                  ?.fecha_programada
              )

            if (
              fechaA !==
              fechaB
            ) {
              return fechaA.localeCompare(
                fechaB
              )
            }

            return texto(
              a?.codigo
            ).localeCompare(
              texto(
                b?.codigo
              ),
              'es',
              {
                numeric:
                  true,
              }
            )
          }
        )
      },
      [
        actividades,
      ]
    )


  // ==========================================================
  // RESUMEN
  // ==========================================================

  const resumen =
    useMemo(
      () => {
        const total =
          actividades.length

        const ejecutadas =
          actividades.filter(
            item =>
              texto(
                item
                  ?.estado
              ).toUpperCase() ===
              'EJECUTADA'
          ).length

        const programadas =
          actividades.filter(
            item =>
              texto(
                item
                  ?.estado
              ).toUpperCase() ===
              'PROGRAMADA'
          ).length

        const enEjecucion =
          actividades.filter(
            item =>
              texto(
                item
                  ?.estado
              ).toUpperCase() ===
              'EN_EJECUCION'
          ).length

        const avance =
          total > 0
            ? (
                ejecutadas /
                total
              ) * 100
            : 0

        return {
          total,
          ejecutadas,
          programadas,
          enEjecucion,
          avance,
        }
      },
      [
        actividades,
      ]
    )


  // ==========================================================
  // CARGANDO
  // ==========================================================

  if (
    cargando
  ) {
    return (
      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-gray-100
        "
      >
        <div
          className="
            text-sm
            text-gray-600
          "
        >
          <i className="fas fa-spinner fa-spin mr-2"></i>

          Preparando Plan Anual de Formación PESV...
        </div>
      </div>
    )
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error
  ) {
    return (
      <div
        className="
          min-h-screen
          bg-gray-100
          p-6
        "
      >
        <div
          className="
            max-w-2xl
            mx-auto
            bg-white
            border
            border-red-200
            rounded-xl
            shadow-sm
            p-5
          "
        >
          <div
            className="
              text-lg
              font-black
              text-red-700
            "
          >
            No fue posible generar el documento
          </div>

          <p
            className="
              mt-2
              text-sm
              text-gray-700
            "
          >
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="
              mt-4
              bg-gray-700
              hover:bg-gray-800
              text-white
              px-4
              py-2
              rounded
              text-xs
            "
          >
            <i className="fas fa-arrow-left mr-2"></i>

            Regresar
          </button>
        </div>
      </div>
    )
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        documento-plan-formacion-pesv
        min-h-screen
        bg-gray-200
        py-5
        overflow-x-auto
      "
    >
      {/* ====================================================
          ACCIONES
      ==================================================== */}

      <div
        className="
          no-print
          max-w-[280mm]
          mx-auto
          mb-4
          bg-white
          border
          border-gray-300
          rounded-lg
          shadow-sm
          p-3
          flex
          flex-col
          sm:flex-row
          sm:items-center
          sm:justify-between
          gap-3
        "
      >
        <div>
          <div
            className="
              text-sm
              font-black
              text-gray-800
            "
          >
            {documento
              ?.nombre_documento ||
              'Plan Anual de Formación PESV'}
          </div>

          <div
            className="
              mt-0.5
              text-[10px]
              text-gray-500
            "
          >
            Vigencia{' '}

            <strong>
              {anio}
            </strong>

            {' · '}

            {actividades.length}{' '}
            actividad(es)

            {' · '}

            Vista horizontal
          </div>
        </div>

        <div
          className="
            flex
            flex-wrap
            gap-2
          "
        >
          <button
            type="button"
            onClick={() =>
              window.print()
            }
            className="
              bg-emerald-600
              hover:bg-emerald-700
              text-white
              px-4
              py-2
              rounded
              text-xs
              font-bold
            "
          >
            <i className="fas fa-print mr-2"></i>

            Imprimir / Guardar PDF
          </button>

          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="
              bg-gray-600
              hover:bg-gray-700
              text-white
              px-4
              py-2
              rounded
              text-xs
            "
          >
            <i className="fas fa-arrow-left mr-2"></i>

            Regresar
          </button>
        </div>
      </div>


      {/* ====================================================
          DOCUMENTO
      ==================================================== */}

      <section
        className="
          hoja-plan-formacion-pesv
          bg-white
          mx-auto
          shadow-lg
          px-[7mm]
          pt-[7mm]
          pb-[6mm]
        "
      >
        {/* ==================================================
            ENCABEZADO DOCUMENTAL
        ================================================== */}

        <div className="encabezado-pesv-print">
          <EncabezadoDocumento
            encabezado={
              encabezado
            }
            documento={
              documento
            }
            logo={
              logo
            }
            pagina={
              null
            }
            totalPaginas={
              null
            }
          />
        </div>


        {/* ==================================================
            IDENTIFICACIÓN DEL PLAN
        ================================================== */}

        <div
          className="
            mt-2
            border
            border-black
            bg-gray-200
            px-2
            py-1.5
            text-center
          "
        >
          <div
            className="
              text-[10px]
              font-black
              uppercase
              tracking-wide
            "
          >
            {plan
              ?.nombre ||
              'Plan Anual de Formación PESV'}
          </div>

          <div
            className="
              mt-0.5
              text-[7px]
              font-bold
            "
          >
            VIGENCIA {anio}
          </div>
        </div>


        {/* ==================================================
            DATOS GENERALES
        ================================================== */}

        <div
          className="
            grid
            grid-cols-4
            border
            border-t-0
            border-black
          "
        >
          <DatoResumen
            titulo="CEA"
          >
            {empresa
              ?.nombre ||
              '-'}
          </DatoResumen>

          <DatoResumen
            titulo="Fecha de aprobación"
          >
            {formatearFecha(
              plan
                ?.fecha_aprobacion
            ) ||
              '-'}
          </DatoResumen>

          <DatoResumen
            titulo="Estado del plan"
          >
            {nombreEstado(
              plan?.estado
            )}
          </DatoResumen>

          <DatoResumen
            titulo="Responsable"
          >
            {plan
              ?.responsable_nombre ||
              '-'}
          </DatoResumen>
        </div>


        {/* ==================================================
            OBJETIVO GENERAL
        ================================================== */}

        {texto(
          plan
            ?.objetivo_general
        ) && (
          <div
            className="
              border
              border-t-0
              border-black
              px-2
              py-1.5
              text-[6.2px]
              leading-tight
            "
          >
            <span
              className="
                font-black
                uppercase
                text-gray-500
              "
            >
              Objetivo general:{' '}
            </span>

            <span>
              {plan
                .objetivo_general}
            </span>
          </div>
        )}


        {/* ==================================================
            RESUMEN
        ================================================== */}

        <div
          className="
            grid
            grid-cols-4
            border
            border-t-0
            border-black
            bg-gray-50
          "
        >
          <DatoResumen
            titulo="Actividades registradas"
          >
            {resumen.total}
          </DatoResumen>

          <DatoResumen
            titulo="Ejecutadas"
          >
            {resumen.ejecutadas}
          </DatoResumen>

          <DatoResumen
            titulo="Programadas"
          >
            {resumen.programadas}
          </DatoResumen>

          <DatoResumen
            titulo="Avance de ejecución"
          >
            {resumen
              .avance
              .toFixed(
                2
              )}%
          </DatoResumen>
        </div>


        {texto(
          plan
            ?.observaciones
        ) && (
          <div
            className="
              border
              border-t-0
              border-black
              px-2
              py-1.5
              text-[6px]
              leading-tight
            "
          >
            <span
              className="
                font-black
                uppercase
                text-gray-500
              "
            >
              Observaciones del plan:{' '}
            </span>

            <span>
              {plan
                .observaciones}
            </span>
          </div>
        )}


        {/* ==================================================
            MATRIZ ANUAL
        ================================================== */}

        <div
          className="
            mt-2
            border
            border-black
            bg-slate-800
            px-2
            py-1
            text-center
            text-[7px]
            font-black
            uppercase
            text-white
          "
        >
          Matriz Anual de Formación · Programación {anio}
        </div>

        <TablaPlanFormacion
          actividades={
            actividadesOrdenadas
          }
          anio={
            anio
          }
        />


        {/* ==================================================
            RESUMEN TRIMESTRAL Y ACUMULADO ANUAL
        ================================================== */}

        <ResumenTrimestralFormacion
          actividades={
            actividadesOrdenadas
          }
          anio={
            anio
          }
        />


        {/* ==================================================
            LEYENDA
        ================================================== */}

        <div
          className="
            mt-1.5
            flex
            items-center
            gap-2
            text-[5.8px]
            text-gray-600
          "
        >
          <div
            className="
              h-[4mm]
              w-[6mm]
              border
              border-black
              bg-blue-200
              flex
              items-center
              justify-center
              font-black
              text-blue-950
            "
          >
            X
          </div>

          <span>
            Mes programado según la fecha registrada para la actividad de formación.
          </span>
        </div>


        {/* ==================================================
            PIE
        ================================================== */}

        <PieDocumento
          plan={
            plan
          }
        />
      </section>
    </div>
  )
}