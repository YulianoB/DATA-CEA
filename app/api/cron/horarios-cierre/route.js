import { NextResponse } from 'next/server'
import { autorizadoCron, empresasActivas, cerrarPendientes, fechaBogota, horaBogota } from '@/lib/cronHorarios'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request) {
  if (!autorizadoCron(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // Una prueba manual requiere igualmente el CRON_SECRET en Authorization.
  const manual = new URL(request.url).searchParams.get('manual') === '1'
  if (!manual && horaBogota() !== 23) {
    return NextResponse.json({ error: 'Fuera del horario de cierre (23:00 Colombia)' }, { status: 409 })
  }
  const fecha = fechaBogota()
  console.info('Cron horarios-cierre iniciado', { fecha, manual })
  try {
    const resultados = []
    for (const empresa of await empresasActivas()) {
      try {
        const actualizados = await cerrarPendientes(empresa.nit, fecha)
        resultados.push({ nit: empresa.nit, actualizados })
        console.info('Cron horarios-cierre empresa', { nit: empresa.nit, fecha, actualizados })
      } catch (e) {
        console.error('Cron horarios-cierre empresa', empresa.nit, e)
        resultados.push({ nit: empresa.nit, error: true })
      }
    }
    const fallos = resultados.filter(r => r.error).length
    console.info('Cron horarios-cierre finalizado', { fecha, empresas: resultados.length, fallos })
    return NextResponse.json({ fecha, manual, resultados }, { status: fallos ? 500 : 200 })
  } catch (e) {
    console.error('Cron horarios-cierre error general', e)
    return NextResponse.json({ error: 'Error de ejecución' }, { status: 500 })
  }
}
