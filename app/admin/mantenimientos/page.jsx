// app/admin/mantenimientos/page.jsx

'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Settings2,
  ClipboardList,
  Wrench,
  Building2,
} from 'lucide-react'

export default function MantenimientosAdminPage() {
  const router = useRouter()

  const opciones = [
    {
      icon: Settings2,
      titulo: 'Configuración Vehículos Plan de Mantenimiento',
      descripcion:
        'Configure el plan preventivo particular de cada vehículo, seleccionando las actividades aplicables y definiendo su frecuencia de mantenimiento por kilometraje.',
      route: '/admin/mantenimientos/plan',
    },
    {
      icon: ClipboardList,
      titulo: 'Plan de Mantenimiento',
      descripcion:
        'Consulte y gestione el plan de mantenimiento preventivo de los vehículos con configuración finalizada, incluyendo actividades, frecuencias, referencias de kilometraje y seguimiento técnico.',
      route: '/admin/mantenimientos/plan-mantenimiento',
    },
    {
      icon: Building2,
      titulo: 'Proveedores y Talleres',
      descripcion:
        'Administre los proveedores y talleres de mantenimiento, sus técnicos y las actividades de mantenimiento autorizadas para cada establecimiento.',
      route: '/admin/mantenimientos/proveedores',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-lg md:p-8">
          <div className="mb-6 flex items-center justify-between gap-3 border-b border-[var(--primary)] pb-3">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              <ArrowLeft size={18} />
              Volver
            </button>

            <div className="flex flex-1 items-center justify-center gap-3 pr-16">
              <Wrench
                size={30}
                strokeWidth={1.8}
                className="text-[var(--primary)]"
              />

              <h1 className="text-center text-xl font-bold uppercase text-[var(--primary)] md:text-2xl">
                Plan de Mantenimiento Vehicular
              </h1>
            </div>
          </div>

          <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-3 text-center text-sm text-gray-700">
            Configure el plan preventivo de cada vehículo, administre su Plan
            de Mantenimiento y gestione los proveedores y talleres autorizados.
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {opciones.map((opcion) => {
              const Icon = opcion.icon

              return (
                <button
                  key={opcion.titulo}
                  type="button"
                  onClick={() => router.push(opcion.route)}
                  className="
                    min-h-48 rounded-xl border border-gray-200
                    bg-white p-5 text-left text-gray-700 shadow-sm
                    transition-all hover:-translate-y-1
                    hover:border-[var(--primary)]
                    hover:bg-[var(--primary)] hover:text-white
                    hover:shadow-lg
                  "
                >
                  <div className="flex items-start gap-4">
                    <Icon
                      size={34}
                      strokeWidth={1.7}
                      className="shrink-0"
                    />

                    <div>
                      <div className="font-bold">
                        {opcion.titulo}
                      </div>

                      <p className="mt-2 text-sm leading-relaxed">
                        {opcion.descripcion}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}