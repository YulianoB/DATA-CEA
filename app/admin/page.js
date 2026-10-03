// app/admin/page.js

'use client'

import {
  BookOpen,
  CalendarDays,
  Car,
  ClipboardCheck,
  FileCog,
  FileSpreadsheet,
  Gauge,
  GraduationCap,
  Landmark,
  MonitorCheck,
  ReceiptText,
  Route,
  Settings,
  Users,
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
    id: 'operacion-academica',
    titulo: 'Operación académica',
    columnas: 4,
    opciones: [
      {
        id: 'matriculas',
        titulo: 'Matrículas y Consultas',
        descripcion: 'Registro, consulta y gestión de aprendices.',
        icono: GraduationCap,
        ruta: '/admin/inscripciones',
      },
      {
        id: 'programacion',
        titulo: 'Programación',
        descripcion: 'Planeación y programación de actividades académicas.',
        icono: CalendarDays,
        ruta: '/admin/programacion',
      },
      {
        id: 'sicov',
        titulo: 'Control SICOV',
        descripcion: 'Seguimiento de la información registrada en SICOV.',
        icono: MonitorCheck,
        ruta: '/admin/sicov',
      },
      {
        id: 'runt',
        titulo: 'Control RUNT',
        descripcion: 'Control y seguimiento de registros RUNT.',
        icono: ClipboardCheck,
        ruta: '/admin/runt',
      },
      {
        id: 'siet',
        titulo: 'Control SIET',
        descripcion: 'Control y seguimiento de información SIET.',
        icono: FileSpreadsheet,
        ruta: '/admin/siet',
      },
      {
        id: 'configuracion-academica',
        titulo: 'Configuración Académica',
        descripcion: 'Parámetros de clases, horarios y operación académica.',
        icono: BookOpen,
        ruta: '/admin/configuracion-academica',
      },
    ],
  },
  {
    id: 'gestion-cea',
    titulo: 'Gestión del CEA',
    columnas: 4,
    opciones: [
      {
        id: 'caja',
        titulo: 'Caja',
        descripcion: 'Ingresos, egresos, convenios y cierre de caja.',
        icono: Landmark,
        ruta: '/admin/caja',
      },
      {
        id: 'personal',
        titulo: 'Personal CEA',
        descripcion: 'Gestión y consulta del personal del centro.',
        icono: Users,
        ruta: '/admin/personal',
      },
      {
        id: 'vehiculos',
        titulo: 'Vehículos CEA',
        descripcion: 'Registro y administración del parque automotor.',
        icono: Car,
        ruta: '/admin/vehiculos',
      },
      {
        id: 'reuniones',
        titulo: 'Reuniones CEA',
        descripcion: 'Gestión y seguimiento de reuniones institucionales.',
        icono: ReceiptText,
        ruta: '/admin/reuniones',
      },
      {
        id: 'documentos',
        titulo: 'Configuración de Documentos',
        descripcion: 'Plantillas, encabezados y configuración documental.',
        icono: FileCog,
        ruta: '/admin/configuracion-documentos',
      },
      {
        id: 'consultas',
        titulo: 'Consultas y Seguimiento Operativo',
        descripcion: 'Consulta consolidada de la operación del CEA.',
        icono: Gauge,
        ruta: '/admin/consultas',
      },
    ],
  },
  {
    id: 'seguridad-vial',
    titulo: 'Seguridad vial y cumplimiento',
    columnas: 3,
    opciones: [
      {
        id: 'pesv',
        titulo: 'PESV',
        descripcion: 'Plan Estratégico de Seguridad Vial.',
        icono: Route,
        ruta: '/admin/pesv',
      },
      {
        id: 'sinst-vigia',
        titulo: 'Reporte SINST - VIGIA 2',
        descripcion: 'Formularios, reportes y evidencias SINST-VIGIA.',
        icono: Settings,
        ruta: '/admin/sinst-vigia',
      },
      {
        id: 'mantenimientos',
        titulo: 'Plan de Mantenimiento Vehicular',
        descripcion: 'Configuración y seguimiento del mantenimiento vehicular.',
        icono: Wrench,
        ruta: '/admin/mantenimientos',
      },
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
