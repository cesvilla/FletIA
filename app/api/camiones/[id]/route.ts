/**
 * API Route: /api/camiones/[id]
 * PATCH  → edita un campo del camión
 * DELETE → desactiva (no borra) el camión
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// PATCH /api/camiones/:id — editar camión
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from('camiones')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', user.id) // seguridad: solo el dueño puede editar
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Camión no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ camion: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/camiones/:id — desactivar camión (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Soft delete: marcamos activo = false, no borramos el registro
    const { error } = await supabase
      .from('camiones')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
