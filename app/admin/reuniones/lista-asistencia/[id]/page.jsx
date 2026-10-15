'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Printer, X } from 'lucide-react'
import { BotonImprimir, BotonCancelar, ESTILO_ENCABEZADO_TABLA } from '@/components/admin/EstiloModulo'

const texto = (v) => String(v ?? '').trim()
function Encabezado({ encabezado, documento, logo }) {
  const e = encabezado?.estructura || {}
  const filas = Number(encabezado?.filas || e.filas?.length || 0)
  const columnas = Number(encabezado?.columnas || e.columnas?.length || 0)
  if (!filas || !columnas || !Array.isArray(e.celdas)) return null
  const celdas = new Map(e.celdas.map(c => [`${c.fila}-${c.columna}`, c]))
  const ocupadas = new Set()
  const valores = {
    NOMBRE_DOCUMENTO: documento?.nombre_documento || 'LISTA DE ASISTENCIA',
    CODIGO: documento?.codigo, FECHA_EDICION: documento?.fecha_edicion,
    VERSION: documento?.version, VIGENCIA: documento?.vigencia,
    PAGINACION: 'Página 1', TEXTO: null,
  }
  return <table className="cabecera"><colgroup>{Array.from({ length: columnas }, (_, i) => <col key={i} style={{ width: `${100 / columnas}%` }}/>)}</colgroup><tbody>
    {Array.from({ length: filas }, (_, f) => <tr key={f}>{Array.from({ length: columnas }, (_, c) => {
      const clave = `${f + 1}-${c + 1}`
      if (ocupadas.has(clave)) return null
      const celda = celdas.get(clave)
      if (!celda) return <td key={c}/>
      const rs = Math.min(Number(celda.rowSpan) || 1, filas - f)
      const cs = Math.min(Number(celda.colSpan) || 1, columnas - c)
      for (let i = f; i < f + rs; i++) for (let j = c; j < c + cs; j++) if (i !== f || j !== c) ocupadas.add(`${i + 1}-${j + 1}`)
      return <td key={c} rowSpan={rs} colSpan={cs} style={{ textAlign: celda.alineacion_horizontal || 'center', verticalAlign: celda.alineacion_vertical || 'middle', borderTop: celda.borde_superior === false ? 'none' : undefined, borderBottom: celda.borde_inferior === false ? 'none' : undefined, borderLeft: celda.borde_izquierdo === false ? 'none' : undefined, borderRight: celda.borde_derecho === false ? 'none' : undefined }}>
        {(celda.elementos || []).map((el, idx) => <div key={idx} style={{ fontSize: `${Number(el.tamano_fuente) || 9}pt`, fontWeight: el.negrita ? 'bold' : 'normal' }}>
          {el.tipo === 'LOGO' ? (logo ? <img src={logo} alt="Logo CEA" style={{ maxWidth: '100%', maxHeight: 65, objectFit: 'contain' }}/> : null) : <>{texto(el.prefijo)}{el.prefijo ? ' ' : ''}{el.tipo === 'TEXTO' ? texto(el.valor) : texto(valores[el.tipo])}</>}
        </div>)}
      </td>
    })}</tr>)}
  </tbody></table>
}
export default function ListaAsistencia() {
  const { id } = useParams()
  const search = useSearchParams()
  const nit = search.get('nit') || ''
  const [datos, setDatos] = useState(null)
  const [config, setConfig] = useState(null)
  const [logo, setLogo] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!id || !nit) { setError('No se identificó el CEA.'); return }
    let activo = true
    const headers = { 'x-cea-nit': nit }
    Promise.all([
      fetch(`/api/reuniones/${encodeURIComponent(id)}/lista-asistencia?nit=${encodeURIComponent(nit)}`, { headers, cache: 'no-store' }),
      fetch(`/api/admin/configuracion-documentos?nit=${encodeURIComponent(nit)}`, { headers, cache: 'no-store' }),
      fetch(`/api/admin/configuracion-academica/logo?nit=${encodeURIComponent(nit)}`, { headers, cache: 'no-store' }).catch(() => null),
    ]).then(async ([a,b,c]) => {
      const da = await a.json(), db = await b.json()
      if (!a.ok || !da.ok) throw new Error(da.error || da.message || 'No se pudo consultar la reunión.')
      if (!b.ok || !db.ok) throw new Error(db.error || 'No se pudo consultar la configuración documental.')
      const doc = (db.documentos || []).find(d => texto(d.nombre_documento).toUpperCase() === 'LISTA DE ASISTENCIA' && d.activo !== false)
      if (!doc) throw new Error('Configure y active el documento LISTA DE ASISTENCIA antes de imprimir.')
      if (!db.encabezado?.estructura) throw new Error('No se encontró el encabezado documental del CEA.')
      if (activo) { setDatos(da); setConfig({ encabezado: db.encabezado, documento: doc }) }
      if (c?.ok) { const ld = await c.json().catch(() => null); if (activo) setLogo(texto(ld?.logo?.actual || ld?.logo?.url || ld?.logo_url || ld?.url)) }
    }).catch(e => { if (activo) setError(e.message) })
    return () => { activo = false }
  }, [id, nit])
  const r = datos?.reunion
  const fechaArchivo = texto(r?.fecha_programada).slice(0, 10)
  const nombreArchivo = `Lista de asistencia - ${fechaArchivo || 'sin fecha'}`
  useEffect(() => {
    const tituloAnterior = document.title
    if (r) document.title = nombreArchivo
    return () => { document.title = tituloAnterior }
  }, [r, nombreArchivo])
  return <main className="vista-previa">
    <style>{`@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}html,body{margin:0;padding:0}body{background:#e8edf2}.vista-previa{max-width:240mm;margin:22px auto;padding:18px;background:#f1f5f9;border:1px solid #d6dfe8;border-radius:12px}.documento{width:100%;max-width:210mm;margin:0 auto;padding:12mm;background:white;color:#111;font-family:Arial,sans-serif;font-size:9pt;box-shadow:0 2px 12px rgba(15,23,42,.10)}.cabecera,.datos,.asistentes{width:calc(100% - 2px);max-width:calc(100% - 2px);border-collapse:separate;border-spacing:0;table-layout:fixed;border:1px solid #666}.cabecera td,.datos td,.asistentes th,.asistentes td{border:0!important;border-right:1px solid #777!important;border-bottom:1px solid #777!important}.cabecera tr>*:last-child,.datos tr>*:last-child,.asistentes tr>*:last-child{border-right:0!important}.cabecera tr:last-child>*,.datos tr:last-child>*,.asistentes tr:last-child>*{border-bottom:0!important}.asistentes thead th{border-bottom:1px solid #777!important}.asistentes thead th:last-child{border-right:1px solid #777!important}.asistentes thead tr:last-child th{border-bottom:1px solid #777!important}.asistentes{border-collapse:collapse!important;border-spacing:0!important;border:1px solid #777!important}.asistentes thead th,.asistentes tbody td{border:1px solid #777!important}.asistentes thead th:last-child,.asistentes tbody td:last-child{border-right:1px solid #777!important}.asistentes thead tr:last-child th,.asistentes tbody tr:last-child td{border-bottom:1px solid #777!important}.cabecera{margin-bottom:12px}.cabecera td{border:1px solid #333;padding:4px;overflow-wrap:anywhere}.titulo{text-align:center;font-weight:bold;font-size:13pt;margin:12px 0}.datos{margin-bottom:12px}.datos td{padding:5px 6px;border:1px solid #777;text-align:left;vertical-align:middle;overflow-wrap:break-word}.datos td:first-child,.datos td.etiqueta{font-weight:bold;background:#f3f4f6}.datos td:first-child{width:17%}.datos .fila-datos td{white-space:nowrap;font-size:8pt;padding:5px 4px}.asistentes{font-size:8pt}.asistentes th,.asistentes td{border:1px solid #666;padding:6px 4px;overflow-wrap:anywhere;text-align:center;vertical-align:middle}.asistentes th{background:${ESTILO_ENCABEZADO_TABLA.fondo};color:${ESTILO_ENCABEZADO_TABLA.texto};font-weight:700}.asistentes thead{display:table-header-group}.asistentes tr{break-inside:avoid}.acciones{display:flex;justify-content:flex-end;gap:8px;margin:0 auto 16px;max-width:210mm}@media print{@page{size:A4 portrait;margin:12mm}html,body{width:100%;background:white!important;margin:0!important;padding:0!important}.vista-previa{width:100%;max-width:none;margin:0;padding:0;border:0;border-radius:0;background:white}.documento{width:100%;max-width:none;margin:0;padding:0;box-shadow:none}.acciones{display:none!important}.cabecera,.datos{break-inside:avoid}.asistentes th{-webkit-print-color-adjust:exact;print-color-adjust:exact}} `}</style>
    <div className="acciones"><BotonImprimir type="button" onClick={() => window.print()}><Printer size={15}/> Imprimir / Guardar PDF</BotonImprimir><BotonCancelar type="button" onClick={() => window.close()}><X size={15}/> Cerrar</BotonCancelar></div>
    <section className="documento">
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    {!error && !datos && <p>Cargando lista de asistencia...</p>}
    {r && config && <>
      <Encabezado encabezado={config.encabezado} documento={config.documento} logo={logo}/>
      
      <table className="datos"><tbody>
        <tr><td>Tipo de reunión</td><td colSpan={5}>{texto(r.tipo_reunion) || '-'}</td></tr>
        <tr><td>Descripción</td><td colSpan={5}>{texto(r.descripcion) || '-'}</td></tr>
        <tr className="fila-datos"><td>Fecha</td><td>{texto(r.fecha_programada) || '-'}</td><td className="etiqueta">Horario</td><td>{texto(r.hora_inicio).slice(0,5)} - {texto(r.hora_fin).slice(0,5)}</td><td className="etiqueta">Modalidad</td><td>{texto(r.modalidad) || '-'}</td></tr>
        <tr className="fila-datos"><td>Responsable</td><td colSpan={2}>{texto(r.responsable) || '-'}</td><td className="etiqueta">Dirigido a</td><td colSpan={2}>{texto(r.dirigido_a) || '-'}</td></tr>
        <tr className="fila-datos"><td>Lugar</td><td colSpan={2}>{texto(r.lugar) || '-'}</td><td className="etiqueta">Total de asistentes</td><td colSpan={2}>{datos.asistentes.length}</td></tr>
      </tbody></table>
      <h2 style={{ fontSize: '11pt', marginBottom: 8 }}>Listado de asistentes</h2>
      <table className="asistentes"><colgroup><col style={{width:'5%'}}/><col style={{width:'26%'}}/><col style={{width:'15%'}}/><col style={{width:'16%'}}/><col style={{width:'14%'}}/><col style={{width:'24%'}}/></colgroup><thead><tr>{['#','Nombre','Documento','Rol','Teléfono','Correo electrónico'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{datos.asistentes.map((a,i)=><tr key={i}><td>{i+1}</td><td>{texto(a.nombre_usuario)||'-'}</td><td>{texto(a.documento_usuario)||'-'}</td><td>{texto(a.rol_usuario)||'-'}</td><td>{texto(a.telefono)||'-'}</td><td>{texto(a.email)||'-'}</td></tr>)}</tbody></table>
    </>}
    </section>
  </main>
}
