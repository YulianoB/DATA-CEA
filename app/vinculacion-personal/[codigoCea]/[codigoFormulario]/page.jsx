'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function VinculacionPersonalPage() {
  const { codigoCea, codigoFormulario } = useParams()
  const [estado, setEstado] = useState({ cargando: true, titulo: '', cea: '', error: '' })

  useEffect(() => {
    let vigente = true
    const controller = new AbortController()
    async function verificar() {
      try {
        const query = new URLSearchParams({
          cea: String(codigoCea || ''),
          formulario: String(codigoFormulario || ''),
        })
        const respuesta = await fetch('/api/public/personal/formulario?' + query.toString(), {
          cache: 'no-store',
          signal: controller.signal,
        })
        const resultado = await respuesta.json()
        if (!vigente) return
        if (!respuesta.ok || !resultado.disponible) {
          setEstado({ cargando: false, titulo: '', cea: '', error: resultado.mensaje || 'Enlace no disponible.' })
          return
        }
        setEstado({ cargando: false, titulo: resultado.titulo, cea: resultado.cea, error: '' })
      } catch (error) {
        if (vigente && error.name !== 'AbortError') {
          setEstado({ cargando: false, titulo: '', cea: '', error: 'No fue posible verificar el enlace. Intenta de nuevo más tarde.' })
        }
      }
    }
    if (codigoCea && codigoFormulario) verificar()
    return () => { vigente = false; controller.abort() }
  }, [codigoCea, codigoFormulario])

  return (
    <main style={{ minHeight: '100vh', background: '#f6f8fb', padding: '48px 16px' }}>
      <section style={{ maxWidth: 640, margin: '0 auto', padding: 32, background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb' }}>
        <h1 style={{ marginTop: 0, fontSize: 26 }}>Información del personal</h1>
        {estado.cargando ? (
          <p role="status">Verificando enlace del formulario...</p>
        ) : estado.error ? (
          <p role="alert" style={{ color: '#a11' }}>{estado.error}</p>
        ) : (
          <>
            <h2 style={{ fontSize: 20 }}>{estado.titulo}</h2>
            <p>{estado.cea}</p>
            <p role="status">El enlace está habilitado. El diligenciamiento estará disponible cuando finalice la implementación del guardado y la recuperación segura.</p>
            <p>No envíes datos personales por este medio todavía.</p>
          </>
        )}
      </section>
    </main>
  )
}
