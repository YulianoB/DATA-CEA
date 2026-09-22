// app/actualizar-contrasena/page.js
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { mostrarExito, mostrarError } from '@/lib/ui/toast'

export default function ActualizarContrasenaPage() {
  const searchParams = useSearchParams()
  const nit = searchParams.get('nit') || ''

  const [supabase, setSupabase] = useState(null)
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmarPassword, setShowConfirmarPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cargandoEmpresa, setCargandoEmpresa] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    cargarEmpresa()
  }, [])

  const cargarEmpresa = async () => {
    try {
      if (!nit) {
        throw new Error('El enlace no contiene el CEA de recuperación.')
      }

      const res = await fetch(`/api/empresas/${encodeURIComponent(nit)}`)
      const json = await res.json()

      if (json.status !== 'success') {
        throw new Error(json.message || 'No fue posible cargar el CEA.')
      }

      const empresa = json.empresa

      if (!empresa?.supabase_url || !empresa?.supabase_anon_key) {
        throw new Error('El CEA no tiene configuración de Supabase completa.')
      }

      setEmpresaNombre(empresa.nombre || '')
      setSupabase(createClient(empresa.supabase_url, empresa.supabase_anon_key))
    } catch (err) {
      console.error(err)
      const msg = err.message || 'No fue posible cargar la configuración del CEA.'
      setError(msg)
      mostrarError(msg)
    } finally {
      setCargandoEmpresa(false)
    }
  }

  const actualizarPassword = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    if (!supabase) {
      const msg = 'No se ha cargado la conexión del CEA.'
      setError(msg)
      mostrarError(msg)
      return
    }

    if (!password || !confirmarPassword) {
      const msg = 'Debe ingresar y confirmar la nueva contraseña.'
      setError(msg)
      mostrarError(msg)
      return
    }

    if (password.length < 8) {
      const msg = 'La contraseña debe tener mínimo 8 caracteres.'
      setError(msg)
      mostrarError(msg)
      return
    }

    if (password !== confirmarPassword) {
      const msg = 'Las contraseñas no coinciden.'
      setError(msg)
      mostrarError(msg)
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      const msg = 'Contraseña actualizada correctamente. Ya puede iniciar sesión.'
      setMensaje(msg)
      mostrarExito(msg)

      setPassword('')
      setConfirmarPassword('')
    } catch (err) {
      console.error(err)
      const msg =
        err.message ||
        'No fue posible actualizar la contraseña. Solicite un nuevo enlace de recuperación.'
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
          Actualizar contraseña
        </h1>

        <p className="mt-2 text-sm text-gray-600 text-center">
          {empresaNombre
            ? `CEA: ${empresaNombre}`
            : 'Ingrese una nueva contraseña para su cuenta.'}
        </p>

        <form onSubmit={actualizarPassword} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Nueva contraseña
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
                placeholder="Repita la nueva contraseña"
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
            disabled={loading || cargandoEmpresa || !supabase}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:bg-gray-400 text-white font-bold py-2 rounded-md transition"
          >
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
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