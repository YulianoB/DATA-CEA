import { getMasterSupabase } from '@/lib/supabaseMaster'
import { obtenerSupabaseAdminEmpresaPorNit } from '@/lib/supabaseEmpresaServer'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class ErrorFormularioPersonal extends Error {
  constructor(message, status = 404) {
    super(message)
    this.status = status
  }
}

/**
 * Resuelve un enlace público sin aceptar un NIT ni una URL de Supabase
 * elegidos por el solicitante. Las credenciales nunca salen del servidor.
 */
export async function resolverFormularioPersonal(codigoCea, codigoFormulario) {
  if (
    typeof codigoCea !== 'string' ||
    codigoCea.length > 100 ||
    !/^[a-zA-Z0-9_-]+$/.test(codigoCea) ||
    typeof codigoFormulario !== 'string' ||
    !UUID_RE.test(codigoFormulario)
  ) {
    throw new ErrorFormularioPersonal('Enlace no disponible.')
  }

  const master = getMasterSupabase()
  const { data: empresa, error: errorEmpresa } = await master
    .from('empresas')
    .select('id, nit, codigo, nombre, estado')
    .eq('codigo', codigoCea)
    .eq('estado', 'activo')
    .maybeSingle()

  if (errorEmpresa) throw new ErrorFormularioPersonal('No fue posible verificar el enlace.', 503)
  if (!empresa) throw new ErrorFormularioPersonal('Enlace no disponible.')

  const { supabaseAdmin } = await obtenerSupabaseAdminEmpresaPorNit(empresa.nit)
  const { data: enlace, error: errorEnlace } = await supabaseAdmin
    .from('enlaces_formulario_personal')
    .select('id, codigo, nombre_formulario, activo')
    .eq('codigo', codigoFormulario)
    .eq('activo', true)
    .maybeSingle()

  if (errorEnlace) throw new ErrorFormularioPersonal('No fue posible verificar el formulario.', 503)
  if (!enlace) throw new ErrorFormularioPersonal('Enlace no disponible.')

  return { empresa, enlace, supabaseAdmin }
}
