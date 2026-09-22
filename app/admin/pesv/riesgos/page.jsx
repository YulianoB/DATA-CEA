// app/admin/pesv/riesgos/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  cerrarSesion,
} from '@/lib/auth/logout'

import RiesgosTabs
  from './components/RiesgosTabs'

import ResumenRiesgos
  from './components/ResumenRiesgos'

import VistaMatrizRiesgos
  from './components/VistaMatrizRiesgos'

import ModalDetalleRiesgo
  from './components/ModalDetalleRiesgo'

import VistaSeguimientos
  from './components/VistaSeguimientos'

import VistaMapaCalor
  from './components/VistaMapaCalor'

import VistaCatalogoRiesgos
  from './components/VistaCatalogoRiesgos'

import VistaMetodologia
  from './components/VistaMetodologia'

import VistaProgramasPesv
  from './components/VistaProgramasPesv'

// ============================================================
// CONSTANTES
// ============================================================

const ANIO_ACTUAL =
  new Date().getFullYear()


const FORMULARIO_INICIAL = {
  id:
    null,

  codigo:
    '',

  fecha_identificacion:
    new Date()
      .toISOString()
      .slice(
        0,
        10
      ),

  proceso:
    '',

  contexto_exposicion:
    'FORMACION_PRACTICA',

  actividad:
    '',

  actores_expuestos:
    '',

  factor_riesgo:
    '',

  situacion_riesgo:
    '',

  evento_peligroso:
    '',

  causa:
    '',

  consecuencia:
    '',

  fuente_identificacion:
    '',

  control_existente:
    '',

  exposicion:
    '',

  justificacion_exposicion:
    '',

  antecedentes_considerados:
    '',

  eficacia_controles:
    '',

  probabilidad:
    '',

  justificacion_probabilidad:
    '',

  severidad:
    '',

  justificacion_severidad:
    '',

  tratamiento:
    '',

  accion_propuesta:
    '',

  responsable_personal_id:
    '',

  responsable_nombre:
    '',

  fecha_compromiso:
    '',

  estado:
    'ACTIVO',

  activo:
    true,

  observaciones:
    '',

  programa_ids:
    [],
}


// ============================================================
// HELPERS
// ============================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function obtenerNitUsuario(
  user
) {
  return texto(
    user?.nit ||
    user?.nitEmpresa ||
    user?.nit_empresa ||
    user?.empresaNit ||
    user?.empresa_nit ||
    ''
  )
}


function obtenerNombreUsuario(
  user
) {
  return texto(
    user?.nombreCompleto ||
    user?.nombre_completo ||
    user?.usuario ||
    ''
  ) || '-'
}


function obtenerNombreEmpresa(
  user
) {
  return texto(
    user?.nombreEmpresa ||
    user?.nombre_empresa ||
    user?.empresa ||
    ''
  ) || '-'
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
// PÁGINA
// ============================================================

export default function RiesgosPesvPage() {
  const router =
    useRouter()


  const [
    user,
    setUser,
  ] =
    useState(null)

  const [
    anio,
    setAnio,
  ] =
    useState(
      ANIO_ACTUAL
    )

  const [
    pestana,
    setPestana,
  ] =
    useState(
      'MATRIZ'
    )

  const [
    riesgos,
    setRiesgos,
  ] =
    useState([])

  const [
    programas,
    setProgramas,
  ] =
    useState([])

  const [
    personal,
    setPersonal,
  ] =
    useState([])

  const [
    resumen,
    setResumen,
  ] =
    useState({
      total:
        0,

      criticos:
        0,

      moderados:
        0,

      bajos:
        0,

      prioritarios:
        0,
    })

  const [
    metodologia,
    setMetodologia,
  ] =
    useState(null)

  const [
    formulario,
    setFormulario,
  ] =
    useState(
      FORMULARIO_INICIAL
    )

  const [
    editandoId,
    setEditandoId,
  ] =
    useState(null)

  const [
    cargando,
    setCargando,
  ] =
    useState(true)

  const [
    guardando,
    setGuardando,
  ] =
    useState(false)

  const [
    mostrarFormulario,
    setMostrarFormulario,
    ] =
    useState(false)

  const [
    riesgoDetalleId,
    setRiesgoDetalleId,
    ] =
    useState(null)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    mensaje,
    setMensaje,
  ] =
    useState('')

  const [
    filtroTexto,
    setFiltroTexto,
  ] =
    useState('')

  const [
    filtroNivel,
    setFiltroNivel,
  ] =
    useState('')


  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(
    () => {
      const almacenado =
        localStorage.getItem(
          'currentUser'
        )

      if (!almacenado) {
        router.push(
          '/login'
        )

        return
      }

      try {
        setUser(
          JSON.parse(
            almacenado
          )
        )
      } catch (
        sessionError
      ) {
        console.error(
          'Error leyendo sesión:',
          sessionError
        )

        localStorage.removeItem(
          'currentUser'
        )

        router.push(
          '/login'
        )
      }
    },
    [
      router,
    ]
  )


  // ==========================================================
  // CONSULTAR
  // ==========================================================

  async function cargarDatos() {
    if (!user) {
      return
    }

    const nit =
      obtenerNitUsuario(
        user
      )

    if (!nit) {
      setError(
        'No fue posible identificar el NIT del CEA.'
      )

      setCargando(
        false
      )

      return
    }

    try {
      setCargando(
        true
      )

      setError(
        ''
      )

      const params =
        new URLSearchParams({
          nit,

          anio:
            String(
              anio
            ),
        })

      const response =
        await fetch(
          `/api/admin/pesv/riesgos?${params.toString()}`,
          {
            method:
              'GET',

            cache:
              'no-store',
          }
        )

      // ============================================================
    // LECTURA SEGURA RESPUESTA GET RIESGOS PESV
    // app/admin/pesv/riesgos/page.jsx
    // API: GET /api/admin/pesv/riesgos
    // ============================================================

    const contentType =
    response.headers.get(
        'content-type'
    ) || ''

    if (
    !contentType.includes(
        'application/json'
    )
    ) {
    const respuestaTexto =
        await response.text()

    console.error(
        'La API de riesgos no devolvió JSON:',
        respuestaTexto
    )

    throw new Error(
        `La API de riesgos devolvió una respuesta no válida. HTTP ${response.status}.`
    )
    }

    const data =
    await response.json()

    if (
    !response.ok ||
    !data?.ok
    ) {
    throw new Error(
        data?.error ||
        'No fue posible consultar la Matriz de Riesgos PESV.'
    )
    }
      setRiesgos(
        Array.isArray(
          data?.riesgos
        )
          ? data.riesgos
          : []
      )

      setProgramas(
        Array.isArray(
          data?.programas
        )
          ? data.programas
          : []
      )

      setPersonal(
        Array.isArray(
          data?.personal
        )
          ? data.personal
          : []
      )

      setResumen(
        data?.resumen || {
          total:
            0,

          criticos:
            0,

          moderados:
            0,

          bajos:
            0,

          prioritarios:
            0,
        }
      )

      setMetodologia(
        data?.metodologia ||
        null
      )
    } catch (
      consultaError
    ) {
      console.error(
        'Error cargando Matriz de Riesgos:',
        consultaError
      )

      setError(
        consultaError?.message ||
        'No fue posible consultar la información.'
      )
    } finally {
      setCargando(
        false
      )
    }
  }


  useEffect(
    () => {
      if (
        user
      ) {
        cargarDatos()
      }
    },
    [
      user,
      anio,
    ]
  )


  // ==========================================================
  // PETICIÓN
  // ==========================================================

  async function enviarPeticion(
    method,
    body
  ) {
    const nit =
      obtenerNitUsuario(
        user
      )

    const response =
      await fetch(
        '/api/admin/pesv/riesgos',
        {
          method,

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              ...body,

              nit,

              usuario_actualizacion:
                obtenerNombreUsuario(
                  user
                ),
            }),
        }
      )

    const data =
      await response.json()

    if (
      !response.ok ||
      !data?.ok
    ) {
      throw new Error(
        data?.error ||
        'No fue posible completar la operación.'
      )
    }

    return data
  }


  // ==========================================================
  // FORMULARIO
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


  function cambiarResponsable(
    valor
  ) {
    const persona =
      personal.find(
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


  function cambiarPrograma(
    programaId
  ) {
    setFormulario(
      anterior => {
        const existe =
          anterior
            .programa_ids
            .includes(
              programaId
            )

        return {
          ...anterior,

          programa_ids:
            existe
              ? anterior
                  .programa_ids
                  .filter(
                    id =>
                      id !==
                      programaId
                  )
              : [
                  ...anterior.programa_ids,
                  programaId,
                ],
        }
      }
    )
  }


  function limpiarFormulario() {
  setEditandoId(
    null
    )

    setFormulario({
        ...FORMULARIO_INICIAL,

        fecha_identificacion:
        new Date()
            .toISOString()
            .slice(
            0,
            10
            ),
    })

    setError(
        ''
    )

    setMostrarFormulario(
        false
    )
    }

    function verRiesgo(
    riesgo
    ) {
    setRiesgoDetalleId(
        riesgo.id
    )
    }


    function cerrarDetalle() {
    setRiesgoDetalleId(
        null
    )
    }

  function editarRiesgo(
    riesgo
  ) {
    setEditandoId(
      riesgo.id
    )

    setMostrarFormulario(
    true
    )

    setFormulario({
      id:
        riesgo.id,

      codigo:
        texto(
          riesgo.codigo
        ),

      fecha_identificacion:
        texto(
          riesgo.fecha_identificacion
        ),

      proceso:
        texto(
          riesgo.proceso
        ),

      contexto_exposicion:
        texto(
          riesgo.contexto_exposicion
        ) ||
        'FORMACION_PRACTICA',

      actividad:
        texto(
          riesgo.actividad
        ),

      actores_expuestos:
        texto(
          riesgo.actores_expuestos
        ),

      factor_riesgo:
        texto(
          riesgo.factor_riesgo
        ),

      situacion_riesgo:
        texto(
          riesgo.situacion_riesgo ||
          riesgo.descripcion_riesgo
        ),

      evento_peligroso:
        texto(
          riesgo.evento_peligroso
        ),

      causa:
        texto(
          riesgo.causa
        ),

      consecuencia:
        texto(
          riesgo.consecuencia
        ),

      fuente_identificacion:
        texto(
          riesgo.fuente_identificacion
        ),

      control_existente:
        texto(
          riesgo.control_existente
        ),

      exposicion:
        riesgo.exposicion
          ? String(
              riesgo.exposicion
            )
          : '',

      justificacion_exposicion:
        texto(
          riesgo.justificacion_exposicion
        ),

      antecedentes_considerados:
        texto(
          riesgo.antecedentes_considerados
        ),

      eficacia_controles:
        texto(
          riesgo.eficacia_controles
        ),

      probabilidad:
        riesgo.probabilidad
          ? String(
              riesgo.probabilidad
            )
          : '',

      justificacion_probabilidad:
        texto(
          riesgo.justificacion_probabilidad
        ),

      severidad:
        riesgo.severidad
          ? String(
              riesgo.severidad
            )
          : '',

      justificacion_severidad:
        texto(
          riesgo.justificacion_severidad
        ),

      tratamiento:
        texto(
          riesgo.tratamiento
        ),

      accion_propuesta:
        texto(
          riesgo.accion_propuesta
        ),

      responsable_personal_id:
        riesgo.responsable_personal_id
          ? String(
              riesgo.responsable_personal_id
            )
          : '',

      responsable_nombre:
        texto(
          riesgo.responsable_nombre
        ),

      fecha_compromiso:
        texto(
          riesgo.fecha_compromiso
        ),

      estado:
        texto(
          riesgo.estado
        ) ||
        'ACTIVO',

      activo:
        riesgo.activo !==
        false,

      observaciones:
        texto(
          riesgo.observaciones
        ),

      programa_ids:
        Array.isArray(
          riesgo.programas
        )
          ? riesgo.programas.map(
              programa =>
                Number(
                  programa.id
                )
            )
          : [],
    })

    window.setTimeout(
      () => {
        document
          .getElementById(
            'formulario-riesgo'
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
  // GUARDAR
  // ==========================================================

  async function guardarRiesgo(
    event
  ) {
    event.preventDefault()

    const obligatorios = [
      [
        formulario.codigo,
        'Ingrese el código del riesgo.',
      ],
      [
        formulario.fecha_identificacion,
        'Ingrese la fecha de identificación.',
      ],
      [
        formulario.proceso,
        'Ingrese el proceso.',
      ],
      [
        formulario.actividad,
        'Ingrese la actividad.',
      ],
      [
        formulario.factor_riesgo,
        'Ingrese el factor de riesgo.',
      ],
      [
        formulario.situacion_riesgo,
        'Describa la situación de riesgo.',
      ],
      [
        formulario.evento_peligroso,
        'Describa el evento peligroso o materialización.',
      ],
      [
        formulario.causa,
        'Registre las causas.',
      ],
      [
        formulario.consecuencia,
        'Registre las consecuencias.',
      ],
      [
        formulario.exposicion,
        'Seleccione la exposición.',
      ],
      [
        formulario.justificacion_exposicion,
        'Justifique la exposición.',
      ],
      [
        formulario.probabilidad,
        'Seleccione la probabilidad.',
      ],
      [
        formulario.justificacion_probabilidad,
        'Justifique la probabilidad.',
      ],
      [
        formulario.severidad,
        'Seleccione la severidad.',
      ],
      [
        formulario.justificacion_severidad,
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
      setError(
        faltante[1]
      )

      return
    }

    try {
      setGuardando(
        true
      )

      setError(
        ''
      )

      const data =
        await enviarPeticion(
          editandoId
            ? 'PATCH'
            : 'POST',
          {
            accion:
              editandoId
                ? 'actualizar_riesgo'
                : 'crear_riesgo',

            id:
              editandoId,

            anio,

            ...formulario,
          }
        )

      const riesgoId =
        data
          ?.riesgo
          ?.id ||
        editandoId

      if (
        riesgoId
      ) {
        await enviarPeticion(
          'POST',
          {
            accion:
              'guardar_programas_riesgo',

            riesgo_id:
              riesgoId,

            programa_ids:
              formulario.programa_ids,
          }
        )
      }

      setMensaje(
        data?.message ||
        'Riesgo guardado correctamente.'
      )

      limpiarFormulario()

      await cargarDatos()

      window.setTimeout(
        () => {
          setMensaje(
            ''
          )
        },
        4000
      )
    } catch (
      guardarError
    ) {
      console.error(
        'Error guardando riesgo:',
        guardarError
      )

      setError(
        guardarError?.message ||
        'No fue posible guardar el riesgo.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  // ==========================================================
  // ELIMINAR
  // ==========================================================

  async function eliminarRiesgo(
    riesgo
  ) {
    const confirmar =
      window.confirm(
        `¿Desea eliminar el riesgo ${riesgo.codigo}?`
      )

    if (!confirmar) {
      return
    }

    try {
      setGuardando(
        true
      )

      setError(
        ''
      )

      const data =
        await enviarPeticion(
          'DELETE',
          {
            accion:
              'eliminar_riesgo',

            id:
              riesgo.id,
          }
        )

      setMensaje(
        data?.message ||
        'Riesgo eliminado correctamente.'
      )

      if (
        Number(
          editandoId
        ) ===
        Number(
          riesgo.id
        )
      ) {
        limpiarFormulario()
      }

      await cargarDatos()
    } catch (
      eliminarError
    ) {
      setError(
        eliminarError?.message ||
        'No fue posible eliminar el riesgo.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }

  // ==========================================================
    // MEDIDAS DE INTERVENCIÓN
    // ==========================================================

    async function guardarMedida(
    formularioMedida
    ) {
    try {
        setGuardando(
        true
        )

        setError(
        ''
        )

        const editando =
        Number(
            formularioMedida?.id ||
            0
        ) > 0

        const data =
        await enviarPeticion(
            editando
            ? 'PATCH'
            : 'POST',
            {
            accion:
                editando
                ? 'actualizar_medida'
                : 'crear_medida',

            ...formularioMedida,
            }
        )

        setMensaje(
        data?.message ||
        (
            editando
            ? 'Medida actualizada correctamente.'
            : 'Medida registrada correctamente.'
        )
        )

        await cargarDatos()

        window.setTimeout(
        () => {
            setMensaje(
            ''
            )
        },
        4000
        )

        return true
    } catch (
        medidaError
    ) {
        console.error(
        'Error guardando medida:',
        medidaError
        )

        setError(
        medidaError?.message ||
        'No fue posible guardar el control o medida.'
        )

        return false
    } finally {
        setGuardando(
        false
        )
    }
    }


    async function eliminarMedida(
    medida
    ) {
    const confirmar =
        window.confirm(
        `¿Desea eliminar este ${
            texto(
            medida?.origen
            ) ===
            'EXISTENTE'
            ? 'control existente'
            : 'medida de intervención'
        }?`
        )

    if (
        !confirmar
    ) {
        return
    }

    try {
        setGuardando(
        true
        )

        setError(
        ''
        )

        const data =
        await enviarPeticion(
            'DELETE',
            {
            accion:
                'eliminar_medida',

            id:
                medida.id,
            }
        )

        setMensaje(
        data?.message ||
        'Control o medida eliminado correctamente.'
        )

        await cargarDatos()

        window.setTimeout(
        () => {
            setMensaje(
            ''
            )
        },
        4000
        )
    } catch (
        eliminarMedidaError
    ) {
        console.error(
        'Error eliminando medida:',
        eliminarMedidaError
        )

        setError(
        eliminarMedidaError
            ?.message ||
        'No fue posible eliminar el control o medida.'
        )
    } finally {
        setGuardando(
        false
        )
    }
    }

      // ============================================================
  // POST / PATCH SEGUIMIENTO DE RIESGO
  // app/admin/pesv/riesgos/page.jsx
  // API: /api/admin/pesv/riesgos
  // ============================================================

  async function guardarSeguimiento(
    formularioSeguimiento
  ) {
    try {
      setGuardando(
        true
      )

      setError(
        ''
      )

      const editando =
        Number(
          formularioSeguimiento?.id
        ) > 0

      const data =
        await enviarPeticion(
          editando
            ? 'PATCH'
            : 'POST',
          {
            accion:
              editando
                ? 'actualizar_seguimiento'
                : 'crear_seguimiento',

            ...formularioSeguimiento,
          }
        )

      setMensaje(
        data?.message ||
        (
          editando
            ? 'Seguimiento actualizado correctamente.'
            : 'Seguimiento registrado correctamente.'
        )
      )

      await cargarDatos()

      window.setTimeout(
        () => {
          setMensaje(
            ''
          )
        },
        4000
      )

      return true
    } catch (
      seguimientoError
    ) {
      console.error(
        'Error guardando seguimiento:',
        seguimientoError
      )

      setError(
        seguimientoError?.message ||
        'No fue posible guardar el seguimiento.'
      )

      return false
    } finally {
      setGuardando(
        false
      )
    }
  }


  // ============================================================
  // DELETE SEGUIMIENTO DE RIESGO
  // app/admin/pesv/riesgos/page.jsx
  // API: /api/admin/pesv/riesgos
  // ============================================================

  async function eliminarSeguimiento(
    seguimiento
  ) {
    try {
      setGuardando(
        true
      )

      setError(
        ''
      )

      const data =
        await enviarPeticion(
          'DELETE',
          {
            accion:
              'eliminar_seguimiento',

            id:
              seguimiento.id,
          }
        )

      setMensaje(
        data?.message ||
        'Seguimiento eliminado correctamente.'
      )

      await cargarDatos()

      window.setTimeout(
        () => {
          setMensaje(
            ''
          )
        },
        4000
      )

      return true
    } catch (
      seguimientoError
    ) {
      console.error(
        'Error eliminando seguimiento:',
        seguimientoError
      )

      setError(
        seguimientoError?.message ||
        'No fue posible eliminar el seguimiento.'
      )

      return false
    } finally {
      setGuardando(
        false
      )
    }
  }

  // ============================================================
// GENERAR PDF MATRIZ DE RIESGOS
// app/admin/pesv/riesgos/page.jsx
// ============================================================

function generarPdfMatrizRiesgos() {
  router.push(
    '/admin/pesv/riesgos/imprimir?anio=' +
      String(anio)
  )
}

  // ==========================================================
  // FILTROS
  // ==========================================================

  const riesgosFiltrados =
    useMemo(
      () => {
        const busqueda =
          texto(
            filtroTexto
          )
            .toLowerCase()

        return riesgos.filter(
          riesgo => {
            if (
              filtroNivel &&
              texto(
                riesgo.nivel_riesgo
              )
                .toUpperCase() !==
              filtroNivel
            ) {
              return false
            }

            if (
              busqueda
            ) {
              const contenido =
                [
                  riesgo.codigo,
                  riesgo.proceso,
                  riesgo.actividad,
                  riesgo.factor_riesgo,
                  riesgo.situacion_riesgo,
                  riesgo.evento_peligroso,
                  riesgo.responsable_nombre,
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

              if (
                !contenido.includes(
                  busqueda
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
        riesgos,
        filtroTexto,
        filtroNivel,
      ]
    )

    const riesgoDetalle =
        useMemo(
            () => {
            if (
                !riesgoDetalleId
            ) {
                return null
            }

            return (
                riesgos.find(
                riesgo =>
                    Number(
                    riesgo.id
                    ) ===
                    Number(
                    riesgoDetalleId
                    )
                ) ||
                null
            )
            },
            [
            riesgos,
            riesgoDetalleId,
            ]
        )

  const vistaPrevia =
    useMemo(
      () =>
        calcularVistaPrevia(
          formulario.exposicion,
          formulario.probabilidad,
          formulario.severidad
        ),
      [
        formulario.exposicion,
        formulario.probabilidad,
        formulario.severidad,
      ]
    )


  // ==========================================================
  // SESIÓN
  // ==========================================================

  if (!user) {
    return (
      <p
        className="
          text-center
          mt-20
        "
      >
        Cargando...
      </p>
    )
  }


  // ==========================================================
// RENDER
// app/admin/pesv/riesgos/page.jsx
// ==========================================================

return (
  <div
    className="
      min-h-screen
      bg-gradient-to-br
      from-gray-100
      to-gray-200
      p-3
      md:p-5
    "
  >
    <div
      className="
        max-w-[1700px]
        mx-auto
        bg-white
        border
        border-gray-200
        shadow-lg
        rounded-xl
        overflow-hidden
      "
    >
      {/* ====================================================
          ENCABEZADO PRINCIPAL
          app/admin/pesv/riesgos/page.jsx
      ==================================================== */}

      <div
        className="
          bg-slate-800
          text-white
          px-5
          py-3
          flex
          flex-col
          md:flex-row
          md:items-center
          md:justify-between
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
          <i
            className="
              fas
              fa-triangle-exclamation
              text-2xl
              mt-1
            "
          ></i>

          <div>
            <h1
              className="
                text-lg
                md:text-xl
                font-black
                uppercase
                tracking-wide
              "
            >
              PESV · Matriz de Riesgos
            </h1>

            <p
              className="
                text-[10px]
                md:text-[11px]
                text-slate-300
                mt-0.5
              "
            >
              Identificación, valoración, intervención y seguimiento del riesgo vial
            </p>

            <div
              className="
                mt-1
                text-[10px]
                text-slate-300
              "
            >
              Usuario:{' '}

              <strong
                className="
                  text-white
                "
              >
                {obtenerNombreUsuario(
                  user
                )}
              </strong>

              <span
                className="
                  mx-1.5
                  text-slate-500
                "
              >
                ·
              </span>

              CEA:{' '}

              <strong
                className="
                  text-white
                "
              >
                {obtenerNombreEmpresa(
                  user
                )}
              </strong>
            </div>
          </div>
        </div>


        {/* ==================================================
            BOTONES ENCABEZADO
            app/admin/pesv/riesgos/page.jsx
        ================================================== */}

        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >
          <button
            type="button"
            onClick={() =>
              router.push(
                '/admin/pesv'
              )
            }
            className="
              bg-white/10
              hover:bg-white/20
              border
              border-white/20
              px-3
              py-1.5
              rounded
              text-[10px]
            "
          >
            <i
              className="
                fas
                fa-arrow-left
                mr-1.5
              "
            ></i>

            PESV
          </button>


          <button
            type="button"
            onClick={() =>
              router.push(
                '/admin'
              )
            }
            className="
              bg-white/10
              hover:bg-white/20
              border
              border-white/20
              px-3
              py-1.5
              rounded
              text-[10px]
            "
          >
            <i
              className="
                fas
                fa-home
                mr-1.5
              "
            ></i>

            Menú
          </button>


          <button
            type="button"
            onClick={() =>
              cerrarSesion(
                router
              )
            }
            className="
              bg-[var(--danger)]
              hover:bg-[var(--danger-dark)]
              px-3
              py-1.5
              rounded
              text-[10px]
            "
          >
            <i
              className="
                fas
                fa-sign-out-alt
                mr-1.5
              "
            ></i>

            Cerrar sesión
          </button>
        </div>
      </div>


      {/* ====================================================
          VIGENCIA + GENERAR PDF
          app/admin/pesv/riesgos/page.jsx
          Función PDF: generarPdfMatrizRiesgos()
      ==================================================== */}

      <div
        className="
          bg-gray-50
          border-b
          border-gray-200
          px-4
          py-2
          flex
          flex-col
          sm:flex-row
          sm:justify-between
          sm:items-center
          gap-3
        "
      >
        <div
          className="
            text-[11px]
            text-gray-600
          "
        >
          Vigencia de la Matriz de Riesgos PESV
        </div>


        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >
          {/* ================================================
              SELECTOR DE AÑO
              app/admin/pesv/riesgos/page.jsx
          ================================================ */}

          <label
            className="
              text-[10px]
              font-bold
              uppercase
              text-gray-600
            "
          >
            Año
          </label>


          <select
            value={
              anio
            }
            onChange={
              event =>
                setAnio(
                  Number(
                    event.target.value
                  )
                )
            }
            className="
              border
              border-gray-300
              rounded
              px-2
              py-1
              text-xs
              bg-white
            "
          >
            {Array.from(
              {
                length:
                  8,
              },
              (
                _,
                index
              ) =>
                ANIO_ACTUAL -
                3 +
                index
            ).map(
              item => (
                <option
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </option>
              )
            )}
          </select>


          {/* ================================================
              BOTÓN GENERAR PDF
              app/admin/pesv/riesgos/page.jsx
              Destino:
              /admin/pesv/riesgos/imprimir?anio=VIGENCIA
          ================================================ */}

          <button
            type="button"
            onClick={
              generarPdfMatrizRiesgos
            }
            disabled={
              cargando
            }
            className="
              bg-red-600
              hover:bg-red-700
              disabled:bg-gray-400
              disabled:cursor-not-allowed
              text-white
              px-3
              py-1.5
              rounded
              text-[10px]
              font-bold
              whitespace-nowrap
              flex
              items-center
              justify-center
              gap-1.5
            "
          >
            <i
              className="
                fas
                fa-file-pdf
              "
            ></i>

            Generar PDF
          </button>
        </div>
      </div>


      {/* ====================================================
          PESTAÑAS RIESGOS PESV
          app/admin/pesv/riesgos/page.jsx
      ==================================================== */}

      <RiesgosTabs
        pestana={
          pestana
        }
        cambiar={
          setPestana
        }
      />


      {/* ====================================================
          MENSAJES DEL MÓDULO
          app/admin/pesv/riesgos/page.jsx
      ==================================================== */}

      {(error ||
        mensaje) && (
        <div
          className="
            px-4
            pt-3
          "
        >
          {error && (
            <div
              className="
                bg-red-50
                border
                border-red-200
                text-red-700
                rounded-lg
                px-3
                py-2
                text-[11px]
              "
            >
              <i
                className="
                  fas
                  fa-exclamation-circle
                  mr-2
                "
              ></i>

              {error}
            </div>
          )}


          {mensaje && (
            <div
              className="
                bg-green-50
                border
                border-green-200
                text-green-700
                rounded-lg
                px-3
                py-2
                text-[11px]
              "
            >
              <i
                className="
                  fas
                  fa-check-circle
                  mr-2
                "
              ></i>

              {mensaje}
            </div>
          )}
        </div>
      )}


      {/* ====================================================
          CONTENIDO DE LAS VISTAS
          app/admin/pesv/riesgos/page.jsx
      ==================================================== */}

      <div
        className="
          p-4
        "
      >
        {cargando ? (
          <div
            className="
              py-16
              text-center
              text-sm
              text-gray-500
            "
          >
            <i
              className="
                fas
                fa-spinner
                fa-spin
                mr-2
              "
            ></i>

            Consultando Matriz de Riesgos PESV...
          </div>
        ) : (
          <>
              {/* ============================================================
                    VISTA MATRIZ DE RIESGOS
                    app/admin/pesv/riesgos/page.jsx
                ============================================================ */}

                {pestana ===
                'MATRIZ' && (
                <div
                    className="
                    space-y-4
                    "
                >
                  <ResumenRiesgos
                    resumen={
                      resumen
                    }
                  />

                  <VistaMatrizRiesgos
                    anio={
                        anio
                    }
                    riesgos={
                        riesgosFiltrados
                    }
                    personal={
                        personal
                    }
                    programas={
                        programas
                    }
                    metodologia={
                        metodologia
                    }
                    formulario={
                        formulario
                    }
                    editandoId={
                        editandoId
                    }
                    guardando={
                        guardando
                    }
                    mostrarFormulario={
                        mostrarFormulario
                    }
                    mostrarNuevoFormulario={() => {
                        setEditandoId(
                        null
                        )

                        setFormulario({
                        ...FORMULARIO_INICIAL,

                        fecha_identificacion:
                            new Date()
                            .toISOString()
                            .slice(
                                0,
                                10
                            ),
                        })

                        setError(
                        ''
                        )

                        setMostrarFormulario(
                        true
                        )

                        window.setTimeout(
                        () => {
                            document
                            .getElementById(
                                'formulario-riesgo'
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
                    }}
                    vistaPrevia={
                        vistaPrevia
                    }
                    filtroTexto={
                        filtroTexto
                    }
                    filtroNivel={
                        filtroNivel
                    }
                    cambiarFiltroTexto={
                        setFiltroTexto
                    }
                    cambiarFiltroNivel={
                        setFiltroNivel
                    }
                    cambiarCampo={
                        cambiarCampo
                    }
                    cambiarResponsable={
                        cambiarResponsable
                    }
                    cambiarPrograma={
                        cambiarPrograma
                    }
                    guardarRiesgo={
                        guardarRiesgo
                    }
                    limpiarFormulario={
                        limpiarFormulario
                    }
                    verRiesgo={
                        verRiesgo
                        }
                        editarRiesgo={
                        editarRiesgo
                        }
                        eliminarRiesgo={
                        eliminarRiesgo
                        }
                                        />
                </div>
              )}

              {pestana ===
                'SEGUIMIENTOS' && (
                <VistaSeguimientos
                    anio={
                    anio
                    }
                    riesgos={
                    riesgos
                    }
                    personal={
                    personal
                    }
                    guardando={
                    guardando
                    }
                    guardarSeguimiento={
                    guardarSeguimiento
                    }
                    eliminarSeguimiento={
                    eliminarSeguimiento
                    }
                />
                )}

                {/* ============================================================
                    VISTA MAPA DE CALOR
                    app/admin/pesv/riesgos/page.jsx
                    Componente: VistaMapaCalor
                ============================================================ */}

                {pestana ===
                'MAPA' && (
                <VistaMapaCalor
                    anio={
                    anio
                    }
                    riesgos={
                    riesgos
                    }
                />
                )}

                {/* ============================================================
                    VISTA CATÁLOGO DE RIESGOS
                    app/admin/pesv/riesgos/page.jsx
                    Componente: VistaCatalogoRiesgos
                ============================================================ */}

                {pestana ===
                'CATALOGO' && (
                <VistaCatalogoRiesgos
                    anio={
                    anio
                    }
                    riesgos={
                    riesgos
                    }
                />
                )}

                {/* ============================================================
                        VISTA METODOLOGÍA DE RIESGOS
                        app/admin/pesv/riesgos/page.jsx
                        Componente: VistaMetodologia
                    ============================================================ */}

                    {pestana ===
                    'METODOLOGIA' && (
                    <VistaMetodologia
                        anio={
                        anio
                        }
                    />
                    )}

                    {/* ============================================================
                        VISTA PROGRAMAS PESV
                        app/admin/pesv/riesgos/page.jsx
                        Componente: VistaProgramasPesv
                    ============================================================ */}

                    {pestana ===
                    'PROGRAMAS' && (
                    <VistaProgramasPesv
                        anio={
                        anio
                        }
                        riesgos={
                        riesgos
                        }
                        programas={
                        programas
                        }
                    />
                    )}

                    
            </>
          )}
             </div>
      </div>


      <ModalDetalleRiesgo
        riesgo={
            riesgoDetalle
        }
        cerrar={
            cerrarDetalle
        }
        editar={
            editarRiesgo
        }
        personal={
            personal
        }
        metodologia={
            metodologia
        }
        guardando={
            guardando
        }
        guardarMedida={
            guardarMedida
        }
        eliminarMedida={
            eliminarMedida
        }
        />
    </div>
  )
}