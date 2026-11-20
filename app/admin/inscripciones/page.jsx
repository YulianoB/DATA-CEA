// app/admin/inscripciones/page.jsx

'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import { FileSignature } from 'lucide-react'
import { ORDEN_CATEGORIAS } from '@/lib/reglasCategoriasInscripciones'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import {
  ESTILO_SECCIONES,
  ESTILO_ENCABEZADO_TABLA,
  ESTILO_CELDAS_TABLA,
  MarcoTabla,
  BotonConsultar,
  BotonSecundario,
  BotonDocumentos,
  BotonExpediente,
} from '@/components/admin/EstiloModulo'

// ============================================================
// CONSTANTES
// ============================================================

const API_URL =
  '/api/admin/inscripciones/aprendices'

const CATEGORIAS = ORDEN_CATEGORIAS

// ============================================================
// HELPERS
// ============================================================

function fechaLocalHoy() {
  const hoy = new Date()
  return [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, '0'),
    String(hoy.getDate()).padStart(2, '0'),
  ].join('-')
}


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
  return (
    user?.nombreCompleto ||
    user?.nombre_completo ||
    user?.usuario ||
    ''
  )
}

function formatearFecha(
  valor
) {
  if (
    !valor
  ) {
    return '-'
  }

  const fecha =
    String(
      valor
    ).slice(
      0,
      10
    )

  const [
    year,
    month,
    day,
  ] =
    fecha.split(
      '-'
    )

  if (
    !year ||
    !month ||
    !day
  ) {
    return valor
  }

  return `${day}/${month}/${year}`
}

function formatearDocumento(
  valor
) {
  const limpio =
    String(
      valor ||
      ''
    ).replace(
      /\D/g,
      ''
    )

  if (
    !limpio
  ) {
    return '-'
  }

  try {
    return new Intl.NumberFormat(
      'es-CO'
    ).format(
      Number(
        limpio
      )
    )
  } catch {
    return valor
  }
}

// ============================================================
// ESTADO MATRÍCULA
// ============================================================
//
// El estado general de matrícula no es una clasificación operativa
// confiable para los datos históricos. Se conserva el campo en la
// base únicamente por compatibilidad durante la transición.

// ============================================================
// ESTADO RUNT
// ============================================================

function obtenerEstadoRunt(
  control
) {
  if (
    !control
  ) {
    return {
      estado:
        'SIN CONTROL',

      tipo:
        'gray',

      detalle:
        '',
    }
  }

  const certificacion =
    mayusculas(
      control.estado_certificacion
    )

  const registro =
    mayusculas(
      control.estado_registro
    )

  const verificacion =
    mayusculas(
      control.resultado_verificacion
    )

  if (
    certificacion ===
    'CERTIFICADO'
  ) {
    return {
      estado:
        'CERTIFICADO',

      tipo:
        'green',

      detalle:
        control.fecha_certificacion
          ? `Certificado ${formatearFecha(
              control.fecha_certificacion
            )}`
          : '',
    }
  }

  if (
    registro ===
    'REGISTRADO'
  ) {
    return {
      estado:
        'REGISTRADO',

      tipo:
        'blue',

      detalle:
        control.fecha_registro
          ? `Registrado ${formatearFecha(
              control.fecha_registro
            )}`
          : '',
    }
  }

  if (
    verificacion ===
    'NO REGISTRADO'
  ) {
    return {
      estado:
        'NO REGISTRADO',

      tipo:
        'red',

      detalle:
        'Debe inscribirse en RUNT',
    }
  }

  if (
    verificacion ===
    'REGISTRADO'
  ) {
    return {
      estado:
        'REGISTRADO',

      tipo:
        'yellow',

      detalle:
        'Pendiente de registro',
    }
  }

  return {
    estado:
      'PENDIENTE',

    tipo:
      'yellow',

    detalle:
      'Pendiente de verificación',
  }
}

// ============================================================
// ESTADO SICOV
// ============================================================

function obtenerEstadoSicov(
  control
) {
  if (
    !control
  ) {
    return {
      estado:
        'SIN CONTROL',

      tipo:
        'gray',

      detalle:
        '',
    }
  }

  const certificacion =
    mayusculas(
      control.estado_certificacion
    )

  const registro =
    mayusculas(
      control.estado_registro
    )

  if (
    certificacion ===
    'CERTIFICADO'
  ) {
    return {
      estado:
        'CERTIFICADO',

      tipo:
        'green',

      detalle:
        control.fecha_certificacion
          ? `Certificado ${formatearFecha(
              control.fecha_certificacion
            )}`
          : '',
    }
  }

  if (
    registro ===
    'REGISTRADO'
  ) {
    return {
      estado:
        'REGISTRADO',

      tipo:
        'blue',

      detalle:
        control.fecha_registro
          ? `Registrado ${formatearFecha(
              control.fecha_registro
            )}`
          : 'Pendiente de certificación',
    }
  }

  return {
    estado:
      'PENDIENTE',

    tipo:
      'yellow',

    detalle:
      'Pendiente de registro',
  }
}

// ============================================================
// ESTADO SIET
// ============================================================

function obtenerEstadoSiet(
  control
) {
  if (
    !control
  ) {
    return {
      estado:
        'SIN CONTROL',

      tipo:
        'gray',

      detalle:
        '',
    }
  }

  const estado =
    mayusculas(
      control.estado
    )

  if (
    estado ===
    'CERTIFICADO'
  ) {
    return {
      estado:
        'CERTIFICADO',

      tipo:
        'green',

      detalle:
        control.fecha_certificacion
          ? `Certificado ${formatearFecha(
              control.fecha_certificacion
            )}`
          : '',
    }
  }

  if (
    estado ===
    'REGISTRADO'
  ) {
    return {
      estado:
        'REGISTRADO',

      tipo:
        'blue',

      detalle:
        control.fecha_registro
          ? `Registrado ${formatearFecha(
              control.fecha_registro
            )}`
          : 'Pendiente de certificación',
    }
  }

  return {
    estado:
      'PENDIENTE',

    tipo:
      'yellow',

    detalle:
      'Pendiente de registro',
  }
}

// ============================================================
// FETCH SEGURO
// ============================================================

async function fetchJsonSeguro(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      {
        ...options,

        cache:
          'no-store',
      }
    )

  const textoRespuesta =
    await response.text()

  let json

  try {
    json =
      textoRespuesta
        ? JSON.parse(
            textoRespuesta
          )
        : {}
  } catch {
    console.error(
      `API NO JSON | URL: ${url} | HTTP: ${response.status} | RESPUESTA: ${textoRespuesta.slice(0, 1000)}`
    )

    throw new Error(
      `La API respondió contenido no válido. HTTP ${response.status}.`
    )
  }

  if (
    !response.ok ||
    json?.status ===
      'error'
  ) {
    throw new Error(
      json?.message ||
      `Error HTTP ${response.status}.`
    )
  }

  return json
}

// ============================================================
// BADGE
// ============================================================

function Badge({
  children,
  tipo = 'gray',
}) {
  const clases = {
    gray:
      'bg-gray-100 text-gray-700 border-gray-300',

    green:
      'bg-emerald-50 text-emerald-700 border-emerald-300',

    red:
      'bg-red-50 text-red-700 border-red-300',

    yellow:
      'bg-amber-50 text-amber-700 border-amber-300',

    blue:
      'bg-blue-50 text-blue-700 border-blue-300',

    purple:
      'bg-purple-50 text-purple-700 border-purple-300',
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        px-2
        py-1
        rounded-md
        border
        text-[10px]
        font-semibold
        ${clases[tipo] || clases.gray}
      `}
    >
      {children}
    </span>
  )
}

// ============================================================
// ESTADO OPERATIVO DE MATRICULA: fuente control_runt
// ============================================================

function EstadoMatriculaRunt({ estado }) {
  const actual = estado || { estado: 'SIN_CONTROL', etiqueta: 'SIN CONTROL' }
  // Colores sólidos exclusivos de los estados operativos de matrícula.
  const coloresEstado = {
    PENDIENTE_RUNT: 'bg-slate-600 text-white border-slate-600',
    EN_PROCESO: 'bg-emerald-600 text-white border-emerald-600',
    POR_VENCER: 'bg-amber-500 text-amber-950 border-amber-600',
    VENCIDO: 'bg-red-600 text-white border-red-600',
    CERTIFICADO: 'bg-green-600 text-white border-green-600',
    SIN_CONTROL: 'bg-red-600 text-white border-red-600',
  }
  const dias = actual.dias_restantes
  const progreso = actual.progreso
  const mostrarBarra = Number.isFinite(progreso) &&
    !['CERTIFICADO', 'PENDIENTE_RUNT', 'SIN_CONTROL'].includes(actual.estado)
  const colorBarra = actual.estado === 'VENCIDO'
    ? 'bg-red-500'
    : actual.estado === 'POR_VENCER'
      ? 'bg-amber-500'
      : 'bg-emerald-500'

  return (
    <div className="flex min-w-[120px] flex-col items-center gap-1"
      title={actual.fecha_registro
        ? `Registro RUNT: ${formatearFecha(actual.fecha_registro)} · Límite: ${formatearFecha(actual.fecha_limite)} · Proceso #${actual.numero_proceso || 1}`
        : 'El plazo empieza con la fecha de registro formal en RUNT'}>
      <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[10px] font-bold tracking-wide shadow-sm ${coloresEstado[actual.estado] || coloresEstado.PENDIENTE_RUNT}`}>
        {actual.etiqueta || 'PENDIENTE RUNT'}
      </span>
      {mostrarBarra && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div className={`h-full rounded-full ${colorBarra}`}
            style={{ width: `${progreso}%` }} />
        </div>
      )}
      {actual.estado === 'CERTIFICADO' ? (
        <span className="text-[10px] text-gray-600">{actual.fecha_certificacion ? `Certificado: ${formatearFecha(actual.fecha_certificacion)}` : 'Fecha de certificación no registrada'}</span>
      ) : actual.continuacion_pendiente ? (
        <span className="text-[10px] text-red-700">Continuación: pendiente de reproceso</span>
      ) : Number.isFinite(dias) ? (
        <span className="text-[10px] text-gray-600">
          {dias < 0
            ? `Venció hace ${Math.abs(dias)} día(s)`
            : dias === 0
              ? 'Último día del plazo'
              : `${dias} día(s) restantes`}
        </span>
      ) : (
        <span className="text-[10px] text-gray-500">
          {actual.estado === 'SIN_CONTROL' ? 'Revisar control' : 'Sin plazo iniciado'}
        </span>
      )}
    </div>
  )
}

// ============================================================
// CAMPO
// ============================================================

function Campo({
  label,
  valor,
}) {
  return (
    <div
      className="
        border
        border-gray-200
        rounded-lg
        p-2.5
        bg-white
      "
    >

      <p
        className="
          text-[10px]
          uppercase
          tracking-wide
          font-semibold
          text-gray-500
        "
      >
        {label}
      </p>

      <p
        className="
          text-xs
          font-semibold
          text-gray-800
          mt-1
          break-words
        "
      >
        {texto(
          valor
        ) ||
          '-'}
      </p>

    </div>
  )
}

// ============================================================
// TARJETA PROCESO EXTERNO
// ============================================================

function TarjetaProcesoExterno({
  titulo,
  icono,
  estado,
}) {
  return (
    <div
      className="
        border
        border-gray-300
        rounded-lg
        p-3
        bg-white
      "
    >

      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
          "
        >

          <div
            className="
              w-9
              h-9
              rounded-lg
              bg-gray-100
              text-gray-600
              flex
              items-center
              justify-center
            "
          >
            <i
              className={`fas ${icono}`}
            ></i>
          </div>

          <div>

            <p
              className="
                text-[10px]
                uppercase
                font-bold
                tracking-wide
                text-gray-500
              "
            >
              {titulo}
            </p>

            {estado.detalle && (
              <p
                className="
                  text-[10px]
                  text-gray-500
                  mt-1
                "
              >
                {estado.detalle}
              </p>
            )}

          </div>

        </div>

        <Badge
          tipo={
            estado.tipo
          }
        >
          {estado.estado}
        </Badge>

      </div>

    </div>
  )
}

// ============================================================
// PÁGINA
// ============================================================

// Catálogos de edición alineados con Nueva matrícula.
const CATALOGOS_EDICION_MATRICULA = {
  tipo_doc:['CC','TI','CE','PA','PEP','PPT'],
  acudi_tipo_doc:['CC','TI','CE','PA','PEP','PPT'],
  genero:['MASCULINO','FEMENINO'],
  estado_civil:['SOLTERO/A','CASADO/A','UNIÓN LIBRE','VIUDO/A','DIVORCIADO/A'],
  ocupacion:['EMPLEADO','ESTUDIANTE','INDEPENDIENTE','COMERCIANTE','HOGAR','CONTRATISTA','EMPRESARIO','NO APLICA'],
  nivel_educativo:['BACHILLER','TÉCNICO','TECNÓLOGO','PROFESIONAL','ESPECIALISTA','MAESTRÍA','DOCTORADO','NO APLICA'],
  estrato:['1','2','3','4','5','6']
}
const CAMPOS_MAYUSCULAS_EDICION = new Set([
  'nombres','apellidos','lugar_expedicion','direccion','barrio','ciudad',
  'eps','emergencia_nombre','acudi_nombres','acudi_apellidos','acudi_direccion'
])
const CAMPOS_NUMERICOS_EDICION = new Set([
  'celular','emergencia_celular','acudi_documento','acudi_celular'
])
const CATEGORIAS_CEA_POR_NIVEL = {
  'NIVEL I':['A2','B1','C1','RC1'],
  'NIVEL II':['A2','B1','C1','RC1','B2','C2'],
  'NIVEL III':['A2','B1','C1','RC1','B2','C2','B3','C3']
}
// En la corrección se admiten todas las categorías oficiales del catálogo.
// La creación de nuevas matrículas conserva las restricciones por nivel del CEA.
function categoriasEdicionUsuario() {
  return [...CATEGORIAS_CEA_POR_NIVEL['NIVEL III']]
}
function validarEdicionMatricula(datos,categoria,categorias) {
  const valor=k=>String(datos[k]??'').trim()
  for(const [campo,opciones] of Object.entries(CATALOGOS_EDICION_MATRICULA)){
    if(campo==='acudi_tipo_doc'&&!valor('acudi_documento')&&!valor('acudi_nombres'))continue
    if(valor(campo)&&!opciones.includes(valor(campo)))
      return 'Seleccione una opción válida para '+campo.replaceAll('_',' ')+'.'
  }
  for(const campo of ['tipo_doc','nombres','apellidos','fecha_nacimiento','genero','estado_civil',
    'ocupacion','eps','estrato','nivel_educativo','direccion','barrio','ciudad','celular'])
    if(!valor(campo))return 'Complete el campo obligatorio: '+campo.replaceAll('_',' ')+'.'
  if(!/^\d{10}$/.test(valor('celular')))return 'El celular debe tener 10 dígitos.'
  for(const campo of ['correo','acudi_correo'])
    if(valor(campo)&&!/^\S+@\S+\.\S+$/.test(valor(campo)))
      return 'Ingrese un correo electrónico válido.'
  if(valor('emergencia_celular')&&!/^\d{10}$/.test(valor('emergencia_celular')))
    return 'El contacto de emergencia debe tener 10 dígitos.'
  if(valor('acudi_celular')&&!/^\d{10}$/.test(valor('acudi_celular')))
    return 'El celular del acudiente debe tener 10 dígitos.'
  if(!categorias.includes(categoria))
    return 'Seleccione una categoría válida del catálogo oficial.'
  const f=new Date(valor('fecha_nacimiento')+'T12:00:00Z')
  if(!/^\d{4}-\d{2}-\d{2}$/.test(valor('fecha_nacimiento'))||
    Number.isNaN(f.getTime())||f.toISOString().slice(0,10)!==valor('fecha_nacimiento'))
    return 'Ingrese una fecha de nacimiento válida.'
  const hoy=new Date()
  let edad=hoy.getFullYear()-f.getUTCFullYear()
  if(hoy.getMonth()<f.getUTCMonth()||(hoy.getMonth()===f.getUTCMonth()&&hoy.getDate()<f.getUTCDate()))edad--
  if(edad<16)return 'El aprendiz debe tener al menos 16 años.'
  if(edad<18&&!['A2','B1'].includes(categoria))
    return 'Con 16 o 17 años solo se permite A2 o B1.'
  if(edad<18){
    for(const campo of ['acudi_nombres','acudi_apellidos','acudi_tipo_doc','acudi_documento','acudi_celular'])
      if(!valor(campo))return 'Complete los datos del acudiente.'
    if(!/^\d+$/.test(valor('acudi_documento'))||!/^\d{10}$/.test(valor('acudi_celular')))
      return 'Revise documento y celular del acudiente.'
  }else if(!valor('emergencia_nombre')||!/^\d{10}$/.test(valor('emergencia_celular')))
    return 'Ingrese el nombre y celular de 10 dígitos del contacto de emergencia.'
  return ''
}
const CAMPOS_CORREGIR_EXPEDIENTE = [
  ['Identificación y datos básicos',[
    ['tipo_doc','Tipo de documento'],['nombres','Nombres'],['apellidos','Apellidos'],
    ['fecha_nacimiento','Fecha de nacimiento','date'],['lugar_expedicion','Lugar de expedición'],
    ['genero','Género']
  ]],
  ['Contacto',[
    ['celular','Celular'],['correo','Correo electrónico'],['direccion','Dirección'],
    ['barrio','Barrio'],['ciudad','Ciudad']
  ]],
  ['Información complementaria',[
    ['estado_civil','Estado civil'],['ocupacion','Ocupación'],['eps','EPS'],
    ['estrato','Estrato'],['nivel_educativo','Nivel educativo']
  ]],
  ['Contacto de emergencia',[
    ['emergencia_nombre','Nombre'],['emergencia_celular','Celular']
  ]],
  ['Acudiente (solo cuando corresponda)',[
    ['acudi_nombres','Nombres'],['acudi_apellidos','Apellidos'],
    ['acudi_tipo_doc','Tipo de documento'],['acudi_documento','Documento'],
    ['acudi_celular','Celular'],['acudi_direccion','Dirección'],
    ['acudi_correo','Correo']
  ]]
]

export default function InscripcionesPage() {
  const router =
    useRouter()

  const debounceRef =
    useRef(
      null
    )

  // ==========================================================
  // SESIÓN
  // ==========================================================

  const [
    user,
    setUser,
  ] =
    useState(
      null
    )

  // ==========================================================
  // FILTROS
  // Cargar las matriculas recientes de todas las fechas (primera pagina).
  // ==========================================================

  // La API de la empresa es la fuente de verdad para las categorías autorizadas.
  const [categoriasHabilitadas, setCategoriasHabilitadas] = useState([])

  const [filtros, setFiltros] = useState(() => ({
    q: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado_runt: '',
    origen: '',
    categoria: '',
  }))

  // Al regresar desde Nueva Inscripción con una matrícula ya existente,
  // buscar por documento en todas las vigencias y no solo en el día actual.
  useEffect(() => {
    const documento = new URLSearchParams(window.location.search).get('documento')
    if (documento && documento.trim()) {
      setFiltros({
        q: documento.trim(),
        fecha_inicio: '',
        fecha_fin: '',
        estado_runt: '',
        origen: '',
        categoria: '',
      })
    }
  }, [])

  // ==========================================================
  // RESULTADOS
  // ==========================================================

  const [
    resultados,
    setResultados,
  ] =
    useState(
      []
    )

  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)
  const [totalRegistros, setTotalRegistros] = useState(null)
  const [hayMas, setHayMas] = useState(false)

  const [
    resumenCategorias,
    setResumenCategorias,
  ] =
    useState({})

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    )

  const [
    consultado,
    setConsultado,
  ] =
    useState(
      false
    )

  // ==========================================================
  // DRAWER EXPEDIENTE
  // ==========================================================

  const [
    drawerOpen,
    setDrawerOpen,
  ] =
    useState(
      false
    )

  const [
    expediente,
    setExpediente,
  ] =
    useState(
      null
    )

  const [
    loadingExpediente,
    setLoadingExpediente,
  ] =
    useState(
      false
    )

  const [
    matriculaSeleccionada,
    setMatriculaSeleccionada,
  ] =
    useState(
      null
    )

  // ==========================================================
  // MENSAJES
  // ==========================================================

  const [
    error,
    setError,
  ] =
    useState(
      ''
    )

  // Continuación administrativa: nunca crea otro consecutivo.
  const [continuacionAbierta, setContinuacionAbierta] = useState(false)
  const [guardandoContinuacion, setGuardandoContinuacion] = useState(false)
  const [continuacionFecha, setContinuacionFecha] = useState(fechaLocalHoy())
  const [continuacionMotivo, setContinuacionMotivo] = useState('')
  const [continuacionObservaciones, setContinuacionObservaciones] = useState('')
  const [mensajeContinuacion, setMensajeContinuacion] = useState('')
  const [editarExpediente,setEditarExpediente]=useState(false)
  const [datosCorreccion,setDatosCorreccion]=useState({})
  const [guardandoCorreccion,setGuardandoCorreccion]=useState(false)
  const [errorCorreccion,setErrorCorreccion]=useState('')
  const [exitoCorreccion,setExitoCorreccion]=useState('')

  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(
    () => {
      const stored =
        localStorage.getItem(
          'currentUser'
        )

      if (
        !stored
      ) {
        router.push(
          '/login'
        )

        return
      }

      try {
        setUser(
          JSON.parse(
            stored
          )
        )
      } catch (
        errorSesion
      ) {
        console.error(
          'Error leyendo sesión:',
          errorSesion
        )

        localStorage.removeItem(
          'currentUser'
        )

        router.push(
          '/login'
        )
      }
    },
    [
      router,
    ]
  )

  // ==========================================================
  // DATOS USUARIO
  // ==========================================================

  const nit =
    useMemo(
      () =>
        obtenerNitUsuario(
          user
        ),
      [
        user,
      ]
    )

  // Opciones de origen: la API devuelve solo convenios activos (normalizados).
  const [conveniosOrigen, setConveniosOrigen] = useState([])
  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams({ recurso: 'origenes' })
    if (nit) params.set('nit', nit)
    let activo = true
    fetchJsonSeguro(`${API_URL}?${params.toString()}`)
      .then(json => { if (activo) setConveniosOrigen(Array.isArray(json?.data) ? json.data : []) })
      .catch(errorOpciones => {
        console.error('No fue posible cargar los convenios para el filtro:', errorOpciones)
        if (activo) setConveniosOrigen([])
      })
    return () => { activo = false }
  }, [user, nit])

  // ==========================================================
  // RESUMEN POR CATEGORÍA
  // ==========================================================

  const consultarResumen =
    useCallback(
      async () => {
        if (
          !user
        ) {
          return
        }

        const hoy =
          new Date()
            .toLocaleDateString(
              'en-CA'
            )

        const fechaInicio =
          texto(
            filtros.fecha_inicio
          ) ||
          hoy

        const fechaFin =
          texto(
            filtros.fecha_fin
          ) ||
          (
            filtros.fecha_inicio
              ? fechaInicio
              : hoy
          )

        if (
          fechaFin <
          fechaInicio
        ) {
          setResumenCategorias({})
          return
        }

        try {
          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'resumen'
          )

          params.set(
            'fecha_inicio',
            fechaInicio
          )

          params.set(
            'fecha_fin',
            fechaFin
          )

          if (
            nit
          ) {
            params.set(
              'nit',
              nit
            )
          }

          const json =
            await fetchJsonSeguro(
              `${API_URL}?${params.toString()}`
            )

          setResumenCategorias(
            json?.data &&
            typeof json.data ===
              'object'
              ? json.data
              : {}
          )
        } catch (
          errorResumen
        ) {
          // El resumen es información complementaria.
          // Un fallo transitorio de red no debe interrumpir
          // la navegación ni mostrar un error al usuario.
          setResumenCategorias({})
        }
      },
      [
        user,
        nit,
        filtros.fecha_inicio,
        filtros.fecha_fin,
      ]
    )

  useEffect(
    () => {
      consultarResumen()
    },
    [
      consultarResumen,
    ]
  )

  // ==========================================================
  // CONSULTAR
  // ==========================================================

  const consultar =
    useCallback(
      async ({
        silencioso = false,
      } = {}) => {
        if (
          !user
        ) {
          return
        }

        const q =
          texto(
            filtros.q
          )

        const fechaInicio =
          texto(
            filtros.fecha_inicio
          )

        const fechaFin =
          texto(
            filtros.fecha_fin
          )

        // ====================================================
        setLoading(
          true
        )

        setConsultado(
          true
        )

        if (
          !silencioso
        ) {
          setError(
            ''
          )
        }

        try {
          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'consultar'
          )

          if (
            nit
          ) {
            params.set(
              'nit',
              nit
            )
          }

          if (
            q
          ) {
            params.set(
              'q',
              q
            )
          }

          if (!q && fechaInicio) {
            params.set('fecha_inicio', fechaInicio)
          }

          if (!q && fechaFin) {
            params.set('fecha_fin', fechaFin)
          }
          if (filtros.estado_runt) params.set('estado_runt', filtros.estado_runt)
          if (filtros.origen) params.set('origen', filtros.origen)
          if (filtros.categoria) params.set('categoria', filtros.categoria)
          params.set('pagina', String(pagina))
          params.set('por_pagina', String(porPagina))

          const json =
            await fetchJsonSeguro(
              `${API_URL}?${params.toString()}`
            )

          setResultados(
            Array.isArray(
              json?.data
            )
              ? json.data
              : []
          )
          if (Array.isArray(json?.empresa?.categorias_habilitadas)) {
            const habilitadas = new Set(
              json.empresa.categorias_habilitadas.map(cat => String(cat || '').trim().toUpperCase())
            )
            setCategoriasHabilitadas(CATEGORIAS.filter(cat => habilitadas.has(cat)))
          }
          setTotalRegistros(Number.isFinite(json?.total) ? json.total : null)
          setHayMas(json?.hay_mas === true)
        } catch (
          errorConsulta
        ) {
          console.error(
            errorConsulta
          )

          setResultados(
            []
          )

          if (
            !silencioso
          ) {
            setError(
              errorConsulta.message
            )
          }
        } finally {
          setLoading(
            false
          )
        }
      },
      [
        user,
        nit,
        filtros,
        pagina,
        porPagina,
      ]
    )

  // ==========================================================
  // BÚSQUEDA AUTOMÁTICA
  // ==========================================================

  useEffect(
    () => {
      if (
        !user
      ) {
        return
      }

      if (
        debounceRef.current
      ) {
        clearTimeout(
          debounceRef.current
        )
      }

      debounceRef.current =
        setTimeout(
          () => {
            consultar({
              silencioso:
                true,
            })
          },
          450
        )

      return () => {
        if (
          debounceRef.current
        ) {
          clearTimeout(
            debounceRef.current
          )
        }
      }
    },
    [
      filtros,
      user,
      consultar,
    ]
  )

  // ==========================================================
  // CAMBIAR FILTROS
  // ==========================================================

  function cambiarFiltro(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target

    setPagina(1)
    setFiltros(
      prev => ({
        ...prev,

        [name]:
          value,
      })
    )
  }

  // ==========================================================
  // LIMPIAR
  // ==========================================================

  function limpiarFiltros() {
    setPagina(1)
    setTotalRegistros(null)
    setHayMas(false)
    setFiltros({
      q: '',
      fecha_inicio: '',
      fecha_fin: '',
      estado_runt: '',
      origen: '',
      categoria: '',
    })

    setResultados(
      []
    )

    setConsultado(
      false
    )

    setError(
      ''
    )
  }

  // ==========================================================
  // CONSULTAR EXPEDIENTE
  // ==========================================================

  async function consultarExpediente(
    documento,
    matriculaId = null
  ) {
    const documentoNormalizado =
      texto(
        documento
      )

    if (
      !documentoNormalizado
    ) {
      return
    }

    setDrawerOpen(
      true
    )

    setExpediente(
      null
    )

    setMatriculaSeleccionada(
      null
    )

    setLoadingExpediente(
      true
    )

    setError(
      ''
    )

    try {
      const params =
        new URLSearchParams()

      params.set(
        'recurso',
        'expediente'
      )

      params.set(
        'documento',
        documentoNormalizado
      )

      if (
        nit
      ) {
        params.set(
          'nit',
          nit
        )
      }

      const json =
        await fetchJsonSeguro(
          `${API_URL}?${params.toString()}`
        )

      setExpediente(
        json
      )

      const matriculas =
        Array.isArray(
          json?.matriculas
        )
          ? json.matriculas
          : []

      let seleccionada =
        null

      if (
        matriculaId
      ) {
        seleccionada =
          matriculas.find(
            item =>
              String(
                item.id
              ) ===
              String(
                matriculaId
              )
          ) ||
          null
      }

      if (
        !seleccionada &&
        matriculas.length >
          0
      ) {
        seleccionada =
          matriculas[0]
      }

      setMatriculaSeleccionada(
        seleccionada
      )
    } catch (
      errorExpediente
    ) {
      setError(
        errorExpediente.message
      )
    } finally {
      setLoadingExpediente(
        false
      )
    }
  }

  async function registrarContinuacion() {
    if (!matriculaSeleccionada?.id || guardandoContinuacion) return
    if (!continuacionFecha || continuacionMotivo.trim().length < 8) {
      setError('Indique una fecha y un motivo de al menos ocho caracteres.')
      return
    }
    if (!window.confirm(
      `¿Registrar continuación para la matrícula ${matriculaSeleccionada.consecutivo} sin crear un consecutivo nuevo?`
    )) return

    setGuardandoContinuacion(true)
    setError('')
    setMensajeContinuacion('')
    try {
      const respuesta = await fetchJsonSeguro(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'registrar_continuacion',
          nit,
          matricula_id: matriculaSeleccionada.id,
          fecha_continuacion: continuacionFecha,
          motivo: continuacionMotivo.trim(),
          observaciones: continuacionObservaciones.trim(),
          usuario: obtenerNombreUsuario(user),
        }),
      })
      const documento = matriculaSeleccionada?.documento || expediente?.aprendiz?.documento
      const id = matriculaSeleccionada.id
      setContinuacionAbierta(false)
      setContinuacionMotivo('')
      setContinuacionObservaciones('')
      setMensajeContinuacion(respuesta.message || 'Continuación registrada correctamente.')
      if (documento) await consultarExpediente(documento, id)
      await consultar({ silencioso: true })
      setMensajeContinuacion(respuesta.message || 'Continuación registrada correctamente.')
    } catch (err) {
      setError(err.message || 'No fue posible registrar la continuación.')
    } finally {
      setGuardandoContinuacion(false)
    }
  }

  function abrirCorreccionExpediente() {
    if(!aprendiz || !matriculaSeleccionada)return
    const datos={}
    CAMPOS_CORREGIR_EXPEDIENTE.forEach(([,campos])=>
      campos.forEach(([clave])=>{datos[clave]=String(aprendiz[clave]??'')}))
    for(const [clave,opciones] of Object.entries(CATALOGOS_EDICION_MATRICULA)){
      const actual=String(datos[clave]||'').trim().toUpperCase()
      // Mantener el valor histórico visible; no reemplazarlo silenciosamente.
      datos[clave]=actual
    }
    datos.documento_nuevo=String(aprendiz.documento??'')
    datos.categoria_nueva=String(matriculaSeleccionada.categorias?.[0]||
      matriculaSeleccionada.categoria||'').toUpperCase()
    setDatosCorreccion(datos)
    setErrorCorreccion('')
    setEditarExpediente(true)
  }

  async function guardarCorreccionExpediente(e) {
    e.preventDefault()
    if(!matriculaSeleccionada?.id||guardandoCorreccion)return
    const errorValidacion=validarEdicionMatricula(datosCorreccion,
      datosCorreccion.categoria_nueva,categoriasEdicionUsuario(user))
    if(errorValidacion){setErrorCorreccion(errorValidacion);return}
    setGuardandoCorreccion(true)
    setErrorCorreccion('')
    try {
      const json=await fetchJsonSeguro(API_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          accion:'corregir_datos_expediente',
          nit,matricula_id:matriculaSeleccionada.id,
          documento:aprendiz.documento,
          documento_nuevo:datosCorreccion.documento_nuevo,
          categoria_nueva:datosCorreccion.categoria_nueva,
          datos:Object.fromEntries(Object.entries(datosCorreccion).filter(
            ([clave])=>!['documento_nuevo','categoria_nueva'].includes(clave))),

          usuario:obtenerNombreUsuario(user)
        })
      })
      setEditarExpediente(false)
      const doc=json?.data?.documento||aprendiz.documento
      const id=matriculaSeleccionada.id
      await consultarExpediente(doc,id)
      await consultar({silencioso:true})
      setExitoCorreccion(json.message||'Expediente corregido correctamente.')
    }catch(e){setErrorCorreccion(e.message||'No fue posible guardar la corrección.')}
    finally{setGuardandoCorreccion(false)}
  }

  // ==========================================================
  // CERRAR EXPEDIENTE
  // ==========================================================

  function cerrarExpediente() {
    setEditarExpediente(false)
    setDrawerOpen(
      false
    )

    setExpediente(
      null
    )

    setMatriculaSeleccionada(
      null
    )

    setError(
      ''
    )
    setContinuacionAbierta(false)
    setMensajeContinuacion('')
  }

  // ==========================================================
  // DATOS EXPEDIENTE
  // ==========================================================

  const aprendiz =
    expediente?.aprendiz ||
    null

  const matriculasExpediente =
    Array.isArray(
      expediente?.matriculas
    )
      ? expediente.matriculas
      : []

  // ==========================================================
  // PROCESOS EXTERNOS MATRÍCULA ACTUAL
  // ==========================================================

  const estadoRunt =
    useMemo(
      () =>
        obtenerEstadoRunt(
          matriculaSeleccionada
            ?.control_runt
        ),
      [
        matriculaSeleccionada,
      ]
    )

  const estadoSicov =
    useMemo(
      () =>
        obtenerEstadoSicov(
          matriculaSeleccionada
            ?.control_sicov
        ),
      [
        matriculaSeleccionada,
      ]
    )

  const estadoSiet =
    useMemo(
      () =>
        obtenerEstadoSiet(
          matriculaSeleccionada
            ?.control_siet
        ),
      [
        matriculaSeleccionada,
      ]
    )

  // ==========================================================
  // CARGANDO SESIÓN
  // ==========================================================

  if (
    !user
  ) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-br
        from-gray-100
        to-gray-200
        p-4
        md:p-6
      "
    >

      <div
        className="
          max-w-7xl
          mx-auto
          bg-white
          border
          border-gray-200
          shadow-lg
          rounded-lg
          overflow-hidden
        "
      >

        <EncabezadoModulo
          titulo="Inscripciones"
          subtitulo="Consulte matrículas, historial del aprendiz y estado de los procesos externos."
          icono={FileSignature}
          rutaRegreso="/admin"
          textoRegreso="Regresar"
        />

        <div className="p-4 md:p-6">

        {/* ==================================================
            ERROR
        ================================================== */}

        {!drawerOpen &&
          error && (
          <div
            className="
              bg-red-50
              border
              border-red-300
              text-red-700
              rounded-lg
              p-3
              mb-4
              text-sm
            "
          >
            <i className="fas fa-exclamation-triangle mr-2"></i>

            {error}
          </div>
        )}

        {/* ==================================================
            FILTROS Y ACCIONES
        ================================================== */}

        <div
          className="
            mb-3
            flex
            flex-col
            xl:flex-row
            xl:items-end
            gap-2
          "
        >

          {CATEGORIAS
            .filter(
              categoria =>
                Number(
                  resumenCategorias[
                    categoria
                  ] ||
                  0
                ) >
                0
            )
            .map(
              categoria => (
                <div
                  key={categoria}
                  className="
                    h-9
                    min-w-[62px]
                    px-2.5
                    rounded-lg
                    border
                    border-[#A9BDCC]
                    bg-[#DCEEF9]
                    flex
                    items-center
                    justify-center
                    gap-1.5
                    whitespace-nowrap
                  "
                  title={`Matrículas ${categoria}`}
                >
                  <span
                    className="
                      text-[10px]
                      font-bold
                      text-emerald-700
                    "
                  >
                    {categoria}
                  </span>

                  <span
                    className="
                      text-sm
                      font-black
                      text-[#173A57]
                    "
                  >
                    {resumenCategorias[
                      categoria
                    ]}
                  </span>
                </div>
              )
            )}

          {/* BUSCAR */}

          <div className="relative flex-1 min-w-[260px]">

            <i
              className="
                fas
                fa-search
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-gray-400
                text-xs
                pointer-events-none
              "
            ></i>

            <input
              type="text"
              name="q"
              value={filtros.q}
              onChange={cambiarFiltro}
              placeholder="Buscar en todas las matrículas: nombre, documento, matrícula o categoría..."
              aria-label="Criterio de búsqueda"
              className="
                w-full
                h-9
                border
                border-[#A9BDCC]
                rounded-lg
                pl-9
                pr-3
                text-xs
                bg-white
                focus:outline-none
                focus:ring-2
                focus:ring-blue-200
                focus:border-[var(--primary)]
              "
            />
          </div>

          {/* ESTADO MATRÍCULA */}
          <div className="w-full xl:w-[160px]">
            <select name="estado_runt" value={filtros.estado_runt}
              onChange={cambiarFiltro} aria-label="Estado Matrícula" title="Estado Matrícula"
              className="h-9 w-full rounded-lg border border-[#A9BDCC] bg-white px-2 text-xs">
              <option value="">Todos los estados</option>
              <option value="PENDIENTE_RUNT">Pendiente RUNT</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="POR_VENCER">Por vencer</option>
              <option value="VENCIDO">Vencido</option>
              <option value="CERTIFICADO">Certificado</option>
              <option value="SIN_CONTROL">Sin control</option>
            </select>
          </div>

          {/* ORIGEN */}
          <div className="w-full xl:w-[175px]">
            <select name="origen" value={filtros.origen}
              onChange={cambiarFiltro} aria-label="Origen de matrícula" title="Origen de matrícula"
              className="h-9 w-full rounded-lg border border-[#A9BDCC] bg-white px-2 text-xs">
              <option value="">Todos los orígenes</option>
              <option value="DIRECTO">Directo</option>
              <option value="CONVENIO">Convenio</option>
              {conveniosOrigen.map(convenio => (
                <option key={convenio.id} value={`CONVENIO:${convenio.id}`}>
                  {convenio.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* CATEGORÍA */}
          <div className="w-full xl:w-[115px]">
            <select name="categoria" value={filtros.categoria}
              onChange={cambiarFiltro} aria-label="Categoría" title="Categoría"
              className="h-9 w-full rounded-lg border border-[#A9BDCC] bg-white px-2 text-xs">
              <option value="">Categorías</option>
              {categoriasHabilitadas.map(categoria => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>
          </div>

          {/* FECHA INICIO */}

          <div className="w-full xl:w-[145px]">

            <input
              type="date"
              name="fecha_inicio"
              value={filtros.fecha_inicio}
              onChange={cambiarFiltro}
              aria-label="Desde"
              title="Desde"
              className="
                w-full
                h-9
                border
                border-[#A9BDCC]
                rounded-lg
                px-2
                text-xs
                bg-white
              "
            />

          </div>

          {/* FECHA FIN */}

          <div className="w-full xl:w-[145px]">

            <input
              type="date"
              name="fecha_fin"
              value={filtros.fecha_fin}
              onChange={cambiarFiltro}
              aria-label="Hasta"
              title="Hasta"
              className="
                w-full
                h-9
                border
                border-[#A9BDCC]
                rounded-lg
                px-2
                text-xs
                bg-white
              "
            />

          </div>



          <button
            type="button"
            onClick={limpiarFiltros}
            className="
              h-9
              bg-gray-500
              hover:bg-gray-700
              hover:-translate-y-0.5
              text-white
              px-3
              rounded-lg
              text-xs
              flex
              items-center
              justify-center
              gap-1.5
              transition-all
              whitespace-nowrap
            "
          >
            <i className="fas fa-eraser"></i>

            Limpiar
          </button>






        </div>

        {/* ==================================================
            RESULTADOS
        ================================================== */}

        <MarcoTabla className="rounded-lg">

          <div
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            style={{
              backgroundColor: ESTILO_SECCIONES.fondo,
              color: ESTILO_SECCIONES.texto,
            }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">Resultados</span>
              <span className="text-xs" style={{ color: ESTILO_SECCIONES.subtitulo }}>
                {totalRegistros !== null
                  ? `${totalRegistros} registro(s)`
                  : `${resultados.length} en esta página`}
              </span>
            </div>

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-xs">
              <label htmlFor="tamanoPaginaInscripciones" className="whitespace-nowrap text-white/90">
                Por página
              </label>
              <select
                id="tamanoPaginaInscripciones"
                value={porPagina}
                onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1) }}
                className="rounded border border-white/30 bg-white px-2 py-1 text-slate-900"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="whitespace-nowrap text-white/90">
                Página {pagina}{totalRegistros !== null ? ` de ${Math.max(1, Math.ceil(totalRegistros / porPagina))}` : ''}
              </span>
              <button type="button" disabled={pagina <= 1 || loading}
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                className="rounded border border-white/30 px-2 py-1 text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40">
                Anterior
              </button>
              <button type="button" disabled={!hayMas || loading}
                onClick={() => setPagina(p => p + 1)}
                className="rounded border border-white/30 px-2 py-1 text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40">
                Siguiente
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/inscripciones/nueva')}
                className="flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 text-xs text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                <i className="fas fa-user-plus"></i>
                Nueva Matrícula
              </button>
            </div>


          </div>

          <div className="max-h-[65vh] overflow-auto" role="region" aria-label="Resultados de matrículas">

            <table
              className="
                w-full
                text-[11px]
                border-collapse
              "
            >

              <thead
                style={{
                  backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo,
                  color: ESTILO_ENCABEZADO_TABLA.texto,
                }}
              >

                <tr>

                  <th className="sticky top-0 z-10 border p-2" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, borderColor: ESTILO_CELDAS_TABLA.borde, borderWidth: ESTILO_CELDAS_TABLA.grosorBorde }}>
                    Matrícula
                  </th>

                  <th className="sticky top-0 z-10 border p-2" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, borderColor: ESTILO_CELDAS_TABLA.borde, borderWidth: ESTILO_CELDAS_TABLA.grosorBorde }}>
                    Fecha
                  </th>

                  <th className="sticky top-0 z-10 border p-2" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, borderColor: ESTILO_CELDAS_TABLA.borde, borderWidth: ESTILO_CELDAS_TABLA.grosorBorde }}>
                    Documento
                  </th>

                  <th className="sticky top-0 z-10 border p-2" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, borderColor: ESTILO_CELDAS_TABLA.borde, borderWidth: ESTILO_CELDAS_TABLA.grosorBorde }}>
                    Aprendiz
                  </th>

                  <th className="sticky top-0 z-10 border p-2" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, borderColor: ESTILO_CELDAS_TABLA.borde, borderWidth: ESTILO_CELDAS_TABLA.grosorBorde }}>
                    Categoría
                  </th>

                  <th className="sticky top-0 z-10 border p-2" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, borderColor: ESTILO_CELDAS_TABLA.borde, borderWidth: ESTILO_CELDAS_TABLA.grosorBorde }}>
                    Origen
                  </th>

                  <th className="sticky top-0 z-10 border p-2" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, borderColor: ESTILO_CELDAS_TABLA.borde, borderWidth: ESTILO_CELDAS_TABLA.grosorBorde }}>
                    Estado Matrícula
                  </th>

                  <th className="sticky top-0 z-10 border p-2" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, borderColor: ESTILO_CELDAS_TABLA.borde, borderWidth: ESTILO_CELDAS_TABLA.grosorBorde }}>
                    Acción
                  </th>

                </tr>

              </thead>

              <tbody>

                {loading ? (
                  <tr>

                    <td
                      colSpan="8"
                      className="
                        p-8
                        text-center
                        text-gray-500
                      "
                    >
                      <i className="fas fa-spinner fa-spin mr-2"></i>

                      Consultando...
                    </td>

                  </tr>
                ) : resultados.length ===
                  0 ? (
                  <tr>

                    <td
                      colSpan="8"
                      className="
                        p-8
                        text-center
                        text-gray-500
                      "
                    >

                      {!consultado ? (
                        <>
                          <i
                            className="
                              fas
                              fa-magnifying-glass
                              text-3xl
                              text-gray-300
                              block
                              mb-2
                            "
                          ></i>

                          Ingrese un criterio de búsqueda o seleccione un rango de fechas.
                        </>
                      ) : (
                        <>
                          <i
                            className="
                              fas
                              fa-circle-info
                              text-3xl
                              text-gray-300
                              block
                              mb-2
                            "
                          ></i>

                          No se encontraron matrículas.
                        </>
                      )}

                    </td>

                  </tr>
                ) : (
                  resultados.map(
                    row => {
                      return (
                        <tr
                          key={
                            row.id
                          }
                          className="
                            odd:bg-white
                            even:bg-gray-50
                            hover:bg-blue-50
                          "
                        >

                          <td
                            className="
                              p-2
                              border
                              text-center
                              font-semibold
                            "
                          >
                            {row.consecutivo ||
                              '-'}
                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            {formatearFecha(
                              row.fecha_matricula
                            )}
                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            {row.tipo_doc ? `${String(row.tipo_doc).trim().toUpperCase()} · ` : ''}
                            {formatearDocumento(
                              row.documento
                            )}
                          </td>

                          <td className="p-2 border">

                            <div className="font-semibold">
                              {row.nombre_completo ||
                                [
                                  row.nombres,
                                  row.apellidos,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    ' '
                                  )}
                            </div>

                            {row.celular && (
                              <div
                                className="
                                  text-[10px]
                                  text-gray-500
                                "
                              >
                                {row.celular}
                              </div>
                            )}

                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            <Badge tipo="blue">
                              {row.categoria ||
                                (
                                  Array.isArray(
                                    row.categorias
                                  )
                                    ? row.categorias.join(
                                        ' · '
                                      )
                                    : '-'
                                )}
                            </Badge>
                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            {String(row.origen_matricula || (row.convenio ? 'CONVENIO' : 'DIRECTO')).toUpperCase() === 'CONVENIO' ? (
                              <div className="flex flex-col items-center gap-1">
                                <span>{row.convenio || 'Convenio no registrado'}</span>
                                <span className="text-[10px] font-semibold uppercase text-slate-500">CONVENIO</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span>{user?.nombreEmpresa || 'CEA no identificado'}</span>
                                <span className="text-[10px] font-semibold uppercase text-slate-500">DIRECTO</span>
                              </div>
                            )}
                          </td>

                          <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >

                            <EstadoMatriculaRunt estado={row.estado_runt} />

                          </td>

                                                    <td
                            className="
                              p-2
                              border
                              text-center
                            "
                          >
                            <div className="flex items-center justify-center gap-2">
                              <BotonDocumentos
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/admin/inscripciones/documentos?matricula_id=${encodeURIComponent(
                                      row.id
                                    )}`
                                  )
                                }
                                className="min-w-[155px] !text-[11px] !py-1.5"
                              >
                                <i className="fas fa-file-alt mr-1"></i>
                                Documentos de Matrícula
                              </BotonDocumentos>

                              <BotonExpediente
                                type="button"
                                onClick={() =>
                                  consultarExpediente(
                                    row.documento,
                                    row.id
                                  )
                                }
                                className="min-w-[125px] !text-[11px] !py-1.5"
                              >
                                <i className="fas fa-folder-open mr-1"></i>
                                Ver Expediente
                              </BotonExpediente>
                            </div>
                          </td>

                        </tr>
                      )
                    }
                  )
                )}

              </tbody>

            </table>

          </div>

        </MarcoTabla>

      </div>

      {exitoCorreccion&&(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-emerald-800">Corrección guardada</h2>
            <p className="mt-2 text-sm text-slate-700">{exitoCorreccion}</p>
            <button type="button" onClick={()=>setExitoCorreccion('')}
              className="mt-4 rounded-lg bg-[#24638C] px-5 py-2 text-xs font-bold text-white">Aceptar</button>
          </div>
        </div>
      )}
      {editarExpediente&&(
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-3">
          <section role="dialog" aria-modal="true" aria-label="Corregir datos del expediente"
            className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#24638C] px-5 py-4 text-white">
              <div>
                <h2 className="text-lg font-bold">Corregir datos del expediente</h2>
                <p className="text-xs text-white/90">Se conservan matrícula, fecha, consecutivo, pagos y procesos registrados.</p>
              </div>
              <button type="button" disabled={guardandoCorreccion} onClick={()=>setEditarExpediente(false)}
                className="rounded-lg border border-white/40 px-3 py-2 text-xs">Cerrar</button>
            </div>
            <form id="form-correccion-expediente" onSubmit={guardarCorreccionExpediente}
              className="grid grid-cols-1 gap-3 overflow-y-auto p-4 md:grid-cols-2">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950 md:col-span-2">
                Puede corregir el documento y la categoría sin generar otra matrícula.
                Si ya existen clases o reportes externos asociados, el sistema impedirá
                cambiar la categoría hasta verificar esos procesos.
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <h3 className="mb-3 text-sm font-bold text-[#0B668F]">Número de documento</h3>
                <label className="block text-xs font-semibold text-slate-700">
                  Documento corregido
                  <input type="text" inputMode="numeric" pattern="[0-9]{4,15}"
                    required maxLength={15} value={datosCorreccion.documento_nuevo||''}
                    onChange={e=>setDatosCorreccion(d=>({...d,documento_nuevo:e.target.value.replace(/[^0-9]/g,'')}))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"/>
                </label>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <h3 className="mb-3 text-sm font-bold text-[#0B668F]">Categoría de esta matrícula</h3>
                <label className="block text-xs font-semibold text-slate-700">
                  Seleccione la categoría correcta
                  <select required value={datosCorreccion.categoria_nueva||''}
                    onChange={e=>setDatosCorreccion(d=>({...d,categoria_nueva:e.target.value}))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">
                    {!categoriasEdicionUsuario(user).includes(datosCorreccion.categoria_nueva)&&
                      <option value={datosCorreccion.categoria_nueva} disabled>
                        {datosCorreccion.categoria_nueva||'Categoría no identificada'} (no habilitada)
                      </option>}
                    {categoriasEdicionUsuario(user).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              {CAMPOS_CORREGIR_EXPEDIENTE.filter(([titulo])=>{
                if(!titulo.startsWith('Acudiente'))return true
                const nacimiento=datosCorreccion.fecha_nacimiento
                if(!/^\d{4}-\d{2}-\d{2}$/.test(nacimiento||''))return false
                const f=new Date(nacimiento+'T12:00:00Z'),ahora=new Date()
                let edad=ahora.getFullYear()-f.getUTCFullYear()
                if(ahora.getMonth()<f.getUTCMonth()||
                   (ahora.getMonth()===f.getUTCMonth()&&ahora.getDate()<f.getUTCDate()))edad--
                return edad<18
              }).map(([titulo,campos])=>(
                <fieldset key={titulo} className="rounded-lg border border-slate-200 p-3">
                  <legend className="px-1 text-sm font-bold text-[#0B668F]">{titulo}</legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {campos.map(([clave,label,tipo])=>(
                      <label key={clave} className="text-xs font-semibold text-slate-700">{label}
                        {CATALOGOS_EDICION_MATRICULA[clave] ? (
                          <select value={datosCorreccion[clave]??''}
                            onChange={e=>setDatosCorreccion(p=>({...p,[clave]:e.target.value}))}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900">
                            <option value="">Seleccione...</option>
                            {datosCorreccion[clave]&&!CATALOGOS_EDICION_MATRICULA[clave].includes(datosCorreccion[clave])&&
                              <option value={datosCorreccion[clave]} disabled>
                                {datosCorreccion[clave]} (valor anterior no válido)
                              </option>}
                            {CATALOGOS_EDICION_MATRICULA[clave].map(op=>
                              <option key={op} value={op}>{op}</option>)}
                          </select>
                        ) : (
                          <input type={tipo||'text'}
                            inputMode={CAMPOS_NUMERICOS_EDICION.has(clave)?'numeric':undefined}
                            required={['nombres','apellidos','fecha_nacimiento','celular','direccion','barrio','ciudad'].includes(clave)}
                            value={datosCorreccion[clave]??''}
                            onChange={e=>setDatosCorreccion(p=>({
                              ...p,[clave]:CAMPOS_MAYUSCULAS_EDICION.has(clave)
                                ?e.target.value.toUpperCase()
                                :CAMPOS_NUMERICOS_EDICION.has(clave)
                                  ?e.target.value.replace(/\\D/g,'')
                                  :['correo','acudi_correo'].includes(clave)
                                    ?e.target.value.toLowerCase():e.target.value
                            }))}
                            maxLength={['celular','acudi_celular','emergencia_celular'].includes(clave)?10:undefined}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"/>
                        )}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              {errorCorreccion&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700 md:col-span-2">{errorCorreccion}</p>}
            </form>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button type="button" disabled={guardandoCorreccion} onClick={()=>setEditarExpediente(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold">Cancelar</button>
              <button type="submit" form="form-correccion-expediente" disabled={guardandoCorreccion}
                className="rounded-lg bg-[#24638C] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                {guardandoCorreccion?'Guardando...':'Guardar correcciones'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ====================================================
          MODAL EXPEDIENTE
      ==================================================== */}

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-5">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={cerrarExpediente}
          ></div>

          <div className="relative z-10 w-full max-w-[1180px] max-h-[94vh] bg-white shadow-2xl rounded-xl overflow-y-auto border border-gray-300">
            <div className="sticky top-0 z-20 relative bg-[#173A57] text-white border-b border-[#29465D] px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase font-semibold text-white">
                    Expediente del Aprendiz
                  </p>
                  <h2 className="text-lg font-bold text-white">
                    {aprendiz?.nombre_completo || 'Consulta de Expediente'}
                  </h2>
                  {aprendiz?.documento && (
                    <p className="text-xs text-white mt-0.5">
                      {aprendiz.tipo_doc || ''}{' '}
                      {formatearDocumento(aprendiz.documento)}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={abrirCorreccionExpediente}
                    disabled={!aprendiz||!matriculaSeleccionada||loadingExpediente}
                    className="relative z-30 inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-white/50 bg-white px-4 py-2 text-xs font-bold text-[#173A57] shadow-sm transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50">
                    <i className="fas fa-pen" aria-hidden="true"/>Corregir datos
                  </button>
                <button
                  type="button"
                  onClick={cerrarExpediente}
                  className="shrink-0 w-9 h-9 border border-white/40 text-white rounded-lg hover:bg-white/15 hover:-translate-y-0.5 transition-all duration-200"
                  title="Cerrar"
                >
                  <i className="fas fa-times"></i>
                </button>
                </div>
              </div>

              {matriculaSeleccionada && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/20 pt-2 text-white">
                  <span className="text-xs font-semibold">Matrícula {matriculaSeleccionada.consecutivo || '-'}</span>
                  <span className="rounded-md border border-white/30 bg-white/10 px-2 py-0.5 text-sm font-black">
                    {(Array.isArray(matriculaSeleccionada.categorias) && matriculaSeleccionada.categorias.length
                      ? matriculaSeleccionada.categorias.join(' · ')
                      : matriculaSeleccionada.categoria) || '-'}
                  </span>
                </div>
              )}
            </div>

            {loadingExpediente ? (
              <div className="p-12 text-center text-sm text-gray-500">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Consultando expediente...
              </div>
            ) : expediente && aprendiz ? (
              <div className="p-3">
                {error && (
                  <div className="mb-3 bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-xs">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[38%_62%] gap-3">
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <div className="bg-[#B2CBE2] text-[#263746] px-3 py-2 text-xs font-semibold">
                      Datos Personales
                    </div>

                    <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <Campo label="Fecha nacimiento" valor={formatearFecha(aprendiz.fecha_nacimiento)} />
                      <Campo label="Género" valor={aprendiz.genero} />
                      <Campo label="Celular" valor={aprendiz.celular} />
                      <Campo label="Correo" valor={aprendiz.correo} />
                      <Campo label="Dirección" valor={aprendiz.direccion} />
                      <Campo label="Barrio" valor={aprendiz.barrio} />
                      <Campo label="Ciudad" valor={aprendiz.ciudad} />
                      <Campo label="Estado civil" valor={aprendiz.estado_civil} />
                      <Campo label="Ocupación" valor={aprendiz.ocupacion} />
                      <Campo label="EPS" valor={aprendiz.eps} />
                      <Campo label="Estrato" valor={aprendiz.estrato} />
                      <Campo label="Nivel educativo" valor={aprendiz.nivel_educativo} />

                      <div className="sm:col-span-2 border border-gray-200 rounded-lg p-2 bg-slate-50">
                        <p className="text-[10px] uppercase tracking-wide font-bold text-[#3B617D] mb-1.5">
                          Contacto de Emergencia
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          <Campo label="Nombre" valor={aprendiz.emergencia_nombre} />
                          <Campo label="Celular" valor={aprendiz.emergencia_celular} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="bg-[#B2CBE2] text-[#263746] px-3 py-2 text-xs font-semibold">
                        Estado de Procesos Externos
                      </div>

                      <div className="p-2 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                        <TarjetaProcesoExterno titulo="RUNT" icono="fa-road" estado={estadoRunt} />
                        <TarjetaProcesoExterno titulo="SICOV" icono="fa-fingerprint" estado={estadoSicov} />
                        <TarjetaProcesoExterno titulo="SIET" icono="fa-graduation-cap" estado={estadoSiet} />
                      </div>
                    </div>

                    {mensajeContinuacion && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                        {mensajeContinuacion}
                      </div>
                    )}
                    {matriculaSeleccionada?.estado_runt?.continuacion_pendiente && (
                      <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                        <strong>Continuación registrada.</strong> Se conserva el consecutivo original. Verifique la ausencia de certificación en RUNT y cree el nuevo proceso desde el módulo Control RUNT; el plazo de 90 días no se reinicia hasta que quede registrada la nueva fecha RUNT.
                      </div>
                    )}
                    {matriculaSeleccionada?.estado_runt?.estado === 'VENCIDO' && !matriculaSeleccionada?.estado_runt?.continuacion_pendiente && (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-slate-800">
                        <p className="font-bold">Proceso RUNT vencido · Matrícula {matriculaSeleccionada.consecutivo}</p>
                        <p className="mt-1">Inicie la continuación desde Nueva Matrícula, consultando el documento del aprendiz. Allí se registran la continuación y su nueva obligación; después se reinicia el proceso desde Control RUNT.</p>
                        <button type="button" onClick={() => router.push('/admin/inscripciones/nueva')}
                          className="mt-2 rounded bg-[#226184] px-3 py-2 font-semibold text-white">
                          Ir a Nueva Matrícula
                        </button>
                      </div>
                    )}
                    {!!matriculaSeleccionada?.continuaciones?.length && (
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="mb-2 text-xs font-bold">Historial de continuaciones</p>
                        {matriculaSeleccionada.continuaciones.map(item => (
                          <div key={item.id} className="mb-1 rounded bg-slate-50 p-2 text-[11px]">
                            <strong>{formatearFecha(item.fecha_continuacion)}</strong> · {item.motivo}
                            <div className="text-slate-500">Responsable: {item.registrado_por}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {matriculaSeleccionada?.control_runt && (
                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                        <div className="bg-[#B2CBE2] text-[#263746] px-3 py-2 text-xs font-semibold">Detalle RUNT</div>
                        <div className="p-2 grid grid-cols-2 xl:grid-cols-4 gap-1.5">
                          <Campo label="Proceso" valor={`#${matriculaSeleccionada.control_runt.numero_proceso || 1}`} />
                          <Campo label="Verificación" valor={matriculaSeleccionada.control_runt.resultado_verificacion || 'PENDIENTE'} />
                          <Campo label="Registro" valor={matriculaSeleccionada.control_runt.estado_registro || 'PENDIENTE'} />
                          <Campo label="Certificación" valor={matriculaSeleccionada.control_runt.estado_certificacion || 'PENDIENTE'} />
                          <Campo label="Inicio plazo RUNT" valor={formatearFecha(matriculaSeleccionada.estado_runt?.fecha_registro)} />
                          <Campo label="Límite RUNT (90 días)" valor={formatearFecha(matriculaSeleccionada.estado_runt?.fecha_limite)} />
                          <div className="col-span-2 flex items-center justify-center">
                            <EstadoMatriculaRunt estado={matriculaSeleccionada.estado_runt} />
                          </div>
                        </div>
                        {Array.isArray(matriculaSeleccionada.procesos_runt) && matriculaSeleccionada.procesos_runt.length > 1 && (
                          <div className="border-t border-gray-200 p-2">
                            <p className="mb-2 text-xs font-semibold text-slate-700">Historial de procesos RUNT</p>
                            <div className="space-y-2">
                              {matriculaSeleccionada.procesos_runt.map(proceso => (
                                <div key={proceso.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 p-2 text-[11px]">
                                  <span className="font-semibold">Proceso #{proceso.numero_proceso}</span>
                                  <EstadoMatriculaRunt estado={proceso.vigencia} />
                                  <span>Registrado: {formatearFecha(proceso.fecha_registro)}</span>
                                  <span>Certificado: {formatearFecha(proceso.fecha_certificacion)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {matriculaSeleccionada?.control_sicov && (
                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                        <div className="bg-[#B2CBE2] text-[#263746] px-3 py-2 text-xs font-semibold">Detalle SICOV</div>
                        <div className="p-2 grid grid-cols-2 xl:grid-cols-4 gap-1.5">
                          <Campo label="Registro" valor={matriculaSeleccionada.control_sicov.estado_registro || 'PENDIENTE'} />
                          <Campo label="Fecha registro" valor={formatearFecha(matriculaSeleccionada.control_sicov.fecha_registro)} />
                          <Campo label="Certificación" valor={matriculaSeleccionada.control_sicov.estado_certificacion || 'PENDIENTE'} />
                          <Campo label="Fecha certificación" valor={formatearFecha(matriculaSeleccionada.control_sicov.fecha_certificacion)} />
                        </div>
                      </div>
                    )}

                    {matriculaSeleccionada?.control_siet && (
                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                        <div className="bg-[#B2CBE2] text-[#263746] px-3 py-2 text-xs font-semibold">Detalle SIET</div>
                        <div className="p-2 grid grid-cols-2 xl:grid-cols-4 gap-1.5">
                          <Campo label="Estado" valor={matriculaSeleccionada.control_siet.estado || 'PENDIENTE'} />
                          <Campo label="Fecha registro" valor={formatearFecha(matriculaSeleccionada.control_siet.fecha_registro)} />
                          <Campo label="Usuario registro" valor={matriculaSeleccionada.control_siet.usuario_registro} />
                          <Campo label="Fecha certificación" valor={formatearFecha(matriculaSeleccionada.control_siet.fecha_certificacion)} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

        </div>

    </div>
  )
}