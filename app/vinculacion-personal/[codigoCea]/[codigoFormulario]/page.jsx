'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import CampoCatalogo from '@/components/admin/CampoCatalogo'
import CampoMunicipioBusqueda from '@/components/admin/CampoMunicipioBusqueda'

const inicial = { tipo_documento:'CC', documento:'', nombres:'', apellidos:'', telefono:'', email:'', contacto_emergencia_nombre:'', contacto_emergencia_parentesco:'', contacto_emergencia_telefono:'', perfil_profesional:'', tipo_personal:'contratista', trabaja_cea:false, rol_conductor_instructor:false }
const pasos = ['Identificación', 'Información general', 'Vinculación y perfil', 'Estudios', 'Experiencia', 'Referencia y envío']
const campo = (nombre, titulo, tipo='text', obligatorio=false) => ({ nombre, titulo, tipo, obligatorio })
const OPCIONES = {
  genero: [['femenino','Femenino'],['masculino','Masculino'],['otro','Otro'],['no_informa','No informa']],
  escolaridad: [['BACHILLER','Bachiller'],['TECNICO','Técnico'],['TECNOLOGO','Tecnólogo'],['PREGRADO','Pregrado'],['POSGRADO','Posgrado']],
  nivel_estudio: [['BACHILLER','Bachiller'],['TÉCNICO','Técnico'],['TECNÓLOGO','Tecnólogo'],['PREGRADO','Pregrado'],['POSGRADO','Posgrado']],
  tipo_personal: [['contratista','Contratista'],['colaborador','Colaborador']],
  grupo_personal: [['directivo','Directivo'],['administrativo','Administrativo'],['operativo','Operativo'],['servicios_generales','Servicios generales']],
  tipo_contrato: [['prestacion_servicios','Prestación de servicios'],['termino_indefinido','Término indefinido'],['termino_fijo','Término fijo'],['obra_labor','Obra o labor'],['aprendiz','Aprendiz'],['otro','Otro']],
  tipo_permanencia: [['permanente','Permanente'],['ocasional','Ocasional'],['por_dias','Por días'],['por_horas','Por horas'],['temporal','Temporal']],
}
const MAYUSCULA = new Set(['nombres','apellidos','direccion','profesion','cargo','perfil_profesional','titulo','institucion','empresa','nombre','relacion','contacto_emergencia_nombre','contacto_emergencia_parentesco','numero_certificado'])
const TELEFONOS = new Set(['telefono','contacto_emergencia_telefono'])
const normalizar = (nombre, valor) => typeof valor !== 'string' ? valor : TELEFONOS.has(nombre) ? valor.replace(/[^0-9]/g,'') : MAYUSCULA.has(nombre) ? valor.toLocaleUpperCase('es-CO') : valor

export default function VinculacionPersonalPage() {
  const { codigoCea, codigoFormulario } = useParams()
  const [config, setConfig] = useState(null)
  const [departamentos, setDepartamentos] = useState([])
  const [errorConfig, setErrorConfig] = useState('')
  const [paso, setPaso] = useState(0)
  const [validado, setValidado] = useState(false)
  const [personal, setPersonal] = useState(inicial)
  const [estudios, setEstudios] = useState([{nivel_estudio:'', titulo:'', institucion:'', fecha_grado:''}])
  const [experiencias, setExperiencias] = useState([{empresa:'', cargo:'', fecha_inicio:'', fecha_fin:''}])
  const [licencias, setLicencias] = useState([{categoria:'',tipo_licencia:'CONDUCCION',numero_certificado:'',vigencia:''}])
  const [referencia, setReferencia] = useState({nombre:'', telefono:'', relacion:''})
  const [autorizado, setAutorizado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    if (!codigoCea || !codigoFormulario) return
    fetch('/api/public/personal/formulario?' + new URLSearchParams({cea:codigoCea, formulario:codigoFormulario}), {cache:'no-store'})
      .then(async r => {const j=await r.json(); if(!r.ok) throw new Error(j.mensaje); setConfig(j)})
      .catch(e=>setErrorConfig(e.message || 'Enlace no disponible.'))
  }, [codigoCea, codigoFormulario])

  const actualizar = (nombre, valor) => setPersonal(p=>({...p,[nombre]:normalizar(nombre,valor)}))
  const modificarLista = (setter, indice, nombre, valor) => setter(prev=>prev.map((f,i)=>i===indice?{...f,[nombre]:normalizar(nombre,valor)}:f))
  async function verificar() {
    setMensaje('')
    if (!personal.documento.trim()) return setMensaje('Ingrese su número de documento.')
    setOcupado(true)
    try {
      const r = await fetch('/api/public/personal/validar', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cea:codigoCea,formulario:codigoFormulario,documento:personal.documento})})
      const j = await r.json()
      if (!r.ok) throw new Error(j.mensaje)
      if (j.existe) return setMensaje('Este documento ya está registrado. Comuníquese con el administrador del CEA.')
      setValidado(true);setPaso(1)
    } catch(e){setMensaje(e.message)}finally{setOcupado(false)}
  }
  async function enviar(e) {
    e.preventDefault()
    setMensaje('')
    if (!personal.nombres.trim() || !personal.apellidos.trim() || !referencia.nombre.trim() || !referencia.telefono.trim() || !autorizado) return setMensaje('Complete nombres, apellidos, referencia personal y autorización de datos.')
    if (referencia.nombre.trim().toLowerCase() === personal.contacto_emergencia_nombre.trim().toLowerCase()) return setMensaje('La referencia debe ser diferente del contacto de emergencia.')
    setOcupado(true)
    try {
      const r = await fetch('/api/public/personal/enviar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cea:codigoCea,formulario:codigoFormulario,personal,estudios,experiencias,licencias,referencia,autorizado})})
      const j=await r.json()
      if(!r.ok)throw new Error(j.mensaje)
      setEnviado(true);setMensaje(j.mensaje)
    }catch(e){setMensaje(e.message)}finally{setOcupado(false)}
  }
  const endpointCatalogos = '/api/public/personal/catalogos?cea=' + encodeURIComponent(codigoCea || '') + '&formulario=' + encodeURIComponent(codigoFormulario || '')
  const departamentoId = departamentos.find(d => d.nombre === personal.departamento_residencia)?.id

  function renderCampo(c, objeto=personal, fn=actualizar) {
    if (OPCIONES[c.nombre]) return <label key={c.nombre} className="block text-sm font-medium text-slate-700">{c.titulo}{c.obligatorio ? ' *' : ''}
      <select required={c.obligatorio} value={objeto[c.nombre] || ''} onChange={e=>fn(c.nombre,e.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white p-2">
        <option value="">Seleccione</option>{OPCIONES[c.nombre].map(([valor,etiqueta])=><option key={valor} value={valor}>{etiqueta}</option>)}
      </select></label>
    
    if (objeto === personal && ['departamento_residencia','ciudad_residencia','eps','arl','fondo_pension'].includes(c.nombre)) {
      if (c.nombre === 'ciudad_residencia') return <CampoMunicipioBusqueda key={c.nombre} departamentoId={departamentoId} endpoint={endpointCatalogos} value={personal.ciudad_residencia || ''} onChange={valor=>actualizar('ciudad_residencia',valor)} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" />
      const catalogo = { departamento_residencia:'departamentos', eps:'eps', arl:'arl', fondo_pension:'fondos_pensiones' }[c.nombre]
      return <CampoCatalogo key={c.nombre} catalogo={catalogo} name={c.nombre} label={c.titulo} value={personal[c.nombre] || ''} endpoint={endpointCatalogos} required={false}
        onOpcionesCargadas={c.nombre === 'departamento_residencia' ? setDepartamentos : undefined}
        onChange={e => setPersonal(p => ({ ...p, [c.nombre]:e.target.value, ...(c.nombre === 'departamento_residencia' ? { ciudad_residencia:'' } : {}) }))} />
    }
    return <label key={c.nombre} className="block text-sm font-medium text-slate-700">{c.titulo}{c.obligatorio?' *':''}
      {c.tipo==='textarea'?<textarea rows={4} value={objeto[c.nombre]||''} onChange={e=>fn(c.nombre,e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2"/>:
      <input type={c.tipo} required={c.obligatorio} value={objeto[c.nombre]||''} onChange={e=>fn(c.nombre,e.target.value)} className={'mt-1 w-full rounded border border-slate-300 p-2 '+(MAYUSCULA.has(c.nombre)?'uppercase':'')}/>} 
    </label>
  }
  if (errorConfig) return <main className="mx-auto max-w-2xl p-8" role="alert">{errorConfig}</main>
  if (!config) return <main className="mx-auto max-w-2xl p-8">Verificando formulario...</main>
  return <main className="min-h-screen bg-slate-100 px-3 py-8"><section className="mx-auto max-w-3xl rounded-lg border bg-white p-5 shadow-sm">
    <h1 className="text-xl font-bold text-[#194567]">{config.titulo}</h1><p className="mt-1 text-sm text-slate-600">{config.cea}</p>
    {enviado?<p className="mt-8 rounded bg-green-50 p-4 text-green-800" role="status">Formulario enviado correctamente. La administración revisará su información.</p>:<>
    <div className="mt-5 flex flex-wrap gap-2">{pasos.map((p,i)=><span key={p} className={'rounded px-2 py-1 text-xs '+(i===paso?'bg-[#194567] text-white':'bg-slate-100 text-slate-600')}>{i+1}. {p}</span>)}</div>
    <div className="mt-3 h-2 rounded bg-slate-200"><div className="h-2 rounded bg-[#194567]" style={{width:((paso+1)/pasos.length*100)+'%'}}/></div>
    <form onSubmit={enviar} className="mt-6 space-y-4">
    {paso===0&&<><label className="block text-sm font-medium">Tipo de documento<select value={personal.tipo_documento} onChange={e=>actualizar('tipo_documento',e.target.value)} className="mt-1 w-full rounded border p-2">{['CC','CE','TI','PPT','PA'].map(x=><option key={x}>{x}</option>)}</select></label>{renderCampo(campo('documento','Número de documento','text',true))}<button type="button" disabled={ocupado} onClick={verificar} className="rounded bg-[#194567] px-4 py-2 text-white">Validar documento y continuar</button></>}
    {paso===1&&<div className="grid gap-4 sm:grid-cols-2">{[campo('nombres','Nombres','text',true),campo('apellidos','Apellidos','text',true),campo('fecha_nacimiento','Fecha de nacimiento','date'),campo('genero','Género'),campo('telefono','Teléfono'),campo('email','Correo','email'),campo('direccion','Dirección'),campo('ciudad_residencia','Ciudad'),campo('departamento_residencia','Departamento'),campo('escolaridad','Escolaridad'),campo('profesion','Profesión u oficio'),campo('eps','EPS'),campo('arl','ARL'),campo('fondo_pension','Fondo de pensión'),campo('contacto_emergencia_nombre','Contacto de emergencia'),campo('contacto_emergencia_parentesco','Parentesco'),campo('contacto_emergencia_telefono','Teléfono de emergencia')].map(c=>renderCampo(c))}</div>}
    {paso===2&&<div className="space-y-4"><label className="flex gap-2"><input type="checkbox" checked={personal.trabaja_cea} onChange={e=>actualizar('trabaja_cea',e.target.checked)}/>Actualmente trabaja en este CEA</label>{personal.trabaja_cea&&<div className="grid gap-3 sm:grid-cols-2">{[campo('tipo_personal','Tipo de vinculación'),campo('grupo_personal','Grupo de trabajo'),campo('cargo','Cargo'),campo('tipo_contrato','Tipo de contrato'),campo('tipo_permanencia','Permanencia en el CEA'),campo('fecha_vinculacion','Fecha de vinculación','date')].map(c=>renderCampo(c))}</div>}<label className="flex gap-2"><input type="checkbox" checked={personal.rol_conductor_instructor} onChange={e=>actualizar('rol_conductor_instructor',e.target.checked)}/>Desempeña rol de instructor</label>{personal.rol_conductor_instructor&&<div className="space-y-3 rounded border p-3"><h3 className="font-semibold">Licencias del instructor</h3>{licencias.map((x,i)=><div key={i} className="grid gap-3 sm:grid-cols-2">{[campo('categoria','Categoría'),campo('numero_certificado','Número de certificado'),campo('vigencia','Vigencia','date')].map(c=>renderCampo(c,x,(n,v)=>modificarLista(setLicencias,i,n,v)))}</div>)}<button type="button" className="rounded border px-3 py-2" onClick={()=>setLicencias(a=>[...a,{categoria:'',tipo_licencia:'CONDUCCION',numero_certificado:'',vigencia:''}])}>Agregar licencia</button></div>}{renderCampo(campo('perfil_profesional','Perfil profesional','textarea'))}</div>}
    {paso===3&&<div className="space-y-4">{estudios.map((x,i)=><div key={i} className="grid gap-3 rounded border p-3 sm:grid-cols-2">{[campo('nivel_estudio','Nivel de estudios'),campo('titulo','Título'),campo('institucion','Institución'),campo('fecha_grado','Fecha de grado','date')].map(c=>renderCampo(c,x,(n,v)=>modificarLista(setEstudios,i,n,v)))}</div>)}<button type="button" onClick={()=>setEstudios(x=>[...x,{nivel_estudio:'',titulo:'',institucion:'',fecha_grado:''}])} className="rounded border px-3 py-2">Agregar estudio</button></div>}
    {paso===4&&<div className="space-y-4">{experiencias.map((x,i)=><div key={i} className="grid gap-3 rounded border p-3 sm:grid-cols-2">{[campo('empresa','Empresa'),campo('cargo','Cargo'),campo('fecha_inicio','Fecha de inicio','date'),campo('fecha_fin','Fecha de retiro','date')].map(c=>renderCampo(c,x,(n,v)=>modificarLista(setExperiencias,i,n,v)))}</div>)}<button type="button" onClick={()=>setExperiencias(x=>[...x,{empresa:'',cargo:'',fecha_inicio:'',fecha_fin:''}])} className="rounded border px-3 py-2">Agregar experiencia</button></div>}
    {paso===5&&<div className="space-y-4"><p className="text-sm text-slate-600">Indique una referencia personal diferente del contacto de emergencia.</p>{[campo('nombre','Nombre de la referencia','text',true),campo('telefono','Teléfono','text',true),campo('relacion','Relación')].map(c=>renderCampo(c,referencia,(n,v)=>setReferencia(p=>({...p,[n]:normalizar(n,v)}))))}<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={autorizado} onChange={e=>setAutorizado(e.target.checked)}/>Autorizo el tratamiento de mis datos personales para la gestión de mi expediente por el CEA.</label></div>}
    {mensaje&&<p role="alert" className="rounded bg-amber-50 p-3 text-sm text-amber-900">{mensaje}</p>}
    {validado&&<div className="flex justify-between border-t pt-4"><button type="button" onClick={()=>{setMensaje('');setPaso(x=>Math.max(1,x-1))}} disabled={paso===1||ocupado} className="rounded border px-4 py-2 disabled:opacity-40">Anterior</button>{paso<5?<button type="button" onClick={()=>{setMensaje('');setPaso(x=>Math.min(5,x+1))}} className="rounded bg-[#194567] px-4 py-2 text-white">Siguiente</button>:<button type="submit" disabled={ocupado} className="rounded bg-[#194567] px-4 py-2 text-white disabled:opacity-50">{ocupado?'Enviando...':'Enviar formulario'}</button>}</div>}
    </form></>}
  </section></main>
}
