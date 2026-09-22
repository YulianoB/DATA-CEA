// app/admin/pesv/riesgos/components/ResumenRiesgos.js

function Tarjeta({
  titulo,
  valor,
  clase,
  icono,
}) {
  return (
    <div
      className={`
        border
        rounded-lg
        px-3
        py-2
        ${clase}
      `}
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-2
        "
      >
        <div
          className="
            text-[8px]
            font-bold
            uppercase
          "
        >
          {titulo}
        </div>

        <i
          className={`
            fas
            ${icono}
          `}
        ></i>
      </div>

      <div
        className="
          text-xl
          font-black
          mt-1
        "
      >
        {valor || 0}
      </div>
    </div>
  )
}


export default function ResumenRiesgos({
  resumen,
}) {
  return (
    <div
      className="
        grid
        grid-cols-2
        md:grid-cols-5
        gap-2
      "
    >
      <Tarjeta
        titulo="Riesgos activos"
        valor={
          resumen?.total
        }
        icono="fa-list"
        clase="bg-slate-50 border-slate-200 text-slate-800"
      />

      <Tarjeta
        titulo="Críticos"
        valor={
          resumen?.criticos
        }
        icono="fa-circle-exclamation"
        clase="bg-red-50 border-red-200 text-red-800"
      />

      <Tarjeta
        titulo="Moderados"
        valor={
          resumen?.moderados
        }
        icono="fa-triangle-exclamation"
        clase="bg-amber-50 border-amber-200 text-amber-800"
      />

      <Tarjeta
        titulo="Bajos"
        valor={
          resumen?.bajos
        }
        icono="fa-circle-check"
        clase="bg-green-50 border-green-200 text-green-800"
      />

      <Tarjeta
        titulo="Prioritarios"
        valor={
          resumen?.prioritarios
        }
        icono="fa-bolt"
        clase="bg-purple-50 border-purple-200 text-purple-800"
      />
    </div>
  )
}