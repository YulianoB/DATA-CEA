// app/admin/pesv/riesgos/components/VistaMapaCalor.js

'use client'

import {
  useMemo,
  useState,
} from 'react'


// ============================================================
// HELPERS
// app/admin/pesv/riesgos/components/VistaMapaCalor.js
// ============================================================

function texto(valor) {
  return String(
    valor ?? ''
  ).trim()
}


function nivelPorNr(nr) {
  const valor =
    Number(nr)

  if (valor >= 6) {
    return 'CRITICO'
  }

  if (valor >= 3) {
    return 'MODERADO'
  }

  return 'BAJO'
}


// ============================================================
// COLOR FUERTE DEL MAPA DE CALOR
// app/admin/pesv/riesgos/components/VistaMapaCalor.js
// ============================================================

function claseCelda(nr) {
  const nivel =
    nivelPorNr(nr)

  if (
    nivel === 'CRITICO'
  ) {
    return 'bg-red-600 text-white'
  }

  if (
    nivel === 'MODERADO'
  ) {
    return 'bg-amber-400 text-gray-950'
  }

  return 'bg-green-500 text-white'
}


function nombreExposicion(valor) {
  const numero =
    Number(valor)

  if (numero === 3) {
    return 'Frecuente'
  }

  if (numero === 2) {
    return 'Ocasional'
  }

  if (numero === 1) {
    return 'Esporádica'
  }

  return '-'
}


function nombreProbabilidad(valor) {
  const numero =
    Number(valor)

  if (numero === 3) {
    return 'Muy probable'
  }

  if (numero === 2) {
    return 'Poco probable'
  }

  if (numero === 1) {
    return 'No es probable'
  }

  return '-'
}

// ============================================================
// HELPERS DE ANÁLISIS
// app/admin/pesv/riesgos/components/VistaMapaCalor.js
// ============================================================

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

  const valor =
    (
      Number(cantidad) /
      Number(total)
    ) *
    100

  return `${valor.toFixed(1)}%`
}


function ordenPrioridad(valor) {
  const prioridad =
    texto(valor)
      .toUpperCase()

  const orden = {
    PRIORITARIA: 1,
    PRIORITARIA_PREVENTIVA: 2,
    PROGRAMADA: 3,
    SEGUIMIENTO: 4,
    MANTENER_CONTROLES: 5,
  }

  return (
    orden[prioridad] ||
    99
  )
}


function claseNivel(valor) {
  const nivel =
    texto(valor)
      .toUpperCase()

  if (
    nivel === 'CRITICO'
  ) {
    return 'bg-red-600 text-white border-red-700'
  }

  if (
    nivel === 'MODERADO'
  ) {
    return 'bg-amber-400 text-gray-950 border-amber-500'
  }

  return 'bg-green-500 text-white border-green-600'
}


function clasePrioridad(valor) {
  const prioridad =
    texto(valor)
      .toUpperCase()

  if (
    prioridad === 'PRIORITARIA'
  ) {
    return 'bg-red-100 text-red-800 border-red-300'
  }

  if (
    prioridad ===
    'PRIORITARIA_PREVENTIVA'
  ) {
    return 'bg-orange-100 text-orange-800 border-orange-300'
  }

  if (
    prioridad === 'PROGRAMADA'
  ) {
    return 'bg-amber-100 text-amber-800 border-amber-300'
  }

  if (
    prioridad === 'SEGUIMIENTO'
  ) {
    return 'bg-blue-100 text-blue-800 border-blue-300'
  }

  return 'bg-green-100 text-green-800 border-green-300'
}

// ============================================================
// CELDA COMPACTA DEL MAPA DE CALOR
// app/admin/pesv/riesgos/components/VistaMapaCalor.js
// ============================================================

function CeldaMapa({
  exposicion,
  probabilidad,
  riesgos,
  seleccionarRiesgo,
}) {
  const nr =
    Number(exposicion) *
    Number(probabilidad)

  const riesgosCelda =
    riesgos.filter(
      riesgo =>
        Number(
          riesgo.exposicion
        ) ===
          Number(exposicion) &&
        Number(
          riesgo.probabilidad
        ) ===
          Number(probabilidad)
    )

  return (
    <div
  className={`
    min-h-24
    h-full
    border
    border-gray-800
    p-2
    ${claseCelda(nr)}
  `}
>
      <div
        className="
          flex
          items-center
          justify-between
          gap-2
        "
      >
        <div
          className="
            text-xl
            font-black
            leading-none
          "
        >
          {nr}
        </div>

        <div
          className="
            text-[10px]
            font-black
            uppercase
            tracking-wide
          "
        >
          {nivelPorNr(nr)}
        </div>
      </div>

      <div
        className="
          mt-2
          pt-2
          border-t
          border-gray-600
        "
      >
        {riesgosCelda.length ===
        0 ? (
          <div
            className="
              text-xs
              font-semibold
              opacity-70
              text-center
            "
          >
            —
          </div>
        ) : (
          <div
            className="
              flex
              flex-wrap
              gap-1
            "
          >
            {riesgosCelda.map(
              riesgo => (
                <button
                  key={
                    riesgo.id
                  }
                  type="button"
                  onClick={() =>
                    seleccionarRiesgo(
                      riesgo.id
                    )
                  }
                  className="
                    bg-white
                    text-gray-900
                    border
                    border-gray-300
                    px-2
                    py-0.5
                    text-[10px]
                    font-black
                    hover:bg-gray-100
                  "
                >
                  {texto(
                    riesgo.codigo
                  ) ||
                    `R-${riesgo.id}`}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}


// ============================================================
// TARJETA DE DATO
// app/admin/pesv/riesgos/components/VistaMapaCalor.js
// ============================================================

function TarjetaDato({
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
          font-bold
          uppercase
          text-gray-500
        "
      >
        {titulo}
      </div>

      <div
        className="
          mt-1
          text-sm
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
// VISTA MAPA DE CALOR
// app/admin/pesv/riesgos/components/VistaMapaCalor.js
// ============================================================

export default function VistaMapaCalor({
  anio,
  riesgos = [],
}) {
  const [
    riesgoSeleccionadoId,
    setRiesgoSeleccionadoId,
  ] =
    useState(null)


  // ==========================================================
  // RIESGOS CON VALORACIÓN VÁLIDA
  // app/admin/pesv/riesgos/components/VistaMapaCalor.js
  // ==========================================================

  const riesgosValidos =
    useMemo(
      () => {
        const lista =
          Array.isArray(
            riesgos
          )
            ? riesgos
            : []

        return lista.filter(
          riesgo => {
            const e =
              Number(
                riesgo.exposicion
              )

            const p =
              Number(
                riesgo.probabilidad
              )

            return (
              [1, 2, 3].includes(
                e
              ) &&
              [1, 2, 3].includes(
                p
              )
            )
          }
        )
      },
      [
        riesgos,
      ]
    )


  // ==========================================================
  // RESUMEN DEL MAPA
  // app/admin/pesv/riesgos/components/VistaMapaCalor.js
  // ==========================================================

  const resumen =
    useMemo(
      () => {
        let bajos =
          0

        let moderados =
          0

        let criticos =
          0

        riesgosValidos.forEach(
          riesgo => {
            const nr =
              Number(
                riesgo.exposicion
              ) *
              Number(
                riesgo.probabilidad
              )

            const nivel =
              nivelPorNr(
                nr
              )

            if (
              nivel === 'CRITICO'
            ) {
              criticos +=
                1
            } else if (
              nivel === 'MODERADO'
            ) {
              moderados +=
                1
            } else {
              bajos +=
                1
            }
          }
        )

        return {
          total:
            riesgosValidos.length,

          bajos,

          moderados,

          criticos,
        }
      },
      [
        riesgosValidos,
      ]
    )


  // ==========================================================
  // RIESGO SELECCIONADO
  // app/admin/pesv/riesgos/components/VistaMapaCalor.js
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
          riesgosValidos.find(
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
        riesgosValidos,
        riesgoSeleccionadoId,
      ]
    )
// ==========================================================
// RIESGOS PRIORIZADOS
// app/admin/pesv/riesgos/components/VistaMapaCalor.js
// ==========================================================

const riesgosPriorizados =
  useMemo(
    () => {
      return [
        ...riesgosValidos,
      ].sort(
        (
          riesgoA,
          riesgoB
        ) => {
          const prioridadA =
            ordenPrioridad(
              riesgoA
                .prioridad_intervencion
            )

          const prioridadB =
            ordenPrioridad(
              riesgoB
                .prioridad_intervencion
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

          const nrA =
            Number(
              riesgoA.exposicion
            ) *
            Number(
              riesgoA.probabilidad
            )

          const nrB =
            Number(
              riesgoB.exposicion
            ) *
            Number(
              riesgoB.probabilidad
            )

          return (
            nrB -
            nrA
          )
        }
      )
    },
    [
      riesgosValidos,
    ]
  )

  // ==========================================================
  // RENDER
  // app/admin/pesv/riesgos/components/VistaMapaCalor.js
  // ==========================================================

  return (
    <div
      className="
        space-y-4
      "
    >
      {/* ====================================================
          ENCABEZADO
          app/admin/pesv/riesgos/components/VistaMapaCalor.js
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
          "
        >
          <div
            className="
              text-sm
              font-black
              uppercase
            "
          >
            Mapa de Calor · Riesgos PESV
          </div>

          <div
            className="
              mt-1
              text-[10px]
              text-slate-300
            "
          >
            Vigencia {anio} · Valoración inicial de los riesgos
          </div>
        </div>
      </div>


      {/* ====================================================
          RESUMEN
          app/admin/pesv/riesgos/components/VistaMapaCalor.js
      ==================================================== */}

      <div
        className="
          grid
          grid-cols-2
          md:grid-cols-4
          gap-3
        "
      >
        <TarjetaDato
          titulo="Total valorados"
          valor={
            resumen.total
          }
        />

        <TarjetaDato
          titulo="Bajos"
          valor={
            resumen.bajos
          }
          clase="
            border-green-300
            bg-green-50
          "
        />

        <TarjetaDato
          titulo="Moderados"
          valor={
            resumen.moderados
          }
          clase="
            border-amber-300
            bg-amber-50
          "
        />

        <TarjetaDato
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
          MAPA DE CALOR COMPACTO
          app/admin/pesv/riesgos/components/VistaMapaCalor.js
      ==================================================== */}

      <div
        className="
          border
          border-gray-800
          bg-white
          overflow-hidden
        "
      >
        <div
          className="
            bg-slate-800
            text-white
            px-3
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
            Matriz Exposición × Probabilidad
          </div>

          <div
            className="
              mt-0.5
              text-[9px]
              text-slate-300
            "
          >
            NR = Exposición × Probabilidad
          </div>
        </div>


        <div
            className="
                p-3
                overflow-x-auto
            "
            >
            <div
                className="
                w-max
                mx-auto
                "
            >
                <div
                className="
                    grid
                    grid-cols-[10rem_13rem_13rem_13rem]
                    gap-0
                    border
                    border-gray-800
                "
                >
              {/* ==================================================
                  CABECERA SUPERIOR IZQUIERDA
              ================================================== */}

              <div
                className="
                  w-40
                  min-h-16
                  bg-slate-700
                  text-white
                  border
                  border-gray-800
                  p-2
                  flex
                  items-center
                  justify-center
                  text-center
                  text-[10px]
                  font-black
                  uppercase
                "
              >
                Exposición
                <br />
                ×
                <br />
                Probabilidad
              </div>


              {/* ==================================================
                  PROBABILIDAD 1
              ================================================== */}

              <div
                className="
                  w-52
                  min-h-16
                  bg-gray-200
                  border
                  border-gray-800
                  p-2
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-center
                "
              >
                <div
                  className="
                    text-sm
                    font-black
                    text-gray-900
                  "
                >
                  P1
                </div>

                <div
                  className="
                    text-[10px]
                    font-semibold
                    text-gray-600
                  "
                >
                  No es probable
                </div>
              </div>


              {/* ==================================================
                  PROBABILIDAD 2
              ================================================== */}

              <div
                className="
                  w-52
                  min-h-16
                  bg-gray-200
                  border
                  border-gray-800
                  p-2
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-center
                "
              >
                <div
                  className="
                    text-sm
                    font-black
                    text-gray-900
                  "
                >
                  P2
                </div>

                <div
                  className="
                    text-[10px]
                    font-semibold
                    text-gray-600
                  "
                >
                  Poco probable
                </div>
              </div>


              {/* ==================================================
                  PROBABILIDAD 3
              ================================================== */}

              <div
                className="
                  w-52
                  min-h-16
                  bg-gray-200
                  border
                  border-gray-800
                  p-2
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-center
                "
              >
                <div
                  className="
                    text-sm
                    font-black
                    text-gray-900
                  "
                >
                  P3
                </div>

                <div
                  className="
                    text-[10px]
                    font-semibold
                    text-gray-600
                  "
                >
                  Muy probable
                </div>
              </div>


              {/* ==================================================
                  FILA E3
              ================================================== */}

              <div
                className="
                  w-40
                  min-h-24
                  bg-gray-200
                  border
                  border-gray-800
                  p-2
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-center
                "
              >
                <div
                  className="
                    text-sm
                    font-black
                  "
                >
                  E3
                </div>

                <div
                  className="
                    text-[10px]
                    font-semibold
                    text-gray-600
                  "
                >
                  Frecuente
                </div>
              </div>

              <div
                className="
                  w-52
                "
              >
                <CeldaMapa
                  exposicion={3}
                  probabilidad={1}
                  riesgos={
                    riesgosValidos
                  }
                  seleccionarRiesgo={
                    setRiesgoSeleccionadoId
                  }
                />
              </div>

              <div
                className="
                  w-52
                "
              >
                <CeldaMapa
                  exposicion={3}
                  probabilidad={2}
                  riesgos={
                    riesgosValidos
                  }
                  seleccionarRiesgo={
                    setRiesgoSeleccionadoId
                  }
                />
              </div>

              <div
                className="
                  w-52
                "
              >
                <CeldaMapa
                  exposicion={3}
                  probabilidad={3}
                  riesgos={
                    riesgosValidos
                  }
                  seleccionarRiesgo={
                    setRiesgoSeleccionadoId
                  }
                />
              </div>


              {/* ==================================================
                  FILA E2
              ================================================== */}

              <div
                className="
                  w-40
                  min-h-24
                  bg-gray-200
                  border
                  border-gray-800
                  p-2
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-center
                "
              >
                <div
                  className="
                    text-sm
                    font-black
                  "
                >
                  E2
                </div>

                <div
                  className="
                    text-[10px]
                    font-semibold
                    text-gray-600
                  "
                >
                  Ocasional
                </div>
              </div>

              <div
                className="
                  w-52
                "
              >
                <CeldaMapa
                  exposicion={2}
                  probabilidad={1}
                  riesgos={
                    riesgosValidos
                  }
                  seleccionarRiesgo={
                    setRiesgoSeleccionadoId
                  }
                />
              </div>

              <div
                className="
                  w-52
                "
              >
                <CeldaMapa
                  exposicion={2}
                  probabilidad={2}
                  riesgos={
                    riesgosValidos
                  }
                  seleccionarRiesgo={
                    setRiesgoSeleccionadoId
                  }
                />
              </div>

              <div
                className="
                  w-52
                "
              >
                <CeldaMapa
                  exposicion={2}
                  probabilidad={3}
                  riesgos={
                    riesgosValidos
                  }
                  seleccionarRiesgo={
                    setRiesgoSeleccionadoId
                  }
                />
              </div>


              {/* ==================================================
                  FILA E1
              ================================================== */}

              <div
                className="
                  w-40
                  min-h-24
                  bg-gray-200
                  border
                  border-gray-800
                  p-2
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-center
                "
              >
                <div
                  className="
                    text-sm
                    font-black
                  "
                >
                  E1
                </div>

                <div
                  className="
                    text-[10px]
                    font-semibold
                    text-gray-600
                  "
                >
                  Esporádica
                </div>
              </div>

              <div
                className="
                  w-52
                "
              >
                <CeldaMapa
                  exposicion={1}
                  probabilidad={1}
                  riesgos={
                    riesgosValidos
                  }
                  seleccionarRiesgo={
                    setRiesgoSeleccionadoId
                  }
                />
              </div>

              <div
                className="
                  w-52
                "
              >
                <CeldaMapa
                  exposicion={1}
                  probabilidad={2}
                  riesgos={
                    riesgosValidos
                  }
                  seleccionarRiesgo={
                    setRiesgoSeleccionadoId
                  }
                />
              </div>

              <div
                className="
                  w-52
                "
              >
                <CeldaMapa
                  exposicion={1}
                  probabilidad={3}
                  riesgos={
                    riesgosValidos
                  }
                  seleccionarRiesgo={
                    setRiesgoSeleccionadoId
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ====================================================
          LEYENDA
          app/admin/pesv/riesgos/components/VistaMapaCalor.js
      ==================================================== */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-2
        "
      >
        <div
          className="
            border
            border-gray-800
            bg-green-500
            p-3
            text-white
          "
        >
          <div
            className="
              text-xs
              font-black
            "
          >
            BAJO · NR 1–2
          </div>

          <div
            className="
              mt-1
              text-[10px]
              font-medium
            "
          >
            Mantener controles y efectuar seguimiento.
          </div>
        </div>

        <div
          className="
            border
            border-gray-800
            bg-amber-400
            p-3
            text-gray-950
          "
        >
          <div
            className="
              text-xs
              font-black
            "
          >
            MODERADO · NR 3–4
          </div>

          <div
            className="
              mt-1
              text-[10px]
              font-medium
            "
          >
            Requiere tratamiento según su severidad.
          </div>
        </div>

        <div
          className="
            border
            border-gray-800
            bg-red-600
            p-3
            text-white
          "
        >
          <div
            className="
              text-xs
              font-black
            "
          >
            CRÍTICO · NR 6–9
          </div>

          <div
            className="
              mt-1
              text-[10px]
              font-medium
            "
          >
            Requiere intervención prioritaria.
          </div>
        </div>
      </div>

        {/* ====================================================
    DISTRIBUCIÓN DE RIESGOS POR NIVEL
    app/admin/pesv/riesgos/components/VistaMapaCalor.js
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
      Distribución de riesgos por nivel
    </div>

    <div
      className="
        mt-0.5
        text-[9px]
        text-slate-300
      "
    >
      Participación de cada nivel dentro de los riesgos valorados
    </div>
  </div>


  <div
    className="
      overflow-x-auto
    "
  >
    <table
      className="
        w-full
        text-xs
        border-collapse
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
              px-3
              py-2
              text-left
            "
          >
            Nivel
          </th>

          <th
            className="
              border
              border-gray-300
              px-3
              py-2
              text-center
            "
          >
            Cantidad
          </th>

          <th
            className="
              border
              border-gray-300
              px-3
              py-2
              text-center
            "
          >
            % del total
          </th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td
            className="
              border
              border-gray-300
              px-3
              py-2
            "
          >
            <span
              className="
                inline-flex
                border
                border-red-700
                bg-red-600
                text-white
                px-2
                py-1
                text-[10px]
                font-black
              "
            >
              CRÍTICO
            </span>
          </td>

          <td
            className="
              border
              border-gray-300
              px-3
              py-2
              text-center
              font-black
            "
          >
            {resumen.criticos}
          </td>

          <td
            className="
              border
              border-gray-300
              px-3
              py-2
              text-center
              font-black
            "
          >
            {porcentaje(
              resumen.criticos,
              resumen.total
            )}
          </td>
        </tr>


        <tr>
          <td
            className="
              border
              border-gray-300
              px-3
              py-2
            "
          >
            <span
              className="
                inline-flex
                border
                border-amber-500
                bg-amber-400
                text-gray-950
                px-2
                py-1
                text-[10px]
                font-black
              "
            >
              MODERADO
            </span>
          </td>

          <td
            className="
              border
              border-gray-300
              px-3
              py-2
              text-center
              font-black
            "
          >
            {resumen.moderados}
          </td>

          <td
            className="
              border
              border-gray-300
              px-3
              py-2
              text-center
              font-black
            "
          >
            {porcentaje(
              resumen.moderados,
              resumen.total
            )}
          </td>
        </tr>


        <tr>
          <td
            className="
              border
              border-gray-300
              px-3
              py-2
            "
          >
            <span
              className="
                inline-flex
                border
                border-green-600
                bg-green-500
                text-white
                px-2
                py-1
                text-[10px]
                font-black
              "
            >
              BAJO
            </span>
          </td>

          <td
            className="
              border
              border-gray-300
              px-3
              py-2
              text-center
              font-black
            "
          >
            {resumen.bajos}
          </td>

          <td
            className="
              border
              border-gray-300
              px-3
              py-2
              text-center
              font-black
            "
          >
            {porcentaje(
              resumen.bajos,
              resumen.total
            )}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

    {/* ====================================================
    RIESGOS PRIORIZADOS
    app/admin/pesv/riesgos/components/VistaMapaCalor.js
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
      Riesgos priorizados
    </div>

    <div
      className="
        mt-0.5
        text-[9px]
        text-slate-300
      "
    >
      Ordenados por prioridad de intervención y nivel de riesgo
    </div>
  </div>


  {riesgosPriorizados.length ===
  0 ? (
    <div
      className="
        p-4
        text-xs
        text-gray-500
        text-center
      "
    >
      No hay riesgos valorados para la vigencia seleccionada.
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
          min-w-[900px]
          text-xs
          border-collapse
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
              Riesgo
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
              Ver
            </th>
          </tr>
        </thead>

        <tbody>
          {riesgosPriorizados.map(
            riesgo => {
              const nr =
                Number(
                  riesgo.exposicion
                ) *
                Number(
                  riesgo.probabilidad
                )

              const nivel =
                nivelPorNr(
                  nr
                )

              return (
                <tr
                  key={
                    riesgo.id
                  }
                  className="
                    hover:bg-gray-50
                  "
                >
                  <td
                    className="
                      border
                      border-gray-300
                      px-2
                      py-2
                      text-center
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
                      text-gray-700
                    "
                  >
                    {texto(
                      riesgo.situacion_riesgo ||
                      riesgo.descripcion_riesgo
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
                      font-bold
                    "
                  >
                    {riesgo.exposicion}
                  </td>

                  <td
                    className="
                      border
                      border-gray-300
                      px-2
                      py-2
                      text-center
                      font-bold
                    "
                  >
                    {riesgo.probabilidad}
                  </td>

                  <td
                    className="
                      border
                      border-gray-300
                      px-2
                      py-2
                      text-center
                      font-black
                    "
                  >
                    {nr}
                  </td>

                  <td
                    className="
                      border
                      border-gray-300
                      px-2
                      py-2
                      text-center
                    "
                  >
                    <span
                      className={`
                        inline-flex
                        border
                        px-2
                        py-1
                        text-[9px]
                        font-black
                        ${claseNivel(
                          nivel
                        )}
                      `}
                    >
                      {nivel}
                    </span>
                  </td>

                  <td
                    className="
                      border
                      border-gray-300
                      px-2
                      py-2
                      text-center
                    "
                  >
                    {riesgo.severidad ||
                      '-'}
                  </td>

                  <td
                    className="
                      border
                      border-gray-300
                      px-2
                      py-2
                      text-center
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
                      {texto(
                        riesgo
                          .prioridad_intervencion
                      )
                        .replaceAll(
                          '_',
                          ' '
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
                      text-center
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
                        text-white
                        rounded
                        px-3
                        py-1
                        text-[9px]
                        font-black
                        hover:bg-blue-800
                      "
                    >
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
          ACLARACIÓN METODOLÓGICA
          app/admin/pesv/riesgos/components/VistaMapaCalor.js
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
        El nivel de riesgo se obtiene mediante Exposición ×
        Probabilidad. La severidad se valora de manera
        complementaria para determinar la prioridad de
        intervención y no se multiplica para calcular el NR.
      </div>


      {/* ====================================================
          DETALLE DEL RIESGO SELECCIONADO
          app/admin/pesv/riesgos/components/VistaMapaCalor.js
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
              items-center
              justify-between
              gap-3
            "
          >
            <div
              className="
                text-xs
                font-black
                uppercase
              "
            >
              {texto(
                riesgoSeleccionado.codigo
              ) ||
                `R-${riesgoSeleccionado.id}`}
              {' · '}
              Detalle del riesgo
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
              Cerrar
            </button>
          </div>


          <div
            className="
              p-3
              space-y-3
            "
          >
            <div
              className="
                grid
                grid-cols-2
                md:grid-cols-6
                gap-2
              "
            >
              <TarjetaDato
                titulo="Exposición"
                valor={
                  `${riesgoSeleccionado.exposicion} · ${nombreExposicion(
                    riesgoSeleccionado.exposicion
                  )}`
                }
              />

              <TarjetaDato
                titulo="Probabilidad"
                valor={
                  `${riesgoSeleccionado.probabilidad} · ${nombreProbabilidad(
                    riesgoSeleccionado.probabilidad
                  )}`
                }
              />

              <TarjetaDato
                titulo="NR"
                valor={
                  Number(
                    riesgoSeleccionado.exposicion
                  ) *
                  Number(
                    riesgoSeleccionado.probabilidad
                  )
                }
              />

              <TarjetaDato
                titulo="Nivel"
                valor={
                  nivelPorNr(
                    Number(
                      riesgoSeleccionado.exposicion
                    ) *
                    Number(
                      riesgoSeleccionado.probabilidad
                    )
                  )
                }
              />

              <TarjetaDato
                titulo="Severidad"
                valor={
                  riesgoSeleccionado.severidad ||
                  '-'
                }
              />

              <TarjetaDato
                titulo="Prioridad"
                valor={
                  texto(
                    riesgoSeleccionado.prioridad_intervencion
                  )
                    .replaceAll(
                      '_',
                      ' '
                    ) ||
                  '-'
                }
              />
            </div>


            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                gap-2
              "
            >
              <div
                className="
                  border
                  border-gray-200
                  rounded-lg
                  p-3
                  bg-white
                "
              >
                <div
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    text-gray-500
                  "
                >
                  Proceso
                </div>

                <div
                  className="
                    mt-1
                    text-xs
                    text-gray-800
                  "
                >
                  {texto(
                    riesgoSeleccionado.proceso
                  ) ||
                    '-'}
                </div>
              </div>

              <div
                className="
                  border
                  border-gray-200
                  rounded-lg
                  p-3
                  bg-white
                "
              >
                <div
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    text-gray-500
                  "
                >
                  Actividad
                </div>

                <div
                  className="
                    mt-1
                    text-xs
                    text-gray-800
                  "
                >
                  {texto(
                    riesgoSeleccionado.actividad
                  ) ||
                    '-'}
                </div>
              </div>
            </div>


            <div
              className="
                border
                border-gray-200
                rounded-lg
                p-3
              "
            >
              <div
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  text-gray-500
                "
              >
                Factor de riesgo
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
                  riesgoSeleccionado.factor_riesgo
                ) ||
                  '-'}
              </div>
            </div>


            <div
              className="
                border
                border-gray-200
                rounded-lg
                p-3
              "
            >
              <div
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  text-gray-500
                "
              >
                Situación de riesgo
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
                  riesgoSeleccionado.situacion_riesgo ||
                  riesgoSeleccionado.descripcion_riesgo
                ) ||
                  '-'}
              </div>
            </div>


            <div
              className="
                border
                border-gray-200
                rounded-lg
                p-3
              "
            >
              <div
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  text-gray-500
                "
              >
                Evento peligroso
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
                  riesgoSeleccionado.evento_peligroso
                ) ||
                  '-'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}