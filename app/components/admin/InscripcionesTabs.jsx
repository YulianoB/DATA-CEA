'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/inscripciones/nueva',        label: 'Nueva Matrícula', icon: 'fa-plus-circle' },
  { href: '/admin/inscripciones/consultas',    label: 'Consultas',       icon: 'fa-search' },
  { href: '/admin/inscripciones/caja',         label: 'Caja',            icon: 'fa-cash-register' },
  { href: '/admin/inscripciones/documentos',   label: 'Documentos',      icon: 'fa-folder-open' },
  { href: '/admin/inscripciones/agendar', label: 'Agendar', icon: 'fa-calendar-check' },
   { href: '/admin/inscripciones/sicov',        label: 'SICOV',           icon: 'fa-clipboard-check' },
  { href: '/admin/inscripciones/runt',         label: 'RUNT',            icon: 'fa-id-card' }, 
  { href: '/admin/inscripciones/siet',         label: 'SIET',            icon: 'fa-database' },  
  
]

export default function InscripcionesTabs() {
  const pathname = usePathname()
  return (
    <div className="w-full">
      <nav className="flex flex-wrap items-center gap-2">
        {TABS.map(tab => {
          const active = pathname?.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1.5 text-xs rounded border transition flex items-center gap-2
                ${active
                  ? 'bg-[var(--primary)] text-white border-[var(--primary-dark)]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
              <i className={`fas ${tab.icon}`}></i>
              {tab.label}
            </Link>
          )
        })}
        <div className="ml-auto">
          <Link
            href="/admin"
            className="bg-gray-600 hover:bg-gray-800 text-white px-2 py-1 rounded text-xs flex items-center gap-2"
            title="Regresar al Menú"
          >
            <i className="fas fa-arrow-left"></i>
            Regresar
          </Link>
        </div>
      </nav>
    </div>
  )
}
