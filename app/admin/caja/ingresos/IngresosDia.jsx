'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
const hoy=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const dinero=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(v)||0)
const fecha=v=>v?String(v).slice(0,10).split('-').reverse().join('/'):'—'
export default function IngresosDia({nit}){
  const [datos,setDatos]=useState(null)
  const [cargando,setCargando]=useState(false)
  const [error,setError]=useState('')
  const consultar=useCallback(async()=>{
    if(!nit)return
    setCargando(true);setError('')
    try{
      const dia=hoy()
      const p=new URLSearchParams({nit,recurso:'movimientos_dia',fecha_inicio:dia,fecha_fin:dia})
      const r=await fetch('/api/admin/caja/cierre?'+p.toString(),{cache:'no-store'})
      const json=await r.json()
      if(!r.ok||json.status!=='success')throw new Error(json.message||'No fue posible consultar los ingresos.')
      setDatos(json.data)
    }catch(e){setError(e.message||'Error al consultar ingresos.')}
    finally{setCargando(false)}
  },[nit])
  useEffect(()=>{consultar()},[consultar])
  const recibos=useMemo(()=>(datos?.movimientos||[]).filter(m=>m.tipo_movimiento==='INGRESO'),[datos])
  const activos=recibos.filter(m=>m.estado==='ACTIVO')
  const total=activos.reduce((s,m)=>s+Number(m.valor||0),0)
  const medios=Object.entries(activos.reduce((a,m)=>{
    const n=m.medio_pago?.nombre||'SIN IDENTIFICAR'
    a[n]=(a[n]||0)+Number(m.valor||0);return a
  },{}))
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#24638C] px-4 py-3 text-white">
      <div><h2 className="text-sm font-black">Ingresos del día · {fecha(hoy())}</h2>
        <p className="text-[11px] text-blue-100">Recibos registrados hoy, sin tener que entrar a Cierre de Caja.</p></div>
      <button type="button" disabled={cargando} onClick={consultar} className="rounded-lg border border-white/40 px-4 py-2 text-xs font-bold hover:bg-white/10 disabled:opacity-50">{cargando?'Actualizando...':'Actualizar'}</button>
    </div>
    {error&&<p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>}
    <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"><p className="text-xs text-blue-800">Total ingresos activos</p><p className="text-xl font-black text-blue-950">{dinero(total)}</p></div>
      <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-600">Recibos activos</p><p className="text-xl font-black">{activos.length}</p></div>
      {medios.map(([m,v])=><div key={m} className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"><p className="text-xs text-emerald-900">{m}</p><p className="text-lg font-bold text-emerald-900">{dinero(v)}</p></div>)}
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-xs">
        <thead className="bg-cyan-100 text-slate-800"><tr>{['Hora','Recibo','Cliente / pagador','Concepto / detalle','Medio','Estado','Valor'].map(x=><th key={x} className="border border-slate-200 p-3">{x}</th>)}</tr></thead>
        <tbody>{recibos.length?recibos.map(x=><tr key={x.id} className="border-b border-slate-200 even:bg-slate-50">
          <td className="p-3 whitespace-nowrap">{x.created_at?new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',hour:'2-digit',minute:'2-digit'}).format(new Date(x.created_at)):'—'}</td>
          <td className="p-3 font-bold">{x.referencia_pago||x.id}</td>
          <td className="p-3">{x.nombre_cliente||x.nombre_pagador||x.documento_cliente||x.documento||'—'}</td>
          <td className="p-3"><strong>{x.concepto?.nombre||x.descripcion||'—'}</strong>{x.observaciones&&<div className="mt-1 whitespace-pre-wrap break-words text-slate-600">{x.observaciones}</div>}</td>
          <td className="p-3">{x.medio_pago?.nombre||'—'}</td><td className="p-3">{x.estado||'—'}</td>
          <td className="p-3 text-right font-bold whitespace-nowrap">{dinero(x.valor)}</td>
        </tr>):<tr><td colSpan={7} className="p-8 text-center text-slate-500">No hay ingresos registrados hoy.</td></tr>}</tbody>
      </table>
    </div>
  </section>
}
