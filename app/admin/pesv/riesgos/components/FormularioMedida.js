// app/admin/pesv/riesgos/components/FormularioMedida.js

'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'


const FORMULARIO_INICIAL = {
  id:
    null,

  origen:
    'PROPUESTA',

  tipo_control:
    'ADMINISTRATIVO',

  descripcion:
    '',

  responsable_personal_id:
    '',

  responsable_nombre:
    '',

  fecha_prevista:
    '',

  fecha_implementacion:
    '',

  estado:
    'PENDIENTE',

  evidencia_esperada:
    '',

  verificacion_eficacia:
    '',

  fecha_verificacion:
    '',

  verificado_por:
    '',

  observaciones:
    '',

  orden:
    0,
}


function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function nombrePersonal(
  persona
) {
  return (
    texto(
      persona?.nombre_completo
    ) ||
    [
      texto(
        persona?.nombres
      ),
      texto(
        persona?.apellidos
      ),
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      ) ||
    texto(
      persona?.documento
    ) ||
    '-'
  )
}


function etiquetaTipo(
  tipo
) {
  const etiquetas = {
    ELIMINACION:
      'Eliminación',

    SUSTITUCION:
      'Sustitución',

    INGENIERIA:
      'Control de ingeniería / técnico',

    ADMINISTRATIVO:
      'Control administrativo',

    FORMACION_COMPETENCIAS:
      'Formación / fortalecimiento de competencias',

    EPP:
      'EPP / protección personal',

    OTRO:
      'Otro',
  }

  return (
    etiquetas[
      tipo
    ] ||
    texto(
      tipo
    )
      .replaceAll(
        '_',
        ' '
      )
  )
}


export default function FormularioMedida({
  riesgo,
  medida,
  personal,
  tiposControl,
  guardando,
  guardar,
  cancelar,
}) {
  const [
    formulario,
    setFormulario,
  ] =
    useState(
      FORMULARIO_INICIAL
    )

  const [
    errorLocal,
    setErrorLocal,
  ] =
    useState('')


  useEffect(
    () => {
      if (
        medida
      ) {
        setFormulario({
          id:
            medida.id,

          origen:
            texto(
              medida.origen
            ) ||
            'PROPUESTA',

          tipo_control:
            texto(
              medida.tipo_control
            ) ||
            'ADMINISTRATIVO',

          descripcion:
            texto(
              medida.descripcion
            ),

          responsable_personal_id:
            medida.responsable_personal_id
              ? String(
                  medida.responsable_personal_id
                )
              : '',

          responsable_nombre:
            texto(
              medida.responsable_nombre
            ),

          fecha_prevista:
            texto(
              medida.fecha_prevista
            ),

          fecha_implementacion:
            texto(
              medida.fecha_implementacion
            ),

          estado:
            texto(
              medida.estado
            ) ||
            (
              texto(
                medida.origen
              ) ===
              'EXISTENTE'
                ? 'ACTIVO'
                : 'PENDIENTE'
            ),

          evidencia_esperada:
            texto(
              medida.evidencia_esperada
            ),

          verificacion_eficacia:
            texto(
              medida.verificacion_eficacia
            ),

          fecha_verificacion:
            texto(
              medida.fecha_verificacion
            ),

          verificado_por:
            texto(
              medida.verificado_por
            ),

          observaciones:
            texto(
              medida.observaciones
            ),

          orden:
            Number(
              medida.orden ||
              0
            ),
        })
      } else {
        setFormulario({
          ...FORMULARIO_INICIAL,
        })
      }

      setErrorLocal(
        ''
      )
    },
    [
      medida,
      riesgo?.id,
    ]
  )


  const estados =
    useMemo(
      () => {
        if (
          formulario.origen ===
          'EXISTENTE'
        ) {
          return [
            {
              valor:
                'ACTIVO',

              nombre:
                'Activo',
            },
            {
              valor:
                'INACTIVO',

              nombre:
                'Inactivo',
            },
          ]
        }

        return [
          {
            valor:
              'PENDIENTE',

            nombre:
              'Pendiente',
          },
          {
            valor:
              'EN_PROCESO',

            nombre:
              'En proceso',
          },
          {
            valor:
              'IMPLEMENTADA',

            nombre:
              'Implementada',
          },
          {
            valor:
              'CANCELADA',

            nombre:
              'Cancelada',
          },
        ]
      },
      [
        formulario.origen,
      ]
    )


  const tipos =
    Array.isArray(
      tiposControl
    ) &&
    tiposControl.length
      ? tiposControl
      : [
          'ELIMINACION',
          'SUSTITUCION',
          'INGENIERIA',
          'ADMINISTRATIVO',
          'FORMACION_COMPETENCIAS',
          'EPP',
          'OTRO',
        ]


  function cambiar(
    campo,
    valor
  ) {
    setFormulario(
      anterior => ({
        ...anterior,

        [campo]:
          valor,
      })
    )
  }


  function cambiarOrigen(
    valor
  ) {
    setFormulario(
      anterior => ({
        ...anterior,

        origen:
          valor,

        estado:
          valor ===
          'EXISTENTE'
            ? 'ACTIVO'
            : 'PENDIENTE',
      })
    )
  }


  function cambiarResponsable(
    valor
  ) {
    const persona =
      personal.find(
        item =>
          String(
            item.id
          ) ===
          String(
            valor
          )
      )

    setFormulario(
      anterior => ({
        ...anterior,

        responsable_personal_id:
          valor,

        responsable_nombre:
          persona
            ? nombrePersonal(
                persona
              )
            : '',
      })
    )
  }


  async function enviar(
    event
  ) {
    event.preventDefault()

    setErrorLocal(
      ''
    )

    if (
      !texto(
        formulario.origen
      )
    ) {
      setErrorLocal(
        'Seleccione si corresponde a un control existente o una medida propuesta.'
      )

      return
    }

    if (
      !texto(
        formulario.tipo_control
      )
    ) {
      setErrorLocal(
        'Seleccione el tipo de control o medida.'
      )

      return
    }

    if (
      !texto(
        formulario.descripcion
      )
    ) {
      setErrorLocal(
        'Describa el control o medida de intervención.'
      )

      return
    }

    await guardar({
      ...formulario,

      riesgo_id:
        riesgo.id,
    })
  }


  return (
    <form
      onSubmit={
        enviar
      }
      className="
        border
        border-blue-200
        bg-blue-50/40
        rounded-xl
        overflow-hidden
      "
    >
      <div
        className="
          bg-blue-900
          text-white
          px-3
          py-2
          flex
          justify-between
          items-center
          gap-2
        "
      >
        <div>
          <div
            className="
              text-[10px]
              font-black
              uppercase
            "
          >
            {medida
              ? 'Editar control o medida'
              : 'Registrar control o medida'}
          </div>

          <div
            className="
              text-[9px]
              text-blue-200
            "
          >
            Riesgo {riesgo.codigo}
          </div>
        </div>

        <button
          type="button"
          onClick={
            cancelar
          }
          disabled={
            guardando
          }
          className="
            bg-white/10
            hover:bg-white/20
            border
            border-white/20
            rounded
            px-2.5
            py-1.5
            text-[9px]
            font-bold
            disabled:opacity-50
          "
        >
          <i
            className="
              fas
              fa-xmark
              mr-1
            "
          ></i>

          Cancelar
        </button>
      </div>


      <div
        className="
          p-3
          space-y-3
        "
      >
        {errorLocal && (
          <div
            className="
              bg-red-50
              border
              border-red-200
              text-red-700
              rounded
              px-3
              py-2
              text-[10px]
            "
          >
            {errorLocal}
          </div>
        )}


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
              md:col-span-3
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
                uppercase
                text-gray-600
                mb-1
              "
            >
              Origen *
            </label>

            <select
              value={
                formulario.origen
              }
              onChange={
                event =>
                  cambiarOrigen(
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                bg-white
                rounded
                px-2
                py-2
                text-[10px]
              "
            >
              <option
                value="EXISTENTE"
              >
                Control existente
              </option>

              <option
                value="PROPUESTA"
              >
                Medida propuesta
              </option>
            </select>
          </div>


          <div
            className="
              md:col-span-5
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
                uppercase
                text-gray-600
                mb-1
              "
            >
              Tipo de control / medida *
            </label>

            <select
              value={
                formulario.tipo_control
              }
              onChange={
                event =>
                  cambiar(
                    'tipo_control',
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                bg-white
                rounded
                px-2
                py-2
                text-[10px]
              "
            >
              {tipos.map(
                tipo => (
                  <option
                    key={
                      tipo
                    }
                    value={
                      tipo
                    }
                  >
                    {etiquetaTipo(
                      tipo
                    )}
                  </option>
                )
              )}
            </select>
          </div>


          <div
            className="
              md:col-span-4
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
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
                  cambiar(
                    'estado',
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                bg-white
                rounded
                px-2
                py-2
                text-[10px]
              "
            >
              {estados.map(
                estado => (
                  <option
                    key={
                      estado.valor
                    }
                    value={
                      estado.valor
                    }
                  >
                    {estado.nombre}
                  </option>
                )
              )}
            </select>
          </div>


          <div
            className="
              md:col-span-12
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
                uppercase
                text-gray-600
                mb-1
              "
            >
              Descripción del control o medida *
            </label>

            <textarea
              value={
                formulario.descripcion
              }
              onChange={
                event =>
                  cambiar(
                    'descripcion',
                    event.target.value
                  )
              }
              rows={3}
              className="
                w-full
                border
                border-gray-300
                bg-white
                rounded
                px-3
                py-2
                text-[10px]
                resize-y
              "
            />
          </div>


          <div
            className="
              md:col-span-5
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
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
                bg-white
                rounded
                px-2
                py-2
                text-[10px]
              "
            >
              <option value="">
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
                    {nombrePersonal(
                      persona
                    )}
                  </option>
                )
              )}
            </select>
          </div>


          <div
            className="
              md:col-span-3
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
                uppercase
                text-gray-600
                mb-1
              "
            >
              Fecha prevista
            </label>

            <input
              type="date"
              value={
                formulario.fecha_prevista
              }
              onChange={
                event =>
                  cambiar(
                    'fecha_prevista',
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                bg-white
                rounded
                px-2
                py-2
                text-[10px]
              "
            />
          </div>


          <div
            className="
              md:col-span-4
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
                uppercase
                text-gray-600
                mb-1
              "
            >
              Fecha de implementación
            </label>

            <input
              type="date"
              value={
                formulario.fecha_implementacion
              }
              onChange={
                event =>
                  cambiar(
                    'fecha_implementacion',
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                bg-white
                rounded
                px-2
                py-2
                text-[10px]
              "
            />
          </div>


          <div
            className="
              md:col-span-6
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
                uppercase
                text-gray-600
                mb-1
              "
            >
              Evidencia esperada
            </label>

            <textarea
              value={
                formulario.evidencia_esperada
              }
              onChange={
                event =>
                  cambiar(
                    'evidencia_esperada',
                    event.target.value
                  )
              }
              rows={2}
              className="
                w-full
                border
                border-gray-300
                bg-white
                rounded
                px-3
                py-2
                text-[10px]
                resize-y
              "
              placeholder="Ejemplo: registro de capacitación, lista de asistencia, procedimiento actualizado..."
            />
          </div>


          <div
            className="
              md:col-span-6
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
                uppercase
                text-gray-600
                mb-1
              "
            >
              Verificación de eficacia
            </label>

            <textarea
              value={
                formulario.verificacion_eficacia
              }
              onChange={
                event =>
                  cambiar(
                    'verificacion_eficacia',
                    event.target.value
                  )
              }
              rows={2}
              className="
                w-full
                border
                border-gray-300
                bg-white
                rounded
                px-3
                py-2
                text-[10px]
                resize-y
              "
              placeholder="Registrar posteriormente el resultado de la verificación."
            />
          </div>


          <div
            className="
              md:col-span-3
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
                uppercase
                text-gray-600
                mb-1
              "
            >
              Fecha de verificación
            </label>

            <input
              type="date"
              value={
                formulario.fecha_verificacion
              }
              onChange={
                event =>
                  cambiar(
                    'fecha_verificacion',
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                bg-white
                rounded
                px-2
                py-2
                text-[10px]
              "
            />
          </div>


          <div
            className="
              md:col-span-5
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
                uppercase
                text-gray-600
                mb-1
              "
            >
              Verificado por
            </label>

            <input
              value={
                formulario.verificado_por
              }
              onChange={
                event =>
                  cambiar(
                    'verificado_por',
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                bg-white
                rounded
                px-2
                py-2
                text-[10px]
              "
            />
          </div>


          <div
            className="
              md:col-span-4
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
                uppercase
                text-gray-600
                mb-1
              "
            >
              Orden
            </label>

            <input
              type="number"
              min="0"
              value={
                formulario.orden
              }
              onChange={
                event =>
                  cambiar(
                    'orden',
                    event.target.value
                  )
              }
              className="
                w-full
                border
                border-gray-300
                bg-white
                rounded
                px-2
                py-2
                text-[10px]
              "
            />
          </div>


          <div
            className="
              md:col-span-12
            "
          >
            <label
              className="
                block
                text-[9px]
                font-black
                uppercase
                text-gray-600
                mb-1
              "
            >
              Observaciones
            </label>

            <textarea
              value={
                formulario.observaciones
              }
              onChange={
                event =>
                  cambiar(
                    'observaciones',
                    event.target.value
                  )
              }
              rows={2}
              className="
                w-full
                border
                border-gray-300
                bg-white
                rounded
                px-3
                py-2
                text-[10px]
                resize-y
              "
            />
          </div>
        </div>


        <div
          className="
            border-t
            border-blue-100
            pt-3
            flex
            justify-end
            gap-2
          "
        >
          <button
            type="button"
            onClick={
              cancelar
            }
            disabled={
              guardando
            }
            className="
              border
              border-gray-300
              bg-white
              hover:bg-gray-50
              text-gray-700
              rounded
              px-4
              py-2
              text-[10px]
              font-bold
              disabled:opacity-50
            "
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={
              guardando
            }
            className="
              bg-blue-700
              hover:bg-blue-800
              text-white
              rounded
              px-4
              py-2
              text-[10px]
              font-bold
              disabled:opacity-50
            "
          >
            {guardando ? (
              <>
                <i
                  className="
                    fas
                    fa-spinner
                    fa-spin
                    mr-1.5
                  "
                ></i>

                Guardando...
              </>
            ) : (
              <>
                <i
                  className="
                    fas
                    fa-save
                    mr-1.5
                  "
                ></i>

                {medida
                  ? 'Actualizar medida'
                  : 'Guardar medida'}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}