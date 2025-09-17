'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DocumentosVehiculosPage() {
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
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
        
        {/* Título */}
        <h2 className="text-2xl font-bold mb-6 text-center text-[var(--primary)]">
          <i className="fas fa-car mr-2"></i>
          Actualizar Documentos <br /> Vehículos
        </h2>

        {/* Usuario logueado */}
        <p className="bg-blue-50 border border-blue-200 text-[var(--primary-dark)] 
                      p-2 rounded-md mb-6 text-center text-sm">
          Usuario: <strong>{user.nombreCompleto}</strong> ({user.rol})
        </p>

        {/* Formulario */}
        <div className="space-y-5">
          {/* Placa */}
          <div>
            <div className="bg-black text-white px-3 py-1 rounded-t-md text-sm font-semibold">
              Placa del Vehículo
            </div>
            <select className="w-full border p-2 rounded-b-md">
              <option value="">Selecciona una placa</option>
              {/* TODO: cargar dinámicamente desde supabase */}
            </select>
          </div>

          {/* Tipo de Vehículo */}
          <div>
            <div className="bg-black text-white px-3 py-1 rounded-t-md text-sm font-semibold">
              Tipo de Vehículo
            </div>
            <input type="text" className="w-full border p-2 rounded-b-md bg-gray-100" readOnly />
          </div>

          {/* Tipo de Documento */}
          <div>
            <div className="bg-black text-white px-3 py-1 rounded-t-md text-sm font-semibold">
              Tipo de Documento
            </div>
            <select className="w-full border p-2 rounded-b-md">
              <option value="">Selecciona el documento</option>
              <option value="SOAT">SOAT</option>
              <option value="RTM">RTM</option>
            </select>
          </div>

          {/* Fecha de Vigencia */}
          <div>
            <div className="bg-black text-white px-3 py-1 rounded-t-md text-sm font-semibold">
              Fecha de Vigencia
            </div>
            <input type="date" className="w-full border p-2 rounded-b-md" />
          </div>

          {/* Estado del Vehículo */}
          <div>
            <div className="bg-black text-white px-3 py-1 rounded-t-md text-sm font-semibold">
              Estado del Vehículo
            </div>
            <input type="text" className="w-full border p-2 rounded-b-md bg-gray-100" readOnly />
          </div>

          {/* Actualizado por */}
          <div>
            <div className="bg-black text-white px-3 py-1 rounded-t-md text-sm font-semibold">
              Actualizado por
            </div>
            <input type="text" className="w-full border p-2 rounded-b-md bg-gray-100" readOnly />
          </div>
        </div>

        {/* Botones */}
        <div className="mt-8 space-y-4">
          {/* Guardar centrado */}
          <div className="flex justify-center">
            <button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] 
                              text-white py-2 px-6 rounded-lg shadow-md 
                              flex items-center gap-2 text-sm">
              <i className="fas fa-save"></i> Guardar Actualización
            </button>
          </div>

          {/* Volver y Cerrar en otra fila centrados */}
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/instructor/practica/documentos')}
              className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 
                        rounded-lg shadow-md flex items-center gap-2 text-sm"
            >
              <i className="fas fa-arrow-left"></i> Regresar
            </button>
            <button
              onClick={handleLogout}
              className="bg-[var(--danger)] hover:bg-[var(--danger-dark)] text-white py-2 px-4 
                        rounded-lg shadow-md flex items-center gap-2 text-sm"
            >
              <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Mensaje de estado */}
        <p className="text-center text-sm text-gray-600 mt-4 min-h-[1.5em]">
          {/* Aquí se mostrarán mensajes de validación o confirmación */}
        </p>
      </div>
    </div>
  )
}
