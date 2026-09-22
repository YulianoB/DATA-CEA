// app/admin/pesv/indicadores/componentes/medicion/indicadores/CmPesvMedicion.jsx

'use client'

// ============================================================
// PESV - INDICADOR CM_PESV
//
// CM_PESV = MA(t) / TM(t) * 100
//
// MA(t): metas PESV alcanzadas en el corte.
// TM(t): número total de metas definidas en el PESV.
//
// IMPORTANTE:
// - Este componente solamente presenta el resultado específico.
// - El cálculo proviene de la API independiente CM_PESV.
// - La configuración y el ciclo de vida permanecen en
//   MedicionIndicadores.jsx.
// ============================================================

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Info,
  ListChecks,
  ShieldAlert,
} from 'lucide-react'


// ============================================================
// HELPERS
// ============================================================

function texto(valor) {
  return String(
    valor ?? ''
  ).trim()
}


function numero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null
  }

  const resultado =
    Number(valor)

  return Number.isFinite(
    resultado
  )
    ? resultado
    : null
}


function formatearNumero(
  valor,
  decimales = 2
) {
  const resultado =
    numero(valor)

  if (
    resultado === null
  ) {
    return '-'
  }

  return new Intl.NumberFormat(
    'es-CO',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits:
        decimales,
    }
  ).format(
    resultado
  )
}


function formatearPorcentaje(valor) {
  const resultado =
    numero(valor)

  if (
    resultado === null
  ) {
    return '-'
  }

  return `${formatearNumero(
    resultado,
    2
  )} %`
}


function formatearFecha(valor) {
  if (
    !valor
  ) {
    return '-'
  }

  const valorFecha =
    String(valor).slice(
      0,
      10
    )

  const fecha =
    new Date(
      `${valorFecha}T00:00:00`
    )

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return texto(valor) || '-'
  }

  return fecha.toLocaleDateString(
    'es-CO'
  )
}


function etiquetaEstado(valor) {
  const estado =
    texto(valor).toUpperCase()

  const etiquetas = {
    ALCANZADA:
      'ALCANZADA',
    NO_ALCANZADA:
      'NO ALCANZADA',
    SIN_MEDICION:
      'SIN MEDICIÓN',
    PENDIENTE_PLAZO:
      'PENDIENTE',
    PENDIENTE_ACREDITACION:
      'PENDIENTE DE ACREDITACIÓN',
    SIN_INDICADOR:
      'SIN INDICADOR',
    CONFIGURACION_INCOMPLETA:
      'CONFIGURACIÓN INCOMPLETA',
    NO_EVALUABLE:
      'NO EVALUABLE',
  }

  return etiquetas[estado] ||
    estado ||
    '-'
}


function claseEstado(valor) {
  const estado =
    texto(valor).toUpperCase()

  if (
    estado === 'ALCANZADA'
  ) {
    return `
      border-green-300
      bg-green-100
      text-green-800
    `
  }

  if (
    estado === 'NO_ALCANZADA'
  ) {
    return `
      border-red-300
      bg-red-100
      text-red-800
    `
  }

  if (
    estado === 'PENDIENTE_PLAZO'
  ) {
    return `
      border-blue-300
      bg-blue-100
      text-blue-800
    `
  }

  if (
    estado === 'SIN_MEDICION' ||
    estado === 'PENDIENTE_ACREDITACION'
  ) {
    return `
      border-amber-300
      bg-amber-100
      text-amber-900
    `
  }

  if (
    estado === 'SIN_INDICADOR' ||
    estado === 'CONFIGURACION_INCOMPLETA' ||
    estado === 'NO_EVALUABLE'
  ) {
    return `
      border-gray-300
      bg-gray-100
      text-gray-700
    `
  }

  return `
    border-gray-300
    bg-gray-100
    text-gray-700
  `
}


function descripcionPeriodo(
  periodo
) {
  const tipo =
    texto(
      periodo?.tipo_periodo
    ).toUpperCase()

  if (
    tipo === 'TRIMESTRE'
  ) {
    return `Trimestre ${
      periodo?.numero_periodo || '-'
    }`
  }

  if (
    tipo === 'ANUAL'
  ) {
    return 'Acumulado anual'
  }

  return tipo || '-'
}


// ============================================================
// TARJETA SIMPLE
// ============================================================

function TarjetaResultado({
  titulo,
  valor,
  detalle = '',
  destacada = false,
}) {
  return (
    <div
      className={`
        min-w-0
        rounded-lg
        border
        p-3

        ${
          destacada
            ? `
                border-blue-300
                bg-blue-50
              `
            : `
                border-gray-200
                bg-white
              `
        }
      `}
    >
      <div
        className="
          break-words
          text-[9px]
          font-black
          uppercase
          leading-relaxed
          text-gray-500
        "
      >
        {titulo}
      </div>

      <div
        className={`
          mt-1
          break-words
          text-xl
          font-black

          ${
            destacada
              ? 'text-blue-900'
              : 'text-gray-900'
          }
        `}
      >
        {valor}
      </div>

      {detalle && (
        <div
          className="
            mt-1
            break-words
            text-[9px]
            leading-relaxed
            text-gray-500
          "
        >
          {detalle}
        </div>
      )}
    </div>
  )
}


// ============================================================
// RESULTADO PRINCIPAL
// ============================================================

function ResultadoCmPesv({
  calculo,
}) {
  const resultados =
    calculo?.resultados ||
    {}

  const periodo =
    calculo?.periodo ||
    {}

  return (
    <div
      className="
        overflow-hidden
        rounded-xl
        border
        border-gray-300
        bg-white
      "
    >
      <div
        className="
          flex
          items-center
          gap-2
          bg-blue-800
          px-4
          py-2
          text-white
        "
      >
        <ListChecks
          size={14}
          className="shrink-0"
        />

        <div
          className="
            min-w-0
            break-words
            text-xs
            font-black
            uppercase
          "
        >
          Cumplimiento de metas PESV
        </div>
      </div>

      <div
        className="
          grid
          min-w-0
          grid-cols-1
          gap-3
          p-3
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        <TarjetaResultado
          titulo="Metas alcanzadas · MA(t)"
          valor={
            formatearNumero(
              resultados
                ?.metas_alcanzadas
            )
          }
          detalle="Metas cuyo logro está acreditado en el corte"
        />

        <TarjetaResultado
          titulo="Metas definidas · TM(t)"
          valor={
            formatearNumero(
              resultados
                ?.total_metas_definidas ??
              resultados
                ?.total_metas_evaluables
            )
          }
          detalle="Número total de metas definidas en el PESV"
        />

        <TarjetaResultado
          titulo="Resultado CM_PESV"
          valor={
            formatearPorcentaje(
              resultados
                ?.cumplimiento_metas_pesv ??
              calculo?.valor_resultado
            )
          }
          detalle="CM_PESV = MA(t) / TM(t) × 100"
          destacada
        />

        <TarjetaResultado
          titulo="Período evaluado"
          valor={
            descripcionPeriodo(
              periodo
            )
          }
          detalle={
            periodo?.periodo_desde &&
            periodo?.periodo_hasta
              ? `${formatearFecha(
                  periodo.periodo_desde
                )} a ${formatearFecha(
                  periodo.periodo_hasta
                )}`
              : ''
          }
        />
      </div>
    </div>
  )
}


// ============================================================
// CUMPLIMIENTO DE LA META DEL INDICADOR CM_PESV
// ============================================================

function CumplimientoMeta({
  calculo,
  evaluacion,
}) {
  const cumple =
    calculo?.cumple_meta ??
    evaluacion?.cumple_meta ??
    null

  const operador =
    calculo?.operador_meta ??
    evaluacion?.operador_meta ??
    null

  const meta =
    calculo?.valor_meta ??
    evaluacion?.valor_meta ??
    null

  const resultado =
    numero(
      calculo?.valor_resultado
    )

  if (
    cumple === null
  ) {
    return (
      <div
        className="
          rounded-xl
          border
          border-gray-300
          bg-gray-50
          p-4
        "
      >
        <div
          className="
            flex
            min-w-0
            items-start
            gap-3
          "
        >
          <Info
            size={18}
            className="
              mt-0.5
              shrink-0
              text-gray-500
            "
          />

          <div className="min-w-0">
            <div
              className="
                text-xs
                font-black
                uppercase
                text-gray-700
              "
            >
              Evaluación de la meta
            </div>

            <div
              className="
                mt-1
                break-words
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              La configuración de CM_PESV no
              permite evaluar todavía el
              cumplimiento de su meta.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        rounded-xl
        border
        p-4

        ${
          cumple
            ? `
                border-green-300
                bg-green-50
              `
            : `
                border-red-300
                bg-red-50
              `
        }
      `}
    >
      <div
        className="
          flex
          min-w-0
          items-start
          gap-3
        "
      >
        {cumple ? (
          <CheckCircle2
            size={20}
            className="
              mt-0.5
              shrink-0
              text-green-700
            "
          />
        ) : (
          <AlertTriangle
            size={20}
            className="
              mt-0.5
              shrink-0
              text-red-700
            "
          />
        )}

        <div className="min-w-0">
          <div
            className={`
              text-xs
              font-black
              uppercase

              ${
                cumple
                  ? 'text-green-800'
                  : 'text-red-800'
              }
            `}
          >
            {cumple
              ? 'Meta cumplida'
              : 'Meta no cumplida'}
          </div>

          <div
            className={`
              mt-1
              break-words
              text-[10px]
              leading-relaxed

              ${
                cumple
                  ? 'text-green-800'
                  : 'text-red-800'
              }
            `}
          >
            Resultado CM_PESV:{' '}

            <strong>
              {formatearPorcentaje(
                resultado
              )}
            </strong>

            {' · Meta: '}

            <strong>
              {texto(operador) || '-'}{' '}
              {formatearNumero(
                meta
              )}{' '}
              %
            </strong>
          </div>
        </div>
      </div>
    </div>
  )
}


// ============================================================
// LECTURA DEL RESULTADO
// ============================================================

function LecturaResultado({
  calculo,
}) {
  const resumen =
    calculo?.resumen ||
    {}

  const resultado =
    numero(
      calculo?.valor_resultado
    )

  const totalDefinidas =
    numero(
      resumen?.total_metas_definidas ??
      resumen?.total_metas_activas
    ) ?? 0

  const alcanzadas =
    numero(
      resumen?.metas_alcanzadas
    ) ?? 0

  const pendientes =
    numero(
      resumen?.metas_pendientes_acreditacion ??
      resumen?.metas_sin_medicion
    ) ?? 0

  let lectura =
    'No existen metas PESV definidas para calcular el indicador en este corte.'

  if (
    resultado !== null &&
    totalDefinidas > 0
  ) {
    lectura =
      `En el corte evaluado, ${formatearNumero(
        alcanzadas
      )} de ${formatearNumero(
        totalDefinidas
      )} meta(s) definida(s) del PESV tienen su logro acreditado, para un cumplimiento de ${formatearPorcentaje(
        resultado
      )}.`
  }

  return (
    <div
      className="
        rounded-xl
        border
        border-blue-200
        bg-blue-50
        p-4
      "
    >
      <div
        className="
          flex
          min-w-0
          items-start
          gap-3
        "
      >
        <Info
          size={19}
          className="
            mt-0.5
            shrink-0
            text-blue-700
          "
        />

        <div className="min-w-0">
          <div
            className="
              text-xs
              font-black
              uppercase
              text-blue-900
            "
          >
            Lectura del resultado
          </div>

          <p
            className="
              mt-2
              break-words
              text-[10px]
              leading-relaxed
              text-blue-900
            "
          >
            {lectura}
          </p>

          <p
            className="
              mt-3
              break-words
              border-t
              border-blue-200
              pt-3
              text-[9px]
              leading-relaxed
              text-blue-700
            "
          >
            Para CM_PESV, TM(t) corresponde al
            número total de metas definidas en el
            PESV. Una meta que todavía no tenga
            medición o evidencia suficiente no se
            elimina del denominador; permanece
            identificada en la trazabilidad hasta
            que pueda acreditarse su logro.
          </p>

          {pendientes > 0 && (
            <p
              className="
                mt-2
                break-words
                text-[9px]
                font-bold
                leading-relaxed
                text-amber-800
              "
            >
              Existen {formatearNumero(
                pendientes
              )} meta(s) que todavía no cuentan
              con evidencia suficiente para
              acreditar su logro en este corte.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}


// ============================================================
// RESUMEN DE TRAZABILIDAD
// ============================================================

function ResumenTrazabilidad({
  calculo,
}) {
  const resumen =
    calculo?.resumen ||
    {}

  return (
    <div
      className="
        overflow-hidden
        rounded-xl
        border
        border-gray-300
        bg-white
      "
    >
      <div
        className="
          bg-slate-800
          px-4
          py-2
          text-white
        "
      >
        <div
          className="
            text-xs
            font-black
            uppercase
          "
        >
          Trazabilidad de las metas
        </div>
      </div>

      <div
        className="
          grid
          min-w-0
          grid-cols-1
          gap-3
          p-3
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        <TarjetaResultado
          titulo="Metas definidas"
          valor={
            formatearNumero(
              resumen
                ?.total_metas_definidas ??
              resumen
                ?.total_metas_activas
            )
          }
        />

        <TarjetaResultado
          titulo="Con evidencia evaluable"
          valor={
            formatearNumero(
              resumen
                ?.con_evidencia_evaluable
            )
          }
        />

        <TarjetaResultado
          titulo="Alcanzadas"
          valor={
            formatearNumero(
              resumen
                ?.metas_alcanzadas
            )
          }
        />

        <TarjetaResultado
          titulo="Evaluadas no alcanzadas"
          valor={
            formatearNumero(
              resumen
                ?.metas_evaluadas_no_alcanzadas ??
              resumen
                ?.metas_no_alcanzadas
            )
          }
        />

        <TarjetaResultado
          titulo="Pendientes de acreditación"
          valor={
            formatearNumero(
              resumen
                ?.metas_pendientes_acreditacion ??
              resumen
                ?.metas_sin_medicion
            )
          }
        />

        <TarjetaResultado
          titulo="Sin indicador"
          valor={
            formatearNumero(
              resumen
                ?.metas_sin_indicador
            )
          }
        />

        <TarjetaResultado
          titulo="Configuración incompleta"
          valor={
            formatearNumero(
              resumen
                ?.metas_configuracion_incompleta
            )
          }
        />
      </div>
    </div>
  )
}


// ============================================================
// ADVERTENCIAS
// ============================================================

function Advertencias({
  calculo,
}) {
  const advertencias =
    Array.isArray(
      calculo?.advertencias
    )
      ? calculo.advertencias
      : []

  if (
    advertencias.length === 0
  ) {
    return null
  }

  return (
    <div
      className="
        rounded-xl
        border
        border-amber-300
        bg-amber-50
        p-4
      "
    >
      <div
        className="
          flex
          min-w-0
          items-start
          gap-3
        "
      >
        <AlertTriangle
          size={19}
          className="
            mt-0.5
            shrink-0
            text-amber-700
          "
        />

        <div className="min-w-0">
          <div
            className="
              text-xs
              font-black
              uppercase
              text-amber-900
            "
          >
            Advertencias del cálculo
          </div>

          <div
            className="
              mt-2
              space-y-2
            "
          >
            {advertencias.map(
              (
                advertencia,
                indice
              ) => (
                <p
                  key={indice}
                  className="
                    break-words
                    text-[10px]
                    leading-relaxed
                    text-amber-800
                  "
                >
                  • {texto(
                    advertencia
                  )}
                </p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// ============================================================
// DETALLE DE METAS
// ============================================================

function DetalleMetas({
  calculo,
}) {
  const metas =
    Array.isArray(
      calculo?.detalle_metas
    )
      ? calculo.detalle_metas
      : []

  if (
    metas.length === 0
  ) {
    return null
  }

  return (
    <div
      className="
        min-w-0
        overflow-hidden
        rounded-xl
        border
        border-gray-300
        bg-white
      "
    >
      <div
        className="
          bg-slate-800
          px-4
          py-2
          text-white
        "
      >
        <div
          className="
            text-xs
            font-black
            uppercase
          "
        >
          Metas consideradas en el corte
        </div>
      </div>

      <div
        className="
          w-full
          overflow-x-auto
        "
      >
        <table
          className="
            w-full
            min-w-[1150px]
            border-collapse
            text-[10px]
          "
        >
          <thead
            className="
              bg-gray-100
              text-gray-700
            "
          >
            <tr>
              <th className="border border-gray-300 px-3 py-2 text-left">
                Meta
              </th>

              <th className="border border-gray-300 px-3 py-2 text-left">
                Objetivo
              </th>

              <th className="border border-gray-300 px-3 py-2 text-left">
                Indicador
              </th>

              <th className="border border-gray-300 px-3 py-2 text-center">
                Resultado
              </th>

              <th className="border border-gray-300 px-3 py-2 text-center">
                Criterio meta
              </th>

              <th className="border border-gray-300 px-3 py-2 text-center">
                Estado
              </th>

              <th className="border border-gray-300 px-3 py-2 text-left">
                Evidencia / motivo
              </th>
            </tr>
          </thead>

          <tbody>
            {metas.map(
              meta => {
                const medicion =
                  meta?.medicion ||
                  null

                const valorResultado =
                  numero(
                    meta?.valor_resultado
                  )

                const unidadResultado =
                  texto(
                    medicion
                      ?.unidad_resultado
                  )

                const componentes =
                  Array.isArray(
                    meta
                      ?.detalle_componentes
                  )
                    ? meta
                        .detalle_componentes
                    : []

                return (
                  <tr
                    key={
                      meta?.meta_id
                    }
                  >
                    <td
                      className="
                        border
                        border-gray-300
                        px-3
                        py-2
                        align-top
                      "
                    >
                      <div
                        className="
                          font-black
                          text-gray-900
                        "
                      >
                        {texto(
                          meta
                            ?.meta_codigo
                        ) || '-'}
                      </div>

                      <div
                        className="
                          mt-1
                          max-w-xs
                          break-words
                          text-[9px]
                          leading-relaxed
                          text-gray-500
                        "
                      >
                        {texto(
                          meta
                            ?.meta_descripcion
                        ) || '-'}
                      </div>
                    </td>

                    <td
                      className="
                        border
                        border-gray-300
                        px-3
                        py-2
                        align-top
                      "
                    >
                      <div className="font-bold text-gray-800">
                        {texto(
                          meta
                            ?.objetivo_codigo
                        ) || '-'}
                      </div>

                      <div
                        className="
                          mt-1
                          max-w-xs
                          break-words
                          text-[9px]
                          leading-relaxed
                          text-gray-500
                        "
                      >
                        {texto(
                          meta
                            ?.objetivo_nombre
                        ) || '-'}
                      </div>
                    </td>

                    <td
                      className="
                        border
                        border-gray-300
                        px-3
                        py-2
                        align-top
                      "
                    >
                      <div className="font-black text-gray-800">
                        {texto(
                          meta
                            ?.indicador_codigo
                        ) || '-'}
                      </div>

                      <div
                        className="
                          mt-1
                          max-w-xs
                          break-words
                          text-[9px]
                          leading-relaxed
                          text-gray-500
                        "
                      >
                        {texto(
                          meta
                            ?.indicador_nombre
                        ) || '-'}
                      </div>
                    </td>

                    <td
                      className="
                        border
                        border-gray-300
                        px-3
                        py-2
                        text-center
                        align-top
                      "
                    >
                      {componentes.length >
                      0 ? (
                        <div
                          className="
                            space-y-1
                            text-left
                          "
                        >
                          {componentes.map(
                            componente => (
                              <div
                                key={
                                  componente
                                    ?.componente
                                }
                                className="
                                  whitespace-nowrap
                                  text-[9px]
                                "
                              >
                                <strong>
                                  {texto(
                                    componente
                                      ?.componente
                                  )}
                                </strong>
                                :{' '}
                                {formatearNumero(
                                  componente
                                    ?.valor_resultado
                                )}
                              </div>
                            )
                          )}
                        </div>
                      ) : valorResultado !==
                        null ? (
                        <>
                          <strong>
                            {formatearNumero(
                              valorResultado
                            )}
                          </strong>

                          {unidadResultado && (
                            <div
                              className="
                                mt-1
                                text-[8px]
                                text-gray-500
                              "
                            >
                              {unidadResultado}
                            </div>
                          )}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td
                      className="
                        border
                        border-gray-300
                        px-3
                        py-2
                        text-center
                        align-top
                        font-bold
                      "
                    >
                      {texto(
                        meta
                          ?.operador_meta
                      ) || '-'}{' '}

                      {formatearNumero(
                        meta
                          ?.valor_meta
                      )}

                      {texto(
                        meta
                          ?.unidad_meta
                      ) && (
                        <div
                          className="
                            mt-1
                            text-[8px]
                            font-normal
                            text-gray-500
                          "
                        >
                          {texto(
                            meta
                              ?.unidad_meta
                          )}
                        </div>
                      )}
                    </td>

                    <td
                      className="
                        border
                        border-gray-300
                        px-3
                        py-2
                        text-center
                        align-top
                      "
                    >
                      <span
                        className={`
                          inline-flex
                          rounded-full
                          border
                          px-2
                          py-1
                          text-[8px]
                          font-black
                          ${claseEstado(
                            meta
                              ?.estado_evaluacion
                          )}
                        `}
                      >
                        {etiquetaEstado(
                          meta
                            ?.estado_evaluacion
                        )}
                      </span>
                    </td>

                    <td
                      className="
                        border
                        border-gray-300
                        px-3
                        py-2
                        align-top
                      "
                    >
                      <div
                        className="
                          max-w-sm
                          break-words
                          text-[9px]
                          leading-relaxed
                          text-gray-700
                        "
                      >
                        {texto(
                          meta?.motivo
                        ) || '-'}
                      </div>

                      {medicion && (
                        <div
                          className="
                            mt-2
                            border-t
                            border-gray-200
                            pt-2
                            text-[8px]
                            leading-relaxed
                            text-gray-500
                          "
                        >
                          Medición #{medicion.id}
                          {' · '}
                          {texto(
                            medicion
                              ?.tipo_periodo
                          )}

                          {medicion
                            ?.numero_periodo
                            ? ` ${medicion.numero_periodo}`
                            : ''}

                          {' · '}
                          {texto(
                            medicion
                              ?.estado
                          )}

                          {medicion
                            ?.fecha_medicion
                            ? ` · ${formatearFecha(
                                medicion.fecha_medicion
                              )}`
                            : ''}
                        </div>
                      )}

                      {!medicion &&
                        meta
                          ?.estado_evaluacion ===
                          'PENDIENTE_PLAZO' && (
                          <div
                            className="
                              mt-2
                              flex
                              items-center
                              gap-1
                              text-[8px]
                              font-bold
                              text-blue-700
                            "
                          >
                            <Clock3
                              size={11}
                            />
                            Fecha límite:{' '}
                            {formatearFecha(
                              meta
                                ?.fecha_limite
                            )}
                          </div>
                        )}
                    </td>
                  </tr>
                )
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


// ============================================================
// COMPONENTE PRINCIPAL
//
// <CmPesvMedicion
//   anio={anio}
//   cargando={...}
//   error={...}
//   datos={respuestaCompletaApiCmPesv}
// />
// ============================================================

export default function CmPesvMedicion({
  anio,
  cargando = false,
  error = '',
  datos = null,
}) {
  if (
    cargando
  ) {
    return (
      <div
        className="
          rounded-xl
          border
          border-gray-300
          bg-white
          p-6
          text-center
          text-xs
          font-bold
          text-gray-500
        "
      >
        Calculando CM_PESV para la vigencia{' '}
        {anio}...
      </div>
    )
  }

  if (
    error
  ) {
    return (
      <div
        className="
          rounded-xl
          border
          border-red-300
          bg-red-50
          p-4
        "
      >
        <div
          className="
            flex
            min-w-0
            items-start
            gap-3
          "
        >
          <ShieldAlert
            size={19}
            className="
              mt-0.5
              shrink-0
              text-red-700
            "
          />

          <div className="min-w-0">
            <div
              className="
                text-xs
                font-black
                uppercase
                text-red-800
              "
            >
              No fue posible calcular CM_PESV
            </div>

            <div
              className="
                mt-1
                break-words
                text-[10px]
                leading-relaxed
                text-red-700
              "
            >
              {error}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (
    !datos ||
    datos?.ok !== true
  ) {
    return (
      <div
        className="
          rounded-xl
          border
          border-gray-300
          bg-gray-50
          p-4
          text-[10px]
          text-gray-600
        "
      >
        Seleccione CM_PESV y calcule el
        período para consultar el cumplimiento
        de las metas PESV.
      </div>
    )
  }

  const evaluacion =
    datos?.evaluacion ||
    {}

  const calculo =
    datos?.calculo ||
    {}

  return (
    <div
      className="
        min-w-0
        space-y-4
        overflow-hidden
      "
    >
      <ResultadoCmPesv
        calculo={
          calculo
        }
      />

      <CumplimientoMeta
        calculo={
          calculo
        }
        evaluacion={
          evaluacion
        }
      />

      <LecturaResultado
        calculo={
          calculo
        }
      />

      <ResumenTrazabilidad
        calculo={
          calculo
        }
      />

      <Advertencias
        calculo={
          calculo
        }
      />

      <DetalleMetas
        calculo={
          calculo
        }
      />
    </div>
  )
}
