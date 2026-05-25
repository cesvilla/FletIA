'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Recordatorio { id: string; texto: string; fecha?: string; completado: boolean; }
interface Precio { empresa: string; tipo: string; precio: number; provincia?: string; }

interface Props {
  email: string; empresa: string; userId: string;
  gastoMes: number; totalViajes: number; totalCamiones: number;
  recordatorios: Recordatorio[]; precios: Precio[];
}

export default function DashboardClient({ email, empresa, userId, gastoMes, totalViajes, totalCamiones, recordatorios: initRecs, precios }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recs, setRecs] = useState<Recordatorio[]>(initRecs);
  const [nuevoRec, setNuevoRec] = useState('');
  const [fechaRec, setFechaRec] = useState('');
  const [addingRec, setAddingRec] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function agregarRecordatorio() {
    if (!nuevoRec.trim()) return;
    const { data } = await supabase.from('recordatorios').insert({
      user_id: userId, texto: nuevoRec.trim(), fecha: fechaRec || null, completado: false
    }).select().single();
    if (data) { setRecs([...recs, data]); setNuevoRec(''); setFechaRec(''); setAddingRec(false); }
  }

  async function completarRecordatorio(id: string) {
    await supabase.from('recordatorios').update({ completado: true }).eq('id', id);
    setRecs(recs.filter(r => r.id !== id));
  }

  const iniciales = empresa.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || 'TE';
  const kpis = [
    { label: 'Gasto del mes', value: gastoMes > 0 ? `$${gastoMes.toLocaleString('es-AR')}` : '—', sub: gastoMes > 0 ? 'Este mes' : 'Sin viajes aún' },
    { label: 'Viajes calculados', value: totalViajes.toString(), sub: totalViajes > 0 ? 'Total histórico' : 'Empezá ahora' },
    { label: 'Camiones activos', value: totalCamiones.toString(), sub: totalCamiones > 0 ? 'En tu flota' : 'Agregá tu flota' },
    { label: 'Precio gasoil hoy', value: precios.length > 0 ? `$${precios[0].precio.toLocaleString('es-AR')}` : '—', sub: precios.length > 0 ? `YPF · ${new Date().toLocaleDateString('es-AR')}` : 'Actualizando...' },
  ];

  console.log("PRECIOS:", JSON.stringify(precios));
  const preciosPorEmpresa = precios.reduce((acc: Record<string, Precio[]>, p) => {
    if (!acc[p.empresa]) acc[p.empresa] = [];
    acc[p.empresa].push(p);
    return acc;
  }, {});

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
          <a href="/dashboard" className="flex items-center gap-2.5 px-5 py-2.5 text-white text-sm font-medium bg-accent/15 border-l-2 border-accent cursor-pointer"><span className="w-4 text-center">⚡</span> Dashboard</a>
          <a href="/viajes" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors"><span className="w-4 text-center">🧮</span> Calculadora</a>
          <a href="/historial" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors"><span className="w-4 text-center">📋</span> Historial</a>
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
            <div className="text-sm font-bold">Dashboard</div>
          </div>
          <a href="/viajes" className="bg-accent text-white px-4 py-2 text-xs font-bold hover:bg-accent/90 transition-colors">⚡ Calcular viaje</a>
        </div>

        <div className="p-4 md:p-7 max-w-6xl">
          <div className="bg-card border border-ink/10 p-6 md:p-8 mb-6">
            <div className="font-mono text-[10px] tracking-[3px] text-accent uppercase mb-3">// Bienvenido a FletIA</div>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-3 leading-none text-ink">Hola, <span className="text-accent">{empresa}</span> 👋</h1>
            <p className="text-ink-2 text-base max-w-2xl">Aquí tenés un resumen de tu operación de hoy.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {kpis.map((kpi, i) => (
              <div key={i} className="bg-card border border-ink/10 p-4 md:p-5">
                <div className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase mb-2">{kpi.label}</div>
                <div className="font-display text-2xl md:text-3xl font-bold leading-none mb-1.5 text-ink">{kpi.value}</div>
                <div className="font-mono text-[9px] text-ink-3">{kpi.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-ink/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-[10px] tracking-[3px] text-accent uppercase">⛽ Precios combustible hoy</div>
                <div className="font-mono text-[9px] text-ink-3">{new Date().toLocaleDateString('es-AR')}</div>
              </div>
              {precios.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-2xl mb-2">⛽</div>
                  <div className="text-sm text-ink-2 mb-1">Actualizando precios...</div>
                  <div className="font-mono text-[9px] text-ink-3">Se actualiza automáticamente cada día</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(preciosPorEmpresa).map(([emp, ps]) => (
                    <div key={emp} className="border border-ink/10 p-3">
                      <div className="font-bold text-sm text-ink mb-2">{emp}</div>
                      <div className="grid grid-cols-2 gap-1">
                        {(ps as Precio[]).map((p, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-ink-2">{p.tipo}</span>
                            <span className="font-mono font-bold text-ink">${p.precio.toLocaleString('es-AR')}/L</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-ink/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-[10px] tracking-[3px] text-accent uppercase">📌 Recordatorios</div>
                <button onClick={() => setAddingRec(!addingRec)} className="font-mono text-[9px] text-accent hover:underline">+ Agregar</button>
              </div>

              {addingRec && (
                <div className="mb-4 p-3 border border-accent/30 bg-accent/5">
                  <input
                    type="text"
                    value={nuevoRec}
                    onChange={e => setNuevoRec(e.target.value)}
                    placeholder="Ej: Revisar neumáticos del SED892"
                    className="w-full text-sm px-3 py-2 border border-ink/20 bg-white text-ink mb-2 outline-none"
                    onKeyDown={e => e.key === 'Enter' && agregarRecordatorio()}
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={fechaRec}
                      onChange={e => setFechaRec(e.target.value)}
                      className="text-xs px-2 py-1.5 border border-ink/20 bg-white text-ink outline-none flex-1"
                    />
                    <button onClick={agregarRecordatorio} className="bg-accent text-white px-3 py-1.5 text-xs font-bold hover:bg-accent/90">Guardar</button>
                    <button onClick={() => setAddingRec(false)} className="px-3 py-1.5 text-xs border border-ink/20 text-ink-2 hover:bg-surface">Cancelar</button>
                  </div>
                </div>
              )}

              {recs.length === 0 && !addingRec ? (
                <div className="text-center py-6">
                  <div className="text-2xl mb-2">📌</div>
                  <div className="text-sm text-ink-2 mb-1">Sin recordatorios</div>
                  <div className="font-mono text-[9px] text-ink-3">Agregá fletes pendientes, vencimientos, mantenimientos</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {recs.map(r => (
                    <div key={r.id} className="flex items-start gap-3 p-3 border border-ink/10 hover:bg-surface/50 transition-colors">
                      <button onClick={() => completarRecordatorio(r.id)} className="mt-0.5 w-4 h-4 border-2 border-ink/30 rounded-sm flex-shrink-0 hover:border-accent hover:bg-accent/10 transition-colors" title="Marcar completado" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ink">{r.texto}</div>
                        {r.fecha && <div className="font-mono text-[9px] text-ink-3 mt-0.5">📅 {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
