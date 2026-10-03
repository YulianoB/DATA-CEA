// app/admin/inscripciones/documentos/page.jsx

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

import {
  FolderOpen,
} from 'lucide-react'

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'

import {
  ESTILO_SECCIONES,
  ESTILO_ENCABEZADO_TABLA,
   BotonConsultar,
  BotonSecundario,
} from '@/components/admin/EstiloModulo'


// ============================================================
// CONSTANTES
// ============================================================

const API_CONTROL_CLASES =
  '/api/admin/documentos/control-clases'

const API_FOTO_MATRICULA =
  '/api/admin/documentos/foto-matricula'

const API_DOCUMENTOS_INSTITUCIONALES =
  '/api/admin/documentos/institucionales'

const DOCUMENTOS_GENERADOS = [
  {
    id: 'CONTROL_CLASES',
    nombre: 'CONTROL DE CLASES',
    tipo: 'GENERADO',
    estado: 'DISPONIBLE',
    icono: 'fa-clipboard-list',
  },
  {
    id: 'CONTRATO',
    nombre: 'CONTRATO DE PRESTACIÓN DE SERVICIOS DE FORMACIÓN EN CONDUCCIÓN',
    tipo: 'GENERADO',
    estado: 'DISPONIBLE',
    icono: 'fa-file-signature',
  },
  {
    id: 'CODIGO_CONDUCTA',
    nombre: 'CÓDIGO DE CONDUCTA DEL ASPIRANTE',
    tipo: 'GENERADO',
    estado: 'DISPONIBLE',
    icono: 'fa-scale-balanced',
  },
  {
    id: 'AUTORIZACION_DATOS_CEA',
    nombre: 'AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES',
    tipo: 'GENERADO',
    estado: 'DISPONIBLE',
    icono: 'fa-user-shield',
  },
]


// ============================================================
// HELPERS
// ============================================================

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
    return texto(
      valor
    ) ||
    '-'
  }

  return `${day}/${month}/${year}`
}


function estadoDocumentoClase(
  estado
) {
  switch (
    estado
  ) {
    case 'DISPONIBLE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'

    case 'SIN ARCHIVO':
      return 'bg-amber-50 text-amber-700 border-amber-200'

    default:
      return 'bg-gray-100 text-gray-500 border-gray-200'
  }
}


// ============================================================
// PÁGINA
// ============================================================

export default function DocumentosMatriculaPage() {
  const router =
    useRouter()

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
  // MATRÍCULA
  // ==========================================================

  const [
    matriculaId,
    setMatriculaId,
  ] =
    useState(
      ''
    )

  const [
    datos,
    setDatos,
  ] =
    useState(
      null
    )

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    )

  const [
    error,
    setError,
  ] =
    useState(
      ''
    )

  // ==========================================================
  // DOCUMENTOS PDF INSTITUCIONALES
  // ==========================================================

  const [
    documentosInstitucionales,
    setDocumentosInstitucionales,
  ] =
    useState(
      []
    )

  const [
    cargandoInstitucionales,
    setCargandoInstitucionales,
  ] =
    useState(
      false
    )

  const [
    procesandoDocumentoId,
    setProcesandoDocumentoId,
  ] =
    useState(
      null
    )

  const [
    errorInstitucionales,
    setErrorInstitucionales,
  ] =
    useState(
      ''
    )

  const [
    documentoCargaId,
    setDocumentoCargaId,
  ] =
    useState(
      null
    )

  const archivoPdfRef =
    useRef(
      null
    )

  // ==========================================================
  // FOTOGRAFÍA
  // ==========================================================

  const [
    fotoAlmacenadaUrl,
    setFotoAlmacenadaUrl,
  ] =
    useState(
      ''
    )

  const [
    camaraAbierta,
    setCamaraAbierta,
  ] =
    useState(
      false
    )

  const [
    fotoCapturada,
    setFotoCapturada,
  ] =
    useState(
      null
    )

  const [
    fotoPreviewUrl,
    setFotoPreviewUrl,
  ] =
    useState(
      ''
    )

  const [
    guardandoFoto,
    setGuardandoFoto,
  ] =
    useState(
      false
    )

  const [
    errorFoto,
    setErrorFoto,
  ] =
    useState(
      ''
    )

  const videoRef =
    useRef(
      null
    )

  const canvasRef =
    useRef(
      null
    )

  const streamRef =
    useRef(
      null
    )

  // ==========================================================
  // SESIÓN + PARÁMETRO URL
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

      let usuario

      try {
        usuario =
          JSON.parse(
            stored
          )

        setUser(
          usuario
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

        return
      }

      const params =
        new URLSearchParams(
          window.location.search
        )

      const id =
        texto(
          params.get(
            'matricula_id'
          )
        )

      setMatriculaId(
        id
      )

      if (
        !id
      ) {
        setError(
          'No se recibió la matrícula que se desea consultar.'
        )

        setLoading(
          false
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

  // ==========================================================
  // CONSULTAR DOCUMENTOS DE MATRÍCULA
  // ==========================================================

  useEffect(
    () => {
      if (
        !user ||
        !matriculaId
      ) {
        return
      }

      async function cargar() {
        setLoading(
          true
        )

        setError(
          ''
        )

        try {
          const params =
            new URLSearchParams()

          params.set(
            'matricula_id',
            matriculaId
          )

          const response =
            await fetch(
              `${API_CONTROL_CLASES}?${params.toString()}`,
              {
                method:
                  'GET',

                cache:
                  'no-store',

                headers: {
                  'x-cea-nit':
                    nit,
                },
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
            throw new Error(
              `La API respondió contenido no válido. HTTP ${response.status}.`
            )
          }

          if (
            !response.ok ||
            json?.status ===
              'error' ||
            json?.ok ===
              false
          ) {
            throw new Error(
              json?.message ||
              json?.error ||
              `No fue posible consultar la matrícula. HTTP ${response.status}.`
            )
          }

          setDatos(
            json
          )
        } catch (
          errorConsulta
        ) {
          console.error(
            errorConsulta
          )

          setDatos(
            null
          )

          setError(
            errorConsulta?.message ||
            'No fue posible consultar la matrícula.'
          )
        } finally {
          setLoading(
            false
          )
        }
      }

      cargar()
    },
    [
      user,
      nit,
      matriculaId,
    ]
  )

    // ==========================================================
  // FOTO ALMACENADA DE LA MATRÍCULA
  // ==========================================================

  useEffect(
    () => {
      if (
        !user ||
        !matriculaId ||
        !nit
      ) {
        return
      }

      let activo =
        true

      async function cargarFotoAlmacenada() {
        setErrorFoto(
          ''
        )

        try {
          const response =
            await fetch(
              `${API_FOTO_MATRICULA}?matricula_id=${encodeURIComponent(
                matriculaId
              )}`,
              {
                method:
                  'GET',

                cache:
                  'no-store',

                headers: {
                  'x-cea-nit':
                    nit,
                },
              }
            )

          const respuestaTexto =
            await response.text()

          let json

          try {
            json =
              respuestaTexto
                ? JSON.parse(
                    respuestaTexto
                  )
                : {}
          } catch {
            throw new Error(
              `La API de fotografía respondió contenido no válido. HTTP ${response.status}.`
            )
          }

          if (
            !response.ok ||
            json?.ok !==
              true
          ) {
            throw new Error(
              json?.error ||
              json?.message ||
              'No fue posible consultar la fotografía almacenada.'
            )
          }

          if (
            activo
          ) {
            setFotoAlmacenadaUrl(
              json?.foto?.url ||
              ''
            )
          }
        } catch (
          errorConsultaFoto
        ) {
          console.error(
            'Error cargando fotografía almacenada:',
            errorConsultaFoto
          )

          if (
            activo
          ) {
            setFotoAlmacenadaUrl(
              ''
            )

            setErrorFoto(
              errorConsultaFoto?.message ||
              'No fue posible consultar la fotografía.'
            )
          }
        }
      }

      cargarFotoAlmacenada()

      return () => {
        activo =
          false
      }
    },
    [
      user,
      matriculaId,
      nit,
    ]
  )

  // ==========================================================
  // CONSULTAR DOCUMENTOS PDF INSTITUCIONALES
  // ==========================================================

  useEffect(
    () => {
      if (
        !user ||
        !nit
      ) {
        return
      }

      let activo =
        true

      async function cargarDocumentosInstitucionales() {
        setCargandoInstitucionales(
          true
        )

        setErrorInstitucionales(
          ''
        )

        try {
          const response =
            await fetch(
              API_DOCUMENTOS_INSTITUCIONALES,
              {
                method:
                  'GET',

                cache:
                  'no-store',

                headers: {
                  'x-cea-nit':
                    nit,
                },
              }
            )

          const respuestaTexto =
            await response.text()

          let json

          try {
            json =
              respuestaTexto
                ? JSON.parse(
                    respuestaTexto
                  )
                : {}
          } catch {
            throw new Error(
              `La API de documentos institucionales respondió contenido no válido. HTTP ${response.status}.`
            )
          }

          if (
            !response.ok ||
            json?.ok !==
              true
          ) {
            throw new Error(
              json?.error ||
              json?.message ||
              'No fue posible consultar los documentos institucionales.'
            )
          }

          if (
            activo
          ) {
            setDocumentosInstitucionales(
              Array.isArray(
                json?.documentos
              )
                ? json.documentos
                : []
            )
          }
        } catch (
          errorConsulta
        ) {
          console.error(
            'Error cargando documentos institucionales:',
            errorConsulta
          )

          if (
            activo
          ) {
            setDocumentosInstitucionales(
              []
            )

            setErrorInstitucionales(
              errorConsulta?.message ||
              'No fue posible consultar los documentos institucionales.'
            )
          }
        } finally {
          if (
            activo
          ) {
            setCargandoInstitucionales(
              false
            )
          }
        }
      }

      cargarDocumentosInstitucionales()

      return () => {
        activo =
          false
      }
    },
    [
      user,
      nit,
    ]
  )

  // ==========================================================
  // DATOS PARA MOSTRAR
  // ==========================================================

  const matricula =
    datos?.matricula ||
    null

  const aprendiz =
    datos?.aprendiz ||
    null

  const categoria =
    matricula?.categoria ||
    (
      Array.isArray(
        matricula?.categorias
      )
        ? matricula.categorias[0]
        : ''
    ) ||
    ''

  const nombreAprendiz =
    aprendiz?.nombre_completo ||
    [
      aprendiz?.nombres,
      aprendiz?.apellidos,
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      ) ||
    '-'

  const documentosMostrados =
    useMemo(
      () => [
        ...DOCUMENTOS_GENERADOS,

        ...documentosInstitucionales.map(
          documento => ({
            id:
              `PDF_${documento.id}`,

            documento_id:
              documento.id,

            codigo:
              documento.codigo,

            nombre:
              documento.nombre,

            tipo:
              'PDF INSTITUCIONAL',

            estado:
              documento.estado ||
              (
                documento.tiene_archivo
                  ? 'DISPONIBLE'
                  : 'SIN ARCHIVO'
              ),

            icono:
              'fa-file-pdf',

            url:
              documento.url ||
              '',

            tiene_archivo:
              documento.tiene_archivo ===
              true,

            es_personalizado:
              texto(
                documento.codigo
              ).startsWith(
                'DOC_'
              ),
          })
        ),
      ],
      [
        documentosInstitucionales,
      ]
    )

  // ==========================================================
  // ACCIONES
  // ==========================================================

      async function abrirCamara() {
    setErrorFoto(
      ''
    )

    setFotoCapturada(
      null
    )

    if (
      fotoPreviewUrl
    ) {
      URL.revokeObjectURL(
        fotoPreviewUrl
      )

      setFotoPreviewUrl(
        ''
      )
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode:
              'user',
          },

          audio:
            false,
        })

      streamRef.current =
        stream

      setCamaraAbierta(
        true
      )
    } catch (
      errorCamara
    ) {
      console.error(
        'Error abriendo cámara:',
        errorCamara
      )

      setErrorFoto(
        'No fue posible acceder a la cámara. Verifique los permisos del navegador.'
      )
    }
  }


  useEffect(
    () => {
      if (
        !camaraAbierta ||
        !videoRef.current ||
        !streamRef.current
      ) {
        return
      }

      const video =
        videoRef.current

      video.srcObject =
        streamRef.current

      video
        .play()
        .catch(
          errorVideo => {
            console.error(
              'Error iniciando vista previa de cámara:',
              errorVideo
            )
          }
        )
    },
    [
      camaraAbierta,
    ]
  )




  function cerrarCamara() {
    if (
      streamRef.current
    ) {
      streamRef.current
        .getTracks()
        .forEach(
          track =>
            track.stop()
        )

      streamRef.current =
        null
    }

    if (
      videoRef.current
    ) {
      videoRef.current.srcObject =
        null
    }

    setCamaraAbierta(
      false
    )
  }


  function capturarFoto() {
    const video =
      videoRef.current

    const canvas =
      canvasRef.current

        if (
      !video ||
      !canvas
    ) {
      return
    }

    if (
      !video.videoWidth ||
      !video.videoHeight ||
      video.readyState < 2
    ) {
      setErrorFoto(
        'La cámara todavía no está lista. Espere un momento e intente nuevamente.'
      )

      return
    }

    const ancho =
      video.videoWidth

    const alto =
      video.videoHeight

    canvas.width =
      ancho

    canvas.height =
      alto

    const contexto =
      canvas.getContext(
        '2d'
      )

    if (
      !contexto
    ) {
      return
    }

    contexto.drawImage(
      video,
      0,
      0,
      ancho,
      alto
    )

    canvas.toBlob(
      blob => {
        if (
          !blob
        ) {
          setErrorFoto(
            'No fue posible capturar la fotografía.'
          )

          return
        }

        if (
          fotoPreviewUrl
        ) {
          URL.revokeObjectURL(
            fotoPreviewUrl
          )
        }

        const url =
          URL.createObjectURL(
            blob
          )

        setFotoCapturada(
          blob
        )

        setFotoPreviewUrl(
          url
        )

        cerrarCamara()
      },
      'image/jpeg',
      0.9
    )
  }


  async function guardarFoto() {
    if (
      !fotoCapturada ||
      !matriculaId ||
      !nit
    ) {
      return
    }

    setGuardandoFoto(
      true
    )

    setErrorFoto(
      ''
    )

    try {
      const formData =
        new FormData()

      formData.append(
        'matricula_id',
        matriculaId
      )

      formData.append(
        'foto',
        fotoCapturada,
        'foto-aprendiz.jpg'
      )

      const response =
        await fetch(
          API_FOTO_MATRICULA,
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

      const respuestaTexto =
        await response.text()

      let json

      try {
        json =
          respuestaTexto
            ? JSON.parse(
                respuestaTexto
              )
            : {}
      } catch {
        throw new Error(
          `La API de fotografía respondió contenido no válido. HTTP ${response.status}.`
        )
      }

      if (
        !response.ok ||
        json?.ok !==
          true
      ) {
        throw new Error(
          json?.error ||
          json?.message ||
          'No fue posible guardar la fotografía.'
        )
      }

      setFotoAlmacenadaUrl(
        json?.foto?.url ||
        fotoPreviewUrl ||
        ''
      )

      setFotoCapturada(
        null
      )

      if (
        fotoPreviewUrl
      ) {
        URL.revokeObjectURL(
          fotoPreviewUrl
        )
      }

      setFotoPreviewUrl(
        ''
      )
    } catch (
      errorGuardarFoto
    ) {
      console.error(
        'Error guardando fotografía:',
        errorGuardarFoto
      )

      setErrorFoto(
        errorGuardarFoto?.message ||
        'No fue posible guardar la fotografía.'
      )
    } finally {
      setGuardandoFoto(
        false
      )
    }
  }
    useEffect(
    () => {
      return () => {
        if (
          streamRef.current
        ) {
          streamRef.current
            .getTracks()
            .forEach(
              track =>
                track.stop()
            )
        }

        if (
          fotoPreviewUrl
        ) {
          URL.revokeObjectURL(
            fotoPreviewUrl
          )
        }
      }
    },
    [
      fotoPreviewUrl,
    ]
  )
  function abrirControlClases() {
    router.push(
      `/admin/inscripciones/control-clases?matricula_id=${encodeURIComponent(
        matriculaId
      )}`
    )
  }

    function abrirContrato() {
    router.push(
      `/admin/inscripciones/contrato?matricula_id=${encodeURIComponent(
        matriculaId
      )}`
    )
  }

  function abrirCodigoConducta() {
    router.push(
      `/admin/inscripciones/codigo-conducta?matricula_id=${encodeURIComponent(
        matriculaId
      )}`
    )
  }

  function abrirAutorizacionDatos() {
    router.push(
      `/admin/inscripciones/autorizacion-datos?matricula_id=${encodeURIComponent(
        matriculaId
      )}`
    )
  }

  async function agregarDocumentoInstitucional() {
    const nombre =
      texto(
        window.prompt(
          'Nombre del nuevo documento institucional:'
        )
      )

    if (
      !nombre
    ) {
      return
    }

    setErrorInstitucionales(
      ''
    )

    try {
      const response =
        await fetch(
          API_DOCUMENTOS_INSTITUCIONALES,
          {
            method:
              'POST',

            cache:
              'no-store',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nit,
            },

            body:
              JSON.stringify({
                accion:
                  'CREAR',

                nombre,

                usuario_actualizacion:
                  usuarioActual,
              }),
          }
        )

      const respuestaTexto =
        await response.text()

      let json

      try {
        json =
          respuestaTexto
            ? JSON.parse(
                respuestaTexto
              )
            : {}
      } catch {
        throw new Error(
          `La API respondió contenido no válido. HTTP ${response.status}.`
        )
      }

      if (
        !response.ok ||
        json?.ok !==
          true
      ) {
        throw new Error(
          json?.error ||
          json?.message ||
          'No fue posible agregar el documento.'
        )
      }

      if (
        json?.documento
      ) {
        setDocumentosInstitucionales(
          anteriores => [
            ...anteriores,
            json.documento,
          ].sort(
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
        )
      }
    } catch (
      errorAgregar
    ) {
      console.error(
        'Error agregando documento institucional:',
        errorAgregar
      )

      setErrorInstitucionales(
        errorAgregar?.message ||
        'No fue posible agregar el documento.'
      )
    }
  }


  function seleccionarPdf(
    documentoId
  ) {
    setDocumentoCargaId(
      documentoId
    )

    if (
      archivoPdfRef.current
    ) {
      archivoPdfRef.current.value =
        ''

      archivoPdfRef.current.click()
    }
  }


  async function cargarPdfSeleccionado(
    event
  ) {
    const archivo =
      event.target.files?.[0]

    const documentoId =
      documentoCargaId

    if (
      !archivo ||
      !documentoId
    ) {
      return
    }

    setProcesandoDocumentoId(
      documentoId
    )

    setErrorInstitucionales(
      ''
    )

    try {
      const formData =
        new FormData()

      formData.append(
        'accion',
        'CARGAR_PDF'
      )

      formData.append(
        'documento_id',
        String(
          documentoId
        )
      )

      formData.append(
        'archivo',
        archivo
      )

      formData.append(
        'usuario_actualizacion',
        usuarioActual
      )

      const response =
        await fetch(
          API_DOCUMENTOS_INSTITUCIONALES,
          {
            method:
              'POST',

            cache:
              'no-store',

            headers: {
              'x-cea-nit':
                nit,
            },

            body:
              formData,
          }
        )

      const respuestaTexto =
        await response.text()

      let json

      try {
        json =
          respuestaTexto
            ? JSON.parse(
                respuestaTexto
              )
            : {}
      } catch {
        throw new Error(
          `La API respondió contenido no válido. HTTP ${response.status}.`
        )
      }

      if (
        !response.ok ||
        json?.ok !==
          true
      ) {
        throw new Error(
          json?.error ||
          json?.message ||
          'No fue posible cargar el PDF.'
        )
      }

      setDocumentosInstitucionales(
        anteriores =>
          anteriores.map(
            item =>
              Number(
                item.id
              ) ===
              Number(
                documentoId
              )
                ? json.documento
                : item
          )
      )
    } catch (
      errorCarga
    ) {
      console.error(
        'Error cargando PDF institucional:',
        errorCarga
      )

      setErrorInstitucionales(
        errorCarga?.message ||
        'No fue posible cargar el PDF.'
      )
    } finally {
      setProcesandoDocumentoId(
        null
      )

      setDocumentoCargaId(
        null
      )

      if (
        archivoPdfRef.current
      ) {
        archivoPdfRef.current.value =
          ''
      }
    }
  }


  function abrirPdfInstitucional(
    documento
  ) {
    const url =
      texto(
        documento?.url
      )

    if (
      !url
    ) {
      window.alert(
        'Este documento todavía no tiene un PDF cargado.'
      )

      return
    }

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    )
  }


  async function eliminarDocumentoInstitucional(
    documento
  ) {
    const confirmar =
      window.confirm(
        `¿Desea eliminar el documento "${documento.nombre}"?`
      )

    if (
      !confirmar
    ) {
      return
    }

    const documentoId =
      documento.documento_id

    setProcesandoDocumentoId(
      documentoId
    )

    setErrorInstitucionales(
      ''
    )

    try {
      const response =
        await fetch(
          API_DOCUMENTOS_INSTITUCIONALES,
          {
            method:
              'DELETE',

            cache:
              'no-store',

            headers: {
              'Content-Type':
                'application/json',

              'x-cea-nit':
                nit,
            },

            body:
              JSON.stringify({
                documento_id:
                  documentoId,

                usuario_actualizacion:
                  usuarioActual,
              }),
          }
        )

      const respuestaTexto =
        await response.text()

      let json

      try {
        json =
          respuestaTexto
            ? JSON.parse(
                respuestaTexto
              )
            : {}
      } catch {
        throw new Error(
          `La API respondió contenido no válido. HTTP ${response.status}.`
        )
      }

      if (
        !response.ok ||
        json?.ok !==
          true
      ) {
        throw new Error(
          json?.error ||
          json?.message ||
          'No fue posible eliminar el documento.'
        )
      }

      setDocumentosInstitucionales(
        anteriores =>
          anteriores.filter(
            item =>
              Number(
                item.id
              ) !==
              Number(
                documentoId
              )
          )
      )
    } catch (
      errorEliminar
    ) {
      console.error(
        'Error eliminando documento institucional:',
        errorEliminar
      )

      setErrorInstitucionales(
        errorEliminar?.message ||
        'No fue posible eliminar el documento.'
      )
    } finally {
      setProcesandoDocumentoId(
        null
      )
    }
  }

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
        bg-black/10
        p-3
        md:p-6
        flex
        items-start
        justify-center
      "
    >

      <div
        className="
          w-full
          max-w-[1180px]
          bg-white
          border
          border-gray-300
          shadow-2xl
          rounded-xl
          overflow-hidden
        "
      >

        <EncabezadoModulo
          titulo="Documentos de Matrícula"
          subtitulo="Consulta, impresión y administración documental de la matrícula seleccionada."
          icono={FolderOpen}
          rutaRegreso="/admin/inscripciones"
          textoRegreso="Regresar"
        />

        {/* ==================================================
            CONTENIDO
        ================================================== */}

        <div className="p-3 md:p-4">

          {loading ? (
            <div
              className="
                py-14
                text-center
                text-sm
                text-gray-500
              "
            >
              <i className="fas fa-spinner fa-spin mr-2"></i>

              Consultando matrícula...
            </div>
          ) : error ? (
            <div
              className="
                bg-red-50
                border
                border-red-300
                text-red-700
                rounded-lg
                p-4
                text-sm
              "
            >
              <i className="fas fa-exclamation-triangle mr-2"></i>

              {error}
            </div>
          ) : (
            <>

              {/* ============================================
                  RESUMEN MATRÍCULA + FOTO
              ============================================ */}

              <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-3 items-start">

              <div
                className="
                  border
                  border-gray-300
                  rounded-lg
                  overflow-hidden
                  mb-3
                "
              >

 

                <div
                  className="
                    grid
                    grid-cols-1
                    md:grid-cols-1
                  "
                >

                  <div
                    className="
                      order-2
                      p-2.5
                      grid
                      grid-cols-2
                      grid-cols-2
                      gap-x-3
                      gap-y-2
                    "
                  >

                    <div>
                      <div className="text-[9px] font-bold uppercase text-gray-500">
                        Matrícula
                      </div>

                      <div className="mt-0.5 text-xs font-black text-gray-800">
                        {matricula?.consecutivo ||
                          '-'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[9px] font-bold uppercase text-gray-500">
                        Categoría
                      </div>

                      <div className="mt-0.5 text-xs font-black text-gray-800">
                        {categoria ||
                          '-'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[9px] font-bold uppercase text-gray-500">
                        Fecha Matrícula
                      </div>

                      <div className="mt-0.5 text-xs font-black text-gray-800">
                        {formatearFecha(
                          matricula?.fecha_matricula
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[9px] font-bold uppercase text-gray-500">
                        Documento
                      </div>

                      <div className="mt-0.5 text-xs font-black text-gray-800">
                        {aprendiz?.documento ||
                          '-'}
                      </div>
                    </div>

                    <div
                      className="
                        col-span-2
                        col-span-2
                      "
                    >
                      <div className="text-[9px] font-bold uppercase text-gray-500">
                        Aprendiz
                      </div>

                      <div
                        className="
                          mt-0.5
                          text-xs
                          font-black
                          uppercase
                          text-gray-800
                        "
                      >
                        {nombreAprendiz}
                      </div>
                    </div>

                  </div>

                  <div
                    className="
                      order-1
                      border-t
                      md:border-t-0
                       border-gray-300
                      bg-gray-50
                      p-3
                    "
                  >

                    <div
                      className="
                        text-[9px]
                        font-black
                        uppercase
                        text-gray-600
                      "
                    >
                      Fotografía del Aprendiz
                    </div>

                                        <div
                      className="
                        mt-2
                        min-h-[120px]
                        border
                        border-gray-300
                        rounded
                        bg-white
                        overflow-hidden
                        flex
                        items-center
                        justify-center
                        relative
                      "
                    >

                      {camaraAbierta ? (
                        <video
                          ref={
                            videoRef
                          }
                          autoPlay
                          playsInline
                          muted
                          className="
                            w-full
                            h-[150px]
                            object-cover
                          "
                        />
                      ) : fotoPreviewUrl ? (
                        <img
                          src={
                            fotoPreviewUrl
                          }
                          alt="Fotografía capturada"
                          className="
                            w-full
                            h-[150px]
                            object-cover
                          "
                        />
                      ) : fotoAlmacenadaUrl ? (
                        <img
                          src={
                            fotoAlmacenadaUrl
                          }
                          alt="Fotografía del aprendiz"
                          className="
                            w-full
                            h-[150px]
                            object-cover
                          "
                        />
                      ) : (
                        <div
                          className="
                            px-3
                            text-center
                            text-[9px]
                            text-gray-400
                          "
                        >
                          <i className="fas fa-user text-2xl mb-2 block"></i>

                          Sin fotografía almacenada
                        </div>
                      )}

                    </div>

                    <canvas
                      ref={
                        canvasRef
                      }
                      className="hidden"
                    />

                    {errorFoto && (
                      <div
                        className="
                          mt-2
                          text-[9px]
                          text-red-600
                        "
                      >
                        {errorFoto}
                      </div>
                    )}

                    {camaraAbierta ? (
                      <div
                        className="
                          mt-2
                          grid
                          grid-cols-2
                          gap-1.5
                        "
                      >

                        <button
                          type="button"
                          onClick={
                            capturarFoto
                          }
                          className="
                            bg-emerald-600
                            hover:bg-emerald-700
                            text-white
                            px-2
                            py-1.5
                            rounded
                            text-[9px]
                            font-semibold
                          "
                        >
                          <i className="fas fa-camera mr-1"></i>

                          Capturar
                        </button>

                        <button
                          type="button"
                          onClick={
                            cerrarCamara
                          }
                          className="
                            bg-gray-200
                            hover:bg-gray-300
                            text-gray-700
                            px-2
                            py-1.5
                            rounded
                            text-[9px]
                            font-semibold
                          "
                        >
                          Cancelar
                        </button>

                      </div>
                    ) : fotoCapturada ? (
                      <div
                        className="
                          mt-2
                          grid
                          grid-cols-2
                          gap-1.5
                        "
                      >

                        <button
                          type="button"
                          onClick={
                            guardarFoto
                          }
                          disabled={
                            guardandoFoto
                          }
                          className="
                            bg-emerald-600
                            hover:bg-emerald-700
                            disabled:bg-gray-300
                            text-white
                            px-2
                            py-1.5
                            rounded
                            text-[9px]
                            font-semibold
                          "
                        >
                          {guardandoFoto ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-1"></i>

                              Guardando...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save mr-1"></i>

                              Guardar Foto
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={
                            abrirCamara
                          }
                          disabled={
                            guardandoFoto
                          }
                          className="
                            bg-gray-200
                            hover:bg-gray-300
                            text-gray-700
                            px-2
                            py-1.5
                            rounded
                            text-[9px]
                            font-semibold
                          "
                        >
                          Repetir
                        </button>

                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          abrirCamara
                        }
                        className="
                          mt-2
                          w-full
                          bg-blue-600
                          hover:bg-blue-700
                          text-white
                          px-3
                          py-1.5
                          rounded
                          text-[10px]
                          font-semibold
                        "
                      >
                        <i className="fas fa-camera mr-1.5"></i>

                        {fotoAlmacenadaUrl
                          ? 'Tomar / Reemplazar Foto'
                          : 'Tomar Foto'}
                      </button>
                    )}

                  </div>

                </div>

              </div>

              {/* ============================================
                  TABLA DE DOCUMENTOS
              ============================================ */}

              <div
                className="
                  border
                  border-gray-300
                  rounded-lg
                  overflow-hidden
                "
              >

                <div
                  className="
                    border-b
                    border-gray-300
                    px-3
                    py-2
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                
                  style={{
                    backgroundColor: ESTILO_SECCIONES.fondo,
                    color: ESTILO_SECCIONES.texto,
                  }}
                >

                  <div
                    className="
                      text-[11px]
                      font-black
                      uppercase
                      text-gray-700
                    ">
                    Documentos
                  </div>

                  

                  <input
                    ref={
                      archivoPdfRef
                    }
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={
                      cargarPdfSeleccionado
                    }
                    className="hidden"
                  />

                </div>

                {errorInstitucionales && (
                  <div
                    className="
                      border-b
                      border-red-200
                      bg-red-50
                      px-3
                      py-2
                      text-[9px]
                      text-red-700
                    "
                  >
                    <i className="fas fa-exclamation-triangle mr-1"></i>

                    {errorInstitucionales}
                  </div>
                )}

                {cargandoInstitucionales && (
                  <div
                    className="
                      border-b
                      border-gray-200
                      bg-white
                      px-3
                      py-2
                      text-[9px]
                      text-gray-500
                    "
                  >
                    <i className="fas fa-spinner fa-spin mr-1"></i>

                    Consultando documentos institucionales...
                  </div>
                )}

                <div className="overflow-x-auto">

                  <table
                    className="
                      w-full
                      border-collapse
                      text-[11px]
                    "
                  >

                    <thead
                    style={{
                      backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo,
                      color: ESTILO_ENCABEZADO_TABLA.texto,
                    }}
                  >

                      <tr
                        className="
                          bg-slate-50
                          text-gray-600
                        "
                      >

                        <th
                          className="
                            text-left
                            px-3
                            py-2
                            border
                            border-gray-300
                            font-black
                            uppercase
                            text-[9px]
                          "
                        >
                          Documento
                        </th>

                        <th
                          className="
                            text-left
                            px-3
                            py-2
                            border
                            border-gray-300
                            font-black
                            uppercase
                            text-[9px]
                            w-[125px]
                          "
                        >
                          Tipo
                        </th>

                        <th
                          className="
                            text-center
                            px-3
                            py-2
                            border
                            border-gray-300
                            font-black
                            uppercase
                            text-[9px]
                            w-[105px]
                          "
                        >
                          Estado
                        </th>

                        <th
                          className="
                            text-center
                            px-3
                            py-2
                            border
                            border-gray-300
                            font-black
                            uppercase
                            text-[9px]
                            w-[260px]
                            min-w-[260px]
                          "
                        >
                          Acciones
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {documentosMostrados.map(
                        documentoFila => {
                          const esControl =
                            documentoFila.id ===
                            'CONTROL_CLASES'

                          const esContrato =
                            documentoFila.id ===
                            'CONTRATO'

                          const esCodigoConducta =
                            documentoFila.id ===
                            'CODIGO_CONDUCTA'

                          const esAutorizacionDatos =
                            documentoFila.id ===
                            'AUTORIZACION_DATOS_CEA'

                          const esPdf =
                            documentoFila.tipo ===
                            'PDF INSTITUCIONAL'

                          return (
                            <tr
                              key={
                                documentoFila.id
                              }
                              className="
                                odd:bg-white
                                even:bg-slate-50/60
                                hover:bg-blue-50/40
                              "
                            >

                              <td
                                className="
                                  px-3
                                  py-2.5
                                  border
                                  border-gray-300
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
                                      w-7
                                      h-7
                                      rounded
                                      bg-gray-100
                                      text-gray-600
                                      flex
                                      items-center
                                      justify-center
                                      shrink-0
                                    "
                                  >
                                    <i
                                      className={`fas ${documentoFila.icono}`}
                                    ></i>
                                  </div>

                                  <div
                                    className="
                                      font-bold
                                      text-[10px]
                                      uppercase
                                      leading-tight
                                      text-gray-800
                                    "
                                  >
                                    {documentoFila.nombre}
                                  </div>

                                </div>

                              </td>

                              <td
                                className="
                                  px-3
                                  py-2.5
                                  border
                                  border-gray-300
                                  text-[9px]
                                  font-semibold
                                  text-gray-500
                                  uppercase
                                "
                              >
                                {documentoFila.tipo}
                              </td>

                              <td
                                className="
                                  px-3
                                  py-2.5
                                  border
                                  border-gray-300
                                  text-center
                                "
                              >
                                <span
                                  className={`
                                    inline-flex
                                    items-center
                                    justify-center
                                    border
                                    rounded-full
                                    px-2
                                    py-0.5
                                    text-[8px]
                                    font-black
                                    uppercase
                                    ${estadoDocumentoClase(
                                      documentoFila.estado
                                    )}
                                  `}
                                >
                                  {documentoFila.estado}
                                </span>
                              </td>

                              <td
                                className="
                                  px-3
                                  py-2
                                  border
                                  border-gray-300
                                "
                              >

                                <div
                                  className="
                                    grid
                                    grid-cols-2
                                    gap-1.5
                                    w-full
                                    max-w-[230px]
                                    mx-auto
                                  "
                                >

                                  {esControl && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={
                                          abrirControlClases
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[#5F9EA0] hover:bg-[#4D8587] text-white"
                                      >
                                        <i className="fas fa-eye mr-1"></i>

                                        Vista previa
                                      </button>

                                      <button
                                        type="button"
                                        onClick={
                                          abrirControlClases
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[#71717B] hover:bg-[#5B5B63] text-white"
                                      >
                                        <i className="fas fa-print mr-1"></i>

                                        Imprimir
                                      </button>
                                    </>
                                  )}

                                  {esContrato && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={
                                          abrirContrato
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[#5F9EA0] hover:bg-[#4D8587] text-white"
                                      >
                                        <i className="fas fa-eye mr-1"></i>

                                        Vista previa
                                      </button>

                                      <button
                                        type="button"
                                        onClick={
                                          abrirContrato
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[#71717B] hover:bg-[#5B5B63] text-white"
                                      >
                                        <i className="fas fa-print mr-1"></i>

                                        Imprimir
                                      </button>
                                    </>
                                  )}

                                    {esCodigoConducta && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={
                                          abrirCodigoConducta
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[#5F9EA0] hover:bg-[#4D8587] text-white"
                                      >
                                        <i className="fas fa-eye mr-1"></i>

                                        Vista previa
                                      </button>

                                      <button
                                        type="button"
                                        onClick={
                                          abrirCodigoConducta
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[#71717B] hover:bg-[#5B5B63] text-white"
                                      >
                                        <i className="fas fa-print mr-1"></i>

                                        Imprimir
                                      </button>
                                    </>
                                  )}

                                  {esAutorizacionDatos && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={
                                          abrirAutorizacionDatos
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[#5F9EA0] hover:bg-[#4D8587] text-white"
                                      >
                                        <i className="fas fa-eye mr-1"></i>

                                        Vista previa
                                      </button>

                                      <button
                                        type="button"
                                        onClick={
                                          abrirAutorizacionDatos
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[#71717B] hover:bg-[#5B5B63] text-white"
                                      >
                                        <i className="fas fa-print mr-1"></i>

                                        Imprimir
                                      </button>
                                    </>
                                  )}

                                  {esPdf && (
                                    <>
                                      {documentoFila.tiene_archivo ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              abrirPdfInstitucional(
                                                documentoFila
                                              )
                                            }
                                            className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[#5F9EA0] hover:bg-[#4D8587] text-white"
                                          >
                                            <i className="fas fa-eye mr-1"></i>

                                            Ver
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              abrirPdfInstitucional(
                                                documentoFila
                                              )
                                            }
                                            className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[#71717B] hover:bg-[#5B5B63] text-white"
                                          >
                                            <i className="fas fa-print mr-1"></i>

                                            Imprimir
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              seleccionarPdf(
                                                documentoFila.documento_id
                                              )
                                            }
                                            disabled={
                                              procesandoDocumentoId ===
                                              documentoFila.documento_id
                                            }
                                            className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[#7C86FF] hover:bg-[#626DDF] text-white disabled:bg-gray-300"
                                          >
                                            {procesandoDocumentoId ===
                                            documentoFila.documento_id ? (
                                              <>
                                                <i className="fas fa-spinner fa-spin mr-1"></i>

                                                Procesando...
                                              </>
                                            ) : (
                                              <>
                                                <i className="fas fa-upload mr-1"></i>

                                                Reemplazar PDF
                                              </>
                                            )}
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              eliminarDocumentoInstitucional(
                                                documentoFila
                                              )
                                            }
                                            disabled={
                                              procesandoDocumentoId ===
                                              documentoFila.documento_id
                                            }
                                            className="
                                              bg-red-50
                                              hover:bg-red-100
                                              disabled:bg-gray-100
                                              border
                                              border-red-200
                                              text-red-700
                                              w-full
                                              px-2.5
                                              py-1.5
                                              rounded
                                              text-[9px]
                                              font-semibold
                                            "
                                          >
                                            <i className="fas fa-trash mr-1"></i>

                                            Eliminar
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              seleccionarPdf(
                                                documentoFila.documento_id
                                              )
                                            }
                                            disabled={
                                              procesandoDocumentoId ===
                                              documentoFila.documento_id
                                            }
                                            className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[#7C86FF] hover:bg-[#626DDF] text-white disabled:bg-gray-300"
                                          >
                                            {procesandoDocumentoId ===
                                            documentoFila.documento_id ? (
                                              <>
                                                <i className="fas fa-spinner fa-spin mr-1"></i>

                                                Procesando...
                                              </>
                                            ) : (
                                              <>
                                                <i className="fas fa-upload mr-1"></i>

                                                Cargar PDF
                                              </>
                                            )}
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              eliminarDocumentoInstitucional(
                                                documentoFila
                                              )
                                            }
                                            disabled={
                                              procesandoDocumentoId ===
                                              documentoFila.documento_id
                                            }
                                            className="
                                              bg-red-50
                                              hover:bg-red-100
                                              disabled:bg-gray-100
                                              border
                                              border-red-200
                                              text-red-700
                                              w-full
                                              px-2.5
                                              py-1.5
                                              rounded
                                              text-[9px]
                                              font-semibold
                                            "
                                          >
                                            <i className="fas fa-trash mr-1"></i>

                                            Eliminar
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}

                                </div>

                              </td>

                            </tr>
                          )
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              </div>

            </>
          )}

        </div>

      </div>

    </div>
  )
}
