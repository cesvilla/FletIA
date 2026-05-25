'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Viaje {
  id: string;
  origen?: string;
  destino?: string;
  kilometros: number;
  peso_carga: number;
  litros_totales: number;
  litros_reales?: number;
  costo_total: number;
  costo_por_km: number;
  created_at: string;
  camiones?: { patente: string; marca: string; modelo: string };
}

export default function HistorialClient({ viajes, email, empresa }: { viajes: Viaje[]; email: string; empresa: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const iniciales = empresa.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'TE';

  return (
    <div className="flex min-h-screen bg-bg">
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />}

      <aside className={`fixed top-0 left-0 h-screen w-[220px] bg-ink flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-white/10 flex items-start justify-between">
          <div>
            <div className="font-display text-2xl font-black text-white">Flet<span className="text-accent">IA</span></div>
            <div className="font-mono text-[8px] tracking-[2px] text-white/30 mt-1 uppercase">// combustible inteligente</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/40 hover:text-white text-xl leading-none">×</button>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="font-mono text-[8px] tracking-[2px] text-white/25 px-5 my-4 uppercase">Principal</div>
          <a href="/dashboard" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors"><span className="w-4 text-center">⚡</span> Dashboard</a>
          <a href="/viajes" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors"><span className="w-4 text-center">🧮</span> Calculadora</a>
          <a href="/historial" className="flex items-center gap-2.5 px-5 py-2.5 text-white text-sm font-medium bg-accent/15 border-l-2 border-accent cursor-pointer"><span className="w-4 text-center">📋</span> Historial</a>
          <div className="font-mono text-[8px] tracking-[2px] text-white/25 px-5 my-4 uppercase">Flota</div>
          <a href="/camiones" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors"><span className="w-4 text-center">🚛</span> Mis camiones</a>
          <div className="font-mono text-[8px] tracking-[2px] text-white/25 px-5 my-4 uppercase">Análisis</div>
          <a href="/rentabilidad" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors"><span className="w-4 text-center">💰</span> Rentabilidad</a>
        </nav>
        <div className="p-5 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0">{iniciales}</div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white/80 truncate">{empresa}</div>
              <div className="font-mono text-[8px] text-white/30 truncate">{email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left font-mono text-[10px] text-white/40 hover:text-accent transition-colors">→ Cerrar sesión</button>
        </div>
      </aside>

      <main className="flex-1 md:ml-[220px]">
        <div className="bg-card border-b border-ink/10 px-4 md:px-7 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden flex flex-col gap-1 p-1.5">
              <span className="block w-5 h-0.5 bg-ink"></span>
              <span className="block w-5 h-0.5 bg-ink"></span>
              <span className="block w-5 h-0.5 bg-ink"></span>
            </button>
            <div className="text-sm font-bold">Historial de viajes</div>
          </div>
          <a href="/viajes" className="bg-accent text-white px-4 py-2 text-xs font-bold hover:bg-accent/90 transition-colors">⚡ Nuevo viaje</a>
        </div>

        <div className="p-4 md:p-7 max-w-5xl">
          {viajes.length === 0 ? (
            <div className="bg-card border border-ink/10 p-8 text-center">
              <div className="text-4xl mb-3">📋</div>
              <div className="font-bold mb-1">Sin viajes aún</div>
              <div className="text-ink-2 text-sm mb-4">Calculá tu primer viaje para verlo acá.</div>
              <a href="/viajes" className="bg-accent text-white px-4 py-2 text-xs font-bold hover:bg-accent/90 transition-colors">⚡ Calcular viaje</a>
            </div>
          ) : (
            <div className="bg-white border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="text-sm font-bold">📋 Todos los viajes ({viajes.length})</div>
              </div>
              {viajes.map((v) => (
                <div key={v.id} className="border-b last:border-b-0 border-gray-100">
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">
                        {v.origen && v.destino ? `${v.origen} → ${v.destino}` : `${v.kilometros} km`}
                      </div>
                      <div className="font-mono text-[9px] text-gray-400 mt-1">
                        {v.camiones?.patente} · {v.peso_carga} ton · estimado: {v.litros_totales} lts
                        {v.litros_reales && <span className="text-green-600"> · real: {v.litros_reales} lts ✓</span>}
                      </div>
                      <div className="font-mono text-[9px] text-gray-300 mt-0.5">
                        {new Date(v.created_at).toLocaleDateString('es-AR')}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold">${v.costo_total.toLocaleString('es-AR')}</div>
                      <div className="font-mono text-[9px] text-gray-400">${v.costo_por_km}/km</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
