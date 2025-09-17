'use client'

import { useEffect, useState } from 'react'

export default function ConsultasHomePage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  if (!user) return <p className="text-center mt-20">Cargando...</p>

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-[var(--primary)] mb-4 flex items-center gap-3">
        <i className="fas fa-database text-[var(--primary)]"></i>
        Consultas Administrativas
      </h2>

      <p className="text-gray-700 mb-4">
        Bienvenido, <strong>{user.nombreCompleto}</strong> 👋
      </p>

      <p className="text-gray-600">
        Usa el menú lateral para navegar entre las diferentes consultas:
      </p>

      <ul className="list-disc list-inside mt-4 text-gray-700 space-y-1">
        <li>Visualizar Horarios</li>
        <li>Inspecciones Preoperacionales</li>
        <li>Kilómetros Registrados</li>
        <li>Mantenimientos</li>
        <li>Siniestros</li>
        <li>Reportes de Fallas</li>
      </ul>

      <p className="mt-6 text-gray-500 text-sm italic">
        Selecciona una opción en el menú lateral para comenzar.
      </p>
    </div>
  )
}
