// app/admin/mantenimientos/page.jsx
'use client'

import MenuNavegacion from '@/components/admin/MenuNavegacion'
import { Wrench, Settings2, ClipboardList, Building2 } from 'lucide-react'

const grupos = [
  {
    id: 'mantenimiento-vehicular',
    titulo: 'Gestión de mantenimiento vehicular',
    columnas: 3,
    compacta: true,
    compactaAlta: true,
    opciones: [
      {
        id: 'configuracion-vehiculos',
        titulo: 'Configuración Vehículos Plan de Mantenimiento',
        descripcion:
          'Configure el plan preventivo particular de cada vehículo, seleccionando las actividades aplicables y definiendo su frecuencia de mantenimiento por kilometraje.',
        icono: Settings2,
        ruta: '/admin/mantenimientos/plan',
      },
      {
        id: 'plan-mantenimiento',
        titulo: 'Plan de Mantenimiento',
        descripcion:
          'Consulte y gestione el plan de mantenimiento preventivo de los vehículos con configuración finalizada, incluyendo actividades, frecuencias, referencias de kilometraje y seguimiento técnico.',
        icono: ClipboardList,
        ruta: '/admin/mantenimientos/plan-mantenimiento',
      },
      {
        id: 'proveedores-talleres',
        titulo: 'Proveedores y Talleres',
        descripcion:
          'Administre los proveedores y talleres de mantenimiento, sus técnicos y las actividades de mantenimiento autorizadas para cada establecimiento.',
        icono: Building2,
        ruta: '/admin/mantenimientos/proveedores',
      },
    ],
  },
]

export default function MantenimientosAdminPage() {
  return (
    <MenuNavegacion
      titulo="Plan de Mantenimiento Vehicular"
      subtitulo="Configure el plan preventivo de cada vehículo, administre su Plan de Mantenimiento y gestione los proveedores y talleres autorizados."
      iconoTitulo={Wrench}
      grupos={grupos}
      anchoContenido="960px"
      mostrarRegresar
      rutaRegreso="/admin"
      textoRegreso="Menú Administrativo"
      mostrarCerrarSesion
      contenedorTarjetas
      mostrarPie
    />
  )
}
