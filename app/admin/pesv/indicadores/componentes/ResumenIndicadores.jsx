// app/admin/pesv/indicadores/componentes/ResumenIndicadores.jsx

'use client'

// ============================================================
// app/admin/pesv/indicadores/componentes/ResumenIndicadores.jsx
// PESV - INDICADORES
// PESTAÑA: RESUMEN
// ============================================================

import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  Clock3,
  Gauge,
  Minus,
  Settings2,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react'


// ============================================================
// HELPERS
// app/admin/pesv/indicadores/componentes/ResumenIndicadores.jsx
// ============================================================

function numero(
  valor
) {
  const convertido =
    Number(
      valor
    )

  return Number.isFinite(
    convertido
  )
    ? convertido
    : null
}


function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function etiqueta(
  valor
) {
  return String(
    valor ||
    ''
  )
    .replaceAll(
      '_',
      ' '
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      letra =>
        letra.toUpperCase()
    )
}


function formatearNumero(
  valor,
  decimales = 2
) {
  const n =
    numero(
      valor
    )

  if (
    n === null
  ) {
    return '—'
  }

  return new Intl.NumberFormat(
    'es-CO',
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        decimales,
    }
  ).format(
    n
  )
}


function formatearResultado(
  valor,
  unidad
) {
  const n =
    numero(
      valor
    )

  if (
    n === null
  ) {
    return '—'
  }

  const unidadNormalizada =
    String(
      unidad ||
      ''
    ).toUpperCase()

  if (
    unidadNormalizada ===
    'PORCENTAJE'
  ) {
    return `${formatearNumero(
      n,
      2
    )}%`
  }

  if (
    unidadNormalizada ===
    'TASA_POR_MILLON_KM'
  ) {
    return `${formatearNumero(
      n,
      2
    )}`
  }

  return formatearNumero(
    n,
    2
  )
}


function obtenerConfiguracion(
  indicador,
  configuraciones,
  anio
) {
  return (
    configuraciones.find(
      item =>
        Number(
          item?.indicador_id
        ) ===
          Number(
            indicador?.id
          ) &&
        Number(
          item?.anio
        ) ===
          Number(
            anio
          )
    ) ||
    null
  )
}


function obtenerMedicionesIndicador(
  indicador,
  mediciones
) {
  return (
    mediciones ||
    []
  )
    .filter(
      item =>
        Number(
          item?.indicador_id
        ) ===
        Number(
          indicador?.id
        )
    )
    .sort(
      (
        a,
        b
      ) => {
        const fechaA =
          new Date(
            a?.periodo_hasta ||
            a?.fecha_medicion ||
            a?.created_at ||
            0
          ).getTime()

        const fechaB =
          new Date(
            b?.periodo_hasta ||
            b?.fecha_medicion ||
            b?.created_at ||
            0
          ).getTime()

        return fechaB -
          fechaA
      }
    )
}


function obtenerUltimaMedicion(
  indicador,
  mediciones
) {
  return (
    obtenerMedicionesIndicador(
      indicador,
      mediciones
    )[0] ||
    null
  )
}


function obtenerIconoSentido(
  sentido
) {
  const valor =
    String(
      sentido ||
      ''
    ).toUpperCase()

  if (
    valor ===
    'ASCENDENTE'
  ) {
    return TrendingUp
  }

  if (
    valor ===
    'DESCENDENTE'
  ) {
    return TrendingDown
  }

  return Minus
}


function claseCumplimiento(
  medicion
) {
  if (
    medicion?.cumple_meta ===
    true
  ) {
    return {
      contenedor:
        'border-emerald-300 bg-emerald-50',

      texto:
        'text-emerald-700',

      icono:
        CheckCircle2,

      label:
        'Cumple',
    }
  }

  if (
    medicion?.cumple_meta ===
    false
  ) {
    return {
      contenedor:
        'border-red-300 bg-red-50',

      texto:
        'text-red-700',

      icono:
        XCircle,

      label:
        'No cumple',
    }
  }

  return {
    contenedor:
      'border-slate-300 bg-slate-50',

    texto:
      'text-slate-500',

    icono:
      CircleDashed,

    label:
      'Sin evaluar',
  }
}


function claseEstado(
  estado
) {
  const valor =
    String(
      estado ||
      ''
    ).toUpperCase()

  if (
    valor ===
    'CERRADA'
  ) {
    return {
      clase:
        'border-emerald-300 bg-emerald-50 text-emerald-700',

      icono:
        BadgeCheck,
    }
  }

  if (
    valor ===
    'VALIDADA'
  ) {
    return {
      clase:
        'border-blue-300 bg-blue-50 text-blue-700',

      icono:
        ClipboardCheck,
    }
  }

  return {
    clase:
      'border-amber-300 bg-amber-50 text-amber-700',

    icono:
      Clock3,
  }
}


// ============================================================
// COMPONENTE
// app/admin/pesv/indicadores/componentes/ResumenIndicadores.jsx
// ============================================================

export default function ResumenIndicadores({
  anio,
  indicadores = [],
  configuraciones = [],
  mediciones = [],
  resumen = {},
  onIrMedicion,
}) {

  // ==========================================================
  // CONTADORES LOCALES
  // app/admin/pesv/indicadores/componentes/ResumenIndicadores.jsx
  // ==========================================================

  const totalIndicadores =
    indicadores.length

  const configurados =
    indicadores.filter(
      indicador =>
        Boolean(
          obtenerConfiguracion(
            indicador,
            configuraciones,
            anio
          )
        )
    ).length

  const medidos =
    indicadores.filter(
      indicador =>
        Boolean(
          obtenerUltimaMedicion(
            indicador,
            mediciones
          )
        )
    ).length

  const cumplen =
    indicadores.filter(
      indicador =>
        obtenerUltimaMedicion(
          indicador,
          mediciones
        )?.cumple_meta ===
        true
    ).length

  const noCumplen =
    indicadores.filter(
      indicador =>
        obtenerUltimaMedicion(
          indicador,
          mediciones
        )?.cumple_meta ===
        false
    ).length

  const pendientes =
    Math.max(
      totalIndicadores -
      medidos,
      0
    )


  // ==========================================================
  // TARJETAS DE RESUMEN
  // app/admin/pesv/indicadores/componentes/ResumenIndicadores.jsx
  // ==========================================================

  const tarjetas = [
    {
      titulo:
        'Indicadores',

      valor:
        resumen?.total_indicadores ??
        totalIndicadores,

      descripcion:
        'Aplicables al nivel Básico',

      icono:
        BarChart3,

      claseIcono:
        'text-slate-700',

      claseFondo:
        'bg-slate-100',
    },

    {
      titulo:
        'Configurados',

      valor:
        resumen?.configurados ??
        configurados,

      descripcion:
        'Con línea base / meta',

      icono:
        Settings2,

      claseIcono:
        'text-blue-700',

      claseFondo:
        'bg-blue-50',
    },

    {
      titulo:
        'Medidos',

      valor:
        resumen?.medidos ??
        medidos,

      descripcion:
        `Con medición en ${anio}`,

      icono:
        Activity,

      claseIcono:
        'text-violet-700',

      claseFondo:
        'bg-violet-50',
    },

    {
      titulo:
        'Pendientes',

      valor:
        resumen?.pendientes ??
        pendientes,

      descripcion:
        'Sin medición registrada',

      icono:
        Clock3,

      claseIcono:
        'text-amber-700',

      claseFondo:
        'bg-amber-50',
    },

    {
      titulo:
        'Cumplen',

      valor:
        resumen?.cumplen ??
        cumplen,

      descripcion:
        'Meta alcanzada',

      icono:
        CheckCircle2,

      claseIcono:
        'text-emerald-700',

      claseFondo:
        'bg-emerald-50',
    },

    {
      titulo:
        'No cumplen',

      valor:
        resumen?.no_cumplen ??
        noCumplen,

      descripcion:
        'Requieren seguimiento',

      icono:
        AlertCircle,

      claseIcono:
        'text-red-700',

      claseFondo:
        'bg-red-50',
    },
  ]


  // ==========================================================
  // RENDER
  // app/admin/pesv/indicadores/componentes/ResumenIndicadores.jsx
  // ==========================================================

  return (
    <div
      className="
        space-y-4
      "
    >

      {/* ====================================================
          ENCABEZADO DEL RESUMEN
          app/admin/pesv/indicadores/componentes/ResumenIndicadores.jsx
      ==================================================== */}

      <section
        className="
          overflow-hidden
          rounded-xl
          border
          border-slate-400
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            flex
            flex-col
            gap-3
            bg-slate-50
            px-4
            py-3
            md:flex-row
            md:items-center
            md:justify-between
          "
        >
          <div
            className="
              flex
              items-start
              gap-3
            "
          >
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-slate-300
                bg-white
                text-slate-700
                shadow-sm
              "
            >
              <Gauge
                size={
                  19
                }
              />
            </div>

            <div>
              <h2
                className="
                  text-xs
                  font-black
                  uppercase
                  tracking-wide
                  text-slate-800
                "
              >
                Resumen de indicadores
              </h2>

              <p
                className="
                  mt-1
                  text-[10px]
                  leading-relaxed
                  text-slate-500
                "
              >
                Estado general de medición y cumplimiento
                de los indicadores PESV para la vigencia {anio}.
              </p>
            </div>
          </div>

          <div
            className="
              inline-flex
              items-center
              gap-2
              self-start
              rounded-lg
              border
              border-slate-300
              bg-white
              px-3
              py-2
              text-[10px]
              font-bold
              text-slate-600
              md:self-auto
            "
          >
            <CalendarCheck
              size={
                15
              }
            />

            Vigencia {anio}
          </div>
        </div>
      </section>


      {/* ====================================================
          TARJETAS
          app/admin/pesv/indicadores/componentes/ResumenIndicadores.jsx
      ==================================================== */}

      <section
        className="
          grid
          grid-cols-2
          gap-2
          md:grid-cols-3
          xl:grid-cols-6
        "
      >
        {tarjetas.map(
          tarjeta => {
            const Icono =
              tarjeta.icono

            return (
              <div
                key={
                  tarjeta.titulo
                }
                className="
                  rounded-xl
                  border
                  border-slate-300
                  bg-white
                  p-3
                  shadow-sm
                  transition
                  hover:-translate-y-0.5
                  hover:shadow-md
                "
              >
                <div
                  className="
                    flex
                    items-start
                    justify-between
                    gap-2
                  "
                >
                  <div>
                    <p
                      className="
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-500
                      "
                    >
                      {tarjeta.titulo}
                    </p>

                    <p
                      className="
                        mt-1
                        text-2xl
                        font-black
                        text-slate-800
                      "
                    >
                      {tarjeta.valor}
                    </p>
                  </div>

                  <div
                    className={`
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      ${tarjeta.claseFondo}
                      ${tarjeta.claseIcono}
                    `}
                  >
                    <Icono
                      size={
                        17
                      }
                    />
                  </div>
                </div>

                <p
                  className="
                    mt-2
                    text-[9px]
                    leading-tight
                    text-slate-500
                  "
                >
                  {tarjeta.descripcion}
                </p>
              </div>
            )
          }
        )}
      </section>


      {/* ====================================================
          LISTADO DE INDICADORES
          app/admin/pesv/indicadores/componentes/ResumenIndicadores.jsx
      ==================================================== */}

      <section
        className="
          overflow-hidden
          rounded-xl
          border
          border-slate-400
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            border-b
            border-slate-300
            bg-slate-50
            px-4
            py-3
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <Target
              size={
                16
              }
              className="
                text-slate-600
              "
            />

            <h2
              className="
                text-xs
                font-bold
                uppercase
                text-slate-700
              "
            >
              Indicadores PESV · Nivel Básico
            </h2>
          </div>

          <span
            className="
              rounded-full
              border
              border-slate-300
              bg-white
              px-2.5
              py-1
              text-[9px]
              font-bold
              text-slate-600
            "
          >
            {indicadores.length} indicadores
          </span>
        </div>


        {/* ==================================================
            TABLA
            app/admin/pesv/indicadores/componentes/ResumenIndicadores.jsx
        ================================================== */}

        <div
          className="
            overflow-x-auto
          "
        >
          <table
            className="
              min-w-[1150px]
              w-full
              text-xs
            "
          >
            <thead
              className="
                bg-slate-800
                text-[9px]
                uppercase
                text-white
              "
            >
              <tr>
                <th
                  className="
                    px-3
                    py-2.5
                    text-center
                  "
                >
                  No.
                </th>

                <th
                  className="
                    px-3
                    py-2.5
                    text-left
                  "
                >
                  Indicador
                </th>

                <th
                  className="
                    px-3
                    py-2.5
                    text-center
                  "
                >
                  Periodicidad
                </th>

                <th
                  className="
                    px-3
                    py-2.5
                    text-center
                  "
                >
                  Sentido
                </th>

                <th
                  className="
                    px-3
                    py-2.5
                    text-center
                  "
                >
                  Meta
                </th>

                <th
                  className="
                    px-3
                    py-2.5
                    text-center
                  "
                >
                  Resultado
                </th>

                <th
                  className="
                    px-3
                    py-2.5
                    text-center
                  "
                >
                  Cumplimiento
                </th>

                <th
                  className="
                    px-3
                    py-2.5
                    text-center
                  "
                >
                  Estado
                </th>

                <th
                  className="
                    px-3
                    py-2.5
                    text-center
                  "
                >
                  Acción
                </th>
              </tr>
            </thead>

            <tbody
              className="
                divide-y
                divide-slate-300
              "
            >
              {indicadores.map(
                indicador => {
                  const configuracion =
                    obtenerConfiguracion(
                      indicador,
                      configuraciones,
                      anio
                    )

                  const ultimaMedicion =
                    obtenerUltimaMedicion(
                      indicador,
                      mediciones
                    )

                  const cumplimiento =
                    claseCumplimiento(
                      ultimaMedicion
                    )

                  const IconoCumplimiento =
                    cumplimiento.icono

                  const estado =
                    claseEstado(
                      ultimaMedicion?.estado
                    )

                  const IconoEstado =
                    estado.icono

                  const IconoSentido =
                    obtenerIconoSentido(
                      indicador?.sentido_mejora
                    )

                  const tieneMeta =
                    numero(
                      configuracion?.valor_meta
                    ) !==
                    null

                  return (
                    <tr
                      key={
                        indicador.id
                      }
                      className="
                        bg-white
                        transition
                        hover:bg-slate-50
                      "
                    >
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
                            h-7
                            min-w-7
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-slate-300
                            bg-slate-100
                            px-1.5
                            text-[10px]
                            font-black
                            text-slate-700
                          "
                        >
                          {indicador.numero_normativo ||
                            indicador.orden}
                        </span>
                      </td>


                      {/* ====================================
                          INDICADOR
                      ==================================== */}

                      <td
                        className="
                          px-3
                          py-3
                        "
                      >
                        <div
                          className="
                            flex
                            items-start
                            gap-2
                          "
                        >
                          <div
                            className="
                              mt-0.5
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              bg-slate-100
                              text-slate-700
                            "
                          >
                            <Activity
                              size={
                                16
                              }
                            />
                          </div>

                          <div>
                            <p
                              className="
                                text-[11px]
                                font-bold
                                leading-snug
                                text-slate-800
                              "
                            >
                              {indicador.nombre}
                            </p>

                            <div
                              className="
                                mt-1
                                flex
                                flex-wrap
                                items-center
                                gap-1.5
                              "
                            >
                              <span
                                className="
                                  rounded
                                  border
                                  border-slate-300
                                  bg-slate-50
                                  px-1.5
                                  py-0.5
                                  text-[8px]
                                  font-black
                                  text-slate-600
                                "
                              >
                                {indicador.codigo}
                              </span>

                              <span
                                className="
                                  text-[9px]
                                  text-slate-400
                                "
                              >
                                {etiqueta(
                                  indicador.unidad
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>


                      {/* ====================================
                          PERIODICIDAD
                      ==================================== */}

                      <td
                        className="
                          px-3
                          py-3
                          text-center
                        "
                      >
                        <div
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-slate-300
                            bg-slate-50
                            px-2
                            py-1
                            text-[9px]
                            font-semibold
                            text-slate-600
                          "
                        >
                          <CalendarCheck
                            size={
                              12
                            }
                          />

                          {etiqueta(
                            indicador.periodicidad
                          )}
                        </div>
                      </td>


                      {/* ====================================
                          SENTIDO
                      ==================================== */}

                      <td
                        className="
                          px-3
                          py-3
                          text-center
                        "
                      >
                        <div
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            text-[9px]
                            font-semibold
                            text-slate-600
                          "
                        >
                          <IconoSentido
                            size={
                              14
                            }
                          />

                          {etiqueta(
                            indicador.sentido_mejora
                          )}
                        </div>
                      </td>


                      {/* ====================================
                          META
                      ==================================== */}

                      <td
                        className="
                          px-3
                          py-3
                          text-center
                        "
                      >
                        {tieneMeta ? (
                          <div>
                            <p
                              className="
                                text-[11px]
                                font-black
                                text-slate-800
                              "
                            >
                              {configuracion.operador_meta ||
                                ''}
                              {' '}
                              {formatearResultado(
                                configuracion.valor_meta,
                                configuracion.unidad_meta ||
                                indicador.unidad
                              )}
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-[8px]
                                text-slate-400
                              "
                            >
                              Meta {anio}
                            </p>
                          </div>
                        ) : (
                          <div
                            className="
                              inline-flex
                              items-center
                              gap-1
                              text-[9px]
                              font-semibold
                              text-amber-700
                            "
                          >
                            <Settings2
                              size={
                                12
                              }
                            />

                            Sin configurar
                          </div>
                        )}
                      </td>


                      {/* ====================================
                          RESULTADO
                      ==================================== */}

                      <td
                        className="
                          px-3
                          py-3
                          text-center
                        "
                      >
                        {ultimaMedicion ? (
                          <div>
                            <p
                              className="
                                text-sm
                                font-black
                                text-slate-800
                              "
                            >
                              {formatearResultado(
                                ultimaMedicion.valor_resultado,
                                ultimaMedicion.unidad_resultado ||
                                indicador.unidad
                              )}
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-[8px]
                                text-slate-400
                              "
                            >
                              Última medición
                            </p>
                          </div>
                        ) : (
                          <div
                            className="
                              inline-flex
                              items-center
                              gap-1
                              text-[9px]
                              font-semibold
                              text-slate-400
                            "
                          >
                            <CircleDashed
                              size={
                                13
                              }
                            />

                            Sin medición
                          </div>
                        )}
                      </td>


                      {/* ====================================
                          CUMPLIMIENTO
                      ==================================== */}

                      <td
                        className="
                          px-3
                          py-3
                          text-center
                        "
                      >
                        <span
                          className={`
                            inline-flex
                            items-center
                            gap-1
                            rounded-full
                            border
                            px-2
                            py-1
                            text-[9px]
                            font-bold
                            ${cumplimiento.contenedor}
                            ${cumplimiento.texto}
                          `}
                        >
                          <IconoCumplimiento
                            size={
                              12
                            }
                          />

                          {cumplimiento.label}
                        </span>
                      </td>


                      {/* ====================================
                          ESTADO
                      ==================================== */}

                      <td
                        className="
                          px-3
                          py-3
                          text-center
                        "
                      >
                        {ultimaMedicion ? (
                          <span
                            className={`
                              inline-flex
                              items-center
                              gap-1
                              rounded-full
                              border
                              px-2
                              py-1
                              text-[9px]
                              font-bold
                              ${estado.clase}
                            `}
                          >
                            <IconoEstado
                              size={
                                12
                              }
                            />

                            {etiqueta(
                              ultimaMedicion.estado ||
                              'BORRADOR'
                            )}
                          </span>
                        ) : (
                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1
                              text-[9px]
                              font-semibold
                              text-slate-400
                            "
                          >
                            <Clock3
                              size={
                                12
                              }
                            />

                            Pendiente
                          </span>
                        )}
                      </td>


                      {/* ====================================
                          ACCIÓN
                      ==================================== */}

                      <td
                        className="
                          whitespace-nowrap
                          px-3
                          py-3
                          text-center
                        "
                      >
                        <button
                          type="button"
                          onClick={
                            () =>
                              onIrMedicion?.(
                                indicador.id
                              )
                          }
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-slate-700
                            bg-slate-800
                            px-2.5
                            py-1.5
                            text-[9px]
                            font-bold
                            text-white
                            transition
                            hover:bg-slate-700
                          "
                        >
                          {ultimaMedicion ? (
                            <>
                              <Activity
                                size={
                                  12
                                }
                              />

                              Gestionar
                            </>
                          ) : (
                            <>
                              <Gauge
                                size={
                                  12
                                }
                              />

                              Medir
                            </>
                          )}

                          <ChevronRight
                            size={
                              12
                            }
                          />
                        </button>
                      </td>
                    </tr>
                  )
                }
              )}
            </tbody>
          </table>
        </div>
      </section>


      {/* ====================================================
          GUÍA DE LECTURA
          app/admin/pesv/indicadores/componentes/ResumenIndicadores.jsx
      ==================================================== */}

      <section
        className="
          grid
          gap-3
          md:grid-cols-3
        "
      >
        <div
          className="
            rounded-xl
            border
            border-emerald-200
            bg-emerald-50
            p-3
          "
        >
          <div
            className="
              flex
              items-start
              gap-2
            "
          >
            <CheckCircle2
              size={
                17
              }
              className="
                mt-0.5
                shrink-0
                text-emerald-700
              "
            />

            <div>
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  text-emerald-800
                "
              >
                Cumple
              </p>

              <p
                className="
                  mt-1
                  text-[9px]
                  leading-relaxed
                  text-emerald-700
                "
              >
                El resultado satisface la meta definida
                para el indicador y la vigencia.
              </p>
            </div>
          </div>
        </div>

        <div
          className="
            rounded-xl
            border
            border-red-200
            bg-red-50
            p-3
          "
        >
          <div
            className="
              flex
              items-start
              gap-2
            "
          >
            <XCircle
              size={
                17
              }
              className="
                mt-0.5
                shrink-0
                text-red-700
              "
            />

            <div>
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  text-red-800
                "
              >
                No cumple
              </p>

              <p
                className="
                  mt-1
                  text-[9px]
                  leading-relaxed
                  text-red-700
                "
              >
                El resultado requiere análisis y seguimiento
                frente a la meta establecida.
              </p>
            </div>
          </div>
        </div>

        <div
          className="
            rounded-xl
            border
            border-slate-300
            bg-slate-50
            p-3
          "
        >
          <div
            className="
              flex
              items-start
              gap-2
            "
          >
            <ArrowRight
              size={
                17
              }
              className="
                mt-0.5
                shrink-0
                text-slate-600
              "
            />

            <div>
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  text-slate-700
                "
              >
                Siguiente paso
              </p>

              <p
                className="
                  mt-1
                  text-[9px]
                  leading-relaxed
                  text-slate-600
                "
              >
                Utilice el botón Medir o Gestionar para abrir
                directamente el indicador seleccionado.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}