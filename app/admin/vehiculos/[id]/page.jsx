// app/admin/vehiculos/[id]/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  useParams,
  useRouter,
} from 'next/navigation'

import Link from 'next/link'

import {
  Toaster,
  toast,
} from 'sonner'

import {
  cerrarSesion,
} from '@/lib/auth/logout'

import {
  ESTILO_SECCIONES,
  ESTILO_ENCABEZADO_TABLA,
  ESTILO_CELDAS_TABLA,
  BotonAccion,
  BotonImprimir,
  BotonSecundario,
} from '@/components/admin/EstiloModulo'

// ============================================================
// CONSTANTES
// ============================================================

const DOCUMENTO_SOAT = 'SOAT'
const DOCUMENTO_RTM = 'RTM'
const DOCUMENTO_TARJETA_SERVICIO = 'TARJETA_SERVICIO'

const ROL_ADMINISTRATIVO = 'ADMINISTRATIVO'

const FOTO_FRONTAL = 'frontal'
const FOTO_LATERAL = 'lateral'

// ============================================================
// HELPERS
// ============================================================

function formatearFecha(fecha) {
  if (!fecha) return '-'

  try {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Bogota',
      }
    ).format(
      new Date(
        `${fecha}T12:00:00`
      )
    )
  } catch {
    return fecha
  }
}

function formatearFechaHora(fecha) {
  if (!fecha) return '-'

  try {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Bogota',
      }
    ).format(
      new Date(fecha)
    )
  } catch {
    return fecha
  }
}

function formatearNumero(valor) {
  const numero =
    Number(valor)

  if (!Number.isFinite(numero)) {
    return '-'
  }

  return new Intl.NumberFormat(
    'es-CO',
    {
      maximumFractionDigits: 1,
    }
  ).format(numero)
}

function formatearMoneda(valor) {
  const numero =
    Number(valor)

  if (!Number.isFinite(numero)) {
    return '-'
  }

  return new Intl.NumberFormat(
    'es-CO',
    {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }
  ).format(numero)
}

function hoyBogota() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Bogota',
    }
  ).format(
    new Date()
  )
}

function obtenerEstadoVigencia(
  fecha
) {
  if (!fecha) {
    return 'SIN_VIGENCIA'
  }

  return (
    String(fecha) <
    hoyBogota()
      ? 'VENCIDO'
      : 'VIGENTE'
  )
}

function etiquetaDocumento(tipo) {
  if (
    tipo ===
    DOCUMENTO_SOAT
  ) {
    return 'SOAT'
  }

  if (
    tipo ===
    DOCUMENTO_RTM
  ) {
    return 'RTM'
  }

  if (
    tipo ===
    DOCUMENTO_TARJETA_SERVICIO
  ) {
    return 'Tarjeta de Servicio'
  }

  return tipo || '-'
}

function claseEstadoVehiculo(
  estado
) {
  const valor =
    String(
      estado || ''
    )
      .trim()
      .toUpperCase()

  return valor === 'ACTIVO'
    ? 'bg-green-100 text-green-700 border-green-300'
    : 'bg-red-100 text-red-700 border-red-300'
}

function claseEstadoSimple(
  estado
) {
  const valor =
    String(
      estado || ''
    )
      .trim()
      .toUpperCase()

  if (
    [
      'ACTIVA',
      'ACTIVO',
      'CERRADO',
      'CERRADA',
      'SOLUCIONADO',
      'SOLUCIONADA',
      'CONFORME',
    ].includes(valor)
  ) {
    return 'bg-green-100 text-green-700 border-green-300'
  }

  if (
    [
      'PENDIENTE',
      'ABIERTA',
      'ABIERTO',
      'EN ANÁLISIS',
      'EN ANALISIS',
      'NO CONFORME',
    ].includes(valor)
  ) {
    return 'bg-red-100 text-red-700 border-red-300'
  }

  return 'bg-gray-100 text-gray-700 border-gray-300'
}

function obtenerIconoVehiculo(tipo) {
  const valor =
    String(tipo || '')
      .trim()
      .toLowerCase()

  if (
    valor.includes('motocicleta')
  ) {
    return 'fa-motorcycle'
  }

  if (
    valor.includes('camioneta')
  ) {
    return 'fa-truck-pickup'
  }

  if (
    valor.includes('camión') ||
    valor.includes('camion')
  ) {
    return 'fa-truck'
  }

  return 'fa-car'
} 

function crearFormularioDocumento(
  documento = null
) {
  return {
    numero_documento:
      documento
        ?.numero_documento ||
      '',

    fecha_expedicion:
      documento
        ?.fecha_expedicion ||
      '',

    fecha_vigencia:
      documento
        ?.fecha_vigencia ||
      '',
  }
}


function texto(valor) {
  return String(valor ?? '').trim()
}

function normalizarClave(valor) {
  return texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function valorDocumento(tipo, documento) {
  switch (tipo) {
    case 'NOMBRE_DOCUMENTO':
      return texto(documento?.nombre_documento)
    case 'CODIGO':
      return texto(documento?.codigo)
    case 'FECHA_EDICION':
      return formatearFecha(documento?.fecha_edicion)
    case 'VERSION':
      return texto(documento?.version)
    case 'VIGENCIA':
      return formatearFecha(documento?.vigencia)
    // La paginación física la administra el navegador al imprimir.
    // Se conserva la celda configurada sin inventar un total de páginas.
    case 'PAGINACION':
      return ''
    default:
      return ''
  }
}

function EncabezadoDocumento({ encabezado, documento, logo }) {
  const estructura =
    encabezado?.estructura && typeof encabezado.estructura === 'object'
      ? encabezado.estructura
      : {}

  const celdas = Array.isArray(estructura?.celdas) ? estructura.celdas : []
  const filas = Array.isArray(estructura?.filas) ? estructura.filas : []
  const columnas = Array.isArray(estructura?.columnas) ? estructura.columnas : []
  const configuracion =
    estructura?.configuracion && typeof estructura.configuracion === 'object'
      ? estructura.configuracion
      : {}

  const cantidadFilas = Number(encabezado?.filas) || filas.length || 2
  const cantidadColumnas = Number(encabezado?.columnas) || columnas.length || 3

  const anchos = Array.from({ length: cantidadColumnas }, (_, indice) => {
    const item = columnas[indice]
    const ancho = Number(item?.ancho ?? item?.width ?? item)
    return Number.isFinite(ancho) && ancho > 0 ? ancho : 1
  })

  const alturas = Array.from({ length: cantidadFilas }, (_, indice) => {
    const item = filas[indice]
    const alto = Number(item?.alto ?? item?.altura ?? item?.height ?? item)
    return Number.isFinite(alto) && alto > 0 ? `${alto}mm` : 'auto'
  })

  const grosorBorde = Number(configuracion?.grosor_borde) || 1
  const paddingConfigurado = Number(configuracion?.padding)
  const paddingCelda = Number.isFinite(paddingConfigurado) ? paddingConfigurado : 4

  if (celdas.length === 0) {
    return (
      <div className="border border-black p-3 text-center">
        <div className="text-[12px] font-black uppercase">
          {documento?.nombre_documento || 'HOJA DE VIDA VEHICULOS'}
        </div>
      </div>
    )
  }

  return (
    <div
      className="grid w-full bg-white"
      style={{
        gridTemplateColumns: anchos.map(ancho => `${ancho}fr`).join(' '),
        gridTemplateRows: alturas.join(' '),
      }}
    >
      {celdas.map(celda => {
        const elementos = Array.isArray(celda?.elementos) ? celda.elementos : []
        const fila = Number(celda?.fila) || 1
        const columna = Number(celda?.columna) || 1
        const rowSpan = Number(celda?.rowSpan ?? celda?.row_span) || 1
        const colSpan = Number(celda?.colSpan ?? celda?.col_span) || 1
        const horizontal = celda?.alineacion_horizontal || 'center'
        const vertical = celda?.alineacion_vertical || 'center'

        return (
          <div
            key={celda?.id || `${fila}-${columna}`}
            className="flex overflow-hidden"
            style={{
              gridRow: `${fila} / span ${rowSpan}`,
              gridColumn: `${columna} / span ${colSpan}`,
              justifyContent:
                horizontal === 'left' ? 'flex-start' :
                horizontal === 'right' ? 'flex-end' : 'center',
              alignItems:
                vertical === 'top' ? 'flex-start' :
                vertical === 'bottom' ? 'flex-end' : 'center',
              textAlign: horizontal,
              padding: `${paddingCelda}px`,
              borderTop: celda?.borde_superior === false ? 'none' : `${grosorBorde}px solid #000`,
              borderBottom: celda?.borde_inferior === false ? 'none' : `${grosorBorde}px solid #000`,
              borderLeft: celda?.borde_izquierdo === false ? 'none' : `${grosorBorde}px solid #000`,
              borderRight: celda?.borde_derecho === false ? 'none' : `${grosorBorde}px solid #000`,
            }}
          >
            <div className="w-full">
              {elementos.map((elemento, indice) => {
                const tipo = texto(elemento?.tipo).toUpperCase()
                if (tipo === 'VACIO') return null

                if (tipo === 'LOGO') {
                  return (
                    <div
                      key={`${tipo}-${indice}`}
                      className="flex h-full w-full items-center justify-center"
                    >
                      {logo?.url ? (
                        <img
                          src={logo.url}
                          alt="Logo institucional"
                          className="max-h-[15mm] max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[7px] text-gray-400">LOGO</span>
                      )}
                    </div>
                  )
                }

                const valor =
                  tipo === 'TEXTO'
                    ? texto(elemento?.valor)
                    : valorDocumento(tipo, documento)

                return (
                  <div
                    key={`${tipo}-${indice}`}
                    style={{
                      fontSize: `${Number(elemento?.tamano_fuente) || 8}px`,
                      fontWeight: elemento?.negrita === true ? 700 : 400,
                      lineHeight: 1.15,
                    }}
                  >
                    {texto(elemento?.prefijo)}
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
// BADGE VIGENCIA
// ============================================================

function BadgeVigencia({
  fecha,
}) {
  const estado =
    obtenerEstadoVigencia(
      fecha
    )

  if (
    estado ===
    'VIGENTE'
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-300 bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
        <i className="fas fa-check-circle"></i>
        VIGENTE
      </span>
    )
  }

  if (
    estado ===
    'VENCIDO'
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
        <i className="fas fa-exclamation-circle"></i>
        VENCIDO
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
      SIN VIGENCIA
    </span>
  )
}

// ============================================================
// PÁGINA
// ============================================================

export default function HojaVidaVehiculoPage() {
  const router =
    useRouter()

  const params =
    useParams()

  const vehiculoId =
    Number(
      params?.id
    )

  const inputFotoFrontalRef =
    useRef(null)

  const inputFotoLateralRef =
    useRef(null)

  const [
    user,
    setUser,
  ] = useState(null)

  const [
    nitActual,
    setNitActual,
  ] = useState('')

  const [
    vehiculo,
    setVehiculo,
  ] = useState(null)

  const [
    encabezadoDocumento,
    setEncabezadoDocumento,
  ] = useState(null)

  const [
    configuracionHojaVida,
    setConfiguracionHojaVida,
  ] = useState(null)

  const [
    logoDocumento,
    setLogoDocumento,
  ] = useState({
    path: '',
    url: '',
  })

  const [
    errorDocumento,
    setErrorDocumento,
  ] = useState('')

  const [
    historial,
    setHistorial,
  ] = useState([])

  const [
    vinculaciones,
    setVinculaciones,
  ] = useState([])

  const [
    resumenOperativo,
    setResumenOperativo,
  ] = useState(null)

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    errorCarga,
    setErrorCarga,
  ] = useState('')

  const [
    filtroDocumento,
    setFiltroDocumento,
  ] = useState('TODOS')

  // ==========================================================
  // FOTOS
  // ==========================================================

  const [
    fotoFrontalUrl,
    setFotoFrontalUrl,
  ] = useState('')

  const [
    fotoLateralUrl,
    setFotoLateralUrl,
  ] = useState('')

  const [
    subiendoFoto,
    setSubiendoFoto,
  ] = useState('')

  // ==========================================================
  // DOCUMENTOS
  // ==========================================================

  const [
    modalDocumento,
    setModalDocumento,
  ] = useState(null)

  const [
    formDocumento,
    setFormDocumento,
  ] = useState(
    crearFormularioDocumento()
  )

  const [
    guardandoDocumento,
    setGuardandoDocumento,
  ] = useState(false)

  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(() => {
    const stored =
      localStorage.getItem(
        'currentUser'
      )

    if (!stored) {
      router.push('/login')
      return
    }

    try {
      const parsed =
        JSON.parse(stored)

      setUser(parsed)

      const nit =
        parsed?.nitEmpresa ||
        localStorage.getItem(
          'currentEmpresaNit'
        ) ||
        parsed?.empresa?.nit ||
        ''

      if (!nit) {
        toast.error(
          'No se encontró el CEA asociado a la sesión.'
        )

        return
      }

      setNitActual(
        String(nit).trim()
      )
    } catch (error) {
      console.error(
        'Error leyendo sesión:',
        error
      )

      localStorage.removeItem(
        'currentUser'
      )

      router.push('/login')
    }
  }, [router])

  // ==========================================================
  // CONFIGURACIÓN DOCUMENTAL DE LA HOJA DE VIDA
  // ==========================================================

  useEffect(() => {
    if (!nitActual) {
      return
    }

    let activo = true

    async function cargarConfiguracionDocumento() {
      try {
        setErrorDocumento('')

        const headers = {
          'x-cea-nit': nitActual,
        }

        const [
          respuestaConfiguracion,
          respuestaLogo,
        ] = await Promise.all([
          fetch(
            '/api/admin/configuracion-documentos',
            {
              method: 'GET',
              headers,
              cache: 'no-store',
            }
          ),
          fetch(
            '/api/admin/configuracion-academica/logo',
            {
              method: 'GET',
              headers,
              cache: 'no-store',
            }
          ),
        ])

        const dataConfiguracion =
          await respuestaConfiguracion.json()

        const dataLogo =
          await respuestaLogo.json()

        if (
          !respuestaConfiguracion.ok ||
          dataConfiguracion?.ok !== true
        ) {
          throw new Error(
            dataConfiguracion?.error ||
            'No fue posible consultar la configuración documental.'
          )
        }

        if (!respuestaLogo.ok) {
          throw new Error(
            dataLogo?.error ||
            'No fue posible consultar el logo institucional.'
          )
        }

        const documentos =
          Array.isArray(dataConfiguracion?.documentos)
            ? dataConfiguracion.documentos
            : []

        const documentoEncontrado =
          documentos.find(
            item =>
              normalizarClave(item?.nombre_documento) ===
              'HOJA_DE_VIDA_VEHICULOS'
          ) ||
          documentos.find(item => {
            const clave = normalizarClave(item?.nombre_documento)
            return (
              clave.includes('HOJA_DE_VIDA') &&
              clave.includes('VEHICUL')
            )
          })

        if (!documentoEncontrado) {
          throw new Error(
            'No se encontró "HOJA DE VIDA VEHICULOS" en Configuración de Documentos > Otros Documentos.'
          )
        }

        if (documentoEncontrado?.activo === false) {
          throw new Error(
            'El documento HOJA DE VIDA VEHICULOS se encuentra inactivo en Configuración de Documentos.'
          )
        }

        if (activo) {
          setEncabezadoDocumento(
            dataConfiguracion?.encabezado || null
          )

          setConfiguracionHojaVida(
            documentoEncontrado
          )

          setLogoDocumento({
            path:
              dataLogo?.paths?.actual || '',
            url:
              dataLogo?.logo?.actual || '',
          })
        }
      } catch (error) {
        console.error(
          'Error cargando configuración documental de Hoja de Vida:',
          error
        )

        if (activo) {
          setErrorDocumento(
            error?.message ||
            'No fue posible preparar el encabezado documental.'
          )
        }
      }
    }

    cargarConfiguracionDocumento()

    return () => {
      activo = false
    }
  }, [nitActual])

  // ==========================================================
  // CARGAR FOTOS
  // ==========================================================

  const cargarFotos =
    async () => {
      if (
        !nitActual ||
        !vehiculoId
      ) {
        return
      }

      try {
        const response =
          await fetch(
            `/api/vehiculos/fotos?nit=${encodeURIComponent(
              nitActual
            )}&vehiculo_id=${encodeURIComponent(
              vehiculoId
            )}`,
            {
              cache:
                'no-store',
            }
          )

        if (!response.ok) {
          return
        }

        const result =
          await response.json()

        if (
          result?.status !==
          'success'
        ) {
          return
        }

        setFotoFrontalUrl(
          result
            ?.fotos
            ?.frontal ||
            ''
        )

        setFotoLateralUrl(
          result
            ?.fotos
            ?.lateral ||
            ''
        )
      } catch {
        // API de fotos puede no existir aún.
      }
    }

  // ==========================================================
  // CARGAR TODO
  // ==========================================================

  const cargarHojaVida =
    async () => {
      if (
        !nitActual ||
        !Number.isInteger(
          vehiculoId
        ) ||
        vehiculoId <= 0
      ) {
        return
      }

      setCargando(true)
      setErrorCarga('')

      try {
        const [
          resVehiculo,
          resHistorial,
          resVinculaciones,
          resOperativo,
        ] =
          await Promise.all([
            fetch(
              `/api/vehiculos?nit=${encodeURIComponent(
                nitActual
              )}&recurso=detalle&id=${encodeURIComponent(
                vehiculoId
              )}`,
              {
                cache:
                  'no-store',
              }
            ),

            fetch(
              `/api/documentos/vehiculos?nit=${encodeURIComponent(
                nitActual
              )}&recurso=historial&vehiculo_id=${encodeURIComponent(
                vehiculoId
              )}`,
              {
                cache:
                  'no-store',
              }
            ),

            fetch(
              `/api/vehiculos?nit=${encodeURIComponent(
                nitActual
              )}&recurso=vinculaciones&vehiculo_id=${encodeURIComponent(
                vehiculoId
              )}`,
              {
                cache:
                  'no-store',
              }
            ),

            fetch(
              `/api/vehiculos?nit=${encodeURIComponent(
                nitActual
              )}&recurso=resumen_operativo&vehiculo_id=${encodeURIComponent(
                vehiculoId
              )}`,
              {
                cache:
                  'no-store',
              }
            ),
          ])

        const [
          jsonVehiculo,
          jsonHistorial,
          jsonVinculaciones,
          jsonOperativo,
        ] =
          await Promise.all([
            resVehiculo.json(),
            resHistorial.json(),
            resVinculaciones.json(),
            resOperativo.json(),
          ])

        if (
          !resVehiculo.ok ||
          jsonVehiculo?.status !==
            'success'
        ) {
          throw new Error(
            jsonVehiculo?.message ||
              'No fue posible cargar el vehículo.'
          )
        }

        if (
          !resHistorial.ok ||
          jsonHistorial?.status !==
            'success'
        ) {
          throw new Error(
            jsonHistorial?.message ||
              'No fue posible cargar el historial documental.'
          )
        }

        if (
          !resVinculaciones.ok ||
          jsonVinculaciones?.status !==
            'success'
        ) {
          throw new Error(
            jsonVinculaciones?.message ||
              'No fue posible cargar las vinculaciones.'
          )
        }

        if (
          !resOperativo.ok ||
          jsonOperativo?.status !==
            'success'
        ) {
          throw new Error(
            jsonOperativo?.message ||
              'No fue posible cargar el resumen operativo.'
          )
        }

        setVehiculo(
          jsonVehiculo
            ?.vehiculo ||
            null
        )

        setHistorial(
          Array.isArray(
            jsonHistorial
              ?.historial
          )
            ? jsonHistorial
                .historial
            : []
        )

        setVinculaciones(
          Array.isArray(
            jsonVinculaciones
              ?.vinculaciones
          )
            ? jsonVinculaciones
                .vinculaciones
            : []
        )

        setResumenOperativo(
          jsonOperativo
        )

        await cargarFotos()
      } catch (error) {
        console.error(
          'Error cargando hoja de vida:',
          error
        )

        setErrorCarga(
          error?.message ||
          'No fue posible cargar la hoja de vida.'
        )

        toast.error(
          error?.message ||
          'No fue posible cargar la hoja de vida.'
        )
      } finally {
        setCargando(false)
      }
    }

  useEffect(() => {
    cargarHojaVida()
  }, [
    nitActual,
    vehiculoId,
  ])

  // ==========================================================
  // DOCUMENTOS ACTUALES
  // ==========================================================

  const documentoActual =
    (tipo) =>
      historial.find(
        (item) =>
          String(
            item.documento ||
            ''
          ).toUpperCase() ===
          tipo
      ) ||
      null

  const soatActual =
    useMemo(
      () =>
        documentoActual(
          DOCUMENTO_SOAT
        ),
      [historial]
    )

  const rtmActual =
    useMemo(
      () =>
        documentoActual(
          DOCUMENTO_RTM
        ),
      [historial]
    )

  const tarjetaActual =
    useMemo(
      () =>
        documentoActual(
          DOCUMENTO_TARJETA_SERVICIO
        ),
      [historial]
    )

  const vinculacionActiva =
    useMemo(
      () =>
        vinculaciones.find(
          (item) =>
            String(
              item.estado ||
              ''
            ).toUpperCase() ===
            'ACTIVA'
        ) ||
        null,
      [vinculaciones]
    )

  const historialFiltrado =
    useMemo(() => {
      if (
        filtroDocumento ===
        'TODOS'
      ) {
        return historial
      }

      return historial.filter(
        (item) =>
          String(
            item.documento ||
            ''
          ).toUpperCase() ===
          filtroDocumento
      )
    }, [
      historial,
      filtroDocumento,
    ])

  const documentosVencidos =
    useMemo(() => {
      return [
        soatActual,
        rtmActual,
        tarjetaActual,
      ].filter(
        (item) =>
          item &&
          obtenerEstadoVigencia(
            item.fecha_vigencia
          ) ===
            'VENCIDO'
      ).length
    }, [
      soatActual,
      rtmActual,
      tarjetaActual,
    ])

  const documentosSinRegistro =
    useMemo(() => {
      return [
        soatActual,
        rtmActual,
        tarjetaActual,
      ].filter(
        (item) =>
          !item
      ).length
    }, [
      soatActual,
      rtmActual,
      tarjetaActual,
    ])

  // ==========================================================
  // RESUMEN OPERATIVO
  // ==========================================================

  const kilometraje =
    resumenOperativo
      ?.kilometraje ||
    {}

  const instructoresRecientes =
    resumenOperativo
      ?.instructores_recientes ||
    []
 
  const periodoInstructores =
  resumenOperativo
    ?.periodo_instructores ||
  {
    dias: 90,
    desde: null,
    hasta: null,
  }
    
  const mantenimientos =
    resumenOperativo
      ?.mantenimientos
      ?.ultimos ||
    []

  const fallas =
    resumenOperativo
      ?.fallas
      ?.ultimas ||
    []

  const preoperacionales =
    resumenOperativo
      ?.preoperacionales ||
    {
      total: 0,
      conformes: 0,
      no_conformes: 0,
      pendientes: 0,
      ultimas_no_conformidades: [],
    }

  const siniestros =
    resumenOperativo
      ?.siniestros
      ?.ultimos ||
    []

  // ==========================================================
  // DOCUMENTOS
  // ==========================================================

  const abrirModalDocumento =
    (
      tipo,
      documento
    ) => {
      setModalDocumento({
        tipo,
      })

      setFormDocumento(
        crearFormularioDocumento(
          documento
        )
      )
    }

  const guardarDocumento =
    async () => {
      if (
        !modalDocumento ||
        !vehiculo ||
        !nitActual ||
        guardandoDocumento
      ) {
        return
      }

      const numeroDocumento =
        String(
          formDocumento
            .numero_documento ||
            ''
        )
          .trim()
          .toUpperCase()

      const fechaExpedicion =
        String(
          formDocumento
            .fecha_expedicion ||
            ''
        ).trim()

      const fechaVigencia =
        String(
          formDocumento
            .fecha_vigencia ||
            ''
        ).trim()

      if (!numeroDocumento) {
        toast.error(
          'Ingrese el número del documento.'
        )
        return
      }

      if (!fechaExpedicion) {
        toast.error(
          'Seleccione la fecha de expedición.'
        )
        return
      }

      if (!fechaVigencia) {
        toast.error(
          'Seleccione la fecha de vigencia.'
        )
        return
      }

      if (
        fechaVigencia <
        fechaExpedicion
      ) {
        toast.error(
          'La vigencia no puede ser anterior a la fecha de expedición.'
        )
        return
      }

      setGuardandoDocumento(true)

      try {
        const esTarjeta =
          modalDocumento.tipo ===
          DOCUMENTO_TARJETA_SERVICIO

        const payload = {
          nit:
            nitActual,

          accion:
            esTarjeta
              ? 'guardar_tarjeta_servicio_admin'
              : 'guardar_documento',

          vehiculo_id:
            vehiculo.id,

          placa:
            vehiculo.placa,

          tipo_vehiculo:
            vehiculo
              .tipo_vehiculo ||
            null,

          documento:
            modalDocumento.tipo,

          numero_documento:
            numeroDocumento,

          fecha_expedicion:
            fechaExpedicion,

          fecha_vigencia:
            fechaVigencia,

          vinculacion_id:
            vinculacionActiva
              ?.id ||
            null,

          nombre_quien_actualiza:
            user?.nombreCompleto ||
            user?.nombre_completo ||
            user?.usuario ||
            '',

          rol_solicitante:
            ROL_ADMINISTRATIVO,
        }

        const response =
          await fetch(
            '/api/documentos/vehiculos',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          )

        const result =
          await response.json()

        if (
          response.status ===
            409 ||
          result?.status ===
            'warning'
        ) {
          toast.warning(
            result?.message ||
            'Ya existe un registro equivalente.'
          )
          return
        }

        if (
          !response.ok ||
          result?.status !==
            'success'
        ) {
          toast.error(
            result?.message ||
            'No fue posible registrar el documento.'
          )
          return
        }

        toast.success(
          result?.message ||
          'Nueva versión registrada correctamente.'
        )

        setModalDocumento(null)

        await cargarHojaVida()
      } catch (error) {
        console.error(
          'Error guardando documento:',
          error
        )

        toast.error(
          'No fue posible comunicarse con el servidor.'
        )
      } finally {
        setGuardandoDocumento(false)
      }
    }

  // ==========================================================
  // FOTOS
  // ==========================================================

  const subirFoto =
    async (
      archivo,
      tipo
    ) => {
      if (
        !archivo ||
        !vehiculo ||
        !nitActual ||
        subiendoFoto
      ) {
        return
      }

      const tiposValidos = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ]

      if (
        !tiposValidos.includes(
          archivo.type
        )
      ) {
        toast.warning(
          'La imagen debe ser JPG, PNG o WEBP.'
        )
        return
      }

      if (
        archivo.size >
        3 * 1024 * 1024
      ) {
        toast.warning(
          'La fotografía no puede superar 3 MB.'
        )
        return
      }

      setSubiendoFoto(tipo)

      try {
        const formData =
          new FormData()

        formData.append(
          'nit',
          nitActual
        )

        formData.append(
          'vehiculo_id',
          String(
            vehiculo.id
          )
        )

        formData.append(
          'tipo',
          tipo
        )

        formData.append(
          'archivo',
          archivo
        )

        const response =
          await fetch(
            '/api/vehiculos/fotos',
            {
              method:
                'POST',
              body:
                formData,
            }
          )

        const result =
          await response.json()

        if (
          !response.ok ||
          result?.status !==
            'success'
        ) {
          toast.error(
            result?.message ||
            'No fue posible cargar la fotografía.'
          )
          return
        }

        toast.success(
          'Fotografía actualizada correctamente.'
        )

        await cargarFotos()
      } catch (error) {
        console.error(
          'Error cargando fotografía:',
          error
        )

        toast.error(
          'No fue posible cargar la fotografía.'
        )
      } finally {
        setSubiendoFoto('')

        if (
          inputFotoFrontalRef.current
        ) {
          inputFotoFrontalRef.current.value =
            ''
        }

        if (
          inputFotoLateralRef.current
        ) {
          inputFotoLateralRef.current.value =
            ''
        }
      }
    }

// ==========================================================
// RENDER
// ==========================================================

if (!user) {
  return (
    <p className="text-center mt-20">
      Cargando...
    </p>
  )
}

if (cargando) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="text-center text-gray-600">

        <i className="fas fa-spinner fa-spin text-2xl mb-3"></i>

        <p>
          Cargando Hoja de Vida...
        </p>

      </div>

    </div>
  )
}

if (
  errorCarga ||
  !vehiculo
) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">

      <div className="bg-white border rounded-xl shadow-lg p-6 max-w-lg w-full text-center">

        <i className="fas fa-exclamation-triangle text-red-600 text-3xl mb-4"></i>

        <h2 className="text-lg font-bold mb-2">
          No fue posible cargar la Hoja de Vida
        </h2>

        <p className="text-sm text-gray-600 mb-5">
          {errorCarga}
        </p>

        <button
          onClick={() =>
            router.push(
              '/admin/vehiculos'
            )
          }
          className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          Regresar
        </button>

      </div>

    </div>
  )
}

return (
  <div className="min-h-screen bg-gray-100 p-4 sm:p-6 print:bg-white print:p-0">

    <Toaster
      richColors
      position="top-center"
    />

    <div className="contenedor-hoja-vida max-w-[980px] mx-auto space-y-5">

      {errorDocumento && (
        <div className="print:hidden mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          {errorDocumento}
        </div>
      )}

      <div className="barra-hoja-vida no-print print:hidden mb-3 flex flex-col gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <div>
            <span className="text-gray-500">Estado:</span>{' '}
            <strong
              className={
                String(vehiculo.estado || '').toUpperCase() === 'ACTIVO'
                  ? 'text-green-700'
                  : 'text-red-700'
              }
            >
              {vehiculo.estado || '-'}
            </strong>
          </div>

          <div>
            <span className="text-gray-500">Documentos vencidos:</span>{' '}
            <strong className={documentosVencidos > 0 ? 'text-red-700' : 'text-green-700'}>
              {documentosVencidos}
            </strong>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <BotonImprimir
            type="button"
            onClick={() => window.print()}
          >
            <i className="fas fa-print"></i>
            Imprimir
          </BotonImprimir>

          <Link href="/admin/vehiculos">
            <BotonSecundario type="button">
              <i className="fas fa-arrow-left"></i>
              Vehículos
            </BotonSecundario>
          </Link>

          <BotonAccion
            tipo="eliminar"
            type="button"
            onClick={() => cerrarSesion(router)}
          >
            <i className="fas fa-sign-out-alt"></i>
            Cerrar Sesión
          </BotonAccion>
        </div>
      </div>

      <table className="estructura-hoja-vida-print w-full border-collapse">
        <thead className="encabezado-documental-repetido">
          <tr>
            <td className="p-0 border-0">
              <div className="margen-superior-documento"></div>

              <div className="encabezado-documental-hoja-vida">
                <EncabezadoDocumento
                  encabezado={encabezadoDocumento}
                  documento={configuracionHojaVida}
                  logo={logoDocumento}
                />
              </div>

              <div className="separador-encabezado-documento h-4 print:h-auto"></div>
            </td>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="contenido-hoja-vida-print p-0 border-0 align-top">

              <div className="cabecera-datos-vehiculo bg-white border rounded-xl shadow-lg overflow-hidden print:shadow-none">
                <div className="grid grid-cols-1 xl:grid-cols-[0.76fr_1.54fr_1.7fr] print:grid-cols-[0.76fr_1.54fr_1.7fr] gap-0">

                  <div className="p-4 border-b xl:border-b-0 xl:border-r print:border-b-0 print:border-r flex flex-col justify-center">
                    <h1 className="text-3xl sm:text-4xl font-black text-[var(--primary)] tracking-wide leading-none">
                      {vehiculo.placa}
                    </h1>

                    <p className="text-base font-bold text-gray-800 mt-3">
                      {vehiculo.tipo_vehiculo || '-'}
                    </p>

                    <div className="mt-2 border-l-4 border-amber-500 pl-3">
                      <p className="text-base font-bold text-amber-700 uppercase leading-tight">
                        {vehiculo.marca || '-'}
                        {vehiculo.linea ? ` ${vehiculo.linea}` : ''}
                      </p>

                      {vehiculo.modelo && (
                        <p className="text-sm font-semibold text-gray-600 mt-1">
                          Modelo {vehiculo.modelo}
                        </p>
                      )}
                    </div>

                    <p className="mt-4 text-[11px] leading-snug text-gray-600">
                      <span className="font-semibold">Kilometraje promedio mensual (últimos 6 meses):</span>{' '}
                      <strong className="text-gray-800">
                        {formatearNumero(kilometraje.promedio_mensual_6_meses)} km
                      </strong>
                    </p>
                  </div>

                  <div className="p-3 border-b xl:border-b-0 xl:border-r print:border-b-0 print:border-r space-y-3">
                    <BloqueDatosCabecera titulo="Identificación y características">
                      <DatoCompacto label="Clasificación" valor={vehiculo.clasificacion} />
                      <DatoCompacto label="Origen" valor={vehiculo.origen} />
                      <DatoCompacto label="Propietario" valor={vehiculo.propietario} />
                      <DatoCompacto label="Fecha adquisición" valor={formatearFecha(vehiculo.fecha_adquisicion)} />
                      <DatoCompacto label="Línea" valor={vehiculo.linea} />
                      <DatoCompacto label="Carrocería" valor={vehiculo.tipo_carroceria} />
                      <DatoCompacto label="GPS" valor={vehiculo.gps} />
                    </BloqueDatosCabecera>

                    <BloqueDatosCabecera titulo="Identificadores técnicos">
                      <DatoCompacto label="Chasis" valor={vehiculo.numero_chasis} />
                      <DatoCompacto label="Motor" valor={vehiculo.numero_motor} />
                      <DatoCompacto label="VIN" valor={vehiculo.vin} />
                    </BloqueDatosCabecera>

                    <BloqueDatosCabecera titulo="Licencia de tránsito">
                      <DatoCompacto label="Número" valor={vehiculo.numero_licencia_transito} />
                      <DatoCompacto label="Fecha matrícula" valor={formatearFecha(vehiculo.fecha_matricula)} />
                      <DatoCompacto label="Organismo" valor={vehiculo.organismo_transito} />
                    </BloqueDatosCabecera>

                    <BloqueDatosCabecera titulo="Vinculación actual al CEA">
                      {vinculacionActiva ? (
                        <>
                          <DatoCompacto label="Fecha" valor={formatearFecha(vinculacionActiva.fecha_vinculacion)} />
                          <DatoCompacto label="Estado" valor="ACTIVA" />
                          <DatoCompacto label="Motivo" valor={vinculacionActiva.motivo_vinculacion} />
                          <DatoCompacto label="Responsable" valor={vinculacionActiva.creado_por} />
                        </>
                      ) : (
                        <div className="col-span-full text-[11px] text-amber-700">
                          El vehículo no tiene una vinculación activa registrada.
                        </div>
                      )}
                    </BloqueDatosCabecera>
                  </div>

                  <div className="p-3 flex items-start">
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <FotoVehiculo
                        titulo=""
                        url={fotoFrontalUrl}
                        path={vehiculo.foto_frontal_path}
                        inputRef={inputFotoFrontalRef}
                        cargando={subiendoFoto === FOTO_FRONTAL}
                        onArchivo={(archivo) => subirFoto(archivo, FOTO_FRONTAL)}
                      />

                      <FotoVehiculo
                        titulo=""
                        url={fotoLateralUrl}
                        path={vehiculo.foto_lateral_path}
                        inputRef={inputFotoLateralRef}
                        cargando={subiendoFoto === FOTO_LATERAL}
                        onArchivo={(archivo) => subirFoto(archivo, FOTO_LATERAL)}
                      />
                    </div>
                  </div>

                </div>
              </div>

        {/* ==================================================
            DOCUMENTOS
        ================================================== */}

        <Seccion
          titulo="Documentación Actual"
          icono="fa-file-alt"
          evitarCorte
        >

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <DocumentoActual
              titulo="SOAT"
              documento={
                soatActual
              }
              onRegistrar={() =>
                abrirModalDocumento(
                  DOCUMENTO_SOAT,
                  soatActual
                )
              }
            />

            <DocumentoActual
              titulo="Revisión Técnico-Mecánica"
              documento={
                rtmActual
              }
              onRegistrar={() =>
                abrirModalDocumento(
                  DOCUMENTO_RTM,
                  rtmActual
                )
              }
            />

            <DocumentoActual
              titulo="Tarjeta de Servicio"
              documento={
                tarjetaActual
              }
              onRegistrar={() =>
                abrirModalDocumento(
                  DOCUMENTO_TARJETA_SERVICIO,
                  tarjetaActual
                )
              }
            />

          </div>

        </Seccion>

        {/* ==================================================
            KILOMETRAJE
        ================================================== */}

        <Seccion
          titulo="Uso y Kilometraje"
          icono="fa-tachometer-alt"
          evitarCorte
        >

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

            <Dato
              label="Últimos 7 días"
              valor={`${formatearNumero(
                kilometraje
                  .km_ultimos_7_dias
              )} km`}
            />

            <Dato
              label="Promedio semanal (últimas 4 semanas)"
              valor={`${formatearNumero(
                kilometraje
                  .promedio_semanal_4_semanas
              )} km`}
            />

            <Dato
              label="Mes actual"
              valor={`${formatearNumero(
                kilometraje
                  .km_mes_actual
              )} km`}
            />

            <Dato
              label="Promedio mensual (últimos 6 meses)"
              valor={`${formatearNumero(
                kilometraje
                  .promedio_mensual_6_meses
              )} km`}
            />

            <Dato
              label="Último kilometraje"
              valor={
                kilometraje
                  .ultimo_kilometraje !==
                null
                  ? `${formatearNumero(
                      kilometraje
                        .ultimo_kilometraje
                    )} km`
                  : '-'
              }
            />

          </div>

          <p className="text-xs text-gray-500 mt-3">
            Última lectura:{' '}
            <strong>
              {formatearFecha(
                kilometraje.ultima_fecha_km
              )}
            </strong>
            {' • '}
            Jornadas válidas analizadas:{' '}
            <strong>
              {kilometraje.jornadas_validas || 0}
            </strong>
          </p>

        </Seccion>

                {/* ==================================================
            INSTRUCTORES
        ================================================== */}

        <Seccion
          titulo="Instructores Recientes a Cargo"
          icono="fa-chalkboard-teacher"
        >

          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 print-avoid-break">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">

              <p>
                <i className="fas fa-calendar-alt mr-2"></i>

                <strong>
                  Período analizado:
                </strong>{' '}

                últimos {periodoInstructores.dias || 90} días
              </p>

              {periodoInstructores.desde &&
                periodoInstructores.hasta && (
                  <p className="text-xs sm:text-sm">
                    {formatearFecha(
                      periodoInstructores.desde
                    )}
                    {' al '}
                    {formatearFecha(
                      periodoInstructores.hasta
                    )}
                  </p>
                )}

            </div>

          </div>

          <TablaVacia
            visible={
              instructoresRecientes.length ===
              0
            }
            texto={
              periodoInstructores.desde &&
              periodoInstructores.hasta
                ? `No hay jornadas asociadas a esta placa entre ${formatearFecha(
                    periodoInstructores.desde
                  )} y ${formatearFecha(
                    periodoInstructores.hasta
                  )}.`
                : 'No hay jornadas recientes asociadas a esta placa.'
            }
          />

          {instructoresRecientes.length > 0 && (

            <div className="overflow-x-auto">

              <table className="min-w-full text-sm border">

                <thead style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>

                  <tr>

                    <th className="border p-2 text-left">
                      Instructor
                    </th>

                    <th className="border p-2 text-left">
                      Última jornada
                    </th>

                    <th className="border p-2">
                      Jornadas
                    </th>

                    <th className="border p-2">
                      Clases
                    </th>

                    <th className="border p-2">
                      Aprendices
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {instructoresRecientes.map(
                    (
                      item,
                      index
                    ) => (

                      <tr
                        key={`${item.nombre_completo}-${index}`}
                        className="print-row"
                      >

                        <td className="border p-2 font-semibold">
                          {item.nombre_completo}
                        </td>

                        <td className="border p-2">
                          {formatearFecha(
                            item.ultima_fecha
                          )}
                        </td>

                        <td className="border p-2 text-center">
                          {item.jornadas}
                        </td>

                        <td className="border p-2 text-center">
                          {item.clases_dictadas}
                        </td>

                        <td className="border p-2 text-center">
                          {item.num_aprendices}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </Seccion>

        {/* ==================================================
            MANTENIMIENTOS
        ================================================== */}

        <Seccion
          titulo="Últimos Mantenimientos"
          icono="fa-tools"
        >

          <TablaVacia
            visible={
              mantenimientos.length ===
              0
            }
            texto="No existen mantenimientos registrados para este vehículo."
          />

          {mantenimientos.length >
            0 && (

            <div className="overflow-x-auto">

              <table className="min-w-full text-sm border">

                <thead style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>

                  <tr>
                    <th className="border p-2 text-left">
                      Fecha
                    </th>
                    <th className="border p-2 text-left">
                      Km
                    </th>
                    <th className="border p-2 text-left">
                      Tipo
                    </th>
                    <th className="border p-2 text-left">
                      Actividad
                    </th>
                    <th className="border p-2 text-left">
                      Responsable
                    </th>
                    <th className="border p-2 text-left">
                      Costo
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {mantenimientos.map(
                    (item) => (

                      <tr
                        key={item.id}
                        className="print-row"
                      >

                        <td className="border p-2">
                          {formatearFecha(
                            item.fecha_registro
                          )}
                        </td>

                        <td className="border p-2">
                          {formatearNumero(
                            item.kilometraje
                          )}
                        </td>

                        <td className="border p-2">
                          {item.tipo_mantenimiento || '-'}
                        </td>

                        <td className="border p-2">
                          {item.actividad_realizada || '-'}
                        </td>

                        <td className="border p-2">
                          {item.responsable || item.nombres_tecnico || '-'}
                        </td>

                        <td className="border p-2">
                          {formatearMoneda(
                            item.costo_total
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </Seccion>

          
        {/* ==================================================
            FALLAS
        ================================================== */}

        <Seccion
          titulo="Reporte de Fallas"
          icono="fa-exclamation-circle"
        >

          <div className="grid grid-cols-2 gap-3 mb-4 print-avoid-break">

            <Dato
              label="Fallas mostradas"
              valor={
                resumenOperativo
                  ?.fallas
                  ?.total_mostradas ||
                0
              }
            />

            <Dato
              label="Fallas abiertas"
              valor={
                resumenOperativo
                  ?.fallas
                  ?.abiertas ||
                0
              }
            />

          </div>

          <TablaVacia
            visible={
              fallas.length ===
              0
            }
            texto="No existen fallas reportadas."
          />

          {fallas.length > 0 && (

            <div className="overflow-x-auto">

              <table className="min-w-full text-sm border">

                <thead style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>

                  <tr>
                    <th className="border p-2 text-left">
                      Fecha
                    </th>
                    <th className="border p-2 text-left">
                      Km
                    </th>
                    <th className="border p-2 text-left">
                      Falla
                    </th>
                    <th className="border p-2 text-left">
                      Estado
                    </th>
                    <th className="border p-2 text-left">
                      Solución
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {fallas.map(
                    (item) => (

                      <tr
                        key={item.id}
                        className="print-row"
                      >

                        <td className="border p-2">
                          {formatearFecha(
                            item.fecha
                          )}
                        </td>

                        <td className="border p-2">
                          {formatearNumero(
                            item.kilometraje
                          )}
                        </td>

                        <td className="border p-2">
                          {item.descripcion_falla || '-'}
                        </td>

                        <td className="border p-2">

                          <EstadoBadge
                            estado={
                              item.estado
                            }
                          />

                        </td>

                        <td className="border p-2">
                          {formatearFecha(
                            item.fecha_solucion
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </Seccion>

        {/* ==================================================
            PREOPERACIONALES
        ================================================== */}

        <Seccion
          titulo="No Conformidades de Preoperacionales"
          icono="fa-clipboard-check"
        >

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 print-avoid-break">

            <Dato
              label="Preoperacionales"
              valor={
                preoperacionales.total
              }
            />

            <Dato
              label="Conformes"
              valor={
                preoperacionales.conformes
              }
            />

            <Dato
              label="No conformes"
              valor={
                preoperacionales.no_conformes
              }
            />

            <Dato
              label="Pendientes"
              valor={
                preoperacionales.pendientes
              }
            />

          </div>

          <TablaVacia
            visible={
              preoperacionales
                .ultimas_no_conformidades
                ?.length ===
              0
            }
            texto="No se encontraron preoperacionales NO CONFORMES."
          />

          {preoperacionales
            .ultimas_no_conformidades
            ?.length >
            0 && (

            <div className="overflow-x-auto">

              <table className="min-w-full text-sm border">

                <thead style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>

                  <tr>
                    <th className="border p-2 text-left">
                      Fecha
                    </th>
                    <th className="border p-2">
                      Km
                    </th>
                    <th className="border p-2 text-left">
                      Bloques NO CONFORMES
                    </th>
                    <th className="border p-2 text-left">
                      Observación
                    </th>
                    <th className="border p-2 text-left">
                      Estado
                    </th>
                    <th className="border p-2 text-left">
                      Solución
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {preoperacionales
                    .ultimas_no_conformidades
                    .map(
                      (item) => (

                        <tr
                          key={item.id}
                          className="print-row"
                        >

                          <td className="border p-2">
                            {formatearFecha(
                              item.fecha
                            )}
                          </td>

                          <td className="border p-2 text-center">
                            {formatearNumero(
                              item.kilometraje
                            )}
                          </td>

                          <td className="border p-2">

                            <div className="flex flex-wrap gap-1">

                              {(item.bloques_no_conformes || []).map(
                                (
                                  bloque
                                ) => (

                                  <span
                                    key={bloque.campo}
                                    className="bg-red-100 border border-red-200 text-red-700 rounded px-2 py-1 text-xs"
                                  >
                                    {bloque.label}
                                  </span>

                                )
                              )}

                            </div>

                          </td>

                          <td className="border p-2">
                            {item.observaciones || '-'}
                          </td>

                          <td className="border p-2">

                            <EstadoBadge
                              estado={
                                item.estado_observacion ||
                                'PENDIENTE'
                              }
                            />

                          </td>

                          <td className="border p-2">
                            {item.fecha_solucion
                              ? formatearFecha(
                                  item.fecha_solucion
                                )
                              : '-'}
                          </td>

                        </tr>
                      )
                    )}

                </tbody>

              </table>

            </div>

          )}

        </Seccion>

        {/* ==================================================
            SINIESTROS
        ================================================== */}

        <Seccion
          titulo="Siniestros Viales"
          icono="fa-car-crash"
          evitarCorte
        >

          <div className="grid grid-cols-2 gap-3 mb-4">

            <Dato
              label="Siniestros mostrados"
              valor={
                resumenOperativo
                  ?.siniestros
                  ?.total_mostrados ||
                0
              }
            />

            <Dato
              label="En análisis / abiertos"
              valor={
                resumenOperativo
                  ?.siniestros
                  ?.abiertos ||
                0
              }
            />

          </div>

          <TablaVacia
            visible={
              siniestros.length ===
              0
            }
            texto="No existen siniestros asociados a este vehículo."
          />

          {siniestros.length >
            0 && (

            <div className="overflow-x-auto">

              <table className="min-w-full text-sm border">

                <thead style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>

                  <tr>
                    <th className="border p-2 text-left">
                      Fecha
                    </th>
                    <th className="border p-2 text-left">
                      Tipo
                    </th>
                    <th className="border p-2 text-left">
                      Conductor
                    </th>
                    <th className="border p-2 text-left">
                      Estado
                    </th>
                    <th className="border p-2">
                      Heridos
                    </th>
                    <th className="border p-2">
                      Fatalidades
                    </th>
                    <th className="border p-2 text-left">
                      Resumen
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {siniestros.map(
                    (item) => (

                      <tr
                        key={item.id}
                        className="print-row"
                      >

                        <td className="border p-2">
                          {formatearFecha(
                            item.fecha_siniestro
                          )}
                        </td>

                        <td className="border p-2">
                          {item.tipo_siniestro || '-'}
                        </td>

                        <td className="border p-2">
                          {item.nombre_conductor_implicado || '-'}
                        </td>

                        <td className="border p-2">

                          <EstadoBadge
                            estado={
                              item.estado_analisis
                            }
                          />

                        </td>

                        <td className="border p-2 text-center">
                          {Number(item.heridos_leves || 0) +
                            Number(item.heridos_graves || 0)}
                        </td>

                        <td className="border p-2 text-center">
                          {item.fatalidades || 0}
                        </td>

                        <td className="border p-2">
                          {item.resumen || '-'}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </Seccion>

        {/* ==================================================
            VINCULACIONES HISTÓRICAS
        ================================================== */}

        <Seccion
          titulo="Historial de Vinculaciones"
          icono="fa-history"
        >

          <div className="overflow-x-auto">

            <table className="min-w-full text-sm border">

              <thead style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>

                <tr>
                  <th className="border p-2">
                    N.º
                  </th>
                  <th className="border p-2 text-left">
                    Vinculación
                  </th>
                  <th className="border p-2 text-left">
                    Desvinculación
                  </th>
                  <th className="border p-2">
                    Estado
                  </th>
                  <th className="border p-2 text-left">
                    Motivo vinculación
                  </th>
                  <th className="border p-2 text-left">
                    Motivo desvinculación
                  </th>
                </tr>

              </thead>

              <tbody>

                {vinculaciones.map(
                  (
                    item,
                    index
                  ) => (

                    <tr
                      key={item.id}
                      className="print-row"
                    >

                      <td className="border p-2 text-center">
                        {vinculaciones.length - index}
                      </td>

                      <td className="border p-2">
                        {formatearFecha(
                          item.fecha_vinculacion
                        )}
                      </td>

                      <td className="border p-2">
                        {formatearFecha(
                          item.fecha_desvinculacion
                        )}
                      </td>

                      <td className="border p-2">
                        <EstadoBadge
                          estado={item.estado}
                        />
                      </td>

                      <td className="border p-2">
                        {item.motivo_vinculacion || '-'}
                      </td>

                      <td className="border p-2">
                        {item.motivo_desvinculacion || '-'}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </Seccion>

        {/* ==================================================
            HISTORIAL DOCUMENTAL
        ================================================== */}

        <Seccion
          titulo="Historial Documental"
          icono="fa-folder-open"
        >

          <div className="flex justify-end mb-4 print:hidden">

            <select
              value={filtroDocumento}
              onChange={(e) =>
                setFiltroDocumento(
                  e.target.value
                )
              }
              className="border rounded-lg p-2 text-sm"
            >
              <option value="TODOS">
                Todos
              </option>
              <option value={DOCUMENTO_SOAT}>
                SOAT
              </option>
              <option value={DOCUMENTO_RTM}>
                RTM
              </option>
              <option value={DOCUMENTO_TARJETA_SERVICIO}>
                Tarjeta de Servicio
              </option>
            </select>

          </div>

          <div className="overflow-x-auto">

            <table className="min-w-full text-sm border">

              <thead style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>

                <tr>
                  <th className="border p-2 text-left">
                    Documento
                  </th>
                  <th className="border p-2 text-left">
                    Número
                  </th>
                  <th className="border p-2 text-left">
                    Expedición
                  </th>
                  <th className="border p-2 text-left">
                    Vigencia
                  </th>
                  <th className="border p-2">
                    Estado
                  </th>
                  <th className="border p-2 text-left">
                    Responsable
                  </th>
                </tr>

              </thead>

              <tbody>

                {historialFiltrado.map(
                  (item) => (

                    <tr
                      key={item.id}
                      className="print-row"
                    >

                      <td className="border p-2">
                        {etiquetaDocumento(
                          item.documento
                        )}
                      </td>

                      <td className="border p-2">
                        {item.numero_documento || '-'}
                      </td>

                      <td className="border p-2">
                        {formatearFecha(
                          item.fecha_expedicion
                        )}
                      </td>

                      <td className="border p-2">
                        {formatearFecha(
                          item.fecha_vigencia
                        )}
                      </td>

                      <td className="border p-2">
                        <BadgeVigencia
                          fecha={
                            item.fecha_vigencia
                          }
                        />
                      </td>

                      <td className="border p-2">
                        {item.nombre_quien_actualiza || '-'}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </Seccion>

        {/* ==================================================
            REGISTRO
        ================================================== */}

        <Seccion
          titulo="Información del Registro"
          icono="fa-database"
          evitarCorte
        >

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            <Dato
              label="ID"
              valor={
                vehiculo.id
              }
            />

            <Dato
              label="Creado"
              valor={
                formatearFechaHora(
                  vehiculo.created_at
                )
              }
            />

            <Dato
              label="Última actualización"
              valor={
                formatearFechaHora(
                  vehiculo.updated_at
                )
              }
            />

          </div>

        </Seccion>

        
            </td>
          </tr>
        </tbody>
      </table>

      </div>

      {/* ======================================================
          ESTILOS DE IMPRESIÓN
      ====================================================== */}

      <style jsx global>{`
        .contenido-hoja-vida-print section table th,
        .contenido-hoja-vida-print section table td {
          border-color: ${ESTILO_CELDAS_TABLA.borde} !important;
        }

        @media print {

          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .estructura-hoja-vida-print {
            width: calc(100% - 20mm) !important;
            margin: 0 10mm 12mm 10mm !important;
            border-collapse: collapse !important;
            box-sizing: border-box !important;
          }

          .estructura-hoja-vida-print > thead {
            display: table-header-group !important;
          }

          .estructura-hoja-vida-print > tbody {
            display: table-row-group !important;
          }

          .estructura-hoja-vida-print > thead > tr > td,
          .estructura-hoja-vida-print > tbody > tr > td {
            border: 0 !important;
            padding: 0 !important;
          }

          .encabezado-documental-repetido {
            display: table-header-group !important;
          }

          .encabezado-documental-hoja-vida {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .margen-superior-documento {
            display: block !important;
            height: 10mm !important;
            width: 100% !important;
          }

          .separador-encabezado-documento {
            display: block !important;
            height: 4mm !important;
            width: 100% !important;
          }

          .contenido-hoja-vida-print {
            vertical-align: top !important;
          }

          .cabecera-datos-vehiculo {
            border-radius: 10px !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .cabecera-datos-vehiculo > div > div {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* ==========================================
             CONTENEDOR GENERAL
          ========================================== */

          .contenedor-hoja-vida {
            max-width: none !important;
            width: 100% !important;
          }

          /* ==========================================
             ENCABEZADO HOJA DE VIDA
          ========================================== */

          .encabezado-hoja-vida {
            display: grid !important;
            grid-template-columns: 1.15fr 1.45fr 0.8fr !important;
            gap: 8px !important;
            align-items: start !important;
            width: 100% !important;
            padding: 8px !important;
          }

          .encabezado-hoja-vida > div {
            min-width: 0 !important;
          }

          /* ==========================================
             RESUMEN DERECHO
          ========================================== */

          .resumen-hoja-vida {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 4px !important;

            align-content: center !important;
            align-self: center !important;

            margin-top: 12px !important;
          }

            .resumen-hoja-vida > div {
              padding: 5px !important;
              min-height: 0 !important;
            }

            .resumen-hoja-vida > div > div {
              gap: 5px !important;
            }

            .resumen-hoja-vida .w-9 {
              width: 24px !important;
              height: 24px !important;
            }

            .resumen-hoja-vida .text-lg {
              font-size: 12px !important;
              line-height: 1.15 !important;
            }

            .resumen-hoja-vida .text-xs {
              font-size: 7.5px !important;
              line-height: 1.1 !important;
            }

          /* ==========================================
             FOTOGRAFÍAS
          ========================================== */

          .encabezado-hoja-vida img {
            width: 100% !important;
            max-width: 100% !important;
            max-height: 120px !important;
            object-fit: cover !important;
          }
          /* ==========================================
             EVITAR CORTES
          ========================================== */

          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* ==========================================
             SECCIONES
          ========================================== */

          section {
            margin-top: 4mm !important;
            break-inside: auto;
            page-break-inside: auto;
          }

          section.print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          section > div:first-child {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          /* ==========================================
             TABLAS
          ========================================== */

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }

          thead {
            display: table-header-group !important;
          }

          tfoot {
            display: table-footer-group !important;
          }

          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }

          th,
          td {
            font-size: 9px !important;
            padding: 4px !important;
          }

          /* ==========================================
             TIPOGRAFÍA
          ========================================== */

          h1 {
            font-size: 26px !important;
            line-height: 1 !important;
          }

          h2 {
            font-size: 13px !important;
          }

          p {
            orphans: 3;
            widows: 3;
          }

          /* ==========================================
             SOMBRAS
          ========================================== */

          .shadow-lg,
          .shadow-sm,
          .shadow-md {
            box-shadow: none !important;
          }
        }
      `}</style>


      {/* ======================================================
          MODAL DOCUMENTO
      ====================================================== */}

      {modalDocumento && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">

          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">

            <div className="p-5 border-b">

              <h3 className="text-lg font-bold text-[var(--primary)]">
                Registrar nueva versión - {etiquetaDocumento(
                  modalDocumento.tipo
                )}
              </h3>

            </div>

            <div className="p-5 overflow-y-auto space-y-4">

              <CampoModal
                label="Número del documento *"
              >
                <input
                  type="text"
                  value={
                    formDocumento
                      .numero_documento
                  }
                  onChange={(e) =>
                    setFormDocumento(
                      (prev) => ({
                        ...prev,
                        numero_documento:
                          e.target.value.toUpperCase(),
                      })
                    )
                  }
                  className="w-full border rounded-lg p-2 text-sm"
                />
              </CampoModal>

              <CampoModal
                label="Fecha de expedición *"
              >
                <input
                  type="date"
                  value={
                    formDocumento
                      .fecha_expedicion
                  }
                  onChange={(e) =>
                    setFormDocumento(
                      (prev) => ({
                        ...prev,
                        fecha_expedicion:
                          e.target.value,
                      })
                    )
                  }
                  className="w-full border rounded-lg p-2 text-sm"
                />
              </CampoModal>

              <CampoModal
                label="Fecha de vigencia *"
              >
                <input
                  type="date"
                  value={
                    formDocumento
                      .fecha_vigencia
                  }
                  onChange={(e) =>
                    setFormDocumento(
                      (prev) => ({
                        ...prev,
                        fecha_vigencia:
                          e.target.value,
                      })
                    )
                  }
                  className="w-full border rounded-lg p-2 text-sm"
                />
              </CampoModal>

            </div>

            <div className="border-t p-4 flex justify-end gap-3">

              <button
                onClick={() =>
                  setModalDocumento(null)
                }
                className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>

              <button
                onClick={
                  guardarDocumento
                }
                disabled={
                  guardandoDocumento
                }
                className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm"
              >
                {guardandoDocumento
                  ? 'Guardando...'
                  : 'Registrar Nueva Versión'}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}

// ============================================================
// COMPONENTES
// ============================================================

function BloqueDatosCabecera({
  titulo,
  children,
}) {
  return (
    <div>
      <div className="mb-1 border-b border-gray-300 pb-1 text-[10px] font-black uppercase tracking-wide text-gray-600">
        {titulo}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-x-3 gap-y-1">
        {children}
      </div>
    </div>
  )
}

function DatoCompacto({
  label,
  valor,
}) {
  return (
    <div className="min-w-0 text-[10px] leading-tight">
      <span className="font-semibold text-gray-500">
        {label}:{' '}
      </span>
      <span className="font-semibold text-gray-800 break-words">
        {valor || '-'}
      </span>
    </div>
  )
}

function Seccion({
  titulo,
  icono,
  children,
  evitarCorte = false,
}) {
  return (
    <section
      className={`mt-4 bg-white rounded-xl shadow-lg border overflow-hidden print:shadow-none ${
        evitarCorte
          ? 'print-avoid-break'
          : ''
      }`}
    >

      <div
        className="px-4 py-2.5 font-semibold flex items-center gap-2"
        style={{
          backgroundColor: ESTILO_SECCIONES.fondo,
          color: ESTILO_SECCIONES.texto,
          borderColor: ESTILO_SECCIONES.borde,
        }}
      >
        <i className={`fas ${icono}`}></i>
        {titulo}
      </div>

      <div className="p-4">
        {children}
      </div>

    </section>
  )
}

function Dato({
  label,
  valor,
}) {
  return (
    <div className="border rounded-lg p-2.5 bg-gray-50">

      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="font-semibold text-sm mt-1 break-words">
        {valor === null ||
        valor === undefined ||
        valor === ''
          ? '-'
          : valor}
      </p>

    </div>
  )
}

function Resumen({
  titulo,
  valor,
  icono,
}) {
  return (
    <div className="bg-white border rounded-xl p-3 shadow-sm print-avoid-break">

      <div className="flex items-center gap-3">

        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
          <i className={`fas ${icono} text-[var(--primary)]`}></i>
        </div>

        <div>
          <p className="text-xs text-gray-500">
            {titulo}
          </p>
          <p className="text-lg font-bold">
            {valor ?? '-'}
          </p>
        </div>

      </div>

    </div>
  )
}

function FotoVehiculo({
  titulo,
  url,
  path,
  inputRef,
  cargando,
  onArchivo,
}) {
  return (
    <div>
      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="aspect-[4/3] min-h-[165px] print:min-h-0 print:h-[38mm] flex items-center justify-center bg-gray-100 overflow-hidden">

          {url ? (

            <img
              src={url}
              alt={titulo || 'Fotografía del vehículo'}
              className="w-full h-full object-contain"
            />

          ) : (

            <div className="text-center text-gray-400">

              <i className="fas fa-camera text-3xl mb-2"></i>

              <p className="text-sm font-semibold">
                Sin fotografía
              </p>

              <p className="text-xs">
                {path
                  ? 'Imagen registrada'
                  : 'No se ha cargado.'}
              </p>

            </div>

          )}

        </div>
      </div>

      <div className="pt-2 print:hidden">

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) =>
            onArchivo(
              e.target.files?.[0] ||
              null
            )
          }
        />

        <BotonAccion
          tipo="editarVehiculo"
          type="button"
          disabled={cargando}
          onClick={() =>
            inputRef.current?.click()
          }
          className="w-full"
        >
          {cargando
            ? 'Cargando...'
            : url
            ? 'Reemplazar fotografía'
            : 'Cargar fotografía'}
        </BotonAccion>

      </div>

    </div>
  )
}

function DocumentoActual({
  titulo,
  documento,
  onRegistrar,
}) {
  const vencido =
    documento &&
    obtenerEstadoVigencia(
      documento.fecha_vigencia
    ) ===
      'VENCIDO'

  return (
    <div
      className={`border rounded-xl p-4 ${
        !documento
          ? 'bg-gray-50 border-gray-300'
          : vencido
          ? 'bg-red-50 border-red-300'
          : 'bg-green-50 border-green-300'
      }`}
    >

      <div className="flex justify-between gap-2">

        <h3 className="font-bold text-sm">
          {titulo}
        </h3>

        {documento ? (
          <BadgeVigencia
            fecha={
              documento.fecha_vigencia
            }
          />
        ) : (
          <span className="text-xs bg-gray-200 rounded-full px-2 py-1">
            SIN REGISTRO
          </span>
        )}

      </div>

      {documento ? (

        <div className="mt-3 text-sm space-y-1">

          <p>
            <strong>Número:</strong>{' '}
            {documento.numero_documento || '-'}
          </p>

          <p>
            <strong>Expedición:</strong>{' '}
            {formatearFecha(
              documento.fecha_expedicion
            )}
          </p>

          <p>
            <strong>Vigencia:</strong>{' '}
            {formatearFecha(
              documento.fecha_vigencia
            )}
          </p>

        </div>

      ) : (

        <p className="text-sm text-gray-500 mt-3">
          No existe información registrada.
        </p>

      )}

      <button
        type="button"
        onClick={onRegistrar}
        className="mt-4 bg-[var(--primary)] text-white px-3 py-2 rounded-lg text-xs print:hidden"
      >
        {documento
          ? 'Registrar nueva versión'
          : 'Registrar'}
      </button>

    </div>
  )
}

function EstadoBadge({
  estado,
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${claseEstadoSimple(
        estado
      )}`}
    >
      {estado || '-'}
    </span>
  )
}

function TablaVacia({
  visible,
  texto,
}) {
  if (!visible) return null

  return (
    <div className="border bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
      <i className="fas fa-info-circle mr-2"></i>
      {texto}
    </div>
  )
}

function CampoModal({
  label,
  children,
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}