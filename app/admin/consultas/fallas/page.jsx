'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FallasPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  })
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedFalla, setSelectedFalla] = useState(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    } else {
      router.push('/login')
    }
  }, [router])

  if (!user) return <p className="text-center mt-20">Cargando...</p>

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleConsultar = async () => {
    if (!filters.startDate || !filters.endDate) {
      setStatus('⚠️ Debe seleccionar ambas fechas.')
      return
    }
    setLoading(true)
    setStatus('Consultando datos...')

    try {
      // 🔹 Aquí luego se conecta con Supabase
      const result = []
      setData(result)
      setStatus(`Consulta completada. ${result.length} registros encontrados.`)
    } catch (err) {
      setStatus('❌ Error al consultar fallas.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFilters({ startDate: '', endDate: '' })
    setData([])
    setStatus('')
  }

  const handleAbrirModal = (falla) => {
    setSelectedFalla(falla)
    setShowModal(true)
  }

  const handleCerrarModal = () => {
    setShowModal(false)
    setSelectedFalla(null)
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4">
        {/* Título */}
        <h2 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2 text-[var(--primary)] border-b pb-2">
          <i className="fas fa-triangle-exclamation text-[var(--primary)]"></i>
          Consultar Reportes de Fallas
        </h2>

        {/* Filtros */}
        <div className="bg-[var(--primary-dark)] text-white rounded-lg p-2 mb-2">
          <h3 className="text-xs font-bold mb-1">Filtros de Búsqueda</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col">
              <label className="mb-1">Fecha Inicio</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1">Fecha Fin</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-wrap justify-center gap-2 mb-2 text-xs">
          <button
            onClick={handleConsultar}
            disabled={loading}
            className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-2 py-1 rounded flex items-center gap-1"
          >
            <i className="fas fa-search"></i> {loading ? 'Consultando...' : 'Consultar'}
          </button>
          <button
            onClick={handleLimpiar}
            className="bg-gray-500 hover:bg-gray-700 text-white px-2 py-1 rounded flex items-center gap-1"
          >
            <i className="fas fa-eraser"></i> Limpiar
          </button>
          <button className="bg-green-600 hover:bg-green-800 text-white px-2 py-1 rounded flex items-center gap-1">
            <i className="fas fa-file-excel"></i> Excel
          </button>
          <button className="bg-red-600 hover:bg-red-800 text-white px-2 py-1 rounded flex items-center gap-1">
            <i className="fas fa-file-pdf"></i> PDF
          </button>
        </div>

        {/* Área de mensajes */}
        <p
          className={`text-center text-xs mb-2 ${
            status.includes('❌')
              ? 'text-red-600'
              : status.includes('⚠️')
              ? 'text-yellow-600'
              : 'text-green-600'
          }`}
        >
          {status}
        </p>

        {/* Tabla */}
        <div className="overflow-x-auto border rounded-lg shadow">
          <table className="w-full text-[11px] border-collapse rounded-lg overflow-hidden">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-1 border text-center">Consecutivo</th>
                <th className="p-1 border text-center">Fecha</th>
                <th className="p-1 border text-center">Hora</th>
                <th className="p-1 border text-center">Placa</th>
                <th className="p-1 border text-center">Tipo Vehículo</th>
                <th className="p-1 border text-center">Marca</th>
                <th className="p-1 border text-center">Kilometraje</th>
                <th className="p-1 border text-center">Encargado</th>
                <th className="p-1 border text-center">Descripción</th>
                <th className="p-1 border text-center">Acciones Tomadas</th>
                <th className="p-1 border text-center">Estado</th>
                <th className="p-1 border text-center">Observación</th>
                <th className="p-1 border text-center">F. Verificación</th>
                <th className="p-1 border text-center">F. Solución</th>
                <th className="p-1 border text-center">Usuario Soluciona</th>
                <th className="p-1 border text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((row, i) => (
                  <tr key={i} className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition">
                    <td className="p-1 border text-center">{row.consecutivo}</td>
                    <td className="p-1 border text-center">{row.fecha}</td>
                    <td className="p-1 border text-center">{row.hora}</td>
                    <td className="p-1 border text-center">{row.placa}</td>
                    <td className="p-1 border text-center">{row.tipoVehiculo}</td>
                    <td className="p-1 border text-center">{row.marca}</td>
                    <td className="p-1 border text-center">{row.kilometraje}</td>
                    <td className="p-1 border text-center">{row.encargado}</td>
                    <td className="p-1 border text-center">{row.descripcion}</td>
                    <td className="p-1 border text-center">{row.acciones}</td>
                    <td className="p-1 border text-center">{row.estado}</td>
                    <td className="p-1 border text-center">{row.observacion}</td>
                    <td className="p-1 border text-center">{row.fechaVerificacion}</td>
                    <td className="p-1 border text-center">{row.fechaSolucion}</td>
                    <td className="p-1 border text-center">{row.usuarioSoluciona}</td>
                    <td className="p-1 border text-center">
                      <button
                        onClick={() => handleAbrirModal(row)}
                        className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs hover:bg-blue-800"
                      >
                        Solucionar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="16" className="text-center text-gray-500 p-2">
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal para solución */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-lg relative">
              <button
                onClick={handleCerrarModal}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                ✖
              </button>
              <h3 className="text-lg font-bold mb-2">Registrar Solución</h3>
              <p>
                <strong>Falla:</strong> {selectedFalla?.consecutivo}
              </p>
              <textarea
                rows="4"
                className="w-full border rounded p-2 mt-2 text-sm"
                placeholder="Escribe las observaciones de la solución aquí..."
              ></textarea>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={handleCerrarModal}
                  className="bg-gray-500 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                >
                  Cancelar
                </button>
                <button className="bg-green-600 hover:bg-green-800 text-white px-3 py-1 rounded text-sm">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
