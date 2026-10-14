// app/api/email/enviar/route.js
import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getMasterSupabase } from '@/lib/supabaseMaster'

export const dynamic = 'force-dynamic'

const COOKIE_NAME = process.env.COOKIE_NAME || 'cea_session'
const CAMPOS = Object.freeze({
  fallas: 'correos_mantenimiento',
  mantenimiento: 'correos_mantenimiento',
  preoperacional: 'correos_preoperacional',
  siniestros: 'correos_siniestros',
  vencimientos: 'correos_vencimientos',
  notificacion: 'correos_notificacion',
})

function respuestaError(error, status) {
  return NextResponse.json({ ok: false, error }, { status })
}

function destinatariosValidos(valor) {
  const correos = String(valor || '')
    .split(/[;,\n]+/)
    .map((correo) => correo.trim().toLowerCase())
    .filter(Boolean)
  const unicos = [...new Set(correos)]
  if (unicos.some((correo) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))) {
    return null
  }
  return unicos
}

async function obtenerSesion(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const secret = process.env.AUTH_SECRET
  if (!token || !secret) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return payload
  } catch {
    return null
  }
}

export async function POST(request) {
  return NextResponse.json({ ok: false, error: 'Esta operación no está disponible.' }, { status: 403 })
  try {
    const sesion = await obtenerSesion(request)
    if (!sesion?.nitEmpresa) {
      return respuestaError('Sesión no válida o expirada.', 401)
    }

    const body = await request.json()
    const { tipo, asunto, html } = body || {}
    const campo = Object.prototype.hasOwnProperty.call(CAMPOS, tipo)
      ? CAMPOS[tipo]
      : null

    if (!campo) {
      return respuestaError('Tipo de notificación no permitido.', 400)
    }
    if (typeof asunto !== 'string' || !asunto.trim() ||
        typeof html !== 'string' || !html.trim()) {
      return respuestaError('Faltan campos: asunto y html.', 400)
    }
    if (asunto.length > 250 || html.length > 100000) {
      return respuestaError('El contenido del correo supera el límite permitido.', 400)
    }

    const master = getMasterSupabase()
    const { data: empresa, error } = await master
      .from('empresas')
      .select(`nit, estado, ${campo}`)
      .eq('nit', String(sesion.nitEmpresa))
      .eq('estado', 'activo')
      .maybeSingle()

    if (error) throw error
    if (!empresa) return respuestaError('CEA no encontrado o inactivo.', 403)

    const destinatarios = destinatariosValidos(empresa[campo])
    if (!destinatarios || destinatarios.length === 0) {
      return respuestaError('El CEA no tiene destinatarios corporativos válidos para esta notificación.', 422)
    }

    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT || '465')
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const from = process.env.SMTP_FROM || user

    if (!host || !user || !pass || !Number.isInteger(port) || port <= 0) {
      console.error('Configuración SMTP incompleta.')
      return respuestaError('El servicio de correo no está configurado correctamente.', 500)
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })

    await transporter.sendMail({
      from,
      to: destinatarios.join(','),
      subject: asunto.trim(),
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error POST /api/email/enviar:', error)
    return respuestaError('No fue posible enviar el correo corporativo.', 500)
  }
}
