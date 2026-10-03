// app/admin/sinst-vigia/certificacion/[id]/page.jsx

'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2, Printer } from 'lucide-react'

function texto(valor) {
  return String(valor ?? '').trim()
}

export default function CertificacionSinstPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id
  const nit = searchParams.get('nit') || ''
  const [evidencia, setEvidencia] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    async function cargar() {
      try {
        setCargando(true)
        setError('')
        const respuesta = await fetch(`/api/admin/sinst-vigia/evidencias?id=${encodeURIComponent(id)}&nit=${encodeURIComponent(nit)}`, {
          headers: { 'x-cea-nit': nit },
          cache: 'no-store',
        })
        const resultado = await respuesta.json()
        if (!respuesta.ok || !resultado?.ok) throw new Error(resultado?.error || resultado?.message || 'No fue posible cargar la certificación.')
        const registro = resultado?.evidencia || resultado?.evidencias?.[0] || null
        if (!registro) throw new Error('No se encontró la certificación solicitada.')
        if (activo) {
          setEvidencia(registro)
          setEmpresa(resultado?.empresa || null)
        }
      } catch (err) {
        if (activo) setError(err?.message || 'No fue posible cargar la certificación.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    if (id && nit) cargar()
    else { setError('No fue posible identificar la certificación o el CEA.'); setCargando(false) }
    return () => { activo = false }
  }, [id, nit])

  if (cargando) return <div className="flex min-h-screen items-center justify-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Cargando certificación...</div>
  if (error) return <div className="mx-auto mt-12 max-w-2xl rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"><AlertCircle className="mb-2 h-5 w-5" />{error}</div>

  const c = evidencia?.contenido || {}
  const nombreEmpresa = empresa?.nombre || empresa?.nombre_empresa || empresa?.razon_social || 'CEA'
  const procesos = c.existen_procesos_juridicos === 'SI'
  const fondo = c.existe_fondo_accidentes === 'SI'

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[850px] justify-end print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"><Printer className="h-4 w-4" />Imprimir / Guardar PDF</button>
      </div>

      <article className="mx-auto min-h-[1050px] max-w-[850px] bg-white p-12 text-[13px] leading-6 text-slate-900 shadow print:min-h-0 print:max-w-none print:p-8 print:shadow-none">
        <header className="border-b-2 border-slate-700 pb-5 text-center">
          <h1 className="text-lg font-bold uppercase">Certificación de clasificación del nivel de diseño e implementación del PESV</h1>
          <p className="mt-1 font-semibold uppercase">y justificación de aplicabilidad de evidencias SINST - VIGIA 2</p>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 rounded border border-slate-300 p-4">
          <p><strong>Organización:</strong> {nombreEmpresa}</p>
          <p><strong>NIT:</strong> {nit}</p>
          <p><strong>Vigencia:</strong> {evidencia?.anio}</p>
          <p><strong>Trimestre:</strong> {evidencia?.trimestre}</p>
          <p><strong>Nivel PESV:</strong> {texto(c.nivel_pesv) || 'Básico'}</p>
          <p><strong>Actividad económica:</strong> {texto(c.actividad_economica) || '—'}</p>
          <p><strong>Número de vehículos:</strong> {texto(c.numero_vehiculos) || '—'}</p>
          <p><strong>Número de conductores:</strong> {texto(c.numero_conductores) || '—'}</p>
        </section>

        <section className="mt-7">
          <h2 className="font-bold uppercase">Certificación</h2>
          <p className="mt-3 text-justify">Quien suscribe, <strong>{texto(c.representante_legal) || 'RESPONSABLE'}</strong>, deja constancia de que la información contenida en el presente documento fue revisada para el período indicado y corresponde a la clasificación y condiciones declaradas por la organización para la gestión de su Plan Estratégico de Seguridad Vial.</p>
          <p className="mt-3 text-justify">La organización desarrolla la actividad económica indicada anteriormente y registra para esta certificación la cantidad de vehículos y conductores señalada en la información general. La clasificación consignada se sustenta en la metodología aplicable al diseño e implementación del PESV.</p>
        </section>

        <section className="mt-7">
          <h2 className="font-bold uppercase">Fundamento normativo registrado</h2>
          <p className="mt-3 text-justify">{evidencia?.fundamento_normativo || '—'}</p>
        </section>

        <section className="mt-7">
          <h2 className="font-bold uppercase">Evidencias relacionadas</h2>
          <p className="mt-3"><strong>A-5.</strong> Detalle de cuentas a nivel de terceros de los costos directos e indirectos ocasionados por los accidentes.</p>
          <p className="mt-2"><strong>A-6.</strong> Informe jurídico de procesos en contra de la empresa por siniestros viales, incluidos los derivados de desplazamientos laborales, y fondo para accidentes si existe.</p>
          <p className="mt-2"><strong>A-7.</strong> Detalle de provisiones derivadas de demandas por accidentes.</p>
        </section>

        <section className="mt-7 rounded border border-slate-300 p-4">
          <h2 className="font-bold uppercase">Declaración sobre procesos jurídicos y fondo para accidentes</h2>
          <p className="mt-3"><strong>Procesos jurídicos asociados a siniestros viales:</strong> {procesos ? 'Sí' : 'No'}.</p>
          {procesos && <p className="mt-2 whitespace-pre-wrap text-justify"><strong>Descripción:</strong> {texto(c.descripcion_procesos) || 'No registrada.'}</p>}
          <p className="mt-3"><strong>Fondo para accidentes:</strong> {fondo ? 'Sí' : 'No'}.</p>
          {fondo && <p className="mt-2"><strong>Monto declarado:</strong> {texto(c.monto_fondo_accidentes) || 'No registrado.'}</p>}
        </section>

        <section className="mt-7">
          <h2 className="font-bold uppercase">Justificación registrada</h2>
          <p className="mt-3 text-justify">{evidencia?.justificacion || '—'}</p>
        </section>

        <footer className="mt-16">
          <div className="w-80 border-t border-slate-800 pt-2">
            <p className="font-bold">{texto(c.representante_legal) || 'RESPONSABLE'}</p>
            <p>Representante legal / responsable que revisa</p>
          </div>
          <p className="mt-6 text-[10px] text-slate-500">Documento reconstruido por DATA-CEA a partir de la información estructurada registrada para esta evidencia. Estado documental: {evidencia?.estado || 'BORRADOR'}.</p>
        </footer>
      </article>

      <style jsx global>{`
        @page { size: letter; margin: 12mm; }
        @media print { body { background: white !important; } }
      `}</style>
    </main>
  )
}
