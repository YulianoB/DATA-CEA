// app/admin/pesv/riesgos/components/VistaMatrizRiesgos.js

import FormularioRiesgo
  from './FormularioRiesgo'

import TablaRiesgos
  from './TablaRiesgos'


export default function VistaMatrizRiesgos({
  anio,
  riesgos,
  personal,
  programas,
  metodologia,
  formulario,
  editandoId,
  guardando,
  mostrarFormulario,
  mostrarNuevoFormulario,
  vistaPrevia,
  filtroTexto,
  filtroNivel,
  cambiarFiltroTexto,
  cambiarFiltroNivel,
  cambiarCampo,
  cambiarResponsable,
  cambiarPrograma,
  guardarRiesgo,
  limpiarFormulario,
  verRiesgo,
  editarRiesgo,
  eliminarRiesgo,
}) {
  return (
    <div
      className="
        space-y-4
      "
    >

      {/* ==================================================
          ACCIÓN NUEVO RIESGO
      ================================================== */}

      {!mostrarFormulario && (
        <section
          className="
            border
            border-blue-300
            rounded-xl
            overflow-hidden
          "
        >
          <div
            className="
              bg-blue-900
              text-white
              px-4
              py-3
              flex
              flex-col
              md:flex-row
              md:items-center
              md:justify-between
              gap-3
            "
          >
            <div>
              <div
                className="
                  text-[11px]
                  font-black
                  uppercase
                "
              >
                Identificar y valorar nuevo riesgo
              </div>

              <div
                className="
                  text-[9px]
                  text-blue-200
                  mt-0.5
                "
              >
                Registre un nuevo riesgo vial para la vigencia {anio}.
              </div>
            </div>


            <button
              type="button"
              onClick={
                mostrarNuevoFormulario
              }
              className="
                bg-emerald-600
                hover:bg-emerald-700
                text-white
                rounded
                px-4
                py-2
                text-[10px]
                font-bold
                flex
                items-center
                justify-center
                gap-2
              "
            >
              <i
                className="
                  fas
                  fa-plus
                "
              ></i>

              Agregar riesgo
            </button>
          </div>
        </section>
      )}


      {/* ==================================================
          FORMULARIO
      ================================================== */}

      {mostrarFormulario && (
        <FormularioRiesgo
          anio={
            anio
          }
          personal={
            personal
          }
          programas={
            programas
          }
          metodologia={
            metodologia
          }
          formulario={
            formulario
          }
          editandoId={
            editandoId
          }
          guardando={
            guardando
          }
          vistaPrevia={
            vistaPrevia
          }
          cambiarCampo={
            cambiarCampo
          }
          cambiarResponsable={
            cambiarResponsable
          }
          cambiarPrograma={
            cambiarPrograma
          }
          guardar={
            guardarRiesgo
          }
          limpiar={
            limpiarFormulario
          }
        />
      )}


      {/* ==================================================
          LISTADO
      ================================================== */}

      <TablaRiesgos
        anio={
          anio
        }
        riesgos={
          riesgos
        }
        filtroTexto={
          filtroTexto
        }
        filtroNivel={
          filtroNivel
        }
        cambiarFiltroTexto={
          cambiarFiltroTexto
        }
        cambiarFiltroNivel={
          cambiarFiltroNivel
        }
        ver={
        verRiesgo
        }
        editar={
          editarRiesgo
        }
        eliminar={
          eliminarRiesgo
        }
      />
    </div>
  )
}