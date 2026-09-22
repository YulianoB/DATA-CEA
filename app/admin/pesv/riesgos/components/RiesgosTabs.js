// app/admin/pesv/riesgos/components/RiesgosTabs.js

const PESTANAS = [
  {
    id:
      'MATRIZ',

    nombre:
      'Matriz de Riesgos',

    icono:
      'fa-table-list',
  },
  {
    id:
      'MAPA',

    nombre:
      'Mapa de Calor',

    icono:
      'fa-border-all',
  },
  {
    id:
      'CATALOGO',

    nombre:
      'Catálogo',

    icono:
      'fa-book-open',
  },
  {
    id:
      'METODOLOGIA',

    nombre:
      'Léeme / Metodología',

    icono:
      'fa-circle-info',
  },
  {
    id:
      'PROGRAMAS',

    nombre:
      'Programas PESV',

    icono:
      'fa-diagram-project',
  },
  {
    id:
      'SEGUIMIENTOS',

    nombre:
      'Seguimientos',

    icono:
      'fa-clock-rotate-left',
  },
]


export default function RiesgosTabs({
  pestana,
  cambiar,
}) {
  return (
    <div
      className="
        bg-white
        border-b
        border-gray-200
        px-3
        pt-3
        overflow-x-auto
      "
    >
      <div
        className="
          flex
          min-w-max
          gap-1
        "
      >
        {PESTANAS.map(
          item => {
            const activa =
              pestana ===
              item.id

            return (
              <button
                key={
                  item.id
                }
                type="button"
                onClick={() =>
                  cambiar(
                    item.id
                  )
                }
                className={`
                  px-3
                  py-2
                  rounded-t-lg
                  border
                  border-b-0
                  text-[10px]
                  font-bold
                  transition
                  ${
                    activa
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }
                `}
              >
                <i
                  className={`
                    fas
                    ${item.icono}
                    mr-1.5
                  `}
                ></i>

                {item.nombre}
              </button>
            )
          }
        )}
      </div>
    </div>
  )
}