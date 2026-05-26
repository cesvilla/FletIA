import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('camiones')
      .select('*')
      .eq('user_id', user.id)
      .eq('activo', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ camiones: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();

    if (!body.patente || !body.marca || !body.modelo || !body.anio) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('camiones')
      .insert({
        user_id: user.id,
        patente: body.patente.toUpperCase().trim(),
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
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ camion: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
