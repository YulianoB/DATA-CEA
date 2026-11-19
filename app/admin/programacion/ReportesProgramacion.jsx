'use client'

import { useEffect, useState } from 'react'

const actual = () => new Intl.DateTimeFormat('en-CA',{
  timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'
}).format(new Date())
const primerDia = () => actual().slice(0,7)+'-01'
const limpiar = v => String(v??'')
const etiquetaEstado = v => ({
  AGENDADA:'Agendada',DICTADA:'Dictada',
  PENDIENTE_CARGUE:'Pendiente de cargue',NO_DICTADA:'No dictada'
}[v] || v)
const fechaVisible = v => v ? v.split('-').reverse().join('/') : ''
const nombresActividad = {PRACTICA:'Práctica',TEORIA:'Teoría',PRUEBA_CONDUCCION:'Prueba de conducción'}
const observacionLimpia = value => limpiar(value).replace(/\[CEA_CLASE_PRACTICA:\d+\]/g,'').trim()

async function generarPDF(datos, filtros, instructorNombre) {
  const [{jsPDF},{default:autoTable}] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ])
  const individual=filtros.vista==='INDIVIDUAL'
  const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true})
  const ancho=pdf.internal.pageSize.getWidth()
  const margen=12
  const titulo=individual?'REPORTE INDIVIDUAL DE CLASES':'CONSOLIDADO DIARIO DE INSTRUCTORES'
  const inicio=fechaVisible(filtros.fechaInicio)
  const fin=fechaVisible(filtros.fechaFin)
  const total=datos.totales

  pdf.setFillColor(25,69,103)
  pdf.rect(0,0,ancho,22,'F')
  pdf.setTextColor(255,255,255)
  pdf.setFont('helvetica','bold')
  pdf.setFontSize(14)
  pdf.text('DATA CEA  |  '+titulo,margen,13)
  pdf.setTextColor(30,45,65)
  pdf.setFont('helvetica','normal')
  pdf.setFontSize(9)
  pdf.text('Periodo: '+inicio+' al '+fin,margen,29)
  if(individual) {
    pdf.setFont('helvetica','bold')
    pdf.text('Instructor: '+(instructorNombre||'No identificado'),margen,35)
  }
  const lineaResumen='Total: '+total.total+
    '   |   Agendadas: '+total.agendadas+
    '   |   Dictadas: '+total.dictadas+
    '   |   Pendientes de cargue: '+total.pendientes_cargue+
    '   |   No dictadas: '+total.no_dictadas
  pdf.setFont('helvetica','normal')
  pdf.setFontSize(8)
  pdf.text(lineaResumen,margen,individual?41:35)
  pdf.setFontSize(7)
  pdf.setTextColor(95,105,120)
  pdf.text('No incluye clases canceladas.',margen,individual?46:40)
  const inicioTabla=individual?51:45

  const filas=individual?(datos.detalle||[]):(datos.resumen||[])
  const encabezados=individual
    ? ['Fecha','Hora','Aprendiz / cliente','Documento','Matrícula','Actividad','Categoría','Programación','Estado','Observaciones']
    : ['Fecha','Instructor','Total','Agend.','Dictadas','Pend. cargue','No dict.','Práctica','Teoría','Prueba conduc.']
  const cuerpo=individual?filas.map(f=>[
      fechaVisible(f.fecha),f.hora_inicio,f.aprendiz||'—',f.documento||'—',
      f.consecutivo||'—',nombresActividad[f.tipo_clase]||f.tipo_clase,
      f.categoria||'—',f.tipo_programacion||'—',etiquetaEstado(f.estado),
      observacionLimpia(f.observacion)||'—'
    ]):filas.map(f=>[
      fechaVisible(f.fecha),f.instructor,f.total,f.agendadas,f.dictadas,
      f.pendientes_cargue,f.no_dictadas,f.practicas,f.teorias,f.pruebas_conduccion
    ])
  autoTable(pdf,{
    head:[encabezados],
    body:cuerpo,
    startY:inicioTabla,
    margin:{left:margen,right:margen,top:14,bottom:15},
    theme:'grid',
    styles:{font:'helvetica',fontSize:individual?7:7.5,cellPadding:2.1,
      overflow:'linebreak',valign:'middle',lineColor:[224,231,238],lineWidth:0.12},
    headStyles:{fillColor:[25,69,103],textColor:255,fontStyle:'bold'},
    alternateRowStyles:{fillColor:[247,249,252]},
    columnStyles:individual
      ? {0:{cellWidth:17},1:{cellWidth:13},2:{cellWidth:42},
         3:{cellWidth:21},4:{cellWidth:19},5:{cellWidth:26},
         6:{cellWidth:15},7:{cellWidth:30},8:{cellWidth:22},
         9:{cellWidth:65}}
      : {0:{cellWidth:23},1:{cellWidth:72}}
  })

  // El detalle completo de motivos y observaciones usa un anexo de ancho
  // completo, evitando cortes o letra ilegible en la tabla principal.
  const notas=individual
    ? filas.filter(f=>limpiar(f.motivo_no_dictada)||observacionLimpia(f.observacion))
        .map(f=>[
          fechaVisible(f.fecha)+' '+f.hora_inicio,
          f.aprendiz||'Sin aprendiz',
          etiquetaEstado(f.estado),
          f.motivo_no_dictada||'—',
          observacionLimpia(f.observacion)||'—'
        ])
    : filas.filter(f=>limpiar(f.observaciones_no_dictadas)).map(f=>[
        fechaVisible(f.fecha),f.instructor,f.observaciones_no_dictadas
      ])
  if(notas.length){
    pdf.addPage()
    pdf.setFont('helvetica','bold')
    pdf.setFontSize(12)
    pdf.setTextColor(25,69,103)
    pdf.text(individual?'DETALLE DE MOTIVOS Y OBSERVACIONES':'OBSERVACIONES DE CLASES NO DICTADAS',margen,18)
    autoTable(pdf,{
      head:[individual
        ? ['Fecha / hora','Aprendiz / cliente','Estado','Motivo no dictada','Observación registrada']
        : ['Fecha','Instructor','Observaciones de no dictada']],
      body:notas,startY:24,
      margin:{left:margen,right:margen,top:14,bottom:15},
      theme:'striped',
      styles:{font:'helvetica',fontSize:8,cellPadding:3,overflow:'linebreak',valign:'top'},
      headStyles:{fillColor:[25,69,103],textColor:255},
      columnStyles:individual
        ? {0:{cellWidth:29},1:{cellWidth:59},2:{cellWidth:28},3:{cellWidth:59}}
        : {0:{cellWidth:27},1:{cellWidth:70}}
    })
  }

  const totalPaginas=pdf.internal.getNumberOfPages()
  for(let p=1;p<=totalPaginas;p++){
    pdf.setPage(p)
    const h=pdf.internal.pageSize.getHeight()
    pdf.setDrawColor(220,226,233)
    pdf.line(margen,h-11,ancho-margen,h-11)
    pdf.setFont('helvetica','normal')
    pdf.setFontSize(7)
    pdf.setTextColor(100,110,125)
    pdf.text('DATA CEA · Reporte de programación',margen,h-7)
    pdf.text('Página '+p+' de '+totalPaginas,ancho-margen,h-7,{align:'right'})
  }
  const nombreArchivo='reporte_clases_'+(individual?'instructor_':'general_')+
    filtros.fechaInicio+'_'+filtros.fechaFin+'.pdf'
  pdf.save(nombreArchivo)
}

export default function ReportesProgramacion({nit}) {
  const [fechaInicio,setFechaInicio]=useState(primerDia)
  const [fechaFin,setFechaFin]=useState(actual)
  const [vista,setVista]=useState('GENERAL')
  const [instructorId,setInstructorId]=useState('')
  const [data,setData]=useState(null)
  const [instructores,setInstructores]=useState([])
  const [cargando,setCargando]=useState(false)
  const [error,setError]=useState('')
  const [filtrosAplicados,setFiltrosAplicados]=useState(null)

  useEffect(()=>{
    if(!nit)return
    let mounted=true
    const params=new URLSearchParams({nit,solo_instructores:'1'})
    fetch('/api/admin/programacion/reportes?'+params.toString(),{cache:'no-store'})
      .then(async response=>{
        const json=await response.json()
        if(!response.ok||json.status!=='success')throw new Error(json.message||'Error de catálogo')
        if(mounted)setInstructores(json.instructores||[])
      })
      .catch(err=>{if(mounted)setError(err.message||'No fue posible consultar instructores.')})
    return()=>{mounted=false}
  },[nit])

  async function consultar(e) {
    e?.preventDefault()
    setError('')
    setCargando(true)
    try {
      if(!fechaInicio||!fechaFin||fechaInicio>fechaFin)
        throw new Error('Seleccione fechas válidas.')
      if(vista==='INDIVIDUAL' && !instructorId)
        throw new Error('Seleccione el instructor para el reporte individual.')
      const params=new URLSearchParams({
        nit,fecha_inicio:fechaInicio,fecha_fin:fechaFin
      })
      if(vista==='INDIVIDUAL') params.set('instructor_id',instructorId)
      const response=await fetch('/api/admin/programacion/reportes?'+params.toString(),{
        cache:'no-store'
      })
      const json=await response.json()
      if(!response.ok||json.status!=='success')
        throw new Error(json.message||'No fue posible generar el reporte.')
      setData(json)
      setFiltrosAplicados({vista,fechaInicio,fechaFin,instructorId})
    }catch(err){
      setError(err.message||'Error consultando el reporte.')
      setData(null)
    }finally{setCargando(false)}
  }

  const filas=filtrosAplicados?.vista==='INDIVIDUAL'?(data?.detalle||[]):(data?.resumen||[])
  const columnas=filtrosAplicados?.vista==='INDIVIDUAL'
    ? [['Fecha','fecha'],['Hora','hora_inicio'],['Instructor','instructor'],
       ['Aprendiz / Cliente','aprendiz'],['Documento','documento'],['Matrícula','consecutivo'],
       ['Actividad','tipo_clase'],['Programación','tipo_programacion'],['Categoría','categoria'],
       ['Estado','estado'],['Motivo no dictada','motivo_no_dictada'],['Observación','observacion']]
    : [['Fecha','fecha'],['Instructor','instructor'],['Total','total'],
       ['Agendadas','agendadas'],['Dictadas','dictadas'],
       ['Pendientes de cargue','pendientes_cargue'],['No dictadas','no_dictadas'],
       ['Prácticas','practicas'],['Teoría','teorias'],['Pruebas de conducción','pruebas_conduccion'],
       ['Observaciones no dictadas','observaciones_no_dictadas']]

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 border-b border-slate-200 pb-3">
        <h2 className="text-sm font-black text-[#194567]">Reportes de clases por instructor</h2>
        <p className="mt-1 text-xs text-slate-600">
          Consulte clases agendadas, dictadas, pendientes de cargue y no dictadas.
          No se incluyen las canceladas.
        </p>
      </div>
      <form onSubmit={consultar} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
        <label className="text-xs font-bold text-slate-700">Tipo de reporte
          <select value={vista} onChange={e=>{setVista(e.target.value);setData(null)}}
            className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs">
            <option value="GENERAL">Consolidado diario · Todos</option>
            <option value="INDIVIDUAL">Detalle por instructor</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">Desde
          <input type="date" required value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)}
            className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-2 text-xs"/>
        </label>
        <label className="text-xs font-bold text-slate-700">Hasta
          <input type="date" required min={fechaInicio} value={fechaFin} onChange={e=>setFechaFin(e.target.value)}
            className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-2 text-xs"/>
        </label>
        {vista==='INDIVIDUAL' && (
          <label className="text-xs font-bold text-slate-700">Instructor
            <select required value={instructorId} onChange={e=>setInstructorId(e.target.value)}
              className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs">
              <option value="">Seleccione instructor</option>
              {instructores.map(i=><option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </label>
        )}
        <div className="flex gap-2">
          <button type="submit" disabled={cargando||!nit}
            className="h-10 rounded-lg bg-[#194567] px-4 text-xs font-bold text-white hover:bg-[#246185] disabled:opacity-50">
            {cargando?'Consultando...':'Generar reporte'}
          </button>
          {data && <button type="button" onClick={async ()=>{
              setError('')
              try {
                const instructor=instructores.find(i=>String(i.id)===String(filtrosAplicados.instructorId))
                await generarPDF(data,filtrosAplicados,instructor?.nombre)
              }catch(err){
                console.error('Error al generar el PDF de programación:',err)
                setError('No fue posible generar el PDF. '+(err.message||''))
              }
            }}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700">
            Generar PDF
          </button>}
        </div>
      </form>
      {error&&<div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      {data&&(
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {[['Total',data.totales.total],['Agendadas',data.totales.agendadas],
              ['Dictadas',data.totales.dictadas],['Pendientes de cargue',data.totales.pendientes_cargue],
              ['No dictadas',data.totales.no_dictadas]].map(([name,num])=>(
              <div key={name} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
                <p className="text-[10px] font-semibold text-slate-600">{name}</p>
                <p className="text-lg font-black text-[#194567]">{num}</p>
              </div>
            ))}
          </div>
          <p className="mb-2 text-xs font-semibold text-slate-700">
            {filtrosAplicados.vista==='GENERAL'?'Consolidado por instructor y día':'Clases del instructor seleccionado'}
            {' · '}{fechaVisible(filtrosAplicados.fechaInicio)} al {fechaVisible(filtrosAplicados.fechaFin)}
          </p>
          {filas.length===0 ? <div className="rounded-lg bg-slate-50 p-5 text-center text-xs text-slate-600">
            No hay clases para el rango seleccionado.
          </div> : (
            <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#194567] text-white">
                  <tr>{columnas.map(([h,k])=><th key={k} className="whitespace-nowrap px-3 py-3 font-bold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filas.map((fila,i)=>(
                    <tr key={fila.id||fila.instructor_id+'-'+fila.fecha+'-'+i}
                      className="border-b border-slate-200 even:bg-slate-50">
                      {columnas.map(([h,k])=>(
                        <td key={k} className={`px-3 py-2 ${(k==='observacion'||k==='observaciones_no_dictadas')?'min-w-[210px] whitespace-normal':'whitespace-nowrap'}`}>
                          {k==='fecha'?fechaVisible(fila[k]):k==='estado'?etiquetaEstado(fila[k]):
                            k==='tipo_clase' ? ({PRACTICA:'Práctica',TEORIA:'Teoría',PRUEBA_CONDUCCION:'Prueba de conducción'}[fila[k]]||fila[k]) :
                            limpiar(fila[k])||'—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-500">Las observaciones de no dictada se muestran tanto en el consolidado como en el detalle individual. Los registros sin aprendiz corresponden a actividades sin matrícula o deben consultarse según su origen.</p>
        </>
      )}
      {!data&&!cargando&&<p className="rounded-lg bg-sky-50 p-4 text-xs text-sky-900">
        Seleccione un rango y genere el reporte. El consolidado resume cada instructor por día; el individual identifica a quién se dictó o programó la clase.
      </p>}
    </section>
  )
}
