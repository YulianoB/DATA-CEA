// app/admin/consultas/siniestros/acta/[id]/page.jsx

'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

function texto(valor) {
  return String(valor ?? '').trim()
}

function normalizar(valor) {
  return texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function fecha(valor) {
  const v = texto(valor)
  if (!v) return '-'
  const p = v.slice(0, 10).split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : v
}

function dinero(valor) {
  return Number(valor || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

function Campo({ label, value, wide = false }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-[9px] uppercase font-bold text-gray-500">{label}</p>
      <p className="text-[11px] text-gray-900 mt-1 whitespace-pre-wrap">{value || '-'}</p>
    </div>
  )
}

function obtenerUrlLogo(logo) {
  if (!logo) return ''
  if (typeof logo === 'string') return texto(logo)
  return texto(logo?.url || logo?.path || logo?.logo_url)
}

function obtenerDocumentoActa(documentos) {
  const lista = Array.isArray(documentos) ? documentos : []
  const activos = lista.filter(item => item?.activo !== false)

  const porTipo = activos.find(item =>
    [
      'ACTA_TRATAMIENTO_SINIESTRO',
      'ACTA_SINIESTRO',
      'ACTA_DE_TRATAMIENTO_DEL_SINIESTRO_VIAL',
    ].includes(normalizar(item?.tipo_documento))
  )

  if (porTipo) return porTipo

  return (
    activos.find(item => {
      const nombre = normalizar(item?.nombre_documento)
      return (
        nombre.includes('ACTA') &&
        nombre.includes('SINIESTRO')
      )
    }) || null
  )
}

function valorElementoEncabezado({ elemento, documento, logo }) {
  const tipo = normalizar(elemento?.tipo)
  const prefijo = texto(elemento?.prefijo)

  switch (tipo) {
    case 'LOGO':
      return { tipo: 'LOGO', valor: obtenerUrlLogo(logo) }

    case 'NOMBRE_DOCUMENTO':
      return {
        tipo: 'TEXTO',
        valor:
          texto(documento?.nombre_documento) ||
          'ACTA DE TRATAMIENTO DE SINIESTRO VIAL',
      }

    case 'CODIGO':
      return {
        tipo: 'TEXTO',
        valor: `${prefijo}${texto(documento?.codigo) || '-'}`,
      }

    case 'FECHA_EDICION':
      return {
        tipo: 'TEXTO',
        valor: `${prefijo}${fecha(documento?.fecha_edicion)}`,
      }

    case 'VERSION':
      return {
        tipo: 'TEXTO',
        valor: `${prefijo}${texto(documento?.version) || '-'}`,
      }

    case 'VIGENCIA':
      return {
        tipo: 'TEXTO',
        valor: `${prefijo}${fecha(documento?.vigencia)}`,
      }

    case 'PAGINACION':
      return {
        tipo: 'TEXTO',
        valor: `${prefijo}1 de 1`,
      }

    case 'TEXTO':
      return {
        tipo: 'TEXTO',
        valor: texto(elemento?.valor),
      }

    case 'VACIO':
    default:
      return { tipo: 'TEXTO', valor: '' }
  }
}

function EncabezadoDocumento({ encabezado, documento, logo }) {
  const filas = Number(
    encabezado?.filas ||
      encabezado?.estructura?.filas?.length ||
      0
  )

  const columnas = Number(
    encabezado?.columnas ||
      encabezado?.estructura?.columnas?.length ||
      0
  )

  const estructura =
    encabezado?.estructura && typeof encabezado.estructura === 'object'
      ? encabezado.estructura
      : null

  const celdas = Array.isArray(estructura?.celdas)
    ? estructura.celdas
    : []

  const columnasConfig = Array.isArray(estructura?.columnas)
    ? estructura.columnas
    : []

  const filasConfig = Array.isArray(estructura?.filas)
    ? estructura.filas
    : []

  if (!filas || !columnas || celdas.length === 0) {
    return null
  }

  const ocupadas = new Set()
  const celdasPorPosicion = new Map()

  for (const celda of celdas) {
    const filaInicio = Number(celda?.fila || 1)
    const columnaInicio = Number(celda?.columna || 1)
    const rowSpan = Number(celda?.rowSpan || 1)
    const colSpan = Number(celda?.colSpan || 1)

    celdasPorPosicion.set(`${filaInicio}-${columnaInicio}`, celda)

    for (let fila = filaInicio; fila < filaInicio + rowSpan; fila += 1) {
      for (
        let columna = columnaInicio;
        columna < columnaInicio + colSpan;
        columna += 1
      ) {
        if (fila === filaInicio && columna === columnaInicio) continue
        ocupadas.add(`${fila}-${columna}`)
      }
    }
  }

  const anchoTotal = columnasConfig.reduce(
    (suma, columna) => suma + Number(columna?.ancho || 0),
    0
  )

  return (
    <table className="w-full table-fixed border-collapse text-black">
      <colgroup>
        {Array.from({ length: columnas }, (_, index) => {
          const ancho = Number(columnasConfig[index]?.ancho || 0)
          const porcentaje =
            anchoTotal > 0 ? (ancho / anchoTotal) * 100 : 100 / columnas

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

                if (!celda) {
                  return (
                    <td
                      key={posicion}
                      className="border border-black"
                    />
                  )
                }

                const elementos = Array.isArray(celda?.elementos)
                  ? celda.elementos
                  : []

                const alineacionHorizontal =
                  celda?.alineacion_horizontal === 'left'
                    ? 'text-left'
                    : celda?.alineacion_horizontal === 'right'
                      ? 'text-right'
                      : 'text-center'

                const alineacionVertical =
                  celda?.alineacion_vertical === 'top'
                    ? 'align-top'
                    : celda?.alineacion_vertical === 'bottom'
                      ? 'align-bottom'
                      : 'align-middle'

                const estilosBorde = {
                  borderTop:
                    celda?.borde_superior === false ? 'none' : undefined,
                  borderBottom:
                    celda?.borde_inferior === false ? 'none' : undefined,
                  borderLeft:
                    celda?.borde_izquierdo === false ? 'none' : undefined,
                  borderRight:
                    celda?.borde_derecho === false ? 'none' : undefined,
                }

                return (
                  <td
                    key={posicion}
                    rowSpan={Number(celda?.rowSpan || 1)}
                    colSpan={Number(celda?.colSpan || 1)}
                    style={estilosBorde}
                    className={`border border-black px-[1.2mm] py-[0.8mm] ${alineacionHorizontal} ${alineacionVertical}`}
                  >
                    <div className="flex h-full flex-col justify-center gap-[0.4mm]">
                      {elementos.map((elemento, index) => {
                        const resultado = valorElementoEncabezado({
                          elemento,
                          documento,
                          logo,
                        })

                        if (resultado.tipo === 'LOGO') {
                          return resultado.valor ? (
                            <img
                              key={index}
                              src={resultado.valor}
                              alt="Logo institucional"
                              className="mx-auto max-h-[18mm] max-w-full object-contain"
                            />
                          ) : null
                        }

                        return (
                          <div
                            key={index}
                            style={{
                              fontSize: `${Number(
                                elemento?.tamano_fuente || 9
                              )}px`,
                              fontWeight: elemento?.negrita ? 700 : 400,
                            }}
                            className="break-words leading-tight"
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

export default function ActaSiniestroPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id
  const nit = texto(searchParams.get('nit'))

  const [data, setData] = useState(null)
  const [encabezado, setEncabezado] = useState(null)
  const [documento, setDocumento] = useState(null)
  const [logo, setLogo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id || !nit) return

    const cargar = async () => {
      try {
        const qs = new URLSearchParams({ nit, recurso: 'acta', id: String(id) })
        const response = await fetch(`/api/admin/consultas/siniestros?${qs.toString()}`, {
          cache: 'no-store',
        })
        const result = await response.json()
        if (!response.ok || result?.status !== 'success') {
          throw new Error(result?.message || 'No fue posible cargar el acta.')
        }
        if (!result?.acta || result.acta.estado !== 'FINALIZADA') {
          throw new Error('El acta debe estar FINALIZADA para generar el PDF.')
        }
        const qsDocumentos = new URLSearchParams({ nit })
        const responseDocumentos = await fetch(
          `/api/admin/configuracion-documentos?${qsDocumentos.toString()}`,
          {
            method: 'GET',
            headers: { 'x-cea-nit': nit },
            cache: 'no-store',
          }
        )

        const dataDocumentos = await responseDocumentos.json()

        if (!responseDocumentos.ok || dataDocumentos?.ok !== true) {
          throw new Error(
            dataDocumentos?.error ||
              dataDocumentos?.message ||
              'No fue posible consultar la configuración documental.'
          )
        }

        const encabezadoEncontrado = dataDocumentos?.encabezado || null

        if (!encabezadoEncontrado) {
          throw new Error(
            'No se encontró la configuración del encabezado documental.'
          )
        }

        const documentoEncontrado =
          obtenerDocumentoActa(dataDocumentos?.documentos) || {
            tipo_documento: 'ACTA_TRATAMIENTO_SINIESTRO',
            nombre_documento: 'ACTA DE TRATAMIENTO DE SINIESTRO VIAL',
            codigo: '',
            fecha_edicion: '',
            version: '',
            vigencia: '',
            activo: true,
          }

        let logoEncontrado =
          dataDocumentos?.logo ||
          dataDocumentos?.empresa?.logo ||
          dataDocumentos?.empresa?.logo_url ||
          dataDocumentos?.encabezado?.logo ||
          dataDocumentos?.encabezado?.logo_url ||
          null

        if (!obtenerUrlLogo(logoEncontrado)) {
          try {
            const qsLogo = new URLSearchParams({
              nit,
              anio: String(
                new Date(
                  result?.acta?.fecha_acta ||
                    result?.siniestro?.fecha_siniestro ||
                    Date.now()
                ).getFullYear()
              ),
            })

            const responseLogo = await fetch(
              `/api/admin/pesv/riesgos?${qsLogo.toString()}`,
              {
                method: 'GET',
                headers: { 'x-cea-nit': nit },
                cache: 'no-store',
              }
            )

            const dataLogo = await responseLogo.json()

            if (responseLogo.ok) {
              logoEncontrado = dataLogo?.logo || logoEncontrado
            }
          } catch (errorLogo) {
            console.warn('No fue posible cargar el logo institucional:', errorLogo)
          }
        }

        setData(result)
        setEncabezado(encabezadoEncontrado)
        setDocumento(documentoEncontrado)
        setLogo(logoEncontrado)
      } catch (e) {
        setError(e?.message || 'No fue posible cargar el acta.')
      }
    }

    cargar()
  }, [id, nit])

  if (error) {
    return <div className="p-8 text-center text-red-700 font-semibold">{error}</div>
  }

  if (!data) {
    return <div className="p-8 text-center text-gray-600">Cargando acta...</div>
  }

  const s = data.siniestro || {}
  const a = data.acta || {}
  const empresa = data.empresa || {}
  const participantes = Array.isArray(a.participantes) ? a.participantes : []

  const totalDirecto =
    Number(s.costo_dir_choque_simple || 0) +
    Number(s.costo_dir_heridos_l || 0) +
    Number(s.costo_dir_heridos_g || 0) +
    Number(s.costo_dir_fatalidad || 0)

  const totalIndirecto =
    Number(s.costo_indi_choque_simple || 0) +
    Number(s.costo_indi_heridos_l || 0) +
    Number(s.costo_indi_heridos_g || 0) +
    Number(s.costo_indi_fatalidad || 0)

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white py-6 print:py-0">
      <style jsx global>{`
        @page { size: Letter portrait; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; max-width: none !important; }
          .avoid-break { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print max-w-[850px] mx-auto mb-3 flex justify-end gap-2 px-3">
        <button
          type="button"
          onClick={() => window.close()}
          className="px-4 py-2 rounded-lg border bg-white text-xs font-bold"
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold"
        >
          Generar / guardar PDF
        </button>
      </div>

      <main className="print-sheet max-w-[850px] mx-auto bg-white border shadow-sm p-6 text-gray-900">
        <header className="avoid-break">
          <EncabezadoDocumento
            encabezado={encabezado}
            documento={documento}
            logo={logo}
          />

          <div className="pt-[5mm] pb-[2mm] text-center">
            <h1 className="text-[15px] font-black uppercase tracking-[0.04em]">
              Acta de tratamiento de siniestro vial
            </h1>

            <p className="mt-[1.5mm] text-[10px] font-semibold text-gray-700">
              Acta {a.numero_acta} · {fecha(a.fecha_acta)}
            </p>

            <p className="mt-[1mm] text-[8px] text-gray-500">
              {empresa?.nombre || empresa?.razon_social || ''} · NIT {empresa?.nit || nit}
            </p>
          </div>
        </header>

        <section className="avoid-break mt-4 border rounded-lg overflow-hidden">
          <h2 className="bg-slate-700 text-white px-3 py-2 text-[10px] font-bold uppercase">1. Identificación del siniestro</h2>
          <div className="grid grid-cols-2 gap-3 p-3">
            <Campo label="Consecutivo" value={s.consecutivo || `#${s.id}`} />
            <Campo label="Fecha del siniestro" value={fecha(s.fecha_siniestro)} />
            <Campo label="Tipo de siniestro" value={s.tipo_siniestro} />
            <Campo label="Placa" value={s.placa} />
            <Campo label="Conductor" value={s.nombre_conductor_implicado} />
            <Campo label="Identificación" value={s.documento} />
            <Campo label="Personas involucradas" value={String(s.num_personas_involucradas ?? 0)} />
            <Campo label="Heridos leves / graves / fatalidades" value={`${s.heridos_leves || 0} / ${s.heridos_graves || 0} / ${s.fatalidades || 0}`} />
            <Campo label="IPAT" value={s.numero_ipat} />
            <Campo label="Autoridad" value={s.autoridad} />
            <Campo label="Resumen inicial" value={s.resumen} wide />
          </div>
        </section>

        <section className="avoid-break mt-4 border rounded-lg overflow-hidden">
          <h2 className="bg-slate-700 text-white px-3 py-2 text-[10px] font-bold uppercase">2. Tratamiento realizado</h2>
          <div className="p-3 space-y-3">
            <Campo label="Análisis / tratamiento" value={a.tratamiento_realizado || s.resumen_analisis} wide />
            <Campo label="Acciones preventivas para evitar que se repita" value={a.acciones_preventivas} wide />
            <Campo label="Acuerdos y compromisos" value={a.acuerdos_compromisos} wide />
            <Campo label="Responsables de los compromisos" value={a.responsables_compromisos} wide />
            <Campo label="Fecha de seguimiento" value={fecha(a.fecha_seguimiento)} wide />
          </div>
        </section>

        <section className="avoid-break mt-4 border rounded-lg overflow-hidden">
          <h2 className="bg-slate-700 text-white px-3 py-2 text-[10px] font-bold uppercase">3. Participantes</h2>
          <div className="p-3">
            {participantes.length ? participantes.map((p, i) => (
              <p key={i} className="text-[11px] py-1 border-b last:border-b-0">
                {typeof p === 'string' ? p : [p?.nombre, p?.cargo].filter(Boolean).join(' - ')}
              </p>
            )) : <p className="text-[11px]">-</p>}
          </div>
        </section>

        <section className="avoid-break mt-4 border rounded-lg overflow-hidden">
          <h2 className="bg-slate-700 text-white px-3 py-2 text-[10px] font-bold uppercase">4. Costos asociados</h2>
          <div className="grid grid-cols-3 gap-3 p-3 text-center">
            <div><p className="text-[9px] font-bold uppercase text-gray-500">Directos</p><p className="text-[11px] font-bold">{dinero(totalDirecto)}</p></div>
            <div><p className="text-[9px] font-bold uppercase text-gray-500">Indirectos</p><p className="text-[11px] font-bold">{dinero(totalIndirecto)}</p></div>
            <div><p className="text-[9px] font-bold uppercase text-gray-500">Total</p><p className="text-[11px] font-bold">{dinero(totalDirecto + totalIndirecto)}</p></div>
          </div>
        </section>

        {a.observaciones && (
          <section className="avoid-break mt-4 border rounded-lg p-3">
            <Campo label="Observaciones" value={a.observaciones} wide />
          </section>
        )}

        <footer className="avoid-break mt-8 grid grid-cols-2 gap-10 text-center text-[10px]">
          <div className="border-t border-gray-700 pt-2">
            Elaboró: {a.elaborado_por || '-'}
          </div>
          <div className="border-t border-gray-700 pt-2">
            Finalizó: {a.finalizado_por || '-'}
          </div>
        </footer>

        <p className="mt-6 text-[8px] text-gray-500 text-center">
          Documento reconstruido por DATA-CEA a partir de la información registrada en el expediente digital del siniestro.
        </p>
      </main>
    </div>
  )
}
