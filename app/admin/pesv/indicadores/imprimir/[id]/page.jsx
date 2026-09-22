  // app/admin/pesv/indicadores/imprimir/[id]/page.jsx

  'use client'

  import {
    useEffect,
    useState,
  } from 'react'

  import {
    useParams,
    useRouter,
  } from 'next/navigation'


  // ============================================================
  // HELPERS
  // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
  // ============================================================

  function texto(valor) {
    return String(
      valor ?? ''
    ).trim()
  }


  function normalizar(valor) {
    return texto(valor)
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toUpperCase()
  }


  function numero(valor) {
    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return null
    }

    const convertido =
      Number(valor)

    return Number.isFinite(
      convertido
    )
      ? convertido
      : null
  }


  function obtenerNitUsuario(user) {
    return texto(
      user?.nit ||
        user?.nitEmpresa ||
        user?.nit_empresa ||
        user?.empresaNit ||
        user?.empresa_nit ||
        ''
    )
  }


  function formatearFecha(valor) {
    if (!valor) {
      return '-'
    }

    const fecha =
      String(valor).slice(
        0,
        10
      )

    const partes =
      fecha.split('-')

    if (
      partes.length !== 3
    ) {
      return texto(valor)
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }


  function formatearFechaHora(valor) {
    if (!valor) {
      return '-'
    }

    try {
      const fecha =
        new Date(valor)

      if (
        Number.isNaN(
          fecha.getTime()
        )
      ) {
        return texto(valor)
      }

      return fecha.toLocaleString(
        'es-CO',
        {
          dateStyle:
            'short',

          timeStyle:
            'short',
        }
      )
    } catch {
      return texto(valor)
    }
  }


  function formatearNumero(
    valor,
    decimales = 1
  ) {
    const n =
      numero(valor)

    if (n === null) {
      return '-'
    }

    return new Intl.NumberFormat(
      'es-CO',
      {
        minimumFractionDigits:
          decimales,

        maximumFractionDigits:
          decimales,
      }
    ).format(n)
  }


  function formatearEntero(valor) {
    const n =
      numero(valor)

    if (n === null) {
      return '-'
    }

    return new Intl.NumberFormat(
      'es-CO',
      {
        maximumFractionDigits:
          0,
      }
    ).format(n)
  }


  function formatearKilometros(valor) {
    const n =
      numero(valor)

    if (n === null) {
      return '-'
    }

    return `${formatearNumero(
      n,
      1
    )} km`
  }


  function formatearMoneda(valor) {
    const n =
      numero(valor)

    if (n === null) {
      return '$ 0'
    }

    return new Intl.NumberFormat(
      'es-CO',
      {
        style:
          'currency',

        currency:
          'COP',

        minimumFractionDigits:
          0,

        maximumFractionDigits:
          2,
      }
    ).format(n)
  }


  function etiqueta(valor) {
    const limpio =
      texto(valor)

    if (!limpio) {
      return '-'
    }

    const clave =
      normalizar(limpio)

    if (clave === 'AUTOMATICO') {
      return 'Automático'
    }

    return limpio
      .replaceAll(
        '_',
        ' '
      )
      .toLowerCase()
      .replace(
        /\b\w/g,
        letra =>
          letra.toUpperCase()
      )
  }


  function valorONoAplica(valor) {
    return (
      texto(valor) ||
      '-'
    )
  }


  function obtenerNombrePeriodo(
    tipoPeriodo,
    numeroPeriodo,
    anio
  ) {
    const tipo =
      normalizar(
        tipoPeriodo
      )

    const numeroPeriodoValor =
      Number(
        numeroPeriodo
      )

    if (
      tipo ===
      'TRIMESTRE'
    ) {
      const nombres = [
        '',
        'Primer trimestre',
        'Segundo trimestre',
        'Tercer trimestre',
        'Cuarto trimestre',
      ]

      const nombre =
        nombres[
          numeroPeriodoValor
        ] ||
        `Trimestre ${numeroPeriodoValor}`

      return `${nombre} ${anio}`
    }

    if (
      tipo ===
      'MES'
    ) {
      const meses = [
        '',
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ]

      const nombre =
        meses[
          numeroPeriodoValor
        ] ||
        `Mes ${numeroPeriodoValor}`

      return `${nombre} ${anio}`
    }

    return `Vigencia ${anio}`
  }


  function obtenerDocumentoIndicador(
    documentos
  ) {
    const lista =
      Array.isArray(
        documentos
      )
        ? documentos
        : []

    const activos =
      lista.filter(
        item =>
          item?.activo !==
          false
      )


    // ==========================================================
    // DOCUMENTO EXACTO: INDICADOR PESV
    // ==========================================================

    const exacto =
      activos.find(
        item =>
          normalizar(
            item
              ?.nombre_documento
          ) ===
          'INDICADOR PESV'
      )

    if (exacto) {
      return exacto
    }


    // ==========================================================
    // BUSQUEDA POR NOMBRE
    // ==========================================================

    const aproximado =
      activos.find(
        item => {
          const nombre =
            normalizar(
              item
                ?.nombre_documento
            )

          return (
            nombre.includes(
              'INDICADOR'
            ) &&
            nombre.includes(
              'PESV'
            )
          )
        }
      )

    if (aproximado) {
      return aproximado
    }


    // ==========================================================
    // BUSQUEDA POR TIPO
    // ==========================================================

    const porTipo =
      activos.find(
        item => {
          const tipo =
            normalizar(
              item
                ?.tipo_documento
            )

          return (
            tipo.includes(
              'INDICADOR'
            ) &&
            tipo.includes(
              'PESV'
            )
          )
        }
      )

    return (
      porTipo ||
      null
    )
  }


  function obtenerUrlLogo(logo) {
    if (!logo) {
      return ''
    }

    if (
      typeof logo ===
      'string'
    ) {
      return logo
    }

    return texto(
      logo?.url ||
        logo?.logo_url ||
        logo?.publicUrl ||
        ''
    )
  }


  // ============================================================
  // COMPONENTES GENERALES
  // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
  // ============================================================

  function TituloSeccion({
    children,
  }) {
    return (
      <div
        className="
          titulo-seccion-indicador
          mt-[3mm]
          border
          border-black
          bg-gray-200
          px-[2.5mm]
          py-[1.5mm]
          text-[10px]
          font-black
          uppercase
          text-black
        "
      >
        {children}
      </div>
    )
  }


  function Campo({
    titulo,
    children,
    className = '',
  }) {
    return (
      <div
        className={`
          border
          border-black
          p-[2mm]
          ${className}
        `}
      >
        <div
          className="
            text-[8px]
            font-black
            uppercase
            leading-tight
            text-gray-800
          "
        >
          {titulo}
        </div>

        <div
          className="
            mt-[0.8mm]
            whitespace-pre-wrap
            break-words
            text-[9px]
            leading-[1.35]
            text-black
          "
        >
          {children}
        </div>
      </div>
    )
  }


  // ============================================================
  // VALOR DE ELEMENTO DEL ENCABEZADO CONFIGURADO
  // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
  // ============================================================

  function valorElementoEncabezado({
    elemento,
    documento,
    logo,
  }) {
    const tipo =
      normalizar(
        elemento?.tipo
      )

    const prefijo =
      texto(
        elemento?.prefijo
      )

    switch (
      tipo
    ) {
      case 'LOGO':
        return {
          tipo:
            'LOGO',

          valor:
            obtenerUrlLogo(
              logo
            ),
        }

      case 'NOMBRE_DOCUMENTO':
        return {
          tipo:
            'TEXTO',

          valor:
            texto(
              documento
                ?.nombre_documento
            ) ||
            'INDICADOR PESV',
        }

      case 'CODIGO':
        return {
          tipo:
            'TEXTO',

          valor:
            `${prefijo}${
              texto(
                documento
                  ?.codigo
              ) ||
              '-'
            }`,
        }

      case 'FECHA_EDICION':
        return {
          tipo:
            'TEXTO',

          valor:
            `${prefijo}${formatearFecha(
              documento
                ?.fecha_edicion
            )}`,
        }

      case 'VERSION':
        return {
          tipo:
            'TEXTO',

          valor:
            `${prefijo}${
              texto(
                documento
                  ?.version
              ) ||
              '-'
            }`,
        }

      case 'VIGENCIA':
        return {
          tipo:
            'TEXTO',

          valor:
            `${prefijo}${formatearFecha(
              documento
                ?.vigencia
            )}`,
        }

      case 'PAGINACION':
        return {
          tipo:
            'TEXTO',

          valor:
            `${prefijo}1 de 1`,
        }

      case 'TEXTO':
        return {
          tipo:
            'TEXTO',

          valor:
            texto(
              elemento?.valor
            ),
        }

      case 'VACIO':
      default:
        return {
          tipo:
            'TEXTO',

          valor:
            '',
        }
    }
  }


  // ============================================================
  // ENCABEZADO DOCUMENTAL CONFIGURADO
  // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
  //
  // Lee:
  // configuracion-documentos.encabezado.estructura
  // ============================================================

  function EncabezadoDocumento({
    encabezado,
    documento,
    logo,
  }) {
    const filas =
      Number(
        encabezado?.filas ||
        encabezado
          ?.estructura
          ?.filas?.length ||
        0
      )

    const columnas =
      Number(
        encabezado?.columnas ||
        encabezado
          ?.estructura
          ?.columnas?.length ||
        0
      )

    const estructura =
      encabezado?.estructura &&
      typeof encabezado
        .estructura ===
        'object'
        ? encabezado
            .estructura
        : null

    const celdas =
      Array.isArray(
        estructura?.celdas
      )
        ? estructura.celdas
        : []

    const columnasConfig =
      Array.isArray(
        estructura?.columnas
      )
        ? estructura.columnas
        : []

    const filasConfig =
      Array.isArray(
        estructura?.filas
      )
        ? estructura.filas
        : []


    if (
      !filas ||
      !columnas ||
      celdas.length ===
        0
    ) {
      return null
    }


    const ocupadas =
      new Set()

    const celdasPorPosicion =
      new Map()


    for (
      const celda of celdas
    ) {
      const filaInicio =
        Number(
          celda?.fila ||
          1
        )

      const columnaInicio =
        Number(
          celda?.columna ||
          1
        )

      const rowSpan =
        Number(
          celda?.rowSpan ||
          1
        )

      const colSpan =
        Number(
          celda?.colSpan ||
          1
        )

      celdasPorPosicion.set(
        `${filaInicio}-${columnaInicio}`,
        celda
      )

      for (
        let fila =
          filaInicio;
        fila <
          filaInicio +
            rowSpan;
        fila += 1
      ) {
        for (
          let columna =
            columnaInicio;
          columna <
            columnaInicio +
              colSpan;
          columna += 1
        ) {
          if (
            fila ===
              filaInicio &&
            columna ===
              columnaInicio
          ) {
            continue
          }

          ocupadas.add(
            `${fila}-${columna}`
          )
        }
      }
    }


    const anchoTotal =
      columnasConfig.reduce(
        (
          suma,
          columna
        ) =>
          suma +
          Number(
            columna?.ancho ||
            0
          ),
        0
      )


    return (
      <table
        className="
          tabla-encabezado-indicador
          w-full
          table-fixed
          border-collapse
          text-black
        "
      >
        <colgroup>
          {Array.from(
            {
              length:
                columnas,
            },
            (
              _,
              index
            ) => {
              const ancho =
                Number(
                  columnasConfig[
                    index
                  ]?.ancho ||
                  0
                )

              const porcentaje =
                anchoTotal >
                0
                  ? (
                      ancho /
                      anchoTotal
                    ) *
                    100
                  : 100 /
                    columnas

              return (
                <col
                  key={
                    index
                  }
                  style={{
                    width:
                      `${porcentaje}%`,
                  }}
                />
              )
            }
          )}
        </colgroup>

        <tbody>
          {Array.from(
            {
              length:
                filas,
            },
            (
              _,
              filaIndex
            ) => {
              const fila =
                filaIndex +
                1

              const altura =
                Number(
                  filasConfig[
                    filaIndex
                  ]?.altura ||
                  8
                )

              return (
                <tr
                  key={
                    fila
                  }
                  style={{
                    height:
                      `${altura}mm`,
                  }}
                >
                  {Array.from(
                    {
                      length:
                        columnas,
                    },
                    (
                      _,
                      columnaIndex
                    ) => {
                      const columna =
                        columnaIndex +
                        1

                      const posicion =
                        `${fila}-${columna}`

                      if (
                        ocupadas.has(
                          posicion
                        )
                      ) {
                        return null
                      }

                      const celda =
                        celdasPorPosicion.get(
                          posicion
                        )

                      if (
                        !celda
                      ) {
                        return (
                          <td
                            key={
                              posicion
                            }
                            className="
                              border
                              border-black
                            "
                          />
                        )
                      }


                      const elementos =
                        Array.isArray(
                          celda
                            ?.elementos
                        )
                          ? celda
                              .elementos
                          : []


                      const alineacionHorizontal =
                        celda
                          ?.alineacion_horizontal ===
                        'left'
                          ? 'text-left'
                          : celda
                              ?.alineacion_horizontal ===
                              'right'
                            ? 'text-right'
                            : 'text-center'


                      const alineacionVertical =
                        celda
                          ?.alineacion_vertical ===
                        'top'
                          ? 'align-top'
                          : celda
                              ?.alineacion_vertical ===
                              'bottom'
                            ? 'align-bottom'
                            : 'align-middle'


                      const estilosBorde = {
                        borderTop:
                          celda
                            ?.borde_superior ===
                          false
                            ? 'none'
                            : undefined,

                        borderBottom:
                          celda
                            ?.borde_inferior ===
                          false
                            ? 'none'
                            : undefined,

                        borderLeft:
                          celda
                            ?.borde_izquierdo ===
                          false
                            ? 'none'
                            : undefined,

                        borderRight:
                          celda
                            ?.borde_derecho ===
                          false
                            ? 'none'
                            : undefined,
                      }


                      return (
                        <td
                          key={
                            posicion
                          }
                          rowSpan={
                            Number(
                              celda
                                ?.rowSpan ||
                              1
                            )
                          }
                          colSpan={
                            Number(
                              celda
                                ?.colSpan ||
                              1
                            )
                          }
                          style={
                            estilosBorde
                          }
                          className={`
                            border
                            border-black
                            px-[1.2mm]
                            py-[0.8mm]
                            ${alineacionHorizontal}
                            ${alineacionVertical}
                          `}
                        >
                          <div
                            className="
                              flex
                              h-full
                              flex-col
                              justify-center
                              gap-[0.4mm]
                            "
                          >
                            {elementos.map(
                              (
                                elemento,
                                index
                              ) => {
                                const resultado =
                                  valorElementoEncabezado({
                                    elemento,
                                    documento,
                                    logo,
                                  })

                                if (
                                  resultado.tipo ===
                                  'LOGO'
                                ) {
                                  return resultado.valor ? (
                                    <img
                                      key={
                                        index
                                      }
                                      src={
                                        resultado.valor
                                      }
                                      alt="Logo"
                                      className="
                                        mx-auto
                                        max-h-[18mm]
                                        max-w-full
                                        object-contain
                                      "
                                    />
                                  ) : null
                                }

                                return (
                                  <div
                                    key={
                                      index
                                    }
                                    style={{
                                      fontSize:
                                        `${Number(
                                          elemento
                                            ?.tamano_fuente ||
                                          9
                                        )}px`,

                                      fontWeight:
                                        elemento
                                          ?.negrita
                                          ? 700
                                          : 400,
                                    }}
                                    className="
                                      break-words
                                      leading-tight
                                    "
                                  >
                                    {
                                      resultado.valor
                                    }
                                  </div>
                                )
                              }
                            )}
                          </div>
                        </td>
                      )
                    }
                  )}
                </tr>
              )
            }
          )}
        </tbody>
      </table>
    )
  }


  // ============================================================
  // TABLA TSV - RESULTADO DEL PERIODO
  // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
  // ============================================================

  function TablaTsv({
    medicion,
  }) {
    const datos =
      medicion
        ?.datos_calculo &&
      typeof medicion
        .datos_calculo ===
        'object'
        ? medicion
            .datos_calculo
        : {}

    const periodo =
      datos
        ?.periodo &&
      typeof datos
        .periodo ===
        'object'
        ? datos.periodo
        : {}

    const evaluacion =
      datos
        ?.evaluacion_metas &&
      typeof datos
        .evaluacion_metas ===
        'object'
        ? datos
            .evaluacion_metas
        : {}

    const niveles = [
      {
        clave:
          'fatalidades',

        nombre:
          'Fatalidades',
      },
      {
        clave:
          'heridos_graves',

        nombre:
          'Heridos graves',
      },
      {
        clave:
          'heridos_leves',

        nombre:
          'Heridos leves',
      },
      {
        clave:
          'choques_simples',

        nombre:
          'Choques simples',
      },
    ]


    return (
      <table
        className="
          tabla-datos-indicador
          w-full
          table-fixed
          border-collapse
          text-black
        "
      >
        <thead>
          <tr
            className="
              bg-gray-800
              text-white
            "
          >
            <th
              className="
                border
                border-black
                p-[1.5mm]
                text-left
                text-[8px]
              "
            >
              Nivel de perdida
            </th>

            <th
              className="
                border
                border-black
                p-[1.5mm]
                text-center
                text-[8px]
              "
            >
              Eventos
            </th>

            <th
              className="
                border
                border-black
                p-[1.5mm]
                text-center
                text-[8px]
              "
            >
              Linea base
            </th>

            <th
              className="
                border
                border-black
                p-[1.5mm]
                text-center
                text-[8px]
              "
            >
              Meta
            </th>

            <th
              className="
                border
                border-black
                p-[1.5mm]
                text-center
                text-[8px]
              "
            >
              Tasa
            </th>

            <th
              className="
                border
                border-black
                p-[1.5mm]
                text-center
                text-[8px]
              "
            >
              Cumplimiento
            </th>
          </tr>
        </thead>

        <tbody>
          {niveles.map(
            nivel => {
              const evaluacionNivel =
                evaluacion?.[
                  nivel.clave
                ] &&
                typeof evaluacion[
                  nivel.clave
                ] ===
                  'object'
                  ? evaluacion[
                      nivel.clave
                    ]
                  : {}

              const operador =
                texto(
                  evaluacionNivel
                    ?.operador_meta
                )

              const cumple =
                evaluacionNivel
                  ?.cumple_meta

              return (
                <tr
                  key={
                    nivel.clave
                  }
                >
                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-[9px]
                      font-bold
                    "
                  >
                    {nivel.nombre}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-center
                      text-[9px]
                    "
                  >
                    {formatearEntero(
                      periodo?.[
                        nivel.clave
                      ]
                    )}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-center
                      text-[9px]
                    "
                  >
                    {formatearNumero(
                      evaluacionNivel
                        ?.linea_base,
                      1
                    )}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-center
                      text-[9px]
                      font-bold
                    "
                  >
                    {operador || '-'}{' '}

                    {formatearNumero(
                      evaluacionNivel
                        ?.valor_meta,
                      1
                    )}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-center
                      text-[9px]
                      font-black
                    "
                  >
                    {formatearNumero(
                      evaluacionNivel
                        ?.valor_resultado,
                      1
                    )}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-center
                      text-[8px]
                      font-black
                    "
                  >
                    {cumple === true
                      ? 'CUMPLE'
                      : cumple === false
                        ? 'NO CUMPLE'
                        : 'SIN EVALUAR'}
                  </td>
                </tr>
              )
            }
          )}
        </tbody>
      </table>
    )
  }


  // ============================================================
  // TABLA TSV - ACUMULADO ANUAL
  // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
  // ============================================================

  function TablaAcumuladoTsv({
    medicion,
  }) {
    const acumulado =
      medicion
        ?.datos_calculo
        ?.acumulado_anual &&
      typeof medicion
        .datos_calculo
        .acumulado_anual ===
        'object'
        ? medicion
            .datos_calculo
            .acumulado_anual
        : {}

    const tasas =
      acumulado
        ?.tasas_por_nivel &&
      typeof acumulado
        .tasas_por_nivel ===
        'object'
        ? acumulado
            .tasas_por_nivel
        : {}

    const niveles = [
      {
        clave:
          'fatalidades',

        nombre:
          'Fatalidades',
      },
      {
        clave:
          'heridos_graves',

        nombre:
          'Heridos graves',
      },
      {
        clave:
          'heridos_leves',

        nombre:
          'Heridos leves',
      },
      {
        clave:
          'choques_simples',

        nombre:
          'Choques simples',
      },
    ]


    return (
      <div>
        <table
          className="
            tabla-datos-indicador
            w-full
            table-fixed
            border-collapse
            text-black
          "
        >
          <thead>
            <tr
              className="
                bg-gray-100
              "
            >
              <th
                className="
                  border
                  border-black
                  p-[1.5mm]
                  text-left
                  text-[8px]
                "
              >
                Nivel
              </th>

              <th
                className="
                  border
                  border-black
                  p-[1.5mm]
                  text-center
                  text-[8px]
                "
              >
                Eventos acumulados
              </th>

              <th
                className="
                  border
                  border-black
                  p-[1.5mm]
                  text-center
                  text-[8px]
                "
              >
                Tasa acumulada
              </th>
            </tr>
          </thead>

          <tbody>
            {niveles.map(
              nivel => (
                <tr
                  key={
                    nivel.clave
                  }
                >
                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-[9px]
                      font-bold
                    "
                  >
                    {nivel.nombre}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-center
                      text-[9px]
                    "
                  >
                    {formatearEntero(
                      acumulado?.[
                        nivel.clave
                      ]
                    )}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-center
                      text-[9px]
                      font-black
                    "
                  >
                    {formatearNumero(
                      tasas?.[
                        nivel.clave
                      ],
                      1
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        <Campo
          titulo="Kilometros acumulados de la vigencia"
          className="
            border-t-0
          "
        >
          {formatearKilometros(
            acumulado
              ?.kilometros_recorridos
          )}
        </Campo>
      </div>
    )
  }


  // ============================================================
  // TABLA TSV - COSTOS COMPLEMENTARIOS DEL PERIODO
  // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
  //
  // Esta información NO interviene en el cálculo del TSV.
  // Se presenta como apoyo para el reporte de autogestión PESV.
  // ============================================================

  function TablaCostosTsv({
    costosTsv,
  }) {
    if (
      !costosTsv ||
      costosTsv?.disponible ===
        false
    ) {
      return (
        <Campo
          titulo="Información de costos"
        >
          {texto(
            costosTsv?.mensaje
          ) ||
            'No fue posible consultar la información complementaria de costos del período.'}
        </Campo>
      )
    }

    const resumen =
      costosTsv?.resumen &&
      typeof costosTsv
        .resumen ===
        'object'
        ? costosTsv.resumen
        : {}

    const costos =
      resumen?.costos &&
      typeof resumen.costos ===
        'object'
        ? resumen.costos
        : {}

    const filas = [
      {
        nombre:
          'Fatalidades',

        directo:
          numero(
            costos
              ?.directo_fatalidades
          ) || 0,

        indirecto:
          numero(
            costos
              ?.indirecto_fatalidades
          ) || 0,
      },
      {
        nombre:
          'Heridos graves',

        directo:
          numero(
            costos
              ?.directo_graves
          ) || 0,

        indirecto:
          numero(
            costos
              ?.indirecto_graves
          ) || 0,
      },
      {
        nombre:
          'Heridos leves',

        directo:
          numero(
            costos
              ?.directo_leves
          ) || 0,

        indirecto:
          numero(
            costos
              ?.indirecto_leves
          ) || 0,
      },
      {
        nombre:
          'Choques simples',

        directo:
          numero(
            costos
              ?.directo_choque
          ) || 0,

        indirecto:
          numero(
            costos
              ?.indirecto_choque
          ) || 0,
      },
    ]

    const totalSiniestros =
      numero(
        resumen
          ?.total_siniestros
      ) || 0

    const pendientes =
      numero(
        resumen
          ?.pendientes
      ) || 0

    const enAnalisis =
      numero(
        resumen
          ?.en_analisis
      ) || 0

    const cerrados =
      numero(
        resumen
          ?.cerrados
      ) || 0

    const informacionCompleta =
      totalSiniestros ===
        0 ||
      (
        pendientes ===
          0 &&
        enAnalisis ===
          0 &&
        cerrados ===
          totalSiniestros
      )

    return (
      <div>
        <div
          className="
            grid
            grid-cols-4
          "
        >
          <Campo
            titulo="Siniestros del periodo"
            className="
              border-r-0
            "
          >
            {formatearEntero(
              totalSiniestros
            )}
          </Campo>

          <Campo
            titulo="Cerrados"
            className="
              border-r-0
            "
          >
            {formatearEntero(
              cerrados
            )}
          </Campo>

          <Campo
            titulo="En analisis"
            className="
              border-r-0
            "
          >
            {formatearEntero(
              enAnalisis
            )}
          </Campo>

          <Campo
            titulo="Pendientes"
          >
            {formatearEntero(
              pendientes
            )}
          </Campo>
        </div>

        {totalSiniestros ===
        0 ? (
          <Campo
            titulo="Estado de la información"
            className="
              border-t-0
            "
          >
            SIN SINIESTROS VIALES REPORTADOS EN EL PERÍODO
          </Campo>
        ) : (
          <Campo
            titulo="Estado de la información de costos"
            className="
              border-t-0
            "
          >
            {informacionCompleta
              ? 'COMPLETA'
              : 'INCOMPLETA - existen siniestros pendientes de cierre administrativo y los costos pueden estar pendientes de consolidar.'}
          </Campo>
        )}

        <table
          className="
            tabla-datos-indicador
            w-full
            table-fixed
            border-collapse
            text-black
          "
        >
          <thead>
            <tr
              className="
                bg-gray-100
              "
            >
              <th
                className="
                  border
                  border-black
                  p-[1.5mm]
                  text-left
                  text-[8px]
                "
              >
                Nivel de pérdida
              </th>

              <th
                className="
                  border
                  border-black
                  p-[1.5mm]
                  text-center
                  text-[8px]
                "
              >
                Costos directos
              </th>

              <th
                className="
                  border
                  border-black
                  p-[1.5mm]
                  text-center
                  text-[8px]
                "
              >
                Costos indirectos
              </th>

              <th
                className="
                  border
                  border-black
                  p-[1.5mm]
                  text-center
                  text-[8px]
                "
              >
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {filas.map(
              fila => (
                <tr
                  key={
                    fila.nombre
                  }
                >
                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-[9px]
                      font-bold
                    "
                  >
                    {fila.nombre}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-right
                      text-[9px]
                    "
                  >
                    {formatearMoneda(
                      fila.directo
                    )}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-right
                      text-[9px]
                    "
                  >
                    {formatearMoneda(
                      fila.indirecto
                    )}
                  </td>

                  <td
                    className="
                      border
                      border-black
                      p-[1.5mm]
                      text-right
                      text-[9px]
                      font-bold
                    "
                  >
                    {formatearMoneda(
                      fila.directo +
                      fila.indirecto
                    )}
                  </td>
                </tr>
              )
            )}

            <tr
              className="
                bg-gray-100
                font-black
              "
            >
              <td
                className="
                  border
                  border-black
                  p-[1.5mm]
                  text-[9px]
                "
              >
                TOTAL
              </td>

              <td
                className="
                  border
                  border-black
                  p-[1.5mm]
                  text-right
                  text-[9px]
                "
              >
                {formatearMoneda(
                  costos
                    ?.total_directo
                )}
              </td>

              <td
                className="
                  border
                  border-black
                  p-[1.5mm]
                  text-right
                  text-[9px]
                "
              >
                {formatearMoneda(
                  costos
                    ?.total_indirecto
                )}
              </td>

              <td
                className="
                  border
                  border-black
                  p-[1.5mm]
                  text-right
                  text-[9px]
                "
              >
                {formatearMoneda(
                  costos
                    ?.total_general
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <Campo
          titulo="Nota"
          className="
            border-t-0
          "
        >
          Información complementaria: los costos de los siniestros viales se presentan como apoyo para el reporte de autogestión y no intervienen en el cálculo ni en la evaluación de cumplimiento del indicador TSV.
        </Campo>
      </div>
    )
  }



  // ============================================================
  // CM_PESV - DETALLE DE METAS CONSIDERADAS
  // ============================================================

  function TablaDetalleMetasCmPesv({
    medicion,
  }) {
    const datos =
      medicion?.datos_calculo &&
      typeof medicion.datos_calculo === 'object'
        ? medicion.datos_calculo
        : {}

    const detalle =
      Array.isArray(datos?.detalle_metas)
        ? datos.detalle_metas
        : []

    if (detalle.length === 0) {
      return (
        <Campo titulo="Detalle de metas">
          No se encontró el detalle de las metas considerado en esta medición.
        </Campo>
      )
    }

    function estadoMeta(item) {
      if (item?.cumple_meta === true) {
        return 'ALCANZADA'
      }

      if (item?.cumple_meta === false) {
        return 'NO ALCANZADA'
      }

      const estado =
        normalizar(
          item?.estado_evaluacion
        )

      if (
        estado ===
        'PENDIENTE_ACREDITACION'
      ) {
        return 'PENDIENTE DE ACREDITACIÓN'
      }

      if (
        estado ===
        'SIN_INDICADOR'
      ) {
        return 'SIN INDICADOR'
      }

      if (
        estado ===
        'CONFIGURACION_INCOMPLETA'
      ) {
        return 'CONFIGURACIÓN INCOMPLETA'
      }

      if (
        estado ===
        'NO_EVALUABLE'
      ) {
        return 'NO EVALUABLE'
      }

      return (
        etiqueta(
          item?.estado_evaluacion
        ) || 'SIN EVALUAR'
      )
    }

    function resultadoMeta(item) {
      const codigo =
        normalizar(
          item?.indicador_codigo
        )

      if (codigo === 'TSV') {
        const componentes =
          Array.isArray(
            item?.detalle_componentes
          )
            ? item.detalle_componentes
            : Array.isArray(
                item?.componentes_tsv
              )
              ? item.componentes_tsv
              : []

        if (componentes.length > 0) {
          return componentes
            .map(componente => {
              const nombre =
                etiqueta(
                  componente?.componente ||
                  componente?.clave ||
                  componente?.nombre
                )

              const valor =
                numero(
                  componente?.valor_resultado ??
                  componente?.valor ??
                  componente?.resultado
                )

              return `${nombre}: ${
                valor === null
                  ? '-'
                  : formatearNumero(
                      valor,
                      0
                    )
              }`
            })
            .join(' · ')
        }

        const resultadoTsv =
          item?.resultado &&
          typeof item.resultado === 'object'
            ? item.resultado
            : item?.resultado_tsv &&
                typeof item.resultado_tsv === 'object'
              ? item.resultado_tsv
              : item?.datos_resultado &&
                  typeof item.datos_resultado === 'object'
                ? item.datos_resultado
                : {}

        const fatalidades =
          numero(
            item?.fatalidades ??
            resultadoTsv?.fatalidades
          )

        const heridosGraves =
          numero(
            item?.heridos_graves ??
            resultadoTsv?.heridos_graves
          )

        if (
          fatalidades !== null ||
          heridosGraves !== null
        ) {
          return [
            `Fatalidades: ${
              fatalidades === null
                ? '-'
                : formatearEntero(
                    fatalidades
                  )
            }`,
            `Heridos graves: ${
              heridosGraves === null
                ? '-'
                : formatearEntero(
                    heridosGraves
                  )
            }`,
          ].join(' · ')
        }
      }

      const valor =
        numero(
          item?.valor_resultado
        )

      if (valor === null) {
        return '-'
      }

      const unidad =
        normalizar(
          item?.unidad_meta
        )

      const sufijo =
        unidad === 'PORCENTAJE'
          ? ' %'
          : ''

      return `${formatearNumero(
        valor,
        2
      )}${sufijo}`
    }

    return (
      <table
        className="
          tabla-datos-indicador
          tabla-detalle-metas-cm-pesv
          w-full
          table-fixed
          border-collapse
          text-black
        "
      >
        <colgroup>
          <col
            style={{
              width: '13%',
            }}
          />
          <col
            style={{
              width: '22%',
            }}
          />
          <col
            style={{
              width: '37%',
            }}
          />
          <col
            style={{
              width: '28%',
            }}
          />
        </colgroup>

        <thead>
          <tr
            className="
              bg-gray-800
              text-white
            "
          >
            <th
              className="
                border
                border-black
                p-[1.4mm]
                text-left
                text-[8px]
              "
            >
              Meta
            </th>

            <th
              className="
                border
                border-black
                p-[1.4mm]
                text-left
                text-[8px]
              "
            >
              Indicador
            </th>

            <th
              className="
                border
                border-black
                p-[1.4mm]
                text-left
                text-[8px]
              "
            >
              Resultado
            </th>

            <th
              className="
                border
                border-black
                p-[1.4mm]
                text-left
                text-[8px]
              "
            >
              Estado
            </th>
          </tr>
        </thead>

        <tbody>
          {detalle.map(
            (
              item,
              index
            ) => (
              <tr
                key={
                  item?.meta_id ||
                  index
                }
              >
                <td
                  className="
                    border
                    border-black
                    p-[1.4mm]
                    text-[8px]
                    font-black
                  "
                >
                  {valorONoAplica(
                    item?.meta_codigo
                  )}
                </td>

                <td
                  className="
                    border
                    border-black
                    p-[1.4mm]
                    text-[8px]
                    font-bold
                  "
                >
                  {valorONoAplica(
                    item?.indicador_codigo
                  )}
                </td>

                <td
                  className="
                    border
                    border-black
                    p-[1.4mm]
                    text-[8px]
                    leading-[1.3]
                  "
                >
                  {resultadoMeta(
                    item
                  )}
                </td>

                <td
                  className="
                    border
                    border-black
                    p-[1.4mm]
                    text-[8px]
                    font-bold
                  "
                >
                  {estadoMeta(
                    item
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    )
  }


  // ============================================================
  // FILA ESTRUCTURAL DEL DOCUMENTO
  // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
  //
  // Cada parte del documento se representa como una fila real del TBODY.
  // Las filas marcadas como `divisible` pueden continuar en la pagina
  // siguiente. Los titulos de seccion usan `titulo-seccion-indicador`,
  // por lo que el navegador evita dejarlos solos al final de una pagina:
  // el titulo permanece acompañado por el primer contenido disponible.
  // Las filas internas de las tablas siguen siendo indivisibles.
  // ============================================================

  function FilaDocumento({
    children,
    divisible = false,
  }) {
    return (
      <tr
        className={`
          fila-contenido-indicador
          fila-bloque-indicador
          ${divisible
            ? 'fila-bloque-indicador-divisible'
            : 'fila-bloque-indicador-no-divisible'}
        `}
      >
        <td
          className="
            celda-contenido-indicador
            p-0
            align-top
          "
        >
          {children}
        </td>
      </tr>
    )
  }


  // ============================================================
  // PAGINA PRINCIPAL
  // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
  // ============================================================

  export default function ImprimirIndicadorPesvPage() {
    const router =
      useRouter()

    const params =
      useParams()

    const idMedicion =
      Number(
        params?.id
      )


    // ==========================================================
    // ESTADOS
    // ==========================================================

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
      empresa,
      setEmpresa,
    ] =
      useState(
        null
      )

    const [
      indicador,
      setIndicador,
    ] =
      useState(
        null
      )

    const [
      medicion,
      setMedicion,
    ] =
      useState(
        null
      )

    const [
      configuracion,
      setConfiguracion,
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
      encabezado,
      setEncabezado,
    ] =
      useState(
        null
      )

    const [
      logo,
      setLogo,
    ] =
      useState(
        null
      )

    const [
      costosTsv,
      setCostosTsv,
    ] =
      useState(
        null
      )


    // ==========================================================
    // CLASES ESPECIALES PARA IMPRESION
    // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
    // ==========================================================

    useEffect(
      () => {
        document
          .documentElement
          .classList
          .add(
            'html-soporte-indicador-pesv'
          )

        document
          .body
          .classList
          .add(
            'body-soporte-indicador-pesv'
          )

        return () => {
          document
            .documentElement
            .classList
            .remove(
              'html-soporte-indicador-pesv'
            )

          document
            .body
            .classList
            .remove(
              'body-soporte-indicador-pesv'
            )
        }
      },
      []
    )


    // ==========================================================
    // CARGAR SESION
    // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
    // ==========================================================

    useEffect(
      () => {
        let currentUser =
          null

        try {
          currentUser =
            JSON.parse(
              localStorage.getItem(
                'currentUser'
              ) ||
              'null'
            )
        } catch (
          errorSesion
        ) {
          console.error(
            'Error leyendo currentUser:',
            errorSesion
          )
        }

        if (
          !currentUser
        ) {
          router.replace(
            '/login'
          )

          return
        }

        setUsuario(
          currentUser
        )
      },
      [
        router,
      ]
    )


    // ==========================================================
    // CARGAR SOPORTE DEL INDICADOR
    // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
    // API:
    // /api/admin/pesv/indicadores
    // /api/admin/configuracion-documentos
    // /api/admin/pesv/riesgos
    // ==========================================================

    useEffect(
      () => {
        if (
          !usuario ||
          !idMedicion
        ) {
          return
        }

        const nit =
          obtenerNitUsuario(
            usuario
          )

        if (!nit) {
          setError(
            'No fue posible identificar el NIT del CEA.'
          )

          setCargando(
            false
          )

          return
        }


        const parametrosUrl =
          new URLSearchParams(
            window.location.search
          )

        const anio =
          Number(
            parametrosUrl.get(
              'anio'
            )
          )

        const indicadorId =
          Number(
            parametrosUrl.get(
              'indicador_id'
            )
          )


        if (!anio) {
          setError(
            'No fue posible identificar la vigencia.'
          )

          setCargando(
            false
          )

          return
        }


        if (!indicadorId) {
          setError(
            'No fue posible identificar el indicador.'
          )

          setCargando(
            false
          )

          return
        }


        let activo =
          true


        async function cargarDatos() {
          try {
            setCargando(
              true
            )

            setError(
              ''
            )


            // ==================================================
            // 1. CONSULTAR INDICADOR Y MEDICION
            // ==================================================

            const parametrosIndicador =
              new URLSearchParams({
                nit,

                anio:
                  String(
                    anio
                  ),

                indicador_id:
                  String(
                    indicadorId
                  ),
              })


            const respuestaIndicadores =
              await fetch(
                `/api/admin/pesv/indicadores?${parametrosIndicador.toString()}`,
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


            const dataIndicadores =
              await respuestaIndicadores.json()


            if (
              !respuestaIndicadores.ok ||
              dataIndicadores
                ?.status ===
                'failed'
            ) {
              throw new Error(
                dataIndicadores
                  ?.message ||
                'No fue posible consultar los indicadores.'
              )
            }


            const listaIndicadores =
              Array.isArray(
                dataIndicadores
                  ?.indicadores
              )
                ? dataIndicadores
                    .indicadores
                : Array.isArray(
                      dataIndicadores
                        ?.catalogo
                    )
                  ? dataIndicadores
                      .catalogo
                  : []


            const indicadorEncontrado =
              listaIndicadores.find(
                item =>
                  Number(
                    item?.id
                  ) ===
                  indicadorId
              ) ||
              null


            if (
              !indicadorEncontrado
            ) {
              throw new Error(
                'No se encontro el indicador solicitado.'
              )
            }


            const listaMediciones =
              Array.isArray(
                dataIndicadores
                  ?.mediciones
              )
                ? dataIndicadores
                    .mediciones
                : []


            const medicionEncontrada =
              listaMediciones.find(
                item =>
                  Number(
                    item?.id
                  ) ===
                  idMedicion
              ) ||
              null


            if (
              !medicionEncontrada
            ) {
              throw new Error(
                'No se encontro la medicion solicitada.'
              )
            }


            const listaConfiguraciones =
              Array.isArray(
                dataIndicadores
                  ?.configuraciones
              )
                ? dataIndicadores
                    .configuraciones
                : []


            const configuracionEncontrada =
              listaConfiguraciones.find(
                item =>
                  Number(
                    item
                      ?.indicador_id
                  ) ===
                    indicadorId &&
                  Number(
                    item?.anio
                  ) ===
                    anio
              ) ||
              null


            // ==================================================
            // 2. CONSULTAR CONFIGURACION DOCUMENTAL
            // ==================================================

            const parametrosDocumentos =
              new URLSearchParams({
                nit,
              })


            const respuestaDocumentos =
              await fetch(
                `/api/admin/configuracion-documentos?${parametrosDocumentos.toString()}`,
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


            const dataDocumentos =
              await respuestaDocumentos.json()


            if (
              !respuestaDocumentos.ok ||
              dataDocumentos
                ?.ok !==
                true
            ) {
              throw new Error(
                dataDocumentos
                  ?.error ||
                dataDocumentos
                  ?.message ||
                'No fue posible consultar la configuracion documental.'
              )
            }


            const documentoEncontrado =
              obtenerDocumentoIndicador(
                dataDocumentos
                  ?.documentos
              )


            if (
              !documentoEncontrado
            ) {
              throw new Error(
                'No se encontro el documento INDICADOR PESV en Otros Documentos.'
              )
            }


            const encabezadoEncontrado =
              dataDocumentos
                ?.encabezado ||
              null


            if (
              !encabezadoEncontrado
            ) {
              throw new Error(
                'No se encontro la configuracion del encabezado documental.'
              )
            }


            // ==================================================
            // 3. CONSULTAR LOGO
            // ==================================================

            let logoEncontrado =
              null

            try {
              const parametrosLogo =
                new URLSearchParams({
                  nit,

                  anio:
                    String(
                      anio
                    ),
                })


              const respuestaLogo =
                await fetch(
                  `/api/admin/pesv/riesgos?${parametrosLogo.toString()}`,
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


              const dataLogo =
                await respuestaLogo.json()


              if (
                respuestaLogo.ok
              ) {
                logoEncontrado =
                  dataLogo
                    ?.logo ||
                  null
              }
            } catch (
              errorLogo
            ) {
              console.warn(
                'No fue posible cargar el logo:',
                errorLogo
              )
            }


            // ==================================================
            // 4. CONSULTAR COSTOS COMPLEMENTARIOS DEL TSV
            // app/admin/pesv/indicadores/imprimir/[id]/page.jsx
            //
            // API:
            // /api/admin/consultas/siniestros
            //
            // Se consulta exactamente el período almacenado
            // en la medición. No se recalcula el indicador TSV.
            // ==================================================

            let costosTsvEncontrados =
              null

            if (
              normalizar(
                indicadorEncontrado
                  ?.codigo
              ) ===
                'TSV' &&
              medicionEncontrada
                ?.periodo_desde &&
              medicionEncontrada
                ?.periodo_hasta
            ) {
              try {
                const parametrosCostos =
                  new URLSearchParams({
                    nit,

                    recurso:
                      'exportar',

                    fecha_inicio:
                      String(
                        medicionEncontrada
                          .periodo_desde
                      ).slice(
                        0,
                        10
                      ),

                    fecha_fin:
                      String(
                        medicionEncontrada
                          .periodo_hasta
                      ).slice(
                        0,
                        10
                      ),
                  })


                const respuestaCostos =
                  await fetch(
                    `/api/admin/consultas/siniestros?${parametrosCostos.toString()}`,
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


                const dataCostos =
                  await respuestaCostos.json()


                if (
                  !respuestaCostos.ok ||
                  dataCostos
                    ?.status ===
                    'failed'
                ) {
                  throw new Error(
                    dataCostos
                      ?.message ||
                    'No fue posible consultar los costos de siniestros.'
                  )
                }


                costosTsvEncontrados = {
                  disponible:
                    true,

                  resumen:
                    dataCostos
                      ?.resumen ||
                    {},
                }
              } catch (
                errorCostos
              ) {
                console.warn(
                  'No fue posible cargar los costos complementarios del TSV:',
                  errorCostos
                )

                costosTsvEncontrados = {
                  disponible:
                    false,

                  mensaje:
                    errorCostos
                      ?.message ||
                    'No fue posible consultar la información complementaria de costos del período.',
                }
              }
            }


            if (!activo) {
              return
            }


            // ==================================================
            // GUARDAR ESTADOS
            // ==================================================

            setEmpresa(
              dataIndicadores
                ?.empresa ||
              dataDocumentos
                ?.empresa ||
              null
            )

            setIndicador(
              indicadorEncontrado
            )

            setMedicion(
              medicionEncontrada
            )

            setConfiguracion(
              configuracionEncontrada
            )

            setDocumento(
              documentoEncontrado
            )

            setEncabezado(
              encabezadoEncontrado
            )

            setLogo(
              logoEncontrado
            )

            setCostosTsv(
              costosTsvEncontrados
            )
          } catch (
            err
          ) {
            console.error(
              'Error preparando INDICADOR PESV:',
              err
            )

            if (activo) {
              setError(
                err?.message ||
                'No fue posible preparar el soporte.'
              )
            }
          } finally {
            if (activo) {
              setCargando(
                false
              )
            }
          }
        }


        cargarDatos()


        return () => {
          activo =
            false
        }
      },
      [
        usuario,
        idMedicion,
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
            flex
            min-h-screen
            items-center
            justify-center
            bg-gray-100
            p-6
          "
        >
          <div
            className="
              rounded-xl
              border
              border-gray-200
              bg-white
              px-6
              py-5
              text-sm
              font-bold
              text-gray-700
              shadow-sm
            "
          >
            Preparando soporte del indicador PESV...
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
              rounded-xl
              border
              border-red-200
              bg-white
              p-5
              shadow-sm
            "
          >
            <div
              className="
                text-lg
                font-black
                text-red-700
              "
            >
              No fue posible generar el soporte
            </div>

            <div
              className="
                mt-2
                text-sm
                text-gray-700
              "
            >
              {error}
            </div>

            <button
              type="button"
              onClick={
                () =>
                  router.push(
                    '/admin/pesv/indicadores'
                  )
              }
              className="
                mt-5
                rounded-lg
                bg-slate-800
                px-4
                py-2
                text-sm
                font-bold
                text-white
              "
            >
              Regresar
            </button>
          </div>
        </div>
      )
    }


    // ==========================================================
    // PROTECCION
    // ==========================================================

    if (
      !indicador ||
      !medicion ||
      !documento ||
      !encabezado
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
              rounded-xl
              bg-white
              p-5
              shadow-sm
            "
          >
            <div
              className="
                text-base
                font-black
                text-gray-800
              "
            >
              No fue posible preparar el documento.
            </div>

            <button
              type="button"
              onClick={
                () =>
                  router.push(
                    '/admin/pesv/indicadores'
                  )
              }
              className="
                mt-5
                rounded-lg
                bg-slate-800
                px-4
                py-2
                text-sm
                font-bold
                text-white
              "
            >
              Regresar
            </button>
          </div>
        </div>
      )
    }


    // ==========================================================
    // DATOS DERIVADOS
    // ==========================================================

    const codigoIndicador =
      normalizar(
        indicador?.codigo
      )

    const esTsv =
      codigoIndicador ===
      'TSV'

    const esRsvi =
      codigoIndicador ===
      'RSVI'

    const esGrv =
      codigoIndicador ===
      'GRV'

    const esCmPesv =
      codigoIndicador ===
      'CM_PESV'

    const esCplanPesv =
      codigoIndicador ===
      'CPLAN_PESV'

    const esEjlc =
      codigoIndicador ===
      'EJLC'

    const esIdp =
      codigoIndicador ===
      'IDP'

    const nombrePeriodo =
      obtenerNombrePeriodo(
        medicion
          ?.tipo_periodo,

        medicion
          ?.numero_periodo,

        medicion
          ?.anio
      )

    const datosCalculo =
      medicion
        ?.datos_calculo &&
      typeof medicion
        .datos_calculo ===
        'object'
        ? medicion
            .datos_calculo
        : {}

    const periodo =
      datosCalculo
        ?.periodo &&
      typeof datosCalculo
        .periodo ===
        'object'
        ? datosCalculo
            .periodo
        : {}


    // ==========================================================
    // DOCUMENTO
    // ==========================================================

    return (
      <div
        className="
          pagina-soporte-indicador-pesv
          min-h-screen
          bg-gray-200
        "
      >

        {/* ====================================================
            BARRA DE ACCIONES
            No se imprime.
        ==================================================== */}

        <div
          className="
            no-print
            mx-auto
            mb-4
            flex
            w-[215.9mm]
            max-w-[calc(100vw-24px)]
            items-center
            justify-between
            gap-3
            rounded-xl
            border
            border-gray-200
            bg-white
            px-4
            py-3
            shadow-sm
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
              INDICADOR PESV
            </div>

            <div
              className="
                mt-1
                text-xs
                text-gray-500
              "
            >
              {valorONoAplica(
                indicador?.codigo
              )}

              {' - '}

              {nombrePeriodo}

              {' - '}

              {etiqueta(
                medicion?.estado
              )}
            </div>
          </div>

          <div
            className="
              flex
              shrink-0
              gap-2
            "
          >
            <button
              type="button"
                          onClick={
                () =>
                  router.push(
                    '/admin/pesv/indicadores'
                  )
              }
              className="
                rounded-lg
                border
                border-gray-300
                bg-white
                px-4
                py-2
                text-xs
                font-bold
                text-gray-700
              "
            >
              Regresar
            </button>

            <button
              type="button"
              onClick={
                () =>
                  window.print()
              }
              className="
                rounded-lg
                bg-slate-800
                px-4
                py-2
                text-xs
                font-bold
                text-white
              "
            >
              Imprimir / Guardar PDF
            </button>
          </div>
        </div>


        {/* ====================================================
            HOJA CARTA
        ==================================================== */}

        <main
          className="
            hoja-soporte-indicador-pesv
            mx-auto
            bg-white
            text-black
            shadow-lg
          "
        >
          <table
            className="
              tabla-documento-indicador-pesv
              w-full
              border-collapse
            "
          >

            {/* ==================================================
                ENCABEZADO REPETIBLE
                El navegador repite THEAD en cada pagina.
            ================================================== */}

            <thead
              className="
                encabezado-indicador-repetible
              "
            >
              <tr>
                <td
                  className="
                    celda-encabezado-indicador
                    p-0
                    align-top
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
                  />
                </td>
              </tr>
            </thead>


            {/* ==================================================
                CONTENIDO
            ================================================== */}

            <tbody>
                  {/* ============================================
                      TITULO
                  ============================================ */}

                  <FilaDocumento>

                  <div
                    className="
                      bloque-no-dividir
                      border
                      border-black
                      bg-slate-800
                      px-[3mm]
                      py-[2.5mm]
                      text-center
                      text-white
                    "
                  >
                    <div
                      className="
                        text-[12px]
                        font-black
                        uppercase
                      "
                    >
                      SOPORTE DE MEDICIÓN DEL INDICADOR PESV
                    </div>

                    <div
                      className="
                        mt-[1mm]
                        text-[9px]
                        font-bold
                      "
                    >
                      {valorONoAplica(
                        indicador?.codigo
                      )}

                      {' - '}

                      {valorONoAplica(
                        indicador?.nombre
                      )}
                    </div>
                  </div>
                  </FilaDocumento>


                  {/* ============================================
                      1. IDENTIFICACION
                  ============================================ */}

                  <FilaDocumento divisible>

                  <div
                    className="
                      bloque-no-dividir
                    "
                  >
                    <TituloSeccion>
                      1. Ficha técnica del indicador
                    </TituloSeccion>

                    <div
                      className="
                        grid
                        grid-cols-4
                      "
                    >
                      <Campo
                        titulo="Código"
                        className="
                          border-r-0
                        "
                      >
                        {valorONoAplica(
                          indicador?.codigo
                        )}
                      </Campo>

                      <Campo
                        titulo="Vigencia"
                        className="
                          border-r-0
                        "
                      >
                        {medicion?.anio}
                      </Campo>

                      <Campo
                        titulo="Periodo"
                        className="
                          border-r-0
                        "
                      >
                        {nombrePeriodo}
                      </Campo>

                      <Campo
                        titulo="Estado"
                      >
                        {etiqueta(
                          medicion?.estado
                        )}
                      </Campo>
                    </div>

                    <div
                      className="
                        grid
                        grid-cols-2
                      "
                    >
                      <Campo
                        titulo="Nombre del indicador"
                        className="
                          border-t-0
                          border-r-0
                        "
                      >
                        {valorONoAplica(
                          indicador?.nombre
                        )}
                      </Campo>

                      <Campo
                        titulo="Descripción"
                        className="
                          border-t-0
                        "
                      >
                        {valorONoAplica(
                          indicador
                            ?.descripcion
                        )}
                      </Campo>
                    </div>

                    <div
                      className="
                        grid
                        grid-cols-4
                      "
                    >
                      <Campo
                        titulo="Periodicidad del reporte"
                        className="
                          border-t-0
                          border-r-0
                        "
                      >
                        {etiqueta(
                          indicador
                            ?.periodicidad
                        )}
                      </Campo>

                      <Campo
                        titulo="Fecha de medición"
                        className="
                          border-t-0
                          border-r-0
                        "
                      >
                        {formatearFecha(
                          medicion
                            ?.fecha_medicion
                        )}
                      </Campo>

                      <Campo
                        titulo="Periodo desde"
                        className="
                          border-t-0
                          border-r-0
                        "
                      >
                        {formatearFecha(
                          medicion
                            ?.periodo_desde
                        )}
                      </Campo>

                      <Campo
                        titulo="Periodo hasta"
                        className="
                          border-t-0
                        "
                      >
                        {formatearFecha(
                          medicion
                            ?.periodo_hasta
                        )}
                      </Campo>
                    </div>
                  </div>
                  </FilaDocumento>


                  {/* ============================================
                      2. METODOLOGIA
                  ============================================ */}

                  <FilaDocumento divisible>

                  <div
                    className="
                      bloque-no-dividir
                    "
                  >
                    <TituloSeccion>
                      2. Metodología de medición
                    </TituloSeccion>

                    <div
                      className="
                        grid
                        grid-cols-2
                      "
                    >
                      <Campo
                        titulo="Fórmula"
                        className="
                          border-r-0
                        "
                      >
                        {esTsv
                          ? 'TSV(n) = SV(tn) x 1.000.000 / Km(t)'
                          : esEjlc
                            ? 'EJLC = (EJD / SDT) × 100'
                            : esIdp
                              ? 'IDP = (VID / TV) × 100'
                              : valorONoAplica(
                                  indicador
                                    ?.formula
                                )}
                      </Campo>

                      <Campo
                        titulo="Fuente de información"
                      >
                        {valorONoAplica(
                          configuracion
                            ?.fuente_informacion ||
                          indicador
                            ?.fuente_datos
                        )}
                      </Campo>
                    </div>

                    {(esTsv || esRsvi || esGrv || esCmPesv || esCplanPesv || esEjlc || esIdp) ? (
                      <>
                        <Campo
                          titulo="Definición de variables"
                          className="
                            border-t-0
                          "
                        >
                          {esTsv ? (
                            <>
                              <div>
                                <strong>TSV(n):</strong>{' '}
                                Tasa de siniestros viales correspondiente al nivel de pérdida evaluado.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>SV(tn):</strong>{' '}
                                Número de siniestros viales del período correspondientes al nivel de pérdida evaluado.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>Km(t):</strong>{' '}
                                Número de kilómetros recorridos por los vehículos de la organización durante el período evaluado.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>1.000.000:</strong>{' '}
                                Factor utilizado para expresar la tasa por cada millón de kilómetros recorridos.
                              </div>
                            </>
                          ) : esRsvi ? (
                            <>
                              <div>
                                <strong>RSVI:</strong>{' '}
                                Resultado de la variación de los riesgos de seguridad vial identificados entre el inicio y el final de la vigencia evaluada.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>RI(ia):</strong>{' '}
                                Número de riesgos de seguridad vial identificados al inicio del período anual evaluado.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>RI(fa):</strong>{' '}
                                Número de riesgos de seguridad vial identificados al final del período anual evaluado.
                              </div>
                            </>
                          ) : esGrv ? (
                            <>
                              <div>
                                <strong>GRV:</strong>{' '}
                                Resultado de la gestión de los riesgos viales críticos entre el inicio y el final de la vigencia evaluada.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>RVA(ia):</strong>{' '}
                                Número de riesgos viales críticos al inicio del período anual evaluado.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>RVA(fa):</strong>{' '}
                                Número de riesgos viales críticos al final del período anual evaluado.
                              </div>
                            </>
                          ) : esCmPesv ? (
                            <>
                              <div>
                                <strong>CM_PESV:</strong>{' '}
                                Porcentaje de cumplimiento de las metas definidas en el PESV.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>MA(t):</strong>{' '}
                                Número de metas del PESV alcanzadas en el período evaluado.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>TM(t):</strong>{' '}
                                Número total de metas definidas en el PESV para la vigencia.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>100:</strong>{' '}
                                Factor de conversión para expresar el resultado en porcentaje.
                              </div>
                            </>
                          ) : esCplanPesv ? (
                            <>
                              <div>
                                <strong>CPLAN_PESV:</strong>{' '}
                                Porcentaje de cumplimiento de las actividades del Plan Anual de Trabajo del PESV.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>AEPlan(t):</strong>{' '}
                                Número de actividades ejecutadas del Plan Anual de Trabajo en el período evaluado.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>APPlan(t):</strong>{' '}
                                Número de actividades programadas del Plan Anual de Trabajo en el período evaluado.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>100:</strong>{' '}
                                Factor de conversión para expresar el resultado en porcentaje.
                              </div>
                            </>
                          ) : esEjlc ? (
                            <>
                              <div>
                                <strong>EJLC:</strong>{' '}
                                Porcentaje de exceso de jornadas laborales de los instructores de práctica.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>EJD:</strong>{' '}
                                Número de jornadas instructor/día evaluables en las que se dictaron más de 10 clases prácticas durante el día.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>SDT:</strong>{' '}
                                Número total de jornadas instructor/día que cuentan con información suficiente para ser evaluadas.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>100:</strong>{' '}
                                Factor de conversión para expresar el resultado en porcentaje.
                              </div>
                            </>
                          ) : esIdp ? (
                            <>
                              <div>
                                <strong>IDP:</strong>{' '}
                                Porcentaje de vehículos/día con operación confirmada que cuentan con inspección preoperacional registrada.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>VID:</strong>{' '}
                                Vehículos Inspeccionados Diariamente. Corresponde a los vehículos/día cuya operación fue confirmada y que cuentan con inspección preoperacional registrada.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>TV:</strong>{' '}
                                Total de Vehículos que operan diariamente. Corresponde a los vehículos/día cuya operación fue confirmada mediante los registros disponibles de actividad del vehículo.
                              </div>
                              <div className="mt-[0.8mm]">
                                <strong>100:</strong>{' '}
                                Factor de conversión para expresar el resultado en porcentaje.
                              </div>
                            </>
                          ) : null}
                        </Campo>

                        <Campo
                          titulo="Aplicación de la fórmula en el período"
                          className="
                            border-t-0
                          "
                        >
                          {(() => {
                            if (esTsv) {
                              const km =
                                numero(
                                  periodo?.kilometros_recorridos
                                )

                              if (km === null || km <= 0) {
                                return 'La aplicación numérica por nivel de pérdida se presenta en la sección de resultados del indicador.'
                              }

                              return `La tasa se calcula para cada nivel de pérdida como TSV(n) = [SV(tn) × 1.000.000] / ${formatearNumero(
                                km,
                                1
                              )} km. Los resultados por nivel se presentan en la sección correspondiente.`
                            }

                            if (esRsvi || esGrv) {
                              const inicial =
                                numero(
                                  medicion?.denominador
                                )

                              const final =
                                numero(
                                  medicion?.numerador
                                )

                              const resultado =
                                numero(
                                  medicion?.valor_resultado
                                )

                              if (
                                inicial === null ||
                                final === null ||
                                resultado === null
                              ) {
                                return '-'
                              }

                              const variableInicial =
                                esGrv
                                  ? 'RVA(ia)'
                                  : 'RI(ia)'

                              const variableFinal =
                                esGrv
                                  ? 'RVA(fa)'
                                  : 'RI(fa)'

                              return `${variableInicial} = ${formatearEntero(
                                inicial
                              )} · ${variableFinal} = ${formatearEntero(
                                final
                              )} · Resultado = ${
                                resultado > 0
                                  ? '+'
                                  : ''
                              }${formatearEntero(
                                resultado
                              )}`
                            }

                            if (esCmPesv) {
                              const ma =
                                numero(
                                  medicion?.numerador
                                )

                              const tm =
                                numero(
                                  medicion?.denominador
                                )

                              const resultado =
                                numero(
                                  medicion?.valor_resultado
                                )

                              if (
                                ma === null ||
                                tm === null ||
                                resultado === null
                              ) {
                                return '-'
                              }

                              return `CM_PESV = (${formatearEntero(
                                ma
                              )} / ${formatearEntero(
                                tm
                              )}) × 100 = ${formatearNumero(
                                resultado,
                                2
                              )} %`
                            }

                            if (esCplanPesv) {
                              const ae =
                                numero(
                                  medicion?.numerador
                                )

                              const ap =
                                numero(
                                  medicion?.denominador
                                )

                              const resultado =
                                numero(
                                  medicion?.valor_resultado
                                )

                              if (
                                ae === null ||
                                ap === null ||
                                resultado === null
                              ) {
                                return '-'
                              }

                              return `CPLAN_PESV = (${formatearEntero(
                                ae
                              )} / ${formatearEntero(
                                ap
                              )}) × 100 = ${formatearNumero(
                                resultado,
                                2
                              )} %`
                            }

                            if (esEjlc) {
                              const ejd =
                                numero(
                                  medicion?.numerador
                                )

                              const sdt =
                                numero(
                                  medicion?.denominador
                                )

                              const resultado =
                                numero(
                                  medicion?.valor_resultado
                                )

                              if (
                                ejd === null ||
                                sdt === null ||
                                resultado === null
                              ) {
                                return '-'
                              }

                              return `EJLC = (${formatearEntero(
                                ejd
                              )} / ${formatearEntero(
                                sdt
                              )}) × 100 = ${formatearNumero(
                                resultado,
                                2
                              )} %`
                            }

                            if (esIdp) {
                              const vid = numero(medicion?.numerador)
                              const tv = numero(medicion?.denominador)
                              const resultado = numero(medicion?.valor_resultado)

                              if (vid === null || tv === null || resultado === null) {
                                return '-'
                              }

                              return `IDP = (${formatearEntero(vid)} / ${formatearEntero(tv)}) × 100 = ${formatearNumero(resultado, 2)} %`
                            }

                            return '-'
                          })()}
                        </Campo>
                      </>
                    ) : null}

                    <Campo
                      titulo="Interpretación del indicador"
                      className="
                        border-t-0
                      "
                    >
                      {valorONoAplica(
                        configuracion
                          ?.interpretacion_indicador
                      )}
                    </Campo>

                    <Campo
                      titulo="Personas que deben conocer el resultado"
                      className="
                        border-t-0
                      "
                    >
                      {valorONoAplica(
                        configuracion
                          ?.personas_deben_conocer_resultado
                      )}
                    </Campo>
                  </div>
                  </FilaDocumento>


                  {/* ============================================
                      CONTENIDO TSV
                  ============================================ */}

                  {esTsv ? (
                    <>

                      {/* ========================================
                          3. INFORMACION DEL PERIODO
                      ======================================== */}

                  <FilaDocumento divisible>

                      <div
                        className="
                          bloque-no-dividir
                        "
                      >
                        <TituloSeccion>
                          3. Informacion utilizada en el periodo
                        </TituloSeccion>

                        <div
                          className="
                            grid
                            grid-cols-3
                          "
                        >
                          <Campo
                            titulo="Kilometros recorridos"
                            className="
                              border-r-0
                            "
                          >
                            {formatearKilometros(
                              periodo
                                ?.kilometros_recorridos
                            )}
                          </Campo>

                          <Campo
                            titulo="Registros de siniestros"
                            className="
                              border-r-0
                            "
                          >
                            {formatearEntero(
                              periodo
                                ?.total_registros_siniestros
                            )}
                          </Campo>

                          <Campo
                            titulo="Origen del calculo"
                          >
                            {etiqueta(
                              medicion
                                ?.origen_calculo
                            )}
                          </Campo>
                        </div>

                        <div
                          className="
                            grid
                            grid-cols-4
                          "
                        >
                          <Campo
                            titulo="Fatalidades"
                            className="
                              border-t-0
                              border-r-0
                            "
                          >
                            {formatearEntero(
                              periodo
                                ?.fatalidades
                            )}
                          </Campo>

                          <Campo
                            titulo="Heridos graves"
                            className="
                              border-t-0
                              border-r-0
                            "
                          >
                            {formatearEntero(
                              periodo
                                ?.heridos_graves
                            )}
                          </Campo>

                          <Campo
                            titulo="Heridos leves"
                            className="
                              border-t-0
                              border-r-0
                            "
                          >
                            {formatearEntero(
                              periodo
                                ?.heridos_leves
                            )}
                          </Campo>

                          <Campo
                            titulo="Choques simples"
                            className="
                              border-t-0
                            "
                          >
                            {formatearEntero(
                              periodo
                                ?.choques_simples
                            )}
                          </Campo>
                        </div>
                      </div>
                  </FilaDocumento>


                      {/* ========================================
                          4. RESULTADOS
                      ======================================== */}

                  <FilaDocumento divisible>

                      <div
                        className="
                          bloque-no-dividir
                        "
                      >
                        <TituloSeccion>
                          4. Resultado por nivel de perdida y cumplimiento
                        </TituloSeccion>

                        <TablaTsv
                          medicion={
                            medicion
                          }
                        />
                      </div>
                  </FilaDocumento>


                      {/* ========================================
                          5. ACUMULADO
                      ======================================== */}

                  <FilaDocumento divisible>

                      <div
                        className="
                          bloque-no-dividir
                        "
                      >
                        <TituloSeccion>
                          5. Acumulado de la vigencia al cierre del periodo
                        </TituloSeccion>

                        <TablaAcumuladoTsv
                          medicion={
                            medicion
                          }
                        />
                      </div>
                  </FilaDocumento>


                      {/* ========================================
                          6. COSTOS COMPLEMENTARIOS
                      ======================================== */}

                  <FilaDocumento divisible>

                      <div
                        className="
                          bloque-no-dividir
                        "
                      >
                        <TituloSeccion>
                          6. Informacion complementaria para reporte de siniestros viales
                        </TituloSeccion>

                        <TablaCostosTsv
                          costosTsv={
                            costosTsv
                          }
                        />
                      </div>
                  </FilaDocumento>

                    </>
                  ) : (
                    <FilaDocumento divisible>
                      <div
                        className="
                          bloque-no-dividir
                        "
                      >
                        <TituloSeccion>
                          3. Resultado de la medición
                        </TituloSeccion>

                        {esRsvi || esGrv ? (
                          <div
                            className="
                              grid
                              grid-cols-5
                            "
                          >
                            <Campo
                              titulo={
                                esGrv
                                  ? 'Riesgos CRÍTICOS al inicio · RVA(ia)'
                                  : 'Riesgos al inicio · RI(ia)'
                              }
                              className="
                                border-r-0
                              "
                            >
                              {formatearEntero(
                                medicion
                                  ?.denominador
                              )}
                            </Campo>

                            <Campo
                              titulo={
                                esGrv
                                  ? 'Riesgos CRÍTICOS al final · RVA(fa)'
                                  : 'Riesgos al final · RI(fa)'
                              }
                              className="
                                border-r-0
                              "
                            >
                              {formatearEntero(
                                medicion
                                  ?.numerador
                              )}
                            </Campo>

                            <Campo
                              titulo={
                                esGrv
                                  ? 'Resultado GRV'
                                  : 'Resultado RSVI'
                              }
                              className="
                                border-r-0
                              "
                            >
                              {(() => {
                                const resultado =
                                  numero(
                                    medicion
                                      ?.valor_resultado
                                  )

                                if (
                                  resultado === null
                                ) {
                                  return '-'
                                }

                                if (
                                  resultado > 0
                                ) {
                                  return `+${formatearEntero(
                                    resultado
                                  )}`
                                }

                                return formatearEntero(
                                  resultado
                                )
                              })()}
                            </Campo>

                            <Campo
                              titulo="Meta"
                              className="
                                border-r-0
                              "
                            >
                              {(() => {
                                const operador =
                                  texto(
                                    medicion
                                      ?.operador_meta ||
                                    configuracion
                                      ?.operador_meta
                                  )

                                const valorMeta =
                                  numero(
                                    medicion
                                      ?.valor_meta
                                  ) ??
                                  numero(
                                    configuracion
                                      ?.valor_meta
                                  )

                                if (
                                  valorMeta === null
                                ) {
                                  return '-'
                                }

                                return `${operador || ''} ${formatearEntero(
                                  valorMeta
                                )}`.trim()
                              })()}
                            </Campo>

                            <Campo
                              titulo="Cumplimiento"
                            >
                              {medicion
                                ?.cumple_meta === true
                                ? 'CUMPLE'
                                : medicion
                                    ?.cumple_meta === false
                                  ? 'NO CUMPLE'
                                  : 'SIN EVALUAR'}
                            </Campo>
                          </div>
                        ) : esCplanPesv ? (
                          <div
                            className="
                              grid
                              grid-cols-3
                            "
                          >
                            <Campo
                              titulo="Actividades ejecutadas · AEPlan(t)"
                              className="
                                border-r-0
                              "
                            >
                              {formatearEntero(
                                medicion
                                  ?.numerador
                              )}
                            </Campo>

                            <Campo
                              titulo="Actividades programadas · APPlan(t)"
                              className="
                                border-r-0
                              "
                            >
                              {formatearEntero(
                                medicion
                                  ?.denominador
                              )}
                            </Campo>

                            <Campo
                              titulo="Resultado CPLAN_PESV"
                            >
                              {(() => {
                                const resultado =
                                  numero(
                                    medicion
                                      ?.valor_resultado
                                  )

                                return resultado === null
                                  ? '-'
                                  : `${formatearNumero(
                                      resultado,
                                      2
                                    )} %`
                              })()}
                            </Campo>
                          </div>
                        ) : esCmPesv ? (
                          <div
                            className="
                              grid
                              grid-cols-5
                            "
                          >
                            <Campo
                              titulo="Metas alcanzadas · MA(t)"
                              className="
                                border-r-0
                              "
                            >
                              {formatearEntero(
                                medicion
                                  ?.numerador
                              )}
                            </Campo>

                            <Campo
                              titulo="Metas definidas · TM(t)"
                              className="
                                border-r-0
                              "
                            >
                              {formatearEntero(
                                medicion
                                  ?.denominador
                              )}
                            </Campo>

                            <Campo
                              titulo="Resultado CM_PESV"
                              className="
                                border-r-0
                              "
                            >
                              {(() => {
                                const resultado =
                                  numero(
                                    medicion
                                      ?.valor_resultado
                                  )

                                return resultado === null
                                  ? '-'
                                  : `${formatearNumero(
                                      resultado,
                                      2
                                    )} %`
                              })()}
                            </Campo>

                            <Campo
                              titulo="Meta"
                              className="
                                border-r-0
                              "
                            >
                              {(() => {
                                const operador =
                                  texto(
                                    medicion
                                      ?.operador_meta ||
                                    configuracion
                                      ?.operador_meta
                                  )

                                const valorMeta =
                                  numero(
                                    medicion
                                      ?.valor_meta
                                  ) ??
                                  numero(
                                    configuracion
                                      ?.valor_meta
                                  )

                                const unidadMeta =
                                  normalizar(
                                    medicion
                                      ?.unidad_meta ||
                                    configuracion
                                      ?.unidad_meta
                                  )

                                if (
                                  valorMeta === null
                                ) {
                                  return '-'
                                }

                                const sufijo =
                                  unidadMeta ===
                                  'PORCENTAJE'
                                    ? ' %'
                                    : ''

                                return `${operador || ''} ${formatearNumero(
                                  valorMeta,
                                  0
                                )}${sufijo}`.trim()
                              })()}
                            </Campo>

                            <Campo
                              titulo="Cumplimiento"
                            >
                              {medicion
                                ?.cumple_meta === true
                                ? 'CUMPLE'
                                : medicion
                                    ?.cumple_meta === false
                                  ? 'NO CUMPLE'
                                  : 'SIN EVALUAR'}
                            </Campo>
                          </div>
                        ) : esEjlc ? (
                          <div>
                            <div className="grid grid-cols-5">
                              <Campo titulo="Jornadas con exceso · EJD" className="border-r-0">
                                {formatearEntero(medicion?.numerador)}
                              </Campo>

                              <Campo titulo="Jornadas evaluables · SDT" className="border-r-0">
                                {formatearEntero(medicion?.denominador)}
                              </Campo>

                              <Campo titulo="Resultado EJLC" className="border-r-0">
                                {(() => {
                                  const resultado = numero(medicion?.valor_resultado)
                                  return resultado === null
                                    ? '-'
                                    : `${formatearNumero(resultado, 2)} %`
                                })()}
                              </Campo>

                              <Campo titulo="Meta" className="border-r-0">
                                {(() => {
                                  const operador = texto(
                                    medicion?.operador_meta ||
                                    configuracion?.operador_meta
                                  )
                                  const valorMeta =
                                    numero(medicion?.valor_meta) ??
                                    numero(configuracion?.valor_meta)

                                  if (valorMeta === null) return '-'

                                  return `${operador || ''} ${formatearNumero(
                                    valorMeta,
                                    2
                                  )} %`.trim()
                                })()}
                              </Campo>

                              <Campo titulo="Cumplimiento">
                                {medicion?.cumple_meta === true
                                  ? 'CUMPLE'
                                  : medicion?.cumple_meta === false
                                    ? 'NO CUMPLE'
                                    : 'SIN EVALUAR'}
                              </Campo>
                            </div>

                            <div className="grid grid-cols-5">
                              <Campo titulo="EJD acumulado" className="border-t-0 border-r-0">
                                {formatearEntero(
                                  datosCalculo?.acumulado_anual?.EJD
                                )}
                              </Campo>

                              <Campo titulo="SDT acumulado" className="border-t-0 border-r-0">
                                {formatearEntero(
                                  datosCalculo?.acumulado_anual?.SDT
                                )}
                              </Campo>

                              <Campo titulo="EJLC acumulado" className="border-t-0 border-r-0">
                                {(() => {
                                  const resultado = numero(
                                    datosCalculo?.acumulado_anual?.EJLC
                                  )
                                  return resultado === null
                                    ? '-'
                                    : `${formatearNumero(resultado, 2)} %`
                                })()}
                              </Campo>

                              <Campo titulo="Meta" className="border-t-0 border-r-0">
                                {(() => {
                                  const operador = texto(
                                    medicion?.operador_meta ||
                                    configuracion?.operador_meta
                                  )
                                  const valorMeta =
                                    numero(medicion?.valor_meta) ??
                                    numero(configuracion?.valor_meta)

                                  if (valorMeta === null) return '-'

                                  return `${operador || ''} ${formatearNumero(
                                    valorMeta,
                                    2
                                  )} %`.trim()
                                })()}
                              </Campo>

                              <Campo titulo="Cumplimiento acumulado" className="border-t-0">
                                {(() => {
                                  const resultado = numero(
                                    datosCalculo?.acumulado_anual?.EJLC
                                  )
                                  const meta =
                                    numero(medicion?.valor_meta) ??
                                    numero(configuracion?.valor_meta)
                                  const operador = texto(
                                    medicion?.operador_meta ||
                                    configuracion?.operador_meta
                                  )

                                  if (resultado === null || meta === null) {
                                    return 'SIN EVALUAR'
                                  }

                                  let cumple = null

                                  if (operador === '<=') cumple = resultado <= meta
                                  else if (operador === '<') cumple = resultado < meta
                                  else if (operador === '>=') cumple = resultado >= meta
                                  else if (operador === '>') cumple = resultado > meta
                                  else if (operador === '=') cumple = resultado === meta

                                  return cumple === true
                                    ? 'CUMPLE'
                                    : cumple === false
                                      ? 'NO CUMPLE'
                                      : 'SIN EVALUAR'
                                })()}
                              </Campo>
                            </div>

                            {/* ========================================
                                REFERENCIA HISTÓRICA EJLC
                            ======================================== */}

                            <div
                              className="
                                grid
                                grid-cols-2
                              "
                            >
                              <Campo
                                titulo="Línea base 2025"
                                className="
                                  border-t-0
                                  border-r-0
                                "
                              >
                                {(() => {
                                  const lineaBase =
                                    numero(
                                      configuracion?.linea_base
                                    )

                                  return lineaBase === null
                                    ? '-'
                                    : `${formatearNumero(
                                        lineaBase,
                                        2
                                      )} %`
                                })()}
                              </Campo>

                              <Campo
                                titulo="Variación mensual frente a línea base"
                                className="
                                  border-t-0
                                "
                              >
                                {(() => {
                                  const resultado =
                                    numero(
                                      medicion?.valor_resultado
                                    )

                                  const lineaBase =
                                    numero(
                                      configuracion?.linea_base
                                    )

                                  if (
                                    resultado === null ||
                                    lineaBase === null
                                  ) {
                                    return '-'
                                  }

                                  const diferencia =
                                    resultado -
                                    lineaBase

                                  return `${
                                    diferencia > 0
                                      ? '+'
                                      : ''
                                  }${formatearNumero(
                                    diferencia,
                                    2
                                  )} p.p.`
                                })()}
                              </Campo>
                            </div>
                          </div>
                        ) : esIdp ? (
                          <div>
                            <div className="grid grid-cols-5">
                              <Campo titulo="Vehículos/día inspeccionados · VID" className="border-r-0">
                                {formatearEntero(medicion?.numerador)}
                              </Campo>
                              <Campo titulo="Vehículos/día operados · TV" className="border-r-0">
                                {formatearEntero(medicion?.denominador)}
                              </Campo>
                              <Campo titulo="Resultado IDP" className="border-r-0">
                                {numero(medicion?.valor_resultado) === null ? '-' : `${formatearNumero(medicion?.valor_resultado, 2)} %`}
                              </Campo>
                              <Campo titulo="Meta" className="border-r-0">
                                {(() => {
                                  const operador = texto(medicion?.operador_meta || configuracion?.operador_meta)
                                  const valorMeta = numero(medicion?.valor_meta) ?? numero(configuracion?.valor_meta)
                                  return valorMeta === null ? '-' : `${operador || ''} ${formatearNumero(valorMeta, 2)} %`.trim()
                                })()}
                              </Campo>
                              <Campo titulo="Cumplimiento">
                                {medicion?.cumple_meta === true ? 'CUMPLE' : medicion?.cumple_meta === false ? 'NO CUMPLE' : 'SIN EVALUAR'}
                              </Campo>
                            </div>

                            <div className="grid grid-cols-5">
                              <Campo titulo="VID acumulado · Vehículos/día inspeccionados" className="border-t-0 border-r-0">
                                {formatearEntero(datosCalculo?.acumulado_anual?.VID)}
                              </Campo>
                              <Campo titulo="TV acumulado · Vehículos/día operados" className="border-t-0 border-r-0">
                                {formatearEntero(datosCalculo?.acumulado_anual?.TV)}
                              </Campo>
                              <Campo titulo="IDP acumulado" className="border-t-0 border-r-0">
                                {numero(datosCalculo?.acumulado_anual?.IDP) === null ? '-' : `${formatearNumero(datosCalculo?.acumulado_anual?.IDP, 2)} %`}
                              </Campo>
                              <Campo titulo="Línea base 2025" className="border-t-0 border-r-0">
                                {numero(configuracion?.linea_base) === null ? '-' : `${formatearNumero(configuracion?.linea_base, 2)} %`}
                              </Campo>
                              <Campo titulo="Variación frente a línea base" className="border-t-0">
                                {(() => {
                                  const resultado = numero(medicion?.valor_resultado)
                                  const lineaBase = numero(configuracion?.linea_base)
                                  if (resultado === null || lineaBase === null) return '-'
                                  const diferencia = resultado - lineaBase
                                  return `${diferencia > 0 ? '+' : ''}${formatearNumero(diferencia, 2)} p.p.`
                                })()}
                              </Campo>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="
                              grid
                              grid-cols-3
                            "
                          >
                            <Campo
                              titulo="Numerador"
                              className="
                                border-r-0
                              "
                            >
                              {formatearNumero(
                                medicion
                                  ?.numerador,
                                2
                              )}
                            </Campo>

                            <Campo
                              titulo="Denominador"
                              className="
                                border-r-0
                              "
                            >
                              {formatearNumero(
                                medicion
                                  ?.denominador,
                                2
                              )}
                            </Campo>

                            <Campo
                              titulo="Resultado"
                            >
                              {(() => {
                                const resultado =
                                  numero(
                                    medicion
                                      ?.valor_resultado
                                  )

                                if (
                                  resultado === null
                                ) {
                                  return '-'
                                }

                                const unidadResultado =
                                  normalizar(
                                    indicador
                                      ?.unidad ||
                                    configuracion
                                      ?.unidad ||
                                    medicion
                                      ?.unidad_meta ||
                                    configuracion
                                      ?.unidad_meta
                                  )

                                const sufijo =
                                  unidadResultado ===
                                  'PORCENTAJE'
                                    ? ' %'
                                    : ''

                                return `${formatearNumero(
                                  resultado,
                                  2
                                )}${sufijo}`
                              })()}
                            </Campo>
                          </div>
                        )}
                      </div>
                    </FilaDocumento>
                  )}


                  {/* ============================================
                      ANALISIS
                  ============================================ */}

                  <FilaDocumento divisible>

                  <div
                    className="
                      bloque-no-dividir
                    "
                  >
                    <TituloSeccion>
                      {esTsv
                        ? '7. Análisis del resultado'
                        : '4. Análisis del resultado'}
                    </TituloSeccion>

                    <Campo
                      titulo="Análisis"
                    >
                      {valorONoAplica(
                        medicion
                          ?.analisis_resultado
                      )}
                    </Campo>
                  </div>
                  </FilaDocumento>


                  {/* ============================================
                      OBSERVACIONES
                  ============================================ */}

                  <FilaDocumento divisible>

                  <div
                    className="
                      bloque-no-dividir
                    "
                  >
                    <TituloSeccion>
                      {esTsv
                        ? '8. Observaciones'
                        : '5. Observaciones'}
                    </TituloSeccion>

                    <Campo
                      titulo="Observaciones"
                    >
                      {valorONoAplica(
                        medicion
                          ?.observaciones
                      )}
                    </Campo>
                  </div>
                  </FilaDocumento>


                  {/* ============================================
                      TRAZABILIDAD
                  ============================================ */}

                  <FilaDocumento divisible>

                  <div
                    className="
                      bloque-no-dividir
                    "
                  >
                    <TituloSeccion>
                      {esTsv
                        ? '9. Trazabilidad'
                        : '6. Trazabilidad'}
                    </TituloSeccion>

                    <div
                      className="
                        grid
                        grid-cols-3
                      "
                    >
                      <Campo
                        titulo="Responsable"
                        className="
                          border-r-0
                        "
                      >
                        {valorONoAplica(
                          medicion
                            ?.responsable_nombre
                        )}
                      </Campo>

                      <Campo
                        titulo="Origen"
                        className="
                          border-r-0
                        "
                      >
                        {etiqueta(
                          medicion
                            ?.origen_calculo
                        )}
                      </Campo>

                      <Campo
                        titulo="Estado"
                      >
                        {etiqueta(
                          medicion
                            ?.estado
                        )}
                      </Campo>
                    </div>

                    <div
                      className="
                        grid
                        grid-cols-2
                      "
                    >
                      <Campo
                        titulo="Fecha de registro"
                        className="
                          border-t-0
                          border-r-0
                        "
                      >
                        {formatearFechaHora(
                          medicion
                            ?.created_at
                        )}
                      </Campo>

                      <Campo
                        titulo="Última actualización"
                        className="
                          border-t-0
                        "
                      >
                        {formatearFechaHora(
                          medicion
                            ?.updated_at
                        )}
                      </Campo>
                    </div>
                  </div>
                  </FilaDocumento>



                  {/* ============================================
                      CM_PESV - DETALLE DE METAS CONSIDERADAS
                  ============================================ */}

                  {esCmPesv ? (
                    <FilaDocumento divisible>
                      <div>
                        <TituloSeccion>
                          7. Detalle de metas consideradas
                        </TituloSeccion>

                        <TablaDetalleMetasCmPesv
                          medicion={
                            medicion
                          }
                        />
                      </div>
                    </FilaDocumento>
                  ) : null}


                {/* ============================================
      FIRMAS
  ============================================ */}

  <FilaDocumento>
    <div
      className="
        bloque-no-dividir
        firmas-indicador
        mt-[4mm]
        grid
        grid-cols-2
        gap-[15mm]
        px-[5mm]
      "
    >
      {/* ========================================
          RESPONSABLE DE LA MEDICIÓN
      ======================================== */}

      <div>
        {/* Espacio disponible para firma manuscrita */}
        <div
          className="
            h-[15mm]
          "
        />

        <div
          className="
            border-t
            border-black
            pt-[2mm]
            text-center
            text-[9px]
          "
        >
          <div
            className="
              font-black
            "
          >
            RESPONSABLE DE LA MEDICIÓN
          </div>

          <div
            className="
              mt-[1mm]
            "
          >
            {valorONoAplica(
              medicion
                ?.responsable_nombre
            )}
          </div>
        </div>
      </div>


      {/* ========================================
          RESPONSABLE PESV
      ======================================== */}

      <div>
        {/* Espacio disponible para firma manuscrita */}
        <div
          className="
            h-[15mm]
          "
        />

        <div
          className="
            border-t
            border-black
            pt-[2mm]
            text-center
            text-[9px]
          "
        >
          <div
            className="
              font-black
            "
          >
            RESPONSABLE PESV
          </div>

          <div
            className="
              mt-[1mm]
              text-gray-500
            "
          >
            Firma / aprobación
          </div>
        </div>
      </div>
    </div>
  </FilaDocumento>

                  {/* ============================================
                      PIE DEL DOCUMENTO
                  ============================================ */}

                  <FilaDocumento>

                  <div
                    className="
                      bloque-no-dividir
                      mt-[8mm]
                      border-t
                      border-gray-300
                      pt-[2mm]
                      text-center
                      text-[7px]
                      text-gray-500
                    "
                  >
                    Documento generado desde el módulo PESV

                    {' - '}

                    {empresa
                      ?.nombre ||
                      empresa
                        ?.razon_social ||
                      'CEA'}
                  </div>
                  </FilaDocumento>

            </tbody>
          </table>
        </main>


        
      </div>
    )
  }