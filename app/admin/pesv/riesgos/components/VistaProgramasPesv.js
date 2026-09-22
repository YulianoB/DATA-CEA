// app/admin/pesv/riesgos/components/VistaProgramasPesv.js

'use client'

import {
  useMemo,
  useState,
} from 'react'


// ============================================================
// HELPERS
// app/admin/pesv/riesgos/components/VistaProgramasPesv.js
// ============================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function normalizar(
  valor
) {
  return texto(
    valor
  ).toUpperCase()
}


function etiqueta(
  valor
) {
  return texto(
    valor
  ).replaceAll(
    '_',
    ' '
  )
}


function calcularNr(
  riesgo
) {
  const guardado =
    Number(
      riesgo
        ?.valor_nivel_riesgo
    )

  if (
    Number.isFinite(
      guardado
    ) &&
    guardado > 0
  ) {
    return guardado
  }

  const exposicion =
    Number(
      riesgo?.exposicion
    )

  const probabilidad =
    Number(
      riesgo?.probabilidad
    )

  if (
    ![1, 2, 3].includes(
      exposicion
    ) ||
    ![1, 2, 3].includes(
      probabilidad
    )
  ) {
    return null
  }

  return (
    exposicion *
    probabilidad
  )
}


function calcularNivel(
  riesgo
) {
  const guardado =
    normalizar(
      riesgo
        ?.nivel_riesgo
    )

  if (
    [
      'BAJO',
      'MODERADO',
      'CRITICO',
    ].includes(
      guardado
    )
  ) {
    return guardado
  }

  const nr =
    calcularNr(
      riesgo
    )

  if (
    nr === null
  ) {
    return ''
  }

  if (
    nr >= 6
  ) {
    return 'CRITICO'
  }

  if (
    nr >= 3
  ) {
    return 'MODERADO'
  }

  return 'BAJO'
}


function porcentaje(
  cantidad,
  total
) {
  if (
    !total ||
    Number(total) <= 0
  ) {
    return '0%'
  }

  const resultado =
    (
      Number(cantidad) /
      Number(total)
    ) *
    100

  return `${resultado.toFixed(1)}%`
}


function nombreContexto(
  valor
) {
  const contexto =
    normalizar(
      valor
    )

  if (
    contexto ===
    'FORMACION_PRACTICA'
  ) {
    return 'Formación práctica'
  }

  if (
    contexto ===
    'DESPLAZAMIENTO_EN_MISION'
  ) {
    return 'Desplazamiento en misión'
  }

  if (
    contexto ===
    'IN_ITINERE'
  ) {
    return 'In itinere'
  }

  if (
    contexto ===
    'ENTORNO_SEDE'
  ) {
    return 'Entorno de la sede'
  }

  return (
    etiqueta(
      contexto
    ) ||
    '-'
  )
}


function nombreSeveridad(
  valor
) {
  const numero =
    Number(
      valor
    )

  if (
    numero === 1
  ) {
    return 'Leve'
  }

  if (
    numero === 2
  ) {
    return 'Grave'
  }

  if (
    numero === 3
  ) {
    return 'Muy grave'
  }

  return (
    texto(
      valor
    ) ||
    '-'
  )
}


function ordenPrioridad(
  valor
) {
  const prioridad =
    normalizar(
      valor
    )

  const orden = {
    PRIORITARIA: 1,
    PRIORITARIA_PREVENTIVA: 2,
    PROGRAMADA: 3,
    SEGUIMIENTO: 4,
    MANTENER_CONTROLES: 5,
  }

  return (
    orden[
      prioridad
    ] ||
    99
  )
}


// ============================================================
// CLASES VISUALES
// app/admin/pesv/riesgos/components/VistaProgramasPesv.js
// ============================================================

function claseNivel(
  valor
) {
  const nivel =
    normalizar(
      valor
    )

  if (
    nivel ===
    'CRITICO'
  ) {
    return `
      bg-red-100
      border-red-300
      text-red-800
    `
  }

  if (
    nivel ===
    'MODERADO'
  ) {
    return `
      bg-amber-100
      border-amber-300
      text-amber-800
    `
  }

  if (
    nivel ===
    'BAJO'
  ) {
    return `
      bg-green-100
      border-green-300
      text-green-800
    `
  }

  return `
    bg-gray-100
    border-gray-300
    text-gray-700
  `
}


function clasePrioridad(
  valor
) {
  const prioridad =
    normalizar(
      valor
    )

  if (
    prioridad ===
    'PRIORITARIA'
  ) {
    return `
      bg-red-100
      border-red-300
      text-red-800
    `
  }

  if (
    prioridad ===
    'PRIORITARIA_PREVENTIVA'
  ) {
    return `
      bg-orange-100
      border-orange-300
      text-orange-800
    `
  }

  if (
    prioridad ===
    'PROGRAMADA'
  ) {
    return `
      bg-amber-100
      border-amber-300
      text-amber-800
    `
  }

  if (
    prioridad ===
    'SEGUIMIENTO'
  ) {
    return `
      bg-blue-100
      border-blue-300
      text-blue-800
    `
  }

  if (
    prioridad ===
    'MANTENER_CONTROLES'
  ) {
    return `
      bg-green-100
      border-green-300
      text-green-800
    `
  }

  return `
    bg-gray-100
    border-gray-300
    text-gray-700
  `
}


// ============================================================
// COMPONENTE TARJETA RESUMEN
// app/admin/pesv/riesgos/components/VistaProgramasPesv.js
// ============================================================

function TarjetaResumen({
  titulo,
  valor,
  subtitulo,
  clase = '',
}) {
  return (
    <div
      className={`
        border
        border-gray-200
        rounded-lg
        bg-white
        p-3
        ${clase}
      `}
    >
      <div
        className="
          text-[9px]
          font-black
          uppercase
          text-gray-500
        "
      >
        {titulo}
      </div>

      <div
        className="
          mt-1
          text-xl
          font-black
          text-gray-800
        "
      >
        {valor}
      </div>

      {subtitulo && (
        <div
          className="
            mt-1
            text-[9px]
            text-gray-500
          "
        >
          {subtitulo}
        </div>
      )}
    </div>
  )
}


// ============================================================
// VISTA PROGRAMAS PESV
// app/admin/pesv/riesgos/components/VistaProgramasPesv.js
// ============================================================

export default function VistaProgramasPesv({
  anio,
  riesgos = [],
  programas = [],
}) {
  const [
    busqueda,
    setBusqueda,
  ] =
    useState('')

  const [
    programaSeleccionadoId,
    setProgramaSeleccionadoId,
  ] =
    useState(null)


  // ==========================================================
  // RIESGOS DISPONIBLES
  // app/admin/pesv/riesgos/components/VistaProgramasPesv.js
  // ==========================================================

  const listaRiesgos =
    useMemo(
      () => {
        return Array.isArray(
          riesgos
        )
          ? riesgos
          : []
      },
      [
        riesgos,
      ]
    )


  // ==========================================================
  // PROGRAMAS DISPONIBLES
  // app/admin/pesv/riesgos/components/VistaProgramasPesv.js
  //
  // Si page.jsx envía "programas", se utilizan esos registros.
  // Si no los envía, se reconstruye la lista desde riesgo.programas.
  // ==========================================================

  const listaProgramas =
    useMemo(
      () => {
        const mapa =
          new Map()


        if (
          Array.isArray(
            programas
          )
        ) {
          programas.forEach(
            programa => {
              const id =
                String(
                  programa?.id ??
                  ''
                )

              if (
                id
              ) {
                mapa.set(
                  id,
                  programa
                )
              }
            }
          )
        }


        listaRiesgos.forEach(
          riesgo => {
            const relacionados =
              Array.isArray(
                riesgo?.programas
              )
                ? riesgo.programas
                : []

            relacionados.forEach(
              programa => {
                const id =
                  String(
                    programa?.id ??
                    ''
                  )

                if (
                  id &&
                  !mapa.has(
                    id
                  )
                ) {
                  mapa.set(
                    id,
                    programa
                  )
                }
              }
            )
          }
        )


        return Array.from(
          mapa.values()
        ).sort(
          (
            a,
            b
          ) => {
            const ordenA =
              Number(
                a?.orden ??
                999
              )

            const ordenB =
              Number(
                b?.orden ??
                999
              )

            if (
              ordenA !==
              ordenB
            ) {
              return (
                ordenA -
                ordenB
              )
            }

            return texto(
              a?.nombre
            ).localeCompare(
              texto(
                b?.nombre
              )
            )
          }
        )
      },
      [
        programas,
        listaRiesgos,
      ]
    )


  // ==========================================================
  // PROGRAMAS ENRIQUECIDOS CON SUS RIESGOS
  // app/admin/pesv/riesgos/components/VistaProgramasPesv.js
  // ==========================================================

  const programasConRiesgos =
    useMemo(
      () => {
        return listaProgramas.map(
          programa => {
            const riesgosPrograma =
              listaRiesgos.filter(
                riesgo => {
                  const relacionados =
                    Array.isArray(
                      riesgo?.programas
                    )
                      ? riesgo.programas
                      : []

                  return relacionados.some(
                    relacionado =>
                      String(
                        relacionado?.id
                      ) ===
                      String(
                        programa.id
                      )
                  )
                }
              )


            const bajos =
              riesgosPrograma.filter(
                riesgo =>
                  calcularNivel(
                    riesgo
                  ) ===
                  'BAJO'
              ).length


            const moderados =
              riesgosPrograma.filter(
                riesgo =>
                  calcularNivel(
                    riesgo
                  ) ===
                  'MODERADO'
              ).length


            const criticos =
              riesgosPrograma.filter(
                riesgo =>
                  calcularNivel(
                    riesgo
                  ) ===
                  'CRITICO'
              ).length


            const prioritarios =
              riesgosPrograma.filter(
                riesgo =>
                  normalizar(
                    riesgo
                      ?.prioridad_intervencion
                  ) ===
                    'PRIORITARIA' ||
                  normalizar(
                    riesgo
                      ?.prioridad_intervencion
                  ) ===
                    'PRIORITARIA_PREVENTIVA'
              ).length


            return {
              ...programa,

              riesgos:
                riesgosPrograma,

              total:
                riesgosPrograma.length,

              bajos,

              moderados,

              criticos,

              prioritarios,
            }
          }
        )
      },
      [
        listaProgramas,
        listaRiesgos,
      ]
    )


  // ==========================================================
  // RESUMEN GENERAL
  // app/admin/pesv/riesgos/components/VistaProgramasPesv.js
  // ==========================================================

  const resumen =
    useMemo(
      () => {
        const relacionados =
          new Set()


        listaRiesgos.forEach(
          riesgo => {
            const programasRiesgo =
              Array.isArray(
                riesgo?.programas
              )
                ? riesgo.programas
                : []

            if (
              programasRiesgo.length >
              0
            ) {
              relacionados.add(
                String(
                  riesgo.id
                )
              )
            }
          }
        )


        const sinPrograma =
          listaRiesgos.filter(
            riesgo => {
              const relacionados =
                Array.isArray(
                  riesgo?.programas
                )
                  ? riesgo.programas
                  : []

              return (
                relacionados.length ===
                0
              )
            }
          ).length


        const programasConRiesgo =
          programasConRiesgos.filter(
            programa =>
              programa.total >
              0
          ).length


        return {
          programas:
            listaProgramas.length,

          programasConRiesgo,

          riesgos:
            listaRiesgos.length,

          riesgosRelacionados:
            relacionados.size,

          riesgosSinPrograma:
            sinPrograma,
        }
      },
      [
        listaProgramas,
        listaRiesgos,
        programasConRiesgos,
      ]
    )


  // ==========================================================
  // FILTRO DE PROGRAMAS
  // app/admin/pesv/riesgos/components/VistaProgramasPesv.js
  // ==========================================================

  const programasFiltrados =
    useMemo(
      () => {
        const consulta =
          texto(
            busqueda
          )
            .toLowerCase()


        if (
          !consulta
        ) {
          return programasConRiesgos
        }


        return programasConRiesgos.filter(
          programa => {
            const riesgosTexto =
              programa.riesgos
                .map(
                  riesgo =>
                    [
                      riesgo?.codigo,
                      riesgo?.proceso,
                      riesgo?.actividad,
                      riesgo?.factor_riesgo,
                      riesgo?.situacion_riesgo,
                      riesgo?.descripcion_riesgo,
                      riesgo?.evento_peligroso,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' '
                      )
                )
                .join(
                  ' '
                )


            const contenido =
              [
                programa?.codigo,
                programa?.nombre,
                programa?.descripcion,
                riesgosTexto,
              ]
                .map(
                  valor =>
                    texto(
                      valor
                    )
                      .toLowerCase()
                )
                .join(
                  ' '
                )


            return contenido.includes(
              consulta
            )
          }
        )
      },
      [
        busqueda,
        programasConRiesgos,
      ]
    )


  // ==========================================================
  // PROGRAMA SELECCIONADO
  // app/admin/pesv/riesgos/components/VistaProgramasPesv.js
  // ==========================================================

  const programaSeleccionado =
    useMemo(
      () => {
        if (
          programaSeleccionadoId ===
          null
        ) {
          return null
        }


        return (
          programasConRiesgos.find(
            programa =>
              String(
                programa.id
              ) ===
              String(
                programaSeleccionadoId
              )
          ) ||
          null
        )
      },
      [
        programaSeleccionadoId,
        programasConRiesgos,
      ]
    )


  // ==========================================================
  // RIESGOS PRIORIZADOS DEL PROGRAMA SELECCIONADO
  // app/admin/pesv/riesgos/components/VistaProgramasPesv.js
  // ==========================================================

  const riesgosProgramaOrdenados =
    useMemo(
      () => {
        if (
          !programaSeleccionado
        ) {
          return []
        }


        return [
          ...programaSeleccionado
            .riesgos,
        ].sort(
          (
            a,
            b
          ) => {
            const prioridadA =
              ordenPrioridad(
                a
                  ?.prioridad_intervencion
              )

            const prioridadB =
              ordenPrioridad(
                b
                  ?.prioridad_intervencion
              )


            if (
              prioridadA !==
              prioridadB
            ) {
              return (
                prioridadA -
                prioridadB
              )
            }


            return (
              Number(
                calcularNr(
                  b
                ) ||
                0
              ) -
              Number(
                calcularNr(
                  a
                ) ||
                0
              )
            )
          }
        )
      },
      [
        programaSeleccionado,
      ]
    )


  // ==========================================================
  // RENDER
  // app/admin/pesv/riesgos/components/VistaProgramasPesv.js
  // ==========================================================

  return (
    <div
      className="
        space-y-4
      "
    >
      {/* ====================================================
          ENCABEZADO
          app/admin/pesv/riesgos/components/VistaProgramasPesv.js
      ==================================================== */}

      <div
        className="
          border
          border-gray-300
          rounded-xl
          overflow-hidden
          bg-white
        "
      >
        <div
          className="
            bg-slate-800
            text-white
            px-4
            py-3
            flex
            flex-col
            md:flex-row
            md:items-center
            md:justify-between
            gap-2
          "
        >
          <div>
            <div
              className="
                text-sm
                font-black
                uppercase
              "
            >
              Programas PESV y Riesgos Asociados
            </div>

            <div
              className="
                mt-1
                text-[10px]
                text-slate-300
              "
            >
              Vigencia {anio} · Relación entre los programas de gestión
              y los riesgos viales identificados
            </div>
          </div>

          <div
            className="
              text-[10px]
              text-slate-300
            "
          >
            Programas registrados:{' '}

            <strong
              className="
                text-white
              "
            >
              {resumen.programas}
            </strong>
          </div>
        </div>
      </div>


      {/* ====================================================
          INFORMACIÓN GENERAL
          app/admin/pesv/riesgos/components/VistaProgramasPesv.js
      ==================================================== */}

      <div
        className="
          border
          border-blue-200
          rounded-xl
          bg-blue-50
          p-4
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
          Relación entre riesgos y programas
        </div>

        <div
          className="
            mt-2
            text-[10px]
            leading-relaxed
            text-blue-900
          "
        >
          Esta vista permite identificar qué riesgos se encuentran
          asociados a cada programa de gestión del PESV. Un mismo
          riesgo puede estar relacionado con uno o varios programas,
          de acuerdo con la naturaleza del escenario identificado y
          las medidas de prevención o intervención requeridas.
        </div>
      </div>


      {/* ====================================================
          RESUMEN GENERAL
          app/admin/pesv/riesgos/components/VistaProgramasPesv.js
      ==================================================== */}

      <div
        className="
          grid
          grid-cols-2
          md:grid-cols-5
          gap-3
        "
      >
        <TarjetaResumen
          titulo="Programas PESV"
          valor={
            resumen.programas
          }
        />

        <TarjetaResumen
          titulo="Con riesgos asociados"
          valor={
            resumen.programasConRiesgo
          }
          clase="
            border-blue-300
            bg-blue-50
          "
        />

        <TarjetaResumen
          titulo="Riesgos identificados"
          valor={
            resumen.riesgos
          }
        />

        <TarjetaResumen
          titulo="Riesgos relacionados"
          valor={
            resumen.riesgosRelacionados
          }
          clase="
            border-green-300
            bg-green-50
          "
          subtitulo={
            porcentaje(
              resumen.riesgosRelacionados,
              resumen.riesgos
            )
          }
        />

        <TarjetaResumen
          titulo="Sin programa"
          valor={
            resumen.riesgosSinPrograma
          }
          clase={
            resumen.riesgosSinPrograma >
            0
              ? `
                border-amber-300
                bg-amber-50
              `
              : `
                border-green-300
                bg-green-50
              `
          }
        />
      </div>


      {/* ====================================================
          BUSCADOR
          app/admin/pesv/riesgos/components/VistaProgramasPesv.js
      ==================================================== */}

      <div
        className="
          border
          border-gray-300
          rounded-xl
          bg-white
          p-3
        "
      >
        <label
          className="
            block
            mb-1
            text-[9px]
            font-black
            uppercase
            text-gray-500
          "
        >
          Buscar programa o riesgo asociado
        </label>

        <div
          className="
            relative
          "
        >
          <i
            className="
              fas
              fa-search
              absolute
              left-3
              top-2.5
              text-xs
              text-gray-400
            "
          ></i>

          <input
            type="text"
            value={
              busqueda
            }
            onChange={
              event =>
                setBusqueda(
                  event.target.value
                )
            }
            placeholder="Programa, código, riesgo, proceso, actividad, situación..."
            className="
              w-full
              border
              border-gray-300
              rounded
              pl-8
              pr-3
              py-2
              text-xs
              bg-white
            "
          />
        </div>
      </div>


      {/* ====================================================
          PROGRAMAS PESV
          app/admin/pesv/riesgos/components/VistaProgramasPesv.js
      ==================================================== */}

      <div
        className="
          border
          border-gray-300
          rounded-xl
          overflow-hidden
          bg-white
        "
      >
        <div
          className="
            bg-slate-800
            text-white
            px-4
            py-2
            flex
            items-center
            justify-between
            gap-2
          "
        >
          <div
            className="
              text-xs
              font-black
              uppercase
            "
          >
            Programas de Gestión PESV
          </div>

          <div
            className="
              text-[9px]
              text-slate-300
            "
          >
            {
              programasFiltrados
                .length
            } programa(s)
          </div>
        </div>


        {programasFiltrados.length ===
        0 ? (
          <div
            className="
              py-12
              px-4
              text-center
              text-xs
              text-gray-500
            "
          >
            <i
              className="
                fas
                fa-folder-open
                block
                mb-2
                text-2xl
                text-gray-300
              "
            ></i>

            No existen programas que coincidan con la búsqueda.
          </div>
        ) : (
          <div
            className="
              p-3
              grid
              grid-cols-1
              xl:grid-cols-2
              gap-3
            "
          >
            {programasFiltrados.map(
              programa => (
                <div
                  key={
                    programa.id
                  }
                  className="
                    border
                    border-gray-300
                    rounded-xl
                    overflow-hidden
                    bg-white
                  "
                >
                  <div
                    className="
                      bg-gray-100
                      border-b
                      border-gray-300
                      px-3
                      py-3
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        md:flex-row
                        md:items-start
                        md:justify-between
                        gap-2
                      "
                    >
                      <div
                        className="
                          min-w-0
                        "
                      >
                        <div
                          className="
                            text-[10px]
                            font-black
                            uppercase
                            text-blue-700
                          "
                        >
                          {texto(
                            programa.codigo
                          ) ||
                            'Programa PESV'}
                        </div>

                        <div
                          className="
                            mt-1
                            text-xs
                            font-black
                            text-gray-800
                          "
                        >
                          {texto(
                            programa.nombre
                          ) ||
                            'Programa sin nombre'}
                        </div>
                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          setProgramaSeleccionadoId(
                            programa.id
                          )
                        }
                        className="
                          shrink-0
                          bg-blue-700
                          hover:bg-blue-800
                          text-white
                          rounded
                          px-3
                          py-1.5
                          text-[9px]
                          font-black
                        "
                      >
                        <i
                          className="
                            fas
                            fa-eye
                            mr-1
                          "
                        ></i>

                        Ver riesgos
                      </button>
                    </div>


                    {texto(
                      programa.descripcion
                    ) && (
                      <div
                        className="
                          mt-2
                          text-[10px]
                          leading-relaxed
                          text-gray-600
                        "
                      >
                        {
                          programa.descripcion
                        }
                      </div>
                    )}
                  </div>


                  <div
                    className="
                      p-3
                    "
                  >
                    <div
                      className="
                        grid
                        grid-cols-2
                        md:grid-cols-5
                        gap-2
                      "
                    >
                      <div
                        className="
                          border
                          border-gray-200
                          rounded
                          bg-gray-50
                          p-2
                          text-center
                        "
                      >
                        <div
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            text-gray-500
                          "
                        >
                          Total
                        </div>

                        <div
                          className="
                            mt-1
                            text-lg
                            font-black
                            text-gray-800
                          "
                        >
                          {programa.total}
                        </div>
                      </div>


                      <div
                        className="
                          border
                          border-green-200
                          rounded
                          bg-green-50
                          p-2
                          text-center
                        "
                      >
                        <div
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            text-green-700
                          "
                        >
                          Bajos
                        </div>

                        <div
                          className="
                            mt-1
                            text-lg
                            font-black
                            text-green-800
                          "
                        >
                          {programa.bajos}
                        </div>
                      </div>


                      <div
                        className="
                          border
                          border-amber-200
                          rounded
                          bg-amber-50
                          p-2
                          text-center
                        "
                      >
                        <div
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            text-amber-700
                          "
                        >
                          Moderados
                        </div>

                        <div
                          className="
                            mt-1
                            text-lg
                            font-black
                            text-amber-800
                          "
                        >
                          {programa.moderados}
                        </div>
                      </div>


                      <div
                        className="
                          border
                          border-red-200
                          rounded
                          bg-red-50
                          p-2
                          text-center
                        "
                      >
                        <div
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            text-red-700
                          "
                        >
                          Críticos
                        </div>

                        <div
                          className="
                            mt-1
                            text-lg
                            font-black
                            text-red-800
                          "
                        >
                          {programa.criticos}
                        </div>
                      </div>


                      <div
                        className="
                          border
                          border-orange-200
                          rounded
                          bg-orange-50
                          p-2
                          text-center
                        "
                      >
                        <div
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            text-orange-700
                          "
                        >
                          Prioritarios
                        </div>

                        <div
                          className="
                            mt-1
                            text-lg
                            font-black
                            text-orange-800
                          "
                        >
                          {
                            programa.prioritarios
                          }
                        </div>
                      </div>
                    </div>


                    {programa.total ===
                    0 ? (
                      <div
                        className="
                          mt-3
                          border
                          border-gray-200
                          rounded
                          bg-gray-50
                          p-3
                          text-center
                          text-[10px]
                          text-gray-500
                        "
                      >
                        No existen riesgos asociados a este programa
                        en la vigencia seleccionada.
                      </div>
                    ) : (
                      <div
                        className="
                          mt-3
                          text-[9px]
                          text-gray-500
                        "
                      >
                        Este programa tiene{' '}

                        <strong
                          className="
                            text-gray-800
                          "
                        >
                          {programa.total}
                        </strong>

                        {' '}riesgo(s) asociado(s). Use{' '}

                        <strong>
                          Ver riesgos
                        </strong>

                        {' '}para consultar el detalle.
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>


      {/* ====================================================
          RIESGOS SIN PROGRAMA ASOCIADO
          app/admin/pesv/riesgos/components/VistaProgramasPesv.js
      ==================================================== */}

      {resumen.riesgosSinPrograma >
        0 && (
        <div
          className="
            border
            border-amber-300
            rounded-xl
            overflow-hidden
            bg-white
          "
        >
          <div
            className="
              bg-amber-100
              border-b
              border-amber-300
              px-4
              py-2
            "
          >
            <div
              className="
                text-xs
                font-black
                uppercase
                text-amber-900
              "
            >
              Riesgos sin programa PESV asociado
            </div>
          </div>


          <div
            className="
              p-3
              text-[10px]
              leading-relaxed
              text-amber-900
            "
          >
            Existen{' '}

            <strong>
              {
                resumen.riesgosSinPrograma
              }
            </strong>

            {' '}riesgo(s) que actualmente no tienen relación con
            ningún programa PESV. Esta situación puede revisarse
            desde la pestaña Matriz, donde se administran las
            asociaciones entre riesgos y programas.
          </div>
        </div>
      )}


      {/* ====================================================
          DETALLE DEL PROGRAMA SELECCIONADO
          app/admin/pesv/riesgos/components/VistaProgramasPesv.js
      ==================================================== */}

      {programaSeleccionado && (
        <div
          className="
            border
            border-blue-600
            rounded-xl
            overflow-hidden
            bg-white
          "
        >
          <div
            className="
              bg-blue-900
              text-white
              px-4
              py-3
              flex
              flex-col
              md:flex-row
              md:items-start
              md:justify-between
              gap-2
            "
          >
            <div>
              <div
                className="
                  text-[10px]
                  font-black
                  uppercase
                  text-blue-200
                "
              >
                {texto(
                  programaSeleccionado
                    .codigo
                ) ||
                  'Programa PESV'}
              </div>

              <div
                className="
                  mt-1
                  text-sm
                  font-black
                "
              >
                {texto(
                  programaSeleccionado
                    .nombre
                ) ||
                  'Programa sin nombre'}
              </div>

              {texto(
                programaSeleccionado
                  .descripcion
              ) && (
                <div
                  className="
                    mt-1
                    max-w-4xl
                    text-[10px]
                    leading-relaxed
                    text-blue-100
                  "
                >
                  {
                    programaSeleccionado
                      .descripcion
                  }
                </div>
              )}
            </div>


            <button
              type="button"
              onClick={() =>
                setProgramaSeleccionadoId(
                  null
                )
              }
              className="
                shrink-0
                border
                border-white
                rounded
                px-3
                py-1.5
                text-[10px]
                hover:bg-white
                hover:text-blue-900
              "
            >
              <i
                className="
                  fas
                  fa-times
                  mr-1
                "
              ></i>

              Cerrar
            </button>
          </div>


          {/* ==============================================
              RESUMEN DEL PROGRAMA
          ============================================== */}

          <div
            className="
              p-3
              grid
              grid-cols-2
              md:grid-cols-5
              gap-3
            "
          >
            <TarjetaResumen
              titulo="Total riesgos"
              valor={
                programaSeleccionado
                  .total
              }
            />

            <TarjetaResumen
              titulo="Bajos"
              valor={
                programaSeleccionado
                  .bajos
              }
              clase="
                border-green-300
                bg-green-50
              "
            />

            <TarjetaResumen
              titulo="Moderados"
              valor={
                programaSeleccionado
                  .moderados
              }
              clase="
                border-amber-300
                bg-amber-50
              "
            />

            <TarjetaResumen
              titulo="Críticos"
              valor={
                programaSeleccionado
                  .criticos
              }
              clase="
                border-red-300
                bg-red-50
              "
            />

            <TarjetaResumen
              titulo="Prioritarios"
              valor={
                programaSeleccionado
                  .prioritarios
              }
              clase="
                border-orange-300
                bg-orange-50
              "
            />
          </div>


          {/* ==============================================
              TABLA DE RIESGOS ASOCIADOS
          ============================================== */}

          <div
            className="
              px-3
              pb-3
            "
          >
            <div
              className="
                border
                border-gray-300
                rounded-lg
                overflow-hidden
              "
            >
              <div
                className="
                  bg-gray-100
                  border-b
                  border-gray-300
                  px-3
                  py-2
                  flex
                  justify-between
                  items-center
                  gap-2
                "
              >
                <div
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    text-gray-700
                  "
                >
                  Riesgos asociados al programa
                </div>

                <div
                  className="
                    text-[9px]
                    text-gray-500
                  "
                >
                  {
                    riesgosProgramaOrdenados
                      .length
                  } registro(s)
                </div>
              </div>


              {riesgosProgramaOrdenados.length ===
              0 ? (
                <div
                  className="
                    p-8
                    text-center
                    text-xs
                    text-gray-500
                  "
                >
                  Este programa no tiene riesgos asociados en la
                  vigencia seleccionada.
                </div>
              ) : (
                <div
                  className="
                    overflow-x-auto
                  "
                >
                  <table
                    className="
                      w-full
                      min-w-[1200px]
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
                            px-2
                            py-2
                            text-center
                          "
                        >
                          Código
                        </th>

                        <th
                          className="
                            border
                            border-gray-300
                            px-2
                            py-2
                            text-left
                          "
                        >
                          Proceso / Actividad
                        </th>

                        <th
                          className="
                            border
                            border-gray-300
                            px-2
                            py-2
                            text-left
                          "
                        >
                          Contexto
                        </th>

                        <th
                          className="
                            border
                            border-gray-300
                            px-2
                            py-2
                            text-left
                          "
                        >
                          Situación de riesgo
                        </th>

                        <th
                          className="
                            border
                            border-gray-300
                            px-2
                            py-2
                            text-center
                          "
                        >
                          E
                        </th>

                        <th
                          className="
                            border
                            border-gray-300
                            px-2
                            py-2
                            text-center
                          "
                        >
                          P
                        </th>

                        <th
                          className="
                            border
                            border-gray-300
                            px-2
                            py-2
                            text-center
                          "
                        >
                          NR
                        </th>

                        <th
                          className="
                            border
                            border-gray-300
                            px-2
                            py-2
                            text-center
                          "
                        >
                          Nivel
                        </th>

                        <th
                          className="
                            border
                            border-gray-300
                            px-2
                            py-2
                            text-center
                          "
                        >
                          Severidad
                        </th>

                        <th
                          className="
                            border
                            border-gray-300
                            px-2
                            py-2
                            text-center
                          "
                        >
                          Prioridad
                        </th>
                      </tr>
                    </thead>


                    <tbody>
                      {riesgosProgramaOrdenados.map(
                        riesgo => {
                          const nivel =
                            calcularNivel(
                              riesgo
                            )

                          const nr =
                            calcularNr(
                              riesgo
                            )

                          return (
                            <tr
                              key={
                                riesgo.id
                              }
                              className="
                                hover:bg-blue-50/40
                              "
                            >
                              <td
                                className="
                                  border
                                  border-gray-300
                                  px-2
                                  py-2
                                  text-center
                                  align-top
                                  font-black
                                "
                              >
                                {texto(
                                  riesgo.codigo
                                ) ||
                                  `R-${riesgo.id}`}
                              </td>


                              <td
                                className="
                                  border
                                  border-gray-300
                                  px-2
                                  py-2
                                  align-top
                                "
                              >
                                <div
                                  className="
                                    font-bold
                                    text-gray-800
                                  "
                                >
                                  {texto(
                                    riesgo.proceso
                                  ) ||
                                    '-'}
                                </div>

                                <div
                                  className="
                                    mt-1
                                    text-gray-600
                                  "
                                >
                                  {texto(
                                    riesgo.actividad
                                  ) ||
                                    '-'}
                                </div>
                              </td>


                              <td
                                className="
                                  border
                                  border-gray-300
                                  px-2
                                  py-2
                                  align-top
                                  text-gray-700
                                "
                              >
                                {nombreContexto(
                                  riesgo
                                    .contexto_exposicion
                                )}
                              </td>


                              <td
                                className="
                                  border
                                  border-gray-300
                                  px-2
                                  py-2
                                  align-top
                                  text-gray-700
                                "
                              >
                                {texto(
                                  riesgo
                                    .situacion_riesgo ||
                                  riesgo
                                    .descripcion_riesgo
                                ) ||
                                  '-'}
                              </td>


                              <td
                                className="
                                  border
                                  border-gray-300
                                  px-2
                                  py-2
                                  text-center
                                  align-top
                                  font-black
                                "
                              >
                                {riesgo.exposicion ||
                                  '-'}
                              </td>


                              <td
                                className="
                                  border
                                  border-gray-300
                                  px-2
                                  py-2
                                  text-center
                                  align-top
                                  font-black
                                "
                              >
                                {riesgo.probabilidad ||
                                  '-'}
                              </td>


                              <td
                                className="
                                  border
                                  border-gray-300
                                  px-2
                                  py-2
                                  text-center
                                  align-top
                                  font-black
                                "
                              >
                                {nr ??
                                  '-'}
                              </td>


                              <td
                                className="
                                  border
                                  border-gray-300
                                  px-2
                                  py-2
                                  text-center
                                  align-top
                                "
                              >
                                <span
                                  className={`
                                    inline-flex
                                    border
                                    rounded
                                    px-2
                                    py-1
                                    text-[9px]
                                    font-black
                                    ${claseNivel(
                                      nivel
                                    )}
                                  `}
                                >
                                  {nivel ||
                                    '-'}
                                </span>
                              </td>


                              <td
                                className="
                                  border
                                  border-gray-300
                                  px-2
                                  py-2
                                  text-center
                                  align-top
                                "
                              >
                                <div
                                  className="
                                    font-black
                                  "
                                >
                                  {riesgo.severidad ||
                                    '-'}
                                </div>

                                <div
                                  className="
                                    mt-0.5
                                    text-[9px]
                                    text-gray-500
                                  "
                                >
                                  {nombreSeveridad(
                                    riesgo.severidad
                                  )}
                                </div>
                              </td>


                              <td
                                className="
                                  border
                                  border-gray-300
                                  px-2
                                  py-2
                                  text-center
                                  align-top
                                "
                              >
                                <span
                                  className={`
                                    inline-flex
                                    border
                                    rounded
                                    px-2
                                    py-1
                                    text-[9px]
                                    font-black
                                    ${clasePrioridad(
                                      riesgo
                                        .prioridad_intervencion
                                    )}
                                  `}
                                >
                                  {etiqueta(
                                    riesgo
                                      .prioridad_intervencion
                                  ) ||
                                    '-'}
                                </span>
                              </td>
                            </tr>
                          )
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ====================================================
          PROGRAMAS MÍNIMOS DE GESTIÓN PESV
          app/admin/pesv/riesgos/components/VistaProgramasPesv.js
      ==================================================== */}

      <div
        className="
          border
          border-gray-300
          rounded-xl
          overflow-hidden
          bg-white
        "
      >
        <div
          className="
            bg-slate-800
            text-white
            px-4
            py-2
          "
        >
          <div
            className="
              text-xs
              font-black
              uppercase
            "
          >
            Enfoque de los programas de gestión
          </div>
        </div>


        <div
          className="
            p-3
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-3
            gap-3
          "
        >
          <div
            className="
              border
              border-gray-300
              rounded-lg
              p-3
            "
          >
            <div
              className="
                text-[10px]
                font-black
                uppercase
                text-blue-800
              "
            >
              Gestión de la velocidad
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Orientado al control de comportamientos y condiciones
              relacionadas con velocidades inadecuadas o no seguras.
            </div>
          </div>


          <div
            className="
              border
              border-gray-300
              rounded-lg
              p-3
            "
          >
            <div
              className="
                text-[10px]
                font-black
                uppercase
                text-blue-800
              "
            >
              Prevención de la fatiga
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Busca controlar condiciones que puedan afectar la
              atención y capacidad de conducción por cansancio o
              fatiga.
            </div>
          </div>


          <div
            className="
              border
              border-gray-300
              rounded-lg
              p-3
            "
          >
            <div
              className="
                text-[10px]
                font-black
                uppercase
                text-blue-800
              "
            >
              Prevención de la distracción
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Promueve acciones para reducir conductas o elementos
              que desvíen la atención durante la conducción.
            </div>
          </div>


          <div
            className="
              border
              border-gray-300
              rounded-lg
              p-3
            "
          >
            <div
              className="
                text-[10px]
                font-black
                uppercase
                text-blue-800
              "
            >
              Cero tolerancia al alcohol y SPA
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Busca prevenir la conducción bajo efectos de alcohol
              o sustancias psicoactivas.
            </div>
          </div>


          <div
            className="
              border
              border-gray-300
              rounded-lg
              p-3
            "
          >
            <div
              className="
                text-[10px]
                font-black
                uppercase
                text-blue-800
              "
            >
              Protección de actores vulnerables
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Fortalece las medidas de prevención frente a peatones,
              ciclistas, motociclistas y demás actores con mayor
              vulnerabilidad vial.
            </div>
          </div>


          <div
            className="
              border
              border-gray-300
              rounded-lg
              p-3
            "
          >
            <div
              className="
                text-[10px]
                font-black
                uppercase
                text-blue-800
              "
            >
              Gestión integral y competencias
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Programa complementario para integrar la gestión del
              riesgo vial con el fortalecimiento de competencias
              propias de la formación desarrollada por el CEA.
            </div>
          </div>
        </div>
      </div>


      {/* ====================================================
          NOTA FINAL
          app/admin/pesv/riesgos/components/VistaProgramasPesv.js
      ==================================================== */}

      <div
        className="
          border
          border-blue-200
          rounded-lg
          bg-blue-50
          p-3
          text-[10px]
          leading-relaxed
          text-blue-900
        "
      >
        Esta pestaña es una vista de consulta y análisis. La
        asociación de un riesgo con uno o varios programas PESV se
        administra desde la Matriz de Riesgos. Las valoraciones
        posteriores continúan registrándose desde Seguimientos.
      </div>
    </div>
  )
}