'use client'

import { useEffect, useState } from 'react'

export default function EmpresasMaster() {
  const [empresas, setEmpresas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [seleccion, setSeleccion] = useState(null)
  const [clave, setClave] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  async function cargar() {
    setCargando(true)
    try {
      const response = await fetch('/api/master/empresas', { cache: 'no-store' })
      if (!response.ok) throw new Error('No fue posible cargar las empresas.')
      const data = await response.json()
      setEmpresas(data.empresas || [])
      setError('')
    } catch (err) { setError(err.message) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  async function guardar(event) {
    event.preventDefault()
    if (!seleccion || !clave) return
    setGuardando(true)
    setMensaje('')
    try {
      const response = await fetch('/api/master/empresas/' + seleccion.id + '/clave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Error al guardar.')
      setClave('')
      setSeleccion(null)
      setMensaje('La credencial se guardó en Vault.')
      await cargar()
    } catch (err) { setMensaje(err.message) }
    finally { setGuardando(false) }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl bg-white p-6 shadow">
          <a href="/master" className="text-sm text-blue-700">← Panel Master</a>
          <h1 className="mt-3 text-2xl font-bold">Empresas registradas</h1>
          <p className="mt-2 text-sm text-slate-600">Consulta y configuración de credenciales administrativas por CEA.</p>
        </div>
        {mensaje && <p role="status" className="rounded-lg bg-white p-4">{mensaje}</p>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {cargando ? <p>Cargando empresas...</p> :
          <div className="space-y-3">
            {empresas.map(empresa => (
              <div key={empresa.id} className="rounded-xl bg-white p-5 shadow">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{empresa.nombre}</h2>
                    <p className="text-sm text-slate-600">NIT: {empresa.nit} · Código: {empresa.codigo} · {empresa.nivel_cea}</p>
                    <p className="text-sm text-slate-600">Estado: {empresa.estado} · Vault: {empresa.clave_configurada ? 'Clave configurada' : 'Sin clave configurada'}</p>
                  </div>
                  <button onClick={() => { setSeleccion(empresa); setClave(''); setMensaje('') }}
                    className="rounded-lg bg-blue-800 px-4 py-2 text-white">
                    {empresa.clave_configurada ? 'Reemplazar clave' : 'Configurar clave'}
                  </button>
                </div>
              </div>
            ))}
            {!empresas.length && <p>No hay empresas registradas.</p>}
          </div>
        }
        {seleccion && (
          <form onSubmit={guardar} className="rounded-xl bg-white p-6 shadow space-y-4">
            <h2 className="text-lg font-semibold">Credencial Vault: {seleccion.nombre}</h2>
            <p className="text-sm text-slate-600">La clave no se mostrará después de guardarla. Reemplazarla invalidará el secreto anterior.</p>
            <label className="block text-sm font-medium">
              Service Role Key
              <input type="password" autoComplete="off" required value={clave} onChange={e => setClave(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 p-3" />
            </label>
            <div className="flex gap-3">
              <button disabled={guardando} type="submit" className="rounded-lg bg-blue-800 px-4 py-2 text-white disabled:opacity-60">
                {guardando ? 'Guardando...' : 'Guardar en Vault'}
              </button>
              <button type="button" onClick={() => { setSeleccion(null); setClave('') }} className="rounded-lg border px-4 py-2">Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
