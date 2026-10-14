// app/layout.jsx
import './globals.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import ToastProvider from '@/components/providers/ToastProvider'

export const metadata = {
  title: 'DATA-CEA',
  description: 'Sistema de registro y control de datos para Centros de Enseñanza Automovilística',
  applicationName: 'DATA-CEA',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'DATA-CEA', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <ToastProvider />
        {children}
      </body>
    </html>
  )
}

