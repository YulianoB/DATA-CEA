// app/admin/sinst-vigia/evidencias/a3/page.jsx

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


export default function EvidenciaA3Page() {
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
      setError('No se recibió un período válido para la evidencia A-3.')
      return
    }

    let activo = true

    const cargar = async () => {
      try {
        const respuesta = await fetch('/api/admin/sinst-vigia/evidencias', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cea-nit': nit,
          },
          body: JSON.stringify({
            accion: 'PREPARAR_A3',
            nit,
            anio,
            trimestre,
          }),
          cache: 'no-store',
        })

        const resultado = await respuesta.json()

        if (!respuesta.ok || resultado?.ok !== true) {
          throw new Error(
            resultado?.error ||
              resultado?.message ||
              'No fue posible preparar la evidencia A-3.'
          )
        }

        const respuestaDocumentos = await fetch(
          `/api/admin/configuracion-documentos?${new URLSearchParams({ nit }).toString()}`,
          {
            method: 'GET',
            headers: { 'x-cea-nit': nit },
            cache: 'no-store',
          }
        )

        const dataDocumentos = await respuestaDocumentos.json()

        if (!respuestaDocumentos.ok || dataDocumentos?.ok !== true) {
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

        const documentos = Array.isArray(dataDocumentos?.documentos)
          ? dataDocumentos.documentos
          : []

        const documentoEncontrado =
          documentos.find(item => {
            const nombre = normalizar(item?.nombre_documento)
            return (
              item?.activo !== false &&
              nombre.includes('CERTIFIC') &&
              (nombre.includes('JUSTIFIC') || nombre.includes('PESV'))
            )
          }) || {
            nombre_documento:
              'CERTIFICACIÓN Y JUSTIFICACIÓN DE EVIDENCIA SINST - VIGIA 2',
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
            const respuestaLogo = await fetch(
              `/api/admin/pesv/riesgos?${new URLSearchParams({
                nit,
                anio: String(anio),
              }).toString()}`,
              {
                method: 'GET',
                headers: { 'x-cea-nit': nit },
                cache: 'no-store',
              }
            )

            const dataLogo = await respuestaLogo.json()

            if (respuestaLogo.ok) {
              logoEncontrado = dataLogo?.logo || logoEncontrado
            }
          } catch {
            // El documento puede generarse sin logo si no existe uno configurado.
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
              'No fue posible preparar la evidencia A-3.'
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
        Preparando evidencia A-3...
      </div>
    )
  }

  const empresa = data?.empresa || {}
  const evidencia = data?.evidencia || {}
  const representante =
    evidencia?.representante_legal || empresa?.representante_legal || ''
  const documentoRepresentante =
    evidencia?.documento_representante || empresa?.documento_representante || ''

  return (
    <div className="pagina-a3 min-h-screen bg-gray-100 print:bg-white">
      <style jsx global>{`
        .pagina-a3 {
          width: 100%;
          min-height: 100vh;
          padding-top: 20px;
          padding-bottom: 30px;
          box-sizing: border-box;
        }

        .hoja-a3 {
          width: 215.9mm;
          max-width: calc(100vw - 32px);
          min-height: 279.4mm;
          margin-left: auto;
          margin-right: auto;
          padding: 8mm 10mm 10mm 10mm;
          box-sizing: border-box;
        }

        .tabla-documento-a3 {
          width: 100%;
          max-width: 100%;
          margin: 0;
          border-collapse: collapse;
          table-layout: fixed;
          box-sizing: border-box;
        }

        .encabezado-a3-repetible {
          display: table-header-group;
        }

        .fila-a3,
        .fila-a3 > td {
          page-break-inside: auto;
          break-inside: auto;
        }

        .no-dividir-a3 {
          page-break-inside: avoid;
          break-inside: avoid;
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
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .pagina-a3 {
            width: 215.9mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .hoja-a3 {
            width: 215.9mm !important;
            min-width: 215.9mm !important;
            max-width: 215.9mm !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding-top: 7mm !important;
            padding-right: 10mm !important;
            padding-bottom: 0 !important;
            padding-left: 10mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .tabla-documento-a3 {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }

          .tabla-documento-a3 > thead,
          .encabezado-a3-repetible {
            display: table-header-group !important;
          }

          .tabla-documento-a3 > thead > tr,
          .tabla-documento-a3 > thead > tr > td {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .tabla-documento-a3 > thead > tr > td {
            padding-top: 6mm !important;
            padding-right: 0 !important;
            padding-bottom: 4mm !important;
            padding-left: 0 !important;
          }

          .no-dividir-a3 {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .hoja-a3,
          .hoja-a3 * {
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

      <main className="hoja-a3 mx-auto bg-white text-gray-900 shadow-lg">
        <table className="tabla-documento-a3">
          <thead className="encabezado-a3-repetible">
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
            <tr className="fila-a3">
              <td className="p-0 align-top">
                <div className="no-dividir-a3 pb-[4mm] pt-[2mm] text-center">
                  <h1 className="text-[14px] font-black uppercase leading-5">
                    Certificación y justificación de evidencia A-3
                  </h1>
                  <p className="mt-[1mm] text-[9px] font-semibold text-slate-600">
                    SINST - VIGIA 2 · Formulario A · Trimestre {trimestre} · {anio}
                  </p>
                </div>

                <div className="text-[10px] leading-[1.65] text-justify">
                  <p>
                    Quien suscribe, <strong>{representante || 'Representante Legal'}</strong>,
                    en calidad de Representante Legal del{' '}
                    <strong>{empresa?.razon_social || 'el Centro de Enseñanza Automovilística'}</strong>,
                    identificado con NIT <strong>{empresa?.nit || nit}</strong>,
                    expide la presente certificación y justificación para efectos
                    del reporte de la evidencia A-3 del Formulario A de
                    SINST - VIGIA 2.
                  </p>

                  <div className="no-dividir-a3 mt-[5mm] rounded-lg border border-slate-300">
                    <div className="bg-slate-100 px-[4mm] py-[2.5mm] text-[9px] font-black uppercase">
                      Evidencia requerida
                    </div>
                    <p className="px-[4mm] py-[3mm]">
                      {evidencia?.descripcion_oficial}
                    </p>
                  </div>

                  <h2 className="mt-[6mm] text-[10px] font-black uppercase">
                    Determinación del nivel de diseño e implementación del PESV
                  </h2>

                  <p className="mt-[2mm]">
                    Para la vigencia indicada, el CEA se gestiona en DATA-CEA
                    bajo el nivel <strong>Básico</strong> del Plan Estratégico
                    de Seguridad Vial y desarrolla una actividad diferente a la
                    prestación del servicio de transporte, correspondiente a
                    <strong> Otros tipos de educación</strong>.
                  </p>

                  <p className="mt-[3mm]">
                    Como información de apoyo registrada en DATA-CEA, a la fecha
                    de preparación del documento se identifican{' '}
                    <strong>{evidencia?.numero_vehiculos ?? 0}</strong> vehículo(s)
                    activo(s) y{' '}
                    <strong>{evidencia?.numero_conductores ?? 0}</strong>{' '}
                    instructor(es)/conductor(es) activo(s). Estos valores se
                    incorporan únicamente como información dinámica del CEA y no
                    se utilizan para modificar la clasificación PESV desde este
                    documento.
                  </p>

                  <h2 className="mt-[6mm] text-[10px] font-black uppercase">
                    Justificación de la evidencia A-3
                  </h2>

                  <p className="mt-[2mm]">
                    El modelo de certificación adoptado por el CEA para el nivel
                    Básico identifica dentro de los pasos no aplicables el
                    <strong> Paso 2 – Comité de Seguridad Vial</strong> y el
                    <strong> Paso 13 – Investigación Interna de Accidentes de Tránsito</strong>.
                    En consecuencia, para esta evidencia no se generan ni se
                    fabrican registros de divulgación de lecciones aprendidas,
                    retroalimentaciones o soportes derivados de una investigación
                    interna que no corresponda al esquema adoptado para el CEA.
                  </p>

                  <p className="mt-[3mm]">
                    Por lo anterior, se expide el presente PDF como soporte de
                    justificación frente al requerimiento A-3. El documento no
                    sustituye, altera ni crea evidencias operativas inexistentes;
                    su finalidad es dejar constancia de la razón por la cual no
                    se aporta un archivo de divulgación de lecciones aprendidas
                    asociado a una investigación interna de siniestros.
                  </p>

                  <h2 className="mt-[6mm] text-[10px] font-black uppercase">
                    Declaración
                  </h2>

                  <p className="mt-[2mm]">
                    La presente certificación se prepara para revisión y firma
                    del Representante Legal del CEA y para su utilización como
                    soporte documental del período reportado en SINST - VIGIA 2.
                  </p>
                </div>

                <div className="no-dividir-a3 mt-[14mm] w-[78mm] text-[9px]">
                  <div className="h-[16mm]" />
                  <div className="border-t border-black pt-[2mm]">
                    <p className="font-black uppercase">
                      {representante || 'REPRESENTANTE LEGAL'}
                    </p>
                    <p>Representante Legal</p>
                    {documentoRepresentante ? (
                      <p>C.C. {documentoRepresentante}</p>
                    ) : null}
                    <p>{empresa?.razon_social || ''}</p>
                    <p>NIT {empresa?.nit || nit}</p>
                  </div>
                </div>

                <p className="no-dividir-a3 mt-[8mm] border-t border-slate-300 pt-[2mm] text-center text-[7px] text-slate-500">
                  Documento preparado por DATA-CEA a partir de la configuración
                  institucional y la información registrada para el CEA.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </main>
    </div>
  )
}
