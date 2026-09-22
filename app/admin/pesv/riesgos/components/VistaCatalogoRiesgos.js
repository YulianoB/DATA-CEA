// app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js

'use client'

import {
  useMemo,
  useState,
} from 'react'


// ============================================================
// HELPERS
// app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
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
  )
    .toUpperCase()
}


function etiqueta(
  valor
) {
  return texto(
    valor
  )
    .replaceAll(
      '_',
      ' '
    )
}


function calcularNr(
  riesgo
) {
  const valorGuardado =
    Number(
      riesgo
        ?.valor_nivel_riesgo
    )

  if (
    Number.isFinite(
      valorGuardado
    ) &&
    valorGuardado > 0
  ) {
    return valorGuardado
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


function nombreExposicion(
  valor
) {
  const numero =
    Number(
      valor
    )

  if (
    numero === 3
  ) {
    return 'Frecuente'
  }

  if (
    numero === 2
  ) {
    return 'Ocasional'
  }

  if (
    numero === 1
  ) {
    return 'Esporádica'
  }

  return '-'
}


function nombreProbabilidad(
  valor
) {
  const numero =
    Number(
      valor
    )

  if (
    numero === 3
  ) {
    return 'Muy probable'
  }

  if (
    numero === 2
  ) {
    return 'Poco probable'
  }

  if (
    numero === 1
  ) {
    return 'No es probable'
  }

  return '-'
}


function nombreSeveridad(
  valor
) {
  const numero =
    Number(
      valor
    )

  if (
    numero === 3
  ) {
    return 'Muy grave'
  }

  if (
    numero === 2
  ) {
    return 'Grave'
  }

  if (
    numero === 1
  ) {
    return 'Leve'
  }

  return texto(
    valor
  ) || '-'
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


function formatearFecha(
  valor
) {
  const fecha =
    texto(
      valor
    )

  if (
    !fecha
  ) {
    return '-'
  }

  const partes =
    fecha
      .slice(
        0,
        10
      )
      .split(
        '-'
      )

  if (
    partes.length !== 3
  ) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}


// ============================================================
// CLASES VISUALES
// app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
// ============================================================

function claseNivel(
  nivel
) {
  const valor =
    normalizar(
      nivel
    )

  if (
    valor ===
    'CRITICO'
  ) {
    return `
      bg-red-100
      border-red-300
      text-red-800
    `
  }

  if (
    valor ===
    'MODERADO'
  ) {
    return `
      bg-amber-100
      border-amber-300
      text-amber-800
    `
  }

  if (
    valor ===
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
  prioridad
) {
  const valor =
    normalizar(
      prioridad
    )

  if (
    valor ===
    'PRIORITARIA'
  ) {
    return `
      bg-red-100
      border-red-300
      text-red-800
    `
  }

  if (
    valor ===
    'PRIORITARIA_PREVENTIVA'
  ) {
    return `
      bg-orange-100
      border-orange-300
      text-orange-800
    `
  }

  if (
    valor ===
    'PROGRAMADA'
  ) {
    return `
      bg-amber-100
      border-amber-300
      text-amber-800
    `
  }

  if (
    valor ===
    'SEGUIMIENTO'
  ) {
    return `
      bg-blue-100
      border-blue-300
      text-blue-800
    `
  }

  if (
    valor ===
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
// TARJETA DE RESUMEN
// app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
// ============================================================

function TarjetaResumen({
  titulo,
  valor,
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
    </div>
  )
}


// ============================================================
// CAMPO DE DETALLE
// app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
// ============================================================

function CampoDetalle({
  titulo,
  valor,
}) {
  return (
    <div
      className="
        border
        border-gray-200
        rounded-lg
        bg-white
        p-3
      "
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
          text-xs
          text-gray-800
          whitespace-pre-wrap
        "
      >
        {texto(
          valor
        ) || '-'}
      </div>
    </div>
  )
}


// ============================================================
// VISTA CATÁLOGO DE RIESGOS
// app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
// ============================================================

export default function VistaCatalogoRiesgos({
  anio,
  riesgos = [],
}) {
  const [
    busqueda,
    setBusqueda,
  ] =
    useState('')

  const [
    filtroNivel,
    setFiltroNivel,
  ] =
    useState('')

  const [
    filtroPrioridad,
    setFiltroPrioridad,
  ] =
    useState('')

  const [
    filtroContexto,
    setFiltroContexto,
  ] =
    useState('')

  const [
    filtroPrograma,
    setFiltroPrograma,
  ] =
    useState('')

  const [
    riesgoSeleccionadoId,
    setRiesgoSeleccionadoId,
  ] =
    useState(null)


  // ==========================================================
  // LISTA BASE
  // app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
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
  // CONTEXTOS DISPONIBLES
  // app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
  // ==========================================================

  const contextos =
    useMemo(
      () => {
        return [
          ...new Set(
            listaRiesgos
              .map(
                riesgo =>
                  texto(
                    riesgo
                      .contexto_exposicion
                  )
              )
              .filter(
                Boolean
              )
          ),
        ].sort()
      },
      [
        listaRiesgos,
      ]
    )


  // ==========================================================
  // PROGRAMAS DISPONIBLES
  // app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
  // ==========================================================

  const programas =
    useMemo(
      () => {
        const mapa =
          new Map()

        listaRiesgos.forEach(
          riesgo => {
            const relacionados =
              Array.isArray(
                riesgo.programas
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
        )

        return Array.from(
          mapa.values()
        ).sort(
          (
            a,
            b
          ) =>
            Number(
              a?.orden ||
              999
            ) -
            Number(
              b?.orden ||
              999
            )
        )
      },
      [
        listaRiesgos,
      ]
    )


  // ==========================================================
  // RESUMEN
  // app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
  // ==========================================================

  const resumen =
    useMemo(
      () => {
        let activos =
          0

        let criticos =
          0

        let moderados =
          0

        let bajos =
          0

        listaRiesgos.forEach(
          riesgo => {
            if (
              riesgo.activo !==
              false
            ) {
              activos +=
                1
            }

            const nivel =
              calcularNivel(
                riesgo
              )

            if (
              nivel ===
              'CRITICO'
            ) {
              criticos +=
                1
            } else if (
              nivel ===
              'MODERADO'
            ) {
              moderados +=
                1
            } else if (
              nivel ===
              'BAJO'
            ) {
              bajos +=
                1
            }
          }
        )

        return {
          total:
            listaRiesgos.length,

          activos,

          criticos,

          moderados,

          bajos,
        }
      },
      [
        listaRiesgos,
      ]
    )


  // ==========================================================
  // FILTRAR CATÁLOGO
  // app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
  // ==========================================================

  const riesgosFiltrados =
    useMemo(
      () => {
        const consulta =
          texto(
            busqueda
          )
            .toLowerCase()

        return listaRiesgos.filter(
          riesgo => {
            const nivel =
              calcularNivel(
                riesgo
              )

            const prioridad =
              normalizar(
                riesgo
                  .prioridad_intervencion
              )

            const contexto =
              texto(
                riesgo
                  .contexto_exposicion
              )

            if (
              filtroNivel &&
              nivel !==
                filtroNivel
            ) {
              return false
            }

            if (
              filtroPrioridad &&
              prioridad !==
                filtroPrioridad
            ) {
              return false
            }

            if (
              filtroContexto &&
              contexto !==
                filtroContexto
            ) {
              return false
            }

            if (
              filtroPrograma
            ) {
              const relacionados =
                Array.isArray(
                  riesgo.programas
                )
                  ? riesgo.programas
                  : []

              const encontrado =
                relacionados.some(
                  programa =>
                    String(
                      programa?.id
                    ) ===
                    String(
                      filtroPrograma
                    )
                )

              if (
                !encontrado
              ) {
                return false
              }
            }

            if (
              consulta
            ) {
              const programasTexto =
                (
                  Array.isArray(
                    riesgo.programas
                  )
                    ? riesgo.programas
                    : []
                )
                  .map(
                    programa =>
                      [
                        programa?.codigo,
                        programa?.nombre,
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
                  riesgo.codigo,
                  riesgo.proceso,
                  riesgo.actividad,
                  riesgo.actores_expuestos,
                  riesgo.factor_riesgo,
                  riesgo.situacion_riesgo,
                  riesgo.descripcion_riesgo,
                  riesgo.evento_peligroso,
                  riesgo.causa,
                  riesgo.consecuencia,
                  riesgo.responsable_nombre,
                  programasTexto,
                ]
                  .map(
                    item =>
                      texto(
                        item
                      )
                        .toLowerCase()
                  )
                  .join(
                    ' '
                  )

              if (
                !contenido.includes(
                  consulta
                )
              ) {
                return false
              }
            }

            return true
          }
        )
      },
      [
        listaRiesgos,
        busqueda,
        filtroNivel,
        filtroPrioridad,
        filtroContexto,
        filtroPrograma,
      ]
    )


  // ==========================================================
  // RIESGO SELECCIONADO
  // app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
  // ==========================================================

  const riesgoSeleccionado =
    useMemo(
      () => {
        if (
          riesgoSeleccionadoId ===
          null
        ) {
          return null
        }

        return (
          listaRiesgos.find(
            riesgo =>
              String(
                riesgo.id
              ) ===
              String(
                riesgoSeleccionadoId
              )
          ) ||
          null
        )
      },
      [
        listaRiesgos,
        riesgoSeleccionadoId,
      ]
    )


  // ==========================================================
  // LIMPIAR FILTROS
  // app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
  // ==========================================================

  function limpiarFiltros() {
    setBusqueda(
      ''
    )

    setFiltroNivel(
      ''
    )

    setFiltroPrioridad(
      ''
    )

    setFiltroContexto(
      ''
    )

    setFiltroPrograma(
      ''
    )
  }


  // ==========================================================
  // RENDER
  // app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
  // ==========================================================

  return (
    <div
      className="
        space-y-4
      "
    >
      {/* ====================================================
          ENCABEZADO
          app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
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
              Catálogo de Riesgos PESV
            </div>

            <div
              className="
                mt-1
                text-[10px]
                text-slate-300
              "
            >
              Vigencia {anio} · Consulta organizada del inventario de riesgos viales
            </div>
          </div>

          <div
            className="
              text-[10px]
              text-slate-300
            "
          >
            Registros mostrados:{' '}

            <strong
              className="
                text-white
              "
            >
              {
                riesgosFiltrados
                  .length
              }
            </strong>

            {' / '}

            {
              resumen.total
            }
          </div>
        </div>
      </div>


      {/* ====================================================
          RESUMEN DEL CATÁLOGO
          app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
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
          titulo="Total riesgos"
          valor={
            resumen.total
          }
        />

        <TarjetaResumen
          titulo="Activos"
          valor={
            resumen.activos
          }
          clase="
            border-blue-300
            bg-blue-50
          "
        />

        <TarjetaResumen
          titulo="Bajos"
          valor={
            resumen.bajos
          }
          clase="
            border-green-300
            bg-green-50
          "
        />

        <TarjetaResumen
          titulo="Moderados"
          valor={
            resumen.moderados
          }
          clase="
            border-amber-300
            bg-amber-50
          "
        />

        <TarjetaResumen
          titulo="Críticos"
          valor={
            resumen.criticos
          }
          clase="
            border-red-300
            bg-red-50
          "
        />
      </div>


      {/* ====================================================
          BUSCADOR Y FILTROS
          app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
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
            bg-gray-100
            border-b
            border-gray-300
            px-4
            py-2
          "
        >
          <div
            className="
              text-[11px]
              font-black
              uppercase
              text-gray-700
            "
          >
            Buscar y filtrar catálogo
          </div>
        </div>


        <div
          className="
            p-3
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-6
            gap-2
          "
        >
          <div
            className="
              md:col-span-2
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
              Buscar
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
                  text-gray-400
                  text-xs
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
                placeholder="Código, proceso, actividad, factor, situación, responsable..."
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


          <div>
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
              Nivel
            </label>

            <select
              value={
                filtroNivel
              }
              onChange={
                event =>
                  setFiltroNivel(
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                rounded
                px-2
                py-2
                text-xs
                bg-white
              "
            >
              <option value="">
                Todos
              </option>

              <option value="BAJO">
                Bajo
              </option>

              <option value="MODERADO">
                Moderado
              </option>

              <option value="CRITICO">
                Crítico
              </option>
            </select>
          </div>


          <div>
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
              Prioridad
            </label>

            <select
              value={
                filtroPrioridad
              }
              onChange={
                event =>
                  setFiltroPrioridad(
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                rounded
                px-2
                py-2
                text-xs
                bg-white
              "
            >
              <option value="">
                Todas
              </option>

              <option value="PRIORITARIA">
                Prioritaria
              </option>

              <option value="PRIORITARIA_PREVENTIVA">
                Prioritaria preventiva
              </option>

              <option value="PROGRAMADA">
                Programada
              </option>

              <option value="SEGUIMIENTO">
                Seguimiento
              </option>

              <option value="MANTENER_CONTROLES">
                Mantener controles
              </option>
            </select>
          </div>


          <div>
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
              Contexto
            </label>

            <select
              value={
                filtroContexto
              }
              onChange={
                event =>
                  setFiltroContexto(
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                rounded
                px-2
                py-2
                text-xs
                bg-white
              "
            >
              <option value="">
                Todos
              </option>

              {contextos.map(
                contexto => (
                  <option
                    key={
                      contexto
                    }
                    value={
                      contexto
                    }
                  >
                    {nombreContexto(
                      contexto
                    )}
                  </option>
                )
              )}
            </select>
          </div>


          <div>
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
              Programa PESV
            </label>

            <select
              value={
                filtroPrograma
              }
              onChange={
                event =>
                  setFiltroPrograma(
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                rounded
                px-2
                py-2
                text-xs
                bg-white
              "
            >
              <option value="">
                Todos
              </option>

              {programas.map(
                programa => (
                  <option
                    key={
                      programa.id
                    }
                    value={
                      programa.id
                    }
                  >
                    {texto(
                      programa.codigo
                    )
                      ? `${programa.codigo} · `
                      : ''}
                    {texto(
                      programa.nombre
                    )}
                  </option>
                )
              )}
            </select>
          </div>
        </div>


        <div
          className="
            px-3
            pb-3
            flex
            justify-end
          "
        >
          <button
            type="button"
            onClick={
              limpiarFiltros
            }
            className="
              border
              border-gray-300
              bg-white
              hover:bg-gray-50
              rounded
              px-3
              py-1.5
              text-[10px]
              font-bold
              text-gray-700
            "
          >
            <i
              className="
                fas
                fa-eraser
                mr-1.5
              "
            ></i>

            Limpiar filtros
          </button>
        </div>
      </div>


      {/* ====================================================
          TABLA CATÁLOGO DE RIESGOS
          app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
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
            justify-between
            items-center
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
            Inventario de riesgos identificados
          </div>

          <div
            className="
              text-[9px]
              text-slate-300
            "
          >
            {
              riesgosFiltrados
                .length
            } registro(s)
          </div>
        </div>


        {riesgosFiltrados.length ===
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
                text-2xl
                text-gray-300
                mb-2
                block
              "
            ></i>

            No existen riesgos que coincidan con los filtros seleccionados.
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
                min-w-[1300px]
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
                    Factor de riesgo
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

                  <th
                    className="
                      border
                      border-gray-300
                      px-2
                      py-2
                      text-center
                    "
                  >
                    Programas
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
                    Detalle
                  </th>
                </tr>
              </thead>

              <tbody>
                {riesgosFiltrados.map(
                  riesgo => {
                    const nr =
                      calcularNr(
                        riesgo
                      )

                    const nivel =
                      calcularNivel(
                        riesgo
                      )

                    const relacionados =
                      Array.isArray(
                        riesgo.programas
                      )
                        ? riesgo.programas
                        : []

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
                          "
                        >
                          <div
                            className="
                              font-black
                              text-gray-900
                            "
                          >
                            {texto(
                              riesgo.codigo
                            ) ||
                              `R-${riesgo.id}`}
                          </div>

                          <div
                            className="
                              mt-1
                              text-[9px]
                              text-gray-500
                            "
                          >
                            {formatearFecha(
                              riesgo
                                .fecha_identificacion
                            )}
                          </div>
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

                          <div
                            className="
                              mt-1
                              text-[9px]
                              text-blue-700
                            "
                          >
                            {nombreContexto(
                              riesgo
                                .contexto_exposicion
                            )}
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
                          {texto(
                            riesgo
                              .factor_riesgo
                          ) ||
                            '-'}
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


                        <td
                          className="
                            border
                            border-gray-300
                            px-2
                            py-2
                            align-top
                          "
                        >
                          {relacionados.length ===
                          0 ? (
                            <div
                              className="
                                text-center
                                text-gray-400
                              "
                            >
                              —
                            </div>
                          ) : (
                            <div
                              className="
                                flex
                                flex-col
                                gap-1
                              "
                            >
                              {relacionados.map(
                                programa => (
                                  <div
                                    key={
                                      programa.id
                                    }
                                    className="
                                      border
                                      border-blue-200
                                      bg-blue-50
                                      rounded
                                      px-2
                                      py-1
                                      text-[9px]
                                      text-blue-800
                                    "
                                  >
                                    {texto(
                                      programa.codigo
                                    )
                                      ? `${programa.codigo} · `
                                      : ''}

                                    {texto(
                                      programa.nombre
                                    ) ||
                                      'Programa PESV'}
                                  </div>
                                )
                              )}
                            </div>
                          )}
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
                          <button
                            type="button"
                            onClick={() =>
                              setRiesgoSeleccionadoId(
                                riesgo.id
                              )
                            }
                            className="
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

                            Ver
                          </button>
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


      {/* ====================================================
          DETALLE DEL RIESGO SELECCIONADO
          app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
      ==================================================== */}

      {riesgoSeleccionado && (
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
              py-2
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
                  text-xs
                  font-black
                  uppercase
                "
              >
                {texto(
                  riesgoSeleccionado
                    .codigo
                ) ||
                  `R-${riesgoSeleccionado.id}`}
                {' · '}
                Ficha del riesgo
              </div>

              <div
                className="
                  mt-0.5
                  text-[9px]
                  text-blue-200
                "
              >
                Registro completo del catálogo PESV
              </div>
            </div>


            <button
              type="button"
              onClick={() =>
                setRiesgoSeleccionadoId(
                  null
                )
              }
              className="
                border
                border-white
                rounded
                px-3
                py-1
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


          <div
            className="
              p-3
              space-y-3
            "
          >
            {/* ==============================================
                IDENTIFICACIÓN
            ============================================== */}

            <div
              className="
                border
                border-gray-200
                rounded-lg
                overflow-hidden
              "
            >
              <div
                className="
                  bg-gray-100
                  border-b
                  border-gray-200
                  px-3
                  py-2
                  text-[10px]
                  font-black
                  uppercase
                  text-gray-700
                "
              >
                Identificación del riesgo
              </div>

              <div
                className="
                  p-3
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  xl:grid-cols-4
                  gap-2
                "
              >
                <CampoDetalle
                  titulo="Código"
                  valor={
                    riesgoSeleccionado
                      .codigo
                  }
                />

                <CampoDetalle
                  titulo="Fecha de identificación"
                  valor={
                    formatearFecha(
                      riesgoSeleccionado
                        .fecha_identificacion
                    )
                  }
                />

                <CampoDetalle
                  titulo="Proceso"
                  valor={
                    riesgoSeleccionado
                      .proceso
                  }
                />

                <CampoDetalle
                  titulo="Contexto de exposición"
                  valor={
                    nombreContexto(
                      riesgoSeleccionado
                        .contexto_exposicion
                    )
                  }
                />

                <CampoDetalle
                  titulo="Actividad"
                  valor={
                    riesgoSeleccionado
                      .actividad
                  }
                />

                <CampoDetalle
                  titulo="Actores expuestos"
                  valor={
                    riesgoSeleccionado
                      .actores_expuestos
                  }
                />

                <CampoDetalle
                  titulo="Fuente de identificación"
                  valor={
                    riesgoSeleccionado
                      .fuente_identificacion
                  }
                />

                <CampoDetalle
                  titulo="Estado"
                  valor={
                    riesgoSeleccionado
                      .activo ===
                    false
                      ? 'INACTIVO'
                      : texto(
                          riesgoSeleccionado
                            .estado
                        ) ||
                        'ACTIVO'
                  }
                />
              </div>
            </div>


            {/* ==============================================
                DESCRIPCIÓN DEL ESCENARIO
            ============================================== */}

            <div
              className="
                border
                border-gray-200
                rounded-lg
                overflow-hidden
              "
            >
              <div
                className="
                  bg-gray-100
                  border-b
                  border-gray-200
                  px-3
                  py-2
                  text-[10px]
                  font-black
                  uppercase
                  text-gray-700
                "
              >
                Escenario de riesgo
              </div>

              <div
                className="
                  p-3
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  gap-2
                "
              >
                <CampoDetalle
                  titulo="Factor de riesgo"
                  valor={
                    riesgoSeleccionado
                      .factor_riesgo
                  }
                />

                <CampoDetalle
                  titulo="Situación de riesgo"
                  valor={
                    riesgoSeleccionado
                      .situacion_riesgo ||
                    riesgoSeleccionado
                      .descripcion_riesgo
                  }
                />

                <CampoDetalle
                  titulo="Evento peligroso"
                  valor={
                    riesgoSeleccionado
                      .evento_peligroso
                  }
                />

                <CampoDetalle
                  titulo="Causas"
                  valor={
                    riesgoSeleccionado
                      .causa
                  }
                />

                <div
                  className="
                    md:col-span-2
                  "
                >
                  <CampoDetalle
                    titulo="Consecuencias"
                    valor={
                      riesgoSeleccionado
                        .consecuencia
                    }
                  />
                </div>
              </div>
            </div>


            {/* ==============================================
                VALORACIÓN INICIAL
            ============================================== */}

            <div
              className="
                border
                border-gray-200
                rounded-lg
                overflow-hidden
              "
            >
              <div
                className="
                  bg-gray-100
                  border-b
                  border-gray-200
                  px-3
                  py-2
                  text-[10px]
                  font-black
                  uppercase
                  text-gray-700
                "
              >
                Valoración inicial
              </div>

              <div
                className="
                  p-3
                  grid
                  grid-cols-2
                  md:grid-cols-3
                  xl:grid-cols-6
                  gap-2
                "
              >
                <CampoDetalle
                  titulo="Exposición"
                  valor={
                    `${riesgoSeleccionado.exposicion || '-'} · ${nombreExposicion(
                      riesgoSeleccionado
                        .exposicion
                    )}`
                  }
                />

                <CampoDetalle
                  titulo="Probabilidad"
                  valor={
                    `${riesgoSeleccionado.probabilidad || '-'} · ${nombreProbabilidad(
                      riesgoSeleccionado
                        .probabilidad
                    )}`
                  }
                />

                <CampoDetalle
                  titulo="NR"
                  valor={
                    calcularNr(
                      riesgoSeleccionado
                    ) ??
                    '-'
                  }
                />

                <CampoDetalle
                  titulo="Nivel"
                  valor={
                    calcularNivel(
                      riesgoSeleccionado
                    ) ||
                    '-'
                  }
                />

                <CampoDetalle
                  titulo="Severidad"
                  valor={
                    `${riesgoSeleccionado.severidad || '-'} · ${nombreSeveridad(
                      riesgoSeleccionado
                        .severidad
                    )}`
                  }
                />

                <CampoDetalle
                  titulo="Prioridad"
                  valor={
                    etiqueta(
                      riesgoSeleccionado
                        .prioridad_intervencion
                    )
                  }
                />
              </div>


              <div
                className="
                  px-3
                  pb-3
                  grid
                  grid-cols-1
                  md:grid-cols-3
                  gap-2
                "
              >
                <CampoDetalle
                  titulo="Justificación exposición"
                  valor={
                    riesgoSeleccionado
                      .justificacion_exposicion
                  }
                />

                <CampoDetalle
                  titulo="Justificación probabilidad"
                  valor={
                    riesgoSeleccionado
                      .justificacion_probabilidad
                  }
                />

                <CampoDetalle
                  titulo="Justificación severidad"
                  valor={
                    riesgoSeleccionado
                      .justificacion_severidad
                  }
                />
              </div>
            </div>


            {/* ==============================================
                PROGRAMAS PESV
            ============================================== */}

            <div
              className="
                border
                border-gray-200
                rounded-lg
                overflow-hidden
              "
            >
              <div
                className="
                  bg-gray-100
                  border-b
                  border-gray-200
                  px-3
                  py-2
                  text-[10px]
                  font-black
                  uppercase
                  text-gray-700
                "
              >
                Programas PESV relacionados
              </div>

              <div
                className="
                  p-3
                "
              >
                {Array.isArray(
                  riesgoSeleccionado
                    .programas
                ) &&
                riesgoSeleccionado
                  .programas
                  .length >
                  0 ? (
                  <div
                    className="
                      flex
                      flex-wrap
                      gap-2
                    "
                  >
                    {riesgoSeleccionado
                      .programas
                      .map(
                        programa => (
                          <div
                            key={
                              programa.id
                            }
                            className="
                              border
                              border-blue-200
                              bg-blue-50
                              rounded-lg
                              px-3
                              py-2
                              text-[10px]
                              text-blue-900
                            "
                          >
                            <div
                              className="
                                font-black
                              "
                            >
                              {texto(
                                programa.codigo
                              )
                                ? `${programa.codigo} · `
                                : ''}

                              {texto(
                                programa.nombre
                              ) ||
                                'Programa PESV'}
                            </div>

                            {texto(
                              programa.descripcion
                            ) && (
                              <div
                                className="
                                  mt-1
                                  text-[9px]
                                  text-blue-700
                                "
                              >
                                {
                                  programa.descripcion
                                }
                              </div>
                            )}
                          </div>
                        )
                      )}
                  </div>
                ) : (
                  <div
                    className="
                      text-xs
                      text-gray-500
                    "
                  >
                    Este riesgo no tiene programas PESV relacionados.
                  </div>
                )}
              </div>
            </div>


            {/* ==============================================
                INTERVENCIÓN Y SEGUIMIENTO
            ============================================== */}

            <div
              className="
                border
                border-gray-200
                rounded-lg
                overflow-hidden
              "
            >
              <div
                className="
                  bg-gray-100
                  border-b
                  border-gray-200
                  px-3
                  py-2
                  text-[10px]
                  font-black
                  uppercase
                  text-gray-700
                "
              >
                Gestión del riesgo
              </div>

              <div
                className="
                  p-3
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  xl:grid-cols-4
                  gap-2
                "
              >
                <CampoDetalle
                  titulo="Responsable"
                  valor={
                    riesgoSeleccionado
                      .responsable_nombre
                  }
                />

                <CampoDetalle
                  titulo="Fecha compromiso"
                  valor={
                    formatearFecha(
                      riesgoSeleccionado
                        .fecha_compromiso
                    )
                  }
                />

                <CampoDetalle
                  titulo="Controles / medidas"
                  valor={
                    Array.isArray(
                      riesgoSeleccionado
                        .medidas
                    )
                      ? String(
                          riesgoSeleccionado
                            .medidas
                            .length
                        )
                      : '0'
                  }
                />

                <CampoDetalle
                  titulo="Seguimientos posteriores"
                  valor={
                    Array.isArray(
                      riesgoSeleccionado
                        .seguimientos
                    )
                      ? String(
                          riesgoSeleccionado
                            .seguimientos
                            .length
                        )
                      : '0'
                  }
                />
              </div>


              <div
                className="
                  px-3
                  pb-3
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  gap-2
                "
              >
                <CampoDetalle
                  titulo="Tratamiento"
                  valor={
                    riesgoSeleccionado
                      .tratamiento
                  }
                />

                <CampoDetalle
                  titulo="Acción propuesta"
                  valor={
                    riesgoSeleccionado
                      .accion_propuesta
                  }
                />

                <CampoDetalle
                  titulo="Antecedentes considerados"
                  valor={
                    riesgoSeleccionado
                      .antecedentes_considerados
                  }
                />

                <CampoDetalle
                  titulo="Eficacia de controles"
                  valor={
                    riesgoSeleccionado
                      .eficacia_controles
                  }
                />

                <div
                  className="
                    md:col-span-2
                  "
                >
                  <CampoDetalle
                    titulo="Observaciones"
                    valor={
                      riesgoSeleccionado
                        .observaciones
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ====================================================
          NOTA DE USO
          app/admin/pesv/riesgos/components/VistaCatalogoRiesgos.js
      ==================================================== */}

      <div
        className="
          border
          border-blue-200
          rounded-lg
          bg-blue-50
          p-3
          text-[10px]
          text-blue-900
        "
      >
        El catálogo es una vista de consulta del inventario de
        riesgos identificados. La creación o modificación del
        riesgo se realiza en la pestaña Matriz y las valoraciones
        posteriores se administran en Seguimientos.
      </div>
    </div>
  )
}