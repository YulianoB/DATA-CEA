// app/admin/sinst-vigia/evidencias/a2/page.jsx

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

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
      <p className="text-[8px] uppercase font-bold text-gray-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-[10px] leading-[1.45] text-gray-900">
        {value || '-'}
      </p>
    </div>
  )
}

function FilaDocumento({ children, divisible = false, saltoAntes = false }) {
  return (
    <tr
      className={[
        'fila-bloque-a2',
        divisible
          ? 'fila-bloque-a2-divisible'
          : 'fila-bloque-a2-no-divisible',
        saltoAntes ? 'salto-antes-acta' : '',
      ].join(' ')}
    >
      <td className="celda-contenido-a2 p-0 align-top">
        {children}
      </td>
    </tr>
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
      return nombre.includes('ACTA') && nombre.includes('SINIESTRO')
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
          'ACTA DE TRATAMIENTO DEL SINIESTRO VIAL',
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
                  return <td key={posicion} className="border border-black" />
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

function DocumentoActa({
  registro,
  empresa,
  nit,
  primero,
}) {
  const s = registro?.siniestro || {}
  const a = registro?.acta || {}
  const participantes = Array.isArray(a.participantes)
    ? a.participantes
    : []

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
    <>
      <FilaDocumento saltoAntes={!primero}>
        <header className="bloque-no-dividir-a2 pb-[2mm] pt-[2mm] text-center">
          <h1 className="text-[15px] font-black uppercase tracking-[0.04em]">
            Acta de tratamiento del siniestro vial
          </h1>

          <p className="mt-[1.5mm] text-[10px] font-semibold text-gray-700">
            Acta {a.numero_acta} · {fecha(a.fecha_acta)}
          </p>

          <p className="mt-[1mm] text-[8px] text-gray-500">
            {empresa?.nombre || empresa?.razon_social || ''} · NIT{' '}
            {empresa?.nit || nit}
          </p>
        </header>
      </FilaDocumento>

      <FilaDocumento divisible>
        <section className="mt-[2mm] overflow-hidden rounded-lg border">
          <h2 className="titulo-seccion-a2 bg-slate-700 px-3 py-2 text-[10px] font-bold uppercase text-white">
            1. Identificación del siniestro
          </h2>

          <div className="grid grid-cols-2 gap-3 p-3">
            <Campo label="Consecutivo" value={s.consecutivo || `#${s.id}`} />
            <Campo label="Fecha del siniestro" value={fecha(s.fecha_siniestro)} />
            <Campo label="Tipo de siniestro" value={s.tipo_siniestro} />
            <Campo label="Placa" value={s.placa} />
            <Campo label="Conductor" value={s.nombre_conductor_implicado} />
            <Campo label="Identificación" value={s.documento} />
            <Campo
              label="Personas involucradas"
              value={String(s.num_personas_involucradas ?? 0)}
            />
            <Campo
              label="Heridos leves / graves / fatalidades"
              value={`${s.heridos_leves || 0} / ${s.heridos_graves || 0} / ${s.fatalidades || 0}`}
            />
            <Campo label="IPAT" value={s.numero_ipat} />
            <Campo label="Autoridad" value={s.autoridad} />
            <Campo label="Resumen inicial" value={s.resumen} wide />
          </div>
        </section>
      </FilaDocumento>

      <FilaDocumento divisible>
        <section className="mt-[4mm] overflow-hidden rounded-lg border">
          <h2 className="titulo-seccion-a2 bg-slate-700 px-3 py-2 text-[10px] font-bold uppercase text-white">
            2. Tratamiento realizado
          </h2>

          <div className="space-y-3 p-3">
            <Campo
              label="Análisis / tratamiento"
              value={a.tratamiento_realizado || s.resumen_analisis}
              wide
            />
            <Campo
              label="Acciones preventivas para evitar que se repita"
              value={a.acciones_preventivas}
              wide
            />
            <Campo
              label="Acuerdos y compromisos"
              value={a.acuerdos_compromisos}
              wide
            />
            <Campo
              label="Responsables de los compromisos"
              value={a.responsables_compromisos}
              wide
            />
            <Campo
              label="Fecha de seguimiento"
              value={fecha(a.fecha_seguimiento)}
              wide
            />
          </div>
        </section>
      </FilaDocumento>

      <FilaDocumento>
        <section className="bloque-no-dividir-a2 mt-[4mm] overflow-hidden rounded-lg border">
          <h2 className="titulo-seccion-a2 bg-slate-700 px-3 py-2 text-[10px] font-bold uppercase text-white">
            3. Participantes
          </h2>

          <div className="p-3">
            {participantes.length ? (
              participantes.map((p, i) => (
                <p
                  key={i}
                  className="border-b py-1 text-[10px] last:border-b-0"
                >
                  {typeof p === 'string'
                    ? p
                    : [p?.nombre, p?.cargo].filter(Boolean).join(' - ')}
                </p>
              ))
            ) : (
              <p className="text-[10px]">-</p>
            )}
          </div>
        </section>
      </FilaDocumento>

      <FilaDocumento>
        <section className="bloque-no-dividir-a2 mt-[4mm] overflow-hidden rounded-lg border">
          <h2 className="titulo-seccion-a2 bg-slate-700 px-3 py-2 text-[10px] font-bold uppercase text-white">
            4. Costos asociados
          </h2>

          <div className="grid grid-cols-3 gap-3 p-3 text-center">
            <div>
              <p className="text-[8px] font-bold uppercase text-gray-500">
                Directos
              </p>
              <p className="text-[10px] font-bold">{dinero(totalDirecto)}</p>
            </div>

            <div>
              <p className="text-[8px] font-bold uppercase text-gray-500">
                Indirectos
              </p>
              <p className="text-[10px] font-bold">{dinero(totalIndirecto)}</p>
            </div>

            <div>
              <p className="text-[8px] font-bold uppercase text-gray-500">
                Total
              </p>
              <p className="text-[10px] font-bold">
                {dinero(totalDirecto + totalIndirecto)}
              </p>
            </div>
          </div>
        </section>
      </FilaDocumento>

      {a.observaciones ? (
        <FilaDocumento divisible>
          <section className="mt-[4mm] rounded-lg border p-3">
            <Campo label="Observaciones" value={a.observaciones} wide />
          </section>
        </FilaDocumento>
      ) : null}

      <FilaDocumento>
        <footer className="firmas-a2 mt-[8mm] grid grid-cols-2 gap-[15mm] px-[5mm] text-center text-[9px]">
          <div>
            <div className="h-[8mm]" />
            <div className="border-t border-gray-700 pt-[2mm]">
              Elaboró: {a.elaborado_por || '-'}
            </div>
          </div>

          <div>
            <div className="h-[8mm]" />
            <div className="border-t border-gray-700 pt-[2mm]">
              Finalizó: {a.finalizado_por || '-'}
            </div>
          </div>
        </footer>
      </FilaDocumento>

      <FilaDocumento>
        <p className="bloque-no-dividir-a2 mt-[3mm] border-t border-gray-300 pt-[1mm] text-center text-[7px] text-gray-500">
          Documento reconstruido por DATA-CEA a partir de la información
          registrada en el expediente digital del siniestro.
        </p>
      </FilaDocumento>
    </>
  )
}

export default function EvidenciaA2Page() {
  const searchParams = useSearchParams()

  const nit = texto(searchParams.get('nit'))
  const anio = Number(searchParams.get('anio'))
  const trimestre = Number(searchParams.get('trimestre'))

  const [data, setData] = useState(null)
  const [encabezado, setEncabezado] = useState(null)
  const [documento, setDocumento] = useState(null)
  const [logo, setLogo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!nit || !anio || ![1, 2, 3, 4].includes(trimestre)) {
      setError('No se recibió un período válido para la evidencia A-2.')
      return
    }

    let activo = true

    const cargar = async () => {
      try {
        const respuesta = await fetch(
          '/api/admin/sinst-vigia/evidencias',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-cea-nit': nit,
            },
            body: JSON.stringify({
              accion: 'PREPARAR_A2',
              nit,
              anio,
              trimestre,
            }),
            cache: 'no-store',
          }
        )

        const resultado = await respuesta.json()

        if (!respuesta.ok || resultado?.ok !== true) {
          throw new Error(
            resultado?.error ||
              resultado?.message ||
              'No fue posible preparar la evidencia A-2.'
          )
        }

        const parametrosDocumentos =
          new URLSearchParams({ nit })

        const respuestaDocumentos = await fetch(
          `/api/admin/configuracion-documentos?${parametrosDocumentos.toString()}`,
          {
            method: 'GET',
            headers: {
              'x-cea-nit': nit,
            },
            cache: 'no-store',
          }
        )

        const dataDocumentos =
          await respuestaDocumentos.json()

        if (
          !respuestaDocumentos.ok ||
          dataDocumentos?.ok !== true
        ) {
          throw new Error(
            dataDocumentos?.error ||
              dataDocumentos?.message ||
              'No fue posible consultar la configuración documental.'
          )
        }

        const encabezadoEncontrado =
          dataDocumentos?.encabezado || null

        if (!encabezadoEncontrado) {
          throw new Error(
            'No se encontró la configuración del encabezado documental.'
          )
        }

        const documentoEncontrado =
          obtenerDocumentoActa(
            dataDocumentos?.documentos
          ) || {
            tipo_documento:
              'ACTA_TRATAMIENTO_SINIESTRO',
            nombre_documento:
              'ACTA DE TRATAMIENTO DEL SINIESTRO VIAL',
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
            const parametrosLogo =
              new URLSearchParams({
                nit,
                anio: String(anio),
              })

            const respuestaLogo = await fetch(
              `/api/admin/pesv/riesgos?${parametrosLogo.toString()}`,
              {
                method: 'GET',
                headers: {
                  'x-cea-nit': nit,
                },
                cache: 'no-store',
              }
            )

            const dataLogo =
              await respuestaLogo.json()

            if (respuestaLogo.ok) {
              logoEncontrado =
                dataLogo?.logo ||
                logoEncontrado
            }
          } catch (errorLogo) {
            console.warn(
              'No fue posible cargar el logo institucional:',
              errorLogo
            )
          }
        }

        if (activo) {
          setData(resultado)
          setEncabezado(encabezadoEncontrado)
          setDocumento(documentoEncontrado)
          setLogo(logoEncontrado)
        }
      } catch (e) {
        if (activo) {
          setError(
            e?.message ||
              'No fue posible preparar la evidencia A-2.'
          )
        }
      }
    }

    cargar()

    return () => {
      activo = false
    }
  }, [nit, anio, trimestre])

  if (error) {
    return (
      <div className="p-8 text-center font-semibold text-red-700">
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-600">
        Preparando evidencia A-2...
      </div>
    )
  }

  const registros =
    Array.isArray(data?.registros)
      ? data.registros
      : []

  const empresa = data?.empresa || {}

  return (
    <div className="pagina-a2 min-h-screen bg-gray-100 print:bg-white">
      <style jsx global>{`
        .pagina-a2 {
          width: 100%;
          min-height: 100vh;
          padding-top: 20px;
          padding-bottom: 30px;
          box-sizing: border-box;
        }

        .hoja-a2 {
          width: 215.9mm;
          max-width: calc(100vw - 32px);
          min-height: 279.4mm;
          margin-left: auto;
          margin-right: auto;
          padding: 8mm 10mm 10mm 10mm;
          box-sizing: border-box;
        }

        .tabla-documento-a2 {
          width: 100%;
          max-width: 100%;
          margin: 0;
          border-collapse: collapse;
          table-layout: fixed;
          box-sizing: border-box;
        }

        .tabla-documento-a2 td,
        .tabla-documento-a2 th {
          box-sizing: border-box;
          overflow-wrap: anywhere;
          word-break: normal;
        }

        .encabezado-a2-repetible {
          display: table-header-group;
        }

        .titulo-seccion-a2 {
          break-after: avoid;
          page-break-after: avoid;
        }

        .firmas-a2,
        .bloque-no-dividir-a2 {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        @media print {
          @page {
            size: Letter portrait;
            margin: 0;
          }

          html,
          body {
            width: 215.9mm !important;
            min-width: 215.9mm !important;
            max-width: 215.9mm !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .pagina-a2 {
            width: 215.9mm !important;
            min-width: 215.9mm !important;
            max-width: 215.9mm !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }

          .no-print {
            display: none !important;
          }

          .hoja-a2 {
            width: 215.9mm !important;
            min-width: 215.9mm !important;
            max-width: 215.9mm !important;
            min-height: 0 !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding-top: 7mm !important;
            padding-right: 10mm !important;
            padding-bottom: 0 !important;
            padding-left: 10mm !important;
            box-sizing: border-box !important;
            background: white !important;
            box-shadow: none !important;
            overflow: visible !important;
            page-break-before: auto !important;
            break-before: auto !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .tabla-documento-a2 {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            box-sizing: border-box !important;
            page-break-before: auto !important;
            break-before: auto !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .tabla-documento-a2 > thead,
          .encabezado-a2-repetible {
            display: table-header-group !important;
          }

          .tabla-documento-a2 > tbody {
            display: table-row-group !important;
          }

          .tabla-documento-a2 > thead > tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .tabla-documento-a2 > thead > tr > td {
            padding-top: 6mm !important;
            padding-right: 0 !important;
            padding-bottom: 3mm !important;
            padding-left: 0 !important;
          }

          .tabla-documento-a2 > tbody > tr.fila-bloque-a2 {
            page-break-before: auto !important;
            break-before: auto !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .tabla-documento-a2
            > tbody
            > tr.fila-bloque-a2-no-divisible,
          .tabla-documento-a2
            > tbody
            > tr.fila-bloque-a2-no-divisible
            > td {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .tabla-documento-a2
            > tbody
            > tr.fila-bloque-a2-divisible,
          .tabla-documento-a2
            > tbody
            > tr.fila-bloque-a2-divisible
            > td {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .tabla-documento-a2
            > tbody
            > tr.fila-bloque-a2
            > td.celda-contenido-a2 {
            padding-bottom: 0 !important;
          }

          .tabla-documento-a2
            > tbody
            > tr.fila-bloque-a2:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .fila-bloque-a2-divisible .bloque-no-dividir-a2 {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .titulo-seccion-a2 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .firmas-a2 {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: auto !important;
            break-before: auto !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .salto-antes-acta {
            page-break-before: always !important;
            break-before: page !important;
          }

          .hoja-a2 img {
            max-width: 100% !important;
          }

          .hoja-a2,
          .hoja-a2 * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-3 flex max-w-[850px] justify-end gap-2 px-3">
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border bg-white px-4 py-2 text-xs font-bold"
        >
          Cerrar
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white"
        >
          Generar / guardar PDF
        </button>
      </div>

      <main className="hoja-a2 mx-auto bg-white text-gray-900 shadow-lg">
        <table className="tabla-documento-a2 w-full border-collapse">
          <thead className="encabezado-a2-repetible">
            <tr>
              <td className="p-0 align-top">
                <EncabezadoDocumento
                  encabezado={encabezado}
                  documento={documento}
                  logo={logo}
                />
              </td>
            </tr>
          </thead>

          <tbody>
        {registros.length === 0 ? (
          <FilaDocumento>
          <article className="bg-white">
            <div className="pb-[3mm] pt-[6mm] text-center">
              <h1 className="text-[15px] font-black uppercase tracking-[0.04em]">
                Soporte de tratamiento de siniestros viales
              </h1>
              <p className="mt-2 text-[10px] font-semibold text-gray-700">
                Evidencia A-2 · Trimestre {trimestre} · {anio}
              </p>
            </div>

            <div className="mt-6 rounded-lg border p-5 text-[11px] leading-6">
              <p>
                {Number(data?.total_siniestros || 0) === 0 ? (
                  <>
                    Durante el período comprendido entre{' '}
                    <strong>{fecha(data?.periodo?.desde)}</strong> y{' '}
                    <strong>{fecha(data?.periodo?.hasta)}</strong> no se registraron
                    siniestros viales en DATA-CEA. En consecuencia, para este
                    período no existen actas internas de tratamiento de siniestros
                    para consolidar en la presente evidencia.
                  </>
                ) : (
                  <>
                    Durante el período consultado se registraron{' '}
                    <strong>{data?.total_siniestros}</strong> siniestro(s), pero
                    ninguno cuenta todavía con un acta de tratamiento FINALIZADA.
                    Los siniestros continúan en gestión y, por tanto, no se
                    incorporan actas no finalizadas a la presente evidencia.
                  </>
                )}
              </p>
            </div>

            <p className="mt-8 text-center text-[8px] text-gray-500">
              Documento generado a partir de los registros del período consultado.
            </p>
          </article>
          </FilaDocumento>
        ) : (
          registros.map((registro, index) => (
            <DocumentoActa
              key={registro?.acta?.id || index}
              registro={registro}
              empresa={empresa}
              nit={nit}
              primero={index === 0}
            />
          ))
        )}
          </tbody>
        </table>
      </main>
    </div>
  )
}
