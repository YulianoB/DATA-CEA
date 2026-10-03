'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2, Printer, X } from 'lucide-react'
function texto(valor) { return String(valor ?? '').trim() }
function normalizar(valor) { return texto(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() }
function dinero(valor) { return Number(valor || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function fechaLarga(valor) {
  if (!valor) return ''
  const [anio, mes, dia] = String(valor).slice(0, 10).split('-').map(Number)
  if (!anio || !mes || !dia) return texto(valor)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(anio, mes - 1, dia))
}
function formatearFecha(valor) {
  if (!valor) return '-'
  const [anio, mes, dia] = String(valor).slice(0, 10).split('-')
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : texto(valor)
}
function nombreTrimestre(numero) { return ['', 'Primer', 'Segundo', 'Tercer', 'Cuarto'][Number(numero)] || '' }
function obtenerUrlLogo(logo) {
  if (!logo) return ''
  if (typeof logo === 'string') return logo
  return texto(logo?.url || logo?.logo_url || logo?.publicUrl || '')
}
function obtenerDocumentoB4(documentos, titulo) {
  const activos = (Array.isArray(documentos) ? documentos : []).filter((item) => item?.activo !== false)
  const exacto = activos.find((item) => {
    const nombre = normalizar(item?.nombre_documento)
    return nombre.includes('SINST') || nombre.includes('VIGIA') || nombre.includes('EVIDENCIA B-4') || nombre.includes('EVIDENCIA B4')
  })
  return exacto || { nombre_documento: titulo || 'CERTIFICACIÓN DE RECURSOS EMPLEADOS PARA EL DESARROLLO DEL PLAN ANUAL DE TRABAJO PESV', codigo: 'SINST-VIGIA 2', fecha_edicion: null, version: '', vigencia: null }
}
function valorElementoEncabezado({ elemento, documento, logo }) {
  const tipo = normalizar(elemento?.tipo)
  const prefijo = texto(elemento?.prefijo)
  switch (tipo) {
    case 'LOGO': return { tipo: 'LOGO', valor: obtenerUrlLogo(logo) }
    case 'NOMBRE_DOCUMENTO': return { tipo: 'TEXTO', valor: texto(documento?.nombre_documento) || 'EVIDENCIA SINST - VIGIA 2' }
    case 'CODIGO': return { tipo: 'TEXTO', valor: `${prefijo}${texto(documento?.codigo) || '-'}` }
    case 'FECHA_EDICION': return { tipo: 'TEXTO', valor: `${prefijo}${formatearFecha(documento?.fecha_edicion)}` }
    case 'VERSION': return { tipo: 'TEXTO', valor: `${prefijo}${texto(documento?.version) || '-'}` }
    case 'VIGENCIA': return { tipo: 'TEXTO', valor: `${prefijo}${formatearFecha(documento?.vigencia)}` }
    case 'PAGINACION': return { tipo: 'TEXTO', valor: `${prefijo}1 de 1` }
    case 'TEXTO': return { tipo: 'TEXTO', valor: texto(elemento?.valor) }
    default: return { tipo: 'TEXTO', valor: '' }
  }
}
function EncabezadoDocumento({ encabezado, documento, logo }) {
  const filas = Number(encabezado?.filas || encabezado?.estructura?.filas?.length || 0)
  const columnas = Number(encabezado?.columnas || encabezado?.estructura?.columnas?.length || 0)
  const estructura = encabezado?.estructura && typeof encabezado.estructura === 'object' ? encabezado.estructura : null
  const celdas = Array.isArray(estructura?.celdas) ? estructura.celdas : []
  const columnasConfig = Array.isArray(estructura?.columnas) ? estructura.columnas : []
  const filasConfig = Array.isArray(estructura?.filas) ? estructura.filas : []
  if (!filas || !columnas || celdas.length === 0) return null
  const ocupadas = new Set()
  const celdasPorPosicion = new Map()
  for (const celda of celdas) {
    const filaInicio = Number(celda?.fila || 1), columnaInicio = Number(celda?.columna || 1), rowSpan = Number(celda?.rowSpan || 1), colSpan = Number(celda?.colSpan || 1)
    celdasPorPosicion.set(`${filaInicio}-${columnaInicio}`, celda)
    for (let fila = filaInicio; fila < filaInicio + rowSpan; fila += 1) for (let columna = columnaInicio; columna < columnaInicio + colSpan; columna += 1) if (fila !== filaInicio || columna !== columnaInicio) ocupadas.add(`${fila}-${columna}`)
  }
  const anchoTotal = columnasConfig.reduce((suma, columna) => suma + Number(columna?.ancho || 0), 0)
  return (
    <table className="tabla-encabezado">
      <colgroup>{Array.from({ length: columnas }, (_, index) => { const ancho = Number(columnasConfig[index]?.ancho || 0); const porcentaje = anchoTotal > 0 ? (ancho / anchoTotal) * 100 : 100 / columnas; return <col key={index} style={{ width: `${porcentaje}%` }} /> })}</colgroup>
      <tbody>{Array.from({ length: filas }, (_, filaIndex) => {
        const fila = filaIndex + 1, altura = Number(filasConfig[filaIndex]?.altura || 8)
        return <tr key={fila} style={{ height: `${altura}mm` }}>{Array.from({ length: columnas }, (_, columnaIndex) => {
          const columna = columnaIndex + 1, posicion = `${fila}-${columna}`
          if (ocupadas.has(posicion)) return null
          const celda = celdasPorPosicion.get(posicion)
          if (!celda) return <td key={posicion} className="celda-encabezado" />
          const elementos = Array.isArray(celda?.elementos) ? celda.elementos : []
          const alineacionHorizontal = celda?.alineacion_horizontal === 'left' ? 'left' : celda?.alineacion_horizontal === 'right' ? 'right' : 'center'
          const alineacionVertical = celda?.alineacion_vertical === 'top' ? 'top' : celda?.alineacion_vertical === 'bottom' ? 'bottom' : 'middle'
          const estilosBorde = { borderTop: celda?.borde_superior === false ? 'none' : undefined, borderBottom: celda?.borde_inferior === false ? 'none' : undefined, borderLeft: celda?.borde_izquierdo === false ? 'none' : undefined, borderRight: celda?.borde_derecho === false ? 'none' : undefined, textAlign: alineacionHorizontal, verticalAlign: alineacionVertical }
          return <td key={posicion} rowSpan={Number(celda?.rowSpan || 1)} colSpan={Number(celda?.colSpan || 1)} style={estilosBorde} className="celda-encabezado"><div className="elementos-encabezado">{elementos.map((elemento, index) => {
            const resultado = valorElementoEncabezado({ elemento, documento, logo })
            if (resultado.tipo === 'LOGO') return resultado.valor ? <img key={index} src={resultado.valor} alt="Logo" /> : null
            return <div key={index} style={{ fontSize: `${Number(elemento?.tamano_fuente || 9)}px`, fontWeight: elemento?.negrita ? 700 : 400 }} className="texto-encabezado">{resultado.valor}</div>
          })}</div></td>
        })}</tr>
      })}</tbody>
    </table>
  )
}
function FilaDocumento({ children, className = '' }) { return <tr className={className}><td className="celda-documento">{children}</td></tr> }
export default function EvidenciaB4Page() {
  const searchParams = useSearchParams()
  const nit = texto(searchParams.get('nit')), anio = Number(searchParams.get('anio') || 0), trimestre = Number(searchParams.get('trimestre') || 0), token = texto(searchParams.get('token'))
  const [datos, setDatos] = useState(null), [encabezado, setEncabezado] = useState(null), [documento, setDocumento] = useState(null), [logo, setLogo] = useState(null), [cargando, setCargando] = useState(true), [error, setError] = useState('')
  useEffect(() => {
    let activo = true
    async function cargar() {
      if (!nit || !anio || ![1, 2, 3, 4].includes(trimestre) || !token) { setError('Los parámetros para generar la evidencia B-4 no son válidos.'); setCargando(false); return }
      try {
        let datosB4 = null
        try { const guardado = localStorage.getItem(`sinst_vigia_${token}`); if (guardado) datosB4 = JSON.parse(guardado) } catch { datosB4 = null }
        if (!datosB4?.ok || datosB4?.evidencia?.codigo !== 'B-4') throw new Error('No se encontró la información preparada para la evidencia B-4. Regrese al Formulario B y genere nuevamente el documento.')
        const respuestaDocumentos = await fetch(`/api/admin/configuracion-documentos?${new URLSearchParams({ nit }).toString()}`, { method: 'GET', headers: { 'x-cea-nit': nit }, cache: 'no-store' })
        const dataDocumentos = await respuestaDocumentos.json()
        if (!respuestaDocumentos.ok || dataDocumentos?.ok !== true) throw new Error(dataDocumentos?.error || dataDocumentos?.message || 'No fue posible consultar la configuración documental.')
        const encabezadoEncontrado = dataDocumentos?.encabezado || null
        if (!encabezadoEncontrado) throw new Error('No se encontró la configuración del encabezado documental.')
        let logoEncontrado = null
        try {
          const respuestaLogo = await fetch(`/api/admin/pesv/riesgos?${new URLSearchParams({ nit, anio: String(anio) }).toString()}`, { method: 'GET', headers: { 'x-cea-nit': nit }, cache: 'no-store' })
          const dataLogo = await respuestaLogo.json()
          if (respuestaLogo.ok) logoEncontrado = dataLogo?.logo || null
        } catch (errorLogo) { console.warn('No fue posible cargar el logo:', errorLogo) }
        if (!activo) return
        setDatos(datosB4); setEncabezado(encabezadoEncontrado); setDocumento(obtenerDocumentoB4(dataDocumentos?.documentos, datosB4?.evidencia?.titulo)); setLogo(logoEncontrado)
      } catch (e) { if (activo) setError(e?.message || 'No fue posible cargar la evidencia B-4.') } finally { if (activo) setCargando(false) }
    }
    cargar(); return () => { activo = false }
  }, [nit, anio, trimestre, token])
  const evidencia = datos?.evidencia || {}, empresa = datos?.empresa || {}, periodo = datos?.periodo || {}
  const detalle = useMemo(() => Array.isArray(evidencia?.detalle) ? evidencia.detalle.filter((item) => Number(item?.valor || 0) > 0) : [], [evidencia])
  const total = Number(evidencia?.total_recursos_ejecutados || 0)
  if (cargando) return <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-slate-50"><div className="flex flex-col items-center justify-center gap-3 text-center text-sm font-semibold text-slate-600"><Loader2 className="h-6 w-6 animate-spin" />Preparando certificación B-4...</div></div>
  if (error) return <div className="estado error"><AlertCircle size={22} /><div><strong>No fue posible generar la evidencia B-4</strong><p>{error}</p></div></div>
  const razonSocial = evidencia?.razon_social || empresa?.razon_social || '', nitEmpresa = evidencia?.nit || empresa?.nit || nit, contador = evidencia?.contador || {}
  return (
    <>
      <div className="acciones no-print"><div className="acciones-inner"><button type="button" onClick={() => window.close()}><X size={16} /> Cerrar</button><button type="button" className="principal" onClick={() => window.print()}><Printer size={16} /> Imprimir / Guardar PDF</button></div></div>
      <main className="hoja">
        <table className="tabla-documento">
          <thead className="encabezado-repetible"><tr><td className="encabezado-celda"><EncabezadoDocumento encabezado={encabezado} documento={documento} logo={logo} /><div className="separador-encabezado" /></td></tr></thead>
          <tbody>
            <FilaDocumento><section className="titulo-documento bloque-no-dividir"><h1>{evidencia?.titulo || 'CERTIFICACIÓN DE RECURSOS EMPLEADOS PARA EL DESARROLLO DEL PLAN ANUAL DE TRABAJO PESV'}</h1><div className="identificacion"><div><strong>Formulario:</strong> B · SINST - VIGIA 2</div><div><strong>Evidencia:</strong> B-4</div><div><strong>Periodo:</strong> {nombreTrimestre(trimestre)} trimestre de {anio}</div><div><strong>Periodicidad:</strong> Trimestral</div></div></section></FilaDocumento>
            <FilaDocumento><p className="parrafo">El suscrito Contador Público certifica que, una vez verificada la información financiera y los registros correspondientes al período comprendido entre el <strong>{fechaLarga(periodo?.desde)}</strong> y el <strong>{fechaLarga(periodo?.hasta)}</strong>, los recursos empleados por <strong>{razonSocial}</strong>, identificada con NIT <strong>{nitEmpresa}</strong>, para el desarrollo del Plan Anual de Trabajo del Plan Estratégico de Seguridad Vial (PESV), durante el <strong>{nombreTrimestre(trimestre).toLowerCase()} trimestre de {anio}</strong>, corresponden a los valores y destinaciones relacionados a continuación.</p></FilaDocumento>
            <FilaDocumento><section className="bloque-recursos"><h2>DETALLE DE LOS RECURSOS EMPLEADOS Y SU DESTINACIÓN</h2><table className="recursos"><thead><tr><th>Destinación PESV</th><th>Concepto</th><th>Valor empleado</th></tr></thead><tbody>{detalle.map((item, index) => <tr key={`${item.categoria_pesv}-${item.concepto_id || item.concepto}-${index}`}><td><strong>{item.destinacion}</strong></td><td>{item.concepto}</td><td className="valor">{dinero(item.valor)}</td></tr>)}{detalle.length === 0 && <tr><td><strong>Sin recursos empleados registrados</strong></td><td>No se registraron egresos PESV elegibles para el periodo certificado.</td><td className="valor">{dinero(0)}</td></tr>}</tbody><tfoot><tr><td colSpan={2}>TOTAL RECURSOS EMPLEADOS</td><td className="valor">{dinero(total)}</td></tr></tfoot></table>{Number(evidencia?.cantidad_pendientes_legalizacion || 0) > 0 && <p className="nota">Las entregas para legalizar pendientes o parciales no forman parte del valor certificado hasta que se encuentren totalmente legalizadas.</p>}</section></FilaDocumento>
            <FilaDocumento><section className="verificacion bloque-no-dividir"><h2>VERIFICACIÓN REALIZADA</h2><p className="parrafo">{evidencia?.texto_verificacion}</p></section></FilaDocumento>
            <FilaDocumento><section className="cierre bloque-no-dividir"><p className="parrafo">La presente certificación se expide como soporte de la evidencia B-4 del Formulario B del SISTEMA INTELIGENTE NACIONAL DE SUPERVISIÓN AL TRANSPORTE – SINST VIGIA 2, con base en la información financiera y los soportes correspondientes al periodo indicado.</p><p className="expedicion">Se expide para los fines pertinentes, a los {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.</p><div className="firma"><div className="espacio-firma" /><div className="linea" /><strong>{contador?.nombre || 'CONTADOR PÚBLICO'}</strong><span>{contador?.titulo || 'CONTADOR PÚBLICO'}</span><span>C.C. {contador?.documento || '-'}</span><span>T.P. {contador?.tarjeta_profesional || '-'}</span></div></section></FilaDocumento>
          </tbody>
        </table>
      </main>
      <style jsx global>{`
        *{box-sizing:border-box}html,body{margin:0;padding:0}body{background:#e5e7eb;color:#111827;font-family:Arial,Helvetica,sans-serif}.acciones{position:sticky;top:0;z-index:50;width:216mm;max-width:calc(100vw - 24px);margin:10px auto 0;padding:0;background:transparent}.acciones-inner{width:100%;display:flex;justify-content:flex-end;gap:8px}.acciones button{display:inline-flex;align-items:center;gap:6px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer}.acciones .principal{border-color:#ea580c;background:#ea580c;color:#fff}.hoja{width:216mm;min-height:279mm;margin:16px auto;background:#fff;padding:12mm 14mm 14mm;box-shadow:0 4px 18px rgba(15,23,42,.18)}.tabla-documento{width:100%;border-collapse:collapse;table-layout:fixed}.encabezado-celda,.celda-documento{padding:0;border:0;vertical-align:top}.tabla-encabezado{width:100%;table-layout:fixed;border-collapse:collapse;color:#000}.celda-encabezado{border:1px solid #000;padding:.8mm 1.2mm}.elementos-encabezado{display:flex;height:100%;flex-direction:column;justify-content:center;gap:.4mm}.elementos-encabezado img{display:block;max-width:100%;max-height:18mm;margin:auto;object-fit:contain}.texto-encabezado{overflow-wrap:anywhere;line-height:1.15}.separador-encabezado{height:5mm}h1{margin:0 0 4mm;text-align:center;font-size:13px;line-height:1.3}h2{margin:0 0 2.5mm;font-size:9.5px;line-height:1.3;text-align:left}.identificacion{display:grid;grid-template-columns:1fr 1fr;border:1px solid #94a3b8;margin-bottom:4mm;font-size:9px}.identificacion div{padding:1.5mm 2mm;border-bottom:1px solid #cbd5e1}.identificacion div:nth-child(odd){border-right:1px solid #cbd5e1}.identificacion div:nth-last-child(-n+2){border-bottom:0}.parrafo,.expedicion{font-size:10px;line-height:1.45;text-align:justify;margin:0 0 3.5mm}.bloque-recursos{margin-top:1mm}.recursos{width:100%;border-collapse:collapse;margin:2.5mm 0 3mm;font-size:8.5px}.recursos th,.recursos td{border:1px solid #64748b;padding:1.5mm 1.8mm;vertical-align:top;line-height:1.3}.recursos th{background:#e2e8f0;text-align:center;font-weight:700}.recursos th:nth-child(1){width:42%}.recursos th:nth-child(2){width:38%}.recursos th:nth-child(3){width:20%}.recursos .valor{text-align:right;white-space:nowrap}.recursos tfoot td{background:#f1f5f9;font-weight:700}.nota{margin:0 0 3.5mm;font-size:8.5px;line-height:1.4;text-align:justify;color:#475569}.verificacion{margin-top:1mm}.cierre{padding-top:1mm}.firma{width:72%;margin-top:6mm;font-size:9px;line-height:1.4}.espacio-firma{height:12mm}.firma .linea{width:78%;border-top:1px solid #111827;margin-bottom:1mm}.firma strong,.firma span{display:block}.bloque-no-dividir,.recursos tr,.firma{break-inside:avoid;page-break-inside:avoid}.estado{min-height:100vh;display:flex;align-items:center;justify-content:center;gap:10px;background:#f8fafc;padding:24px;font-size:14px}.estado-cargando{position:fixed;inset:0;width:100vw;height:100vh;min-height:100vh;margin:0;z-index:9999;text-align:center}.estado.error{color:#b91c1c}.estado.error p{margin:5px 0 0}.spin{animation:girar 1s linear infinite}@keyframes girar{to{transform:rotate(360deg)}}@page{size:letter portrait;margin:0}@media print{html,body{background:#fff}.no-print{display:none!important}.hoja{width:216mm;min-height:279mm;margin:0;padding:12mm 14mm 14mm;box-shadow:none}.tabla-documento{width:100%}.encabezado-repetible{display:table-header-group}.separador-encabezado{height:5mm}.celda-documento{padding:0}.recursos thead{display:table-header-group}.recursos tr{break-inside:avoid;page-break-inside:avoid}}
      `}</style>
    </>
  )
}
