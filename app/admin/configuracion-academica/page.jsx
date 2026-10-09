// app/admin/configuracion-academica/page.jsx
'use client'

import MenuNavegacion from '@/components/admin/MenuNavegacion'
import { GraduationCap, CalendarDays, BookOpen } from 'lucide-react'

const grupos = [
  {
    id: 'gestion-academica',
    titulo: 'Gestión académica',
    columnas: 2,
    opciones: [
      {
        id: 'horarios',
        titulo: 'Horario Teórico',
        descripcion: 'Crear, organizar y publicar horarios de clases teóricas y talleres.',
        icono: CalendarDays,
        ruta: '/admin/configuracion-academica/horarios',
      },
      {
        id: 'clases',
        titulo: 'Configuración de Clases y Contenidos',
        descripcion: 'Configurar contenidos, duración y categorías.',
        icono: BookOpen,
        ruta: '/admin/configuracion-academica/clases',
      },
    ],
  },
]

export default function ConfiguracionAcademicaPage() {
  return (
    <MenuNavegacion
      titulo="Configuración Académica"
      subtitulo="Organización de planes de formación y horarios académicos del CEA."
      iconoTitulo={GraduationCap}
      grupos={grupos}
      mostrarRegresar
      rutaRegreso="/admin"
      textoRegreso="Menú Administrativo"
      mostrarCerrarSesion
      contenedorTarjetas
    />
  )
}
