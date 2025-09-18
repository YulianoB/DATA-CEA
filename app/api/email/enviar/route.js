import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function normalizeRecipients(input) {
  if (!input) return ''
  if (Array.isArray(input)) return input.filter(Boolean).join(',')
  return String(input)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .join(',')
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { para, asunto, html, cc, bcc } = body || {}

    if (!para || !asunto || !html) {
      return NextResponse.json(
        { ok: false, error: 'Faltan campos: para, asunto, html' },
        { status: 400 }
      )
    }

    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT || 465)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const from = process.env.SMTP_FROM || user

    if (!host || !user || !pass) {
      return NextResponse.json(
        { ok: false, error: 'Faltan variables SMTP en el entorno' },
        { status: 500 }
      )
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })

    const to = normalizeRecipients(para)
    const ccNorm = normalizeRecipients(cc)
    const bccNorm = normalizeRecipients(bcc)

    await transporter.sendMail({
      from,
      to,
      ...(ccNorm ? { cc: ccNorm } : {}),
      ...(bccNorm ? { bcc: bccNorm } : {}),
      subject: asunto,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    )
  }
}
