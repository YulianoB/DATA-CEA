// app/instructor/practica/horarios/page.js

'use client'

import { useRouter } from 'next/navigation'
import {
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react'
import {
  Toaster,
  toast,
} from 'sonner'
import {
  validarKilometraje,
} from '@/lib/servicios/validaciones'
import {
  cerrarSesion,
} from '@/lib/auth/logout'

const formatoKm = (valor) => String(valor ?? '').replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const formatoMensajeKm = (mensaje) => String(mensaje || '').replace(/\b\d{4,}\b/g, (n) => Number(n).toLocaleString('es-CO'))

// ============================================================
// Helpers Bogotá
// ============================================================

const fmtBogota = (
  date,
  mode
) => {
  const opts =
    mode === 'fecha'
      ? {
          year:
            'numeric',
          month:
            '2-digit',
          day:
            '2-digit',
          timeZone:
            'America/Bogota',
        }
      : {
          hour:
            '2-digit',
          minute:
            '2-digit',
          second:
            '2-digit',
          hour12:
            false,
          timeZone:
            'America/Bogota',
        }

  return new Intl.DateTimeFormat(
    'en-CA',
    opts
  ).format(
    date
  )
}

const ahoraBogota = () => {
  const now =
    new Date()

  const fecha =
    fmtBogota(
      now,
      'fecha'
    )

  const hora =
    fmtBogota(
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

const calcDuracionHoras = (
  clasesDictadas
) => {
  const n =
    Number(
      clasesDictadas ||
      0
    )

  const horas =
    (n * 50) / 60

  return (
    Math.round(
      horas * 10
    ) / 10
  )
}

const fmtHM = (
  min
) => {
  const m =
    Math.max(
      0,
      Math.floor(
        Number(
          min
        ) ||
        0
      )
    )

  if (
    m < 60
  ) {
    return `${m} ${
      m === 1
        ? 'minuto'
        : 'minutos'
    }`
  }

  const h =
    Math.floor(
      m / 60
    )

  const r =
    m % 60

  const parteH =
    `${h} ${
      h === 1
        ? 'hora'
        : 'horas'
    }`

  const parteM =
    r > 0
      ? ` ${r} ${
          r === 1
            ? 'minuto'
            : 'minutos'
        }`
      : ''

  return `${parteH}${parteM}`
}

// ============================================================
// Página
// ============================================================

export default function HorariosPracticaPage() {
  const router =
    useRouter()
  const [modalHorario, setModalHorario] = useState(null)
  const kmInicialRef = useRef(null)
  const kmFinalRef = useRef(null)
  const solicitudInicialRef = useRef(0)
  const solicitudFinalRef = useRef(0)
  const [kmInicialValidado, setKmInicialValidado] = useState('')
  const [kmFinalValidado, setKmFinalValidado] = useState('')
  const [validandoKmInicial, setValidandoKmInicial] = useState(false)
  const [validandoKmFinal, setValidandoKmFinal] = useState(false)

  const [
    user,
    setUser,
  ] =
    useState(
      null
    )

  const [
    nitActual,
    setNitActual,
  ] =
    useState(
      ''
    )

  // ==========================================================
  // Documentación instructor
  // ==========================================================

  const [
    validandoDocumentosInstructor,
    setValidandoDocumentosInstructor,
  ] =
    useState(
      false
    )

  const [
    documentacionInstructorValida,
    setDocumentacionInstructorValida,
  ] =
    useState(
      false
    )

  const [
    validacionDocumentosInstructor,
    setValidacionDocumentosInstructor,
  ] =
    useState(
      null
    )

  const [
    mostrarModalDocumentosInstructor,
    setMostrarModalDocumentosInstructor,
  ] =
    useState(
      false
    )

  // ==========================================================
  // Vehículos
  // ==========================================================

  const [
    vehiculos,
    setVehiculos,
  ] =
    useState(
      []
    )

  const [
    cargandoVehiculos,
    setCargandoVehiculos,
  ] =
    useState(
      false
    )

  const [
    placa,
    setPlaca,
  ] =
    useState(
      ''
    )

  const [
    vehiculoInfo,
    setVehiculoInfo,
  ] =
    useState({
      tipo:
        '-',
      marca:
        '-',
    })

  // ==========================================================
  // Jornada abierta
  // ==========================================================

  const [
    tengoAbierta,
    setTengoAbierta,
  ] =
    useState(
      false
    )

  const [
    registroAbierto,
    setRegistroAbierto,
  ] =
    useState(
      null
    )

  // ==========================================================
  // Entrada
  // ==========================================================

  const [
    inspeccionOk,
    setInspeccionOk,
  ] =
    useState(
      false
    )

  const [
    kmInicial,
    setKmInicial,
  ] =
    useState(
      ''
    )

  const [
    clasesProg,
    setClasesProg,
  ] =
    useState(
      ''
    )

  const [
    msgKmInicial,
    setMsgKmInicial,
  ] =
    useState(
      ''
    )

  const [
    forzarKmInicial,
    setForzarKmInicial,
  ] =
    useState(
      false
    )

  // ==========================================================
  // Salida
  // ==========================================================

  const [
    kmFinal,
    setKmFinal,
  ] =
    useState(
      ''
    )

  const [
    clasesDictadas,
    setClasesDictadas,
  ] =
    useState(
      ''
    )

  const [
    numAprendices,
    setNumAprendices,
  ] =
    useState(
      ''
    )

  const [
    msgKmFinal,
    setMsgKmFinal,
  ] =
    useState(
      ''
    )

  const [
    forzarKmFinal,
    setForzarKmFinal,
  ] =
    useState(
      false
    )

  // ==========================================================
  // Modales
  // ==========================================================

  const [
    modalKm,
    setModalKm,
  ] =
    useState(
      null
    )

  const [
    modalPlacaEnUso,
    setModalPlacaEnUso,
  ] =
    useState(
      null
    )

  // ==========================================================
  // Estado
  // ==========================================================

  const [
    guardando,
    setGuardando,
  ] =
    useState(
      false
    )

  const [
    tick,
    setTick,
  ] =
    useState(
      0
    )

  // ==========================================================
  // Reloj
  // ==========================================================

  useEffect(
    () => {
      const intervalo =
        setInterval(
          () =>
            setTick(
              (
                valor
              ) =>
                valor +
                1
            ),
          30000
        )

      return () =>
        clearInterval(
          intervalo
        )
    },
    []
  )

  // ==========================================================
  // Cargar sesión
  // ==========================================================

  useEffect(
    () => {
      const storedUser =
        localStorage.getItem(
          'currentUser'
        )

      if (
        !storedUser
      ) {
        router.push(
          '/login'
        )

        return
      }

      try {
        const parsed =
          JSON.parse(
            storedUser
          )

        setUser(
          parsed
        )

        const nit =
          parsed
            ?.nitEmpresa ||
          localStorage.getItem(
            'currentEmpresaNit'
          ) ||
          ''

        if (
          !nit
        ) {
          toast.error(
            'No se encontró el CEA asociado a la sesión.'
          )

          return
        }

        setNitActual(
          String(
            nit
          ).trim()
        )
      } catch (
        error
      ) {
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
    },
    [
      router,
    ]
  )

  // ==========================================================
  // Validar documentación del instructor
  // ==========================================================

  useEffect(
    () => {
      if (
        !nitActual ||
        !user
      ) {
        return
      }

      const validarDocumentos =
        async () => {
          const documento =
            String(
              user
                ?.documento ||
              ''
            ).trim()

          if (
            !documento
          ) {
            setDocumentacionInstructorValida(
              false
            )

            setValidacionDocumentosInstructor({
              valido:
                false,

              motivo:
                'No fue posible identificar el documento del instructor.',

              detalle:
                [],
            })

            setMostrarModalDocumentosInstructor(
              true
            )

            return
          }

          setValidandoDocumentosInstructor(
            true
          )

          setDocumentacionInstructorValida(
            false
          )

          try {
            const {
              fecha,
            } =
              ahoraBogota()

            const params =
              new URLSearchParams({
                nit:
                  nitActual,

                recurso:
                  'documentacion_instructor',

                documento,

                fecha,
              })

            const res =
              await fetch(
                `/api/horarios?${params.toString()}`,
                {
                  cache:
                    'no-store',
                }
              )

            const json =
              await res.json()

            if (
              !res.ok ||
              json
                ?.status !==
                'success'
            ) {
              throw new Error(
                json
                  ?.message ||
                'No fue posible validar la documentación del instructor.'
              )
            }

            const valido =
              Boolean(
                json
                  ?.valido
              )

            setDocumentacionInstructorValida(
              valido
            )

            setValidacionDocumentosInstructor(
              json
            )

            if (
              !valido
            ) {
              setMostrarModalDocumentosInstructor(
                true
              )
            }
          } catch (
            error
          ) {
            console.error(
              'Error validando documentación del instructor:',
              error
            )

            setDocumentacionInstructorValida(
              false
            )

            setValidacionDocumentosInstructor({
              valido:
                false,

              motivo:
                error
                  ?.message ||
                'No fue posible validar la documentación del instructor.',

              detalle:
                [],
            })

            setMostrarModalDocumentosInstructor(
              true
            )
          } finally {
            setValidandoDocumentosInstructor(
              false
            )
          }
        }

      validarDocumentos()
    },
    [
      nitActual,
      user,
    ]
  )

  // ==========================================================
  // Cargar vehículos
  // ==========================================================

  useEffect(
    () => {
      if (
        !nitActual
      ) {
        return
      }

      const cargarVehiculos =
        async () => {
          setCargandoVehiculos(
            true
          )

          try {
            const res =
              await fetch(
                `/api/horarios?nit=${encodeURIComponent(
                  nitActual
                )}&recurso=vehiculos`,
                {
                  cache:
                    'no-store',
                }
              )

            const json =
              await res.json()

            if (
              !res.ok ||
              json
                ?.status !==
                'success'
            ) {
              toast.error(
                json
                  ?.message ||
                'No fue posible cargar los vehículos.'
              )

              setVehiculos(
                []
              )

              return
            }

            setVehiculos(
              Array.isArray(
                json
                  .vehiculos
              )
                ? json
                    .vehiculos
                : []
            )
          } catch (
            error
          ) {
            console.error(
              'Error cargando vehículos:',
              error
            )

            toast.error(
              'No fue posible cargar los vehículos.'
            )

            setVehiculos(
              []
            )
          } finally {
            setCargandoVehiculos(
              false
            )
          }
        }

      cargarVehiculos()
    },
    [
      nitActual,
    ]
  )

  // ==========================================================
  // Consultar jornada abierta
  // ==========================================================

  useEffect(
    () => {
      if (
        !nitActual ||
        !user
      ) {
        return
      }

      const consultarJornada =
        async () => {
          try {
            const {
              fecha,
            } =
              ahoraBogota()

            const usuario =
              user
                ?.usuario ||
              user
                ?.documento ||
              ''

            const res =
              await fetch(
                `/api/horarios?nit=${encodeURIComponent(
                  nitActual
                )}&recurso=jornada_abierta&usuario=${encodeURIComponent(
                  usuario
                )}&fecha=${encodeURIComponent(
                  fecha
                )}`,
                {
                  cache:
                    'no-store',
                }
              )

            const json =
              await res.json()

            if (
              !res.ok ||
              json
                ?.status !==
                'success'
            ) {
              console.error(
                'Error consultando jornada:',
                json
              )

              return
            }

            const jornada =
              json
                ?.jornada ||
              null

            if (
              jornada
            ) {
              setTengoAbierta(
                true
              )

              setRegistroAbierto(
                jornada
              )

              setPlaca(
                jornada
                  .placa ||
                ''
              )
            } else {
              setTengoAbierta(
                false
              )

              setRegistroAbierto(
                null
              )
            }
          } catch (
            error
          ) {
            console.error(
              'Error consultando jornada abierta:',
              error
            )
          }
        }

      consultarJornada()
    },
    [
      nitActual,
      user,
    ]
  )

  // ==========================================================
  // Autocompletar vehículo
  // ==========================================================

  useEffect(
    () => {
      if (
        !placa
      ) {
        setVehiculoInfo({
          tipo:
            '-',
          marca:
            '-',
        })

        return
      }

      const vehiculo =
        vehiculos.find(
          (
            item
          ) =>
            item
              .placa ===
            placa
        )

      setVehiculoInfo({
        tipo:
          vehiculo
            ?.tipo_vehiculo ||
          '-',

        marca:
          vehiculo
            ?.marca ||
          '-',
      })
    },
    [
      placa,
      vehiculos,
    ]
  )

  // ==========================================================
  // Correo
  // ==========================================================

  const enviarCorreo =
    async ({
      para,
      asunto,
      html,
    }) => {
      if (
        !para
      ) {
        return
      }

      try {
        const res =
          await fetch(
            '/api/email/enviar',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  para,
                  asunto,
                  html,
                }),
            }
          )

        const json =
          await res.json()

        if (
          !json
            ?.ok
        ) {
          console.error(
            'Error enviando correo:',
            json
              ?.error
          )
        }
      } catch (
        error
      ) {
        console.error(
          'Error enviando correo:',
          error
        )
      }
    }

  // ==========================================================
  // Selección placa
  // ==========================================================

  const handlePlacaChange =
    async (
      e
    ) => {
      const nueva =
        e
          .target
          .value

      setPlaca(
        nueva
      )

      setInspeccionOk(
        false
      )

      setKmInicial(
        ''
      )

      setClasesProg(
        ''
      )

      setMsgKmInicial(
        ''
      )

      setForzarKmInicial(
        false
      )

      setModalPlacaEnUso(
        null
      )

      if (
        !nueva ||
        !nitActual ||
        !documentacionInstructorValida
      ) {
        return
      }

      const {
        fecha,
      } =
        ahoraBogota()

      // ========================================================
      // 1. VALIDAR PLACA EN USO
      // ========================================================

      try {
        const resUso =
          await fetch(
            `/api/horarios?nit=${encodeURIComponent(
              nitActual
            )}&recurso=placa_en_uso&placa=${encodeURIComponent(
              nueva
            )}&fecha=${encodeURIComponent(
              fecha
            )}`,
            {
              cache:
                'no-store',
            }
          )

        const jsonUso =
          await resUso.json()

        if (
          !resUso.ok ||
          jsonUso
            ?.status !==
            'success'
        ) {
          toast.error(
            jsonUso
              ?.message ||
            'No fue posible validar si la placa está en uso.'
          )

          return
        }

        if (
          jsonUso
            ?.enUso
        ) {
          setModalPlacaEnUso({
            instructor:
              jsonUso
                .enUso
                .nombre_completo ||
              'Instructor no identificado',

            hora:
              jsonUso
                .enUso
                .hora_entrada ||
              '--:--:--',
          })

          toast.error(
            `La placa ${nueva} ya está siendo utilizada.`
          )

          return
        }
      } catch (
        error
      ) {
        console.error(
          'Error validando placa en uso:',
          error
        )

        toast.error(
          'No fue posible validar la placa.'
        )

        return
      }

      // ========================================================
      // 2. VALIDAR PREOPERACIONAL DEL DÍA
      // ========================================================

      try {
        const resPre =
          await fetch(
            `/api/horarios?nit=${encodeURIComponent(
              nitActual
            )}&recurso=preoperacional&placa=${encodeURIComponent(
              nueva
            )}&fecha=${encodeURIComponent(
              fecha
            )}`,
            {
              cache:
                'no-store',
            }
          )

        const jsonPre =
          await resPre.json()

        if (
          !resPre.ok ||
          jsonPre
            ?.status !==
            'success'
        ) {
          toast.error(
            jsonPre
              ?.message ||
            'No fue posible validar la inspección preoperacional.'
          )

          return
        }

        const existe =
          Boolean(
            jsonPre
              .existe
          )

        setInspeccionOk(
          existe
        )

        if (
          existe
        ) {
          toast.success(
            `Inspección de hoy encontrada para ${nueva}.`
          )
        } else {
          toast.warning(
            `No existe inspección preoperacional de hoy para ${nueva}.`
          )
        }
      } catch (
        error
      ) {
        console.error(
          'Error validando preoperacional:',
          error
        )

        toast.error(
          'No fue posible validar la inspección preoperacional.'
        )
      }
    }

  // ==========================================================
  // Kilometraje entrada
  // ==========================================================

  const onKmInicialChange = (e) => {
    solicitudInicialRef.current += 1
    setKmInicial(e.target.value.replace(/\D/g, ''))
    setMsgKmInicial('')
    setForzarKmInicial(false)
    setKmInicialValidado('')
    setValidandoKmInicial(false)
    setModalKm(null)
  }

  const onKmInicialBlur = async () => {
    const valor = kmInicial.trim()
    if (!nitActual || !placa || !valor || kmInicialValidado === valor) return
    const solicitud = ++solicitudInicialRef.current
    setValidandoKmInicial(true)
    try {
      const resultado = await validarKilometraje(nitActual, placa, Number(valor))
      if (solicitud !== solicitudInicialRef.current) return
      setMsgKmInicial(resultado?.mensaje || '')
      setKmInicialValidado(valor)
      if (resultado.estado === 'error') {
        toast.error(formatoMensajeKm(resultado.mensaje || 'No fue posible validar el kilometraje.'))
      } else if (resultado.estado === 'advertencia') {
        setModalKm({
          titulo: 'Advertencia de kilometraje (entrada)',
          tipo: 'entrada',
          kilometraje: valor,
          maxKm: resultado.maxKm,
          diferencia: resultado.diferencia,
          fuente: resultado.fuente,
          campo: resultado.campo,
          onConfirm: () => {
            setForzarKmInicial(true)
            setModalKm(null)
          },
        })
      }
    } catch {
      if (solicitud !== solicitudInicialRef.current) return
      setMsgKmInicial('No fue posible validar el kilometraje.')
      setKmInicialValidado('')
      toast.error('No fue posible validar el kilometraje.')
    } finally {
      if (solicitud === solicitudInicialRef.current) setValidandoKmInicial(false)
    }
  }

  const onKmFinalChange = (e) => {
    solicitudFinalRef.current += 1
    setKmFinal(e.target.value.replace(/\D/g, ''))
    setMsgKmFinal('')
    setForzarKmFinal(false)
    setKmFinalValidado('')
    setValidandoKmFinal(false)
    setModalKm(null)
  }

  const onKmFinalBlur = async () => {
    const valor = kmFinal.trim()
    if (!nitActual || !placa || !valor || kmFinalValidado === valor) return
    const solicitud = ++solicitudFinalRef.current
    setValidandoKmFinal(true)
    try {
      const resultado = await validarKilometraje(nitActual, placa, Number(valor))
      if (solicitud !== solicitudFinalRef.current) return
      setMsgKmFinal(resultado?.mensaje || '')
      setKmFinalValidado(valor)
      if (resultado.estado === 'error') {
        toast.error(formatoMensajeKm(resultado.mensaje || 'No fue posible validar el kilometraje.'))
      } else if (resultado.estado === 'advertencia') {
        setModalKm({
          titulo: 'Advertencia de kilometraje (salida)',
          tipo: 'salida',
          kilometraje: valor,
          maxKm: resultado.maxKm,
          diferencia: resultado.diferencia,
          fuente: resultado.fuente,
          campo: resultado.campo,
          onConfirm: () => {
            setForzarKmFinal(true)
            setModalKm(null)
          },
        })
      }
    } catch {
      if (solicitud !== solicitudFinalRef.current) return
      setMsgKmFinal('No fue posible validar el kilometraje.')
      setKmFinalValidado('')
      toast.error('No fue posible validar el kilometraje.')
    } finally {
      if (solicitud === solicitudFinalRef.current) setValidandoKmFinal(false)
    }
  }

  // ==========================================================
  // Valores numéricos
  // ==========================================================

  const clasesNum =
    useMemo(
      () => {
        const numero =
          Number(
            clasesDictadas
          )

        return Number.isFinite(
          numero
        )
          ? numero
          : NaN
      },
      [
        clasesDictadas,
      ]
    )

  const aprendicesNum =
    useMemo(
      () => {
        const numero =
          Number(
            numAprendices
          )

        return Number.isFinite(
          numero
        )
          ? numero
          : NaN
      },
      [
        numAprendices,
      ]
    )

  const kmFinalNum =
    useMemo(
      () => {
        const numero =
          Number(
            kmFinal
          )

        return Number.isFinite(
          numero
        )
          ? numero
          : NaN
      },
      [
        kmFinal,
      ]
    )

  // ==========================================================
  // Tiempo mínimo
  // ==========================================================

  const minutosMinimos =
    useMemo(
      () => {
        if (
          !Number.isFinite(
            clasesNum
          ) ||
          clasesNum <
            0
        ) {
          return 0
        }

        return (
          clasesNum *
          45
        )
      },
      [
        clasesNum,
      ]
    )

  const minutosTranscurridos =
    useMemo(
      () => {
        if (
          !registroAbierto
            ?.timestamp_entrada
        ) {
          return 0
        }

        const inicio =
          new Date(
            registroAbierto
              .timestamp_entrada
          ).getTime()

        if (
          !Number.isFinite(
            inicio
          )
        ) {
          return 0
        }

        const diferencia =
          Math.max(
            0,
            Date.now() -
              inicio
          )

        return Math.floor(
          diferencia /
          60000
        )
      },
      [
        registroAbierto
          ?.timestamp_entrada,
        tick,
      ]
    )

  const tiempoOk =
    minutosTranscurridos >=
    minutosMinimos

  const faltanMin =
    Math.max(
      0,
      minutosMinimos -
        minutosTranscurridos
    )

  const txtMinimos =
    fmtHM(
      minutosMinimos
    )

  const txtTrans =
    fmtHM(
      minutosTranscurridos
    )

  const txtFaltan =
    fmtHM(
      faltanMin
    )

  // ==========================================================
  // Habilitar entrada
  // ==========================================================

  const puedeRegistrarEntrada =
    useMemo(
      () => {
        if (
          !nitActual ||
          !documentacionInstructorValida ||
          validandoDocumentosInstructor ||
          !placa ||
          !inspeccionOk ||
          tengoAbierta
        ) {
          return false
        }

        const mensaje =
          String(
            msgKmInicial ||
            ''
          ).toLowerCase()

        const kmOk =
          (
            msgKmInicial &&
            !mensaje.includes(
              'menor'
            ) &&
            !mensaje.includes(
              'no fue posible'
            ) &&
            !mensaje.includes(
              'no se identificó'
            ) &&
            !mensaje.includes(
              'error'
            )
          ) ||
          forzarKmInicial

        const clasesNumero =
          Number(
            clasesProg
          )

        const clasesOk =
          clasesProg !==
            '' &&
          Number.isInteger(
            clasesNumero
          ) &&
          clasesNumero >=
            1

        return (
          kmOk &&
          !validandoKmInicial &&
          kmInicialValidado !== '' && kmInicialValidado === kmInicial &&
          !modalKm &&
          (!String(msgKmInicial).toLowerCase().includes('supera') || forzarKmInicial) &&
          clasesOk
        )
      },
      [
        nitActual,
        documentacionInstructorValida,
        validandoDocumentosInstructor,
        placa,
        inspeccionOk,
        tengoAbierta,
        msgKmInicial,
        forzarKmInicial,
        validandoKmInicial, kmInicialValidado, kmInicial, modalKm,
        clasesProg,
      ]
    )

  // ==========================================================
  // Habilitar salida
  // ==========================================================

  const puedeRegistrarSalida =
    useMemo(
      () => {
        if (
          !nitActual ||
          !tengoAbierta ||
          !registroAbierto
        ) {
          return false
        }

        const kmInicialRegistro =
          Number(
            registroAbierto
              .km_inicial ||
            0
          )

        const reglaKm =
          Number.isFinite(
            kmFinalNum
          ) &&
          kmFinalNum >=
            kmInicialRegistro

        const reglaClases =
          clasesDictadas !==
            '' &&
          Number.isFinite(
            clasesNum
          ) &&
          Number.isInteger(
            clasesNum
          ) &&
          clasesNum >=
            0 &&
          clasesNum <=
            12

        const reglaAprendices =
          numAprendices !==
            '' &&
          Number.isFinite(
            aprendicesNum
          ) &&
          Number.isInteger(
            aprendicesNum
          ) &&
          aprendicesNum >=
            0 &&
          aprendicesNum <=
            6

        const mensaje =
          String(
            msgKmFinal ||
            ''
          ).toLowerCase()

        const kmOk =
          (
            msgKmFinal &&
            !mensaje.includes(
              'menor'
            ) &&
            !mensaje.includes(
              'no fue posible'
            ) &&
            !mensaje.includes(
              'no se identificó'
            ) &&
            !mensaje.includes(
              'error'
            )
          ) ||
          forzarKmFinal

        return (
          reglaKm &&
          reglaClases &&
          reglaAprendices &&
          kmOk &&
          !validandoKmFinal &&
          kmFinalValidado !== '' && kmFinalValidado === kmFinal &&
          !modalKm &&
          (!String(msgKmFinal).toLowerCase().includes('supera') || forzarKmFinal) &&
          tiempoOk
        )
      },
      [
        nitActual,
        tengoAbierta,
        registroAbierto,
        kmFinalNum,
        msgKmFinal,
        forzarKmFinal,
        validandoKmFinal, kmFinalValidado, kmFinal, modalKm,
        clasesDictadas,
        clasesNum,
        numAprendices,
        aprendicesNum,
        tiempoOk,
      ]
    )

  // ==========================================================
  // Registrar entrada
  // ==========================================================

  const registrarEntrada =
    async () => {
      if (
        !puedeRegistrarEntrada ||
        guardando ||
        !user ||
        !nitActual
      ) {
        return
      }

      setGuardando(
        true
      )

      try {
        const {
          fecha,
          hora,
          timestamp,
        } =
          ahoraBogota()

        const payload = {
          nit:
            nitActual,

          accion:
            'entrada',

          timestamp_entrada:
            timestamp,

          fecha_entrada:
            fecha,

          hora_entrada:
            hora,

          usuario:
            user
              ?.usuario ||
            user
              ?.documento ||
            '',

          documento_instructor:
            user
              ?.documento ||
            '',

          nombre_completo:
            user
              ?.nombreCompleto ||
            '',

          placa,

          km_inicial:
            Number(
              kmInicial
            ),

          clases_programadas:
            Number(
              clasesProg
            ),
        }

        const res =
          await fetch(
            '/api/horarios',
            {
              method:
                'POST',

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
          json
            ?.status !==
            'success'
        ) {
          if (
            json
              ?.codigo ===
            'INSTRUCTOR_DOCUMENTACION_NO_VIGENTE'
          ) {
            setDocumentacionInstructorValida(
              false
            )

            setValidacionDocumentosInstructor({
              valido:
                false,

              motivo:
                json
                  ?.message ||
                'La documentación del instructor no está vigente.',

              detalle:
                Array.isArray(
                  json
                    ?.detalle
                )
                  ? json
                      .detalle
                  : [],
            })

            setMostrarModalDocumentosInstructor(
              true
            )
          }

          toast.error(
            json
              ?.message ||
            'No se pudo registrar la entrada.'
          )

          return
        }

        const jornada =
          json
            ?.jornada ||
          null

        if (
          user
            ?.email
        ) {
          const asunto =
            `Entrada práctica confirmada - ${fecha}`

          const html = `
            <p>Hola ${
              user.nombreCompleto ||
              ''
            },</p>

            <p>Tu jornada de práctica fue abierta correctamente.</p>

            <ul>
              <li><b>Fecha:</b> ${fecha}</li>
              <li><b>Hora:</b> ${hora}</li>
              <li><b>Placa:</b> ${placa}</li>
              <li><b>Kilometraje inicial:</b> ${kmInicial}</li>
              <li><b>Clases programadas:</b> ${clasesProg}</li>
            </ul>
          `

          await enviarCorreo({
            para:
              user
                .email,
            asunto,
            html,
          })
        }

        if (
          jornada
        ) {
          setTengoAbierta(
            true
          )

          setRegistroAbierto(
            jornada
          )
        }

        toast.success(
          'Entrada registrada correctamente.',
          {
            duration:
              1200,
          }
        )

        setTimeout(
          () => {
            router.push(
              '/instructor/practica'
            )
          },
          1250
        )
      } catch (
        error
      ) {
        console.error(
          'Error registrando entrada:',
          error
        )

        toast.error(
          'Error inesperado al registrar la entrada.'
        )
      } finally {
        setGuardando(
          false
        )
      }
    }

  // ==========================================================
  // Registrar salida
  // ==========================================================

  const registrarSalida =
    async () => {
      if (
        !puedeRegistrarSalida ||
        guardando ||
        !user ||
        !nitActual ||
        !registroAbierto
      ) {
        return
      }

      setGuardando(
        true
      )

      try {
        const {
          fecha,
          hora,
          timestamp,
        } =
          ahoraBogota()

        const duracion =
          calcDuracionHoras(
            clasesDictadas
          )

        const payload = {
          nit:
            nitActual,

          accion:
            'salida',

          id:
            registroAbierto
              .id,

          timestamp_salida:
            timestamp,

          fecha_salida:
            fecha,

          hora_salida:
            hora,

          km_final:
            Number(
              kmFinal
            ),

          clases_dictadas:
            Number(
              clasesDictadas
            ),

          num_aprendices:
            Number(
              numAprendices
            ),
        }

        const res =
          await fetch(
            '/api/horarios',
            {
              method:
                'POST',

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
          json
            ?.status !==
            'success'
        ) {
          toast.error(
            json
              ?.message ||
            'No se pudo registrar la salida.'
          )

          return
        }

        if (
          user
            ?.email
        ) {
          const asunto =
            `Salida práctica confirmada - ${fecha}`

          const html = `
            <p>Hola ${
              user.nombreCompleto ||
              ''
            },</p>

            <p>Tu jornada de práctica fue cerrada correctamente.</p>

            <ul>
              <li><b>Fecha salida:</b> ${fecha}</li>
              <li><b>Hora salida:</b> ${hora}</li>
              <li><b>Placa:</b> ${registroAbierto.placa}</li>
              <li><b>Km inicial:</b> ${registroAbierto.km_inicial}</li>
              <li><b>Km final:</b> ${kmFinal}</li>
              <li><b>Clases dictadas:</b> ${clasesDictadas}</li>
              <li><b>Aprendices:</b> ${numAprendices}</li>
              <li><b>Duración (h):</b> ${duracion}</li>
            </ul>
          `

          await enviarCorreo({
            para:
              user
                .email,
            asunto,
            html,
          })
        }

        toast.success(
          'Salida registrada correctamente.',
          {
            duration:
              1200,
          }
        )

        setTengoAbierta(
          false
        )

        setRegistroAbierto(
          null
        )

        setPlaca(
          ''
        )

        setVehiculoInfo({
          tipo:
            '-',
          marca:
            '-',
        })

        setKmFinal(
          ''
        )

        setClasesDictadas(
          ''
        )

        setNumAprendices(
          ''
        )

        setMsgKmFinal(
          ''
        )

        setForzarKmFinal(
          false
        )

        setInspeccionOk(
          false
        )

        setKmInicial(
          ''
        )

        setClasesProg(
          ''
        )

        setMsgKmInicial(
          ''
        )

        setForzarKmInicial(
          false
        )

        setTimeout(
          () => {
            router.push(
              '/instructor/practica'
            )
          },
          1250
        )
      } catch (
        error
      ) {
        console.error(
          'Error registrando salida:',
          error
        )

        toast.error(
          'Error inesperado al registrar la salida.'
        )
      } finally {
        setGuardando(
          false
        )
      }
    }

  // ==========================================================
  // Logout
  // ==========================================================

  const handleLogout =
    () =>
      cerrarSesion(
        router
      )

  // ==========================================================
  // Render
  // ==========================================================

  if (
    !user
  ) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-slate-100 p-3 sm:p-6">

      <Toaster
        position="top-center"
        richColors
      />

      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl p-4 sm:p-6">

        <header className="-mx-4 -mt-4 mb-6 bg-[#194567] px-5 py-5 text-white sm:-mx-6 sm:-mt-6 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15"><i className="fas fa-calendar-alt text-2xl" aria-hidden="true"></i></span>
            <div><p className="text-[11px] font-bold uppercase tracking-widest text-sky-200">Instructor · Práctica</p><h1 className="text-xl font-bold sm:text-2xl">Registro de horarios</h1><p className="mt-1 text-xs text-slate-200">Control de entrada y salida de la jornada</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-white/20 pt-3 text-xs text-slate-100">
            <span>Usuario: <strong className="text-white">{user.nombreCompleto}</strong></span>
            {user.rol && <span>Rol: <strong className="text-white">{user.rol}</strong></span>}
            {user.nombreEmpresa && <span>CEA: <strong className="text-white">{user.nombreEmpresa}</strong></span>}
          </div>
        </header>

        {!tengoAbierta && (
          <button type="button" onClick={() => setModalHorario('entrada')} className="mx-auto mb-6 flex min-h-44 w-full max-w-sm flex-col rounded-xl border-2 border-slate-500 bg-[#367DA8] p-4 text-left text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">
            <i className="fas fa-sign-in-alt mb-3 text-3xl" aria-hidden="true"></i>
            <span className="text-xs font-bold tracking-wide text-sky-100">REGISTRO DE HORARIOS</span>
            <span className="mt-2 text-lg font-bold">Registrar entrada</span>
            <span className="mt-2 text-sm text-slate-100">Abrir formulario de ingreso a la jornada práctica</span>
            <span className="mt-auto pt-3 text-sm font-semibold">Tocar para registrar <i className="fas fa-chevron-right ml-1" aria-hidden="true"></i></span>
          </button>
        )}

        {!tengoAbierta && modalHorario === 'entrada' && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-3 sm:p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-modal-entrada" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-300 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-[#194567] px-5 py-4 text-white">
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><i className="fas fa-sign-in-alt text-xl" aria-hidden="true"></i></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Jornada práctica</p><h2 id="titulo-modal-entrada" className="text-lg font-bold">Registro de entrada</h2><p className="text-xs text-slate-200">Datos de inicio de la jornada</p></div></div>
              <button type="button" onClick={() => setModalHorario(null)} aria-label="Cerrar formulario de entrada" className="rounded-lg border border-white/40 px-3 py-2 text-xs font-semibold hover:bg-white/10">Cerrar ✕</button>
            </div>
          <div className="border rounded-lg shadow-sm">

            <h3 className="bg-slate-100 text-[#194567] font-bold px-4 py-3 flex items-center gap-2 text-sm border-b border-slate-200">

              <i className="fas fa-sign-in-alt text-green-300"></i>

              Registrar Horario de Entrada

            </h3>

            <div className="p-4 space-y-4">

              {!validandoDocumentosInstructor &&
                !documentacionInstructorValida && (

                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs font-semibold">

                  <i className="fas fa-ban mr-2"></i>

                  El formulario está bloqueado hasta que la licencia de INSTRUCTOR y la licencia de CONDUCCIÓN estén vigentes.

                </div>

              )}

              {validandoDocumentosInstructor && (

                <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-3 py-2 text-xs font-semibold">

                  <i className="fas fa-spinner fa-spin mr-2"></i>

                  Validando documentación del instructor...

                </div>

              )}

              <div>

                <label className="block mb-1 font-semibold text-sm">
                  Placa del Vehículo
                </label>

                <select
                  className={`w-full border p-2 rounded text-sm ${
                    (
                      validandoDocumentosInstructor ||
                      !documentacionInstructorValida
                    )
                      ? 'bg-gray-100 cursor-not-allowed'
                      : ''
                  }`}
                  value={
                    placa
                  }
                  onChange={
                    handlePlacaChange
                  }
                  disabled={
                    cargandoVehiculos ||
                    validandoDocumentosInstructor ||
                    !documentacionInstructorValida
                  }
                >

                  <option value="">
                    {cargandoVehiculos
                      ? 'Cargando vehículos...'
                      : validandoDocumentosInstructor
                      ? 'Validando documentación...'
                      : !documentacionInstructorValida
                      ? 'Documentación no vigente'
                      : '-- Seleccione la Placa --'}
                  </option>

                  {vehiculos.map(
                    (
                      vehiculo
                    ) => (

                      <option
                        key={
                          vehiculo
                            .placa
                        }
                        value={
                          vehiculo
                            .placa
                        }
                      >
                        {
                          vehiculo
                            .placa
                        }
                      </option>

                    )
                  )}

                </select>

              </div>

              <div className="text-xs bg-gray-50 border rounded p-2">

                <p>
                  <strong>
                    Tipo de Vehículo:
                  </strong>{' '}

                  {
                    vehiculoInfo
                      .tipo
                  }
                </p>

                <p>
                  <strong>
                    Marca:
                  </strong>{' '}

                  {
                    vehiculoInfo
                      .marca
                  }
                </p>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className="block mb-1 font-semibold text-sm">
                    Kilometraje Inicial
                  </label>

                  <input
                    ref={kmInicialRef}
                    type="text"
                    inputMode="numeric"
                    className={`w-full border p-2 rounded text-sm ${
                      (
                        !documentacionInstructorValida ||
                        validandoDocumentosInstructor ||
                        !placa ||
                        !inspeccionOk
                      )
                        ? 'bg-gray-100 cursor-not-allowed'
                        : ''
                    }`}
                    value={
                      formatoKm(kmInicial)
                    }
                    onBlur={onKmInicialBlur}
                    onChange={
                      onKmInicialChange
                    }
                    disabled={
                      !documentacionInstructorValida ||
                      validandoDocumentosInstructor ||
                      !placa ||
                      !inspeccionOk
                    }
                  />

                  {msgKmInicial && (

                    <small
                      className={`text-xs mt-1 block ${
                        msgKmInicial
                          .toLowerCase()
                          .includes(
                            'menor'
                          )
                          ? 'text-red-600'
                          : msgKmInicial
                              .toLowerCase()
                              .includes(
                                'supera'
                              )
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}
                    >
                      {
                        formatoMensajeKm(msgKmInicial)
                      }
                    </small>

                  )}

                </div>

                <div>

                  <label className="block mb-1 font-semibold text-sm">
                    Clases Programadas
                  </label>

                  <input
                    type="number"
                    min="1"
                    className={`w-full border p-2 rounded text-sm ${
                      (
                        !documentacionInstructorValida ||
                        validandoDocumentosInstructor ||
                        !placa ||
                        !inspeccionOk
                      )
                        ? 'bg-gray-100 cursor-not-allowed'
                        : ''
                    }`}
                    value={
                      clasesProg
                    }
                    onChange={
                      (
                        e
                      ) =>
                        setClasesProg(
                          e
                            .target
                            .value
                        )
                    }
                    disabled={
                      !documentacionInstructorValida ||
                      validandoDocumentosInstructor ||
                      !placa ||
                      !inspeccionOk
                    }
                  />

                </div>

              </div>

              <div className="flex justify-center">

                <button
                  onClick={
                    registrarEntrada
                  }
                  disabled={
                    !puedeRegistrarEntrada ||
                    guardando
                  }
                  className={`py-2 px-6 rounded-lg shadow-md text-sm flex items-center gap-2 ${
                    puedeRegistrarEntrada &&
                    !guardando
                      ? 'bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white'
                      : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  }`}
                >

                  <i className="fas fa-save"></i>

                  {guardando
                    ? 'Guardando...'
                    : 'Registrar Entrada'}

                </button>

              </div>

            </div>

          </div>
          </div>
          </div>
        )}

        {tengoAbierta && registroAbierto && (
          <button type="button" onClick={() => setModalHorario('salida')} className="mx-auto mb-6 flex min-h-44 w-full max-w-sm flex-col rounded-xl border-2 border-slate-500 bg-[#367DA8] p-4 text-left text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">
            <i className="fas fa-sign-out-alt mb-3 text-3xl" aria-hidden="true"></i>
            <span className="text-xs font-bold tracking-wide text-sky-100">REGISTRO DE HORARIOS</span>
            <span className="mt-2 text-lg font-bold">Registrar salida</span>
            <span className="mt-2 text-sm text-slate-100">Abrir formulario de finalización de la jornada práctica</span>
            <span className="mt-auto pt-3 text-sm font-semibold">Tocar para registrar <i className="fas fa-chevron-right ml-1" aria-hidden="true"></i></span>
          </button>
        )}

        {tengoAbierta && registroAbierto && modalHorario === 'salida' && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-3 sm:p-4" role="presentation">
            <div role="dialog" aria-modal="true" aria-labelledby="titulo-modal-salida" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-[#194567] px-4 py-3 text-white">
                <h2 id="titulo-modal-salida" className="text-base font-bold">Registro de salida</h2>
                <button type="button" onClick={() => setModalHorario(null)} aria-label="Cerrar formulario de salida" className="rounded-lg border border-white/40 px-3 py-1.5 text-sm">Cerrar</button>
              </div>
          <div className="border rounded-lg shadow-sm">

            <h3 className="bg-[var(--primary-dark)] text-white font-semibold px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm">

              <i className="fas fa-sign-out-alt text-red-300"></i>

              Registrar Horario de Salida

            </h3>

            <div className="p-4 space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-gray-50 border rounded p-2">

                <p>
                  <strong>
                    Fecha Entrada:
                  </strong>{' '}

                  {
                    registroAbierto
                      .fecha_entrada ||
                    '-'
                  }
                </p>

                <p>
                  <strong>
                    Hora Entrada:
                  </strong>{' '}

                  {
                    registroAbierto
                      .hora_entrada ||
                    '-'
                  }
                </p>

                <p>
                  <strong>
                    Placa:
                  </strong>{' '}

                  {
                    registroAbierto
                      .placa ||
                    '-'
                  }
                </p>

                <p>
                  <strong>
                    Km Inicial:
                  </strong>{' '}

                  {
                    registroAbierto
                      .km_inicial ??
                    '-'
                  }
                </p>

                <p>
                  <strong>
                    Clases Programadas:
                  </strong>{' '}

                  {
                    registroAbierto
                      .clases_programadas ??
                    '-'
                  }
                </p>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div>

                  <label className="block mb-1 font-semibold text-sm">
                    Kilometraje Final
                  </label>

                  <input
                    ref={kmFinalRef}
                    type="text"
                    inputMode="numeric"
                    className="w-full border p-2 rounded text-sm"
                    data-min={
                      registroAbierto
                        .km_inicial ??
                      0
                    }
                    value={
                      formatoKm(kmFinal)
                    }
                    onBlur={onKmFinalBlur}
                    onChange={
                      onKmFinalChange
                    }
                  />

                  {msgKmFinal && (

                    <small
                      className={`text-xs mt-1 block ${
                        msgKmFinal
                          .toLowerCase()
                          .includes(
                            'menor'
                          )
                          ? 'text-red-600'
                          : msgKmFinal
                              .toLowerCase()
                              .includes(
                                'supera'
                              )
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}
                    >
                      {
                        formatoMensajeKm(msgKmFinal)
                      }
                    </small>

                  )}

                </div>

                <div>

                  <label className="block mb-1 font-semibold text-sm">
                    Clases Dictadas
                  </label>

                  <input
                    type="number"
                    className="w-full border p-2 rounded text-sm"
                    min="0"
                    max="12"
                    value={
                      clasesDictadas
                    }
                    onChange={
                      (
                        e
                      ) =>
                        setClasesDictadas(
                          e
                            .target
                            .value
                        )
                    }
                  />

                  {Number.isFinite(
                    clasesNum
                  ) &&
                    clasesNum >
                      12 && (

                      <small className="text-red-600 text-xs">
                        No puede superar{' '}
                        <b>
                          12
                        </b>{' '}
                        clases al día.
                      </small>

                    )}

                </div>

                <div>

                  <label className="block mb-1 font-semibold text-sm">
                    Número de Aprendices
                  </label>

                  <input
                    type="number"
                    className="w-full border p-2 rounded text-sm"
                    min="0"
                    max="6"
                    value={
                      numAprendices
                    }
                    onChange={
                      (
                        e
                      ) =>
                        setNumAprendices(
                          e
                            .target
                            .value
                        )
                    }
                  />

                  {Number.isFinite(
                    aprendicesNum
                  ) &&
                    aprendicesNum >
                      6 && (

                      <small className="text-red-600 text-xs">
                        No puede superar{' '}
                        <b>
                          6
                        </b>{' '}
                        aprendices.
                      </small>

                    )}

                </div>

              </div>

              <div className="text-sm">

                {Number.isFinite(
                  clasesNum
                ) &&
                clasesNum >
                  0 ? (

                  tiempoOk ? (

                    <span className="inline-block bg-green-100 text-green-700 border border-green-300 rounded px-3 py-1">

                      ✓ Tiempo mínimo cumplido (
                      <b>
                        {
                          txtMinimos
                        }
                      </b>
                      ).

                    </span>

                  ) : (

                    <span className="inline-block bg-yellow-100 text-yellow-800 border border-yellow-300 rounded px-3 py-1">

                      Para registrar la salida deben transcurrir al menos{' '}

                      <b>
                        {
                          txtMinimos
                        }
                      </b>
                      .{' '}

                      Transcurridos:{' '}

                      <b>
                        {
                          txtTrans
                        }
                      </b>
                      .{' '}

                      Faltan:{' '}

                      <b>
                        {
                          txtFaltan
                        }
                      </b>
                      .

                    </span>

                  )

                ) : (

                  <span className="text-gray-500">
                    Indique cuántas clases dictó para calcular el tiempo mínimo.
                  </span>

                )}

              </div>

              <div className="flex justify-center">

                <button
                  onClick={
                    registrarSalida
                  }
                  disabled={
                    !puedeRegistrarSalida ||
                    guardando
                  }
                  className={`py-2 px-6 rounded-lg shadow-md text-sm flex items-center gap-2 ${
                    puedeRegistrarSalida &&
                    !guardando
                      ? 'bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white'
                      : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  }`}
                >

                  <i className="fas fa-save"></i>

                  {guardando
                    ? 'Guardando...'
                    : 'Registrar Salida'}

                </button>

              </div>

            </div>

          </div>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4 mt-8 flex-wrap">

          <button
            onClick={
              () =>
                router.push(
                  '/instructor/practica'
                )
            }
            className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 rounded-lg shadow-md text-sm"
          >

            <i className="fas fa-arrow-left mr-2"></i>

            Regresar

          </button>

          <button
            onClick={
              handleLogout
            }
            className="bg-[var(--danger)] hover:bg-red-800 text-white py-2 px-4 rounded-lg shadow-md text-sm"
          >

            <i className="fas fa-sign-out-alt mr-2"></i>

            Cerrar Sesión

          </button>

        </div>

      </div>

      {/* ======================================================
          MODAL DOCUMENTACIÓN INSTRUCTOR
          ====================================================== */}

          {mostrarModalDocumentosInstructor &&
          validacionDocumentosInstructor && (

          <div
            className="
              fixed
              inset-0
              z-[70]
              bg-black/60
              flex
              items-center
              justify-center
              p-3
            "
          >

            <div
              className="
                w-full
                max-w-sm
                max-h-[88vh]
                bg-white
                rounded-xl
                shadow-2xl
                border
                border-red-300
                flex
                flex-col
                overflow-hidden
              "
            >

              {/* CABECERA */}
              <div
                className="
                  bg-red-50
                  border-b
                  border-red-200
                  px-4
                  py-3
                  flex
                  items-center
                  gap-3
                  shrink-0
                "
              >

                <div
                  className="
                    w-9
                    h-9
                    shrink-0
                    rounded-full
                    bg-red-100
                    text-red-700
                    flex
                    items-center
                    justify-center
                    text-base
                  "
                >
                  <i className="fas fa-triangle-exclamation"></i>
                </div>

                <div className="min-w-0">

                  <p className="text-[8px] uppercase tracking-wide font-black text-red-600">
                    Instructor no habilitado
                  </p>

                  <h3 className="text-sm font-black text-gray-900">
                    Documentación no vigente
                  </h3>

                </div>

              </div>

              {/* CONTENIDO CON SCROLL */}
              <div
                className="
                  px-4
                  py-3
                  overflow-y-auto
                  flex-1
                "
              >

                <p className="text-xs text-gray-800 font-semibold text-center leading-5">
                  No puede iniciar una jornada de práctica hasta que sus documentos se encuentren vigentes.
                </p>

                {Array.isArray(
                  validacionDocumentosInstructor
                    ?.detalle
                ) &&
                  validacionDocumentosInstructor
                    .detalle
                    .length >
                    0 && (

                  <div className="mt-3 space-y-2">

                    {validacionDocumentosInstructor
                      .detalle
                      .map(
                        (
                          documento
                        ) => (

                          <div
                            key={
                              documento
                                .tipo
                            }
                            className="
                              border
                              border-gray-200
                              rounded-lg
                              px-3
                              py-2
                              flex
                              justify-between
                              items-center
                              gap-2
                            "
                          >

                            <div className="min-w-0">

                              <p className="text-[11px] font-black text-gray-800">
                                {
                                  documento
                                    .tipo
                                }
                              </p>

                              <p className="text-[9px] text-gray-500 mt-0.5">
                                Vigencia:{' '}

                                <strong>
                                  {
                                    documento
                                      ?.vigencia ||
                                    'No registrada'
                                  }
                                </strong>
                              </p>

                              {documento
                                ?.categoria && (

                                <p className="text-[9px] text-gray-500">
                                  Categoría:{' '}

                                  <strong>
                                    {
                                      documento
                                        .categoria
                                    }
                                  </strong>
                                </p>

                              )}

                            </div>

                            <span
                              className={`
                                shrink-0
                                text-[9px]
                                font-black
                                rounded-full
                                px-2
                                py-1
                                ${
                                  documento
                                    ?.vigente
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }
                              `}
                            >

                              {documento
                                ?.vigente
                                ? 'VIGENTE'
                                : documento
                                    ?.registrado
                                ? 'VENCIDA'
                                : 'NO REGISTRADA'}

                            </span>

                          </div>

                        )
                      )}

                  </div>

                )}

                <div
                  className="
                    mt-3
                    bg-amber-50
                    border
                    border-amber-200
                    rounded-lg
                    p-2.5
                  "
                >

                  <p className="text-[10px] leading-4 text-gray-800">
                    Si el documento ya fue renovado, actualice la información desde
                    <strong>
                      {' '}
                      Actualizar Documentos
                    </strong>
                    .
                  </p>

                  <p className="text-[10px] leading-4 text-red-700 font-bold mt-1.5">
                    Mientras exista una licencia o certificado vencido, no podrá iniciar su jornada.
                  </p>

                </div>

                {validacionDocumentosInstructor
                  ?.motivo && (

                  <p className="mt-2 text-[9px] text-gray-500 text-center leading-4">
                    {
                      validacionDocumentosInstructor
                        .motivo
                    }
                  </p>

                )}

              </div>

              {/* BOTÓN FIJO ABAJO */}
              <div
                className="
                  border-t
                  bg-white
                  px-4
                  py-3
                  shrink-0
                "
              >

                <button
                  type="button"
                  onClick={
                    () =>
                      setMostrarModalDocumentosInstructor(
                        false
                      )
                  }
                  className="
                    w-full
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

                  CERRAR

                </button>

              </div>

            </div>

          </div>

        )}

      {/* ======================================================
          MODAL PLACA EN USO
      ====================================================== */}

      {modalPlacaEnUso && (

        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">

          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">

            <h3 className="text-lg font-bold mb-2 text-red-600">
              Placa en uso
            </h3>

            <p className="text-sm mb-2">
              Ya existe una jornada abierta con esta placa.
            </p>

            <p className="text-sm mb-1">

              <b>
                Instructor:
              </b>{' '}

              {
                modalPlacaEnUso
                  .instructor
              }

            </p>

            <p className="text-sm mb-4">

              <b>
                Hora entrada:
              </b>{' '}

              {
                modalPlacaEnUso
                  .hora
              }

            </p>

            <div className="flex justify-end">

              <button
                onClick={
                  () =>
                    setModalPlacaEnUso(
                      null
                    )
                }
                className="bg-gray-600 hover:bg-gray-800 text-white px-4 py-2 rounded"
              >

                Entendido

              </button>

            </div>

          </div>

        </div>

      )}

      {/* ======================================================
          MODAL KILOMETRAJE
      ====================================================== */}

      {modalKm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="titulo-alerta-km" className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-2xl">
            <div className="flex items-start gap-3 bg-amber-50 px-5 py-4 border-b border-amber-200">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><i className="fas fa-exclamation-triangle text-xl" aria-hidden="true"></i></span>
              <div><p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Validación de kilometraje</p><h3 id="titulo-alerta-km" className="mt-1 text-base font-bold text-slate-900">{modalKm.titulo}</h3><p className="mt-1 text-xs text-amber-800">Se requiere su confirmación para continuar.</p></div>
            </div>
            <div className="space-y-4 px-5 py-5">
              <p className="text-sm leading-relaxed text-slate-700">El kilometraje ingresado supera en más de <strong>300 km</strong> el último registro del vehículo.</p>
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div><p className="text-xs text-slate-500">Kilometraje ingresado</p><p className="font-bold text-[#194567]">{formatoKm(modalKm.kilometraje)} km</p></div>
                <div><p className="text-xs text-slate-500">Último registro</p><p className="font-bold text-slate-900">{formatoKm(modalKm.maxKm)} km</p></div>
                <div><p className="text-xs text-slate-500">Diferencia</p><p className="font-bold text-amber-700">{formatoKm(modalKm.diferencia)} km</p></div>
                <div><p className="text-xs text-slate-500">Fuente</p><p className="font-semibold text-slate-800">{modalKm.fuente || '-'} {modalKm.campo ? '(' + modalKm.campo + ')' : ''}</p></div>
              </div>
              <p className="text-xs text-slate-600">Si el valor es incorrecto, seleccione Cancelar para corregirlo. Si es correcto, confirme expresamente.</p>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => { const tipo = modalKm.tipo; setModalKm(null); requestAnimationFrame(() => (tipo === 'entrada' ? kmInicialRef : kmFinalRef).current?.focus()) }} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancelar y corregir</button>
                <button type="button" onClick={() => modalKm.onConfirm?.()} className="rounded-lg bg-[#194567] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12344f]">Confirmar y continuar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}