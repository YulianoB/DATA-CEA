'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { mostrarExito, mostrarError } from '@/lib/ui/toast'

function normalizarDocumento(valor) {
  return String(valor || '').trim().replace(/\D/g, '')
}

export default function RecuperarPage() {
  const [empresas, setEmpresas] = useState([])
  const [nit, setNit] = useState('')
  const [documento, setDocumento] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bloqueado, setBloqueado] = useState(false)
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true)

  useEffect(() => {
    cargarEmpresas()
  }, [])

  const cargarEmpresas = async () => {
    try {
      const res = await fetch('/api/empresas')
      const json = await res.json()

      if (json.status !== 'success') {
        throw new Error(json.message || 'No fue posible cargar los CEA.')
      }

      const lista = json.empresas || []
      setEmpresas(lista)

      if (lista.length === 1) {
        setNit(lista[0].nit)
      }
    } catch (err) {
      console.error(err)
      const msg = 'No fue posible cargar la lista de CEA.'
      setError(msg)
      mostrarError(msg)
    } finally {
      setCargandoEmpresas(false)
    }
  }

  const solicitarRecuperacion = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    const usuario = normalizarDocumento(documento)

    if (!nit) {
      const msg = 'Seleccione el CEA.'
      setError(msg)
      mostrarError(msg)
      return
    }

    if (!usuario) {
      const msg = 'Ingrese su usuario.'
      setError(msg)
      mostrarError(msg)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nit, documento: usuario }),
      })

      const json = await res.json()

      if (json.status !== 'success') {
        throw new Error(json.message || 'No fue posible enviar la recuperación.')
      }

      const msg = json.message || 'Se envió el enlace de recuperación.'
      setMensaje(msg)
      mostrarExito(msg)
      setBloqueado(true)

        setTimeout(() => {
        setBloqueado(false)
        }, 60000)
    } catch (err) {
      console.error(err)
      const msg = err.message || 'No fue posible enviar la recuperación.'
      setError(msg)
      mostrarError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Recuperar acceso
        </h1>

        <p className="mt-2 text-sm text-gray-600 text-center">
          Ingrese el CEA y su usuario. Enviaremos un enlace al correo autorizado.
        </p>

        <form onSubmit={solicitarRecuperacion} className="mt-6 space-y-4">
          <div>
            <label htmlFor="nit" className="block text-sm font-medium mb-1">
              CEA
            </label>
            <select
              id="nit"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              disabled={cargandoEmpresas}
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            >
              <option value="">
                {cargandoEmpresas ? 'Cargando CEA...' : 'Seleccione el CEA'}
              </option>

              {empresas.map((empresa) => (
                <option key={empresa.nit} value={empresa.nit}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="documento" className="block text-sm font-medium mb-1">
              Usuario
            </label>
            <input
              type="text"
              id="documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
              placeholder="Ingrese su usuario"
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || cargandoEmpresas || bloqueado}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:bg-gray-400 text-white font-bold py-2 rounded-md transition"
          >
            {loading
            ? 'Enviando...'
            : bloqueado
                ? 'Espere 60 segundos...'
                : 'Enviar enlace de recuperación'}
          </button>
        </form>

        {mensaje && <p className="mt-4 text-center text-green-700">{mensaje}</p>}
        {error && <p className="mt-4 text-center text-red-600">{error}</p>}

        <div className="mt-6 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          Si ya no tiene acceso al correo autorizado, o el buzón está lleno, debe solicitar a administración el cambio de correo.
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-[var(--primary)] hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}