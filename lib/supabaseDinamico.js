// lib/supabaseDinamico.js
import { createClient } from '@supabase/supabase-js'

export function crearClienteEmpresa(empresa) {
  if (!empresa?.supabase_url) {
    throw new Error('La empresa no tiene supabase_url configurado')
  }

  if (!empresa?.supabase_anon_key) {
    throw new Error('La empresa no tiene supabase_anon_key configurado')
  }

  return createClient(
    empresa.supabase_url,
    empresa.supabase_anon_key
  )
}