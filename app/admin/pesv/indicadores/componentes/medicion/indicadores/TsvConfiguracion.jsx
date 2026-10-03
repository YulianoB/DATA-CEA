// app/admin/pesv/indicadores/componentes/medicion/indicadores/TsvConfiguracion.jsx

'use client'

// ============================================================
// app/admin/pesv/indicadores/componentes/medicion/indicadores/TsvConfiguracion.jsx
// PESV - INDICADORES
// CONFIGURACIÓN ESPECÍFICA TSV
// ============================================================

import {
  Info,
  Pencil,
  RefreshCw,
  Target,
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


export function TsvConfiguracionRegistrada({
  configuracionActual,
  indicadorSeleccionado,
  anio,
  setEditandoConfiguracion,
}) {
  return (
<>
                {/* ============================================
                    CONFIGURACIÓN TSV REGISTRADA
                    app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
                ============================================ */}

                <div
                  className="
                    overflow-hidden
                    rounded-xl
                    border
                    border-blue-200
                    bg-white
                  "
                >
                  {/* ==========================================
                      ENCABEZADO
                  ========================================== */}

                  <div
                    className="
                      border-b
                      border-blue-200
                      bg-blue-50
                      px-4
                      py-3
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        gap-3
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      "
                    >
                      <div
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <Target
                          size={17}
                          className="
                            mt-0.5
                            shrink-0
                            text-blue-700
                          "
                        />

                        <div>
                          <p
                            className="
                              text-[10px]
                              font-black
                              uppercase
                              text-blue-800
                            "
                          >
                            Configuración TSV registrada
                          </p>

                          <p
                            className="
                              mt-1
                              text-[9px]
                              leading-relaxed
                              text-blue-700
                            "
                          >
                            Línea base histórica y metas definidas
                            para cada nivel de pérdida.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          () =>
                            setEditandoConfiguracion(
                              true
                            )
                        }
                        className="
                          inline-flex
                          items-center
                          justify-center
                          gap-1.5
                          rounded-lg
                          border
                          border-blue-300
                          bg-white
                          px-3
                          py-2
                          text-[9px]
                          font-bold
                          text-blue-700
                          hover:bg-blue-100
                        "
                      >
                        <Pencil
                          size={12}
                        />

                        Editar configuración
                      </button>
                    </div>
                  </div>


                  {/* ==========================================
                      DATOS GENERALES DE LÍNEA BASE
                  ========================================== */}

                  <div
                    className="
                      grid
                      gap-3
                      border-b
                      border-slate-200
                      bg-slate-50
                      px-4
                      py-3
                      sm:grid-cols-3
                    "
                  >
                    <div>
                      <p
                        className="
                          text-[8px]
                          font-bold
                          uppercase
                          text-slate-400
                        "
                      >
                        Origen línea base
                      </p>

                      <p
                        className="
                          mt-1
                          text-[10px]
                          font-black
                          text-slate-700
                        "
                      >
                        {texto(
                          configuracionActual
                            ?.configuracion_especifica
                            ?.linea_base
                            ?.origen
                        ).toUpperCase() ===
                        'AUTOMATICA'
                          ? 'Calculada desde histórico'
                          : 'Registrada manualmente'}
                      </p>
                    </div>

                    <div>
                      <p
                        className="
                          text-[8px]
                          font-bold
                          uppercase
                          text-slate-400
                        "
                      >
                        Año de referencia
                      </p>

                      <p
                        className="
                          mt-1
                          text-[10px]
                          font-black
                          text-slate-700
                        "
                      >
                        {configuracionActual
                          ?.configuracion_especifica
                          ?.linea_base
                          ?.anio_referencia ??
                          '—'}
                      </p>
                    </div>

                    <div>
                      <p
                        className="
                          text-[8px]
                          font-bold
                          uppercase
                          text-slate-400
                        "
                      >
                        Unidad
                      </p>

                      <p
                        className="
                          mt-1
                          text-[10px]
                          font-black
                          text-slate-700
                        "
                      >
                        Tasa por 1.000.000 km
                      </p>
                    </div>
                  </div>


                  {/* ==========================================
                      TABLA DE LÍNEA BASE Y METAS
                  ========================================== */}

                  <div
                    className="
                      overflow-x-auto
                    "
                  >
                    <table
                      className="
                        min-w-[620px]
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
                              px-4
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
                              px-4
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
                              px-4
                              py-2.5
                              text-center
                              text-[8px]
                              font-black
                              uppercase
                            "
                          >
                            Meta {anio}
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
                            const especifica =
                              configuracionActual
                                ?.configuracion_especifica ||
                              {}

                            const linea =
                              especifica
                                ?.linea_base ||
                              {}

                            const meta =
                              especifica
                                ?.metas
                                ?.[nivel.clave] ||
                              {}

                            const operador =
                              texto(
                                meta?.operador
                              )

                            const simboloOperador =
                              operador === '<='
                                ? '≤'
                                : operador === '>='
                                  ? '≥'
                                  : operador

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
                                <td
                                  className="
                                    px-4
                                    py-3
                                    text-[10px]
                                    font-bold
                                    text-slate-700
                                  "
                                >
                                  {nivel.nombre}
                                </td>

                                <td
                                  className="
                                    px-4
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
                                      linea?.[
                                        nivel.clave
                                      ],
                                      1
                                    )}
                                  </span>
                                </td>

                                <td
                                  className="
                                    px-4
                                    py-3
                                    text-center
                                  "
                                >
                                  <span
                                    className="
                                      inline-flex
                                      items-center
                                      justify-center
                                      gap-1
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
                                    {simboloOperador || '—'}

                                    {' '}

                                    {formatearNumeroFijo(
                                      meta?.valor,
                                      1
                                    )}
                                  </span>
                                </td>
                              </tr>
                            )
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>


                {/* ============================================
                    FUENTE Y OBSERVACIONES TSV
                ============================================ */}

                <div
                  className="
                    mt-3
                    grid
                    gap-3
                    md:grid-cols-2
                  "
                >
                  <div
                    className="
                      rounded-lg
                      border
                      border-slate-200
                      bg-slate-50
                      p-3
                    "
                  >
                    <p
                      className="
                        text-[9px]
                        font-bold
                        uppercase
                        text-slate-500
                      "
                    >
                      Fuente de información
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        leading-relaxed
                        text-slate-600
                      "
                    >
                      {configuracionActual
                        .fuente_informacion ||
                        indicadorSeleccionado
                          .fuente_datos ||
                        'Sin fuente registrada'}
                    </p>
                  </div>

                  <div
                    className="
                      rounded-lg
                      border
                      border-slate-200
                      bg-slate-50
                      p-3
                    "
                  >
                    <p
                      className="
                        text-[9px]
                        font-bold
                        uppercase
                        text-slate-500
                      "
                    >
                      Observaciones
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        leading-relaxed
                        text-slate-600
                      "
                    >
                      {configuracionActual
                        .observaciones ||
                        'Sin observaciones registradas'}
                    </p>
                  </div>
                </div>
              </>
  )
}


export function TsvConfiguracionFormulario({
  origenLineaBaseTsv,
  setOrigenLineaBaseTsv,
  anioReferenciaTsv,
  setAnioReferenciaTsv,
  lineaBaseTsv,
  setLineaBaseTsv,
  metasTsv,
  setMetasTsv,
  calcularLineaBaseHistoricaTsv,
  procesando,
}) {
  return (
<div
                className="
                  mb-4
                  overflow-hidden
                  rounded-xl
                  border
                  border-blue-200
                  bg-white
                "
              >
                <div
                  className="
                    border-b
                    border-blue-200
                    bg-blue-50
                    px-4
                    py-3
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-3
                    "
                  >
                    <div>
                      <p
                        className="
                          text-[10px]
                          font-black
                          uppercase
                          text-blue-800
                        "
                      >
                        Línea base y metas TSV
                      </p>

                      <p
                        className="
                          mt-1
                          text-[9px]
                          leading-relaxed
                          text-blue-700
                        "
                      >
                        Configure una línea base y una meta
                        independiente para cada nivel de pérdida.
                        Los valores corresponden a tasas por cada
                        1.000.000 de kilómetros recorridos.
                      </p>
                    </div>

                    <Target
                      size={18}
                      className="
                        shrink-0
                        text-blue-700
                      "
                    />
                  </div>
                </div>


                <div
                  className="
                    p-4
                  "
                >
                  {/* ==========================================
                      ORIGEN DE LA LÍNEA BASE
                  ========================================== */}

                  <div
                    className="
                      grid
                      gap-3
                      md:grid-cols-[1fr_180px_auto]
                      md:items-end
                    "
                  >
                    <div>
                      <label
                        className="
                          mb-1
                          block
                          text-[9px]
                          font-bold
                          uppercase
                          text-slate-600
                        "
                      >
                        Origen de la línea base
                      </label>

                      <select
                        value={
                          origenLineaBaseTsv
                        }
                        onChange={
                          event =>
                            setOrigenLineaBaseTsv(
                              event.target.value
                            )
                        }
                        className="
                          w-full
                          rounded-lg
                          border
                          border-slate-300
                          bg-white
                          px-3
                          py-2
                          text-xs
                        "
                      >
                        <option value="AUTOMATICA">
                          Calcular desde histórico
                        </option>

                        <option value="MANUAL">
                          Registrar manualmente
                        </option>
                      </select>
                    </div>

                    <div>
                      <label
                        className="
                          mb-1
                          block
                          text-[9px]
                          font-bold
                          uppercase
                          text-slate-600
                        "
                      >
                        Año de referencia
                      </label>

                      <input
                        type="number"
                        value={
                          anioReferenciaTsv
                        }
                        readOnly={
                          origenLineaBaseTsv ===
                          'AUTOMATICA'
                        }
                        onChange={
                          event =>
                            setAnioReferenciaTsv(
                              event.target.value
                            )
                        }
                        className="
                          w-full
                          rounded-lg
                          border
                          border-slate-300
                          bg-white
                          px-3
                          py-2
                          text-xs
                          read-only:bg-slate-100
                        "
                      />
                    </div>

                    {origenLineaBaseTsv ===
                      'AUTOMATICA' && (
                      <button
                        type="button"
                        onClick={
                          calcularLineaBaseHistoricaTsv
                        }
                        disabled={
                          procesando
                        }
                        className="
                          inline-flex
                          items-center
                          justify-center
                          gap-1.5
                          rounded-lg
                          bg-blue-700
                          px-3
                          py-2
                          text-[10px]
                          font-bold
                          text-white
                          hover:bg-blue-800
                          disabled:opacity-50
                        "
                      >
                        <RefreshCw
                          size={13}
                          className={
                            procesando
                              ? 'animate-spin'
                              : ''
                          }
                        />

                        Calcular histórico
                      </button>
                    )}
                  </div>


                  {/* ==========================================
                      AVISO ORIGEN MANUAL
                  ========================================== */}

                  {origenLineaBaseTsv ===
                    'MANUAL' && (
                    <div
                      className="
                        mt-3
                        rounded-lg
                        border
                        border-amber-200
                        bg-amber-50
                        px-3
                        py-2
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
                            text-amber-700
                          "
                        />

                        <p
                          className="
                            text-[9px]
                            leading-relaxed
                            text-amber-800
                          "
                        >
                          Registre los valores obtenidos de los
                          soportes históricos del CEA e indique el
                          año utilizado como referencia.
                        </p>
                      </div>
                    </div>
                  )}


                  {/* ==========================================
                      TABLA LÍNEA BASE Y METAS
                  ========================================== */}

                  <div
                    className="
                      mt-4
                      overflow-x-auto
                      rounded-lg
                      border
                      border-slate-200
                    "
                  >
                    <table
                      className="
                        min-w-[650px]
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
                            Operador
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
                            Meta
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
                          nivel => (
                            <tr
                              key={
                                nivel.clave
                              }
                              className="
                                border-t
                                border-slate-200
                              "
                            >
                              <td
                                className="
                                  px-3
                                  py-2.5
                                  text-[10px]
                                  font-bold
                                  text-slate-700
                                "
                              >
                                {nivel.nombre}
                              </td>

                              <td
                                className="
                                  px-3
                                  py-2
                                "
                              >
                                <input
                                  type="number"
                                  step="any"
                                  value={
                                    lineaBaseTsv[
                                      nivel.clave
                                    ]
                                  }
                                  readOnly={
                                    origenLineaBaseTsv ===
                                    'AUTOMATICA'
                                  }
                                  onChange={
                                    event =>
                                      setLineaBaseTsv(
                                        anterior => ({
                                          ...anterior,

                                          [nivel.clave]:
                                            event.target.value,
                                        })
                                      )
                                  }
                                  className="
                                    w-full
                                    rounded-md
                                    border
                                    border-slate-300
                                    px-2
                                    py-1.5
                                    text-center
                                    text-xs
                                    read-only:bg-slate-100
                                  "
                                />
                              </td>

                              <td
                                className="
                                  px-3
                                  py-2
                                "
                              >
                                <select
                                  value={
                                    metasTsv[
                                      nivel.clave
                                    ]?.operador ||
                                    '<='
                                  }
                                  onChange={
                                    event =>
                                      setMetasTsv(
                                        anterior => ({
                                          ...anterior,

                                          [nivel.clave]: {
                                            ...anterior[
                                              nivel.clave
                                            ],

                                            operador:
                                              event.target.value,
                                          },
                                        })
                                      )
                                  }
                                  className="
                                    w-full
                                    rounded-md
                                    border
                                    border-slate-300
                                    bg-white
                                    px-2
                                    py-1.5
                                    text-center
                                    text-xs
                                  "
                                >
                                  <option value="<=">
                                    Menor o igual ≤
                                  </option>

                                  <option value="<">
                                    Menor &lt;
                                  </option>

                                  <option value="=">
                                    Igual =
                                  </option>

                                  <option value=">=">
                                    Mayor o igual ≥
                                  </option>

                                  <option value=">">
                                    Mayor &gt;
                                  </option>
                                </select>
                              </td>

                              <td
                                className="
                                  px-3
                                  py-2
                                "
                              >
                                <input
                                  type="number"
                                  step="any"
                                  value={
                                    metasTsv[
                                      nivel.clave
                                    ]?.valor ??
                                    ''
                                  }
                                  onChange={
                                    event =>
                                      setMetasTsv(
                                        anterior => ({
                                          ...anterior,

                                          [nivel.clave]: {
                                            ...anterior[
                                              nivel.clave
                                            ],

                                            valor:
                                              event.target.value,
                                          },
                                        })
                                      )
                                  }
                                  className="
                                    w-full
                                    rounded-md
                                    border
                                    border-slate-300
                                    px-2
                                    py-1.5
                                    text-center
                                    text-xs
                                  "
                                />
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>


                  {/* ==========================================
                      AYUDA
                  ========================================== */}

                  <div
                    className="
                      mt-3
                      rounded-lg
                      border
                      border-slate-200
                      bg-slate-50
                      px-3
                      py-2
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
                        <strong>
                          Línea base:
                        </strong>{' '}
                        valor histórico utilizado como referencia.{' '}

                        <strong>
                          Meta:
                        </strong>{' '}
                        resultado que la organización se propone
                        alcanzar. La meta no se genera automáticamente
                        a partir de la línea base.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
  )
}
