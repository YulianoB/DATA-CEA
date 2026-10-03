// app/admin/consultas/page.jsx

'use client'

import {
  CalendarDays,
  CarFront,
  ClipboardCheck,
  Database,
  Gauge,
  TriangleAlert,
  Wrench,
} from 'lucide-react'

import MenuNavegacion from '@/components/admin/MenuNavegacion'

// ============================================================
// SUBMENU CONSULTAS ADMINISTRATIVAS
// ============================================================

const GRUPOS_CONSULTAS = [
  {
    id: 'consultas-administrativas',
    columnas: 3,
    opciones: [
      {
        id: 'horarios',
        titulo: 'Horarios',
        descripcion: 'Jornadas laborales',
        icono: CalendarDays,
        ruta: '/admin/consultas/horarios',
      },
      {
        id: 'preoperacionales',
        titulo: 'Preoperacionales',
        descripcion: 'Inspecciones y seguimiento',
        icono: ClipboardCheck,
        ruta: '/admin/consultas/preoperacionales',
      },
      {
        id: 'kilometros',
        titulo: 'Kilómetros',
        descripcion: 'Kilometraje de la flota',
        icono: Gauge,
        ruta: '/admin/consultas/kilometros',
      },
      {
        id: 'mantenimientos',
        titulo: 'Mantenimientos',
        descripcion: 'Preventivos y correctivos',
        icono: Wrench,
        ruta: '/admin/consultas/mantenimientos',
      },
      {
        id: 'siniestros',
        titulo: 'Siniestros',
        descripcion: 'Siniestros viales',
        icono: CarFront,
        ruta: '/admin/consultas/siniestros',
      },
      {
        id: 'fallas',
        titulo: 'Fallas',
        descripcion: 'Reportes y seguimiento',
        icono: TriangleAlert,
        ruta: '/admin/consultas/fallas',
      },
    ],
  },
]

export default function ConsultasHomePage() {
  return (
    <MenuNavegacion
      titulo="Consultas Administrativas"
      subtitulo="Seleccione la información que desea consultar"
      iconoTitulo={Database}
      grupos={GRUPOS_CONSULTAS}
      anchoContenido="1050px"
      mostrarRegresar
      rutaRegreso="/admin"
      textoRegreso="Regresar"
      mostrarCerrarSesion
    />
  )
}
