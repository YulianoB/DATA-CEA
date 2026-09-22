// app/admin/pesv/indicadores/componentes/medicion/indicadores/IdpMedicion.jsx

'use client'

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Info,
  Target,
  Truck,
  XCircle,
} from 'lucide-react'

function numero(valor) {
  if (valor === '' || valor === null || valor === undefined) return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function entero(valor) {
  const n = numero(valor)
  return n === null ? '—' : new Intl.NumberFormat('es-CO').format(n)
}

function porcentaje(valor) {
  const n = numero(valor)
  if (n === null) return 'No calculable'
  return `${new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)}%`
}

function fecha(valor) {
  if (!valor) return '—'
  const partes = String(valor).slice(0, 10).split('-')
  if (partes.length !== 3) return valor
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function Tarjeta({ titulo, valor, ayuda }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
        {titulo}
      </p>
      <p className="mt-1 text-xl font-black text-slate-800">{valor}</p>
      {ayuda && (
        <p className="mt-1 text-[9px] leading-relaxed text-slate-500">{ayuda}</p>
      )}
    </div>
  )
}

function cumpleMeta(valor, operador, meta) {
  const resultado = numero(valor)
  const objetivo = numero(meta)

  if (resultado === null || objetivo === null) return null

  if (operador === '<=') return resultado <= objetivo
  if (operador === '<') return resultado < objetivo
  if (operador === '>=') return resultado >= objetivo
  if (operador === '>') return resultado > objetivo
  if (operador === '=') return resultado === objetivo

  return null
}

function EstadoCumplimiento({ valor, operador, meta, titulo }) {
  const estado = cumpleMeta(valor, operador, meta)

  if (numero(valor) === null) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="text-[9px] font-black uppercase text-amber-800">{titulo}</p>
        <p className="mt-2 text-sm font-black text-amber-800">NO CALCULABLE</p>
        <p className="mt-1 text-[9px] leading-relaxed text-amber-700">
          No hay un resultado válido para evaluar el cumplimiento.
        </p>
      </div>
    )
  }

  if (numero(meta) === null || estado === null) {
    return (
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <p className="text-[9px] font-black uppercase text-slate-600">{titulo}</p>
        <p className="mt-2 text-sm font-black text-slate-700">
          META NO CONFIGURADA
        </p>
        <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
          Resultado: {porcentaje(valor)}. Configure la meta para determinar el
          cumplimiento.
        </p>
      </div>
    )
  }

  const diferencia = numero(valor) - numero(meta)

  return (
    <div
      className={`rounded-xl border p-4 ${
        estado
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-red-300 bg-red-50'
      }`}
    >
      <div className="flex items-start gap-3">
        {estado ? (
          <CheckCircle2
            size={22}
            className="mt-0.5 shrink-0 text-emerald-700"
          />
        ) : (
          <XCircle size={22} className="mt-0.5 shrink-0 text-red-700" />
        )}

        <div>
          <p
            className={`text-[9px] font-black uppercase ${
              estado ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {titulo}
          </p>

          <p
            className={`mt-1 text-lg font-black ${
              estado ? 'text-emerald-800' : 'text-red-800'
            }`}
          >
            {estado ? 'CUMPLE' : 'NO CUMPLE'}
          </p>

          <p
            className={`mt-1 text-[9px] leading-relaxed ${
              estado ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            Resultado {porcentaje(valor)} · Meta {operador} {porcentaje(meta)}
            {diferencia !== 0 && (
              <>
                {' '}
                · {porcentaje(Math.abs(diferencia)).replace('%', '')} puntos
                porcentuales {diferencia > 0 ? 'por encima' : 'por debajo'} de
                la meta
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

function fuenteLegible(item) {
  const horarios = Boolean(item?.horarios)
  const programacion = Boolean(item?.programacion)

  if (horarios && programacion) {
    return 'Actividad diaria y programación de clases'
  }

  if (programacion) {
    return 'Programación de clases'
  }

  if (horarios) {
    return 'Registro de actividad diaria'
  }

  return 'Sin otra evidencia digital de operación'
}

function TablaVehiculos({ registros }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-[9px]">
        <thead>
          <tr className="bg-slate-100 text-left uppercase text-slate-600">
            <th className="border border-slate-200 px-2 py-2">Fecha</th>
            <th className="border border-slate-200 px-2 py-2">Placa</th>
            <th className="border border-slate-200 px-2 py-2">
              Operación confirmada
            </th>
            <th className="border border-slate-200 px-2 py-2">
              Preoperacional
            </th>
            <th className="border border-slate-200 px-2 py-2">
              Evidencia disponible
            </th>
          </tr>
        </thead>

        <tbody>
          {registros.map((item, index) => (
            <tr
              key={`${item?.fecha || 'sin-fecha'}-${
                item?.placa || index
              }-${index}`}
            >
              <td className="whitespace-nowrap border border-slate-200 px-2 py-2">
                {fecha(item?.fecha)}
              </td>

              <td className="border border-slate-200 px-2 py-2 font-bold text-slate-700">
                {item?.placa || '—'}
              </td>

              <td className="border border-slate-200 px-2 py-2">
                {item?.opero ? 'Sí' : 'No confirmada'}
              </td>

              <td className="border border-slate-200 px-2 py-2">
                {item?.inspeccionado || item?.preoperacional
                  ? 'Registrado'
                  : 'No registrado'}
              </td>

              <td className="border border-slate-200 px-2 py-2">
                {fuenteLegible(item)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function IdpMedicion({
  anio,
  cargando = false,
  error = '',
  datos = null,
  lineaBase = null,
  valorMeta = null,
  operadorMeta = '>=',
}) {
  if (cargando) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs font-bold text-slate-500">
        Calculando IDP para {anio}...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs font-semibold text-red-700">
        {error}
      </div>
    )
  }

  if (!datos) return null

  const mensual = datos?.mensual || {}
  const acumulado = datos?.acumulado_anual || {}
  const periodo = datos?.periodo || {}

  const resumenPreoperacionales =
    datos?.resumen_preoperacionales ||
    mensual?.resumen_preoperacionales ||
    {}

  const detalle = Array.isArray(datos?.detalle_vehiculos)
    ? datos.detalle_vehiculos
    : Array.isArray(datos?.detalle_vehiculos_dia)
      ? datos.detalle_vehiculos_dia
      : Array.isArray(datos?.detalle_vehiculo_dia)
        ? datos.detalle_vehiculo_dia
        : []

  const operadosSinPreoperacional = detalle.filter(
    item =>
      item?.opero &&
      !(item?.inspeccionado || item?.preoperacional)
  )

  const preoperacionalesOtrasSalidas = detalle.filter(
    item =>
      !item?.opero &&
      (item?.inspeccionado || item?.preoperacional)
  )

  const totalPreoperacionales =
    numero(resumenPreoperacionales?.preoperacionales_totales) ??
    numero(mensual?.preoperacionales_totales) ??
    numero(mensual?.fuentes?.con_preoperacional)

  const preoperacionalesSinOtraEvidencia =
    numero(
      resumenPreoperacionales?.preoperacionales_sin_evidencia_operacion
    ) ??
    numero(mensual?.preoperacionales_sin_evidencia_operacion) ??
    preoperacionalesOtrasSalidas.length

  const cantidadOperadosSinPreoperacional =
    numero(mensual?.vehiculos_dia_sin_preoperacional) ??
    numero(mensual?.sin_preoperacional) ??
    operadosSinPreoperacional.length

  const meta = numero(valorMeta)
  const base = numero(lineaBase)
  const resultadoMensual = numero(mensual?.IDP)
  const resultadoAcumulado = numero(acumulado?.IDP)

  const diferenciaBase =
    resultadoMensual !== null && base !== null
      ? resultadoMensual - base
      : null

  return (
    <div className="space-y-4">
      {/* =====================================================
          INTERPRETACIÓN
      ===================================================== */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-slate-600" />

          <div>
            <p className="text-[10px] font-black uppercase text-slate-700">
              ¿Cómo interpretar el IDP?
            </p>

            <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
              El indicador de Inspecciones Diarias Preoperacionales (IDP)
              expresa el porcentaje de vehículos/día con operación confirmada
              que cuentan con inspección preoperacional registrada.
            </p>

            <div className="mt-2 space-y-1 text-[9px] leading-relaxed text-slate-600">
              <p>
                <strong>VID · Vehículos Inspeccionados Diariamente:</strong>{' '}
                vehículos/día con operación confirmada y con inspección
                preoperacional registrada.
              </p>

              <p>
                <strong>TV · Total de Vehículos que operan diariamente:</strong>{' '}
                vehículos/día cuya operación puede confirmarse mediante los
                registros disponibles de actividad del vehículo.
              </p>

              <p>
                <strong>Fórmula:</strong> IDP = (VID / TV) × 100.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          RESULTADO DEL MES
      ===================================================== */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta
          titulo="VID · Vehículos/día inspeccionados"
          valor={entero(mensual?.VID)}
          ayuda="Vehículos/día con operación confirmada y preoperacional registrado."
        />

        <Tarjeta
          titulo="TV · Vehículos/día operados"
          valor={entero(mensual?.TV)}
          ayuda="Vehículos/día con operación confirmada."
        />

        <Tarjeta
          titulo="IDP mensual"
          valor={porcentaje(mensual?.IDP)}
          ayuda="VID / TV × 100."
        />

        <Tarjeta
          titulo="Operados sin preoperacional"
          valor={entero(cantidadOperadosSinPreoperacional)}
          ayuda="Vehículos/día que requieren revisión."
        />
      </div>

      {/* =====================================================
          CUMPLIMIENTO
      ===================================================== */}
      <div className="grid gap-3 lg:grid-cols-2">
        <EstadoCumplimiento
          titulo="Cumplimiento del periodo"
          valor={resultadoMensual}
          operador={operadorMeta}
          meta={meta}
        />

        <EstadoCumplimiento
          titulo="Cumplimiento acumulado anual"
          valor={resultadoAcumulado}
          operador={operadorMeta}
          meta={meta}
        />
      </div>

      {/* =====================================================
          META Y LÍNEA BASE
      ===================================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-slate-600" />

          <p className="text-[10px] font-black uppercase text-slate-700">
            Meta y referencia histórica
          </p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tarjeta
            titulo="Meta institucional"
            valor={
              meta === null
                ? 'No configurada'
                : `${operadorMeta} ${porcentaje(meta)}`
            }
            ayuda="La meta determina el cumplimiento del indicador."
          />

          <Tarjeta
            titulo="Línea base"
            valor={base === null ? 'No configurada' : porcentaje(base)}
            ayuda="Referencia histórica; no sustituye la meta."
          />

          <Tarjeta
            titulo="Variación frente a línea base"
            valor={
              diferenciaBase === null
                ? '—'
                : `${diferenciaBase > 0 ? '+' : ''}${diferenciaBase
                    .toFixed(2)
                    .replace('.', ',')} p.p.`
            }
            ayuda="Diferencia en puntos porcentuales frente a la línea base."
          />
        </div>
      </div>

      {/* =====================================================
          PERIODO Y ACUMULADO
      ===================================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-slate-600" />

          <p className="text-[10px] font-black uppercase text-slate-700">
            Periodo y acumulado anual
          </p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tarjeta
            titulo="Periodo evaluado"
            valor={`${fecha(mensual?.fecha_inicio)} – ${fecha(
              mensual?.fecha_fin
            )}`}
          />

          <Tarjeta
            titulo="VID acumulado · Vehículos/día inspeccionados"
            valor={entero(acumulado?.VID)}
            ayuda="Vehículos/día con operación confirmada que cuentan con inspección preoperacional registrada en el acumulado de la vigencia."
          />

          <Tarjeta
            titulo="TV acumulado · Total de vehículos/día operados"
            valor={entero(acumulado?.TV)}
            ayuda="Total de vehículos/día cuya operación fue confirmada en el acumulado de la vigencia."
          />

          <Tarjeta
            titulo="IDP acumulado · Inspecciones Diarias Preoperacionales"
            valor={porcentaje(acumulado?.IDP)}
            ayuda="Porcentaje acumulado de vehículos/día con operación confirmada que cuentan con inspección preoperacional registrada."
          />
        </div>

        {periodo?.fecha_corte && (
          <p className="mt-3 text-[9px] text-slate-500">
            Fecha de corte real:{' '}
            <strong>{fecha(periodo.fecha_corte)}</strong>. El día actual no se
            incluye en la evaluación.
          </p>
        )}
      </div>

      {/* =====================================================
          PREOPERACIONALES
      ===================================================== */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <ClipboardCheck
            size={18}
            className="mt-0.5 shrink-0 text-blue-700"
          />

          <div className="w-full">
            <p className="text-[10px] font-black uppercase text-blue-800">
              Control preoperacional registrado
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Tarjeta
                titulo="Inspecciones preoperacionales registradas"
                valor={entero(totalPreoperacionales)}
                ayuda="Total de preoperacionales registrados durante el periodo."
              />

              <Tarjeta
                titulo="Preoperacionales asociados a otras salidas del vehículo"
                valor={entero(preoperacionalesSinOtraEvidencia)}
                ayuda="Registros válidos que no modifican el denominador del IDP."
              />
            </div>

            <p className="mt-3 text-[9px] leading-relaxed text-blue-800">
              Es normal que existan más inspecciones preoperacionales que
              vehículos/día incluidos en el cálculo del IDP. Todo vehículo que
              sale a rodar debe contar con su preoperacional, incluso cuando la
              salida no corresponde a una clase u otra actividad de la operación
              registrada para este indicador. Estos registros son evidencia
              válida del control preventivo y no representan una omisión ni un
              incumplimiento.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          ALERTA REAL
      ===================================================== */}
      {cantidadOperadosSinPreoperacional > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={17}
              className="mt-0.5 shrink-0 text-red-700"
            />

            <div>
              <p className="text-[10px] font-black uppercase text-red-800">
                Vehículos/día operados sin preoperacional registrado
              </p>

              <p className="mt-1 text-[9px] leading-relaxed text-red-700">
                Se identificaron{' '}
                {entero(cantidadOperadosSinPreoperacional)} vehículos/día con
                operación confirmada para los cuales no se encontró inspección
                preoperacional registrada. Estos casos requieren revisión.
              </p>
            </div>
          </div>
        </div>
      )}

      {operadosSinPreoperacional.length > 0 && (
        <details
          open
          className="rounded-xl border border-red-200 bg-white"
        >
          <summary className="cursor-pointer px-4 py-3 text-[10px] font-black uppercase text-red-700">
            Ver vehículos/día operados sin preoperacional (
            {entero(operadosSinPreoperacional.length)})
          </summary>

          <div className="border-t border-red-200 p-4">
            <TablaVehiculos registros={operadosSinPreoperacional} />
          </div>
        </details>
      )}

      {/* =====================================================
          OTRAS SALIDAS
      ===================================================== */}
      {preoperacionalesOtrasSalidas.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-[10px] font-black uppercase text-slate-700">
            Ver preoperacionales asociados a otras salidas (
            {entero(preoperacionalesOtrasSalidas.length)})
          </summary>

          <div className="border-t border-slate-200 p-4">
            <p className="mb-3 text-[9px] leading-relaxed text-slate-600">
              Estos registros se muestran como trazabilidad del control
              preventivo. No se consideran fallas y no se incorporan
              automáticamente al TV.
            </p>

            <TablaVehiculos registros={preoperacionalesOtrasSalidas} />
          </div>
        </details>
      )}

      {/* =====================================================
          ALCANCE
      ===================================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-slate-600" />

          <p className="text-[10px] font-black uppercase text-slate-700">
            Alcance del cálculo
          </p>
        </div>

        <p className="mt-2 text-[9px] leading-relaxed text-slate-600">
          Para el TV se consideran únicamente los vehículos/día cuya operación
          puede confirmarse mediante los registros de actividad disponibles. Un
          preoperacional por sí solo acredita que la inspección fue realizada,
          pero no permite establecer que la salida correspondió a la operación
          evaluada por este indicador.
        </p>
      </div>

      {/* =====================================================
          RESULTADO AUTOMÁTICO
      ===================================================== */}
      {resultadoMensual === null ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-[10px] leading-relaxed text-amber-800">
          No existe un TV válido para el periodo. Por esta razón el IDP no se
          presenta como 0 %, sino como <strong>no calculable</strong> hasta
          contar con vehículos/día con operación confirmada.
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2
            size={17}
            className="mt-0.5 shrink-0 text-emerald-700"
          />

          <p className="text-[10px] leading-relaxed text-emerald-800">
            Resultado automático disponible:{' '}
            <strong>{porcentaje(mensual.IDP)}</strong>, calculado con{' '}
            {entero(mensual.VID)} vehículos/día inspeccionados sobre{' '}
            {entero(mensual.TV)} vehículos/día con operación confirmada.
          </p>
        </div>
      )}
    </div>
  )
}
