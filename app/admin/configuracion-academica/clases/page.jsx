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

  function abrirNuevaClase(
    modulo
  ) {
    setNuevaClase({
      modulo_id:
        modulo.id,

      modulo_nombre:
        modulo.nombre,

      tipo_formacion:
        modulo.tipo_formacion,

      categoria:
        categoriaSeleccionada,

      nombre:
        '',

      duracion_horas:
        '',

      contenido:
        '',

      contenido_tarjeta:
        '',

      observaciones:
        '',

      color_horario:
        '',

      activo:
        true,
    })

    setError('')
    setMensaje('')
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


  // ============================================================
  // GUARDAR NUEVA CLASE
  // ============================================================

  async function guardarNuevaClase() {
    if (
      !nuevaClase
    ) {
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
                  bg-slate-800
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

                              <BotonAccion tipo="agregar"
                                type="button"
                                disabled={
                                  modulo.activo ===
                                  false
                                }
                                onClick={() =>
                                  abrirNuevaClase(
                                    modulo
                                  )
                                }
                                
                              >
                                <i
                                  className="
                                    fas
                                    fa-plus
                                  "
                                ></i>

                                Nueva clase
                              </BotonAccion>
                            </div>
                          </div>


                          <div
                            className="
                              divide-y
                              divide-gray-200
                            "
                          >
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
                                  <div
                                    key={
                                      clase.id
                                    }
                                    className="
                                      flex
                                      flex-col
                                      gap-3
                                      p-4
                                      transition
                                      hover:bg-slate-50
                                      md:flex-row
                                      md:items-center
                                      md:justify-between
                                    "
                                  >
                                    <div
                                      className="
                                        min-w-0
                                        flex-1
                                      "
                                    >
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
                                            text-xs
                                            font-bold
                                            text-slate-400
                                          "
                                        >
                                          #
                                          {
                                            clase.numero_clase
                                          }
                                        </span>

                                        <span
                                          className="
                                            font-semibold
                                            text-slate-900
                                          "
                                        >
                                          {
                                            clase.nombre
                                          }
                                        </span>

                                        {texto(
                                          clase.color_horario
                                        ) &&
                                          [
                                            'TEORIA',
                                            'TALLER',
                                          ].includes(
                                            clase.tipo_formacion
                                          ) && (
                                            <span
                                              title="Color en Horario Teórico"
                                              className="
                                                inline-block
                                                h-5
                                                w-5
                                                shrink-0
                                                rounded-md
                                                border
                                                border-slate-400
                                                shadow-sm
                                              "
                                              style={{
                                                backgroundColor:
                                                  clase.color_horario,
                                              }}
                                            ></span>
                                          )}

                                        {grupoClase && (
                                          <span
                                            className="
                                              rounded-full
                                              border
                                              border-purple-200
                                              bg-purple-50
                                              px-2
                                              py-0.5
                                              text-[10px]
                                              font-bold
                                              text-green-700
                                            "
                                          >
                                            <i
                                              className="
                                                fas
                                                fa-link
                                                mr-1
                                              "
                                            ></i>

                                            TRANSVERSAL
                                          </span>
                                        )}

                                        {clase.activo ===
                                          false && (
                                          <span
                                            className="
                                              rounded-full
                                              bg-gray-100
                                              px-2
                                              py-0.5
                                              text-[10px]
                                              font-bold
                                              text-gray-500
                                            "
                                          >
                                            INACTIVA
                                          </span>
                                        )}
                                      </div>


                                      {grupoClase && (
                                        <div
                                          className="
                                            mt-1
                                            text-xs
                                            font-semibold
                                            text-blue-800
                                          "
                                        >
                                          Grupo:{' '}

                                          {
                                            grupoClase.nombre
                                          }
                                        </div>
                                      )}


                                      <div
                                        className="
                                          mt-1
                                          text-xs
                                          text-slate-500
                                        "
                                      >
                                        {clase.tipo_formacion !==
                                          'PRACTICA' && (
                                          <>
                                            Duración:{' '}

                                            {clase.duracion_horas
                                              ? `${formatearHoras(
                                                  clase.duracion_horas
                                                )} hora(s)`
                                              : 'Sin configurar'}
                                          </>
                                        )}

                                        {clase.tipo_formacion ===
                                          'PRACTICA' && (
                                          <>
                                            Contenido
                                            para tarjeta:{' '}

                                            {texto(
                                              clase.contenido_tarjeta
                                            )
                                              ? 'Configurado'
                                              : 'Pendiente'}
                                          </>
                                        )}
                                      </div>


                                      {texto(
                                        clase.contenido_tarjeta
                                      ) && (
                                        <div
                                          className="
                                            mt-2
                                            text-xs
                                            leading-relaxed
                                            text-slate-600
                                          "
                                        >
                                          {
                                            clase.contenido_tarjeta
                                          }
                                        </div>
                                      )}
                                    </div>


                                    <div
                                      className="
                                        flex
                                        flex-wrap
                                        gap-2
                                      "
                                    >
                                      <BotonAccion tipo="editar"
                                        type="button"
                                        onClick={() =>
                                          abrirEdicion(
                                            clase
                                          )
                                        }
                                        
                                      >
                                        <i
                                          className="
                                            fas
                                            fa-edit
                                            mr-2
                                          "
                                        ></i>

                                        Editar
                                      </BotonAccion>

                                      <BotonAccion tipo="eliminar"
                                        type="button"
                                        onClick={() =>
                                          solicitarEliminar(
                                            clase
                                          )
                                        }
                                        
                                      >
                                        <i
                                          className="
                                            fas
                                            fa-trash
                                            mr-2
                                          "
                                        ></i>

                                        Eliminar
                                      </BotonAccion>
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

                                <BotonAccion tipo="agregar"
                                  type="button"
                                  onClick={() =>
                                    abrirNuevaClase(
                                      modulo
                                    )
                                  }
                                  
                                >
                                  <i
                                    className="
                                      fas
                                      fa-plus
                                      mr-2
                                    "
                                  ></i>

                                  Crear primera
                                  clase
                                </BotonAccion>
                              </div>
                            )}
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
                bg-slate-800
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


            {gruposTransversales.length >
            0 ? (
              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  bg-slate-50
                  p-4
                  lg:grid-cols-2
                "
              >
                {gruposTransversales.map(
                  (
                    grupo
                  ) => (
                    <div
                      key={
                        grupo.id
                      }
                      className="
                        rounded-xl
                        border-2
                        border-slate-300
                        bg-white
                        p-4
                        shadow-sm
                        transition
                        hover:border-slate-500
                      "
                    >
                      <div
                        className="
                          flex
                          h-full
                          flex-col
                        "
                      >
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
                              text-xs
                              font-extrabold
                              uppercase
                              text-slate-900
                            "
                          >
                            {
                              grupo.nombre
                            }
                          </span>

                          {texto(
                            grupo.color_horario
                          ) && (
                            <span
                              title="Color en Horario Teórico"
                              className="
                                inline-flex
                                h-6
                                w-6
                                shrink-0
                                items-center
                                justify-center
                                rounded-md
                                border
                                border-slate-400
                                shadow-sm
                              "
                              style={{
                                backgroundColor:
                                  grupo.color_horario,
                              }}
                            >
                              <i
                                className="
                                  fas
                                  fa-palette
                                  text-[9px]
                                  text-slate-700
                                  drop-shadow
                                "
                              ></i>
                            </span>
                          )}

                          <span
                            className="
                              rounded-full
                              bg-blue-50
                              px-2
                              py-1
                              text-[10px]
                              font-bold
                              text-blue-700
                            "
                          >
                            {
                              grupo.tipo_formacion
                            }
                          </span>

                          {grupo.activo ===
                            false && (
                            <span
                              className="
                                rounded-full
                                bg-gray-100
                                px-2
                                py-1
                                text-[10px]
                                font-bold
                                text-gray-600
                              "
                            >
                              INACTIVO
                            </span>
                          )}
                        </div>


                        <div
                          className="
                            mt-3
                            flex
                            flex-wrap
                            gap-2
                          "
                        >
                          {Array.isArray(
                            grupo.categorias
                          ) &&
                            grupo.categorias.map(
                              (
                                categoria
                              ) => (
                                <span
                                  key={
                                    categoria
                                  }
                                  className="
                                    rounded-md
                                    border
                                    border-emerald-300
                                    bg-emerald-50
                                    px-3
                                    py-1
                                    text-xs
                                    font-extrabold
                                    text-emerald-700
                                  "
                                >
                                  {
                                    categoria
                                  }
                                </span>
                              )
                            )}
                        </div>


                        {Array.isArray(
                          grupo.clases
                        ) &&
                          grupo.clases.length >
                            0 && (
                          <div
                            className="
                              mt-4
                              space-y-2
                            "
                          >
                            {grupo.clases.map(
                              (
                                clase
                              ) => (
                                <div
                                  key={
                                    clase.id
                                  }
                                  className="
                                    rounded-lg
                                    border
                                    border-slate-200
                                    bg-slate-50
                                    px-3
                                    py-2
                                    text-xs
                                    text-slate-700
                                  "
                                >
                                  <strong
                                    className="
                                      text-slate-900
                                    "
                                  >
                                    {
                                      clase.categoria
                                    }
                                  </strong>

                                  {' · '}

                                  {
                                    clase.nombre
                                  }
                                </div>
                              )
                            )}
                          </div>
                        )}


                        {texto(
                          grupo.observaciones
                        ) && (
                          <div
                            className="
                              mt-3
                              text-xs
                              italic
                              text-slate-500
                            "
                          >
                            {
                              grupo.observaciones
                            }
                          </div>
                        )}


                        <div
                          className="
                            mt-auto
                            flex
                            flex-wrap
                            gap-2
                            pt-4
                          "
                        >
                          <BotonAccion tipo="editar"
                            type="button"
                            onClick={() =>
                              abrirEditarGrupo(
                                grupo
                              )
                            }
                            
                          >
                            <i
                              className="
                                fas
                                fa-edit
                                mr-2
                              "
                            ></i>

                            Editar
                          </BotonAccion>

                          <BotonAccion tipo="eliminar"
                            type="button"
                            onClick={() =>
                              solicitarEliminarGrupo(
                                grupo
                              )
                            }
                            
                          >
                            <i
                              className="
                                fas
                                fa-trash
                                mr-2
                              "
                            ></i>

                            Eliminar
                          </BotonAccion>
                        </div>
                      </div>
                    </div>
                  )
                )}
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


              <div>
                <div
                  className="
                    mb-2
                    text-xs
                    font-semibold
                    text-slate-700
                  "
                >
                  Clases y categorías
                </div>

                <div
                  className="
                    rounded-lg
                    border
                    border-gray-200
                    bg-gray-50
                    p-3
                  "
                >
                  <div
                    className="
                      mb-3
                      text-xs
                      text-slate-500
                    "
                  >
                    Debe seleccionar por
                    lo menos dos clases de
                    categorías diferentes.
                  </div>


                  <div
                    className="
                      space-y-4
                    "
                  >
                    {categorias.map(
                      (
                        categoria
                      ) => {
                        const clasesCategoria =
                          clasesGrupoDisponibles.filter(
                            (
                              clase
                            ) =>
                              clase.categoria ===
                              categoria
                          )

                        if (
                          !clasesCategoria.length
                        ) {
                          return null
                        }

                        return (
                          <div
                            key={
                              categoria
                            }
                            className="
                              rounded-lg
                              border-2
                              border-slate-300
                              bg-white
                              p-3
                            "
                          >
                            <div
                              className="
                                mb-2
                                text-xs
                                font-extrabold
                                text-[var(--primary)]
                              "
                            >
                              {
                                categoria
                              }
                            </div>

                            <div
                              className="
                                space-y-2
                              "
                            >
                              {clasesCategoria.map(
                                (
                                  clase
                                ) => {
                                  const ocupadaPor =
                                    obtenerGrupoClase(
                                      clase.id
                                    )

                                  const seleccionada =
                                    grupoEditando.clase_ids.includes(
                                      Number(
                                        clase.id
                                      )
                                    )

                                  return (
                                    <label
                                      key={
                                        clase.id
                                      }
                                      className={`
                                        flex
                                        items-start
                                        gap-3
                                        rounded-lg
                                        border
                                        p-3
                                        ${
                                          ocupadaPor
                                            ? `
                                              cursor-not-allowed
                                              border-gray-200
                                              bg-gray-100
                                              opacity-60
                                            `
                                            : seleccionada
                                              ? `
                                                cursor-pointer
                                                border-blue-400
                                                bg-blue-50
                                              `
                                              : `
                                                cursor-pointer
                                                border-gray-200
                                                bg-white
                                                hover:bg-gray-50
                                              `
                                        }
                                      `}
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={
                                          Boolean(
                                            ocupadaPor
                                          )
                                        }
                                        checked={
                                          seleccionada
                                        }
                                        onChange={() =>
                                          alternarClaseGrupo(
                                            clase.id
                                          )
                                        }
                                        className="
                                          mt-1
                                        "
                                      />

                                      <div
                                        className="
                                          min-w-0
                                          flex-1
                                        "
                                      >
                                        <div
                                          className="
                                            text-xs
                                            font-semibold
                                            text-slate-800
                                          "
                                        >
                                          {
                                            clase.nombre
                                          }
                                        </div>

                                        {clase.duracion_horas && (
                                          <div
                                            className="
                                              mt-1
                                              text-xs
                                              text-slate-500
                                            "
                                          >
                                            Duración:{' '}

                                            {formatearHoras(
                                              clase.duracion_horas
                                            )}{' '}

                                            hora(s)
                                          </div>
                                        )}

                                        {ocupadaPor && (
                                          <div
                                            className="
                                              mt-1
                                              text-xs
                                              font-semibold
                                              text-purple-700
                                            "
                                          >
                                            Ya pertenece a:{' '}

                                            {
                                              ocupadaPor.nombre
                                            }
                                          </div>
                                        )}
                                      </div>
                                    </label>
                                  )
                                }
                              )}
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>
                </div>
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
                Editar clase
              </div>

              <div
                className="
                  mt-1
                  text-xs
                  text-slate-300
                "
              >
                {
                  claseEditando.categoria
                }

                {' · '}

                {
                  claseEditando.tipo_formacion
                }

                {' · Clase '}

                {
                  claseEditando.numero_clase
                }
              </div>
            </div>


            <div
              className="
                space-y-4
                p-5
              "
            >
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
                etiqueta="Contenido para tarjeta"
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

              {[
                'TEORIA',
                'TALLER',
              ].includes(
                claseEditando
                  .tipo_formacion
              ) && (
                <Campo
                  etiqueta="Color en Horario Teórico"
                >
                  <SelectorColorHorario
                    valor={
                      claseEditando
                        .color_horario
                    }
                    onChange={(
                      color
                    ) =>
                      cambiarCampoEdicion(
                        'color_horario',
                        color
                      )
                    }
                  />
                </Campo>
              )}


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
                Nueva clase
              </div>

              <div
                className="
                  mt-1
                  text-xs
                  text-slate-300
                "
              >
                {
                  nuevaClase.categoria
                }

                {' · '}

                {
                  nuevaClase.tipo_formacion
                }
              </div>

              <div
                className="
                  mt-1
                  text-xs
                  font-semibold
                  text-slate-200
                "
              >
                Módulo:{' '}

                {
                  nuevaClase.modulo_nombre
                }
              </div>
            </div>


            <div
              className="
                space-y-4
                p-5
              "
            >
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
                etiqueta="Contenido para tarjeta"
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

               {[
                'TEORIA',
                'TALLER',
              ].includes(
                nuevaClase
                  .tipo_formacion
              ) && (
                <Campo
                  etiqueta="Color en Horario Teórico"
                >
                  <SelectorColorHorario
                    valor={
                      nuevaClase
                        .color_horario
                    }
                    onChange={(
                      color
                    ) =>
                      cambiarCampoNueva(
                        'color_horario',
                        color
                      )
                    }
                  />
                </Campo>
              )}


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
        Seleccione el color con el que
        aparecerá en el Horario Teórico.
      </div>

      <div
        className="
          grid
          grid-cols-6
          gap-2
          sm:grid-cols-9
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