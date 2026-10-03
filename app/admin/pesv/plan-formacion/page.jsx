// app/admin/pesv/plan-formacion/page.jsx

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
  Toaster,
  toast,
} from 'sonner'

import {
  GraduationCap,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react'

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import {
  BotonClaro,
  BotonPdf,
  MarcoTabla,
  TituloSeccion,
} from '@/components/admin/EstiloModulo'


// ============================================================
// CONSTANTES
// ============================================================

const ANIO_ACTUAL =
  new Date().getFullYear()


const ESTADOS_PLAN = [
  'BORRADOR',
  'APROBADO',
  'EN_EJECUCION',
  'CERRADO',
]


const ESTADOS_ACTIVIDAD = [
  'PROGRAMADA',
  'EJECUTADA',
]


const MODALIDADES = [
  'Presencial',
  'Virtual',
  'Mixta',
]


const POBLACIONES = [
  'Todo el personal',
  'Instructores',
  'Administrativo',
]



// ============================================================
// FORMULARIOS INICIALES
// ============================================================

const PLAN_INICIAL = {
  id: null,

  anio:
    ANIO_ACTUAL,

  nombre:
    `PLAN ANUAL DE FORMACIÓN EN SEGURIDAD VIAL ${ANIO_ACTUAL}`,

  objetivo_general:
    '',

  fecha_aprobacion:
    '',

  estado:
    'BORRADOR',

  responsable_personal_id:
    '',

  responsable_nombre:
    '',

  observaciones:
    '',
}


const ACTIVIDAD_INICIAL = {
  id: null,

  plan_formacion_id:
    null,

  codigo:
    '',

  programa_pesv_relacionado:
    '',

  nombre:
    '',

  descripcion:
    '',

  tema:
    '',

  objetivo:
    '',

  dirigido_a:
    'Instructores',

  formador_perfil_requerido:
    '',

  area_participante:
    'Área académica',

  personas_programadas:
    '',

  modalidad:
    'Presencial',

  responsable_personal_id:
    '',

  responsable_nombre:
    '',

  fecha_programada:
    '',

  duracion_horas:
    '',

  evidencia_esperada:
    'Registro de asistencia',

  indicador_id:
    '',

  meta:
    '',

  estado:
    'PROGRAMADA',

  observaciones:
    '',
}


const CITACION_INICIAL = {
  actividad_id: null,
  tipo_reunion: 'Capacitación PESV',
  descripcion: '',
  fecha_programada: '',
  hora_inicio: '08:00',
  hora_fin: '10:00',
  modalidad: 'Presencial',
  responsable: '',
  dirigido_a: 'Todo el personal',
  lugar: '',
}


const EJECUCION_INICIAL = {
  id: null,

  actividad_id:
    null,

  tipo:
    'HISTORICA',

  reunion_id:
    '',

  fecha_ejecucion:
    '',

  duracion_horas:
    '',

  numero_asistentes:
    '',

  resultado:
    '',

  evidencia_path:
    '',

  observaciones:
    '',
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


function mayusculas(
  valor
) {
  return texto(
    valor
  ).toUpperCase()
}


function formatearFecha(
  fecha
) {
  if (!fecha) {
    return '-'
  }

  const partes =
    String(
      fecha
    ).split('-')

  if (
    partes.length !== 3
  ) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}


function nombreMes(
  fecha
) {
  if (!fecha) {
    return '-'
  }

  const mes =
    Number(
      String(
        fecha
      ).slice(
        5,
        7
      )
    )

  const meses = [
    '',
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE',
  ]

  return meses[
    mes
  ] || '-'
}


function calcularTrimestre(
  fecha
) {
  if (!fecha) {
    return '-'
  }

  const mes =
    Number(
      String(
        fecha
      ).slice(
        5,
        7
      )
    )

  if (
    mes >= 1 &&
    mes <= 3
  ) {
    return 'T1'
  }

  if (
    mes >= 4 &&
    mes <= 6
  ) {
    return 'T2'
  }

  if (
    mes >= 7 &&
    mes <= 9
  ) {
    return 'T3'
  }

  if (
    mes >= 10 &&
    mes <= 12
  ) {
    return 'T4'
  }

  return '-'
}


function nombreCompletoPersonal(
  persona
) {
  if (!persona) {
    return ''
  }

  return (
    persona.nombre_completo ||
    [
      persona.nombres,
      persona.apellidos,
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      )
      .trim()
  )
}


function estadoActividadClase(
  estado
) {
  switch (
    mayusculas(
      estado
    )
  ) {
    case 'EJECUTADA':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'

    case 'EN_EJECUCION':
      return 'bg-blue-100 text-blue-800 border-blue-200'

    case 'REPROGRAMADA':
      return 'bg-purple-100 text-purple-800 border-purple-200'

    case 'CANCELADA':
      return 'bg-red-100 text-red-800 border-red-200'

    default:
      return 'bg-amber-100 text-amber-800 border-amber-200'
  }
}


function estadoPlanClase(
  estado
) {
  switch (
    mayusculas(
      estado
    )
  ) {
    case 'APROBADO':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'

    case 'EN_EJECUCION':
      return 'bg-blue-100 text-blue-800 border-blue-200'

    case 'CERRADO':
      return 'bg-slate-200 text-slate-800 border-slate-300'

    default:
      return 'bg-amber-100 text-amber-800 border-amber-200'
  }
}


// ============================================================
// COMPONENTES PEQUEÑOS
// ============================================================

function EstadoActividadPill({
  estado,
}) {
  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2
        py-[2px]
        text-[10px]
        font-bold
        ${estadoActividadClase(
          estado
        )}
      `}
    >
      {mayusculas(
        estado
      )}
    </span>
  )
}


function EstadoPlanPill({
  estado,
}) {
  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2
        py-[2px]
        text-[10px]
        font-bold
        ${estadoPlanClase(
          estado
        )}
      `}
    >
      {mayusculas(
        estado
      )}
    </span>
  )
}


function TarjetaResumen({
  icono,
  titulo,
  valor,
  detalle,
}) {
  return (
    <div
      className="
        bg-white
        border
        border-slate-200
        rounded-xl
        shadow-sm
        p-3
        flex
        items-center
        gap-3
      "
    >
      <div
        className="
          w-10
          h-10
          rounded-lg
          bg-slate-100
          flex
          items-center
          justify-center
          text-[var(--primary)]
          shrink-0
        "
      >
        <i
          className={`
            fas
            ${icono}
          `}
        ></i>
      </div>

      <div>
        <p
          className="
            text-[10px]
            uppercase
            font-semibold
            tracking-wide
            text-slate-500
          "
        >
          {titulo}
        </p>

        <p
          className="
            text-xl
            font-bold
            text-slate-800
          "
        >
          {valor}
        </p>

        {detalle && (
          <p
            className="
              text-[10px]
              text-slate-500
            "
          >
            {detalle}
          </p>
        )}
      </div>
    </div>
  )
}


// ============================================================
// PÁGINA
// ============================================================

export default function PlanFormacionPesvPage() {
  const router =
    useRouter()


  // ==========================================================
  // SESIÓN
  // ==========================================================

  const [
    user,
    setUser,
  ] =
    useState(null)

  const [
    nitActual,
    setNitActual,
  ] =
    useState('')


  // ==========================================================
  // AÑO
  // ==========================================================

  const [
    anio,
    setAnio,
  ] =
    useState(
      ANIO_ACTUAL
    )


  // ==========================================================
  // DATOS API
  // ==========================================================

  const [
    plan,
    setPlan,
  ] =
    useState(null)

  const [
    actividades,
    setActividades,
  ] =
    useState([])

  const [
    reunionesPesv,
    setReunionesPesv,
  ] =
    useState([])

  const [
    personal,
    setPersonal,
  ] =
    useState([])

  const [
    indicadores,
    setIndicadores,
  ] =
    useState([])

  const [
    resumen,
    setResumen,
  ] =
    useState({
      total_actividades:
        0,

      programadas:
        0,

      ejecutadas:
        0,

      en_ejecucion:
        0,

      reprogramadas:
        0,

      canceladas:
        0,

      actividades_con_ejecucion:
        0,
    })


  // ==========================================================
  // FORMULARIOS
  // ==========================================================

  const [
    formPlan,
    setFormPlan,
  ] =
    useState(
      PLAN_INICIAL
    )

  const [
    formActividad,
    setFormActividad,
  ] =
    useState(
      ACTIVIDAD_INICIAL
    )

  const [
    formEjecucion,
    setFormEjecucion,
  ] =
    useState(
      EJECUCION_INICIAL
    )


  // ==========================================================
  // UI
  // ==========================================================

  const [
    cargando,
    setCargando,
  ] =
    useState(false)

  const [
    guardandoPlan,
    setGuardandoPlan,
  ] =
    useState(false)

  const [
    guardandoActividad,
    setGuardandoActividad,
  ] =
    useState(false)

  const [
    guardandoEjecucion,
    setGuardandoEjecucion,
  ] =
    useState(false)

  const [
    mostrarDatosPlan,
    setMostrarDatosPlan,
  ] =
    useState(false)

  const [
    mostrarFormActividad,
    setMostrarFormActividad,
  ] =
    useState(false)

  const [
    mostrarModalEjecucion,
    setMostrarModalEjecucion,
  ] =
    useState(false)

  const [
    mostrarDetalle,
    setMostrarDetalle,
  ] =
    useState(null)

  const [
    actividadEjecucion,
    setActividadEjecucion,
  ] =
    useState(null)


  const [
    mostrarModalCitacion,
    setMostrarModalCitacion,
  ] =
    useState(false)

  const [
    actividadCitacion,
    setActividadCitacion,
  ] =
    useState(null)

  const [
    formCitacion,
    setFormCitacion,
  ] =
    useState(CITACION_INICIAL)

  const [
    guardandoCitacion,
    setGuardandoCitacion,
  ] =
    useState(false)

  const [
    filtroEstado,
    setFiltroEstado,
  ] =
    useState('')

  const [
    filtroTexto,
    setFiltroTexto,
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
        const usuario =
          JSON.parse(
            almacenado
          )

        const nit =
          usuario?.nitEmpresa ||
          localStorage.getItem(
            'currentEmpresaNit'
          ) ||
          ''

        if (!nit) {
          toast.error(
            'No se encontró el CEA asociado a la sesión.'
          )

          return
        }

        setUser(
          usuario
        )

        setNitActual(
          nit
        )
      } catch (
        error
      ) {
        console.error(
          'Error leyendo sesión:',
          error
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
  // CARGA
  // ==========================================================

  useEffect(
    () => {
      if (
        !nitActual
      ) {
        return
      }

      cargarDatos()
    },
    [
      nitActual,
      anio,
    ]
  )


  async function cargarDatos() {
    if (
      !nitActual
    ) {
      return
    }

    setCargando(
      true
    )

    try {
      const response =
        await fetch(
          `/api/admin/pesv/plan-formacion?nit=${encodeURIComponent(
            nitActual
          )}&anio=${anio}`,
          {
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
          'No fue posible consultar el Plan Anual de Formación.'
        )
      }


      const planApi =
        data.plan ||
        null

      setPlan(
        planApi
      )

      setActividades(
        Array.isArray(
          data.actividades
        )
          ? data.actividades
          : []
      )

      setReunionesPesv(
        Array.isArray(
          data.reuniones_pesv
        )
          ? data.reuniones_pesv
          : []
      )

      setPersonal(
        Array.isArray(
          data.personal
        )
          ? data.personal
          : []
      )

      setIndicadores(
        Array.isArray(
          data.indicadores
        )
          ? data.indicadores
          : []
      )

      setResumen(
        data.resumen || {
          total_actividades:
            0,

          programadas:
            0,

          ejecutadas:
            0,

          en_ejecucion:
            0,

          reprogramadas:
            0,

          canceladas:
            0,

          actividades_con_ejecucion:
            0,
        }
      )


      if (
        planApi
      ) {
        setFormPlan({
          id:
            planApi.id,

          anio:
            planApi.anio,

          nombre:
            planApi.nombre ||
            '',

          objetivo_general:
            planApi.objetivo_general ||
            '',

          fecha_aprobacion:
            planApi.fecha_aprobacion ||
            '',

          estado:
            planApi.estado ||
            'BORRADOR',

          responsable_personal_id:
            planApi.responsable_personal_id ||
            '',

          responsable_nombre:
            planApi.responsable_nombre ||
            '',

          observaciones:
            planApi.observaciones ||
            '',
        })
      } else {
        setFormPlan({
          ...PLAN_INICIAL,

          anio,

          nombre:
            `PLAN ANUAL DE FORMACIÓN EN SEGURIDAD VIAL ${anio}`,
        })
      }
    } catch (
      error
    ) {
      console.error(
        error
      )

      toast.error(
        error.message ||
        'No fue posible cargar la información.'
      )
    } finally {
      setCargando(
        false
      )
    }
  }


  // ==========================================================
  // AÑOS
  // ==========================================================

  const opcionesAnio =
    useMemo(
      () => {
        const resultado = []

        for (
          let valor =
            ANIO_ACTUAL + 1;
          valor >= 2022;
          valor--
        ) {
          resultado.push(
            valor
          )
        }

        return resultado
      },
      []
    )


  // ==========================================================
  // ACTIVIDADES FILTRADAS
  // ==========================================================

  const actividadesFiltradas =
    useMemo(
      () => {
        const busqueda =
          texto(
            filtroTexto
          ).toLowerCase()

        return actividades.filter(
          (
            actividad
          ) => {
            if (
              filtroEstado &&
              mayusculas(
                actividad.estado
              ) !==
              filtroEstado
            ) {
              return false
            }

            if (
              busqueda
            ) {
              const contenido =
                [
                  actividad.codigo,
                  actividad.nombre,
                  actividad.tema,
                  actividad.programa_pesv_relacionado,
                  actividad.responsable_nombre,
                  actividad.dirigido_a,
                ]
                  .map(
                    (
                      valor
                    ) =>
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
        actividades,
        filtroEstado,
        filtroTexto,
      ]
    )


  // ==========================================================
  // RESUMEN TRIMESTRAL Y ACUMULADO ANUAL
  // Se calcula sobre todas las actividades del plan del año,
  // independientemente de los filtros visuales de la matriz.
  // ==========================================================

  const resumenFormacion =
    useMemo(
      () => {
        const trimestres =
          ['T1', 'T2', 'T3', 'T4'].map(
            (trimestre) => {
              const actividadesTrimestre =
                actividades.filter(
                  (actividad) =>
                    calcularTrimestre(
                      actividad.fecha_programada
                    ) === trimestre
                )

              const programadas =
                actividadesTrimestre.length

              const ejecutadas =
                actividadesTrimestre.filter(
                  (actividad) =>
                    mayusculas(
                      actividad.estado
                    ) === 'EJECUTADA'
                ).length

              return {
                trimestre,
                programadas,
                ejecutadas,
                cumplimiento:
                  programadas > 0
                    ? (ejecutadas / programadas) * 100
                    : 0,
              }
            }
          )

        const programadasAnual =
          trimestres.reduce(
            (total, item) =>
              total + item.programadas,
            0
          )

        const ejecutadasAnual =
          trimestres.reduce(
            (total, item) =>
              total + item.ejecutadas,
            0
          )

        return {
          trimestres,
          anual: {
            programadas: programadasAnual,
            ejecutadas: ejecutadasAnual,
            cumplimiento:
              programadasAnual > 0
                ? (ejecutadasAnual / programadasAnual) * 100
                : 0,
          },
        }
      },
      [actividades]
    )


  // ==========================================================
  // CAMBIO PLAN
  // ==========================================================

  function cambiarPlan(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target

    setFormPlan(
      (
        anterior
      ) => ({
        ...anterior,

        [name]:
          value,
      })
    )
  }


  // ==========================================================
  // RESPONSABLE PLAN
  // ==========================================================

  function cambiarResponsablePlan(
    event
  ) {
    const value =
      event.target.value

    const persona =
      personal.find(
        (
          item
        ) =>
          String(
            item.id
          ) ===
          String(
            value
          )
      )

    setFormPlan(
      (
        anterior
      ) => ({
        ...anterior,

        responsable_personal_id:
          value,

        responsable_nombre:
          persona
            ? nombreCompletoPersonal(
                persona
              )
            : anterior.responsable_nombre,
      })
    )
  }


  // ==========================================================
  // GUARDAR PLAN
  // ==========================================================

  async function guardarPlan() {
    if (
      !texto(
        formPlan.nombre
      )
    ) {
      toast.warning(
        'Ingrese el nombre del plan.'
      )

      return
    }

    setGuardandoPlan(
      true
    )

    try {
      const accion =
        plan
          ? 'actualizar_plan'
          : 'crear_plan'

      const metodo =
        plan
          ? 'PATCH'
          : 'POST'

      const response =
        await fetch(
          '/api/admin/pesv/plan-formacion',
          {
            method:
              metodo,

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                nit:
                  nitActual,

                accion,

                id:
                  plan?.id,

                anio,

                nombre:
                  formPlan.nombre,

                objetivo_general:
                  formPlan.objetivo_general,

                fecha_aprobacion:
                  formPlan.fecha_aprobacion ||
                  null,

                estado:
                  formPlan.estado,

                responsable_personal_id:
                  formPlan.responsable_personal_id ||
                  null,

                responsable_nombre:
                  formPlan.responsable_nombre,

                observaciones:
                  formPlan.observaciones,

                usuario_actualizacion:
                  user?.nombreCompleto ||
                  '',
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
          'No fue posible guardar el plan.'
        )
      }

      toast.success(
        data.message ||
        'Plan guardado correctamente.'
      )

      await cargarDatos()
    } catch (
      error
    ) {
      console.error(
        error
      )

      toast.error(
        error.message
      )
    } finally {
      setGuardandoPlan(
        false
      )
    }
  }


  // ==========================================================
  // NUEVA ACTIVIDAD
  // ==========================================================

  function nuevaActividad() {
    if (!plan) {
      toast.warning(
        'Primero debe crear y guardar el Plan Anual de Formación.'
      )

      return
    }

    setFormActividad({
      ...ACTIVIDAD_INICIAL,

      plan_formacion_id:
        plan.id,
    })

    setMostrarFormActividad(
      true
    )

    setTimeout(
      () => {
        document
          .getElementById(
            'formulario-actividad-formacion'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'start',
          })
      },
      50
    )
  }


  // ==========================================================
  // EDITAR ACTIVIDAD
  // ==========================================================

  function editarActividad(
    actividad
  ) {
    setFormActividad({
      id:
        actividad.id,

      plan_formacion_id:
        actividad.plan_formacion_id,

      codigo:
        actividad.codigo ||
        '',

      programa_pesv_relacionado:
        actividad.programa_pesv_relacionado ||
        '',

      nombre:
        actividad.nombre ||
        '',

      descripcion:
        actividad.descripcion ||
        '',

      tema:
        actividad.tema ||
        '',

      objetivo:
        actividad.objetivo ||
        '',

      dirigido_a:
        actividad.dirigido_a ||
        'Instructores',

      formador_perfil_requerido:
        actividad.formador_perfil_requerido ||
        '',

      area_participante:
        actividad.area_participante ||
        'Área académica',

      personas_programadas:
        actividad.personas_programadas ??
        '',

      modalidad:
        actividad.modalidad ||
        'Presencial',

      responsable_personal_id:
        actividad.responsable_personal_id ||
        '',

      responsable_nombre:
        actividad.responsable_nombre ||
        '',

      fecha_programada:
        actividad.fecha_programada ||
        '',

      duracion_horas:
        actividad.duracion_horas ??
        '',

      evidencia_esperada:
        actividad.evidencia_esperada ||
        '',

      indicador_id:
        actividad.indicador_id ||
        '',

      meta:
        actividad.meta ||
        '',

      estado:
        actividad.estado ||
        'PROGRAMADA',

      observaciones:
        actividad.observaciones ||
        '',
    })

    setMostrarFormActividad(
      true
    )

    setTimeout(
      () => {
        document
          .getElementById(
            'formulario-actividad-formacion'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'start',
          })
      },
      50
    )
  }


  // ==========================================================
  // CAMBIO ACTIVIDAD
  // ==========================================================

  function cambiarActividad(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target

    setFormActividad(
      (
        anterior
      ) => ({
        ...anterior,

        [name]:
          value,
      })
    )
  }


  // ==========================================================
  // RESPONSABLE ACTIVIDAD
  // ==========================================================

  function cambiarResponsableActividad(
    event
  ) {
    const value =
      event.target.value

    const persona =
      personal.find(
        (
          item
        ) =>
          String(
            item.id
          ) ===
          String(
            value
          )
      )

    setFormActividad(
      (
        anterior
      ) => ({
        ...anterior,

        responsable_personal_id:
          value,

        responsable_nombre:
          persona
            ? nombreCompletoPersonal(
                persona
              )
            : anterior.responsable_nombre,
      })
    )
  }


  // ==========================================================
  // GUARDAR ACTIVIDAD
  // ==========================================================

  async function guardarActividad() {
    if (
      !plan?.id
    ) {
      toast.warning(
        'No existe un plan asociado.'
      )

      return
    }

    if (
      !texto(
        formActividad.nombre
      )
    ) {
      toast.warning(
        'Ingrese la actividad de formación.'
      )

      return
    }

    if (
      !formActividad.fecha_programada
    ) {
      toast.warning(
        'Seleccione la fecha programada.'
      )

      return
    }

    setGuardandoActividad(
      true
    )

    try {
      const editando =
        Boolean(
          formActividad.id
        )

      const response =
        await fetch(
          '/api/admin/pesv/plan-formacion',
          {
            method:
              editando
                ? 'PATCH'
                : 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                nit:
                  nitActual,

                accion:
                  editando
                    ? 'actualizar_actividad'
                    : 'crear_actividad',

                id:
                  formActividad.id,

                plan_formacion_id:
                  plan.id,

                codigo:
                  formActividad.codigo,

                programa_pesv_relacionado:
                  formActividad.programa_pesv_relacionado,

                nombre:
                  formActividad.nombre,

                descripcion:
                  formActividad.descripcion,

                tema:
                  formActividad.tema,

                objetivo:
                  formActividad.objetivo,

                dirigido_a:
                  formActividad.dirigido_a,

                formador_perfil_requerido:
                  formActividad.formador_perfil_requerido,

                area_participante:
                  formActividad.area_participante,

                personas_programadas:
                  formActividad.personas_programadas ||
                  null,

                modalidad:
                  formActividad.modalidad,

                responsable_personal_id:
                  formActividad.responsable_personal_id ||
                  null,

                responsable_nombre:
                  formActividad.responsable_nombre,

                fecha_programada:
                  formActividad.fecha_programada,

                duracion_horas:
                  formActividad.duracion_horas ||
                  null,

                evidencia_esperada:
                  formActividad.evidencia_esperada,

                indicador_id:
                  formActividad.indicador_id ||
                  null,

                meta:
                  formActividad.meta,

                estado:
                  formActividad.estado,

                observaciones:
                  formActividad.observaciones,

                usuario_actualizacion:
                  user?.nombreCompleto ||
                  '',
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
          'No fue posible guardar la actividad.'
        )
      }

      toast.success(
        data.message ||
        'Actividad guardada correctamente.'
      )

      setMostrarFormActividad(
        false
      )

      setFormActividad(
        ACTIVIDAD_INICIAL
      )

      await cargarDatos()
    } catch (
      error
    ) {
      console.error(
        error
      )

      toast.error(
        error.message
      )
    } finally {
      setGuardandoActividad(
        false
      )
    }
  }


  // ==========================================================
  // ELIMINAR ACTIVIDAD
  // ==========================================================

  async function eliminarActividad(
    actividad
  ) {
    const confirmar =
      window.confirm(
        `¿Desea eliminar la actividad "${actividad.nombre}"?`
      )

    if (!confirmar) {
      return
    }

    try {
      const response =
        await fetch(
          '/api/admin/pesv/plan-formacion',
          {
            method:
              'DELETE',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                nit:
                  nitActual,

                accion:
                  'eliminar_actividad',

                id:
                  actividad.id,
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
          'No fue posible eliminar la actividad.'
        )
      }

      toast.success(
        data.message ||
        'Actividad eliminada.'
      )

      await cargarDatos()
    } catch (
      error
    ) {
      console.error(
        error
      )

      toast.error(
        error.message
      )
    }
  }


  // ==========================================================
  // ABRIR EJECUCIÓN
  // ==========================================================

  function abrirEjecucion(
    actividad
  ) {
    setActividadEjecucion(
      actividad
    )

    setFormEjecucion({
      ...EJECUCION_INICIAL,

      actividad_id:
        actividad.id,

      fecha_ejecucion:
        actividad.fecha_programada ||
        '',

      duracion_horas:
        actividad.duracion_horas ??
        '',
    })

    setMostrarModalEjecucion(
      true
    )
  }


  // ==========================================================
  // CAMBIAR EJECUCIÓN
  // ==========================================================

  function cambiarEjecucion(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target

    setFormEjecucion(
      (
        anterior
      ) => ({
        ...anterior,

        [name]:
          value,
      })
    )
  }


  // ==========================================================
  // CAMBIO TIPO EJECUCIÓN
  // ==========================================================

  function cambiarTipoEjecucion(
    tipo
  ) {
    setFormEjecucion(
      (
        anterior
      ) => ({
        ...anterior,

        tipo,

        reunion_id:
          '',

        numero_asistentes:
          '',
      })
    )
  }


  // ==========================================================
  // CAMBIO REUNIÓN
  // ==========================================================

  function cambiarReunionEjecucion(
    event
  ) {
    const reunionId =
      event.target.value

    const reunion =
      reunionesPesv.find(
        (
          item
        ) =>
          String(
            item.id
          ) ===
          String(
            reunionId
          )
      )

    setFormEjecucion(
      (
        anterior
      ) => ({
        ...anterior,

        reunion_id:
          reunionId,

        fecha_ejecucion:
          reunion?.fecha_programada ||
          anterior.fecha_ejecucion,
      })
    )
  }


  // ==========================================================
  // GUARDAR EJECUCIÓN
  // ==========================================================

  async function guardarEjecucion() {
    if (
      !actividadEjecucion
    ) {
      return
    }

    if (
      !formEjecucion.fecha_ejecucion
    ) {
      toast.warning(
        'Seleccione la fecha de ejecución.'
      )

      return
    }

    if (
      formEjecucion.tipo ===
        'REUNION' &&
      !formEjecucion.reunion_id
    ) {
      toast.warning(
        'Seleccione una reunión PESV.'
      )

      return
    }

    setGuardandoEjecucion(
      true
    )

    try {
      const response =
        await fetch(
          '/api/admin/pesv/plan-formacion',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                nit:
                  nitActual,

                accion:
                  'crear_ejecucion',

                actividad_id:
                  actividadEjecucion.id,

                reunion_id:
                  formEjecucion.tipo ===
                  'REUNION'
                    ? formEjecucion.reunion_id
                    : null,

                fecha_ejecucion:
                  formEjecucion.fecha_ejecucion,

                duracion_horas:
                  formEjecucion.duracion_horas ||
                  null,

                numero_asistentes:
                  formEjecucion.tipo ===
                  'HISTORICA'
                    ? (
                        formEjecucion.numero_asistentes ||
                        null
                      )
                    : null,

                resultado:
                  formEjecucion.resultado,

                evidencia_path:
                  formEjecucion.evidencia_path,

                observaciones:
                  formEjecucion.observaciones,

                usuario_actualizacion:
                  user?.nombreCompleto ||
                  '',
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
          'No fue posible registrar la ejecución.'
        )
      }

      toast.success(
        data.message ||
        'Ejecución registrada correctamente.'
      )

      setMostrarModalEjecucion(
        false
      )

      setActividadEjecucion(
        null
      )

      setFormEjecucion(
        EJECUCION_INICIAL
      )

      await cargarDatos()
    } catch (
      error
    ) {
      console.error(
        error
      )

      toast.error(
        error.message
      )
    } finally {
      setGuardandoEjecucion(
        false
      )
    }
  }


  // ==========================================================
  // PROGRAMAR REUNIÓN
  // ==========================================================

  function irAReuniones() {
    router.push(
      '/admin/reuniones'
    )
  }


  function normalizarDirigidoAReunion(valor) {
    const poblacion =
      texto(valor).toLowerCase()

    if (
      poblacion.includes('instructor')
    ) {
      return 'Instructores'
    }

    if (
      poblacion.includes('administr') ||
      poblacion.includes('directiv') ||
      poblacion.includes('pesv')
    ) {
      return 'Administrativo'
    }

    return 'Todo el personal'
  }


  function abrirCitacion(actividad) {
    if (
      mayusculas(actividad?.estado) === 'EJECUTADA' ||
      mayusculas(actividad?.estado) === 'CANCELADA'
    ) {
      toast.warning(
        'Esta actividad no permite generar una nueva citación.'
      )

      return
    }

    setActividadCitacion(
      actividad
    )

    setFormCitacion({
      ...CITACION_INICIAL,
      actividad_id:
        actividad.id,
      descripcion:
        actividad.nombre ||
        actividad.tema ||
        'Actividad del Plan de Formación PESV',
      fecha_programada:
        actividad.fecha_programada ||
        '',
      modalidad:
        actividad.modalidad ||
        'Presencial',
      responsable:
        actividad.responsable_nombre ||
        plan?.responsable_nombre ||
        '',
      dirigido_a:
        normalizarDirigidoAReunion(
          actividad.dirigido_a
        ),
    })

    setMostrarModalCitacion(
      true
    )
  }


  function cambiarCitacion(event) {
    const {
      name,
      value,
    } = event.target

    setFormCitacion(
      anterior => ({
        ...anterior,
        [name]: value,
      })
    )
  }


  async function guardarCitacion() {
    if (
      !actividadCitacion?.id
    ) {
      return
    }

    if (
      !formCitacion.descripcion ||
      !formCitacion.fecha_programada ||
      !formCitacion.hora_inicio ||
      !formCitacion.hora_fin
    ) {
      toast.warning(
        'Complete la descripción, fecha y horario de la citación.'
      )

      return
    }

    if (
      formCitacion.hora_fin <=
      formCitacion.hora_inicio
    ) {
      toast.warning(
        'La hora de fin debe ser posterior a la hora de inicio.'
      )

      return
    }

    setGuardandoCitacion(true)

    try {
      const response =
        await fetch(
          '/api/reuniones',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              'x-cea-nit':
                nitActual,
            },
            body: JSON.stringify({
              nit: nitActual,
              tipo_reunion:
                formCitacion.tipo_reunion,
              descripcion:
                formCitacion.descripcion,
              fecha_programada:
                formCitacion.fecha_programada,
              hora_inicio:
                formCitacion.hora_inicio,
              hora_fin:
                formCitacion.hora_fin,
              modalidad:
                formCitacion.modalidad,
              responsable:
                formCitacion.responsable,
              dirigido_a:
                formCitacion.dirigido_a,
              lugar:
                formCitacion.lugar,
              creado_por:
                user?.nombreCompleto ||
                user?.nombre_completo ||
                user?.usuario ||
                '',
              origen_modulo:
                'PESV',
              pesv_plan_formacion_actividad_id:
                actividadCitacion.id,
            }),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        data?.status !== 'success'
      ) {
        throw new Error(
          data?.message ||
          data?.detail ||
          'No fue posible generar la citación.'
        )
      }

      toast.success(
        `Citación generada correctamente. ${data?.total_citados ?? 0} persona(s) citada(s).`
      )

      setMostrarModalCitacion(false)
      setActividadCitacion(null)
      setFormCitacion(CITACION_INICIAL)

      await cargarDatos()
    } catch (error) {
      console.error(error)
      toast.error(
        error.message ||
        'No fue posible generar la citación.'
      )
    } finally {
      setGuardandoCitacion(false)
    }
  }


  // ==========================================================
  // DOCUMENTO
  // ==========================================================

  function generarDocumento() {
    if (!plan) {
      toast.warning(
        'Primero debe crear el plan.'
      )

      return
    }

    const params =
      new URLSearchParams()

    params.set(
      'nit',
      nitActual
    )

    params.set(
      'anio',
      String(
        anio
      )
    )

    router.push(
      `/admin/pesv/plan-formacion/documento?${params.toString()}`
    )
  }


  // ==========================================================
  // RENDER CARGA
  // ==========================================================

  if (!user) {
    return (
      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-slate-100
        "
      >
        <p
          className="
            text-sm
            text-slate-500
          "
        >
          Cargando...
        </p>
      </div>
    )
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        min-h-screen
        bg-slate-100
        p-3
        md:p-5
      "
    >
      <Toaster
        position="top-center"
        richColors
      />


      <div
        className="
          w-full
          max-w-[1600px]
          mx-auto
          space-y-4
        "
      >

        <div className="overflow-hidden rounded-xl shadow-sm">
          <EncabezadoModulo
            titulo="Plan Anual de Formación PESV"
            subtitulo="Planeación, ejecución y seguimiento de la formación en seguridad vial"
            icono={GraduationCap}
            rutaRegreso="/admin/pesv"
            textoRegreso="Regresar a PESV"
            permitirPersonalizacion={false}
          />
        </div>


        {/* ==================================================
            RESUMEN Y ACCIONES
        ================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <TarjetaResumen
            icono="fa-list-check"
            titulo="Actividades"
            valor={resumen.total_actividades || 0}
          />

          <TarjetaResumen
            icono="fa-clock"
            titulo="Programadas"
            valor={resumen.programadas || 0}
          />

          <TarjetaResumen
            icono="fa-circle-check"
            titulo="Ejecutadas"
            valor={resumen.ejecutadas || 0}
          />

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <i className="fas fa-calendar-days"></i>
            </div>

            <div className="min-w-0 flex-1">
              <label className="block text-[10px] uppercase font-semibold tracking-wide text-slate-500 mb-1">
                Vigencia
              </label>
              <select
                value={anio}
                onChange={event => setAnio(Number(event.target.value))}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white font-semibold"
              >
                {opcionesAnio.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-center">
        <BotonPdf
          type="button"
          onClick={generarDocumento}
          disabled={!plan}
        >
          <FileText size={15} />
          Generar PDF
        </BotonPdf>
        </div>
        </div>


        {/* ==================================================
            DATOS DEL PLAN
        ================================================== */}

        <div className="bg-white border border-slate-200 rounded-t-2xl shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setMostrarDatosPlan(actual => !actual)}
            className="w-full bg-slate-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-700 transition"
          >
            <div className="flex items-center gap-2">
              <i className="fas fa-clipboard-list text-white"></i>
              <div>
                <h2 className="text-sm font-semibold">
                  Datos del Plan Anual de Formación
                </h2>
                <p className="text-[10px] text-slate-200">
                  Información general del plan para el año {anio}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {plan && <EstadoPlanPill estado={plan.estado} />}
              {mostrarDatosPlan ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </div>
          </button>

          {mostrarDatosPlan && (
          <div className="p-4 space-y-3">
            <div
              className="
                grid
                grid-cols-1
                lg:grid-cols-12
                gap-3
              "
            >
              <div
                className="
                  lg:col-span-8
                "
              >
                <label
                  className="
                    block
                    text-xs
                    font-semibold
                    mb-1
                  "
                >
                  Nombre del plan *
                </label>

                <input
                  name="nombre"
                  value={
                    formPlan.nombre
                  }
                  onChange={
                    cambiarPlan
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-3
                    py-2
                    text-sm
                  "
                />
              </div>


              <div
                className="
                  lg:col-span-2
                "
              >
                <label
                  className="
                    block
                    text-xs
                    font-semibold
                    mb-1
                  "
                >
                  Fecha aprobación
                </label>

                <input
                  type="date"
                  name="fecha_aprobacion"
                  value={
                    formPlan.fecha_aprobacion
                  }
                  onChange={
                    cambiarPlan
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-3
                    py-2
                    text-sm
                  "
                />
              </div>


              <div
                className="
                  lg:col-span-2
                "
              >
                <label
                  className="
                    block
                    text-xs
                    font-semibold
                    mb-1
                  "
                >
                  Estado
                </label>

                <select
                  name="estado"
                  value={
                    formPlan.estado
                  }
                  onChange={
                    cambiarPlan
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-3
                    py-2
                    text-sm
                    bg-white
                  "
                >
                  {ESTADOS_PLAN.map(
                    (
                      estado
                    ) => (
                      <option
                        key={
                          estado
                        }
                        value={
                          estado
                        }
                      >
                        {estado}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>


            <div>
              <label
                className="
                  block
                  text-xs
                  font-semibold
                  mb-1
                "
              >
                Objetivo general
              </label>

              <textarea
                name="objetivo_general"
                rows={3}
                value={
                  formPlan.objetivo_general
                }
                onChange={
                  cambiarPlan
                }
                placeholder="Defina el propósito general del Plan Anual de Formación en Seguridad Vial..."
                className="
                  w-full
                  border
                  border-slate-300
                  rounded-lg
                  px-3
                  py-2
                  text-sm
                "
              />
            </div>


            <div
              className="
                grid
                grid-cols-1
                lg:grid-cols-12
                gap-3
              "
            >
              <div
                className="
                  lg:col-span-5
                "
              >
                <label
                  className="
                    block
                    text-xs
                    font-semibold
                    mb-1
                  "
                >
                  Responsable
                </label>

                <select
                  value={
                    formPlan.responsable_personal_id
                  }
                  onChange={
                    cambiarResponsablePlan
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-3
                    py-2
                    text-sm
                    bg-white
                  "
                >
                  <option value="">
                    -- Seleccionar personal --
                  </option>

                  {personal.map(
                    (
                      persona
                    ) => (
                      <option
                        key={
                          persona.id
                        }
                        value={
                          persona.id
                        }
                      >
                        {
                          nombreCompletoPersonal(
                            persona
                          )
                        }
                      </option>
                    )
                  )}
                </select>
              </div>


              <div
                className="
                  lg:col-span-7
                "
              >
                <label
                  className="
                    block
                    text-xs
                    font-semibold
                    mb-1
                  "
                >
                  Observaciones
                </label>

                <input
                  name="observaciones"
                  value={
                    formPlan.observaciones
                  }
                  onChange={
                    cambiarPlan
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-3
                    py-2
                    text-sm
                  "
                />
              </div>
            </div>


            <div
              className="
                flex
                justify-end
                border-t
                border-slate-200
                pt-3
              "
            >
              <button
                type="button"
                onClick={
                  guardarPlan
                }
                disabled={
                  guardandoPlan
                }
                className="
                  bg-[var(--primary)]
                  hover:bg-[var(--primary-dark)]
                  disabled:opacity-50
                  text-white
                  rounded-lg
                  px-4
                  py-2
                  text-xs
                  font-semibold
                  flex
                  items-center
                  gap-2
                "
              >
                <i
                  className="
                    fas
                    fa-save
                  "
                ></i>

                {
                  guardandoPlan
                    ? 'Guardando...'
                    : plan
                      ? 'Actualizar plan'
                      : 'Crear plan'
                }
              </button>
            </div>
          </div>
          )}
        </div>


        {/* ==================================================
            ACTIVIDADES
        ================================================== */}

        <div
          className="
            bg-white
            border
            border-slate-200
            rounded-2xl
            shadow-sm
            overflow-hidden
          "
        >
          {/* ==============================================
              FILTROS
          ============================================== */}

          <div
            className="
              bg-slate-50
              border-b
              border-slate-200
              p-3
            "
          >
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
                  md:col-span-8
                "
              >
                <label
                  className="
                    block
                    text-[10px]
                    uppercase
                    font-semibold
                    text-slate-500
                    mb-1
                  "
                >
                  Buscar
                </label>

                <input
                  value={
                    filtroTexto
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setFiltroTexto(
                        event.target.value
                      )
                  }
                  placeholder="Código, actividad, tema, programa PESV, responsable..."
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-3
                    py-2
                    text-xs
                    bg-white
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
                    text-[10px]
                    uppercase
                    font-semibold
                    text-slate-500
                    mb-1
                  "
                >
                  Estado
                </label>

                <select
                  value={
                    filtroEstado
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setFiltroEstado(
                        event.target.value
                      )
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-lg
                    px-3
                    py-2
                    text-xs
                    bg-white
                  "
                >
                  <option value="">
                    Todos
                  </option>

                  {ESTADOS_ACTIVIDAD.map(
                    (
                      estado
                    ) => (
                      <option
                        key={
                          estado
                        }
                        value={
                          estado
                        }
                      >
                        {estado}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>



          <TituloSeccion
            titulo="Actividades de formación"
            subtitulo={`Planeación y seguimiento de actividades del año ${anio}`}
            className="rounded-t-xl"
            icono={
              <i className="fas fa-chalkboard-user"></i>
            }
            acciones={
              <BotonClaro
                type="button"
                onClick={nuevaActividad}
                disabled={!plan}
              >
                <i className="fas fa-plus"></i>
                Agregar actividad
              </BotonClaro>
            }
          />



          {/* ==============================================
              TABLA
          ============================================== */}

          <MarcoTabla className="overflow-x-auto !rounded-t-none">
            <table
              className="
                w-full
                min-w-[1120px]
                border-collapse
                text-[11px]
              "
            >
              <thead
                className=" 
                  bg-blue-100
                  text-slate-700
                "
              >
                <tr>
                  <th
                    className="

                      p-2
                    "
                  >
                    Código
                  </th>

                  <th
                    className="

                      p-2
                    "
                  >
                    Actividad / Tema
                  </th>

                  <th
                    className="

                      p-2
                    "
                  >
                    Programa PESV
                  </th>

                  <th
                    className="

                      p-2
                    "
                  >
                    Población
                  </th>

                  <th
                    className="

                      p-2
                    "
                  >
                    Fecha
                  </th>

                  <th
                    className="

                      p-2
                    "
                  >
                    Responsable
                  </th>

                  <th
                    className="

                      p-2
                    "
                  >
                    Duración
                  </th>
<th
                    className="

                      p-2
                    "
                  >
                    Estado
                  </th>

                  <th
                    className="

                      p-2
                    "
                  >
                    Acciones
                  </th>
                </tr>
              </thead>


              <tbody className="">
                {cargando ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="
                        p-6
                        text-center
                        text-slate-500
                      "
                    >
                      Cargando información...
                    </td>
                  </tr>
                ) : actividadesFiltradas.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="
                        p-6
                        text-center
                        text-slate-500
                      "
                    >
                      No existen actividades de formación registradas para este año.
                    </td>
                  </tr>
                ) : (
                  actividadesFiltradas.map(
                    (
                      actividad
                    ) => (
                      <tr
                        key={
                          actividad.id
                        }
                        className="
                          odd:bg-white
                          even:bg-slate-50
                          hover:bg-blue-50
                        "
                      >
                        <td
                          className="

                            p-2
                            text-center
                            font-semibold
                          "
                        >
                          {
                            actividad.codigo ||
                            '-'
                          }
                        </td>


                        <td
                          className="

                            p-2
                            min-w-[210px] max-w-[250px]
                          "
                        >
                          <div
                            className="
                              font-semibold
                              text-slate-800
                            "
                          >
                            {
                              actividad.nombre
                            }
                          </div>

                          {actividad.tema && (
                            <div
                              className="
                                text-[10px]
                                text-slate-500
                                mt-1
                              "
                            >
                              Tema:{' '}

                              {
                                actividad.tema
                              }
                            </div>
                          )}
                        </td>


                        <td
                          className="

                            p-2
                            text-center
                          "
                        >
                          {
                            actividad.programa_pesv_relacionado ||
                            '-'
                          }
                        </td>


                        <td
                          className="

                            p-2
                            text-center
                          "
                        >
                          {
                            actividad.dirigido_a ||
                            '-'
                          }

                          {actividad.personas_programadas !==
                            null &&
                            actividad.personas_programadas !==
                            undefined && (
                            <div
                              className="
                                text-[10px]
                                text-slate-500
                                mt-1
                              "
                            >
                              Previstas:{' '}

                              {
                                actividad.personas_programadas
                              }
                            </div>
                          )}
                        </td>


                        <td
                          className="

                            p-2
                            text-center
                            whitespace-nowrap
                          "
                        >
                          <strong>
                            {
                              formatearFecha(
                                actividad.fecha_programada
                              )
                            }
                          </strong>

                          <div
                            className="
                              text-[10px]
                              text-slate-500
                            "
                          >
                            {
                              nombreMes(
                                actividad.fecha_programada
                              )
                            }
                            {' · '}
                            {
                              calcularTrimestre(
                                actividad.fecha_programada
                              )
                            }
                          </div>
                        </td>


                        <td
                          className="

                            p-2
                            text-center
                          "
                        >
                          {
                            actividad.responsable_nombre ||
                            '-'
                          }
                        </td>


                        <td
                          className="

                            p-2
                            text-center
                          "
                        >
                          {
                            actividad.duracion_horas
                              ? `${actividad.duracion_horas} h`
                              : '-'
                          }
                        </td>


                        


                        <td
                          className="

                            p-2
                            text-center
                          "
                        >
                          <EstadoActividadPill
                            estado={
                              actividad.estado
                            }
                          />
                        </td>


                        <td
                          className="

                            p-2
                          "
                        >
                          <div
                            className="
                              flex
                              items-center
                              justify-center
                              gap-1
                            "
                          >
                            <button
                              type="button"
                              onClick={
                                () =>
                                  setMostrarDetalle(
                                    actividad
                                  )
                              }
                              className="
                                w-8
                                h-8
                                rounded-lg
                                bg-blue-600
                                hover:bg-blue-700
                                text-white
                              "
                              title="Ver detalle"
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
                              onClick={
                                () =>
                                  editarActividad(
                                    actividad
                                  )
                              }
                              className="
                                w-8
                                h-8
                                rounded-lg
                                bg-amber-500
                                hover:bg-amber-600
                                text-white
                              "
                              title="Editar actividad"
                            >
                              <i
                                className="
                                  fas
                                  fa-pen
                                "
                              ></i>
                            </button>


                            <button
                              type="button"
                              onClick={
                                () =>
                                  abrirCitacion(
                                    actividad
                                  )
                              }
                              disabled={
                                mayusculas(actividad.estado) === 'EJECUTADA' ||
                                mayusculas(actividad.estado) === 'CANCELADA'
                              }
                              className="
                                w-8
                                h-8
                                rounded-lg
                                bg-slate-700
                                hover:bg-slate-900
                                disabled:bg-slate-300
                                disabled:cursor-not-allowed
                                text-white
                              "
                              title="Generar citación desde esta actividad"
                            >
                              <i
                                className="
                                  fas
                                  fa-envelope
                                "
                              ></i>
                            </button>


                            <button
                              type="button"
                              onClick={
                                () =>
                                  abrirEjecucion(
                                    actividad
                                  )
                              }
                              className="
                                w-8
                                h-8
                                rounded-lg
                                bg-emerald-600
                                hover:bg-emerald-700
                                text-white
                              "
                              title="Registrar ejecución"
                            >
                              <i
                                className="
                                  fas
                                  fa-check
                                "
                              ></i>
                            </button>


                            <button
                              type="button"
                              onClick={
                                () =>
                                  eliminarActividad(
                                    actividad
                                  )
                              }
                              disabled={
                                actividad.ejecuciones
                                  ?.length >
                                0
                              }
                              className="
                                w-8
                                h-8
                                rounded-lg
                                bg-red-600
                                hover:bg-red-700
                                disabled:bg-red-300
                                disabled:cursor-not-allowed
                                text-white
                              "
                              title={
                                actividad.ejecuciones
                                  ?.length >
                                0
                                  ? 'La actividad tiene ejecuciones'
                                  : 'Eliminar actividad'
                              }
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
          </MarcoTabla>


          {/* ==============================================
              RESUMEN TRIMESTRAL Y ACUMULADO ANUAL
          ============================================== */}

          <div className="mt-4">
            <TituloSeccion
              titulo="Resumen trimestral y acumulado anual"
              subtitulo={`Cumplimiento de las actividades del Plan de Formación ${anio}`}
              className="rounded-t-xl"
              icono={
                <i className="fas fa-chart-column"></i>
              }
            />

            <MarcoTabla className="overflow-x-auto !rounded-t-none">
              <table
                className="
                  w-full
                  min-w-[620px]
                  border-collapse
                  text-[11px]
                "
              >
                <thead
                  className="
                    bg-blue-100
                    text-slate-700
                  "
                >
                  <tr>
                    <th className="p-2">Periodo</th>
                    <th className="p-2 text-center">Programadas</th>
                    <th className="p-2 text-center">Ejecutadas</th>
                    <th className="p-2 text-center">Cumplimiento</th>
                  </tr>
                </thead>

                <tbody>
                  {resumenFormacion.trimestres.map(
                    (item, indice) => (
                      <tr
                        key={item.trimestre}
                        className="odd:bg-white even:bg-slate-50"
                      >
                        <td className="p-2 font-semibold text-slate-700">
                          {`${indice + 1}° Trimestre`}
                        </td>
                        <td className="p-2 text-center">
                          {item.programadas}
                        </td>
                        <td className="p-2 text-center">
                          {item.ejecutadas}
                        </td>
                        <td className="p-2 text-center font-semibold">
                          {`${item.cumplimiento.toFixed(2)}%`}
                        </td>
                      </tr>
                    )
                  )}

                  <tr className="bg-slate-100 font-bold text-slate-800">
                    <td className="p-2">Acumulado anual</td>
                    <td className="p-2 text-center">
                      {resumenFormacion.anual.programadas}
                    </td>
                    <td className="p-2 text-center">
                      {resumenFormacion.anual.ejecutadas}
                    </td>
                    <td className="p-2 text-center">
                      {`${resumenFormacion.anual.cumplimiento.toFixed(2)}%`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </MarcoTabla>
          </div>
        </div>


        {/* ==================================================
            FORMULARIO ACTIVIDAD
        ================================================== */}

        {mostrarFormActividad && (
          <FormularioActividad
            form={
              formActividad
            }
            personal={
              personal
            }
            indicadores={
              indicadores
            }
            cambiarActividad={
              cambiarActividad
            }
            cambiarResponsable={
              cambiarResponsableActividad
            }
            guardar={
              guardarActividad
            }
            guardando={
              guardandoActividad
            }
            cancelar={
              () => {
                setMostrarFormActividad(
                  false
                )

                setFormActividad(
                  ACTIVIDAD_INICIAL
                )
              }
            }
          />
        )}
      </div>


      {/* ====================================================
          MODAL CITACIÓN PESV
      ==================================================== */}

      {mostrarModalCitacion &&
        actividadCitacion && (
          <ModalCitacionPesv
            actividad={actividadCitacion}
            form={formCitacion}
            cambiar={cambiarCitacion}
            guardar={guardarCitacion}
            guardando={guardandoCitacion}
            cerrar={() => {
              setMostrarModalCitacion(false)
              setActividadCitacion(null)
              setFormCitacion(CITACION_INICIAL)
            }}
          />
        )}


      {/* ====================================================
          MODAL EJECUCIÓN
      ==================================================== */}

      {mostrarModalEjecucion &&
        actividadEjecucion && (
          <ModalEjecucion
            actividad={
              actividadEjecucion
            }
            form={
              formEjecucion
            }
            reuniones={
              reunionesPesv
            }
            cambiar={
              cambiarEjecucion
            }
            cambiarTipo={
              cambiarTipoEjecucion
            }
            cambiarReunion={
              cambiarReunionEjecucion
            }
            guardar={
              guardarEjecucion
            }
            guardando={
              guardandoEjecucion
            }
            cerrar={
              () => {
                setMostrarModalEjecucion(
                  false
                )

                setActividadEjecucion(
                  null
                )
              }
            }
            irReuniones={
              irAReuniones
            }
          />
        )}


      {/* ====================================================
          MODAL DETALLE
      ==================================================== */}

      {mostrarDetalle && (
        <ModalDetalleActividad
          actividad={
            mostrarDetalle
          }
          cerrar={
            () =>
              setMostrarDetalle(
                null
              )
          }
        />
      )}
    </div>
  )
}


// ============================================================
// FORMULARIO ACTIVIDAD
// ============================================================

function FormularioActividad({
  form,
  personal,
  indicadores,
  cambiarActividad,
  cambiarResponsable,
  guardar,
  guardando,
  cancelar,
}) {
  return (
    <div
      id="formulario-actividad-formacion"
      className="
        bg-white
        border
        border-slate-200
        rounded-2xl
        shadow-sm
        overflow-hidden
        scroll-mt-24
      "
    >
      <div
        className="
          bg-slate-800
          text-white
          px-4
          py-3
          flex
          items-center
          justify-between
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <i
            className="
              fas
              fa-chalkboard
            "
          ></i>

          <div>
            <h2
              className="
                text-sm
                font-semibold
              "
            >
              {
                form.id
                  ? 'Editar actividad de formación'
                  : 'Nueva actividad de formación'
              }
            </h2>

            <p
              className="
                text-[10px]
                opacity-80
              "
            >
              Planeación de la actividad y competencia a fortalecer
            </p>
          </div>
        </div>


        <button
          type="button"
          onClick={
            cancelar
          }
          className="
            w-8
            h-8
            rounded-lg
            hover:bg-white/10
          "
        >
          <i
            className="
              fas
              fa-xmark
            "
          ></i>
        </button>
      </div>


      <div
        className="
          p-4
          space-y-5
        "
      >

        {/* ================================================
            IDENTIFICACIÓN
        ================================================ */}

        <SeccionTitulo
          titulo="Identificación de la actividad"
        />


        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-12
            gap-3
          "
        >
          <Campo
            label="Código"
            name="codigo"
            value={
              form.codigo
            }
            onChange={
              cambiarActividad
            }
            clase="lg:col-span-2"
            placeholder="Ej: PF-09"
          />


          <Campo
            label="Programa PESV relacionado"
            name="programa_pesv_relacionado"
            value={
              form.programa_pesv_relacionado
            }
            onChange={
              cambiarActividad
            }
            clase="lg:col-span-4"
            placeholder="Ej: Prevención de la fatiga"
          />


          <Campo
            label="Actividad de formación *"
            name="nombre"
            value={
              form.nombre
            }
            onChange={
              cambiarActividad
            }
            clase="lg:col-span-6"
            placeholder="Nombre de la actividad"
          />
        </div>


        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-2
            gap-3
          "
        >
          <AreaTexto
            label="Tema"
            name="tema"
            value={
              form.tema
            }
            onChange={
              cambiarActividad
            }
            rows={2}
          />

          <AreaTexto
            label="Descripción"
            name="descripcion"
            value={
              form.descripcion
            }
            onChange={
              cambiarActividad
            }
            rows={2}
          />
        </div>


        <AreaTexto
          label="Objetivo de la formación"
          name="objetivo"
          value={
            form.objetivo
          }
          onChange={
            cambiarActividad
          }
          rows={3}
          placeholder="Competencia que se espera fortalecer en los participantes..."
        />


        {/* ================================================
            PARTICIPANTES
        ================================================ */}

        <SeccionTitulo
          titulo="Población y competencia"
        />


        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-12
            gap-3
          "
        >
          <SelectCampo
            label="Población objetivo"
            name="dirigido_a"
            value={
              form.dirigido_a
            }
            onChange={
              cambiarActividad
            }
            opciones={
              POBLACIONES
            }
            clase="lg:col-span-3"
          />


          <div
            className="lg:col-span-2"
          >
            <label
              className="
                block
                text-xs
                font-semibold
                mb-1
              "
            >
              Personas programadas
            </label>

            <div
              className="
                w-full
                min-h-[38px]
                border
                border-slate-300
                rounded-lg
                px-3
                py-2
                text-sm
                bg-slate-100
                text-slate-700
                font-semibold
              "
            >
              {
                form.personas_programadas !==
                  '' &&
                form.personas_programadas !==
                  null &&
                form.personas_programadas !==
                  undefined
                  ? form.personas_programadas
                  : 'Automático al guardar'
              }
            </div>

            <p
              className="
                text-[9px]
                text-slate-500
                mt-1
              "
            >
              Calculado según la población objetivo y los perfiles activos.
            </p>
          </div>


          <Campo
            label="Formador / perfil requerido"
            name="formador_perfil_requerido"
            value={
              form.formador_perfil_requerido
            }
            onChange={
              cambiarActividad
            }
            clase="lg:col-span-4"
          />
        </div>


        {/* ================================================
            PROGRAMACIÓN
        ================================================ */}

        <SeccionTitulo
          titulo="Programación"
        />


        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-12
            gap-3
          "
        >
          <Campo
            label="Fecha programada *"
            type="date"
            name="fecha_programada"
            value={
              form.fecha_programada
            }
            onChange={
              cambiarActividad
            }
            clase="lg:col-span-2"
          />


          <SelectCampo
            label="Modalidad"
            name="modalidad"
            value={
              form.modalidad
            }
            onChange={
              cambiarActividad
            }
            opciones={
              MODALIDADES
            }
            clase="lg:col-span-2"
          />


          <Campo
            label="Duración (horas)"
            type="number"
            step="0.5"
            name="duracion_horas"
            value={
              form.duracion_horas
            }
            onChange={
              cambiarActividad
            }
            clase="lg:col-span-2"
          />


          <div
            className="
              lg:col-span-4
            "
          >
            <label
              className="
                block
                text-xs
                font-semibold
                mb-1
              "
            >
              Responsable
            </label>

            <select
              value={
                form.responsable_personal_id
              }
              onChange={
                cambiarResponsable
              }
              className="
                w-full
                border
                border-slate-300
                rounded-lg
                px-3
                py-2
                text-sm
                bg-white
              "
            >
              <option value="">
                -- Seleccionar --
              </option>

              {personal.map(
                (
                  persona
                ) => (
                  <option
                    key={
                      persona.id
                    }
                    value={
                      persona.id
                    }
                  >
                    {
                      nombreCompletoPersonal(
                        persona
                      )
                    }
                  </option>
                )
              )}
            </select>
          </div>


          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold mb-1">
              Estado
            </label>
            <div className="w-full min-h-[38px] border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-700 font-semibold">
              {form.estado || 'PROGRAMADA'}
            </div>
            <p className="text-[9px] text-slate-500 mt-1">
              El estado se actualiza automáticamente según la ejecución y la asistencia.
            </p>
          </div>
        </div>


        {/* ================================================
            SEGUIMIENTO
        ================================================ */}

        <SeccionTitulo
          titulo="Evidencia y meta"
        />


        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-12
            gap-3
          "
        >
          <Campo
            label="Evidencia esperada"
            name="evidencia_esperada"
            value={
              form.evidencia_esperada
            }
            onChange={
              cambiarActividad
            }
            clase="lg:col-span-4"
          />


          <Campo
            label="Meta"
            name="meta"
            value={
              form.meta
            }
            onChange={
              cambiarActividad
            }
            clase="lg:col-span-4"
            placeholder="Ej: ≥ 80 %, 1 sesión, 100 %"
          />
        </div>


        <AreaTexto
          label="Observaciones"
          name="observaciones"
          value={
            form.observaciones
          }
          onChange={
            cambiarActividad
          }
          rows={2}
        />


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
              cancelar
            }
            className="
              bg-slate-500
              hover:bg-slate-700
              text-white
              rounded-lg
              px-4
              py-2
              text-xs
            "
          >
            Cancelar
          </button>


          <button
            type="button"
            onClick={
              guardar
            }
            disabled={
              guardando
            }
            className="
              bg-[var(--primary)]
              hover:bg-[var(--primary-dark)]
              disabled:opacity-50
              text-white
              rounded-lg
              px-4
              py-2
              text-xs
              font-semibold
            "
          >
            <i
              className="
                fas
                fa-save
                mr-2
              "
            ></i>

            {
              guardando
                ? 'Guardando...'
                : form.id
                  ? 'Actualizar actividad'
                  : 'Guardar actividad'
            }
          </button>
        </div>
      </div>
    </div>
  )
}


// ============================================================
// MODAL EJECUCIÓN
// ============================================================

function ModalCitacionPesv({
  actividad,
  form,
  cambiar,
  guardar,
  guardando,
  cerrar,
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={cerrar}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center">
          <div>
            <p className="text-[10px] opacity-70 uppercase">
              Plan de Formación PESV
            </p>
            <h3 className="text-sm font-bold">
              Generar citación
            </h3>
          </div>

          <button
            type="button"
            onClick={cerrar}
            className="w-8 h-8 rounded-lg hover:bg-white/10"
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="border border-slate-200 bg-slate-50 rounded-xl p-3">
            <p className="text-[9px] uppercase font-bold tracking-wide text-slate-500">
              Actividad del plan
            </p>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              {actividad.codigo ? `${actividad.codigo} - ` : ''}
              {actividad.nombre}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Fecha programada: {formatearFecha(actividad.fecha_programada)} · {calcularTrimestre(actividad.fecha_programada)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Campo
              label="Tipo de reunión *"
              name="tipo_reunion"
              value={form.tipo_reunion}
              onChange={cambiar}
            />

            <SelectCampo
              label="Modalidad"
              name="modalidad"
              value={form.modalidad}
              onChange={cambiar}
              opciones={MODALIDADES}
            />
          </div>

          <AreaTexto
            label="Descripción / tema de la citación *"
            name="descripcion"
            value={form.descripcion}
            onChange={cambiar}
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Campo
              label="Fecha *"
              type="date"
              name="fecha_programada"
              value={form.fecha_programada}
              onChange={cambiar}
            />

            <Campo
              label="Hora inicio *"
              type="time"
              name="hora_inicio"
              value={form.hora_inicio}
              onChange={cambiar}
            />

            <Campo
              label="Hora fin *"
              type="time"
              name="hora_fin"
              value={form.hora_fin}
              onChange={cambiar}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Dirigido a *
              </label>
              <select
                name="dirigido_a"
                value={form.dirigido_a}
                onChange={cambiar}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="Todo el personal">Todo el personal</option>
                <option value="Instructores">Instructores</option>
                <option value="Administrativo">Administrativo</option>
              </select>
            </div>

            <Campo
              label="Responsable"
              name="responsable"
              value={form.responsable}
              onChange={cambiar}
            />
          </div>

          <Campo
            label="Lugar / salón / enlace de referencia"
            name="lugar"
            value={form.lugar}
            onChange={cambiar}
            placeholder="Ej. Salón principal"
          />

          <div className="border border-slate-200 rounded-xl p-3 text-xs text-slate-600 bg-slate-50">
            Al generar la citación, DATA-CEA conservará la relación con esta actividad del Plan de Formación, guardará la fotografía histórica de las personas citadas y enviará los correos correspondientes.
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={cerrar}
              disabled={guardando}
              className="bg-slate-500 hover:bg-slate-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold"
            >
              <i className="fas fa-paper-plane mr-2"></i>
              {guardando ? 'Generando citación...' : 'Generar y enviar citación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ============================================================
// MODAL EJECUCIÓN
// ============================================================

function ModalEjecucion({
  actividad,
  form,
  reuniones,
  cambiar,
  cambiarTipo,
  cambiarReunion,
  guardar,
  guardando,
  cerrar,
  irReuniones,
}) {
  return (
    <div
      className="
        fixed
        inset-0
        z-50
        bg-black/50
        flex
        items-center
        justify-center
        p-4
      "
      onClick={
        cerrar
      }
    >
      <div
        className="
          bg-white
          rounded-2xl
          shadow-2xl
          border
          border-slate-200
          w-full
          max-w-3xl
          max-h-[92vh]
          overflow-y-auto
        "
        onClick={
          (
            event
          ) =>
            event.stopPropagation()
        }
      >
        <div
          className="
            bg-slate-800
            text-white
            px-4
            py-3
            flex
            items-center
            justify-between
          "
        >
          <div>
            <p
              className="
                text-[10px]
                opacity-70
              "
            >
              Seguimiento de actividad
            </p>

            <h3
              className="
                text-sm
                font-bold
              "
            >
              {
                actividad.codigo
                  ? `${actividad.codigo} - `
                  : ''
              }

              {
                actividad.nombre
              }
            </h3>
          </div>


          <button
            onClick={
              cerrar
            }
            className="
              w-8
              h-8
              rounded-lg
              hover:bg-white/10
            "
          >
            <i
              className="
                fas
                fa-xmark
              "
            ></i>
          </button>
        </div>


        <div
          className="
            p-4
            space-y-4
          "
        >
          <div
            className="
              bg-blue-50
              border
              border-blue-200
              rounded-xl
              p-3
              text-xs
              text-blue-900
            "
          >
            Para capacitaciones antiguas que no fueron programadas desde DATA CEA utilice
            <strong> Ejecución histórica</strong>. Para actividades que ya tienen una reunión PESV creada utilice
            <strong> Vincular reunión PESV</strong>.
          </div>


          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-2
              gap-3
            "
          >
            <button
              type="button"
              onClick={
                () =>
                  cambiarTipo(
                    'HISTORICA'
                  )
              }
              className={`
                border
                rounded-xl
                p-3
                text-left
                ${
                  form.tipo ===
                  'HISTORICA'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white'
                }
              `}
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                  font-semibold
                  text-sm
                "
              >
                <i
                  className="
                    fas
                    fa-clock-rotate-left
                  "
                ></i>

                Ejecución histórica
              </div>

              <p
                className="
                  text-[10px]
                  text-slate-500
                  mt-1
                "
              >
                Para capacitaciones realizadas antes de la integración con reuniones.
              </p>
            </button>


            <button
              type="button"
              onClick={
                () =>
                  cambiarTipo(
                    'REUNION'
                  )
              }
              className={`
                border
                rounded-xl
                p-3
                text-left
                ${
                  form.tipo ===
                  'REUNION'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 bg-white'
                }
              `}
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                  font-semibold
                  text-sm
                "
              >
                <i
                  className="
                    fas
                    fa-link
                  "
                ></i>

                Vincular reunión PESV
              </div>

              <p
                className="
                  text-[10px]
                  text-slate-500
                  mt-1
                "
              >
                La asistencia se obtendrá automáticamente del módulo de reuniones.
              </p>
            </button>
          </div>


          {form.tipo ===
            'REUNION' && (
            <div>
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-2
                  mb-1
                "
              >
                <label
                  className="
                    text-xs
                    font-semibold
                  "
                >
                  Reunión PESV *
                </label>

                <button
                  type="button"
                  onClick={
                    irReuniones
                  }
                  className="
                    text-[10px]
                    text-blue-700
                    font-semibold
                    hover:underline
                  "
                >
                  + Programar nueva reunión
                </button>
              </div>

              <select
                value={
                  form.reunion_id
                }
                onChange={
                  cambiarReunion
                }
                className="
                  w-full
                  border
                  border-slate-300
                  rounded-lg
                  px-3
                  py-2
                  text-sm
                  bg-white
                "
              >
                <option value="">
                  -- Seleccionar reunión PESV --
                </option>

                {reuniones.map(
                  (
                    reunion
                  ) => (
                    <option
                      key={
                        reunion.id
                      }
                      value={
                        reunion.id
                      }
                    >
                      {formatearFecha(
                        reunion.fecha_programada
                      )}
                      {' · '}
                      {
                        reunion.tipo_reunion
                      }
                      {' · '}
                      {
                        reunion.descripcion
                      }
                      {' · '}
                      {
                        reunion.estado
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          )}


          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-3
              gap-3
            "
          >
            <Campo
              label="Fecha ejecución *"
              type="date"
              name="fecha_ejecucion"
              value={
                form.fecha_ejecucion
              }
              onChange={
                cambiar
              }
            />


            <Campo
              label="Duración real (horas)"
              type="number"
              step="0.5"
              name="duracion_horas"
              value={
                form.duracion_horas
              }
              onChange={
                cambiar
              }
            />


            {form.tipo ===
              'HISTORICA' && (
              <Campo
                label="Número de asistentes"
                type="number"
                name="numero_asistentes"
                value={
                  form.numero_asistentes
                }
                onChange={
                  cambiar
                }
              />
            )}
          </div>


          <AreaTexto
            label="Resultado / seguimiento"
            name="resultado"
            value={
              form.resultado
            }
            onChange={
              cambiar
            }
            rows={3}
            placeholder="Resultado de la actividad, cumplimiento, aprendizajes o aspectos relevantes..."
          />


          <Campo
            label="Ruta de evidencia"
            name="evidencia_path"
            value={
              form.evidencia_path
            }
            onChange={
              cambiar
            }
            placeholder="Opcional. Ruta del soporte cuando exista."
          />


          <AreaTexto
            label="Observaciones"
            name="observaciones"
            value={
              form.observaciones
            }
            onChange={
              cambiar
            }
            rows={2}
          />


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
              onClick={
                cerrar
              }
              className="
                bg-slate-500
                hover:bg-slate-700
                text-white
                px-4
                py-2
                rounded-lg
                text-xs
              "
            >
              Cancelar
            </button>


            <button
              onClick={
                guardar
              }
              disabled={
                guardando
              }
              className="
                bg-emerald-600
                hover:bg-emerald-700
                disabled:opacity-50
                text-white
                px-4
                py-2
                rounded-lg
                text-xs
                font-semibold
              "
            >
              <i
                className="
                  fas
                  fa-check
                  mr-2
                "
              ></i>

              {
                guardando
                  ? 'Registrando...'
                  : 'Registrar ejecución'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ============================================================
// MODAL DETALLE ACTIVIDAD
// ============================================================

function ModalDetalleActividad({
  actividad,
  cerrar,
}) {
  return (
    <div
      className="
        fixed
        inset-0
        z-50
        bg-black/50
        flex
        items-center
        justify-center
        p-4
      "
      onClick={
        cerrar
      }
    >
      <div
        className="
          bg-white
          w-full
          max-w-4xl
          max-h-[92vh]
          overflow-y-auto
          rounded-2xl
          shadow-2xl
        "
        onClick={
          (
            event
          ) =>
            event.stopPropagation()
        }
      >
        <div
          className="
            bg-slate-800
            text-white
            px-4
            py-3
            flex
            justify-between
            items-center
          "
        >
          <div>
            <p
              className="
                text-[10px]
                opacity-70
              "
            >
              Detalle de actividad
            </p>

            <h3
              className="
                text-sm
                font-bold
              "
            >
              {
                actividad.codigo
                  ? `${actividad.codigo} - `
                  : ''
              }

              {
                actividad.nombre
              }
            </h3>
          </div>


          <button
            onClick={
              cerrar
            }
            className="
              w-8
              h-8
              rounded-lg
              hover:bg-white/10
            "
          >
            <i
              className="
                fas
                fa-xmark
              "
            ></i>
          </button>
        </div>


        <div
          className="
            p-4
            space-y-4
          "
        >
          <div
            className="
              flex
              gap-2
            "
          >
            <EstadoActividadPill
              estado={
                actividad.estado
              }
            />

            <span
              className="
                inline-flex
                border
                border-slate-200
                bg-slate-100
                rounded-full
                px-2
                py-[2px]
                text-[10px]
                font-bold
              "
            >
              {
                nombreMes(
                  actividad.fecha_programada
                )
              }
              {' · '}
              {
                calcularTrimestre(
                  actividad.fecha_programada
                )
              }
            </span>
          </div>


          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-2
              gap-3
            "
          >
            <Detalle
              titulo="Programa PESV relacionado"
              valor={
                actividad.programa_pesv_relacionado
              }
            />

            <Detalle
              titulo="Tema"
              valor={
                actividad.tema
              }
            />

            <Detalle
              titulo="Población objetivo"
              valor={
                actividad.dirigido_a
              }
            />

            <Detalle
              titulo="Formador / perfil requerido"
              valor={
                actividad.formador_perfil_requerido
              }
            />

            <Detalle
              titulo="Responsable"
              valor={
                actividad.responsable_nombre
              }
            />

            <Detalle
              titulo="Fecha programada"
              valor={
                formatearFecha(
                  actividad.fecha_programada
                )
              }
            />

            <Detalle
              titulo="Duración"
              valor={
                actividad.duracion_horas
                  ? `${actividad.duracion_horas} horas`
                  : '-'
              }
            />

            <Detalle
              titulo="Evidencia esperada"
              valor={
                actividad.evidencia_esperada
              }
            />

            <Detalle
              titulo="Meta"
              valor={
                actividad.meta
              }
            />
          </div>


          <DetalleGrande
            titulo="Objetivo de formación"
            valor={
              actividad.objetivo
            }
          />


          <DetalleGrande
            titulo="Descripción"
            valor={
              actividad.descripcion
            }
          />


          {/* ==============================================
              EJECUCIONES
          ============================================== */}

          <div>
            <h4
              className="
                text-xs
                font-bold
                uppercase
                text-slate-600
                mb-2
              "
            >
              Seguimiento de la actividad
            </h4>

            {actividad.ejecuciones
              ?.length ? (
              <div
                className="
                  space-y-2
                "
              >
                {actividad.ejecuciones.map(
                  (
                    ejecucion
                  ) => (
                    <div
                      key={
                        ejecucion.id
                      }
                      className="
                        border
                        border-slate-200
                        rounded-xl
                        p-3
                        bg-slate-50
                      "
                    >
                      <div
                        className="
                          flex
                          flex-col
                          md:flex-row
                          md:items-center
                          md:justify-between
                          gap-2
                        "
                      >
                        <div>
                          <p
                            className="
                              text-xs
                              font-semibold
                            "
                          >
                            {
                              formatearFecha(
                                ejecucion.fecha_ejecucion
                              )
                            }
                          </p>

                          <p
                            className="
                              text-[10px]
                              text-slate-500
                            "
                          >
                            {
                              ejecucion.reunion
                                ? 'Vinculada a reunión PESV'
                                : 'Registro histórico'
                            }
                          </p>
                        </div>


                        <div
                          className="
                            text-xs
                          "
                        >
                          Asistentes:{' '}

                          <strong>
                            {
                              ejecucion.numero_asistentes_real ??
                              ejecucion.numero_asistentes ??
                              0
                            }
                          </strong>
                        </div>
                      </div>


                      {ejecucion.reunion && (
                        <div
                          className="
                            mt-2
                            bg-blue-50
                            border
                            border-blue-100
                            rounded-lg
                            p-2
                            text-[10px]
                          "
                        >
                          <strong>
                            {
                              ejecucion.reunion.tipo_reunion
                            }
                          </strong>

                          {' · '}

                          {
                            ejecucion.reunion.descripcion
                          }
                        </div>
                      )}


                      {ejecucion.resultado && (
                        <p
                          className="
                            text-xs
                            text-slate-700
                            mt-2
                          "
                        >
                          <strong>
                            Resultado:
                          </strong>{' '}

                          {
                            ejecucion.resultado
                          }
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div
                className="
                  border
                  border-dashed
                  border-slate-300
                  rounded-xl
                  p-4
                  text-center
                  text-xs
                  text-slate-500
                "
              >
                No se han registrado ejecuciones para esta actividad.
              </div>
            )}
          </div>


          <div
            className="
              flex
              justify-end
              border-t
              border-slate-200
              pt-4
            "
          >
            <button
              onClick={
                cerrar
              }
              className="
                bg-slate-600
                hover:bg-slate-800
                text-white
                rounded-lg
                px-4
                py-2
                text-xs
              "
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ============================================================
// COMPONENTES FORMULARIO
// ============================================================

function SeccionTitulo({
  titulo,
}) {
  return (
    <div
      className="
        rounded-md
        border
        border-slate-300
        bg-slate-100
        px-3
        py-2
      "
    >
      <p
        className="
          text-[10px]
          font-bold
          uppercase
          tracking-wide
          text-slate-500
        "
      >
        {titulo}
      </p>
    </div>
  )
}


function Campo({
  label,
  clase = '',
  ...props
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
          text-xs
          font-semibold
          mb-1
        "
      >
        {label}
      </label>

      <input
        {...props}
        className="
          w-full
          border
          border-slate-300
          rounded-lg
          px-3
          py-2
          text-sm
        "
      />
    </div>
  )
}


function AreaTexto({
  label,
  ...props
}) {
  return (
    <div>
      <label
        className="
          block
          text-xs
          font-semibold
          mb-1
        "
      >
        {label}
      </label>

      <textarea
        {...props}
        className="
          w-full
          border
          border-slate-300
          rounded-lg
          px-3
          py-2
          text-sm
          resize-y
        "
      />
    </div>
  )
}


function SelectCampo({
  label,
  opciones,
  clase = '',
  ...props
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
          text-xs
          font-semibold
          mb-1
        "
      >
        {label}
      </label>

      <select
        {...props}
        className="
          w-full
          border
          border-slate-300
          rounded-lg
          px-3
          py-2
          text-sm
          bg-white
        "
      >
        {opciones.map(
          (
            opcion
          ) => (
            <option
              key={
                opcion
              }
              value={
                opcion
              }
            >
              {opcion}
            </option>
          )
        )}
      </select>
    </div>
  )
}


// ============================================================
// DETALLE
// ============================================================

function Detalle({
  titulo,
  valor,
}) {
  return (
    <div
      className="
        border
        border-slate-200
        rounded-xl
        p-3
      "
    >
      <p
        className="
          text-[9px]
          uppercase
          font-bold
          tracking-wide
          text-slate-500
        "
      >
        {titulo}
      </p>

      <p
        className="
          text-xs
          text-slate-800
          mt-1
        "
      >
        {valor || '-'}
      </p>
    </div>
  )
}


function DetalleGrande({
  titulo,
  valor,
}) {
  return (
    <div
      className="
        border
        border-slate-200
        rounded-xl
        p-3
        bg-slate-50
      "
    >
      <p
        className="
          text-[9px]
          uppercase
          font-bold
          tracking-wide
          text-slate-500
        "
      >
        {titulo}
      </p>

      <p
        className="
          text-xs
          text-slate-800
          mt-1
          whitespace-pre-wrap
        "
      >
        {valor || '-'}
      </p>
    </div>
  )
}