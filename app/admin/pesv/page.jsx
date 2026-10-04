// app/admin/pesv/page.jsx

'use client'

import {
  BarChart3,
  BookOpenCheck,
  ChartNoAxesCombined,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Target,
  TriangleAlert,
  Wallet,
  ShieldCheck,
} from 'lucide-react'

import MenuNavegacion from '@/components/admin/MenuNavegacion'

// ============================================================
// SUBMENU PESV
// ============================================================

const GRUPOS_PESV = [
  {
    id: 'gestion-pesv',
    titulo: 'Gestión del PESV',
    columnas: 3,
    compacta: true,
    opciones: [
      {
        id: 'tablero',
        titulo: 'Tablero',
        descripcion: 'Resumen general del estado y comportamiento de los indicadores PESV.',
        icono: BarChart3,
        ruta: '/admin/pesv',
      },
      {
        id: 'objetivos-metas',
        titulo: 'Objetivos y Metas',
        descripcion: 'Definición y seguimiento de objetivos, metas e indicadores asociados.',
        icono: Target,
        ruta: '/admin/pesv/objetivos-metas',
      },
      {
        id: 'plan-trabajo',
        titulo: 'Plan Anual de Trabajo',
        descripcion: 'Planeación y seguimiento de las actividades anuales del PESV.',
        icono: ClipboardList,
        ruta: '/admin/pesv/plan-trabajo',
      },
      {
        id: 'plan-formacion',
        titulo: 'Plan Anual de Formación',
        descripcion: 'Programación y control de capacitaciones de seguridad vial.',
        icono: BookOpenCheck,
        ruta: '/admin/pesv/plan-formacion',
      },
      {
        id: 'presupuesto',
        titulo: 'Presupuesto PESV',
        descripcion: 'Planeación, ejecución y seguimiento de los recursos financieros destinados al PESV.',
        icono: Wallet,
        ruta: '/admin/pesv/presupuesto',
      },
      {
        id: 'riesgos',
        titulo: 'Matriz de Riesgos',
        descripcion: 'Identificación, valoración, tratamiento y seguimiento de riesgos viales.',
        icono: TriangleAlert,
        ruta: '/admin/pesv/riesgos',
      },
      {
        id: 'auditorias',
        titulo: 'Auditoría / No Conformidades',
        descripcion: 'Registro de auditorías, hallazgos, no conformidades y acciones correctivas.',
        icono: ClipboardCheck,
        ruta: '/admin/pesv/auditorias',
      },
      {
        id: 'indicadores',
        titulo: 'Indicadores',
        descripcion: 'Consulta de indicadores mensuales, trimestrales y acumulados anuales.',
        icono: ChartNoAxesCombined,
        ruta: '/admin/pesv/indicadores',
      },
      {
        id: 'informes',
        titulo: 'Informes de Gestión',
        descripcion: 'Generación de informes de gestión y seguimiento del PESV.',
        icono: FileText,
        ruta: '/admin/pesv/informes',
      },
    ],
  },
]

export default function PesvPage() {
  return (
    <MenuNavegacion
      titulo="PESV"
      iconoTitulo={ShieldCheck}
      subtitulo="Plan Estratégico de Seguridad Vial"
      grupos={GRUPOS_PESV}
      mostrarRegresar
      rutaRegreso="/admin"
      textoRegreso="Regresar"
      mostrarCerrarSesion
      anchoContenido="1180px"
      contenedorTarjetas
      mostrarPie
    />
  )
}
