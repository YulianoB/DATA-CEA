'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegistroHorariosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    } else {
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    router.push('/login')
  }

  if (!user) return <p className="text-center mt-20">Cargando...</p>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        
        {/* Encabezado */}
        <div className="flex flex-col items-center mb-6">
          <i className="fas fa-clock text-3xl text-[var(--primary)] mb-2"></i>
          <h2 className="text-xl font-bold uppercase text-[var(--primary)] text-center">
            Registro de Horarios
          </h2>
        </div>

        {/* Info usuario */}
        <p className="bg-blue-50 border border-blue-200 text-[var(--primary-dark)] p-2 rounded-md mb-6 text-center text-sm">
          Usuario: <strong>{user.nombreCompleto}</strong> ({user.rol})
        </p>

        {/* Mensaje estado */}
        <div
          id="status-message"
          className="text-center text-sm font-medium text-gray-600 min-h-[1.5em] mb-4"
        ></div>

        {/* Asistencia reunión */}
        <div id="asistenciaReunionContainer" className="hidden text-center mb-6">
          <button className="text-[var(--primary)] hover:underline flex items-center justify-center gap-2 mx-auto">
            <i className="fas fa-check-circle"></i>
            Registrar asistencia a reunión
          </button>
        </div>

        {/* Botones principales en cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            className="h-24 flex flex-col items-center justify-center gap-2 rounded-lg 
                       bg-white text-gray-700 shadow-lg border border-gray-300
                       hover:bg-[var(--primary)] hover:text-white 
                       transform hover:-translate-y-1 hover:shadow-xl
                       transition-all duration-200 ease-in-out text-sm font-medium"
          >
            <i className="fas fa-sign-in-alt text-2xl"></i>
            Entrada
          </button>
          <button
            className="h-24 flex flex-col items-center justify-center gap-2 rounded-lg 
                       bg-white text-gray-700 shadow-lg border border-gray-300
                       hover:bg-[var(--primary)] hover:text-white 
                       transform hover:-translate-y-1 hover:shadow-xl
                       transition-all duration-200 ease-in-out text-sm font-medium"
          >
            <i className="fas fa-sign-out-alt text-2xl"></i>
            Salida
          </button>
        </div>

        {/* Botón cerrar sesión */}
        <div className="flex justify-center">
          <button
            onClick={handleLogout}
            className="bg-[var(--danger)] hover:bg-[var(--danger-dark)] 
                       text-white font-medium py-2 px-6 rounded-lg 
                       flex items-center justify-center gap-2 
                       shadow-md hover:shadow-lg transition text-sm"
          >
            <i className="fas fa-sign-out-alt"></i>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
