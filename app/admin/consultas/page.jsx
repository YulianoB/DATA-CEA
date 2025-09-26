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
        Use el menú lateral para navegar entre las diferentes consultas:
      </p>

      <ul className="list-disc list-inside mt-4 text-gray-700 space-y-1">
        <li>Visualizar registros de Horarios de Jornadas laborales</li>
        <li>Visualizar registros de Inspecciones Preoperacionales y hacer seguimiento</li>
        <li>Visualizar Kilómetros Registrados por toda la flota o por placa</li>
        <li>Visualizar registros de Mantenimientos preventivos y correctivos</li>
        <li>Visualizar registros de Siniestros viales y hacer seguimiento </li>
        <li>Visualizar Reportes de Fallas en misión y hacer seguimiento</li>
      </ul>

      <p className="mt-6 text-gray-500 text-sm italic">
        Seleccione una opción en el menú lateral para comenzar.
      </p>
    </div>
  )
}
