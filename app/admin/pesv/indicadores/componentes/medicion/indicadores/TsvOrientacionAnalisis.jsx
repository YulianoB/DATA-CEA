'use client'

// ============================================================
// app/admin/pesv/indicadores/componentes/medicion/indicadores/TsvOrientacionAnalisis.jsx
// PESV - INDICADORES
// ORIENTACIÓN PARA EL ANÁLISIS TSV
//
// Componente visual.
// No consulta APIs ni modifica estados.
// ============================================================

export default function TsvOrientacionAnalisis() {
  return (
<div
                className="
                  mb-3
                  rounded-lg
                  border
                  border-blue-200
                  bg-blue-50
                  p-3
                "
              >
                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    text-blue-700
                  "
                >
                  Orientación para el análisis TSV
                </p>

                <p
                  className="
                    mt-1
                    text-[10px]
                    leading-relaxed
                    text-blue-800
                  "
                >
                  Describa si se presentaron víctimas, el
                  comportamiento de los choques simples, la
                  variación respecto al periodo anterior y las
                  medidas de prevención o mejora adoptadas.
                </p>
              </div>
  )
}
