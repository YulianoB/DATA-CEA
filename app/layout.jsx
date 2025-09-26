// app/layout.jsx
import './globals.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import ToastProvider from '@/components/providers/ToastProvider'

export const metadata = {
  title: 'Mi App',
  description: 'App CEA',
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

