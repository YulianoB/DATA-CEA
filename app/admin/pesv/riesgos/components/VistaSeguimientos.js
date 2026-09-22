// app/admin/pesv/riesgos/components/VistaSeguimientos.js

'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'


// ============================================================
// CONSTANTES
// ============================================================

const EXPOSICION = [
  {
    valor: 1,
    nombre: 'Esporádica',
    descripcion:
      'La situación se presenta de manera excepcional o poco frecuente.',
  },
  {
    valor: 2,
    nombre: 'Ocasional',
    descripcion:
      'La situación aparece algunas veces dependiendo de las condiciones.',
  },
  {
    valor: 3,
    nombre: 'Frecuente',
    descripcion:
      'La situación está presente de forma habitual o repetida.',
  },
]


const PROBABILIDAD = [
  {
    valor: 1,
    nombre: 'No es probable',
    descripcion:
      'Con los controles considerados, la materialización resulta excepcional.',
  },
  {
    valor: 2,
    nombre: 'Poco probable',
    descripcion:
      'Puede materializarse aun cuando existen controles implementados.',
  },
  {
    valor: 3,
    nombre: 'Muy probable',
    descripcion:
      'La materialización es recurrente o los controles son insuficientes.',
  },
]


const SEVERIDAD = [
  {
    valor: 1,
    nombre: 'Leve',
    descripcion:
      'Consecuencias menores sin afectación importante a las personas.',
  },
  {
    valor: 2,
    nombre: 'Grave',
    descripcion:
      'Lesiones con atención médica o incapacidad y daños importantes.',
  },
  {
    valor: 3,
    nombre: 'Muy grave',
    descripcion:
      'Lesiones graves o permanentes, múltiples víctimas o muerte.',
  },
]


// ============================================================
// HELPERS GENERALES
// ============================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function fechaHoy() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    )
}


function etiqueta(
  valor
) {
  return (
    texto(
      valor
    )
      .replaceAll(
        '_',
        ' '
      ) ||
    '-'
  )
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


function formatearFecha(
  valor
) {
  const fecha =
    texto(
      valor
    )

  if (!fecha) {
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
    partes.length !==
    3
  ) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}


function etiquetaTipoControl(
  valor
) {
  const mapa = {
    ELIMINACION:
      'Eliminación',

    SUSTITUCION:
      'Sustitución',

    INGENIERIA:
      'Ingeniería / técnico',

    ADMINISTRATIVO:
      'Administrativo',

    FORMACION_COMPETENCIAS:
      'Formación / competencias',

    EPP:
      'EPP',

    OTRO:
      'Otro',
  }

  return (
    mapa[
      texto(
        valor
      ).toUpperCase()
    ] ||
    etiqueta(
      valor
    )
  )
}


// ============================================================
// ESTILOS DE NIVEL / PRIORIDAD
// ============================================================

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
    return 'bg-red-100 border-red-200 text-red-800'
  }

  if (
    valor ===
    'MODERADO'
  ) {
    return 'bg-amber-100 border-amber-200 text-amber-800'
  }

  if (
    valor ===
    'BAJO'
  ) {
    return 'bg-green-100 border-green-200 text-green-800'
  }

  return 'bg-gray-100 border-gray-200 text-gray-700'
}


function prioridadClase(
  prioridad
) {
  const valor =
    texto(
      prioridad
    ).toUpperCase()

  if (
    [
      'PRIORITARIA',
      'PRIORITARIA_PREVENTIVA',
    ].includes(
      valor
    )
  ) {
    return 'bg-red-50 border-red-200 text-red-800'
  }

  if (
    valor ===
    'PROGRAMADA'
  ) {
    return 'bg-amber-50 border-amber-200 text-amber-800'
  }

  if (
    valor ===
    'SEGUIMIENTO'
  ) {
    return 'bg-blue-50 border-blue-200 text-blue-800'
  }

  return 'bg-slate-50 border-slate-200 text-slate-700'
}


// ============================================================
// CÁLCULO SOLO PARA VISTA PREVIA
//
// La API sigue siendo la autoridad definitiva.
// ============================================================

function calcularVistaPrevia(
  exposicion,
  probabilidad,
  severidad
) {
  const e =
    Number(
      exposicion
    )

  const p =
    Number(
      probabilidad
    )

  const s =
    Number(
      severidad
    )

  if (
    ![1, 2, 3].includes(
      e
    ) ||
    ![1, 2, 3].includes(
      p
    )
  ) {
    return {
      valor:
        null,

      nivel:
        '',

      prioridad:
        '',
    }
  }

  const valor =
    e * p

  let nivel =
    'BAJO'

  if (
    valor >= 6
  ) {
    nivel =
      'CRITICO'
  } else if (
    valor >= 3
  ) {
    nivel =
      'MODERADO'
  }

  let prioridad =
    ''

  if (
    [1, 2, 3].includes(
      s
    )
  ) {
    if (
      nivel ===
      'CRITICO'
    ) {
      prioridad =
        'PRIORITARIA'
    } else if (
      nivel ===
      'MODERADO'
    ) {
      prioridad =
        s === 3
          ? 'PRIORITARIA'
          : 'PROGRAMADA'
    } else if (
      s === 3
    ) {
      prioridad =
        'PRIORITARIA_PREVENTIVA'
    } else if (
      s === 2
    ) {
      prioridad =
        'SEGUIMIENTO'
    } else {
      prioridad =
        'MANTENER_CONTROLES'
    }
  }

  return {
    valor,
    nivel,
    prioridad,
  }
}


// ============================================================
// FORMULARIO VACÍO / EDICIÓN
// ============================================================

function construirFormulario(
  riesgo,
  seguimiento = null
) {
  if (
    seguimiento
  ) {
    return {
      id:
        seguimiento.id,

      riesgo_id:
        riesgo?.id || '',

      fecha_seguimiento:
        texto(
          seguimiento.fecha_seguimiento
        ) ||
        fechaHoy(),

      tipo_seguimiento:
        texto(
          seguimiento.tipo_seguimiento
        ) ||
        'SEGUIMIENTO',

      exposicion:
        seguimiento.exposicion
          ? String(
              seguimiento.exposicion
            )
          : '',

      justificacion_exposicion:
        texto(
          seguimiento.justificacion_exposicion
        ),

      probabilidad:
        seguimiento.probabilidad
          ? String(
              seguimiento.probabilidad
            )
          : '',

      justificacion_probabilidad:
        texto(
          seguimiento.justificacion_probabilidad
        ),

      severidad:
        seguimiento.severidad
          ? String(
              seguimiento.severidad
            )
          : '',

      justificacion_severidad:
        texto(
          seguimiento.justificacion_severidad
        ),

      antecedentes_considerados:
        texto(
          seguimiento.antecedentes_considerados
        ),

      eficacia_controles:
        texto(
          seguimiento.eficacia_controles
        ),

      control_aplicado:
        texto(
          seguimiento.control_aplicado
        ),

      accion_realizada:
        texto(
          seguimiento.accion_realizada
        ),

      resultado:
        texto(
          seguimiento.resultado
        ),

      estado_riesgo:
        texto(
          seguimiento.estado_riesgo
        ) ||
        texto(
          riesgo?.estado
        ) ||
        'ACTIVO',

      verificacion_eficacia:
        texto(
          seguimiento.verificacion_eficacia
        ),

      fecha_verificacion_eficacia:
        texto(
          seguimiento.fecha_verificacion_eficacia
        ),

      responsable_valoracion_personal_id:
        seguimiento
          .responsable_valoracion_personal_id
          ? String(
              seguimiento
                .responsable_valoracion_personal_id
            )
          : '',

      responsable_valoracion_nombre:
        texto(
          seguimiento.responsable_valoracion_nombre
        ),

      proximo_seguimiento:
        texto(
          seguimiento.proximo_seguimiento
        ),

      evidencia_path:
        texto(
          seguimiento.evidencia_path
        ),

      observaciones:
        texto(
          seguimiento.observaciones
        ),

      medida_ids:
        Array.isArray(
          seguimiento.medidas_consideradas
        )
          ? seguimiento
              .medidas_consideradas
              .map(
                medida =>
                  Number(
                    medida.id
                  )
              )
              .filter(
                id =>
                  Number.isFinite(
                    id
                  ) &&
                  id > 0
              )
          : [],
    }
  }


  return {
    id:
      null,

    riesgo_id:
      riesgo?.id || '',

    fecha_seguimiento:
      fechaHoy(),

    tipo_seguimiento:
      'SEGUIMIENTO',

    exposicion:
      riesgo?.exposicion
        ? String(
            riesgo.exposicion
          )
        : '',

    justificacion_exposicion:
      '',

    probabilidad:
      riesgo?.probabilidad
        ? String(
            riesgo.probabilidad
          )
        : '',

    justificacion_probabilidad:
      '',

    severidad:
      riesgo?.severidad
        ? String(
            riesgo.severidad
          )
        : '',

    justificacion_severidad:
      '',

    antecedentes_considerados:
      '',

    eficacia_controles:
      '',

    control_aplicado:
      '',

    accion_realizada:
      '',

    resultado:
      '',

    estado_riesgo:
      texto(
        riesgo?.estado
      ) ||
      'ACTIVO',

    verificacion_eficacia:
      '',

    fecha_verificacion_eficacia:
      '',

    responsable_valoracion_personal_id:
      '',

    responsable_valoracion_nombre:
      '',

    proximo_seguimiento:
      '',

    evidencia_path:
      '',

    observaciones:
      '',

    medida_ids:
      [],
  }
}


// ============================================================
// COMPONENTES INTERNOS
//
// Permanecen dentro de VistaSeguimientos.js.
// No generan archivos adicionales.
// ============================================================

function TituloSeccion({
  titulo,
  descripcion,
}) {
  return (
    <div
      className="
        border-b
        border-gray-200
        pb-1.5
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
            mt-0.5
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
  rows = 2,
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

                <div
                  className="
                    mt-1
                    text-[9px]
                    text-gray-500
                  "
                >
                  {opcion.descripcion}
                </div>
              </button>
            )
          }
        )}
      </div>
    </div>
  )
}


// ============================================================
// VALORACIÓN INICIAL
// ============================================================

function ValoracionInicial({
  riesgo,
}) {
  if (!riesgo) {
    return null
  }

  return (
    <section
      className="
        border
        border-blue-200
        rounded-xl
        overflow-hidden
      "
    >
      <div
        className="
          bg-blue-900
          text-white
          px-4
          py-2
        "
      >
        <div
          className="
            text-[10px]
            font-black
            uppercase
          "
        >
          Valoración #1 · Inicial
        </div>

        <div
          className="
            text-[9px]
            text-blue-200
          "
        >
          Corresponde a la valoración registrada durante la identificación del riesgo.
          Se muestra como línea base y no se modifica desde Seguimientos.
        </div>
      </div>


      <div
        className="
          p-3
          bg-blue-50/30
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
          <div
            className="
              border
              border-blue-200
              rounded-lg
              bg-white
              px-3
              py-2
              text-center
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
              Exposición
            </div>

            <div
              className="
                text-xl
                font-black
                text-blue-900
              "
            >
              {riesgo.exposicion ||
                '-'}
            </div>
          </div>


          <div
            className="
              border
              border-indigo-200
              rounded-lg
              bg-white
              px-3
              py-2
              text-center
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
              Probabilidad
            </div>

            <div
              className="
                text-xl
                font-black
                text-indigo-900
              "
            >
              {riesgo.probabilidad ||
                '-'}
            </div>
          </div>


          <div
            className="
              border
              border-gray-200
              rounded-lg
              bg-white
              px-3
              py-2
              text-center
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
              NR
            </div>

            <div
              className="
                text-xl
                font-black
                text-gray-900
              "
            >
              {riesgo.valor_nivel_riesgo ||
                '-'}
            </div>
          </div>


          <div
            className="
              border
              border-gray-200
              rounded-lg
              bg-white
              px-3
              py-2
              flex
              justify-center
              items-center
            "
          >
            <span
              className={`
                border
                rounded-full
                px-2
                py-1
                text-[9px]
                font-black
                ${nivelClase(
                  riesgo.nivel_riesgo
                )}
              `}
            >
              {texto(
                riesgo.nivel_riesgo
              ) ||
                '-'}
            </span>
          </div>


          <div
            className="
              border
              border-purple-200
              rounded-lg
              bg-white
              px-3
              py-2
              text-center
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
              Severidad
            </div>

            <div
              className="
                text-xl
                font-black
                text-purple-900
              "
            >
              {riesgo.severidad ||
                '-'}
            </div>
          </div>


          <div
            className="
              border
              border-gray-200
              rounded-lg
              bg-white
              px-2
              py-2
              flex
              justify-center
              items-center
              text-center
            "
          >
            <span
              className={`
                border
                rounded
                px-2
                py-1
                text-[8px]
                font-black
                ${prioridadClase(
                  riesgo.prioridad_intervencion
                )}
              `}
            >
              {etiqueta(
                riesgo.prioridad_intervencion
              )}
            </span>
          </div>
        </div>


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-2
            text-[9px]
          "
        >
          <div
            className="
              border
              border-gray-200
              rounded-lg
              bg-white
              p-2
            "
          >
            <strong
              className="
                uppercase
                text-gray-500
              "
            >
              Justificación exposición
            </strong>

            <div
              className="
                mt-1
                whitespace-pre-wrap
              "
            >
              {texto(
                riesgo.justificacion_exposicion
              ) ||
                '-'}
            </div>
          </div>


          <div
            className="
              border
              border-gray-200
              rounded-lg
              bg-white
              p-2
            "
          >
            <strong
              className="
                uppercase
                text-gray-500
              "
            >
              Justificación probabilidad
            </strong>

            <div
              className="
                mt-1
                whitespace-pre-wrap
              "
            >
              {texto(
                riesgo.justificacion_probabilidad
              ) ||
                '-'}
            </div>
          </div>


          <div
            className="
              border
              border-gray-200
              rounded-lg
              bg-white
              p-2
            "
          >
            <strong
              className="
                uppercase
                text-gray-500
              "
            >
              Justificación severidad
            </strong>

            <div
              className="
                mt-1
                whitespace-pre-wrap
              "
            >
              {texto(
                riesgo.justificacion_severidad
              ) ||
                '-'}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function VistaSeguimientos({
  anio,
  riesgos,
  personal,
  guardando,
  guardarSeguimiento,
  eliminarSeguimiento,
}) {
  const [
    riesgoSeleccionadoId,
    setRiesgoSeleccionadoId,
  ] =
    useState('')

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] =
    useState(false)

  const [
    seguimientoEditando,
    setSeguimientoEditando,
  ] =
    useState(null)

  const [
    formulario,
    setFormulario,
  ] =
    useState(null)

  const [
    errorLocal,
    setErrorLocal,
  ] =
    useState('')


  // ==========================================================
  // LISTAS
  // ==========================================================

  const listaRiesgos =
    Array.isArray(
      riesgos
    )
      ? riesgos
      : []


  const listaPersonal =
    Array.isArray(
      personal
    )
      ? personal
      : []


  const riesgoSeleccionado =
    useMemo(
      () => {
        if (
          !riesgoSeleccionadoId
        ) {
          return null
        }

        return (
          listaRiesgos.find(
            riesgo =>
              Number(
                riesgo.id
              ) ===
              Number(
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


  const seguimientos =
    useMemo(
      () => {
        const lista =
          Array.isArray(
            riesgoSeleccionado
              ?.seguimientos
          )
            ? [
                ...riesgoSeleccionado
                  .seguimientos,
              ]
            : []

        return lista.sort(
          (
            a,
            b
          ) => {
            const numeroA =
              Number(
                a.numero_valoracion
              ) ||
              0

            const numeroB =
              Number(
                b.numero_valoracion
              ) ||
              0

            return (
              numeroB -
              numeroA
            )
          }
        )
      },
      [
        riesgoSeleccionado,
      ]
    )


  const medidas =
    Array.isArray(
      riesgoSeleccionado?.medidas
    )
      ? riesgoSeleccionado.medidas
      : []


  const medidasDisponibles =
    useMemo(
      () =>
        medidas.filter(
          medida => {
            const origen =
              texto(
                medida.origen
              ).toUpperCase()

            const estado =
              texto(
                medida.estado
              ).toUpperCase()

            if (
              origen ===
                'EXISTENTE' &&
              estado ===
                'ACTIVO'
            ) {
              return true
            }

            if (
              origen ===
                'PROPUESTA' &&
              estado ===
                'IMPLEMENTADA'
            ) {
              return true
            }

            return false
          }
        ),
      [
        medidas,
      ]
    )


  const medidasNoDisponibles =
    useMemo(
      () =>
        medidas.filter(
          medida =>
            !medidasDisponibles
              .some(
                disponible =>
                  Number(
                    disponible.id
                  ) ===
                  Number(
                    medida.id
                  )
              )
        ),
      [
        medidas,
        medidasDisponibles,
      ]
    )


  // ==========================================================
  // VISTA PREVIA
  // ==========================================================

  const vistaPrevia =
    useMemo(
      () =>
        calcularVistaPrevia(
          formulario?.exposicion,
          formulario?.probabilidad,
          formulario?.severidad
        ),
      [
        formulario?.exposicion,
        formulario?.probabilidad,
        formulario?.severidad,
      ]
    )


  // ==========================================================
  // CUANDO CAMBIA EL RIESGO DESDE LA RECARGA DEL PADRE
  // ==========================================================

  useEffect(
    () => {
      if (
        riesgoSeleccionadoId &&
        !listaRiesgos.some(
          riesgo =>
            Number(
              riesgo.id
            ) ===
            Number(
              riesgoSeleccionadoId
            )
        )
      ) {
        setRiesgoSeleccionadoId(
          ''
        )

        setMostrarFormulario(
          false
        )

        setSeguimientoEditando(
          null
        )

        setFormulario(
          null
        )
      }
    },
    [
      listaRiesgos,
      riesgoSeleccionadoId,
    ]
  )


  // ==========================================================
  // CAMBIAR RIESGO
  // ==========================================================

  function cambiarRiesgo(
    valor
  ) {
    setRiesgoSeleccionadoId(
      valor
    )

    setMostrarFormulario(
      false
    )

    setSeguimientoEditando(
      null
    )

    setFormulario(
      null
    )

    setErrorLocal(
      ''
    )
  }


  // ==========================================================
  // NUEVO
  // ==========================================================

  function nuevoSeguimiento() {
    if (
      !riesgoSeleccionado
    ) {
      return
    }

    setSeguimientoEditando(
      null
    )

    setFormulario(
      construirFormulario(
        riesgoSeleccionado
      )
    )

    setMostrarFormulario(
      true
    )

    setErrorLocal(
      ''
    )

    window.setTimeout(
      () => {
        document
          .getElementById(
            'formulario-seguimiento'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'start',
          })
      },
      100
    )
  }


  // ==========================================================
  // EDITAR
  // ==========================================================

  function editarSeguimiento(
    seguimiento
  ) {
    setSeguimientoEditando(
      seguimiento
    )

    setFormulario(
      construirFormulario(
        riesgoSeleccionado,
        seguimiento
      )
    )

    setMostrarFormulario(
      true
    )

    setErrorLocal(
      ''
    )

    window.setTimeout(
      () => {
        document
          .getElementById(
            'formulario-seguimiento'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'start',
          })
      },
      100
    )
  }


  // ==========================================================
  // CANCELAR
  // ==========================================================

  function cancelarFormulario() {
    setSeguimientoEditando(
      null
    )

    setFormulario(
      null
    )

    setMostrarFormulario(
      false
    )

    setErrorLocal(
      ''
    )
  }


  // ==========================================================
  // CAMBIAR CAMPO
  // ==========================================================

  function cambiarCampo(
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


  // ==========================================================
  // RESPONSABLE
  // ==========================================================

  function cambiarResponsable(
    valor
  ) {
    const persona =
      listaPersonal.find(
        item =>
          String(
            item?.id
          ) ===
          String(
            valor
          )
      )

    setFormulario(
      anterior => ({
        ...anterior,

        responsable_valoracion_personal_id:
          valor,

        responsable_valoracion_nombre:
          persona
            ? nombrePersonal(
                persona
              )
            : '',
      })
    )
  }


  // ==========================================================
  // SELECCIONAR MEDIDA
  // ==========================================================

  function cambiarMedida(
    medidaId
  ) {
    const id =
      Number(
        medidaId
      )

    setFormulario(
      anterior => {
        const actuales =
          Array.isArray(
            anterior?.medida_ids
          )
            ? anterior.medida_ids
            : []

        const existe =
          actuales.includes(
            id
          )

        return {
          ...anterior,

          medida_ids:
            existe
              ? actuales.filter(
                  item =>
                    item !==
                    id
                )
              : [
                  ...actuales,
                  id,
                ],
        }
      }
    )
  }


  // ==========================================================
  // GUARDAR
  // ==========================================================

  async function enviarFormulario(
    event
  ) {
    event.preventDefault()

    setErrorLocal(
      ''
    )


    const obligatorios = [
      [
        formulario?.fecha_seguimiento,
        'Ingrese la fecha del seguimiento.',
      ],
      [
        formulario?.tipo_seguimiento,
        'Seleccione el tipo de seguimiento.',
      ],
      [
        formulario?.exposicion,
        'Seleccione la exposición.',
      ],
      [
        formulario?.justificacion_exposicion,
        'Justifique la exposición.',
      ],
      [
        formulario?.probabilidad,
        'Seleccione la probabilidad.',
      ],
      [
        formulario?.justificacion_probabilidad,
        'Justifique la probabilidad.',
      ],
      [
        formulario?.severidad,
        'Seleccione la severidad.',
      ],
      [
        formulario?.justificacion_severidad,
        'Justifique la severidad.',
      ],
    ]


    const faltante =
      obligatorios.find(
        item =>
          !texto(
            item[0]
          )
      )


    if (
      faltante
    ) {
      setErrorLocal(
        faltante[1]
      )

      return
    }


    if (
      formulario
        ?.tipo_seguimiento ===
        'RESIDUAL' &&
      (
        !Array.isArray(
          formulario.medida_ids
        ) ||
        formulario
          .medida_ids
          .length ===
          0
      )
    ) {
      setErrorLocal(
        'Para registrar una valoración residual debe seleccionar al menos un control activo o una medida ya implementada que haya sido considerada en la nueva valoración.'
      )

      return
    }


    const resultado =
      await guardarSeguimiento({
        ...formulario,

        riesgo_id:
          riesgoSeleccionado.id,

        id:
          seguimientoEditando
            ?.id ||
          null,
      })


    if (
      resultado !==
      false
    ) {
      cancelarFormulario()
    }
  }


  // ==========================================================
  // CONFIRMAR ELIMINACIÓN
  // ==========================================================

  async function confirmarEliminar(
    seguimiento
  ) {
    const confirmar =
      window.confirm(
        `¿Desea eliminar la valoración #${seguimiento.numero_valoracion || seguimiento.id}? Esta acción eliminará este registro del historial del riesgo.`
      )

    if (
      !confirmar
    ) {
      return
    }

    await eliminarSeguimiento(
      seguimiento
    )
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        space-y-4
      "
    >
      {/* ==================================================
          ENCABEZADO DE LA PESTAÑA
      ================================================== */}

      <section
        className="
          border
          border-slate-300
          rounded-xl
          overflow-hidden
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
              text-[11px]
              font-black
              uppercase
            "
          >
            Seguimientos y valoraciones posteriores
          </div>

          <div
            className="
              mt-0.5
              text-[9px]
              text-slate-300
            "
          >
            Consulte la valoración inicial del riesgo y registre seguimientos,
            valoraciones residuales o revaloraciones posteriores.
          </div>
        </div>


        <div
          className="
            bg-gray-50
            p-3
          "
        >
          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-12
              gap-3
              items-end
            "
          >
            <div
              className="
                md:col-span-9
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
                Riesgo
              </label>

              <select
                value={
                  riesgoSeleccionadoId
                }
                onChange={
                  event =>
                    cambiarRiesgo(
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
                  Seleccione un riesgo...
                </option>

                {listaRiesgos.map(
                  riesgo => (
                    <option
                      key={
                        riesgo.id
                      }
                      value={
                        riesgo.id
                      }
                    >
                      {riesgo.codigo} · {riesgo.factor_riesgo}
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
              <div
                className="
                  border
                  border-gray-200
                  rounded
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
                  Vigencia
                </div>

                <div
                  className="
                    text-sm
                    font-black
                    text-slate-800
                  "
                >
                  {anio}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ==================================================
          SIN RIESGO
      ================================================== */}

      {!riesgoSeleccionado && (
        <div
          className="
            border
            border-dashed
            border-gray-300
            rounded-xl
            bg-gray-50
            py-14
            text-center
          "
        >
          <i
            className="
              fas
              fa-clock-rotate-left
              text-3xl
              text-gray-400
            "
          ></i>

          <div
            className="
              mt-3
              text-[11px]
              font-black
              text-gray-700
            "
          >
            Seleccione un riesgo
          </div>

          <div
            className="
              mt-1
              text-[9px]
              text-gray-500
            "
          >
            Podrá consultar su valoración inicial, registrar nuevas valoraciones
            y revisar todo el historial.
          </div>
        </div>
      )}


      {/* ==================================================
          RIESGO SELECCIONADO
      ================================================== */}

      {riesgoSeleccionado && (
        <>
          <section
            className="
              border
              border-gray-300
              rounded-xl
              bg-white
              p-3
            "
          >
            <div
              className="
                flex
                flex-col
                md:flex-row
                md:items-start
                md:justify-between
                gap-3
              "
            >
              <div>
                <div
                  className="
                    text-[9px]
                    uppercase
                    font-bold
                    text-gray-500
                  "
                >
                  Riesgo seleccionado
                </div>

                <div
                  className="
                    text-sm
                    font-black
                    text-blue-900
                  "
                >
                  {riesgoSeleccionado.codigo}
                </div>

                <div
                  className="
                    mt-1
                    text-[10px]
                    font-bold
                    text-gray-800
                  "
                >
                  {riesgoSeleccionado.factor_riesgo}
                </div>

                <div
                  className="
                    mt-1
                    text-[9px]
                    text-gray-600
                  "
                >
                  {texto(
                    riesgoSeleccionado.proceso
                  ) ||
                    '-'}

                  {' · '}

                  {texto(
                    riesgoSeleccionado.actividad
                  ) ||
                    '-'}
                </div>

                <div
                  className="
                    mt-1
                    text-[9px]
                    text-gray-500
                  "
                >
                  {texto(
                    riesgoSeleccionado.situacion_riesgo
                  ) ||
                    texto(
                      riesgoSeleccionado.descripcion_riesgo
                    ) ||
                    '-'}
                </div>
              </div>


              {!mostrarFormulario && (
                <button
                  type="button"
                  onClick={
                    nuevoSeguimiento
                  }
                  disabled={
                    guardando
                  }
                  className="
                    bg-emerald-600
                    hover:bg-emerald-700
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    text-white
                    rounded
                    px-4
                    py-2
                    text-[10px]
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

                  Registrar seguimiento / valoración
                </button>
              )}
            </div>
          </section>


          {/* ==================================================
              VALORACIÓN INICIAL
          ================================================== */}

          <ValoracionInicial
            riesgo={
              riesgoSeleccionado
            }
          />


          {/* ==================================================
              FORMULARIO
          ================================================== */}

          {mostrarFormulario &&
            formulario && (
              <section
                id="formulario-seguimiento"
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
                    py-3
                    flex
                    flex-col
                    md:flex-row
                    md:items-start
                    md:justify-between
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
                      {seguimientoEditando
                        ? `Editar valoración #${seguimientoEditando.numero_valoracion || ''}`
                        : 'Registrar seguimiento / valoración posterior'}
                    </div>

                    <div
                      className="
                        text-[9px]
                        text-blue-200
                        mt-0.5
                      "
                    >
                      Riesgo {riesgoSeleccionado.codigo} · El cálculo definitivo del nivel y la prioridad lo realizará la API.
                    </div>
                  </div>


                  <button
                    type="button"
                    onClick={
                      cancelarFormulario
                    }
                    disabled={
                      guardando
                    }
                    className="
                      bg-white/10
                      hover:bg-white/20
                      disabled:opacity-50
                      border
                      border-white/20
                      rounded
                      px-3
                      py-1.5
                      text-[9px]
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
                </div>


                <form
                  onSubmit={
                    enviarFormulario
                  }
                  className="
                    p-4
                    bg-blue-50/20
                    space-y-5
                  "
                >
                  {errorLocal && (
                    <div
                      className="
                        bg-red-50
                        border
                        border-red-200
                        text-red-700
                        rounded-lg
                        px-3
                        py-2
                        text-[10px]
                      "
                    >
                      <i
                        className="
                          fas
                          fa-circle-exclamation
                          mr-2
                        "
                      ></i>

                      {errorLocal}
                    </div>
                  )}


                  {/* ==========================================
                      1. INFORMACIÓN
                  ========================================== */}

                  <TituloSeccion
                    titulo="1. Información del seguimiento"
                    descripcion="Indique el tipo de revisión realizada y la fecha correspondiente."
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
                      label="Fecha del seguimiento *"
                      type="date"
                      value={
                        formulario.fecha_seguimiento
                      }
                      onChange={
                        valor =>
                          cambiarCampo(
                            'fecha_seguimiento',
                            valor
                          )
                      }
                      clase="md:col-span-3"
                    />


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
                        Tipo de seguimiento *
                      </label>

                      <select
                        value={
                          formulario.tipo_seguimiento
                        }
                        onChange={
                          event =>
                            cambiarCampo(
                              'tipo_seguimiento',
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
                        <option value="SEGUIMIENTO">
                          Seguimiento
                        </option>

                        <option value="RESIDUAL">
                          Valoración residual
                        </option>

                        <option value="REVALORACION">
                          Revaloración
                        </option>
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
                          font-bold
                          uppercase
                          text-gray-600
                          mb-1
                        "
                      >
                        Estado del riesgo
                      </label>

                      <select
                        value={
                          formulario.estado_riesgo
                        }
                        onChange={
                          event =>
                            cambiarCampo(
                              'estado_riesgo',
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


                  <div
                    className="
                      border
                      border-slate-200
                      rounded-lg
                      bg-slate-50
                      p-3
                      text-[9px]
                      text-slate-700
                    "
                  >
                    <strong>Seguimiento:</strong>{' '}
                    revisión del estado, acciones y comportamiento del riesgo.

                    {' '}

                    <strong>Valoración residual:</strong>{' '}
                    nueva valoración después de considerar controles efectivamente implementados.

                    {' '}

                    <strong>Revaloración:</strong>{' '}
                    actualización cuando cambian las condiciones, antecedentes o controles.
                  </div>


                  {/* ==========================================
                      2. CONTROLES / MEDIDAS
                  ========================================== */}

                  <TituloSeccion
                    titulo="2. Controles y medidas consideradas"
                    descripcion="Seleccione únicamente controles vigentes o medidas que ya estén implementadas y que hayan sido consideradas en esta valoración."
                  />


                  {medidasDisponibles.length >
                  0 ? (
                    <div
                      className="
                        grid
                        grid-cols-1
                        md:grid-cols-2
                        gap-2
                      "
                    >
                      {medidasDisponibles.map(
                        medida => {
                          const seleccionada =
                            formulario
                              .medida_ids
                              .includes(
                                Number(
                                  medida.id
                                )
                              )

                          return (
                            <label
                              key={
                                medida.id
                              }
                              className={`
                                border
                                rounded-lg
                                p-3
                                cursor-pointer
                                transition
                                ${
                                  seleccionada
                                    ? 'bg-green-50 border-green-500 ring-1 ring-green-500'
                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                }
                              `}
                            >
                              <div
                                className="
                                  flex
                                  items-start
                                  gap-2
                                "
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    seleccionada
                                  }
                                  onChange={() =>
                                    cambiarMedida(
                                      medida.id
                                    )
                                  }
                                  className="
                                    mt-0.5
                                  "
                                />

                                <div
                                  className="
                                    min-w-0
                                  "
                                >
                                  <div
                                    className="
                                      flex
                                      flex-wrap
                                      gap-1
                                      mb-1
                                    "
                                  >
                                    <span
                                      className="
                                        bg-slate-100
                                        border
                                        border-slate-200
                                        rounded
                                        px-1.5
                                        py-0.5
                                        text-[8px]
                                        font-black
                                        uppercase
                                      "
                                    >
                                      {texto(
                                        medida.origen
                                      ) ===
                                      'EXISTENTE'
                                        ? 'Control existente'
                                        : 'Medida implementada'}
                                    </span>

                                    <span
                                      className="
                                        bg-blue-50
                                        border
                                        border-blue-200
                                        text-blue-800
                                        rounded
                                        px-1.5
                                        py-0.5
                                        text-[8px]
                                        font-bold
                                      "
                                    >
                                      {etiquetaTipoControl(
                                        medida.tipo_control
                                      )}
                                    </span>
                                  </div>

                                  <div
                                    className="
                                      text-[10px]
                                      text-gray-800
                                      whitespace-pre-wrap
                                    "
                                  >
                                    {medida.descripcion}
                                  </div>

                                  <div
                                    className="
                                      mt-1
                                      text-[8px]
                                      text-gray-500
                                    "
                                  >
                                    Estado:{' '}

                                    <strong>
                                      {etiqueta(
                                        medida.estado
                                      )}
                                    </strong>

                                    {medida.fecha_implementacion && (
                                      <>
                                        {' · '}
                                        Implementación:{' '}

                                        <strong>
                                          {formatearFecha(
                                            medida.fecha_implementacion
                                          )}
                                        </strong>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </label>
                          )
                        }
                      )}
                    </div>
                  ) : (
                    <div
                      className="
                        border
                        border-dashed
                        border-amber-300
                        bg-amber-50
                        rounded-lg
                        p-4
                        text-center
                        text-[10px]
                        text-amber-800
                      "
                    >
                      <i
                        className="
                          fas
                          fa-triangle-exclamation
                          mr-1.5
                        "
                      ></i>

                      El riesgo todavía no tiene controles activos o medidas implementadas disponibles para considerar.
                    </div>
                  )}


                  {medidasNoDisponibles.length >
                    0 && (
                    <div
                      className="
                        border
                        border-gray-200
                        rounded-lg
                        bg-gray-50
                        p-3
                      "
                    >
                      <div
                        className="
                          text-[9px]
                          font-black
                          uppercase
                          text-gray-600
                          mb-2
                        "
                      >
                        Medidas todavía no disponibles para reducir el riesgo
                      </div>

                      <div
                        className="
                          space-y-1
                        "
                      >
                        {medidasNoDisponibles.map(
                          medida => (
                            <div
                              key={
                                medida.id
                              }
                              className="
                                text-[9px]
                                text-gray-500
                              "
                            >
                              <i
                                className="
                                  fas
                                  fa-clock
                                  mr-1.5
                                "
                              ></i>

                              {medida.descripcion}

                              {' · '}

                              <strong>
                                {etiqueta(
                                  medida.estado
                                )}
                              </strong>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}


                  <Area
                    label="Controles aplicados / considerados"
                    value={
                      formulario.control_aplicado
                    }
                    onChange={
                      valor =>
                        cambiarCampo(
                          'control_aplicado',
                          valor
                        )
                    }
                    rows={2}
                    placeholder="Resuma cómo se aplicaron los controles considerados durante el periodo evaluado."
                  />


                  {/* ==========================================
                      3. EVIDENCIA Y EFICACIA
                  ========================================== */}

                  <TituloSeccion
                    titulo="3. Evidencia y eficacia observada"
                    descripcion="Registre antecedentes del periodo y analice si los controles realmente funcionaron."
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
                      rows={3}
                      placeholder="Intervenciones del instructor, incidentes, siniestros, observaciones, hallazgos, preoperacionales..."
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
                      rows={3}
                      placeholder="Explique si los controles se aplican sistemáticamente y qué resultados han mostrado."
                    />
                  </div>


                  {/* ==========================================
                      4. VALORACIÓN
                  ========================================== */}

                  <TituloSeccion
                    titulo="4. Valoración posterior"
                    descripcion="Vuelva a valorar las condiciones actuales. La severidad normalmente permanece igual si el tratamiento solamente reduce exposición o probabilidad."
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
                    placeholder="Explique por qué la frecuencia actual de exposición corresponde al nivel seleccionado."
                  />


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
                    placeholder="Considere controles aplicados, eficacia observada y antecedentes del periodo."
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


                  {/* ==========================================
                      COMPARACIÓN
                  ========================================== */}

                  <div
                    className="
                      border
                      border-gray-200
                      rounded-xl
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
                        text-[9px]
                        font-black
                        uppercase
                        text-gray-700
                      "
                    >
                      Comparación con la valoración inicial
                    </div>

                    <div
                      className="
                        p-3
                        grid
                        grid-cols-2
                        md:grid-cols-6
                        gap-2
                      "
                    >
                      <div
                        className="
                          border
                          rounded-lg
                          bg-blue-50
                          border-blue-200
                          px-2
                          py-2
                          text-center
                        "
                      >
                        <div
                          className="
                            text-[8px]
                            uppercase
                            font-bold
                            text-blue-700
                          "
                        >
                          NR inicial
                        </div>

                        <div
                          className="
                            text-lg
                            font-black
                          "
                        >
                          {riesgoSeleccionado.valor_nivel_riesgo ||
                            '-'}
                        </div>
                      </div>


                      <div
                        className="
                          border
                          rounded-lg
                          bg-blue-50
                          border-blue-200
                          px-2
                          py-2
                          text-center
                        "
                      >
                        <div
                          className="
                            text-[8px]
                            uppercase
                            font-bold
                            text-blue-700
                          "
                        >
                          Nivel inicial
                        </div>

                        <div
                          className="
                            text-[10px]
                            font-black
                            mt-1
                          "
                        >
                          {texto(
                            riesgoSeleccionado.nivel_riesgo
                          ) ||
                            '-'}
                        </div>
                      </div>


                      <div
                        className="
                          border
                          rounded-lg
                          bg-blue-50
                          border-blue-200
                          px-2
                          py-2
                          text-center
                        "
                      >
                        <div
                          className="
                            text-[8px]
                            uppercase
                            font-bold
                            text-blue-700
                          "
                        >
                          S inicial
                        </div>

                        <div
                          className="
                            text-lg
                            font-black
                          "
                        >
                          {riesgoSeleccionado.severidad ||
                            '-'}
                        </div>
                      </div>


                      <div
                        className="
                          border
                          rounded-lg
                          bg-green-50
                          border-green-200
                          px-2
                          py-2
                          text-center
                        "
                      >
                        <div
                          className="
                            text-[8px]
                            uppercase
                            font-bold
                            text-green-700
                          "
                        >
                          Nuevo NR
                        </div>

                        <div
                          className="
                            text-lg
                            font-black
                            text-green-900
                          "
                        >
                          {vistaPrevia.valor ??
                            '-'}
                        </div>
                      </div>


                      <div
                        className="
                          border
                          rounded-lg
                          bg-green-50
                          border-green-200
                          px-2
                          py-2
                          text-center
                        "
                      >
                        <div
                          className="
                            text-[8px]
                            uppercase
                            font-bold
                            text-green-700
                          "
                        >
                          Nuevo nivel
                        </div>

                        <div
                          className="
                            text-[10px]
                            font-black
                            mt-1
                          "
                        >
                          {vistaPrevia.nivel ||
                            '-'}
                        </div>
                      </div>


                      <div
                        className="
                          border
                          rounded-lg
                          bg-green-50
                          border-green-200
                          px-2
                          py-2
                          text-center
                        "
                      >
                        <div
                          className="
                            text-[8px]
                            uppercase
                            font-bold
                            text-green-700
                          "
                        >
                          Prioridad
                        </div>

                        <div
                          className="
                            text-[9px]
                            font-black
                            mt-1
                          "
                        >
                          {etiqueta(
                            vistaPrevia.prioridad
                          )}
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* ==========================================
                      5. RESULTADO
                  ========================================== */}

                  <TituloSeccion
                    titulo="5. Resultado del seguimiento"
                    descripcion="Documente las acciones ejecutadas, el resultado observado y la verificación de eficacia."
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
                      label="Acción realizada"
                      value={
                        formulario.accion_realizada
                      }
                      onChange={
                        valor =>
                          cambiarCampo(
                            'accion_realizada',
                            valor
                          )
                      }
                      rows={2}
                    />

                    <Area
                      label="Resultado"
                      value={
                        formulario.resultado
                      }
                      onChange={
                        valor =>
                          cambiarCampo(
                            'resultado',
                            valor
                          )
                      }
                      rows={2}
                    />
                  </div>


                  <div
                    className="
                      grid
                      grid-cols-1
                      md:grid-cols-12
                      gap-3
                    "
                  >
                    <Area
                      label="Verificación de eficacia"
                      value={
                        formulario.verificacion_eficacia
                      }
                      onChange={
                        valor =>
                          cambiarCampo(
                            'verificacion_eficacia',
                            valor
                          )
                      }
                      rows={2}
                      clase="md:col-span-8"
                    />

                    <Campo
                      label="Fecha verificación"
                      type="date"
                      value={
                        formulario.fecha_verificacion_eficacia
                      }
                      onChange={
                        valor =>
                          cambiarCampo(
                            'fecha_verificacion_eficacia',
                            valor
                          )
                      }
                      clase="md:col-span-4"
                    />
                  </div>


                  {/* ==========================================
                      6. RESPONSABLE
                  ========================================== */}

                  <TituloSeccion
                    titulo="6. Responsable y próxima revisión"
                    descripcion="Identifique quién realiza la valoración y programe el próximo seguimiento cuando corresponda."
                  />


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
                        md:col-span-7
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
                        Responsable de la valoración
                      </label>

                      <select
                        value={
                          formulario.responsable_valoracion_personal_id
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
                        <option value="">
                          Seleccione...
                        </option>

                        {listaPersonal.map(
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


                    <Campo
                      label="Próximo seguimiento"
                      type="date"
                      value={
                        formulario.proximo_seguimiento
                      }
                      onChange={
                        valor =>
                          cambiarCampo(
                            'proximo_seguimiento',
                            valor
                          )
                      }
                      clase="md:col-span-5"
                    />
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


                  <div
                    className="
                      bg-amber-50
                      border
                      border-amber-200
                      rounded-lg
                      p-3
                      text-[9px]
                      text-amber-800
                    "
                  >
                    <strong>
                      Importante:
                    </strong>{' '}

                    una medida pendiente o en proceso no debe utilizarse para justificar
                    una reducción del riesgo. La disminución de exposición o probabilidad
                    debe sustentarse en controles realmente aplicados y en evidencia de su funcionamiento.
                  </div>


                  {/* ==========================================
                      ACCIONES
                  ========================================== */}

                  <div
                    className="
                      border-t
                      border-gray-200
                      pt-3
                      flex
                      justify-end
                      gap-2
                    "
                  >
                    <button
                      type="button"
                      onClick={
                        cancelarFormulario
                      }
                      disabled={
                        guardando
                      }
                      className="
                        bg-gray-200
                        hover:bg-gray-300
                        disabled:opacity-50
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
                        disabled:cursor-not-allowed
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
                            seguimientoEditando
                              ? 'fa-save'
                              : 'fa-plus'
                          }
                          mr-1.5
                        `}
                      ></i>

                      {guardando
                        ? 'Guardando...'
                        : seguimientoEditando
                          ? 'Guardar cambios'
                          : 'Guardar seguimiento'}
                    </button>
                  </div>
                </form>
              </section>
            )}


          {/* ==================================================
              HISTORIAL
          ================================================== */}

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
                flex
                items-center
                justify-between
                gap-3
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
                  Historial de valoraciones posteriores
                </div>

                <div
                  className="
                    text-[9px]
                    text-slate-300
                  "
                >
                  La valoración inicial se conserva arriba como valoración #1.
                </div>
              </div>

              <span
                className="
                  bg-white/10
                  rounded-full
                  px-2
                  py-1
                  text-[9px]
                  font-bold
                "
              >
                {seguimientos.length}
              </span>
            </div>


            {seguimientos.length ===
            0 ? (
              <div
                className="
                  py-10
                  text-center
                  bg-gray-50
                "
              >
                <i
                  className="
                    fas
                    fa-clock-rotate-left
                    text-2xl
                    text-gray-400
                  "
                ></i>

                <div
                  className="
                    mt-2
                    text-[10px]
                    font-bold
                    text-gray-700
                  "
                >
                  Aún no existen seguimientos posteriores
                </div>

                <div
                  className="
                    mt-1
                    text-[9px]
                    text-gray-500
                  "
                >
                  La valoración inicial es actualmente la única valoración del riesgo.
                </div>
              </div>
            ) : (
              <div
                className="
                  p-3
                  bg-gray-50
                  space-y-3
                "
              >
                {seguimientos.map(
                  seguimiento => {
                    const medidasSeguimiento =
                      Array.isArray(
                        seguimiento.medidas_consideradas
                      )
                        ? seguimiento.medidas_consideradas
                        : []

                    return (
                      <article
                        key={
                          seguimiento.id
                        }
                        className="
                          border
                          border-gray-200
                          rounded-xl
                          bg-white
                          overflow-hidden
                        "
                      >
                        <div
                          className="
                            bg-slate-50
                            border-b
                            border-gray-200
                            px-3
                            py-2
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
                              flex-wrap
                              items-center
                              gap-2
                            "
                          >
                            <span
                              className="
                                bg-blue-900
                                text-white
                                rounded
                                px-2
                                py-1
                                text-[9px]
                                font-black
                              "
                            >
                              Valoración #{seguimiento.numero_valoracion || '-'}
                            </span>

                            <span
                              className="
                                text-[9px]
                                font-bold
                                text-gray-700
                              "
                            >
                              {etiqueta(
                                seguimiento.tipo_seguimiento
                              )}
                            </span>

                            <span
                              className="
                                text-[9px]
                                text-gray-500
                              "
                            >
                              {formatearFecha(
                                seguimiento.fecha_seguimiento
                              )}
                            </span>
                          </div>


                          <div
                            className="
                              flex
                              gap-1
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                editarSeguimiento(
                                  seguimiento
                                )
                              }
                              disabled={
                                guardando
                              }
                              className="
                                bg-blue-100
                                hover:bg-blue-200
                                disabled:opacity-50
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
                                  fa-pen
                                  mr-1
                                "
                              ></i>

                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                confirmarEliminar(
                                  seguimiento
                                )
                              }
                              disabled={
                                guardando
                              }
                              className="
                                bg-red-100
                                hover:bg-red-200
                                disabled:opacity-50
                                text-red-700
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
                                  fa-trash
                                  mr-1
                                "
                              ></i>

                              Eliminar
                            </button>
                          </div>
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
                            <div
                              className="
                                border
                                rounded-lg
                                px-2
                                py-2
                                text-center
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
                                E
                              </div>

                              <div
                                className="
                                  text-lg
                                  font-black
                                "
                              >
                                {seguimiento.exposicion ||
                                  '-'}
                              </div>
                            </div>


                            <div
                              className="
                                border
                                rounded-lg
                                px-2
                                py-2
                                text-center
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
                                P
                              </div>

                              <div
                                className="
                                  text-lg
                                  font-black
                                "
                              >
                                {seguimiento.probabilidad ||
                                  '-'}
                              </div>
                            </div>


                            <div
                              className="
                                border
                                rounded-lg
                                px-2
                                py-2
                                text-center
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
                                NR
                              </div>

                              <div
                                className="
                                  text-lg
                                  font-black
                                "
                              >
                                {seguimiento.valor_nivel_riesgo ||
                                  '-'}
                              </div>
                            </div>


                            <div
                              className="
                                border
                                rounded-lg
                                px-2
                                py-2
                                flex
                                justify-center
                                items-center
                              "
                            >
                              <span
                                className={`
                                  border
                                  rounded-full
                                  px-2
                                  py-1
                                  text-[8px]
                                  font-black
                                  ${nivelClase(
                                    seguimiento.nivel_riesgo
                                  )}
                                `}
                              >
                                {texto(
                                  seguimiento.nivel_riesgo
                                ) ||
                                  '-'}
                              </span>
                            </div>


                            <div
                              className="
                                border
                                rounded-lg
                                px-2
                                py-2
                                text-center
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
                                Severidad
                              </div>

                              <div
                                className="
                                  text-lg
                                  font-black
                                "
                              >
                                {seguimiento.severidad ||
                                  '-'}
                              </div>
                            </div>


                            <div
                              className="
                                border
                                rounded-lg
                                px-2
                                py-2
                                flex
                                justify-center
                                items-center
                                text-center
                              "
                            >
                              <span
                                className={`
                                  border
                                  rounded
                                  px-2
                                  py-1
                                  text-[8px]
                                  font-black
                                  ${prioridadClase(
                                    seguimiento.prioridad_intervencion
                                  )}
                                `}
                              >
                                {etiqueta(
                                  seguimiento.prioridad_intervencion
                                )}
                              </span>
                            </div>
                          </div>


                          <div
                            className="
                              grid
                              grid-cols-1
                              md:grid-cols-3
                              gap-2
                              text-[9px]
                            "
                          >
                            <div
                              className="
                                border
                                border-gray-200
                                rounded-lg
                                p-2
                              "
                            >
                              <strong
                                className="
                                  uppercase
                                  text-gray-500
                                "
                              >
                                Justificación exposición
                              </strong>

                              <div
                                className="
                                  mt-1
                                  whitespace-pre-wrap
                                "
                              >
                                {texto(
                                  seguimiento.justificacion_exposicion
                                ) ||
                                  '-'}
                              </div>
                            </div>


                            <div
                              className="
                                border
                                border-gray-200
                                rounded-lg
                                p-2
                              "
                            >
                              <strong
                                className="
                                  uppercase
                                  text-gray-500
                                "
                              >
                                Justificación probabilidad
                              </strong>

                              <div
                                className="
                                  mt-1
                                  whitespace-pre-wrap
                                "
                              >
                                {texto(
                                  seguimiento.justificacion_probabilidad
                                ) ||
                                  '-'}
                              </div>
                            </div>


                            <div
                              className="
                                border
                                border-gray-200
                                rounded-lg
                                p-2
                              "
                            >
                              <strong
                                className="
                                  uppercase
                                  text-gray-500
                                "
                              >
                                Justificación severidad
                              </strong>

                              <div
                                className="
                                  mt-1
                                  whitespace-pre-wrap
                                "
                              >
                                {texto(
                                  seguimiento.justificacion_severidad
                                ) ||
                                  '-'}
                              </div>
                            </div>
                          </div>


                          {medidasSeguimiento.length >
                            0 && (
                            <div
                              className="
                                border
                                border-green-200
                                bg-green-50/40
                                rounded-lg
                                p-2
                              "
                            >
                              <div
                                className="
                                  text-[8px]
                                  font-black
                                  uppercase
                                  text-green-800
                                  mb-1.5
                                "
                              >
                                Controles / medidas consideradas
                              </div>

                              <div
                                className="
                                  space-y-1
                                "
                              >
                                {medidasSeguimiento.map(
                                  medida => (
                                    <div
                                      key={
                                        medida.id
                                      }
                                      className="
                                        text-[9px]
                                        text-gray-700
                                      "
                                    >
                                      <i
                                        className="
                                          fas
                                          fa-check
                                          text-green-700
                                          mr-1.5
                                        "
                                      ></i>

                                      {medida.descripcion}

                                      {' · '}

                                      <strong>
                                        {etiquetaTipoControl(
                                          medida.tipo_control
                                        )}
                                      </strong>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}


                          <div
                            className="
                              grid
                              grid-cols-1
                              md:grid-cols-2
                              gap-2
                              text-[9px]
                            "
                          >
                            <div
                              className="
                                border
                                border-gray-200
                                rounded-lg
                                p-2
                              "
                            >
                              <strong
                                className="
                                  uppercase
                                  text-gray-500
                                "
                              >
                                Acción realizada
                              </strong>

                              <div
                                className="
                                  mt-1
                                  whitespace-pre-wrap
                                "
                              >
                                {texto(
                                  seguimiento.accion_realizada
                                ) ||
                                  '-'}
                              </div>
                            </div>


                            <div
                              className="
                                border
                                border-gray-200
                                rounded-lg
                                p-2
                              "
                            >
                              <strong
                                className="
                                  uppercase
                                  text-gray-500
                                "
                              >
                                Resultado
                              </strong>

                              <div
                                className="
                                  mt-1
                                  whitespace-pre-wrap
                                "
                              >
                                {texto(
                                  seguimiento.resultado
                                ) ||
                                  '-'}
                              </div>
                            </div>
                          </div>


                          <div
                            className="
                              flex
                              flex-wrap
                              gap-x-5
                              gap-y-1
                              border-t
                              border-gray-100
                              pt-2
                              text-[8px]
                              text-gray-500
                            "
                          >
                            <span>
                              Estado:{' '}

                              <strong
                                className="
                                  text-gray-700
                                "
                              >
                                {etiqueta(
                                  seguimiento.estado_riesgo
                                )}
                              </strong>
                            </span>

                            <span>
                              Responsable:{' '}

                              <strong
                                className="
                                  text-gray-700
                                "
                              >
                                {texto(
                                  seguimiento.responsable_valoracion_nombre
                                ) ||
                                  '-'}
                              </strong>
                            </span>

                            <span>
                              Próxima revisión:{' '}

                              <strong
                                className="
                                  text-gray-700
                                "
                              >
                                {formatearFecha(
                                  seguimiento.proximo_seguimiento
                                )}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </article>
                    )
                  }
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}