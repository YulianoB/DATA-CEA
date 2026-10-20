'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import CampoCatalogo from '@/components/admin/CampoCatalogo'
import CampoMunicipioBusqueda from '@/components/admin/CampoMunicipioBusqueda'

const inicial = { tipo_documento:'CC', documento:'', nombres:'', apellidos:'', telefono:'', email:'', contacto_emergencia_nombre:'', contacto_emergencia_parentesco:'', contacto_emergencia_telefono:'', perfil_profesional:'', tipo_personal:'contratista', trabaja_cea:false, rol_conductor_instructor:false }
const pasos = ['Identificación', 'Información general', 'Vinculación y perfil', 'Estudios', 'Experiencia', 'Referencia y envío']
const campo = (nombre, titulo, tipo='text', obligatorio=false) => ({ nombre, titulo, tipo, obligatorio })
const OPCIONES = {
  tipo_referencia: [['personal','Personal'],['laboral','Laboral']],
  genero: [['Femenino','Femenino'],['Masculino','Masculino'],['Otro','Otro']],
  tipo_sangre: ['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(x=>[x,x]),
  estado_civil: ['Soltero(a)','Casado(a)','Unión libre','Divorciado(a)','Viudo(a)'].map(x=>[x,x]),
  medio_transporte_trabajo: ['A pie','Bicicleta','Transporte público','Motocicleta propia','Motocicleta CEA','Automóvil propio','Automóvil CEA','Camioneta propia','Camioneta CEA'].map(x=>[x,x]),
  escolaridad: [['BACHILLER','Bachiller'],['TECNICO','Técnico'],['TECNOLOGO','Tecnólogo'],['PREGRADO','Pregrado'],['POSGRADO','Posgrado']],
  nivel_estudio: [['BACHILLER','Bachiller'],['TÉCNICO','Técnico'],['TECNÓLOGO','Tecnólogo'],['PREGRADO','Pregrado'],['POSGRADO','Posgrado'],['DIPLOMADO','Diplomado'],['CURSO','Curso'],['CURSO PRIMER RESPONDIENTE ANSV','Curso Primer Respondiente ANSV'],['SEMINARIO','Seminario'],['TALLER','Taller'],['CERTIFICACIÓN','Certificación'],['OTRO','Otro']],
  tipo_personal: [['contratista','Contratista'],['colaborador','Colaborador']],
  grupo_personal: [['directivo','Directivo'],['administrativo','Administrativo'],['operativo','Operativo'],['servicios_generales','Servicios generales']],
  tipo_contrato: [['prestacion_servicios','Prestación de servicios'],['termino_indefinido','Término indefinido'],['termino_fijo','Término fijo'],['obra_labor','Obra o labor'],['aprendiz','Aprendiz'],['otro','Otro']],
  tipo_permanencia: [['permanente','Permanente'],['ocasional','Ocasional'],['por_dias','Por días'],['por_horas','Por horas'],['temporal','Temporal']],
}
const MAYUSCULA = new Set(['nombres','apellidos','direccion','nacionalidad','profesion','cargo','titulo','institucion','empresa','jefe_inmediato','ocupacion_cargo','nombre','relacion','contacto_emergencia_nombre','contacto_emergencia_parentesco','numero_certificado'])
const TELEFONOS = new Set(['telefono','contacto_emergencia_telefono','telefono_contacto'])
const normalizar = (nombre, valor) => typeof valor !== 'string' ? valor : TELEFONOS.has(nombre) ? valor.replace(/[^0-9]/g,'') : MAYUSCULA.has(nombre) ? valor.toLocaleUpperCase('es-CO') : valor

const tiene = v => String(v ?? '').trim().length > 0
function validarSecciones(p, estudios, experiencias, licencias, referencia, autorizado, documentoAutorizacion) {
  const errores = {}
  const agregar = (paso, texto) => { (errores[paso] ||= []).push(texto) }
  for (const [k, nombre] of [['nombres','Nombres'],['apellidos','Apellidos'],['fecha_nacimiento','Fecha de nacimiento'],['genero','Género'],['tipo_sangre','Tipo de sangre'],['estado_civil','Estado civil'],['nacionalidad','Nacionalidad'],['escolaridad','Nivel académico principal'],['profesion','Profesión u oficio'],['email','Correo electrónico'],['medio_transporte_trabajo','Medio de transporte al trabajo'],['telefono','Teléfono'],['direccion','Dirección'],['departamento_residencia','Departamento'],['ciudad_residencia','Ciudad / Municipio'],['contacto_emergencia_nombre','Contacto de emergencia'],['contacto_emergencia_parentesco','Parentesco de emergencia'],['contacto_emergencia_telefono','Teléfono de emergencia']]) {
    if (!tiene(p[k])) agregar(1, nombre)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email || '')) agregar(1, 'El correo electrónico tiene un formato inválido')
  if (!Number.isInteger(Number(p.numero_hijos)) || String(p.numero_hijos ?? '').trim() === '' || Number(p.numero_hijos) < 0) agregar(1, 'Número de hijos (escriba 0 si no tiene)')
  if (!['Femenino','Masculino','Otro'].includes(p.genero)) agregar(1, 'Seleccione un género válido')
  if (!OPCIONES.tipo_sangre.some(([valor])=>valor===p.tipo_sangre)) agregar(1, 'Seleccione un tipo de sangre válido')
  if (!OPCIONES.estado_civil.some(([valor])=>valor===p.estado_civil)) agregar(1, 'Seleccione un estado civil válido')
  if (!OPCIONES.medio_transporte_trabajo.some(([valor])=>valor===p.medio_transporte_trabajo)) agregar(1, 'Seleccione un medio de transporte válido')
  if (!tiene(p.perfil_profesional)) agregar(2, 'Perfil profesional')
  if (p.trabaja_cea) {
    for (const [k, nombre] of [['tipo_personal','Tipo de vinculación'],['grupo_personal','Grupo de trabajo'],['cargo','Cargo'],['tipo_contrato','Tipo de contrato'],['tipo_permanencia','Permanencia en el CEA'],['fecha_vinculacion','Fecha de vinculación']]) {
      if (!tiene(p[k])) agregar(2, nombre)
    }
  }
  if (p.rol_conductor_instructor) {
    for (const tipo of ['INSTRUCTOR','CONDUCCION']) {
      const items = licencias.filter(l => l.tipo_licencia === tipo)
      const etiqueta = tipo === 'INSTRUCTOR' ? 'Certificado de instructor' : 'Licencia de conducción'
      if (!items.length) agregar(2, etiqueta + ': seleccione al menos una categoría')
      for (const l of items) {
        if (!tiene(l.vigencia)) agregar(2, etiqueta + ' ' + l.categoria + ': vigencia')
        if (tipo === 'INSTRUCTOR' && !tiene(l.numero_certificado)) agregar(2, etiqueta + ' ' + l.categoria + ': número de certificado')
      }
    }
    if (!estudios.some(e => e.nivel_estudio === 'BACHILLER')) agregar(3, 'Registre la formación de bachiller del instructor')
  }
  estudios.forEach((e,i) => {
    if (Object.values(e).some(tiene)) for (const [k, nombre] of [['nivel_estudio','Tipo de formación'],['titulo','Título o nombre del curso'],['institucion','Institución']]) {
      if (!tiene(e[k])) agregar(3, 'Estudio ' + (i+1) + ': ' + nombre)
    }
  })
  experiencias.forEach((e,i) => {
    if (Object.values(e).some(v => typeof v === 'string' && tiene(v)) || e.actualmente) {
      for (const [k, nombre] of [['empresa','Empresa'],['cargo','Cargo'],['fecha_inicio','Fecha de inicio']]) if (!tiene(e[k])) agregar(4, 'Experiencia ' + (i+1) + ': ' + nombre)
      if (!e.actualmente && !tiene(e.fecha_fin)) agregar(4, 'Experiencia ' + (i+1) + ': fecha de retiro')
      if (e.fecha_fin && e.fecha_inicio && e.fecha_fin < e.fecha_inicio) agregar(4, 'Experiencia ' + (i+1) + ': la fecha de retiro es anterior al inicio')
    }
  })
  for (const [k,nombre] of [['nombre','Nombre de la referencia'],['telefono','Teléfono de la referencia']]) if (!tiene(referencia[k])) agregar(5,nombre)
  if (tiene(referencia.nombre) && tiene(p.contacto_emergencia_nombre) && referencia.nombre.trim().toLowerCase() === p.contacto_emergencia_nombre.trim().toLowerCase()) agregar(5, 'La referencia debe ser diferente del contacto de emergencia')
  if (!documentoAutorizacion?.version) agregar(5, 'El CEA debe publicar la autorización de datos')
  if (!autorizado) agregar(5, 'Aceptar el tratamiento de datos personales')
  return errores
}

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
  const [licencias, setLicencias] = useState([])
  const [verAutorizacion, setVerAutorizacion] = useState(false)
  const [documentoAutorizacion, setDocumentoAutorizacion] = useState(null)
  const [errorAutorizacion, setErrorAutorizacion] = useState('')
  const [referencia, setReferencia] = useState({tipo_referencia:'personal',nombre:'',telefono:'',email:'',ocupacion_cargo:'',empresa:'',relacion:'',observaciones:''})
  const [autorizado, setAutorizado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [erroresSeccion, setErroresSeccion] = useState({})
  const [validacionIntentada, setValidacionIntentada] = useState(false)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    if (!codigoCea || !codigoFormulario) return
    fetch('/api/public/personal/formulario?' + new URLSearchParams({cea:codigoCea, formulario:codigoFormulario}), {cache:'no-store'})
      .then(async r => {const j=await r.json(); if(!r.ok) throw new Error(j.mensaje); setConfig(j)})
      .catch(e=>setErrorConfig(e.message || 'Enlace no disponible.'))
  }, [codigoCea, codigoFormulario])

  useEffect(() => {
    if (!codigoCea || !codigoFormulario) return
    fetch('/api/public/personal/autorizacion?' + new URLSearchParams({ cea: codigoCea, formulario: codigoFormulario }), { cache: 'no-store' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok || !data.ok) throw new Error(data.mensaje || 'Autorización no disponible.')
        setDocumentoAutorizacion(data.documento)
        setErrorAutorizacion('')
      })
      .catch(error => { setDocumentoAutorizacion(null); setErrorAutorizacion(error.message) })
  }, [codigoCea, codigoFormulario])

  useEffect(() => {
    if (!validacionIntentada) return
    const actualizados = validarSecciones(personal, estudios, experiencias, licencias, referencia, autorizado, documentoAutorizacion)
    setErroresSeccion(prev => JSON.stringify(prev) === JSON.stringify(actualizados) ? prev : actualizados)
  }, [validacionIntentada, personal, estudios, experiencias, licencias, referencia, autorizado, documentoAutorizacion])

  const actualizar = (nombre, valor) => { setMensaje(''); setPersonal(p=>({...p,[nombre]: nombre === 'email' ? String(valor).trimStart().toLowerCase() : normalizar(nombre,valor)})) }
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
    if (!validado) { setPaso(0); setMensaje('Primero valide su número de documento en Identificación.'); return }
    const errores = validarSecciones(personal, estudios, experiencias, licencias, referencia, autorizado, documentoAutorizacion)
    setValidacionIntentada(true)
    setErroresSeccion(errores)
    const pendientes = Object.keys(errores).map(Number).sort((a,b)=>a-b)
    if (pendientes.length) {
      setPaso(pendientes[0])
      setMensaje('Faltan campos obligatorios. Los encontrará señalados en rojo en las secciones marcadas.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setOcupado(true)
    try {
      const r = await fetch('/api/public/personal/enviar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cea:codigoCea,formulario:codigoFormulario,personal,estudios,experiencias,licencias,referencia,autorizado,documento_version:documentoAutorizacion.version})})
      const j=await r.json()
      if(!r.ok)throw new Error(j.mensaje)
      setEnviado(true);setMensaje(j.mensaje)
    }catch(e){setMensaje(e.message);window.scrollTo({top:0,behavior:'smooth'})}finally{setOcupado(false)}
  }
  const endpointCatalogos = '/api/public/personal/catalogos?cea=' + encodeURIComponent(codigoCea || '') + '&formulario=' + encodeURIComponent(codigoFormulario || '')
  const departamentoId = departamentos.find(d => d.nombre === personal.departamento_residencia)?.id

  function renderCampo(c, objeto=personal, fn=actualizar) {
    const invalidoEspecial = objeto === personal && (
      (c.nombre === 'email' && tiene(objeto.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(objeto.email)) ||
      (c.nombre === 'numero_hijos' && tiene(objeto.numero_hijos) && (!Number.isInteger(Number(objeto.numero_hijos)) || Number(objeto.numero_hijos) < 0)) ||
      (['genero','tipo_sangre','estado_civil','medio_transporte_trabajo'].includes(c.nombre) && tiene(objeto[c.nombre]) && !OPCIONES[c.nombre].some(([valor]) => valor === objeto[c.nombre]))
    )
    const invalidado = validacionIntentada && c.obligatorio && (!tiene(objeto[c.nombre]) || invalidoEspecial)
    const bordeCampo = invalidado ? 'border-red-600 ring-1 ring-red-500' : 'border-slate-300'
    const advertencia = invalidado ? <span role="alert" className="mt-1 block text-xs font-semibold text-red-700">Revise este campo obligatorio.</span> : null
    if (OPCIONES[c.nombre]) return <label key={c.nombre} className="block text-sm font-medium text-slate-700">{c.titulo}{c.obligatorio ? ' *' : ''}
      <select required={c.obligatorio} value={objeto[c.nombre] || ''} onChange={e=>fn(c.nombre,e.target.value)} className={`mt-1 w-full rounded border bg-white p-2 ${bordeCampo}`}>
        <option value="">Seleccione</option>{OPCIONES[c.nombre].map(([valor,etiqueta])=><option key={valor} value={valor}>{etiqueta}</option>)}
      </select>{advertencia}</label>
    
    if (objeto === personal && ['departamento_residencia','ciudad_residencia','eps','arl','fondo_pension'].includes(c.nombre)) {
      if (c.nombre === 'ciudad_residencia') return <div key={c.nombre}><CampoMunicipioBusqueda departamentoId={departamentoId} endpoint={endpointCatalogos} value={personal.ciudad_residencia || ''} onChange={valor=>actualizar('ciudad_residencia',valor)} className={`mt-1 w-full rounded border p-2 text-sm ${bordeCampo}`} />{advertencia}</div>
      const catalogo = { departamento_residencia:'departamentos', eps:'eps', arl:'arl', fondo_pension:'fondos_pensiones' }[c.nombre]
      return <div key={c.nombre} className={invalidado ? 'rounded border border-red-500 p-1' : ''}><CampoCatalogo catalogo={catalogo} name={c.nombre} label={c.titulo + (c.obligatorio ? ' *' : '')} value={personal[c.nombre] || ''} endpoint={endpointCatalogos} required={c.obligatorio} opcionesAdicionales={['eps','arl','fondo_pension'].includes(c.nombre) ? ['NO AFILIADO'] : []}
        onOpcionesCargadas={c.nombre === 'departamento_residencia' ? setDepartamentos : undefined}
        onChange={e => { setMensaje(''); setPersonal(p => ({ ...p, [c.nombre]:e.target.value, ...(c.nombre === 'departamento_residencia' ? { ciudad_residencia:'' } : {}) })) }} />{advertencia}</div>
    }
    return <label key={c.nombre} className="block text-sm font-medium text-slate-700">{c.titulo}{c.obligatorio?' *':''}
      {c.tipo==='textarea'?<textarea rows={4} required={c.obligatorio} value={objeto[c.nombre]||''} onChange={e=>fn(c.nombre,e.target.value)} className={`mt-1 w-full rounded border p-2 ${bordeCampo}`}/>:
      <input type={c.tipo} required={c.obligatorio} value={objeto[c.nombre]||''} onChange={e=>fn(c.nombre,e.target.value)} className={'mt-1 w-full rounded border p-2 '+bordeCampo+' '+(MAYUSCULA.has(c.nombre)?'uppercase':'')}/>}{advertencia} 
    </label>
  }
  if (errorConfig) return <main className="mx-auto max-w-2xl p-8" role="alert">{errorConfig}</main>
  if (!config) return <main className="mx-auto max-w-2xl p-8">Verificando formulario...</main>
  return <main className="min-h-screen bg-slate-100 px-3 py-8"><section className="mx-auto max-w-3xl rounded-lg border bg-white p-5 shadow-sm">
    <h1 className="text-xl font-bold text-[#194567]">{config.titulo}</h1><p className="mt-1 text-sm text-slate-600">{config.cea}</p>
    {enviado?<p className="mt-8 rounded bg-green-50 p-4 text-green-800" role="status">Formulario enviado correctamente. La administración revisará su información.</p>:<>
    <div className="mt-5 flex flex-wrap gap-2">{pasos.map((p,i)=><button type="button" key={p} onClick={()=>{setPaso(i);setMensaje('');window.scrollTo({top:0,behavior:'smooth'})}} className={'rounded px-2 py-1 text-xs disabled:cursor-not-allowed '+(i===paso?'bg-[#194567] text-white':erroresSeccion[i]?.length?'bg-amber-100 font-semibold text-amber-900':'bg-slate-100 text-slate-600')}>{i+1}. {p}{erroresSeccion[i]?.length?' ('+erroresSeccion[i].length+')':''}</button>)}</div>
    <div className="mt-3 h-2 rounded bg-slate-200"><div className="h-2 rounded bg-[#194567]" style={{width:((paso+1)/pasos.length*100)+'%'}}/></div>
    <form noValidate onSubmit={enviar} className="mt-6 space-y-4">
    {paso===0&&<><label className="block text-sm font-medium">Tipo de documento<select value={personal.tipo_documento} onChange={e=>actualizar('tipo_documento',e.target.value)} className="mt-1 w-full rounded border p-2">{['CC','CE','TI','PPT','PA'].map(x=><option key={x}>{x}</option>)}</select></label>{renderCampo(campo('documento','Número de documento','text',true))}<button type="button" disabled={ocupado} onClick={verificar} className="rounded bg-[#194567] px-4 py-2 text-white">Validar documento y continuar</button></>}
    {paso===1&&<div className="grid gap-4 sm:grid-cols-2">{[campo('nombres','Nombres','text',true),campo('apellidos','Apellidos','text',true),campo('fecha_nacimiento','Fecha de nacimiento','date',true),campo('genero','Género','select',true),campo('tipo_sangre','Tipo de sangre','select',true),campo('estado_civil','Estado civil','select',true),campo('nacionalidad','Nacionalidad','text',true),campo('numero_hijos','Número de hijos','number',true),campo('telefono','Teléfono','tel',true),campo('email','Correo electrónico autorizado para DATA-CEA','email',true),campo('direccion','Dirección','text',true),campo('departamento_residencia','Departamento','text',true),campo('ciudad_residencia','Ciudad / Municipio','text',true),campo('escolaridad','Nivel académico principal','select',true),campo('profesion','Profesión u oficio','text',true),campo('medio_transporte_trabajo','Medio de transporte al trabajo','select',true),campo('eps','EPS'),campo('arl','ARL'),campo('fondo_pension','Fondo de pensión'),campo('contacto_emergencia_nombre','Contacto de emergencia','text',true),campo('contacto_emergencia_parentesco','Parentesco de emergencia','text',true),campo('contacto_emergencia_telefono','Teléfono de emergencia','tel',true)].map(c=>renderCampo(c))}</div>}
    {paso===2&&<div className="space-y-4"><label className="flex gap-2"><input type="checkbox" checked={personal.trabaja_cea} onChange={e=>actualizar('trabaja_cea',e.target.checked)}/>Actualmente trabaja en este CEA</label>{personal.trabaja_cea&&<div className="grid gap-3 sm:grid-cols-2">{[campo('tipo_personal','Tipo de vinculación'),campo('grupo_personal','Grupo de trabajo'),campo('cargo','Cargo'),campo('tipo_contrato','Tipo de contrato'),campo('tipo_permanencia','Permanencia en el CEA'),campo('fecha_vinculacion','Fecha de vinculación','date')].map(c=>renderCampo(c))}</div>}{personal.trabaja_cea&&<p className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-[#194567]">Permanencia en el CEA: seleccione <strong>Por horas</strong> si se le programan clases según la demanda y su disponibilidad, aunque trabaje habitualmente con el CEA. Seleccione <strong>Permanente</strong> si tiene una jornada o disponibilidad regular previamente establecida. Esta elección describe la programación, no modifica su tipo de contrato.</p>}<label className="flex gap-2"><input type="checkbox" checked={personal.rol_conductor_instructor} onChange={e=>actualizar('rol_conductor_instructor',e.target.checked)}/>Desempeña rol de instructor</label>{personal.rol_conductor_instructor&&<div className="space-y-4">
  {['INSTRUCTOR','CONDUCCION'].map(tipo=><section key={tipo} className="rounded-lg border border-slate-300 bg-slate-50 p-4">
    <h3 className="font-semibold text-[#194567]">{tipo==='INSTRUCTOR'?'Certificado de instructor':'Licencia de conducción'}</h3>
    <p className="mt-1 text-xs text-slate-600">A2 puede registrarse sola o junto a una categoría B1, B1-C1, B2-C2 o B3-C3. Las categorías del certificado y de la licencia pueden ser diferentes.</p>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{['A2','B1','B1-C1','B2-C2','B3-C3'].map(cat=>{
      const activo=licencias.some(l=>l.tipo_licencia===tipo&&l.categoria===cat)
      return <label key={cat} className={'cursor-pointer rounded border px-2 py-3 text-center text-sm font-semibold '+(activo?'border-[#194567] bg-[#194567] text-white':'border-slate-400 bg-white')}>
        <input type="checkbox" className="sr-only" checked={activo} onChange={()=>setLicencias(prev=>activo?prev.filter(l=>!(l.tipo_licencia===tipo&&l.categoria===cat)):[...prev.filter(l=>l.tipo_licencia!==tipo||l.categoria==='A2'||cat==='A2'),{categoria:cat,tipo_licencia:tipo,numero_certificado:'',vigencia:''}])}/>{cat}
      </label>
    })}</div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{licencias.map((l,i)=>l.tipo_licencia!==tipo?null:<div key={tipo+l.categoria} className="rounded border border-slate-300 bg-white p-3">
      <h4 className="mb-2 text-sm font-semibold">Categoría {l.categoria}</h4>
      {tipo==='INSTRUCTOR'&&renderCampo(campo('numero_certificado','Número de certificado','text',true),l,(n,v)=>modificarLista(setLicencias,i,n,v))}
      {renderCampo(campo('vigencia',tipo==='INSTRUCTOR'?'Vigencia del certificado':'Vigencia de la licencia','date',true),l,(n,v)=>modificarLista(setLicencias,i,n,v))}
    </div>)}</div>
  </section>)}
</div>}<div><p className="mb-2 text-sm text-slate-600">Describa brevemente su experiencia, conocimientos, habilidades y áreas de desempeño. Ejemplo: «Soy instructor de conducción con experiencia en formación vial, atención al usuario y manejo defensivo».</p>{renderCampo(campo('perfil_profesional','Perfil profesional','textarea',true))}</div></div>}
    {paso===3&&<div className="space-y-4"><p className="rounded bg-blue-50 p-3 text-sm">Registre sus estudios académicos y formación complementaria: bachillerato, diplomados, cursos, seminarios y certificaciones. Los instructores deben incluir como mínimo su formación de bachiller.</p>{estudios.map((x,i)=><div key={i} className="grid gap-3 rounded border p-3 sm:grid-cols-2">{[campo('nivel_estudio','Tipo de formación'),campo('titulo','Título o nombre del curso'),campo('institucion','Institución o entidad formadora'),campo('fecha_grado','Fecha de finalización','date'),campo('observaciones','Observaciones')].map(c=>renderCampo(c,x,(n,v)=>modificarLista(setEstudios,i,n,v)))}</div>)}<button type="button" onClick={()=>setEstudios(x=>[...x,{nivel_estudio:'',titulo:'',institucion:'',fecha_grado:''}])} className="rounded border px-3 py-2">Agregar estudio</button></div>}
    {paso===4&&<div className="space-y-4">{experiencias.map((x,i)=><div key={i} className="grid gap-3 rounded border p-3 sm:grid-cols-2">{[campo('empresa','Empresa'),campo('cargo','Cargo'),campo('fecha_inicio','Fecha de inicio','date'),...(x.actualmente?[]:[campo('fecha_fin','Fecha de retiro','date',true)]),campo('jefe_inmediato','Jefe inmediato'),campo('telefono_contacto','Teléfono de contacto'),campo('observaciones','Observaciones'),campo('funciones','Funciones realizadas','textarea')].map(c=>renderCampo(c,x,(n,v)=>modificarLista(setExperiencias,i,n,v)))}<label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={Boolean(x.actualmente)} onChange={e=>setExperiencias(prev=>prev.map((item,j)=>j===i?{...item,actualmente:e.target.checked,fecha_fin:e.target.checked?'':item.fecha_fin}:item))}/>Labora actualmente en esta empresa</label></div>)}<button type="button" onClick={()=>setExperiencias(x=>[...x,{empresa:'',cargo:'',fecha_inicio:'',fecha_fin:''}])} className="rounded border px-3 py-2">Agregar experiencia</button></div>}
    {paso===5&&<div className="space-y-4"><p className="text-sm text-slate-600">Indique una referencia personal o laboral diferente del contacto de emergencia.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[campo('tipo_referencia','Tipo referencia','select',true),campo('nombre','Nombre','text',true),campo('telefono','Teléfono','tel',true),campo('email','Correo','email'),campo('ocupacion_cargo','Ocupación / cargo'),campo('empresa','Empresa'),campo('relacion','Relación / parentesco'),campo('observaciones','Observaciones')].map(c=>renderCampo(c,referencia,(n,v)=>setReferencia(p=>({...p,[n]:normalizar(n,v)}))))}</div><label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={!documentoAutorizacion} checked={autorizado} required onChange={e=>setAutorizado(e.target.checked)}/>He leído la información de tratamiento de datos personales y autorizo su tratamiento para gestionar mi expediente en el CEA.</label><button type="button" onClick={()=>setVerAutorizacion(true)} className="text-sm font-semibold text-[#194567] underline">Leer autorización para el tratamiento de datos personales{documentoAutorizacion ? ' · Versión '+documentoAutorizacion.version : ''}</button>{errorAutorizacion&&<p role="alert" className="text-sm text-amber-800">{errorAutorizacion}</p>}</div>}
    {erroresSeccion[paso]?.length>0&&<div role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-bold">Datos pendientes en esta sección:</p><ul className="mt-1 list-inside list-disc">{erroresSeccion[paso].map((error,i)=><li key={i}>{error}</li>)}</ul></div>}
    {mensaje&&<p role="alert" className="rounded bg-amber-50 p-3 text-sm text-amber-900">{mensaje}</p>}
    {<div className="flex justify-between border-t pt-4"><button type="button" onClick={()=>{setMensaje('');setPaso(x=>Math.max(0,x-1))}} disabled={paso===0||ocupado} className="rounded border px-4 py-2 disabled:opacity-40">Anterior</button>{paso<5?<button type="button" onClick={()=>{setMensaje('');setPaso(x=>Math.min(5,x+1))}} className="rounded bg-[#194567] px-4 py-2 text-white">Siguiente</button>:<button type="submit" disabled={ocupado} className="rounded bg-[#194567] px-4 py-2 text-white disabled:opacity-50">{ocupado?'Enviando...':'Enviar formulario'}</button>}</div>}
    </form></>}
    {verAutorizacion&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-labelledby="titulo-privacidad" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-5">
      <h2 id="titulo-privacidad" className="text-lg font-bold text-[#194567]">Información sobre tratamiento de datos personales</h2>
      <p className="mt-2 text-sm font-semibold">{config.cea} {documentoAutorizacion ? '· Versión '+documentoAutorizacion.version : ''}</p>
      {documentoAutorizacion ? <div className="mt-4 whitespace-pre-wrap font-sans text-sm font-normal leading-relaxed text-slate-800">{documentoAutorizacion.contenido.split(/\n/).map((line,i)=><p key={i} className={/^\d{1,2}\.\s+[A-ZÁÉÍÓÚÑ]/.test(line) ? "mt-4 font-bold text-slate-900" : "font-normal"}>{line || "\u00a0"}</p>)}</div> : <p className="mt-4 text-sm text-amber-800">{errorAutorizacion || 'Documento no disponible.'}</p>}
      <button type="button" onClick={()=>setVerAutorizacion(false)} className="mt-4 rounded bg-[#194567] px-4 py-2 text-white">Cerrar y volver</button>
    </section></div>}
  </section></main>
}
