// app/admin/vehiculos/page.jsx

'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import Link from 'next/link'

import {
  Toaster,
  toast,
} from 'sonner'

import {
  cerrarSesion,
} from '@/lib/auth/logout'

// ============================================================
// CONSTANTES
// ============================================================

const ESTADO_ACTIVO =
  'ACTIVO'

const ESTADO_INACTIVO =
  'INACTIVO'

const CLASIFICACIONES = [
  'AUTOMOTOR',
  'NO AUTOMOTOR',
]

const ORIGENES = [
  'PROPIO',
  'ASOCIADO',
]

const TIPOS_VEHICULO = [
  'Automovil',
  'Camioneta',
  'Motocicleta',
  'Camión',
]

const OPCIONES_GPS = [
  'SI',
  'NO',
]

const FORM_INICIAL = {
  placa: '',
  clasificacion: '',
  origen: '',
  propietario: '',
  fecha_adquisicion: '',

  tipo_vehiculo: '',
  modelo: '',
  marca: '',
  linea: '',
  tipo_carroceria: '',

  numero_chasis: '',
  numero_motor: '',
  vin: '',

  numero_licencia_transito: '',
  fecha_matricula: '',
  organismo_transito: '',

  gps: '',

  estado:
    ESTADO_ACTIVO,
}

// ============================================================
// HELPERS
// ============================================================

function normalizarMayusculas(
  valor
) {
  return String(
    valor || ''
  ).toUpperCase()
}

function hoyBogota() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone:
        'America/Bogota',
    }
  ).format(
    new Date()
  )
}

// ============================================================
// PÁGINA
// ============================================================

export default function VehiculosAdminPage() {
  const router =
    useRouter()

  const [
    user,
    setUser,
  ] =
    useState(null)

  const [
    empresaNit,
    setEmpresaNit,
  ] =
    useState('')

  // ==========================================================
  // FORMULARIO
  // ==========================================================

  const [
    form,
    setForm,
  ] =
    useState(
      FORM_INICIAL
    )

  const [
    editandoId,
    setEditandoId,
  ] =
    useState(null)

  const [
    guardando,
    setGuardando,
  ] =
    useState(false)

  // ==========================================================
  // LISTADO
  // ==========================================================

  const [
    vehiculos,
    setVehiculos,
  ] =
    useState([])

  const [
    cargando,
    setCargando,
  ] =
    useState(false)

  const [
    busqueda,
    setBusqueda,
  ] =
    useState('')

  const [
    filtroEstado,
    setFiltroEstado,
  ] =
    useState('TODOS')

  // ==========================================================
  // MODAL ESTADO
  // ==========================================================

  const [
    modalEstado,
    setModalEstado,
  ] =
    useState(null)

  const [
    actualizandoEstado,
    setActualizandoEstado,
  ] =
    useState(false)

  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(() => {
    const storedUser =
      localStorage.getItem(
        'currentUser'
      )

    if (!storedUser) {
      router.push(
        '/login'
      )

      return
    }

    try {
      const parsedUser =
        JSON.parse(
          storedUser
        )

      const nitSesion =
        localStorage.getItem(
          'currentEmpresaNit'
        ) ||
        parsedUser?.nitEmpresa ||
        parsedUser
          ?.empresa
          ?.nit ||
        ''

      if (!nitSesion) {
        toast.error(
          'No se encontró el CEA de la sesión.'
        )

        router.push(
          '/login'
        )

        return
      }

      setUser(
        parsedUser
      )

      setEmpresaNit(
        String(
          nitSesion
        ).trim()
      )
    } catch (error) {
      console.error(
        'Error leyendo sesión:',
        error
      )

      localStorage.removeItem(
        'currentUser'
      )

      router.push(
        '/login'
      )
    }
  }, [
    router,
  ])

  // ==========================================================
  // RESPONSABLE
  // ==========================================================

  const nombreResponsable =
    user?.nombre_completo ||
    user?.nombreCompleto ||
    user?.usuario ||
    'ADMINISTRATIVO'

  // ==========================================================
  // CARGAR VEHÍCULOS
  // ==========================================================

  const cargarVehiculos =
    async () => {
      if (
        !empresaNit
      ) {
        return
      }

      setCargando(
        true
      )

      try {
        const response =
          await fetch(
            `/api/vehiculos?nit=${encodeURIComponent(
              empresaNit
            )}&recurso=lista`,
            {
              cache:
                'no-store',
            }
          )

        const result =
          await response.json()

        if (
          !response.ok ||
          result?.status !==
            'success'
        ) {
          throw new Error(
            result?.message ||
              'No fue posible cargar los vehículos.'
          )
        }

        setVehiculos(
          Array.isArray(
            result.vehiculos
          )
            ? result.vehiculos
            : []
        )
      } catch (error) {
        console.error(
          'Error cargando vehículos:',
          error
        )

        toast.error(
          error?.message ||
            'No fue posible cargar los vehículos.'
        )

        setVehiculos(
          []
        )
      } finally {
        setCargando(
          false
        )
      }
    }

  useEffect(() => {
    if (
      empresaNit
    ) {
      cargarVehiculos()
    }
  }, [
    empresaNit,
  ])

  // ==========================================================
  // FILTRO
  // ==========================================================

  const vehiculosFiltrados =
    useMemo(() => {
      const texto =
        String(
          busqueda || ''
        )
          .trim()
          .toLowerCase()

      return vehiculos.filter(
        (vehiculo) => {
          const estado =
            String(
              vehiculo.estado ||
              ''
            )
              .trim()
              .toUpperCase()

          if (
            filtroEstado !==
              'TODOS' &&
            estado !==
              filtroEstado
          ) {
            return false
          }

          if (!texto) {
            return true
          }

          return [
            vehiculo.placa,
            vehiculo.tipo_vehiculo,
            vehiculo.marca,
            vehiculo.modelo,
            vehiculo.linea,
            vehiculo.propietario,
            vehiculo.vin,
            vehiculo.numero_chasis,
            vehiculo.numero_motor,
          ].some(
            (valor) =>
              String(
                valor || ''
              )
                .toLowerCase()
                .includes(
                  texto
                )
          )
        }
      )
    }, [
      vehiculos,
      busqueda,
      filtroEstado,
    ])

  // ==========================================================
  // CHANGE FORM
  // ==========================================================

  const onChange =
    (event) => {
      const {
        name,
        value,
      } =
        event.target

      const camposMayusculas = [
        'placa',
        'propietario',
        'modelo',
        'marca',
        'linea',
        'tipo_carroceria',
        'numero_chasis',
        'numero_motor',
        'vin',
        'numero_licencia_transito',
        'organismo_transito',
      ]

      setForm(
        (prev) => ({
          ...prev,

          [name]:
            camposMayusculas.includes(
              name
            )
              ? normalizarMayusculas(
                  value
                )
              : value,
        })
      )
    }

  // ==========================================================
  // VALIDAR FORM
  // ==========================================================

  const validarFormulario =
    () => {
      if (
        !String(
          form.placa ||
          ''
        ).trim()
      ) {
        return (
          'La placa es obligatoria.'
        )
      }

      if (
        !String(
          form.tipo_vehiculo ||
          ''
        ).trim()
      ) {
        return (
          'El tipo de vehículo es obligatorio.'
        )
      }

      if (
        !TIPOS_VEHICULO.includes(
          form.tipo_vehiculo
        )
      ) {
        return (
          'Seleccione un tipo de vehículo válido.'
        )
      }

      if (
        !String(
          form.marca ||
          ''
        ).trim()
      ) {
        return (
          'La marca es obligatoria.'
        )
      }

      if (
        form.clasificacion &&
        !CLASIFICACIONES.includes(
          form.clasificacion
        )
      ) {
        return (
          'La clasificación seleccionada no es válida.'
        )
      }

      if (
        form.origen &&
        !ORIGENES.includes(
          form.origen
        )
      ) {
        return (
          'El origen seleccionado no es válido.'
        )
      }

      if (
        form.gps &&
        !OPCIONES_GPS.includes(
          form.gps
        )
      ) {
        return (
          'La opción de GPS no es válida.'
        )
      }

      return ''
    }

  // ==========================================================
  // LIMPIAR FORM
  // ==========================================================

  const limpiarFormulario =
    () => {
      setForm(
        FORM_INICIAL
      )

      setEditandoId(
        null
      )
    }

  // ==========================================================
  // EDITAR
  // ==========================================================

  const editarVehiculo =
    (vehiculo) => {
      setEditandoId(
        vehiculo.id
      )

      setForm({
        placa:
          vehiculo.placa ||
          '',

        clasificacion:
          vehiculo
            .clasificacion ||
          '',

        origen:
          vehiculo.origen ||
          '',

        propietario:
          vehiculo
            .propietario ||
          '',

        fecha_adquisicion:
          vehiculo
            .fecha_adquisicion ||
          '',

        tipo_vehiculo:
          vehiculo
            .tipo_vehiculo ||
          '',

        modelo:
          vehiculo.modelo ||
          '',

        marca:
          vehiculo.marca ||
          '',

        linea:
          vehiculo.linea ||
          '',

        tipo_carroceria:
          vehiculo
            .tipo_carroceria ||
          '',

        numero_chasis:
          vehiculo
            .numero_chasis ||
          '',

        numero_motor:
          vehiculo
            .numero_motor ||
          '',

        vin:
          vehiculo.vin ||
          '',

        numero_licencia_transito:
          vehiculo
            .numero_licencia_transito ||
          '',

        fecha_matricula:
          vehiculo
            .fecha_matricula ||
          '',

        organismo_transito:
          vehiculo
            .organismo_transito ||
          '',

        gps:
          vehiculo.gps ||
          '',

        estado:
          String(
            vehiculo.estado ||
            ESTADO_ACTIVO
          ).toUpperCase(),
      })

      window.scrollTo({
        top: 0,
        behavior:
          'smooth',
      })
    }

  // ==========================================================
  // GUARDAR
  // ==========================================================

  const guardarVehiculo =
    async (event) => {
      event.preventDefault()

      if (
        guardando ||
        !empresaNit
      ) {
        return
      }

      const mensaje =
        validarFormulario()

      if (mensaje) {
        toast.warning(
          mensaje
        )

        return
      }

      setGuardando(
        true
      )

      try {
        const payload = {
          nit:
            empresaNit,

          accion:
            editandoId
              ? 'editar'
              : 'crear',

          ...form,

          nombre_responsable:
            nombreResponsable,

          actualizado_por:
            nombreResponsable,

          ...(editandoId
            ? {
                id:
                  editandoId,
              }
            : {
                fecha_vinculacion:
                  form.fecha_adquisicion ||
                  hoyBogota(),

                motivo_vinculacion:
                  'REGISTRO INICIAL DEL VEHÍCULO',
              }),
        }

        const response =
          await fetch(
            '/api/vehiculos',
            {
              method:
                editandoId
                  ? 'PATCH'
                  : 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          )

        const result =
          await response.json()

        if (
          response.status ===
            409 ||
          result?.status ===
            'warning'
        ) {
          toast.warning(
            result?.message ||
              'No fue posible completar la operación.'
          )

          return
        }

        if (
          !response.ok ||
          result?.status !==
            'success'
        ) {
          toast.error(
            result?.message ||
              'No fue posible guardar el vehículo.'
          )

          return
        }

        toast.success(
          result?.message ||
            (
              editandoId
                ? 'Vehículo actualizado correctamente.'
                : 'Vehículo registrado correctamente.'
            )
        )

        limpiarFormulario()

        await cargarVehiculos()
      } catch (error) {
        console.error(
          'Error guardando vehículo:',
          error
        )

        toast.error(
          'No fue posible comunicarse con el servidor.'
        )
      } finally {
        setGuardando(
          false
        )
      }
    }

  // ==========================================================
  // ABRIR MODAL ESTADO
  // ==========================================================

  const abrirModalEstado =
    (
      vehiculo,
      accion
    ) => {
      const esInactivar =
        accion ===
        'inactivar'

      setModalEstado({
        vehiculo,

        accion,

        fecha:
          hoyBogota(),

        motivo:
          esInactivar
            ? ''
            : 'REACTIVACIÓN / NUEVA VINCULACIÓN AL CEA',

        observaciones:
          '',
      })
    }

  // ==========================================================
  // CAMBIO ESTADO
  // ==========================================================

  const confirmarCambioEstado =
    async () => {
      if (
        !modalEstado ||
        actualizandoEstado ||
        !empresaNit
      ) {
        return
      }

      if (
        !modalEstado.fecha
      ) {
        toast.warning(
          modalEstado
            .accion ===
          'inactivar'
            ? 'Seleccione la fecha de desvinculación.'
            : 'Seleccione la fecha de vinculación.'
        )

        return
      }

      if (
        !String(
          modalEstado
            .motivo ||
          ''
        ).trim()
      ) {
        toast.warning(
          modalEstado
            .accion ===
          'inactivar'
            ? 'Indique el motivo de la desvinculación.'
            : 'Indique el motivo de la nueva vinculación.'
        )

        return
      }

      setActualizandoEstado(
        true
      )

      try {
        const esInactivar =
          modalEstado
            .accion ===
          'inactivar'

        const payload = {
          nit:
            empresaNit,

          accion:
            modalEstado
              .accion,

          id:
            modalEstado
              .vehiculo
              .id,

          nombre_responsable:
            nombreResponsable,

          actualizado_por:
            nombreResponsable,

          observaciones_vinculacion:
            String(
              modalEstado
                .observaciones ||
              ''
            ).trim() ||
            null,

          ...(esInactivar
            ? {
                fecha_desvinculacion:
                  modalEstado
                    .fecha,

                motivo_desvinculacion:
                  String(
                    modalEstado
                      .motivo ||
                    ''
                  ).trim(),
              }
            : {
                fecha_vinculacion:
                  modalEstado
                    .fecha,

                motivo_vinculacion:
                  String(
                    modalEstado
                      .motivo ||
                    ''
                  ).trim(),
              }),
        }

        const response =
          await fetch(
            '/api/vehiculos',
            {
              method:
                'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          )

        const result =
          await response.json()

        if (
          response.status ===
            409 ||
          result?.status ===
            'warning'
        ) {
          toast.warning(
            result?.message ||
              'No fue posible cambiar el estado del vehículo.'
          )

          return
        }

        if (
          !response.ok ||
          result?.status !==
            'success'
        ) {
          toast.error(
            result?.message ||
              'No fue posible cambiar el estado del vehículo.'
          )

          return
        }

        toast.success(
          result?.message ||
            'Estado actualizado correctamente.'
        )

        setModalEstado(
          null
        )

        await cargarVehiculos()

        if (
          result
            ?.requiere_revision_documental
        ) {
          toast.info(
            result
              ?.mensaje_documental ||
              'Revise la documentación del vehículo.',
            {
              duration:
                7000,
            }
          )
        }
      } catch (error) {
        console.error(
          'Error cambiando estado:',
          error
        )

        toast.error(
          'No fue posible comunicarse con el servidor.'
        )
      } finally {
        setActualizandoEstado(
          false
        )
      }
    }

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout =
    () =>
      cerrarSesion(
        router
      )

  // ==========================================================
  // RENDER
  // ==========================================================

  if (!user) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">

      <Toaster
        richColors
        position="top-center"
      />

      <div className="max-w-7xl mx-auto space-y-6">

        {/* ==================================================
            ENCABEZADO
        ================================================== */}

        <div className="bg-white rounded-xl shadow-lg border p-5 sm:p-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">

            <div>

              <h1 className="text-2xl font-bold text-[var(--primary)] flex items-center gap-3">

                <i className="fas fa-car"></i>

                Administración de Vehículos

              </h1>

              <p className="text-sm text-gray-600 mt-1">
                Registro, actualización, vinculación y control del parque automotor del CEA.
              </p>

            </div>

            <div className="flex gap-2 flex-wrap">

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/admin'
                  )
                }
                className="bg-gray-700 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm"
              >

                <i className="fas fa-arrow-left mr-2"></i>

                Menú administrativo

              </button>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                className="bg-[var(--danger)] hover:bg-red-800 text-white px-4 py-2 rounded-lg text-sm"
              >

                <i className="fas fa-sign-out-alt mr-2"></i>

                Cerrar Sesión

              </button>

            </div>

          </div>

        </div>

        {/* ==================================================
            FORMULARIO
        ================================================== */}

        <form
          onSubmit={
            guardarVehiculo
          }
          className="bg-white rounded-xl shadow-lg border p-5 sm:p-6"
        >

          <div className="flex items-center justify-between gap-3 flex-wrap mb-5">

            <div>

              <h2 className="text-xl font-bold text-gray-800">

                {editandoId
                  ? 'Editar Vehículo'
                  : 'Registrar Vehículo'}

              </h2>

              <p className="text-xs text-gray-500 mt-1">
                Datos maestros de la Hoja de Vida del vehículo.
              </p>

            </div>

            {editandoId && (

              <span className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs font-semibold rounded-full px-3 py-1">
                MODO EDICIÓN
              </span>

            )}

          </div>

          {/* ==================================================
              IDENTIFICACIÓN
          ================================================== */}

          <Seccion
            titulo="Identificación del Vehículo"
            icono="fa-id-card"
          >

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              <CampoInput
                label="Placa *"
                name="placa"
                value={
                  form.placa
                }
                onChange={
                  onChange
                }
              />

              <CampoSelect
                label="Clasificación"
                name="clasificacion"
                value={
                  form.clasificacion
                }
                onChange={
                  onChange
                }
                options={[
                  [
                    '',
                    '-- Seleccione --',
                  ],
                  [
                    'AUTOMOTOR',
                    'Automotor',
                  ],
                  [
                    'NO AUTOMOTOR',
                    'No automotor',
                  ],
                ]}
              />

              <CampoSelect
                label="Origen"
                name="origen"
                value={
                  form.origen
                }
                onChange={
                  onChange
                }
                options={[
                  [
                    '',
                    '-- Seleccione --',
                  ],
                  [
                    'PROPIO',
                    'Propio',
                  ],
                  [
                    'ASOCIADO',
                    'Asociado',
                  ],
                ]}
              />

              <CampoSelect
                label="Tipo de vehículo *"
                name="tipo_vehiculo"
                value={
                  form.tipo_vehiculo
                }
                onChange={
                  onChange
                }
                options={[
                  [
                    '',
                    '-- Seleccione --',
                  ],
                  [
                    'Automovil',
                    'Automóvil',
                  ],
                  [
                    'Camioneta',
                    'Camioneta',
                  ],
                  [
                    'Motocicleta',
                    'Motocicleta',
                  ],
                  [
                    'Camión',
                    'Camión',
                  ],
                ]}
              />

              <CampoInput
                label="Marca *"
                name="marca"
                value={
                  form.marca
                }
                onChange={
                  onChange
                }
              />

              <CampoInput
                label="Modelo"
                name="modelo"
                value={
                  form.modelo
                }
                onChange={
                  onChange
                }
              />

              <CampoInput
                label="Línea"
                name="linea"
                value={
                  form.linea
                }
                onChange={
                  onChange
                }
              />

              <CampoInput
                label="Tipo de carrocería"
                name="tipo_carroceria"
                value={
                  form.tipo_carroceria
                }
                onChange={
                  onChange
                }
              />

            </div>

          </Seccion>

          {/* ==================================================
              IDENTIFICADORES TÉCNICOS
          ================================================== */}

          <Seccion
            titulo="Identificadores Técnicos"
            icono="fa-cogs"
          >

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              <CampoInput
                label="Número de chasis"
                name="numero_chasis"
                value={
                  form.numero_chasis
                }
                onChange={
                  onChange
                }
              />

              <CampoInput
                label="Número de motor"
                name="numero_motor"
                value={
                  form.numero_motor
                }
                onChange={
                  onChange
                }
              />

              <CampoInput
                label="Número VIN"
                name="vin"
                value={
                  form.vin
                }
                onChange={
                  onChange
                }
              />

            </div>

          </Seccion>

          {/* ==================================================
              PROPIEDAD
          ================================================== */}

          <Seccion
            titulo="Propiedad y Adquisición"
            icono="fa-file-signature"
          >

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              <CampoInput
                label="Propietario"
                name="propietario"
                value={
                  form.propietario
                }
                onChange={
                  onChange
                }
              />

              <CampoInput
                label="Fecha de adquisición"
                type="date"
                name="fecha_adquisicion"
                value={
                  form.fecha_adquisicion
                }
                onChange={
                  onChange
                }
              />

              <CampoSelect
                label="GPS"
                name="gps"
                value={
                  form.gps
                }
                onChange={
                  onChange
                }
                options={[
                  [
                    '',
                    '-- Seleccione --',
                  ],
                  [
                    'SI',
                    'Sí',
                  ],
                  [
                    'NO',
                    'No',
                  ],
                ]}
              />

            </div>

          </Seccion>

          {/* ==================================================
              LICENCIA DE TRÁNSITO
          ================================================== */}

          <Seccion
            titulo="Licencia de Tránsito"
            icono="fa-address-card"
          >

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              <CampoInput
                label="N.º Licencia de Tránsito"
                name="numero_licencia_transito"
                value={
                  form.numero_licencia_transito
                }
                onChange={
                  onChange
                }
              />

              <CampoInput
                label="Fecha de matrícula"
                type="date"
                name="fecha_matricula"
                value={
                  form.fecha_matricula
                }
                onChange={
                  onChange
                }
              />

              <CampoInput
                label="Organismo de tránsito"
                name="organismo_transito"
                value={
                  form.organismo_transito
                }
                onChange={
                  onChange
                }
              />

            </div>

          </Seccion>

          {/* ==================================================
              ESTADO INICIAL
          ================================================== */}

          {!editandoId && (

            <Seccion
              titulo="Estado Inicial"
              icono="fa-toggle-on"
            >

              <div className="max-w-sm">

                <CampoSelect
                  label="Estado"
                  name="estado"
                  value={
                    form.estado
                  }
                  onChange={
                    onChange
                  }
                  options={[
                    [
                      ESTADO_ACTIVO,
                      'ACTIVO',
                    ],
                    [
                      ESTADO_INACTIVO,
                      'INACTIVO',
                    ],
                  ]}
                />

                <p className="text-xs text-gray-500 mt-2">
                  Si se registra como ACTIVO, se creará automáticamente la primera vinculación.
                </p>

              </div>

            </Seccion>

          )}

          {editandoId && (

            <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 text-sm text-blue-800">

              <i className="fas fa-info-circle mr-2"></i>

              El estado del vehículo no se modifica durante la edición. Utilice los botones Activar o Inactivar del listado para conservar correctamente el historial de vinculaciones.

            </div>

          )}

          {/* ==================================================
              BOTONES
          ================================================== */}

          <div className="flex justify-end gap-3 mt-6 border-t pt-5 flex-wrap">

            <button
              type="button"
              onClick={
                limpiarFormulario
              }
              disabled={
                guardando
              }
              className="border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm"
            >

              <i className="fas fa-eraser mr-2"></i>

              {editandoId
                ? 'Cancelar edición'
                : 'Limpiar'}

            </button>

            <button
              type="submit"
              disabled={
                guardando
              }
              className={`px-5 py-2 rounded-lg text-white text-sm font-semibold ${
                guardando
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'
              }`}
            >

              <i className="fas fa-save mr-2"></i>

              {guardando
                ? 'Guardando...'
                : editandoId
                ? 'Guardar Cambios'
                : 'Registrar Vehículo'}

            </button>

          </div>

        </form>

        {/* ==================================================
            LISTADO
        ================================================== */}

        <div className="bg-white rounded-xl shadow-lg border p-5 sm:p-6">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">

            <div>

              <h2 className="text-xl font-bold text-gray-800">
                Vehículos Registrados
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                {vehiculosFiltrados.length} vehículo(s) encontrados.
              </p>

            </div>

            <div className="flex flex-col sm:flex-row gap-3">

              <input
                type="text"
                value={
                  busqueda
                }
                onChange={(e) =>
                  setBusqueda(
                    e.target.value
                  )
                }
                placeholder="Buscar placa, marca, VIN..."
                className="border rounded-lg p-2 text-sm sm:w-72"
              />

              <select
                value={
                  filtroEstado
                }
                onChange={(e) =>
                  setFiltroEstado(
                    e.target.value
                  )
                }
                className="border rounded-lg p-2 text-sm"
              >

                <option value="TODOS">
                  Todos
                </option>

                <option value={ESTADO_ACTIVO}>
                  Activos
                </option>

                <option value={ESTADO_INACTIVO}>
                  Inactivos
                </option>

              </select>

            </div>

          </div>

          <div className="overflow-x-auto">

            <table className="min-w-full text-sm border">

              <thead className="bg-gray-100 text-gray-700">

                <tr>

                  <th className="text-left p-2 border">
                    Placa
                  </th>

                  <th className="text-left p-2 border">
                    Tipo
                  </th>

                  <th className="text-left p-2 border">
                    Marca
                  </th>

                  <th className="text-left p-2 border">
                    Modelo
                  </th>

                  <th className="text-left p-2 border">
                    Línea
                  </th>

                  <th className="text-left p-2 border">
                    Origen
                  </th>

                  <th className="text-left p-2 border">
                    Estado
                  </th>

                  <th className="text-left p-2 border">
                    Acciones
                  </th>

                </tr>

              </thead>

              <tbody>

                {cargando ? (

                  <tr>

                    <td
                      colSpan="8"
                      className="p-6 text-center text-gray-500"
                    >

                      <i className="fas fa-spinner fa-spin mr-2"></i>

                      Cargando vehículos...

                    </td>

                  </tr>

                ) : vehiculosFiltrados.length ===
                  0 ? (

                  <tr>

                    <td
                      colSpan="8"
                      className="p-6 text-center text-gray-500"
                    >
                      No hay vehículos registrados.
                    </td>

                  </tr>

                ) : (

                  vehiculosFiltrados.map(
                    (vehiculo) => {
                      const activo =
                        String(
                          vehiculo.estado ||
                          ''
                        )
                          .toUpperCase() ===
                        ESTADO_ACTIVO

                      return (
                        <tr
                          key={
                            vehiculo.id
                          }
                          className="hover:bg-gray-50"
                        >

                          <td className="p-2 border font-bold">
                            {
                              vehiculo.placa
                            }
                          </td>

                          <td className="p-2 border">
                            {
                              vehiculo.tipo_vehiculo ||
                              '-'
                            }
                          </td>

                          <td className="p-2 border">
                            {
                              vehiculo.marca ||
                              '-'
                            }
                          </td>

                          <td className="p-2 border">
                            {
                              vehiculo.modelo ||
                              '-'
                            }
                          </td>

                          <td className="p-2 border">
                            {
                              vehiculo.linea ||
                              '-'
                            }
                          </td>

                          <td className="p-2 border">
                            {
                              vehiculo.origen ||
                              '-'
                            }
                          </td>

                          <td className="p-2 border">

                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-bold border ${
                                activo
                                  ? 'bg-green-100 text-green-700 border-green-300'
                                  : 'bg-red-100 text-red-700 border-red-300'
                              }`}
                            >

                              {activo
                                ? 'ACTIVO'
                                : 'INACTIVO'}

                            </span>

                          </td>

                          <td className="p-2 border">

                            <div className="flex gap-2 flex-wrap">

                              <button
                                type="button"
                                onClick={() =>
                                  editarVehiculo(
                                    vehiculo
                                  )
                                }
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs"
                              >

                                <i className="fas fa-edit mr-1"></i>

                                Editar

                              </button>

                              <Link
                                href={`/admin/vehiculos/${vehiculo.id}`}
                                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-3 py-1.5 rounded text-xs"
                              >

                                <i className="fas fa-file-alt mr-1"></i>

                                Hoja de Vida

                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  abrirModalEstado(
                                    vehiculo,
                                    activo
                                      ? 'inactivar'
                                      : 'activar'
                                  )
                                }
                                className={`px-3 py-1.5 rounded text-xs text-white ${
                                  activo
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-green-600 hover:bg-green-700'
                                }`}
                              >

                                <i
                                  className={`fas ${
                                    activo
                                      ? 'fa-ban'
                                      : 'fa-check'
                                  } mr-1`}
                                ></i>

                                {activo
                                  ? 'Inactivar'
                                  : 'Reactivar'}

                              </button>

                            </div>

                          </td>

                        </tr>
                      )
                    }
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {/* ======================================================
          MODAL VINCULACIÓN / DESVINCULACIÓN
      ====================================================== */}

      {modalEstado && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">

          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">

            {/* ENCABEZADO */}

            <div className="p-4 sm:p-6 pb-4 border-b bg-white shrink-0">

              <div className="flex items-center gap-3">

                <i
                  className={`fas ${
                    modalEstado
                      .accion ===
                    'inactivar'
                      ? 'fa-unlink text-red-600'
                      : 'fa-link text-green-600'
                  } text-2xl`}
                ></i>

                <div>

                  <h3 className="text-lg font-bold">

                    {modalEstado
                      .accion ===
                    'inactivar'
                      ? 'Desvincular / Inactivar Vehículo'
                      : 'Reactivar / Nueva Vinculación'}

                  </h3>

                  <p className="text-xs text-gray-500">

                    Vehículo{' '}

                    <strong>
                      {
                        modalEstado
                          .vehiculo
                          .placa
                      }
                    </strong>

                  </p>

                </div>

              </div>

            </div>

            {/* CONTENIDO */}

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">

              <div className="bg-gray-50 border rounded-lg p-3 text-sm mb-5">

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">

                  <div>

                    <p className="text-xs text-gray-500">
                      Placa
                    </p>

                    <p className="font-semibold">
                      {
                        modalEstado
                          .vehiculo
                          .placa
                      }
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-gray-500">
                      Tipo
                    </p>

                    <p className="font-semibold">
                      {
                        modalEstado
                          .vehiculo
                          .tipo_vehiculo ||
                        '-'
                      }
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-gray-500">
                      Marca
                    </p>

                    <p className="font-semibold">
                      {
                        modalEstado
                          .vehiculo
                          .marca ||
                        '-'
                      }
                    </p>

                  </div>

                </div>

              </div>

              <div className="space-y-4">

                <div>

                  <label className="block text-sm font-semibold mb-1">

                    {modalEstado
                      .accion ===
                    'inactivar'
                      ? 'Fecha de Desvinculación *'
                      : 'Fecha de Nueva Vinculación *'}

                  </label>

                  <input
                    type="date"
                    value={
                      modalEstado.fecha
                    }
                    onChange={(e) =>
                      setModalEstado(
                        (prev) => ({
                          ...prev,

                          fecha:
                            e.target
                              .value,
                        })
                      )
                    }
                    className="w-full border rounded-lg p-2 text-sm"
                  />

                </div>

                <div>

                  <label className="block text-sm font-semibold mb-1">

                    {modalEstado
                      .accion ===
                    'inactivar'
                      ? 'Motivo de Desvinculación *'
                      : 'Motivo de Vinculación *'}

                  </label>

                  {modalEstado
                    .accion ===
                  'inactivar' ? (

                    <select
                      value={
                        modalEstado
                          .motivo
                      }
                      onChange={(e) =>
                        setModalEstado(
                          (prev) => ({
                            ...prev,

                            motivo:
                              e.target
                                .value,
                          })
                        )
                      }
                      className="w-full border rounded-lg p-2 text-sm"
                    >

                      <option value="">
                        -- Seleccione --
                      </option>

                      <option value="VINCULADO A OTRO CEA">
                        Vinculado a otro CEA
                      </option>

                      <option value="RETIRO DEL PARQUE AUTOMOTOR">
                        Retiro del parque automotor
                      </option>

                      <option value="VENTA DEL VEHÍCULO">
                        Venta del vehículo
                      </option>

                      <option value="FIN DE CONTRATO O CONVENIO">
                        Fin de contrato o convenio
                      </option>

                      <option value="VEHÍCULO FUERA DE SERVICIO">
                        Vehículo fuera de servicio
                      </option>

                      <option value="OTRO">
                        Otro
                      </option>

                    </select>

                  ) : (

                    <input
                      type="text"
                      value={
                        modalEstado
                          .motivo
                      }
                      onChange={(e) =>
                        setModalEstado(
                          (prev) => ({
                            ...prev,

                            motivo:
                              e.target
                                .value
                                .toUpperCase(),
                          })
                        )
                      }
                      className="w-full border rounded-lg p-2 text-sm uppercase"
                    />

                  )}

                </div>

                <div>

                  <label className="block text-sm font-semibold mb-1">
                    Observaciones
                  </label>

                  <textarea
                    rows={3}
                    value={
                      modalEstado
                        .observaciones
                    }
                    onChange={(e) =>
                      setModalEstado(
                        (prev) => ({
                          ...prev,

                          observaciones:
                            e.target
                              .value,
                        })
                      )
                    }
                    placeholder="Información adicional relacionada con la vinculación..."
                    className="w-full border rounded-lg p-2 text-sm"
                  />

                </div>

                <div>

                  <label className="block text-sm font-semibold mb-1">
                    Responsable
                  </label>

                  <input
                    type="text"
                    readOnly
                    value={
                      nombreResponsable
                    }
                    className="w-full border rounded-lg p-2 text-sm bg-gray-100"
                  />

                </div>

              </div>

              {modalEstado
                .accion ===
              'activar' && (

                <div className="mt-5 border border-yellow-300 bg-yellow-50 text-yellow-800 rounded-lg p-3 text-xs">

                  <i className="fas fa-exclamation-triangle mr-1"></i>

                  Al confirmar se creará una nueva vinculación histórica. Después deberá registrar o verificar la Tarjeta de Servicio correspondiente y comprobar las vigencias de SOAT y RTM.

                </div>

              )}

              {modalEstado
                .accion ===
              'inactivar' && (

                <div className="mt-5 border border-red-200 bg-red-50 text-red-700 rounded-lg p-3 text-xs">

                  <i className="fas fa-info-circle mr-1"></i>

                  El vehículo quedará inactivo, pero su Hoja de Vida, documentos, mantenimientos y demás historial permanecerán conservados.

                </div>

              )}

            </div>

            {/* BOTONES */}

            <div className="shrink-0 border-t bg-white p-4 sm:px-6">

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setModalEstado(
                      null
                    )
                  }
                  disabled={
                    actualizandoEstado
                  }
                  className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
                >

                  Cancelar

                </button>

                <button
                  type="button"
                  onClick={
                    confirmarCambioEstado
                  }
                  disabled={
                    actualizandoEstado
                  }
                  className={`px-4 py-2 rounded-lg text-white text-sm font-semibold ${
                    actualizandoEstado
                      ? 'bg-gray-400 cursor-not-allowed'
                      : modalEstado
                          .accion ===
                        'inactivar'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >

                  {actualizandoEstado
                    ? 'Procesando...'
                    : modalEstado
                        .accion ===
                      'inactivar'
                    ? 'Confirmar Desvinculación'
                    : 'Confirmar Vinculación'}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}

// ============================================================
// COMPONENTES
// ============================================================

function Seccion({
  titulo,
  icono,
  children,
}) {
  return (
    <div className="border rounded-xl overflow-hidden mb-5">

      <div className="bg-gray-900 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2">

        <i
          className={`fas ${icono}`}
        ></i>

        {titulo}

      </div>

      <div className="p-4 bg-gray-50">

        {children}

      </div>

    </div>
  )
}

function CampoInput({
  label,
  ...props
}) {
  return (
    <div>

      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
      </label>

      <input
        {...props}
        className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />

    </div>
  )
}

function CampoSelect({
  label,
  options,
  ...props
}) {
  return (
    <div>

      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
      </label>

      <select
        {...props}
        className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
      >

        {options.map(
          ([
            value,
            labelOption,
          ]) => (

            <option
              key={value}
              value={value}
            >
              {labelOption}
            </option>

          )
        )}

      </select>

    </div>
  )
}