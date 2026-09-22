'use client'

// ============================================================
// app/admin/pesv/indicadores/componentes/medicion/indicadores/TsvInterpretacion.jsx
// PESV - INDICADORES
// PANEL DE APOYO E INTERPRETACIÓN TSV
//
// Responsabilidad:
// - Mostrar aclaraciones específicas del indicador TSV.
// - No consulta APIs.
// - No modifica estados.
// ============================================================

export default function TsvInterpretacion() {
  return (
    <>
<div
                      className="
                        mt-4
                        rounded-lg
                        border
                        border-violet-200
                        bg-violet-50
                        p-3
                      "
                    >
                      <p
                        className="
                          text-[9px]
                          font-black
                          uppercase
                          text-violet-700
                        "
                      >
                        Importante
                      </p>

                      <p
                        className="
                          mt-2
                          text-[10px]
                          leading-relaxed
                          text-slate-600
                        "
                      >
                        Una tasa de 68,1 no significa que hayan
                        ocurrido 68 siniestros. Significa que la
                        frecuencia observada en los kilómetros
                        realmente recorridos equivale a 68,1
                        eventos por cada millón de kilómetros.
                      </p>
                    </div>

                    <div
                      className="
                        mt-4
                        rounded-lg
                        border
                        border-emerald-200
                        bg-emerald-50
                        p-3
                      "
                    >
                      <p
                        className="
                          text-[9px]
                          font-black
                          uppercase
                          text-emerald-700
                        "
                      >
                        ¿Cómo debe analizarse?
                      </p>

                      <p
                        className="
                          mt-2
                          text-[10px]
                          leading-relaxed
                          text-emerald-800
                        "
                      >
                        Revise primero las víctimas, luego los
                        choques simples, compare la tasa con el
                        mismo periodo anterior y finalmente con
                        el acumulado y la línea base histórica.
                      </p>
                    </div>
    </>
  )
}
