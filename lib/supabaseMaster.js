// lib/supabaseMaster.js
import { createClient } from '@supabase/supabase-js'

export function getMasterSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_MASTER_URL
  const serviceRoleKey = process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan variables de entorno de Supabase Master')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}