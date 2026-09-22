// app/admin/pesv/objetivos-metas/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  cerrarSesion,
} from '@/lib/auth/logout'


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
  const nombre =
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
      )

  if (
    nombre
  ) {
    return nombre
  }

  return texto(
    persona?.nombre_completo ||
    persona?.nombre ||
    persona?.documento ||
    ''
  ) || '-'
}


function claseEstado(
  estado
) {
  const valor =
    texto(
      estado
    )
      .toUpperCase()

  if (
    valor === 'ACTIVO' ||
    valor === 'ACTIVA' ||
    valor === 'CUMPLIDA' ||
    valor === 'CUMPLIDO'
  ) {
    return 'bg-green-100 text-green-700 border-green-200'
  }

  if (
    valor === 'INACTIVO' ||
    valor === 'INACTIVA' ||
    valor === 'CANCELADA' ||
    valor === 'CANCELADO'
  ) {
    return 'bg-gray-100 text-gray-600 border-gray-200'
  }

  return 'bg-amber-100 text-amber-700 border-amber-200'
}


// ============================================================
// FORMULARIOS INICIALES
// ============================================================

function formularioObjetivoInicial(
  anio
) {
  return {
    anio:
      String(
        anio
      ),

    codigo:
      '',

    nombre:
      '',

    descripcion:
      '',

    responsable_personal_id:
      '',

    estado:
      'ACTIVO',

    observaciones:
      '',
  }
}


function formularioMetaInicial() {
  return {
    objetivo_id:
      '',

    indicador_id:
      '',

    codigo:
      '',

    descripcion:
      '',

    linea_base:
      '',

    valor_meta:
      '',

    operador_meta:
      '>=',

    unidad_medida:
      '',

    fecha_limite:
      '',

    responsable_personal_id:
      '',

    estado:
      'ACTIVA',

    observaciones:
      '',
  }
}


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ObjetivosMetasPesvPage() {
  const router =
    useRouter()

  const anioActual =
    new Date()
      .getFullYear()

  // ==========================================================
  // REFERENCIAS PARA DESPLAZAMIENTO AUTOMÁTICO
  // ==========================================================

  const formularioObjetivoRef =
    useRef(
      null
    )

  const formularioMetaRef =
    useRef(
      null
    )

  const listadoObjetivosRef =
    useRef(
      null
    )

  const listadoMetasRef =
    useRef(
      null
    )


  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [
    user,
    setUser,
  ] =
    useState(
      null
    )

  const [
    anio,
    setAnio,
  ] =
    useState(
      anioActual
    )

  const [
    cargando,
    setCargando,
  ] =
    useState(
      true
    )

  const [
    guardando,
    setGuardando,
  ] =
    useState(
      false
    )

  const [
    error,
    setError,
  ] =
    useState(
      ''
    )

  const [
    mensaje,
    setMensaje,
  ] =
    useState(
      ''
    )

  const [
    objetivos,
    setObjetivos,
  ] =
    useState(
      []
    )

  const [
    metas,
    setMetas,
  ] =
    useState(
      []
    )

  const [
    indicadores,
    setIndicadores,
  ] =
    useState(
      []
    )

  const [
    personal,
    setPersonal,
  ] =
    useState(
      []
    )

  const [
    editandoObjetivoId,
    setEditandoObjetivoId,
  ] =
    useState(
      null
    )

  const [
    editandoMetaId,
    setEditandoMetaId,
  ] =
    useState(
      null
    )

  const [
    modalObjetivoAbierto,
    setModalObjetivoAbierto,
  ] =
    useState(
      false
    )

  const [
    modalMetaAbierto,
    setModalMetaAbierto,
  ] =
    useState(
      false
    )

  const [
    resaltadoObjetivoId,
    setResaltadoObjetivoId,
  ] =
    useState(
      null
    )

  const [
    resaltadoMetaId,
    setResaltadoMetaId,
  ] =
    useState(
      null
    )

  const [
    formularioObjetivo,
    setFormularioObjetivo,
  ] =
    useState(
      formularioObjetivoInicial(
        anioActual
      )
    )

  const [
    formularioMeta,
    setFormularioMeta,
  ] =
    useState(
      formularioMetaInicial()
    )


  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(
    () => {
      const storedUser =
        localStorage.getItem(
          'currentUser'
        )

      if (
        !storedUser
      ) {
        router.push(
          '/login'
        )

        return
      }

      try {
        const parsedUser =
          JSON.parse(
            storedUser
          )

        setUser(
          parsedUser
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
  // CONSULTAR DATOS
  // ==========================================================

  async function cargarDatos(
    anioConsulta = anio
  ) {
    if (
      !user
    ) {
      return
    }

    const nit =
      obtenerNitUsuario(
        user
      )

    if (
      !nit
    ) {
      setError(
        'No fue posible identificar el NIT del CEA en la sesión actual.'
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
              anioConsulta
            ),
        })

      const response =
        await fetch(
          `/api/admin/pesv/objetivos-metas?${params.toString()}`,
          {
            method:
              'GET',

            cache:
              'no-store',
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
          'No fue posible consultar los objetivos y metas.'
        )
      }

      setObjetivos(
        Array.isArray(
          data?.objetivos
        )
          ? data.objetivos
          : []
      )

      setMetas(
        Array.isArray(
          data?.metas
        )
          ? data.metas
          : []
      )

      setIndicadores(
        Array.isArray(
          data?.indicadores
        )
          ? data.indicadores
          : []
      )

      setPersonal(
        Array.isArray(
          data?.personal
        )
          ? data.personal
          : []
      )
    } catch (
      consultaError
    ) {
      console.error(
        'Error cargando objetivos y metas PESV:',
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
        cargarDatos(
          anio
        )
      }
    },
    [
      user,
      anio,
    ]
  )


  // ==========================================================
  // DATOS DERIVADOS
  // ==========================================================

  const objetivosOrdenados =
    useMemo(
      () => {
        return [
          ...objetivos,
        ].sort(
          (
            a,
            b
          ) =>
            texto(
              a?.codigo
            ).localeCompare(
              texto(
                b?.codigo
              ),
              'es',
              {
                numeric:
                  true,
              }
            )
        )
      },
      [
        objetivos,
      ]
    )


  const metasOrdenadas =
    useMemo(
      () => {
        return [
          ...metas,
        ].sort(
          (
            a,
            b
          ) =>
            texto(
              a?.codigo
            ).localeCompare(
              texto(
                b?.codigo
              ),
              'es',
              {
                numeric:
                  true,
              }
            )
        )
      },
      [
        metas,
      ]
    )


  const personalOrdenado =
    useMemo(
      () => {
        return [
          ...personal,
        ].sort(
          (
            a,
            b
          ) =>
            nombrePersonal(
              a
            ).localeCompare(
              nombrePersonal(
                b
              ),
              'es'
            )
        )
      },
      [
        personal,
      ]
    )


  const objetivosActivos =
    useMemo(
      () => {
        return objetivosOrdenados.filter(
          item =>
            texto(
              item?.estado
            )
              .toUpperCase() !==
            'INACTIVO'
        )
      },
      [
        objetivosOrdenados,
      ]
    )


  // ==========================================================
  // DESPLAZAMIENTO AUTOMÁTICO
  // ==========================================================

  function irAElemento(
    elemento,
    bloque = 'start'
  ) {
    window.setTimeout(
      () => {
        elemento
          ?.current
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              bloque,
          })
      },
      100
    )
  }


  function irARegistro(
    tipo,
    id
  ) {
    window.setTimeout(
      () => {
        const elemento =
          document.getElementById(
            `${tipo}-${id}`
          )

        elemento
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'center',
          })
      },
      250
    )
  }


  function resaltarObjetivo(
    id
  ) {
    setResaltadoObjetivoId(
      id
    )

    window.setTimeout(
      () => {
        setResaltadoObjetivoId(
          null
        )
      },
      4000
    )
  }


  function resaltarMeta(
    id
  ) {
    setResaltadoMetaId(
      id
    )

    window.setTimeout(
      () => {
        setResaltadoMetaId(
          null
        )
      },
      4000
    )
  }


  // ==========================================================
  // MENSAJES
  // ==========================================================

  function mostrarMensaje(
    valor
  ) {
    setMensaje(
      valor
    )

    setError(
      ''
    )

    window.setTimeout(
      () => {
        setMensaje(
          ''
        )
      },
      4000
    )
  }


  // ==========================================================
  // PETICIÓN GENÉRICA
  // ==========================================================

  async function enviarPeticion(
    method,
    body
  ) {
    const nit =
      obtenerNitUsuario(
        user
      )

    const usuario =
      obtenerNombreUsuario(
        user
      )

    const response =
      await fetch(
        '/api/admin/pesv/objetivos-metas',
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
                usuario,
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
  // OBJETIVO
  // ==========================================================

  function cambiarObjetivo(
    campo,
    valor
  ) {
    setFormularioObjetivo(
      anterior => ({
        ...anterior,

        [campo]:
          valor,
      })
    )
  }


  function limpiarFormularioObjetivo() {
    setEditandoObjetivoId(
      null
    )

    setFormularioObjetivo(
      formularioObjetivoInicial(
        anio
      )
    )
  }


  function editarObjetivo(
    objetivo
  ) {
    setEditandoObjetivoId(
      objetivo.id
    )

    setFormularioObjetivo({
      anio:
        String(
          objetivo?.anio ||
          anio
        ),

      codigo:
        texto(
          objetivo?.codigo
        ),

      nombre:
        texto(
          objetivo?.nombre
        ),

      descripcion:
        texto(
          objetivo?.descripcion
        ),

      responsable_personal_id:
        objetivo
          ?.responsable_personal_id
          ? String(
              objetivo.responsable_personal_id
            )
          : '',

      estado:
        texto(
          objetivo?.estado
        ) ||
        'ACTIVO',

      observaciones:
        texto(
          objetivo?.observaciones
        ),
    })

    setError(
      ''
    )

    setMensaje(
      ''
    )

    setModalObjetivoAbierto(
      true
    )
  }


  async function guardarObjetivo(
    event
  ) {
    event.preventDefault()

    const codigo =
      texto(
        formularioObjetivo
          ?.codigo
      )

    const nombre =
      texto(
        formularioObjetivo
          ?.nombre
      )

    if (
      !codigo
    ) {
      setError(
        'Ingrese el código del objetivo.'
      )

      return
    }

    if (
      !nombre
    ) {
      setError(
        'Ingrese el nombre del objetivo.'
      )

      return
    }

    const responsable =
      personal.find(
        item =>
          String(
            item?.id
          ) ===
          String(
            formularioObjetivo
              ?.responsable_personal_id
          )
      )

    try {
      setGuardando(
        true
      )

      setError(
        ''
      )

      const body = {
        accion:
          editandoObjetivoId
            ? 'actualizar_objetivo'
            : 'crear_objetivo',

        id:
          editandoObjetivoId,

        anio:
          formularioObjetivo.anio,

        codigo,

        nombre,

        descripcion:
          formularioObjetivo.descripcion,

        responsable_personal_id:
          formularioObjetivo
            .responsable_personal_id ||
          null,

        responsable_nombre:
          responsable
            ? nombrePersonal(
                responsable
              )
            : null,

        estado:
          formularioObjetivo.estado,

        observaciones:
          formularioObjetivo.observaciones,
      }

      const data =
        await enviarPeticion(
          editandoObjetivoId
            ? 'PATCH'
            : 'POST',
          body
        )

      const idGuardado =
        data
          ?.objetivo
          ?.id

      mostrarMensaje(
        data?.message ||
        'Objetivo guardado correctamente.'
      )

      limpiarFormularioObjetivo()

      setModalObjetivoAbierto(
        false
      )

      await cargarDatos(
        anio
      )

      if (
        idGuardado
      ) {
        resaltarObjetivo(
          idGuardado
        )

        irARegistro(
          'objetivo',
          idGuardado
        )
      } else {
        irAElemento(
          listadoObjetivosRef
        )
      }
    } catch (
      guardarError
    ) {
      console.error(
        'Error guardando objetivo:',
        guardarError
      )

      setError(
        guardarError?.message ||
        'No fue posible guardar el objetivo.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  async function eliminarObjetivo(
    objetivo
  ) {
    const confirmar =
      window.confirm(
        `¿Desea eliminar el objetivo ${texto(
          objetivo?.codigo
        )} - ${texto(
          objetivo?.nombre
        )}?`
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
              'eliminar_objetivo',

            id:
              objetivo.id,
          }
        )

      mostrarMensaje(
        data?.message ||
        'Objetivo eliminado correctamente.'
      )

      if (
        editandoObjetivoId ===
        objetivo.id
      ) {
        limpiarFormularioObjetivo()
      }

      await cargarDatos(
        anio
      )

      irAElemento(
        listadoObjetivosRef
      )
    } catch (
      eliminarError
    ) {
      setError(
        eliminarError?.message ||
        'No fue posible eliminar el objetivo.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  // ==========================================================
  // META
  // ==========================================================

  function cambiarMeta(
    campo,
    valor
  ) {
    setFormularioMeta(
      anterior => ({
        ...anterior,

        [campo]:
          valor,
      })
    )
  }


  function cambiarIndicadorMeta(
    valor
  ) {
    const indicador =
      indicadores.find(
        item =>
          String(
            item?.id
          ) ===
          String(
            valor
          )
      )

    setFormularioMeta(
      anterior => ({
        ...anterior,

        indicador_id:
          valor,

        unidad_medida:
          indicador
            ? texto(
                indicador?.unidad
              )
            : anterior
                .unidad_medida,
      })
    )
  }


  function limpiarFormularioMeta() {
    setEditandoMetaId(
      null
    )

    setFormularioMeta(
      formularioMetaInicial()
    )
  }


  function editarMeta(
    meta
  ) {
    setEditandoMetaId(
      meta.id
    )

    setFormularioMeta({
      objetivo_id:
        meta?.objetivo_id
          ? String(
              meta.objetivo_id
            )
          : '',

      indicador_id:
        meta?.indicador_id
          ? String(
              meta.indicador_id
            )
          : '',

      codigo:
        texto(
          meta?.codigo
        ),

      descripcion:
        texto(
          meta?.descripcion
        ),

      linea_base:
        meta?.linea_base ??
        '',

      valor_meta:
        meta?.valor_meta ??
        '',

      operador_meta:
        texto(
          meta?.operador_meta
        ) ||
        '>=',

      unidad_medida:
        texto(
          meta?.unidad_medida
        ),

      fecha_limite:
        texto(
          meta?.fecha_limite
        ),

      responsable_personal_id:
        meta
          ?.responsable_personal_id
          ? String(
              meta.responsable_personal_id
            )
          : '',

      estado:
        texto(
          meta?.estado
        ) ||
        'ACTIVA',

      observaciones:
        texto(
          meta?.observaciones
        ),
    })

    setError(
      ''
    )

    setMensaje(
      ''
    )

    setModalMetaAbierto(
      true
    )
  }


  async function guardarMeta(
    event
  ) {
    event.preventDefault()

    if (
      !formularioMeta
        .objetivo_id
    ) {
      setError(
        'Seleccione el objetivo al que pertenece la meta.'
      )

      return
    }

    if (
      !texto(
        formularioMeta
          .codigo
      )
    ) {
      setError(
        'Ingrese el código de la meta.'
      )

      return
    }

    if (
      !texto(
        formularioMeta
          .descripcion
      )
    ) {
      setError(
        'Ingrese la descripción de la meta.'
      )

      return
    }

    const responsable =
      personal.find(
        item =>
          String(
            item?.id
          ) ===
          String(
            formularioMeta
              ?.responsable_personal_id
          )
      )

    try {
      setGuardando(
        true
      )

      setError(
        ''
      )

      const body = {
        accion:
          editandoMetaId
            ? 'actualizar_meta'
            : 'crear_meta',

        id:
          editandoMetaId,

        objetivo_id:
          formularioMeta.objetivo_id,

        indicador_id:
          formularioMeta.indicador_id ||
          null,

        codigo:
          formularioMeta.codigo,

        descripcion:
          formularioMeta.descripcion,

        linea_base:
          formularioMeta.linea_base,

        valor_meta:
          formularioMeta.valor_meta,

        operador_meta:
          formularioMeta.operador_meta,

        unidad_medida:
          formularioMeta.unidad_medida,

        fecha_limite:
          formularioMeta.fecha_limite,

        responsable_personal_id:
          formularioMeta
            .responsable_personal_id ||
          null,

        responsable_nombre:
          responsable
            ? nombrePersonal(
                responsable
              )
            : null,

        estado:
          formularioMeta.estado,

        observaciones:
          formularioMeta.observaciones,
      }

      const data =
        await enviarPeticion(
          editandoMetaId
            ? 'PATCH'
            : 'POST',
          body
        )

      const idGuardado =
        data
          ?.meta
          ?.id

      mostrarMensaje(
        data?.message ||
        'Meta guardada correctamente.'
      )

      limpiarFormularioMeta()

      setModalMetaAbierto(
        false
      )

      await cargarDatos(
        anio
      )

      if (
        idGuardado
      ) {
        resaltarMeta(
          idGuardado
        )

        irARegistro(
          'meta',
          idGuardado
        )
      } else {
        irAElemento(
          listadoMetasRef
        )
      }
    } catch (
      guardarError
    ) {
      console.error(
        'Error guardando meta:',
        guardarError
      )

      setError(
        guardarError?.message ||
        'No fue posible guardar la meta.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  async function eliminarMeta(
    meta
  ) {
    const confirmar =
      window.confirm(
        `¿Desea eliminar la meta ${texto(
          meta?.codigo
        )}?`
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
              'eliminar_meta',

            id:
              meta.id,
          }
        )

      mostrarMensaje(
        data?.message ||
        'Meta eliminada correctamente.'
      )

      if (
        editandoMetaId ===
        meta.id
      ) {
        limpiarFormularioMeta()
      }

      await cargarDatos(
        anio
      )

      irAElemento(
        listadoMetasRef
      )
    } catch (
      eliminarError
    ) {
      setError(
        eliminarError?.message ||
        'No fue posible eliminar la meta.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  // ==========================================================
  // CREAR META DESDE OBJETIVO
  // ==========================================================

  function crearMetaDesdeObjetivo(
    objetivo
  ) {
    setEditandoMetaId(
      null
    )

    setFormularioMeta({
      ...formularioMetaInicial(),

      objetivo_id:
        String(
          objetivo.id
        ),
    })

    setError(
      ''
    )

    setMensaje(
      ''
    )

    setModalMetaAbierto(
      true
    )
  }


  // ==========================================================
  // CAMBIAR AÑO
  // ==========================================================

  function cambiarAnio(
    valor
  ) {
    const nuevoAnio =
      Number(
        valor
      )

    setAnio(
      nuevoAnio
    )

    setFormularioObjetivo(
      formularioObjetivoInicial(
        nuevoAnio
      )
    )

    setFormularioMeta(
      formularioMetaInicial()
    )

    setEditandoObjetivoId(
      null
    )

    setEditandoMetaId(
      null
    )

    setModalObjetivoAbierto(
      false
    )

    setModalMetaAbierto(
      false
    )

    setResaltadoObjetivoId(
      null
    )

    setResaltadoMetaId(
      null
    )

    setMensaje(
      ''
    )

    setError(
      ''
    )
  }


  // ==========================================================
  // CARGANDO SESIÓN
  // ==========================================================

  if (
    !user
  ) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }


  // ==========================================================
  // RENDER
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
          max-w-[1500px]
          mx-auto
          bg-white
          border
          border-gray-200
          shadow-lg
          rounded-xl
          overflow-hidden
        "
      >

        {/* ==================================================
            ENCABEZADO
        ================================================== */}

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
                fa-bullseye
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
                PESV · Objetivos y Metas
              </h1>

              <p
                className="
                  text-[10px]
                  md:text-[11px]
                  text-slate-300
                  mt-0.5
                "
              >
                Planeación y seguimiento de los objetivos y metas del Plan Estratégico de Seguridad Vial
              </p>

              <div
                className="
                  mt-1
                  text-[10px]
                  text-slate-300
                "
              >
                Usuario:{' '}

                <strong className="text-white">
                  {obtenerNombreUsuario(
                    user
                  )}
                </strong>

                <span className="mx-1.5 text-slate-500">
                  ·
                </span>

                CEA:{' '}

                <strong className="text-white">
                  {obtenerNombreEmpresa(
                    user
                  )}
                </strong>
              </div>

            </div>

          </div>

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
                text-white
                px-3
                py-1.5
                rounded
                text-[10px]
                md:text-[11px]
                transition
              "
            >
              <i className="fas fa-arrow-left mr-1.5"></i>

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
                text-white
                px-3
                py-1.5
                rounded
                text-[10px]
                md:text-[11px]
                transition
              "
            >
              <i className="fas fa-home mr-1.5"></i>

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
                text-white
                px-3
                py-1.5
                rounded
                text-[10px]
                md:text-[11px]
                transition
              "
            >
              <i className="fas fa-sign-out-alt mr-1.5"></i>

              Salir
            </button>

          </div>

        </div>


        {/* ==================================================
            BARRA DE PERÍODO
        ================================================== */}

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
            sm:items-center
            sm:justify-between
            gap-2
          "
        >

          <div
            className="
              text-[11px]
              text-gray-600
            "
          >
            Período de planeación PESV
          </div>

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >

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
                  cambiarAnio(
                    event.target.value
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
                min-w-[90px]
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
                  anioActual -
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
                DOCUMENTO OFICIAL
            ================================================ */}

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/admin/pesv/objetivos-metas/documento?anio=${anio}`
                )
              }
              disabled={
                cargando
              }
              className="
                ml-0
                sm:ml-2
                bg-emerald-600
                hover:bg-emerald-700
                disabled:opacity-50
                disabled:cursor-not-allowed
                text-white
                border
                border-emerald-700
                rounded
                px-3
                py-1.5
                text-[10px]
                font-bold
                transition
              "
            >
              <i className="fas fa-file-pdf mr-1.5"></i>

              Ver / Imprimir PDF
            </button>

          </div>
        </div>


        {/* ==================================================
            MENSAJES
        ================================================== */}

        {(error ||
          mensaje) && (
          <div className="px-4 pt-3">

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
                <i className="fas fa-exclamation-circle mr-2"></i>

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
                <i className="fas fa-check-circle mr-2"></i>

                {mensaje}
              </div>
            )}

          </div>
        )}


        {/* ==================================================
            CONTENIDO
        ================================================== */}

        <div className="p-4">

          {cargando ? (
            <div
              className="
                py-16
                text-center
                text-sm
                text-gray-500
              "
            >
              <i className="fas fa-spinner fa-spin mr-2"></i>

              Consultando información PESV...
            </div>
          ) : (
            <div className="space-y-5">

              {/* ============================================
                  RESUMEN
              ============================================ */}

              <div
                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-3
                  gap-3
                "
              >

                <div
                  className="
                    border
                    border-gray-200
                    rounded-lg
                    px-4
                    py-3
                    bg-slate-50
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
                    Objetivos
                  </div>

                  <div
                    className="
                      text-2xl
                      font-black
                      text-slate-800
                    "
                  >
                    {objetivos.length}
                  </div>
                </div>

                <div
                  className="
                    border
                    border-blue-200
                    rounded-lg
                    px-4
                    py-3
                    bg-blue-50
                  "
                >
                  <div
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      text-blue-700
                    "
                  >
                    Metas
                  </div>

                  <div
                    className="
                      text-2xl
                      font-black
                      text-blue-900
                    "
                  >
                    {metas.length}
                  </div>
                </div>

                <div
                  className="
                    border
                    border-gray-200
                    rounded-lg
                    px-4
                    py-3
                    bg-slate-50
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
                    Indicadores disponibles
                  </div>

                  <div
                    className="
                      text-2xl
                      font-black
                      text-slate-800
                    "
                  >
                    {indicadores.length}
                  </div>
                </div>

              </div>


              {/* ============================================
                  OBJETIVOS
              ============================================ */}

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
                        text-[11px]
                        font-black
                        uppercase
                      "
                    >
                      Objetivos PESV
                    </div>

                    <div
                      className="
                        text-[9px]
                        text-slate-300
                      "
                    >
                      Defina los resultados generales que desea alcanzar durante el año.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      limpiarFormularioObjetivo()
                      setModalObjetivoAbierto(true)
                    }}
                    className="
                      text-[10px]
                      bg-white/10
                      hover:bg-white/20
                      border
                      border-white/20
                      rounded
                      px-3
                      py-1.5
                      font-bold
                    "
                  >
                    <i className="fas fa-plus mr-1.5"></i>
                    Agregar objetivo
                  </button>

                </div>

                {modalObjetivoAbierto && (
                  <div
                    className="
                      fixed inset-0 z-50
                      bg-black/50
                      flex items-center justify-center
                      p-3 md:p-6
                    "
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget && !guardando) {
                        limpiarFormularioObjetivo()
                        setModalObjetivoAbierto(false)
                      }
                    }}
                  >
                    <form
                      ref={formularioObjetivoRef}
                      onSubmit={guardarObjetivo}
                      className="
                        w-full max-w-5xl
                        max-h-[90vh] overflow-y-auto
                        bg-white rounded-xl shadow-2xl
                        border border-gray-300
                      "
                    >
                      <div className="sticky top-0 z-10 bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-black uppercase">
                            {editandoObjetivoId ? 'Editar objetivo PESV' : 'Agregar objetivo PESV'}
                          </div>
                          <div className="text-[9px] text-slate-300">
                            Vigencia {anio}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={guardando}
                          onClick={() => {
                            limpiarFormularioObjetivo()
                            setModalObjetivoAbierto(false)
                          }}
                          className="w-8 h-8 rounded hover:bg-white/10 disabled:opacity-50"
                          title="Cerrar"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div className="p-4">

                  {editandoObjetivoId && (
                    <div
                      className="
                        mb-3
                        bg-amber-50
                        border
                        border-amber-200
                        text-amber-800
                        rounded-lg
                        px-3
                        py-2
                        text-[10px]
                        font-semibold
                      "
                    >
                      <i className="fas fa-edit mr-2"></i>

                      Está editando un objetivo existente. Realice los cambios y presione Guardar cambios.
                    </div>
                  )}

                  <div
                    className="
                      grid
                      grid-cols-1
                      md:grid-cols-12
                      gap-3
                    "
                  >

                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Código *
                      </label>

                      <input
                        value={
                          formularioObjetivo.codigo
                        }
                        onChange={
                          event =>
                            cambiarObjetivo(
                              'codigo',
                              event.target.value
                            )
                        }
                        placeholder="OBJ-01"
                        className="
                          w-full
                          border
                          border-gray-300
                          rounded
                          px-2
                          py-2
                          text-xs
                          uppercase
                        "
                      />
                    </div>

                    <div className="md:col-span-5">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Nombre del objetivo *
                      </label>

                      <input
                        value={
                          formularioObjetivo.nombre
                        }
                        onChange={
                          event =>
                            cambiarObjetivo(
                              'nombre',
                              event.target.value
                            )
                        }
                        placeholder="Nombre del objetivo PESV"
                        className="
                          w-full
                          border
                          border-gray-300
                          rounded
                          px-2
                          py-2
                          text-xs
                        "
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Responsable
                      </label>

                      <select
                        value={
                          formularioObjetivo
                            .responsable_personal_id
                        }
                        onChange={
                          event =>
                            cambiarObjetivo(
                              'responsable_personal_id',
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

                        {personalOrdenado.map(
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

                      <p className="mt-1 text-[9px] text-gray-500">
                        CM_PESV no se muestra porque es el indicador global que calcula el cumplimiento de las metas del PESV y no debe asociarse a una meta individual.
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Estado
                      </label>

                      <select
                        value={
                          formularioObjetivo.estado
                        }
                        onChange={
                          event =>
                            cambiarObjetivo(
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

                        <option value="INACTIVO">
                          INACTIVO
                        </option>
                      </select>
                    </div>

                    <div className="md:col-span-7">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Descripción
                      </label>

                      <textarea
                        rows="2"
                        value={
                          formularioObjetivo.descripcion
                        }
                        onChange={
                          event =>
                            cambiarObjetivo(
                              'descripcion',
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
                          resize-y
                        "
                      />
                    </div>

                    <div className="md:col-span-5">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Observaciones
                      </label>

                      <textarea
                        rows="2"
                        value={
                          formularioObjetivo.observaciones
                        }
                        onChange={
                          event =>
                            cambiarObjetivo(
                              'observaciones',
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
                          resize-y
                        "
                      />
                    </div>

                  </div>

                  <div
                    className="
                      flex
                      justify-end
                      gap-2
                      mt-3
                    "
                  >

                    {editandoObjetivoId && (
                      <button
                        type="button"
                        onClick={() => {
                          limpiarFormularioObjetivo()
                          setModalObjetivoAbierto(false)
                        }}
                        className="
                          bg-gray-200
                          hover:bg-gray-300
                          text-gray-700
                          rounded
                          px-4
                          py-2
                          text-[10px]
                          font-bold
                        "
                      >
                        Cancelar
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={
                        guardando
                      }
                      className="
                        bg-[var(--primary)]
                        hover:bg-[var(--primary-dark)]
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
                        className={`fas ${
                          editandoObjetivoId
                            ? 'fa-save'
                            : 'fa-plus'
                        } mr-1.5`}
                      ></i>

                      {editandoObjetivoId
                        ? 'Guardar cambios'
                        : 'Agregar objetivo'}
                    </button>

                  </div>

                      </div>
                    </form>
                  </div>
                )}


                {/* ==========================================
                    LISTADO OBJETIVOS
                ========================================== */}

                <div
                  ref={
                    listadoObjetivosRef
                  }
                  className="
                    overflow-x-auto
                    scroll-mt-5
                  "
                >

                  <table className="w-full text-xs">

                    <thead className="bg-gray-100 border-b border-gray-300">
                      <tr className="text-[9px] uppercase text-gray-600">
                        <th className="px-3 py-2 text-left">
                          Código
                        </th>

                        <th className="px-3 py-2 text-left">
                          Objetivo
                        </th>

                        <th className="px-3 py-2 text-left">
                          Responsable
                        </th>

                        <th className="px-3 py-2 text-center">
                          Metas
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

                      {objetivosOrdenados.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="
                              text-center
                              text-gray-500
                              py-8
                            "
                          >
                            No existen objetivos PESV registrados para {anio}.
                          </td>
                        </tr>
                      ) : (
                        objetivosOrdenados.map(
                          objetivo => {
                            const cantidadMetas =
                              metas.filter(
                                meta =>
                                  Number(
                                    meta?.objetivo_id
                                  ) ===
                                  Number(
                                    objetivo?.id
                                  )
                              ).length

                            const estaResaltado =
                              Number(
                                resaltadoObjetivoId
                              ) ===
                              Number(
                                objetivo.id
                              )

                            return (
                              <tr
                                id={`objetivo-${objetivo.id}`}
                                key={
                                  objetivo.id
                                }
                                className={`
                                  border-b
                                  border-gray-200
                                  transition-all
                                  duration-500
                                  ${
                                    estaResaltado
                                      ? 'bg-green-100 ring-2 ring-inset ring-green-400'
                                      : 'hover:bg-blue-50/40'
                                  }
                                `}
                              >
                                <td className="px-3 py-2 font-bold text-gray-800 whitespace-nowrap">
                                  {objetivo.codigo}
                                </td>

                                <td className="px-3 py-2">
                                  <div className="font-semibold text-gray-800">
                                    {objetivo.nombre}
                                  </div>

                                  {objetivo.descripcion && (
                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                      {objetivo.descripcion}
                                    </div>
                                  )}
                                </td>

                                <td className="px-3 py-2 text-[10px] text-gray-600">
                                  {objetivo.responsable_nombre ||
                                    '-'}
                                </td>

                                <td className="px-3 py-2 text-center font-bold">
                                  {cantidadMetas}
                                </td>

                                <td className="px-3 py-2 text-center">
                                  <span
                                    className={`
                                      inline-flex
                                      border
                                      rounded-full
                                      px-2
                                      py-0.5
                                      text-[9px]
                                      font-bold
                                      ${claseEstado(
                                        objetivo.estado
                                      )}
                                    `}
                                  >
                                    {objetivo.estado}
                                  </span>
                                </td>

                                <td className="px-3 py-2">
                                  <div className="flex justify-center gap-1">

                                    <button
                                      type="button"
                                      onClick={() =>
                                        editarObjetivo(
                                          objetivo
                                        )
                                      }
                                      className="
                                        bg-blue-50
                                        hover:bg-blue-100
                                        text-blue-700
                                        border
                                        border-blue-200
                                        rounded
                                        px-2
                                        py-1
                                        text-[9px]
                                      "
                                      title="Editar objetivo"
                                    >
                                      <i className="fas fa-edit"></i>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        crearMetaDesdeObjetivo(
                                          objetivo
                                        )
                                      }
                                      className="
                                        bg-green-50
                                        hover:bg-green-100
                                        text-green-700
                                        border
                                        border-green-200
                                        rounded
                                        px-2
                                        py-1
                                        text-[9px]
                                      "
                                      title="Crear meta para este objetivo"
                                    >
                                      <i className="fas fa-bullseye"></i>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        eliminarObjetivo(
                                          objetivo
                                        )
                                      }
                                      className="
                                        bg-red-50
                                        hover:bg-red-100
                                        text-red-700
                                        border
                                        border-red-200
                                        rounded
                                        px-2
                                        py-1
                                        text-[9px]
                                      "
                                      title="Eliminar objetivo"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>

                                  </div>
                                </td>
                              </tr>
                            )
                          }
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </section>


              {/* ============================================
                  METAS
              ============================================ */}

              <section
                className="
                  border
                  border-blue-300
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
                      Metas PESV
                    </div>

                    <div
                      className="
                        text-[9px]
                        text-blue-200
                      "
                    >
                      Cada objetivo puede tener una o varias metas medibles.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      limpiarFormularioMeta()
                      setModalMetaAbierto(true)
                    }}
                    className="
                      text-[10px]
                      bg-white/10
                      hover:bg-white/20
                      border
                      border-white/20
                      rounded
                      px-3
                      py-1.5
                      font-bold
                    "
                  >
                    <i className="fas fa-plus mr-1.5"></i>
                    Agregar meta
                  </button>

                </div>

                {modalMetaAbierto && (
                  <div
                    className="
                      fixed inset-0 z-50
                      bg-black/50
                      flex items-center justify-center
                      p-3 md:p-6
                    "
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget && !guardando) {
                        limpiarFormularioMeta()
                        setModalMetaAbierto(false)
                      }
                    }}
                  >
                    <form
                      ref={formularioMetaRef}
                      onSubmit={guardarMeta}
                      className="
                        w-full max-w-6xl
                        max-h-[92vh] overflow-y-auto
                        bg-white rounded-xl shadow-2xl
                        border border-blue-300
                      "
                    >
                      <div className="sticky top-0 z-10 bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-black uppercase">
                            {editandoMetaId ? 'Editar meta PESV' : 'Agregar meta PESV'}
                          </div>
                          <div className="text-[9px] text-blue-200">
                            Configure la meta y su indicador asociado
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={guardando}
                          onClick={() => {
                            limpiarFormularioMeta()
                            setModalMetaAbierto(false)
                          }}
                          className="w-8 h-8 rounded hover:bg-white/10 disabled:opacity-50"
                          title="Cerrar"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div className="p-4 bg-blue-50/30">

                  {editandoMetaId && (
                    <div
                      className="
                        mb-3
                        bg-amber-50
                        border
                        border-amber-200
                        text-amber-800
                        rounded-lg
                        px-3
                        py-2
                        text-[10px]
                        font-semibold
                      "
                    >
                      <i className="fas fa-edit mr-2"></i>

                      Está editando una meta existente. Realice los cambios y presione Guardar cambios.
                    </div>
                  )}

                  <div
                    className="
                      grid
                      grid-cols-1
                      md:grid-cols-12
                      gap-3
                    "
                  >

                    <div className="md:col-span-4">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Objetivo *
                      </label>

                      <select
                        value={
                          formularioMeta.objetivo_id
                        }
                        onChange={
                          event =>
                            cambiarMeta(
                              'objetivo_id',
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

                        {objetivosActivos.map(
                          objetivo => (
                            <option
                              key={
                                objetivo.id
                              }
                              value={
                                objetivo.id
                              }
                            >
                              {objetivo.codigo} - {objetivo.nombre}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Código *
                      </label>

                      <input
                        value={
                          formularioMeta.codigo
                        }
                        onChange={
                          event =>
                            cambiarMeta(
                              'codigo',
                              event.target.value
                            )
                        }
                        placeholder="META-01"
                        className="
                          w-full
                          border
                          border-gray-300
                          rounded
                          px-2
                          py-2
                          text-xs
                          uppercase
                        "
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Indicador asociado
                      </label>

                      <select
                        value={
                          formularioMeta.indicador_id
                        }
                        onChange={
                          event =>
                            cambiarIndicadorMeta(
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
                          Sin indicador asociado
                        </option>

                        {indicadores
                          .filter(
                            indicador =>
                              texto(
                                indicador?.codigo
                              )
                                .toUpperCase() !==
                              'CM_PESV'
                          )
                          .map(
                          indicador => (
                            <option
                              key={
                                indicador.id
                              }
                              value={
                                indicador.id
                              }
                            >
                              {indicador.numero_normativo} - {indicador.codigo} - {indicador.nombre}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Estado
                      </label>

                      <select
                        value={
                          formularioMeta.estado
                        }
                        onChange={
                          event =>
                            cambiarMeta(
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
                        <option value="ACTIVA">
                          ACTIVA
                        </option>

                        <option value="INACTIVA">
                          INACTIVA
                        </option>
                      </select>
                    </div>

                    <div className="md:col-span-12">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Descripción de la meta *
                      </label>

                      <textarea
                        rows="2"
                        value={
                          formularioMeta.descripcion
                        }
                        onChange={
                          event =>
                            cambiarMeta(
                              'descripcion',
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
                          resize-y
                          bg-white
                        "
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Línea base
                      </label>

                      <input
                        type="number"
                        step="any"
                        value={
                          formularioMeta.linea_base
                        }
                        onChange={
                          event =>
                            cambiarMeta(
                              'linea_base',
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
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Operador
                      </label>

                      <select
                        value={
                          formularioMeta.operador_meta
                        }
                        onChange={
                          event =>
                            cambiarMeta(
                              'operador_meta',
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
                        <option value=">=">
                          ≥
                        </option>

                        <option value="<=">
                          ≤
                        </option>

                        <option value="=">
                          =
                        </option>

                        <option value=">">
                          &gt;
                        </option>

                        <option value="<">
                          &lt;
                        </option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Valor meta
                      </label>

                      <input
                        type="number"
                        step="any"
                        value={
                          formularioMeta.valor_meta
                        }
                        onChange={
                          event =>
                            cambiarMeta(
                              'valor_meta',
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
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Unidad
                      </label>

                      <input
                        value={
                          formularioMeta.unidad_medida
                        }
                        onChange={
                          event =>
                            cambiarMeta(
                              'unidad_medida',
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
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Fecha límite
                      </label>

                      <input
                        type="date"
                        value={
                          formularioMeta.fecha_limite
                        }
                        onChange={
                          event =>
                            cambiarMeta(
                              'fecha_limite',
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
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Responsable
                      </label>

                      <select
                        value={
                          formularioMeta
                            .responsable_personal_id
                        }
                        onChange={
                          event =>
                            cambiarMeta(
                              'responsable_personal_id',
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

                        {personalOrdenado.map(
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

                    <div className="md:col-span-12">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-1">
                        Observaciones
                      </label>

                      <textarea
                        rows="2"
                        value={
                          formularioMeta.observaciones
                        }
                        onChange={
                          event =>
                            cambiarMeta(
                              'observaciones',
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
                          resize-y
                          bg-white
                        "
                      />
                    </div>

                  </div>

                  <div
                    className="
                      flex
                      justify-end
                      gap-2
                      mt-3
                    "
                  >

                    {editandoMetaId && (
                      <button
                        type="button"
                        onClick={() => {
                          limpiarFormularioMeta()
                          setModalMetaAbierto(false)
                        }}
                        className="
                          bg-gray-200
                          hover:bg-gray-300
                          text-gray-700
                          rounded
                          px-4
                          py-2
                          text-[10px]
                          font-bold
                        "
                      >
                        Cancelar
                      </button>
                    )}

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
                        className={`fas ${
                          editandoMetaId
                            ? 'fa-save'
                            : 'fa-plus'
                        } mr-1.5`}
                      ></i>

                      {editandoMetaId
                        ? 'Guardar cambios'
                        : 'Agregar meta'}
                    </button>

                  </div>

                      </div>
                    </form>
                  </div>
                )}


                {/* ==========================================
                    LISTADO METAS
                ========================================== */}

                <div
                  ref={
                    listadoMetasRef
                  }
                  className="
                    overflow-x-auto
                    scroll-mt-5
                  "
                >

                  <table className="w-full text-xs">

                    <thead
                      className="
                        bg-blue-50
                        border-b
                        border-blue-200
                      "
                    >
                      <tr className="text-[9px] uppercase text-blue-900">
                        <th className="px-3 py-2 text-left">
                          Meta
                        </th>

                        <th className="px-3 py-2 text-left">
                          Objetivo
                        </th>

                        <th className="px-3 py-2 text-left">
                          Indicador
                        </th>

                        <th className="px-3 py-2 text-center">
                          Meta
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

                      {metasOrdenadas.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan="7"
                            className="
                              text-center
                              text-gray-500
                              py-8
                            "
                          >
                            No existen metas PESV registradas para {anio}.
                          </td>
                        </tr>
                      ) : (
                        metasOrdenadas.map(
                          meta => {
                            const objetivo =
                              meta?.pesv_objetivos

                            const indicador =
                              meta
                                ?.pesv_indicadores_catalogo

                            const estaResaltada =
                              Number(
                                resaltadoMetaId
                              ) ===
                              Number(
                                meta.id
                              )

                            return (
                              <tr
                                id={`meta-${meta.id}`}
                                key={
                                  meta.id
                                }
                                className={`
                                  border-b
                                  border-gray-200
                                  transition-all
                                  duration-500
                                  ${
                                    estaResaltada
                                      ? 'bg-green-100 ring-2 ring-inset ring-green-400'
                                      : 'hover:bg-blue-50/60'
                                  }
                                `}
                              >

                                <td className="px-3 py-2">
                                  <div className="font-bold text-blue-900">
                                    {meta.codigo}
                                  </div>

                                  <div className="text-[10px] text-gray-600 mt-0.5 max-w-[420px]">
                                    {meta.descripcion}
                                  </div>
                                </td>

                                <td className="px-3 py-2 text-[10px] text-gray-600">
                                  {objetivo
                                    ? `${objetivo.codigo} - ${objetivo.nombre}`
                                    : '-'}
                                </td>

                                <td className="px-3 py-2 text-[10px] text-gray-600">
                                  {indicador
                                    ? `${indicador.codigo} - ${indicador.nombre}`
                                    : 'Sin indicador'}
                                </td>

                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                  {meta.valor_meta !==
                                  null ? (
                                    <span className="font-bold text-gray-800">
                                      {meta.operador_meta || ''}{' '}
                                      {meta.valor_meta}{' '}
                                      {meta.unidad_medida || ''}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>

                                <td className="px-3 py-2 text-[10px] text-gray-600">
                                  {meta.responsable_nombre ||
                                    '-'}
                                </td>

                                <td className="px-3 py-2 text-center">
                                  <span
                                    className={`
                                      inline-flex
                                      border
                                      rounded-full
                                      px-2
                                      py-0.5
                                      text-[9px]
                                      font-bold
                                      ${claseEstado(
                                        meta.estado
                                      )}
                                    `}
                                  >
                                    {meta.estado}
                                  </span>
                                </td>

                                <td className="px-3 py-2">
                                  <div className="flex justify-center gap-1">

                                    <button
                                      type="button"
                                      onClick={() =>
                                        editarMeta(
                                          meta
                                        )
                                      }
                                      className="
                                        bg-blue-50
                                        hover:bg-blue-100
                                        text-blue-800
                                        border
                                        border-blue-200
                                        rounded
                                        px-2
                                        py-1
                                        text-[9px]
                                      "
                                      title="Editar meta"
                                    >
                                      <i className="fas fa-edit"></i>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        eliminarMeta(
                                          meta
                                        )
                                      }
                                      className="
                                        bg-red-50
                                        hover:bg-red-100
                                        text-red-700
                                        border
                                        border-red-200
                                        rounded
                                        px-2
                                        py-1
                                        text-[9px]
                                      "
                                      title="Eliminar meta"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>

                                  </div>
                                </td>

                              </tr>
                            )
                          }
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </section>

            </div>
          )}

        </div>

      </div>

    </div>
  )
}