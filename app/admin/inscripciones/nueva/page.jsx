// app/admin/inscripciones/nueva/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import { toast } from 'sonner'

import { UserPlus } from 'lucide-react'
import { ORDEN_CATEGORIAS, CATEGORIAS_POR_NIVEL, categoriasPosteriores, validarSeleccionCategorias, puedeSeleccionarCategoria } from '@/lib/reglasCategoriasInscripciones'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import CampoCatalogo from '@/components/admin/CampoCatalogo'
import CampoMunicipioBusqueda from '@/components/admin/CampoMunicipioBusqueda'
import CampoLugarExpedicion from '@/components/admin/CampoLugarExpedicion'
import {
  ESTILO_SECCIONES,
  BotonGuardar,
  BotonCancelar,
  BotonLimpiar,
  FranjaSuperiorModal,
  ESTILO_CELDAS_TABLA,
} from '@/components/admin/EstiloModulo'

// ============================================================
// CONSTANTES
// ============================================================

const API_URL =
  '/api/admin/inscripciones/aprendices'

const CATS_TODAS = ORDEN_CATEGORIAS

const TIPOS_DOC = [
  'CC',
  'TI',
  'CE',
  'PA',
  'PEP',
]

const GENEROS = [
  'MASCULINO',
  'FEMENINO',
]

const ESTADOS_CIVIL = [
  'SOLTERO/A',
  'CASADO/A',
  'UNIÓN LIBRE',
  'VIUDO/A',
  'DIVORCIADO/A',
]

const OCUPACIONES = [
  'EMPLEADO',
  'ESTUDIANTE',
  'INDEPENDIENTE',
  'COMERCIANTE',
  'HOGAR',
  'CONTRATISTA',
  'EMPRESARIO',
  'NO APLICA',
]

const NIVELES_EDU = [
  'BACHILLER',
  'TÉCNICO',
  'TECNÓLOGO',
  'PROFESIONAL',
  'ESPECIALISTA',
  'MAESTRÍA',
  'DOCTORADO',
  'NO APLICA',
]

const ESTRATOS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
]

// ============================================================
// JERARQUÍA DE CATEGORÍAS
// ============================================================

const ALLOWED_16_17 =
  new Set([
    'A2',
    'B1',
  ])

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

const Step = ({
  n,
  title,
  active,
}) => (
  <div
    className={`
      flex
      items-center
      gap-2
      ${
        active
          ? 'text-[var(--primary)]'
          : 'text-gray-500'
      }
    `}
  >
    <div
      className={`
        w-7
        h-7
        rounded-full
        flex
        items-center
        justify-center
        text-xs
        font-bold
        ${
          active
            ? 'bg-[var(--primary)] text-white'
            : 'bg-gray-200 text-gray-700'
        }
      `}
    >
      {n}
    </div>

    <span className="text-xs font-semibold">
      {title}
    </span>
  </div>
)

const FieldError = ({
  msg,
}) =>
  msg ? (
    <p className="mt-1 text-[11px] text-red-600">
      {msg}
    </p>
  ) : null

// ============================================================
// HELPERS
// ============================================================

function obtenerNitUsuario(
  user
) {
  return String(
    user?.nit ||
    user?.nitEmpresa ||
    user?.nit_empresa ||
    user?.empresaNit ||
    user?.empresa_nit ||
    ''
  ).trim()
}

function nombreUsuario(
  user
) {
  return (
    user?.nombreCompleto ||
    user?.nombre_completo ||
    user?.usuario ||
    ''
  )
}

function nombreEmpresaUsuario(
  user
) {
  return (
    user?.nombreEmpresa ||
    user?.nombre_empresa ||
    user?.empresa?.nombre ||
    user?.empresa?.nombre_empresa ||
    user?.empresa ||
    'CEA'
  )
}

function obtenerNivelCeaUsuario(
  user
) {
  return String(
    user?.nivel_cea ||
    user?.nivelCea ||
    user?.empresa?.nivel_cea ||
    ''
  )
    .trim()
    .toUpperCase()
}

function obtenerCategoriasHabilitadasUsuario(
  user
) {
  const desdeSesion =
    user?.categorias_habilitadas ||
    user?.categoriasHabilitadas ||
    user?.empresa?.categorias_habilitadas

  if (
    Array.isArray(
      desdeSesion
    ) &&
    desdeSesion.length >
      0
  ) {
    return desdeSesion
      .map(
        item =>
          String(
            item ||
            ''
          )
            .trim()
            .toUpperCase()
      )
      .filter(
        item =>
          CATS_TODAS.includes(
            item
          )
      )
  }

  const nivel =
    obtenerNivelCeaUsuario(
      user
    )

  return [
    ...(
      CATEGORIAS_POR_NIVEL[
        nivel
      ] ||
      []
    ),
  ]
}

function yearsDiff(
  fechaISO
) {
  if (
    !fechaISO
  ) {
    return null
  }

  const hoy =
    new Date()

  const fn =
    new Date(
      `${fechaISO}T00:00:00`
    )

  let edad =
    hoy.getFullYear() -
    fn.getFullYear()

  const mes =
    hoy.getMonth() -
    fn.getMonth()

  if (
    mes < 0 ||
    (
      mes === 0 &&
      hoy.getDate() <
        fn.getDate()
    )
  ) {
    edad--
  }

  return edad
}

function isValidEmail(
  valor
) {
  if (
    !valor
  ) {
    return true
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    valor
  )
}

function formatMilesDigits(
  digits
) {
  if (
    !digits
  ) {
    return ''
  }

  try {
    return new Intl.NumberFormat(
      'es-CO'
    ).format(
      Number(
        digits
      )
    )
  } catch {
    return digits
  }
}

function formatMoneda(
  valor
) {
  const numero =
    Number(
      valor ||
      0
    )

  return new Intl.NumberFormat(
    'es-CO',
    {
      style:
        'currency',

      currency:
        'COP',

      minimumFractionDigits:
        0,

      maximumFractionDigits:
        0,
    }
  ).format(
    numero
  )
}

function soloDigitos(
  valor
) {
  return String(
    valor ||
    ''
  ).replace(
    /\D+/g,
    ''
  )
}

// ============================================================
// FETCH JSON SEGURO
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

  const texto =
    await response.text()

  let json

  try {
    json =
      texto
        ? JSON.parse(
            texto
          )
        : {}
  } catch {
    console.error(
      `API NO JSON | URL: ${url} | HTTP: ${response.status} | RESPUESTA: ${texto.slice(0, 1000)}`
    )

    throw new Error(
      `La API respondió contenido no válido. HTTP ${response.status}.`
    )
  }

  if (
    !response.ok
  ) {
    throw new Error(
      json?.message ||
      `Error HTTP ${response.status}`
    )
  }

  return json
}

// ============================================================
// PÁGINA
// ============================================================

export default function NuevaInscripcionPage() {
  const router =
    useRouter()

  // ==========================================================
  // SESIÓN
  // ==========================================================

  const [
    user,
    setUser,
  ] =
    useState(null)

  const nitCatalogos = obtenerNitUsuario(user)
  const [departamentoResidencia, setDepartamentoResidencia] = useState('')
  const [departamentosCatalogo, setDepartamentosCatalogo] = useState([])
  const departamentoId = departamentosCatalogo.find((item) => item.nombre === departamentoResidencia)?.id || null

  // El borrador es local y se separa por usuario y CEA en el equipo.
  // Caduca a las 24 horas para reducir la exposición de datos personales.
  const claveBorrador = user
    ? `data-cea:nueva-matricula:v1:${obtenerNitUsuario(user)}:${String(user.id || user.usuario || user.email || user.correo || '').trim()}`
    : ''
  const [borradorListo, setBorradorListo] = useState(false)
  const [borradorRecuperado, setBorradorRecuperado] = useState(false)
  const omitirSiguienteGuardado = useRef(false)
  const noGuardarBorrador = useRef(false)

  // ==========================================================
  // ESTADO GENERAL
  // ==========================================================

  const [
    step,
    setStep,
  ] =
    useState(1)

  const [
    saving,
    setSaving,
  ] =
    useState(false)

  const [
    confirmarOpen,
    setConfirmarOpen,
  ] =
    useState(false)

  const [
    searching,
    setSearching,
  ] =
    useState(false)

  // ==========================================================
  // CONFIGURACIÓN DEL CEA
  // ==========================================================

  const [
    nivelCea,
    setNivelCea,
  ] =
    useState('')

  const [
    categoriasHabilitadas,
    setCategoriasHabilitadas,
  ] =
    useState([])

  // ==========================================================
  // CONVENIOS
  // ==========================================================

  const [
    convenios,
    setConvenios,
  ] =
    useState([])

  const [
    drawerConvenio,
    setDrawerConvenio,
  ] =
    useState(
      false
    )

  const [
    savingConvenio,
    setSavingConvenio,
  ] =
    useState(
      false
    )

  const [
    formConvenio,
    setFormConvenio,
  ] =
    useState({
      nombre:
        '',

      documento:
        '',

      celular:
        '',

      direccion:
        '',

      correo:
        '',
    })

  // ==========================================================
  // HISTORIAL
  // ==========================================================

  const [
    prevMatriculas,
    setPrevMatriculas,
  ] =
    useState([])

  const [restriccionNuevaMatricula, setRestriccionNuevaMatricula] = useState({ bloqueada: false, pendientes: [] })

  // Las matrículas anteriores requieren una decisión explícita; nunca inferir vencimiento.
  const [modalAntecedentes, setModalAntecedentes] = useState(false)
  const [revisionAntecedentes, setRevisionAntecedentes] = useState('')
  const ultimaConsultaModalRef = useRef('')

  // ==========================================================
  // ERRORES
  // ==========================================================

  const [
    errors,
    setErrors,
  ] =
    useState({})

  const setErr =
    (
      key,
      msg
    ) => {
      setErrors(
        prev => ({
          ...prev,
          [key]: msg,
        })
      )
    }

  const clrErr =
    (
      key
    ) => {
      setErrors(
        prev => {
          const next = {
            ...prev,
          }

          delete next[
            key
          ]

          return next
        }
      )
    }

  const setErrs =
    (
      value
    ) => {
      setErrors(
        value || {}
      )
    }

  const clearAllErrors =
    () => {
      setErrors({})
    }

  // ==========================================================
  // FORMULARIO
  // ==========================================================

  const [
    form,
    setForm,
  ] =
    useState({
      tipo_doc:
        'CC',

      documento:
        '',

      lugar_expedicion:
        '',

      genero:
        'MASCULINO',

      nombres:
        '',

      apellidos:
        '',

      fecha_nacimiento:
        '',

      celular:
        '',

      correo:
        '',

      direccion:
        '',

      barrio:
        '',

      ciudad:
        '',

      estado_civil:
        '',

      ocupacion:
        '',

      eps:
        '',

      estrato:
        '',

      nivel_educativo:
        '',

      origen_matricula:
        'DIRECTO',

      convenio:
        '',

      convenio_id:
        '',

      categorias:
        [],

      acudi_nombres:
        '',

      acudi_apellidos:
        '',

      acudi_tipo_doc:
        'CC',

      acudi_documento:
        '',

      acudi_celular:
        '',

      acudi_direccion:
        '',

      acudi_correo:
        '',

      emergencia_nombre:
        '',

      emergencia_celular:
        '',
    })

  // ==========================================================
  // INFORMACIÓN FINANCIERA
  // ==========================================================

  const [
    finanzas,
    setFinanzas,
  ] =
    useState({
      valores_curso:
        {},

      incluye_examen_medico:
        false,

      valor_examen_medico:
        '',

      observaciones_financieras:
        '',
    })

  // ==========================================================
  // VERIFICACIÓN INICIAL RUNT
  // ==========================================================
  //
  // La realiza la persona que crea la matrícula.
  //
  // Si no la realiza:
  //
  // estado_verificacion = PENDIENTE
  //
  // Si la realiza:
  //
  // estado_verificacion = VERIFICADO
  //
  // resultado:
  //
  // REGISTRADO
  // NO REGISTRADO
  //
  // ==========================================================

  const [
    runtConsultado,
    setRuntConsultado,
  ] =
    useState(false)

  const [
    runtResultado,
    setRuntResultado,
  ] =
    useState('')

  // ==========================================================
  // EDAD
  // ==========================================================

  const edad =
    useMemo(
      () =>
        yearsDiff(
          form.fecha_nacimiento
        ),
      [
        form.fecha_nacimiento,
      ]
    )

  const esMenor =
    edad !== null &&
    edad < 18

  const esMenor16 =
    edad !== null &&
    edad < 16

  const es16a17 =
    edad !== null &&
    edad >= 16 &&
    edad < 18

  // ==========================================================
  // HISTORIAL CATEGORÍAS
  // ==========================================================

  const histCategories =
    useMemo(
      () => {
        const set =
          new Set()

        for (
          const registro of
            prevMatriculas ||
            []
        ) {
          const categorias =
            Array.isArray(
              registro
                ?.categorias
            )
              ? registro
                  .categorias
              : registro
                  ?.categoria
                ? [
                    registro
                      .categoria,
                  ]
                : []

          for (
            const categoria of
              categorias
          ) {
            const value =
              String(
                categoria ||
                ''
              )
                .trim()
                .toUpperCase()

            if (CATS_TODAS.includes(value)) {
              set.add(
                value
              )
            }
          }
        }

        return set
      },
      [
        prevMatriculas,
      ]
    )

  // ==========================================================
  // SET FORM
  // ==========================================================

  const setF =
    (
      key,
      value,
      {
        upper = true,
      } = {}
    ) => {
      const email =
        key ===
          'correo' ||
        key ===
          'acudi_correo'

      const finalValue =
        typeof value ===
          'string' &&
        upper &&
        !email
          ? value.toUpperCase()
          : value

      setForm(
        prev => ({
          ...prev,

          [key]:
            finalValue,
        })
      )

      clrErr(
        key
      )
    }

  const setNumeric =
    (
      key
    ) =>
    (
      event
    ) => {
      const digits =
        String(
          event.target
            .value ||
          ''
        ).replace(
          /\D+/g,
          ''
        )

      setForm(
        prev => ({
          ...prev,

          [key]:
            digits,
        })
      )

      clrErr(
        key
      )
    }

  const setValorCurso =
    (
      categoria,
      valor
    ) => {
      const digits =
        soloDigitos(
          valor
        )

      setFinanzas(
        prev => ({
          ...prev,

          valores_curso: {
            ...prev
              .valores_curso,

            [categoria]:
              digits,
          },
        })
      )

      clrErr(
        `valor_curso_${categoria}`
      )
    }

  const setValorExamen =
    (
      valor
    ) => {
      setFinanzas(
        prev => ({
          ...prev,

          valor_examen_medico:
            soloDigitos(
              valor
            ),
        })
      )

      clrErr(
        'valor_examen_medico'
      )
    }

  // ==========================================================
  // DOCUMENTO
  // ==========================================================

  const handleDocumentoChange =
    (
      event
    ) => {
      const digits =
        String(
          event.target
            .value ||
          ''
        ).replace(
          /\D+/g,
          ''
        )

      setForm(
        prev => ({
          ...prev,

          documento:
            digits,
        })
      )

      clrErr(
        'documento'
      )
    }

  const documentoFmt =
    useMemo(
      () =>
        formatMilesDigits(
          form.documento
        ),
      [
        form.documento,
      ]
    )

  // ==========================================================
  // REGLAS CATEGORÍAS
  // ==========================================================

  const canSelectCat = cat => !restriccionNuevaMatricula.bloqueada && puedeSeleccionarCategoria({
    categoria: cat,
    seleccion: form.categorias,
    historial: [...histCategories],
    habilitadas: categoriasHabilitadas,
    edad,
  })

  const toggleCat =
    (
      cat
    ) => {
      if (
        !canSelectCat(
          cat
        )
      ) {
        let msg =
          'Combinación de categorías no permitida.'

        if (
          !categoriasHabilitadas.includes(
            cat
          )
        ) {
          msg =
            `La categoría ${cat} no está habilitada para ${nivelCea || 'el nivel del CEA'}.`
        } else if (
          esMenor16
        ) {
          msg =
            'Debes tener al menos 16 años.'
        } else if (
          es16a17 &&
          !ALLOWED_16_17.has(
            cat
          )
        ) {
          msg =
            'Con 16–17 años solo puede seleccionar A2 o B1.'
        } else if (
          histCategories.has(
            cat
          )
        ) {
          msg =
            'Esta categoría ya existe. Si el curso venció, utilice Continuación desde el expediente de Inscripciones.'
        } else if (!categoriasPosteriores([...histCategories]).includes(cat)) {
          msg = 'Esta categoría no está permitida según el historial del aprendiz.'
        }

        toast.warning(
          msg
        )

        setErr(
          'categorias',
          msg
        )

        return
      }

      setForm(
        prev => {
          const selected =
            prev
              .categorias
              .includes(
                cat
              )

          return {
            ...prev,

            categorias:
              selected
                ? prev
                    .categorias
                    .filter(
                      categoria =>
                        categoria !==
                        cat
                    )
                : [
                    ...prev
                      .categorias,
                    cat,
                  ],
          }
        }
      )

      clrErr(
        'categorias'
      )
    }

  // ==========================================================
  // SINCRONIZAR FINANZAS CON CATEGORÍAS
  // ==========================================================

  useEffect(
    () => {
      setFinanzas(
        prev => {
          const valores = {}

          for (
            const cat of
              form.categorias
          ) {
            valores[
              cat
            ] =
              prev.valores_curso?.[cat] ||
              ''
          }

          return {
            ...prev,

            valores_curso:
              valores,
          }
        }
      )
    },
    [
      form.categorias,
    ]
  )

  // ==========================================================
  // VALIDACIÓN PASO 1
  // ==========================================================

  const validarPaso1 =
    () => {
      const errs = {}

      const required = [
        'tipo_doc',
        'documento',
        'nombres',
        'apellidos',
        'fecha_nacimiento',
        'genero',
        // Información complementaria obligatoria.
        'estado_civil',
        'ocupacion',
        'eps',
        'estrato',
        'nivel_educativo',
      ]

      for (
        const key of
          required
      ) {
        if (
          !String(
            form[
              key
            ] ||
            ''
          ).trim()
        ) {
          errs[
            key
          ] =
            'Campo obligatorio.'
        }
      }

      if (
        form.documento &&
        !/^\d+$/.test(
          String(
            form.documento
          )
        )
      ) {
        errs.documento =
          'Debe contener solo dígitos.'
      }

      // Validar únicamente al revisar el formulario, no mientras se escribe.
      const tel = String(form.celular || '').trim()
      if (!/^\d{10}$/.test(tel)) {
        errs.celular = 'Ingrese un celular de 10 dígitos.'
      }
      for (const [key, label] of [
        ['direccion', 'la dirección'],
        ['barrio', 'el barrio'],
        ['ciudad', 'la ciudad o municipio'],
      ]) {
        if (!String(form[key] || '').trim()) {
          errs[key] = `Ingrese ${label}.`
        }
      }
      if (!String(departamentoResidencia || '').trim()) {
        errs.departamento_residencia_auxiliar = 'Seleccione el departamento.'
      }

      if (
        form.correo &&
        !isValidEmail(
          form.correo
        )
      ) {
        errs.correo =
          'Correo electrónico no válido.'
      }

      if (
        edad !==
          null &&
        edad < 16
      ) {
        errs.fecha_nacimiento =
          'Debes tener 16 años o más.'
      }

      setErrs(
        errs
      )

      const ok =
        Object.keys(
          errs
        ).length ===
        0

      if (
        !ok
      ) {
        toast.warning(
          'Revisa los campos resaltados.'
        )
      }

      return ok
    }

  // ==========================================================
  // VALIDACIÓN PASO 2
  // ==========================================================

  const validarPaso2 =
    () => {
      const errs = {}

      if (
        esMenor16
      ) {
        errs.categorias =
          'Debes tener 16 años o más.'
      }

      if (
        form
          .categorias
          .length ===
        0
      ) {
        errs.categorias =
          'Selecciona al menos una categoría.'
      }

      if (
        form
          .categorias
          .length >
        2
      ) {
        errs.categorias =
          'Máximo dos categorías.'
      }

      const categoriasNoHabilitadas =
        form.categorias.filter(
          cat =>
            !categoriasHabilitadas.includes(
              cat
            )
        )

      if (
        categoriasNoHabilitadas.length >
        0
      ) {
        errs.categorias =
          `La categoría ${categoriasNoHabilitadas.join(', ')} no está habilitada para ${nivelCea || 'el nivel del CEA'}.`
      }

      const sinA2 =
        form
          .categorias
          .filter(
            categoria =>
              categoria !==
              'A2'
          )

      if (
        sinA2.length >
        1
      ) {
        errs.categorias =
          'Solo se pueden combinar dos categorías cuando una de ellas es A2.'
      }

      if (
        es16a17 &&
        form
          .categorias
          .some(
            categoria =>
              !ALLOWED_16_17.has(
                categoria
              )
          )
      ) {
        errs.categorias =
          'Con 16–17 años solo A2 o B1.'
      }

      const validacionCategorias = validarSeleccionCategorias({
        seleccion: form.categorias,
        historial: [...histCategories],
        habilitadas: categoriasHabilitadas,
        edad,
      })
      if (!validacionCategorias.ok) {
        errs.categorias = validacionCategorias.message
      }

      // ====================================================
      // ORIGEN DE MATRÍCULA
      // ====================================================

      if (
        ![
          'DIRECTO',
          'CONVENIO',
        ].includes(
          String(
            form.origen_matricula ||
            ''
          ).toUpperCase()
        )
      ) {
        errs.origen_matricula =
          'Seleccione el origen de la matrícula.'
      }

      if (
        form.origen_matricula ===
          'CONVENIO' &&
        !form.convenio_id
      ) {
        errs.convenio_id =
          'Seleccione un convenio.'
      }

      // ====================================================
      // INFORMACIÓN FINANCIERA
      // ====================================================

      for (
        const cat of
          form.categorias
      ) {
        const valorCurso =
          Number(
            finanzas.valores_curso?.[cat] ||
            0
          )

        if (
          !Number.isFinite(
            valorCurso
          ) ||
          valorCurso <=
            0
        ) {
          errs[
            `valor_curso_${cat}`
          ] =
            `Ingrese el valor acordado para la categoría ${cat}.`
        }
      }

      if (
        finanzas
          .incluye_examen_medico
      ) {
        const valorExamen =
          Number(
            finanzas
              .valor_examen_medico ||
            0
          )

        if (
          !Number.isFinite(
            valorExamen
          ) ||
          valorExamen <=
            0
        ) {
          errs.valor_examen_medico =
            'Ingrese el valor del examen médico.'
        }

      }

      if (
        esMenor
      ) {
        const required = [
          'acudi_nombres',
          'acudi_apellidos',
          'acudi_tipo_doc',
          'acudi_documento',
          'acudi_celular',
        ]

        for (
          const key of
            required
        ) {
          if (
            !String(
              form[
                key
              ] ||
              ''
            ).trim()
          ) {
            errs[
              key
            ] =
              'Campo obligatorio.'
          }
        }

        if (
          form
            .acudi_documento &&
          !/^\d+$/.test(
            form
              .acudi_documento
          )
        ) {
          errs.acudi_documento =
            'Solo dígitos.'
        }

        if (!/^\d{10}$/.test(String(form.acudi_celular || '').trim())) {
          errs.acudi_celular = 'El celular del acudiente debe tener 10 dígitos.'
        }

        if (
          form
            .acudi_correo &&
          !isValidEmail(
            form
              .acudi_correo
          )
        ) {
          errs.acudi_correo =
            'Correo no válido.'
        }
      } else {
        if (
          !String(
            form
              .emergencia_nombre ||
            ''
          ).trim()
        ) {
          errs.emergencia_nombre =
            'Campo obligatorio.'
        }

        if (
          !String(
            form
              .emergencia_celular ||
            ''
          ).trim()
        ) {
          errs.emergencia_celular =
            'Campo obligatorio.'
        }

        if (!/^\d{10}$/.test(String(form.emergencia_celular || '').trim())) {
          errs.emergencia_celular = 'El celular del contacto debe tener 10 dígitos.'
        }
      }

      setErrors(
        prev => ({
          ...prev,
          ...errs,
        })
      )

      const ok =
        Object.keys(
          errs
        ).length ===
        0

      if (
        !ok
      ) {
        toast.warning(
          'Revisa los campos resaltados.'
        )
      }

      return ok
    }

  // ==========================================================
  // VALIDAR RUNT
  // ==========================================================

  const validarRunt = () => {
    if (!['REGISTRADO', 'NO REGISTRADO'].includes(runtResultado)) {
      setErr('runtResultado', 'Debe consultar el RUNT y seleccionar un resultado.')
      toast.warning('La consulta ciudadana del RUNT es obligatoria.')
      return false
    }
    clrErr('runtResultado')
    return true
  }

  // ==========================================================
  // NORMALIZAR PARA GUARDAR
  // ==========================================================

  const normalizeForSave =
    (
      obj
    ) => {
      const emailKeys =
        new Set([
          'correo',
          'acudi_correo',
        ])

      const out = {}

      for (
        const [
          key,
          value,
        ] of
          Object.entries(
            obj
          )
      ) {
        if (
          value ===
            null ||
          value ===
            undefined
        ) {
          out[
            key
          ] =
            value

          continue
        }

        if (
          typeof value ===
          'string'
        ) {
          const trimmed =
            value.trim()

          out[
            key
          ] =
            emailKeys.has(
              key
            )
              ? trimmed.toLowerCase()
              : trimmed.toUpperCase()
        } else if (
          Array.isArray(
            value
          )
        ) {
          out[
            key
          ] =
            value.map(
              item =>
                typeof item ===
                'string'
                  ? item
                      .trim()
                      .toUpperCase()
                  : item
            )
        } else {
          out[
            key
          ] =
            value
        }
      }

      return out
    }

  // ==========================================================
  // LIMPIAR
  // ==========================================================

  const limpiar =
    () => {
      if (claveBorrador) {
        try { localStorage.removeItem(claveBorrador) } catch {}
      }
      omitirSiguienteGuardado.current = true
      setBorradorRecuperado(false)
      setDepartamentoResidencia('')
      setForm({
        tipo_doc:
          'CC',

        documento:
          '',

        lugar_expedicion:
          '',

        genero:
          'MASCULINO',

        nombres:
          '',

        apellidos:
          '',

        fecha_nacimiento:
          '',

        celular:
          '',

        correo:
          '',

        direccion:
          '',

        barrio:
          '',

        ciudad:
          '',

        estado_civil:
          '',

        ocupacion:
          '',

        eps:
          '',

        estrato:
          '',

        nivel_educativo:
          '',

        origen_matricula:
          'DIRECTO',

        convenio:
          '',

        convenio_id:
          '',

        categorias:
          [],

        acudi_nombres:
          '',

        acudi_apellidos:
          '',

        acudi_tipo_doc:
          'CC',

        acudi_documento:
          '',

        acudi_celular:
          '',

        acudi_direccion:
          '',

        acudi_correo:
          '',

        emergencia_nombre:
          '',

        emergencia_celular:
          '',
      })

      setFinanzas({
        valores_curso:
          {},

        incluye_examen_medico:
          false,

        valor_examen_medico:
          '',

        observaciones_financieras:
          '',
      })

      setPrevMatriculas(
        []
      )

      setRuntConsultado(
        false
      )

      setRuntResultado(
        ''
      )

      clearAllErrors()

      setConfirmarOpen(
        false
      )

      setStep(
        1
      )
    }

  // ==========================================================
  // RESET CONSERVANDO DOCUMENTO
  // ==========================================================

  const resetPreservandoDocumento =
    () => {
      setForm(
        prev => ({
          ...prev,

          tipo_doc:
            prev.tipo_doc,

          documento:
            prev.documento,

          lugar_expedicion:
            '',

          genero:
            'MASCULINO',

          nombres:
            '',

          apellidos:
            '',

          fecha_nacimiento:
            '',

          celular:
            '',

          correo:
            '',

          direccion:
            '',

          barrio:
            '',

          ciudad:
            '',

          estado_civil:
            '',

          ocupacion:
            '',

          eps:
            '',

          estrato:
            '',

          nivel_educativo:
            '',

          origen_matricula:
            'DIRECTO',

          convenio:
            '',

          convenio_id:
            '',

          categorias:
            [],

          acudi_nombres:
            '',

          acudi_apellidos:
            '',

          acudi_tipo_doc:
            'CC',

          acudi_documento:
            '',

          acudi_celular:
            '',

          acudi_direccion:
            '',

          acudi_correo:
            '',

          emergencia_nombre:
            '',

          emergencia_celular:
            '',
        })
      )

      setFinanzas({
        valores_curso:
          {},

        incluye_examen_medico:
          false,

        valor_examen_medico:
          '',

        observaciones_financieras:
          '',
      })

      setPrevMatriculas(
        []
      )

      setRuntConsultado(
        false
      )

      setRuntResultado(
        ''
      )

      clearAllErrors()
    }

  // ==========================================================
  // CREAR CONVENIO SIN SALIR DE LA MATRÍCULA
  // ==========================================================

  const abrirNuevoConvenio =
    () => {
      setFormConvenio({
        nombre:
          '',

        documento:
          '',

        celular:
          '',

        direccion:
          '',

        correo:
          '',
      })

      setDrawerConvenio(
        true
      )
    }

  const crearConvenioRapido =
    async () => {
      const nombre =
        String(
          formConvenio
            .nombre ||
          ''
        ).trim()

      if (
        !nombre
      ) {
        toast.warning(
          'El nombre del convenio es obligatorio.'
        )

        return
      }

      if (
        formConvenio
          .correo &&
        !isValidEmail(
          formConvenio
            .correo
        )
      ) {
        toast.warning(
          'El correo del convenio no es válido.'
        )

        return
      }

      const nit =
        obtenerNitUsuario(
          user
        )

      if (
        !nit
      ) {
        toast.error(
          'No se encontró el NIT del CEA.'
        )

        return
      }

      setSavingConvenio(
        true
      )

      try {
        const json =
          await fetchJsonSeguro(
            API_URL,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  accion:
                    'crear_convenio',

                  nit,

                  nombre:
                    nombre.toUpperCase(),

                  documento:
                    String(
                      formConvenio
                        .documento ||
                      ''
                    ).trim(),

                  celular:
                    String(
                      formConvenio
                        .celular ||
                      ''
                    ).trim(),

                  direccion:
                    String(
                      formConvenio
                        .direccion ||
                      ''
                    )
                      .trim()
                      .toUpperCase(),

                  correo:
                    String(
                      formConvenio
                        .correo ||
                      ''
                    )
                      .trim()
                      .toLowerCase(),
                }),
            }
          )

        if (
          json?.status !==
          'success'
        ) {
          throw new Error(
            json?.message ||
            'No fue posible crear el convenio.'
          )
        }

        const nuevo =
          json?.data

        if (
          !nuevo?.id
        ) {
          throw new Error(
            'La API no devolvió el convenio creado.'
          )
        }

        setConvenios(
          prev => {
            const lista = [
              ...prev.filter(
                item =>
                  String(
                    item.id
                  ) !==
                  String(
                    nuevo.id
                  )
              ),

              nuevo,
            ]

            return lista.sort(
              (
                a,
                b
              ) =>
                String(
                  a?.nombre ||
                  ''
                ).localeCompare(
                  String(
                    b?.nombre ||
                    ''
                  ),
                  'es'
                )
            )
          }
        )

        setForm(
          prev => ({
            ...prev,

            origen_matricula:
              'CONVENIO',

            convenio_id:
              String(
                nuevo.id
              ),

            convenio:
              String(
                nuevo.nombre ||
                nombre
              ).toUpperCase(),
          })
        )

        setDrawerConvenio(
          false
        )

        toast.success(
          'Convenio creado y seleccionado correctamente.'
        )
      } catch (
        error
      ) {
        console.error(
          'Error creando convenio:',
          error
        )

        toast.error(
          error?.message ||
          'No fue posible crear el convenio.'
        )
      } finally {
        setSavingConvenio(
          false
        )
      }
    }

  // ==========================================================
  // CARGAR SESIÓN
  // ==========================================================

  useEffect(() => {
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
      const usuario =
        JSON.parse(
          stored
        )

      setUser(
        usuario
      )

      const nivelSesion =
        obtenerNivelCeaUsuario(
          usuario
        )

      const categoriasSesion =
        obtenerCategoriasHabilitadasUsuario(
          usuario
        )

      if (
        nivelSesion
      ) {
        setNivelCea(
          nivelSesion
        )
      }

      if (
        categoriasSesion.length >
        0
      ) {
        setCategoriasHabilitadas(
          categoriasSesion
        )
      }
    } catch (
      error
    ) {
      console.error(
        'Error leyendo sesión:',
        error
      )

      localStorage.removeItem(
        'currentUser'
      )

      router.push(
        '/login'
      )
    }
  }, [
    router,
  ])

  // ==========================================================
  // BORRADOR LOCAL: RECUPERAR Y AUTOGUARDAR
  // ==========================================================

  useEffect(() => {
    if (!claveBorrador) return
    setBorradorListo(false)
    noGuardarBorrador.current = false
    try {
      const guardado = localStorage.getItem(claveBorrador)
      if (guardado) {
        const borrador = JSON.parse(guardado)
        const vigente = Number(borrador?.guardadoEn) > Date.now() - 24 * 60 * 60 * 1000
        if (vigente && borrador.form && typeof borrador.form === 'object') {
          setForm(prev => ({ ...prev, ...borrador.form }))
          if (borrador.finanzas && typeof borrador.finanzas === 'object') {
            setFinanzas(prev => ({ ...prev, ...borrador.finanzas }))
          }
          setDepartamentoResidencia(String(borrador.departamentoResidencia || ''))
          if (['REGISTRADO', 'NO REGISTRADO', ''].includes(borrador.runtResultado)) {
            setRuntResultado(borrador.runtResultado)
          }
          setBorradorRecuperado(true)
        } else {
          localStorage.removeItem(claveBorrador)
        }
      }
    } catch {
      localStorage.removeItem(claveBorrador)
    } finally {
      setBorradorListo(true)
    }
  }, [claveBorrador])

  useEffect(() => {
    if (!claveBorrador || !borradorListo || noGuardarBorrador.current) return
    if (omitirSiguienteGuardado.current) {
      omitirSiguienteGuardado.current = false
      return
    }
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(claveBorrador, JSON.stringify({
          guardadoEn: Date.now(),
          form,
          finanzas,
          departamentoResidencia,
          runtResultado,
        }))
      } catch {
        // La matrícula puede continuar si el almacenamiento local está deshabilitado.
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [claveBorrador, borradorListo, form, finanzas, departamentoResidencia, runtResultado])

  // ==========================================================
  // CARGAR CONVENIOS
  // ==========================================================

  useEffect(() => {
    if (
      !user
    ) {
      return
    }

    let alive =
      true

    const cargar =
      async () => {
        try {
          const params =
            new URLSearchParams()

          params.set(
            'recurso',
            'convenios'
          )

          const nit =
            obtenerNitUsuario(
              user
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

          if (
            json?.status !==
            'success'
          ) {
            throw new Error(
              json?.message ||
              'No se pudieron cargar los convenios.'
            )
          }

          if (
            alive
          ) {
            setConvenios(
              Array.isArray(
                json?.data
              )
                ? json.data
                : []
            )

            const nivelApi =
              String(
                json?.empresa
                  ?.nivel_cea ||
                ''
              )
                .trim()
                .toUpperCase()

            const categoriasApi =
              Array.isArray(
                json?.empresa
                  ?.categorias_habilitadas
              )
                ? json.empresa
                    .categorias_habilitadas
                    .map(
                      item =>
                        String(
                          item ||
                          ''
                        )
                          .trim()
                          .toUpperCase()
                    )
                    .filter(
                      item =>
                        CATS_TODAS.includes(
                          item
                        )
                    )
                : []

            const categoriasPorNivel =
              nivelApi
                ? [
                    ...(
                      CATEGORIAS_POR_NIVEL[
                        nivelApi
                      ] ||
                      []
                    ),
                  ]
                : []

            if (
              nivelApi
            ) {
              setNivelCea(
                nivelApi
              )
            }

            if (
              categoriasApi.length >
              0
            ) {
              setCategoriasHabilitadas(
                categoriasApi
              )

              setForm(
                prev => ({
                  ...prev,

                  categorias:
                    prev.categorias.filter(
                      cat =>
                        categoriasApi.includes(
                          cat
                        )
                    ),
                })
              )
            } else if (
              categoriasPorNivel.length >
              0
            ) {
              setCategoriasHabilitadas(
                categoriasPorNivel
              )

              setForm(
                prev => ({
                  ...prev,

                  categorias:
                    prev.categorias.filter(
                      cat =>
                        categoriasPorNivel.includes(
                          cat
                        )
                    ),
                })
              )
            }
          }
        } catch (
          error
        ) {
          console.error(
            'Error cargando convenios:',
            error
          )

          if (
            alive
          ) {
            setConvenios(
              []
            )
          }

          toast.error(
            error?.message ||
            'No se pudieron cargar los convenios.'
          )
        }
      }

    cargar()

    return () => {
      alive =
        false
    }
  }, [
    user,
  ])

  // ==========================================================
  // BUSCAR HISTORIAL
  // ==========================================================

  const buscarPorDocumento =
    async () => {
      const documento =
        String(
          form.documento ||
          ''
        ).trim()

      if (
        !documento
      ) {
        setErr(
          'documento',
          'Campo obligatorio.'
        )

        toast.warning(
          'Ingresa un documento.'
        )

        return
      }

      if (
        !user
      ) {
        return
      }

      setSearching(
        true
      )

      try {
        const params =
          new URLSearchParams()

        params.set(
          'recurso',
          'historial'
        )

        params.set(
          'documento',
          documento
        )

        const nit =
          obtenerNitUsuario(
            user
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

        if (
          json?.status !==
          'success'
        ) {
          throw new Error(
            json?.message ||
            'No se pudo consultar.'
          )
        }

        const list =
          Array.isArray(
            json?.data
          )
            ? json.data
            : []

        setPrevMatriculas(
          list
        )
        setRestriccionNuevaMatricula(json?.restriccion_nueva_matricula || { bloqueada: list.length > 0, pendientes: [] })
        if (json?.restriccion_nueva_matricula?.bloqueada) {
          setForm(prev => ({ ...prev, categorias: [] }))
        }
        if (list.length > 0 && ultimaConsultaModalRef.current !== documento) {
          ultimaConsultaModalRef.current = documento
          setRevisionAntecedentes('')
          setModalAntecedentes(true)
        } else if (list.length === 0) {
          ultimaConsultaModalRef.current = documento
          setModalAntecedentes(false)
        }

        if (
          json?.latest
        ) {
          const ultimo =
            json.latest

          setForm(
            prev => ({
              ...prev,

              lugar_expedicion:
                String(
                  ultimo
                    .lugar_expedicion ||
                  ''
                ).toUpperCase(),

              genero:
                String(
                  ultimo.genero ||
                  'MASCULINO'
                ).toUpperCase(),

              nombres:
                String(
                  ultimo.nombres ||
                  ''
                ).toUpperCase(),

              apellidos:
                String(
                  ultimo.apellidos ||
                  ''
                ).toUpperCase(),

              fecha_nacimiento:
                ultimo
                  .fecha_nacimiento ||
                '',

              celular:
                ultimo.celular ||
                '',

              correo:
                ultimo.correo ||
                '',

              direccion:
                String(
                  ultimo.direccion ||
                  ''
                ).toUpperCase(),

              barrio:
                String(
                  ultimo.barrio ||
                  ''
                ).toUpperCase(),

              ciudad:
                String(
                  ultimo.ciudad ||
                  ''
                ).toUpperCase(),

              estado_civil:
                String(
                  ultimo
                    .estado_civil ||
                  ''
                ).toUpperCase(),

              ocupacion:
                String(
                  ultimo.ocupacion ||
                  ''
                ).toUpperCase(),

              eps:
                String(
                  ultimo.eps ||
                  ''
                ).toUpperCase(),

              estrato:
                String(
                  ultimo.estrato ||
                  ''
                ),

              nivel_educativo:
                String(
                  ultimo
                    .nivel_educativo ||
                  ''
                ).toUpperCase(),
            })
          )

          clearAllErrors()

          const cats =
            list
              .map(
                registro =>
                  Array.isArray(
                    registro
                      ?.categorias
                  )
                    ? registro
                        .categorias
                        .join(
                          '/'
                        )
                    : String(
                        registro
                          ?.categoria ||
                        ''
                      )
              )
              .filter(
                Boolean
              )
              .join(
                ' · '
              )

          toast.success(
            `Historial encontrado: ${cats || '—'}`
          )
        } else {
          resetPreservandoDocumento()

          toast.success(
            'No hay matrículas anteriores para este documento.'
          )
        }
      } catch (
        error
      ) {
        console.error(
          'Error consultando historial:',
          error
        )

        toast.error(
          error?.message ||
          'Error al consultar el historial.'
        )
      } finally {
        setSearching(
          false
        )
      }
    }

  // ==========================================================
  // DEBOUNCE DOCUMENTO
  // ==========================================================

  const debounceRef =
    useRef(null)

  useEffect(() => {
    if (
      !user
    ) {
      return
    }

    if (
      !form.documento ||
      String(
        form.documento
      ).trim().length <
        5
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
          buscarPorDocumento()
        },
        600
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.tipo_doc,
    form.documento,
    user,
  ])

  // ==========================================================
  // NAVEGACIÓN POR TECLADO Y CONFIRMACIÓN
  // ==========================================================

  const enfocarPrimerError =
    () => {
      window.setTimeout(
        () => {
          const primerError =
            document.querySelector(
              '[aria-invalid="true"], .border-red-500, .border-red-600'
            )

          if (
            primerError &&
            typeof primerError.focus ===
              'function'
          ) {
            primerError.focus({
              preventScroll:
                false,
            })
          }
        },
        50
      )
    }

  const abrirConfirmacion =
    () => {
      if (restriccionNuevaMatricula.bloqueada) {
        toast.warning('No se puede crear una matrícula nueva hasta verificar la certificación de las matrículas anteriores. Consulte el expediente.')
        setModalAntecedentes(true)
        return
      }
      const ok1 =
        validarPaso1()

      const ok2 =
        validarPaso2()

      const okRunt =
        validarRunt()

      if (
        !ok1 ||
        !ok2 ||
        !okRunt
      ) {
        toast.warning(
          'Complete o corrija los campos señalados antes de confirmar la matrícula.'
        )

        enfocarPrimerError()
        return
      }

      setConfirmarOpen(
        true
      )
    }

  const manejarEnter =
    event => {
      if (
        event.key !==
          'Enter' ||
        event.shiftKey ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return
      }

      const actual =
        event.target

      if (
        !actual ||
        actual.tagName ===
          'TEXTAREA' ||
        actual.tagName ===
          'BUTTON' ||
        actual.type ===
          'checkbox' ||
        actual.type ===
          'radio' ||
        actual.type ===
          'submit'
      ) {
        return
      }

      const contenedor =
        event.currentTarget

      const controles =
        Array.from(
          contenedor.querySelectorAll(
            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
          )
        ).filter(
          elemento =>
            elemento.offsetParent !==
              null &&
            elemento.tabIndex !==
              -1
        )

      const indice =
        controles.indexOf(
          actual
        )

      if (
        indice < 0
      ) {
        return
      }

      const siguiente =
        controles
          .slice(
            indice + 1
          )
          .find(
            elemento =>
              elemento.tagName !==
                'BUTTON'
          )

      if (
        siguiente
      ) {
        event.preventDefault()
        siguiente.focus()
      }
    }

  // ==========================================================
// GUARDAR
// ==========================================================

const guardar =
  async () => {
    if (restriccionNuevaMatricula.bloqueada) {
      toast.error('Existe una matrícula anterior sin certificación confirmada. No se permite un registro nuevo.')
      setModalAntecedentes(true)
      return
    }
    const ok1 =
      validarPaso1()

    const ok2 =
      validarPaso2()

    const okRunt =
      validarRunt()

    if (
      !ok1 ||
      !ok2 ||
      !okRunt
    ) {
      return
    }

    if (
      !user
    ) {
      toast.error(
        'No se encontró una sesión válida.'
      )

      return
    }

    setSaving(
      true
    )

    try {
      const nit =
        obtenerNitUsuario(
          user
        )

      if (
        !nit
      ) {
        throw new Error(
          'No se encontró el NIT del CEA.'
        )
      }

      // =====================================================
      // PAYLOAD
      // =====================================================

      const payload =
        normalizeForSave({
          ...form,

          categorias:
            [
              ...form.categorias,
            ],

          nit,

          // =================================================
          // VERIFICACIÓN RUNT
          // =================================================

          runt_estado_verificacion:
            runtResultado ? 'VERIFICADO' : 'PENDIENTE',

          runt_resultado_verificacion:
            runtResultado || null,

          runt_usuario_verificacion:
            runtResultado ? nombreUsuario(user) : '',

          runt_verificado:
            Boolean(runtResultado),

          // =================================================
          // INFORMACIÓN FINANCIERA
          // =================================================

          origen_matricula:
            form.origen_matricula ===
              'CONVENIO'
              ? 'CONVENIO'
              : 'DIRECTO',

          convenio_id:
            form.origen_matricula ===
              'CONVENIO' &&
            form.convenio_id
              ? Number(
                  form.convenio_id
                )
              : null,

          convenio:
            form.origen_matricula ===
              'CONVENIO'
              ? form.convenio
              : '',

          valores_curso:
            form.categorias.map(
              categoria => ({
                categoria,

                valor:
                  Number(
                    finanzas.valores_curso?.[categoria] ||
                    0
                  ),
              })
            ),

          incluye_examen_medico:
            Boolean(
              finanzas
                .incluye_examen_medico
            ),

          valor_examen_medico:
            finanzas
              .incluye_examen_medico
              ? Number(
                  finanzas
                    .valor_examen_medico ||
                  0
                )
              : 0,

          observaciones_financieras:
            String(
              finanzas
                .observaciones_financieras ||
              ''
            ).trim(),
        })

      // =====================================================
      // GUARDAR MATRÍCULA
      // =====================================================

      const json =
        await fetchJsonSeguro(
          API_URL,
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

      if (
        json?.status !==
        'success'
      ) {
        throw new Error(
          json?.message ||
          'Error al guardar la matrícula.'
        )
      }

      // =====================================================
      // CONSECUTIVOS
      // =====================================================

      const consecutivos =
        Array.isArray(
          json?.data
            ?.consecutivos
        )
          ? json.data
              .consecutivos
          : []

      // =====================================================
      // MENSAJE
      // =====================================================

      if (
        consecutivos.length >
        1
      ) {
        toast.success(
          `✅ Matrículas creadas correctamente. Consecutivos: ${consecutivos.join(', ')}`
        )
      } else {
        toast.success(
          `✅ Matrícula creada correctamente. Consecutivo: ${consecutivos[0] || '—'}`
        )
      }

      // La matrícula ya se guardó en la empresa: borrar el borrador local.
      noGuardarBorrador.current = true
      if (claveBorrador) {
        try { localStorage.removeItem(claveBorrador) } catch {}
      }

      // =====================================================
      // VOLVER A CONSULTAS Y MATRÍCULAS
      // =====================================================

      router.replace(
        '/admin/inscripciones'
      )

      router.refresh()

      return

    } catch (
      error
    ) {
      console.error(
        'Error guardando matrícula:',
        error
      )

      toast.error(
        error?.message ||
        'No se pudo guardar la matrícula.'
      )
    } finally {
      setSaving(
        false
      )
    }
  }

  // ==========================================================
  // CARGANDO
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

  // Progreso de secciones sin efectos secundarios ni validación invasiva.
  const conTexto = valor => { const v = String(valor ?? '').trim(); return v !== '' && v !== '—' && v !== '-' }
  const infoComplementaria = ['estado_civil', 'ocupacion', 'eps', 'estrato', 'nivel_educativo']
  const identificacionCampos = ['tipo_doc', 'documento', 'nombres', 'apellidos', 'fecha_nacimiento', 'genero']
  const identificacionCompleta = identificacionCampos.every(key => conTexto(form[key])) &&
    /^\d+$/.test(String(form.documento || '')) && edad !== null && edad >= 16
  const contactoIniciado = ['celular', 'correo', 'direccion', 'barrio', 'ciudad',
    'emergencia_nombre', 'emergencia_celular'].some(key => conTexto(form[key])) ||
    conTexto(departamentoResidencia)
  // El contacto no se completa por diligenciar solo la dirección.
  // El correo es opcional; los menores tienen un acudiente en otro bloque.
  const contactoCompleto =
    /^\d{10}$/.test(String(form.celular || '').trim()) &&
    ['direccion', 'barrio', 'ciudad'].every(key => conTexto(form[key])) &&
    conTexto(departamentoResidencia) &&
    (!conTexto(form.correo) || isValidEmail(form.correo)) &&
    (esMenor || (
      conTexto(form.emergencia_nombre) &&
      /^\d{10}$/.test(String(form.emergencia_celular || '').trim())
    ))
  const categoriaMatricula = Array.isArray(form.categorias) ? form.categorias : []
  const matriculaCompleta = !restriccionNuevaMatricula.bloqueada && validarSeleccionCategorias({
    seleccion: categoriaMatricula,
    historial: [...histCategories],
    habilitadas: categoriasHabilitadas,
    edad,
  }).ok &&
    ['DIRECTO', 'CONVENIO'].includes(form.origen_matricula) &&
    (form.origen_matricula !== 'CONVENIO' || Boolean(form.convenio_id)) &&
    (!esMenor || (
      ['acudi_nombres', 'acudi_apellidos', 'acudi_tipo_doc', 'acudi_documento']
        .every(key => conTexto(form[key])) &&
      /^\d+$/.test(String(form.acudi_documento || '')) &&
      /^\d{10}$/.test(String(form.acudi_celular || '').trim()) &&
      (!conTexto(form.acudi_correo) || isValidEmail(form.acudi_correo))
    )) &&
    !esMenor16
  const finanzasCompletas = categoriaMatricula.length > 0 &&
    categoriaMatricula.every(cat => Number(finanzas.valores_curso?.[cat]) > 0) &&
    (!finanzas.incluye_examen_medico || Number(finanzas.valor_examen_medico) > 0)
  const estadosSecciones = {
    identificacion: {
      completo: identificacionCompleta,
      iniciado: ['documento', 'nombres', 'apellidos', 'fecha_nacimiento', 'lugar_expedicion']
        .some(key => conTexto(form[key])),
    },
    contacto: { completo: contactoCompleto, iniciado: contactoIniciado },
    complementaria: {
      completo: infoComplementaria.every(key => conTexto(form[key])),
      iniciado: infoComplementaria.some(key => conTexto(form[key])),
    },
    matricula: {
      completo: matriculaCompleta,
      iniciado: categoriaMatricula.length > 0 || form.origen_matricula === 'CONVENIO',
    },
    financiera: {
      completo: finanzasCompletas,
      iniciado: Object.values(finanzas.valores_curso || {}).some(v => conTexto(v)) ||
        finanzas.incluye_examen_medico,
    },
    runt: {
      completo: ['REGISTRADO', 'NO REGISTRADO'].includes(runtResultado),
      iniciado: Boolean(runtResultado),
    },
  }
  const ordenSecciones = ['identificacion', 'contacto', 'complementaria', 'matricula', 'financiera', 'runt']
  const seccionesCompletas = ordenSecciones.filter(key => estadosSecciones[key].completo).length
  const porcentajeAvance = Math.round(seccionesCompletas / ordenSecciones.length * 100)
  // Se mantiene el encabezado azul institucional, mientras la tarjeta
  // completada resalta suavemente sin alterar los campos internos.
  const claseTarjetaSeccion = clave =>
    `h-full overflow-hidden rounded-lg border transition-colors duration-200 ${
      estadosSecciones[clave].completo
        ? 'border-emerald-400 bg-emerald-50'
        : 'border-slate-500 bg-white'
    }`

  const etiquetaEstadoSeccion = (clave, numero, titulo) => {
    const estado = estadosSecciones[clave]
    const texto = estado.completo ? 'Completa' : estado.iniciado ? 'Incompleta' : 'Pendiente'
    const estilo = estado.completo
      ? 'border-emerald-300 bg-emerald-600 text-white'
      : estado.iniciado
        ? 'border-amber-300 bg-amber-500 text-white'
        : 'border-white/35 bg-white/10 text-white/90'
    const colorNumero = estado.completo
      ? 'bg-emerald-500 text-white'
      : estado.iniciado
        ? 'bg-orange-500 text-white'
        : 'bg-slate-100 text-[#194567]'
    return (
      <div className="flex w-full items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold ${colorNumero}`}>
            {numero}
          </span>
          <span>{titulo}</span>
        </span>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${estilo}`}>
          <i className={`fas ${estado.completo ? 'fa-check-circle' : estado.iniciado ? 'fa-exclamation-circle' : 'fa-clock'}`} aria-hidden="true"></i>
          {texto}
        </span>
      </div>
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
          rounded-lg
          shadow-lg
          p-4
          md:p-6
        "
      >

        <EncabezadoModulo
          titulo="Nueva Matrícula"
          subtitulo="Registre los datos del aprendiz, la matrícula y la verificación inicial en RUNT."
          icono={UserPlus}
          rutaRegreso="/admin/inscripciones"
          textoRegreso="Regresar"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <BotonLimpiar type="button" onClick={limpiar} disabled={saving}>
            <i className="fas fa-eraser mr-1"></i>
            Limpiar formulario
          </BotonLimpiar>
          <div className="min-w-[230px] max-w-2xl flex-1">
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-slate-700">Progreso de matrícula</span>
              <span className="font-semibold text-slate-600">{seccionesCompletas} de 6 secciones · {porcentajeAvance}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
              role="progressbar" aria-label="Secciones completas de la matrícula"
              aria-valuemin={0} aria-valuemax={6} aria-valuenow={seccionesCompletas}>
              <div className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${porcentajeAvance}%` }} />
            </div>
          </div>
        </div>

        {/* ==================================================
            CONTENIDO
        ================================================== */}

        <div
          className="
            border
            border-gray-300
            rounded-lg
            p-4
            mt-4
          "
          onKeyDown={
            manejarEnter
          }
        >

          {/* =================================================
              PASO 1
          ================================================= */}

          {(
            <div className="space-y-4">

              <div
                className="
                  grid
                  grid-cols-1
                  lg:grid-cols-3
                  gap-3
                  items-stretch
                "
              >

                {/* IDENTIFICACIÓN */}

                <div className={claseTarjetaSeccion('identificacion')}>

                  <div
                    className="px-3 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: ESTILO_SECCIONES.fondo,
                      color: ESTILO_SECCIONES.texto,
                      borderColor: ESTILO_SECCIONES.borde,
                    }}
                  >
                    {etiquetaEstadoSeccion('identificacion', 1, 'Identificación')}
                  </div>

                  <div className="p-3">

                  <div className="grid grid-cols-5 gap-2 mb-2">

                    <div className="col-span-2">

                      <label className="block text-[11px] font-semibold mb-1">
                        Tipo Doc.
                      </label>

                      <select
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.tipo_doc
                        }
                        onChange={
                          event =>
                            setF(
                              'tipo_doc',
                              event
                                .target
                                .value
                            )
                        }
                      >
                        {TIPOS_DOC.map(
                          tipo => (
                            <option
                              key={
                                tipo
                              }
                              value={
                                tipo
                              }
                            >
                              {tipo}
                            </option>
                          )
                        )}
                      </select>

                      <FieldError
                        msg={
                          errors.tipo_doc
                        }
                      />

                    </div>

                    <div className="col-span-3">

                      <label className="block text-[11px] font-semibold mb-1">
                        Número Documento
                      </label>

                      <div className="flex items-center gap-2">

                        <input
                          className="flex-1 min-w-0 border border-gray-700 rounded px-2 py-1 text-xs"
                          value={
                            documentoFmt
                          }
                          onChange={
                            handleDocumentoChange
                          }
                          inputMode="numeric"
                          placeholder="Ej: 1.234.567.890"
                        />

                        <button
                          type="button"
                          onClick={
                            buscarPorDocumento
                          }
                          disabled={
                            searching ||
                            !form.documento
                          }
                          title="Buscar historial"
                          className="
                            px-2
                            py-1
                            rounded
                            border
                            border-gray-300
                            hover:bg-gray-50
                            text-xs
                            disabled:opacity-50
                          "
                        >
                          <i
                            className={`
                              fas
                              fa-search
                              ${
                                searching
                                  ? 'animate-pulse'
                                  : ''
                              }
                            `}
                          ></i>
                        </button>

                      </div>

                      <FieldError
                        msg={
                          errors.documento
                        }
                      />

                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">

                    <CampoLugarExpedicion
                      nit={nitCatalogos}
                      value={form.lugar_expedicion}
                      onChange={nombre => setF('lugar_expedicion', nombre)}
                    />

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Género
                      </label>

                      <select
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.genero
                        }
                        onChange={
                          event =>
                            setF(
                              'genero',
                              event
                                .target
                                .value
                            )
                        }
                      >
                        {GENEROS.map(
                          genero => (
                            <option
                              key={
                                genero
                              }
                              value={
                                genero
                              }
                            >
                              {genero}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                  </div>

                  <div className="mb-2">
                    <label className="block text-[11px] font-semibold mb-1">
                      Nombres
                    </label>

                    <input
                      className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                      value={
                        form.nombres
                      }
                      onChange={
                        event =>
                          setF(
                            'nombres',
                            event
                              .target
                              .value
                          )
                      }
                    />

                    <FieldError
                      msg={
                        errors.nombres
                      }
                    />
                  </div>

                  <div className="mb-2">
                    <label className="block text-[11px] font-semibold mb-1">
                      Apellidos
                    </label>

                    <input
                      className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                      value={
                        form.apellidos
                      }
                      onChange={
                        event =>
                          setF(
                            'apellidos',
                            event
                              .target
                              .value
                          )
                      }
                    />

                    <FieldError
                      msg={
                        errors.apellidos
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Fecha Nacimiento
                    </label>

                    <input
                      type="date"
                      className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                      value={
                        form.fecha_nacimiento
                      }
                      onChange={
                        event =>
                          setF(
                            'fecha_nacimiento',
                            event
                              .target
                              .value,
                            {
                              upper:
                                false,
                            }
                          )
                      }
                    />

                    <FieldError
                      msg={
                        errors.fecha_nacimiento
                      }
                    />

                    {edad !==
                      null && (
                      <p className="mt-1 text-[11px] text-gray-500">
                        Edad:{' '}
                        <strong>
                          {edad}
                        </strong>{' '}
                        años
                      </p>
                    )}

                  </div>

                  </div>
                </div>

                {/* CONTACTO */}

                <div className={claseTarjetaSeccion('contacto')}>

                  <div
                    className="px-3 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: ESTILO_SECCIONES.fondo,
                      color: ESTILO_SECCIONES.texto,
                      borderColor: ESTILO_SECCIONES.borde,
                    }}
                  >
                    {etiquetaEstadoSeccion('contacto', 2, 'Contacto')}
                  </div>

                  <div className="p-3">

                  <div className="grid grid-cols-12 gap-2">

                    <div className="col-span-4 min-w-0">
                      <label className="block text-[11px] font-semibold mb-1">
                        Celular
                      </label>

                      <input
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.celular
                        }
                        onChange={
                          setNumeric(
                            'celular'
                          )
                        }
                        inputMode="numeric"
                      />

                      <FieldError
                        msg={
                          errors.celular
                        }
                      />
                    </div>

                    <div className="col-span-8 min-w-0">
                      <label className="block text-[11px] font-semibold mb-1">
                        Correo
                      </label>

                      <input
                        type="email"
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.correo
                        }
                        onChange={
                          event =>
                            setF(
                              'correo',
                              event
                                .target
                                .value,
                              {
                                upper:
                                  false,
                              }
                            )
                        }
                      />

                      <FieldError
                        msg={
                          errors.correo
                        }
                      />
                    </div>

                    <div className="col-span-12">
                      <label className="block text-[11px] font-semibold mb-1">
                        Dirección
                      </label>

                      <input
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.direccion
                        }
                        onChange={
                          event =>
                            setF(
                              'direccion',
                              event
                                .target
                                .value
                            )
                        }
                      />
                      <FieldError msg={errors.direccion} />
                    </div>

                    <div className="col-span-12">
                      <label className="block text-[11px] font-semibold mb-1">
                        Barrio
                      </label>

                      <input
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.barrio
                        }
                        onChange={
                          event =>
                            setF(
                              'barrio',
                              event
                                .target
                                .value
                            )
                        }
                      />
                      <FieldError msg={errors.barrio} />
                    </div>

                    <div className="col-span-6 min-w-0">
                      <CampoCatalogo
                        catalogo="departamentos"
                        busqueda
                        label="Departamento"
                        name="departamento_residencia_auxiliar"
                        value={departamentoResidencia}
                        nit={nitCatalogos}
                        required={false}
                        onOpcionesCargadas={setDepartamentosCatalogo}
                        onChange={(event) => {
                          setDepartamentoResidencia(event.target.value)
                          setF('ciudad', '')
                        }}
                      />
                      <FieldError msg={errors.departamento_residencia_auxiliar} />
                    </div>

                    <div className="col-span-6 min-w-0">
                    <CampoMunicipioBusqueda
                      className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                      nit={nitCatalogos}
                      departamentoId={departamentoId}
                      value={form.ciudad}
                      onChange={(nombre) => setF('ciudad', nombre)}
                    />
                      <FieldError msg={errors.ciudad} />
                    </div>


                    {!esMenor && (
                      <div className="col-span-12 mt-1 border-t border-gray-200 pt-2">
                        <div className="text-[11px] font-bold text-gray-700 mb-2">
                          Contacto en caso de Emergencia
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">
                              Nombre completo
                            </label>
                            <input
                              className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                              value={form.emergencia_nombre}
                              onChange={event =>
                                setF(
                                  'emergencia_nombre',
                                  event.target.value
                                )
                              }
                            />
                            <FieldError msg={errors.emergencia_nombre} />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold mb-1">
                              Celular
                            </label>
                            <input
                              className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                              value={form.emergencia_celular}
                              onChange={setNumeric('emergencia_celular')}
                              inputMode="numeric"
                            />
                            <FieldError msg={errors.emergencia_celular} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  </div>
                </div>

                {/* COMPLEMENTARIA */}

                <div className={claseTarjetaSeccion('complementaria')}>

                  <div
                    className="px-3 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: ESTILO_SECCIONES.fondo,
                      color: ESTILO_SECCIONES.texto,
                      borderColor: ESTILO_SECCIONES.borde,
                    }}
                  >
                    {etiquetaEstadoSeccion('complementaria', 3, 'Información complementaria')}
                  </div>

                  <div className="p-3">

                  <div className="grid grid-cols-2 gap-2">

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Estado civil
                      </label>

                      <select
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.estado_civil
                        }
                        onChange={
                          event =>
                            setF(
                              'estado_civil',
                              event
                                .target
                                .value
                            )
                        }
                      >
                        <option value="">
                          —
                        </option>

                        {ESTADOS_CIVIL.map(
                          value => (
                            <option
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {value}
                            </option>
                          )
                        )}
                      </select>
                      <FieldError msg={errors.estado_civil} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Ocupación
                      </label>

                      <select
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.ocupacion
                        }
                        onChange={
                          event =>
                            setF(
                              'ocupacion',
                              event
                                .target
                                .value
                            )
                        }
                      >
                        <option value="">
                          —
                        </option>

                        {OCUPACIONES.map(
                          value => (
                            <option
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {value}
                            </option>
                          )
                        )}
                      </select>
                      <FieldError msg={errors.ocupacion} />
                    </div>

                    <div>
                    <CampoCatalogo
                      compacto
                      catalogo="eps"
                      label="EPS"
                      name="eps"
                      value={form.eps}
                      nit={nitCatalogos}
                      required
                      onChange={(event) => setF('eps', event.target.value)}
                    />
                      <FieldError msg={errors.eps} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Estrato
                      </label>

                      <select
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.estrato
                        }
                        onChange={
                          event =>
                            setF(
                              'estrato',
                              event
                                .target
                                .value
                            )
                        }
                      >
                        <option value="">
                          —
                        </option>

                        {ESTRATOS.map(
                          value => (
                            <option
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {value}
                            </option>
                          )
                        )}
                      </select>
                      <FieldError msg={errors.estrato} />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold mb-1">
                        Nivel educativo
                      </label>

                      <select
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.nivel_educativo
                        }
                        onChange={
                          event =>
                            setF(
                              'nivel_educativo',
                              event
                                .target
                                .value
                            )
                        }
                      >
                        <option value="">
                          —
                        </option>

                        {NIVELES_EDU.map(
                          value => (
                            <option
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {value}
                            </option>
                          )
                        )}
                      </select>
                      <FieldError msg={errors.nivel_educativo} />
                    </div>

                  </div>

                  </div>
                </div>

              </div>

              {/* HISTORIAL */}

              {prevMatriculas.length >
                0 && (
                <div
                  className="
                    rounded-lg
                    border
                    border-gray-300
                    bg-blue-50
                    p-3
                    text-xs
                    text-blue-900
                  "
                >
                  <strong>
                    Historial de matrículas:
                  </strong>
                   <div className="my-2">
                     <button type="button"
                       onClick={() => {setRevisionAntecedentes('');setModalAntecedentes(true)}}
                       className="rounded border border-blue-500 bg-white text-blue-900 px-3 py-1 text-[11px] font-semibold">
                       Revisar matrículas anteriores
                     </button>
                   </div>
{' '}

                  {prevMatriculas.map(
                    (
                      registro,
                      index
                    ) => (
                      <span
                        key={
                          registro.id ||
                          index
                        }
                        className="mr-4"
                      >
                        {registro.consecutivo ||
                          '—'}{' '}
                        ·{' '}

                        {Array.isArray(
                          registro
                            .categorias
                        )
                          ? registro
                              .categorias
                              .join(
                                '/'
                              )
                          : registro
                              .categoria ||
                            '—'}{' '}
                      </span>
                    )
                  )}
                </div>
              )}

            </div>
          )}

          {/* =================================================
              PASO 2
          ================================================= */}

          {(
            <div className="space-y-4">

              {/* ACUDIENTE / EMERGENCIA */}

              {esMenor ? (
                <div className="mt-5 overflow-hidden rounded-lg border border-slate-500 bg-white">
                  <div
                    className="px-3 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: ESTILO_SECCIONES.fondo,
                      color: ESTILO_SECCIONES.texto,
                      borderColor: ESTILO_SECCIONES.borde,
                    }}
                  >
                    Datos del Acudiente o Representante Legal
                  </div>
                  <div className="p-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Nombres
                      </label>

                      <input
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.acudi_nombres
                        }
                        onChange={
                          event =>
                            setF(
                              'acudi_nombres',
                              event
                                .target
                                .value
                            )
                        }
                      />

                      <FieldError
                        msg={
                          errors.acudi_nombres
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Apellidos
                      </label>

                      <input
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.acudi_apellidos
                        }
                        onChange={
                          event =>
                            setF(
                              'acudi_apellidos',
                              event
                                .target
                                .value
                            )
                        }
                      />

                      <FieldError
                        msg={
                          errors.acudi_apellidos
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Tipo Doc.
                      </label>

                      <select
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.acudi_tipo_doc
                        }
                        onChange={
                          event =>
                            setF(
                              'acudi_tipo_doc',
                              event
                                .target
                                .value
                            )
                        }
                      >
                        {TIPOS_DOC.map(
                          tipo => (
                            <option
                              key={
                                tipo
                              }
                              value={
                                tipo
                              }
                            >
                              {tipo}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Documento
                      </label>

                      <input
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.acudi_documento
                        }
                        onChange={
                          setNumeric(
                            'acudi_documento'
                          )
                        }
                      />

                      <FieldError
                        msg={
                          errors.acudi_documento
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Celular
                      </label>

                      <input
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.acudi_celular
                        }
                        onChange={
                          setNumeric(
                            'acudi_celular'
                          )
                        }
                      />

                      <FieldError
                        msg={
                          errors.acudi_celular
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Dirección
                      </label>

                      <input
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.acudi_direccion
                        }
                        onChange={
                          event =>
                            setF(
                              'acudi_direccion',
                              event
                                .target
                                .value
                            )
                        }
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold mb-1">
                        Correo
                      </label>

                      <input
                        type="email"
                        className="w-full border border-gray-700 rounded px-2 py-1 text-xs"
                        value={
                          form.acudi_correo
                        }
                        onChange={
                          event =>
                            setF(
                              'acudi_correo',
                              event
                                .target
                                .value,
                              {
                                upper:
                                  false,
                              }
                            )
                        }
                      />
                      <FieldError msg={errors.acudi_correo} />
                    </div>

                  </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-3 items-stretch">
              {/* MATRÍCULA */}

              <div className={`min-w-0 ${claseTarjetaSeccion('matricula')}`}>

                <div
                  className="px-3 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: ESTILO_SECCIONES.fondo,
                    color: ESTILO_SECCIONES.texto,
                    borderColor: ESTILO_SECCIONES.borde,
                  }}
                >
                  {etiquetaEstadoSeccion('matricula', 4, 'Datos de Matrícula')}
                </div>

                <div className="p-3">

                <div
                  className="
                    grid
                    grid-cols-1
                    gap-4
                  "
                >

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Origen de matrícula *
                    </label>

                    <select
                      className="
                        w-full
                        border
                        border-gray-700
                        rounded
                        px-2
                        py-2
                        text-xs
                      "
                      value={
                        form.origen_matricula
                      }
                      onChange={
                        event => {
                          const value =
                            event
                              .target
                              .value

                          setForm(
                            prev => ({
                              ...prev,

                              origen_matricula:
                                value,

                              convenio_id:
                                value ===
                                  'CONVENIO'
                                  ? prev.convenio_id
                                  : '',

                              convenio:
                                value ===
                                  'CONVENIO'
                                  ? prev.convenio
                                  : '',
                            })
                          )

                          clrErr(
                            'origen_matricula'
                          )

                          clrErr(
                            'convenio_id'
                          )
                        }
                      }
                    >
                      <option value="DIRECTO">
                        DIRECTO
                      </option>

                      <option value="CONVENIO">
                        CONVENIO
                      </option>
                    </select>

                    <FieldError
                      msg={
                        errors.origen_matricula
                      }
                    />

                    <p className="text-[10px] text-gray-500 mt-1">
                      DIRECTO identifica al aprendiz captado por el CEA. CONVENIO identifica al aprendiz remitido por un tercero comercial.
                    </p>
                  </div>

                  <div>
                    {form.origen_matricula ===
                    'CONVENIO' ? (
                      <>
                        <label className="block text-[11px] font-semibold mb-1">
                          Convenio *
                        </label>

                        <div className="flex gap-2">

                          <select
                            className="flex-1 min-w-0 border border-gray-700 rounded px-2 py-2 text-xs"
                            value={
                              form.convenio_id
                            }
                            onChange={
                              event => {
                                const id =
                                  event
                                    .target
                                    .value

                                const seleccionado =
                                  convenios.find(
                                    item =>
                                      String(
                                        item.id
                                      ) ===
                                      String(
                                        id
                                      )
                                  )

                                setForm(
                                  prev => ({
                                    ...prev,

                                    convenio_id:
                                      id,

                                    convenio:
                                      seleccionado
                                        ? String(
                                            seleccionado
                                              .nombre ||
                                            ''
                                          ).toUpperCase()
                                        : '',
                                  })
                                )

                                clrErr(
                                  'convenio_id'
                                )
                              }
                            }
                          >
                            <option value="">
                              Seleccione...
                            </option>

                            {convenios.map(
                              convenio => (
                                <option
                                  key={
                                    convenio.id
                                  }
                                  value={
                                    convenio.id
                                  }
                                >
                                  {String(
                                    convenio.nombre ||
                                    ''
                                  ).toUpperCase()}
                                </option>
                              )
                            )}
                          </select>

                          <button
                            type="button"
                            onClick={
                              abrirNuevoConvenio
                            }
                            className="
                              shrink-0
                              bg-blue-50
                              hover:bg-blue-100
                              border
                              border-blue-300
                              text-blue-700
                              px-3
                              py-2
                              rounded
                              text-xs
                              font-semibold
                              flex
                              items-center
                              gap-1
                            "
                          >
                            <i className="fas fa-plus"></i>

                            Nuevo
                          </button>

                        </div>

                        <FieldError
                          msg={
                            errors.convenio_id
                          }
                        />

                        <p className="text-[10px] text-gray-500 mt-1">
                          Si el convenio no aparece, créelo sin salir del formulario.
                        </p>
                      </>
                    ) : (
                      <>
                        <label className="block text-[11px] font-semibold mb-1">
                          CEA de origen
                        </label>

                        <div
                          className="
                            border
                            border-emerald-200
                            bg-emerald-50
                            text-emerald-800
                            rounded
                            px-3
                            py-2
                            text-xs
                            font-semibold
                          "
                        >
                          <i className="fas fa-building mr-2"></i>

                          {String(
                            nombreEmpresaUsuario(
                              user
                            ) ||
                            'CEA'
                          ).toUpperCase()}
                        </div>

                        <p className="text-[10px] text-gray-500 mt-1">
                          Se asigna automáticamente al CEA de la sesión actual.
                        </p>
                      </>
                    )}
                  </div>

                  <div>

                    <div
                      className="
                        flex
                        flex-col
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                        gap-1
                        mb-2
                      "
                    >
                      <label className="block text-[11px] font-semibold">
                        Categoría
                      </label>


                    </div>

                    {categoriasHabilitadas.length ===
                      0 ? (
                      <div
                        className="
                          w-full
                          border
                          border-amber-200
                          bg-amber-50
                          text-amber-800
                          rounded-lg
                          px-3
                          py-2
                          text-xs
                        "
                      >
                        No se recibieron categorías habilitadas para el CEA. Verifique el nivel configurado en la base MASTER.
                      </div>
                    ) : (
                    <div className="flex flex-wrap gap-2">

                      {[...categoriasHabilitadas].sort(
                        (a, b) => CATS_TODAS.indexOf(a) - CATS_TODAS.indexOf(b)
                      ).map(
                        cat => {
                          const active =
                            form
                              .categorias
                              .includes(
                                cat
                              )

                          const allowed =
                            canSelectCat(
                              cat
                            )

                          const disabled =
                            !allowed &&
                            !active

                          return (
                            <button
                              key={
                                cat
                              }
                              type="button"
                              onClick={() =>
                                toggleCat(
                                  cat
                                )
                              }
                              disabled={
                                disabled
                              }
                              className={`
                                px-4
                                py-2
                                text-xs
                                font-bold
                                border
                                rounded-lg
                                transition
                                ${
                                  active
                                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                                    : disabled
                                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }
                              `}
                            >
                              {cat}
                            </button>
                          )
                        }
                      )}

                    </div>
                    )}

                    <FieldError
                      msg={
                        errors.categorias
                      }
                    />

                    <p className="text-[11px] text-gray-500 mt-2">
                      Máximo dos categorías. Cuando son dos, una debe ser A2.
                    </p>

                  </div>

                </div>

                </div>
              </div>



              {/* ===============================================
                  INFORMACIÓN FINANCIERA
              =============================================== */}

              <div
                className={`min-w-0 ${claseTarjetaSeccion('financiera')}`}
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: ESTILO_SECCIONES.fondo,
                    color: ESTILO_SECCIONES.texto,
                    borderColor: ESTILO_SECCIONES.borde,
                  }}
                >
                  {etiquetaEstadoSeccion('financiera', 5, 'Información Financiera')}
                </div>

                <div className="p-3 space-y-3">

                  <p className="text-xs leading-relaxed text-gray-600">
                    Defina el valor comercial realmente acordado. Aquí se crea la obligación financiera; el ingreso de dinero se registra posteriormente en Caja.
                  </p>

                  {form
                    .categorias
                    .length ===
                    0 ? (
                    <div
                      className="
                        border
                        border-dashed
                        border-gray-300
                        rounded-lg
                        p-4
                        text-xs
                        text-gray-500
                        text-center
                      "
                    >
                      Seleccione primero una categoría para definir el valor del curso.
                    </div>
                  ) : (
                    <div
                      className="
                        grid
                        grid-cols-1
                        grid-cols-1
                        gap-3
                      "
                    >
                      {form.categorias.map(
                        cat => (
                          <div
                            key={
                              cat
                            }
                            className="
                              border
                              border-gray-300
                              rounded-lg
                              p-3
                              bg-gray-50
                            "
                          >
                            <div
                              className="
                                flex
                                items-center
                                justify-between
                                gap-2
                                mb-2
                              "
                            >
                              <span className="text-xs font-bold text-gray-800">
                                Curso categoría {cat}
                              </span>

                              <span
                                className="
                                  bg-[var(--primary)]
                                  text-white
                                  text-[10px]
                                  font-bold
                                  px-2
                                  py-1
                                  rounded
                                "
                              >
                                {cat}
                              </span>
                            </div>

                            <label className="block text-[11px] font-semibold mb-1">
                              Valor acordado del curso *
                            </label>

                            <div className="relative">
                              <span
                                className="
                                  absolute
                                  left-3
                                  top-1/2
                                  -translate-y-1/2
                                  text-xs
                                  text-gray-500
                                  font-semibold
                                "
                              >
                                $
                              </span>

                              <input
                                className="
                                  w-full
                                  border
                                  border-gray-700
                                  rounded
                                  pl-7
                                  pr-2
                                  py-2
                                  text-xs
                                  font-semibold
                                "
                                value={
                                  formatMilesDigits(
                                    finanzas.valores_curso?.[cat] ||
                                    ''
                                  )
                                }
                                onChange={
                                  event =>
                                    setValorCurso(
                                      cat,
                                      event
                                        .target
                                        .value
                                    )
                                }
                                inputMode="numeric"
                                placeholder="Ej: 950.000"
                              />
                            </div>

                            <FieldError
                              msg={
                                errors[
                                  `valor_curso_${cat}`
                                ]
                              }
                            />
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div
                    className="
                      border
                      border-gray-300
                      rounded-lg
                      p-3
                    "
                  >
                    <label
                      className="
                        flex
                        items-center
                        gap-2
                        text-xs
                        font-semibold
                        cursor-pointer
                      "
                    >
                      <input
                        type="checkbox"
                        checked={
                          finanzas
                            .incluye_examen_medico
                        }
                        onChange={
                          event => {
                            const checked =
                              event
                                .target
                                .checked

                            setFinanzas(
                              prev => ({
                                ...prev,

                                incluye_examen_medico:
                                  checked,

                                valor_examen_medico:
                                  checked
                                    ? prev
                                        .valor_examen_medico
                                    : '',

                              })
                            )

                            clrErr(
                              'valor_examen_medico'
                            )
                          }
                        }
                        className="w-4 h-4"
                      />

                      Incluir examen médico en las obligaciones de esta matrícula
                    </label>

                    {finanzas
                      .incluye_examen_medico && (
                      <div
                        className="
                          grid
                          grid-cols-1
                          md:grid-cols-1
                          gap-3
                          mt-3
                        "
                      >
                        <div>
                          <label className="block text-[11px] font-semibold mb-1">
                            Valor examen médico *
                          </label>

                          <div className="relative">
                            <span
                              className="
                                absolute
                                left-3
                                top-1/2
                                -translate-y-1/2
                                text-xs
                                text-gray-500
                                font-semibold
                              "
                            >
                              $
                            </span>

                            <input
                              className="
                                w-full
                                border
                                border-gray-700
                                rounded
                                pl-7
                                pr-2
                                py-2
                                text-xs
                                font-semibold
                              "
                              value={
                                formatMilesDigits(
                                  finanzas
                                    .valor_examen_medico
                                )
                              }
                              onChange={
                                event =>
                                  setValorExamen(
                                    event
                                      .target
                                      .value
                                  )
                              }
                              inputMode="numeric"
                              placeholder="Ej: 180.000"
                            />
                          </div>

                          <FieldError
                            msg={
                              errors
                                .valor_examen_medico
                            }
                          />
                        </div>

                        {form.categorias.length >
                          0 && (
                          <div
                            className="
                              border
                              border-emerald-200
                              bg-emerald-50
                              rounded
                              px-3
                              py-2
                              text-xs
                              text-emerald-800
                            "
                          >
                            <span className="font-semibold">
                              Aplica a:
                            </span>{' '}

                            {form.categorias.join(
                              ' + '
                            )}

                            {form.categorias.length >
                              1 && (
                              <span className="block text-[10px] mt-1 text-emerald-700">
                                El valor ingresado corresponde al examen médico conjunto de las categorías seleccionadas; no se divide por matrícula.
                              </span>
                            )}
                          </div>
                        )}

                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Observaciones financieras
                    </label>

                    <textarea
                      rows={2}
                      className="
                        w-full
                        border
                        border-gray-700
                        rounded
                        px-2
                        py-2
                        text-xs
                        resize-none
                      "
                      value={
                        finanzas
                          .observaciones_financieras
                      }
                      onChange={
                        event =>
                          setFinanzas(
                            prev => ({
                              ...prev,

                              observaciones_financieras:
                                event
                                  .target
                                  .value,
                            })
                          )
                      }
                      placeholder="Opcional. Ej: descuento por pago anticipado."
                    />
                  </div>

                </div>
              </div>


              {/* ===============================================
                  VERIFICACIÓN RUNT
              =============================================== */}

              <div
                className={`min-w-0 ${claseTarjetaSeccion('runt')}`}
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: ESTILO_SECCIONES.fondo,
                    color: ESTILO_SECCIONES.texto,
                    borderColor: ESTILO_SECCIONES.borde,
                  }}
                >
                  {etiquetaEstadoSeccion('runt', 6, 'Verificación Inicial RUNT')}
                </div>

                <div className="p-3">

                  <div
                    className="
                      bg-blue-50
                      border
                      border-blue-200
                      rounded-lg
                      p-3
                      text-xs
                      text-gray-700
                      mb-4
                    "
                  >
                    Consulte al aprendiz en la página pública del RUNT y registre el resultado.
                    Esta información quedará disponible posteriormente para el funcionario
                    encargado del Control RUNT.
                  </div>

                  <div className="mt-3">
                    <label className="block text-[11px] font-semibold mb-2">
                      Resultado de la consulta RUNT (obligatorio)
                    </label>

                      <div className="grid grid-cols-1 gap-3">

                        <button
                          type="button"
                          aria-pressed={runtResultado === 'REGISTRADO'}
                          onClick={() => {
                            setRuntResultado(
                              'REGISTRADO'
                            )

                            clrErr(
                              'runtResultado'
                            )
                          }}
                          className={`
                            border
                            rounded-lg
                            p-3
                            cursor-pointer
                            text-left
                            transition
                            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700
                            ${
                              runtResultado ===
                              'REGISTRADO'
                                ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                                : 'border-gray-300 bg-white hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">

                            <div
                              className={`
                                w-7
                                h-7
                                rounded-full
                                flex
                                items-center
                                justify-center
                                ${
                                  runtResultado ===
                                  'REGISTRADO'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-500'
                                }
                              `}
                            >
                              <i className="fas fa-check"></i>
                            </div>

                            <div>
                              <div className="text-xs font-bold text-gray-800">
                                Aparece registrado
                              </div>

                              <div className="text-[10px] text-gray-500 mt-1">
                                Seleccione si aparece en la consulta RUNT.
                              </div>
                            </div>
                            <span className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${runtResultado === 'REGISTRADO' ? 'border-green-600 bg-green-600 text-white' : 'border-slate-400 bg-white'}`} aria-hidden="true">
                              {runtResultado === 'REGISTRADO' && <i className="fas fa-check text-[9px]"></i>}
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          aria-pressed={runtResultado === 'NO REGISTRADO'}
                          onClick={() => {
                            setRuntResultado(
                              'NO REGISTRADO'
                            )

                            clrErr(
                              'runtResultado'
                            )
                          }}
                          className={`
                            border
                            rounded-lg
                            p-3
                            cursor-pointer
                            text-left
                            transition
                            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700
                            ${
                              runtResultado ===
                              'NO REGISTRADO'
                                ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500'
                                : 'border-gray-300 bg-white hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">

                            <div
                              className={`
                                w-7
                                h-7
                                rounded-full
                                flex
                                items-center
                                justify-center
                                ${
                                  runtResultado ===
                                  'NO REGISTRADO'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-gray-100 text-gray-500'
                                }
                              `}
                            >
                              <i className="fas fa-exclamation"></i>
                            </div>

                            <div>
                              <div className="text-xs font-bold text-gray-800">
                                No aparece registrado
                              </div>

                              <div className="text-[10px] text-gray-500 mt-1">
                                Seleccione si no aparece en la consulta RUNT.
                              </div>
                            </div>
                            <span className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${runtResultado === 'NO REGISTRADO' ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-400 bg-white'}`} aria-hidden="true">
                              {runtResultado === 'NO REGISTRADO' && <i className="fas fa-check text-[9px]"></i>}
                            </span>
                          </div>
                        </button>

                      </div>

                      <FieldError
                        msg={errors.runtResultado}
                      />

                    </div>

                </div>
              </div>


              </div>

            </div>
          )}

          {/* =================================================
              PASO 3
          ================================================= */}

          {confirmarOpen && (
            <div
              className="
                fixed
                left-1/2
                top-6
                bottom-6
                w-[calc(100%-2rem)]
                max-w-[960px]
                -translate-x-1/2
                z-50
                overflow-y-auto
                rounded-xl
                border
                border-gray-300
                bg-white
                p-4
                md:p-5
                shadow-[0_0_0_100vmax_rgba(15,23,42,0.55)]
                space-y-4
              "
              role="dialog"
              aria-modal="true"
              aria-label="Confirmar matrícula"
            >
              <div
                className="rounded-lg px-4 py-3"
                style={{
                  backgroundColor:
                    ESTILO_SECCIONES.fondo,
                  color:
                    ESTILO_SECCIONES.texto,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">
                      Confirmar Matrícula
                    </div>
                    <div className="mt-1 text-xs opacity-90">
                      Revise toda la información antes de guardar.
                    </div>
                  </div>

                  <BotonCancelar
                    type="button"
                    onClick={() =>
                      setConfirmarOpen(
                        false
                      )
                    }
                    disabled={
                      saving
                    }
                  >
                    Cerrar
                  </BotonCancelar>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                {/* DATOS BÁSICOS */}

                <div className="border border-gray-300 rounded-lg p-3">

                  <div
                    className="rounded-t-lg px-3 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: ESTILO_SECCIONES.fondo,
                      color: ESTILO_SECCIONES.texto,
                      borderColor: ESTILO_SECCIONES.borde,
                    }}
                  >
                    Datos básicos
                  </div>

                  <div className="text-xs space-y-1">

                    <div>
                      <strong>
                        Documento:
                      </strong>{' '}

                      {form.tipo_doc}{' '}

                      {formatMilesDigits(
                        form.documento
                      )}
                    </div>

                    <div>
                      <strong>
                        Nombres:
                      </strong>{' '}

                      {form.nombres ||
                        '—'}
                    </div>

                    <div>
                      <strong>
                        Apellidos:
                      </strong>{' '}

                      {form.apellidos ||
                        '—'}
                    </div>

                    <div>
                      <strong>
                        Fecha nacimiento:
                      </strong>{' '}

                      {form.fecha_nacimiento ||
                        '—'}
                    </div>

                    <div>
                      <strong>
                        Género:
                      </strong>{' '}

                      {form.genero ||
                        '—'}
                    </div>

                  </div>

                </div>

                {/* CONTACTO */}

                <div className="border border-gray-300 rounded-lg p-3">

                  <div
                    className="rounded-t-lg px-3 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: ESTILO_SECCIONES.fondo,
                      color: ESTILO_SECCIONES.texto,
                      borderColor: ESTILO_SECCIONES.borde,
                    }}
                  >
                    Contacto
                  </div>

                  <div className="text-xs space-y-1">

                    <div>
                      <strong>
                        Celular:
                      </strong>{' '}

                      {form.celular ||
                        '—'}
                    </div>

                    <div>
                      <strong>
                        Correo:
                      </strong>{' '}

                      {form.correo ||
                        '—'}
                    </div>

                    <div>
                      <strong>
                        Dirección:
                      </strong>{' '}

                      {form.direccion ||
                        '—'}
                    </div>

                    <div>
                      <strong>
                        Ciudad:
                      </strong>{' '}

                      {form.ciudad ||
                        '—'}
                    </div>

                  </div>

                </div>

                {/* MATRÍCULA */}

                <div className="border border-gray-300 rounded-lg p-3">

                  <div
                    className="rounded-t-lg px-3 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: ESTILO_SECCIONES.fondo,
                      color: ESTILO_SECCIONES.texto,
                      borderColor: ESTILO_SECCIONES.borde,
                    }}
                  >
                    Matrícula
                  </div>

                  <div className="text-xs space-y-2">

                    <div>
                      <strong>
                        Origen:
                      </strong>{' '}

                      {form.origen_matricula ===
                      'CONVENIO'
                        ? 'CONVENIO'
                        : 'DIRECTO'}
                    </div>

                    <div>
                      <strong>
                        {form.origen_matricula ===
                        'CONVENIO'
                          ? 'Convenio:'
                          : 'CEA:'}
                      </strong>{' '}

                      {form.origen_matricula ===
                      'CONVENIO'
                        ? (
                            form.convenio ||
                            '—'
                          )
                        : String(
                            nombreEmpresaUsuario(
                              user
                            ) ||
                            'CEA'
                          ).toUpperCase()}
                    </div>

                    <div>
                      <strong>
                        Categorías:
                      </strong>

                      <div className="flex flex-wrap gap-2 mt-2">

                        {form.categorias.map(
                          categoria => (
                            <span
                              key={
                                categoria
                              }
                              className="
                                bg-[var(--primary)]
                                text-white
                                px-3
                                py-1
                                rounded
                                font-bold
                              "
                            >
                              {categoria}
                            </span>
                          )
                        )}

                      </div>
                    </div>

                  </div>

                </div>

              </div>


              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
              {/* INFORMACIÓN FINANCIERA */}

              <div
                className="
                  border
                  border-gray-300
                  rounded-lg
                  overflow-hidden
                "
              >
                <div
                  className="px-3 py-1.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor: ESTILO_SECCIONES.fondo,
                    color: ESTILO_SECCIONES.texto,
                    borderColor: ESTILO_SECCIONES.borde,
                  }}
                >
                  Información Financiera
                </div>

                <div
                  className="
                    p-2
                    grid
                    grid-cols-1
                    grid-cols-1
                    gap-2
                  "
                >
                  {form.categorias.map(
                    cat => (
                      <div
                        key={
                          cat
                        }
                        className="
                          border
                          border-gray-300
                          rounded-lg
                          p-2
                        "
                      >
                        <div className="text-[9px] text-gray-500 uppercase">
                          Curso {cat}
                        </div>

                        <div className="text-[11px] font-bold text-gray-900 mt-0.5">
                          {formatMoneda(
                            finanzas.valores_curso?.[cat] ||
                            0
                          )}
                        </div>
                      </div>
                    )
                  )}

                  {finanzas
                    .incluye_examen_medico && (
                    <div
                      className="
                        border
                        border-gray-300
                        rounded-lg
                        p-2
                      "
                    >
                      <div className="text-[9px] text-gray-500 uppercase">
                        Examen Médico
                      </div>

                      <div className="text-[11px] font-bold text-gray-900 mt-0.5">
                        {formatMoneda(
                          finanzas
                            .valor_examen_medico
                        )}
                      </div>

                      <div className="text-[9px] text-gray-500 mt-0.5">
                        Aplica a{' '}

                        <strong>
                          {form.categorias.join(
                            ' + '
                          ) ||
                            '—'}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div
                    className="
                      border
                      border-blue-200
                      bg-blue-50
                      rounded-lg
                      p-2
                    "
                  >
                    <div className="text-[9px] text-blue-700 uppercase">
                      Total obligaciones iniciales
                    </div>

                    <div className="text-[11px] font-bold text-blue-900 mt-0.5">
                      {formatMoneda(
                        form.categorias.reduce(
                          (
                            total,
                            cat
                          ) =>
                            total +
                            Number(
                              finanzas.valores_curso?.[cat] ||
                              0
                            ),
                          0
                        ) +
                        (
                          finanzas
                            .incluye_examen_medico
                            ? Number(
                                finanzas
                                  .valor_examen_medico ||
                                0
                              )
                            : 0
                        )
                      )}
                    </div>
                  </div>

                  {finanzas
                    .observaciones_financieras && (
                    <div
                      className="
                        col-span-1
                        border
                        border-gray-200
                        rounded-lg
                        p-2
                        text-[11px]
                        text-gray-600
                      "
                    >
                      <strong>
                        Observaciones:
                      </strong>{' '}

                      {finanzas
                        .observaciones_financieras}
                    </div>
                  )}
                </div>
              </div>

              {/* RUNT CONFIRMACIÓN */}

              <div className="border border-gray-300 rounded-lg overflow-hidden">

                <div
                  className="px-3 py-1.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor: ESTILO_SECCIONES.fondo,
                    color: ESTILO_SECCIONES.texto,
                    borderColor: ESTILO_SECCIONES.borde,
                  }}
                >
                  <i className="fas fa-road mr-2"></i>

                  Verificación Inicial RUNT
                </div>

                <div className="p-2">

                  {runtResultado ? (
                    <div
                      className={`
                        border
                        rounded-lg
                        p-2
                        ${
                          runtResultado ===
                          'REGISTRADO'
                            ? 'bg-green-50 border-green-300'
                            : 'bg-amber-50 border-amber-300'
                        }
                      `}
                    >
                      <div className="text-[11px] text-gray-600">
                        Estado
                      </div>

                      <div className="font-bold text-[11px] mt-0.5">
                        VERIFICADO
                      </div>

                      <div className="text-[11px] text-gray-600 mt-0.5">
                        Resultado
                      </div>

                      <div
                        className={`
                          font-bold
                          text-[11px]
                          mt-0.5
                          ${
                            runtResultado ===
                            'REGISTRADO'
                              ? 'text-green-700'
                              : 'text-amber-700'
                          }
                        `}
                      >
                        {runtResultado ===
                        'REGISTRADO'
                          ? 'APARECE REGISTRADO EN RUNT'
                          : 'NO APARECE REGISTRADO EN RUNT'}
                      </div>

                      <div className="text-[11px] text-gray-600 mt-0.5">
                        Verificado por
                      </div>

                      <div className="font-semibold text-[11px] mt-0.5">
                        {nombreUsuario(
                          user
                        ) ||
                          '—'}
                      </div>

                    </div>
                  ) : (
                    <div
                      className="
                        bg-amber-50
                        border
                        border-amber-300
                        rounded-lg
                        p-2
                      "
                    >
                      <div className="font-bold text-[11px] text-amber-700">
                        PENDIENTE DE VERIFICACIÓN RUNT
                      </div>

                      <p className="text-[11px] text-gray-600 mt-0.5">
                        La matrícula puede guardarse, pero aparecerá como pendiente en el módulo Control RUNT.
                      </p>
                    </div>
                  )}

                </div>

              </div>


              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
                <BotonCancelar
                  type="button"
                  onClick={() =>
                    setConfirmarOpen(
                      false
                    )
                  }
                  disabled={
                    saving
                  }
                >
                  Volver a editar
                </BotonCancelar>

                <BotonGuardar
                  type="button"
                  onClick={
                    guardar
                  }
                  disabled={
                    saving
                  }
                >
                  <i className="fas fa-save mr-1"></i>
                  {saving
                    ? 'Guardando...'
                    : form.categorias.length > 1
                      ? `Confirmar y guardar ${form.categorias.length} matrículas`
                      : 'Confirmar y guardar matrícula'}
                </BotonGuardar>
              </div>

            </div>
          )}

        </div>

        {/* ==================================================
            ACCIONES DEL FORMULARIO
        ================================================== */}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <BotonLimpiar
            type="button"
            onClick={
              limpiar
            }
            disabled={
              saving
            }
          >
            <i className="fas fa-eraser mr-1"></i>
            Limpiar
          </BotonLimpiar>

          <BotonGuardar
            type="button"
            onClick={
              abrirConfirmacion
            }
            disabled={
              saving
            }
          >
            <i className="fas fa-clipboard-check mr-1"></i>
            Revisar y confirmar
          </BotonGuardar>
        </div>

      </div>
      {/* Modal de creación rápida de convenio: conserva la matrícula diligenciada. */}
      {drawerConvenio && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/40 p-3 sm:p-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingConvenio) {
              setDrawerConvenio(false)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-nuevo-convenio"
            className="flex w-full max-w-[620px] max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            style={{ border: `1px solid ${ESTILO_CELDAS_TABLA.borde}` }}
          >
            <FranjaSuperiorModal className="flex shrink-0 items-start justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/75">Matrícula</p>
                <h2 id="titulo-nuevo-convenio" className="mt-1 text-base font-bold">Nuevo Convenio</h2>
                <p className="mt-1 text-[11px] text-white/80">
                  Regístrelo sin perder la información diligenciada del aprendiz.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar nuevo convenio"
                title="Cerrar"
                disabled={savingConvenio}
                onClick={() => setDrawerConvenio(false)}
                className="shrink-0 rounded-md p-2 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </FranjaSuperiorModal>

            <div className="space-y-3 overflow-y-auto p-4">
              <div>
                <label htmlFor="convenio-rapido-nombre" className="mb-1 block text-[11px] font-semibold">Nombre del convenio *</label>
                <input
                  id="convenio-rapido-nombre"
                  autoFocus
                  className="w-full rounded-md border px-3 py-2 text-xs"
                  style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}
                  value={formConvenio.nombre}
                  onChange={(event) => setFormConvenio((prev) => ({
                    ...prev, nombre: event.target.value.toUpperCase(),
                  }))}
                  placeholder="Ej: EMPRESA XYZ"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="convenio-rapido-documento" className="mb-1 block text-[11px] font-semibold">Documento / NIT</label>
                  <input
                    id="convenio-rapido-documento"
                    className="w-full rounded-md border px-3 py-2 text-xs"
                    style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}
                    value={formConvenio.documento}
                    onChange={(event) => setFormConvenio((prev) => ({
                      ...prev, documento: event.target.value,
                    }))}
                  />
                </div>
                <div>
                  <label htmlFor="convenio-rapido-celular" className="mb-1 block text-[11px] font-semibold">Celular</label>
                  <input
                    id="convenio-rapido-celular"
                    inputMode="numeric"
                    className="w-full rounded-md border px-3 py-2 text-xs"
                    style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}
                    value={formConvenio.celular}
                    onChange={(event) => setFormConvenio((prev) => ({
                      ...prev, celular: soloDigitos(event.target.value),
                    }))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="convenio-rapido-direccion" className="mb-1 block text-[11px] font-semibold">Dirección</label>
                <input
                  id="convenio-rapido-direccion"
                  className="w-full rounded-md border px-3 py-2 text-xs"
                  style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}
                  value={formConvenio.direccion}
                  onChange={(event) => setFormConvenio((prev) => ({
                    ...prev, direccion: event.target.value.toUpperCase(),
                  }))}
                />
              </div>

              <div>
                <label htmlFor="convenio-rapido-correo" className="mb-1 block text-[11px] font-semibold">Correo electrónico</label>
                <input
                  id="convenio-rapido-correo"
                  type="email"
                  className="w-full rounded-md border px-3 py-2 text-xs"
                  style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}
                  value={formConvenio.correo}
                  onChange={(event) => setFormConvenio((prev) => ({
                    ...prev, correo: event.target.value.toLowerCase(),
                  }))}
                />
              </div>

              <p className="text-[11px] text-slate-600">
                Al guardar, el convenio se agregará a la lista y quedará seleccionado automáticamente.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t px-4 py-3" style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}>
              <BotonCancelar type="button" disabled={savingConvenio} onClick={() => setDrawerConvenio(false)}>
                <i className="fas fa-times" aria-hidden="true"></i> Cancelar
              </BotonCancelar>
              <BotonGuardar type="button" onClick={crearConvenioRapido} disabled={savingConvenio}>
                {savingConvenio ? (
                  <><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Guardando...</>
                ) : (
                  <><i className="fas fa-save" aria-hidden="true"></i> Guardar convenio</>
                )}
              </BotonGuardar>
            </div>
          </div>
        </div>
      )}

      {/* Revisión previa de antecedentes: no solicita la tabla de continuaciones. */}
      {modalAntecedentes && prevMatriculas.length > 0 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
          role="dialog" aria-modal="true" aria-label="Revisar matrículas anteriores">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-[#173A57] text-white p-4">
              <h3 className="font-bold text-sm">El aprendiz ya tiene matrículas registradas</h3>
              <button type="button" onClick={()=>setModalAntecedentes(false)}
                className="border border-white/40 rounded px-2 py-1" aria-label="Cerrar">✕</button>
            </div>
            <div className="space-y-3 p-4 text-xs max-h-[75vh] overflow-auto">
              <p>Se encontraron antecedentes para el documento <strong>{form.documento}</strong>. Tener una matrícula anterior no significa que esté vencida.</p>
              <div className="border rounded-lg overflow-hidden">
                {prevMatriculas.map((item)=>(
                  <div key={item.id} className="border-b last:border-0 p-3 flex flex-wrap gap-3 justify-between">
                    <div>
                      <strong>{item.consecutivo || 'Sin consecutivo'}</strong>
                      <span className="ml-3">{Array.isArray(item.categorias) ? item.categorias.join(' / ') : item.categoria || 'Sin categoría'}</span>
                    </div>
                    <div className="text-slate-600">{item.fecha_matricula || 'Fecha sin verificar'}</div>
                  </div>
                ))}
              </div>
              {restriccionNuevaMatricula.bloqueada ? (
                <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">
                  <strong>No es posible generar una nueva matrícula.</strong>
                  <p className="mt-1">Existen matrículas anteriores sin certificación RUNT confirmada. Debe consultar el expediente y terminar el proceso correspondiente. Un cambio de categoría o retractación requiere revisión administrativa y no debe crear una segunda matrícula.</p>
                  {!!restriccionNuevaMatricula.pendientes?.length && (
                    <p className="mt-2 font-semibold">Pendientes: {restriccionNuevaMatricula.pendientes.map(item => (item.consecutivo || 'Sin consecutivo') + ' (' + (item.categorias || []).join('/') + ')').join(' · ')}</p>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">
                  Las matrículas anteriores tienen certificación RUNT registrada. Puede revisar la categoría siguiente permitida por su historial y por el nivel del CEA.
                </p>
              )}
              <p className="font-semibold">¿Qué necesita realizar el CEA?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button type="button"
                  className={`text-left rounded-lg border p-3 ${revisionAntecedentes==='otra'?'border-blue-600 bg-blue-50':'border-slate-300'}`}
                  disabled={restriccionNuevaMatricula.bloqueada}
                  onClick={()=>setRevisionAntecedentes('otra')}>
                  <strong>Inscribir otra categoría</strong>
                  <p className="text-[11px] mt-1">{restriccionNuevaMatricula.bloqueada ? 'No disponible hasta confirmar la certificación de todos los procesos anteriores.' : 'Conservar el historial y aplicar las reglas de progresión, edad y nivel.'}</p>
                </button>
                <button type="button"
                  className={`text-left rounded-lg border p-3 ${revisionAntecedentes==='misma'?'border-blue-600 bg-blue-50':'border-slate-300'}`}
                  onClick={()=>setRevisionAntecedentes('misma')}>
                  <strong>Revisar un curso inconcluso</strong>
                  <p className="text-[11px] mt-1">Determinar con soportes si procede una continuación, sin crear otra matrícula.</p>
                </button>
              </div>
              {revisionAntecedentes==='otra' && !restriccionNuevaMatricula.bloqueada && (
                <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p>Puede continuar el formulario de inscripción con <strong>una categoría nueva permitida</strong>. Las categorías anteriores permanecerán bloqueadas.</p>
                  <button type="button" onClick={()=>setModalAntecedentes(false)}
                    className="bg-[#173A57] text-white rounded-lg px-4 py-2">Continuar inscripción de otra categoría</button>
                </div>
              )}
              {revisionAntecedentes==='misma' && (
                <div className="space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <strong>Revisión administrativa necesaria</strong>
                  <p>Antes de registrar una continuación debemos verificar que el curso no esté finalizado, comprobar el término aplicable y determinar si RUNT/SICOV/SIET permiten continuar el proceso original.</p>
                  <p>Para continuar un proceso vencido sin crear una nueva matrícula, abra el expediente del aprendiz desde Inscripciones. Allí puede registrar la continuación administrativa, conservando el consecutivo original. El nuevo proceso se gestiona posteriormente en Control RUNT, previa verificación de ausencia de certificación.</p>
                  <button type="button" onClick={() => router.push('/admin/inscripciones')}
                    className="rounded bg-[#173A57] px-3 py-2 font-semibold text-white">
                    Ir a Inscripciones y consultar expediente
                  </button>
                </div>
              )}
              <div className="flex justify-end">
                <button type="button" className="border rounded-lg px-3 py-2"
                  onClick={()=>setModalAntecedentes(false)}>Cerrar revisión</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}