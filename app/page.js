'use client'

export default function TestPage() {
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log("Anon key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  return (
    <div className="p-6">
      <h1>Test Variables de Entorno</h1>
      <p>Revisa la consola del navegador (F12 → Console).</p>
    </div>
  )
}

