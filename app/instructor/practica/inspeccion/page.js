'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner' // ✅ Toasts

// Supabase client y validaciones globales
import { supabase } from '@/lib/supabaseClient'
import {
  validarInspeccionDuplicada,
  validarKilometraje
} from '@/lib/servicios/validaciones'

export default function InspeccionPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Datos / UI
  const [vehiculos, setVehiculos] = useState([])
  const [placaSeleccionada, setPlacaSeleccionada] = useState('')
  const [vehiculoInfo, setVehiculoInfo] = useState({ tipo: '-', marca: '-' })
  const [mensajeDuplicado, setMensajeDuplicado] = useState('')
  const [kilometraje, setKilometraje] = useState('')
  const [mensajeKm, setMensajeKm] = useState('')

  // Formulario
  const [secciones, setSecciones] = useState({
    revisionExterior: null,
    motor: null,
    interiorFuncionamiento: null,
    equiposPrevencion: null,
    documentos: null
  })
  const [observaciones, setObservaciones] = useState('')

  // Modal de advertencia por kilometraje
  const [mostrarModalKm, setMostrarModalKm] = useState(false)
  const [datosKm, setDatosKm] = useState(null)
  const [forzarGuardado, setForzarGuardado] = useState(false)

  // Guardado
  const [guardando, setGuardando] = useState(false)
  const [mensajeGuardado, setMensajeGuardado] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    } else {
      router.push('/login')
    }

    // Cargar lista de vehículos
    const fetchVehiculos = async () => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('placa, tipo_vehiculo, marca')
        .order('placa', { ascending: true })

      if (!error && data) setVehiculos(data)
    }

    fetchVehiculos()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    router.push('/login')
  }

  // ---------- Helpers de fecha/hora Bogotá ----------
  const formatearBogota = (date, fmt) => {
    const opts =
      fmt === 'fecha'
        ? { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }
        : { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Bogota' }
    return new Intl.DateTimeFormat('en-CA', opts).format(date) // en-CA => YYYY-MM-DD / HH:mm:ss
  }

  const obtenerFechaHoraBogota = () => {
    const now = new Date()
    const fecha = formatearBogota(now, 'fecha') // YYYY-MM-DD
    const hora = formatearBogota(now, 'hora')   // HH:mm:ss
    const timestamp = `${fecha}T${hora}-05:00`  // Bogotá (UTC-05:00)
    return { fecha, hora, timestamp }
  }

  // ---------- Consecutivo ----------
  const obtenerSiguienteConsecutivo = async () => {
    const { data, error } = await supabase
      .from('preoperacionales')
      .select('consecutivo')
      .order('consecutivo', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error obteniendo consecutivo:', error.message)
      return 'IP-0000001'
    }

    if (!data || data.length === 0 || !data[0]?.consecutivo) {
      return 'IP-0000001'
    }

    const last = String(data[0].consecutivo) // ej: "IP-0000123"
    const num = parseInt(last.replace('IP-', ''), 10) + 1
    return 'IP-' + String(num).padStart(7, '0')
  }

  // ---------- Helpers correo ----------
  const obtenerEmailUsuario = async () => {
    if (user?.email) return user.email
    if (!user?.nombreCompleto) return ''

    const { data, error } = await supabase
      .from('usuarios')
      .select('email')
      .eq('nombre_completo', user.nombreCompleto)
      .limit(1)

    if (error || !data || !data[0]?.email) return ''
    return data[0].email
  }

  const enviarCorreoInspeccion = async ({ para, asunto, html, cc, bcc }) => {
    try {
      const res = await fetch('/api/email/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ para, asunto, html, cc, bcc })
      })
      const json = await res.json()
      if (!json.ok) {
        console.error('Error enviando correo:', json.error)
        return { ok: false, error: json.error }
      }
      return { ok: true }
    } catch (e) {
      console.error('Error enviando correo:', e?.message || e)
      return { ok: false, error: e?.message || String(e) }
    }
  }

  const obtenerDestinatariosMantenimiento = () => {
    const s = process.env.NEXT_PUBLIC_MAIL_MANTENIMIENTO || ''
    return s
      .split(',')
      .map(x => x.trim())
      .filter(Boolean)
  }

  // ---------- Limpia campos al cambiar placa ----------
  const resetPorCambioPlaca = () => {
    setKilometraje('')
    setMensajeKm('')
    setSecciones({
      revisionExterior: null,
      motor: null,
      interiorFuncionamiento: null,
      equiposPrevencion: null,
      documentos: null
    })
    setObservaciones('')
    setMostrarModalKm(false)
    setDatosKm(null)
    setForzarGuardado(false)
  }

  // ---------- Handlers UI ----------
  const handlePlacaChange = async (e) => {
    const nuevaPlaca = e.target.value

    // Si cambia la placa, limpiamos el formulario relacionado
    resetPorCambioPlaca()

    setPlacaSeleccionada(nuevaPlaca)

    if (!nuevaPlaca) {
      setMensajeDuplicado('')
      setVehiculoInfo({ tipo: '-', marca: '-' })
      return
    }

    // Autocompletar tipo/marca
    const v = vehiculos.find((v) => v.placa === nuevaPlaca)
    setVehiculoInfo({
      tipo: v?.tipo_vehiculo || '-',
      marca: v?.marca || '-'
    })

    // ✅ Validar duplicado usando FECHA Bogotá (corrige desfase de zona horaria)
    const { fecha } = obtenerFechaHoraBogota()
    const resultado = await validarInspeccionDuplicada(nuevaPlaca, fecha)
    setMensajeDuplicado(resultado.mensaje)

    // (Opcional) toast inmediato si ya existe
    if (resultado.existe) {
      toast.error(`Ya existe una inspección hoy para la placa ${nuevaPlaca}`)
    }
  }

  const handleKmChange = async (e) => {
    const nuevoKm = e.target.value
    setKilometraje(nuevoKm)

    if (!placaSeleccionada || !nuevoKm) {
      setMensajeKm('')
      return
    }

    const resultado = await validarKilometraje(placaSeleccionada, parseInt(nuevoKm, 10))

    if (resultado.estado === 'advertencia') {
      setDatosKm(resultado)
      setMostrarModalKm(true)
      setMensajeKm(resultado.mensaje)
    } else {
      setMensajeKm(resultado.mensaje)
      setMostrarModalKm(false)
      setForzarGuardado(false)
    }
  }

  const handleSeccionChange = (id, valor) => {
    setSecciones((prev) => ({ ...prev, [id]: valor }))
  }

  // ---------- Validaciones para habilitar Guardar ----------
  const todoConforme = Object.values(secciones).every((v) => v === 'CONFORME')
  const algunaNoConforme = Object.values(secciones).includes('NO CONFORME')
  const seccionesCompletas = Object.values(secciones).every((v) => v !== null)

  const kilometrajeValido =
    (mensajeKm && !mensajeKm.includes('menor')) || forzarGuardado

  const puedeGuardar =
    placaSeleccionada &&
    !mensajeDuplicado.includes('Ya existe') && // queda bloqueado si ya hay inspección hoy
    kilometrajeValido &&
    seccionesCompletas &&
    (todoConforme || (algunaNoConforme && observaciones.trim() !== ''))

  // ---------- Reset total ----------
  const resetearEstados = () => {
    setPlacaSeleccionada('')
    setVehiculoInfo({ tipo: '-', marca: '-' })
    setMensajeDuplicado('')
    resetPorCambioPlaca()
    setMensajeGuardado('')
  }

  // ---------- Guardar en Supabase ----------
  const handleGuardar = async () => {
    if (!puedeGuardar || guardando) return

    try {
      setGuardando(true)
      setMensajeGuardado('')

      // Fecha/hora en Bogotá
      const { fecha, hora, timestamp } = obtenerFechaHoraBogota()

      // Reforzar duplicado por seguridad
      const dup = await validarInspeccionDuplicada(placaSeleccionada, fecha)
      if (dup.existe) {
        setGuardando(false)
        setMensajeGuardado(dup.mensaje)
        toast.error(dup.mensaje)
        return
      }

      // Siguiente consecutivo
      const consecutivo = await obtenerSiguienteConsecutivo()

      // Cargar tipo/marca por si acaso
      const v = vehiculos.find((vv) => vv.placa === placaSeleccionada)
      const tipo = v?.tipo_vehiculo || vehiculoInfo.tipo || ''
      const marca = v?.marca || vehiculoInfo.marca || ''

      // Estado observación
      const hayObs = observaciones.trim() !== ''
      const estadoObs = hayObs ? 'PENDIENTE' : ''

      const payload = {
        consecutivo,
        timestamp_registro: timestamp,
        fecha_registro: fecha,
        hora_registro: hora,
        placa: placaSeleccionada,
        tipo_vehiculo: tipo,
        marca: marca,
        km_registro: Number(kilometraje),
        usuario_encargado: user?.nombreCompleto || '',
        revision_exterior: secciones.revisionExterior,
        motor: secciones.motor,
        interior_funcionamiento: secciones.interiorFuncionamiento,
        equipos_prevencion: secciones.equiposPrevencion,
        documentos: secciones.documentos,
        observaciones: hayObs ? observaciones.trim() : '',
        estado_observacion: estadoObs
      }

      const { error } = await supabase.from('preoperacionales').insert([payload])

      if (error) {
        setMensajeGuardado('Error al guardar la inspección: ' + error.message)
        toast.error('No se pudo guardar la inspección')
      } else {
        // 1) Correo al instructor
        const correoDestino = await obtenerEmailUsuario()
        if (correoDestino) {
          const asunto = `Confirmación inspección: ${consecutivo}`
          const html = `
            <p>Hola ${user?.nombreCompleto || ''},</p>
            <p>Inspección registrada correctamente:</p>
            <ul>
              <li><b>Consecutivo:</b> ${consecutivo}</li>
              <li><b>Placa:</b> ${placaSeleccionada}</li>
              <li><b>Marca:</b> ${marca}</li>
              <li><b>Tipo:</b> ${tipo}</li>
              <li><b>Fecha:</b> ${fecha}</li>
              <li><b>Hora:</b> ${hora}</li>
              <li><b>Kilometraje:</b> ${kilometraje}</li>
              <li><b>Observaciones:</b> ${observaciones.trim() || 'Sin observaciones'}</li>
            </ul>
            <p>Gracias por completar tu inspección.</p>
          `
          await enviarCorreoInspeccion({ para: correoDestino, asunto, html })
        }

        // 2) Si hay observaciones → correo a mantenimiento (múltiples)
        if (hayObs) {
          const destinatarios = obtenerDestinatariosMantenimiento()
          if (destinatarios.length > 0) {
            const asuntoM = `🚨 Observación en inspección preoperacional: ${placaSeleccionada} (${consecutivo})`
            const htmlM = `
              <p><strong>Se ha registrado una inspección con observaciones para seguimiento.</strong></p>
              <ul>
                <li><strong>Consecutivo:</strong> ${consecutivo}</li>
                <li><strong>Placa:</strong> ${placaSeleccionada}</li>
                <li><strong>Tipo de Vehículo:</strong> ${tipo}</li>
                <li><strong>Marca:</strong> ${marca}</li>
                <li><strong>Usuario responsable:</strong> ${user?.nombreCompleto || ''}</li>
                <li><strong>Fecha:</strong> ${fecha} ${hora}</li>
                <li><strong>Kilometraje:</strong> ${kilometraje}</li>
              </ul>
              <p><strong>Observaciones:</strong><br>${observaciones.trim()}</p>
              <p><em>Correo automático generado por el sistema.</em></p>
            `
            await enviarCorreoInspeccion({
              para: destinatarios,
              asunto: asuntoM,
              html: htmlM
            })
          }
        }

        // ✅ Toast de éxito antes de redirigir
        toast.success(`Inspección guardada (${placaSeleccionada} • ${consecutivo})`, { duration: 1400 })

        // Limpiar y redirigir después de mostrar el toast
        setTimeout(() => {
          resetearEstados()
          router.push('/instructor/practica')
        }, 1450)
      }
    } catch (err) {
      setMensajeGuardado('Error inesperado al guardar: ' + (err?.message || String(err)))
      toast.error('Error inesperado al guardar')
    } finally {
      setGuardando(false)
    }
  }

  // Render
  if (!user) return <p className="text-center mt-20">Cargando...</p>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {/* Toaster para esta página */}
      <Toaster position="top-center" richColors />

      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6">
        
        {/* Título */}
        <h2 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2 border-b pb-2 text-[var(--primary)]">
          <i className="fas fa-clipboard-check text-[var(--primary)]"></i>
          Inspección Preoperacional
        </h2>

        {/* Usuario */}
        <div className="bg-gray-50 p-2 rounded mb-4 text-xs border text-center">
          Usuario: <strong>{user.nombreCompleto}</strong>
        </div>

        {/* Placa y Kilometraje */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <label className="block text-sm font-semibold mb-1">Placa del Vehículo</label>
            <select
              className="w-full border p-2 rounded text-sm h-10"
              value={placaSeleccionada}
              onChange={handlePlacaChange}
            >
              <option value="">-- Seleccione la Placa --</option>
              {vehiculos.map((vehiculo) => (
                <option key={vehiculo.placa} value={vehiculo.placa}>
                  {vehiculo.placa}
                </option>
              ))}
            </select>
            {mensajeDuplicado && (
              <p
                className={`text-xs mt-1 ${
                  mensajeDuplicado.includes('Ya existe') ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {mensajeDuplicado}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Kilometraje Actual</label>
            <input
              type="number"
              className="w-full border p-2 rounded text-sm h-10"
              min="0"
              value={kilometraje}
              onChange={handleKmChange}
            />
            {mensajeKm && (
              <p
                className={`text-xs mt-1 ${
                  mensajeKm.includes('menor')
                    ? 'text-red-600'
                    : mensajeKm.includes('supera')
                    ? 'text-orange-600'
                    : 'text-green-600'
                }`}
              >
                {mensajeKm}
              </p>
            )}
          </div>
        </div>

        {/* Info del vehículo */}
        <div className="text-xs mb-6 px-2">
          <p><strong>Tipo de Vehículo:</strong> {vehiculoInfo.tipo}</p>
          <p><strong>Marca:</strong> {vehiculoInfo.marca}</p>
        </div>

        {/* Secciones */}
        {[
          { id: 'revisionExterior', title: 'SECCIÓN 1: REVISIÓN EXTERIOR', desc: 'Verifique carrocería, faros, llantas, espejos, limpiaparabrisas, etc.' },
          { id: 'motor', title: 'SECCIÓN 2: MOTOR', desc: 'Verifique niveles de fluidos, fugas, batería, correas, cadena (en motos).' },
          { id: 'interiorFuncionamiento', title: 'SECCIÓN 3: INTERIOR Y FUNCIONAMIENTO', desc: 'Verifique cinturones, asientos, luces, tablero.' },
          { id: 'equiposPrevencion', title: 'SECCIÓN 4: EQUIPOS DE PREVENCIÓN Y SEGURIDAD', desc: 'Kit carretera, casco, señalización, banderín.' },
          { id: 'documentos', title: 'SECCIÓN 5: DOCUMENTOS', desc: 'SOAT, RTM, licencia, tarjeta de servicio, certificado instructor, cédula.' }
        ].map((section) => (
          <div key={section.id} className="bg-gray-50 border border-gray-300 rounded-lg mb-4 shadow-sm">
            <div className="bg-black text-white text-sm font-semibold px-3 py-2 rounded-t-lg">
              {section.title}
            </div>
            <div className="p-3">
              <p className="text-xs text-gray-700 mb-2">{section.desc}</p>
              <div className="flex gap-6 text-sm">
                <label>
                  <input
                    type="radio"
                    name={section.id}
                    value="CONFORME"
                    onChange={() => handleSeccionChange(section.id, 'CONFORME')}
                    className="mr-1"
                  /> CONFORME
                </label>
                <label>
                  <input
                    type="radio"
                    name={section.id}
                    value="NO CONFORME"
                    onChange={() => handleSeccionChange(section.id, 'NO CONFORME')}
                    className="mr-1"
                  /> NO CONFORME
                </label>
              </div>
            </div>
          </div>
        ))}

        {/* Observaciones */}
        <div className="mt-4">
          <label className="block mb-1 font-semibold text-sm">Observaciones</label>
          <textarea
            rows="3"
            className={`w-full border p-2 rounded text-sm ${!Object.values(secciones).includes('NO CONFORME') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            disabled={!Object.values(secciones).includes('NO CONFORME')}
          ></textarea>
          {Object.values(secciones).includes('NO CONFORME') && observaciones.trim() === '' && (
            <p className="text-xs text-red-600 mt-1">
              Debes ingresar observaciones para las secciones NO CONFORME.
            </p>
          )}
        </div>

        {/* Mensaje (por si hubiera) */}
        {mensajeGuardado && (
          <div className={`mt-4 text-sm ${mensajeGuardado.startsWith('✅') ? 'text-green-700' : 'text-red-700'}`}>
            {mensajeGuardado}
          </div>
        )}

        {/* Botones */}
        <div className="mt-8 space-y-4">
          <div className="flex justify-center">
            <button
              onClick={handleGuardar}
              disabled={!puedeGuardar || guardando}
              className={`py-2 px-6 rounded-lg shadow-md flex items-center gap-2 text-sm ${
                puedeGuardar && !guardando
                  ? 'bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white'
                  : 'bg-gray-400 text-gray-700 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-save"></i> {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          <div className="flex justify-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/instructor/practica')}
              className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 rounded-lg shadow-md flex items-center gap-2 text-sm"
            >
              <i className="fas fa-arrow-left"></i> Regresar
            </button>
            <button
              onClick={handleLogout}
              className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 px-4 rounded-lg shadow-md flex items-center gap-2 text-sm"
            >
              <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Modal advertencia de kilometraje */}
      {mostrarModalKm && datosKm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-red-600">
              Advertencia de Kilometraje
            </h3>
            <p className="text-sm mb-2">
              El kilometraje ingresado <strong>{kilometraje}</strong> supera en más de 300 km el último registrado.
            </p>
            <p className="text-sm mb-2">
              <strong>Último registro:</strong> {datosKm.maxKm} km
            </p>
            <p className="text-sm mb-2">
              <strong>Fuente:</strong> {datosKm.fuente} ({datosKm.campo})
            </p>
            <p className="text-sm mb-4">
              Diferencia: <strong>{datosKm.diferencia} km</strong>
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setMostrarModalKm(false)
                  setForzarGuardado(true)
                }}
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded"
              >
                Confirmar y Guardar
              </button>
              <button
                onClick={() => {
                  setMostrarModalKm(false)
                  setForzarGuardado(false)
                }}
                className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
