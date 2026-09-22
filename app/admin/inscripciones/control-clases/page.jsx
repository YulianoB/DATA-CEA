// app/admin/inscripciones/control-clases/page.jsx

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
  cerrarSesion,
} from '@/lib/auth/logout'


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


function formatearFecha(
  valor
) {
  if (
    !valor
  ) {
    return ''
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
    )
  }

  return `${day}/${month}/${year}`
}


function obtenerClases(
  modulos
) {
  if (
    !Array.isArray(
      modulos
    )
  ) {
    return []
  }

  return modulos.flatMap(
    modulo =>
      Array.isArray(
        modulo?.clases
      )
        ? modulo.clases
        : []
  )
}


// ============================================================
// CAMPO DE DATOS
// ============================================================

function CampoDato({
  titulo,
  valor,
  className = '',
}) {
  return (
    <div
      className={`
        border
        border-gray-400
        px-2
        py-1.5
        min-h-[38px]
        ${className}
      `}
    >
      <div
        className="
          text-[8px]
          font-bold
          uppercase
          text-gray-500
        "
      >
        {titulo}
      </div>

      <div
        className="
          mt-0.5
          text-[10px]
          font-semibold
          text-gray-900
          break-words
        "
      >
        {texto(
          valor
        ) ||
          '-'}
      </div>
    </div>
  )
}


// ============================================================
// VALOR DE ELEMENTOS DEL ENCABEZADO
// ============================================================

function valorDocumento(
  tipo,
  documento,
  pagina
) {
  switch (
    tipo
  ) {
    case 'NOMBRE_DOCUMENTO':
      return texto(
        documento
          ?.nombre_documento
      )

    case 'CODIGO':
      return texto(
        documento
          ?.codigo
      )

    case 'FECHA_EDICION':
      return formatearFecha(
        documento
          ?.fecha_edicion
      )

    case 'VERSION':
      return texto(
        documento
          ?.version
      )

    case 'VIGENCIA':
      return texto(
        documento
          ?.vigencia
      )

    case 'PAGINACION':
      return `${pagina} de 2`

    default:
      return ''
  }
}


// ============================================================
// ENCABEZADO DOCUMENTAL CONFIGURADO
// ============================================================

function EncabezadoDocumento({
  encabezado,
  documento,
  logo,
  pagina,
}) {
  const estructura =
    encabezado
      ?.estructura &&
    typeof encabezado
      .estructura ===
      'object'
      ? encabezado
          .estructura
      : {}

  const celdas =
    Array.isArray(
      estructura?.celdas
    )
      ? estructura.celdas
      : []

  const filas =
    Array.isArray(
      estructura?.filas
    )
      ? estructura.filas
      : []

  const columnas =
    Array.isArray(
      estructura?.columnas
    )
      ? estructura.columnas
      : []

  const configuracion =
    estructura
      ?.configuracion &&
    typeof estructura
      .configuracion ===
      'object'
      ? estructura.configuracion
      : {}

  const cantidadFilas =
    Number(
      encabezado?.filas
    ) ||
    filas.length ||
    2

  const cantidadColumnas =
    Number(
      encabezado?.columnas
    ) ||
    columnas.length ||
    3


  // ==========================================================
  // ANCHOS DE COLUMNAS
  // ==========================================================

  const anchos =
    Array.from(
      {
        length:
          cantidadColumnas,
      },
      (
        _,
        indice
      ) => {
        const item =
          columnas[
            indice
          ]

        const ancho =
          Number(
            item?.ancho ??
            item?.width ??
            item
          )

        return Number.isFinite(
          ancho
        ) &&
        ancho >
          0
          ? ancho
          : 1
      }
    )


  // ==========================================================
  // ALTURAS DE FILAS
  // ==========================================================

  const alturas =
    Array.from(
      {
        length:
          cantidadFilas,
      },
      (
        _,
        indice
      ) => {
        const item =
          filas[
            indice
          ]

        const alto =
          Number(
            item?.alto ??
            item?.altura ??
            item?.height ??
            item
          )

        return Number.isFinite(
          alto
        ) &&
        alto >
          0
          ? `${alto}mm`
          : 'auto'
      }
    )


  const grosorBorde =
    Number(
      configuracion
        ?.grosor_borde
    ) ||
    1

  const padding =
    Number(
      configuracion
        ?.padding
    )

  const paddingCelda =
    Number.isFinite(
      padding
    )
      ? padding
      : 4


  // ==========================================================
  // RESPALDO SI NO HAY DISEÑO CONFIGURADO
  // ==========================================================

  if (
    celdas.length ===
    0
  ) {
    return (
      <div
        className="
          border
          border-black
          p-2
          text-center
        "
      >
        <div
          className="
            text-sm
            font-bold
          "
        >
          {documento
            ?.nombre_documento ||
            'TARJETA DE CONTROL DE CLASES'}
        </div>
      </div>
    )
  }


  // ==========================================================
  // ENCABEZADO DISEÑADO
  // ==========================================================

  return (
    <div
      className="
        grid
        w-full
        bg-white
      "
      style={{
        gridTemplateColumns:
          anchos
            .map(
              ancho =>
                `${ancho}fr`
            )
            .join(
              ' '
            ),

        gridTemplateRows:
          alturas.join(
            ' '
          ),
      }}
    >

      {celdas.map(
        celda => {
          const elementos =
            Array.isArray(
              celda
                ?.elementos
            )
              ? celda.elementos
              : []

          const fila =
            Number(
              celda?.fila
            ) ||
            1

          const columna =
            Number(
              celda?.columna
            ) ||
            1

          const rowSpan =
            Number(
              celda?.rowSpan ??
              celda?.row_span
            ) ||
            1

          const colSpan =
            Number(
              celda?.colSpan ??
              celda?.col_span
            ) ||
            1

          const horizontal =
            celda
              ?.alineacion_horizontal ||
            'center'

          const vertical =
            celda
              ?.alineacion_vertical ||
            'center'

          const justifyContent =
            horizontal ===
            'left'
              ? 'flex-start'
              : horizontal ===
                'right'
                ? 'flex-end'
                : 'center'

          const alignItems =
            vertical ===
            'top'
              ? 'flex-start'
              : vertical ===
                'bottom'
                ? 'flex-end'
                : 'center'


          return (
            <div
              key={
                celda?.id ||
                `${fila}-${columna}`
              }
              className="
                flex
                overflow-hidden
              "
              style={{
                gridRow:
                  `${fila} / span ${rowSpan}`,

                gridColumn:
                  `${columna} / span ${colSpan}`,

                justifyContent,

                alignItems,

                textAlign:
                  horizontal,

                padding:
                  `${paddingCelda}px`,

                borderTop:
                  celda
                    ?.borde_superior ===
                  false
                    ? 'none'
                    : `${grosorBorde}px solid #000`,

                borderBottom:
                  celda
                    ?.borde_inferior ===
                  false
                    ? 'none'
                    : `${grosorBorde}px solid #000`,

                borderLeft:
                  celda
                    ?.borde_izquierdo ===
                  false
                    ? 'none'
                    : `${grosorBorde}px solid #000`,

                borderRight:
                  celda
                    ?.borde_derecho ===
                  false
                    ? 'none'
                    : `${grosorBorde}px solid #000`,
              }}
            >

              <div
                className="
                  w-full
                "
              >

                {elementos.map(
                  (
                    elemento,
                    indice
                  ) => {
                    const tipo =
                      texto(
                        elemento
                          ?.tipo
                      ).toUpperCase()


                    // ========================================
                    // VACÍO
                    // ========================================

                    if (
                      tipo ===
                      'VACIO'
                    ) {
                      return null
                    }


                    // ========================================
                    // LOGO
                    // ========================================

                    if (
                      tipo ===
                      'LOGO'
                    ) {
                      return (
                        <div
                          key={
                            `${tipo}-${indice}`
                          }
                          className="
                            flex
                            h-full
                            w-full
                            items-center
                            justify-center
                          "
                        >

                          {logo?.url ? (
                            <img
                              src={
                                logo.url
                              }
                              alt="Logo institucional"
                              className="
                                max-h-[15mm]
                                max-w-full
                                object-contain
                              "
                            />
                          ) : (
                            <span
                              className="
                                text-[7px]
                                text-gray-500
                              "
                            >
                              LOGO
                            </span>
                          )}

                        </div>
                      )
                    }


                    // ========================================
                    // TEXTO O DATO DEL DOCUMENTO
                    // ========================================

                    const valor =
                      tipo ===
                      'TEXTO'
                        ? texto(
                            elemento
                              ?.valor
                          )
                        : valorDocumento(
                            tipo,
                            documento,
                            pagina
                          )

                    const prefijo =
                      texto(
                        elemento
                          ?.prefijo
                      )

                    const tamano =
                      Number(
                        elemento
                          ?.tamano_fuente
                      ) ||
                      8

                    const negrita =
                      elemento
                        ?.negrita ===
                      true


                    return (
                      <div
                        key={
                          `${tipo}-${indice}`
                        }
                        style={{
                          fontSize:
                            `${tamano}px`,

                          fontWeight:
                            negrita
                              ? 700
                              : 400,

                          lineHeight:
                            1.15,
                        }}
                      >
                        {prefijo}
                        {valor}
                      </div>
                    )
                  }
                )}

              </div>

            </div>
          )
        }
      )}

    </div>
  )
}

// ============================================================
// MÓDULO TEÓRICO / TALLER
// ============================================================

function TablaModulo({
  modulo,
  numeroModulo,
}) {
  const clases =
    Array.isArray(
      modulo?.clases
    )
      ? modulo.clases
      : []

  return (
    <div
      className="
        mt-2
        border
        border-black
      "
    >

      <div
        className="
          bg-gray-200
          border-b
          border-black
          px-2
          py-1
          text-[9px]
          font-black
          uppercase
        "
      >
        {numeroModulo
          ? `MÓDULO ${numeroModulo} – `
          : ''}

        {modulo?.nombre ||
          'FORMACIÓN'}
      </div>

      <table
        className="
          w-full
          border-collapse
          table-fixed
          text-[8px]
        "
      >

        <thead>

          <tr className="bg-gray-100">

            <th
              className="
                border-r
                border-b
                border-black
                w-[32px]
                px-1
                py-1
              "
            >
              Nº
            </th>

            <th
            className="
              border-r
              border-b
              border-black
              w-[140px]
              px-2
              py-1
            "
          >
            CLASE
          </th>

          <th
          className="
            border-r
            border-b
            border-black
            w-[170px]
            px-2
            py-1
          "
        >
          TEMA / CONTENIDO
        </th>

            <th
              className="
              border-r
              border-b
              border-black
              w-[65px]
              px-1
              py-1
            "
          >
            FECHA
            </th>

            <th
              className="
                border-b
                border-black
                w-[88px]
                px-1
                py-1
              "
            >
              AUTOEVALUACIÓN
            </th>

          </tr>

        </thead>

        <tbody>

          {clases.map(
            (
              clase,
              index
            ) => (
              <tr
                key={
                  clase.id ||
                  index
                }
              >

                <td
                  className="
                    border-r
                    border-b
                    border-black
                    text-center
                    px-1
                    py-1
                  "
                >
                  {clase.numero_clase ||
                    index +
                      1}
                </td>

                <td
                  className="
                    border-r
                    border-b
                    border-black
                    px-2
                    py-1
                    leading-tight
                  "
                >
                  {clase.nombre ||
                    '-'}
                </td>

                <td
                  className="
                    border-r
                    border-b
                    border-black
                    px-2
                    py-1
                    leading-tight
                  "
                >
                  {clase.contenido_tarjeta ||
                    '-'}
                </td>

                <td
                  className="
                    border-r
                    border-b
                    border-black
                    px-1
                    py-1
                  "
                >
                  &nbsp;
                </td>

                <td
                className="
                  border-b
                  border-black
                  px-1
                  py-1
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-center
                    gap-1
                  "
                >
                  <span
                    className="
                      text-[14px]
                      leading-none
                      font-normal
                      relative
                      -top-[2px]
                    "
                  >
                    □
                  </span>

                  <span>
                    Realizada
                  </span>
                </div>
              </td>

              </tr>
            )
          )}

        </tbody>

      </table>

    </div>
  )
}


// ============================================================
// TABLA PRÁCTICA
// ============================================================

function TablaPractica({
  clases,
}) {
  return (
    <div
      className="
        mt-2
        border
        border-black
      "
    >

      <table
        className="
          w-full
          border-collapse
          table-fixed
          text-[6.5px]
        "
      >

        <thead>

          <tr className="bg-gray-200">

            <th
              className="
                border-r
                border-b
                border-black
                w-[24px]
                px-0.5
                py-1
              "
            >
              Nº
            </th>

            <th
              className="
                border-r
                border-b
                border-black
                w-[175px]
                px-1
                py-1
              "
            >
              CLASE
            </th>

            <th
              className="
                border-r
                border-b
                border-black
                px-1
                py-1
              "
            >
              TEMA / CONTENIDO
            </th>

            <th
              className="
                border-r
                border-b
                border-black
                w-[52px]
                px-0.5
                py-1
              "
            >
              FECHA
            </th>

            <th
              className="
                border-r
                border-b
                border-black
                w-[82px]
                px-0.5
                py-1
              "
            >
              INSTRUCTOR
            </th>

            <th
              className="
                border-r
                border-b
                border-black
                w-[44px]
                px-0.5
                py-1
              "
            >
              PLACA
            </th>

            <th
              className="
                border-b
                border-black
                w-[90px]
                px-0.5
                py-1
              "
            >
              <div>
                DESEMPEÑO
              </div>

              <div
                className="
                  grid
                  grid-cols-3
                  mt-0.5
                  text-[7px]
                  font-black
                  leading-none
                "
              >
                <span>
                  S
                </span>

                <span>
                  EP
                </span>

                <span>
                  RR
                </span>
              </div>
            </th>

          </tr>

        </thead>

        <tbody>

          {clases.map(
            (
              clase,
              index
            ) => (
              <tr
                key={
                  clase.id ||
                  index
                }
              >

                <td
                  className="
                    border-r
                    border-b
                    border-black
                    text-center
                    px-0.5
                    py-[2px]
                  "
                >
                  {clase.numero_clase ||
                    index +
                      1}
                </td>

                <td
                  className="
                    border-r
                    border-b
                    border-black
                    px-1
                    py-[2px]
                    leading-[1.05]
                  "
                >
                  {clase.nombre ||
                    '-'}
                </td>

                <td
                  className="
                    border-r
                    border-b
                    border-black
                    px-1
                    py-[2px]
                    leading-[1.05]
                  "
                >
                  {clase.contenido_tarjeta ||
                    '-'}
                </td>

                <td
                  className="
                    border-r
                    border-b
                    border-black
                    px-0.5
                    py-[2px]
                  "
                >
                  &nbsp;
                </td>

                <td
                  className="
                    border-r
                    border-b
                    border-black
                    px-0.5
                    py-[2px]
                  "
                >
                  &nbsp;
                </td>

                <td
                  className="
                    border-r
                    border-b
                    border-black
                    px-0.5
                    py-[2px]
                  "
                >
                  &nbsp;
                </td>

                <td
                  className="
                    border-b
                    border-black
                    px-0.5
                    py-[2px]
                  "
                >
                  <div
                    className="
                      grid
                      grid-cols-3
                      items-center
                      text-center
                    "
                  >

                    <span
                      className="
                        text-[14px]
                        leading-none
                      "
                    >
                      □
                    </span>

                    <span
                      className="
                        text-[14px]
                        leading-none
                      "
                    >
                      □
                    </span>

                    <span
                      className="
                        text-[14px]
                        leading-none
                      "
                    >
                      □
                    </span>

                  </div>
                </td>

              </tr>
            )
          )}

        </tbody>

      </table>

    </div>
  )
}


// ============================================================
// PÁGINA
// ============================================================

export default function ControlClasesPage() {
  const router =
    useRouter()

  const [
    matriculaId,
    setMatriculaId,
  ] =
    useState(
      ''
    )

  const [
    usuario,
    setUsuario,
  ] =
    useState(
      null
    )

  const [
    cargando,
    setCargando,
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

  const [
    datos,
    setDatos,
  ] =
    useState(
      null
    )

    const [
    fotoAlmacenadaUrl,
    setFotoAlmacenadaUrl,
  ] =
    useState(
      ''
    )

  const [
    fotoTemporalUrl,
    setFotoTemporalUrl,
  ] =
    useState(
      ''
    )

  const fotoUrl =
    fotoTemporalUrl ||
    fotoAlmacenadaUrl

  const [
  camaraAbierta,
  setCamaraAbierta,
] =
  useState(
    false
  )

const [
  errorCamara,
  setErrorCamara,
] =
  useState(
    ''
  )

const videoRef =
  useRef(
    null
  )

const streamRef =
  useRef(
    null
  ) 


  // ==========================================================
  // SESIÓN + MATRÍCULA
  // ==========================================================

  useEffect(
    () => {
      let user

      try {
        user =
          JSON.parse(
            localStorage.getItem(
              'currentUser'
            ) ||
            'null'
          )
      } catch {
        user =
          null
      }

      if (
        !user
      ) {
        router.replace(
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

      setUsuario(
        user
      )
    },
    [
      router,
    ]
  )


  // ==========================================================
  // CONSULTAR CONTROL
  // ==========================================================

  useEffect(
    () => {
      if (
        !usuario ||
        !matriculaId
      ) {
        return
      }

      const nit =
        obtenerNitUsuario(
          usuario
        )

      if (
        !nit
      ) {
        setError(
          'No fue posible identificar el NIT del CEA.'
        )

        setCargando(
          false
        )

        return
      }

      let activo =
        true

      async function cargar() {
        setCargando(
          true
        )

        setError(
          ''
        )

        try {
          const response =
            await fetch(
              `/api/admin/documentos/control-clases?matricula_id=${encodeURIComponent(
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
              'No fue posible cargar el Control de Clases.'
            )
          }

          if (
            activo
          ) {
            setDatos(
              json
            )
          }
        } catch (
          err
        ) {
          console.error(
            'Error cargando Control de Clases:',
            err
          )

          if (
            activo
          ) {
            setError(
              err?.message ||
              'No fue posible cargar el Control de Clases.'
            )
          }
        } finally {
          if (
            activo
          ) {
            setCargando(
              false
            )
          }
        }
      }

      cargar()

      return () => {
        activo =
          false
      }
    },
    [
      usuario,
      matriculaId,
    ]
  )


    // ==========================================================
  // FOTO ALMACENADA DE LA MATRÍCULA
  // ==========================================================

  useEffect(
    () => {
      if (
        !usuario ||
        !matriculaId
      ) {
        return
      }

      const nit =
        obtenerNitUsuario(
          usuario
        )

      if (
        !nit
      ) {
        return
      }

      let activo =
        true

      async function cargarFotoAlmacenada() {
        try {
          const response =
            await fetch(
              `/api/admin/documentos/foto-matricula?matricula_id=${encodeURIComponent(
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
          errorFoto
        ) {
          console.error(
            'Error cargando fotografía almacenada:',
            errorFoto
          )

          if (
            activo
          ) {
            setFotoAlmacenadaUrl(
              ''
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
      usuario,
      matriculaId,
    ]
  )
      // ==========================================================
  // FOTO TEMPORAL
  // ==========================================================

  useEffect(
    () => {
      return () => {
        if (
          fotoTemporalUrl
        ) {
          URL.revokeObjectURL(
            fotoTemporalUrl
          )
        }
      }
    },
    [
      fotoTemporalUrl,
    ]
  )

    // ==========================================================
  // CÁMARA TEMPORAL
  // ==========================================================

  async function abrirCamara() {
    setErrorCamara(
      ''
    )

    try {
      if (
        !navigator
          ?.mediaDevices
          ?.getUserMedia
      ) {
        throw new Error(
          'Este navegador no permite acceder a la cámara.'
        )
      }

      const stream =
        await navigator
          .mediaDevices
          .getUserMedia(
            {
              video: {
                facingMode:
                  'user',

                width: {
                  ideal:
                    1280,
                },

                height: {
                  ideal:
                    720,
                },
              },

              audio:
                false,
            }
          )

      streamRef.current =
        stream

      setCamaraAbierta(
        true
      )
    } catch (
      error
    ) {
      console.error(
        'Error al abrir la cámara:',
        error
      )

      setErrorCamara(
        'No fue posible acceder a la cámara. Verifique que esté conectada y que el navegador tenga permiso para utilizarla.'
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

      const iniciarVideo =
        async () => {
          try {
            await video.play()
          } catch (
            error
          ) {
            console.error(
              'Error iniciando vista de cámara:',
              error
            )

            setErrorCamara(
              'La cámara fue detectada, pero no fue posible mostrar la imagen.'
            )
          }
        }

      iniciarVideo()
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

    setErrorCamara(
      ''
    )
  }


  function capturarFoto() {
    const video =
      videoRef.current

    if (
      !video ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setErrorCamara(
        'La cámara todavía no está lista para tomar la fotografía.'
      )

      return
    }

    const canvas =
      document.createElement(
        'canvas'
      )

    canvas.width =
      video.videoWidth

    canvas.height =
      video.videoHeight

    const contexto =
      canvas.getContext(
        '2d'
      )

    if (
      !contexto
    ) {
      setErrorCamara(
        'No fue posible preparar la fotografía.'
      )

      return
    }

    contexto.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    )

    canvas.toBlob(
      blob => {
        if (
          !blob
        ) {
          setErrorCamara(
            'No fue posible capturar la fotografía.'
          )

          return
        }

        if (
          fotoTemporalUrl
        ) {
          URL.revokeObjectURL(
            fotoTemporalUrl
          )
        }

        const nuevaFotoUrl =
          URL.createObjectURL(
            blob
          )

        setFotoTemporalUrl(
          nuevaFotoUrl
        )

        cerrarCamara()
      },
      'image/jpeg',
      0.92
    )
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

          streamRef.current =
            null
        }
      }
    },
    []
  )
  // ==========================================================
  // CARGANDO
  // ==========================================================

  if (
    cargando
  ) {
    return (
      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-gray-100
        "
      >
        <div className="text-sm text-gray-600">
          Consultando Control de Clases...
        </div>
      </div>
    )
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error
  ) {
    return (
      <div className="p-10">

        <h1
          className="
            text-xl
            font-bold
            text-red-700
          "
        >
          Error
        </h1>

        <p className="mt-3">
          {error}
        </p>

        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="
            mt-4
            bg-gray-600
            text-white
            px-4
            py-2
            rounded
          "
        >
          Regresar
        </button>

      </div>
    )
  }


  // ==========================================================
  // DATOS
  // ==========================================================

  const empresa =
    datos?.empresa ||
    {}

  const documento =
    datos?.documento ||
    {}

  const matricula =
    datos?.matricula ||
    {}

  const aprendiz =
    datos?.aprendiz ||
    {}

  const formacion =
    datos?.formacion ||
    {}

  const textos =
    datos?.textos ||
    {}

  const modulosTeoria =
    Array.isArray(
      formacion.teoria
    )
      ? formacion.teoria
      : []

  const modulosTaller =
    Array.isArray(
      formacion.taller
    )
      ? formacion.taller
      : []

  const clasesPractica =
    obtenerClases(
      formacion.practica
    )

  const referenciaPago =
    matricula
      ?.referencia_pago
      ?.consecutivo ||
    ''


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        min-h-screen
        bg-gray-200
        py-5
      "
    >

      {/* ====================================================
          BARRA DE ACCIONES
      ==================================================== */}

      <div
        className="
          no-print
          max-w-[216mm]
          mx-auto
          mb-4
          bg-white
          border
          border-gray-300
          rounded-lg
          shadow-sm
          p-3
          flex
          flex-wrap
          items-center
          justify-between
          gap-3
        "
      >

        <div>

          <div
            className="
              text-sm
              font-bold
              text-gray-800
            "
          >
            Tarjeta de Control de Clases
          </div>

          <div
            className="
              text-[11px]
              text-gray-500
            "
          >
            Matrícula{' '}
            {matricula.consecutivo ||
              '-'}
            {' · '}
            Categoría{' '}
            {matricula.categoria ||
              '-'}
          </div>

        </div>

        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >

          <button
            type="button"
            onClick={
              abrirCamara
            }
            className="
              bg-blue-600
              hover:bg-blue-700
              text-white
              px-3
              py-2
              rounded
              text-xs
            "
          >
            <i className="fas fa-camera mr-1"></i>

            {fotoUrl
              ? 'Tomar nuevamente'
              : 'Tomar foto'}
          </button>

          <button
            type="button"
            onClick={() =>
              window.print()
            }
            className="
              bg-emerald-600
              hover:bg-emerald-700
              text-white
              px-3
              py-2
              rounded
              text-xs
            "
          >
            <i className="fas fa-print mr-1"></i>

            Imprimir
          </button>

          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="
              bg-gray-600
              hover:bg-gray-700
              text-white
              px-3
              py-2
              rounded
              text-xs
            "
          >
            Regresar
          </button>

          <button
            type="button"
            onClick={() =>
              cerrarSesion(
                router
              )
            }
            className="
              bg-red-600
              hover:bg-red-700
              text-white
              px-3
              py-2
              rounded
              text-xs
            "
          >
            Cerrar Sesión
          </button>

        </div>

      </div>

      {/* =====================================================
    CÁMARA WEB
===================================================== */}

{camaraAbierta && (
  <div
    className="
      no-print
      fixed
      inset-0
      z-[100]
      flex
      items-center
      justify-center
      bg-black/70
      p-4
    "
  >
    <div
      className="
        w-full
        max-w-[720px]
        overflow-hidden
        rounded-xl
        bg-white
        shadow-2xl
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          border-b
          border-gray-300
          px-4
          py-3
        "
      >
        <div
          className="
            font-bold
            text-[var(--primary)]
          "
        >
          Tomar foto del aprendiz
        </div>

        <button
          type="button"
          onClick={
            cerrarCamara
          }
          className="
            rounded
            px-2
            py-1
            text-gray-500
            hover:bg-gray-100
          "
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div
        className="
          bg-black
          p-3
        "
      >
        <video
          ref={
            videoRef
          }
          autoPlay
          playsInline
          muted
          className="
            mx-auto
            max-h-[65vh]
            w-full
            bg-black
            object-contain
          "
        />
      </div>

      {errorCamara && (
        <div
          className="
            mx-4
            mt-3
            rounded
            border
            border-red-300
            bg-red-50
            p-2
            text-sm
            text-red-700
          "
        >
          {errorCamara}
        </div>
      )}

      <div
        className="
          flex
          items-center
          justify-center
          gap-3
          p-4
        "
      >
        <button
          type="button"
          onClick={
            capturarFoto
          }
          className="
            rounded-lg
            bg-[var(--primary)]
            px-5
            py-2.5
            text-sm
            font-bold
            text-white
            hover:bg-[var(--primary-dark)]
          "
        >
          <i className="fas fa-camera mr-2"></i>

          Capturar foto
        </button>

        <button
          type="button"
          onClick={
            cerrarCamara
          }
          className="
            rounded-lg
            border
            border-gray-400
            bg-white
            px-5
            py-2.5
            text-sm
            font-semibold
            text-gray-700
            hover:bg-gray-50
          "
        >
          Cancelar
        </button>
      </div>
    </div>
  </div>
)}


      {/* ====================================================
          PÁGINA 1
      ==================================================== */}

      <section
        className="
          hoja-control
          bg-white
          mx-auto
          shadow-lg
          p-[8mm]
        "
      >

        <EncabezadoDocumento
          encabezado={
            documento.encabezado
          }
          documento={
            documento
          }
          logo={
            documento.logo
          }
          pagina="1"
        />


        {/* ==================================================
            IDENTIFICACIÓN
        ================================================== */}

        <div
          className="
            mt-2
            border
            border-black
          "
        >

          <div
            className="
              grid
              grid-cols-[1fr_112px_112px]
              bg-gray-200
              border-b
              border-black
              text-[9px]
              font-black
              uppercase
            "
          >

            <div
              className="
                px-2
                py-1
                flex
                items-center
              "
            >
              Información del Aprendiz
            </div>

            <div
            className="
              border-l
              border-black
              px-1
              py-1
              text-center
              flex
              flex-col
              items-center
              justify-center
            "
          >

            <div
              className="
                text-[6.5px]
                font-semibold
                text-gray-500
                leading-none
              "
            >
              CONSECUTIVO
            </div>

            <div
              className="
                mt-1
                text-[12px]
                font-black
                text-red-700
                leading-none
              "
            >
              {matricula.consecutivo ||
                '-'}
            </div>

          </div>

            <div
            className="
              border-l
              border-black
              px-1
              py-1
              text-center
              flex
              flex-col
              items-center
              justify-center
            "
          >

            <div
              className="
                text-[6.5px]
                font-semibold
                text-gray-500
                leading-none
              "
            >
              CATEGORÍA
            </div>

            <div
              className="
                mt-1
                text-[12px]
                font-black
                text-red-700
                leading-none
              "
            >
              {matricula.categoria ||
                '-'}
            </div>

          </div>
          </div>

                    <div
            className="
              grid
              grid-cols-[1fr_112px_112px]
            "
          >

  {/* ==================================================
      DATOS DEL APRENDIZ
  ================================================== */}

  
<div
  className="
    flex
    flex-col
  "
>

  {/* ==================================================
      FILA 1
      NOMBRE | T. DOC | DOCUMENTO
  ================================================== */}

  <div
    className="
      grid
      grid-cols-[1fr_65px_125px]
    "
  >

    <CampoDato
      titulo="Nombre completo"
      valor={
        aprendiz.nombre_completo
      }
    />

    <CampoDato
      titulo="T. Doc"
      valor={
        aprendiz.tipo_doc
      }
    />

    <CampoDato
      titulo="Documento"
      valor={
        aprendiz.documento
      }
    />

  </div>


  {/* ==================================================
      FILA 2
      FECHA NACIMIENTO | DIRECCIÓN | BARRIO
  ================================================== */}

  <div
    className="
      grid
      grid-cols-[108px_1fr_190px]
    "
  >

    <CampoDato
      titulo="Fecha de nacimiento"
      valor={
        formatearFecha(
          aprendiz.fecha_nacimiento
        )
      }
    />

    <CampoDato
      titulo="Dirección"
      valor={
        aprendiz.direccion
      }
    />

    <CampoDato
      titulo="Barrio"
      valor={
        aprendiz.barrio
      }
    />

  </div>


  {/* ==================================================
      FILA 3
      CELULAR | CONVENIO | REF P
  ================================================== */}

  <div
    className="
      grid
      grid-cols-[108px_1fr_100px]
    "
  >

    <CampoDato
      titulo="Celular"
      valor={
        aprendiz.celular
      }
    />

    <CampoDato
      titulo="Convenio"
      valor={
        aprendiz.convenio
      }
    />

    <CampoDato
      titulo="Ref P"
      valor={
        referenciaPago
      }
    />

  </div>

</div>

  {/* ==================================================
      FOTO
  ================================================== */}

  <div
    className="
      border-l
      border-black
      flex
      flex-col
    "
  >

    
    <div
      className="
        flex-1
        min-h-[120px]
        flex
        items-center
        justify-center
        p-2
      "
    >

      {fotoUrl ? (
        <img
          src={
            fotoUrl
          }
          alt="Foto del aprendiz"
          className="
            w-full
            h-[110px]
            object-cover
          "
        />
      ) : (
        <div
          className="
            text-[8px]
            text-gray-400
            text-center
          "
        >
          FOTO DEL
          <br />
          APRENDIZ
        </div>
      )}

    </div>

  </div>


  {/* ==================================================
      HUELLA
  ================================================== */}

  <div
    className="
      border-l
      border-black
      flex
      flex-col
    "
  >
  

    <div
      className="
        flex-1
        min-h-[120px]
        flex
        items-center
        justify-center
        text-center
        text-[8px]
        text-gray-400
        p-2
      "
    >
      ESPACIO PARA
      <br />
      HUELLA DEL APRENDIZ
    </div>

  </div>

</div>

        </div>


        {/* ==================================================
            TEORÍA
        ================================================== */}

        {modulosTeoria.map(
          (
            modulo,
            index
          ) => (
            <TablaModulo
              key={
                modulo.id ||
                index
              }
              modulo={
                modulo
              }
              numeroModulo={
                index +
                1
              }
            />
          )
        )}


        {/* ==================================================
            TALLER
        ================================================== */}

        {modulosTaller.map(
          (
            modulo,
            index
          ) => (
            <TablaModulo
              key={
                modulo.id ||
                index
              }
              modulo={
                modulo
              }
              numeroModulo={
                modulosTeoria.length +
                index +
                1
              }
            />
          )
        )}


        {/* ==================================================
            AUTOEVALUACIÓN
        ================================================== */}

        <div
          className="
            mt-2
            border
            border-black
            text-[7.5px]
          "
        >

          <div
            className="
              bg-gray-200
              border-b
              border-black
              px-2
              py-1
              font-black
              text-[9px]
            "
          >
            {textos
              ?.autoevaluacion
              ?.titulo ||
              'AUTOEVALUACIÓN DEL APRENDIZ'}
          </div>

          <div
            className="
              px-2
              py-1.5
              leading-tight
            "
          >
            <p>
              {textos
                ?.autoevaluacion
                ?.parrafo_1 ||
                ''}
            </p>

            <p className="mt-1">
              {textos
                ?.autoevaluacion
                ?.parrafo_2 ||
                ''}
            </p>

            <div
              className="
                mt-3
                flex
                items-end
                gap-2
              "
            >
              <strong>
                Firma del aprendiz:
              </strong>

              <div
                className="
                  flex-1
                  border-b
                  border-black
                  h-4
                "
              ></div>
            </div>

          </div>

        </div>

      </section>


      {/* ====================================================
          PÁGINA 2
      ==================================================== */}

      <section
        className="
          hoja-control
          pagina-dos
          bg-white
          mx-auto
          mt-5
          shadow-lg
          p-[8mm]
        "
      >

        <EncabezadoDocumento
          encabezado={
            documento.encabezado
          }
          documento={
            documento
          }
          logo={
            documento.logo
          }
          pagina="2"
        />


        <div
          className="
            mt-2
            border
            border-black
          "
        >

          <div
            className="
              bg-gray-200
              border-b
              border-black
              px-2
              py-1
              text-[10px]
              font-black
              uppercase
            "
          >
            {textos
              ?.practica
              ?.titulo ||
              'MÓDULO III – FORMACIÓN PRÁCTICA'}
          </div>

          <div
            className="
              px-2
              py-1
              text-[7px]
              leading-tight
            "
          >
            {textos
              ?.practica
              ?.introduccion ||
              ''}
          </div>

        </div>


        {/* ==================================================
            LEYENDA
        ================================================== */}

        <div
          className="
            mt-1
            border
            border-black
            grid
            grid-cols-3
            text-[6.5px]
          "
        >

          <div
            className="
              px-2
              py-1
              border-r
              border-black
            "
          >
            <strong>
              S:
            </strong>{' '}

            {textos
              ?.practica
              ?.criterios
              ?.S ||
              'Desarrolla satisfactoriamente el contenido.'}
          </div>

          <div
            className="
              px-2
              py-1
              border-r
              border-black
            "
          >
            <strong>
              EP:
            </strong>{' '}

            {textos
              ?.practica
              ?.criterios
              ?.EP ||
              'Continúa consolidando la habilidad.'}
          </div>

          <div
            className="
              px-2
              py-1
            "
          >
            <strong>
              RR:
            </strong>{' '}

            {textos
              ?.practica
              ?.criterios
              ?.RR ||
              'Requiere reforzar el contenido.'}
          </div>

        </div>


        <TablaPractica
          clases={
            clasesPractica
          }
        />


        {/* ==================================================
            RESULTADO FINAL
        ================================================== */}

        <div
          className="
            mt-2
            border
            border-black
            text-[7px]
          "
        >

          <div
            className="
              bg-gray-200
              border-b
              border-black
              px-2
              py-1
              text-[9px]
              font-black
            "
          >
            RESULTADO FINAL DE LA FORMACIÓN PRÁCTICA
          </div>

          <div
            className="
              px-2
              py-1.5
            "
          >

            <div
            className="
              flex
              items-center
              gap-6
            "
          >
            <div
              className="
                flex
                items-center
                gap-1
              "
            >
              <span
                className="
                  text-[16px]
                  leading-none
                  relative
                  -top-[3px]
                "
              >
                □
              </span>

              <span>
                SATISFACTORIO
              </span>
            </div>

            <div
              className="
                flex
                items-center
                gap-1
              "
            >
              <span
                className="
                  text-[16px]
                  leading-none
                  relative
                  -top-[3px]
                "
              >
                □
              </span>

              <span>
                REQUIERE REFUERZO
              </span>
            </div>
          </div>

            <div className="mt-2">

              <strong>
                ASPECTOS QUE REQUIEREN REFUERZO
              </strong>

              <div
                className="
                  mt-1
                  h-[28px]
                  border
                  border-gray-500
                "
              ></div>

            </div>

            <div className="mt-2">

              <strong>
                APRECIACIÓN FINAL DEL INSTRUCTOR
              </strong>

              <div
                className="
                  mt-1
                  h-[28px]
                  border
                  border-gray-500
                "
              ></div>

            </div>

            <div
            className="
              mt-3
              grid
              grid-cols-[1.35fr_1fr_1fr_80px]
              gap-4
            "
          >

            <div>
              <strong>
                NOMBRE COMPLETO DEL INSTRUCTOR
              </strong>

              <div
                className="
                  mt-5
                  border-b
                  border-black
                "
              ></div>
            </div>

            <div>
              <strong>
                FIRMA DEL INSTRUCTOR
              </strong>

              <div
                className="
                  mt-5
                  border-b
                  border-black
                "
              ></div>
            </div>

            <div>
              <strong>
                FIRMA DEL APRENDIZ
              </strong>

              <div
                className="
                  mt-5
                  border-b
                  border-black
                "
              ></div>
            </div>

            <div>
              <strong>
                FECHA
              </strong>

              <div
                className="
                  mt-5
                  border-b
                  border-black
                "
              ></div>
            </div>

          </div>
          </div>

        </div>

      </section>


      {/* ====================================================
          ESTILOS DE IMPRESIÓN
      ==================================================== */}

      

    </div>
  )
}