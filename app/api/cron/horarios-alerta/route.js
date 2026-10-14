import { NextResponse } from 'next/server'
import { autorizadoCron, empresasActivas, notificarPendientes, fechaBogota, horaBogota } from '@/lib/cronHorarios'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300
export async function GET(request) {
  if (!autorizadoCron(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (horaBogota() !== 9) return NextResponse.json({ error: 'Fuera del horario de alerta (09:00 Colombia)' }, { status: 409 })
  const fecha = fechaBogota()
  try {
    const resultados = []
    for (const empresa of await empresasActivas()) {
      try { resultados.push({ nit: empresa.nit, ...(await notificarPendientes(empresa.nit, fecha)) }) }
      catch (e) { console.error('Cron alerta empresa', empresa.nit, e); resultados.push({ nit: empresa.nit, error: true }) }
    }
    return NextResponse.json({ fecha, resultados }, { status: resultados.some(r => r.error) ? 500 : 200 })
  } catch (e) { console.error('Cron alerta', e); return NextResponse.json({ error: 'Error de ejecución' }, { status: 500 }) }
}
