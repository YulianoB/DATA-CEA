// app/admin/inscripciones/contrato/page.jsx

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


function nombreClausula(
  orden
) {
  const nombres = {
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
  }

  return nombres[
    Number(
      orden
    )
  ] ||
    String(
      orden || ''
    )
}


// ============================================================
// TEXTO CON MARCAS **NEGRITA**
// ============================================================

function TextoMarcado({
  contenido,
}) {
  const valor =
    String(
      contenido ?? ''
    )

  if (
    !valor
  ) {
    return null
  }

  const partes =
    valor.split(
      /\*\*(.*?)\*\*/g
    )

  return (
    <>
      {partes.map(
        (
          parte,
          index
        ) =>
          index % 2 ===
          1 ? (
            <strong
              key={
                index
              }
            >
              {parte}
            </strong>
          ) : (
            <span
              key={
                index
              }
            >
              {parte}
            </span>
          )
      )}
    </>
  )
}


function BloqueTexto({
  contenido,
  className = '',
}) {
  const parrafos =
    String(
      contenido ?? ''
    )
      .split(
        /\n\s*\n/g
      )
      .map(
        item =>
          item.trim()
      )
      .filter(
        Boolean
      )

  if (
    parrafos.length ===
    0
  ) {
    return null
  }

  return (
    <div
      className={
        className
      }
    >
      {parrafos.map(
        (
          parrafo,
          index
        ) => {
          const esParagrafo =
            /^PARÁGRAFO\b/i.test(
              parrafo
            )

          if (
            esParagrafo &&
            !parrafo.includes(
              '**'
            )
          ) {
            const posicion =
              parrafo.indexOf(
                ':'
              )

            if (
              posicion >
              -1
            ) {
              const titulo =
                parrafo.slice(
                  0,
                  posicion +
                    1
                )

              const resto =
                parrafo.slice(
                  posicion +
                    1
                )

                return (
                <p
                  key={
                    index
                  }
                  className={
                    index === 0
                      ? ''
                      : 'mt-1'
                  }
                >
                  <strong>
                    {titulo}
                  </strong>

                  {resto}
                </p>
              )
            }
          }

                    return (
            <p
              key={
                index
              }
              className={
                index === 0
                  ? ''
                  : 'mt-1'
              }
            >
              <TextoMarcado
                contenido={
                  parrafo
                }
              />
            </p>
          )
        }
      )}
    </div>
  )
}


// ============================================================
// CAMPO DE DATOS
// ============================================================

function CampoDato({
  titulo,
  valor,
  className = '',
  mostrarVacio = false,
}) {
  return (
    <div
      className={`
        border
        border-gray-400
        px-1.5
        py-0.5
        min-h-[27px]
        flex
        flex-col
        justify-center
        ${className}
      `}
    >
      <div
        className="
          text-[5.8px]
          font-bold
          uppercase
          leading-none
          text-gray-500
        "
      >
        {titulo}
      </div>

      <div
        className="
          mt-[2px]
          text-[7.8px]
          font-semibold
          leading-tight
          text-gray-900
          break-words
        "
      >
        {mostrarVacio
          ? '\u00A0'
          : texto(
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
      return pagina
        ? texto(
            pagina
          )
        : ''

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
  pagina = '',
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
            'CONTRATO DE PRESTACIÓN DE SERVICIOS DE FORMACIÓN EN CONDUCCIÓN'}
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
// INFORMACIÓN DEL ASPIRANTE
// ============================================================

function InformacionAspirante({
  datos,
}) {
  const aprendiz =
    datos?.aprendiz ||
    {}

  const matricula =
    datos?.matricula ||
    {}

  const foto =
    datos?.foto ||
    {}

  const configuracion =
    datos
      ?.contrato
      ?.configuracion ||
    {}

  const mostrarFoto =
    configuracion
      ?.mostrar_foto !==
    false

  const mostrarHuella =
    configuracion
      ?.mostrar_huella !==
    false

  return (
    <div
      className="
        mt-2
        border
        border-black
        break-inside-avoid
      "
    >

      {/* ====================================================
          ENCABEZADO DEL BLOQUE
      ==================================================== */}

      <div
        className={`
          grid
          ${
            mostrarFoto &&
            mostrarHuella
              ? 'grid-cols-[1fr_95px_95px]'
              : mostrarFoto ||
                mostrarHuella
                ? 'grid-cols-[1fr_110px]'
                : 'grid-cols-1'
          }
          bg-gray-200
          border-b
          border-black
        `}
      >

        <div
          className="
            px-2
            py-1
            flex
            items-center
            text-[8px]
            font-black
            uppercase
          "
        >
          Información del Aspirante
        </div>

        {(mostrarFoto ||
          mostrarHuella) && (
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
                text-[5.8px]
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
                text-[10px]
                font-black
                text-red-700
                leading-none
              "
            >
              {matricula.consecutivo ||
                '-'}
            </div>
          </div>
        )}

        {mostrarFoto &&
          mostrarHuella && (
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
                  text-[5.8px]
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
                  text-[10px]
                  font-black
                  text-red-700
                  leading-none
                "
              >
                {matricula.categoria ||
                  '-'}
              </div>
            </div>
          )}

      </div>


      {/* ====================================================
          DATOS + FOTO + HUELLA
      ==================================================== */}

      <div
        className={`
          grid
          ${
            mostrarFoto &&
            mostrarHuella
              ? 'grid-cols-[1fr_95px_95px]'
              : mostrarFoto ||
                mostrarHuella
                ? 'grid-cols-[1fr_110px]'
                : 'grid-cols-1'
          }
        `}
      >

        {/* ==================================================
            DATOS DEL ASPIRANTE
        ================================================== */}

        <div>

          {/* ================================================
              FILA 1
              FECHA MATRÍCULA | SOLICITUD RUNT | NOMBRES
          ================================================ */}

          <div
            className="
              grid
              grid-cols-[92px_175px_1fr]
            "
          >
            <CampoDato
              titulo="Fecha de matrícula"
              valor={
                formatearFecha(
                  matricula.fecha_matricula
                )
              }
            />

            <CampoDato
              titulo="N° Solicitud RUNT"
              valor=""
              mostrarVacio
            />

            <CampoDato
              titulo="Nombres y apellidos"
              valor={
                aprendiz.nombre_completo
              }
            />
          </div>


          {/* ================================================
              FILA 2
              TIPO DOC | DOCUMENTO | NACIMIENTO | TELÉFONO
          ================================================ */}

          <div
            className="
              grid
              grid-cols-[70px_150px_150px_1fr]
            "
          >
            <CampoDato
              titulo="Tipo de documento"
              valor={
                aprendiz.tipo_documento
              }
            />

            <CampoDato
              titulo="Número de documento"
              valor={
                aprendiz.documento
              }
            />

            <CampoDato
              titulo="Fecha de nacimiento"
              valor={
                formatearFecha(
                  aprendiz.fecha_nacimiento
                )
              }
            />

            <CampoDato
              titulo="Teléfono"
              valor={
                aprendiz.celular
              }
            />
          </div>


          {/* ================================================
              FILA 3
              DIRECCIÓN | BARRIO | CORREO
          ================================================ */}

          <div
            className="
              grid
              grid-cols-[1.1fr_0.8fr_1.1fr]
            "
          >
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

            <CampoDato
              titulo="Correo"
              valor={
                aprendiz.correo
              }
            />
          </div>


          {/* ================================================
              FILA 4
              ESTRATO | EPS | OCUPACIÓN | ESTADO CIVIL |
              NIVEL EDUCATIVO
          ================================================ */}

          <div
            className="
              grid
              grid-cols-[55px_160px_1fr_90px_110px]
            "
          >
            <CampoDato
              titulo="Estrato"
              valor={
                aprendiz.estrato
              }
            />

            <CampoDato
              titulo="EPS"
              valor={
                aprendiz.eps
              }
            />

            <CampoDato
              titulo="Ocupación"
              valor={
                aprendiz.ocupacion
              }
            />

            <CampoDato
              titulo="Estado civil"
              valor={
                aprendiz.estado_civil
              }
            />

            <CampoDato
              titulo="Nivel educativo"
              valor={
                aprendiz.nivel_educativo
              }
            />
          </div>

        </div>


        {/* ==================================================
            FOTO
        ================================================== */}

        {mostrarFoto && (
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
                min-h-[102px]
                flex
                items-center
                justify-center
                p-1
              "
            >
              {foto?.url ? (
                <img
                  src={
                    foto.url
                  }
                  alt="Foto del aspirante"
                  className="
                    h-[98px]
                    w-full
                    object-cover
                  "
                />
              ) : (
                <div
                  className="
                    text-center
                    text-[6px]
                    text-gray-400
                  "
                >
                  SIN FOTO
                  <br />
                  ALMACENADA
                </div>
              )}
            </div>
          </div>
        )}


        {/* ==================================================
            HUELLA
        ================================================== */}

        {mostrarHuella && (
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
                min-h-[102px]
                flex
                items-center
                justify-center
                p-1
                text-center
                text-[6px]
                text-gray-400
              "
            >
              ESPACIO PARA
              <br />
              HUELLA DEL
              <br />
              ASPIRANTE
            </div>
          </div>
        )}

      </div>

    </div>
  )
}


// ============================================================
// CLÁUSULA
// ============================================================

function ClausulaContrato({
  clausula,
}) {
  return (
    <div
      className="
        mt-1.5
        text-[8px]
        leading-[1.18]
        text-justify
      "
    >
      <p
        className="
          font-black
          uppercase
          leading-[1.1]
        "
      >
        CLÁUSULA{' '}
        {nombreClausula(
          clausula?.orden
        )}:
        {' '}
        {texto(
          clausula?.titulo
        )}
      </p>

      <BloqueTexto
        contenido={
          clausula?.contenido
        }
        className="mt-0.5"
      />
    </div>
  )
}


// ============================================================
// FIRMAS
// ============================================================

function FirmasContrato({
  datos,
}) {
  const aprendiz =
    datos?.aprendiz ||
    {}

  const acudiente =
    datos?.acudiente ||
    {}

  const empresa =
    datos?.empresa ||
    {}

  const esMenor =
    datos?.es_menor_edad ===
    true

  if (
    esMenor
  ) {
    return (
        <div
        className="
          mt-5
          break-inside-avoid
          text-[7.5px]
        "
      >
        <div
          className="
            grid
            grid-cols-2
            gap-6
          "
        >
          <BloqueFirma
            titulo="EL ASPIRANTE"
            nombre={
              aprendiz.nombre_completo
            }
            documento={
              aprendiz.documento
            }
          />

          <BloqueFirma
            titulo="PADRE / MADRE / REPRESENTANTE LEGAL / ACUDIENTE"
            nombre={
              acudiente.nombre_completo
            }
            documento={
              acudiente.documento
            }
          />
        </div>

        <div
          className="
            mt-5
            w-[48%]
          "
        >
          <BloqueFirma
            titulo="REPRESENTANTE DEL CEA"
            nombre={
              empresa.representante_legal
            }
            documento={
              empresa.documento_representante
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="
        mt-5
        grid
        grid-cols-2
        gap-6
        break-inside-avoid
        text-[7.5px]
      "
    >
      <BloqueFirma
        titulo="EL ASPIRANTE"
        nombre={
          aprendiz.nombre_completo
        }
        documento={
          aprendiz.documento
        }
      />

      <BloqueFirma
        titulo="REPRESENTANTE DEL CEA"
        nombre={
          empresa.representante_legal
        }
        documento={
          empresa.documento_representante
        }
      />
    </div>
  )
}


function BloqueFirma({
  titulo,
  nombre,
  documento,
}) {
  return (
    <div>
        <div
        className="
          font-black
          uppercase
          min-h-[15px]
          leading-tight
        "
      >
        {titulo}
      </div>

      <div
        className="
          mt-5
          border-b
          border-black
          h-[1px]
        "
      ></div>

      <div
        className="
          mt-1
          leading-tight
        "
      >
        <div>
          <strong>
            Nombre:
          </strong>{' '}
          {texto(
            nombre
          ) ||
            '-'}
        </div>

        <div>
          <strong>
            Documento:
          </strong>{' '}
          {texto(
            documento
          ) ||
            '-'}
        </div>
      </div>
    </div>
  )
}


// ============================================================
// PÁGINA
// ============================================================

export default function ContratoPage() {
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
  // CONSULTAR CONTRATO
  // ==========================================================

  useEffect(
    () => {
      if (
        !usuario
      ) {
        return
      }

      if (
        !matriculaId
      ) {
        setError(
          'No se recibió la matrícula del contrato.'
        )

        setCargando(
          false
        )

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
              `/api/admin/documentos/contrato?matricula_id=${encodeURIComponent(
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
              'No fue posible cargar el contrato.'
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
            'Error cargando contrato:',
            err
          )

          if (
            activo
          ) {
            setError(
              err?.message ||
              'No fue posible cargar el contrato.'
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
          Consultando contrato...
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

  const encabezado =
    datos?.encabezado ||
    {}

  const logo =
    datos?.logo ||
    {}

  const matricula =
    datos?.matricula ||
    {}

  const contrato =
    datos?.contrato ||
    {}

  const clausulas =
    Array.isArray(
      contrato?.clausulas
    )
      ? contrato.clausulas
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
            Contrato de Formación en Conducción
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


      {/* ====================================================
          DOCUMENTO

          Se usa una tabla contenedora para que, al imprimir,
          el navegador pueda repetir el encabezado institucional
          en las páginas siguientes.
      ==================================================== */}

      <section
        className="
          hoja-control
          hoja-contrato
          bg-white
          mx-auto
          shadow-lg
          p-[8mm]
        "
      >
        <table
          className="
            tabla-documento-contrato
            w-full
            border-collapse
          "
        >
          <thead
            className="
              encabezado-repetible-contrato
            "
          >
            <tr>
              <td>
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
                />
              </td>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>

                {/* ==========================================
                    INFORMACIÓN DEL ASPIRANTE
                ========================================== */}

                <InformacionAspirante
                  datos={
                    datos
                  }
                />

                

                {/* ==========================================
                    TEXTO INTRODUCTORIO
                ========================================== */}

                <BloqueTexto
                  contenido={
                    contrato.texto_introductorio
                  }
                  className="
                    mt-2
                    text-[8px]
                    leading-[1.2]
                    text-justify
                  "
                />


                {/* ==========================================
                    CLÁUSULAS
                ========================================== */}

                {clausulas.map(
                  clausula => (
                    <ClausulaContrato
                      key={
                        clausula.id ||
                        clausula.orden
                      }
                      clausula={
                        clausula
                      }
                    />
                  )
                )}


                {/* ==========================================
                    MANIFESTACIONES FINALES
                ========================================== */}

                <div
                  className="
                    mt-2
                    pt-1
                    border-t
                    border-black
                  "
                >
                  <BloqueTexto
                    contenido={
                      contrato.texto_final
                    }
                    className="
                      text-[8px]
                      leading-[1.2]
                      text-justify
                    "
                  />
                </div>


                {/* ==========================================
                    FIRMAS
                ========================================== */}

                <FirmasContrato
                  datos={
                    datos
                  }
                />

              </td>
            </tr>
          </tbody>
        </table>
      </section>


      {/* ====================================================
          NOTA:

          Los estilos de impresión generales permanecen en
          app/globals.css, igual que en Control de Clases.
      ==================================================== */}

    </div>
  )
}
