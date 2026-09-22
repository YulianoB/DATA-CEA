//app/login/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { mostrarExito, mostrarError } from '@/lib/ui/toast'

function normalizarDocumento(valor) {
  return String(valor || '').trim().replace(/\D/g, '')
}

function etiquetaRol(rol) {
  const normalizado = String(rol || '').toUpperCase()
  const etiquetas = {
    ADMINISTRATIVO: 'Administrativo',
    AUXILIAR_ADMINISTRATIVO: 'Auxiliar administrativo',
    INSTRUCTOR_TEORIA: 'Instructor teoría',
    INSTRUCTOR_PRACTICA: 'Instructor práctica',
    'AUXILIAR ADMINISTRATIVO': 'Auxiliar administrativo',
    'INSTRUCTOR TEORÍA': 'Instructor teoría',
    'INSTRUCTOR PRÁCTICA': 'Instructor práctica',
  }

  return etiquetas[normalizado] || rol
}

function rutaPorRol(rol) {
  const normalizado = String(rol || '').toUpperCase()

  if (normalizado === 'INSTRUCTOR TEORÍA' || normalizado === 'INSTRUCTOR_TEORIA') {
    return '/instructor/teoria'
  }

  if (normalizado === 'AUXILIAR ADMINISTRATIVO' || normalizado === 'AUXILIAR_ADMINISTRATIVO') {
    return '/instructor/teoria'
  }

  if (normalizado === 'INSTRUCTOR PRÁCTICA' || normalizado === 'INSTRUCTOR_PRACTICA') {
    return '/instructor/practica'
  }

  if (normalizado === 'ADMINISTRATIVO') {
    return '/admin'
  }

  return '/dashboard'
}

export default function LoginPage() {
  const router = useRouter()

  const [empresas, setEmpresas] = useState([])
  const [nit, setNit] = useState('')
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [perfiles, setPerfiles] = useState([])
  const [perfilSeleccionado, setPerfilSeleccionado] = useState('')

  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true)
  const [cargandoPerfiles, setCargandoPerfiles] = useState(false)

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

  const limpiarPerfiles = () => {
    setPerfiles([])
    setPerfilSeleccionado('')
  }

  const consultarPerfiles = async () => {
    const documento = normalizarDocumento(usuario)

    if (!nit || !documento) return null

    setCargandoPerfiles(true)
    setError('')
    limpiarPerfiles()

    try {
      const res = await fetch('/api/login/perfiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nit, documento }),
      })

      const json = await res.json()

      if (json.status !== 'success') {
        throw new Error(json.message || 'No fue posible validar el usuario.')
      }

      const listaPerfiles = json.perfiles || []
      setPerfiles(listaPerfiles)

      if (listaPerfiles.length === 1) {
        setPerfilSeleccionado(listaPerfiles[0].rol)
      }

      return listaPerfiles
    } catch (err) {
      console.error(err)
      setError(err.message || 'No fue posible validar el usuario.')
      mostrarError(err.message || 'No fue posible validar el usuario.')
      return null
    } finally {
      setCargandoPerfiles(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    const documento = normalizarDocumento(usuario)

    if (!nit) {
      const msg = 'Seleccione el CEA.'
      setError(msg)
      mostrarError(msg)
      return
    }

    if (!documento) {
      const msg = 'Ingrese su usuario.'
      setError(msg)
      mostrarError(msg)
      return
    }

    if (!contrasena) {
      const msg = 'Ingrese su contraseña.'
      setError(msg)
      mostrarError(msg)
      return
    }

    let perfilesDisponibles = perfiles

    if (perfilesDisponibles.length === 0) {
      const resultado = await consultarPerfiles()
      if (!resultado || resultado.length === 0) return
      perfilesDisponibles = resultado
    }

    let rolParaIngresar = perfilSeleccionado

    if (perfilesDisponibles.length === 1) {
      rolParaIngresar = perfilesDisponibles[0].rol
      setPerfilSeleccionado(rolParaIngresar)
    }

    if (perfilesDisponibles.length > 1 && !rolParaIngresar) {
      const msg = 'Seleccione el perfil con el que desea ingresar.'
      setError(msg)
      mostrarError(msg)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nit,
          usuario: documento,
          password: contrasena,
          rol: rolParaIngresar,
        }),
      })

      const json = await res.json()

      if (json.status !== 'success') {
        throw new Error(json.message || 'Usuario, contraseña o perfil incorrecto.')
      }

      localStorage.clear()
      localStorage.setItem('currentUser', JSON.stringify(json))
      localStorage.setItem('currentEmpresaNit', json.nitEmpresa || nit)
      localStorage.setItem('currentEmpresaNombre', json.nombreEmpresa || '')
      localStorage.setItem('currentPerfilRol', json.rolOriginal || json.rol || '')
      localStorage.setItem('currentPerfilMenu', json.menuTipo || '')

      const nombre = json.nombreCompleto || json.usuario || 'Bienvenido'
      const empresa = json.nombreEmpresa ? ` • ${json.nombreEmpresa}` : ''
      const perfil = json.rol ? ` • ${etiquetaRol(json.rol)}` : ''

      mostrarExito(`${nombre}${empresa}${perfil} • ingreso exitoso`)

      router.push(rutaPorRol(json.rol))
    } catch (err) {
      console.error(err)
      const msg = err.message || 'Error al conectar con el servidor.'
      setError(msg)
      mostrarError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="flex-1 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white flex flex-col items-center justify-center p-10 relative overflow-hidden">
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

        <div className="mb-2 z-10">
          <Image
            src="/logo.png"
            alt="Logo DATA CEA"
            width={300}
            height={300}
            priority
            style={{ width: 'auto', height: 'auto' }}
          />
        </div>

        <h1 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent z-10">
          Sistema de Registro y Control de Datos para <br />
          Centros de Enseñanza Automovilística
        </h1>

        <p className="text-sm sm:text-sm max-w-lg text-justify z-10">
          Permite registrar y controlar horarios laborales, inspecciones preoperacionales,
          mantenimientos, fallas y siniestros viales. Facilita gestionar documentos
          de vehículos e instructores, programar reuniones, capacitaciones y clases
          prácticas, así como registrar matrículas de aprendices. Adicionalmente,
          posibilita generar reportes e indicadores para apoyar el envío de información
          a la plataforma SISI de la Superintendencia de Transporte.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-100 p-8">
        <div className="w-full max-w-md bg-white shadow-2xl rounded-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            Iniciar Sesión
          </h2>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="nit" className="block text-sm font-medium mb-1">
                CEA
              </label>
              <select
                id="nit"
                value={nit}
                onChange={(e) => {
                  setNit(e.target.value)
                  limpiarPerfiles()
                }}
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
              <label htmlFor="usuario" className="block text-sm font-medium mb-1">
                Usuario
              </label>
              <input
                type="text"
                id="usuario"
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value.replace(/\D/g, ''))
                  limpiarPerfiles()
                }}
                onBlur={consultarPerfiles}
                placeholder="Ingrese su usuario"
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              />
              {cargandoPerfiles && (
                <p className="mt-1 text-xs text-gray-500">Validando usuario...</p>
              )}
            </div>

            {perfiles.length > 1 && (
              <div>
                <label htmlFor="perfil" className="block text-sm font-medium mb-1">
                  Perfil
                </label>
                <select
                  id="perfil"
                  value={perfilSeleccionado}
                  onChange={(e) => setPerfilSeleccionado(e.target.value)}
                  className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  required
                >
                  <option value="">Seleccione el perfil</option>
                  {perfiles.map((perfil) => (
                    <option key={perfil.id} value={perfil.rol}>
                      {etiquetaRol(perfil.rol)}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              disabled={loading || cargandoEmpresas || cargandoPerfiles}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-bold py-2 rounded-md transition disabled:bg-gray-400"
            >
              {loading ? 'Ingresando...' : 'Entrar'}
            </button>
          </form>

          {error && <p className="text-red-600 text-center mt-4">{error}</p>}

          <div className="mt-6 text-center space-y-2">
            <Link href="/registro" className="text-[var(--primary)] hover:underline">
              Registrarse
            </Link>
            <br />
            <Link href="/recuperar" className="text-[var(--primary)] hover:underline">
              Recuperar usuario o contraseña
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}