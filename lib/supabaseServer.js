// lib/supabaseServer.js
import { createClient } from '@supabase/supabase-js'

export function getServerSupabase() {
  // Asegúrate de que SUPABASE_SERVICE_ROLE_KEY NO tenga el prefijo NEXT_PUBLIC_
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
