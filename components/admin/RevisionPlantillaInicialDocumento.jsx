'use client'

import { useEffect, useState } from 'react'

const API='/api/admin/aprobacion-documento-inicial'
const TITULOS={
  CODIGO_CONDUCTA:'Código de Conducta',
  AUTORIZACION_DATOS_CEA:'Autorización para el Tratamiento de Datos Personales'
}
const GENERAL=[
  ['correo_proteccion_datos','Correo para protección de datos'],
  ['telefono_contacto','Teléfono de contacto'],
  ['direccion_contacto','Dirección de contacto'],
  ['medio_politica','Ubicación o medio de la política'],
  ['texto_datos_biometricos','Datos sensibles y biométricos'],
  ['texto_menores_edad','Tratamiento de datos de menores de edad'],
  ['texto_declaracion_final','Declaración y autorización final']
]
const control='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-800'
const label='block text-xs font-bold uppercase text-slate-700'

export default function RevisionPlantillaInicialDocumento({tipo,nitEmpresa}) {
  const [abierto,setAbierto]=useState(false)
  const [plantilla,setPlantilla]=useState(null)
  const [error,setError]=useState('')
  const [guardando,setGuardando]=useState(false)
  const [datos,setDatos]=useState({nombre_documento:TITULOS[tipo]||'',codigo:'',version:'',fecha_edicion:'',vigencia:'',observaciones:''})
  useEffect(()=>{
    let cancelado=false
    setPlantilla(null);setAbierto(false);setError('')
    if(!nitEmpresa||!TITULOS[tipo])return
    fetch(API+'?tipo='+encodeURIComponent(tipo),{cache:'no-store',headers:{'x-cea-nit':nitEmpresa}})
      .then(async r=>{const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'No se pudo consultar el borrador.');return d})
      .then(d=>{if(!cancelado&&d.disponible){setPlantilla(d.plantilla);setAbierto(true)}})
      .catch(e=>{if(!cancelado)setError(e.message)})
    return ()=>{cancelado=true}
  },[tipo,nitEmpresa])
  function campo(k,v){setDatos(d=>({...d,[k]:v}))}
  function seccion(i,k,v){setPlantilla(p=>({...p,secciones:p.secciones.map((s,j)=>j===i?{...s,[k]:v}:s)}))}
  function finalidad(i,k,v){setPlantilla(p=>({...p,finalidades:p.finalidades.map((f,j)=>j===i?{...f,[k]:v}:f)}))}
  function general(k,v){setPlantilla(p=>({...p,configuracion:{...p.configuracion,[k]:v}}))}
  async function aprobar(){
    if(!datos.nombre_documento.trim()||!datos.version.trim()||!datos.fecha_edicion||!datos.vigencia){
      setError('Complete nombre, versión, fecha de elaboración y fecha de vigencia. El código es opcional.');return
    }
    if(!plantilla.secciones.every(s=>s.titulo.trim()&&s.contenido.trim())){setError('Revise todos los títulos y contenidos.');return}
    if(!window.confirm('¿Confirma que revisó el documento y desea aprobar su versión inicial para este CEA?'))return
    setGuardando(true);setError('')
    try{
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','x-cea-nit':nitEmpresa},body:JSON.stringify({tipo,...datos,...plantilla})})
      const d=await r.json()
      if(!r.ok||!d.ok)throw Error(d.error||'No fue posible aprobar.')
      window.location.reload()
    }catch(e){setError(e.message)}finally{setGuardando(false)}
  }
  if(!plantilla)return error?<p role="alert" className="my-2 rounded border border-red-300 bg-red-50 p-3 text-sm">{error}</p>:null
  return <>
    {!abierto&&<button type="button" className="my-3 rounded-lg border border-teal-600 bg-white px-4 py-2 text-sm font-bold text-teal-900" onClick={()=>setAbierto(true)}>Revisar y aprobar plantilla inicial de {TITULOS[tipo]}</button>}
    {abierto&&<div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 p-3">
      <section role="dialog" aria-modal="true" aria-label={'Plantilla inicial de '+TITULOS[tipo]} className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="bg-sky-900 px-5 py-4 text-white"><h2 className="text-lg font-bold">Plantilla inicial de {TITULOS[tipo]} — Pendiente de aprobación</h2><p className="mt-1 text-sm">Este contenido es un borrador editable. Nada se guardará hasta aprobarlo.</p></header>
        <div className="space-y-5 overflow-y-auto p-5">
          {error&&<p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['nombre_documento','Nombre del documento','text'],
              ['codigo','Código (opcional)','text'],
              ['version','Versión','text'],
              ['fecha_edicion','Fecha de elaboración','date'],
              ['vigencia','Fecha de vigencia / publicación','date']
            ].map(([k,t,tipoCampo])=><label key={k} className={label}>{t}<input className={control+' mt-1 font-normal normal-case'} type={tipoCampo} value={datos[k]} onChange={e=>campo(k,e.target.value)}/></label>)}
          </div>
          <h3 className="font-bold text-slate-900">Secciones del documento</h3>
          {plantilla.secciones.map((s,i)=><div key={i} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className={label}>Sección {i+1}<input className={control+' mt-1 font-bold'} value={s.titulo} onChange={e=>seccion(i,'titulo',e.target.value)}/></label>
            <label className={label}>Contenido<textarea rows={6} className={control+' mt-1 leading-relaxed'} value={s.contenido} onChange={e=>seccion(i,'contenido',e.target.value)}/></label>
          </div>)}
          {tipo==='AUTORIZACION_DATOS_CEA'&&<>
            <h3 className="font-bold text-slate-900">Configuración general</h3>
            {GENERAL.map(([k,t])=><label key={k} className={label}>{t}{k.startsWith('texto_')?<textarea rows={4} className={control+' mt-1 font-normal normal-case'} value={plantilla.configuracion[k]||''} onChange={e=>general(k,e.target.value)}/>:<input className={control+' mt-1 font-normal normal-case'} value={plantilla.configuracion[k]||''} onChange={e=>general(k,e.target.value)}/>}</label>)}
            <h3 className="font-bold text-slate-900">Finalidades de autorización</h3>
            {plantilla.finalidades.map((f,i)=><div key={i} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_2fr]"><label className={label}>Código<input className={control+' mt-1'} value={f.codigo} onChange={e=>finalidad(i,'codigo',e.target.value)}/></label><label className={label}>Descripción<textarea className={control+' mt-1'} rows={3} value={f.descripcion} onChange={e=>finalidad(i,'descripcion',e.target.value)}/></label></div>)}
          </>}
        </div>
        <footer className="flex justify-end gap-3 border-t p-4"><button type="button" className="rounded-lg border px-4 py-2 text-sm font-bold" disabled={guardando} onClick={()=>{setAbierto(false);setError('')}}>Cerrar sin aprobar</button><button type="button" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={guardando} onClick={aprobar}>{guardando?'Guardando...':'Aprobar y guardar versión inicial'}</button></footer>
      </section>
    </div>}
  </>
}
