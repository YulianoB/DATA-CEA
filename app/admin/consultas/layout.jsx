'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ConsultasLayout({ children }) {
  const pathname = usePathname()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  if (!user) {
    return <p className="text-center mt-20">Cargando...</p>
  }

  // Menú lateral
  const menuItems = [
    { href: '/admin/consultas/horarios', icon: 'fa-calendar-alt', label: 'Horarios' },
    { href: '/admin/consultas/preoperacionales', icon: 'fa-clipboard-check', label: 'Preoperacionales' },
    { href: '/admin/consultas/kilometros', icon: 'fa-road', label: 'Kilómetros' },
    { href: '/admin/consultas/mantenimientos', icon: 'fa-tools', label: 'Mantenimientos' },
    { href: '/admin/consultas/siniestros', icon: 'fa-car-crash', label: 'Siniestros' },
    { href: '/admin/consultas/fallas', icon: 'fa-triangle-exclamation', label: 'Fallas' },
  ]

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar más angosto */}
      <aside className="w-48 bg-[var(--primary-dark)] text-white flex flex-col">
        <div className="px-4 py-3 border-b border-[var(--primary)]">
          <h2 className="text-base font-bold flex items-center gap-2">
            <i className="fas fa-database"></i> Consultas
          </h2>
          <p className="text-xs mt-1">
            {user.nombreCompleto} <br /> <span className="italic">{user.rol}</span>
          </p>
        </div>

        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition text-xs ${
                    pathname === item.href
                      ? 'bg-[var(--primary)] text-white font-semibold'
                      : 'hover:bg-[var(--primary)]/60'
                  }`}
                >
                  <i className={`fas ${item.icon} text-sm`}></i>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-3 border-t border-[var(--primary)]">
          <Link
            href="/admin"
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-900 px-2 py-1 rounded-md text-xs"
          >
            <i className="fas fa-arrow-left"></i> Regresar al Menú
          </Link>
        </div>
      </aside>

      {/* Contenido principal adaptado automáticamente */}
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  )
}
