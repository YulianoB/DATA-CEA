// app/admin/pesv/auditorias/page.jsx

'use client'

// ============================================================
// app/admin/pesv/auditorias/page.jsx
// MÓDULO PESV - AUDITORÍAS / NO CONFORMIDADES
// ============================================================

import {
  useCallback,
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


// ============================================================
// CONSTANTES
// app/admin/pesv/auditorias/page.jsx
// ============================================================

const API_AUDITORIAS =
  '/api/admin/pesv/auditorias'


const TIPOS_AUDITORIA = [
  {
    value: 'INTERNA',
    label: 'Interna',
  },
  {
    value: 'EXTERNA',
    label: 'Externa',
  },
  {
    value: 'SEGUIMIENTO',
    label: 'Seguimiento',
  },
  {
    value: 'ESPECIAL',
    label: 'Especial',
  },
]


const ESTADOS_AUDITORIA = [
  {
    value: 'PROGRAMADA',
    label: 'Programada',
  },
  {
    value: 'EN_PROCESO',
    label: 'En proceso',
  },
  {
    value: 'FINALIZADA',
    label: 'Finalizada',
  },
  {
    value: 'CERRADA',
    label: 'Cerrada',
  },
  {
    value: 'CANCELADA',
    label: 'Cancelada',
  },
]


const TIPOS_HALLAZGO = [
  {
    value: 'NO_CONFORMIDAD',
    label: 'No conformidad',
  },
  {
    value: 'OBSERVACION',
    label: 'Observación',
  },
  {
    value: 'OPORTUNIDAD_MEJORA',
    label: 'Oportunidad de mejora',
  },
  {
    value: 'FORTALEZA',
    label: 'Fortaleza',
  },
]


const CLASIFICACIONES_HALLAZGO = [
  {
    value: '',
    label: 'Sin clasificación',
  },
  {
    value: 'MAYOR',
    label: 'Mayor',
  },
  {
    value: 'MENOR',
    label: 'Menor',
  },
  {
    value: 'NO_APLICA',
    label: 'No aplica',
  },
]


const PRIORIDADES_HALLAZGO = [
  {
    value: '',
    label: 'Sin prioridad',
  },
  {
    value: 'ALTA',
    label: 'Alta',
  },
  {
    value: 'MEDIA',
    label: 'Media',
  },
  {
    value: 'BAJA',
    label: 'Baja',
  },
]


const ESTADOS_HALLAZGO = [
  {
    value: 'ABIERTO',
    label: 'Abierto',
  },
  {
    value: 'EN_TRATAMIENTO',
    label: 'En tratamiento',
  },
  {
    value: 'PENDIENTE_VERIFICACION',
    label: 'Pendiente verificación',
  },
  {
    value: 'CERRADO',
    label: 'Cerrado',
  },
]


const TIPOS_ACCION = [
  {
    value: 'CORRECCION',
    label: 'Corrección',
  },
  {
    value: 'CORRECTIVA',
    label: 'Acción correctiva',
  },
  {
    value: 'MEJORA',
    label: 'Acción de mejora',
  },
  {
    value: 'PREVENTIVA',
    label: 'Acción preventiva',
  },
  {
    value: 'OTRA',
    label: 'Otra',
  },
]


const ESTADOS_ACCION = [
  {
    value: 'PENDIENTE',
    label: 'Pendiente',
  },
  {
    value: 'EN_PROCESO',
    label: 'En proceso',
  },
  {
    value: 'IMPLEMENTADA',
    label: 'Implementada',
  },
  {
    value: 'VERIFICADA',
    label: 'Verificada',
  },
  {
    value: 'CERRADA',
    label: 'Cerrada',
  },
  {
    value: 'CANCELADA',
    label: 'Cancelada',
  },
]


// ============================================================
// ESTADOS INICIALES
// app/admin/pesv/auditorias/page.jsx
// ============================================================

function hoy() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    )
}


function formularioAuditoriaInicial(
  anio
) {
  return {
    anio,

    codigo: '',

    nombre:
      'AUDITORÍA INTERNA PESV',

    tipo_auditoria:
      'INTERNA',

    fecha_programada:
      '',

    fecha_ejecucion:
      '',

    objetivo: '',

    alcance: '',

    criterios: '',

    metodologia: '',

    lugar: '',

    auditor_personal_id:
      '',

    auditor_nombre:
      '',

    auditor_cargo:
      '',

    auditor_correo:
      '',

    responsable_area_personal_id:
      '',

    responsable_area_nombre:
      '',

    area_proceso_auditado:
      '',

    estado:
      'PROGRAMADA',
  }
}


// ============================================================
// FORMULARIO DE CIERRE DE AUDITORÍA
// app/admin/pesv/auditorias/page.jsx
//
// Estos datos NO hacen parte de la programación inicial.
// Se diligencian al final del flujo, después de la gestión
// de hallazgos, acciones y seguimientos.
// ============================================================

function formularioCierreInicial(
  auditoria = null
) {
  return {
    resultado_general:
      auditoria?.resultado_general ||
      '',

    fortalezas_generales:
      auditoria?.fortalezas_generales ||
      '',

    oportunidades_mejora_generales:
      auditoria?.oportunidades_mejora_generales ||
      '',

    conclusion:
      auditoria?.conclusion ||
      '',

    observaciones_finales:
      auditoria?.observaciones_finales ||
      '',

    fecha_cierre:
      auditoria?.fecha_cierre ||
      hoy(),

    observaciones:
      auditoria?.observaciones ||
      '',
  }
}


function formularioHallazgoInicial() {
  return {
    fecha_hallazgo:
      hoy(),

    tipo_hallazgo:
      'NO_CONFORMIDAD',

    requisito: '',

    criterio: '',

    proceso_area: '',

    descripcion: '',

    evidencia: '',

    causa: '',

    consecuencia: '',

    clasificacion:
      'MENOR',

    prioridad:
      'MEDIA',

    responsable_personal_id:
      '',

    responsable_nombre:
      '',

    estado:
      'ABIERTO',

    fecha_cierre:
      '',

    verificacion_cierre:
      '',
  }
}


function formularioAccionInicial() {
  return {
    fecha_accion:
      hoy(),

    tipo_accion:
      'CORRECTIVA',

    descripcion: '',

    evidencia_esperada:
      '',

    responsable_personal_id:
      '',

    responsable_nombre:
      '',

    responsable_cargo:
      '',

    fecha_compromiso:
      '',

    fecha_implementacion:
      '',

    estado:
      'PENDIENTE',

    resultado: '',

    fecha_cierre:
      '',

    observaciones:
      '',
  }
}


function formularioSeguimientoInicial() {
  return {
    fecha_seguimiento:
      hoy(),

    descripcion: '',

    resultado: '',

    avance_porcentaje:
      '',

    implementacion_verificada:
      false,

    eficacia_verificada:
      false,

    resultado_eficacia:
      '',

    responsable_personal_id:
      '',

    responsable_nombre:
      '',

    requiere_nuevo_seguimiento:
      false,

    fecha_proximo_seguimiento:
      '',

    evidencia: '',

    observaciones:
      '',
  }
}


// ============================================================
// HELPERS
// app/admin/pesv/auditorias/page.jsx
// ============================================================

function obtenerNitUsuario(
  user
) {
  return (
    user?.nit ||
    user?.nitEmpresa ||
    user?.nit_empresa ||
    user?.empresaNit ||
    user?.empresa_nit ||
    ''
  )
}


function obtenerUsuarioTexto(
  user
) {
  return (
    user?.email ||
    user?.correo ||
    user?.username ||
    user?.usuario ||
    user?.nombre ||
    ''
  )
}


function obtenerNombreUsuario(
  user
) {
  return texto(
    user?.nombreCompleto ||
    user?.nombre_completo ||
    user?.nombre ||
    user?.usuario ||
    user?.username ||
    user?.email ||
    user?.correo ||
    ''
  ) || '-'
}


function obtenerNombreEmpresa(
  user,
  empresa
) {
  return texto(
    empresa?.nombre ||
    empresa?.razon_social ||
    user?.nombreEmpresa ||
    user?.nombre_empresa ||
    user?.empresa ||
    ''
  ) || '-'
}


function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function formatearFecha(
  fecha
) {
  if (
    !fecha
  ) {
    return '—'
  }

  const partes =
    String(
      fecha
    )
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


function etiqueta(
  valor
) {
  return String(
    valor || ''
  )
    .replaceAll(
      '_',
      ' '
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      letra =>
        letra.toUpperCase()
    )
}


function claseEstadoAuditoria(
  estado
) {
  switch (
    estado
  ) {
    case 'CERRADA':
      return 'bg-emerald-400 text-emerald-800 border-emerald-200'

    case 'FINALIZADA':
      return 'bg-blue-400 text-blue-800 border-blue-200'

    case 'EN_PROCESO':
      return 'bg-amber-400 text-amber-800 border-amber-200'

    case 'CANCELADA':
      return 'bg-red-400 text-red-800 border-red-200'

    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}


function claseTipoHallazgo(
  tipo
) {
  switch (
    tipo
  ) {
    case 'NO_CONFORMIDAD':
      return 'bg-red-100 text-red-800 border-red-200'

    case 'OBSERVACION':
      return 'bg-amber-100 text-amber-800 border-amber-200'

    case 'OPORTUNIDAD_MEJORA':
      return 'bg-blue-100 text-blue-800 border-blue-200'

    case 'FORTALEZA':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'

    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}


// ============================================================
// COMPONENTE PRINCIPAL
// app/admin/pesv/auditorias/page.jsx
// ============================================================

export default function AuditoriasPesvPage() {
  const router =
    useRouter()

  const anioActual =
    new Date()
      .getFullYear()

  // ----------------------------------------------------------
  // SESIÓN / EMPRESA
  // ----------------------------------------------------------

  const [
    user,
    setUser,
  ] =
    useState(
      null
    )

  const [
    nit,
    setNit,
  ] =
    useState(
      ''
    )

  const [
    usuario,
    setUsuario,
  ] =
    useState(
      ''
    )

  const [
    empresa,
    setEmpresa,
  ] =
    useState(
      null
    )

  // ----------------------------------------------------------
  // DATOS
  // ----------------------------------------------------------

  const [
    anio,
    setAnio,
  ] =
    useState(
      anioActual
    )

  const [
    auditorias,
    setAuditorias,
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
    resumen,
    setResumen,
  ] =
    useState({
      total: 0,
      programadas: 0,
      en_proceso: 0,
      finalizadas: 0,
      cerradas: 0,
      canceladas: 0,
      total_hallazgos: 0,
      no_conformidades: 0,
      observaciones: 0,
      oportunidades_mejora: 0,
      fortalezas: 0,
      acciones_pendientes: 0,
    })

  // ----------------------------------------------------------
  // INTERFAZ
  // ----------------------------------------------------------

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
    mensaje,
    setMensaje,
  ] =
    useState(
      ''
    )

  const [
    error,
    setError,
  ] =
    useState(
      ''
    )

  const [
    mostrarFormularioAuditoria,
    setMostrarFormularioAuditoria,
  ] =
    useState(
      false
    )

  const [
    auditoriaSeleccionadaId,
    setAuditoriaSeleccionadaId,
  ] =
    useState(
      null
    )

  // ----------------------------------------------------------
  // FORMULARIO AUDITORÍA
  // ----------------------------------------------------------

  const [
    formularioAuditoria,
    setFormularioAuditoria,
  ] =
    useState(
      formularioAuditoriaInicial(
        anioActual
      )
    )

  const [
    auditoriaEditandoId,
    setAuditoriaEditandoId,
  ] =
    useState(
      null
    )

  // ----------------------------------------------------------
  // FORMULARIO CIERRE DE AUDITORÍA
  // ----------------------------------------------------------

  const [
    mostrarFormularioCierre,
    setMostrarFormularioCierre,
  ] =
    useState(
      false
    )

  const [
    formularioCierre,
    setFormularioCierre,
  ] =
    useState(
      formularioCierreInicial()
    )

  // ----------------------------------------------------------
  // FORMULARIO HALLAZGO
  // ----------------------------------------------------------

  const [
    mostrarFormularioHallazgo,
    setMostrarFormularioHallazgo,
  ] =
    useState(
      false
    )

  const [
    formularioHallazgo,
    setFormularioHallazgo,
  ] =
    useState(
      formularioHallazgoInicial()
    )

  const [
    hallazgoEditandoId,
    setHallazgoEditandoId,
  ] =
    useState(
      null
    )

  // ----------------------------------------------------------
  // FORMULARIO ACCIÓN
  // ----------------------------------------------------------

  const [
    hallazgoAccionId,
    setHallazgoAccionId,
  ] =
    useState(
      null
    )

  const [
    formularioAccion,
    setFormularioAccion,
  ] =
    useState(
      formularioAccionInicial()
    )

  const [
    accionEditandoId,
    setAccionEditandoId,
  ] =
    useState(
      null
    )

  // ----------------------------------------------------------
  // FORMULARIO SEGUIMIENTO
  // ----------------------------------------------------------

  const [
    accionSeguimientoId,
    setAccionSeguimientoId,
  ] =
    useState(
      null
    )

  const [
    formularioSeguimiento,
    setFormularioSeguimiento,
  ] =
    useState(
      formularioSeguimientoInicial()
    )

  const [
    seguimientoEditandoId,
    setSeguimientoEditandoId,
  ] =
    useState(
      null
    )


  // ==========================================================
  // AUDITORÍA SELECCIONADA
  // app/admin/pesv/auditorias/page.jsx
  // ==========================================================

  const auditoriaSeleccionada =
    useMemo(
      () =>
        auditorias.find(
          item =>
            Number(
              item.id
            ) ===
            Number(
              auditoriaSeleccionadaId
            )
        ) ||
        null,
      [
        auditorias,
        auditoriaSeleccionadaId,
      ]
    )


  // ==========================================================
  // LEER SESIÓN
  // app/admin/pesv/auditorias/page.jsx
  // ==========================================================

  useEffect(
    () => {
      try {
        const guardado =
          localStorage.getItem(
            'currentUser'
          )

        if (
          !guardado
        ) {
          router.push(
            '/login'
          )

          return
        }

        const user =
          JSON.parse(
            guardado
          )

        const nitEncontrado =
          obtenerNitUsuario(
            user
          )

        if (
          !nitEncontrado
        ) {
          router.push(
            '/login'
          )

          return
        }

        setUser(
          user
        )

        setNit(
          String(
            nitEncontrado
          )
        )

        setUsuario(
          obtenerUsuarioTexto(
            user
          )
        )
      } catch (
        err
      ) {
        console.error(
          'Error leyendo sesión:',
          err
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
  // LLAMADA A API
  // app/admin/pesv/auditorias/page.jsx
  // ==========================================================

  const solicitarApi =
    useCallback(
      async (
        metodo,
        body = null
      ) => {
        const opciones = {
          method:
            metodo,

          headers: {
            'Content-Type':
              'application/json',

            'x-cea-nit':
              nit,
          },

          cache:
            'no-store',
        }

        if (
          body
        ) {
          opciones.body =
            JSON.stringify({
              ...body,

              nit,

              usuario,
            })
        }

        const response =
          await fetch(
            API_AUDITORIAS,
            opciones
          )

        const data =
          await response.json()

        if (
          !response.ok ||
          data?.status ===
            'failed'
        ) {
          throw new Error(
            data?.message ||
              'No fue posible completar la operación.'
          )
        }

        return data
      },
      [
        nit,
        usuario,
      ]
    )


  // ==========================================================
  // CARGAR DATOS
  // app/admin/pesv/auditorias/page.jsx
  // API: GET /api/admin/pesv/auditorias
  // ==========================================================

  const cargarDatos =
    useCallback(
      async () => {
        if (
          !nit
        ) {
          return
        }

        setCargando(
          true
        )

        setError(
          ''
        )

        try {
          const response =
            await fetch(
              `${API_AUDITORIAS}?nit=${encodeURIComponent(
                nit
              )}&anio=${encodeURIComponent(
                anio
              )}`,
              {
                headers: {
                  'x-cea-nit':
                    nit,
                },

                cache:
                  'no-store',
              }
            )

          const data =
            await response.json()

          if (
            !response.ok ||
            data?.status ===
              'failed'
          ) {
            throw new Error(
              data?.message ||
                'No fue posible cargar las auditorías.'
            )
          }

          setEmpresa(
            data?.empresa ||
              null
          )

          setAuditorias(
            data?.auditorias ||
              []
          )

          setPersonal(
            data?.personal ||
              []
          )

          setResumen(
            data?.resumen ||
              {}
          )

          if (
            auditoriaSeleccionadaId
          ) {
            const existe =
              (
                data?.auditorias ||
                []
              ).some(
                item =>
                  Number(
                    item.id
                  ) ===
                  Number(
                    auditoriaSeleccionadaId
                  )
              )

            if (
              !existe
            ) {
              setAuditoriaSeleccionadaId(
                null
              )
            }
          }
        } catch (
          err
        ) {
          console.error(
            err
          )

          setError(
            err.message
          )
        } finally {
          setCargando(
            false
          )
        }
      },
      [
        nit,
        anio,
        auditoriaSeleccionadaId,
      ]
    )


  useEffect(
    () => {
      cargarDatos()
    },
    [
      cargarDatos,
    ]
  )


  // ==========================================================
  // MENSAJES
  // ==========================================================

  function limpiarMensajes() {
    setMensaje(
      ''
    )

    setError(
      ''
    )
  }


  function mostrarExito(
    textoMensaje
  ) {
    setMensaje(
      textoMensaje
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
      3500
    )
  }


  // ==========================================================
  // NUEVA AUDITORÍA
  // app/admin/pesv/auditorias/page.jsx
  // ==========================================================

  function nuevaAuditoria() {
    limpiarMensajes()

    setAuditoriaEditandoId(
      null
    )

    setFormularioAuditoria(
      formularioAuditoriaInicial(
        anio
      )
    )

    setMostrarFormularioAuditoria(
      true
    )

    window.setTimeout(
      () => {
        document
          .getElementById(
            'formulario-auditoria-pesv'
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
  // SELECCIONAR AUDITORÍA PARA GESTIÓN
  // app/admin/pesv/auditorias/page.jsx
  // ==========================================================

  function seleccionarAuditoria(
    item
  ) {
    limpiarMensajes()

    setAuditoriaSeleccionadaId(
      item.id
    )

    setMostrarFormularioHallazgo(
      false
    )

    setHallazgoAccionId(
      null
    )

    setAccionSeguimientoId(
      null
    )

    setMostrarFormularioCierre(
      false
    )
  }


  // ==========================================================
  // EDITAR AUDITORÍA
  // app/admin/pesv/auditorias/page.jsx
  // ==========================================================

  function editarAuditoria(
    item
  ) {
    limpiarMensajes()

    setAuditoriaEditandoId(
      item.id
    )

    setFormularioAuditoria({
      anio:
        item.anio ||
        anio,

      codigo:
        item.codigo ||
        '',

      nombre:
        item.nombre ||
        '',

      tipo_auditoria:
        item.tipo_auditoria ||
        'INTERNA',

      fecha_programada:
        item.fecha_programada ||
        '',

      fecha_ejecucion:
        item.fecha_ejecucion ||
        '',

      objetivo:
        item.objetivo ||
        '',

      alcance:
        item.alcance ||
        '',

      criterios:
        item.criterios ||
        '',

      metodologia:
        item.metodologia ||
        '',

      lugar:
        item.lugar ||
        '',

      auditor_personal_id:
        item.auditor_personal_id ||
        '',

      auditor_nombre:
        item.auditor_nombre ||
        '',

      auditor_cargo:
        item.auditor_cargo ||
        '',

      auditor_correo:
        item.auditor_correo ||
        '',

      responsable_area_personal_id:
        item.responsable_area_personal_id ||
        '',

      responsable_area_nombre:
        item.responsable_area_nombre ||
        '',

      area_proceso_auditado:
        item.area_proceso_auditado ||
        '',

      estado:
        item.estado ||
        'PROGRAMADA',

    })

    setMostrarFormularioAuditoria(
      true
    )

    window.setTimeout(
      () => {
        document
          .getElementById(
            'formulario-auditoria-pesv'
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
  // SELECCIONAR AUDITOR DESDE PERSONAL
  // app/admin/pesv/auditorias/page.jsx
  // ==========================================================

  function cambiarAuditorPersonal(
    valor
  ) {
    const id =
      valor
        ? Number(
            valor
          )
        : ''

    const persona =
      personal.find(
        item =>
          Number(
            item.id
          ) ===
          Number(
            id
          )
      )

    setFormularioAuditoria(
      anterior => ({
        ...anterior,

        auditor_personal_id:
          id,

        auditor_nombre:
          persona
            ?.nombre_completo ||
          '',

        auditor_correo:
          persona?.email ||
          anterior
            .auditor_correo ||
          '',
      })
    )
  }


  function cambiarResponsableArea(
    valor
  ) {
    const id =
      valor
        ? Number(
            valor
          )
        : ''

    const persona =
      personal.find(
        item =>
          Number(
            item.id
          ) ===
          Number(
            id
          )
      )

    setFormularioAuditoria(
      anterior => ({
        ...anterior,

        responsable_area_personal_id:
          id,

        responsable_area_nombre:
          persona
            ?.nombre_completo ||
          '',
      })
    )
  }


  // ==========================================================
  // GUARDAR AUDITORÍA
  // app/admin/pesv/auditorias/page.jsx
  // API: POST / PATCH /api/admin/pesv/auditorias
  // ==========================================================

  async function guardarAuditoria(
    event
  ) {
    event.preventDefault()

    limpiarMensajes()

    if (
      !texto(
        formularioAuditoria.nombre
      )
    ) {
      setError(
        'Debe indicar el nombre de la auditoría.'
      )

      return
    }

    if (
      !texto(
        formularioAuditoria.objetivo
      )
    ) {
      setError(
        'Debe indicar el objetivo de la auditoría.'
      )

      return
    }

    if (
      !texto(
        formularioAuditoria.alcance
      )
    ) {
      setError(
        'Debe indicar el alcance de la auditoría.'
      )

      return
    }

    setGuardando(
      true
    )

    try {
      if (
        auditoriaEditandoId
      ) {
        await solicitarApi(
          'PATCH',
          {
            accion:
              'actualizar_auditoria',

            id:
              auditoriaEditandoId,

            ...formularioAuditoria,
          }
        )

        mostrarExito(
          'Auditoría actualizada correctamente.'
        )
      } else {
        const data =
          await solicitarApi(
            'POST',
            {
              accion:
                'crear_auditoria',

              ...formularioAuditoria,
            }
          )

        if (
          data?.auditoria?.id
        ) {
          setAuditoriaSeleccionadaId(
            data.auditoria.id
          )
        }

        mostrarExito(
          'Auditoría creada correctamente.'
        )
      }

      setMostrarFormularioAuditoria(
        false
      )

      setAuditoriaEditandoId(
        null
      )

      setFormularioAuditoria(
        formularioAuditoriaInicial(
          anio
        )
      )

      await cargarDatos()
    } catch (
      err
    ) {
      setError(
        err.message
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  // ==========================================================
  // ABRIR CIERRE DE AUDITORÍA
  // app/admin/pesv/auditorias/page.jsx
  // ==========================================================

  function abrirCierreAuditoria() {
    if (
      !auditoriaSeleccionada
    ) {
      return
    }

    limpiarMensajes()

    setFormularioCierre(
      formularioCierreInicial(
        auditoriaSeleccionada
      )
    )

    setMostrarFormularioCierre(
      true
    )

    window.setTimeout(
      () => {
        document
          .getElementById(
            'formulario-cierre-auditoria-pesv'
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
  // GUARDAR CIERRE DE AUDITORÍA
  // app/admin/pesv/auditorias/page.jsx
  // API: PATCH /api/admin/pesv/auditorias
  // ==========================================================

  async function guardarCierreAuditoria(
    event
  ) {
    event.preventDefault()

    if (
      !auditoriaSeleccionada
    ) {
      return
    }

    limpiarMensajes()

    if (
      !texto(
        formularioCierre.resultado_general
      )
    ) {
      setError(
        'Debe registrar el resultado general de la auditoría.'
      )

      return
    }

    if (
      !texto(
        formularioCierre.conclusion
      )
    ) {
      setError(
        'Debe registrar la conclusión de la auditoría.'
      )

      return
    }

    if (
      !formularioCierre.fecha_cierre
    ) {
      setError(
        'Debe indicar la fecha de cierre de la auditoría.'
      )

      return
    }

    setGuardando(
      true
    )

    try {
      await solicitarApi(
        'PATCH',
        {
          accion:
            'actualizar_auditoria',

          id:
            auditoriaSeleccionada.id,

          ...formularioCierre,

          estado:
            'CERRADA',
        }
      )

      mostrarExito(
        'Auditoría cerrada correctamente.'
      )

      setMostrarFormularioCierre(
        false
      )

      await cargarDatos()
    } catch (
      err
    ) {
      setError(
        err.message
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  // ==========================================================
  // ELIMINAR AUDITORÍA
  // app/admin/pesv/auditorias/page.jsx
  // API: DELETE /api/admin/pesv/auditorias
  // ==========================================================

  async function eliminarAuditoria(
    item
  ) {
    const confirmar =
      window.confirm(
        `¿Desea eliminar la auditoría ${item.codigo || ''}?`
      )

    if (
      !confirmar
    ) {
      return
    }

    limpiarMensajes()

    try {
      await solicitarApi(
        'DELETE',
        {
          accion:
            'eliminar_auditoria',

          id:
            item.id,
        }
      )

      if (
        Number(
          auditoriaSeleccionadaId
        ) ===
        Number(
          item.id
        )
      ) {
        setAuditoriaSeleccionadaId(
          null
        )
      }

      mostrarExito(
        'Auditoría eliminada correctamente.'
      )

      await cargarDatos()
    } catch (
      err
    ) {
      setError(
        err.message
      )
    }
  }


  // ==========================================================
  // NUEVO HALLAZGO
  // app/admin/pesv/auditorias/page.jsx
  // ==========================================================

  function nuevoHallazgo() {
    setHallazgoEditandoId(
      null
    )

    setFormularioHallazgo(
      formularioHallazgoInicial()
    )

    setMostrarFormularioHallazgo(
      true
    )
  }


  function editarHallazgo(
    item
  ) {
    setHallazgoEditandoId(
      item.id
    )

    setFormularioHallazgo({
      fecha_hallazgo:
        item.fecha_hallazgo ||
        hoy(),

      tipo_hallazgo:
        item.tipo_hallazgo ||
        'NO_CONFORMIDAD',

      requisito:
        item.requisito ||
        '',

      criterio:
        item.criterio ||
        '',

      proceso_area:
        item.proceso_area ||
        '',

      descripcion:
        item.descripcion ||
        '',

      evidencia:
        item.evidencia ||
        '',

      causa:
        item.causa ||
        '',

      consecuencia:
        item.consecuencia ||
        '',

      clasificacion:
        item.clasificacion ||
        '',

      prioridad:
        item.prioridad ||
        '',

      responsable_personal_id:
        item.responsable_personal_id ||
        '',

      responsable_nombre:
        item.responsable_nombre ||
        '',

      estado:
        item.estado ||
        'ABIERTO',

      fecha_cierre:
        item.fecha_cierre ||
        '',

      verificacion_cierre:
        item.verificacion_cierre ||
        '',
    })

    setMostrarFormularioHallazgo(
      true
    )
  }


  function cambiarResponsableHallazgo(
    valor
  ) {
    const id =
      valor
        ? Number(
            valor
          )
        : ''

    const persona =
      personal.find(
        item =>
          Number(
            item.id
          ) ===
          Number(
            id
          )
      )

    setFormularioHallazgo(
      anterior => ({
        ...anterior,

        responsable_personal_id:
          id,

        responsable_nombre:
          persona
            ?.nombre_completo ||
          '',
      })
    )
  }


  // ==========================================================
  // GUARDAR HALLAZGO
  // app/admin/pesv/auditorias/page.jsx
  // ==========================================================

  async function guardarHallazgo(
    event
  ) {
    event.preventDefault()

    if (
      !auditoriaSeleccionada
    ) {
      return
    }

    if (
      !texto(
        formularioHallazgo.descripcion
      )
    ) {
      setError(
        'Debe escribir la descripción del hallazgo.'
      )

      return
    }

    setGuardando(
      true
    )

    limpiarMensajes()

    try {
      if (
        hallazgoEditandoId
      ) {
        await solicitarApi(
          'PATCH',
          {
            accion:
              'actualizar_hallazgo',

            id:
              hallazgoEditandoId,

            ...formularioHallazgo,
          }
        )

        mostrarExito(
          'Hallazgo actualizado correctamente.'
        )
      } else {
        await solicitarApi(
          'POST',
          {
            accion:
              'crear_hallazgo',

            auditoria_id:
              auditoriaSeleccionada.id,

            ...formularioHallazgo,
          }
        )

        mostrarExito(
          'Hallazgo registrado correctamente.'
        )
      }

      setMostrarFormularioHallazgo(
        false
      )

      setHallazgoEditandoId(
        null
      )

      setFormularioHallazgo(
        formularioHallazgoInicial()
      )

      await cargarDatos()
    } catch (
      err
    ) {
      setError(
        err.message
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  async function eliminarHallazgo(
    item
  ) {
    if (
      !window.confirm(
        `¿Desea eliminar el hallazgo ${item.codigo || item.numero}?`
      )
    ) {
      return
    }

    limpiarMensajes()

    try {
      await solicitarApi(
        'DELETE',
        {
          accion:
            'eliminar_hallazgo',

          id:
            item.id,
        }
      )

      mostrarExito(
        'Hallazgo eliminado correctamente.'
      )

      await cargarDatos()
    } catch (
      err
    ) {
      setError(
        err.message
      )
    }
  }


  // ==========================================================
  // ACCIONES
  // app/admin/pesv/auditorias/page.jsx
  // ==========================================================

  function nuevaAccion(
    hallazgo
  ) {
    setHallazgoAccionId(
      hallazgo.id
    )

    setAccionEditandoId(
      null
    )

    setFormularioAccion(
      formularioAccionInicial()
    )
  }


  function editarAccion(
    accion
  ) {
    setHallazgoAccionId(
      accion.hallazgo_id
    )

    setAccionEditandoId(
      accion.id
    )

    setFormularioAccion({
      fecha_accion:
        accion.fecha_accion ||
        hoy(),

      tipo_accion:
        accion.tipo_accion ||
        'CORRECTIVA',

      descripcion:
        accion.descripcion ||
        '',

      evidencia_esperada:
        accion.evidencia_esperada ||
        '',

      responsable_personal_id:
        accion.responsable_personal_id ||
        '',

      responsable_nombre:
        accion.responsable_nombre ||
        '',

      responsable_cargo:
        accion.responsable_cargo ||
        '',

      fecha_compromiso:
        accion.fecha_compromiso ||
        '',

      fecha_implementacion:
        accion.fecha_implementacion ||
        '',

      estado:
        accion.estado ||
        'PENDIENTE',

      resultado:
        accion.resultado ||
        '',

      fecha_cierre:
        accion.fecha_cierre ||
        '',

      observaciones:
        accion.observaciones ||
        '',
    })
  }


  function cambiarResponsableAccion(
    valor
  ) {
    const id =
      valor
        ? Number(
            valor
          )
        : ''

    const persona =
      personal.find(
        item =>
          Number(
            item.id
          ) ===
          Number(
            id
          )
      )

    setFormularioAccion(
      anterior => ({
        ...anterior,

        responsable_personal_id:
          id,

        responsable_nombre:
          persona
            ?.nombre_completo ||
          '',
      })
    )
  }


  async function guardarAccion(
    event
  ) {
    event.preventDefault()

    if (
      !texto(
        formularioAccion.descripcion
      )
    ) {
      setError(
        'Debe escribir la descripción de la acción.'
      )

      return
    }

    setGuardando(
      true
    )

    limpiarMensajes()

    try {
      if (
        accionEditandoId
      ) {
        await solicitarApi(
          'PATCH',
          {
            accion:
              'actualizar_accion',

            id:
              accionEditandoId,

            ...formularioAccion,
          }
        )

        mostrarExito(
          'Acción actualizada correctamente.'
        )
      } else {
        await solicitarApi(
          'POST',
          {
            accion:
              'crear_accion',

            hallazgo_id:
              hallazgoAccionId,

            ...formularioAccion,
          }
        )

        mostrarExito(
          'Acción registrada correctamente.'
        )
      }

      setHallazgoAccionId(
        null
      )

      setAccionEditandoId(
        null
      )

      setFormularioAccion(
        formularioAccionInicial()
      )

      await cargarDatos()
    } catch (
      err
    ) {
      setError(
        err.message
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  async function eliminarAccion(
    item
  ) {
    if (
      !window.confirm(
        '¿Desea eliminar esta acción?'
      )
    ) {
      return
    }

    limpiarMensajes()

    try {
      await solicitarApi(
        'DELETE',
        {
          accion:
            'eliminar_accion',

          id:
            item.id,
        }
      )

      mostrarExito(
        'Acción eliminada correctamente.'
      )

      await cargarDatos()
    } catch (
      err
    ) {
      setError(
        err.message
      )
    }
  }


  // ==========================================================
  // SEGUIMIENTOS
  // app/admin/pesv/auditorias/page.jsx
  // ==========================================================

  function nuevoSeguimiento(
    accion
  ) {
    setAccionSeguimientoId(
      accion.id
    )

    setSeguimientoEditandoId(
      null
    )

    setFormularioSeguimiento(
      formularioSeguimientoInicial()
    )
  }


  function editarSeguimiento(
    seguimiento
  ) {
    setAccionSeguimientoId(
      seguimiento.accion_id
    )

    setSeguimientoEditandoId(
      seguimiento.id
    )

    setFormularioSeguimiento({
      fecha_seguimiento:
        seguimiento.fecha_seguimiento ||
        hoy(),

      descripcion:
        seguimiento.descripcion ||
        '',

      resultado:
        seguimiento.resultado ||
        '',

      avance_porcentaje:
        seguimiento.avance_porcentaje ??
        '',

      implementacion_verificada:
        Boolean(
          seguimiento.implementacion_verificada
        ),

      eficacia_verificada:
        Boolean(
          seguimiento.eficacia_verificada
        ),

      resultado_eficacia:
        seguimiento.resultado_eficacia ||
        '',

      responsable_personal_id:
        seguimiento.responsable_personal_id ||
        '',

      responsable_nombre:
        seguimiento.responsable_nombre ||
        '',

      requiere_nuevo_seguimiento:
        Boolean(
          seguimiento.requiere_nuevo_seguimiento
        ),

      fecha_proximo_seguimiento:
        seguimiento.fecha_proximo_seguimiento ||
        '',

      evidencia:
        seguimiento.evidencia ||
        '',

      observaciones:
        seguimiento.observaciones ||
        '',
    })
  }


  function cambiarResponsableSeguimiento(
    valor
  ) {
    const id =
      valor
        ? Number(
            valor
          )
        : ''

    const persona =
      personal.find(
        item =>
          Number(
            item.id
          ) ===
          Number(
            id
          )
      )

    setFormularioSeguimiento(
      anterior => ({
        ...anterior,

        responsable_personal_id:
          id,

        responsable_nombre:
          persona
            ?.nombre_completo ||
          '',
      })
    )
  }


  async function guardarSeguimiento(
    event
  ) {
    event.preventDefault()

    if (
      !texto(
        formularioSeguimiento.descripcion
      )
    ) {
      setError(
        'Debe escribir la descripción del seguimiento.'
      )

      return
    }

    setGuardando(
      true
    )

    limpiarMensajes()

    try {
      if (
        seguimientoEditandoId
      ) {
        await solicitarApi(
          'PATCH',
          {
            accion:
              'actualizar_seguimiento',

            id:
              seguimientoEditandoId,

            ...formularioSeguimiento,
          }
        )

        mostrarExito(
          'Seguimiento actualizado correctamente.'
        )
      } else {
        await solicitarApi(
          'POST',
          {
            accion:
              'crear_seguimiento',

            accion_id:
              accionSeguimientoId,

            ...formularioSeguimiento,
          }
        )

        mostrarExito(
          'Seguimiento registrado correctamente.'
        )
      }

      setAccionSeguimientoId(
        null
      )

      setSeguimientoEditandoId(
        null
      )

      setFormularioSeguimiento(
        formularioSeguimientoInicial()
      )

      await cargarDatos()
    } catch (
      err
    ) {
      setError(
        err.message
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  async function eliminarSeguimiento(
    item
  ) {
    if (
      !window.confirm(
        '¿Desea eliminar este seguimiento?'
      )
    ) {
      return
    }

    limpiarMensajes()

    try {
      await solicitarApi(
        'DELETE',
        {
          accion:
            'eliminar_seguimiento',

          id:
            item.id,
        }
      )

      mostrarExito(
        'Seguimiento eliminado correctamente.'
      )

      await cargarDatos()
    } catch (
      err
    ) {
      setError(
        err.message
      )
    }
  }


  // ==========================================================
  // INFORME PDF
  // app/admin/pesv/auditorias/page.jsx
  //
  // La ruta se construirá posteriormente.
  // ==========================================================

  function abrirInformePdf(
    item
  ) {
    router.push(
      `/admin/pesv/auditorias/imprimir/${item.id}?anio=${item.anio}`
    )
  }


  // ==========================================================
  // RENDER
  // app/admin/pesv/auditorias/page.jsx
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
          max-w-[1600px]
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
            ENCABEZADO
            app/admin/pesv/auditorias/page.jsx
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
          <div className="flex items-start gap-3">
            <i className="fas fa-clipboard-check text-2xl mt-1"></i>

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
                PESV · Auditorías / No Conformidades
              </h1>

              <p
                className="
                  text-[10px]
                  md:text-[11px]
                  text-slate-300
                  mt-0.5
                "
              >
                Gestión de auditorías, hallazgos, acciones, seguimientos y cierre del Plan Estratégico de Seguridad Vial
              </p>

              <div className="mt-1 text-[10px] text-slate-300">
                Usuario:{' '}
                <strong className="text-white">
                  {obtenerNombreUsuario(user)}
                </strong>

                <span className="mx-1.5 text-slate-500">·</span>

                CEA:{' '}
                <strong className="text-white">
                  {obtenerNombreEmpresa(user, empresa)}
                </strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/admin/pesv')}
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
              onClick={() => router.push('/admin')}
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
              onClick={() => cerrarSesion(router)}
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

        {/* ====================================================
            BARRA DE VIGENCIA
            app/admin/pesv/auditorias/page.jsx
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
            sm:items-center
            sm:justify-between
            gap-2
          "
        >
          <div className="text-[11px] text-gray-600">
            Vigencia de gestión de auditorías PESV
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[10px] font-bold uppercase text-gray-600">
              Año
            </label>

            <select
              value={anio}
              onChange={
                event => {
                  const nuevoAnio = Number(event.target.value)

                  setAnio(nuevoAnio)
                  setAuditoriaSeleccionadaId(null)
                  setFormularioAuditoria(
                    formularioAuditoriaInicial(nuevoAnio)
                  )
                }
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
                { length: 8 },
                (_, index) => anioActual - 3 + index
              ).map(
                item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={nuevaAuditoria}
              className="
                ml-0
                sm:ml-2
                bg-[var(--primary)]
                hover:bg-[var(--primary-dark)]
                text-white
                border
                border-blue-800
                rounded
                px-3
                py-1.5
                text-[10px]
                font-bold
                transition
              "
            >
              <i className="fas fa-plus mr-1.5"></i>
              Nueva auditoría
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">

        {/* ====================================================
            MENSAJES
        ==================================================== */}

        {mensaje && (
          <div
            className="
              rounded-xl
              border
              border-emerald-200
              bg-emerald-50
              px-4
              py-3
              text-xs
              font-semibold
              text-emerald-800
            "
          >
            {mensaje}
          </div>
        )}

        {error && (
          <div
            className="
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-xs
              font-semibold
              text-red-800
            "
          >
            {error}
          </div>
        )}


        {/* ====================================================
            RESUMEN
        ==================================================== */}

        <section
          className="
            grid
            grid-cols-2
            gap-2
            md:grid-cols-4
            xl:grid-cols-8
          "
        >
          {[
            [
              'Auditorías',
              resumen?.total ||
                0,
            ],
            [
              'Programadas',
              resumen?.programadas ||
                0,
            ],
            [
              'En proceso',
              resumen?.en_proceso ||
                0,
            ],
            [
              'Cerradas',
              resumen?.cerradas ||
                0,
            ],
            [
              'Hallazgos',
              resumen?.total_hallazgos ||
                0,
            ],
            [
              'No conformidades',
              resumen?.no_conformidades ||
                0,
            ],
            [
              'Mejoras',
              resumen?.oportunidades_mejora ||
                0,
            ],
            [
              'Acciones pendientes',
              resumen?.acciones_pendientes ||
                0,
            ],
          ].map(
            (
              [
                titulo,
                valor,
              ]
            ) => (
              <div
                key={
                  titulo
                }
                className="
                  rounded-xl
                  border
                  border-slate-400
                  bg-white
                  p-3
                  shadow-sm
                "
              >
                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    leading-tight
                    text-slate-500
                  "
                >
                  {titulo}
                </p>

                <p
                  className="
                    mt-2
                    text-xl
                    font-bold
                    text-slate-800
                  "
                >
                  {valor}
                </p>
              </div>
            )
          )}
        </section>


        {/* ====================================================
            FORMULARIO AUDITORÍA
            app/admin/pesv/auditorias/page.jsx
        ==================================================== */}

        {mostrarFormularioAuditoria && (
          <section
            id="formulario-auditoria-pesv"
            className="
              scroll-mt-4
              overflow-hidden
              rounded-2xl
              border
              border-slate-600
              bg-white
              shadow-sm
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                bg-slate-800
                px-4
                py-3
                text-white
              "
            >
              <h2
                className="
                  text-xs
                  font-bold
                  uppercase
                "
              >
                {auditoriaEditandoId
                  ? 'Editar datos de la auditoría'
                  : 'Programar nueva auditoría'}
              </h2>

              <button
                type="button"
                onClick={
                  () => {
                    setMostrarFormularioAuditoria(
                      false
                    )

                    setAuditoriaEditandoId(
                      null
                    )
                  }
                }
                className="
                  rounded
                  px-2
                  py-1
                  text-xs
                  hover:bg-slate-700
                "
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={
                guardarAuditoria
              }
              className="
                space-y-4
                p-4
              "
            >
              <div
                className="
                  rounded-xl
                  border
                  border-blue-200
                  bg-blue-50
                  px-4
                  py-3
                  text-[10px]
                  leading-relaxed
                  text-blue-800
                "
              >
                En esta etapa se registran únicamente los datos de
                programación y ejecución de la auditoría. El resultado,
                las conclusiones y el cierre se diligencian al final del
                flujo, después de gestionar los hallazgos, acciones y
                seguimientos.
              </div>

              <div
                className="
                  grid
                  gap-3
                  md:grid-cols-2
                  xl:grid-cols-4
                "
              >
                <Campo
                  label="Código"
                  value={
                    formularioAuditoria.codigo
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          codigo:
                            value,
                        })
                      )
                  }
                  placeholder="Automático si se deja vacío"
                />

                <Campo
                  label="Nombre de la auditoría *"
                  value={
                    formularioAuditoria.nombre
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          nombre:
                            value,
                        })
                      )
                  }
                />

                <SelectCampo
                  label="Tipo de auditoría"
                  value={
                    formularioAuditoria.tipo_auditoria
                  }
                  options={
                    TIPOS_AUDITORIA
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          tipo_auditoria:
                            value,
                        })
                      )
                  }
                />

                <SelectCampo
                  label="Estado"
                  value={
                    formularioAuditoria.estado
                  }
                  options={
                    ESTADOS_AUDITORIA
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          estado:
                            value,
                        })
                      )
                  }
                />

                <Campo
                  label="Fecha programada"
                  type="date"
                  value={
                    formularioAuditoria.fecha_programada
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          fecha_programada:
                            value,
                        })
                      )
                  }
                />

                <Campo
                  label="Fecha de ejecución"
                  type="date"
                  value={
                    formularioAuditoria.fecha_ejecucion
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          fecha_ejecucion:
                            value,
                        })
                      )
                  }
                />

                <Campo
                  label="Lugar"
                  value={
                    formularioAuditoria.lugar
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          lugar:
                            value,
                        })
                      )
                  }
                />

                <Campo
                  label="Proceso / área auditada"
                  value={
                    formularioAuditoria.area_proceso_auditado
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          area_proceso_auditado:
                            value,
                        })
                      )
                  }
                />
              </div>

              <div
                className="
                  grid
                  gap-3
                  lg:grid-cols-3
                "
              >
                <TextAreaCampo
                  label="Objetivo *"
                  value={
                    formularioAuditoria.objetivo
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          objetivo:
                            value,
                        })
                      )
                  }
                />

                <TextAreaCampo
                  label="Alcance *"
                  value={
                    formularioAuditoria.alcance
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          alcance:
                            value,
                        })
                      )
                  }
                />

                <TextAreaCampo
                  label="Criterios de auditoría"
                  value={
                    formularioAuditoria.criterios
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          criterios:
                            value,
                        })
                      )
                  }
                />
              </div>

              <div
                className="
                  grid
                  gap-3
                  md:grid-cols-2
                  xl:grid-cols-4
                "
              >
                <SelectCampo
                  label="Auditor desde personal"
                  value={
                    formularioAuditoria.auditor_personal_id
                  }
                  options={[
                    {
                      value:
                        '',
                      label:
                        'Seleccionar...',
                    },

                    ...personal.map(
                      persona => ({
                        value:
                          persona.id,

                        label:
                          persona.nombre_completo ||
                          persona.documento,
                      })
                    ),
                  ]}
                  onChange={
                    cambiarAuditorPersonal
                  }
                />

                <Campo
                  label="Nombre auditor"
                  value={
                    formularioAuditoria.auditor_nombre
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          auditor_nombre:
                            value,
                        })
                      )
                  }
                />

                <Campo
                  label="Cargo auditor"
                  value={
                    formularioAuditoria.auditor_cargo
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          auditor_cargo:
                            value,
                        })
                      )
                  }
                />

                <Campo
                  label="Correo auditor"
                  value={
                    formularioAuditoria.auditor_correo
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          auditor_correo:
                            value,
                        })
                      )
                  }
                />

                <SelectCampo
                  label="Responsable área"
                  value={
                    formularioAuditoria.responsable_area_personal_id
                  }
                  options={[
                    {
                      value:
                        '',
                      label:
                        'Seleccionar...',
                    },

                    ...personal.map(
                      persona => ({
                        value:
                          persona.id,

                        label:
                          persona.nombre_completo ||
                          persona.documento,
                      })
                    ),
                  ]}
                  onChange={
                    cambiarResponsableArea
                  }
                />

                <Campo
                  label="Nombre responsable área"
                  value={
                    formularioAuditoria.responsable_area_nombre
                  }
                  onChange={
                    value =>
                      setFormularioAuditoria(
                        anterior => ({
                          ...anterior,
                          responsable_area_nombre:
                            value,
                        })
                      )
                  }
                />

                <div
                  className="
                    md:col-span-2
                  "
                >
                  <TextAreaCampo
                    label="Metodología"
                    value={
                      formularioAuditoria.metodologia
                    }
                    onChange={
                      value =>
                        setFormularioAuditoria(
                          anterior => ({
                            ...anterior,
                            metodologia:
                              value,
                          })
                        )
                    }
                  />
                </div>
              </div>

              <div
                className="
                  flex
                  justify-end
                  gap-2
                  border-t
                  border-slate-200
                  pt-4
                "
              >
                <button
                  type="button"
                  onClick={
                    () =>
                      setMostrarFormularioAuditoria(
                        false
                      )
                  }
                  className="
                    rounded-lg
                    border
                    border-slate-300
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    text-slate-700
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
                    rounded-lg
                    bg-slate-800
                    px-5
                    py-2
                    text-xs
                    font-bold
                    text-white
                    disabled:opacity-50
                  "
                >
                  {guardando
                    ? 'Guardando...'
                    : auditoriaEditandoId
                      ? 'Actualizar datos'
                      : 'Guardar programación'}
                </button>
              </div>
            </form>
          </section>
        )}


        {/* ====================================================
            LISTADO AUDITORÍAS
        ==================================================== */}

        <section
          className="
            overflow-hidden
            rounded-2xl
            border
            border-slate-400
            bg-white
            shadow-sm
          "
        >
          <div
            className="
              border-b
              border-slate-300
              px-4
              py-3
            "
          >
            <h2
              className="
                text-xs
                font-bold
                uppercase
                text-slate-700
              "
            >
              Auditorías vigencia {anio}
            </h2>
          </div>

          {cargando ? (
            <div
              className="
                px-4
                py-10
                text-center
                text-xs
                text-slate-500
              "
            >
              Cargando auditorías...
            </div>
          ) : auditorias.length ===
            0 ? (
            <div
              className="
                px-4
                py-10
                text-center
              "
            >
              <p
                className="
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                No hay auditorías registradas para {anio}.
              </p>

              <button
                type="button"
                onClick={
                  nuevaAuditoria
                }
                className="
                  mt-3
                  rounded-lg
                  bg-slate-800
                  px-4
                  py-2
                  text-xs
                  font-bold
                  text-white
                "
              >
                Registrar primera auditoría
              </button>
            </div>
          ) : (
            <div
              className="
                overflow-x-auto
              "
            >
              <table
                className="
                  min-w-full
                  text-center
                  text-xs
                "
              >
                <thead
                  className="
                    bg-slate-50
                    text-[9px]
                    uppercase
                    text-slate-500
                  "
                >
                  <tr>
                    <th className="px-3 py-3">
                      Código
                    </th>

                    <th className="px-3 py-3">
                      Auditoría
                    </th>

                    <th className="px-3 py-3">
                      Tipo
                    </th>

                    <th className="px-3 py-3">
                      Fecha
                    </th>

                    <th className="px-3 py-3">
                      Estado
                    </th>

                    <th className="px-3 py-3 text-center">
                      Hallazgos
                    </th>

                    <th className="px-3 py-3 text-center">
                      NC
                    </th>

                    <th className="px-3 py-3 text-center">
                      Acc. pendientes
                    </th>

                    <th className="px-3 py-3 text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody
                  className="
                    divide-y
                    divide-slate-300
                  "
                >
                  {auditorias.map(
                    item => (
                      <tr
                        key={
                          item.id
                        }
                        className={
                          Number(
                            item.id
                          ) ===
                          Number(
                            auditoriaSeleccionadaId
                          )
                            ? 'bg-blue-50/60'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td
                          className="
                            whitespace-nowrap
                            px-3
                            py-3
                            font-bold
                            text-slate-800
                          "
                        >
                          {item.codigo}
                        </td>

                        <td
                          className="
                            min-w-[220px]
                            px-3
                            py-3
                          "
                        >
                          <p
                            className="
                              font-semibold
                              text-slate-800
                            "
                          >
                            {item.nombre ||
                              'Auditoría PESV'}
                          </p>

                          <p
                            className="
                              mt-1
                              text-[10px]
                              text-slate-500
                            "
                          >
                            {item.area_proceso_auditado ||
                              item.alcance ||
                              'Sin área definida'}
                          </p>
                        </td>

                        <td className="px-3 py-3">
                          {etiqueta(
                            item.tipo_auditoria
                          )}
                        </td>

                        <td
                          className="
                            whitespace-nowrap
                            px-3
                            py-3
                          "
                        >
                          {formatearFecha(
                            item.fecha_ejecucion ||
                            item.fecha_programada
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`
                              inline-flex
                              rounded-full
                              border
                              px-2
                              py-1
                              text-[9px]
                              font-bold
                              ${claseEstadoAuditoria(
                                item.estado
                              )}
                            `}
                          >
                            {etiqueta(
                              item.estado
                            )}
                          </span>
                        </td>

                        <td
                          className="
                            px-3
                            py-3
                            text-center
                            font-bold
                          "
                        >
                          {item.resumen
                            ?.total_hallazgos ||
                            0}
                        </td>

                        <td
                          className="
                            px-3
                            py-3
                            text-center
                            font-bold
                            text-red-700
                          "
                        >
                          {item.resumen
                            ?.no_conformidades ||
                            0}
                        </td>

                        <td
                          className="
                            px-3
                            py-3
                            text-center
                            font-bold
                            text-amber-700
                          "
                        >
                          {item.resumen
                            ?.acciones_pendientes ||
                            0}
                        </td>

                        <td
                          className="
                            whitespace-nowrap
                            px-3
                            py-3
                            text-right
                          "
                        >
                          <div
                            className="
                              flex
                              justify-end
                              gap-1
                            "
                          >
                            <button
                              type="button"
                              onClick={
                                () =>
                                  seleccionarAuditoria(
                                    item
                                  )
                              }
                              className="
                                rounded
                                border
                                border-slate-600
                                px-2
                                py-1
                                text-[10px]
                                font-semibold
                                text-slate-700
                              "
                            >
                              Gestionar
                            </button>

                            <button
                              type="button"
                              onClick={
                                () =>
                                  editarAuditoria(
                                    item
                                  )
                              }
                              className="
                                rounded
                                border
                                border-blue-300
                                px-2
                                py-1
                                text-[10px]
                                font-semibold
                                text-blue-700
                              "
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={
                                () =>
                                  abrirInformePdf(
                                    item
                                  )
                              }
                              className="
                                rounded
                                border
                                border-emerald-300
                                px-2
                                py-1
                                text-[10px]
                                font-semibold
                                text-emerald-700
                              "
                            >
                              Informe PDF
                            </button>

                            <button
                              type="button"
                              onClick={
                                () =>
                                  eliminarAuditoria(
                                    item
                                  )
                              }
                              className="
                                rounded
                                border
                                border-red-300
                                px-2
                                py-1
                                text-[10px]
                                font-semibold
                                text-red-700
                              "
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>


        {/* ====================================================
            DETALLE / GESTIÓN DE AUDITORÍA
        ==================================================== */}

        {auditoriaSeleccionada && (
          <section
            className="
              space-y-4
              rounded-2xl
              border
              border-slate-600
              bg-white
              p-4
              shadow-sm
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                border-b
                border-slate-200
                pb-4
                md:flex-row
                md:items-center
                md:justify-between
              "
            >
              <div>
                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    text-slate-500
                  "
                >
                  Auditoría seleccionada · Gestión del proceso
                </p>

                <h2
                  className="
                    mt-1
                    text-base
                    font-bold
                    text-slate-800
                  "
                >
                  {auditoriaSeleccionada.codigo}
                  {' · '}
                  {auditoriaSeleccionada.nombre}
                </h2>
              </div>

              <div
                className="
                  flex
                  flex-wrap
                  gap-2
                "
              >
                <button
                  type="button"
                  onClick={
                    nuevoHallazgo
                  }
                  className="
                    rounded-lg
                    bg-slate-800
                    px-4
                    py-2
                    text-xs
                    font-bold
                    text-white
                  "
                >
                  + Registrar hallazgo
                </button>

                <button
                  type="button"
                  onClick={
                    () =>
                      abrirInformePdf(
                        auditoriaSeleccionada
                      )
                  }
                  className="
                    rounded-lg
                    border
                    border-emerald-500
                    px-4
                    py-2
                    text-xs
                    font-bold
                    text-emerald-700
                  "
                >
                  Informe PDF
                </button>

                <button
                  type="button"
                  onClick={
                    () => {
                      setAuditoriaSeleccionadaId(
                        null
                      )

                      setMostrarFormularioCierre(
                        false
                      )
                    }
                  }
                  className="
                    rounded-lg
                    border
                    border-slate-500
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    text-slate-700
                  "
                >
                  Cerrar detalle
                </button>
              </div>
            </div>


            {/* ================================================
                FORMULARIO HALLAZGO
            ================================================ */}

            {mostrarFormularioHallazgo && (
              <form
                onSubmit={
                  guardarHallazgo
                }
                className="
                  rounded-xl
                  border
                  border-slate-500
                  bg-slate-50
                  p-4
                "
              >
                <div
                  className="
                    mb-4
                    flex
                    items-center
                    justify-between
                  "
                >
                  <h3
                    className="
                      text-xs
                      font-bold
                      uppercase
                      text-slate-700
                    "
                  >
                    {hallazgoEditandoId
                      ? 'Editar hallazgo'
                      : 'Nuevo hallazgo'}
                  </h3>

                  <button
                    type="button"
                    onClick={
                      () => {
                        setMostrarFormularioHallazgo(
                          false
                        )

                        setHallazgoEditandoId(
                          null
                        )
                      }
                    }
                    className="
                      text-xs
                      font-semibold
                      text-slate-500
                    "
                  >
                    Cerrar
                  </button>
                </div>

                <div
                  className="
                    grid
                    gap-3
                    md:grid-cols-2
                    xl:grid-cols-4
                  "
                >
                  <Campo
                    label="Fecha"
                    type="date"
                    value={
                      formularioHallazgo.fecha_hallazgo
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            fecha_hallazgo:
                              value,
                          })
                        )
                    }
                  />

                  <SelectCampo
                    label="Tipo de hallazgo"
                    value={
                      formularioHallazgo.tipo_hallazgo
                    }
                    options={
                      TIPOS_HALLAZGO
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            tipo_hallazgo:
                              value,
                          })
                        )
                    }
                  />

                  <SelectCampo
                    label="Clasificación"
                    value={
                      formularioHallazgo.clasificacion
                    }
                    options={
                      CLASIFICACIONES_HALLAZGO
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            clasificacion:
                              value,
                          })
                        )
                    }
                  />

                  <SelectCampo
                    label="Prioridad"
                    value={
                      formularioHallazgo.prioridad
                    }
                    options={
                      PRIORIDADES_HALLAZGO
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            prioridad:
                              value,
                          })
                        )
                    }
                  />

                  <Campo
                    label="Requisito"
                    value={
                      formularioHallazgo.requisito
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            requisito:
                              value,
                          })
                        )
                    }
                  />

                  <Campo
                    label="Criterio"
                    value={
                      formularioHallazgo.criterio
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            criterio:
                              value,
                          })
                        )
                    }
                  />

                  <Campo
                    label="Proceso / área"
                    value={
                      formularioHallazgo.proceso_area
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            proceso_area:
                              value,
                          })
                        )
                    }
                  />

                  <SelectCampo
                    label="Estado"
                    value={
                      formularioHallazgo.estado
                    }
                    options={
                      ESTADOS_HALLAZGO
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            estado:
                              value,
                          })
                        )
                    }
                  />
                </div>

                <div
                  className="
                    mt-3
                    grid
                    gap-3
                    lg:grid-cols-2
                  "
                >
                  <TextAreaCampo
                    label="Descripción del hallazgo *"
                    value={
                      formularioHallazgo.descripcion
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            descripcion:
                              value,
                          })
                        )
                    }
                  />

                  <TextAreaCampo
                    label="Evidencia"
                    value={
                      formularioHallazgo.evidencia
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            evidencia:
                              value,
                          })
                        )
                    }
                  />

                  <TextAreaCampo
                    label="Análisis / causa"
                    value={
                      formularioHallazgo.causa
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            causa:
                              value,
                          })
                        )
                    }
                  />

                  <TextAreaCampo
                    label="Consecuencia"
                    value={
                      formularioHallazgo.consecuencia
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            consecuencia:
                              value,
                          })
                        )
                    }
                  />
                </div>

                <div
                  className="
                    mt-3
                    grid
                    gap-3
                    md:grid-cols-3
                  "
                >
                  <SelectCampo
                    label="Responsable"
                    value={
                      formularioHallazgo.responsable_personal_id
                    }
                    options={[
                      {
                        value:
                          '',
                        label:
                          'Seleccionar...',
                      },

                      ...personal.map(
                        persona => ({
                          value:
                            persona.id,

                          label:
                            persona.nombre_completo ||
                            persona.documento,
                        })
                      ),
                    ]}
                    onChange={
                      cambiarResponsableHallazgo
                    }
                  />

                  <Campo
                    label="Nombre responsable"
                    value={
                      formularioHallazgo.responsable_nombre
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            responsable_nombre:
                              value,
                          })
                        )
                    }
                  />

                  <Campo
                    label="Fecha cierre"
                    type="date"
                    value={
                      formularioHallazgo.fecha_cierre
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            fecha_cierre:
                              value,
                          })
                        )
                    }
                  />
                </div>

                <div
                  className="
                    mt-3
                  "
                >
                  <TextAreaCampo
                    label="Verificación de cierre"
                    value={
                      formularioHallazgo.verificacion_cierre
                    }
                    onChange={
                      value =>
                        setFormularioHallazgo(
                          anterior => ({
                            ...anterior,
                            verificacion_cierre:
                              value,
                          })
                        )
                    }
                  />
                </div>

                <div
                  className="
                    mt-4
                    flex
                    justify-end
                    gap-2
                  "
                >
                  <button
                    type="button"
                    onClick={
                      () =>
                        setMostrarFormularioHallazgo(
                          false
                        )
                    }
                    className="
                      rounded-lg
                      border
                      border-slate-500
                      px-4
                      py-2
                      text-xs
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
                      rounded-lg
                      bg-slate-800
                      px-4
                      py-2
                      text-xs
                      font-bold
                      text-white
                    "
                  >
                    Guardar hallazgo
                  </button>
                </div>
              </form>
            )}


            {/* ================================================
                LISTADO HALLAZGOS
            ================================================ */}

            <div
              className="
                space-y-3
              "
            >
              {(
                auditoriaSeleccionada.hallazgos ||
                []
              ).length ===
              0 ? (
                <div
                  className="
                    rounded-xl
                    border
                    border-dashed
                    border-slate-500
                    px-4
                    py-8
                    text-center
                    text-xs
                    text-slate-500
                  "
                >
                  Esta auditoría todavía no tiene hallazgos registrados.
                </div>
              ) : (
                auditoriaSeleccionada.hallazgos.map(
                  hallazgo => (
                    <div
                      key={
                        hallazgo.id
                      }
                      className="
                        overflow-hidden
                        rounded-xl
                        border
                        border-slate-500
                      "
                    >
                      <div
                        className="
                          bg-slate-50
                          px-4
                          py-3
                        "
                      >
                        <div
                          className="
                            flex
                            flex-col
                            gap-3
                            md:flex-row
                            md:items-start
                            md:justify-between
                          "
                        >
                          <div>
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
                                  text-xs
                                  font-bold
                                  text-slate-800
                                "
                              >
                                {hallazgo.codigo ||
                                  `Hallazgo ${hallazgo.numero}`}
                              </span>

                              <span
                                className={`
                                  rounded-full
                                  border
                                  px-2
                                  py-1
                                  text-[9px]
                                  font-bold
                                  ${claseTipoHallazgo(
                                    hallazgo.tipo_hallazgo
                                  )}
                                `}
                              >
                                {etiqueta(
                                  hallazgo.tipo_hallazgo
                                )}
                              </span>

                              <span
                                className="
                                  rounded-full
                                  border
                                  border-slate-300
                                  bg-white
                                  px-2
                                  py-1
                                  text-[9px]
                                  font-semibold
                                  text-slate-600
                                "
                              >
                                {etiqueta(
                                  hallazgo.estado
                                )}
                              </span>
                            </div>

                            <p
                              className="
                                mt-2
                                max-w-4xl
                                text-xs
                                leading-relaxed
                                text-slate-700
                              "
                            >
                              {hallazgo.descripcion}
                            </p>

                            {(hallazgo.requisito ||
                              hallazgo.criterio) && (
                              <p
                                className="
                                  mt-1
                                  text-[10px]
                                  text-slate-500
                                "
                              >
                                Requisito / criterio:{' '}
                                {hallazgo.requisito ||
                                  hallazgo.criterio}
                              </p>
                            )}
                          </div>

                          <div
                            className="
                              flex
                              flex-wrap
                              gap-1
                            "
                          >
                            <button
                              type="button"
                              onClick={
                                () =>
                                  editarHallazgo(
                                    hallazgo
                                  )
                              }
                              className="
                                rounded
                                border
                                border-blue-400
                                px-2
                                py-1
                                text-[10px]
                                font-semibold
                                text-blue-700
                              "
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={
                                () =>
                                  nuevaAccion(
                                    hallazgo
                                  )
                              }
                              className="
                                rounded
                                border
                                border-emerald-400
                                px-2
                                py-1
                                text-[10px]
                                font-semibold
                                text-emerald-700
                              "
                            >
                              + Acción
                            </button>

                            <button
                              type="button"
                              onClick={
                                () =>
                                  eliminarHallazgo(
                                    hallazgo
                                  )
                              }
                              className="
                                rounded
                                border
                                border-red-400
                                px-2
                                py-1
                                text-[10px]
                                font-semibold
                                text-red-700
                              "
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>


                      {/* ======================================
                          FORMULARIO ACCIÓN
                      ====================================== */}

                      {Number(
                        hallazgoAccionId
                      ) ===
                        Number(
                          hallazgo.id
                        ) && (
                        <form
                          onSubmit={
                            guardarAccion
                          }
                          className="
                            border-t
                            border-slate-400
                            bg-emerald-50/30
                            p-4
                          "
                        >
                          <h4
                            className="
                              mb-3
                              text-[10px]
                              font-bold
                              uppercase
                              text-slate-700
                            "
                          >
                            {accionEditandoId
                              ? 'Editar acción'
                              : 'Nueva acción'}
                          </h4>

                          <div
                            className="
                              grid
                              gap-3
                              md:grid-cols-2
                              xl:grid-cols-4
                            "
                          >
                            <Campo
                              label="Fecha acción"
                              type="date"
                              value={
                                formularioAccion.fecha_accion
                              }
                              onChange={
                                value =>
                                  setFormularioAccion(
                                    anterior => ({
                                      ...anterior,
                                      fecha_accion:
                                        value,
                                    })
                                  )
                              }
                            />

                            <SelectCampo
                              label="Tipo"
                              value={
                                formularioAccion.tipo_accion
                              }
                              options={
                                TIPOS_ACCION
                              }
                              onChange={
                                value =>
                                  setFormularioAccion(
                                    anterior => ({
                                      ...anterior,
                                      tipo_accion:
                                        value,
                                    })
                                  )
                              }
                            />

                            <SelectCampo
                              label="Estado"
                              value={
                                formularioAccion.estado
                              }
                              options={
                                ESTADOS_ACCION
                              }
                              onChange={
                                value =>
                                  setFormularioAccion(
                                    anterior => ({
                                      ...anterior,
                                      estado:
                                        value,
                                    })
                                  )
                              }
                            />

                            <Campo
                              label="Fecha compromiso"
                              type="date"
                              value={
                                formularioAccion.fecha_compromiso
                              }
                              onChange={
                                value =>
                                  setFormularioAccion(
                                    anterior => ({
                                      ...anterior,
                                      fecha_compromiso:
                                        value,
                                    })
                                  )
                              }
                            />
                          </div>

                          <div
                            className="
                              mt-3
                              grid
                              gap-3
                              lg:grid-cols-2
                            "
                          >
                            <TextAreaCampo
                              label="Descripción de la acción *"
                              value={
                                formularioAccion.descripcion
                              }
                              onChange={
                                value =>
                                  setFormularioAccion(
                                    anterior => ({
                                      ...anterior,
                                      descripcion:
                                        value,
                                    })
                                  )
                              }
                            />

                            <TextAreaCampo
                              label="Evidencia esperada"
                              value={
                                formularioAccion.evidencia_esperada
                              }
                              onChange={
                                value =>
                                  setFormularioAccion(
                                    anterior => ({
                                      ...anterior,
                                      evidencia_esperada:
                                        value,
                                    })
                                  )
                              }
                            />
                          </div>

                          <div
                            className="
                              mt-3
                              grid
                              gap-3
                              md:grid-cols-2
                              xl:grid-cols-4
                            "
                          >
                            <SelectCampo
                              label="Responsable"
                              value={
                                formularioAccion.responsable_personal_id
                              }
                              options={[
                                {
                                  value:
                                    '',
                                  label:
                                    'Seleccionar...',
                                },

                                ...personal.map(
                                  persona => ({
                                    value:
                                      persona.id,

                                    label:
                                      persona.nombre_completo ||
                                      persona.documento,
                                  })
                                ),
                              ]}
                              onChange={
                                cambiarResponsableAccion
                              }
                            />

                            <Campo
                              label="Nombre responsable"
                              value={
                                formularioAccion.responsable_nombre
                              }
                              onChange={
                                value =>
                                  setFormularioAccion(
                                    anterior => ({
                                      ...anterior,
                                      responsable_nombre:
                                        value,
                                    })
                                  )
                              }
                            />

                            <Campo
                              label="Fecha implementación"
                              type="date"
                              value={
                                formularioAccion.fecha_implementacion
                              }
                              onChange={
                                value =>
                                  setFormularioAccion(
                                    anterior => ({
                                      ...anterior,
                                      fecha_implementacion:
                                        value,
                                    })
                                  )
                              }
                            />

                            <Campo
                              label="Fecha cierre"
                              type="date"
                              value={
                                formularioAccion.fecha_cierre
                              }
                              onChange={
                                value =>
                                  setFormularioAccion(
                                    anterior => ({
                                      ...anterior,
                                      fecha_cierre:
                                        value,
                                    })
                                  )
                              }
                            />
                          </div>

                          <div
                            className="
                              mt-3
                              grid
                              gap-3
                              lg:grid-cols-2
                            "
                          >
                            <TextAreaCampo
                              label="Resultado"
                              value={
                                formularioAccion.resultado
                              }
                              onChange={
                                value =>
                                  setFormularioAccion(
                                    anterior => ({
                                      ...anterior,
                                      resultado:
                                        value,
                                    })
                                  )
                              }
                            />

                            <TextAreaCampo
                              label="Observaciones"
                              value={
                                formularioAccion.observaciones
                              }
                              onChange={
                                value =>
                                  setFormularioAccion(
                                    anterior => ({
                                      ...anterior,
                                      observaciones:
                                        value,
                                    })
                                  )
                              }
                            />
                          </div>

                          <div
                            className="
                              mt-3
                              flex
                              justify-end
                              gap-2
                            "
                          >
                            <button
                              type="button"
                              onClick={
                                () => {
                                  setHallazgoAccionId(
                                    null
                                  )

                                  setAccionEditandoId(
                                    null
                                  )
                                }
                              }
                              className="
                                rounded-lg
                                border
                                border-slate-500
                                px-3
                                py-2
                                text-xs
                              "
                            >
                              Cancelar
                            </button>

                            <button
                              type="submit"
                              className="
                                rounded-lg
                                bg-emerald-700
                                px-4
                                py-2
                                text-xs
                                font-bold
                                text-white
                              "
                            >
                              Guardar acción
                            </button>
                          </div>
                        </form>
                      )}


                      {/* ======================================
                          ACCIONES DEL HALLAZGO
                      ====================================== */}

                      <div
                        className="
                          space-y-2
                          border-t
                          border-slate-400
                          p-4
                        "
                      >
                        <p
                          className="
                            text-[9px]
                            font-bold
                            uppercase
                            text-slate-500
                          "
                        >
                          Acciones
                        </p>

                        {(hallazgo.acciones ||
                          []).length ===
                        0 ? (
                          <p
                            className="
                              text-xs
                              text-slate-400
                            "
                          >
                            No hay acciones registradas.
                          </p>
                        ) : (
                          hallazgo.acciones.map(
                            accionItem => (
                              <div
                                key={
                                  accionItem.id
                                }
                                className="
                                  rounded-lg
                                  border
                                  border-slate-400
                                  bg-white
                                  p-3
                                "
                              >
                                <div
                                  className="
                                    flex
                                    flex-col
                                    gap-2
                                    md:flex-row
                                    md:items-start
                                    md:justify-between
                                  "
                                >
                                  <div>
                                    <p
                                      className="
                                        text-xs
                                        font-semibold
                                        text-slate-800
                                      "
                                    >
                                      Acción {accionItem.numero}
                                      {' · '}
                                      {etiqueta(
                                        accionItem.tipo_accion
                                      )}
                                    </p>

                                    <p
                                      className="
                                        mt-1
                                        text-xs
                                        text-slate-600
                                      "
                                    >
                                      {accionItem.descripcion}
                                    </p>

                                    <p
                                      className="
                                        mt-1
                                        text-[10px]
                                        text-slate-500
                                      "
                                    >
                                      Estado:{' '}
                                      {etiqueta(
                                        accionItem.estado
                                      )}
                                      {' · '}
                                      Responsable:{' '}
                                      {accionItem.responsable_nombre ||
                                        'Sin asignar'}
                                      {' · '}
                                      Compromiso:{' '}
                                      {formatearFecha(
                                        accionItem.fecha_compromiso
                                      )}
                                    </p>
                                  </div>

                                  <div
                                    className="
                                      flex
                                      flex-wrap
                                      gap-1
                                    "
                                  >
                                    <button
                                      type="button"
                                      onClick={
                                        () =>
                                          editarAccion(
                                            accionItem
                                          )
                                      }
                                      className="
                                        rounded
                                        border
                                        border-blue-400
                                        px-2
                                        py-1
                                        text-[10px]
                                        text-blue-700
                                      "
                                    >
                                      Editar
                                    </button>

                                    <button
                                      type="button"
                                      onClick={
                                        () =>
                                          nuevoSeguimiento(
                                            accionItem
                                          )
                                      }
                                      className="
                                        rounded
                                        border
                                        border-violet-400
                                        px-2
                                        py-1
                                        text-[10px]
                                        text-violet-700
                                      "
                                    >
                                      + Seguimiento
                                    </button>

                                    <button
                                      type="button"
                                      onClick={
                                        () =>
                                          eliminarAccion(
                                            accionItem
                                          )
                                      }
                                      className="
                                        rounded
                                        border
                                        border-red-400
                                        px-2
                                        py-1
                                        text-[10px]
                                        text-red-700
                                      "
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>


                                {/* ============================
                                    FORMULARIO SEGUIMIENTO
                                ============================ */}

                                {Number(
                                  accionSeguimientoId
                                ) ===
                                  Number(
                                    accionItem.id
                                  ) && (
                                  <form
                                    onSubmit={
                                      guardarSeguimiento
                                    }
                                    className="
                                      mt-3
                                      rounded-lg
                                      border
                                      border-violet-400
                                      bg-violet-50/40
                                      p-3
                                    "
                                  >
                                    <p
                                      className="
                                        mb-3
                                        text-[9px]
                                        font-bold
                                        uppercase
                                        text-violet-800
                                      "
                                    >
                                      {seguimientoEditandoId
                                        ? 'Editar seguimiento'
                                        : 'Nuevo seguimiento'}
                                    </p>

                                    <div
                                      className="
                                        grid
                                        gap-3
                                        md:grid-cols-2
                                        xl:grid-cols-4
                                      "
                                    >
                                      <Campo
                                        label="Fecha"
                                        type="date"
                                        value={
                                          formularioSeguimiento.fecha_seguimiento
                                        }
                                        onChange={
                                          value =>
                                            setFormularioSeguimiento(
                                              anterior => ({
                                                ...anterior,
                                                fecha_seguimiento:
                                                  value,
                                              })
                                            )
                                        }
                                      />

                                      <Campo
                                        label="Avance %"
                                        type="number"
                                        value={
                                          formularioSeguimiento.avance_porcentaje
                                        }
                                        onChange={
                                          value =>
                                            setFormularioSeguimiento(
                                              anterior => ({
                                                ...anterior,
                                                avance_porcentaje:
                                                  value,
                                              })
                                            )
                                        }
                                      />

                                      <SelectCampo
                                        label="Responsable"
                                        value={
                                          formularioSeguimiento.responsable_personal_id
                                        }
                                        options={[
                                          {
                                            value:
                                              '',
                                            label:
                                              'Seleccionar...',
                                          },

                                          ...personal.map(
                                            persona => ({
                                              value:
                                                persona.id,

                                              label:
                                                persona.nombre_completo ||
                                                persona.documento,
                                            })
                                          ),
                                        ]}
                                        onChange={
                                          cambiarResponsableSeguimiento
                                        }
                                      />

                                      <Campo
                                        label="Próximo seguimiento"
                                        type="date"
                                        value={
                                          formularioSeguimiento.fecha_proximo_seguimiento
                                        }
                                        onChange={
                                          value =>
                                            setFormularioSeguimiento(
                                              anterior => ({
                                                ...anterior,
                                                fecha_proximo_seguimiento:
                                                  value,
                                              })
                                            )
                                        }
                                      />
                                    </div>

                                    <div
                                      className="
                                        mt-3
                                        grid
                                        gap-3
                                        lg:grid-cols-2
                                      "
                                    >
                                      <TextAreaCampo
                                        label="Descripción *"
                                        value={
                                          formularioSeguimiento.descripcion
                                        }
                                        onChange={
                                          value =>
                                            setFormularioSeguimiento(
                                              anterior => ({
                                                ...anterior,
                                                descripcion:
                                                  value,
                                              })
                                            )
                                        }
                                      />

                                      <TextAreaCampo
                                        label="Resultado"
                                        value={
                                          formularioSeguimiento.resultado
                                        }
                                        onChange={
                                          value =>
                                            setFormularioSeguimiento(
                                              anterior => ({
                                                ...anterior,
                                                resultado:
                                                  value,
                                              })
                                            )
                                        }
                                      />

                                      <TextAreaCampo
                                        label="Resultado de eficacia"
                                        value={
                                          formularioSeguimiento.resultado_eficacia
                                        }
                                        onChange={
                                          value =>
                                            setFormularioSeguimiento(
                                              anterior => ({
                                                ...anterior,
                                                resultado_eficacia:
                                                  value,
                                              })
                                            )
                                        }
                                      />

                                      <TextAreaCampo
                                        label="Evidencia / observaciones"
                                        value={
                                          formularioSeguimiento.evidencia
                                        }
                                        onChange={
                                          value =>
                                            setFormularioSeguimiento(
                                              anterior => ({
                                                ...anterior,
                                                evidencia:
                                                  value,
                                              })
                                            )
                                        }
                                      />
                                    </div>

                                    <div
                                      className="
                                        mt-3
                                        flex
                                        flex-wrap
                                        gap-4
                                      "
                                    >
                                      <CheckCampo
                                        label="Implementación verificada"
                                        checked={
                                          formularioSeguimiento.implementacion_verificada
                                        }
                                        onChange={
                                          value =>
                                            setFormularioSeguimiento(
                                              anterior => ({
                                                ...anterior,
                                                implementacion_verificada:
                                                  value,
                                              })
                                            )
                                        }
                                      />

                                      <CheckCampo
                                        label="Eficacia verificada"
                                        checked={
                                          formularioSeguimiento.eficacia_verificada
                                        }
                                        onChange={
                                          value =>
                                            setFormularioSeguimiento(
                                              anterior => ({
                                                ...anterior,
                                                eficacia_verificada:
                                                  value,
                                              })
                                            )
                                        }
                                      />

                                      <CheckCampo
                                        label="Requiere nuevo seguimiento"
                                        checked={
                                          formularioSeguimiento.requiere_nuevo_seguimiento
                                        }
                                        onChange={
                                          value =>
                                            setFormularioSeguimiento(
                                              anterior => ({
                                                ...anterior,
                                                requiere_nuevo_seguimiento:
                                                  value,
                                              })
                                            )
                                        }
                                      />
                                    </div>

                                    <div
                                      className="
                                        mt-3
                                        flex
                                        justify-end
                                        gap-2
                                      "
                                    >
                                      <button
                                        type="button"
                                        onClick={
                                          () => {
                                            setAccionSeguimientoId(
                                              null
                                            )

                                            setSeguimientoEditandoId(
                                              null
                                            )
                                          }
                                        }
                                        className="
                                          rounded
                                          border
                                          border-slate-400
                                          px-3
                                          py-2
                                          text-xs
                                        "
                                      >
                                        Cancelar
                                      </button>

                                      <button
                                        type="submit"
                                        className="
                                          rounded
                                          bg-violet-700
                                          px-4
                                          py-2
                                          text-xs
                                          font-bold
                                          text-white
                                        "
                                      >
                                        Guardar seguimiento
                                      </button>
                                    </div>
                                  </form>
                                )}


                                {/* ============================
                                    HISTORIAL SEGUIMIENTOS
                                ============================ */}

                                {(accionItem.seguimientos ||
                                  []).length >
                                  0 && (
                                  <div
                                    className="
                                      mt-3
                                      space-y-2
                                      border-t
                                      border-slate-400
                                      pt-3
                                    "
                                  >
                                    <p
                                      className="
                                        text-[9px]
                                        font-bold
                                        uppercase
                                        text-slate-500
                                      "
                                    >
                                      Seguimientos
                                    </p>

                                    {accionItem.seguimientos.map(
                                      seguimiento => (
                                        <div
                                          key={
                                            seguimiento.id
                                          }
                                          className="
                                            flex
                                            flex-col
                                            gap-2
                                            rounded-lg
                                            bg-slate-50
                                            p-2
                                            md:flex-row
                                            md:items-start
                                            md:justify-between
                                          "
                                        >
                                          <div>
                                            <p
                                              className="
                                                text-[10px]
                                                font-bold
                                                text-slate-700
                                              "
                                            >
                                              Seguimiento {seguimiento.numero}
                                              {' · '}
                                              {formatearFecha(
                                                seguimiento.fecha_seguimiento
                                              )}
                                              {seguimiento.avance_porcentaje !==
                                                null &&
                                                seguimiento.avance_porcentaje !==
                                                  undefined && (
                                                  <>
                                                    {' · '}
                                                    Avance:{' '}
                                                    {seguimiento.avance_porcentaje}%
                                                  </>
                                                )}
                                            </p>

                                            <p
                                              className="
                                                mt-1
                                                text-xs
                                                text-slate-600
                                              "
                                            >
                                              {seguimiento.descripcion}
                                            </p>
                                          </div>

                                          <div
                                            className="
                                              flex
                                              gap-1
                                            "
                                          >
                                            <button
                                              type="button"
                                              onClick={
                                                () =>
                                                  editarSeguimiento(
                                                    seguimiento
                                                  )
                                              }
                                              className="
                                                rounded
                                                border
                                                border-blue-300
                                                px-2
                                                py-1
                                                text-[9px]
                                                text-blue-700
                                              "
                                            >
                                              Editar
                                            </button>

                                            <button
                                              type="button"
                                              onClick={
                                                () =>
                                                  eliminarSeguimiento(
                                                    seguimiento
                                                  )
                                              }
                                              className="
                                                rounded
                                                border
                                                border-red-300
                                                px-2
                                                py-1
                                                text-[9px]
                                                text-red-700
                                              "
                                            >
                                              Eliminar
                                            </button>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          )
                        )}
                      </div>
                    </div>
                  )
                )
              )}
            </div>


            {/* ================================================
                CIERRE DE LA AUDITORÍA
                app/admin/pesv/auditorias/page.jsx

                Este bloque queda al final del flujo:
                Auditoría → Hallazgos → Acciones → Seguimientos
                → Cierre.
            ================================================ */}

            <div
              className="
                scroll-mt-4
                rounded-xl
                border
                border-slate-500
                bg-slate-50
                p-4
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  md:flex-row
                  md:items-center
                  md:justify-between
                "
              >
                <div>
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-wide
                      text-slate-500
                    "
                  >
                    Etapa final
                  </p>

                  <h3
                    className="
                      mt-1
                      text-sm
                      font-bold
                      text-slate-800
                    "
                  >
                    Cierre de la auditoría
                  </h3>

                  <p
                    className="
                      mt-1
                      max-w-4xl
                      text-[10px]
                      leading-relaxed
                      text-slate-600
                    "
                  >
                    Registre aquí el resultado general, fortalezas,
                    oportunidades de mejora, conclusión y fecha de cierre
                    una vez finalizada la gestión de la auditoría.
                  </p>
                </div>

                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                  "
                >
                  {(auditoriaSeleccionada.resultado_general ||
                    auditoriaSeleccionada.conclusion ||
                    auditoriaSeleccionada.fecha_cierre) && (
                    <span
                      className="
                        rounded-full
                        border
                        border-emerald-600
                        bg-emerald-50
                        px-3
                        py-1
                        text-[9px]
                        font-bold
                        text-emerald-700
                      "
                    >
                      Cierre registrado
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={
                      abrirCierreAuditoria
                    }
                    className="
                      rounded-lg
                      bg-slate-800
                      px-4
                      py-2
                      text-xs
                      font-bold
                      text-white
                    "
                  >
                    {auditoriaSeleccionada.resultado_general ||
                    auditoriaSeleccionada.conclusion ||
                    auditoriaSeleccionada.fecha_cierre
                      ? 'Ver / editar cierre'
                      : 'Registrar cierre'}
                  </button>
                </div>
              </div>

              {mostrarFormularioCierre && (
                <form
                  id="formulario-cierre-auditoria-pesv"
                  onSubmit={
                    guardarCierreAuditoria
                  }
                  className="
                    mt-4
                    space-y-4
                    border-t
                    border-slate-200
                    pt-4
                  "
                >
                  <div
                    className="
                      grid
                      gap-3
                      md:grid-cols-2
                    "
                  >
                    <Campo
                      label="Fecha de cierre *"
                      type="date"
                      value={
                        formularioCierre.fecha_cierre
                      }
                      onChange={
                        value =>
                          setFormularioCierre(
                            anterior => ({
                              ...anterior,
                              fecha_cierre:
                                value,
                            })
                          )
                      }
                    />

                    <div
                      className="
                        rounded-lg
                        border
                        border-emerald-300
                        bg-emerald-50
                        px-3
                        py-2
                        text-[10px]
                        leading-relaxed
                        text-emerald-800
                      "
                    >
                      Al guardar este formulario, la auditoría quedará
                      formalmente en estado Cerrada.
                    </div>
                  </div>

                  <div
                    className="
                      grid
                      gap-3
                      lg:grid-cols-2
                    "
                  >
                    <TextAreaCampo
                      label="Resultado general *"
                      value={
                        formularioCierre.resultado_general
                      }
                      onChange={
                        value =>
                          setFormularioCierre(
                            anterior => ({
                              ...anterior,
                              resultado_general:
                                value,
                            })
                          )
                      }
                    />

                    <TextAreaCampo
                      label="Fortalezas generales"
                      value={
                        formularioCierre.fortalezas_generales
                      }
                      onChange={
                        value =>
                          setFormularioCierre(
                            anterior => ({
                              ...anterior,
                              fortalezas_generales:
                                value,
                            })
                          )
                      }
                    />

                    <TextAreaCampo
                      label="Oportunidades de mejora generales"
                      value={
                        formularioCierre.oportunidades_mejora_generales
                      }
                      onChange={
                        value =>
                          setFormularioCierre(
                            anterior => ({
                              ...anterior,
                              oportunidades_mejora_generales:
                                value,
                            })
                          )
                      }
                    />

                    <TextAreaCampo
                      label="Conclusión *"
                      value={
                        formularioCierre.conclusion
                      }
                      onChange={
                        value =>
                          setFormularioCierre(
                            anterior => ({
                              ...anterior,
                              conclusion:
                                value,
                            })
                          )
                      }
                    />

                    <TextAreaCampo
                      label="Observaciones finales"
                      value={
                        formularioCierre.observaciones_finales
                      }
                      onChange={
                        value =>
                          setFormularioCierre(
                            anterior => ({
                              ...anterior,
                              observaciones_finales:
                                value,
                            })
                          )
                      }
                    />

                    <TextAreaCampo
                      label="Observaciones administrativas"
                      value={
                        formularioCierre.observaciones
                      }
                      onChange={
                        value =>
                          setFormularioCierre(
                            anterior => ({
                              ...anterior,
                              observaciones:
                                value,
                            })
                          )
                      }
                    />
                  </div>

                  <div
                    className="
                      flex
                      justify-end
                      gap-2
                      border-t
                      border-slate-400
                      pt-4
                    "
                  >
                    <button
                      type="button"
                      onClick={
                        () =>
                          setMostrarFormularioCierre(
                            false
                          )
                      }
                      className="
                        rounded-lg
                        border
                        border-slate-300
                        px-4
                        py-2
                        text-xs
                        font-semibold
                        text-slate-700
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
                        rounded-lg
                        bg-emerald-700
                        px-5
                        py-2
                        text-xs
                        font-bold
                        text-white
                        disabled:opacity-50
                      "
                    >
                      {guardando
                        ? 'Guardando...'
                        : 'Guardar y cerrar auditoría'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}
        </div>
      </div>
    </div>
  )
}


// ============================================================
// COMPONENTES DE FORMULARIO
// app/admin/pesv/auditorias/page.jsx
// ============================================================

function Campo({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}) {
  return (
    <label
      className="
        block
        text-[10px]
        font-semibold
        text-slate-600
      "
    >
      {label}

      <input
        type={
          type
        }
        value={
          value ?? ''
        }
        placeholder={
          placeholder
        }
        onChange={
          event =>
            onChange(
              event.target.value
            )
        }
        className="
          mt-1
          block
          w-full
          rounded-lg
          border
          border-slate-400
          bg-white
          px-3
          py-2
          text-xs
          text-slate-800
          outline-none
          transition
          focus:border-slate-500
          focus:ring-1
          focus:ring-slate-300
        "
      />
    </label>
  )
}


// ============================================================
// SELECT
// app/admin/pesv/auditorias/page.jsx
// ============================================================

function SelectCampo({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <label
      className="
        block
        text-[10px]
        font-semibold
        text-slate-600
      "
    >
      {label}

      <select
        value={
          value ?? ''
        }
        onChange={
          event =>
            onChange(
              event.target.value
            )
        }
        className="
          mt-1
          block
          w-full
          rounded-lg
          border
          border-slate-400
          bg-white
          px-3
          py-2
          text-xs
          text-slate-800
          outline-none
          focus:border-slate-500
          focus:ring-1
          focus:ring-slate-300
        "
      >
        {options.map(
          option => (
            <option
              key={`${option.value}-${option.label}`}
              value={
                option.value
              }
            >
              {option.label}
            </option>
          )
        )}
      </select>
    </label>
  )
}


// ============================================================
// TEXTAREA
// app/admin/pesv/auditorias/page.jsx
// ============================================================

function TextAreaCampo({
  label,
  value,
  onChange,
}) {
  return (
    <label
      className="
        block
        text-[10px]
        font-semibold
        text-slate-600
      "
    >
      {label}

      <textarea
        value={
          value ?? ''
        }
        onChange={
          event =>
            onChange(
              event.target.value
            )
        }
        rows={
          3
        }
        className="
          mt-1
          block
          w-full
          resize-y
          rounded-lg
          border
          border-slate-400
          bg-white
          px-3
          py-2
          text-xs
          leading-relaxed
          text-slate-800
          outline-none
          focus:border-slate-500
          focus:ring-1
          focus:ring-slate-300
        "
      />
    </label>
  )
}


// ============================================================
// CHECKBOX
// app/admin/pesv/auditorias/page.jsx
// ============================================================

function CheckCampo({
  label,
  checked,
  onChange,
}) {
  return (
    <label
      className="
        inline-flex
        cursor-pointer
        items-center
        gap-2
        text-[10px]
        font-semibold
        text-slate-700
      "
    >
      <input
        type="checkbox"
        checked={
          Boolean(
            checked
          )
        }
        onChange={
          event =>
            onChange(
              event.target.checked
            )
        }
        className="
          h-4
          w-4
          rounded
          border-slate-300
        "
      />

      {label}
    </label>
  )
}