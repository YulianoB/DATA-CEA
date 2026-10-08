// app/api/personal/[id]/fotografia/route.js
// Fotografia permanente del personal. Reutiliza el bucket privado "empresa".
import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import {
  obtenerSupabaseAdminEmpresaPorNit,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

export const runtime = 'nodejs'

const BUCKET = 'empresa'
const MAX_BYTES = 3 * 1024 * 1024
const MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const COOKIE_NAME = process.env.COOKIE_NAME || 'cea_session'

function responder(message, status = 400) {
  return NextResponse.json({ status: 'failed', message }, { status })
}

async function autorizar(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token || !process.env.AUTH_SECRET) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET))
    if (String(payload.rol || '').toUpperCase() !== 'ADMINISTRATIVO') return null
    const nit = String(payload.nitEmpresa || '').trim()
    return nit ? { nit } : null
  } catch {
    return null
  }
}

async function contexto(request, params) {
  const sesion = await autorizar(request)
  if (!sesion) return { error: responder('Sesión vencida o acceso no autorizado.', 401) }

  const nitSolicitado = new URL(request.url).searchParams.get('nit')
  if (nitSolicitado && String(nitSolicitado).trim() !== sesion.nit) {
    return { error: responder('La empresa solicitada no corresponde a la sesión.', 403) }
  }

  const { id } = await params
  if (!/^\d+$/.test(String(id)) || Number(id) < 1) {
    return { error: responder('Identificador de trabajador no válido.') }
  }
  const { supabaseAdmin } = await obtenerSupabaseAdminEmpresaPorNit(sesion.nit)
  const { data: personal, error } = await supabaseAdmin
    .from('personal').select('id, foto_url').eq('id', id).maybeSingle()
  if (error) throw error
  if (!personal) return { error: responder('Trabajador no encontrado.', 404) }
  return { supabaseAdmin, personal }
}

function rutaFoto(id) {
  return `personal/fotografias/trabajador-${id}.png`
}

async function firmar(supabaseAdmin, ruta) {
  if (!ruta) return null
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(ruta, 3600)
  if (error) throw error
  return data.signedUrl
}

function errorServidor(error) {
  const respuesta = respuestaErrorEmpresa(error)
  console.error('Error en fotografía de personal:', error)
  return NextResponse.json(respuesta.body, { status: respuesta.status })
}

export async function GET(request, { params }) {
  try {
    const ctx = await contexto(request, params)
    if (ctx.error) return ctx.error
    const fotoUrl = await firmar(ctx.supabaseAdmin, ctx.personal.foto_url)
    return NextResponse.json({ status: 'success', foto_url: ctx.personal.foto_url, foto_signed_url: fotoUrl })
  } catch (error) {
    return errorServidor(error)
  }
}

export async function POST(request, { params }) {
  try {
    const ctx = await contexto(request, params)
    if (ctx.error) return ctx.error
    const form = await request.formData()
    const archivo = form.get('foto')
    if (!(archivo instanceof File)) return responder('Seleccione una fotografía.')
    if (!MIME.has(archivo.type)) return responder('Solo se permiten fotografías JPG, PNG o WebP.')
    if (!archivo.size || archivo.size > MAX_BYTES) return responder('La fotografía debe pesar entre 1 byte y 3 MB.')

    // La interfaz existente produce un PNG circular de 480 x 480.
    // Conservamos el formato recibido; nunca declaramos PNG para un JPEG/WebP.
    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[archivo.type]
    const ruta = `personal/fotografias/trabajador-${ctx.personal.id}.${extension}`
    const anterior = ctx.personal.foto_url
    const { error: uploadError } = await ctx.supabaseAdmin.storage.from(BUCKET)
      .upload(ruta, await archivo.arrayBuffer(), {
        contentType: archivo.type,
        upsert: true,
        cacheControl: '60',
      })
    if (uploadError) throw uploadError

    const { error: updateError } = await ctx.supabaseAdmin.from('personal')
      .update({ foto_url: ruta }).eq('id', ctx.personal.id)
    if (updateError) {
      // No eliminar una ruta que ya estaba asociada al trabajador.
      if (ruta !== anterior) await ctx.supabaseAdmin.storage.from(BUCKET).remove([ruta])
      throw updateError
    }
    if (anterior && anterior !== ruta && anterior.startsWith('personal/fotografias/')) {
      const { error: removeError } = await ctx.supabaseAdmin.storage.from(BUCKET).remove([anterior])
      if (removeError) console.error('No se pudo retirar fotografía anterior:', removeError)
    }
    const fotoUrl = await firmar(ctx.supabaseAdmin, ruta)
    return NextResponse.json({ status: 'success', message: 'Fotografía guardada.', foto_url: ruta, foto_signed_url: fotoUrl })
  } catch (error) {
    return errorServidor(error)
  }
}

export async function DELETE(request, { params }) {
  try {
    const ctx = await contexto(request, params)
    if (ctx.error) return ctx.error
    const anterior = ctx.personal.foto_url
    if (!anterior) return NextResponse.json({ status: 'success', message: 'El trabajador no tiene fotografía.' })
    if (!anterior.startsWith('personal/fotografias/')) {
      return responder('La ruta de fotografía existente requiere revisión antes de eliminarse.', 409)
    }
    const { error: removeError } = await ctx.supabaseAdmin.storage.from(BUCKET).remove([anterior])
    if (removeError) throw removeError
    const { error: updateError } = await ctx.supabaseAdmin.from('personal')
      .update({ foto_url: null }).eq('id', ctx.personal.id)
    if (updateError) throw updateError
    return NextResponse.json({ status: 'success', message: 'Fotografía eliminada.' })
  } catch (error) {
    return errorServidor(error)
  }
}
