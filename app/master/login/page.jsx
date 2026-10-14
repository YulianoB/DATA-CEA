'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginMaster() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mostrar, setMostrar] = useState(false)

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
      if (!response.ok) {
        setError(data.message || 'No fue posible ingresar.')
        return
      }
      router.replace('/master')
      router.refresh()
    } catch {
      setError('No fue posible conectar con el servidor. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      <section className="flex-1 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white flex flex-col items-center justify-center p-10 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 w-80 h-80 opacity-40 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(143, 213, 244, 0.5) 1px, transparent 1px), linear-gradient(to top, rgba(9, 241, 164, 0.5) 1px, transparent 1px)',
            backgroundSize: '8px 8px',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 w-92 h-92 opacity-40 rounded-full pointer-events-none"
          style={{
            backgroundImage: 'repeating-radial-gradient(circle at bottom left, rgba(143, 213, 244, 0.4) 0px, rgba(143, 213, 244, 0.4) 1px, transparent 1px, transparent 12px), repeating-radial-gradient(circle at bottom left, rgba(9, 241, 164, 0.3) 0px, rgba(9, 241, 164, 0.3) 2px, transparent 2px, transparent 20px)',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
          }}
        />
        <div className="mb-2 z-10">
          <Image src="/logo.png" alt="Logo DATA CEA" width={300} height={300} priority style={{ width: 'auto', height: 'auto' }} />
        </div>
        <h1 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent z-10">
          Administración Central de DATA CEA
        </h1>
        <p className="text-sm max-w-lg text-justify z-10">
          Entorno centralizado para administrar los Centros de Enseñanza Automovilística
          afiliados, gestionar su información institucional y configurar de forma
          segura las conexiones de cada empresa.
        </p>
        <div className="z-10 mt-6 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide">
          ACCESO EXCLUSIVO MASTER
        </div>
      </section>

      <section className="flex-1 flex items-center justify-center bg-gray-100 p-8">
        <div className="w-full max-w-md bg-white shadow-2xl rounded-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">Iniciar sesión</h2>
          <p className="text-sm text-center text-gray-500 mb-6">Administrador central · DATA CEA</p>
          <form className="space-y-4" onSubmit={ingresar}>
            <label htmlFor="master-email" className="block text-sm font-medium text-gray-800">
              Correo electrónico
              <input
                id="master-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Ingrese su correo"
                className="mt-1 w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </label>
            <label htmlFor="master-password" className="block text-sm font-medium text-gray-800">
              Contraseña
              <div className="mt-1 flex items-center border rounded focus-within:ring-2 focus-within:ring-[var(--primary)]">
                <input
                  id="master-password"
                  type={mostrar ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  className="w-full p-2 rounded focus:outline-none"
                />
                <button type="button" onClick={() => setMostrar(!mostrar)} aria-label={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="px-3 text-gray-500">
                  {mostrar ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </label>
            <button type="submit" disabled={loading} className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-bold py-2 rounded-md transition disabled:bg-gray-400">
              {loading ? 'Ingresando...' : 'Entrar al Panel Master'}
            </button>
          </form>
          {error && <p role="alert" className="text-red-600 text-center mt-4">{error}</p>}
          <p className="mt-6 text-center text-xs text-gray-500">Acceso reservado al administrador Master autorizado.</p>
        </div>
      </section>
    </main>
  )
}
