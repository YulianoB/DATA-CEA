// app/admin/page.js

'use client'

import {
  BookOpen,
  CalendarDays,
  Car,
  ChartNoAxesCombined,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  IdCard,
  Monitor,
  Receipt,
  Settings,
  Users,
  UserRoundCog,
  Wrench,
} from 'lucide-react'

import MenuNavegacion from '@/components/admin/MenuNavegacion'

// ============================================================
// MENU ADMINISTRATIVO
// Las rutas se conservan respecto al menu anterior.
// La organizacion por grupos es exclusivamente de navegacion visual.
// ============================================================

const GRUPOS_MENU = [
  {
    id: 'menu-administrativo',
    columnas: 5,
    opciones: [
      { id: 'matriculas', titulo: 'Matrículas y Consultas', icono: GraduationCap, ruta: '/admin/inscripciones' },
      { id: 'caja', titulo: 'Caja', icono: Receipt, ruta: '/admin/caja' },
      { id: 'programacion', titulo: 'Programación', icono: CalendarDays, ruta: '/admin/programacion' },
      { id: 'sicov', titulo: 'Control SICOV', icono: Monitor, ruta: '/admin/sicov' },
      { id: 'runt', titulo: 'Control RUNT', icono: IdCard, ruta: '/admin/runt' },
      { id: 'siet', titulo: 'Control SIET', icono: FileSpreadsheet, ruta: '/admin/siet' },
      { id: 'personal', titulo: 'Personal CEA', icono: Users, ruta: '/admin/personal' },
      { id: 'vehiculos', titulo: 'Vehículos CEA', icono: Car, ruta: '/admin/vehiculos' },
      { id: 'consultas', titulo: 'Consultas y Seguimiento Operativo', icono: ChartNoAxesCombined, ruta: '/admin/consultas' },
      { id: 'configuracion-academica', titulo: 'Configuración Académica', icono: BookOpen, ruta: '/admin/configuracion-academica' },
      { id: 'reuniones', titulo: 'Reuniones CEA', icono: UserRoundCog, ruta: '/admin/reuniones' },
      { id: 'documentos', titulo: 'Configuración de Documentos', icono: FileText, ruta: '/admin/configuracion-documentos' },
      { id: 'pesv', titulo: 'PESV', icono: ChartNoAxesCombined, ruta: '/admin/pesv' },
      { id: 'sinst-vigia', titulo: 'Reporte SINST - VIGIA 2', icono: FileText, ruta: '/admin/sinst-vigia' },
      { id: 'mantenimientos', titulo: 'Plan de Mantenimiento Vehicular', icono: Wrench, ruta: '/admin/mantenimientos' },
    ],
  },
]

export default function AdminPage() {
  return (
    <MenuNavegacion
      titulo="Menú Administrativo"
      subtitulo="Gestión integral y operación del Centro de Enseñanza Automovilística"
      grupos={GRUPOS_MENU}
      mostrarRegresar={false}
      mostrarCerrarSesion
    />
  )
}
