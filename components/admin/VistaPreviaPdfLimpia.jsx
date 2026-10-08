'use client'

const texto = (v) => String(v ?? '').trim()
const fecha = (v) => texto(v).slice(0, 10)
const dato = (etiqueta, valor) => texto(valor) ? <div className="mb-1 break-words"><strong>{etiqueta}: </strong>{texto(valor)}</div> : null

const IconoContacto = ({ tipo }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="inline-block shrink-0 align-middle">
    {tipo === 'celular' ? <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
      <circle cx="12" cy="18.5" r="0.8" fill="currentColor" stroke="none" />
    </> : tipo === 'correo' ? <>
      <rect x="2" y="5" width="20" height="14" rx="1" />
      <path d="m2 6 10 8 10-8" />
    </> : <>
      <path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>}
  </svg>
)

export default function VistaPreviaPdfLimpia({ datos, documento, fotoDataUrl }) {
  if (!datos?.personal) return null
  const { personal, estudios = [], experiencia = [], licencias = [], perfiles = [] } = datos
  const nombre = [personal.nombres, personal.apellidos].filter(Boolean).join(' ').toUpperCase()
  const roles = perfiles.filter(p => String(p.estado || '').toLowerCase() === 'activo').map(p => p.rol)
  const esInstructor = roles.includes('INSTRUCTOR_TEORIA') || roles.includes('INSTRUCTOR_PRACTICA') || personal.rol_conductor_instructor === true
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  const vigentes = esInstructor ? licencias.filter(l => fecha(l.vigencia) >= hoy && String(l.estado_vigencia || '').toUpperCase() !== 'VENCIDA') : []
  const normalizar = v => texto(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  const conduccion = vigentes.filter(l => normalizar(l.tipo_licencia).includes('CONDUC'))
  const instructor = vigentes.filter(l => normalizar(l.tipo_licencia).includes('INSTRUCTOR'))
  const otros = vigentes.filter(l => !conduccion.includes(l) && !instructor.includes(l))
  const titulo = label => <h3 className="mb-2 mt-4 text-[13px] font-bold uppercase text-[#233b55]">{label}</h3>
  const seccion = label => <h3 className="mb-2 mt-4 rounded bg-white px-2 py-1 text-[12px] font-bold uppercase text-[#233b55]">{label}</h3>
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 px-2 py-5 sm:px-5">
      <article className="relative mx-auto w-full max-w-[816px] overflow-hidden bg-white text-[#233b55] shadow-md" style={{ aspectRatio: '215.9 / 279.4', minHeight: 'min(1056px, 125vw)', fontFamily: 'Arial, sans-serif' }}>
        <header className="relative flex h-[17.5%] items-center justify-end bg-[#233b55] px-[5%] text-right text-white">
          <div className="w-[70%]">
            <h1 className="whitespace-nowrap text-[clamp(10px,2vw,22px)] font-bold">{nombre}</h1>
            <p className="mt-5 text-[clamp(9px,1.3vw,13px)]">{texto(personal.cargo).toUpperCase()}</p>
          </div>
        </header>
        <div className="absolute left-[7.4%] top-[7%] z-10 flex aspect-square w-[26.9%] items-center justify-center rounded-full border-[clamp(9px,2vw,24px)] border-white bg-[#e1e4e7] text-[clamp(8px,1vw,12px)]">
          {fotoDataUrl ? <img src={fotoDataUrl} alt="Fotografía del trabajador" className="h-full w-full rounded-full object-cover" /> : 'FOTOGRAFÍA'}
        </div>
        <div className="grid min-h-[76.5%] grid-cols-[40.3%_59.7%]">
          <aside className="bg-[#d3d7dc] px-[14%] pb-6 pt-[39%] text-[clamp(9px,1.05vw,11px)] leading-[1.35]">
            {seccion('Contacto')}
            <div className="mb-2"><strong className="inline-flex items-center gap-1.5"><IconoContacto tipo="celular" /> Celular</strong><div className="pl-3 break-words">{texto(personal.telefono)}</div></div>
            <div className="mb-2"><strong className="inline-flex items-center gap-1.5"><IconoContacto tipo="correo" /> Correo electrónico</strong><div className="pl-3 break-all">{texto(personal.email)}</div></div>
            <div className="mb-2"><strong className="inline-flex items-center gap-1.5"><IconoContacto tipo="direccion" /> Dirección</strong><div className="pl-3 break-words">{[personal.direccion, personal.ciudad_residencia].filter(Boolean).join(', ')}</div></div>
            {seccion('Información')}
            {dato('Documento', personal.documento)}
            {dato('Profesión', personal.profesion)}
            {dato('Escolaridad', personal.escolaridad)}
            {seccion('Vinculación')}
            {dato('Relación', personal.tipo_personal)}
            {dato('Grupo', personal.grupo_personal)}
            {dato('Fecha', fecha(personal.fecha_vinculacion))}
            {seccion('Estudios')}
            {!estudios.length && dato('Estado', 'Sin estudios registrados')}
            {estudios.map((e, i) => <div key={e.id ?? i} className="mb-2">{dato('Título', e.titulo || e.nivel_estudio)}{dato('Institución', e.institucion)}{dato('Grado', fecha(e.fecha_grado))}</div>)}
          </aside>
          <main className="px-[9%] pb-6 pt-[10%] text-[clamp(9px,1vw,11px)] leading-[1.3]">
            {titulo('Mi perfil')}
            <div className="whitespace-pre-wrap break-words">{texto(personal.perfil_profesional)}</div>
            {vigentes.length > 0 && <>
              {titulo('Licencias y certificados vigentes')}
              <div className="grid grid-cols-2 gap-3 text-[clamp(8px,.9vw,10px)]">
                {[{ nombre: 'Licencia de conducción', items: [...conduccion, ...otros] }, { nombre: 'Certificado de instructor', items: instructor }].map(col => <div key={col.nombre}>
                  <h4 className="mb-2 rounded bg-slate-200 p-1 font-bold">{col.nombre}</h4>
                  {col.items.map((l, i) => <div key={l.id ?? i} className="mb-2">{dato('Categoría', l.categoria)}{dato('Número', l.numero_certificado)}{dato('Vigencia', fecha(l.vigencia))}</div>)}
                </div>)}
              </div>
            </>}
            {experiencia.length > 0 && <>{titulo('Experiencia laboral')}{experiencia.map((e, i) => <div key={e.id ?? i} className="mb-3"><strong>{texto(e.cargo).toUpperCase()}</strong><div>{texto(e.empresa)} ({fecha(e.fecha_inicio)} - {e.actualmente ? 'Actualidad' : fecha(e.fecha_fin)})</div><div className="whitespace-pre-wrap">{texto(e.funciones)}</div></div>)}</>}
          </main>
        </div>
        <footer className="absolute bottom-0 left-0 right-0 flex justify-between border-t border-slate-300 bg-white px-[5%] py-2 text-[clamp(8px,.9vw,10px)]">
          <span>Versión: {texto(documento?.version) || '—'} · Fecha de edición: {fecha(documento?.fecha_edicion) || '—'}</span>
          <span>Página 1 de 1</span>
        </footer>
      </article>
    </div>
  )
}
