// app/admin/pesv/indicadores/componentes/medicion/indicadores/EjlcMedicion.jsx
 

'use client'

// ============================================================
// app/admin/pesv/indicadores/componentes/medicion/indicadores/
// EjlcMedicion.jsx
// ============================================================

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Database,
  Info,
  Target,
  TrendingDown,
  Users,
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

function Estado({ jornada }) {
  if (!jornada?.evaluable) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-[8px] font-bold text-amber-800">
        INFORMACIÓN INSUFICIENTE
      </span>
    )
  }

  if (jornada?.exceso) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-[8px] font-bold text-red-700">
        EXCESO
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-bold text-emerald-700">
      SIN EXCESO
    </span>
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
        <p className="mt-2 text-sm font-black text-slate-700">META NO CONFIGURADA</p>
        <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
          Resultado: {porcentaje(valor)}. Configure la meta para determinar el cumplimiento.
        </p>
      </div>
    )
  }

  const diferencia = numero(valor) - numero(meta)

  return (
    <div className={`rounded-xl border p-4 ${
      estado
        ? 'border-emerald-300 bg-emerald-50'
        : 'border-red-300 bg-red-50'
    }`}>
      <div className="flex items-start gap-3">
        {estado ? (
          <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-700" />
        ) : (
          <XCircle size={22} className="mt-0.5 shrink-0 text-red-700" />
        )}
        <div>
          <p className={`text-[9px] font-black uppercase ${estado ? 'text-emerald-700' : 'text-red-700'}`}>
            {titulo}
          </p>
          <p className={`mt-1 text-lg font-black ${estado ? 'text-emerald-800' : 'text-red-800'}`}>
            {estado ? 'CUMPLE' : 'NO CUMPLE'}
          </p>
          <p className={`mt-1 text-[9px] leading-relaxed ${estado ? 'text-emerald-700' : 'text-red-700'}`}>
            Resultado {porcentaje(valor)} · Meta {operador} {porcentaje(meta)}
            {diferencia !== 0 && (
              <> · {porcentaje(Math.abs(diferencia)).replace('%', '')} puntos porcentuales {diferencia > 0 ? 'por encima' : 'por debajo'} de la meta</>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function EjlcMedicion({
  anio,
  cargando = false,
  error = '',
  datos = null,
  lineaBase = null,
  valorMeta = null,
  operadorMeta = '<=',
}) {
  if (cargando) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs font-bold text-slate-500">
        Calculando EJLC para {anio}...
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
  const fuentes = mensual?.fuentes || {}
  const calidad = mensual?.calidad || {}
  const advertencias = mensual?.advertencias || []
  const jornadas = Array.isArray(datos?.detalle_jornadas)
    ? datos.detalle_jornadas
    : []

  const excesos = jornadas.filter(item => item?.evaluable && item?.exceso)
  const incompletas = jornadas.filter(item => !item?.evaluable)
  const diferencias = jornadas.filter(
    item => String(item?.conciliacion || '').toUpperCase() === 'DIFERENCIA'
  )

  const meta = numero(valorMeta)
  const base = numero(lineaBase)
  const resultadoMensual = numero(mensual?.EJLC)
  const resultadoAcumulado = numero(acumulado?.EJLC)
  const diferenciaBase =
    resultadoMensual !== null && base !== null
      ? resultadoMensual - base
      : null

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-slate-600" />
          <div>
            <p className="text-[10px] font-black uppercase text-slate-700">
              Criterio operacional EJLC
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
              La medición se realiza por instructor/día. Se considera exceso cuando
              se dictan más de 10 clases prácticas en la jornada. Las clases en
              estado DICTADA y PENDIENTE_CARGUE cuentan como efectivamente dictadas.
              Programación de clases es la fuente preferente y Horarios se conserva
              como fuente histórica y de control. Las dos fuentes nunca se suman
              para una misma jornada.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta
          titulo="EJD · Jornadas con exceso"
          valor={entero(mensual?.EJD)}
          ayuda="Jornadas evaluables con más de 10 clases."
        />
        <Tarjeta
          titulo="SDT · Jornadas evaluables"
          valor={entero(mensual?.SDT)}
          ayuda="Jornadas con información suficiente."
        />
        <Tarjeta
          titulo="EJLC mensual"
          valor={porcentaje(mensual?.EJLC)}
          ayuda="EJD / SDT × 100."
        />
        <Tarjeta
          titulo="Información insuficiente"
          valor={entero(mensual?.jornadas_informacion_insuficiente)}
          ayuda="Jornadas identificadas que no entran en SDT."
        />
      </div>

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
            valor={meta === null ? 'No configurada' : `${operadorMeta} ${porcentaje(meta)}`}
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
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <TrendingDown size={15} className="mt-0.5 shrink-0 text-slate-600" />
          <p className="text-[9px] leading-relaxed text-slate-600">
            El sentido de mejora del EJLC es descendente: un porcentaje menor representa menos jornadas instructor/día con exceso.
          </p>
        </div>
      </div>

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
            valor={`${fecha(mensual?.fecha_inicio)} – ${fecha(mensual?.fecha_fin)}`}
          />
          <Tarjeta titulo="EJD acumulado" valor={entero(acumulado?.EJD)} />
          <Tarjeta titulo="SDT acumulado" valor={entero(acumulado?.SDT)} />
          <Tarjeta titulo="EJLC acumulado" valor={porcentaje(acumulado?.EJLC)} />
        </div>
        {periodo?.fecha_corte && (
          <p className="mt-3 text-[9px] text-slate-500">
            Fecha de corte real: <strong>{fecha(periodo.fecha_corte)}</strong>. El día
            actual no se incluye en la evaluación.
          </p>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-slate-600" />
            <p className="text-[10px] font-black uppercase text-slate-700">
              Fuentes de información
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[9px]">
            <div className="rounded-lg bg-slate-50 p-3">Con Horarios: <strong>{entero(fuentes?.con_horarios)}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Con Programación: <strong>{entero(fuentes?.con_programacion)}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Solo Horarios: <strong>{entero(fuentes?.solo_horarios)}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Solo Programación: <strong>{entero(fuentes?.solo_programacion)}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Ambas fuentes: <strong>{entero(fuentes?.ambas_fuentes)}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Coincidencias: <strong>{entero(calidad?.coincidencias)}</strong></div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-600" />
            <p className="text-[10px] font-black uppercase text-slate-700">
              Calidad de la información
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[9px]">
            <div className="rounded-lg bg-slate-50 p-3">Jornadas identificadas: <strong>{entero(mensual?.jornadas_identificadas)}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Jornadas evaluables: <strong>{entero(mensual?.jornadas_evaluables)}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Horarios no cerrados: <strong>{entero(calidad?.horarios_no_cerrados)}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Abiertos vencidos: <strong>{entero(calidad?.horarios_abiertos_vencidos)}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Diferencias: <strong>{entero(calidad?.diferencias)}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Recuperadas por Programación: <strong>{entero(calidad?.jornadas_recuperadas_programacion)}</strong></div>
          </div>
        </div>
      </div>

      {advertencias.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-700" />
            <div>
              <p className="text-[10px] font-black uppercase text-amber-800">Advertencias de calidad</p>
              <ul className="mt-2 space-y-1 text-[9px] leading-relaxed text-amber-800">
                {advertencias.map((item, index) => <li key={index}>• {item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {excesos.length > 0 && (
        <DetalleJornadas titulo="Jornadas con exceso" jornadas={excesos} />
      )}

      {incompletas.length > 0 && (
        <DetalleJornadas titulo="Registros pendientes o incompletos" jornadas={incompletas} />
      )}

      {diferencias.length > 0 && (
        <DetalleJornadas titulo="Diferencias entre fuentes" jornadas={diferencias} />
      )}

      {jornadas.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-[10px] font-black uppercase text-slate-700">
            Ver comparativo completo de jornadas ({entero(jornadas.length)})
          </summary>
          <div className="border-t border-slate-200 p-4">
            <TablaJornadas jornadas={jornadas} />
          </div>
        </details>
      )}

      {numero(mensual?.EJLC) === null && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-[10px] leading-relaxed text-amber-800">
          No existe un SDT válido para el periodo. Por esta razón EJLC no se presenta
          como 0 %, sino como <strong>no calculable</strong> hasta contar con jornadas
          evaluables.
        </div>
      )}

      {numero(mensual?.EJLC) !== null && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-700" />
          <p className="text-[10px] leading-relaxed text-emerald-800">
            Resultado automático disponible: <strong>{porcentaje(mensual.EJLC)}</strong>,
            calculado con {entero(mensual.EJD)} jornadas con exceso sobre {entero(mensual.SDT)} jornadas evaluables.
          </p>
        </div>
      )}
    </div>
  )
}

function DetalleJornadas({ titulo, jornadas }) {
  return (
    <details open className="rounded-xl border border-slate-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-[10px] font-black uppercase text-slate-700">
        {titulo} ({entero(jornadas.length)})
      </summary>
      <div className="border-t border-slate-200 p-4">
        <TablaJornadas jornadas={jornadas} />
      </div>
    </details>
  )
}

function TablaJornadas({ jornadas }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-[9px]">
        <thead>
          <tr className="bg-slate-100 text-left uppercase text-slate-600">
            <th className="border border-slate-200 px-2 py-2">Fecha</th>
            <th className="border border-slate-200 px-2 py-2">Instructor</th>
            <th className="border border-slate-200 px-2 py-2">Horarios</th>
            <th className="border border-slate-200 px-2 py-2">Programación</th>
            <th className="border border-slate-200 px-2 py-2">Usado</th>
            <th className="border border-slate-200 px-2 py-2">Fuente</th>
            <th className="border border-slate-200 px-2 py-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {jornadas.map((item, index) => (
            <tr key={`${item?.fecha || 'sin-fecha'}-${item?.instructor_id || item?.instructor || index}-${index}`}>
              <td className="border border-slate-200 px-2 py-2 whitespace-nowrap">{fecha(item?.fecha)}</td>
              <td className="border border-slate-200 px-2 py-2 min-w-48">
                <div className="font-bold text-slate-700">{item?.instructor || '—'}</div>
                {item?.documento && <div className="text-[8px] text-slate-500">{item.documento}</div>}
              </td>
              <td className="border border-slate-200 px-2 py-2 text-center">
                {item?.horarios ? entero(item.horarios?.clases_declaradas) : '—'}
                {item?.horarios?.estado_calidad && <div className="mt-1 text-[8px] text-slate-500">{item.horarios.estado_calidad}</div>}
              </td>
              <td className="border border-slate-200 px-2 py-2 text-center">
                {item?.programacion ? entero(item.programacion?.clases_efectivas) : '—'}
              </td>
              <td className="border border-slate-200 px-2 py-2 text-center font-black">{entero(item?.clases_utilizadas)}</td>
              <td className="border border-slate-200 px-2 py-2">{item?.fuente_resultado || '—'}</td>
              <td className="border border-slate-200 px-2 py-2">
                <Estado jornada={item} />
                {item?.motivo_no_evaluable && <div className="mt-1 max-w-xs text-[8px] leading-relaxed text-slate-500">{item.motivo_no_evaluable}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
