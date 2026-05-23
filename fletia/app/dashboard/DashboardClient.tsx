'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface DashboardClientProps {
  email: string;
  empresa: string;
}

export default function DashboardClient({ email, empresa }: DashboardClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const iniciales = empresa
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'TE';

  return (
    <div className="flex min-h-screen bg-bg">
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />
      )}

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
          <a href="/dashboard" className="flex items-center gap-2.5 px-5 py-2.5 text-white text-sm font-medium bg-accent/15 border-l-2 border-accent cursor-pointer">
            <span className="w-4 text-center">⚡</span> Dashboard
          </a>
          <a href="/viajes" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors">
            <span className="w-4 text-center">🧮</span> Nuevo viaje
          </a>
          <a href="/historial" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors">
            <span className="w-4 text-center">📋</span> Historial
          </a>

          <div className="font-mono text-[8px] tracking-[2px] text-white/25 px-5 my-4 uppercase">Flota</div>
          <a href="/camiones" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors">
            <span className="w-4 text-center">🚛</span> Mis camiones
          </a>

          <div className="font-mono text-[8px] tracking-[2px] text-white/25 px-5 my-4 uppercase">Análisis</div>
          <a href="/rentabilidad" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors">
            <span className="w-4 text-center">💰</span> Rentabilidad
          </a>
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
            <div className="text-sm font-bold">Dashboard</div>
            <div className="hidden md:block font-mono text-[10px] text-ink-3 px-2 py-0.5 bg-surface rounded-full">Sprint 1 · MVP</div>
          </div>
          <a href="/viajes" className="bg-accent text-white px-4 py-2 text-xs font-bold hover:bg-accent/90 transition-colors">⚡ Calcular viaje</a>
        </div>

        <div className="p-4 md:p-7 max-w-6xl">
          <div className="bg-card border border-ink/10 p-6 md:p-8 mb-6 animate-fade-up">
            <div className="font-mono text-[10px] tracking-[3px] text-accent uppercase mb-3">// Bienvenido a FletIA</div>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-3 leading-none">Hola, <span className="text-accent">{empresa}</span> 👋</h1>
            <p className="text-ink-2 text-base mb-6 max-w-2xl">Tu cuenta está lista. Para empezar a calcular el costo exacto de tus viajes, primero necesitamos registrar tus camiones.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl">
              <a href="/camiones/nuevo" className="bg-ink text-white px-5 py-3 text-sm font-bold hover:bg-ink-2 transition-colors text-left">
                <div className="text-[10px] font-mono text-white/40 tracking-wider mb-1">PASO 1</div>
                <div>+ Registrar mi primer camión</div>
              </a>
              <button className="bg-surface border border-ink/20 text-ink px-5 py-3 text-sm font-bold hover:bg-surface-2 transition-colors text-left">
                <div className="text-[10px] font-mono text-ink-3 tracking-wider mb-1">OPCIONAL</div>
                <div>📺 Ver tutorial (3 min)</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Gasto del mes', value: '—', sub: 'Sin viajes registrados' },
              { label: 'Viajes calculados', value: '0', sub: 'Empezá ahora' },
              { label: 'Camiones activos', value: '0', sub: 'Agregá tu flota' },
              { label: 'Ahorro detectado', value: '$0', sub: 'Pronto disponible' },
            ].map((kpi, i) => (
              <div key={i} className="bg-card border border-ink/10 p-4 md:p-5 animate-fade-up" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                <div className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase mb-2">{kpi.label}</div>
                <div className="font-display text-2xl md:text-3xl font-bold leading-none mb-1.5 text-ink">{kpi.value}</div>
                <div className="font-mono text-[9px] text-ink-3">{kpi.sub}</div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-ink/10 p-6 animate-fade-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="font-mono text-[10px] tracking-[3px] text-success uppercase">✓ Sprint 1 completado</div>
            </div>
            <h2 className="font-display text-2xl font-bold mb-3">¿Qué hay funcionando ahora?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['✅', 'Sistema de login y registro'],
                ['✅', 'Dashboard con tu empresa'],
                ['✅', 'Conexión a base de datos'],
                ['✅', 'Diseño responsive'],
                ['⏳', 'Alta de camión (Sprint 2)'],
                ['⏳', 'Calculadora con IA (Sprint 3)'],
                ['⏳', 'Reporte de rentabilidad (Sprint 3)'],
                ['⏳', 'Deploy a internet (Sprint 4)'],
              ].map(([icon, text], i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <span>{icon}</span>
                  <span className="text-ink-2">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
