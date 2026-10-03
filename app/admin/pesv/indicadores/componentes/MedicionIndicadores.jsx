// app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx

'use client'

// ============================================================
// app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
// PESV - INDICADORES
// PESTAÑA: MEDICIÓN
// API: /api/admin/pesv/indicadores
//
// Flujo:
// 1. Configurar
// 2. Medir
// 3. Analizar
// 4. Validar / Cerrar
//
// TSV:
// - Resultado por nivel de pérdida.
// - Trimestre seleccionado.
// - Acumulado anual.
// - Línea base histórica automática si existe.
// - Comparación con el mismo periodo del año anterior.
// ============================================================

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Activity,
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Calculator,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDashed,
  ClipboardCheck,
  Database,
  FileText,
  Gauge,
  History,
  Info,
  LockKeyhole,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
  WandSparkles,
  XCircle,
} from 'lucide-react'

import TsvComparativa
  from './medicion/indicadores/TsvComparativa'

import TsvCumplimiento
  from './medicion/indicadores/TsvCumplimiento'

import TsvInterpretacion
  from './medicion/indicadores/TsvInterpretacion'

import TsvOrientacionAnalisis
  from './medicion/indicadores/TsvOrientacionAnalisis'

import {
  TsvConfiguracionFormulario,
  TsvConfiguracionRegistrada,
} from './medicion/indicadores/TsvConfiguracion'

import RsviMedicion
  from './medicion/indicadores/RsviMedicion'

import GrvMedicion
  from './medicion/indicadores/GrvMedicion'

import CmPesvMedicion
  from './medicion/indicadores/CmPesvMedicion'

import CplanPesvMedicion
  from './medicion/indicadores/CplanPesvMedicion'

import EjlcMedicion
  from './medicion/indicadores/EjlcMedicion'

import IdpMedicion
  from './medicion/indicadores/IdpMedicion'

import CpfPesvCumplimientoMedicion
  from './medicion/indicadores/CpfPesvCumplimientoMedicion'

import CpfPesvCoberturaMedicion
  from './medicion/indicadores/CpfPesvCoberturaMedicion'

import NcacMedicion
  from './medicion/indicadores/NcacMedicion'




// ============================================================
// CONSTANTES
// app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
// ============================================================

const API_INDICADORES =
  '/api/admin/pesv/indicadores'


const API_INDICADOR_RSVI =
  '/api/admin/pesv/indicadores/rsvi'


const API_INDICADOR_GRV =
  '/api/admin/pesv/indicadores/grv'


const API_INDICADOR_CM_PESV =
  '/api/admin/pesv/indicadores/cm-pesv'


const API_INDICADOR_CPLAN_PESV =
  '/api/admin/pesv/indicadores/cplan-pesv'


const API_INDICADOR_EJLC =
  '/api/admin/pesv/indicadores/ejlc'

const API_INDICADOR_IDP =
  '/api/admin/pesv/indicadores/idp'


const API_INDICADOR_CPF_PESV_CUMPLIMIENTO =
  '/api/admin/pesv/indicadores/cpf-pesv-cumplimiento'


const API_INDICADOR_CPF_PESV_COBERTURA =
  '/api/admin/pesv/indicadores/cpf-pesv-cobertura'

const API_INDICADOR_NCAC =
  '/api/admin/pesv/indicadores/ncac'


const MESES = [
  { numero: 1, nombre: 'Enero' },
  { numero: 2, nombre: 'Febrero' },
  { numero: 3, nombre: 'Marzo' },
  { numero: 4, nombre: 'Abril' },
  { numero: 5, nombre: 'Mayo' },
  { numero: 6, nombre: 'Junio' },
  { numero: 7, nombre: 'Julio' },
  { numero: 8, nombre: 'Agosto' },
  { numero: 9, nombre: 'Septiembre' },
  { numero: 10, nombre: 'Octubre' },
  { numero: 11, nombre: 'Noviembre' },
  { numero: 12, nombre: 'Diciembre' },
]


const TRIMESTRES = [
  {
    numero: 1,
    nombre: 'Primer trimestre',
  },
  {
    numero: 2,
    nombre: 'Segundo trimestre',
  },
  {
    numero: 3,
    nombre: 'Tercer trimestre',
  },
  {
    numero: 4,
    nombre: 'Cuarto trimestre',
  },
]


// ============================================================
// HELPERS GENERALES
// app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
// ============================================================

function texto(valor) {
  return String(
    valor ?? ''
  ).trim()
}


function numero(valor) {
  if (
    valor === '' ||
    valor === null ||
    valor === undefined
  ) {
    return null
  }

  const convertido =
    Number(valor)

  return Number.isFinite(
    convertido
  )
    ? convertido
    : null
}


function etiqueta(valor) {
  return texto(valor)
    .replaceAll(
      '_',
      ' '
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      letra =>
        letra.toUpperCase()
    )
}


function fechaHoy() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    )
}


function formatearNumero(
  valor,
  decimales = 2
) {
  const n =
    numero(valor)

  if (
    n === null
  ) {
    return '—'
  }

  return new Intl.NumberFormat(
    'es-CO',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits:
        decimales,
    }
  ).format(n)
}


function formatearNumeroFijo(
  valor,
  decimales = 1
) {
  const n =
    numero(valor)

  if (
    n === null
  ) {
    return '—'
  }

  return new Intl.NumberFormat(
    'es-CO',
    {
      minimumFractionDigits:
        decimales,
      maximumFractionDigits:
        decimales,
    }
  ).format(n)
}


function formatearKilometros(
  valor
) {
  const km =
    numero(valor)

  if (
    km === null
  ) {
    return '—'
  }

  return `${formatearNumeroFijo(
    km,
    1
  )} km`
}


function formatearResultado(
  valor,
  unidad
) {
  const n =
    numero(valor)

  if (
    n === null
  ) {
    return '—'
  }

  const unidadNormalizada =
    texto(unidad)
      .toUpperCase()

  if (
    unidadNormalizada ===
    'PORCENTAJE'
  ) {
    return `${formatearNumero(
      n
    )}%`
  }

  return formatearNumero(
    n
  )
}


function obtenerConfiguracion(
  indicadorId,
  configuraciones,
  anio
) {
  return (
    configuraciones.find(
      item =>
        Number(
          item?.indicador_id
        ) ===
          Number(
            indicadorId
          ) &&
        Number(
          item?.anio
        ) ===
          Number(anio)
    ) ||
    null
  )
}


function obtenerMedicionesIndicador(
  indicadorId,
  mediciones
) {
  return (
    mediciones || []
  )
    .filter(
      item =>
        Number(
          item?.indicador_id
        ) ===
        Number(
          indicadorId
        )
    )
    .sort(
      (
        a,
        b
      ) => {
        const fechaA =
          new Date(
            a?.periodo_hasta ||
            a?.fecha_medicion ||
            a?.created_at ||
            0
          ).getTime()

        const fechaB =
          new Date(
            b?.periodo_hasta ||
            b?.fecha_medicion ||
            b?.created_at ||
            0
          ).getTime()

        return fechaB -
          fechaA
      }
    )
}


// ============================================================
// PERIODICIDAD DEL INDICADOR
// app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
// ============================================================

function obtenerTipoPeriodoPorIndicador(
  indicador
) {
  const periodicidad =
    texto(
      indicador?.periodicidad
    ).toUpperCase()

  if (
    periodicidad.includes(
      'TRIMESTRAL'
    ) ||
    periodicidad.includes(
      'TRIMESTRE'
    )
  ) {
    return 'TRIMESTRE'
  }

  if (
    periodicidad.includes(
      'MENSUAL'
    ) ||
    periodicidad.includes(
      'ACUMULADO_MES'
    )
  ) {
    return 'MES'
  }

  return 'ANUAL'
}


function obtenerOrigenSugerido(
  indicador
) {
  const codigo =
    texto(
      indicador?.codigo
    ).toUpperCase()

  if (
    [
      'TSV',
      'CPLAN_PESV',
      'IDP',
      'CPF_PESV_CUMPLIMIENTO',
      'CPF_PESV_COBERTURA',
      'NCAC',
      'EJLC',
    ].includes(
      codigo
    )
  ) {
    return 'AUTOMATICO'
  }

  if (
    [
      'RSVI',
      'GRV',
      'CM_PESV',
      'CPMVH',
    ].includes(
      codigo
    )
  ) {
    return 'ASISTIDO'
  }

  return 'MANUAL'
}


function obtenerIconoSentido(
  sentido
) {
  const valor =
    texto(
      sentido
    ).toUpperCase()

  if (
    valor ===
    'ASCENDENTE'
  ) {
    return TrendingUp
  }

  if (
    valor ===
    'DESCENDENTE'
  ) {
    return TrendingDown
  }

  return Activity
}


function obtenerNombrePersona(
  persona
) {
  const nombre =
    [
      texto(
        persona?.nombres
      ),
      texto(
        persona?.apellidos
      ),
    ]
      .filter(Boolean)
      .join(' ')

  return (
    nombre ||
    texto(
      persona?.documento
    ) ||
    `Personal ${persona?.id}`
  )
}


// ============================================================
// NOMBRE DEL PERIODO
// app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
// ============================================================

function obtenerNombrePeriodo(
  tipoPeriodo,
  numeroPeriodo,
  anio
) {
  if (
    tipoPeriodo ===
    'TRIMESTRE'
  ) {
    const trimestre =
      TRIMESTRES.find(
        item =>
          Number(
            item.numero
          ) ===
          Number(
            numeroPeriodo
          )
      )

    return trimestre
      ? `${trimestre.nombre} ${anio}`
      : `Trimestre ${numeroPeriodo} ${anio}`
  }

  if (
    tipoPeriodo ===
    'MES'
  ) {
    const mes =
      MESES.find(
        item =>
          Number(
            item.numero
          ) ===
          Number(
            numeroPeriodo
          )
      )

    return mes
      ? `${mes.nombre} ${anio}`
      : `Mes ${numeroPeriodo} ${anio}`
  }

  return `Vigencia ${anio}`
}


// ============================================================
// VARIACIÓN PORCENTUAL
// app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
// ============================================================

function calcularVariacion(
  actual,
  anterior
) {
  const valorActual =
    numero(
      actual
    )

  const valorAnterior =
    numero(
      anterior
    )

  if (
    valorActual === null ||
    valorAnterior === null ||
    valorAnterior === 0
  ) {
    return null
  }

  return (
    (
      valorActual -
      valorAnterior
    ) /
    Math.abs(
      valorAnterior
    )
  ) * 100
}


// ============================================================
// INFORMACIÓN AMIGABLE SEGÚN INDICADOR
// app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
// ============================================================

function obtenerEtiquetasCalculo(
  indicador
) {
  const codigo =
    texto(
      indicador?.codigo
    ).toUpperCase()

  const etiquetas = {
    TSV: {
      numerador:
        'Siniestros viales registrados',
      denominador:
        'Kilómetros recorridos por toda la flota',
    },

    RSVI: {
      numerador:
        'Riesgos identificados al finalizar el año',
      denominador:
        'Riesgos identificados al iniciar el año',
    },

    GRV: {
      numerador:
        'Riesgos de valoración alta al finalizar',
      denominador:
        'Riesgos de valoración alta al iniciar',
    },

    CM_PESV: {
      numerador:
        'Metas alcanzadas',
      denominador:
        'Metas definidas',
    },

    CPLAN_PESV: {
      numerador:
        'Actividades ejecutadas',
      denominador:
        'Actividades programadas',
    },

    EJLC: {
      numerador:
        'Excesos de jornada detectados',
      denominador:
        'Total de días trabajados por conductores',
    },

    IDP: {
      numerador:
        'Vehículos inspeccionados',
      denominador:
        'Vehículos que trabajaron',
    },

    CPMVH: {
      numerador:
        'Mantenimientos preventivos ejecutados',
      denominador:
        'Mantenimientos preventivos programados',
    },

    CPF_PESV_CUMPLIMIENTO: {
      numerador:
        'Capacitaciones ejecutadas',
      denominador:
        'Capacitaciones programadas',
    },

    CPF_PESV_COBERTURA: {
      numerador:
        'Colaboradores capacitados',
      denominador:
        'Total de colaboradores',
    },

    NCAC: {
      numerador:
        'No conformidades cerradas',
      denominador:
        'No conformidades identificadas',
    },
  }

  return (
    etiquetas[codigo] || {
      numerador:
        'Valor utilizado como numerador',
      denominador:
        'Valor utilizado como denominador',
    }
  )
}



// ============================================================
// EXPLICACIÓN DEL RESULTADO
// app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
// ============================================================

function obtenerExplicacionIndicador(
  indicador,
  calculo
) {
  const codigo =
    texto(
      indicador?.codigo
    ).toUpperCase()

  const resultado =
    numero(
      calculo?.valor_resultado
    )

  if (
    codigo ===
    'TSV'
  ) {
    const datos =
      calculo
        ?.datos_calculo
        ?.periodo ||
      {}

    const tasas =
      datos
        ?.tasas_por_nivel ||
      {}

    const km =
      numero(
        datos?.kilometros_recorridos
      )

    const simples =
      numero(
        datos?.choques_simples
      ) || 0

    const tasaSimple =
      numero(
        tasas?.choques_simples
      )

    return {
      titulo:
        '¿Qué representan estas tasas?',

      descripcion:
        'El indicador TSV relaciona los eventos de siniestralidad vial con los kilómetros recorridos por toda la flota. La medición se realiza separadamente para fatalidades, heridos graves, heridos leves y choques simples.',

      interpretacion:
        km !== null &&
        km > 0
          ? `Durante el periodo la flota recorrió ${formatearKilometros(
              km
            )}. Se registraron ${formatearNumero(
              simples,
              0
            )} choques simples, cuya tasa normalizada es ${formatearNumeroFijo(
              tasaSimple,
              1
            )} por cada 1.000.000 de kilómetros recorridos.`
          : 'Para interpretar el indicador es necesario contar con los kilómetros recorridos por la flota durante el periodo.',

      mejora:
        'El sentido de mejora es descendente. Sin embargo, una tasa no debe interpretarse aisladamente como alta o baja: debe compararse con la línea base, periodos anteriores, la evolución acumulada y las metas definidas por la organización.',
    }
  }

  if (
    codigo ===
    'EJLC'
  ) {
    const datosCalculo =
      calculo?.datos_calculo ||
      {}

    const mensual =
      datosCalculo?.mensual ||
      {}

    const acumulado =
      datosCalculo?.acumulado_anual ||
      {}

    const ejd =
      numero(
        mensual?.EJD ??
        calculo?.numerador
      )

    const sdt =
      numero(
        mensual?.SDT ??
        calculo?.denominador
      )

    const ejlcMensual =
      numero(
        mensual?.EJLC ??
        calculo?.valor_resultado
      )

    const ejlcAcumulado =
      numero(
        acumulado?.EJLC
      )

    const identificadas =
      numero(
        mensual?.jornadas_identificadas
      )

    const incompletas =
      numero(
        mensual?.jornadas_informacion_insuficiente
      )

    const meta =
      numero(
        calculo?.valor_meta
      )

    const operador =
      texto(
        calculo?.operador_meta
      ) || '<='

    const lineaBase =
      numero(
        calculo?.linea_base
      )

    function cumpleMetaEJLC(valor) {
      if (
        valor === null ||
        meta === null
      ) {
        return null
      }

      if (operador === '<=') return valor <= meta
      if (operador === '<') return valor < meta
      if (operador === '>=') return valor >= meta
      if (operador === '>') return valor > meta
      if (operador === '=') return valor === meta
      return null
    }

    const cumpleMensual =
      cumpleMetaEJLC(
        ejlcMensual
      )

    const cumpleAcumulado =
      cumpleMetaEJLC(
        ejlcAcumulado
      )

    const partes = []

    if (
      ejlcMensual !== null &&
      ejd !== null &&
      sdt !== null
    ) {
      partes.push(
        `El resultado EJLC del periodo es ${formatearNumero(ejlcMensual)}%. Esto significa que, de ${formatearNumero(sdt, 0)} jornadas instructor/día con información suficiente para ser evaluadas (SDT), ${formatearNumero(ejd, 0)} presentaron más de 10 clases prácticas dictadas (EJD).`
      )
    }

    if (
      ejlcMensual !== null &&
      meta !== null
    ) {
      const diferencia =
        ejlcMensual - meta

      partes.push(
        `Frente a la meta institucional ${operador} ${formatearNumero(meta)}%, el resultado mensual ${cumpleMensual === true ? 'CUMPLE' : cumpleMensual === false ? 'NO CUMPLE' : 'queda pendiente de evaluación'}. La diferencia frente al valor de referencia de la meta es de ${formatearNumero(Math.abs(diferencia))} puntos porcentuales ${diferencia > 0 ? 'por encima' : diferencia < 0 ? 'por debajo' : 'sin diferencia'}.`
      )
    }

    if (
      ejlcAcumulado !== null
    ) {
      partes.push(
        `El acumulado de la vigencia hasta el periodo seleccionado es ${formatearNumero(ejlcAcumulado)}%${meta !== null ? ` y ${cumpleAcumulado === true ? 'CUMPLE' : cumpleAcumulado === false ? 'NO CUMPLE' : 'queda pendiente de evaluación'} frente a la misma meta institucional.` : '.'}`
      )
    }

    if (
      identificadas !== null &&
      sdt !== null
    ) {
      partes.push(
        `Se identificaron ${formatearNumero(identificadas, 0)} jornadas instructor/día; ${formatearNumero(sdt, 0)} fueron evaluables${incompletas !== null ? ` y ${formatearNumero(incompletas, 0)} presentaron información insuficiente y se excluyeron del SDT` : ''}. Las jornadas sin información suficiente no se consideran artificialmente como jornadas sin exceso.`
      )
    }

    if (
      ejlcMensual !== null &&
      lineaBase !== null
    ) {
      const diferenciaBase =
        ejlcMensual - lineaBase

      partes.push(
        `Frente a la línea base de ${formatearNumero(lineaBase)}%, el resultado mensual presenta una diferencia de ${formatearNumero(Math.abs(diferenciaBase))} puntos porcentuales ${diferenciaBase > 0 ? 'por encima' : diferenciaBase < 0 ? 'por debajo' : 'sin variación'}. Esta comparación describe el comportamiento frente al desempeño histórico; el cumplimiento se determina contra la meta configurada.`
      )
    }

    return {
      titulo:
        '¿Qué representa este resultado?',

      descripcion:
        'El EJLC mide la proporción de jornadas instructor/día evaluables en las que se superó el criterio operacional de 10 clases prácticas dictadas. El cálculo utiliza EJD / SDT × 100 y conserva la trazabilidad de Horarios y Programación de clases.',

      interpretacion:
        partes.length > 0
          ? partes.join(' ')
          : 'Realice el cálculo para interpretar el resultado mensual, el acumulado anual, el cumplimiento de la meta y la calidad de la información.',

      mejora:
        'El sentido de mejora es descendente: un porcentaje menor representa menos jornadas con exceso. La meta institucional configurada es el criterio para determinar CUMPLE o NO CUMPLE; la línea base se utiliza como referencia histórica.',
    }
  }

  if (
    codigo ===
    'CPLAN_PESV'
  ) {
    return {
      titulo:
        '¿Qué representa este porcentaje?',

      descripcion:
        'Muestra qué proporción de las actividades programadas en el Plan Anual de Trabajo PESV fueron ejecutadas.',

      interpretacion:
        resultado !== null
          ? `El resultado indica que se ha alcanzado un ${formatearNumero(
              resultado
            )}% de cumplimiento del plan para el periodo evaluado.`
          : 'El porcentaje se calcula comparando las actividades ejecutadas con las actividades programadas.',

      mejora:
        'El sentido de mejora es ascendente: cuanto mayor sea el porcentaje, mejor es el nivel de cumplimiento.',
    }
  }

  if (
    codigo ===
    'IDP'
  ) {
    return {
      titulo:
        '¿Qué representa este porcentaje?',

      descripcion:
        'Mide la proporción de vehículos/día con operación confirmada que cuentan con inspección preoperacional registrada.',

      interpretacion:
        resultado !== null
          ? `Un resultado de ${formatearNumero(
              resultado
            )}% indica el nivel de cobertura alcanzado en las inspecciones preoperacionales de los vehículos/día con operación confirmada para el periodo evaluado.`
          : 'El indicador permite conocer el nivel de cobertura de las inspecciones preoperacionales de los vehículos/día con operación confirmada.',

      mejora:
        'El sentido de mejora es ascendente: una mayor cobertura representa un mejor cumplimiento.',
    }
  }

  if (
    codigo ===
    'NCAC'
  ) {
    return {
      titulo:
        '¿Qué representa este porcentaje?',

      descripcion:
        'Indica qué proporción de las no conformidades identificadas en auditoría han sido gestionadas y cerradas.',

      interpretacion:
        resultado !== null
          ? `El resultado muestra un ${formatearNumero(
              resultado
            )}% de cierre de no conformidades.`
          : 'El porcentaje compara las no conformidades cerradas con las no conformidades identificadas.',

      mejora:
        'El sentido de mejora es ascendente: un mayor porcentaje significa una mejor gestión de cierre.',
    }
  }

  return {
    titulo:
      '¿Qué representa este resultado?',

    descripcion:
      indicador?.descripcion ||
      'El resultado muestra el comportamiento del indicador durante el periodo evaluado.',

    interpretacion:
      resultado !== null
        ? `El valor obtenido para este periodo es ${formatearResultado(
            resultado,
            indicador?.unidad
          )}.`
        : 'Realice el cálculo para obtener el resultado del indicador.',

    mejora:
      texto(
        indicador?.sentido_mejora
      ).toUpperCase() ===
        'DESCENDENTE'
        ? 'El sentido de mejora es descendente: los valores menores representan una evolución favorable.'
        : 'El sentido de mejora es ascendente: los valores mayores representan una evolución favorable.',
  }
}


// ============================================================
// COMPONENTE PRINCIPAL
// app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
// ============================================================

export default function MedicionIndicadores({
  nit,
  usuario,
  anio,
  empresa,
  indicadores = [],
  configuraciones = [],
  mediciones = [],
  personal = [],
  indicadorSeleccionadoId,
  setIndicadorSeleccionadoId,
  onActualizar,
  onExito,
  onError,
}) {

  // ==========================================================
  // ESTADOS PRINCIPALES
  // ==========================================================

  const [
    procesando,
    setProcesando,
  ] =
    useState(false)

  const [
    editandoConfiguracion,
    setEditandoConfiguracion,
  ] =
    useState(false)

  const [
    resultadoCalculo,
    setResultadoCalculo,
  ] =
    useState(null)


  const [
    datosRsvi,
    setDatosRsvi,
  ] =
    useState(null)


  const [
    datosGrv,
    setDatosGrv,
  ] =
    useState(null)


  const [
    datosCmPesv,
    setDatosCmPesv,
  ] =
    useState(null)


  const [
    datosCplanPesv,
    setDatosCplanPesv,
  ] =
    useState(null)


  const [
    datosEjlc,
    setDatosEjlc,
  ] =
    useState(null)

  const [
    datosIdp,
    setDatosIdp,
  ] =
    useState(null)


  const [
    datosCpfPesvCumplimiento,
    setDatosCpfPesvCumplimiento,
  ] =
    useState(null)

  const [
    datosCpfPesvCobertura,
    setDatosCpfPesvCobertura,
  ] =
    useState(null)

  const [
    datosNcac,
    setDatosNcac,
  ] =
    useState(null)

  const [
    medicionSeleccionada,
    setMedicionSeleccionada,
  ] =
    useState(null)


  // ==========================================================
  // CONFIGURACIÓN
  // ==========================================================

  const [
    lineaBase,
    setLineaBase,
  ] =
    useState('')

  const [
    valorMeta,
    setValorMeta,
  ] =
    useState('')

  const [
    operadorMeta,
    setOperadorMeta,
  ] =
    useState('>=')

  const [
    unidadMeta,
    setUnidadMeta,
  ] =
    useState('')

  const [
    fuenteInformacion,
    setFuenteInformacion,
  ] =
    useState('')

  const [
    observacionesConfiguracion,
    setObservacionesConfiguracion,
  ] =
    useState('')

  const [
    interpretacionIndicador,
    setInterpretacionIndicador,
  ] =
    useState('')

  const [
    personasDebenConocerResultado,
    setPersonasDebenConocerResultado,
  ] =
    useState('')

  // ==========================================================
  // CONFIGURACIÓN ESPECÍFICA TSV
  // app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
  //
  // TSV maneja línea base y meta independiente para:
  // - Fatalidades
  // - Heridos graves
  // - Heridos leves
  // - Choques simples
  // ==========================================================

  const [
    origenLineaBaseTsv,
    setOrigenLineaBaseTsv,
  ] =
    useState('AUTOMATICA')

  const [
    anioReferenciaTsv,
    setAnioReferenciaTsv,
  ] =
    useState('')

  const [
    lineaBaseTsv,
    setLineaBaseTsv,
  ] =
    useState({
      fatalidades: '',
      heridos_graves: '',
      heridos_leves: '',
      choques_simples: '',
    })

  const [
    metasTsv,
    setMetasTsv,
  ] =
    useState({
      fatalidades: {
        operador: '<=',
        valor: '',
      },

      heridos_graves: {
        operador: '<=',
        valor: '',
      },

      heridos_leves: {
        operador: '<=',
        valor: '',
      },

      choques_simples: {
        operador: '<=',
        valor: '',
      },
    })



  // ==========================================================
  // PERIODO
  // ==========================================================

  const [
    numeroPeriodo,
    setNumeroPeriodo,
  ] =
    useState('')

  const [
    fechaMedicion,
    setFechaMedicion,
  ] =
    useState(
      fechaHoy()
    )


  // ==========================================================
  // MEDICIÓN
  // ==========================================================

  const [
    numerador,
    setNumerador,
  ] =
    useState('')

  const [
    denominador,
    setDenominador,
  ] =
    useState('')

  const [
    valorResultado,
    setValorResultado,
  ] =
    useState('')

  const [
    analisisResultado,
    setAnalisisResultado,
  ] =
    useState('')

  const [
    observacionesMedicion,
    setObservacionesMedicion,
  ] =
    useState('')

  const [
    responsablePersonalId,
    setResponsablePersonalId,
  ] =
    useState('')


  // ==========================================================
  // INDICADOR SELECCIONADO
  // ==========================================================

  const indicadorSeleccionado =
    useMemo(
      () =>
        indicadores.find(
          item =>
            Number(
              item?.id
            ) ===
            Number(
              indicadorSeleccionadoId
            )
        ) ||
        indicadores[0] ||
        null,
      [
        indicadores,
        indicadorSeleccionadoId,
      ]
    )


  const tipoPeriodoIndicador =
    useMemo(
      () =>
        indicadorSeleccionado
          ? obtenerTipoPeriodoPorIndicador(
              indicadorSeleccionado
            )
          : 'ANUAL',
      [
        indicadorSeleccionado,
      ]
    )


  const codigoIndicador =
    texto(
      indicadorSeleccionado
        ?.codigo
    ).toUpperCase()


  const esTsv =
    codigoIndicador ===
    'TSV'


  const esRsvi =
    codigoIndicador ===
    'RSVI'


  const esGrv =
    codigoIndicador ===
    'GRV'


  const esCmPesv =
    codigoIndicador ===
    'CM_PESV'


  const esCplanPesv =
    codigoIndicador ===
    'CPLAN_PESV'


  const esEjlc =
    codigoIndicador ===
    'EJLC'

  const esIdp =
    codigoIndicador ===
    'IDP'


  const esCpfPesvCumplimiento =
    codigoIndicador ===
    'CPF_PESV_CUMPLIMIENTO'


  const esCpfPesvCobertura =
    codigoIndicador ===
    'CPF_PESV_COBERTURA'

  const esNcac =
    codigoIndicador ===
    'NCAC'


  // ==========================================================
  // CONFIGURACIÓN ACTUAL
  // ==========================================================

  const configuracionActual =
    useMemo(
      () =>
        indicadorSeleccionado
          ? obtenerConfiguracion(
              indicadorSeleccionado.id,
              configuraciones,
              anio
            )
          : null,
      [
        indicadorSeleccionado,
        configuraciones,
        anio,
      ]
    )


  // ==========================================================
  // MEDICIONES
  // ==========================================================

  const medicionesIndicador =
    useMemo(
      () =>
        indicadorSeleccionado
          ? obtenerMedicionesIndicador(
              indicadorSeleccionado.id,
              mediciones
            )
          : [],
      [
        indicadorSeleccionado,
        mediciones,
      ]
    )


  // ==========================================================
  // INDICADOR INICIAL
  // ==========================================================

  useEffect(
    () => {
      if (
        !indicadores.length
      ) {
        return
      }

      const existe =
        indicadores.some(
          item =>
            Number(
              item.id
            ) ===
            Number(
              indicadorSeleccionadoId
            )
        )

      if (
        !existe
      ) {
        setIndicadorSeleccionadoId?.(
          indicadores[0].id
        )
      }
    },
    [
      indicadores,
      indicadorSeleccionadoId,
      setIndicadorSeleccionadoId,
    ]
  )


  // ==========================================================
  // CARGAR DATOS AL CAMBIAR INDICADOR
  // ==========================================================

  useEffect(
    () => {
      if (
        !indicadorSeleccionado
      ) {
        return
      }

      const configuracion =
        obtenerConfiguracion(
          indicadorSeleccionado.id,
          configuraciones,
          anio
        )

      setLineaBase(
        configuracion?.linea_base ??
        ''
      )

      setValorMeta(
        configuracion?.valor_meta ??
        ''
      )

      setOperadorMeta(
        configuracion?.operador_meta ||
        (
          texto(
            indicadorSeleccionado.sentido_mejora
          ).toUpperCase() ===
          'DESCENDENTE'
            ? '<='
            : '>='
        )
      )

      setUnidadMeta(
        configuracion?.unidad_meta ||
        indicadorSeleccionado?.unidad ||
        ''
      )

      setFuenteInformacion(
        configuracion?.fuente_informacion ||
        indicadorSeleccionado?.fuente_datos ||
        ''
      )

      setInterpretacionIndicador(
        configuracion?.interpretacion_indicador ||
        ''
      )

      setPersonasDebenConocerResultado(
        configuracion?.personas_deben_conocer_resultado ||
        ''
      )

      setObservacionesConfiguracion(
        configuracion?.observaciones ||
        ''
      )


      // ======================================================
      // CARGAR CONFIGURACIÓN ESPECÍFICA TSV
      // app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
      // ======================================================

      if (
        texto(
          indicadorSeleccionado?.codigo
        ).toUpperCase() ===
        'TSV'
      ) {
        const especifica =
          configuracion
            ?.configuracion_especifica ||
          {}

        const lineaBaseEspecifica =
          especifica
            ?.linea_base ||
          {}

        const metasEspecificas =
          especifica
            ?.metas ||
          {}

        setOrigenLineaBaseTsv(
          lineaBaseEspecifica
            ?.origen ||
          'AUTOMATICA'
        )

        setAnioReferenciaTsv(
          lineaBaseEspecifica
            ?.anio_referencia ??
          ''
        )

        setLineaBaseTsv({
          fatalidades:
            lineaBaseEspecifica
              ?.fatalidades ??
            '',

          heridos_graves:
            lineaBaseEspecifica
              ?.heridos_graves ??
            '',

          heridos_leves:
            lineaBaseEspecifica
              ?.heridos_leves ??
            '',

          choques_simples:
            lineaBaseEspecifica
              ?.choques_simples ??
            '',
        })

        setMetasTsv({
          fatalidades: {
            operador:
              metasEspecificas
                ?.fatalidades
                ?.operador ||
              '<=',

            valor:
              metasEspecificas
                ?.fatalidades
                ?.valor ??
              '',
          },

          heridos_graves: {
            operador:
              metasEspecificas
                ?.heridos_graves
                ?.operador ||
              '<=',

            valor:
              metasEspecificas
                ?.heridos_graves
                ?.valor ??
              '',
          },

          heridos_leves: {
            operador:
              metasEspecificas
                ?.heridos_leves
                ?.operador ||
              '<=',

            valor:
              metasEspecificas
                ?.heridos_leves
                ?.valor ??
              '',
          },

          choques_simples: {
            operador:
              metasEspecificas
                ?.choques_simples
                ?.operador ||
              '<=',

            valor:
              metasEspecificas
                ?.choques_simples
                ?.valor ??
              '',
          },
        })
      } else {
        setOrigenLineaBaseTsv(
          'AUTOMATICA'
        )

        setAnioReferenciaTsv(
          ''
        )

        setLineaBaseTsv({
          fatalidades: '',
          heridos_graves: '',
          heridos_leves: '',
          choques_simples: '',
        })

        setMetasTsv({
          fatalidades: {
            operador: '<=',
            valor: '',
          },

          heridos_graves: {
            operador: '<=',
            valor: '',
          },

          heridos_leves: {
            operador: '<=',
            valor: '',
          },

          choques_simples: {
            operador: '<=',
            valor: '',
          },
        })
      }

      setEditandoConfiguracion(
        !configuracion
      )

      const tipoSugerido =
        obtenerTipoPeriodoPorIndicador(
          indicadorSeleccionado
        )

      if (
        tipoSugerido ===
        'TRIMESTRE'
      ) {
        setNumeroPeriodo('1')
      } else if (
        tipoSugerido ===
        'MES'
      ) {
        setNumeroPeriodo('1')
      } else {
        setNumeroPeriodo('')
      }

      setFechaMedicion(
        fechaHoy()
      )

      setResultadoCalculo(null)
      setDatosRsvi(null)
      setDatosGrv(null)
      setDatosCmPesv(null)
      setDatosCplanPesv(null)
      setDatosEjlc(null)
      setDatosIdp(null)
      setDatosCpfPesvCumplimiento(null)
      setDatosCpfPesvCobertura(null)
      setDatosNcac(null)
      setMedicionSeleccionada(null)

      setNumerador('')
      setDenominador('')
      setValorResultado('')
      setAnalisisResultado('')
      setObservacionesMedicion('')
      setResponsablePersonalId('')
    },
    [
      indicadorSeleccionado,
      configuraciones,
      anio,
    ]
  )


  // ==========================================================
  // SOLICITAR API
  // ==========================================================

  async function solicitarApi(
    metodo,
    body
  ) {
    const respuesta =
      await fetch(
        API_INDICADORES,
        {
          method:
            metodo,

          headers: {
            'Content-Type':
              'application/json',

            'x-cea-nit':
              nit,
          },

          body:
            JSON.stringify({
              ...body,
              nit,
              usuario,
            }),

          cache:
            'no-store',
        }
      )

    const resultado =
      await respuesta.json()

    if (
      !respuesta.ok ||
      resultado?.status ===
        'failed'
    ) {
      throw new Error(
        resultado?.message ||
        'No fue posible completar la operación.'
      )
    }

    return resultado
  }

  // ==========================================================
  // CONSULTAR CÁLCULO ESPECÍFICO RSVI
  // API: GET /api/admin/pesv/indicadores/rsvi
  //
  // Devuelve la respuesta completa para RsviMedicion.jsx y,
  // además, adapta el cálculo al flujo común de guardado.
  // ==========================================================

  async function solicitarCalculoRsvi() {
    const parametros =
      new URLSearchParams({
        nit: String(nit),
        anio: String(Number(anio)),
      })

    const respuesta =
      await fetch(
        `${API_INDICADOR_RSVI}?${parametros.toString()}`,
        {
          method: 'GET',
          headers: {
            'x-cea-nit': nit,
          },
          cache: 'no-store',
        }
      )

    const resultado =
      await respuesta.json()

    if (
      !respuesta.ok ||
      resultado?.ok !== true
    ) {
      throw new Error(
        resultado?.message ||
        'No fue posible calcular el indicador RSVI.'
      )
    }

    if (
      !resultado?.calculo
    ) {
      throw new Error(
        'La API RSVI no devolvió el resultado del cálculo.'
      )
    }

    return resultado
  }


  // ==========================================================
  // CONSULTAR CÁLCULO ESPECÍFICO GRV
  // API: GET /api/admin/pesv/indicadores/grv
  //
  // Devuelve la respuesta completa para GrvMedicion.jsx y,
  // además, adapta el cálculo al flujo común de guardado.
  // ==========================================================

  async function solicitarCalculoGrv() {
    const parametros =
      new URLSearchParams({
        nit: String(nit),
        anio: String(Number(anio)),
      })

    const respuesta =
      await fetch(
        `${API_INDICADOR_GRV}?${parametros.toString()}`,
        {
          method: 'GET',
          headers: {
            'x-cea-nit': nit,
          },
          cache: 'no-store',
        }
      )

    const resultado =
      await respuesta.json()

    if (
      !respuesta.ok ||
      resultado?.ok !== true
    ) {
      throw new Error(
        resultado?.message ||
        'No fue posible calcular el indicador GRV.'
      )
    }

    if (
      !resultado?.calculo
    ) {
      throw new Error(
        'La API GRV no devolvió el resultado del cálculo.'
      )
    }

    return resultado
  }



  // ==========================================================
  // CONSULTAR CÁLCULO ESPECÍFICO CM_PESV
  // API: GET /api/admin/pesv/indicadores/cm-pesv
  //
  // CM_PESV = MA(t) / TM(t) * 100
  // MA(t): metas alcanzadas.
  // TM(t): número total de metas definidas en el PESV.
  // ==========================================================

  async function solicitarCalculoCmPesv() {
    const parametros =
      new URLSearchParams({
        nit: String(nit),
        anio: String(Number(anio)),
        tipo_periodo:
          tipoPeriodoIndicador,
      })

    if (
      tipoPeriodoIndicador ===
      'TRIMESTRE'
    ) {
      parametros.set(
        'numero_periodo',
        String(
          Number(
            numeroPeriodo
          )
        )
      )
    }

    const respuesta =
      await fetch(
        `${API_INDICADOR_CM_PESV}?${parametros.toString()}`,
        {
          method: 'GET',
          headers: {
            'x-cea-nit': nit,
          },
          cache: 'no-store',
        }
      )

    const resultado =
      await respuesta.json()

    if (
      !respuesta.ok ||
      resultado?.ok !== true
    ) {
      throw new Error(
        resultado?.message ||
        'No fue posible calcular el indicador CM_PESV.'
      )
    }

    if (
      !resultado?.calculo
    ) {
      throw new Error(
        'La API CM_PESV no devolvió el resultado del cálculo.'
      )
    }

    return resultado
  }



  // ==========================================================
  // CONSULTAR CÁLCULO ESPECÍFICO CPLAN_PESV
  // API: GET /api/admin/pesv/indicadores/cplan-pesv
  //
  // CPLAN_PESV = AEPlan(t) / APPlan(t) * 100
  // AEPlan(t): actividades ejecutadas.
  // APPlan(t): actividades programadas.
  // ==========================================================

  async function solicitarCalculoCplanPesv() {
    const parametros =
      new URLSearchParams({
        nit: String(nit),
        anio: String(Number(anio)),
        tipo_periodo:
          tipoPeriodoIndicador,
      })

    if (
      tipoPeriodoIndicador ===
      'TRIMESTRE'
    ) {
      parametros.set(
        'numero_periodo',
        String(
          Number(
            numeroPeriodo
          )
        )
      )
    }

    const respuesta =
      await fetch(
        `${API_INDICADOR_CPLAN_PESV}?${parametros.toString()}`,
        {
          method: 'GET',
          headers: {
            'x-cea-nit': nit,
          },
          cache: 'no-store',
        }
      )

    const resultado =
      await respuesta.json()

    if (
      !respuesta.ok ||
      resultado?.ok !== true
    ) {
      throw new Error(
        resultado?.message ||
        'No fue posible calcular el indicador CPLAN_PESV.'
      )
    }

    if (
      !resultado?.calculo
    ) {
      throw new Error(
        'La API CPLAN_PESV no devolvió el resultado del cálculo.'
      )
    }

    return resultado
  }




  // ==========================================================
  // CONSULTAR CÁLCULO ESPECÍFICO EJLC
  // API: GET /api/admin/pesv/indicadores/ejlc
  // EJLC = EJD / SDT * 100
  // ==========================================================

  async function solicitarCalculoEjlc() {
    const parametros =
      new URLSearchParams({
        nit: String(nit),
        anio: String(Number(anio)),
        mes: String(Number(numeroPeriodo)),
      })

    const respuesta =
      await fetch(
        `${API_INDICADOR_EJLC}?${parametros.toString()}`,
        {
          method: 'GET',
          headers: {
            'x-cea-nit': nit,
          },
          cache: 'no-store',
        }
      )

    const resultado =
      await respuesta.json()

    if (
      !respuesta.ok ||
      resultado?.status !== 'success' ||
      !resultado?.data
    ) {
      throw new Error(
        resultado?.message ||
        'No fue posible calcular el indicador EJLC.'
      )
    }

    return resultado.data
  }

  // ==========================================================
  // CONSULTAR CÁLCULO ESPECÍFICO IDP
  // IDP = VID / TV * 100
  // ==========================================================
  async function solicitarCalculoIdp() {
    const parametros = new URLSearchParams({
      nit: String(nit),
      anio: String(Number(anio)),
      mes: String(Number(numeroPeriodo)),
    })

    const respuesta = await fetch(
      `${API_INDICADOR_IDP}?${parametros.toString()}`,
      {
        method: 'GET',
        headers: { 'x-cea-nit': nit },
        cache: 'no-store',
      }
    )

    const resultado = await respuesta.json()

    if (
      !respuesta.ok ||
      resultado?.status !== 'success' ||
      !resultado?.data
    ) {
      throw new Error(
        resultado?.message ||
        'No fue posible calcular el indicador IDP.'
      )
    }

    return resultado.data
  }



  // ==========================================================
  // CONSULTAR CÁLCULO ESPECÍFICO CPF_PESV_CUMPLIMIENTO
  // API: GET /api/admin/pesv/indicadores/cpf-pesv-cumplimiento
  // CPF = capacitaciones ejecutadas / programadas * 100
  // ==========================================================

  async function solicitarCalculoCpfPesvCumplimiento() {
    const parametros =
      new URLSearchParams({
        nit: String(nit),
        anio: String(Number(anio)),
        tipo_periodo:
          tipoPeriodoIndicador,
      })

    if (
      tipoPeriodoIndicador ===
      'TRIMESTRE'
    ) {
      parametros.set(
        'numero_periodo',
        String(
          Number(
            numeroPeriodo
          )
        )
      )
    }

    const respuesta =
      await fetch(
        `${API_INDICADOR_CPF_PESV_CUMPLIMIENTO}?${parametros.toString()}`,
        {
          method: 'GET',
          headers: {
            'x-cea-nit': nit,
          },
          cache: 'no-store',
        }
      )

    const resultado =
      await respuesta.json()

    if (
      !respuesta.ok ||
      resultado?.ok !== true
    ) {
      throw new Error(
        resultado?.message ||
        'No fue posible calcular el indicador CPF_PESV_CUMPLIMIENTO.'
      )
    }

    if (
      !resultado?.calculo
    ) {
      throw new Error(
        'La API CPF_PESV_CUMPLIMIENTO no devolvió el resultado del cálculo.'
      )
    }

    return resultado
  }

  // CONSULTAR CÁLCULO ESPECÍFICO CPF_PESV_COBERTURA
  // API: GET /api/admin/pesv/indicadores/cpf-pesv-cobertura
  // CPF = colaboradores capacitados / total de colaboradores * 100
  // ==========================================================

  async function solicitarCalculoCpfPesvCobertura() {
    const parametros =
      new URLSearchParams({
        nit: String(nit),
        anio: String(Number(anio)),
        tipo_periodo:
          tipoPeriodoIndicador,
      })

    if (
      tipoPeriodoIndicador ===
      'TRIMESTRE'
    ) {
      parametros.set(
        'numero_periodo',
        String(
          Number(
            numeroPeriodo
          )
        )
      )
    }

    const respuesta =
      await fetch(
        `${API_INDICADOR_CPF_PESV_COBERTURA}?${parametros.toString()}`,
        {
          method: 'GET',
          headers: {
            'x-cea-nit': nit,
          },
          cache: 'no-store',
        }
      )

    const resultado =
      await respuesta.json()

    if (
      !respuesta.ok ||
      resultado?.ok !== true
    ) {
      throw new Error(
        resultado?.message ||
        'No fue posible calcular el indicador CPF_PESV_COBERTURA.'
      )
    }

    if (
      !resultado?.calculo
    ) {
      throw new Error(
        'La API CPF_PESV_COBERTURA no devolvió el resultado del cálculo.'
      )
    }

    return resultado
  }


  // ==========================================================
  // CONSULTAR CÁLCULO ESPECÍFICO NCAC
  // API: GET /api/admin/pesv/indicadores/ncac
  // NCAC = NCG / NCI * 100
  // Periodicidad: ANUAL
  // ==========================================================

  async function solicitarCalculoNcac() {
    const parametros =
      new URLSearchParams({
        nit: String(nit),
        anio: String(Number(anio)),
      })

    const respuesta =
      await fetch(
        `${API_INDICADOR_NCAC}?${parametros.toString()}`,
        {
          method: 'GET',
          headers: {
            'x-cea-nit': nit,
          },
          cache: 'no-store',
        }
      )

    const resultado =
      await respuesta.json()

    if (
      !respuesta.ok ||
      resultado?.ok !== true
    ) {
      throw new Error(
        resultado?.message ||
        'No fue posible calcular el indicador NCAC.'
      )
    }

    if (
      !resultado?.calculo
    ) {
      throw new Error(
        'La API NCAC no devolvió el resultado del cálculo.'
      )
    }

    return resultado
  }


    // ==========================================================
  // CALCULAR LÍNEA BASE HISTÓRICA TSV
  // app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
  // API: POST /api/admin/pesv/indicadores
  // ACCIÓN: calcular_indicador
  //
  // Obtiene desde la API el año anterior completo y toma las
  // tasas por nivel de pérdida como línea base histórica.
  // ==========================================================

  async function calcularLineaBaseHistoricaTsv() {
    if (
      !indicadorSeleccionado ||
      !esTsv
    ) {
      return
    }

    if (
      tipoPeriodoIndicador ===
        'TRIMESTRE' &&
      ![1, 2, 3, 4].includes(
        Number(
          numeroPeriodo
        )
      )
    ) {
      onError?.(
        'Seleccione un trimestre para consultar la línea base histórica.'
      )

      return
    }

    setProcesando(true)

    try {
      const resultado =
        await solicitarApi(
          'POST',
          {
            accion:
              'calcular_indicador',

            indicador_id:
              indicadorSeleccionado.id,

            anio:
              Number(anio),

            tipo_periodo:
              'TRIMESTRE',

            numero_periodo:
              Number(
                numeroPeriodo
              ) || 1,

            fecha_medicion:
              fechaMedicion,
          }
        )

      const historico =
        resultado
          ?.calculo
          ?.datos_calculo
          ?.linea_base_historica

      if (
        !historico ||
        historico?.disponible !==
          true
      ) {
        throw new Error(
          `No existe información histórica suficiente para calcular automáticamente la línea base TSV del año ${Number(anio) - 1}. Puede seleccionar origen manual y registrar los valores con soporte histórico.`
        )
      }

      const tasas =
        historico
          ?.tasas_por_nivel ||
        {}

      setOrigenLineaBaseTsv(
        'AUTOMATICA'
      )

      setAnioReferenciaTsv(
        historico?.anio ??
        Number(anio) - 1
      )

      setLineaBaseTsv({
        fatalidades:
          numero(
            tasas?.fatalidades
          ) ??
          '',

        heridos_graves:
          numero(
            tasas?.heridos_graves
          ) ??
          '',

        heridos_leves:
          numero(
            tasas?.heridos_leves
          ) ??
          '',

        choques_simples:
          numero(
            tasas?.choques_simples
          ) ??
          '',
      })

      onExito?.(
        `Línea base TSV calculada con la información histórica del año ${historico?.anio ?? Number(anio) - 1}.`
      )
    } catch (
      err
    ) {
      console.error(
        'Error calculando línea base histórica TSV:',
        err
      )

      onError?.(
        err.message
      )
    } finally {
      setProcesando(false)
    }
  }

  // ==========================================================
  // GUARDAR CONFIGURACIÓN
  // API: POST /api/admin/pesv/indicadores
  // ACCIÓN: guardar_configuracion
  // ==========================================================

    async function guardarConfiguracion() {
    if (
      !indicadorSeleccionado
    ) {
      return
    }


    // ========================================================
    // VALIDACIÓN ESPECÍFICA TSV
    // ========================================================

    if (
      esTsv
    ) {
      const niveles = [
        {
          clave:
            'fatalidades',

          nombre:
            'Fatalidades',
        },

        {
          clave:
            'heridos_graves',

          nombre:
            'Heridos graves',
        },

        {
          clave:
            'heridos_leves',

          nombre:
            'Heridos leves',
        },

        {
          clave:
            'choques_simples',

          nombre:
            'Choques simples',
        },
      ]

      if (
        ![
          'AUTOMATICA',
          'MANUAL',
        ].includes(
          origenLineaBaseTsv
        )
      ) {
        onError?.(
          'Seleccione el origen de la línea base TSV.'
        )

        return
      }

      if (
        !anioReferenciaTsv
      ) {
        onError?.(
          'Debe indicar el año de referencia de la línea base TSV.'
        )

        return
      }

      for (
        const nivel of niveles
      ) {
        const valorLineaBase =
          numero(
            lineaBaseTsv[
              nivel.clave
            ]
          )

        const valorMetaNivel =
          numero(
            metasTsv[
              nivel.clave
            ]?.valor
          )

        const operadorNivel =
          texto(
            metasTsv[
              nivel.clave
            ]?.operador
          )

        if (
          valorLineaBase ===
          null
        ) {
          onError?.(
            `Debe registrar la línea base para ${nivel.nombre}.`
          )

          return
        }

        if (
          valorMetaNivel ===
          null
        ) {
          onError?.(
            `Debe registrar la meta para ${nivel.nombre}.`
          )

          return
        }

        if (
          ![
            '>=',
            '<=',
            '=',
            '>',
            '<',
          ].includes(
            operadorNivel
          )
        ) {
          onError?.(
            `El operador de meta para ${nivel.nombre} no es válido.`
          )

          return
        }
      }
    }


    setProcesando(true)

    try {
      const configuracionEspecifica =
        esTsv
          ? {
              linea_base: {
                origen:
                  origenLineaBaseTsv,

                anio_referencia:
                  Number(
                    anioReferenciaTsv
                  ),

                fatalidades:
                  numero(
                    lineaBaseTsv
                      .fatalidades
                  ),

                heridos_graves:
                  numero(
                    lineaBaseTsv
                      .heridos_graves
                  ),

                heridos_leves:
                  numero(
                    lineaBaseTsv
                      .heridos_leves
                  ),

                choques_simples:
                  numero(
                    lineaBaseTsv
                      .choques_simples
                  ),
              },

              metas: {
                fatalidades: {
                  operador:
                    metasTsv
                      .fatalidades
                      .operador,

                  valor:
                    numero(
                      metasTsv
                        .fatalidades
                        .valor
                    ),
                },

                heridos_graves: {
                  operador:
                    metasTsv
                      .heridos_graves
                      .operador,

                  valor:
                    numero(
                      metasTsv
                        .heridos_graves
                        .valor
                    ),
                },

                heridos_leves: {
                  operador:
                    metasTsv
                      .heridos_leves
                      .operador,

                  valor:
                    numero(
                      metasTsv
                        .heridos_leves
                        .valor
                    ),
                },

                choques_simples: {
                  operador:
                    metasTsv
                      .choques_simples
                      .operador,

                  valor:
                    numero(
                      metasTsv
                        .choques_simples
                        .valor
                    ),
                },
              },
            }
          : undefined


      await solicitarApi(
        'POST',
        {
          accion:
            'guardar_configuracion',

          indicador_id:
            indicadorSeleccionado.id,

          anio:
            Number(anio),

          // ==================================================
          // CONFIGURACIÓN GENERAL
          // Para TSV queda en null porque la configuración
          // real se guarda por nivel en configuracion_especifica.
          // ==================================================

          linea_base:
            esTsv
              ? null
              : numero(
                  lineaBase
                ),

          valor_meta:
            esTsv
              ? null
              : numero(
                  valorMeta
                ),

          operador_meta:
            esTsv
              ? null
              : operadorMeta,

          unidad_meta:
            esTsv
              ? 'TASA_POR_MILLON_KM'
              : (
                  unidadMeta ||
                  indicadorSeleccionado.unidad ||
                  null
                ),

          configuracion_especifica:
            configuracionEspecifica,

          fuente_informacion:
            fuenteInformacion ||
            null,

          interpretacion_indicador:
            interpretacionIndicador ||
            null,

          personas_deben_conocer_resultado:
            personasDebenConocerResultado ||
            null,

          observaciones:
            observacionesConfiguracion ||
            null,

          activo:
            true,
        }
      )

      onExito?.(
        configuracionActual
          ? 'Configuración actualizada correctamente.'
          : 'Configuración guardada correctamente.'
      )

      setEditandoConfiguracion(
        false
      )

      await onActualizar?.()
    } catch (
      err
    ) {
      console.error(
        'Error guardando configuración:',
        err
      )

      onError?.(
        err.message
      )
    } finally {
      setProcesando(false)
    }
  }

  // ==========================================================
  // CALCULAR INDICADOR
  // API: POST /api/admin/pesv/indicadores
  // ACCIÓN: calcular_indicador
  //
  // SOLO CALCULA. NO GUARDA.
  // ==========================================================

  async function calcularIndicador() {
    if (
      !indicadorSeleccionado
    ) {
      return
    }

    if (
      tipoPeriodoIndicador ===
        'TRIMESTRE' &&
      ![1, 2, 3, 4].includes(
        Number(
          numeroPeriodo
        )
      )
    ) {
      onError?.(
        'Seleccione el trimestre que desea medir.'
      )
      return
    }

    if (
      tipoPeriodoIndicador ===
        'MES' &&
      (
        Number(
          numeroPeriodo
        ) < 1 ||
        Number(
          numeroPeriodo
        ) > 12
      )
    ) {
      onError?.(
        'Seleccione el mes que desea medir.'
      )
      return
    }

    setProcesando(true)

    try {
      let calculo =
        null

      if (
        esRsvi
      ) {
        const resultadoRsvi =
          await solicitarCalculoRsvi()

        setDatosRsvi(
          resultadoRsvi
        )

        const calculoRsvi =
          resultadoRsvi.calculo

        const evaluacionRsvi =
          resultadoRsvi?.evaluacion ||
          {}

        calculo = {
          ...calculoRsvi,

          linea_base:
            evaluacionRsvi?.linea_base ??
            resultadoRsvi?.configuracion?.linea_base ??
            null,

          operador_meta:
            evaluacionRsvi?.operador_meta ||
            resultadoRsvi?.configuracion?.operador_meta ||
            null,

          valor_meta:
            evaluacionRsvi?.valor_meta ??
            resultadoRsvi?.configuracion?.valor_meta ??
            null,

          unidad_meta:
            evaluacionRsvi?.unidad_meta ||
            resultadoRsvi?.configuracion?.unidad_meta ||
            calculoRsvi?.unidad_resultado ||
            'CANTIDAD',

          cumple_meta:
            evaluacionRsvi?.cumple_meta ??
            null,

          datos_calculo: {
            codigo: 'RSVI',
            nivel_valoracion_alta:
              calculoRsvi?.nivel_valoracion_alta ||
              'CRITICO',
            periodo:
              calculoRsvi?.periodo ||
              resultadoRsvi?.periodo ||
              null,
            resultados:
              calculoRsvi?.resultados ||
              {},
            resumen:
              calculoRsvi?.resumen ||
              {},
            ids:
              calculoRsvi?.ids ||
              {},
            detalle_riesgos:
              calculoRsvi?.detalle_riesgos ||
              [],
            advertencias:
              calculoRsvi?.advertencias ||
              [],
            evaluacion:
              evaluacionRsvi,
          },
        }

        setDatosGrv(null)
        setDatosCmPesv(null)
        setDatosCplanPesv(null)
      } else if (
        esGrv
      ) {
        const resultadoGrv =
          await solicitarCalculoGrv()

        setDatosGrv(
          resultadoGrv
        )

        setDatosRsvi(null)
        setDatosCmPesv(null)
        setDatosCplanPesv(null)

        const calculoGrv =
          resultadoGrv.calculo

        const evaluacionGrv =
          resultadoGrv?.evaluacion ||
          {}

        calculo = {
          ...calculoGrv,

          linea_base:
            evaluacionGrv?.linea_base ??
            resultadoGrv?.configuracion?.linea_base ??
            null,

          operador_meta:
            evaluacionGrv?.operador_meta ||
            resultadoGrv?.configuracion?.operador_meta ||
            null,

          valor_meta:
            evaluacionGrv?.valor_meta ??
            resultadoGrv?.configuracion?.valor_meta ??
            null,

          unidad_meta:
            evaluacionGrv?.unidad_meta ||
            resultadoGrv?.configuracion?.unidad_meta ||
            calculoGrv?.unidad_resultado ||
            'CANTIDAD',

          cumple_meta:
            evaluacionGrv?.cumple_meta ??
            null,

          datos_calculo: {
            codigo: 'GRV',
            nivel_valoracion_alta:
              calculoGrv?.nivel_valoracion_alta ||
              'CRITICO',
            periodo:
              calculoGrv?.periodo ||
              resultadoGrv?.periodo ||
              null,
            resultados:
              calculoGrv?.resultados ||
              {},
            resumen:
              calculoGrv?.resumen ||
              {},
            ids:
              calculoGrv?.ids ||
              {},
            detalle_riesgos:
              calculoGrv?.detalle_riesgos ||
              [],
            advertencias:
              calculoGrv?.advertencias ||
              [],
            evaluacion:
              evaluacionGrv,
          },
        }
      } else if (
        esCmPesv
      ) {
        const resultadoCmPesv =
          await solicitarCalculoCmPesv()

        setDatosCmPesv(
          resultadoCmPesv
        )

        setDatosRsvi(null)
        setDatosGrv(null)
        setDatosCplanPesv(null)

        const calculoCmPesv =
          resultadoCmPesv.calculo

        const evaluacionCmPesv =
          resultadoCmPesv?.evaluacion ||
          {}

        const resultadosCmPesv =
          calculoCmPesv?.resultados ||
          {}

        calculo = {
          ...calculoCmPesv,

          numerador:
            calculoCmPesv?.numerador ??
            resultadosCmPesv?.metas_alcanzadas ??
            null,

          denominador:
            calculoCmPesv?.denominador ??
            resultadosCmPesv?.total_metas_definidas ??
            resultadosCmPesv?.total_metas_evaluables ??
            null,

          linea_base:
            evaluacionCmPesv?.linea_base ??
            resultadoCmPesv?.configuracion?.linea_base ??
            null,

          operador_meta:
            evaluacionCmPesv?.operador_meta ||
            resultadoCmPesv?.configuracion?.operador_meta ||
            null,

          valor_meta:
            evaluacionCmPesv?.valor_meta ??
            resultadoCmPesv?.configuracion?.valor_meta ??
            null,

          unidad_meta:
            evaluacionCmPesv?.unidad_meta ||
            resultadoCmPesv?.configuracion?.unidad_meta ||
            calculoCmPesv?.unidad_resultado ||
            'PORCENTAJE',

          cumple_meta:
            evaluacionCmPesv?.cumple_meta ??
            calculoCmPesv?.cumple_meta ??
            null,

          datos_calculo: {
            codigo:
              'CM_PESV',

            periodo:
              calculoCmPesv?.periodo ||
              resultadoCmPesv?.periodo ||
              null,

            resultados:
              resultadosCmPesv,

            resumen:
              calculoCmPesv?.resumen ||
              {},

            detalle_metas:
              calculoCmPesv?.detalle_metas ||
              [],

            advertencias:
              calculoCmPesv?.advertencias ||
              [],

            evaluacion:
              evaluacionCmPesv,
          },
        }
      } else if (
        esCplanPesv
      ) {
        const resultadoCplanPesv =
          await solicitarCalculoCplanPesv()

        setDatosCplanPesv(
          resultadoCplanPesv
        )

        setDatosRsvi(null)
        setDatosGrv(null)
        setDatosCmPesv(null)

        const calculoCplanPesv =
          resultadoCplanPesv.calculo

        const evaluacionCplanPesv =
          resultadoCplanPesv?.evaluacion ||
          {}

        calculo = {
          ...calculoCplanPesv,

          numerador:
            calculoCplanPesv?.numerador ??
            calculoCplanPesv?.resultados
              ?.actividades_ejecutadas ??
            null,

          denominador:
            calculoCplanPesv?.denominador ??
            calculoCplanPesv?.resultados
              ?.actividades_programadas ??
            null,

          linea_base:
            evaluacionCplanPesv?.linea_base ??
            resultadoCplanPesv?.configuracion?.linea_base ??
            null,

          operador_meta:
            evaluacionCplanPesv?.operador_meta ||
            resultadoCplanPesv?.configuracion?.operador_meta ||
            null,

          valor_meta:
            evaluacionCplanPesv?.valor_meta ??
            resultadoCplanPesv?.configuracion?.valor_meta ??
            null,

          unidad_meta:
            evaluacionCplanPesv?.unidad_meta ||
            resultadoCplanPesv?.configuracion?.unidad_meta ||
            calculoCplanPesv?.unidad_resultado ||
            'PORCENTAJE',

          cumple_meta:
            evaluacionCplanPesv?.cumple_meta ??
            calculoCplanPesv?.cumple_meta ??
            null,

          datos_calculo: {
            codigo:
              'CPLAN_PESV',

            periodo:
              calculoCplanPesv
                ?.datos_calculo
                ?.periodo ||
              resultadoCplanPesv?.periodo ||
              null,

            resultados:
              calculoCplanPesv?.resultados ||
              {},

            resumen:
              calculoCplanPesv?.resumen ||
              {},

            acumulado:
              calculoCplanPesv?.acumulado ||
              null,

            detalle_actividades:
              calculoCplanPesv?.detalle_actividades ||
              [],

            actividades_sin_trimestre:
              calculoCplanPesv?.actividades_sin_trimestre ||
              [],

            advertencias:
              calculoCplanPesv?.advertencias ||
              [],

            evaluacion:
              evaluacionCplanPesv,
          },
        }
      } else if (
        esCpfPesvCumplimiento
      ) {
        const resultadoCpfPesvCumplimiento =
          await solicitarCalculoCpfPesvCumplimiento()

        setDatosCpfPesvCumplimiento(
          resultadoCpfPesvCumplimiento
        )

        setDatosRsvi(null)
        setDatosGrv(null)
        setDatosCmPesv(null)
        setDatosCplanPesv(null)
        setDatosEjlc(null)
        setDatosIdp(null)

        const calculoCpf =
          resultadoCpfPesvCumplimiento.calculo

        const evaluacionCpf =
          resultadoCpfPesvCumplimiento?.evaluacion ||
          {}

        const resultadosCpf =
          calculoCpf?.resultados ||
          {}

        calculo = {
          ...calculoCpf,

          numerador:
            calculoCpf?.numerador ??
            resultadosCpf?.capacitaciones_ejecutadas ??
            null,

          denominador:
            calculoCpf?.denominador ??
            resultadosCpf?.capacitaciones_programadas ??
            null,

          valor_resultado:
            calculoCpf?.valor_resultado ??
            resultadosCpf?.cumplimiento_plan_formacion ??
            null,

          linea_base:
            evaluacionCpf?.linea_base ??
            resultadoCpfPesvCumplimiento?.configuracion?.linea_base ??
            null,

          operador_meta:
            evaluacionCpf?.operador_meta ||
            resultadoCpfPesvCumplimiento?.configuracion?.operador_meta ||
            null,

          valor_meta:
            evaluacionCpf?.valor_meta ??
            resultadoCpfPesvCumplimiento?.configuracion?.valor_meta ??
            null,

          unidad_meta:
            evaluacionCpf?.unidad_meta ||
            resultadoCpfPesvCumplimiento?.configuracion?.unidad_meta ||
            calculoCpf?.unidad_resultado ||
            'PORCENTAJE',

          cumple_meta:
            evaluacionCpf?.cumple_meta ??
            calculoCpf?.cumple_meta ??
            null,

          datos_calculo: {
            ...(calculoCpf?.datos_calculo || {}),
            codigo:
              'CPF_PESV_CUMPLIMIENTO',
            periodo:
              calculoCpf?.periodo ||
              resultadoCpfPesvCumplimiento?.periodo ||
              null,
            resultados:
              resultadosCpf,
            resumen:
              calculoCpf?.resumen ||
              {},
            resumen_trimestral:
              calculoCpf?.resumen_trimestral ||
              calculoCpf?.trimestres ||
              [],
            acumulado_anual:
              calculoCpf?.acumulado_anual ||
              calculoCpf?.resumen_anual ||
              null,
            detalle_actividades:
              calculoCpf?.detalle_actividades ||
              [],
            advertencias:
              calculoCpf?.advertencias ||
              [],
            evaluacion:
              evaluacionCpf,
          },
        }
      } else if (
        esNcac
      ) {
        const resultadoNcac =
          await solicitarCalculoNcac()

        setDatosNcac(
          resultadoNcac
        )

        setDatosRsvi(null)
        setDatosGrv(null)
        setDatosCmPesv(null)
        setDatosCplanPesv(null)
        setDatosEjlc(null)
        setDatosIdp(null)
        setDatosCpfPesvCumplimiento(null)
        setDatosCpfPesvCobertura(null)

        const calculoNcac =
          resultadoNcac.calculo

        const evaluacionNcac =
          resultadoNcac?.evaluacion ||
          {}

        const resultadosNcac =
          calculoNcac?.resultados ||
          {}

        calculo = {
          ...calculoNcac,

          numerador:
            calculoNcac?.numerador ??
            resultadosNcac?.no_conformidades_gestionadas_cerradas ??
            null,

          denominador:
            calculoNcac?.denominador ??
            resultadosNcac?.no_conformidades_identificadas_analizadas ??
            null,

          valor_resultado:
            calculoNcac?.valor_resultado ??
            resultadosNcac?.ncac ??
            null,

          linea_base:
            evaluacionNcac?.linea_base ??
            resultadoNcac?.configuracion?.linea_base ??
            null,

          operador_meta:
            evaluacionNcac?.operador_meta ||
            resultadoNcac?.configuracion?.operador_meta ||
            null,

          valor_meta:
            evaluacionNcac?.valor_meta ??
            resultadoNcac?.configuracion?.valor_meta ??
            null,

          unidad_meta:
            evaluacionNcac?.unidad_meta ||
            resultadoNcac?.configuracion?.unidad_meta ||
            calculoNcac?.unidad_resultado ||
            'PORCENTAJE',

          cumple_meta:
            evaluacionNcac?.cumple_meta ??
            calculoNcac?.cumple_meta ??
            null,

          datos_calculo: {
            ...(calculoNcac?.datos_calculo || {}),
            codigo: 'NCAC',
            periodo:
              calculoNcac?.periodo ||
              resultadoNcac?.periodo ||
              null,
            resultados:
              resultadosNcac,
            detalle_no_conformidades:
              calculoNcac?.detalle_no_conformidades ||
              [],
            advertencias:
              calculoNcac?.advertencias ||
              [],
            evaluacion:
              evaluacionNcac,
          },
        }
      } else if (
        esCpfPesvCobertura
      ) {
        const resultadoCpfPesvCobertura =
          await solicitarCalculoCpfPesvCobertura()

        setDatosCpfPesvCobertura(
          resultadoCpfPesvCobertura
        )

        setDatosRsvi(null)
        setDatosGrv(null)
        setDatosCmPesv(null)
        setDatosCplanPesv(null)
        setDatosEjlc(null)
        setDatosIdp(null)

        const calculoCobertura =
          resultadoCpfPesvCobertura.calculo

        const evaluacionCobertura =
          resultadoCpfPesvCobertura?.evaluacion ||
          {}

        const resultadosCobertura =
          calculoCobertura?.resultados ||
          {}

        calculo = {
          ...calculoCobertura,

          numerador:
            calculoCobertura?.numerador ??
            resultadosCobertura?.colaboradores_capacitados ??
            null,

          denominador:
            calculoCobertura?.denominador ??
            resultadosCobertura?.total_colaboradores ??
            null,

          valor_resultado:
            calculoCobertura?.valor_resultado ??
            resultadosCobertura?.cobertura_plan_formacion ??
            null,

          linea_base:
            evaluacionCobertura?.linea_base ??
            resultadoCpfPesvCobertura?.configuracion?.linea_base ??
            null,

          operador_meta:
            evaluacionCobertura?.operador_meta ||
            resultadoCpfPesvCobertura?.configuracion?.operador_meta ||
            null,

          valor_meta:
            evaluacionCobertura?.valor_meta ??
            resultadoCpfPesvCobertura?.configuracion?.valor_meta ??
            null,

          unidad_meta:
            evaluacionCobertura?.unidad_meta ||
            resultadoCpfPesvCobertura?.configuracion?.unidad_meta ||
            calculoCobertura?.unidad_resultado ||
            'PORCENTAJE',

          cumple_meta:
            evaluacionCobertura?.cumple_meta ??
            calculoCobertura?.cumple_meta ??
            null,

          datos_calculo: {
            ...(calculoCobertura?.datos_calculo || {}),
            codigo:
              'CPF_PESV_COBERTURA',
            periodo:
              calculoCobertura?.periodo ||
              resultadoCpfPesvCobertura?.periodo ||
              null,
            resultados:
              resultadosCobertura,
            resumen:
              calculoCobertura?.resumen ||
              {},
            resumen_trimestral:
              calculoCobertura?.resumen_trimestral ||
              calculoCobertura?.trimestres ||
              [],
            acumulado_anual:
              calculoCobertura?.acumulado_anual ||
              calculoCobertura?.resumen_anual ||
              null,
            detalle_capacitados:
              calculoCobertura?.detalle_capacitados ||
              [],
            advertencias:
              calculoCobertura?.advertencias ||
              [],
            evaluacion:
              evaluacionCobertura,
          },
        }
      } else if (
        esEjlc
      ) {
        const resultadoEjlc =
          await solicitarCalculoEjlc()

        setDatosEjlc(
          resultadoEjlc
        )

        setDatosRsvi(null)
        setDatosGrv(null)
        setDatosCmPesv(null)
        setDatosCplanPesv(null)
        setDatosIdp(null)

        const ejd =
          resultadoEjlc?.EJD ??
          resultadoEjlc?.mensual?.EJD ??
          null

        const sdt =
          resultadoEjlc?.SDT ??
          resultadoEjlc?.mensual?.SDT ??
          null

        const ejlc =
          resultadoEjlc?.EJLC ??
          resultadoEjlc?.mensual?.EJLC ??
          null

        calculo = {
          numerador: ejd,
          denominador: sdt,
          valor_resultado: ejlc,
          unidad_resultado: 'PORCENTAJE',
          linea_base:
            numero(lineaBase),
          operador_meta:
            operadorMeta || '<=',
          valor_meta:
            numero(valorMeta),
          unidad_meta:
            unidadMeta || 'PORCENTAJE',
          origen_calculo: 'AUTOMATICO',
          datos_calculo: {
            ...(resultadoEjlc?.datos_calculo || {}),
            codigo: 'EJLC',
            criterio_operacional:
              resultadoEjlc?.criterio_operacional || null,
            periodo:
              resultadoEjlc?.periodo ||
              resultadoEjlc?.datos_calculo?.periodo ||
              null,
            mensual:
              resultadoEjlc?.mensual ||
              resultadoEjlc?.datos_calculo?.mensual ||
              {},
            acumulado_anual:
              resultadoEjlc?.acumulado_anual ||
              resultadoEjlc?.datos_calculo?.acumulado_anual ||
              {},
            detalle_jornadas:
              resultadoEjlc?.detalle_jornadas ||
              resultadoEjlc?.datos_calculo?.detalle_jornadas ||
              [],
            detalle_jornadas_acumulado:
              resultadoEjlc?.detalle_jornadas_acumulado ||
              [],
          },
        }
      } else if (
        esIdp
      ) {
        const resultadoIdp = await solicitarCalculoIdp()

        setDatosIdp(resultadoIdp)
        setDatosRsvi(null)
        setDatosGrv(null)
        setDatosCmPesv(null)
        setDatosCplanPesv(null)
        setDatosEjlc(null)

        const vid = resultadoIdp?.VID ?? resultadoIdp?.mensual?.VID ?? null
        const tv = resultadoIdp?.TV ?? resultadoIdp?.mensual?.TV ?? null
        const idp = resultadoIdp?.IDP ?? resultadoIdp?.mensual?.IDP ?? null

        calculo = {
          numerador: vid,
          denominador: tv,
          valor_resultado: idp,
          unidad_resultado: 'PORCENTAJE',
          linea_base: numero(lineaBase),
          operador_meta: operadorMeta || '>=',
          valor_meta: numero(valorMeta),
          unidad_meta: unidadMeta || 'PORCENTAJE',
          origen_calculo: 'AUTOMATICO',
          datos_calculo: {
            ...(resultadoIdp?.datos_calculo || {}),
            codigo: 'IDP',
            criterio_operacional: resultadoIdp?.criterio_operacional || null,
            interpretacion_usuario: resultadoIdp?.interpretacion_usuario || null,
            periodo: resultadoIdp?.periodo || resultadoIdp?.datos_calculo?.periodo || null,
            mensual: resultadoIdp?.mensual || resultadoIdp?.datos_calculo?.mensual || {},
            acumulado_anual: resultadoIdp?.acumulado_anual || resultadoIdp?.datos_calculo?.acumulado_anual || {},
            resumen_preoperacionales: resultadoIdp?.datos_calculo?.resumen_preoperacionales || {},
            resumen_horarios: resultadoIdp?.datos_calculo?.resumen_horarios || {},
            resumen_programacion: resultadoIdp?.datos_calculo?.resumen_programacion || {},
            resumen_comparativo: resultadoIdp?.datos_calculo?.resumen_comparativo || {},
            detalle_vehiculos_dia: resultadoIdp?.detalle_vehiculos_dia || resultadoIdp?.datos_calculo?.detalle_vehiculos_dia || [],
            detalle_vehiculos_dia_acumulado: resultadoIdp?.detalle_vehiculos_dia_acumulado || [],
            inconsistencias: resultadoIdp?.datos_calculo?.inconsistencias || [],
            advertencias: resultadoIdp?.datos_calculo?.advertencias || [],
            nota_interpretacion: resultadoIdp?.datos_calculo?.nota_interpretacion || null,
            limitacion_cobertura: resultadoIdp?.datos_calculo?.limitacion_cobertura || null,
          },
        }
      } else {
        setDatosRsvi(null)
        setDatosGrv(null)
        setDatosCmPesv(null)
        setDatosCplanPesv(null)
        setDatosEjlc(null)
        setDatosIdp(null)
        setDatosCpfPesvCumplimiento(null)
      setDatosCpfPesvCobertura(null)
      setDatosNcac(null)

        const resultado =
          await solicitarApi(
            'POST',
            {
              accion:
                'calcular_indicador',

              indicador_id:
                indicadorSeleccionado.id,

              anio:
                Number(anio),

              tipo_periodo:
                tipoPeriodoIndicador,

              numero_periodo:
                tipoPeriodoIndicador ===
                  'ANUAL'
                  ? null
                  : Number(
                      numeroPeriodo
                    ),

              fecha_medicion:
                fechaMedicion,
            }
          )

        calculo =
          resultado?.calculo ||
          null
      }

      if (
        !calculo
      ) {
        throw new Error(
          'La API no devolvió el resultado del cálculo.'
        )
      }

      setResultadoCalculo(
        calculo
      )

      setNumerador(
        calculo?.numerador ??
        ''
      )

      setDenominador(
        calculo?.denominador ??
        ''
      )

      setValorResultado(
        calculo?.valor_resultado ??
        ''
      )

      onExito?.(
        esTsv
          ? 'TSV calculado. Revise las tasas por nivel de pérdida antes de guardar.'
          : esRsvi
            ? 'RSVI calculado. Revise la comparación anual de riesgos antes de guardar.'
            : esGrv
              ? 'GRV calculado. Revise la variación anual de riesgos con valoración CRÍTICA antes de guardar.'
              : esCpfPesvCumplimiento
                ? 'CPF_PESV_CUMPLIMIENTO calculado. Revise las capacitaciones programadas, ejecutadas y el cumplimiento del período antes de guardar.'
              : esNcac
                ? 'NCAC calculado. Revise las no conformidades identificadas y analizadas, las gestionadas y cerradas y el porcentaje anual antes de guardar.'
              : esCpfPesvCobertura
                ? 'CPF_PESV_COBERTURA calculado. Revise los colaboradores capacitados, la población total y la cobertura acumulada antes de guardar.'
              : esEjlc
                ? 'EJLC calculado. Revise las jornadas, la calidad de los datos y el comparativo entre Horarios y Programación de clases antes de guardar.'
                : esIdp
                  ? 'IDP calculado. Revise VID, TV, los preoperacionales registrados y la trazabilidad de los vehículos/día antes de guardar.'
                  : 'Cálculo realizado. Revise el resultado antes de guardar la medición.'
      )
    } catch (
      err
    ) {
      console.error(
        'Error calculando indicador:',
        err
      )

      onError?.(
        err.message
      )
    } finally {
      setProcesando(false)
    }
  }


  // ==========================================================
  // GUARDAR MEDICIÓN
  // API: POST /api/admin/pesv/indicadores
  // ACCIÓN: guardar_medicion
  // ==========================================================

  async function guardarMedicion() {
    if (
      !indicadorSeleccionado
    ) {
      return
    }

    if (
      numero(
        valorResultado
      ) ===
      null
    ) {
      onError?.(
        'Primero debe calcular el indicador.'
      )

      return
    }

    setProcesando(true)

    try {
      const resultado =
        await solicitarApi(
          'POST',
          {
            accion:
              'guardar_medicion',

            indicador_id:
              indicadorSeleccionado.id,

            anio:
              Number(anio),

            tipo_periodo:
              tipoPeriodoIndicador,

            numero_periodo:
              tipoPeriodoIndicador ===
                'ANUAL'
                ? null
                : Number(
                    numeroPeriodo
                  ),

            fecha_medicion:
              fechaMedicion,

            numerador:
              numero(
                numerador
              ),

            denominador:
              numero(
                denominador
              ),

            valor_resultado:
              numero(
                valorResultado
              ),

            unidad_resultado:
              resultadoCalculo?.unidad_resultado ||
              indicadorSeleccionado.unidad ||
              null,

            // ================================================
            // CAMPOS GENERALES DE META
            // app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
            // ACCIÓN: guardar_medicion
            //
            // TSV maneja cuatro líneas base y cuatro metas
            // independientes dentro de datos_calculo.
            // ================================================

            linea_base:
              esTsv
                ? null
                : (
                    resultadoCalculo?.linea_base ??
                    numero(
                      lineaBase
                    )
                  ),

            valor_meta:
              esTsv
                ? null
                : (
                    resultadoCalculo?.valor_meta ??
                    numero(
                      valorMeta
                    )
                  ),

            operador_meta:
              esTsv
                ? null
                : (
                    resultadoCalculo?.operador_meta ||
                    operadorMeta ||
                    null
                  ),

            unidad_meta:
              esTsv
                ? 'TASA_POR_MILLON_KM'
                : (
                    resultadoCalculo?.unidad_meta ||
                    unidadMeta ||
                    indicadorSeleccionado.unidad ||
                    null
                  ),

            origen_calculo:
              resultadoCalculo?.origen_calculo ||
              obtenerOrigenSugerido(
                indicadorSeleccionado
              ),

            datos_calculo:
              {
                ...(
                  resultadoCalculo
                    ?.datos_calculo ||
                  {}
                ),

                // ============================================
                // CONSERVAR EVALUACIÓN TSV
                // app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
                //
                // Para TSV se guardan también las evaluaciones
                // independientes por nivel de pérdida.
                // ============================================

                ...(
                  esTsv
                    ? {
                        evaluacion_metas:
                          resultadoCalculo
                            ?.datos_calculo
                            ?.evaluacion_metas ||
                          {},

                        cumple_meta_global:
                          resultadoCalculo
                            ?.datos_calculo
                            ?.cumple_meta_global ??
                          null,

                        metas_completamente_evaluadas:
                          resultadoCalculo
                            ?.datos_calculo
                            ?.metas_completamente_evaluadas ??
                          false,
                      }
                    : {}
                ),

                advertencias:
                  resultadoCalculo
                    ?.advertencias ||
                  resultadoCalculo
                    ?.datos_calculo
                    ?.advertencias ||
                  [],
              },

            analisis_resultado:
              null,

            observaciones:
              null,

            responsable_personal_id:
              null,

            estado:
              'BORRADOR',
          }
        )

      const medicion =
        resultado?.medicion ||
        null

      if (
        medicion
      ) {
        setMedicionSeleccionada(
          medicion
        )
      }

      onExito?.(
        'Medición guardada como borrador. Continúe con el análisis.'
      )

      await onActualizar?.()
    } catch (
      err
    ) {
      console.warn(
        'No fue posible guardar la medición:',
        err?.message
      )

      onError?.(
        err?.message ||
        'No fue posible guardar la medición.'
      )
    } finally {
      setProcesando(false)
    }
  }


  // ==========================================================
  // GUARDAR ANÁLISIS
  // API: PATCH /api/admin/pesv/indicadores
  // ACCIÓN: actualizar_medicion
  // ==========================================================

  async function guardarAnalisis() {
    if (
      !medicionSeleccionada?.id
    ) {
      onError?.(
        'Primero debe guardar la medición.'
      )

      return
    }

    if (
      !texto(
        analisisResultado
      )
    ) {
      onError?.(
        'Registre el análisis del resultado.'
      )

      return
    }

    if (
      !texto(
        observacionesMedicion
      )
    ) {
      onError?.(
        'Registre las observaciones de la medición.'
      )

      return
    }

    if (
      !responsablePersonalId
    ) {
      onError?.(
        'Seleccione el responsable de la medición.'
      )

      return
    }

    setProcesando(true)

    try {
      const resultado =
        await solicitarApi(
          'PATCH',
          {
            accion:
              'actualizar_medicion',

            id:
              medicionSeleccionada.id,

            analisis_resultado:
              analisisResultado,

            observaciones:
              observacionesMedicion ||
              null,

            responsable_personal_id:
              Number(
                responsablePersonalId
              ),
          }
        )

      const medicion =
        resultado?.medicion ||
        medicionSeleccionada

      setMedicionSeleccionada(
        medicion
      )

      onExito?.(
        'Análisis de la medición guardado correctamente.'
      )

      await onActualizar?.()
    } catch (
      err
    ) {
      console.error(
        'Error guardando análisis:',
        err
      )

      onError?.(
        err.message
      )
    } finally {
      setProcesando(false)
    }
  }


  // ==========================================================
  // VALIDAR MEDICIÓN
  // ==========================================================

  async function validarMedicion() {
    if (
      !medicionSeleccionada?.id
    ) {
      return
    }

    setProcesando(true)

    try {
      const resultado =
        await solicitarApi(
          'PATCH',
          {
            accion:
              'validar_medicion',

            id:
              medicionSeleccionada.id,
          }
        )

      setMedicionSeleccionada(
        resultado?.medicion ||
        medicionSeleccionada
      )

      onExito?.(
        'Medición validada correctamente.'
      )

      await onActualizar?.()
    } catch (
      err
    ) {
      console.error(
        'Error validando medición:',
        err
      )

      onError?.(
        err.message
      )
    } finally {
      setProcesando(false)
    }
  }


  // ==========================================================
  // CERRAR MEDICIÓN
  // ==========================================================

  async function cerrarMedicion() {
    if (
      !medicionSeleccionada?.id
    ) {
      return
    }

    const confirmar =
      window.confirm(
        '¿Desea cerrar esta medición? Una vez cerrada quedará protegida como registro histórico.'
      )

    if (
      !confirmar
    ) {
      return
    }

    setProcesando(true)

    try {
      const resultado =
        await solicitarApi(
          'PATCH',
          {
            accion:
              'cerrar_medicion',

            id:
              medicionSeleccionada.id,
          }
        )

      setMedicionSeleccionada(
        resultado?.medicion ||
        medicionSeleccionada
      )

      onExito?.(
        'Medición cerrada correctamente.'
      )

      await onActualizar?.()
    } catch (
      err
    ) {
      console.error(
        'Error cerrando medición:',
        err
      )

      onError?.(
        err.message
      )
    } finally {
      setProcesando(false)
    }
  }

    // ==========================================================
  // ABRIR SOPORTE DE MEDICIÓN
  // app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
  //
  // Abre el documento imprimible de la medición.
  // La página de impresión utiliza:
  //
  // /admin/pesv/indicadores/imprimir/[id]
  //
  // y recibe además:
  // - anio
  // - indicador_id
  //
  // No recalcula ni modifica la medición.
  // ==========================================================

  function abrirSoporteMedicion(
    medicion
  ) {
    if (
      !medicion?.id
    ) {
      onError?.(
        'No fue posible identificar la medición.'
      )

      return
    }

    const estado =
      texto(
        medicion?.estado
      ).toUpperCase()

    if (
      ![
        'VALIDADA',
        'CERRADA',
      ].includes(
        estado
      )
    ) {
      onError?.(
        'El soporte solamente está disponible para mediciones validadas o cerradas.'
      )

      return
    }

    const indicadorId =
      Number(
        medicion
          ?.indicador_id
      )

    const anioMedicion =
      Number(
        medicion
          ?.anio
      )

    if (
      !indicadorId ||
      !anioMedicion
    ) {
      onError?.(
        'No fue posible identificar el indicador o la vigencia de la medición.'
      )

      return
    }

    const parametros =
      new URLSearchParams({
        anio:
          String(
            anioMedicion
          ),

        indicador_id:
          String(
            indicadorId
          ),
      })

    const url =
      `/admin/pesv/indicadores/imprimir/${medicion.id}?${parametros.toString()}`

      window.location.href =
      url
  }

  // ==========================================================
  // ELIMINAR MEDICIÓN BORRADOR
  // app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
  // API: DELETE /api/admin/pesv/indicadores
  // ACCIÓN: eliminar_medicion
  //
  // La API solamente permite eliminar mediciones BORRADOR.
  // ==========================================================

  async function eliminarMedicion(
    medicion
  ) {
    if (
      !medicion?.id
    ) {
      return
    }

    if (
      texto(
        medicion?.estado
      ).toUpperCase() !==
      'BORRADOR'
    ) {
      onError?.(
        'Solo las mediciones en borrador pueden eliminarse.'
      )

      return
    }

    const confirmar =
      window.confirm(
        '¿Desea eliminar esta medición en borrador? Esta acción no se puede deshacer.'
      )

    if (
      !confirmar
    ) {
      return
    }

    setProcesando(true)

    try {
      await solicitarApi(
        'DELETE',
        {
          accion:
            'eliminar_medicion',

          id:
            medicion.id,
        }
      )

      if (
        Number(
          medicionSeleccionada?.id
        ) ===
        Number(
          medicion.id
        )
      ) {
        nuevaMedicion()
      }

      onExito?.(
        'Medición en borrador eliminada correctamente.'
      )

      await onActualizar?.()
    } catch (
      err
    ) {
      console.error(
        'Error eliminando medición:',
        err
      )

      onError?.(
        err.message
      )
    } finally {
      setProcesando(false)
    }
  }

  // ==========================================================
  // CARGAR MEDICIÓN EXISTENTE
  // ==========================================================

  function cargarMedicion(
    medicion
  ) {
    setMedicionSeleccionada(
      medicion
    )

    setNumeroPeriodo(
      medicion.numero_periodo ===
        null ||
      medicion.numero_periodo ===
        undefined
        ? ''
        : String(
            medicion.numero_periodo
          )
    )

    setFechaMedicion(
      medicion.fecha_medicion ||
      fechaHoy()
    )

    setNumerador(
      medicion.numerador ??
      ''
    )

    setDenominador(
      medicion.denominador ??
      ''
    )

    setValorResultado(
      medicion.valor_resultado ??
      ''
    )

    setResultadoCalculo({
      numerador:
        medicion.numerador,

      denominador:
        medicion.denominador,

      valor_resultado:
        medicion.valor_resultado,

      unidad_resultado:
        medicion.unidad_resultado,

      linea_base:
        medicion.linea_base,

      valor_meta:
        medicion.valor_meta,

      operador_meta:
        medicion.operador_meta,

      unidad_meta:
        medicion.unidad_meta,

      cumple_meta:
        medicion.cumple_meta,

      origen_calculo:
        medicion.origen_calculo,

      datos_calculo:
        medicion.datos_calculo ||
        {},

      advertencias:
        medicion
          ?.datos_calculo
          ?.advertencias ||
        [],
    })

    setDatosCpfPesvCumplimiento(null)
    setDatosCpfPesvCobertura(null)
      setDatosNcac(null)

    if (
      esRsvi
    ) {
      setDatosRsvi({
        ok: true,
        evaluacion:
          medicion
            ?.datos_calculo
            ?.evaluacion ||
          {
            linea_base:
              medicion?.linea_base ?? null,
            operador_meta:
              medicion?.operador_meta || null,
            valor_meta:
              medicion?.valor_meta ?? null,
            unidad_meta:
              medicion?.unidad_meta || null,
            cumple_meta:
              medicion?.cumple_meta ?? null,
          },
        calculo: {
          numerador:
            medicion?.numerador,
          denominador:
            medicion?.denominador,
          valor_resultado:
            medicion?.valor_resultado,
          unidad_resultado:
            medicion?.unidad_resultado,
          linea_base:
            medicion?.linea_base,
          operador_meta:
            medicion?.operador_meta,
          valor_meta:
            medicion?.valor_meta,
          unidad_meta:
            medicion?.unidad_meta,
          cumple_meta:
            medicion?.cumple_meta,
          origen_calculo:
            medicion?.origen_calculo,
          nivel_valoracion_alta:
            medicion
              ?.datos_calculo
              ?.nivel_valoracion_alta ||
            'CRITICO',
          periodo:
            medicion
              ?.datos_calculo
              ?.periodo ||
            null,
          resultados:
            medicion
              ?.datos_calculo
              ?.resultados ||
            {},
          resumen:
            medicion
              ?.datos_calculo
              ?.resumen ||
            {},
          ids:
            medicion
              ?.datos_calculo
              ?.ids ||
            {},
          detalle_riesgos:
            medicion
              ?.datos_calculo
              ?.detalle_riesgos ||
            [],
          advertencias:
            medicion
              ?.datos_calculo
              ?.advertencias ||
            [],
        },
      })
      setDatosGrv(null)
    } else if (
      esGrv
    ) {
      setDatosGrv({
        ok: true,
        evaluacion:
          medicion
            ?.datos_calculo
            ?.evaluacion ||
          {
            linea_base:
              medicion?.linea_base ?? null,
            operador_meta:
              medicion?.operador_meta || null,
            valor_meta:
              medicion?.valor_meta ?? null,
            unidad_meta:
              medicion?.unidad_meta || null,
            cumple_meta:
              medicion?.cumple_meta ?? null,
          },
        calculo: {
          numerador:
            medicion?.numerador,
          denominador:
            medicion?.denominador,
          valor_resultado:
            medicion?.valor_resultado,
          unidad_resultado:
            medicion?.unidad_resultado,
          linea_base:
            medicion?.linea_base,
          operador_meta:
            medicion?.operador_meta,
          valor_meta:
            medicion?.valor_meta,
          unidad_meta:
            medicion?.unidad_meta,
          cumple_meta:
            medicion?.cumple_meta,
          origen_calculo:
            medicion?.origen_calculo,
          nivel_valoracion_alta:
            medicion
              ?.datos_calculo
              ?.nivel_valoracion_alta ||
            'CRITICO',
          periodo:
            medicion
              ?.datos_calculo
              ?.periodo ||
            null,
          resultados:
            medicion
              ?.datos_calculo
              ?.resultados ||
            {},
          resumen:
            medicion
              ?.datos_calculo
              ?.resumen ||
            {},
          ids:
            medicion
              ?.datos_calculo
              ?.ids ||
            {},
          detalle_riesgos:
            medicion
              ?.datos_calculo
              ?.detalle_riesgos ||
            [],
          advertencias:
            medicion
              ?.datos_calculo
              ?.advertencias ||
            [],
        },
      })
      setDatosRsvi(null)
      setDatosCmPesv(null)
    } else if (
      esCmPesv
    ) {
      const datosCalculoCmPesv =
        medicion?.datos_calculo ||
        {}

      const resultadosCmPesv =
        datosCalculoCmPesv?.resultados ||
        {}

      setDatosCmPesv({
        ok: true,

        evaluacion:
          datosCalculoCmPesv?.evaluacion ||
          {
            linea_base:
              medicion?.linea_base ?? null,

            operador_meta:
              medicion?.operador_meta || null,

            valor_meta:
              medicion?.valor_meta ?? null,

            unidad_meta:
              medicion?.unidad_meta || null,

            cumple_meta:
              medicion?.cumple_meta ?? null,
          },

        calculo: {
          numerador:
            medicion?.numerador,

          denominador:
            medicion?.denominador,

          valor_resultado:
            medicion?.valor_resultado,

          unidad_resultado:
            medicion?.unidad_resultado,

          linea_base:
            medicion?.linea_base,

          operador_meta:
            medicion?.operador_meta,

          valor_meta:
            medicion?.valor_meta,

          unidad_meta:
            medicion?.unidad_meta,

          cumple_meta:
            medicion?.cumple_meta,

          origen_calculo:
            medicion?.origen_calculo,

          periodo:
            datosCalculoCmPesv?.periodo ||
            {
              tipo_periodo:
                medicion?.tipo_periodo,

              numero_periodo:
                medicion?.numero_periodo,

              periodo_desde:
                medicion?.periodo_desde,

              periodo_hasta:
                medicion?.periodo_hasta,
            },

          resultados:
            resultadosCmPesv,

          resumen:
            datosCalculoCmPesv?.resumen ||
            {},

          detalle_metas:
            datosCalculoCmPesv?.detalle_metas ||
            [],

          advertencias:
            datosCalculoCmPesv?.advertencias ||
            [],
        },
      })

      setDatosRsvi(null)
      setDatosGrv(null)
      setDatosCplanPesv(null)
    } else if (
      esCplanPesv
    ) {
      const datosCalculoCplanPesv =
        medicion?.datos_calculo ||
        {}

      setDatosCplanPesv({
        ok: true,

        periodo:
          datosCalculoCplanPesv?.periodo ||
          {
            anio:
              medicion?.anio,

            tipo_periodo:
              medicion?.tipo_periodo,

            numero_periodo:
              medicion?.numero_periodo,

            periodo_desde:
              medicion?.periodo_desde,

            periodo_hasta:
              medicion?.periodo_hasta,
          },

        plan:
          datosCalculoCplanPesv?.plan ||
          null,

        evaluacion:
          datosCalculoCplanPesv?.evaluacion ||
          {
            linea_base:
              medicion?.linea_base ?? null,

            operador_meta:
              medicion?.operador_meta || null,

            valor_meta:
              medicion?.valor_meta ?? null,

            unidad_meta:
              medicion?.unidad_meta || null,

            cumple_meta:
              medicion?.cumple_meta ?? null,
          },

        calculo: {
          numerador:
            medicion?.numerador,

          denominador:
            medicion?.denominador,

          valor_resultado:
            medicion?.valor_resultado,

          unidad_resultado:
            medicion?.unidad_resultado,

          linea_base:
            medicion?.linea_base,

          operador_meta:
            medicion?.operador_meta,

          valor_meta:
            medicion?.valor_meta,

          unidad_meta:
            medicion?.unidad_meta,

          cumple_meta:
            medicion?.cumple_meta,

          origen_calculo:
            medicion?.origen_calculo,

          periodo:
            datosCalculoCplanPesv?.periodo ||
            null,

          resultados:
            datosCalculoCplanPesv?.resultados ||
            {},

          resumen:
            datosCalculoCplanPesv?.resumen ||
            {},

          acumulado:
            datosCalculoCplanPesv?.acumulado ||
            null,

          detalle_actividades:
            datosCalculoCplanPesv?.detalle_actividades ||
            datosCalculoCplanPesv?.actividades ||
            [],

          actividades_sin_trimestre:
            datosCalculoCplanPesv?.actividades_sin_trimestre ||
            [],

          advertencias:
            datosCalculoCplanPesv?.advertencias ||
            [],
        },
      })

      setDatosRsvi(null)
      setDatosGrv(null)
      setDatosCmPesv(null)
      setDatosEjlc(null)
    } else if (
      esCpfPesvCumplimiento
    ) {
      const datosCalculoCpf =
        medicion?.datos_calculo ||
        {}

      const resultadosCpf =
        datosCalculoCpf?.resultados ||
        {}

      setDatosCpfPesvCumplimiento({
        ok: true,

        periodo:
          datosCalculoCpf?.periodo ||
          {
            anio:
              medicion?.anio,
            tipo_periodo:
              medicion?.tipo_periodo,
            numero_periodo:
              medicion?.numero_periodo,
            periodo_desde:
              medicion?.periodo_desde,
            periodo_hasta:
              medicion?.periodo_hasta,
          },

        evaluacion:
          datosCalculoCpf?.evaluacion ||
          {
            linea_base:
              medicion?.linea_base ?? null,
            operador_meta:
              medicion?.operador_meta || null,
            valor_meta:
              medicion?.valor_meta ?? null,
            unidad_meta:
              medicion?.unidad_meta || null,
            cumple_meta:
              medicion?.cumple_meta ?? null,
          },

        calculo: {
          numerador:
            medicion?.numerador,
          denominador:
            medicion?.denominador,
          valor_resultado:
            medicion?.valor_resultado,
          unidad_resultado:
            medicion?.unidad_resultado,
          linea_base:
            medicion?.linea_base,
          operador_meta:
            medicion?.operador_meta,
          valor_meta:
            medicion?.valor_meta,
          unidad_meta:
            medicion?.unidad_meta,
          cumple_meta:
            medicion?.cumple_meta,
          origen_calculo:
            medicion?.origen_calculo,
          periodo:
            datosCalculoCpf?.periodo ||
            null,
          resultados:
            resultadosCpf,
          resumen:
            datosCalculoCpf?.resumen ||
            {},
          resumen_trimestral:
            datosCalculoCpf?.resumen_trimestral ||
            datosCalculoCpf?.trimestres ||
            [],
          trimestres:
            datosCalculoCpf?.resumen_trimestral ||
            datosCalculoCpf?.trimestres ||
            [],
          acumulado_anual:
            datosCalculoCpf?.acumulado_anual ||
            datosCalculoCpf?.resumen_anual ||
            null,
          resumen_anual:
            datosCalculoCpf?.acumulado_anual ||
            datosCalculoCpf?.resumen_anual ||
            null,
          detalle_actividades:
            datosCalculoCpf?.detalle_actividades ||
            [],
          advertencias:
            datosCalculoCpf?.advertencias ||
            [],
        },
      })

      setDatosRsvi(null)
      setDatosGrv(null)
      setDatosCmPesv(null)
      setDatosCplanPesv(null)
      setDatosEjlc(null)
      setDatosIdp(null)
    } else if (
      esNcac
    ) {
      const datosCalculoNcac =
        medicion?.datos_calculo ||
        {}

      const resultadosNcac =
        datosCalculoNcac?.resultados ||
        {}

      setDatosNcac({
        ok: true,

        periodo:
          datosCalculoNcac?.periodo ||
          {
            anio: medicion?.anio,
            tipo_periodo: 'ANUAL',
            numero_periodo: null,
            periodo_desde: medicion?.periodo_desde,
            periodo_hasta: medicion?.periodo_hasta,
          },

        evaluacion:
          datosCalculoNcac?.evaluacion ||
          {
            linea_base: medicion?.linea_base ?? null,
            operador_meta: medicion?.operador_meta || null,
            valor_meta: medicion?.valor_meta ?? null,
            unidad_meta: medicion?.unidad_meta || null,
            cumple_meta: medicion?.cumple_meta ?? null,
          },

        calculo: {
          numerador: medicion?.numerador,
          denominador: medicion?.denominador,
          valor_resultado: medicion?.valor_resultado,
          unidad_resultado: medicion?.unidad_resultado,
          linea_base: medicion?.linea_base,
          operador_meta: medicion?.operador_meta,
          valor_meta: medicion?.valor_meta,
          unidad_meta: medicion?.unidad_meta,
          cumple_meta: medicion?.cumple_meta,
          origen_calculo: medicion?.origen_calculo,
          periodo: datosCalculoNcac?.periodo || null,
          resultados: resultadosNcac,
          detalle_no_conformidades:
            datosCalculoNcac?.detalle_no_conformidades || [],
          advertencias:
            datosCalculoNcac?.advertencias || [],
        },
      })

      setDatosRsvi(null)
      setDatosGrv(null)
      setDatosCmPesv(null)
      setDatosCplanPesv(null)
      setDatosEjlc(null)
      setDatosIdp(null)
      setDatosCpfPesvCumplimiento(null)
      setDatosCpfPesvCobertura(null)
    } else if (
      esCpfPesvCobertura
    ) {
      const datosCalculoCobertura =
        medicion?.datos_calculo ||
        {}

      const resultadosCobertura =
        datosCalculoCobertura?.resultados ||
        {}

      setDatosCpfPesvCobertura({
        ok: true,

        periodo:
          datosCalculoCobertura?.periodo ||
          {
            anio:
              medicion?.anio,
            tipo_periodo:
              medicion?.tipo_periodo,
            numero_periodo:
              medicion?.numero_periodo,
            periodo_desde:
              medicion?.periodo_desde,
            periodo_hasta:
              medicion?.periodo_hasta,
          },

        evaluacion:
          datosCalculoCobertura?.evaluacion ||
          {
            linea_base:
              medicion?.linea_base ?? null,
            operador_meta:
              medicion?.operador_meta || null,
            valor_meta:
              medicion?.valor_meta ?? null,
            unidad_meta:
              medicion?.unidad_meta || null,
            cumple_meta:
              medicion?.cumple_meta ?? null,
          },

        calculo: {
          numerador:
            medicion?.numerador,
          denominador:
            medicion?.denominador,
          valor_resultado:
            medicion?.valor_resultado,
          unidad_resultado:
            medicion?.unidad_resultado,
          linea_base:
            medicion?.linea_base,
          operador_meta:
            medicion?.operador_meta,
          valor_meta:
            medicion?.valor_meta,
          unidad_meta:
            medicion?.unidad_meta,
          cumple_meta:
            medicion?.cumple_meta,
          origen_calculo:
            medicion?.origen_calculo,
          periodo:
            datosCalculoCobertura?.periodo ||
            null,
          resultados:
            resultadosCobertura,
          resumen:
            datosCalculoCobertura?.resumen ||
            {},
          resumen_trimestral:
            datosCalculoCobertura?.resumen_trimestral ||
            datosCalculoCobertura?.trimestres ||
            [],
          trimestres:
            datosCalculoCobertura?.resumen_trimestral ||
            datosCalculoCobertura?.trimestres ||
            [],
          acumulado_anual:
            datosCalculoCobertura?.acumulado_anual ||
            datosCalculoCobertura?.resumen_anual ||
            null,
          resumen_anual:
            datosCalculoCobertura?.acumulado_anual ||
            datosCalculoCobertura?.resumen_anual ||
            null,
          detalle_capacitados:
            datosCalculoCobertura?.detalle_capacitados ||
            [],
          advertencias:
            datosCalculoCobertura?.advertencias ||
            [],
        },
      })

      setDatosRsvi(null)
      setDatosGrv(null)
      setDatosCmPesv(null)
      setDatosCplanPesv(null)
      setDatosEjlc(null)
      setDatosIdp(null)
    } else if (
      esEjlc
    ) {
      const datosCalculoEjlc =
        medicion?.datos_calculo || {}

      setDatosEjlc({
        indicador: 'EJLC',
        origen:
          medicion?.origen_calculo ||
          'AUTOMATICO',
        unidad:
          medicion?.unidad_resultado ||
          'PORCENTAJE',
        criterio_operacional:
          datosCalculoEjlc?.criterio_operacional ||
          null,
        periodo:
          datosCalculoEjlc?.periodo ||
          {
            anio: medicion?.anio,
            mes: medicion?.numero_periodo,
            fecha_inicio_mes: medicion?.periodo_desde,
            fecha_corte: medicion?.periodo_hasta,
          },
        mensual:
          datosCalculoEjlc?.mensual ||
          {
            EJD: medicion?.numerador,
            SDT: medicion?.denominador,
            EJLC: medicion?.valor_resultado,
          },
        acumulado_anual:
          datosCalculoEjlc?.acumulado_anual || {},
        detalle_jornadas:
          datosCalculoEjlc?.detalle_jornadas || [],
        detalle_jornadas_acumulado:
          datosCalculoEjlc?.detalle_jornadas_acumulado || [],
        datos_calculo:
          datosCalculoEjlc,
      })

      setDatosRsvi(null)
      setDatosGrv(null)
      setDatosCmPesv(null)
      setDatosCplanPesv(null)
      setDatosIdp(null)
    } else if (
      esIdp
    ) {
      const datosCalculoIdp = medicion?.datos_calculo || {}

      setDatosIdp({
        indicador: 'IDP',
        origen: medicion?.origen_calculo || 'AUTOMATICO',
        unidad: medicion?.unidad_resultado || 'PORCENTAJE',
        criterio_operacional: datosCalculoIdp?.criterio_operacional || null,
        interpretacion_usuario: datosCalculoIdp?.interpretacion_usuario || null,
        periodo: datosCalculoIdp?.periodo || {
          anio: medicion?.anio,
          mes: medicion?.numero_periodo,
          fecha_inicio: medicion?.periodo_desde,
          fecha_corte: medicion?.periodo_hasta,
        },
        mensual: datosCalculoIdp?.mensual || {
          VID: medicion?.numerador,
          TV: medicion?.denominador,
          IDP: medicion?.valor_resultado,
          fecha_inicio: medicion?.periodo_desde,
          fecha_fin: medicion?.periodo_hasta,
        },
        acumulado_anual: datosCalculoIdp?.acumulado_anual || {},
        resumen_preoperacionales: datosCalculoIdp?.resumen_preoperacionales || {},
        detalle_vehiculos_dia: datosCalculoIdp?.detalle_vehiculos_dia || [],
        detalle_vehiculos_dia_acumulado: datosCalculoIdp?.detalle_vehiculos_dia_acumulado || [],
        datos_calculo: datosCalculoIdp,
      })

      setDatosRsvi(null)
      setDatosGrv(null)
      setDatosCmPesv(null)
      setDatosCplanPesv(null)
      setDatosEjlc(null)
    } else {
      setDatosRsvi(null)
      setDatosGrv(null)
      setDatosCmPesv(null)
      setDatosCplanPesv(null)
      setDatosEjlc(null)
      setDatosIdp(null)
    }

    setAnalisisResultado(
      medicion.analisis_resultado ||
      ''
    )

    setObservacionesMedicion(
      medicion.observaciones ||
      ''
    )

    setResponsablePersonalId(
      medicion.responsable_personal_id
        ? String(
            medicion.responsable_personal_id
          )
        : ''
    )
  }


  // ==========================================================
  // NUEVA MEDICIÓN
  // ==========================================================

  function nuevaMedicion() {
    setMedicionSeleccionada(null)
    setResultadoCalculo(null)
    setDatosRsvi(null)
    setDatosGrv(null)
    setDatosCmPesv(null)
    setDatosCplanPesv(null)
    setDatosEjlc(null)
    setDatosIdp(null)
    setDatosCpfPesvCumplimiento(null)
    setDatosCpfPesvCobertura(null)
      setDatosNcac(null)
    setNumerador('')
    setDenominador('')
    setValorResultado('')
    setAnalisisResultado('')
    setObservacionesMedicion('')
    setResponsablePersonalId('')
    setFechaMedicion(
      fechaHoy()
    )
  }


  // ==========================================================
  // SIN INDICADOR
  // ==========================================================

  if (
    !indicadorSeleccionado
  ) {
    return (
      <div
        className="
          rounded-xl
          border
          border-dashed
          border-slate-400
          bg-slate-50
          px-4
          py-12
          text-center
        "
      >
        <Gauge
          size={32}
          className="
            mx-auto
            mb-3
            text-slate-400
          "
        />

        <p
          className="
            text-sm
            font-bold
            text-slate-700
          "
        >
          No hay indicadores disponibles.
        </p>
      </div>
    )
  }


  // ==========================================================
  // ESTADOS DEL FLUJO
  // ==========================================================

  const configurado =
    Boolean(
      configuracionActual
    )

  const calculado =
    Boolean(
      resultadoCalculo
    )

  const medicionGuardada =
    Boolean(
      medicionSeleccionada?.id
    )

  const analisisGuardado =
    Boolean(
      texto(
        medicionSeleccionada
          ?.analisis_resultado
      )
    ) &&
    Boolean(
      texto(
        medicionSeleccionada
          ?.observaciones
      )
    ) &&
    Boolean(
      medicionSeleccionada
        ?.responsable_personal_id
    )

  const formularioAnalisisCompleto =
    Boolean(
      texto(
        analisisResultado
      )
    ) &&
    Boolean(
      texto(
        observacionesMedicion
      )
    ) &&
    Boolean(
      responsablePersonalId
    )

  const validada =
    [
      'VALIDADA',
      'CERRADA',
    ].includes(
      texto(
        medicionSeleccionada
          ?.estado
      ).toUpperCase()
    )

  const cerrada =
    texto(
      medicionSeleccionada
        ?.estado
    ).toUpperCase() ===
      'CERRADA'


  let pasoActual = 1

  if (
    configurado
  ) {
    pasoActual = 2
  }

  if (
    medicionGuardada
  ) {
    pasoActual = 3
  }

  if (
    analisisGuardado
  ) {
    pasoActual = 4
  }


  const etiquetasCalculo =
    obtenerEtiquetasCalculo(
      indicadorSeleccionado
    )

  const explicacion =
    obtenerExplicacionIndicador(
      indicadorSeleccionado,
      resultadoCalculo
    )

  const IconoSentido =
    obtenerIconoSentido(
      indicadorSeleccionado
        .sentido_mejora
    )

  const datosCalculo =
    resultadoCalculo
      ?.datos_calculo ||
    {}

  const datosTsvPeriodo =
    datosCalculo?.periodo ||
    {}

    const datosTsvAcumulado =
    datosCalculo
      ?.acumulado_anual ||
    {}

  const lineaBaseHistoricaTsv =
    datosCalculo
      ?.linea_base_historica ||
    {}

    const comparacionTsv =
    datosCalculo
      ?.comparacion_mismo_periodo_anterior ||
    {}


  // ==========================================================
  // EVALUACIÓN DE METAS TSV
  // app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
  //
  // La API entrega una evaluación independiente para:
  // - Fatalidades
  // - Heridos graves
  // - Heridos leves
  // - Choques simples
  // ==========================================================

  const evaluacionMetasTsv =
    datosCalculo
      ?.evaluacion_metas ||
    {}


  const cumpleMetaGlobalTsv =
    datosCalculo
      ?.cumple_meta_global ??
    null


  const advertencias =
    resultadoCalculo
      ?.advertencias ||
    datosCalculo
      ?.advertencias ||
    []


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        space-y-4
      "
    >

      {/* ====================================================
          ENCABEZADO
      ==================================================== */}

      <section
        className="
          overflow-hidden
          rounded-xl
          border
          border-slate-400
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            bg-slate-800
            px-4
            py-3
            text-white
          "
        >
          <div
            className="
              flex
              flex-col
              gap-3
              xl:flex-row
              xl:items-center
              xl:justify-between
            "
          >
            <div
              className="
                flex
                items-start
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-white/20
                  bg-white/10
                "
              >
                <Gauge
                  size={21}
                />
              </div>

              <div>
                <h2
                  className="
                    text-xs
                    font-black
                    uppercase
                    tracking-wide
                  "
                >
                  Medición de indicadores
                </h2>

                <p
                  className="
                    mt-1
                    text-[10px]
                    text-slate-300
                  "
                >
                  Siga el proceso guiado para configurar,
                  medir, analizar y validar cada indicador.
                </p>
              </div>
            </div>

            <div
              className="
                relative
                xl:w-[520px]
              "
            >
              <select
                value={
                  indicadorSeleccionado.id
                }
                onChange={
                  event =>
                    setIndicadorSeleccionadoId?.(
                      Number(
                        event.target.value
                      )
                    )
                }
                className="
                  w-full
                  appearance-none
                  rounded-lg
                  border
                  border-slate-500
                  bg-white
                  px-3
                  py-2
                  pr-9
                  text-[10px]
                  font-bold
                  text-slate-800
                  outline-none
                "
              >
                {indicadores.map(
                  indicador => (
                    <option
                      key={
                        indicador.id
                      }
                      value={
                        indicador.id
                      }
                    >
                      {indicador.numero_normativo
                        ? `${indicador.numero_normativo} · `
                        : ''}
                      {indicador.codigo} · {indicador.nombre}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={15}
                className="
                  pointer-events-none
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-500
                "
              />
            </div>
          </div>
        </div>


        {/* ==================================================
            IDENTIDAD INDICADOR
        ================================================== */}

        <div
          className="
            border-b
            border-slate-200
            bg-slate-50
            px-4
            py-3
          "
        >
          <div
            className="
              flex
              flex-col
              gap-2
              lg:flex-row
              lg:items-start
              lg:justify-between
            "
          >
            <div>
              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
                <span
                  className="
                    rounded
                    bg-slate-800
                    px-2
                    py-1
                    text-[9px]
                    font-black
                    text-white
                  "
                >
                  {indicadorSeleccionado.codigo}
                </span>

                <span
                  className="
                    text-[9px]
                    font-bold
                    text-slate-500
                  "
                >
                  Vigencia {anio}
                </span>
              </div>

              <h3
                className="
                  mt-2
                  text-sm
                  font-black
                  text-slate-800
                "
              >
                {indicadorSeleccionado.nombre}
              </h3>

              <p
                className="
                  mt-1
                  max-w-4xl
                  text-[10px]
                  leading-relaxed
                  text-slate-500
                "
              >
                {indicadorSeleccionado.descripcion}
              </p>
            </div>

            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >
              <span
                className="
                  inline-flex
                  items-center
                  gap-1
                  rounded-full
                  border
                  border-slate-300
                  bg-white
                  px-2
                  py-1
                  text-[9px]
                  font-bold
                  text-slate-600
                "
              >
                <CalendarDays
                  size={11}
                />

                {etiqueta(
                  indicadorSeleccionado.periodicidad
                )}
              </span>

              <span
                className="
                  inline-flex
                  items-center
                  gap-1
                  rounded-full
                  border
                  border-slate-300
                  bg-white
                  px-2
                  py-1
                  text-[9px]
                  font-bold
                  text-slate-600
                "
              >
                <IconoSentido
                  size={11}
                />

                {etiqueta(
                  indicadorSeleccionado.sentido_mejora
                )}
              </span>
            </div>
          </div>
        </div>


        {/* ==================================================
            FLUJO
        ================================================== */}

        <div
          className="
            grid
            grid-cols-2
            gap-2
            p-4
            lg:grid-cols-4
          "
        >
          {[
            {
              numero: 1,
              titulo:
                'Configurar',
              icono:
                Settings2,
              completado:
                configurado,
            },

            {
              numero: 2,
              titulo:
                'Medir',
              icono:
                Calculator,
              completado:
                medicionGuardada,
            },

            {
              numero: 3,
              titulo:
                'Analizar',
              icono:
                FileText,
              completado:
                analisisGuardado,
            },

            {
              numero: 4,
              titulo:
                'Validar',
              icono:
                BadgeCheck,
              completado:
                validada,
            },
          ].map(
            paso => {
              const Icono =
                paso.icono

              const activo =
                pasoActual ===
                paso.numero

              return (
                <div
                  key={
                    paso.numero
                  }
                  className={`
                    rounded-xl
                    border
                    px-3
                    py-3
                    ${
                      paso.completado
                        ? `
                          border-emerald-300
                          bg-emerald-50
                        `
                        : activo
                          ? `
                            border-blue-400
                            bg-blue-50
                          `
                          : `
                            border-slate-200
                            bg-slate-50
                          `
                    }
                  `}
                >
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >
                    <div
                      className={`
                        flex
                        h-7
                        w-7
                        items-center
                        justify-center
                        rounded-full
                        ${
                          paso.completado
                            ? `
                              bg-emerald-600
                              text-white
                            `
                            : activo
                              ? `
                                bg-blue-600
                                text-white
                              `
                              : `
                                bg-slate-200
                                text-slate-500
                              `
                        }
                      `}
                    >
                      {paso.completado ? (
                        <Check
                          size={14}
                        />
                      ) : (
                        <Icono
                          size={13}
                        />
                      )}
                    </div>

                    <div>
                      <p
                        className="
                          text-[9px]
                          font-bold
                          uppercase
                          text-slate-500
                        "
                      >
                        Paso {paso.numero}
                      </p>

                      <p
                        className="
                          text-[10px]
                          font-black
                          text-slate-700
                        "
                      >
                        {paso.titulo}
                      </p>
                    </div>
                  </div>
                </div>
              )
            }
          )}
        </div>
      </section>


      {/* ====================================================
          PASO 1 - CONFIGURACIÓN
      ==================================================== */}

      <section
        className="
          overflow-hidden
          rounded-xl
          border
          border-slate-400
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            border-b
            border-slate-200
            bg-slate-50
            px-4
            py-3
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <Settings2
              size={16}
              className="
                text-slate-700
              "
            />

            <div>
              <h3
                className="
                  text-[10px]
                  font-black
                  uppercase
                  text-slate-700
                "
              >
                1. Configuración / Ficha técnica
              </h3>

              <p
                className="
                  mt-0.5
                  text-[9px]
                  text-slate-500
                "
              >
                Complete la ficha técnica del indicador para la vigencia. La definición, fórmula y periodicidad provienen del catálogo PESV.
              </p>
            </div>
          </div>

          {configurado &&
          !editandoConfiguracion && (
            <span
              className="
                inline-flex
                items-center
                gap-1
                rounded-full
                border
                border-emerald-300
                bg-emerald-50
                px-2
                py-1
                text-[9px]
                font-bold
                text-emerald-700
              "
            >
              <CheckCircle2
                size={12}
              />

              Completado
            </span>
          )}
        </div>


        {/* ==================================================
            CONFIGURACIÓN GUARDADA
        ================================================== */}

        {configurado &&
        !editandoConfiguracion ? (
          <div
            className="
              p-4
            "
          >

            <div
              className="
                mb-4
                grid
                gap-3
                lg:grid-cols-3
              "
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[9px] font-black uppercase text-slate-500">
                  Definición del indicador
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-700">
                  {indicadorSeleccionado.descripcion || '—'}
                </p>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                <p className="text-[9px] font-black uppercase text-violet-700">
                  Método de cálculo
                </p>
                <p className="mt-2 font-mono text-[10px] font-bold leading-relaxed text-slate-700">
                  {indicadorSeleccionado.formula || '—'}
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-[9px] font-black uppercase text-blue-700">
                  Periodicidad del reporte
                </p>
                <p className="mt-2 text-[10px] font-bold text-slate-700">
                  {etiqueta(indicadorSeleccionado.periodicidad) || '—'}
                </p>
              </div>
            </div>

            {esTsv ? (
              <TsvConfiguracionRegistrada
                configuracionActual={
                  configuracionActual
                }
                indicadorSeleccionado={
                  indicadorSeleccionado
                }
                anio={
                  anio
                }
                setEditandoConfiguracion={
                  setEditandoConfiguracion
                }
              />
            ) : (
              <div
                className="
                  grid
                  gap-3
                  md:grid-cols-2
                  xl:grid-cols-5
                "
              >
                <div>
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      text-slate-400
                    "
                  >
                    Línea base
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-black
                      text-slate-800
                    "
                  >
                    {formatearResultado(
                      configuracionActual.linea_base,
                      configuracionActual.unidad_meta
                    )}
                  </p>
                </div>

                <div>
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      text-slate-400
                    "
                  >
                    Meta
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-black
                      text-slate-800
                    "
                  >
                    {configuracionActual.operador_meta}{' '}

                    {formatearResultado(
                      configuracionActual.valor_meta,
                      configuracionActual.unidad_meta
                    )}
                  </p>
                </div>

                <div>
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      text-slate-400
                    "
                  >
                    Unidad
                  </p>

                  <p
                    className="
                      mt-1
                      text-[10px]
                      font-bold
                      text-slate-700
                    "
                  >
                    {etiqueta(
                      configuracionActual.unidad_meta
                    )}
                  </p>
                </div>

                <div>
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      text-slate-400
                    "
                  >
                    Vigencia
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-black
                      text-slate-800
                    "
                  >
                    {anio}
                  </p>
                </div>

                <div
                  className="
                    flex
                    items-center
                    justify-start
                    xl:justify-end
                  "
                >
                  <button
                    type="button"
                    onClick={
                      () =>
                        setEditandoConfiguracion(
                          true
                        )
                    }
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-lg
                      border
                      border-slate-300
                      bg-white
                      px-3
                      py-2
                      text-[10px]
                      font-bold
                      text-slate-600
                      hover:bg-slate-100
                    "
                  >
                    <Pencil
                      size={13}
                    />

                    Editar configuración
                  </button>
                </div>
              </div>
            )}

            {!esTsv &&
            configuracionActual.fuente_informacion && (
              <div
                className="
                  mt-4
                  rounded-lg
                  border
                  border-slate-200
                  bg-slate-50
                  p-3
                "
              >
                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    text-slate-500
                  "
                >
                  Fuente de información
                </p>

                <p
                  className="
                    mt-1
                    text-[10px]
                    leading-relaxed
                    text-slate-600
                  "
                >
                  {configuracionActual.fuente_informacion}
                </p>
              </div>
            )}

            <div
              className="
                mt-4
                grid
                gap-3
                lg:grid-cols-2
              "
            >
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[9px] font-bold uppercase text-slate-500">
                  Interpretación del indicador
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                  {configuracionActual.interpretacion_indicador || 'Sin registrar'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[9px] font-bold uppercase text-slate-500">
                  Personas que deben conocer el resultado
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                  {configuracionActual.personas_deben_conocer_resultado || 'Sin registrar'}
                </p>
              </div>
            </div>

            {configuracionActual.observaciones && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-[9px] font-bold uppercase text-amber-800">
                  Observaciones
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-700">
                  {configuracionActual.observaciones}
                </p>
              </div>
            )}

            <div
              className="
                mt-4
                flex
                justify-end
              "
            >
              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  bg-blue-50
                  px-3
                  py-2
                  text-[10px]
                  font-bold
                  text-blue-700
                "
              >
                Configuración lista. Continúe con la medición.

                <ArrowRight
                  size={13}
                />
              </div>
            </div>
          </div>
        ) : (

          /* ==================================================
              EDITAR CONFIGURACIÓN
          ================================================== */

          <div
            className="
              p-4
            "
          >
            <div
              className="
                mb-4
                grid
                gap-3
                lg:grid-cols-3
              "
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[9px] font-black uppercase text-slate-500">
                  Definición del indicador
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-700">
                  {indicadorSeleccionado.descripcion || '—'}
                </p>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                <p className="text-[9px] font-black uppercase text-violet-700">
                  Método de cálculo
                </p>
                <p className="mt-2 font-mono text-[10px] font-bold leading-relaxed text-slate-700">
                  {indicadorSeleccionado.formula || '—'}
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-[9px] font-black uppercase text-blue-700">
                  Periodicidad del reporte
                </p>
                <p className="mt-2 text-[10px] font-bold text-slate-700">
                  {etiqueta(indicadorSeleccionado.periodicidad) || '—'}
                </p>
              </div>
            </div>

            {!esTsv && (
              <div
                className="
                  grid
                  gap-3
                  md:grid-cols-2
                  xl:grid-cols-4
                "
              >
                <div>
                  <label
                    className="
                      mb-1
                      block
                      text-[9px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Línea base
                  </label>

                  <input
                    type="number"
                    step="any"
                    value={
                      lineaBase
                    }
                    onChange={
                      event =>
                        setLineaBase(
                          event.target.value
                        )
                    }
                    className="
                      w-full
                      rounded-lg
                      border
                      border-slate-300
                      px-3
                      py-2
                      text-xs
                    "
                  />
                </div>

                <div>
                  <label
                    className="
                      mb-1
                      block
                      text-[9px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Operador
                  </label>

                  <select
                    value={
                      operadorMeta
                    }
                    onChange={
                      event =>
                        setOperadorMeta(
                          event.target.value
                        )
                    }
                    className="
                      w-full
                      rounded-lg
                      border
                      border-slate-300
                      bg-white
                      px-3
                      py-2
                      text-xs
                    "
                  >
                    <option value=">=">
                      Mayor o igual ≥
                    </option>

                    <option value="<=">
                      Menor o igual ≤
                    </option>

                    <option value="=">
                      Igual =
                    </option>

                    <option value=">">
                      Mayor &gt;
                    </option>

                    <option value="<">
                      Menor &lt;
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    className="
                      mb-1
                      block
                      text-[9px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Valor meta
                  </label>

                  <input
                    type="number"
                    step="any"
                    value={
                      valorMeta
                    }
                    onChange={
                      event =>
                        setValorMeta(
                          event.target.value
                        )
                    }
                    className="
                      w-full
                      rounded-lg
                      border
                      border-slate-300
                      px-3
                      py-2
                      text-xs
                    "
                  />
                </div>

                <div>
                  <label
                    className="
                      mb-1
                      block
                      text-[9px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Unidad
                  </label>

                  <input
                    type="text"
                    value={
                      unidadMeta
                    }
                    onChange={
                      event =>
                        setUnidadMeta(
                          event.target.value
                        )
                    }
                    className="
                      w-full
                      rounded-lg
                      border
                      border-slate-300
                      px-3
                      py-2
                      text-xs
                    "
                  />
                </div>
              </div>
            )}

                        {/* ==================================================
                CONFIGURACIÓN ESPECÍFICA TSV
                app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
            ================================================== */}

            {esTsv && (
              <TsvConfiguracionFormulario
                origenLineaBaseTsv={
                  origenLineaBaseTsv
                }
                setOrigenLineaBaseTsv={
                  setOrigenLineaBaseTsv
                }
                anioReferenciaTsv={
                  anioReferenciaTsv
                }
                setAnioReferenciaTsv={
                  setAnioReferenciaTsv
                }
                lineaBaseTsv={
                  lineaBaseTsv
                }
                setLineaBaseTsv={
                  setLineaBaseTsv
                }
                metasTsv={
                  metasTsv
                }
                setMetasTsv={
                  setMetasTsv
                }
                calcularLineaBaseHistoricaTsv={
                  calcularLineaBaseHistoricaTsv
                }
                procesando={
                  procesando
                }
              />
            )}

            <div
              className="
                mb-3
                grid
                gap-3
                lg:grid-cols-2
              "
            >
              <div>
                <label className="mb-1 block text-[9px] font-bold uppercase text-slate-600">
                  Interpretación del indicador
                </label>

                <textarea
                  rows={4}
                  value={interpretacionIndicador}
                  onChange={event => setInterpretacionIndicador(event.target.value)}
                  placeholder="Explique qué significa el resultado obtenido y cómo debe interpretarse."
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-[10px]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[9px] font-bold uppercase text-slate-600">
                  Personas que deben conocer el resultado
                </label>

                <textarea
                  rows={4}
                  value={personasDebenConocerResultado}
                  onChange={event => setPersonasDebenConocerResultado(event.target.value)}
                  placeholder="Ejemplo: Representante legal, líder del PESV, Comité de Seguridad Vial y responsables del proceso."
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-[10px]"
                />
              </div>
            </div>

            <div
              className="
                grid
                gap-3
                md:grid-cols-2
              "
            >
              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[9px]
                    font-bold
                    uppercase
                    text-slate-600
                  "
                >
                  Fuente de información
                </label>

                <textarea
                  rows={3}
                  value={
                    fuenteInformacion
                  }
                  onChange={
                    event =>
                      setFuenteInformacion(
                        event.target.value
                      )
                  }
                  className="
                    w-full
                    resize-none
                    rounded-lg
                    border
                    border-slate-300
                    px-3
                    py-2
                    text-[10px]
                  "
                />
              </div>

              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[9px]
                    font-bold
                    uppercase
                    text-slate-600
                  "
                >
                  Observaciones *
                </label>

                <textarea
                  rows={3}
                  value={
                    observacionesConfiguracion
                  }
                  onChange={
                    event =>
                      setObservacionesConfiguracion(
                        event.target.value
                      )
                  }
                  className="
                    w-full
                    resize-none
                    rounded-lg
                    border
                    border-slate-300
                    px-3
                    py-2
                    text-[10px]
                  "
                />
              </div>
            </div>

            <div
              className="
                mt-4
                flex
                justify-end
                gap-2
              "
            >
              {configurado && (
                <button
                  type="button"
                  onClick={
                    () =>
                      setEditandoConfiguracion(
                        false
                      )
                  }
                  className="
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2
                    text-[10px]
                    font-bold
                    text-slate-600
                  "
                >
                  Cancelar
                </button>
              )}

              <button
                type="button"
                onClick={
                  guardarConfiguracion
                }
                disabled={
                  procesando
                }
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-lg
                  bg-blue-600
                  px-4
                  py-2
                  text-[10px]
                  font-bold
                  text-white
                  hover:bg-blue-700
                  disabled:opacity-50
                "
              >
                {procesando ? (
                  <RefreshCw
                    size={13}
                    className="
                      animate-spin
                    "
                  />
                ) : (
                  <Save
                    size={13}
                  />
                )}

                {configurado
                  ? 'Guardar cambios'
                  : 'Guardar configuración'}
              </button>
            </div>
          </div>
        )}
      </section>


      {/* ====================================================
          PASO 2 - MEDICIÓN
      ==================================================== */}

      {configurado && (
        <section
          className="
            overflow-hidden
            rounded-xl
            border
            border-slate-400
            bg-white
            shadow-sm
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-3
              border-b
              border-slate-200
              bg-slate-50
              px-4
              py-3
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <Calculator
                size={16}
                className="
                  text-slate-700
                "
              />

              <div>
                <h3
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    text-slate-700
                  "
                >
                  2. Medición del indicador
                </h3>

                <p
                  className="
                    mt-0.5
                    text-[9px]
                    text-slate-500
                  "
                >
                  Seleccione el periodo y obtenga el resultado.
                </p>
              </div>
            </div>

            {medicionGuardada && (
              <span
                className="
                  inline-flex
                  items-center
                  gap-1
                  rounded-full
                  border
                  border-emerald-300
                  bg-emerald-50
                  px-2
                  py-1
                  text-[9px]
                  font-bold
                  text-emerald-700
                "
              >
                <CheckCircle2
                  size={12}
                />

                Medición guardada
              </span>
            )}
          </div>


          {/* ==================================================
              PERIODO
          ================================================== */}

          {!cerrada && (
            <div
              className="
                border-b
                border-slate-200
                p-4
              "
            >
              <div
                className="
                  grid
                  gap-3
                  md:grid-cols-4
                "
              >
                <div>
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      text-slate-500
                    "
                  >
                    Vigencia
                  </p>

                  <div
                    className="
                      mt-1
                      rounded-lg
                      border
                      border-slate-300
                      bg-slate-50
                      px-3
                      py-2
                      text-xs
                      font-black
                      text-slate-700
                    "
                  >
                    {anio}
                  </div>
                </div>

                <div>
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      text-slate-500
                    "
                  >
                    Periodicidad
                  </p>

                  <div
                    className="
                      mt-1
                      flex
                      min-h-[34px]
                      items-center
                      gap-2
                      rounded-lg
                      border
                      border-blue-200
                      bg-blue-50
                      px-3
                      py-2
                      text-[10px]
                      font-bold
                      text-blue-700
                    "
                  >
                    <CalendarDays
                      size={13}
                    />

                    {etiqueta(
                      indicadorSeleccionado.periodicidad
                    )}
                  </div>
                </div>

                <div>
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      text-slate-500
                    "
                  >
                    Periodo de medición
                  </p>

                  {tipoPeriodoIndicador ===
                    'TRIMESTRE' && (
                    <select
                      value={
                        numeroPeriodo
                      }
                      onChange={
                        event => {
                          setNumeroPeriodo(
                            event.target.value
                          )

                          nuevaMedicion()
                        }
                      }
                      className="
                        mt-1
                        w-full
                        rounded-lg
                        border
                        border-slate-300
                        bg-white
                        px-3
                        py-2
                        text-xs
                      "
                    >
                      {TRIMESTRES.map(
                        trimestre => (
                          <option
                            key={
                              trimestre.numero
                            }
                            value={
                              trimestre.numero
                            }
                          >
                            {trimestre.nombre}
                          </option>
                        )
                      )}
                    </select>
                  )}

                  {tipoPeriodoIndicador ===
                    'MES' && (
                    <select
                      value={
                        numeroPeriodo
                      }
                      onChange={
                        event => {
                          setNumeroPeriodo(
                            event.target.value
                          )

                          nuevaMedicion()
                        }
                      }
                      className="
                        mt-1
                        w-full
                        rounded-lg
                        border
                        border-slate-300
                        bg-white
                        px-3
                        py-2
                        text-xs
                      "
                    >
                      {MESES.map(
                        mes => (
                          <option
                            key={
                              mes.numero
                            }
                            value={
                              mes.numero
                            }
                          >
                            {mes.nombre}
                          </option>
                        )
                      )}
                    </select>
                  )}

                  {tipoPeriodoIndicador ===
                    'ANUAL' && (
                    <div
                      className="
                        mt-1
                        rounded-lg
                        border
                        border-slate-300
                        bg-slate-50
                        px-3
                        py-2
                        text-xs
                        font-bold
                        text-slate-700
                      "
                    >
                      Medición anual
                    </div>
                  )}
                </div>

                <div>
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      text-slate-500
                    "
                  >
                    Fecha de medición
                  </p>

                  <input
                    type="date"
                    value={
                      fechaMedicion
                    }
                    onChange={
                      event =>
                        setFechaMedicion(
                          event.target.value
                        )
                    }
                    className="
                      mt-1
                      w-full
                      rounded-lg
                      border
                      border-slate-300
                      px-3
                      py-2
                      text-xs
                    "
                  />
                </div>
              </div>
            </div>
          )}


          {/* ==================================================
              FÓRMULA Y FUENTE
          ================================================== */}

          <div
            className="
              grid
              gap-3
              border-b
              border-slate-200
              p-4
              lg:grid-cols-2
            "
          >
            <div
              className="
                rounded-xl
                border
                border-violet-200
                bg-violet-50
                p-3
              "
            >
              <p
                className="
                  text-[9px]
                  font-black
                  uppercase
                  text-violet-800
                "
              >
                Fórmula
              </p>

              <p
                className="
                  mt-2
                  rounded-lg
                  bg-white
                  px-3
                  py-2
                  font-mono
                  text-[10px]
                  font-bold
                  text-slate-700
                "
              >
                {indicadorSeleccionado.formula}
              </p>
            </div>

            <div
              className="
                rounded-xl
                border
                border-blue-200
                bg-blue-50
                p-3
              "
            >
              <p
                className="
                  text-[9px]
                  font-black
                  uppercase
                  text-blue-800
                "
              >
                Datos utilizados
              </p>

              <p
                className="
                  mt-2
                  text-[10px]
                  leading-relaxed
                  text-slate-600
                "
              >
                {configuracionActual.fuente_informacion ||
                  indicadorSeleccionado.fuente_datos}
              </p>
            </div>
          </div>


          {/* ==================================================
              SIN CÁLCULO
          ================================================== */}

          {!calculado &&
          !medicionGuardada && (
            <div
              className="
                p-4
              "
            >
              <div
                className="
                  flex
                  flex-col
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-dashed
                  border-slate-300
                  bg-slate-50
                  px-4
                  py-8
                  text-center
                "
              >
                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-full
                    bg-violet-100
                    text-violet-700
                  "
                >
                  <Sparkles
                    size={22}
                  />
                </div>

                <p
                  className="
                    mt-3
                    text-xs
                    font-black
                    text-slate-700
                  "
                >
                  Obtenga el resultado del indicador
                </p>

                <p
                  className="
                    mt-1
                    max-w-xl
                    text-[10px]
                    leading-relaxed
                    text-slate-500
                  "
                >
                  El sistema consultará los registros del
                  periodo seleccionado y aplicará la fórmula
                  correspondiente.
                </p>

                <button
                  type="button"
                  onClick={
                    calcularIndicador
                  }
                  disabled={
                    procesando
                  }
                  className="
                    mt-4
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-lg
                    bg-violet-600
                    px-4
                    py-2.5
                    text-[10px]
                    font-bold
                    text-white
                    hover:bg-violet-700
                    disabled:opacity-50
                  "
                >
                  {procesando ? (
                    <RefreshCw
                      size={14}
                      className="
                        animate-spin
                      "
                    />
                  ) : (
                    <Calculator
                      size={14}
                    />
                  )}

                  Calcular indicador
                </button>
              </div>
            </div>
          )}


          {/* ==================================================
              ADVERTENCIAS
          ================================================== */}

          {calculado &&
          advertencias.length >
            0 && (
            <div
              className="
                px-4
                pt-4
              "
            >
              <div
                className="
                  rounded-xl
                  border
                  border-amber-300
                  bg-amber-50
                  p-3
                "
              >
                {advertencias.map(
                  (
                    advertencia,
                    index
                  ) => (
                    <div
                      key={index}
                      className="
                        flex
                        items-start
                        gap-2
                        py-1
                      "
                    >
                      <AlertCircle
                        size={13}
                        className="
                          mt-0.5
                          shrink-0
                          text-amber-700
                        "
                      />

                      <p
                        className="
                          text-[9px]
                          leading-relaxed
                          text-amber-800
                        "
                      >
                        {advertencia}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}


          {/* ==================================================
              RESULTADO
          ================================================== */}

          {(calculado ||
            medicionGuardada) && (
            <div
              className="
                grid
                gap-4
                p-4
                xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]
              "
            >

              {/* ==============================================
                  IZQUIERDA
              ============================================== */}

              <div
                className="
                  space-y-4
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <div>
                    <p
                      className="
                        text-[9px]
                        font-bold
                        uppercase
                        text-slate-400
                      "
                    >
                      Resultado calculado
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        font-black
                        text-slate-800
                      "
                    >
                      {obtenerNombrePeriodo(
                        tipoPeriodoIndicador,
                        numeroPeriodo,
                        anio
                      )}
                    </p>
                  </div>

                  <span
                    className="
                      inline-flex
                      items-center
                      gap-1
                      rounded-full
                      border
                      border-blue-300
                      bg-blue-50
                      px-2
                      py-1
                      text-[9px]
                      font-bold
                      text-blue-700
                    "
                  >
                    {resultadoCalculo?.origen_calculo ===
                      'AUTOMATICO' ? (
                      <Database
                        size={11}
                      />
                    ) : (
                      <WandSparkles
                        size={11}
                      />
                    )}

                    {etiqueta(
                      resultadoCalculo?.origen_calculo ||
                      obtenerOrigenSugerido(
                        indicadorSeleccionado
                      )
                    )}
                  </span>
                </div>


                {/* ============================================
                    TSV - TABLA ÚNICA COMPARATIVA
                    app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
                ============================================ */}

                {esTsv ? (
                  <>
                    <TsvComparativa
                    historico={
                      comparacionTsv
                    }
                    periodo={
                      datosTsvPeriodo
                    }
                    acumulado={
                      datosTsvAcumulado
                    }
                    anio={
                      anio
                    }
                    tipoPeriodo={
                      tipoPeriodoIndicador
                    }
                    numeroPeriodo={
                      numeroPeriodo
                    }
                  />

                    {/* ========================================
                        CUMPLIMIENTO DE METAS TSV
                        app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
                    ======================================== */}

                    <TsvCumplimiento
                      evaluacionMetasTsv={
                        evaluacionMetasTsv
                      }
                      cumpleMetaGlobalTsv={
                        cumpleMetaGlobalTsv
                      }
                      anio={
                        anio
                      }
                    />

                    {/* ========================================
                        LECTURA RÁPIDA DEL PERIODO
                        No repite las cifras de la tabla.
                    ======================================== */}

                    <div
                      className="
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
                        p-4
                      "
                    >
                      <div
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <ClipboardCheck
                          size={15}
                          className="
                            mt-0.5
                            shrink-0
                            text-slate-700
                          "
                        />

                        <div>
                          <p
                            className="
                              text-[10px]
                              font-black
                              uppercase
                              text-slate-700
                            "
                          >
                            Lectura del periodo
                          </p>

                          <p
                            className="
                              mt-1
                              text-[9px]
                              leading-relaxed
                              text-slate-500
                            "
                          >
                            Analice la cantidad real de eventos junto con la
                            tasa y los kilómetros recorridos. Una variación en
                            la tasa puede producirse tanto por cambios en la
                            siniestralidad como por cambios en la exposición
                            vehicular de la flota.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : esRsvi ? (
                  <RsviMedicion
                    anio={
                      anio
                    }
                    cargando={
                      false
                    }
                    error=""
                    datos={
                      datosRsvi
                    }
                  />
                ) : esGrv ? (
                  <GrvMedicion
                    anio={
                      anio
                    }
                    cargando={
                      false
                    }
                    error=""
                    datos={
                      datosGrv
                    }
                  />
                ) : esCmPesv ? (
                  <CmPesvMedicion
                    anio={
                      anio
                    }
                    cargando={
                      false
                    }
                    error=""
                    datos={
                      datosCmPesv
                    }
                  />
                ) : esCplanPesv ? (
                  <CplanPesvMedicion
                    anio={
                      anio
                    }
                    cargando={
                      false
                    }
                    error=""
                    datos={
                      datosCplanPesv
                    }
                  />
                ) : esCpfPesvCumplimiento ? (
                  <CpfPesvCumplimientoMedicion
                    anio={
                      anio
                    }
                    cargando={
                      false
                    }
                    error=""
                    datos={
                      datosCpfPesvCumplimiento
                    }
                  />
                ) : esCpfPesvCobertura ? (
                  <CpfPesvCoberturaMedicion
                    anio={
                      anio
                    }
                    cargando={
                      false
                    }
                    error=""
                    datos={
                      datosCpfPesvCobertura
                    }
                  />
                ) : esNcac ? (
                  <NcacMedicion
                    anio={
                      anio
                    }
                    cargando={
                      false
                    }
                    error=""
                    datos={
                      datosNcac
                    }
                  />
                ) : esEjlc ? (
                  <EjlcMedicion
                    anio={
                      anio
                    }
                    cargando={
                      false
                    }
                    error=""
                    datos={
                      datosEjlc
                    }
                    lineaBase={
                      lineaBase
                    }
                    valorMeta={
                      valorMeta
                    }
                    operadorMeta={
                      operadorMeta
                    }
                  />
                ) : esIdp ? (
                  <IdpMedicion
                    anio={anio}
                    cargando={false}
                    error=""
                    datos={datosIdp}
                    lineaBase={lineaBase}
                    valorMeta={valorMeta}
                    operadorMeta={operadorMeta}
                  />
                ) : (

                   /* ==========================================
                      OTROS INDICADORES
                      app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx
                  ========================================== */

                  <>
                    <div
                      className="
                        grid
                        gap-3
                        md:grid-cols-2
                      "
                    >
                      <div
                        className="
                          rounded-xl
                          border
                          border-slate-200
                          bg-slate-50
                          p-4
                        "
                      >
                        <p
                          className="
                            text-[9px]
                            font-bold
                            uppercase
                            text-slate-500
                          "
                        >
                          {etiquetasCalculo.numerador}
                        </p>

                        <p
                          className="
                            mt-2
                            text-2xl
                            font-black
                            text-slate-800
                          "
                        >
                          {formatearNumero(
                            numerador,
                            2
                          )}
                        </p>
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
                        <p
                          className="
                            text-[9px]
                            font-bold
                            uppercase
                            text-slate-500
                          "
                        >
                          {etiquetasCalculo.denominador}
                        </p>

                        <p
                          className="
                            mt-2
                            text-2xl
                            font-black
                            text-slate-800
                          "
                        >
                          {formatearNumero(
                            denominador,
                            2
                          )}
                        </p>
                      </div>
                    </div>

                    <div
                      className="
                        grid
                        gap-3
                        md:grid-cols-3
                      "
                    >
                      <div
                        className="
                          rounded-xl
                          border
                          border-blue-300
                          bg-blue-50
                          p-4
                        "
                      >
                        <p
                          className="
                            text-[9px]
                            font-bold
                            uppercase
                            text-blue-700
                          "
                        >
                          Resultado
                        </p>

                        <p
                          className="
                            mt-2
                            text-3xl
                            font-black
                            text-slate-800
                          "
                        >
                          {formatearResultado(
                            valorResultado,
                            indicadorSeleccionado.unidad
                          )}
                        </p>
                      </div>

                      <div
                        className="
                          rounded-xl
                          border
                          border-slate-200
                          bg-white
                          p-4
                        "
                      >
                        <p
                          className="
                            text-[9px]
                            font-bold
                            uppercase
                            text-slate-500
                          "
                        >
                          Meta
                        </p>

                        <p
                          className="
                            mt-2
                            text-xl
                            font-black
                            text-slate-800
                          "
                        >
                          {resultadoCalculo?.operador_meta ||
                            configuracionActual.operador_meta}{' '}

                          {formatearResultado(
                            resultadoCalculo?.valor_meta ??
                            configuracionActual.valor_meta,
                            resultadoCalculo?.unidad_meta ||
                            configuracionActual.unidad_meta
                          )}
                        </p>
                      </div>

                      <div
                        className={`
                          rounded-xl
                          border
                          p-4
                          ${
                            resultadoCalculo?.cumple_meta ===
                            true
                              ? 'border-emerald-300 bg-emerald-50'
                              : resultadoCalculo?.cumple_meta ===
                                  false
                                ? 'border-red-300 bg-red-50'
                                : 'border-slate-200 bg-slate-50'
                          }
                        `}
                      >
                        <p
                          className="
                            text-[9px]
                            font-bold
                            uppercase
                            text-slate-500
                          "
                        >
                          Cumplimiento
                        </p>

                        {resultadoCalculo?.cumple_meta ===
                          true ? (
                          <div
                            className="
                              mt-2
                              flex
                              items-center
                              gap-2
                              text-emerald-700
                            "
                          >
                            <CheckCircle2
                              size={19}
                            />

                            <span
                              className="
                                text-sm
                                font-black
                              "
                            >
                              Cumple
                            </span>
                          </div>
                        ) : resultadoCalculo?.cumple_meta ===
                          false ? (
                          <div
                            className="
                              mt-2
                              flex
                              items-center
                              gap-2
                              text-red-700
                            "
                          >
                            <XCircle
                              size={19}
                            />

                            <span
                              className="
                                text-sm
                                font-black
                              "
                            >
                              No cumple
                            </span>
                          </div>
                        ) : (
                          <div
                            className="
                              mt-2
                              flex
                              items-center
                              gap-2
                              text-slate-500
                            "
                          >
                            <CircleDashed
                              size={19}
                            />

                            <span
                              className="
                                text-sm
                                font-black
                              "
                            >
                              Sin evaluar
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}


                {/* ============================================
                    BOTONES
                ============================================ */}

                {!medicionGuardada && (
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
                      onClick={
                        calcularIndicador
                      }
                      disabled={
                        procesando
                      }
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-lg
                        border
                        border-slate-300
                        bg-white
                        px-3
                        py-2
                        text-[10px]
                        font-bold
                        text-slate-600
                        hover:bg-slate-100
                      "
                    >
                      <RefreshCw
                        size={13}
                      />

                      Recalcular
                    </button>

                    <button
                      type="button"
                      onClick={
                        guardarMedicion
                      }
                      disabled={
                        procesando ||
                        numero(
                          valorResultado
                        ) ===
                        null
                      }
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-lg
                        bg-emerald-600
                        px-4
                        py-2
                        text-[10px]
                        font-bold
                        text-white
                        hover:bg-emerald-700
                        disabled:opacity-40
                      "
                    >
                      <Save
                        size={13}
                      />

                      Guardar medición
                    </button>
                  </div>
                )}
              </div>


              {/* ==============================================
                  PANEL DERECHO
              ============================================== */}

              <aside
                className="
                  flex
                  h-full
                  flex-col
                  rounded-xl
                  border
                  border-blue-200
                  bg-gradient-to-b
                  from-blue-50
                  to-white
                  p-5
                "
              >
                {esRsvi ? (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <Info size={19} />
                    </div>

                    <h4 className="mt-4 text-sm font-black text-slate-800">
                      Cómo interpretar el RSVI
                    </h4>

                    <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
                      El RSVI compara la cantidad de riesgos de seguridad vial
                      identificados al final de la vigencia frente a los
                      identificados al inicio.
                    </p>

                    <div className="mt-4 rounded-lg border border-blue-200 bg-white p-3">
                      <p className="text-[9px] font-bold uppercase text-blue-700">
                        Lectura del resultado
                      </p>

                      <div className="mt-2 space-y-2 text-[10px] leading-relaxed text-slate-700">
                        <p>
                          <strong>Resultado positivo:</strong>{' '}
                          al cierre se tienen identificados más riesgos que al
                          inicio. Esto puede obedecer a una mayor identificación
                          de condiciones de riesgo durante la vigencia.
                        </p>

                        <p>
                          <strong>Resultado cero:</strong>{' '}
                          la cantidad de riesgos identificados al inicio y al
                          cierre no presenta variación.
                        </p>

                        <p>
                          <strong>Resultado negativo:</strong>{' '}
                          al cierre se contabilizan menos riesgos que al inicio.
                          Debe revisarse la causa de esa variación antes de
                          emitir una conclusión sobre la gestión.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-[9px] font-black uppercase text-red-700">
                        Variación de riesgos con valoración alta
                      </p>

                      <p className="mt-2 text-[10px] leading-relaxed text-red-800">
                        La medición se complementa con RVA(fa) - RVA(ia), que
                        permite observar cómo cambió la cantidad de riesgos con
                        valoración alta. En la metodología adoptada por el CEA,
                        esta valoración corresponde a la categoría{' '}
                        <strong>CRÍTICO</strong>.
                      </p>
                    </div>

                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-[9px] font-black uppercase text-amber-800">
                        Importante
                      </p>

                      <p className="mt-2 text-[10px] leading-relaxed text-amber-800">
                        El resultado numérico del RSVI no debe interpretarse
                        de forma aislada como favorable o desfavorable. Revise
                        conjuntamente la variación de riesgos críticos, los
                        seguimientos realizados, los controles implementados y
                        las acciones de tratamiento desarrolladas durante la
                        vigencia.
                      </p>
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase text-slate-600">
                        Para el análisis
                      </p>

                      <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
                        Explique las causas de la variación observada, los
                        riesgos nuevos identificados, los cambios en la
                        valoración CRÍTICO y las medidas adoptadas para su
                        intervención y seguimiento.
                      </p>
                    </div>
                  </>
                ) : esGrv ? (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <Info size={19} />
                    </div>

                    <h4 className="mt-4 text-sm font-black text-slate-800">
                      Cómo interpretar el GRV
                    </h4>

                    <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
                      El GRV compara la cantidad de riesgos con valoración
                      alta al final de la vigencia frente a la cantidad
                      existente al inicio. Para la metodología adoptada por
                      el CEA, la valoración alta corresponde a la categoría{' '}
                      <strong>CRÍTICO</strong>.
                    </p>

                    <div className="mt-4 rounded-lg border border-blue-200 bg-white p-3">
                      <p className="text-[9px] font-bold uppercase text-blue-700">
                        Lectura del resultado
                      </p>

                      <div className="mt-2 space-y-2 text-[10px] leading-relaxed text-slate-700">
                        <p>
                          <strong>Resultado negativo:</strong>{' '}
                          al cierre existen menos riesgos con valoración
                          CRÍTICA que al inicio.
                        </p>

                        <p>
                          <strong>Resultado cero:</strong>{' '}
                          la cantidad de riesgos con valoración CRÍTICA no
                          presenta variación entre el inicio y el cierre.
                        </p>

                        <p>
                          <strong>Resultado positivo:</strong>{' '}
                          al cierre existen más riesgos con valoración
                          CRÍTICA que al inicio. Revise si corresponden a
                          riesgos nuevos o a riesgos cuya valoración aumentó.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-[9px] font-black uppercase text-amber-800">
                        Importante
                      </p>

                      <p className="mt-2 text-[10px] leading-relaxed text-amber-800">
                        El resultado debe analizarse junto con los riesgos
                        nuevos, los que pasan a CRÍTICO, los que salen de
                        CRÍTICO, los que permanecen en esa categoría y los
                        seguimientos y controles realizados durante la
                        vigencia.
                      </p>
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase text-slate-600">
                        Para el análisis
                      </p>

                      <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
                        Explique las causas de la variación de los riesgos
                        CRÍTICOS, identifique los riesgos nuevos y describa
                        las medidas de tratamiento, seguimiento y
                        revaloración desarrolladas por el CEA.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-lg
                        bg-blue-100
                        text-blue-700
                      "
                    >
                      <Info size={19} />
                    </div>

                    <h4 className="mt-4 text-sm font-black text-slate-800">
                      {explicacion.titulo}
                    </h4>

                    <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
                      {explicacion.descripcion}
                    </p>

                    <div className="mt-4 rounded-lg border border-blue-200 bg-white p-3">
                      <p className="text-[9px] font-bold uppercase text-blue-700">
                        Interpretación
                      </p>
                      <p className="mt-2 text-[10px] leading-relaxed text-slate-700">
                        {explicacion.interpretacion}
                      </p>
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[9px] font-black uppercase text-slate-600">
                        Sentido de mejora
                      </p>
                      <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
                        {explicacion.mejora}
                      </p>
                    </div>

                    {esIdp &&
                      configuracionActual?.interpretacion_indicador && (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                          <p className="text-[9px] font-black uppercase text-blue-800">
                            Interpretación configurada
                          </p>
                          <p className="mt-2 text-[10px] leading-relaxed text-slate-700">
                            {configuracionActual.interpretacion_indicador}
                          </p>
                        </div>
                      )}

                    {esIdp &&
                      configuracionActual?.observaciones && (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <p className="text-[9px] font-black uppercase text-amber-800">
                            Observaciones
                          </p>
                          <p className="mt-2 text-[10px] leading-relaxed text-slate-700">
                            {configuracionActual.observaciones}
                          </p>
                        </div>
                      )}

                    {esTsv && (
                      <TsvInterpretacion />
                    )}
                  </>
                )}
              </aside>
            </div>
          )}
        </section>
      )}


      {/* ====================================================
          PASO 3 - ANÁLISIS
      ==================================================== */}

      {medicionGuardada && (
        <section
          className="
            overflow-hidden
            rounded-xl
            border
            border-slate-400
            bg-white
            shadow-sm
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-3
              border-b
              border-slate-200
              bg-slate-50
              px-4
              py-3
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <FileText
                size={16}
                className="
                  text-slate-700
                "
              />

              <div>
                <h3
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    text-slate-700
                  "
                >
                  3. Análisis
                </h3>

                <p
                  className="
                    mt-0.5
                    text-[9px]
                    text-slate-500
                  "
                >
                  Explique el comportamiento del indicador y
                  asigne el responsable.
                </p>
              </div>
            </div>

            {analisisGuardado && (
              <span
                className="
                  inline-flex
                  items-center
                  gap-1
                  rounded-full
                  border
                  border-emerald-300
                  bg-emerald-50
                  px-2
                  py-1
                  text-[9px]
                  font-bold
                  text-emerald-700
                "
              >
                <CheckCircle2
                  size={12}
                />

                Completado
              </span>
            )}
          </div>

          <div
            className="
              p-4
            "
          >
            {esTsv && (
              <TsvOrientacionAnalisis />
            )}

            <div
              className="
                grid
                gap-3
                lg:grid-cols-2
              "
            >
              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[9px]
                    font-bold
                    uppercase
                    text-slate-600
                  "
                >
                  Análisis del resultado *
                </label>

                <textarea
                  rows={5}
                  value={
                    analisisResultado
                  }
                  onChange={
                    event =>
                      setAnalisisResultado(
                        event.target.value
                      )
                  }
                  disabled={
                    validada ||
                    cerrada
                  }
                  placeholder={
                    esTsv
                      ? 'Ejemplo: Durante el periodo no se presentaron fatalidades ni personas lesionadas. Se registraron...'
                      : 'Describa el comportamiento del indicador frente a la línea base y la meta...'
                  }
                  className={`
                    w-full
                    resize-none
                    rounded-lg
                    border
                    px-3
                    py-2
                    text-[10px]
                    disabled:bg-slate-100
                    ${
                      !texto(analisisResultado) &&
                      !validada &&
                      !cerrada
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-300'
                    }
                  `}
                />

                {!texto(analisisResultado) &&
                  !validada &&
                  !cerrada && (
                    <p className="mt-1 text-[9px] font-semibold text-amber-700">
                      Campo obligatorio.
                    </p>
                  )}
              </div>

              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[9px]
                    font-bold
                    uppercase
                    text-slate-600
                  "
                >
                  Observaciones
                </label>

                <textarea
                  rows={5}
                  value={
                    observacionesMedicion
                  }
                  onChange={
                    event =>
                      setObservacionesMedicion(
                        event.target.value
                      )
                  }
                  disabled={
                    validada ||
                    cerrada
                  }
                  placeholder="Registre aclaraciones adicionales si son necesarias..."
                  className={`
                    w-full
                    resize-none
                    rounded-lg
                    border
                    px-3
                    py-2
                    text-[10px]
                    disabled:bg-slate-100
                    ${
                      !texto(observacionesMedicion) &&
                      !validada &&
                      !cerrada
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-300'
                    }
                  `}
                />

                {!texto(observacionesMedicion) &&
                  !validada &&
                  !cerrada && (
                    <p className="mt-1 text-[9px] font-semibold text-amber-700">
                      Campo obligatorio.
                    </p>
                  )}
              </div>
            </div>

            <div
              className="
                mt-3
              "
            >
              <label
                className="
                  mb-1
                  flex
                  items-center
                  gap-1
                  text-[9px]
                  font-bold
                  uppercase
                  text-slate-600
                "
              >
                <UserRound
                  size={12}
                />

                Responsable *
              </label>

              <select
                value={
                  responsablePersonalId
                }
                onChange={
                  event =>
                    setResponsablePersonalId(
                      event.target.value
                    )
                }
                disabled={
                  validada ||
                  cerrada
                }
                className={`
                  w-full
                  rounded-lg
                  border
                  px-3
                  py-2
                  text-xs
                  disabled:bg-slate-100
                  ${
                    !responsablePersonalId &&
                    !validada &&
                    !cerrada
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-slate-300 bg-white'
                  }
                `}
              >
                <option value="">
                  Seleccione responsable
                </option>

                {personal.map(
                  persona => (
                    <option
                      key={
                        persona.id
                      }
                      value={
                        persona.id
                      }
                    >
                      {obtenerNombrePersona(
                        persona
                      )}

                      {persona.documento
                        ? ` · ${persona.documento}`
                        : ''}
                    </option>
                  )
                )}
              </select>

              {!responsablePersonalId &&
                !validada &&
                !cerrada && (
                  <p className="mt-1 text-[9px] font-semibold text-amber-700">
                    Campo obligatorio.
                  </p>
                )}
            </div>

            {!validada &&
            !cerrada && (
              <div
                className="
                  mt-4
                  flex
                  justify-end
                "
              >
                <button
                  type="button"
                  onClick={
                    guardarAnalisis
                  }
                  disabled={
                    procesando ||
                    analisisGuardado ||
                    !formularioAnalisisCompleto
                  }
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-lg
                    bg-blue-600
                    px-4
                    py-2
                    text-[10px]
                    font-bold
                    text-white
                    hover:bg-blue-700
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  <Save
                    size={13}
                  />

                  Guardar análisis
                </button>
              </div>
            )}
          </div>
        </section>
      )}


      {/* ====================================================
          PASO 4 - VALIDACIÓN
      ==================================================== */}

      {medicionGuardada && (
        <section
          className="
            overflow-hidden
            rounded-xl
            border
            border-slate-400
            bg-white
            shadow-sm
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
              border-b
              border-slate-200
              bg-slate-50
              px-4
              py-3
            "
          >
            <ShieldCheck
              size={16}
              className="
                text-slate-700
              "
            />

            <div>
              <h3
                className="
                  text-[10px]
                  font-black
                  uppercase
                  text-slate-700
                "
              >
                4. Validación y cierre
              </h3>

              <p
                className="
                  mt-0.5
                  text-[9px]
                  text-slate-500
                "
              >
                Revise que la medición esté completa antes de
                validarla.
              </p>
            </div>
          </div>

          <div
            className="
              p-4
            "
          >
            <div
              className="
                grid
                gap-2
                md:grid-cols-2
              "
            >
              {[
                {
                  texto:
                    'Configuración registrada',
                  ok:
                    configurado,
                },
                {
                  texto:
                    'Resultado guardado',
                  ok:
                    medicionGuardada,
                },
                {
                  texto:
                    'Análisis registrado',
                  ok:
                    Boolean(
                      texto(
                        medicionSeleccionada
                          ?.analisis_resultado
                      )
                    ),
                },
                {
                  texto:
                    'Observaciones registradas',
                  ok:
                    Boolean(
                      texto(
                        medicionSeleccionada
                          ?.observaciones
                      )
                    ),
                },
                {
                  texto:
                    'Responsable seleccionado',
                  ok:
                    Boolean(
                      medicionSeleccionada
                        ?.responsable_personal_id
                    ),
                },
              ].map(
                item => (
                  <div
                    key={
                      item.texto
                    }
                    className={`
                      flex
                      items-center
                      gap-2
                      rounded-lg
                      border
                      px-3
                      py-2
                      ${
                        item.ok
                          ? `
                            border-emerald-200
                            bg-emerald-50
                            text-emerald-700
                          `
                          : `
                            border-slate-200
                            bg-slate-50
                            text-slate-500
                          `
                      }
                    `}
                  >
                    {item.ok ? (
                      <CheckCircle2
                        size={14}
                      />
                    ) : (
                      <Circle
                        size={14}
                      />
                    )}

                    <span
                      className="
                        text-[10px]
                        font-bold
                      "
                    >
                      {item.texto}
                    </span>
                  </div>
                )
              )}
            </div>

            {!validada &&
            !cerrada && (
              <div
                className="
                  mt-4
                  flex
                  flex-col
                  gap-3
                  rounded-xl
                  border
                  border-amber-200
                  bg-amber-50
                  p-4
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div>
                  <p
                    className="
                      text-[10px]
                      font-black
                      text-amber-800
                    "
                  >
                    Medición en borrador
                  </p>

                  <p
                    className="
                      mt-1
                      text-[9px]
                      text-amber-700
                    "
                  >
                    Complete el análisis, las observaciones y el responsable antes
                    de validar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    validarMedicion
                  }
                  disabled={
                    procesando ||
                    !analisisGuardado
                  }
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-1.5
                    rounded-lg
                    bg-blue-600
                    px-4
                    py-2
                    text-[10px]
                    font-bold
                    text-white
                    hover:bg-blue-700
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  <BadgeCheck
                    size={13}
                  />

                  Validar medición
                </button>
              </div>
            )}

            {validada &&
            !cerrada && (
              <div
                className="
                  mt-4
                  flex
                  flex-col
                  gap-3
                  rounded-xl
                  border
                  border-blue-200
                  bg-blue-50
                  p-4
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div>
                  <p
                    className="
                      text-[10px]
                      font-black
                      text-blue-800
                    "
                  >
                    Medición validada
                  </p>

                  <p
                    className="
                      mt-1
                      text-[9px]
                      text-blue-700
                    "
                  >
                    La información ya fue revisada.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    cerrarMedicion
                  }
                  disabled={
                    procesando
                  }
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-lg
                    bg-emerald-600
                    px-4
                    py-2
                    text-[10px]
                    font-bold
                    text-white
                    hover:bg-emerald-700
                  "
                >
                  <LockKeyhole
                    size={13}
                  />

                  Cerrar medición
                </button>
              </div>
            )}

            {cerrada && (
              <div
                className="
                  mt-4
                  rounded-xl
                  border
                  border-emerald-300
                  bg-emerald-50
                  p-4
                "
              >
                <div
                  className="
                    flex
                    items-start
                    gap-3
                  "
                >
                  <LockKeyhole
                    size={18}
                    className="
                      mt-0.5
                      text-emerald-700
                    "
                  />

                  <div>
                    <p
                      className="
                        text-xs
                        font-black
                        text-emerald-800
                      "
                    >
                      Medición cerrada
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        leading-relaxed
                        text-emerald-700
                      "
                    >
                      Este resultado queda protegido como
                      registro histórico del PESV.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}


      {/* ====================================================
          MEDICIONES REGISTRADAS
      ==================================================== */}

      <section
        className="
          overflow-hidden
          rounded-xl
          border
          border-slate-300
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            border-b
            border-slate-200
            bg-slate-50
            px-4
            py-3
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <ClipboardCheck
              size={15}
            />

            <div>
              <h3
                className="
                  text-[10px]
                  font-black
                  uppercase
                  text-slate-700
                "
              >
                Mediciones registradas
              </h3>

              <p
                className="
                  mt-0.5
                  text-[9px]
                  text-slate-500
                "
              >
                Consulte los periodos registrados para este indicador.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              nuevaMedicion
            }
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-lg
              border
              border-slate-300
              bg-white
              px-3
              py-1.5
              text-[9px]
              font-bold
              text-slate-600
              hover:bg-slate-100
            "
          >
            <RotateCcw
              size={12}
            />

            Nueva medición
          </button>
        </div>

        {medicionesIndicador.length ===
          0 ? (
          <div
            className="
              px-4
              py-8
              text-center
              text-[10px]
              text-slate-500
            "
          >
            No hay mediciones registradas para este indicador.
          </div>
        ) : (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                min-w-[850px]
                w-full
                text-xs
              "
            >
              <thead
                className="
                  bg-slate-800
                  text-[9px]
                  uppercase
                  text-white
                "
              >
                <tr>
                  <th className="px-3 py-2 text-center">
                    Periodo
                  </th>

                  <th className="px-3 py-2 text-center">
                    Resultado
                  </th>

                  {!esTsv && (
                    <>
                      <th className="px-3 py-2 text-center">
                        Meta
                      </th>

                      <th className="px-3 py-2 text-center">
                        Cumplimiento
                      </th>
                    </>
                  )}

                  <th className="px-3 py-2 text-center">
                    Estado
                  </th>

                  <th className="px-3 py-2 text-center">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody
                className="
                  divide-y
                  divide-slate-200
                "
              >
                {medicionesIndicador.map(
                  medicion => (
                    <tr
                      key={
                        medicion.id
                      }
                      className="
                        hover:bg-slate-50
                      "
                    >
                      <td
                        className="
                          px-3
                          py-3
                          text-center
                          text-[10px]
                          font-semibold
                          text-slate-700
                        "
                      >
                        {obtenerNombrePeriodo(
                          medicion.tipo_periodo,
                          medicion.numero_periodo,
                          medicion.anio
                        )}
                      </td>

                      <td
                        className="
                          px-3
                          py-3
                          text-center
                          text-sm
                          font-black
                          text-slate-800
                        "
                      >
                        {esTsv
                          ? 'Ver tasas'
                          : formatearResultado(
                              medicion.valor_resultado,
                              medicion.unidad_resultado
                            )}
                      </td>

                      {!esTsv && (
                        <>
                          <td
                            className="
                              px-3
                              py-3
                              text-center
                              text-[10px]
                              font-bold
                              text-slate-700
                            "
                          >
                            {medicion.operador_meta}{' '}

                            {formatearResultado(
                              medicion.valor_meta,
                              medicion.unidad_meta
                            )}
                          </td>

                          <td
                            className="
                              px-3
                              py-3
                              text-center
                            "
                          >
                            {medicion.cumple_meta ===
                              true
                              ? 'Cumple'
                              : medicion.cumple_meta ===
                                  false
                                ? 'No cumple'
                                : '—'}
                          </td>
                        </>
                      )}

                      <td
                        className="
                          px-3
                          py-3
                          text-center
                        "
                      >
                        <span
                          className="
                            rounded-full
                            bg-slate-100
                            px-2
                            py-1
                            text-[9px]
                            font-bold
                            text-slate-700
                          "
                        >
                          {etiqueta(
                            medicion.estado
                          )}
                        </span>
                      </td>

                      <td
                        className="
                          px-3
                          py-3
                          text-center
                        "
                      >
                                                <div
                          className="
                            flex
                            items-center
                            justify-center
                            gap-1.5
                          "
                        >
                          <button
                            type="button"
                            onClick={
                              () =>
                                cargarMedicion(
                                  medicion
                                )
                            }
                            className="
                              inline-flex
                              items-center
                              gap-1
                              rounded-lg
                              border
                              border-slate-300
                              bg-white
                              px-2
                              py-1
                              text-[9px]
                              font-bold
                              text-slate-600
                              hover:bg-slate-100
                            "
                          >
                            <Pencil
                              size={11}
                            />

                            Ver
                          </button>

                          {/* ==================================
                              SOPORTE DE MEDICIÓN PESV
                              app/admin/pesv/indicadores/componentes/MedicionIndicadores.jsx

                              Disponible cuando la medición ya
                              fue VALIDADA o CERRADA.
                          ================================== */}

                          {[
                            'VALIDADA',
                            'CERRADA',
                          ].includes(
                            texto(
                              medicion?.estado
                            ).toUpperCase()
                          ) && (
                            <button
                              type="button"
                              onClick={
                                () =>
                                  abrirSoporteMedicion(
                                    medicion
                                  )
                              }
                              className="
                                inline-flex
                                items-center
                                gap-1
                                rounded-lg
                                border
                                border-blue-300
                                bg-blue-50
                                px-2
                                py-1
                                text-[9px]
                                font-bold
                                text-blue-700
                                hover:bg-blue-100
                              "
                            >
                              <FileText
                                size={11}
                              />

                              Soporte PDF
                            </button>
                          )}

                          {texto(
                            medicion?.estado
                          ).toUpperCase() ===
                            'BORRADOR' && (
                            <button
                              type="button"
                              onClick={
                                () =>
                                  eliminarMedicion(
                                    medicion
                                  )
                              }
                              disabled={
                                procesando
                              }
                              className="
                                inline-flex
                                items-center
                                gap-1
                                rounded-lg
                                border
                                border-red-300
                                bg-red-50
                                px-2
                                py-1
                                text-[9px]
                                font-bold
                                text-red-700
                                hover:bg-red-100
                                disabled:opacity-40
                              "
                            >
                              <Trash2
                                size={11}
                              />

                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}