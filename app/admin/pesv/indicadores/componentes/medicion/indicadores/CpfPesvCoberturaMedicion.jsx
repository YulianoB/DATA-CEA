'use client'

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Users,
} from 'lucide-react'

function numero(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function entero(valor) {
  const n = numero(valor)
  return n === null ? '-' : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
}

function porcentaje(valor) {
  const n = numero(valor)
  return n === null ? '-' : `${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} %`
}

function fecha(valor) {
  if (!valor) return '-'
  const partes = String(valor).slice(0, 10).split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : String(valor)
}

function Resultado({ calculo }) {
  const resultados = calculo?.resultados || {}
  const capacitados = calculo?.numerador ?? resultados?.colaboradores_capacitados
  const colaboradores = calculo?.denominador ?? resultados?.total_colaboradores
  const cobertura = calculo?.valor_resultado ?? resultados?.cobertura_plan_formacion ?? resultados?.cobertura

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase text-slate-500">Colaboradores capacitados</p>
        <p className="mt-2 text-2xl font-black text-slate-800">{entero(capacitados)}</p>
        <p className="mt-1 text-[10px] text-slate-500">Personas únicas con asistencia registrada.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase text-slate-500">Total de colaboradores</p>
        <p className="mt-2 text-2xl font-black text-slate-800">{entero(colaboradores)}</p>
        <p className="mt-1 text-[10px] text-slate-500">Población de colaboradores del período acumulado.</p>
      </div>

      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <p className="text-[10px] font-black uppercase text-slate-600">Cobertura del plan de formación</p>
        <p className="mt-2 text-2xl font-black text-slate-900">{porcentaje(cobertura)}</p>
        <p className="mt-1 text-[10px] text-slate-500">Capacitados / total de colaboradores × 100.</p>
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
          <p className="text-[10px] font-black uppercase text-slate-500">Evaluación de la meta</p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            Resultado {porcentaje(resultado)} · Meta {evaluacion?.operador_meta || ''} {porcentaje(meta)}
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black ${cumple === true ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : cumple === false ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
          {cumple === true ? <CheckCircle2 size={15} /> : <Info size={15} />}
          {cumple === true ? 'CUMPLE' : cumple === false ? 'NO CUMPLE' : 'SIN EVALUAR'}
        </div>
      </div>
    </div>
  )
}

function ResumenTrimestral({ calculo }) {
  const filas = Array.isArray(calculo?.resumen_trimestral)
    ? calculo.resumen_trimestral
    : Array.isArray(calculo?.trimestres)
      ? calculo.trimestres
      : []

  const anual = calculo?.acumulado_anual || calculo?.resumen_anual || null

  if (filas.length === 0 && !anual) return null

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-700">
          <Users size={15} />
          Cobertura acumulada por trimestre
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="border-b border-slate-200 px-3 py-2 text-left">Período</th>
              <th className="border-b border-slate-200 px-3 py-2 text-center">Capacitados</th>
              <th className="border-b border-slate-200 px-3 py-2 text-center">Colaboradores</th>
              <th className="border-b border-slate-200 px-3 py-2 text-center">Cobertura</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, index) => (
              <tr key={fila?.trimestre || index}>
                <td className="border-b border-slate-100 px-3 py-2 font-bold text-slate-700">{fila?.nombre || `Trimestre ${fila?.trimestre || index + 1}`}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-center">{entero(fila?.colaboradores_capacitados)}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-center">{entero(fila?.total_colaboradores)}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-center font-black">{porcentaje(fila?.cobertura ?? fila?.valor_resultado)}</td>
              </tr>
            ))}
            {anual ? (
              <tr className="bg-slate-50">
                <td className="px-3 py-2 font-black text-slate-800">Acumulado anual</td>
                <td className="px-3 py-2 text-center font-bold">{entero(anual?.colaboradores_capacitados)}</td>
                <td className="px-3 py-2 text-center font-bold">{entero(anual?.total_colaboradores)}</td>
                <td className="px-3 py-2 text-center font-black">{porcentaje(anual?.cobertura ?? anual?.valor_resultado)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DetalleCapacitados({ calculo }) {
  const detalle = Array.isArray(calculo?.detalle_capacitados) ? calculo.detalle_capacitados : []
  if (detalle.length === 0) return null

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
        <p className="text-xs font-black uppercase text-slate-700">Colaboradores capacitados considerados</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="border-b border-slate-200 px-3 py-2 text-left">Nombre</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Documento</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Rol</th>
              <th className="border-b border-slate-200 px-3 py-2 text-center">Capacitaciones</th>
              <th className="border-b border-slate-200 px-3 py-2 text-center">Última asistencia</th>
            </tr>
          </thead>
          <tbody>
            {detalle.map((item, index) => (
              <tr key={`${item?.documento || 'persona'}-${index}`}>
                <td className="border-b border-slate-100 px-3 py-2 font-bold text-slate-700">{item?.nombre || '-'}</td>
                <td className="border-b border-slate-100 px-3 py-2">{item?.documento || '-'}</td>
                <td className="border-b border-slate-100 px-3 py-2">{item?.rol || '-'}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-center">{entero(item?.capacitaciones_asistidas)}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-center">{fecha(item?.ultima_fecha_capacitacion)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Advertencias({ calculo }) {
  const items = Array.isArray(calculo?.advertencias) ? calculo.advertencias : []
  if (items.length === 0) return null

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-700" />
        <div>
          <p className="text-xs font-black uppercase text-amber-800">Advertencias del cálculo</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-800">
            {items.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function CpfPesvCoberturaMedicion({
  anio,
  cargando = false,
  error = '',
  datos = null,
}) {
  if (cargando) {
    return <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-600">Calculando cobertura del Plan de Formación en Seguridad Vial...</div>
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
  }

  if (!datos || datos?.ok !== true || !datos?.calculo) return null

  const calculo = datos.calculo
  const evaluacion = datos?.evaluacion || {}

  return (
    <div className="mt-4">
      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <Users size={19} className="mt-0.5 shrink-0 text-slate-700" />
          <div>
            <p className="text-xs font-black uppercase text-slate-800">CPF_PESV_COBERTURA · Vigencia {anio}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-600">
              Mide el porcentaje acumulado de colaboradores que participaron en el Plan Anual de Formación en Seguridad Vial frente al total de colaboradores de la organización. Cada persona se contabiliza una sola vez por documento, aunque haya asistido a varias capacitaciones.
            </p>
          </div>
        </div>
      </div>

      <Resultado calculo={calculo} />
      <Meta evaluacion={evaluacion} calculo={calculo} />
      <ResumenTrimestral calculo={calculo} />
      <DetalleCapacitados calculo={calculo} />
      <Advertencias calculo={calculo} />
    </div>
  )
}
