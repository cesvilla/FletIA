import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  validarCambioPatente,
  validarCambioCapacidad,
  normalizarPatente,
  validarPatenteAR,
} from '@/lib/camion-lock';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();

    // Cargar el camión actual para comparar cambios sensibles.
    const { data: actual, error: errActual } = await supabase
      .from('camiones')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (errActual || !actual) {
      return NextResponse.json({ error: 'Camión no encontrado' }, { status: 404 });
    }

    const nuevaPatente = body.patente ? normalizarPatente(body.patente) : normalizarPatente(actual.patente);
    const nuevaCapacidad = body.capacidad_max_ton ?? actual.capacidad_max_ton;

    // ¿La patente cambia de verdad? Comparamos ambas NORMALIZADAS para no
    // contar como "cambio" una patente vieja que tenía guiones/espacios.
    const patenteCambia = normalizarPatente(actual.patente) !== nuevaPatente;

    const ctx = {
      createdAt: actual.created_at,
      ultimoCambioPatente: actual.ultimo_cambio_patente ?? null,
    };

    // ── Patente ────────────────────────────────────────────────────────────
    // Solo validamos formato y reglas de lock cuando el usuario REALMENTE
    // cambia la patente. Camiones existentes con patentes legacy/no estándar
    // se pueden seguir editando (otros campos) sin tocar la patente.
    if (patenteCambia) {
      if (!validarPatenteAR(nuevaPatente)) {
        return NextResponse.json(
          { error: 'Formato de patente inválido. Usá ABC123 o AB123CD.' },
          { status: 400 },
        );
      }
      const vPatente = validarCambioPatente(actual.patente, nuevaPatente, ctx);
      if (!vPatente.ok) {
        return NextResponse.json({ error: vPatente.motivo, codigo: vPatente.codigo }, { status: 403 });
      }
    }

    // ── Capacidad ──────────────────────────────────────────────────────────
    const vCap = validarCambioCapacidad(actual.capacidad_max_ton, nuevaCapacidad, ctx);
    if (!vCap.ok) {
      return NextResponse.json({ error: vCap.motivo, codigo: vCap.codigo }, { status: 403 });
    }

    // ── Construir update ───────────────────────────────────────────────────
    const update: Record<string, any> = {
      // Si la patente no cambió, dejamos la original intacta (no reescribimos
      // legacy plates con guiones); si cambió, guardamos la versión normalizada.
      patente: patenteCambia ? nuevaPatente : actual.patente,
      patente_semi: body.patente_semi ? normalizarPatente(body.patente_semi) : null,
      marca: body.marca,
      modelo: body.modelo,
      anio: body.anio,
      alias: body.alias || null,
      tipo_combustible: body.tipo_combustible,
      capacidad_max_ton: nuevaCapacidad,
      consumo_base_litros: body.consumo_base_litros,
      condicion: body.condicion,
      carroceria: body.carroceria,
    };

    // Si la patente cambió, marcar la fecha de la corrección (para el cooldown).
    if (patenteCambia) {
      update.ultimo_cambio_patente = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('camiones')
      .update(update)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    // Auditoría: registrar cambios sensibles (mejor-esfuerzo, no falla el PATCH).
    const cambios: Array<{ campo: string; valor_viejo: string; valor_nuevo: string }> = [];
    if (patenteCambia)
      cambios.push({ campo: 'patente', valor_viejo: actual.patente, valor_nuevo: nuevaPatente });
    if (nuevaCapacidad !== actual.capacidad_max_ton)
      cambios.push({ campo: 'capacidad_max_ton', valor_viejo: String(actual.capacidad_max_ton), valor_nuevo: String(nuevaCapacidad) });
    if (cambios.length) {
      try {
        await supabase.from('camion_cambios').insert(
          cambios.map(c => ({
            camion_id: params.id,
            user_id: user.id,
            campo: c.campo,
            valor_viejo: c.valor_viejo,
            valor_nuevo: c.valor_nuevo,
          })),
        );
      } catch (_e) {
        // Si la tabla aún no fue creada, ignoramos en silencio.
      }
    }

    return NextResponse.json({ camion: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { error } = await supabase
      .from('camiones')
      .update({ activo: false })
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
