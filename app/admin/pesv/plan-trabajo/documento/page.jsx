// app/admin/pesv/plan-trabajo/documento/page.jsx

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
  const [anio, mes, dia] = fecha.split('-')

  if (!anio || !mes || !dia) {
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

function monedaVisual(valor) {
  if (
    valor === null ||
    valor === undefined ||
    texto(valor) === ''
  ) {
    return '-'
  }

  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return '-'
  }

  return new Intl.NumberFormat(
    'es-CO',
    {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }
  ).format(numero)
}

function nombreEstado(valor) {
  return texto(valor).replaceAll('_', ' ') || '-'
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
      return texto(documento?.nombre_documento)

    case 'CODIGO':
      return texto(documento?.codigo)

    case 'FECHA_EDICION':
      return formatearFecha(documento?.fecha_edicion)

    case 'VERSION':
      return texto(documento?.version)

    case 'VIGENCIA':
      return formatearFecha(documento?.vigencia)

    case 'PAGINACION':
      if (pagina && totalPaginas) {
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
    typeof encabezado.estructura === 'object'
      ? encabezado.estructura
      : {}

  const celdas =
    Array.isArray(estructura?.celdas)
      ? estructura.celdas
      : []

  const filas =
    Array.isArray(estructura?.filas)
      ? estructura.filas
      : []

  const columnas =
    Array.isArray(estructura?.columnas)
      ? estructura.columnas
      : []

  const configuracion =
    estructura?.configuracion &&
    typeof estructura.configuracion === 'object'
      ? estructura.configuracion
      : {}

  const cantidadFilas =
    Number(encabezado?.filas) ||
    filas.length ||
    2

  const cantidadColumnas =
    Number(encabezado?.columnas) ||
    columnas.length ||
    3

  const anchos =
    Array.from(
      { length: cantidadColumnas },
      (_, indice) => {
        const item = columnas[indice]
        const ancho =
          Number(
            item?.ancho ??
            item?.width ??
            item
          )

        return Number.isFinite(ancho) && ancho > 0
          ? ancho
          : 1
      }
    )

  const alturas =
    Array.from(
      { length: cantidadFilas },
      (_, indice) => {
        const item = filas[indice]
        const alto =
          Number(
            item?.alto ??
            item?.altura ??
            item?.height ??
            item
          )

        return Number.isFinite(alto) && alto > 0
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

  if (celdas.length === 0) {
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
          {documento?.nombre_documento ||
            'PLAN ANUAL DE TRABAJO PESV'}
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
            Array.isArray(celda?.elementos)
              ? celda.elementos
              : []

          const fila =
            Number(celda?.fila) || 1

          const columna =
            Number(celda?.columna) || 1

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
            celda?.alineacion_horizontal ||
            'center'

          const vertical =
            celda?.alineacion_vertical ||
            'center'

          const justifyContent =
            horizontal === 'left'
              ? 'flex-start'
              : horizontal === 'right'
                ? 'flex-end'
                : 'center'

          const alignItems =
            vertical === 'top'
              ? 'flex-start'
              : vertical === 'bottom'
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
                  celda?.borde_superior === false
                    ? 'none'
                    : `${grosorBorde}px solid #000`,

                borderBottom:
                  celda?.borde_inferior === false
                    ? 'none'
                    : `${grosorBorde}px solid #000`,

                borderLeft:
                  celda?.borde_izquierdo === false
                    ? 'none'
                    : `${grosorBorde}px solid #000`,

                borderRight:
                  celda?.borde_derecho === false
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

                    if (tipo === 'VACIO') {
                      return null
                    }

                    if (tipo === 'LOGO') {
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
                              src={logo.url}
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
                            elemento?.valor
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
                        elemento?.tamano_fuente
                      ) || 8

                    const negrita =
                      elemento?.negrita === true

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
// MESES DEL PLAN
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
  const inicio =
    texto(
      actividad?.fecha_programada_inicio
    ).slice(
      0,
      10
    )

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      inicio
    )
  ) {
    return false
  }

  const finRegistrado =
    texto(
      actividad?.fecha_programada_fin
    ).slice(
      0,
      10
    )

  const fin =
    /^\d{4}-\d{2}-\d{2}$/.test(
      finRegistrado
    )
      ? finRegistrado
      : inicio

  const [
    anioInicio,
    mesInicio,
  ] =
    inicio
      .split(
        '-'
      )
      .map(
        Number
      )

  const [
    anioFin,
    mesFin,
  ] =
    fin
      .split(
        '-'
      )
      .map(
        Number
      )

  const indiceInicio =
    anioInicio *
      12 +
    mesInicio

  const indiceFin =
    anioFin *
      12 +
    mesFin

  const indiceMes =
    Number(
      anio
    ) *
      12 +
    Number(
      mes
    )

  if (
    indiceFin <
    indiceInicio
  ) {
    return indiceMes ===
      indiceInicio
  }

  return (
    indiceMes >=
      indiceInicio &&
    indiceMes <=
      indiceFin
  )
}


// ============================================================
// ESTADO DEL CORTE PARA IMPRESIÓN
// ============================================================

function estadoCorteVisual(corte) {
  if (!corte) return null

  const estado = texto(corte?.estado).toUpperCase()

  if (
    estado === 'PROGRAMADA' &&
    corte?.fecha_corte &&
    new Date(`${String(corte.fecha_corte).slice(0, 10)}T23:59:59`) <
      new Date()
  ) {
    return 'VENCIDA'
  }

  return estado || 'PROGRAMADA'
}

function simboloCorte(corte) {
  const estado = estadoCorteVisual(corte)

  if (estado === 'EJECUTADA') return '✓'
  if (estado === 'PARCIAL') return '◐'
  if (estado === 'NO_EJECUTADA') return '!'
  if (estado === 'VENCIDA') return 'V'

  return 'P'
}

function corteActividadEnMes(actividad, mes) {
  const cortes = Array.isArray(
    actividad?.pesv_plan_trabajo_cortes
  )
    ? actividad.pesv_plan_trabajo_cortes
    : []

  return (
    cortes.find(
      corte => Number(corte?.mes) === Number(mes)
    ) || null
  )
}


// ============================================================
// TEXTO OBJETIVO / META
// ============================================================

function objetivoMetaVisible(
  actividad
) {
  const objetivo =
    actividad
      ?.pesv_objetivos

  const meta =
    actividad
      ?.pesv_metas

  const partes = []

  if (
    objetivo
  ) {
    partes.push(
      [
        texto(
          objetivo?.codigo
        ),
        texto(
          objetivo?.nombre
        ),
      ]
        .filter(
          Boolean
        )
        .join(
          ' - '
        )
    )
  }

  if (
    meta
  ) {
    partes.push(
      [
        texto(
          meta?.codigo
        ),
        texto(
          meta?.descripcion
        ),
      ]
        .filter(
          Boolean
        )
        .join(
          ' - '
        )
    )
  }

  return partes.length
    ? partes.join(
        ' / '
      )
    : '-'
}


// ============================================================
// RESÚMENES DE SEGUIMIENTO
// ============================================================

function resumenSeguimiento(actividades) {
  const mensual = Object.fromEntries(
    MESES.map(mes => [
      mes.numero,
      { programadas: 0, ejecutadas: 0 },
    ])
  )

  const trimestral = {
    1: { programadas: 0, ejecutadas: 0 },
    2: { programadas: 0, ejecutadas: 0 },
    3: { programadas: 0, ejecutadas: 0 },
    4: { programadas: 0, ejecutadas: 0 },
  }

  actividades.forEach(actividad => {
    const cortes = Array.isArray(
      actividad?.pesv_plan_trabajo_cortes
    )
      ? actividad.pesv_plan_trabajo_cortes
      : []

    cortes.forEach(corte => {
      const mes = Number(corte?.mes)

      if (!mensual[mes]) return

      mensual[mes].programadas += 1

      if (
        texto(corte?.estado).toUpperCase() ===
        'EJECUTADA'
      ) {
        mensual[mes].ejecutadas += 1
      }
    })

    ;[1, 2, 3, 4].forEach(trimestre => {
      const cortesTrimestre = cortes.filter(
        corte =>
          Number(corte?.trimestre) === trimestre
      )

      if (!cortesTrimestre.length) return

      // Regla operativa actualmente usada por la matriz:
      // una actividad cuenta una sola vez por trimestre.
      trimestral[trimestre].programadas += 1

      // Se considera ejecutada en el trimestre cuando todos
      // sus cortes requeridos del trimestre están EJECUTADOS.
      if (
        cortesTrimestre.every(
          corte =>
            texto(corte?.estado).toUpperCase() ===
            'EJECUTADA'
        )
      ) {
        trimestral[trimestre].ejecutadas += 1
      }
    })
  })

  const anual = Object.values(trimestral).reduce(
    (acumulado, item) => ({
      programadas:
        acumulado.programadas + item.programadas,
      ejecutadas:
        acumulado.ejecutadas + item.ejecutadas,
    }),
    { programadas: 0, ejecutadas: 0 }
  )

  return {
    mensual,
    trimestral,
    anual,
  }
}

function porcentajeCumplimiento(programadas, ejecutadas) {
  if (!programadas) return 0

  return (ejecutadas / programadas) * 100
}

function FilaResumen({
  titulo,
  columnas,
}) {
  return (
    <tr>
      <td className="border border-black px-1 py-1 text-left font-black bg-gray-100">
        {titulo}
      </td>

      {columnas.map((item, indice) => (
        <td
          key={indice}
          className="border border-black px-1 py-1 text-center"
        >
          <div className="font-black">
            {item.programadas}
          </div>
          <div className="text-[5px] text-gray-600">
            {item.ejecutadas} ejec.
          </div>
          <div className="font-bold">
            {porcentajeCumplimiento(
              item.programadas,
              item.ejecutadas
            ).toFixed(1)}%
          </div>
        </td>
      ))}
    </tr>
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
// TABLA MATRIZ DEL PLAN
// ============================================================

function TablaPlanTrabajo({
  actividades,
  anio,
}) {
  return (
    <div className="mt-2 w-full overflow-visible">
      <table className="tabla-plan-trabajo-pesv w-full border-collapse table-fixed text-[5.8px] leading-[1.15]">
        <colgroup>
          <col style={{ width: '6mm' }} />
          <col style={{ width: '11mm' }} />
          <col style={{ width: '38mm' }} />
          <col style={{ width: '33mm' }} />
          <col style={{ width: '24mm' }} />
          <col style={{ width: '22mm' }} />
          {MESES.map(mes => (
            <col key={mes.numero} style={{ width: '6.5mm' }} />
          ))}
        </colgroup>

        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="border border-black px-1 py-1.5 text-center font-black">N°</th>
            <th className="border border-black px-1 py-1.5 text-center font-black">CÓDIGO</th>
            <th className="border border-black px-1.5 py-1.5 text-left font-black">ACTIVIDAD</th>
            <th className="border border-black px-1.5 py-1.5 text-left font-black">OBJETIVO / META</th>
            <th className="border border-black px-1.5 py-1.5 text-left font-black">RESPONSABLE</th>
            <th className="border border-black px-1.5 py-1.5 text-left font-black">RECURSOS</th>

            {MESES.map(mes => (
              <th
                key={mes.numero}
                className="border border-black px-0 py-1.5 text-center font-black"
              >
                {mes.corto}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {actividades.length === 0 ? (
            <tr>
              <td
                colSpan={18}
                className="border border-black px-3 py-8 text-center text-[8px] text-gray-500"
              >
                No existen actividades registradas para la vigencia {anio}.
              </td>
            </tr>
          ) : (
            actividades.map((actividad, index) => (
              <tr key={actividad.id} className="align-top">
                <td className="border border-black px-1 py-1.5 text-center font-bold">
                  {index + 1}
                </td>

                <td className="border border-black px-1 py-1.5 text-center font-bold">
                  {actividad?.codigo || '-'}
                </td>

                <td className="border border-black px-1.5 py-1.5 text-left break-words">
                  <div className="font-bold">
                    {actividad?.actividad || '-'}
                  </div>

                  {texto(actividad?.descripcion) && (
                    <div className="mt-0.5 text-[5.2px] text-gray-600">
                      {actividad.descripcion}
                    </div>
                  )}
                </td>

                <td className="border border-black px-1 py-1.5 text-left break-words">
                  {objetivoMetaVisible(actividad)}
                </td>

                <td className="border border-black px-1 py-1.5 text-left break-words">
                  {actividad?.responsable_nombre || '-'}
                </td>

                <td className="border border-black px-1 py-1.5 text-left break-words">
                  {actividad?.recursos_descripcion || '-'}
                </td>

                {MESES.map(mes => {
                  const corte =
                    corteActividadEnMes(
                      actividad,
                      mes.numero
                    )

                  const estado =
                    estadoCorteVisual(corte)

                  const claseEstado =
                    estado === 'EJECUTADA'
                      ? 'bg-green-100 text-green-900'
                      : estado === 'PARCIAL'
                        ? 'bg-amber-100 text-amber-900'
                        : estado === 'NO_EJECUTADA'
                          ? 'bg-red-100 text-red-900'
                          : estado === 'VENCIDA'
                            ? 'bg-orange-100 text-orange-900'
                            : corte
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-white'

                  return (
                    <td
                      key={mes.numero}
                      className={`
                        estado-corte-print
                        border border-black px-0 py-1.5
                        text-center align-middle font-black
                        ${claseEstado}
                      `}
                    >
                      {corte ? simboloCorte(corte) : ''}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// RESUMEN DE PROGRAMACIÓN Y CUMPLIMIENTO
// ============================================================

function ResumenProgramacionCumplimiento({
  actividades,
}) {
  const resumen =
    resumenSeguimiento(actividades)

  const meses =
    MESES.map(
      mes => resumen.mensual[mes.numero]
    )

  const trimestres = [1, 2, 3, 4].map(
    trimestre => resumen.trimestral[trimestre]
  )

  return (
    <div className="resumen-seguimiento-print mt-2">
      <div className="border border-black bg-slate-800 px-2 py-1 text-center text-[7px] font-black uppercase text-white">
        Resumen de programación y cumplimiento
      </div>

      <div className="mt-1 text-[5.4px] text-gray-600">
        P = actividades programadas · E = actividades ejecutadas · % = E / P × 100.
      </div>

      <div className="mt-1">
        <table className="w-full border-collapse table-fixed text-[5.5px]">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black px-1 py-1 text-left font-black">
                MES
              </th>
              {MESES.map(mes => (
                <th
                  key={mes.numero}
                  className="border border-black px-0 py-1 text-center font-black"
                >
                  {mes.corto}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <FilaResumen
              titulo="P / E / %"
              columnas={meses}
            />
          </tbody>
        </table>
      </div>

      <div className="mt-1.5 grid grid-cols-5 border border-black">
        {[1, 2, 3, 4].map((trimestre, indice) => {
          const item = trimestres[indice]

          return (
            <div
              key={trimestre}
              className="border-r border-black px-2 py-1 last:border-r-0"
            >
              <div className="text-[5.5px] font-black uppercase text-gray-600">
                Trimestre {trimestre}
              </div>
              <div className="mt-0.5 text-[6px]">
                P: <strong>{item.programadas}</strong>
                {' · '}
                E: <strong>{item.ejecutadas}</strong>
                {' · '}
                <strong>
                  {porcentajeCumplimiento(
                    item.programadas,
                    item.ejecutadas
                  ).toFixed(1)}%
                </strong>
              </div>
            </div>
          )
        })}

        <div className="px-2 py-1 bg-gray-100">
          <div className="text-[5.5px] font-black uppercase text-gray-700">
            Acumulado anual
          </div>
          <div className="mt-0.5 text-[6px]">
            P: <strong>{resumen.anual.programadas}</strong>
            {' · '}
            E: <strong>{resumen.anual.ejecutadas}</strong>
            {' · '}
            <strong>
              {porcentajeCumplimiento(
                resumen.anual.programadas,
                resumen.anual.ejecutadas
              ).toFixed(1)}%
            </strong>
          </div>
        </div>
      </div>

      <div className="mt-1 text-[5.2px] leading-tight text-gray-500">
        Resumen operativo del seguimiento. Para el trimestre, una actividad se cuenta una sola vez si tiene al menos un corte programado en ese periodo y se considera ejecutada cuando todos sus cortes requeridos del trimestre están registrados como EJECUTADOS. El acumulado anual suma los resultados trimestrales.
      </div>
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
        <span className="font-black">
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

export default function DocumentoPlanTrabajoPesvPage() {
  const router =
    useRouter()


  // ==========================================================
  // MODO DE IMPRESIÓN HORIZONTAL
  // ==========================================================

  useEffect(
    () => {
      document.documentElement.classList.add(
        'html-plan-trabajo-pesv'
      )

      document.body.classList.add(
        'body-plan-trabajo-pesv'
      )

      const estiloImpresion =
        document.createElement(
          'style'
        )

      estiloImpresion.id =
        'estilo-impresion-plan-trabajo-pesv'

      estiloImpresion.textContent = `
        @page {
          size: Letter landscape;
          margin: 0;
        }

        @media print {
          html.html-plan-trabajo-pesv,
          html.html-plan-trabajo-pesv body,
          body.body-plan-trabajo-pesv {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;

            min-height: 0 !important;
            height: auto !important;

            margin: 0 !important;
            padding: 0 5mm 6mm 5mm !important;

            background: white !important;

            overflow: visible !important;
          }

          body.body-plan-trabajo-pesv > div,
          body.body-plan-trabajo-pesv > div > div {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;

            min-height: 0 !important;
            height: auto !important;

            margin: 0 !important;
            padding: 0 !important;

            overflow: visible !important;
          }

          .documento-plan-trabajo-pesv {
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

          .hoja-plan-trabajo-pesv {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;

            min-height: 0 !important;
            height: auto !important;

            margin: 0 !important;

            padding: 0 !important;

            box-sizing: border-box !important;

            box-shadow: none !important;

            overflow: visible !important;

            page-break-before: auto !important;
            break-before: auto !important;

            page-break-after: auto !important;
            break-after: auto !important;
          }

          .tabla-plan-trabajo-pesv {
            width: 100% !important;
            max-width: none !important;

            margin: 0 !important;

            table-layout: fixed !important;
            border-collapse: collapse !important;
          }

          .tabla-plan-trabajo-pesv thead {
            display: table-header-group !important;
          }

          .estructura-paginas-print {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            box-sizing: border-box !important;
          }

          .estructura-paginas-print > thead {
            display: table-header-group !important;
          }

          .estructura-paginas-print > tbody {
            display: table-row-group !important;
          }

          .estructura-paginas-print > thead > tr > td,
          .estructura-paginas-print > tbody > tr > td {
            padding: 0 !important;
            border: 0 !important;
          }

          .encabezado-repetido-print {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .margen-superior-pagina-print {
            display: block !important;
            height: 7mm !important;
            width: 100% !important;
          }

          .separador-encabezado-print {
            height: 4mm !important;
          }

          .contenido-pagina-print {
            vertical-align: top !important;
          }

          .datos-generales-plan-print {
            border-top: 1px solid #000 !important;
          }

          .encabezado-pesv-print {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .tabla-plan-trabajo-pesv tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .tabla-plan-trabajo-pesv th,
          .tabla-plan-trabajo-pesv td {
            overflow-wrap: anywhere !important;
            word-break: normal !important;
            white-space: normal !important;
          }

          .resumen-seguimiento-print {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .mes-programado,
          .estado-corte-print {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `

      document.head.appendChild(
        estiloImpresion
      )

      return () => {
        document.documentElement.classList.remove(
          'html-plan-trabajo-pesv'
        )

        document.body.classList.remove(
          'body-plan-trabajo-pesv'
        )

        document
          .getElementById(
            'estilo-impresion-plan-trabajo-pesv'
          )
          ?.remove()
      }
    },
    []
  )

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
        currentUser = null
      }

      if (!currentUser) {
        router.replace('/login')
        return
      }

      const parametros =
        new URLSearchParams(
          window.location.search
        )

      const anioParametro =
        Number(
          parametros.get('anio')
        )

      const anioActual =
        new Date()
          .getFullYear()

      setUser(currentUser)

      setAnio(
        Number.isFinite(anioParametro) &&
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
      if (!user || !anio) {
        return
      }

      const nit =
        obtenerNitUsuario(user)

      if (!nit) {
        setError(
          'No fue posible identificar el NIT del CEA.'
        )

        setCargando(false)
        return
      }

      let activo = true

      async function cargar() {
        try {
          setCargando(true)
          setError('')

          const params =
            new URLSearchParams({
              nit,
              anio:
                String(anio),
            })

          const [
            respuestaPlan,
            respuestaConfiguracion,
          ] =
            await Promise.all([
              fetch(
                `/api/admin/pesv/plan-trabajo?${params.toString()}`,
                {
                  method: 'GET',

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
                  method: 'GET',

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
            dataPlan?.ok !== true
          ) {
            throw new Error(
              dataPlan?.error ||
              'No fue posible consultar el Plan Anual de Trabajo PESV.'
            )
          }

          const dataConfiguracion =
            await respuestaConfiguracion.json()

          if (
            !respuestaConfiguracion.ok ||
            dataConfiguracion?.ok !== true
          ) {
            throw new Error(
              dataConfiguracion?.error ||
              'No fue posible consultar la configuración documental.'
            )
          }

          if (!dataPlan?.plan) {
            throw new Error(
              `No existe un Plan Anual de Trabajo PESV registrado para ${anio}.`
            )
          }

          const documentos =
            Array.isArray(
              dataConfiguracion?.documentos
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
                  'PLAN_ANUAL_DE_TRABAJO_PESV',
                  'PLAN_ANUAL_TRABAJO_PESV',
                  'PLAN_DE_TRABAJO_PESV',
                  'PLAN_TRABAJO_PESV',
                ].includes(tipo)
              }
            ) ||
            documentos.find(
              item => {
                const nombre =
                  normalizarClave(
                    item?.nombre_documento
                  )

                return (
                  nombre.includes('PLAN') &&
                  nombre.includes('TRABAJO') &&
                  nombre.includes('PESV')
                )
              }
            )

          if (!documentoEncontrado) {
            throw new Error(
              'No se encontró "Plan Anual de Trabajo PESV" en Configuración de Documentos > Otros Documentos.'
            )
          }

          if (
            documentoEncontrado?.activo ===
            false
          ) {
            throw new Error(
              'El documento Plan Anual de Trabajo PESV se encuentra inactivo en Configuración de Documentos.'
            )
          }

          const logoDocumento =
            dataPlan?.logo &&
            typeof dataPlan.logo ===
              'object'
              ? dataPlan.logo
              : {
                  path: '',
                  url: '',
                }

          if (activo) {
            setEmpresa(
              dataPlan?.empresa ||
              dataConfiguracion?.empresa ||
              null
            )

            setPlan(
              dataPlan.plan
            )

            setActividades(
              Array.isArray(
                dataPlan?.actividades
              )
                ? dataPlan.actividades
                : []
            )

            setEncabezado(
              dataConfiguracion?.encabezado ||
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
            'Error cargando documento Plan Anual de Trabajo PESV:',
            err
          )

          if (activo) {
            setError(
              err?.message ||
              'No fue posible preparar el documento.'
            )
          }
        } finally {
          if (activo) {
            setCargando(false)
          }
        }
      }

      cargar()

      return () => {
        activo = false
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
                a?.fecha_programada_inicio
              )

            const fechaB =
              texto(
                b?.fecha_programada_inicio
              )

            if (fechaA !== fechaB) {
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
                numeric: true,
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
  // CARGANDO
  // ==========================================================

  if (cargando) {
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

          Preparando Plan Anual de Trabajo PESV...
        </div>
      </div>
    )
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
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
        documento-plan-trabajo-pesv
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
              'Plan Anual de Trabajo PESV'}
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
          DOCUMENTO HORIZONTAL
      ==================================================== */}

      <section
        className="
          hoja-plan-trabajo-pesv
          bg-white
          mx-auto
          shadow-lg
          px-[7mm]
          pt-[7mm]
          pb-[6mm]
        "
      >
        <table className="estructura-paginas-print w-full border-collapse">
          <thead className="encabezado-repetido-print">
            <tr>
              <td>
                <div className="margen-superior-pagina-print"></div>

                <div className="encabezado-pesv-print">
                  <EncabezadoDocumento
                    encabezado={encabezado}
                    documento={documento}
                    logo={logo}
                    pagina={null}
                    totalPaginas={null}
                  />
                </div>

                <div className="separador-encabezado-print h-[3mm]"></div>
              </td>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className="contenido-pagina-print align-top">

        {/* ==================================================
            DATOS GENERALES DEL PLAN
        ================================================== */}

        <div className="datos-generales-plan-print grid grid-cols-5 border border-black">
          <DatoResumen titulo="CEA">
            {empresa?.nombre || '-'}
          </DatoResumen>

          <DatoResumen titulo="Vigencia">
            {anio}
          </DatoResumen>

          <DatoResumen titulo="Fecha de elaboración">
            {formatearFecha(plan?.fecha_elaboracion) || '-'}
          </DatoResumen>

          <DatoResumen titulo="Fecha de aprobación">
            {formatearFecha(plan?.fecha_aprobacion) || '-'}
          </DatoResumen>

          <DatoResumen titulo="Responsable">
            {plan?.responsable_nombre || '-'}
          </DatoResumen>
        </div>

        <div className="border border-t-0 border-black px-2 py-1.5">
          <div className="text-[6px] font-black uppercase text-gray-500">
            Objetivo general
          </div>
          <div className="mt-0.5 text-[7px] font-semibold leading-tight text-gray-900">
            {plan?.objetivo || '-'}
          </div>
        </div>

        <div className="grid grid-cols-2 border border-t-0 border-black">
          <div className="border-r border-black px-2 py-1.5">
            <div className="text-[6px] font-black uppercase text-gray-500">
              Alcance
            </div>
            <div className="mt-0.5 text-[7px] font-semibold leading-tight text-gray-900">
              {(() => {
                const clave = texto(plan?.alcance).toUpperCase()

                if (clave === 'DISENO_IMPLEMENTACION_SEGUIMIENTO_MEJORA') {
                  return 'Diseño, implementación, seguimiento y mejora'
                }

                if (clave === 'IMPLEMENTACION_SEGUIMIENTO_MEJORA') {
                  return 'Implementación, seguimiento y mejora'
                }

                if (clave === 'SEGUIMIENTO_MEJORA') {
                  return 'Seguimiento y mejora'
                }

                return texto(plan?.alcance) || '-'
              })()}
            </div>
          </div>

          <div className="px-2 py-1.5">
            <div className="text-[6px] font-black uppercase text-gray-500">
              Observaciones del plan
            </div>
            <div className="mt-0.5 text-[7px] font-semibold leading-tight text-gray-900">
              {texto(plan?.observaciones) || '-'}
            </div>
          </div>
        </div>


        {/* ==================================================
            MATRIZ ANUAL DE ACTIVIDADES
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
          Matriz Anual de Actividades · Programación y Seguimiento {anio}
        </div>

        <TablaPlanTrabajo
          actividades={
            actividadesOrdenadas
          }
          anio={
            anio
          }
        />


        {/* ==================================================
            LEYENDA DE SEGUIMIENTO
        ================================================== */}

        <div className="mt-1.5 border border-gray-400 px-2 py-1.5">
          <div className="text-[5.8px] font-black uppercase text-gray-700">
            Estado del seguimiento a la fecha de impresión
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[5.8px] text-gray-700">
            <span><strong>P</strong> = Programada</span>
            <span><strong>V</strong> = Vencida sin ejecución registrada</span>
            <span><strong>✓</strong> = Ejecutada</span>
            <span><strong>◐</strong> = Ejecución parcial</span>
            <span><strong>!</strong> = No ejecutada</span>
            <span>Celda vacía = No corresponde corte de seguimiento</span>
          </div>

          <div className="mt-1 text-[5.4px] text-gray-500">
            Los símbolos reflejan el estado registrado para cada corte de seguimiento del Plan Anual de Trabajo PESV al momento de generar este documento.
          </div>
        </div>


        <ResumenProgramacionCumplimiento
          actividades={actividadesOrdenadas}
        />


        {/* ==================================================
            PIE
        ================================================== */}

        <PieDocumento
          plan={
            plan
          }
        />

              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}
