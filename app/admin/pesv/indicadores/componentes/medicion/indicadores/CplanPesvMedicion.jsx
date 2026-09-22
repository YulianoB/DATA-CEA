// app/admin/pesv/indicadores/componentes/medicion/indicadores/CplanPesvMedicion.jsx

'use client'

function texto(valor) {
  return String(valor ?? '').trim()
}

function numero(valor) {
  if (valor === null || valor === undefined || texto(valor) === '') {
    return null
  }

  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function numeroVisual(valor, decimales = 0) {
  const n = numero(valor)

  if (n === null) {
    return '-'
  }

  return new Intl.NumberFormat(
    'es-CO',
    {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }
  ).format(n)
}

function porcentajeVisual(valor) {
  const n = numero(valor)

  if (n === null) {
    return '-'
  }

  return `${numeroVisual(n, 2)}%`
}

function fechaVisual(valor) {
  const fecha = texto(valor)

  if (!fecha) {
    return '-'
  }

  const partes = fecha.slice(0, 10).split('-')

  if (partes.length !== 3) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function nombrePeriodo(periodo) {
  if (!periodo) {
    return '-'
  }

  if (texto(periodo?.tipo_periodo).toUpperCase() === 'ANUAL') {
    return `Acumulado anual ${periodo?.anio || ''}`.trim()
  }

  const nombres = {
    1: 'Primer trimestre',
    2: 'Segundo trimestre',
    3: 'Tercer trimestre',
    4: 'Cuarto trimestre',
  }

  return `${nombres[Number(periodo?.numero_periodo)] || 'Trimestre'} ${
    periodo?.anio || ''
  }`.trim()
}

function claseEstado(estado) {
  const valor = texto(estado).toUpperCase()

  if (valor === 'EJECUTADA') {
    return 'bg-green-100 text-green-800 border-green-200'
  }

  if (valor === 'EN_EJECUCION') {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  if (valor === 'REPROGRAMADA') {
    return 'bg-amber-100 text-amber-800 border-amber-200'
  }

  if (valor === 'CANCELADA') {
    return 'bg-red-100 text-red-800 border-red-200'
  }

  return 'bg-gray-100 text-gray-700 border-gray-200'
}

const NOMBRES_MESES = {
  1: 'ENE',
  2: 'FEB',
  3: 'MAR',
  4: 'ABR',
  5: 'MAY',
  6: 'JUN',
  7: 'JUL',
  8: 'AGO',
  9: 'SEP',
  10: 'OCT',
  11: 'NOV',
  12: 'DIC',
}

function simboloEstadoCorte(estado) {
  const valor = texto(estado).toUpperCase()

  if (valor === 'EJECUTADA') return '✓'
  if (valor === 'PARCIAL') return '◐'
  if (valor === 'NO_EJECUTADA') return '!'
  if (valor === 'VENCIDA') return 'V'
  return 'P'
}

function claseCorte(estado) {
  const valor = texto(estado).toUpperCase()

  if (valor === 'EJECUTADA') {
    return 'bg-green-100 text-green-800 border-green-200'
  }

  if (valor === 'PARCIAL') {
    return 'bg-amber-100 text-amber-800 border-amber-200'
  }

  if (valor === 'NO_EJECUTADA') {
    return 'bg-red-100 text-red-800 border-red-200'
  }

  if (valor === 'VENCIDA') {
    return 'bg-orange-100 text-orange-800 border-orange-200'
  }

  return 'bg-blue-50 text-blue-800 border-blue-200'
}

function resultadoActividadCplan(actividad) {
  return actividad?.incluida_aeplan ? 'EJECUTADA' : 'NO EJECUTADA'
}

function Tarjeta({
  etiqueta,
  valor,
  detalle,
  destacada = false,
}) {
  return (
    <div
      className={`
        rounded-xl
        border
        px-4
        py-3
        ${
          destacada
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-200 bg-white'
        }
      `}
    >
      <div
        className="
          text-[9px]
          font-black
          uppercase
          tracking-wide
          text-gray-500
        "
      >
        {etiqueta}
      </div>

      <div
        className={`
          mt-1
          text-2xl
          font-black
          ${
            destacada
              ? 'text-blue-900'
              : 'text-slate-800'
          }
        `}
      >
        {valor}
      </div>

      {detalle && (
        <div className="mt-1 text-[9px] text-gray-500">
          {detalle}
        </div>
      )}
    </div>
  )
}

export default function CplanPesvMedicion({
  anio,
  cargando = false,
  error = '',
  datos = null,
}) {
  if (cargando) {
    return (
      <div
        className="
          border
          border-blue-200
          bg-blue-50
          rounded-xl
          px-4
          py-8
          text-center
          text-[11px]
          text-blue-800
        "
      >
        <i className="fas fa-spinner fa-spin mr-2"></i>
        Calculando CPLAN_PESV...
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="
          border
          border-red-200
          bg-red-50
          rounded-xl
          px-4
          py-3
          text-[11px]
          text-red-700
        "
      >
        <i className="fas fa-exclamation-circle mr-2"></i>
        {error}
      </div>
    )
  }

  if (!datos?.ok) {
    return (
      <div
        className="
          border
          border-gray-200
          bg-gray-50
          rounded-xl
          px-4
          py-4
          text-[11px]
          text-gray-600
        "
      >
        Seleccione el período para calcular CPLAN_PESV.
      </div>
    )
  }

  const calculo = datos?.calculo || {}
  const periodo = datos?.periodo || {}
  const plan = datos?.plan || null
  const resumen = calculo?.resumen || {}
  const acumulado = calculo?.acumulado || null
  const actividades = Array.isArray(calculo?.detalle_actividades)
    ? calculo.detalle_actividades
    : []
  const sinCortes = Array.isArray(calculo?.actividades_sin_cortes)
    ? calculo.actividades_sin_cortes
    : []
  const advertencias = Array.isArray(calculo?.advertencias)
    ? calculo.advertencias
    : []

  const esTrimestral =
    texto(periodo?.tipo_periodo).toUpperCase() === 'TRIMESTRE'

  const acumuladoDiferente =
    esTrimestral &&
    acumulado &&
    Number(periodo?.numero_periodo) > 1

  return (
    <div className="space-y-4">

      {/* ====================================================
          IDENTIFICACIÓN DEL PLAN
      ==================================================== */}

      <div
        className="
          border
          border-slate-200
          bg-slate-50
          rounded-xl
          px-4
          py-3
        "
      >
        <div
          className="
            flex
            flex-col
            md:flex-row
            md:items-center
            md:justify-between
            gap-2
          "
        >
          <div>
            <div className="text-[9px] font-black uppercase text-slate-500">
              Plan Anual de Trabajo PESV
            </div>

            <div className="mt-0.5 text-[12px] font-black text-slate-800">
              {plan?.nombre || `Vigencia ${anio}`}
            </div>

            <div className="mt-1 text-[9px] text-slate-500">
              Período evaluado: {nombrePeriodo(periodo)}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {plan?.estado && (
              <span
                className="
                  inline-flex
                  items-center
                  border
                  border-slate-300
                  bg-white
                  rounded-full
                  px-2.5
                  py-1
                  text-[9px]
                  font-black
                  text-slate-700
                "
              >
                Plan: {texto(plan.estado).replaceAll('_', ' ')}
              </span>
            )}

            <span
              className="
                inline-flex
                items-center
                border
                border-blue-200
                bg-blue-50
                rounded-full
                px-2.5
                py-1
                text-[9px]
                font-black
                text-blue-800
              "
            >
              <i className="fas fa-database mr-1.5"></i>
              Automático
            </span>
          </div>
        </div>
      </div>

      {/* ====================================================
          ADVERTENCIAS
      ==================================================== */}

      {advertencias.length > 0 && (
        <div
          className="
            border
            border-amber-200
            bg-amber-50
            rounded-xl
            px-4
            py-3
          "
        >
          <div className="text-[10px] font-black uppercase text-amber-800">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            Validaciones de programación
          </div>

          <div className="mt-2 space-y-1.5">
            {advertencias.map((advertencia, index) => (
              <div
                key={`${index}-${advertencia}`}
                className="text-[10px] leading-relaxed text-amber-800"
              >
                • {advertencia}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================
          RESULTADO PRINCIPAL
      ==================================================== */}

      <div
        className="
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-4
          gap-2
        "
      >
        <Tarjeta
          etiqueta="Actividades ejecutadas · AEPlan(t)"
          valor={numeroVisual(calculo?.numerador, 0)}
          detalle="Actividades cuyos cortes requeridos del trimestre están todos EJECUTADOS."
        />

        <Tarjeta
          etiqueta="Actividades programadas · APPlan(t)"
          valor={numeroVisual(calculo?.denominador, 0)}
          detalle="Actividades con al menos un corte programado en el trimestre."
        />

        <Tarjeta
          etiqueta="Resultado CPLAN_PESV"
          valor={porcentajeVisual(calculo?.valor_resultado)}
          detalle="AEPlan(t) / APPlan(t) × 100"
          destacada
        />

        <Tarjeta
          etiqueta="Período evaluado"
          valor={
            esTrimestral
              ? `T${periodo?.numero_periodo || '-'}`
              : 'ANUAL'
          }
          detalle={nombrePeriodo(periodo)}
        />
      </div>

      {/* ====================================================
          EXPLICACIÓN
      ==================================================== */}

      <div
        className="
          border
          border-blue-200
          bg-blue-50/60
          rounded-xl
          px-4
          py-3
        "
      >
        <div className="text-[10px] font-black text-blue-900">
          ¿Qué representa este porcentaje?
        </div>

        <p className="mt-1 text-[10px] leading-relaxed text-blue-800">
          Muestra qué proporción de las actividades programadas en el
          Plan Anual de Trabajo PESV para el trimestre evaluado cumplieron
          completamente sus cortes de seguimiento. Una actividad cuenta una
          sola vez en APPlan(t) cuando tiene al menos un corte programado en
          el trimestre y solo acredita AEPlan(t) cuando todos sus cortes del
          trimestre están en estado EJECUTADA.
        </p>
      </div>

      {/* ====================================================
          ACUMULADO
      ==================================================== */}

      {acumulado && (
        <div
          className="
            border
            border-indigo-200
            rounded-xl
            overflow-hidden
          "
        >
          <div
            className="
              bg-indigo-50
              border-b
              border-indigo-200
              px-4
              py-2
            "
          >
            <div className="text-[10px] font-black uppercase text-indigo-900">
              {esTrimestral
                ? `Acumulado año hasta T${periodo?.numero_periodo}`
                : 'Acumulado anual'}
            </div>

            <div className="text-[9px] text-indigo-700 mt-0.5">
              Seguimiento acumulado de las actividades programadas desde T1
              hasta el período seleccionado.
            </div>
          </div>

          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-3
              gap-2
              p-3
              bg-white
            "
          >
            <Tarjeta
              etiqueta="Ejecutadas acumuladas"
              valor={numeroVisual(acumulado?.actividades_ejecutadas, 0)}
            />

            <Tarjeta
              etiqueta="Programadas acumuladas"
              valor={numeroVisual(acumulado?.actividades_programadas, 0)}
            />

            <Tarjeta
              etiqueta="Cumplimiento acumulado"
              valor={porcentajeVisual(acumulado?.valor_resultado)}
              destacada={acumuladoDiferente}
            />
          </div>
        </div>
      )}

      {/* ====================================================
          TRAZABILIDAD
      ==================================================== */}

      <div
        className="
          border
          border-gray-200
          rounded-xl
          overflow-hidden
        "
      >
        <div
          className="
            bg-gray-50
            border-b
            border-gray-200
            px-4
            py-2
          "
        >
          <div className="text-[10px] font-black uppercase text-slate-800">
            Trazabilidad de actividades del período
          </div>

          <div className="mt-0.5 text-[9px] text-gray-500">
            Verifique qué actividades conforman APPlan(t) y cuáles acreditan
            AEPlan(t).
          </div>
        </div>

        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-3
            gap-2
            p-3
            border-b
            border-gray-200
            bg-white
          "
        >
          <Tarjeta
            etiqueta="Programadas"
            valor={numeroVisual(resumen?.actividades_programadas_periodo, 0)}
          />

          <Tarjeta
            etiqueta="Ejecutadas"
            valor={numeroVisual(resumen?.actividades_ejecutadas_periodo, 0)}
          />

          <Tarjeta
            etiqueta="No ejecutadas"
            valor={numeroVisual(resumen?.actividades_no_ejecutadas_periodo, 0)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-xs">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr className="text-[8px] uppercase text-slate-600">
                <th className="px-3 py-2 text-left">
                  Código / Actividad
                </th>

                <th className="px-3 py-2 text-center">
                  Período
                </th>

                <th className="px-3 py-2 text-left">
                  Cortes del trimestre
                </th>

                <th className="px-3 py-2 text-center">
                  Resultado CPLAN
                </th>

                <th className="px-3 py-2 text-center">
                  APPlan
                </th>

                <th className="px-3 py-2 text-center">
                  AEPlan
                </th>

                <th className="px-3 py-2 text-left">
                  Responsable
                </th>
              </tr>
            </thead>

            <tbody>
              {actividades.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="
                      px-3
                      py-7
                      text-center
                      text-[10px]
                      text-gray-500
                    "
                  >
                    No existen actividades programadas para este período.
                  </td>
                </tr>
              ) : (
                actividades.map(actividad => {
                  const cortes = Array.isArray(actividad?.cortes)
                    ? actividad.cortes
                    : []

                  return (
                    <tr
                      key={actividad.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-2 align-top">
                        <div className="text-[9px] font-black text-blue-900">
                          {actividad?.codigo || '-'}
                        </div>

                        <div className="mt-0.5 text-[10px] font-semibold text-gray-800">
                          {actividad?.actividad || '-'}
                        </div>

                        <div className="mt-1 text-[8px] text-gray-500">
                          {fechaVisual(actividad?.fecha_programada_inicio)}
                          {actividad?.fecha_programada_fin
                            ? ` a ${fechaVisual(actividad.fecha_programada_fin)}`
                            : ''}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-center align-top text-[10px] font-bold">
                        {actividad?.trimestre
                          ? `T${actividad.trimestre}`
                          : esTrimestral
                            ? `T${periodo?.numero_periodo || '-'}`
                            : 'ANUAL'}
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-1">
                          {cortes.length === 0 ? (
                            <span className="text-[9px] text-gray-400">
                              Sin cortes
                            </span>
                          ) : (
                            cortes.map(corte => (
                              <span
                                key={corte.id}
                                className={`
                                  inline-flex
                                  items-center
                                  gap-1
                                  border
                                  rounded-md
                                  px-1.5
                                  py-1
                                  text-[8px]
                                  font-black
                                  whitespace-nowrap
                                  ${claseCorte(corte?.estado)}
                                `}
                                title={`${NOMBRES_MESES[Number(corte?.mes)] || `Mes ${corte?.mes}`}: ${texto(corte?.estado).replaceAll('_', ' ') || 'PROGRAMADA'}`}
                              >
                                {NOMBRES_MESES[Number(corte?.mes)] || `M${corte?.mes}`}
                                <span>{simboloEstadoCorte(corte?.estado)}</span>
                              </span>
                            ))
                          )}
                        </div>

                        {cortes.length > 0 && (
                          <div className="mt-1 text-[8px] text-gray-500">
                            {numeroVisual(actividad?.cortes_ejecutados, 0)} de{' '}
                            {numeroVisual(actividad?.total_cortes, 0)} corte(s)
                            ejecutado(s)
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2 text-center align-top">
                        <span
                          className={`
                            inline-flex
                            border
                            rounded-full
                            px-2
                            py-0.5
                            text-[8px]
                            font-black
                            whitespace-nowrap
                            ${
                              actividad?.incluida_aeplan
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }
                          `}
                        >
                          {resultadoActividadCplan(actividad)}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-center align-top">
                        <span
                          className={`
                            inline-flex
                            items-center
                            justify-center
                            min-w-8
                            h-6
                            rounded-full
                            px-2
                            text-[9px]
                            font-black
                            ${
                              actividad?.incluida_applan
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-400'
                            }
                          `}
                        >
                          {actividad?.incluida_applan ? 'Sí' : 'No'}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-center align-top">
                        <span
                          className={`
                            inline-flex
                            items-center
                            justify-center
                            min-w-8
                            h-6
                            rounded-full
                            px-2
                            text-[9px]
                            font-black
                            ${
                              actividad?.incluida_aeplan
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-500'
                            }
                          `}
                        >
                          {actividad?.incluida_aeplan ? 'Sí' : 'No'}
                        </span>
                      </td>

                      <td className="px-3 py-2 align-top text-[9px] text-gray-600">
                        {actividad?.responsable_nombre || '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================================================
          ACTIVIDADES SIN CORTES
      ==================================================== */}

      {sinCortes.length > 0 && (
        <div
          className="
            border
            border-amber-300
            rounded-xl
            overflow-hidden
          "
        >
          <div
            className="
              bg-amber-50
              border-b
              border-amber-200
              px-4
              py-2
            "
          >
            <div className="text-[10px] font-black uppercase text-amber-900">
              Actividades sin cortes de seguimiento
            </div>

            <div className="mt-0.5 text-[9px] text-amber-800">
              Estas actividades no participan en APPlan(t) ni AEPlan(t) hasta
              generar sus cortes de seguimiento en la matriz del Plan Anual.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-xs">
              <thead className="bg-white border-b border-gray-200">
                <tr className="text-[8px] uppercase text-gray-600">
                  <th className="px-3 py-2 text-left">
                    Código / Actividad
                  </th>

                  <th className="px-3 py-2 text-center">
                    APPlan
                  </th>

                  <th className="px-3 py-2 text-center">
                    AEPlan
                  </th>

                  <th className="px-3 py-2 text-left">
                    Acción requerida
                  </th>
                </tr>
              </thead>

              <tbody>
                {sinCortes.map(actividad => (
                  <tr
                    key={actividad.id}
                    className="border-b border-gray-100"
                  >
                    <td className="px-3 py-2">
                      <div className="text-[9px] font-black text-amber-900">
                        {actividad?.codigo || '-'}
                      </div>

                      <div className="text-[10px] font-semibold text-gray-800">
                        {actividad?.actividad || '-'}
                      </div>
                    </td>

                    <td className="px-3 py-2 text-center text-[9px] font-black text-gray-500">
                      No
                    </td>

                    <td className="px-3 py-2 text-center text-[9px] font-black text-gray-500">
                      No
                    </td>

                    <td className="px-3 py-2 text-[9px] text-amber-800">
                      Generar los cortes de seguimiento correspondientes en la
                      matriz del Plan Anual de Trabajo PESV.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================
          REGLA DE CÁLCULO
      ==================================================== */}

      <div
        className="
          border
          border-gray-200
          bg-gray-50
          rounded-xl
          px-4
          py-3
        "
      >
        <div className="text-[9px] font-black uppercase text-gray-600">
          Regla aplicada
        </div>

        <div className="mt-1 text-[10px] leading-relaxed text-gray-700">
          <strong>APPlan(t):</strong> una actividad del Plan Anual cuenta una
          sola vez cuando tiene al menos un corte programado en el trimestre
          evaluado.{' '}
          <strong>AEPlan(t):</strong> una actividad incluida en APPlan(t) cuenta
          una sola vez como ejecutada cuando todos sus cortes del trimestre
          están en estado EJECUTADA. Los cortes mensuales no se contabilizan
          como actividades independientes. Las actividades sin cortes de
          seguimiento no se incorporan al cálculo hasta completar su
          programación en la matriz.
        </div>
      </div>

    </div>
  )
}
