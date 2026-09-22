// app/admin/pesv/riesgos/imprimir/page.jsx

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
// HELPERS GENERALES
// app/admin/pesv/riesgos/imprimir/page.jsx
// ============================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function normalizar(
  valor
) {
  return texto(
    valor
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toUpperCase()
}


function etiqueta(
  valor
) {
  return texto(
    valor
  ).replaceAll(
    '_',
    ' '
  )
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
    anio,
    mes,
    dia,
  ] =
    fecha.split(
      '-'
    )

  if (
    !anio ||
    !mes ||
    !dia
  ) {
    return (
      texto(
        valor
      ) ||
      '-'
    )
  }

  return `${dia}/${mes}/${anio}`
}


// ============================================================
// VALOR DE ELEMENTOS DEL ENCABEZADO
// app/admin/pesv/riesgos/imprimir/page.jsx
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
      return documento
        ?.vigencia
        ? formatearFecha(
            documento.vigencia
          )
        : ''

    case 'PAGINACION':
      return `${pagina || 1} de 1`

    default:
      return ''
  }
}


// ============================================================
// ENCABEZADO DOCUMENTAL CONFIGURADO POR CADA CEA
// app/admin/pesv/riesgos/imprimir/page.jsx
// Fuente: /api/admin/configuracion-documentos
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
      ? estructura
          .configuracion
      : {}

  const cantidadFilas =
    Number(
      encabezado
        ?.filas
    ) ||
    filas.length ||
    2

  const cantidadColumnas =
    Number(
      encabezado
        ?.columnas
    ) ||
    columnas.length ||
    3


  // ==========================================================
  // ANCHOS
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

        return (
          Number.isFinite(
            ancho
          ) &&
          ancho > 0
            ? ancho
            : 1
        )
      }
    )


  // ==========================================================
  // ALTURAS
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

        return (
          Number.isFinite(
            alto
          ) &&
          alto > 0
            ? `${alto}mm`
            : 'auto'
        )
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
  // RESPALDO SI NO EXISTE DISEÑO
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
          p-3
          text-center
        "
      >
        <div
          className="
            text-[12px]
            font-black
            uppercase
          "
        >
          {documento
            ?.nombre_documento ||
            'MATRIZ DE RIESGOS PESV'}
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
              celda
                ?.fila
            ) ||
            1

          const columna =
            Number(
              celda
                ?.columna
            ) ||
            1

          const rowSpan =
            Number(
              celda
                ?.rowSpan ??
                celda
                  ?.row_span
            ) ||
            1

          const colSpan =
            Number(
              celda
                ?.colSpan ??
                celda
                  ?.col_span
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
                    // TEXTO / DATOS DOCUMENTALES
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
// CONTEXTO DE EXPOSICIÓN
// app/admin/pesv/riesgos/imprimir/page.jsx
// ============================================================

function nombreContexto(
  valor
) {
  const clave =
    normalizar(
      valor
    )

  if (
    clave ===
    'FORMACION_PRACTICA'
  ) {
    return 'Formación práctica'
  }

  if (
    clave ===
    'DESPLAZAMIENTO_EN_MISION'
  ) {
    return 'Desplazamiento en misión'
  }

  if (
    clave ===
    'IN_ITINERE'
  ) {
    return 'In itinere'
  }

  if (
    clave ===
    'ENTORNO_SEDE'
  ) {
    return 'Entorno sede'
  }

  return (
    etiqueta(
      valor
    ) ||
    '-'
  )
}


// ============================================================
// VALORACIÓN
// app/admin/pesv/riesgos/imprimir/page.jsx
// ============================================================

function calcularNr(
  riesgo
) {
  const guardado =
    Number(
      riesgo
        ?.valor_nivel_riesgo
    )

  if (
    Number.isFinite(
      guardado
    ) &&
    guardado > 0
  ) {
    return guardado
  }

  const exposicion =
    Number(
      riesgo
        ?.exposicion
    )

  const probabilidad =
    Number(
      riesgo
        ?.probabilidad
    )

  if (
    ![
      1,
      2,
      3,
    ].includes(
      exposicion
    ) ||
    ![
      1,
      2,
      3,
    ].includes(
      probabilidad
    )
  ) {
    return null
  }

  return (
    exposicion *
    probabilidad
  )
}


function calcularNivel(
  riesgo
) {
  const guardado =
    normalizar(
      riesgo
        ?.nivel_riesgo
    )

  if (
    [
      'BAJO',
      'MODERADO',
      'CRITICO',
    ].includes(
      guardado
    )
  ) {
    return guardado
  }

  const nr =
    calcularNr(
      riesgo
    )

  if (
    nr === null
  ) {
    return ''
  }

  if (
    nr >= 6
  ) {
    return 'CRITICO'
  }

  if (
    nr >= 3
  ) {
    return 'MODERADO'
  }

  return 'BAJO'
}


function nombreExposicion(
  valor
) {
  const numero =
    Number(
      valor
    )

  if (
    numero === 1
  ) {
    return 'Esporádica'
  }

  if (
    numero === 2
  ) {
    return 'Ocasional'
  }

  if (
    numero === 3
  ) {
    return 'Frecuente'
  }

  return '-'
}


function nombreProbabilidad(
  valor
) {
  const numero =
    Number(
      valor
    )

  if (
    numero === 1
  ) {
    return 'No es probable'
  }

  if (
    numero === 2
  ) {
    return 'Poco probable'
  }

  if (
    numero === 3
  ) {
    return 'Muy probable'
  }

  return '-'
}


function nombreSeveridad(
  valor
) {
  const numero =
    Number(
      valor
    )

  if (
    numero === 1
  ) {
    return 'Leve'
  }

  if (
    numero === 2
  ) {
    return 'Grave'
  }

  if (
    numero === 3
  ) {
    return 'Muy grave'
  }

  return (
    texto(
      valor
    ) ||
    '-'
  )
}


// ============================================================
// PROGRAMAS
// app/admin/pesv/riesgos/imprimir/page.jsx
// ============================================================

function programasRiesgo(
  riesgo
) {
  const programas =
    Array.isArray(
      riesgo
        ?.programas
    )
      ? riesgo.programas
      : []

  if (
    programas.length ===
    0
  ) {
    return '-'
  }

  return (
    programas
      .map(
        programa => {
          const codigo =
            texto(
              programa
                ?.codigo
            )

          const nombre =
            texto(
              programa
                ?.nombre
            )

          return [
            codigo,
            nombre,
          ]
            .filter(
              Boolean
            )
            .join(
              ' - '
            )
        }
      )
      .filter(
        Boolean
      )
      .join(
        ' / '
      ) ||
    '-'
  )
}


// ============================================================
// MEDIDAS / CONTROLES
// app/admin/pesv/riesgos/imprimir/page.jsx
// ============================================================

function medidasRiesgo(
  riesgo
) {
  const medidas =
    Array.isArray(
      riesgo
        ?.medidas
    )
      ? riesgo.medidas
      : []

  if (
    medidas.length ===
    0
  ) {
    const legado =
      [
        texto(
          riesgo
            ?.control_existente
        ),

        texto(
          riesgo
            ?.tratamiento
        ),

        texto(
          riesgo
            ?.accion_propuesta
        ),
      ].filter(
        Boolean
      )

    return legado.length
      ? legado.join(
          ' / '
        )
      : '-'
  }

  return (
    medidas
      .map(
        medida => {
          const origen =
            normalizar(
              medida
                ?.origen
            )

          const descripcion =
            texto(
              medida
                ?.descripcion
            )

          if (
            !descripcion
          ) {
            return ''
          }

          if (
            origen ===
            'EXISTENTE'
          ) {
            return `Existente: ${descripcion}`
          }

          if (
            origen ===
            'PROPUESTA'
          ) {
            return `Propuesta: ${descripcion}`
          }

          return descripcion
        }
      )
      .filter(
        Boolean
      )
      .join(
        ' / '
      ) ||
    '-'
  )
}


// ============================================================
// RESPONSABLE
// app/admin/pesv/riesgos/imprimir/page.jsx
// ============================================================

function nombreResponsable(
  riesgo,
  personal
) {
  const registrado =
    texto(
      riesgo
        ?.responsable_nombre
    )

  if (
    registrado
  ) {
    return registrado
  }

  const id =
    riesgo
      ?.responsable_personal_id

  if (
    !id
  ) {
    return '-'
  }

  const persona =
    personal.find(
      item =>
        String(
          item.id
        ) ===
        String(
          id
        )
    )

  if (
    !persona
  ) {
    return '-'
  }

  return (
    texto(
      persona
        ?.nombre_completo
    ) ||
    [
      texto(
        persona
          ?.nombres
      ),

      texto(
        persona
          ?.apellidos
      ),
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      ) ||
    '-'
  )
}


// ============================================================
// CLASE NIVEL
// app/admin/pesv/riesgos/imprimir/page.jsx
// ============================================================

function claseNivel(
  nivel
) {
  const valor =
    normalizar(
      nivel
    )

  if (
    valor ===
    'CRITICO'
  ) {
    return `
      bg-red-600
      text-white
    `
  }

  if (
    valor ===
    'MODERADO'
  ) {
    return `
      bg-amber-300
      text-black
    `
  }

  if (
    valor ===
    'BAJO'
  ) {
    return `
      bg-green-500
      text-white
    `
  }

  return `
    bg-gray-100
    text-black
  `
}


// ============================================================
// CELDA DE MATRIZ
// app/admin/pesv/riesgos/imprimir/page.jsx
// ============================================================

function CeldaDato({
  children,
  className = '',
}) {
  return (
    <td
      className={`
        border
        border-black
        px-[1.2mm]
        py-[1.1mm]
        align-top
        text-[5.6px]
        leading-[1.18]
        text-black
        break-words
        ${className}
      `}
    >
      {children}
    </td>
  )
}


// ============================================================
// PÁGINA
// app/admin/pesv/riesgos/imprimir/page.jsx
// ============================================================

export default function ImprimirMatrizRiesgosPage() {
  const router =
    useRouter()

  const [
    user,
    setUser,
  ] =
    useState(null)

  const [
    anio,
    setAnio,
  ] =
    useState(null)

  const [
    cargando,
    setCargando,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    logo,
    setLogo,
  ] =
    useState(null)

  const [
    riesgos,
    setRiesgos,
  ] =
    useState([])

  const [
    personal,
    setPersonal,
  ] =
    useState([])

  const [
    encabezado,
    setEncabezado,
  ] =
    useState(null)

  const [
    documento,
    setDocumento,
  ] =
    useState(null)


  // ==========================================================
  // CONFIGURACIÓN OFICIO HORIZONTAL
  // app/admin/pesv/riesgos/imprimir/page.jsx
  // globals.css:
  // html-matriz-riesgos-pesv
  // body-matriz-riesgos-pesv
  // ==========================================================

  useEffect(
    () => {
      document
        .documentElement
        .classList
        .add(
          'html-matriz-riesgos-pesv'
        )

      document
        .body
        .classList
        .add(
          'body-matriz-riesgos-pesv'
        )

      return () => {
        document
          .documentElement
          .classList
          .remove(
            'html-matriz-riesgos-pesv'
          )

        document
          .body
          .classList
          .remove(
            'body-matriz-riesgos-pesv'
          )
      }
    },
    []
  )


  // ==========================================================
  // SESIÓN + VIGENCIA
  // app/admin/pesv/riesgos/imprimir/page.jsx
  // ==========================================================

  useEffect(
    () => {
      let currentUser

      try {
        currentUser =
          JSON.parse(
            localStorage.getItem(
              'currentUser'
            ) ||
              'null'
          )
      } catch {
        currentUser =
          null
      }

      if (
        !currentUser
      ) {
        router.replace(
          '/login'
        )

        return
      }

      const parametros =
        new URLSearchParams(
          window.location.search
        )

      const anioParametro =
        Number(
          parametros.get(
            'anio'
          )
        )

      const actual =
        new Date()
          .getFullYear()

      setUser(
        currentUser
      )

      setAnio(
        Number.isFinite(
          anioParametro
        ) &&
        anioParametro > 0
          ? anioParametro
          : actual
      )
    },
    [
      router,
    ]
  )


  // ==========================================================
  // GET MATRIZ + CONFIGURACIÓN DOCUMENTAL
  // app/admin/pesv/riesgos/imprimir/page.jsx
  //
  // API 1:
  // /api/admin/pesv/riesgos
  //
  // API 2:
  // /api/admin/configuracion-documentos
  // ==========================================================

  useEffect(
    () => {
      if (
        !user ||
        !anio
      ) {
        return
      }

      const nit =
        obtenerNitUsuario(
          user
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
        try {
          setCargando(
            true
          )

          setError(
            ''
          )


          const parametrosRiesgos =
            new URLSearchParams({
              nit,

              anio:
                String(
                  anio
                ),
            })


          const parametrosConfiguracion =
            new URLSearchParams({
              nit,
            })


          const [
            respuestaRiesgos,
            respuestaConfiguracion,
          ] =
            await Promise.all([
              fetch(
                `/api/admin/pesv/riesgos?${parametrosRiesgos.toString()}`,
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
              ),

              fetch(
                `/api/admin/configuracion-documentos?${parametrosConfiguracion.toString()}`,
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
              ),
            ])


          const [
            dataRiesgos,
            dataConfiguracion,
          ] =
            await Promise.all([
              respuestaRiesgos
                .json(),

              respuestaConfiguracion
                .json(),
            ])


          if (
            !respuestaRiesgos.ok ||
            dataRiesgos?.ok !==
              true
          ) {
            throw new Error(
              dataRiesgos
                ?.error ||
                'No fue posible consultar la Matriz de Riesgos PESV.'
            )
          }


          if (
            !respuestaConfiguracion.ok ||
            dataConfiguracion?.ok !==
              true
          ) {
            throw new Error(
              dataConfiguracion
                ?.error ||
                'No fue posible consultar la configuración documental.'
            )
          }


          if (
            !activo
          ) {
            return
          }


          // ==================================================
          // MATRIZ
          // ==================================================

          setLogo(
            dataRiesgos
              ?.logo ||
              null
          )

          setRiesgos(
            Array.isArray(
              dataRiesgos
                ?.riesgos
            )
              ? dataRiesgos.riesgos
              : []
          )

          setPersonal(
            Array.isArray(
              dataRiesgos
                ?.personal
            )
              ? dataRiesgos.personal
              : []
          )


          // ==================================================
          // ENCABEZADO GENERAL CONFIGURADO POR EL CEA
          // ==================================================

          setEncabezado(
            dataConfiguracion
              ?.encabezado ||
              null
          )


          // ==================================================
          // BUSCAR DOCUMENTO MATRIZ DE RIESGOS
          // Configuración > Otros Documentos
          // ==================================================

          const documentos =
            Array.isArray(
              dataConfiguracion
                ?.documentos
            )
              ? dataConfiguracion.documentos
              : []


          const documentoMatriz =
            documentos.find(
              item => {
                const tipo =
                  normalizar(
                    item
                      ?.tipo_documento
                  )

                const nombre =
                  normalizar(
                    item
                      ?.nombre_documento
                  )

                return (
                  (
                    tipo.includes(
                      'MATRIZ'
                    ) &&
                    tipo.includes(
                      'RIESGO'
                    )
                  ) ||
                  (
                    nombre.includes(
                      'MATRIZ'
                    ) &&
                    nombre.includes(
                      'RIESGO'
                    )
                  )
                )
              }
            )


         // ==================================================
        // VALIDAR DOCUMENTO MATRIZ DE RIESGOS
        // app/admin/pesv/riesgos/imprimir/page.jsx
        // El nombre, versión, vigencia y demás datos
        // deben provenir de Configuración de Documentos.
        // ==================================================

        if (
        !documentoMatriz
        ) {
        throw new Error(
            'No se encontró la configuración documental de la Matriz de Riesgos. Revise Configuración de Documentos > Otros Documentos.'
        )
        }

        if (
        documentoMatriz
            ?.activo ===
        false
        ) {
        throw new Error(
            'La Matriz de Riesgos se encuentra inactiva en Configuración de Documentos.'
        )
        }

        setDocumento(
        documentoMatriz
        )
        } catch (
          err
        ) {
          console.error(
            'Error cargando documento Matriz de Riesgos PESV:',
            err
          )

          if (
            activo
          ) {
            setError(
              err?.message ||
                'No fue posible preparar el documento.'
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
      user,
      anio,
    ]
  )


  // ==========================================================
  // RIESGOS ORDENADOS
  // app/admin/pesv/riesgos/imprimir/page.jsx
  // ==========================================================

  const riesgosOrdenados =
    useMemo(
      () => {
        return [
          ...riesgos,
        ].sort(
          (
            a,
            b
          ) => {
            const codigoA =
              texto(
                a
                  ?.codigo
              )

            const codigoB =
              texto(
                b
                  ?.codigo
              )

            return codigoA.localeCompare(
              codigoB,
              'es',
              {
                numeric:
                  true,
              }
            )
          }
        )
      },
      [
        riesgos,
      ]
    )


  // ==========================================================
  // RESUMEN
  // app/admin/pesv/riesgos/imprimir/page.jsx
  // ==========================================================

  const resumen =
    useMemo(
      () => {
        const total =
          riesgosOrdenados.length

        const bajos =
          riesgosOrdenados.filter(
            riesgo =>
              calcularNivel(
                riesgo
              ) ===
              'BAJO'
          ).length

        const moderados =
          riesgosOrdenados.filter(
            riesgo =>
              calcularNivel(
                riesgo
              ) ===
              'MODERADO'
          ).length

        const criticos =
          riesgosOrdenados.filter(
            riesgo =>
              calcularNivel(
                riesgo
              ) ===
              'CRITICO'
          ).length

        return {
          total,
          bajos,
          moderados,
          criticos,
        }
      },
      [
        riesgosOrdenados,
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
          <i
            className="
              fas
              fa-spinner
              fa-spin
              mr-2
            "
          ></i>

          Preparando Matriz de Riesgos PESV...
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
            max-w-2xl
            mx-auto
            bg-white
            border
            border-red-200
            rounded-xl
            shadow-sm
            p-5
          "
        >
          <div
            className="
              text-lg
              font-black
              text-red-700
            "
          >
            No fue posible generar el documento
          </div>

          <p
            className="
              mt-2
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
              bg-gray-700
              hover:bg-gray-800
              text-white
              px-4
              py-2
              rounded
              text-xs
            "
          >
            <i
              className="
                fas
                fa-arrow-left
                mr-2
              "
            ></i>

            Regresar
          </button>
        </div>
      </div>
    )
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        documento-matriz-riesgos-pesv
        min-h-screen
        bg-gray-200
        py-5
        overflow-x-auto
      "
    >

      {/* ====================================================
          BARRA DE ACCIONES
          NO SE IMPRIME
      ==================================================== */}

      <div
        className="
          no-print
          max-w-[330.2mm]
          mx-auto
          mb-4
          bg-white
          border
          border-gray-300
          rounded-lg
          shadow-sm
          p-3
          flex
          flex-col
          sm:flex-row
          sm:items-center
          sm:justify-between
          gap-3
        "
      >
        <div>
          <div
            className="
              text-sm
              font-black
              text-gray-800
            "
          >
            Matriz de Identificación, Análisis,
            Valoración y Tratamiento de Riesgos
            Viales
          </div>

          <div
            className="
              mt-0.5
              text-[10px]
              text-gray-500
            "
          >
            Vigencia{' '}

            <strong>
              {anio}
            </strong>

            {' · '}

            {riesgosOrdenados.length}{' '}
            riesgo(s)

            {' · '}

            Oficio horizontal
          </div>
        </div>


        <div
          className="
            flex
            flex-wrap
            gap-2
          "
        >
          <button
            type="button"
            onClick={() =>
              window.print()
            }
            className="
              bg-emerald-600
              hover:bg-emerald-700
              text-white
              px-4
              py-2
              rounded
              text-xs
              font-bold
            "
          >
            <i
              className="
                fas
                fa-print
                mr-2
              "
            ></i>

            Imprimir / Guardar PDF
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
              px-4
              py-2
              rounded
              text-xs
            "
          >
            <i
              className="
                fas
                fa-arrow-left
                mr-2
              "
            ></i>

            Regresar
          </button>
        </div>
      </div>


      {/* ====================================================
          HOJA OFICIO HORIZONTAL
      ==================================================== */}

      <section
        className="
          hoja-matriz-riesgos-pesv
          bg-white
          mx-auto
          shadow-lg
        "
      >

        {/* ==================================================
            ENCABEZADO CONFIGURADO POR EL CEA
        ================================================== */}

        <div
          className="
            encabezado-pesv-print
            w-full
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
        </div>


        {/* ==================================================
            RESUMEN DE VALORACIÓN
            BLOQUE SEPARADO DEL ENCABEZADO
        ================================================== */}

        <div
          className="
            mt-[3mm]
            w-full
            border
            border-black
            grid
            grid-cols-4
            text-center
          "
        >
          <div
            className="
              border-r
              border-black
              py-1.5
            "
          >
            <div
              className="
                text-[5.5px]
                font-black
                uppercase
              "
            >
              Total riesgos
            </div>

            <div
              className="
                text-[9px]
                font-black
              "
            >
              {resumen.total}
            </div>
          </div>


          <div
            className="
              border-r
              border-black
              py-1.5
              bg-green-100
            "
          >
            <div
              className="
                text-[5.5px]
                font-black
                uppercase
              "
            >
              Bajo
            </div>

            <div
              className="
                text-[9px]
                font-black
              "
            >
              {resumen.bajos}
            </div>
          </div>


          <div
            className="
              border-r
              border-black
              py-1.5
              bg-amber-100
            "
          >
            <div
              className="
                text-[5.5px]
                font-black
                uppercase
              "
            >
              Moderado
            </div>

            <div
              className="
                text-[9px]
                font-black
              "
            >
              {resumen.moderados}
            </div>
          </div>


          <div
            className="
              py-1.5
              bg-red-100
            "
          >
            <div
              className="
                text-[5.5px]
                font-black
                uppercase
              "
            >
              Crítico
            </div>

            <div
              className="
                text-[9px]
                font-black
              "
            >
              {resumen.criticos}
            </div>
          </div>
        </div>


        {/* ==================================================
            MATRIZ DE RIESGOS
        ================================================== */}

        <div
          className="
            mt-[3mm]
            w-full
          "
        >
          <table
            className="
              tabla-riesgos
              w-full
              table-fixed
              border-collapse
            "
          >

            {/* ==============================================
                ANCHOS PROPORCIONALES
                TOTAL = 100%
            ============================================== */}

            <colgroup>
              <col style={{ width: '2%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>


            <thead>

              {/* ============================================
                  ENCABEZADOS AGRUPADOS
              ============================================ */}

              <tr
                className="
                  encabezado-tabla-grupo
                "
              >
                <th
                  colSpan={2}
                  className="
                    border
                    border-black
                    bg-slate-800
                    text-white
                    px-1
                    py-1.5
                    text-[5.5px]
                    font-black
                    uppercase
                    text-center
                  "
                >
                  Identificación
                </th>

                <th
                  colSpan={7}
                  className="
                    border
                    border-black
                    bg-slate-700
                    text-white
                    px-1
                    py-1.5
                    text-[5.5px]
                    font-black
                    uppercase
                    text-center
                  "
                >
                  Análisis del riesgo
                </th>

                <th
                  colSpan={6}
                  className="
                    border
                    border-black
                    bg-slate-800
                    text-white
                    px-1
                    py-1.5
                    text-[5.5px]
                    font-black
                    uppercase
                    text-center
                  "
                >
                  Valoración
                </th>

                <th
                  colSpan={2}
                  className="
                    border
                    border-black
                    bg-slate-700
                    text-white
                    px-1
                    py-1.5
                    text-[5.5px]
                    font-black
                    uppercase
                    text-center
                  "
                >
                  Tratamiento
                </th>
              </tr>


              {/* ============================================
                  COLUMNAS
              ============================================ */}

              <tr
                className="
                  encabezado-tabla
                  bg-gray-200
                "
              >
                {[
                  'N°',
                  'Código',
                  'Proceso / Actividad',
                  'Contexto',
                  'Actores expuestos',
                  'Factor de riesgo',
                  'Situación de riesgo',
                  'Evento peligroso',
                  'Causas / Consecuencias',
                  'E',
                  'P',
                  'NR',
                  'Nivel',
                  'S',
                  'Prioridad',
                  'Programas PESV',
                  'Controles / Medidas',
                ].map(
                  titulo => (
                    <th
                      key={
                        titulo
                      }
                      className="
                        border
                        border-black
                        px-1
                        py-1.5
                        text-[5.3px]
                        leading-tight
                        font-black
                        text-center
                        uppercase
                        align-middle
                      "
                    >
                      {titulo}
                    </th>
                  )
                )}
              </tr>
            </thead>


            <tbody>
              {riesgosOrdenados.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={17}
                    className="
                      border
                      border-black
                      py-8
                      text-center
                      text-[8px]
                      text-gray-500
                    "
                  >
                    No existen riesgos registrados
                    para la vigencia {anio}.
                  </td>
                </tr>
              ) : (
                riesgosOrdenados.map(
                  (
                    riesgo,
                    indice
                  ) => {
                    const nr =
                      calcularNr(
                        riesgo
                      )

                    const nivel =
                      calcularNivel(
                        riesgo
                      )

                    const causa =
                      texto(
                        riesgo
                          ?.causa
                      )

                    const consecuencia =
                      texto(
                        riesgo
                          ?.consecuencia
                      )


                    return (
                      <tr
                        key={
                          riesgo.id
                        }
                        className="
                          fila-riesgo
                        "
                      >

                        {/* N° */}

                        <CeldaDato
                          className="
                            text-center
                            font-black
                          "
                        >
                          {indice + 1}
                        </CeldaDato>


                        {/* CÓDIGO */}

                        <CeldaDato
                          className="
                            text-center
                            font-black
                          "
                        >
                          {texto(
                            riesgo
                              ?.codigo
                          ) ||
                            '-'}
                        </CeldaDato>


                        {/* PROCESO / ACTIVIDAD */}

                        <CeldaDato>
                          <div
                            className="
                              font-black
                            "
                          >
                            {texto(
                              riesgo
                                ?.proceso
                            ) ||
                              texto(
                                riesgo
                                  ?.proceso_actividad
                              ) ||
                              '-'}
                          </div>

                          {texto(
                            riesgo
                              ?.actividad
                          ) && (
                            <div
                              className="
                                mt-1
                              "
                            >
                              {riesgo.actividad}
                            </div>
                          )}
                        </CeldaDato>


                        {/* CONTEXTO */}

                        <CeldaDato>
                          {nombreContexto(
                            riesgo
                              ?.contexto_exposicion
                          )}
                        </CeldaDato>


                        {/* ACTORES */}

                        <CeldaDato>
                          {texto(
                            riesgo
                              ?.actores_expuestos
                          ) ||
                            '-'}
                        </CeldaDato>


                        {/* FACTOR */}

                        <CeldaDato>
                          {texto(
                            riesgo
                              ?.factor_riesgo
                          ) ||
                            '-'}
                        </CeldaDato>


                        {/* SITUACIÓN */}

                        <CeldaDato>
                          {texto(
                            riesgo
                              ?.situacion_riesgo
                          ) ||
                            texto(
                              riesgo
                                ?.descripcion_riesgo
                            ) ||
                            '-'}
                        </CeldaDato>


                        {/* EVENTO */}

                        <CeldaDato>
                          {texto(
                            riesgo
                              ?.evento_peligroso
                          ) ||
                            '-'}
                        </CeldaDato>


                        {/* CAUSAS / CONSECUENCIAS */}

                        <CeldaDato>
                          <div>
                            <strong>
                              Causa:
                            </strong>{' '}

                            {causa ||
                              '-'}
                          </div>

                          <div
                            className="
                              mt-1
                            "
                          >
                            <strong>
                              Consecuencia:
                            </strong>{' '}

                            {consecuencia ||
                              '-'}
                          </div>
                        </CeldaDato>


                        {/* EXPOSICIÓN */}

                        <CeldaDato
                          className="
                            text-center
                          "
                        >
                          <div
                            className="
                              text-[7px]
                              font-black
                            "
                          >
                            {riesgo
                              ?.exposicion ||
                              '-'}
                          </div>

                          <div
                            className="
                              mt-0.5
                              text-[4.8px]
                            "
                          >
                            {nombreExposicion(
                              riesgo
                                ?.exposicion
                            )}
                          </div>
                        </CeldaDato>


                        {/* PROBABILIDAD */}

                        <CeldaDato
                          className="
                            text-center
                          "
                        >
                          <div
                            className="
                              text-[7px]
                              font-black
                            "
                          >
                            {riesgo
                              ?.probabilidad ||
                              '-'}
                          </div>

                          <div
                            className="
                              mt-0.5
                              text-[4.8px]
                            "
                          >
                            {nombreProbabilidad(
                              riesgo
                                ?.probabilidad
                            )}
                          </div>
                        </CeldaDato>


                        {/* NR */}

                        <CeldaDato
                          className="
                            text-center
                            font-black
                            text-[7px]
                          "
                        >
                          {nr ??
                            '-'}
                        </CeldaDato>


                        {/* NIVEL */}

                        <CeldaDato
                          className={`
                            text-center
                            font-black
                            ${claseNivel(
                              nivel
                            )}
                          `}
                        >
                          {nivel ||
                            '-'}
                        </CeldaDato>


                        {/* SEVERIDAD */}

                        <CeldaDato
                          className="
                            text-center
                          "
                        >
                          <div
                            className="
                              text-[7px]
                              font-black
                            "
                          >
                            {riesgo
                              ?.severidad ||
                              '-'}
                          </div>

                          <div
                            className="
                              mt-0.5
                              text-[4.8px]
                            "
                          >
                            {nombreSeveridad(
                              riesgo
                                ?.severidad
                            )}
                          </div>
                        </CeldaDato>


                        {/* PRIORIDAD */}

                        <CeldaDato
                          className="
                            text-center
                            font-black
                          "
                        >
                          {etiqueta(
                            riesgo
                              ?.prioridad_intervencion
                          ) ||
                            '-'}
                        </CeldaDato>


                        {/* PROGRAMAS */}

                        <CeldaDato>
                          {programasRiesgo(
                            riesgo
                          )}
                        </CeldaDato>


                        {/* MEDIDAS */}

                        <CeldaDato>
                          {medidasRiesgo(
                            riesgo
                          )}

                          {(texto(
                            riesgo
                              ?.responsable_nombre
                          ) ||
                            riesgo
                              ?.responsable_personal_id) && (
                            <div
                              className="
                                mt-1.5
                                pt-1
                                border-t
                                border-gray-400
                              "
                            >
                              <strong>
                                Responsable:
                              </strong>{' '}

                              {nombreResponsable(
                                riesgo,
                                personal
                              )}
                            </div>
                          )}

                          {riesgo
                            ?.fecha_compromiso && (
                            <div
                              className="
                                mt-1
                              "
                            >
                              <strong>
                                Compromiso:
                              </strong>{' '}

                              {formatearFecha(
                                riesgo
                                  .fecha_compromiso
                              )}
                            </div>
                          )}
                        </CeldaDato>
                      </tr>
                    )
                  }
                )
              )}
            </tbody>
          </table>
        </div>


        {/* ==================================================
            METODOLOGÍA RESUMIDA
        ================================================== */}

        <div
          className="
            metodologia-documento
            mt-[4mm]
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
              py-1.5
              text-[6px]
              font-black
              uppercase
            "
          >
            Criterios de valoración
          </div>


          <div
            className="
              grid
              grid-cols-4
              text-[5.8px]
              leading-tight
            "
          >

            {/* EXPOSICIÓN */}

            <div
              className="
                border-r
                border-black
                p-2
              "
            >
              <div
                className="
                  font-black
                  mb-1
                "
              >
                EXPOSICIÓN
              </div>

              <div>
                E1 = Esporádica
              </div>

              <div>
                E2 = Ocasional
              </div>

              <div>
                E3 = Frecuente
              </div>
            </div>


            {/* PROBABILIDAD */}

            <div
              className="
                border-r
                border-black
                p-2
              "
            >
              <div
                className="
                  font-black
                  mb-1
                "
              >
                PROBABILIDAD
              </div>

              <div>
                P1 = No es probable
              </div>

              <div>
                P2 = Poco probable
              </div>

              <div>
                P3 = Muy probable
              </div>
            </div>


            {/* NIVEL */}

            <div
              className="
                border-r
                border-black
                p-2
              "
            >
              <div
                className="
                  font-black
                  mb-1
                "
              >
                NIVEL DE RIESGO
              </div>

              <div
                className="
                  font-black
                "
              >
                NR = E × P
              </div>

              <div>
                1 - 2 = BAJO
              </div>

              <div>
                3 - 4 = MODERADO
              </div>

              <div>
                6 - 9 = CRÍTICO
              </div>
            </div>


            {/* SEVERIDAD */}

            <div
              className="
                p-2
              "
            >
              <div
                className="
                  font-black
                  mb-1
                "
              >
                SEVERIDAD
              </div>

              <div>
                S1 = Leve
              </div>

              <div>
                S2 = Grave
              </div>

              <div>
                S3 = Muy grave
              </div>

              <div
                className="
                  mt-1
                  font-semibold
                "
              >
                La severidad complementa el análisis
                para determinar la prioridad de
                intervención y no se multiplica
                dentro del NR.
              </div>
            </div>
          </div>
        </div>


        {/* ==================================================
            NOTA METODOLÓGICA
        ================================================== */}

        <div
          className="
            mt-[2mm]
            border
            border-black
            px-2
            py-1.5
            text-[5.5px]
            leading-tight
          "
        >
          <strong>
            Nota metodológica:
          </strong>{' '}

          La exposición corresponde a la frecuencia
          del escenario específico de riesgo. La
          probabilidad representa la posibilidad de
          materialización del evento peligroso
          considerando los controles existentes. Las
          medidas únicamente deben modificar una
          valoración posterior cuando se encuentren
          realmente implementadas o activas.
        </div>


        {/* ==================================================
            FIRMAS
        ================================================== */}

        <div
          className="
            firmas-documento
            mt-[10mm]
            grid
            grid-cols-3
            gap-[8mm]
          "
        >
          <div
            className="
              pt-[3mm]
              border-t
              border-black
              text-center
              text-[6px]
            "
          >
            <div
              className="
                font-black
              "
            >
              ELABORÓ
            </div>

            <div>
              Responsable PESV
            </div>
          </div>


          <div
            className="
              pt-[3mm]
              border-t
              border-black
              text-center
              text-[6px]
            "
          >
            <div
              className="
                font-black
              "
            >
              REVISÓ
            </div>

            <div>
              Responsable designado
            </div>
          </div>


          <div
            className="
              pt-[3mm]
              border-t
              border-black
              text-center
              text-[6px]
            "
          >
            <div
              className="
                font-black
              "
            >
              APROBÓ
            </div>

            <div>
              Representante legal
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}