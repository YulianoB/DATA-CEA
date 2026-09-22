// app/api/email/enviar/route.js

import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function normalizeRecipients(input) {
  if (!input) return ''

  const lista = Array.isArray(input)
    ? input
    : String(input).split(',')

  return lista
    .map((email) => String(email || '').trim().toLowerCase())
    .filter(Boolean)
    .join(',')
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validarDestinatarios(input) {
  if (!input) return true

  const lista = String(input)
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)

  return lista.every(emailValido)
}

export async function POST(request) {
  try {
    const body = await request.json()

    const {
      para,
      asunto,
      html,
      cc,
      bcc,
    } = body || {}

    if (!para || !asunto || !html) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Faltan campos: para, asunto, html.',
        },
        { status: 400 }
      )
    }

    const to = normalizeRecipients(para)
    const ccNorm = normalizeRecipients(cc)
    const bccNorm = normalizeRecipients(bcc)

    if (!validarDestinatarios(to)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Uno o más destinatarios no tienen un correo válido.',
        },
        { status: 400 }
      )
    }

    if (ccNorm && !validarDestinatarios(ccNorm)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Uno o más correos CC no son válidos.',
        },
        { status: 400 }
      )
    }

    if (bccNorm && !validarDestinatarios(bccNorm)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Uno o más correos BCC no son válidos.',
        },
        { status: 400 }
      )
    }

    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT || '465')
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const from = process.env.SMTP_FROM || user

    if (!host || !user || !pass) {
      console.error(
        'Configuración SMTP incompleta. Verifique SMTP_HOST, SMTP_USER y SMTP_PASS.'
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'El servicio de correo no está configurado correctamente.',
        },
        { status: 500 }
      )
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    })

    await transporter.sendMail({
      from,
      to,
      ...(ccNorm ? { cc: ccNorm } : {}),
      ...(bccNorm ? { bcc: bccNorm } : {}),
      subject: String(asunto).trim(),
      html,
    })

    return NextResponse.json({
      ok: true,
    })
  } catch (error) {
    console.error(
      'Error POST /api/email/enviar:',
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          'No fue posible enviar el correo.',
      },
      { status: 500 }
    )
  }
}