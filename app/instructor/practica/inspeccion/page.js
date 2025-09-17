'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function InspeccionPage() {
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
        <h2 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2 border-b pb-2 text-[var(--primary)]">
          <i className="fas fa-clipboard-check text-[var(--primary)]"></i>
          Inspección Preoperacional
        </h2>

        {/* Usuario */}
        <div className="bg-gray-50 p-2 rounded mb-4 text-xs border text-center">
          Usuario: <strong>{user.nombreCompleto}</strong>
        </div>

        {/* Placa y Kilometraje en la misma fila */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <label className="block text-sm font-semibold mb-1">Placa del Vehículo</label>
            <select className="w-full border p-2 rounded text-sm h-10">
              <option value="">-- Seleccione la Placa --</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Kilometraje Actual</label>
            <input type="number" className="w-full border p-2 rounded text-sm h-10" min="0" />
          </div>
        </div>

        {/* Info del vehículo */}
        <div className="text-xs mb-6 px-2">
          <p><strong>Tipo de Vehículo:</strong> -</p>
          <p><strong>Marca:</strong> -</p>
        </div>

        {/* Secciones */}
        {[
          {
            id: 'revisionExterior',
            title: 'SECCIÓN 1: REVISIÓN EXTERIOR',
            desc: 'Verifique el estado, condiciones, cubiertas sin roturas, desgaste, piezas sueltas o en mal estado: Carrocería, en motos carenaje, faros, llantas, espejos, limpiaparabrisas.'
          },
          {
            id: 'motor',
            title: 'SECCIÓN 2: MOTOR',
            desc: 'Verificar que los niveles de los fluidos de los diferentes depósitos sean los adecuados, reportar si se ven fugas: Aceite del motor, Líquido de frenos, Líquido refrigerante, Aceite dirección hidráulica, Liquido limpiaparabrisas, Liquido Batería, Bornes y estado de la Batería, verificar estado general, tensión y alineación con las poleas de la correa de accesorios, en motos tensión, lubricación, desgaste y limpieza de la cadena.'
          },
          {
            id: 'interiorFuncionamiento',
            title: 'SECCIÓN 3: INTERIOR Y FUNCIONAMIENTO',
            desc: 'Revisar si aplica: Cinturones, Anclajes y estado de asientos, luces, tablero de instrumentos.'
          },
          {
            id: 'equiposPrevencion',
            title: 'SECCIÓN 4: EQUIPOS DE PREVENCIÓN Y SEGURIDAD',
            desc: 'Verificar estado y funcionamiento de los elementos y que sean aptos para el vehículo si aplica: Kit carretera, casco, señalización, banderín.'
          },
          {
            id: 'documentos',
            title: 'SECCIÓN 5: DOCUMENTOS',
            desc: 'Verifique que se encuentren físicamente, en caso de poder presentarlos digitalmente cerciórese que puede acceder a esta información. Además verifique su vigencia: SOAT, RTM, Licencia, tarjeta de servicio, certificado de instructor, cédula.'
          }
        ].map((section) => (
          <div key={section.id} className="bg-gray-50 border border-gray-300 rounded-lg mb-4 shadow-sm">
            
            {/* Franja de título */}
            <div className="bg-black text-white text-sm font-semibold px-3 py-2 rounded-t-lg">
              {section.title}
            </div>

            <div className="p-3">
              <p className="text-xs text-gray-700 mb-2">{section.desc}</p>
              <div className="flex gap-6 text-sm">
                <label>
                  <input type="radio" name={section.id} value="CONFORME" className="mr-1" /> CONFORME
                </label>
                <label>
                  <input type="radio" name={section.id} value="NO CONFORME" className="mr-1" /> NO CONFORME
                </label>
              </div>
            </div>
          </div>
        ))}

        {/* Observaciones */}
        <div className="mt-4">
          <label className="block mb-1 font-semibold text-sm">Observaciones</label>
          <textarea rows="3" className="w-full border p-2 rounded text-sm"></textarea>
        </div>

        {/* Botones finales */}
        <div className="mt-8 space-y-4">
          {/* Guardar centrado */}
          <div className="flex justify-center">
            <button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] 
                              text-white py-2 px-6 rounded-lg shadow-md 
                              flex items-center gap-2 text-sm">
              <i className="fas fa-save"></i> Guardar
            </button>
          </div>

          {/* Regresar y Cerrar sesión en otra fila centrados */}
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/instructor/practica')}
              className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 
                         rounded-lg shadow-md flex items-center gap-2 text-sm"
            >
              <i className="fas fa-arrow-left"></i> Regresar
            </button>
            <button
              onClick={handleLogout}
              className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 px-4 
                         rounded-lg shadow-md flex items-center gap-2 text-sm"
            >
              <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}