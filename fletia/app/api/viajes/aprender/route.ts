import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { calcularNuevoConsumoBase } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { viaje_id, litros_reales } = await request.json();
    if (!viaje_id || !litros_reales || litros_reales <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const { data: viaje, error: viajeError } = await supabase
      .from('viajes')
      .select('*, camiones(*)')
      .eq('id', viaje_id)
      .eq('user_id', user.id)
      .single();

    if (viajeError || !viaje) return NextResponse.json({ error: 'Viaje no encontrado' }, { status: 404 });

    const camion = viaje.camiones;
    const consumoBaseActual = camion.consumo_base_litros;

    const nuevoConsumoBase = calcularNuevoConsumoBase(
      consumoBaseActual,
      litros_reales,
      viaje.kilometros,
      viaje.factor_peso,
    );

    const consumoRealMedido = (litros_reales / viaje.kilometros) * 100;

    await supabase
      .from('viajes')
      .update({
        litros_reales,
        consumo_real_cargado: Math.round(consumoRealMedido * 10) / 10,
      })
      .eq('id', viaje_id);

    await supabase
      .from('camiones')
      .update({ consumo_base_litros: nuevoConsumoBase })
      .eq('id', camion.id);

    const diferencia = consumoRealMedido - viaje.consumo_real;
    const aprendio = Math.abs(nuevoConsumoBase - consumoBaseActual) > 0.1;

    return NextResponse.json({
      ok: true,
      consumoRealMedido: Math.round(consumoRealMedido * 10) / 10,
      consumoBaseAnterior: consumoBaseActual,
      consumoBaseNuevo: nuevoConsumoBase,
      diferencia: Math.round(diferencia * 10) / 10,
      aprendio,
      mensaje: aprendio
        ? `Litros reales cargados: ${litros_reales} lts\nEstimado original: ${Math.round(viaje.litros_totales * 10) / 10} lts`
        : `Litros reales cargados: ${litros_reales} lts\nEstimado original: ${Math.round(viaje.litros_totales * 10) / 10} lts\n¡Estimación perfecta!`,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

