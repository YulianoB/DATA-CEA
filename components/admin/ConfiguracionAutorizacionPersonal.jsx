'use client'
import { useCallback, useEffect, useState } from 'react'
const API = '/api/admin/configuracion-autorizacion-personal'
const titulos = ['RESPONSABLE DEL TRATAMIENTO','MARCO NORMATIVO','INFORMACIÓN TRATADA','FINALIDADES','PLATAFORMA TECNOLÓGICA DATA-CEA','DESTINATARIOS Y SEGURIDAD','DATOS SENSIBLES','DERECHOS DEL TITULAR','CANALES DE ATENCIÓN Y POLÍTICA INSTITUCIONAL','CONSERVACIÓN','DECLARACIÓN Y AUTORIZACIÓN','CONSTANCIA ELECTRÓNICA']
const nuevo = (titulo='', contenido='') => ({ id: Math.random().toString(36).slice(2), titulo, contenido })
function desdeTexto(texto) {
  const partes = String(texto || '').split(/\n(?=\d{1,2}\. [A-ZÁÉÍÓÚÑ])/)
  const encabezado = partes.shift() || ''
  const secciones = partes.map(p => {
    const lineas = p.trim().split('\n')
    const titulo = lineas.shift().replace(/^\d{1,2}\.\s*/, '')
    return nuevo(titulo, lineas.join('\n').trim())
  })
  return { nombre: encabezado.trim() || 'AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES DEL PERSONAL', secciones: secciones.length ? secciones : [nuevo('RESPONSABLE DEL TRATAMIENTO')] }
}
function construir(nombre, secciones) {
  return [nombre.trim(), ...secciones.filter(s=>s.titulo.trim() || s.contenido.trim()).map((s,i)=>`${i+1}. ${s.titulo.trim().toUpperCase()}\n${s.contenido.trim()}`)].join('\n\n')
}
export default function ConfiguracionAutorizacionPersonal({ nitEmpresa }) {
  const [versiones,setVersiones]=useState([])
  const [empresa,setEmpresa]=useState(null)
  const [plantilla,setPlantilla]=useState('')
  const [nombre,setNombre]=useState('AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES DEL PERSONAL')
  const [codigo,setCodigo]=useState('')
  const [version,setVersion]=useState('01')
  const [fechaEdicion,setFechaEdicion]=useState(new Date().toISOString().slice(0,10))
  const [fechaVigencia,setFechaVigencia]=useState('')
  const [observaciones,setObservaciones]=useState('')
  const [secciones,setSecciones]=useState(()=>desdeTexto('').secciones)
  const [cargando,setCargando]=useState(true)
  const [guardando,setGuardando]=useState(false)
  const [mensaje,setMensaje]=useState('')
  const [historica,setHistorica]=useState(null)
  const [modo,setModo]=useState('nuevo')
  const cargar=useCallback(async()=>{
    if (!nitEmpresa) return
    setCargando(true)
    try {
      const r=await fetch(API,{cache:'no-store',headers:{'x-cea-nit':nitEmpresa}})
      const data=await r.json()
      if(!r.ok || !data.ok) throw Error(data.mensaje || 'No fue posible consultar las versiones.')
      setVersiones(data.versiones||[])
      setEmpresa(data.empresa||null)
      setPlantilla(data.plantilla||'')
      if(!(data.versiones||[]).length) {
        const base=desdeTexto(data.plantilla)
        setNombre(base.nombre)
        setSecciones(base.secciones)
      }
      setMensaje('')
    }catch(e){setMensaje(e.message)}
    finally{setCargando(false)}
  },[nitEmpresa])
  useEffect(()=>{cargar()},[cargar])
  const vigente=versiones.find(v=>v.vigente)
  function aplicarTexto(texto) {
    const d=desdeTexto(texto)
    setNombre(d.nombre)
    setSecciones(d.secciones)
  }
  function modificar(id,campo,valor){setSecciones(xs=>xs.map(x=>x.id===id?{...x,[campo]:valor}:x))}
  function mover(i,dir){setSecciones(xs=>{const a=[...xs],j=i+dir;if(j<0||j>=a.length)return xs;[a[i],a[j]]=[a[j],a[i]];return a})}
  async function publicar(){
    if(!nombre.trim()||secciones.some(s=>!s.titulo.trim()||!s.contenido.trim())){setMensaje('Complete el nombre, el título y el contenido de todas las secciones.');return}
    const contenido=construir(nombre,secciones)
    if(contenido.length<100){setMensaje('El documento debe tener al menos 100 caracteres.');return}
    if(!window.confirm('¿Publicar la nueva versión? La versión anterior se conservará y la nueva quedará vigente.'))return
    setGuardando(true);setMensaje('')
    try{
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','x-cea-nit':nitEmpresa},body:JSON.stringify({version,contenido,nombre_documento:nombre,codigo,fecha_edicion:fechaEdicion,fecha_vigencia:fechaVigencia,observaciones})})
      const d=await r.json()
      if(!r.ok||!d.ok)throw Error(d.mensaje||'No se pudo publicar.')
      await cargar()
      setModo('actual')
      setMensaje('Versión publicada correctamente. El formulario público mostrará este documento.')
    }catch(e){setMensaje(e.message)}finally{setGuardando(false)}
  }
  const boton='rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50'
  const input='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-teal-500 disabled:bg-slate-50'
  const etiqueta='block text-xs font-bold uppercase text-slate-600'
  const panel='overflow-hidden rounded-xl border border-teal-400 bg-white shadow-sm'
  return <div className="space-y-5">
    {mensaje&&<p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-slate-800">{mensaje}</p>}
    <section className={panel}>
      <header className="flex flex-wrap items-center justify-between gap-3 bg-teal-800 px-5 py-4 text-white">
        <div><h2 className="text-sm font-bold">Datos de la Autorización para el Tratamiento de Datos del Personal</h2><p className="mt-1 text-xs text-teal-100">El diseño del encabezado es compartido. Aquí se configuran los datos propios de este documento.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20" onClick={()=>setHistorica(versiones[0]||null)}>↶ Versiones anteriores{versiones.length ? ` (${versiones.length})` : ''}</button>
          <button type="button" className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800" onClick={()=>{setModo('nuevo');setVersion('');aplicarTexto(vigente?.contenido||plantilla)}}>＋ Crear nueva versión</button>
          <button type="button" className="rounded-lg border border-white/50 bg-white px-3 py-2 text-xs font-bold text-sky-900 hover:bg-slate-100" onClick={()=>{if(vigente){aplicarTexto(vigente.contenido);setVersion(vigente.version);setModo('actual')}}}>{vigente ? 'Editar versión actual' : 'Consultar versión actual'}</button>
        </div>
      </header>
      <div className="p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(330px,2fr)_minmax(130px,0.7fr)_minmax(205px,1fr)_minmax(205px,1fr)]">
          <label className={etiqueta}>Nombre del documento<input className={input} value={nombre} onChange={e=>setNombre(e.target.value)} disabled={modo==='actual'}/></label>
          <label className={etiqueta}>Código<input className={input} value={codigo} onChange={e=>setCodigo(e.target.value)} disabled={modo==='actual'}/></label>
          <label className={etiqueta}>Fecha de elaboración<input className={input} type="date" value={fechaEdicion} onChange={e=>setFechaEdicion(e.target.value)} disabled={modo==='actual'}/></label>
          <label className={etiqueta}>Versión<input className={input} value={version} onChange={e=>setVersion(e.target.value)} disabled={modo==='actual'} placeholder="02"/></label>
          <label className={etiqueta}>Fecha de vigencia<input className={input} type="date" value={fechaVigencia} onChange={e=>setFechaVigencia(e.target.value)} disabled={modo==='actual'}/></label>
          <label className={etiqueta+' md:col-span-2 xl:col-span-4'}>Observaciones<input className={input} value={observaciones} onChange={e=>setObservaciones(e.target.value)} disabled={modo==='actual'}/></label>
        </div>
        <div className="mt-4 flex items-center justify-end border-t border-slate-200 pt-3 text-xs text-slate-700">Estado del documento: <span className="ml-2 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800">{vigente?'Activo · versión '+vigente.version:'Sin publicar'}</span></div>
      </div>
    </section>
    <section className={panel}>
      <header className="bg-teal-700 px-5 py-4 text-white"><h2 className="text-sm font-bold">Configuración general de la autorización</h2><p className="mt-1 text-xs text-teal-100">Los canales de atención, el responsable y las finalidades se definen en las secciones legales. No se modifican los datos de aprendices.</p></header>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div><p className={etiqueta}>Centro de Enseñanza Automovilística</p><p className="mt-1 rounded-lg border bg-slate-50 p-3 text-sm">{empresa?.nombre||'CEA'}</p></div>
        <div><p className={etiqueta}>NIT del responsable</p><p className="mt-1 rounded-lg border bg-slate-50 p-3 text-sm">{empresa?.nit||'—'}</p></div>
        <p className="sm:col-span-2 text-xs text-slate-600">Verifique los canales oficiales del CEA y la ubicación de su política de tratamiento de datos dentro de la sección correspondiente antes de publicar.</p>
      </div>
    </section>
    <section className={panel}>
      <header className="flex items-center justify-between gap-3 bg-slate-700 px-5 py-4 text-white"><div><h2 className="text-sm font-bold">Secciones legales del documento</h2><p className="mt-1 text-xs text-slate-200">Configure los textos específicos del personal, sus derechos y las finalidades del tratamiento.</p></div><button type="button" disabled={modo==='actual'} onClick={()=>setSecciones(xs=>[...xs,nuevo()])} className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-bold text-slate-900 disabled:opacity-50">＋ Agregar sección</button></header>
      <div className="space-y-4 p-5">{secciones.map((s,i)=><div key={s.id} className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50 shadow-sm">
        <header className="flex items-center justify-between gap-3 bg-teal-50 px-5 py-3"><div><h3 className="text-xs font-black uppercase text-teal-800">{s.titulo||'Nueva sección'}</h3><p className="text-xs text-slate-500">Orden {i+1}</p></div><div className="flex gap-1"><button className={boton} disabled={modo==='actual'||i===0} onClick={()=>mover(i,-1)} type="button" aria-label="Subir sección">↑</button><button className={boton} disabled={modo==='actual'||i===secciones.length-1} onClick={()=>mover(i,1)} type="button" aria-label="Bajar sección">↓</button><button className={boton} disabled={modo==='actual'} onClick={()=>setSecciones(xs=>xs.filter(x=>x.id!==s.id))} type="button" aria-label="Eliminar sección">✕</button></div></header>
        <div className="grid gap-4 p-5 md:grid-cols-[minmax(200px,1fr)_minmax(0,3fr)]"><label className={etiqueta}>Título de la sección<input className={input} value={s.titulo} disabled={modo==='actual'} onChange={e=>modificar(s.id,'titulo',e.target.value)}/></label><label className={etiqueta}>Contenido<textarea className={input+' min-h-44 resize-y leading-relaxed'} rows={8} value={s.contenido} disabled={modo==='actual'} onChange={e=>modificar(s.id,'contenido',e.target.value)}/></label></div>
      </div>)}</div>
    </section>
    <section className={panel}><header className="bg-slate-700 px-5 py-4 text-white"><h2 className="text-sm font-bold">Publicación e historial de versiones</h2><p className="mt-1 text-xs text-slate-200">Las versiones publicadas son inmutables. Crear una nueva versión conserva el documento anterior.</p></header>
      <div className="space-y-3 p-5">
        {modo==='actual'&&<button type="button" className={boton} onClick={()=>{setModo('nuevo');setVersion('')}}>Crear nueva versión a partir de esta</button>}
        {modo!=='actual'&&<button type="button" disabled={guardando||cargando||!version.trim()} onClick={publicar} className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{guardando?'Publicando...':'Guardar y publicar nueva versión'}</button>}
        {cargando?<p className="text-sm">Consultando versiones...</p>:versiones.length===0?<p className="text-sm text-slate-600">No existen versiones publicadas.</p>:versiones.map(v=><div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span>Versión {v.version} · {new Date(v.fecha_publicacion).toLocaleString('es-CO')} {v.vigente?'· Vigente':'· Histórica'}</span><button className={boton} type="button" onClick={()=>setHistorica(v)}>Consultar documento</button></div>)}
      </div>
    </section>
    {historica&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-label={'Documento versión '+historica.version} className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white p-5"><div className="flex justify-between gap-3"><h3 className="font-bold text-[#194567]">Autorización del personal · Versión {historica.version}</h3><button type="button" className={boton} onClick={()=>setHistorica(null)}>Cerrar</button></div><div className="mt-4 overflow-auto whitespace-pre-wrap font-sans text-sm font-normal leading-relaxed text-slate-800">{historica.contenido.split(/\n/).map((line,i)=><p key={i} className={/^\d{1,2}\.\s+[A-ZÁÉÍÓÚÑ]/.test(line) ? "mt-4 font-bold text-slate-900" : "font-normal"}>{line || "\u00a0"}</p>)}</div></section></div>}
  </div>
}
