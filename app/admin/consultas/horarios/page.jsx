'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast, Toaster } from 'sonner'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import { BotonAccion, TituloSeccion, MarcoTabla, ESTILO_CONTENEDORES } from '@/components/admin/EstiloModulo'
import { CalendarClock, Eraser, Eye, X, Printer, List, Users, ChevronLeft, ChevronRight } from 'lucide-react'

const ROLES = ['INSTRUCTOR PRÁCTICA', 'INSTRUCTOR TEORÍA', 'AUXILIAR ADMINISTRATIVO']
const ESTADOS = ['No Cerrado', 'Abierto', 'Cerrado']
const PAGE_SIZE = 30

function hoyBogota() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota',
  }).format(new Date())
}
function haceDias(fecha, dias) {
  const [a, m, d] = fecha.split('-').map(Number)
  const x = new Date(Date.UTC(a, m - 1, d))
  x.setUTCDate(x.getUTCDate() - dias)
  return x.toISOString().slice(0, 10)
}
function fechaBonita(value) {
  if (!value) return '—'
  const [a, m, d] = value.slice(0, 10).split('-')
  return [d, m, a].join('/')
}
function hora(value) { return value ? String(value).slice(0, 5) : '—' }
function claseEstado(value) {
  if (value === 'No Cerrado') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (value === 'Abierto') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}
const control = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200'

export default function ConsultaHorariosPage() {
  const [filtros, setFiltros] = useState(() => {
    const hoy = hoyBogota()
    return { inicio: haceDias(hoy, 30), fin: hoy, rol: '', funcionario: '', estado: 'No Cerrado' }
  })
  const [nit, setNit] = useState('')
  const [listo, setListo] = useState(false)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [pagina, setPagina] = useState(1)
  const [detalle, setDetalle] = useState(null)
  const [funcionarios, setFuncionarios] = useState([])
  const [cargandoFuncionarios, setCargandoFuncionarios] = useState(false)
  const [vista, setVista] = useState('jornadas')
  const [periodo, setPeriodo] = useState('30')

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}')
      setNit(String(user.nitEmpresa || user.nit_empresa || user.empresa?.nit || user.nit || localStorage.getItem('currentEmpresaNit') || ''))
    } catch { setNit(localStorage.getItem('currentEmpresaNit') || '') }
    setListo(true)
  }, [])

  useEffect(() => {
    if (!listo || !filtros.rol) { setFuncionarios([]); return }
    let activo = true
    const obtener = async () => {
      setCargandoFuncionarios(true)
      try {
        const params = new URLSearchParams({ recurso: 'funcionarios', rol: filtros.rol, nit })
        const res = await fetch('/api/admin/consultas/horarios?' + params, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok || json.status !== 'success') throw new Error(json.message || 'No fue posible cargar funcionarios.')
        if (activo) setFuncionarios(json.funcionarios || [])
      } catch (e) { if (activo) toast.error(e.message) }
      finally { if (activo) setCargandoFuncionarios(false) }
    }
    obtener()
    return () => { activo = false }
  }, [listo, filtros.rol, nit])

  useEffect(() => {
    if (!listo) return
    if (!filtros.inicio || !filtros.fin || filtros.inicio > filtros.fin) {
      setDatos(null)
      setError('Seleccione un rango de fechas válido.')
      return
    }
    if (filtros.fin > hoyBogota()) {
      setDatos(null)
      setError('No se permiten fechas futuras.')
      return
    }
    let activo = true
    const controller = new AbortController()
    const consultar = async () => {
      setCargando(true)
      setError('')
      try {
        const params = new URLSearchParams({
          recurso: 'consulta_general', nit, fecha_inicio: filtros.inicio,
          fecha_fin: filtros.fin, rol: filtros.rol,
          nombre_completo: filtros.funcionario, estado: filtros.estado,
        })
        const res = await fetch('/api/admin/consultas/horarios?' + params, {
          cache: 'no-store', signal: controller.signal,
        })
        const json = await res.json()
        if (!res.ok || json.status !== 'success') throw new Error(json.message || 'No fue posible consultar los horarios.')
        if (activo) { setDatos(json); setPagina(1); setDetalle(null) }
      } catch (e) {
        if (activo && e.name !== 'AbortError') { setDatos(null); setError(e.message) }
      } finally { if (activo) setCargando(false) }
    }
    consultar()
    return () => { activo = false; controller.abort() }
  }, [listo, nit, filtros.inicio, filtros.fin, filtros.rol, filtros.funcionario, filtros.estado])

  const actualizar = (campo, valor) => setFiltros(p => ({
    ...p, [campo]: valor, ...(campo === 'rol' ? { funcionario: '' } : {}),
  }))
  const limpiar = () => {
    const hoy = hoyBogota()
    setFiltros({ inicio: haceDias(hoy, 30), fin: hoy, rol: '', funcionario: '', estado: 'No Cerrado' })
    setVista('jornadas')
    setPeriodo('30')
  }
  const filas = datos?.jornadas || []
  const resumen = datos?.resumen || {}
  const totalPaginas = Math.max(1, Math.ceil(filas.length / PAGE_SIZE))
  const visibles = useMemo(() => filas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE), [filas, pagina])
  const imprimir = () => window.print()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Toaster richColors position="top-right" />
      <div className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 md:px-6 print:max-w-none print:p-0">
        <div className="print:hidden">
          <EncabezadoModulo titulo="Consulta de Horarios" subtitulo="Jornadas pendientes y seguimiento por funcionario, rol y período" icono={CalendarClock} rutaRegreso="/admin/consultas" textoRegreso="Seguimiento Operativo y Consultas" />
        </div>

        <section className="rounded-xl border bg-white p-4 shadow-sm print:hidden" style={{ borderColor: ESTILO_CONTENEDORES.borde }}>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="text-xs font-medium">Período
              <select className={control} value={periodo} onChange={e => {
                const v = e.target.value
                setPeriodo(v)
                if (v !== 'personalizado') {
                  const hoy = hoyBogota()
                  setFiltros(p => ({ ...p, inicio: haceDias(hoy, Number(v) - 1), fin: hoy }))
                }
              }}>
                <option value="7">Últimos 7 días</option>
                <option value="30">Últimos 30 días</option>
                <option value="90">Últimos 90 días</option>
                <option value="personalizado">Personalizar fechas</option>
              </select>
            </label>
            {periodo === 'personalizado' && <>
              <label className="text-xs font-medium">Fecha inicial
                <input className={control} type="date" max={hoyBogota()} value={filtros.inicio} onChange={e => actualizar('inicio', e.target.value)} />
              </label>
              <label className="text-xs font-medium">Fecha final
                <input className={control} type="date" max={hoyBogota()} value={filtros.fin} onChange={e => actualizar('fin', e.target.value)} />
              </label>
            </>}
            <label className="text-xs font-medium">Rol
              <select className={control} value={filtros.rol} onChange={e => actualizar('rol', e.target.value)}>
                <option value="">Todos los roles</option>
                {ROLES.map(rol => <option key={rol} value={rol}>{rol}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium">Funcionario
              <select className={control} disabled={!filtros.rol || cargandoFuncionarios} value={filtros.funcionario} onChange={e => actualizar('funcionario', e.target.value)}>
                <option value="">{cargandoFuncionarios ? 'Cargando...' : 'Todos los funcionarios'}</option>
                {funcionarios.map((item, i) => <option key={item.personal_id || i} value={item.nombre_completo}>{item.nombre_completo}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium">Estado
              <select className={control} value={filtros.estado} onChange={e => actualizar('estado', e.target.value)}>
                <option value="">Todos los estados</option>
                {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
              </select>
            </label>
            <BotonAccion tipo="limpiar" onClick={limpiar} className="h-9"><Eraser size={15} /> Limpiar</BotonAccion>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: ESTILO_CONTENEDORES.borde }}>
          <div className="print:hidden">
            <TituloSeccion
              titulo="Registro de jornadas"
              subtitulo={`${fechaBonita(filtros.inicio)} al ${fechaBonita(filtros.fin)} · ${filas.length} registros${cargando ? ' · Consultando...' : ''}`}
              icono={<CalendarClock size={17} />}
              acciones={<>
                <BotonAccion tipo={vista === 'jornadas' ? 'consultar' : 'secundario'} onClick={() => setVista('jornadas')}><List size={15} /> Jornadas</BotonAccion>
                <BotonAccion tipo={vista === 'funcionarios' ? 'consultar' : 'secundario'} onClick={() => setVista('funcionarios')}><Users size={15} /> Resumen por funcionario</BotonAccion>
                <BotonAccion tipo="imprimir" onClick={imprimir} disabled={!datos || cargando}><Printer size={15} /> Imprimir</BotonAccion>
              </>}
            />
          </div>
          <p className="hidden px-4 py-2 text-xs print:block">{fechaBonita(filtros.inicio)} al {fechaBonita(filtros.fin)} · {filas.length} registros</p>
          {error && <p role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {!error && !cargando && !filas.length && <p className="p-8 text-center text-sm text-slate-500">No se encontraron jornadas para los filtros seleccionados.</p>}
          {vista === 'jornadas' ? (
            <MarcoTabla className="overflow-x-auto rounded-none border-0">
              <table className="w-full min-w-[850px] border-collapse text-left text-xs">
                <thead ><tr>
                  {['Fecha', 'Funcionario', 'Rol', 'Entrada', 'Salida', 'Placa', 'Estado', 'Detalle'].map(t => <th key={t} className="whitespace-nowrap border-b px-3 py-3 font-semibold" >{t}</th>)}
                </tr></thead>
                <tbody>{visibles.map(j => (
                  <tr key={j.id} className="border-b border-slate-200 odd:bg-white even:bg-slate-50/70 transition-colors hover:bg-blue-50">
                    <td className="whitespace-nowrap px-3 py-2">{fechaBonita(j.fecha_entrada)}</td>
                    <td className="px-3 py-2 font-medium">{j.nombre_completo || '—'}</td>
                    <td className="px-3 py-2">{j.rol || '—'}</td>
                    <td className="px-3 py-2">{hora(j.hora_entrada)}</td>
                    <td className="px-3 py-2">{hora(j.hora_salida)}</td>
                    <td className="px-3 py-2">{j.placa || '—'}</td>
                    <td className="px-3 py-2"><span className={`whitespace-nowrap rounded-full border px-2 py-1 font-semibold ${claseEstado(j.estado_registro)}`}>{j.estado_registro || '—'}</span></td>
                    <td className="px-3 py-2 print:hidden"><BotonAccion tipo="verDetalle" aria-label="Ver detalle" onClick={() => setDetalle(j)}><Eye size={15} /> Ver</BotonAccion></td>
                  </tr>
                ))}</tbody>
              </table>
            </MarcoTabla>
          ) : (
            <MarcoTabla className="overflow-x-auto rounded-none border-0">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead ><tr>{['Funcionario', 'Rol', 'Total', 'No Cerrado', 'Abierto', 'Cerrado', '% cierre'].map(t => <th key={t} className="border-b px-3 py-3" >{t}</th>)}</tr></thead>
                <tbody>{(datos?.funcionarios || []).map((f, i) => <tr key={i} className="border-b border-slate-200 odd:bg-white even:bg-slate-50/70 hover:bg-blue-50">
                  <td className="px-3 py-2 font-medium">{f.nombre_completo}</td><td className="px-3 py-2">{f.rol}</td>
                  <td className="px-3 py-2">{f.total}</td><td className="px-3 py-2">{f.no_cerradas}</td>
                  <td className="px-3 py-2">{f.abiertas}</td><td className="px-3 py-2">{f.cerradas}</td>
                  <td className="px-3 py-2">{f.porcentaje_cierre}%</td>
                </tr>)}</tbody>
              </table>
            </MarcoTabla>
          )}
          {vista === 'jornadas' && filas.length > PAGE_SIZE && <div className="flex items-center justify-between border-t px-4 py-3 text-xs print:hidden">
            <span>Página {pagina} de {totalPaginas}</span>
            <div className="flex gap-2">
              <BotonAccion tipo="secundario" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}><ChevronLeft size={14} /> Anterior</BotonAccion>
              <BotonAccion tipo="secundario" disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}>Siguiente <ChevronRight size={14} /></BotonAccion>
            </div>
          </div>}
        </section>
        {detalle && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 print:hidden" onClick={() => setDetalle(null)}>
          <aside role="dialog" aria-modal="true" aria-label="Detalle de jornada" className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">Detalle de jornada</h2><button aria-label="Cerrar detalle" onClick={() => setDetalle(null)}><X size={22} /></button></div>
            <div className="space-y-3 text-sm">
              {[
                ['Funcionario', detalle.nombre_completo], ['Rol', detalle.rol], ['Usuario', detalle.usuario],
                ['Fecha entrada', fechaBonita(detalle.fecha_entrada)], ['Hora entrada', hora(detalle.hora_entrada)],
                ['Fecha salida', fechaBonita(detalle.fecha_salida)], ['Hora salida', hora(detalle.hora_salida)],
                ['Estado', detalle.estado_registro], ['Placa', detalle.placa],
                ['Clases programadas', detalle.clases_programadas], ['Clases dictadas', detalle.clases_dictadas],
                ['Aprendices', detalle.num_aprendices],
              ].map(([etiqueta, valor]) => <div key={etiqueta} className="flex justify-between gap-3 border-b pb-2"><span className="text-slate-500">{etiqueta}</span><span className="text-right font-medium">{valor ?? '—'}</span></div>)}
            </div>
            <p className="mt-6 rounded-lg bg-slate-100 p-3 text-xs text-slate-600">Consulta de solo lectura. Los estados se muestran tal como están registrados en la base de datos.</p>
          </aside>
        </div>}
      </div>
      <style jsx global>{`@media print { @page { size: landscape; margin: 12mm; } body { background: white !important; } }`}</style>
    </div>
  )
}
