// app/admin/mantenimientos/proveedores/page.jsx

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  UserRound,
  Users,
  Wrench,
  X,
} from 'lucide-react'

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import { BotonAccion, ESTILO_ENCABEZADO_TABLA, ESTILO_SECCIONES_SECUNDARIAS, ESTILO_FRANJA_SUPERIOR_MODAL } from '@/components/admin/EstiloModulo'
import { cerrarSesion } from '@/lib/auth/logout'

const PROVEEDOR_VACIO = {
  id: null,
  tipo_persona: 'JURIDICA',
  razon_social: '',
  nombre_comercial: '',
  nit: '',
  digito_verificacion: '',
  direccion: '',
  telefono: '',
  email: '',
  departamento_id: '',
  municipio_id: '',
  activo: true,
  observaciones: '',
  actividad_ids: [],
}

const TECNICO_VACIO = {
  id: null,
  proveedor_id: null,
  nombres: '',
  documento: '',
  telefono: '',
  email: '',
  activo: true,
  observaciones: '',
}

function obtenerCurrentUser() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem('currentUser') || 'null')
  } catch {
    return null
  }
}

function obtenerNit(user) {
  return user?.nitEmpresa || user?.nit || user?.empresa?.nit || ''
}

function mensajeError(data, defecto) {
  return data?.message || data?.error || defecto
}

function nombreActividad(a) {
  return a?.nombre || a?.actividad || a?.descripcion || `Actividad ${a?.id ?? ''}`
}

function aMayusculas(valor) {
  return String(valor ?? '').toUpperCase()
}

function soloNumeros(valor) {
  return String(valor ?? '').replace(/\D/g, '')
}

function validarProveedor(form) {
  if (!form.razon_social.trim()) return 'La razón social o nombre del proveedor es obligatoria.'
  if (!form.nit.trim()) return 'El NIT o documento del proveedor es obligatorio.'
  if (form.nit && !/^\d+$/.test(form.nit)) return 'El NIT o documento debe contener únicamente números.'
  if (form.digito_verificacion && !/^\d$/.test(form.digito_verificacion)) return 'El dígito de verificación debe ser un solo número.'
  if (!form.departamento_id) return 'Seleccione el departamento.'
  if (!form.municipio_id) return 'Seleccione el municipio.'
  if (!form.direccion.trim()) return 'La dirección es obligatoria.'
  if (!form.telefono.trim()) return 'El teléfono es obligatorio.'
  if (!/^\d{7,10}$/.test(soloNumeros(form.telefono))) return 'El teléfono debe contener entre 7 y 10 números.'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Ingrese un correo electrónico válido.'
  return ''
}

function validarTecnico(form) {
  if (!form.nombres.trim()) return 'Los nombres del técnico son obligatorios.'
  if (!form.documento.trim()) return 'El documento del técnico es obligatorio.'
  if (!/^\d{5,12}$/.test(soloNumeros(form.documento))) return 'El documento debe contener entre 5 y 12 números.'
  if (!form.telefono.trim()) return 'El teléfono del técnico es obligatorio.'
  if (!/^\d{7,10}$/.test(soloNumeros(form.telefono))) return 'El teléfono debe contener entre 7 y 10 números.'
  if (soloNumeros(form.documento) === soloNumeros(form.telefono)) return 'El documento y el teléfono no pueden ser iguales. Verifique que no haya intercambiado los datos.'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Ingrese un correo electrónico válido.'
  return ''
}

export default function ProveedoresMantenimientoPage() {
  const router = useRouter()

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [proveedores, setProveedores] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [actividades, setActividades] = useState([])

  const [modalProveedor, setModalProveedor] = useState(false)
  const [form, setForm] = useState(PROVEEDOR_VACIO)
  const [busquedaActividad, setBusquedaActividad] = useState('')
  const [tipoVehiculoActividad, setTipoVehiculoActividad] = useState('TODOS')

  const [modalTecnicos, setModalTecnicos] = useState(false)
  const [proveedorTecnicos, setProveedorTecnicos] = useState(null)
  const [formTecnico, setFormTecnico] = useState(TECNICO_VACIO)

  const currentUser = useMemo(() => obtenerCurrentUser(), [])
  const nit = useMemo(() => obtenerNit(currentUser), [currentUser])

  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!nit) {
      setError('No fue posible identificar la empresa de la sesión.')
      setCargando(false)
      return
    }

    if (!silencioso) setCargando(true)
    setError('')

    try {
      const r = await fetch('/api/admin/mantenimientos/proveedores', {
        method: 'GET',
        headers: { 'x-cea-nit': nit },
        cache: 'no-store',
      })

      const data = await r.json().catch(() => ({}))
      if (!r.ok || !data?.ok) {
        throw new Error(mensajeError(data, 'No fue posible consultar los proveedores.'))
      }

      setProveedores(Array.isArray(data.proveedores) ? data.proveedores : [])
      setDepartamentos(Array.isArray(data.departamentos) ? data.departamentos : [])
      setMunicipios(Array.isArray(data.municipios) ? data.municipios : [])
      setActividades(Array.isArray(data.actividades) ? data.actividades : [])
    } catch (e) {
      console.error(e)
      setError(e?.message || 'Error consultando proveedores.')
    } finally {
      setCargando(false)
    }
  }, [nit])

  useEffect(() => {
    cargar()
  }, [cargar])

  const proveedoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase()
    if (!q) return proveedores

    return proveedores.filter((p) =>
      [
        p.razon_social,
        p.nombre_comercial,
        p.nit,
        p.telefono,
        p.email,
      ]
        .filter(Boolean)
        .some((x) => String(x).toUpperCase().includes(q))
    )
  }, [proveedores, busqueda])

  const municipiosForm = useMemo(() => {
    if (!form.departamento_id) return []
    return municipios.filter(
      (m) => Number(m.departamento_id) === Number(form.departamento_id)
    )
  }, [municipios, form.departamento_id])

  const actividadesFiltradas = useMemo(() => {
    const q = busquedaActividad.trim().toUpperCase()

    return actividades.filter((a) => {
      const tipo = String(a?.tipo_vehiculo || '').toUpperCase()
      const coincideTipo =
        tipoVehiculoActividad === 'TODOS' || tipo === tipoVehiculoActividad

      const texto = [
        nombreActividad(a),
        a?.accion,
        a?.tipo_vehiculo,
      ]
        .filter(Boolean)
        .join(' ')
        .toUpperCase()

      const coincideBusqueda = !q || texto.includes(q)

      return coincideTipo && coincideBusqueda
    })
  }, [actividades, busquedaActividad, tipoVehiculoActividad])

  function abrirNuevo() {
    setError('')
    setMensaje('')
    setBusquedaActividad('')
    setTipoVehiculoActividad('TODOS')
    setForm(PROVEEDOR_VACIO)
    setModalProveedor(true)
  }

  function editarProveedor(p) {
    setError('')
    setMensaje('')
    setBusquedaActividad('')
    setTipoVehiculoActividad('TODOS')
    setForm({
      id: p.id,
      tipo_persona: p.tipo_persona || 'JURIDICA',
      razon_social: p.razon_social || '',
      nombre_comercial: p.nombre_comercial || '',
      nit: p.nit || '',
      digito_verificacion: p.digito_verificacion || '',
      direccion: p.direccion || '',
      telefono: p.telefono || '',
      email: p.email || '',
      departamento_id: p.departamento_id || '',
      municipio_id: p.municipio_id || '',
      activo: p.activo !== false,
      observaciones: p.observaciones || '',
      actividad_ids: Array.isArray(p.actividad_ids) ? p.actividad_ids : [],
    })
    setModalProveedor(true)
  }

  function seleccionarActividad(id) {
    const actividadId = Number(id)
    setForm((actual) => ({
      ...actual,
      actividad_ids: actual.actividad_ids.includes(actividadId)
        ? actual.actividad_ids.filter((x) => x !== actividadId)
        : [...actual.actividad_ids, actividadId],
    }))
  }

  async function enviar(body) {
    const r = await fetch('/api/admin/mantenimientos/proveedores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cea-nit': nit,
      },
      body: JSON.stringify(body),
    })

    const data = await r.json().catch(() => ({}))
    if (!r.ok || !data?.ok) {
      throw new Error(mensajeError(data, 'No fue posible completar la operación.'))
    }
    return data
  }

  async function guardarProveedor(e) {
    e.preventDefault()
    setError('')
    setMensaje('')

    const validacion = validarProveedor(form)
    if (validacion) {
      setError(validacion)
      return
    }

    setGuardando(true)
    try {
      const data = await enviar({
        accion: 'GUARDAR_PROVEEDOR',
        ...form,
        departamento_id: form.departamento_id || null,
        municipio_id: form.municipio_id || null,
      })

      setMensaje(data.message || 'Proveedor guardado correctamente.')
      setModalProveedor(false)
      await cargar({ silencioso: true })
    } catch (e) {
      setError(e?.message || 'No fue posible guardar el proveedor.')
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarEstadoProveedor(p) {
    setError('')
    setMensaje('')
    try {
      const data = await enviar({
        accion: 'CAMBIAR_ESTADO_PROVEEDOR',
        id: p.id,
        activo: !p.activo,
      })
      setMensaje(data.message)
      await cargar({ silencioso: true })
    } catch (e) {
      setError(e?.message || 'No fue posible cambiar el estado.')
    }
  }

  function abrirTecnicos(p) {
    setProveedorTecnicos(p)
    setFormTecnico({ ...TECNICO_VACIO, proveedor_id: p.id })
    setModalTecnicos(true)
  }

  function editarTecnico(t) {
    setFormTecnico({
      id: t.id,
      proveedor_id: t.proveedor_id,
      nombres: t.nombres || '',
      documento: t.documento || '',
      telefono: t.telefono || '',
      email: t.email || '',
      activo: t.activo !== false,
      observaciones: t.observaciones || '',
    })
  }

  async function guardarTecnico(e) {
    e.preventDefault()
    setError('')
    setMensaje('')

    const validacion = validarTecnico(formTecnico)
    if (validacion) {
      setError(validacion)
      return
    }

    setGuardando(true)
    try {
      const data = await enviar({
        accion: 'GUARDAR_TECNICO',
        ...formTecnico,
      })
      setMensaje(data.message || 'Técnico guardado correctamente.')
      await cargar({ silencioso: true })

      setFormTecnico({
        ...TECNICO_VACIO,
        proveedor_id: proveedorTecnicos.id,
      })

      const actualizados = await fetch('/api/admin/mantenimientos/proveedores', {
        headers: { 'x-cea-nit': nit },
        cache: 'no-store',
      }).then((r) => r.json())

      const actualizado = (actualizados.proveedores || []).find(
        (x) => Number(x.id) === Number(proveedorTecnicos.id)
      )
      if (actualizado) setProveedorTecnicos(actualizado)
    } catch (e) {
      setError(e?.message || 'No fue posible guardar el técnico.')
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarEstadoTecnico(t) {
    setError('')
    setMensaje('')
    try {
      const data = await enviar({
        accion: 'CAMBIAR_ESTADO_TECNICO',
        id: t.id,
        activo: !t.activo,
      })
      setMensaje(data.message)
      await cargar({ silencioso: true })

      setProveedorTecnicos((actual) => ({
        ...actual,
        tecnicos: (actual?.tecnicos || []).map((x) =>
          Number(x.id) === Number(t.id) ? { ...x, activo: !x.activo } : x
        ),
      }))
    } catch (e) {
      setError(e?.message || 'No fue posible cambiar el estado del técnico.')
    }
  }

  function nombreDepartamento(id) {
    return departamentos.find((x) => Number(x.id) === Number(id))?.nombre || '—'
  }

  function nombreMunicipio(id) {
    return municipios.find((x) => Number(x.id) === Number(id))?.nombre || '—'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-3 md:p-5">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        <EncabezadoModulo
          titulo="Proveedores y Talleres"
          subtitulo="Administración de proveedores, actividades autorizadas y técnicos"
          icono={Wrench}
          rutaRegreso="/admin/mantenimientos"
          textoRegreso="Mantenimiento Vehicular"
          
        />

        <main className="p-4 md:p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-lg font-extrabold text-slate-800">
                Proveedores de mantenimiento
              </h1>
              <p className="text-xs text-slate-500">
                {proveedores.length} proveedor(es) registrado(s)
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar proveedor..."
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500 sm:w-72"
                />
              </div>

              <BotonAccion tipo="actualizar"
                type="button"
                onClick={() => cargar()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </BotonAccion>

              <BotonAccion tipo="agregar"
                type="button"
                onClick={abrirNuevo}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" />
                Nuevo proveedor
              </BotonAccion>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {mensaje}
            </div>
          )}

          {cargando ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Consultando proveedores...
            </div>
          ) : proveedoresFiltrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <Building2 className="mx-auto mb-3 h-9 w-9 text-slate-400" />
              <p className="font-bold text-slate-700">No se encontraron proveedores.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="text-slate-800" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>
                  <tr>
                    <th className="border border-slate-300 px-3 py-3">Proveedor / taller</th>
                    <th className="border border-slate-300 px-3 py-3">NIT</th>
                    <th className="border border-slate-300 px-3 py-3">Ubicación</th>
                    <th className="border border-slate-300 px-3 py-3">Contacto</th>
                    <th className="border border-slate-300 px-3 py-3 text-center">Actividades</th>
                    <th className="border border-slate-300 px-3 py-3 text-center">Técnicos</th>
                    <th className="border border-slate-300 px-3 py-3 text-center">Estado</th>
                    <th className="border border-slate-300 px-3 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {proveedoresFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-3 py-3">
                        <div className="font-extrabold">
                          {p.razon_social}
                        </div>
                        {p.nombre_comercial && (
                          <div className="text-[11px] text-slate-500">
                            {p.nombre_comercial}
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-300 px-3 py-3 font-semibold text-slate-700">
                        {p.nit || '—'}
                        {p.digito_verificacion ? `-${p.digito_verificacion}` : ''}
                      </td>
                      <td className="border border-slate-300 px-3 py-3 text-slate-600">
                        <div>{nombreMunicipio(p.municipio_id)}</div>
                        <div className="text-[10px]">{nombreDepartamento(p.departamento_id)}</div>
                      </td>
                      <td className="border border-slate-300 px-3 py-3 text-slate-600">
                        <div>{p.telefono || '—'}</div>
                        <div className="text-[10px]">{p.email || ''}</div>
                      </td>
                      <td className="border border-slate-300 px-3 py-3 text-center font-bold">
                        {(p.actividad_ids || []).length}
                      </td>
                      <td className="border border-slate-300 px-3 py-3 text-center font-bold">
                        {(p.tecnicos || []).length}
                      </td>
                      <td className="border border-slate-300 px-3 py-3 text-center">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${
                          p.activo
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {p.activo ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-3 py-3">
                        <div className="flex justify-center gap-1">
                          <BotonAccion tipo="editar"
                            onClick={() => editarProveedor(p)}
                            className="rounded-md border border-slate-300 p-2 hover:bg-slate-100"
                            title="Editar proveedor"
                          >
                            <Pencil className="h-4 w-4" />
                          </BotonAccion>
                          <BotonAccion tipo="consultar"
                            onClick={() => abrirTecnicos(p)}
                            className="rounded-md border border-slate-300 p-2 hover:bg-slate-100"
                            title="Administrar técnicos"
                          >
                            <Users className="h-4 w-4" />
                          </BotonAccion>
                          <BotonAccion tipo={p.activo ? "eliminar" : "agregar"}
                            onClick={() => cambiarEstadoProveedor(p)}
                            className={`rounded-md px-2 py-1 text-[10px] font-extrabold text-white ${
                              p.activo
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {p.activo ? 'Inactivar' : 'Activar'}
                          </BotonAccion>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {modalProveedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <form
            onSubmit={guardarProveedor}
            className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: ESTILO_FRANJA_SUPERIOR_MODAL.fondo }}>
              <div>
                <div className="text-base font-bold text-white">
                  {form.id ? 'Editar proveedor / taller' : 'Nuevo proveedor / taller'}
                </div>
              </div>
              <button type="button" onClick={() => setModalProveedor(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-4 mt-4 rounded-lg border-l-4 border-[#737B87] bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
              Registre la información general del proveedor o taller y seleccione su ubicación. Las actividades pueden configurarse ahora o posteriormente; un proveedor sin actividades podrá utilizarse en mantenimientos correctivos, pero no en preventivos hasta completar su configuración. Los campos obligatorios deben completarse antes de guardar.
            </div>

            <div className="mx-4 mt-4 rounded-xl border border-slate-300 bg-white shadow-sm">
              <div className="border-b border-slate-300 px-4 py-2.5 text-xs font-bold text-white" style={{ backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo }}>Datos del proveedor / taller</div>
            <div className="grid gap-x-3 gap-y-3 p-4 md:grid-cols-12">
              <div className="md:col-span-3"><Campo label="Tipo de persona">
                <select
                  value={form.tipo_persona}
                  onChange={(e) => setForm({ ...form, tipo_persona: e.target.value })}
                  className="campo"
                >
                  <option value="JURIDICA">JURÍDICA</option>
                  <option value="NATURAL">NATURAL</option>
                </select>
              </Campo></div>

              <div className="md:col-span-5"><Campo label="Razón social / nombre *">
                <input
                  required
                  value={form.razon_social}
                  onChange={(e) => setForm({ ...form, razon_social: aMayusculas(e.target.value) })}
                  className="campo"
                />
              </Campo></div>

              <div className="md:col-span-4"><Campo label="Nombre comercial">
                <input
                  value={form.nombre_comercial}
                  onChange={(e) => setForm({ ...form, nombre_comercial: aMayusculas(e.target.value) })}
                  className="campo"
                />
              </Campo></div>

              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_72px] gap-2 md:col-span-4">
                <Campo label="NIT / documento">
                  <input
                    inputMode="numeric"
                    value={form.nit}
                    onChange={(e) =>
                      setForm({ ...form, nit: e.target.value.replace(/\D/g, '') })
                    }
                    className="campo"
                  />
                </Campo>
                <Campo label="DV (Dígito de Verificación)">
                  <input
                    inputMode="numeric"
                    maxLength={1}
                    value={form.digito_verificacion}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        digito_verificacion: e.target.value.replace(/\D/g, '').slice(0, 1),
                      })
                    }
                    className="campo"
                  />
                </Campo>
              </div>

              <div className="md:col-span-4"><Campo label="Departamento *">
                <select
                  value={form.departamento_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      departamento_id: e.target.value,
                      municipio_id: '',
                    })
                  }
                  className="campo"
                >
                  <option value="">Seleccione...</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </Campo></div>

              <div className="md:col-span-4"><Campo label="Municipio *">
                <select
                  value={form.municipio_id}
                  disabled={!form.departamento_id}
                  onChange={(e) => setForm({ ...form, municipio_id: e.target.value })}
                  className="campo disabled:bg-slate-100"
                >
                  <option value="">Seleccione...</option>
                  {municipiosForm.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </Campo></div>

              <div className="md:col-span-5"><Campo label="Dirección *">
                <input
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: aMayusculas(e.target.value) })}
                  className="campo"
                />
              </Campo></div>

              <div className="md:col-span-3"><Campo label="Teléfono *">
                <input
                  value={form.telefono}
                  inputMode="tel"
                  maxLength={10}
                  onChange={(e) => setForm({ ...form, telefono: soloNumeros(e.target.value).slice(0, 10) })}
                  className="campo"
                  placeholder="Ej. 3001234567"
                />
              </Campo></div>

              <div className="md:col-span-4"><Campo label="Correo">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="campo"
                />
              </Campo></div>

              <div className="md:col-span-12">
                <Campo label="Observaciones">
                  <textarea
                    rows={2}
                    value={form.observaciones}
                    onChange={(e) => setForm({ ...form, observaciones: aMayusculas(e.target.value) })}
                    className="campo"
                  />
                </Campo>
              </div>

            </div>

              <div className="mx-4 mt-4 overflow-hidden rounded-xl border border-slate-300 bg-white">
                <div className="border-b border-slate-300 p-3 text-white" style={{ backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo }}>
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="font-extrabold text-white">
                        Actividades de mantenimiento
                      </div>
                      <div className="mt-1 text-[10px] font-medium text-white/90">
                        Seleccione el tipo de vehículo y marque las actividades que este proveedor o taller puede realizar. Las selecciones se conservan al cambiar de tipo de vehículo.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        ['TODOS', 'TODOS'],
                        ['AUTOMOVIL', 'AUTOMÓVIL'],
                        ['CAMIONETA', 'CAMIONETA'],
                        ['CAMION', 'CAMIÓN'],
                        ['MOTOCICLETA', 'MOTOCICLETA'],
                      ].map(([valor, etiqueta]) => {
                        const activo = tipoVehiculoActividad === valor
                        const cantidad = valor === 'TODOS'
                          ? actividades.length
                          : actividades.filter(
                              (a) => String(a?.tipo_vehiculo || '').toUpperCase() === valor
                            ).length

                        return (
                          <button
                            key={valor}
                            type="button"
                            onClick={() => setTipoVehiculoActividad(valor)}
                            className={`rounded-lg border px-3 py-2 text-[10px] font-extrabold transition ${
                              activo
                                ? 'border-[#194567] bg-[#194567] text-white'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {etiqueta} ({cantidad})
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-[10px] font-semibold text-white/90">
                        Seleccionadas: {form.actividad_ids.length}
                      </div>
                      <input
                        value={busquedaActividad}
                        onChange={(e) => setBusquedaActividad(e.target.value)}
                        placeholder="Buscar actividad o acción..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none sm:max-w-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid max-h-72 gap-2 overflow-y-auto p-3 md:grid-cols-2">
                  {actividadesFiltradas.length === 0 ? (
                    <div className="col-span-full rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                      No se encontraron actividades para este filtro.
                    </div>
                  ) : (
                    actividadesFiltradas.map((a) => {
                      const marcada = form.actividad_ids.includes(Number(a.id))
                      const tipo = String(a?.tipo_vehiculo || '').toUpperCase()
                      const tipoVisible =
                        tipo === 'AUTOMOVIL'
                          ? 'AUTOMÓVIL'
                          : tipo === 'CAMION'
                            ? 'CAMIÓN'
                            : tipo

                      return (
                        <button
                          type="button"
                          key={a.id}
                          onClick={() => seleccionarActividad(a.id)}
                          className={`flex items-start gap-2 rounded-lg border p-2.5 text-left text-xs ${
                            marcada
                              ? 'border-slate-600 bg-slate-100'
                              : 'border-slate-300 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              marcada
                                ? 'border-slate-800 bg-slate-800 text-white'
                                : 'border-slate-400 bg-white'
                            }`}
                          >
                            {marcada && <Check className="h-3 w-3" />}
                          </span>

                          <span className="min-w-0">
                            <span className="block font-extrabold text-slate-800">
                              {nombreActividad(a)}
                            </span>
                            <span className="mt-1 block text-[10px] font-semibold text-slate-600">
                              {tipoVisible || 'SIN TIPO'}
                              {a?.accion ? ` · ${String(a.accion).toUpperCase()}` : ''}
                            </span>
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-slate-300 bg-white p-4">
              <BotonAccion tipo="cancelar"
                type="button"
                onClick={() => setModalProveedor(false)}
                className="px-4 py-2 text-sm"
              >
                Cancelar
              </BotonAccion>
              <BotonAccion tipo="guardar"
                disabled={guardando}
                className="px-4 py-2 text-sm"
              >
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </BotonAccion>
            </div>
          </form>
        </div>
      )}

      {modalTecnicos && proveedorTecnicos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: ESTILO_FRANJA_SUPERIOR_MODAL.fondo }}>
              <div>
                <div className="font-extrabold">Técnicos</div>
                <div className="text-[10px] text-slate-300">
                  {proveedorTecnicos.razon_social}
                </div>
              </div>
              <button type="button" onClick={() => setModalTecnicos(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-4 mt-4 rounded-lg border-l-4 border-slate-600 bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-700">
              Registre los datos del técnico vinculado a este proveedor. Verifique especialmente el número de documento y el teléfono antes de guardar; son datos diferentes y cada uno debe registrarse en su campo correspondiente.
            </div>

            <div className="grid gap-5 p-4 lg:grid-cols-[360px_1fr]">
              <form onSubmit={guardarTecnico} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2 font-extrabold text-slate-800">
                  <UserRound className="h-4 w-4" />
                  {formTecnico.id ? 'Editar técnico' : 'Nuevo técnico'}
                </div>

                <div className="space-y-3">
                  <Campo label="Nombres *">
                    <input
                      required
                      value={formTecnico.nombres}
                      onChange={(e) => setFormTecnico({ ...formTecnico, nombres: aMayusculas(e.target.value) })}
                      className="campo"
                    />
                  </Campo>
                  <Campo label="Documento *">
                    <input
                      required
                      value={formTecnico.documento}
                      inputMode="numeric"
                      maxLength={12}
                      onChange={(e) => setFormTecnico({ ...formTecnico, documento: soloNumeros(e.target.value).slice(0, 12) })}
                      className="campo"
                      placeholder="Número de documento"
                    />
                  </Campo>
                  <Campo label="Teléfono *">
                    <input
                      value={formTecnico.telefono}
                      inputMode="tel"
                      maxLength={10}
                      onChange={(e) => setFormTecnico({ ...formTecnico, telefono: soloNumeros(e.target.value).slice(0, 10) })}
                      className="campo"
                      placeholder="Ej. 3001234567"
                    />
                  </Campo>
                  <Campo label="Correo">
                    <input
                      type="email"
                      value={formTecnico.email}
                      onChange={(e) => setFormTecnico({ ...formTecnico, email: e.target.value })}
                      className="campo"
                    />
                  </Campo>
                  <Campo label="Observaciones">
                    <textarea
                      rows={2}
                      value={formTecnico.observaciones}
                      onChange={(e) => setFormTecnico({ ...formTecnico, observaciones: aMayusculas(e.target.value) })}
                      className="campo"
                    />
                  </Campo>

                  <div className="flex gap-2">
                    {formTecnico.id && (
                      <BotonAccion tipo="agregar"
                        type="button"
                        onClick={() =>
                          setFormTecnico({
                            ...TECNICO_VACIO,
                            proveedor_id: proveedorTecnicos.id,
                          })
                        }
                        className="flex-1 rounded-lg border border-slate-300 py-2 text-xs font-bold"
                      >
                        Nuevo
                      </BotonAccion>
                    )}
                    <BotonAccion tipo="guardar"
                      disabled={guardando}
                      className="flex-1 py-2 text-xs"
                    >
                      Guardar técnico
                    </BotonAccion>
                  </div>
                </div>
              </form>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="px-3 py-2 text-xs font-extrabold text-white" style={{ backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo }}>
                  Técnicos registrados
                </div>
                {(proveedorTecnicos.tecnicos || []).length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No hay técnicos registrados para este proveedor.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {(proveedorTecnicos.tecnicos || []).map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 p-3">
                        <div>
                          <div className="text-sm font-extrabold text-slate-800">
                            {t.nombres}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Documento: {t.documento} · {t.telefono || 'Sin teléfono'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                            t.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {t.activo ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                          <BotonAccion tipo="editar"
                            onClick={() => editarTecnico(t)}
                            className="rounded border border-slate-300 p-2"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </BotonAccion>
                          <BotonAccion tipo={t.activo ? "eliminar" : "agregar"}
                            onClick={() => cambiarEstadoTecnico(t)}
                            className="rounded border border-slate-300 px-2 py-1 text-[9px] font-bold"
                          >
                            {t.activo ? 'Inactivar' : 'Activar'}
                          </BotonAccion>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .campo {
          width: 100%;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          background: white;
        }
        .campo:focus {
          border-color: rgb(100 116 139);
          box-shadow: 0 0 0 1px rgb(100 116 139);
        }
      `}</style>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold text-slate-600">{label}</span>
      {children}
    </label>
  )
}
