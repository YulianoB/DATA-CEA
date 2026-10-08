'use client'

import { useEffect, useState } from 'react'

export default function VistaPreviaPdfLimpia({ url }) {
  const [paginas, setPaginas] = useState([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    let tarea = null
    const ejecutar = async () => {
      setCargando(true)
      setError('')
      setPaginas([])
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
        const respuesta = await fetch(url)
        if (!respuesta.ok) throw new Error('No se pudo abrir el PDF.')
        const bytes = await respuesta.arrayBuffer()
        tarea = pdfjs.getDocument({ data: bytes })
        const pdf = await tarea.promise
        const imagenes = []
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelado) return
          const pagina = await pdf.getPage(i)
          const viewport = pagina.getViewport({ scale: 2 })
          const canvas = document.createElement('canvas')
          canvas.width = Math.ceil(viewport.width)
          canvas.height = Math.ceil(viewport.height)
          const contexto = canvas.getContext('2d', { alpha: false })
          if (!contexto) throw new Error('No fue posible visualizar el documento.')
          await pagina.render({ canvasContext: contexto, viewport }).promise
          imagenes.push({ numero: i, src: canvas.toDataURL('image/png') })
          pagina.cleanup()
        }
        if (!cancelado) setPaginas(imagenes)
      } catch (e) {
        if (!cancelado) setError(e.message || 'No fue posible mostrar la vista previa.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }
    ejecutar()
    return () => { cancelado = true; if (tarea) tarea.destroy().catch(() => {}) }
  }, [url])

  if (cargando) return <div className="py-12 text-center text-sm text-slate-600">Preparando vista previa...</div>
  if (error) return <div role="alert" className="p-6 text-center text-sm text-red-700">{error}</div>
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto bg-slate-100 px-3 py-5">
      {paginas.map((pagina) => (
        <img key={pagina.numero} src={pagina.src} alt={`Hoja de vida, página ${pagina.numero}`} className="block h-auto w-full max-w-[816px] bg-white shadow-md" />
      ))}
    </div>
  )
}
