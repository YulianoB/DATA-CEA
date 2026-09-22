'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wrench, RefreshCw, Search, CalendarDays, X, AlertTriangle,
  CheckCircle2, Clock3, RotateCcw, Gauge, CarFront, LoaderCircle,
} from 'lucide-react'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import { cerrarSesion } from '@/lib/auth/logout'

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
const MOTIVOS_GESTION = [
  'ANTICIPACIÓN POR MAYOR RECORRIDO',
  'REPROGRAMACIÓN POR MENOR RECORRIDO',
  'VEHÍCULO FUERA DE SERVICIO',
  'INDISPONIBILIDAD DE TALLER / PROVEEDOR',
  'VENCIMIENTO DE LA PROGRAMACIÓN',
  'OTRO',
]

function texto(v){ return String(v ?? '').trim() }
function numero(v){ const n=Number(v); return Number.isFinite(n)?n:null }
function km(v){ const n=numero(v); return n===null?'—':`${Math.round(n).toLocaleString('es-CO')} km` }
function obtenerUsuario(){
  try { const raw=localStorage.getItem('currentUser')||sessionStorage.getItem('currentUser'); return raw?JSON.parse(raw):null } catch { return null }
}
function obtenerNit(u){ return texto(u?.nitEmpresa||u?.nit_empresa||u?.nit||u?.empresaNit||u?.empresa_nit) }
function estadoCelda(c){
  if(!c || !c.total) return 'VACIO'
  return texto(c.estado).toUpperCase() || 'PROGRAMADO'
}
function claseEstado(e){
  if(e==='EJECUTADO') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if(e==='VENCIDO') return 'border-red-200 bg-red-50 text-red-800'
  if(e==='PARCIAL') return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-blue-200 bg-blue-50 text-blue-800'
}

export default function PlanMantenimientoPage(){
  const router=useRouter()
  const [currentUser,setCurrentUser]=useState(null)
  const [data,setData]=useState(null)
  const [cargando,setCargando]=useState(true)
  const [procesando,setProcesando]=useState(false)
  const [error,setError]=useState('')
  const [mensaje,setMensaje]=useState('')
  const [buscar,setBuscar]=useState('')
  const [vigencia,setVigencia]=useState(new Date().getFullYear())
  const [modal,setModal]=useState(null)
  const [form,setForm]=useState({nuevo_mes:'',nueva_vigencia:'',motivo:'',justificacion:''})


  useEffect(()=>{ setCurrentUser(obtenerUsuario()) },[])

  const cargar=useCallback(async()=>{
    const u=obtenerUsuario(); const nit=obtenerNit(u)
    if(!nit){ setError('No fue posible identificar el NIT del CEA en la sesión actual.'); setCargando(false); return }
    setCargando(true); setError('')
    try{
      const r=await fetch(`/api/admin/mantenimientos/plan-mantenimiento?vigencia=${vigencia}`,{headers:{'x-cea-nit':nit},credentials:'include',cache:'no-store'})
      const j=await r.json().catch(()=>({}))
      if(!r.ok || j?.status==='failed') throw new Error(j?.message||'No fue posible cargar el plan de mantenimiento.')
      setData(j)
    }catch(e){ setError(e.message||'Error cargando el plan.') }
    finally{ setCargando(false) }
  },[vigencia])

  useEffect(()=>{ cargar() },[cargar])

  const vehiculos=useMemo(()=>{
    const q=buscar.trim().toUpperCase()
    const arr=Array.isArray(data?.vehiculos)?data.vehiculos:[]
    if(!q) return arr
    return arr.filter(x=>[x?.vehiculo?.placa,x?.vehiculo?.marca,x?.vehiculo?.linea,x?.vehiculo?.modelo].some(v=>texto(v).toUpperCase().includes(q)))
  },[data,buscar])

  async function post(body){
    const u=obtenerUsuario(); const nit=obtenerNit(u)
    if(!nit){ setError('No fue posible identificar el NIT del CEA en la sesión actual.'); return }
    setProcesando(true); setError(''); setMensaje('')
    try{
      const r=await fetch('/api/admin/mantenimientos/plan-mantenimiento',{
        method:'POST',headers:{'Content-Type':'application/json','x-cea-nit':nit},credentials:'include',cache:'no-store',
        body:JSON.stringify({...body,responsable:texto(u?.nombre||u?.nombres||u?.nombreCompleto),documento_responsable:texto(u?.documento||u?.cedula)})
      })
      const respuesta=await r.text()
      let j={}
      try{ j=respuesta?JSON.parse(respuesta):{} }catch{ throw new Error(respuesta||`Respuesta no válida de la API (${r.status}).`) }
      if(!r.ok || j?.status==='failed') throw new Error(j?.message||j?.error||'No fue posible completar la operación.')

      if(body?.accion==='GENERAR_PLAN'){
        const creadas=Number(j?.creadas??0)
        const omitidas=Array.isArray(j?.omitidas)?j.omitidas:[]
        const detalle=omitidas.length?` Vehículos omitidos: ${omitidas.map(x=>`${x.placa||x.vehiculo_id}: ${x.motivo||'sin detalle'}`).join(' · ')}`:''
        setMensaje(j?.message||`Plan generado. Programaciones creadas: ${creadas}.${detalle}`)
      }else setMensaje(j?.message||'Operación realizada correctamente.')

      await cargar(); setModal(null); setForm({nuevo_mes:'',nueva_vigencia:'',motivo:'',justificacion:''})
    }catch(e){ setError(e.message||'Error procesando la solicitud.') }
    finally{ setProcesando(false) }
  }

  function abrirMes(v,mes){
    const celda=v?.meses?.[mes]||{total:0,actividades:[]}
    setModal({tipo:'MES',vehiculo:v,mes,celda})
  }
  function abrirGestion(a,v,mes){
    setForm({nuevo_mes:'',nueva_vigencia:String(a?.vigencia||vigencia),motivo:'',justificacion:''}); setModal({tipo:'GESTION',actividad:a,vehiculo:v,mes})
  }


  function gruposFrecuencia(actividades){
    const mapa=new Map()
    for(const a of actividades||[]){
      const f=numero(a.frecuencia_km)
      const k=f===null?'SIN_FRECUENCIA':f
      if(!mapa.has(k)) mapa.set(k,[])
      mapa.get(k).push(a)
    }
    return [...mapa.entries()]
      .sort((a,b)=>{
        if(a[0]==='SIN_FRECUENCIA') return 1
        if(b[0]==='SIN_FRECUENCIA') return -1
        return Number(a[0])-Number(b[0])
      })
      .map(([frecuencia,items])=>({frecuencia,items}))
  }

  return <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 p-3 md:p-5">
    <div className="mx-auto max-w-[1550px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <EncabezadoModulo
        icono={Wrench}
        titulo="PLAN DE MANTENIMIENTO"
        subtitulo="Matriz anual de programación preventiva por vehículo"
        currentUser={currentUser}
        permitirPersonalizacion={false}
        rutaRegreso="/admin/mantenimientos"
        textoRegreso="Mantenimiento Vehicular"
        onVolver={()=>router.push('/admin/mantenimientos')}
        onCerrarSesion={()=>cerrarSesion(router)}
      />

      <main className="p-4 md:p-5">
        {error && <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle size={18}/><span>{error}</span></div>}
        {mensaje && <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 size={18}/><span>{mensaje}</span></div>}

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Resumen titulo="Vehículos" valor={data?.resumen?.vehiculos ?? 0} texto="Plan finalizado" />
          <Resumen titulo="Programadas" valor={data?.resumen?.programadas ?? 0} texto="Obligaciones vigentes" />
          <Resumen titulo="Ejecutadas" valor={data?.resumen?.ejecutadas ?? 0} texto="Acreditadas automáticamente" />
          <Resumen titulo="Vencidas" valor={data?.resumen?.vencidas ?? 0} texto="Requieren gestión" />
        </div>

        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={18}/><input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar por placa, marca, línea o modelo..." className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-slate-500"/></div>
          <select value={vigencia} onChange={e=>setVigencia(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
            {(data?.vigencias_disponibles||[vigencia]).map(anio=><option key={anio} value={anio}>{anio}</option>)}
          </select>
          <button onClick={cargar} disabled={cargando} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-900 disabled:opacity-60"><RefreshCw size={17} className={cargando?'animate-spin':''}/>Actualizar</button>
          <button onClick={()=>post({accion:'GENERAR_PLAN',vigencia})} disabled={procesando} className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-md disabled:translate-y-0 disabled:opacity-60">{procesando?<LoaderCircle size={17} className="animate-spin"/>:<CalendarDays size={17}/>} {procesando?'Generando plan...':'Generar / completar plan'}</button>
        </div>

        {cargando ? <div className="flex min-h-52 items-center justify-center gap-2 text-slate-500"><LoaderCircle className="animate-spin"/>Cargando matriz...</div> :
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[1450px] border-collapse text-[11px]">
            <thead><tr className="bg-slate-400 text-slate-900">
              <th className="sticky left-0 z-30 w-[190px] min-w-[190px] border-b border-r border-slate-300 bg-slate-400 px-3 py-2.5 text-center text-[10px] font-bold">VEHÍCULO</th>
              <th className="sticky left-[190px] z-30 w-[110px] min-w-[110px] border-b border-r border-slate-300 bg-slate-400 px-2 py-2.5 text-center text-[10px] font-bold">PROM. MENSUAL</th>
              <th className="sticky left-[300px] z-30 w-[110px] min-w-[110px] border-b border-r border-slate-300 bg-slate-400 px-2 py-2.5 text-center text-[10px] font-bold">KM ACTUAL</th>
              {MESES.map(m=><th key={m} className="min-w-[90px] border-b border-l border-slate-300 bg-slate-400 px-2 py-2.5 text-center text-[10px] font-bold">{m}</th>)}
            </tr></thead>
            <tbody>
              {vehiculos.map(v=><tr key={v.vehiculo.id} className="border-t border-slate-200 align-middle hover:bg-slate-50">
                <td className="sticky left-0 z-20 w-[190px] min-w-[190px] border border-slate-300 bg-white px-3 py-3">
                  <div className="flex items-center gap-2"><CarFront size={20} className="text-slate-600"/><div><div className="font-bold text-slate-900">{v.vehiculo.placa}</div><div className="text-[11px] text-slate-500">{[v.vehiculo.marca,v.vehiculo.linea].filter(Boolean).join(' ')}</div><div className="mt-1 text-[10px] text-slate-400">{v.configuraciones_activas ?? 0} actividades</div></div></div>
                </td>
                <td className="sticky left-[190px] z-20 w-[110px] min-w-[110px] border border-slate-300 bg-white px-2 py-3 text-center font-semibold text-slate-700">{km(v?.kilometraje?.promedio_km_mes)}</td>
                <td className="sticky left-[300px] z-20 w-[110px] min-w-[110px] border border-slate-300 bg-white px-2 py-3 text-center"><div className="font-semibold text-slate-800">{km(v?.kilometraje?.ultimo_km)}</div><div className="text-[10px] text-slate-400">{v?.kilometraje?.ultima_fecha || '—'}</div></td>
                {MESES.map(m=>{ const c=v?.meses?.[m]; const e=estadoCelda(c); return <td key={m} className="border border-slate-300 px-1.5 py-2 text-center">
                  {e==='VACIO' ? <span className="text-slate-300">—</span> : <button onClick={()=>abrirMes(v,m)} className={`w-full rounded-lg border px-1 py-2 text-[10px] font-bold ${claseEstado(e)}`}><div>{e}</div><div className="mt-0.5 font-normal">{c.total} act.</div>{e==='PARCIAL'&&<div>{c.ejecutadas}/{c.total}</div>}</button>}
                </td>})}
              </tr>)}
              {!vehiculos.length && <tr><td colSpan={15} className="py-12 text-center text-sm text-slate-500">No hay vehículos para mostrar en el plan.</td></tr>}
            </tbody>
          </table>
        </div>}

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600"><b>Regla de ejecución:</b> esta pantalla no permite marcar mantenimientos como ejecutados. El estado EJECUTADO se acredita automáticamente desde los mantenimientos registrados. La gestión manual se limita a vencimientos y reprogramaciones, conservando la trazabilidad.</div>
      </main>
    </div>

    {modal?.tipo==='MES' && <Modal titulo={`${modal.vehiculo.vehiculo.placa} · ${modal.mes}`} cerrar={()=>setModal(null)}>
      <div className="mb-3 grid grid-cols-3 gap-2 text-xs"><Dato label="Km actual" value={km(modal.vehiculo?.kilometraje?.ultimo_km)}/><Dato label="Promedio mensual" value={km(modal.vehiculo?.kilometraje?.promedio_km_mes)}/><Dato label="Estado mes" value={estadoCelda(modal.celda)}/></div>
      {(modal.celda.actividades||[]).some(a=>a.estado!=='EJECUTADO')&&
        <div className="mb-3 flex justify-end">
          <button
            onClick={()=>abrirGestion((modal.celda.actividades||[]).find(a=>a.estado!=='EJECUTADO'),modal.vehiculo,modal.mes)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-md"
          >
            <RotateCcw size={14}/>Gestionar programación
          </button>
        </div>}
      <div className="space-y-3">
        {gruposFrecuencia(modal.celda.actividades||[]).map(grupo=>{
          const referencia=grupo.items[0]||{}
          return <section key={String(grupo.frecuencia)} className="overflow-hidden rounded-xl border border-slate-300">
            <div className="border-b border-slate-300 bg-slate-200 px-3 py-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-800">{grupo.frecuencia==='SIN_FRECUENCIA'?'ACTIVIDADES SIN FRECUENCIA':`ACTIVIDADES CON FRECUENCIA DE ${km(grupo.frecuencia)}`}</div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-600">
                    <span><b>Km objetivo:</b> {km(referencia.km_objetivo)}</span><span><b>Tolerancia:</b> ± {km(referencia.tolerancia_km)}</span><span><b>Ventana:</b> {km(referencia.ventana_desde_km)} – {km(referencia.ventana_hasta_km)}</span>
                  </div>
                </div>

              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {grupo.items.map(a=><div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900">{a.actividad}</div>
                  {a.accion&&<div className="text-[10px] text-slate-500">{a.accion}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${claseEstado(a.estado)}`}>{a.estado}</span>

                </div>
              </div>)}
            </div>
          </section>
        })}
        {!(modal.celda.actividades||[]).length&&<div className="py-8 text-center text-sm text-slate-500">No hay actividades en este mes.</div>}
      </div>
    </Modal>}

    {modal?.tipo==='GESTION' && <Modal titulo={`Gestionar programación · ${modal.vehiculo.vehiculo.placa}`} cerrar={()=>setModal(null)}>
      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5"><b>{modal.vehiculo.vehiculo.placa}</b> · Programación actual: {modal.mes} · Frecuencia: {km(modal.actividad.frecuencia_km)} · Objetivo: {km(modal.actividad.km_objetivo)} · Tolerancia: ± {km(modal.actividad.tolerancia_km)}<div className="mt-1 text-[10px] text-slate-500">La reprogramación se aplica al punto maestro completo y conserva la trazabilidad. Si ya se superó la ventana kilométrica, el incumplimiento original se conserva.</div></div>
      <label className="mb-1 block text-xs font-semibold text-slate-700">Motivo <span className="text-red-600">*</span></label>
      <select value={form.motivo} onChange={e=>setForm({...form,motivo:e.target.value})} className="mb-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none">
        <option value="">Seleccione un motivo...</option>
        {MOTIVOS_GESTION.map(m=><option key={m} value={m}>{m}</option>)}
      </select>
      {!form.motivo&&<div className="mb-3 text-[10px] font-medium text-red-600">* Campo obligatorio.</div>}

      <label className="mb-1 block text-xs font-semibold text-slate-700">Justificación <span className="text-red-600">*</span></label>
      <textarea value={form.justificacion} onChange={e=>setForm({...form,justificacion:e.target.value})} className="mb-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none" placeholder={form.motivo==='OTRO'?'Describa la razón de la gestión y el soporte correspondiente...':'Explique la situación concreta y el soporte de la gestión...'}/>
      {!texto(form.justificacion)&&<div className="mb-3 text-[10px] font-medium text-red-600">* Campo obligatorio.</div>}

      <div className="mb-1 text-xs font-semibold text-slate-700">Nuevo período del punto de control <span className="text-red-600">*</span></div>
      <div className="mb-1 grid grid-cols-2 gap-2">
        <select value={form.nueva_vigencia} onChange={e=>setForm({...form,nueva_vigencia:e.target.value})} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">Vigencia...</option>
          {Array.from({length:4},(_,i)=>new Date().getFullYear()-1+i).map(a=><option key={a} value={a}>{a}</option>)}
        </select>
        <select value={form.nuevo_mes} onChange={e=>setForm({...form,nuevo_mes:e.target.value})} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">Mes...</option>
          {MESES.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
        </select>
      </div>
      {(!form.nueva_vigencia||!form.nuevo_mes)&&<div className="mb-3 text-[10px] font-medium text-red-600">* Vigencia y mes son obligatorios para reprogramar.</div>}
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-600">
        Si el motivo es <b>ANTICIPACIÓN POR MAYOR RECORRIDO</b>, el destino debe ser anterior a la programación actual y no podrá ser anterior al mes inmediatamente anterior al mes en curso. Para los demás motivos, el destino debe ser posterior a la programación vigente.
      </div>

      <div className="flex justify-end gap-2">
        <button disabled={procesando||!form.motivo||!texto(form.justificacion)||!form.nueva_vigencia||!form.nuevo_mes} onClick={()=>post({accion:'REPROGRAMAR',programacion_id:modal.actividad.id,nueva_vigencia:Number(form.nueva_vigencia),nuevo_mes:Number(form.nuevo_mes),motivo:form.motivo,justificacion:form.justificacion})} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-40">
          {procesando?'Guardando...':'Reprogramar punto maestro'}
        </button>
      </div>
    </Modal>}
  </div>
}

function Resumen({titulo,valor,texto:sub}){ return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{titulo}</div><div className="mt-1 text-2xl font-bold text-slate-800">{valor}</div><div className="mt-1 text-xs text-slate-500">{sub}</div></div> }
function Dato({label,value}){ return <div className="rounded-lg bg-slate-50 px-2.5 py-2"><div className="text-[9px] font-bold uppercase text-slate-400">{label}</div><div className="mt-0.5 font-semibold text-slate-700">{value}</div></div> }
function Modal({titulo,cerrar,children}){ return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3"><div className="font-bold text-slate-800">{titulo}</div><button onClick={cerrar} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div><div className="p-4">{children}</div></div></div> }
