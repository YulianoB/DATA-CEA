// Referencia operativa: lecturas recientes ordenadas por fecha, no el máximo histórico.
// Los datos históricos se conservan intactos. Configuración centralizada.
export const KM_VENTANA_DIAS = 90
export const KM_LECTURAS_RECIENTES = 10
export const KM_SALTO_ADVERTENCIA = 300

const FUENTES = [
  { tabla: 'preoperacionales', campo: 'km_registro', fecha: 'fecha_registro' },
  { tabla: 'horarios', campo: 'km_inicial', fecha: 'fecha_entrada' },
  { tabla: 'horarios', campo: 'km_final', fecha: 'fecha_salida' },
  { tabla: 'mantenimientos', campo: 'kilometraje', fecha: 'fecha_registro' },
  { tabla: 'reporte_fallas', campo: 'kilometraje', fecha: 'fecha' },
]

export async function referenciaKilometraje(supabase, placa, fechaReferencia = null) {
  const fecha = fechaReferencia || new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha + 'T12:00:00Z'))) {
    throw new Error('Fecha de referencia no válida.')
  }
  const inicio = new Date(Date.parse(fecha + 'T12:00:00Z') - KM_VENTANA_DIAS * 86400000)
    .toISOString().slice(0, 10)
  const lecturas = []
  for (const f of FUENTES) {
    const { data, error } = await supabase.from(f.tabla)
      .select(`id,${f.campo},${f.fecha}`)
      .eq('placa', String(placa).trim().toUpperCase())
      .not(f.campo, 'is', null)
      .gte(f.fecha, inicio)
      .lte(f.fecha, fecha)
      .order(f.fecha, { ascending: false })
      .order('id', { ascending: false })
      .limit(KM_LECTURAS_RECIENTES)
    if (error) throw new Error(`No fue posible consultar ${f.tabla}: ${error.message}`)
    for (const fila of data || []) {
      const km = Number(fila[f.campo])
      if (Number.isFinite(km) && km >= 0) {
        lecturas.push({ km, fecha: fila[f.fecha], id: fila.id, fuente: f.tabla, campo: f.campo })
      }
    }
  }
  lecturas.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id)
  const recientes = lecturas.slice(0, KM_LECTURAS_RECIENTES)
  if (!recientes.length) return { maxKm: 0, fuente: null, campo: null, fecha: null, sinReferencia: true }
  // Una lectura aislada muy distinta del grupo no se convierte en referencia obligatoria.
  const ordenados = recientes.map(x => x.km).sort((a, b) => a - b)
  const mediana = ordenados[Math.floor(ordenados.length / 2)]
  const tolerancia = Math.max(1000, mediana * 0.2)
  const coherentes = recientes.filter(x => Math.abs(x.km - mediana) <= tolerancia)
  const elegida = coherentes[0] || recientes[0]
  return { maxKm: elegida.km, fuente: elegida.fuente, campo: elegida.campo, fecha: elegida.fecha,
    sinReferencia: false, lecturasAnalizadas: recientes.length,
    anomaliasDescartadas: recientes.length - coherentes.length }
}

export function evaluarKilometraje(km, referencia, { retrospectivo = false } = {}) {
  const maxKm = referencia.maxKm
  const diferencia = km - maxKm
  const base = { ...referencia, diferencia }
  if (referencia.sinReferencia) return {
    ...base, estado: 'advertencia',
    mensaje: 'No se encontraron lecturas en los últimos 90 días para comparar. Confirme el kilometraje antes de guardar.',
  }
  if (diferencia < 0) return {
    ...base, estado: retrospectivo ? 'advertencia' : 'error',
    mensaje: retrospectivo
      ? `El kilometraje de ejecución (${km}) es menor que la referencia (${maxKm}). Confirme que corresponde a la fecha del mantenimiento.`
      : `El kilometraje ingresado (${km}) es menor a la referencia reciente (${maxKm}) en ${referencia.fuente}.`,
  }
  if (diferencia > KM_SALTO_ADVERTENCIA) return {
    ...base, estado: 'advertencia',
    mensaje: `La diferencia de kilometraje (${diferencia} km) supera 300 km respecto a la referencia reciente (${maxKm}).`,
  }
  return { ...base, estado: 'ok', mensaje: 'Kilometraje válido.' }
}
