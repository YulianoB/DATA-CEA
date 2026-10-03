'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileDown, X } from 'lucide-react'

const MESES = [
  { numero: 1, nombre: 'ENE' }, { numero: 2, nombre: 'FEB' }, { numero: 3, nombre: 'MAR' },
  { numero: 4, nombre: 'ABR' }, { numero: 5, nombre: 'MAY' }, { numero: 6, nombre: 'JUN' },
  { numero: 7, nombre: 'JUL' }, { numero: 8, nombre: 'AGO' }, { numero: 9, nombre: 'SEP' },
  { numero: 10, nombre: 'OCT' }, { numero: 11, nombre: 'NOV' }, { numero: 12, nombre: 'DIC' },
]
const CATEGORIAS = {
  MANTENIMIENTO_SEGURIDAD: 'Mantenimiento y seguridad vehicular',
  CAPACITACION: 'Capacitación y formación en seguridad vial',
  SENALIZACION: 'Señalización y adecuaciones de seguridad vial',
  TECNOLOGIA_MONITOREO: 'Tecnología y monitoreo',
  EMERGENCIAS: 'Atención de emergencias y elementos de prevención',
  GESTION_PESV: 'Gestión, seguimiento y documentación PESV',
  OTROS: 'Otros recursos destinados al PESV',
}
const ORDEN = Object.keys(CATEGORIAS)

function texto(v) { return String(v ?? '').trim() }
function numero(v) { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function moneda(v) { return numero(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }) }
function normalizar(v) {
  return texto(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}
function fecha(v) {
  const s = texto(v).slice(0, 10)
  const p = s.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : texto(v)
}
function valorMes(fila, mes, campo) {
  const d = Array.isArray(fila?.meses) ? fila.meses.find(x => Number(x.mes) === Number(mes)) : null
  return numero(d?.[campo])
}
function totalMeses(fila, campo) { return MESES.reduce((a, m) => a + valorMes(fila, m.numero, campo), 0) }
function porcentaje(e, p) { return p > 0 ? (e / p) * 100 : e > 0 ? 100 : 0 }

function obtenerUrlLogo(logo) {
  if (!logo) return ''
  if (typeof logo === 'string') return logo
  return texto(logo?.url || logo?.logo_url || logo?.publicUrl || '')
}

function valorElementoEncabezado({ elemento, documento, logo }) {
  const tipo = normalizar(elemento?.tipo)
  const prefijo = texto(elemento?.prefijo)
  switch (tipo) {
    case 'LOGO':
      return { tipo: 'LOGO', valor: obtenerUrlLogo(logo) }
    case 'NOMBRE_DOCUMENTO':
      return { tipo: 'TEXTO', valor: texto(documento?.nombre_documento) || 'PRESUPUESTO PESV' }
    case 'CODIGO':
      return { tipo: 'TEXTO', valor: `${prefijo}${texto(documento?.codigo) || '-'}` }
    case 'FECHA_EDICION':
      return { tipo: 'TEXTO', valor: `${prefijo}${fecha(documento?.fecha_edicion) || '-'}` }
    case 'VERSION':
      return { tipo: 'TEXTO', valor: `${prefijo}${texto(documento?.version) || '-'}` }
    case 'VIGENCIA':
      return { tipo: 'TEXTO', valor: `${prefijo}${fecha(documento?.vigencia) || '-'}` }
    case 'PAGINACION':
      return { tipo: 'TEXTO', valor: `${prefijo}1 de 1` }
    case 'TEXTO':
      return { tipo: 'TEXTO', valor: texto(elemento?.valor) }
    default:
      return { tipo: 'TEXTO', valor: '' }
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
    const filaInicio = Number(celda?.fila || 1)
    const columnaInicio = Number(celda?.columna || 1)
    const rowSpan = Number(celda?.rowSpan || 1)
    const colSpan = Number(celda?.colSpan || 1)
    celdasPorPosicion.set(`${filaInicio}-${columnaInicio}`, celda)
    for (let fila = filaInicio; fila < filaInicio + rowSpan; fila += 1) {
      for (let columna = columnaInicio; columna < columnaInicio + colSpan; columna += 1) {
        if (fila !== filaInicio || columna !== columnaInicio) ocupadas.add(`${fila}-${columna}`)
      }
    }
  }

  const anchoTotal = columnasConfig.reduce((suma, columna) => suma + Number(columna?.ancho || 0), 0)

  return (
    <table className="tabla-encabezado">
      <colgroup>
        {Array.from({ length: columnas }, (_, index) => {
          const ancho = Number(columnasConfig[index]?.ancho || 0)
          const porcentaje = anchoTotal > 0 ? (ancho / anchoTotal) * 100 : 100 / columnas
          return <col key={index} style={{ width: `${porcentaje}%` }} />
        })}
      </colgroup>
      <tbody>
        {Array.from({ length: filas }, (_, filaIndex) => {
          const fila = filaIndex + 1
          const altura = Number(filasConfig[filaIndex]?.altura || 8)
          return (
            <tr key={fila} style={{ height: `${altura}mm` }}>
              {Array.from({ length: columnas }, (_, columnaIndex) => {
                const columna = columnaIndex + 1
                const posicion = `${fila}-${columna}`
                if (ocupadas.has(posicion)) return null
                const celda = celdasPorPosicion.get(posicion)
                if (!celda) return <td key={posicion} className="celda-encabezado" />
                const elementos = Array.isArray(celda?.elementos) ? celda.elementos : []
                const alineacionHorizontal =
                  celda?.alineacion_horizontal === 'left' ? 'left' :
                  celda?.alineacion_horizontal === 'right' ? 'right' : 'center'
                const alineacionVertical =
                  celda?.alineacion_vertical === 'top' ? 'top' :
                  celda?.alineacion_vertical === 'bottom' ? 'bottom' : 'middle'
                return (
                  <td
                    key={posicion}
                    rowSpan={Number(celda?.rowSpan || 1)}
                    colSpan={Number(celda?.colSpan || 1)}
                    style={{
                      borderTop: celda?.borde_superior === false ? 'none' : undefined,
                      borderBottom: celda?.borde_inferior === false ? 'none' : undefined,
                      borderLeft: celda?.borde_izquierdo === false ? 'none' : undefined,
                      borderRight: celda?.borde_derecho === false ? 'none' : undefined,
                      textAlign: alineacionHorizontal,
                      verticalAlign: alineacionVertical,
                    }}
                    className="celda-encabezado"
                  >
                    <div className="elementos-encabezado">
                      {elementos.map((elemento, index) => {
                        const resultado = valorElementoEncabezado({ elemento, documento, logo })
                        if (resultado.tipo === 'LOGO') {
                          return resultado.valor ? <img key={index} src={resultado.valor} alt="Logo" /> : null
                        }
                        return (
                          <div
                            key={index}
                            style={{
                              fontSize: `${Number(elemento?.tamano_fuente || 9)}px`,
                              fontWeight: elemento?.negrita ? 700 : 400,
                            }}
                            className="texto-encabezado"
                          >
                            {resultado.valor}
                          </div>
                        )
                      })}
                    </div>
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function DocumentoPresupuestoPesvPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nit = texto(searchParams.get('nit'))
  const vigencia = Number(searchParams.get('vigencia')) || new Date().getFullYear()
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [encabezado, setEncabezado] = useState(null)
  const [documento, setDocumento] = useState({ nombre_documento: 'PRESUPUESTO PESV' })
  const [logo, setLogo] = useState(null)

  useEffect(() => {
    if (!nit) { setError('No se recibió el NIT del CEA.'); setCargando(false); return }
    let activo = true
    async function cargar() {
      try {
        setCargando(true); setError('')
        const params = new URLSearchParams({ nit, vigencia: String(vigencia) })
        const [rp, rc, rl] = await Promise.all([
          fetch(`/api/admin/pesv/presupuesto?${params.toString()}`, { headers: { 'x-cea-nit': nit }, cache: 'no-store' }),
          fetch('/api/admin/configuracion-documentos', { headers: { 'x-cea-nit': nit }, cache: 'no-store' }),
          fetch(`/api/admin/pesv/riesgos?nit=${encodeURIComponent(nit)}&anio=${vigencia}`, { headers: { 'x-cea-nit': nit }, cache: 'no-store' }).catch(() => null),
        ])
        const dp = await rp.json()
        const dc = await rc.json()
        const dl = rl && rl.ok ? await rl.json() : null
        if (!rp.ok || dp?.ok !== true) throw new Error(dp?.error || 'No fue posible consultar el presupuesto PESV.')
        if (!rc.ok || dc?.ok !== true) throw new Error(dc?.error || 'No fue posible consultar la configuración documental.')
        if (!dp?.presupuesto) throw new Error(`No existe presupuesto PESV para la vigencia ${vigencia}.`)
        if (texto(dp.presupuesto?.estado).toUpperCase() !== 'APROBADO') throw new Error('El documento imprimible se habilita para presupuestos aprobados.')
        const docs = Array.isArray(dc?.documentos) ? dc.documentos : []
        const encontrado = docs.find(x => ['PRESUPUESTO_PESV', 'PRESUPUESTO_ANUAL_PESV'].includes(normalizar(x?.tipo_documento))) ||
          docs.find(x => { const n = normalizar(x?.nombre_documento); return n.includes('PRESUPUESTO') && n.includes('PESV') })
        if (activo) {
          setData(dp)
          setEncabezado(dc?.encabezado || null)
          setDocumento(encontrado || { nombre_documento: 'PRESUPUESTO PESV', codigo: '', version: '', fecha_edicion: '', vigencia: '' })
          setLogo(dl?.logo || null)
        }
      } catch (e) {
        if (activo) setError(e?.message || 'No fue posible preparar el documento.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [nit, vigencia])

  const filas = useMemo(() => Array.isArray(data?.matriz) ? data.matriz.filter(x => x?.partida_id || numero(x?.ejecutado_anual) > 0) : [], [data])
  const grupos = useMemo(() => ORDEN.map(categoria => ({ categoria, filas: filas.filter(x => x?.categoria_pesv === categoria) })).filter(g => g.filas.length), [filas])
  const totales = useMemo(() => {
    const proyectado = filas.reduce((a, f) => a + totalMeses(f, 'programado'), 0)
    const ejecutado = filas.reduce((a, f) => a + totalMeses(f, 'ejecutado'), 0)
    return { proyectado, ejecutado, saldo: proyectado - ejecutado, porcentaje: porcentaje(ejecutado, proyectado) }
  }, [filas])

  if (cargando) return <div className="p-10 text-center text-sm">Preparando documento...</div>
  if (error) return <div className="mx-auto mt-10 max-w-2xl rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</div>

  return (
    <div className="min-h-screen bg-slate-200 py-5 print:bg-white print:py-0">
      <div className="acciones no-print">
        <div className="acciones-inner">
          <button type="button" onClick={() => router.back()}><X size={16} /> Regresar</button>
          <button type="button" className="principal" onClick={() => window.print()}>
            <FileDown size={16} /> Guardar PDF / Imprimir
          </button>
        </div>
      </div>
      <main className="hoja-presupuesto-pesv">
        <table className="tabla-documento">
          <thead className="encabezado-repetible">
            <tr>
              <td className="encabezado-celda">
                <EncabezadoDocumento encabezado={encabezado} documento={documento} logo={logo} />
                <div className="separador-encabezado" />
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="celda-documento">
        <section className="mt-1 text-center">
          <h1 className="text-[13px] font-black uppercase">PRESUPUESTO PESV - VIGENCIA {vigencia}</h1>
          <div className="mt-1 text-[7px] font-semibold uppercase">
            {data?.empresa?.razon_social || data?.empresa?.nombre || ''} {data?.empresa?.nit ? `· NIT ${data.empresa.nit}` : ''}
          </div>
          <div className="mt-1 text-[7px]">Estado: <strong>{data?.presupuesto?.estado}</strong>{data?.presupuesto?.fecha_aprobacion ? ` · Fecha de aprobación: ${fecha(data.presupuesto.fecha_aprobacion)}` : ''}</div>
        </section>

        <table className="tabla-presupuesto mt-3 w-full border-collapse text-[5.2px] leading-[1.12]">
          <colgroup>
            <col style={{ width: '40mm' }} />
            <col style={{ width: '17mm' }} /><col style={{ width: '17mm' }} /><col style={{ width: '17mm' }} /><col style={{ width: '11mm' }} />
            {MESES.map(m => <col key={m.numero} style={{ width: '12.3mm' }} />)}
          </colgroup>
          <thead>
            <tr className="bg-slate-800 text-white">
              <th rowSpan="2" className="border border-black px-1.5 py-1.5 text-left">CONCEPTO PRESUPUESTAL</th>
              <th rowSpan="2" className="border border-black px-1 py-1 text-center">PROY. ANUAL</th>
              <th rowSpan="2" className="border border-black px-1 py-1 text-center">EJEC. ANUAL</th>
              <th rowSpan="2" className="border border-black px-1 py-1 text-center">SALDO</th>
              <th rowSpan="2" className="border border-black px-1 py-1 text-center">% EJEC.</th>
              {MESES.map(m => <th key={m.numero} className="border border-black px-0.5 py-1 text-center">{m.nombre}</th>)}
            </tr>
            <tr className="bg-slate-200 text-black">
              {MESES.map(m => <th key={m.numero} className="border border-black px-0.5 py-0.5 text-center">P / E</th>)}
            </tr>
          </thead>
          <tbody>
            {grupos.map(grupo => (
              <Fragment key={grupo.categoria}>
                <tr className="bg-slate-100">
                  <td colSpan="17" className="border border-black px-1.5 py-1 font-black uppercase text-blue-900">{CATEGORIAS[grupo.categoria]}</td>
                </tr>
                {grupo.filas.map(fila => {
                  const p = totalMeses(fila, 'programado')
                  const e = totalMeses(fila, 'ejecutado')
                  return (
                    <tr key={fila.partida_id || fila.concepto_id} className="align-middle">
                      <td className="border border-black py-1 pl-4 pr-1 font-bold">{fila.concepto_nombre || fila.nombre_concepto || '-'}</td>
                      <td className="border border-black px-0.5 py-1 text-right">{moneda(p)}</td>
                      <td className="border border-black px-0.5 py-1 text-right">{moneda(e)}</td>
                      <td className="border border-black px-0.5 py-1 text-right">{moneda(p - e)}</td>
                      <td className="border border-black px-0.5 py-1 text-center">{porcentaje(e, p).toFixed(1)}%</td>
                      {MESES.map(m => <td key={m.numero} className="border border-black px-0.5 py-1 text-center"><div className="font-bold">P: {moneda(valorMes(fila, m.numero, 'programado'))}</div><div className="mt-0.5 border-t border-slate-400 pt-0.5">E: {moneda(valorMes(fila, m.numero, 'ejecutado'))}</div></td>)}
                    </tr>
                  )
                })}
              </Fragment>
            ))}
            <tr className="bg-slate-200 font-black">
              <td className="border border-black px-1.5 py-1.5">TOTAL PRESUPUESTO PESV</td>
              <td className="border border-black px-0.5 py-1.5 text-right">{moneda(totales.proyectado)}</td>
              <td className="border border-black px-0.5 py-1.5 text-right">{moneda(totales.ejecutado)}</td>
              <td className="border border-black px-0.5 py-1.5 text-right">{moneda(totales.saldo)}</td>
              <td className="border border-black px-0.5 py-1.5 text-center">{totales.porcentaje.toFixed(1)}%</td>
              {MESES.map(m => {
                const p = filas.reduce((a, f) => a + valorMes(f, m.numero, 'programado'), 0)
                const e = filas.reduce((a, f) => a + valorMes(f, m.numero, 'ejecutado'), 0)
                return <td key={m.numero} className="border border-black px-0.5 py-1 text-center"><div>P: {moneda(p)}</div><div className="mt-0.5 border-t border-slate-500 pt-0.5">E: {moneda(e)}</div></td>
              })}
            </tr>
          </tbody>
        </table>

        <section className="mt-3">
          <div className="mb-1 text-[7px] font-black uppercase">Resumen trimestral y acumulado anual</div>
          <table className="w-full border-collapse text-[6px]">
            <thead><tr className="bg-slate-700 text-white"><th className="border border-black p-1 text-left">RESULTADO</th>{[1,2,3,4].map(t => <th key={t} className="border border-black p-1">TRIMESTRE {t}</th>)}<th className="border border-black p-1">ACUMULADO ANUAL</th></tr></thead>
            <tbody>
              {[
                ['Proyectado', 'proyectado'], ['Ejecutado', 'ejecutado'], ['Saldo', 'saldo'], ['% ejecución', 'porcentaje']
              ].map(([label, campo]) => (
                <tr key={campo}>
                  <td className="border border-black p-1 font-bold">{label}</td>
                  {[1,2,3,4].map(t => {
                    const meses = [(t-1)*3+1,(t-1)*3+2,(t-1)*3+3]
                    const p = filas.reduce((a,f) => a + meses.reduce((s,m) => s + valorMes(f,m,'programado'),0),0)
                    const e = filas.reduce((a,f) => a + meses.reduce((s,m) => s + valorMes(f,m,'ejecutado'),0),0)
                    const vals = { proyectado:p, ejecutado:e, saldo:p-e, porcentaje:porcentaje(e,p) }
                    return <td key={t} className="border border-black p-1 text-right">{campo === 'porcentaje' ? `${vals[campo].toFixed(1)}%` : moneda(vals[campo])}</td>
                  })}
                  <td className="border border-black p-1 text-right font-bold">{campo === 'porcentaje' ? `${totales.porcentaje.toFixed(1)}%` : moneda(totales[campo])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <div className="mt-3 text-[6px] text-slate-600">Documento generado a partir del presupuesto PESV aprobado y de la ejecución registrada en Caja para la vigencia seleccionada.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </main>

      <style jsx global>{`
        *{box-sizing:border-box}
        html,body{margin:0;padding:0}
        body{background:#e5e7eb;color:#111827;font-family:Arial,Helvetica,sans-serif}
        .acciones{position:sticky;top:0;z-index:50;width:279mm;max-width:calc(100vw - 24px);margin:10px auto 0}
        .acciones-inner{display:flex;justify-content:flex-end;gap:8px}
        .acciones button{display:inline-flex;align-items:center;gap:6px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer}
        .acciones .principal{border-color:#1e3a8a;background:#1e3a8a;color:#fff}
        .hoja-presupuesto-pesv{width:279mm;margin:16px auto;background:#fff;padding:8mm 9mm 9mm;box-shadow:0 4px 18px rgba(15,23,42,.18)}
        .tabla-documento{width:100%;border-collapse:collapse;table-layout:fixed}
        .encabezado-celda,.celda-documento{padding:0;border:0;vertical-align:top}
        .tabla-encabezado{width:100%;table-layout:fixed;border-collapse:collapse;color:#000}
        .celda-encabezado{border:1px solid #000;padding:.8mm 1.2mm}
        .elementos-encabezado{display:flex;height:100%;flex-direction:column;justify-content:center;gap:.4mm}
        .elementos-encabezado img{display:block;max-width:100%;max-height:16mm;margin:auto;object-fit:contain}
        .texto-encabezado{overflow-wrap:anywhere;line-height:1.15}
        .separador-encabezado{height:3mm}
        .tabla-presupuesto{width:100%;table-layout:fixed;border-collapse:collapse}
        .tabla-presupuesto thead{display:table-header-group}
        .tabla-presupuesto tr{break-inside:avoid;page-break-inside:avoid}
        @page{size:letter landscape;margin:0}
        @media print{
          html,body{background:#fff!important;width:100%!important;min-width:0!important;margin:0!important;padding:0!important;overflow:visible!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
          .no-print{display:none!important}
          body>div,body>div>div{min-height:0!important}
          .hoja-presupuesto-pesv{width:279mm;margin:0;padding:8mm 9mm 9mm;box-shadow:none}
          .tabla-documento{width:100%}
          .encabezado-repetible{display:table-header-group}
          .tabla-presupuesto thead{display:table-header-group}
          .tabla-presupuesto tr{break-inside:avoid;page-break-inside:avoid}
        }
      `}</style>

    </div>
  )
}
