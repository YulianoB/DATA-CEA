'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
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

  const handleNavigation = (label) => {
    if (label === 'Consultas') router.push('/admin/consultas')
    else if (label === 'Inscripciones') router.push('/admin/inscripciones')
    else if (label === 'Programación') router.push('/admin/programacion')
    else if (label === 'Reuniones') router.push('/admin/reuniones')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-6">
      <div className="max-w-5xl w-full bg-white border border-gray-200 shadow-lg rounded-lg p-8">
        {/* Título */}
        <div className="flex items-center justify-center gap-3 mb-6 border-b pb-3 border-[var(--primary)]">
          <i className="fas fa-cogs text-3xl text-[var(--primary)]"></i>
          <h2 className="text-2xl font-bold uppercase text-[var(--primary)]">
            Menú Administrativo
          </h2>
        </div>

        {/* Usuario */}
        <p className="bg-blue-50 border border-blue-200 text-[var(--primary-dark)] p-2 rounded-md mb-6 text-center text-sm">
          Usuario: <strong>{user.nombreCompleto}</strong> ({user.rol})
        </p>

        {/* Accesos en cards con tono */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: 'fa-chart-line', label: 'Consultas' },
            { icon: 'fa-user-plus', label: 'Inscripciones' },
            { icon: 'fa-calendar-alt', label: 'Programación' },
            { icon: 'fa-users-cog', label: 'Reuniones' },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={() => handleNavigation(btn.label)}
              className="bg-blue-50 border border-blue-200 hover:bg-[var(--primary)] hover:text-white text-gray-700 rounded-lg h-28 flex flex-col items-center justify-center gap-2 shadow transition"
            >
              <i className={`fas ${btn.icon} text-3xl`}></i>
              <span className="text-sm font-semibold">{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Logout */}
        <div className="flex justify-center mt-10">
          <button
            onClick={handleLogout}
            className="bg-[var(--danger)] hover:bg-[var(--danger-dark)] text-white font-medium py-2 px-6 rounded-lg flex items-center justify-center gap-2 shadow-md transition text-sm"
          >
            <i className="fas fa-sign-out-alt"></i>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
