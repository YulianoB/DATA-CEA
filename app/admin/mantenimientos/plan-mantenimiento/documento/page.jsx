// app/admin/mantenimientos/plan-mantenimiento/documento/page.jsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Printer,
} from 'lucide-react'

// ============================================================
// CONSTANTES
// ============================================================

const MESES = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
]

// ============================================================
// HELPERS
// ============================================================

function texto(valor) {
  return String(valor ?? '').trim()
}

function numero(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function formatoNumero(valor, decimales = 0) {
  const n = numero(valor)
  if (n === null) return '—'

  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: decimales,
    minimumFractionDigits: decimales,
  }).format(n)
}

function formatoKm(valor) {
  const n = numero(valor)
  return n === null ? '—' : `${formatoNumero(n)} km`
}

function formatoFecha(fecha) {
  if (!fecha) return '—'
  const [anio, mes, dia] = String(fecha).slice(0, 10).split('-')
  if (!anio || !mes || !dia) return texto(fecha)
  return `${dia}/${mes}/${anio}`
}

function obtenerNitUsuario(user) {
  return texto(
    user?.nitEmpresa ||
    user?.nit ||
    user?.empresa?.nit ||
    user?.nit_empresa ||
    user?.empresaNit ||
    user?.empresa_nit ||
    ''
  )
}

function normalizarClave(valor) {
  return texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function valorDocumento(
  tipo,
  documento,
  pagina,
  totalPaginas
) {
  switch (tipo) {
    case 'NOMBRE_DOCUMENTO':
      return texto(documento?.nombre_documento)

    case 'CODIGO':
      return texto(documento?.codigo)

    case 'FECHA_EDICION':
      return formatoFecha(documento?.fecha_edicion)

    case 'VERSION':
      return texto(documento?.version)

    case 'VIGENCIA':
      return formatoFecha(documento?.vigencia)

    case 'PAGINACION':
      if (pagina && totalPaginas) {
        return `${pagina} de ${totalPaginas}`
      }
      return ''

    default:
      return ''
  }
}

// ============================================================
// ENCABEZADO DOCUMENTAL CONFIGURADO
// Misma lógica usada por los demás documentos del sistema.
// ============================================================

function EncabezadoDocumento({
  encabezado,
  documento,
  logo,
  pagina,
  totalPaginas,
}) {
  const estructura =
    encabezado?.estructura &&
    typeof encabezado.estructura === 'object'
      ? encabezado.estructura
      : {}

  const celdas =
    Array.isArray(estructura?.celdas)
      ? estructura.celdas
      : []

  const filas =
    Array.isArray(estructura?.filas)
      ? estructura.filas
      : []

  const columnas =
    Array.isArray(estructura?.columnas)
      ? estructura.columnas
      : []

  const configuracion =
    estructura?.configuracion &&
    typeof estructura.configuracion === 'object'
      ? estructura.configuracion
      : {}

  const cantidadFilas =
    Number(encabezado?.filas) ||
    filas.length ||
    2

  const cantidadColumnas =
    Number(encabezado?.columnas) ||
    columnas.length ||
    3

  const anchos =
    Array.from(
      { length: cantidadColumnas },
      (_, indice) => {
        const item = columnas[indice]
        const ancho = Number(
          item?.ancho ??
          item?.width ??
          item
        )

        return Number.isFinite(ancho) && ancho > 0
          ? ancho
          : 1
      }
    )

  const alturas =
    Array.from(
      { length: cantidadFilas },
      (_, indice) => {
        const item = filas[indice]
        const alto = Number(
          item?.alto ??
          item?.altura ??
          item?.height ??
          item
        )

        return Number.isFinite(alto) && alto > 0
          ? `${alto}mm`
          : 'auto'
      }
    )

  const grosorBorde =
    Number(configuracion?.grosor_borde) || 1

  const padding =
    Number(configuracion?.padding)

  const paddingCelda =
    Number.isFinite(padding)
      ? padding
      : 4

  if (celdas.length === 0) {
    return (
      <div className="border border-black p-3 text-center">
        <div className="text-[12px] font-black uppercase">
          {documento?.nombre_documento || 'PLAN DE MANTENIMIENTO'}
        </div>
      </div>
    )
  }

  return (
    <div
      className="grid w-full bg-white"
      style={{
        gridTemplateColumns:
          anchos.map((ancho) => `${ancho}fr`).join(' '),
        gridTemplateRows:
          alturas.join(' '),
      }}
    >
      {celdas.map((celda) => {
        const elementos =
          Array.isArray(celda?.elementos)
            ? celda.elementos
            : []

        const fila = Number(celda?.fila) || 1
        const columna = Number(celda?.columna) || 1

        const rowSpan =
          Number(
            celda?.rowSpan ??
            celda?.row_span
          ) || 1

        const colSpan =
          Number(
            celda?.colSpan ??
            celda?.col_span
          ) || 1

        const horizontal =
          celda?.alineacion_horizontal ||
          'center'

        const vertical =
          celda?.alineacion_vertical ||
          'center'

        const justifyContent =
          horizontal === 'left'
            ? 'flex-start'
            : horizontal === 'right'
              ? 'flex-end'
              : 'center'

        const alignItems =
          vertical === 'top'
            ? 'flex-start'
            : vertical === 'bottom'
              ? 'flex-end'
              : 'center'

        return (
          <div
            key={
              celda?.id ||
              `${fila}-${columna}`
            }
            className="flex overflow-hidden"
            style={{
              gridRow:
                `${fila} / span ${rowSpan}`,
              gridColumn:
                `${columna} / span ${colSpan}`,
              justifyContent,
              alignItems,
              textAlign: horizontal,
              padding: `${paddingCelda}px`,
              borderTop:
                celda?.borde_superior === false
                  ? 'none'
                  : `${grosorBorde}px solid #000`,
              borderBottom:
                celda?.borde_inferior === false
                  ? 'none'
                  : `${grosorBorde}px solid #000`,
              borderLeft:
                celda?.borde_izquierdo === false
                  ? 'none'
                  : `${grosorBorde}px solid #000`,
              borderRight:
                celda?.borde_derecho === false
                  ? 'none'
                  : `${grosorBorde}px solid #000`,
            }}
          >
            <div className="w-full">
              {elementos.map((elemento, indice) => {
                const tipo =
                  texto(elemento?.tipo).toUpperCase()

                if (tipo === 'VACIO') {
                  return null
                }

                if (tipo === 'LOGO') {
                  const logoUrl =
                    texto(
                      logo?.url ||
                      logo?.path ||
                      (typeof logo === 'string' ? logo : '')
                    )

                  return (
                    <div
                      key={`${tipo}-${indice}`}
                      className="flex h-full w-full items-center justify-center"
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Logo institucional"
                          className="max-h-[15mm] max-w-full object-contain"
                        />
                      ) : null}
                    </div>
                  )
                }

                const valor =
                  tipo === 'TEXTO'
                    ? texto(elemento?.valor)
                    : valorDocumento(
                        tipo,
                        documento,
                        pagina,
                        totalPaginas
                      )

                const prefijo =
                  texto(elemento?.prefijo)

                const tamano =
                  Number(elemento?.tamano_fuente) || 8

                const negrita =
                  elemento?.negrita === true

                return (
                  <div
                    key={`${tipo}-${indice}`}
                    style={{
                      fontSize: `${tamano}px`,
                      fontWeight: negrita ? 700 : 400,
                      lineHeight: 1.15,
                    }}
                  >
                    {prefijo}
                    {valor}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// PUNTO DE MANTENIMIENTO
// ============================================================

function PuntoDocumento({ punto, tipo }) {
  const estado =
    tipo || punto?.estado || 'PROGRAMADO'

  const detalle =
    estado === 'EJECUTADO'
      ? [
          punto?.fecha_ejecucion
            ? `Fecha ${formatoFecha(punto.fecha_ejecucion)}`
            : '',
          punto?.km_ejecucion != null
            ? formatoKm(punto.km_ejecucion)
            : '',
        ].filter(Boolean).join(' · ')
      : estado === 'VENCIDO'
        ? [
            punto?.fecha_vencimiento
              ? `Venció ${formatoFecha(punto.fecha_vencimiento)}`
              : punto?.fecha_debio_realizarse
                ? `Debió ${formatoFecha(punto.fecha_debio_realizarse)}`
                : '',
            punto?.km_vencimiento != null
              ? formatoKm(punto.km_vencimiento)
              : punto?.km_objetivo != null
                ? `Obj. ${formatoKm(punto.km_objetivo)}`
                : '',
          ].filter(Boolean).join(' · ')
        : [
            punto?.fecha_proyectada
              ? formatoFecha(punto.fecha_proyectada)
              : '',
            punto?.km_objetivo != null
              ? `Obj. ${formatoKm(punto.km_objetivo)}`
              : '',
          ].filter(Boolean).join(' · ')

  return (
    <div className="punto-mantenimiento-print border border-black px-1 py-1">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[6.5px] font-black">
          P{punto?.punto || punto?.ciclo || '—'}
        </span>
        <span className="text-[5px] font-black uppercase">
          {estado}
        </span>
      </div>

      {detalle && (
        <div className="mt-0.5 text-[5px] leading-tight">
          {detalle}
        </div>
      )}

      {estado === 'VENCIDO' &&
        punto?.justificacion_vencimiento && (
          <div className="mt-1 border-t border-gray-400 pt-0.5 text-[4.8px] leading-tight">
            <span className="font-bold">
              Gestión:
            </span>{' '}
            {punto.justificacion_vencimiento}
          </div>
        )}
    </div>
  )
}

// ============================================================
// FILA VEHÍCULO
// ============================================================

function FilaVehiculoDocumento({ vista }) {
  const vehiculo = vista?.vehiculo || {}
  const km = vista?.kilometraje || {}
  const ciclo = vista?.ciclo || {}

  return (
    <tr className="align-top">
      <td className="border border-black px-1.5 py-1.5">
        <div className="text-[6.5px] font-black">
          {vehiculo?.placa || '—'}
        </div>

        <div className="mt-0.5 text-[5px] leading-tight">
          {[vehiculo?.marca, vehiculo?.linea]
            .filter(Boolean)
            .join(' · ') || '—'}
        </div>

        <div className="mt-1 text-[4.8px] leading-tight text-gray-700">
          <div>
            Km actual: <b>{formatoKm(km?.ultimo_km)}</b>
          </div>
          <div>
            Promedio: <b>{formatoKm(km?.promedio_km_mes)}/mes</b>
          </div>
          <div>
            Próximo: <b>P{ciclo?.punto_actual || '—'}</b>
          </div>
          <div>
            Base: <b>{formatoKm(ciclo?.frecuencia_base_km)}</b>
          </div>
        </div>
      </td>

      {MESES.map((mes) => {
        const celda =
          vista?.meses?.[mes] || {
            programados: [],
            ejecutados: [],
            vencidos: [],
          }

        return (
          <td
            key={mes}
            className="border border-black px-0.5 py-1 align-top"
          >
            <div className="space-y-0.5">
              {(celda?.vencidos || []).map((punto, indice) => (
                <PuntoDocumento
                  key={`v-${punto?.id || punto?.punto || indice}`}
                  punto={punto}
                  tipo="VENCIDO"
                />
              ))}

              {(celda?.ejecutados || []).map((punto, indice) => (
                <PuntoDocumento
                  key={`e-${punto?.id || punto?.punto || indice}`}
                  punto={punto}
                  tipo="EJECUTADO"
                />
              ))}

              {(celda?.programados || []).map((punto, indice) => (
                <PuntoDocumento
                  key={`p-${punto?.id || punto?.punto || indice}`}
                  punto={punto}
                  tipo={punto?.estado || 'PROGRAMADO'}
                />
              ))}
            </div>
          </td>
        )
      })}
    </tr>
  )
}


function contarMes(mes) {
  const pendientes =
    (mes?.programados || []).length
  const ejecutados =
    (mes?.ejecutados || []).length
  const vencidos =
    (mes?.vencidos || []).length

  return {
    programados:
      pendientes + ejecutados + vencidos,
    ejecutados,
    vencidos,
  }
}

function sumarConteos(a, b) {
  return {
    programados:
      a.programados + b.programados,
    ejecutados:
      a.ejecutados + b.ejecutados,
    vencidos:
      a.vencidos + b.vencidos,
  }
}

function totalizarPlan(vehiculos) {
  const trimestres = [
    { nombre: 'I TRIMESTRE', meses: ['ENE', 'FEB', 'MAR'] },
    { nombre: 'II TRIMESTRE', meses: ['ABR', 'MAY', 'JUN'] },
    { nombre: 'III TRIMESTRE', meses: ['JUL', 'AGO', 'SEP'] },
    { nombre: 'IV TRIMESTRE', meses: ['OCT', 'NOV', 'DIC'] },
  ]

  const resultado =
    trimestres.map((trimestre) => {
      let total = {
        programados: 0,
        ejecutados: 0,
        vencidos: 0,
      }

      for (const vehiculo of vehiculos || []) {
        for (const mes of trimestre.meses) {
          total = sumarConteos(
            total,
            contarMes(vehiculo?.meses?.[mes])
          )
        }
      }

      return {
        ...trimestre,
        ...total,
      }
    })

  const anual =
    resultado.reduce(
      (acc, item) =>
        sumarConteos(acc, item),
      {
        programados: 0,
        ejecutados: 0,
        vencidos: 0,
      }
    )

  return {
    trimestres: resultado,
    anual,
  }
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function DocumentoPlanMantenimientoPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [anio, setAnio] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [encabezado, setEncabezado] = useState(null)
  const [documento, setDocumento] = useState(null)
  const [logo, setLogo] = useState({})

  // ==========================================================
  // MODO IMPRESIÓN CARTA HORIZONTAL
  // ==========================================================

  useEffect(() => {
    document.documentElement.classList.add(
      'html-plan-mantenimiento-documento'
    )
    document.body.classList.add(
      'body-plan-mantenimiento-documento'
    )

    const estilo = document.createElement('style')
    estilo.id = 'estilo-plan-mantenimiento-documento'

    estilo.textContent = `
      @page {
        size: Letter landscape;
        margin: 0;
      }

      @media print {
        html.html-plan-mantenimiento-documento,
        html.html-plan-mantenimiento-documento body,
        body.body-plan-mantenimiento-documento {
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          min-height: 0 !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 5mm 6mm 5mm !important;
          background: white !important;
          overflow: visible !important;
        }

        body.body-plan-mantenimiento-documento > div,
        body.body-plan-mantenimiento-documento > div > div {
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          min-height: 0 !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }

        .documento-plan-mantenimiento {
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          min-height: 0 !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          overflow: visible !important;
        }

        .hoja-plan-mantenimiento {
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          min-height: 0 !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          overflow: visible !important;
        }

        .no-print {
          display: none !important;
        }

        .estructura-plan-mantenimiento {
          width: 100% !important;
          border-collapse: collapse !important;
        }

        .estructura-plan-mantenimiento > thead {
          display: table-header-group !important;
        }

        .estructura-plan-mantenimiento > tbody {
          display: table-row-group !important;
        }

        .estructura-plan-mantenimiento > thead > tr > td,
        .estructura-plan-mantenimiento > tbody > tr > td {
          padding: 0 !important;
          border: 0 !important;
        }

        .encabezado-plan-mantenimiento-print {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .margen-superior-plan-mantenimiento {
          display: block !important;
          height: 7mm !important;
          width: 100% !important;
        }

        .separador-encabezado-plan-mantenimiento {
          height: 3mm !important;
        }

        .tabla-plan-mantenimiento {
          width: 100% !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
        }

        .tabla-plan-mantenimiento thead {
          display: table-header-group !important;
        }

        .tabla-plan-mantenimiento tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .tabla-plan-mantenimiento th,
        .tabla-plan-mantenimiento td {
          overflow-wrap: anywhere !important;
          word-break: normal !important;
          white-space: normal !important;
        }

        .punto-mantenimiento-print {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .leyenda-plan-mantenimiento {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .hoja-plan-mantenimiento,
        .hoja-plan-mantenimiento * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `

    document.head.appendChild(estilo)

    return () => {
      document.documentElement.classList.remove(
        'html-plan-mantenimiento-documento'
      )
      document.body.classList.remove(
        'body-plan-mantenimiento-documento'
      )
      document
        .getElementById('estilo-plan-mantenimiento-documento')
        ?.remove()
    }
  }, [])

  // ==========================================================
  // SESIÓN + VIGENCIA
  // ==========================================================

  useEffect(() => {
    let currentUser

    try {
      currentUser =
        JSON.parse(
          localStorage.getItem('currentUser') || 'null'
        )
    } catch {
      currentUser = null
    }

    if (!currentUser) {
      router.replace('/login')
      return
    }

    const parametros =
      new URLSearchParams(window.location.search)

    const anioParametro =
      Number(parametros.get('anio'))

    const anioActual =
      new Date().getFullYear()

    setUser(currentUser)
    setAnio(
      Number.isFinite(anioParametro) &&
      anioParametro > 0
        ? anioParametro
        : anioActual
    )
  }, [router])

  // ==========================================================
  // CARGAR PLAN + CONFIGURACIÓN DOCUMENTAL
  // ==========================================================

  useEffect(() => {
    if (!user || !anio) return

    const nit = obtenerNitUsuario(user)

    if (!nit) {
      setError(
        'No fue posible identificar el NIT del CEA.'
      )
      setCargando(false)
      return
    }

    let activo = true

    async function cargar() {
      try {
        setCargando(true)
        setError('')

        const [
          respuestaPlan,
          respuestaConfiguracion,
        ] = await Promise.all([
          fetch(
            `/api/admin/mantenimientos/plan-mantenimiento?vigencia=${anio}`,
            {
              method: 'GET',
              headers: {
                'x-cea-nit': nit,
              },
              cache: 'no-store',
            }
          ),

          fetch(
            '/api/admin/configuracion-documentos',
            {
              method: 'GET',
              headers: {
                'x-cea-nit': nit,
              },
              cache: 'no-store',
            }
          ),
        ])

        const dataPlan =
          await respuestaPlan.json().catch(() => ({}))

        if (
          !respuestaPlan.ok ||
          dataPlan?.status !== 'success'
        ) {
          throw new Error(
            dataPlan?.message ||
            dataPlan?.error ||
            'No fue posible consultar el Plan de Mantenimiento.'
          )
        }

        const dataConfiguracion =
          await respuestaConfiguracion.json().catch(() => ({}))

        if (
          !respuestaConfiguracion.ok ||
          dataConfiguracion?.ok !== true
        ) {
          throw new Error(
            dataConfiguracion?.error ||
            'No fue posible consultar la configuración documental.'
          )
        }

        const documentos =
          Array.isArray(dataConfiguracion?.documentos)
            ? dataConfiguracion.documentos
            : []

        const documentoEncontrado =
          documentos.find((item) => {
            const tipo =
              normalizarClave(item?.tipo_documento)

            return [
              'PLAN_DE_MANTENIMIENTO',
              'PLAN_MANTENIMIENTO',
              'PLAN_DE_MANTENIMIENTO_VEHICULAR',
              'PLAN_MANTENIMIENTO_VEHICULAR',
            ].includes(tipo)
          }) ||
          documentos.find((item) => {
            const nombre =
              normalizarClave(item?.nombre_documento)

            return (
              nombre.includes('PLAN') &&
              nombre.includes('MANTENIMIENTO') &&
              !nombre.includes('TRABAJO')
            )
          })

        if (!documentoEncontrado) {
          throw new Error(
            'No se encontró "Plan de Mantenimiento" en Configuración de Documentos > Otros Documentos. Créelo allí para que el PDF utilice su código, versión, fecha y vigencia oficiales.'
          )
        }

        if (documentoEncontrado?.activo === false) {
          throw new Error(
            'El documento Plan de Mantenimiento se encuentra inactivo en Configuración de Documentos.'
          )
        }

        const logoConfiguracion =
          dataConfiguracion?.logo ||
          dataConfiguracion?.empresa?.logo ||
          dataConfiguracion?.empresa?.logo_url ||
          dataConfiguracion?.encabezado?.logo ||
          dataConfiguracion?.encabezado?.logo_url ||
          ''

        const logoPlan =
          dataPlan?.logo ||
          dataPlan?.empresa?.logo ||
          dataPlan?.empresa?.logo_url ||
          ''

        const resolverLogo = (valor) => {
          if (!valor) {
            return {
              path: '',
              url: '',
            }
          }

          if (typeof valor === 'string') {
            return {
              path: valor,
              url: valor,
            }
          }

          return {
            path:
              texto(
                valor?.path ||
                valor?.url ||
                valor?.logo_url
              ),
            url:
              texto(
                valor?.url ||
                valor?.path ||
                valor?.logo_url
              ),
          }
        }

        const logoDocumento =
          resolverLogo(
            logoPlan ||
            logoConfiguracion
          )

        if (activo) {
          setData(dataPlan)
          setEncabezado(
            dataConfiguracion?.encabezado || null
          )
          setDocumento(documentoEncontrado)
          setLogo(logoDocumento)
        }
      } catch (err) {
        console.error(
          'Error cargando documento Plan de Mantenimiento:',
          err
        )

        if (activo) {
          setError(
            err?.message ||
            'No fue posible preparar el documento.'
          )
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    cargar()

    return () => {
      activo = false
    }
  }, [user, anio])

  const vehiculos =
    useMemo(
      () =>
        Array.isArray(data?.vehiculos)
          ? data.vehiculos
          : [],
      [data]
    )

  const totalizado =
    useMemo(
      () => totalizarPlan(vehiculos),
      [vehiculos]
    )

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
          <Loader2 size={18} className="animate-spin" />
          Preparando Plan de Mantenimiento...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-black text-red-700">
            No fue posible generar el documento
          </div>

          <p className="mt-2 text-sm text-gray-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center gap-2 rounded bg-gray-700 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
          >
            <ArrowLeft size={14} />
            Regresar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="documento-plan-mantenimiento min-h-screen overflow-x-auto bg-gray-200 py-5">
      <div className="no-print mx-auto mb-4 flex max-w-[280mm] flex-col gap-3 rounded-lg border border-gray-300 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-black text-gray-800">
            {documento?.nombre_documento ||
              'Plan de Mantenimiento'}
          </div>

          <div className="mt-0.5 text-[10px] text-gray-500">
            Vigencia <strong>{anio}</strong>
            {' · '}
            {vehiculos.length} vehículo(s)
            {' · '}
            Carta horizontal
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
          >
            <Printer size={14} />
            Imprimir / Guardar PDF
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded bg-gray-600 px-4 py-2 text-xs font-bold text-white hover:bg-gray-700"
          >
            <ArrowLeft size={14} />
            Regresar
          </button>
        </div>
      </div>

      <section className="hoja-plan-mantenimiento mx-auto w-[279.4mm] min-w-[279.4mm] bg-white px-[6mm] pb-[6mm] pt-[7mm] shadow-lg">
        <table className="estructura-plan-mantenimiento w-full border-collapse">
          <thead>
            <tr>
              <td>
                <div className="margen-superior-plan-mantenimiento"></div>

                <div className="encabezado-plan-mantenimiento-print">
                  <EncabezadoDocumento
                    encabezado={encabezado}
                    documento={documento}
                    logo={logo}
                    pagina={null}
                    totalPaginas={null}
                  />
                </div>

                <div className="separador-encabezado-plan-mantenimiento"></div>
              </td>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className="align-top">
                <div className="mt-[3mm] grid grid-cols-4 border border-black text-[6px]">
                  <div className="border-r border-black px-2 py-1.5">
                    <div className="font-black uppercase text-gray-500">
                      CEA
                    </div>
                    <div className="mt-0.5 font-bold">
                      {data?.empresa?.nombre ||
                        data?.empresa?.razon_social ||
                        '—'}
                    </div>
                  </div>

                  <div className="border-r border-black px-2 py-1.5">
                    <div className="font-black uppercase text-gray-500">
                      Vigencia
                    </div>
                    <div className="mt-0.5 font-bold">
                      {anio}
                    </div>
                  </div>

                  <div className="border-r border-black px-2 py-1.5">
                    <div className="font-black uppercase text-gray-500">
                      Fecha de referencia
                    </div>
                    <div className="mt-0.5 font-bold">
                      {formatoFecha(
                        data?.fecha_referencia_colombia
                      )}
                    </div>
                  </div>

                  <div className="px-2 py-1.5">
                    <div className="font-black uppercase text-gray-500">
                      Vehículos incluidos
                    </div>
                    <div className="mt-0.5 font-bold">
                      {vehiculos.length}
                    </div>
                  </div>
                </div>

                <div className="mt-2 border border-black bg-slate-800 px-2 py-1 text-center text-[7px] font-black uppercase text-white">
                  Matriz anual del Plan de Mantenimiento · {anio}
                </div>

                <div className="mt-1">
                  <table className="tabla-plan-mantenimiento w-full table-fixed border-collapse text-[5.2px] leading-[1.15]">
                    <colgroup>
                      <col style={{ width: '31mm' }} />
                      {MESES.map((mes) => (
                        <col
                          key={mes}
                          style={{ width: '19.5mm' }}
                        />
                      ))}
                    </colgroup>

                    <thead>
                      <tr className="bg-gray-300">
                        <th className="border border-black px-1.5 py-1.5 text-left font-black">
                          VEHÍCULO
                        </th>

                        {MESES.map((mes) => (
                          <th
                            key={mes}
                            className="border border-black px-0.5 py-1.5 text-center font-black"
                          >
                            {mes}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {vehiculos.length === 0 ? (
                        <tr>
                          <td
                            colSpan={13}
                            className="border border-black px-3 py-8 text-center text-[8px] text-gray-500"
                          >
                            No hay vehículos con configuración de mantenimiento FINALIZADA para la vigencia {anio}.
                          </td>
                        </tr>
                      ) : (
                        vehiculos.map((vista) => (
                          <FilaVehiculoDocumento
                            key={vista?.vehiculo?.id}
                            vista={vista}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="leyenda-plan-mantenimiento mt-2 border border-gray-500 px-2 py-1.5 text-[5.5px] leading-tight text-gray-700">
                  <div className="font-black uppercase">
                    Convenciones y criterio del plan
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <strong>PROGRAMADO:</strong> punto proyectado según kilometraje.
                    </span>
                    <span>
                      <strong>VENCIDO:</strong> punto que superó el kilometraje objetivo más la tolerancia configurada.
                    </span>
                    <span>
                      <strong>EJECUTADO:</strong> punto acreditado por mantenimientos efectivamente realizados.
                    </span>
                  </div>

                  <div className="mt-1 text-gray-500">
                    La programación se genera dinámicamente con la configuración vigente, los mantenimientos reales registrados y el kilometraje de los preoperacionales. Este documento refleja el estado disponible al momento de su generación.
                  </div>
                </div>

                <div className="leyenda-plan-mantenimiento mt-2">
                  <div className="border border-black bg-slate-800 px-2 py-1 text-center text-[7px] font-black uppercase text-white">
                    Totalizado trimestral y acumulado anual
                  </div>

                  <table className="mt-1 w-full table-fixed border-collapse text-[6px]">
                    <thead>
                      <tr className="bg-gray-300">
                        <th className="border border-black px-1 py-1 font-black">
                          PERÍODO
                        </th>
                        <th className="border border-black px-1 py-1 font-black">
                          PROGRAMADOS
                        </th>
                        <th className="border border-black px-1 py-1 font-black">
                          EJECUTADOS
                        </th>
                        <th className="border border-black px-1 py-1 font-black">
                          VENCIDOS
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {totalizado.trimestres.map((item) => (
                        <tr key={item.nombre}>
                          <td className="border border-black px-1.5 py-1 font-bold">
                            {item.nombre}
                          </td>
                          <td className="border border-black px-1 py-1 text-center">
                            {item.programados}
                          </td>
                          <td className="border border-black px-1 py-1 text-center">
                            {item.ejecutados}
                          </td>
                          <td className="border border-black px-1 py-1 text-center">
                            {item.vencidos}
                          </td>
                        </tr>
                      ))}

                      <tr className="bg-gray-200 font-black">
                        <td className="border border-black px-1.5 py-1">
                          ACUMULADO ANUAL
                        </td>
                        <td className="border border-black px-1 py-1 text-center">
                          {totalizado.anual.programados}
                        </td>
                        <td className="border border-black px-1 py-1 text-center">
                          {totalizado.anual.ejecutados}
                        </td>
                        <td className="border border-black px-1 py-1 text-center">
                          {totalizado.anual.vencidos}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}
