import { NextResponse } from 'next/server'
import { ErrorFormularioPersonal, resolverFormularioPersonal } from '@/lib/formularioPersonalPublicoServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Información pública mínima para inicializar el formulario.
 * No revela NIT, credenciales, trabajadores ni borradores.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const codigoCea = searchParams.get('cea')
    const codigoFormulario = searchParams.get('formulario')
    const { empresa, enlace } = await resolverFormularioPersonal(codigoCea, codigoFormulario)

    return NextResponse.json(
      { disponible: true, cea: empresa.nombre, titulo: enlace.nombre_formulario },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const status = error instanceof ErrorFormularioPersonal ? error.status : 503
    return NextResponse.json(
      { disponible: false, mensaje: status === 404 ? 'Enlace no disponible.' : 'No fue posible verificar el formulario.' },
      { status, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
