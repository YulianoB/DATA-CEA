'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TestPage() {
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => {
    async function fetchUsuarios() {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, usuario, nombre_completo, rol, estado')

      if (error) {
        console.error("Error consultando usuarios:", error)
      } else {
        console.log("Usuarios recibidos:", data)
        setUsuarios(data)
      }
    }

    fetchUsuarios()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Prueba conexión Supabase</h1>
      <ul className="mt-4 list-disc list-inside">
        {usuarios.map((u) => (
          <li key={u.id}>
            {u.nombre_completo} ({u.usuario}) - {u.rol} [{u.estado}]
          </li>
        ))}
      </ul>
    </div>
  )
}
