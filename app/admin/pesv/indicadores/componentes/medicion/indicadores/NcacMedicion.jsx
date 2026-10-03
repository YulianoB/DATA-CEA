'use client'

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Info,
} from 'lucide-react'

function numero(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function entero(valor) {
  const n = numero(valor)
  return n === null
    ? '-'
    : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
}

function porcentaje(valor) {
  const n = numero(valor)
  return n === null
    ? '-'
    : `${new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n)} %`
}

function fecha(valor) {
  if (!valor) return '-'
  const partes = String(valor).slice(0, 10).split('-')
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : String(valor)
}

function Resultado({ calculo }) {
  const resultados = calculo?.resultados || {}
  const nci =
    calculo?.denominador ??
    resultados?.no_conformidades_identificadas_analizadas
  const ncg =
    calculo?.numerador ??
    resultados?.no_conformidades_gestionadas_cerradas
  const ncac = calculo?.valor_resultado ?? resultados?.ncac

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase text-slate-500">
          Identificadas y analizadas · NCI
        </p>
        <p className="mt-2 text-2xl font-black text-slate-800">
          {entero(nci)}
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          No conformidades con análisis/causa registrado en la vigencia.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase text-slate-500">
          Gestionadas y cerradas · NCG
        </p>
        <p className="mt-2 text-2xl font-black text-slate-800">
          {entero(ncg)}
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          No conformidades analizadas que finalizaron el flujo en estado cerrado.
        </p>
      </div>

      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <p className="text-[10px] font-black uppercase text-slate-600">
          NCAC
        </p>
        <p className="mt-2 text-2xl font-black text-slate-900">
          {porcentaje(ncac)}
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          NCG / NCI × 100.
        </p>
      </div>
    </div>
  )
}

function Meta({ evaluacion, calculo }) {
  const resultado = numero(calculo?.valor_resultado)
  const meta = numero(evaluacion?.valor_meta)
  const cumple = evaluacion?.cumple_meta

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-500">
            Evaluación de la meta
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            Resultado {porcentaje(resultado)} · Meta{' '}
            {evaluacion?.operador_meta || ''} {porcentaje(meta)}
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black ${
            cumple === true
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : cumple === false
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          {cumple === true ? <CheckCircle2 size={15} /> : <Info size={15} />}
          {cumple === true
            ? 'CUMPLE'
            : cumple === false
              ? 'NO CUMPLE'
              : 'SIN EVALUAR'}
        </div>
      </div>
    </div>
  )
}

function Detalle({ calculo }) {
  const detalle = Array.isArray(calculo?.detalle_no_conformidades)
    ? calculo.detalle_no_conformidades
    : []

  if (detalle.length === 0) return null

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-700">
          <ClipboardCheck size={15} />
          No conformidades de la vigencia
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="border-b border-slate-200 px-3 py-2 text-left">Auditoría</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">No conformidad</th>
              <th className="border-b border-slate-200 px-3 py-2 text-center">Fecha</th>
              <th className="border-b border-slate-200 px-3 py-2 text-center">Analizada</th>
              <th className="border-b border-slate-200 px-3 py-2 text-center">Estado</th>
              <th className="border-b border-slate-200 px-3 py-2 text-center">Cierre</th>
            </tr>
          </thead>
          <tbody>
            {detalle.map((item, index) => (
              <tr key={item?.id || index}>
                <td className="border-b border-slate-100 px-3 py-2 font-bold text-slate-700">
                  {item?.auditoria_codigo || '-'}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                  {item?.codigo || `Hallazgo ${item?.numero || index + 1}`}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-center">
                  {fecha(item?.fecha_hallazgo)}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-center font-bold">
                  {item?.analizada ? 'Sí' : 'No'}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-center">
                  {String(item?.estado || '-').replaceAll('_', ' ')}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-center font-bold">
                  {item?.gestionada_cerrada ? fecha(item?.fecha_cierre) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Advertencias({ calculo }) {
  const advertencias = Array.isArray(calculo?.advertencias)
    ? calculo.advertencias
    : []

  if (advertencias.length === 0) return null

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
        <div>
          <p className="text-xs font-black uppercase text-amber-800">
            Observaciones del cálculo
          </p>
          <ul className="mt-2 space-y-1 text-[11px] leading-5 text-amber-800">
            {advertencias.map((item, index) => (
              <li key={index}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function NcacMedicion({ anio, cargando, error, datos }) {
  if (cargando) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
        Calculando NCAC...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
        {error}
      </div>
    )
  }

  if (!datos?.calculo) return null

  const calculo = datos.calculo
  const evaluacion = datos?.evaluacion || {}

  return (
    <div>
      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex gap-3">
          <ClipboardCheck size={19} className="mt-0.5 shrink-0 text-slate-700" />
          <div>
            <p className="text-xs font-black uppercase text-slate-800">
              NCAC · Vigencia {anio}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-600">
              Mide anualmente el porcentaje de no conformidades identificadas y analizadas que fueron gestionadas y cerradas. El cálculo se alimenta automáticamente del módulo PESV · Auditorías / No Conformidades.
            </p>
          </div>
        </div>
      </div>

      <Resultado calculo={calculo} />
      <Meta evaluacion={evaluacion} calculo={calculo} />
      <Detalle calculo={calculo} />
      <Advertencias calculo={calculo} />
    </div>
  )
}
