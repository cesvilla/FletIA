import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PRECIOS_HOY = [
  { empresa: 'YPF', tipo: 'Gasoil Comun', precio: 1187 },
  { empresa: 'YPF', tipo: 'Gasoil Premium', precio: 1380 },
  { empresa: 'Shell', tipo: 'Gasoil Comun', precio: 1195 },
  { empresa: 'Shell', tipo: 'Gasoil Premium', precio: 1395 },
  { empresa: 'Axion', tipo: 'Gasoil Comun', precio: 1180 },
  { empresa: 'Axion', tipo: 'Gasoil Premium', precio: 1370 },
  { empresa: 'Puma', tipo: 'Gasoil Comun', precio: 1175 },
  { empresa: 'Puma', tipo: 'Gasoil Premium', precio: 1360 },
];

export async function GET() {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase.from('precio_combustible').select('id').eq('fecha', today).limit(1);
  if (existing && existing.length > 0) {
    const { data } = await supabase.from('precio_combustible').select('*').eq('fecha', today);
    return NextResponse.json({ precios: data, source: 'cache' });
  }
  const rows = PRECIOS_HOY.map(p => ({ ...p, fecha: today }));
  await supabase.from('precio_combustible').insert(rows);
  return NextResponse.json({ precios: rows, source: 'inserted' });
}
