import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { viaje_id, litros_reales } = await request.json();
    if (!viaje_id || !litros_reales || litros_reales <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    // Cargar el viaje con el camión
    const { data: viaje, error: viajeError } = await supabase
      .from('viajes')
      .select('*, camiones(*)')
      .eq('id', viaje_id)
      .eq('user_id', user.id)
      .single();

    if (viajeError || !viaje) return NextResponse.json({ error: 'Viaje no encontrado' }, { status: 404 });

    const camion = viaje.camiones;
    const consumoBaseActual: number = camion.consumo_base_litros;
    const consumoRealMedido = (litros_reales / viaje.kilometros) * 100;

    // ── 1. Guardar litros reales en el viaje ─────────────────────────────────
    await supabase
      .from('viajes')
      .update({
        litros_reales,
        consumo_real_cargado: Math.round(consumoRealMedido * 10) / 10,
      })
      .eq('id', viaje_id);

    // ── 2. Traer todos los viajes con litros reales de este camión ───────────
    // (incluye el que acabamos de guardar — Postgres es ACID)
    const { data: viajesConDatos } = await supabase
      .from('viajes')
      .select('litros_reales, kilometros, factor_peso')
      .eq('camion_id', camion.id)
      .not('litros_reales', 'is', null)
      .gt('litros_reales', 0)
      .order('created_at', { ascending: false })
      .limit(15);

    const todos = viajesConDatos ?? [];

    // Si por alguna razón el viaje actual no quedó en la consulta, lo agregamos
    const yaEsta = todos.some(
      t => t.kilometros === viaje.kilometros && t.litros_reales === litros_reales
    );
    if (!yaEsta) {
      todos.unshift({ litros_reales, kilometros: viaje.kilometros, factor_peso: viaje.factor_peso ?? 1.0 });
    }

    // ── 3. Para cada viaje real, calcular el consumo BASE implícito (sin carga)
    // consumoBase = consumoConCarga / factorPeso
    const consumosBase = todos.map(t => {
      const conCarga = (t.litros_reales / t.kilometros) * 100;
      const fp = t.factor_peso > 0 ? t.factor_peso : 1.0;
      return conCarga / fp;
    });

    // ── 4. Promedio ponderado exponencial: más reciente = más peso
    // Pesos: 1, 0.6, 0.36, 0.216... (factor decay = 0.6)
    // Esto da ~50% del peso a los 2 más recientes y ~80% a los 4 más recientes
    const DECAY = 0.6;
    let sumaPesos = 0;
    let sumaValores = 0;
    consumosBase.forEach((val, i) => {
      const peso = Math.pow(DECAY, i);
      sumaValores += val * peso;
      sumaPesos += peso;
    });
    const nuevoConsumoBase = Math.round(
      Math.min(Math.max(sumaValores / sumaPesos, 15), 60) * 10
    ) / 10;

    // ── 5. Actualizar el camión ───────────────────────────────────────────────
    await supabase
      .from('camiones')
      .update({ consumo_base_litros: nuevoConsumoBase })
      .eq('id', camion.id);

    // ── 6. Calcular precisión de la estimación original ───────────────────────
    const litrosEstimado: number = viaje.litros_totales;
    const diferenciaPct = Math.abs((litros_reales - litrosEstimado) / litrosEstimado * 100);
    const precisionPct = Math.round(Math.max(0, 100 - diferenciaPct) * 10) / 10;

    const aprendio = Math.abs(nuevoConsumoBase - consumoBaseActual) >= 0.1;
    const viajesEntrenados = todos.length;

    return NextResponse.json({
      ok: true,
      consumoRealMedido:    Math.round(consumoRealMedido * 10) / 10,
      consumoBaseAnterior:  consumoBaseActual,
      consumoBaseNuevo:     nuevoConsumoBase,
      precisionPct,
      diferenciaPct:        Math.round(diferenciaPct * 10) / 10,
      litrosEstimado:       Math.round(litrosEstimado * 10) / 10,
      litrosReales:         litros_reales,
      viajesEntrenados,
      aprendio,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
