'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SiniestrosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    placa: '',
    tipoSiniestro: '',
  })
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [showModal, setShowModal] = useState(false)

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
      setStatus('❌ Error al consultar siniestros.')
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
      tipoSiniestro: '',
    })
    setData([])
    setStatus('')
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4">
        {/* Título */}
        <h2 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2 text-[var(--primary)] border-b pb-2">
          <i className="fas fa-car-crash text-[var(--primary)]"></i>
          Consultar Siniestros Registrados
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
                <option value="">Toda la Flota</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1">Tipo de Siniestro</label>
              <select
                name="tipoSiniestro"
                value={filters.tipoSiniestro}
                onChange={handleChange}
                className="p-1 text-xs rounded border border-gray-300 text-gray-800 bg-white"
              >
                <option value="">Todos</option>
                <option value="Atropello">Atropello</option>
                <option value="Choque">Choque</option>
                <option value="Colisión">Colisión</option>
                <option value="Vuelco">Vuelco</option>
                <option value="Características Especiales">Características Especiales</option>
                <option value="Caída">Caída</option>
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

        {/* Tabla */}
        <div className="overflow-x-auto border rounded-lg shadow">
          <table className="w-full text-[11px] border-collapse rounded-lg overflow-hidden">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-1 border text-center">Consecutivo</th>
                <th className="p-1 border text-center">Fecha</th>
                <th className="p-1 border text-center">Tipo</th>
                <th className="p-1 border text-center"># Personas</th>
                <th className="p-1 border text-center">Leves</th>
                <th className="p-1 border text-center">Graves</th>
                <th className="p-1 border text-center">Fatalidades</th>
                <th className="p-1 border text-center">Placa</th>
                <th className="p-1 border text-center">Conductor</th>
                <th className="p-1 border text-center">Documento</th>
                <th className="p-1 border text-center">Resumen</th>
                <th className="p-1 border text-center">Estado</th>
                <th className="p-1 border text-center">IPAT</th>
                <th className="p-1 border text-center">Autoridad</th>
                <th className="p-1 border text-center">Costos Dir. Choque</th>
                <th className="p-1 border text-center">Costos Ind. Choque</th>
                <th className="p-1 border text-center">Costos Dir. Leves</th>
                <th className="p-1 border text-center">Costos Ind. Leves</th>
                <th className="p-1 border text-center">Costos Dir. Graves</th>
                <th className="p-1 border text-center">Costos Ind. Graves</th>
                <th className="p-1 border text-center">Costos Dir. Fatales</th>
                <th className="p-1 border text-center">Costos Ind. Fatales</th>
                <th className="p-1 border text-center">F. En Análisis</th>
                <th className="p-1 border text-center">Usuario Análisis</th>
                <th className="p-1 border text-center">F. Cerrado</th>
                <th className="p-1 border text-center">Usuario Cerrado</th>
                <th className="p-1 border text-center">Resumen Análisis</th>
                <th className="p-1 border text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((row, i) => (
                  <tr
                    key={i}
                    className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition"
                  >
                    <td className="p-1 border text-center">{row.consecutivo}</td>
                    <td className="p-1 border text-center">{row.fecha}</td>
                    <td className="p-1 border text-center">{row.tipo}</td>
                    <td className="p-1 border text-center">{row.numPersonas}</td>
                    <td className="p-1 border text-center">{row.leves}</td>
                    <td className="p-1 border text-center">{row.graves}</td>
                    <td className="p-1 border text-center">{row.fatalidades}</td>
                    <td className="p-1 border text-center">{row.placa}</td>
                    <td className="p-1 border text-center">{row.conductor}</td>
                    <td className="p-1 border text-center">{row.documento}</td>
                    <td className="p-1 border text-center">{row.resumen}</td>
                    <td className="p-1 border text-center">{row.estado}</td>
                    <td className="p-1 border text-center">{row.ipat}</td>
                    <td className="p-1 border text-center">{row.autoridad}</td>
                    <td className="p-1 border text-center">{row.costosDirChoque}</td>
                    <td className="p-1 border text-center">{row.costosIndChoque}</td>
                    <td className="p-1 border text-center">{row.costosDirLeves}</td>
                    <td className="p-1 border text-center">{row.costosIndLeves}</td>
                    <td className="p-1 border text-center">{row.costosDirGraves}</td>
                    <td className="p-1 border text-center">{row.costosIndGraves}</td>
                    <td className="p-1 border text-center">{row.costosDirFatales}</td>
                    <td className="p-1 border text-center">{row.costosIndFatales}</td>
                    <td className="p-1 border text-center">{row.fechaAnalisis}</td>
                    <td className="p-1 border text-center">{row.usuarioAnalisis}</td>
                    <td className="p-1 border text-center">{row.fechaCierre}</td>
                    <td className="p-1 border text-center">{row.usuarioCierre}</td>
                    <td className="p-1 border text-center">{row.resumenAnalisis}</td>
                    <td className="p-1 border text-center">
                      <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs hover:bg-blue-800"
                      >
                        Cerrar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="28" className="text-center text-gray-500 p-2">
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de cierre */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-lg w-full relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
            >
              ✖
            </button>
            <h3 className="text-lg font-bold mb-2">Finalizar Análisis de Siniestro</h3>
            <p className="text-sm mb-2">
              Ingresa los detalles finales del análisis. <strong>Resumen de Análisis es obligatorio.</strong>
            </p>

            <textarea
              className="w-full border rounded p-2 text-sm mb-2"
              rows="3"
              placeholder="Resumen de Análisis..."
            />

            <div className="grid grid-cols-2 gap-2 text-sm">
              <input type="text" placeholder="Número IPAT" className="border rounded p-1" />
              <input type="text" placeholder="Autoridad de Tránsito" className="border rounded p-1" />
              <input type="number" placeholder="Costos Dir. Choque" className="border rounded p-1" />
              <input type="number" placeholder="Costos Ind. Choque" className="border rounded p-1" />
              <input type="number" placeholder="Costos Dir. Leves" className="border rounded p-1" />
              <input type="number" placeholder="Costos Ind. Leves" className="border rounded p-1" />
              <input type="number" placeholder="Costos Dir. Graves" className="border rounded p-1" />
              <input type="number" placeholder="Costos Ind. Graves" className="border rounded p-1" />
              <input type="number" placeholder="Costos Dir. Fatales" className="border rounded p-1" />
              <input type="number" placeholder="Costos Ind. Fatales" className="border rounded p-1" />
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <button className="bg-green-600 hover:bg-green-800 text-white px-3 py-1 rounded text-sm">
                Guardar y Cerrar
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-500 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
