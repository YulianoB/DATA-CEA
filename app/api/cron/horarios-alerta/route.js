import { NextResponse } from 'next/server'
import { autorizadoCron, empresasActivas, notificarPendientes, fechaBogota, horaBogota, fechaAnteriorBogota } from '@/lib/cronHorarios'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request) {
  if (!autorizadoCron(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // Una prueba manual requiere igualmente el CRON_SECRET en Authorization.
  const manual = new URL(request.url).searchParams.get('manual') === '1'
  if (!manual && horaBogota() !== 9) {
    return NextResponse.json({ error: 'Fuera del horario de alerta (09:00 Colombia)' }, { status: 409 })
  }
  const fecha = fechaBogota()
  const fechaReporte = fechaAnteriorBogota(fecha)
  console.info('Cron horarios-alerta iniciado', { fecha, fechaReporte, manual })
  try {
    const resultados = []
    for (const empresa of await empresasActivas()) {
      try {
        const resultado = await notificarPendientes(empresa.nit, fecha)
        resultados.push({ nit: empresa.nit, ...resultado })
        console.info('Cron horarios-alerta empresa', { nit: empresa.nit, ...resultado })
      } catch (e) {
        console.error('Cron horarios-alerta empresa', empresa.nit, e)
        resultados.push({ nit: empresa.nit, error: true })
      }
    }
    const fallos = resultados.filter(r => r.error).length
    console.info('Cron horarios-alerta finalizado', { fechaReporte, empresas: resultados.length, fallos })
    return NextResponse.json({ fecha, fechaReporte, manual, resultados }, { status: fallos ? 500 : 200 })
  } catch (e) {
    console.error('Cron horarios-alerta error general', e)
    return NextResponse.json({ error: 'Error de ejecución' }, { status: 500 })
  }
}
