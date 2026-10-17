import { NextResponse } from 'next/server'
import { obtenerSupabaseAdminEmpresaDesdeRequest } from '@/lib/supabaseEmpresaServer'
import { resolverMarcadoresPersonal, PLANTILLA_AUTORIZACION_PERSONAL } from '@/lib/autorizacionPersonalDocumento'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CAMPOS = 'id,version,contenido,vigente,fecha_publicacion,created_at'
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(request) {
  try {
    const { supabaseAdmin, empresa } = await obtenerSupabaseAdminEmpresaDesdeRequest(request)
    const { data, error } = await supabaseAdmin.from('autorizacion_personal_versiones').select(CAMPOS).order('fecha_publicacion', { ascending: false })
    if (error) throw error
    return json({
      ok: true,
      empresa: { nombre: empresa?.nombre || '', nit: empresa?.nit || '' },
      versiones: data || [],
      plantilla: PLANTILLA_AUTORIZACION_PERSONAL,
      vista_previa: resolverMarcadoresPersonal(PLANTILLA_AUTORIZACION_PERSONAL, empresa),
    })
  } catch (error) {
    console.error('Consultar autorización personal:', error)
    return json({ ok: false, mensaje: error?.code === '42P01' ? 'No existe la tabla de versiones en la base de datos conectada a este CEA.' : error?.code === '42501' ? 'La conexión no tiene permisos para consultar las versiones.' : 'No fue posible consultar las versiones. Revise los registros del servidor.', codigo: error?.code || 'ERROR_CONSULTA' }, 500)
  }
}

export async function POST(request) {
  try {
    const { supabaseAdmin } = await obtenerSupabaseAdminEmpresaDesdeRequest(request)
    const body = await request.json()
    const version = typeof body.version === 'string' ? body.version.trim() : ''
    const contenido = typeof body.contenido === 'string' ? body.contenido.trim() : ''
    if (!/^[0-9A-Za-z._-]{1,30}$/.test(version) || contenido.length < 100 || contenido.length > 30000) {
      return json({ ok: false, mensaje: 'Ingrese una versión válida y un documento entre 100 y 30.000 caracteres.' }, 400)
    }
    const { data, error } = await supabaseAdmin.rpc('publicar_autorizacion_personal_version', {
      p_version: version, p_contenido: contenido,
    })
    if (error) {
      if (/ya existe/i.test(error.message || '')) return json({ ok: false, mensaje: 'Esta versión ya fue publicada. Cree una versión diferente.' }, 409)
      throw error
    }
    return json({ ok: true, id: data, mensaje: 'Versión publicada correctamente.' }, 201)
  } catch (error) {
    console.error('Publicar autorización personal:', error)
    return json({ ok: false, mensaje: 'No fue posible publicar la versión. Revise la configuración de la base de datos del CEA.' }, 500)
  }
}
