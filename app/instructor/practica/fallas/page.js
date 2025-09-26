'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { validarKilometraje } from '@/lib/servicios/validaciones'
import { cerrarSesion } from '@/lib/auth/logout'

// ---------- Helpers fecha/hora Bogotá ----------
const fmtBogota = (date, mode) => {
  const opts =
    mode === 'fecha'
      ? { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }
      : { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Bogota' }
  return new Intl.DateTimeFormat('en-CA', opts).format(date) // en-CA => YYYY-MM-DD / HH:mm:ss
}

const ahoraBogota = () => {
  const now = new Date()
  const fecha = fmtBogota(now, 'fecha') // YYYY-MM-DD
  const hora = fmtBogota(now, 'hora')   // HH:mm:ss
  return { fecha, hora }
}

// ---------- Consecutivo FM-000000X ----------
async function obtenerSiguienteConsecutivoFalla() {
  const { data, error } = await supabase
    .from('reporte_fallas')
    .select('consecutivo')
    .not('consecutivo', 'is', null)
    .order('consecutivo', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0 || !data[0]?.consecutivo) {
    return 'FM-0000001'
  }
  const last = String(data[0].consecutivo) // ej: "FM-0000012"
  const num = parseInt(last.replace('FM-', ''), 10)
  const next = isNaN(num) ? 1 : num + 1
  return 'FM-' + String(next).padStart(7, '0')
}

// ---------- Helpers correo (mismo patrón Inspección) ----------
async function enviarCorreoFallas({ para, asunto, html, cc, bcc }) {
  try {
    const res = await fetch('/api/email/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ para, asunto, html, cc, bcc }),
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

async function obtenerEmailUsuario(user) {
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

// Igual que Inspección: leer de NEXT_PUBLIC_MAIL_MANTENIMIENTO
function obtenerDestinatariosCorporativos() {
  const s = process.env.NEXT_PUBLIC_MAIL_MANTENIMIENTO || ''
  return s.split(',').map(x => x.trim()).filter(Boolean)
}

// ---------- Página ----------
export default function FallasPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Catálogo
  const [vehiculos, setVehiculos] = useState([])
  // Form
  const [placa, setPlaca] = useState('')
  const [tipoVehiculo, setTipoVehiculo] = useState('-')
  const [marca, setMarca] = useState('-')
  const [km, setKm] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [acciones, setAcciones] = useState('')

  // Validaciones / mensajes
  const [msgKm, setMsgKm] = useState('')
  const [forzarKm, setForzarKm] = useState(false)
  const [tocoDescripcion, setTocoDescripcion] = useState(false)
  const [tocoAcciones, setTocoAcciones] = useState(false)
  const [tocoPlaca, setTocoPlaca] = useState(false)

  // Modal advertencia KM
  const [modalKm, setModalKm] = useState(null) // { maxKm, diferencia, fuente, campo }

  // Estado de guardado
  const [guardando, setGuardando] = useState(false)

  // Cargar usuario y vehículos
  useEffect(() => {
    const stored = localStorage.getItem('currentUser')
    if (!stored) {
      router.push('/login')
      return
    }
    const u = JSON.parse(stored)
    setUser(u)

    const cargarVehiculos = async () => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('placa, tipo_vehiculo, marca')
        .order('placa', { ascending: true })
      if (!error && data) setVehiculos(data)
    }
    cargarVehiculos()
  }, [router])

  // Autocompletar tipo/marca
  useEffect(() => {
    if (!placa) {
      setTipoVehiculo('-')
      setMarca('-')
      return
    }
    const v = vehiculos.find(v => v.placa === placa)
    setTipoVehiculo(v?.tipo_vehiculo || '-')
    setMarca(v?.marca || '-')
  }, [placa, vehiculos])

  // Validación de KM (en tiempo real)
  const onKmChange = async (e) => {
    const val = e.target.value
    setKm(val)
    setMsgKm('')
    setForzarKm(false)
    if (!placa || !val) return
    const r = await validarKilometraje(placa, parseInt(val, 10))
    if (r.estado === 'error') {
      setMsgKm(r.mensaje)
      toast.error(r.mensaje)
      return
    }
    if (r.estado === 'advertencia') {
      setMsgKm(r.mensaje)
      setModalKm({
        maxKm: r.maxKm,
        diferencia: r.diferencia,
        fuente: r.fuente,
        campo: r.campo,
      })
      return
    }
    setMsgKm(r.mensaje) // ok
  }

  // Habilitar Registrar
  const puedeGuardar = useMemo(() => {
    const placaOk = !!placa
    const kmOk = (msgKm && !msgKm.includes('menor')) || forzarKm
    const descOk = descripcion.trim().length > 0
    const accOk = acciones.trim().length > 0
    return placaOk && kmOk && descOk && accOk
  }, [placa, msgKm, forzarKm, descripcion, acciones])

  // Guardar
  const registrarFalla = async () => {
    if (!puedeGuardar || guardando || !user) return
    setGuardando(true)
    try {
      const { fecha, hora } = ahoraBogota()
      const consecutivo = await obtenerSiguienteConsecutivoFalla()

      // Payload según la tabla reporte_fallas
      const payload = {
        consecutivo,
        fecha,                 // date
        hora,                  // text
        placa,
        tipo_vehiculo: tipoVehiculo,
        marca,
        kilometraje: Number(km),
        nombre_encargado: user.nombreCompleto || user.usuario || '',
        descripcion_falla: descripcion.trim().toUpperCase(),
        acciones_tomadas: acciones.trim().toUpperCase(),
        estado: 'PENDIENTE',
      }

      const { error } = await supabase.from('reporte_fallas').insert([payload])
      if (error) {
        console.error('Supabase insert error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        toast.error('No se pudo registrar la falla.')
        setGuardando(false)
        return
      }

      // --- Envío de correos (igual patrón que Inspección) ---
      try {
        // 1) Usuario
        const correoUsuario = await obtenerEmailUsuario(user)
        if (correoUsuario) {
          const asunto = `Reporte de Falla registrado: ${consecutivo}`
          const html = `
            <p>Hola ${user.nombreCompleto || user.usuario || ''},</p>
            <p>Reporte técnico de falla en vehículo en misión – Acción de seguimiento necesaria:</p>
            <ul>
              <li><b>Consecutivo:</b> ${consecutivo}</li>
              <li><b>Fecha:</b> ${fecha}</li>
              <li><b>Hora:</b> ${hora}</li>
              <li><b>Placa:</b> ${placa}</li>
              <li><b>Tipo:</b> ${tipoVehiculo}</li>
              <li><b>Marca:</b> ${marca}</li>
              <li><b>Kilometraje:</b> ${Number(km)}</li>
              <li><b>Encargado:</b> ${user.nombreCompleto || user.usuario || ''}</li>
              <li><b>Descripción:</b> ${descripcion.trim().toUpperCase()}</li>
              <li><b>Acciones:</b> ${acciones.trim().toUpperCase()}</li>
              <li><b>Estado:</b> PENDIENTE</li>
            </ul>
            <p><em>Correo automático del sistema.</em></p>
          `
          await enviarCorreoFallas({ para: correoUsuario, asunto, html })
        }

        // 2) Corporativo (desde NEXT_PUBLIC_MAIL_MANTENIMIENTO)
        const destinatarios = obtenerDestinatariosCorporativos()
        if (destinatarios.length > 0) {
          const asuntoC = `🚧 Nueva falla reportada (${consecutivo}) - ${placa}`
          const htmlC = `
            <p><strong>Se registró un reporte de falla en misión.</strong></p>
            <ul>
              <li><b>Consecutivo:</b> ${consecutivo}</li>
              <li><b>Fecha:</b> ${fecha}</li>
              <li><b>Hora:</b> ${hora}</li>
              <li><b>Placa:</b> ${placa}</li>
              <li><b>Tipo:</b> ${tipoVehiculo}</li>
              <li><b>Marca:</b> ${marca}</li>
              <li><b>Kilometraje:</b> ${Number(km)}</li>
              <li><b>Encargado:</b> ${user.nombreCompleto || user.usuario || ''}</li>
              <li><b>Descripción:</b> ${descripcion.trim().toUpperCase()}</li>
              <li><b>Acciones:</b> ${acciones.trim().toUpperCase()}</li>
              <li><b>Estado:</b> PENDIENTIENTE</li>
            </ul>
            <p><em>Correo automático del sistema.</em></p>
          `
          await enviarCorreoFallas({ para: destinatarios, asunto: asuntoC, html: htmlC })
        }
      } catch (e) {
        console.error('Error enviando correos de falla:', e?.message || e)
      }

      toast.success(`Falla registrada (${consecutivo}).`)
      // Limpiar y volver al menú
      setPlaca('')
      setTipoVehiculo('-')
      setMarca('-')
      setKm('')
      setDescripcion('')
      setAcciones('')
      setMsgKm('')
      setForzarKm(false)
      router.push('/instructor/practica')
    } finally {
      setGuardando(false)
    }
  }

  const handleLogout = () => cerrarSesion(router)

  // ---------- Render ----------
  if (!user) return <p className="text-center mt-20">Cargando...</p>

  const mostrarErrPlaca = tocoPlaca && !placa
  const mostrarErrDesc = tocoDescripcion && descripcion.trim().length === 0
  const mostrarErrAcc = tocoAcciones && acciones.trim().length === 0

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-5">

        {/* Título */}
        <h2 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2 border-b pb-2 text-[var(--primary-dark)]">
          <i className="fas fa-exclamation-triangle text-[var(--primary)]"></i>
          Registro de Fallas en Misión
        </h2>

        {/* Usuario */}
        <div className="bg-gray-50 p-2 rounded mb-4 text-xs border text-center">
          Usuario: <strong>{user.nombreCompleto}</strong>
        </div>

        {/* Formulario */}
        <div className="space-y-6">
          {/* Vehículo */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-900 text-white px-3 py-2 font-semibold text-sm flex items-center gap-2">
              <i className="fas fa-car"></i> Vehículo
            </div>
            <div className="p-3 space-y-3">
              {/* Placa */}
              <div>
                <label className="block mb-1 font-semibold text-sm">Placa del Vehículo</label>
                <select
                  className={`w-full border p-2 rounded text-sm ${mostrarErrPlaca ? 'border-red-500' : ''}`}
                  value={placa}
                  onChange={(e) => { setPlaca(e.target.value); setTocoPlaca(true) }}
                  onBlur={() => setTocoPlaca(true)}
                  required
                >
                  <option value="">-- Selecciona una placa --</option>
                  {vehiculos.map(v => (
                    <option key={v.placa} value={v.placa}>{v.placa}</option>
                  ))}
                </select>
                {mostrarErrPlaca && (
                  <small className="text-xs text-red-600">Debes seleccionar una placa.</small>
                )}

                {/* Info-box */}
                <div className="text-xs text-gray-600 mt-2">
                  <p><strong>Tipo de Vehículo:</strong> {tipoVehiculo}</p>
                  <p><strong>Marca:</strong> {marca}</p>
                </div>
              </div>

              {/* Kilometraje */}
              <div>
                <label className="block mb-1 font-semibold text-sm">Kilometraje Actual</label>
                <input
                  type="number"
                  className={`w-full border p-2 rounded text-sm ${(!placa) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Ingrese el kilometraje"
                  min="0"
                  value={km}
                  onChange={onKmChange}
                  disabled={!placa}
                  required
                />
                {msgKm && (
                  <small className={`text-xs mt-1 block ${
                    msgKm.includes('menor') ? 'text-red-600' :
                    msgKm.includes('supera') ? 'text-orange-600' : 'text-green-600'
                  }`}>{msgKm}</small>
                )}
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-900 text-white px-3 py-2 font-semibold text-sm flex items-center gap-2">
              <i className="fas fa-file-alt"></i> Descripción
            </div>
            <div className="p-3">
              <textarea
                className={`w-full border p-2 rounded text-sm ${mostrarErrDesc ? 'border-red-500' : ''}`}
                rows="3"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                onBlur={() => setTocoDescripcion(true)}
                placeholder="Describa la falla..."
                required
              />
              {mostrarErrDesc && (
                <small className="text-xs text-red-600">La descripción es obligatoria.</small>
              )}
            </div>
          </div>

          {/* Acciones tomadas */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-900 text-white px-3 py-2 font-semibold text-sm flex items-center gap-2">
              <i className="fas fa-tasks"></i> Acciones Tomadas
            </div>
            <div className="p-3">
              <textarea
                className={`w-full border p-2 rounded text-sm ${mostrarErrAcc ? 'border-red-500' : ''}`}
                rows="3"
                value={acciones}
                onChange={(e) => setAcciones(e.target.value)}
                onBlur={() => setTocoAcciones(true)}
                placeholder="Describa las acciones tomadas..."
                required
              />
              {mostrarErrAcc && (
                <small className="text-xs text-red-600">Las acciones tomadas son obligatorias.</small>
              )}
            </div>
          </div>
        </div>

        {/* Botones finales */}
        <div className="flex justify-center gap-3 mt-6 flex-wrap">
          <button
            onClick={registrarFalla}
            disabled={!puedeGuardar || guardando}
            className={`py-2 px-4 rounded-lg shadow-md text-sm ${
              puedeGuardar && !guardando
                ? 'bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white'
                : 'bg-gray-400 text-gray-700 cursor-not-allowed'
            }`}
          >
            <i className="fas fa-save mr-2"></i> {guardando ? 'Guardando...' : 'Registrar'}
          </button>

          <button
            onClick={() => router.push('/instructor/practica')}
            className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 rounded-lg shadow-md text-sm"
          >
            <i className="fas fa-arrow-left mr-2"></i> Regresar
          </button>
          <button
            onClick={() => cerrarSesion(router)}
            className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 px-4 rounded-lg shadow-md text-sm"
          >
            <i className="fas fa-sign-out-alt mr-2"></i> Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Modal advertencia KM */}
      {modalKm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-3 text-red-600">Advertencia de Kilometraje</h3>
            <p className="text-sm mb-2">El valor ingresado supera en más de 300 km el último registrado.</p>
            <p className="text-sm mb-1"><b>Último registro:</b> {modalKm.maxKm} km</p>
            <p className="text-sm mb-1"><b>Fuente:</b> {modalKm.fuente} ({modalKm.campo})</p>
            <p className="text-sm mb-4"><b>Diferencia:</b> {modalKm.diferencia} km</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalKm(null)}
                className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setForzarKm(true); setModalKm(null)}}
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
