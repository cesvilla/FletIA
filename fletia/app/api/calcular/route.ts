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
      precioCombustible: body.precio_combustible,
    });

    return NextResponse.json({
      resultado,
      camion: { patente: camion.patente, marca: camion.marca, modelo: camion.modelo },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}