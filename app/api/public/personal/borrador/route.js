import { NextResponse } from 'next/server'
import { contexto, verificarToken, errorPublico } from '@/lib/formularioPersonalBorradoresServer'
import { ErrorFormularioPersonal } from '@/lib/formularioPersonalPublicoServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }

async function obtener(body) {
  const { supabaseAdmin, enlace } = await contexto(body)
  const id = Number(body.borrador_id)
  if (!Number.isSafeInteger(id) || id < 1) throw new ErrorFormularioPersonal('Solicitud inválida.', 400)
  const { data, error } = await supabaseAdmin.from('borradores_formulario_personal')
    .select('id, enlace_id, estado, datos, paso_actual, token_recuperacion_hash, ultimo_guardado, fecha_expiracion')
    .eq('id', id).eq('enlace_id', enlace.id).maybeSingle()
  if (error) throw error
  if (!data || data.estado !== 'borrador' || (data.fecha_expiracion && Date.parse(data.fecha_expiracion) < Date.now()) || !verificarToken(body.clave, data.token_recuperacion_hash)) {
    throw new ErrorFormularioPersonal('No autorizado.', 401)
  }
  return { supabaseAdmin, data }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { data } = await obtener(body)
    return NextResponse.json({ datos: data.datos, paso_actual: data.paso_actual, ultimo_guardado: data.ultimo_guardado }, { headers })
  } catch (error) {
    const r = errorPublico(error)
    return NextResponse.json({ mensaje: r.mensaje }, { status: r.status, headers })
  }
}

export async function PATCH(request) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 32000) throw new ErrorFormularioPersonal('Solicitud inválida.', 400)
    const body = await request.json()
    const { supabaseAdmin, data } = await obtener(body)
    const respuestas = body.datos
    if (!respuestas || typeof respuestas !== 'object' || Array.isArray(respuestas) || JSON.stringify(respuestas).length > 24000) {
      throw new ErrorFormularioPersonal('Solicitud inválida.', 400)
    }
    const paso = String(body.paso_actual || 'identificacion').slice(0,80)
    const { data: guardado, error } = await supabaseAdmin.from('borradores_formulario_personal')
      .update({ datos: respuestas, paso_actual: paso, ultimo_guardado: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', data.id).eq('estado', 'borrador').select('ultimo_guardado').maybeSingle()
    if (error) throw error
    if (!guardado) throw new ErrorFormularioPersonal('No autorizado.', 401)
    return NextResponse.json({ ultimo_guardado: guardado.ultimo_guardado }, { headers })
  } catch (error) {
    const r = errorPublico(error)
    return NextResponse.json({ mensaje: r.mensaje }, { status: r.status, headers })
  }
}
