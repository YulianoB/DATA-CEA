import { NextResponse } from 'next/server'
import { resolverFormularioPersonal } from '@/lib/formularioPersonalPublicoServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    const documento = String(body.documento || '').trim()
    if (!/^[a-zA-Z0-9-]{4,25}$/.test(documento)) return NextResponse.json({ mensaje: 'Número de documento inválido.' }, { status: 400 })
    const { supabaseAdmin } = await resolverFormularioPersonal(body.cea, body.formulario)
    const { data, error } = await supabaseAdmin.from('personal').select('id').eq('documento', documento).limit(1)
    if (error) throw error
    return NextResponse.json({ existe: Boolean(data?.length) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ mensaje: 'No fue posible validar el documento.' }, { status: 503 })
  }
}
