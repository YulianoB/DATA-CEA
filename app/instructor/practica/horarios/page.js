'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function HorariosPracticaPage() {
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
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6">
        {/* Título */}
        <h2 className="text-2xl font-bold mb-4 text-center flex items-center justify-center gap-2 border-b pb-3 text-[var(--primary)]">
          <i className="fas fa-calendar-alt text-[var(--primary)]"></i>
          Registro de Horarios - Instructor Práctica
        </h2>

        {/* Usuario */}
        <div className="bg-gray-50 p-2 rounded mb-4 text-xs border text-center">
          Usuario: <strong>{user.nombreCompleto}</strong>
        </div>

        {/* Mensaje estado */}
        <div
          id="practica-status-message"
          className="min-h-[1.5em] text-center font-semibold text-sm mb-4"
        ></div>

        {/* Estado Inspección */}
        <div
          id="practicaInspectionStatusArea"
          className="hidden bg-yellow-100 border border-dashed border-yellow-400 rounded-md p-3 text-sm mb-6"
        >
          <p>
            <strong>Estado Inspección Hoy:</strong>{' '}
            <span id="practicaInspectionStatusMessage">-</span>
          </p>
        </div>

        {/* Registrar Entrada */}
        <div className="border rounded-lg shadow-sm mb-8">
          <h3 className="bg-[var(--primary-dark)] text-white font-semibold px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm">
            <i className="fas fa-sign-in-alt text-green-300"></i> Registrar Horario de Entrada
          </h3>

          <div className="p-4 space-y-4">
            {/* Placa */}
            <div>
              <label className="block mb-1 font-semibold text-sm">Placa del Vehículo</label>
              <select
                id="practicaEntryPlaca"
                className="w-full border p-2 rounded text-sm"
                required
              >
                <option value="">-- Seleccione la Placa --</option>
              </select>
              <small
                id="practicaEntryPlacaValidation"
                className="text-red-600 text-xs hidden"
              >
                Debe seleccionar una placa.
              </small>
            </div>

            {/* Datos del vehículo */}
            <div className="text-xs bg-gray-50 border rounded p-2">
              <p>
                <strong>Tipo de Vehículo:</strong>{' '}
                <span id="practicaTipoVehiculoDisplay">-</span>
              </p>
              <p>
                <strong>Marca:</strong> <span id="practicaMarcaDisplay">-</span>
              </p>
            </div>

            {/* Km Inicial + Clases Programadas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-semibold text-sm">Kilometraje Inicial</label>
                <input
                  type="number"
                  id="practicaEntryKmInicial"
                  className="w-full border p-2 rounded text-sm"
                  min="0"
                  required
                />
                <small
                  id="practicaEntryKmInicialValidation"
                  className="text-red-600 text-xs hidden"
                >
                  El kilometraje inicial es requerido y debe ser válido (≥ 0).
                </small>
              </div>
              <div>
                <label className="block mb-1 font-semibold text-sm">Clases Programadas</label>
                <input
                  type="number"
                  id="practicaEntryClasesProgramadas"
                  className="w-full border p-2 rounded text-sm"
                  min="1"
                  required
                />
                <small
                  id="practicaEntryClasesProgramadasValidation"
                  className="text-red-600 text-xs hidden"
                >
                  Debes ingresar un número válido de clases programadas (≥ 1).
                </small>
              </div>
            </div>

            {/* Botón entrada */}
            <div className="flex justify-center">
              <button
                id="btnRegistrarEntradaPractica"
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-2 px-6 rounded-lg shadow-md text-sm"
              >
                Registrar Entrada
              </button>
            </div>
          </div>
        </div>

        {/* Registrar Salida */}
        <div className="border rounded-lg shadow-sm">
          <h3 className="bg-[var(--primary-dark)] text-white font-semibold px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm">
            <i className="fas fa-sign-out-alt text-red-300"></i> Registrar Horario de Salida
          </h3>

          <div className="p-4 space-y-4">
            {/* Datos de entrada */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 border rounded p-2">
              <p>
                <strong>Fecha Entrada:</strong>{' '}
                <span id="practicaFechaEntradaDisplay">-</span>
              </p>
              <p>
                <strong>Hora Entrada:</strong>{' '}
                <span id="practicaHoraEntradaDisplay">-</span>
              </p>
              <p>
                <strong>Placa:</strong> <span id="practicaPlacaDisplay">-</span>
              </p>
              <p>
                <strong>Km Inicial:</strong> <span id="practicaKmInicialDisplay">-</span>
              </p>
              <p>
                <strong>Clases Programadas:</strong>{' '}
                <span id="practicaClasesProgramadasDisplay">-</span>
              </p>
            </div>

            {/* Inputs salida */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 font-semibold text-sm">Kilometraje Final</label>
                <input
                  type="number"
                  id="practicaKmFinal"
                  className="w-full border p-2 rounded text-sm"
                  min="0"
                  required
                />
                <small
                  id="practicaKmFinalValidation"
                  className="text-red-600 text-xs hidden"
                >
                  El kilometraje final es requerido y debe ser válido (≥ 0).
                </small>
              </div>
              <div>
                <label className="block mb-1 font-semibold text-sm">Clases Dictadas</label>
                <input
                  type="number"
                  id="practicaClasesDictadas"
                  className="w-full border p-2 rounded text-sm"
                  min="0"
                  required
                />
                <small
                  id="practicaClasesValidation"
                  className="text-red-600 text-xs hidden"
                >
                  Debe ser un número válido ≥ 0.
                </small>
              </div>
              <div>
                <label className="block mb-1 font-semibold text-sm">Número de Aprendices</label>
                <input
                  type="number"
                  id="practicaNumAprendices"
                  className="w-full border p-2 rounded text-sm"
                  min="0"
                  required
                />
                <small
                  id="practicaAprendicesValidation"
                  className="text-red-600 text-xs hidden"
                >
                  Debe ser un número válido ≥ 0.
                </small>
              </div>
            </div>

            {/* Hidden fields */}
            <input type="hidden" id="practicaHiddenEntryId" />
            <input type="hidden" id="practicaHiddenPlaca" />
            <input type="hidden" id="practicaHiddenKmInicial" />
            <input type="hidden" id="practicaHiddenEntryTimestamp" />
            <input type="hidden" id="practicaHiddenClasesProgramadas" />

            {/* Botón salida */}
            <div className="flex justify-center">
              <button
                id="btnRegistrarSalidaPractica"
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-2 px-6 rounded-lg shadow-md text-sm"
              >
                Registrar Salida
              </button>
            </div>
          </div>
        </div>

        {/* Botones finales */}
        <div className="flex justify-center gap-4 mt-8">
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
