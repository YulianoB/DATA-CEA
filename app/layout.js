import './globals.css'
import Link from 'next/link'   // 👈 Asegúrate de tener esta línea
import '@fortawesome/fontawesome-free/css/all.min.css'

export const metadata = {
  title: 'Mi Proyecto',
  description: 'App con Next.js',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <nav className="p-4 bg-gray-200">
          <ul className="flex gap-6">
            <li><Link href="/">Home</Link></li>
          </ul>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  )
}
