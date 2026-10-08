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
import { BotonActualizar, ESTILO_FRANJA_SUPERIOR_MODAL, ESTILO_BOTONES } from '@/components/admin/EstiloModulo'

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
        border-2
        border-[#3B617D]
        rounded-lg
        bg-[#F0F6FA]
        shadow-sm
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
        border-2
        border-[#3B617D]
        rounded-lg
        bg-[#F0F6FA]
        shadow-sm
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
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            bg-slate-800
            text-white
            px-4
            py-2.5
            flex
            items-center
            justify-between
            gap-3
          "
        >
          <div>
            <p
              className="
                text-[8px]
                uppercase
                tracking-wide
                text-slate-300
                font-bold
              "
            >
              {modo ===
              'NUEVA'
                ? 'Nueva programación'
                : 'Administrar clase'}
            </p>

            <h3
              className="
                text-xs
                font-black
              "
            >
              {modo ===
              'NUEVA'
                ? 'Programar clase práctica'
                : 'Detalle de clase práctica'}
            </h3>
          </div>

          <button
            type="button"
            onClick={
              onCerrar
            }
            className="
              w-7
              h-7
              rounded-lg
              hover:bg-white/10
            "
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* =================================================
            CONTENIDO
        ================================================= */}

        <div
          className="
            p-3
            max-h-[82vh]
            overflow-y-auto
          "
        >
          {/* =================================================
              PERSONA
          ================================================= */}

          <div
            className="
              border
              border-gray-200
              rounded-lg
              bg-gray-50
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
              <div
                className="
                  min-w-0
                "
              >
                <p
                  className="
                    text-[10px]
                    font-black
                    text-gray-900
                    truncate
                  "
                >
                  {aprendizModal
                    ?.nombre_completo ||
                    [
                      aprendizModal
                        ?.nombres,
                      aprendizModal
                        ?.apellidos,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' '
                      ) ||
                    '-'}
                </p>

                <p
                  className="
                    mt-0.5
                    text-[8px]
                    text-gray-600
                  "
                >
                  {aprendizModal
                    ?.tipo_doc ||
                    'Doc.'}{' '}
                  {aprendizModal
                    ?.documento ||
                    '-'}
                  {' · '}
                  Cel.{' '}
                  {aprendizModal
                    ?.celular ||
                    '-'}
                </p>
              </div>

              <span
                className={`
                  shrink-0
                  rounded-full
                  border
                  px-2
                  py-1
                  text-[7px]
                  font-black
                  ${
                    tipoModal ===
                    'REFUERZO'
                      ? 'bg-purple-100 text-purple-700 border-purple-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }
                `}
              >
                {tipoModal ===
                'REFUERZO'
                  ? 'REFUERZO'
                  : 'CURSO'}
              </span>
            </div>
          </div>

          {/* =================================================
              DATOS COMPACTOS
          ================================================= */}

          <div
            className="
              mt-2
              grid
              grid-cols-2
              gap-1.5
            "
          >
            <div
              className="
                border
                border-gray-200
                rounded-lg
                px-2
                py-1.5
              "
            >
              <span
                className="
                  text-[7px]
                  text-gray-500
                "
              >
                Fecha / hora
              </span>

              <p
                className="
                  text-[9px]
                  font-black
                  text-gray-900
                "
              >
                {formatearFecha(
                  fechaModal
                )}
                {' · '}
                {horaModal ||
                  '-'}
              </p>
            </div>

            <div
              className="
                border
                border-gray-200
                rounded-lg
                px-2
                py-1.5
              "
            >
              <span
                className="
                  text-[7px]
                  text-gray-500
                "
              >
                Categoría / vehículo
              </span>

              <p
                className="
                  text-[9px]
                  font-black
                  text-gray-900
                "
              >
                {categoriaModal ||
                  '-'}
                {' · '}
                {vehiculoModal
                  ?.placa ||
                  '-'}
              </p>
            </div>
          </div>

          <div
            className="
              mt-1.5
              border
              border-gray-200
              rounded-lg
              px-2
              py-1.5
            "
          >
            <span
              className="
                text-[7px]
                text-gray-500
              "
            >
              Instructor
            </span>

            <p
              className="
                text-[9px]
                font-black
                text-gray-900
              "
            >
              {instructorModal
                ?.nombre_completo ||
                [
                  instructorModal
                    ?.nombres,
                  instructorModal
                    ?.apellidos,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    ' '
                  ) ||
                '-'}
            </p>
          </div>

          {/* =================================================
              NÚMERO CLASE
          ================================================= */}

          {modo ===
            'NUEVA' &&
            tipoModal ===
              'CURSO_VIGENTE' &&
            progreso && (
              <div
                className="
                  mt-2
                  bg-blue-50
                  border
                  border-blue-200
                  rounded-lg
                  px-3
                  py-1.5
                  flex
                  items-center
                  justify-between
                "
              >
                <span
                  className="
                    text-[8px]
                    text-blue-700
                    font-bold
                  "
                >
                  Clase práctica
                </span>

                <span
                  className="
                    text-sm
                    font-black
                    text-blue-900
                  "
                >
                  {numeroClase}
                  /
                  {numero(
                    progreso
                      ?.clases_requeridas
                  )}
                </span>
              </div>
            )}

          {/* =================================================
              MODO EDITAR
          ================================================= */}

          {modo ===
            'EDITAR' && (
              <div
                className="
                  mt-3
                  border-t
                  border-gray-200
                  pt-3
                "
              >
                {/* ===========================================
                    ESTADO ACTUAL
                =========================================== */}

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
                      uppercase
                      tracking-wide
                      font-black
                      text-gray-500
                    "
                  >
                    Estado actual
                  </span>

                  <BadgeEstado
                    estado={
                      estadoActual
                    }
                  />
                </div>

                {/* ===========================================
                    CANCELADA - ESTADO FINAL
                =========================================== */}

                {estadoActual ===
                'CANCELADA' ? (
                  <div
                    className="
                      mt-2
                      bg-gray-100
                      border
                      border-gray-300
                      rounded-lg
                      px-3
                      py-2
                      text-[9px]
                      text-gray-600
                    "
                  >
                    <i className="fas fa-lock mr-2"></i>

                    La clase está cancelada y no admite nuevos cambios de estado.
                  </div>
                ) : (
                  <>
                    {/* =======================================
                        CAMBIOS DISPONIBLES
                    ======================================= */}

                    {estadoActual ===
                      'AGENDADA' &&
                      esClaseFutura && (
                        <div
                          className="
                            mt-2
                            border
                            border-amber-200
                            bg-amber-50
                            rounded-lg
                            px-3
                            py-2
                            text-[8px]
                            text-amber-800
                          "
                        >
                          <i className="fas fa-clock mr-1"></i>

                          Esta clase aún no ha iniciado. Por ahora únicamente puede cancelarse.
                        </div>
                      )}

                    <p
                      className="
                        mt-2
                        mb-1.5
                        text-[8px]
                        font-bold
                        text-gray-500
                      "
                    >
                      {estadoActual ===
                        'AGENDADA' &&
                      esClaseFutura
                        ? 'Acción disponible:'
                        : 'Cambiar a:'}
                    </p>

                    <div
                      className="
                        grid
                        grid-cols-2
                        gap-1.5
                      "
                    >
                      {estadosDisponibles.map(
                        estado => (
                          <button
                            key={
                              estado
                            }
                            type="button"
                            onClick={() =>
                              seleccionarEstado(
                                estado
                              )
                            }
                            className={`
                              min-h-[34px]
                              border
                              rounded-lg
                              px-2
                              py-1.5
                              text-[8px]
                              font-black
                              transition
                              ${estiloBotonEstado(
                                estado
                              )}
                            `}
                          >
                            {estado ===
                            'CANCELADA' && (
                              <i className="fas fa-ban mr-1"></i>
                            )}

                            {estado ===
                            'DICTADA' && (
                              <i className="fas fa-check mr-1"></i>
                            )}

                            {estado ===
                            'NO_DICTADA' && (
                              <i className="fas fa-circle-xmark mr-1"></i>
                            )}

                            {estado ===
                            'PENDIENTE_CARGUE' && (
                              <i className="fas fa-cloud-arrow-up mr-1"></i>
                            )}

                            {estado ===
                            'AGENDADA' && (
                              <i className="fas fa-calendar-check mr-1"></i>
                            )}

                            {texto(
                              estado
                            ).replace(
                              /_/g,
                              ' '
                            )}
                          </button>
                        )
                      )}
                    </div>

                    {/* =======================================
                        NO DICTADA
                    ======================================= */}

                    {nuevoEstado ===
                      'NO_DICTADA' && (
                      <div
                        className="
                          mt-2
                          bg-red-50
                          border
                          border-red-200
                          rounded-lg
                          p-2
                        "
                      >
                        <div
                          className="
                            grid
                            grid-cols-1
                            sm:grid-cols-2
                            gap-2
                          "
                        >
                          <div>
                            <label
                              className="
                                block
                                text-[8px]
                                font-bold
                                text-red-700
                                mb-1
                              "
                            >
                              Motivo
                            </label>

                            <select
                              value={
                                motivoId
                              }
                              onChange={
                                event =>
                                  setMotivoId(
                                    event
                                      .target
                                      .value
                                  )
                              }
                              className="
                                w-full
                                h-[34px]
                                border
                                border-red-300
                                rounded-lg
                                px-2
                                text-[9px]
                                bg-white
                              "
                            >
                              <option value="">
                                Seleccione...
                              </option>

                              {motivos.map(
                                motivo => (
                                  <option
                                    key={
                                      motivo.id
                                    }
                                    value={
                                      motivo.id
                                    }
                                  >
                                    {
                                      motivo.nombre
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div>
                            <label
                              className="
                                block
                                text-[8px]
                                font-bold
                                text-red-700
                                mb-1
                              "
                            >
                              Observación
                            </label>

                            <textarea
                              rows={
                                2
                              }
                              value={
                                observacion
                              }
                              onChange={
                                event =>
                                  setObservacion(
                                    event
                                      .target
                                      .value
                                  )
                              }
                              className="
                                w-full
                                border
                                border-red-300
                                rounded-lg
                                px-2
                                py-1.5
                                text-[9px]
                                resize-none
                              "
                              placeholder="Describa brevemente lo ocurrido..."
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* =======================================
                        CONFIRMACIÓN CANCELACIÓN
                    ======================================= */}

                    {confirmandoCancelacion && (
                      <div
                        className="
                          mt-2
                          border
                          border-gray-400
                          bg-gray-100
                          rounded-lg
                          p-3
                        "
                      >
                        <p
                          className="
                            text-[10px]
                            font-black
                            text-gray-900
                            text-center
                          "
                        >
                          ¿Está seguro de CANCELAR la clase?
                        </p>

                        <p
                          className="
                            mt-1
                            text-[8px]
                            text-gray-600
                            text-center
                          "
                        >
                          La cancelación libera el horario y quedará registrada en el historial.
                        </p>

                        <div
                          className="
                            mt-3
                            flex
                            justify-center
                            gap-2
                          "
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmandoCancelacion(
                                false
                              )

                              setNuevoEstado(
                                ''
                              )
                            }}
                            disabled={
                              guardando
                            }
                            className="
                              border
                              border-gray-300
                              bg-white
                              hover:bg-gray-50
                              text-gray-700
                              rounded-lg
                              px-4
                              py-2
                              text-[9px]
                              font-black
                              disabled:opacity-50
                            "
                          >
                            REGRESAR
                          </button>

                          <button
                            type="button"
                            onClick={
                              confirmarCancelacion
                            }
                            disabled={
                              guardando
                            }
                            className="
                              bg-gray-800
                              hover:bg-gray-900
                              text-white
                              rounded-lg
                              px-4
                              py-2
                              text-[9px]
                              font-black
                              disabled:opacity-50
                            "
                          >
                            {guardando ? (
                              <>
                                <i className="fas fa-spinner fa-spin mr-1"></i>

                                CANCELANDO...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-ban mr-1"></i>

                                CONFIRMAR
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

          {/* =================================================
              BOTONES
          ================================================= */}

          {!confirmandoCancelacion && (
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
                  onCerrar
                }
                disabled={
                  guardando
                }
                className="
                  border
                  border-gray-300
                  bg-white
                  hover:bg-gray-100
                  text-gray-700
                  px-3
                  py-2
                  rounded-lg
                  text-[9px]
                  font-bold
                  disabled:opacity-50
                "
              >
                Cerrar
              </button>

              {modo ===
              'NUEVA' ? (
                <button
                  type="button"
                  onClick={
                    onProgramar
                  }
                  disabled={
                    guardando
                  }
                  className="
                    bg-blue-600
                    hover:bg-blue-700
                    text-white
                    px-4
                    py-2
                    rounded-lg
                    text-[9px]
                    font-black
                    disabled:opacity-50
                  "
                >
                  {guardando ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-1"></i>

                      Registrando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-calendar-check mr-1"></i>

                      Programar clase
                    </>
                  )}
                </button>
              ) : estadoActual !==
                'CANCELADA' &&
                nuevoEstado && (
                <button
                  type="button"
                  onClick={
                    guardarEstado
                  }
                  disabled={
                    guardando ||
                    (
                      nuevoEstado ===
                        'NO_DICTADA' &&
                      (
                        !motivoId ||
                        !texto(
                          observacion
                        )
                      )
                    )
                  }
                  className={`
                    px-4
                    py-2
                    rounded-lg
                    text-[9px]
                    font-black
                    text-white
                    disabled:opacity-50
                    ${
                      nuevoEstado ===
                      'CANCELADA'
                        ? 'bg-gray-700 hover:bg-gray-900'
                        : 'bg-slate-800 hover:bg-slate-900'
                    }
                  `}
                >
                  {guardando ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-1"></i>

                      Guardando...
                    </>
                  ) : nuevoEstado ===
                    'CANCELADA' ? (
                    <>
                      <i className="fas fa-ban mr-1"></i>

                      Cancelar clase
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-1"></i>

                      Guardar cambio
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =========================================================
// PÁGINA
// =========================================================

export default function ProgramacionPage() {
  const router =
    useRouter()

  // =======================================================
  // SESIÓN
  // =======================================================

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
    useState('')

  const [
    empresaNombre,
    setEmpresaNombre,
  ] =
    useState('')

  const [
    sesionLista,
    setSesionLista,
  ] =
    useState(
      false
    )

  // =======================================================
  // CATÁLOGOS
  // =======================================================

  const [
    motivosNoDictada,
    setMotivosNoDictada,
  ] =
    useState([])

  // =======================================================
  // FILTROS
  // =======================================================

  const [
    tipoProgramacion,
    setTipoProgramacion,
  ] =
    useState(
      'CURSO_VIGENTE'
    )

  const [
    busqueda,
    setBusqueda,
  ] =
    useState('')

  const [
    resultadosAprendiz,
    setResultadosAprendiz,
  ] =
    useState([])

  const [
    buscandoAprendiz,
    setBuscandoAprendiz,
  ] =
    useState(
      false
    )

  const [
    aprendiz,
    setAprendiz,
  ] =
    useState(
      null
    )

  const [
    detalleAprendiz,
    setDetalleAprendiz,
  ] =
    useState(
      null
    )

  const [
    categoria,
    setCategoria,
  ] =
    useState('')

  const [
    instructores,
    setInstructores,
  ] =
    useState([])

  const [
    instructorId,
    setInstructorId,
  ] =
    useState('')

  const [
    vehiculos,
    setVehiculos,
  ] =
    useState([])

  const [
    vehiculoId,
    setVehiculoId,
  ] =
    useState('')

  // =======================================================
  // SEMANA
  // =======================================================

  const [
    inicioSemana,
    setInicioSemana,
  ] =
    useState(
      () =>
        obtenerLunes(
          new Date()
        )
    )

  const semana =
    useMemo(
      () =>
        Array.from(
          {
            length:
              7,
          },
          (
            _,
            indice
          ) => {
            const fecha =
              sumarDias(
                inicioSemana,
                indice
              )

            return {
              fecha,

              iso:
                fechaISO(
                  fecha
                ),

              nombre:
                DIAS_SEMANA[
                  indice
                ],

              dia:
                String(
                  fecha.getDate()
                ).padStart(
                  2,
                  '0'
                ),
            }
          }
        ),
      [
        inicioSemana,
      ]
    )

  const fechaInicioSemana =
    semana[0]?.iso

  const fechaFinSemana =
    semana[
      semana.length -
      1
    ]?.iso

// =======================================================
// VISTA DE PROGRAMACIÓN
// =======================================================

const [
  vistaProgramacion,
  setVistaProgramacion,
] =
  useState(
    'AGENDA'
  )

// =======================================================
// DISPONIBILIDAD DIARIA DE INSTRUCTORES
// =======================================================

const [
  fechaDisponibilidad,
  setFechaDisponibilidad,
] =
  useState(
    () =>
      hoyColombia()
  )

const [
  disponibilidadInstructores,
  setDisponibilidadInstructores,
] =
  useState(
    null
  )

const [
  cargandoDisponibilidad,
  setCargandoDisponibilidad,
] =
  useState(
    false
  )

  // =======================================================
  // AGENDA
  // =======================================================

  const [
    agenda,
    setAgenda,
  ] =
    useState([])

  const [
    cargandoAgenda,
    setCargandoAgenda,
  ] =
    useState(
      false
    )

  // =======================================================
  // MODAL
  // =======================================================

  const [
    modalAbierto,
    setModalAbierto,
  ] =
    useState(
      false
    )

  const [
    modoModal,
    setModoModal,
  ] =
    useState(
      'NUEVA'
    )

  const [
    claseSeleccionada,
    setClaseSeleccionada,
  ] =
    useState(
      null
    )

  const [
    fechaSeleccionada,
    setFechaSeleccionada,
  ] =
    useState('')

  const [
    horaSeleccionada,
    setHoraSeleccionada,
  ] =
    useState('')

  // =======================================================
  // MENSAJES
  // =======================================================

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    exito,
    setExito,
  ] =
    useState('')

  const [
    guardando,
    setGuardando,
  ] =
    useState(
      false
    )
  
    // =======================================================
// ALERTA DE VALIDACIÓN
// =======================================================

const [
  alertaValidacion,
  setAlertaValidacion,
] =
  useState(
    null
  )

  // =======================================================
  // SESIÓN
  // =======================================================

  useEffect(
    () => {
      try {
        const stored =
          localStorage.getItem(
            'currentUser'
          )

        if (
          !stored
        ) {
          router.push(
            '/login'
          )

          return
        }

        const usuario =
          JSON.parse(
            stored
          )

        const nitUsuario =
          obtenerNitUsuario(
            usuario
          )

        if (
          !nitUsuario
        ) {
          setError(
            'No se encontró el NIT del CEA en la sesión actual.'
          )

          setSesionLista(
            true
          )

          return
        }

        setUser(
          usuario
        )

        setNit(
          nitUsuario
        )

        setEmpresaNombre(
          obtenerNombreEmpresa(
            usuario
          )
        )

        setSesionLista(
          true
        )
      } catch (
        errorSesion
      ) {
        console.error(
          errorSesion
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
  // =======================================================
// MOSTRAR ALERTA DE VALIDACIÓN
// =======================================================

function mostrarAlertaValidacion(
  mensaje,
  titulo =
    'Falta información'
) {
  setAlertaValidacion({
    titulo,
    mensaje,
  })
}
  // =======================================================
  // USUARIO
  // =======================================================

  const usuarioOperacion =
    useMemo(
      () =>
        obtenerNombreUsuario(
          user
        ),
      [
        user,
      ]
    )

  // =======================================================
  // INSTRUCTOR SELECCIONADO
  // =======================================================

  const instructorSeleccionado =
    useMemo(
      () =>
        instructores.find(
          item =>
            Number(
              item?.id
            ) ===
            Number(
              instructorId
            )
        ) ||
        null,
      [
        instructores,
        instructorId,
      ]
    )

  // =======================================================
  // VEHÍCULO SELECCIONADO
  // =======================================================

  const vehiculoSeleccionado =
    useMemo(
      () =>
        vehiculos.find(
          item =>
            Number(
              item?.id
            ) ===
            Number(
              vehiculoId
            )
        ) ||
        null,
      [
        vehiculos,
        vehiculoId,
      ]
    )

  // =======================================================
  // PROGRESO CATEGORÍA
  // =======================================================

  const progresoCategoria =
  useMemo(
    
    () => {
      if (
        aprendiz
          ?.origen_programacion ===
        'CLIENTE_EXTERNO'
      ) {
        return {
          categoria:
            detalleAprendiz
              ?.categoria ||
            categoria,

          clases_compradas:
            numero(
              detalleAprendiz
                ?.clases_compradas ||
              detalleAprendiz
                ?.cantidad_clases_refuerzo
            ),

          clases_comprometidas:
            numero(
              detalleAprendiz
                ?.clases_comprometidas
            ),

          clases_disponibles:
            numero(
              detalleAprendiz
                ?.clases_disponibles
            ),

          refuerzos_dictados:
            numero(
              detalleAprendiz
                ?.clases_dictadas
            ),
        }
      }

      return (
        detalleAprendiz
          ?.progreso ||
        []
      ).find(
        item =>
          item?.categoria ===
          categoria
      ) ||
      null
    },
    [
      aprendiz,
      detalleAprendiz,
      categoria,
    ]
  )
  // =======================================================
// RESUMEN OPERATIVO DEL DÍA
// =======================================================

const resumenOperativo =
  useMemo(
    () => {
      const lista =
        Array.isArray(
          disponibilidadInstructores
            ?.instructores
        )
          ? disponibilidadInstructores
              .instructores
          : []

      if (
        lista.length ===
        0
      ) {
        return {
          totalInstructores:
            0,

          totalClases:
            0,

          cursoVigente:
            0,

          refuerzos:
            0,

          espaciosDisponibles:
            0,

          instructoresSinClases:
            0,

          instructoresConClases:
            0,

          horasMesAcumuladas:
            0,

          menorCarga:
            null,

          ranking:
            [],
        }
      }

      const totalInstructores =
        lista.length

      const totalClases =
        lista.reduce(
          (
            acumulado,
            item
          ) =>
            acumulado +
            numero(
              item
                ?.total_clases_dia
            ),
          0
        )

      const cursoVigente =
        lista.reduce(
          (
            acumulado,
            item
          ) =>
            acumulado +
            numero(
              item
                ?.clases_curso_vigente_dia
            ),
          0
        )

      const refuerzos =
        lista.reduce(
          (
            acumulado,
            item
          ) =>
            acumulado +
            numero(
              item
                ?.refuerzos_dia
            ),
          0
        )

      const espaciosDisponibles =
        lista.reduce(
          (
            acumulado,
            item
          ) =>
            acumulado +
            numero(
              item
                ?.horarios_disponibles
            ),
          0
        )

      const instructoresSinClases =
        lista.filter(
          item =>
            numero(
              item
                ?.total_clases_dia
            ) ===
            0
        ).length

      const instructoresConClases =
        totalInstructores -
        instructoresSinClases

      const horasMesAcumuladas =
        lista.reduce(
          (
            acumulado,
            item
          ) =>
            acumulado +
            numero(
              item
                ?.horas_mes_curso_vigente
            ),
          0
        )

      const ranking =
        [...lista]
          .sort(
            (
              a,
              b
            ) => {
              const diferenciaDia =
                numero(
                  a
                    ?.total_clases_dia
                ) -
                numero(
                  b
                    ?.total_clases_dia
                )

              if (
                diferenciaDia !==
                0
              ) {
                return diferenciaDia
              }

              return (
                numero(
                  a
                    ?.horas_mes_curso_vigente
                ) -
                numero(
                  b
                    ?.horas_mes_curso_vigente
                )
              )
            }
          )
          .slice(
            0,
            3
          )

      return {
        totalInstructores,

        totalClases,

        cursoVigente,

        refuerzos,

        espaciosDisponibles,

        instructoresSinClases,

        instructoresConClases,

        horasMesAcumuladas,

        menorCarga:
          ranking[0] ||
          null,

        ranking,
      }
    },
    [
      disponibilidadInstructores,
    ]
  )
  // =======================================================
  // CARGA INICIAL
  // =======================================================

  const cargarInicial =
    useCallback(
      async () => {
        if (
          !nit
        ) {
          return
        }

        try {
          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'inicial'
          )

          params.set(
            'nit',
            nit
          )

          const data =
            await fetchJsonSeguro(
              `${API_CATALOGOS}?${params.toString()}`
            )

          setMotivosNoDictada(
            data
              ?.data
              ?.motivos_no_dictada ||
            []
          )

          if (
            data
              ?.empresa
              ?.nombre
          ) {
            setEmpresaNombre(
              data
                .empresa
                .nombre
            )
          }
        } catch (
          errorInicial
        ) {
          console.error(
            errorInicial
          )
        }
      },
      [
        nit,
      ]
    )

  // =======================================================
  // PRECARGAR VEHÍCULOS
  // =======================================================

  const cargarVehiculos =
    useCallback(
      async (
        categoriaFiltro =
          ''
      ) => {
        if (
          !nit
        ) {
          return
        }

        try {
          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'vehiculos'
          )

          params.set(
            'nit',
            nit
          )

          params.set(
            'fecha',
            hoyColombia()
          )

          if (
            categoriaFiltro
          ) {
            params.set(
              'categoria',
              categoriaFiltro
            )
          }

          const data =
            await fetchJsonSeguro(
              `${API_CATALOGOS}?${params.toString()}`
            )

          setVehiculos(
            Array.isArray(
              data?.data
            )
              ? data.data
              : []
          )
        } catch (
          errorVehiculo
        ) {
          console.error(
            errorVehiculo
          )

          setVehiculos(
            []
          )
        }
      },
      [
        nit,
      ]
    )

  // =======================================================
  // CARGA INICIAL
  // =======================================================

  useEffect(
    () => {
      if (
        !sesionLista ||
        !nit
      ) {
        return
      }

      cargarInicial()

      cargarVehiculos()
    },
    [
      sesionLista,
      nit,
      cargarInicial,
      cargarVehiculos,
    ]
  )

  // =======================================================
  // BÚSQUEDA AUTOMÁTICA APRENDIZ
  // =======================================================

  useEffect(
    () => {
      const buscar =
        texto(
          busqueda
        )

      if (
        aprendiz ||
        !nit ||
        buscar.length <
          3
      ) {
        if (
          buscar.length <
          3
        ) {
          setResultadosAprendiz(
            []
          )
        }

        return
      }

      const timer =
        setTimeout(
          async () => {
            setBuscandoAprendiz(
              true
            )

            try {
              const params =
                new URLSearchParams()

              params.set(
                'recurso',
                'personas'
              )

              params.set(
                'nit',
                nit
              )

              params.set(
                'busqueda',
                buscar
              )

              params.set(
                'tipo_programacion',
                tipoProgramacion
              )

              const data =
                await fetchJsonSeguro(
                  `${API_CATALOGOS}?${params.toString()}`
                )

              setResultadosAprendiz(
                Array.isArray(
                  data?.data
                )
                  ? data.data
                  : []
              )
            } catch (
              errorBusqueda
            ) {
              console.error(
                errorBusqueda
              )

              setResultadosAprendiz(
                []
              )
            } finally {
              setBuscandoAprendiz(
                false
              )
            }
          },
          400
        )

      return () =>
        clearTimeout(
          timer
        )
    },
    [
      nit,
      busqueda,
      aprendiz,
      tipoProgramacion,
    ]
  )

  // =======================================================
  // CARGAR DETALLE APRENDIZ
  // =======================================================

  const cargarDetalleAprendiz =
    useCallback(
      async (
        matriculaId,
        fecha =
          hoyColombia()
      ) => {
        if (
          !nit ||
          !matriculaId
        ) {
          return null
        }

        const params =
          new URLSearchParams()

        params.set(
          'recurso',
          'aprendiz'
        )

        params.set(
          'nit',
          nit
        )

        params.set(
          'matricula_id',
          String(
            matriculaId
          )
        )

        params.set(
          'fecha',
          fecha
        )

        params.set(
          'tipo_programacion',
          tipoProgramacion
        )

        const data =
          await fetchJsonSeguro(
            `${API_CATALOGOS}?${params.toString()}`
          )

        setDetalleAprendiz(
          data?.data ||
          null
        )

        return data?.data ||
          null
      },
      [
        nit,
        tipoProgramacion,
      ]
    )

  // =======================================================
  // SELECCIONAR APRENDIZ
  // =======================================================

  async function seleccionarAprendiz(
  item
) {
  setError('')
  setExito('')

  setAprendiz(
    item
  )

  setBusqueda(
    item?.nombre_completo ||
    ''
  )

  setResultadosAprendiz(
    []
  )
  
  try {
    // =====================================================
    // CLIENTE EXTERNO DE REFUERZO
    // =====================================================

    if (
      item?.origen_programacion ===
      'CLIENTE_EXTERNO'
    ) {
      const reciboRefuerzoId =
        Number(
          item?.recibo_refuerzo_id
        )

      if (
        !reciboRefuerzoId
      ) {
        throw new Error(
          'No fue posible identificar el pago de refuerzo.'
        )
      }

      const params =
        new URLSearchParams()

      params.set(
        'recurso',
        'refuerzo'
      )

      params.set(
        'nit',
        nit
      )

      params.set(
        'recibo_refuerzo_id',
        String(
          reciboRefuerzoId
        )
      )

      params.set(
        'tipo_programacion',
        'REFUERZO'
      )

      const data =
        await fetchJsonSeguro(
          `${API_CATALOGOS}?${params.toString()}`
        )

      const detalle =
        data?.data ||
        null

      setDetalleAprendiz(
        detalle
      )

      const categoriaRefuerzo =
        detalle?.categoria ||
        (
          Array.isArray(
            detalle?.categorias
          )
            ? detalle.categorias[0]
            : ''
        )

      setCategoria(
        categoriaRefuerzo ||
        ''
      )

      return
    }

    // =====================================================
    // APRENDIZ
    // =====================================================

    const matriculaId =
      item?.matricula_id ||
      item?.id

    const detalle =
      await cargarDetalleAprendiz(
        matriculaId
      )

    const categorias =
      Array.isArray(
        detalle?.categorias
      )
        ? detalle.categorias
        : []

    if (
      categorias.length ===
      1
    ) {
      setCategoria(
        categorias[0]
      )
    } else {
      setCategoria(
        ''
      )
    }
  } catch (
    errorDetalle
  ) {
    setError(
      errorDetalle
        ?.message ||
      'No fue posible consultar la persona seleccionada.'
    )
  }
}

  // =======================================================
// LIMPIAR PERSONA
// =======================================================

function limpiarAprendiz() {
  setAprendiz(
    null
  )

  setDetalleAprendiz(
    null
  )

  setBusqueda(
    ''
  )

  setResultadosAprendiz(
    []
  )

  setCategoria(
    ''
  )

  setVehiculoId(
    ''
  )

  setError(
    ''
  )

  setExito(
    ''
  )

  // =====================================================
  // IMPORTANTE
  //
  // NO limpiar instructor.
  // NO limpiar agenda.
  //
  // El instructor representa la agenda que estamos
  // consultando, independientemente de la persona que
  // se vaya a programar.
  // =====================================================

  cargarInstructores(
    ''
  )

  cargarVehiculos(
    ''
  )
}

  // =======================================================
// LIMPIAR FILTROS
// =======================================================

function limpiarFiltros() {
  setBusqueda('')

  setResultadosAprendiz(
    []
  )

  setAprendiz(
    null
  )

  setDetalleAprendiz(
    null
  )

  setCategoria(
    ''
  )

  setInstructorId(
    ''
  )

  setVehiculoId(
    ''
  )

  setAgenda(
    []
  )

  setError('')
  setExito('')

  // =====================================================
  // VOLVER A CATÁLOGOS GENERALES
  // =====================================================

  cargarInstructores(
    ''
  )

  cargarVehiculos(
    ''
  )
}
  // =======================================================
// CAMBIAR TIPO DE PROGRAMACIÓN
// =======================================================

function cambiarTipoProgramacion(
  valor
) {
  setTipoProgramacion(
    valor
  )

  // =====================================================
  // LIMPIAR SOLO DATOS DE LA NUEVA PROGRAMACIÓN
  // =====================================================

  setBusqueda(
    ''
  )

  setResultadosAprendiz(
    []
  )

  setAprendiz(
    null
  )

  setDetalleAprendiz(
    null
  )

  setCategoria(
    ''
  )

  setVehiculoId(
    ''
  )

  setError(
    ''
  )

  setExito(
    ''
  )

  // =====================================================
  // NO TOCAR:
  //
  // instructorId
  // agenda
  //
  // La agenda pertenece al instructor seleccionado.
  // Cambiar CURSO/REFUERZO solamente cambia el tipo de
  // nueva programación que se desea realizar.
  // =====================================================

  cargarVehiculos(
    ''
  )
}
  // =======================================================
  // CAMBIAR CATEGORÍA
  // =======================================================

  function cambiarCategoria(
  valor
) {
  setCategoria(
    valor
  )

  setVehiculoId(
    ''
  )
}

  // =======================================================
// INSTRUCTORES
// =======================================================
//
// Sin categoría:
// carga todos los instructores habilitados.
//
// Con categoría:
// carga únicamente los compatibles.
//
// =======================================================

const cargarInstructores =
  useCallback(
    async (
      categoriaFiltro =
        categoria
    ) => {
      if (
        !nit
      ) {
        setInstructores(
          []
        )

        return
      }

      try {
        const params =
          new URLSearchParams()

        params.set(
          'recurso',
          'instructores'
        )

        params.set(
          'nit',
          nit
        )

        params.set(
          'fecha',
          hoyColombia()
        )

        params.set(
          'tipo_programacion',
          tipoProgramacion
        )

        if (
          categoriaFiltro
        ) {
          params.set(
            'categoria',
            categoriaFiltro
          )
        }

        const data =
          await fetchJsonSeguro(
            `${API_CATALOGOS}?${params.toString()}`
          )

        setInstructores(
          Array.isArray(
            data?.data
          )
            ? data.data
            : []
        )
      } catch (
        errorInstructor
      ) {
        console.error(
          errorInstructor
        )

        setInstructores(
          []
        )

        setError(
          errorInstructor
            ?.message ||
          'No fue posible consultar instructores.'
        )
      }
    },
    [
      nit,
      categoria,
      tipoProgramacion,
    ]
  )

// =======================================================
// PRECARGAR INSTRUCTORES AL ABRIR
// =======================================================

useEffect(
  () => {
    if (
      !sesionLista ||
      !nit
    ) {
      return
    }

    cargarInstructores('')
  },
  [
    sesionLista,
    nit,
    tipoProgramacion,
    cargarInstructores,
  ]
)

// =======================================================
// REFILTRAR RECURSOS AL CAMBIAR CATEGORÍA
// =======================================================
//
// La categoría define:
//
// - instructores compatibles;
// - vehículos compatibles.
//
// VEHÍCULOS:
//
// A2
//   -> MOTOCICLETA
//
// B1 / C1 / RC1
//   -> AUTOMOVIL / CAMIONETA
//
// C2
//   -> CAMION
//
// =======================================================

useEffect(
  () => {
    if (
      !nit
    ) {
      return
    }

    cargarInstructores(
      categoria
    )

    cargarVehiculos(
      categoria
    )
  },
  [
    nit,
    categoria,
    cargarInstructores,
    cargarVehiculos,
  ]
)

// =======================================================
// DISPONIBILIDAD DIARIA DE INSTRUCTORES
// =======================================================

const cargarDisponibilidadInstructores =
  useCallback(
    async (
      fechaConsulta =
        fechaDisponibilidad
    ) => {
      if (
        !nit ||
        !fechaConsulta
      ) {
        setDisponibilidadInstructores(
          null
        )

        return
      }

      setCargandoDisponibilidad(
        true
      )

      try {
        const params =
          new URLSearchParams()

        params.set(
          'recurso',
          'disponibilidad_instructores'
        )

        params.set(
          'nit',
          nit
        )

        params.set(
          'fecha',
          fechaConsulta
        )

        params.set(
          'tipo_programacion',
          tipoProgramacion
        )

        // =================================================
        // CATEGORÍA
        //
        // Si ya existe una categoría seleccionada,
        // mostramos únicamente instructores compatibles.
        //
        // Si no existe categoría, mostramos todos los
        // instructores documentalmente habilitados.
        // =================================================

        if (
          categoria
        ) {
          params.set(
            'categoria',
            categoria
          )
        }

        const data =
          await fetchJsonSeguro(
            `${API_CATALOGOS}?${params.toString()}`
          )

        setDisponibilidadInstructores(
          data?.data ||
          null
        )
      } catch (
        errorDisponibilidad
      ) {
        console.error(
          'Error cargando disponibilidad de instructores:',
          errorDisponibilidad
        )

        setDisponibilidadInstructores(
          null
        )

        setError(
          errorDisponibilidad
            ?.message ||
          'No fue posible consultar la disponibilidad de instructores.'
        )
      } finally {
        setCargandoDisponibilidad(
          false
        )
      }
    },
    [
      nit,
      fechaDisponibilidad,
      tipoProgramacion,
      categoria,
    ]
  )

// =======================================================
// RECARGAR DISPONIBILIDAD
// =======================================================

useEffect(
  () => {
    if (
      vistaProgramacion !==
        'DISPONIBILIDAD' ||
      !nit
    ) {
      return
    }

    cargarDisponibilidadInstructores(
      fechaDisponibilidad
    )
  },
  [
    vistaProgramacion,
    nit,
    fechaDisponibilidad,
    tipoProgramacion,
    categoria,
    cargarDisponibilidadInstructores,
  ]
)

// =======================================================
// NAVEGACIÓN DISPONIBILIDAD
// =======================================================

function disponibilidadAnterior() {
  const fecha =
    new Date(
      `${fechaDisponibilidad}T12:00:00`
    )

  setFechaDisponibilidad(
    fechaISO(
      sumarDias(
        fecha,
        -1
      )
    )
  )
}

function disponibilidadSiguiente() {
  const fecha =
    new Date(
      `${fechaDisponibilidad}T12:00:00`
    )

  setFechaDisponibilidad(
    fechaISO(
      sumarDias(
        fecha,
        1
      )
    )
  )
}

function disponibilidadHoy() {
  setFechaDisponibilidad(
    hoyColombia()
  )
}

  // =======================================================
  // AGENDA DEL INSTRUCTOR
  // =======================================================

  const cargarAgenda =
  useCallback(
    async () => {
      if (
        !nit ||
        !fechaInicioSemana ||
        !fechaFinSemana
      ) {
        setAgenda(
          []
        )

        return
      }

      const tieneInstructor =
        Boolean(
          instructorId
        )

      const esClienteExterno =
        aprendiz
          ?.origen_programacion ===
        'CLIENTE_EXTERNO'

      const matriculaId =
        !esClienteExterno
          ? Number(
              aprendiz
                ?.matricula_id ||
              aprendiz?.id ||
              0
            )
          : 0

      const reciboRefuerzoId =
        esClienteExterno
          ? Number(
              aprendiz
                ?.recibo_refuerzo_id ||
              0
            )
          : 0

      // ===================================================
      // SIN CRITERIO DE CONSULTA
      // ===================================================

      if (
        !tieneInstructor &&
        !matriculaId &&
        !reciboRefuerzoId
      ) {
        setAgenda(
          []
        )

        return
      }

      setCargandoAgenda(
        true
      )

      try {
        const params =
          new URLSearchParams()

        params.set(
          'recurso',
          'agenda'
        )

        params.set(
          'nit',
          nit
        )

        params.set(
          'fecha_inicio',
          fechaInicioSemana
        )

        params.set(
          'fecha_fin',
          fechaFinSemana
        )

        // =================================================
        // PRIORIDAD 1: INSTRUCTOR
        //
        // Si existe un instructor seleccionado,
        // mostramos SIEMPRE TODA su agenda.
        //
        // NO enviar:
        //
        // categoria
        // tipo_programacion
        // matricula_id
        // recibo_refuerzo_id
        // documento_persona
        //
        // porque cualquier clase ya asignada al instructor
        // ocupa físicamente ese horario, independientemente
        // de:
        //
        // - la categoría;
        // - CURSO o REFUERZO;
        // - el aprendiz o cliente.
        //
        // Ejemplo:
        //
        // 10:00 · A2 · CURSO
        //
        // significa que ese instructor NO puede programarse
        // a las 10:00 para:
        //
        // B1
        // C1
        // C2
        // REFUERZO
        // otra clase A2
        //
        // =================================================

        if (
          tieneInstructor
        ) {
          params.set(
            'instructor_id',
            String(
              instructorId
            )
          )
        }

        // =================================================
        // PRIORIDAD 2: PERSONA
        //
        // Si NO existe instructor seleccionado,
        // mostramos toda la agenda de la persona.
        //
        // La consulta por documento permite reunir todas
        // las matrículas/categorías del aprendiz o todos
        // los refuerzos del cliente.
        //
        // =================================================

        else if (
          aprendiz?.documento
        ) {
          params.set(
            'documento_persona',
            String(
              aprendiz.documento
            )
          )

          params.set(
            'origen_persona',
            aprendiz
              ?.origen_programacion ===
              'CLIENTE_EXTERNO'
              ? 'CLIENTE_EXTERNO'
              : 'APRENDIZ'
          )
        }     
        const data =
                await fetchJsonSeguro(
                  `${API_PROGRAMACION}?${params.toString()}`
                )

              setAgenda(
                Array.isArray(
                  data?.data
                )
                  ? data.data
                  : []
              )
            } catch (
              errorAgenda
            ) {
              console.error(
                'Error cargando agenda:',
                errorAgenda
              )

              setAgenda(
                []
              )

              setError(
                errorAgenda
                  ?.message ||
                'No fue posible consultar la agenda.'
              )
            } finally {
              setCargandoAgenda(
                false
              )
            }
          },
          [
            nit,
            instructorId,
            aprendiz,
            fechaInicioSemana,
            fechaFinSemana,
          ]
        )

  // =======================================================
// RECARGAR AGENDA AUTOMÁTICAMENTE
// =======================================================

useEffect(
  () => {
    if (
      !nit ||
      !fechaInicioSemana ||
      !fechaFinSemana
    ) {
      return
    }

    cargarAgenda()
  },
  [
    cargarAgenda,
  ]
)
  // =======================================================
// CLASE EN HORARIO
// =======================================================

function obtenerClaseHorario(
  fecha,
  hora
) {
  return agenda.find(
    item =>
      item?.fecha ===
        fecha &&
      texto(
        item?.hora_inicio
      ).slice(
        0,
        5
      ) ===
        hora &&
      texto(
        item?.estado
      ) !==
        'CANCELADA'
  )
}

// =======================================================
// PROGRAMAR DESDE DISPONIBILIDAD DE INSTRUCTORES
// =======================================================

async function programarDesdeDisponibilidad(
  instructor,
  fecha,
  hora
) {
  setError('')
  setExito('')

  if (
    !instructor?.id
  ) {
    mostrarAlertaValidacion(
      'No fue posible identificar el instructor seleccionado.',
      'Instructor no válido'
    )

    return
  }

  // =====================================================
  // SELECCIONAR INSTRUCTOR
  // =====================================================

  setInstructorId(
    String(
      instructor.id
    )
  )

  // =====================================================
  // IMPORTANTE
  //
  // No limpiamos:
  // aprendiz
  // categoria
  // vehiculo
  //
  // La idea es conservar la preparación que ya hizo
  // el usuario antes de consultar disponibilidad.
  // =====================================================

  // =====================================================
  // VALIDAR DATOS BÁSICOS ANTES DE CONTINUAR
  // =====================================================

  if (
    !aprendiz
  ) {
    mostrarAlertaValidacion(
      tipoProgramacion ===
        'REFUERZO'
        ? 'Seleccione primero un aprendiz o cliente de refuerzo.'
        : 'Seleccione primero un aprendiz.',
      tipoProgramacion ===
        'REFUERZO'
        ? 'Seleccione un cliente'
        : 'Seleccione un aprendiz'
    )

    return
  }

  if (
    !categoria
  ) {
    mostrarAlertaValidacion(
      'Seleccione primero la categoría que desea programar.',
      'Seleccione una categoría'
    )

    return
  }

  if (
    !vehiculoId
  ) {
    mostrarAlertaValidacion(
      'Seleccione primero la placa del vehículo que se utilizará.',
      'Seleccione un vehículo'
    )

    return
  }

  // =====================================================
  // ABRIR FLUJO EXISTENTE
  // =====================================================

  await abrirNuevaClase(
  fecha,
  hora,
  instructor
)
}
  // =======================================================
  // ABRIR NUEVA CLASE
  // =======================================================

 async function abrirNuevaClase(
  fecha,
  hora,
  instructorForzado =
    null
) {
    setError('')
setExito('')

// =====================================================
// HORARIO NO DISPONIBLE
// =====================================================

if (
  horarioYaPaso(
    fecha,
    hora
  )
) {
  const mensaje =
    'No es posible programar clases en fechas u horarios anteriores.'

  setError(
    mensaje
  )

  mostrarAlertaValidacion(
    mensaje,
    'Horario no disponible'
  )

  return
}

// =====================================================
// PERSONA
// =====================================================

if (
  !aprendiz
) {
  const mensaje =
    tipoProgramacion ===
      'REFUERZO'
      ? 'Seleccione un aprendiz o cliente de refuerzo antes de programar.'
      : 'Seleccione un aprendiz antes de programar.'

  setError(
    mensaje
  )

  mostrarAlertaValidacion(
    mensaje,
    tipoProgramacion ===
      'REFUERZO'
      ? 'Seleccione un cliente'
      : 'Seleccione un aprendiz'
  )

  return
}

// =====================================================
// CATEGORÍA
// =====================================================

if (
  !categoria
) {
  const mensaje =
    'Seleccione una categoría antes de programar la clase.'

  setError(
    mensaje
  )

  mostrarAlertaValidacion(
    mensaje,
    'Seleccione una categoría'
  )

  return
}

// =====================================================
// INSTRUCTOR
// =====================================================

const instructorParaProgramar =
  instructorForzado ||
  instructorSeleccionado

if (
  !instructorParaProgramar
) {
  const mensaje =
    'Seleccione un instructor para continuar con la programación.'

  setError(
    mensaje
  )

  mostrarAlertaValidacion(
    mensaje,
    'Falta seleccionar instructor'
  )

  return
}

// =====================================================
// VEHÍCULO
// =====================================================

if (
  !vehiculoSeleccionado
) {
  const mensaje =
    'Seleccione la placa del vehículo que se utilizará en la clase.'

  setError(
    mensaje
  )

  mostrarAlertaValidacion(
    mensaje,
    'Falta seleccionar vehículo'
  )

  return
}

try {
      // ===================================================
      // REFRESCAR APRENDIZ PARA EL DÍA SELECCIONADO
      // ===================================================

      if (
        aprendiz
          ?.origen_programacion ===
        'CLIENTE_EXTERNO'
      ) {
        const paramsRefuerzo =
          new URLSearchParams()

        paramsRefuerzo.set(
          'recurso',
          'refuerzo'
        )

        paramsRefuerzo.set(
          'nit',
          nit
        )

        paramsRefuerzo.set(
          'recibo_refuerzo_id',
          String(
            aprendiz
              ?.recibo_refuerzo_id
          )
        )

        paramsRefuerzo.set(
          'tipo_programacion',
          'REFUERZO'
        )

  const dataRefuerzo =
    await fetchJsonSeguro(
      `${API_CATALOGOS}?${paramsRefuerzo.toString()}`
    )

  const detalleRefuerzo =
    dataRefuerzo?.data ||
    null

  if (
      numero(
        detalleRefuerzo
          ?.clases_disponibles
      ) <=
      0
    ) {
      const mensaje =
        'El cliente ya no tiene clases de refuerzo disponibles.'

      setError(
        mensaje
      )

      mostrarAlertaValidacion(
        mensaje,
        'Sin clases disponibles'
      )

      return
    }

  setDetalleAprendiz(
    detalleRefuerzo
  )
} else {
  await cargarDetalleAprendiz(
    aprendiz
      ?.matricula_id ||
    aprendiz?.id,
    fecha
  )
}

      // ===================================================
      // REFRESCAR VEHÍCULO PARA FECHA/HORA
      // ===================================================

      const params =
        new URLSearchParams()

      params.set(
        'recurso',
        'vehiculos'
      )

      params.set(
        'nit',
        nit
      )

      params.set(
        'categoria',
        categoria
      )

      params.set(
        'fecha',
        fecha
      )

      params.set(
        'hora',
        hora
      )

      const data =
        await fetchJsonSeguro(
          `${API_CATALOGOS}?${params.toString()}`
        )

      const lista =
        Array.isArray(
          data?.data
        )
          ? data.data
          : []

      const vehiculoActual =
        lista.find(
          item =>
            Number(
              item?.id
            ) ===
            Number(
              vehiculoId
            )
        )

      if (
        !vehiculoActual
      ) {
        const mensaje =
          'El vehículo seleccionado no está habilitado para esta fecha o categoría.'

        setError(
          mensaje
        )

        mostrarAlertaValidacion(
          mensaje,
          'Vehículo no habilitado'
        )

        return
      }

      if (
        !vehiculoActual
          ?.disponible
      ) {
        const mensaje =
          vehiculoActual
            ?.motivo_no_disponible ||
          'El vehículo seleccionado ya está ocupado en este horario.'

        setError(
          mensaje
        )

        mostrarAlertaValidacion(
          mensaje,
          'Vehículo no disponible'
        )

        return
      }

      if (
        instructorForzado?.id
      ) {
        setInstructorId(
          String(
            instructorForzado.id
          )
        )
      }

      setFechaSeleccionada(
        fecha
      )

      setHoraSeleccionada(
        hora
      )

      setClaseSeleccionada(
        null
      )

      setModoModal(
        'NUEVA'
      )

      setModalAbierto(
        true
      )
    } catch (
      errorNueva
    ) {
      const mensaje =
        errorNueva
          ?.message ||
        'No fue posible preparar la programación.'

      setError(
        mensaje
      )

      mostrarAlertaValidacion(
        mensaje,
        'No es posible continuar'
      )
    }
  }

// =======================================================
// ABRIR CLASE DESDE DISPONIBILIDAD DE INSTRUCTORES
// =======================================================

async function abrirClaseDesdeDisponibilidad(
  instructor,
  horario
) {
  setError('')
  setExito('')

  const claseResumen =
    horario?.clase ||
    null

  if (
    !instructor?.id ||
    !claseResumen?.id
  ) {
    mostrarAlertaValidacion(
      'No fue posible identificar la clase seleccionada.',
      'Clase no disponible'
    )

    return
  }

  try {
    // =====================================================
    // SELECCIONAR INSTRUCTOR
    //
    // Esto también permite que al regresar posteriormente
    // a la agenda semanal quede seleccionado el instructor.
    // =====================================================

    setInstructorId(
      String(
        instructor.id
      )
    )

    // =====================================================
    // CONSULTAR LA CLASE COMPLETA
    //
    // La matriz únicamente contiene un resumen de la clase.
    // Consultamos la agenda del instructor para ese día
    // para obtener persona, vehículo, instructor, etc.
    // =====================================================

    const params =
      new URLSearchParams()

    params.set(
      'recurso',
      'agenda'
    )

    params.set(
      'nit',
      nit
    )

    params.set(
      'instructor_id',
      String(
        instructor.id
      )
    )

    params.set(
      'fecha_inicio',
      fechaDisponibilidad
    )

    params.set(
      'fecha_fin',
      fechaDisponibilidad
    )

    const data =
      await fetchJsonSeguro(
        `${API_PROGRAMACION}?${params.toString()}`
      )

    const clasesDia =
      Array.isArray(
        data?.data
      )
        ? data.data
        : []

    const claseCompleta =
      clasesDia.find(
        item =>
          Number(
            item?.id
          ) ===
          Number(
            claseResumen.id
          )
      ) ||
      null

    if (
      !claseCompleta
    ) {
      throw new Error(
        'La clase ya no se encuentra disponible. Actualice la programación.'
      )
    }

    // =====================================================
    // ABRIR EL MISMO MODAL EXISTENTE
    // =====================================================
    setFechaDisponibilidad(
      claseCompleta?.fecha ||
      fechaDisponibilidad
    )
    abrirClase(
      claseCompleta
    )
  } catch (
    errorClase
  ) {
    console.error(
      'Error abriendo clase desde disponibilidad:',
      errorClase
    )

    const mensaje =
      errorClase?.message ||
      'No fue posible consultar la clase seleccionada.'

    setError(
      mensaje
    )

    mostrarAlertaValidacion(
      mensaje,
      'No fue posible abrir la clase'
    )
  }
}

  // =======================================================
// ABRIR CLASE EXISTENTE
// =======================================================

function abrirClase(
  clase
) {
  setError(
    ''
  )

  setExito(
    ''
  )

  // =====================================================
  // TODA CLASE VISIBLE EN LA AGENDA DEL INSTRUCTOR
  // PUEDE SER ADMINISTRADA.
  //
  // La persona seleccionada sirve para NUEVAS
  // programaciones y para resaltado, pero no bloquea
  // la administración de otras clases del instructor.
  // =====================================================

  setClaseSeleccionada(
    clase
  )

  setModoModal(
    'EDITAR'
  )

  setFechaSeleccionada(
    clase?.fecha ||
    ''
  )

  setHoraSeleccionada(
    texto(
      clase?.hora_inicio
    ).slice(
      0,
      5
    )
  )

  setModalAbierto(
    true
  )
}
  // =======================================================
  // PROGRAMAR
  // =======================================================

  async function registrarClase() {
  setGuardando(
    true
  )

  setError('')
  setExito('')

  try {
    const esClienteExterno =
      aprendiz
        ?.origen_programacion ===
      'CLIENTE_EXTERNO'

    const matriculaId =
      esClienteExterno
        ? null
        : Number(
            aprendiz
              ?.matricula_id ||
            aprendiz?.id
          )

    const reciboRefuerzoId =
      esClienteExterno
        ? Number(
            aprendiz
              ?.recibo_refuerzo_id
          )
        : null

    const data =
      await fetchJsonSeguro(
        API_PROGRAMACION,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              accion:
                'programar',

              nit,

              matricula_id:
                matriculaId,

              recibo_refuerzo_id:
                reciboRefuerzoId,

              instructor_id:
                Number(
                  instructorId
                ),

              vehiculo_id:
                Number(
                  vehiculoId
                ),

              categoria,

              fecha:
                fechaSeleccionada,

              hora_inicio:
                horaSeleccionada,

              tipo_programacion:
                tipoProgramacion,

              usuario:
                usuarioOperacion,
            }),
        }
      )

    setExito(
      data?.message ||
      'Clase programada correctamente.'
    )

    setModalAbierto(
      false
    )

    // =====================================================
    // REFRESCAR INFORMACIÓN DESPUÉS DE PROGRAMAR
    // =====================================================

    const tareas = [
      cargarAgenda(),

      cargarInstructores(
        categoria
      ),

      cargarVehiculos(
        categoria
      ),

      cargarDisponibilidadInstructores(
        fechaSeleccionada
      ),
    ]

    // =====================================================
    // APRENDIZ
    // =====================================================

    if (
      !esClienteExterno &&
      matriculaId
    ) {
      tareas.push(
        cargarDetalleAprendiz(
          matriculaId,
          fechaSeleccionada
        )
      )
    }

    // =====================================================
    // CLIENTE EXTERNO DE REFUERZO
    // =====================================================

    if (
      esClienteExterno &&
      reciboRefuerzoId
    ) {
      tareas.push(
        (async () => {
          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'refuerzo'
          )

          params.set(
            'nit',
            nit
          )

          params.set(
            'recibo_refuerzo_id',
            String(
              reciboRefuerzoId
            )
          )

          params.set(
            'tipo_programacion',
            'REFUERZO'
          )

          const detalle =
            await fetchJsonSeguro(
              `${API_CATALOGOS}?${params.toString()}`
            )

          setDetalleAprendiz(
            detalle?.data ||
            null
          )
        })()
      )
    }

    await Promise.all(
      tareas
    )
  } catch (
      errorRegistro
    ) {
      const mensaje =
        errorRegistro
          ?.message ||
        'No fue posible programar la clase.'

      setError(
        mensaje
      )

      mostrarAlertaValidacion(
        mensaje,
        'No es posible programar la clase'
      )
    } finally {
    setGuardando(
      false
    )
  }
}
  // =======================================================
  // CAMBIAR ESTADO
  // =======================================================

  async function cambiarEstadoClase(
    cambios
  ) {
    if (
      !claseSeleccionada?.id
    ) {
      return
    }

    setGuardando(
      true
    )

    setError('')
    setExito('')

    try {
      const data =
        await fetchJsonSeguro(
          API_PROGRAMACION,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                accion:
                  'cambiar_estado',

                nit,

                id:
                  claseSeleccionada.id,

                usuario:
                  usuarioOperacion,

                ...cambios,
              }),
          }
        )

      setExito(
        data?.message ||
        'Estado actualizado correctamente.'
      )

      setModalAbierto(
        false
      )

      await Promise.all([
  // =====================================================
  // AGENDA SEMANAL
  // =====================================================

  cargarAgenda(),

  // =====================================================
  // DISPONIBILIDAD DIARIA
  //
  // Siempre la actualizamos, aunque actualmente estemos
  // visualizando la agenda semanal.
  //
  // Esto permite que al regresar a Disponibilidad la
  // información ya esté actualizada.
  // =====================================================

  cargarDisponibilidadInstructores(
    claseSeleccionada
      ?.fecha ||
    fechaDisponibilidad ||
    hoyColombia()
  ),

  // =====================================================
  // APRENDIZ
  // =====================================================

  aprendiz?.id &&
  aprendiz
    ?.origen_programacion !==
      'CLIENTE_EXTERNO'
    ? cargarDetalleAprendiz(
        aprendiz
          ?.matricula_id ||
        aprendiz.id,
        claseSeleccionada
          ?.fecha ||
          hoyColombia()
      )
    : Promise.resolve(),

  // =====================================================
  // INSTRUCTORES
  // =====================================================

  cargarInstructores(
    categoria
  ),
])
    } catch (
      errorEstado
    ) {
      setError(
        errorEstado
          ?.message ||
        'No fue posible actualizar el estado.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }

  // =======================================================
  // NAVEGACIÓN SEMANA
  // =======================================================

  function semanaAnterior() {
    setInicioSemana(
      anterior =>
        sumarDias(
          anterior,
          -7
        )
    )
  }

  function semanaSiguiente() {
    setInicioSemana(
      anterior =>
        sumarDias(
          anterior,
          7
        )
    )
  }

  function semanaActual() {
    setInicioSemana(
      obtenerLunes(
        new Date()
      )
    )
  }

  // =======================================================
  // SESIÓN CARGANDO
  // =======================================================

  if (
    !sesionLista
  ) {
    return (
      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-gray-100
          text-gray-500
        "
      >
        <i className="fas fa-spinner fa-spin mr-2"></i>

        Cargando Programación...
      </div>
    )
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-br
        from-gray-100
        to-gray-200
        p-3
        md:p-4
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
          p-3
          md:p-4
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
              xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,0.95fr)_minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,0.7fr)]
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
            
            {/* LIMPIAR: alineado sin etiqueta */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="w-full h-[38px] rounded-lg border text-[9px] font-black flex items-center justify-center gap-1.5 transition hover:brightness-90"
                style={{ backgroundColor: ESTILO_BOTONES.limpiar.fondo, borderColor: ESTILO_BOTONES.limpiar.borde, color: ESTILO_BOTONES.limpiar.texto }}
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
    inline-flex
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
      whitespace-nowrap
      transition
      ${
        vistaProgramacion ===
        'AGENDA'
          ? 'bg-[#194567] border-[#194567] text-white shadow-sm'
          : 'bg-white border-[#94A3B8] text-[#29465D] hover:bg-[#F1F5F9]'
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
      whitespace-nowrap
      transition
      ${
        vistaProgramacion ===
        'DISPONIBILIDAD'
          ? 'bg-[#194567] border-[#194567] text-white shadow-sm'
          : 'bg-white border-[#94A3B8] text-[#29465D] hover:bg-[#F1F5F9]'
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