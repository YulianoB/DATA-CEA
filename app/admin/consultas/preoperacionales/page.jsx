'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PreoperacionalesPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    tipoVehiculo: '',
    placa: '',
    conObservaciones: false,
  })
  const [data, setData] = useState([]) // inicialmente vacío
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
    const { name, value, type, checked } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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
      // 🔹 Aquí después conectaremos con Supabase
      const result = [] // vacío por ahora

      setData(result)
      setStatus(`Consulta completada. ${result.length} registros encontrados.`)
    } catch (err) {
      setStatus('❌ Error al consultar inspecciones.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFilters({
      startDate: '',
      endDate: '',
      tipoVehiculo: '',
      placa: '',
      conObservaciones: false,
    })
    setData([])
    setStatus('')
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4">
        {/* Título */}
        <h2 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2 text-[var(--primary)] border-b pb-2">
          <i className="fas fa-clipboard-check text-[var(--primary)]"></i>
          Consultar Inspecciones Preoperacionales
        </h2>

        {/* Filtros */}
        <div className="bg-[var(--primary-dark)] text-white rounded-lg p-2 mb-2">
          <h3 className="text-xs font-bold mb-1">Filtros de Búsqueda</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
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
              <label className="mb-1">Tipo Vehículo</label>
              <select
                name="tipoVehiculo"
                value={filters.tipoVehiculo}
                onChange={handleChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              >
                <option value="">Todos los Tipos</option>
              </select>
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="conObservaciones"
                checked={filters.conObservaciones}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <label>Con Observaciones</label>
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
            status.includes('❌') ? 'text-red-600' : status.includes('⚠️') ? 'text-yellow-600' : 'text-green-600'
          }`}
        >
          {status}
        </p>

        {/* Tabla estilo zebra con encabezado fijo */}
        <div className="overflow-x-auto border rounded-lg shadow">
          <table className="w-full text-[11px] border-collapse rounded-lg overflow-hidden">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-1 border text-center">Consecutivo</th>
                <th className="p-1 border text-center">Fecha</th>
                <th className="p-1 border text-center">Hora</th>
                <th className="p-1 border text-center">Placa</th>
                <th className="p-1 border text-center">Marca</th>
                <th className="p-1 border text-center">KM Registro</th>
                <th className="p-1 border text-center">Encargado</th>
                <th className="p-1 border text-center">Observaciones</th>
                <th className="p-1 border text-center">Estado</th>
                <th className="p-1 border text-center">Fecha Verificación</th>
                <th className="p-1 border text-center">Usuario Verifica</th>
                <th className="p-1 border text-center">Fecha Solución</th>
                <th className="p-1 border text-center">Usuario Soluciona</th>
                <th className="p-1 border text-center">Obs. Solución</th>
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
                    <td className="p-1 border text-center">{row.marca}</td>
                    <td className="p-1 border text-center">{row.km}</td>
                    <td className="p-1 border text-center">{row.encargado}</td>
                    <td className="p-1 border text-center">{row.observaciones}</td>
                    <td className="p-1 border text-center">{row.estado}</td>
                    <td className="p-1 border text-center">{row.fechaVerificacion}</td>
                    <td className="p-1 border text-center">{row.usuarioVerifica}</td>
                    <td className="p-1 border text-center">{row.fechaSolucion}</td>
                    <td className="p-1 border text-center">{row.usuarioSoluciona}</td>
                    <td className="p-1 border text-center">{row.obsSolucion}</td>
                    <td className="p-1 border text-center">[Botón]</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="15" className="text-center text-gray-500 p-2">
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
