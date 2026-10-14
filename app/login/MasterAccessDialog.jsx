'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MasterAccessDialog() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const correoRef = useRef(null)

  useEffect(() => {
    function teclas(event) {
      if (event.ctrlKey && event.altKey && !event.shiftKey && !event.metaKey && event.code === 'KeyM') {
        event.preventDefault()
        setAbierto(true)
      }
      if (event.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', teclas)
    return () => window.removeEventListener('keydown', teclas)
  }, [])

  useEffect(() => {
    if (abierto) correoRef.current?.focus()
    else { setClave(''); setError(''); setMostrar(false) }
  }, [abierto])

  async function ingresar(event) {
    event.preventDefault()
    setCargando(true)
    setError('')
    try {
      const response = await fetch('/api/master/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo.trim(), password: clave }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.message || 'No fue posible iniciar sesión.')
        return
      }
      setClave('')
      setAbierto(false)
      router.replace('/master')
      router.refresh()
    } catch {
      setError('No fue posible conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !cargando) setAbierto(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="master-dialog-title" className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
        <header className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-100">DATA CEA</p><h2 id="master-dialog-title" className="mt-1 text-xl font-bold">Acceso Administración Central</h2><p className="mt-1 text-sm text-white/80">Credenciales exclusivas del administrador Master</p></div>
            <button type="button" onClick={() => setAbierto(false)} disabled={cargando} aria-label="Cerrar acceso Master" className="rounded-lg px-2 py-1 text-xl hover:bg-white/15 disabled:opacity-50">×</button>
          </div>
        </header>
        <form onSubmit={ingresar} className="space-y-4 p-6">
          <label className="block text-sm font-medium">Correo electrónico
            <input ref={correoRef} type="email" required autoComplete="username" value={correo} onChange={e => setCorreo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </label>
          <label className="block text-sm font-medium">Contraseña
            <div className="mt-1 flex overflow-hidden rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-[var(--primary)]">
              <input type={mostrar ? 'text' : 'password'} required autoComplete="current-password" value={clave} onChange={e => setClave(e.target.value)} className="min-w-0 flex-1 p-3 outline-none" />
              <button type="button" onClick={() => setMostrar(!mostrar)} className="px-3 text-xs font-medium text-[var(--primary)]">{mostrar ? 'Ocultar' : 'Mostrar'}</button>
            </div>
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={cargando} className="w-full rounded-lg bg-[var(--primary)] px-4 py-3 font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">{cargando ? 'Validando…' : 'Ingresar al Panel Master'}</button>
        </form>
      </section>
    </div>
  )
}
