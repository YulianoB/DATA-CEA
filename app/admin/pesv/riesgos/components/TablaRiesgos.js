// app/admin/pesv/riesgos/components/TablaRiesgos.js

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function nivelClase(
  nivel
) {
  const valor =
    texto(
      nivel
    )
      .toUpperCase()

  if (
    valor ===
    'CRITICO'
  ) {
    return 'bg-red-100 text-red-800 border-red-200'
  }

  if (
    valor ===
    'MODERADO'
  ) {
    return 'bg-amber-100 text-amber-800 border-amber-200'
  }

  return 'bg-green-100 text-green-800 border-green-200'
}


export default function TablaRiesgos({
  anio,
  riesgos,
  filtroTexto,
  filtroNivel,
  cambiarFiltroTexto,
  cambiarFiltroNivel,
  ver,
  editar,
  eliminar,
}) {
  return (
    <section
      className="
        border
        border-gray-300
        rounded-xl
        overflow-hidden
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
            text-[11px]
            font-black
            uppercase
          "
        >
          Riesgos identificados · {anio}
        </div>

        <div
          className="
            text-[9px]
            text-slate-300
          "
        >
          Valoración inicial registrada para la vigencia seleccionada.
        </div>
      </div>


      <div
        className="
          bg-gray-50
          border-b
          border-gray-200
          p-3
        "
      >
        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-12
            gap-2
          "
        >
          <div
            className="
              md:col-span-9
            "
          >
            <input
              value={
                filtroTexto
              }
              onChange={
                event =>
                  cambiarFiltroTexto(
                    event.target.value
                  )
              }
              placeholder="Buscar código, actividad, factor de riesgo, situación, evento peligroso..."
              className="
                w-full
                border
                border-gray-300
                rounded
                px-3
                py-2
                text-xs
                bg-white
              "
            />
          </div>

          <div
            className="
              md:col-span-3
            "
          >
            <select
              value={
                filtroNivel
              }
              onChange={
                event =>
                  cambiarFiltroNivel(
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                rounded
                px-3
                py-2
                text-xs
                bg-white
              "
            >
              <option value="">
                Todos los niveles
              </option>

              <option value="CRITICO">
                CRÍTICO
              </option>

              <option value="MODERADO">
                MODERADO
              </option>

              <option value="BAJO">
                BAJO
              </option>
            </select>
          </div>
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
            min-w-[1650px]
            text-[10px]
          "
        >
          <thead
            className="
              bg-blue-50
              border-b
              border-blue-200
              text-blue-900
              uppercase
            "
          >
            <tr>
              <th className="px-3 py-2 text-left">
                Código
              </th>

              <th className="px-3 py-2 text-left">
                Proceso / Actividad
              </th>

              <th className="px-3 py-2 text-left">
                Situación / Evento peligroso
              </th>

              <th className="px-3 py-2 text-center">
                E
              </th>

              <th className="px-3 py-2 text-center">
                P
              </th>

              <th className="px-3 py-2 text-center">
                NR
              </th>

              <th className="px-3 py-2 text-center">
                Nivel
              </th>

              <th className="px-3 py-2 text-center">
                S
              </th>

              <th className="px-3 py-2 text-center">
                Prioridad
              </th>

              <th className="px-3 py-2 text-left">
                Programas
              </th>

              <th className="px-3 py-2 text-left">
                Responsable
              </th>

              <th className="px-3 py-2 text-center">
                Estado
              </th>

              <th className="px-3 py-2 text-center">
                Acciones
              </th>
            </tr>
          </thead>


          <tbody>
            {riesgos.length ===
            0 ? (
              <tr>
                <td
                  colSpan={13}
                  className="
                    py-10
                    text-center
                    text-gray-500
                  "
                >
                  No existen riesgos registrados para esta vigencia.
                </td>
              </tr>
            ) : (
              riesgos.map(
                riesgo => (
                  <tr
                    key={
                      riesgo.id
                    }
                    className="
                      border-b
                      border-gray-200
                      hover:bg-blue-50/50
                    "
                  >
                    <td
                      className="
                        px-3
                        py-2
                        align-top
                        font-black
                        text-blue-900
                      "
                    >
                      {riesgo.codigo}
                    </td>

                    <td
                      className="
                        px-3
                        py-2
                        align-top
                        max-w-[280px]
                      "
                    >
                      <div
                        className="
                          font-bold
                        "
                      >
                        {riesgo.proceso ||
                          '-'}
                      </div>

                      <div
                        className="
                          mt-1
                          text-gray-600
                        "
                      >
                        {riesgo.actividad ||
                          '-'}
                      </div>

                      <div
                        className="
                          mt-1
                          text-[9px]
                          text-gray-400
                        "
                      >
                        {texto(
                          riesgo.contexto_exposicion
                        )
                          .replaceAll(
                            '_',
                            ' '
                          )}
                      </div>
                    </td>

                    <td
                      className="
                        px-3
                        py-2
                        align-top
                        max-w-[440px]
                      "
                    >
                      <div>
                        {riesgo.situacion_riesgo ||
                          riesgo.descripcion_riesgo ||
                          '-'}
                      </div>

                      {riesgo.evento_peligroso && (
                        <div
                          className="
                            mt-1
                            border-t
                            border-gray-200
                            pt-1
                            text-[9px]
                            text-red-700
                          "
                        >
                          <strong>
                            Evento:
                          </strong>{' '}

                          {riesgo.evento_peligroso}
                        </div>
                      )}
                    </td>

                    <td
                      className="
                        px-3
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
                        px-3
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
                        px-3
                        py-2
                        text-center
                        align-top
                        font-black
                      "
                    >
                      {riesgo.valor_nivel_riesgo ||
                        '-'}
                    </td>

                    <td
                      className="
                        px-3
                        py-2
                        text-center
                        align-top
                      "
                    >
                      <span
                        className={`
                          inline-flex
                          border
                          rounded-full
                          px-2
                          py-0.5
                          font-black
                          ${nivelClase(
                            riesgo.nivel_riesgo
                          )}
                        `}
                      >
                        {riesgo.nivel_riesgo ||
                          '-'}
                      </span>
                    </td>

                    <td
                      className="
                        px-3
                        py-2
                        text-center
                        align-top
                        font-black
                      "
                    >
                      {riesgo.severidad ||
                        '-'}
                    </td>

                    <td
                      className="
                        px-3
                        py-2
                        text-center
                        align-top
                        text-[9px]
                        font-bold
                      "
                    >
                      {texto(
                        riesgo.prioridad_intervencion
                      )
                        .replaceAll(
                          '_',
                          ' '
                        ) ||
                        '-'}
                    </td>

                    <td
                      className="
                        px-3
                        py-2
                        align-top
                        max-w-[260px]
                      "
                    >
                      {Array.isArray(
                        riesgo.programas
                      ) &&
                      riesgo.programas.length ? (
                        <div
                          className="
                            flex
                            flex-wrap
                            gap-1
                          "
                        >
                          {riesgo.programas.map(
                            programa => (
                              <span
                                key={
                                  programa.id
                                }
                                className="
                                  inline-flex
                                  bg-blue-50
                                  border
                                  border-blue-200
                                  text-blue-800
                                  rounded
                                  px-1.5
                                  py-0.5
                                  text-[8px]
                                "
                              >
                                {programa.nombre}
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td
                      className="
                        px-3
                        py-2
                        align-top
                      "
                    >
                      {riesgo.responsable_nombre ||
                        '-'}
                    </td>

                    <td
                      className="
                        px-3
                        py-2
                        text-center
                        align-top
                      "
                    >
                      {texto(
                        riesgo.estado
                      )
                        .replaceAll(
                          '_',
                          ' '
                        )}
                    </td>

                    <td
                      className="
                        px-3
                        py-2
                        align-top
                      "
                    >
                      <div
                        className="
                          flex
                          justify-center
                          gap-1
                        "
                      >
                        <button
                            type="button"
                            onClick={() =>
                                ver(
                                riesgo
                                )
                            }
                            className="
                                bg-slate-50
                                hover:bg-slate-100
                                text-slate-700
                                border
                                border-slate-200
                                rounded
                                w-8
                                h-8
                            "
                            title="Ver detalle del riesgo"
                            >
                            <i
                                className="
                                fas
                                fa-eye
                                "
                            ></i>
                            </button>
                        <button
                          type="button"
                          onClick={() =>
                            editar(
                              riesgo
                            )
                          }
                          className="
                            bg-blue-50
                            hover:bg-blue-100
                            text-blue-800
                            border
                            border-blue-200
                            rounded
                            w-8
                            h-8
                          "
                          title="Editar riesgo"
                        >
                          <i
                            className="
                              fas
                              fa-edit
                            "
                          ></i>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            eliminar(
                              riesgo
                            )
                          }
                          className="
                            bg-red-50
                            hover:bg-red-100
                            text-red-700
                            border
                            border-red-200
                            rounded
                            w-8
                            h-8
                          "
                          title="Eliminar riesgo"
                        >
                          <i
                            className="
                              fas
                              fa-trash
                            "
                          ></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}