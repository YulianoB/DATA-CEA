// app/admin/programacion/page.jsx
'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import { CalendarDays, RefreshCw } from 'lucide-react'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import { BotonActualizar, ESTILO_FRANJA_SUPERIOR_MODAL } from '@/components/admin/EstiloModulo'

// =========================================================
// CONSTANTES
// =========================================================

const API_CATALOGOS =
  '/api/admin/programacion/catalogos'

const API_PROGRAMACION =
  '/api/admin/programacion'

const HORAS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
]

const DIAS_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

// =========================================================
// HELPERS
// =========================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}

function numero(
  valor
) {
  const resultado =
    Number(
      valor ||
      0
    )

  return Number.isFinite(
    resultado
  )
    ? resultado
    : 0
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
  return (
    user?.nombreCompleto ||
    user?.nombre_completo ||
    user?.usuario ||
    user?.nombre ||
    user?.correo ||
    user?.email ||
    ''
  )
}

function obtenerNombreEmpresa(
  user
) {
  return (
    user?.nombreEmpresa ||
    user?.nombre_empresa ||
    user?.empresa ||
    ''
  )
}

function fechaISO(
  fecha
) {
  const anio =
    fecha.getFullYear()

  const mes =
    String(
      fecha.getMonth() +
      1
    ).padStart(
      2,
      '0'
    )

  const dia =
    String(
      fecha.getDate()
    ).padStart(
      2,
      '0'
    )

  return `${anio}-${mes}-${dia}`
}

function sumarDias(
  fecha,
  dias
) {
  const copia =
    new Date(
      fecha
    )

  copia.setDate(
    copia.getDate() +
    dias
  )

  return copia
}

function obtenerLunes(
  fecha
) {
  const copia =
    new Date(
      fecha
    )

  const dia =
    copia.getDay()

  const diferencia =
    dia ===
    0
      ? -6
      : 1 - dia

  copia.setDate(
    copia.getDate() +
    diferencia
  )

  copia.setHours(
    12,
    0,
    0,
    0
  )

  return copia
}

function hoyColombia() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'America/Bogota',

      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',
    }
  ).format(
    new Date()
  )
}

function horaActualColombia() {
  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone:
        'America/Bogota',

      hour:
        '2-digit',

      minute:
        '2-digit',

      hour12:
        false,
    }
  ).format(
    new Date()
  )
}

function horarioYaPaso(
  fecha,
  hora
) {
  const hoy =
    hoyColombia()

  if (
    fecha <
    hoy
  ) {
    return true
  }

  if (
    fecha >
    hoy
  ) {
    return false
  }

  // =====================================================
  // LA HORA ACTUAL SIGUE DISPONIBLE HASTA QUE TERMINE
  //
  // Ejemplo:
  // 07:30 -> clase 07:00 - 08:00 todavía puede programarse
  // 08:00 -> la clase de 07:00 ya quedó vencida
  // =====================================================

  return horaFin(
    hora
  ) <=
    horaActualColombia()
}

// =========================================================
// CLASE FUTURA PARA CAMBIO DE ESTADO
// =========================================================
//
// REGLA:
//
// Fecha futura:
//   solo puede CANCELARSE.
//
// Hoy:
//   si la hora de inicio todavía no ha llegado,
//   solo puede CANCELARSE.
//
// La franja actual sí puede administrarse.
//
// Ejemplo:
//
// Hora actual 14:20
//
// 14:00 -> permite cambiar estado
// 15:00 -> solamente CANCELAR
//
// =========================================================

function claseFuturaParaEstado(
  fecha,
  hora
) {
  const hoy =
    hoyColombia()

  if (
    fecha >
    hoy
  ) {
    return true
  }

  if (
    fecha <
    hoy
  ) {
    return false
  }

  const horaClase =
    texto(
      hora
    ).slice(
      0,
      5
    )

  const horaActual =
    horaActualColombia()

  return horaClase >
    horaActual
}

function formatearFecha(
  valor
) {
  if (
    !valor
  ) {
    return '-'
  }

  const fecha =
    new Date(
      `${String(
        valor
      ).slice(
        0,
        10
      )}T12:00:00`
    )

  return new Intl.DateTimeFormat(
    'es-CO',
    {
      day:
        '2-digit',

      month:
        '2-digit',

      year:
        'numeric',
    }
  ).format(
    fecha
  )
}

function formatearFechaCorta(
  valor
) {
  if (
    !valor
  ) {
    return '-'
  }

  const fecha =
    new Date(
      `${String(
        valor
      ).slice(
        0,
        10
      )}T12:00:00`
    )

  return new Intl.DateTimeFormat(
    'es-CO',
    {
      day:
        '2-digit',

      month:
        'short',
    }
  ).format(
    fecha
  )
}

function horaFin(
  hora
) {
  if (
    !hora
  ) {
    return ''
  }

  const horaNumero =
    Number(
      hora.slice(
        0,
        2
      )
    )

  return `${String(
    horaNumero +
    1
  ).padStart(
    2,
    '0'
  )}:00`
}

// =========================================================
// FETCH SEGURO
// =========================================================

async function fetchJsonSeguro(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      {
        cache:
          'no-store',

        ...options,
      }
    )

  const textoRespuesta =
    await response.text()

  let data

  try {
    data =
      textoRespuesta
        ? JSON.parse(
            textoRespuesta
          )
        : {}
  } catch {
    console.error(
      `API NO JSON | ${url} | HTTP ${response.status} | ${textoRespuesta.slice(
        0,
        1000
      )}`
    )

    throw new Error(
      'El servidor devolvió una respuesta no válida.'
    )
  }

  if (
    !response.ok ||
    data?.status ===
      'error'
  ) {
    throw new Error(
      data?.message ||
      data?.error ||
      `Error HTTP ${response.status}`
    )
  }

  return data
}

// =========================================================
// BADGE ESTADO
// =========================================================

function BadgeEstado({
  estado,
}) {
  const estilos = {
    AGENDADA:
      'bg-blue-100 text-blue-700 border-blue-200',

    PENDIENTE_CARGUE:
      'bg-amber-100 text-amber-700 border-amber-200',

    DICTADA:
      'bg-emerald-100 text-emerald-700 border-emerald-200',

    NO_DICTADA:
      'bg-red-100 text-red-700 border-red-200',

    CANCELADA:
  'bg-gray-200 text-gray-700 border-gray-300',    
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2
        py-0.5
        text-[8px]
        font-bold
        whitespace-nowrap
        ${
          estilos[
            estado
          ] ||
          'bg-gray-100 text-gray-600 border-gray-200'
        }
      `}
    >
      {texto(
        estado
      ).replace(
        /_/g,
        ' '
      )}
    </span>
  )
}

// =========================================================
// MINI TARJETA PROGRESO
// =========================================================

function MiniProgreso({
  progreso,
  tipoProgramacion,
}) {
  if (
    !progreso
  ) {
    return (
      <div
        className="
          h-[58px]
          border
          border-gray-200
          rounded-lg
          bg-gray-50
          px-3
          flex
          items-center
          text-[9px]
          text-gray-400
        "
      >
        Sin progreso
      </div>
    )
  }

  return (
    <div
      className="
        h-[58px]
        border
        border-blue-200
        rounded-lg
        bg-blue-50
        px-3
        py-2
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-2
        "
      >
        <span
          className="
            text-[10px]
            font-black
            text-blue-800
          "
        >
          {progreso?.categoria}
        </span>

        {tipoProgramacion ===
        'CURSO_VIGENTE' ? (
          <span
            className="
              text-[9px]
              font-black
              text-gray-900
            "
          >
            {numero(
              progreso
                ?.clases_comprometidas
            )}
            /
            {numero(
              progreso
                ?.clases_requeridas
            )}
          </span>
        ) : (
          <span
            className="
              text-[9px]
              font-black
              text-purple-700
            "
          >
            Refuerzo
          </span>
        )}
      </div>

      <p
        className="
          mt-1
          text-[8px]
          text-gray-600
        "
      >
        {tipoProgramacion ===
'CURSO_VIGENTE'
  ? `${numero(
      progreso
        ?.disponibles_programar
    )} clase(s) disponibles`
  : progreso
      ?.clases_disponibles !==
      undefined
    ? `${numero(
        progreso
          ?.clases_disponibles
      )} de ${numero(
        progreso
          ?.clases_compradas
      )} clase(s) disponibles`
    : `${numero(
        progreso
          ?.refuerzos_dictados
      )} refuerzo(s) dictados`}
      </p>
    </div>
  )
}

// =========================================================
// MINI TARJETA INSTRUCTOR
// =========================================================

function MiniInstructor({
  instructor,
  tipoProgramacion,
}) {
  if (
    !instructor
  ) {
    return (
      <div
        className="
          h-[58px]
          border
          border-gray-200
          rounded-lg
          bg-gray-50
          px-3
          flex
          items-center
          text-[9px]
          text-gray-400
        "
      >
        Sin instructor
      </div>
    )
  }

  if (
    tipoProgramacion ===
    'REFUERZO'
  ) {
    return (
      <div
        className="
          h-[58px]
          border
          border-purple-200
          rounded-lg
          bg-purple-50
          px-3
          py-2
        "
      >
        <p
          className="
            text-[9px]
            font-black
            text-purple-800
          "
        >
          Refuerzo
        </p>

        <p
          className="
            mt-1
            text-[8px]
            text-purple-700
          "
        >
          No consume 240 h · Hoy:{' '}
          {numero(
            instructor
              ?.refuerzos_dia
          )}
        </p>
      </div>
    )
  }

  return (
    <div
      className="
        h-[58px]
        border
        border-slate-200
        rounded-lg
        bg-slate-50
        px-3
        py-2
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-2
        "
      >
        <span
          className="
            text-[9px]
            font-black
            text-slate-800
          "
        >
          {numero(
            instructor
              ?.horas_mes_curso_vigente
          )}
          /240 h
        </span>

        <span
          className="
            text-[8px]
            font-bold
            text-emerald-700
          "
        >
          {numero(
            instructor
              ?.horas_disponibles_mes
          )}{' '}
          disp.
        </span>
      </div>

      <p
        className="
          mt-1
          text-[8px]
          text-gray-600
        "
      >
        Hoy:{' '}
        {numero(
          instructor
            ?.clases_curso_vigente_dia
        )}
        /10 clases
      </p>
    </div>
  )
}

// =========================================================
// ALERTA DE VALIDACIÓN
// =========================================================

function AlertaValidacion({
  abierta,
  titulo,
  mensaje,
  onCerrar,
}) {
  if (
    !abierta
  ) {
    return null
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[70]
        bg-black/35
        flex
        items-center
        justify-center
        p-4
      "
    >
      <div
        className="
          w-full
          max-w-sm
          bg-white
          rounded-xl
          shadow-2xl
          border
          border-amber-200
          overflow-hidden
        "
      >
        {/* ===============================================
            ENCABEZADO
        =============================================== */}

        <div
          className="
            bg-amber-50
            border-b
            border-amber-200
            px-4
            py-3
            flex
            items-center
            gap-3
          "
        >
          <div
            className="
              w-9
              h-9
              shrink-0
              rounded-full
              bg-amber-100
              text-amber-700
              flex
              items-center
              justify-center
            "
          >
            <i className="fas fa-triangle-exclamation"></i>
          </div>

          <div
            className="
              min-w-0
            "
          >
            <p
              className="
                text-[8px]
                uppercase
                tracking-wide
                font-bold
                text-amber-700
              "
            >
              Validación
            </p>

            <h3
              className="
                text-[12px]
                font-black
                text-gray-900
              "
            >
              {titulo ||
                'Falta información'}
            </h3>
          </div>
        </div>

        {/* ===============================================
            MENSAJE
        =============================================== */}

        <div
          className="
            px-4
            py-4
          "
        >
          <p
            className="
              text-[11px]
              leading-5
              text-gray-700
              text-center
              font-medium
            "
          >
            {mensaje}
          </p>

          <div
            className="
              mt-4
              flex
              justify-center
            "
          >
            <button
              type="button"
              onClick={
                onCerrar
              }
              autoFocus
              className="
                min-w-[120px]
                bg-slate-800
                hover:bg-slate-900
                text-white
                rounded-lg
                px-4
                py-2
                text-[9px]
                font-black
                transition
              "
            >
              <i className="fas fa-check mr-1"></i>

              ENTENDIDO
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =========================================================
// MODAL
// =========================================================

function ModalClase({
  abierto,
  modo,
  clase,
  aprendiz,
  categoria,
  instructor,
  vehiculo,
  fecha,
  hora,
  progreso,
  tipoProgramacion,
  motivos,
  guardando,
  onCerrar,
  onProgramar,
  onCambiarEstado,
}) {
  const [
    nuevoEstado,
    setNuevoEstado,
  ] =
    useState('')

  const [
    motivoId,
    setMotivoId,
  ] =
    useState('')

  const [
    observacion,
    setObservacion,
  ] =
    useState('')

  const [
    confirmandoCancelacion,
    setConfirmandoCancelacion,
  ] =
    useState(
      false
    )

  // =======================================================
  // REINICIAR MODAL
  // =======================================================

  useEffect(
    () => {
      setNuevoEstado(
        ''
      )

      setMotivoId(
        clase
          ?.motivo_no_dictada_id ||
        ''
      )

      setObservacion(
        clase
          ?.observacion_no_dictada ||
        ''
      )

      setConfirmandoCancelacion(
        false
      )
    },
    [
      clase,
      abierto,
    ]
  )

  if (
    !abierto
  ) {
    return null
  }

  // =======================================================
  // PERSONA
  // =======================================================

  const aprendizModal =
    modo ===
    'EDITAR'
      ? (
          clase?.persona ||
          clase?.aprendiz ||
          clase?.cliente_refuerzo ||
          null
        )
      : aprendiz

  const instructorModal =
    modo ===
    'EDITAR'
      ? clase?.instructor
      : instructor

  const vehiculoModal =
    modo ===
    'EDITAR'
      ? clase?.vehiculo
      : vehiculo

  const categoriaModal =
    modo ===
    'EDITAR'
      ? clase?.categoria
      : categoria

  const fechaModal =
    modo ===
    'EDITAR'
      ? clase?.fecha
      : fecha

  const horaModal =
    modo ===
    'EDITAR'
      ? texto(
          clase?.hora_inicio
        ).slice(
          0,
          5
        )
      : hora

  const tipoModal =
    modo ===
    'EDITAR'
      ? clase?.tipo_programacion
      : tipoProgramacion

  const estadoActual =
    texto(
      clase?.estado
    ) ||
    'AGENDADA'

  // =======================================================
  // NÚMERO DE CLASE
  // =======================================================

  const numeroClase =
    tipoModal ===
      'CURSO_VIGENTE' &&
    progreso
      ? Math.min(
          numero(
            progreso
              ?.clases_requeridas
          ),
          numero(
            progreso
              ?.clases_comprometidas
          ) +
            (
              modo ===
              'NUEVA'
                ? 1
                : 0
            )
        )
      : null

  // =======================================================
  // CAMBIOS DE ESTADO DISPONIBLES
  // =======================================================
  //
  // CANCELAR únicamente se ofrece cuando está AGENDADA,
  // de acuerdo con la validación del API.
  //
  // CANCELADA queda como estado final.
  // =======================================================

  const esClaseFutura =
  claseFuturaParaEstado(
    fechaModal,
    horaModal
  )

const cambiosPorEstado = {
  AGENDADA:
    esClaseFutura
      ? [
          'CANCELADA',
        ]
      : [
          'PENDIENTE_CARGUE',
          'DICTADA',
          'NO_DICTADA',
          'CANCELADA',
        ],

  PENDIENTE_CARGUE: [
    'AGENDADA',
    'DICTADA',
    'NO_DICTADA',
  ],

  DICTADA: [
    'AGENDADA',
    'PENDIENTE_CARGUE',
    'NO_DICTADA',
  ],

  NO_DICTADA: [
    'AGENDADA',
    'PENDIENTE_CARGUE',
    'DICTADA',
  ],

  CANCELADA:
    [],
}

const estadosDisponibles =
  cambiosPorEstado[
    estadoActual
  ] ||
  []

  // =======================================================
  // ESTILOS DE ESTADO
  // =======================================================

  function estiloBotonEstado(
    estado
  ) {
    const seleccionado =
      nuevoEstado ===
      estado

    const estilos = {
      AGENDADA:
        seleccionado
          ? 'bg-blue-600 border-blue-700 text-white ring-2 ring-blue-200'
          : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100',

      PENDIENTE_CARGUE:
        seleccionado
          ? 'bg-amber-500 border-amber-600 text-white ring-2 ring-amber-200'
          : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100',

      DICTADA:
        seleccionado
          ? 'bg-emerald-600 border-emerald-700 text-white ring-2 ring-emerald-200'
          : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100',

      NO_DICTADA:
        seleccionado
          ? 'bg-red-600 border-red-700 text-white ring-2 ring-red-200'
          : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100',

      CANCELADA:
        seleccionado
          ? 'bg-gray-700 border-gray-800 text-white ring-2 ring-gray-300'
          : 'bg-gray-100 border-gray-400 text-gray-700 hover:bg-gray-200',
    }

    return (
      estilos[
        estado
      ] ||
      'bg-gray-50 border-gray-300 text-gray-700'
    )
  }

  // =======================================================
  // SELECCIONAR CAMBIO
  // =======================================================

  function seleccionarEstado(
    estado
  ) {
    setNuevoEstado(
      estado
    )

    setConfirmandoCancelacion(
      false
    )

    if (
      estado !==
      'NO_DICTADA'
    ) {
      setMotivoId(
        ''
      )

      setObservacion(
        ''
      )
    }
  }

  // =======================================================
  // GUARDAR ESTADO
  // =======================================================

  function guardarEstado() {
    if (
      !nuevoEstado
    ) {
      return
    }

    // =====================================================
    // CANCELACIÓN REQUIERE CONFIRMACIÓN VISUAL
    // =====================================================

    if (
      nuevoEstado ===
      'CANCELADA'
    ) {
      setConfirmandoCancelacion(
        true
      )

      return
    }

    onCambiarEstado({
      estado:
        nuevoEstado,

      motivo_no_dictada_id:
        nuevoEstado ===
        'NO_DICTADA'
          ? Number(
              motivoId
            )
          : null,

      observacion_no_dictada:
        nuevoEstado ===
        'NO_DICTADA'
          ? observacion
          : '',
    })
  }

  // =======================================================
  // CONFIRMAR CANCELACIÓN
  // =======================================================

  function confirmarCancelacion() {
    onCambiarEstado({
      estado:
        'CANCELADA',

      motivo_no_dictada_id:
        null,

      observacion_no_dictada:
        '',
    })
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        bg-black/40
        flex
        items-center
        justify-center
        p-3
      "
    >
      <div
        className="
          w-full
          max-w-md
          bg-white
          rounded-xl
          shadow-2xl
          border
          border-gray-200
          overflow-hidden
        "
      >
        <div className="mb-3">
          <EncabezadoModulo
            titulo="Programación de Clases Prácticas"
            subtitulo="Agenda semanal de aprendices, instructores y vehículos."
            icono={CalendarDays}
            rutaRegreso="/admin"
            textoRegreso="Menú Administrativo"
          />
          <div className="flex justify-end px-1 pt-2">
            <BotonActualizar type="button" onClick={cargarAgenda} disabled={cargandoAgenda}>
              <RefreshCw size={14} className={cargandoAgenda ? 'animate-spin' : ''} />
              Actualizar
            </BotonActualizar>
          </div>
        </div>

        {/* =================================================
            MENSAJES
        ================================================= */}

        {error && (
          <div
            className="
              mb-3
              bg-red-50
              border
              border-red-300
              rounded-lg
              px-3
              py-2
              text-xs
              text-red-700
            "
          >
            <i className="fas fa-triangle-exclamation mr-2"></i>

            {error}
          </div>
        )}

        {exito && (
          <div
            className="
              mb-3
              bg-emerald-50
              border
              border-emerald-300
              rounded-lg
              px-3
              py-2
              text-xs
              text-emerald-700
            "
          >
            <i className="fas fa-circle-check mr-2"></i>

            {exito}
          </div>
        )}

        {/* =================================================
            FILTROS COMPACTOS
        ================================================= */}

        <div
            className="
              border-2
              border-slate-400
              rounded-xl
              bg-slate-50
              shadow-sm
              p-3
              mb-3
            "
          >
          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-2
              xl:grid-cols-[150px_1.5fr_135px_150px_1.4fr_150px_minmax(165px,1.2fr)_110px]
              gap-x-1.5
              gap-y-2
              items-end
            "
          >
            {/* TIPO */}

            <div>
              <label
                className="
                  block
                  mb-1
                  text-[9px]
                  font-bold
                  text-gray-600
                "
              >
                Tipo
              </label>

              <select
                value={
                  tipoProgramacion
                }
                onChange={
                  event =>
                    cambiarTipoProgramacion(
                      event
                        .target
                        .value
                    )
                }
                className="
                  w-full
                  h-[38px]
                  border
                  border-gray-400
                  rounded-lg
                  px-2
                  text-xs
                  bg-white
                "
              >
                <option value="CURSO_VIGENTE">
                  Curso vigente
                </option>

                <option value="REFUERZO">
                  Refuerzo
                </option>
              </select>
            </div>

            {/* BUSCAR APRENDIZ */}

            <div
              className="
                relative
              "
            >
              <label
                className="
                  block
                  mb-1
                  text-[9px]
                  font-bold
                  text-gray-600
                "
              >
                Buscar aprendiz
              </label>

              <div
                className="
                  relative
                "
              >
                <input
                  type="text"
                  value={
                    busqueda
                  }
                  onChange={
                    event => {
                      if (
                        aprendiz
                      ) {
                        limpiarAprendiz()
                      }

                      setBusqueda(
                        event
                          .target
                          .value
                      )
                    }
                  }
                  placeholder="Nombre, documento o matrícula..."
                  className="
                    w-full
                    h-[38px]
                    border
                    border-gray-400
                    rounded-lg
                    px-3
                    pr-8
                    text-xs
                    bg-white
                    outline-none
                    focus:border-blue-500
                  "
                />

                {buscandoAprendiz && (
                  <i
                    className="
                      fas
                      fa-spinner
                      fa-spin
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-gray-400
                    "
                  ></i>
                )}

                {aprendiz && (
                  <button
                    type="button"
                    onClick={
                      limpiarAprendiz
                    }
                    className="
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-red-500
                    "
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>

              {!aprendiz &&
                resultadosAprendiz.length >
                  0 && (
                  <div
                    className="
                      absolute
                      z-30
                      left-0
                      right-0
                      mt-1
                      max-h-60
                      overflow-y-auto
                      bg-white
                      border
                      border-gray-300
                      rounded-lg
                      shadow-xl
                    "
                  >
                    {resultadosAprendiz.map(
                      item => (
                        <button
                          key={
                            item.id
                          }
                          type="button"
                          onClick={() =>
                            seleccionarAprendiz(
                              item
                            )
                          }
                          className="
                            w-full
                            text-left
                            px-3
                            py-2
                            border-b
                            last:border-b-0
                            border-gray-100
                            hover:bg-blue-50
                          "
                        >
                          <div
                          className="
                            flex
                            items-center
                            justify-between
                            gap-2
                          "
                        >
                          <p
                            className="
                              min-w-0
                              text-[10px]
                              font-black
                              text-gray-900
                              truncate
                            "
                          >
                            {
                              item
                                .nombre_completo
                            }
                          </p>

                          <div
                            className="
                              shrink-0
                              flex
                              flex-wrap
                              justify-end
                              gap-1
                            "
                          >
                            {(
                              Array.isArray(
                                item?.categorias
                              )
                                ? item.categorias
                                : item?.categoria
                                  ? [
                                      item.categoria,
                                    ]
                                  : []
                            ).map(
                              categoriaItem => (
                                <span
                                  key={
                                    categoriaItem
                                  }
                                  className={`
                                    inline-flex
                                    items-center
                                    rounded-full
                                    border
                                    px-1.5
                                    py-0.5
                                    text-[7px]
                                    font-black
                                    ${
                                      item
                                        ?.origen_programacion ===
                                      'CLIENTE_EXTERNO'
                                        ? 'bg-purple-100 text-purple-700 border-purple-300'
                                        : 'bg-blue-100 text-blue-700 border-blue-300'
                                    }
                                  `}
                                >
                                  {categoriaItem}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                          <p
                          className="
                            text-[8px]
                            text-gray-500
                          "
                        >
                          {
                            item.documento
                          }{' '}
                          ·{' '}
                          {
                            item.celular ||
                            'Sin celular'
                          }

                          {item
                            ?.origen_programacion ===
                          'CLIENTE_EXTERNO' ? (
                            <>
                              {' · '}

                              <span
                                className="
                                  font-bold
                                  text-purple-700
                                "
                              >
                                REFUERZO
                              </span>

                              {' · '}

                              {numero(
                                item
                                  ?.clases_disponibles
                              )}{' '}
                              clase(s) disponibles
                            </>
                          ) : (
                            <>
                              {' · Matrícula '}

                              {
                                item
                                  .consecutivo
                              }
                            </>
                          )}
                        </p>
                        </button>
                      )
                    )}
                  </div>
                )}
            </div>

            {/* CATEGORÍA */}

            <div>
              <label
                className="
                  block
                  mb-1
                  text-[9px]
                  font-bold
                  text-gray-600
                "
              >
                Categoría
              </label>

              <div
                className="
                  h-[38px]
                  flex
                  items-center
                  gap-1
                  overflow-x-auto
                "
              >
                {(
                  detalleAprendiz
                    ?.categorias ||
                  []
                ).length ===
                0 ? (
                  <div
                    className="
                      w-full
                      h-[38px]
                      border
                      border-gray-400
                      rounded-lg
                      bg-gray-100
                      flex
                      items-center
                      px-2
                      text-[9px]
                      text-gray-400
                    "
                  >
                    Sin categoría
                  </div>
                ) : (
                  (
                    detalleAprendiz
                      ?.categorias ||
                    []
                  ).map(
                    item => (
                      <button
                        key={
                          item
                        }
                        type="button"
                        onClick={() =>
                          cambiarCategoria(
                            item
                          )
                        }
                        className={`
                          h-[34px]
                          px-3
                          rounded-lg
                          border
                          text-[10px]
                          font-black
                          whitespace-nowrap
                          ${
                            categoria ===
                            item
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                          }
                        `}
                      >
                        {item}
                      </button>
                    )
                  )
                )}
              </div>
            </div>

            {/* PROGRESO */}

            <MiniProgreso
              progreso={
                progresoCategoria
              }
              tipoProgramacion={
                tipoProgramacion
              }
            />

            {/* INSTRUCTOR */}

            <div>
              <label
                className="
                  block
                  mb-1
                  text-[9px]
                  font-bold
                  text-gray-600
                "
              >
                Instructor
              </label>

              <select
                  value={
                    instructorId
                  }
                  onChange={
                    event =>
                      setInstructorId(
                        event
                          .target
                          .value
                      )
                  }
                  className="
                    w-full
                    h-[38px]
                    border
                    border-gray-400
                    rounded-lg
                    px-2
                    text-[10px]
                    bg-white
                  "
                >
                <option value="">
                  Seleccione...
                </option>

                {instructores.map(
                  item => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {
                        item
                          .nombre_completo
                      }
                      {' · '}
                      {tipoProgramacion ===
                      'CURSO_VIGENTE'
                        ? `${numero(
                            item
                              ?.horas_disponibles_mes
                          )} h disp.`
                        : `${numero(
                            item
                              ?.refuerzos_dia
                          )} refuerzo(s) hoy`}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* CARGA INSTRUCTOR */}

            <MiniInstructor
              instructor={
                instructorSeleccionado
              }
              tipoProgramacion={
                tipoProgramacion
              }
            />

            {/* VEHÍCULO */}

            <div>
              <label
                className="
                  block
                  mb-1
                  text-[9px]
                  font-bold
                  text-gray-600
                "
              >
                Vehículo
              </label>

              <select
                value={
                  vehiculoId
                }
                onChange={
                  event =>
                    setVehiculoId(
                      event
                        .target
                        .value
                    )
                }
                className="
                  w-full
                  h-[38px]
                  border
                  border-gray-400
                  rounded-lg
                  px-2
                  text-[10px]
                  bg-white
                "
              >
                <option value="">
                  Seleccione placa...
                </option>

                {vehiculos.map(
                  item => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {
                        item.placa
                      }{' '}
                      ·{' '}
                      {
                        item
                          .tipo_vehiculo
                      }
                      {item?.marca
                        ? ` · ${item.marca}`
                        : ''}
                    </option>
                  )
                )}
              </select>
            </div>
            
            {/* LIMPIAR */}

            <div>
              <label
                className="
                  block
                  mb-1
                  text-[9px]
                  font-bold
                  text-gray-600
                "
              >
                Acciones
              </label>

              <button
                type="button"
                onClick={
                  limpiarFiltros
                }
                className="
                  w-full
                  h-[38px]
                  rounded-lg
                  border
                  border-blue-600
                  bg-blue-500
                  hover:bg-blue-700
                  text-white
                  text-[9px]
                  font-black
                  flex
                  items-center
                  justify-center
                  gap-1.5
                  transition
                "
              >
                <i className="fas fa-filter-circle-xmark"></i>

                Limpiar
              </button>
            </div>
          </div>
          <div
  className="
    mt-2
    flex
    justify-end
  "
  
>
  
</div>

          {/* INFO APRENDIZ SELECCIONADO */}

          {aprendiz && (
            <div
              className="
                mt-2
                flex
                flex-wrap
                items-center
                gap-x-4
                gap-y-1
                text-[8px]
                text-gray-500
              "
            >
              <span>
                <i className="fas fa-user-graduate mr-1 text-blue-600"></i>

                <strong className="text-gray-800">
                  {
                    aprendiz
                      .nombre_completo
                  }
                </strong>
              </span>

              <span>
                Documento:{' '}
                <strong className="text-gray-800">
                  {
                    aprendiz
                      .documento
                  }
                </strong>
              </span>

              <span>
                Celular:{' '}
                <strong className="text-gray-800">
                  {
                    aprendiz
                      .celular ||
                    '-'
                  }
                </strong>
              </span>

              <span
                className="
                  text-blue-600
                  font-bold
                "
              >
                Sus clases se resaltan en la agenda.
              </span>
            </div>
          )}
        </div>

{/* =================================================
    SELECTOR DE VISTA
================================================= */}

<div
  className="
    mb-3
    flex
    flex-wrap
    items-center
    gap-2
  "
>
  <button
    type="button"
    onClick={() =>
      setVistaProgramacion(
        'AGENDA'
      )
    }
    className={`
      h-[38px]
      px-4
      rounded-lg
      border
      text-[9px]
      font-black
      transition
      ${
        vistaProgramacion ===
        'AGENDA'
          ? 'bg-slate-800 border-slate-800 text-white'
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      }
    `}
  >
    <i className="fas fa-calendar-week mr-2"></i>

    AGENDA SEMANAL
  </button>

  <button
    type="button"
    onClick={() => {
      setVistaProgramacion(
        'DISPONIBILIDAD'
      )

      setFechaDisponibilidad(
        hoyColombia()
      )
    }}
    className={`
      h-[38px]
      px-4
      rounded-lg
      border
      text-[9px]
      font-black
      transition
      ${
        vistaProgramacion ===
        'DISPONIBILIDAD'
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
      }
    `}
  >
    <i className="fas fa-users mr-2"></i>

    DISPONIBILIDAD INSTRUCTORES
  </button>
</div>

        {/* =================================================
            AGENDA SEMANAL
        ================================================= */}

        {vistaProgramacion ===
          'AGENDA' && (
          <div
            className="
              border
              border-gray-300
              rounded-xl
              overflow-hidden
            "
          >
          {/* HEADER AGENDA */}

          <div
            className="
              px-4
              py-2
              flex
              flex-col
              md:flex-row
              md:items-center
              md:justify-between
              gap-2
            "
            style={{ backgroundColor: ESTILO_FRANJA_SUPERIOR_MODAL.fondo, color: ESTILO_FRANJA_SUPERIOR_MODAL.texto }}
          >
            <div>
              <h2
                className="
                  text-xs
                  font-bold
                "
              >
                <i className="fas fa-calendar-week mr-2"></i>

                Agenda Semanal

                {instructorSeleccionado && (
                  <>
                    {' · '}
                    {
                      instructorSeleccionado
                        .nombre_completo
                    }
                  </>
                )}
              </h2>

              <p
                className="
                  mt-0.5
                  text-[8px]
                  text-slate-300
                "
              >
                {instructorSeleccionado
                  ? 'Seleccione un espacio disponible para programar o una clase existente para administrarla.'
                  : 'Seleccione un instructor para consultar su agenda.'}
              </p>
            </div>

            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <span
                className="
                  hidden
                  md:block
                  text-[8px]
                  text-slate-300
                  mr-2
                "
              >
                {formatearFecha(
                  fechaInicioSemana
                )}{' '}
                al{' '}
                {formatearFecha(
                  fechaFinSemana
                )}
              </span>

              <button
                type="button"
                onClick={
                  semanaAnterior
                }
                className="
                  w-8
                  h-8
                  rounded-lg
                  bg-white/10
                  hover:bg-white/20
                "
              >
                <i className="fas fa-chevron-left"></i>
              </button>

              <button
                type="button"
                onClick={
                  semanaActual
                }
                className="
                  h-8
                  px-3
                  rounded-lg
                  bg-white/10
                  hover:bg-white/20
                  text-[9px]
                  font-bold
                "
              >
                Hoy
              </button>

              <button
                type="button"
                onClick={
                  semanaSiguiente
                }
                className="
                  w-8
                  h-8
                  rounded-lg
                  bg-white/10
                  hover:bg-white/20
                "
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>

          {/* CUERPO AGENDA */}

          <div
            className="
              bg-gray-100
              p-2
            "
          >
            {!instructorSeleccionado &&
              !aprendiz ? (
              <div
                className="
                  h-[430px]
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-gray-600
                "
              >
                <i
                  className="
                    fas
                    fa-calendar-days
                    text-4xl
                    mb-3
                    text-gray-600
                  "
                ></i>

                <p
                className="
                  text-sm
                  font-black
                  text-gray-500
                "
              >
                Seleccione un instructor o una persona
              </p>

              <p
                className="
                  mt-1
                  text-[10px]
                "
              >
                La programación semanal aparecerá aquí.
              </p>
              </div>
            ) : cargandoAgenda ? (
              <div
                className="
                  h-[430px]
                  flex
                  items-center
                  justify-center
                  text-gray-500
                  text-xs
                "
              >
                <i className="fas fa-spinner fa-spin mr-2"></i>

                Consultando agenda...
              </div>
            ) : (
              <div
                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  lg:grid-cols-4
                  xl:grid-cols-7
                  gap-2
                "
              >
                {semana.map(
                  dia => (
                    <div
                      key={
                        dia.iso
                      }
                      className="
                        border
                        border-gray-200
                        rounded-xl
                        bg-white
                        overflow-hidden
                      "
                    >
                      {/* DÍA */}

                      <div
                        className={`
                          px-2
                          py-2
                          text-center
                          border-b
                          border-gray-200
                          ${
                            dia.iso ===
                            hoyColombia()
                              ? 'bg-blue-50'
                              : 'bg-white'
                          }
                        `}
                      >
                        <p
                          className="
                            text-[9px]
                            font-black
                            text-gray-700
                          "
                        >
                          {dia.nombre}
                        </p>

                        <p
                          className="
                            text-sm
                            font-black
                            text-blue-700
                          "
                        >
                          {
                            dia.dia
                          }
                        </p>

                        <p
                          className="
                            text-[7px]
                            text-gray-400
                          "
                        >
                          {formatearFechaCorta(
                            dia.iso
                          )}
                        </p>
                      </div>

                      {/* HORAS */}

                      <div
                        className="
                          p-2.5
                          space-y-1
                        "
                      >
                        {HORAS.map(
                        hora => {
                          const clase =
                            obtenerClaseHorario(
                              dia.iso,
                              hora
                            )

                          const horarioPasado =
                            horarioYaPaso(
                              dia.iso,
                              hora
                            )

                          // =====================================================
                          // PERSONA DE LA CLASE
                          //
                          // Puede ser:
                          // - aprendiz de curso
                          // - aprendiz con refuerzo
                          // - cliente externo de refuerzo
                          // =====================================================

                          const personaClase =
                            clase?.persona ||
                            clase?.aprendiz ||
                            clase?.cliente_refuerzo ||
                            null

                          const nombrePersonaClase =
                            personaClase
                              ?.nombre_completo ||
                            [
                              personaClase
                                ?.nombres,

                              personaClase
                                ?.apellidos,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                ' '
                              ) ||
                            '-'

                          // =====================================================
                          // RESALTAR PERSONA SELECCIONADA
                          // =====================================================

                          const esClienteExternoSeleccionado =
                            aprendiz
                              ?.origen_programacion ===
                            'CLIENTE_EXTERNO'

                          const esPersonaSeleccionada =
                            Boolean(
                              aprendiz &&
                              clase &&
                              (
                                esClienteExternoSeleccionado
                                  ? Number(
                                      clase
                                        ?.recibo_refuerzo_id
                                    ) ===
                                    Number(
                                      aprendiz
                                        ?.recibo_refuerzo_id
                                    )
                                  : Number(
                                      clase
                                        ?.matricula_id
                                    ) ===
                                    Number(
                                      aprendiz
                                        ?.matricula_id ||
                                      aprendiz?.id
                                    )
                              )
                            )

                          // =====================================================
                          // ESTILO ESTADO
                          // =====================================================

                          let claseEstilo =
                            'bg-white border-gray-300 hover:border-gray-500'

                          if (
                            clase?.estado ===
                            'AGENDADA'
                          ) {
                            claseEstilo =
                              'bg-blue-200 border-blue-300 hover:bg-blue-200 hover:border-blue-900'
                          }

                          if (
                            clase?.estado ===
                            'PENDIENTE_CARGUE'
                          ) {
                            claseEstilo =
                              'bg-amber-200 border-amber-300 hover:bg-amber-200 hover:border-amber-500'
                          }

                          if (
                            clase?.estado ===
                            'DICTADA'
                          ) {
                            claseEstilo =
                              'bg-emerald-100 border-emerald-300 hover:bg-emerald-200 hover:border-emerald-900'
                          }

                          if (
                            clase?.estado ===
                            'NO_DICTADA'
                          ) {
                            claseEstilo =
                              'bg-red-300 border-red-300 hover:bg-red-200 hover:border-red-900'
                          }

                          if (
                            esPersonaSeleccionada
                          ) {
                            claseEstilo +=
                              ' ring-2 ring-blue-500 ring-offset-1'
                          }

                          // =====================================================
                          // CLASE EXISTENTE
                          //
                          // SIEMPRE tiene prioridad sobre horario pasado.
                          // =====================================================

                          if (
                            clase
                          ) {
                            return (
                              <button
                                key={
                                  hora
                                }
                                type="button"
                                onClick={() =>
                                  abrirClase(
                                    clase
                                  )
                                }
                                className={`
                                  w-full
                                  min-h-[64px]
                                  border
                                  rounded-lg
                                  p-2
                                  text-left
                                  transition
                                  cursor-pointer
                                  ${claseEstilo}
                                `}
                              >
                                <div
                                  className="
                                    flex
                                    justify-between
                                    items-start
                                    gap-1
                                  "
                                >
                                  <span
                                    className="
                                      text-[8px]
                                      font-black
                                      text-gray-700
                                    "
                                  >
                                    {hora}
                                  </span>

                                  <BadgeEstado
                                    estado={
                                      clase
                                        ?.estado
                                    }
                                  />
                                </div>

                                {/* PERSONA */}

                                <p
                                  className="
                                    mt-1
                                    text-[8px]
                                    font-black
                                    text-gray-900
                                    leading-tight
                                  "
                                >
                                  {nombrePersonaClase}
                                </p>

                                <p
                                  className="
                                    mt-0.5
                                    text-[8px]
                                    text-gray-600
                                    leading-tight
                                  "
                                >
                                  {personaClase
                                    ?.documento ||
                                    '-'}
                                </p>

                                <p
                                  className="
                                    text-[8px]
                                    text-gray-600
                                    leading-tight
                                  "
                                >
                                  Cel.{' '}

                                  {personaClase
                                    ?.celular ||
                                    '-'}
                                </p>

                                {/* CATEGORÍA / VEHÍCULO / TIPO */}

                                <div
                                  className="
                                    mt-1
                                    flex
                                    items-center
                                    flex-wrap
                                    gap-1
                                  "
                                >
                                  <span
                                    className="
                                      text-[9px]
                                      font-bold
                                      text-gray-700
                                    "
                                  >
                                    {clase
                                      ?.categoria ||
                                      '-'}
                                    {' · '}
                                    {clase
                                      ?.vehiculo
                                      ?.placa ||
                                      '-'}
                                  </span>

                                  <span
                                    className={`
                                      inline-flex
                                      rounded-full
                                      border
                                      px-1.5
                                      py-0.5
                                      text-[7px]
                                      font-black
                                      ${
                                        clase
                                          ?.tipo_programacion ===
                                        'REFUERZO'
                                          ? 'bg-purple-100 text-purple-700 border-purple-300'
                                          : 'bg-slate-100 text-slate-700 border-slate-300'
                                      }
                                    `}
                                  >
                                    {clase
                                      ?.tipo_programacion ===
                                    'REFUERZO'
                                      ? 'REFUERZO'
                                      : 'CURSO'}
                                  </span>
                                </div>
                              </button>
                            )
                          }

                          // =====================================================
                          // HORARIO PASADO SIN CLASE
                          // =====================================================

                          if (
                            horarioPasado
                          ) {
                            return (
                              <div
                                key={
                                  hora
                                }
                                className="
                                  w-full
                                  min-h-[46px]
                                  border
                                  border-gray-200
                                  bg-gray-100
                                  rounded-lg
                                  px-2
                                  py-1.5
                                  text-left
                                  opacity-70
                                "
                              >
                                <div
                                  className="
                                    flex
                                    items-center
                                    justify-between
                                    gap-2
                                  "
                                >
                                  <span
                                    className="
                                      text-[8px]
                                      font-black
                                      text-gray-500
                                    "
                                  >
                                    {hora}
                                  </span>

                                  <span
                                    className="
                                      text-[7px]
                                      font-bold
                                      text-gray-400
                                    "
                                  >
                                    No disponible
                                  </span>
                                </div>

                                <p
                                  className="
                                    mt-1
                                    text-[7px]
                                    text-gray-400
                                  "
                                >
                                  Horario anterior
                                </p>
                              </div>
                            )
                          }

                          // =====================================================
                          // HORARIO FUTURO / VIGENTE DISPONIBLE
                          // =====================================================

                          return (
                            <button
                              key={
                                hora
                              }
                              type="button"
                              onClick={() =>
                                abrirNuevaClase(
                                  dia.iso,
                                  hora
                                )
                              }
                              className="
                                w-full
                                min-h-[46px]
                                border
                                border-emerald-200
                                bg-emerald-50
                                hover:bg-emerald-100
                                hover:border-emerald-400
                                rounded-lg
                                px-2
                                py-1.5
                                text-left
                                transition
                              "
                            >
                              <div
                                className="
                                  flex
                                  items-center
                                  justify-between
                                  gap-2
                                "
                              >
                                <span
                                  className="
                                    text-[8px]
                                    font-black
                                    text-gray-700
                                  "
                                >
                                  {hora}
                                </span>

                                <span
                                  className="
                                    text-[7px]
                                    font-bold
                                    text-emerald-700
                                  "
                                >
                                  Disponible
                                </span>
                              </div>

                              <p
                                className="
                                  mt-1
                                  text-[7px]
                                  text-emerald-700
                                "
                              >
                                <i className="fas fa-plus mr-1"></i>

                                Programar
                              </p>
                            </button>
                          )
                        }
                      )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* =================================================
    DISPONIBILIDAD DIARIA DE INSTRUCTORES
================================================= */}

{vistaProgramacion ===
  'DISPONIBILIDAD' && (
  <div
    className="
      border
      border-gray-300
      rounded-xl
      overflow-hidden
      bg-white
    "
  >
    {/* ===============================================
        HEADER
    =============================================== */}

    <div
      className="
        bg-slate-800
        text-white
        px-4
        py-3
        flex
        flex-col
        lg:flex-row
        lg:items-center
        lg:justify-between
        gap-3
      "
    >
      <div>
        <h2
          className="
            text-xs
            font-black
          "
        >
          <i className="fas fa-users-clock mr-2"></i>

          Disponibilidad de Instructores
        </h2>

        <p
          className="
            mt-1
            text-[8px]
            text-slate-300
          "
        >
          Vista general para distribuir las clases de forma equilibrada.
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
        <button
          type="button"
          onClick={
            disponibilidadAnterior
          }
          className="
            w-8
            h-8
            rounded-lg
            bg-white/10
            hover:bg-white/20
          "
        >
          <i className="fas fa-chevron-left"></i>
        </button>

        <button
          type="button"
          onClick={
            disponibilidadHoy
          }
          className="
            h-8
            px-3
            rounded-lg
            bg-white/10
            hover:bg-white/20
            text-[9px]
            font-black
          "
        >
          HOY
        </button>

        <button
          type="button"
          onClick={
            disponibilidadSiguiente
          }
          className="
            w-8
            h-8
            rounded-lg
            bg-white/10
            hover:bg-white/20
          "
        >
          <i className="fas fa-chevron-right"></i>
        </button>

        <div
          className="
            ml-1
            min-w-[120px]
            h-8
            rounded-lg
            bg-white
            text-gray-900
            flex
            items-center
            justify-center
            px-3
            text-[9px]
            font-black
          "
        >
          {formatearFecha(
            fechaDisponibilidad
          )}
        </div>
      </div>
    </div>

   

    {/* ===============================================
        CUERPO
    =============================================== */}

    <div
      className="
        bg-gray-100
        p-3
      "
    >
      {cargandoDisponibilidad ? (
        <div
          className="
            h-[300px]
            flex
            items-center
            justify-center
            text-xs
            text-gray-500
          "
        >
          <i className="fas fa-spinner fa-spin mr-2"></i>

          Consultando disponibilidad...
        </div>
      ) : !disponibilidadInstructores
          ?.instructores
          ?.length ? (
        <div
          className="
            h-[300px]
            flex
            flex-col
            items-center
            justify-center
            text-gray-500
          "
        >
          <i
            className="
              fas
              fa-user-clock
              text-4xl
              mb-3
              text-gray-300
            "
          ></i>

          <p
            className="
              text-sm
              font-black
            "
          >
            No hay instructores disponibles
          </p>

          <p
            className="
              mt-1
              text-[9px]
            "
          >
            Revise la fecha o la categoría seleccionada.
          </p>
        </div>
      ) : (
        <div
          className="
            overflow-x-auto
          "
        >
          <div
            className="
              min-w-[1450px]
            "
          >
           {/* ===========================================
                CABECERA HORAS
            =========================================== */}

            <div
              className="
                grid
                grid-cols-[260px_repeat(16,minmax(62px,1fr))]
                gap-1
                mb-1
              "
            >
              <div
                className="
                  bg-sky-700
                  text-yellow-300
                  border
                  border-sky-900
                  rounded-lg
                  px-3
                  py-2
                  text-[9px]
                  font-black
                  flex
                  items-center
                  justify-center
                  shadow-sm
                "
              >
                <i className="fas fa-user-tie mr-2"></i>

                INSTRUCTOR
              </div>

              {HORAS.map(
                hora => (
                  <div
                    key={
                      hora
                    }
                    className="
                      bg-sky-700
                      text-yellow-300
                      border
                      border-sky-900
                      rounded-lg
                      px-1
                      py-2
                      text-center
                      text-[8px]
                      font-black
                      shadow-sm
                    "
                  >
                    {hora}
                  </div>
                )
              )}
            </div>

            {/* ===========================================
                INSTRUCTORES
            =========================================== */}

            {disponibilidadInstructores
              .instructores
              .map(
                instructor => (
                  <div
                    key={
                      instructor.id
                    }
                    className="
                      grid
                      grid-cols-[260px_repeat(16,minmax(62px,1fr))]
                      gap-1
                      mb-1
                    "
                  >
                    {/* =================================
                        INFORMACIÓN INSTRUCTOR
                    ================================= */}

                    <div
                      className="
                        min-h-[66px]
                        border
                        border-gray-600
                        rounded-lg
                        bg-white
                        px-3
                        py-2
                      "
                    >
                      <p
                        className="
                          text-[9px]
                          font-black
                          text-gray-900
                          leading-tight
                        "
                      >
                        {
                          instructor
                            .nombre_completo
                        }
                      </p>

                      <div
                        className="
                          mt-1
                          flex
                          flex-wrap
                          gap-x-2
                          gap-y-0.5
                          text-[7px]
                          text-gray-500
                        "
                      >
                        <span>
                          Hoy:{' '}

                          <strong className="text-gray-800">
                            {numero(
                              instructor
                                ?.total_clases_dia
                            )}
                          </strong>
                        </span>

                        <span>
                          Mes:{' '}

                          <strong className="text-blue-700">
                            {numero(
                              instructor
                                ?.horas_mes_curso_vigente
                            )}
                            /240 h
                          </strong>
                        </span>

                        <span>
                          Libres:{' '}

                          <strong className="text-emerald-700">
                            {numero(
                              instructor
                                ?.horarios_disponibles
                            )}
                          </strong>
                        </span>
                      </div>

                      <p
                        className="
                          mt-1
                          text-[7px]
                          text-gray-400
                        "
                      >
                        {(
                          instructor
                            ?.categorias_habilitadas ||
                          []
                        ).join(
                          ' · '
                        )}
                      </p>
                    </div>

                    {/* =================================
                        HORARIOS
                    ================================= */}

                    {HORAS.map(
                      hora => {
                        const horario =
                          (
                            instructor
                              ?.horarios ||
                            []
                          ).find(
                            item =>
                              item
                                ?.hora ===
                              hora
                          )

                        const ocupado =
                          horario
                            ?.estado ===
                          'OCUPADO'

                        const disponible =
                          horario
                            ?.estado ===
                          'DISPONIBLE'

                        const pasado =
                        horarioYaPaso(
                          fechaDisponibilidad,
                          hora
                        )

                      // ===============================
                      // COLOR SEGÚN ESTADO DE LA CLASE
                      // ===============================

                      const estadoClase =
                        texto(
                          horario
                            ?.clase
                            ?.estado
                        )

                      let claseEstiloDisponibilidad =
                        'bg-blue-100 border-blue-300 hover:bg-blue-200 hover:border-blue-500'

                      if (
                        estadoClase ===
                        'AGENDADA'
                      ) {
                        claseEstiloDisponibilidad =
                          'bg-blue-200 border-blue-300 hover:bg-blue-300 hover:border-blue-500'
                      }

                      if (
                        estadoClase ===
                        'PENDIENTE_CARGUE'
                      ) {
                        claseEstiloDisponibilidad =
                          'bg-amber-200 border-amber-300 hover:bg-amber-300 hover:border-amber-500'
                      }

                      if (
                        estadoClase ===
                        'DICTADA'
                      ) {
                        claseEstiloDisponibilidad =
                          'bg-emerald-100 border-emerald-300 hover:bg-emerald-200 hover:border-emerald-500'
                      }

                      if (
                        estadoClase ===
                        'NO_DICTADA'
                      ) {
                        claseEstiloDisponibilidad =
                          'bg-red-300 border-red-300 hover:bg-red-200 hover:border-red-500'
                      }

                      // ===============================
                      // OCUPADO
                      // ===============================

                        if (
                          ocupado
                        ) {
                          const personaHorario =
                            horario
                              ?.clase
                              ?.persona ||
                            null

                          const vehiculoHorario =
                            horario
                              ?.clase
                              ?.vehiculo ||
                            null

                          return (
                            <button
                            key={
                              hora
                            }
                            type="button"
                            title="Abrir y administrar esta clase"
                            onClick={() =>
                              abrirClaseDesdeDisponibilidad(
                                instructor,
                                horario
                              )
                            }
                            className={`
                              min-h-[88px]
                              border
                              hover:shadow-sm
                              rounded-lg
                              px-1.5
                              py-1.5
                              text-left
                              transition
                              cursor-pointer
                              overflow-hidden
                              ${claseEstiloDisponibilidad}
                            `}
                          >
                              {/* NOMBRE */}

                              <p
                                className="
                                  text-[7px]
                                  font-black
                                  text-blue-900
                                  leading-tight
                                  truncate
                                "
                                title={
                                  personaHorario
                                    ?.nombre ||
                                  ''
                                }
                              >
                                {personaHorario
                                  ?.nombre ||
                                  (
                                    horario
                                      ?.clase
                                      ?.tipo_programacion ===
                                    'REFUERZO'
                                      ? 'CLIENTE REFUERZO'
                                      : 'APRENDIZ'
                                  )}
                              </p>

                              {/* DOCUMENTO */}

                              <p
                                className="
                                  mt-0.5
                                  text-[6px]
                                  font-bold
                                  text-gray-700
                                  leading-tight
                                  truncate
                                "
                              >
                                {personaHorario
                                  ?.tipo_documento ||
                                  'Doc.'}{' '}

                                {personaHorario
                                  ?.documento ||
                                  '-'}
                              </p>

                              {/* CATEGORÍA / PLACA */}

                              <p
                                className="
                                  mt-1
                                  text-[7px]
                                  font-black
                                  text-gray-700
                                  leading-tight
                                  truncate
                                "
                              >
                                {horario
                                  ?.clase
                                  ?.categoria ||
                                  '-'}

                                {' · '}

                                {vehiculoHorario
                                  ?.placa ||
                                  '-'}
                              </p>

                              {/* TIPO */}

                              <div
                                className="
                                  mt-1
                                  flex
                                  justify-center
                                "
                              >
                                <span
                                  className={`
                                    inline-flex
                                    rounded-full
                                    border
                                    px-1.5
                                    py-0.5
                                    text-[6px]
                                    font-black
                                    ${
                                      horario
                                        ?.clase
                                        ?.tipo_programacion ===
                                      'REFUERZO'
                                        ? 'bg-purple-100 text-purple-700 border-purple-300'
                                        : 'bg-slate-100 text-slate-700 border-slate-300'
                                    }
                                  `}
                                >
                                  {horario
                                    ?.clase
                                    ?.tipo_programacion ===
                                  'REFUERZO'
                                    ? 'REFUERZO'
                                    : 'CURSO'}
                                </span>
                              </div>

                              {/* ESTADO */}

                              <div
                                className="
                                  mt-1
                                  text-center
                                "
                              >
                                <span
                                  className={`
                                    inline-block
                                    rounded
                                    px-1
                                    py-0.5
                                    text-[6px]
                                    font-black
                                    leading-tight
                                    ${
                                      estadoClase ===
                                      'DICTADA'
                                        ? 'bg-emerald-600 text-white'
                                        : estadoClase ===
                                          'PENDIENTE_CARGUE'
                                          ? 'bg-amber-500 text-black'
                                          : estadoClase ===
                                            'NO_DICTADA'
                                            ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
      }
    `}
  >
    {estadoClase
      .replace(
        /_/g,
        ' '
      ) ||
      'AGENDADA'}
  </span>
</div>

{/* ABRIR */}

<div
  className="
    mt-1
    pt-1
    border-t
    border-black/10
    text-center
  "
>
                                <span
                                  className="
                                    text-[7px]
                                    font-black
                                    text-blue-700
                                    whitespace-nowrap
                                  "
                                >
                                  <i className="fas fa-pen-to-square mr-1"></i>

                                  ABRIR
                                </span>
                              </div>                            
                              </button>
                          )
                        }

                        // ===============================
                        // HORARIO ANTERIOR
                        // ===============================

                        if (
                          pasado
                        ) {
                          return (
                            <div
                              key={
                                hora
                              }
                              className="
                                min-h-[66px]
                                border
                                border-gray-200
                                bg-gray-200
                                rounded-lg
                                flex
                                flex-col
                                items-center
                                justify-center
                                opacity-70
                              "
                            >
                              <i
                                className="
                                  fas
                                  fa-clock
                                  text-gray-400
                                  text-[9px]
                                "
                              ></i>

                              <span
                                className="
                                  mt-1
                                  text-[6px]
                                  font-bold
                                  text-gray-500
                                "
                              >
                                PASÓ
                              </span>
                            </div>
                          )
                        }

                        // ===============================
                        // DISPONIBLE
                        // ===============================

                        if (
                            disponible
                          ) {
                            return (
                              <button
                                key={
                                  hora
                                }
                                type="button"
                                title={`Programar con ${instructor?.nombre_completo || 'este instructor'} a las ${hora}`}
                                onClick={() =>
                                  programarDesdeDisponibilidad(
                                    instructor,
                                    fechaDisponibilidad,
                                    hora
                                  )
                                }
                                className="
                                  min-h-[66px]
                                  border
                                  border-emerald-300
                                  bg-emerald-50
                                  hover:bg-emerald-100
                                  hover:border-emerald-500
                                  hover:shadow-sm
                                  rounded-lg
                                  flex
                                  flex-col
                                  items-center
                                  justify-center
                                  transition
                                  cursor-pointer
                                "
                              >
                                <i
                                  className="
                                    fas
                                    fa-circle-plus
                                    text-emerald-600
                                    text-[12px]
                                  "
                                ></i>

                                <span
                                  className="
                                    mt-1
                                    text-[6px]
                                    font-black
                                    text-emerald-700
                                  "
                                >
                                  DISPONIBLE
                                </span>

                                <span
                                  className="
                                    mt-0.5
                                    text-[6px]
                                    font-bold
                                    text-emerald-600
                                  "
                                >
                                  PROGRAMAR
                                </span>
                              </button>
                            )
                          }
                        // ===============================
                        // NO HABILITADO
                        // ===============================

                        return (
                          <div
                            key={
                              hora
                            }
                            title={
                              horario
                                ?.motivo ||
                              'No habilitado'
                            }
                            className="
                              min-h-[66px]
                              border
                              border-gray-300
                              bg-gray-100
                              rounded-lg
                              flex
                              flex-col
                              items-center
                              justify-center
                            "
                          >
                            <i
                              className="
                                fas
                                fa-ban
                                text-gray-400
                                text-[9px]
                              "
                            ></i>

                            <span
                              className="
                                mt-1
                                text-[6px]
                                font-bold
                                text-gray-500
                              "
                            >
                              NO HABIL.
                            </span>
                          </div>
                        )
                      }
                    )}
                  </div>
                )
              )}
          </div>
        </div>
      )}
    </div>

    {/* ===============================================
        LEYENDA DISPONIBILIDAD
            =============================================== */}

            <div
              className="
                border-t
                border-gray-200
                bg-white
                px-3
                py-2
                flex
                flex-wrap
                gap-4
                text-[8px]
                text-gray-600
              "
            >
              <span
                className="
                  inline-flex
                  items-center
                  gap-1
                "
              >
                <span
                  className="
                    w-3
                    h-3
                    rounded
                    bg-emerald-100
                    border
                    border-emerald-300
                  "
                ></span>

                Disponible
              </span>

              <span
                className="
                  inline-flex
                  items-center
                  gap-1
                "
              >
                <span
                  className="
                    w-3
                    h-3
                    rounded
                    bg-blue-100
                    border
                    border-blue-300
                  "
                ></span>

                Ocupado
              </span>

              <span
                className="
                  inline-flex
                  items-center
                  gap-1
                "
              >
                <span
                  className="
                    w-3
                    h-3
                    rounded
                    bg-gray-100
                    border
                    border-gray-300
                  "
                ></span>

                No habilitado / horario anterior
              </span>

              <span className="ml-auto text-gray-400">
                Los instructores aparecen ordenados por mayor disponibilidad.
              </span>
            </div>
          </div>
        )}

        {/* =================================================
            LEYENDA
        ================================================= */}

        {/* =================================================
    LEYENDA
================================================= */}

      {vistaProgramacion ===
        'AGENDA' && (
        <div
          className="
            mt-2
            flex
            flex-wrap
            items-center
            gap-2
            text-[8px]
            text-gray-500
          "
        >
          <span className="font-bold">
            Estados:
          </span>

          <BadgeEstado
            estado="AGENDADA"
          />

          <BadgeEstado
            estado="PENDIENTE_CARGUE"
          />

          <BadgeEstado
            estado="DICTADA"
          />

          <BadgeEstado
            estado="NO_DICTADA"
          />

          <BadgeEstado
            estado="CANCELADA"
          />
          {aprendiz && (
            <span
              className="
                ml-2
                inline-flex
                items-center
                gap-1
                text-blue-700
                font-bold
              "
            >
              <span
                className="
                  w-3
                  h-3
                  rounded
                  border-2
                  border-blue-500
                "
              ></span>

              Aprendiz seleccionado
            </span>
          )}
                </div>
      )}

      </div>

      {/* ===================================================
              ALERTA DE VALIDACIÓN
          =================================================== */}

          <AlertaValidacion
            abierta={
              Boolean(
                alertaValidacion
              )
            }
            titulo={
              alertaValidacion
                ?.titulo ||
              ''
            }
            mensaje={
              alertaValidacion
                ?.mensaje ||
              ''
            }
            onCerrar={() =>
              setAlertaValidacion(
                null
              )
            }
          />    

      {/* ===================================================
          MODAL CLASE
      =================================================== */}

      <ModalClase
        abierto={
          modalAbierto
        }
        modo={
          modoModal
        }
        clase={
          claseSeleccionada
        }
        aprendiz={
          detalleAprendiz ||
          aprendiz
        }
        categoria={
          categoria
        }
        instructor={
          instructorSeleccionado
        }
        vehiculo={
          vehiculoSeleccionado
        }
        fecha={
          fechaSeleccionada
        }
        hora={
          horaSeleccionada
        }
        progreso={
          progresoCategoria
        }
        tipoProgramacion={
          tipoProgramacion
        }
        motivos={
          motivosNoDictada
        }
        guardando={
          guardando
        }
        onCerrar={() =>
          setModalAbierto(
            false
          )
        }
        onProgramar={
          registrarClase
        }
        onCambiarEstado={
          cambiarEstadoClase
        }
      />
    </div>
  )
}