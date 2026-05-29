import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ajustarModeloConsumo, type PuntoConsumo } from '@/lib/ai';

// Rango de cordura para el consumo medido (L/100km). Fuera de esto, el dato
// cargado es casi seguro un error de tipeo y se rechaza para no ensuciar el modelo.
const CONSUMO_MIN = 8;
const CONSUMO_MAX = 120;

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

    const consumoRealMedido = (litros_reales / viaje.kilometros) * 100;

    // ── Tope de cordura ───────────────────────────────────────────────────────
    if (consumoRealMedido < CONSUMO_MIN || consumoRealMedido > CONSUMO_MAX) {
      return NextResponse.json({
        error: `Ese valor da un consumo de ${consumoRealMedido.toFixed(0)} lts/100km, fuera de lo posible para un camión. ` +
               `Verificá los litros cargados (${litros_reales}) y los kilómetros (${viaje.kilometros}).`,
      }, { status: 422 });
    }

    const camion = viaje.camiones;
    const consumoVacioActual: number = camion.consumo_base_litros;
    const pendienteActual: number | null = camion.consumo_pendiente_litros ?? null;

    // ── 1. Guardar litros reales en el viaje ─────────────────────────────────
    await supabase
      .from('viajes')
      .update({
        litros_reales,
        consumo_real_cargado: Math.round(consumoRealMedido * 10) / 10,
      })
      .eq('id', viaje_id);

    // ── 2. Traer todos los viajes con litros reales de este camión ───────────
    const { data: viajesConDatos } = await supabase
      .from('viajes')
      .select('litros_reales, kilometros, porcentaje_carga')
      .eq('camion_id', camion.id)
      .not('litros_reales', 'is', null)
      .gt('litros_reales', 0)
      .order('created_at', { ascending: false })
      .limit(20);

    const todos = (viajesConDatos ?? []).map(t => ({
      litros_reales: t.litros_reales as number,
      kilometros: t.kilometros as number,
      porcentaje_carga: (t.porcentaje_carga ?? 0) as number,
    }));

    // Garantizar que el viaje recién cargado esté presente (Postgres es ACID,
    // pero por las dudas lo agregamos al frente si no quedó en la consulta).
    const yaEsta = todos.some(
      t => t.kilometros === viaje.kilometros && t.litros_reales === litros_reales
    );
    if (!yaEsta) {
      todos.unshift({
        litros_reales,
        kilometros: viaje.kilometros,
        porcentaje_carga: viaje.porcentaje_carga ?? 0,
      });
    }

    // ── 3. Construir puntos (carga, consumo) y ajustar el modelo lineal ───────
    const puntos: PuntoConsumo[] = todos.map(t => ({
      fraccionCarga: Math.min(Math.max((t.porcentaje_carga ?? 0) / 100, 0), 1),
      consumo: (t.litros_reales / t.kilometros) * 100,
    }));

    const modelo = ajustarModeloConsumo(
      puntos,
      { consumoVacio: consumoVacioActual, pendienteCarga: pendienteActual },
    );

    // ── 4. Actualizar el camión con ambos parámetros aprendidos ───────────────
    await supabase
      .from('camiones')
      .update({
        consumo_base_litros: modelo.consumoVacio,
        consumo_pendiente_litros: modelo.pendienteCarga,
      })
      .eq('id', camion.id);

    // ── 5. Precisión de la estimación original ────────────────────────────────
    const litrosEstimado: number = viaje.litros_totales;
    const diferenciaPct = Math.abs((litros_reales - litrosEstimado) / litrosEstimado * 100);
    const precisionPct = Math.round(Math.max(0, 100 - diferenciaPct) * 10) / 10;

    const aprendio =
      Math.abs(modelo.consumoVacio - consumoVacioActual) >= 0.1 ||
      (pendienteActual != null && Math.abs(modelo.pendienteCarga - pendienteActual) >= 0.1) ||
      pendienteActual == null;

    return NextResponse.json({
      ok: true,
      consumoRealMedido:    Math.round(consumoRealMedido * 10) / 10,
      // Compat. con la UI existente
      consumoBaseAnterior:  consumoVacioActual,
      consumoBaseNuevo:     modelo.consumoVacio,
      // Nuevos campos del modelo lineal
      consumoVacioNuevo:    modelo.consumoVacio,
      pendienteCargaNueva:  modelo.pendienteCarga,
      metodo:               modelo.metodo,
      precisionPct,
      diferenciaPct:        Math.round(diferenciaPct * 10) / 10,
      litrosEstimado:       Math.round(litrosEstimado * 10) / 10,
      litrosReales:         litros_reales,
      viajesEntrenados:     modelo.n,
      aprendio,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
