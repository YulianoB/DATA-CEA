'use client'

import { useEffect, useId, useState } from 'react'

export default function CampoMunicipioBusqueda({ nit, departamentoId, value = '', onChange, className = '', disabled = false }) {
  const [municipios, setMunicipios] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const listId = useId()

  useEffect(() => {
    const controller = new AbortController()
    setMunicipios([])
    setError('')
    if (!nit || !departamentoId) return () => controller.abort()

    async function cargar() {
      setCargando(true)
      try {
        const params = new URLSearchParams({
          catalogo: 'municipios',
          departamento_id: String(departamentoId),
          nit: String(nit),
        })
        const response = await fetch(`/api/catalogos?${params}`, { signal: controller.signal, cache: 'no-store' })
        const json = await response.json()
        if (!response.ok || json.status !== 'success') throw new Error(json.message || 'No se pudieron cargar los municipios.')
        if (!controller.signal.aborted) setMunicipios(json.data || [])
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || 'Error consultando municipios.')
      } finally {
        if (!controller.signal.aborted) setCargando(false)
      }
    }
    cargar()
    return () => controller.abort()
  }, [nit, departamentoId])

  return (
    <div>
      <label htmlFor={listId + '-input'} className="block text-[11px] font-semibold mb-1">Ciudad / Municipio</label>
      <input
        id={listId + '-input'}
        list={listId}
        className={className || 'w-full border border-gray-700 rounded px-2 py-1 text-xs'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={departamentoId ? 'Escriba para buscar municipio' : 'Seleccione primero el departamento'}
        disabled={disabled || !departamentoId || cargando}
        autoComplete="off"
      />
      <datalist id={listId}>
        {municipios.map((municipio) => (
          <option key={municipio.id} value={municipio.nombre} />
        ))}
      </datalist>
      {cargando && <p className="mt-1 text-[11px] text-gray-500">Cargando municipios...</p>}
      {error && <p role="alert" className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
