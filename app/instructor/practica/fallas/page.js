'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function FallasPage() {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-5">
        {/* Título */}
        <h2 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2 border-b pb-2 text-[var(--primary-dark)]">
          <i className="fas fa-exclamation-triangle text-[var(--primary)]"></i>
          Registro de Fallas en Misión
        </h2>

        {/* Usuario compacto */}
        <div className="bg-gray-50 p-2 rounded mb-4 text-xs border text-center">
          Usuario: <strong>{user.nombreCompleto}</strong>
        </div>

        {/* Mensaje de estado */}
        <div className="text-center text-sm font-semibold text-gray-600 mb-4 min-h-[1.2em]">
          {/* Aquí se mostrarán mensajes dinámicos */}
        </div>

        {/* Formulario */}
        <div className="space-y-6">
          {/* Placa */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-900 text-white px-3 py-2 font-semibold text-sm flex items-center gap-2">
              <i className="fas fa-car"></i> Vehículo
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="block mb-1 font-semibold text-sm">Placa del Vehículo</label>
                <select className="w-full border p-2 rounded text-sm" required>
                  <option value="">-- Selecciona una placa --</option>
                </select>
                {/* Info-box */}
                <div className="text-xs text-gray-600 mt-2">
                  <p><strong>Tipo de Vehículo:</strong> -</p>
                  <p><strong>Marca:</strong> -</p>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-sm">Kilometraje Actual</label>
                <input
                  type="number"
                  required
                  className="w-full border p-2 rounded text-sm"
                  placeholder="Ingrese el kilometraje"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-900 text-white px-3 py-2 font-semibold text-sm flex items-center gap-2">
              <i className="fas fa-file-alt"></i> Descripción
            </div>
            <div className="p-3">
              <textarea
                className="w-full border p-2 rounded text-sm"
                rows="3"
                required
                placeholder="Describa la falla..."
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-900 text-white px-3 py-2 font-semibold text-sm flex items-center gap-2">
              <i className="fas fa-tasks"></i> Acciones Tomadas
            </div>
            <div className="p-3">
              <textarea
                className="w-full border p-2 rounded text-sm"
                rows="3"
                required
                placeholder="Describa las acciones tomadas..."
              />
            </div>
          </div>
        </div>

        {/* Botones finales */}
        <div className="flex justify-center gap-3 mt-6 flex-wrap">
          <button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-2 px-4 rounded-lg shadow-md text-sm">
            <i className="fas fa-save mr-2"></i> Registrar
          </button>
          <button
            onClick={() => router.push('/instructor/practica')}
            className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 rounded-lg shadow-md text-sm"
          >
            <i className="fas fa-arrow-left mr-2"></i> Regresar
          </button>
          <button
            onClick={handleLogout}
            className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 px-4 rounded-lg shadow-md text-sm"
          >
            <i className="fas fa-sign-out-alt mr-2"></i> Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
