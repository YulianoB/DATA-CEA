'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster, toast } from 'sonner'

// Opciones fijas según App Script
const TIPOS = [
  'Reunión General',
  'Capacitación',
  'Socialización',
  'Sensibilización',
  'Comité',
  'Otra',
]
const MODALIDADES = ['Presencial', 'Virtual']
const DIRIGIDO_A = ['Todo el personal', 'Instructores', 'Administrativo']

function EstadoPill({ estado }) {
  const e = String(estado || '').toLowerCase()
  const map = {
    programada: 'bg-amber-100 text-amber-800 border-amber-200',
    ejecutada: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelada: 'bg-rose-100 text-rose-800 border-rose-200',
  }
  const cls = map[e] || 'bg-slate-100 text-slate-700 border-slate-200'
  return (
    <span className={`inline-flex items-center px-2 py-[2px] rounded-full border text-[11px] font-medium ${cls}`}>
      {estado}
    </span>
  )
}

export default function AdminReunionesPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Form
  const [form, setForm] = useState({
    tipo_reunion: '',
    descripcion: '',
    fecha_programada: '',
    hora_inicio: '',
    hora_fin: '',
    modalidad: 'Presencial',
    responsable: '',
    dirigido_a: 'Todo el personal',
    lugar: '',
  })

  // Estado UI
  const [guardando, setGuardando] = useState(false)
  const [cargandoLista, setCargandoLista] = useState(false)
  const [reuniones, setReuniones] = useState([])

  // Cargar usuario y lista inicial
  useEffect(() => {
    const s = localStorage.getItem('currentUser')
    if (!s) { router.push('/login'); return }
    setUser(JSON.parse(s))
    cargarReuniones()
  }, [router])

  const cargarReuniones = async () => {
    setCargandoLista(true)
    try {
      const res = await fetch('/api/reuniones?limit=20', { cache: 'no-store' })
      const json = await res.json()
      if (json?.status === 'success') {
        const arr = Array.isArray(json.data) ? [...json.data] : []
        // Orden: fecha desc, hora asc (seguro)
        arr.sort((a, b) => {
          const fcmp = String(b.fecha_programada).localeCompare(String(a.fecha_programada))
          if (fcmp !== 0) return fcmp
          return String(a.hora_inicio).localeCompare(String(b.hora_inicio))
        })
        setReuniones(arr)
      } else {
        toast.error('No se pudo cargar la lista de reuniones.')
      }
    } catch (e) {
      toast.error('Error al cargar reuniones')
    } finally {
      setCargandoLista(false)
    }
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const limpiarForm = () => {
    setForm({
      tipo_reunion: '',
      descripcion: '',
      fecha_programada: '',
      hora_inicio: '',
      hora_fin: '',
      modalidad: 'Presencial',
      responsable: '',
      dirigido_a: 'Todo el personal',
      lugar: '',
    })
  }

  const validarForm = () => {
    if (!form.tipo_reunion || !form.descripcion || !form.fecha_programada || !form.hora_inicio || !form.hora_fin) {
      toast.warning('Completa los campos obligatorios: Tipo, Descripción, Fecha, Hora Inicio y Hora Fin.')
      return false
    }
    if (form.hora_fin <= form.hora_inicio) {
      toast.warning('Hora Fin debe ser mayor a Hora Inicio.')
      return false
    }
    return true
  }

  const crearReunion = async () => {
    if (!user) { toast.error('Sesión no válida.'); return }
    if (!validarForm()) return
    setGuardando(true)
    try {
      const payload = {
        ...form,
        creado_por: user?.nombreCompleto || 'Desconocido',
      }
      const res = await fetch('/api/reuniones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json?.status === 'success') {
        toast.success('✅ Reunión creada y notificaciones enviadas.')
        limpiarForm()
        cargarReuniones()
      } else {
        toast.error('No se pudo crear la reunión.')
      }
    } catch (e) {
      toast.error('Error al crear reunión.')
    } finally {
      setGuardando(false)
    }
  }

  const cancelarReunion = async (id, estadoActual) => {
    if (estadoActual !== 'Programada') return
    const ok = window.confirm('¿Confirmas cancelar esta reunión?')
    if (!ok) return
    try {
      const res = await fetch(`/api/reuniones/${id}/estado`, { method: 'PATCH' })
      const json = await res.json()
      if (json?.status === 'success') {
        toast.success('Reunión cancelada.')
        cargarReuniones()
      } else {
        toast.error(json?.message || 'No se pudo cancelar.')
      }
    } catch {
      toast.error('Error al cancelar reunión.')
    }
  }

  const descargarExcel = (id) => {
    window.open(`/api/reuniones/${id}/asistentes.xlsx`, '_blank')
  }

  if (!user) return <p className="text-center mt-20">Cargando...</p>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-lg p-4 md:p-6">

        {/* Encabezado simple (sin botón aquí, va en la botonera del form) */}
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-calendar-plus text-xl md:text-2xl text-[var(--primary)]"></i>
          <h2 className="text-lg md:text-xl font-bold uppercase text-[var(--primary)]">
            Programar Reunión o Capacitación
          </h2>
        </div>

        {/* Usuario */}
        <p className="bg-blue-50 border border-blue-200 text-[var(--primary-dark)] p-2 rounded-md mb-4 text-center text-sm">
          Usuario: <strong>{user.nombreCompleto}</strong> ({user.rol})
        </p>

        {/* Card Formulario */}
        <div className="rounded-xl border shadow-sm mb-6">
          <div className="px-3 py-2 rounded-t-xl bg-[var(--primary-dark)] text-white text-sm font-semibold flex items-center gap-2">
            <i className="fas fa-pen-to-square"></i>
            Datos de la reunión
          </div>

          <div className="p-3">
            {/* === FILA 1 === */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold mb-1">Tipo de Reunión *</label>
                <select
                  name="tipo_reunion"
                  value={form.tipo_reunion}
                  onChange={onChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="">-- Selecciona --</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="md:col-span-9">
                <label className="block text-xs font-semibold mb-1">Descripción *</label>
                <textarea
                  name="descripcion"
                  rows={2}
                  value={form.descripcion}
                  onChange={onChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>

            {/* === FILA 2 === */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold mb-1">Fecha Programada *</label>
                <input
                  type="date"
                  name="fecha_programada"
                  value={form.fecha_programada}
                  onChange={onChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold mb-1">Hora Inicio *</label>
                <input
                  type="time"
                  name="hora_inicio"
                  value={form.hora_inicio}
                  onChange={onChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold mb-1">Hora Fin *</label>
                <input
                  type="time"
                  name="hora_fin"
                  value={form.hora_fin}
                  onChange={onChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold mb-1">Modalidad</label>
                <select
                  name="modalidad"
                  value={form.modalidad}
                  onChange={onChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* === FILA 3 === */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold mb-1">Responsable / Líder</label>
                <input
                  type="text"
                  name="responsable"
                  value={form.responsable}
                  onChange={onChange}
                  placeholder="Nombre del encargado"
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold mb-1">Dirigido a</label>
                <select
                  name="dirigido_a"
                  value={form.dirigido_a}
                  onChange={onChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  {DIRIGIDO_A.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold mb-1">Lugar</label>
                <input
                  type="text"
                  name="lugar"
                  value={form.lugar}
                  onChange={onChange}
                  placeholder="Ej: Auditorio, Sala 2, etc."
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>

            {/* Botonera form (tamaños como Consultas) */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-end mt-4">
              <button
                onClick={crearReunion}
                disabled={guardando}
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-2 py-1 rounded text-xs disabled:opacity-60"
              >
                <i className="fas fa-save"></i> {guardando ? 'Guardando...' : 'Guardar Reunión'}
              </button>
              <button
                onClick={limpiarForm}
                className="bg-gray-500 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
              >
                <i className="fas fa-eraser"></i> Limpiar
              </button>
              <button
                onClick={cargarReuniones}
                disabled={cargandoLista}
                className="bg-slate-700 hover:bg-slate-800 text-white px-2 py-1 rounded text-xs disabled:opacity-60"
              >
                <i className="fas fa-rotate"></i> {cargandoLista ? 'Actualizando...' : 'Actualizar lista'}
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-600 hover:bg-gray-800 text-white px-2 py-1 rounded text-xs flex items-center gap-2"
                title="Regresar al Menú"
              >
                <i className="fas fa-arrow-left"></i>
                Regresar
              </button>
            </div>
          </div>
        </div>

        {/* Card Listado */}
        <div className="rounded-xl border shadow-sm">
          <div className="px-3 py-2 rounded-t-xl bg-[var(--primary-dark)] text-white text-sm font-semibold flex items-center gap-2">
            <i className="fas fa-list"></i>
            Reuniones programadas (últimas 20)
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead className="bg-slate-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="p-2 border text-center">Tipo</th>
                  <th className="p-2 border text-center">Descripción</th>
                  <th className="p-2 border text-center">Fecha</th>
                  <th className="p-2 border text-center">Hora</th>
                  <th className="p-2 border text-center">Modalidad</th>
                  <th className="p-2 border text-center">Responsable</th>
                  <th className="p-2 border text-center">Dirigido a</th>
                  <th className="p-2 border text-center">Lugar</th>
                  <th className="p-2 border text-center">Estado</th>
                  <th className="p-2 border text-center whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargandoLista ? (
                  <tr>
                    <td colSpan={10} className="p-3 text-center text-gray-500">Cargando...</td>
                  </tr>
                ) : reuniones.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-3 text-center text-gray-500">No hay reuniones registradas.</td>
                  </tr>
                ) : (
                  reuniones.map((r) => {
                    const horaTxt = `${r.hora_inicio} - ${r.hora_fin}`

                    // Habilitaciones según hora Bogotá
                    const hoy = new Intl.DateTimeFormat('en-CA', {
                      timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
                    }).format(new Date()) // YYYY-MM-DD
                    const hm = new Intl.DateTimeFormat('en-GB', {
                      timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false
                    }).format(new Date()) // HH:mm
                    const yaTermino = (String(r.fecha_programada) < hoy) ||
                                      (String(r.fecha_programada) === hoy && String(r.hora_fin) <= hm)

                    const puedeCancelar = r.estado === 'Programada' && !yaTermino
                    const puedeExcel = r.estado === 'Ejecutada'

                    return (
                      <tr key={r.id} className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 transition">
                        <td className="p-2 border text-center">{r.tipo_reunion}</td>
                        <td className="p-2 border text-center">{r.descripcion}</td>
                        <td className="p-2 border text-center whitespace-nowrap">{r.fecha_programada}</td>
                        <td className="p-2 border text-center whitespace-nowrap">{horaTxt}</td>
                        <td className="p-2 border text-center">{r.modalidad}</td>
                        <td className="p-2 border text-center">{r.responsable || '-'}</td>
                        <td className="p-2 border text-center">{r.dirigido_a || '-'}</td>
                        <td className="p-2 border text-center">{r.lugar || '-'}</td>
                        <td className="p-2 border text-center">
                          <EstadoPill estado={r.estado} />
                        </td>
                        <td className="p-2 border text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => descargarExcel(r.id)}
                              disabled={!puedeExcel}
                              className={`px-2 py-1 rounded text-xs ${
                                puedeExcel
                                  ? 'bg-green-600 hover:bg-green-800 text-white'
                                  : 'bg-green-400/60 text-white cursor-not-allowed'
                              }`}
                              title={puedeExcel ? 'Descargar asistentes (Excel)' : 'Disponible cuando esté Ejecutada'}
                            >
                              <i className="fas fa-file-excel"></i>
                            </button>

                            <button
                              onClick={() => cancelarReunion(r.id, r.estado)}
                              disabled={!puedeCancelar}
                              className={`px-2 py-1 rounded text-xs ${
                                puedeCancelar
                                  ? 'bg-red-600 hover:bg-red-800 text-white'
                                  : 'bg-red-400/60 text-white cursor-not-allowed'
                              }`}
                              title={puedeCancelar ? 'Cancelar reunión' : 'Fuera de rango de fecha/hora o no disponible'}
                            >
                              <i className="fas fa-ban"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
