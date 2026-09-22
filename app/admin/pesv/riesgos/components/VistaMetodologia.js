// app/admin/pesv/riesgos/components/VistaMetodologia.js

'use client'


// ============================================================
// HELPERS
// app/admin/pesv/riesgos/components/VistaMetodologia.js
// ============================================================

function TarjetaEscala({
  codigo,
  titulo,
  descripcion,
  clase = '',
}) {
  return (
    <div
      className={`
        border
        border-gray-300
        rounded-lg
        bg-white
        p-3
        ${clase}
      `}
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
            min-w-10
            h-10
            flex
            items-center
            justify-center
            rounded-lg
            bg-slate-800
            text-white
            text-sm
            font-black
          "
        >
          {codigo}
        </div>

        <div
          className="
            min-w-0
          "
        >
          <div
            className="
              text-xs
              font-black
              text-gray-800
            "
          >
            {titulo}
          </div>

          <div
            className="
              mt-1
              text-[10px]
              leading-relaxed
              text-gray-600
            "
          >
            {descripcion}
          </div>
        </div>
      </div>
    </div>
  )
}


// ============================================================
// TARJETA DE PASO
// app/admin/pesv/riesgos/components/VistaMetodologia.js
// ============================================================

function TarjetaPaso({
  numero,
  titulo,
  descripcion,
}) {
  return (
    <div
      className="
        border
        border-gray-300
        rounded-lg
        bg-white
        p-3
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
            min-w-9
            h-9
            rounded-full
            bg-blue-700
            text-white
            flex
            items-center
            justify-center
            text-xs
            font-black
          "
        >
          {numero}
        </div>

        <div>
          <div
            className="
              text-xs
              font-black
              uppercase
              text-gray-800
            "
          >
            {titulo}
          </div>

          <div
            className="
              mt-1
              text-[10px]
              leading-relaxed
              text-gray-600
            "
          >
            {descripcion}
          </div>
        </div>
      </div>
    </div>
  )
}


// ============================================================
// ETIQUETA DE NIVEL
// app/admin/pesv/riesgos/components/VistaMetodologia.js
// ============================================================

function EtiquetaNivel({
  titulo,
  detalle,
  clase,
}) {
  return (
    <div
      className={`
        border
        rounded-lg
        p-3
        ${clase}
      `}
    >
      <div
        className="
          text-xs
          font-black
          uppercase
        "
      >
        {titulo}
      </div>

      <div
        className="
          mt-1
          text-[10px]
          leading-relaxed
        "
      >
        {detalle}
      </div>
    </div>
  )
}


// ============================================================
// VISTA METODOLOGÍA
// app/admin/pesv/riesgos/components/VistaMetodologia.js
// ============================================================

export default function VistaMetodologia({
  anio,
}) {
  return (
    <div
      className="
        space-y-4
      "
    >
      {/* ====================================================
          ENCABEZADO
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
            Metodología para la Gestión de Riesgos Viales
          </div>

          <div
            className="
              mt-1
              text-[10px]
              text-slate-300
            "
          >
            Vigencia {anio} · Identificación, análisis, valoración,
            tratamiento y seguimiento de riesgos PESV
          </div>
        </div>
      </div>


      {/* ====================================================
          OBJETIVO DE LA METODOLOGÍA
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
          Objetivo
        </div>

        <div
          className="
            mt-2
            text-[11px]
            leading-relaxed
            text-blue-900
          "
        >
          Establecer un criterio uniforme para identificar los
          escenarios de riesgo vial asociados a las actividades
          del CEA, analizar su exposición y probabilidad, valorar
          el nivel de riesgo, considerar la severidad de sus
          posibles consecuencias y determinar la prioridad de
          intervención correspondiente.
        </div>
      </div>


      {/* ====================================================
          ETAPAS DE LA GESTIÓN DEL RIESGO
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
            Etapas de la gestión del riesgo vial
          </div>
        </div>


        <div
          className="
            p-3
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-4
            gap-3
          "
        >
          <TarjetaPaso
            numero="1"
            titulo="Identificar"
            descripcion="Reconocer la actividad, contexto, actores expuestos, factor de riesgo, situación de riesgo y evento peligroso."
          />

          <TarjetaPaso
            numero="2"
            titulo="Analizar"
            descripcion="Determinar la frecuencia de exposición al escenario identificado y la posibilidad de materialización considerando los controles existentes."
          />

          <TarjetaPaso
            numero="3"
            titulo="Valorar"
            descripcion="Calcular el nivel de riesgo mediante Exposición × Probabilidad y complementar el análisis con la severidad de las posibles consecuencias."
          />

          <TarjetaPaso
            numero="4"
            titulo="Tratar y seguir"
            descripcion="Definir medidas de intervención, responsables y seguimiento, verificando posteriormente la eficacia de los controles implementados."
          />
        </div>
      </div>


      {/* ====================================================
          CONTEXTOS DE EXPOSICIÓN
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
            Contextos de exposición considerados
          </div>

          <div
            className="
              mt-0.5
              text-[9px]
              text-slate-300
            "
          >
            Escenarios propios de la operación y actividad vial del CEA
          </div>
        </div>


        <div
          className="
            p-3
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-4
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
              Formación práctica
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Actividades de enseñanza práctica de conducción en
              las que interactúan instructor, aprendiz, vehículo
              de enseñanza y entorno vial.
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
              Desplazamiento en misión
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Desplazamientos realizados por personal del CEA para
              actividades propias de la organización.
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
              In itinere
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Desplazamientos habituales entre el lugar de
              residencia y la sede o lugar de trabajo.
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
              Entorno de la sede
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Condiciones viales y de movilidad relacionadas con
              accesos, parqueaderos, circulación y entorno cercano
              a las instalaciones.
            </div>
          </div>
        </div>
      </div>


      {/* ====================================================
          ESCALA DE EXPOSICIÓN
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
            Escala de Exposición
          </div>

          <div
            className="
              mt-0.5
              text-[9px]
              text-slate-300
            "
          >
            Frecuencia con la que existe exposición al escenario específico de riesgo
          </div>
        </div>


        <div
          className="
            p-3
            grid
            grid-cols-1
            md:grid-cols-3
            gap-3
          "
        >
          <TarjetaEscala
            codigo="E1"
            titulo="Esporádica"
            descripcion="El escenario de riesgo se presenta de manera eventual o poco frecuente dentro de las actividades analizadas."
          />

          <TarjetaEscala
            codigo="E2"
            titulo="Ocasional"
            descripcion="El escenario de riesgo se presenta con cierta regularidad, aunque no de manera permanente o frecuente."
          />

          <TarjetaEscala
            codigo="E3"
            titulo="Frecuente"
            descripcion="El escenario de riesgo forma parte habitual o recurrente de las actividades desarrolladas."
          />
        </div>


        <div
          className="
            mx-3
            mb-3
            border
            border-amber-200
            rounded-lg
            bg-amber-50
            p-3
            text-[10px]
            leading-relaxed
            text-amber-900
          "
        >
          La exposición se determina respecto del escenario
          específico de riesgo identificado. No corresponde
          simplemente al número total de clases, vehículos o
          desplazamientos realizados.
        </div>
      </div>


      {/* ====================================================
          ESCALA DE PROBABILIDAD
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
            Escala de Probabilidad
          </div>

          <div
            className="
              mt-0.5
              text-[9px]
              text-slate-300
            "
          >
            Posibilidad de materialización del evento peligroso considerando los controles existentes
          </div>
        </div>


        <div
          className="
            p-3
            grid
            grid-cols-1
            md:grid-cols-3
            gap-3
          "
        >
          <TarjetaEscala
            codigo="P1"
            titulo="No es probable"
            descripcion="La materialización del evento peligroso no resulta probable bajo las condiciones analizadas y los controles existentes."
          />

          <TarjetaEscala
            codigo="P2"
            titulo="Poco probable"
            descripcion="Existe posibilidad de que el evento peligroso se materialice, aunque no se espera que ocurra con alta frecuencia."
          />

          <TarjetaEscala
            codigo="P3"
            titulo="Muy probable"
            descripcion="Las condiciones existentes hacen probable la materialización del evento peligroso."
          />
        </div>


        <div
          className="
            mx-3
            mb-3
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
          La probabilidad debe analizarse teniendo en cuenta los
          controles actualmente existentes. Una medida propuesta
          que todavía no ha sido implementada no debe utilizarse
          para disminuir la valoración del riesgo.
        </div>
      </div>


      {/* ====================================================
          CÁLCULO DEL NIVEL DE RIESGO
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
            Cálculo del Nivel de Riesgo
          </div>
        </div>


        <div
          className="
            p-4
          "
        >
          <div
            className="
              border
              border-gray-800
              rounded-lg
              bg-gray-50
              px-4
              py-5
              text-center
            "
          >
            <div
              className="
                text-[10px]
                uppercase
                font-bold
                text-gray-500
              "
            >
              Fórmula
            </div>

            <div
              className="
                mt-2
                text-2xl
                font-black
                text-gray-900
              "
            >
              NR = E × P
            </div>

            <div
              className="
                mt-2
                text-[10px]
                text-gray-600
              "
            >
              Nivel de Riesgo = Exposición × Probabilidad
            </div>
          </div>


          <div
            className="
              mt-3
              grid
              grid-cols-1
              md:grid-cols-3
              gap-3
            "
          >
            <EtiquetaNivel
              titulo="Bajo · NR 1–2"
              detalle="Mantener los controles existentes y efectuar seguimiento según corresponda."
              clase="
                bg-green-500
                border-green-700
                text-white
              "
            />

            <EtiquetaNivel
              titulo="Moderado · NR 3–4"
              detalle="Requiere tratamiento y seguimiento de acuerdo con la severidad y la prioridad resultante."
              clase="
                bg-amber-400
                border-amber-600
                text-gray-950
              "
            />

            <EtiquetaNivel
              titulo="Crítico · NR 6–9"
              detalle="Requiere intervención prioritaria y seguimiento sobre las medidas implementadas."
              clase="
                bg-red-600
                border-red-800
                text-white
              "
            />
          </div>
        </div>
      </div>


      {/* ====================================================
          MATRIZ DE VALORACIÓN
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
            Matriz de valoración Exposición × Probabilidad
          </div>
        </div>


        <div
          className="
            p-3
            overflow-x-auto
          "
        >
          <table
            className="
              w-full
              min-w-[650px]
              border-collapse
              text-xs
            "
          >
            <thead>
              <tr>
                <th
                  className="
                    border
                    border-gray-800
                    bg-slate-700
                    text-white
                    px-3
                    py-3
                    text-center
                  "
                >
                  Exposición × Probabilidad
                </th>

                <th
                  className="
                    border
                    border-gray-800
                    bg-gray-200
                    px-3
                    py-3
                    text-center
                  "
                >
                  P1
                  <div
                    className="
                      mt-1
                      text-[9px]
                      font-medium
                      text-gray-600
                    "
                  >
                    No es probable
                  </div>
                </th>

                <th
                  className="
                    border
                    border-gray-800
                    bg-gray-200
                    px-3
                    py-3
                    text-center
                  "
                >
                  P2
                  <div
                    className="
                      mt-1
                      text-[9px]
                      font-medium
                      text-gray-600
                    "
                  >
                    Poco probable
                  </div>
                </th>

                <th
                  className="
                    border
                    border-gray-800
                    bg-gray-200
                    px-3
                    py-3
                    text-center
                  "
                >
                  P3
                  <div
                    className="
                      mt-1
                      text-[9px]
                      font-medium
                      text-gray-600
                    "
                  >
                    Muy probable
                  </div>
                </th>
              </tr>
            </thead>


            <tbody>
              <tr>
                <th
                  className="
                    border
                    border-gray-800
                    bg-gray-200
                    px-3
                    py-3
                    text-center
                  "
                >
                  E3
                  <div
                    className="
                      mt-1
                      text-[9px]
                      font-medium
                      text-gray-600
                    "
                  >
                    Frecuente
                  </div>
                </th>

                <td
                  className="
                    border
                    border-gray-800
                    bg-amber-400
                    px-3
                    py-5
                    text-center
                    font-black
                  "
                >
                  3 · MODERADO
                </td>

                <td
                  className="
                    border
                    border-gray-800
                    bg-red-600
                    text-white
                    px-3
                    py-5
                    text-center
                    font-black
                  "
                >
                  6 · CRÍTICO
                </td>

                <td
                  className="
                    border
                    border-gray-800
                    bg-red-600
                    text-white
                    px-3
                    py-5
                    text-center
                    font-black
                  "
                >
                  9 · CRÍTICO
                </td>
              </tr>


              <tr>
                <th
                  className="
                    border
                    border-gray-800
                    bg-gray-200
                    px-3
                    py-3
                    text-center
                  "
                >
                  E2
                  <div
                    className="
                      mt-1
                      text-[9px]
                      font-medium
                      text-gray-600
                    "
                  >
                    Ocasional
                  </div>
                </th>

                <td
                  className="
                    border
                    border-gray-800
                    bg-green-500
                    text-white
                    px-3
                    py-5
                    text-center
                    font-black
                  "
                >
                  2 · BAJO
                </td>

                <td
                  className="
                    border
                    border-gray-800
                    bg-amber-400
                    px-3
                    py-5
                    text-center
                    font-black
                  "
                >
                  4 · MODERADO
                </td>

                <td
                  className="
                    border
                    border-gray-800
                    bg-red-600
                    text-white
                    px-3
                    py-5
                    text-center
                    font-black
                  "
                >
                  6 · CRÍTICO
                </td>
              </tr>


              <tr>
                <th
                  className="
                    border
                    border-gray-800
                    bg-gray-200
                    px-3
                    py-3
                    text-center
                  "
                >
                  E1
                  <div
                    className="
                      mt-1
                      text-[9px]
                      font-medium
                      text-gray-600
                    "
                  >
                    Esporádica
                  </div>
                </th>

                <td
                  className="
                    border
                    border-gray-800
                    bg-green-500
                    text-white
                    px-3
                    py-5
                    text-center
                    font-black
                  "
                >
                  1 · BAJO
                </td>

                <td
                  className="
                    border
                    border-gray-800
                    bg-green-500
                    text-white
                    px-3
                    py-5
                    text-center
                    font-black
                  "
                >
                  2 · BAJO
                </td>

                <td
                  className="
                    border
                    border-gray-800
                    bg-amber-400
                    px-3
                    py-5
                    text-center
                    font-black
                  "
                >
                  3 · MODERADO
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>


      {/* ====================================================
          ESCALA DE SEVERIDAD
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
            Escala de Severidad
          </div>

          <div
            className="
              mt-0.5
              text-[9px]
              text-slate-300
            "
          >
            Magnitud potencial de las consecuencias
          </div>
        </div>


        <div
          className="
            p-3
            grid
            grid-cols-1
            md:grid-cols-3
            gap-3
          "
        >
          <TarjetaEscala
            codigo="S1"
            titulo="Leve"
            descripcion="Consecuencia de menor impacto para las personas, bienes, operación o entorno."
          />

          <TarjetaEscala
            codigo="S2"
            titulo="Grave"
            descripcion="Consecuencia con afectación significativa que requiere una intervención y control reforzado."
          />

          <TarjetaEscala
            codigo="S3"
            titulo="Muy grave"
            descripcion="Consecuencia de alta gravedad potencial para las personas, la operación, los bienes o el entorno."
          />
        </div>


        <div
          className="
            mx-3
            mb-3
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
          La severidad complementa la valoración para determinar
          la prioridad de intervención. No se multiplica por la
          exposición ni por la probabilidad para obtener el NR.
        </div>
      </div>


      {/* ====================================================
          PRIORIDAD DE INTERVENCIÓN
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
            Determinación de la prioridad de intervención
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
              min-w-[800px]
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
                    px-3
                    py-2
                    text-left
                  "
                >
                  Nivel de riesgo
                </th>

                <th
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-left
                  "
                >
                  Severidad
                </th>

                <th
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-left
                  "
                >
                  Prioridad resultante
                </th>

                <th
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-left
                  "
                >
                  Criterio
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
                    font-black
                    text-red-700
                  "
                >
                  CRÍTICO
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                  "
                >
                  S1, S2 o S3
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    font-black
                  "
                >
                  PRIORITARIA
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                  "
                >
                  Requiere intervención prioritaria independientemente
                  de la severidad complementaria.
                </td>
              </tr>


              <tr>
                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    font-black
                    text-amber-700
                  "
                >
                  MODERADO
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                  "
                >
                  S3
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    font-black
                  "
                >
                  PRIORITARIA
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                  "
                >
                  La alta severidad potencial eleva la prioridad
                  de intervención.
                </td>
              </tr>


              <tr>
                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    font-black
                    text-amber-700
                  "
                >
                  MODERADO
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                  "
                >
                  S1 o S2
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    font-black
                  "
                >
                  PROGRAMADA
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                  "
                >
                  Requiere intervención planificada y seguimiento.
                </td>
              </tr>


              <tr>
                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    font-black
                    text-green-700
                  "
                >
                  BAJO
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                  "
                >
                  S3
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    font-black
                  "
                >
                  PRIORITARIA PREVENTIVA
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                  "
                >
                  Aunque el NR sea bajo, la consecuencia potencial
                  exige una gestión preventiva reforzada.
                </td>
              </tr>


              <tr>
                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    font-black
                    text-green-700
                  "
                >
                  BAJO
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                  "
                >
                  S2
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    font-black
                  "
                >
                  SEGUIMIENTO
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                  "
                >
                  Mantener los controles y verificar periódicamente
                  su comportamiento.
                </td>
              </tr>


              <tr>
                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    font-black
                    text-green-700
                  "
                >
                  BAJO
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                  "
                >
                  S1
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                    font-black
                  "
                >
                  MANTENER CONTROLES
                </td>

                <td
                  className="
                    border
                    border-gray-300
                    px-3
                    py-2
                  "
                >
                  Conservar los controles existentes y vigilar que
                  continúen siendo eficaces.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>


      {/* ====================================================
          TRATAMIENTO DEL RIESGO
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
            Tratamiento del riesgo
          </div>
        </div>


        <div
          className="
            p-3
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-4
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
                text-gray-800
              "
            >
              Controles existentes
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Medidas que ya se encuentran aplicadas al momento de
              realizar la valoración del riesgo.
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
                text-gray-800
              "
            >
              Medidas propuestas
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Acciones definidas para reducir la exposición,
              probabilidad o consecuencias del escenario de riesgo.
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
                text-gray-800
              "
            >
              Implementación
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Las medidas propuestas deben contar con responsable,
              plazo, estado y evidencia según corresponda.
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
                text-gray-800
              "
            >
              Verificación
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              La eficacia de las medidas debe revisarse en los
              seguimientos posteriores del riesgo.
            </div>
          </div>
        </div>
      </div>


      {/* ====================================================
          VALORACIONES POSTERIORES
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
            Seguimiento y valoraciones posteriores
          </div>
        </div>


        <div
          className="
            p-3
            grid
            grid-cols-1
            md:grid-cols-3
            gap-3
          "
        >
          <div
            className="
              border
              border-blue-200
              rounded-lg
              bg-blue-50
              p-3
            "
          >
            <div
              className="
                text-[10px]
                font-black
                uppercase
                text-blue-900
              "
            >
              Seguimiento
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-blue-900
              "
            >
              Verifica el comportamiento del riesgo y el avance de
              los controles o acciones implementadas.
            </div>
          </div>


          <div
            className="
              border
              border-purple-200
              rounded-lg
              bg-purple-50
              p-3
            "
          >
            <div
              className="
                text-[10px]
                font-black
                uppercase
                text-purple-900
              "
            >
              Revaloración
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-purple-900
              "
            >
              Permite volver a valorar el escenario cuando existen
              cambios relevantes en sus condiciones.
            </div>
          </div>


          <div
            className="
              border
              border-green-200
              rounded-lg
              bg-green-50
              p-3
            "
          >
            <div
              className="
                text-[10px]
                font-black
                uppercase
                text-green-900
              "
            >
              Riesgo residual
            </div>

            <div
              className="
                mt-1
                text-[10px]
                leading-relaxed
                text-green-900
              "
            >
              Corresponde a la valoración posterior a la
              implementación efectiva de medidas de control. Solo
              deben considerarse controles que realmente estén
              activos o implementados.
            </div>
          </div>
        </div>
      </div>


      {/* ====================================================
          PRINCIPIOS DE APLICACIÓN
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
            Principios para la aplicación de la metodología
          </div>
        </div>


        <div
          className="
            p-4
          "
        >
          <ul
            className="
              space-y-2
              text-[10px]
              leading-relaxed
              text-gray-700
            "
          >
            <li
              className="
                flex
                gap-2
              "
            >
              <span
                className="
                  font-black
                  text-blue-700
                "
              >
                01.
              </span>

              <span>
                Cada valoración debe corresponder a un escenario
                concreto y claramente descrito.
              </span>
            </li>

            <li
              className="
                flex
                gap-2
              "
            >
              <span
                className="
                  font-black
                  text-blue-700
                "
              >
                02.
              </span>

              <span>
                La exposición se determina según la frecuencia del
                escenario de riesgo, no únicamente por el volumen
                general de actividades del CEA.
              </span>
            </li>

            <li
              className="
                flex
                gap-2
              "
            >
              <span
                className="
                  font-black
                  text-blue-700
                "
              >
                03.
              </span>

              <span>
                La probabilidad debe valorar la posibilidad de
                materialización del evento peligroso considerando
                los controles realmente existentes.
              </span>
            </li>

            <li
              className="
                flex
                gap-2
              "
            >
              <span
                className="
                  font-black
                  text-blue-700
                "
              >
                04.
              </span>

              <span>
                Las medidas pendientes o solamente propuestas no
                pueden utilizarse para justificar una disminución
                del riesgo residual.
              </span>
            </li>

            <li
              className="
                flex
                gap-2
              "
            >
              <span
                className="
                  font-black
                  text-blue-700
                "
              >
                05.
              </span>

              <span>
                La severidad complementa el análisis y determina,
                junto con el nivel de riesgo, la prioridad de
                intervención.
              </span>
            </li>

            <li
              className="
                flex
                gap-2
              "
            >
              <span
                className="
                  font-black
                  text-blue-700
                "
              >
                06.
              </span>

              <span>
                Toda valoración posterior debe conservar trazabilidad
                respecto de la valoración inicial y de los controles
                considerados.
              </span>
            </li>
          </ul>
        </div>
      </div>


      {/* ====================================================
          NOTA FINAL
          app/admin/pesv/riesgos/components/VistaMetodologia.js
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
        Esta metodología es la utilizada por el módulo de Riesgos
        PESV para la valoración inicial, la representación en el
        mapa de calor, la determinación de la prioridad de
        intervención y las valoraciones posteriores registradas
        mediante seguimiento.
      </div>
    </div>
  )
}