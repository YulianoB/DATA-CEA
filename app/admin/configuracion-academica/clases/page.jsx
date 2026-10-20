// app/admin/configuracion-academica/clases/page.jsx

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
import { BookOpen } from 'lucide-react'
import { BotonAccion } from '@/components/admin/EstiloModulo'


// ============================================================
// UTILIDADES
// ============================================================

function texto(valor) {
  return String(
    valor ?? ''
  ).trim()
}


function mayusculas(valor) {
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
  return texto(
    user?.nombreCompleto ||
      user?.nombre_completo ||
      user?.nombre ||
      user?.usuario ||
      ''
  )
}


function numero(valor) {
  const resultado =
    Number(valor)

  return Number.isFinite(
    resultado
  )
    ? resultado
    : 0
}


function formatearHoras(
  valor
) {
  const cantidad =
    numero(valor)

  if (
    Number.isInteger(
      cantidad
    )
  ) {
    return String(
      cantidad
    )
  }

  return cantidad
    .toFixed(2)
    .replace(
      /\.?0+$/,
      ''
    )
}

const COLORES_HORARIO = [
  // AZULES
  {
    valor: '#DBEAFE',
    nombre: 'Azul muy claro',
  },
  {
    valor: '#93C5FD',
    nombre: 'Azul claro',
  },
  {
    valor: '#60A5FA',
    nombre: 'Azul medio',
  },
  {
    valor: '#3B82F6',
    nombre: 'Azul intenso',
  },
  {
    valor: '#2563EB',
    nombre: 'Azul fuerte',
  },
  {
    valor: '#1D4ED8',
    nombre: 'Azul oscuro',
  },

  // CELESTES Y CIAN
  {
    valor: '#E0F2FE',
    nombre: 'Celeste muy claro',
  },
  {
    valor: '#7DD3FC',
    nombre: 'Celeste',
  },
  {
    valor: '#38BDF8',
    nombre: 'Celeste intenso',
  },
  {
    valor: '#CFFAFE',
    nombre: 'Cian claro',
  },
  {
    valor: '#67E8F9',
    nombre: 'Cian',
  },
  {
    valor: '#06B6D4',
    nombre: 'Cian fuerte',
  },

  // TURQUESAS
  {
    valor: '#CCFBF1',
    nombre: 'Turquesa claro',
  },
  {
    valor: '#5EEAD4',
    nombre: 'Turquesa',
  },
  {
    valor: '#14B8A6',
    nombre: 'Turquesa intenso',
  },
  {
    valor: '#0F766E',
    nombre: 'Turquesa oscuro',
  },

  // VERDES
  {
    valor: '#DCFCE7',
    nombre: 'Verde muy claro',
  },
  {
    valor: '#86EFAC',
    nombre: 'Verde claro',
  },
  {
    valor: '#4ADE80',
    nombre: 'Verde medio',
  },
  {
    valor: '#22C55E',
    nombre: 'Verde intenso',
  },
  {
    valor: '#16A34A',
    nombre: 'Verde fuerte',
  },
  {
    valor: '#15803D',
    nombre: 'Verde oscuro',
  },

  // LIMAS
  {
    valor: '#ECFCCB',
    nombre: 'Lima claro',
  },
  {
    valor: '#BEF264',
    nombre: 'Lima',
  },
  {
    valor: '#84CC16',
    nombre: 'Lima intenso',
  },

  // AMARILLOS
  {
    valor: '#FEF9C3',
    nombre: 'Amarillo claro',
  },
  {
    valor: '#FDE047',
    nombre: 'Amarillo',
  },
  {
    valor: '#FACC15',
    nombre: 'Amarillo intenso',
  },
  {
    valor: '#EAB308',
    nombre: 'Amarillo fuerte',
  },

  // ÁMBAR
  {
    valor: '#FEF3C7',
    nombre: 'Ámbar claro',
  },
  {
    valor: '#FCD34D',
    nombre: 'Ámbar',
  },
  {
    valor: '#F59E0B',
    nombre: 'Ámbar intenso',
  },
  {
    valor: '#D97706',
    nombre: 'Ámbar oscuro',
  },

  // NARANJAS
  {
    valor: '#FFEDD5',
    nombre: 'Naranja claro',
  },
  {
    valor: '#FDBA74',
    nombre: 'Naranja',
  },
  {
    valor: '#F97316',
    nombre: 'Naranja intenso',
  },
  {
    valor: '#EA580C',
    nombre: 'Naranja fuerte',
  },

  // ROJOS
  {
    valor: '#FEE2E2',
    nombre: 'Rojo muy claro',
  },
  {
    valor: '#FCA5A5',
    nombre: 'Rojo claro',
  },
  {
    valor: '#F87171',
    nombre: 'Rojo medio',
  },
  {
    valor: '#EF4444',
    nombre: 'Rojo intenso',
  },
  {
    valor: '#DC2626',
    nombre: 'Rojo fuerte',
  },
  {
    valor: '#B91C1C',
    nombre: 'Rojo oscuro',
  },

  // ROSADOS
  {
    valor: '#FCE7F3',
    nombre: 'Rosado muy claro',
  },
  {
    valor: '#F9A8D4',
    nombre: 'Rosado claro',
  },
  {
    valor: '#F472B6',
    nombre: 'Rosado',
  },
  {
    valor: '#EC4899',
    nombre: 'Rosado intenso',
  },
  {
    valor: '#DB2777',
    nombre: 'Rosado fuerte',
  },

  // FUCSIAS
  {
    valor: '#FAE8FF',
    nombre: 'Fucsia claro',
  },
  {
    valor: '#E879F9',
    nombre: 'Fucsia',
  },
  {
    valor: '#D946EF',
    nombre: 'Fucsia intenso',
  },
  {
    valor: '#A21CAF',
    nombre: 'Fucsia oscuro',
  },

  // MORADOS
  {
    valor: '#F3E8FF',
    nombre: 'Morado muy claro',
  },
  {
    valor: '#D8B4FE',
    nombre: 'Morado claro',
  },
  {
    valor: '#C084FC',
    nombre: 'Morado',
  },
  {
    valor: '#A855F7',
    nombre: 'Morado intenso',
  },
  {
    valor: '#9333EA',
    nombre: 'Morado fuerte',
  },
  {
    valor: '#7E22CE',
    nombre: 'Morado oscuro',
  },

  // VIOLETAS
  {
    valor: '#EDE9FE',
    nombre: 'Violeta claro',
  },
  {
    valor: '#C4B5FD',
    nombre: 'Violeta',
  },
  {
    valor: '#8B5CF6',
    nombre: 'Violeta intenso',
  },
  {
    valor: '#6D28D9',
    nombre: 'Violeta oscuro',
  },

  // ÍNDIGOS
  {
    valor: '#E0E7FF',
    nombre: 'Índigo claro',
  },
  {
    valor: '#A5B4FC',
    nombre: 'Índigo',
  },
  {
    valor: '#6366F1',
    nombre: 'Índigo intenso',
  },
  {
    valor: '#4338CA',
    nombre: 'Índigo oscuro',
  },

  // NEUTROS
  {
    valor: '#F1F5F9',
    nombre: 'Gris muy claro',
  },
  {
    valor: '#CBD5E1',
    nombre: 'Gris claro',
  },
  {
    valor: '#94A3B8',
    nombre: 'Gris medio',
  },
  {
    valor: '#64748B',
    nombre: 'Gris oscuro',
  },
  // TONOS ADICIONALES
  { valor: '#172554', nombre: 'Azul noche' },
  { valor: '#166534', nombre: 'Verde bosque' },
  { valor: '#65A30D', nombre: 'Verde oliva' },
  { valor: '#D9F99D', nombre: 'Oliva suave' },
  { valor: '#D1FAE5', nombre: 'Menta pálido' },
  { valor: '#10B981', nombre: 'Esmeralda' },
  { valor: '#047857', nombre: 'Esmeralda oscura' },
  { valor: '#FEF08A', nombre: 'Amarillo suave' },
  { valor: '#CA8A04', nombre: 'Mostaza' },
  { valor: '#FED7AA', nombre: 'Melocotón' },
  { valor: '#FB7185', nombre: 'Coral' },
  { valor: '#F43F5E', nombre: 'Coral intenso' },
  { valor: '#9F1239', nombre: 'Borgoña' },
  { valor: '#86198F', nombre: 'Ciruela' },
  { valor: '#FBCFE8', nombre: 'Rosa pastel' },
  { valor: '#C026D3', nombre: 'Magenta' },
  { valor: '#FDA4AF', nombre: 'Salmón' },
  { valor: '#C2410C', nombre: 'Terracota' },
  { valor: '#D6D3D1', nombre: 'Café claro' },
  { valor: '#92400E', nombre: 'Café' },
  { valor: '#155E75', nombre: 'Azul petróleo' },
  { valor: '#475569', nombre: 'Azul grisáceo' },
  { valor: '#475569', nombre: 'Gris medio oscuro' },
  { valor: '#334155', nombre: 'Grafito' }
]

// ============================================================
// PÁGINA
// ============================================================

export default function ConfiguracionClasesPage() {
  const router =
    useRouter()


  // ==========================================================
  // SESIÓN
  // ==========================================================

  const [
    user,
    setUser,
  ] = useState(null)


  // ==========================================================
  // VISTA ACTUAL
  // ==========================================================

  const [
    vistaActual,
    setVistaActual,
  ] = useState(
    'PLAN'
  )


  // ==========================================================
  // ESTADOS GENERALES
  // ==========================================================

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    guardando,
    setGuardando,
  ] = useState(false)

  const [
    eliminando,
    setEliminando,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    mensaje,
    setMensaje,
  ] = useState('')


  // ==========================================================
  // DATOS
  // ==========================================================

  const [
    planes,
    setPlanes,
  ] = useState([])

  const [
    modulos,
    setModulos,
  ] = useState([])

  const [
    clases,
    setClases,
  ] = useState([])

  const [
    requisitos,
    setRequisitos,
  ] = useState([])

  const [
    gruposTransversales,
    setGruposTransversales,
  ] = useState([])

  const [
    nivelCea,
    setNivelCea,
  ] = useState('')

  const [
    categoriasHabilitadas,
    setCategoriasHabilitadas,
  ] = useState([])

  const [
  logoActualUrl,
  setLogoActualUrl,
] = useState('')

const [
  logoAnteriorUrl,
  setLogoAnteriorUrl,
] = useState('')

const [
  cargandoLogo,
  setCargandoLogo,
] = useState(false)

const [
  guardandoLogo,
  setGuardandoLogo,
] = useState(false)

const [
  archivoLogo,
  setArchivoLogo,
] = useState(null)

  // ==========================================================
  // SELECCIÓN
  // ==========================================================

  const [
    categoriaSeleccionada,
    setCategoriaSeleccionada,
  ] = useState('')

  const [
    planSeleccionadoId,
    setPlanSeleccionadoId,
  ] = useState(null)


  // ==========================================================
  // MODALES CLASES
  // ==========================================================

  const [
    claseEditando,
    setClaseEditando,
  ] = useState(null)

  const [
    nuevaClase,
    setNuevaClase,
  ] = useState(null)

  const [
    claseEliminar,
    setClaseEliminar,
  ] = useState(null)


  // ==========================================================
  // MODALES GRUPOS
  // ==========================================================

  const [
    grupoEditando,
    setGrupoEditando,
  ] = useState(null)

  const [
    grupoEliminar,
    setGrupoEliminar,
  ] = useState(null)

  // Crear/editar datos del grupo sin exponer todas las clases;
  // modificar membresía es una acción independiente.
  const [modoAsociacionesGrupo, setModoAsociacionesGrupo] = useState(false)
  const [filtroTemaGrupo, setFiltroTemaGrupo] = useState('')
  const [mostrarAlternativasGrupo, setMostrarAlternativasGrupo] = useState(false)

  const [edicionTextosGrupo, setEdicionTextosGrupo] = useState(null)


  // ============================================================
  // SESIÓN
  // ============================================================

  useEffect(() => {
    const storedUser =
      localStorage.getItem(
        'currentUser'
      )

    if (!storedUser) {
      router.push(
        '/login'
      )

      return
    }

    try {
      const parsedUser =
        JSON.parse(
          storedUser
        )

      setUser(
        parsedUser
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
  }, [
    router,
  ])


  // ============================================================
  // CERRAR SESIÓN
  // ============================================================

  function cerrarSesion() {
    localStorage.removeItem(
      'currentUser'
    )

    router.replace(
      '/login'
    )
  }


  // ============================================================
  // CAMBIAR VISTA
  // ============================================================

  function cambiarVista(
    vista
  ) {
    setVistaActual(
      vista
    )

    setError('')
    setMensaje('')

    setClaseEditando(
      null
    )

    setNuevaClase(
      null
    )

    setClaseEliminar(
      null
    )

    setGrupoEditando(
      null
    )

    setGrupoEliminar(
      null
    )
  }


  // ============================================================
  // CARGAR DATOS
  // ============================================================

  async function cargarLogo() {
  try {
    setCargandoLogo(
      true
    )

    const nit =
      obtenerNitUsuario(
        user
      )

    if (!nit) {
      throw new Error(
        'No se encontró el NIT del CEA en la sesión actual.'
      )
    }

    const respuesta =
      await fetch(
        `/api/admin/configuracion-academica/logo?nit=${encodeURIComponent(
          nit
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
          'No fue posible cargar el logo institucional.'
      )
    }

    setLogoActualUrl(
      texto(
        data?.logo?.actual
      )
    )

    setLogoAnteriorUrl(
      texto(
        data?.logo?.anterior
      )
    )
  } catch (
    errorLogo
  ) {
    console.error(
      'Error cargando logo:',
      errorLogo
    )

    setLogoActualUrl('')
    setLogoAnteriorUrl('')
  } finally {
    setCargandoLogo(
      false
    )
  }
}

  async function cargarDatos({
    conservarSeleccion = true,
  } = {}) {
    try {
      setCargando(
        true
      )

      setError('')

      const nit =
        obtenerNitUsuario(
          user
        )

      if (!nit) {
        throw new Error(
          'No se encontró el NIT del CEA en la sesión actual.'
        )
      }

      const respuesta =
        await fetch(
          '/api/admin/configuracion-academica',
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
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            'No fue posible cargar la configuración académica.'
        )
      }


      const planesRecibidos =
        Array.isArray(
          data?.planes
        )
          ? data.planes
          : []

      const modulosRecibidos =
        Array.isArray(
          data?.modulos
        )
          ? data.modulos
          : []

      const clasesRecibidas =
        Array.isArray(
          data?.clases
        )
          ? data.clases
          : []

      const requisitosRecibidos =
        Array.isArray(
          data?.requisitos
        )
          ? data.requisitos
          : []

      const gruposRecibidos =
        Array.isArray(
          data?.grupos_transversales
        )
          ? data.grupos_transversales
          : []

      const categoriasRecibidas =
        Array.isArray(
          data?.categorias_habilitadas
        )
          ? data.categorias_habilitadas
          : []


      setPlanes(
        planesRecibidos
      )

      setModulos(
        modulosRecibidos
      )

      setClases(
        clasesRecibidas
      )

      setRequisitos(
        requisitosRecibidos
      )

      setGruposTransversales(
        gruposRecibidos
      )

      setNivelCea(
        texto(
          data?.nivel_cea ||
            data?.empresa
              ?.nivel_cea
        )
      )

      setCategoriasHabilitadas(
        categoriasRecibidas
      )


      if (
        !planesRecibidos.length
      ) {
        setCategoriaSeleccionada(
          ''
        )

        setPlanSeleccionadoId(
          null
        )

        return
      }


      if (
        conservarSeleccion &&
        categoriaSeleccionada
      ) {
        const planesCategoriaActual =
          planesRecibidos.filter(
            (item) =>
              item.categoria ===
              categoriaSeleccionada
          )

        if (
          planesCategoriaActual.length
        ) {
          const planExiste =
            planesCategoriaActual.some(
              (item) =>
                Number(
                  item.id
                ) ===
                Number(
                  planSeleccionadoId
                )
            )

          if (
            !planExiste
          ) {
            setPlanSeleccionadoId(
              planesCategoriaActual[0]
                .id
            )
          }

          return
        }
      }


      const primerPlan =
        planesRecibidos[0]

      setCategoriaSeleccionada(
        primerPlan.categoria
      )

      setPlanSeleccionadoId(
        primerPlan.id
      )
    } catch (
      errorCarga
    ) {
      console.error(
        errorCarga
      )

      setError(
        errorCarga?.message ||
          'Error cargando la información.'
      )
    } finally {
      setCargando(
        false
      )
    }
  }


  useEffect(() => {
  if (!user) {
    return
  }

  cargarDatos({
    conservarSeleccion:
      false,
  })

  cargarLogo()

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  user,
])

function seleccionarArchivoLogo(
  event
) {
  const archivo =
    event.target.files?.[0] ||
    null

  setArchivoLogo(
    archivo
  )

  setError('')
  setMensaje('')
}

async function guardarLogo() {
  if (
    !archivoLogo
  ) {
    setError(
      'Seleccione una imagen para el logo institucional.'
    )

    return
  }

  try {
    setGuardandoLogo(
      true
    )

    setError('')
    setMensaje('')

    const nit =
      obtenerNitUsuario(
        user
      )

    if (!nit) {
      throw new Error(
        'No se encontró el NIT del CEA en la sesión actual.'
      )
    }

    const formData =
      new FormData()

    formData.append(
      'nit',
      nit
    )

    formData.append(
      'archivo',
      archivoLogo
    )

    formData.append(
      'usuario',
      obtenerNombreUsuario(
        user
      )
    )

    const respuesta =
      await fetch(
        '/api/admin/configuracion-academica/logo',
        {
          method:
            'POST',

          headers: {
            'x-cea-nit':
              nit,
          },

          body:
            formData,
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
          'No fue posible guardar el logo institucional.'
      )
    }

    setLogoActualUrl(
      texto(
        data?.logo?.actual
      )
    )

    setLogoAnteriorUrl(
      texto(
        data?.logo?.anterior
      )
    )

    setArchivoLogo(
      null
    )

    setMensaje(
      data?.message ||
        'Logo institucional actualizado correctamente.'
    )
  } catch (
    errorGuardarLogo
  ) {
    console.error(
      errorGuardarLogo
    )

    setError(
      errorGuardarLogo?.message ||
        'Error guardando el logo institucional.'
    )
  } finally {
    setGuardandoLogo(
      false
    )
  }
}

async function restaurarLogoAnterior() {
  if (
    !logoAnteriorUrl
  ) {
    return
  }

  const confirmar =
    window.confirm(
      '¿Está seguro de restaurar el logo anterior? El logo actual quedará disponible como logo anterior.'
    )

  if (!confirmar) {
    return
  }

  try {
    setGuardandoLogo(
      true
    )

    setError('')
    setMensaje('')

    const nit =
      obtenerNitUsuario(
        user
      )

    if (!nit) {
      throw new Error(
        'No se encontró el NIT del CEA en la sesión actual.'
      )
    }

    const respuesta =
      await fetch(
        '/api/admin/configuracion-academica/logo',
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
                'RESTAURAR_ANTERIOR',

              usuario:
                obtenerNombreUsuario(
                  user
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
          'No fue posible restaurar el logo anterior.'
      )
    }

    setLogoActualUrl(
      texto(
        data?.logo?.actual
      )
    )

    setLogoAnteriorUrl(
      texto(
        data?.logo?.anterior
      )
    )

    setMensaje(
      data?.message ||
        'Logo anterior restaurado correctamente.'
    )
  } catch (
    errorRestaurar
  ) {
    console.error(
      errorRestaurar
    )

    setError(
      errorRestaurar?.message ||
        'Error restaurando el logo anterior.'
    )
  } finally {
    setGuardandoLogo(
      false
    )
  }
}


  // ============================================================
  // CATEGORÍAS
  // ============================================================

  const categorias =
    useMemo(() => {
      const categoriasConPlan =
        Array.from(
          new Set(
            planes.map(
              (item) =>
                item.categoria
            )
          )
        )

      if (
        categoriasHabilitadas.length
      ) {
        return categoriasHabilitadas
      }

      return categoriasConPlan
    }, [
      planes,
      categoriasHabilitadas,
    ])


  const planesCategoria =
    useMemo(() => {
      return planes.filter(
        (item) =>
          item.categoria ===
          categoriaSeleccionada
      )
    }, [
      planes,
      categoriaSeleccionada,
    ])


  const planSeleccionado =
    useMemo(() => {
      return (
        planes.find(
          (item) =>
            Number(
              item.id
            ) ===
            Number(
              planSeleccionadoId
            )
        ) ||
        null
      )
    }, [
      planes,
      planSeleccionadoId,
    ])


  const modulosPlan =
    useMemo(() => {
      if (
        !planSeleccionado
      ) {
        return []
      }

      return modulos
        .filter(
          (item) =>
            Number(
              item.plan_formacion_id
            ) ===
            Number(
              planSeleccionado.id
            )
        )
        .sort(
          (a, b) =>
            Number(
              a.orden
            ) -
            Number(
              b.orden
            )
        )
    }, [
      modulos,
      planSeleccionado,
    ])


  const clasesPlan =
    useMemo(() => {
      if (
        !planSeleccionado
      ) {
        return []
      }

      return clases.filter(
        (item) =>
          Number(
            item.plan_formacion_id
          ) ===
          Number(
            planSeleccionado.id
          )
      )
    }, [
      clases,
      planSeleccionado,
    ])


  const requisitoCategoria =
    useMemo(() => {
      return (
        requisitos.find(
          (item) =>
            item.categoria ===
            categoriaSeleccionada
        ) ||
        null
      )
    }, [
      requisitos,
      categoriaSeleccionada,
    ])


  // ============================================================
  // CLASES AGRUPABLES
  // ============================================================

  const clasesAgrupables =
    useMemo(() => {
      return clases
        .filter(
          (clase) =>
            clase.activo !==
              false &&
            [
              'TEORIA',
              'TALLER',
            ].includes(
              mayusculas(
                clase.tipo_formacion
              )
            )
        )
        .sort(
          (
            a,
            b
          ) => {
            const tipo =
              mayusculas(
                a.tipo_formacion
              ).localeCompare(
                mayusculas(
                  b.tipo_formacion
                )
              )

            if (
              tipo !==
              0
            ) {
              return tipo
            }

            const nombre =
              texto(
                a.nombre
              ).localeCompare(
                texto(
                  b.nombre
                )
              )

            if (
              nombre !==
              0
            ) {
              return nombre
            }

            return texto(
              a.categoria
            ).localeCompare(
              texto(
                b.categoria
              )
            )
          }
        )
    }, [
      clases,
    ])


  // ============================================================
  // RESUMEN
  // ============================================================

  const resumen =
    useMemo(() => {
      const teoria =
        clasesPlan.filter(
          (item) =>
            item.tipo_formacion ===
              'TEORIA' &&
            item.activo !==
              false
        )

      const taller =
        clasesPlan.filter(
          (item) =>
            item.tipo_formacion ===
              'TALLER' &&
            item.activo !==
              false
        )

      const practica =
        clasesPlan.filter(
          (item) =>
            item.tipo_formacion ===
              'PRACTICA' &&
            item.activo !==
              false
        )


      const horasTeoria =
        teoria.reduce(
          (
            total,
            item
          ) =>
            total +
            numero(
              item.duracion_horas
            ),
          0
        )


      const horasTaller =
        taller.reduce(
          (
            total,
            item
          ) =>
            total +
            numero(
              item.duracion_horas
            ),
          0
        )


      return {
        teoria: {
          cantidad:
            teoria.length,

          configuradas:
            horasTeoria,

          requeridas:
            requisitoCategoria
              ? Number(
                  requisitoCategoria
                    .clases_teoria
                )
              : null,
        },

        taller: {
          cantidad:
            taller.length,

          configuradas:
            horasTaller,

          requeridas:
            requisitoCategoria
              ? Number(
                  requisitoCategoria
                    .clases_taller
                )
              : null,
        },

        practica: {
          cantidad:
            practica.length,

          requeridas:
            requisitoCategoria
              ? Number(
                  requisitoCategoria
                    .clases_practica
                )
              : null,
        },
      }
    }, [
      clasesPlan,
      requisitoCategoria,
    ])


  // ============================================================
  // NAVEGACIÓN
  // ============================================================

  function regresar() {
    router.push(
      '/admin/configuracion-academica'
    )
  }


  // ============================================================
  // CAMBIAR CATEGORÍA
  // ============================================================

  function seleccionarCategoria(
    categoria
  ) {
    setCategoriaSeleccionada(
      categoria
    )

    const primerPlan =
      planes.find(
        (item) =>
          item.categoria ===
          categoria
      )

    setPlanSeleccionadoId(
      primerPlan?.id ||
        null
    )

    setClaseEditando(
      null
    )

    setNuevaClase(
      null
    )

    setClaseEliminar(
      null
    )

    setMensaje('')
    setError('')
  }


  // ============================================================
  // EDITAR CLASE
  // ============================================================

  function abrirEdicion(
  clase
) {
  setClaseEditando({
    ...clase,

    duracion_horas:
      clase.duracion_horas ??
      '',

    color_horario:
      texto(
        clase.color_horario
      ),
  })

    setMensaje('')
    setError('')
  }


  function cerrarEdicion() {
    if (
      guardando
    ) {
      return
    }

    setClaseEditando(
      null
    )
  }


  function cambiarCampoEdicion(
    campo,
    valor
  ) {
    setClaseEditando(
      (
        anterior
      ) => ({
        ...anterior,

        [campo]:
          valor,
      })
    )
  }


  // ============================================================
  // NUEVA CLASE
  // ============================================================

  function abrirNuevaClase() {
    // El formulario inicia sin categoría ni módulo, independientemente del plan visible.
    setNuevaClase({
      modulo_id: '',
      modulo_referencia_id: '',
      categorias_destino: [],
      nombre_grupo: '',
      modulo_nombre: '',
      tipo_formacion: '',
      categoria: '',
      nombre: '',
      duracion_horas: '',
      contenido: '',
      contenido_tarjeta: '',
      observaciones: '',
      color_horario: '',
      activo: true,
    })
    setError('')
    setMensaje('')
  }

  // Localiza el módulo correspondiente al CEA/categoría sin forzar una
  // categoría principal en el formulario.
  function moduloEquivalenteNueva(moduloReferencia, categoria) {
    if (!moduloReferencia || !categoria) return null
    const planesCat = planes.filter(plan =>
      plan.categoria === categoria && plan.estado === 'ACTIVO')
    const candidatos = modulos.filter(modulo =>
      modulo.activo !== false &&
      planesCat.some(plan => Number(plan.id) === Number(modulo.plan_formacion_id)) &&
      mayusculas(modulo.codigo) === mayusculas(moduloReferencia.codigo) &&
      mayusculas(modulo.tipo_formacion) === mayusculas(moduloReferencia.tipo_formacion) &&
      mayusculas(modulo.nombre) === mayusculas(moduloReferencia.nombre))
    return candidatos.length === 1 ? candidatos[0] : null
  }

  function cambiarModuloNueva(moduloId) {
    const modulo = modulos.find(m => Number(m.id) === Number(moduloId))
    if (!modulo) return
    const seleccionActual = nuevaClase?.categorias_destino || []
    const compatibles = seleccionActual.filter(cat => Boolean(moduloEquivalenteNueva(modulo, cat)))
    const categoria = compatibles[0] || ''
    const moduloOrigen = categoria ? moduloEquivalenteNueva(modulo, categoria) : modulo
    setNuevaClase(anterior => ({
      ...anterior,
      modulo_id: moduloOrigen.id,
      modulo_referencia_id: modulo.id,
      modulo_nombre: moduloOrigen.nombre,
      tipo_formacion: moduloOrigen.tipo_formacion,
      categoria,
      categorias_destino: compatibles,
      nombre_grupo: compatibles.length > 1 ? anterior.nombre_grupo : '',
      duracion_horas: moduloOrigen.tipo_formacion === 'PRACTICA' ? '' : anterior.duracion_horas,
    }))
  }

  function alternarCategoriaNueva(categoria, marcada) {
    setNuevaClase(anterior => {
      const referencias = modulos.find(m => Number(m.id) === Number(anterior.modulo_referencia_id || anterior.modulo_id))
      if (!referencias) return anterior
      const disponibles = anterior.categorias_destino || []
      const seleccion = marcada
        ? [...new Set([...disponibles, categoria])]
        : disponibles.filter(cat => cat !== categoria)
      if (referencias.tipo_formacion === 'PRACTICA' && seleccion.length > 1) return anterior
      const primera = seleccion[0] || ''
      const moduloOrigen = primera ? moduloEquivalenteNueva(referencias, primera) : referencias
      if (!moduloOrigen) return anterior
      return {
        ...anterior, categoria: primera, categorias_destino: seleccion,
        modulo_id: moduloOrigen.id, modulo_nombre: moduloOrigen.nombre,
        nombre_grupo: seleccion.length > 1 ? anterior.nombre_grupo : '',
      }
    })
  }

  function cerrarNuevaClase() {
    if (
      guardando
    ) {
      return
    }

    setNuevaClase(
      null
    )
  }


  function cambiarCampoNueva(
    campo,
    valor
  ) {
    setNuevaClase(
      (
        anterior
      ) => ({
        ...anterior,

        [campo]:
          valor,
      })
    )
  }


  // ============================================================
  // GUARDAR CLASE
  // ============================================================

  async function guardarClase() {
    if (
      !claseEditando
    ) {
      return
    }

    const nombre =
      texto(
        claseEditando.nombre
      )

    if (!nombre) {
      setError(
        'El nombre de la clase es obligatorio.'
      )

      return
    }

    try {
      setGuardando(
        true
      )

      setError('')
      setMensaje('')

      const nit =
        obtenerNitUsuario(
          user
        )

      if (!nit) {
        throw new Error(
          'No se encontró el NIT del CEA en la sesión actual.'
        )
      }

      const respuesta =
        await fetch(
          '/api/admin/configuracion-academica',
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

                id:
                  claseEditando.id,

                nombre,

                duracion_horas:
                  claseEditando
                    .tipo_formacion ===
                  'PRACTICA'
                    ? null
                    : claseEditando
                          .duracion_horas ===
                        ''
                      ? null
                      : Number(
                          claseEditando
                            .duracion_horas
                        ),

                contenido:
                  claseEditando
                    .contenido ||
                  '',

                contenido_tarjeta:
                  claseEditando
                    .contenido_tarjeta ||
                  '',

                observaciones:
                  claseEditando
                    .observaciones ||
                  '',

                color_horario:
                  texto(
                    claseEditando
                      .color_horario
                  ) ||
                  null,

                activo:
                  claseEditando
                    .activo !==
                  false,
              }),
          }
        )

      const data =
        await respuesta.json()

      if (
        !respuesta.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            'No fue posible guardar la clase.'
        )
      }

      setClases(
        (
          anteriores
        ) =>
          anteriores.map(
            (item) =>
              Number(
                item.id
              ) ===
              Number(
                data.clase.id
              )
                ? {
                    ...item,
                    ...data.clase,
                  }
                : item
          )
      )

      setMensaje(
        data?.mensaje ||
          'Clase actualizada correctamente.'
      )

      setClaseEditando(
        null
      )

      await cargarDatos({
        conservarSeleccion:
          true,
      })
    } catch (
      errorGuardar
    ) {
      console.error(
        errorGuardar
      )

      setError(
        errorGuardar?.message ||
          'Error guardando la clase.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  async function alternarEstadoClase(clase) {
    const nuevoEstado = clase.activo === false
    if (!window.confirm(nuevoEstado
      ? '¿Activar la clase "' + clase.nombre + '"?'
      : '¿Desactivar la clase "' + clase.nombre + '"? Puede afectar su disponibilidad para la programación futura.')) return
    try {
      setGuardando(true)
      setError('')
      setMensaje('')
      const nit = obtenerNitUsuario(user)
      const respuesta = await fetch('/api/admin/configuracion-academica', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-cea-nit': nit },
        body: JSON.stringify({
          nit, id: clase.id, nombre: clase.nombre,
          duracion_horas: clase.tipo_formacion === 'PRACTICA' ? null : clase.duracion_horas,
          contenido: clase.contenido || '',
          contenido_tarjeta: clase.contenido_tarjeta || '',
          observaciones: clase.observaciones || '',
          color_horario: clase.color_horario || null,
          activo: nuevoEstado,
        }),
      })
      const data = await respuesta.json()
      if (!respuesta.ok || !data?.ok) throw new Error(data?.error || 'No fue posible cambiar el estado.')
      await cargarDatos({ conservarSeleccion: true })
      setMensaje(nuevoEstado ? 'Clase activada correctamente.' : 'Clase desactivada correctamente.')
    } catch (e) {
      setError(e?.message || 'No fue posible actualizar el estado.')
    } finally {
      setGuardando(false)
    }
  }

  // ============================================================
  // GUARDAR NUEVA CLASE
  // ============================================================

  async function guardarNuevaClase() {
    if (
      !nuevaClase
    ) {
      return
    }

    if (!nuevaClase.categoria || !nuevaClase.modulo_id || !nuevaClase.tipo_formacion) {
      setError('Seleccione el módulo de formación y al menos una categoría habilitada antes de guardar.')
      return
    }

    const nombre =
      texto(
        nuevaClase.nombre
      )

    if (!nombre) {
      setError(
        'El nombre de la nueva clase es obligatorio.'
      )

      return
    }

    const categoriasDestino = Array.from(new Set(nuevaClase.categorias_destino || [nuevaClase.categoria]))
    const compartida = nuevaClase.tipo_formacion !== 'PRACTICA' && categoriasDestino.length > 1
    if (!categoriasDestino.includes(nuevaClase.categoria)) {
      setError('Seleccione al menos una categoría correspondiente al módulo.')
      return
    }
    if (compartida && (!Number.isFinite(Number(nuevaClase.duracion_horas)) || Number(nuevaClase.duracion_horas) <= 0)) {
      setError('Para clases compartidas indique una duración mayor que cero.')
      return
    }
    if (compartida && !window.confirm(
      'Se creará o reutilizará una clase en cada categoría seleccionada y se asociarán a un grupo transversal. ¿Continuar?'
    )) return

    if (
      nuevaClase.tipo_formacion !==
        'PRACTICA' &&
      nuevaClase.duracion_horas !==
        '' &&
      (
        !Number.isFinite(
          Number(
            nuevaClase
              .duracion_horas
          )
        ) ||
        Number(
          nuevaClase
            .duracion_horas
        ) <= 0
      )
    ) {
      setError(
        'La duración debe ser un número mayor que cero.'
      )

      return
    }

    try {
      setGuardando(
        true
      )

      setError('')
      setMensaje('')

      const nit =
        obtenerNitUsuario(
          user
        )

      if (!nit) {
        throw new Error(
          'No se encontró el NIT del CEA en la sesión actual.'
        )
      }

      const respuesta =
        await fetch(
          '/api/admin/configuracion-academica',
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
                ...(compartida ? {
                  recurso: 'CLASE_COMPARTIDA',
                  categorias: categoriasDestino,
                  nombre_grupo: texto(nuevaClase.nombre_grupo) || nombre,
                } : {}),

                modulo_id:
                  nuevaClase
                    .modulo_id,

                nombre,

                duracion_horas:
                  nuevaClase
                    .tipo_formacion ===
                  'PRACTICA'
                    ? null
                    : nuevaClase
                          .duracion_horas ===
                        ''
                      ? null
                      : Number(
                          nuevaClase
                            .duracion_horas
                        ),

                contenido:
                  nuevaClase
                    .contenido ||
                  '',

                contenido_tarjeta:
                  nuevaClase
                    .contenido_tarjeta ||
                  '',

                observaciones:
                  nuevaClase
                    .observaciones ||
                  '',

                color_horario:
                  texto(
                    nuevaClase
                      .color_horario
                  ) ||
                  null,

                activo:
                  nuevaClase
                    .activo !==
                  false,
              }),
          }
        )

      const data =
        await respuesta.json()

      if (
        !respuesta.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            'No fue posible crear la clase.'
        )
      }

      setNuevaClase(
        null
      )

      setMensaje(
        data?.mensaje ||
          'Clase creada correctamente.'
      )

      await cargarDatos({
        conservarSeleccion:
          true,
      })
    } catch (
      errorCrear
    ) {
      console.error(
        errorCrear
      )

      setError(
        errorCrear?.message ||
          'Error creando la clase.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  // ============================================================
  // ELIMINAR CLASE
  // ============================================================

  function solicitarEliminar(
    clase
  ) {
    setClaseEliminar(
      clase
    )

    setError('')
    setMensaje('')
  }


  function cancelarEliminar() {
    if (
      eliminando
    ) {
      return
    }

    setClaseEliminar(
      null
    )
  }


  async function confirmarEliminar() {
    if (
      !claseEliminar
    ) {
      return
    }

    try {
      setEliminando(
        true
      )

      setError('')
      setMensaje('')

      const nit =
        obtenerNitUsuario(
          user
        )

      if (!nit) {
        throw new Error(
          'No se encontró el NIT del CEA en la sesión actual.'
        )
      }

      const respuesta =
        await fetch(
          '/api/admin/configuracion-academica',
          {
            method:
              'DELETE',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nit,
            },

            body:
              JSON.stringify({
                nit,

                id:
                  claseEliminar.id,
              }),
          }
        )

      const data =
        await respuesta.json()

      if (
        !respuesta.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            'No fue posible eliminar la clase.'
        )
      }

      setClaseEliminar(
        null
      )

      setMensaje(
        data?.mensaje ||
          'Clase eliminada correctamente.'
      )

      await cargarDatos({
        conservarSeleccion:
          true,
      })
    } catch (
      errorEliminar
    ) {
      console.error(
        errorEliminar
      )

      setError(
        errorEliminar?.message ||
          'Error eliminando la clase.'
      )
    } finally {
      setEliminando(
        false
      )
    }
  }


  // ============================================================
  // NUEVO GRUPO
  // ============================================================

  function abrirNuevoGrupo() {
    setModoAsociacionesGrupo(true)
    setFiltroTemaGrupo('')
    setMostrarAlternativasGrupo(false)
    setGrupoEditando({
      id:
        null,

      esNuevo:
        true,

      nombre:
        '',

      tipo_formacion:
        'TEORIA',

      clase_ids:
        [],

      activo:
        true,

      observaciones:
        '',

      color_horario:
        '',
    })

    setError('')
    setMensaje('')
  }


  // ============================================================
  // EDITAR GRUPO
  // ============================================================

  function abrirEditarGrupo(
    grupo
  ) {
    setModoAsociacionesGrupo(false)
    setFiltroTemaGrupo('')
    setMostrarAlternativasGrupo(false)
    setGrupoEditando({
      id:
        grupo.id,

      esNuevo:
        false,

      nombre:
        grupo.nombre ||
        '',

      tipo_formacion:
        grupo.tipo_formacion ||
        'TEORIA',

      clase_ids:
        Array.isArray(
          grupo.clases
        )
          ? grupo.clases.map(
              (clase) =>
                Number(
                  clase.id
                )
            )
          : [],

      activo:
        grupo.activo !==
        false,

      observaciones:
        grupo.observaciones ||
        '',

      color_horario:
        texto(
          grupo.color_horario
        ),
    })

    setError('')
    setMensaje('')
  }


  function cerrarGrupo() {
    if (
      guardando
    ) {
      return
    }

    setGrupoEditando(
      null
    )
  }


  function cambiarCampoGrupo(
    campo,
    valor
  ) {
    setGrupoEditando(
      (
        anterior
      ) => ({
        ...anterior,

        [campo]:
          valor,
      })
    )
  }


  function cambiarTipoGrupo(
    tipo
  ) {
    setFiltroTemaGrupo('')
    setMostrarAlternativasGrupo(false)
    setGrupoEditando(
      (
        anterior
      ) => ({
        ...anterior,

        tipo_formacion:
          tipo,

        clase_ids:
          [],
      })
    )
  }


  function alternarClaseGrupo(
    claseId
  ) {
    setGrupoEditando(
      (
        anterior
      ) => {
        const id =
          Number(
            claseId
          )

        const actuales =
          Array.isArray(
            anterior.clase_ids
          )
            ? anterior.clase_ids
            : []

        const existe =
          actuales.includes(
            id
          )

        return {
          ...anterior,

          clase_ids:
            existe
              ? actuales.filter(
                  (item) =>
                    item !==
                    id
                )
              : [
                  ...actuales,
                  id,
                ],
        }
      }
    )
  }


  function obtenerGrupoClase(
    claseId
  ) {
    return (
      gruposTransversales.find(
        (grupo) =>
          Number(
            grupo.id
          ) !==
            Number(
              grupoEditando?.id
            ) &&
          Array.isArray(
            grupo.clases
          ) &&
          grupo.clases.some(
            (clase) =>
              Number(
                clase.id
              ) ===
              Number(
                claseId
              )
          )
      ) ||
      null
    )
  }


  // ============================================================
  // GUARDAR GRUPO
  // ============================================================

  async function guardarGrupoTransversal() {
    if (
      !grupoEditando
    ) {
      return
    }

    const nombre =
      texto(
        grupoEditando.nombre
      )

    if (!nombre) {
      setError(
        'El nombre del grupo transversal es obligatorio.'
      )

      return
    }

    const claseIds =
      Array.isArray(
        grupoEditando.clase_ids
      )
        ? grupoEditando.clase_ids
        : []

    if (
      claseIds.length <
      2
    ) {
      setError(
        'Debe seleccionar por lo menos dos clases de categorías diferentes.'
      )

      return
    }


    const clasesSeleccionadas =
      clasesAgrupables.filter(
        (clase) =>
          claseIds.includes(
            Number(
              clase.id
            )
          )
      )


    const categoriasSeleccionadas =
      clasesSeleccionadas.map(
        (clase) =>
          mayusculas(
            clase.categoria
          )
      )


    if (
      new Set(
        categoriasSeleccionadas
      ).size !==
      categoriasSeleccionadas.length
    ) {
      setError(
        'No puede seleccionar más de una clase de la misma categoría.'
      )

      return
    }


    try {
      setGuardando(
        true
      )

      setError('')
      setMensaje('')

      const nit =
        obtenerNitUsuario(
          user
        )

      if (!nit) {
        throw new Error(
          'No se encontró el NIT del CEA en la sesión actual.'
        )
      }


      const respuesta =
        await fetch(
          '/api/admin/configuracion-academica',
          {
            method:
              grupoEditando.esNuevo
                ? 'POST'
                : 'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nit,
            },

            body:
              JSON.stringify({
                nit,

                recurso:
                  'GRUPO_TRANSVERSAL',

                ...(grupoEditando.esNuevo
                  ? {}
                  : {
                      id:
                        grupoEditando.id,
                    }),

                nombre,

                tipo_formacion:
                  grupoEditando
                    .tipo_formacion,

                clase_ids:
                  claseIds,

                activo:
                  grupoEditando.activo !==
                  false,

                observaciones:
                  grupoEditando
                    .observaciones ||
                  '',

                color_horario:
                  texto(
                    grupoEditando
                      .color_horario
                  ) ||
                  null,

                usuario:
                  obtenerNombreUsuario(
                    user
                  ),
              }),
          }
        )


      const data =
        await respuesta.json()


      if (
        !respuesta.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            'No fue posible guardar el grupo transversal.'
        )
      }


      setGrupoEditando(
        null
      )

      setMensaje(
        data?.mensaje ||
          'Grupo transversal guardado correctamente.'
      )


      await cargarDatos({
        conservarSeleccion:
          true,
      })
    } catch (
      errorGrupo
    ) {
      console.error(
        errorGrupo
      )

      setError(
        errorGrupo?.message ||
          'Error guardando el grupo transversal.'
      )
    } finally {
      setGuardando(
        false
      )
    }
  }


  // ============================================================
  // ELIMINAR GRUPO
  // ============================================================

  function solicitarEliminarGrupo(
    grupo
  ) {
    setGrupoEliminar(
      grupo
    )

    setError('')
    setMensaje('')
  }


  function cancelarEliminarGrupo() {
    if (
      eliminando
    ) {
      return
    }

    setGrupoEliminar(
      null
    )
  }


  async function confirmarEliminarGrupo() {
    if (
      !grupoEliminar
    ) {
      return
    }

    try {
      setEliminando(
        true
      )

      setError('')
      setMensaje('')

      const nit =
        obtenerNitUsuario(
          user
        )

      if (!nit) {
        throw new Error(
          'No se encontró el NIT del CEA en la sesión actual.'
        )
      }


      const respuesta =
        await fetch(
          '/api/admin/configuracion-academica',
          {
            method:
              'DELETE',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nit,
            },

            body:
              JSON.stringify({
                nit,

                recurso:
                  'GRUPO_TRANSVERSAL',

                id:
                  grupoEliminar.id,
              }),
          }
        )


      const data =
        await respuesta.json()


      if (
        !respuesta.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            'No fue posible eliminar el grupo transversal.'
        )
      }


      setGrupoEliminar(
        null
      )

      setMensaje(
        data?.mensaje ||
          'Grupo transversal eliminado correctamente.'
      )


      await cargarDatos({
        conservarSeleccion:
          true,
      })
    } catch (
      errorEliminarGrupo
    ) {
      console.error(
        errorEliminarGrupo
      )

      setError(
        errorEliminarGrupo?.message ||
          'Error eliminando el grupo transversal.'
      )
    } finally {
      setEliminando(
        false
      )
    }
  }



  function abrirTextosGrupo(grupo) {
    const miembros = Array.isArray(grupo.clases) ? grupo.clases : []
    const ids = miembros.map(clase => Number(clase.id))
    const primera = clases.find(clase => Number(clase.id) === ids[0])
    setEdicionTextosGrupo({
      id: grupo.id,
      nombre: grupo.nombre,
      miembros,
      clase_ids: ids,
      contenido: texto(primera?.contenido),
      contenido_tarjeta: texto(primera?.contenido_tarjeta),
      actualizar_contenido: true,
      actualizar_tarjeta: true,
    })
    setError('')
    setMensaje('')
  }

  function cambiarTextosGrupo(campo, valor) {
    setEdicionTextosGrupo(anterior => anterior ? { ...anterior, [campo]: valor } : anterior)
  }

  async function guardarTextosGrupo() {
    if (!edicionTextosGrupo || guardando) return
    const form = edicionTextosGrupo
    if (!form.clase_ids.length) {
      setError('Seleccione al menos una categoría.')
      return
    }
    if ((!form.actualizar_contenido && !form.actualizar_tarjeta) ||
        (form.actualizar_contenido && !texto(form.contenido)) ||
        (form.actualizar_tarjeta && !texto(form.contenido_tarjeta))) {
      setError('Seleccione los campos que actualizará e ingrese sus textos.')
      return
    }
    const resumen = form.miembros
      .filter(clase => form.clase_ids.includes(Number(clase.id)))
      .map(clase => clase.categoria + ' — ' + clase.nombre)
      .join('\n')
    if (!window.confirm(
      'Se reemplazarán únicamente los textos seleccionados en las siguientes clases:\n\n' +
      resumen + '\n\n¿Desea continuar?'
    )) return

    try {
      setGuardando(true)
      setError('')
      setMensaje('')
      const nit = obtenerNitUsuario(user)
      const respuesta = await fetch('/api/admin/configuracion-academica', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-cea-nit': nit },
        body: JSON.stringify({
          nit,
          recurso: 'CONTENIDOS_GRUPO',
          grupo_id: form.id,
          clase_ids: form.clase_ids,
          actualizar_contenido: form.actualizar_contenido,
          actualizar_tarjeta: form.actualizar_tarjeta,
          contenido: form.contenido,
          contenido_tarjeta: form.contenido_tarjeta,
        }),
      })
      const data = await respuesta.json()
      if (!respuesta.ok || !data?.ok) throw new Error(data?.error || 'No fue posible guardar los textos del grupo.')
      setEdicionTextosGrupo(null)
      await cargarDatos({ conservarSeleccion: true })
      setMensaje(data.message || 'Textos actualizados correctamente.')
    } catch (err) {
      setError(err?.message || 'No fue posible actualizar el grupo.')
    } finally {
      setGuardando(false)
    }
  }

  // ============================================================
  // CLASES DEL GRUPO
  // ============================================================

  const clasesGrupoDisponibles =
    useMemo(() => {
      if (
        !grupoEditando
      ) {
        return []
      }

      return clasesAgrupables.filter(
        (clase) =>
          mayusculas(
            clase.tipo_formacion
          ) ===
          mayusculas(
            grupoEditando
              .tipo_formacion
          )
      )
    }, [
      clasesAgrupables,
      grupoEditando,
    ])


  // Opciones derivadas del plan de cada CEA; no se fija un catálogo curricular global.
  const opcionesReferenciaGrupo = useMemo(() => {
    if (!grupoEditando) return []
    return clasesAgrupables.filter(clase =>
      mayusculas(clase.tipo_formacion) === mayusculas(grupoEditando.tipo_formacion) &&
      !gruposTransversales.some(grupo =>
        Number(grupo.id) !== Number(grupoEditando.id) &&
        (grupo.clases || []).some(miembro => Number(miembro.id) === Number(clase.id))
      )
    )
  }, [grupoEditando, clasesAgrupables, gruposTransversales])

  const clasesGrupoFiltradas = useMemo(() => {
    if (!grupoEditando) return []
    const filtro = mayusculas(filtroTemaGrupo)
    return clasesGrupoDisponibles.filter(clase => {
      const seleccionada = grupoEditando.clase_ids.includes(Number(clase.id))
      if (seleccionada) return true
      if (!mostrarAlternativasGrupo && !filtro) return false
      if (!filtro) return true
      return mayusculas(clase.nombre).includes(filtro)
    })
  }, [grupoEditando, clasesGrupoDisponibles, filtroTemaGrupo, mostrarAlternativasGrupo])

  // ============================================================
  // CARGANDO SESIÓN
  // ============================================================

  if (!user) {
    return (
      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-gradient-to-br
          from-gray-100
          to-gray-200
        "
      >
        <p
          className="
            text-gray-600
          "
        >
          Cargando...
        </p>
      </div>
    )
  }


  // ============================================================
  // CARGANDO DATOS
  // ============================================================

  if (
    cargando
  ) {
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
            mx-auto
            max-w-6xl
            rounded-xl
            border
            border-gray-200
            bg-white
            p-6
            shadow-lg
          "
        >
          <div
            className="
              text-center
              text-sm
              text-gray-600
            "
          >
            Cargando configuración
            de clases y contenidos...
          </div>
        </div>
      </div>
    )
  }


  // ============================================================
  // RENDER
  // ============================================================

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
          mx-auto
          w-full
          max-w-7xl
          space-y-5
        "
      >

        {/* ====================================================
            ENCABEZADO
        ==================================================== */}

        <EncabezadoModulo
          titulo="Configuración de Clases y Contenidos"
          subtitulo="Planes de formación, intensidad horaria, contenidos y clases transversales."
          icono={BookOpen}
          rutaRegreso="/admin/configuracion-academica"
          textoRegreso="Configuración Académica"
        />

            {/* ====================================================
                LOGO INSTITUCIONAL
            ==================================================== */}

            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-slate-700
                bg-white
                shadow-md
              "
            >
              <div
                className="
                  bg-[#194567]
                  px-4
                  py-3
                  text-white
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-bold
                    uppercase
                    tracking-wide
                  "
                >
                  <i
                    className="
                      fas
                      fa-image
                    "
                  ></i>

                  Logo institucional
                </div>

                <div
                  className="
                    mt-1
                    text-xs
                    text-slate-300
                  "
                >
                  Este logo será utilizado en
                  horarios, controles de clase,
                  contratos y documentos académicos.
                </div>
              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  gap-5
                  p-5
                  lg:grid-cols-[220px_1fr]
                "
              >
                <div
                  className="
                    flex
                    min-h-[150px]
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-blue-300
                    bg-blue-50
                    p-4
                    shadow-sm
                  "
                >
                  {cargandoLogo ? (
                    <div
                      className="
                        text-center
                        text-xs
                        text-slate-500
                      "
                    >
                      Cargando logo...
                    </div>
                  ) : logoActualUrl ? (
                    <img
                      src={
                        logoActualUrl
                      }
                      alt="Logo institucional"
                      className="
                        max-h-[130px]
                        max-w-full
                        object-contain
                      "
                    />
                  ) : (
                    <div
                      className="
                        text-center
                        text-slate-400
                      "
                    >
                      <i
                        className="
                          fas
                          fa-image
                          text-4xl
                        "
                      ></i>

                      <div
                        className="
                          mt-2
                          text-xs
                          font-semibold
                        "
                      >
                        Sin logo configurado
                      </div>
                    </div>
                  )}
                </div>


                <div
                  className="
                    space-y-4
                  "
                >
                  <div>
                    <label
                      className="
                        mb-1
                        block
                        text-xs
                        font-semibold
                        text-slate-700
                      "
                    >
                      Seleccionar imagen
                    </label>

                    <input
                      type="file"
                      accept="
                        image/jpeg,
                        image/png,
                        image/webp
                      "
                      onChange={
                        seleccionarArchivoLogo
                      }
                      className="
                        block
                        w-full
                        rounded-lg
                        border
                        border-gray-600
                        bg-white
                        px-3
                        py-2
                        text-xs
                        text-slate-700
                        transition
                        hover:border-blue-500
                        hover:bg-blue-100
                      "
                    />

                    <div
                      className="
                        mt-1
                        text-xs
                        text-slate-500
                      "
                    >
                      Formatos permitidos:
                      JPG, PNG o WEBP.
                      Tamaño máximo: 3 MB.
                    </div>
                  </div>


                  {archivoLogo && (
                    <div
                      className="
                        rounded-lg
                        border
                        border-blue-200
                        bg-blue-50
                        px-3
                        py-2
                        text-xs
                        font-semibold
                        text-blue-800
                      "
                    >
                      Archivo seleccionado:{' '}

                      {
                        archivoLogo.name
                      }
                    </div>
                  )}


                  <div
                    className="
                      flex
                      flex-wrap
                      gap-2
                    "
                  >
                    <button
                        type="button"
                        disabled={
                          guardandoLogo ||
                          !archivoLogo
                        }
                        onClick={
                          guardarLogo
                        }
                        className={`
                          flex
                          items-center
                          gap-2
                          rounded-lg
                          px-4
                          py-2
                          text-xs
                          font-bold
                          transition
                          hover:border-blue-500
                          hover:bg-blue-100
                          ${
                            archivoLogo
                              ? `
                                bg-[var(--primary)]
                                text-white
                                shadow-sm
                                hover:opacity-90
                              `
                              : `
                                border
                                border-slate-300
                                bg-slate-100
                                text-slate-500
                              `
                          }
                          disabled:cursor-not-allowed
                        `}
                      >
                      <i
                        className="
                          fas
                          fa-upload
                        "
                      ></i>

                      {guardandoLogo
                        ? 'Guardando...'
                        : logoActualUrl
                          ? 'Cambiar logo'
                          : 'Guardar logo'}
                    </button>


                    {logoAnteriorUrl && (
                      <BotonAccion tipo="actualizar"
                        type="button"
                        disabled={
                          guardandoLogo
                        }
                        onClick={
                          restaurarLogoAnterior
                        }
                        
                      >
                        <i
                          className="
                            fas
                            fa-rotate-left
                          "
                        ></i>

                        Restaurar logo anterior
                      </BotonAccion>
                    )}
                  </div>


                  {logoAnteriorUrl && (
                    <div
                      className="
                        rounded-lg
                        border
                        border-slate-200
                        bg-slate-50
                        p-3
                      "
                    >
                      <div
                        className="
                          mb-2
                          text-xs
                          font-bold
                          uppercase
                          text-slate-500
                        "
                      >
                        Logo anterior disponible
                      </div>

                      <img
                        src={
                          logoAnteriorUrl
                        }
                        alt="Logo anterior"
                        className="
                          max-h-16
                          max-w-[180px]
                          object-contain
                        "
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          
        {/* ====================================================
            SELECTOR DE VISTA
        ==================================================== */}

        <div
          className="
            border-b-2 border-[#194567] bg-transparent px-1 pt-1
          "
        >
          <div
            className="
              flex flex-wrap items-end justify-start gap-1
            "
          >
            <button
              type="button"
              onClick={() =>
                cambiarVista(
                  'PLAN'
                )
              }
              className={`
                inline-flex items-center justify-center gap-2 rounded-t-lg border border-b-0 px-4 py-2 text-xs font-semibold shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BEFB3] focus-visible:ring-offset-2
                ${
                  vistaActual ===
                  'PLAN'
                    ? `
                      border-[#194567] bg-[#194567] text-white shadow-[inset_0_3px_0_#7BEFB3] hover:bg-[#123B63]
                    `
                    : `
                      border-[#A6C2DB] bg-[#DCEAF5] text-[#194567] hover:border-[#194567] hover:bg-[#A6C2DB] hover:text-[#082745]
                    `
                }
              `}
            >
              <i
                className="
                  fas
                  fa-graduation-cap
                "
              ></i>

              Plan de Formación
            </button>

            <button
              type="button"
              onClick={() =>
                cambiarVista(
                  'GRUPOS'
                )
              }
              className={`
                inline-flex items-center justify-center gap-2 rounded-t-lg border border-b-0 px-4 py-2 text-xs font-semibold shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BEFB3] focus-visible:ring-offset-2
                ${
                  vistaActual ===
                  'GRUPOS'
                    ? `
                      border-[#194567] bg-[#194567] text-white shadow-[inset_0_3px_0_#7BEFB3] hover:bg-[#123B63]
                    `
                    : `
                      border-[#A6C2DB] bg-[#DCEAF5] text-[#194567] hover:border-[#194567] hover:bg-[#A6C2DB] hover:text-[#082745]
                    `
                }
              `}
            >
              <i
                className="
                  fas
                  fa-link
                "
              ></i>

              Grupos Transversales

              {gruposTransversales.length >
                0 && (
                <span
                  className={`
                    rounded-full
                    px-2
                    py-0.5
                    text-[10px]
                    font-bold
                    ${
                      vistaActual ===
                      'GRUPOS'
                        ? `
                          bg-[#DCEAF5]
                          text-[#194567]
                        `
                        : `
                          bg-slate-700
                          text-white
                        `
                    }
                  `}
                >
                  {
                    gruposTransversales.length
                  }
                </span>
              )}
            </button>
          </div>
        </div>


        {vistaActual === 'PLAN' && (
          <div className="flex justify-end py-2">
            <button type="button" onClick={abrirNuevaClase}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800">
              <i className="fas fa-plus" aria-hidden="true"/> Nueva clase
            </button>
          </div>
        )}

        {/* ====================================================
            MENSAJES
        ==================================================== */}

        {error && (
          <div
            className="
              rounded-lg
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-xs
              font-medium
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
              border-emerald-200
              bg-emerald-50
              px-4
              py-3
              text-xs
              font-medium
              text-emerald-700
            "
          >
            {mensaje}
          </div>
        )}


        {/* ====================================================
            VISTA PLAN DE FORMACIÓN
        ==================================================== */}

        {vistaActual ===
          'PLAN' && (
          <>

            {/* ================================================
                SELECTOR DE CATEGORÍA
            ================================================ */}

            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-slate-300
                bg-white
                shadow-sm
              "
            >
              <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-[#194567] bg-[#194567] px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white">
                  <i className="fas fa-list" aria-hidden="true" />
                  Seleccione la categoría del Plan de Formación
                </div>
                {planSeleccionado && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#E8F2FA]">
                    <span className="font-bold uppercase text-white">{planSeleccionado.nombre}</span>
                    <span>Versión <strong>{planSeleccionado.version}</strong> · Estado: <strong className="text-[#9EF0C6]">{planSeleccionado.estado}</strong></span>
                    {planesCategoria.length > 1 && (
                      <select
                        value={planSeleccionadoId || ''}
                        onChange={(event) => setPlanSeleccionadoId(Number(event.target.value))}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
                        aria-label="Seleccionar versión del plan"
                      >
                        {planesCategoria.map((plan) => (
                          <option key={plan.id} value={plan.id}>Versión {plan.version} - {plan.estado}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              <div
                className="
                  bg-slate-50
                  px-3 py-2.5
                "
              >
                <div
                  className="
                    flex
                    flex-wrap
                    gap-2
                  "
                >
                  {categorias.map(
                    (
                      categoria
                    ) => {
                      const activa =
                        categoria ===
                        categoriaSeleccionada

                      const existePlan =
                        planes.some(
                          (item) =>
                            item.categoria ===
                            categoria
                        )

                      return (
                        <button
                          key={
                            categoria
                          }
                          type="button"
                          onClick={() =>
                            seleccionarCategoria(
                              categoria
                            )
                          }
                          className={`
                            min-w-[54px]
                            rounded-md
                            border
                            px-3
                            py-1.5
                            text-xs
                            font-semibold
                            transition-colors duration-150
                            ${
                              activa
                                ? `
                                  border-[#194567]
                                  bg-[#194567]
                                  text-white
                                  shadow-sm
                                `
                                : `
                                  border-slate-300
                                  bg-white
                                  text-slate-700
                                  hover:border-[#194567]
                                  hover:bg-[#DCEAF5]
                                `
                            }
                          `}
                        >
                          {
                            categoria
                          }

                          {!existePlan && (
                            <span
                              className="
                                mt-1
                                block
                                text-[9px]
                                font-semibold
                                opacity-80
                              "
                            >
                              Sin configurar
                            </span>
                          )}
                        </button>
                      )
                    }
                  )}
                </div>
              </div>
            </div>


            {/* ================================================
                SIN PLAN
            ================================================ */}

            {categoriaSeleccionada &&
              !planSeleccionado && (
              <div
                className="
                  rounded-xl
                  border
                  border-amber-400
                  bg-amber-50
                  p-5
                  shadow-sm
                "
              >
                <div
                  className="
                    flex
                    items-start
                    gap-3
                  "
                >
                  <i
                    className="
                      fas
                      fa-triangle-exclamation
                      mt-1
                      text-amber-600
                    "
                  ></i>

                  <div>
                    <div
                      className="
                        font-bold
                        text-amber-900
                      "
                    >
                      Categoría{' '}
                      {
                        categoriaSeleccionada
                      }{' '}
                      sin configurar
                    </div>

                    <div
                      className="
                        mt-1
                        text-xs
                        text-amber-800
                      "
                    >
                      Esta categoría está
                      habilitada para el
                      nivel del CEA, pero
                      todavía no existe un
                      plan de formación
                      configurado.
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* ================================================
                PLAN SELECCIONADO
            ================================================ */}

            {planSeleccionado && (
              <>

                {/* ============================================
                    TARJETAS RESUMEN
                ============================================ */}

                <div
                  className="
                    grid
                    grid-cols-1
                    gap-3
                    md:grid-cols-3
                  "
                >
                  <ResumenTipo
                    titulo="TEORÍA"
                    icono="fa-book"
                    cantidad={
                      resumen.teoria
                        .cantidad
                    }
                    etiquetaCantidad="temáticas"
                    configurado={
                      resumen.teoria
                        .configuradas
                    }
                    requerido={
                      resumen.teoria
                        .requeridas
                    }
                    unidad="horas"
                  />

                  <ResumenTipo
                    titulo="TALLER"
                    icono="fa-tools"
                    cantidad={
                      resumen.taller
                        .cantidad
                    }
                    etiquetaCantidad="temáticas"
                    configurado={
                      resumen.taller
                        .configuradas
                    }
                    requerido={
                      resumen.taller
                        .requeridas
                    }
                    unidad="horas"
                  />

                  <ResumenPractica
                    cantidad={
                      resumen.practica
                        .cantidad
                    }
                    requerido={
                      resumen.practica
                        .requeridas
                    }
                  />
                </div>


                {/* ============================================
                    MÓDULOS
                ============================================ */}

                <div
                  className="
                    space-y-4
                  "
                >
                  {modulosPlan.map(
                    (
                      modulo
                    ) => {
                      const clasesModulo =
                        clasesPlan
                          .filter(
                            (item) =>
                              Number(
                                item.modulo_id
                              ) ===
                              Number(
                                modulo.id
                              )
                          )
                          .sort(
                            (
                              a,
                              b
                            ) =>
                              Number(
                                a.orden
                              ) -
                              Number(
                                b.orden
                              )
                          )

                      return (
                        <div
                          key={
                            modulo.id
                          }
                          className="
                            overflow-hidden
                            rounded-xl
                            border
                            border-slate-700
                            bg-white
                            shadow-sm
                          "
                        >
                          <div
                            className="
                              bg-[#194567]
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
                                md:flex-row
                                md:items-center
                                md:justify-between
                              "
                            >
                              <div>
                                <div
                                  className="
                                    text-xs
                                    font-bold
                                    uppercase
                                    tracking-wide
                                  "
                                >
                                  {modulo.codigo ||
                                    'MÓDULO'}

                                  {' · '}

                                  {
                                    modulo.tipo_formacion
                                  }
                                </div>

                                <div
                                  className="
                                    mt-1
                                    text-xs
                                    font-semibold
                                  "
                                >
                                  {
                                    modulo.nombre
                                  }
                                </div>
                              </div>


                            </div>
                          </div>


                          <div className="overflow-x-auto">
                            <div className="min-w-[1050px]">
                              <div className="grid grid-cols-[minmax(190px,1.5fr)_52px_70px_minmax(150px,1fr)_minmax(160px,1.2fr)_74px_116px] gap-2 bg-slate-100 px-3 py-2 text-[10px] font-extrabold uppercase text-slate-700">
                                <span>Nombre de la clase</span><span>Color</span><span>Duración</span><span>Contenido</span><span>Competencias a desarrollar</span><span>Estado</span><span>Acciones</span>
                              </div>
                            {clasesModulo.map(
                              (
                                clase
                              ) => {
                                const grupoClase =
                                  gruposTransversales.find(
                                    (
                                      grupo
                                    ) =>
                                      Array.isArray(
                                        grupo.clases
                                      ) &&
                                      grupo.clases.some(
                                        (
                                          item
                                        ) =>
                                          Number(
                                            item.id
                                          ) ===
                                          Number(
                                            clase.id
                                          )
                                      )
                                  )

                                return (
                                  <div key={clase.id} className="grid grid-cols-[minmax(190px,1.5fr)_52px_70px_minmax(150px,1fr)_minmax(160px,1.2fr)_74px_116px] items-center gap-2 border-b border-slate-200 px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50">
                                    <div className="min-w-0">
                                      <span className="mr-2 text-slate-400">#{clase.numero_clase}</span>
                                      <span className="font-semibold text-slate-900">{clase.nombre}</span>
                                      {grupoClase && <div className="mt-0.5 truncate text-[10px] text-blue-700" title={grupoClase.nombre}>Grupo: {grupoClase.nombre}</div>}
                                    </div>
                                    <span title={grupoClase ? 'Color del grupo' : 'Color de la clase'} className="inline-block h-5 w-5 rounded border border-slate-300" style={{ backgroundColor: grupoClase?.color_horario || clase.color_horario || '#F1F5F9' }}/>
                                    <span>{clase.tipo_formacion === 'PRACTICA' ? '—' : clase.duracion_horas ? formatearHoras(clase.duracion_horas) + ' h' : 'Pendiente'}</span>
                                    <span className="min-w-0 line-clamp-2 break-words text-slate-600" title={texto(clase.contenido)}>{texto(clase.contenido) || 'Pendiente'}</span>
                                    <span className="min-w-0 line-clamp-2 break-words text-slate-600" title={texto(clase.contenido_tarjeta)}>{texto(clase.contenido_tarjeta) || 'Pendiente'}</span>
                                    <span className={clase.activo === false ? 'text-slate-500' : 'text-emerald-700'}>{clase.activo === false ? 'Inactiva' : 'Activa'}</span>
                                    <div className="flex items-center justify-end gap-1">
                                      <button type="button" title="Editar clase" onClick={() => abrirEdicion(clase)} className="rounded border border-amber-300 bg-amber-50 p-2 text-amber-800"><i className="fas fa-edit" aria-hidden="true"/></button>
                                      <button type="button" title={clase.activo === false ? 'Activar' : 'Desactivar'} onClick={() => alternarEstadoClase(clase)} disabled={guardando} className="rounded border border-slate-300 bg-white p-2 text-slate-700"><i className="fas fa-power-off" aria-hidden="true"/></button>
                                      <button type="button" title="Eliminar clase" onClick={() => solicitarEliminar(clase)} className="rounded border border-red-200 bg-red-50 p-2 text-red-700"><i className="fas fa-trash" aria-hidden="true"/></button>
                                    </div>
                                  </div>
                                )
                              }
                            )}


                            {!clasesModulo.length && (
                              <div
                                className="
                                  p-5
                                  text-center
                                "
                              >
                                <div
                                  className="
                                    text-xs
                                    text-slate-500
                                  "
                                >
                                  Este módulo no
                                  tiene clases
                                  configuradas.
                                </div>


                              </div>
                            )}
                            </div>
                          </div>
                        </div>
                      )
                    }
                  )}
                </div>
              </>
            )}
          </>
        )}


        {/* ====================================================
            VISTA GRUPOS TRANSVERSALES
        ==================================================== */}

        {vistaActual ===
          'GRUPOS' && (
          <div
            className="
              overflow-hidden
              rounded-xl
              border-2
              border-slate-800
              bg-white
              shadow-md
            "
          >
            <div
              className="
                bg-[#194567]
                p-4
                text-white
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  md:flex-row
                  md:items-center
                  md:justify-between
                "
              >
                <div>
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-extrabold
                      uppercase
                    "
                  >
                    <i
                      className="
                        fas
                        fa-link
                      "
                    ></i>

                    Grupos Transversales
                  </div>

                  <div
                    className="
                      mt-1
                      max-w-3xl
                      text-xs
                      leading-relaxed
                      text-slate-300
                    "
                  >
                    Agrupe únicamente las
                    clases que son
                    equivalentes y pueden
                    compartirse entre
                    diferentes categorías.
                    Las clases específicas
                    de una sola categoría
                    no necesitan grupo.
                  </div>
                </div>


                <BotonAccion tipo="agregar"
                  type="button"
                  onClick={
                    abrirNuevoGrupo
                  }
                  
                >
                  <i
                    className="
                      fas
                      fa-plus
                    "
                  ></i>

                  Nuevo grupo transversal
                </BotonAccion>
              </div>
            </div>


            {gruposTransversales.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse text-left text-xs">
                  <thead className="bg-slate-100 text-[11px] uppercase text-slate-700">
                    <tr>
                      <th className="px-3 py-3">Grupo transversal</th>
                      <th className="px-3 py-3">Formación</th>
                      <th className="px-3 py-3">Categorías a las que aplica</th>
                      <th className="px-3 py-3">Color</th>
                      <th className="px-3 py-3">Estado</th>
                      <th className="px-3 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {gruposTransversales.map(grupo => (
                      <tr key={grupo.id} className="hover:bg-slate-50">
                        <td className="max-w-[320px] px-3 py-3 align-top">
                          <div className="font-semibold text-slate-900">{grupo.nombre}</div>
                          <div className="mt-1 text-[10px] text-slate-500">{(grupo.clases || []).map(c => c.categoria + ': ' + c.nombre).join(' · ')}</div>
                        </td>
                        <td className="px-3 py-3 align-top">{grupo.tipo_formacion}</td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-1">
                            {(grupo.categorias || []).map(cat => (
                              <span key={cat} className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">{cat}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="inline-block h-6 w-6 rounded border border-slate-300"
                            style={{backgroundColor: grupo.color_horario || '#F1F5F9'}} title={grupo.color_horario || 'Sin color'}/>
                        </td>
                        <td className="px-3 py-3 align-top">{grupo.activo === false ? 'Inactivo' : 'Activo'}</td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex justify-end gap-1">
                            <button type="button" title="Contenido y competencia" aria-label="Contenido y competencia" onClick={() => abrirTextosGrupo(grupo)}
                              className="rounded border border-blue-200 bg-blue-50 p-2 text-blue-800 hover:bg-blue-100"><i className="fas fa-pen" aria-hidden="true"/></button>
                            <button type="button" title="Editar grupo y asociaciones" aria-label="Editar grupo y asociaciones" onClick={() => abrirEditarGrupo(grupo)}
                              className="rounded border border-amber-200 bg-amber-50 p-2 text-amber-800 hover:bg-amber-100"><i className="fas fa-edit" aria-hidden="true"/></button>
                            <button type="button" title="Eliminar grupo" aria-label="Eliminar grupo" onClick={() => solicitarEliminarGrupo(grupo)}
                              className="rounded border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"><i className="fas fa-trash" aria-hidden="true"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className="
                  bg-slate-50
                  p-8
                  text-center
                "
              >
                <div
                  className="
                    mx-auto
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-full
                    bg-slate-200
                    text-sm
                    text-slate-600
                  "
                >
                  <i
                    className="
                      fas
                      fa-link
                    "
                  ></i>
                </div>

                <div
                  className="
                    mt-3
                    text-xs
                    font-bold
                    text-slate-700
                  "
                >
                  No hay grupos
                  transversales
                  configurados.
                </div>

                <div
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Solo debe crear grupos
                  para las clases que se
                  comparten entre dos o más
                  categorías.
                </div>
              </div>
            )}
          </div>
        )}
      </div>



      {/* Edición de textos de clases asociadas al grupo, sin cambiar la agrupación */}
      {edicionTextosGrupo && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Contenido y competencia · {edicionTextosGrupo.nombre}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Todas las categorías están seleccionadas inicialmente. Desmarque las que no desea actualizar.
              Solo se modificarán los campos indicados; los nombres, horarios, duraciones y colores se conservarán.
            </p>
            <div className="mt-4 space-y-2">
              {edicionTextosGrupo.miembros.map(miembro => {
                const actual = clases.find(clase => Number(clase.id) === Number(miembro.id))
                const marcado = edicionTextosGrupo.clase_ids.includes(Number(miembro.id))
                return (
                  <label key={miembro.id} className="block rounded-lg border border-slate-200 p-3">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <input type="checkbox" checked={marcado}
                        onChange={() => cambiarTextosGrupo('clase_ids',
                          marcado
                            ? edicionTextosGrupo.clase_ids.filter(id => id !== Number(miembro.id))
                            : [...edicionTextosGrupo.clase_ids, Number(miembro.id)])} />
                      {miembro.categoria} · {miembro.nombre}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Contenido actual: {texto(actual?.contenido) || 'Sin configurar'}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Competencia actual: {texto(actual?.contenido_tarjeta) || 'Sin configurar'}
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200 p-3">
                <label className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" checked={edicionTextosGrupo.actualizar_contenido}
                    onChange={e => cambiarTextosGrupo('actualizar_contenido', e.target.checked)} />
                  Actualizar contenido completo
                </label>
                <textarea rows={4} className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  value={edicionTextosGrupo.contenido}
                  disabled={!edicionTextosGrupo.actualizar_contenido}
                  onChange={e => cambiarTextosGrupo('contenido', e.target.value)} />
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <label className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" checked={edicionTextosGrupo.actualizar_tarjeta}
                    onChange={e => cambiarTextosGrupo('actualizar_tarjeta', e.target.checked)} />
                  Actualizar competencia corta para tarjeta
                </label>
                <textarea rows={3} className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  value={edicionTextosGrupo.contenido_tarjeta}
                  disabled={!edicionTextosGrupo.actualizar_tarjeta}
                  onChange={e => cambiarTextosGrupo('contenido_tarjeta', e.target.value)} />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-600">
              Se actualizarán {edicionTextosGrupo.clase_ids.length} de {edicionTextosGrupo.miembros.length} clases.
              Verifique los textos actuales antes de confirmar.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={guardando}
                onClick={() => setEdicionTextosGrupo(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Cancelar</button>
              <button type="button" disabled={guardando || !edicionTextosGrupo.clase_ids.length}
                onClick={guardarTextosGrupo}
                className="rounded-lg bg-[#194567] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Aplicar a clases seleccionadas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL GRUPO TRANSVERSAL
      ====================================================== */}

      {grupoEditando && (
        <div
          className="
            fixed
            inset-0
            z-[70]
            flex
            items-center
            justify-center
            bg-black/50
            p-4
          "
        >
          <div
            className="
              max-h-[94vh]
              w-full
              max-w-4xl
              overflow-y-auto
              rounded-2xl
              bg-white
              shadow-xl
            "
          >
            <div
              className="
                border-b
                border-gray-200
                bg-slate-800
                px-5
                py-4
                text-white
              "
            >
              <div
                className="
                  text-sm
                  font-bold
                "
              >
                {grupoEditando.esNuevo
                  ? 'Nuevo grupo transversal'
                  : 'Editar grupo transversal'}
              </div>

              <div
                className="
                  mt-1
                  text-xs
                  text-slate-300
                "
              >
                Seleccione clases
                equivalentes de dos o más
                categorías.
              </div>
            </div>


            <div
              className="
                space-y-5
                p-5
              "
            >
              <Campo
                etiqueta="Nombre del grupo"
                ayuda="Ejemplo: NORMAS DE TRÁNSITO 1"
              >
                <input
                  autoFocus
                  value={
                    grupoEditando.nombre
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoGrupo(
                      'nombre',
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-xs
                  "
                />
              </Campo>


              <Campo
                etiqueta="Tipo de formación"
              >
                <div
                  className="
                    flex
                    flex-wrap
                    gap-2
                  "
                >
                  {[
                    'TEORIA',
                    'TALLER',
                  ].map(
                    (
                      tipo
                    ) => (
                      <button
                        key={
                          tipo
                        }
                        type="button"
                        onClick={() =>
                          cambiarTipoGrupo(
                            tipo
                          )
                        }
                        className={`
                          rounded-lg
                          px-4
                          py-2
                          text-xs
                          font-bold
                          ${
                            grupoEditando
                              .tipo_formacion ===
                            tipo
                              ? `
                                bg-slate-800
                                text-white
                              `
                              : `
                                border
                                border-gray-300
                                bg-white
                                text-slate-700
                              `
                          }
                        `}
                      >
                        {tipo}
                      </button>
                    )
                  )}
                </div>
              </Campo>


              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">Clases asociadas ({grupoEditando.clase_ids.length})</p>
                  {!grupoEditando.esNuevo && (
                    <button type="button"
                      onClick={() => {
                        setModoAsociacionesGrupo(anterior => !anterior)
                        setMostrarAlternativasGrupo(false)
                        setFiltroTemaGrupo('')
                      }}
                      className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800">
                      {modoAsociacionesGrupo ? 'Ocultar selección' : 'Cambiar asociaciones'}
                    </button>
                  )}
                </div>
                {!modoAsociacionesGrupo && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {clasesAgrupables.filter(clase => grupoEditando.clase_ids.includes(Number(clase.id))).map(clase => (
                      <span key={clase.id} className="rounded-md bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                        {clase.categoria} · {clase.nombre}
                      </span>
                    ))}
                  </div>
                )}
                {modoAsociacionesGrupo && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-slate-500">Primero seleccione una clase de referencia. Solo se mostrarán las clases compatibles por nombre y las ya asociadas.</p>
                    <label className="block text-xs font-semibold text-slate-700">
                      Buscar clase o tema
                      <input type="search" value={filtroTemaGrupo}
                        onChange={e => { setFiltroTemaGrupo(e.target.value); setMostrarAlternativasGrupo(false) }}
                        placeholder="Ej. MOVILIDAD SEGURA Y SOSTENIBLE 1"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"/>
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Seleccionar clase de referencia
                      <select value=""
                        onChange={e => {
                          const clase = opcionesReferenciaGrupo.find(item => String(item.id) === e.target.value)
                          if (!clase) return
                          setFiltroTemaGrupo(clase.nombre)
                          setMostrarAlternativasGrupo(false)
                          if (grupoEditando.esNuevo && !texto(grupoEditando.nombre)) cambiarCampoGrupo('nombre', clase.nombre)
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="">Seleccionar del plan actual...</option>
                        {opcionesReferenciaGrupo.map(clase => (
                          <option value={clase.id} key={clase.id}>{clase.nombre} · {clase.categoria}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" checked={mostrarAlternativasGrupo}
                        onChange={e => setMostrarAlternativasGrupo(e.target.checked)}/>
                      Mostrar todas las alternativas (para nombres diferentes entre categorías)
                    </label>
                    <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
                      {categorias.map(categoria => {
                        const opciones = clasesGrupoFiltradas.filter(clase => clase.categoria === categoria)
                        if (!opciones.length) return null
                        return <div key={categoria} className="space-y-1">
                          <p className="text-xs font-bold text-blue-900">{categoria}</p>
                          {opciones.map(clase => {
                            const ocupada = obtenerGrupoClase(clase.id)
                            const seleccionada = grupoEditando.clase_ids.includes(Number(clase.id))
                            const mismaCategoria = clasesAgrupables.some(otra => otra.categoria === categoria &&
                              otra.id !== clase.id && grupoEditando.clase_ids.includes(Number(otra.id)))
                            return (
                              <label key={clase.id} className={`flex items-start gap-2 rounded border p-2 text-xs ${ocupada || (mismaCategoria && !seleccionada) ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-800'}`}>
                                <input type="checkbox" checked={seleccionada}
                                  disabled={Boolean(ocupada) || (mismaCategoria && !seleccionada)}
                                  onChange={() => alternarClaseGrupo(clase.id)}/>
                                <span><strong>{clase.nombre}</strong>
                                  <span className="block text-slate-500">{clase.duracion_horas ? `${formatearHoras(clase.duracion_horas)} hora(s)` : 'Sin duración'}</span>
                                  {ocupada && <span className="block text-purple-600">Ya pertenece a: {ocupada.nombre}</span>}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      })}
                      {!clasesGrupoFiltradas.length && (
                        <p className="p-3 text-xs text-slate-500">Busque una clase de referencia o active «Mostrar todas las alternativas».</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">La selección deberá contener al menos dos clases de categorías distintas. No se cambian las clases sin guardar.</p>
                  </div>
                )}
              </div>

              <Campo
                etiqueta="Observaciones"
              >
                <textarea
                  rows={3}
                  value={
                    grupoEditando
                      .observaciones
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoGrupo(
                      'observaciones',
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-xs
                  "
                />
              </Campo>

              <Campo
                etiqueta="Color en Horario Teórico"
              >
                <SelectorColorHorario
                  valor={
                    grupoEditando
                      .color_horario
                  }
                  onChange={(
                    color
                  ) =>
                    cambiarCampoGrupo(
                      'color_horario',
                      color
                    )
                  }
                />
              </Campo>


              <label
                className="
                  flex
                  items-center
                  gap-3
                  rounded-lg
                  border
                  border-gray-200
                  p-3
                "
              >
                <input
                  type="checkbox"
                  checked={
                    grupoEditando.activo !==
                    false
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoGrupo(
                      'activo',
                      event.target.checked
                    )
                  }
                />

                <div>
                  <div
                    className="
                      text-xs
                      font-semibold
                      text-slate-800
                    "
                  >
                    Grupo activo
                  </div>

                  <div
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Los grupos activos
                    estarán disponibles
                    para Horario Teórico.
                  </div>
                </div>
              </label>
            </div>


            <div
              className="
                flex
                justify-end
                gap-2
                border-t
                border-gray-200
                px-5
                py-4
              "
            >
              <BotonAccion tipo="cancelar"
                type="button"
                disabled={
                  guardando
                }
                onClick={
                  cerrarGrupo
                }
                
              >
                <i className="fas fa-xmark" aria-hidden="true" />
                Cancelar
              </BotonAccion>

              <BotonAccion tipo="guardar"
                type="button"
                disabled={
                  guardando
                }
                onClick={
                  guardarGrupoTransversal
                }
                
              >
                <i className="fas fa-floppy-disk" aria-hidden="true" />
                {guardando
                  ? 'Guardando...'
                  : grupoEditando.esNuevo
                    ? 'Crear grupo'
                    : 'Guardar cambios'}
              </BotonAccion>
            </div>
          </div>
        </div>
      )}


      {/* ======================================================
          MODAL EDITAR CLASE
      ====================================================== */}

      {claseEditando && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/50
            p-4
          "
        >
          <div
            className="
              max-h-[92vh]
              w-full
              max-w-3xl
              overflow-y-auto
              rounded-2xl
              bg-white
              shadow-xl
            "
          >
            <div className="relative border-b border-gray-200 bg-slate-800 px-5 py-4 text-white">
              <div className="text-sm font-bold">Editar clase · {claseEditando.categoria} · {claseEditando.tipo_formacion}</div>
              <button type="button" disabled={guardando} onClick={cerrarEdicion}
                aria-label="Cerrar sin guardar" title="Cerrar sin guardar"
                className="absolute right-4 top-3 rounded-md p-2 text-lg text-white hover:bg-slate-700">×</button>
            </div>
            <div
              className="
                space-y-4
                p-5
              "
            >
              {(() => {
                const grupoVinculado = gruposTransversales.find(grupo =>
                  (grupo.clases || []).some(clase => Number(clase.id) === Number(claseEditando.id)))
                if (!grupoVinculado) return null
                return <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                  Esta clase está vinculada al grupo <strong>{grupoVinculado.nombre}</strong>.
                  Puede consultar aquí sus datos actuales. Para aplicar la misma competencia o
                  contenido a otras categorías, utilice la edición compartida del grupo.
                  <button type="button" className="mt-2 block rounded border border-blue-300 bg-white px-3 py-2 font-semibold"
                    onClick={() => {
                      setClaseEditando(null)
                      cambiarVista('GRUPOS')
                      abrirTextosGrupo(grupoVinculado)
                    }}>Editar contenido y competencia del grupo</button>
                </div>
              })()}
              <Campo etiqueta="Tipo de formación y módulo">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  {claseEditando.tipo_formacion} · {modulos.find(m => Number(m.id) === Number(claseEditando.modulo_id))?.nombre || 'Módulo actual'}
                </div>
              </Campo>
              <Campo etiqueta="Grupo temático">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  {claseEditando.tipo_formacion === 'TEORIA' && mayusculas(modulos.find(m => Number(m.id) === Number(claseEditando.modulo_id))?.nombre).includes('TRANSVERSAL')
                    ? (['MOVILIDAD SEGURA Y SOSTENIBLE','NORMAS DE TRÁNSITO','SEÑALIZACIÓN VIAL E INFRAESTRUCTURA'].find(t => mayusculas(claseEditando.nombre).includes(t)) || 'Transversal individual')
                    : 'No corresponde a grupo transversal'}
                </div>
              </Campo>
              <Campo etiqueta="Categoría asociada">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">{claseEditando.categoria}</div>
              </Campo>
              <Campo
                etiqueta="Nombre de la clase"
              >
                <input
                  value={
                    claseEditando.nombre ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoEdicion(
                      'nombre',
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-xs
                  "
                />
              </Campo>


              {claseEditando.tipo_formacion !==
                'PRACTICA' && (
                <Campo
                  etiqueta="Duración"
                >
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >
                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={
                        claseEditando
                          .duracion_horas
                      }
                      onChange={(
                        event
                      ) =>
                        cambiarCampoEdicion(
                          'duracion_horas',
                          event.target.value
                        )
                      }
                      className="
                        w-32
                        rounded-lg
                        border
                        border-gray-300
                        px-3
                        py-2
                        text-xs
                      "
                    />

                    <span
                      className="
                        text-xs
                        text-slate-600
                      "
                    >
                      horas
                    </span>
                  </div>
                </Campo>
              )}


              <Campo
                etiqueta="Contenido completo"
              >
                <textarea
                  rows={5}
                  value={
                    claseEditando
                      .contenido ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoEdicion(
                      'contenido',
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-xs
                  "
                />
              </Campo>


              <Campo
                etiqueta="Contenido para tarjeta (competencias a desarrollar)"
              >
                <textarea
                  rows={3}
                  value={
                    claseEditando
                      .contenido_tarjeta ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoEdicion(
                      'contenido_tarjeta',
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-xs
                  "
                />

                  <p className="mt-1 text-xs text-gray-500">
                    Este texto se mostrará en la columna «COMPETENCIA A DESARROLLAR» del Control de Clases.
                  </p>              </Campo>


              <Campo etiqueta="Color de la clase">
                <SelectorColorHorario
                  valor={claseEditando.color_horario}
                  onChange={color => cambiarCampoEdicion('color_horario',color)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {claseEditando.tipo_formacion === 'PRACTICA'
                    ? 'Color opcional de identificación. Las prácticas no utilizan el bloque de horario teórico.'
                    : 'Si esta clase se agrupa transversalmente, el horario mostrará el color del grupo.'}
                </p>
              </Campo>
              <Campo
                etiqueta="Observaciones"
              >
                <textarea
                  rows={3}
                  value={
                    claseEditando
                      .observaciones ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoEdicion(
                      'observaciones',
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-xs
                  "
                />
              </Campo>



              <label
                className="
                  flex
                  items-center
                  gap-3
                  rounded-lg
                  border
                  border-gray-200
                  p-3
                "
              >
                <input
                  type="checkbox"
                  checked={
                    claseEditando.activo !==
                    false
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoEdicion(
                      'activo',
                      event.target.checked
                    )
                  }
                />

                <div
                  className="
                    text-xs
                    font-semibold
                    text-slate-800
                  "
                >
                  Clase activa
                </div>
              </label>
            </div>


            <div
              className="
                flex
                justify-end
                gap-2
                border-t
                border-gray-200
                px-5
                py-4
              "
            >
              <BotonAccion tipo="cancelar"
                type="button"
                disabled={
                  guardando
                }
                onClick={
                  cerrarEdicion
                }
                
              >
                <i className="fas fa-xmark" aria-hidden="true" />
                Cancelar
              </BotonAccion>

              <BotonAccion tipo="guardar"
                type="button"
                disabled={
                  guardando
                }
                onClick={
                  guardarClase
                }
                
              >
                <i className="fas fa-floppy-disk" aria-hidden="true" />
                {guardando
                  ? 'Guardando...'
                  : 'Guardar cambios'}
              </BotonAccion>
            </div>
          </div>
        </div>
      )}


      {/* ======================================================
          MODAL NUEVA CLASE
      ====================================================== */}

      {nuevaClase && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/50
            p-4
          "
        >
          <div
            className="
              max-h-[92vh]
              w-full
              max-w-3xl
              overflow-y-auto
              rounded-2xl
              bg-white
              shadow-xl
            "
          >
            <div className="relative border-b border-gray-200 bg-slate-800 px-5 py-4 text-white">
              <div className="text-sm font-bold">Nueva clase {nuevaClase.categoria ? `· ${nuevaClase.categoria}` : ""} {nuevaClase.modulo_nombre ? `· ${nuevaClase.modulo_nombre}` : ""}</div>
              <button type="button" disabled={guardando} onClick={cerrarNuevaClase}
                aria-label="Cerrar sin guardar" title="Cerrar sin guardar"
                className="absolute right-4 top-3 rounded-md p-2 text-lg text-white hover:bg-slate-700">×</button>
            </div>
            <div
              className="
                space-y-4
                p-5
              "
            >
              <Campo etiqueta="Tipo de formación y módulo">
                <select value={nuevaClase.modulo_referencia_id || ''} onChange={e => cambiarModuloNueva(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs">
                  <option value="">Seleccione el tipo de formación y módulo...</option>
                  {modulos.filter(modulo =>
                    modulo.activo !== false &&
                    planes.some(plan => plan.estado === 'ACTIVO' &&
                      categorias.includes(plan.categoria) &&
                      Number(plan.id) === Number(modulo.plan_formacion_id)) &&
                    !modulos.some(otro =>
                      otro.id < modulo.id && otro.activo !== false &&
                      mayusculas(otro.codigo) === mayusculas(modulo.codigo) &&
                      mayusculas(otro.tipo_formacion) === mayusculas(modulo.tipo_formacion) &&
                      mayusculas(otro.nombre) === mayusculas(modulo.nombre) &&
                      planes.some(plan => plan.estado === 'ACTIVO' &&
                        categorias.includes(plan.categoria) &&
                        Number(plan.id) === Number(otro.plan_formacion_id)))
                  ).map(modulo => (
                    <option key={modulo.id} value={modulo.id}>
                      {modulo.tipo_formacion === 'TEORIA'
                        ? (mayusculas(modulo.nombre).includes('TRANSVERSAL')
                          ? 'TEORÍA · SABERES ESENCIALES OBLIGATORIOS TRANSVERSALES'
                          : 'TEORÍA · SABERES ESENCIALES OBLIGATORIOS ESPECÍFICOS')
                        : modulo.tipo_formacion === 'TALLER'
                          ? 'TALLER · FORMACIÓN BÁSICA APLICADA'
                          : 'PRÁCTICA · FORMACIÓN ESPECÍFICA'}
                    </option>
                  ))}
                </select>
              </Campo>
              {nuevaClase.tipo_formacion === 'TEORIA' && mayusculas(nuevaClase.modulo_nombre).includes('TRANSVERSAL') && (
                <Campo etiqueta="Grupo temático">
                  <select value="" onChange={e => { if(e.target.value) cambiarCampoNueva('nombre', e.target.value) }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs">
                    <option value="">Seleccionar grupo temático...</option>
                    {['MOVILIDAD SEGURA Y SOSTENIBLE','NORMAS DE TRÁNSITO','SEÑALIZACIÓN VIAL E INFRAESTRUCTURA'].map(tema => (
                      <option key={tema} value={tema}>{tema}</option>
                    ))}
                  </select>
                </Campo>
              )}
              <Campo etiqueta="Categorías habilitadas">
                <div className="flex flex-wrap gap-3">
                  {categorias.map(cat => {
                    const base = modulos.find(m => Number(m.id) === Number(nuevaClase.modulo_id))
                    const disponible = Boolean(base && moduloEquivalenteNueva(base, cat))
                    const marcada = (nuevaClase.categorias_destino || []).includes(cat)
                    const bloqueada = !disponible || (nuevaClase.tipo_formacion === 'PRACTICA' &&
                      !marcada && (nuevaClase.categorias_destino || []).length >= 1)
                    return (
                      <label key={cat} title={!disponible ? 'No existe un módulo equivalente para esta categoría' : ''}
                        className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold">
                        <input type="checkbox" checked={marcada} disabled={bloqueada}
                          onChange={e => alternarCategoriaNueva(cat, e.target.checked)}/>
                        {cat}
                      </label>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Seleccione las categorías que correspondan. Para compartir una clase de teoría o taller,
                  marque al menos dos; las prácticas se crean para una sola categoría y sin duración.
                </p>
              </Campo>
              {nuevaClase.tipo_formacion !== 'PRACTICA' && (nuevaClase.categorias_destino || []).length > 1 && (
                <Campo etiqueta="Nombre del grupo transversal">
                  <input value={nuevaClase.nombre_grupo || ''} placeholder={nuevaClase.nombre || 'Nombre que verá en el horario'}
                    onChange={e => cambiarCampoNueva('nombre_grupo',e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs"/>
                  <p className="mt-1 text-xs text-slate-500">Si se deja vacío se utilizará el nombre de la clase. El color seleccionado corresponderá al bloque compartido.</p>
                </Campo>
              )}
              <Campo
                etiqueta="Nombre de la clase"
              >
                <input
                  autoFocus
                  value={
                    nuevaClase.nombre ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoNueva(
                      'nombre',
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-xs
                  "
                />
              </Campo>


              {nuevaClase.tipo_formacion !==
                'PRACTICA' && (
                <Campo
                  etiqueta="Duración"
                >
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >
                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={
                        nuevaClase
                          .duracion_horas
                      }
                      onChange={(
                        event
                      ) =>
                        cambiarCampoNueva(
                          'duracion_horas',
                          event.target.value
                        )
                      }
                      className="
                        w-32
                        rounded-lg
                        border
                        border-gray-300
                        px-3
                        py-2
                        text-xs
                      "
                    />

                    <span
                      className="
                        text-xs
                        text-slate-600
                      "
                    >
                      horas
                    </span>
                  </div>
                </Campo>
              )}


              <Campo
                etiqueta="Contenido completo"
              >
                <textarea
                  rows={5}
                  value={
                    nuevaClase.contenido ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoNueva(
                      'contenido',
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-xs
                  "
                />
              </Campo>


              <Campo
                etiqueta="Contenido para tarjeta (competencias a desarrollar)"
              >
                <textarea
                  rows={3}
                  value={
                    nuevaClase
                      .contenido_tarjeta ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoNueva(
                      'contenido_tarjeta',
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-xs
                  "
                />

                  <p className="mt-1 text-xs text-gray-500">
                    Este texto se mostrará en la columna «COMPETENCIA A DESARROLLAR» del Control de Clases.
                  </p>              </Campo>


              <Campo etiqueta="Color de la clase">
                <SelectorColorHorario
                  valor={nuevaClase.color_horario}
                  onChange={color => cambiarCampoNueva('color_horario',color)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {nuevaClase.tipo_formacion === 'PRACTICA'
                    ? 'Color opcional de identificación. Las prácticas no utilizan el bloque de horario teórico.'
                    : 'Si esta clase se agrupa transversalmente, el horario mostrará el color del grupo.'}
                </p>
              </Campo>
              <Campo
                etiqueta="Observaciones"
              >
                <textarea
                  rows={3}
                  value={
                    nuevaClase
                      .observaciones ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoNueva(
                      'observaciones',
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-xs
                  "
                />
              </Campo>

 

              <label
                className="
                  flex
                  items-center
                  gap-3
                  rounded-lg
                  border
                  border-gray-200
                  p-3
                "
              >
                <input
                  type="checkbox"
                  checked={
                    nuevaClase.activo !==
                    false
                  }
                  onChange={(
                    event
                  ) =>
                    cambiarCampoNueva(
                      'activo',
                      event.target.checked
                    )
                  }
                />

                <div
                  className="
                    text-xs
                    font-semibold
                    text-slate-800
                  "
                >
                  Crear clase activa
                </div>
              </label>
            </div>


            <div
              className="
                flex
                justify-end
                gap-2
                border-t
                border-gray-200
                px-5
                py-4
              "
            >
              <BotonAccion tipo="cancelar"
                type="button"
                disabled={
                  guardando
                }
                onClick={
                  cerrarNuevaClase
                }
                
              >
                <i className="fas fa-xmark" aria-hidden="true" />
                Cancelar
              </BotonAccion>

              <BotonAccion tipo="guardar"
                type="button"
                disabled={
                  guardando
                }
                onClick={
                  guardarNuevaClase
                }
                
              >
                <i className="fas fa-plus" aria-hidden="true" />
                {guardando
                  ? 'Creando...'
                  : 'Crear clase'}
              </BotonAccion>
            </div>
          </div>
        </div>
      )}


      {/* ======================================================
          ELIMINAR CLASE
      ====================================================== */}

      {claseEliminar && (
        <ConfirmacionEliminar
          titulo="Eliminar clase"
          textoConfirmacion={
            <>
              ¿Está seguro de
              eliminar la clase{' '}

              <strong>
                {
                  claseEliminar.nombre
                }
              </strong>
              ?
            </>
          }
          advertencia="Si tiene información histórica relacionada, se conservará como inactiva."
          eliminando={
            eliminando
          }
          onCancelar={
            cancelarEliminar
          }
          onConfirmar={
            confirmarEliminar
          }
        />
      )}


      {/* ======================================================
          ELIMINAR GRUPO
      ====================================================== */}

      {grupoEliminar && (
        <ConfirmacionEliminar
          titulo="Eliminar grupo transversal"
          textoConfirmacion={
            <>
              ¿Está seguro de
              eliminar el grupo{' '}

              <strong>
                {
                  grupoEliminar.nombre
                }
              </strong>
              ?
            </>
          }
          advertencia="Las clases no se eliminan. Únicamente se elimina la agrupación transversal."
          eliminando={
            eliminando
          }
          onCancelar={
            cancelarEliminarGrupo
          }
          onConfirmar={
            confirmarEliminarGrupo
          }
        />
      )}
    </div>
  )
}

function SelectorColorHorario({
  valor,
  onChange,
}) {
  return (
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
          mb-3
          text-xs
          leading-relaxed
          text-slate-500
        "
      >
        Seleccione un color de identificación. Si la clase se programa como grupo transversal, prevalece el color del grupo.
      </div>

      <div
        className="
          grid
          grid-cols-6
          gap-2
          sm:grid-cols-10
          lg:grid-cols-12
        "
      >
        {COLORES_HORARIO.map(
          (
            color
          ) => {
            const seleccionado =
              texto(
                valor
              ).toUpperCase() ===
              color.valor.toUpperCase()

            return (
              <button
                key={
                  color.valor
                }
                type="button"
                title={
                  color.nombre
                }
                onClick={() =>
                  onChange(
                    color.valor
                  )
                }
                className={`
                  relative
                  h-10
                  w-full
                  rounded-lg
                  border-2
                  transition
                  hover:scale-105
                  ${
                    seleccionado
                      ? `
                        border-slate-900
                        shadow-md
                        ring-2
                        ring-slate-300
                      `
                      : `
                        border-white
                        shadow-sm
                        hover:border-slate-400
                      `
                  }
                `}
                style={{
                  backgroundColor:
                    color.valor,
                }}
              >
                {seleccionado && (
                  <i
                    className="
                      fas
                      fa-check
                      text-sm
                      text-slate-900
                    "
                  ></i>
                )}
              </button>
            )
          }
        )}
      </div>

      <div
        className="
          mt-3
          flex
          flex-wrap
          items-center
          gap-2
        "
      >
        {valor ? (
          <>
            <div
              className="
                h-7
                w-12
                rounded-md
                border
                border-slate-300
              "
              style={{
                backgroundColor:
                  valor,
              }}
            ></div>

            <span
              className="
                text-xs
                font-semibold
                text-slate-600
              "
            >
              Color seleccionado
            </span>

            <BotonAccion tipo="limpiar"
              type="button"
              onClick={() =>
                onChange('')
              }
              className="ml-auto"
            >
                <i className="fas fa-eraser" aria-hidden="true" />
              Quitar color
            </BotonAccion>
          </>
        ) : (
          <span
            className="
              text-xs
              font-semibold
              text-amber-700
            "
          >
            Sin color seleccionado
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================
// CAMPO
// ============================================================

function Campo({
  etiqueta,
  ayuda,
  children,
}) {
  return (
    <div>
      <label
        className="
          mb-1
          block
          text-sm
          font-semibold
          text-slate-700
        "
      >
        {etiqueta}
      </label>

      {children}

      {ayuda && (
        <div
          className="
            mt-1
            text-xs
            text-slate-500
          "
        >
          {ayuda}
        </div>
      )}
    </div>
  )
}


// ============================================================
// RESUMEN TEORÍA / TALLER
// ============================================================

function ResumenTipo({
  titulo,
  icono,
  cantidad,
  etiquetaCantidad,
  configurado,
  requerido,
  unidad,
}) {
  const tieneRequisito =
    requerido !== null &&
    requerido !==
      undefined

  const completo =
    tieneRequisito &&
    Number(
      configurado
    ) ===
      Number(
        requerido
      )

  const excedido =
    tieneRequisito &&
    Number(
      configurado
    ) >
      Number(
        requerido
      )

  return (
    <div
      className="
        overflow-hidden
        rounded-lg
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
          gap-2
          border-b
        border-[#737B87]
        bg-[#737B87]
        px-3
        py-2
        text-white
                "
      >
        <i
          className={`
            fas
            ${icono}
          `}
        ></i>

        <div
          className="
            text-xs
            font-extrabold
            tracking-wide
          "
        >
          {titulo}
        </div>
      </div>

      <div
        className="
          p-3
        "
      >
        <div
          className="
            text-xs
            font-semibold
            text-slate-600
          "
        >
          {cantidad}{' '}
          {etiquetaCantidad}
        </div>

        <div
          className="
            mt-1
            text-lg
            font-extrabold
            text-slate-900
          "
        >
          {formatearHoras(
            configurado
          )}

          {' / '}

          {tieneRequisito
            ? formatearHoras(
                requerido
              )
            : '-'}

          <span
            className="
              ml-2
              text-xs
              font-semibold
              text-slate-500
            "
          >
            {unidad}
          </span>
        </div>

        {completo && (
          <div
            className="
              mt-2
              rounded-lg
              bg-emerald-50
              px-2.5
              py-1.5
              text-xs
              font-bold
              text-emerald-700
            "
          >
            <i
              className="
                fas
                fa-check-circle
                mr-2
              "
            ></i>

            Intensidad completa
          </div>
        )}

        {!completo &&
          !excedido &&
          tieneRequisito && (
            <div
              className="
                mt-2
                rounded-lg
                bg-amber-50
                px-2.5
                py-1.5
                text-xs
                font-semibold
                text-amber-700
              "
            >
              <i
                className="
                  fas
                  fa-clock
                  mr-2
                "
              ></i>

              Faltan{' '}

              {formatearHoras(
                Number(
                  requerido
                ) -
                  Number(
                    configurado
                  )
              )}

              {' '}

              {unidad}
            </div>
          )}

        {excedido && (
          <div
            className="
              mt-2
              rounded-lg
              bg-red-50
              px-2.5
              py-1.5
              text-xs
              font-semibold
              text-red-700
            "
          >
            <i
              className="
                fas
                fa-triangle-exclamation
                mr-2
              "
            ></i>

            Excede en{' '}

            {formatearHoras(
              Number(
                configurado
              ) -
                Number(
                  requerido
                )
            )}

            {' '}

            {unidad}
          </div>
        )}
      </div>
    </div>
  )
}


// ============================================================
// RESUMEN PRÁCTICA
// ============================================================

function ResumenPractica({
  cantidad,
  requerido,
}) {
  const tieneRequisito =
    requerido !== null &&
    requerido !==
      undefined

  const completo =
    tieneRequisito &&
    Number(
      cantidad
    ) ===
      Number(
        requerido
      )

  const excedido =
    tieneRequisito &&
    Number(
      cantidad
    ) >
      Number(
        requerido
      )

  return (
    <div
      className="
        overflow-hidden
        rounded-lg
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
          gap-2
          border-b
        border-[#737B87]
        bg-[#737B87]
        px-3
        py-2
        text-white
        "
      >
        <i
          className="
            fas
            fa-car
          "
        ></i>

        <div
          className="
            text-xs
            font-extrabold
            tracking-wide
          "
        >
          PRÁCTICA
        </div>
      </div>

      <div
        className="
          p-3
        "
      >
        <div
          className="
            text-xs
            font-semibold
            text-slate-600
          "
        >
          Clases configuradas
        </div>

        <div
          className="
            mt-1
            text-lg
            font-extrabold
            text-slate-900
          "
        >
          {cantidad}

          {' / '}

          {tieneRequisito
            ? requerido
            : '-'}

          <span
            className="
              ml-2
              text-xs
              font-semibold
              text-slate-500
            "
          >
            clases
          </span>
        </div>

        {completo && (
          <div
            className="
              mt-2
              rounded-lg
              bg-emerald-50
              px-2.5
              py-1.5
              text-xs
              font-bold
              text-emerald-700
            "
          >
            <i
              className="
                fas
                fa-check-circle
                mr-2
              "
            ></i>

            Cantidad completa
          </div>
        )}

        {!completo &&
          !excedido &&
          tieneRequisito && (
            <div
              className="
                mt-2
                rounded-lg
                bg-amber-50
                px-2.5
                py-1.5
                text-xs
                font-semibold
                text-amber-700
              "
            >
              <i
                className="
                  fas
                  fa-clock
                  mr-2
                "
              ></i>

              Faltan{' '}

              {Number(
                requerido
              ) -
                Number(
                  cantidad
                )}

              {' clases'}
            </div>
          )}

        {excedido && (
          <div
            className="
              mt-2
              rounded-lg
              bg-red-50
              px-2.5
              py-1.5
              text-xs
              font-semibold
              text-red-700
            "
          >
            <i
              className="
                fas
                fa-triangle-exclamation
                mr-2
              "
            ></i>

            Excede en{' '}

            {Number(
              cantidad
            ) -
              Number(
                requerido
              )}

            {' clases'}
          </div>
        )}
      </div>
    </div>
  )
}


// ============================================================
// CONFIRMACIÓN ELIMINAR
// ============================================================

function ConfirmacionEliminar({
  titulo,
  textoConfirmacion,
  advertencia,
  eliminando,
  onCancelar,
  onConfirmar,
}) {
  return (
    <div
      className="
        fixed
        inset-0
        z-[80]
        flex
        items-center
        justify-center
        bg-black/50
        p-4
      "
    >
      <div
        className="
          w-full
          max-w-md
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-xl
        "
      >
        <div
          className="
            bg-slate-800
            px-5
            py-4
            text-white
          "
        >
          <div
            className="
              text-lg
              font-bold
            "
          >
            {titulo}
          </div>
        </div>

        <div
          className="
            p-5
          "
        >
          <div
            className="
              text-sm
              leading-relaxed
              text-slate-600
            "
          >
            {textoConfirmacion}
          </div>

          {advertencia && (
            <div
              className="
                mt-3
                rounded-lg
                bg-amber-50
                p-3
                text-xs
                text-amber-800
              "
            >
              {advertencia}
            </div>
          )}
        </div>

        <div
          className="
            flex
            justify-end
            gap-2
            border-t
            border-gray-200
            px-5
            py-4
          "
        >
          <BotonAccion tipo="regresar"
            type="button"
            disabled={
              eliminando
            }
            onClick={
              onCancelar
            }
            
          >
                <i className="fas fa-arrow-left" aria-hidden="true" />
            Regresar
          </BotonAccion>

          <BotonAccion tipo="eliminar"
            type="button"
            disabled={
              eliminando
            }
            onClick={
              onConfirmar
            }
            
          >
                <i className="fas fa-trash" aria-hidden="true" />
            {eliminando
              ? 'Eliminando...'
              : 'Eliminar'}
          </BotonAccion>
        </div>
      </div>
    </div>
  )
}