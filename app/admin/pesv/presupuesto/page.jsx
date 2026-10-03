'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronDown, ChevronRight, FileText, Save, WalletCards } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'

const ANIO_ACTUAL = new Date().getFullYear()
const MESES = [
  { numero: 1, nombre: 'Ene' }, { numero: 2, nombre: 'Feb' }, { numero: 3, nombre: 'Mar' },
  { numero: 4, nombre: 'Abr' }, { numero: 5, nombre: 'May' }, { numero: 6, nombre: 'Jun' },
  { numero: 7, nombre: 'Jul' }, { numero: 8, nombre: 'Ago' }, { numero: 9, nombre: 'Sep' },
  { numero: 10, nombre: 'Oct' }, { numero: 11, nombre: 'Nov' }, { numero: 12, nombre: 'Dic' },
]
const CATEGORIAS = {
  MANTENIMIENTO_SEGURIDAD: 'Mantenimiento y seguridad vehicular',
  CAPACITACION: 'Capacitación y formación en seguridad vial',
  SENALIZACION: 'Señalización y adecuaciones de seguridad vial',
  TECNOLOGIA_MONITOREO: 'Tecnología y monitoreo',
  EMERGENCIAS: 'Atención de emergencias y elementos de prevención',
  GESTION_PESV: 'Gestión, seguimiento y documentación PESV',
  OTROS: 'Otros recursos destinados al PESV',
}
const ORDEN_CATEGORIAS = Object.keys(CATEGORIAS)
const TIPOS_DISTRIBUCION = [
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
  { value: 'ANUAL', label: 'Anual' },
]
const LEFT = { concepto: 0, proyectado: 280, ejecutado: 372, saldo: 464, porcentaje: 556 }

function texto(valor) {
  return String(valor ?? '').trim()
}
function numero(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}
function moneda(valor) {
  return numero(valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}
function enteroColombia(valor) {
  const limpio = String(valor ?? '').replace(/\D/g, '')
  return limpio ? Number(limpio).toLocaleString('es-CO', { maximumFractionDigits: 0 }) : ''
}
function numeroDesdeFormato(valor) {
  const limpio = String(valor ?? '').replace(/\D/g, '')
  return limpio ? Number(limpio) : 0
}
function porcentaje(ejecutado, proyectado) {
  if (proyectado <= 0) return ejecutado > 0 ? 100 : 0
  return (ejecutado / proyectado) * 100
}
function estadoEjecucion(ejecutado, proyectado) {
  const e = numero(ejecutado)
  const p = numero(proyectado)
  if (p <= 0 && e > 0) return { texto: 'Sin presupuesto', clase: 'text-red-700 bg-red-50' }
  if (p <= 0) return { texto: 'Sin ejecución', clase: 'text-slate-600 bg-slate-50' }
  if (e > p) return { texto: 'Sobre ejecución', clase: 'text-red-700 bg-red-50' }
  if (e === p) return { texto: 'Cumplido', clase: 'text-emerald-700 bg-emerald-50' }
  if (e > 0) return { texto: 'En ejecución', clase: 'text-amber-700 bg-amber-50' }
  return { texto: 'Pendiente', clase: 'text-slate-600 bg-slate-50' }
}
function usuarioSesion(user) {
  return texto(user?.nombreCompleto) || texto(user?.nombre_completo) || texto(user?.usuario) || texto(user?.documento) || null
}
function obtenerNit(user) {
  return texto(user?.nitEmpresa) || texto(user?.nit_empresa) || texto(user?.nit) || texto(localStorage.getItem('currentEmpresaNit'))
}
function valorMes(fila, mes, campo) {
  const detalle = Array.isArray(fila?.meses) ? fila.meses.find(item => Number(item.mes) === mes) : null
  return numero(detalle?.[campo])
}
function sumaMeses(fila, meses, campo) {
  return meses.reduce((total, mes) => total + valorMes(fila, mes, campo), 0)
}
function repartir(total, meses) {
  const resultado = MESES.reduce((acc, mes) => ({ ...acc, [mes.numero]: 0 }), {})
  if (!meses.length || total <= 0) return resultado
  const base = Math.floor(total / meses.length)
  let asignado = 0
  meses.forEach((mes, indice) => {
    const valor = indice === meses.length - 1 ? total - asignado : base
    resultado[mes] = valor
    asignado += valor
  })
  return resultado
}
function mesesDistribucion(tipo, configuracion = {}) {
  if (tipo === 'MENSUAL') return MESES.map(mes => mes.numero)
  if (tipo === 'TRIMESTRAL') return configuracion.meses?.length === 4 ? configuracion.meses.map(Number) : [3, 6, 9, 12]
  if (tipo === 'SEMESTRAL') return configuracion.meses?.length === 2 ? configuracion.meses.map(Number) : [6, 12]
  return [Number(configuracion.mes || 12)]
}
function distribucionInicial() {
  return { tipo: 'MENSUAL', anual: '', configuracion: { meses: [3, 6, 9, 12], mes: 12 } }
}

export default function PresupuestoPesvPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [nitActual, setNitActual] = useState('')
  const [vigencia, setVigencia] = useState(ANIO_ACTUAL)
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [presupuesto, setPresupuesto] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [conceptos, setConceptos] = useState([])
  const [matriz, setMatriz] = useState([])
  const [seleccionados, setSeleccionados] = useState({})
  const [configNueva, setConfigNueva] = useState({})
  const [modalConcepto, setModalConcepto] = useState(null)
  const [modalConfig, setModalConfig] = useState(distribucionInicial())
  const [programacionNueva, setProgramacionNueva] = useState({})
  const [programacionEdicion, setProgramacionEdicion] = useState({})
  const [categoriasAbiertas, setCategoriasAbiertas] = useState(() =>
    ORDEN_CATEGORIAS.reduce((acc, categoria) => ({ ...acc, [categoria]: true }), {})
  )

  useEffect(() => {
    const almacenado = localStorage.getItem('currentUser')
    if (!almacenado) {
      router.push('/login')
      return
    }
    try {
      const usuario = JSON.parse(almacenado)
      const nit = obtenerNit(usuario)
      if (!nit) {
        toast.error('No fue posible identificar la empresa de la sesión.')
        router.push('/login')
        return
      }
      setUser(usuario)
      setNitActual(nit)
    } catch {
      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }, [router])

  const cargar = useCallback(async () => {
    if (!nitActual) return
    setCargando(true)
    try {
      const respuesta = await fetch(`/api/admin/pesv/presupuesto?nit=${encodeURIComponent(nitActual)}&vigencia=${vigencia}`, { cache: 'no-store' })
      const data = await respuesta.json()
      if (!respuesta.ok || data?.ok === false) throw new Error(data?.error || data?.message || 'No fue posible consultar el presupuesto.')
      setEmpresa(data?.empresa || null)
      setPresupuesto(data?.presupuesto || null)
      setConceptos(Array.isArray(data?.conceptos_pesv) ? data.conceptos_pesv : [])
      setMatriz(Array.isArray(data?.matriz) ? data.matriz : [])
      const edicion = {}
      for (const fila of Array.isArray(data?.matriz) ? data.matriz : []) {
        if (!fila?.partida_id) continue
        edicion[String(fila.partida_id)] = {}
        for (const mes of MESES) edicion[String(fila.partida_id)][mes.numero] = valorMes(fila, mes.numero, 'programado')
      }
      setProgramacionEdicion(edicion)
      setSeleccionados({})
      setConfigNueva({})
      setProgramacionNueva({})
    } catch (error) {
      toast.error(error.message)
    } finally {
      setCargando(false)
    }
  }, [nitActual, vigencia])

  useEffect(() => {
    cargar()
  }, [cargar])

  const conceptosPorCategoria = useMemo(() => {
    const grupos = {}
    for (const categoria of ORDEN_CATEGORIAS) grupos[categoria] = []
    for (const concepto of conceptos) {
      const categoria = texto(concepto?.categoria_pesv)
      if (grupos[categoria]) grupos[categoria].push(concepto)
    }
    return grupos
  }, [conceptos])

  const hayValoresNuevos = useMemo(() =>
    Object.keys(seleccionados).some(id =>
      seleccionados[id] && Object.values(programacionNueva[id] || {}).some(valor => numero(valor) > 0)
    ), [seleccionados, programacionNueva])

  const cambiarSeleccion = concepto => {
    const id = String(concepto.id)
    if (seleccionados[id]) {
      setSeleccionados(actual => ({ ...actual, [id]: false }))
      setProgramacionNueva(actual => {
        const copia = { ...actual }
        delete copia[id]
        return copia
      })
      return
    }
    const actual = configNueva[id] || distribucionInicial()
    setModalConcepto(concepto)
    setModalConfig({
      ...actual,
      configuracion: {
        ...actual.configuracion,
        meses: [...(actual.configuracion?.meses || [3, 6, 9, 12])],
      },
    })
  }

  const aceptarConfiguracion = () => {
    if (!modalConcepto) return
    const id = String(modalConcepto.id)
    const anual = Math.max(0, numero(modalConfig.anual))
    if (anual <= 0) {
      toast.error('Ingrese un valor de presupuesto anual mayor que cero.')
      return
    }
    const siguiente = { ...modalConfig, anual }
    setConfigNueva(actual => ({ ...actual, [id]: siguiente }))
    setProgramacionNueva(actual => ({
      ...actual,
      [id]: repartir(anual, mesesDistribucion(siguiente.tipo, siguiente.configuracion)),
    }))
    setSeleccionados(actual => ({ ...actual, [id]: true }))
    setModalConcepto(null)
  }

  const editarConfiguracion = concepto => {
    const id = String(concepto.id)
    const actual = configNueva[id] || distribucionInicial()
    setModalConcepto(concepto)
    setModalConfig({
      ...actual,
      configuracion: {
        ...actual.configuracion,
        meses: [...(actual.configuracion?.meses || [3, 6, 9, 12])],
      },
    })
  }

  const cambiarValorNuevo = (conceptoId, mes, valor) => {
    const id = String(conceptoId)
    const limpio = valor === '' ? 0 : Math.max(0, numero(valor))
    setProgramacionNueva(actual => {
      const siguiente = { ...(actual[id] || {}), [mes]: limpio }
      const anual = Object.values(siguiente).reduce((suma, item) => suma + numero(item), 0)
      setConfigNueva(config => ({ ...config, [id]: { ...(config[id] || distribucionInicial()), anual } }))
      return { ...actual, [id]: siguiente }
    })
  }

  const cambiarValorExistente = (partidaId, mes, valor) => {
    const limpio = valor === '' ? '' : Math.max(0, Number(valor))
    setProgramacionEdicion(actual => ({
      ...actual,
      [partidaId]: { ...(actual[partidaId] || {}), [mes]: Number.isFinite(limpio) ? limpio : '' },
    }))
  }

  const post = async body => {
    const respuesta = await fetch('/api/admin/pesv/presupuesto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nit: nitActual, usuario: usuarioSesion(user), ...body }),
    })
    const data = await respuesta.json()
    if (!respuesta.ok || data?.ok === false) throw new Error(data?.error || data?.message || 'No fue posible completar la operación.')
    return data
  }

  const crearPresupuesto = async () => {
    if (!hayValoresNuevos) return
    setProcesando(true)
    try {
      const partidas = conceptos
        .filter(concepto => seleccionados[String(concepto.id)])
        .map(concepto => ({ concepto_id: concepto.id, meses: programacionNueva[String(concepto.id)] || {} }))
      await post({ accion: 'crear_presupuesto', vigencia, partidas })
      toast.success('Presupuesto PESV creado correctamente.')
      await cargar()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setProcesando(false)
    }
  }

  const guardarProgramacion = async () => {
    if (!presupuesto?.id) return
    const programacion = []
    for (const fila of matriz) {
      if (!fila?.partida_id) continue
      for (const mes of MESES) {
        programacion.push({
          partida_id: fila.partida_id,
          mes: mes.numero,
          valor_programado: numero(programacionEdicion[String(fila.partida_id)]?.[mes.numero]),
        })
      }
    }
    setProcesando(true)
    try {
      await post({ accion: 'guardar_programacion', presupuesto_id: presupuesto.id, programacion })
      toast.success('Programación presupuestal guardada.')
      await cargar()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setProcesando(false)
    }
  }

  const aprobarPresupuesto = async () => {
    if (!presupuesto?.id) return
    setProcesando(true)
    try {
      await post({ accion: 'aprobar_presupuesto', presupuesto_id: presupuesto.id })
      toast.success('Presupuesto PESV aprobado.')
      await cargar()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setProcesando(false)
    }
  }

  const filasVisibles = useMemo(() => {
    if (presupuesto) return matriz
    return conceptos.filter(concepto => seleccionados[String(concepto.id)]).map(concepto => ({
      id: `NUEVO_${concepto.id}`,
      concepto_id: concepto.id,
      concepto_nombre: concepto.nombre,
      categoria_pesv: concepto.categoria_pesv,
      meses: MESES.map(mes => ({ mes: mes.numero, programado: numero(programacionNueva[String(concepto.id)]?.[mes.numero]), ejecutado: 0 })),
      presupuesto_inicial: MESES.reduce((suma, mes) => suma + numero(programacionNueva[String(concepto.id)]?.[mes.numero]), 0),
      ejecutado: 0,
      saldo: MESES.reduce((suma, mes) => suma + numero(programacionNueva[String(concepto.id)]?.[mes.numero]), 0),
      porcentaje_ejecucion: 0,
    }))
  }, [presupuesto, matriz, conceptos, seleccionados, programacionNueva])

  const resumen = useMemo(() => {
    const trimestres = [1, 2, 3, 4].map(trimestre => {
      const meses = [trimestre * 3 - 2, trimestre * 3 - 1, trimestre * 3]
      let proyectado = 0
      let ejecutado = 0
      for (const fila of filasVisibles) {
        if (presupuesto?.estado === 'BORRADOR' && fila.partida_id) {
          proyectado += meses.reduce((suma, mes) => suma + numero(programacionEdicion[String(fila.partida_id)]?.[mes]), 0)
        } else {
          proyectado += sumaMeses(fila, meses, 'programado')
        }
        ejecutado += sumaMeses(fila, meses, 'ejecutado')
      }
      return { trimestre, proyectado, ejecutado, saldo: proyectado - ejecutado, porcentaje: porcentaje(ejecutado, proyectado) }
    })
    const anual = trimestres.reduce((acc, item) => ({
      proyectado: acc.proyectado + item.proyectado,
      ejecutado: acc.ejecutado + item.ejecutado,
      saldo: acc.saldo + item.saldo,
    }), { proyectado: 0, ejecutado: 0, saldo: 0 })
    anual.porcentaje = porcentaje(anual.ejecutado, anual.proyectado)
    return { trimestres, anual }
  }, [filasVisibles, presupuesto, programacionEdicion])

  const totalFila = fila => {
    if (presupuesto?.estado === 'BORRADOR' && fila.partida_id) {
      return MESES.reduce((suma, mes) => suma + numero(programacionEdicion[String(fila.partida_id)]?.[mes.numero]), 0)
    }
    return numero(fila.presupuesto_inicial)
  }

  const toggleCategoria = categoria => {
    setCategoriasAbiertas(actual => ({ ...actual, [categoria]: !actual[categoria] }))
  }

  if (!user) return <p className="mt-20 text-center text-sm text-slate-500">Cargando...</p>

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-5">
      <Toaster richColors position="top-right" />
      <div className="mx-auto max-w-[1800px] space-y-4">
        <div className="overflow-hidden rounded-xl shadow-sm">
          <EncabezadoModulo
            titulo="Presupuesto PESV"
            subtitulo="Planeación mensual y seguimiento de los recursos destinados al PESV"
            icono={WalletCards}
            rutaRegreso="/admin/pesv"
            textoRegreso="Regresar a PESV"
            permitirPersonalizacion={false}
          />
        </div>

        <div className="rounded-xl border border-slate-500 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black uppercase text-slate-800">PRESUPUESTO PESV {vigencia}</h2>
                {presupuesto && (
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${presupuesto.estado === 'APROBADO' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                    {presupuesto.estado}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                {empresa?.razon_social || empresa?.nombre || 'CEA'} · Seleccione los conceptos que aplican y asigne directamente el valor proyectado de cada mes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[10px] font-bold uppercase text-slate-500">Vigencia</label>
              <select
                value={vigencia}
                onChange={e => setVigencia(Number(e.target.value))}
                disabled={procesando}
                className="rounded-lg border border-slate-500 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-500"
              >
                {Array.from({ length: 7 }, (_, i) => ANIO_ACTUAL - 3 + i).map(anio => <option key={anio} value={anio}>{anio}</option>)}
              </select>
              {presupuesto?.estado === 'BORRADOR' && (
                <>
                  <button onClick={guardarProgramacion} disabled={procesando} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-[10px] font-bold text-white hover:bg-slate-900 disabled:opacity-50">
                    <Save size={14} /> Guardar cambios
                  </button>
                  <button onClick={aprobarPresupuesto} disabled={procesando} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                    <CheckCircle2 size={14} /> Aprobar
                  </button>
                </>
              )}
              {presupuesto && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams({
                      nit: nitActual,
                      vigencia: String(vigencia),
                    })
                    router.push(`/admin/pesv/presupuesto/documento?${params.toString()}`)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-500 bg-white px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  <FileText size={14} /> PDF
                </button>
              )}
            </div>
          </div>

          {cargando ? (
            <div className="p-10 text-center text-xs text-slate-500">Cargando presupuesto...</div>
          ) : (
            <>
              {!presupuesto && (
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] leading-relaxed text-slate-600">
                    Seleccione los conceptos que aplican, indique el <strong>presupuesto anual</strong> y elija su distribución. Los valores mensuales se calculan automáticamente y pueden ajustarse antes de crear el presupuesto.
                  </p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-[1950px] w-full border-collapse border-2 border-slate-600 text-[9px]">
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ left: LEFT.concepto }} className="sticky z-40 w-[280px] min-w-[280px] border border-slate-500 bg-blue-900 px-3 py-2 text-left text-white">Concepto presupuestal</th>
                      <th rowSpan="2" style={{ left: LEFT.proyectado }} className="sticky z-40 w-[92px] min-w-[92px] border border-slate-500 bg-slate-500 px-2 py-2 text-white">Proyectado anual</th>
                      <th rowSpan="2" style={{ left: LEFT.ejecutado }} className="sticky z-40 w-[92px] min-w-[92px] border border-slate-500 bg-slate-500 px-2 py-2 text-white">Ejecutado anual</th>
                      <th rowSpan="2" style={{ left: LEFT.saldo }} className="sticky z-40 w-[92px] min-w-[92px] border border-slate-500 bg-slate-500 px-2 py-2 text-white">Saldo</th>
                      <th rowSpan="2" style={{ left: LEFT.porcentaje }} className="sticky z-40 w-[66px] min-w-[66px] border border-r-4 border-slate-700 bg-slate-500 px-2 py-2 text-white">% Ejec.</th>
                      {MESES.map(mes => <th key={mes.numero} className={`min-w-[105px] border border-blue-300 bg-blue-700 px-1 py-2 text-center text-white ${[4, 7, 10].includes(mes.numero) ? 'border-l-2 border-l-blue-200' : ''}`}>{mes.nombre}</th>)}
                    </tr>
                    <tr>
                      {MESES.map(mes => <th key={mes.numero} className={`border border-slate-500 bg-slate-300 px-1 py-1 text-[8px] font-black text-slate-700 ${[4, 7, 10].includes(mes.numero) ? 'border-l-2 border-l-slate-700' : ''}`}>PROY. / EJEC.</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {ORDEN_CATEGORIAS.map(categoria => {
                      const conceptosCategoria = conceptosPorCategoria[categoria] || []
                      const filasCategoria = filasVisibles.filter(fila => fila.categoria_pesv === categoria)
                      if (!conceptosCategoria.length && !filasCategoria.length) return null
                      return (
                        <CategoryRows
                          key={categoria}
                          categoria={categoria}
                          nombre={CATEGORIAS[categoria]}
                          abierta={categoriasAbiertas[categoria]}
                          toggle={() => toggleCategoria(categoria)}
                          presupuesto={presupuesto}
                          conceptos={conceptosCategoria}
                          filas={filasCategoria}
                          seleccionados={seleccionados}
                          cambiarSeleccion={cambiarSeleccion}
                          configNueva={configNueva}
                          editarConfiguracion={editarConfiguracion}
                          programacionNueva={programacionNueva}
                          programacionEdicion={programacionEdicion}
                          cambiarValorExistente={cambiarValorExistente}
                          totalFila={totalFila}
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {!presupuesto && (
                <div className="flex justify-end border-t border-slate-200 bg-white px-4 py-3">
                  <button
                    onClick={crearPresupuesto}
                    disabled={!hayValoresNuevos || procesando}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-[11px] font-black uppercase text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Save size={15} /> Crear presupuesto
                  </button>
                </div>
              )}

              {(presupuesto || filasVisibles.length > 0) && (
                <div className="border-t border-slate-200 p-4">
                  <h3 className="mb-2 text-[10px] font-black uppercase text-slate-700">Resultados trimestrales y acumulado anual</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-[720px] w-full border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-blue-700 text-white">
                          <th className="border border-slate-500 px-3 py-2 text-left">Resultado</th>
                          {resumen.trimestres.map(item => <th key={item.trimestre} className="border border-slate-500 px-3 py-2">Trimestre {item.trimestre}</th>)}
                          <th className="border border-blue-300 bg-slate-600 px-3 py-2">Acumulado anual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Proyectado', 'proyectado'],
                          ['Ejecutado', 'ejecutado'],
                          ['Saldo', 'saldo'],
                        ].map(([etiqueta, campo]) => (
                          <tr key={campo}>
                            <td className="border border-slate-500 px-3 py-2 font-bold text-slate-700">{etiqueta}</td>
                            {resumen.trimestres.map(item => <td key={item.trimestre} className="border border-slate-500 px-3 py-2 text-right font-semibold">{moneda(item[campo])}</td>)}
                            <td className="border border-slate-500 bg-slate-50 px-3 py-2 text-right font-black">{moneda(resumen.anual[campo])}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="border border-slate-500 px-3 py-2 font-bold text-slate-700">% ejecución</td>
                          {resumen.trimestres.map(item => <td key={item.trimestre} className="border border-slate-500 px-3 py-2 text-center font-black">{item.porcentaje.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%</td>)}
                          <td className="border border-slate-500 bg-slate-50 px-3 py-2 text-center font-black">{resumen.anual.porcentaje.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

        {modalConcepto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/35 p-4" onMouseDown={e => {
            if (e.target === e.currentTarget) setModalConcepto(null)
          }}>
            <div className="w-full max-w-md rounded-xl border border-slate-500 bg-white shadow-2xl">
              <div className="border-b border-slate-500 bg-slate-50 px-4 py-3">
                <h3 className="text-xs font-black uppercase text-slate-950">Configurar concepto</h3>
                <p className="mt-1 text-[10px] font-bold text-slate-600">{modalConcepto.nombre}</p>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Presupuesto anual</label>
                  <div>
                    <input autoFocus type="text" inputMode="numeric" value={enteroColombia(modalConfig.anual)} onChange={e => setModalConfig(actual => ({ ...actual, anual: numeroDesdeFormato(e.target.value) }))} className="w-full rounded-lg border border-slate-500 px-3 py-2 text-right text-sm font-bold text-slate-900 outline-none focus:border-blue-500" placeholder="0" />
                    <p className="mt-1 text-right text-[9px] font-semibold text-slate-500">Valor en pesos colombianos (COP)</p>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Distribución</label>
                  <select value={modalConfig.tipo} onChange={e => setModalConfig(actual => ({ ...actual, tipo: e.target.value }))} className="w-full rounded-lg border border-slate-500 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                    {TIPOS_DISTRIBUCION.map(tipo => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Configuración</label>
                  <ConfiguracionModal config={modalConfig} setConfig={setModalConfig} />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-500 bg-slate-50 px-4 py-3">
                <button type="button" onClick={() => setModalConcepto(null)} className="rounded-lg border border-slate-500 bg-white px-3 py-2 text-[10px] font-bold text-slate-700">Cancelar</button>
                <button type="button" onClick={aceptarConfiguracion} className="rounded-lg bg-blue-700 px-4 py-2 text-[10px] font-black uppercase text-white hover:bg-blue-800">Aceptar</button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

function ConfiguracionModal({ config, setConfig }) {
  if (config.tipo === 'MENSUAL') {
    return <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">El valor anual se distribuirá entre los 12 meses.</div>
  }
  if (config.tipo === 'ANUAL') {
    return (
      <select value={config.configuracion?.mes || 12} onChange={e => setConfig(actual => ({ ...actual, configuracion: { ...actual.configuracion, mes: Number(e.target.value) } }))} className="w-full rounded-lg border border-slate-500 bg-white px-3 py-2 text-xs">
        {MESES.map(mes => <option key={mes.numero} value={mes.numero}>{mes.nombre}</option>)}
      </select>
    )
  }
  const cantidad = config.tipo === 'TRIMESTRAL' ? 4 : 2
  const predeterminados = config.tipo === 'TRIMESTRAL' ? [3, 6, 9, 12] : [6, 12]
  const actuales = Array.isArray(config.configuracion?.meses) && config.configuracion.meses.length === cantidad
    ? config.configuracion.meses : predeterminados
  return (
    <div className={`grid ${cantidad === 4 ? 'grid-cols-2' : 'grid-cols-2'} gap-2`}>
      {Array.from({ length: cantidad }, (_, indice) => (
        <select key={indice} value={actuales[indice]} onChange={e => {
          const meses = [...actuales]
          meses[indice] = Number(e.target.value)
          setConfig(actual => ({ ...actual, configuracion: { ...actual.configuracion, meses } }))
        }} className="rounded-lg border border-slate-500 bg-white px-2 py-2 text-xs">
          {MESES.map(mes => <option key={mes.numero} value={mes.numero}>{mes.nombre}</option>)}
        </select>
      ))}
    </div>
  )
}

function CategoryRows({
  categoria, nombre, abierta, toggle, presupuesto, conceptos, filas, seleccionados,
  cambiarSeleccion, configNueva, editarConfiguracion, programacionNueva, programacionEdicion,
  cambiarValorExistente, totalFila,
}) {
  return (
    <>
      <tr>
        <td style={{ left: LEFT.concepto }} className="sticky z-30 w-[280px] min-w-[280px] border border-slate-500 bg-slate-100 p-0">
          <button type="button" onClick={toggle} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[9px] font-black uppercase text-blue-900">
            {abierta ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="leading-tight">{nombre}</span>
            <span className="ml-auto shrink-0 rounded-full border border-slate-500 bg-white px-2 py-0.5 text-[8px] text-blue-900">{presupuesto ? filas.length : conceptos.length}</span>
          </button>
        </td>
        <td style={{ left: LEFT.proyectado }} className="sticky z-30 w-[92px] min-w-[92px] border border-slate-500 bg-slate-200" />
        <td style={{ left: LEFT.ejecutado }} className="sticky z-30 w-[92px] min-w-[92px] border border-slate-500 bg-slate-200" />
        <td style={{ left: LEFT.saldo }} className="sticky z-30 w-[92px] min-w-[92px] border border-slate-500 bg-slate-200" />
        <td style={{ left: LEFT.porcentaje }} className="sticky z-30 w-[66px] min-w-[66px] border border-r-4 border-slate-700 bg-slate-200" />
        {MESES.map(mes => <td key={mes.numero} className={`border border-slate-500 bg-slate-100 ${[4, 7, 10].includes(mes.numero) ? 'border-l-2 border-l-slate-700' : ''}`} />)}
      </tr>
      {abierta && !presupuesto && conceptos.map(concepto => {
        const id = String(concepto.id)
        const seleccionado = Boolean(seleccionados[id])
        const total = Object.values(programacionNueva[id] || {}).reduce((suma, valor) => suma + numero(valor), 0)
        return (
          <tr key={concepto.id} className={seleccionado ? 'bg-white' : 'bg-slate-50'}>
            <td style={{ left: LEFT.concepto }} className="sticky z-20 w-[280px] min-w-[280px] border border-slate-500 bg-white px-3 py-2">
              <div className="ml-5 flex items-start gap-2">
                <input type="checkbox" checked={seleccionado} onChange={() => cambiarSeleccion(concepto)} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <button type="button" onClick={() => seleccionado ? editarConfiguracion(concepto) : cambiarSeleccion(concepto)} className="text-left font-black uppercase text-slate-950 hover:underline">{concepto.nombre}</button>
              </div>
            </td>
            <td style={{ left: LEFT.proyectado }} className="sticky z-20 w-[92px] min-w-[92px] border border-slate-500 bg-white px-2 py-2 text-right font-black text-slate-900">{seleccionado ? moneda(total) : '—'}</td>
            <td style={{ left: LEFT.ejecutado }} className="sticky z-20 w-[92px] min-w-[92px] border border-slate-500 bg-white px-2 py-2 text-right font-bold text-slate-500">—</td>
            <td style={{ left: LEFT.saldo }} className="sticky z-20 w-[92px] min-w-[92px] border border-slate-500 bg-white px-2 py-2 text-right font-bold text-slate-900">{seleccionado ? moneda(total) : '—'}</td>
            <td style={{ left: LEFT.porcentaje }} className="sticky z-20 w-[66px] min-w-[66px] border border-r-4 border-slate-700 bg-white px-2 py-2 text-center font-black text-slate-800">{seleccionado ? '0%' : '—'}</td>
            {MESES.map(mes => {
              const proyectadoMes = numero(programacionNueva[id]?.[mes.numero])
              return (
                <td key={mes.numero} className={`border border-slate-500 bg-white px-2 py-1.5 align-middle ${[4, 7, 10].includes(mes.numero) ? 'border-l-2 border-l-slate-700' : ''}`}>
                  {seleccionado ? (
                    <div className="text-right">
                      <div className="text-[10px] font-black text-blue-950">P: {moneda(proyectadoMes)}</div>
                      <div className="my-1 border-t border-slate-500" />
                      <div className="font-semibold text-slate-500">E: {moneda(0)}</div>
                    </div>
                  ) : <div className="text-center text-slate-300">—</div>}
                </td>
              )
            })}
          </tr>
        )
      })}
      {abierta && presupuesto && filas.map(fila => {
        const editable = presupuesto.estado === 'BORRADOR' && Boolean(fila.partida_id)
        const proyectado = totalFila(fila)
        const ejecutado = numero(fila.ejecutado)
        const saldo = proyectado - ejecutado
        const estado = estadoEjecucion(ejecutado, proyectado)
        return (
          <tr key={fila.id || fila.concepto_id} className={fila.sin_presupuesto ? 'bg-amber-50' : 'bg-white'}>
            <td style={{ left: LEFT.concepto }} className="sticky z-20 w-[280px] min-w-[280px] border border-slate-500 bg-white px-3 py-2">
              <div className="ml-5 font-black uppercase text-slate-950">{fila.concepto_nombre}</div>
              {fila.sin_presupuesto && <div className="ml-5 mt-0.5 text-[8px] font-bold text-amber-700">Ejecución registrada en Caja sin presupuesto</div>}
            </td>
            <td style={{ left: LEFT.proyectado }} className="sticky z-20 w-[92px] min-w-[92px] border border-slate-500 bg-white px-2 py-2 text-right font-black">{moneda(proyectado)}</td>
            <td style={{ left: LEFT.ejecutado }} className="sticky z-20 w-[92px] min-w-[92px] border border-slate-500 bg-white px-2 py-2 text-right font-bold text-emerald-700">{moneda(ejecutado)}</td>
            <td style={{ left: LEFT.saldo }} className={`sticky z-20 w-[92px] min-w-[92px] border border-slate-500 bg-white px-2 py-2 text-right font-bold ${saldo < 0 ? 'text-red-700' : 'text-slate-700'}`}>{moneda(saldo)}</td>
            <td style={{ left: LEFT.porcentaje }} className="sticky z-20 w-[66px] min-w-[66px] border border-r-4 border-slate-700 bg-white px-2 py-2 text-center font-black">{porcentaje(ejecutado, proyectado).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%</td>
            {MESES.map(mes => {
              const ejecutadoMes = valorMes(fila, mes.numero, 'ejecutado')
              const proyectadoMes = editable ? numero(programacionEdicion[String(fila.partida_id)]?.[mes.numero]) : valorMes(fila, mes.numero, 'programado')
              return (
                <td key={mes.numero} className={`border border-slate-500 p-1.5 align-top ${ejecutadoMes > proyectadoMes && proyectadoMes >= 0 ? 'bg-red-50' : ejecutadoMes === proyectadoMes && proyectadoMes > 0 ? 'bg-emerald-50' : 'bg-white'} ${[4, 7, 10].includes(mes.numero) ? 'border-l-2 border-l-slate-700' : ''}`}>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-blue-950">{moneda(proyectadoMes)}</div>
                    <div className="my-1 border-t border-slate-500" />
                    <div className={ejecutadoMes > 0 ? 'text-[10px] font-bold text-emerald-700' : 'text-[10px] font-semibold text-slate-600'}>E: {moneda(ejecutadoMes)}</div>
                  </div>
                </td>
              )
            })}
          </tr>
        )
      })}
    </>
  )
}
