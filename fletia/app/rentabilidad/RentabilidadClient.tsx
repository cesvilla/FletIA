'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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

  const iniciales = empresa.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || 'TE';

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  // Costo real del viaje = combustible + peajes (los peajes ya están guardados por viaje)
  const costoReal = (v: Viaje) => v.costo_total + (v.peajes_total ?? 0);

  const totalFlete = viajes.reduce((a, v) => a + v.flete_cobrado, 0);
  const totalCosto = viajes.reduce((a, v) => a + costoReal(v), 0);
  const totalGanancia = totalFlete - totalCosto;
  const margenPromedio = totalFlete > 0 ? ((totalGanancia / totalFlete) * 100) : 0;

  const viajesRentables = viajes.filter(v => v.flete_cobrado > costoReal(v)).length;
  const viajesNegativos = viajes.length - viajesRentables;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f0ede8' }}>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />
      )}

      <aside className={`fixed top-0 left-0 h-screen w-56 flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} style={{ backgroundColor: '#1a1714' }}>
        <div className="p-6 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-2xl font-black text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Flet<span style={{ color: '#d4440c' }}>IA</span>
            </div>
            <div className="text-white/30 mt-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '2px' }}>
              // combustible inteligente
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/40 hover:text-white text-xl">×</button>
        </div>

        <nav className="flex-1 py-4">
          <div className="px-5 my-4 text-white/25 uppercase" style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '2px' }}>Principal</div>
          <a href="/dashboard" className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/5 cursor-pointer transition-colors"><span>⚡</span> Dashboard</a>
          <a href="/viajes" className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/5 cursor-pointer transition-colors"><span>🧮</span> Calculadora</a>
          <a href="/camiones" className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/5 cursor-pointer transition-colors"><span>🚛</span> Mis camiones</a>
          <div className="px-5 my-4 text-white/25 uppercase" style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '2px' }}>Análisis</div>
          <a className="flex items-center gap-2 px-5 py-2.5 text-sm text-white font-medium" style={{ backgroundColor: 'rgba(212,68,12,0.15)', borderLeft: '2px solid #d4440c' }}><span>💰</span> Rentabilidad</a>
        </nav>

        <div className="p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0" style={{ backgroundColor: '#d4440c' }}>{iniciales}</div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white/80 truncate">{empresa}</div>
              <div className="text-white/30 truncate" style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px' }}>{email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="text-left text-white/40 hover:text-red-400 transition-colors" style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>→ Cerrar sesión</button>
        </div>
      </aside>

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
                  {viajes.map((v, i) => {
                    const ganancia = v.flete_cobrado - costoReal(v);
                    const margen = ((ganancia / v.flete_cobrado) * 100).toFixed(1);
                    const rentable = ganancia >= 0;
                    return (
                      <div key={v.id} className="flex items-center gap-2 md:gap-4 px-4 py-3 md:px-6 md:py-4" style={{ borderBottom: i < viajes.length - 1 ? '1px solid rgba(26,23,20,0.08)' : 'none' }}>
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
