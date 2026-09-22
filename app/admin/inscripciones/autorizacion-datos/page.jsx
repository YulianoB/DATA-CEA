// app/admin/inscripciones/autorizacion-datos/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'


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
  const cadena =
    texto(
      valor
    )

  if (
    !cadena
  ) {
    return ''
  }

  const fecha =
    cadena.slice(
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
    return cadena
  }

  return `${day}/${month}/${year}`
}


function normalizarTitulo(
  valor
) {
  return texto(
    valor
  )
    .normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toUpperCase()
}


function reemplazarDatosCEA(
  contenido,
  empresa,
  configuracion
) {
  let resultado =
    texto(
      contenido
    )

  const razonSocial =
    texto(
      empresa?.razon_social ||
      empresa?.nombre
    )

  const reemplazos = [
    [
      '[RAZÓN SOCIAL DEL CEA]',
      razonSocial,
    ],
    [
      '[RAZÓN SOCIAL]',
      razonSocial,
    ],
    [
      '[NIT]',
      texto(
        empresa?.nit
      ),
    ],
    [
      '[DIRECCIÓN]',
      texto(
        configuracion?.direccion_contacto ||
        empresa?.direccion
      ),
    ],
    [
      '[TELÉFONO]',
      texto(
        configuracion?.telefono_contacto ||
        empresa?.telefono
      ),
    ],
    [
      '[CORREO PROTECCIÓN DE DATOS / CORREO CEA]',
      texto(
        configuracion?.correo_proteccion_datos ||
        empresa?.correo
      ),
    ],
    [
      '[CORREO]',
      texto(
        configuracion?.correo_proteccion_datos ||
        empresa?.correo
      ),
    ],
    [
      '[MEDIO O UBICACIÓN DE LA POLÍTICA]',
      texto(
        configuracion?.medio_politica
      ),
    ],
  ]

  reemplazos.forEach(
    ([
      marcador,
      valor,
    ]) => {
      resultado =
        resultado.split(
          marcador
        ).join(
          valor || '-'
        )
    }
  )

  return resultado
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
      return formatearFecha(
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
            'AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES'}
        </div>
      </div>
    )
  }

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

                    if (
                      tipo ===
                      'VACIO'
                    ) {
                      return null
                    }

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
// SECCIÓN DEL DOCUMENTO
// ============================================================

function SeccionDocumento({
  titulo,
  contenido,
  children,
}) {
  return (
    <section
      className="
        mt-3
        text-[9.5px]
        leading-[1.42]
        text-black
      "
    >
      <h2
        className="
          mb-1
          text-[10px]
          font-black
          uppercase
        "
      >
        {titulo}
      </h2>

      {contenido && (
        <div
          className="
            whitespace-pre-line
            text-justify
          "
        >
          {contenido}
        </div>
      )}

      {children}
    </section>
  )
}


// ============================================================
// FINALIDADES OPCIONALES
// ============================================================

function TablaFinalidades({
  finalidades,
}) {
  if (
    !Array.isArray(
      finalidades
    ) ||
    finalidades.length ===
      0
  ) {
    return null
  }

  return (
    <section
      className="
        mt-3
      "
    >
      <h2
        className="
          mb-1
          text-[10px]
          font-black
          uppercase
        "
      >
        AUTORIZACIONES OPCIONALES
      </h2>

      <div
        className="
          mb-1
          text-[8.5px]
          leading-[1.35]
        "
      >
        Marque una sola opción para cada finalidad:
      </div>

      <table
        className="
          w-full
          table-fixed
          border-collapse
          text-[8.5px]
        "
      >
        <thead>
          <tr>
            <th
              className="
                border
                border-black
                bg-gray-100
                px-2
                py-1
                text-left
              "
            >
              FINALIDAD
            </th>

            <th
              className="
                w-[48px]
                border
                border-black
                bg-gray-100
                px-1
                py-1
                text-center
              "
            >
              SÍ
            </th>

            <th
              className="
                w-[48px]
                border
                border-black
                bg-gray-100
                px-1
                py-1
                text-center
              "
            >
              NO
            </th>
          </tr>
        </thead>

        <tbody>
          {finalidades.map(
            finalidad => (
              <tr
                key={
                  finalidad.id
                }
              >
                <td
                  className="
                    border
                    border-black
                    px-2
                    py-1.5
                    align-top
                  "
                >
                  {texto(
                    finalidad
                      ?.descripcion
                  )}
                </td>

                <td
                  className="
                    border
                    border-black
                    text-center
                    align-middle
                    text-[16px]
                    leading-none
                  "
                >
                  □
                </td>

                <td
                  className="
                    border
                    border-black
                    text-center
                    align-middle
                    text-[16px]
                    leading-none
                  "
                >
                  □
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </section>
  )
}


// ============================================================
// PÁGINA
// ============================================================

export default function AutorizacionDatosPage() {
  const router =
    useRouter()

  const [
    usuario,
    setUsuario,
  ] =
    useState(
      null
    )

  const [
    matriculaId,
    setMatriculaId,
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
          'No se recibió el identificador de la matrícula.'
        )

        setCargando(
          false
        )

        setUsuario(
          user
        )

        return
      }

      setUsuario(
        user
      )

      setMatriculaId(
        id
      )
    },
    [
      router,
    ]
  )


  // ==========================================================
  // CARGAR DOCUMENTO
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
              `/api/admin/documentos/autorizacion-datos?matricula_id=${encodeURIComponent(
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
              'No fue posible cargar la Autorización para el Tratamiento de Datos Personales.'
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
            'Error cargando autorización de datos:',
            err
          )

          if (
            activo
          ) {
            setError(
              err?.message ||
              'No fue posible cargar la Autorización para el Tratamiento de Datos Personales.'
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
  // CLASIFICAR SECCIONES CONFIGURADAS
  // ==========================================================

  const seccionesClasificadas =
    useMemo(
      () => {
        const secciones =
          Array.isArray(
            datos?.secciones
          )
            ? datos.secciones
            : []

        const resultado = {
          responsable:
            null,

          finalidadesNecesarias:
            null,

          derechos:
            null,

          canales:
            null,

          otras:
            [],
        }

        secciones.forEach(
          seccion => {
            const titulo =
              normalizarTitulo(
                seccion?.titulo
              )

            if (
              titulo.includes(
                'RESPONSABLE'
              )
            ) {
              resultado.responsable =
                seccion

              return
            }

            if (
              titulo.includes(
                'FINALIDADES NECESARIAS'
              )
            ) {
              resultado.finalidadesNecesarias =
                seccion

              return
            }

            if (
              titulo.includes(
                'DERECHOS'
              )
            ) {
              resultado.derechos =
                seccion

              return
            }

            if (
              titulo.includes(
                'CANALES'
              )
            ) {
              resultado.canales =
                seccion

              return
            }

            resultado.otras.push(
              seccion
            )
          }
        )

        return resultado
      },
      [
        datos,
      ]
    )


  // ==========================================================
  // ESTADOS DE PANTALLA
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
          Consultando autorización de datos...
        </div>
      </div>
    )
  }

  if (
    error
  ) {
    return (
      <div
        className="
          p-10
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
            text-white
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

  const aprendiz =
    datos?.aprendiz ||
    {}

  const documento =
    datos?.documento ||
    {}

  const encabezado =
    datos?.encabezado ||
    {}

  const logo =
    datos?.logo ||
    {}

  const configuracion =
    datos?.configuracion ||
    {}

  const finalidades =
    Array.isArray(
      datos?.finalidades
    )
      ? datos.finalidades.filter(
          item =>
            item?.requiere_respuesta !==
            false
        )
      : []




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
            Autorización para el Tratamiento de Datos Personales
          </div>

          <div
            className="
              text-[11px]
              text-gray-500
            "
          >
            Matrícula{' '}
            {aprendiz.consecutivo ||
              '-'}
            {' · '}
            Categoría{' '}
            {aprendiz.categoria ||
              '-'}
          </div>
        </div>

        <div
          className="
            flex
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
            <i
              className="
                fas
                fa-print
                mr-1
              "
            ></i>

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
            Regresar
          </button>
        </div>
      </div>


      {/* ====================================================
          PÁGINA 1
      ==================================================== */}

      <section
        className="
          hoja-autorizacion
          pagina-1
          bg-white
          mx-auto
          shadow-lg
          p-[8mm]
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
          pagina="1"
        />

        {seccionesClasificadas
          .responsable && (
          <SeccionDocumento
            titulo={
              seccionesClasificadas
                .responsable
                .titulo
            }
            contenido={
              reemplazarDatosCEA(
                seccionesClasificadas
                  .responsable
                  .contenido,
                empresa,
                configuracion
              )
            }
          />
        )}

        {seccionesClasificadas
          .finalidadesNecesarias && (
          <SeccionDocumento
            titulo={
              seccionesClasificadas
                .finalidadesNecesarias
                .titulo
            }
            contenido={
              reemplazarDatosCEA(
                seccionesClasificadas
                  .finalidadesNecesarias
                  .contenido,
                empresa,
                configuracion
              )
            }
          />
        )}

        <TablaFinalidades
          finalidades={
            finalidades
          }
        />

        <SeccionDocumento
          titulo="DATOS SENSIBLES Y BIOMÉTRICOS"
          contenido={
            reemplazarDatosCEA(
              configuracion
                ?.texto_datos_biometricos,
              empresa,
              configuracion
            )
          }
        >
          <div
            className="
              mt-2
              border
              border-black
              px-3
              py-2
            "
          >
            <div
              className="
                text-[8.5px]
                font-bold
                uppercase
                leading-[1.35]
              "
            >
              AUTORIZO EXPRESAMENTE EL TRATAMIENTO DE MIS DATOS
              BIOMÉTRICOS PARA LAS FINALIDADES INFORMADAS:
            </div>

            <div
              className="
                mt-2
                flex
                items-center
                gap-10
                text-[10px]
                font-bold
              "
            >
              <span>
                SÍ{' '}
                <span
                  className="
                    text-[18px]
                    font-normal
                    leading-none
                  "
                >
                  □
                </span>
              </span>

              <span>
                NO{' '}
                <span
                  className="
                    text-[18px]
                    font-normal
                    leading-none
                  "
                >
                  □
                </span>
              </span>
            </div>
          </div>
        </SeccionDocumento>

        <div
          className="
            mt-3
            text-[7.5px]
            leading-tight
            text-gray-600
          "
        >
          Responsable: {texto(
            empresa
              ?.razon_social ||
            empresa
              ?.nombre
          ) || '-'}
          {' · '}
          NIT {texto(
            empresa?.nit
          ) || '-'}
        </div>
      </section>


      {/* ====================================================
          PÁGINA 2
      ==================================================== */}

      <section
        className="
          hoja-autorizacion
          pagina-2
          bg-white
          mx-auto
          mt-5
          shadow-lg
          p-[8mm]
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
          pagina="2"
        />

        {seccionesClasificadas
          .derechos && (
          <SeccionDocumento
            titulo={
              seccionesClasificadas
                .derechos
                .titulo
            }
            contenido={
              reemplazarDatosCEA(
                seccionesClasificadas
                  .derechos
                  .contenido,
                empresa,
                configuracion
              )
            }
          />
        )}

        {seccionesClasificadas
          .canales && (
          <SeccionDocumento
            titulo={
              seccionesClasificadas
                .canales
                .titulo
            }
            contenido={
              reemplazarDatosCEA(
                seccionesClasificadas
                  .canales
                  .contenido,
                empresa,
                configuracion
              )
            }
          />
        )}

        {seccionesClasificadas
          .otras.map(
            seccion => (
              <SeccionDocumento
                key={
                  seccion.id
                }
                titulo={
                  seccion.titulo
                }
                contenido={
                  reemplazarDatosCEA(
                    seccion.contenido,
                    empresa,
                    configuracion
                  )
                }
              />
            )
          )}

        <SeccionDocumento
          titulo="TRATAMIENTO DE DATOS DE MENORES DE EDAD"
          contenido={
            reemplazarDatosCEA(
              configuracion
                ?.texto_menores_edad,
              empresa,
              configuracion
            )
          }
        />

        <SeccionDocumento
          titulo="DECLARACIÓN Y AUTORIZACIÓN"
          contenido={
            reemplazarDatosCEA(
              configuracion
                ?.texto_declaracion_final,
              empresa,
              configuracion
            )
          }
        />

        {/* ==================================================
            DATOS DEL ASPIRANTE
        ================================================== */}

        <section
          className="
            mt-4
            text-[9px]
            leading-[1.55]
          "
        >
          <h2
            className="
              mb-2
              text-[10px]
              font-black
              uppercase
            "
          >
            DATOS DEL ASPIRANTE Y FIRMA
          </h2>

          <div className="space-y-1">
            <div>
              <span className="font-bold">ASPIRANTE:</span>{' '}
              {aprendiz?.nombre_completo || '-'}
            </div>

            <div>
              <span className="font-bold">DOCUMENTO:</span>{' '}
              {texto(
                aprendiz?.tipo_documento
              )}
              {texto(
                aprendiz?.tipo_documento
              )
                ? ' '
                : ''}
              {texto(
                aprendiz?.documento
              ) || '-'}
            </div>

            <div>
              <span className="font-bold">MATRÍCULA:</span>{' '}
              {aprendiz?.consecutivo || '-'}
            </div>

            <div>
              <span className="font-bold">CATEGORÍA:</span>{' '}
              {aprendiz?.categoria || '-'}
            </div>

            <div>
              <span className="font-bold">FECHA:</span>{' '}
              {formatearFecha(
                aprendiz?.fecha_matricula
              ) || '-'}
            </div>
          </div>

          <div
            className="
              mt-10
              w-[85mm]
            "
          >
            <div className="border-t border-black"></div>
            <div
              className="
                pt-1
                text-[8.5px]
                font-bold
                uppercase
              "
            >
              Firma del aspirante
            </div>
          </div>
        </section>


        {/* ==================================================
            REPRESENTANTE LEGAL - SOLO MENOR DE EDAD
        ================================================== */}

        {aprendiz
          ?.es_menor_edad ===
          true && (
          <section
            className="
              mt-3
            "
          >
            <h2
              className="
                mb-2
                text-[10px]
                font-black
                uppercase
              "
            >
              REPRESENTANTE LEGAL DEL MENOR
            </h2>

            <div
              className="
                border-t
                border-black
                text-[9px]
              "
            >
              <div
                className="
                  grid
                  grid-cols-[34mm_1fr]
                  border-x
                  border-b
                  border-black
                "
              >
                <div
                  className="
                    border-r
                    border-black
                    px-2
                    py-1.5
                    font-bold
                  "
                >
                  NOMBRE
                </div>

                <div
                  className="
                    px-2
                    py-1.5
                  "
                >
                  {aprendiz
                    ?.representante_legal
                    ?.nombre ||
                    '-'}
                </div>
              </div>

              <div
                className="
                  grid
                  grid-cols-[34mm_1fr]
                  border-x
                  border-b
                  border-black
                "
              >
                <div
                  className="
                    border-r
                    border-black
                    px-2
                    py-1.5
                    font-bold
                  "
                >
                  DOCUMENTO
                </div>

                <div
                  className="
                    px-2
                    py-1.5
                  "
                >
                  {texto(
                    aprendiz
                      ?.representante_legal
                      ?.tipo_documento
                  )}
                  {texto(
                    aprendiz
                      ?.representante_legal
                      ?.tipo_documento
                  )
                    ? ' '
                    : ''}
                  {texto(
                    aprendiz
                      ?.representante_legal
                      ?.documento
                  ) ||
                    '-'}
                </div>
              </div>

              <div
                className="
                  grid
                  min-h-[18mm]
                  grid-cols-[34mm_1fr]
                  border-x
                  border-b
                  border-black
                "
              >
                <div
                  className="
                    flex
                    items-end
                    border-r
                    border-black
                    px-2
                    py-1.5
                    font-bold
                  "
                >
                  FIRMA
                </div>

                <div
                  className="
                    flex
                    items-end
                    px-2
                    py-1.5
                  "
                >
                  ________________________________________________
                </div>
              </div>
            </div>
          </section>
        )}
      </section>

      <style>{`
        @page {
          size: Letter portrait;
          margin: 0;
        }

        .hoja-autorizacion {
          width: 216mm;
          min-height: 279mm;
          box-sizing: border-box;
        }

        .pagina-1 {
          break-after: page;
          page-break-after: always;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .hoja-autorizacion {
            width: 216mm !important;
            min-height: 279mm !important;
            margin: 0 auto !important;
            padding: 8mm !important;
            box-shadow: none !important;
            background: white !important;
            overflow: hidden;
          }

          .pagina-1 {
            break-after: page;
            page-break-after: always;
          }

          .pagina-2 {
            margin-top: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
