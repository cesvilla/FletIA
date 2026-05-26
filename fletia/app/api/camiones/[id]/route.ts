import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();

    const { data, error } = await supabase
      .from('camiones')
      .update({
        patente: body.patente?.toUpperCase().trim(),
        patente_semi: body.patente_semi ? body.patente_semi.toUpperCase().trim() : null,
        marca: body.marca,
        modelo: body.modelo,
        anio: body.anio,
        alias: body.alias || null,
        tipo_combustible: body.tipo_combustible,
        capacidad_max_ton: body.capacidad_max_ton,
        consumo_base_litros: body.consumo_base_litros,
        condicion: body.condicion,
        carroceria: body.carroceria,
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
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
