// app/api/reuniones/finalizar/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'


function respuestaError(error) {
  const respuesta =
    respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    {
      status:
        respuesta.status,
    }
  )
}


function nowBogotaParts() {
  const tz =
    'America/Bogota'

  const d =
    new Date()

  const ymd =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    ).format(d)

  const hm =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }
    ).format(d)

  return {
    ymd,
    hm,
  }
}


export async function POST(request) {
  try {
    let body = {}

    try {
      body =
        await request.json()
    } catch {
      body = {}
    }

    const {
      supabase,
    } =
      await obtenerSupabaseEmpresaDesdeRequest(
        request,
        body
      )

    const {
      ymd,
      hm,
    } =
      nowBogotaParts()


    /*
      Consultar solamente reuniones programadas
      cuya fecha corresponde al día actual.
    */
    const {
      data,
      error,
    } =
      await supabase
        .from('reuniones')
        .select(`
          id,
          hora_fin
        `)
        .eq(
          'fecha_programada',
          ymd
        )
        .eq(
          'estado',
          'Programada'
        )


    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            error.message,
        },
        {
          status: 400,
        }
      )
    }


    const candidatas =
      (data || []).filter(
        (reunion) =>
          String(
            reunion.hora_fin
          ) < hm
      )


    let ejecutadas = 0


    for (
      const reunion
      of candidatas
    ) {
      const {
        count,
        error:
          countError,
      } =
        await supabase
          .from('asistencias')
          .select(
            'id',
            {
              count: 'exact',
              head: true,
            }
          )
          .eq(
            'id_reunion',
            reunion.id
          )


      if (countError) {
        console.error(
          `Error consultando asistencias de reunión ${reunion.id}:`,
          countError
        )

        continue
      }


      /*
        Si la reunión terminó pero no tiene
        asistencias, conserva estado Programada.
      */
      if (
        (count ?? 0) <= 0
      ) {
        continue
      }


      const {
        error:
          updateError,
      } =
        await supabase
          .from('reuniones')
          .update({
            estado:
              'Ejecutada',
          })
          .eq(
            'id',
            reunion.id
          )


      if (updateError) {
        console.error(
          `Error finalizando reunión ${reunion.id}:`,
          updateError
        )

        continue
      }


      ejecutadas += 1
    }


    return NextResponse.json({
      status:
        'success',

      ejecutadas,
    })
  } catch (error) {
    console.error(
      'Error POST /api/reuniones/finalizar:',
      error
    )

    return respuestaError(
      error
    )
  }
}