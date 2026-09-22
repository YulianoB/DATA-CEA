// app/instructor/practica/siniestros/page.js

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { cerrarSesion } from '@/lib/auth/logout'

// ============================================================
// Zona horaria Bogotá
// ============================================================

const formatearBogota = (date, fmt) => {
  const opts =
    fmt === 'fecha'
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

const obtenerFechaHoraBogota = () => {
  const now = new Date()

  const fecha = formatearBogota(now, 'fecha')
  const hora = formatearBogota(now, 'hora')

  const timestamp =
    `${fecha}T${hora}-05:00`

  return {
    fecha,
    hora,
    timestamp,
  }
}

// ============================================================
// Página
// ============================================================

export default function SiniestrosPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [nitActual, setNitActual] = useState('')

  // ============================================================
  // Listas
  // ============================================================

  const [placas, setPlacas] = useState([])
  const [cargandoPlacas, setCargandoPlacas] = useState(false)

  // ============================================================
  // Formulario
  // ============================================================

  const [fechaSiniestro, setFechaSiniestro] = useState('')
  const [tipoSiniestro, setTipoSiniestro] = useState('')

  const [
    personasInvolucradas,
    setPersonasInvolucradas,
  ] = useState('')

  const [
    heridosLeves,
    setHeridosLeves,
  ] = useState('')

  const [
    heridosGraves,
    setHeridosGraves,
  ] = useState('')

  const [
    fatalidades,
    setFatalidades,
  ] = useState('')

  const [placa, setPlaca] = useState('')

  const [
    nombreConductor,
    setNombreConductor,
  ] = useState('')

  const [
    documentoConductor,
    setDocumentoConductor,
  ] = useState('')

  const [resumen, setResumen] = useState('')

  // ============================================================
  // Mensajes de validación
  // ============================================================

  const [msgFecha, setMsgFecha] = useState('')
  const [msgTipo, setMsgTipo] = useState('')
  const [msgPers, setMsgPers] = useState('')
  const [msgLev, setMsgLev] = useState('')
  const [msgGrav, setMsgGrav] = useState('')
  const [msgFat, setMsgFat] = useState('')
  const [msgPlaca, setMsgPlaca] = useState('')
  const [msgNombre, setMsgNombre] = useState('')
  const [msgDoc, setMsgDoc] = useState('')
  const [msgResumen, setMsgResumen] = useState('')

  const [guardando, setGuardando] = useState(false)

  // ============================================================
  // Sesión
  // ============================================================

  useEffect(() => {
    const storedUser =
      localStorage.getItem('currentUser')

    if (!storedUser) {
      router.push('/login')
      return
    }

    try {
      const parsed =
        JSON.parse(storedUser)

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
  // Cargar placas desde API
  // ============================================================

  useEffect(() => {
    if (!nitActual) return

    const cargarPlacas = async () => {
      setCargandoPlacas(true)

      try {
        const res = await fetch(
          `/api/siniestros?nit=${encodeURIComponent(
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

          setPlacas([])
          return
        }

        const lista =
          Array.isArray(json.vehiculos)
            ? json.vehiculos
                .map(
                  (vehiculo) =>
                    vehiculo?.placa
                )
                .filter(Boolean)
            : []

        setPlacas(lista)
      } catch (error) {
        console.error(
          'Error cargando vehículos:',
          error
        )

        toast.error(
          'No fue posible cargar la lista de vehículos.'
        )

        setPlacas([])
      } finally {
        setCargandoPlacas(false)
      }
    }

    cargarPlacas()
  }, [nitActual])

  // ============================================================
  // Validaciones
  // ============================================================

  const validarEnteroMin0 = (valor) => {
    if (valor === '') {
      return 'Requerido.'
    }

    const numero =
      Number(valor)

    if (
      !Number.isInteger(numero) ||
      numero < 0
    ) {
      return 'Ingrese un entero ≥ 0.'
    }

    return ''
  }

  const onFechaChange = (e) => {
    const valor = e.target.value

    setFechaSiniestro(valor)

    setMsgFecha(
      valor
        ? ''
        : 'Fecha requerida.'
    )
  }

  const onTipoChange = (e) => {
    const valor = e.target.value

    setTipoSiniestro(valor)

    setMsgTipo(
      valor
        ? ''
        : 'Seleccione un tipo.'
    )
  }

  const onPersChange = (e) => {
    const clean =
      e.target.value.replace(
        /[^\d]/g,
        ''
      )

    setPersonasInvolucradas(clean)

    setMsgPers(
      validarEnteroMin0(clean)
    )
  }

  const onLevChange = (e) => {
    const clean =
      e.target.value.replace(
        /[^\d]/g,
        ''
      )

    setHeridosLeves(clean)

    setMsgLev(
      validarEnteroMin0(clean)
    )
  }

  const onGravChange = (e) => {
    const clean =
      e.target.value.replace(
        /[^\d]/g,
        ''
      )

    setHeridosGraves(clean)

    setMsgGrav(
      validarEnteroMin0(clean)
    )
  }

  const onFatChange = (e) => {
    const clean =
      e.target.value.replace(
        /[^\d]/g,
        ''
      )

    setFatalidades(clean)

    setMsgFat(
      validarEnteroMin0(clean)
    )
  }

  const onPlacaChange = (e) => {
    const valor = e.target.value

    setPlaca(valor)

    setMsgPlaca(
      valor
        ? ''
        : 'Seleccione una placa.'
    )
  }

  const onNombreChange = (e) => {
    const onlyLetters =
      e.target.value.replace(
        /[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ\s]/g,
        ''
      )

    const upper =
      onlyLetters.toUpperCase()

    setNombreConductor(upper)

    setMsgNombre(
      upper.trim()
        ? ''
        : 'Nombre requerido (solo letras).'
    )
  }

  const onDocChange = (e) => {
    const clean =
      e.target.value.replace(
        /[^\d]/g,
        ''
      )

    setDocumentoConductor(clean)

    setMsgDoc(
      clean
        ? ''
        : 'Documento requerido (solo números).'
    )
  }

  const onResumenChange = (e) => {
    const valor =
      e.target.value

    setResumen(valor)

    setMsgResumen(
      valor.trim()
        ? ''
        : 'Resumen requerido.'
    )
  }

  // ============================================================
  // Puede guardar
  // ============================================================

  const puedeGuardar = useMemo(() => {
    const okFecha =
      Boolean(fechaSiniestro)

    const okTipo =
      Boolean(tipoSiniestro)

    const okPers =
      validarEnteroMin0(
        personasInvolucradas
      ) === ''

    const okLev =
      validarEnteroMin0(
        heridosLeves
      ) === ''

    const okGrav =
      validarEnteroMin0(
        heridosGraves
      ) === ''

    const okFat =
      validarEnteroMin0(
        fatalidades
      ) === ''

    const okPlaca =
      Boolean(placa)

    const okNombre =
      Boolean(
        nombreConductor.trim()
      )

    const okDoc =
      Boolean(
        documentoConductor
      )

    const okResumen =
      Boolean(
        resumen.trim()
      )

    return (
      okFecha &&
      okTipo &&
      okPers &&
      okLev &&
      okGrav &&
      okFat &&
      okPlaca &&
      okNombre &&
      okDoc &&
      okResumen &&
      Boolean(nitActual) &&
      !guardando
    )
  }, [
    fechaSiniestro,
    tipoSiniestro,
    personasInvolucradas,
    heridosLeves,
    heridosGraves,
    fatalidades,
    placa,
    nombreConductor,
    documentoConductor,
    resumen,
    nitActual,
    guardando,
  ])

  // ============================================================
  // Limpiar formulario
  // ============================================================

  const resetForm = () => {
    setFechaSiniestro('')
    setTipoSiniestro('')

    setPersonasInvolucradas('')
    setHeridosLeves('')
    setHeridosGraves('')
    setFatalidades('')

    setPlaca('')
    setNombreConductor('')
    setDocumentoConductor('')
    setResumen('')

    setMsgFecha('')
    setMsgTipo('')
    setMsgPers('')
    setMsgLev('')
    setMsgGrav('')
    setMsgFat('')
    setMsgPlaca('')
    setMsgNombre('')
    setMsgDoc('')
    setMsgResumen('')
  }

  // ============================================================
  // Registrar siniestro
  // ============================================================

  const registrarSiniestro = async () => {
    if (
      !puedeGuardar ||
      !user ||
      !nitActual
    ) {
      return
    }

    setGuardando(true)

    try {
      const {
        timestamp,
      } = obtenerFechaHoraBogota()

      const payload = {
        nit: nitActual,

        accion:
          'registrar',

        timestamp_registro:
          timestamp,

        fecha_siniestro:
          fechaSiniestro,

        tipo_siniestro:
          tipoSiniestro,

        num_personas_involucradas:
          Number(
            personasInvolucradas
          ),

        heridos_leves:
          Number(
            heridosLeves
          ),

        heridos_graves:
          Number(
            heridosGraves
          ),

        fatalidades:
          Number(
            fatalidades
          ),

        placa,

        nombre_conductor_implicado:
          nombreConductor.trim(),

        // Se envía como texto.
        documento:
          documentoConductor,

        resumen:
          resumen.trim(),

        estado_analisis:
          'PENDIENTE',
      }

      const res = await fetch(
        '/api/siniestros',
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
            'No se pudo registrar el siniestro.'
        )

        return
      }

      const consecutivo =
        json?.consecutivo ||
        json?.siniestro?.consecutivo ||
        ''

      toast.success(
        consecutivo
          ? `Siniestro registrado (${consecutivo}).`
          : 'Siniestro registrado correctamente.',
        {
          duration: 1400,
        }
      )

      setTimeout(() => {
        resetForm()

        router.push(
          '/instructor/practica'
        )
      }, 1450)
    } catch (error) {
      console.error(
        'Error registrando siniestro:',
        error
      )

      toast.error(
        'Error inesperado al registrar el siniestro.'
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Toaster
        position="top-center"
        richColors
      />

      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-4 sm:p-6">

        {/* Título */}

        <h2 className="text-2xl font-bold mb-6 text-center text-[var(--primary)] flex items-center justify-center gap-2">
          <i className="fas fa-car-crash text-[var(--primary)]"></i>
          Registro de Siniestros Viales
        </h2>

        {/* Usuario */}

        <div className="bg-gray-50 p-2 sm:p-3 rounded mb-4 text-sm border text-center">

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

        {/* =====================================================
            DATOS DEL SINIESTRO
        ====================================================== */}

        <div className="mb-8 border border-gray-300 rounded-lg p-4 bg-gray-50">

          <div className="bg-black text-white px-3 py-1 rounded-t-md mb-4 text-sm font-semibold flex items-center gap-2">
            <i className="fas fa-clipboard-list"></i>
            Datos del Siniestro
          </div>

          {/* Fecha y tipo */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

            <div>
              <label className="block mb-1 font-semibold text-sm">
                Fecha del Siniestro
              </label>

              <input
                type="date"
                max={obtenerFechaHoraBogota().fecha}
                className="w-full border p-2 rounded-lg text-sm"
                value={fechaSiniestro}
                onChange={onFechaChange}
              />

              {msgFecha && (
                <small className="text-red-600 text-xs">
                  {msgFecha}
                </small>
              )}
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm">
                Tipo de Siniestro
              </label>

              <select
                className="w-full border p-2 rounded-lg text-sm"
                value={tipoSiniestro}
                onChange={onTipoChange}
              >
                <option value="">
                  -- Selecciona Tipo --
                </option>

                <option value="Atropello">
                  Atropello (Impacto de vehículo contra un peatón)
                </option>

                <option value="Choque">
                  Choque (Impacto contra objeto estático)
                </option>

                <option value="Colisión">
                  Colisión (Impacto entre vehículos en movimiento)
                </option>

                <option value="Vuelco">
                  Vuelco
                </option>

                <option value="Características Especiales">
                  Características Especiales
                </option>

                <option value="Caída">
                  Caída
                </option>
              </select>

              {msgTipo && (
                <small className="text-red-600 text-xs">
                  {msgTipo}
                </small>
              )}
            </div>
          </div>

          {/* Personas involucradas */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

            <div>
              <label className="block mb-1 font-semibold text-sm">
                Personas Involucradas
              </label>

              <input
                type="number"
                min="0"
                className="w-full border p-2 rounded-lg text-sm"
                value={personasInvolucradas}
                onChange={onPersChange}
              />

              {msgPers && (
                <small className="text-red-600 text-xs">
                  {msgPers}
                </small>
              )}
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm">
                Heridos Leves
              </label>

              <input
                type="number"
                min="0"
                className="w-full border p-2 rounded-lg text-sm"
                value={heridosLeves}
                onChange={onLevChange}
              />

              {msgLev && (
                <small className="text-red-600 text-xs">
                  {msgLev}
                </small>
              )}
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm">
                Heridos Graves
              </label>

              <input
                type="number"
                min="0"
                className="w-full border p-2 rounded-lg text-sm"
                value={heridosGraves}
                onChange={onGravChange}
              />

              {msgGrav && (
                <small className="text-red-600 text-xs">
                  {msgGrav}
                </small>
              )}
            </div>
          </div>

          {/* Fatalidades y placa */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

            <div>
              <label className="block mb-1 font-semibold text-sm">
                Fatalidades
              </label>

              <input
                type="number"
                min="0"
                className="w-full border p-2 rounded-lg text-sm"
                value={fatalidades}
                onChange={onFatChange}
              />

              {msgFat && (
                <small className="text-red-600 text-xs">
                  {msgFat}
                </small>
              )}
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm">
                Placa del Vehículo
              </label>

              <select
                className="w-full border p-2 rounded-lg text-sm"
                value={placa}
                onChange={onPlacaChange}
                disabled={cargandoPlacas}
              >
                <option value="">
                  {cargandoPlacas
                    ? 'Cargando vehículos...'
                    : '-- Selecciona la Placa --'}
                </option>

                {placas.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>

              {msgPlaca && (
                <small className="text-red-600 text-xs">
                  {msgPlaca}
                </small>
              )}
            </div>
          </div>

          {/* Conductor */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

            <div>
              <label className="block mb-1 font-semibold text-sm">
                Nombre del responsable del vehículo
              </label>

              <input
                type="text"
                className="w-full border p-2 rounded-lg text-sm"
                value={nombreConductor}
                onChange={onNombreChange}
              />

              {msgNombre && (
                <small className="text-red-600 text-xs">
                  {msgNombre}
                </small>
              )}
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm">
                Documento del Conductor
              </label>

              <input
                type="text"
                inputMode="numeric"
                className="w-full border p-2 rounded-lg text-sm"
                value={documentoConductor}
                onChange={onDocChange}
              />

              {msgDoc && (
                <small className="text-red-600 text-xs">
                  {msgDoc}
                </small>
              )}
            </div>
          </div>

          {/* Resumen */}

          <div>
            <label className="block mb-1 font-semibold text-sm">
              Resumen del Siniestro
            </label>

            <textarea
              className="w-full border p-2 rounded-lg text-sm"
              rows="4"
              value={resumen}
              onChange={onResumenChange}
            />

            {msgResumen && (
              <small className="text-red-600 text-xs">
                {msgResumen}
              </small>
            )}
          </div>
        </div>

        {/* =====================================================
            BOTONES
        ====================================================== */}

        <div className="mt-8 space-y-4">

          <div className="flex justify-center">
            <button
              onClick={registrarSiniestro}
              disabled={!puedeGuardar}
              className={`bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-2 px-6 rounded-lg shadow-md text-sm flex items-center gap-2 ${
                !puedeGuardar
                  ? 'opacity-70 cursor-not-allowed'
                  : ''
              }`}
            >
              <i className="fas fa-file-alt"></i>

              {guardando
                ? 'Guardando...'
                : 'Registrar Siniestro'}
            </button>
          </div>

          <div className="flex justify-center gap-3 flex-wrap">

            <button
              onClick={() =>
                router.push(
                  '/instructor/practica'
                )
              }
              className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 rounded-lg shadow-md text-sm flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i>
              Regresar
            </button>

            <button
              onClick={handleLogout}
              className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 px-4 rounded-lg shadow-md text-sm flex items-center gap-2"
            >
              <i className="fas fa-sign-out-alt"></i>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}