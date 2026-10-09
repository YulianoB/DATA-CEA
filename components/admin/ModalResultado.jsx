'use client'

export default function ModalResultado({
  abierto = false,
  tipo = 'exito',
  titulo = '',
  mensaje = '',
  textoBoton = 'ACEPTAR',
  onCerrar,
  onConfirmar,
  textoCancelar = 'CANCELAR',
}) {
  if (!abierto) return null

  const esConfirmacion = tipo === 'confirmacion'
  const esExito = tipo === 'exito'
  const tituloFinal =
    titulo ||
    (esConfirmacion
      ? 'Confirmar operación'
      : esExito
        ? 'Operación realizada satisfactoriamente'
        : 'No fue posible completar la operación')

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/20" />
      <div
        role="alertdialog"
        aria-modal="true"
        className={`relative z-10 w-full max-w-sm rounded-xl border-2 bg-white p-5 text-center shadow-2xl ${
          esConfirmacion ? 'border-amber-500' : esExito ? 'border-emerald-500' : 'border-red-500'
        }`}
      >
        <div
          className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 text-2xl ${
            esConfirmacion
              ? 'border-amber-500 bg-amber-50 text-amber-600'
              : esExito
                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                : 'border-red-500 bg-red-50 text-red-600'
          }`}
        >
          <i className={`fas ${esExito ? 'fa-check' : 'fa-exclamation-triangle'}`}></i>
        </div>

        <div className="text-sm font-black text-slate-800">
          {tituloFinal}
        </div>

        {mensaje && (
          <div className="mt-2 text-[10px] text-slate-600">
            {mensaje}
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-3">
          {esConfirmacion && (
            <button type="button" onClick={onCerrar} className="min-w-[110px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-50">
              {textoCancelar}
            </button>
          )}
          <button
            type="button"
            onClick={esConfirmacion ? onConfirmar : onCerrar}
            className={`min-w-[110px] rounded-lg px-4 py-2 text-[10px] font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] ${
              esConfirmacion ? 'bg-amber-600 hover:bg-amber-700' : esExito ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {esConfirmacion && textoBoton === 'ACEPTAR' ? 'ELIMINAR' : textoBoton}
          </button>
        </div>
      </div>
    </div>
  )
}
