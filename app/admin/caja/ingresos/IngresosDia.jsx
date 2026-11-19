'use client'

import {useCallback,useEffect,useMemo,useState} from 'react'
import {
  ESTILO_SECCIONES, ESTILO_ENCABEZADO_TABLA, ESTILO_CELDAS_TABLA,
  MarcoTabla, BotonActualizar,
} from '@/components/admin/EstiloModulo'

const hoy=()=>new Intl.DateTimeFormat('sv-SE',{
  timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'
}).format(new Date())
const moneda=v=>new Intl.NumberFormat('es-CO',{
  style:'currency',currency:'COP',maximumFractionDigits:0
}).format(Number(v)||0)
const fecha=v=>v?String(v).slice(0,10).split('-').reverse().join('/'):'—'

export default function IngresosDia({nit,onVolver}){
  const [datos,setDatos]=useState(null)
  const [cargando,setCargando]=useState(false)
  const [error,setError]=useState('')
  const consultar=useCallback(async()=>{
    if(!nit)return
    setCargando(true)
    setError('')
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

  const recibos=useMemo(()=>(datos?.movimientos||[])
    .filter(m=>m.tipo_movimiento==='INGRESO'),[datos])
  const activos=recibos.filter(m=>m.estado==='ACTIVO')
  const total=activos.reduce((s,m)=>s+Number(m.valor||0),0)
  const medios=Object.entries(activos.reduce((a,m)=>{
    const n=m.medio_pago?.nombre||'SIN IDENTIFICAR'
    a[n]=(a[n]||0)+Number(m.valor||0)
    return a
  },{}))

  return <MarcoTabla className="mb-3">
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
      style={{backgroundColor:ESTILO_SECCIONES.fondo,color:ESTILO_SECCIONES.texto}}>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Vistas de ingresos">
        <button type="button" role="tab" aria-selected={false} onClick={onVolver}
          className="rounded-md border border-white/40 px-3 py-2 text-[11px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-md">
          <i className="fas fa-users mr-2"/>Obligaciones de aprendices
        </button>
        <button type="button" role="tab" aria-selected={true}
          className="rounded-md border border-white/50 bg-white px-3 py-2 text-[11px] font-black text-[#194567] shadow-sm">
          <i className="fas fa-receipt mr-2"/>Ingresos del día
        </button>
        <span className="text-[10px] text-blue-100">{fecha(hoy())}</span>
      </div>
      <BotonActualizar type="button" disabled={cargando} onClick={consultar}
        className="!px-3 !py-1.5 !text-[10px]">
        <i className={`fas fa-sync-alt ${cargando?'fa-spin':''}`}/>
        {cargando?'Actualizando...':'Actualizar'}
      </BotonActualizar>
    </div>
    {error&&<p role="alert" className="m-3 rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>}
    <div className="flex flex-wrap gap-3 border-b border-slate-200 p-3">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <p className="text-[10px] text-slate-600">Total ingresos activos</p>
        <p className="text-lg font-black text-[#194567]">{moneda(total)}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <p className="text-[10px] text-slate-600">Recibos activos</p>
        <p className="text-lg font-black text-[#194567]">{activos.length}</p>
      </div>
      {medios.map(([m,v])=><div key={m} className="rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <p className="text-[10px] text-slate-600">{m}</p>
        <p className="text-lg font-bold text-[#194567]">{moneda(v)}</p>
      </div>)}
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] border-collapse text-[10px] xl:text-xs">
        <thead style={{backgroundColor:ESTILO_ENCABEZADO_TABLA.fondo,color:ESTILO_ENCABEZADO_TABLA.texto}}>
          <tr>{['Hora','Recibo','Cliente / pagador','Concepto / detalle','Medio','Estado','Valor'].map(x=>
            <th key={x} className="border px-3 py-2 text-left">{x}</th>)}</tr>
        </thead>
        <tbody>{recibos.length?recibos.map(x=><tr key={x.id}
          className="transition-colors hover:bg-slate-50"
          style={{backgroundColor:ESTILO_CELDAS_TABLA.fondo}}>
          <td className="border px-3 py-2 whitespace-nowrap">{x.created_at?new Intl.DateTimeFormat('es-CO',{
            timeZone:'America/Bogota',hour:'2-digit',minute:'2-digit'
          }).format(new Date(x.created_at)):'—'}</td>
          <td className="border px-3 py-2 font-bold">{x.referencia_pago||x.id}</td>
          <td className="border px-3 py-2">{x.nombre_cliente||x.nombre_pagador||x.documento_cliente||x.documento||'—'}</td>
          <td className="border px-3 py-2">
            <strong>{x.concepto?.nombre||x.descripcion||'—'}</strong>
            {x.observaciones&&<div className="mt-1 whitespace-pre-wrap break-words text-slate-600">{x.observaciones}</div>}
          </td>
          <td className="border px-3 py-2">{x.medio_pago?.nombre||'—'}</td>
          <td className="border px-3 py-2">{x.estado||'—'}</td>
          <td className="border px-3 py-2 text-right font-bold whitespace-nowrap">{moneda(x.valor)}</td>
        </tr>):<tr><td colSpan={7} className="border p-8 text-center text-slate-500">
          {cargando?'Consultando ingresos...':'No hay ingresos registrados hoy.'}
        </td></tr>}</tbody>
      </table>
    </div>
  </MarcoTabla>
}
