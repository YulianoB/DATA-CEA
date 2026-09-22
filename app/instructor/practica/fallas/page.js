// app/instructor/practica/fallas/page.js

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { validarKilometraje } from '@/lib/servicios/validaciones'
import { cerrarSesion } from '@/lib/auth/logout'

// ============================================================
// Helpers fecha/hora Bogotá
// ============================================================

const fmtBogota = (date, mode) => {
  const opts =
    mode === 'fecha'
      ? {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'America/Bogota',
        }
      : {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'America/Bogota',
        }

  return new Intl.DateTimeFormat('en-CA', opts).format(date)
}

const ahoraBogota = () => {
  const now = new Date()

  const fecha = fmtBogota(now, 'fecha')
  const hora = fmtBogota(now, 'hora')

  return {
    fecha,
    hora,
  }
}

// ============================================================
// Helpers correo
// ============================================================

async function enviarCorreoFallas({
  para,
  asunto,
  html,
  cc,
  bcc,
}) {
  try {
    const res = await fetch('/api/email/enviar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        para,
        asunto,
        html,
        cc,
        bcc,
      }),
    })

    const json = await res.json()

    if (!json.ok) {
      console.error(
        'Error enviando correo:',
        json.error
      )

      return {
        ok: false,
        error: json.error,
      }
    }

    return {
      ok: true,
    }
  } catch (error) {
    console.error(
      'Error enviando correo:',
      error?.message || error
    )

    return {
      ok: false,
      error:
        error?.message ||
        String(error),
    }
  }
}

function obtenerDestinatariosCorporativos() {
  const correos =
    process.env.NEXT_PUBLIC_MAIL_MANTENIMIENTO ||
    ''

  return correos
    .split(',')
    .map((correo) =>
      correo.trim()
    )
    .filter(Boolean)
}

// ============================================================
// Página
// ============================================================

export default function FallasPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [nitActual, setNitActual] = useState('')

  // ============================================================
  // Catálogo vehículos
  // ============================================================

  const [vehiculos, setVehiculos] = useState([])
  const [cargandoVehiculos, setCargandoVehiculos] = useState(false)

  // ============================================================
  // Formulario
  // ============================================================

  const [placa, setPlaca] = useState('')
  const [tipoVehiculo, setTipoVehiculo] = useState('-')
  const [marca, setMarca] = useState('-')
  const [km, setKm] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [acciones, setAcciones] = useState('')

  // ============================================================
  // Validaciones
  // ============================================================

  const [msgKm, setMsgKm] = useState('')
  const [forzarKm, setForzarKm] = useState(false)

  const [
    tocoDescripcion,
    setTocoDescripcion,
  ] = useState(false)

  const [
    tocoAcciones,
    setTocoAcciones,
  ] = useState(false)

  const [
    tocoPlaca,
    setTocoPlaca,
  ] = useState(false)

  // ============================================================
  // Modal kilometraje
  // ============================================================

  const [modalKm, setModalKm] = useState(null)

  // ============================================================
  // Estado guardado
  // ============================================================

  const [guardando, setGuardando] = useState(false)

  // ============================================================
  // Cargar sesión
  // ============================================================

  useEffect(() => {
    const stored =
      localStorage.getItem('currentUser')

    if (!stored) {
      router.push('/login')
      return
    }

    try {
      const parsed =
        JSON.parse(stored)

      setUser(parsed)

      const nit =
        parsed?.nitEmpresa ||
        localStorage.getItem('currentEmpresaNit') ||
        ''

      if (!nit) {
        toast.error(
          'No se encontró el CEA asociado a la sesión.'
        )
        return
      }

      setNitActual(
        String(nit).trim()
      )
    } catch (error) {
      console.error(
        'Error leyendo sesión:',
        error
      )

      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }, [router])

  // ============================================================
  // Cargar vehículos desde API
  // ============================================================

  useEffect(() => {
    if (!nitActual) return

    const cargarVehiculos = async () => {
      setCargandoVehiculos(true)

      try {
        const res = await fetch(
          `/api/fallas?nit=${encodeURIComponent(
            nitActual
          )}&recurso=vehiculos`,
          {
            cache: 'no-store',
          }
        )

        const json = await res.json()

        if (
          !res.ok ||
          json?.status !== 'success'
        ) {
          toast.error(
            json?.message ||
              'No se pudieron cargar los vehículos.'
          )

          setVehiculos([])
          return
        }

        setVehiculos(
          Array.isArray(json.vehiculos)
            ? json.vehiculos
            : []
        )
      } catch (error) {
        console.error(
          'Error cargando vehículos:',
          error
        )

        toast.error(
          'No fue posible cargar la lista de vehículos.'
        )

        setVehiculos([])
      } finally {
        setCargandoVehiculos(false)
      }
    }

    cargarVehiculos()
  }, [nitActual])

  // ============================================================
  // Autocompletar tipo y marca
  // ============================================================

  useEffect(() => {
    if (!placa) {
      setTipoVehiculo('-')
      setMarca('-')
      return
    }

    const vehiculo =
      vehiculos.find(
        (item) =>
          item.placa === placa
      )

    setTipoVehiculo(
      vehiculo?.tipo_vehiculo ||
      '-'
    )

    setMarca(
      vehiculo?.marca ||
      '-'
    )
  }, [placa, vehiculos])

  // ============================================================
  // Validación kilometraje
  // ============================================================

  const onKmChange = async (e) => {
  const valor = e.target.value

  setKm(valor)
  setMsgKm('')
  setForzarKm(false)
  setModalKm(null)

  if (
    !nitActual ||
    !placa ||
    valor === ''
  ) {
    return
  }

  const kmNumero = Number(valor)

  if (
    !Number.isFinite(kmNumero) ||
    kmNumero < 0
  ) {
    setMsgKm(
      'El kilometraje no es válido.'
    )

    return
  }

  try {
    const resultado =
      await validarKilometraje(
        nitActual,
        placa,
        kmNumero
      )

    setMsgKm(
      resultado?.mensaje || ''
    )

    if (
      resultado.estado === 'error'
    ) {
      toast.error(
        resultado.mensaje
      )

      return
    }

    if (
      resultado.estado ===
      'advertencia'
    ) {
      setModalKm({
        maxKm:
          resultado.maxKm,

        diferencia:
          resultado.diferencia,

        fuente:
          resultado.fuente,

        campo:
          resultado.campo,
      })

      return
    }

    setModalKm(null)
  } catch (error) {
    console.error(
      'Error validando kilometraje:',
      error
    )

    setMsgKm(
      'No fue posible validar el kilometraje.'
    )
  }
}

  // ============================================================
  // Habilitar registrar
  // ============================================================

  const puedeGuardar = useMemo(() => {
  const placaOk =
    Boolean(placa)

  const mensajeKm =
    String(
      msgKm || ''
    ).toLowerCase()

  const kmOk =
    (
      msgKm &&
      !mensajeKm.includes('menor') &&
      !mensajeKm.includes('no fue posible') &&
      !mensajeKm.includes('no se identificó') &&
      !mensajeKm.includes('error')
    ) ||
    forzarKm

  const numeroKm =
    Number(km)

  const kmNumeroOk =
    Number.isFinite(numeroKm) &&
    numeroKm >= 0

  const descOk =
    descripcion.trim().length > 0

  const accOk =
    acciones.trim().length > 0

  return (
    Boolean(nitActual) &&
    placaOk &&
    kmOk &&
    kmNumeroOk &&
    descOk &&
    accOk
  )
}, [
  nitActual,
  placa,
  km,
  msgKm,
  forzarKm,
  descripcion,
  acciones,
])

  // ============================================================
  // Registrar falla
  // ============================================================

  const registrarFalla = async () => {
    if (
      !puedeGuardar ||
      guardando ||
      !user ||
      !nitActual
    ) {
      return
    }

    setGuardando(true)

    try {
      const {
        fecha,
        hora,
      } = ahoraBogota()

      const payload = {
        nit: nitActual,

        accion:
          'registrar',

        fecha,

        hora,

        placa,

        tipo_vehiculo:
          tipoVehiculo === '-'
            ? null
            : tipoVehiculo,

        marca:
          marca === '-'
            ? null
            : marca,

        kilometraje:
          Number(km),

        nombre_encargado:
          user?.nombreCompleto ||
          user?.usuario ||
          '',

        descripcion_falla:
          descripcion
            .trim()
            .toUpperCase(),

        acciones_tomadas:
          acciones
            .trim()
            .toUpperCase(),

        estado:
          'PENDIENTE',
      }

      const res = await fetch(
        '/api/fallas',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(payload),
        }
      )

      const json =
        await res.json()

      if (
        !res.ok ||
        json?.status !== 'success'
      ) {
        toast.error(
          json?.message ||
            'No se pudo registrar la falla.'
        )

        return
      }

      const consecutivo =
        json?.consecutivo ||
        json?.falla?.consecutivo ||
        ''

      // ========================================================
      // Correo al usuario
      // ========================================================

      try {
        const correoUsuario =
          user?.email ||
          ''

        if (correoUsuario) {
          const asunto =
            `Reporte de Falla registrado: ${consecutivo}`

          const html = `
            <p>Hola ${
              user?.nombreCompleto ||
              user?.usuario ||
              ''
            },</p>

            <p>
              Reporte técnico de falla en vehículo en misión –
              Acción de seguimiento necesaria:
            </p>

            <ul>
              <li><b>Consecutivo:</b> ${consecutivo}</li>
              <li><b>Fecha:</b> ${fecha}</li>
              <li><b>Hora:</b> ${hora}</li>
              <li><b>Placa:</b> ${placa}</li>
              <li><b>Tipo:</b> ${tipoVehiculo}</li>
              <li><b>Marca:</b> ${marca}</li>
              <li><b>Kilometraje:</b> ${Number(km)}</li>
              <li><b>Encargado:</b> ${
                user?.nombreCompleto ||
                user?.usuario ||
                ''
              }</li>
              <li><b>Descripción:</b> ${
                descripcion
                  .trim()
                  .toUpperCase()
              }</li>
              <li><b>Acciones:</b> ${
                acciones
                  .trim()
                  .toUpperCase()
              }</li>
              <li><b>Estado:</b> PENDIENTE</li>
            </ul>

            <p>
              <em>
                Correo automático del sistema.
              </em>
            </p>
          `

          await enviarCorreoFallas({
            para: correoUsuario,
            asunto,
            html,
          })
        }

        // ======================================================
        // Correo corporativo
        // ======================================================

        const destinatarios =
          obtenerDestinatariosCorporativos()

        if (
          destinatarios.length > 0
        ) {
          const asuntoC =
            `🚧 Nueva falla reportada (${consecutivo}) - ${placa}`

          const htmlC = `
            <p>
              <strong>
                Se registró un reporte de falla en misión.
              </strong>
            </p>

            <ul>
              <li><b>Consecutivo:</b> ${consecutivo}</li>
              <li><b>Fecha:</b> ${fecha}</li>
              <li><b>Hora:</b> ${hora}</li>
              <li><b>Placa:</b> ${placa}</li>
              <li><b>Tipo:</b> ${tipoVehiculo}</li>
              <li><b>Marca:</b> ${marca}</li>
              <li><b>Kilometraje:</b> ${Number(km)}</li>
              <li><b>Encargado:</b> ${
                user?.nombreCompleto ||
                user?.usuario ||
                ''
              }</li>
              <li><b>Descripción:</b> ${
                descripcion
                  .trim()
                  .toUpperCase()
              }</li>
              <li><b>Acciones:</b> ${
                acciones
                  .trim()
                  .toUpperCase()
              }</li>
              <li><b>Estado:</b> PENDIENTE</li>
            </ul>

            <p>
              <em>
                Correo automático del sistema.
              </em>
            </p>
          `

          await enviarCorreoFallas({
            para: destinatarios,
            asunto: asuntoC,
            html: htmlC,
          })
        }
      } catch (error) {
        console.error(
          'Error enviando correos de falla:',
          error?.message ||
          error
        )
      }

      // ========================================================
      // Éxito
      // ========================================================

      toast.success(
        consecutivo
          ? `Falla registrada (${consecutivo}).`
          : 'Falla registrada correctamente.',
        {
          duration: 1400,
        }
      )

      // Limpiar

      setPlaca('')
      setTipoVehiculo('-')
      setMarca('-')

      setKm('')
      setDescripcion('')
      setAcciones('')

      setMsgKm('')
      setForzarKm(false)

      setTocoDescripcion(false)
      setTocoAcciones(false)
      setTocoPlaca(false)

      setTimeout(() => {
        router.push(
          '/instructor/practica'
        )
      }, 1450)
    } catch (error) {
      console.error(
        'Error registrando falla:',
        error
      )

      toast.error(
        'Error inesperado al registrar la falla.'
      )
    } finally {
      setGuardando(false)
    }
  }

  // ============================================================
  // Logout
  // ============================================================

  const handleLogout = () =>
    cerrarSesion(router)

  // ============================================================
  // Render
  // ============================================================

  if (!user) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  const mostrarErrPlaca =
    tocoPlaca &&
    !placa

  const mostrarErrDesc =
    tocoDescripcion &&
    descripcion.trim().length === 0

  const mostrarErrAcc =
    tocoAcciones &&
    acciones.trim().length === 0

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Toaster
        position="top-center"
        richColors
      />

      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-5">

        {/* Título */}

        <h2 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2 border-b pb-2 text-[var(--primary-dark)]">
          <i className="fas fa-exclamation-triangle text-[var(--primary)]"></i>
          Registro de Fallas en Misión
        </h2>

        {/* Usuario */}

        <div className="bg-gray-50 p-2 rounded mb-4 text-xs border text-center">

          <span>
            Usuario:{' '}
            <strong>
              {user.nombreCompleto}
            </strong>
          </span>

          {user.rol && (
            <span>
              {' '}
              ({user.rol})
            </span>
          )}

          {user.nombreEmpresa && (
            <span className="block mt-1">
              CEA:{' '}
              <strong>
                {user.nombreEmpresa}
              </strong>
            </span>
          )}
        </div>

        {/* Formulario */}

        <div className="space-y-6">

          {/* Vehículo */}

          <div className="border rounded-lg overflow-hidden shadow-sm">

            <div className="bg-gray-900 text-white px-3 py-2 font-semibold text-sm flex items-center gap-2">
              <i className="fas fa-car"></i>
              Vehículo
            </div>

            <div className="p-3 space-y-3">

              {/* Placa */}

              <div>
                <label className="block mb-1 font-semibold text-sm">
                  Placa del Vehículo
                </label>

                <select
                  className={`w-full border p-2 rounded text-sm ${
                    mostrarErrPlaca
                      ? 'border-red-500'
                      : ''
                  }`}
                  value={placa}
                  onChange={(e) => {
                    setPlaca(
                      e.target.value
                    )

                    setTocoPlaca(true)
                  }}
                  onBlur={() =>
                    setTocoPlaca(true)
                  }
                  disabled={cargandoVehiculos}
                  required
                >
                  <option value="">
                    {cargandoVehiculos
                      ? 'Cargando vehículos...'
                      : '-- Selecciona una placa --'}
                  </option>

                  {vehiculos.map(
                    (vehiculo) => (
                      <option
                        key={vehiculo.placa}
                        value={vehiculo.placa}
                      >
                        {vehiculo.placa}
                      </option>
                    )
                  )}
                </select>

                {mostrarErrPlaca && (
                  <small className="text-xs text-red-600">
                    Debes seleccionar una placa.
                  </small>
                )}

                <div className="text-xs text-gray-600 mt-2">

                  <p>
                    <strong>
                      Tipo de Vehículo:
                    </strong>{' '}
                    {tipoVehiculo}
                  </p>

                  <p>
                    <strong>
                      Marca:
                    </strong>{' '}
                    {marca}
                  </p>
                </div>
              </div>

              {/* Kilometraje */}

              <div>
                <label className="block mb-1 font-semibold text-sm">
                  Kilometraje Actual
                </label>

                <input
                  type="number"
                  className={`w-full border p-2 rounded text-sm ${
                    !placa
                      ? 'bg-gray-100 cursor-not-allowed'
                      : ''
                  }`}
                  placeholder="Ingrese el kilometraje"
                  min="0"
                  value={km}
                  onChange={onKmChange}
                  disabled={!placa}
                  required
                />

                {msgKm && (
                  <small
                    className={`text-xs mt-1 block ${
                      msgKm.includes('menor')
                        ? 'text-red-600'
                        : msgKm.includes('supera')
                        ? 'text-orange-600'
                        : 'text-green-600'
                    }`}
                  >
                    {msgKm}
                  </small>
                )}
              </div>
            </div>
          </div>

          {/* Descripción */}

          <div className="border rounded-lg overflow-hidden shadow-sm">

            <div className="bg-gray-900 text-white px-3 py-2 font-semibold text-sm flex items-center gap-2">
              <i className="fas fa-file-alt"></i>
              Descripción
            </div>

            <div className="p-3">

              <textarea
                className={`w-full border p-2 rounded text-sm ${
                  mostrarErrDesc
                    ? 'border-red-500'
                    : ''
                }`}
                rows="3"
                value={descripcion}
                onChange={(e) =>
                  setDescripcion(
                    e.target.value
                  )
                }
                onBlur={() =>
                  setTocoDescripcion(true)
                }
                placeholder="Describa la falla..."
                required
              />

              {mostrarErrDesc && (
                <small className="text-xs text-red-600">
                  La descripción es obligatoria.
                </small>
              )}
            </div>
          </div>

          {/* Acciones */}

          <div className="border rounded-lg overflow-hidden shadow-sm">

            <div className="bg-gray-900 text-white px-3 py-2 font-semibold text-sm flex items-center gap-2">
              <i className="fas fa-tasks"></i>
              Acciones Tomadas
            </div>

            <div className="p-3">

              <textarea
                className={`w-full border p-2 rounded text-sm ${
                  mostrarErrAcc
                    ? 'border-red-500'
                    : ''
                }`}
                rows="3"
                value={acciones}
                onChange={(e) =>
                  setAcciones(
                    e.target.value
                  )
                }
                onBlur={() =>
                  setTocoAcciones(true)
                }
                placeholder="Describa las acciones tomadas..."
                required
              />

              {mostrarErrAcc && (
                <small className="text-xs text-red-600">
                  Las acciones tomadas son obligatorias.
                </small>
              )}
            </div>
          </div>
        </div>

        {/* Botones */}

        <div className="flex justify-center gap-3 mt-6 flex-wrap">

          <button
            onClick={registrarFalla}
            disabled={
              !puedeGuardar ||
              guardando
            }
            className={`py-2 px-4 rounded-lg shadow-md text-sm ${
              puedeGuardar &&
              !guardando
                ? 'bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white'
                : 'bg-gray-400 text-gray-700 cursor-not-allowed'
            }`}
          >
            <i className="fas fa-save mr-2"></i>

            {guardando
              ? 'Guardando...'
              : 'Registrar'}
          </button>

          <button
            onClick={() =>
              router.push(
                '/instructor/practica'
              )
            }
            className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 rounded-lg shadow-md text-sm"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Regresar
          </button>

          <button
            onClick={handleLogout}
            className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 px-4 rounded-lg shadow-md text-sm"
          >
            <i className="fas fa-sign-out-alt mr-2"></i>
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Modal kilometraje */}

      {modalKm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">

          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">

            <h3 className="text-lg font-bold mb-3 text-red-600">
              Advertencia de Kilometraje
            </h3>

            <p className="text-sm mb-2">
              El valor ingresado supera en más de 300 km el último registrado.
            </p>

            <p className="text-sm mb-1">
              <b>Último registro:</b>{' '}
              {modalKm.maxKm} km
            </p>

            <p className="text-sm mb-1">
              <b>Fuente:</b>{' '}
              {modalKm.fuente}{' '}
              ({modalKm.campo})
            </p>

            <p className="text-sm mb-4">
              <b>Diferencia:</b>{' '}
              {modalKm.diferencia} km
            </p>

            <div className="flex justify-end gap-3">

              <button
                onClick={() =>
                  setModalKm(null)
                }
                className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>

              <button
                onClick={() => {
                  setForzarKm(true)
                  setModalKm(null)
                }}
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded"
              >
                Confirmar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}