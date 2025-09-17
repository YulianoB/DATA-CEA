'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function KilometrosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    placa: '',
  })
  const [dataHorarios, setDataHorarios] = useState([])
  const [dataPreop, setDataPreop] = useState([])
  const [comparativoSummary, setComparativoSummary] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

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
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleConsultar = async () => {
    if (!filters.startDate || !filters.endDate) {
      setStatus('⚠️ Debe seleccionar ambas fechas.')
      return
    }

    setLoading(true)
    setStatus('Consultando datos...')

    try {
      // 🔹 Aquí luego conectaremos con Supabase
      const resultHorarios = []
      const resultPreop = []
      const resultComparativo = []

      setDataHorarios(resultHorarios)
      setDataPreop(resultPreop)
      setComparativoSummary(resultComparativo)

      setStatus('Consulta completada.')
    } catch (err) {
      setStatus('❌ Error al consultar kilómetros.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFilters({
      startDate: '',
      endDate: '',
      placa: '',
    })
    setDataHorarios([])
    setDataPreop([])
    setComparativoSummary([])
    setStatus('')
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4">
        {/* Título */}
        <h2 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2 text-[var(--primary)] border-b pb-2">
          <i className="fas fa-road text-[var(--primary)]"></i>
          Consultar Kilómetros Recorridos
        </h2>

        {/* Filtros */}
        <div className="bg-[var(--primary-dark)] text-white rounded-lg p-2 mb-2">
          <h3 className="text-xs font-bold mb-1">Filtros de Búsqueda</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
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
            <div className="flex flex-col">
              <label className="mb-1">Placa</label>
              <select
                name="placa"
                value={filters.placa}
                onChange={handleChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              >
                <option value="">Toda la Flota</option>
              </select>
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
          <button
            className="bg-green-600 hover:bg-green-800 text-white px-2 py-1 rounded flex items-center gap-1"
          >
            <i className="fas fa-file-excel"></i> Excel
          </button>
          <button
            className="bg-red-600 hover:bg-red-800 text-white px-2 py-1 rounded flex items-center gap-1"
          >
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

        {/* Resultados */}
        <div className="space-y-6">
          {/* Kilómetros en Horarios */}
          <div>
            <h3 className="text-sm font-bold mb-2">Kilómetros Registrados en Horarios</h3>
            <div className="overflow-x-auto border rounded-lg shadow">
              <table className="w-full text-[11px] border-collapse rounded-lg overflow-hidden">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-1 border text-center">Placa</th>
                    <th className="p-1 border text-center">KM Menor</th>
                    <th className="p-1 border text-center">KM Mayor</th>
                    <th className="p-1 border text-center">KM Recorridos</th>
                    <th className="p-1 border text-center">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {dataHorarios.length > 0 ? (
                    dataHorarios.map((row, i) => (
                      <tr
                        key={i}
                        className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition"
                      >
                        <td className="p-1 border text-center">{row.placa}</td>
                        <td className="p-1 border text-center">{row.kmMenor}</td>
                        <td className="p-1 border text-center">{row.kmMayor}</td>
                        <td className="p-1 border text-center">{row.kmRecorridos}</td>
                        <td className="p-1 border text-center">{row.promedio}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center text-gray-500 p-2">
                        No hay resultados para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kilómetros en Preoperacionales */}
          <div>
            <h3 className="text-sm font-bold mb-2">Kilómetros Registrados en Preoperacionales</h3>
            <div className="overflow-x-auto border rounded-lg shadow">
              <table className="w-full text-[11px] border-collapse rounded-lg overflow-hidden">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-1 border text-center">Placa</th>
                    <th className="p-1 border text-center">KM Menor</th>
                    <th className="p-1 border text-center">KM Mayor</th>
                    <th className="p-1 border text-center">KM Recorridos</th>
                    <th className="p-1 border text-center">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {dataPreop.length > 0 ? (
                    dataPreop.map((row, i) => (
                      <tr
                        key={i}
                        className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition"
                      >
                        <td className="p-1 border text-center">{row.placa}</td>
                        <td className="p-1 border text-center">{row.kmMenor}</td>
                        <td className="p-1 border text-center">{row.kmMayor}</td>
                        <td className="p-1 border text-center">{row.kmRecorridos}</td>
                        <td className="p-1 border text-center">{row.promedio}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center text-gray-500 p-2">
                        No hay resultados para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comparativo Flota */}
          <div>
            <h3 className="text-sm font-bold mb-2">Comparativo Kilómetros Recorridos (Toda la Flota)</h3>
            <div className="overflow-x-auto border rounded-lg shadow">
              <table className="w-full text-[11px] border-collapse rounded-lg overflow-hidden">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-1 border text-center">Fuente</th>
                    <th className="p-1 border text-center">KM Totales</th>
                    <th className="p-1 border text-center">Promedio por Vehículo</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativoSummary.length > 0 ? (
                    comparativoSummary.map((row, i) => (
                      <tr
                        key={i}
                        className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition"
                      >
                        <td className="p-1 border text-center">{row.fuente}</td>
                        <td className="p-1 border text-center">{row.kmTotales}</td>
                        <td className="p-1 border text-center">{row.promedio}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center text-gray-500 p-2">
                        No hay resultados para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                  {/* 🔹 Fila de acumulado SIEMPRE visible */}
                  <tr className="bg-blue-600 text-white font-bold">
                    <td className="p-1 border text-center">TOTAL ACUMULADO</td>
                    <td className="p-1 border text-center">
                      {comparativoSummary.reduce((sum, row) => sum + (row.kmTotales || 0), 0)}
                    </td>
                    <td className="p-1 border text-center">
                      {comparativoSummary.length > 0
                        ? (
                            comparativoSummary.reduce((sum, row) => sum + (row.promedio || 0), 0) /
                            comparativoSummary.length
                          ).toFixed(2)
                        : '0.00'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

