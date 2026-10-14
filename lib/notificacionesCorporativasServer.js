// Notificaciones generadas exclusivamente desde operaciones verificadas del servidor.
import nodemailer from 'nodemailer'
import { jwtVerify } from 'jose'
import { getMasterSupabase } from '@/lib/supabaseMaster'

const COOKIE_NAME = process.env.COOKIE_NAME || 'cea_session'
const DESTINATARIOS = Object.freeze({
  fallas: 'correos_mantenimiento',
  preoperacional: 'correos_preoperacional',
})

export async function validarSesionOperativa(request, nit) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const secret = process.env.AUTH_SECRET
  if (!token || !secret) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] })
    const rol = String(payload.rol || '').toUpperCase()
    if (!['INSTRUCTOR PRÁCTICA', 'ADMINISTRATIVO'].includes(rol)) return null
    if (!nit || String(payload.nitEmpresa).trim() !== String(nit).trim()) return null
    return payload
  } catch { return null }
}

const escapar = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c])
const item = (etiqueta, valor) => `<li><strong>${escapar(etiqueta)}:</strong> ${escapar(valor)}</li>`

function destinatariosValidos(valor) {
  const lista = [...new Set(String(valor || '').split(/[;,\\n]+/).map(v => v.trim().toLowerCase()).filter(Boolean))]
  return lista.length && lista.every(v => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)) ? lista : []
}

export async function notificarRegistroCorporativo({ nit, tipo, registro }) {
  const campo = DESTINATARIOS[tipo]
  if (!campo || !registro?.id || !nit) return false
  if (tipo === 'preoperacional' && !String(registro.observaciones || '').trim()) return false

  const master = getMasterSupabase()
  const { data: empresa, error } = await master.from('empresas')
    .select(`nit, estado, ${campo}`)
    .eq('nit', String(nit)).eq('estado', 'activo').maybeSingle()
  if (error) throw error
  if (!empresa) return false
  const to = destinatariosValidos(empresa[campo])
  if (!to.length) return false

  let subject, html
  if (tipo === 'fallas') {
    subject = `🚧 Nueva falla reportada (${registro.consecutivo}) - ${registro.placa}`
    html = '<p><strong>Se registró un reporte de falla en misión.</strong></p><ul>' + [
      item('Consecutivo', registro.consecutivo), item('Fecha', registro.fecha),
      item('Hora', registro.hora), item('Placa', registro.placa),
      item('Tipo', registro.tipo_vehiculo), item('Marca', registro.marca),
      item('Kilometraje', registro.kilometraje), item('Encargado', registro.nombre_encargado),
      item('Descripción', registro.descripcion_falla), item('Acciones', registro.acciones_tomadas),
      item('Estado', registro.estado),
    ].join('') + '</ul><p><em>Correo automático del sistema.</em></p>'
  } else {
    subject = `🚨 Observación en inspección preoperacional: ${registro.placa} (${registro.consecutivo})`
    html = '<p><strong>Se ha registrado una inspección con observaciones para seguimiento.</strong></p><ul>' + [
      item('Consecutivo', registro.consecutivo), item('Placa', registro.placa),
      item('Tipo de vehículo', registro.tipo_vehiculo), item('Marca', registro.marca),
      item('Usuario responsable', registro.usuario_encargado),
      item('Fecha', `${registro.fecha_registro || ''} ${registro.hora_registro || ''}`),
      item('Kilometraje', registro.km_registro),
    ].join('') + '</ul><p><strong>Observaciones:</strong></p><p>' + escapar(registro.observaciones).replace(/\\r?\\n/g, '<br>') + '</p><p><em>Correo automático generado por el sistema.</em></p>'
  }

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || '465')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Configuración SMTP incompleta')
  }
  const transporter = nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user, pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  })
  await transporter.sendMail({ from: process.env.SMTP_FROM || user, to, subject, html })
  return true
}
