'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Building2, LogOut, Plus, Eraser, Pencil, Power, Save, X } from 'lucide-react'
import { ESTILO_ENCABEZADO } from '@/components/admin/EncabezadoModulo'
import { ESTILO_SECCIONES, ESTILO_ENCABEZADO_TABLA, ESTILO_CELDAS_TABLA, BotonAccion, FranjaSuperiorModal } from '@/components/admin/EstiloModulo'
import ModalResultado from '@/components/admin/ModalResultado'
import CampoCatalogo from '@/components/admin/CampoCatalogo'
import CampoMunicipioBusqueda from '@/components/admin/CampoMunicipioBusqueda'

const CAMPOS = [
  { titulo: 'Identificación', items: [['nit','NIT *'],['codigo','Código interno del CEA *'],['nombre','Nombre comercial *'],['razon_social','Razón social'],['nivel_cea','Nivel CEA *','nivel'],['estado','Estado','estado']] },
  { titulo: 'Información de contacto', items: [['direccion','Dirección'],['departamento','Departamento'],['ciudad','Ciudad'],['telefono','Teléfono'],['email_principal','Correo principal'],['representante_legal','Representante legal'],['documento_representante','Documento representante']] },
  { titulo: 'Conexión Supabase', items: [['supabase_url','URL del proyecto *'],['supabase_anon_key','Clave pública (anon) *']] },
  { titulo: 'Notificaciones y otros datos', items: [['correos_notificacion','Correos notificaciones'],['correos_mantenimiento','Correos mantenimiento'],['correos_preoperacional','Correos preoperacional'],['correos_siniestros','Correos siniestros'],['correos_vencimientos','Correos vencimientos'],['observaciones','Observaciones']] },
]
const inicial = { nit:'', codigo:'', nombre:'', razon_social:'', nivel_cea:'NIVEL II', estado:'activo', supabase_url:'', supabase_anon_key:'' }
const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-400 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#24638C] focus:ring-2 focus:ring-blue-200'
const boton = 'rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50'

const CAMPOS_NUMERICOS = new Set(['nit','telefono','documento_representante'])
const CAMPOS_CORREOS = new Set(['email_principal','correos_notificacion','correos_mantenimiento','correos_preoperacional','correos_siniestros','correos_vencimientos'])
const CAMPOS_SIN_MAYUSCULAS = new Set(['supabase_url','supabase_anon_key','estado',...CAMPOS_CORREOS])
const CORREO_VALIDO = /^[^\\s@,;]+@[^\\s@,;]+\\.[^\\s@,;]+$/
function normalizarCampo(campo, valor) {
  if (CAMPOS_NUMERICOS.has(campo)) return valor.replace(/[^0-9]/g,'')
  if (CAMPOS_CORREOS.has(campo)) return valor.toLowerCase()
  return CAMPOS_SIN_MAYUSCULAS.has(campo) ? valor : valor.toLocaleUpperCase('es-CO')
}
function validarFormulario(form) {
  for (const campo of CAMPOS_CORREOS) {
    const valor = String(form[campo] || '').trim()
    if (!valor) continue
    const correos = valor.split(/[;,]/).map(v=>v.trim())
    if (correos.some(v=>!CORREO_VALIDO.test(v))) return 'Verifica el formato de los correos en ' + campo.replaceAll('_',' ') + '. Separa varios correos con coma o punto y coma.'
  }
  for (const campo of CAMPOS_NUMERICOS) {
    const valor = String(form[campo] || '').trim()
    if (valor && !/^[0-9]+$/.test(valor)) return 'El campo ' + campo.replaceAll('_',' ') + ' debe contener únicamente números enteros.'
  }
  return ''
}

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
  const [departamentos,setDepartamentos] = useState([])
  const [resultado,setResultado] = useState(null)

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
  function nuevo() {cerrar();setMensaje('');setError('');setModo('nuevo')}
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
    e.preventDefault();const validacion=validarFormulario(form);if(validacion){setError(validacion);setResultado({tipo:'error',mensaje:validacion});return}setGuardando(true);setError('');setMensaje('')
    try {
      const url = modo === 'nuevo' ? '/api/master/empresas' : '/api/master/empresas/'+seleccion.id
      const res = await fetch(url,{method:modo==='nuevo'?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      const data = await res.json()
      if (!res.ok) throw Error(data.message || 'No fue posible guardar.')
      if (modo==='nuevo') {
        setSeleccion({id:data.id,nombre:form.nombre,clave_configurada:false})
        setModo('editar')
        setMensaje('CEA registrado. Ya puedes configurar su credencial Vault en este mismo formulario.')
        setResultado({tipo:'exito',mensaje:'CEA registrado correctamente. Ahora puedes configurar la Service Role Key.'})
      } else {
        cerrar()
        setResultado({tipo:'exito',mensaje:'Los datos del CEA se actualizaron correctamente.'})
      }
      await cargar()
    } catch(e) {setError(e.message);setResultado({tipo:'error',mensaje:e.message})} finally {setGuardando(false)}
  }
  async function guardarVault(e) {
    e.preventDefault();if(!seleccion || !clave.trim())return
    setGuardando(true);setError('');setMensaje('')
    try {
      const res = await fetch('/api/master/empresas/'+seleccion.id+'/clave',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clave})})
      const data = await res.json()
      if (!res.ok) throw Error(data.message || 'No fue posible guardar la credencial.')
      setClave('');setSeleccion({...seleccion,clave_configurada:true});setMensaje('La credencial se guardó en Vault.');setResultado({tipo:'exito',mensaje:'La Service Role Key se guardó correctamente en Vault.'});await cargar()
    } catch(e) {setError(e.message);setResultado({tipo:'error',mensaje:e.message})} finally {setGuardando(false)}
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
      setResultado({tipo:'exito',mensaje:'Estado actualizado correctamente.'})
      await cargar()
    } catch(e) {setError(e.message);setResultado({tipo:'error',mensaje:e.message})} finally {setGuardando(false)}
  }

  const filtradas = empresas.filter(e => [e.nombre,e.nit].some(v => String(v||'').toLowerCase().includes(busqueda.trim().toLowerCase())))
  const activas = empresas.filter(e => e.estado === 'activo').length

  return <main className="min-h-screen bg-[#f3f6fb] px-4 py-4 text-slate-900 md:px-8">
    <header className="rounded-t-xl text-white shadow-md" style={{background:`linear-gradient(${ESTILO_ENCABEZADO.direccionDegradado},${ESTILO_ENCABEZADO.colorPrincipal},${ESTILO_ENCABEZADO.colorSecundario})`,borderBottom:`2px solid ${ESTILO_ENCABEZADO.colorAcento}`}}>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 md:px-5">
        <Image src="/logo.png" alt="DATA CEA" width={125} height={58} priority className="h-11 w-auto object-contain" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.16em] text-blue-100">PANEL MASTER</p>
          <h1 className="text-base font-black md:text-lg">Administración central</h1>
          <p className="text-[10px] text-blue-100 md:text-xs">Control de empresas afiliadas y credenciales seguras desde un solo lugar.</p>
        </div>
        <form action="/api/master/logout" method="post"><button type="submit" className="rounded-lg border border-white/40 px-3 py-2 text-xs font-semibold hover:bg-white/10 md:text-sm"><LogOut size={14} className="inline mr-1"/>Cerrar sesión</button></form>
      </div>
    </header>

    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 md:px-8">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-white" style={{backgroundColor:ESTILO_SECCIONES.fondo}}>
          <div><h2 className="flex items-center gap-2 text-sm font-bold"><Building2 size={16}/>Directorio de CEA</h2><p className="text-[10px] text-blue-100">{empresas.length} registrados · {activas} activos</p></div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <input aria-label="Buscar CEA por nombre o NIT" value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar por nombre o NIT..." className={inputClass+' mt-0 w-full sm:w-64'} />
            <button type="button" onClick={()=>setBusqueda('')} className={boton+' border border-slate-300 bg-white hover:bg-slate-100'} ><Eraser size={13} className="inline mr-1"/>Limpiar</button>
            <button type="button" onClick={nuevo} className={boton+' bg-[#204c93] text-white hover:bg-[#173a74]'}><Plus size={13} className="inline mr-1"/>Nuevo CEA</button>
          </div>
        </div>
        {mensaje && <p role="status" className="m-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</p>}
        {error && <p role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-center text-xs">
            <thead style={{backgroundColor:ESTILO_ENCABEZADO_TABLA.fondo,color:ESTILO_ENCABEZADO_TABLA.texto}}><tr>
              {['Centro de Enseñanza Automovilística','NIT','Código','Nivel','Estado','Conexión','Acciones'].map(x=><th key={x} scope="col" className="border px-3 py-2 text-center font-bold" style={{borderColor:ESTILO_CELDAS_TABLA.borde}}>{x}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-200">
              {cargando ? <tr><td colSpan={7} className="p-6 text-center text-slate-500">Cargando empresas…</td></tr>
              : !filtradas.length ? <tr><td colSpan={7} className="p-6 text-center text-slate-500">{busqueda?'No se encontraron coincidencias.':'No hay empresas registradas.'}</td></tr>
              : filtradas.map(e=><tr key={e.id} className="hover:bg-blue-50/50">
                <td className="border border-slate-300 px-3 py-2 font-semibold">{e.nombre}</td>
                <td className="border border-slate-300 px-3 py-2">{e.nit}</td>
                <td className="border border-slate-300 px-3 py-2">{e.codigo}</td>
                <td className="border border-slate-300 px-3 py-2">{e.nivel_cea}</td>
                <td className="border border-slate-300 px-3 py-2"><span className={'rounded-full px-2.5 py-1 text-xs font-semibold '+(e.estado==='activo'?'bg-emerald-100 text-emerald-800':'bg-slate-200 text-slate-700')}>{e.estado==='activo'?'Activo':'Inactivo'}</span></td>
                <td className="border border-slate-300 px-3 py-2"><span className={'text-xs font-medium '+(e.clave_configurada?'text-emerald-700':'text-amber-700')}>{e.clave_configurada?'Vault configurado':'Vault pendiente'}</span></td>
                <td className="border border-slate-300 px-3 py-2"><div className="flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={()=>editar(e)} className="rounded-lg border border-blue-200 px-3 py-1.5 font-semibold text-[#204c93] hover:bg-blue-50"><Pencil size={13} className="inline mr-1"/>Editar</button>
                  <button type="button" onClick={()=>setConfirmacion(e)} className={'rounded-lg border px-3 py-1.5 font-semibold '+(e.estado==='activo'?'border-amber-200 text-amber-800 hover:bg-amber-50':'border-emerald-200 text-emerald-800 hover:bg-emerald-50')}><Power size={13} className="inline mr-1"/>{e.estado==='activo'?'Desactivar':'Activar'}</button>
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    {modo && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 md:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-form-empresa" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-400 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 rounded-t-xl px-5 py-3 text-white" style={{backgroundColor:"#194567"}}>
          <div><h2 id="titulo-form-empresa" className="text-lg font-bold">{modo==='nuevo'?'Registrar nuevo CEA':modo==='cargando'?'Cargando datos…':'Editar CEA'}</h2><p className="text-xs text-blue-100">{seleccion?.nombre || 'Información institucional y configuración'}</p></div>
          <button type="button" onClick={cerrar} disabled={guardando} className="rounded-lg border border-white/30 px-3 py-1.5 text-sm">Cerrar ×</button>
        </div>
        <div className="overflow-y-auto p-5">
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {mensaje && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{mensaje}</p>}
          {(modo==='nuevo'||modo==='editar') && <form id="form-empresa" onSubmit={guardarEmpresa} className="space-y-6">
            {CAMPOS.map(grupo=><section key={grupo.titulo} className="overflow-hidden rounded-xl border border-slate-400 bg-slate-50/50 shadow-sm"><div className="px-3 py-2 text-xs font-bold text-white" style={{backgroundColor:ESTILO_SECCIONES.fondo}}>{grupo.titulo}</div><div className="grid gap-4 p-4 md:grid-cols-2">{grupo.items.map(([campo,etiqueta,tipo])=> campo==='departamento' ? <CampoCatalogo key={campo} catalogo="departamentos" endpoint="/api/master/catalogos" label="Departamento" name="departamento-master" required={false} value={form.departamento??''} onOpcionesCargadas={setDepartamentos} onChange={e=>setForm(prev=>({...prev,departamento:e.target.value,ciudad:''}))} /> : campo==='ciudad' ? <CampoMunicipioBusqueda key={campo} endpoint="/api/master/catalogos" departamentoId={departamentos.find(d=>d.nombre===form.departamento)?.id} value={form.ciudad??''} className={inputClass} onChange={value=>setForm(prev=>({...prev,ciudad:value.toLocaleUpperCase('es-CO')}))} /> : <label key={campo} className="block text-sm font-medium text-slate-700">{etiqueta}
              {tipo ? <select className={inputClass} value={form[campo]??''} onChange={e=>setForm({...form,[campo]:e.target.value})}>{(tipo==='nivel'?['NIVEL I','NIVEL II','NIVEL III']:['activo','inactivo']).map(x=><option key={x} value={x}>{x}</option>)}</select> :
              <input className={inputClass} type={campo==='email_principal'?'email':'text'} required={['nit','codigo','nombre','supabase_url','supabase_anon_key'].includes(campo)} value={form[campo]??''} onChange={e=>setForm(prev=>({...prev,[campo]:normalizarCampo(campo,e.target.value)}))} inputMode={CAMPOS_NUMERICOS.has(campo)?'numeric':undefined} pattern={CAMPOS_NUMERICOS.has(campo)?'[0-9]*':undefined} autoComplete="off" />}
            </label>)}</div></section>)}
            <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">NIT y código interno pueden corregirse, pero deben ser únicos. El código interno es una abreviatura para identificar al CEA en DATA CEA (por ejemplo, JY). Verifica cuidadosamente los cambios de identificación y conexión. El logotipo de cada CEA se administra en el bucket privado; no se utiliza logo_url. La credencial privada se guarda exclusivamente en Vault.</p>
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button type="button" onClick={cerrar} className={boton+' border border-slate-300'}>Cancelar</button>
              <button type="submit" disabled={guardando} className={boton+' bg-[#204c93] text-white'}>{guardando?'Guardando…':modo==='nuevo'?'Registrar CEA':'Guardar cambios'}</button>
            </div>
          </form>}
          {modo==='editar' && seleccion && <section className="mt-6 overflow-hidden rounded-xl border border-slate-400 bg-slate-50/50 shadow-sm">
            <h3 className="bg-[#737B87] px-3 py-2 text-xs font-bold text-white">Credencial administrativa Vault · {seleccion.clave_configurada ? "Reemplazar clave" : "Configurar clave"}</h3>
            <div className="p-4"><p className="mt-1 text-xs text-slate-500">Estado: {seleccion.clave_configurada?'Configurada':'Pendiente'}. Puedes ingresar una nueva Service Role Key y guardarla para reemplazar la anterior. La clave actual nunca se muestra.</p>
            <form onSubmit={guardarVault} className="mt-3 flex flex-wrap items-end gap-3">
              <label className="min-w-0 flex-1 text-sm font-medium">Service Role Key
                <input type={mostrarClave?'text':'password'} value={clave} onChange={e=>setClave(e.target.value)} required autoComplete="off" className={inputClass} />
              </label>
              <button type="button" onClick={()=>setMostrarClave(!mostrarClave)} className={boton+' border border-slate-300'}>{mostrarClave?'Ocultar':'Mostrar'}</button>
              <button type="submit" disabled={guardando} className={boton+' bg-[#204c93] text-white'}>{guardando?'Guardando…':'Guardar en Vault'}</button>
            </form>
          </div></section>}
        </div>
      </section>
    </div>}
    <ModalResultado abierto={Boolean(resultado)} tipo={resultado?.tipo || "exito"} titulo={resultado?.tipo === "error" ? "No fue posible guardar" : "Operación realizada correctamente"} mensaje={resultado?.mensaje || ""} onCerrar={()=>setResultado(null)} />
    <ModalResultado abierto={Boolean(confirmacion)} tipo="confirmacion" titulo="Confirmar cambio de estado" mensaje={confirmacion ? '¿Deseas ' + (confirmacion.estado === 'activo' ? 'desactivar' : 'activar') + ' el CEA ' + confirmacion.nombre + '?' : ''} textoBoton="CONFIRMAR" onCerrar={() => { if (!guardando) setConfirmacion(null) }} onConfirmar={() => { if (!guardando) cambiarEstado() }} />
  </main>
}
