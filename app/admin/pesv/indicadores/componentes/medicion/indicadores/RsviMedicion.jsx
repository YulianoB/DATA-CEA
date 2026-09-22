// app/admin/pesv/indicadores/componentes/medicion/indicadores/RsviMedicion.jsx

'use client'

// ============================================================
// app/admin/pesv/indicadores/componentes/medicion/indicadores/RsviMedicion.jsx
// PESV - INDICADOR RSVI
//
// RSVI = RI(fa) - RI(ia)
//
// Complemento normativo:
// RVA(fa) - RVA(ia)
//
// IMPORTANTE:
// - Este componente solamente presenta el resultado específico.
// - El cálculo proviene de la API independiente RSVI.
// - La configuración y el ciclo de vida permanecen en el
//   coordinador común MedicionIndicadores.jsx.
// - CRITICO corresponde a la categoría superior utilizada
//   por la metodología de valoración de riesgos de la app.
// ============================================================

import {
  AlertTriangle,
  CheckCircle2,
  Info,
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


function formatearNumero(valor) {
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
      maximumFractionDigits: 2,
    }
  ).format(
    resultado
  )
}


function formatearVariacion(valor) {
  const resultado =
    numero(valor)

  if (
    resultado === null
  ) {
    return '-'
  }

  if (
    resultado > 0
  ) {
    return `+${formatearNumero(
      resultado
    )}`
  }

  return formatearNumero(
    resultado
  )
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


function claseNivel(nivel) {
  const valor =
    texto(
      nivel
    ).toUpperCase()

  if (
    valor === 'CRITICO'
  ) {
    return `
      border-red-300
      bg-red-100
      text-red-800
    `
  }

  if (
    valor === 'MODERADO'
  ) {
    return `
      border-amber-300
      bg-amber-100
      text-amber-900
    `
  }

  if (
    valor === 'BAJO'
  ) {
    return `
      border-green-300
      bg-green-100
      text-green-800
    `
  }

  return `
    border-gray-300
    bg-gray-100
    text-gray-700
  `
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
// RESULTADO PRINCIPAL RSVI
// ============================================================

function ResultadoRsvi({
  calculo,
}) {
  const riesgos =
    calculo
      ?.resultados
      ?.riesgos_identificados ||
    {}

  const resultado =
    numero(
      riesgos?.resultado ??
      calculo?.valor_resultado
    )

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
          bg-blue-700
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
          Riesgos identificados
        </div>
      </div>

      <div
        className="
          grid
          min-w-0
          grid-cols-1
          gap-3
          p-3
          md:grid-cols-3
        "
      >
        <TarjetaResultado
          titulo="Inicio del año · RI(ia)"
          valor={
            formatearNumero(
              riesgos
                ?.ri_inicio_anio
            )
          }
          detalle="Riesgos identificados al inicio de la vigencia."
        />

        <TarjetaResultado
          titulo="Final del año · RI(fa)"
          valor={
            formatearNumero(
              riesgos
                ?.ri_final_anio
            )
          }
          detalle="Riesgos identificados al cierre de la vigencia."
        />

        <TarjetaResultado
          titulo="Resultado RSVI"
          valor={
            formatearVariacion(
              resultado
            )
          }
          detalle="RI(fa) - RI(ia)"
          destacada
        />
      </div>
    </div>
  )
}


// ============================================================
// RESULTADO COMPLEMENTARIO RVA
// ============================================================

function ResultadoRva({
  calculo,
}) {
  const riesgosAlta =
    calculo
      ?.resultados
      ?.riesgos_valoracion_alta ||
    {}

  const resultado =
    numero(
      riesgosAlta?.resultado
    )

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
          bg-red-700
          px-4
          py-2
          text-white
        "
      >
        <ShieldAlert
          size={14}
          className="
            shrink-0
          "
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
          Riesgos con valoración alta
        </div>
      </div>

      <div
        className="
          grid
          min-w-0
          grid-cols-1
          gap-3
          p-3
          md:grid-cols-3
        "
      >
        <TarjetaResultado
          titulo="Inicio · RVA(ia)"
          valor={
            formatearNumero(
              riesgosAlta
                ?.rva_inicio_anio
            )
          }
          detalle="Riesgos con valoración alta al inicio."
        />

        <TarjetaResultado
          titulo="Final · RVA(fa)"
          valor={
            formatearNumero(
              riesgosAlta
                ?.rva_final_anio
            )
          }
          detalle="Riesgos con valoración alta al cierre."
        />

        <TarjetaResultado
          titulo="Variación RVA"
          valor={
            formatearVariacion(
              resultado
            )
          }
          detalle="RVA(fa) - RVA(ia)"
          destacada
        />
      </div>

      <div
        className="
          border-t
          border-red-100
          bg-red-50
          px-4
          py-3
        "
      >
        <p
          className="
            break-words
            text-[9px]
            leading-relaxed
            text-red-800
          "
        >
          Para esta medición se considera como
          valoración alta la categoría{' '}
          <strong>
            CRÍTICO
          </strong>
          , que corresponde al nivel superior
          definido en la metodología de valoración
          de riesgos utilizada por el CEA.
        </p>
      </div>
    </div>
  )
}


// ============================================================
// CUMPLIMIENTO DE META
//
// Se conserva exactamente la evaluación realizada por la API.
// Este componente NO recalcula ni cambia la meta.
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

  const unidad =
    calculo?.unidad_meta ??
    evaluacion?.unidad_meta ??
    'CANTIDAD'

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

          <div
            className="
              min-w-0
            "
          >
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
              La medición no tiene una evaluación
              de cumplimiento disponible.
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

        <div
          className="
            min-w-0
          "
        >
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
            Resultado RSVI:{' '}

            <strong>
              {formatearVariacion(
                resultado
              )}
            </strong>

            {' · '}

            Meta:{' '}

            <strong>
              {texto(operador) ||
                '-'}{' '}

              {formatearNumero(
                meta
              )}{' '}

              {texto(unidad) ||
                'CANTIDAD'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  )
}


// ============================================================
// LECTURA NEUTRAL DEL RESULTADO
//
// Importante:
// No califica automáticamente un aumento como desfavorable
// ni una disminución como favorable.
// ============================================================

function LecturaResultado({
  calculo,
}) {
  const riesgos =
    calculo
      ?.resultados
      ?.riesgos_identificados ||
    {}

  const riesgosAlta =
    calculo
      ?.resultados
      ?.riesgos_valoracion_alta ||
    {}

  const resultado =
    numero(
      riesgos?.resultado ??
      calculo?.valor_resultado
    )

  const resultadoAlta =
    numero(
      riesgosAlta?.resultado
    )

  let lecturaRsvi =
    'No hay información suficiente para describir la variación de riesgos identificados.'

  if (
    resultado !== null
  ) {
    if (
      resultado > 0
    ) {
      lecturaRsvi =
        `Al cierre de la vigencia se registran ${formatearNumero(
          resultado
        )} riesgo(s) identificado(s) más que al inicio del año.`
    } else if (
      resultado < 0
    ) {
      lecturaRsvi =
        `Al cierre de la vigencia se registran ${formatearNumero(
          Math.abs(resultado)
        )} riesgo(s) identificado(s) menos que al inicio del año.`
    } else {
      lecturaRsvi =
        'La cantidad de riesgos identificados al cierre es igual a la registrada al inicio de la vigencia.'
    }
  }

  let lecturaAlta =
    ''

  if (
    resultadoAlta !== null
  ) {
    if (
      resultadoAlta > 0
    ) {
      lecturaAlta =
        `Los riesgos clasificados en la categoría CRÍTICO aumentaron en ${formatearNumero(
          resultadoAlta
        )} frente a la valoración inicial.`
    } else if (
      resultadoAlta < 0
    ) {
      lecturaAlta =
        `Los riesgos clasificados en la categoría CRÍTICO disminuyeron en ${formatearNumero(
          Math.abs(
            resultadoAlta
          )
        )} frente a la valoración inicial.`
    } else {
      lecturaAlta =
        'La cantidad de riesgos clasificados en la categoría CRÍTICO no presentó variación entre el inicio y el cierre.'
    }
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

        <div
          className="
            min-w-0
          "
        >
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
            {lecturaRsvi}
          </p>

          {lecturaAlta && (
            <p
              className="
                mt-2
                break-words
                text-[10px]
                leading-relaxed
                text-blue-900
              "
            >
              {lecturaAlta}
            </p>
          )}

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
            La variación cuantifica el cambio
            observado durante la vigencia. Su
            interpretación debe complementarse con
            el análisis de los riesgos identificados,
            su valoración y las acciones de
            tratamiento desarrolladas por el CEA.
          </p>
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
          Trazabilidad de la vigencia
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
          lg:grid-cols-3
        "
      >
        <TarjetaResultado
          titulo="Total riesgos"
          valor={
            formatearNumero(
              resumen
                ?.total_riesgos_vigencia
            )
          }
        />

        <TarjetaResultado
          titulo="Nuevos en el año"
          valor={
            formatearNumero(
              resumen
                ?.riesgos_nuevos_durante_anio
            )
          }
        />

        <TarjetaResultado
          titulo="Total seguimientos"
          valor={
            formatearNumero(
              resumen
                ?.total_seguimientos
            )
          }
        />

        <TarjetaResultado
          titulo="Sin seguimiento"
          valor={
            formatearNumero(
              resumen
                ?.riesgos_sin_seguimiento
            )
          }
        />

        <TarjetaResultado
          titulo="Pasan a crítico"
          valor={
            formatearNumero(
              resumen
                ?.riesgos_que_pasan_a_critico
            )
          }
        />

        <TarjetaResultado
          titulo="Salen de crítico"
          valor={
            formatearNumero(
              resumen
                ?.riesgos_que_salen_de_critico
            )
          }
        />
      </div>
    </div>
  )
}


// ============================================================
// DETALLE DE RIESGOS
// ============================================================

function DetalleRiesgos({
  calculo,
}) {
  const riesgos =
    Array.isArray(
      calculo
        ?.detalle_riesgos
    )
      ? calculo
          .detalle_riesgos
      : []

  if (
    riesgos.length === 0
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
          Riesgos considerados en el cálculo
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
            min-w-[900px]
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
              <th
                className="
                  border
                  border-gray-300
                  px-3
                  py-2
                  text-left
                "
              >
                Código
              </th>

              <th
                className="
                  border
                  border-gray-300
                  px-3
                  py-2
                  text-left
                "
              >
                Fecha identificación
              </th>

              <th
                className="
                  border
                  border-gray-300
                  px-3
                  py-2
                  text-left
                "
              >
                Factor / situación
              </th>

              <th
                className="
                  border
                  border-gray-300
                  px-3
                  py-2
                  text-center
                "
              >
                Inicio
              </th>

              <th
                className="
                  border
                  border-gray-300
                  px-3
                  py-2
                  text-center
                "
              >
                Valoración inicial
              </th>

              <th
                className="
                  border
                  border-gray-300
                  px-3
                  py-2
                  text-center
                "
              >
                Valoración cierre
              </th>

              <th
                className="
                  border
                  border-gray-300
                  px-3
                  py-2
                  text-center
                "
              >
                Seguimientos
              </th>
            </tr>
          </thead>

          <tbody>
            {riesgos.map(
              riesgo => {
                const inicial =
                  riesgo
                    ?.valoracion_inicial_registrada

                const cierre =
                  riesgo
                    ?.valoracion_cierre

                return (
                  <tr
                    key={
                      riesgo
                        ?.riesgo_id
                    }
                  >
                    <td
                      className="
                        border
                        border-gray-300
                        px-3
                        py-2
                        align-top
                        font-black
                      "
                    >
                      {texto(
                        riesgo?.codigo
                      ) || '-'}
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
                      {formatearFecha(
                        riesgo
                          ?.fecha_identificacion
                      )}
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
                          max-w-xl
                          break-words
                          font-bold
                          leading-relaxed
                          text-gray-800
                        "
                      >
                        {texto(
                          riesgo
                            ?.factor_riesgo
                        ) || '-'}
                      </div>

                      <div
                        className="
                          mt-1
                          max-w-xl
                          break-words
                          text-[9px]
                          leading-relaxed
                          text-gray-500
                        "
                      >
                        {texto(
                          riesgo
                            ?.situacion_riesgo
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
                      {riesgo
                        ?.existia_inicio
                        ? 'SÍ'
                        : 'NO'}
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
                          max-w-full
                          rounded-full
                          border
                          px-2
                          py-1
                          text-[9px]
                          font-black
                          ${claseNivel(
                            inicial
                              ?.nivel_riesgo
                          )}
                        `}
                      >
                        {texto(
                          inicial
                            ?.nivel_riesgo
                        ) || '-'}
                      </span>

                      <div
                        className="
                          mt-1
                          text-[9px]
                          text-gray-500
                        "
                      >
                        NR{' '}

                        {formatearNumero(
                          inicial
                            ?.valor_nivel_riesgo
                        )}
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
                      {cierre ? (
                        <>
                          <span
                            className={`
                              inline-flex
                              max-w-full
                              rounded-full
                              border
                              px-2
                              py-1
                              text-[9px]
                              font-black
                              ${claseNivel(
                                cierre
                                  ?.nivel_riesgo
                              )}
                            `}
                          >
                            {texto(
                              cierre
                                ?.nivel_riesgo
                            ) || '-'}
                          </span>

                          <div
                            className="
                              mt-1
                              text-[9px]
                              text-gray-500
                            "
                          >
                            NR{' '}

                            {formatearNumero(
                              cierre
                                ?.valor_nivel_riesgo
                            )}
                          </div>
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
                        font-black
                      "
                    >
                      {formatearNumero(
                        riesgo
                          ?.total_seguimientos
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
// Conservamos exactamente el contrato de la versión larga:
//
// <RsviMedicion
//   anio={anio}
//   cargando={...}
//   error={...}
//   datos={respuestaCompletaApiRsvi}
// />
//
// NO cambiar estas props sin modificar previamente el
// coordinador MedicionIndicadores.jsx.
// ============================================================

export default function RsviMedicion({
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
        Calculando RSVI para la vigencia{' '}
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

          <div
            className="
              min-w-0
            "
          >
            <div
              className="
                text-xs
                font-black
                uppercase
                text-red-800
              "
            >
              No fue posible calcular RSVI
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
        Seleccione RSVI y calcule la vigencia
        para consultar sus resultados.
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
      {/* ====================================================
          RESULTADO NORMATIVO PRINCIPAL
          ==================================================== */}

      <ResultadoRsvi
        calculo={
          calculo
        }
      />


      {/* ====================================================
          RESULTADO COMPLEMENTARIO DE VALORACIÓN ALTA
          ==================================================== */}

      <ResultadoRva
        calculo={
          calculo
        }
      />


      {/* ====================================================
          EVALUACIÓN DE LA META CONFIGURADA
          ==================================================== */}

      <CumplimientoMeta
        calculo={
          calculo
        }
        evaluacion={
          evaluacion
        }
      />


      {/* ====================================================
          LECTURA NEUTRAL
          ==================================================== */}

      <LecturaResultado
        calculo={
          calculo
        }
      />


      {/* ====================================================
          TRAZABILIDAD
          ==================================================== */}

      <ResumenTrazabilidad
        calculo={
          calculo
        }
      />


      {/* ====================================================
          DETALLE DE LOS RIESGOS
          ==================================================== */}

      <DetalleRiesgos
        calculo={
          calculo
        }
      />
    </div>
  )
}