'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { mostrarExito, mostrarError } from '@/lib/ui/toast'

export default function LoginPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password: contrasena }),
      })

      const json = await res.json()

      if (json.status === 'success') {
        const rol = (json.rol || '').toUpperCase()
        localStorage.setItem('currentUser', JSON.stringify(json))

        // Toast de bienvenida (se mantiene tras navegar porque el Toaster está en el layout)
        const nombre = json.nombreCompleto || json.usuario || 'Bienvenido'
        mostrarExito(`${nombre} • ingreso exitoso`)

        if (rol === 'INSTRUCTOR TEORÍA') {
          router.push('/instructor/teoria')
        } else if (rol === 'AUXILIAR ADMINISTRATIVO') {
          router.push('/instructor/teoria')
        } else if (rol === 'INSTRUCTOR PRÁCTICA') {
          router.push('/instructor/practica')
        } else if (rol === 'ADMINISTRATIVO') {
          router.push('/admin')
        } else if (rol === 'SUPERUSUARIO') {
          router.push('/superusuario')
        } else {
          router.push('/dashboard')
        }
      } else {
        const msg = json.message || 'Usuario o contraseña incorrectos'
        setError(msg)
        mostrarError(msg)
      }
    } catch (err) {
      console.error(err)
      setError('Error al conectar con el servidor')
      mostrarError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Intro */}
      <div className="flex-1 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white flex flex-col items-center justify-center p-10">
        <div
          className="absolute bottom-0 left-0 w-80 h-80 opacity-40"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(143, 213, 244, 0.5) 1px, transparent 1px),
              linear-gradient(to top, rgba(9, 241, 164, 0.5) 1px, transparent 1px)`,
            backgroundSize: '8px 8px',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-92 h-92 opacity-40 rounded-full overflow-hidden"
          style={{
            backgroundImage: `
              repeating-radial-gradient(
                circle at bottom left,
                rgba(143, 213, 244, 0.4) 0px,
                rgba(143, 213, 244, 0.4) 1px,
                transparent 1px,
                transparent 12px
              ),
              repeating-radial-gradient(
                circle at bottom left,
                rgba(9, 241, 164, 0.3) 0px,
                rgba(9, 241, 164, 0.3) 2px,
                transparent 2px,
                transparent 20px
              )
            `,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
          }}
        />

        <div className="mb-2">
          <Image src="/logo.png" alt="Logo DATA CEA" width={300} height={300} priority />
        </div>

        <h1 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
          Sistema de Registro y Control de Datos para <br />
          Centros de Enseñanza Automovilística
        </h1>

        <p className="text-sm sm:text-sm max-w-lg text-justify">
          Permite registrar y controlar horarios laborales, inspecciones preoperacionales,
          mantenimientos, fallas y siniestros viales. Facilita gestionar documentos
          de vehículos e instructores, programar reuniones, capacitaciones y clases
          prácticas, así como registrar matrículas de aprendices. Adicionalmente,
          posibilita generar reportes e indicadores para apoyar el envío de información
          a la plataforma SISI de la Superintendencia de Transporte.
        </p>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center bg-gray-100 p-8">
        <div className="w-full max-w-md bg-white shadow-2xl rounded-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Iniciar Sesión</h2>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="usuario" className="block text-sm font-medium mb-1">
                Usuario
              </label>
              <input
                type="text"
                id="usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ingrese su usuario"
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              />
            </div>

            <div>
              <label htmlFor="contrasena" className="block text-sm font-medium mb-1">
                Contraseña
              </label>
              <div className="flex items-center border rounded">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="contrasena"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Ingrese su contraseña"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-bold py-2 rounded-md transition"
            >
              {loading ? 'Ingresando...' : 'Entrar'}
            </button>
          </form>

          {/* Puedes mantener este mensaje por accesibilidad, aunque ya usamos toasts */}
          {error && <p className="text-red-600 text-center mt-4">{error}</p>}

          <div className="mt-6 text-center space-y-2">
            <a href="#" className="text-[var(--primary)] hover:underline">
              Registrarse
            </a>
            <br />
            <a href="#" className="text-[var(--primary)] hover:underline">
              Recuperar usuario o contraseña
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
