// app/admin/pesv/riesgos/components/ModalDetalleRiesgo.js

'use client'

import {
  useEffect,
  useState,
} from 'react'

import FormularioMedida
  from './FormularioMedida'

import ListaMedidasRiesgo
  from './ListaMedidasRiesgo'


function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function mostrar(
  valor
) {
  return texto(
    valor
  ) || '-'
}


function formatoContexto(
  valor
) {
  return mostrar(
    valor
  ).replaceAll(
    '_',
    ' '
  )
}


function nivelClase(
  nivel
) {
  const valor =
    texto(
      nivel
    ).toUpperCase()

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


function prioridadClase(
  prioridad
) {
  const valor =
    texto(
      prioridad
    ).toUpperCase()

  if (
    valor ===
      'PRIORITARIA' ||
    valor ===
      'PRIORITARIA_PREVENTIVA'
  ) {
    return 'bg-red-50 text-red-800 border-red-200'
  }

  if (
    valor ===
    'PROGRAMADA'
  ) {
    return 'bg-amber-50 text-amber-800 border-amber-200'
  }

  return 'bg-slate-50 text-slate-700 border-slate-200'
}


function Campo({
  titulo,
  valor,
  className = '',
}) {
  return (
    <div
      className={`
        border
        border-gray-200
        rounded-lg
        bg-white
        px-3
        py-2
        ${className}
      `}
    >
      <div
        className="
          text-[9px]
          font-black
          uppercase
          tracking-wide
          text-gray-500
          mb-1
        "
      >
        {titulo}
      </div>

      <div
        className="
          text-[11px]
          text-gray-800
          whitespace-pre-wrap
          leading-relaxed
        "
      >
        {mostrar(
          valor
        )}
      </div>
    </div>
  )
}


function TituloSeccion({
  icono,
  titulo,
  descripcion,
}) {
  return (
    <div
      className="
        border-b
        border-gray-200
        pb-2
        mb-3
        flex
        items-start
        gap-2
      "
    >
      <div
        className="
          w-7
          h-7
          rounded-lg
          bg-slate-100
          text-slate-700
          flex
          items-center
          justify-center
          shrink-0
        "
      >
        <i
          className={
            icono
          }
        ></i>
      </div>

      <div>
        <div
          className="
            text-[11px]
            font-black
            uppercase
            text-slate-800
          "
        >
          {titulo}
        </div>

        {descripcion && (
          <div
            className="
              text-[9px]
              text-gray-500
              mt-0.5
            "
          >
            {descripcion}
          </div>
        )}
      </div>
    </div>
  )
}


export default function ModalDetalleRiesgo({
  riesgo,
  cerrar,
  editar,
  personal,
  metodologia,
  guardando,
  guardarMedida,
  eliminarMedida,
}) {
  const [
    mostrarFormularioMedida,
    setMostrarFormularioMedida,
  ] =
    useState(false)

  const [
    medidaEditando,
    setMedidaEditando,
  ] =
    useState(null)


  useEffect(
    () => {
      setMostrarFormularioMedida(
        false
      )

      setMedidaEditando(
        null
      )
    },
    [
      riesgo?.id,
    ]
  )


  if (!riesgo) {
    return null
  }


  function nuevaMedida() {
    setMedidaEditando(
      null
    )

    setMostrarFormularioMedida(
      true
    )
  }


  function editarMedida(
    medida
  ) {
    setMedidaEditando(
      medida
    )

    setMostrarFormularioMedida(
      true
    )
  }


  function cancelarMedida() {
    setMedidaEditando(
      null
    )

    setMostrarFormularioMedida(
      false
    )
  }


  async function guardarMedidaFormulario(
    formulario
  ) {
    const resultado =
      await guardarMedida(
        formulario
      )

    if (
      resultado !==
      false
    ) {
      cancelarMedida()
    }
  }


  const programas =
    Array.isArray(
      riesgo.programas
    )
      ? riesgo.programas
      : []


  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        bg-black/50
        p-3
        md:p-6
        flex
        items-center
        justify-center
      "
      onMouseDown={
        event => {
          if (
            event.target ===
            event.currentTarget
          ) {
            cerrar()
          }
        }
      }
    >
      <div
        className="
          bg-white
          w-full
          max-w-[1250px]
          max-h-[94vh]
          rounded-xl
          shadow-2xl
          overflow-hidden
          flex
          flex-col
        "
      >
        {/* ==============================================
            ENCABEZADO
        ============================================== */}

        <div
          className="
            bg-slate-800
            text-white
            px-4
            py-3
            flex
            justify-between
            items-start
            gap-3
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
                w-9
                h-9
                rounded-lg
                bg-white/10
                flex
                items-center
                justify-center
                shrink-0
              "
            >
              <i
                className="
                  fas
                  fa-triangle-exclamation
                "
              ></i>
            </div>

            <div>
              <div
                className="
                  text-[9px]
                  uppercase
                  text-slate-300
                  font-bold
                "
              >
                Detalle del riesgo
              </div>

              <div
                className="
                  text-base
                  font-black
                "
              >
                {mostrar(
                  riesgo.codigo
                )}
              </div>

              <div
                className="
                  text-[10px]
                  text-slate-300
                  mt-0.5
                "
              >
                {mostrar(
                  riesgo.factor_riesgo
                )}
              </div>
            </div>
          </div>


          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <button
              type="button"
              onClick={() => {
                cerrar()

                editar(
                  riesgo
                )
              }}
              className="
                bg-blue-600
                hover:bg-blue-700
                border
                border-blue-500
                rounded
                px-3
                py-1.5
                text-[10px]
                font-bold
              "
            >
              <i
                className="
                  fas
                  fa-edit
                  mr-1.5
                "
              ></i>

              Editar
            </button>

            <button
              type="button"
              onClick={
                cerrar
              }
              className="
                bg-white/10
                hover:bg-white/20
                border
                border-white/20
                rounded
                w-8
                h-8
              "
              title="Cerrar"
            >
              <i
                className="
                  fas
                  fa-xmark
                "
              ></i>
            </button>
          </div>
        </div>


        {/* ==============================================
            CONTENIDO CON SCROLL
        ============================================== */}

        <div
          className="
            flex-1
            min-h-0
            overflow-y-auto
            p-4
            bg-gray-50
            space-y-4
          "
        >
          {/* IDENTIFICACIÓN */}

          <section
            className="
              bg-white
              border
              border-gray-200
              rounded-xl
              p-3
            "
          >
            <TituloSeccion
              icono="fas fa-id-card"
              titulo="1. Identificación del riesgo"
              descripcion="Información básica y contexto en el que se presenta el riesgo."
            />

            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-12
                gap-2
              "
            >
              <Campo
                titulo="Código"
                valor={
                  riesgo.codigo
                }
                className="md:col-span-2"
              />

              <Campo
                titulo="Fecha de identificación"
                valor={
                  riesgo.fecha_identificacion
                }
                className="md:col-span-2"
              />

              <Campo
                titulo="Proceso"
                valor={
                  riesgo.proceso
                }
                className="md:col-span-4"
              />

              <Campo
                titulo="Contexto"
                valor={
                  formatoContexto(
                    riesgo.contexto_exposicion
                  )
                }
                className="md:col-span-4"
              />

              <Campo
                titulo="Actividad"
                valor={
                  riesgo.actividad
                }
                className="md:col-span-6"
              />

              <Campo
                titulo="Actores expuestos"
                valor={
                  riesgo.actores_expuestos
                }
                className="md:col-span-6"
              />

              <Campo
                titulo="Factor de riesgo"
                valor={
                  riesgo.factor_riesgo
                }
                className="md:col-span-6"
              />

              <Campo
                titulo="Fuente de identificación"
                valor={
                  riesgo.fuente_identificacion
                }
                className="md:col-span-6"
              />
            </div>
          </section>


          {/* ANÁLISIS */}

          <section
            className="
              bg-white
              border
              border-gray-200
              rounded-xl
              p-3
            "
          >
            <TituloSeccion
              icono="fas fa-magnifying-glass"
              titulo="2. Análisis del riesgo"
              descripcion="Diferencia la situación de exposición, el evento peligroso y sus posibles consecuencias."
            />

            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                gap-2
              "
            >
              <Campo
                titulo="Situación de riesgo"
                valor={
                  riesgo.situacion_riesgo ||
                  riesgo.descripcion_riesgo
                }
                className="md:col-span-2"
              />

              <Campo
                titulo="Evento peligroso / materialización"
                valor={
                  riesgo.evento_peligroso
                }
                className="md:col-span-2"
              />

              <Campo
                titulo="Causas"
                valor={
                  riesgo.causa
                }
              />

              <Campo
                titulo="Consecuencias"
                valor={
                  riesgo.consecuencia
                }
              />
            </div>
          </section>


          {/* CONTROLES */}

          <section
            className="
              bg-white
              border
              border-gray-200
              rounded-xl
              p-3
            "
          >
            <TituloSeccion
              icono="fas fa-shield-halved"
              titulo="3. Controles existentes"
              descripcion="Controles considerados al momento de realizar la valoración inicial."
            />

            <Campo
              titulo="Controles existentes"
              valor={
                riesgo.control_existente
              }
            />

            <div
              className="
                mt-2
                grid
                grid-cols-1
                md:grid-cols-2
                gap-2
              "
            >
              <Campo
                titulo="Antecedentes considerados"
                valor={
                  riesgo.antecedentes_considerados
                }
              />

              <Campo
                titulo="Eficacia de los controles"
                valor={
                  riesgo.eficacia_controles
                }
              />
            </div>
          </section>


          {/* VALORACIÓN */}

          <section
            className="
              bg-white
              border
              border-gray-200
              rounded-xl
              p-3
            "
          >
            <TituloSeccion
              icono="fas fa-chart-simple"
              titulo="4. Valoración inicial"
              descripcion="NR = Exposición × Probabilidad. La severidad complementa la priorización y no se multiplica por el NR."
            />

            <div
              className="
                grid
                grid-cols-2
                md:grid-cols-6
                gap-2
              "
            >
              <div
                className="
                  border
                  border-blue-200
                  bg-blue-50
                  rounded-lg
                  p-3
                  text-center
                "
              >
                <div
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    text-blue-700
                  "
                >
                  Exposición
                </div>

                <div
                  className="
                    text-2xl
                    font-black
                    text-blue-900
                  "
                >
                  {mostrar(
                    riesgo.exposicion
                  )}
                </div>
              </div>


              <div
                className="
                  border
                  border-indigo-200
                  bg-indigo-50
                  rounded-lg
                  p-3
                  text-center
                "
              >
                <div
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    text-indigo-700
                  "
                >
                  Probabilidad
                </div>

                <div
                  className="
                    text-2xl
                    font-black
                    text-indigo-900
                  "
                >
                  {mostrar(
                    riesgo.probabilidad
                  )}
                </div>
              </div>


              <div
                className="
                  border
                  border-gray-200
                  bg-gray-50
                  rounded-lg
                  p-3
                  text-center
                "
              >
                <div
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    text-gray-600
                  "
                >
                  NR
                </div>

                <div
                  className="
                    text-2xl
                    font-black
                    text-gray-900
                  "
                >
                  {mostrar(
                    riesgo.valor_nivel_riesgo
                  )}
                </div>
              </div>


              <div
                className="
                  border
                  border-gray-200
                  rounded-lg
                  p-3
                  flex
                  items-center
                  justify-center
                "
              >
                <span
                  className={`
                    inline-flex
                    border
                    rounded-full
                    px-3
                    py-1
                    text-[10px]
                    font-black
                    ${nivelClase(
                      riesgo.nivel_riesgo
                    )}
                  `}
                >
                  {mostrar(
                    riesgo.nivel_riesgo
                  )}
                </span>
              </div>


              <div
                className="
                  border
                  border-purple-200
                  bg-purple-50
                  rounded-lg
                  p-3
                  text-center
                "
              >
                <div
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    text-purple-700
                  "
                >
                  Severidad
                </div>

                <div
                  className="
                    text-2xl
                    font-black
                    text-purple-900
                  "
                >
                  {mostrar(
                    riesgo.severidad
                  )}
                </div>
              </div>


              <div
                className="
                  border
                  border-gray-200
                  rounded-lg
                  p-3
                  flex
                  items-center
                  justify-center
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
                    ${prioridadClase(
                      riesgo.prioridad_intervencion
                    )}
                  `}
                >
                  {formatoContexto(
                    riesgo.prioridad_intervencion
                  )}
                </span>
              </div>
            </div>


            <div
              className="
                mt-3
                grid
                grid-cols-1
                md:grid-cols-3
                gap-2
              "
            >
              <Campo
                titulo="Justificación de la exposición"
                valor={
                  riesgo.justificacion_exposicion
                }
              />

              <Campo
                titulo="Justificación de la probabilidad"
                valor={
                  riesgo.justificacion_probabilidad
                }
              />

              <Campo
                titulo="Justificación de la severidad"
                valor={
                  riesgo.justificacion_severidad
                }
              />
            </div>
          </section>


          {/* TRATAMIENTO */}

          <section
            className="
              bg-white
              border
              border-gray-200
              rounded-xl
              p-3
            "
          >
            <TituloSeccion
              icono="fas fa-screwdriver-wrench"
              titulo="5. Tratamiento del riesgo"
              descripcion="Orientación general y acción propuesta para intervenir el riesgo identificado."
            />

            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                gap-2
              "
            >
              <Campo
                titulo="Tratamiento"
                valor={
                  riesgo.tratamiento
                }
              />

              <Campo
                titulo="Acción propuesta"
                valor={
                  riesgo.accion_propuesta
                }
              />
            </div>


            <div
              className="
                mt-3
                border
                border-gray-200
                rounded-lg
                p-3
              "
            >
              <div
                className="
                  text-[9px]
                  font-black
                  uppercase
                  text-gray-500
                  mb-2
                "
              >
                Programas de gestión PESV relacionados
              </div>

              {programas.length ? (
                <div
                  className="
                    flex
                    flex-wrap
                    gap-1.5
                  "
                >
                  {programas.map(
                    programa => (
                      <span
                        key={
                          programa.id
                        }
                        className="
                          inline-flex
                          items-center
                          bg-blue-50
                          border
                          border-blue-200
                          text-blue-800
                          rounded
                          px-2
                          py-1
                          text-[9px]
                          font-bold
                        "
                      >
                        <i
                          className="
                            fas
                            fa-circle-check
                            mr-1.5
                          "
                        ></i>

                        {programa.nombre}
                      </span>
                    )
                  )}
                </div>
              ) : (
                <div
                  className="
                    text-[10px]
                    text-gray-500
                  "
                >
                  No se registraron programas relacionados.
                </div>
              )}
            </div>
          </section>


          {/* GESTIÓN */}

          <section
            className="
              bg-white
              border
              border-gray-200
              rounded-xl
              p-3
            "
          >
            <TituloSeccion
              icono="fas fa-user-check"
              titulo="6. Gestión del riesgo"
              descripcion="Responsable, plazo, estado y observaciones del riesgo."
            />

            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-3
                gap-2
              "
            >
              <Campo
                titulo="Responsable"
                valor={
                  riesgo.responsable_nombre
                }
              />

              <Campo
                titulo="Fecha compromiso"
                valor={
                  riesgo.fecha_compromiso
                }
              />

              <Campo
                titulo="Estado"
                valor={
                  formatoContexto(
                    riesgo.estado
                  )
                }
              />

              <Campo
                titulo="Observaciones"
                valor={
                  riesgo.observaciones
                }
                className="md:col-span-3"
              />
            </div>
          </section>


          {/* CONTROLES Y MEDIDAS DETALLADAS */}

          <section
            className="
              bg-white
              border
              border-gray-200
              rounded-xl
              p-3
            "
          >
            <div
              className="
                border-b
                border-gray-200
                pb-2
                mb-3
                flex
                flex-col
                md:flex-row
                md:items-center
                md:justify-between
                gap-2
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
                    w-7
                    h-7
                    rounded-lg
                    bg-slate-100
                    text-slate-700
                    flex
                    items-center
                    justify-center
                    shrink-0
                  "
                >
                  <i
                    className="
                      fas
                      fa-shield-halved
                    "
                  ></i>
                </div>

                <div>
                  <div
                    className="
                      text-[11px]
                      font-black
                      uppercase
                      text-slate-800
                    "
                  >
                    7. Controles y medidas de intervención
                  </div>

                  <div
                    className="
                      text-[9px]
                      text-gray-500
                      mt-0.5
                    "
                  >
                    Registro detallado de los controles existentes y de las medidas
                    definidas para intervenir el riesgo.
                  </div>
                </div>
              </div>


              {!mostrarFormularioMedida && (
                <button
                  type="button"
                  onClick={
                    nuevaMedida
                  }
                  className="
                    bg-green-600
                    hover:bg-green-700
                    text-white
                    rounded
                    px-3
                    py-2
                    text-[9px]
                    font-bold
                    shrink-0
                  "
                >
                  <i
                    className="
                      fas
                      fa-plus
                      mr-1.5
                    "
                  ></i>

                  Registrar control o medida de intervención
                </button>
              )}
            </div>


            {mostrarFormularioMedida && (
              <div
                className="
                  mb-4
                "
              >
                <FormularioMedida
                  riesgo={
                    riesgo
                  }
                  medida={
                    medidaEditando
                  }
                  personal={
                    personal || []
                  }
                  tiposControl={
                    metodologia
                      ?.tipos_control
                  }
                  guardando={
                    guardando
                  }
                  guardar={
                    guardarMedidaFormulario
                  }
                  cancelar={
                    cancelarMedida
                  }
                />
              </div>
            )}


            <ListaMedidasRiesgo
              medidas={
                riesgo.medidas
              }
              editar={
                editarMedida
              }
              eliminar={
                eliminarMedida
              }
              guardando={
                guardando
              }
            />
          </section>
        </div>


        {/* ==============================================
            PIE
        ============================================== */}

        <div
          className="
            bg-white
            border-t
            border-gray-200
            px-4
            py-2
            flex
            justify-end
            gap-2
            shrink-0
          "
        >
          <button
            type="button"
            onClick={() => {
              cerrar()

              editar(
                riesgo
              )
            }}
            className="
              bg-blue-600
              hover:bg-blue-700
              text-white
              rounded
              px-4
              py-2
              text-[10px]
              font-bold
            "
          >
            <i
              className="
                fas
                fa-edit
                mr-1.5
              "
            ></i>

            Editar riesgo
          </button>

          <button
            type="button"
            onClick={
              cerrar
            }
            className="
              bg-slate-700
              hover:bg-slate-800
              text-white
              rounded
              px-4
              py-2
              text-[10px]
              font-bold
            "
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}