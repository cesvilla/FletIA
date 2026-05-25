import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { calcularViaje } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.camion_id) return NextResponse.json({ error: 'Seleccioná un camión' }, { status: 400 });
    if (!body.kilometros || body.kilometros <= 0) return NextResponse.json({ error: 'Ingresá los kilómetros' }, { status: 400 });
    if (body.peso_carga === undefined || body.peso_carga < 0) return NextResponse.json({ error: 'Ingresá el peso de la carga' }, { status: 400 });
    if (!body.precio_combustible || body.precio_combustible <= 0) return NextResponse.json({ error: 'Ingresá el precio del combustible' }, { status: 400 });

    const { data: camion, error: camionError } = await supabase
      .from('camiones')
      .select('*')
      .eq('id', body.camion_id)
      .eq('user_id', user.id)
      .single();

    if (camionError || !camion) {
      return NextResponse.json({ error: 'Camión no encontrado' }, { status: 404 });
    }

    const resultado = calcularViaje({
      consumoBase: camion.consumo_base_litros,
      capacidadMax: camion.capacidad_max_ton,
      pesoCarga: body.peso_carga,
      kilometros: body.kilometros,
      tipoRuta: body.tipo_ruta || 'mixta',
      terreno: body.terreno || 'plano',
      precioCombustible: body.precio_combustible,
      condicionCamion: camion.condicion,
    });

    const { data: viaje } = await supabase
      .from('viajes')
      .insert({
        user_id: user.id,
        camion_id: body.camion_id,
        origen: body.origen || null,
        destino: body.destino || null,
        kilometros: body.kilometros,
        peso_carga: body.peso_carga,
        tipo_ruta: body.tipo_ruta || 'mixta',
        terreno: body.terreno || 'plano',
        precio_combustible: body.precio_combustible,
        factor_peso: resultado.factorPeso,
        factor_ruta: resultado.factorRuta,
        factor_terreno: resultado.factorTerreno,
        factor_condicion: resultado.factorCondicion,
        consumo_real: resultado.consumoReal,
        litros_totales: resultado.litrosTotales,
        costo_total: resultado.costoTotal,
        costo_por_km: resultado.costoPorKm,
        porcentaje_carga: resultado.porcentajeCarga,
        descripcion_ia: resultado.descripcion,
        flete_cobrado: body.flete_cobrado || null,
      })
      .select()
      .single();

    return NextResponse.json({
      resultado,
      viaje: viaje || null,
      camion: { patente: camion.patente, marca: camion.marca, modelo: camion.modelo },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}