'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MantenimientosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    placa: '',
    tipoMantenimiento: '',
  })
  const [data, setData] = useState([])
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
      setStatus('❌ Error al consultar mantenimientos.')
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
      tipoMantenimiento: '',
    })
    setData([])
    setStatus('')
  }

  // 🔹 Calcular acumulados
  const totalRepuestos = data.reduce((sum, r) => sum + (r.valorRepuestos || 0), 0)
  const totalManoObra = data.reduce((sum, r) => sum + (r.valorManoObra || 0), 0)
  const totalCosto = data.reduce((sum, r) => sum + (r.costoTotal || 0), 0)

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4">
        {/* Título */}
        <h2 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2 text-[var(--primary)] border-b pb-2">
          <i className="fas fa-tools text-[var(--primary)]"></i>
          Consultar Mantenimientos Registrados
        </h2>

        {/* Filtros */}
        <div className="bg-[var(--primary-dark)] text-white rounded-lg p-2 mb-2">
          <h3 className="text-xs font-bold mb-1">Filtros de Búsqueda</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
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
                <option value="">Toda la flota</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1">Tipo de Mantenimiento</label>
              <select
                name="tipoMantenimiento"
                value={filters.tipoMantenimiento}
                onChange={handleChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              >
                <option value="">Todos</option>
                <option value="PREVENTIVO">PREVENTIVO</option>
                <option value="CORRECTIVO">CORRECTIVO</option>
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

        {/* Tabla con acumulados (siempre visible al final) */}
        <div className="overflow-x-auto border rounded-lg shadow">
          <table className="w-full text-[11px] border-collapse rounded-lg overflow-hidden">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-1 border text-center">Fecha Registro</th>
                <th className="p-1 border text-center">Placa</th>
                <th className="p-1 border text-center">Kilometraje</th>
                <th className="p-1 border text-center">Tipo Mantenimiento</th>
                <th className="p-1 border text-center">Actividad Realizada</th>
                <th className="p-1 border text-center">Repuestos Utilizados</th>
                <th className="p-1 border text-center">Empresa</th>
                <th className="p-1 border text-center">NIT</th>
                <th className="p-1 border text-center">Dirección</th>
                <th className="p-1 border text-center">Teléfono Empresa</th>
                <th className="p-1 border text-center">Nombre Técnico</th>
                <th className="p-1 border text-center">Teléfono Técnico</th>
                <th className="p-1 border text-center">Documento Técnico</th>
                <th className="p-1 border text-center">Tiempo Parada</th>
                <th className="p-1 border text-center">Factura</th>
                <th className="p-1 border text-center">Valor Repuestos</th>
                <th className="p-1 border text-center">Valor Mano Obra</th>
                <th className="p-1 border text-center">Costo Total</th>
                <th className="p-1 border text-center">Responsable</th>
                <th className="p-1 border text-center">Documento Responsable</th>
                <th className="p-1 border text-center">Cargo</th>
                <th className="p-1 border text-center">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((row, i) => (
                  <tr
                    key={i}
                    className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition"
                  >
                    <td className="p-1 border text-center">{row.fechaRegistro}</td>
                    <td className="p-1 border text-center">{row.placa}</td>
                    <td className="p-1 border text-center">{row.kilometraje}</td>
                    <td className="p-1 border text-center">{row.tipo}</td>
                    <td className="p-1 border text-center">{row.actividad}</td>
                    <td className="p-1 border text-center">{row.repuestos}</td>
                    <td className="p-1 border text-center">{row.empresa}</td>
                    <td className="p-1 border text-center">{row.nit}</td>
                    <td className="p-1 border text-center">{row.direccion}</td>
                    <td className="p-1 border text-center">{row.telefonoEmpresa}</td>
                    <td className="p-1 border text-center">{row.nombreTecnico}</td>
                    <td className="p-1 border text-center">{row.telefonoTecnico}</td>
                    <td className="p-1 border text-center">{row.documentoTecnico}</td>
                    <td className="p-1 border text-center">{row.tiempoParada}</td>
                    <td className="p-1 border text-center">{row.factura}</td>
                    <td className="p-1 border text-center">{row.valorRepuestos}</td>
                    <td className="p-1 border text-center">{row.valorManoObra}</td>
                    <td className="p-1 border text-center">{row.costoTotal}</td>
                    <td className="p-1 border text-center">{row.responsable}</td>
                    <td className="p-1 border text-center">{row.docResponsable}</td>
                    <td className="p-1 border text-center">{row.cargo}</td>
                    <td className="p-1 border text-center">{row.observaciones}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="22" className="text-center text-gray-500 p-2">
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {/* 🔹 Fila de acumulados SIEMPRE visible */}
              <tr className="bg-blue-600 text-white font-bold">
                <td colSpan="15" className="p-1 border text-center">
                  TOTAL ACUMULADO
                </td>
                <td className="p-1 border text-center">
                  {totalRepuestos.toLocaleString()}
                </td>
                <td className="p-1 border text-center">
                  {totalManoObra.toLocaleString()}
                </td>
                <td className="p-1 border text-center">
                  {totalCosto.toLocaleString()}
                </td>
                <td colSpan="4"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
