// app/admin/pesv/riesgos/components/ListaMedidasRiesgo.js

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function etiqueta(
  valor
) {
  return (
    texto(
      valor
    )
      .replaceAll(
        '_',
        ' '
      ) ||
    '-'
  )
}


function etiquetaTipo(
  tipo
) {
  const etiquetas = {
    ELIMINACION:
      'Eliminación',

    SUSTITUCION:
      'Sustitución',

    INGENIERIA:
      'Ingeniería / técnico',

    ADMINISTRATIVO:
      'Administrativo',

    FORMACION_COMPETENCIAS:
      'Formación / competencias',

    EPP:
      'EPP',

    OTRO:
      'Otro',
  }

  return (
    etiquetas[
      texto(
        tipo
      )
    ] ||
    etiqueta(
      tipo
    )
  )
}


function estadoClase(
  estado
) {
  const valor =
    texto(
      estado
    ).toUpperCase()

  if (
    [
      'ACTIVO',
      'IMPLEMENTADA',
    ].includes(
      valor
    )
  ) {
    return 'bg-green-50 border-green-200 text-green-800'
  }

  if (
    valor ===
    'EN_PROCESO'
  ) {
    return 'bg-blue-50 border-blue-200 text-blue-800'
  }

  if (
    valor ===
    'PENDIENTE'
  ) {
    return 'bg-amber-50 border-amber-200 text-amber-800'
  }

  return 'bg-gray-50 border-gray-200 text-gray-700'
}


function TarjetaMedida({
  medida,
  editar,
  eliminar,
  guardando,
}) {
  return (
    <div
      className="
        border
        border-gray-200
        rounded-lg
        bg-white
        p-3
      "
    >
      <div
        className="
          flex
          flex-col
          md:flex-row
          md:items-start
          md:justify-between
          gap-2
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
              gap-1.5
              mb-2
            "
          >
            <span
              className="
                bg-slate-100
                border
                border-slate-200
                text-slate-700
                rounded
                px-2
                py-0.5
                text-[8px]
                font-black
                uppercase
              "
            >
              {etiquetaTipo(
                medida.tipo_control
              )}
            </span>

            <span
              className={`
                border
                rounded
                px-2
                py-0.5
                text-[8px]
                font-black
                uppercase
                ${estadoClase(
                  medida.estado
                )}
              `}
            >
              {etiqueta(
                medida.estado
              )}
            </span>
          </div>


          <div
            className="
              text-[10px]
              text-gray-800
              whitespace-pre-wrap
              leading-relaxed
            "
          >
            {medida.descripcion}
          </div>


          <div
            className="
              mt-2
              grid
              grid-cols-1
              md:grid-cols-3
              gap-1.5
              text-[9px]
            "
          >
            <div>
              <strong>
                Responsable:
              </strong>{' '}

              {texto(
                medida.responsable_nombre
              ) ||
                '-'}
            </div>

            <div>
              <strong>
                Fecha prevista:
              </strong>{' '}

              {texto(
                medida.fecha_prevista
              ) ||
                '-'}
            </div>

            <div>
              <strong>
                Implementación:
              </strong>{' '}

              {texto(
                medida.fecha_implementacion
              ) ||
                '-'}
            </div>
          </div>


          {texto(
            medida.evidencia_esperada
          ) && (
            <div
              className="
                mt-2
                bg-gray-50
                border
                border-gray-200
                rounded
                p-2
                text-[9px]
                text-gray-700
              "
            >
              <strong>
                Evidencia esperada:
              </strong>{' '}

              {medida.evidencia_esperada}
            </div>
          )}


          {texto(
            medida.verificacion_eficacia
          ) && (
            <div
              className="
                mt-2
                bg-green-50
                border
                border-green-200
                rounded
                p-2
                text-[9px]
                text-green-800
              "
            >
              <strong>
                Verificación de eficacia:
              </strong>{' '}

              {medida.verificacion_eficacia}

              {medida.fecha_verificacion && (
                <>
                  {' · '}

                  <strong>
                    Fecha:
                  </strong>{' '}

                  {medida.fecha_verificacion}
                </>
              )}
            </div>
          )}
        </div>


        <div
          className="
            flex
            items-center
            gap-1
            shrink-0
          "
        >
          <button
            type="button"
            disabled={
              guardando
            }
            onClick={() =>
              editar(
                medida
              )
            }
            className="
              w-8
              h-8
              bg-blue-50
              hover:bg-blue-100
              border
              border-blue-200
              text-blue-700
              rounded
              disabled:opacity-50
            "
            title="Editar medida"
          >
            <i
              className="
                fas
                fa-edit
              "
            ></i>
          </button>

          <button
            type="button"
            disabled={
              guardando
            }
            onClick={() =>
              eliminar(
                medida
              )
            }
            className="
              w-8
              h-8
              bg-red-50
              hover:bg-red-100
              border
              border-red-200
              text-red-700
              rounded
              disabled:opacity-50
            "
            title="Eliminar medida"
          >
            <i
              className="
                fas
                fa-trash
              "
            ></i>
          </button>
        </div>
      </div>
    </div>
  )
}


export default function ListaMedidasRiesgo({
  medidas,
  editar,
  eliminar,
  guardando,
}) {
  const lista =
    Array.isArray(
      medidas
    )
      ? medidas
      : []

  const existentes =
    lista.filter(
      medida =>
        texto(
          medida.origen
        ).toUpperCase() ===
        'EXISTENTE'
    )

  const propuestas =
    lista.filter(
      medida =>
        texto(
          medida.origen
        ).toUpperCase() ===
        'PROPUESTA'
    )


  if (
    lista.length ===
    0
  ) {
    return (
      <div
        className="
          border
          border-dashed
          border-gray-300
          rounded-lg
          bg-gray-50
          py-8
          text-center
        "
      >
        <i
          className="
            fas
            fa-shield-halved
            text-2xl
            text-gray-400
          "
        ></i>

        <div
          className="
            mt-2
            text-[10px]
            font-bold
            text-gray-600
          "
        >
          No se han registrado controles o medidas detalladas.
        </div>

        <div
          className="
            mt-1
            text-[9px]
            text-gray-500
          "
        >
          El resumen registrado en la valoración inicial se conserva.
        </div>
      </div>
    )
  }


  return (
    <div
      className="
        space-y-4
      "
    >
      <div>
        <div
          className="
            flex
            items-center
            gap-2
            mb-2
          "
        >
          <div
            className="
              text-[10px]
              font-black
              uppercase
              text-green-800
            "
          >
            Controles existentes
          </div>

          <span
            className="
              bg-green-100
              text-green-800
              rounded-full
              px-2
              py-0.5
              text-[8px]
              font-black
            "
          >
            {existentes.length}
          </span>
        </div>

        {existentes.length ? (
          <div
            className="
              space-y-2
            "
          >
            {existentes.map(
              medida => (
                <TarjetaMedida
                  key={
                    medida.id
                  }
                  medida={
                    medida
                  }
                  editar={
                    editar
                  }
                  eliminar={
                    eliminar
                  }
                  guardando={
                    guardando
                  }
                />
              )
            )}
          </div>
        ) : (
          <div
            className="
              text-[9px]
              text-gray-500
            "
          >
            No existen controles detallados registrados.
          </div>
        )}
      </div>


      <div>
        <div
          className="
            flex
            items-center
            gap-2
            mb-2
          "
        >
          <div
            className="
              text-[10px]
              font-black
              uppercase
              text-blue-800
            "
          >
            Medidas de intervención
          </div>

          <span
            className="
              bg-blue-100
              text-blue-800
              rounded-full
              px-2
              py-0.5
              text-[8px]
              font-black
            "
          >
            {propuestas.length}
          </span>
        </div>

        {propuestas.length ? (
          <div
            className="
              space-y-2
            "
          >
            {propuestas.map(
              medida => (
                <TarjetaMedida
                  key={
                    medida.id
                  }
                  medida={
                    medida
                  }
                  editar={
                    editar
                  }
                  eliminar={
                    eliminar
                  }
                  guardando={
                    guardando
                  }
                />
              )
            )}
          </div>
        ) : (
          <div
            className="
              text-[9px]
              text-gray-500
            "
          >
            No existen medidas propuestas detalladas.
          </div>
        )}
      </div>
    </div>
  )
}