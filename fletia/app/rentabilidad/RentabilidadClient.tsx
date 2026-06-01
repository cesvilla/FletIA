'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '@/app/components/Sidebar';

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function formatMes(ym: string) {
  const [y, m] = ym.split('-');
  return `${MESES_ES[parseInt(m) - 1]} ${y}`;
}

interface Viaje {
  id: string;
  origen: string | null;
  destino: string | null;
  kilometros: number;
  peso_carga: number;
  costo_total: number;
  peajes_total: number | null;
  litros_totales: number;
  costo_por_km: number;
  flete_cobrado: number;
  created_at: string;
  camiones: { patente: string; marca: string; modelo: string } | null;
}

interface Props {
  viajes: Viaje[];
  empresa: string;
  email: string;
}

export default function RentabilidadClient({ viajes, empresa, email }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState('');

  const iniciales = empresa.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || 'TE';

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  // Meses con movimientos (todos, no solo el actual), del más reciente al más viejo
  const mesesDisponibles = useMemo(() => {
    const set = new Set(viajes.map(v => v.created_at.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [viajes]);

  // Viajes del mes elegido (o todos)
  const viajesMes = useMemo(
    () => mesSeleccionado ? viajes.filter(v => v.created_at.startsWith(mesSeleccionado)) : viajes,
    [viajes, mesSeleccionado],
  );

  // Costo real del viaje = combustible + operativos (en costo_total) + peajes
  const costoReal = (v: Viaje) => v.costo_total + (v.peajes_total ?? 0);

  const totalFlete = viajesMes.reduce((a, v) => a + v.flete_cobrado, 0);
  const totalCosto = viajesMes.reduce((a, v) => a + costoReal(v), 0);
  const totalGanancia = totalFlete - totalCosto;
  const margenPromedio = totalFlete > 0 ? ((totalGanancia / totalFlete) * 100) : 0;

  const viajesRentables = viajesMes.filter(v => v.flete_cobrado > costoReal(v)).length;
  const viajesNegativos = viajesMes.length - viajesRentables;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f0ede8' }}>

      <Sidebar active="rentabilidad" empresa={empresa} email={email} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 md:ml-56">
        <div className="px-4 md:px-7 h-14 flex items-center justify-between sticky top-0 z-30 bg-white" style={{ borderBottom: '1px solid rgba(26,23,20,0.1)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden flex flex-col gap-1 p-1.5">
              <span className="block w-5 h-0.5 bg-gray-800"></span>
              <span className="block w-5 h-0.5 bg-gray-800"></span>
              <span className="block w-5 h-0.5 bg-gray-800"></span>
            </button>
            <div className="text-sm font-bold">Rentabilidad</div>
          </div>
        </div>

        <div className="p-4 md:p-7">

          {/* Selector de período — todos los meses con movimientos */}
          {viajes.length > 0 && (
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#8a8278', textTransform: 'uppercase', letterSpacing: '1px' }}>Período:</span>
              <select
                value={mesSeleccionado}
                onChange={e => setMesSeleccionado(e.target.value)}
                className="bg-white outline-none"
                style={{ border: '1px solid rgba(26,23,20,0.2)', fontFamily: 'DM Mono, monospace', fontSize: '12px', padding: '8px 12px' }}
              >
                <option value="">Todos los meses ({viajes.length})</option>
                {mesesDisponibles.map(m => {
                  const n = viajes.filter(v => v.created_at.startsWith(m)).length;
                  return <option key={m} value={m}>{formatMes(m)} ({n})</option>;
                })}
              </select>
            </div>
          )}

          {viajes.length === 0 && (
            <div className="bg-white border border-dashed border-gray-200 p-12 text-center">
              <div className="text-5xl mb-4">💰</div>
              <h2 className="text-2xl font-bold mb-2">Sin datos aún</h2>
              <p className="text-sm mb-6" style={{ color: '#8a8278' }}>Calculá viajes con el flete cobrado para ver tu rentabilidad.</p>
              <a href="/viajes" className="inline-block text-white px-6 py-3 text-sm font-bold" style={{ backgroundColor: '#d4440c' }}>→ Ir a calculadora</a>
            </div>
          )}

          {viajes.length > 0 && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Flete total cobrado', value: `$${totalFlete.toLocaleString('es-AR')}`, color: '#1a1714' },
                  { label: 'Costo (comb.+peajes)', value: `$${totalCosto.toLocaleString('es-AR')}`, color: '#d4440c' },
                  { label: 'Ganancia neta', value: `$${totalGanancia.toLocaleString('es-AR')}`, color: totalGanancia >= 0 ? '#1a6b3a' : '#d4440c' },
                  { label: 'Margen promedio', value: `${margenPromedio.toFixed(1)}%`, color: margenPromedio >= 20 ? '#1a6b3a' : margenPromedio >= 10 ? '#c8860a' : '#d4440c' },
                ].map((kpi, i) => (
                  <div key={i} className="bg-white border border-gray-200 p-4 md:p-5">
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#8a8278', textTransform: 'uppercase', marginBottom: '8px' }}>{kpi.label}</div>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '28px', fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* Resumen */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white border border-gray-200 p-5 text-center">
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '48px', fontWeight: 900, color: '#1a6b3a' }}>{viajesRentables}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#8a8278' }}>VIAJES RENTABLES</div>
                </div>
                <div className="bg-white border border-gray-200 p-5 text-center">
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '48px', fontWeight: 900, color: '#d4440c' }}>{viajesNegativos}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#8a8278' }}>VIAJES EN ROJO</div>
                </div>
              </div>

              {/* Tabla de viajes */}
              <div className="bg-white border border-gray-200">
                <div className="px-4 py-3 md:px-6 md:py-4" style={{ borderBottom: '1px solid rgba(26,23,20,0.1)' }}>
                  <div className="text-sm font-bold">Detalle por viaje</div>
                </div>
                <div>
                  {viajesMes.map((v, i) => {
                    const ganancia = v.flete_cobrado - costoReal(v);
                    const margen = ((ganancia / v.flete_cobrado) * 100).toFixed(1);
                    const rentable = ganancia >= 0;
                    return (
                      <div key={v.id} className="flex items-center gap-2 md:gap-4 px-4 py-3 md:px-6 md:py-4" style={{ borderBottom: i < viajesMes.length - 1 ? '1px solid rgba(26,23,20,0.08)' : 'none' }}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">
                            {v.origen && v.destino ? `${v.origen} → ${v.destino}` : `${v.kilometros} km`}
                          </div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', marginTop: '2px' }}>
                            {v.camiones?.patente} · {v.peso_carga} ton · flete: ${v.flete_cobrado.toLocaleString('es-AR')}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '20px', fontWeight: 900, color: rentable ? '#1a6b3a' : '#d4440c' }}>
                            {rentable ? '+' : ''}{ganancia.toLocaleString('es-AR')}
                          </div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: rentable ? '#1a6b3a' : '#d4440c' }}>
                            {rentable ? '+' : ''}{margen}% margen
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
