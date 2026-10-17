import { NextResponse } from 'next/server'
import { contexto, crearToken, hashToken, errorPublico } from '@/lib/formularioPersonalBorradoresServer'
import { ErrorFormularioPersonal } from '@/lib/formularioPersonalPublicoServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 4096) throw new ErrorFormularioPersonal('Solicitud inválida.', 400)
    const body = await request.json()
    const documento = String(body.documento || '').trim()
    const tipo = String(body.tipo_documento || '').trim()
    if (!/^[a-zA-Z0-9-]{4,25}$/.test(documento) || !['CC', 'CE', 'TI', 'PPT', 'PA'].includes(tipo)) {
      throw new ErrorFormularioPersonal('Solicitud inválida.', 400)
    }
    const { enlace, supabaseAdmin } = await contexto(body)
    const { data: existente, error: errorPersonal } = await supabaseAdmin.from('personal').select('id').eq('documento', documento).limit(1)
    if (errorPersonal) throw errorPersonal
    if (existente?.length) throw new ErrorFormularioPersonal('Registro existente.', 409)

    const { data: abierto, error: errorAbierto } = await supabaseAdmin.from('borradores_formulario_personal')
      .select('id').eq('documento', documento).eq('estado', 'borrador').limit(1)
    if (errorAbierto) throw errorAbierto
    if (abierto?.length) throw new ErrorFormularioPersonal('Borrador existente.', 409)

    const token = crearToken()
    const { data, error } = await supabaseAdmin.from('borradores_formulario_personal')
      .insert({ enlace_id: enlace.id, tipo_documento: tipo, documento, token_recuperacion_hash: hashToken(token), paso_actual: 'identificacion', estado: 'borrador' })
      .select('id, ultimo_guardado').single()
    if (error) {
      if (error.code === '23505') throw new ErrorFormularioPersonal('Borrador existente.', 409)
      throw error
    }
    return NextResponse.json({ borrador_id: data.id, clave: token, ultimo_guardado: data.ultimo_guardado }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const r = errorPublico(error)
    return NextResponse.json({ mensaje: r.mensaje }, { status: r.status, headers: { 'Cache-Control': 'no-store' } })
  }
}
