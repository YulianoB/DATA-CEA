'use client'

import { useEffect, useState } from 'react'

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
  function vault(empresa) {cerrar();setMensaje('');setSeleccion(empresa);setModo('vault')}
  async function guardarEmpresa(e) {
    e.preventDefault();setGuardando(true);setError('');setMensaje('')
    try {
      const url = modo === 'nuevo' ? '/api/master/empresas' : '/api/master/empresas/'+seleccion.id
      const res = await fetch(url,{method:modo==='nuevo'?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      const data = await res.json()
      if (!res.ok) throw Error(data.message || 'No fue posible guardar.')
      cerrar();setMensaje(modo==='nuevo'?'Empresa registrada correctamente. Configura su credencial Vault antes de utilizarla.':'Datos de la empresa actualizados.')
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
      cerrar();setMensaje('La credencial se guardó en Vault.');await cargar()
    } catch(e) {setError(e.message)} finally {setGuardando(false)}
  }
  const filtradas = empresas.filter(e => [e.nombre,e.nit,e.codigo,e.ciudad].some(v=>String(v||'').toLowerCase().includes(busqueda.toLowerCase())))
  const activas = empresas.filter(e=>e.estado==='activo').length
  const conVault = empresas.filter(e=>e.clave_configurada).length
  return <main className="min-h-screen bg-[#f3f6fb] px-4 py-7 text-slate-900 md:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><a href="/master" className="text-sm font-semibold text-[#204c93] hover:underline">← Volver al panel central</a>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#204c93]">DATA CEA / ADMINISTRACIÓN CENTRAL</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Gestión de empresas</h1>
          <p className="mt-2 text-sm text-slate-500">Administra los CEA afiliados, sus datos y sus conexiones de forma segura.</p>
        </div>
        <button onClick={nuevo} className={boton+' bg-[#204c93] text-white shadow-sm hover:bg-[#173a74]'}>+ Registrar CEA</button>
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        {[['Empresas registradas',empresas.length,'Total en la plataforma'],['CEA activos',activas,'Con acceso habilitado'],['Credenciales Vault',conVault,'Con clave administrativa']].map(([titulo,numero,detalle])=>
          <div key={titulo} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{titulo}</p><p className="mt-2 text-3xl font-bold text-[#204c93]">{numero}</p><p className="mt-1 text-xs text-slate-400">{detalle}</p></div>)}
      </section>
      {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{mensaje}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {modo && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-6 flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{modo==='nuevo'?'Registrar nuevo CEA':modo==='vault'?'Credencial administrativa Vault':modo==='cargando'?'Cargando datos…':'Editar empresa'}</h2><p className="mt-1 text-sm text-slate-500">{seleccion?.nombre || 'Completa los datos de la empresa.'}</p></div><button type="button" onClick={cerrar} className={boton+' border border-slate-200 text-slate-600'}>Cerrar</button></div>
        {(modo==='nuevo'||modo==='editar') && <form onSubmit={guardarEmpresa} className="space-y-7">
          {CAMPOS.map(grupo=><div key={grupo.titulo}><h3 className="mb-3 border-b border-slate-100 pb-2 font-semibold text-[#204c93]">{grupo.titulo}</h3><div className="grid gap-4 md:grid-cols-2">{grupo.items.map(([campo,etiqueta,tipo])=><label key={campo} className="block text-sm font-medium text-slate-700">{etiqueta}
            {tipo ? <select className={inputClass} value={form[campo]??''} onChange={e=>setForm({...form,[campo]:e.target.value})}>{(tipo==='nivel'?['NIVEL I','NIVEL II','NIVEL III']:['activo','inactivo']).map(x=><option key={x} value={x}>{x}</option>)}</select> :
            <input className={inputClass} type={campo==='email_principal'?'email':'text'} required={['nit','codigo','nombre','supabase_url','supabase_anon_key'].includes(campo)} disabled={modo==='editar'&&['nit','codigo'].includes(campo)} value={form[campo]??''} onChange={e=>setForm({...form,[campo]:e.target.value})} autoComplete="off" />}
          </label>)}</div></div>)}
          <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900">La clave privada service_role se configura por separado en Vault. El NIT y el código no se modifican desde este formulario.</p>
          <div className="flex flex-wrap gap-3"><button disabled={guardando} className={boton+' bg-[#204c93] text-white'}>{guardando?'Guardando…':modo==='nuevo'?'Registrar empresa':'Guardar cambios'}</button><button type="button" onClick={cerrar} className={boton+' border border-slate-200'}>Cancelar</button></div>
        </form>}
        {modo==='vault' && <form onSubmit={guardarVault} className="max-w-2xl space-y-4"><p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">La credencial nunca se muestra después de guardarla. Reemplazarla invalida la anterior. Verifica que corresponda al Supabase de esta empresa.</p><label className="block text-sm font-medium">Service Role Key<div className="mt-2 flex gap-2"><input className={inputClass+' mt-0'} type={mostrarClave?'text':'password'} value={clave} onChange={e=>setClave(e.target.value)} autoComplete="off" required/><button type="button" onClick={()=>setMostrarClave(!mostrarClave)} className={boton+' border border-slate-200'}>{mostrarClave?'Ocultar':'Mostrar'}</button></div></label><button disabled={guardando} className={boton+' bg-[#204c93] text-white'}>{guardando?'Guardando…':'Guardar en Vault'}</button></form>}
      </section>}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-bold">Directorio de CEA</h2><p className="text-xs text-slate-500">Empresas registradas en Supabase Master</p></div><div className="flex gap-2"><input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar por nombre, NIT o código" aria-label="Buscar empresas" className={inputClass+' mt-0 min-w-56'}/><button onClick={cargar} className={boton+' border border-slate-200'}>Actualizar</button></div></div>
        {cargando ? <p className="p-6 text-sm text-slate-500">Cargando empresas…</p> : error && !empresas.length ? <p className="p-6 text-sm text-slate-500">No se pudo cargar el directorio.</p> : !filtradas.length ? <p className="p-6 text-sm text-slate-500">{busqueda?'No hay resultados para la búsqueda.':'No hay empresas registradas.'}</p> :
          <div className="divide-y divide-slate-100">{filtradas.map(e=><article key={e.id} className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-slate-50/70"><div className="min-w-0"><h3 className="font-bold">{e.nombre}</h3><p className="mt-1 text-sm text-slate-500">NIT {e.nit} · {e.codigo} · {e.nivel_cea}</p><div className="mt-3 flex flex-wrap gap-2"><span className={'rounded-full px-3 py-1 text-xs font-semibold '+(e.estado==='activo'?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600')}>{e.estado==='activo'?'Activo':'Inactivo'}</span><span className={'rounded-full px-3 py-1 text-xs font-semibold '+(e.clave_configurada?'bg-blue-50 text-blue-800':'bg-amber-50 text-amber-800')}>{e.clave_configurada?'Vault configurado':'Vault pendiente'}</span></div></div><div className="flex flex-wrap gap-2"><button onClick={()=>editar(e)} className={boton+' border border-slate-200 bg-white hover:bg-slate-100'}>Editar datos</button><button onClick={()=>vault(e)} className={boton+' bg-[#204c93] text-white'}>{e.clave_configurada?'Gestionar Vault':'Configurar Vault'}</button></div></article>)}</div>}
      </section>
    </div>
  </main>
}
