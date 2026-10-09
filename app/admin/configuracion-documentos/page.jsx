// app/admin/configuracion-documentos/page.jsx

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
import { Files } from 'lucide-react'
import ModalResultado from '@/components/admin/ModalResultado'
import { ESTILO_ENCABEZADO_TABLA, ESTILO_CELDAS_TABLA, FranjaSuperiorModal, BotonEditar, BotonAgregar, BotonEliminar, BotonGuardar } from '@/components/admin/EstiloModulo'


// =======================================================
// CONSTANTES
// =======================================================

const PESTANAS_PRINCIPALES = [
  {
    value:
      'ENCABEZADO',
    label:
      'Diseñador de Encabezado',
    icon:
      'fa-table-cells-large',
  },
  {
    value:
      'DATOS_ENCABEZADO',
    label:
      'Datos de Encabezado',
    icon:
      'fa-list-check',
  },
  {
    value:
      'OTROS_DOCUMENTOS',
    label:
      'Otros Documentos',
    icon:
      'fa-folder-open',
  },
  {
    value:
      'CONTRATO',
    label:
      'Contrato',
    icon:
      'fa-file-signature',
  },
  {
    value:
      'CODIGO_CONDUCTA',
    label:
      'Código de Conducta',
    icon:
      'fa-scale-balanced',
  },
  {
    value:
      'AUTORIZACION_DATOS_CEA',
    label:
      'Autorización de Datos',
    icon:
      'fa-user-shield',
  },
]


const TIPOS_DOCUMENTO_ESPECIALES = [
  'CONTRATO',
  'CODIGO_CONDUCTA',
  'AUTORIZACION_DATOS_CEA',
]


const DOCUMENTO_VACIO = {
  nombre_documento:
    '',

  codigo:
    '',

  fecha_edicion:
    '',

  version:
    '',

  vigencia:
    '',

  activo:
    true,

  observaciones:
    '',
}


const TIPOS_ELEMENTO = [
  {
    value:
      'LOGO',
    label:
      'Logo institucional',
  },
  {
    value:
      'NOMBRE_DOCUMENTO',
    label:
      'Nombre del documento',
  },
  {
    value:
      'CODIGO',
    label:
      'Código',
  },
  {
    value:
      'FECHA_EDICION',
    label:
      'Fecha de elaboración',
  },
  {
    value:
      'VERSION',
    label:
      'Versión',
  },
  {
    value:
      'VIGENCIA',
    label:
      'Fecha de vigencia',
  },
  {
    value:
      'PAGINACION',
    label:
      'Paginación',
  },
  {
    value:
      'TEXTO',
    label:
      'Texto fijo',
  },
  {
    value:
      'VACIO',
    label:
      'Espacio vacío',
  },
]


// =======================================================
// HELPERS GENERALES
// =======================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
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
    user?.nombre ||
    user?.name ||
    user?.usuario ||
    user?.email ||
    ''
  )
}


function esDocumentoEspecial(
  documento
) {
  return TIPOS_DOCUMENTO_ESPECIALES.includes(
    texto(
      documento?.tipo_documento
    ).toUpperCase()
  )
}


function crearCelda(
  fila,
  columna
) {
  return {
    id:
      `celda-${fila}-${columna}`,

    fila,

    columna,

    rowSpan: 1,

    colSpan: 1,

    borde_superior:
      true,

    borde_inferior:
      true,

    borde_izquierdo:
      true,

    borde_derecho:
      true,

    alineacion_horizontal:
      'center',

    alineacion_vertical:
      'center',

    elementos: [
      {
        tipo:
          'VACIO',

        prefijo:
          '',

        valor:
          '',

        negrita:
          false,

        tamano_fuente:
          9,
      },
    ],
  }
}


function copiarProfundo(
  valor
) {
  return JSON.parse(
    JSON.stringify(
      valor
    )
  )
}


function fechaVisual(
  valor
) {
  if (
    !valor
  ) {
    return ''
  }

  const partes =
    String(
      valor
    ).split(
      '-'
    )

  if (
    partes.length !==
    3
  ) {
    return valor
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}



const ORDINALES_CLAUSULA = {
  1: 'PRIMERA',
  2: 'SEGUNDA',
  3: 'TERCERA',
  4: 'CUARTA',
  5: 'QUINTA',
  6: 'SEXTA',
  7: 'SÉPTIMA',
  8: 'OCTAVA',
  9: 'NOVENA',
  10: 'DÉCIMA',
  11: 'DÉCIMA PRIMERA',
  12: 'DÉCIMA SEGUNDA',
  13: 'DÉCIMA TERCERA',
  14: 'DÉCIMA CUARTA',
  15: 'DÉCIMA QUINTA',
  16: 'DÉCIMA SEXTA',
  17: 'DÉCIMA SÉPTIMA',
  18: 'DÉCIMA OCTAVA',
  19: 'DÉCIMA NOVENA',
  20: 'VIGÉSIMA',
  21: 'VIGÉSIMA PRIMERA',
  22: 'VIGÉSIMA SEGUNDA',
  23: 'VIGÉSIMA TERCERA',
  24: 'VIGÉSIMA CUARTA',
  25: 'VIGÉSIMA QUINTA',
  26: 'VIGÉSIMA SEXTA',
  27: 'VIGÉSIMA SÉPTIMA',
  28: 'VIGÉSIMA OCTAVA',
  29: 'VIGÉSIMA NOVENA',
  30: 'TRIGÉSIMA',
}


function nombreClausula(
  orden
) {
  const numero =
    Number(
      orden
    ) ||
    0

  return (
    ORDINALES_CLAUSULA[
      numero
    ] ||
    String(
      numero
    )
  )
}


function tituloVisualClausula(
  clausula,
  indice
) {
  const orden =
    Number(
      clausula?.orden
    ) ||
    indice +
      1

  const titulo =
    texto(
      clausula?.titulo
    )

  return titulo
    ? `CLÁUSULA ${nombreClausula(orden)}: ${titulo}`
    : `CLÁUSULA ${nombreClausula(orden)}:`
}


// =======================================================
// PÁGINA
// =======================================================

export default function ConfiguracionDocumentosPage() {
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
    nitEmpresa,
    setNitEmpresa,
  ] =
    useState(
      ''
    )

  const [
    cargando,
    setCargando,
  ] =
    useState(
      true
    )

  const [
    guardandoEncabezado,
    setGuardandoEncabezado,
  ] =
    useState(
      false
    )

  const [
    guardandoDocumento,
    setGuardandoDocumento,
  ] =
    useState(
      false
    )

  const [
    mensaje,
    setMensaje,
  ] =
    useState(
      ''
    )

  const [
    error,
    setError,
  ] =
    useState(
      ''
    )

  const [confirmacionPendiente, setConfirmacionPendiente] = useState(null)
  const [modalAviso, setModalAviso] = useState(null)

  // La confirmación conserva el flujo asíncrono original: cancelar no ejecuta la operación.
  const solicitarConfirmacion = (mensaje) => new Promise((resolver) => {
    setConfirmacionPendiente({ mensaje, resolver })
  })

  const responderConfirmacion = (aceptar) => {
    confirmacionPendiente?.resolver(aceptar)
    setConfirmacionPendiente(null)
  }

  useEffect(() => {
    if (error) setModalAviso({ tipo: 'error', mensaje: error })
  }, [error])

  useEffect(() => {
    if (mensaje) setModalAviso({ tipo: 'exito', mensaje })
  }, [mensaje])

  const [
    logoUrl,
    setLogoUrl,
  ] =
    useState(
      ''
    )

  const [
    tipoDocumentoActivo,
    setTipoDocumentoActivo,
  ] =
    useState(
      'CONTRATO'
    )

  const [
    documentos,
    setDocumentos,
  ] =
    useState(
      []
    )

  const [
    documentoEditandoId,
    setDocumentoEditandoId,
  ] =
    useState(
      null
    )

  const [
    formularioDocumento,
    setFormularioDocumento,
  ] =
    useState(
      {
        ...DOCUMENTO_VACIO,
      }
    )

  const [
    mostrandoFormularioDocumento,
    setMostrandoFormularioDocumento,
  ] =
    useState(
      false
    )

  const [
    guardandoOtroDocumento,
    setGuardandoOtroDocumento,
  ] =
    useState(
      false
    )

  const [
    eliminandoDocumento,
    setEliminandoDocumento,
  ] =
    useState(
      null
    )

  const [
    encabezado,
    setEncabezado,
  ] =
    useState(
      null
    )

  const [
    celdaSeleccionadaId,
    setCeldaSeleccionadaId,
  ] =
    useState(
      ''
    )

  const [
    elementoNuevo,
    setElementoNuevo,
  ] =
    useState(
      'TEXTO'
    )


  const [
    pestanaPrincipal,
    setPestanaPrincipal,
  ] =
    useState(
      'ENCABEZADO'
    )

  const [
    configuracionContrato,
    setConfiguracionContrato,
  ] =
    useState(
      {
        texto_introductorio:
          '',

        texto_final:
          '',

        mostrar_foto:
          true,

        mostrar_huella:
          true,

        activo:
          true,

        observaciones:
          '',
      }
    )

  const [
    clausulasContrato,
    setClausulasContrato,
  ] =
    useState(
      []
    )

  const [
    guardandoContrato,
    setGuardandoContrato,
  ] =
    useState(
      false
    )

  const [
    guardandoClausula,
    setGuardandoClausula,
  ] =
    useState(
      null
    )

  const [
    agregandoClausula,
    setAgregandoClausula,
  ] =
    useState(
      false
    )

  const [
    eliminandoClausula,
    setEliminandoClausula,
  ] =
    useState(
      null
    )

  const [
    seccionesCodigoConducta,
    setSeccionesCodigoConducta,
  ] =
    useState(
      []
    )

  const [
    guardandoSeccionCodigo,
    setGuardandoSeccionCodigo,
  ] =
    useState(
      null
    )

  const [
    agregandoSeccionCodigo,
    setAgregandoSeccionCodigo,
  ] =
    useState(
      false
    )

  const [
    eliminandoSeccionCodigo,
    setEliminandoSeccionCodigo,
  ] =
    useState(
      null
    )

  const [
    configuracionAutorizacionDatos,
    setConfiguracionAutorizacionDatos,
  ] =
    useState(
      {
        correo_proteccion_datos:
          '',

        telefono_contacto:
          '',

        direccion_contacto:
          '',

        medio_politica:
          '',

        texto_datos_biometricos:
          '',

        texto_menores_edad:
          '',

        texto_declaracion_final:
          '',

        activo:
          true,
      }
    )

  const [
    seccionesAutorizacionDatos,
    setSeccionesAutorizacionDatos,
  ] =
    useState(
      []
    )

  const [
    finalidadesAutorizacionDatos,
    setFinalidadesAutorizacionDatos,
  ] =
    useState(
      []
    )

  const [
    guardandoConfiguracionAutorizacion,
    setGuardandoConfiguracionAutorizacion,
  ] =
    useState(
      false
    )

  const [
    guardandoSeccionAutorizacion,
    setGuardandoSeccionAutorizacion,
  ] =
    useState(
      null
    )

  const [
    agregandoSeccionAutorizacion,
    setAgregandoSeccionAutorizacion,
  ] =
    useState(
      false
    )

  const [
    eliminandoSeccionAutorizacion,
    setEliminandoSeccionAutorizacion,
  ] =
    useState(
      null
    )

  const [
    guardandoFinalidadAutorizacion,
    setGuardandoFinalidadAutorizacion,
  ] =
    useState(
      null
    )

  const [
    agregandoFinalidadAutorizacion,
    setAgregandoFinalidadAutorizacion,
  ] =
    useState(
      false
    )

  const [
    eliminandoFinalidadAutorizacion,
    setEliminandoFinalidadAutorizacion,
  ] =
    useState(
      null
    )

      // =======================================================
  // VERSIONES DE DOCUMENTOS ESPECIALES
  // =======================================================

  const [
    versionesDocumentos,
    setVersionesDocumentos,
  ] =
    useState({
      CONTRATO: [],
      CODIGO_CONDUCTA: [],
      AUTORIZACION_DATOS_CEA: [],
    })

  const [
    modoEdicionDocumento,
    setModoEdicionDocumento,
  ] =
    useState(
      false
    )

  const [
    mostrandoNuevaVersion,
    setMostrandoNuevaVersion,
  ] =
    useState(
      false
    )

  const [
    creandoNuevaVersion,
    setCreandoNuevaVersion,
  ] =
    useState(
      false
    )

  const [
    formularioNuevaVersion,
    setFormularioNuevaVersion,
  ] =
    useState({
      nombre_documento:
        '',

      codigo:
        '',

      fecha_edicion:
        '',

      version:
        '',

      vigencia:
        '',

      activo:
        true,

      observaciones:
        '',
    })

  const [
    mostrandoHistorialVersiones,
    setMostrandoHistorialVersiones,
  ] =
    useState(
      false
    )

  const [
    versionHistoricaSeleccionada,
    setVersionHistoricaSeleccionada,
  ] =
    useState(
      null
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

        if (
          !guardado
        ) {
          router.replace(
            '/login'
          )

          return
        }

        const user =
          JSON.parse(
            guardado
          )

        const nit =
          obtenerNitUsuario(
            user
          )

        if (
          !nit
        ) {
          router.replace(
            '/login'
          )

          return
        }

        setCurrentUser(
          user
        )

        setNitEmpresa(
          nit
        )
      } catch (
        err
      ) {
        console.error(
          'Error leyendo sesión:',
          err
        )

        router.replace(
          '/login'
        )
      }
    },
    [
      router,
    ]
  )


  // =======================================================
  // CARGAR CONFIGURACIÓN
  // =======================================================

  useEffect(
    () => {
      if (
        !nitEmpresa
      ) {
        return
      }

      cargarTodo()
    },
    [
      nitEmpresa,
    ]
  )


  async function cargarTodo() {
    setCargando(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      await Promise.all(
        [
          cargarConfiguracion(),
          cargarLogo(),
          cargarContrato(),
        ]
      )

      await Promise.all(
        [
          cargarCodigoConducta(),
          cargarAutorizacionDatos(),
        ]
      )
    } catch (
      err
    ) {
      console.error(
        err
      )
    } finally {
      setCargando(
        false
      )
    }
  }


  async function cargarConfiguracion() {
    const response =
      await fetch(
        '/api/admin/configuracion-documentos',
        {
          method:
            'GET',

          headers: {
            'x-cea-nit':
              nitEmpresa,
          },

          cache:
            'no-store',
        }
      )

    const data =
      await response.json()

    if (
      !response.ok ||
      !data?.ok
    ) {
      throw new Error(
        data?.error ||
        'No fue posible cargar la configuración.'
      )
    }

    const encabezadoApi =
      data?.encabezado

    if (
      !encabezadoApi
    ) {
      throw new Error(
        'No existe la configuración GENERAL del encabezado.'
      )
    }

    const encabezadoNormalizado = {
      ...encabezadoApi,

      estructura: {
        version_esquema:
          encabezadoApi
            ?.estructura
            ?.version_esquema ||
          1,

        configuracion: {
          borde_exterior:
            encabezadoApi
              ?.estructura
              ?.configuracion
              ?.borde_exterior !==
            false,

          grosor_borde:
            Number(
              encabezadoApi
                ?.estructura
                ?.configuracion
                ?.grosor_borde ||
              1
            ),

          padding:
            Number(
              encabezadoApi
                ?.estructura
                ?.configuracion
                ?.padding ||
              4
            ),

          altura_total_mm:
            Number(
              encabezadoApi
                ?.estructura
                ?.configuracion
                ?.altura_total_mm ||
              24
            ),
        },

        filas:
          Array.isArray(
            encabezadoApi
              ?.estructura
              ?.filas
          )
            ? encabezadoApi
                .estructura
                .filas
            : [],

        columnas:
          Array.isArray(
            encabezadoApi
              ?.estructura
              ?.columnas
          )
            ? encabezadoApi
                .estructura
                .columnas
            : [],

        celdas:
          Array.isArray(
            encabezadoApi
              ?.estructura
              ?.celdas
          )
            ? encabezadoApi
                .estructura
                .celdas
                .map(
                  celda => ({
                    ...celda,

                    elementos:
                      Array.isArray(
                        celda?.elementos
                      )
                        ? celda.elementos.map(
                            elemento => {
                              const prefijo =
                                texto(
                                  elemento?.prefijo
                                )

                              if (
                                elemento?.tipo ===
                                  'FECHA_EDICION' &&
                                prefijo.toLowerCase() ===
                                  'fecha:'
                              ) {
                                return {
                                  ...elemento,

                                  tipo:
                                    'VIGENCIA',
                                }
                              }

                              return elemento
                            }
                          )
                        : [],
                  })
                )
            : [],
      },
    }

    setEncabezado(
      encabezadoNormalizado
    )

    setDocumentos(
      Array.isArray(
        data?.documentos
      )
        ? data.documentos
        : []
    )

    const primeraCelda =
      encabezadoNormalizado
        ?.estructura
        ?.celdas?.[0]

    setCeldaSeleccionadaId(
      primeraCelda?.id ||
      ''
    )
  }


  async function cargarLogo() {
    try {
      const response =
        await fetch(
          '/api/admin/configuracion-academica/logo',
          {
            method:
              'GET',

            headers: {
              'x-cea-nit':
                nitEmpresa,
            },

            cache:
              'no-store',
          }
        )

      const data =
        await response.json()

      if (
        !response.ok
      ) {
        return
      }

      const url =
        data?.logo_actual_url ||
        data?.url_actual ||
        data?.logoUrl ||
        data?.logo_url ||
        data?.actual?.url ||
        ''

      setLogoUrl(
        url
      )
    } catch (
      err
    ) {
      console.error(
        'Error cargando logo:',
        err
      )
    }
  }


  async function cargarContrato() {
    const response =
      await fetch(
        '/api/admin/configuracion-contrato',
        {
          method:
            'GET',

          headers: {
            'x-cea-nit':
              nitEmpresa,
          },

          cache:
            'no-store',
        }
      )

    const data =
      await response.json()

    if (
      !response.ok ||
      !data?.ok
    ) {
      throw new Error(
        data?.error ||
        'No fue posible cargar la configuración del contrato.'
      )
    }

    if (
      data?.documento
    ) {
      setDocumentos(
        anteriores => {
          const otros =
            anteriores.filter(
              item =>
                item
                  ?.tipo_documento !==
                'CONTRATO'
            )

          return [
            ...otros,
            data.documento,
          ]
        }
      )
    }

    setConfiguracionContrato(
      {
        texto_introductorio:
          data
            ?.configuracion
            ?.texto_introductorio ||
          '',

        texto_final:
          data
            ?.configuracion
            ?.texto_final ||
          '',

        mostrar_foto:
          data
            ?.configuracion
            ?.mostrar_foto !==
          false,

        mostrar_huella:
          data
            ?.configuracion
            ?.mostrar_huella !==
          false,

        activo:
          data
            ?.configuracion
            ?.activo !==
          false,

        observaciones:
          data
            ?.configuracion
            ?.observaciones ||
          '',
      }
    )

        setClausulasContrato(
      Array.isArray(
        data?.clausulas
      )
        ? data.clausulas
        : []
    )

    setVersionesDocumentos(
      anterior => ({
        ...anterior,

        CONTRATO:
          Array.isArray(
            data?.versiones
          )
            ? data.versiones
            : [],
      })
    )
  }


  async function cargarCodigoConducta() {
    const response =
      await fetch(
        '/api/admin/configuracion-codigo-conducta',
        {
          method:
            'GET',

          headers: {
            'x-cea-nit':
              nitEmpresa,
          },

          cache:
            'no-store',
        }
      )

    const data =
      await response.json()

    if (
      !response.ok ||
      !data?.ok
    ) {
      throw new Error(
        data?.error ||
        'No fue posible cargar la configuración del Código de Conducta.'
      )
    }

    if (
      data?.documento
    ) {
      setDocumentos(
        anteriores => {
          const otros =
            anteriores.filter(
              item =>
                item
                  ?.tipo_documento !==
                'CODIGO_CONDUCTA'
            )

          return [
            ...otros,
            data.documento,
          ]
        }
      )
    }

    setSeccionesCodigoConducta(
      Array.isArray(
        data?.secciones
      )
        ? data.secciones
        : []
    )
        setVersionesDocumentos(
      anterior => ({
        ...anterior,

        CODIGO_CONDUCTA:
          Array.isArray(
            data?.versiones
          )
            ? data.versiones
            : [],
      })
    )
  }


  async function cargarAutorizacionDatos() {
    const response =
      await fetch(
        '/api/admin/configuracion-autorizacion-datos',
        {
          method:
            'GET',

          headers: {
            'x-cea-nit':
              nitEmpresa,
          },

          cache:
            'no-store',
        }
      )

    const data =
      await response.json()

    if (
      !response.ok ||
      !data?.ok
    ) {
      throw new Error(
        data?.error ||
        'No fue posible cargar la configuración de la Autorización de Datos.'
      )
    }

    if (
      data?.documento
    ) {
      setDocumentos(
        anteriores => {
          const otros =
            anteriores.filter(
              item =>
                item
                  ?.tipo_documento !==
                'AUTORIZACION_DATOS_CEA'
            )

          return [
            ...otros,
            data.documento,
          ]
        }
      )
    }

    setConfiguracionAutorizacionDatos(
      {
        correo_proteccion_datos:
          data
            ?.configuracion
            ?.correo_proteccion_datos ||
          '',

        telefono_contacto:
          data
            ?.configuracion
            ?.telefono_contacto ||
          '',

        direccion_contacto:
          data
            ?.configuracion
            ?.direccion_contacto ||
          '',

        medio_politica:
          data
            ?.configuracion
            ?.medio_politica ||
          '',

        texto_datos_biometricos:
          data
            ?.configuracion
            ?.texto_datos_biometricos ||
          '',

        texto_menores_edad:
          data
            ?.configuracion
            ?.texto_menores_edad ||
          '',

        texto_declaracion_final:
          data
            ?.configuracion
            ?.texto_declaracion_final ||
          '',

        activo:
          data
            ?.configuracion
            ?.activo !==
          false,
      }
    )

    setSeccionesAutorizacionDatos(
      Array.isArray(
        data?.secciones
      )
        ? data.secciones
        : []
    )

    setFinalidadesAutorizacionDatos(
      Array.isArray(
        data?.finalidades
      )
        ? data.finalidades
        : []
    )

        setVersionesDocumentos(
      anterior => ({
        ...anterior,

        AUTORIZACION_DATOS_CEA:
          Array.isArray(
            data?.versiones
          )
            ? data.versiones
            : [],
      })
    )
  }


  // =======================================================
  // DATOS DERIVADOS
  // =======================================================

  const documentoActivo =
    useMemo(
      () =>
        documentos.find(
          (
            item
          ) =>
            item
              ?.tipo_documento ===
            tipoDocumentoActivo
        ) ||
        null,
      [
        documentos,
        tipoDocumentoActivo,
      ]
    )


  const otrosDocumentos =
    useMemo(
      () =>
        documentos.filter(
          item =>
            !esDocumentoEspecial(
              item
            )
        ),
      [
        documentos,
      ]
    )


  const celdaSeleccionada =
    useMemo(
      () =>
        encabezado
          ?.estructura
          ?.celdas
          ?.find(
            (
              celda
            ) =>
              celda.id ===
              celdaSeleccionadaId
          ) ||
        null,
      [
        encabezado,
        celdaSeleccionadaId,
      ]
    )


  // =======================================================
  // ACTUALIZAR ENCABEZADO EN ESTADO
  // =======================================================


    const versionesDocumentoActivo =
    useMemo(
      () =>
        Array.isArray(
          versionesDocumentos[
            tipoDocumentoActivo
          ]
        )
          ? versionesDocumentos[
              tipoDocumentoActivo
            ]
          : [],
      [
        versionesDocumentos,
        tipoDocumentoActivo,
      ]
    )


  function endpointDocumentoEspecial(
    tipo
  ) {
    if (
      tipo ===
      'CONTRATO'
    ) {
      return '/api/admin/configuracion-contrato'
    }

    if (
      tipo ===
      'CODIGO_CONDUCTA'
    ) {
      return '/api/admin/configuracion-codigo-conducta'
    }

    if (
      tipo ===
      'AUTORIZACION_DATOS_CEA'
    ) {
      return '/api/admin/configuracion-autorizacion-datos'
    }

    return ''
  }


  function nombreDocumentoEspecial(
    tipo
  ) {
    if (
      tipo ===
      'CONTRATO'
    ) {
      return 'Contrato'
    }

    if (
      tipo ===
      'CODIGO_CONDUCTA'
    ) {
      return 'Código de Conducta'
    }

    if (
      tipo ===
      'AUTORIZACION_DATOS_CEA'
    ) {
      return 'Autorización para el Tratamiento de Datos Personales'
    }

    return 'Documento'
  }


  async function recargarDocumentoEspecial(
    tipo
  ) {
    if (
      tipo ===
      'CONTRATO'
    ) {
      await cargarContrato()

      return
    }

    if (
      tipo ===
      'CODIGO_CONDUCTA'
    ) {
      await cargarCodigoConducta()

      return
    }

    if (
      tipo ===
      'AUTORIZACION_DATOS_CEA'
    ) {
      await cargarAutorizacionDatos()
    }
  }

  function actualizarEncabezadoEstado(
    callback
  ) {
    setEncabezado(
      (
        anterior
      ) => {
        if (
          !anterior
        ) {
          return anterior
        }

        const copia =
          copiarProfundo(
            anterior
          )

        callback(
          copia
        )

        return copia
      }
    )
  }


  function actualizarCeldaSeleccionada(
    cambios
  ) {
    if (
      !celdaSeleccionadaId
    ) {
      return
    }

    actualizarEncabezadoEstado(
      (
        copia
      ) => {
        const index =
          copia
            .estructura
            .celdas
            .findIndex(
              (
                celda
              ) =>
                celda.id ===
                celdaSeleccionadaId
            )

        if (
          index ===
          -1
        ) {
          return
        }

        copia
          .estructura
          .celdas[
            index
          ] = {
            ...copia
              .estructura
              .celdas[
              index
            ],

            ...cambios,
          }
      }
    )
  }


  // =======================================================
  // OCUPACIÓN DE CUADRÍCULA
  // =======================================================

  function obtenerMapaOcupacion(
    celdas
  ) {
    const mapa = {}

    for (
      const celda of celdas
    ) {
      for (
        let fila =
          celda.fila;
        fila <
        celda.fila +
          celda.rowSpan;
        fila += 1
      ) {
        for (
          let columna =
            celda.columna;
          columna <
          celda.columna +
            celda.colSpan;
          columna += 1
        ) {
          mapa[
            `${fila}-${columna}`
          ] =
            celda.id
        }
      }
    }

    return mapa
  }


  // =======================================================
  // CAMBIAR FILAS / COLUMNAS
  // =======================================================

  function cambiarDimension(
    tipo,
    valor
  ) {
    const cantidad =
      Math.max(
        1,
        Math.min(
          6,
          Number(
            valor
          ) ||
          1
        )
      )

    actualizarEncabezadoEstado(
      (
        copia
      ) => {
        const nuevasFilas =
          tipo ===
          'filas'
            ? cantidad
            : Number(
                copia.filas
              )

        const nuevasColumnas =
          tipo ===
          'columnas'
            ? cantidad
            : Number(
                copia.columnas
              )

        copia.filas =
          nuevasFilas

        copia.columnas =
          nuevasColumnas

        copia
          .estructura
          .filas =
          Array.from(
            {
              length:
                nuevasFilas,
            },
            (
              _,
              index
            ) => {
              const existente =
                copia
                  .estructura
                  .filas?.[
                    index
                  ]

              return {
                id:
                  existente
                    ?.id ||
                  `fila-${index + 1}`,

                orden:
                  index +
                  1,

                altura:
                  Number(
                    existente
                      ?.altura ||
                    10
                  ),
              }
            }
          )

        copia
          .estructura
          .columnas =
          Array.from(
            {
              length:
                nuevasColumnas,
            },
            (
              _,
              index
            ) => {
              const existente =
                copia
                  .estructura
                  .columnas?.[
                    index
                  ]

              return {
                id:
                  existente
                    ?.id ||
                  `columna-${index + 1}`,

                orden:
                  index +
                  1,

                ancho:
                  Number(
                    existente
                      ?.ancho ||
                    100 /
                      nuevasColumnas
                  ),
              }
            }
          )

        copia
          .estructura
          .celdas =
          copia
            .estructura
            .celdas
            .filter(
              (
                celda
              ) =>
                celda.fila <=
                  nuevasFilas &&
                celda.columna <=
                  nuevasColumnas
            )
            .map(
              (
                celda
              ) => ({
                ...celda,

                rowSpan:
                  Math.min(
                    celda.rowSpan,
                    nuevasFilas -
                      celda.fila +
                      1
                  ),

                colSpan:
                  Math.min(
                    celda.colSpan,
                    nuevasColumnas -
                      celda.columna +
                      1
                  ),
              })
            )

        const mapa =
          obtenerMapaOcupacion(
            copia
              .estructura
              .celdas
          )

        for (
          let fila = 1;
          fila <=
          nuevasFilas;
          fila += 1
        ) {
          for (
            let columna = 1;
            columna <=
            nuevasColumnas;
            columna += 1
          ) {
            const clave =
              `${fila}-${columna}`

            if (
              !mapa[
                clave
              ]
            ) {
              const nueva =
                crearCelda(
                  fila,
                  columna
                )

              copia
                .estructura
                .celdas
                .push(
                  nueva
                )

              mapa[
                clave
              ] =
                nueva.id
            }
          }
        }
      }
    )
  }


  // =======================================================
  // UNIR CELDAS
  // =======================================================

  function unirDerecha() {
    if (
      !celdaSeleccionada
    ) {
      return
    }

    const fila =
      celdaSeleccionada.fila

    const siguienteColumna =
      celdaSeleccionada
        .columna +
      celdaSeleccionada
        .colSpan

    if (
      siguienteColumna >
      encabezado.columnas
    ) {
      setError(
        'No existe otra celda a la derecha para unir.'
      )

      return
    }

    const vecina =
      encabezado
        .estructura
        .celdas
        .find(
          (
            celda
          ) =>
            celda.fila ===
              fila &&
            celda.columna ===
              siguienteColumna &&
            celda.rowSpan ===
              celdaSeleccionada.rowSpan
        )

    if (
      !vecina
    ) {
      setError(
        'La celda derecha no tiene una estructura compatible para unir.'
      )

      return
    }

    setError(
      ''
    )

    actualizarEncabezadoEstado(
      (
        copia
      ) => {
        const actual =
          copia
            .estructura
            .celdas
            .find(
              (
                celda
              ) =>
                celda.id ===
                celdaSeleccionadaId
            )

        actual.colSpan +=
          vecina.colSpan

        copia
          .estructura
          .celdas =
          copia
            .estructura
            .celdas
            .filter(
              (
                celda
              ) =>
                celda.id !==
                vecina.id
            )
      }
    )
  }


  function unirAbajo() {
    if (
      !celdaSeleccionada
    ) {
      return
    }

    const siguienteFila =
      celdaSeleccionada
        .fila +
      celdaSeleccionada
        .rowSpan

    if (
      siguienteFila >
      encabezado.filas
    ) {
      setError(
        'No existe otra celda debajo para unir.'
      )

      return
    }

    const vecina =
      encabezado
        .estructura
        .celdas
        .find(
          (
            celda
          ) =>
            celda.fila ===
              siguienteFila &&
            celda.columna ===
              celdaSeleccionada.columna &&
            celda.colSpan ===
              celdaSeleccionada.colSpan
        )

    if (
      !vecina
    ) {
      setError(
        'La celda inferior no tiene una estructura compatible para unir.'
      )

      return
    }

    setError(
      ''
    )

    actualizarEncabezadoEstado(
      (
        copia
      ) => {
        const actual =
          copia
            .estructura
            .celdas
            .find(
              (
                celda
              ) =>
                celda.id ===
                celdaSeleccionadaId
            )

        actual.rowSpan +=
          vecina.rowSpan

        copia
          .estructura
          .celdas =
          copia
            .estructura
            .celdas
            .filter(
              (
                celda
              ) =>
                celda.id !==
                vecina.id
            )
      }
    )
  }


  function dividirCelda() {
    if (
      !celdaSeleccionada
    ) {
      return
    }

    if (
      celdaSeleccionada.rowSpan ===
        1 &&
      celdaSeleccionada.colSpan ===
        1
    ) {
      return
    }

    actualizarEncabezadoEstado(
      (
        copia
      ) => {
        const celdas =
          copia
            .estructura
            .celdas

        const index =
          celdas.findIndex(
            (
              celda
            ) =>
              celda.id ===
              celdaSeleccionadaId
          )

        if (
          index ===
          -1
        ) {
          return
        }

        const original =
          copiarProfundo(
            celdas[
              index
            ]
          )

        celdas[
          index
        ].rowSpan =
          1

        celdas[
          index
        ].colSpan =
          1

        for (
          let fila =
            original.fila;
          fila <
          original.fila +
            original.rowSpan;
          fila += 1
        ) {
          for (
            let columna =
              original.columna;
            columna <
            original.columna +
              original.colSpan;
            columna += 1
          ) {
            if (
              fila ===
                original.fila &&
              columna ===
                original.columna
            ) {
              continue
            }

            celdas.push(
              crearCelda(
                fila,
                columna
              )
            )
          }
        }
      }
    )
  }


  // =======================================================
  // FILAS Y COLUMNAS
  // =======================================================

  function cambiarAlturaFila(
    index,
    valor
  ) {
    actualizarEncabezadoEstado(
      (
        copia
      ) => {
        copia
          .estructura
          .filas[
            index
          ].altura =
          Math.max(
            4,
            Math.min(
              80,
              Number(
                valor
              ) ||
              4
            )
          )
      }
    )
  }


  function cambiarAnchoColumna(
    index,
    valor
  ) {
    actualizarEncabezadoEstado(
      (
        copia
      ) => {
        copia
          .estructura
          .columnas[
            index
          ].ancho =
          Math.max(
            5,
            Math.min(
              100,
              Number(
                valor
              ) ||
              5
            )
          )
      }
    )
  }


  // =======================================================
  // ELEMENTOS DE CELDA
  // =======================================================

  function agregarElemento() {
    if (
      !celdaSeleccionada
    ) {
      return
    }

    actualizarEncabezadoEstado(
      (
        copia
      ) => {
        const celda =
          copia
            .estructura
            .celdas
            .find(
              (
                item
              ) =>
                item.id ===
                celdaSeleccionadaId
            )

        if (
          !celda
        ) {
          return
        }

        if (
          celda
            .elementos
            .length ===
            1 &&
          celda
            .elementos[0]
            ?.tipo ===
            'VACIO'
        ) {
          celda.elementos =
            []
        }

        celda
          .elementos
          .push(
            {
              tipo:
                elementoNuevo,

              prefijo:
                prefijoPredeterminado(
                  elementoNuevo
                ),

              valor:
                '',

              negrita:
                elementoNuevo ===
                'NOMBRE_DOCUMENTO',

              tamano_fuente:
                elementoNuevo ===
                'NOMBRE_DOCUMENTO'
                  ? 11
                  : 9,
            }
          )
      }
    )
  }


  function prefijoPredeterminado(
    tipo
  ) {
    if (
      tipo ===
      'CODIGO'
    ) {
      return 'Código: '
    }

    if (
      tipo ===
      'FECHA_EDICION'
    ) {
      return 'Elaboración: '
    }

    if (
      tipo ===
      'VERSION'
    ) {
      return 'Versión: '
    }

    if (
      tipo ===
      'VIGENCIA'
    ) {
      return 'Fecha: '
    }

    if (
      tipo ===
      'PAGINACION'
    ) {
      return 'Página '
    }

    return ''
  }


  function actualizarElemento(
    index,
    campo,
    valor
  ) {
    actualizarEncabezadoEstado(
      (
        copia
      ) => {
        const celda =
          copia
            .estructura
            .celdas
            .find(
              (
                item
              ) =>
                item.id ===
                celdaSeleccionadaId
            )

        if (
          !celda
        ) {
          return
        }

        celda.elementos[
          index
        ][
          campo
        ] =
          valor
      }
    )
  }


  function eliminarElemento(
    index
  ) {
    actualizarEncabezadoEstado(
      (
        copia
      ) => {
        const celda =
          copia
            .estructura
            .celdas
            .find(
              (
                item
              ) =>
                item.id ===
                celdaSeleccionadaId
            )

        if (
          !celda
        ) {
          return
        }

        celda
          .elementos
          .splice(
            index,
            1
          )

        if (
          celda
            .elementos
            .length ===
          0
        ) {
          celda.elementos =
            [
              {
                tipo:
                  'VACIO',

                prefijo:
                  '',

                valor:
                  '',

                negrita:
                  false,

                tamano_fuente:
                  9,
              },
            ]
        }
      }
    )
  }


  // =======================================================
  // CONFIGURACIÓN DEL DOCUMENTO
  // =======================================================

  function actualizarDocumentoEstado(
    campo,
    valor
  ) {
    setDocumentos(
      (
        anteriores
      ) =>
        anteriores.map(
          (
            item
          ) =>
            item
              .tipo_documento ===
            tipoDocumentoActivo
              ? {
                  ...item,
                  [
                    campo
                  ]:
                    valor,
                }
              : item
        )
    )
  }


  // =======================================================
  // CONTENIDO PARA VISTA PREVIA
  // =======================================================

  function contenidoElemento(
    elemento
  ) {
    const prefijo =
      elemento
        ?.prefijo ||
      ''

    switch (
      elemento?.tipo
    ) {
      case 'LOGO':
        return null

      case 'NOMBRE_DOCUMENTO':
        return 'NOMBRE DEL DOCUMENTO'

      case 'CODIGO':
        return `${prefijo}CÓDIGO`

      case 'FECHA_EDICION':
        return `${prefijo}DD/MM/AAAA`

      case 'VERSION':
        return `${prefijo}VERSIÓN`

      case 'VIGENCIA':
        return `${prefijo}DD/MM/AAAA`

      case 'PAGINACION':
        return `${prefijo}1 de 1`

      case 'TEXTO':
        return (
          elemento
            ?.valor ||
          ''
        )

      case 'VACIO':
      default:
        return ''
    }
  }


  // =======================================================
  // GUARDAR ENCABEZADO
  // =======================================================

  async function guardarEncabezado() {
    if (
      !encabezado
    ) {
      return
    }

    setGuardandoEncabezado(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-documentos',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'ACTUALIZAR_ENCABEZADO',

                  nombre:
                    encabezado
                      ?.nombre ||
                    'Encabezado documental',

                  filas:
                    encabezado
                      .filas,

                  columnas:
                    encabezado
                      .columnas,

                  estructura:
                    encabezado
                      .estructura,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible guardar el encabezado.'
        )
      }

      setEncabezado(
        data.encabezado
      )

      setMensaje(
        'Encabezado guardado correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible guardar el encabezado.'
      )
    } finally {
      setGuardandoEncabezado(
        false
      )
    }
  }


  // =======================================================
  // GUARDAR DOCUMENTO
  // =======================================================

    async function guardarDocumento() {
    if (
      !documentoActivo
    ) {
      return
    }

    const endpoint =
      endpointDocumentoEspecial(
        documentoActivo
          .tipo_documento
      )

    if (
      !endpoint
    ) {
      setError(
        'No existe una API configurada para este documento.'
      )

      return
    }

    if (
      !texto(
        documentoActivo
          .nombre_documento
      )
    ) {
      setError(
        'El nombre del documento es obligatorio.'
      )

      return
    }

    setGuardandoDocumento(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          endpoint,
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'ACTUALIZAR_DOCUMENTO',

                  id:
                    documentoActivo
                      .id,

                  tipo_documento:
                    documentoActivo
                      .tipo_documento,

                  nombre_documento:
                    documentoActivo
                      .nombre_documento,

                  codigo:
                    documentoActivo
                      .codigo,

                  fecha_edicion:
                    documentoActivo
                      .fecha_edicion,

                  version:
                    documentoActivo
                      .version,

                  vigencia:
                    documentoActivo
                      .vigencia,

                  activo:
                    documentoActivo
                      .activo !==
                    false,

                  observaciones:
                    documentoActivo
                      .observaciones,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible guardar los datos del documento.'
        )
      }

      if (
        data?.documento
      ) {
        setDocumentos(
          anteriores =>
            anteriores.map(
              item =>
                item
                  .tipo_documento ===
                data
                  .documento
                  .tipo_documento
                  ? data.documento
                  : item
            )
        )
      }

      setModoEdicionDocumento(
        false
      )

      setMensaje(
        'Datos de la versión vigente guardados correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible guardar los datos del documento.'
      )
    } finally {
      setGuardandoDocumento(
        false
      )
    }
  }


  // =======================================================
  // CONTROL DE VERSIONES
  // =======================================================

  function editarVersionActual() {
    setModoEdicionDocumento(
      true
    )

    setMostrandoNuevaVersion(
      false
    )

    setMostrandoHistorialVersiones(
      false
    )

    setVersionHistoricaSeleccionada(
      null
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )
  }


  async function cancelarEdicionVersionActual() {
    setModoEdicionDocumento(
      false
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      await recargarDocumentoEspecial(
        tipoDocumentoActivo
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible restaurar la información de la versión vigente.'
      )
    }
  }


  function abrirNuevaVersion() {
    if (
      !documentoActivo
    ) {
      return
    }

    setFormularioNuevaVersion({
      nombre_documento:
        documentoActivo
          ?.nombre_documento ||
        '',

      codigo:
        documentoActivo
          ?.codigo ||
        '',

      fecha_edicion:
        documentoActivo
          ?.fecha_edicion ||
        '',

      version:
        '',

      vigencia:
        documentoActivo
          ?.vigencia ||
        '',

      activo:
        documentoActivo
          ?.activo !==
        false,

      observaciones:
        documentoActivo
          ?.observaciones ||
        '',
    })

    setMostrandoNuevaVersion(
      true
    )

    setMostrandoHistorialVersiones(
      false
    )

    setVersionHistoricaSeleccionada(
      null
    )

    setModoEdicionDocumento(
      false
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )
  }


  function cancelarNuevaVersion() {
    setMostrandoNuevaVersion(
      false
    )

    setFormularioNuevaVersion({
      nombre_documento:
        '',

      codigo:
        '',

      fecha_edicion:
        '',

      version:
        '',

      vigencia:
        '',

      activo:
        true,

      observaciones:
        '',
    })
  }


  function actualizarFormularioNuevaVersion(
    campo,
    valor
  ) {
    setFormularioNuevaVersion(
      anterior => ({
        ...anterior,

        [campo]:
          valor,
      })
    )
  }


  async function crearNuevaVersion() {
    if (
      !documentoActivo
    ) {
      return
    }

    const nuevaVersion =
      texto(
        formularioNuevaVersion
          .version
      )

    if (
      !nuevaVersion
    ) {
      setError(
        'Debe indicar la nueva versión.'
      )

      return
    }

    if (
      nuevaVersion ===
      texto(
        documentoActivo
          .version
      )
    ) {
      setError(
        'La nueva versión debe ser diferente de la versión vigente.'
      )

      return
    }

    const nombreDocumento =
      texto(
        formularioNuevaVersion
          .nombre_documento
      )

    if (
      !nombreDocumento
    ) {
      setError(
        'El nombre del documento es obligatorio.'
      )

      return
    }

    const endpoint =
      endpointDocumentoEspecial(
        documentoActivo
          .tipo_documento
      )

    if (
      !endpoint
    ) {
      setError(
        'No existe una API configurada para este documento.'
      )

      return
    }

    const confirmar =
      await solicitarConfirmacion(
        `Se archivará la versión ${
          texto(
            documentoActivo
              .version
          ) ||
          'actual'
        } y se creará la versión ${nuevaVersion}. ¿Desea continuar?`
      )

    if (
      !confirmar
    ) {
      return
    }

    setCreandoNuevaVersion(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          endpoint,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'CREAR_NUEVA_VERSION',

                  nombre_documento:
                    nombreDocumento,

                  codigo:
                    formularioNuevaVersion
                      .codigo,

                  fecha_edicion:
                    formularioNuevaVersion
                      .fecha_edicion,

                  version:
                    nuevaVersion,

                  vigencia:
                    formularioNuevaVersion
                      .vigencia,

                  activo:
                    formularioNuevaVersion
                      .activo !==
                    false,

                  observaciones:
                    formularioNuevaVersion
                      .observaciones,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible crear la nueva versión.'
        )
      }

      if (
        data?.documento
      ) {
        setDocumentos(
          anteriores =>
            anteriores.map(
              item =>
                item
                  .tipo_documento ===
                data
                  .documento
                  .tipo_documento
                  ? data.documento
                  : item
            )
        )
      }

      setVersionesDocumentos(
        anterior => ({
          ...anterior,

          [
            tipoDocumentoActivo
          ]:
            Array.isArray(
              data?.versiones
            )
              ? data.versiones
              : anterior[
                  tipoDocumentoActivo
                ] ||
                [],
        })
      )

      setMostrandoNuevaVersion(
        false
      )

      setModoEdicionDocumento(
        true
      )

      setMensaje(
        `Nueva versión ${nuevaVersion} creada correctamente. El contenido de la versión anterior se conserva como base editable.`
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible crear la nueva versión.'
      )
    } finally {
      setCreandoNuevaVersion(
        false
      )
    }
  }


  function abrirHistorialVersiones() {
    setMostrandoHistorialVersiones(
      true
    )

    setMostrandoNuevaVersion(
      false
    )

    setModoEdicionDocumento(
      false
    )

    setVersionHistoricaSeleccionada(
      null
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )
  }

  // =======================================================
  // OTROS DOCUMENTOS
  // =======================================================

  function nuevoDocumento() {
    setDocumentoEditandoId(
      null
    )

    setFormularioDocumento(
      {
        ...DOCUMENTO_VACIO,
      }
    )

    setMostrandoFormularioDocumento(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )
  }


  function editarOtroDocumento(
    documento
  ) {
    setDocumentoEditandoId(
      documento.id
    )

    setFormularioDocumento(
      {
        nombre_documento:
          documento
            ?.nombre_documento ||
          '',

        codigo:
          documento
            ?.codigo ||
          '',

        fecha_edicion:
          documento
            ?.fecha_edicion ||
          '',

        version:
          documento
            ?.version ||
          '',

        vigencia:
          documento
            ?.vigencia ||
          '',

        activo:
          documento
            ?.activo !==
          false,

        observaciones:
          documento
            ?.observaciones ||
          '',
      }
    )

    setMostrandoFormularioDocumento(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )
  }


  function cancelarEdicionDocumento() {
    setDocumentoEditandoId(
      null
    )

    setFormularioDocumento(
      {
        ...DOCUMENTO_VACIO,
      }
    )

    setMostrandoFormularioDocumento(
      false
    )
  }


  function actualizarFormularioDocumento(
    campo,
    valor
  ) {
    setFormularioDocumento(
      anterior => ({
        ...anterior,

        [campo]:
          valor,
      })
    )
  }


  async function guardarOtroDocumento() {
    if (
      !texto(
        formularioDocumento
          .nombre_documento
      )
    ) {
      setError(
        'El nombre del documento es obligatorio.'
      )

      return
    }

    setGuardandoOtroDocumento(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const editando =
        Boolean(
          documentoEditandoId
        )

      const response =
        await fetch(
          '/api/admin/configuracion-documentos',
          {
            method:
              editando
                ? 'PATCH'
                : 'POST',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    editando
                      ? 'ACTUALIZAR_DOCUMENTO'
                      : 'CREAR_DOCUMENTO',

                  ...(editando
                    ? {
                        id:
                          documentoEditandoId,
                      }
                    : {}),

                  nombre_documento:
                    formularioDocumento
                      .nombre_documento,

                  codigo:
                    formularioDocumento
                      .codigo,

                  fecha_edicion:
                    formularioDocumento
                      .fecha_edicion,

                  version:
                    formularioDocumento
                      .version,

                  vigencia:
                    formularioDocumento
                      .vigencia,

                  activo:
                    formularioDocumento
                      .activo !==
                    false,

                  observaciones:
                    formularioDocumento
                      .observaciones,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible guardar el documento.'
        )
      }

      if (
        data?.documento
      ) {
        setDocumentos(
          anteriores => {
            const sinDocumento =
              anteriores.filter(
                item =>
                  Number(
                    item.id
                  ) !==
                  Number(
                    data
                      .documento
                      .id
                  )
              )

            return [
              ...sinDocumento,
              data.documento,
            ]
          }
        )
      }

      cancelarEdicionDocumento()

      setMensaje(
        editando
          ? 'Documento actualizado correctamente.'
          : 'Documento agregado correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible guardar el documento.'
      )
    } finally {
      setGuardandoOtroDocumento(
        false
      )
    }
  }


  async function eliminarOtroDocumento(
    documento
  ) {
    const confirmar =
      await solicitarConfirmacion(
        `¿Desea eliminar el documento "${texto(
          documento
            ?.nombre_documento
        ) || 'Sin nombre'}"?`
      )

    if (
      !confirmar
    ) {
      return
    }

    setEliminandoDocumento(
      documento.id
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-documentos',
          {
            method:
              'DELETE',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'ELIMINAR_DOCUMENTO',

                  id:
                    documento.id,
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible eliminar el documento.'
        )
      }

      setDocumentos(
        anteriores =>
          anteriores.filter(
            item =>
              Number(
                item.id
              ) !==
              Number(
                documento.id
              )
          )
      )

      if (
        Number(
          documentoEditandoId
        ) ===
        Number(
          documento.id
        )
      ) {
        cancelarEdicionDocumento()
      }

      setMensaje(
        'Documento eliminado correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible eliminar el documento.'
      )
    } finally {
      setEliminandoDocumento(
        null
      )
    }
  }


  // =======================================================
  // CONFIGURACIÓN DEL CONTRATO
  // =======================================================

  function seleccionarPestana(
    pestana
  ) {
    setPestanaPrincipal(
      pestana
    )

        setModoEdicionDocumento(
      false
    )

    setMostrandoNuevaVersion(
      false
    )

    setMostrandoHistorialVersiones(
      false
    )

    setVersionHistoricaSeleccionada(
      null
    )

    if (
      pestana !==
      'OTROS_DOCUMENTOS'
    ) {
      cancelarEdicionDocumento()
    }

    if (
      pestana ===
      'CONTRATO'
    ) {
      setTipoDocumentoActivo(
        'CONTRATO'
      )
    }

    if (
      pestana ===
      'CODIGO_CONDUCTA'
    ) {
      setTipoDocumentoActivo(
        'CODIGO_CONDUCTA'
      )
    }

    if (
      pestana ===
      'AUTORIZACION_DATOS_CEA'
    ) {
      setTipoDocumentoActivo(
        'AUTORIZACION_DATOS_CEA'
      )
    }
  }


  function actualizarContratoEstado(
    campo,
    valor
  ) {
    setConfiguracionContrato(
      anterior => ({
        ...anterior,

        [campo]:
          valor,
      })
    )
  }


  function actualizarClausulaLocal(
    id,
    campo,
    valor
  ) {
    setClausulasContrato(
      anteriores =>
        anteriores.map(
          item =>
            Number(
              item.id
            ) ===
            Number(
              id
            )
              ? {
                  ...item,

                  [campo]:
                    valor,
                }
              : item
        )
    )
  }


  async function guardarConfiguracionContrato() {
    const contratoDocumento =
      documentos.find(
        item =>
          item
            ?.tipo_documento ===
          'CONTRATO'
      )

    const nombreDocumento =
      texto(
        contratoDocumento
          ?.nombre_documento
      )

    if (
      !nombreDocumento
    ) {
      setError(
        'El nombre del documento Contrato es obligatorio.'
      )

      return
    }

    setGuardandoContrato(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-contrato',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'ACTUALIZAR_CONFIGURACION',

                  nombre_documento:
                    nombreDocumento,

                  texto_introductorio:
                    configuracionContrato
                      .texto_introductorio,

                  texto_final:
                    configuracionContrato
                      .texto_final,

                  mostrar_foto:
                    configuracionContrato
                      .mostrar_foto,

                  mostrar_huella:
                    configuracionContrato
                      .mostrar_huella,

                  activo:
                    configuracionContrato
                      .activo,

                  observaciones:
                    configuracionContrato
                      .observaciones,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible guardar el contenido general del contrato.'
        )
      }

      setConfiguracionContrato(
        anterior => ({
          ...anterior,

          texto_introductorio:
            data
              ?.configuracion
              ?.texto_introductorio ||
            '',

          texto_final:
            data
              ?.configuracion
              ?.texto_final ||
            '',

          activo:
            data
              ?.configuracion
              ?.activo !==
            false,

          observaciones:
            data
              ?.configuracion
              ?.observaciones ||
            '',
        })
      )

      setMensaje(
        'Contenido general del contrato guardado correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible guardar el contenido general del contrato.'
      )
    } finally {
      setGuardandoContrato(
        false
      )
    }
  }


  async function agregarClausulaContrato() {
    setAgregandoClausula(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-contrato',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  titulo:
                    '',

                  contenido:
                    'Escriba aquí el contenido de la nueva cláusula.',

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible agregar la cláusula.'
        )
      }

      if (
        data?.clausula
      ) {
        setClausulasContrato(
          anteriores => [
            ...anteriores,
            data.clausula,
          ]
        )
      }

      setMensaje(
        'Cláusula agregada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible agregar la cláusula.'
      )
    } finally {
      setAgregandoClausula(
        false
      )
    }
  }


  async function guardarClausulaContrato(
    clausula
  ) {
    if (
      !texto(
        clausula?.contenido
      )
    ) {
      setError(
        'El contenido de la cláusula es obligatorio.'
      )

      return
    }

    setGuardandoClausula(
      clausula.id
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-contrato',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'ACTUALIZAR_CLAUSULA',

                  clausula_id:
                    clausula.id,

                  titulo:
                    clausula.titulo,

                  contenido:
                    clausula.contenido,

                  activo:
                    clausula.activo !==
                    false,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible guardar la cláusula.'
        )
      }

      if (
        data?.clausula
      ) {
        setClausulasContrato(
          anteriores =>
            anteriores.map(
              item =>
                Number(
                  item.id
                ) ===
                Number(
                  data
                    .clausula
                    .id
                )
                  ? data.clausula
                  : item
            )
        )
      }

      setMensaje(
        'Cláusula guardada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible guardar la cláusula.'
      )
    } finally {
      setGuardandoClausula(
        null
      )
    }
  }


  async function eliminarClausulaContrato(
    clausula
  ) {
    const confirmar =
      await solicitarConfirmacion(
        `¿Desea eliminar ${tituloVisualClausula(
          clausula,
          Number(
            clausula?.orden ||
            1
          ) -
            1
        )}?`
      )

    if (
      !confirmar
    ) {
      return
    }

    setEliminandoClausula(
      clausula.id
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-contrato',
          {
            method:
              'DELETE',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  clausula_id:
                    clausula.id,
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible eliminar la cláusula.'
        )
      }

      setClausulasContrato(
        Array.isArray(
          data?.clausulas
        )
          ? data.clausulas
          : []
      )

      setMensaje(
        'Cláusula eliminada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible eliminar la cláusula.'
      )
    } finally {
      setEliminandoClausula(
        null
      )
    }
  }


  async function moverClausulaContrato(
    indice,
    direccion
  ) {
    const destino =
      indice +
      direccion

    if (
      destino <
        0 ||
      destino >=
        clausulasContrato.length
    ) {
      return
    }

    const anterior =
      copiarProfundo(
        clausulasContrato
      )

    const nuevaLista =
      copiarProfundo(
        clausulasContrato
      )

    const temporal =
      nuevaLista[
        indice
      ]

    nuevaLista[
      indice
    ] =
      nuevaLista[
        destino
      ]

    nuevaLista[
      destino
    ] =
      temporal

    nuevaLista.forEach(
      (
        item,
        index
      ) => {
        item.orden =
          index +
          1
      }
    )

    setClausulasContrato(
      nuevaLista
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-contrato',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'REORDENAR_CLAUSULAS',

                  clausulas:
                    nuevaLista.map(
                      item => ({
                        id:
                          item.id,
                      })
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible cambiar el orden de las cláusulas.'
        )
      }

      setClausulasContrato(
        Array.isArray(
          data?.clausulas
        )
          ? data.clausulas
          : nuevaLista
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setClausulasContrato(
        anterior
      )

      setError(
        err?.message ||
        'No fue posible cambiar el orden de las cláusulas.'
      )
    }
  }


  // =======================================================
  // CONFIGURACIÓN DEL CÓDIGO DE CONDUCTA
  // =======================================================

  function actualizarSeccionCodigoLocal(
    id,
    campo,
    valor
  ) {
    setSeccionesCodigoConducta(
      anteriores =>
        anteriores.map(
          item =>
            Number(
              item.id
            ) ===
            Number(
              id
            )
              ? {
                  ...item,

                  [campo]:
                    valor,
                }
              : item
        )
    )
  }


  async function agregarSeccionCodigoConducta() {
    setAgregandoSeccionCodigo(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-codigo-conducta',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  titulo:
                    'NUEVA SECCIÓN',

                  contenido:
                    'Escriba aquí el contenido de la nueva sección.',

                  activo:
                    true,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible agregar la sección.'
        )
      }

      if (
        data?.seccion
      ) {
        setSeccionesCodigoConducta(
          anteriores => [
            ...anteriores,
            data.seccion,
          ]
        )
      }

      setMensaje(
        'Sección agregada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible agregar la sección.'
      )
    } finally {
      setAgregandoSeccionCodigo(
        false
      )
    }
  }


  async function guardarSeccionCodigoConducta(
    seccion
  ) {
    if (
      !texto(
        seccion?.titulo
      )
    ) {
      setError(
        'El título de la sección es obligatorio.'
      )

      return
    }

    if (
      !texto(
        seccion?.contenido
      )
    ) {
      setError(
        'El contenido de la sección es obligatorio.'
      )

      return
    }

    setGuardandoSeccionCodigo(
      seccion.id
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-codigo-conducta',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'actualizar_seccion',

                  id:
                    seccion.id,

                  titulo:
                    seccion.titulo,

                  contenido:
                    seccion.contenido,

                  activo:
                    seccion.activo !==
                    false,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible guardar la sección.'
        )
      }

      if (
        data?.seccion
      ) {
        setSeccionesCodigoConducta(
          anteriores =>
            anteriores.map(
              item =>
                Number(
                  item.id
                ) ===
                Number(
                  data
                    .seccion
                    .id
                )
                  ? data.seccion
                  : item
            )
        )
      }

      setMensaje(
        'Sección guardada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible guardar la sección.'
      )
    } finally {
      setGuardandoSeccionCodigo(
        null
      )
    }
  }


  async function eliminarSeccionCodigoConducta(
    seccion
  ) {
    const confirmar =
      await solicitarConfirmacion(
        `¿Desea eliminar la sección "${texto(
          seccion?.titulo
        ) || 'Sin título'}"?`
      )

    if (
      !confirmar
    ) {
      return
    }

    setEliminandoSeccionCodigo(
      seccion.id
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-codigo-conducta',
          {
            method:
              'DELETE',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  id:
                    seccion.id,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible eliminar la sección.'
        )
      }

      setSeccionesCodigoConducta(
        Array.isArray(
          data?.secciones
        )
          ? data.secciones
          : []
      )

      setMensaje(
        'Sección eliminada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible eliminar la sección.'
      )
    } finally {
      setEliminandoSeccionCodigo(
        null
      )
    }
  }


  async function moverSeccionCodigoConducta(
    indice,
    direccion
  ) {
    const destino =
      indice +
      direccion

    if (
      destino <
        0 ||
      destino >=
        seccionesCodigoConducta.length
    ) {
      return
    }

    const anterior =
      copiarProfundo(
        seccionesCodigoConducta
      )

    const nuevaLista =
      copiarProfundo(
        seccionesCodigoConducta
      )

    const temporal =
      nuevaLista[
        indice
      ]

    nuevaLista[
      indice
    ] =
      nuevaLista[
        destino
      ]

    nuevaLista[
      destino
    ] =
      temporal

    nuevaLista.forEach(
      (
        item,
        index
      ) => {
        item.orden =
          index +
          1
      }
    )

    setSeccionesCodigoConducta(
      nuevaLista
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-codigo-conducta',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'reordenar_secciones',

                  ids:
                    nuevaLista.map(
                      item =>
                        item.id
                    ),

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible cambiar el orden de las secciones.'
        )
      }

      setSeccionesCodigoConducta(
        Array.isArray(
          data?.secciones
        )
          ? data.secciones
          : nuevaLista
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setSeccionesCodigoConducta(
        anterior
      )

      setError(
        err?.message ||
        'No fue posible cambiar el orden de las secciones.'
      )
    }
  }


  // =======================================================
  // CONFIGURACIÓN DE AUTORIZACIÓN DE DATOS
  // =======================================================

  function actualizarAutorizacionDatosEstado(
    campo,
    valor
  ) {
    setConfiguracionAutorizacionDatos(
      anterior => ({
        ...anterior,

        [campo]:
          valor,
      })
    )
  }


  function actualizarSeccionAutorizacionLocal(
    id,
    campo,
    valor
  ) {
    setSeccionesAutorizacionDatos(
      anteriores =>
        anteriores.map(
          item =>
            Number(
              item.id
            ) ===
            Number(
              id
            )
              ? {
                  ...item,

                  [campo]:
                    valor,
                }
              : item
        )
    )
  }


  function actualizarFinalidadAutorizacionLocal(
    id,
    campo,
    valor
  ) {
    setFinalidadesAutorizacionDatos(
      anteriores =>
        anteriores.map(
          item =>
            Number(
              item.id
            ) ===
            Number(
              id
            )
              ? {
                  ...item,

                  [campo]:
                    valor,
                }
              : item
        )
    )
  }


  async function guardarConfiguracionAutorizacionDatos() {
    if (
      !texto(
        configuracionAutorizacionDatos
          .texto_datos_biometricos
      )
    ) {
      setError(
        'El texto sobre datos sensibles y biométricos es obligatorio.'
      )

      return
    }

    if (
      !texto(
        configuracionAutorizacionDatos
          .texto_menores_edad
      )
    ) {
      setError(
        'El texto sobre menores de edad es obligatorio.'
      )

      return
    }

    if (
      !texto(
        configuracionAutorizacionDatos
          .texto_declaracion_final
      )
    ) {
      setError(
        'El texto de declaración y autorización es obligatorio.'
      )

      return
    }

    setGuardandoConfiguracionAutorizacion(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-autorizacion-datos',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'actualizar_configuracion',

                  ...configuracionAutorizacionDatos,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible guardar la configuración general.'
        )
      }

      if (
        data?.configuracion
      ) {
        setConfiguracionAutorizacionDatos(
          {
            correo_proteccion_datos:
              data.configuracion
                ?.correo_proteccion_datos ||
              '',

            telefono_contacto:
              data.configuracion
                ?.telefono_contacto ||
              '',

            direccion_contacto:
              data.configuracion
                ?.direccion_contacto ||
              '',

            medio_politica:
              data.configuracion
                ?.medio_politica ||
              '',

            texto_datos_biometricos:
              data.configuracion
                ?.texto_datos_biometricos ||
              '',

            texto_menores_edad:
              data.configuracion
                ?.texto_menores_edad ||
              '',

            texto_declaracion_final:
              data.configuracion
                ?.texto_declaracion_final ||
              '',

            activo:
              data.configuracion
                ?.activo !==
              false,
          }
        )
      }

      setMensaje(
        'Configuración general de la Autorización de Datos guardada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible guardar la configuración general.'
      )
    } finally {
      setGuardandoConfiguracionAutorizacion(
        false
      )
    }
  }


  async function agregarSeccionAutorizacionDatos() {
    setAgregandoSeccionAutorizacion(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-autorizacion-datos',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  tipo:
                    'seccion',

                  titulo:
                    'NUEVA SECCIÓN',

                  contenido:
                    'Escriba aquí el contenido de la nueva sección.',

                  activo:
                    true,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible agregar la sección.'
        )
      }

      if (
        data?.seccion
      ) {
        setSeccionesAutorizacionDatos(
          anteriores => [
            ...anteriores,
            data.seccion,
          ]
        )
      }

      setMensaje(
        'Sección agregada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible agregar la sección.'
      )
    } finally {
      setAgregandoSeccionAutorizacion(
        false
      )
    }
  }


  async function guardarSeccionAutorizacionDatos(
    seccion
  ) {
    if (
      !texto(
        seccion?.titulo
      )
    ) {
      setError(
        'El título de la sección es obligatorio.'
      )

      return
    }

    if (
      !texto(
        seccion?.contenido
      )
    ) {
      setError(
        'El contenido de la sección es obligatorio.'
      )

      return
    }

    setGuardandoSeccionAutorizacion(
      seccion.id
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-autorizacion-datos',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'actualizar_seccion',

                  id:
                    seccion.id,

                  titulo:
                    seccion.titulo,

                  contenido:
                    seccion.contenido,

                  activo:
                    seccion.activo !==
                    false,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible guardar la sección.'
        )
      }

      if (
        data?.seccion
      ) {
        setSeccionesAutorizacionDatos(
          anteriores =>
            anteriores.map(
              item =>
                Number(
                  item.id
                ) ===
                Number(
                  data.seccion.id
                )
                  ? data.seccion
                  : item
            )
        )
      }

      setMensaje(
        'Sección guardada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible guardar la sección.'
      )
    } finally {
      setGuardandoSeccionAutorizacion(
        null
      )
    }
  }


  async function eliminarSeccionAutorizacionDatos(
    seccion
  ) {
    const confirmar =
      await solicitarConfirmacion(
        `¿Desea eliminar la sección "${texto(
          seccion?.titulo
        ) || 'Sin título'}"?`
      )

    if (
      !confirmar
    ) {
      return
    }

    setEliminandoSeccionAutorizacion(
      seccion.id
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-autorizacion-datos',
          {
            method:
              'DELETE',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  tipo:
                    'seccion',

                  id:
                    seccion.id,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible eliminar la sección.'
        )
      }

      setSeccionesAutorizacionDatos(
        Array.isArray(
          data?.secciones
        )
          ? data.secciones
          : []
      )

      setMensaje(
        'Sección eliminada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible eliminar la sección.'
      )
    } finally {
      setEliminandoSeccionAutorizacion(
        null
      )
    }
  }


  async function moverSeccionAutorizacionDatos(
    indice,
    direccion
  ) {
    const destino =
      indice +
      direccion

    if (
      destino <
        0 ||
      destino >=
        seccionesAutorizacionDatos.length
    ) {
      return
    }

    const anterior =
      copiarProfundo(
        seccionesAutorizacionDatos
      )

    const nuevaLista =
      copiarProfundo(
        seccionesAutorizacionDatos
      )

    const temporal =
      nuevaLista[
        indice
      ]

    nuevaLista[
      indice
    ] =
      nuevaLista[
        destino
      ]

    nuevaLista[
      destino
    ] =
      temporal

    nuevaLista.forEach(
      (
        item,
        index
      ) => {
        item.orden =
          index +
          1
      }
    )

    setSeccionesAutorizacionDatos(
      nuevaLista
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-autorizacion-datos',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'reordenar_secciones',

                  ids:
                    nuevaLista.map(
                      item =>
                        item.id
                    ),

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible cambiar el orden de las secciones.'
        )
      }

      setSeccionesAutorizacionDatos(
        Array.isArray(
          data?.secciones
        )
          ? data.secciones
          : nuevaLista
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setSeccionesAutorizacionDatos(
        anterior
      )

      setError(
        err?.message ||
        'No fue posible cambiar el orden de las secciones.'
      )
    }
  }


  async function agregarFinalidadAutorizacionDatos() {
    setAgregandoFinalidadAutorizacion(
      true
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const codigo =
        `FINALIDAD_${Date.now()}`

      const response =
        await fetch(
          '/api/admin/configuracion-autorizacion-datos',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  tipo:
                    'finalidad',

                  codigo,

                  descripcion:
                    'Escriba aquí la finalidad que requiere respuesta SÍ / NO.',

                  activo:
                    true,

                  requiere_respuesta:
                    true,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible agregar la finalidad.'
        )
      }

      if (
        data?.finalidad
      ) {
        setFinalidadesAutorizacionDatos(
          anteriores => [
            ...anteriores,
            data.finalidad,
          ]
        )
      }

      setMensaje(
        'Finalidad agregada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible agregar la finalidad.'
      )
    } finally {
      setAgregandoFinalidadAutorizacion(
        false
      )
    }
  }


  async function guardarFinalidadAutorizacionDatos(
    finalidad
  ) {
    if (
      !texto(
        finalidad?.codigo
      )
    ) {
      setError(
        'El código de la finalidad es obligatorio.'
      )

      return
    }

    if (
      !texto(
        finalidad?.descripcion
      )
    ) {
      setError(
        'La descripción de la finalidad es obligatoria.'
      )

      return
    }

    setGuardandoFinalidadAutorizacion(
      finalidad.id
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-autorizacion-datos',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'actualizar_finalidad',

                  id:
                    finalidad.id,

                  codigo:
                    finalidad.codigo,

                  descripcion:
                    finalidad.descripcion,

                  activo:
                    finalidad.activo !==
                    false,

                  requiere_respuesta:
                    finalidad.requiere_respuesta !==
                    false,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible guardar la finalidad.'
        )
      }

      if (
        data?.finalidad
      ) {
        setFinalidadesAutorizacionDatos(
          anteriores =>
            anteriores.map(
              item =>
                Number(
                  item.id
                ) ===
                Number(
                  data.finalidad.id
                )
                  ? data.finalidad
                  : item
            )
        )
      }

      setMensaje(
        'Finalidad guardada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible guardar la finalidad.'
      )
    } finally {
      setGuardandoFinalidadAutorizacion(
        null
      )
    }
  }


  async function eliminarFinalidadAutorizacionDatos(
    finalidad
  ) {
    const confirmar =
      await solicitarConfirmacion(
        `¿Desea eliminar la finalidad "${texto(
          finalidad?.descripcion
        ) || 'Sin descripción'}"?`
      )

    if (
      !confirmar
    ) {
      return
    }

    setEliminandoFinalidadAutorizacion(
      finalidad.id
    )

    setError(
      ''
    )

    setMensaje(
      ''
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-autorizacion-datos',
          {
            method:
              'DELETE',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  tipo:
                    'finalidad',

                  id:
                    finalidad.id,

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible eliminar la finalidad.'
        )
      }

      setFinalidadesAutorizacionDatos(
        Array.isArray(
          data?.finalidades
        )
          ? data.finalidades
          : []
      )

      setMensaje(
        'Finalidad eliminada correctamente.'
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setError(
        err?.message ||
        'No fue posible eliminar la finalidad.'
      )
    } finally {
      setEliminandoFinalidadAutorizacion(
        null
      )
    }
  }


  async function moverFinalidadAutorizacionDatos(
    indice,
    direccion
  ) {
    const destino =
      indice +
      direccion

    if (
      destino <
        0 ||
      destino >=
        finalidadesAutorizacionDatos.length
    ) {
      return
    }

    const anterior =
      copiarProfundo(
        finalidadesAutorizacionDatos
      )

    const nuevaLista =
      copiarProfundo(
        finalidadesAutorizacionDatos
      )

    const temporal =
      nuevaLista[
        indice
      ]

    nuevaLista[
      indice
    ] =
      nuevaLista[
        destino
      ]

    nuevaLista[
      destino
    ] =
      temporal

    nuevaLista.forEach(
      (
        item,
        index
      ) => {
        item.orden =
          index +
          1
      }
    )

    setFinalidadesAutorizacionDatos(
      nuevaLista
    )

    try {
      const response =
        await fetch(
          '/api/admin/configuracion-autorizacion-datos',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nitEmpresa,
            },

            body:
              JSON.stringify(
                {
                  nit:
                    nitEmpresa,

                  accion:
                    'reordenar_finalidades',

                  ids:
                    nuevaLista.map(
                      item =>
                        item.id
                    ),

                  usuario_actualizacion:
                    obtenerNombreUsuario(
                      currentUser
                    ),
                }
              ),
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
          'No fue posible cambiar el orden de las finalidades.'
        )
      }

      setFinalidadesAutorizacionDatos(
        Array.isArray(
          data?.finalidades
        )
          ? data.finalidades
          : nuevaLista
      )
    } catch (
      err
    ) {
      console.error(
        err
      )

      setFinalidadesAutorizacionDatos(
        anterior
      )

      setError(
        err?.message ||
        'No fue posible cambiar el orden de las finalidades.'
      )
    }
  }


  // =======================================================
  // NAVEGACIÓN
  // =======================================================

  function regresar() {
    router.push(
      '/admin'
    )
  }


  // =======================================================
  // RENDER CELDA
  // =======================================================

  function renderCelda(
    celda,
    modoVistaPrevia = false
  ) {
    const seleccionada =
      celda.id ===
      celdaSeleccionadaId

    const estilo = {
      gridColumn:
        `${celda.columna} / span ${celda.colSpan}`,

      gridRow:
        `${celda.fila} / span ${celda.rowSpan}`,

      borderTop:
        celda.borde_superior
          ? '1px solid #111827'
          : 'none',

      borderBottom:
        celda.borde_inferior
          ? '1px solid #111827'
          : 'none',

      borderLeft:
        celda.borde_izquierdo
          ? '1px solid #111827'
          : 'none',

      borderRight:
        celda.borde_derecho
          ? '1px solid #111827'
          : 'none',

      justifyContent:
        celda
          .alineacion_horizontal ===
        'left'
          ? 'flex-start'
          : celda
              .alineacion_horizontal ===
            'right'
            ? 'flex-end'
            : 'center',

      alignItems:
        celda
          .alineacion_vertical ===
        'top'
          ? 'flex-start'
          : celda
              .alineacion_vertical ===
            'bottom'
            ? 'flex-end'
            : 'center',

      textAlign:
        celda
          .alineacion_horizontal,
    }

    return (
      <div
        key={
          celda.id
        }
        onClick={
          modoVistaPrevia
            ? undefined
            : () =>
                setCeldaSeleccionadaId(
                  celda.id
                )
        }
        style={
          estilo
        }
        className={`
          relative
          flex
          min-h-[54px]
          flex-col
          p-2
          ${
            modoVistaPrevia
              ? 'bg-white'
              : seleccionada
                ? 'bg-blue-50 ring-2 ring-inset ring-blue-500'
                : 'cursor-pointer bg-white hover:bg-slate-50'
          }
        `}
      >
        {!modoVistaPrevia &&
          seleccionada && (
            <span
              className="
                absolute
                right-1
                top-1
                rounded
                bg-blue-600
                px-1.5
                py-0.5
                text-[9px]
                font-bold
                text-white
              "
            >
              Seleccionada
            </span>
          )}

        {celda
          ?.elementos
          ?.map(
            (
              elemento,
              index
            ) => {
              if (
                elemento.tipo ===
                'LOGO'
              ) {
                return (
                  <div
                    key={
                      `${celda.id}-elemento-${index}`
                    }
                    className="
                      flex
                      w-full
                      items-center
                      justify-center
                    "
                  >
                    {logoUrl
                      ? (
                        <img
                          src={
                            logoUrl
                          }
                          alt="Logo institucional"
                          className="
                            max-h-[52px]
                            max-w-full
                            object-contain
                          "
                        />
                      )
                      : (
                        <span
                          className="
                            text-[10px]
                            font-bold
                            text-slate-400
                          "
                        >
                          LOGO
                        </span>
                      )}
                  </div>
                )
              }

              const contenido =
                contenidoElemento(
                  elemento
                )

              return (
                <div
                  key={
                    `${celda.id}-elemento-${index}`
                  }
                  style={{
                    fontSize:
                      `${elemento?.tamano_fuente || 9}px`,

                    fontWeight:
                      elemento?.negrita
                        ? 700
                        : 400,
                  }}
                  className="
                    w-full
                    leading-tight
                  "
                >
                  {contenido ||
                    (!modoVistaPrevia
                      ? elemento
                          ?.tipo
                      : '')}
                </div>
              )
            }
          )}
      </div>
    )
  }


  // =======================================================
  // CARGANDO
  // =======================================================

  if (
    cargando
  ) {
    return (
      <div
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-slate-100
        "
      >
        <div
          className="
            rounded-xl
            border
            border-slate-200
            bg-white
            px-6
            py-5
            text-sm
            font-semibold
            text-slate-600
            shadow-sm
          "
        >
          <i className="fas fa-spinner fa-spin mr-2" />

          Cargando configuración de documentos...
        </div>
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
        p-4
        md:p-6
      "
    >
      <div
        className="
          mx-auto
          max-w-[1700px]
          space-y-4
        "
      >
        {/* Encabezado institucional compartido */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <EncabezadoModulo
            titulo="Configuración de Documentos"
            subtitulo="Encabezado institucional, control documental y documentos especiales."
            icono={Files}
            rutaRegreso="/admin"
            textoRegreso="Regresar"
          />
        </div>

      {mostrandoFormularioDocumento && pestanaPrincipal === 'OTROS_DOCUMENTOS' && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !guardandoOtroDocumento) cancelarEdicionDocumento()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-documento"
            className="my-auto flex max-h-[calc(100vh-24px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-48px)]"
          >
            <FranjaSuperiorModal className="flex shrink-0 items-center justify-between gap-4 px-5 py-4">
              <div>
                <h2 id="titulo-modal-documento" className="text-base font-bold">
                  {documentoEditandoId ? 'Editar documento' : 'Agregar documento'}
                </h2>
                <p className="mt-1 text-xs text-blue-100">
                  Configure los datos de control documental del CEA.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelarEdicionDocumento}
                disabled={guardandoOtroDocumento}
                aria-label="Cerrar formulario"
                className="rounded-lg border border-white/30 px-3 py-2 text-white hover:bg-white/10 disabled:opacity-50"
              >
                <i className="fas fa-xmark" />
              </button>
            </FranjaSuperiorModal>
            <div className="overflow-y-auto bg-slate-50 p-4 sm:p-5">
              <div className="rounded-lg border border-slate-200 bg-white p-4">

                  <div
                    className="
                      mb-3
                      flex
                      items-center
                      justify-between
                      gap-3
                    "
                  >
                    <div>
                      <h3
                        className="
                          text-xs
                          font-black
                          uppercase
                          text-emerald-900
                        "
                      >
                        {documentoEditandoId
                          ? 'Editar documento'
                          : 'Nuevo documento'}
                      </h3>

                      <p
                        className="
                          mt-0.5
                          text-[10px]
                          text-emerald-800
                        "
                      >
                        El identificador técnico se conserva internamente y no cambia al editar el nombre.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        cancelarEdicionDocumento
                      }
                      className="
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-emerald-300
                        bg-white
                        text-emerald-800
                        hover:bg-emerald-100
                      "
                      title="Cancelar"
                    >
                      <i className="fas fa-xmark" />
                    </button>
                  </div>

                  <div
                    className="
                      grid
                      gap-3
                      md:grid-cols-2
                      xl:grid-cols-6
                    "
                  >
                    <div
                      className="
                        xl:col-span-2
                      "
                    >
                      <label
                        className="
                          mb-1
                          block
                          text-[10px]
                          font-bold
                          uppercase
                          text-slate-600
                        "
                      >
                        Nombre del documento
                      </label>

                      <input
                        type="text"
                        value={
                          formularioDocumento
                            .nombre_documento
                        }
                        onChange={
                          event =>
                            actualizarFormularioDocumento(
                              'nombre_documento',
                              event.target.value
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
                          text-xs
                          outline-none
                          focus:border-emerald-500
                        "
                      />
                    </div>

                    <div>
                      <label
                        className="
                          mb-1
                          block
                          text-[10px]
                          font-bold
                          uppercase
                          text-slate-600
                        "
                      >
                        Código
                      </label>

                      <input
                        type="text"
                        value={
                          formularioDocumento
                            .codigo
                        }
                        onChange={
                          event =>
                            actualizarFormularioDocumento(
                              'codigo',
                              event.target.value
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
                          text-xs
                          outline-none
                          focus:border-emerald-500
                        "
                      />
                    </div>

                    <div>
                      <label
                        className="
                          mb-1
                          block
                          text-[10px]
                          font-bold
                          uppercase
                          text-slate-600
                        "
                      >
                        Fecha de elaboración
                      </label>

                      <input
                        type="date"
                        value={
                          formularioDocumento
                            .fecha_edicion
                        }
                        onChange={
                          event =>
                            actualizarFormularioDocumento(
                              'fecha_edicion',
                              event.target.value
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
                          text-xs
                          outline-none
                          focus:border-emerald-500
                        "
                      />
                    </div>

                    <div>
                      <label
                        className="
                          mb-1
                          block
                          text-[10px]
                          font-bold
                          uppercase
                          text-slate-600
                        "
                      >
                        Versión
                      </label>

                      <input
                        type="text"
                        value={
                          formularioDocumento
                            .version
                        }
                        onChange={
                          event =>
                            actualizarFormularioDocumento(
                              'version',
                              event.target.value
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
                          text-xs
                          outline-none
                          focus:border-emerald-500
                        "
                      />
                    </div>

                    <div>
                      <label
                        className="
                          mb-1
                          block
                          text-[10px]
                          font-bold
                          uppercase
                          text-slate-600
                        "
                      >
                        Fecha de vigencia
                      </label>

                      <input
                        type="date"
                        value={
                          formularioDocumento
                            .vigencia
                        }
                        onChange={
                          event =>
                            actualizarFormularioDocumento(
                              'vigencia',
                              event.target.value
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
                          text-xs
                          outline-none
                          focus:border-emerald-500
                        "
                      />
                    </div>

                    <div
                      className="
                        md:col-span-2
                        xl:col-span-6
                        flex
                        flex-col
                        gap-3
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      "
                    >
                      <label
                        className="
                          flex
                          cursor-pointer
                          items-center
                          gap-2
                          rounded-lg
                          border
                          border-slate-300
                          bg-white
                          px-3
                          py-2
                          text-xs
                          font-semibold
                          text-slate-700
                        "
                      >
                        <input
                          type="checkbox"
                          checked={
                            formularioDocumento
                              .activo !==
                            false
                          }
                          onChange={
                            event =>
                              actualizarFormularioDocumento(
                                'activo',
                                event.target.checked
                              )
                          }
                        />

                        Documento activo
                      </label>

                      <div
                        className="
                          flex
                          gap-2
                        "
                      >
                        <button
                          type="button"
                          onClick={
                            cancelarEdicionDocumento
                          }
                          className="
                            rounded-lg
                            border
                            border-slate-300
                            bg-white
                            px-4
                            py-2
                            text-xs
                            font-bold
                            text-slate-700
                            hover:bg-slate-100
                          "
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          onClick={
                            guardarOtroDocumento
                          }
                          disabled={
                            guardandoOtroDocumento
                          }
                          className="
                            rounded-lg
                            bg-emerald-700
                            px-4
                            py-2
                            text-xs
                            font-bold
                            text-white
                            hover:bg-emerald-800
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          <i className="fas fa-floppy-disk mr-2" />

                          {guardandoOtroDocumento
                            ? 'Guardando...'
                            : documentoEditandoId
                              ? 'Guardar cambios'
                              : 'Agregar documento'}
                        </button>
                      </div>
                    </div>
                  </div>

              </div>
            </div>
          </div>
        </div>
      )}

        {['CONTRATO', 'CODIGO_CONDUCTA', 'AUTORIZACION_DATOS_CEA'].includes(pestanaPrincipal) && modoEdicionDocumento && documentoActivo && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
            <div role="dialog" aria-modal="true" aria-label="Editar versión actual del documento" className="my-auto flex max-h-[calc(100vh-24px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-h-[calc(100vh-48px)]">
              <FranjaSuperiorModal className="px-5 py-4">
                <h2 className="text-base font-bold">Editar versión actual: {pestanaPrincipal === 'CONTRATO' ? 'Contrato' : pestanaPrincipal === 'CODIGO_CONDUCTA' ? 'Código de Conducta' : 'Autorización de Datos'}</h2>
                <p className="mt-1 text-xs text-blue-100">Actualice los datos de control documental sin crear otra versión.</p>
              </FranjaSuperiorModal>
              <div className="grid gap-4 overflow-y-auto p-5 sm:grid-cols-2">
                {[
                  ['nombre_documento', 'Nombre del documento', 'text'],
                  ['codigo', 'Código', 'text'],
                  ['fecha_edicion', 'Fecha de elaboración', 'date'],
                  ['vigencia', 'Fecha de vigencia', 'date'],
                  ['observaciones', 'Observaciones', 'text'],
                ].map(([campo, etiqueta, tipo]) => (
                  <label key={campo} className={campo === 'nombre_documento' || campo === 'observaciones' ? 'sm:col-span-2' : ''}>
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-600">{etiqueta}</span>
                    <input type={tipo} value={documentoActivo[campo] || ''} onChange={(event) => actualizarDocumentoEstado(campo, event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none" />
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={documentoActivo.activo !== false} onChange={(event) => actualizarDocumentoEstado('activo', event.target.checked)} />
                  Documento activo
                </label>
                <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                  <button type="button" disabled={guardandoDocumento} onClick={cancelarEdicionVersionActual} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Cancelar</button>
                  <button type="button" disabled={guardandoDocumento} onClick={guardarDocumento} className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{guardandoDocumento ? 'Guardando...' : 'Guardar versión actual'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ModalResultado
          abierto={Boolean(modalAviso)}
          tipo={modalAviso?.tipo}
          mensaje={modalAviso?.mensaje}
          onCerrar={() => {
            setModalAviso(null)
            setMensaje('')
            setError('')
          }}
        />
        <ModalResultado
          abierto={Boolean(confirmacionPendiente)}
          tipo="confirmacion"
          mensaje={confirmacionPendiente?.mensaje}
          onCerrar={() => responderConfirmacion(false)}
          onConfirmar={() => responderConfirmacion(true)}
        />

        {/* ===============================================
            NAVEGACIÓN DE CONFIGURACIÓN DOCUMENTAL
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
          <div
            className="
              overflow-x-auto
            "
          >
            <div
              className="
                flex
                min-w-max
                items-end
                gap-1.5
                border-b
                border-slate-200
                bg-slate-50
                px-3
                pt-3
              "
            >
              {PESTANAS_PRINCIPALES.map(
                pestana => {
                  const activa =
                    pestanaPrincipal ===
                    pestana.value

                  return (
                    <button
                      key={
                        pestana.value
                      }
                      type="button"
                      onClick={() =>
                        seleccionarPestana(
                          pestana.value
                        )
                      }
                      className={`
                        relative
                        flex
                        items-center
                        gap-2
                        whitespace-nowrap
                        rounded-t-lg
                        border
                        border-b-0
                        px-4
                        py-3
                        text-xs
                        font-bold
                        transition-colors
                        focus-visible:outline
                        focus-visible:outline-2
                        focus-visible:outline-offset-2
                        focus-visible:outline-blue-700
                        ${
                          activa
                            ? 'border-slate-200 bg-white text-[#194567] shadow-sm'
                            : 'border-transparent bg-transparent text-slate-600 hover:bg-white hover:text-[#194567]'
                        }
                      `}
                    >
                      <i
                        className={`fas ${pestana.icon}`}
                      />

                      {pestana.label}

                      {activa && (
                        <span
                          className="
                            absolute
                            bottom-0
                            left-2
                            right-2
                            h-0.5
                            rounded-full
                            bg-[#194567]
                          "
                        />
                      )}
                    </button>
                  )
                }
              )}
            </div>
          </div>
        </div>


        {/* ===============================================
            DATOS DEL DOCUMENTO
        =============================================== */}

        {[
          'CONTRATO',
          'CODIGO_CONDUCTA',
          'AUTORIZACION_DATOS_CEA',
        ].includes(
          pestanaPrincipal
        ) &&
          documentoActivo && (
          <div
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
              className={`
                px-4
                py-3
                text-white
                ${
                  pestanaPrincipal ===
                  'CODIGO_CONDUCTA'
                    ? 'bg-amber-700'
                    : pestanaPrincipal ===
                        'AUTORIZACION_DATOS_CEA'
                      ? 'bg-teal-800'
                      : 'bg-sky-800'
                }
              `}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
              <h2
                className="
                  text-sm
                  font-bold
                "
              >
                {pestanaPrincipal ===
                'CODIGO_CONDUCTA'
                  ? 'Datos del Código de Conducta'
                  : pestanaPrincipal ===
                      'AUTORIZACION_DATOS_CEA'
                    ? 'Datos de la Autorización para el Tratamiento de Datos Personales'
                    : 'Datos del Contrato'}
              </h2>

              <p
                className="
                  mt-0.5
                  text-[11px]
                  text-white/80
                "
              >
                El diseño del encabezado es compartido. Aquí únicamente se modifican
                los datos propios de este documento.
              </p>
                </div>
                {!modoEdicionDocumento && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={abrirHistorialVersiones} className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"><i className="fas fa-clock-rotate-left mr-2" />Versiones anteriores{versionesDocumentoActivo.length > 0 ? ` (${versionesDocumentoActivo.length})` : ''}</button>
                    <button type="button" onClick={abrirNuevaVersion} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"><i className="fas fa-code-branch mr-2" />Crear nueva versión</button>
                    <button type="button" onClick={editarVersionActual} className="rounded-lg border border-white/50 bg-white px-3 py-2 text-xs font-bold text-sky-900 hover:bg-slate-100"><i className="fas fa-pen-to-square mr-2" />Editar versión actual</button>
                  </div>
                )}
              </div>
            </div>

            <div
              className="
                grid
                gap-3
                p-4
                md:grid-cols-2
                xl:grid-cols-[minmax(330px,2fr)_minmax(130px,0.7fr)_minmax(205px,1fr)_minmax(320px,1.45fr)]
              "
            >
              <div
                className="
                  min-w-0
                "
              >
                <label
                  className="
                    mb-1
                    block
                    text-[11px]
                    font-bold
                    uppercase
                    text-slate-600
                  "
                >
                  Nombre del documento
                </label>

                <input
                  type="text"
                  disabled={
                    true
                  }
                  value={
                    documentoActivo
                      ?.nombre_documento ||
                    ''
                  }
                  onChange={
                    event =>
                      actualizarDocumentoEstado(
                        'nombre_documento',
                        event
                          .target
                          .value
                      )
                  }
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-slate-400
                    px-3
                    text-sm
                    outline-none
                    focus:border-blue-500
                  "
                />
              </div>

              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[11px]
                    font-bold
                    uppercase
                    text-slate-600
                  "
                >
                  Código
                </label>

                <input
                  type="text"
                  disabled={
                    true
                  }
                  value={
                    documentoActivo
                      ?.codigo ||
                    ''
                  }
                  onChange={
                    event =>
                      actualizarDocumentoEstado(
                        'codigo',
                        event
                          .target
                          .value
                      )
                  }
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-slate-400
                    px-3
                    text-sm
                    outline-none
                    focus:border-blue-500
                  "
                />
              </div>

              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[11px]
                    font-bold
                    uppercase
                    text-slate-600
                  "
                >
                  Fecha de elaboración
                </label>

                <input
                  type="date"
                  disabled={
                    true
                  }
                  value={
                    documentoActivo
                      ?.fecha_edicion ||
                    ''
                  }
                  onChange={
                    event =>
                      actualizarDocumentoEstado(
                        'fecha_edicion',
                        event
                          .target
                          .value
                      )
                  }
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-slate-400
                    px-3
                    text-sm
                    outline-none
                    focus:border-blue-500
                  "
                />
              </div>

              <div
                className="
                  grid
                  grid-cols-2
                  gap-2
                "
              >
                <div>
                  <label
                    className="
                      mb-1
                      block
                      text-[11px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Versión
                  </label>

                  <input
                    type="text"
                    disabled
                    value={
                      documentoActivo
                        ?.version ||
                      ''
                    }
                    className="
                      h-9
                      w-full
                      cursor-not-allowed
                      rounded-lg
                      border
                      border-slate-400
                      bg-slate-100
                      px-3
                      text-sm
                      text-slate-500
                    "
                  />
                </div>

                <div className="min-w-0">
                  <label
                    className="
                      mb-1
                      block
                      text-[11px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Fecha de vigencia
                  </label>

                  <input
                    type="date"
                    disabled={
                    true
                  }
                    value={
                      documentoActivo
                        ?.vigencia ||
                      ''
                    }
                    onChange={
                      event =>
                        actualizarDocumentoEstado(
                          'vigencia',
                          event
                            .target
                            .value
                        )
                    }
                    className="
                      h-9
                      w-full
                      rounded-lg
                      border
                      border-slate-400
                      px-3
                      text-sm
                      outline-none
                      focus:border-blue-500
                    "
                  />
                </div>
              </div>

                            {true ? (
                <div className="md:col-span-2 xl:col-span-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Observaciones</label>
                    <div className="min-h-10 w-full rounded-lg border border-slate-400 bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">
                      {documentoActivo?.observaciones?.trim() || 'Sin observaciones registradas'}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-slate-300 pt-3 text-xs font-semibold text-slate-600">
                    <span>Estado del documento:</span>
                    <span className={`rounded-full px-3 py-1 font-bold ${documentoActivo?.activo !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                      {documentoActivo?.activo !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              ) : (
              <div
                className="
                  md:col-span-2
                  xl:col-span-4
                  grid
                  gap-3
                  md:grid-cols-[220px_1fr]
                "
              >
                <label
                  className="
                    flex
                    h-10
                    cursor-pointer
                    items-center
                    gap-2
                    rounded-lg
                    border
                    border-slate-400
                    bg-slate-50
                    px-3
                    text-xs
                    font-semibold
                    text-slate-700
                  "
                >
                  <input
                    type="checkbox"
                    disabled={
                      true
                    }
                    checked={
                      documentoActivo
                        ?.activo !==
                      false
                    }
                    onChange={
                      event =>
                        actualizarDocumentoEstado(
                          'activo',
                          event.target.checked
                        )
                    }
                  />

                  Documento activo
                </label>

                <div>
                  <label
                    className="
                      mb-1
                      block
                      text-[11px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Observaciones
                  </label>

                  <input
                    type="text"
                    disabled={
                      true
                    }
                    value={
                      documentoActivo
                        ?.observaciones ||
                      ''
                    }
                    onChange={
                      event =>
                        actualizarDocumentoEstado(
                          'observaciones',
                          event.target.value
                        )
                    }
                    placeholder="Observaciones del control documental"
                    className="
                      h-9
                      w-full
                      rounded-lg
                      border
                      border-slate-400
                      px-3
                      text-sm
                      outline-none
                      focus:border-blue-500
                      disabled:cursor-not-allowed
                      disabled:bg-slate-100
                      disabled:text-slate-500
                    "
                  />
                </div>
              </div>


              )}
            </div>
          </div>
        )}

                {/* ===============================================
            CREAR NUEVA VERSIÓN
        =============================================== */}

        {[
          'CONTRATO',
          'CODIGO_CONDUCTA',
          'AUTORIZACION_DATOS_CEA',
        ].includes(
          pestanaPrincipal
        ) &&
          documentoActivo &&
          mostrandoNuevaVersion && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
            <div role="dialog" aria-modal="true" aria-label="Crear nueva versión" className="my-auto max-h-[calc(100vh-24px)] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl sm:max-h-[calc(100vh-48px)]">
          <div className="overflow-hidden">
            <FranjaSuperiorModal className="px-5 py-4">
              <h2
                className="
                  text-sm
                  font-bold
                "
              >
                Crear nueva versión
              </h2>

              <p
                className="
                  mt-0.5
                  text-[11px]
                  text-emerald-100
                "
              >
                La versión vigente será archivada completa y su contenido
                se conservará como punto de partida de la nueva versión.
              </p>
            </FranjaSuperiorModal>

            <div
              className="
                grid
                gap-3
                p-4
                md:grid-cols-2
                xl:grid-cols-5
              "
            >
              <div
                className="
                  xl:col-span-2
                "
              >
                <label
                  className="
                    mb-1
                    block
                    text-[10px]
                    font-bold
                    uppercase
                    text-slate-600
                  "
                >
                  Nombre del documento
                </label>

                <input
                  type="text"
                  value={
                    formularioNuevaVersion
                      .nombre_documento
                  }
                  onChange={
                    event =>
                      actualizarFormularioNuevaVersion(
                        'nombre_documento',
                        event.target.value
                      )
                  }
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    px-3
                    text-xs
                    outline-none
                    focus:border-emerald-500
                  "
                />
              </div>

              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[10px]
                    font-bold
                    uppercase
                    text-slate-600
                  "
                >
                  Código
                </label>

                <input
                  type="text"
                  value={
                    formularioNuevaVersion
                      .codigo
                  }
                  onChange={
                    event =>
                      actualizarFormularioNuevaVersion(
                        'codigo',
                        event.target.value
                      )
                  }
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    px-3
                    text-xs
                  "
                />
              </div>

              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[10px]
                    font-bold
                    uppercase
                    text-slate-600
                  "
                >
                  Fecha de elaboración
                </label>

                <input
                  type="date"
                  value={
                    formularioNuevaVersion
                      .fecha_edicion
                  }
                  onChange={
                    event =>
                      actualizarFormularioNuevaVersion(
                        'fecha_edicion',
                        event.target.value
                      )
                  }
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    px-3
                    text-xs
                  "
                />
              </div>

              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[10px]
                    font-bold
                    uppercase
                    text-emerald-800
                  "
                >
                  Nueva versión
                </label>

                <input
                  type="text"
                  value={
                    formularioNuevaVersion
                      .version
                  }
                  onChange={
                    event =>
                      actualizarFormularioNuevaVersion(
                        'version',
                        event.target.value
                      )
                  }
                  placeholder="Ej. 2"
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-emerald-400
                    bg-emerald-50
                    px-3
                    text-xs
                    font-bold
                    outline-none
                    focus:border-emerald-600
                  "
                />
              </div>

              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[10px]
                    font-bold
                    uppercase
                    text-slate-600
                  "
                >
                  Fecha de vigencia
                </label>

                <input
                  type="date"
                  value={
                    formularioNuevaVersion
                      .vigencia
                  }
                  onChange={
                    event =>
                      actualizarFormularioNuevaVersion(
                        'vigencia',
                        event.target.value
                      )
                  }
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    px-3
                    text-xs
                  "
                />
              </div>

              <div
                className="
                  md:col-span-2
                  xl:col-span-4
                "
              >
                <label
                  className="
                    mb-1
                    block
                    text-[10px]
                    font-bold
                    uppercase
                    text-slate-600
                  "
                >
                  Observaciones
                </label>

                <input
                  type="text"
                  value={
                    formularioNuevaVersion
                      .observaciones
                  }
                  onChange={
                    event =>
                      actualizarFormularioNuevaVersion(
                        'observaciones',
                        event.target.value
                      )
                  }
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    px-3
                    text-xs
                  "
                />
              </div>

              <div
                className="
                  flex
                  items-end
                "
              >
                <label
                  className="
                    flex
                    h-9
                    w-full
                    cursor-pointer
                    items-center
                    gap-2
                    rounded-lg
                    border
                    border-slate-300
                    bg-slate-50
                    px-3
                    text-xs
                    font-semibold
                    text-slate-700
                  "
                >
                  <input
                    type="checkbox"
                    checked={
                      formularioNuevaVersion
                        .activo !==
                      false
                    }
                    onChange={
                      event =>
                        actualizarFormularioNuevaVersion(
                          'activo',
                          event.target.checked
                        )
                    }
                  />

                  Activa
                </label>
              </div>

              <div
                className="
                  md:col-span-2
                  xl:col-span-5
                  flex
                  justify-end
                  gap-2
                  border-t
                  border-slate-200
                  pt-3
                "
              >
                <button
                  type="button"
                  onClick={
                    cancelarNuevaVersion
                  }
                  disabled={
                    creandoNuevaVersion
                  }
                  className="
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-4
                    py-2
                    text-xs
                    font-bold
                    text-slate-700
                    hover:bg-slate-100
                    disabled:opacity-50
                  "
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={
                    crearNuevaVersion
                  }
                  disabled={
                    creandoNuevaVersion
                  }
                  className="
                    rounded-lg
                    bg-emerald-700
                    px-4
                    py-2
                    text-xs
                    font-bold
                    text-white
                    hover:bg-emerald-800
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <i className="fas fa-code-branch mr-2" />

                  {creandoNuevaVersion
                    ? 'Creando...'
                    : 'Crear nueva versión'}
                </button>
              </div>
            </div>
          </div>
            </div>
          </div>
        )}


        {/* ===============================================
            HISTORIAL DE VERSIONES
        =============================================== */}

        {[
          'CONTRATO',
          'CODIGO_CONDUCTA',
          'AUTORIZACION_DATOS_CEA',
        ].includes(
          pestanaPrincipal
        ) &&
          mostrandoHistorialVersiones && (
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
            <div
              className="
                flex
                items-center
                justify-between
                gap-3
                bg-slate-800
                px-4
                py-3
                text-white
              "
            >
              <div>
                <h2
                  className="
                    text-sm
                    font-bold
                  "
                >
                  Versiones anteriores
                </h2>

                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-300
                  "
                >
                  Historial inalterable de versiones archivadas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMostrandoHistorialVersiones(
                    false
                  )

                  setVersionHistoricaSeleccionada(
                    null
                  )
                }}
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  bg-white/10
                  text-white
                  hover:bg-white/20
                "
              >
                <i className="fas fa-xmark" />
              </button>
            </div>

            {versionesDocumentoActivo.length ===
            0 ? (
              <div
                className="
                  p-8
                  text-center
                  text-sm
                  text-slate-500
                "
              >
                <i className="fas fa-clock-rotate-left mb-3 block text-3xl text-slate-300" />

                Este documento todavía no tiene versiones anteriores.
              </div>
            ) : (
              <div
                className="
                  grid
                  gap-4
                  p-4
                  lg:grid-cols-[360px_1fr]
                "
              >
                <div
                  className="
                    space-y-2
                  "
                >
                  {versionesDocumentoActivo.map(
                    version => (
                      <button
                        key={
                          version.id
                        }
                        type="button"
                        onClick={() =>
                          setVersionHistoricaSeleccionada(
                            version
                          )
                        }
                        className={`
                          w-full
                          rounded-lg
                          border
                          p-3
                          text-left
                          transition
                          ${
                            Number(
                              versionHistoricaSeleccionada
                                ?.id
                            ) ===
                            Number(
                              version.id
                            )
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }
                        `}
                      >
                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            gap-3
                          "
                        >
                          <span
                            className="
                              text-xs
                              font-black
                              text-slate-800
                            "
                          >
                            Versión {
                              version
                                ?.version ||
                              'Sin número'
                            }
                          </span>

                          <span
                            className="
                              text-[9px]
                              text-slate-500
                            "
                          >
                            {fechaVisual(
                              version
                                ?.fecha_edicion
                            ) ||
                              'Sin fecha'}
                          </span>
                        </div>

                        <div
                          className="
                            mt-1
                            text-[10px]
                            text-slate-500
                          "
                        >
                          {version
                            ?.codigo ||
                            'Sin código'}
                        </div>
                      </button>
                    )
                  )}
                </div>

                <div
                  className="
                    min-h-[240px]
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    p-4
                  "
                >
                  {versionHistoricaSeleccionada
                    ? (
                      <div
                        className="
                          space-y-4
                        "
                      >
                        <div>
                          <h3
                            className="
                              text-sm
                              font-black
                              text-slate-800
                            "
                          >
                            {versionHistoricaSeleccionada
                              ?.nombre_documento}
                          </h3>

                          <div
                            className="
                              mt-2
                              grid
                              gap-2
                              text-[11px]
                              text-slate-600
                              sm:grid-cols-2
                            "
                          >
                            <div>
                              <strong>
                                Código:
                              </strong>
                              {' '}
                              {versionHistoricaSeleccionada
                                ?.codigo ||
                                '—'}
                            </div>

                            <div>
                              <strong>
                                Versión:
                              </strong>
                              {' '}
                              {versionHistoricaSeleccionada
                                ?.version ||
                                '—'}
                            </div>

                            <div>
                              <strong>
                                Elaboración:
                              </strong>
                              {' '}
                              {fechaVisual(
                                versionHistoricaSeleccionada
                                  ?.fecha_edicion
                              ) ||
                                '—'}
                            </div>

                            <div>
                              <strong>
                                Vigencia:
                              </strong>
                              {' '}
                              {fechaVisual(
                                versionHistoricaSeleccionada
                                  ?.vigencia
                              ) ||
                                '—'}
                            </div>
                          </div>
                        </div>

                        {/* ===============================================
                            CONTENIDO VISUAL DE LA VERSIÓN HISTÓRICA
                        =============================================== */}

                        <div
                          className="
                            space-y-4
                          "
                        >
                          {/* =============================================
                              CONTRATO
                          ============================================= */}

                          {tipoDocumentoActivo ===
                            'CONTRATO' && (
                            <>
                              <div
                                className="
                                  overflow-hidden
                                  rounded-xl
                                  border
                                  border-sky-200
                                  bg-white
                                "
                              >
                                <div
                                  className="
                                    bg-sky-800
                                    px-4
                                    py-2.5
                                    text-xs
                                    font-bold
                                    text-white
                                  "
                                >
                                  Texto introductorio
                                </div>

                                <div
                                  className="
                                    whitespace-pre-wrap
                                    p-4
                                    text-xs
                                    leading-relaxed
                                    text-slate-700
                                  "
                                >
                                  {versionHistoricaSeleccionada
                                    ?.contenido
                                    ?.configuracion
                                    ?.texto_introductorio ||
                                    'Sin texto introductorio.'}
                                </div>
                              </div>


                              <div
                                className="
                                  overflow-hidden
                                  rounded-xl
                                  border
                                  border-slate-300
                                  bg-white
                                "
                              >
                                <div
                                  className="
                                    flex
                                    items-center
                                    justify-between
                                    bg-slate-800
                                    px-4
                                    py-2.5
                                    text-white
                                  "
                                >
                                  <span
                                    className="
                                      text-xs
                                      font-bold
                                    "
                                  >
                                    Cláusulas del contrato
                                  </span>

                                  <span
                                    className="
                                      rounded-full
                                      bg-white/10
                                      px-2
                                      py-1
                                      text-[9px]
                                      font-bold
                                    "
                                  >
                                    {
                                      Array.isArray(
                                        versionHistoricaSeleccionada
                                          ?.contenido
                                          ?.clausulas
                                      )
                                        ? versionHistoricaSeleccionada
                                            .contenido
                                            .clausulas
                                            .length
                                        : 0
                                    } cláusula(s)
                                  </span>
                                </div>

                                <div
                                  className="
                                    space-y-3
                                    bg-slate-50
                                    p-4
                                  "
                                >
                                  {Array.isArray(
                                    versionHistoricaSeleccionada
                                      ?.contenido
                                      ?.clausulas
                                  ) &&
                                  versionHistoricaSeleccionada
                                    .contenido
                                    .clausulas
                                    .length >
                                    0 ? (
                                    [...versionHistoricaSeleccionada
                                      .contenido
                                      .clausulas]
                                      .sort(
                                        (
                                          a,
                                          b
                                        ) =>
                                          Number(
                                            a?.orden ||
                                            0
                                          ) -
                                          Number(
                                            b?.orden ||
                                            0
                                          )
                                      )
                                      .map(
                                        (
                                          clausula,
                                          index
                                        ) => (
                                          <div
                                            key={
                                              clausula?.id ||
                                              `historica-clausula-${index}`
                                            }
                                            className="
                                              overflow-hidden
                                              rounded-lg
                                              border
                                              border-slate-200
                                              bg-white
                                            "
                                          >
                                            <div
                                              className="
                                                border-b
                                                border-slate-200
                                                bg-violet-50
                                                px-4
                                                py-2.5
                                              "
                                            >
                                              <div
                                                className="
                                                  text-[11px]
                                                  font-black
                                                  uppercase
                                                  text-violet-900
                                                "
                                              >
                                                {tituloVisualClausula(
                                                  clausula,
                                                  index
                                                )}
                                              </div>

                                              {clausula
                                                ?.activo ===
                                                false && (
                                                <span
                                                  className="
                                                    mt-1
                                                    inline-block
                                                    rounded-full
                                                    bg-slate-200
                                                    px-2
                                                    py-0.5
                                                    text-[8px]
                                                    font-bold
                                                    uppercase
                                                    text-slate-600
                                                  "
                                                >
                                                  Inactiva
                                                </span>
                                              )}
                                            </div>

                                            <div
                                              className="
                                                whitespace-pre-wrap
                                                p-4
                                                text-xs
                                                leading-relaxed
                                                text-slate-700
                                              "
                                            >
                                              {clausula
                                                ?.contenido ||
                                                'Sin contenido.'}
                                            </div>
                                          </div>
                                        )
                                      )
                                  ) : (
                                    <div
                                      className="
                                        py-6
                                        text-center
                                        text-xs
                                        text-slate-400
                                      "
                                    >
                                      Esta versión no tiene cláusulas archivadas.
                                    </div>
                                  )}
                                </div>
                              </div>


                              <div
                                className="
                                  overflow-hidden
                                  rounded-xl
                                  border
                                  border-sky-200
                                  bg-white
                                "
                              >
                                <div
                                  className="
                                    bg-sky-800
                                    px-4
                                    py-2.5
                                    text-xs
                                    font-bold
                                    text-white
                                  "
                                >
                                  Texto final
                                </div>

                                <div
                                  className="
                                    whitespace-pre-wrap
                                    p-4
                                    text-xs
                                    leading-relaxed
                                    text-slate-700
                                  "
                                >
                                  {versionHistoricaSeleccionada
                                    ?.contenido
                                    ?.configuracion
                                    ?.texto_final ||
                                    'Sin texto final.'}
                                </div>
                              </div>


                              <div
                                className="
                                  grid
                                  gap-3
                                  sm:grid-cols-2
                                "
                              >
                                <div
                                  className="
                                    rounded-lg
                                    border
                                    border-slate-200
                                    bg-white
                                    px-3
                                    py-2.5
                                    text-xs
                                    text-slate-700
                                  "
                                >
                                  <i
                                    className={`
                                      fas
                                      mr-2
                                      ${
                                        versionHistoricaSeleccionada
                                          ?.contenido
                                          ?.configuracion
                                          ?.mostrar_foto !==
                                        false
                                          ? 'fa-circle-check text-emerald-600'
                                          : 'fa-circle-xmark text-slate-400'
                                      }
                                    `}
                                  />

                                  Mostrar fotografía:
                                  {' '}
                                  <strong>
                                    {versionHistoricaSeleccionada
                                      ?.contenido
                                      ?.configuracion
                                      ?.mostrar_foto !==
                                    false
                                      ? 'Sí'
                                      : 'No'}
                                  </strong>
                                </div>

                                <div
                                  className="
                                    rounded-lg
                                    border
                                    border-slate-200
                                    bg-white
                                    px-3
                                    py-2.5
                                    text-xs
                                    text-slate-700
                                  "
                                >
                                  <i
                                    className={`
                                      fas
                                      mr-2
                                      ${
                                        versionHistoricaSeleccionada
                                          ?.contenido
                                          ?.configuracion
                                          ?.mostrar_huella !==
                                        false
                                          ? 'fa-circle-check text-emerald-600'
                                          : 'fa-circle-xmark text-slate-400'
                                      }
                                    `}
                                  />

                                  Mostrar huella:
                                  {' '}
                                  <strong>
                                    {versionHistoricaSeleccionada
                                      ?.contenido
                                      ?.configuracion
                                      ?.mostrar_huella !==
                                    false
                                      ? 'Sí'
                                      : 'No'}
                                  </strong>
                                </div>
                              </div>
                            </>
                          )}


                          {/* =============================================
                              CÓDIGO DE CONDUCTA
                          ============================================= */}

                          {tipoDocumentoActivo ===
                            'CODIGO_CONDUCTA' && (
                            <div
                              className="
                                overflow-hidden
                                rounded-xl
                                border
                                border-amber-200
                                bg-white
                              "
                            >
                              <div
                                className="
                                  flex
                                  items-center
                                  justify-between
                                  bg-amber-700
                                  px-4
                                  py-2.5
                                  text-white
                                "
                              >
                                <span
                                  className="
                                    text-xs
                                    font-bold
                                  "
                                >
                                  Secciones del Código de Conducta
                                </span>

                                <span
                                  className="
                                    rounded-full
                                    bg-white/10
                                    px-2
                                    py-1
                                    text-[9px]
                                    font-bold
                                  "
                                >
                                  {
                                    Array.isArray(
                                      versionHistoricaSeleccionada
                                        ?.contenido
                                        ?.secciones
                                    )
                                      ? versionHistoricaSeleccionada
                                          .contenido
                                          .secciones
                                          .length
                                      : 0
                                  } sección(es)
                                </span>
                              </div>

                              <div
                                className="
                                  space-y-3
                                  bg-slate-50
                                  p-4
                                "
                              >
                                {Array.isArray(
                                  versionHistoricaSeleccionada
                                    ?.contenido
                                    ?.secciones
                                ) &&
                                versionHistoricaSeleccionada
                                  .contenido
                                  .secciones
                                  .length >
                                  0 ? (
                                  [...versionHistoricaSeleccionada
                                    .contenido
                                    .secciones]
                                    .sort(
                                      (
                                        a,
                                        b
                                      ) =>
                                        Number(
                                          a?.orden ||
                                          0
                                        ) -
                                        Number(
                                          b?.orden ||
                                          0
                                        )
                                    )
                                    .map(
                                      (
                                        seccion,
                                        index
                                      ) => (
                                        <div
                                          key={
                                            seccion?.id ||
                                            `historica-codigo-${index}`
                                          }
                                          className="
                                            overflow-hidden
                                            rounded-lg
                                            border
                                            border-slate-200
                                            bg-white
                                          "
                                        >
                                          <div
                                            className="
                                              border-b
                                              border-slate-200
                                              bg-amber-50
                                              px-4
                                              py-2.5
                                            "
                                          >
                                            <div
                                              className="
                                                text-[11px]
                                                font-black
                                                uppercase
                                                text-amber-900
                                              "
                                            >
                                              {texto(
                                                seccion
                                                  ?.titulo
                                              ) ||
                                                `SECCIÓN ${index + 1}`}
                                            </div>

                                            {seccion
                                              ?.activo ===
                                              false && (
                                              <span
                                                className="
                                                  mt-1
                                                  inline-block
                                                  rounded-full
                                                  bg-slate-200
                                                  px-2
                                                  py-0.5
                                                  text-[8px]
                                                  font-bold
                                                  uppercase
                                                  text-slate-600
                                                "
                                              >
                                                Inactiva
                                              </span>
                                            )}
                                          </div>

                                          <div
                                            className="
                                              whitespace-pre-wrap
                                              p-4
                                              text-xs
                                              leading-relaxed
                                              text-slate-700
                                            "
                                          >
                                            {seccion
                                              ?.contenido ||
                                              'Sin contenido.'}
                                          </div>
                                        </div>
                                      )
                                    )
                                ) : (
                                  <div
                                    className="
                                      py-6
                                      text-center
                                      text-xs
                                      text-slate-400
                                    "
                                  >
                                    Esta versión no tiene secciones archivadas.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}


                          {/* =============================================
                              AUTORIZACIÓN DE DATOS
                          ============================================= */}

                          {tipoDocumentoActivo ===
                            'AUTORIZACION_DATOS_CEA' && (
                            <>
                              <div
                                className="
                                  overflow-hidden
                                  rounded-xl
                                  border
                                  border-teal-200
                                  bg-white
                                "
                              >
                                <div
                                  className="
                                    bg-teal-800
                                    px-4
                                    py-2.5
                                    text-xs
                                    font-bold
                                    text-white
                                  "
                                >
                                  Configuración general
                                </div>

                                <div
                                  className="
                                    grid
                                    gap-3
                                    p-4
                                    text-xs
                                    text-slate-700
                                    md:grid-cols-2
                                  "
                                >
                                  <div>
                                    <strong>
                                      Correo:
                                    </strong>
                                    {' '}
                                    {versionHistoricaSeleccionada
                                      ?.contenido
                                      ?.configuracion
                                      ?.correo_proteccion_datos ||
                                      '—'}
                                  </div>

                                  <div>
                                    <strong>
                                      Teléfono:
                                    </strong>
                                    {' '}
                                    {versionHistoricaSeleccionada
                                      ?.contenido
                                      ?.configuracion
                                      ?.telefono_contacto ||
                                      '—'}
                                  </div>

                                  <div>
                                    <strong>
                                      Dirección:
                                    </strong>
                                    {' '}
                                    {versionHistoricaSeleccionada
                                      ?.contenido
                                      ?.configuracion
                                      ?.direccion_contacto ||
                                      '—'}
                                  </div>

                                  <div>
                                    <strong>
                                      Medio de la política:
                                    </strong>
                                    {' '}
                                    {versionHistoricaSeleccionada
                                      ?.contenido
                                      ?.configuracion
                                      ?.medio_politica ||
                                      '—'}
                                  </div>
                                </div>
                              </div>


                              <div
                                className="
                                  overflow-hidden
                                  rounded-xl
                                  border
                                  border-teal-200
                                  bg-white
                                "
                              >
                                <div
                                  className="
                                    bg-teal-800
                                    px-4
                                    py-2.5
                                    text-xs
                                    font-bold
                                    text-white
                                  "
                                >
                                  Datos sensibles y biométricos
                                </div>

                                <div
                                  className="
                                    whitespace-pre-wrap
                                    p-4
                                    text-xs
                                    leading-relaxed
                                    text-slate-700
                                  "
                                >
                                  {versionHistoricaSeleccionada
                                    ?.contenido
                                    ?.configuracion
                                    ?.texto_datos_biometricos ||
                                    'Sin contenido.'}
                                </div>
                              </div>


                              <div
                                className="
                                  overflow-hidden
                                  rounded-xl
                                  border
                                  border-teal-200
                                  bg-white
                                "
                              >
                                <div
                                  className="
                                    bg-teal-800
                                    px-4
                                    py-2.5
                                    text-xs
                                    font-bold
                                    text-white
                                  "
                                >
                                  Tratamiento de datos de menores de edad
                                </div>

                                <div
                                  className="
                                    whitespace-pre-wrap
                                    p-4
                                    text-xs
                                    leading-relaxed
                                    text-slate-700
                                  "
                                >
                                  {versionHistoricaSeleccionada
                                    ?.contenido
                                    ?.configuracion
                                    ?.texto_menores_edad ||
                                    'Sin contenido.'}
                                </div>
                              </div>


                              <div
                                className="
                                  overflow-hidden
                                  rounded-xl
                                  border
                                  border-teal-200
                                  bg-white
                                "
                              >
                                <div
                                  className="
                                    bg-teal-800
                                    px-4
                                    py-2.5
                                    text-xs
                                    font-bold
                                    text-white
                                  "
                                >
                                  Secciones legales
                                </div>

                                <div
                                  className="
                                    space-y-3
                                    bg-slate-50
                                    p-4
                                  "
                                >
                                  {Array.isArray(
                                    versionHistoricaSeleccionada
                                      ?.contenido
                                      ?.secciones
                                  ) &&
                                  versionHistoricaSeleccionada
                                    .contenido
                                    .secciones
                                    .length >
                                    0 ? (
                                    [...versionHistoricaSeleccionada
                                      .contenido
                                      .secciones]
                                      .sort(
                                        (
                                          a,
                                          b
                                        ) =>
                                          Number(
                                            a?.orden ||
                                            0
                                          ) -
                                          Number(
                                            b?.orden ||
                                            0
                                          )
                                      )
                                      .map(
                                        (
                                          seccion,
                                          index
                                        ) => (
                                          <div
                                            key={
                                              seccion?.id ||
                                              `historica-autorizacion-${index}`
                                            }
                                            className="
                                              overflow-hidden
                                              rounded-lg
                                              border
                                              border-slate-200
                                              bg-white
                                            "
                                          >
                                            <div
                                              className="
                                                border-b
                                                border-slate-200
                                                bg-teal-50
                                                px-4
                                                py-2.5
                                                text-[11px]
                                                font-black
                                                uppercase
                                                text-teal-900
                                              "
                                            >
                                              {texto(
                                                seccion
                                                  ?.titulo
                                              ) ||
                                                `SECCIÓN ${index + 1}`}
                                            </div>

                                            <div
                                              className="
                                                whitespace-pre-wrap
                                                p-4
                                                text-xs
                                                leading-relaxed
                                                text-slate-700
                                              "
                                            >
                                              {seccion
                                                ?.contenido ||
                                                'Sin contenido.'}
                                            </div>
                                          </div>
                                        )
                                      )
                                  ) : (
                                    <div
                                      className="
                                        py-5
                                        text-center
                                        text-xs
                                        text-slate-400
                                      "
                                    >
                                      Sin secciones archivadas.
                                    </div>
                                  )}
                                </div>
                              </div>


                              <div
                                className="
                                  overflow-hidden
                                  rounded-xl
                                  border
                                  border-teal-200
                                  bg-white
                                "
                              >
                                <div
                                  className="
                                    bg-teal-800
                                    px-4
                                    py-2.5
                                    text-xs
                                    font-bold
                                    text-white
                                  "
                                >
                                  Finalidades con autorización individual
                                </div>

                                <div
                                  className="
                                    space-y-2
                                    bg-slate-50
                                    p-4
                                  "
                                >
                                  {Array.isArray(
                                    versionHistoricaSeleccionada
                                      ?.contenido
                                      ?.finalidades
                                  ) &&
                                  versionHistoricaSeleccionada
                                    .contenido
                                    .finalidades
                                    .length >
                                    0 ? (
                                    [...versionHistoricaSeleccionada
                                      .contenido
                                      .finalidades]
                                      .sort(
                                        (
                                          a,
                                          b
                                        ) =>
                                          Number(
                                            a?.orden ||
                                            0
                                          ) -
                                          Number(
                                            b?.orden ||
                                            0
                                          )
                                      )
                                      .map(
                                        (
                                          finalidad,
                                          index
                                        ) => (
                                          <div
                                            key={
                                              finalidad?.id ||
                                              `historica-finalidad-${index}`
                                            }
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
                                                mb-1
                                                text-[10px]
                                                font-black
                                                uppercase
                                                text-teal-900
                                              "
                                            >
                                              Finalidad {index + 1}
                                            </div>

                                            <div
                                              className="
                                                whitespace-pre-wrap
                                                text-xs
                                                leading-relaxed
                                                text-slate-700
                                              "
                                            >
                                              {finalidad
                                                ?.descripcion ||
                                                'Sin descripción.'}
                                            </div>

                                            <div
                                              className="
                                                mt-2
                                                flex
                                                flex-wrap
                                                gap-2
                                              "
                                            >
                                              <span
                                                className="
                                                  rounded-full
                                                  bg-slate-100
                                                  px-2
                                                  py-1
                                                  text-[8px]
                                                  font-bold
                                                  text-slate-600
                                                "
                                              >
                                                {finalidad
                                                  ?.codigo ||
                                                  'SIN CÓDIGO'}
                                              </span>

                                              {finalidad
                                                ?.requiere_respuesta !==
                                                false && (
                                                <span
                                                  className="
                                                    rounded-full
                                                    bg-teal-100
                                                    px-2
                                                    py-1
                                                    text-[8px]
                                                    font-bold
                                                    text-teal-800
                                                  "
                                                >
                                                  RESPUESTA SÍ / NO
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      )
                                  ) : (
                                    <div
                                      className="
                                        py-5
                                        text-center
                                        text-xs
                                        text-slate-400
                                      "
                                    >
                                      Sin finalidades archivadas.
                                    </div>
                                  )}
                                </div>
                              </div>


                              <div
                                className="
                                  overflow-hidden
                                  rounded-xl
                                  border
                                  border-teal-200
                                  bg-white
                                "
                              >
                                <div
                                  className="
                                    bg-teal-800
                                    px-4
                                    py-2.5
                                    text-xs
                                    font-bold
                                    text-white
                                  "
                                >
                                  Declaración y autorización final
                                </div>

                                <div
                                  className="
                                    whitespace-pre-wrap
                                    p-4
                                    text-xs
                                    leading-relaxed
                                    text-slate-700
                                  "
                                >
                                  {versionHistoricaSeleccionada
                                    ?.contenido
                                    ?.configuracion
                                    ?.texto_declaracion_final ||
                                    'Sin contenido.'}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                    : (
                      <div
                        className="
                          flex
                          h-full
                          min-h-[220px]
                          items-center
                          justify-center
                          text-center
                          text-sm
                          text-slate-400
                        "
                      >
                        Seleccione una versión para consultar su contenido.
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===============================================
            OTROS DOCUMENTOS
        =============================================== */}

        {pestanaPrincipal ===
          'OTROS_DOCUMENTOS' && (
          <div
            className="
              space-y-4
            "
          >
            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-emerald-200
                bg-white
                shadow-sm
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  bg-emerald-800
                  px-4
                  py-3
                  text-white
                  md:flex-row
                  md:items-center
                  md:justify-between
                "
              >
                <div>
                  <h2
                    className="
                      text-sm
                      font-bold
                    "
                  >
                    Otros Documentos
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-[11px]
                      text-emerald-100
                    "
                  >
                    Administre los datos de control documental utilizados por el
                    encabezado compartido: nombre, código, fecha de elaboración,
                    versión y fecha de vigencia.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    nuevoDocumento
                  }
                  className="
                    rounded-lg
                    bg-white
                    px-4
                    py-2
                    text-xs
                    font-black
                    text-emerald-800
                    shadow-sm
                    hover:bg-emerald-50
                  "
                >
                  <i className="fas fa-plus mr-2" />

                  Agregar documento
                </button>
              </div>

              {otrosDocumentos.length ===
              0 ? (
                <div
                  className="
                    p-8
                    text-center
                    text-sm
                    text-slate-500
                  "
                >
                  <i className="fas fa-folder-open mb-3 block text-3xl text-slate-300" />

                  Aún no hay otros documentos configurados para este CEA.
                </div>
              ) : (
                <div
                  className="
                    overflow-x-auto
                  "
                >
                  <table
                    className="
                      w-full
                      min-w-[1050px]
                      border-collapse
                      border border-slate-300
                      [&_th]:border [&_th]:border-slate-300
                      [&_td]:border [&_td]:border-slate-300
                      text-left
                    "
                  >
                    <thead>
                      <tr style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}
                        className="
                          border-b
                          border-slate-300
                          
                          text-[10px]
                          font-black
                          uppercase
                          
                        "
                      >
                        <th className="px-3 py-2">
                          Documento
                        </th>

                        <th className="px-3 py-2">
                          Código
                        </th>

                        <th className="px-3 py-2">
                          Elaboración
                        </th>

                        <th className="px-3 py-2">
                          Versión
                        </th>

                        <th className="px-3 py-2">
                          Vigencia
                        </th>

                        <th className="px-3 py-2">
                          Estado
                        </th>

                        <th
                          className="
                            px-3
                            py-2
                            text-right
                          "
                        >
                          Acciones
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {[...
                        otrosDocumentos,
                      ]
                        .sort(
                          (
                            a,
                            b
                          ) =>
                            texto(
                              a
                                ?.nombre_documento
                            ).localeCompare(
                              texto(
                                b
                                  ?.nombre_documento
                              ),
                              'es'
                            )
                        )
                        .map(
                          documento => (
                            <tr style={{ borderColor: ESTILO_CELDAS_TABLA.borde }}
                              key={
                                documento.id
                              }
                              className="
                                border-b
                                
                                bg-white
                                text-xs
                                hover:bg-slate-50
                              "
                            >
                              <td
                                className="
                                  px-3
                                  py-3
                                "
                              >
                                <div
                                  className="
                                    font-bold
                                    text-slate-800
                                  "
                                >
                                  {documento
                                    ?.nombre_documento ||
                                    'Sin nombre'}
                                </div>

                                <div
                                  className="
                                    mt-0.5
                                    text-[9px]
                                    font-mono
                                    text-slate-400
                                  "
                                >
                                  {documento
                                    ?.tipo_documento}
                                </div>
                              </td>

                              <td
                                className="
                                  px-3
                                  py-3
                                  text-slate-700
                                "
                              >
                                {documento
                                  ?.codigo ||
                                  '—'}
                              </td>

                              <td
                                className="
                                  px-3
                                  py-3
                                  text-slate-700
                                "
                              >
                                {fechaVisual(
                                  documento
                                    ?.fecha_edicion
                                ) ||
                                  '—'}
                              </td>

                              <td
                                className="
                                  px-3
                                  py-3
                                  text-slate-700
                                "
                              >
                                {documento
                                  ?.version ||
                                  '—'}
                              </td>

                              <td
                                className="
                                  px-3
                                  py-3
                                  text-slate-700
                                "
                              >
                                {fechaVisual(
                                  documento
                                    ?.vigencia
                                ) ||
                                  '—'}
                              </td>

                              <td
                                className="
                                  px-3
                                  py-3
                                "
                              >
                                <span
                                  className={`
                                    rounded-full
                                    px-2
                                    py-1
                                    text-[9px]
                                    font-black
                                    uppercase
                                    ${
                                      documento
                                        ?.activo !==
                                      false
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-200 text-slate-600'
                                    }
                                  `}
                                >
                                  {documento
                                    ?.activo !==
                                  false
                                    ? 'Activo'
                                    : 'Inactivo'}
                                </span>
                              </td>

                              <td
                                className="
                                  px-3
                                  py-3
                                  text-right
                                "
                              >
                                <div
                                  className="
                                    flex
                                    justify-end
                                    gap-1
                                  "
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      editarOtroDocumento(
                                        documento
                                      )
                                    }
                                    className="
                                      flex
                                      h-8
                                      w-8
                                      items-center
                                      justify-center
                                      rounded-lg
                                      border
                                      border-blue-300
                                      bg-blue-50
                                      text-blue-700
                                      hover:bg-blue-100
                                    "
                                    title="Editar documento"
                                  >
                                    <i className="fas fa-pen-to-square" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      eliminarOtroDocumento(
                                        documento
                                      )
                                    }
                                    disabled={
                                      eliminandoDocumento ===
                                      documento.id
                                    }
                                    className="
                                      flex
                                      h-8
                                      w-8
                                      items-center
                                      justify-center
                                      rounded-lg
                                      border
                                      border-red-300
                                      bg-red-50
                                      text-red-700
                                      hover:bg-red-100
                                      disabled:opacity-50
                                    "
                                    title="Eliminar documento"
                                  >
                                    {eliminandoDocumento ===
                                    documento.id ? (
                                      <i className="fas fa-spinner fa-spin" />
                                    ) : (
                                      <i className="fas fa-trash" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}


        {/* ===============================================
            CONTENIDO DEL CONTRATO
        =============================================== */}

          {pestanaPrincipal ===
          'CONTRATO' && (
          <fieldset
            disabled={
              !modoEdicionDocumento
            }
            className={`
              space-y-4
              ${
                !modoEdicionDocumento
                  ? 'opacity-75'
                  : ''
              }
            `}
          >
            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-violet-400
                bg-white
                shadow-sm
              "
            >
              <div
                className="
                  bg-sky-800
                  px-4
                  py-3
                  text-white
                "
              >
                <h2
                  className="
                    text-sm
                    font-bold
                  "
                >
                  Contenido general del contrato
                </h2>

                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-violet-100
                  "
                >
                  Configure únicamente el texto contractual. Los datos del aprendiz,
                  matrícula y demás información variable se incorporarán al generar
                  el documento desde Inscripciones.
                </p>
              </div>

              <div
                className="
                  grid
                  gap-4
                  p-4
                  lg:grid-cols-2
                "
              >
                <div>
                  <label
                    className="
                      mb-1
                      block
                      text-[11px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Texto introductorio
                  </label>

                  <textarea
                    rows={8}
                    value={
                      configuracionContrato
                        .texto_introductorio
                    }
                    onChange={
                      event =>
                        actualizarContratoEstado(
                          'texto_introductorio',
                          event
                            .target
                            .value
                        )
                    }
                    placeholder="Texto que aparecerá antes de las cláusulas."
                    className="
                      w-full
                      resize-y
                      rounded-lg
                      border
                      border-slate-400
                      px-3
                      py-2
                      text-xs
                      leading-relaxed
                      outline-none
                      focus:border-violet-500
                    "
                  />
                </div>

                <div>
                  <label
                    className="
                      mb-1
                      block
                      text-[11px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Texto final
                  </label>

                  <textarea
                    rows={8}
                    value={
                      configuracionContrato
                        .texto_final
                    }
                    onChange={
                      event =>
                        actualizarContratoEstado(
                          'texto_final',
                          event
                            .target
                            .value
                        )
                    }
                    placeholder="Texto posterior a las cláusulas, antes del bloque de firmas."
                    className="
                      w-full
                      resize-y
                      rounded-lg
                      border
                      border-slate-400
                      px-3
                      py-2
                      text-xs
                      leading-relaxed
                      outline-none
                      focus:border-violet-500
                    "
                  />
                </div>

                <div
                  className="
                    lg:col-span-2
                  "
                >
                  <div
                    className="
                      flex
                      justify-end
                    "
                  >
                    <button
                      type="button"
                      onClick={
                        guardarConfiguracionContrato
                      }
                      disabled={
                        guardandoContrato
                      }
                      className="
                        rounded-lg
                        bg-slate-700
                        px-4
                        py-2
                        text-xs
                        font-bold
                        text-white
                        hover:bg-violet-800
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      <i className="fas fa-floppy-disk mr-2" />

                      {guardandoContrato
                        ? 'Guardando...'
                        : 'Guardar contenido general'}
                    </button>
                  </div>
                </div>
              </div>
            </div>


            {/* =============================================
                CLÁUSULAS
            ============================================= */}

            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-violet-400
                bg-white
                shadow-sm
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  bg-slate-800
                  px-4
                  py-3
                  text-white
                  md:flex-row
                  md:items-center
                  md:justify-between
                "
              >
                <div>
                  <h2
                    className="
                      text-sm
                      font-bold
                    "
                  >
                    Cláusulas del contrato
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-[11px]
                      text-slate-300
                    "
                  >
                    Cada CEA puede definir la cantidad y contenido de cláusulas que requiera.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    agregarClausulaContrato
                  }
                  disabled={
                    agregandoClausula
                  }
                  className="
                    rounded-lg
                    bg-amber-500
                    px-4
                    py-2
                    text-xs
                    font-black
                    text-slate-900
                    shadow-sm
                    hover:bg-amber-400
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <i className="fas fa-plus mr-2" />

                  {agregandoClausula
                    ? 'Agregando...'
                    : 'Agregar cláusula'}
                </button>
              </div>

              {clausulasContrato.length ===
              0 ? (
                <div
                  className="
                    p-8
                    text-center
                    text-sm
                    text-slate-500
                  "
                >
                  <i className="fas fa-file-circle-plus mb-3 block text-3xl text-slate-300" />

                  Aún no hay cláusulas configuradas para este CEA.
                </div>
              ) : (
                <div
                  className="
                    space-y-4
                    bg-slate-50
                    p-4
                  "
                >
                  {clausulasContrato.map(
                    (
                      clausula,
                      index
                    ) => (
                      <div
                        key={
                          clausula.id
                        }
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
                            flex-col
                            gap-3
                            border-b
                            border-slate-300
                            bg-violet-50
                            px-4
                            py-3
                            md:flex-row
                            md:items-center
                            md:justify-between
                          "
                        >
                          <div>
                            <div
                              className="
                                text-xs
                                font-black
                                uppercase
                                text-violet-900
                              "
                            >
                              {tituloVisualClausula(
                                clausula,
                                index
                              )}
                            </div>

                            <div
                              className="
                                mt-0.5
                                text-[10px]
                                text-slate-500
                              "
                            >
                              Orden {index + 1}
                            </div>
                          </div>

                          <div
                            className="
                              flex
                              flex-wrap
                              items-center
                              gap-1
                            "
                          >
                            <button
                              type="button"
                              disabled={
                                index ===
                                0
                              }
                              onClick={() =>
                                moverClausulaContrato(
                                  index,
                                  -1
                                )
                              }
                              title="Mover arriba"
                              className="
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-slate-400
                                bg-white
                                text-slate-700
                                hover:bg-slate-100
                                disabled:opacity-30
                              "
                            >
                              <i className="fas fa-arrow-up" />
                            </button>

                            <button
                              type="button"
                              disabled={
                                index ===
                                clausulasContrato.length -
                                  1
                              }
                              onClick={() =>
                                moverClausulaContrato(
                                  index,
                                  1
                                )
                              }
                              title="Mover abajo"
                              className="
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-slate-400
                                bg-white
                                text-slate-700
                                hover:bg-slate-100
                                disabled:opacity-30
                              "
                            >
                              <i className="fas fa-arrow-down" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                eliminarClausulaContrato(
                                  clausula
                                )
                              }
                              disabled={
                                eliminandoClausula ===
                                clausula.id
                              }
                              title="Eliminar cláusula"
                              className="
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-red-300
                                bg-red-50
                                text-red-700
                                hover:bg-red-100
                                disabled:opacity-50
                              "
                            >
                              {eliminandoClausula ===
                              clausula.id ? (
                                <i className="fas fa-spinner fa-spin" />
                              ) : (
                                <i className="fas fa-trash" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div
                          className="
                            grid
                            gap-4
                            p-4
                            lg:grid-cols-[280px_1fr]
                          "
                        >
                          <div>
                            <label
                              className="
                                mb-1
                                block
                                text-[10px]
                                font-bold
                                uppercase
                                text-slate-600
                              "
                            >
                              Título de la cláusula
                            </label>

                            <input
                              type="text"
                              value={
                                clausula
                                  ?.titulo ||
                                ''
                              }
                              onChange={
                                event =>
                                  actualizarClausulaLocal(
                                    clausula.id,
                                    'titulo',
                                    event
                                      .target
                                      .value
                                  )
                              }
                              placeholder="Ej. OBJETO"
                              className="
                                h-9
                                w-full
                                rounded-lg
                                border
                                border-slate-400
                                px-3
                                text-xs
                                font-bold
                                uppercase
                                outline-none
                                focus:border-violet-500
                              "
                            />

                            <label
                              className="
                                mt-3
                                flex
                                cursor-pointer
                                items-center
                                gap-2
                                rounded-lg
                                border
                                border-slate-300
                                bg-slate-50
                                px-3
                                py-2
                                text-xs
                                font-semibold
                                text-slate-700
                              "
                            >
                              <input
                                type="checkbox"
                                checked={
                                  clausula
                                    ?.activo !==
                                  false
                                }
                                onChange={
                                  event =>
                                    actualizarClausulaLocal(
                                      clausula.id,
                                      'activo',
                                      event
                                        .target
                                        .checked
                                    )
                                }
                              />

                              Cláusula activa
                            </label>
                          </div>

                          <div>
                            <label
                              className="
                                mb-1
                                block
                                text-[10px]
                                font-bold
                                uppercase
                                text-slate-600
                              "
                            >
                              Contenido
                            </label>

                            <textarea
                              rows={8}
                              value={
                                clausula
                                  ?.contenido ||
                                ''
                              }
                              onChange={
                                event =>
                                  actualizarClausulaLocal(
                                    clausula.id,
                                    'contenido',
                                    event
                                      .target
                                      .value
                                  )
                              }
                              className="
                                w-full
                                resize-y
                                rounded-lg
                                border
                                border-slate-400
                                px-3
                                py-2
                                text-xs
                                leading-relaxed
                                outline-none
                                focus:border-violet-500
                              "
                            />

                            <div
                              className="
                                mt-3
                                flex
                                justify-end
                              "
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  guardarClausulaContrato(
                                    clausula
                                  )
                                }
                                disabled={
                                  guardandoClausula ===
                                  clausula.id
                                }
                                className="
                                  rounded-lg
                                  bg-slate-800
                                  px-4
                                  py-2
                                  text-xs
                                  font-bold
                                  text-white
                                  hover:bg-slate-900
                                  disabled:opacity-50
                                "
                              >
                                <i className="fas fa-floppy-disk mr-2" />

                                {guardandoClausula ===
                                clausula.id
                                  ? 'Guardando...'
                                  : 'Guardar cláusula'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </fieldset>
        )}

        

        {/* ===============================================
            CONTENIDO DEL CÓDIGO DE CONDUCTA
        =============================================== */}

          {pestanaPrincipal ===
          'CODIGO_CONDUCTA' && (
          <fieldset
            disabled={
              !modoEdicionDocumento
            }
            className="
              overflow-hidden
              rounded-xl
              border
              border-amber-400
              bg-white
              shadow-sm
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                bg-slate-800
                px-4
                py-3
                text-white
                md:flex-row
                md:items-center
                md:justify-between
              "
            >
              <div>
                <h2
                  className="
                    text-sm
                    font-bold
                  "
                >
                  Contenido del Código de Conducta
                </h2>

                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-300
                  "
                >
                  Organice el documento por secciones. Los datos del aspirante,
                  matrícula, categoría, fecha y firma se incorporarán al generarlo
                  desde Inscripciones.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  agregarSeccionCodigoConducta
                }
                disabled={
                  agregandoSeccionCodigo
                }
                className="
                  rounded-lg
                  bg-amber-500
                  px-4
                  py-2
                  text-xs
                  font-black
                  text-slate-900
                  shadow-sm
                  hover:bg-amber-400
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <i className="fas fa-plus mr-2" />

                {agregandoSeccionCodigo
                  ? 'Agregando...'
                  : 'Agregar sección'}
              </button>
            </div>

            {seccionesCodigoConducta.length ===
            0 ? (
              <div
                className="
                  p-8
                  text-center
                  text-sm
                  text-slate-500
                "
              >
                <i className="fas fa-list-check mb-3 block text-3xl text-slate-300" />

                Aún no hay secciones configuradas para este CEA.
              </div>
            ) : (
              <div
                className="
                  space-y-4
                  bg-slate-50
                  p-4
                "
              >
                {seccionesCodigoConducta.map(
                  (
                    seccion,
                    index
                  ) => (
                    <div
                      key={
                        seccion.id
                      }
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
                          flex-col
                          gap-3
                          border-b
                          border-slate-300
                          bg-amber-50
                          px-4
                          py-3
                          md:flex-row
                          md:items-center
                          md:justify-between
                        "
                      >
                        <div>
                          <div
                            className="
                              text-xs
                              font-black
                              uppercase
                              text-amber-900
                            "
                          >
                            {texto(
                              seccion?.titulo
                            ) ||
                              `SECCIÓN ${index + 1}`}
                          </div>

                          <div
                            className="
                              mt-0.5
                              text-[10px]
                              text-slate-500
                            "
                          >
                            Orden {index + 1}
                          </div>
                        </div>

                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-1
                          "
                        >
                          <button
                            type="button"
                            disabled={
                              index ===
                              0
                            }
                            onClick={() =>
                              moverSeccionCodigoConducta(
                                index,
                                -1
                              )
                            }
                            title="Mover arriba"
                            className="
                              flex
                              h-8
                              w-8
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-slate-400
                              bg-white
                              text-slate-700
                              hover:bg-slate-100
                              disabled:opacity-30
                            "
                          >
                            <i className="fas fa-arrow-up" />
                          </button>

                          <button
                            type="button"
                            disabled={
                              index ===
                              seccionesCodigoConducta.length -
                                1
                            }
                            onClick={() =>
                              moverSeccionCodigoConducta(
                                index,
                                1
                              )
                            }
                            title="Mover abajo"
                            className="
                              flex
                              h-8
                              w-8
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-slate-400
                              bg-white
                              text-slate-700
                              hover:bg-slate-100
                              disabled:opacity-30
                            "
                          >
                            <i className="fas fa-arrow-down" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              eliminarSeccionCodigoConducta(
                                seccion
                              )
                            }
                            disabled={
                              eliminandoSeccionCodigo ===
                              seccion.id
                            }
                            title="Eliminar sección"
                            className="
                              flex
                              h-8
                              w-8
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-red-300
                              bg-red-50
                              text-red-700
                              hover:bg-red-100
                              disabled:opacity-50
                            "
                          >
                            {eliminandoSeccionCodigo ===
                            seccion.id ? (
                              <i className="fas fa-spinner fa-spin" />
                            ) : (
                              <i className="fas fa-trash" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div
                        className="
                          grid
                          gap-4
                          p-4
                          lg:grid-cols-[280px_1fr]
                        "
                      >
                        <div>
                          <label
                            className="
                              mb-1
                              block
                              text-[10px]
                              font-bold
                              uppercase
                              text-slate-600
                            "
                          >
                            Título de la sección
                          </label>

                          <input
                            type="text"
                            value={
                              seccion
                                ?.titulo ||
                              ''
                            }
                            onChange={
                              event =>
                                actualizarSeccionCodigoLocal(
                                  seccion.id,
                                  'titulo',
                                  event
                                    .target
                                    .value
                                )
                            }
                            placeholder="Ej. DEBERES DEL ASPIRANTE"
                            className="
                              h-9
                              w-full
                              rounded-lg
                              border
                              border-slate-400
                              px-3
                              text-xs
                              font-bold
                              uppercase
                              outline-none
                              focus:border-amber-500
                            "
                          />

                          <label
                            className="
                              mt-3
                              flex
                              cursor-pointer
                              items-center
                              gap-2
                              rounded-lg
                              border
                              border-slate-300
                              bg-slate-50
                              px-3
                              py-2
                              text-xs
                              font-semibold
                              text-slate-700
                            "
                          >
                            <input
                              type="checkbox"
                              checked={
                                seccion
                                  ?.activo !==
                                false
                              }
                              onChange={
                                event =>
                                  actualizarSeccionCodigoLocal(
                                    seccion.id,
                                    'activo',
                                    event
                                      .target
                                      .checked
                                  )
                              }
                            />

                            Sección activa
                          </label>
                        </div>

                        <div>
                          <label
                            className="
                              mb-1
                              block
                              text-[10px]
                              font-bold
                              uppercase
                              text-slate-600
                            "
                          >
                            Contenido
                          </label>

                          <textarea
                            rows={9}
                            value={
                              seccion
                                ?.contenido ||
                              ''
                            }
                            onChange={
                              event =>
                                actualizarSeccionCodigoLocal(
                                  seccion.id,
                                  'contenido',
                                  event
                                    .target
                                    .value
                                )
                            }
                            className="
                              w-full
                              resize-y
                              rounded-lg
                              border
                              border-slate-400
                              px-3
                              py-2
                              text-xs
                              leading-relaxed
                              outline-none
                              focus:border-amber-500
                            "
                          />

                          <div
                            className="
                              mt-3
                              flex
                              justify-end
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                guardarSeccionCodigoConducta(
                                  seccion
                                )
                              }
                              disabled={
                                guardandoSeccionCodigo ===
                                seccion.id
                              }
                              className="
                                rounded-lg
                                bg-slate-800
                                px-4
                                py-2
                                text-xs
                                font-bold
                                text-white
                                hover:bg-slate-900
                                disabled:opacity-50
                              "
                            >
                              <i className="fas fa-floppy-disk mr-2" />

                              {guardandoSeccionCodigo ===
                              seccion.id
                                ? 'Guardando...'
                                : 'Guardar sección'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </fieldset>
        )}


        {/* ===============================================
            AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS
        =============================================== */}

          {pestanaPrincipal ===
          'AUTORIZACION_DATOS_CEA' && (
          <fieldset
            disabled={
              !modoEdicionDocumento
            }
            className={`
              space-y-4
              ${
                !modoEdicionDocumento
                  ? 'opacity-75'
                  : ''
              }
            `}
          >
            {/* =============================================
                CONFIGURACIÓN GENERAL
            ============================================= */}

            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-teal-400
                bg-white
                shadow-sm
              "
            >
              <div
                className="
                  bg-teal-800
                  px-4
                  py-3
                  text-white
                "
              >
                <h2
                  className="
                    text-sm
                    font-bold
                  "
                >
                  Configuración general de la autorización
                </h2>

                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-teal-100
                  "
                >
                  Configure los canales de atención, el tratamiento de datos
                  sensibles, menores de edad y la declaración final. Las respuestas
                  SÍ / NO pertenecen a cada matrícula y no se definen aquí.
                </p>
              </div>

              <div
                className="
                  grid
                  gap-4
                  p-4
                  lg:grid-cols-2
                "
              >
                <div>
                  <label
                    className="
                      mb-1
                      block
                      text-[10px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Correo para protección de datos
                  </label>

                  <input
                    type="email"
                    value={
                      configuracionAutorizacionDatos
                        .correo_proteccion_datos
                    }
                    onChange={
                      event =>
                        actualizarAutorizacionDatosEstado(
                          'correo_proteccion_datos',
                          event.target.value
                        )
                    }
                    placeholder="correo@cea.com"
                    className="
                      h-9
                      w-full
                      rounded-lg
                      border
                      border-slate-400
                      px-3
                      text-xs
                      outline-none
                      focus:border-teal-500
                    "
                  />
                </div>

                <div>
                  <label
                    className="
                      mb-1
                      block
                      text-[10px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Teléfono de contacto
                  </label>

                  <input
                    type="text"
                    value={
                      configuracionAutorizacionDatos
                        .telefono_contacto
                    }
                    onChange={
                      event =>
                        actualizarAutorizacionDatosEstado(
                          'telefono_contacto',
                          event.target.value
                        )
                    }
                    className="
                      h-9
                      w-full
                      rounded-lg
                      border
                      border-slate-400
                      px-3
                      text-xs
                      outline-none
                      focus:border-teal-500
                    "
                  />
                </div>

                <div>
                  <label
                    className="
                      mb-1
                      block
                      text-[10px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Dirección de contacto
                  </label>

                  <input
                    type="text"
                    value={
                      configuracionAutorizacionDatos
                        .direccion_contacto
                    }
                    onChange={
                      event =>
                        actualizarAutorizacionDatosEstado(
                          'direccion_contacto',
                          event.target.value
                        )
                    }
                    className="
                      h-9
                      w-full
                      rounded-lg
                      border
                      border-slate-400
                      px-3
                      text-xs
                      outline-none
                      focus:border-teal-500
                    "
                  />
                </div>

                <div>
                  <label
                    className="
                      mb-1
                      block
                      text-[10px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Ubicación o medio de la política
                  </label>

                  <input
                    type="text"
                    value={
                      configuracionAutorizacionDatos
                        .medio_politica
                    }
                    onChange={
                      event =>
                        actualizarAutorizacionDatosEstado(
                          'medio_politica',
                          event.target.value
                        )
                    }
                    placeholder="Ej. disponible en recepción o en el sitio web institucional"
                    className="
                      h-9
                      w-full
                      rounded-lg
                      border
                      border-slate-400
                      px-3
                      text-xs
                      outline-none
                      focus:border-teal-500
                    "
                  />
                </div>

                <div
                  className="
                    lg:col-span-2
                  "
                >
                  <label
                    className="
                      mb-1
                      block
                      text-[10px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Datos sensibles y biométricos
                  </label>

                  <textarea
                    rows={7}
                    value={
                      configuracionAutorizacionDatos
                        .texto_datos_biometricos
                    }
                    onChange={
                      event =>
                        actualizarAutorizacionDatosEstado(
                          'texto_datos_biometricos',
                          event.target.value
                        )
                    }
                    className="
                      w-full
                      resize-y
                      rounded-lg
                      border
                      border-slate-400
                      px-3
                      py-2
                      text-xs
                      leading-relaxed
                      outline-none
                      focus:border-teal-500
                    "
                  />
                </div>

                <div
                  className="
                    lg:col-span-2
                  "
                >
                  <label
                    className="
                      mb-1
                      block
                      text-[10px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Tratamiento de datos de menores de edad
                  </label>

                  <textarea
                    rows={6}
                    value={
                      configuracionAutorizacionDatos
                        .texto_menores_edad
                    }
                    onChange={
                      event =>
                        actualizarAutorizacionDatosEstado(
                          'texto_menores_edad',
                          event.target.value
                        )
                    }
                    className="
                      w-full
                      resize-y
                      rounded-lg
                      border
                      border-slate-400
                      px-3
                      py-2
                      text-xs
                      leading-relaxed
                      outline-none
                      focus:border-teal-500
                    "
                  />
                </div>

                <div
                  className="
                    lg:col-span-2
                  "
                >
                  <label
                    className="
                      mb-1
                      block
                      text-[10px]
                      font-bold
                      uppercase
                      text-slate-600
                    "
                  >
                    Declaración y autorización final
                  </label>

                  <textarea
                    rows={7}
                    value={
                      configuracionAutorizacionDatos
                        .texto_declaracion_final
                    }
                    onChange={
                      event =>
                        actualizarAutorizacionDatosEstado(
                          'texto_declaracion_final',
                          event.target.value
                        )
                    }
                    className="
                      w-full
                      resize-y
                      rounded-lg
                      border
                      border-slate-400
                      px-3
                      py-2
                      text-xs
                      leading-relaxed
                      outline-none
                      focus:border-teal-500
                    "
                  />
                </div>

                <div
                  className="
                    lg:col-span-2
                    flex
                    flex-col
                    gap-3
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <label
                    className="
                      flex
                      cursor-pointer
                      items-center
                      gap-2
                      rounded-lg
                      border
                      border-slate-300
                      bg-slate-50
                      px-3
                      py-2
                      text-xs
                      font-semibold
                      text-slate-700
                    "
                  >
                    <input
                      type="checkbox"
                      checked={
                        configuracionAutorizacionDatos
                          .activo !==
                        false
                      }
                      onChange={
                        event =>
                          actualizarAutorizacionDatosEstado(
                            'activo',
                            event.target.checked
                          )
                      }
                    />

                    Configuración activa
                  </label>

                  <button
                    type="button"
                    onClick={
                      guardarConfiguracionAutorizacionDatos
                    }
                    disabled={
                      guardandoConfiguracionAutorizacion
                    }
                    className="
                      rounded-lg
                      bg-teal-700
                      px-4
                      py-2
                      text-xs
                      font-bold
                      text-white
                      hover:bg-teal-800
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    <i className="fas fa-floppy-disk mr-2" />

                    {guardandoConfiguracionAutorizacion
                      ? 'Guardando...'
                      : 'Guardar configuración general'}
                  </button>
                </div>
              </div>
            </div>


            {/* =============================================
                SECCIONES LEGALES
            ============================================= */}

            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-teal-400
                bg-white
                shadow-sm
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  bg-slate-800
                  px-4
                  py-3
                  text-white
                  md:flex-row
                  md:items-center
                  md:justify-between
                "
              >
                <div>
                  <h2
                    className="
                      text-sm
                      font-bold
                    "
                  >
                    Secciones legales del documento
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-[11px]
                      text-slate-300
                    "
                  >
                    Configure el responsable, finalidades necesarias, derechos
                    del titular y demás secciones institucionales.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    agregarSeccionAutorizacionDatos
                  }
                  disabled={
                    agregandoSeccionAutorizacion
                  }
                  className="
                    rounded-lg
                    bg-teal-400
                    px-4
                    py-2
                    text-xs
                    font-black
                    text-slate-900
                    hover:bg-teal-300
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <i className="fas fa-plus mr-2" />

                  {agregandoSeccionAutorizacion
                    ? 'Agregando...'
                    : 'Agregar sección'}
                </button>
              </div>

              {seccionesAutorizacionDatos.length ===
              0 ? (
                <div
                  className="
                    p-8
                    text-center
                    text-sm
                    text-slate-500
                  "
                >
                  Aún no hay secciones configuradas para este documento.
                </div>
              ) : (
                <div
                  className="
                    space-y-4
                    bg-slate-50
                    p-4
                  "
                >
                  {seccionesAutorizacionDatos.map(
                    (
                      seccion,
                      index
                    ) => (
                      <div
                        key={
                          seccion.id
                        }
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
                            flex-col
                            gap-3
                            border-b
                            border-slate-300
                            bg-teal-50
                            px-4
                            py-3
                            md:flex-row
                            md:items-center
                            md:justify-between
                          "
                        >
                          <div>
                            <div
                              className="
                                text-xs
                                font-black
                                uppercase
                                text-teal-900
                              "
                            >
                              {texto(
                                seccion?.titulo
                              ) ||
                                `SECCIÓN ${index + 1}`}
                            </div>

                            <div
                              className="
                                mt-0.5
                                text-[10px]
                                text-slate-500
                              "
                            >
                              Orden {index + 1}
                            </div>
                          </div>

                          <div
                            className="
                              flex
                              items-center
                              gap-1
                            "
                          >
                            <button
                              type="button"
                              disabled={
                                index ===
                                0
                              }
                              onClick={() =>
                                moverSeccionAutorizacionDatos(
                                  index,
                                  -1
                                )
                              }
                              className="
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-slate-400
                                bg-white
                                text-slate-700
                                disabled:opacity-30
                              "
                            >
                              <i className="fas fa-arrow-up" />
                            </button>

                            <button
                              type="button"
                              disabled={
                                index ===
                                seccionesAutorizacionDatos.length -
                                  1
                              }
                              onClick={() =>
                                moverSeccionAutorizacionDatos(
                                  index,
                                  1
                                )
                              }
                              className="
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-slate-400
                                bg-white
                                text-slate-700
                                disabled:opacity-30
                              "
                            >
                              <i className="fas fa-arrow-down" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                eliminarSeccionAutorizacionDatos(
                                  seccion
                                )
                              }
                              disabled={
                                eliminandoSeccionAutorizacion ===
                                seccion.id
                              }
                              className="
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-red-300
                                bg-red-50
                                text-red-700
                                disabled:opacity-50
                              "
                            >
                              {eliminandoSeccionAutorizacion ===
                              seccion.id ? (
                                <i className="fas fa-spinner fa-spin" />
                              ) : (
                                <i className="fas fa-trash" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div
                          className="
                            grid
                            gap-4
                            p-4
                            lg:grid-cols-[280px_1fr]
                          "
                        >
                          <div>
                            <label
                              className="
                                mb-1
                                block
                                text-[10px]
                                font-bold
                                uppercase
                                text-slate-600
                              "
                            >
                              Título de la sección
                            </label>

                            <input
                              type="text"
                              value={
                                seccion?.titulo ||
                                ''
                              }
                              onChange={
                                event =>
                                  actualizarSeccionAutorizacionLocal(
                                    seccion.id,
                                    'titulo',
                                    event.target.value
                                  )
                              }
                              className="
                                h-9
                                w-full
                                rounded-lg
                                border
                                border-slate-400
                                px-3
                                text-xs
                                font-bold
                                uppercase
                                outline-none
                                focus:border-teal-500
                              "
                            />

                            <label
                              className="
                                mt-3
                                flex
                                cursor-pointer
                                items-center
                                gap-2
                                rounded-lg
                                border
                                border-slate-300
                                bg-slate-50
                                px-3
                                py-2
                                text-xs
                                font-semibold
                                text-slate-700
                              "
                            >
                              <input
                                type="checkbox"
                                checked={
                                  seccion?.activo !==
                                  false
                                }
                                onChange={
                                  event =>
                                    actualizarSeccionAutorizacionLocal(
                                      seccion.id,
                                      'activo',
                                      event.target.checked
                                    )
                                }
                              />

                              Sección activa
                            </label>
                          </div>

                          <div>
                            <label
                              className="
                                mb-1
                                block
                                text-[10px]
                                font-bold
                                uppercase
                                text-slate-600
                              "
                            >
                              Contenido
                            </label>

                            <textarea
                              rows={9}
                              value={
                                seccion?.contenido ||
                                ''
                              }
                              onChange={
                                event =>
                                  actualizarSeccionAutorizacionLocal(
                                    seccion.id,
                                    'contenido',
                                    event.target.value
                                  )
                              }
                              className="
                                w-full
                                resize-y
                                rounded-lg
                                border
                                border-slate-400
                                px-3
                                py-2
                                text-xs
                                leading-relaxed
                                outline-none
                                focus:border-teal-500
                              "
                            />

                            <div
                              className="
                                mt-3
                                flex
                                justify-end
                              "
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  guardarSeccionAutorizacionDatos(
                                    seccion
                                  )
                                }
                                disabled={
                                  guardandoSeccionAutorizacion ===
                                  seccion.id
                                }
                                className="
                                  rounded-lg
                                  bg-slate-800
                                  px-4
                                  py-2
                                  text-xs
                                  font-bold
                                  text-white
                                  hover:bg-slate-900
                                  disabled:opacity-50
                                "
                              >
                                <i className="fas fa-floppy-disk mr-2" />

                                {guardandoSeccionAutorizacion ===
                                seccion.id
                                  ? 'Guardando...'
                                  : 'Guardar sección'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>


            {/* =============================================
                FINALIDADES CON RESPUESTA SÍ / NO
            ============================================= */}

            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-teal-400
                bg-white
                shadow-sm
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  bg-slate-800
                  px-4
                  py-3
                  text-white
                  md:flex-row
                  md:items-center
                  md:justify-between
                "
              >
                <div>
                  <h2
                    className="
                      text-sm
                      font-bold
                    "
                  >
                    Finalidades con autorización individual
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-[11px]
                      text-slate-300
                    "
                  >
                    Estas finalidades se mostrarán al aspirante con respuesta SÍ / NO.
                    La elección se guardará posteriormente por matrícula.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    agregarFinalidadAutorizacionDatos
                  }
                  disabled={
                    agregandoFinalidadAutorizacion
                  }
                  className="
                    rounded-lg
                    bg-teal-400
                    px-4
                    py-2
                    text-xs
                    font-black
                    text-slate-900
                    hover:bg-teal-300
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <i className="fas fa-plus mr-2" />

                  {agregandoFinalidadAutorizacion
                    ? 'Agregando...'
                    : 'Agregar finalidad'}
                </button>
              </div>

              {finalidadesAutorizacionDatos.length ===
              0 ? (
                <div
                  className="
                    p-8
                    text-center
                    text-sm
                    text-slate-500
                  "
                >
                  Aún no hay finalidades configuradas.
                </div>
              ) : (
                <div
                  className="
                    space-y-3
                    bg-slate-50
                    p-4
                  "
                >
                  {finalidadesAutorizacionDatos.map(
                    (
                      finalidad,
                      index
                    ) => (
                      <div
                        key={
                          finalidad.id
                        }
                        className="
                          rounded-xl
                          border
                          border-slate-400
                          bg-white
                          p-4
                          shadow-sm
                        "
                      >
                        <div
                          className="
                            mb-3
                            flex
                            flex-col
                            gap-3
                            md:flex-row
                            md:items-center
                            md:justify-between
                          "
                        >
                          <div
                            className="
                              text-xs
                              font-black
                              text-teal-900
                            "
                          >
                            Finalidad {index + 1}
                          </div>

                          <div
                            className="
                              flex
                              items-center
                              gap-1
                            "
                          >
                            <button
                              type="button"
                              disabled={
                                index ===
                                0
                              }
                              onClick={() =>
                                moverFinalidadAutorizacionDatos(
                                  index,
                                  -1
                                )
                              }
                              className="
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-slate-400
                                bg-white
                                text-slate-700
                                disabled:opacity-30
                              "
                            >
                              <i className="fas fa-arrow-up" />
                            </button>

                            <button
                              type="button"
                              disabled={
                                index ===
                                finalidadesAutorizacionDatos.length -
                                  1
                              }
                              onClick={() =>
                                moverFinalidadAutorizacionDatos(
                                  index,
                                  1
                                )
                              }
                              className="
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-slate-400
                                bg-white
                                text-slate-700
                                disabled:opacity-30
                              "
                            >
                              <i className="fas fa-arrow-down" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                eliminarFinalidadAutorizacionDatos(
                                  finalidad
                                )
                              }
                              disabled={
                                eliminandoFinalidadAutorizacion ===
                                finalidad.id
                              }
                              className="
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-red-300
                                bg-red-50
                                text-red-700
                                disabled:opacity-50
                              "
                            >
                              {eliminandoFinalidadAutorizacion ===
                              finalidad.id ? (
                                <i className="fas fa-spinner fa-spin" />
                              ) : (
                                <i className="fas fa-trash" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div
                          className="
                            grid
                            gap-3
                            lg:grid-cols-[220px_1fr]
                          "
                        >
                          <div>
                            <label
                              className="
                                mb-1
                                block
                                text-[10px]
                                font-bold
                                uppercase
                                text-slate-600
                              "
                            >
                              Código interno
                            </label>

                            <input
                              type="text"
                              value={
                                finalidad?.codigo ||
                                ''
                              }
                              onChange={
                                event =>
                                  actualizarFinalidadAutorizacionLocal(
                                    finalidad.id,
                                    'codigo',
                                    event.target.value.toUpperCase()
                                  )
                              }
                              className="
                                h-9
                                w-full
                                rounded-lg
                                border
                                border-slate-400
                                px-3
                                text-xs
                                font-bold
                                outline-none
                                focus:border-teal-500
                              "
                            />
                          </div>

                          <div>
                            <label
                              className="
                                mb-1
                                block
                                text-[10px]
                                font-bold
                                uppercase
                                text-slate-600
                              "
                            >
                              Descripción que verá el titular
                            </label>

                            <textarea
                              rows={3}
                              value={
                                finalidad?.descripcion ||
                                ''
                              }
                              onChange={
                                event =>
                                  actualizarFinalidadAutorizacionLocal(
                                    finalidad.id,
                                    'descripcion',
                                    event.target.value
                                  )
                              }
                              className="
                                w-full
                                resize-y
                                rounded-lg
                                border
                                border-slate-400
                                px-3
                                py-2
                                text-xs
                                leading-relaxed
                                outline-none
                                focus:border-teal-500
                              "
                            />
                          </div>
                        </div>

                        <div
                          className="
                            mt-3
                            flex
                            flex-col
                            gap-2
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                          "
                        >
                          <div
                            className="
                              flex
                              flex-wrap
                              gap-2
                            "
                          >
                            <label
                              className="
                                flex
                                cursor-pointer
                                items-center
                                gap-2
                                rounded-lg
                                border
                                border-slate-300
                                bg-slate-50
                                px-3
                                py-2
                                text-xs
                                font-semibold
                                text-slate-700
                              "
                            >
                              <input
                                type="checkbox"
                                checked={
                                  finalidad?.activo !==
                                  false
                                }
                                onChange={
                                  event =>
                                    actualizarFinalidadAutorizacionLocal(
                                      finalidad.id,
                                      'activo',
                                      event.target.checked
                                    )
                                }
                              />

                              Activa
                            </label>

                            <label
                              className="
                                flex
                                cursor-pointer
                                items-center
                                gap-2
                                rounded-lg
                                border
                                border-slate-300
                                bg-slate-50
                                px-3
                                py-2
                                text-xs
                                font-semibold
                                text-slate-700
                              "
                            >
                              <input
                                type="checkbox"
                                checked={
                                  finalidad?.requiere_respuesta !==
                                  false
                                }
                                onChange={
                                  event =>
                                    actualizarFinalidadAutorizacionLocal(
                                      finalidad.id,
                                      'requiere_respuesta',
                                      event.target.checked
                                    )
                                }
                              />

                              Requiere SÍ / NO
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              guardarFinalidadAutorizacionDatos(
                                finalidad
                              )
                            }
                            disabled={
                              guardandoFinalidadAutorizacion ===
                              finalidad.id
                            }
                            className="
                              rounded-lg
                              bg-slate-800
                              px-4
                              py-2
                              text-xs
                              font-bold
                              text-white
                              hover:bg-slate-900
                              disabled:opacity-50
                            "
                          >
                            <i className="fas fa-floppy-disk mr-2" />

                            {guardandoFinalidadAutorizacion ===
                            finalidad.id
                              ? 'Guardando...'
                              : 'Guardar finalidad'}
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </fieldset>
        )}


        {/* ===============================================
            DATOS DE ENCABEZADO
        =============================================== */}

        {pestanaPrincipal ===
          'DATOS_ENCABEZADO' &&
          encabezado && (
          <div
            className="
              grid
              gap-4
              xl:grid-cols-[minmax(0,1fr)_440px]
            "
          >
            {/* =============================================
                LISTADO DE CELDAS
            ============================================= */}

            <div
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
                <h2
                  className="
                    text-sm
                    font-bold
                  "
                >
                  Datos del encabezado
                </h2>

                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-300
                  "
                >
                  Defina qué información se mostrará en cada celda del diseño.
                  Una misma celda puede contener varios datos.
                </p>
              </div>

              <div
                className="
                  border-b
                  border-slate-300
                  bg-slate-50
                  px-4
                  py-3
                  text-[11px]
                  text-slate-600
                "
              >
                La estructura, tamaño, combinación y bordes de las celdas se
                administran en la pestaña
                <strong className="ml-1">
                  Diseñador de Encabezado
                </strong>.
              </div>

              <div
                className="
                  overflow-x-auto
                "
              >
                <table
                  className="
                    w-full
                    min-w-[760px]
                    border-collapse
                    [&_th]:text-center
                    [&_td]:text-center
                    border border-slate-400
                    [&_th]:border [&_th]:border-slate-400
                    [&_td]:border [&_td]:border-slate-300
                    text-center
                  "
                >
                  <thead>
                    <tr
                      className="
                        border-b
                        border-slate-400
                        bg-[#CEFAFE]
                        text-[10px]
                        font-black
                        uppercase
                        text-[#194567]
                      "
                    >
                      <th className="px-3 py-2">
                        Celda
                      </th>

                      <th className="px-3 py-2">
                        Ubicación
                      </th>

                      <th className="px-3 py-2">
                        Datos configurados
                      </th>

                      <th
                        className="
                          px-3
                          py-2
                          text-center
                        "
                      >
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {[...
                      encabezado
                        .estructura
                        .celdas,
                    ]
                      .sort(
                        (
                          a,
                          b
                        ) =>
                          Number(
                            a.fila
                          ) -
                            Number(
                              b.fila
                            ) ||
                          Number(
                            a.columna
                          ) -
                            Number(
                              b.columna
                            )
                      )
                      .map(
                        (
                          celda,
                          index
                        ) => {
                          const seleccionada =
                            celda.id ===
                            celdaSeleccionadaId

                          const elementosUtiles =
                            Array.isArray(
                              celda?.elementos
                            )
                              ? celda.elementos.filter(
                                  elemento =>
                                    elemento
                                      ?.tipo !==
                                    'VACIO'
                                )
                              : []

                          return (
                            <tr
                              key={
                                celda.id
                              }
                              className={`
                                border-b
                                border-slate-200
                                text-xs
                                ${
                                  seleccionada
                                    ? 'bg-blue-50'
                                    : 'bg-white hover:bg-slate-50'
                                }
                              `}
                            >
                              <td
                                className="
                                  px-3
                                  py-3
                                  align-middle
                                "
                              >
                                <div
                                  className="
                                    font-black
                                    text-slate-800
                                  "
                                >
                                  Celda {index + 1}
                                </div>

                                <div
                                  className="
                                    mt-0.5
                                    text-[9px]
                                    font-mono
                                    text-slate-400
                                  "
                                >
                                  {celda.id}
                                </div>
                              </td>

                              <td
                                className="
                                  px-3
                                  py-3
                                  align-middle
                                  text-slate-600
                                "
                              >
                                <div>
                                  Fila {celda.fila} · Columna {celda.columna}
                                </div>

                                {(Number(
                                  celda.rowSpan
                                ) >
                                  1 ||
                                  Number(
                                    celda.colSpan
                                  ) >
                                    1) && (
                                  <div
                                    className="
                                      mt-1
                                      text-[10px]
                                      text-slate-500
                                    "
                                  >
                                    Combinada:
                                    {' '}
                                    {celda.rowSpan} fila(s) × {celda.colSpan} columna(s)
                                  </div>
                                )}
                              </td>

                              <td
                                className="
                                  px-3
                                  py-3
                                  align-middle
                                "
                              >
                                {elementosUtiles.length >
                                0 ? (
                                  <div
                                    className="
                                      flex
                                      flex-wrap
                                      justify-center
                                      gap-1.5
                                    "
                                  >
                                    {elementosUtiles.map(
                                      (
                                        elemento,
                                        elementoIndex
                                      ) => {
                                        const nombreTipo =
                                          TIPOS_ELEMENTO.find(
                                            tipo =>
                                              tipo.value ===
                                              elemento.tipo
                                          )
                                            ?.label ||
                                          elemento.tipo

                                        return (
                                          <span
                                            key={
                                              `${celda.id}-resumen-${elementoIndex}`
                                            }
                                            className="
                                              rounded-full
                                              border
                                              border-slate-300
                                              bg-slate-100
                                              px-2
                                              py-1
                                              text-[9px]
                                              font-bold
                                              text-slate-700
                                            "
                                          >
                                            {elemento.tipo ===
                                            'TEXTO'
                                              ? `Texto: ${
                                                  texto(
                                                    elemento
                                                      ?.valor
                                                  ) ||
                                                  'Sin texto'
                                                }`
                                              : nombreTipo}
                                          </span>
                                        )
                                      }
                                    )}
                                  </div>
                                ) : (
                                  <span
                                    className="
                                      text-[10px]
                                      italic
                                      text-slate-400
                                    "
                                  >
                                    Sin datos configurados
                                  </span>
                                )}
                              </td>

                              <td
                                className="
                                  px-3
                                  py-3
                                  text-center
                                  align-middle
                                "
                              >
                                <button
                                  type="button"
                                  onClick={() => setCeldaSeleccionadaId(celda.id)}
                                  className={`inline-flex w-36 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold text-white shadow-sm ${seleccionada ? 'border-[#198754] bg-[#198754]' : 'border-[#3B617D] bg-[#3B617D]'}`}
                                >
                                  <i className={`fas ${seleccionada ? 'fa-check' : 'fa-pen-to-square'}`} />
                                  {seleccionada ? 'Seleccionada' : 'Configurar'}
                                </button>
                              </td>
                            </tr>
                          )
                        }
                      )}
                  </tbody>
                </table>
              </div>
            </div>


            {/* =============================================
                PANEL DE DATOS DE LA CELDA
            ============================================= */}

            <div>
              <div
                className="
                  sticky
                  top-4
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
                    bg-blue-900
                    px-4
                    py-3
                    text-white
                  "
                >
                  <h2
                    className="
                      text-sm
                      font-bold
                    "
                  >
                    Contenido de la celda
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-[11px]
                      text-blue-100
                    "
                  >
                    {celdaSeleccionada
                      ? `Fila ${celdaSeleccionada.fila} · Columna ${celdaSeleccionada.columna}`
                      : 'Seleccione una celda del listado'}
                  </p>
                </div>

                {celdaSeleccionada
                  ? (
                    <div
                      className="
                        max-h-[calc(100vh-150px)]
                        space-y-4
                        overflow-y-auto
                        p-4
                      "
                    >
                      <div
                        className="
                          rounded-lg
                          border
                          border-blue-200
                          bg-blue-50
                          p-3
                          text-[10px]
                          leading-relaxed
                          text-blue-900
                        "
                      >
                        Puede agregar varios datos dentro de la misma celda.
                        Se imprimirán en el mismo orden en que aparecen aquí.
                      </div>

                      <div
                        className="
                          flex
                          gap-2
                        "
                      >
                        <select
                          value={
                            elementoNuevo
                          }
                          onChange={
                            event =>
                              setElementoNuevo(
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
                            border-slate-300
                            px-2
                            text-xs
                          "
                        >
                          {TIPOS_ELEMENTO.map(
                            tipo => (
                              <option
                                key={
                                  tipo.value
                                }
                                value={
                                  tipo.value
                                }
                              >
                                {tipo.label}
                              </option>
                            )
                          )}
                        </select>

                        <BotonAgregar
                          type="button"
                          onClick={
                            agregarElemento
                          }
                          className="shrink-0"
                        >
                          <i className="fas fa-plus mr-1" />

                          Agregar
                        </BotonAgregar>
                      </div>

                      <div
                        className="
                          space-y-3
                        "
                      >
                        {celdaSeleccionada
                          .elementos
                          .map(
                            (
                              elemento,
                              index
                            ) => (
                              <div
                                key={
                                  `${celdaSeleccionada.id}-dato-${index}`
                                }
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
                                    flex
                                    items-center
                                    justify-between
                                    gap-2
                                  "
                                >
                                  <div>
                                    <span
                                      className="
                                        text-[10px]
                                        font-black
                                        uppercase
                                        text-slate-700
                                      "
                                    >
                                      Dato {index + 1}
                                    </span>

                                    <div
                                      className="
                                        mt-0.5
                                        text-[10px]
                                        font-bold
                                        text-blue-800
                                      "
                                    >
                                      {
                                        TIPOS_ELEMENTO.find(
                                          tipo =>
                                            tipo.value ===
                                            elemento.tipo
                                        )
                                          ?.label ||
                                        elemento.tipo
                                      }
                                    </div>
                                  </div>

                                  <BotonEliminar
                                    type="button"
                                    onClick={() =>
                                      eliminarElemento(
                                        index
                                      )
                                    }
                                    className="px-2 py-1"
                                    title="Eliminar dato"
                                  >
                                    <i className="fas fa-trash" />
                                  </BotonEliminar>
                                </div>

                                {elemento.tipo ===
                                  'TEXTO' && (
                                  <div
                                    className="
                                      mb-2
                                    "
                                  >
                                    <label
                                      className="
                                        mb-1
                                        block
                                        text-[10px]
                                        font-bold
                                        text-slate-500
                                      "
                                    >
                                      Texto fijo
                                    </label>

                                    <input
                                      type="text"
                                      value={
                                        elemento
                                          .valor ||
                                        ''
                                      }
                                      onChange={
                                        event =>
                                          actualizarElemento(
                                            index,
                                            'valor',
                                            event
                                              .target
                                              .value
                                          )
                                      }
                                      placeholder="Ej. SGI"
                                      className="
                                        h-8
                                        w-full
                                        rounded-lg
                                        border
                                        border-slate-300
                                        px-2
                                        text-xs
                                      "
                                    />
                                  </div>
                                )}

                                {![
                                  'LOGO',
                                  'NOMBRE_DOCUMENTO',
                                  'TEXTO',
                                  'VACIO',
                                ].includes(
                                  elemento.tipo
                                ) && (
                                  <div
                                    className="
                                      mb-2
                                    "
                                  >
                                    <label
                                      className="
                                        mb-1
                                        block
                                        text-[10px]
                                        font-bold
                                        text-slate-500
                                      "
                                    >
                                      Prefijo
                                    </label>

                                    <input
                                      type="text"
                                      value={
                                        elemento
                                          .prefijo ||
                                        ''
                                      }
                                      onChange={
                                        event =>
                                          actualizarElemento(
                                            index,
                                            'prefijo',
                                            event
                                              .target
                                              .value
                                          )
                                      }
                                      placeholder="Ej. Versión: "
                                      className="
                                        h-8
                                        w-full
                                        rounded-lg
                                        border
                                        border-slate-300
                                        px-2
                                        text-xs
                                      "
                                    />
                                  </div>
                                )}

                                <div
                                  className="
                                    grid
                                    grid-cols-2
                                    gap-2
                                  "
                                >
                                  <div>
                                    <label
                                      className="
                                        mb-1
                                        block
                                        text-[10px]
                                        font-bold
                                        text-slate-500
                                      "
                                    >
                                      Tamaño fuente
                                    </label>

                                    <input
                                      type="number"
                                      min="6"
                                      max="30"
                                      value={
                                        elemento
                                          .tamano_fuente ||
                                        9
                                      }
                                      onChange={
                                        event =>
                                          actualizarElemento(
                                            index,
                                            'tamano_fuente',
                                            Number(
                                              event
                                                .target
                                                .value
                                            )
                                          )
                                      }
                                      className="
                                        h-8
                                        w-full
                                        rounded-lg
                                        border
                                        border-slate-300
                                        px-2
                                        text-xs
                                      "
                                    />
                                  </div>

                                  <label
                                    className="
                                      mt-[18px]
                                      flex
                                      h-8
                                      cursor-pointer
                                      items-center
                                      gap-2
                                      rounded-lg
                                      border
                                      border-slate-300
                                      bg-white
                                      px-2
                                      text-xs
                                      font-semibold
                                    "
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        elemento
                                          .negrita ===
                                        true
                                      }
                                      onChange={
                                        event =>
                                          actualizarElemento(
                                            index,
                                            'negrita',
                                            event
                                              .target
                                              .checked
                                          )
                                      }
                                    />

                                    Negrita
                                  </label>
                                </div>
                              </div>
                            )
                          )}
                      </div>

                      <div
                        className="
                          border-t
                          border-slate-200
                          pt-4
                        "
                      >
                        <BotonGuardar
                          type="button"
                          disabled={
                            guardandoEncabezado
                          }
                          onClick={
                            guardarEncabezado
                          }
                          className="w-full"
                        >
                          <i className="fas fa-floppy-disk mr-2" />

                          {guardandoEncabezado
                            ? 'Guardando...'
                            : 'Guardar datos del encabezado'}
                        </BotonGuardar>
                      </div>
                    </div>
                  )
                  : (
                    <div
                      className="
                        p-6
                        text-center
                        text-sm
                        text-slate-500
                      "
                    >
                      Seleccione una celda del listado.
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}


        {/* ===============================================
            DISEÑADOR
        =============================================== */}

        {pestanaPrincipal ===
          'ENCABEZADO' &&
          encabezado && (
          <div
            className="
              grid
              gap-4
              xl:grid-cols-[minmax(0,1.4fr)_420px]
            "
          >
            {/* ===============================================
                ÁREA IZQUIERDA
            =============================================== */}

            <div
              className="
                space-y-4
              "
            >
              {/* ===============================================
                  ESTRUCTURA GENERAL
              =============================================== */}

              <div
                className="
                  overflow-hidden
                  rounded-xl
                  border
                  border-gray-300
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
                  <h2
                    className="
                      text-sm
                      font-bold
                    "
                  >
                    Diseñador del encabezado
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-[11px]
                      text-slate-300
                    "
                  >
                    Defina la estructura visual del encabezado: filas, columnas,
                    combinaciones, dimensiones, bordes y alineaciones.
                  </p>
                </div>

                <div
                  className="
                    grid
                    gap-4
                    p-4
                    lg:grid-cols-2
                  "
                >
                  <div>
                    <label
                      className="
                        mb-1
                        block
                        text-[11px]
                        font-bold
                        uppercase
                        text-slate-600
                      "
                    >
                      Filas
                    </label>

                    <select
                      value={
                        encabezado.filas
                      }
                      onChange={
                        (
                          event
                        ) =>
                          cambiarDimension(
                            'filas',
                            event
                              .target
                              .value
                          )
                      }
                      className="
                        h-9
                        w-full
                        rounded-lg
                        border
                        border-slate-300
                        px-3
                        text-sm
                      "
                    >
                      {[
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                      ].map(
                        (
                          numero
                        ) => (
                          <option
                            key={
                              numero
                            }
                            value={
                              numero
                            }
                          >
                            {numero}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      className="
                        mb-1
                        block
                        text-[11px]
                        font-bold
                        uppercase
                        text-slate-600
                      "
                    >
                      Columnas
                    </label>

                    <select
                      value={
                        encabezado.columnas
                      }
                      onChange={
                        (
                          event
                        ) =>
                          cambiarDimension(
                            'columnas',
                            event
                              .target
                              .value
                          )
                      }
                      className="
                        h-9
                        w-full
                        rounded-lg
                        border
                        border-slate-300
                        px-3
                        text-sm
                      "
                    >
                      {[
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                      ].map(
                        (
                          numero
                        ) => (
                          <option
                            key={
                              numero
                            }
                            value={
                              numero
                            }
                          >
                            {numero}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>


                {/* ===============================================
                    CUADRÍCULA EDITABLE
                =============================================== */}

                <div
                  className="
                    border-t
                    border-slate-200
                    p-4
                  "
                >
                  <div
                    className="
                      mb-3
                      flex
                      flex-wrap
                      gap-2
                    "
                  >
                    <button
                      type="button"
                      onClick={
                        unirDerecha
                      }
                      className="
                        rounded-lg
                        border
                        border-slate-300
                        bg-slate-50
                        px-3
                        py-2
                        text-xs
                        font-bold
                        text-slate-700
                        hover:bg-slate-200
                      "
                    >
                      <i className="fas fa-arrows-left-right mr-2" />

                      Unir derecha
                    </button>

                    <button
                      type="button"
                      onClick={
                        unirAbajo
                      }
                      className="
                        rounded-lg
                        border
                        border-slate-300
                        bg-slate-50
                        px-3
                        py-2
                        text-xs
                        font-bold
                        text-slate-700
                        hover:bg-slate-200
                      "
                    >
                      <i className="fas fa-arrows-up-down mr-2" />

                      Unir abajo
                    </button>

                    <button
                      type="button"
                      onClick={
                        dividirCelda
                      }
                      className="
                        rounded-lg
                        border
                        border-amber-300
                        bg-amber-50
                        px-3
                        py-2
                        text-xs
                        font-bold
                        text-amber-800
                        hover:bg-amber-100
                      "
                    >
                      <i className="fas fa-border-all mr-2" />

                      Dividir celda
                    </button>
                  </div>

                  <div
                    className="
                      overflow-x-auto
                      rounded-lg
                      border
                      border-slate-300
                      bg-slate-100
                      p-4
                    "
                  >
                    <div
                      style={{
                        display:
                          'grid',

                        gridTemplateColumns:
                          encabezado
                            .estructura
                            .columnas
                            .map(
                              (
                                columna
                              ) =>
                                `${columna.ancho}fr`
                            )
                            .join(
                              ' '
                            ),

                        gridTemplateRows:
                          encabezado
                            .estructura
                            .filas
                            .map(
                              (
                                fila
                              ) =>
                                `${Math.max(
                                  50,
                                  fila.altura *
                                    5
                                )}px`
                            )
                            .join(
                              ' '
                            ),
                      }}
                      className="
                        min-w-[700px]
                        bg-white
                      "
                    >
                      {encabezado
                        .estructura
                        .celdas
                        .map(
                          (
                            celda
                          ) =>
                            renderCelda(
                              celda,
                              false
                            )
                        )}
                    </div>
                  </div>
                </div>


                {/* ===============================================
                    DIMENSIONES
                =============================================== */}

                <div
                  className="
                    grid
                    gap-4
                    border-t
                    border-slate-200
                    p-4
                    lg:grid-cols-2
                  "
                >
                  <div>
                    <h3
                      className="
                        mb-2
                        text-xs
                        font-black
                        uppercase
                        text-slate-700
                      "
                    >
                      Ancho de columnas
                    </h3>

                    <div
                      className="
                        space-y-2
                      "
                    >
                      {encabezado
                        .estructura
                        .columnas
                        .map(
                          (
                            columna,
                            index
                          ) => (
                            <div
                              key={
                                columna.id
                              }
                              className="
                                grid
                                grid-cols-[90px_1fr]
                                items-center
                                gap-2
                              "
                            >
                              <span
                                className="
                                  text-xs
                                  font-semibold
                                  text-slate-600
                                "
                              >
                                Columna {index + 1}
                              </span>

                              <input
                                type="number"
                                min="5"
                                max="100"
                                step="1"
                                value={
                                  columna.ancho
                                }
                                onChange={
                                  (
                                    event
                                  ) =>
                                    cambiarAnchoColumna(
                                      index,
                                      event
                                        .target
                                        .value
                                    )
                                }
                                className="
                                  h-8
                                  rounded-lg
                                  border
                                  border-slate-300
                                  px-2
                                  text-xs
                                "
                              />
                            </div>
                          )
                        )}
                    </div>
                  </div>

                  <div>
                    <h3
                      className="
                        mb-2
                        text-xs
                        font-black
                        uppercase
                        text-slate-700
                      "
                    >
                      Altura de filas
                    </h3>

                    <div
                      className="
                        space-y-2
                      "
                    >
                      {encabezado
                        .estructura
                        .filas
                        .map(
                          (
                            fila,
                            index
                          ) => (
                            <div
                              key={
                                fila.id
                              }
                              className="
                                grid
                                grid-cols-[90px_1fr]
                                items-center
                                gap-2
                              "
                            >
                              <span
                                className="
                                  text-xs
                                  font-semibold
                                  text-slate-600
                                "
                              >
                                Fila {index + 1}
                              </span>

                              <input
                                type="number"
                                min="4"
                                max="80"
                                step="1"
                                value={
                                  fila.altura
                                }
                                onChange={
                                  (
                                    event
                                  ) =>
                                    cambiarAlturaFila(
                                      index,
                                      event
                                        .target
                                        .value
                                    )
                                }
                                className="
                                  h-8
                                  rounded-lg
                                  border
                                  border-slate-300
                                  px-2
                                  text-xs
                                "
                              />
                            </div>
                          )
                        )}
                    </div>
                  </div>
                </div>
              </div>


              {/* ===============================================
                  VISTA PREVIA
              =============================================== */}

              <div
                className="
                  overflow-hidden
                  rounded-xl
                  border
                  border-gray-300
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
                  <h2
                    className="
                      text-sm
                      font-bold
                    "
                  >
                    Vista previa
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-[11px]
                      text-slate-300
                    "
                  >
                    Vista genérica del encabezado compartido. Los valores reales
                    se tomarán del documento que se genere y la paginación se calculará automáticamente.
                  </p>
                </div>

                <div
                  className="
                    overflow-x-auto
                    p-6
                  "
                >
                  <div
                    className="
                      mx-auto
                      min-w-[700px]
                      max-w-[1000px]
                    "
                  >
                    <div
                      style={{
                        display:
                          'grid',

                        gridTemplateColumns:
                          encabezado
                            .estructura
                            .columnas
                            .map(
                              (
                                columna
                              ) =>
                                `${columna.ancho}fr`
                            )
                            .join(
                              ' '
                            ),

                        gridTemplateRows:
                          encabezado
                            .estructura
                            .filas
                            .map(
                              (
                                fila
                              ) =>
                                `${Math.max(
                                  45,
                                  fila.altura *
                                    4
                                )}px`
                            )
                            .join(
                              ' '
                            ),
                      }}
                      className="
                        bg-white
                      "
                    >
                      {encabezado
                        .estructura
                        .celdas
                        .map(
                          (
                            celda
                          ) =>
                            renderCelda(
                              celda,
                              true
                            )
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* ===============================================
                PANEL DE CELDA
            =============================================== */}

            <div>
              <div
                className="
                  sticky
                  top-4
                  overflow-hidden
                  rounded-xl
                  border
                  border-gray-300
                  bg-white
                  shadow-sm
                "
              >
                <div
                  className="
                    bg-[var(--primary)]
                    px-4
                    py-3
                    text-white
                  "
                >
                  <h2
                    className="
                      text-sm
                      font-bold
                    "
                  >
                    Diseño de la celda
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-[11px]
                      opacity-80
                    "
                  >
                    {celdaSeleccionada
                      ? `Fila ${celdaSeleccionada.fila} · Columna ${celdaSeleccionada.columna}`
                      : 'Seleccione una celda'}
                  </p>
                </div>

                {celdaSeleccionada
                  ? (
                    <div
                      className="
                        max-h-[calc(100vh-150px)]
                        space-y-4
                        overflow-y-auto
                        p-4
                      "
                    >
                      {/* ===============================================
                          ALINEACIÓN
                      =============================================== */}

                      <div
                        className="
                          grid
                          grid-cols-2
                          gap-2
                        "
                      >
                        <div>
                          <label
                            className="
                              mb-1
                              block
                              text-[10px]
                              font-bold
                              uppercase
                              text-slate-600
                            "
                          >
                            Horizontal
                          </label>

                          <select
                            value={
                              celdaSeleccionada
                                .alineacion_horizontal
                            }
                            onChange={
                              (
                                event
                              ) =>
                                actualizarCeldaSeleccionada(
                                  {
                                    alineacion_horizontal:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                            }
                            className="
                              h-8
                              w-full
                              rounded-lg
                              border
                              border-slate-300
                              px-2
                              text-xs
                            "
                          >
                            <option value="left">
                              Izquierda
                            </option>

                            <option value="center">
                              Centro
                            </option>

                            <option value="right">
                              Derecha
                            </option>
                          </select>
                        </div>

                        <div>
                          <label
                            className="
                              mb-1
                              block
                              text-[10px]
                              font-bold
                              uppercase
                              text-slate-600
                            "
                          >
                            Vertical
                          </label>

                          <select
                            value={
                              celdaSeleccionada
                                .alineacion_vertical
                            }
                            onChange={
                              (
                                event
                              ) =>
                                actualizarCeldaSeleccionada(
                                  {
                                    alineacion_vertical:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                            }
                            className="
                              h-8
                              w-full
                              rounded-lg
                              border
                              border-slate-300
                              px-2
                              text-xs
                            "
                          >
                            <option value="top">
                              Arriba
                            </option>

                            <option value="center">
                              Centro
                            </option>

                            <option value="bottom">
                              Abajo
                            </option>
                          </select>
                        </div>
                      </div>


                      {/* ===============================================
                          BORDES
                      =============================================== */}

                      <div
                        className="
                          rounded-lg
                          border
                          border-slate-200
                          bg-slate-50
                          p-3
                        "
                      >
                        <p
                          className="
                            mb-2
                            text-[10px]
                            font-black
                            uppercase
                            text-slate-700
                          "
                        >
                          Bordes de la celda
                        </p>

                        <div
                          className="
                            grid
                            grid-cols-2
                            gap-2
                          "
                        >
                          {[
                            [
                              'borde_superior',
                              'Superior',
                            ],
                            [
                              'borde_inferior',
                              'Inferior',
                            ],
                            [
                              'borde_izquierdo',
                              'Izquierdo',
                            ],
                            [
                              'borde_derecho',
                              'Derecho',
                            ],
                          ].map(
                            (
                              [
                                campo,
                                label,
                              ]
                            ) => (
                              <label
                                key={
                                  campo
                                }
                                className="
                                  flex
                                  cursor-pointer
                                  items-center
                                  gap-2
                                  rounded-lg
                                  border
                                  border-slate-200
                                  bg-white
                                  px-2
                                  py-2
                                  text-xs
                                  font-semibold
                                  text-slate-700
                                "
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    celdaSeleccionada[
                                      campo
                                    ] !==
                                    false
                                  }
                                  onChange={
                                    (
                                      event
                                    ) =>
                                      actualizarCeldaSeleccionada(
                                        {
                                          [
                                            campo
                                          ]:
                                            event
                                              .target
                                              .checked,
                                        }
                                      )
                                  }
                                />

                                {label}
                              </label>
                            )
                          )}
                        </div>
                      </div>


                      {/* ===============================================
                          GUARDAR
                      =============================================== */}

                      <div
                        className="
                          border-t
                          border-slate-200
                          pt-4
                        "
                      >
                        <button
                          type="button"
                          disabled={
                            guardandoEncabezado
                          }
                          onClick={
                            guardarEncabezado
                          }
                          className="
                            w-full
                            rounded-lg
                            bg-[var(--primary)]
                            px-4
                            py-2.5
                            text-xs
                            font-bold
                            text-white
                            transition
                            hover:bg-[var(--primary-dark)]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          <i className="fas fa-floppy-disk mr-2" />

                          {guardandoEncabezado
                            ? 'Guardando...'
                            : 'Guardar encabezado'}
                        </button>
                      </div>
                    </div>
                  )
                  : (
                    <div
                      className="
                        p-6
                        text-center
                        text-sm
                        text-slate-500
                      "
                    >
                      Seleccione una celda de la cuadrícula.
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  )
}