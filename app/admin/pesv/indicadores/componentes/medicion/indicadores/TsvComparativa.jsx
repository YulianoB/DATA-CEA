// app

'use client'

import {
  Activity,
  Gauge,
  Info,
} from 'lucide-react'

function numero(valor) {
  if (valor === '' || valor === null || valor === undefined) return null
  const convertido = Number(valor)
  return Number.isFinite(convertido) ? convertido : null
}

function formatearNumero(valor, decimales = 2) {
  const n = numero(valor)
  if (n === null) return '—'
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  }).format(n)
}

function formatearNumeroFijo(valor, decimales = 1) {
  const n = numero(valor)
  if (n === null) return '—'
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n)
}

function formatearKilometros(valor) {
  const km = numero(valor)
  if (km === null) return '—'
  return `${formatearNumeroFijo(km, 1)} km`
}

const MESES = [
  { numero: 1, nombre: 'Enero' },
  { numero: 2, nombre: 'Febrero' },
  { numero: 3, nombre: 'Marzo' },
  { numero: 4, nombre: 'Abril' },
  { numero: 5, nombre: 'Mayo' },
  { numero: 6, nombre: 'Junio' },
  { numero: 7, nombre: 'Julio' },
  { numero: 8, nombre: 'Agosto' },
  { numero: 9, nombre: 'Septiembre' },
  { numero: 10, nombre: 'Octubre' },
  { numero: 11, nombre: 'Noviembre' },
  { numero: 12, nombre: 'Diciembre' },
]

const TRIMESTRES = [
  { numero: 1, nombre: 'Primer trimestre' },
  { numero: 2, nombre: 'Segundo trimestre' },
  { numero: 3, nombre: 'Tercer trimestre' },
  { numero: 4, nombre: 'Cuarto trimestre' },
]

function obtenerNombrePeriodo(tipoPeriodo, numeroPeriodo, anio) {
  if (tipoPeriodo === 'TRIMESTRE') {
    const trimestre = TRIMESTRES.find(
      item => Number(item.numero) === Number(numeroPeriodo)
    )
    return trimestre
      ? `${trimestre.nombre} ${anio}`
      : `Trimestre ${numeroPeriodo} ${anio}`
  }

  if (tipoPeriodo === 'MES') {
    const mes = MESES.find(
      item => Number(item.numero) === Number(numeroPeriodo)
    )
    return mes
      ? `${mes.nombre} ${anio}`
      : `Mes ${numeroPeriodo} ${anio}`
  }

  return `Vigencia ${anio}`
}

function CeldaTsv({
  cantidad,
  tasa,
  disponible = true,
}) {
  if (!disponible) {
    return (
      <div className="py-1 text-center text-[9px] font-semibold text-slate-400">
        Sin información
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-1">
      <span className="text-sm font-black text-slate-800">
        {formatearNumero(cantidad, 0)}
      </span>

      <span className="mt-0.5 text-[8px] font-semibold text-slate-500">
        {Number(cantidad || 0) === 1 ? 'evento' : 'eventos'}
      </span>

      <span className="mt-1 rounded bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-700">
        {formatearNumeroFijo(tasa, 1)} tasa
      </span>
    </div>
  )
}

function FilaComparativaTsv({
  nombre,
  historicoCantidad,
  historicoTasa,
  periodoCantidad,
  periodoTasa,
  acumuladoCantidad,
  acumuladoTasa,
  historicoDisponible = true,
  tipo = 'normal',
}) {
  let claseNombre = 'text-slate-700'
  let claseFila = 'bg-white'

  if (tipo === 'fatal') {
    claseNombre = 'text-red-800'
    claseFila = 'bg-red-50/40'
  }

  if (tipo === 'grave') {
    claseNombre = 'text-orange-800'
    claseFila = 'bg-orange-50/40'
  }

  if (tipo === 'leve') {
    claseNombre = 'text-amber-800'
    claseFila = 'bg-amber-50/40'
  }

  return (
    <tr className={`border-b border-slate-200 ${claseFila}`}>
      <td className="px-3 py-3 align-middle">
        <div className="flex min-h-[58px] items-center">
          <span className={`text-[10px] font-black ${claseNombre}`}>
            {nombre}
          </span>
        </div>
      </td>

      <td className="border-l border-slate-200 px-3 py-2">
        <CeldaTsv
          cantidad={historicoCantidad}
          tasa={historicoTasa}
          disponible={historicoDisponible}
        />
      </td>

      <td className="border-l border-slate-200 px-3 py-2">
        <CeldaTsv
          cantidad={periodoCantidad}
          tasa={periodoTasa}
        />
      </td>

      <td className="border-l border-slate-200 px-3 py-2">
        <CeldaTsv
          cantidad={acumuladoCantidad}
          tasa={acumuladoTasa}
        />
      </td>
    </tr>
  )
}

export default function TsvComparativa({
  historico,
  periodo,
  acumulado,
  anio,
  tipoPeriodo,
  numeroPeriodo,
}) {
  const anioHistorico = historico?.anio || (Number(anio) - 1)
  const historicoDisponible = historico?.disponible === true

  const tituloPeriodoHistorico =
    obtenerNombrePeriodo(
      tipoPeriodo,
      numeroPeriodo,
      anioHistorico
    ).replace(` ${anioHistorico}`, '')

  const tituloPeriodoActual =
    obtenerNombrePeriodo(
      tipoPeriodo,
      numeroPeriodo,
      anio
    ).replace(` ${anio}`, '')

  const tasasHistorico = historico?.tasas_por_nivel || {}
  const tasasPeriodo = periodo?.tasas_por_nivel || {}
  const tasasAcumulado = acumulado?.tasas_por_nivel || {}

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <Activity
            size={16}
            className="mt-0.5 shrink-0 text-slate-700"
          />

          <div>
            <p className="text-[10px] font-black uppercase text-slate-800">
              Comparación y evolución del TSV
            </p>

            <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
              Cada celda muestra primero la cantidad real registrada y luego
              la tasa normalizada por cada 1.000.000 de kilómetros recorridos.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="w-[220px] px-3 py-3 text-left text-[8px] font-black uppercase">
                Nivel de pérdida
              </th>

              <th className="border-l border-slate-600 px-3 py-3 text-center">
                <p className="text-[10px] font-black">{anioHistorico}</p>
                <p className="mt-0.5 text-[8px] font-medium text-slate-300">
                  {tituloPeriodoHistorico}
                </p>
              </th>

              <th className="border-l border-slate-600 px-3 py-3 text-center">
                <p className="text-[10px] font-black">{anio}</p>
                <p className="mt-0.5 text-[8px] font-medium text-slate-300">
                  {tituloPeriodoActual}
                </p>
              </th>

              <th className="border-l border-slate-600 px-3 py-3 text-center">
                <p className="text-[10px] font-black">
                  Acumulado {anio}
                </p>
                <p className="mt-0.5 text-[8px] font-medium text-slate-300">
                  Enero al cierre del periodo
                </p>
              </th>
            </tr>
          </thead>

          <tbody>
            <FilaComparativaTsv
              nombre="Fatalidades"
              historicoCantidad={historico?.fatalidades}
              historicoTasa={tasasHistorico?.fatalidades}
              periodoCantidad={periodo?.fatalidades}
              periodoTasa={tasasPeriodo?.fatalidades}
              acumuladoCantidad={acumulado?.fatalidades}
              acumuladoTasa={tasasAcumulado?.fatalidades}
              historicoDisponible={historicoDisponible}
              tipo="fatal"
            />

            <FilaComparativaTsv
              nombre="Heridos graves"
              historicoCantidad={historico?.heridos_graves}
              historicoTasa={tasasHistorico?.heridos_graves}
              periodoCantidad={periodo?.heridos_graves}
              periodoTasa={tasasPeriodo?.heridos_graves}
              acumuladoCantidad={acumulado?.heridos_graves}
              acumuladoTasa={tasasAcumulado?.heridos_graves}
              historicoDisponible={historicoDisponible}
              tipo="grave"
            />

            <FilaComparativaTsv
              nombre="Heridos leves"
              historicoCantidad={historico?.heridos_leves}
              historicoTasa={tasasHistorico?.heridos_leves}
              periodoCantidad={periodo?.heridos_leves}
              periodoTasa={tasasPeriodo?.heridos_leves}
              acumuladoCantidad={acumulado?.heridos_leves}
              acumuladoTasa={tasasAcumulado?.heridos_leves}
              historicoDisponible={historicoDisponible}
              tipo="leve"
            />

            <FilaComparativaTsv
              nombre="Choques simples"
              historicoCantidad={historico?.choques_simples}
              historicoTasa={tasasHistorico?.choques_simples}
              periodoCantidad={periodo?.choques_simples}
              periodoTasa={tasasPeriodo?.choques_simples}
              acumuladoCantidad={acumulado?.choques_simples}
              acumuladoTasa={tasasAcumulado?.choques_simples}
              historicoDisponible={historicoDisponible}
            />

            <tr className="bg-blue-50">
              <td className="px-3 py-4 align-middle">
                <div className="flex items-center gap-2">
                  <Gauge
                    size={14}
                    className="text-blue-700"
                  />

                  <div>
                    <p className="text-[10px] font-black uppercase text-blue-800">
                      Kilómetros recorridos
                    </p>

                    <p className="mt-0.5 text-[8px] text-blue-600">
                      Exposición de la flota
                    </p>
                  </div>
                </div>
              </td>

              <td className="border-l border-blue-200 px-3 py-4 text-center">
                {historicoDisponible ? (
                  <p className="text-sm font-black text-blue-900">
                    {formatearKilometros(
                      historico?.kilometros_recorridos
                    )}
                  </p>
                ) : (
                  <p className="text-[9px] font-semibold text-slate-400">
                    Sin información
                  </p>
                )}
              </td>

              <td className="border-l border-blue-200 px-3 py-4 text-center">
                <p className="text-sm font-black text-blue-900">
                  {formatearKilometros(
                    periodo?.kilometros_recorridos
                  )}
                </p>
              </td>

              <td className="border-l border-blue-200 px-3 py-4 text-center">
                <p className="text-sm font-black text-blue-900">
                  {formatearKilometros(
                    acumulado?.kilometros_recorridos
                  )}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="flex items-start gap-2">
          <Info
            size={12}
            className="mt-0.5 shrink-0 text-slate-500"
          />

          <p className="text-[8px] leading-relaxed text-slate-500">
            <strong>Eventos:</strong>{' '}
            cantidad real registrada.{' '}
            <strong>Tasa:</strong>{' '}
            frecuencia normalizada por cada 1.000.000 de kilómetros recorridos.
          </p>
        </div>
      </div>
    </div>
  )
}
