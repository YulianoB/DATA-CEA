// app/instructor/practica/inspeccion/page.js

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { cerrarSesion } from '@/lib/auth/logout'
import {
  validarInspeccionDuplicada,
  validarKilometraje,
} from '@/lib/servicios/validaciones'

// ============================================================
// Helpers Bogotá
// ============================================================

const formatearBogota = (date, fmt) => {
  const opts =
    fmt === 'fecha'
      ? {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'America/Bogota',
        }
      : {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'America/Bogota',
        }

  return new Intl.DateTimeFormat(
    'en-CA',
    opts
  ).format(date)
}

const obtenerFechaHoraBogota = () => {
  const now = new Date()

  const fecha =
    formatearBogota(
      now,
      'fecha'
    )

  const hora =
    formatearBogota(
      now,
      'hora'
    )

  const timestamp =
    `${fecha}T${hora}-05:00`

  return {
    fecha,
    hora,
    timestamp,
  }
}

// ============================================================
// Página
// ============================================================

export default function InspeccionPage() {
  const router = useRouter()

  const [user, setUser] =
    useState(null)

  const [nitActual, setNitActual] =
    useState('')

  // ============================================================
  // Datos / UI
  // ============================================================

  const [vehiculos, setVehiculos] =
    useState([])

  const [
    cargandoVehiculos,
    setCargandoVehiculos,
  ] = useState(false)

  const [
    placaSeleccionada,
    setPlacaSeleccionada,
  ] = useState('')

  const [
    vehiculoInfo,
    setVehiculoInfo,
  ] = useState({
    tipo: '-',
    marca: '-',
  })

  const [
    mensajeDuplicado,
    setMensajeDuplicado,
  ] = useState('')

  const [
    validandoDocumentos,
    setValidandoDocumentos,
  ] = useState(false)

  const [
    documentacionVehiculoValida,
    setDocumentacionVehiculoValida,
  ] = useState(false)

  const [
    mostrarModalDocumentos,
    setMostrarModalDocumentos,
  ] = useState(false)

  const [
    validacionDocumentos,
    setValidacionDocumentos,
  ] = useState(null)

  const [
    kilometraje,
    setKilometraje,
  ] = useState('')

  const [
    mensajeKm,
    setMensajeKm,
  ] = useState('')

  // ============================================================
  // Alerta plan de mantenimiento
  // ============================================================

  const [
    alertaMantenimiento,
    setAlertaMantenimiento,
  ] = useState(null)

  const [
    mostrarAlertaMantenimiento,
    setMostrarAlertaMantenimiento,
  ] = useState(false)

  // ============================================================
  // Formulario
  // ============================================================

  const [
    secciones,
    setSecciones,
  ] = useState({
    revisionExterior: null,
    motor: null,
    interiorFuncionamiento: null,
    equiposPrevencion: null,
    documentos: null,
  })

  const [
    observaciones,
    setObservaciones,
  ] = useState('')

  // ============================================================
  // Modal kilometraje
  // ============================================================

  const [
    mostrarModalKm,
    setMostrarModalKm,
  ] = useState(false)

  const [
    datosKm,
    setDatosKm,
  ] = useState(null)

  const [
    forzarGuardado,
    setForzarGuardado,
  ] = useState(false)

  // ============================================================
  // Guardado
  // ============================================================

  const [
    guardando,
    setGuardando,
  ] = useState(false)

  const [
    mensajeGuardado,
    setMensajeGuardado,
  ] = useState('')

  // ============================================================
  // Cargar sesión
  // ============================================================

  useEffect(() => {
    const storedUser =
      localStorage.getItem(
        'currentUser'
      )

    if (!storedUser) {
      router.push('/login')
      return
    }

    try {
      const parsed =
        JSON.parse(storedUser)

      setUser(parsed)

      const nit =
        parsed?.nitEmpresa ||
        localStorage.getItem(
          'currentEmpresaNit'
        ) ||
        ''

      if (!nit) {
        toast.error(
          'No se encontró el CEA asociado a la sesión.'
        )
        return
      }

      setNitActual(
        String(nit).trim()
      )
    } catch (error) {
      console.error(
        'Error leyendo sesión:',
        error
      )

      localStorage.removeItem(
        'currentUser'
      )

      router.push('/login')
    }
  }, [router])

  // ============================================================
  // Cargar vehículos desde API
  // ============================================================

  useEffect(() => {
    if (!nitActual) return

    const fetchVehiculos =
      async () => {
        setCargandoVehiculos(true)

        try {
          const res =
            await fetch(
              `/api/preoperacionales?nit=${encodeURIComponent(
                nitActual
              )}&recurso=vehiculos`,
              {
                cache: 'no-store',
              }
            )

          const json =
            await res.json()

          if (
            !res.ok ||
            json?.status !==
              'success'
          ) {
            console.error(
              'Error cargando vehículos:',
              json
            )

            toast.error(
              json?.message ||
                'No se pudieron cargar los vehículos.'
            )

            setVehiculos([])
            return
          }

          setVehiculos(
            Array.isArray(
              json.vehiculos
            )
              ? json.vehiculos
              : []
          )
        } catch (error) {
          console.error(
            'Error cargando vehículos:',
            error
          )

          toast.error(
            'No fue posible cargar la lista de vehículos.'
          )

          setVehiculos([])
        } finally {
          setCargandoVehiculos(
            false
          )
        }
      }

    fetchVehiculos()
  }, [nitActual])

  // ============================================================
  // Logout
  // ============================================================

  const handleLogout = () =>
    cerrarSesion(router)

  // ============================================================
  // Correo
  // ============================================================

  const enviarCorreoInspeccion =
    async ({
      para,
      asunto,
      html,
      cc,
      bcc,
    }) => {
      try {
        const res =
          await fetch(
            '/api/email/enviar',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify(
                {
                  para,
                  asunto,
                  html,
                  cc,
                  bcc,
                }
              ),
            }
          )

        const json =
          await res.json()

        if (!json.ok) {
          console.error(
            'Error enviando correo:',
            json.error
          )

          return {
            ok: false,
            error:
              json.error,
          }
        }

        return {
          ok: true,
        }
      } catch (error) {
        console.error(
          'Error enviando correo:',
          error?.message ||
            error
        )

        return {
          ok: false,
          error:
            error?.message ||
            String(error),
        }
      }
    }

  const obtenerDestinatariosMantenimiento =
    () => {
      const correos =
        process.env
          .NEXT_PUBLIC_MAIL_MANTENIMIENTO ||
        ''

      return correos
        .split(',')
        .map((correo) =>
          correo.trim()
        )
        .filter(Boolean)
    }

  // ============================================================
  // Limpiar campos al cambiar placa
  // ============================================================

  const resetPorCambioPlaca =
    () => {
      setKilometraje('')
      setMensajeKm('')

      setSecciones({
        revisionExterior: null,
        motor: null,
        interiorFuncionamiento:
          null,
        equiposPrevencion: null,
        documentos: null,
      })

      setObservaciones('')

      setMostrarModalKm(false)
      setDatosKm(null)
      setForzarGuardado(false)
      setValidandoDocumentos(
        false
      )

      setDocumentacionVehiculoValida(
        false
      )

      setMostrarModalDocumentos(
        false
      )

      setValidacionDocumentos(
        null
      )

      setAlertaMantenimiento(
        null
      )

      setMostrarAlertaMantenimiento(
        false
      )
    }

    // ============================================================
// Validar documentación vehículo
// ============================================================

const validarDocumentacionVehiculo =
  async (
    placa,
    fecha
  ) => {
    if (
      !nitActual ||
      !placa ||
      !fecha
    ) {
      return {
        valido:
          false,
      }
    }

    setValidandoDocumentos(
      true
    )

    setDocumentacionVehiculoValida(
      false
    )

    try {
      const params =
        new URLSearchParams({
          nit:
            nitActual,

          recurso:
            'documentacion_vehiculo',

          placa,

          fecha,
        })

      const res =
        await fetch(
          `/api/preoperacionales?${params.toString()}`,
          {
            cache:
              'no-store',
          }
        )

      const json =
        await res.json()

      if (
        !res.ok ||
        json?.status !==
          'success'
      ) {
        throw new Error(
          json?.message ||
            'No fue posible validar la documentación del vehículo.'
        )
      }

      const valido =
        Boolean(
          json?.valido
        )

      setDocumentacionVehiculoValida(
        valido
      )

      setValidacionDocumentos(
        json
      )

      if (
        !valido
      ) {
        setMostrarModalDocumentos(
          true
        )
      }

      return {
        valido,
        data:
          json,
      }
    } catch (
      error
    ) {
      console.error(
        'Error validando documentación del vehículo:',
        error
      )

      const mensaje =
        error?.message ||
        'No fue posible validar la documentación del vehículo.'

      setDocumentacionVehiculoValida(
        false
      )

      setValidacionDocumentos({
        valido:
          false,

        motivo:
          mensaje,

        documentos_no_vigentes:
          [],
      })

      setMostrarModalDocumentos(
        true
      )

      return {
        valido:
          false,
      }
    } finally {
      setValidandoDocumentos(
        false
      )
    }
  }

  // ============================================================
  // Consultar alerta de mantenimiento
  // ============================================================

  const consultarAlertaMantenimiento =
    async (placa) => {
      if (!nitActual || !placa) {
        return
      }

      try {
        const hoy = new Date()
        const vigencia =
          Number(
            new Intl.DateTimeFormat(
              'en-CA',
              {
                year: 'numeric',
                timeZone:
                  'America/Bogota',
              }
            ).format(hoy)
          )

        const res =
          await fetch(
            `/api/admin/mantenimientos/plan-mantenimiento?vigencia=${vigencia}`,
            {
              cache:
                'no-store',

              headers: {
                'x-cea-nit':
                  nitActual,
              },
            }
          )

        const json =
          await res.json()

        if (
          !res.ok ||
          json?.status !==
            'success'
        ) {
          return
        }

        const vista =
          (
            Array.isArray(
              json?.vehiculos
            )
              ? json.vehiculos
              : []
          ).find(
            item =>
              String(
                item?.vehiculo
                  ?.placa ||
                item?.placa ||
                ''
              )
                .trim()
                .toUpperCase() ===
              String(placa)
                .trim()
                .toUpperCase()
          )

        if (!vista) {
          return
        }

        const vencidos =
          Object.values(
            vista?.meses || {}
          ).flatMap(
            mes =>
              Array.isArray(
                mes?.vencidos
              )
                ? mes.vencidos
                : []
          )

        if (
          vencidos.length >
          0
        ) {
          const punto =
            vencidos[0]

          setAlertaMantenimiento({
            tipo:
              'VENCIDO',

            placa,

            punto:
              punto?.punto ||
              punto?.ciclo ||
              null,

            fecha:
              punto
                ?.fecha_vencimiento ||
              punto
                ?.fecha_debio_realizarse ||
              null,

            kmObjetivo:
              punto?.km_objetivo ||
              punto
                ?.km_debio_realizarse ||
              null,
          })

          setMostrarAlertaMantenimiento(
            true
          )

          return
        }

        const programados =
          Object.values(
            vista?.meses || {}
          ).flatMap(
            mes =>
              Array.isArray(
                mes?.programados
              )
                ? mes.programados
                : []
          )
            .filter(
              punto =>
                punto
                  ?.fecha_proyectada
            )
            .sort(
              (a, b) =>
                String(
                  a.fecha_proyectada
                ).localeCompare(
                  String(
                    b.fecha_proyectada
                  )
                )
            )

        if (
          programados.length ===
          0
        ) {
          return
        }

        const proximo =
          programados[0]

        const hoyTexto =
          formatearBogota(
            new Date(),
            'fecha'
          )

        const inicio =
          new Date(
            `${hoyTexto}T00:00:00-05:00`
          )

        const fechaProgramada =
          new Date(
            `${proximo.fecha_proyectada}T00:00:00-05:00`
          )

        const dias =
          Math.ceil(
            (
              fechaProgramada -
              inicio
            ) /
            86400000
          )

        if (
          dias >= 0 &&
          dias <= 3
        ) {
          setAlertaMantenimiento({
            tipo:
              'PROXIMO',

            placa,

            punto:
              proximo?.punto ||
              proximo?.ciclo ||
              null,

            fecha:
              proximo
                .fecha_proyectada,

            dias,

            kmObjetivo:
              proximo
                ?.km_objetivo ||
              null,
          })

          setMostrarAlertaMantenimiento(
            true
          )
        }
      } catch (error) {
        console.error(
          'Error consultando alerta de mantenimiento:',
          error
        )
      }
    }

  // ============================================================
  // Selección placa
  // ============================================================

  const handlePlacaChange =
    async (e) => {
      const nuevaPlaca =
        e.target.value

      resetPorCambioPlaca()

      setPlacaSeleccionada(
        nuevaPlaca
      )

      if (!nuevaPlaca) {
        setMensajeDuplicado('')

        setVehiculoInfo({
          tipo: '-',
          marca: '-',
        })

        return
      }

      const vehiculo =
        vehiculos.find(
          (item) =>
            item.placa ===
            nuevaPlaca
        )

      setVehiculoInfo({
        tipo:
          vehiculo?.tipo_vehiculo ||
          '-',

        marca:
          vehiculo?.marca ||
          '-',
      })

      if (!nitActual) {
        setMensajeDuplicado(
          'No se identificó el CEA.'
        )
        return
      }

      const { fecha } =
        obtenerFechaHoraBogota()

      // ========================================================
      // VALIDAR DOCUMENTACIÓN ANTES DEL PREOPERACIONAL
      // ========================================================

      const validacionDocumental =
        await validarDocumentacionVehiculo(
          nuevaPlaca,
          fecha
        )

      if (
        !validacionDocumental
          ?.valido
      ) {
        setMensajeDuplicado(
          ''
        )

        return
      }

      // ========================================================
      // VALIDAR INSPECCIÓN DEL DÍA
      // ========================================================

      const resultado =
        await validarInspeccionDuplicada(
          nitActual,
          nuevaPlaca,
          fecha
        )

      setMensajeDuplicado(
        resultado.mensaje
      )
      
      if (resultado.existe) {
        toast.error(
          resultado.mensaje ||
            `Ya existe una inspección hoy para la placa ${nuevaPlaca}.`
        )
      } else {
        toast.message(
          resultado.mensaje ||
            `No existe inspección hoy para ${nuevaPlaca}. Puedes continuar.`
        )
      }

      await consultarAlertaMantenimiento(
        nuevaPlaca
      )
    }

  // ============================================================
  // Kilometraje
  // ============================================================

  const handleKmChange =
    async (e) => {
      const nuevoKm =
        e.target.value

      setKilometraje(
        nuevoKm
      )

      setMensajeKm('')
      setForzarGuardado(false)

      if (
        !nitActual ||
        !placaSeleccionada ||
        nuevoKm === ''
      ) {
        return
      }

      const resultado =
        await validarKilometraje(
          nitActual,
          placaSeleccionada,
          parseInt(
            nuevoKm,
            10
          )
        )

      setMensajeKm(
        resultado.mensaje ||
          ''
      )

      if (
        resultado.estado ===
        'advertencia'
      ) {
        setDatosKm(resultado)
        setMostrarModalKm(true)

        return
      }

      setMostrarModalKm(false)
      setDatosKm(null)

      if (
        resultado.estado ===
        'error'
      ) {
        toast.error(
          resultado.mensaje
        )
      }
    }

  // ============================================================
  // Secciones
  // ============================================================

  const handleSeccionChange = (
    id,
    valor
  ) => {
    setSecciones(
      (prev) => ({
        ...prev,
        [id]: valor,
      })
    )
  }

  // ============================================================
  // Validaciones Guardar
  // ============================================================

  const todoConforme =
    Object.values(
      secciones
    ).every(
      (valor) =>
        valor === 'CONFORME'
    )

  const algunaNoConforme =
    Object.values(
      secciones
    ).includes(
      'NO CONFORME'
    )

  const seccionesCompletas =
    Object.values(
      secciones
    ).every(
      (valor) =>
        valor !== null
    )

  const mensajeKmNormalizado =
  String(
    mensajeKm || ''
  ).toLowerCase()

const kilometrajeValido =
  (
    mensajeKm &&
    !mensajeKmNormalizado.includes(
      'menor'
    ) &&
    !mensajeKmNormalizado.includes(
      'no fue posible'
    ) &&
    !mensajeKmNormalizado.includes(
      'no se identificó'
    ) &&
    !mensajeKmNormalizado.includes(
      'error'
    )
  ) ||
  forzarGuardado

const mensajeDuplicadoNormalizado =
  String(
    mensajeDuplicado || ''
  ).toLowerCase()

const duplicadoValido =
  Boolean(
    mensajeDuplicado
  ) &&
  !mensajeDuplicadoNormalizado.includes(
    'ya existe'
  ) &&
  !mensajeDuplicadoNormalizado.includes(
    'no fue posible'
  ) &&
  !mensajeDuplicadoNormalizado.includes(
    'no se identificó'
  ) &&
  !mensajeDuplicadoNormalizado.includes(
    'error'
  )

const kmNumero =
  Number(kilometraje)

const kilometrajeNumeroValido =
  Number.isFinite(kmNumero) &&
  kmNumero >= 0

const puedeGuardar =
  Boolean(nitActual) &&
  Boolean(
    placaSeleccionada
  ) &&
  documentacionVehiculoValida &&
  !validandoDocumentos &&
  duplicadoValido &&
  kilometrajeValido &&
  kilometrajeNumeroValido &&
  seccionesCompletas &&
  (
    todoConforme ||
    (
      algunaNoConforme &&
      observaciones.trim() !== ''
    )
  )
  // ============================================================
  // Reset total
  // ============================================================

  const resetearEstados =
    () => {
      setPlacaSeleccionada(
        ''
      )

      setVehiculoInfo({
        tipo: '-',
        marca: '-',
      })

      setMensajeDuplicado('')

      resetPorCambioPlaca()

      setMensajeGuardado('')
    }

  // ============================================================
  // Registrar inspección
  // ============================================================

  const handleGuardar =
    async () => {
      if (
        !puedeGuardar ||
        guardando ||
        !user ||
        !nitActual
      ) {
        return
      }

      setGuardando(true)
      setMensajeGuardado('')

      try {
        const {
          fecha,
          hora,
          timestamp,
        } =
          obtenerFechaHoraBogota()

        // ======================================================
        // Reforzar validación duplicado
        // ======================================================

        const dup =
          await validarInspeccionDuplicada(
            nitActual,
            placaSeleccionada,
            fecha
          )

        if (dup.existe) {
          setMensajeGuardado(
            dup.mensaje
          )

          toast.error(
            dup.mensaje
          )

          return
        }

        // ======================================================
        // Vehículo
        // ======================================================

        const vehiculo =
          vehiculos.find(
            (item) =>
              item.placa ===
              placaSeleccionada
          )

        const tipo =
          vehiculo?.tipo_vehiculo ||
          vehiculoInfo.tipo ||
          ''

        const marcaVehiculo =
          vehiculo?.marca ||
          vehiculoInfo.marca ||
          ''

        // ======================================================
        // Observaciones
        // ======================================================

        const hayObs =
          observaciones
            .trim() !== ''

        const estadoObs =
          hayObs
            ? 'PENDIENTE'
            : ''

        // ======================================================
        // Payload
        // ======================================================

        const payload = {
          nit: nitActual,

          accion:
            'registrar',

          timestamp_registro:
            timestamp,

          fecha_registro:
            fecha,

          hora_registro:
            hora,

          placa:
            placaSeleccionada,

          tipo_vehiculo:
            tipo,

          marca:
            marcaVehiculo,

          km_registro:
            Number(
              kilometraje
            ),

          usuario_encargado:
            user?.nombreCompleto ||
            user?.usuario ||
            '',

          revision_exterior:
            secciones
              .revisionExterior,

          motor:
            secciones.motor,

          interior_funcionamiento:
            secciones
              .interiorFuncionamiento,

          equipos_prevencion:
            secciones
              .equiposPrevencion,

          documentos:
            secciones.documentos,

          observaciones:
            hayObs
              ? observaciones.trim()
              : '',

          estado_observacion:
            estadoObs,
        }

        // ======================================================
        // Registrar mediante API
        // ======================================================

        const res =
          await fetch(
            '/api/preoperacionales',
            {
              method: 'POST',

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

        const json =
          await res.json()

        if (
          !res.ok ||
          json?.status !==
            'success'
        ) {
          const mensaje =
            json?.message ||
            'No se pudo guardar la inspección.'

          setMensajeGuardado(
            mensaje
          )

          toast.error(
            mensaje
          )

          return
        }

        const consecutivo =
          json?.consecutivo ||
          json
            ?.preoperacional
            ?.consecutivo ||
          json?.data
            ?.consecutivo ||
          ''

        // ======================================================
        // Correo al instructor
        // ======================================================

        const correoDestino =
          user?.email ||
          ''

        if (correoDestino) {
          const asunto =
            consecutivo
              ? `Confirmación inspección: ${consecutivo}`
              : 'Confirmación inspección preoperacional'

          const html = `
            <p>
              Hola ${
                user?.nombreCompleto ||
                ''
              },
            </p>

            <p>
              Inspección registrada correctamente:
            </p>

            <ul>
              ${
                consecutivo
                  ? `<li><b>Consecutivo:</b> ${consecutivo}</li>`
                  : ''
              }

              <li>
                <b>Placa:</b>
                ${placaSeleccionada}
              </li>

              <li>
                <b>Marca:</b>
                ${marcaVehiculo}
              </li>

              <li>
                <b>Tipo:</b>
                ${tipo}
              </li>

              <li>
                <b>Fecha:</b>
                ${fecha}
              </li>

              <li>
                <b>Hora:</b>
                ${hora}
              </li>

              <li>
                <b>Kilometraje:</b>
                ${kilometraje}
              </li>

              <li>
                <b>Observaciones:</b>
                ${
                  observaciones.trim() ||
                  'Sin observaciones'
                }
              </li>
            </ul>

            <p>
              Gracias por completar tu inspección.
            </p>
          `

          await enviarCorreoInspeccion({
            para:
              correoDestino,
            asunto,
            html,
          })
        }

        // ======================================================
        // Correo mantenimiento cuando existen observaciones
        // ======================================================

        if (hayObs) {
          const destinatarios =
            obtenerDestinatariosMantenimiento()

          if (
            destinatarios.length >
            0
          ) {
            const asuntoM =
              consecutivo
                ? `🚨 Observación en inspección preoperacional: ${placaSeleccionada} (${consecutivo})`
                : `🚨 Observación en inspección preoperacional: ${placaSeleccionada}`

            const htmlM = `
              <p>
                <strong>
                  Se ha registrado una inspección con observaciones para seguimiento.
                </strong>
              </p>

              <ul>
                ${
                  consecutivo
                    ? `<li><strong>Consecutivo:</strong> ${consecutivo}</li>`
                    : ''
                }

                <li>
                  <strong>Placa:</strong>
                  ${placaSeleccionada}
                </li>

                <li>
                  <strong>Tipo de Vehículo:</strong>
                  ${tipo}
                </li>

                <li>
                  <strong>Marca:</strong>
                  ${marcaVehiculo}
                </li>

                <li>
                  <strong>Usuario responsable:</strong>
                  ${
                    user?.nombreCompleto ||
                    ''
                  }
                </li>

                <li>
                  <strong>Fecha:</strong>
                  ${fecha} ${hora}
                </li>

                <li>
                  <strong>Kilometraje:</strong>
                  ${kilometraje}
                </li>
              </ul>

              <p>
                <strong>
                  Observaciones:
                </strong>
                <br>
                ${observaciones.trim()}
              </p>

              <p>
                <em>
                  Correo automático generado por el sistema.
                </em>
              </p>
            `

            await enviarCorreoInspeccion({
              para:
                destinatarios,
              asunto:
                asuntoM,
              html:
                htmlM,
            })
          }
        }

        // ======================================================
        // Éxito
        // ======================================================

        toast.success(
          consecutivo
            ? `Inspección guardada (${placaSeleccionada} • ${consecutivo})`
            : `Inspección guardada (${placaSeleccionada})`,
          {
            duration: 1400,
          }
        )

        setTimeout(() => {
          resetearEstados()

          router.push(
            '/instructor/practica'
          )
        }, 1450)
      } catch (error) {
        console.error(
          'Error inesperado guardando inspección:',
          error
        )

        const mensaje =
          'Error inesperado al guardar la inspección.'

        setMensajeGuardado(
          mensaje
        )

        toast.error(
          mensaje
        )
      } finally {
        setGuardando(false)
      }
    }

  // ============================================================
  // Render
  // ============================================================

  if (!user) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">

      <Toaster
        position="top-center"
        richColors
      />

      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6">

        {/* ====================================================
            TÍTULO
        ==================================================== */}

        <h2 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2 border-b pb-2 text-[var(--primary)]">

          <i className="fas fa-clipboard-check text-[var(--primary)]"></i>

          Inspección Preoperacional

        </h2>

        {/* ====================================================
            USUARIO
        ==================================================== */}

        <div className="bg-gray-50 p-2 rounded mb-4 text-xs border text-center">

          <span>
            Usuario:{' '}
            <strong>
              {user.nombreCompleto}
            </strong>
          </span>

          {user.rol && (
            <span>
              {' '}
              ({user.rol})
            </span>
          )}

          {user.nombreEmpresa && (
            <span className="block mt-1">
              CEA:{' '}
              <strong>
                {user.nombreEmpresa}
              </strong>
            </span>
          )}

        </div>

        {/* ====================================================
            PLACA Y KILOMETRAJE
        ==================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">

          {/* Placa */}

          <div>

            <label className="block text-sm font-semibold mb-1">
              Placa del Vehículo
            </label>

            <select
              className="w-full border p-2 rounded text-sm h-10"
              value={
                placaSeleccionada
              }
              onChange={
                handlePlacaChange
              }
              disabled={
                cargandoVehiculos
              }
            >

              <option value="">
                {cargandoVehiculos
                  ? 'Cargando vehículos...'
                  : '-- Seleccione la Placa --'}
              </option>

              {vehiculos.map(
                (vehiculo) => (
                  <option
                    key={
                      vehiculo.placa
                    }
                    value={
                      vehiculo.placa
                    }
                  >
                    {vehiculo.placa}
                  </option>
                )
              )}

            </select>

            {mensajeDuplicado && (
              <p
                className={`text-xs mt-1 ${
                  mensajeDuplicado.includes(
                    'Ya existe'
                  )
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {mensajeDuplicado}
              </p>
            )}

          </div>

          {/* Kilometraje */}

          <div>

            <label className="block text-sm font-semibold mb-1">
              Kilometraje Actual
            </label>

            <input
              type="number"
              className={`w-full border p-2 rounded text-sm h-10 ${
                (
                !placaSeleccionada ||
                validandoDocumentos ||
                !documentacionVehiculoValida
              )
                ? 'bg-gray-100 cursor-not-allowed'
                : ''
              }`}
              min="0"
              value={kilometraje}
              onChange={
                handleKmChange
              }
              disabled={
                !placaSeleccionada ||
                validandoDocumentos ||
                !documentacionVehiculoValida
              }
            />

            {mensajeKm && (
              <p
                className={`text-xs mt-1 ${
                  mensajeKm
                    .toLowerCase()
                    .includes(
                      'menor'
                    )
                    ? 'text-red-600'
                    : mensajeKm
                        .toLowerCase()
                        .includes(
                          'supera'
                        )
                    ? 'text-orange-600'
                    : 'text-green-600'
                }`}
              >
                {mensajeKm}
              </p>
            )}

          </div>

        </div>

        {/* ====================================================
            INFO VEHÍCULO
        ==================================================== */}

        <div className="text-xs mb-6 px-2">

          <p>
            <strong>
              Tipo de Vehículo:
            </strong>{' '}
            {vehiculoInfo.tipo}
          </p>

          <p>
            <strong>
              Marca:
            </strong>{' '}
            {vehiculoInfo.marca}
          </p>

        </div>

        {/* ====================================================
            SECCIONES
        ==================================================== */}

        {[
          {
            id:
              'revisionExterior',
            title:
              'SECCIÓN 1: REVISIÓN EXTERIOR',
            desc:
              'Verifique carrocería, faros, llantas, espejos, limpiaparabrisas, etc.',
          },
          {
            id:
              'motor',
            title:
              'SECCIÓN 2: MOTOR',
            desc:
              'Verifique niveles de fluidos, fugas, batería, correas, cadena (en motos).',
          },
          {
            id:
              'interiorFuncionamiento',
            title:
              'SECCIÓN 3: INTERIOR Y FUNCIONAMIENTO',
            desc:
              'Verifique cinturones, asientos, luces, tablero.',
          },
          {
            id:
              'equiposPrevencion',
            title:
              'SECCIÓN 4: EQUIPOS DE PREVENCIÓN Y SEGURIDAD',
            desc:
              'Kit carretera, casco, señalización, banderín.',
          },
          {
            id:
              'documentos',
            title:
              'SECCIÓN 5: DOCUMENTOS',
            desc:
              'SOAT, RTM, licencia, tarjeta de servicio, certificado instructor, cédula.',
          },
        ].map(
          (section) => (

            <div
              key={section.id}
              className="bg-gray-50 border border-gray-300 rounded-lg mb-4 shadow-sm"
            >

              <div className="bg-black text-white text-sm font-semibold px-3 py-2 rounded-t-lg">

                {section.title}

              </div>

              <div className="p-3">

                <p className="text-xs text-gray-700 mb-2">
                  {section.desc}
                </p>

                <div className="flex gap-6 text-sm">

                  <label>

                    <input
                    type="radio"
                    name={
                      section.id
                    }
                    value="CONFORME"
                    checked={
                      secciones[
                        section.id
                      ] ===
                      'CONFORME'
                    }
                    onChange={() =>
                      handleSeccionChange(
                        section.id,
                        'CONFORME'
                      )
                    }
                    disabled={
                      !placaSeleccionada ||
                      validandoDocumentos ||
                      !documentacionVehiculoValida
                    }
                    className="
                      mr-1
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  />

                    CONFORME

                  </label>

                  <label>

                    <input
                    type="radio"
                    name={
                      section.id
                    }
                    value="NO CONFORME"
                    checked={
                      secciones[
                        section.id
                      ] ===
                      'NO CONFORME'
                    }
                    onChange={() =>
                      handleSeccionChange(
                        section.id,
                        'NO CONFORME'
                      )
                    }
                    disabled={
                      !placaSeleccionada ||
                      validandoDocumentos ||
                      !documentacionVehiculoValida
                    }
                    className="
                      mr-1
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  />

                    NO CONFORME

                  </label>

                </div>

              </div>

            </div>
          )
        )}

        {/* ====================================================
            OBSERVACIONES
        ==================================================== */}

        <div className="mt-4">

          <label className="block mb-1 font-semibold text-sm">
            Observaciones
          </label>

          <textarea
            rows="3"
            className={`w-full border p-2 rounded text-sm ${
              !algunaNoConforme
                ? 'bg-gray-100 cursor-not-allowed'
                : ''
            }`}
            value={
              observaciones
            }
            onChange={(e) =>
              setObservaciones(
                e.target.value
              )
            }
            disabled={
              !algunaNoConforme
            }
          />

          {algunaNoConforme &&
            observaciones
              .trim() === '' && (

              <p className="text-xs text-red-600 mt-1">
                Debes ingresar observaciones para las secciones NO CONFORME.
              </p>

            )}

        </div>

        {/* ====================================================
            MENSAJE GUARDADO
        ==================================================== */}

        {mensajeGuardado && (

          <div className="mt-4 text-sm text-red-700">
            {mensajeGuardado}
          </div>

        )}

        {/* ====================================================
            BOTONES
        ==================================================== */}

        <div className="mt-8 space-y-4">

          <div className="flex justify-center">

            <button
              onClick={
                handleGuardar
              }
              disabled={
                !puedeGuardar ||
                guardando
              }
              className={`py-2 px-6 rounded-lg shadow-md flex items-center gap-2 text-sm ${
                puedeGuardar &&
                !guardando
                  ? 'bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white'
                  : 'bg-gray-400 text-gray-700 cursor-not-allowed'
              }`}
            >

              <i className="fas fa-save"></i>

              {guardando
                ? 'Guardando...'
                : 'Guardar'}

            </button>

          </div>

          <div className="flex justify-center gap-3 flex-wrap">

            <button
              onClick={() =>
                router.push(
                  '/instructor/practica'
                )
              }
              className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 rounded-lg shadow-md flex items-center gap-2 text-sm"
            >

              <i className="fas fa-arrow-left"></i>

              Regresar

            </button>

            <button
              onClick={
                handleLogout
              }
              className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 px-4 rounded-lg shadow-md flex items-center gap-2 text-sm"
            >

              <i className="fas fa-sign-out-alt"></i>

              Cerrar Sesión

            </button>

          </div>

        </div>

      </div>

      {/* ======================================================
    MODAL DOCUMENTACIÓN VEHÍCULO
====================================================== */}

{mostrarModalDocumentos &&
  validacionDocumentos && (

  <div
    className="
      fixed
      inset-0
      z-[70]
      bg-black/60
      flex
      items-center
      justify-center
      p-4
    "
  >
    <div
      className="
        w-full
        max-w-md
        bg-white
        rounded-xl
        shadow-2xl
        overflow-hidden
        border
        border-red-300
      "
    >
      {/* CABECERA */}

      <div
        className="
          bg-red-50
          border-b
          border-red-200
          px-5
          py-4
          flex
          items-center
          gap-3
        "
      >
        <div
          className="
            w-11
            h-11
            shrink-0
            rounded-full
            bg-red-100
            text-red-700
            flex
            items-center
            justify-center
            text-lg
          "
        >
          <i className="fas fa-triangle-exclamation"></i>
        </div>

        <div>
          <p
            className="
              text-[9px]
              uppercase
              tracking-wide
              font-black
              text-red-600
            "
          >
            Vehículo no habilitado
          </p>

          <h3
            className="
              text-[15px]
              font-black
              text-gray-900
            "
          >
            Documentación no vigente
          </h3>
        </div>
      </div>

      {/* CONTENIDO */}

      <div className="px-5 py-5">

        <p
          className="
            text-sm
            text-gray-800
            font-semibold
            text-center
          "
        >
          La placa{' '}
          <strong>
            {placaSeleccionada}
          </strong>{' '}
          no puede operar hasta que su documentación se encuentre vigente.
        </p>

        {validacionDocumentos
          ?.documentos_no_vigentes
          ?.length > 0 && (

          <div
            className="
              mt-4
              border
              border-red-200
              bg-red-50
              rounded-lg
              overflow-hidden
            "
          >
            {validacionDocumentos
              .documentos_no_vigentes
              .map(
                documento => (

                <div
                  key={
                    documento.id ||
                    documento.documento
                  }
                  className="
                    px-3
                    py-3
                    border-b
                    last:border-b-0
                    border-red-100
                  "
                >
                  <div
                    className="
                      flex
                      justify-between
                      gap-3
                      text-xs
                    "
                  >
                    <strong
                      className="
                        text-red-700
                      "
                    >
                      {
                        documento
                          ?.documento ||
                        'Documento'
                      }
                    </strong>

                    <span
                      className="
                        font-bold
                        text-gray-700
                      "
                    >
                      Vigencia:{' '}
                      {
                        documento
                          ?.fecha_vigencia ||
                        'No registrada'
                      }
                    </span>
                  </div>
                </div>

              )
            )}
          </div>
        )}

        <div
          className="
            mt-4
            bg-amber-50
            border
            border-amber-200
            rounded-lg
            p-3
          "
        >
          <p
            className="
              text-[11px]
              leading-5
              text-gray-800
            "
          >
            Si el documento ya fue renovado y se encuentra vigente,
            debe realizar la actualización de la información desde el menú
            <strong> Actualizar Documentos</strong>.
          </p>

          <p
            className="
              text-[11px]
              leading-5
              text-red-700
              font-bold
              mt-2
            "
          >
            Mientras no exista un documento actualizado y vigente,
            este vehículo no podrá operar.
          </p>
        </div>

        {validacionDocumentos
          ?.motivo && (

          <p
            className="
              mt-3
              text-[10px]
              text-gray-500
              text-center
            "
          >
            {
              validacionDocumentos
                .motivo
            }
          </p>
        )}

        <div
          className="
            mt-5
            flex
            justify-center
          "
        >
          <button
            type="button"
            onClick={() =>
              setMostrarModalDocumentos(
                false
              )
            }
            className="
              min-w-[130px]
              bg-slate-800
              hover:bg-slate-900
              text-white
              rounded-lg
              px-4
              py-2.5
              text-xs
              font-black
            "
          >
            <i className="fas fa-check mr-2"></i>
            ENTENDIDO
          </button>
        </div>

      </div>
    </div>
  </div>
)}        
      
      {/* ======================================================
          MODAL ALERTA PLAN DE MANTENIMIENTO
      ====================================================== */}

      {mostrarAlertaMantenimiento &&
        alertaMantenimiento && (

        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-amber-300 bg-white shadow-2xl">

            <div className="border-b border-amber-200 bg-amber-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <i className="fas fa-screwdriver-wrench"></i>
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-amber-700">
                    Plan de mantenimiento
                  </p>

                  <h3 className="text-[15px] font-black text-gray-900">
                    {alertaMantenimiento.tipo === 'VENCIDO'
                      ? 'Mantenimiento vencido'
                      : 'Mantenimiento próximo'}
                  </h3>
                </div>
              </div>
            </div>

            <div className="px-5 py-5">
              <p className="text-sm text-gray-800">
                El vehículo{' '}
                <strong>
                  {alertaMantenimiento.placa}
                </strong>{' '}
                presenta un mantenimiento{' '}
                {alertaMantenimiento.tipo === 'VENCIDO'
                  ? 'vencido'
                  : 'próximo a su fecha estimada'}.
              </p>

              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-gray-800">
                <p>
                  <strong>Punto:</strong>{' '}
                  P{alertaMantenimiento.punto || '—'}
                </p>

                <p className="mt-1">
                  <strong>
                    {alertaMantenimiento.tipo === 'VENCIDO'
                      ? 'Fecha de referencia:'
                      : 'Fecha estimada:'}
                  </strong>{' '}
                  {alertaMantenimiento.fecha || '—'}
                </p>

                {alertaMantenimiento.kmObjetivo != null && (
                  <p className="mt-1">
                    <strong>Kilometraje objetivo:</strong>{' '}
                    {Number(
                      alertaMantenimiento.kmObjetivo
                    ).toLocaleString('es-CO')}{' '}
                    km
                  </p>
                )}

                {alertaMantenimiento.tipo === 'PROXIMO' && (
                  <p className="mt-1 font-bold text-amber-800">
                    Faltan aproximadamente{' '}
                    {alertaMantenimiento.dias === 0
                      ? 'menos de un día'
                      : `${alertaMantenimiento.dias} día${
                          alertaMantenimiento.dias === 1
                            ? ''
                            : 's'
                        }`}.
                  </p>
                )}
              </div>

              <p className="mt-4 text-xs leading-5 text-gray-700">
                Consulte la información completa desde la opción
                <strong> Plan de Mantenimiento</strong> disponible en el
                menú de Instructor Práctica.
              </p>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMostrarAlertaMantenimiento(
                      false
                    )
                  }
                  className="rounded-lg bg-gray-600 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
                >
                  Continuar inspección
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/instructor/practica/plan-mantenimiento?placa=${encodeURIComponent(
                        alertaMantenimiento.placa
                      )}`
                    )
                  }
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--primary-dark)]"
                >
                  <i className="fas fa-calendar-check mr-2"></i>
                  Ver plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL KILOMETRAJE
      ====================================================== */}

      {mostrarModalKm &&
        datosKm && (

        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">

          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">

            <h3 className="text-lg font-bold mb-4 text-red-600">
              Advertencia de Kilometraje
            </h3>

            <p className="text-sm mb-2">
              El kilometraje ingresado{' '}
              <strong>
                {kilometraje}
              </strong>{' '}
              supera en más de 300 km el último registrado.
            </p>

            <p className="text-sm mb-2">

              <strong>
                Último registro:
              </strong>{' '}

              {datosKm.maxKm} km

            </p>

            <p className="text-sm mb-2">

              <strong>
                Fuente:
              </strong>{' '}

              {datosKm.fuente}{' '}
              ({datosKm.campo})

            </p>

            <p className="text-sm mb-4">

              Diferencia:{' '}

              <strong>
                {datosKm.diferencia} km
              </strong>

            </p>

            <div className="flex justify-end gap-3">

              <button
                onClick={() => {
                  setMostrarModalKm(
                    false
                  )

                  setDatosKm(null)
                  setForzarGuardado(
                    false
                  )
                }}
                className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >

                Cancelar

              </button>

              <button
                onClick={() => {
                  setMostrarModalKm(
                    false
                  )

                  setForzarGuardado(
                    true
                  )
                }}
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded"
              >

                Confirmar y Continuar

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}