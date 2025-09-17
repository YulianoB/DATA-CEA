import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Cliente Supabase con la service role key (⚠️ SOLO servidor)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Función utilitaria: hash SHA-256
function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password, 'utf8')
    .digest('hex')
}

export async function POST(req) {
  try {
    const { usuario, password } = await req.json()

    if (!usuario || !password) {
      return NextResponse.json(
        { status: 'failed', message: 'Usuario y contraseña requeridos.' },
        { status: 400 }
      )
    }

    // Hashear la contraseña ingresada
    const hashedPassword = hashPassword(password)

    // Buscar usuario en la tabla
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, usuario, contrasena, nombre_completo, rol, estado, documento')
      .eq('usuario', usuario)
      .limit(1)

    if (error) {
      console.error('Error consultando Supabase:', error)
      return NextResponse.json(
        { status: 'failed', message: 'Error al consultar la base de datos.' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { status: 'failed', message: 'Usuario no encontrado.' },
        { status: 401 }
      )
    }

    const user = data[0]

    // Comparar hash
    if (user.contrasena !== hashedPassword) {
      return NextResponse.json(
        { status: 'failed', message: 'Contraseña incorrecta.' },
        { status: 401 }
      )
    }

    // Verificar estado activo
    if (String(user.estado || '').toUpperCase() !== 'ACTIVO') {
      return NextResponse.json(
        { status: 'failed', message: `Cuenta no activa. Estado: ${user.estado}` },
        { status: 403 }
      )
    }

    // Login exitoso
    return NextResponse.json({
      status: 'success',
      usuario: user.usuario,
      nombreCompleto: user.nombre_completo,
      documento: user.documento || '',
      rol: user.rol
    })
  } catch (err) {
    console.error('Error en API /login:', err)
    return NextResponse.json(
      { status: 'failed', message: 'Error interno en el servidor.' },
      { status: 500 }
    )
  }
}
