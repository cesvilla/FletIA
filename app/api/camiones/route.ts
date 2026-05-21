/**
 * API Route: /api/camiones
 * GET  → devuelve todos los camiones del usuario logueado
 * POST → crea un nuevo camión
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { NuevoCamion } from '@/lib/types';

// GET /api/camiones — traer todos los camiones del usuario
export async function GET() {
  try {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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

// POST /api/camiones — crear un nuevo camión
export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body: NuevoCamion = await request.json();

    // Validaciones básicas
    if (!body.patente || !body.marca || !body.modelo || !body.anio) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: patente, marca, modelo, año' },
        { status: 400 }
      );
    }

    if (!body.capacidad_max_ton || body.capacidad_max_ton <= 0) {
      return NextResponse.json(
        { error: 'La capacidad máxima debe ser mayor a 0' },
        { status: 400 }
      );
    }

    if (!body.consumo_base_litros || body.consumo_base_litros <= 0) {
      return NextResponse.json(
        { error: 'El consumo base debe ser mayor a 0' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('camiones')
      .insert({
        user_id: user.id,
        patente: body.patente.toUpperCase().trim(),
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
