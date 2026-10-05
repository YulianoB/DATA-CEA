// app/admin/caja/egresos/components/RegistrarEgresoDrawer.jsx
'use client'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  BotonAgregar,
  BotonEditar,
  BotonGuardar,
  BotonCancelar,
  BotonImprimir,
  BotonAccion,
  BotonActualizar,
  ContenedorModulo,
  MarcoTabla,
  ESTILO_SECCIONES,
  ESTILO_SECCIONES_SECUNDARIAS,
} from '@/components/admin/EstiloModulo'
import ModalResultado from '@/components/admin/ModalResultado'

// =========================================================
// HELPERS
// =========================================================
function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}
function mayusculas(
  valor
) {
  return texto(
    valor
  ).toUpperCase()
}
function hoyColombia() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'America/Bogota',
      year:
        'numeric',
      month:
        '2-digit',
      day:
        '2-digit',
    }
  ).format(
    new Date()
  )
}
function formatearMoneda(
  valor
) {
  return new Intl.NumberFormat(
    'es-CO',
    {
      style:
        'currency',
      currency:
        'COP',
      minimumFractionDigits:
        0,
      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      valor ||
      0
    )
  )
}
function nombreCompletoPersonal(
  persona
) {
  return (
    persona?.nombre_completo ||
    [
      persona?.nombres,
      persona?.apellidos,
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      )
      .trim() ||
    '-'
  )
}
function descripcionVehiculo(
  vehiculo
) {
  const partes = [
    mayusculas(
      vehiculo?.placa
    ),
    mayusculas(
      vehiculo?.tipo_vehiculo
    ),
    mayusculas(
      vehiculo?.marca
    ),
    mayusculas(
      vehiculo?.linea
    ),
    texto(
      vehiculo?.modelo
    ),
  ].filter(
    Boolean
  )
  return partes.join(
    ' · '
  )
}
// =========================================================
// FORMULARIO INICIAL
// =========================================================
function formularioInicial() {
  return {
    fecha:
      hoyColombia(),
    concepto_id:
      '',
    medio_pago_id:
      '',
    valor:
      '',
    modalidad:
      'PAGO_DIRECTO',
    tipo_beneficiario:
      'FUNCIONARIO',
    personal_id:
      '',
    beneficiario:
      '',
    tipo_documento_beneficiario:
      'CC',
    documento_beneficiario:
      '',
    cargo_beneficiario:
      '',
    vehiculo_id:
      '',
    placa:
      '',
    descripcion:
      '',
    numero_factura:
      '',
    referencia_pago:
      '',
    observaciones:
      '',
  }
}
function conceptoInicial() {
  return {
    nombre:
      '',
    descripcion:
      '',
    naturaleza:
      'EGRESO',
    requiere_aprendiz:
      false,
    requiere_vehiculo:
      false,
    es_gasto_pesv:
      false,
    categoria_pesv:
      '',
  }
}
const CATEGORIAS_PESV = [
  { value: 'MANTENIMIENTO_SEGURIDAD', label: 'Mantenimiento y seguridad vehicular' },
  { value: 'CAPACITACION', label: 'Capacitación y formación en seguridad vial' },
  { value: 'SENALIZACION', label: 'Señalización y adecuaciones de seguridad vial' },
  { value: 'TECNOLOGIA_MONITOREO', label: 'Tecnología y monitoreo' },
  { value: 'EMERGENCIAS', label: 'Atención de emergencias y elementos de prevención' },
  { value: 'GESTION_PESV', label: 'Gestión, seguimiento y documentación PESV' },
  { value: 'OTROS', label: 'Otros recursos destinados al PESV' },
]
function nombreCategoriaPesv(valor) {
  return CATEGORIAS_PESV.find(item => item.value === texto(valor))?.label || texto(valor)
}
// =========================================================
// COMPONENTE
// =========================================================
export default function RegistrarEgresoDrawer({
  abierto,
  onCerrar,
  empresaNombre = '',
  conceptos = [],
  mediosPago = [],
  personal = [],
  vehiculos = [],
  postEgreso,
  postCatalogos,
  onActualizado,
  onCatalogosActualizados,
  onImprimirCuentaCobro,
}) {
  const drawerRef =
    useRef(
      null
    )
  // =======================================================
  // PESTAÑA
  // =======================================================
  const [
    pestana,
    setPestana,
  ] =
    useState(
      'REGISTRAR'
    )
  // =======================================================
  // FORMULARIO EGRESO
  // =======================================================
  const [
    form,
    setForm,
  ] =
    useState(
      formularioInicial()
    )
  const [
    procesando,
    setProcesando,
  ] =
    useState(
      false
    )
  const [
    error,
    setError,
  ] =
    useState('')
  const [
    mensaje,
    setMensaje,
  ] =
    useState('')
  const [
    egresoRegistrado,
    setEgresoRegistrado,
  ] =
    useState(
      null
    )
  // =======================================================
  // PERSONAL
  // =======================================================
  const [
    buscarPersonal,
    setBuscarPersonal,
  ] =
    useState('')
  const [
    mostrarResultadosPersonal,
    setMostrarResultadosPersonal,
  ] =
    useState(
      false
    )
  // =======================================================
  // VEHÍCULO
  // =======================================================
  const [
    buscarVehiculo,
    setBuscarVehiculo,
  ] =
    useState('')
  const [
    mostrarResultadosVehiculo,
    setMostrarResultadosVehiculo,
  ] =
    useState(
      false
    )
  // =======================================================
  // ADMINISTRAR CONCEPTOS
  // =======================================================
  const [
    editandoConcepto,
    setEditandoConcepto,
  ] =
    useState(
      null
    )
  const [
    formConcepto,
    setFormConcepto,
  ] =
    useState(
      conceptoInicial()
    )
  const [
    mostrarFormularioConcepto,
    setMostrarFormularioConcepto,
  ] =
    useState(
      false
    )
  const [
    conceptoResaltadoId,
    setConceptoResaltadoId,
  ] = useState(null)
  // =======================================================
  // CONCEPTOS DISPONIBLES PARA EGRESOS
  // =======================================================
  const conceptosEgreso =
    useMemo(
      () => {
        return (
          Array.isArray(
            conceptos
          )
            ? conceptos
            : []
        )
          .filter(
            item =>
              item?.activo !==
                false &&
              mayusculas(
                item?.naturaleza
              ) === 'EGRESO'
          )
          .sort(
            (
              a,
              b
            ) =>
              mayusculas(
                a?.nombre
              ).localeCompare(
                mayusculas(
                  b?.nombre
                ),
                'es'
              )
          )
      },
      [
        conceptos,
      ]
    )
  // =======================================================
  // TODOS LOS CONCEPTOS ADMINISTRABLES
  // =======================================================
  const conceptosAdmin =
    useMemo(
      () => {
        return (
          Array.isArray(
            conceptos
          )
            ? conceptos
            : []
        )
          .filter(
            item =>
              mayusculas(
                item?.naturaleza
              ) === 'EGRESO'
          )
          .slice()
          .sort(
            (
              a,
              b
            ) =>
              mayusculas(
                a?.nombre
              ).localeCompare(
                mayusculas(
                  b?.nombre
                ),
                'es'
              )
          )
      },
      [
        conceptos,
      ]
    )
  // =======================================================
  // MEDIOS DE PAGO
  // =======================================================
  const mediosVisibles =
    useMemo(
      () => {
        return (
          Array.isArray(
            mediosPago
          )
            ? mediosPago
            : []
        )
          .filter(
            item =>
              item?.activo !==
              false
          )
          .slice()
          .sort(
            (
              a,
              b
            ) =>
              mayusculas(
                a?.nombre
              ).localeCompare(
                mayusculas(
                  b?.nombre
                ),
                'es'
              )
          )
      },
      [
        mediosPago,
      ]
    )
  // =======================================================
  // PERSONAL ACTIVO
  // =======================================================
  const personalActivo =
    useMemo(
      () => {
        return (
          Array.isArray(
            personal
          )
            ? personal
            : []
        )
          .filter(
            item =>
              ![
                'INACTIVO',
                'RETIRADO',
              ].includes(
                mayusculas(
                  item?.estado
                )
              )
          )
          .slice()
          .sort(
            (
              a,
              b
            ) =>
              nombreCompletoPersonal(
                a
              ).localeCompare(
                nombreCompletoPersonal(
                  b
                ),
                'es'
              )
          )
      },
      [
        personal,
      ]
    )
  // =======================================================
  // VEHÍCULOS
  // =======================================================
  const vehiculosDisponibles =
    useMemo(
      () => {
        return (
          Array.isArray(
            vehiculos
          )
            ? vehiculos
            : []
        )
          .slice()
          .sort(
            (
              a,
              b
            ) =>
              mayusculas(
                a?.placa
              ).localeCompare(
                mayusculas(
                  b?.placa
                ),
                'es'
              )
          )
      },
      [
        vehiculos,
      ]
    )
  // =======================================================
  // CONCEPTO SELECCIONADO
  // =======================================================
  const conceptoSeleccionado =
    useMemo(
      () => {
        return (
          conceptosEgreso.find(
            item =>
              String(
                item?.id
              ) ===
              String(
                form.concepto_id
              )
          ) ||
          null
        )
      },
      [
        conceptosEgreso,
        form.concepto_id,
      ]
    )
  const requiereVehiculo =
    conceptoSeleccionado
      ?.requiere_vehiculo ===
    true

  const formularioCompleto =
    Boolean(form.fecha) &&
    Boolean(form.concepto_id) &&
    Number(form.valor) > 0 &&
    Boolean(form.medio_pago_id) &&
    Boolean(texto(form.descripcion)) &&
    Boolean(texto(form.beneficiario)) &&
    Boolean(texto(form.documento_beneficiario)) &&
    (form.tipo_beneficiario !== 'FUNCIONARIO' || Boolean(form.personal_id)) &&
    (!requiereVehiculo || Boolean(form.vehiculo_id))
  // =======================================================
  // FILTRAR PERSONAL
  // =======================================================
  const personalFiltrado =
    useMemo(
      () => {
        const termino =
          mayusculas(
            buscarPersonal
          )
        if (
          termino.length <
          2
        ) {
          return personalActivo
            .slice(
              0,
              20
            )
        }
        return personalActivo
          .filter(
            persona => {
              const nombre =
                mayusculas(
                  nombreCompletoPersonal(
                    persona
                  )
                )
              const documento =
                mayusculas(
                  persona?.documento
                )
              const cargo =
                mayusculas(
                  persona?.cargo ||
                  persona?.tipo_personal
                )
              return (
                nombre.includes(
                  termino
                ) ||
                documento.includes(
                  termino
                ) ||
                cargo.includes(
                  termino
                )
              )
            }
          )
          .slice(
            0,
            30
          )
      },
      [
        personalActivo,
        buscarPersonal,
      ]
    )
  // =======================================================
  // FILTRAR VEHÍCULOS
  // =======================================================
  const vehiculosFiltrados =
    useMemo(
      () => {
        const termino =
          mayusculas(
            buscarVehiculo
          )
        if (
          !termino
        ) {
          return vehiculosDisponibles
            .slice(
              0,
              20
            )
        }
        return vehiculosDisponibles
          .filter(
            vehiculo =>
              mayusculas(
                descripcionVehiculo(
                  vehiculo
                )
              ).includes(
                termino
              )
          )
          .slice(
            0,
            30
          )
      },
      [
        vehiculosDisponibles,
        buscarVehiculo,
      ]
    )
  // =======================================================
  // REINICIAR EGRESO
  // =======================================================
  function reiniciarFormulario() {
    setForm(
      formularioInicial()
    )
    setBuscarPersonal('')
    setBuscarVehiculo('')
    setMostrarResultadosPersonal(
      false
    )
    setMostrarResultadosVehiculo(
      false
    )
    setEgresoRegistrado(
      null
    )
    setError('')
    setMensaje('')
  }
  // =======================================================
  // REINICIAR CONCEPTO
  // =======================================================
  function nuevoConcepto() {
    setEditandoConcepto(
      null
    )
    setFormConcepto(
      conceptoInicial()
    )
    setMostrarFormularioConcepto(
      false
    )
    setError('')
    setMensaje('')
  }
  // =======================================================
  // AL ABRIR
  // =======================================================
  useEffect(
    () => {
      if (
        abierto
      ) {
        setPestana(
          'REGISTRAR'
        )
        reiniciarFormulario()
        nuevoConcepto()
        setTimeout(
          () => {
            drawerRef.current
              ?.scrollTo({
                top:
                  0,
                behavior:
                  'auto',
              })
          },
          50
        )
      }
    },
    [
      abierto,
    ]
  )
  // =======================================================
  // SELECCIONAR CONCEPTO
  // =======================================================
  function seleccionarConcepto(
    conceptoId
  ) {
    const concepto =
      conceptosEgreso.find(
        item =>
          String(
            item.id
          ) ===
          String(
            conceptoId
          )
      )
    const necesitaVehiculo =
      concepto
        ?.requiere_vehiculo ===
      true
    setForm(
      actual => ({
        ...actual,
        concepto_id:
          conceptoId,
        descripcion:
            concepto?.descripcion
                ? texto(
                    concepto.descripcion
                )
                : (
                    concepto?.nombre
                    ? mayusculas(
                        concepto.nombre
                        )
                    : actual.descripcion
                ),
        vehiculo_id:
          necesitaVehiculo
            ? actual.vehiculo_id
            : '',
        placa:
          necesitaVehiculo
            ? actual.placa
            : '',
      })
    )
    if (
      !necesitaVehiculo
    ) {
      setBuscarVehiculo('')
      setMostrarResultadosVehiculo(
        false
      )
    }
  }
  // =======================================================
  // CAMBIAR MODALIDAD
  // =======================================================
  function cambiarModalidad(modalidad) {
    setForm(actual => ({
      ...actual,
      modalidad,
      tipo_beneficiario: 'FUNCIONARIO',
      personal_id: '',
      beneficiario: '',
      tipo_documento_beneficiario: 'CC',
      documento_beneficiario: '',
      cargo_beneficiario: '',
      numero_factura: '',
    }))
    setBuscarPersonal('')
    setMostrarResultadosPersonal(false)
    setError('')
    setMensaje('')
  }
  // =======================================================
  // CAMBIAR BENEFICIARIO / RECEPTOR
  // =======================================================
  function cambiarTipoBeneficiario(
    tipo
  ) {
    setForm(
      actual => ({
        ...actual,
        tipo_beneficiario:
          tipo,
        personal_id:
          '',
        beneficiario:
          '',
        tipo_documento_beneficiario:
          'CC',
        documento_beneficiario:
          '',
        cargo_beneficiario:
          '',
      })
    )
    setBuscarPersonal('')
    setMostrarResultadosPersonal(
      false
    )
  }
  // =======================================================
  // SELECCIONAR FUNCIONARIO
  // =======================================================
  function seleccionarPersonal(
    persona
  ) {
    setForm(
      actual => ({
        ...actual,
        personal_id:
          persona?.id ||
          '',
        beneficiario:
          mayusculas(
            nombreCompletoPersonal(
              persona
            )
          ),
        tipo_documento_beneficiario:
          mayusculas(
            persona
              ?.tipo_documento
          ) ||
          'CC',
        documento_beneficiario:
          texto(
            persona
              ?.documento
          ),
        cargo_beneficiario:
          mayusculas(
            persona?.cargo ||
            persona?.tipo_personal
          ),
      })
    )
    setBuscarPersonal(
      nombreCompletoPersonal(
        persona
      )
    )
    setMostrarResultadosPersonal(
      false
    )
  }
  // =======================================================
  // SELECCIONAR VEHÍCULO
  // =======================================================
  function seleccionarVehiculo(
    vehiculo
  ) {
    setForm(
      actual => ({
        ...actual,
        vehiculo_id:
          vehiculo?.id ||
          '',
        placa:
          mayusculas(
            vehiculo?.placa
          ),
      })
    )
    setBuscarVehiculo(
      descripcionVehiculo(
        vehiculo
      )
    )
    setMostrarResultadosVehiculo(
      false
    )
  }
  // =======================================================
  // VALIDAR EGRESO
  // =======================================================
  function validarFormulario() {
    if (
      !form.fecha
    ) {
      return 'Seleccione la fecha del egreso.'
    }
    if (
      !form.concepto_id
    ) {
      return 'Seleccione el concepto del egreso.'
    }
    const valor =
      Number(
        form.valor
      )
    if (
      !Number.isFinite(
        valor
      ) ||
      valor <=
        0
    ) {
      return 'Ingrese un valor válido mayor a cero.'
    }
    const esEntregaParaLegalizar =
      form.modalidad === 'ENTREGA_PARA_LEGALIZAR'
    if (form.tipo_beneficiario === 'FUNCIONARIO' && !form.personal_id) {
      return esEntregaParaLegalizar
        ? 'Seleccione la persona que recibe el dinero.'
        : 'Seleccione un funcionario.'
    }
    if (!texto(form.beneficiario)) {
      return esEntregaParaLegalizar
        ? 'Ingrese o seleccione la persona que recibe el dinero.'
        : 'Ingrese o seleccione el beneficiario.'
    }
    if (!texto(form.documento_beneficiario)) {
      return esEntregaParaLegalizar
        ? 'Ingrese el documento de la persona que recibe el dinero.'
        : 'Ingrese el documento del beneficiario.'
    }
    if (
      requiereVehiculo &&
      !form.vehiculo_id
    ) {
      return 'Este concepto requiere seleccionar un vehículo.'
    }
    if (
      !texto(
        form.descripcion
      )
    ) {
      return 'Ingrese la descripción del egreso.'
    }
    if (
      !form.medio_pago_id
    ) {
      return 'Seleccione el medio de pago.'
    }
    return ''
  }
  // =======================================================
  // REGISTRAR EGRESO
  // =======================================================
  async function registrarEgreso() {
    const validacion =
      validarFormulario()
    if (
      validacion
    ) {
      setError(
        validacion
      )
      setMensaje('')
      return
    }
    if (
      typeof postEgreso !==
      'function'
    ) {
      setError(
        'No se encuentra disponible la función para registrar el egreso.'
      )
      return
    }
    setProcesando(
      true
    )
    setError('')
    setMensaje('')
    try {
      const data =
        await postEgreso({
          accion:
            'registrar',
          fecha:
            form.fecha,
          concepto_id:
            form.concepto_id,
          medio_pago_id:
            form.medio_pago_id,
          valor:
            Number(
              form.valor
            ),
          modalidad:
            form.modalidad,
          receptor_dinero:
            form.modalidad === 'ENTREGA_PARA_LEGALIZAR'
              ? mayusculas(form.beneficiario)
              : null,
          tipo_documento_receptor:
            form.modalidad === 'ENTREGA_PARA_LEGALIZAR'
              ? mayusculas(form.tipo_documento_beneficiario)
              : null,
          documento_receptor:
            form.modalidad === 'ENTREGA_PARA_LEGALIZAR'
              ? texto(form.documento_beneficiario)
              : null,
          beneficiario:
            form.modalidad === 'PAGO_DIRECTO'
              ? mayusculas(form.beneficiario)
              : null,
          tipo_documento_beneficiario:
            form.modalidad === 'PAGO_DIRECTO'
              ? mayusculas(form.tipo_documento_beneficiario)
              : null,
          documento_beneficiario:
            form.modalidad === 'PAGO_DIRECTO'
              ? texto(form.documento_beneficiario)
              : null,
          vehiculo_id:
            form.vehiculo_id ||
            null,
         descripcion:
            texto(
                form.descripcion
            ),
          numero_factura:
            texto(
              form.numero_factura
            ) ||
            null,
          referencia_pago:
            texto(
              form.referencia_pago
            ) ||
            null,
          observaciones:
            mayusculas(
              form.observaciones
            ) ||
            null,
        })
      const egreso =
        data?.data ||
        null
      setEgresoRegistrado(
        egreso
      )
      setMensaje(
        data?.message ||
        'Egreso registrado correctamente.'
      )
      if (
        typeof onActualizado ===
        'function'
      ) {
        await onActualizado()
      }
      setTimeout(
        () => {
          drawerRef.current
            ?.scrollTo({
              top:
                0,
              behavior:
                'smooth',
            })
        },
        80
      )
    } catch (
      errorRegistro
    ) {
      console.error(
        'Error registrando egreso:',
        errorRegistro
      )
      setError(
        errorRegistro?.message ||
        'No fue posible registrar el egreso.'
      )
      setTimeout(
        () => {
          drawerRef.current
            ?.scrollTo({
              top:
                0,
              behavior:
                'smooth',
            })
        },
        80
      )
    } finally {
      setProcesando(
        false
      )
    }
  }
  // =======================================================
  // IMPRIMIR EGRESO REGISTRADO
  // =======================================================
  function imprimirEgresoRegistrado() {
    if (
      !egresoRegistrado
    ) {
      return
    }
    if (
      egresoRegistrado?.modalidad === 'ENTREGA_PARA_LEGALIZAR' ||
      form.tipo_beneficiario !== 'FUNCIONARIO'
    ) {
      setError('La cuenta de cobro está disponible para pagos directos al personal del CEA.')
      return
    }
    if (
      typeof onImprimirCuentaCobro !==
      'function'
    ) {
      setError(
        'La impresión de cuenta de cobro todavía no se encuentra configurada.'
      )
      return
    }
    onImprimirCuentaCobro(
      egresoRegistrado,
      {
        empresaNombre,
        cargo_beneficiario:
          form.cargo_beneficiario,
      }
    )
  }
  // =======================================================
  // EDITAR CONCEPTO
  // =======================================================
  function editarConcepto(
    concepto
  ) {
    setEditandoConcepto(
      concepto
    )
    setMostrarFormularioConcepto(
      true
    )
    setFormConcepto({
      nombre:
        mayusculas(
          concepto?.nombre
        ),
      descripcion:
        texto(
          concepto?.descripcion
        ),
      naturaleza:
        mayusculas(
          concepto?.naturaleza
        ) ||
        'EGRESO',
      requiere_aprendiz:
        concepto?.requiere_aprendiz ===
        true,
      requiere_vehiculo:
        concepto?.requiere_vehiculo ===
        true,
      es_gasto_pesv:
        concepto?.es_gasto_pesv ===
        true,
      categoria_pesv:
        concepto?.es_gasto_pesv === true
          ? texto(concepto?.categoria_pesv)
          : '',
    })
    setError('')
    setMensaje('')
  }
  // =======================================================
  // GUARDAR CONCEPTO
  // =======================================================
  async function guardarConcepto() {
    if (
      typeof postCatalogos !==
      'function'
    ) {
      setError(
        'No se encuentra disponible la función para administrar conceptos.'
      )
      return
    }
    const nombre =
      mayusculas(
        formConcepto.nombre
      )
    if (
      !nombre
    ) {
      setError(
        'Ingrese el nombre del concepto.'
      )
      return
    }
    if (
      formConcepto.es_gasto_pesv === true &&
      !texto(formConcepto.categoria_pesv)
    ) {
      setError('Seleccione la destinación PESV del concepto.')
      return
    }
    setProcesando(
      true
    )
    setError('')
    setMensaje('')
    try {
      const data =
        await postCatalogos({
          accion:
            editandoConcepto
              ? 'editar_concepto'
              : 'crear_concepto',
          concepto_id:
            editandoConcepto
              ?.id ||
            null,
          nombre,
          descripcion:
            texto(
              formConcepto.descripcion
            ),
          naturaleza:
            'EGRESO',
          requiere_aprendiz:
            formConcepto.requiere_aprendiz,
          requiere_vehiculo:
            formConcepto.requiere_vehiculo,
          es_gasto_pesv:
            formConcepto.es_gasto_pesv,
          categoria_pesv:
            formConcepto.es_gasto_pesv
              ? formConcepto.categoria_pesv
              : null,
        })
      const conceptoGuardado = data?.data || null
      setMostrarFormularioConcepto(false)
      setEditandoConcepto(null)
      setFormConcepto(conceptoInicial())
      setMensaje(
        data?.message ||
        'Concepto guardado correctamente.'
      )
      if (conceptoGuardado?.id) {
        setConceptoResaltadoId(String(conceptoGuardado.id))
      }
      if (
        typeof onCatalogosActualizados ===
        'function'
      ) {
        await onCatalogosActualizados()
      } else if (
        typeof onActualizado ===
        'function'
      ) {
        await onActualizado()
      }
      setTimeout(() => {
        setConceptoResaltadoId(null)
      }, 3500)
    } catch (
      errorGuardar
    ) {
      setError(
        errorGuardar?.message ||
        'No fue posible guardar el concepto.'
      )
    } finally {
      setProcesando(
        false
      )
    }
  }
  // =======================================================
  // ACTIVAR / DESACTIVAR CONCEPTO
  // =======================================================
  async function cambiarEstadoConcepto(
    concepto
  ) {
    if (
      typeof postCatalogos !==
      'function'
    ) {
      setError(
        'No se encuentra disponible la función para administrar conceptos.'
      )
      return
    }
    const activar =
      concepto?.activo !==
      true
    const confirmar =
      window.confirm(
        activar
          ? `¿Desea activar el concepto ${concepto.nombre}?`
          : `¿Desea desactivar el concepto ${concepto.nombre}?`
      )
    if (
      !confirmar
    ) {
      return
    }
    setProcesando(
      true
    )
    setError('')
    setMensaje('')
    try {
      const data =
        await postCatalogos({
          accion:
            activar
              ? 'activar_concepto'
              : 'desactivar_concepto',
          concepto_id:
            concepto.id,
        })
      setMensaje(
        data?.message ||
        'Concepto actualizado correctamente.'
      )
      if (
        typeof onCatalogosActualizados ===
        'function'
      ) {
        await onCatalogosActualizados()
      } else if (
        typeof onActualizado ===
        'function'
      ) {
        await onActualizado()
      }
    } catch (
      errorEstado
    ) {
      setError(
        errorEstado?.message ||
        'No fue posible actualizar el concepto.'
      )
    } finally {
      setProcesando(
        false
      )
    }
  }
  // =======================================================
  // NO RENDER
  // =======================================================
  if (
    !abierto
  ) {
    return null
  }
  // =======================================================
  // RENDER
  // =======================================================
  return (
    <div
      className="
        fixed
        inset-0
        z-[70]
      "
    >
      {/* ===================================================
          FONDO
      =================================================== */}
      <div
        className="
          absolute
          inset-0
          bg-slate-950/50
          backdrop-blur-[1px]
        "
        onClick={() => {
          if (
            !procesando
          ) {
            onCerrar()
          }
        }}
      ></div>
      {/* ===================================================
          MODAL CENTRAL
      =================================================== */}
      <aside
        ref={
          drawerRef
        }
        className="
          absolute
          left-1/2
          top-1/2
          -translate-x-1/2
          -translate-y-1/2
          w-[calc(100%-1.5rem)]
          max-w-[900px]
          max-h-[92vh]
          bg-white
          rounded-xl
          shadow-2xl
          overflow-y-auto
          scroll-smooth
          border
          border-gray-200
          transition-all
          duration-200
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}
        <div
          className="
            sticky
            top-0
            z-30
            bg-white
            border-b
            border-gray-300
          "
        >
          <div
            className="
              px-4
              py-3
              flex
              justify-between
              items-start
              gap-3
            "
            style={{
              backgroundColor: ESTILO_SECCIONES.fondo,
              color: ESTILO_SECCIONES.texto,
              borderRadius: ESTILO_SECCIONES.radioSuperior,
            }}
          >
            <div>
              <p
                className="
                  text-[9px]
                  uppercase
                  font-bold
                  tracking-wide
                "
                style={{ color: ESTILO_SECCIONES.subtitulo }}
              >
                <i className="fas fa-cash-register mr-1"></i>
                Caja · Egresos
              </p>
              <h2
                className="
                  text-lg
                  font-black
                  mt-0.5
                "
              >
                <i className="fas fa-money-bill-transfer mr-2"></i>
                {pestana === 'REGISTRAR'
                  ? 'Registrar egreso'
                  : 'Administrar conceptos'}
              </h2>
              <p
                className="
                  text-[10px]
                  mt-1
                "
                style={{ color: ESTILO_SECCIONES.subtitulo }}
              >
                {pestana === 'REGISTRAR'
                  ? 'Complete la información del gasto realizado por el CEA.'
                  : 'Configure los conceptos disponibles para el registro de egresos.'}
              </p>
            </div>
            <button
              type="button"
              disabled={
                procesando
              }
              onClick={
                onCerrar
              }
              className="
                shrink-0
                w-9
                h-9
                border
                border-gray-300
                rounded-lg
                hover:bg-gray-100
                disabled:opacity-50
              "
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          {/* ===============================================
              TABS
          =============================================== */}
          <div
            className="
              grid
              grid-cols-2
              gap-2
              mx-4
              mt-4
              p-1.5
              bg-gray-100
              border
              border-gray-200
              rounded-xl
            "
          >
            <button
              type="button"
              onClick={() => {
                setPestana('REGISTRAR')
                setError('')
                setMensaje('')
              }}
              className={`
                py-2.5 px-1 text-[9px] font-black
                transition-all duration-200 hover:-translate-y-0.5
                ${pestana === 'REGISTRAR'
                  ? 'bg-[#3B617D] text-white border border-[#3B617D] rounded-lg shadow-sm cursor-pointer hover:-translate-y-1 hover:bg-[#2F5068] hover:shadow-md active:translate-y-0 active:scale-[0.99]'
                  : 'bg-white text-[#3B617D] border border-gray-300 rounded-lg cursor-pointer hover:-translate-y-1 hover:bg-[#E2E8F0] hover:border-[#3B617D] hover:shadow-md hover:ring-1 hover:ring-[#3B617D]/20 active:translate-y-0 active:scale-[0.99]'}
              `}
            >
              <i className="fas fa-money-bill-transfer mr-1"></i>
              REGISTRAR EGRESO
            </button>
            <button
              type="button"
              onClick={() => {
                setPestana('CONCEPTOS')
                nuevoConcepto()
                setError('')
                setMensaje('')
              }}
              className={`
                py-2.5 px-1 text-[9px] font-black
                transition-all duration-200 hover:-translate-y-0.5
                ${pestana === 'CONCEPTOS'
                  ? 'bg-[#3B617D] text-white border border-[#3B617D] rounded-lg shadow-sm cursor-pointer hover:-translate-y-1 hover:bg-[#2F5068] hover:shadow-md active:translate-y-0 active:scale-[0.99]'
                  : 'bg-white text-[#3B617D] border border-gray-300 rounded-lg cursor-pointer hover:-translate-y-1 hover:bg-[#E2E8F0] hover:border-[#3B617D] hover:shadow-md hover:ring-1 hover:ring-[#3B617D]/20 active:translate-y-0 active:scale-[0.99]'}
              `}
            >
              <i className="fas fa-list mr-1"></i>
              ADMINISTRAR CONCEPTOS
            </button>
          </div>
        </div>
        {/* =================================================
            CONTENIDO
        ================================================= */}
        <div
          className="
            p-3
            space-y-3
          "
        >
          {/* ===============================================
              MENSAJES
          =============================================== */}
          {error && pestana === 'CONCEPTOS' && (
            <div
              className="
                bg-red-50
                border
                border-red-300
                text-red-700
                rounded-lg
                p-3
                text-[10px]
              "
            >
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {error}
            </div>
          )}
          {mensaje &&
            !egresoRegistrado && (
            <div
              className="
                bg-emerald-50
                border
                border-emerald-300
                text-emerald-700
                rounded-lg
                p-3
                text-[10px]
              "
            >
              <i className="fas fa-check-circle mr-2"></i>
              {mensaje}
            </div>
          )}
          {/* ===============================================
              REGISTRAR EGRESO
          =============================================== */}
          {pestana ===
            'REGISTRAR' && (
            <>
              {/* ===========================================
                  FORMULARIO
              =========================================== */}
              <>
                  {/* =======================================
                      DATOS EGRESO
                  ======================================= */}
                  <div
                    className="
                      grid
                      grid-cols-1
                      lg:grid-cols-3
                      gap-3
                      items-start
                    "
                  >
                  <Seccion
                    titulo="Datos del egreso"
                    icono="fas fa-file-invoice-dollar"
                  >
                    <div
                      className="
                        grid
                        grid-cols-2
                        gap-2
                      "
                    >
                      <CampoInput
                        label="Fecha"
                        type="date"
                        value={
                          form.fecha
                        }
                        onChange={
                          value =>
                            setForm(
                              actual => ({
                                ...actual,
                                fecha:
                                  value,
                              })
                            )
                        }
                      />
                      <CampoInput
                        label="Valor"
                        prefijo="$"
                        value={
                          form.valor
                            ? Number(
                                String(
                                  form.valor
                                ).replace(
                                  /\D/g,
                                  ''
                                )
                              ).toLocaleString(
                                'es-CO'
                              )
                            : ''
                        }
                        onChange={
                          value =>
                            setForm(
                              actual => ({
                                ...actual,
                                valor:
                                  String(
                                    value ||
                                    ''
                                  ).replace(
                                    /\D/g,
                                    ''
                                  ),
                              })
                            )
                        }
                        inputMode="numeric"
                        placeholder="0"
                      />
                    </div>
                    <CampoSelect
                      label="Concepto"
                      value={
                        form.concepto_id
                      }
                      onChange={
                        seleccionarConcepto
                      }
                      options={
                        conceptosEgreso.map(
                          item => ({
                            value:
                              item.id,
                            label:
                              mayusculas(
                                item.nombre
                              ),
                          })
                        )
                      }
                    />
                    {conceptoSeleccionado?.es_gasto_pesv === true && (
                      <div
                        className="
                          rounded-lg
                          border
                          border-emerald-200
                          bg-emerald-50
                          px-3
                          py-2.5
                        "
                      >
                        <div className="text-[10px] font-black text-emerald-800">
                          <i className="fas fa-shield-alt mr-2"></i>
                          Gasto relacionado con el PESV
                        </div>
                        <div className="text-[9px] text-emerald-700 mt-1">
                          Este egreso será tenido en cuenta en los reportes financieros del PESV.
                        </div>
                      </div>
                    )}
                   <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                      Descripción
                    </label>
                    <div className="w-full min-h-[72px] border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 bg-gray-50 whitespace-pre-wrap">
                      {form.descripcion || 'Seleccione un concepto para visualizar su descripción.'}
                    </div>
                    <div className="text-[9px] text-gray-400 mt-1">
                      La descripción corresponde al concepto seleccionado. Use Observaciones para información particular del egreso.
                    </div>
                   </div>
                  </Seccion>
                  {/* =======================================
                      PAGO
                  ======================================= */}
                  <Seccion
                    titulo="Información del pago"
                    icono="fas fa-wallet"
                  >
                    <CampoSelect
                      label="Medio de pago"
                      value={
                        form.medio_pago_id
                      }
                      onChange={
                        value =>
                          setForm(
                            actual => ({
                              ...actual,
                              medio_pago_id:
                                value,
                            })
                          )
                      }
                      options={
                        mediosVisibles.map(
                          item => ({
                            value:
                              item.id,
                            label:
                              mayusculas(
                                item.nombre
                              ),
                          })
                        )
                      }
                    />
                    <div
                      className={
                        form.modalidad === 'PAGO_DIRECTO'
                          ? 'grid grid-cols-2 gap-2'
                          : 'grid grid-cols-1 gap-2'
                      }
                    >
                      {form.modalidad === 'PAGO_DIRECTO' && (
                        <CampoInput
                          label="Número de factura"
                          value={form.numero_factura}
                          onChange={value =>
                            setForm(actual => ({
                              ...actual,
                              numero_factura: value,
                            }))
                          }
                          placeholder="Opcional"
                        />
                      )}
                      <CampoInput
                        label="Referencia pago"
                        value={form.referencia_pago}
                        onChange={value =>
                          setForm(actual => ({
                            ...actual,
                            referencia_pago: value,
                          }))
                        }
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-[9px] text-gray-500">
                      {form.modalidad === 'ENTREGA_PARA_LEGALIZAR'
                        ? 'La factura o soporte del tercero se registrará posteriormente durante la legalización.'
                        : 'La factura y la referencia pueden registrarse posteriormente; no son obligatorias para realizar el desembolso.'}
                    </div>
                    <CampoTextarea
                      label="Observaciones"
                      value={
                        form.observaciones
                      }
                      onChange={
                        value =>
                          setForm(
                            actual => ({
                              ...actual,
                              observaciones:
                                mayusculas(
                                  value
                                ),
                            })
                          )
                      }
                    />
                  </Seccion>
                  {/* =======================================
                      MODALIDAD DEL EGRESO
                  ======================================= */}
                  <Seccion
                    titulo="Modalidad y beneficiario"
                    icono="fas fa-money-check-alt"
                  >
                    <div className="text-[10px] font-black text-slate-700">
                      Modalidad del egreso
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <BotonTipo
                        activo={form.modalidad === 'PAGO_DIRECTO'}
                        titulo="PAGO DIRECTO"
                        subtitulo="Se conoce el beneficiario final"
                        icono="fas fa-hand-holding-usd"
                        onClick={() => cambiarModalidad('PAGO_DIRECTO')}
                      />
                      <BotonTipo
                        activo={form.modalidad === 'ENTREGA_PARA_LEGALIZAR'}
                        titulo="ENTREGA PARA LEGALIZAR"
                        subtitulo="El tercero o factura se conocerá después"
                        icono="fas fa-file-invoice-dollar"
                        onClick={() => cambiarModalidad('ENTREGA_PARA_LEGALIZAR')}
                      />
                    </div>
                    {form.modalidad === 'ENTREGA_PARA_LEGALIZAR' && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[9px] text-blue-800">
                        <i className="fas fa-info-circle mr-2"></i>
                        Registre a la persona que recibe el dinero. El beneficiario final, la factura y el valor legalizado se completarán posteriormente al legalizar este egreso.
                      </div>
                    )}
                    <div className="border-t border-gray-200 my-1"></div>

                  {/* =======================================
                      BENEFICIARIO / RECEPTOR
                  ======================================= */}
                    <div className="text-[10px] font-black text-slate-700">
                      {form.modalidad === 'ENTREGA_PARA_LEGALIZAR'
                        ? 'Persona que recibe el dinero'
                        : 'Beneficiario'}
                    </div>
                    <div
                      className="
                        grid
                        grid-cols-2
                        gap-2
                      "
                    >
                      <BotonTipo
                        activo={
                          form.tipo_beneficiario ===
                          'FUNCIONARIO'
                        }
                        titulo="FUNCIONARIO"
                        subtitulo={
                          form.modalidad === 'ENTREGA_PARA_LEGALIZAR'
                            ? 'Personal que recibe el dinero'
                            : 'Personal del CEA'
                        }
                        icono="fas fa-id-badge"
                        onClick={() =>
                          cambiarTipoBeneficiario(
                            'FUNCIONARIO'
                          )
                        }
                      />
                      <BotonTipo
                        activo={
                          form.tipo_beneficiario ===
                          'TERCERO'
                        }
                        titulo="TERCERO"
                        subtitulo={
                          form.modalidad === 'ENTREGA_PARA_LEGALIZAR'
                            ? 'Persona externa que recibe'
                            : 'Persona o empresa'
                        }
                        icono="fas fa-building"
                        onClick={() =>
                          cambiarTipoBeneficiario(
                            'TERCERO'
                          )
                        }
                      />
                    </div>
                    {/* FUNCIONARIO */}
                    {form.tipo_beneficiario ===
                      'FUNCIONARIO' && (
                      <div
                        className="
                          relative
                        "
                      >
                        <label
                          className="
                            block
                            text-[10px]
                            font-semibold
                            text-gray-600
                            mb-1
                          "
                        >
                          Buscar funcionario
                        </label>
                        <div className="relative">
                          <i
                            className="
                              fas
                              fa-search
                              absolute
                              left-3
                              top-1/2
                              -translate-y-1/2
                              text-gray-400
                              text-xs
                            "
                          ></i>
                          <input
                            type="text"
                            value={
                              buscarPersonal
                            }
                            onFocus={() =>
                              setMostrarResultadosPersonal(
                                true
                              )
                            }
                            onChange={
                              e => {
                                setBuscarPersonal(
                                  e.target.value
                                )
                                setMostrarResultadosPersonal(
                                  true
                                )
                              }
                            }
                            placeholder="Nombre, documento o cargo..."
                            className="
                              w-full
                              border
                              border-gray-300
                              rounded-lg
                              pl-9
                              pr-3
                              py-2
                              text-xs
                            "
                          />
                        </div>
                        {mostrarResultadosPersonal &&
                          personalFiltrado.length >
                            0 && (
                          <div
                            className="
                              absolute
                              left-0
                              right-0
                              top-full
                              mt-1
                              z-40
                              max-h-60
                              overflow-y-auto
                              bg-white
                              border
                              border-gray-300
                              rounded-lg
                              shadow-xl
                            "
                          >
                            {personalFiltrado.map(
                              persona => (
                                <button
                                  key={
                                    persona.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    seleccionarPersonal(
                                      persona
                                    )
                                  }
                                  className="
                                    w-full
                                    text-left
                                    px-3
                                    py-2.5
                                    border-b
                                    border-gray-100
                                    hover:bg-blue-50
                                  "
                                >
                                  <div
                                    className="
                                      text-[10px]
                                      font-black
                                      text-gray-800
                                    "
                                  >
                                    {mayusculas(
                                      nombreCompletoPersonal(
                                        persona
                                      )
                                    )}
                                  </div>
                                  <div
                                    className="
                                      text-[9px]
                                      text-gray-500
                                      mt-0.5
                                    "
                                  >
                                    {persona
                                      ?.tipo_documento ||
                                      'CC'}
                                    {' '}
                                    {persona
                                      ?.documento ||
                                      '-'}
                                    {' · '}
                                    {mayusculas(
                                      persona?.cargo ||
                                      persona
                                        ?.tipo_personal
                                    ) ||
                                      'SIN CARGO'}
                                  </div>
                                </button>
                              )
                            )}
                          </div>
                        )}
                        {form.personal_id && (
                          <div
                            className="
                              mt-2
                              border
                              border-blue-200
                              bg-blue-50
                              rounded-lg
                              p-3
                            "
                          >
                            <div
                              className="
                                text-xs
                                font-black
                                text-blue-900
                              "
                            >
                              {form.beneficiario}
                            </div>
                            <div
                              className="
                                text-[9px]
                                text-blue-700
                                mt-1
                              "
                            >
                              {
                                form
                                  .tipo_documento_beneficiario
                              }
                              {' '}
                              {
                                form
                                  .documento_beneficiario
                              }
                              {form
                                .cargo_beneficiario && (
                                <>
                                  {' · '}
                                  {
                                    form
                                      .cargo_beneficiario
                                  }
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* TERCERO */}
                    {form.tipo_beneficiario ===
                      'TERCERO' && (
                      <>
                        <CampoInput
                          label="Nombre / Razón social"
                          value={
                            form.beneficiario
                          }
                          onChange={
                            value =>
                              setForm(
                                actual => ({
                                  ...actual,
                                  beneficiario:
                                    mayusculas(
                                      value
                                    ),
                                })
                              )
                          }
                        />
                        <div
                          className="
                            grid
                            grid-cols-3
                            gap-2
                          "
                        >
                          <CampoSelect
                            label="Tipo"
                            value={
                              form
                                .tipo_documento_beneficiario
                            }
                            onChange={
                              value =>
                                setForm(
                                  actual => ({
                                    ...actual,
                                    tipo_documento_beneficiario:
                                      value,
                                  })
                                )
                            }
                            options={[
                              {
                                value:
                                  'CC',
                                label:
                                  'CC',
                              },
                              {
                                value:
                                  'CE',
                                label:
                                  'CE',
                              },
                              {
                                value:
                                  'PASAPORTE',
                                label:
                                  'PASAPORTE',
                              },
                              {
                                value:
                                  'NIT',
                                label:
                                  'NIT',
                              },
                            ]}
                          />
                          <div
                            className="
                              col-span-2
                            "
                          >
                            <CampoInput
                              label="Documento"
                              value={
                                form
                                  .documento_beneficiario
                              }
                              onChange={
                                value =>
                                  setForm(
                                    actual => ({
                                      ...actual,
                                      documento_beneficiario:
                                        value,
                                    })
                                  )
                              }
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </Seccion>
                  {/* =======================================
                      VEHÍCULO
                  ======================================= */}
                  {requiereVehiculo && (
                    <Seccion
                      titulo="Vehículo asociado"
                      icono="fas fa-car"
                    >
                      {!form.vehiculo_id && (
                        <div
                          className="
                            bg-amber-50
                            border
                            border-amber-200
                            rounded-lg
                            p-2.5
                            text-[9px]
                            text-amber-800
                          "
                        >
                          <i className="fas fa-circle-info mr-2"></i>
                          Este concepto requiere seleccionar el vehículo.
                        </div>
                      )}
                      <div
                        className="
                          relative
                        "
                      >
                        <label
                          className="
                            block
                            text-[10px]
                            font-semibold
                            text-gray-600
                            mb-1
                          "
                        >
                          Buscar placa
                        </label>
                        <input
                          type="text"
                          value={
                            buscarVehiculo
                          }
                          onFocus={() =>
                            setMostrarResultadosVehiculo(
                              true
                            )
                          }
                          onChange={
                            e => {
                              setBuscarVehiculo(
                                mayusculas(
                                  e.target.value
                                )
                              )
                              setMostrarResultadosVehiculo(
                                true
                              )
                            }
                          }
                          placeholder="Digite placa, marca o línea..."
                          className="
                            w-full
                            border
                            border-gray-300
                            rounded-lg
                            px-3
                            py-2
                            text-xs
                            uppercase
                          "
                        />
                        {mostrarResultadosVehiculo &&
                          vehiculosFiltrados.length >
                            0 && (
                          <div
                            className="
                              absolute
                              left-0
                              right-0
                              top-full
                              mt-1
                              z-40
                              max-h-60
                              overflow-y-auto
                              bg-white
                              border
                              border-gray-300
                              rounded-lg
                              shadow-xl
                            "
                          >
                            {vehiculosFiltrados.map(
                              vehiculo => (
                                <button
                                  key={
                                    vehiculo.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    seleccionarVehiculo(
                                      vehiculo
                                    )
                                  }
                                  className="
                                    w-full
                                    text-left
                                    px-3
                                    py-2.5
                                    border-b
                                    border-gray-100
                                    hover:bg-blue-50
                                  "
                                >
                                  <div
                                    className="
                                      text-[11px]
                                      font-black
                                      text-gray-800
                                    "
                                  >
                                    {mayusculas(
                                      vehiculo.placa
                                    )}
                                  </div>
                                  <div
                                    className="
                                      text-[9px]
                                      text-gray-500
                                      mt-0.5
                                    "
                                  >
                                    {[
                                      vehiculo
                                        ?.tipo_vehiculo,
                                      vehiculo
                                        ?.marca,
                                      vehiculo
                                        ?.linea,
                                      vehiculo
                                        ?.modelo,
                                    ]
                                      .filter(
                                        Boolean
                                      )
                                      .join(
                                        ' · '
                                      )}
                                  </div>
                                </button>
                              )
                            )}
                          </div>
                        )}
                        {form.vehiculo_id && (
                          <div
                            className="
                              mt-2
                              border
                              border-blue-200
                              bg-blue-50
                              rounded-lg
                              p-3
                              text-xs
                              font-black
                              text-blue-900
                            "
                          >
                            <i className="fas fa-car mr-2"></i>
                            {form.placa}
                          </div>
                        )}
                      </div>
                    </Seccion>
                  )}
                  </div>
                  {/* =======================================
                      BOTÓN PRINCIPAL
                  ======================================= */}
                  <div
                    className="
                      flex
                      justify-end
                      pt-1
                    "
                  >
                  <BotonGuardar
                    type="button"
                    onClick={registrarEgreso}
                    disabled={procesando || !formularioCompleto}
                    title={!formularioCompleto ? 'Complete los campos obligatorios para registrar el egreso.' : ''}
                    className="min-w-[190px] !px-5 !py-2.5 !text-[10px] !font-black"
                  >
                    {procesando ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        REGISTRANDO...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        REGISTRAR EGRESO
                      </>
                    )}
                  
                  </BotonGuardar>
                  </div>
                </>
            </>
          )}
          {/* ===============================================
              ADMINISTRAR CONCEPTOS
          =============================================== */}
          {pestana ===
            'CONCEPTOS' && (
            <div className="p-1">
              <ContenedorModulo className="overflow-hidden">
                <div className="p-4">
                  <div
                    className="px-3 py-2 flex items-center justify-between gap-3 text-[10px] font-bold"
                    style={{
                      backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo,
                      color: ESTILO_SECCIONES_SECUNDARIAS.texto,
                      borderRadius: ESTILO_SECCIONES_SECUNDARIAS.radioSuperior,
                    }}
                  >
                    <span>
                      <i className="fas fa-list mr-2"></i>
                      Conceptos de egreso registrados
                    </span>
                    <div className="flex items-center gap-2">
                      <BotonAgregar
                        type="button"
                        onClick={() => {
                          nuevoConcepto()
                          setMostrarFormularioConcepto(true)
                        }}
                        disabled={procesando}
                      >
                        <i className="fas fa-plus"></i>
                        Agregar concepto
                      </BotonAgregar>
                      <BotonActualizar
                        type="button"
                        onClick={onActualizado}
                        disabled={procesando}
                      >
                        <i className="fas fa-sync-alt"></i>
                        Actualizar
                      </BotonActualizar>
                    </div>
                  </div>

                  {conceptosAdmin.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      No hay conceptos de egreso registrados.
                    </div>
                  ) : (
                    <MarcoTabla className="rounded-t-none">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-[10px]">
                          <thead>
                            <tr>
                              <th className="px-3 py-2 text-left">Concepto</th>
                              <th className="px-3 py-2 text-left">Descripción</th>
                              <th className="px-3 py-2 text-center">Vehículo</th>
                              <th className="px-3 py-2 text-center">PESV</th>
                              <th className="px-3 py-2 text-center">Estado</th>
                              <th className="px-3 py-2 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {conceptosAdmin.map(item => (
                              <tr key={item.id}>
                                <td className="px-3 py-2 font-bold">
                                  {mayusculas(item.nombre)}
                                </td>
                                <td className="px-3 py-2">
                                  {item.descripcion || '-'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {item.requiere_vehiculo ? 'SÍ' : 'NO'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {item.es_gasto_pesv ? 'SÍ' : 'NO'}
                                </td>
                                <td className="px-3 py-2 text-center font-bold">
                                  {item.activo ? 'ACTIVO' : 'INACTIVO'}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex justify-center gap-1">
                                    <BotonEditar
                                      type="button"
                                      onClick={() => editarConcepto(item)}
                                      disabled={procesando}
                                    >
                                      <i className="fas fa-pen"></i>
                                      Editar
                                    </BotonEditar>
                                    <BotonAccion
                                      type="button"
                                      tipo={item.activo ? 'inactivar' : 'activar'}
                                      onClick={() => cambiarEstadoConcepto(item)}
                                      disabled={procesando}
                                    >
                                      <i className={`fas ${item.activo ? 'fa-ban' : 'fa-check'}`}></i>
                                      {item.activo ? 'Inactivar' : 'Activar'}
                                    </BotonAccion>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </MarcoTabla>
                  )}
                </div>
              </ContenedorModulo>
            </div>
          )}
        </div>
      </aside>
      <ModalResultado
        abierto={Boolean(egresoRegistrado || (error && pestana === 'REGISTRAR'))}
        tipo={egresoRegistrado ? 'exito' : 'error'}
        titulo={
          egresoRegistrado
            ? 'Egreso registrado satisfactoriamente'
            : 'No fue posible registrar el egreso'
        }
        mensaje={!egresoRegistrado ? error : ''}
        onCerrar={() => {
          if (egresoRegistrado) {
            reiniciarFormulario()
            onCerrar()
          } else {
            setError('')
          }
        }}
      />

      {mostrarFormularioConcepto && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]"
            onClick={() => {
              if (!procesando) nuevoConcepto()
            }}
          ></div>
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-200">
            <div className="sticky top-0 z-20 bg-slate-800 text-white px-4 py-3 flex justify-between items-center gap-3 rounded-t-2xl">
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-300">Caja · Egresos</div>
                <div className="text-sm font-black mt-0.5">
                  {editandoConcepto ? `Editar concepto: ${mayusculas(editandoConcepto.nombre)}` : 'Nuevo concepto de egreso'}
                </div>
              </div>
              <button type="button" disabled={procesando} onClick={nuevoConcepto} className="w-9 h-9 rounded-lg border border-slate-500 hover:bg-slate-700 disabled:opacity-50">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4 space-y-3">
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-[10px]">
                  <i className="fas fa-exclamation-triangle mr-2"></i>{error}
                </div>
              )}
              <CampoInput
                label="Nombre"
                value={formConcepto.nombre}
                onChange={value => setFormConcepto(actual => ({ ...actual, nombre: mayusculas(value) }))}
                placeholder="Ej. COMBUSTIBLE"
              />
              <CampoTextarea
                label="Descripción"
                value={formConcepto.descripcion}
                onChange={value => setFormConcepto(actual => ({ ...actual, descripcion: value }))}
                placeholder="Descripción del concepto..."
              />
              <div>
                <div className="text-[10px] font-semibold text-gray-600 mb-1">Naturaleza</div>
                <div className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-xs font-bold text-gray-700">EGRESO</div>
                <div className="text-[9px] text-gray-400 mt-1">Este catálogo administra exclusivamente conceptos de egreso.</div>
              </div>
              <label className="flex items-start gap-2 border border-gray-200 rounded-lg px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formConcepto.requiere_vehiculo}
                  onChange={e => setFormConcepto(actual => ({ ...actual, requiere_vehiculo: e.target.checked }))}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-[10px] font-black text-gray-700">Requiere vehículo</div>
                  <div className="text-[9px] text-gray-500 mt-0.5">Solicita seleccionar una placa al registrar el egreso.</div>
                </div>
              </label>
              <label className="flex items-start gap-2 border border-gray-200 rounded-lg px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formConcepto.es_gasto_pesv}
                  onChange={e => setFormConcepto(actual => ({
                    ...actual,
                    es_gasto_pesv: e.target.checked,
                    categoria_pesv: e.target.checked ? actual.categoria_pesv : '',
                  }))}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-[10px] font-black text-gray-700">Gasto relacionado con el PESV</div>
                  <div className="text-[9px] text-gray-500 mt-0.5">Incluye los egresos de este concepto en los reportes financieros del PESV.</div>
                </div>
              </label>
              {formConcepto.es_gasto_pesv && (
                <CampoSelect
                  label="Destinación PESV"
                  value={formConcepto.categoria_pesv}
                  onChange={value => setFormConcepto(actual => ({ ...actual, categoria_pesv: value }))}
                  options={CATEGORIAS_PESV}
                />
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={procesando} onClick={nuevoConcepto} className="border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-4 py-2.5 text-[10px] font-black disabled:opacity-50">
                  CANCELAR
                </button>
                <button type="button" onClick={guardarConcepto} disabled={procesando} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-5 py-2.5 text-[10px] font-black">
                  <i className={`fas ${procesando ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i>
                  {procesando ? 'GUARDANDO...' : (editandoConcepto ? 'GUARDAR CAMBIOS' : 'AGREGAR CONCEPTO')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// =========================================================
// SECCIÓN
// =========================================================
function Seccion({
  titulo,
  icono,
  children,
}) {
  return (
    <div
      className="
        border
        border-gray-300
        rounded-xl
        overflow-visible
      "
    >
      <div
        className="
          px-3
          py-2
          text-[10px]
          font-bold
          rounded-t-xl
        "
        style={{
          backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo,
          color: ESTILO_SECCIONES_SECUNDARIAS.texto,
          borderRadius: ESTILO_SECCIONES_SECUNDARIAS.radioSuperior,
        }}
      >
        <i
          className={`
            ${icono}
            mr-2
          `}
        ></i>
        {titulo}
      </div>
      <div
        className="
          p-2.5
          space-y-2.5
          bg-white
          rounded-b-xl
        "
      >
        {children}
      </div>
    </div>
  )
}
// =========================================================
// BOTÓN TIPO
// =========================================================
function BotonTipo({
  activo,
  titulo,
  subtitulo,
  icono,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        border
        rounded-xl
        p-3
        text-left
        cursor-pointer
        transition-all
        duration-200
        ease-out
        hover:-translate-y-1
        hover:shadow-md
        active:translate-y-0
        active:scale-[0.98]
        ${
          activo
            ? 'border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-200 hover:bg-blue-100'
            : 'border-slate-400 bg-white hover:border-[#3B617D] hover:bg-slate-50 hover:ring-1 hover:ring-[#3B617D]/20'
        }
      `}
    >
      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <i
          className={`
            ${icono}
            ${
              activo
                ? 'text-blue-700'
                : 'text-gray-500'
            }
          `}
        ></i>
        <span
          className="
            text-[10px]
            font-black
            text-gray-800
          "
        >
          {titulo}
        </span>
      </div>
      <div
        className="
          text-[9px]
          text-gray-500
          mt-1
        "
      >
        {subtitulo}
      </div>
    </button>
  )
}
// =========================================================
// DATO RESUMEN
// =========================================================
function DatoResumen({
  label,
  value,
}) {
  return (
    <div>
      <div
        className="
          text-[8px]
          uppercase
          font-bold
          text-gray-500
        "
      >
        {label}
      </div>
      <div
        className="
          text-xs
          font-black
          text-gray-800
          mt-0.5
        "
      >
        {texto(
          value
        ) ||
          '-'}
      </div>
    </div>
  )
}
// =========================================================
// ETIQUETA
// =========================================================
function Etiqueta({
  children,
}) {
  return (
    <span
      className="
        inline-flex
        rounded-full
        bg-gray-100
        border
        border-gray-200
        px-2
        py-0.5
        text-[8px]
        font-bold
        text-gray-600
      "
    >
      {children}
    </span>
  )
}
// =========================================================
// INPUT
// =========================================================
function CampoInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  inputMode,
  prefijo = '',
}) {
  return (
    <div>
      <label
        className="
          block
          text-[10px]
          font-semibold
          text-gray-600
          mb-1
        "
      >
        {label}
      </label>
      <div className="relative">
        {prefijo && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 pointer-events-none">
            {prefijo}
          </span>
        )}
      <input
        type={
          type
        }
        inputMode={
          inputMode
        }
        value={
          value
        }
        onChange={
          e =>
            onChange(
              e.target.value
            )
        }
        placeholder={
          placeholder
        }
        className="
          w-full
          border
          border-slate-500
          bg-slate-50
          rounded-lg
          px-3
          py-2
          text-xs
          focus:bg-white
          focus:border-[#3B617D]
          focus:ring-2
          focus:ring-[#3B617D]/20
        "
        style={{ paddingLeft: prefijo ? '2rem' : undefined }}
      />
      </div>
    </div>
  )
}
// =========================================================
// SELECT
// =========================================================
function CampoSelect({
  label,
  value,
  onChange,
  options = [],
}) {
  return (
    <div>
      <label
        className="
          block
          text-[10px]
          font-semibold
          text-gray-600
          mb-1
        "
      >
        {label}
      </label>
      <select
        value={
          value
        }
        onChange={
          e =>
            onChange(
              e.target.value
            )
        }
        className="
          w-full
          border
          border-slate-500
          bg-slate-50
          rounded-lg
          px-3
          py-2
          text-xs
          focus:bg-white
          focus:border-[#3B617D]
          focus:ring-2
          focus:ring-[#3B617D]/20
          bg-white
        "
      >
        <option value="">
          Seleccione...
        </option>
        {options.map(
          item => (
            <option
              key={
                item.value
              }
              value={
                item.value
              }
            >
              {item.label}
            </option>
          )
        )}
      </select>
    </div>
  )
}
// =========================================================
// TEXTAREA
// =========================================================
function CampoTextarea({
  label,
  value,
  onChange,
  placeholder = '',
}) {
  return (
    <div>
      <label
        className="
          block
          text-[10px]
          font-semibold
          text-gray-600
          mb-1
        "
      >
        {label}
      </label>
      <textarea
        rows={3}
        value={
          value
        }
        onChange={
          e =>
            onChange(
              e.target.value
            )
        }
        placeholder={
          placeholder
        }
        className="
          w-full
          border
          border-slate-500
          bg-slate-50
          rounded-lg
          px-3
          py-2
          text-xs
          focus:bg-white
          focus:border-[#3B617D]
          focus:ring-2
          focus:ring-[#3B617D]/20
          resize-none
        "
      />
    </div>
  )
}
