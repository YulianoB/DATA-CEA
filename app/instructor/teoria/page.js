// app/instructor/teoria/page.js

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
  cerrarSesion,
} from '@/lib/auth/logout'

import {
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  LoaderCircle,
} from 'lucide-react'

// ============================================================
// HELPERS
// ============================================================

function humanHM(totalMin) {
  const minutos =
    Math.max(
      0,
      Math.round(
        Number(
          totalMin ||
          0
        )
      )
    )

  const horas =
    Math.floor(
      minutos /
      60
    )

  const resto =
    minutos %
    60

  if (
    horas > 0 &&
    resto > 0
  ) {
    return `${horas} h ${resto} m`
  }

  if (
    horas > 0
  ) {
    return `${horas} h`
  }

  return `${minutos} m`
}

function normalizarRol(valor) {
  return String(
    valor ||
    ''
  )
    .trim()
    .toUpperCase()
    .replace(
      /_/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
}

function esRolPermitido(valor) {
  const rol =
    normalizarRol(
      valor
    )

  return (
    rol ===
      'INSTRUCTOR TEORÍA' ||
    rol ===
      'INSTRUCTOR TEORIA' ||
    rol ===
      'AUXILIAR ADMINISTRATIVO'
  )
}

// ============================================================
// PÁGINA
// ============================================================

export default function RegistroHorariosPage() {
  const router =
    useRouter()

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
  // JORNADA
  // ==========================================================

  const [
    tengoAbierta,
    setTengoAbierta,
  ] =
    useState(false)

  const [
    registroAbierto,
    setRegistroAbierto,
  ] =
    useState(null)

  const [
    cargandoEstado,
    setCargandoEstado,
  ] =
    useState(true)

  const [
    guardando,
    setGuardando,
  ] =
    useState(false)

  // ==========================================================
  // REUNIONES
  // ==========================================================

  const [
    reunionActiva,
    setReunionActiva,
  ] =
    useState(null)

  const [
    enviandoAsistencia,
    setEnviandoAsistencia,
  ] =
    useState(false)

  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(() => {
    const stored =
      localStorage.getItem(
        'currentUser'
      )

    if (!stored) {
      router.push(
        '/login'
      )

      return
    }

    try {
      const parsed =
        JSON.parse(
          stored
        )

      const nit =
        parsed?.nitEmpresa ||
        localStorage.getItem(
          'currentEmpresaNit'
        ) ||
        parsed?.empresa?.nit ||
        ''

      if (!nit) {
        toast.error(
          'No se encontró el CEA asociado a la sesión.'
        )

        return
      }

      if (
        !esRolPermitido(
          parsed?.rol ||
          parsed?.role
        )
      ) {
        toast.error(
          'El perfil actual no está autorizado para este módulo.'
        )

        router.push(
          '/login'
        )

        return
      }

      setUser(
        parsed
      )

      setNitActual(
        String(
          nit
        ).trim()
      )
    } catch (error) {
      console.error(
        'Error leyendo sesión:',
        error
      )

      localStorage.removeItem(
        'currentUser'
      )

      router.push(
        '/login'
      )
    }
  }, [
    router,
  ])

  // ==========================================================
  // CARGAR ESTADO DE JORNADA
  // ==========================================================

  const cargarEstado =
    async () => {
      if (
        !user?.usuario ||
        !nitActual
      ) {
        return
      }

      setCargandoEstado(
        true
      )

      try {
        const response =
          await fetch(
            `/api/horarios/simple?nit=${encodeURIComponent(
              nitActual
            )}&usuario=${encodeURIComponent(
              user.usuario
            )}`,
            {
              cache:
                'no-store',
            }
          )

        const result =
          await response.json()

        if (
          !response.ok ||
          result?.status !==
            'success'
        ) {
          toast.error(
            result?.message ||
            'No fue posible consultar el estado de la jornada.'
          )

          setTengoAbierta(
            false
          )

          setRegistroAbierto(
            null
          )

          return
        }

        const abierta =
          Boolean(
            result
              ?.tiene_jornada_abierta
          )

        setTengoAbierta(
          abierta
        )

        setRegistroAbierto(
          result?.jornada ||
          null
        )
      } catch (error) {
        console.error(
          'Error consultando jornada:',
          error
        )

        toast.error(
          'No fue posible consultar el estado de la jornada.'
        )

        setTengoAbierta(
          false
        )

        setRegistroAbierto(
          null
        )
      } finally {
        setCargandoEstado(
          false
        )
      }
    }

  useEffect(() => {
    if (
      !user ||
      !nitActual
    ) {
      return
    }

    cargarEstado()
  }, [
    user,
    nitActual,
  ])

  // ==========================================================
  // REUNIÓN ACTIVA
  // ==========================================================

  useEffect(() => {
    if (!nitActual) {
      return
    }

    let alive =
      true

    const cargarReunionActiva =
      async () => {
        try {
          const response =
            await fetch(
              `/api/reuniones/activa?nit=${encodeURIComponent(
                nitActual
              )}`,
              {
                cache:
                  'no-store',
              }
            )

          const result =
            await response.json()

          if (!alive) {
            return
          }

          if (
            !response.ok ||
            result?.status !==
              'success'
          ) {
            setReunionActiva(
              null
            )

            return
          }

          setReunionActiva(
            result?.data ||
            null
          )
        } catch {
          if (
            alive
          ) {
            setReunionActiva(
              null
            )
          }
        }
      }

    cargarReunionActiva()

    const intervalId =
      setInterval(
        cargarReunionActiva,
        60_000
      )

    return () => {
      alive =
        false

      clearInterval(
        intervalId
      )
    }
  }, [
    nitActual,
  ])

  // ==========================================================
  // EMAIL
  // ==========================================================

  const enviarCorreo =
    async ({
      para,
      asunto,
      html,
    }) => {
      if (!para) {
        return
      }

      try {
        const response =
          await fetch(
            '/api/email/enviar',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  para,
                  asunto,
                  html,
                }),
            }
          )

        const result =
          await response.json()

        if (
          !result?.ok
        ) {
          console.error(
            'Error enviando correo:',
            result?.error
          )
        }
      } catch (error) {
        console.error(
          'Error enviando correo:',
          error?.message ||
          error
        )
      }
    }

  // ==========================================================
  // REGISTRAR ASISTENCIA A REUNIÓN
  // ==========================================================

  const registrarAsistenciaReunion =
    async () => {
      if (
        !user ||
        !nitActual
      ) {
        toast.error(
          'No hay una sesión válida.'
        )

        return
      }

      if (
        !user?.documento
      ) {
        toast.error(
          'El usuario no tiene documento registrado.'
        )

        return
      }

      if (
        !reunionActiva
          ?.enlace_asistencia
      ) {
        toast.warning(
          'No hay reunión activa.'
        )

        return
      }

      setEnviandoAsistencia(
        true
      )

      try {
        const response =
          await fetch(
            '/api/asistencias',
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

                  enlace_asistencia:
                    reunionActiva
                      .enlace_asistencia,

                  user: {
                    documento:
                      user.documento,

                    nombreCompleto:
                      user.nombreCompleto ||
                      user.nombre_completo ||
                      '',

                    role:
                      user.rol ||
                      user.role ||
                      '',
                  },
                }),
            }
          )

        const result =
          await response.json()

        if (
          result?.status ===
          'success'
        ) {
          toast.success(
            'Asistencia registrada.'
          )

          return
        }

        if (
          result?.status ===
          'warning'
        ) {
          toast.warning(
            result?.message ||
            'Aviso.'
          )

          return
        }

        toast.error(
          result?.message ||
          'Error al registrar asistencia.'
        )
      } catch (error) {
        console.error(
          'Error registrando asistencia:',
          error
        )

        toast.error(
          'Error al registrar asistencia.'
        )
      } finally {
        setEnviandoAsistencia(
          false
        )
      }
    }

  // ==========================================================
  // MENSAJE DE ESTADO
  // ==========================================================

  const statusMessage =
    useMemo(() => {
      if (
        cargandoEstado
      ) {
        return ''
      }

      if (
        tengoAbierta &&
        registroAbierto
      ) {
        return (
          `Tiene una jornada abierta desde ` +
          `${registroAbierto.fecha_entrada || '-'} ` +
          `${registroAbierto.hora_entrada || '-'}`
        )
      }

      return (
        'No tiene jornada abierta. Puede registrar entrada.'
      )
    }, [
      cargandoEstado,
      tengoAbierta,
      registroAbierto,
    ])

  // ==========================================================
  // HABILITACIÓN
  // ==========================================================

  const entradaHabilitada =
    useMemo(() => {
      if (!user) {
        return false
      }

      return (
        esRolPermitido(
          user.rol ||
          user.role
        ) &&
        !tengoAbierta &&
        !guardando &&
        !cargandoEstado
      )
    }, [
      user,
      tengoAbierta,
      guardando,
      cargandoEstado,
    ])

  const salidaHabilitada =
    useMemo(() => {
      if (!user) {
        return false
      }

      return (
        esRolPermitido(
          user.rol ||
          user.role
        ) &&
        tengoAbierta &&
        Boolean(
          registroAbierto
        ) &&
        !guardando &&
        !cargandoEstado
      )
    }, [
      user,
      tengoAbierta,
      registroAbierto,
      guardando,
      cargandoEstado,
    ])

  // ==========================================================
  // REGISTRAR ENTRADA
  // ==========================================================

  const registrarEntrada =
    async () => {
      if (
        !entradaHabilitada ||
        !user ||
        !nitActual
      ) {
        return
      }

      setGuardando(
        true
      )

      try {
        const response =
          await fetch(
            '/api/horarios/simple',
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
                    'registrar_entrada',

                  usuario:
                    user.usuario,

                  nombre_completo:
                    user.nombreCompleto ||
                    user.nombre_completo ||
                    '',

                  rol:
                    user.rol ||
                    user.role ||
                    '',
                }),
            }
          )

        const result =
          await response.json()

        if (
          response.status ===
            409 ||
          result?.status ===
            'warning'
        ) {
          toast.warning(
            result?.message ||
            'Ya existe una jornada abierta.'
          )

          if (
            result?.jornada
          ) {
            setTengoAbierta(
              true
            )

            setRegistroAbierto(
              result.jornada
            )
          }

          return
        }

        if (
          !response.ok ||
          result?.status !==
            'success'
        ) {
          toast.error(
            result?.message ||
            'No fue posible registrar la entrada.'
          )

          return
        }

        const jornada =
          result?.jornada ||
          {}

        // ====================================================
        // CORREO
        // ====================================================

        if (
          result?.email
        ) {
          const asunto =
            `Entrada registrada - ${jornada.fecha_entrada || ''}`

          const html = `
            <p>Hola ${
              user.nombreCompleto ||
              user.nombre_completo ||
              ''
            },</p>

            <p>
              Se registró tu <b>entrada</b> correctamente.
            </p>

            <ul>
              <li>
                <b>Fecha:</b>
                ${jornada.fecha_entrada || '-'}
              </li>

              <li>
                <b>Hora:</b>
                ${jornada.hora_entrada || '-'}
              </li>

              <li>
                <b>Usuario:</b>
                ${user.usuario || '-'}
              </li>

              <li>
                <b>Rol:</b>
                ${jornada.rol || user.rol || '-'}
              </li>
            </ul>
          `

          enviarCorreo({
            para:
              result.email,

            asunto,

            html,
          })
        }

        toast.success(
          'Entrada registrada.'
        )

        // ====================================================
        // CERRAR SESIÓN
        // ====================================================

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              600
            )
        )

        cerrarSesion(
          router
        )
      } catch (error) {
        console.error(
          'Error registrando entrada:',
          error
        )

        toast.error(
          'No fue posible registrar la entrada.'
        )
      } finally {
        setGuardando(
          false
        )
      }
    }

  // ==========================================================
  // REGISTRAR SALIDA
  // ==========================================================

  const registrarSalida =
    async () => {
      if (
        !salidaHabilitada ||
        !user ||
        !nitActual ||
        !registroAbierto
      ) {
        return
      }

      setGuardando(
        true
      )

      try {
        const response =
          await fetch(
            '/api/horarios/simple',
            {
              method:
                'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  nit:
                    nitActual,

                  accion:
                    'registrar_salida',

                  usuario:
                    user.usuario,

                  rol:
                    user.rol ||
                    user.role ||
                    '',

                  registro_id:
                    registroAbierto.id,
                }),
            }
          )

        const result =
          await response.json()

        if (
          response.status ===
            409 ||
          result?.status ===
            'warning'
        ) {
          toast.warning(
            result?.message ||
            'La jornada ya se encuentra cerrada.'
          )

          await cargarEstado()

          return
        }

        if (
          !response.ok ||
          result?.status !==
            'success'
        ) {
          toast.error(
            result?.message ||
            'No fue posible registrar la salida.'
          )

          return
        }

        const jornada =
          result?.jornada ||
          {}

        const minutos =
          Number(
            result
              ?.duracion_minutos ||
            jornada
              ?.duracion_jornada ||
            0
          )

        // ====================================================
        // CORREO
        // ====================================================

        if (
          result?.email
        ) {
          const asunto =
            `Salida registrada - ${jornada.fecha_salida || ''}`

          const html = `
            <p>Hola ${
              user.nombreCompleto ||
              user.nombre_completo ||
              ''
            },</p>

            <p>
              Se registró tu <b>salida</b> correctamente.
            </p>

            <ul>
              <li>
                <b>Fecha:</b>
                ${jornada.fecha_salida || '-'}
              </li>

              <li>
                <b>Hora:</b>
                ${jornada.hora_salida || '-'}
              </li>

              <li>
                <b>Duración:</b>
                ${humanHM(minutos)}
              </li>

              <li>
                <b>Usuario:</b>
                ${user.usuario || '-'}
              </li>

              <li>
                <b>Rol:</b>
                ${jornada.rol || user.rol || '-'}
              </li>
            </ul>
          `

          enviarCorreo({
            para:
              result.email,

            asunto,

            html,
          })
        }

        toast.success(
          `Salida registrada. Duración: ${humanHM(
            minutos
          )}`
        )

        // ====================================================
        // CERRAR SESIÓN
        // ====================================================

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              800
            )
        )

        cerrarSesion(
          router
        )
      } catch (error) {
        console.error(
          'Error registrando salida:',
          error
        )

        toast.error(
          'No fue posible registrar la salida.'
        )
      } finally {
        setGuardando(
          false
        )
      }
    }

  // ==========================================================
  // RENDER
  // ==========================================================

  if (!user) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">

      <Toaster
        position="top-center"
        richColors
      />

      <div className="max-w-md w-full bg-white rounded-xl border border-[#DCE4EB] shadow-lg p-6">

        {/* ==================================================
            ENCABEZADO
        ================================================== */}

        <div className="flex flex-col items-center mb-6">

          <img
            src="/logo.png"
            alt="DATA CEA"
            className="h-12 w-auto object-contain mb-2"
          />

          <div className="flex items-center justify-center gap-2 text-[#173A57]">
            <Clock3 size={25} strokeWidth={2} />

            <h2 className="text-xl font-semibold uppercase text-center tracking-wide">
              Registro de Horarios
            </h2>
          </div>

          <div className="w-full h-[3px] bg-[#173A57] mt-3 rounded-full" />

        </div>

        {/* ==================================================
            INFORMACIÓN USUARIO
        ================================================== */}

        <p className="bg-[#DCEEF9] border border-[#A9BDCC] text-[#29465D] p-2 rounded-md mb-6 text-center text-sm">

          Usuario:{' '}

          <strong>
            {user.nombreCompleto ||
              user.nombre_completo}
          </strong>

          {' '}

          (
          {user.rol ||
            user.role}
          )

          {user.nombreEmpresa && (
            <span className="block mt-1">
              CEA:{' '}

              <strong>
                {user.nombreEmpresa}
              </strong>
            </span>
          )}

        </p>

        {/* ==================================================
            ESTADO JORNADA
        ================================================== */}

        <div
          className="text-center text-sm font-medium text-[#29465D] bg-[#F3F8FC] border border-[#A9BDCC] rounded px-3 py-2 mb-4 min-h-[1.5em]"
        >
          {cargandoEstado ? (
            <span>
              <LoaderCircle size={16} className="inline-block animate-spin mr-2" />
              Consultando jornada...
            </span>
          ) : (
            statusMessage
          )}
        </div>

        {/* ==================================================
            ASISTENCIA A REUNIÓN
        ================================================== */}

        {reunionActiva && (

          <div className="text-center mb-6">

            <button
              onClick={
                registrarAsistenciaReunion
              }
              disabled={
                enviandoAsistencia
              }
              className="text-[#173A57] hover:text-[#0968B0] hover:underline flex items-center justify-center gap-2 mx-auto disabled:opacity-60 transition-colors"
              title={
                `Reunión: ${
                  reunionActiva
                    .tipo_reunion ||
                  ''
                } (${
                  reunionActiva
                    .hora_inicio ||
                  ''
                }–${
                  reunionActiva
                    .hora_fin ||
                  ''
                })`
              }
            >

              <CheckCircle2 size={18} />

              {enviandoAsistencia
                ? 'Enviando...'
                : 'Registrar asistencia a reunión'}

            </button>

          </div>

        )}

        {/* ==================================================
            ENTRADA / SALIDA
        ================================================== */}

        <div className="grid grid-cols-2 gap-4 mb-6">

          <button
            onClick={
              registrarEntrada
            }
            disabled={
              !entradaHabilitada
            }
            className={`h-24 flex flex-col items-center justify-center gap-2 rounded-lg
              bg-[#DCEEF9] text-[#263746] shadow-md border border-[#A9BDCC]
              hover:bg-[#173A57] hover:text-white
              transform hover:-translate-y-1 hover:shadow-xl
              transition-all duration-200 ease-in-out text-sm font-medium
              ${
                !entradaHabilitada
                  ? 'opacity-50 cursor-not-allowed pointer-events-none'
                  : ''
              }`}
          >

            <LogIn size={26} strokeWidth={2} />

            {guardando
              ? 'Procesando...'
              : 'Entrada'}

          </button>

          <button
            onClick={
              registrarSalida
            }
            disabled={
              !salidaHabilitada
            }
            className={`h-24 flex flex-col items-center justify-center gap-2 rounded-lg
              bg-white text-gray-700 shadow-lg border border-gray-300
              hover:bg-[var(--primary)] hover:text-white
              transform hover:-translate-y-1 hover:shadow-xl
              transition-all duration-200 ease-in-out text-sm font-medium
              ${
                !salidaHabilitada
                  ? 'opacity-50 cursor-not-allowed pointer-events-none'
                  : ''
              }`}
          >

            <LogOut size={26} strokeWidth={2} />

            {guardando
              ? 'Procesando...'
              : 'Salida'}

          </button>

        </div>

        {/* ==================================================
            CERRAR SESIÓN
        ================================================== */}

        <div className="flex justify-center">

          <button
            onClick={() =>
              cerrarSesion(
                router
              )
            }
            className="bg-[#C93C3C] hover:bg-[#A92F2F]
              text-white font-medium py-2 px-6 rounded-lg
              flex items-center justify-center gap-2
              shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
          >

            <LogOut size={17} />

            Cerrar Sesión

          </button>

        </div>

      </div>

    </div>
  )
}