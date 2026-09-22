// app/admin/pesv/auditorias/imprimir/[id]/page.jsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// ============================================================
// HELPERS GENERALES
// app/admin/pesv/auditorias/imprimir/[id]/page.jsx
// ============================================================

function texto(valor) {
  return String(valor ?? '').trim()
}

function normalizar(valor) {
  return texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function etiqueta(valor) {
  const limpio = texto(valor)
  if (!limpio) return '-'

  return limpio
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, letra => letra.toUpperCase())
}

function obtenerNitUsuario(user) {
  return texto(
    user?.nit ||
      user?.nitEmpresa ||
      user?.nit_empresa ||
      user?.empresaNit ||
      user?.empresa_nit ||
      ''
  )
}

function formatearFecha(valor) {
  if (!valor) return '-'

  const fecha = String(valor).slice(0, 10)
  const [anio, mes, dia] = fecha.split('-')

  if (!anio || !mes || !dia) {
    return texto(valor) || '-'
  }

  return `${dia}/${mes}/${anio}`
}

function fechaHoraActual() {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date())
  } catch {
    return ''
  }
}

function valorONoAplica(valor) {
  return texto(valor) || '-'
}

// ============================================================
// DOCUMENTO CONFIGURADO
// app/admin/pesv/auditorias/imprimir/[id]/page.jsx
// API: /api/admin/configuracion-documentos
// ============================================================

function obtenerDocumentoAuditoria(documentos) {
  const lista = Array.isArray(documentos) ? documentos : []
  const activos = lista.filter(item => item?.activo !== false)

  const porTipo = activos.find(item =>
    [
      'AUDITORIA_PESV',
      'INFORME_AUDITORIA_PESV',
      'INFORME_AUDITORIA',
    ].includes(normalizar(item?.tipo_documento))
  )

  if (porTipo) return porTipo

  const auditoriaPesv = activos.find(item => {
    const nombre = normalizar(item?.nombre_documento)
    return nombre.includes('AUDITOR') && nombre.includes('PESV')
  })

  if (auditoriaPesv) return auditoriaPesv

  return (
    activos.find(item =>
      normalizar(item?.nombre_documento).includes('AUDITOR')
    ) || null
  )
}

// ============================================================
// ENCABEZADO DOCUMENTAL CONFIGURABLE
// app/admin/pesv/auditorias/imprimir/[id]/page.jsx
// ============================================================

function valorElementoEncabezado({ elemento, documento, logo }) {
  const tipo = normalizar(elemento?.tipo)
  const prefijo = texto(elemento?.prefijo)

  switch (tipo) {
    case 'LOGO':
      return { tipo: 'LOGO', valor: logo?.url || '' }

    case 'NOMBRE_DOCUMENTO':
      return {
        tipo: 'TEXTO',
        valor:
          texto(documento?.nombre_documento) ||
          'INFORME DE AUDITORÍA PESV',
      }

    case 'CODIGO':
      return {
        tipo: 'TEXTO',
        valor: `${prefijo}${texto(documento?.codigo) || '-'}`,
      }

    case 'FECHA_EDICION':
      return {
        tipo: 'TEXTO',
        valor: `${prefijo}${formatearFecha(documento?.fecha_edicion)}`,
      }

    case 'VERSION':
      return {
        tipo: 'TEXTO',
        valor: `${prefijo}${texto(documento?.version) || '-'}`,
      }

    case 'VIGENCIA':
      return {
        tipo: 'TEXTO',
        valor: `${prefijo}${formatearFecha(documento?.vigencia)}`,
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
  const filas = Number(encabezado?.filas || 0)
  const columnas = Number(encabezado?.columnas || 0)

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
    return (
      <table className="mb-[4mm] w-full table-fixed border-collapse text-black">
        <tbody>
          <tr>
            <td className="w-[28mm] border border-black p-[2mm] text-center">
              {logo?.url ? (
                <img
                  src={logo.url}
                  alt="Logo"
                  className="mx-auto max-h-[18mm] max-w-[24mm] object-contain"
                />
              ) : (
                <div className="text-[7px] font-bold">CEA</div>
              )}
            </td>

            <td className="border border-black p-[2mm] text-center text-[10px] font-black">
              {texto(documento?.nombre_documento) ||
                'INFORME DE AUDITORÍA PESV'}
            </td>

            <td className="w-[48mm] border border-black p-[1.5mm] text-[7px] leading-[1.3]">
              <div>
                <strong>Código:</strong>{' '}
                {texto(documento?.codigo) || '-'}
              </div>
              <div>
                <strong>Versión:</strong>{' '}
                {texto(documento?.version) || '-'}
              </div>
              <div>
                <strong>Vigencia:</strong>{' '}
                {formatearFecha(documento?.vigencia)}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    )
  }

  const ocupadas = new Set()
  const celdasPorPosicion = new Map()

  for (const celda of celdas) {
    celdasPorPosicion.set(`${celda.fila}-${celda.columna}`, celda)

    for (
      let fila = Number(celda.fila);
      fila < Number(celda.fila) + Number(celda.rowSpan || 1);
      fila += 1
    ) {
      for (
        let columna = Number(celda.columna);
        columna < Number(celda.columna) + Number(celda.colSpan || 1);
        columna += 1
      ) {
        if (
          fila === Number(celda.fila) &&
          columna === Number(celda.columna)
        ) {
          continue
        }

        ocupadas.add(`${fila}-${columna}`)
      }
    }
  }

  const anchoTotal = columnasConfig.reduce(
    (suma, columna) => suma + Number(columna?.ancho || 0),
    0
  )

  return (
    <table className="mb-[4mm] w-full table-fixed border-collapse text-black">
      <colgroup>
        {Array.from({ length: columnas }, (_, index) => {
          const ancho = Number(columnasConfig[index]?.ancho || 0)
          const porcentaje =
            anchoTotal > 0 ? (ancho / anchoTotal) * 100 : 100 / columnas

          return (
            <col
              key={index}
              style={{ width: `${porcentaje}%` }}
            />
          )
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
                              alt="Logo"
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

// ============================================================
// COMPONENTES DE DOCUMENTO
// app/admin/pesv/auditorias/imprimir/[id]/page.jsx
// ============================================================

function TituloSeccion({ children }) {
  return (
    <div className="titulo-seccion mt-[4mm] border border-black bg-gray-200 px-[2mm] py-[1.5mm] text-[8px] font-black uppercase tracking-wide text-black">
      {children}
    </div>
  )
}

function Dato({ label, children, className = '' }) {
  return (
    <div className={`border border-black px-[2mm] py-[1.5mm] ${className}`}>
      <div className="text-[6px] font-black uppercase text-black">
        {label}
      </div>

      <div className="mt-[0.6mm] whitespace-pre-wrap text-[7px] leading-[1.35] text-black">
        {children}
      </div>
    </div>
  )
}

function Badge({ children }) {
  return (
    <span className="inline-block rounded-sm border border-black px-[1mm] py-[0.3mm] text-[6px] font-bold text-black">
      {children}
    </span>
  )
}

// ============================================================
// PÁGINA INFORME AUDITORÍA PESV
// app/admin/pesv/auditorias/imprimir/[id]/page.jsx
// API:
// - GET /api/admin/pesv/auditorias?id=...
// - GET /api/admin/configuracion-documentos
// - GET /api/admin/pesv/riesgos (solo para recuperar logo institucional)
// ============================================================

export default function ImprimirAuditoriaPesvPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params?.id)

  const [user, setUser] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [auditoria, setAuditoria] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [encabezado, setEncabezado] = useState(null)
  const [documento, setDocumento] = useState(null)
  const [logo, setLogo] = useState(null)
  const [fechaGeneracion, setFechaGeneracion] = useState('')

  // ==========================================================
  // CONFIGURAR VISTA DE IMPRESIÓN
  // app/admin/pesv/auditorias/imprimir/[id]/page.jsx
  // ==========================================================

  useEffect(() => {
    document.documentElement.classList.add('html-informe-auditoria-pesv')
    document.body.classList.add('body-informe-auditoria-pesv')

    return () => {
      document.documentElement.classList.remove('html-informe-auditoria-pesv')
      document.body.classList.remove('body-informe-auditoria-pesv')
    }
  }, [])

  // ==========================================================
  // SESIÓN
  // app/admin/pesv/auditorias/imprimir/[id]/page.jsx
  // ==========================================================

  useEffect(() => {
    let currentUser

    try {
      currentUser = JSON.parse(
        localStorage.getItem('currentUser') || 'null'
      )
    } catch {
      currentUser = null
    }

    if (!currentUser) {
      router.replace('/login')
      return
    }

    setUser(currentUser)
    setFechaGeneracion(fechaHoraActual())
  }, [router])

  // ==========================================================
  // CARGAR AUDITORÍA + CONFIGURACIÓN DOCUMENTAL
  // app/admin/pesv/auditorias/imprimir/[id]/page.jsx
  // ==========================================================

  useEffect(() => {
    if (!user || !id) return

    const nit = obtenerNitUsuario(user)

    if (!nit) {
      setError('No fue posible identificar el NIT del CEA.')
      setCargando(false)
      return
    }

    let activo = true

    async function cargar() {
      try {
        setCargando(true)
        setError('')

        const parametrosAuditoria = new URLSearchParams({
          nit,
          id: String(id),
        })

        const respuestaAuditoria = await fetch(
          `/api/admin/pesv/auditorias?${parametrosAuditoria.toString()}`,
          {
            method: 'GET',
            headers: {
              'x-cea-nit': nit,
            },
            cache: 'no-store',
          }
        )

        const dataAuditoria = await respuestaAuditoria.json()

        if (
          !respuestaAuditoria.ok ||
          dataAuditoria?.status === 'failed'
        ) {
          throw new Error(
            dataAuditoria?.message ||
              'No fue posible consultar la auditoría.'
          )
        }

        const auditoriaCargada =
          dataAuditoria?.auditoria ||
          (Array.isArray(dataAuditoria?.auditorias)
            ? dataAuditoria.auditorias[0]
            : null)

        if (!auditoriaCargada) {
          throw new Error('No se encontró la auditoría solicitada.')
        }

        const anioAuditoria =
          Number(auditoriaCargada?.anio) || new Date().getFullYear()

        const parametrosConfiguracion = new URLSearchParams({ nit })

        const respuestaConfiguracion = await fetch(
          `/api/admin/configuracion-documentos?${parametrosConfiguracion.toString()}`,
          {
            method: 'GET',
            headers: {
              'x-cea-nit': nit,
            },
            cache: 'no-store',
          }
        )

        const dataConfiguracion = await respuestaConfiguracion.json()

        if (
          !respuestaConfiguracion.ok ||
          dataConfiguracion?.ok !== true
        ) {
          throw new Error(
            dataConfiguracion?.error ||
              'No fue posible consultar la configuración documental.'
          )
        }

        // --------------------------------------------------
        // El API de auditorías todavía no devuelve logo.
        // Recuperamos el mismo logo institucional desde
        // el GET de Riesgos PESV que ya lo expone.
        // --------------------------------------------------

        let logoInstitucional = null

        try {
          const parametrosLogo = new URLSearchParams({
            nit,
            anio: String(anioAuditoria),
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

          const dataLogo = await respuestaLogo.json()

          if (respuestaLogo.ok) {
            logoInstitucional = dataLogo?.logo || null
          }
        } catch (errorLogo) {
          console.warn(
            'No fue posible cargar el logo institucional para el informe:',
            errorLogo
          )
        }

        if (!activo) return

        setAuditoria(auditoriaCargada)
        setEmpresa(
          dataAuditoria?.empresa || dataConfiguracion?.empresa || null
        )
        setEncabezado(dataConfiguracion?.encabezado || null)
        setDocumento(
          obtenerDocumentoAuditoria(dataConfiguracion?.documentos)
        )
        setLogo(logoInstitucional)
      } catch (err) {
        console.error(
          'Error preparando informe de auditoría PESV:',
          err
        )

        if (activo) {
          setError(
            err?.message || 'No fue posible preparar el informe.'
          )
        }
      } finally {
        if (activo) setCargando(false)
      }
    }

    cargar()

    return () => {
      activo = false
    }
  }, [user, id])

  // ==========================================================
  // INFORMACIÓN DERIVADA
  // app/admin/pesv/auditorias/imprimir/[id]/page.jsx
  // ==========================================================

  const hallazgos = useMemo(() => {
    const lista = Array.isArray(auditoria?.hallazgos)
      ? auditoria.hallazgos
      : []

    return [...lista].sort(
      (a, b) => Number(a?.numero || 0) - Number(b?.numero || 0)
    )
  }, [auditoria])

  const resumen = useMemo(() => {
    const totalHallazgos = hallazgos.length

    const noConformidades = hallazgos.filter(
      item => normalizar(item?.tipo_hallazgo) === 'NO_CONFORMIDAD'
    ).length

    const observaciones = hallazgos.filter(
      item => normalizar(item?.tipo_hallazgo) === 'OBSERVACION'
    ).length

    const oportunidades = hallazgos.filter(
      item => normalizar(item?.tipo_hallazgo) === 'OPORTUNIDAD_MEJORA'
    ).length

    const fortalezas = hallazgos.filter(
      item => normalizar(item?.tipo_hallazgo) === 'FORTALEZA'
    ).length

    const acciones = hallazgos.flatMap(item =>
      Array.isArray(item?.acciones) ? item.acciones : []
    )

    const seguimientos = acciones.flatMap(item =>
      Array.isArray(item?.seguimientos) ? item.seguimientos : []
    )

    return {
      totalHallazgos,
      noConformidades,
      observaciones,
      oportunidades,
      fortalezas,
      totalAcciones: acciones.length,
      totalSeguimientos: seguimientos.length,
    }
  }, [hallazgos])

  // ==========================================================
  // ESTADOS DE CARGA
  // ==========================================================

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-sm text-gray-600">
          Preparando informe de auditoría PESV...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-black text-red-700">
            No fue posible generar el informe
          </div>

          <p className="mt-2 text-sm text-gray-700">{error}</p>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  if (!auditoria) return null

  // ==========================================================
  // RENDER DOCUMENTO
  // app/admin/pesv/auditorias/imprimir/[id]/page.jsx
  // ==========================================================

  return (
    <div className="min-h-screen bg-gray-200 py-5">
      {/* ====================================================
          BARRA DE ACCIONES
      ==================================================== */}

      <div className="no-print sticky top-0 z-20 mx-auto mb-4 flex max-w-[215.9mm] items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <div className="text-sm font-black text-gray-800">
            Informe de Auditoría PESV
          </div>

          <div className="text-xs text-gray-500">
            {auditoria.codigo} · Vigencia {auditoria.anio}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700"
          >
            Volver
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white"
          >
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* ====================================================
          HOJA CARTA VERTICAL
      ==================================================== */}

      <main className="hoja-informe-auditoria-pesv mx-auto bg-white text-black shadow-lg">
        {/* ==================================================
            TABLA ESTRUCTURAL DE IMPRESIÓN
            app/admin/pesv/auditorias/imprimir/[id]/page.jsx

            El encabezado está dentro de THEAD para que el
            navegador lo repita automáticamente en cada página.
            No se utiliza position: fixed.
        ================================================== */}

        <table className="tabla-documento-auditoria-pesv w-full border-collapse">
          <thead className="encabezado-auditoria-repetible">
            <tr>
              <td className="p-0 pb-[3mm] align-top">
                <EncabezadoDocumento
                  encabezado={encabezado}
                  documento={documento}
                  logo={logo}
                />
              </td>
            </tr>
          </thead>

          <tbody className="contenido-auditoria-imprimible">
            <tr className="fila-contenido-auditoria">
              <td className="p-0 align-top">

        {/* ==================================================
            IDENTIFICACIÓN
        ================================================== */}

        <TituloSeccion>1. Identificación de la auditoría</TituloSeccion>

        <div className="grid grid-cols-4">
          <Dato label="Código auditoría">
            {valorONoAplica(auditoria.codigo)}
          </Dato>

          <Dato label="Vigencia">{auditoria.anio}</Dato>

          <Dato label="Tipo">
            {etiqueta(auditoria.tipo_auditoria)}
          </Dato>

          <Dato label="Estado">{etiqueta(auditoria.estado)}</Dato>
        </div>

        <div className="grid grid-cols-2">
          <Dato label="Nombre de la auditoría">
            {valorONoAplica(auditoria.nombre)}
          </Dato>

          <Dato label="Proceso / área auditada">
            {valorONoAplica(auditoria.area_proceso_auditado)}
          </Dato>
        </div>

        <div className="grid grid-cols-3">
          <Dato label="Fecha programada">
            {formatearFecha(auditoria.fecha_programada)}
          </Dato>

          <Dato label="Fecha ejecución">
            {formatearFecha(auditoria.fecha_ejecucion)}
          </Dato>

          <Dato label="Lugar">{valorONoAplica(auditoria.lugar)}</Dato>
        </div>

        <div className="grid grid-cols-2">
          <Dato label="Auditor">
            {valorONoAplica(auditoria.auditor_nombre)}

            {texto(auditoria.auditor_cargo) && (
              <>
                <br />
                {auditoria.auditor_cargo}
              </>
            )}

            {texto(auditoria.auditor_correo) && (
              <>
                <br />
                {auditoria.auditor_correo}
              </>
            )}
          </Dato>

          <Dato label="Responsable del área">
            {valorONoAplica(auditoria.responsable_area_nombre)}
          </Dato>
        </div>

        {/* ==================================================
            OBJETIVO / ALCANCE / CRITERIOS
        ================================================== */}

        <TituloSeccion>2. Objetivo, alcance y criterios</TituloSeccion>

        <Dato label="Objetivo">{valorONoAplica(auditoria.objetivo)}</Dato>
        <Dato label="Alcance">{valorONoAplica(auditoria.alcance)}</Dato>
        <Dato label="Criterios de auditoría">
          {valorONoAplica(auditoria.criterios)}
        </Dato>
        <Dato label="Metodología">
          {valorONoAplica(auditoria.metodologia)}
        </Dato>

        {/* ==================================================
            RESUMEN DE RESULTADOS
        ================================================== */}

        <TituloSeccion>3. Resumen de resultados</TituloSeccion>

        <div className="grid grid-cols-7">
          <Dato label="Hallazgos">{resumen.totalHallazgos}</Dato>
          <Dato label="No conformidades">{resumen.noConformidades}</Dato>
          <Dato label="Observaciones">{resumen.observaciones}</Dato>
          <Dato label="Mejoras">{resumen.oportunidades}</Dato>
          <Dato label="Fortalezas">{resumen.fortalezas}</Dato>
          <Dato label="Acciones">{resumen.totalAcciones}</Dato>
          <Dato label="Seguimientos">{resumen.totalSeguimientos}</Dato>
        </div>

        {/* ==================================================
            HALLAZGOS
        ================================================== */}

        <TituloSeccion>4. Hallazgos, acciones y seguimientos</TituloSeccion>

        {hallazgos.length === 0 ? (
          <Dato label="Resultado">
            No se registraron hallazgos en esta auditoría.
          </Dato>
        ) : (
          <div className="space-y-[4mm] pt-[2mm]">
            {hallazgos.map(hallazgo => {
              const acciones = Array.isArray(hallazgo?.acciones)
                ? hallazgo.acciones
                : []

              return (
                <section
                  key={hallazgo.id}
                  className="bloque-hallazgo border border-black"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-black bg-gray-100 px-[2mm] py-[1.5mm]">
                    <div className="text-[7px] font-black uppercase">
                      {hallazgo.codigo || `Hallazgo ${hallazgo.numero}`}
                      {' · '}
                      {etiqueta(hallazgo.tipo_hallazgo)}
                    </div>

                    <div className="flex gap-[1mm]">
                      {hallazgo.clasificacion && (
                        <Badge>{etiqueta(hallazgo.clasificacion)}</Badge>
                      )}

                      {hallazgo.prioridad && (
                        <Badge>
                          Prioridad {etiqueta(hallazgo.prioridad)}
                        </Badge>
                      )}

                      <Badge>{etiqueta(hallazgo.estado)}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3">
                    <Dato label="Fecha del hallazgo">
                      {formatearFecha(hallazgo.fecha_hallazgo)}
                    </Dato>
                    <Dato label="Proceso / área">
                      {valorONoAplica(hallazgo.proceso_area)}
                    </Dato>
                    <Dato label="Responsable">
                      {valorONoAplica(hallazgo.responsable_nombre)}
                    </Dato>
                  </div>

                  <div className="grid grid-cols-2">
                    <Dato label="Requisito">
                      {valorONoAplica(hallazgo.requisito)}
                    </Dato>
                    <Dato label="Criterio">
                      {valorONoAplica(hallazgo.criterio)}
                    </Dato>
                  </div>

                  <Dato label="Descripción del hallazgo">
                    {valorONoAplica(hallazgo.descripcion)}
                  </Dato>

                  <Dato label="Evidencia">
                    {valorONoAplica(hallazgo.evidencia)}
                  </Dato>

                  <div className="grid grid-cols-2">
                    <Dato label="Análisis / causa">
                      {valorONoAplica(hallazgo.causa)}
                    </Dato>
                    <Dato label="Consecuencia">
                      {valorONoAplica(hallazgo.consecuencia)}
                    </Dato>
                  </div>

                  <div className="border-t border-black px-[2mm] py-[1.5mm] text-[6px] font-black uppercase">
                    Acciones asociadas
                  </div>

                  {acciones.length === 0 ? (
                    <div className="border-t border-black px-[2mm] py-[2mm] text-[7px]">
                      No se registraron acciones.
                    </div>
                  ) : (
                    acciones.map(accion => {
                      const seguimientos = Array.isArray(
                        accion?.seguimientos
                      )
                        ? accion.seguimientos
                        : []

                      return (
                        <div
                          key={accion.id}
                          className="bloque-accion border-t border-black"
                        >
                          <div className="grid grid-cols-4">
                            <Dato label={`Acción ${accion.numero}`}>
                              {etiqueta(accion.tipo_accion)}
                            </Dato>
                            <Dato label="Estado">
                              {etiqueta(accion.estado)}
                            </Dato>
                            <Dato label="Fecha compromiso">
                              {formatearFecha(accion.fecha_compromiso)}
                            </Dato>
                            <Dato label="Responsable">
                              {valorONoAplica(accion.responsable_nombre)}
                            </Dato>
                          </div>

                          <Dato label="Descripción de la acción">
                            {valorONoAplica(accion.descripcion)}
                          </Dato>

                          <Dato label="Evidencia esperada">
                            {valorONoAplica(accion.evidencia_esperada)}
                          </Dato>

                          <div className="grid grid-cols-3">
                            <Dato label="Fecha implementación">
                              {formatearFecha(accion.fecha_implementacion)}
                            </Dato>
                            <Dato label="Fecha cierre">
                              {formatearFecha(accion.fecha_cierre)}
                            </Dato>
                            <Dato label="Resultado">
                              {valorONoAplica(accion.resultado)}
                            </Dato>
                          </div>

                          {seguimientos.length > 0 && (
                            <div className="border-t border-black">
                              <div className="bg-gray-50 px-[2mm] py-[1mm] text-[6px] font-black uppercase">
                                Seguimientos de la acción
                              </div>

                              {seguimientos.map(seguimiento => (
                                <div
                                  key={seguimiento.id}
                                  className="bloque-seguimiento border-t border-black"
                                >
                                  <div className="grid grid-cols-4">
                                    <Dato
                                      label={`Seguimiento ${seguimiento.numero}`}
                                    >
                                      {formatearFecha(
                                        seguimiento.fecha_seguimiento
                                      )}
                                    </Dato>
                                    <Dato label="Avance">
                                      {seguimiento.avance_porcentaje !== null &&
                                      seguimiento.avance_porcentaje !== undefined
                                        ? `${seguimiento.avance_porcentaje}%`
                                        : '-'}
                                    </Dato>
                                    <Dato label="Implementación verificada">
                                      {seguimiento.implementacion_verificada
                                        ? 'Sí'
                                        : 'No'}
                                    </Dato>
                                    <Dato label="Eficacia verificada">
                                      {seguimiento.eficacia_verificada
                                        ? 'Sí'
                                        : 'No'}
                                    </Dato>
                                  </div>

                                  <Dato label="Descripción">
                                    {valorONoAplica(seguimiento.descripcion)}
                                  </Dato>

                                  <div className="grid grid-cols-2">
                                    <Dato label="Resultado">
                                      {valorONoAplica(seguimiento.resultado)}
                                    </Dato>
                                    <Dato label="Resultado de eficacia">
                                      {valorONoAplica(
                                        seguimiento.resultado_eficacia
                                      )}
                                    </Dato>
                                  </div>

                                  <div className="grid grid-cols-3">
                                    <Dato label="Responsable">
                                      {valorONoAplica(
                                        seguimiento.responsable_nombre
                                      )}
                                    </Dato>
                                    <Dato label="Requiere nuevo seguimiento">
                                      {seguimiento.requiere_nuevo_seguimiento
                                        ? 'Sí'
                                        : 'No'}
                                    </Dato>
                                    <Dato label="Próximo seguimiento">
                                      {formatearFecha(
                                        seguimiento.fecha_proximo_seguimiento
                                      )}
                                    </Dato>
                                  </div>

                                  {(texto(seguimiento.evidencia) ||
                                    texto(seguimiento.observaciones)) && (
                                    <Dato label="Evidencia / observaciones">
                                      {[
                                        texto(seguimiento.evidencia),
                                        texto(seguimiento.observaciones),
                                      ]
                                        .filter(Boolean)
                                        .join('\n')}
                                    </Dato>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}

                  {(texto(hallazgo.verificacion_cierre) ||
                    hallazgo.fecha_cierre) && (
                    <div className="border-t border-black">
                      <div className="grid grid-cols-[38mm_1fr]">
                        <Dato label="Fecha cierre hallazgo">
                          {formatearFecha(hallazgo.fecha_cierre)}
                        </Dato>
                        <Dato label="Verificación de cierre">
                          {valorONoAplica(hallazgo.verificacion_cierre)}
                        </Dato>
                      </div>
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}

        {/* ==================================================
            CIERRE DE AUDITORÍA
        ================================================== */}

        <TituloSeccion>5. Resultado y cierre de la auditoría</TituloSeccion>

        <Dato label="Resultado general">
          {valorONoAplica(auditoria.resultado_general)}
        </Dato>

        <div className="grid grid-cols-2">
          <Dato label="Fortalezas generales">
            {valorONoAplica(auditoria.fortalezas_generales)}
          </Dato>
          <Dato label="Oportunidades de mejora generales">
            {valorONoAplica(auditoria.oportunidades_mejora_generales)}
          </Dato>
        </div>

        <Dato label="Conclusión">
          {valorONoAplica(auditoria.conclusion)}
        </Dato>

        <Dato label="Observaciones finales">
          {valorONoAplica(auditoria.observaciones_finales)}
        </Dato>

        <div className="grid grid-cols-2">
          <Dato label="Fecha de cierre">
            {formatearFecha(auditoria.fecha_cierre)}
          </Dato>
          <Dato label="Observaciones administrativas">
            {valorONoAplica(auditoria.observaciones)}
          </Dato>
        </div>

        {/* ==================================================
            FIRMAS
        ================================================== */}

        <section className="firmas-documento mt-[7mm] grid grid-cols-2 gap-[12mm] text-black">
          <div className="border-t border-black pt-[2mm] text-center text-[7px]">
            <div className="font-black">AUDITOR</div>
            <div>{valorONoAplica(auditoria.auditor_nombre)}</div>
            {texto(auditoria.auditor_cargo) && (
              <div>{auditoria.auditor_cargo}</div>
            )}
          </div>

          <div className="border-t border-black pt-[2mm] text-center text-[7px]">
            <div className="font-black">RESPONSABLE DEL ÁREA / PESV</div>
            <div>{valorONoAplica(auditoria.responsable_area_nombre)}</div>
          </div>
        </section>

        {/* ==================================================
            PIE INFORMATIVO
        ================================================== */}

        <div className="mt-[8mm] border-t border-gray-300 pt-[1.5mm] text-center text-[5.5px] text-gray-500">
          Documento generado desde el módulo PESV ·{' '}
          {empresa?.nombre || empresa?.razon_social || 'CEA'} · Generado:{' '}
          {fechaGeneracion}
        </div>
              </td>
            </tr>
          </tbody>
        </table>
      </main>

      {/* ====================================================
          ESTILOS DE IMPRESIÓN
          app/admin/pesv/auditorias/imprimir/[id]/page.jsx
      ==================================================== */}

      <style jsx global>{`
        /* ==================================================
           VISTA EN PANTALLA
           app/admin/pesv/auditorias/imprimir/[id]/page.jsx
           Carta vertical: 215.9 mm x 279.4 mm
        ================================================== */

        .hoja-informe-auditoria-pesv {
          width: 215.9mm;
          min-width: 215.9mm;
          min-height: 279.4mm;
          padding: 7mm 8mm;
          box-sizing: border-box;
        }

        .tabla-documento-auditoria-pesv {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .encabezado-auditoria-repetible {
          display: table-header-group;
        }

        .titulo-seccion {
          break-after: avoid;
          page-break-after: avoid;
        }

        .bloque-hallazgo,
        .bloque-accion {
          break-inside: auto;
          page-break-inside: auto;
        }

        .bloque-seguimiento,
        .firmas-documento {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* ==================================================
           IMPRESIÓN AUDITORÍA PESV
           app/admin/pesv/auditorias/imprimir/[id]/page.jsx

           El encabezado NO es fijo. Se repite mediante THEAD,
           igual que un encabezado de tabla impreso. Esto evita
           que se monte sobre el contenido de las páginas.
        ================================================== */

        @media print {
          @page {
            size: Letter portrait;
            margin: 0;
          }

          html.html-informe-auditoria-pesv,
          html.html-informe-auditoria-pesv body,
          body.body-informe-auditoria-pesv {
            width: 215.9mm !important;
            min-width: 215.9mm !important;
            max-width: 215.9mm !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .hoja-informe-auditoria-pesv {
            width: 215.9mm !important;
            min-width: 215.9mm !important;
            max-width: 215.9mm !important;
            min-height: 0 !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 8mm 6mm 8mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            overflow: visible !important;
            page-break-before: auto !important;
            break-before: auto !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .tabla-documento-auditoria-pesv {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin: 0 !important;
          }

          /*
            Clave del encabezado repetido.
            El navegador repite THEAD al comenzar cada página.
          */
          .tabla-documento-auditoria-pesv > thead,
          .encabezado-auditoria-repetible {
            display: table-header-group !important;
          }

          .tabla-documento-auditoria-pesv > tbody {
            display: table-row-group !important;
          }

          /*
            globals.css tiene una regla general para TR que evita
            cortes. Aquí se anula únicamente para la fila que
            contiene todo el cuerpo del informe, permitiendo que
            el contenido fluya entre páginas.
          */
          .tabla-documento-auditoria-pesv > tbody > tr.fila-contenido-auditoria {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .tabla-documento-auditoria-pesv > tbody > tr.fila-contenido-auditoria > td {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .tabla-documento-auditoria-pesv > thead > tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /*
            Margen superior repetible:
            como THEAD se imprime nuevamente al iniciar cada hoja,
            estos 6 mm también se repiten en la página 2, 3, etc.
            El contenedor principal ya no aporta padding superior
            para evitar duplicarlo en la primera página.
          */
          .tabla-documento-auditoria-pesv > thead > tr > td {
            padding: 6mm 0 3mm 0 !important;
          }

          .titulo-seccion {
            page-break-after: avoid !important;
            break-after: avoid-page !important;
          }

          .bloque-hallazgo,
          .bloque-accion {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .bloque-seguimiento {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .firmas-documento {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 5mm !important;
          }
        }
      `}</style>
    </div>
  )
}
