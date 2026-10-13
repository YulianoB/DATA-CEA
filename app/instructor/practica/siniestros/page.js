// app/instructor/practica/siniestros/page.js

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { cerrarSesion } from '@/lib/auth/logout'
import { EncabezadoPractica, TarjetaSeccionSiniestro, ModalSeccionSiniestro, AccionesModuloPractica } from '@/components/instructor/practica/EstilosModuloPractica'

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
  const [seccionAbierta, setSeccionAbierta] = useState(null)
  const [erroresSeccion, setErroresSeccion] = useState(false)

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

  const seccionCompleta = (numero) => {
    if (numero === 1) return [personasInvolucradas, heridosLeves, heridosGraves, fatalidades].every((v) => v !== '' && validarEnteroMin0(v) === '')
    if (numero === 2) return Boolean(nombreConductor.trim() && documentoConductor.trim())
    if (numero === 3) return Boolean(resumen.trim())
    return puedeGuardar
  }

  const snapshotSeccion = (numero) => {
    if (numero === 1) return [personasInvolucradas, heridosLeves, heridosGraves, fatalidades]
    if (numero === 2) return [nombreConductor, documentoConductor]
    if (numero === 3) return [resumen]
    return []
  }

  const [snapshotModal, setSnapshotModal] = useState([])
  const abrirSeccion = (numero) => {
    setSnapshotModal(snapshotSeccion(numero))
    setErroresSeccion(false)
    setSeccionAbierta(numero)
  }
  const cancelarSeccion = () => {
    if (seccionAbierta === 1) {
      setPersonasInvolucradas(snapshotModal[0] ?? '')
      setHeridosLeves(snapshotModal[1] ?? '')
      setHeridosGraves(snapshotModal[2] ?? '')
      setFatalidades(snapshotModal[3] ?? '')
      setMsgPers(''); setMsgLev(''); setMsgGrav(''); setMsgFat('')
    } else if (seccionAbierta === 2) {
      setNombreConductor(snapshotModal[0] ?? '')
      setDocumentoConductor(snapshotModal[1] ?? '')
      setMsgNombre(''); setMsgDoc('')
    } else if (seccionAbierta === 3) {
      setResumen(snapshotModal[0] ?? '')
      setMsgResumen('')
    }
    setErroresSeccion(false)
    setSeccionAbierta(null)
  }
  const continuarSeccion = () => {
    if (!seccionCompleta(seccionAbierta)) {
      setErroresSeccion(true)
      toast.error('Complete los campos obligatorios de esta sección antes de continuar.')
      return
    }
    setErroresSeccion(false)
    setSeccionAbierta(null)
  }

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
    <div className="min-h-screen bg-slate-100 px-2 py-3 sm:px-4 sm:py-6">
      <Toaster position="top-center" richColors />
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-lg">
        <EncabezadoPractica titulo="Registro de Siniestros Viales" usuario={user.nombreCompleto} cea={user.nombreEmpresa} onRegresar={() => router.push('/instructor/practica')} onCerrarSesion={handleLogout} />
        <main className="px-3 py-4 sm:px-6 sm:py-6">
          <p className="mb-4 text-xs text-slate-600">Diligencie la placa, fecha y tipo de siniestro. Después complete las secciones.</p>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="min-w-0">              <label className="block mb-1 font-semibold text-sm">
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
            <div className="min-w-0">              <label className="block mb-1 font-semibold text-sm">
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
          </div>
          <div className="mb-5">              <label className="block mb-1 font-semibold text-sm">
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
          <div className="mb-5 grid grid-cols-2 items-stretch gap-3">
            <TarjetaSeccionSiniestro numero={1} titulo="Personas involucradas" descripcion="Personas, heridos y fatalidades." completada={seccionCompleta(1)} onClick={() => abrirSeccion(1)} />
            <TarjetaSeccionSiniestro numero={2} titulo="Responsable del vehículo" descripcion="Nombre y documento del conductor." completada={seccionCompleta(2)} onClick={() => abrirSeccion(2)} />
            <TarjetaSeccionSiniestro numero={3} titulo="Descripción del siniestro" descripcion="Relato de los hechos ocurridos." completada={seccionCompleta(3)} onClick={() => abrirSeccion(3)} />
            <TarjetaSeccionSiniestro numero={4} titulo="Revisión del registro" descripcion="Verifique los datos antes de guardar." completada={seccionCompleta(4)} onClick={() => abrirSeccion(4)} />
          </div>
          <AccionesModuloPractica onGuardar={registrarSiniestro} puedeGuardar={puedeGuardar} guardando={guardando} textoGuardar="Registrar Siniestro" />
          {seccionAbierta === 1 && <ModalSeccionSiniestro numero={1} titulo="Personas involucradas" onCancelar={cancelarSeccion} onContinuar={continuarSeccion}>
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
            {erroresSeccion && !seccionCompleta(seccionAbierta) && <p role="alert" className="text-xs font-semibold text-red-600">Complete todos los campos obligatorios con valores válidos.</p>}
          </ModalSeccionSiniestro>}
          {seccionAbierta === 2 && <ModalSeccionSiniestro numero={2} titulo="Responsable del vehículo" onCancelar={cancelarSeccion} onContinuar={continuarSeccion}>
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
            {erroresSeccion && !seccionCompleta(seccionAbierta) && <p role="alert" className="text-xs font-semibold text-red-600">Complete todos los campos obligatorios con valores válidos.</p>}
          </ModalSeccionSiniestro>}
          {seccionAbierta === 3 && <ModalSeccionSiniestro numero={3} titulo="Descripción del siniestro" onCancelar={cancelarSeccion} onContinuar={continuarSeccion}>
            <p className="text-xs leading-relaxed text-slate-600">Describa de forma clara y objetiva qué ocurrió, dónde sucedió y las circunstancias relevantes del siniestro.</p>
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
            {erroresSeccion && !seccionCompleta(seccionAbierta) && <p role="alert" className="text-xs font-semibold text-red-600">Complete todos los campos obligatorios con valores válidos.</p>}
          </ModalSeccionSiniestro>}
          {seccionAbierta === 4 && <ModalSeccionSiniestro numero={4} titulo="Revisión del registro" revision onCancelar={() => setSeccionAbierta(null)}>
            <p className="text-xs text-slate-600">Verifique la información antes de registrar el siniestro.</p>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {[
                ['Placa', placa], ['Fecha del siniestro', fechaSiniestro], ['Tipo de siniestro', tipoSiniestro],
                ['Personas involucradas', personasInvolucradas], ['Heridos leves', heridosLeves],
                ['Heridos graves', heridosGraves], ['Fatalidades', fatalidades],
                ['Responsable del vehículo', nombreConductor], ['Documento del conductor', documentoConductor],
                ['Resumen del siniestro', resumen],
              ].map(([etiqueta, valor]) => <div key={etiqueta} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><dt className="text-xs font-semibold text-slate-600">{etiqueta}</dt><dd className="mt-1 break-words font-medium text-slate-900">{valor === '' ? 'Pendiente' : valor}</dd></div>)}
            </dl>
            {!puedeGuardar && <p className="text-xs font-semibold text-amber-700">Hay campos pendientes o inválidos. Complete el formulario antes de registrar.</p>}
          </ModalSeccionSiniestro>}
        </main>
      </div>
    </div>
  )
}
