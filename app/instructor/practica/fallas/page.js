// app/instructor/practica/fallas/page.js

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { validarKilometraje } from '@/lib/servicios/validaciones'
import { cerrarSesion } from '@/lib/auth/logout'
import { EncabezadoPractica, TarjetaSeccionSiniestro, ModalSeccionSiniestro, AccionesModuloPractica } from '@/components/instructor/practica/EstilosModuloPractica'

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
  const [seccionAbierta, setSeccionAbierta] = useState(null)
  const [snapshotSeccion, setSnapshotSeccion] = useState('')
  const [mostrarErrorSeccion, setMostrarErrorSeccion] = useState(false)

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

  const abrirSeccion = (numero) => {
    setSnapshotSeccion(numero === 1 ? descripcion : numero === 2 ? acciones : '')
    setMostrarErrorSeccion(false)
    setSeccionAbierta(numero)
  }

  const cancelarSeccion = () => {
    if (seccionAbierta === 1) setDescripcion(snapshotSeccion)
    if (seccionAbierta === 2) setAcciones(snapshotSeccion)
    setMostrarErrorSeccion(false)
    setSeccionAbierta(null)
  }

  const continuarSeccion = () => {
    const completo = seccionAbierta === 1 ? descripcion.trim() : seccionAbierta === 2 ? acciones.trim() : true
    if (!completo) {
      setMostrarErrorSeccion(true)
      toast.error('Complete el campo obligatorio antes de continuar.')
      return
    }
    setMostrarErrorSeccion(false)
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

  const kilometrajeValido = km !== '' && Number.isFinite(Number(km)) && Number(km) >= 0 && (Boolean(forzarKm) || (Boolean(msgKm) && !/menor|no fue posible|no se identificó|error/i.test(msgKm)))
  const datosReporteCompletos = Boolean(placa && kilometrajeValido && nitActual)
  const resumenCampos = [
    ['Placa', placa, Boolean(placa)],
    ['Tipo de vehículo', tipoVehiculo, true],
    ['Marca', marca, true],
    ['Kilometraje', km === '' ? '' : `${km} km`, kilometrajeValido],
    ['Persona que registra', user.nombreCompleto || user.usuario || '', true],
    ['Descripción de la falla', descripcion, Boolean(descripcion.trim())],
    ['Acciones realizadas', acciones, Boolean(acciones.trim())],
    ['Estado inicial', 'PENDIENTE', true],
  ]

  return (
    <div className="min-h-screen bg-slate-100 px-2 py-3 sm:px-4 sm:py-6">
      <Toaster position="top-center" richColors />
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-lg">
        <EncabezadoPractica titulo="Registro de Fallas en Misión" usuario={user.nombreCompleto} cea={user.nombreEmpresa} onRegresar={() => router.push('/instructor/practica')} onCerrarSesion={handleLogout} />
        <main className="px-3 py-4 sm:px-6 sm:py-6">
          <p className="mb-4 text-xs text-slate-600">Seleccione el vehículo, registre el kilometraje y diligencie las secciones del reporte.</p>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="falla-placa" className="mb-1 block text-sm font-semibold">Placa del vehículo <span className="text-red-600">*</span></label>
              <select id="falla-placa" className="w-full rounded-lg border border-slate-400 bg-white p-2.5 text-sm" value={placa} onChange={(e) => { setPlaca(e.target.value); setTocoPlaca(true); setKm(''); setMsgKm(''); setForzarKm(false); setModalKm(null) }} onBlur={() => setTocoPlaca(true)} disabled={cargandoVehiculos} required>
                <option value="">{cargandoVehiculos ? 'Cargando vehículos...' : '-- Seleccione una placa --'}</option>
                {vehiculos.map((vehiculo) => <option key={vehiculo.placa} value={vehiculo.placa}>{vehiculo.placa}</option>)}
              </select>
              {tocoPlaca && !placa && <p className="mt-1 text-xs text-red-600">Seleccione una placa.</p>}
            </div>
            <div>
              <label htmlFor="falla-km" className="mb-1 block text-sm font-semibold">Kilometraje actual <span className="text-red-600">*</span></label>
              <input id="falla-km" type="number" min="0" step="1" inputMode="numeric" value={km} onChange={onKmChange} disabled={!placa} placeholder="Kilometraje del vehículo" className="w-full rounded-lg border border-slate-400 p-2.5 text-sm disabled:bg-slate-100" required />
              {msgKm && <p className={`mt-1 text-xs ${/menor|no fue posible|no se identificó|error/i.test(msgKm) ? 'text-red-600' : 'text-amber-700'}`}>{msgKm}</p>}
            </div>
          </div>
          {placa && <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><strong>Vehículo:</strong> {tipoVehiculo} · <strong>Marca:</strong> {marca}</div>}
          <div className="mb-5 grid grid-cols-2 items-stretch gap-3">
            <TarjetaSeccionSiniestro numero={1} titulo="Descripción de la falla" descripcion="Qué ocurrió, síntomas y condiciones." completada={Boolean(descripcion.trim())} onClick={() => abrirSeccion(1)} />
            <TarjetaSeccionSiniestro numero={2} titulo="Acciones realizadas" descripcion="Medidas adoptadas ante la novedad." completada={Boolean(acciones.trim())} onClick={() => abrirSeccion(2)} />
            <TarjetaSeccionSiniestro numero={3} titulo="Datos del reporte" descripcion="Vehículo, responsable y registro." completada={datosReporteCompletos} onClick={() => abrirSeccion(3)} />
            <TarjetaSeccionSiniestro numero={4} titulo="Revisión del registro" descripcion="Verifique los datos antes de guardar." completada={puedeGuardar} onClick={() => abrirSeccion(4)} />
          </div>
          <AccionesModuloPractica onGuardar={registrarFalla} puedeGuardar={puedeGuardar} guardando={guardando} textoGuardar="Registrar falla" />
        </main>
      </div>
      {seccionAbierta === 1 && <ModalSeccionSiniestro numero={1} titulo="Descripción de la falla" onCancelar={cancelarSeccion} onContinuar={continuarSeccion}>
        <p className="text-xs leading-relaxed text-slate-700">Describa qué falla presentó el vehículo, cuándo se identificó, qué síntomas se observaron y en qué condiciones ocurrió. Incluya ruidos, testigos encendidos, pérdida de potencia u otras señales relevantes, según corresponda.</p>
        <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-slate-700"><strong>Ejemplo:</strong> Durante el desplazamiento, el vehículo presentó pérdida de potencia y se encendió el testigo del motor. La novedad se identificó al iniciar la marcha.</p>
        <label htmlFor="falla-descripcion" className="block text-sm font-semibold">Descripción de la falla <span className="text-red-600">*</span></label>
        <textarea id="falla-descripcion" rows={5} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Describa la novedad observada..." className="w-full rounded-lg border border-slate-400 p-3 text-sm" />
        {mostrarErrorSeccion && !descripcion.trim() && <p role="alert" className="text-xs font-semibold text-red-600">La descripción es obligatoria.</p>}
      </ModalSeccionSiniestro>}
      {seccionAbierta === 2 && <ModalSeccionSiniestro numero={2} titulo="Acciones realizadas" onCancelar={cancelarSeccion} onContinuar={continuarSeccion}>
        <p className="text-xs leading-relaxed text-slate-700">Indique qué medidas se adoptaron ante la falla: detener el vehículo, informar al CEA, solicitar asistencia o suspender su uso. No registre reparaciones que no se hayan efectuado.</p>
        <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-slate-700"><strong>Ejemplo:</strong> Se detuvo el vehículo en un lugar seguro, se informó al coordinador y se suspendió su utilización hasta la revisión técnica. Si aún no hubo intervención, indique que la novedad fue reportada y está pendiente de revisión.</p>
        <label htmlFor="falla-acciones" className="block text-sm font-semibold">Acciones tomadas <span className="text-red-600">*</span></label>
        <textarea id="falla-acciones" rows={5} value={acciones} onChange={(e) => setAcciones(e.target.value)} placeholder="Describa únicamente las acciones realizadas..." className="w-full rounded-lg border border-slate-400 p-3 text-sm" />
        {mostrarErrorSeccion && !acciones.trim() && <p role="alert" className="text-xs font-semibold text-red-600">Las acciones tomadas son obligatorias.</p>}
      </ModalSeccionSiniestro>}
      {seccionAbierta === 3 && <ModalSeccionSiniestro numero={3} titulo="Datos del reporte" revision onCancelar={() => setSeccionAbierta(null)}>
        <p className="text-xs text-slate-600">Estos datos se obtienen del vehículo seleccionado y de la sesión actual. La fecha y la hora se generan automáticamente al registrar.</p>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {resumenCampos.slice(0, 5).map(([etiqueta, valor, valido]) => <div key={etiqueta} className={`rounded-lg border p-3 ${valido ? 'border-slate-200 bg-slate-50' : 'border-red-400 bg-red-50'}`}><dt className="text-xs font-semibold text-slate-600">{etiqueta}</dt><dd className="mt-1 break-words font-medium">{valor || 'Pendiente'}</dd></div>)}
        </dl>
      </ModalSeccionSiniestro>}
      {seccionAbierta === 4 && <ModalSeccionSiniestro numero={4} titulo="Revisión del registro" revision onCancelar={() => setSeccionAbierta(null)}>
        <p className="text-xs text-slate-600">Revise los datos antes de registrar. Los campos obligatorios pendientes se muestran en rojo.</p>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {resumenCampos.map(([etiqueta, valor, valido]) => <div key={etiqueta} className={`rounded-lg border p-3 ${valido ? 'border-slate-200 bg-slate-50' : 'border-red-400 bg-red-50'}`}><dt className={`text-xs font-semibold ${valido ? 'text-slate-600' : 'text-red-700'}`}>{etiqueta}{['Placa', 'Kilometraje', 'Descripción de la falla', 'Acciones realizadas'].includes(etiqueta) && <span className="ml-1 text-red-600">*</span>}</dt><dd className={`mt-1 break-words font-medium ${valido ? 'text-slate-900' : 'text-red-700'}`}>{valido ? (valor || 'No disponible') : 'Obligatorio: pendiente o inválido'}</dd></div>)}
        </dl>
        {!puedeGuardar && <p className="text-xs font-semibold text-amber-700">Complete los campos obligatorios y valide el kilometraje antes de guardar.</p>}
      </ModalSeccionSiniestro>}
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