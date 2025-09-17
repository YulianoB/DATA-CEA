'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function MantenimientosPage() {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-3 md:p-6">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-3 md:p-6">

        {/* Título */}
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2 border-b pb-3 text-[var(--primary)]">
          <i className="fas fa-wrench text-[var(--primary)]"></i>
          Registro de Mantenimientos
        </h2>

        {/* Usuario y estado */}
        <div className="bg-gray-50 p-2 md:p-3 rounded mb-6 text-xs md:text-sm border">
          Usuario: <strong>{user.nombreCompleto}</strong>
          <div id="mantenimiento-status-message" className="mt-2 text-center font-semibold text-xs md:text-sm text-gray-700">
            {/* Aquí irá el mensaje dinámico */}
          </div>
        </div>

        {/* Datos del mantenimiento */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-sm md:text-lg font-semibold mb-3 px-3 py-2 bg-gray-900 text-white rounded">
            <i className="fas fa-tools mr-2"></i>
            Datos del Mantenimiento
          </h3>

          {/* Placa + Kilometraje */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
            <div>
              <label className="block mb-1 font-semibold text-sm">Placa del Vehículo</label>
              <select className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base">
                <option value="">-- Selecciona la Placa --</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Kilometraje Actual</label>
              <input type="number" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" min="0" />
            </div>
          </div>

          {/* Info vehículo */}
          <div className="bg-yellow-50 border border-yellow-200 p-2 md:p-3 rounded text-xs md:text-sm mb-3">
            <p><strong>Tipo de Vehículo:</strong> <span>-</span></p>
            <p><strong>Marca:</strong> <span>-</span></p>
          </div>

          {/* Tipo y actividad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
            <div>
              <label className="block mb-1 font-semibold text-sm">Tipo de Mantenimiento</label>
              <select className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base">
                <option value="">-- Selecciona Tipo --</option>
                <option value="PREVENTIVO">Preventivo</option>
                <option value="CORRECTIVO">Correctivo</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm">Actividad Realizada</label>
              <textarea className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" rows="2" />
            </div>
          </div>

          {/* Repuestos */}
          <div className="mb-4">
            <label className="block mb-1 font-semibold text-sm">Repuestos Utilizados</label>
            <textarea className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" rows="3" />
          </div>
        </div>

        {/* Proveedor */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-sm md:text-lg font-semibold mb-3 px-3 py-2 bg-gray-900 text-white rounded">
            <i className="fas fa-building mr-2"></i>
            Datos del Proveedor
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <input type="text" placeholder="Empresa" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" />
            <input type="text" placeholder="NIT" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" />
            <input type="text" placeholder="Dirección" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" />
            <input type="text" placeholder="Teléfono" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" />
          </div>
        </div>

        {/* Técnico */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-sm md:text-lg font-semibold mb-3 px-3 py-2 bg-gray-900 text-white rounded">
            <i className="fas fa-user-cog mr-2"></i>
            Datos del Técnico
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <input type="text" placeholder="Nombres y Apellidos" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" />
            <input type="text" placeholder="Documento" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" />
            <input type="text" placeholder="Teléfono" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" />
          </div>
        </div>

        {/* Costos */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-sm md:text-lg font-semibold mb-3 px-3 py-2 bg-gray-900 text-white rounded">
            <i className="fas fa-dollar-sign mr-2"></i>
            Costos y Tiempo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
            <input type="number" placeholder="Tiempo de Parada (horas)" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" step="0.01" />
            <input type="text" placeholder="Número de Factura" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" />
            <input type="number" placeholder="Valor Repuestos" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" step="0.01" />
            <input type="number" placeholder="Valor Mano de Obra" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" step="0.01" />
          </div>
          <div className="font-semibold text-sm md:text-base">
            Costo Total: <span className="text-[var(--primary-dark)]">$0.00</span>
          </div>
        </div>

        {/* Responsable */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-sm md:text-lg font-semibold mb-3 px-3 py-2 bg-gray-900 text-white rounded">
            <i className="fas fa-user-check mr-2"></i>
            Responsable del Registro
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3">
            <input type="text" placeholder="Nombre Responsable" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" readOnly />
            <input type="text" placeholder="Documento Responsable" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" readOnly />
            <input type="text" placeholder="Cargo Responsable" className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" readOnly />
          </div>
          <textarea className="w-full border p-2 md:p-3 rounded-lg text-sm md:text-base" rows="3" placeholder="Observaciones" />
        </div>

        {/* Botones finales */}
        <div className="mt-8 space-y-4">
          {/* Registrar centrado */}
          <div className="flex justify-center">
            <button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] 
                              text-white py-2 md:py-3 px-6 rounded-lg shadow-md 
                              text-sm md:text-base flex items-center gap-2">
              <i className="fas fa-save"></i> Registrar Mantenimiento
            </button>
          </div>

          {/* Regresar y Cerrar sesión en otra fila centrados */}
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/instructor/practica')}
              className="bg-gray-600 hover:bg-gray-800 text-white py-2 md:py-3 px-4 
                         rounded-lg shadow-md text-sm md:text-base flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i> Regresar
            </button>
            <button
              onClick={handleLogout}
              className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 md:py-3 px-4 
                         rounded-lg shadow-md text-sm md:text-base flex items-center gap-2"
            >
              <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
