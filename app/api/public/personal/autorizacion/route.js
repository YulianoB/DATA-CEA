import { NextResponse } from 'next/server'
import { resolverMarcadoresPersonal } from '@/lib/autorizacionPersonalDocumento'
import { resolverFormularioPersonal, ErrorFormularioPersonal } from '@/lib/formularioPersonalPublicoServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams
    const { empresa, supabaseAdmin } = await resolverFormularioPersonal(params.get('cea'), params.get('formulario'))
    const { data, error } = await supabaseAdmin.from('autorizacion_personal_versiones')
      .select('version,contenido,fecha_publicacion')
      .eq('vigente', true).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ ok: false, mensaje: 'El CEA todavía no ha publicado la autorización para el personal.' }, { status: 409 })
    return NextResponse.json({ ok: true, cea: empresa.nombre, documento: { ...data, contenido: resolverMarcadoresPersonal(data.contenido, empresa) } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const status = error instanceof ErrorFormularioPersonal ? error.status : 503
    return NextResponse.json({ ok: false, mensaje: 'No fue posible consultar el documento vigente.' }, { status })
  }
}
