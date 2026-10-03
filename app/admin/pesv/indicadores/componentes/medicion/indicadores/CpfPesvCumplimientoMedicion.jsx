// app/admin/pesv/indicadores/componentes/medicion/indicadores/CpfPesvCumplimientoMedicion.jsx

'use client'

// ============================================================
// PESV - INDICADOR CPF_PESV_CUMPLIMIENTO
//
// Cumplimiento Plan de Formación en Seguridad Vial
//
// CPF_PESV_CUMPLIMIENTO =
//   Capacitaciones ejecutadas / Capacitaciones programadas * 100
//
// Variables normativas:
// - Capacitaciones en seguridad vial programadas.
// - Capacitaciones en seguridad vial ejecutadas.
//
// IMPORTANTE:
// - Este componente solamente presenta el resultado específico.
// - El cálculo proviene de la API independiente del indicador.
// - La configuración y el ciclo de vida permanecen en
//   MedicionIndicadores.jsx.
// - No consulta directamente las tablas del Plan de Formación.
// ============================================================

import {
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
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

  return Number.isFinite(resultado)
    ? resultado
    : null
}


function formatearNumero(
  valor,
  decimales = 0
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
      maximumFractionDigits: decimales,
    }
  ).format(resultado)
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
  if (!valor) {
    return '-'
  }

  const valorFecha =
    String(valor).slice(0, 10)

  const fecha =
    new Date(`${valorFecha}T00:00:00`)

  if (
    Number.isNaN(fecha.getTime())
  ) {
    return texto(valor) || '-'
  }

  return fecha.toLocaleDateString(
    'es-CO'
  )
}


function descripcionPeriodo(periodo) {
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


function claseEstadoActividad(valor) {
  const estado =
    texto(valor).toUpperCase()

  if (
    estado === 'EJECUTADA'
  ) {
    return `
      border-green-300
      bg-green-100
      text-green-800
    `
  }

  if (
    estado === 'PROGRAMADA'
  ) {
    return `
      border-blue-300
      bg-blue-100
      text-blue-800
    `
  }

  if (
    estado === 'CANCELADA'
  ) {
    return `
      border-red-300
      bg-red-100
      text-red-800
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
// RESULTADO PRINCIPAL
// ============================================================

function ResultadoPrincipal({
  calculo,
}) {
  const resultados =
    calculo?.resultados || {}

  const periodo =
    calculo?.periodo || {}

  const programadas =
    resultados
      ?.capacitaciones_programadas ??
    calculo?.denominador

  const ejecutadas =
    resultados
      ?.capacitaciones_ejecutadas ??
    calculo?.numerador

  const cumplimiento =
    resultados
      ?.cumplimiento_plan_formacion ??
    calculo?.valor_resultado

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
        <GraduationCap
          size={15}
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
          Cumplimiento Plan de Formación en Seguridad Vial
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
          titulo="Capacitaciones programadas"
          valor={
            formatearNumero(
              programadas
            )
          }
          detalle="Actividades del Plan Anual de Formación programadas para el período"
        />

        <TarjetaResultado
          titulo="Capacitaciones ejecutadas"
          valor={
            formatearNumero(
              ejecutadas
            )
          }
          detalle="Actividades del Plan Anual de Formación ejecutadas en el período"
        />

        <TarjetaResultado
          titulo="Resultado CPF_PESV"
          valor={
            formatearPorcentaje(
              cumplimiento
            )
          }
          detalle="Ejecutadas / Programadas × 100"
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
// CUMPLIMIENTO DE META
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
              La configuración de CPF_PESV_CUMPLIMIENTO no permite evaluar todavía el cumplimiento de su meta.
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
            Resultado CPF_PESV:{' '}

            <strong>
              {formatearPorcentaje(
                resultado
              )}
            </strong>

            {' · Meta: '}

            <strong>
              {texto(operador) || '-'}{' '}
              {formatearNumero(
                meta,
                2
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
  const programadas =
    numero(
      calculo
        ?.resultados
        ?.capacitaciones_programadas ??
      calculo?.denominador
    ) ?? 0

  const ejecutadas =
    numero(
      calculo
        ?.resultados
        ?.capacitaciones_ejecutadas ??
      calculo?.numerador
    ) ?? 0

  const resultado =
    numero(
      calculo?.valor_resultado
    )

  let lectura =
    'No existen capacitaciones programadas en el período evaluado para calcular el indicador.'

  if (
    programadas > 0 &&
    resultado !== null
  ) {
    lectura =
      `En el período evaluado se ejecutaron ${formatearNumero(
        ejecutadas
      )} de ${formatearNumero(
        programadas
      )} capacitación(es) programada(s) en el Plan Anual de Formación en Seguridad Vial, para un cumplimiento de ${formatearPorcentaje(
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
            El cálculo se alimenta del Plan Anual de Formación en Seguridad Vial. Las actividades programadas constituyen la base del período y las actividades ejecutadas conforman el cumplimiento acreditado por el flujo de formación y asistencia.
          </p>
        </div>
      </div>
    </div>
  )
}


// ============================================================
// RESUMEN TRIMESTRAL Y ACUMULADO ANUAL
// ============================================================

function ResumenPeriodos({
  calculo,
}) {
  const resumen =
    Array.isArray(
      calculo?.resumen_trimestral
    )
      ? calculo.resumen_trimestral
      : Array.isArray(
          calculo?.trimestres
        )
        ? calculo.trimestres
        : []

  const anual =
    calculo?.acumulado_anual ||
    calculo?.resumen_anual ||
    null

  if (
    resumen.length === 0 &&
    !anual
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
          Resumen trimestral y acumulado anual
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table
          className="
            w-full
            min-w-[620px]
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
                Período
              </th>

              <th className="border border-gray-300 px-3 py-2 text-center">
                Programadas
              </th>

              <th className="border border-gray-300 px-3 py-2 text-center">
                Ejecutadas
              </th>

              <th className="border border-gray-300 px-3 py-2 text-center">
                Cumplimiento
              </th>
            </tr>
          </thead>

          <tbody>
            {resumen.map(
              (item, indice) => {
                const numeroPeriodo =
                  item?.numero_periodo ??
                  item?.trimestre ??
                  indice + 1

                const programadas =
                  item?.programadas ??
                  item?.capacitaciones_programadas ??
                  0

                const ejecutadas =
                  item?.ejecutadas ??
                  item?.capacitaciones_ejecutadas ??
                  0

                const cumplimiento =
                  item?.cumplimiento ??
                  item?.valor_resultado ??
                  0

                return (
                  <tr
                    key={
                      `trimestre-${numeroPeriodo}`
                    }
                    className="odd:bg-white even:bg-slate-50"
                  >
                    <td className="border border-gray-300 px-3 py-2 font-bold text-gray-800">
                      {numeroPeriodo}° Trimestre
                    </td>

                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {formatearNumero(
                        programadas
                      )}
                    </td>

                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {formatearNumero(
                        ejecutadas
                      )}
                    </td>

                    <td className="border border-gray-300 px-3 py-2 text-center font-black">
                      {formatearPorcentaje(
                        cumplimiento
                      )}
                    </td>
                  </tr>
                )
              }
            )}

            {anual && (
              <tr
                className="
                  bg-slate-100
                  font-black
                  text-slate-800
                "
              >
                <td className="border border-gray-300 px-3 py-2">
                  Acumulado anual
                </td>

                <td className="border border-gray-300 px-3 py-2 text-center">
                  {formatearNumero(
                    anual?.programadas ??
                    anual?.capacitaciones_programadas
                  )}
                </td>

                <td className="border border-gray-300 px-3 py-2 text-center">
                  {formatearNumero(
                    anual?.ejecutadas ??
                    anual?.capacitaciones_ejecutadas
                  )}
                </td>

                <td className="border border-gray-300 px-3 py-2 text-center">
                  {formatearPorcentaje(
                    anual?.cumplimiento ??
                    anual?.valor_resultado
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


// ============================================================
// DETALLE DE ACTIVIDADES
// ============================================================

function DetalleActividades({
  calculo,
}) {
  const actividades =
    Array.isArray(
      calculo?.detalle_actividades
    )
      ? calculo.detalle_actividades
      : []

  if (
    actividades.length === 0
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
          Actividades consideradas en el cálculo
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table
          className="
            w-full
            min-w-[950px]
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
                Código
              </th>

              <th className="border border-gray-300 px-3 py-2 text-left">
                Actividad
              </th>

              <th className="border border-gray-300 px-3 py-2 text-center">
                Fecha programada
              </th>

              <th className="border border-gray-300 px-3 py-2 text-center">
                Trimestre
              </th>

              <th className="border border-gray-300 px-3 py-2 text-left">
                Dirigido a
              </th>

              <th className="border border-gray-300 px-3 py-2 text-center">
                Estado
              </th>

              <th className="border border-gray-300 px-3 py-2 text-center">
                Cuenta en programadas
              </th>

              <th className="border border-gray-300 px-3 py-2 text-center">
                Cuenta en ejecutadas
              </th>
            </tr>
          </thead>

          <tbody>
            {actividades.map(
              actividad => (
                <tr
                  key={
                    actividad?.actividad_id ??
                    actividad?.id
                  }
                >
                  <td className="border border-gray-300 px-3 py-2 align-top font-black">
                    {texto(
                      actividad?.codigo
                    ) || '-'}
                  </td>

                  <td className="border border-gray-300 px-3 py-2 align-top">
                    <div
                      className="
                        max-w-md
                        break-words
                        font-bold
                        text-gray-800
                      "
                    >
                      {texto(
                        actividad?.nombre
                      ) || '-'}
                    </div>

                    {texto(
                      actividad?.tema
                    ) && (
                      <div
                        className="
                          mt-1
                          max-w-md
                          break-words
                          text-[9px]
                          leading-relaxed
                          text-gray-500
                        "
                      >
                        {texto(
                          actividad?.tema
                        )}
                      </div>
                    )}
                  </td>

                  <td className="border border-gray-300 px-3 py-2 text-center align-top">
                    {formatearFecha(
                      actividad?.fecha_programada
                    )}
                  </td>

                  <td className="border border-gray-300 px-3 py-2 text-center align-top font-bold">
                    {actividad?.trimestre || '-'}
                  </td>

                  <td className="border border-gray-300 px-3 py-2 align-top">
                    {texto(
                      actividad?.dirigido_a
                    ) || '-'}
                  </td>

                  <td className="border border-gray-300 px-3 py-2 text-center align-top">
                    <span
                      className={`
                        inline-flex
                        rounded-full
                        border
                        px-2
                        py-1
                        text-[8px]
                        font-black
                        ${claseEstadoActividad(
                          actividad?.estado
                        )}
                      `}
                    >
                      {texto(
                        actividad?.estado
                      ) || '-'}
                    </span>
                  </td>

                  <td className="border border-gray-300 px-3 py-2 text-center align-top font-black">
                    {actividad?.cuenta_programada === false
                      ? 'NO'
                      : 'SÍ'}
                  </td>

                  <td className="border border-gray-300 px-3 py-2 text-center align-top font-black">
                    {actividad?.cuenta_ejecutada === true
                      ? 'SÍ'
                      : 'NO'}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
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

          <div className="mt-2 space-y-2">
            {advertencias.map(
              (advertencia, indice) => (
                <p
                  key={indice}
                  className="
                    break-words
                    text-[10px]
                    leading-relaxed
                    text-amber-800
                  "
                >
                  • {texto(advertencia)}
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
// COMPONENTE PRINCIPAL
//
// <CpfPesvCumplimientoMedicion
//   anio={anio}
//   cargando={...}
//   error={...}
//   datos={respuestaCompletaApiCpfPesvCumplimiento}
// />
//
// Mantener este contrato para MedicionIndicadores.jsx.
// ============================================================

export default function CpfPesvCumplimientoMedicion({
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
        Calculando CPF_PESV_CUMPLIMIENTO para la vigencia{' '}
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
              No fue posible calcular CPF_PESV_CUMPLIMIENTO
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
        Seleccione CPF_PESV_CUMPLIMIENTO y calcule el período para consultar el cumplimiento del Plan de Formación en Seguridad Vial.
      </div>
    )
  }

  const evaluacion =
    datos?.evaluacion || {}

  const calculo =
    datos?.calculo || {}

  return (
    <div
      className="
        min-w-0
        space-y-4
        overflow-hidden
      "
    >
      <ResultadoPrincipal
        calculo={calculo}
      />

      <CumplimientoMeta
        calculo={calculo}
        evaluacion={evaluacion}
      />

      <LecturaResultado
        calculo={calculo}
      />

      <ResumenPeriodos
        calculo={calculo}
      />

      <Advertencias
        calculo={calculo}
      />

      <DetalleActividades
        calculo={calculo}
      />
    </div>
  )
}
