// app/admin/pesv/riesgos/components/FormularioRiesgo.js

function Campo({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  clase = '',
}) {
  return (
    <div
      className={
        clase
      }
    >
      <label
        className="
          block
          text-[9px]
          font-bold
          uppercase
          text-gray-600
          mb-1
        "
      >
        {label}
      </label>

      <input
        type={
          type
        }
        value={
          value ?? ''
        }
        onChange={
          event =>
            onChange(
              event.target.value
            )
        }
        placeholder={
          placeholder
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
      />
    </div>
  )
}


function Area({
  label,
  value,
  onChange,
  placeholder = '',
  rows = 2,
  clase = '',
}) {
  return (
    <div
      className={
        clase
      }
    >
      <label
        className="
          block
          text-[9px]
          font-bold
          uppercase
          text-gray-600
          mb-1
        "
      >
        {label}
      </label>

      <textarea
        rows={
          rows
        }
        value={
          value ?? ''
        }
        onChange={
          event =>
            onChange(
              event.target.value
            )
        }
        placeholder={
          placeholder
        }
        className="
          w-full
          border
          border-gray-300
          rounded
          px-2
          py-2
          text-xs
          resize-y
          bg-white
        "
      />
    </div>
  )
}


function TituloSeccion({
  titulo,
  descripcion,
}) {
  return (
    <div
      className="
        border-b
        border-gray-200
        pb-1
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
        {titulo}
      </div>

      {descripcion && (
        <div
          className="
            text-[9px]
            text-gray-500
          "
        >
          {descripcion}
        </div>
      )}
    </div>
  )
}


function TarjetasEscala({
  titulo,
  opciones,
  valor,
  cambiar,
}) {
  return (
    <div>
      <label
        className="
          block
          text-[9px]
          font-bold
          uppercase
          text-gray-600
          mb-1
        "
      >
        {titulo}
      </label>

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-2
        "
      >
        {opciones.map(
          opcion => {
            const activa =
              String(
                valor
              ) ===
              String(
                opcion.valor
              )

            return (
              <button
                key={
                  opcion.valor
                }
                type="button"
                onClick={() =>
                  cambiar(
                    String(
                      opcion.valor
                    )
                  )
                }
                className={`
                  text-left
                  border
                  rounded-lg
                  px-3
                  py-2
                  transition
                  ${
                    activa
                      ? 'border-blue-800 bg-blue-50 ring-1 ring-blue-800'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }
                `}
              >
                <div
                  className="
                    text-[10px]
                    font-black
                    text-gray-800
                  "
                >
                  {opcion.valor} · {opcion.nombre}
                </div>

                {opcion.descripcion && (
                  <div
                    className="
                      mt-1
                      text-[9px]
                      text-gray-500
                    "
                  >
                    {opcion.descripcion}
                  </div>
                )}
              </button>
            )
          }
        )}
      </div>
    </div>
  )
}


const EXPOSICION = [
  {
    valor:
      1,

    nombre:
      'Esporádica',

    descripcion:
      'La situación se presenta de manera excepcional o poco frecuente.',
  },
  {
    valor:
      2,

    nombre:
      'Ocasional',

    descripcion:
      'La situación aparece algunas veces dependiendo de las condiciones.',
  },
  {
    valor:
      3,

    nombre:
      'Frecuente',

    descripcion:
      'La situación está presente de forma habitual o repetida.',
  },
]


const PROBABILIDAD = [
  {
    valor:
      1,

    nombre:
      'No es probable',

    descripcion:
      'Controles sistemáticos y eficaces; materialización excepcional.',
  },
  {
    valor:
      2,

    nombre:
      'Poco probable',

    descripcion:
      'Puede materializarse; existen controles con oportunidades de mejora.',
  },
  {
    valor:
      3,

    nombre:
      'Muy probable',

    descripcion:
      'Antecedentes recurrentes o controles insuficientes o ineficaces.',
  },
]


const SEVERIDAD = [
  {
    valor:
      1,

    nombre:
      'Leve',

    descripcion:
      'Consecuencias menores, sin afectación importante a las personas.',
  },
  {
    valor:
      2,

    nombre:
      'Grave',

    descripcion:
      'Lesiones con atención médica o incapacidad y daños importantes.',
  },
  {
    valor:
      3,

    nombre:
      'Muy grave',

    descripcion:
      'Lesiones graves o permanentes, múltiples víctimas o muerte.',
  },
]


const CONTEXTOS = [
  [
    'FORMACION_PRACTICA',
    'Formación práctica',
  ],
  [
    'DESPLAZAMIENTO_EN_MISION',
    'Desplazamiento en misión',
  ],
  [
    'IN_ITINERE',
    'In itinere',
  ],
  [
    'ENTORNO_SEDE',
    'Entorno de la sede',
  ],
]


export default function FormularioRiesgo({
  anio,
  personal,
  programas,
  formulario,
  editandoId,
  guardando,
  vistaPrevia,
  cambiarCampo,
  cambiarResponsable,
  cambiarPrograma,
  guardar,
  limpiar,
}) {
  return (
    <section
      id="formulario-riesgo"
      className="
        border
        border-blue-300
        rounded-xl
        overflow-hidden
        scroll-mt-5
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
        <div>
          <div
            className="
              text-[11px]
              font-black
              uppercase
            "
          >
            {editandoId
              ? 'Editar riesgo'
              : 'Identificar y valorar nuevo riesgo'}
          </div>

          <div
            className="
              text-[9px]
              text-blue-200
            "
          >
            Vigencia {anio} · La API realizará el cálculo definitivo del nivel de riesgo.
          </div>
        </div>

        <button
          type="button"
          onClick={
            limpiar
          }
          disabled={
            guardando
          }
          className="
            bg-white/10
            hover:bg-white/20
            disabled:opacity-50
            disabled:cursor-not-allowed
            border
            border-white/20
            rounded
            px-3
            py-1.5
            text-[10px]
            font-bold
            flex
            items-center
            gap-1.5
          "
        >
          <i
            className="
              fas
              fa-xmark
            "
          ></i>

          {editandoId
            ? 'Cancelar edición'
            : 'Cancelar'}
        </button>
      </div>


      <form
        onSubmit={
          guardar
        }
        className="
          p-4
          bg-blue-50/30
          space-y-5
        "
      >
        {/* ==================================================
            1. IDENTIFICACIÓN
        ================================================== */}

        <TituloSeccion
          titulo="1. Identificación del riesgo"
          descripcion="Describa la actividad real del CEA y el escenario en el que puede presentarse el riesgo."
        />


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-12
            gap-3
          "
        >
          <Campo
            label="Código *"
            value={
              formulario.codigo
            }
            onChange={
              valor =>
                cambiarCampo(
                  'codigo',
                  valor.toUpperCase()
                )
            }
            placeholder="R-001"
            clase="md:col-span-2"
          />

          <Campo
            label="Fecha identificación *"
            type="date"
            value={
              formulario.fecha_identificacion
            }
            onChange={
              valor =>
                cambiarCampo(
                  'fecha_identificacion',
                  valor
                )
            }
            clase="md:col-span-2"
          />

          <Campo
            label="Proceso *"
            value={
              formulario.proceso
            }
            onChange={
              valor =>
                cambiarCampo(
                  'proceso',
                  valor
                )
            }
            placeholder="Ej: Formación práctica"
            clase="md:col-span-4"
          />

          <div
            className="
              md:col-span-4
            "
          >
            <label
              className="
                block
                text-[9px]
                font-bold
                uppercase
                text-gray-600
                mb-1
              "
            >
              Contexto de exposición *
            </label>

            <select
              value={
                formulario.contexto_exposicion
              }
              onChange={
                event =>
                  cambiarCampo(
                    'contexto_exposicion',
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
              {CONTEXTOS.map(
                item => (
                  <option
                    key={
                      item[0]
                    }
                    value={
                      item[0]
                    }
                  >
                    {item[1]}
                  </option>
                )
              )}
            </select>
          </div>


          <Campo
            label="Actividad *"
            value={
              formulario.actividad
            }
            onChange={
              valor =>
                cambiarCampo(
                  'actividad',
                  valor
                )
            }
            placeholder="Actividad específica que genera exposición"
            clase="md:col-span-6"
          />

          <Campo
            label="Actores expuestos"
            value={
              formulario.actores_expuestos
            }
            onChange={
              valor =>
                cambiarCampo(
                  'actores_expuestos',
                  valor
                )
            }
            placeholder="Instructor, aprendiz, peatones..."
            clase="md:col-span-6"
          />

          <Campo
            label="Factor de riesgo *"
            value={
              formulario.factor_riesgo
            }
            onChange={
              valor =>
                cambiarCampo(
                  'factor_riesgo',
                  valor
                )
            }
            placeholder="Distracción, velocidad, fatiga..."
            clase="md:col-span-6"
          />

          <Campo
            label="Fuente de identificación"
            value={
              formulario.fuente_identificacion
            }
            onChange={
              valor =>
                cambiarCampo(
                  'fuente_identificacion',
                  valor
                )
            }
            placeholder="Observación, siniestros, preoperacionales, auditoría..."
            clase="md:col-span-6"
          />
        </div>


        <Area
          label="Situación de riesgo *"
          value={
            formulario.situacion_riesgo
          }
          onChange={
            valor =>
              cambiarCampo(
                'situacion_riesgo',
                valor
              )
          }
          rows={2}
          placeholder="Describa el escenario o condición de exposición."
        />

        <Area
          label="Evento peligroso / materialización *"
          value={
            formulario.evento_peligroso
          }
          onChange={
            valor =>
              cambiarCampo(
                'evento_peligroso',
                valor
              )
          }
          rows={2}
          placeholder="¿Qué evento observable puede ocurrir cuando la situación de riesgo está presente?"
        />


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            gap-3
          "
        >
          <Area
            label="Causas *"
            value={
              formulario.causa
            }
            onChange={
              valor =>
                cambiarCampo(
                  'causa',
                  valor
                )
            }
            rows={3}
          />

          <Area
            label="Consecuencias *"
            value={
              formulario.consecuencia
            }
            onChange={
              valor =>
                cambiarCampo(
                  'consecuencia',
                  valor
                )
            }
            rows={3}
          />
        </div>


        {/* ==================================================
            2. CONTROLES EXISTENTES
        ================================================== */}

        <TituloSeccion
          titulo="2. Controles existentes considerados en la valoración inicial"
          descripcion="Describa de forma resumida los controles que ya se encuentran implementados y que serán considerados para determinar la probabilidad inicial. Posteriormente podrán registrarse individualmente en el detalle del riesgo."
        />

        <Area
          label="Resumen de controles existentes"
          value={
            formulario.control_existente
          }
          onChange={
            valor =>
              cambiarCampo(
                'control_existente',
                valor
              )
          }
          rows={3}
          placeholder="Ej: doble mando, supervisión directa, revisión preoperacional..."
        />


        {/* ==================================================
            3. VALORACIÓN INICIAL
        ================================================== */}

        <TituloSeccion
          titulo="3. Valoración inicial"
          descripcion="Exposición y probabilidad determinan NR. La severidad se utiliza para priorización."
        />


        <TarjetasEscala
          titulo="Exposición *"
          opciones={
            EXPOSICION
          }
          valor={
            formulario.exposicion
          }
          cambiar={
            valor =>
              cambiarCampo(
                'exposicion',
                valor
              )
          }
        />

        <Area
          label="Justificación de la exposición *"
          value={
            formulario.justificacion_exposicion
          }
          onChange={
            valor =>
              cambiarCampo(
                'justificacion_exposicion',
                valor
              )
          }
          rows={2}
          placeholder="Explique con qué frecuencia está presente específicamente esta situación de riesgo."
        />


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            gap-3
          "
        >
          <Area
            label="Antecedentes considerados"
            value={
              formulario.antecedentes_considerados
            }
            onChange={
              valor =>
                cambiarCampo(
                  'antecedentes_considerados',
                  valor
                )
            }
            rows={2}
            placeholder="Siniestros, incidentes, intervenciones, hallazgos..."
          />

          <Area
            label="Eficacia observada de los controles"
            value={
              formulario.eficacia_controles
            }
            onChange={
              valor =>
                cambiarCampo(
                  'eficacia_controles',
                  valor
                )
            }
            rows={2}
          />
        </div>


        <TarjetasEscala
          titulo="Probabilidad *"
          opciones={
            PROBABILIDAD
          }
          valor={
            formulario.probabilidad
          }
          cambiar={
            valor =>
              cambiarCampo(
                'probabilidad',
                valor
              )
          }
        />

        <Area
          label="Justificación de la probabilidad *"
          value={
            formulario.justificacion_probabilidad
          }
          onChange={
            valor =>
              cambiarCampo(
                'justificacion_probabilidad',
                valor
              )
          }
          rows={2}
          placeholder="Considere el evento peligroso, antecedentes y eficacia de los controles."
        />


        <TarjetasEscala
          titulo="Severidad *"
          opciones={
            SEVERIDAD
          }
          valor={
            formulario.severidad
          }
          cambiar={
            valor =>
              cambiarCampo(
                'severidad',
                valor
              )
          }
        />

        <Area
          label="Justificación de la severidad *"
          value={
            formulario.justificacion_severidad
          }
          onChange={
            valor =>
              cambiarCampo(
                'justificacion_severidad',
                valor
              )
          }
          rows={2}
          placeholder="Considere la consecuencia razonablemente previsible de mayor gravedad."
        />


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
              border-slate-200
              rounded-lg
              bg-white
              px-3
              py-2
            "
          >
            <div
              className="
                text-[8px]
                uppercase
                font-bold
                text-gray-500
              "
            >
              Nivel calculado
            </div>

            <div
              className="
                text-xl
                font-black
                text-slate-800
              "
            >
              {vistaPrevia?.valor ??
                '-'}
            </div>
          </div>

          <div
            className="
              border
              border-slate-200
              rounded-lg
              bg-white
              px-3
              py-2
            "
          >
            <div
              className="
                text-[8px]
                uppercase
                font-bold
                text-gray-500
              "
            >
              Clasificación
            </div>

            <div
              className="
                text-sm
                font-black
                mt-1
              "
            >
              {vistaPrevia?.nivel ||
                '-'}
            </div>
          </div>

          <div
            className="
              border
              border-slate-200
              rounded-lg
              bg-white
              px-3
              py-2
            "
          >
            <div
              className="
                text-[8px]
                uppercase
                font-bold
                text-gray-500
              "
            >
              Prioridad
            </div>

            <div
              className="
                text-sm
                font-black
                mt-1
              "
            >
              {vistaPrevia?.prioridad
                ?.replaceAll(
                  '_',
                  ' '
                ) ||
                '-'}
            </div>
          </div>
        </div>


        {/* ==================================================
            4. TRATAMIENTO INICIAL
        ================================================== */}

        <TituloSeccion
          titulo="4. Tratamiento inicial"
          descripcion="Defina de forma resumida cómo se gestionará inicialmente el riesgo. Los controles y medidas de intervención se administrarán posteriormente de forma individual en el detalle del riesgo."
        />


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            gap-3
          "
        >
          <Area
            label="Resumen del tratamiento"
            value={
              formulario.tratamiento
            }
            onChange={
              valor =>
                cambiarCampo(
                  'tratamiento',
                  valor
                )
            }
            rows={2}
            placeholder="Describa la orientación general definida para tratar el riesgo."
          />

          <Area
            label="Resumen de la acción propuesta"
            value={
              formulario.accion_propuesta
            }
            onChange={
              valor =>
                cambiarCampo(
                  'accion_propuesta',
                  valor
                )
            }
            rows={2}
            placeholder="Resuma las principales acciones inicialmente propuestas."
          />
        </div>


        <div>
          <label
            className="
              block
              text-[9px]
              font-bold
              uppercase
              text-gray-600
              mb-2
            "
          >
            Programas PESV relacionados
          </label>

          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-2
              lg:grid-cols-3
              gap-2
            "
          >
            {programas.map(
              programa => {
                const seleccionado =
                  formulario
                    .programa_ids
                    .includes(
                      Number(
                        programa.id
                      )
                    )

                return (
                  <label
                    key={
                      programa.id
                    }
                    className={`
                      border
                      rounded-lg
                      px-3
                      py-2
                      cursor-pointer
                      text-[10px]
                      ${
                        seleccionado
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-200'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={
                        seleccionado
                      }
                      onChange={() =>
                        cambiarPrograma(
                          Number(
                            programa.id
                          )
                        )
                      }
                      className="
                        mr-2
                      "
                    />

                    <strong>
                      {programa.nombre}
                    </strong>

                    {programa.es_minimo_normativo && (
                      <span
                        className="
                          ml-1
                          text-[8px]
                          text-blue-700
                        "
                      >
                        · mínimo
                      </span>
                    )}
                  </label>
                )
              }
            )}
          </div>
        </div>


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-12
            gap-3
          "
        >
          <div
            className="
              md:col-span-5
            "
          >
            <label
              className="
                block
                text-[9px]
                font-bold
                uppercase
                text-gray-600
                mb-1
              "
            >
              Responsable
            </label>

            <select
              value={
                formulario.responsable_personal_id
              }
              onChange={
                event =>
                  cambiarResponsable(
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
              <option
                value=""
              >
                Seleccione...
              </option>

              {personal.map(
                persona => (
                  <option
                    key={
                      persona.id
                    }
                    value={
                      persona.id
                    }
                  >
                    {persona.nombre_completo ||
                      `${persona.nombres || ''} ${persona.apellidos || ''}`}
                  </option>
                )
              )}
            </select>
          </div>

          <Campo
            label="Fecha compromiso"
            type="date"
            value={
              formulario.fecha_compromiso
            }
            onChange={
              valor =>
                cambiarCampo(
                  'fecha_compromiso',
                  valor
                )
            }
            clase="md:col-span-3"
          />

          <div
            className="
              md:col-span-4
            "
          >
            <label
              className="
                block
                text-[9px]
                font-bold
                uppercase
                text-gray-600
                mb-1
              "
            >
              Estado
            </label>

            <select
              value={
                formulario.estado
              }
              onChange={
                event =>
                  cambiarCampo(
                    'estado',
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
              <option value="ACTIVO">
                ACTIVO
              </option>

              <option value="EN_TRATAMIENTO">
                EN TRATAMIENTO
              </option>

              <option value="CONTROLADO">
                CONTROLADO
              </option>

              <option value="CERRADO">
                CERRADO
              </option>
            </select>
          </div>
        </div>


        <Area
          label="Observaciones"
          value={
            formulario.observaciones
          }
          onChange={
            valor =>
              cambiarCampo(
                'observaciones',
                valor
              )
          }
          rows={2}
        />


        {/* ==================================================
            ACCIONES
        ================================================== */}

        <div
          className="
            flex
            justify-end
            gap-2
            border-t
            border-gray-200
            pt-3
          "
        >
          <button
            type="button"
            onClick={
              limpiar
            }
            disabled={
              guardando
            }
            className="
              bg-gray-200
              hover:bg-gray-300
              disabled:opacity-50
              disabled:cursor-not-allowed
              text-gray-700
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
                fa-xmark
                mr-1.5
              "
            ></i>

            Cancelar
          </button>

          <button
            type="submit"
            disabled={
              guardando
            }
            className="
              bg-blue-900
              hover:bg-blue-950
              disabled:opacity-50
              text-white
              rounded
              px-4
              py-2
              text-[10px]
              font-bold
            "
          >
            <i
              className={`
                fas
                ${
                  editandoId
                    ? 'fa-save'
                    : 'fa-plus'
                }
                mr-1.5
              `}
            ></i>

            {guardando
              ? 'Guardando...'
              : editandoId
                ? 'Guardar cambios'
                : 'Guardar riesgo'}
          </button>
        </div>
      </form>
    </section>
  )
}