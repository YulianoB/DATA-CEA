'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

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
      if (c?.ok) { const ld = await c.json().catch(() => null); if (activo) setLogo(texto(ld?.logo?.url || ld?.logo_url || ld?.url)) }
    }).catch(e => { if (activo) setError(e.message) })
    return () => { activo = false }
  }, [id, nit])
  const r = datos?.reunion
  return <main className="documento">
    <style>{`@page{size:A4 portrait;margin:14mm 12mm}body{background:#e8edf2}.documento{max-width:210mm;margin:20px auto;padding:15mm 12mm;background:white;color:#111;font-family:Arial,sans-serif;font-size:10pt}.cabecera{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:16px}.cabecera td{border:1px solid #333;padding:4px;overflow-wrap:anywhere}.titulo{text-align:center;font-weight:bold;font-size:14pt;margin:15px 0}.datos{width:100%;border-collapse:collapse;margin-bottom:18px}.datos td{padding:5px 7px;border:1px solid #777}.datos td:first-child{font-weight:bold;width:26%;background:#f3f4f6}.asistentes{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8pt}.asistentes th,.asistentes td{border:1px solid #666;padding:6px 4px;overflow-wrap:anywhere}.asistentes th{background:#e9eef3}.asistentes thead{display:table-header-group}.asistentes tr{break-inside:avoid}.acciones{display:flex;gap:8px;margin-bottom:18px}.acciones button{padding:9px 16px;border:1px solid #aaa;border-radius:6px;cursor:pointer}@media print{body{background:white}.documento{max-width:none;margin:0;padding:0}.acciones{display:none}.cabecera{break-inside:avoid}.datos{break-inside:avoid}}`}</style>
    <div className="acciones"><button type="button" onClick={() => window.print()}>Imprimir / Guardar PDF</button><button type="button" onClick={() => window.close()}>Cerrar</button></div>
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    {!error && !datos && <p>Cargando lista de asistencia...</p>}
    {r && config && <>
      <Encabezado encabezado={config.encabezado} documento={config.documento} logo={logo}/>
      <h1 className="titulo">LISTA DE ASISTENCIA</h1>
      <table className="datos"><tbody>
        { [['Tipo de reunión',r.tipo_reunion],['Descripción',r.descripcion],['Fecha',r.fecha_programada],['Horario',`${r.hora_inicio} - ${r.hora_fin}`],['Modalidad',r.modalidad],['Responsable',r.responsable],['Dirigido a',r.dirigido_a],['Lugar',r.lugar],['Total de asistentes',datos.asistentes.length]].map(([k,v]) => <tr key={k}><td>{k}</td><td>{texto(v) || '-'}</td></tr>) }
      </tbody></table>
      <h2 style={{ fontSize: '11pt', marginBottom: 8 }}>Listado de asistentes</h2>
      <table className="asistentes"><colgroup><col style={{width:'5%'}}/><col style={{width:'26%'}}/><col style={{width:'15%'}}/><col style={{width:'16%'}}/><col style={{width:'14%'}}/><col style={{width:'24%'}}/></colgroup><thead><tr>{['#','Nombre','Documento','Rol','Teléfono','Correo electrónico'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{datos.asistentes.map((a,i)=><tr key={i}><td>{i+1}</td><td>{texto(a.nombre_usuario)||'-'}</td><td>{texto(a.documento_usuario)||'-'}</td><td>{texto(a.rol_usuario)||'-'}</td><td>{texto(a.telefono)||'-'}</td><td>{texto(a.email)||'-'}</td></tr>)}</tbody></table>
    </>}
  </main>
}
