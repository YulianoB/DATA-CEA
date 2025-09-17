'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SuperusuarioPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) setUser(JSON.parse(storedUser))
    else router.push('/login')
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    router.push('/login')
  }

  if (!user) return <p className="text-center mt-20">Cargando...</p>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300 p-6">
      <div className="max-w-5xl w-full bg-white border border-gray-300 shadow-2xl rounded-lg p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <i className="fas fa-user-shield text-4xl text-[var(--primary)]"></i>
          <h2 className="text-3xl font-bold uppercase text-gray-800">
            Gestión de Usuarios Registrados
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm mb-6 rounded-lg overflow-hidden shadow-md">
            <thead className="bg-[var(--primary)] text-white">
              <tr>
                <th className="p-3 border">Nombre</th>
                <th className="p-3 border">Documento</th>
                <th className="p-3 border">Email</th>
                <th className="p-3 border">Teléfono</th>
                <th className="p-3 border">Rol</th>
                <th className="p-3 border">Estado</th>
                <th className="p-3 border">Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border text-center" colSpan="7">
                  Cargando usuarios...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <button
            onClick={handleLogout}
            className="bg-[var(--danger)] hover:bg-[var(--danger-dark)] text-white font-bold py-3 px-8 rounded-lg flex items-center justify-center gap-2 shadow-md transition"
          >
            <i className="fas fa-sign-out-alt text-lg"></i>
            Cerrar Sesión
          </button>
          <button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-bold py-3 px-8 rounded-lg flex items-center justify-center gap-2 shadow-md transition">
            <i className="fas fa-sync-alt text-lg"></i>
            Refrescar
          </button>
        </div>
      </div>
    </div>
  )
}
