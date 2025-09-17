'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HorariosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    role: '',
    userDocument: '',
    clasesDictadasMayor10: false,
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
      setStatus('❌ Error al consultar horarios.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFilters({
      startDate: '',
      endDate: '',
      role: '',
      userDocument: '',
      clasesDictadasMayor10: false,
    })
    setData([])
    setStatus('')
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4">
        {/* Título */}
        <h1 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2 text-[var(--primary)] border-b pb-2">
          <i className="fas fa-calendar-alt text-[var(--primary)]"></i>
          Consultar Registro de Jornadas
        </h1>

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
              <label className="mb-1">Rol</label>
              <select
                name="role"
                value={filters.role}
                onChange={handleChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              >
                <option value="">-- Todos --</option>
                <option value="INSTRUCTOR TEORÍA">Instructor Teoría</option>
                <option value="INSTRUCTOR PRÁCTICA">Instructor Práctica</option>
                <option value="ADMINISTRATIVO">Administrativo</option>
                <option value="AUXILIAR ADMINISTRATIVO">Auxiliar Administrativo</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1">Usuario</label>
              <select
                name="userDocument"
                value={filters.userDocument}
                onChange={handleChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              >
                <option value="">-- Todos --</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="clasesDictadasMayor10"
                checked={filters.clasesDictadasMayor10}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <label>Exceso Jornadas</label>
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
            disabled
            className="bg-gray-400 text-white px-2 py-1 rounded flex items-center gap-1 cursor-not-allowed opacity-70"
          >
            <i className="fas fa-chart-bar"></i> Resumen
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
            status.includes('❌') ? 'text-red-600' : status.includes('⚠️') ? 'text-yellow-600' : 'text-green-600'
          }`}
        >
          {status}
        </p>

        {/* Tabla compacta estilo zebra */}
        <div className="overflow-x-auto border rounded-lg shadow">
          <table className="w-full text-[11px] border-collapse rounded-lg overflow-hidden">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-1 border text-center">Fecha</th>
                <th className="p-1 border text-left">Instructor</th>
                <th className="p-1 border text-center">Entrada</th>
                <th className="p-1 border text-center">Salida</th>
                <th className="p-1 border text-center">Placa</th>
                <th className="p-1 border text-center">KM Recorrido</th>
                <th className="p-1 border text-center">Clases</th>
                <th className="p-1 border text-center">Aprendices</th>
                <th className="p-1 border text-center">Duración</th>
                <th className="p-1 border text-center">Tarifa</th>
                <th className="p-1 border text-center">Pago</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-2 border text-center text-gray-500">
                    No hay resultados para los filtros seleccionados
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr
                    key={i}
                    className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition"
                  >
                    <td className="p-1 border text-center">{row.Fecha}</td>
                    <td className="p-1 border text-left">{row.NombreCompleto}</td>
                    <td className="p-1 border text-center">{row.HoraEntrada}</td>
                    <td className="p-1 border text-center">{row.HoraSalida}</td>
                    <td className="p-1 border text-center">{row.Placa}</td>
                    <td className="p-1 border text-center">{row.KMRecorrido}</td>
                    <td className="p-1 border text-center">{row.ClasesDictadas}</td>
                    <td className="p-1 border text-center">{row.NumAprendices}</td>
                    <td className="p-1 border text-center">{row.DuracionJornada}</td>
                    <td className="p-1 border text-center">${row.Tarifa?.toLocaleString()}</td>
                    <td className="p-1 border text-center">${row.Pago?.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
