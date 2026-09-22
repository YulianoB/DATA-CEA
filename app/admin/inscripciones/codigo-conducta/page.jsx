// app/admin/inscripciones/codigo-conducta/page.jsx

'use client'

import {
  useEffect,
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
      return `${pagina} de 1`

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
            'CÓDIGO DE CONDUCTA DEL ASPIRANTE'}
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
// SECCIÓN DEL CÓDIGO
// ============================================================

function SeccionCodigo({
  seccion,
  compacta = false,
}) {
  return (
    <section
      className={`
        codigo-seccion
        ${
          compacta
            ? 'codigo-seccion-compacta'
            : ''
        }
      `}
    >
      <h2
        className="
          codigo-seccion-titulo
        "
      >
        {seccion?.titulo ||
          ''}
      </h2>

      <div
        className="
          codigo-seccion-contenido
        "
      >
        {seccion?.contenido ||
          ''}
      </div>
    </section>
  )
}


// ============================================================
// PÁGINA
// ============================================================

export default function CodigoConductaPage() {
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

      if (
        !id
      ) {
        setError(
          'No se recibió la matrícula que se desea consultar.'
        )

        setCargando(
          false
        )

        return
      }

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
  // CONSULTAR CÓDIGO DE CONDUCTA
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
              `/api/admin/documentos/codigo-conducta?matricula_id=${encodeURIComponent(
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
              'No fue posible cargar el Código de Conducta.'
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
            'Error cargando Código de Conducta:',
            err
          )

          if (
            activo
          ) {
            setError(
              err?.message ||
              'No fue posible cargar el Código de Conducta.'
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
        <div
          className="
            text-sm
            text-gray-600
          "
        >
          <i className="fas fa-spinner fa-spin mr-2" />

          Consultando Código de Conducta...
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
      <div
        className="
          min-h-screen
          bg-gray-100
          p-6
        "
      >
        <div
          className="
            mx-auto
            max-w-2xl
            rounded-lg
            border
            border-red-300
            bg-white
            p-6
            shadow-sm
          "
        >
          <h1
            className="
              text-xl
              font-bold
              text-red-700
            "
          >
            Error
          </h1>

          <p
            className="
              mt-3
              text-sm
              text-gray-700
            "
          >
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="
              mt-4
              rounded
              bg-gray-600
              px-4
              py-2
              text-sm
              text-white
              hover:bg-gray-700
            "
          >
            Regresar
          </button>
        </div>
      </div>
    )
  }


  // ==========================================================
  // DATOS
  // ==========================================================

  const documento =
    datos?.documento ||
    {}

  const encabezado =
    datos?.encabezado ||
    {}

  const logo =
    datos?.logo ||
    {}

  const matricula =
    datos?.matricula ||
    {}

  const aprendiz =
    datos?.aprendiz ||
    {}

  const secciones =
    Array.isArray(
      datos?.secciones
    )
      ? datos.secciones
      : []

  const introduccion =
    secciones[0] ||
    null

  const seccionesColumnas =
    secciones.slice(
      1,
      3
    )

  const seccionesFinales =
    secciones.slice(
      3
    )


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
          mx-auto
          mb-4
          flex
          max-w-[216mm]
          flex-wrap
          items-center
          justify-between
          gap-3
          rounded-lg
          border
          border-gray-300
          bg-white
          p-3
          shadow-sm
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
            Código de Conducta
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
            onClick={() =>
              window.print()
            }
            className="
              rounded
              bg-emerald-600
              px-3
              py-2
              text-xs
              text-white
              hover:bg-emerald-700
            "
          >
            <i className="fas fa-print mr-1" />

            Imprimir
          </button>

          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="
              rounded
              bg-gray-600
              px-3
              py-2
              text-xs
              text-white
              hover:bg-gray-700
            "
          >
            <i className="fas fa-arrow-left mr-1" />

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
              rounded
              bg-red-600
              px-3
              py-2
              text-xs
              text-white
              hover:bg-red-700
            "
          >
            <i className="fas fa-sign-out-alt mr-1" />

            Cerrar Sesión
          </button>
        </div>
      </div>


      {/* ====================================================
          HOJA
      ==================================================== */}

      <main
        className="
          hoja-codigo-conducta
          mx-auto
          bg-white
          shadow-xl
        "
      >
        <EncabezadoDocumento
          encabezado={
            encabezado
          }
          documento={
            documento
          }
          logo={
            logo
          }
          pagina={
            1
          }
        />


        {/* ==================================================
            CONTENIDO
        ================================================== */}

        <div
          className="
            codigo-contenido
          "
        >
          {introduccion && (
            <SeccionCodigo
              seccion={
                introduccion
              }
              compacta
            />
          )}


          {seccionesColumnas.length >
            0 && (
            <div
              className="
                codigo-columnas
              "
            >
              {seccionesColumnas.map(
                seccion => (
                  <SeccionCodigo
                    key={
                      seccion.id
                    }
                    seccion={
                      seccion
                    }
                    compacta
                  />
                )
              )}
            </div>
          )}


          {seccionesFinales.map(
            seccion => (
              <SeccionCodigo
                key={
                  seccion.id
                }
                seccion={
                  seccion
                }
                compacta
              />
            )
          )}


          {/* ================================================
              DATOS Y FIRMA DEL ASPIRANTE
          ================================================ */}

          <section
            className="
              codigo-aceptacion
            "
          >
            <div
              className="
                codigo-datos
              "
            >
              <div
                className="
                  codigo-dato-fila
                "
              >
                <span>
                  ASPIRANTE:
                </span>

                <strong>
                  {aprendiz
                    ?.nombre_completo ||
                    '-'}
                </strong>
              </div>

              <div
                className="
                  codigo-dato-fila
                "
              >
                <span>
                  DOCUMENTO:
                </span>

                <strong>
                  {[
                    aprendiz?.tipo_doc,
                    aprendiz?.documento,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      ' '
                    ) ||
                    '-'}
                </strong>
              </div>

              <div
                className="
                  codigo-dato-fila
                "
              >
                <span>
                  MATRÍCULA:
                </span>

                <strong>
                  {matricula
                    ?.consecutivo ||
                    '-'}
                </strong>
              </div>

              <div
                className="
                  codigo-dato-fila
                "
              >
                <span>
                  CATEGORÍA:
                </span>

                <strong>
                  {matricula
                    ?.categoria ||
                    '-'}
                </strong>
              </div>

              <div
                className="
                  codigo-dato-fila
                "
              >
                <span>
                  FECHA:
                </span>

                <strong>
                  {formatearFecha(
                    matricula
                      ?.fecha_matricula
                  ) ||
                    '-'}
                </strong>
              </div>

              <div
                className="
                  codigo-firma
                "
              >
                <span>
                  FIRMA DEL ASPIRANTE:
                </span>

                <div
                  className="
                    codigo-linea-firma
                  "
                />
              </div>
            </div>
          </section>
        </div>
      </main>


      {/* ====================================================
          ESTILOS DE PANTALLA E IMPRESIÓN
      ==================================================== */}

      <style>{`
        .hoja-codigo-conducta {
          width: 216mm;
          min-height: 279mm;
          box-sizing: border-box;
          padding: 9mm;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
        }

        .codigo-contenido {
          padding-top: 4mm;
        }

        .codigo-seccion {
          margin-top: 3mm;
        }

        .codigo-seccion:first-child {
          margin-top: 0;
        }

        .codigo-seccion-titulo {
          margin: 0 0 1.5mm 0;
          padding: 1.4mm 1.8mm;
          border: 1px solid #111827;
          background: #f3f4f6;
          font-size: 8.8px;
          font-weight: 800;
          line-height: 1.15;
          text-align: center;
          text-transform: uppercase;
        }

        .codigo-seccion-contenido {
          white-space: pre-line;
          text-align: justify;
          font-size: 7.8px;
          line-height: 1.3;
        }

        .codigo-seccion-compacta .codigo-seccion-contenido {
          font-size: 7.6px;
          line-height: 1.27;
        }

        .codigo-columnas {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5mm;
          align-items: start;
          margin-top: 3mm;
        }

        .codigo-columnas .codigo-seccion {
          margin-top: 0;
        }

        .codigo-aceptacion {
          margin-top: 4mm;
          border-top: 1px solid #111827;
          padding-top: 3mm;
        }

        .codigo-datos {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2.2mm;
          width: 100%;
          font-size: 8px;
          line-height: 1.25;
        }

        .codigo-dato-fila {
          display: flex;
          align-items: baseline;
          gap: 2mm;
          width: 100%;
        }

        .codigo-dato-fila span {
          width: 29mm;
          flex: 0 0 29mm;
          font-weight: 800;
        }

        .codigo-dato-fila strong {
          font-weight: 700;
          text-transform: uppercase;
        }

        .codigo-firma {
          display: flex;
          align-items: flex-end;
          gap: 2mm;
          width: 100%;
          margin-top: 8mm;
          text-align: left;
          font-size: 8px;
          font-weight: 800;
        }

        .codigo-firma span {
          width: 38mm;
          flex: 0 0 38mm;
        }

        .codigo-linea-firma {
          width: 78mm;
          height: 8mm;
          border-bottom: 1px solid #111827;
        }

        @media print {
          @page {
            size: Letter portrait;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          .hoja-codigo-conducta,
          .hoja-codigo-conducta * {
            visibility: visible;
          }

          .no-print {
            display: none !important;
          }

          .hoja-codigo-conducta {
            position: absolute;
            left: 0;
            top: 0;
            width: 216mm;
            height: 279mm;
            min-height: 279mm;
            margin: 0 !important;
            padding: 9mm;
            box-shadow: none !important;
            overflow: hidden;
          }

          .codigo-seccion {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .codigo-aceptacion {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
