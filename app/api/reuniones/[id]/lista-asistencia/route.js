import { NextResponse } from 'next/server'
import { obtenerSupabaseEmpresaDesdeRequest, respuestaErrorEmpresa } from '@/lib/supabaseEmpresaServer'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { supabase } = await obtenerSupabaseEmpresaDesdeRequest(request)
    const { data: reunion, error } = await supabase.from('reuniones').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!reunion) return NextResponse.json({ error: 'Reunión no encontrada.' }, { status: 404 })
    if (reunion.estado !== 'Ejecutada') return NextResponse.json({ error: 'La lista de asistencia solo está disponible para reuniones ejecutadas.' }, { status: 403 })
    const { data: asistencias, error: err } = await supabase.from('asistencias').select('documento_usuario,nombre_usuario,rol_usuario,timestamp_asistencia').eq('id_reunion', id).order('timestamp_asistencia', { ascending: true })
    if (err) throw err
    const documentos = [...new Set((asistencias || []).map(a => String(a.documento_usuario || '').trim()).filter(Boolean))]
    let personal = []
    if (documentos.length) {
      const resultado = await supabase.from('personal').select('documento,telefono,email').in('documento', documentos)
      if (resultado.error) throw resultado.error
      personal = resultado.data || []
    }
    const porDocumento = Object.fromEntries(personal.map(p => [String(p.documento), p]))
    return NextResponse.json({ ok: true, reunion, asistentes: (asistencias || []).map(a => ({ ...a, telefono: porDocumento[String(a.documento_usuario)]?.telefono || '', email: porDocumento[String(a.documento_usuario)]?.email || '' })) })
  } catch (error) {
    const respuesta = respuestaErrorEmpresa(error)
    return NextResponse.json(respuesta.body, { status: respuesta.status })
  }
}
