'use client'

import { useEffect, useState } from 'react'

const ENDPOINT = '/api/admin/configuracion-autorizacion-personal'

export default function ConfiguracionAutorizacionPersonal() {
  const [versiones, setVersiones] = useState([])
  const [plantilla, setPlantilla] = useState('')
  const [empresa, setEmpresa] = useState(null)
  const [version, setVersion] = useState('1.0')
  const [contenido, setContenido] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [historica, setHistorica] = useState(null)

  async function cargar() {
    setCargando(true)
    try {
      const respuesta = await fetch(ENDPOINT, { cache: 'no-store' })
      const data = await respuesta.json()
      if (!respuesta.ok || !data.ok) throw new Error(data.mensaje || 'No se pudieron consultar las versiones.')
      setVersiones(data.versiones || [])
      setEmpresa(data.empresa || null)
      setPlantilla(data.plantilla || '')
      setContenido(actual => actual || data.plantilla || '')
    } catch (error) {
      setMensaje(error.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  async function publicar() {
    if (!window.confirm('¿Publicar esta versión? El contenido quedará archivado y no podrá editarse después.')) return
    setGuardando(true)
    setMensaje('')
    try {
      const respuesta = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, contenido }),
      })
      const data = await respuesta.json()
      if (!respuesta.ok || !data.ok) throw new Error(data.mensaje || 'No se pudo publicar la versión.')
      setMensaje('Versión publicada correctamente. El formulario público utilizará este texto.')
      setHistorica(null)
      await cargar()
    } catch (error) {
      setMensaje(error.message)
    } finally {
      setGuardando(false)
    }
  }

  const vigente = versiones.find(item => item.vigente)
  return <section className="space-y-5 rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
    <div className="border-b border-slate-200 pb-3">
      <h2 className="text-base font-bold text-[#194567]">Tratamiento de datos del personal</h2>
      <p className="mt-1 text-sm text-slate-600">Documento independiente de la autorización para aprendices. La identidad institucional y el encabezado corresponden a la configuración del CEA.</p>
      {empresa && <p className="mt-2 text-xs font-semibold text-slate-600">{empresa.nombre}{empresa.nit ? ' · NIT ' + empresa.nit : ''}</p>}
    </div>
    {mensaje && <p role="status" className="rounded border border-slate-300 bg-slate-50 p-3 text-sm">{mensaje}</p>}
    {cargando ? <p className="text-sm">Cargando documento...</p> : <>
      <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm">
        <strong>Versión vigente: </strong>{vigente ? vigente.version : 'Sin publicar'}
        <p className="mt-1 text-xs">Solo una versión publicada puede estar vigente. Las versiones anteriores se conservan íntegramente.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-sm font-semibold">Nueva versión
          <input value={version} onChange={e=>setVersion(e.target.value)} maxLength={30} className="mt-1 w-full rounded border border-slate-300 p-2" placeholder="1.0" />
        </label>
        <div className="flex items-end gap-2 sm:col-span-3">
          <button type="button" onClick={()=>setContenido(plantilla)} className="rounded border border-slate-300 px-3 py-2 text-sm">Restablecer plantilla base</button>
          {vigente && <button type="button" onClick={()=>setContenido(vigente.contenido)} className="rounded border border-slate-300 px-3 py-2 text-sm">Usar versión vigente como base</button>}
        </div>
      </div>
      <label className="block text-sm font-semibold">Contenido propuesto para publicar
        <textarea value={contenido} onChange={e=>setContenido(e.target.value)} rows={19} maxLength={30000} className="mt-2 w-full rounded border border-slate-300 p-3 font-mono text-xs leading-relaxed" />
      </label>
      <p className="text-xs text-amber-800">Antes de publicar, verifique la política institucional de tratamiento de datos y sus canales de atención. El documento se almacena una sola vez por versión en la base de datos de este CEA.</p>
      <button type="button" disabled={guardando || contenido.trim().length < 100} onClick={publicar} className="rounded bg-[#194567] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{guardando ? 'Publicando...' : 'Publicar nueva versión'}</button>
      <div className="border-t pt-4">
        <h3 className="text-sm font-bold text-[#194567]">Historial de versiones</h3>
        {!versiones.length ? <p className="mt-2 text-sm text-slate-600">Todavía no hay versiones publicadas.</p> : <div className="mt-2 space-y-2">{versiones.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 p-3 text-sm">
          <span>Versión {item.version} · {new Date(item.fecha_publicacion).toLocaleString('es-CO')}{item.vigente ? ' · Vigente' : ' · Histórica'}</span>
          <button type="button" className="text-[#194567] underline" onClick={()=>setHistorica(item)}>Consultar texto</button>
        </div>)}</div>}
      </div>
      {historica && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
        <section role="dialog" aria-modal="true" aria-label={'Documento versión '+historica.version} className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white p-5">
          <div className="flex justify-between gap-3"><h3 className="font-bold">Autorización del personal — Versión {historica.version}</h3><button type="button" onClick={()=>setHistorica(null)} className="rounded border px-3 py-1">Cerrar</button></div>
          <pre className="mt-3 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">{historica.contenido}</pre>
        </section>
      </div>}
    </>}
  </section>
}
