import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();

    const { data: viaje, error } = await supabase
      .from('viajes')
      .insert({
        user_id: user.id,
        camion_id: body.camion_id,
        origen: body.origen || null,
        destino: body.destino || null,
        kilometros: body.kilometros,
        peso_carga: body.peso_carga,
        detalle_carga: body.detalle_carga || null,
        tipo_ruta: body.tipo_ruta || 'mixta',
        terreno: body.terreno || 'plano',
        precio_combustible: body.precio_combustible,
        factor_peso: body.resultado.factorPeso,
        factor_ruta: body.resultado.factorRuta,
        factor_terreno: body.resultado.factorTerreno,
        consumo_real: body.resultado.consumoReal,
        litros_totales: body.resultado.litrosTotales,
        costo_total: body.resultado.costoTotal,
        costo_por_km: body.resultado.costoPorKm,
        porcentaje_carga: body.resultado.porcentajeCarga,
        descripcion_ia: body.resultado.descripcion,
        flete_cobrado: body.flete_cobrado || null,
        peajes_total: body.peajes_total || 0,
      })
      .select('*, camiones(patente, marca, modelo)')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ viaje });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
