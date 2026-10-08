// components/admin/CampoCatalogo.jsx
'use client'

import { useEffect, useState } from 'react'

/**
 * Selector reutilizable de catálogos del CEA.
 * Conserva el nombre como valor para compatibilidad con campos de texto existentes.
 * Recibe nit del contexto de empresa; municipios requiere departamentoId.
 */
export default function CampoCatalogo({
  catalogo, label, name, value = '', onChange, nit,
  departamentoId, onOpcionesCargadas, required = true, disabled = false, wrapperClass = '',
}) {
  const [opciones, setOpciones] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controlador = new AbortController()
    if (!nit || (catalogo === 'municipios' && !departamentoId)) {
      setOpciones([])
      setError('')
      setCargando(false)
      return () => controlador.abort()
    }

    async function cargar() {
      setCargando(true)
      setError('')
      setOpciones([])
      try {
        const parametros = new URLSearchParams({ catalogo, nit: String(nit) })
        if (catalogo === 'municipios') parametros.set('departamento_id', String(departamentoId))
        const respuesta = await fetch(`/api/catalogos?${parametros.toString()}`, {
          signal: controlador.signal,
          cache: 'no-store',
        })
        const resultado = await respuesta.json()
        if (!respuesta.ok || resultado.status !== 'success') {
          throw new Error(resultado.message || 'No fue posible cargar las opciones.')
        }
        if (!controlador.signal.aborted) {
          setOpciones(resultado.data || [])
          onOpcionesCargadas?.(resultado.data || [])
        }
      } catch (err) {
        if (!controlador.signal.aborted) setError(err.message || 'Error consultando el catálogo.')
      } finally {
        if (!controlador.signal.aborted) setCargando(false)
      }
    }
    cargar()
    return () => controlador.abort()
  }, [catalogo, nit, departamentoId])

  const disponible = Boolean(nit) && (catalogo !== 'municipios' || Boolean(departamentoId))
  // Se conserva el valor previo aunque no figure en el catálogo activo, para no borrar registros históricos.
  const valorActual = String(value ?? '')
  const existe = opciones.some((item) => item.nombre === valorActual)

  return (
    <div className={wrapperClass}>
      <label htmlFor={name} className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <select
        id={name}
        name={name}
        value={valorActual}
        required={required}
        disabled={disabled || cargando || !disponible || Boolean(error)}
        onChange={onChange}
        className="w-full border border-slate-500 rounded-md p-2 text-sm bg-white focus:outline-none focus:border-[#194567] focus:ring-2 focus:ring-[#194567]/20"
      >
        <option value="">{!disponible ? 'Seleccione primero el departamento' : cargando ? 'Cargando...' : 'Seleccione'}</option>
        {valorActual && !existe && !cargando && <option value={valorActual}>{valorActual} (valor registrado)</option>}
        {opciones.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}
      </select>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
