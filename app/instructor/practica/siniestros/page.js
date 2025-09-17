'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SiniestrosPage() {
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
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-4 sm:p-6">
        {/* Título principal */}
        <h2 className="text-2xl font-bold mb-6 text-center text-[var(--primary)] flex items-center justify-center gap-2">
          <i className="fas fa-car-crash text-[var(--primary)]"></i>
          Registro de Siniestros Viales
        </h2>

        {/* Usuario */}
        <div className="bg-gray-50 p-2 sm:p-3 rounded mb-4 text-sm border text-center">
          Usuario: <strong>{user.nombreCompleto}</strong>
        </div>
        <div
          id="siniestros-status-message"
          className="text-center text-sm font-semibold text-gray-600 mb-6 min-h-[1.5em]"
        >
          {/* Aquí puedes mostrar mensajes de validación o éxito */}
        </div>

        {/* Datos del siniestro */}
        <div className="mb-8 border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="bg-black text-white px-3 py-1 rounded-t-md mb-4 text-sm font-semibold flex items-center gap-2">
            <i className="fas fa-clipboard-list"></i>
            Datos del Siniestro
          </div>

          {/* Fecha y tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-semibold text-sm">Fecha del Siniestro</label>
              <input type="date" className="w-full border p-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Tipo de Siniestro</label>
              <select className="w-full border p-2 rounded-lg text-sm">
                <option value="">-- Selecciona Tipo --</option>
                <option value="Atropello">Atropello (Impacto de vehículo contra un peatón)</option>
                <option value="Choque">Choque (Impacto contra objeto estático)</option>
                <option value="Colisión">Colisión (Impacto entre vehículos en movimiento)</option>
                <option value="Vuelco">Vuelco</option>
                <option value="Características Especiales">Características Especiales</option>
                <option value="Caída">Caída</option>
              </select>
            </div>
          </div>

          {/* Personas involucradas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-semibold text-sm">Personas Involucradas</label>
              <input type="number" min="0" className="w-full border p-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Heridos Leves</label>
              <input type="number" min="0" className="w-full border p-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Heridos Graves</label>
              <input type="number" min="0" className="w-full border p-2 rounded-lg text-sm" />
            </div>
          </div>

          {/* Fatalidades y placa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-semibold text-sm">Fatalidades</label>
              <input type="number" min="0" className="w-full border p-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Placa del Vehículo</label>
              <select className="w-full border p-2 rounded-lg text-sm">
                <option value="">-- Selecciona la Placa --</option>
              </select>
            </div>
          </div>

          {/* Conductor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-semibold text-sm">Nombre del Conductor</label>
              <input type="text" className="w-full border p-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Documento del Conductor</label>
              <input type="text" className="w-full border p-2 rounded-lg text-sm" />
            </div>
          </div>

          {/* Resumen */}
          <div>
            <label className="block mb-1 font-semibold text-sm">Resumen del Siniestro</label>
            <textarea className="w-full border p-2 rounded-lg text-sm" rows="4" />
          </div>
        </div>

        {/* Botones finales */}
        <div className="mt-8 space-y-4">
          {/* Registrar centrado */}
          <div className="flex justify-center">
            <button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-2 px-6 rounded-lg shadow-md text-sm flex items-center gap-2">
              <i className="fas fa-file-alt"></i> Registrar Siniestro
            </button>
          </div>

          {/* Regresar y cerrar sesión en fila aparte centrados */}
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/instructor/practica')}
              className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 rounded-lg shadow-md text-sm flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i> Regresar
            </button>
            <button
              onClick={handleLogout}
              className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 px-4 rounded-lg shadow-md text-sm flex items-center gap-2"
            >
              <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
