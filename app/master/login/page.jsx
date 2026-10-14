'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginMaster() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function ingresar(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/master/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'No fue posible ingresar.')
      router.replace('/master')
      router.refresh()
    } catch (err) {
      setError(err.message || 'Error de acceso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form onSubmit={ingresar} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">DATA CEA — Master</h1>
          <p className="text-sm text-slate-600 mt-2">Acceso exclusivo del administrador central</p>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Correo electrónico
          <input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-slate-900" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Contraseña
          <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-slate-900" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-800 p-3 font-semibold text-white disabled:opacity-60">
          {loading ? 'Validando...' : 'Ingresar al Panel Master'}
        </button>
      </form>
    </main>
  )
}
