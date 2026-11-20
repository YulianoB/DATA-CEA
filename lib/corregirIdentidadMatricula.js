// Corrección administrativa de identidad y categoría sin recrear matrícula.
// Se ejecuta exclusivamente desde la API Next.js; sin RPC ni triggers personalizados.
// Cada modificación se comprueba. Se intenta compensar en orden inverso ante fallos.
const TEXTO = v => String(v ?? '').trim()
const UNICO = rows => [...new Set(rows)]
const igual = (a,b) => JSON.stringify(a) === JSON.stringify(b)
const errorNegocio = (message,status=409) => Object.assign(new Error(message),{status})

async function leer(db,tabla,construir) {
  let q=db.from(tabla).select('*')
  q=construir(q)
  const {data,error}=await q.limit(900)
  if(error)throw errorNegocio('No se pudo verificar '+tabla+': '+error.message)
  if((data||[]).length===900)throw errorNegocio('Demasiados registros vinculados en '+tabla+'. Se requiere revisión manual.')
  return data||[]
}
async function aplicar(db,registro,ledger){
  const {tabla,id,cambios,antes}=registro
  if(igual(cambios,{}))return
  let q=db.from(tabla).update(cambios).eq('id',id)
  // Comparación contra el valor previo para evitar sobrescrituras observadas.
  for(const [col,val] of Object.entries(antes)){
    if(val===null)q=q.is(col,null)
    else if(!Array.isArray(val)&&typeof val!=='object')q=q.eq(col,val)
  }
  const {data,error}=await q.select('id').maybeSingle()
  if(error||!data)throw errorNegocio(
    'No se pudo actualizar '+tabla+' #'+id+'. '+(error?.message||'Registro modificado por otro usuario.'))
  ledger.push(registro)
}
async function restaurar(db,ledger){
  const fallos=[]
  for(const r of [...ledger].reverse()){
    let q=db.from(r.tabla).update(r.antes).eq('id',r.id)
    for(const [k,v] of Object.entries(r.cambios)){
      if(v===null)q=q.is(k,null)
      else if(!Array.isArray(v)&&typeof v!=='object')q=q.eq(k,v)
    }
    const {data,error}=await q.select('id').maybeSingle()
    if(error||!data)fallos.push(r.tabla+' #'+r.id)
  }
  return fallos
}
const objetoCambio=(tabla,row,cambios)=>{
 const antes=Object.fromEntries(Object.keys(cambios).map(k=>[k,row[k]??null]))
 const reales=Object.fromEntries(Object.entries(cambios).filter(([k,v])=>!igual(v,antes[k])))
 return {tabla,id:row.id,cambios:reales,antes:Object.fromEntries(Object.keys(reales).map(k=>[k,antes[k]]))}
}
const algunoAvanzado=(rows,campos)=>rows.some(r=>campos.some(([col,permitidos])=>
  r[col]!=null&&!permitidos.includes(String(r[col]).toUpperCase())))

export async function corregirIdentidadCategoria(db,{matriculaId,documentoAnterior,documentoNuevo,categoriaNueva,catalogo}){
  const [seleccionada]=await leer(db,'aprendices',q=>q.eq('id',matriculaId))
  if(!seleccionada)throw errorNegocio('No existe la matrícula seleccionada.',404)
  if(TEXTO(seleccionada.documento)!==documentoAnterior)
    throw errorNegocio('El documento cambió en otra sesión. Actualice el expediente.')
  const categoriaAnterior=seleccionada.categorias?.[0]
  if(!categoriaAnterior||seleccionada.categorias?.length!==1)
    throw errorNegocio('Esta matrícula no tiene una sola categoría identificable.')
  const docCambio=documentoAnterior!==documentoNuevo
  const catCambio=categoriaAnterior!==categoriaNueva
  if(!docCambio&&!catCambio)return {actualizadas:0,documento:documentoAnterior,categoria:categoriaAnterior}
  if(!/^\d{4,15}$/.test(documentoNuevo))
    throw errorNegocio('El documento debe contener entre 4 y 15 dígitos.',400)
  if(!catalogo.includes(categoriaNueva))
    throw errorNegocio('La categoría no pertenece al catálogo vigente.',400)

  const hermanas=await leer(db,'aprendices',q=>q.eq('documento',documentoAnterior))
  if(!hermanas.some(x=>x.id===matriculaId))
    throw errorNegocio('No se encontró la matrícula dentro del historial de este documento.')
  if(docCambio){
    const yaExiste=await leer(db,'aprendices',q=>q.eq('documento',documentoNuevo))
    if(yaExiste.length)
      throw errorNegocio('El nuevo documento ya corresponde a otro expediente. No se fusionarán historiales automáticamente.')
  }
  if(catCambio&&hermanas.some(x=>x.id!==matriculaId&&x.categorias?.includes(categoriaNueva)))
    throw errorNegocio('Este aprendiz ya tiene una matrícula para la categoría '+categoriaNueva+'.')

  const matriculas=hermanas.map(x=>x.id)
  const [runt,sicov,siet,cargues,avisos,clases,detalles,recibos]=await Promise.all([
    leer(db,'control_runt',q=>q.in('matricula_id',matriculas)),
    leer(db,'control_sicov',q=>q.in('matricula_id',matriculas)),
    leer(db,'control_siet',q=>q.in('matricula_id',matriculas)),
    leer(db,'runt_cargues_clases',q=>q.in('matricula_id',matriculas)),
    leer(db,'runt_notificaciones',q=>q.in('matricula_id',matriculas)),
    leer(db,'programacion_clases',q=>q.in('matricula_id',matriculas)),
    leer(db,'cuentas_aprendiz_detalle',q=>q.in('matricula_id',matriculas)),
    leer(db,'recibos_caja',q=>q.in('matricula_id',matriculas)),
  ])
  const controles=[...runt,...sicov,...siet]
  if(catCambio){
    if(cargues.some(x=>x.matricula_id===matriculaId))
      throw errorNegocio('La categoría tiene clases cargadas a RUNT. No se cambia automáticamente un registro ya reportado.')
    if(clases.some(x=>x.matricula_id===matriculaId&&x.estado!=='CANCELADA'))
      throw errorNegocio('Hay clases programadas o dictadas en esta categoría. Revise Programación antes de corregirla.')
    if(algunoAvanzado(runt.filter(x=>x.matricula_id===matriculaId),[
      ['estado_verificacion',['PENDIENTE']],['estado_registro',['PENDIENTE']],['estado_certificacion',['PENDIENTE']]
    ])||algunoAvanzado(sicov.filter(x=>x.matricula_id===matriculaId),[
      ['estado_registro',['PENDIENTE']],['estado_certificacion',['PENDIENTE']]
    ])||algunoAvanzado(siet.filter(x=>x.matricula_id===matriculaId),[['estado',['PENDIENTE']]]))
      throw errorNegocio('La categoría ya tiene verificaciones o registros externos. Primero se requiere revisión administrativa.')
  }

  // Las obligaciones se identifican por detalles vinculados; no por coincidencias
  // globales del documento, que podrían pertenecer a un tercero.
  const cuentasIds=UNICO(detalles.map(x=>x.cuenta_id).filter(Boolean))
  const cuentas=cuentasIds.length?await leer(db,'cuentas_aprendiz',q=>q.in('id',cuentasIds)):[]
  const recibosCuentas=cuentasIds.length?await leer(db,'recibos_caja',q=>q.in('cuenta_id',cuentasIds)):[]
  const recibosTodos=UNICO([...recibos,...recibosCuentas].map(r=>r.id))
  const pagos=recibosTodos.length?await leer(db,'recibos_caja_detalle',q=>q.in('recibo_id',recibosTodos)):[]
  const cambios=[]
  const agregar=(tabla,rows,armar)=>{
    for(const row of rows){
      const nuevos=armar(row)
      if(nuevos&&Object.keys(nuevos).length)cambios.push(objetoCambio(tabla,row,nuevos))
    }
  }
  const reemplazarCategorias=arr=>{
    if(!Array.isArray(arr))return arr
    return arr.map(x=>x===categoriaAnterior?categoriaNueva:x)
  }
  agregar('aprendices',hermanas,r=>({
    ...(docCambio?{documento:documentoNuevo}:{}),
    ...(catCambio&&r.id===matriculaId?{categorias:[categoriaNueva]}:{})
  }))
  const controlCambio=r=>({
    ...(docCambio&&r.documento===documentoAnterior?{documento:documentoNuevo}:{}),
    ...(catCambio&&r.matricula_id===matriculaId?{categoria:categoriaNueva}:{})
  })
  for(const [tabla,rows] of [['control_runt',runt],['control_sicov',sicov],['control_siet',siet]])
    agregar(tabla,rows,controlCambio)
  agregar('runt_cargues_clases',cargues,controlCambio)
  agregar('runt_notificaciones',avisos,controlCambio)
  agregar('cuentas_aprendiz',cuentas,r=>docCambio&&r.documento===documentoAnterior?{documento:documentoNuevo}:{})
  agregar('cuentas_aprendiz_detalle',detalles,r=>catCambio&&r.matricula_id===matriculaId?{
    categorias:reemplazarCategorias(r.categorias)
  }:{})
  agregar('recibos_caja',UNICO([...recibos,...recibosCuentas].map(x=>x.id)).map(id=>
    [...recibos,...recibosCuentas].find(x=>x.id===id)),r=>({
    ...(docCambio&&r.documento===documentoAnterior?{documento:documentoNuevo}:{}),
    ...(docCambio&&r.documento_cliente===documentoAnterior?{documento_cliente:documentoNuevo}:{}),
    ...(catCambio&&r.matricula_id===matriculaId&&r.categoria===categoriaAnterior?{categoria:categoriaNueva}:{})
  }))
  const detalleIds=new Set(detalles.filter(x=>x.matricula_id===matriculaId).map(x=>x.id))
  agregar('recibos_caja_detalle',pagos,r=>catCambio&&detalleIds.has(r.cuenta_detalle_id)?{
    categorias:reemplazarCategorias(r.categorias)
  }:{})

  const ledger=[]
  try{
    for(const cambio of cambios)await aplicar(db,cambio,ledger)
  }catch(e){
    const fallos=await restaurar(db,ledger)
    if(fallos.length)
      throw errorNegocio('ATENCIÓN: corrección parcialmente aplicada y recuperación incompleta ('+
        fallos.join(', ')+'). No repita la operación. Solicite revisión administrativa.',500)
    throw errorNegocio('No se guardó la corrección. Los cambios previos se revirtieron: '+e.message,e.status||409)
  }
  return {actualizadas:ledger.length,matriculas:matriculas.length,
    documento:documentoNuevo,categoria:categoriaNueva}
}
