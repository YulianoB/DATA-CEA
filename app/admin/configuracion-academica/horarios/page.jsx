// app/admin/configuracion-academica/horarios/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import { CalendarDays } from 'lucide-react'

// =========================================================
// CONSTANTES
// =========================================================

const DIAS_SEMANA = [
  {
    dia_semana: 1,
    nombre: 'LUNES',
  },
  {
    dia_semana: 2,
    nombre: 'MARTES',
  },
  {
    dia_semana: 3,
    nombre: 'MIÉRCOLES',
  },
  {
    dia_semana: 4,
    nombre: 'JUEVES',
  },
  {
    dia_semana: 5,
    nombre: 'VIERNES',
  },
  {
    dia_semana: 6,
    nombre: 'SÁBADO',
  },
  {
    dia_semana: 7,
    nombre: 'DOMINGO',
  },
]

const DURACIONES_VISUALES = [
  {
    valor: 30,
    etiqueta: '30 minutos',
  },
  {
    valor: 60,
    etiqueta: '1 hora',
  },
  {
    valor: 90,
    etiqueta: '1 hora 30 minutos',
  },
  {
    valor: 120,
    etiqueta: '2 horas',
  },
]

// =========================================================
// COLORES DE LA CUADRÍCULA
// =========================================================

// Colores predeterminados.
// Se utilizan solamente si el CEA todavía
// no tiene colores guardados.

const COLOR_ENCABEZADO_HORA_PREDETERMINADO =
  '#344E66'

const COLOR_COLUMNA_HORA_PREDETERMINADO =
  '#297AB4'

const COLOR_ENCABEZADO_DIA_PREDETERMINADO =
  '#AFD6F4'

const COLOR_HORA_BORDE =
  '#0B2D4D'

const COLOR_ENCABEZADO_DIA_BORDE =
  '#7395B5'

// Paleta institucional disponible para
// personalizar el horario teórico.

const PALETA_HORARIO = [
  '#0F172A',
  '#1E293B',
  '#334155',
  '#475569',
  '#64748B',

  '#0B2D4D',
  '#123B63',
  '#1F5A85',
  '#297AB4',
  '#3B82F6',
  '#60A5FA',
  '#93C5FD',
  '#BFDBFE',
  '#DBEAFE',

  '#164E63',
  '#155E75',
  '#0E7490',
  '#0891B2',
  '#06B6D4',
  '#67E8F9',
  '#CFFAFE',

  '#064E3B',
  '#065F46',
  '#047857',
  '#059669',
  '#10B981',
  '#6EE7B7',
  '#D1FAE5',

  '#14532D',
  '#166534',
  '#15803D',
  '#16A34A',
  '#22C55E',
  '#86EFAC',
  '#DCFCE7',

  '#713F12',
  '#854D0E',
  '#A16207',
  '#CA8A04',
  '#EAB308',
  '#FDE047',
  '#FEF9C3',

  '#7C2D12',
  '#9A3412',
  '#C2410C',
  '#EA580C',
  '#F97316',
  '#FDBA74',
  '#FFEDD5',

  '#7F1D1D',
  '#991B1B',
  '#B91C1C',
  '#DC2626',
  '#EF4444',
  '#FCA5A5',
  '#FEE2E2',

  '#581C87',
  '#6B21A8',
  '#7E22CE',
  '#9333EA',
  '#A855F7',
  '#D8B4FE',
  '#F3E8FF',

  '#831843',
  '#9D174D',
  '#BE185D',
  '#DB2777',
  '#EC4899',
  '#F9A8D4',
  '#FCE7F3',

  '#FFFFFF',
  '#F8FAFC',
  '#F1F5F9',
  '#E2E8F0',
  '#CBD5E1',
]

// =========================================================
// UTILIDADES GENERALES
// =========================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}

function mayusculas(
  valor
) {
  return texto(
    valor
  ).toUpperCase()
}

function numero(
  valor
) {
  const resultado =
    Number(
      valor
    )

  return Number.isFinite(
    resultado
  )
    ? resultado
    : 0
}

function obtenerNitUsuario(
  user
) {
  return texto(
    user?.nit ||
      user?.nitEmpresa ||
      user?.nit_empresa ||
      user?.empresaNit ||
      user?.empresa_nit ||
      ''
  )
}

function obtenerNombreUsuario(
  user
) {
  return texto(
    user?.nombreCompleto ||
      user?.nombre_completo ||
      user?.nombre ||
      user?.name ||
      user?.usuario ||
      user?.email ||
      ''
  )
}

// =========================================================
// FECHAS
// =========================================================

function fechaISO(
  fecha
) {
  const anio =
    fecha.getFullYear()

  const mes =
    String(
      fecha.getMonth() + 1
    ).padStart(
      2,
      '0'
    )

  const dia =
    String(
      fecha.getDate()
    ).padStart(
      2,
      '0'
    )

  return `${anio}-${mes}-${dia}`
}

function lunesDeFecha(
  valor
) {
  const fecha =
    valor
      ? new Date(
          `${valor}T12:00:00`
        )
      : new Date()

  const dia =
    fecha.getDay()

  const diferencia =
    dia === 0
      ? -6
      : 1 - dia

  fecha.setDate(
    fecha.getDate() +
      diferencia
  )

  return fechaISO(
    fecha
  )
}

function sumarDias(
  valor,
  cantidad
) {
  const fecha =
    new Date(
      `${valor}T12:00:00`
    )

  fecha.setDate(
    fecha.getDate() +
      cantidad
  )

  return fechaISO(
    fecha
  )
}

function formatearFecha(
  valor
) {
  if (!valor) {
    return ''
  }

  const fecha =
    new Date(
      `${valor}T12:00:00`
    )

  return fecha.toLocaleDateString(
    'es-CO',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  )
}

function formatearFechaDia(
  valor
) {
  if (!valor) {
    return ''
  }

  const fecha =
    new Date(
      `${valor}T12:00:00`
    )

  const dia =
    String(
      fecha.getDate()
    ).padStart(
      2,
      '0'
    )

  const mes =
    fecha.toLocaleDateString(
      'es-CO',
      {
        month:
          'long',
      }
    )

  return `${dia} de ${mes}`
}

function fechaCorrespondienteDia(
  semanaInicio,
  diaSemana
) {
  return sumarDias(
    semanaInicio,
    Number(
      diaSemana
    ) - 1
  )
}

// =========================================================
// HORAS
// =========================================================

function normalizarHora(
  valor
) {
  return texto(
    valor
  ).slice(
    0,
    5
  )
}

function horaAMinutos(
  valor
) {
  const hora =
    normalizarHora(
      valor
    )

  if (
    !/^\d{2}:\d{2}$/.test(
      hora
    )
  ) {
    return null
  }

  const [
    horas,
    minutos,
  ] =
    hora
      .split(':')
      .map(
        Number
      )

  return (
    horas * 60 +
    minutos
  )
}

function minutosAHora(
  valor
) {
  const total =
    Number(
      valor
    )

  if (
    !Number.isFinite(
      total
    )
  ) {
    return ''
  }

  const horas =
    Math.floor(
      total / 60
    )

  const minutos =
    total % 60

  return `${String(
    horas
  ).padStart(
    2,
    '0'
  )}:${String(
    minutos
  ).padStart(
    2,
    '0'
  )}`
}

function formatearHora12(
  valor
) {
  const hora =
    normalizarHora(
      valor
    )

  if (!hora) {
    return ''
  }

  const [
    horas,
    minutos,
  ] =
    hora
      .split(':')
      .map(
        Number
      )

  const periodo =
    horas >= 12
      ? 'p. m.'
      : 'a. m.'

  let horas12 =
    horas % 12

  if (
    horas12 === 0
  ) {
    horas12 = 12
  }

  return `${horas12}:${String(
    minutos
  ).padStart(
    2,
    '0'
  )} ${periodo}`
}

function formatearHora12Compacta(
  valor
) {
  const hora =
    normalizarHora(
      valor
    )

  if (!hora) {
    return ''
  }

  const [
    horas,
    minutos,
  ] =
    hora
      .split(':')
      .map(
        Number
      )

  const periodo =
    horas >= 12
      ? 'pm'
      : 'am'

  let horas12 =
    horas % 12

  if (
    horas12 === 0
  ) {
    horas12 = 12
  }

  return `${horas12}:${String(
    minutos
  ).padStart(
    2,
    '0'
  )} ${periodo}`
}

function etiquetaFranja(
  franja
) {
  if (!franja) {
    return ''
  }

  return `${formatearHora12(
    franja.hora_inicio
  )} - ${formatearHora12(
    franja.hora_fin
  )}`
}

function claveCelda(
  diaSemana,
  horaInicio
) {
  return `${Number(
    diaSemana
  )}-${normalizarHora(
    horaInicio
  )}`
}

// =========================================================
// COLORES
// =========================================================

function obtenerContraste(
  color
) {
  const valor =
    texto(
      color
    ).replace(
      '#',
      ''
    )

  if (
    !/^[0-9A-Fa-f]{6}$/.test(
      valor
    )
  ) {
    return '#0F172A'
  }

  const rojo =
    parseInt(
      valor.slice(
        0,
        2
      ),
      16
    )

  const verde =
    parseInt(
      valor.slice(
        2,
        4
      ),
      16
    )

  const azul =
    parseInt(
      valor.slice(
        4,
        6
      ),
      16
    )

  const luminosidad =
    (
      rojo * 299 +
      verde * 587 +
      azul * 114
    ) / 1000

  return luminosidad >= 155
    ? '#0F172A'
    : '#FFFFFF'
}

function colorDetalle(
  detalle
) {
  const tipo =
    mayusculas(
      detalle?.tipo_elemento
    )

  if (
    tipo ===
    'RECESO'
  ) {
    return '#F59E0B'
  }

  if (
    tipo ===
    'FESTIVO'
  ) {
    return '#DC2626'
  }

  return (
    detalle?.color_horario ||
    '#E2E8F0'
  )
}

// =========================================================
// LOGO
// =========================================================

function extraerUrl(
  valor
) {
  if (
    typeof valor !==
    'string'
  ) {
    return ''
  }

  const resultado =
    texto(
      valor
    )

  if (
    resultado.startsWith(
      'http://'
    ) ||
    resultado.startsWith(
      'https://'
    ) ||
    resultado.startsWith(
      'blob:'
    ) ||
    resultado.startsWith(
      'data:'
    )
  ) {
    return resultado
  }

  return ''
}

function obtenerLogoRespuesta(
  data
) {
  function buscarUrl(
    valor,
    profundidad = 0
  ) {
    if (
      profundidad >
      8
    ) {
      return ''
    }

    if (
      typeof valor ===
      'string'
    ) {
      const cadena =
        texto(
          valor
        )

      if (
        cadena.startsWith(
          'https://'
        ) ||
        cadena.startsWith(
          'http://'
        ) ||
        cadena.startsWith(
          'blob:'
        ) ||
        cadena.startsWith(
          'data:image/'
        )
      ) {
        return cadena
      }

      return ''
    }

    if (
      Array.isArray(
        valor
      )
    ) {
      for (
        const item
        of valor
      ) {
        const encontrado =
          buscarUrl(
            item,
            profundidad + 1
          )

        if (encontrado) {
          return encontrado
        }
      }

      return ''
    }

    if (
      !valor ||
      typeof valor !==
        'object'
    ) {
      return ''
    }

    // Primero buscamos campos que claramente
    // corresponden al logo actual.

    const clavesPreferidas = [
      'logo_actual_url',
      'logoActualUrl',
      'url_actual',
      'actual_url',
      'signed_url',
      'signedUrl',
      'url',
    ]

    for (
      const clave
      of clavesPreferidas
    ) {
      if (
        Object.prototype
          .hasOwnProperty
          .call(
            valor,
            clave
          )
      ) {
        const encontrado =
          buscarUrl(
            valor[
              clave
            ],
            profundidad + 1
          )

        if (encontrado) {
          return encontrado
        }
      }
    }

    // Si el API cambia la estructura,
    // recorremos el resto de la respuesta.

    for (
      const [
        clave,
        contenido,
      ]
      of Object.entries(
        valor
      )
    ) {
      const claveNormalizada =
        mayusculas(
          clave
        )

      if (
        claveNormalizada.includes(
          'ANTERIOR'
        ) ||
        claveNormalizada.includes(
          'PREVIOUS'
        )
      ) {
        continue
      }

      const encontrado =
        buscarUrl(
          contenido,
          profundidad + 1
        )

      if (encontrado) {
        return encontrado
      }
    }

    return ''
  }

  return buscarUrl(
    data
  )
}

// =========================================================
// FRANJAS LOCALES
// =========================================================

function generarFranjasDia(
  configuracion,
  diaSemana
) {
  const dias =
    configuracion?.dias ||
    []

  const dia =
    dias.find(
      (item) =>
        Number(
          item?.dia_semana
        ) ===
        Number(
          diaSemana
        )
    )

  if (
    !dia ||
    !dia.activo
  ) {
    return []
  }

  const inicio =
    horaAMinutos(
      dia.hora_inicio
    )

  const fin =
    horaAMinutos(
      dia.hora_fin
    )

  if (
    inicio === null ||
    fin === null ||
    fin <= inicio
  ) {
    return []
  }

  const duracionVisual =
    numero(
      configuracion
        ?.general
        ?.duracion_visual_minutos
    ) || 120

  const resultado = []

  for (
    let actual =
      inicio;

    actual < fin;

    actual += 120
  ) {
    const finVisual =
      Math.min(
        actual +
          duracionVisual,
        fin
      )

    resultado.push({
      dia_semana:
        Number(
          diaSemana
        ),

      minutos_inicio:
        actual,

      hora_inicio:
        minutosAHora(
          actual
        ),

      hora_fin:
        minutosAHora(
          finVisual
        ),
    })
  }

  return resultado
}

function construirEstructuraHorario(
  configuracion
) {
  const porDia = {}

  for (
    const dia
    of DIAS_SEMANA
  ) {
    porDia[
      dia.dia_semana
    ] =
      generarFranjasDia(
        configuracion,
        dia.dia_semana
      )
  }

  const diasLaborales =
    DIAS_SEMANA.filter(
      (dia) =>
        dia.dia_semana <= 5 &&
        porDia[
          dia.dia_semana
        ].length >
          0
    )

  const horasLaborales =
    new Set()

  for (
    const dia
    of diasLaborales
  ) {
    for (
      const franja
      of porDia[
        dia.dia_semana
      ]
    ) {
      horasLaborales.add(
        franja
          .minutos_inicio
      )
    }
  }

  const filasLaborales =
    Array.from(
      horasLaborales
    )
      .sort(
        (a, b) =>
          a - b
      )
      .map(
        (
          minutosInicio
        ) => {
          const celdas = {}

          for (
            const dia
            of diasLaborales
          ) {
            celdas[
              dia.dia_semana
            ] =
              porDia[
                dia.dia_semana
              ].find(
                (item) =>
                  item.minutos_inicio ===
                  minutosInicio
              ) ||
              null
          }

          return {
            minutos_inicio:
              minutosInicio,

            hora_inicio:
              minutosAHora(
                minutosInicio
              ),

            celdas,
          }
        }
      )

  return {
    porDia,

    diasLaborales,

    filasLaborales,

    sabado:
      porDia[6] ||
      [],

    domingo:
      porDia[7] ||
      [],
  }
}

// =========================================================
// DESCARGAS
// =========================================================

function descargarBlob(
  blob,
  nombre
) {
  const url =
    URL.createObjectURL(
      blob
    )

  const enlace =
    document.createElement(
      'a'
    )

  enlace.href =
    url

  enlace.download =
    nombre

  document.body.appendChild(
    enlace
  )

  enlace.click()

  enlace.remove()

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        url
      )
    },
    1000
  )
}

function base64ABytes(
  base64
) {
  const binario =
    atob(
      base64
    )

  const bytes =
    new Uint8Array(
      binario.length
    )

  for (
    let i = 0;
    i <
    binario.length;
    i += 1
  ) {
    bytes[i] =
      binario.charCodeAt(
        i
      )
  }

  return bytes
}

function concatenarBytes(
  partes
) {
  const longitud =
    partes.reduce(
      (
        total,
        parte
      ) =>
        total +
        parte.length,
      0
    )

  const resultado =
    new Uint8Array(
      longitud
    )

  let posicion = 0

  for (
    const parte
    of partes
  ) {
    resultado.set(
      parte,
      posicion
    )

    posicion +=
      parte.length
  }

  return resultado
}

function bytesTexto(
  valor
) {
  return new TextEncoder()
    .encode(
      valor
    )
}

function descargarCanvasPDF(
  canvas,
  nombreArchivo
) {
  const dataUrl =
    canvas.toDataURL(
      'image/jpeg',
      0.94
    )

  const base64 =
    dataUrl.split(
      ','
    )[1]

  const imagen =
    base64ABytes(
      base64
    )

  // Carta horizontal:
  // 11 x 8.5 pulgadas = 792 x 612 puntos.

  const paginaAncho =
    792

  const paginaAlto =
    612

  const margen =
    10

  const escala =
    Math.min(
      (
        paginaAncho -
        margen * 2
      ) /
        canvas.width,

      (
        paginaAlto -
        margen * 2
      ) /
        canvas.height
    )

  const ancho =
    canvas.width *
    escala

  const alto =
    canvas.height *
    escala

  const x =
    (
      paginaAncho -
      ancho
    ) / 2

  const y =
    (
      paginaAlto -
      alto
    ) / 2

  const contenido =
    [
      'q',
      `${ancho.toFixed(
        2
      )} 0 0 ${alto.toFixed(
        2
      )} ${x.toFixed(
        2
      )} ${y.toFixed(
        2
      )} cm`,
      '/Im0 Do',
      'Q',
    ].join(
      '\n'
    )

  const contenidoBytes =
    bytesTexto(
      contenido
    )

  const objetos = {
    1:
      bytesTexto(
        '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
      ),

    2:
      bytesTexto(
        '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'
      ),

    3:
      bytesTexto(
        `3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 ${paginaAncho} ${paginaAlto}]
/Resources <<
  /XObject <<
    /Im0 4 0 R
  >>
>>
/Contents 5 0 R
>>
endobj
`
      ),

    4:
      concatenarBytes([
        bytesTexto(
          `4 0 obj
<<
/Type /XObject
/Subtype /Image
/Width ${canvas.width}
/Height ${canvas.height}
/ColorSpace /DeviceRGB
/BitsPerComponent 8
/Filter /DCTDecode
/Length ${imagen.length}
>>
stream
`
        ),

        imagen,

        bytesTexto(
          '\nendstream\nendobj\n'
        ),
      ]),

    5:
      concatenarBytes([
        bytesTexto(
          `5 0 obj
<< /Length ${contenidoBytes.length} >>
stream
`
        ),

        contenidoBytes,

        bytesTexto(
          '\nendstream\nendobj\n'
        ),
      ]),
  }

  const cabecera =
    bytesTexto(
      '%PDF-1.4\n'
    )

  const partes = [
    cabecera,
  ]

  const posiciones = [
    0,
  ]

  let posicion =
    cabecera.length

  for (
    let i = 1;
    i <= 5;
    i += 1
  ) {
    posiciones[i] =
      posicion

    partes.push(
      objetos[i]
    )

    posicion +=
      objetos[i].length
  }

  const posicionXref =
    posicion

  let xref =
    'xref\n0 6\n'

  xref +=
    '0000000000 65535 f \n'

  for (
    let i = 1;
    i <= 5;
    i += 1
  ) {
    xref +=
      `${String(
        posiciones[i]
      ).padStart(
        10,
        '0'
      )} 00000 n \n`
  }

  xref +=
    `trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${posicionXref}
%%EOF`

  partes.push(
    bytesTexto(
      xref
    )
  )

  const pdf =
    concatenarBytes(
      partes
    )

  descargarBlob(
    new Blob(
      [
        pdf,
      ],
      {
        type:
          'application/pdf',
      }
    ),
    nombreArchivo
  )
}

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================

export default function HorariosTeoricosPage() {
  const router =
    useRouter()

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState(
      null
    )

  const [
    cargandoSesion,
    setCargandoSesion,
  ] =
    useState(
      true
    )

  const [
    cargando,
    setCargando,
  ] =
    useState(
      false
    )

  const [
    guardando,
    setGuardando,
  ] =
    useState(
      false
    )

  const [
    exportando,
    setExportando,
  ] =
    useState(
      false
    )

  const [
    error,
    setError,
  ] =
    useState(
      ''
    )

  const [
    mensaje,
    setMensaje,
  ] =
    useState(
      ''
    )

  const [
    empresa,
    setEmpresa,
  ] =
    useState(
      null
    )

  const [
    logoUrl,
    setLogoUrl,
  ] =
    useState(
      ''
    )

  const [
    semanaInicio,
    setSemanaInicio,
  ] =
    useState(
      () =>
        lunesDeFecha()
    )

  const [
    titulo,
    setTitulo,
  ] =
    useState(
      ''
    )

  const [
    horario,
    setHorario,
  ] =
    useState(
      null
    )

  const [
    detalles,
    setDetalles,
  ] =
    useState(
      {}
    )

  const [
    configuracion,
    setConfiguracion,
  ] =
    useState(
      null
    )

  const [
    configuracionEdicion,
    setConfiguracionEdicion,
  ] =
    useState(
      null
    )

  const [
    catalogos,
    setCatalogos,
  ] =
    useState({
      clases: [],
      grupos: [],
      elementos: [],
      categorias_habilitadas: [],
    })

  const [
    modalConfiguracion,
    setModalConfiguracion,
  ] =
    useState(
      false
    )

  const [
    modalProgramacion,
    setModalProgramacion,
  ] =
    useState(
      false
    )

  const [
    modalVistaPrevia,
    setModalVistaPrevia,
  ] =
    useState(
      false
    )

  const [
    celdaActiva,
    setCeldaActiva,
  ] =
    useState(
      null
    )

  const [
    busquedaElemento,
    setBusquedaElemento,
  ] =
    useState(
      ''
    )

  // =======================================================
  // DATOS CALCULADOS
  // =======================================================


  const colorEncabezadoHora =
  texto(
    configuracion
      ?.general
      ?.color_encabezado_hora
  ) ||
  COLOR_ENCABEZADO_HORA_PREDETERMINADO

const colorColumnaHora =
  texto(
    configuracion
      ?.general
      ?.color_columna_hora
  ) ||
  COLOR_COLUMNA_HORA_PREDETERMINADO

const colorEncabezadoDia =
  texto(
    configuracion
      ?.general
      ?.color_encabezado_dia
  ) ||
  COLOR_ENCABEZADO_DIA_PREDETERMINADO  

  const nit =
    useMemo(
      () =>
        obtenerNitUsuario(
          currentUser
        ),
      [
        currentUser,
      ]
    )

  const nombreUsuario =
    useMemo(
      () =>
        obtenerNombreUsuario(
          currentUser
        ),
      [
        currentUser,
      ]
    )

  const semanaFin =
    useMemo(
      () =>
        sumarDias(
          semanaInicio,
          6
        ),
      [
        semanaInicio,
      ]
    )

  const estructuraHorario =
    useMemo(
      () =>
        construirEstructuraHorario(
          configuracion
        ),
      [
        configuracion,
      ]
    )

  const hayProgramacion =
    Object.keys(
      detalles
    ).length >
    0

  const elementosFiltrados =
    useMemo(
      () => {
        const elementos =
          catalogos?.elementos ||
          []

        const busqueda =
          mayusculas(
            busquedaElemento
          )

        if (!busqueda) {
          return elementos
        }

        return elementos.filter(
          (
            elemento
          ) => {
            const contenido =
              mayusculas(
                [
                  elemento?.nombre,
                  ...(elemento
                    ?.categorias_aplica ||
                    []),
                ].join(
                  ' '
                )
              )

            return contenido.includes(
              busqueda
            )
          }
        )
      },
      [
        catalogos,
        busquedaElemento,
      ]
    )

  // =======================================================
  // SESIÓN
  // =======================================================

  useEffect(
    () => {
      try {
        const guardado =
          localStorage.getItem(
            'currentUser'
          )

        if (!guardado) {
          router.push(
            '/login'
          )

          return
        }

        const usuario =
          JSON.parse(
            guardado
          )

        setCurrentUser(
          usuario
        )
      } catch (
        errorSesion
      ) {
        console.error(
          errorSesion
        )

        localStorage.removeItem(
          'currentUser'
        )

        router.push(
          '/login'
        )
      } finally {
        setCargandoSesion(
          false
        )
      }
    },
    [
      router,
    ]
  )

  // =======================================================
  // CARGA
  // =======================================================

  useEffect(
    () => {
      if (
        !nit ||
        !semanaInicio
      ) {
        return
      }

      cargarDatos()
    },
    [
      nit,
      semanaInicio,
    ]
  )

  useEffect(
    () => {
      if (!nit) {
        return
      }

      cargarLogo()
    },
    [
      nit,
    ]
  )

  async function cargarDatos() {
    try {
      setCargando(
        true
      )

      setError(
        ''
      )

      const respuesta =
        await fetch(
          `/api/admin/configuracion-academica/horarios?semana_inicio=${encodeURIComponent(
            semanaInicio
          )}`,
          {
            method:
              'GET',

            headers: {
              'x-cea-nit':
                nit,
            },

            cache:
              'no-store',
          }
        )

      const data =
        await respuesta.json()

      if (
        !respuesta.ok ||
        data?.status !==
          'success'
      ) {
        throw new Error(
          data?.message ||
            'No fue posible cargar el horario teórico.'
        )
      }

      setEmpresa(
        data?.empresa ||
          null
      )

      setConfiguracion(
        data?.configuracion ||
          null
      )

      setCatalogos(
        data?.catalogos || {
          clases: [],
          grupos: [],
          elementos: [],
          categorias_habilitadas: [],
        }
      )

      setHorario(
        data?.horario ||
          null
      )

      setTitulo(
        texto(
          data
            ?.horario
            ?.titulo
        )
      )

      const mapa = {}

      for (
        const detalle
        of data
          ?.horario
          ?.detalles ||
        []
      ) {
        mapa[
          claveCelda(
            detalle
              ?.dia_semana,
            detalle
              ?.hora_inicio
          )
        ] =
          detalle
      }

      setDetalles(
        mapa
      )
    } catch (
      errorCarga
    ) {
      console.error(
        errorCarga
      )

      setError(
        errorCarga?.message ||
          'No fue posible cargar la información.'
      )
    } finally {
      setCargando(
        false
      )
    }
  }

  async function cargarLogo() {
  try {
    const respuesta =
      await fetch(
        '/api/admin/configuracion-academica/logo',
        {
          method:
            'GET',

          headers: {
            'x-cea-nit':
              nit,
          },

          cache:
            'no-store',
        }
      )

    const data =
      await respuesta.json()

    if (!respuesta.ok) {
      console.error(
        'Error API logo:',
        data
      )

      setLogoUrl(
        ''
      )

      return
    }

    const url =
      obtenerLogoRespuesta(
        data
      )

   
    setLogoUrl(
      url
    )
  } catch (
    errorLogo
  ) {
    console.error(
      'Error cargando logo:',
      errorLogo
    )

    setLogoUrl(
      ''
    )
  }
}

// =======================================================
  // NAVEGACIÓN
  // =======================================================

  function regresar() {
    router.push(
      '/admin/configuracion-academica'
    )
  }
  
  // =======================================================
  // SEMANA
  // =======================================================

  function cambiarSemana(
    cantidad
  ) {
    setSemanaInicio(
      sumarDias(
        semanaInicio,
        cantidad
      )
    )
  }

  function irSemanaActual() {
    setSemanaInicio(
      lunesDeFecha()
    )
  }

  function cambiarFechaSemana(
    valor
  ) {
    if (!valor) {
      return
    }

    setSemanaInicio(
      lunesDeFecha(
        valor
      )
    )
  }

  // =======================================================
  // CONFIGURACIÓN
  // =======================================================

  function abrirConfiguracion() {
    const dias =
      DIAS_SEMANA.map(
        (
          dia
        ) => {
          const actual =
            (
              configuracion
                ?.dias ||
              []
            ).find(
              (
                item
              ) =>
                Number(
                  item
                    ?.dia_semana
                ) ===
                dia.dia_semana
            )

          return {
            dia_semana:
              dia.dia_semana,

            nombre:
              dia.nombre,

            activo:
              Boolean(
                actual
                  ?.activo
              ),

            hora_inicio:
              normalizarHora(
                actual
                  ?.hora_inicio
              ) ||
              '08:00',

            hora_fin:
              normalizarHora(
                actual
                  ?.hora_fin
              ) ||
              '20:00',
          }
        }
      )

    setConfiguracionEdicion({
      duracion_visual_minutos:
        numero(
          configuracion
            ?.general
            ?.duracion_visual_minutos
        ) || 120,

      color_encabezado_hora:
        texto(
          configuracion
            ?.general
            ?.color_encabezado_hora
        ) ||
        COLOR_ENCABEZADO_HORA_PREDETERMINADO,

      color_columna_hora:
        texto(
          configuracion
            ?.general
            ?.color_columna_hora
        ) ||
        COLOR_COLUMNA_HORA_PREDETERMINADO,

      color_encabezado_dia:
        texto(
          configuracion
            ?.general
            ?.color_encabezado_dia
        ) ||
        COLOR_ENCABEZADO_DIA_PREDETERMINADO,

      dias,
    })

    setModalConfiguracion(
      true
    )
  }

  function cambiarDiaConfiguracion(
    diaSemana,
    campo,
    valor
  ) {
    setConfiguracionEdicion(
      (
        anterior
      ) => ({
        ...anterior,

        dias:
          anterior.dias.map(
            (
              dia
            ) =>
              dia.dia_semana ===
              diaSemana
                ? {
                    ...dia,

                    [campo]:
                      valor,
                  }
                : dia
          ),
      })
    )
  }

  async function guardarConfiguracion() {
    if (
      !configuracionEdicion
    ) {
      return
    }

    try {
      setGuardando(
        true
      )

      setError(
        ''
      )

      const respuesta =
        await fetch(
          '/api/admin/configuracion-academica/horarios',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nit,
            },

            body:
              JSON.stringify({
                nit,

                accion:
                  'GUARDAR_CONFIGURACION',

                usuario:
                  nombreUsuario,

                duracion_visual_minutos:
                  Number(
                    configuracionEdicion
                      .duracion_visual_minutos
                  ),

                color_encabezado_hora:
                  configuracionEdicion
                    .color_encabezado_hora,

                color_columna_hora:
                  configuracionEdicion
                    .color_columna_hora,

                color_encabezado_dia:
                  configuracionEdicion
                    .color_encabezado_dia,

                dias:
                  configuracionEdicion
                    .dias
                    .map(
                      (
                        dia
                      ) => ({
                        dia_semana:
                          dia.dia_semana,

                        activo:
                          Boolean(
                            dia.activo
                          ),

                        hora_inicio:
                          dia.hora_inicio,

                        hora_fin:
                          dia.hora_fin,
                      })
                    ),
              }),
          }
        )

      const data =
        await respuesta.json()

      if (
        !respuesta.ok ||
        data?.status !==
          'success'
      ) {
        throw new Error(
          data?.message ||
            'No fue posible guardar la configuración.'
        )
      }

      setConfiguracion(
        data
          ?.configuracion ||
          null
      )

      setModalConfiguracion(
        false
      )

      // Al cambiar las franjas eliminamos únicamente
      // programaciones que ya no corresponden a franjas
      // disponibles.

      const nuevaEstructura =
        construirEstructuraHorario(
          data
            ?.configuracion
        )

      setDetalles(
        (
          actuales
        ) => {
          const permitidas =
            new Set()

          for (
            let dia = 1;
            dia <= 7;
            dia += 1
          ) {
            for (
              const franja
              of nuevaEstructura
                .porDia[
                dia
              ] || []
            ) {
              permitidas.add(
                claveCelda(
                  dia,
                  franja
                    .hora_inicio
                )
              )
            }
          }

          const resultado = {}

          for (
            const [
              llave,
              detalle,
            ]
            of Object.entries(
              actuales
            )
          ) {
            if (
              permitidas.has(
                llave
              )
            ) {
              resultado[
                llave
              ] =
                detalle
            }
          }

          return resultado
        }
      )

      setMensaje(
        'Configuración guardada correctamente.'
      )

      window.setTimeout(
        () =>
          setMensaje(
            ''
          ),
        3000
      )
    } catch (
      errorGuardar
    ) {
      setError(
        errorGuardar?.message ||
          'No fue posible guardar la configuración.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }

  // =======================================================
  // PROGRAMACIÓN
  // =======================================================

  function abrirCelda(
    dia,
    franja
  ) {
    if (!franja) {
      return
    }

    setCeldaActiva({
      dia_semana:
        dia.dia_semana,

      dia_nombre:
        dia.nombre,

      hora_inicio:
        franja.hora_inicio,

      hora_fin:
        franja.hora_fin,
    })

    setBusquedaElemento(
      ''
    )

    setModalProgramacion(
      true
    )
  }

  function asignarElemento(
    elemento
  ) {
    if (!celdaActiva) {
      return
    }

    const llave =
      claveCelda(
        celdaActiva
          .dia_semana,
        celdaActiva
          .hora_inicio
      )

    setDetalles(
      (
        anteriores
      ) => ({
        ...anteriores,

        [llave]: {
          dia_semana:
            celdaActiva
              .dia_semana,

          hora_inicio:
            celdaActiva
              .hora_inicio,

          hora_fin:
            celdaActiva
              .hora_fin,

          tipo_elemento:
            elemento
              .tipo_elemento,

          clase_formacion_id:
            elemento
              .tipo_elemento ===
            'CLASE'
              ? elemento.id
              : null,

          grupo_clases_formacion_id:
            elemento
              .tipo_elemento ===
            'GRUPO'
              ? elemento.id
              : null,

          nombre:
            elemento.nombre,

          color_horario:
            elemento
              .color_horario ||
            null,

          categorias_aplica:
            elemento
              .categorias_aplica ||
            [],
        },
      })
    )

    setModalProgramacion(
      false
    )
  }

  function asignarEspecial(
    tipo
  ) {
    if (!celdaActiva) {
      return
    }

    const llave =
      claveCelda(
        celdaActiva
          .dia_semana,
        celdaActiva
          .hora_inicio
      )

    setDetalles(
      (
        anteriores
      ) => ({
        ...anteriores,

        [llave]: {
          dia_semana:
            celdaActiva
              .dia_semana,

          hora_inicio:
            celdaActiva
              .hora_inicio,

          hora_fin:
            celdaActiva
              .hora_fin,

          tipo_elemento:
            tipo,

          clase_formacion_id:
            null,

          grupo_clases_formacion_id:
            null,

          nombre:
            tipo,

          color_horario:
            tipo ===
            'RECESO'
              ? '#F59E0B'
              : '#DC2626',

          categorias_aplica:
            [],
        },
      })
    )

    setModalProgramacion(
      false
    )
  }

  function limpiarCelda() {
    if (!celdaActiva) {
      return
    }

    const llave =
      claveCelda(
        celdaActiva
          .dia_semana,
        celdaActiva
          .hora_inicio
      )

    setDetalles(
      (
        anteriores
      ) => {
        const copia = {
          ...anteriores,
        }

        delete copia[
          llave
        ]

        return copia
      }
    )

    setModalProgramacion(
      false
    )
  }

  function diaEstaCompletoFestivo(
    diaSemana
  ) {
    const franjasDia =
      estructuraHorario
        .porDia[
        diaSemana
      ] || []

    if (
      franjasDia.length ===
      0
    ) {
      return false
    }

    return franjasDia.every(
      (
        franja
      ) => {
        const detalle =
          detalles[
            claveCelda(
              diaSemana,
              franja
                .hora_inicio
            )
          ]

        return (
          mayusculas(
            detalle
              ?.tipo_elemento
          ) ===
          'FESTIVO'
        )
      }
    )
  }

  function alternarDiaFestivo(
    diaSemana
  ) {
    const franjasDia =
      estructuraHorario
        .porDia[
        diaSemana
      ] || []

    if (
      franjasDia.length ===
      0
    ) {
      return
    }

    const limpiar =
      diaEstaCompletoFestivo(
        diaSemana
      )

    setDetalles(
      (
        anteriores
      ) => {
        const copia = {
          ...anteriores,
        }

        for (
          const franja
          of franjasDia
        ) {
          const llave =
            claveCelda(
              diaSemana,
              franja
                .hora_inicio
            )

          if (limpiar) {
            delete copia[
              llave
            ]

            continue
          }

          copia[
            llave
          ] = {
            dia_semana:
              diaSemana,

            hora_inicio:
              franja
                .hora_inicio,

            hora_fin:
              franja
                .hora_fin,

            tipo_elemento:
              'FESTIVO',

            clase_formacion_id:
              null,

            grupo_clases_formacion_id:
              null,

            nombre:
              'FESTIVO',

            color_horario:
              '#DC2626',

            categorias_aplica:
              [],
          }
        }

        return copia
      }
    )
  }

  // =======================================================
  // GUARDAR HORARIO
  // =======================================================

  async function guardarHorario() {
    try {
      setGuardando(
        true
      )

      setError(
        ''
      )

      const detallesEnviar =
        Object.values(
          detalles
        ).map(
          (
            detalle
          ) => ({
            dia_semana:
              detalle
                .dia_semana,

            hora_inicio:
              detalle
                .hora_inicio,

            tipo_elemento:
              detalle
                .tipo_elemento,

            clase_formacion_id:
              detalle
                .clase_formacion_id ||
              null,

            grupo_clases_formacion_id:
              detalle
                .grupo_clases_formacion_id ||
              null,
          })
        )

      const respuesta =
        await fetch(
          '/api/admin/configuracion-academica/horarios',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nit,
            },

            body:
              JSON.stringify({
                nit,

                accion:
                  'GUARDAR_HORARIO',

                semana_inicio:
                  semanaInicio,

                usuario:
                  nombreUsuario,

                titulo:
                  texto(
                    titulo
                  ),

                detalles:
                  detallesEnviar,
              }),
          }
        )

      const data =
        await respuesta.json()

      if (
        !respuesta.ok ||
        data?.status !==
          'success'
      ) {
        throw new Error(
          data?.message ||
            'No fue posible guardar el horario.'
        )
      }

      setHorario(
        data?.horario ||
          null
      )

      setMensaje(
        'Horario guardado correctamente.'
      )

      window.setTimeout(
        () =>
          setMensaje(
            ''
          ),
        3000
      )
    } catch (
      errorGuardar
    ) {
      setError(
        errorGuardar?.message ||
          'No fue posible guardar el horario.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }

  // =======================================================
  // CANVAS PARA IMAGEN Y PDF
  // =======================================================

  async function cargarImagenLogoCanvas() {
    if (!logoUrl) {
      return null
    }

    try {
      const respuesta =
        await fetch(
          logoUrl,
          {
            cache:
              'no-store',
          }
        )

      if (!respuesta.ok) {
        return null
      }

      const blob =
        await respuesta.blob()

      const url =
        URL.createObjectURL(
          blob
        )

      return await new Promise(
        (
          resolve
        ) => {
          const imagen =
            new Image()

          imagen.onload =
            () => {
              URL.revokeObjectURL(
                url
              )

              resolve(
                imagen
              )
            }

          imagen.onerror =
            () => {
              URL.revokeObjectURL(
                url
              )

              resolve(
                null
              )
            }

          imagen.src =
            url
        }
      )
    } catch (
      errorLogo
    ) {
      console.error(
        'No fue posible preparar el logo:',
        errorLogo
      )

      return null
    }
  }

  function dibujarTextoMultilinea(
    context,
    contenido,
    centroX,
    centroY,
    anchoMaximo,
    alturaLinea,
    maxLineas = 3
  ) {
    const palabras =
      texto(
        contenido
      ).split(
        /\s+/
      )

    const lineas = []
    let linea = ''

    for (
      const palabra
      of palabras
    ) {
      const prueba =
        linea
          ? `${linea} ${palabra}`
          : palabra

      if (
        context
          .measureText(
            prueba
          )
          .width <=
        anchoMaximo
      ) {
        linea =
          prueba
      } else {
        if (linea) {
          lineas.push(
            linea
          )
        }

        linea =
          palabra
      }
    }

    if (linea) {
      lineas.push(
        linea
      )
    }

    const visibles =
      lineas.slice(
        0,
        maxLineas
      )

    const totalAlto =
      visibles.length *
      alturaLinea

    let y =
      centroY -
      totalAlto / 2 +
      alturaLinea / 2

    for (
      let i = 0;
      i <
      visibles.length;
      i += 1
    ) {
      let lineaVisible =
        visibles[i]

      if (
        i ===
          maxLineas - 1 &&
        lineas.length >
          maxLineas
      ) {
        lineaVisible =
          `${lineaVisible}…`
      }

      context.fillText(
        lineaVisible,
        centroX,
        y
      )

      y +=
        alturaLinea
    }
  }

  function dibujarCeldaDetalle(
    context,
    detalle,
    x,
    y,
    ancho,
    alto
  ) {
    if (!detalle) {
      context.fillStyle =
        '#FFFFFF'

      context.fillRect(
        x,
        y,
        ancho,
        alto
      )

      context.strokeStyle =
        '#94A3B8'

      context.strokeRect(
        x,
        y,
        ancho,
        alto
      )

      return
    }

    const fondo =
      colorDetalle(
        detalle
      )

    const colorTexto =
      obtenerContraste(
        fondo
      )

    context.fillStyle =
      fondo

    context.fillRect(
      x,
      y,
      ancho,
      alto
    )

    context.strokeStyle =
      '#475569'

    context.strokeRect(
      x,
      y,
      ancho,
      alto
    )

    const tipo =
      mayusculas(
        detalle
          ?.tipo_elemento
      )

    const especial =
      tipo ===
        'RECESO' ||
      tipo ===
        'FESTIVO'

    context.textAlign =
      'center'

    context.textBaseline =
      'middle'

    context.fillStyle =
      colorTexto

    context.font =
      'bold 15px Arial'

    const nombre =
      especial
        ? tipo
        : texto(
            detalle
              ?.nombre
          ) ||
          'CLASE'

    dibujarTextoMultilinea(
      context,
      nombre,
      x + ancho / 2,
      y + alto / 2 -
        (
          especial
            ? 0
            : 8
        ),
      ancho - 18,
      17,
      3
    )

    if (
      !especial &&
      (
        detalle
          ?.categorias_aplica ||
        []
      ).length >
        0
    ) {
      context.font =
        'bold 12px Arial'

      context.fillText(
        detalle
          .categorias_aplica
          .join(
            ' · '
          ),
        x + ancho / 2,
        y + alto - 13
      )
    }
  }

  function dibujarGrupoHorario({
    context,
    x,
    y,
    dias,
    filas,
    porDia,
    modoDiaIndividual = false,
  }) {
    const anchoHora =
      130

    const anchoDia =
      modoDiaIndividual
        ? 210
        : 176

    const altoEncabezado =
      56

    const altoFila =
      88

    const anchoTotal =
      anchoHora +
      anchoDia *
        dias.length

    // HORA

   context.fillStyle =
      colorEncabezadoHora

    context.fillRect(
      x,
      y,
      anchoHora,
      altoEncabezado
    )

    context.strokeStyle =
      COLOR_HORA_BORDE

    context.strokeRect(
      x,
      y,
      anchoHora,
      altoEncabezado
    )

    context.fillStyle =
      obtenerContraste(
        colorEncabezadoHora
      )

    context.font =
      'bold 15px Arial'

    context.textAlign =
      'center'

    context.textBaseline =
      'middle'

    context.fillText(
      'HORA',
      x +
        anchoHora / 2,
      y +
        altoEncabezado / 2
    )

    // DÍAS

    dias.forEach(
      (
        dia,
        indice
      ) => {
        const dx =
          x +
          anchoHora +
          indice *
            anchoDia

       context.fillStyle =
         colorEncabezadoDia

        context.fillRect(
          dx,
          y,
          anchoDia,
          altoEncabezado
        )

        context.strokeStyle =
          COLOR_ENCABEZADO_DIA_BORDE

        context.strokeRect(
          dx,
          y,
          anchoDia,
          altoEncabezado
        )

        context.fillStyle =
          obtenerContraste(
            colorEncabezadoDia
          )

        context.font =
          'bold 14px Arial'

        context.fillText(
          dia.nombre,
          dx +
            anchoDia / 2,
          y + 20
        )

        context.font =
          'bold 12px Arial'

        context.fillStyle =
          obtenerContraste(
            colorEncabezadoDia
          )

        context.fillText(
          formatearFechaDia(
            fechaCorrespondienteDia(
              semanaInicio,
              dia
                .dia_semana
            )
          ),
          dx +
            anchoDia / 2,
          y + 40
        )
      }
    )

    filas.forEach(
      (
        fila,
        indiceFila
      ) => {
        const fy =
          y +
          altoEncabezado +
          indiceFila *
            altoFila

        const horaInicio =
        fila.hora_inicio

        context.fillStyle =
          colorColumnaHora

        context.fillRect(
          x,
          fy,
          anchoHora,
          altoFila
        )

        context.strokeStyle =
          COLOR_HORA_BORDE

        context.strokeRect(
          x,
          fy,
          anchoHora,
          altoFila
        )

        context.fillStyle =
          obtenerContraste(
            colorColumnaHora
          )

        context.font =
          'bold 12px Arial'

        context.textAlign =
          'center'

        const franjaHora =
          modoDiaIndividual
            ? fila
            : (
                dias
                  .map(
                    (
                      dia
                    ) =>
                      fila
                        ?.celdas
                        ?.[
                          dia
                            .dia_semana
                        ]
                  )
                  .find(
                    Boolean
                  ) ||
                null
              )

        if (franjaHora) {
          const centroX =
            x +
            anchoHora / 2

          const centroY =
            fy +
            altoFila / 2

          context.fillText(
            formatearHora12Compacta(
              franjaHora
                .hora_inicio
            ),
            centroX,
            centroY - 18
          )

          context.fillText(
            'a',
            centroX,
            centroY
          )

          context.fillText(
            formatearHora12Compacta(
              franjaHora
                .hora_fin
            ),
            centroX,
            centroY + 18
          )
        } else {
          context.fillText(
            formatearHora12Compacta(
              horaInicio
            ),
            x +
              anchoHora / 2,
            fy +
              altoFila / 2
          )
        }
        dias.forEach(
          (
            dia,
            indiceDia
          ) => {
            const dx =
              x +
              anchoHora +
              indiceDia *
                anchoDia

            const franja =
              modoDiaIndividual
                ? fila
                : fila
                    ?.celdas
                    ?.[
                      dia
                        .dia_semana
                    ]

            if (!franja) {
              context.fillStyle =
                '#F1F5F9'

              context.fillRect(
                dx,
                fy,
                anchoDia,
                altoFila
              )

              context.strokeStyle =
                '#CBD5E1'

              context.strokeRect(
                dx,
                fy,
                anchoDia,
                altoFila
              )

              return
            }

            const detalle =
              detalles[
                claveCelda(
                  dia
                    .dia_semana,
                  franja
                    .hora_inicio
                )
              ]

            dibujarCeldaDetalle(
              context,
              detalle,
              dx,
              fy,
              anchoDia,
              altoFila
            )
          }
        )
      }
    )

    return {
      ancho:
        anchoTotal,

      alto:
        altoEncabezado +
        filas.length *
          altoFila,
    }
  }

  async function crearCanvasHorario() {
    const laborales =
      estructuraHorario
        .diasLaborales

    const sabadoActivo =
      estructuraHorario
        .sabado
        .length >
      0

    const domingoActivo =
      estructuraHorario
        .domingo
        .length >
      0

    const anchoLaborales =
  laborales.length >
  0
    ? 130 +
      laborales.length *
        176
    : 0

    const anchoSabado =
      sabadoActivo
        ? 340
        : 0

    const anchoDomingo =
      domingoActivo
        ? 340
        : 0

    const gruposActivos =
      [
        anchoLaborales >
          0,
        anchoSabado >
          0,
        anchoDomingo >
          0,
      ].filter(
        Boolean
      ).length

    const separaciones =
      Math.max(
        0,
        gruposActivos - 1
      ) * 14

    const contenidoAncho =
      anchoLaborales +
      anchoSabado +
      anchoDomingo +
      separaciones

    const maxFilas =
      Math.max(
        estructuraHorario
          .filasLaborales
          .length,
        estructuraHorario
          .sabado
          .length,
        estructuraHorario
          .domingo
          .length,
        1
      )

    const margen =
      24

    const encabezado =
      118

    const contenidoAlto =
      56 +
      maxFilas *
        88

    const canvas =
      document.createElement(
        'canvas'
      )

    canvas.width =
      Math.max(
        1000,
        contenidoAncho +
          margen * 2
      )

    canvas.height =
      encabezado +
      contenidoAlto +
      margen * 2

    const context =
      canvas.getContext(
        '2d'
      )

    context.fillStyle =
      '#FFFFFF'

    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    )

    // ===============================================
    // LOGO
    // ===============================================

    const imagenLogo =
      await cargarImagenLogoCanvas()

    if (imagenLogo) {
      const maxAncho =
        180

      const maxAlto =
        78

      const escala =
        Math.min(
          maxAncho /
            imagenLogo.width,
          maxAlto /
            imagenLogo.height,
          1
        )

      const ancho =
        imagenLogo.width *
        escala

      const alto =
        imagenLogo.height *
        escala

      context.drawImage(
        imagenLogo,
        margen,
        22,
        ancho,
        alto
      )
    }

    // ===============================================
    // TÍTULO
    // ===============================================

    context.textAlign =
      'center'

    context.textBaseline =
      'middle'

    context.fillStyle =
      '#0F172A'

    context.font =
      'bold 24px Arial'

    context.fillText(
      texto(
        titulo
      ) ||
        'HORARIO TEÓRICO',
      canvas.width / 2,
      34
    )

    context.font =
      'bold 16px Arial'

    context.fillStyle =
      '#334155'

    context.fillText(
      texto(
        empresa?.nombre
      ) ||
        texto(
          empresa
            ?.razon_social
        ) ||
        '',
      canvas.width / 2,
      62
    )

    context.font =
      'bold 13px Arial'

    context.fillStyle =
      '#64748B'

    context.fillText(
      `Semana del ${formatearFecha(
        semanaInicio
      )} al ${formatearFecha(
        semanaFin
      )}`,
      canvas.width / 2,
      88
    )

    context.strokeStyle =
      colorEncabezadoHora

    context.lineWidth =
      2

    context.beginPath()

    context.moveTo(
      margen,
      108
    )

    context.lineTo(
      canvas.width -
        margen,
      108
    )

    context.stroke()

    // ===============================================
    // TABLAS
    // ===============================================

    let x =
      margen

    const y =
      encabezado

    if (
      laborales.length >
      0
    ) {
      const resultado =
        dibujarGrupoHorario({
          context,
          x,
          y,

          dias:
            laborales,

          filas:
            estructuraHorario
              .filasLaborales,

          porDia:
            estructuraHorario
              .porDia,

          modoDiaIndividual:
            false,
        })

      x +=
        resultado.ancho +
        14
    }

    if (
      sabadoActivo
    ) {
      const diaSabado =
        DIAS_SEMANA.find(
          (
            dia
          ) =>
            dia.dia_semana ===
            6
        )

      const resultado =
        dibujarGrupoHorario({
          context,
          x,
          y,

          dias: [
            diaSabado,
          ],

          filas:
            estructuraHorario
              .sabado,

          porDia:
            estructuraHorario
              .porDia,

          modoDiaIndividual:
            true,
        })

      x +=
        resultado.ancho +
        14
    }

    if (
      domingoActivo
    ) {
      const diaDomingo =
        DIAS_SEMANA.find(
          (
            dia
          ) =>
            dia.dia_semana ===
            7
        )

      dibujarGrupoHorario({
        context,
        x,
        y,

        dias: [
          diaDomingo,
        ],

        filas:
          estructuraHorario
            .domingo,

        porDia:
          estructuraHorario
            .porDia,

        modoDiaIndividual:
          true,
      })
    }

    return canvas
  }

  async function descargarImagen() {
    try {
      setExportando(
        true
      )

      setError(
        ''
      )

      const canvas =
        await crearCanvasHorario()

      const blob =
        await new Promise(
          (
            resolve
          ) => {
            canvas.toBlob(
              resolve,
              'image/png'
            )
          }
        )

      if (!blob) {
        throw new Error(
          'No fue posible generar la imagen.'
        )
      }

      descargarBlob(
        blob,
        `horario-teorico-${semanaInicio}.png`
      )
    } catch (
      errorImagen
    ) {
      console.error(
        errorImagen
      )

      setError(
        errorImagen?.message ||
          'No fue posible descargar la imagen.'
      )
    } finally {
      setExportando(
        false
      )
    }
  }

  async function descargarPDF() {
    try {
      setExportando(
        true
      )

      setError(
        ''
      )

      const canvas =
        await crearCanvasHorario()

      descargarCanvasPDF(
        canvas,
        `horario-teorico-${semanaInicio}.pdf`
      )
    } catch (
      errorPdf
    ) {
      console.error(
        errorPdf
      )

      setError(
        errorPdf?.message ||
          'No fue posible descargar el PDF.'
      )
    } finally {
      setExportando(
        false
      )
    }
  }

  // =======================================================
  // RENDER SESIÓN
  // =======================================================

  if (
    cargandoSesion
  ) {
    return (
      <div
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-slate-100
          text-sm
          font-semibold
          text-slate-600
        "
      >
        Cargando...
      </div>
    )
  }

  // =======================================================
  // RENDER PRINCIPAL
  // =======================================================

  return (
    <div
      className="
        min-h-screen
        bg-slate-100
        p-3
        md:p-4
      "
    >
      <div
        className="
          mx-auto
          max-w-[1900px]
          space-y-3
        "
      >
        {/* ===============================================
            ENCABEZADO
        =============================================== */}

        <EncabezadoModulo
          titulo="Horario Teórico"
          subtitulo="Configure y programe el horario semanal de clases teóricas del CEA."
          icono={CalendarDays}
          rutaRegreso="/admin/configuracion-academica"
          textoRegreso="Regresar"
        />
        {/* ===============================================
            MENSAJES
        =============================================== */}

        {error && (
          <div
            className="
              rounded-lg
              border
              border-red-300
              bg-red-50
              px-3
              py-2
              text-sm
              font-semibold
              text-red-700
            "
          >
            {error}
          </div>
        )}

        {mensaje && (
          <div
            className="
              rounded-lg
              border
              border-emerald-300
              bg-emerald-50
              px-3
              py-2
              text-sm
              font-semibold
              text-emerald-700
            "
          >
            {mensaje}
          </div>
        )}

        {/* ===============================================
            SEMANA + TÍTULO
        =============================================== */}

        <div
          className="
            rounded-xl
            border
            border-slate-400
            bg-white
            p-3
            shadow-sm
          "
        >
          <div
          className="
            grid
            gap-3
            lg:grid-cols-[minmax(360px,1fr)_minmax(280px,1fr)_auto]
            lg:items-end
          "
        >
          {/* ===============================================
              SEMANA PROGRAMADA
          =============================================== */}

          <div>
            <label
              className="
                mb-1
                block
                text-[11px]
                font-black
                uppercase
                tracking-wide
                text-slate-800
              "
            >
              Semana programada
            </label>

            <div
              className="
                flex
                items-center
                gap-1.5
              "
            >
              <button
                type="button"
                onClick={
                  () =>
                    cambiarSemana(
                      -7
                    )
                }
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-500
                  bg-white
                  text-slate-700
                  transition
                  hover:bg-slate-100
                "
              >
                <i className="fa-solid fa-chevron-left" />
              </button>

              <input
                type="date"
                value={
                  semanaInicio
                }
                onChange={
                  (
                    event
                  ) =>
                    cambiarFechaSemana(
                      event
                        .target
                        .value
                    )
                }
                className="
                  h-9
                  min-w-0
                  flex-1
                  rounded-lg
                  border
                  border-slate-500
                  bg-white
                  px-3
                  text-sm
                  font-semibold
                  text-slate-700
                  outline-none
                  focus:border-blue-500
                "
              />

              <button
                type="button"
                onClick={
                  () =>
                    cambiarSemana(
                      7
                    )
                }
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-500
                  bg-white
                  text-slate-700
                  transition
                  hover:bg-slate-100
                "
              >
                <i className="fa-solid fa-chevron-right" />
              </button>

              <button
                type="button"
                onClick={
                  irSemanaActual
                }
                className="
                  h-9
                  shrink-0
                  rounded-lg
                  border
                  border-slate-500
                  bg-slate-50
                  px-3
                  text-[11px]
                  font-black
                  text-slate-700
                  transition
                  hover:bg-slate-100
                "
              >
                Hoy
              </button>
            </div>

            <p
              className="
                mt-1
                text-[11px]
                font-semibold
                text-slate-500
              "
            >
              {formatearFecha(
                semanaInicio
              )}

              {' — '}

              {formatearFecha(
                semanaFin
              )}

              {horario
                ?.estado && (
                <>
                  {' · '}

                  <span
                    className={
                      horario
                        .estado ===
                      'CANCELADA'
                        ? 'text-red-600'
                        : 'text-emerald-700'
                    }
                  >
                    {horario.estado}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* ===============================================
              TÍTULO
          =============================================== */}

          <div>
            <label
              className="
                mb-1
                block
                text-[11px]
                font-black
                uppercase
                tracking-wide
                text-slate-600
              "
            >
              Título
            </label>

            <input
              type="text"
              value={
                titulo
              }
              onChange={
                (
                  event
                ) =>
                  setTitulo(
                    event
                      .target
                      .value
                  )
              }
              placeholder="Ej. HORARIO TEÓRICO"
              className="
                h-9
                w-full
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-sm
                font-semibold
                text-slate-700
                outline-none
                focus:border-blue-500
              "
            />

            <p
              className="
                mt-1
                text-[11px]
                text-slate-400
              "
            >
              Aparecerá centrado en la vista previa, imagen y PDF.
            </p>
          </div>

          {/* ===============================================
              ACCIONES DEL HORARIO
          =============================================== */}

          <div
            className="
              flex
              flex-wrap
              items-center
              justify-start
              gap-2
              lg:justify-end
              lg:self-start
              lg:pt-[22px]
            "
          >
            <button
              type="button"
              onClick={
                abrirConfiguracion
              }
              className="
                h-9
                whitespace-nowrap
                rounded-lg
                border
                border-slate-300
                bg-slate-300
                px-3
                text-xs
                font-bold
                text-slate-700
                shadow-sm
                transition
                hover:border-slate-400
                hover:bg-slate-200
                hover:text-slate-900
              "
            >
              <i className="fa-solid fa-gear mr-2" />

              Configurar horario
            </button>

            <button
              type="button"
              onClick={
                () =>
                  setModalVistaPrevia(
                    true
                  )
              }
              className="
                h-9
                whitespace-nowrap
                rounded-lg
                border
                border-blue-300
                bg-blue-100
                px-3
                text-xs
                font-bold
                text-blue-800
                shadow-sm
                transition
                hover:border-blue-500
                hover:bg-blue-200
              "
            >
              <i className="fa-solid fa-eye mr-2" />

              Vista previa
            </button>

            <button
              type="button"
              disabled={
                guardando
              }
              onClick={
                guardarHorario
              }
              className="
                h-9
                whitespace-nowrap
                rounded-lg
                bg-[var(--primary)]
                px-3
                text-xs
                font-bold
                text-white
                shadow-sm
                transition
                hover:bg-[var(--primary-dark)]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <i className="fa-solid fa-floppy-disk mr-2" />

              {guardando
                ? 'Guardando...'
                : 'Guardar horario'}
            </button>
          </div>
        </div>
        </div>

       
        {/* ===============================================
            CUADRÍCULA
        =============================================== */}

        <div
          className="
            overflow-hidden
            rounded-xl
            border
            border-slate-200
            bg-white
            shadow-sm
          "
        >
          {cargando ? (
            <div
              className="
                flex
                min-h-[350px]
                items-center
                justify-center
                text-sm
                font-semibold
                text-slate-500
              "
            >
              Cargando horario...
            </div>
          ) : (
            <CuadriculaHorario
              semanaInicio={
                semanaInicio
              }
              colorEncabezadoHora={
                colorEncabezadoHora
              }
              colorColumnaHora={
                colorColumnaHora
              }
              colorEncabezadoDia={
                colorEncabezadoDia
              }
              estructura={
                estructuraHorario
              }
              detalles={
                detalles
              }
              abrirCelda={
                abrirCelda
              }
              diaEstaCompletoFestivo={
                diaEstaCompletoFestivo
              }
              alternarDiaFestivo={
                alternarDiaFestivo
              }
              abrirConfiguracion={
                abrirConfiguracion
              }
            />
          )}
        </div>
      </div>

      {/* ===============================================
          CONFIGURACIÓN
      =============================================== */}

      {modalConfiguracion &&
        configuracionEdicion && (
          <Modal
            titulo="Configurar horario teórico"
            cerrar={
              () =>
                setModalConfiguracion(
                  false
                )
            }
            ancho="max-w-4xl"
          >
            <div className="space-y-4">
              <div
                className="
                  rounded-lg
                  border
                  border-blue-200
                  bg-blue-50
                  p-3
                "
              >
                <div
                  className="
                    grid
                    gap-3
                    md:grid-cols-[1fr_260px]
                    md:items-end
                  "
                >
                  <div>
                    <p
                      className="
                        text-sm
                        font-black
                        text-slate-800
                      "
                    >
                      Inicio de franjas cada 2 horas
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-slate-600
                      "
                    >
                      Solo aparecerá el rango configurado para cada día. La duración visible puede ser menor a dos horas.
                    </p>
                  </div>

                  <div>
                    <label
                      className="
                        mb-1
                        block
                        text-[11px]
                        font-black
                        uppercase
                        text-slate-600
                      "
                    >
                      Duración visible
                    </label>

                    <select
                      value={
                        configuracionEdicion
                          .duracion_visual_minutos
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setConfiguracionEdicion(
                            (
                              anterior
                            ) => ({
                              ...anterior,

                              duracion_visual_minutos:
                                Number(
                                  event
                                    .target
                                    .value
                                ),
                            })
                          )
                      }
                      className="
                        h-9
                        w-full
                        rounded-lg
                        border
                        border-slate-300
                        bg-white
                        px-3
                        text-sm
                        font-semibold
                        text-slate-700
                      "
                    >
                      {DURACIONES_VISUALES.map(
                        (
                          item
                        ) => (
                          <option
                            key={
                              item.valor
                            }
                            value={
                              item.valor
                            }
                          >
                            {item.etiqueta}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div
                className="
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-4
                "
              >
                <div className="mb-4">
                  <p
                    className="
                      text-sm
                      font-black
                      text-slate-800
                    "
                  >
                    Colores del horario
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-500
                    "
                  >
                    Seleccione los colores que utilizará el CEA en pantalla, vista previa, imagen y PDF.
                  </p>
                </div>

                <div
                  className="
                    grid
                    gap-4
                    xl:grid-cols-3
                  "
                >
                  <SelectorColorHorario
                    titulo="Encabezado HORA"
                    descripcion="Color del cuadro superior HORA."
                    valor={
                      configuracionEdicion
                        .color_encabezado_hora
                    }
                    onChange={
                      (color) =>
                        setConfiguracionEdicion(
                          (
                            anterior
                          ) => ({
                            ...anterior,

                            color_encabezado_hora:
                              color,
                          })
                        )
                    }
                  />

                  <SelectorColorHorario
                    titulo="Columnas HORA"
                    descripcion="Color de las celdas donde aparecen las horas."
                    valor={
                      configuracionEdicion
                        .color_columna_hora
                    }
                    onChange={
                      (color) =>
                        setConfiguracionEdicion(
                          (
                            anterior
                          ) => ({
                            ...anterior,

                            color_columna_hora:
                              color,
                          })
                        )
                    }
                  />

                  <SelectorColorHorario
                    titulo="Encabezados de días"
                    descripcion="Color de LUNES, MARTES, MIÉRCOLES, etc."
                    valor={
                      configuracionEdicion
                        .color_encabezado_dia
                    }
                    onChange={
                      (color) =>
                        setConfiguracionEdicion(
                          (
                            anterior
                          ) => ({
                            ...anterior,

                            color_encabezado_dia:
                              color,
                          })
                        )
                    }
                  />
                </div>
              </div>
              <div
                className="
                  overflow-x-auto
                  rounded-lg
                  border
                  border-slate-200
                "
              >
                <div
                  className="
                    min-w-[600px]
                  "
                >
                  <div
                    className="
                      grid
                      grid-cols-[130px_90px_1fr_1fr]
                      gap-2
                      bg-slate-800
                      px-3
                      py-2
                      text-[10px]
                      font-black
                      uppercase
                      text-white
                    "
                  >
                    <div>Día</div>
                    <div>Activo</div>
                    <div>Hora inicio</div>
                    <div>Hora final</div>
                  </div>

                  {configuracionEdicion
                    .dias
                    .map(
                      (
                        dia
                      ) => (
                        <div
                          key={
                            dia.dia_semana
                          }
                          className="
                            grid
                            grid-cols-[130px_90px_1fr_1fr]
                            items-center
                            gap-2
                            border-t
                            border-slate-200
                            px-3
                            py-2
                          "
                        >
                          <div
                            className="
                              text-xs
                              font-black
                              text-slate-700
                            "
                          >
                            {dia.nombre}
                          </div>

                          <label
                            className="
                              flex
                              items-center
                              gap-2
                              text-xs
                              font-semibold
                            "
                          >
                            <input
                              type="checkbox"
                              checked={
                                dia.activo
                              }
                              onChange={
                                (
                                  event
                                ) =>
                                  cambiarDiaConfiguracion(
                                    dia
                                      .dia_semana,
                                    'activo',
                                    event
                                      .target
                                      .checked
                                  )
                              }
                              className="h-4 w-4"
                            />

                            Sí
                          </label>

                          <input
                            type="time"
                            value={
                              dia.hora_inicio
                            }
                            disabled={
                              !dia.activo
                            }
                            onChange={
                              (
                                event
                              ) =>
                                cambiarDiaConfiguracion(
                                  dia
                                    .dia_semana,
                                  'hora_inicio',
                                  event
                                    .target
                                    .value
                                )
                            }
                            className="
                              h-9
                              rounded-lg
                              border
                              border-slate-300
                              bg-white
                              px-2
                              text-sm
                              font-semibold
                              disabled:bg-slate-100
                              disabled:text-slate-400
                            "
                          />

                          <input
                            type="time"
                            value={
                              dia.hora_fin
                            }
                            disabled={
                              !dia.activo
                            }
                            onChange={
                              (
                                event
                              ) =>
                                cambiarDiaConfiguracion(
                                  dia
                                    .dia_semana,
                                  'hora_fin',
                                  event
                                    .target
                                    .value
                                )
                            }
                            className="
                              h-9
                              rounded-lg
                              border
                              border-slate-300
                              bg-white
                              px-2
                              text-sm
                              font-semibold
                              disabled:bg-slate-100
                              disabled:text-slate-400
                            "
                          />
                        </div>
                      )
                    )}
                </div>
              </div>

              <div
                className="
                  flex
                  justify-end
                  gap-2
                "
              >
                <button
                  type="button"
                  onClick={
                    () =>
                      setModalConfiguracion(
                        false
                      )
                  }
                  className="
                    rounded-lg
                    border
                    border-slate-300
                    px-4
                    py-2
                    text-sm
                    font-bold
                    text-slate-700
                  "
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={
                    guardando
                  }
                  onClick={
                    guardarConfiguracion
                  }
                  className="
                    rounded-lg
                    bg-[var(--primary)]
                    px-4
                    py-2
                    text-sm
                    font-bold
                    text-white
                    disabled:opacity-50
                  "
                >
                  {guardando
                    ? 'Guardando...'
                    : 'Guardar configuración'}
                </button>
              </div>
            </div>
          </Modal>
        )}

      {/* ===============================================
          PROGRAMAR CELDA
      =============================================== */}

      {modalProgramacion &&
        celdaActiva && (
          <Modal
            titulo={`${celdaActiva.dia_nombre} · ${formatearHora12(
              celdaActiva
                .hora_inicio
            )} - ${formatearHora12(
              celdaActiva
                .hora_fin
            )}`}
            cerrar={
              () =>
                setModalProgramacion(
                  false
                )
            }
            ancho="max-w-3xl"
          >
            <div className="space-y-3">
              <div
                className="
                  grid
                  grid-cols-3
                  gap-2
                "
              >
                <button
                  type="button"
                  onClick={
                    () =>
                      asignarEspecial(
                        'RECESO'
                      )
                  }
                  className="
                    rounded-lg
                    border
                    border-amber-300
                    bg-amber-50
                    px-3
                    py-2.5
                    text-xs
                    font-black
                    text-amber-800
                  "
                >
                  RECESO
                </button>

                <button
                  type="button"
                  onClick={
                    () =>
                      asignarEspecial(
                        'FESTIVO'
                      )
                  }
                  className="
                    rounded-lg
                    border
                    border-red-300
                    bg-red-50
                    px-3
                    py-2.5
                    text-xs
                    font-black
                    text-red-700
                  "
                >
                  FESTIVO
                </button>

                <button
                  type="button"
                  onClick={
                    limpiarCelda
                  }
                  className="
                    rounded-lg
                    border
                    border-slate-300
                    bg-slate-50
                    px-3
                    py-2.5
                    text-xs
                    font-black
                    text-slate-700
                  "
                >
                  LIMPIAR
                </button>
              </div>

              <input
                type="text"
                value={
                  busquedaElemento
                }
                onChange={
                  (
                    event
                  ) =>
                    setBusquedaElemento(
                      event
                        .target
                        .value
                    )
                }
                placeholder="Buscar clase o grupo..."
                className="
                  h-9
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  px-3
                  text-sm
                  outline-none
                  focus:border-blue-500
                "
              />

              <div
                className="
                  max-h-[420px]
                  space-y-2
                  overflow-y-auto
                "
              >
                {elementosFiltrados.map(
                  (
                    elemento
                  ) => (
                    <button
                      key={`${elemento.tipo_elemento}-${elemento.id}`}
                      type="button"
                      onClick={
                        () =>
                          asignarElemento(
                            elemento
                          )
                      }
                      className="
                        flex
                        w-full
                        items-center
                        gap-3
                        rounded-lg
                        border
                        border-slate-200
                        p-2.5
                        text-left
                        hover:border-blue-400
                        hover:bg-blue-50
                      "
                    >
                      <span
                        className="
                          h-9
                          w-9
                          shrink-0
                          rounded-lg
                          border
                          border-black/10
                        "
                        style={{
                          backgroundColor:
                            elemento
                              ?.color_horario ||
                            '#E2E8F0',
                        }}
                      />

                      <span className="min-w-0 flex-1">
                        <span
                          className="
                            block
                            text-sm
                            font-black
                            text-slate-800
                          "
                        >
                          {elemento.nombre}
                        </span>

                        <span
                          className="
                            block
                            text-xs
                            font-bold
                            text-slate-500
                          "
                        >
                          {(
                            elemento
                              ?.categorias_aplica ||
                            []
                          ).join(
                            ' · '
                          )}
                        </span>
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          </Modal>
        )}

      {/* ===============================================
          VISTA PREVIA
      =============================================== */}

      {modalVistaPrevia && (
        <Modal
          titulo="Vista previa del horario"
          cerrar={
            () =>
              setModalVistaPrevia(
                false
              )
          }
          ancho="max-w-[1700px]"
        >
          <div className="space-y-3">
            <div
              className="
                flex
                flex-wrap
                justify-end
                gap-2
              "
            >
              <button
                type="button"
                disabled={
                  exportando
                }
                onClick={
                  descargarImagen
                }
                className="
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  py-2
                  text-xs
                  font-black
                  text-slate-700
                  disabled:opacity-50
                "
              >
                <i className="fa-solid fa-image mr-2" />

                Descargar imagen
              </button>

              <button
                type="button"
                disabled={
                  exportando
                }
                onClick={
                  descargarPDF
                }
                className="
                  rounded-lg
                  bg-red-600
                  px-3
                  py-2
                  text-xs
                  font-black
                  text-white
                  disabled:opacity-50
                "
              >
                <i className="fa-solid fa-file-pdf mr-2" />

                {exportando
                  ? 'Generando...'
                  : 'Descargar PDF'}
              </button>
            </div>

            <VistaPrevia
              empresa={
                empresa
              }
              logoUrl={
                logoUrl
              }
              titulo={
                titulo
              }
              semanaInicio={
                semanaInicio
              }
              semanaFin={
                semanaFin
              }
              estructura={
                estructuraHorario
              }
              detalles={
                detalles
              }
              colorEncabezadoHora={
                colorEncabezadoHora
              }
              colorColumnaHora={
                colorColumnaHora
              }
              colorEncabezadoDia={
                colorEncabezadoDia
              }
            />
          </div>
        </Modal>
      )}
    </div>
  )
}

// =========================================================
// CUADRÍCULA PRINCIPAL
// =========================================================

function CuadriculaHorario({
  semanaInicio,
  estructura,
  detalles,
  abrirCelda,
  diaEstaCompletoFestivo,
  alternarDiaFestivo,
  abrirConfiguracion,
  colorEncabezadoHora,
  colorColumnaHora,
  colorEncabezadoDia,
}) {
  const hayLaborales =
    estructura
      .diasLaborales
      .length >
    0

  const haySabado =
    estructura
      .sabado
      .length >
    0

  const hayDomingo =
    estructura
      .domingo
      .length >
    0

  if (
    !hayLaborales &&
    !haySabado &&
    !hayDomingo
  ) {
    return (
      <div
        className="
          flex
          min-h-[320px]
          flex-col
          items-center
          justify-center
          gap-3
          p-6
          text-center
        "
      >
        <i
          className="
            fa-solid
            fa-calendar-days
            text-4xl
            text-slate-300
          "
        />

        <div>
          <p
            className="
              font-black
              text-slate-700
            "
          >
            No hay días configurados
          </p>

          <p
            className="
              mt-1
              text-sm
              text-slate-500
            "
          >
            Configure los días y sus horarios.
          </p>
        </div>

        <button
          type="button"
          onClick={
            abrirConfiguracion
          }
          className="
            rounded-lg
            bg-[var(--primary)]
            px-4
            py-2
            text-sm
            font-bold
            text-white
          "
        >
          Configurar horario
        </button>
      </div>
    )
  }

  return (
    <div
      className="
        flex
        gap-3
        overflow-x-auto
        p-2
      "
    >
      {hayLaborales && (
        <TablaLaborales
          semanaInicio={
            semanaInicio
          }
          estructura={
            estructura
          }
          detalles={
            detalles
          }
          abrirCelda={
            abrirCelda
          }
          diaEstaCompletoFestivo={
            diaEstaCompletoFestivo
          }
          alternarDiaFestivo={
            alternarDiaFestivo
          }
          colorEncabezadoHora={
            colorEncabezadoHora
          }
          colorColumnaHora={
            colorColumnaHora
          }
          colorEncabezadoDia={
            colorEncabezadoDia
          }
        />
      )}

      {haySabado && (
        <TablaDiaIndividual
          dia={
            DIAS_SEMANA[5]
          }
          semanaInicio={
            semanaInicio
          }
          franjas={
            estructura.sabado
          }
          detalles={
            detalles
          }
          abrirCelda={
            abrirCelda
          }
          diaEstaCompletoFestivo={
            diaEstaCompletoFestivo
          }
          alternarDiaFestivo={
            alternarDiaFestivo
          }
          colorEncabezadoHora={
            colorEncabezadoHora
          }
          colorColumnaHora={
            colorColumnaHora
          }
          colorEncabezadoDia={
            colorEncabezadoDia
          }
        />
      )}

      {hayDomingo && (
        <TablaDiaIndividual
          dia={
            DIAS_SEMANA[6]
          }
          semanaInicio={
            semanaInicio
          }
          franjas={
            estructura.domingo
          }
          detalles={
            detalles
          }
          abrirCelda={
            abrirCelda
          }
          diaEstaCompletoFestivo={
            diaEstaCompletoFestivo
          }
          alternarDiaFestivo={
            alternarDiaFestivo
          }
          colorEncabezadoHora={
            colorEncabezadoHora
          }
          colorColumnaHora={
            colorColumnaHora
          }
          colorEncabezadoDia={
            colorEncabezadoDia
          }
        />
      )}
    </div>
  )
}

// =========================================================
// LUNES A VIERNES
// =========================================================

function TablaLaborales({
  semanaInicio,
  estructura,
  detalles,
  abrirCelda,
  diaEstaCompletoFestivo,
  alternarDiaFestivo,
  colorEncabezadoHora,
  colorColumnaHora,
  colorEncabezadoDia,
}) {
  return (
    <div className="shrink-0">
      <table
        className="
          table-fixed
          border-collapse
        "
      >
        <thead>
          <tr>
            <th
              className="
                w-[135px]
                border
                border-blue-950
                px-2
                py-2
                text-center
                text-xs
                font-black                
              "
              style={{
              backgroundColor:
                colorEncabezadoHora,

              color:
                obtenerContraste(
                  colorEncabezadoHora
                ),
            }}
            >
              HORA
            </th>

            {estructura
              .diasLaborales
              .map(
                (
                  dia
                ) => (
                  <EncabezadoDia
                    key={
                      dia.dia_semana
                    }
                    dia={
                      dia
                    }
                    semanaInicio={
                      semanaInicio
                    }
                    colorEncabezadoDia={
                      colorEncabezadoDia
                    }
                    festivoCompleto={
                      diaEstaCompletoFestivo(
                        dia.dia_semana
                      )
                    }
                    alternarFestivo={
                      () =>
                        alternarDiaFestivo(
                          dia
                            .dia_semana
                        )
                    }
                  />
                )
              )}
          </tr>
        </thead>

        <tbody>
          {estructura
            .filasLaborales
            .map(
              (
                fila
              ) => {
                const primeraFranja =
                  estructura
                    .diasLaborales
                    .map(
                      (
                        dia
                      ) =>
                        fila
                          ?.celdas
                          ?.[
                            dia
                              .dia_semana
                          ]
                    )
                    .find(
                      Boolean
                    )

                return (
                  <tr
                    key={
                      fila.hora_inicio
                    }
                  >
                    <CeldaHora
                      franja={
                        primeraFranja
                      }
                      colorColumnaHora={
                        colorColumnaHora
                      }
                    />

                    {estructura
                      .diasLaborales
                      .map(
                        (
                          dia
                        ) => {
                          const franja =
                            fila
                              ?.celdas
                              ?.[
                                dia
                                  .dia_semana
                              ]

                          return (
                            <CeldaProgramacion
                              key={
                                dia.dia_semana
                              }
                              dia={
                                dia
                              }
                              franja={
                                franja
                              }
                              detalle={
                                franja
                                  ? detalles[
                                      claveCelda(
                                        dia
                                          .dia_semana,
                                        franja
                                          .hora_inicio
                                      )
                                    ]
                                  : null
                              }
                              abrirCelda={
                                abrirCelda
                              }
                            />
                          )
                        }
                      )}
                  </tr>
                )
              }
            )}
        </tbody>
      </table>
    </div>
  )
}

// =========================================================
// SÁBADO / DOMINGO
// =========================================================

function TablaDiaIndividual({
  dia,
  semanaInicio,
  franjas,
  detalles,
  abrirCelda,
  diaEstaCompletoFestivo,
  alternarDiaFestivo,
  colorEncabezadoHora,
  colorColumnaHora,
  colorEncabezadoDia,
}) {
  return (
    <div className="shrink-0">
      <table
        className="
          table-fixed
          border-collapse
        "
      >
        <thead>
          <tr>
            <th
              className="
                w-[135px]
                border
                border-blue-950
                px-2
                py-2
                text-center
                text-xs
                font-black
                text-white
              "
              style={{
                backgroundColor:
                colorEncabezadoHora,

              color:
                obtenerContraste(
                  colorEncabezadoHora
                ),
              }}
            >
              HORA
            </th>

            <EncabezadoDia
              dia={
                dia
              }
              semanaInicio={
                semanaInicio
              }
              
              festivoCompleto={
                diaEstaCompletoFestivo(
                  dia
                    .dia_semana
                )
              }
              colorEncabezadoDia={
                colorEncabezadoDia
              }
              alternarFestivo={
                () =>
                  alternarDiaFestivo(
                    dia
                      .dia_semana
                  )
              }
              ancho="w-[210px]"
            />
          </tr>
        </thead>

        <tbody>
          {franjas.map(
            (
              franja
            ) => (
              <tr
                key={
                  franja.hora_inicio
                }
              >
                <CeldaHora
                  franja={
                    franja
                  }
                  colorColumnaHora={
                    colorColumnaHora
                  }
                />

                <CeldaProgramacion
                  dia={
                    dia
                  }
                  franja={
                    franja
                  }
                  detalle={
                    detalles[
                      claveCelda(
                        dia
                          .dia_semana,
                        franja
                          .hora_inicio
                      )
                    ]
                  }
                  abrirCelda={
                    abrirCelda
                  }
                  ancho="w-[210px]"
                />
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}

// =========================================================
// ENCABEZADO DÍA
// =========================================================

function EncabezadoDia({
  dia,
  semanaInicio,
  festivoCompleto,
  alternarFestivo,
  colorEncabezadoDia,
  ancho =
    'w-[175px]',
}) {
  return (
    <th
      className={`
        ${ancho}
        border
        px-2
        py-1.5
        text-center
      `}
      style={{
        backgroundColor:
          colorEncabezadoDia,

        color:
          obtenerContraste(
            colorEncabezadoDia
          ),

        borderColor:
          COLOR_ENCABEZADO_DIA_BORDE,
      }}
    >
      <div
        className="
          text-[11px]
          font-black
        "
      >
        {dia.nombre}
      </div>

      <div
        className="
          mt-0.5
          text-[10px]
          font-bold
          opacity-80
        "
      >
        {formatearFechaDia(
          fechaCorrespondienteDia(
            semanaInicio,
            dia.dia_semana
          )
        )}
      </div>

      <button
        type="button"
        onClick={
          alternarFestivo
        }
        className={`
          mt-1
          rounded
          px-2
          py-0.5
          text-[9px]
          font-black
          ${
            festivoCompleto
              ? `
                bg-red-600
                text-white
              `
              : `
                text-red-600
                hover:bg-red-50
              `
          }
        `}
      >
        {festivoCompleto
          ? 'Limpiar festivo'
          : 'Marcar festivo'}
      </button>
    </th>
  )
}

// =========================================================
// CELDA HORA
// =========================================================

function CeldaHora({
  franja,
  colorColumnaHora,
}) {
  return (
    <td
      className="
        h-[88px]
        w-[135px]
        border
        border-blue-950
        px-2
        text-center
        align-middle
        text-[10px]
        font-black
        leading-4
        
      "
      style={{
        backgroundColor:
          colorColumnaHora,

        color:
          obtenerContraste(
            colorColumnaHora
          ),
      }}
    >
      {franja ? (
        <>
          <div>
            {formatearHora12(
              franja
                .hora_inicio
            )}
          </div>

          <div
            className="
              opacity-80
            "
          >
            a
          </div>

          <div>
            {formatearHora12(
              franja
                .hora_fin
            )}
          </div>
        </>
      ) : null}
    </td>
  )
}

// =========================================================
// CELDA PROGRAMACIÓN
// =========================================================

function CeldaProgramacion({
  dia,
  franja,
  detalle,
  abrirCelda,
  ancho =
    'w-[175px]',
}) {
  if (!franja) {
    return (
      <td
        className={`
          ${ancho}
          h-[88px]
          border
          border-slate-200
          bg-slate-100
        `}
      />
    )
  }

  return (
    <td
      className={`
        ${ancho}
        h-[88px]
        border
        border-slate-300
        bg-white
        p-1
        align-middle
      `}
    >
      {detalle ? (
        <TarjetaHorario
          detalle={
            detalle
          }
          onClick={
            () =>
              abrirCelda(
                dia,
                franja
              )
          }
        />
      ) : (
        <button
          type="button"
          onClick={
            () =>
              abrirCelda(
                dia,
                franja
              )
          }
          className="
            flex
            h-full
            min-h-[78px]
            w-full
            items-center
            justify-center
            rounded-md
            border
            border-dashed
            border-slate-300
            text-[10px]
            font-bold
            text-slate-400
            hover:border-blue-400
            hover:bg-blue-50
            hover:text-blue-600
          "
        >
          <i className="fa-solid fa-plus mr-1" />

          Programar
        </button>
      )}
    </td>
  )
}

// =========================================================
// TARJETA
// =========================================================

function TarjetaHorario({
  detalle,
  onClick,
}) {
  const tipo =
    mayusculas(
      detalle
        ?.tipo_elemento
    )

  const especial =
    tipo ===
      'RECESO' ||
    tipo ===
      'FESTIVO'

  const fondo =
    colorDetalle(
      detalle
    )

  const colorTexto =
    obtenerContraste(
      fondo
    )

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="
        flex
        h-full
        min-h-[78px]
        w-full
        flex-col
        items-center
        justify-center
        rounded-md
        border
        border-black/10
        px-2
        py-1.5
        text-center
        shadow-sm
        hover:brightness-95
      "
      style={{
        backgroundColor:
          fondo,

        color:
          colorTexto,
      }}
    >
      <span
        className="
          line-clamp-3
          text-[11px]
          font-black
          leading-tight
        "
      >
        {especial
          ? tipo
          : detalle
              ?.nombre ||
            'CLASE'}
      </span>

      {!especial &&
        (
          detalle
            ?.categorias_aplica ||
          []
        ).length >
          0 && (
          <span
            className="
              mt-1
              text-[9px]
              font-black
              opacity-90
            "
          >
            {detalle
              .categorias_aplica
              .join(
                ' · '
              )}
          </span>
        )}
    </button>
  )
}

// =========================================================
// VISTA PREVIA
// =========================================================

function VistaPrevia({
  empresa,
  logoUrl,
  titulo,
  semanaInicio,
  semanaFin,
  estructura,
  detalles,
  colorEncabezadoHora,
  colorColumnaHora,
  colorEncabezadoDia,
}) {
  return (
    <div
      className="
        overflow-auto
        rounded-lg
        bg-slate-200
        p-3
      "
    >
      <div
        className="
          mx-auto
          min-w-max
          bg-white
          p-5
        "
      >
        <div
          className="
            relative
            mb-4
            min-h-[90px]
            border-b-2
            border-blue-900
            pb-3
          "
        >
          <div
            className="
              absolute
              left-0
              top-0
              flex
              h-[75px]
              w-[190px]
              items-center
              justify-start
            "
          >
            {logoUrl ? (
              <img
                src={
                  logoUrl
                }
                alt="Logo CEA"
                className="
                  max-h-[72px]
                  max-w-[180px]
                  object-contain
                "
              />
            ) : (
              <div
                className="
                  rounded
                  border
                  border-dashed
                  border-slate-300
                  px-5
                  py-4
                  text-[10px]
                  font-bold
                  text-slate-400
                "
              >
                LOGO
              </div>
            )}
          </div>

          <div
            className="
              px-[200px]
              text-center
            "
          >
            <h2
              className="
                text-xl
                font-black
                uppercase
                text-slate-900
              "
            >
              {texto(
                titulo
              ) ||
                'HORARIO TEÓRICO'}
            </h2>

            <p
              className="
                mt-1
                text-sm
                font-bold
                text-slate-600
              "
            >
              {texto(
                empresa?.nombre
              ) ||
                texto(
                  empresa
                    ?.razon_social
                )}
            </p>

            <p
              className="
                mt-1
                text-xs
                font-bold
                text-slate-500
              "
            >
              Semana del{' '}
              {formatearFecha(
                semanaInicio
              )}{' '}
              al{' '}
              {formatearFecha(
                semanaFin
              )}
            </p>
          </div>
        </div>

        <div
          className="
            flex
            items-start
            gap-3
          "
        >
          {estructura
            .diasLaborales
            .length >
            0 && (
            <TablaPreviewLaborales
              semanaInicio={
                semanaInicio
              }
              estructura={
                estructura
              }
              detalles={
                detalles
              }
              colorEncabezadoHora={
                colorEncabezadoHora
              }
              colorColumnaHora={
                colorColumnaHora
              }
              colorEncabezadoDia={
                colorEncabezadoDia
              }
            />
          )}

          {estructura
            .sabado
            .length >
            0 && (
            <TablaPreviewDia
              dia={
                DIAS_SEMANA[5]
              }
              semanaInicio={
                semanaInicio
              }
              franjas={
                estructura
                  .sabado
              }
              detalles={
                detalles
              }
              colorEncabezadoHora={
                colorEncabezadoHora
              }
              colorColumnaHora={
                colorColumnaHora
              }
              colorEncabezadoDia={
                colorEncabezadoDia
              }
                          />
          )}

          {estructura
            .domingo
            .length >
            0 && (
            <TablaPreviewDia
              dia={
                DIAS_SEMANA[6]
              }
              semanaInicio={
                semanaInicio
              }
              franjas={
                estructura
                  .domingo
              }
              detalles={
                detalles
              }
              colorEncabezadoHora={
                colorEncabezadoHora
              }
              colorColumnaHora={
                colorColumnaHora
              }
              colorEncabezadoDia={
                colorEncabezadoDia
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}

// =========================================================
// PREVIEW LABORALES
// =========================================================

function TablaPreviewLaborales({
  semanaInicio,
  estructura,
  detalles,
  colorEncabezadoHora,
  colorColumnaHora,
  colorEncabezadoDia,
}) {
  return (
    <table className="table-fixed border-collapse">
      <thead>
        <tr>
          <th
            className="
              w-[125px]
              border
              border-blue-950
              p-2
              text-xs
              font-black
              
            "
            style={{
              backgroundColor:
              colorEncabezadoHora,

            color:
              obtenerContraste(
                colorEncabezadoHora
              ),
            }}
          >
            HORA
          </th>

          {estructura
            .diasLaborales
            .map(
              (
                dia
              ) => (
                <th
                  key={
                    dia.dia_semana
                  }
                  className="
                    w-[170px]
                    border
                    p-1
                    text-center
                  "
                  style={{
                    backgroundColor:
                    colorEncabezadoDia,

                  color:
                    obtenerContraste(
                      colorEncabezadoDia
                    ),

                    borderColor:
                      COLOR_ENCABEZADO_DIA_BORDE,
                  }}
                >
                  <div
                    className="
                      text-[11px]
                      font-black
                    "
                  >
                    {dia.nombre}
                  </div>

                  <div
                    className="
                      text-[9px]
                      font-bold
                      opacity-80
                    "
                  >
                    {formatearFechaDia(
                      fechaCorrespondienteDia(
                        semanaInicio,
                        dia
                          .dia_semana
                      )
                    )}
                  </div>
                </th>
              )
            )}
        </tr>
      </thead>

      <tbody>
        {estructura
          .filasLaborales
          .map(
            (
              fila
            ) => {
              const primera =
                estructura
                  .diasLaborales
                  .map(
                    (
                      dia
                    ) =>
                      fila
                        ?.celdas
                        ?.[
                          dia
                            .dia_semana
                        ]
                  )
                  .find(
                    Boolean
                  )

              return (
                <tr
                  key={
                    fila.hora_inicio
                  }
                >
                  <PreviewHora
                    franja={
                      primera
                    }
                    colorColumnaHora={
                      colorColumnaHora
                    }
                  />

                  {estructura
                    .diasLaborales
                    .map(
                      (
                        dia
                      ) => {
                        const franja =
                          fila
                            ?.celdas
                            ?.[
                              dia
                                .dia_semana
                            ]

                        return (
                          <PreviewCelda
                            key={
                              dia.dia_semana
                            }
                            franja={
                              franja
                            }
                            detalle={
                              franja
                                ? detalles[
                                    claveCelda(
                                      dia
                                        .dia_semana,
                                      franja
                                        .hora_inicio
                                    )
                                  ]
                                : null
                            }
                          />
                        )
                      }
                    )}
                </tr>
              )
            }
          )}
      </tbody>
    </table>
  )
}

// =========================================================
// PREVIEW DÍA
// =========================================================

function TablaPreviewDia({
  dia,
  semanaInicio,
  franjas,
  detalles,
  colorEncabezadoHora,
  colorColumnaHora,
  colorEncabezadoDia,
}) {
  return (
    <table className="table-fixed border-collapse">
      <thead>
        <tr>
          <th
            className="
              w-[125px]
              border
              border-blue-950
              p-2
              text-xs
              font-black              
            "
            style={{
              backgroundColor:
                colorEncabezadoHora,

              color:
                obtenerContraste(
                  colorEncabezadoHora
                ),
            }}
          >
            HORA
          </th>

          <th
            className="
              w-[195px]
              border
              p-1
              text-center
            "
            style={{
             backgroundColor:
                colorEncabezadoDia,

              color:
                obtenerContraste(
                  colorEncabezadoDia
                ),

              borderColor:
                COLOR_ENCABEZADO_DIA_BORDE,
            }}
                        >
            <div
              className="
                text-[11px]
                font-black
              "
            >
              {dia.nombre}
            </div>

            <div
              className="
                text-[9px]
                font-bold
                opacity-80
              "
            >
              {formatearFechaDia(
                fechaCorrespondienteDia(
                  semanaInicio,
                  dia.dia_semana
                )
              )}
            </div>
          </th>
        </tr>
      </thead>

      <tbody>
        {franjas.map(
          (
            franja
          ) => (
            <tr
              key={
                franja.hora_inicio
              }
            >
              <PreviewHora
                franja={
                  franja
                }
                colorColumnaHora={
                  colorColumnaHora
                }
              />

              <PreviewCelda
                franja={
                  franja
                }
                detalle={
                  detalles[
                    claveCelda(
                      dia
                        .dia_semana,
                      franja
                        .hora_inicio
                    )
                  ]
                }
              />
            </tr>
          )
        )}
      </tbody>
    </table>
  )
}

function PreviewHora({
  franja,
  colorColumnaHora,
}) {
  return (
    <td
      className="
        h-[68px]
        w-[125px]
        border
        border-blue-950
        px-2
        text-center
        align-middle
        text-[9px]
        font-black
        leading-[15px]
      "
      style={{
        backgroundColor:
          colorColumnaHora,

        color:
          obtenerContraste(
            colorColumnaHora
          ),
      }}
    >
      {franja ? (
        <div
          className="
            flex
            h-full
            flex-col
            items-center
            justify-center
          "
        >
          <div className="whitespace-nowrap">
            {formatearHora12Compacta(
              franja
                .hora_inicio
            )}
          </div>

          <div
            className="
              whitespace-nowrap
              opacity-80
            "
          >
            a
          </div>

          <div className="whitespace-nowrap">
            {formatearHora12Compacta(
              franja
                .hora_fin
            )}
          </div>
        </div>
      ) : null}
    </td>
  )
}

function PreviewCelda({
  franja,
  detalle,
}) {
  if (!franja) {
    return (
      <td
        className="
          h-[68px]
          border
          border-slate-300
          bg-slate-100
        "
      />
    )
  }

  if (!detalle) {
    return (
      <td
        className="
          h-[68px]
          border
          border-slate-400
          bg-white
        "
      />
    )
  }

  const tipo =
    mayusculas(
      detalle
        ?.tipo_elemento
    )

  const especial =
    tipo ===
      'RECESO' ||
    tipo ===
      'FESTIVO'

  const fondo =
    colorDetalle(
      detalle
    )

  return (
    <td
      className="
        h-[68px]
        border
        border-slate-500
        p-1
        text-center
        align-middle
      "
      style={{
        backgroundColor:
          fondo,

        color:
          obtenerContraste(
            fondo
          ),
      }}
    >
      <div
        className="
          text-[9px]
          font-black
          leading-tight
        "
      >
        {especial
          ? tipo
          : detalle
              ?.nombre}
      </div>

      {!especial &&
        (
          detalle
            ?.categorias_aplica ||
          []
        ).length >
          0 && (
          <div
            className="
              mt-1
              text-[8px]
              font-black
            "
          >
            {detalle
              .categorias_aplica
              .join(
                ' · '
              )}
          </div>
        )}
    </td>
  )
}

// =========================================================
// SELECTOR DE COLOR DEL HORARIO
// =========================================================

function SelectorColorHorario({
  titulo,
  descripcion,
  valor,
  onChange,
}) {
  const colorActual =
    texto(
      valor
    ) ||
    '#FFFFFF'

  const colorTexto =
    obtenerContraste(
      colorActual
    )

  return (
    <div
      className="
        rounded-lg
        border
        border-slate-200
        bg-white
        p-3
      "
    >
      <div
        className="
          mb-2
          flex
          items-center
          gap-2
        "
      >
        <div
          className="
            flex
            h-11
            min-w-[90px]
            items-center
            justify-center
            rounded-lg
            border
            border-black/10
            px-3
            text-[10px]
            font-black
          "
          style={{
            backgroundColor:
              colorActual,

            color:
              colorTexto,
          }}
        >
          MUESTRA
        </div>

        <div>
          <p
            className="
              text-xs
              font-black
              text-slate-800
            "
          >
            {titulo}
          </p>

          <p
            className="
              mt-0.5
              text-[10px]
              leading-4
              text-slate-500
            "
          >
            {descripcion}
          </p>
        </div>
      </div>

      <div
        className="
          grid
          grid-cols-[repeat(auto-fill,minmax(28px,1fr))]
          gap-1.5
        "
      >
        {PALETA_HORARIO.map(
          (
            color
          ) => {
            const seleccionado =
              mayusculas(
                color
              ) ===
              mayusculas(
                colorActual
              )

            return (
              <button
                key={
                  color
                }
                type="button"
                title={
                  color
                }
                onClick={
                  () =>
                    onChange(
                      color
                    )
                }
                className={`
                  relative
                  h-7
                  w-full
                  rounded-md
                  border
                  transition
                  hover:scale-110
                  ${
                    seleccionado
                      ? `
                        border-slate-900
                        ring-2
                        ring-blue-500
                        ring-offset-1
                      `
                      : `
                        border-black/15
                      `
                  }
                `}
                style={{
                  backgroundColor:
                    color,
                }}
              >
                {seleccionado && (
                  <i
                    className="
                      fa-solid
                      fa-check
                      text-[10px]
                    "
                    style={{
                      color:
                        obtenerContraste(
                          color
                        ),
                    }}
                  />
                )}
              </button>
            )
          }
        )}
      </div>
    </div>
  )
}

// =========================================================
// MODAL
// =========================================================

function Modal({
  titulo,
  cerrar,
  ancho =
    'max-w-2xl',
  children,
}) {
  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        bg-black/50
        p-3
      "
    >
      <div
        className={`
          flex
          max-h-[94vh]
          w-full
          flex-col
          overflow-hidden
          rounded-xl
          bg-white
          shadow-2xl
          ${ancho}
        `}
      >
        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-200
            bg-slate-800
            px-4
            py-2.5
            text-white
          "
        >
          <h2
            className="
              text-sm
              font-black
            "
          >
            {titulo}
          </h2>

          <button
            type="button"
            onClick={
              cerrar
            }
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              hover:bg-white/10
            "
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div
          className="
            flex-1
            overflow-y-auto
            p-4
          "
        >
          {children}
        </div>
      </div>
    </div>
  )
}