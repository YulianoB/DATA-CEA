// app/admin/personal/page.jsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { IdCard, Plus, Search, X, Users, Eraser, Save, Ban, ShieldCheck, ClipboardCheck, BookOpen, CarFront, CheckCircle2 } from 'lucide-react'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import CampoCatalogo from '@/components/admin/CampoCatalogo'
import { FranjaSuperiorModal, FranjaSecundariaModal, MarcoTabla, BotonAgregar, BotonLimpiar, BotonCancelar, BotonGuardar, ESTILO_CONTENEDORES, ESTILO_CELDAS_TABLA } from '@/components/admin/EstiloModulo'
import { Toaster, toast } from 'sonner'

// ============================================================
// ROLES
// ============================================================

const ROLES = [
  {
    value: 'ADMINISTRATIVO',
    label: 'Administrativo',
    menu: 'menu_administrativo',
  },
  {
    value: 'AUXILIAR_ADMINISTRATIVO',
    label: 'Auxiliar administrativo',
    menu: 'menu_basico',
  },
  {
    value: 'INSTRUCTOR_TEORIA',
    label: 'Instructor teoría',
    menu: 'menu_basico',
  },
  {
    value: 'INSTRUCTOR_PRACTICA',
    label: 'Instructor práctica',
    menu: 'menu_instructor_practica',
  },
]

const DESCRIPCIONES_ROLES = {
  ADMINISTRATIVO: 'Acceso a los módulos de registro, consulta, gestión y seguimiento operativo del CEA, incluyendo matrículas, caja, programación de clases, personal, vehículos y demás procesos administrativos autorizados.',
  AUXILIAR_ADMINISTRATIVO: 'Registro de entrada y salida de la jornada laboral, así como de asistencia a reuniones y capacitaciones.',
  INSTRUCTOR_TEORIA: 'Registro de entrada y salida de la jornada laboral, así como de asistencia a reuniones y capacitaciones.',
  INSTRUCTOR_PRACTICA: 'Acceso a programación de clases prácticas, registro de horarios, inspecciones preoperacionales, mantenimientos, siniestros viales, fallas en ruta y actualización de documentos.',
}

const ICONOS_ROLES = {
  ADMINISTRATIVO: ShieldCheck,
  AUXILIAR_ADMINISTRATIVO: ClipboardCheck,
  INSTRUCTOR_TEORIA: BookOpen,
  INSTRUCTOR_PRACTICA: CarFront,
}

// ============================================================
// CATÁLOGOS
// ============================================================

const TIPOS_SANGRE = [
  'O+',
  'O-',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
]

const ESCOLARIDADES = [
  ['BACHILLER', 'Bachiller'],
  ['TECNICO', 'Técnico'],
  ['TECNOLOGO', 'Tecnólogo'],
  ['PREGRADO', 'Pregrado'],
  ['POSGRADO', 'Posgrado'],
]

const EPS_COLOMBIA = [
  ['NINGUNA', 'Ninguna'],
  ['ALIANSALUD EPS', 'Aliansalud EPS'],
  ['ASMET SALUD EPS', 'Asmet Salud EPS'],
  ['CAJACOPI EPS', 'Cajacopi EPS'],
  ['CAPITAL SALUD EPS', 'Capital Salud EPS'],
  ['COMPENSAR EPS', 'Compensar EPS'],
  ['COOSALUD EPS', 'Coosalud EPS'],
  ['EPS FAMISANAR', 'EPS Famisanar'],
  ['EPS SANITAS', 'EPS Sanitas'],
  ['MUTUAL SER EPS', 'Mutual Ser EPS'],
  ['NUEVA EPS', 'Nueva EPS'],
  ['SALUD TOTAL EPS', 'Salud Total EPS'],
  ['SAVIA SALUD EPS', 'Savia Salud EPS'],
  [
    'SERVICIO OCCIDENTAL DE SALUD EPS SOS',
    'Servicio Occidental de Salud EPS SOS',
  ],
  ['SURA EPS', 'Sura EPS'],
  ['OTRA', 'Otra'],
]

const ARL_COLOMBIA = [
  ['NINGUNA', 'Ninguna'],
  ['ARL SURA', 'ARL Sura'],
  ['POSITIVA', 'Positiva'],
  ['COLMENA SEGUROS', 'Colmena Seguros'],
  ['SEGUROS BOLIVAR', 'Seguros Bolívar'],
  ['AXA COLPATRIA', 'AXA Colpatria'],
  ['SEGUROS ALFA', 'Seguros Alfa'],
  ['LA EQUIDAD SEGUROS', 'La Equidad Seguros'],
  ['MAPFRE', 'Mapfre'],
  ['LIBERTY SEGUROS', 'Liberty Seguros'],
  ['OTRA', 'Otra'],
]

const FONDOS_PENSION = [
  ['NINGUNO', 'Ninguno'],
  ['COLPENSIONES', 'Colpensiones'],
  ['PORVENIR', 'Porvenir'],
  ['PROTECCION', 'Protección'],
  ['COLFONDOS', 'Colfondos'],
  ['SKANDIA', 'Skandia'],
  ['OTRO', 'Otro'],
]

const MEDIOS_TRANSPORTE = [
  ['BICICLETA', 'Bicicleta'],
  ['TRANSPORTE PUBLICO', 'Transporte público'],
  [
    'VEHICULO PROPIO MOTOCICLETA',
    'Vehículo propio - Motocicleta',
  ],
  [
    'VEHICULO PROPIO AUTOMOVIL',
    'Vehículo propio - Automóvil',
  ],
  [
    'VEHICULO DE LA EMPRESA MOTOCICLETA',
    'Vehículo de la empresa - Motocicleta',
  ],
  [
    'VEHICULO DE LA EMPRESA AUTOMOVIL',
    'Vehículo de la empresa - Automóvil',
  ],
  ['A PIE', 'A pie'],
]

const TIPOS_VEHICULO_ROL = [
  'MOTOCICLETA',
  'AUTOMÓVIL',
  'CAMIÓN',
]

// ============================================================
// CATEGORÍAS
// ============================================================
//
// A2 es independiente.
//
// Solo puede existir UNA de estas:
// B1
// B1-C1
// B2-C2
// B3-C3
//
// Combinaciones válidas:
//
// A2
// B1
// B1-C1
// B2-C2
// B3-C3
//
// A2 + B1
// A2 + B1-C1
// A2 + B2-C2
// A2 + B3-C3
//
// ============================================================

const CATEGORIA_A2 = 'A2'

const CATEGORIAS_BC = [
  'B1',
  'B1-C1',
  'B2-C2',
  'B3-C3',
]

const CATEGORIAS_LICENCIA = [
  CATEGORIA_A2,
  ...CATEGORIAS_BC,
]

// ============================================================
// CAMPOS
// ============================================================

const CAMPOS_NUMERICOS = new Set([
  'documento',
  'telefono',
  'contacto_emergencia_telefono',
  'numero_hijos',
])

const CAMPOS_MAYUSCULAS = new Set([
  'nombres',
  'apellidos',
  'direccion',
  'profesion',
  'nacionalidad',
  'departamento_residencia',
  'ciudad_residencia',
  'cargo',
  'contacto_emergencia_nombre',
  'contacto_emergencia_parentesco',
  'observaciones',
])

// ============================================================
// FORMULARIO INICIAL
// ============================================================

const INITIAL_FORM = {
  tipo_personal: 'contratista',
  tipo_documento: 'CC',
  documento: '',
  nombres: '',
  apellidos: '',
  fecha_nacimiento: '',
  genero: '',
  tipo_sangre: '',
  estado_civil: '',
  escolaridad: '',
  profesion: '',
  nacionalidad: 'COLOMBIANA',
  departamento_residencia: '',
  ciudad_residencia: '',
  direccion: '',
  telefono: '',
  email: '',
  cargo: '',
  grupo_personal: 'operativo',
  tipo_contrato: 'prestacion_servicios',
  tipo_permanencia: 'permanente',
  fecha_vinculacion: '',
  fecha_retiro: '',
  eps: '',
  arl: '',
  fondo_pension: '',
  numero_hijos: '',
  contacto_emergencia_nombre: '',
  contacto_emergencia_parentesco: '',
  contacto_emergencia_telefono: '',
  medio_transporte_trabajo: '',
  rol_conductor_instructor: false,
  tipo_vehiculo_rol: [],
  observaciones: '',
}

// ============================================================
// HELPERS
// ============================================================

function limpiarTexto(value) {
  return String(value || '').trim()
}

function normalizarDocumento(value) {
  return limpiarTexto(value)
    .replace(/\D/g, '')
}

function esCorreoValido(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || '').trim()
  )
}

function certificadoVacio(
  categoria = ''
) {
  return {
    categoria,
    numero_certificado: '',
    vigencia: '',
  }
}

function licenciaConduccionVacia(
  categoria = ''
) {
  return {
    categoria,
    vigencia: '',
  }
}

// ============================================================
// VALIDAR COMBINACIONES
// ============================================================

function categoriasLicenciaValidas(
  categorias
) {
  const limpias =
    Array.isArray(categorias)
      ? categorias.filter(Boolean)
      : []

  if (
    limpias.length === 0
  ) {
    return true
  }

  const unicas = [
    ...new Set(limpias),
  ]

  if (
    unicas.length !==
    limpias.length
  ) {
    return false
  }

  if (
    !limpias.every(
      (categoria) =>
        CATEGORIAS_LICENCIA.includes(
          categoria
        )
    )
  ) {
    return false
  }

  // Máximo:
  // A2 + una categoría B/C.
  if (
    limpias.length > 2
  ) {
    return false
  }

  if (
    limpias.length === 1
  ) {
    return true
  }

  // Si hay dos categorías,
  // obligatoriamente una debe ser A2.
  if (
    !limpias.includes(
      CATEGORIA_A2
    )
  ) {
    return false
  }

  const categoriasBCSeleccionadas =
    limpias.filter(
      (categoria) =>
        CATEGORIAS_BC.includes(
          categoria
        )
    )

  return (
    categoriasBCSeleccionadas.length === 1
  )
}

// ============================================================
// MENSAJE REGLA CATEGORÍAS
// ============================================================

const MENSAJE_CATEGORIAS =
  'Solo se permite A2 de forma independiente o A2 combinada con una sola categoría entre B1, B1-C1, B2-C2 o B3-C3.'

// ============================================================
// COMPONENTE
// ============================================================

export default function PersonalAdminPage() {
  const router = useRouter()

  const [
    user,
    setUser,
  ] = useState(null)

  const [
    empresa,
    setEmpresa,
  ] = useState(null)

  const [
    empresaNit,
    setEmpresaNit,
  ] = useState('')

  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM
  )

  const [departamentosCatalogo, setDepartamentosCatalogo] = useState([])
  const departamentoId = departamentosCatalogo.find(
    (item) => item.nombre === form.departamento_residencia
  )?.id || null

  const onChangeDepartamento = (event) => {
    const nombre = event.target.value
    setForm((prev) => ({ ...prev, departamento_residencia: nombre, ciudad_residencia: '' }))
  }

  const [
    rolesSeleccionados,
    setRolesSeleccionados,
  ] = useState([])

  const [
    crearAcceso,
    setCrearAcceso,
  ] = useState(true)

  const [
    certificadosInstructor,
    setCertificadosInstructor,
  ] = useState([])

  const [
    licenciasConduccion,
    setLicenciasConduccion,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    cargandoListado,
    setCargandoListado,
  ] = useState(false)

  const [
    personal,
    setPersonal,
  ] = useState([])

  const [
    busqueda,
    setBusqueda,
  ] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const cerrarFormulario = () => {
    if (loading) return
    setMostrarFormulario(false)
    setForm(INITIAL_FORM)
    setRolesSeleccionados([])
    setCrearAcceso(true)
    setCertificadosInstructor([])
    setLicenciasConduccion([])
  }

  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(() => {
    const storedUser =
      localStorage.getItem(
        'currentUser'
      )

    if (!storedUser) {
      router.push('/login')
      return
    }

    const parsedUser =
      JSON.parse(
        storedUser
      )

    const nitSesion =
      localStorage.getItem(
        'currentEmpresaNit'
      ) ||
      parsedUser?.nitEmpresa ||
      parsedUser?.empresa?.nit ||
      ''

    if (!nitSesion) {
      toast.error(
        'No se encontró el CEA de la sesión. Inicie sesión nuevamente.'
      )

      router.push('/login')
      return
    }

    setUser(
      parsedUser
    )

    setEmpresaNit(
      nitSesion
    )

    cargarEmpresa(
      nitSesion
    )

    cargarListado(
      nitSesion
    )
  }, [router])

  // ==========================================================
  // EMPRESA
  // ==========================================================

  const nombreEmpresa =
    empresa?.nombre ||
    'CEA activo'

  // ==========================================================
  // FILTRAR PERSONAL
  // ==========================================================

  const personalFiltrado =
    useMemo(() => {
      const texto =
        busqueda
          .toLowerCase()
          .trim()

      if (!texto) {
        return personal
      }

      return personal.filter(
        (item) => {
          const nombreCompleto =
            `${item.nombres || ''} ${
              item.apellidos || ''
            }`.trim()

          const roles =
            (
              item.perfiles ||
              []
            )
              .map(
                (perfil) =>
                  perfil.rol
              )
              .join(' ')

          return [
            item.documento,
            nombreCompleto,
          ].some(
            (value) =>
              String(
                value || ''
              )
                .toLowerCase()
                .includes(
                  texto
                )
          )
        }
      )
    }, [
      personal,
      busqueda,
    ])

  // ==========================================================
  // NIT
  // ==========================================================

  const obtenerNitSesion =
    () =>
      empresaNit ||
      localStorage.getItem(
        'currentEmpresaNit'
      ) ||
      user?.nitEmpresa ||
      ''

  // ==========================================================
  // CARGAR EMPRESA
  // ==========================================================

  const cargarEmpresa =
    async (nitParam) => {
      const nit =
        nitParam ||
        obtenerNitSesion()

      if (!nit) {
        toast.error(
          'No se recibió el NIT del CEA.'
        )
        return
      }

      try {
        const response =
          await fetch(
            `/api/empresas/${encodeURIComponent(
              nit
            )}`
          )

        const result =
          await response.json()

        if (
          !response.ok ||
          result.status !==
            'success'
        ) {
          toast.error(
            result.message ||
              'No fue posible cargar el CEA activo.'
          )
          return
        }

        setEmpresa(
          result.empresa
        )
      } catch (error) {
        console.error(
          'Error cargando empresa:',
          error
        )

        toast.error(
          'No fue posible cargar el CEA activo.'
        )
      }
    }

  // ==========================================================
  // CARGAR LISTADO
  // ==========================================================

  const cargarListado =
    async (nitParam) => {
      const nit =
        nitParam ||
        obtenerNitSesion()

      if (!nit) {
        toast.error(
          'No se recibió el NIT del CEA.'
        )
        return
      }

      setCargandoListado(
        true
      )

      try {
        const response =
          await fetch(
            `/api/personal?nit=${encodeURIComponent(
              nit
            )}`
          )

        const result =
          await response.json()

        if (
          !response.ok ||
          result.status !==
            'success'
        ) {
          toast.error(
            result.message ||
              'No fue posible cargar el listado de personal.'
          )
          return
        }

        setPersonal(
          result.personal ||
          []
        )
      } catch (error) {
        console.error(
          'Error cargando personal:',
          error
        )

        toast.error(
          'No fue posible cargar el listado de personal.'
        )
      } finally {
        setCargandoListado(
          false
        )
      }
    }

  // ==========================================================
  // CAMBIOS FORMULARIO
  // ==========================================================

  const onChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } =
      event.target

    let nuevoValor =
      type === 'checkbox'
        ? checked
        : value

    if (
      CAMPOS_NUMERICOS.has(
        name
      )
    ) {
      nuevoValor =
        value.replace(
          /\D/g,
          ''
        )
    } else if (
      name === 'email'
    ) {
      nuevoValor =
        value
          .trim()
          .toLowerCase()
    } else if (
      CAMPOS_MAYUSCULAS.has(
        name
      )
    ) {
      nuevoValor =
        value.toUpperCase()
    }

    setForm(
      (prev) => ({
        ...prev,
        [name]:
          nuevoValor,
      })
    )

    // ========================================================
    // SI DESMARCA ROL INSTRUCTOR
    // LIMPIAR INFORMACIÓN ASOCIADA
    // ========================================================

    if (
      name ===
        'rol_conductor_instructor' &&
      checked === false
    ) {
      setCertificadosInstructor(
        []
      )

      setLicenciasConduccion(
        []
      )

      setForm(
        (prev) => ({
          ...prev,

          rol_conductor_instructor:
            false,

          tipo_vehiculo_rol:
            [],
        })
      )
    }
  }

  // ==========================================================
  // ROLES
  // ==========================================================

  const toggleRol = (
    rol
  ) => {
    setRolesSeleccionados(
      (prev) =>
        prev.includes(rol)
          ? prev.filter(
              (item) =>
                item !== rol
            )
          : [
              ...prev,
              rol,
            ]
    )
  }

  // ==========================================================
  // TIPOS VEHÍCULO
  // ==========================================================

  const toggleTipoVehiculoRol =
    (tipo) => {
      setForm(
        (prev) => {
          const actuales =
            Array.isArray(
              prev.tipo_vehiculo_rol
            )
              ? prev.tipo_vehiculo_rol
              : []

          const nuevo =
            actuales.includes(
              tipo
            )
              ? actuales.filter(
                  (item) =>
                    item !==
                    tipo
                )
              : [
                  ...actuales,
                  tipo,
                ]

          return {
            ...prev,

            tipo_vehiculo_rol:
              nuevo,
          }
        }
      )
    }

  // ==========================================================
  // CERTIFICADO INSTRUCTOR
  // ==========================================================

  const toggleCategoriaInstructor =
    (categoria) => {
      setCertificadosInstructor(
        (prev) => {
          const existe =
            prev.some(
              (item) =>
                item.categoria ===
                categoria
            )

          const nuevo =
            existe
              ? prev.filter(
                  (item) =>
                    item.categoria !==
                    categoria
                )
              : [
                  ...prev,

                  certificadoVacio(
                    categoria
                  ),
                ]

          const categorias =
            nuevo.map(
              (item) =>
                item.categoria
            )

          if (
            !categoriasLicenciaValidas(
              categorias
            )
          ) {
            toast.warning(
              MENSAJE_CATEGORIAS
            )

            return prev
          }

          return nuevo
        }
      )
    }

  const actualizarCertificadoInstructor =
    (
      categoria,
      campo,
      valor
    ) => {
      setCertificadosInstructor(
        (prev) =>
          prev.map(
            (item) =>
              item.categoria ===
              categoria
                ? {
                    ...item,

                    [campo]:
                      campo ===
                      'numero_certificado'
                        ? valor.toUpperCase()
                        : valor,
                  }
                : item
          )
      )
    }

  // ==========================================================
  // LICENCIA CONDUCCIÓN
  // ==========================================================
  //
  // IMPORTANTE:
  // Usa EXACTAMENTE la misma regla del certificado.
  //
  // ==========================================================

  const toggleCategoriaConduccion =
    (categoria) => {
      setLicenciasConduccion(
        (prev) => {
          const existe =
            prev.some(
              (item) =>
                item.categoria ===
                categoria
            )

          const nuevo =
            existe
              ? prev.filter(
                  (item) =>
                    item.categoria !==
                    categoria
                )
              : [
                  ...prev,

                  licenciaConduccionVacia(
                    categoria
                  ),
                ]

          const categorias =
            nuevo.map(
              (item) =>
                item.categoria
            )

          if (
            !categoriasLicenciaValidas(
              categorias
            )
          ) {
            toast.warning(
              MENSAJE_CATEGORIAS
            )

            return prev
          }

          return nuevo
        }
      )
    }

  const actualizarLicenciaConduccion =
    (
      categoria,
      campo,
      valor
    ) => {
      setLicenciasConduccion(
        (prev) =>
          prev.map(
            (item) =>
              item.categoria ===
              categoria
                ? {
                    ...item,
                    [campo]:
                      valor,
                  }
                : item
          )
      )
    }

  // ==========================================================
  // VALIDAR FORMULARIO
  // ==========================================================

  const validarFormulario =
    () => {
      const obligatorios = [
        [
          'tipo_personal',
          'Selecciona la relación con el CEA.',
        ],
        [
          'tipo_documento',
          'Selecciona el tipo de documento.',
        ],
        [
          'documento',
          'El documento es obligatorio.',
        ],
        [
          'nombres',
          'Los nombres son obligatorios.',
        ],
        [
          'apellidos',
          'Los apellidos son obligatorios.',
        ],
        [
          'fecha_nacimiento',
          'La fecha de nacimiento es obligatoria.',
        ],
        [
          'genero',
          'Selecciona el género.',
        ],
        [
          'tipo_sangre',
          'Selecciona el tipo de sangre.',
        ],
        [
          'estado_civil',
          'Selecciona el estado civil.',
        ],
        [
          'escolaridad',
          'Selecciona la escolaridad.',
        ],
        [
          'profesion',
          'La profesión u oficio es obligatoria.',
        ],
        [
          'nacionalidad',
          'La nacionalidad es obligatoria.',
        ],
        [
          'departamento_residencia',
          'El departamento de residencia es obligatorio.',
        ],
        [
          'ciudad_residencia',
          'La ciudad de residencia es obligatoria.',
        ],
        [
          'direccion',
          'La dirección es obligatoria.',
        ],
        [
          'telefono',
          'El teléfono es obligatorio.',
        ],
        [
          'email',
          'El correo personal autorizado es obligatorio.',
        ],
        [
          'cargo',
          'El cargo es obligatorio.',
        ],
        [
          'grupo_personal',
          'Selecciona el grupo de personal.',
        ],
        [
          'tipo_contrato',
          'Selecciona el tipo de contrato.',
        ],
        [
          'tipo_permanencia',
          'Selecciona el tipo de permanencia.',
        ],
        [
          'fecha_vinculacion',
          'La fecha de vinculación es obligatoria.',
        ],
        [
          'eps',
          'Selecciona la EPS.',
        ],
        [
          'arl',
          'Selecciona la ARL.',
        ],
        [
          'fondo_pension',
          'Selecciona el fondo de pensión.',
        ],
        [
          'medio_transporte_trabajo',
          'Selecciona el medio de transporte hacia el trabajo.',
        ],
        [
          'contacto_emergencia_nombre',
          'El contacto de emergencia es obligatorio.',
        ],
        [
          'contacto_emergencia_parentesco',
          'El parentesco del contacto de emergencia es obligatorio.',
        ],
        [
          'contacto_emergencia_telefono',
          'El teléfono del contacto de emergencia es obligatorio.',
        ],
      ]

      for (
        const [
          campo,
          mensaje,
        ] of obligatorios
      ) {
        if (
          !limpiarTexto(
            form[campo]
          )
        ) {
          return mensaje
        }
      }

      const documento =
        normalizarDocumento(
          form.documento
        )

      if (
        !documento ||
        documento.length < 5
      ) {
        return 'El documento debe tener mínimo 5 dígitos.'
      }

      if (
        limpiarTexto(
          form.nombres
        ).length < 2
      ) {
        return 'Los nombres deben tener mínimo 2 caracteres.'
      }

      if (
        limpiarTexto(
          form.apellidos
        ).length < 2
      ) {
        return 'Los apellidos deben tener mínimo 2 caracteres.'
      }

      if (
        form.telefono.length <
        7
      ) {
        return 'El teléfono debe tener mínimo 7 dígitos.'
      }

      if (
        form
          .contacto_emergencia_telefono
          .length < 7
      ) {
        return 'El teléfono del contacto de emergencia debe tener mínimo 7 dígitos.'
      }

      if (
        !esCorreoValido(
          form.email
        )
      ) {
        return 'El correo personal autorizado no tiene un formato válido.'
      }

      // ======================================================
      // ROL INSTRUCTOR
      // ======================================================

      if (
        form
          .rol_conductor_instructor
      ) {
        if (
          !Array.isArray(
            form.tipo_vehiculo_rol
          ) ||
          form
            .tipo_vehiculo_rol
            .length === 0
        ) {
          return 'Selecciona al menos un tipo de vehículo para el rol instructor.'
        }

        // ====================================================
        // CERTIFICADO
        // ====================================================

        if (
          certificadosInstructor.length ===
          0
        ) {
          return 'Selecciona al menos una categoría del certificado de instructor.'
        }

        const categoriasInstructor =
          certificadosInstructor.map(
            (item) =>
              item.categoria
          )

        if (
          !categoriasLicenciaValidas(
            categoriasInstructor
          )
        ) {
          return (
            'Categorías de certificado de instructor no válidas. ' +
            MENSAJE_CATEGORIAS
          )
        }

        for (
          const certificado of
          certificadosInstructor
        ) {
          if (
            !limpiarTexto(
              certificado
                .numero_certificado
            )
          ) {
            return `Digita el número de certificado para la categoría ${certificado.categoria}.`
          }

          if (
            !certificado.vigencia
          ) {
            return `Selecciona la vigencia del certificado para la categoría ${certificado.categoria}.`
          }
        }

        // ====================================================
        // LICENCIA CONDUCCIÓN
        // ====================================================

        if (
          licenciasConduccion.length ===
          0
        ) {
          return 'Selecciona al menos una categoría de licencia de conducción.'
        }

        const categoriasConduccion =
          licenciasConduccion.map(
            (item) =>
              item.categoria
          )

        if (
          !categoriasLicenciaValidas(
            categoriasConduccion
          )
        ) {
          return (
            'Categorías de licencia de conducción no válidas. ' +
            MENSAJE_CATEGORIAS
          )
        }

        for (
          const licencia of
          licenciasConduccion
        ) {
          if (
            !licencia.vigencia
          ) {
            return `Selecciona la vigencia de la licencia de conducción categoría ${licencia.categoria}.`
          }
        }
      }

      // ======================================================
      // ACCESO
      // ======================================================

      if (
        crearAcceso &&
        rolesSeleccionados.length ===
          0
      ) {
        return 'Selecciona al menos un perfil de acceso.'
      }

      return ''
    }

  // Se reutiliza la validación completa del envío para habilitar Guardar.
  const puedeGuardarPersonal = !loading && !validarFormulario()

  // ==========================================================
  // GUARDAR PERSONAL
  // ==========================================================

  const guardarPersonal =
    async (event) => {
      event.preventDefault()

      const mensajeValidacion =
        validarFormulario()

      if (
        mensajeValidacion
      ) {
        toast.warning(
          mensajeValidacion
        )
        return
      }

      setLoading(true)

      try {
        const payload = {
          nit:
            obtenerNitSesion(),

          personal: {
            ...form,

            documento:
              normalizarDocumento(
                form.documento
              ),

            nombres:
              limpiarTexto(
                form.nombres
              ).toUpperCase(),

            apellidos:
              limpiarTexto(
                form.apellidos
              ).toUpperCase(),

            email:
              limpiarTexto(
                form.email
              ).toLowerCase(),

            numero_hijos:
              form.numero_hijos ===
              ''
                ? null
                : Number(
                    form.numero_hijos
                  ),

            estado:
              'activo',

            tipo_vehiculo_rol:
              form
                .rol_conductor_instructor
                ? form
                    .tipo_vehiculo_rol
                : [],
          },

          perfiles:
            crearAcceso
              ? rolesSeleccionados
              : [],

          licencias:
            form
              .rol_conductor_instructor
              ? {
                  certificados_instructor:
                    certificadosInstructor,

                  licencias_conduccion:
                    licenciasConduccion,
                }
              : {
                  certificados_instructor:
                    [],

                  licencias_conduccion:
                    [],
                },

          creado_por_nombre:
            user?.nombre_completo ||
            user?.nombreCompleto ||
            user?.usuario ||
            'ADMINISTRATIVO',
        }

        const response =
          await fetch(
            '/api/personal',
            {
              method: 'POST',

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

        let result = null

        try {
          result =
            await response.json()
        } catch {
          toast.error(
            'La respuesta del servidor no es válida.'
          )
          return
        }

        if (
          !response.ok ||
          result.status !==
            'success'
        ) {
          toast.error(
            result.message ||
              'No fue posible registrar el personal.'
          )
          return
        }

        toast.success(
          'Personal registrado correctamente.'
        )

        setForm(
          INITIAL_FORM
        )

        setRolesSeleccionados(
          []
        )

        setCrearAcceso(
          true
        )

        setCertificadosInstructor(
          []
        )

        setLicenciasConduccion(
          []
        )

        await cargarListado()
        setMostrarFormulario(false)
      } catch (error) {
        console.error(
          'Error registrando personal:',
          error
        )

        toast.error(
          'No fue posible comunicarse con el servidor.'
        )
      } finally {
        setLoading(false)
      }
    }

  // ==========================================================
  // CARGANDO
  // ==========================================================

  if (!user) {
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
    <div className="min-h-screen bg-gray-100 p-6">

      <Toaster
        richColors
        position="top-right"
      />

      <div className="max-w-7xl mx-auto space-y-6">

        <EncabezadoModulo
          titulo="Gestión de Personal"
          subtitulo="Consulta el personal registrado y administra nuevos registros."
          icono={IdCard}
          rutaRegreso="/admin"
        />

        {mostrarFormulario && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 md:p-6" role="dialog" aria-modal="true" aria-label="Registrar nuevo personal">
            <div className="flex w-full max-w-4xl max-h-[94vh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <FranjaSuperiorModal className="flex shrink-0 items-center justify-between gap-3 px-5 py-3">
                <div>
                  <h2 className="text-base font-bold">Registrar nuevo personal</h2>
                  <p className="text-xs opacity-85">Complete las secciones del formulario para registrar al colaborador.</p>
                </div>
                <button type="button" onClick={cerrarFormulario} disabled={loading} aria-label="Cerrar formulario" className="rounded-lg p-2 hover:bg-white/15 disabled:opacity-50"><X size={20} /></button>
              </FranjaSuperiorModal>
              <div className="overflow-y-auto px-5 pb-5">
          <form
            onSubmit={
              guardarPersonal
            }
            className="mt-5 space-y-5"
          >

{/* Secciones del formulario en filas independientes */}
<div className="flex flex-col gap-4">
  <section className="min-w-0 overflow-hidden bg-white" style={{ border: `1px solid ${ESTILO_CELDAS_TABLA.borde}`, borderRadius: ESTILO_CONTENEDORES.radio, boxShadow: ESTILO_CONTENEDORES.sombra }}>

              <FranjaSecundariaModal className="px-3 py-2 text-xs font-bold">
                Información básica
              </FranjaSecundariaModal>
<div className="p-3 space-y-3"><div className="grid grid-cols-12 gap-3 items-start [&>*]:min-w-0"><CampoSelect
                  label="Tipo documento *"
                  name="tipo_documento"
                  value={
                    form.tipo_documento
                  }
                  onChange={
                    onChange
                  }
                  options={[
                    ['CC', 'C.C.'],
                    ['CE', 'C.E.'],
                    ['TI', 'T.I.'],
                    [
                      'PPT',
                      'P.P.T.',
                    ],
                    [
                      'PASAPORTE',
                      'Pasaporte',
                    ],
                  ]}
                wrapperClass="col-span-12 md:col-span-2" />
<CampoInput
                  label="Documento *"
                  name="documento"
                  value={
                    form.documento
                  }
                  onChange={
                    onChange
                  }
                  inputMode="numeric"
                wrapperClass="col-span-12 md:col-span-3" />
<CampoInput
                  label="Fecha nacimiento *"
                  type="date"
                  name="fecha_nacimiento"
                  value={
                    form.fecha_nacimiento
                  }
                  onChange={
                    onChange
                  }
                wrapperClass="col-span-12 md:col-span-2" />
<CampoInput
                  label="Nacionalidad *"
                  name="nacionalidad"
                  value={
                    form.nacionalidad
                  }
                  onChange={
                    onChange
                  }
                wrapperClass="col-span-12 md:col-span-2" /></div>

<div className="grid grid-cols-12 gap-3 items-start [&>*]:min-w-0"><CampoInput
                  label="Nombres *"
                  name="nombres"
                  value={
                    form.nombres
                  }
                  onChange={
                    onChange
                  }
                  className="uppercase"
                wrapperClass="col-span-12 md:col-span-4" />
<CampoInput
                  label="Apellidos *"
                  name="apellidos"
                  value={
                    form.apellidos
                  }
                  onChange={
                    onChange
                  }
                  className="uppercase"
                wrapperClass="col-span-12 md:col-span-4" />
<CampoSelect
                  label="Género *"
                  name="genero"
                  value={
                    form.genero
                  }
                  onChange={
                    onChange
                  }
                  options={[
                    [
                      '',
                      'Seleccione',
                    ],
                    [
                      'femenino',
                      'Femenino',
                    ],
                    [
                      'masculino',
                      'Masculino',
                    ],
                    [
                      'otro',
                      'Otro',
                    ],
                    [
                      'no_informa',
                      'No informa',
                    ],
                  ]}
                wrapperClass="col-span-12 md:col-span-2" />
<CampoSelect
                  label="Tipo de sangre *"
                  name="tipo_sangre"
                  value={
                    form.tipo_sangre
                  }
                  onChange={
                    onChange
                  }
                  options={[
                    [
                      '',
                      'Seleccione',
                    ],

                    ...TIPOS_SANGRE.map(
                      (tipo) => [
                        tipo,
                        tipo,
                      ]
                    ),
                  ]}
                wrapperClass="col-span-12 md:col-span-2" /></div></div></section>

  <section className="min-w-0 overflow-hidden bg-white" style={{ border: `1px solid ${ESTILO_CELDAS_TABLA.borde}`, borderRadius: ESTILO_CONTENEDORES.radio, boxShadow: ESTILO_CONTENEDORES.sombra }}>

              <FranjaSecundariaModal className="px-3 py-2 text-xs font-bold">
                Contacto y datos personales
              </FranjaSecundariaModal>
<div className="p-3 space-y-3"><div className="grid grid-cols-12 gap-3 items-start [&>*]:min-w-0"><CampoInput
                  label="Teléfono *"
                  name="telefono"
                  value={
                    form.telefono
                  }
                  onChange={
                    onChange
                  }
                  inputMode="numeric"
                wrapperClass="col-span-12 md:col-span-3" />
<CampoInput
                  label="Dirección *"
                  name="direccion"
                  value={
                    form.direccion
                  }
                  onChange={
                    onChange
                  }
                wrapperClass="col-span-12 md:col-span-5" />
<CampoInput
                  label="Correo personal autorizado *"
                  type="email"
                  name="email"
                  value={
                    form.email
                  }
                  onChange={
                    onChange
                  }
                wrapperClass="col-span-12 md:col-span-4" /></div>
<div className="grid grid-cols-12 gap-3 items-start [&>*]:min-w-0"><CampoCatalogo
                  catalogo="departamentos"
                  label="Departamento residencia *"
                  name="departamento_residencia"
                  value={form.departamento_residencia}
                  onChange={onChangeDepartamento}
                  onOpcionesCargadas={setDepartamentosCatalogo}
                  nit={empresaNit}
                  wrapperClass="col-span-12 md:col-span-3" />
<CampoCatalogo
                  catalogo="municipios"
                  label="Ciudad residencia *"
                  name="ciudad_residencia"
                  value={form.ciudad_residencia}
                  onChange={onChange}
                  departamentoId={departamentoId}
                  nit={empresaNit}
                  wrapperClass="col-span-12 md:col-span-3" />
<CampoSelect
                  label="Escolaridad *"
                  name="escolaridad"
                  value={
                    form.escolaridad
                  }
                  onChange={
                    onChange
                  }
                  options={[
                    [
                      '',
                      'Seleccione',
                    ],

                    ...ESCOLARIDADES,
                  ]}
                wrapperClass="col-span-12 md:col-span-2" />
<CampoInput
                  label="Profesión u oficio *"
                  name="profesion"
                  value={
                    form.profesion
                  }
                  onChange={
                    onChange
                  }
                wrapperClass="col-span-12 md:col-span-4" /></div>
<div className="grid grid-cols-12 gap-3 items-start [&>*]:min-w-0"><CampoSelect
                  label="Estado civil *"
                  name="estado_civil"
                  value={
                    form.estado_civil
                  }
                  onChange={
                    onChange
                  }
                  options={[
                    [
                      '',
                      'Seleccione',
                    ],
                    [
                      'soltero',
                      'Soltero(a)',
                    ],
                    [
                      'casado',
                      'Casado(a)',
                    ],
                    [
                      'union_libre',
                      'Unión libre',
                    ],
                    [
                      'separado',
                      'Separado(a)',
                    ],
                    [
                      'viudo',
                      'Viudo(a)',
                    ],
                  ]}
                wrapperClass="col-span-12 md:col-span-2" />
<CampoInput
                  label="Número de hijos"
                  name="numero_hijos"
                  value={
                    form.numero_hijos
                  }
                  onChange={
                    onChange
                  }
                  inputMode="numeric"
                wrapperClass="col-span-12 md:col-span-2" />
<CampoCatalogo
                  catalogo="eps"
                  label="EPS *"
                  name="eps"
                  value={form.eps}
                  onChange={onChange}
                  nit={empresaNit}
                  wrapperClass="col-span-12 md:col-span-3" />
<CampoCatalogo
                  catalogo="arl"
                  label="ARL *"
                  name="arl"
                  value={form.arl}
                  onChange={onChange}
                  nit={empresaNit}
                  wrapperClass="col-span-12 md:col-span-2" />
<CampoCatalogo
                  catalogo="fondos_pensiones"
                  label="Fondo pensión *"
                  name="fondo_pension"
                  value={form.fondo_pension}
                  onChange={onChange}
                  nit={empresaNit}
                  wrapperClass="col-span-12 md:col-span-3" /></div><div className="border-t border-slate-300 pt-3"><h3 className="mb-3 text-sm font-bold text-[#194567]">Contacto de emergencia</h3><div className="grid grid-cols-12 gap-3 items-start [&>*]:min-w-0"><CampoInput
                  label="Nombre completo contacto *"
                  name="contacto_emergencia_nombre"
                  value={
                    form
                      .contacto_emergencia_nombre
                  }
                  onChange={
                    onChange
                  }
                wrapperClass="col-span-12 md:col-span-6" />
<CampoInput
                  label="Parentesco *"
                  name="contacto_emergencia_parentesco"
                  value={
                    form
                      .contacto_emergencia_parentesco
                  }
                  onChange={
                    onChange
                  }
                wrapperClass="col-span-12 md:col-span-3" />
<CampoInput
                  label="Teléfono contacto *"
                  name="contacto_emergencia_telefono"
                  value={
                    form
                      .contacto_emergencia_telefono
                  }
                  onChange={
                    onChange
                  }
                  inputMode="numeric"
                wrapperClass="col-span-12 md:col-span-3" /></div></div></div></section>

  

  <section className="min-w-0 overflow-hidden bg-white" style={{ border: `1px solid ${ESTILO_CELDAS_TABLA.borde}`, borderRadius: ESTILO_CONTENEDORES.radio, boxShadow: ESTILO_CONTENEDORES.sombra }}>

              <FranjaSecundariaModal className="px-3 py-2 text-xs font-bold">
                Vinculación al CEA
              </FranjaSecundariaModal>
<div className="p-3 space-y-3"><div className="grid grid-cols-12 gap-3 items-start [&>*]:min-w-0"><CampoSelect
                  label="Relación con el CEA *"
                  name="tipo_personal"
                  value={
                    form.tipo_personal
                  }
                  onChange={
                    onChange
                  }
                  options={[
                    [
                      'contratista',
                      'Contratista',
                    ],
                    [
                      'colaborador',
                      'Colaborador',
                    ],
                  ]}
                wrapperClass="col-span-12 md:col-span-3" />
<CampoSelect
                  label="Grupo de trabajo *"
                  name="grupo_personal"
                  value={
                    form.grupo_personal
                  }
                  onChange={
                    onChange
                  }
                  options={[
                    [
                      'directivo',
                      'Directivo',
                    ],
                    [
                      'administrativo',
                      'Administrativo',
                    ],
                    [
                      'operativo',
                      'Operativo',
                    ],
                    [
                      'servicios_generales',
                      'Servicios generales',
                    ],
                  ]}
                wrapperClass="col-span-12 md:col-span-3" />
<CampoInput
                  label="Cargo *"
                  name="cargo"
                  value={
                    form.cargo
                  }
                  onChange={
                    onChange
                  }
                  placeholder="Ej: Instructor, auxiliar"
                wrapperClass="col-span-12 md:col-span-3" />
<CampoSelect
                  label="Modalidad de contrato *"
                  name="tipo_contrato"
                  value={
                    form.tipo_contrato
                  }
                  onChange={
                    onChange
                  }
                  options={[
                    [
                      'prestacion_servicios',
                      'Prestación de servicios',
                    ],
                    [
                      'termino_indefinido',
                      'Término indefinido',
                    ],
                    [
                      'termino_fijo',
                      'Término fijo',
                    ],
                    [
                      'obra_labor',
                      'Obra o labor',
                    ],
                    [
                      'aprendiz',
                      'Aprendiz',
                    ],
                    [
                      'otro',
                      'Otro',
                    ],
                  ]}
                wrapperClass="col-span-12 md:col-span-3" /></div>
<div className="grid grid-cols-12 gap-3 items-start [&>*]:min-w-0"><CampoSelect
                  label="Permanencia en el CEA *"
                  name="tipo_permanencia"
                  value={
                    form.tipo_permanencia
                  }
                  onChange={
                    onChange
                  }
                  options={[
                    [
                      'permanente',
                      'Permanente',
                    ],
                    [
                      'ocasional',
                      'Ocasional',
                    ],
                    [
                      'por_dias',
                      'Por días',
                    ],
                    [
                      'por_horas',
                      'Por horas',
                    ],
                    [
                      'temporal',
                      'Temporal',
                    ],
                  ]}
                wrapperClass="col-span-12 md:col-span-3" />
<CampoInput
                  label="Fecha vinculación *"
                  type="date"
                  name="fecha_vinculacion"
                  value={
                    form.fecha_vinculacion
                  }
                  onChange={
                    onChange
                  }
                wrapperClass="col-span-12 md:col-span-3" />
<CampoInput
                  label="Fecha retiro (opcional)"
                  type="date"
                  name="fecha_retiro"
                  value={
                    form.fecha_retiro
                  }
                  onChange={
                    onChange
                  }
                  required={
                    false
                  }
                wrapperClass="col-span-12 md:col-span-3" />
<CampoSelect
                  label="Medio transporte al trabajo *"
                  name="medio_transporte_trabajo"
                  value={
                    form.medio_transporte_trabajo
                  }
                  onChange={
                    onChange
                  }
                  options={[
                    [
                      '',
                      'Seleccione',
                    ],

                    ...MEDIOS_TRANSPORTE,
                  ]}
                wrapperClass="col-span-12 md:col-span-3" /></div></div></section>

  <section className="min-w-0 overflow-hidden bg-white" style={{ border: `1px solid ${ESTILO_CELDAS_TABLA.borde}`, borderRadius: ESTILO_CONTENEDORES.radio, boxShadow: ESTILO_CONTENEDORES.sombra }}>

              <FranjaSecundariaModal className="px-3 py-2 text-xs font-bold">
                Rol instructor
              </FranjaSecundariaModal>
<div className="p-3">

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">

                <input
                  type="checkbox"
                  name="rol_conductor_instructor"
                  checked={
                    form
                      .rol_conductor_instructor
                  }
                  onChange={
                    onChange
                  }
                  className="h-4 w-4"
                />

                Cumple rol de instructor en el trabajo

              </label>

              {form
                .rol_conductor_instructor && (

                <div className="space-y-5 mt-4">

                  {/* ==========================================
                      TIPO VEHÍCULO
                  ========================================== */}

                  <div>

                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      Tipo de vehículo en este rol *
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                      {TIPOS_VEHICULO_ROL.map(
                        (tipo) => (

                        <label
                          key={
                            tipo
                          }
                          className={`border rounded-md p-3 cursor-pointer transition ${
                            form
                              .tipo_vehiculo_rol
                              .includes(
                                tipo
                              )
                              ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                              : 'bg-white hover:bg-gray-100'
                          }`}
                        >

                          <input
                            type="checkbox"
                            className="hidden"
                            checked={
                              form
                                .tipo_vehiculo_rol
                                .includes(
                                  tipo
                                )
                            }
                            onChange={() =>
                              toggleTipoVehiculoRol(
                                tipo
                              )
                            }
                          />

                          <span className="font-semibold text-sm block">
                            {tipo === 'AUTOMÓVIL' ? 'AUTOMÓVIL/CAMIONETA' : tipo}
                          </span>

                        </label>

                      ))}

                    </div>

                  </div>

                  {/* ==========================================
                      CERTIFICADO INSTRUCTOR
                  ========================================== */}

                  <div className="border rounded-lg p-4 bg-gray-50">

                    <h3 className="font-semibold text-gray-800 mb-1">
                      Certificado de instructor
                    </h3>

                    <p className="text-xs text-gray-600 mb-3">
                      A2 puede registrarse de forma independiente o combinarse con una sola categoría entre B1, B1-C1, B2-C2 o B3-C3.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">

                      {CATEGORIAS_LICENCIA.map(
                        (categoria) => {
                          const seleccionado =
                            certificadosInstructor.some(
                              (item) =>
                                item.categoria ===
                                categoria
                            )

                          return (

                            <label
                              key={
                                categoria
                              }
                              className={`border rounded-md p-3 cursor-pointer text-center transition ${
                                seleccionado
                                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                                  : 'bg-white hover:bg-gray-100'
                              }`}
                            >

                              <input
                                type="checkbox"
                                className="hidden"
                                checked={
                                  seleccionado
                                }
                                onChange={() =>
                                  toggleCategoriaInstructor(
                                    categoria
                                  )
                                }
                              />

                              <span className="font-semibold text-sm block">
                                {categoria}
                              </span>

                            </label>

                          )
                        }
                      )}

                    </div>

                    {certificadosInstructor.length >
                      0 && (

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {certificadosInstructor.map(
                          (item) => (

                          <div
                            key={
                              item.categoria
                            }
                            className="bg-white border rounded-md p-3"
                          >

                            <h4 className="font-semibold text-sm mb-3">
                              Certificado categoría {item.categoria}
                            </h4>

                            <div className="grid grid-cols-2 gap-x-3 gap-y-3 items-start [&>*]:min-w-0">

                              <CampoInput
                                label="Número de certificado *"
                                value={
                                  item.numero_certificado
                                }
                                onChange={(
                                  event
                                ) =>
                                  actualizarCertificadoInstructor(
                                    item.categoria,
                                    'numero_certificado',
                                    event
                                      .target
                                      .value
                                  )
                                }
                              />

                              <CampoInput
                                label="Vigencia certificado *"
                                type="date"
                                value={
                                  item.vigencia
                                }
                                onChange={(
                                  event
                                ) =>
                                  actualizarCertificadoInstructor(
                                    item.categoria,
                                    'vigencia',
                                    event
                                      .target
                                      .value
                                  )
                                }
                              />

                            </div>

                          </div>

                        ))}

                      </div>

                    )}

                  </div>

                  {/* ==========================================
                      LICENCIA CONDUCCIÓN
                  ========================================== */}

                  <div className="border rounded-lg p-4 bg-gray-50">

                    <h3 className="font-semibold text-gray-800 mb-1">
                      Licencia de conducción
                    </h3>

                    <p className="text-xs text-gray-600 mb-3">
                      A2 puede registrarse de forma independiente o combinarse con una sola categoría entre B1, B1-C1, B2-C2 o B3-C3. La categoría de conducción puede ser diferente a la del certificado de instructor.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">

                      {CATEGORIAS_LICENCIA.map(
                        (categoria) => {
                          const seleccionado =
                            licenciasConduccion.some(
                              (item) =>
                                item.categoria ===
                                categoria
                            )

                          return (

                            <label
                              key={
                                categoria
                              }
                              className={`border rounded-md p-3 cursor-pointer text-center transition ${
                                seleccionado
                                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                                  : 'bg-white hover:bg-gray-100'
                              }`}
                            >

                              <input
                                type="checkbox"
                                className="hidden"
                                checked={
                                  seleccionado
                                }
                                onChange={() =>
                                  toggleCategoriaConduccion(
                                    categoria
                                  )
                                }
                              />

                              <span className="font-semibold text-sm block">
                                {categoria}
                              </span>

                            </label>

                          )
                        }
                      )}

                    </div>

                    {licenciasConduccion.length >
                      0 && (

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {licenciasConduccion.map(
                          (item) => (

                          <div
                            key={
                              item.categoria
                            }
                            className="bg-white border rounded-md p-3"
                          >

                            <h4 className="font-semibold text-sm mb-3">
                              Licencia categoría {item.categoria}
                            </h4>

                            <CampoInput
                              label="Vigencia licencia *"
                              type="date"
                              value={
                                item.vigencia
                              }
                              onChange={(
                                event
                              ) =>
                                actualizarLicenciaConduccion(
                                  item.categoria,
                                  'vigencia',
                                  event
                                    .target
                                    .value
                                )
                              }
                            />

                          </div>

                        ))}

                      </div>

                    )}

                  </div>

                </div>

              )}

            </div>
</section>

  <section className="min-w-0 overflow-hidden bg-white" style={{ border: `1px solid ${ESTILO_CELDAS_TABLA.borde}`, borderRadius: ESTILO_CONTENEDORES.radio, boxShadow: ESTILO_CONTENEDORES.sombra }}>

              <FranjaSecundariaModal className="px-3 py-2 text-xs font-bold">
                Observaciones
              </FranjaSecundariaModal>
<div className="p-3">

              <div className="grid grid-cols-1 gap-4">

                <CampoTextarea
                  label="Observaciones internas"
                  name="observaciones"
                  value={
                    form.observaciones
                  }
                  onChange={
                    onChange
                  }
                  required={
                    false
                  }
                />

              </div>

            </div>
</section>
</div>
{/* Segunda fila: acceso y acciones */}
<section className="min-w-0 overflow-hidden bg-white" style={{ border: `1px solid ${ESTILO_CELDAS_TABLA.borde}`, borderRadius: ESTILO_CONTENEDORES.radio, boxShadow: ESTILO_CONTENEDORES.sombra }}>
<FranjaSecundariaModal className="px-3 py-2 text-xs font-bold">Acceso a la aplicación</FranjaSecundariaModal>
<div className="p-3">

              <div className="flex items-center justify-between gap-4 flex-wrap">

                <div>

                  

                  <p className="text-sm text-gray-600">
                    Selecciona los perfiles autorizados para esta persona.
                  </p>

                </div>

                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">

                  <input
                    type="checkbox"
                    checked={
                      crearAcceso
                    }
                    onChange={(
                      e
                    ) =>
                      setCrearAcceso(
                        e.target
                          .checked
                      )
                    }
                    className="h-4 w-4"
                  />

                  Preautorizar acceso

                </label>

              </div>

              {crearAcceso && (
                <>

                <div className="grid grid-cols-2 gap-3 mt-4 sm:grid-cols-4">
                  {ROLES.map((rol) => {
                    const IconoRol = ICONOS_ROLES[rol.value]
                    const seleccionado = rolesSeleccionados.includes(rol.value)
                    return (
                      <label
                        key={rol.value}
                        className={`flex min-h-[82px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border p-3 text-center transition-colors ${seleccionado
                          ? 'border-[#194567] bg-[#194567] text-white'
                          : 'border-slate-400 bg-white text-slate-700 hover:bg-slate-100'}`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={seleccionado}
                          onChange={() => toggleRol(rol.value)}
                          aria-label={`Seleccionar perfil ${rol.label}`}
                        />
                        <IconoRol size={22} aria-hidden="true" />
                        <span className="text-sm font-semibold">{rol.label}</span>
                        {seleccionado && <CheckCircle2 size={16} aria-hidden="true" />}
                      </label>
                    )
                  })}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ROLES.map((rol) => {
                    const IconoRol = ICONOS_ROLES[rol.value]
                    return (
                      <div key={rol.value} className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                        <div className="mb-1 flex items-center gap-2 text-sm font-bold text-[#194567]">
                          <IconoRol size={17} aria-hidden="true" />
                          <span>{rol.label}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-600">{DESCRIPCIONES_ROLES[rol.value]}</p>
                      </div>
                    )
                  })}
                </div>

                </>
              )}

            </div>
</section>
<div className="flex justify-end gap-3 border-t border-slate-300 pt-4">
  <BotonCancelar type="button" onClick={cerrarFormulario} disabled={loading}><Ban size={15} /> Cancelar</BotonCancelar>
  <BotonGuardar type="submit" disabled={!puedeGuardarPersonal} title={!puedeGuardarPersonal && !loading ? validarFormulario() : undefined}><Save size={15} /> {loading ? 'Guardando...' : 'Guardar personal'}</BotonGuardar>
</div>
          </form>
              </div>
            </div>
          </div>
        )}

        {/* PERSONAL REGISTRADO: centro visual */}
        <div className="bg-white">
          <div className="flex flex-wrap items-center justify-end gap-2 pb-3">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                aria-label="Buscar personal por nombre o documento"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar nombre o documento..."
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs outline-none focus:border-[#194567]"
              />
            </div>
            <BotonLimpiar type="button" onClick={() => setBusqueda('')} disabled={!busqueda}><Eraser size={15} /> Limpiar</BotonLimpiar>
          </div>
          <FranjaSuperiorModal className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-bold"><Users size={17} /> Personal registrado</h2>
            <BotonAgregar type="button" onClick={() => setMostrarFormulario(true)}><Plus size={15} /> Agregar personal</BotonAgregar>
          </FranjaSuperiorModal>

          <MarcoTabla className="overflow-x-auto rounded-t-none">

            <table className="min-w-full text-xs">

              <thead>

                <tr>

                  <th className="text-left p-3 font-bold whitespace-nowrap">
                    Documento
                  </th>

                  <th className="text-left p-3 font-bold whitespace-nowrap">
                    Nombre
                  </th>

                  <th className="text-left p-3 font-bold whitespace-nowrap">
                    Cargo
                  </th>

                  <th className="text-left p-3 font-bold whitespace-nowrap">
                    Grupo
                  </th>

                  <th className="text-left p-3 font-bold whitespace-nowrap">
                    Correo
                  </th>

                  <th className="text-left p-3 font-bold whitespace-nowrap">
                    Cuenta
                  </th>

                  <th className="text-left p-3 font-bold whitespace-nowrap">
                    Perfiles
                  </th>

                  <th className="text-left p-3 font-bold whitespace-nowrap">
                    Estado
                  </th>

                  <th className="text-left p-3 font-bold whitespace-nowrap">
                    Acciones
                  </th>

                </tr>

              </thead>

              <tbody>

                {cargandoListado ? (

                  <tr>

                    <td
                      colSpan="9"
                      className="p-4 text-center text-gray-500"
                    >
                      Cargando listado...
                    </td>

                  </tr>

                ) : personalFiltrado.length ===
                  0 ? (

                  <tr>

                    <td
                      colSpan="9"
                      className="p-4 text-center text-gray-500"
                    >
                      No hay personal registrado.
                    </td>

                  </tr>

                ) : (

                  personalFiltrado.map(
                    (item) => (

                    <tr
                      key={
                        item.id
                      }
                      className="hover:bg-slate-50 transition-colors"
                    >

                      <td className="p-3">
                        {item.documento}
                      </td>

                      <td className="p-3 font-semibold">
                        {`${item.nombres || ''} ${
                          item.apellidos || ''
                        }`.trim()}
                      </td>

                      <td className="p-3">
                        {item.cargo || '-'}
                      </td>

                      <td className="p-3">
                        {item.grupo_personal || '-'}
                      </td>

                      <td className="p-3">
                        {item.email || '-'}
                      </td>

                      <td className="p-3">
                        {item.cuenta?.estado || 'sin acceso'}
                      </td>

                      <td className="p-3">

                        {(item.perfiles || []).length ===
                        0 ? (
                          '-'
                        ) : (

                          <div className="flex flex-wrap gap-1">

                            {item.perfiles.map(
                              (perfil) => (

                              <span
                                key={
                                  perfil.id
                                }
                                className="px-2 py-1 rounded bg-gray-100 border text-xs"
                              >
                                {perfil.rol}
                              </span>

                            ))}

                          </div>

                        )}

                      </td>

                      <td className="p-3">
                        {item.estado || '-'}
                      </td>

                      <td className="p-3">

                        <Link
                          href={`/admin/personal/${item.id}`}
                          className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-dark)]"
                        >
                          <i className="fas fa-file-alt"></i>

                          Hoja de vida
                        </Link>

                      </td>

                    </tr>

                  ))
                )}

              </tbody>

            </table>

          </MarcoTabla>

        </div>

      </div>

    </div>
  )
}

// ============================================================
// CAMPO INPUT
// ============================================================

function CampoInput({
  label,
  wrapperClass = '',
  className = '',
  required = true,
  ...props
}) {
  return (
    <div className={`min-w-0 ${wrapperClass}`}>

      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
      </label>

      <input
        required={
          required
        }
        {...props}
        className={`w-full border border-slate-500 rounded-md p-2 text-sm bg-white focus:outline-none focus:border-[#194567] focus:ring-2 focus:ring-[#194567]/20 ${className}`}
      />

    </div>
  )
}

// ============================================================
// CAMPO SELECT
// ============================================================

function CampoSelect({
  label,
  options,
  wrapperClass = '',
  required = true,
  ...props
}) {
  return (
    <div className={wrapperClass}>

      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
      </label>

      <select
        required={
          required
        }
        {...props}
        className="w-full border border-slate-500 rounded-md p-2 text-sm bg-white focus:outline-none focus:border-[#194567] focus:ring-2 focus:ring-[#194567]/20"
      >

        {options.map(
          ([
            value,
            labelOption,
          ]) => (

          <option
            key={
              value
            }
            value={
              value
            }
          >
            {labelOption}
          </option>

        ))}

      </select>

    </div>
  )
}

// ============================================================
// CAMPO TEXTAREA
// ============================================================

function CampoTextarea({
  label,
  wrapperClass = '',
  required = true,
  ...props
}) {
  return (
    <div className={wrapperClass}>

      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
      </label>

      <textarea
        required={
          required
        }
        rows={4}
        {...props}
        className="w-full border border-slate-500 rounded-md p-2 text-sm bg-white focus:outline-none focus:border-[#194567] focus:ring-2 focus:ring-[#194567]/20"
      />

    </div>
  )
}