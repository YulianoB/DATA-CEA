// app/admin/pesv/objetivos-metas/documento/page.jsx

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
    return texto(
      valor
    )
  }

  return `${dia}/${mes}/${anio}`
}


function normalizarClave(
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
    .replace(
      /[^A-Z0-9]+/g,
      '_'
    )
    .replace(
      /^_+|_+$/g,
      ''
    )
}


function valorVisible(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    texto(
      valor
    ) === ''
  ) {
    return '-'
  }

  return texto(
    valor
  )
}


function valorMetaVisible(
  meta
) {
  if (
    meta?.valor_meta ===
      null ||
    meta?.valor_meta ===
      undefined ||
    texto(
      meta?.valor_meta
    ) ===
      ''
  ) {
    return '-'
  }

  return [
    texto(
      meta?.operador_meta
    ),
    texto(
      meta?.valor_meta
    ),
    texto(
      meta?.unidad_medida
    ),
  ]
    .filter(
      Boolean
    )
    .join(
      ' '
    )
}


function indicadorVisible(
  meta
) {
  const indicador =
    meta
      ?.pesv_indicadores_catalogo

  if (
    !indicador
  ) {
    return 'Sin indicador asociado'
  }

  return [
    texto(
      indicador
        ?.numero_normativo
    ),
    texto(
      indicador
        ?.codigo
    ),
    texto(
      indicador
        ?.nombre
    ),
  ]
    .filter(
      Boolean
    )
    .join(
      ' - '
    )
}



// ============================================================
// VALOR DE ELEMENTOS DEL ENCABEZADO
// ============================================================

function valorDocumento(
  tipo,
  documento,
  pagina,
  totalPaginas
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
      if (
        pagina &&
        totalPaginas
      ) {
        return `${pagina} de ${totalPaginas}`
      }

      return ''

    default:
      return ''
  }
}


// ============================================================
// ENCABEZADO DOCUMENTAL
// ============================================================

function EncabezadoDocumento({
  encabezado,
  documento,
  logo,
  pagina,
  totalPaginas,
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
  // RESPALDO
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
            'OBJETIVOS Y METAS DEL PESV'}
        </div>

        {pagina &&
        totalPaginas && (
          <div
            className="
              mt-1
              text-[8px]
            "
          >
            Página{' '}
            {pagina} de{' '}
            {totalPaginas}
          </div>
        )}
      </div>
    )
  }


  // ==========================================================
  // DISEÑO CONFIGURADO
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
              celda?.elementos
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

              <div className="w-full">

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
                                text-gray-400
                              "
                            >
                              LOGO
                            </span>
                          )}
                        </div>
                      )
                    }


                    // ========================================
                    // TEXTO
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
                            pagina,
                            totalPaginas
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
// CAMPO
// ============================================================

function Campo({
  titulo,
  children,
  className = '',
}) {
  return (
    <div
      className={`
        border
        border-gray-400
        px-2
        py-1.5
        ${className}
      `}
    >
      <div
        className="
          text-[6.5px]
          font-black
          uppercase
          text-gray-500
        "
      >
        {titulo}
      </div>

      <div
        className="
          mt-0.5
          text-[8px]
          leading-tight
          text-gray-900
          break-words
        "
      >
        {children ||
          '-'}
      </div>
    </div>
  )
}


// ============================================================
// META
// ============================================================

function MetaDocumento({
  meta,
  numero,
}) {
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
          CABECERA
      ==================================================== */}

      <div
        className="
          flex
          items-center
          justify-between
          gap-3
          border-b
          border-black
          bg-blue-50
          px-2
          py-1.5
        "
      >

        <div
          className="
            text-[8.5px]
            font-black
            text-blue-950
          "
        >
          META {numero}:{' '}

          {meta?.codigo ||
            '-'}
        </div>

        <div
          className="
            text-[6.5px]
            font-bold
            uppercase
            text-gray-600
          "
        >
          {meta?.estado ||
            '-'}
        </div>

      </div>


      {/* ====================================================
          DESCRIPCIÓN
      ==================================================== */}

      <div
        className="
          border-b
          border-gray-400
          px-2
          py-1.5
        "
      >
        <div
          className="
            text-[6.5px]
            font-black
            uppercase
            text-gray-500
          "
        >
          Descripción de la meta
        </div>

        <div
          className="
            mt-0.5
            text-[8px]
            leading-[1.25]
            text-gray-900
          "
        >
          {meta?.descripcion ||
            '-'}
        </div>
      </div>


      {/* ====================================================
          INDICADOR
      ==================================================== */}

      <div
        className="
          border-b
          border-gray-400
          px-2
          py-1.5
        "
      >
        <div
          className="
            text-[6.5px]
            font-black
            uppercase
            text-gray-500
          "
        >
          Indicador asociado
        </div>

        <div
          className="
            mt-0.5
            text-[7.5px]
            leading-tight
          "
        >
          {indicadorVisible(
            meta
          )}
        </div>
      </div>


      {/* ====================================================
          MEDICIÓN
      ==================================================== */}

      <div
        className="
          grid
          grid-cols-4
        "
      >

        <Campo
          titulo="Línea base"
          className="
            border-0
            border-r
            border-gray-400
          "
        >
          {valorVisible(
            meta?.linea_base
          )}
        </Campo>

        <Campo
          titulo="Valor meta"
          className="
            border-0
            border-r
            border-gray-400
          "
        >
          {valorMetaVisible(
            meta
          )}
        </Campo>

        <Campo
          titulo="Fecha límite"
          className="
            border-0
            border-r
            border-gray-400
          "
        >
          {formatearFecha(
            meta?.fecha_limite
          ) ||
            '-'}
        </Campo>

        <Campo
          titulo="Responsable"
          className="border-0"
        >
          {meta
            ?.responsable_nombre ||
            '-'}
        </Campo>

      </div>


      {/* ====================================================
          OBSERVACIONES
      ==================================================== */}

      {texto(
        meta?.observaciones
      ) && (
        <div
          className="
            border-t
            border-gray-400
            px-2
            py-1.5
          "
        >
          <span
            className="
              text-[6.5px]
              font-black
              uppercase
              text-gray-500
            "
          >
            Observaciones:{' '}
          </span>

          <span
            className="
              text-[7.5px]
              leading-tight
            "
          >
            {meta.observaciones}
          </span>
        </div>
      )}

    </div>
  )
}


// ============================================================
// OBJETIVO
// ============================================================

function ObjetivoDocumento({
  objetivo,
  metas,
  continuacion,
  numeroObjetivo,
  inicioMeta,
}) {
  return (
    <>

      {/* ====================================================
          OBJETIVO
      ==================================================== */}

      <div
        className="
          mt-2
          border
          border-black
        "
      >

        <div
          className="
            bg-slate-800
            px-2
            py-1.5
            text-white
          "
        >
          <div
            className="
              text-[8.5px]
              font-black
              uppercase
              leading-tight
            "
          >
            OBJETIVO {numeroObjetivo}

            {' · '}

            {objetivo?.codigo ||
              '-'}

            {continuacion &&
              ' · CONTINUACIÓN'}
          </div>

          <div
            className="
              mt-0.5
              text-[8px]
              font-semibold
              leading-tight
            "
          >
            {objetivo?.nombre ||
              '-'}
          </div>
        </div>


        {!continuacion && (
          <>

            <div
              className="
                border-b
                border-black
                px-2
                py-1.5
              "
            >
              <div
                className="
                  text-[6.5px]
                  font-black
                  uppercase
                  text-gray-500
                "
              >
                Descripción
              </div>

              <div
                className="
                  mt-0.5
                  text-[8px]
                  leading-[1.25]
                "
              >
                {objetivo
                  ?.descripcion ||
                  '-'}
              </div>
            </div>


            <div
              className="
                grid
                grid-cols-[1fr_120px]
              "
            >
              <Campo
                titulo="Responsable del objetivo"
                className="
                  border-0
                  border-r
                  border-gray-400
                "
              >
                {objetivo
                  ?.responsable_nombre ||
                  '-'}
              </Campo>

              <Campo
                titulo="Estado"
                className="border-0"
              >
                {objetivo?.estado ||
                  '-'}
              </Campo>
            </div>


            {texto(
              objetivo
                ?.observaciones
            ) && (
              <div
                className="
                  border-t
                  border-gray-400
                  px-2
                  py-1.5
                "
              >
                <span
                  className="
                    text-[6.5px]
                    font-black
                    uppercase
                    text-gray-500
                  "
                >
                  Observaciones:{' '}
                </span>

                <span
                  className="
                    text-[7.5px]
                  "
                >
                  {objetivo
                    .observaciones}
                </span>
              </div>
            )}

          </>
        )}


        {continuacion && (
          <div
            className="
              grid
              grid-cols-[1fr_120px]
            "
          >
            <Campo
              titulo="Responsable del objetivo"
              className="
                border-0
                border-r
                border-gray-400
              "
            >
              {objetivo
                ?.responsable_nombre ||
                '-'}
            </Campo>

            <Campo
              titulo="Estado"
              className="border-0"
            >
              {objetivo?.estado ||
                '-'}
            </Campo>
          </div>
        )}

      </div>


      {/* ====================================================
          METAS
      ==================================================== */}

      <div
        className="
          mt-2
          bg-gray-200
          border
          border-black
          px-2
          py-1
          text-[7.5px]
          font-black
          uppercase
        "
      >
        Metas asociadas
      </div>


      {metas.length ===
      0 ? (
        <div
          className="
            border
            border-t-0
            border-black
            px-2
            py-4
            text-center
            text-[8px]
            text-gray-500
          "
        >
          Este objetivo no tiene metas asociadas.
        </div>
      ) : (
        metas.map(
          (
            meta,
            index
          ) => (
            <MetaDocumento
              key={
                meta.id
              }
              meta={
                meta
              }
              numero={
                inicioMeta +
                index +
                1
              }
            />
          )
        )
      )}

    </>
  )
}


// ============================================================
// PIE
// ============================================================

function PieDocumento({
  responsables,
}) {
  const textoResponsables =
    responsables.length ===
      0
      ? 'No registrado'
      : responsables.join(
          ' · '
        )

  return (
    <div
      className="
        pie-documento
        mt-auto
        pt-3
      "
    >
      <div
        className="
          border-t
          border-gray-500
          pt-1.5
          text-[6.5px]
          leading-tight
          text-gray-600
        "
      >
        <span className="font-black">
          Responsable(s) del documento:{' '}
        </span>

        {textoResponsables}
      </div>
    </div>
  )
}


// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function DocumentoObjetivosMetasPesvPage() {
  const router =
    useRouter()

  const [
    user,
    setUser,
  ] =
    useState(
      null
    )

  const [
    anio,
    setAnio,
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
    empresa,
    setEmpresa,
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
    documento,
    setDocumento,
  ] =
    useState(
      null
    )

  const [
    objetivos,
    setObjetivos,
  ] =
    useState(
      []
    )

  const [
    metas,
    setMetas,
  ] =
    useState(
      []
    )

  const [
  logo,
  setLogo,
] =
  useState(
    {}
  )


  // ==========================================================
  // SESIÓN + AÑO
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

      const anioActual =
        new Date()
          .getFullYear()

      setUser(
        currentUser
      )

      setAnio(
        Number.isFinite(
          anioParametro
        ) &&
        anioParametro >
          0
          ? anioParametro
          : anioActual
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


          // ==================================================
          // OBJETIVOS Y METAS
          // ==================================================

          const params =
            new URLSearchParams({
              nit,

              anio:
                String(
                  anio
                ),
            })


          const [
            respuestaPesv,
            respuestaConfiguracion,
            ] =
            await Promise.all([
                fetch(
                `/api/admin/pesv/objetivos-metas?${params.toString()}`,
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
                '/api/admin/configuracion-documentos',
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


          // ==================================================
          // PROCESAR PESV
          // ==================================================

          const dataPesv =
            await respuestaPesv.json()

          if (
            !respuestaPesv.ok ||
            dataPesv?.ok !==
              true
          ) {
            throw new Error(
              dataPesv?.error ||
              'No fue posible consultar los objetivos y metas.'
            )
          }


          // ==================================================
          // PROCESAR CONFIGURACIÓN
          // ==================================================

          const dataConfiguracion =
            await respuestaConfiguracion.json()

          if (
            !respuestaConfiguracion.ok ||
            dataConfiguracion?.ok !==
              true
          ) {
            throw new Error(
              dataConfiguracion?.error ||
              'No fue posible consultar la configuración documental.'
            )
          }


          // ==================================================
          // BUSCAR OBJETIVOS Y METAS EN OTROS DOCUMENTOS
          // ==================================================

          const documentos =
            Array.isArray(
              dataConfiguracion
                ?.documentos
            )
              ? dataConfiguracion
                  .documentos
              : []


          const documentoEncontrado =
            documentos.find(
              item => {
                const tipo =
                  normalizarClave(
                    item
                      ?.tipo_documento
                  )

                return [
                  'OBJETIVOS_Y_METAS_PESV',
                  'OBJETIVOS_METAS_PESV',
                  'OBJETIVOS_Y_METAS',
                  'OBJETIVOS_METAS',
                ].includes(
                  tipo
                )
              }
            ) ||
            documentos.find(
              item => {
                const nombre =
                  normalizarClave(
                    item
                      ?.nombre_documento
                  )

                return (
                  nombre.includes(
                    'OBJETIVOS'
                  ) &&
                  nombre.includes(
                    'METAS'
                  )
                )
              }
            )


          if (
            !documentoEncontrado
          ) {
            throw new Error(
              'No se encontró "Objetivos y Metas PESV" en Configuración de Documentos > Otros Documentos.'
            )
          }


          if (
            documentoEncontrado
              ?.activo ===
            false
          ) {
            throw new Error(
              'El documento Objetivos y Metas PESV se encuentra inactivo en Configuración de Documentos.'
            )
          }

          
         // ==================================================
        // LOGO
        // ==================================================

        const logoDocumento =
        dataPesv?.logo &&
        typeof dataPesv.logo ===
            'object'
            ? dataPesv.logo
            : {
                path: '',
                url: '',
            }


          if (
            activo
          ) {
            setEmpresa(
              dataPesv
                ?.empresa ||
              dataConfiguracion
                ?.empresa ||
              null
            )

            setObjetivos(
              Array.isArray(
                dataPesv
                  ?.objetivos
              )
                ? dataPesv
                    .objetivos
                : []
            )

            setMetas(
              Array.isArray(
                dataPesv
                  ?.metas
              )
                ? dataPesv
                    .metas
                : []
            )

            setEncabezado(
              dataConfiguracion
                ?.encabezado ||
              null
            )

            setDocumento(
              documentoEncontrado
            )

            setLogo(
            logoDocumento
            )
          }
        } catch (
          err
        ) {
          console.error(
            'Error cargando documento Objetivos y Metas PESV:',
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
  // OBJETIVOS ORDENADOS
  // ==========================================================

  const objetivosOrdenados =
    useMemo(
      () => {
        return [
          ...objetivos,
        ].sort(
          (
            a,
            b
          ) =>
            texto(
              a?.codigo
            ).localeCompare(
              texto(
                b?.codigo
              ),
              'es',
              {
                numeric:
                  true,
              }
            )
        )
      },
      [
        objetivos,
      ]
    )


  // ==========================================================
  // METAS ORDENADAS
  // ==========================================================

  const metasOrdenadas =
    useMemo(
      () => {
        return [
          ...metas,
        ].sort(
          (
            a,
            b
          ) =>
            texto(
              a?.codigo
            ).localeCompare(
              texto(
                b?.codigo
              ),
              'es',
              {
                numeric:
                  true,
              }
            )
        )
      },
      [
        metas,
      ]
    )


  // ==========================================================
  // RESPONSABLES DEL DOCUMENTO
  //
  // PRIMERO LOS RESPONSABLES REGISTRADOS EN LOS OBJETIVOS.
  // SI NO EXISTE NINGUNO, USA LOS DE LAS METAS.
  // ==========================================================

  const responsablesDocumento =
    useMemo(
      () => {
        const mapa =
          new Map()


        objetivosOrdenados.forEach(
          objetivo => {
            const responsable =
              texto(
                objetivo
                  ?.responsable_nombre
              )

            if (
              responsable
            ) {
              mapa.set(
                responsable.toUpperCase(),
                responsable
              )
            }
          }
        )


        if (
          mapa.size ===
          0
        ) {
          metasOrdenadas.forEach(
            meta => {
              const responsable =
                texto(
                  meta
                    ?.responsable_nombre
                )

              if (
                responsable
              ) {
                mapa.set(
                  responsable.toUpperCase(),
                  responsable
                )
              }
            }
          )
        }


        return [
          ...mapa.values(),
        ]
      },
      [
        objetivosOrdenados,
        metasOrdenadas,
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
          <i className="fas fa-spinner fa-spin mr-2"></i>

          Preparando documento oficial...
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
            <i className="fas fa-arrow-left mr-2"></i>

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
        documento-pesv
        min-h-screen
        bg-gray-200
        py-5
      "
    >

      {/* ====================================================
          ACCIONES
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
            {documento
              ?.nombre_documento ||
              'Objetivos y Metas PESV'}
          </div>

          <div
            className="
              mt-0.5
              text-[10px]
              text-gray-500
            "
          >
            Período{' '}
            <strong>
              {anio}
            </strong>

            {' · '}

            {objetivos.length}{' '}
            objetivo(s)

            {' · '}

            {metas.length}{' '}
            meta(s)


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
            <i className="fas fa-print mr-2"></i>

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
            <i className="fas fa-arrow-left mr-2"></i>

            Regresar
          </button>

        </div>

      </div>


      {/* ====================================================
            DOCUMENTO CONTINUO
        ==================================================== */}

        <section
        className="
            hoja-pesv
            bg-white
            mx-auto
            shadow-lg
            px-[8mm]
            pt-[8mm]
            pb-[7mm]
        "
        >

        {/* ==================================================
            ENCABEZADO DOCUMENTAL
        ================================================== */}

        <div className="encabezado-pesv-print">

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
                null
            }
            totalPaginas={
                null
            }
            />

        </div>


        {/* ==================================================
            IDENTIFICACIÓN GENERAL
        ================================================== */}

        <div
            className="
            mt-2
            border
            border-black
            bg-gray-200
            px-2
            py-1.5
            text-center
            "
        >
            <div
            className="
                text-[11px]
                font-black
                uppercase
                tracking-wide
            "
            >
            Objetivos y Metas del Plan Estratégico de Seguridad Vial
            </div>

            <div
            className="
                mt-0.5
                text-[8px]
                font-bold
            "
            >
            PERÍODO DE PLANEACIÓN {anio}
            </div>
        </div>


        <div
            className="
            grid
            grid-cols-3
            border
            border-t-0
            border-black
            "
        >

            <Campo
            titulo="CEA"
            className="
                border-0
                border-r
                border-black
            "
            >
            {empresa
                ?.nombre ||
                '-'}
            </Campo>

            <Campo
            titulo="Objetivos registrados"
            className="
                border-0
                border-r
                border-black
            "
            >
            {objetivos.length}
            </Campo>

            <Campo
            titulo="Metas registradas"
            className="border-0"
            >
            {metas.length}
            </Campo>

        </div>


        {/* ==================================================
            CONTENIDO
        ================================================== */}

        {objetivosOrdenados.length ===
        0 ? (
            <div
            className="
                mt-4
                border
                border-gray-400
                bg-gray-50
                px-4
                py-10
                text-center
                text-[9px]
                text-gray-600
            "
            >
            No existen objetivos y metas PESV registrados para el período{' '}

            <strong>
                {anio}
            </strong>.
            </div>
        ) : (
            objetivosOrdenados.map(
            (
                objetivo,
                indiceObjetivo
            ) => {
                const metasObjetivo =
                metasOrdenadas.filter(
                    meta =>
                    Number(
                        meta
                        ?.objetivo_id
                    ) ===
                    Number(
                        objetivo
                        ?.id
                    )
                )

                return (
                <div
                    key={
                    objetivo.id
                    }
                    className="
                    bloque-objetivo-pesv
                    "
                >

                    <ObjetivoDocumento
                    objetivo={
                        objetivo
                    }
                    metas={
                        metasObjetivo
                    }
                    continuacion={
                        false
                    }
                    numeroObjetivo={
                        indiceObjetivo +
                        1
                    }
                    inicioMeta={
                        0
                    }
                    />

                </div>
                )
            }
            )
        )}


        {/* ==================================================
            PIE DEL DOCUMENTO
        ================================================== */}

        <PieDocumento
            responsables={
            responsablesDocumento
            }
        />

        </section>
    </div>
  )
}