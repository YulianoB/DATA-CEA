'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

const CAMPOS = [
  { titulo: 'Identificación', items: [['nit','NIT *'],['codigo','Código *'],['nombre','Nombre comercial *'],['razon_social','Razón social'],['nivel_cea','Nivel CEA *','nivel'],['estado','Estado','estado']] },
  { titulo: 'Información de contacto', items: [['direccion','Dirección'],['ciudad','Ciudad'],['departamento','Departamento'],['telefono','Teléfono'],['email_principal','Correo principal'],['representante_legal','Representante legal'],['documento_representante','Documento representante']] },
  { titulo: 'Conexión Supabase', items: [['supabase_url','URL del proyecto *'],['supabase_anon_key','Clave pública (anon) *']] },
  { titulo: 'Notificaciones y otros datos', items: [['correos_notificacion','Correos notificaciones'],['correos_mantenimiento','Correos mantenimiento'],['correos_preoperacional','Correos preoperacional'],['correos_siniestros','Correos siniestros'],['correos_vencimientos','Correos vencimientos'],['logo_url','URL del logo'],['observaciones','Observaciones']] },
]
const inicial = { nit:'', codigo:'', nombre:'', razon_social:'', nivel_cea:'NIVEL II', estado:'activo', supabase_url:'', supabase_anon_key:'' }
const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
const boton = 'rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50'
export default function EmpresasMaster() {
  const [empresas,setEmpresas] = useState([])
  const [cargando,setCargando] = useState(true)
  const [error,setError] = useState('')
  const [mensaje,setMensaje] = useState('')
  const [busqueda,setBusqueda] = useState('')
  const [modo,setModo] = useState('')
  const [seleccion,setSeleccion] = useState(null)
  const [form,setForm] = useState(inicial)
  const [clave,setClave] = useState('')
  const [guardando,setGuardando] = useState(false)
  const [mostrarClave,setMostrarClave] = useState(false)
  const [confirmacion,setConfirmacion] = useState(null)

  async function cargar() {
    setCargando(true)
    try {
      const res = await fetch('/api/master/empresas',{cache:'no-store'})
      const data = await res.json()
      if (!res.ok) throw Error(data.message || 'No fue posible cargar las empresas.')
      setEmpresas(data.empresas || []);setError('')
    } catch(e) {setError(e.message)} finally {setCargando(false)}
  }
  useEffect(()=>{cargar()},[])
  function cerrar() {setModo('');setSeleccion(null);setClave('');setForm(inicial);setMostrarClave(false)}
  function nuevo() {cerrar();setMensaje('');setModo('nuevo')}
  async function editar(empresa) {
    cerrar();setMensaje('');setError('');setSeleccion(empresa);setModo('cargando')
    try {
      const res = await fetch('/api/master/empresas/'+empresa.id,{cache:'no-store'})
      const data = await res.json()
      if (!res.ok) throw Error(data.message || 'No fue posible consultar la empresa.')
      setForm(data.empresa);setModo('editar')
    } catch(e) {setModo('');setError(e.message)}
  }
  function vault(empresa) {editar(empresa)}
  async function guardarEmpresa(e) {
    e.preventDefault();setGuardando(true);setError('');setMensaje('')
    try {
      const url = modo === 'nuevo' ? '/api/master/empresas' : '/api/master/empresas/'+seleccion.id
      const res = await fetch(url,{method:modo==='nuevo'?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      const data = await res.json()
      if (!res.ok) throw Error(data.message || 'No fue posible guardar.')
      if (modo==='nuevo') {
        setSeleccion({id:data.id,nombre:form.nombre,clave_configurada:false})
        setModo('editar')
        setMensaje('CEA registrado. Ya puedes configurar su credencial Vault en este mismo formulario.')
      } else {
        cerrar()
        setMensaje('Datos de la empresa actualizados.')
      }
      await cargar()
    } catch(e) {setError(e.message)} finally {setGuardando(false)}
  }
  async function guardarVault(e) {
    e.preventDefault();if(!seleccion || !clave.trim())return
    setGuardando(true);setError('');setMensaje('')
    try {
      const res = await fetch('/api/master/empresas/'+seleccion.id+'/clave',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clave})})
      const data = await res.json()
      if (!res.ok) throw Error(data.message || 'No fue posible guardar la credencial.')
      setClave('');setSeleccion({...seleccion,clave_configurada:true});setMensaje('La credencial se guardó en Vault.');await cargar()
    } catch(e) {setError(e.message)} finally {setGuardando(false)}
  }
  async function cambiarEstado() {
    if (!confirmacion) return
    const empresa = confirmacion
    const siguiente = empresa.estado === 'activo' ? 'inactivo' : 'activo'
    setGuardando(true);setError('');setMensaje('')
    try {
      const res = await fetch('/api/master/empresas/' + empresa.id, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({estado:siguiente}),
      })
      const data = await res.json()
      if (!res.ok) throw Error(data.message || 'No fue posible cambiar el estado.')
      setConfirmacion(null)
      setMensaje('El CEA ' + empresa.nombre + ' ahora está ' + siguiente + '.')
      await cargar()
    } catch(e) {setError(e.message)} finally {setGuardando(false)}
  }

  const filtradas = empresas.filter(e => [e.nombre,e.nit].some(v => String(v||'').toLowerCase().includes(busqueda.trim().toLowerCase())))
  const activas = empresas.filter(e => e.estado === 'activo').length

  return <main className="min-h-screen bg-[#f3f6fb] text-slate-900">
    <header className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:px-8">
        <Image src="/logo.png" alt="DATA CEA" width={76} height={76} priority className="h-16 w-auto object-contain" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.16em] text-blue-100">PANEL MASTER</p>
          <h1 className="text-xl font-bold md:text-2xl">Administración central</h1>
          <p className="text-xs text-blue-100 md:text-sm">Control de empresas afiliadas y credenciales seguras desde un solo lugar.</p>
        </div>
        <form action="/api/master/logout" method="post"><button type="submit" className="rounded-lg border border-white/40 px-3 py-2 text-xs font-semibold hover:bg-white/10 md:text-sm">Cerrar sesión</button></form>
      </div>
    </header>

    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 md:px-8">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4">
          <div><h2 className="font-bold text-[#204c93]">Directorio de CEA</h2><p className="text-xs text-slate-500">{empresas.length} registrados · {activas} activos</p></div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <input aria-label="Buscar CEA por nombre o NIT" value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar por nombre o NIT..." className={inputClass+' mt-0 w-full sm:w-64'} />
            <button type="button" onClick={()=>setBusqueda('')} className={boton+' border border-slate-300 bg-white hover:bg-slate-100'}>Limpiar</button>
            <button type="button" onClick={nuevo} className={boton+' bg-[#204c93] text-white hover:bg-[#173a74]'}>+ Nuevo CEA</button>
          </div>
        </div>
        {mensaje && <p role="status" className="m-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</p>}
        {error && <p role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead className="bg-[#204c93] text-white"><tr>
              {['Centro de Enseñanza Automovilística','NIT','Código','Nivel','Estado','Conexión','Acciones'].map(x=><th key={x} scope="col" className="border-r border-white/20 px-4 py-3 font-semibold last:border-r-0">{x}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-200">
              {cargando ? <tr><td colSpan={7} className="p-6 text-center text-slate-500">Cargando empresas…</td></tr>
              : !filtradas.length ? <tr><td colSpan={7} className="p-6 text-center text-slate-500">{busqueda?'No se encontraron coincidencias.':'No hay empresas registradas.'}</td></tr>
              : filtradas.map(e=><tr key={e.id} className="hover:bg-blue-50/50">
                <td className="border-r border-slate-100 px-4 py-3 font-semibold">{e.nombre}</td>
                <td className="border-r border-slate-100 px-4 py-3">{e.nit}</td>
                <td className="border-r border-slate-100 px-4 py-3">{e.codigo}</td>
                <td className="border-r border-slate-100 px-4 py-3">{e.nivel_cea}</td>
                <td className="border-r border-slate-100 px-4 py-3"><span className={'rounded-full px-2.5 py-1 text-xs font-semibold '+(e.estado==='activo'?'bg-emerald-100 text-emerald-800':'bg-slate-200 text-slate-700')}>{e.estado==='activo'?'Activo':'Inactivo'}</span></td>
                <td className="border-r border-slate-100 px-4 py-3"><span className={'text-xs font-medium '+(e.clave_configurada?'text-emerald-700':'text-amber-700')}>{e.clave_configurada?'Vault configurado':'Vault pendiente'}</span></td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                  <button type="button" onClick={()=>editar(e)} className="rounded-lg border border-blue-200 px-3 py-1.5 font-semibold text-[#204c93] hover:bg-blue-50">Editar</button>
                  <button type="button" onClick={()=>setConfirmacion(e)} className={'rounded-lg border px-3 py-1.5 font-semibold '+(e.estado==='activo'?'border-amber-200 text-amber-800 hover:bg-amber-50':'border-emerald-200 text-emerald-800 hover:bg-emerald-50')}>{e.estado==='activo'?'Desactivar':'Activar'}</button>
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    {modo && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 md:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-form-empresa" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 bg-[#204c93] px-5 py-3 text-white">
          <div><h2 id="titulo-form-empresa" className="text-lg font-bold">{modo==='nuevo'?'Registrar nuevo CEA':modo==='cargando'?'Cargando datos…':'Editar CEA'}</h2><p className="text-xs text-blue-100">{seleccion?.nombre || 'Información institucional y configuración'}</p></div>
          <button type="button" onClick={cerrar} disabled={guardando} className="rounded-lg border border-white/30 px-3 py-1.5 text-sm">Cerrar ×</button>
        </div>
        <div className="overflow-y-auto p-5">
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {mensaje && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{mensaje}</p>}
          {(modo==='nuevo'||modo==='editar') && <form id="form-empresa" onSubmit={guardarEmpresa} className="space-y-6">
            {CAMPOS.map(grupo=><fieldset key={grupo.titulo}><legend className="mb-3 w-full border-b border-blue-100 pb-2 font-bold text-[#204c93]">{grupo.titulo}</legend><div className="grid gap-4 md:grid-cols-2">{grupo.items.map(([campo,etiqueta,tipo])=><label key={campo} className="block text-sm font-medium text-slate-700">{etiqueta}
              {tipo ? <select className={inputClass} value={form[campo]??''} onChange={e=>setForm({...form,[campo]:e.target.value})}>{(tipo==='nivel'?['NIVEL I','NIVEL II','NIVEL III']:['activo','inactivo']).map(x=><option key={x} value={x}>{x}</option>)}</select> :
              <input className={inputClass} type={campo==='email_principal'?'email':'text'} required={['nit','codigo','nombre','supabase_url','supabase_anon_key'].includes(campo)} disabled={modo==='editar'&&['nit','codigo'].includes(campo)} value={form[campo]??''} onChange={e=>setForm({...form,[campo]:e.target.value})} autoComplete="off" />}
            </label>)}</div></fieldset>)}
            <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">NIT y código son únicos y no se modifican al editar. La credencial privada se guarda exclusivamente en Vault.</p>
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button type="button" onClick={cerrar} className={boton+' border border-slate-300'}>Cancelar</button>
              <button type="submit" disabled={guardando} className={boton+' bg-[#204c93] text-white'}>{guardando?'Guardando…':modo==='nuevo'?'Registrar CEA':'Guardar cambios'}</button>
            </div>
          </form>}
          {modo==='editar' && seleccion && <section className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="font-bold text-[#204c93]">Credencial administrativa Vault</h3>
            <p className="mt-1 text-xs text-slate-500">Estado: {seleccion.clave_configurada?'Configurada':'Pendiente'}. La clave guardada no puede visualizarse; al introducir una nueva se reemplaza.</p>
            <form onSubmit={guardarVault} className="mt-3 flex flex-wrap items-end gap-3">
              <label className="min-w-0 flex-1 text-sm font-medium">Service Role Key
                <input type={mostrarClave?'text':'password'} value={clave} onChange={e=>setClave(e.target.value)} required autoComplete="off" className={inputClass} />
              </label>
              <button type="button" onClick={()=>setMostrarClave(!mostrarClave)} className={boton+' border border-slate-300'}>{mostrarClave?'Ocultar':'Mostrar'}</button>
              <button type="submit" disabled={guardando} className={boton+' bg-[#204c93] text-white'}>{guardando?'Guardando…':'Guardar en Vault'}</button>
            </form>
          </section>}
        </div>
      </section>
    </div>}
    {confirmacion && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <section role="alertdialog" aria-modal="true" aria-labelledby="titulo-confirmar" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="titulo-confirmar" className="text-lg font-bold text-[#204c93]">Confirmar cambio de estado</h2>
        <p className="mt-3 text-sm">¿Deseas {confirmacion.estado==='activo'?'desactivar':'activar'} el CEA <strong>{confirmacion.nombre}</strong>?</p>
        <div className="mt-5 flex justify-end gap-3"><button disabled={guardando} onClick={()=>setConfirmacion(null)} className={boton+' border border-slate-300'}>Cancelar</button><button disabled={guardando} onClick={cambiarEstado} className={boton+' bg-[#204c93] text-white'}>{guardando?'Guardando…':'Confirmar'}</button></div>
      </section>
    </div>}
  </main>
}
