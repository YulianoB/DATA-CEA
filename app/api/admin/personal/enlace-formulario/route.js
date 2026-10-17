import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { obtenerSupabaseAdminEmpresaPorNit } from '@/lib/supabaseEmpresaServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const cookie = request.cookies.get(process.env.COOKIE_NAME || 'cea_session')?.value
    if (!cookie || !process.env.AUTH_SECRET) return NextResponse.json({ mensaje: 'No autorizado.' }, { status: 401 })
    const { payload } = await jwtVerify(cookie, new TextEncoder().encode(process.env.AUTH_SECRET), { algorithms: ['HS256'] })
    if (!['ADMINISTRATIVO', 'AUXILIAR_ADMINISTRATIVO'].includes(payload.rolOriginal)) return NextResponse.json({ mensaje: 'No autorizado.' }, { status: 403 })
    const { empresa, supabaseAdmin } = await obtenerSupabaseAdminEmpresaPorNit(payload.nitEmpresa)
    const { data: existentes, error } = await supabaseAdmin.from('enlaces_formulario_personal').select('codigo').eq('activo', true).order('fecha_creacion', { ascending: true }).limit(1)
    if (error) throw error
    let codigo = existentes?.[0]?.codigo
    if (!codigo) {
      const { data, error: errorCrear } = await supabaseAdmin.from('enlaces_formulario_personal')
        .insert({ nombre_formulario: 'Información del personal', creado_por_nombre: String(payload.nombreCompleto || 'Administrador') })
        .select('codigo').single()
      if (errorCrear) throw errorCrear
      codigo = data.codigo
    }
    return NextResponse.json({ url: '/vinculacion-personal/' + encodeURIComponent(empresa.codigo) + '/' + codigo }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error enlace personal:', error)
    return NextResponse.json({ mensaje: 'No fue posible obtener el enlace.' }, { status: 500 })
  }
}
