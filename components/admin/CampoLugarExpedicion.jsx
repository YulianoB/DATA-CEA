'use client'

import { useEffect, useId, useState } from 'react'

// Sugerencias provenientes de public.municipios.
// El catálogo no certifica la existencia de una sede de Registraduría.
export default function CampoLugarExpedicion({ value = '', onChange, nit, disabled = false }) {
  const [opciones, setOpciones] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const listId = useId()

  useEffect(() => {
    const termino = String(value || '').trim()
    if (!nit || termino.length < 2) {
      setOpciones([])
      setError('')
      return
    }
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setCargando(true)
        setError('')
        const params = new URLSearchParams({
          catalogo: 'municipios',
          buscar: termino,
          nit: String(nit),
        })
        const res = await fetch(`/api/catalogos?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        const json = await res.json()
        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message || 'No se pudieron consultar municipios.')
        }
        if (!controller.signal.aborted) {
          const nombres = [...new Set((json.data || []).map(item => item.nombre).filter(Boolean))]
          setOpciones(nombres)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setOpciones([])
          setError(err.message || 'No se pudieron consultar municipios.')
        }
      } finally {
        if (!controller.signal.aborted) setCargando(false)
      }
    }, 250)
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [nit, value])

  return (
    <div>
      <label htmlFor={listId + '-input'} className="block text-[11px] font-semibold mb-1">
        Lugar de expedición
      </label>
      <input
        id={listId + '-input'}
        list={listId}
        type="text"
        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="Escriba el municipio"
        autoComplete="off"
        disabled={disabled}
      />
      <datalist id={listId}>
        {opciones.map(nombre => <option key={nombre} value={nombre} />)}
      </datalist>
      {cargando && <span className="text-[10px] text-slate-500">Buscando...</span>}
      {error && <p className="text-[10px] text-amber-700">{error}</p>}
    </div>
  )
}
