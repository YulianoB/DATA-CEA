// app/registro/page.js

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { mostrarExito, mostrarError } from '@/lib/ui/toast'

export default function RegistroPage() {
  const [empresas, setEmpresas] = useState([])
  const [nit, setNit] = useState('')
  const [documento, setDocumento] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmarPassword, setShowConfirmarPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

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
      setError('No fue posible cargar la lista de CEA.')
      mostrarError('No fue posible cargar la lista de CEA.')
    } finally {
      setCargandoEmpresas(false)
    }
  }

  const validar = () => {
    if (!nit) return 'Seleccione el CEA.'
    if (!documento) return 'Ingrese su documento.'
    if (!email) return 'Ingrese el correo autorizado.'
    if (!password) return 'Ingrese una contraseña.'
    if (!confirmarPassword) return 'Confirme la contraseña.'

    if (!/^\d+$/.test(documento)) {
      return 'El documento solo debe contener números.'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'El correo no tiene un formato válido.'
    }

    if (password.length < 8) {
      return 'La contraseña debe tener mínimo 8 caracteres.'
    }

    if (password !== confirmarPassword) {
      return 'Las contraseñas no coinciden.'
    }

    return ''
  }

  const registrar = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    const mensajeValidacion = validar()
    if (mensajeValidacion) {
      setError(mensajeValidacion)
      mostrarError(mensajeValidacion)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nit,
          documento,
          email,
          password,
          confirmarPassword,
        }),
      })

      const json = await res.json()

      if (json.status !== 'success') {
        throw new Error(json.message || 'No fue posible registrar el usuario.')
      }

      setMensaje(json.message || 'Usuario registrado correctamente.')
      mostrarExito(json.message || 'Usuario registrado correctamente.')

      setDocumento('')
      setEmail('')
      setPassword('')
      setConfirmarPassword('')
    } catch (err) {
      console.error(err)
      setError(err.message || 'No fue posible registrar el usuario.')
      mostrarError(err.message || 'No fue posible registrar el usuario.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Registro de usuario
        </h1>

        <p className="mt-2 text-sm text-gray-600 text-center">
          Regístrese únicamente si ya fue preautorizado por administración.
        </p>

        <form onSubmit={registrar} className="mt-6 space-y-4">
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
              Documento
            </label>
            <input
              type="text"
              id="documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
              placeholder="Ingrese su número de documento"
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Correo autorizado
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
              placeholder="Correo registrado por administración"
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Contraseña
            </label>
            <div className="flex items-center border rounded">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full p-2 rounded focus:outline-none"
                required
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer px-3 select-none text-gray-500"
              >
                👁️
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="confirmarPassword" className="block text-sm font-medium mb-1">
              Confirmar contraseña
            </label>
            <div className="flex items-center border rounded">
              <input
                type={showConfirmarPassword ? 'text' : 'password'}
                id="confirmarPassword"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repita la contraseña"
                className="w-full p-2 rounded focus:outline-none"
                required
              />
              <span
                onClick={() => setShowConfirmarPassword(!showConfirmarPassword)}
                className="cursor-pointer px-3 select-none text-gray-500"
              >
                👁️
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || cargandoEmpresas}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:bg-gray-400 text-white font-bold py-2 rounded-md transition"
          >
            {loading ? 'Registrando...' : 'Registrarme'}
          </button>
        </form>

        {mensaje && <p className="mt-4 text-center text-green-700">{mensaje}</p>}
        {error && <p className="mt-4 text-center text-red-600">{error}</p>}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-[var(--primary)] hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}