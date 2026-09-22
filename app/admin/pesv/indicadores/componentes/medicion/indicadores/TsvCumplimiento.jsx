'use client'

// ============================================================
// app/admin/pesv/indicadores/componentes/medicion/indicadores/TsvCumplimiento.jsx
// PESV - INDICADORES
// CUMPLIMIENTO DE METAS TSV
// ============================================================

import {
  CheckCircle2,
  CircleDashed,
  Info,
  XCircle,
} from 'lucide-react'


function texto(valor) {
  return String(
    valor ?? ''
  ).trim()
}


function numero(valor) {
  if (
    valor === '' ||
    valor === null ||
    valor === undefined
  ) {
    return null
  }

  const convertido =
    Number(valor)

  return Number.isFinite(
    convertido
  )
    ? convertido
    : null
}


function formatearNumeroFijo(
  valor,
  decimales = 1
) {
  const n =
    numero(valor)

  if (
    n === null
  ) {
    return '—'
  }

  return new Intl.NumberFormat(
    'es-CO',
    {
      minimumFractionDigits:
        decimales,

      maximumFractionDigits:
        decimales,
    }
  ).format(n)
}


export default function TsvCumplimiento({
  evaluacionMetasTsv,
  cumpleMetaGlobalTsv,
  anio,
}) {
  return (
<div
                      className="
                        overflow-hidden
                        rounded-xl
                        border
                        border-slate-300
                        bg-white
                      "
                    >
                      {/* ======================================
                          ENCABEZADO
                      ====================================== */}

                      <div
                        className="
                          flex
                          flex-col
                          gap-3
                          border-b
                          border-slate-200
                          bg-slate-50
                          px-4
                          py-3
                          sm:flex-row
                          sm:items-center
                          sm:justify-between
                        "
                      >
                        <div>
                          <p
                            className="
                              text-[10px]
                              font-black
                              uppercase
                              text-slate-800
                            "
                          >
                            Cumplimiento de metas TSV
                          </p>

                          <p
                            className="
                              mt-1
                              text-[9px]
                              leading-relaxed
                              text-slate-500
                            "
                          >
                            Compare la tasa obtenida durante el
                            periodo con la línea base histórica y
                            la meta definida para la vigencia.
                          </p>
                        </div>


                        {/* ====================================
                            RESULTADO GLOBAL
                        ==================================== */}

                        {cumpleMetaGlobalTsv ===
                          true ? (
                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-full
                              border
                              border-emerald-300
                              bg-emerald-50
                              px-3
                              py-1.5
                              text-[9px]
                              font-black
                              text-emerald-700
                            "
                          >
                            <CheckCircle2
                              size={12}
                            />

                            Todas las metas cumplen
                          </span>
                        ) : cumpleMetaGlobalTsv ===
                          false ? (
                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-full
                              border
                              border-red-300
                              bg-red-50
                              px-3
                              py-1.5
                              text-[9px]
                              font-black
                              text-red-700
                            "
                          >
                            <XCircle
                              size={12}
                            />

                            Hay metas sin cumplir
                          </span>
                        ) : (
                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-full
                              border
                              border-slate-300
                              bg-white
                              px-3
                              py-1.5
                              text-[9px]
                              font-black
                              text-slate-500
                            "
                          >
                            <CircleDashed
                              size={12}
                            />

                            Sin evaluación
                          </span>
                        )}
                      </div>


                      {/* ======================================
                          TABLA
                      ====================================== */}

                      <div
                        className="
                          overflow-x-auto
                        "
                      >
                        <table
                          className="
                            min-w-[760px]
                            w-full
                          "
                        >
                          <thead>
                            <tr
                              className="
                                bg-slate-800
                                text-white
                              "
                            >
                              <th
                                className="
                                  px-3
                                  py-2.5
                                  text-left
                                  text-[8px]
                                  font-black
                                  uppercase
                                "
                              >
                                Nivel de pérdida
                              </th>

                              <th
                                className="
                                  px-3
                                  py-2.5
                                  text-center
                                  text-[8px]
                                  font-black
                                  uppercase
                                "
                              >
                                Línea base
                              </th>

                              <th
                                className="
                                  px-3
                                  py-2.5
                                  text-center
                                  text-[8px]
                                  font-black
                                  uppercase
                                "
                              >
                                Meta {anio}
                              </th>

                              <th
                                className="
                                  px-3
                                  py-2.5
                                  text-center
                                  text-[8px]
                                  font-black
                                  uppercase
                                "
                              >
                                Resultado periodo
                              </th>

                              <th
                                className="
                                  px-3
                                  py-2.5
                                  text-center
                                  text-[8px]
                                  font-black
                                  uppercase
                                "
                              >
                                Cumplimiento
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {[
                              {
                                clave:
                                  'fatalidades',

                                nombre:
                                  'Fatalidades',
                              },

                              {
                                clave:
                                  'heridos_graves',

                                nombre:
                                  'Heridos graves',
                              },

                              {
                                clave:
                                  'heridos_leves',

                                nombre:
                                  'Heridos leves',
                              },

                              {
                                clave:
                                  'choques_simples',

                                nombre:
                                  'Choques simples',
                              },
                            ].map(
                              nivel => {
                                const evaluacion =
                                  evaluacionMetasTsv?.[
                                    nivel.clave
                                  ] ||
                                  {}

                                const operador =
                                  texto(
                                    evaluacion
                                      ?.operador_meta
                                  )

                                const simboloOperador =
                                  operador === '<='
                                    ? '≤'
                                    : operador === '>='
                                      ? '≥'
                                      : operador

                                const cumple =
                                  evaluacion
                                    ?.cumple_meta

                                return (
                                  <tr
                                    key={
                                      nivel.clave
                                    }
                                    className="
                                      border-b
                                      border-slate-200
                                      last:border-b-0
                                    "
                                  >
                                    {/* ========================
                                        NIVEL
                                    ======================== */}

                                    <td
                                      className="
                                        px-3
                                        py-3
                                      "
                                    >
                                      <p
                                        className="
                                          text-[10px]
                                          font-black
                                          text-slate-700
                                        "
                                      >
                                        {nivel.nombre}
                                      </p>
                                    </td>


                                    {/* ========================
                                        LÍNEA BASE
                                    ======================== */}

                                    <td
                                      className="
                                        px-3
                                        py-3
                                        text-center
                                      "
                                    >
                                      <span
                                        className="
                                          text-sm
                                          font-black
                                          text-slate-700
                                        "
                                      >
                                        {formatearNumeroFijo(
                                          evaluacion
                                            ?.linea_base,
                                          1
                                        )}
                                      </span>
                                    </td>


                                    {/* ========================
                                        META
                                    ======================== */}

                                    <td
                                      className="
                                        px-3
                                        py-3
                                        text-center
                                      "
                                    >
                                      <span
                                        className="
                                          inline-flex
                                          items-center
                                          justify-center
                                          rounded-lg
                                          border
                                          border-blue-200
                                          bg-blue-50
                                          px-3
                                          py-1.5
                                          text-[10px]
                                          font-black
                                          text-blue-800
                                        "
                                      >
                                        {simboloOperador ||
                                          '—'}

                                        {' '}

                                        {formatearNumeroFijo(
                                          evaluacion
                                            ?.valor_meta,
                                          1
                                        )}
                                      </span>
                                    </td>


                                    {/* ========================
                                        RESULTADO
                                    ======================== */}

                                    <td
                                      className="
                                        px-3
                                        py-3
                                        text-center
                                      "
                                    >
                                      <span
                                        className="
                                          text-sm
                                          font-black
                                          text-slate-800
                                        "
                                      >
                                        {formatearNumeroFijo(
                                          evaluacion
                                            ?.valor_resultado,
                                          1
                                        )}
                                      </span>

                                      <p
                                        className="
                                          mt-0.5
                                          text-[8px]
                                          font-semibold
                                          text-slate-400
                                        "
                                      >
                                        por 1.000.000 km
                                      </p>
                                    </td>


                                    {/* ========================
                                        CUMPLIMIENTO
                                    ======================== */}

                                    <td
                                      className="
                                        px-3
                                        py-3
                                        text-center
                                      "
                                    >
                                      {cumple ===
                                        true ? (
                                        <span
                                          className="
                                            inline-flex
                                            items-center
                                            gap-1
                                            rounded-full
                                            border
                                            border-emerald-300
                                            bg-emerald-50
                                            px-2.5
                                            py-1
                                            text-[9px]
                                            font-black
                                            text-emerald-700
                                          "
                                        >
                                          <CheckCircle2
                                            size={11}
                                          />

                                          Cumple
                                        </span>
                                      ) : cumple ===
                                        false ? (
                                        <span
                                          className="
                                            inline-flex
                                            items-center
                                            gap-1
                                            rounded-full
                                            border
                                            border-red-300
                                            bg-red-50
                                            px-2.5
                                            py-1
                                            text-[9px]
                                            font-black
                                            text-red-700
                                          "
                                        >
                                          <XCircle
                                            size={11}
                                          />

                                          No cumple
                                        </span>
                                      ) : (
                                        <span
                                          className="
                                            inline-flex
                                            items-center
                                            gap-1
                                            rounded-full
                                            border
                                            border-slate-300
                                            bg-slate-50
                                            px-2.5
                                            py-1
                                            text-[9px]
                                            font-black
                                            text-slate-500
                                          "
                                        >
                                          <CircleDashed
                                            size={11}
                                          />

                                          Sin evaluar
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              }
                            )}
                          </tbody>
                        </table>
                      </div>


                      {/* ======================================
                          LEYENDA
                      ====================================== */}

                      <div
                        className="
                          border-t
                          border-slate-200
                          bg-slate-50
                          px-4
                          py-2.5
                        "
                      >
                        <div
                          className="
                            flex
                            items-start
                            gap-2
                          "
                        >
                          <Info
                            size={12}
                            className="
                              mt-0.5
                              shrink-0
                              text-slate-500
                            "
                          />

                          <p
                            className="
                              text-[8px]
                              leading-relaxed
                              text-slate-500
                            "
                          >
                            El cumplimiento se determina
                            individualmente para cada nivel de
                            pérdida utilizando la meta configurada
                            para la vigencia. Un resultado global
                            favorable requiere que las cuatro metas
                            sean evaluadas y cumplidas.
                          </p>
                        </div>
                      </div>
                    </div>
  )
}
