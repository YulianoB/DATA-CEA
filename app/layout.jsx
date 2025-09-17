// app/layout.jsx (raíz del proyecto)
import './globals.css'

export const metadata = {
  title: 'Mi App',
  description: 'App CEA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        {/* Font Awesome CDN (para usar <i className="fas ...">) */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
